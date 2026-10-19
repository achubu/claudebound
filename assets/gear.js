'use strict';
// =====================================================================
// Round 176: GEAR. Every world has exactly two gear pieces, one guarded by each
// of its mini-bosses. Wearing both opens the doors into the world's final boss
// room. Each piece is worn in one of five slots and gives a small boost; open
// the Gear screen (beside the Aetherlink) to equip and unequip them.
//   Slots: boots, shirt, pants, belt, gloves.
//   Boosts: attack (attack-card damage), armor (less damage from every hit),
//   health (max HP), pierce (ignore enemy Armor), elemental (elemental-card
//   damage) and cleanse (one free Purifying Light per fight).
// Gear ids live in state.relics like the old relics, so the city's Ember Sigil
// (now the Ember Gloves) and Briarstep Boots carry over in old saves.
// Icons: assets/items/gear/<id>.png (placeholders from tools/paint_gear_icons.py).
// =====================================================================
const GEAR_SLOTS = ['boots', 'shirt', 'pants', 'belt', 'gloves'];
const GEAR_SLOT_NAMES = { boots: 'Boots', shirt: 'Shirt', pants: 'Pants', belt: 'Belt', gloves: 'Gloves' };
const GEAR_SLOT_ICONS = { boots: '🥾', shirt: '👕', pants: '👖', belt: '🎗', gloves: '🧤' };
const GEAR_STATS = {
  attack: n => '+' + n + ' attack-card damage',
  armor: n => '+' + n + ' Armor (every enemy hit deals ' + n + ' less)',
  health: n => '+' + n + ' max HP',
  pierce: n => 'Pierce ' + n + ': ignore ' + n + ' enemy Armor',
  elemental: n => '+' + n + ' elemental-card damage',
  cleanse: n => n + ' free cleanse per fight (Purifying Light)'
};
// Listed per world in mini-boss order: the first piece is in the first mini-boss's room.
const GEAR = {
  ember:           { name: 'Ember Gloves', slot: 'gloves', world: 'city', stat: 'attack', value: 1 },
  boots:           { name: 'Briarstep Boots', slot: 'boots', world: 'city', stat: 'armor', value: 1 },
  sunwovenShirt:   { name: 'Sunwoven Shirt', slot: 'shirt', world: 'elaris', stat: 'health', value: 5 },
  scarabBelt:      { name: 'Scarab Belt', slot: 'belt', world: 'elaris', stat: 'pierce', value: 1 },
  galeweavePants:  { name: 'Galeweave Pants', slot: 'pants', world: 'sky', stat: 'elemental', value: 1 },
  cloudstepBoots:  { name: 'Cloudstep Boots', slot: 'boots', world: 'sky', stat: 'cleanse', value: 1 },
  thornhideGloves: { name: 'Thornhide Gloves', slot: 'gloves', world: 'wilds', stat: 'attack', value: 2 },
  mossweavePants:  { name: 'Mossweave Pants', slot: 'pants', world: 'wilds', stat: 'armor', value: 2 },
  stormglassBelt:  { name: 'Stormglass Belt', slot: 'belt', world: 'vespera', stat: 'pierce', value: 2 },
  tempestGloves:   { name: 'Tempest Gloves', slot: 'gloves', world: 'vespera', stat: 'elemental', value: 2 },
  timewornShirt:   { name: 'Timeworn Shirt', slot: 'shirt', world: 'chronospire', stat: 'health', value: 12 },
  hourglassBelt:   { name: 'Hourglass Belt', slot: 'belt', world: 'chronospire', stat: 'cleanse', value: 1 }
};
const gearOf = world => Object.keys(GEAR).filter(id => GEAR[id].world === world);
const gearArtPath = id => 'assets/items/gear/' + id + '.png';
function gearText(id) { const g = GEAR[id]; return GEAR_STATS[g.stat](g.value); }

// --- Owning and wearing ---
function ensureGear(s = state) {
  if (!s) return;
  const g = s.gear && typeof s.gear === 'object' && !Array.isArray(s.gear) ? s.gear : {};
  const owned = new Set((s.relics || []).filter(id => GEAR[id]));
  s.gear = Object.fromEntries(GEAR_SLOTS.map(slot => [slot, owned.has(g[slot]) && GEAR[g[slot]].slot === slot ? g[slot] : null]));
}
function ownsGear(id) { return !!state && state.relics.includes(id) && !!GEAR[id]; }
function wornGear() { if (!state) return []; ensureGear(); return GEAR_SLOTS.map(s => state.gear[s]).filter(Boolean); }
function gearStat(stat) { return wornGear().reduce((n, id) => n + (GEAR[id].stat === stat ? GEAR[id].value : 0), 0); }
function equipGear(slot, id) {
  if (state.battle && state.battle.phase === 'fight') return toast('Change gear between encounters.');
  ensureGear();
  if (id && (!ownsGear(id) || GEAR[id].slot !== slot)) return;
  state.gear[slot] = id || null;
  syncTalentVitals(false); save();
}

