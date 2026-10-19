// Talent-build win-rate simulation across the first world (Neon Aftermath).
// Not part of the shipped test suite. Plays real battles through the game's
// own engine (startBattle / playCard / endTurn / enemyPlan) with a heuristic
// bot that also USES the active talents (Weaken, Power Boost, Retain).
// Usage: node tests/talent-sim.cjs [fightsPerCell]
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const N = Number(process.argv[2]) || 100;

function node() { const classes = new Set(['hidden']); return { style: { setProperty() {} }, dataset: {}, classList: { add: x => classes.add(x), remove: x => classes.delete(x), contains: x => classes.has(x), toggle(x, v) { v ? classes.add(x) : classes.delete(x) } }, append() {}, prepend() {}, setAttribute() {}, remove() {}, click() {}, focus() {}, querySelector: () => node(), querySelectorAll: () => [], getContext: () => new Proxy({}, { get: () => () => {} }) } }
function makeContext() {
  const nodes = new Map(), storage = new Map();
  const context = vm.createContext({ console, assert: require('node:assert/strict'), Image: class { constructor() { this.complete = false } }, document: { getElementById(id) { if (!nodes.has(id)) nodes.set(id, node()); return nodes.get(id) }, querySelector: () => node(), querySelectorAll: () => [], createElement: () => node(), head: node(), body: node() }, localStorage: { getItem: k => storage.get(k) || null, setItem: (k, v) => storage.set(k, v) }, setTimeout: () => 0, clearTimeout() {}, requestAnimationFrame() {}, addEventListener() {}, innerWidth: 1280, innerHeight: 800, confirm: () => true, Blob, URL, Math });
  const run = s => vm.runInContext(s, context);
  run(fs.readFileSync(path.join(root, 'assets/environment/neon-city.js'), 'utf8'));
  run(fs.readFileSync(path.join(root, 'assets/cards.js'), 'utf8'));
  for (const m of fs.readFileSync(path.join(root, 'index.html'), 'utf8').matchAll(/<script>([\s\S]*?)<\/script>/g)) run(m[1]);
  run(fs.readFileSync(path.join(root, 'assets/elaris-wildlife.js'), 'utf8'));
  run(fs.readFileSync(path.join(root, 'assets/solaris-data.js'), 'utf8'));run(fs.readFileSync(path.join(root, 'assets/expansion.js'), 'utf8'));
  run(fs.readFileSync(path.join(root, 'assets/encounter-depth.js'), 'utf8'));run(fs.readFileSync(path.join(root, 'assets/talent-matrix.js'), 'utf8'));run(fs.readFileSync(path.join(root, 'assets/aether-deck.js'), 'utf8'));run(fs.readFileSync(path.join(root, 'assets/card-variety.js'), 'utf8'));run(fs.readFileSync(path.join(root, 'assets/battle-hud.js'), 'utf8'));run(fs.readFileSync(path.join(root, 'assets/sun-revenant.js'), 'utf8'));run(fs.readFileSync(path.join(root, 'assets/exploration.js'), 'utf8'));run(fs.readFileSync(path.join(root, 'assets/chronospire.js'), 'utf8'));for (const f of ['sky-data', 'wilds-data', 'vespera-data', 'chronospire-data', 'tile-worlds', 'world-cards', 'world-mechanics', 'stagger', 'gear']) run(fs.readFileSync(path.join(root, 'assets/' + f + '.js'), 'utf8'));
  return { context, run };
}

const BOT = fs.readFileSync(path.join(root, 'assets/sim/bot.js'), 'utf8'); // Round 182: shared with the compendium's Difficulty lab

const BUILDS = {
  'No talents': [],
  'Surge (offense)': [['powerCore', 1], ['amplifier', 5], ['edge', 5], ['overcharge', 1]],
  'Disruption (control)': [['weakenCore', 1], ['jammer', 5], ['quickdraw', 2], ['capacitor', 1]],
  'Resolve (defense)': [['retainCore', 1], ['plating', 5], ['vitality', 5], ['recovery', 3]],
  'Hybrid': [['weakenCore', 1], ['retainCore', 1], ['powerCore', 1], ['plating', 2], ['jammer', 2], ['amplifier', 2], ['plating', 5], ['jammer', 5], ['amplifier', 5]]
};
// Decks a player plausibly has at each stage. Victory rewards offer
// cleave/riposte/bastion/mend/spark/shatter; Prismatic Counter comes from the
// expansion. Impermanent cards auto-upgrade every 100 uses, so card level 1
// is assumed only in the later zones.
function deckFor(L) {
  if (L <= 2) return { ids: ['strike', 'strike', 'guard', 'guard', 'focus', 'mend'], level: 0 };
  if (L <= 4) return { ids: ['strike', 'cleave', 'guard', 'bastion', 'focus', 'mend'], level: 0 };
  return { ids: ['strike', 'cleave', 'riposte', 'bastion', 'counter', 'mend'], level: L >= 6 ? 1 : 0 };
}

