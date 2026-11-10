'use strict';
// Round 345 (owner): Neon Aftermath's breaker puzzle, themed for every other world: three switches near, mid-way and
// far from the start open a vault in the start room (Shards, an Upgrade Crystal, a world card).
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`(() => { const out = {}; newGame();
  for (const w of Object.keys(WORLD_RELAYS)) {
    configureRegion(w); const d = WORLD_RELAYS[w], start = Object.keys(rooms).find(isStartRoom), list = worldRelayRooms(), o = { rooms: list.length };
    o.frac = list.map(k => regionDistanceFrac(k)); o.noStart = !list.includes(start); o.noPoi = list.every(k => !poiAt(k));
    const reach = (k, it) => { for (let r = 0; r <= 36; r += 4) for (let a = 0; a < 16; a++) if (walkable(k, it.x + r * Math.cos(a * Math.PI / 8), it.y + r * Math.sin(a * Math.PI / 8), 0)) return true; return false; };
    const vroom = quietItemRooms(1)[0]; o.startEmpty = worldRelayItems(start).length === 0; o.vroomAlone = !poiAt(vroom) && !list.includes(vroom) && vroom !== start;
    o.walk = list.concat([vroom]).every(k => worldRelayItems(k).every(it => reach(k, it)));
    const vault = worldRelayItems(vroom).find(i => i.type === d.vault.type); o.vault = !!vault;
    state.room = vroom; openPOI(vault); o.locked = /0\\/3/.test(document.getElementById('menuModal').innerHTML); closeMenu();
    if (w === 'chronospire') { // Round 379: breakers 2 and 3 are dead until the boss before each is beaten
      const it = worldRelayItems(list[1]).find(i => i.type === d.sw.type); state.room = list[1]; openPOI(it); o.gated = /Mainspring Colossus carries it/.test(document.getElementById('menuModal').innerHTML); closeMenu();
      state.bosses.push('mainspringColossus', 'hollowHour');
    }
    for (const k of list) { const it = worldRelayItems(k).find(i => i.type === d.sw.type); state.room = k; openPOI(it); const b = $('relayAct'); if (b && b.onclick) b.onclick(); o.used = poiUsed(it); }
    o.on = worldRelayState(w).on.length;
    const sh = state.shards, mat = materials(), pool = state.pool.length; state.room = vroom; openPOI(vault);
    const take = $('relayLoot'); if (take && take.onclick) take.onclick();
    o.paid = state.shards - sh === d.shards && materials() === mat + 1 && state.pool.length === pool + 1 && worldRelayState(w).vault && poiUsed(vault);
    out[w] = o;
  }
  configureRegion('city'); out.cityAlone = !WORLD_RELAYS.city && worldRelayItems('0,5').length === 0;
  return JSON.stringify(out); })()`));
for (const [w, o] of Object.entries(r)) {
  if (w === 'cityAlone') continue;
  assert.strictEqual(o.rooms, 3, w + ': three switches');
  if (w === 'chronospire') assert(o.gated, 'Round 379: the second breaker is dead until the Mainspring Colossus is beaten');
  if (w !== 'chronospire') assert(o.frac[0] < .4 && o.frac[2] >= .7, w + ': one near the start and one far (' + o.frac.map(f => f.toFixed(2)) + ')');
  assert(o.noStart && o.noPoi, w + ': switch rooms hold nothing else');
  assert(o.walk, w + ': every switch and the vault stand within reach of walkable ground (items sit just off the path)');
  assert(o.vault && o.locked, w + ': the vault is locked at first');
  assert(o.startEmpty && o.vroomAlone, w + ': Round 350: the vault stands alone in its own room, not in the start room');
  assert(o.used && o.on === 3, w + ': all three switches set and shown as used');
  assert(o.paid, w + ': the vault pays its Shards, an Upgrade Crystal and a card once');
}
assert(r.cityAlone, 'Neon Aftermath keeps its own Blackout (city-nights.js)');
// Round 346: the owner's paintings for the switches and vaults (Solaris's two still to come), and two Chronospire creatures.
const fs = require('fs');
const art = JSON.parse(run(`(() => { const o = {}; for (const w of Object.keys(WORLD_RELAYS)) { configureRegion(w); const d = WORLD_RELAYS[w]; o[w] = [poiArt({ type: d.sw.type }), poiArt({ type: d.vault.type })]; } configureRegion('city');
  o.stag = monsterArt('chronoStag'); o.heron = monsterArt('chronoHeron'); return JSON.stringify(o); })()`));
for (const w of ['elaris', 'sky', 'wilds', 'vespera', 'chronospire']) for (const a of art[w]) {
  assert(a && a.startsWith(w + '-'), w + ': switch and vault use their paintings (' + art[w] + ')');
  assert.strictEqual(fs.readFileSync('assets/items/poi/' + a + '.webp').toString('ascii', 0, 4), 'RIFF', a);
}
assert(art.stag.includes('chronospire/pendulum-stag.png') && art.heron.includes('chronospire/hourglass-heron.png'), 'Chronospire\'s Pendulum Stag and Hourglass Heron have their own sheets');
console.log('world-relays ok');