// --- The boss doors: a world's final boss room opens with both of its pieces ---
function gateOpen(world) {
  const boss = WORLD_BOSS_ROOMS[world];
  return gearOf(world).every(ownsGear) || !!(boss && state.bosses.includes(boss[1]));
}
const hasRelicBeforeGear = hasRelic;
hasRelic = function (id) { return typeof id === 'string' && id.startsWith('gate:') ? gateOpen(id.slice(5)) : hasRelicBeforeGear(id); };
const relicNameBeforeGear = relicName;
relicName = function (id) {
  if (typeof id === 'string' && id.startsWith('gate:')) return 'both ' + (WORLD_NAMES[id.slice(5)] || '') + ' gear pieces (' + gearOf(id.slice(5)).map(g => GEAR[g].name).join(' + ') + ')';
  return relicNameBeforeGear(id);
};
function gateMessage(world) {
  const missing = gearOf(world).filter(g => !ownsGear(g)).map(g => GEAR[g].name);
  return 'A sealed door. It opens for whoever holds the ' + gearOf(world).map(g => GEAR[g].name).join(' and the ') + '. Still missing: ' + missing.join(', ') + '.';
}
const transitionBeforeGear = transition;
transition = function (dir) {
  const info = exitInfo(dir);
  if (info && typeof info.requires === 'string' && info.requires.startsWith('gate:') && doorLocked(info)) { toast(gateMessage(info.requires.slice(5))); return false; }
  return transitionBeforeGear(dir);
};

// Each world's rooms: the old relic gates go, gear sits with the mini-bosses, the boss doors lock.
function gearRooms(world) {
  const minis = [], bossRooms = [];
  for (const [k, r] of Object.entries(rooms)) {
    for (const [dir, raw] of Object.entries(r.exits)) if (typeof raw === 'object' && raw.requires) r.exits[dir] = raw.to;
    if (r.relic) delete r.relic; // the Moon Lens, the old relic spots and the hidden crystal (now a chest)
    const e = r.enemy && enemies[r.enemy[0]];
    if (e && e.boss) (e.miniBoss ? minis : bossRooms).push(k);
  }
  const order = { city: ['moonKnight', 'crownSentinel'], elaris: ['tidewardenElaris', 'galeSovereign'], vespera: ['arcSentinel', 'resonantPhantom'], chronospire: ['clockwarden', 'paradoxTwin'] }[world];
  const miniOf = k => rooms[k].enemy[0];
  if (order) minis.sort((a, b) => order.indexOf(miniOf(a)) - order.indexOf(miniOf(b)));
  else if (TILE_REGIONS[world]) { const d = TILE_WORLD_DATA[world].roles; minis.sort((a, b) => (a === d.mini1 ? -1 : b === d.mini1 ? 1 : 0)); }
  gearOf(world).forEach((id, i) => { const k = minis[i]; if (k) rooms[k].relic = [id, GEAR[id].name, GEAR_SLOT_ICONS[GEAR[id].slot], 330, 180]; });
  for (const boss of bossRooms) for (const r of Object.values(rooms)) for (const [dir, raw] of Object.entries(r.exits)) if (raw === boss) r.exits[dir] = { to: boss, requires: 'gate:' + world };
  return { minis, bossRooms };
}
const configureRegionBeforeGear = configureRegion;
configureRegion = function (region) {
  const out = configureRegionBeforeGear.apply(this, arguments);
  gearRooms(region);
  if (typeof placeOrganicRelics === 'function') placeOrganicRelics();
  return out;
};
// The chests that stood in mini-boss rooms moved to nearby rooms (chestFor in expansion.js).
const collectRelicBeforeGear = collectRelic;
collectRelic = function (q) {
  if (!GEAR[q[0]]) return collectRelicBeforeGear(q);
  const id = q[0], g = GEAR[id]; state.relics.push(id); ensureGear();
  const wear = !state.gear[g.slot]; if (wear) state.gear[g.slot] = id;
  syncTalentVitals(false);
  const world = g.world, done = gearOf(world).every(ownsGear);
  toast(g.name + ' found: ' + gearText(id) + '. ' + (wear ? 'You put it on.' : 'Open Gear to wear it.') + (done ? ' Both pieces found: the boss door is open.' : ''));
  save(); renderWorld();
};