const { context, run } = makeContext();
run(BOT);
run(`newGame();configureRegion('city');`);
// Group city spawns: normal patrols by enemy level, plus the three bosses.
const targets = JSON.parse(run(`(()=>{const t={};for(const k of Object.keys(rooms)){for(const s of roomSpawns(k)){const key=s.boss?('BOSS:'+s.type):('Lv '+enemyLevel(k));(t[key]=t[key]||[]).push([k,s.uid,enemyLevel(k),s.elite,s.type])}}return JSON.stringify(t)})()`));
const order = Object.keys(targets).filter(k => k.startsWith('Lv')).sort((a, b) => parseInt(a.slice(3)) - parseInt(b.slice(3)))
  .concat(['BOSS:moonKnight', 'BOSS:crownSentinel', 'BOSS:thornWarden'].filter(k => targets[k]));
const BOSS_NAMES = { 'BOSS:moonKnight': 'Lunar Enforcer (mini)', 'BOSS:crownSentinel': 'Crown Sentinel (mini)', 'BOSS:thornWarden': 'Thorn Warden (boss)' };

const results = {};
let seedBase = 1;
for (const area of order) {
  results[area] = {};
  const pool = targets[area];
  for (const [build, plan] of Object.entries(BUILDS)) {
    let best = null;
    for (const policy of ['careful', 'race']) {
    run(`globalThis.POLICY='${policy}'`);
    let wins = 0, hpLeft = 0, turns = 0, talents = '';
    for (let i = 0; i < N; i++) {
      const [room, uid, enemyLv] = pool[i % pool.length];
      const L = Math.max(1, enemyLv); // player at the enemy's level: the game's own "green / ready" signal
      const deck = deckFor(L);
      run(`Math.random=(()=>{let s=${(seedBase + i) * 7919};return()=>{s=(s*16807)%2147483647;return (s-1)/2147483646}})();
        newGame();configureRegion('city');state.playerLevel=${L};
        globalThis.__t=allocate(${JSON.stringify(plan)});syncTalentVitals(false);state.hp=state.maxHp;
        state.pool=${JSON.stringify(deck.ids)}.slice(0,maxDeckSize()).map(id=>{const c=make(id);c.level=${deck.level};return c});
        state.deck=state.pool.map(c=>c.uid);state.cooldowns={};state.bosses=[];state.cleared=[];
        state.room='${room}';state.pos={x:400,y:300};startBattle('${uid}');
        globalThis.__r=state.battle?playOutBattle():{won:false,hp:0,turns:0,aborted:true};`);
      const r = context.__r; talents = context.__t;
      if (r.aborted) throw new Error('battle did not start in ' + room + ' ' + uid);
      if (r.won) { wins++; hpLeft += r.hp / r.maxHp; }
      turns += r.turns;
    }
    const res = { win: Math.round(wins / N * 100), hp: wins ? Math.round(hpLeft / wins * 100) : 0, turns: +(turns / N).toFixed(1), talents, policy };
    if (!best || res.win > best.win || (res.win === best.win && res.hp > best.hp)) best = res;
    }
    results[area][build] = best;
    seedBase += N;
  }
}

const builds = Object.keys(BUILDS);
const label = a => BOSS_NAMES[a] || ('Zone enemies ' + a);
console.log(`\nNeon Aftermath — win % by talent build (player level = enemy level, ${N} fights per cell, full HP each fight)\n`);
console.log('Area'.padEnd(26) + builds.map(b => b.split(' ')[0].padStart(11)).join(''));
for (const a of order) console.log(label(a).padEnd(26) + builds.map(b => (results[a][b].win + '%').padStart(11)).join(''));
console.log('\nAverage HP left after a win:');
for (const a of order) console.log(label(a).padEnd(26) + builds.map(b => (results[a][b].hp + '%').padStart(11)).join(''));
fs.writeFileSync(path.join(__dirname, 'talent-sim-results.json'), JSON.stringify({ N, order, builds, results, targets: Object.fromEntries(order.map(a => [a, targets[a].length])) }, null, 1));

// --- Sweep: how far above the enemy's level does a player need to be? ---
if (process.argv.includes('sweep')) {
  const M = Math.max(30, Math.round(N / 2));
  const areas = ['Lv 5', 'Lv 6', 'Lv 7', 'Lv 8', 'BOSS:moonKnight', 'BOSS:crownSentinel', 'BOSS:thornWarden'].filter(a => targets[a]);
  const sweep = {};
  console.log(`\nLevel needed for a 50%+ win rate (best of all builds and both play styles, ${M} fights per test)`);
  console.log('Area'.padEnd(26) + 'Lv1 cards'.padStart(14) + 'Lv2 cards'.padStart(14));
  for (const area of areas) {
    sweep[area] = {};
    const row = [];
    for (const cardLevel of [1, 2]) {
      let found = null;
      for (let L = 5; L <= 30 && !found; L += (L < 14 ? 1 : 2)) {
        let bestWin = 0, bestBuild = '';
        for (const [build, plan] of Object.entries(BUILDS)) {
          for (const policy of ['careful', 'race']) {
            run(`globalThis.POLICY='${policy}'`);
            let wins = 0;
            for (let i = 0; i < M; i++) {
              const [room, uid] = targets[area][i % targets[area].length];
              run(`Math.random=(()=>{let s=${(i + 1) * 104729};return()=>{s=(s*16807)%2147483647;return (s-1)/2147483646}})();
                newGame();configureRegion('city');state.playerLevel=${L};allocate(${JSON.stringify(plan)});syncTalentVitals(false);state.hp=state.maxHp;
                state.pool=['strike','cleave','riposte','bastion','counter','mend'].slice(0,maxDeckSize()).map(id=>{const c=make(id);c.level=${cardLevel};return c});
                state.deck=state.pool.map(c=>c.uid);state.cooldowns={};state.bosses=[];state.room='${room}';state.pos={x:400,y:300};startBattle('${uid}');
                globalThis.__r=playOutBattle();`);
              if (context.__r.won) wins++;
            }
            const w = Math.round(wins / M * 100);
            if (w > bestWin) { bestWin = w; bestBuild = build.split(' ')[0]; }
          }
        }
        if (bestWin >= 50) found = { L, win: bestWin, build: bestBuild };
      }
      sweep[area][cardLevel] = found;
      row.push(found ? `Lv ${found.L} (${found.build})` : 'not by 30');
    }
    console.log(label(area).padEnd(26) + row.map(r => r.padStart(14)).join(''));
  }
  const out = JSON.parse(fs.readFileSync(path.join(__dirname, 'talent-sim-results.json'), 'utf8'));
  out.sweep = sweep; fs.writeFileSync(path.join(__dirname, 'talent-sim-results.json'), JSON.stringify(out, null, 1));
}

// --- Card-level effect at a matched player level ---
if (process.argv.includes('cards')) {
  const M = N;
  console.log(`\nWin % at player level = enemy level, by card level (best build & play style, ${M} fights each)`);
  console.log('Area'.padEnd(26) + 'EnemyLv'.padStart(8) + ['Lv0 cards', 'Lv1 cards', 'Lv2 cards', 'Lv3 cards'].map(s => s.padStart(12)).join(''));
  const cardTable = {};
  for (const area of order) {
    const lv = targets[area][0][2]; cardTable[area] = { enemyLevel: lv };
    const cells = [];
    for (const cardLevel of [0, 1, 2, 3]) {
      let bestWin = 0, bestBuild = '';
      for (const [build, plan] of Object.entries(BUILDS)) for (const policy of ['careful', 'race']) {
        run(`globalThis.POLICY='${policy}'`);
        let wins = 0;
        for (let i = 0; i < M; i++) {
          const [room, uid, enemyLv] = targets[area][i % targets[area].length];
          run(`Math.random=(()=>{let s=${(i + 1) * 15485863};return()=>{s=(s*16807)%2147483647;return (s-1)/2147483646}})();
            newGame();configureRegion('city');state.playerLevel=${'${enemyLv}'};allocate(${JSON.stringify(plan)});syncTalentVitals(false);state.hp=state.maxHp;
            state.pool=['strike','cleave','riposte','bastion','counter','mend'].slice(0,maxDeckSize()).map(id=>{const c=make(id);c.level=${cardLevel};return c});
            state.deck=state.pool.map(c=>c.uid);state.cooldowns={};state.bosses=[];state.room='${room}';state.pos={x:400,y:300};startBattle('${uid}');
            globalThis.__r=playOutBattle();`.replace('${enemyLv}', enemyLv));
          if (context.__r.won) wins++;
        }
        const w = Math.round(wins / M * 100); if (w > bestWin) { bestWin = w; bestBuild = build.split(' ')[0]; }
      }
      cardTable[area][cardLevel] = { win: bestWin, build: bestBuild };
      cells.push(`${bestWin}%`.padStart(5) + ` ${bestBuild.slice(0, 6)}`.padEnd(7));
    }
    console.log(label(area).padEnd(26) + String(lv).padStart(8) + cells.map(c => c.padStart(12)).join(''));
  }
  const out = JSON.parse(fs.readFileSync(path.join(__dirname, 'talent-sim-results.json'), 'utf8'));
  out.cardTable = cardTable; fs.writeFileSync(path.join(__dirname, 'talent-sim-results.json'), JSON.stringify(out, null, 1));
}