// --- Boosts ---
if (typeof talentMatrix === 'object') {
  const flatDamageBeforeGear = talentMatrix.flatDamage, armorIgnoreBeforeGear = talentMatrix.armorIgnore;
  talentMatrix.flatDamage = function (c, d, b) {
    const base = flatDamageBeforeGear.call(this, c, d, b);
    if (!d.damage) return base;
    return base + gearStat('attack') + (ELEMENTAL_KINDS.includes(d.element) ? gearStat('elemental') : 0);
  };
  talentMatrix.armorIgnore = function (b) { return armorIgnoreBeforeGear.call(this, b) + gearStat('pierce'); };
}
const scaledRankBeforeGear = scaledRank;
scaledRank = function (id) { return scaledRankBeforeGear(id) + (id === 'plating' ? gearStat('armor') : 0); };
const syncTalentVitalsBeforeGear = syncTalentVitals;
syncTalentVitals = function (heal = false) {
  const bonus = state ? gearStat('health') : 0, had = state ? state.gearHp || 0 : 0;
  syncTalentVitalsBeforeGear(heal);
  if (!state) return;
  state.maxHp += bonus; state.gearHp = bonus;
  state.hp = Math.min(state.maxHp, state.hp + Math.max(0, bonus - had));
};

// One free Purifying Light per fight for each cleanse point worn.
function gearCleansesLeft(b) { return Math.max(0, gearStat('cleanse') - (b.gearCleanses || 0)); }
function useGearCleanse() {
  const b = state && state.battle; if (!b || b.phase !== 'fight' || !gearCleansesLeft(b)) return;
  b.gearCleanses = (b.gearCleanses || 0) + 1;
  sideEffect(b, 'purify');
  b.logs.push('✚ Gear cleanse: your debuffs are washed away.');
  save(); renderBattle();
}
const renderBattleBeforeGear = renderBattle;
renderBattle = function () {
  renderBattleBeforeGear.apply(this, arguments);
  const b = state && state.battle; if (!b || b.phase !== 'fight' || !gearStat('cleanse') || typeof document === 'undefined') return;
  const m = $('battleModal'); if (!m || !m.querySelector) return;
  const left = gearCleansesLeft(b), btn = document.createElement('button');
  btn.id = 'gearCleanse'; btn.className = 'ability gear-cleanse'; btn.disabled = !left;
  btn.textContent = '✚ Gear cleanse · ' + left + ' left';
  btn.title = 'Free Purifying Light from your gear: cleanse all your debuffs and purge every Static.';
  btn.onclick = useGearCleanse;
  const anchor = m.querySelector('.hand-title'); if (anchor && anchor.before) anchor.before(btn); else if (m.append) m.append(btn);
};

// --- Map markers: gear shows its icon ---
const renderWorldBeforeGear = renderWorld;
renderWorld = function () {
  renderWorldBeforeGear.apply(this, arguments);
  const q = state && room() && room().relic; if (!q || !GEAR[q[0]] || typeof document === 'undefined' || !document.querySelector) return;
  const node = document.querySelector('#world .relic'); if (!node) return;
  if (node.classList) node.classList.add('gear-relic');
  node.innerHTML = '<img src="' + gearArtPath(q[0]) + '" alt="' + GEAR[q[0]].name + '">';
  node.title = GEAR[q[0]].name + ' · ' + gearText(q[0]);
};

// --- Objective: until both pieces are found, the objective names their guardians ---
const objectiveBeforeGear = objective;
objective = function () {
  const world = activeRegion, boss = WORLD_BOSS_ROOMS[world];
  if (!state || !boss || state.bosses.includes(boss[1]) || gateOpen(world)) return objectiveBeforeGear();
  const left = gearOf(world).filter(g => !ownsGear(g));
  const guard = left.map(g => { const k = Object.keys(rooms).find(k => rooms[k].relic && rooms[k].relic[0] === g); return GEAR[g].name + ' (' + (k ? enemies[rooms[k].enemy[0]].name + ', ' + rooms[k].name : '?') + ')'; });
  return (world === 'city' && state.room === regionStartRoom() ? 'Head east into the city. ' : '') + 'Find this world\'s gear: ' + guard.join(' and ') + '. Holding both opens ' + rooms[boss[0]].name + '.';
};

// --- Saves ---
const restoreGameBeforeGear = restoreGame;
restoreGame = function (s) {
  ensureGear(s);
  // The hidden Upgrade Crystal became the chest at 4,4: if you already took it, that chest is open.
  if (Array.isArray(s.cleared) && s.cleared.includes('material') && Array.isArray(s.chests) && !s.chests.includes('city:4,4')) s.chests.push('city:4,4');
  return restoreGameBeforeGear(s);
};
const newGameBeforeGear = newGame;
newGame = function () { const out = newGameBeforeGear.apply(this, arguments); ensureGear(); save(); return out; };
const validateImportBeforeGear = validateImport;
validateImport = function (s) {
  if (s && s.gear !== undefined && (typeof s.gear !== 'object' || s.gear === null || Array.isArray(s.gear))) throw Error('Invalid gear.');
  const out = validateImportBeforeGear(s);
  ensureGear(out);
  return out;
};

// --- The Gear screen ---
function showGear() {
  if (!state) return;
  ensureGear();
  const slots = GEAR_SLOTS.map(slot => {
    const id = state.gear[slot], options = Object.keys(GEAR).filter(g => GEAR[g].slot === slot && ownsGear(g));
    return '<section class="panel gear-slot"><h3>' + GEAR_SLOT_ICONS[slot] + ' ' + GEAR_SLOT_NAMES[slot] + '</h3>'
      + (id ? '<img class="gear-art" src="' + gearArtPath(id) + '" alt=""><b>' + GEAR[id].name + '</b><p>' + gearText(id) + '</p>' : '<div class="gear-empty">' + GEAR_SLOT_ICONS[slot] + '</div><p>Nothing worn</p>')
      + '<label>Wear<select aria-label="Gear for ' + GEAR_SLOT_NAMES[slot] + '" data-gear-slot="' + slot + '"><option value="">Nothing</option>'
      + options.map(g => '<option value="' + g + '"' + (g === id ? ' selected' : '') + '>' + GEAR[g].name + '</option>').join('') + '</select></label></section>';
  }).join('');
  // Round 199: only gear you have found is listed.
  const collection = Object.keys(GEAR).filter(ownsGear).map(g => {
    const worn = wornGear().includes(g);
    return '<article class="gear-item"><img class="gear-art" src="' + gearArtPath(g) + '" alt="">'
      + '<div><b>' + GEAR[g].name + '</b><p>' + gearText(g) + '</p>'
      + '<small>' + WORLD_NAMES[GEAR[g].world] + ' · ' + GEAR_SLOT_NAMES[GEAR[g].slot] + (worn ? ' · Worn' : ' · In your pack') + '</small></div></article>';
  }).join('') || '<p class="muted">No gear found yet. Each mini-boss guards a piece.</p>';
  const totals = Object.keys(GEAR_STATS).map(s => gearStat(s) ? GEAR_STATS[s](gearStat(s)) : '').filter(Boolean).join(' · ') || 'No boosts yet';
  openMenu('<div class="eyebrow">EQUIPMENT · GEAR</div><h1>Gear</h1><p>Each world has two gear pieces, one with each mini-boss. Holding both opens that world\'s final boss room. Wear one piece per slot.</p><p class="notice">Worn: ' + totals + '</p><div class="gear-slots">' + slots + '</div><h2>Gear collection</h2><div class="gear-collection">' + collection + '</div><p><button id="gearClose" class="primary">Close</button></p>');
  document.querySelectorAll('[data-gear-slot]').forEach(s => s.onchange = () => { equipGear(s.dataset.gearSlot, s.value); showGear(); });
  const close = $('gearClose'); if (close) close.onclick = closeMenu;
}
if (typeof document !== 'undefined' && document.createElement) {
  const nav = $('nav'), btn = document.createElement('button'); btn.id = 'gearBtn'; btn.textContent = 'Gear'; btn.onclick = showGear;
  const device = nav && nav.querySelectorAll ? [...nav.querySelectorAll('button')].find(x => x.textContent === 'Aetherlink') : null;
  if (device && device.before) device.before(btn); else if (nav && nav.append) nav.append(btn);
  const style = document.createElement('style');
  style.textContent = '.gear-slots{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}.gear-slot{text-align:center}.gear-slot select{width:100%;margin-top:4px}'
    + '.gear-art{width:72px;height:72px;object-fit:contain;display:block;margin:4px auto;image-rendering:auto}.gear-empty{width:72px;height:72px;margin:4px auto;display:grid;place-items:center;border:1px dashed #5b8fa0;border-radius:12px;font-size:28px;opacity:.6}'
    + '.gear-collection{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:8px}.gear-item{display:flex;gap:10px;align-items:center;padding:8px;border:1px solid #2e5566;border-radius:10px;background:#0b1a26}.gear-item .gear-art,.gear-item .gear-empty{width:48px;height:48px;margin:0;flex:0 0 auto}.gear-item p{margin:2px 0}'
    + '#world .relic.gear-relic{width:36px!important;height:36px!important;padding:0;background:#0b1a26cc;display:grid;place-items:center}#world .relic.gear-relic img{width:30px;height:30px;object-fit:contain}'
    + '.gear-cleanse{margin:6px 0;border-color:#9fe0a0!important;color:#dcffcf!important}';
  document.head.append(style);
}
ensureGear();
