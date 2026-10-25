'use strict';
// =====================================================================
// Round 175: worlds 3 and 4, built from room tiles like Solaris.
//   sky   — the SKY ISLES: marble walkways on floating islands (levels 19-27)
//   wilds — ELARIS: the old forest, home of its original creatures (levels 28-36)
// Vespera and Chronospire follow them as worlds 5 and 6.
// Room data, tile plans and walk masks come from tools/build_tile_world.py
// (assets/sky-data.js, assets/wilds-data.js). Both now use the owner's paintings: the Sky City
// (Round 204) and the forest of Elaris with its three boardwalk lakes (Round 225).
// =====================================================================
const TILE_WORLD_IDS = ['sky', 'wilds'];
WORLD_ORDER.splice(WORLD_ORDER.indexOf('vespera'), 0, ...TILE_WORLD_IDS);
// Round 179: Vespera and Chronospire are rebuilt from tiles too (assets/vespera-data.js,
// assets/chronospire-data.js): Vespera on Neon Aftermath's layout as it is, Chronospire on it
// turned on its side (a tall 6x9 spire). Their rosters, levels and gear stay.
const REBUILT_WORLD_IDS = ['vespera', 'chronospire'];
const ALL_TILE_WORLD_IDS = [...TILE_WORLD_IDS, ...REBUILT_WORLD_IDS];
Object.assign(WORLD_NAMES, { sky: 'Sky Isles', wilds: 'Elaris' });

// --- Enemies ----------------------------------------------------------
// Round 196: the Sky Isles creatures have the owner's own sheets (assets/monsters/sky/), drawn
// untinted through art-only keys.
Object.assign(WILDLIFE_ART, {
  skyDrakeArt:  { name: 'Sunfeather Drake', sheet: 'sky/sunfeather-drake', cycle: '.8s' },
  skyWispArt:   { name: 'Rain Drone', sheet: 'sky/rain-drone', cycle: '1.2s' }, // Round 222: replaces the Cloud Wisp
  skyHarpyArt:  { name: 'Gale Harpy', sheet: 'sky/gale-harpy', cycle: '.8s' },
  skyRamArt:    { name: 'Thunderhorn Ram', sheet: 'sky/thunderhorn-ram', cycle: '1.1s' },
  stormbellArt: { name: 'The Stormbell Warden', sheet: 'sky/stormbell-warden', cycle: '1.4s' },
  matriarchArt: { name: 'The Featherfall Matriarch', sheet: 'sky/featherfall-matriarch', cycle: '1.4s' },
  zenithRocArt: { name: 'The Zenith Roc', sheet: 'sky/zenith-roc', cycle: '1.2s', big: true }
});
const SKY_ENEMIES = {
  skyDrake:   { name: 'Sunfeather Drake', icon: '☀', hp: 44, attack: 9, element: 'fire', art: 'skyDrakeArt', tint: 'none' },
  skyWisp:    { name: 'Rain Drone', icon: '☔', hp: 48, attack: 9, armor: 1, element: 'water', art: 'skyWispArt', tint: 'none' },
  skyHarpy:   { name: 'Gale Harpy', icon: '≋', hp: 52, attack: 10, element: 'air', art: 'skyHarpyArt', tint: 'none' },
  skyRam:     { name: 'Thunderhorn Ram', icon: '◆', hp: 56, attack: 10, armor: 2, element: 'earth', art: 'skyRamArt', tint: 'none' },
  stormbellWarden: { name: 'The Stormbell Warden', icon: '🔔', hp: 82, attack: 11, armor: 4, boss: true, miniBoss: true, element: 'air', art: 'stormbellArt', tint: 'none' },
  featherMatriarch: { name: 'The Featherfall Matriarch', icon: '🪶', hp: 78, attack: 12, armor: 3, boss: true, miniBoss: true, element: 'water', art: 'matriarchArt', tint: 'none' },
  zenithRoc:  { name: 'The Zenith Roc', icon: '🦅', hp: 150, attack: 11, armor: 2, boss: true, element: 'air', shift: ['air', 'fire'], shiftEvery: 4, art: 'zenithRocArt', tint: 'none' }
};
// Elaris gets back the forest creatures Solaris used to borrow, under their own names.
const WILDS_ENEMIES = {
  elarisFox:    { name: 'Cinder Fox', icon: '♨', hp: 38, attack: 7, element: 'fire', art: 'forestFox', tint: 'none' },
  elarisHeron:  { name: 'Drowned Heron', icon: '≈', hp: 55, attack: 9, element: 'water', art: 'forestHeron', tint: 'none' },
  elarisAntler: { name: 'Blight Antler', icon: '◆', hp: 44, attack: 8, element: 'earth', art: 'forestStag', tint: 'none' },
  elarisMoth:   { name: 'Storm Moth', icon: '≋', hp: 52, attack: 9, element: 'air', art: 'forestMoth', tint: 'none' },
  tideboundWarden: { name: 'The Tidebound Warden', icon: '≈', hp: 70, attack: 11, armor: 3, boss: true, miniBoss: true, element: 'water', art: 'forestHeron', tint: 'none' },
  galeSovereignElaris: { name: 'The Gale Sovereign', icon: '≋', hp: 66, attack: 11, armor: 3, boss: true, miniBoss: true, element: 'air', art: 'forestMoth', tint: 'none' },
  elarisTyrant: { name: 'The Bloom Tyrant', icon: '❃', hp: 150, attack: 10, boss: true, element: 'earth', shift: ['earth', 'air'], shiftEvery: 3, art: 'forestTyrant', tint: 'none' }
};
Object.assign(enemies, SKY_ENEMIES, WILDS_ENEMIES);
Object.assign(ENEMY_AFFLICTIONS, {
  skyDrake: ['crush'], skyWisp: ['static'], skyHarpy: ['barrage'], skyRam: ['rend'],
  stormbellWarden: ['shackle', 'static'], featherMatriarch: ['siphon', 'fog'], zenithRoc: ['empower', 'barrage', 'frail'],
  elarisFox: ['barrage'], elarisHeron: ['siphon'], elarisAntler: ['frail'], elarisMoth: ['fog'],
  tideboundWarden: ['siphon', 'barrier'], galeSovereignElaris: ['barrage', 'shackle'], elarisTyrant: ['bleed', 'empower', 'rend']
});
Object.assign(BOSS_PATTERNS, {
  // The Stormbell Warden — tolls, then strikes twice while you are still ringing.
  stormbellWarden: ['guard', 'charge', 'elemental', 'attack', 'attack', 'heavy'],
  // The Featherfall Matriarch — keeps her distance and dives from above.
  featherMatriarch: ['attack', 'guard', 'charge', 'elemental', 'charge', 'elemental'],
  // The Zenith Roc — circles high (guard, charge) and stoops hard.
  zenithRoc: ['guard', 'charge', 'elemental', 'heavy', 'attack', 'charge', 'elemental'],
  tideboundWarden: BOSS_PATTERNS.tidewardenElaris, galeSovereignElaris: BOSS_PATTERNS.galeSovereign, elarisTyrant: BOSS_PATTERNS.bloomTyrant
});
// Round 177: tuned with tests/balance-sim.cjs (regular fights ~75% wins, mini-bosses ~42%, final bosses ~29%).
Object.assign(BALANCE.perEnemy, {
  // Round 183: re-tuned with gear worn (assets/sim/lab.js). Round 226: again after ⚔ Pressure.
  // Round 253: re-tuned to about 40 percent for the average build with full decks.
  stormbellWarden: { hp: 1.52 }, featherMatriarch: { hp: 1.61 }, zenithRoc: { hp: 0.632 },
  tideboundWarden: { hp: 3.51 }, galeSovereignElaris: { hp: 1.88 }, elarisTyrant: { hp: 1.37 }, elarisHeron: { hp: .9 }
});
const SKY_ZONE_ENEMY = ['skyDrake', 'skyDrake', 'skyWisp', 'skyWisp', 'skyHarpy', 'skyHarpy', 'skyRam', 'skyRam'];
const WILDS_ZONE_ENEMY = ['elarisFox', 'elarisFox', 'elarisAntler', 'elarisAntler', 'elarisHeron', 'elarisHeron', 'elarisMoth', 'elarisMoth'];

// --- Balance: each new world sits where the old worlds 3 and 4 were ---
for (const [table, sky, wilds] of [['hpPerLevel', .05, .05], ['attackPerLevel', .25, .25], ['regionHp', 2.2, 2.22], ['regionAttack', 16, 25],
  ['difficulty', 1, 1], ['regionLevelBase', 19, 28], ['eliteHp', 1.25, 1.25], ['normalHp', .9, 1.02]]) Object.assign(BALANCE[table], { sky, wilds });

// --- Rooms ------------------------------------------------------------
function tileWorldRooms(id, roleEnemy) {
  const d = TILE_WORLD_DATA[id], byRoom = {};
  for (const [role, enemy] of Object.entries(roleEnemy)) byRoom[d.roles[role]] = enemy;
  return Object.fromEntries(Object.entries(d.layout).map(([k, r], i) => [k, {
    name: r.name, exits: { ...r.exits }, district: 0, landmark: WORLD_NAMES[id].toUpperCase(), cityIndex: i, world: [...r.world],
    ...(r.zone ? { zone: r.zone } : {}), ...(r.level ? { level: r.level } : {}), ...(byRoom[k] ? { enemy: [byRoom[k], 400, 250] } : {})
  }]));
}
// Quiet rooms (events, no enemies) and the mid Nexus: ordinary rooms spread along the walk.
function tileWorldStops(id) {
  const d = TILE_WORLD_DATA[id], roles = new Set(Object.values(d.roles)), start = d.roles.start, dist = { [start]: 0 }, q = [start];
  while (q.length) { const k = q.shift(); for (const t of Object.values(d.layout[k].exits)) if (!(t in dist)) { dist[t] = dist[k] + 1; q.push(t); } }
  const far = Math.max(...Object.values(dist));
  const pick = (frac, taken) => Object.keys(d.layout).filter(k => !roles.has(k) && !taken.includes(k) && Object.keys(d.layout[k].exits).length > 1)
    .sort((a, b) => Math.abs(dist[a] / far - frac) - Math.abs(dist[b] / far - frac) || (a < b ? -1 : 1))[0];
  const out = [];
  for (const f of [.5, .25, .62, .85]) out.push(pick(f, out));
  return { mid: out[0], quiet: out.slice(1) };
}
const TILE_WORLD_ROLES = {
  sky: { boss: 'zenithRoc', mini1: 'stormbellWarden', mini2: 'featherMatriarch' },
  wilds: { boss: 'elarisTyrant', mini1: 'tideboundWarden', mini2: 'galeSovereignElaris' },
  vespera: { boss: 'stormTyrant', mini1: 'arcSentinel', mini2: 'resonantPhantom' },
  chronospire: { boss: 'chronarch', mini1: 'clockwarden', mini2: 'paradoxTwin' }
};
// A crystal chest in the dead end nearest each mini-boss room (those rooms hold gear).
function tileWorldChests(id, stops) {
  const d = TILE_WORLD_DATA[id], taken = new Set([...Object.values(d.roles), stops.mid, ...stops.quiet]), out = {};
  for (const mini of [d.roles.mini1, d.roles.mini2]) {
    const dist = { [mini]: 0 }, q = [mini];
    while (q.length) { const k = q.shift(); for (const t of Object.values(d.layout[k].exits)) if (!(t in dist)) { dist[t] = dist[k] + 1; q.push(t); } }
    const pick = Object.keys(d.layout).filter(k => !taken.has(k) && Object.keys(d.layout[k].exits).length === 1).sort((a, b) => dist[a] - dist[b] || (a < b ? -1 : 1))[0];
    if (pick) { out[pick] = 'crystal'; taken.add(pick); }
  }
  return out;
}
const TILE_WORLD_CHESTS = { sky: { '5,3': 'crystal', '0,3': 'crystal' }, wilds: { '5,2': 'crystal', '0,2': 'crystal' } };
const TILE_WORLD_ZONES = { sky: SKY_ZONE_ENEMY, wilds: WILDS_ZONE_ENEMY, vespera: VESPERA_ZONE_ENEMY, chronospire: CHRONO_ZONE_ENEMY };
// The old Vespera and Chronospire rooms are swapped for the tile-built ones in place, so every
// lookup of VESPERA_ROOM_DATA / CHRONO_ROOM_DATA sees the new map.
const REBUILT_ROOM_DATA = { vespera: VESPERA_ROOM_DATA, chronospire: CHRONO_ROOM_DATA };
for (const id of ALL_TILE_WORLD_IDS) {
  const d = TILE_WORLD_DATA[id], stops = tileWorldStops(id);
  let built = tileWorldRooms(id, TILE_WORLD_ROLES[id]);
  if (REBUILT_ROOM_DATA[id]) { const target = REBUILT_ROOM_DATA[id]; for (const k of Object.keys(target)) delete target[k]; Object.assign(target, built); built = target; }
  TILE_REGIONS[id] = {
    rooms: built, start: d.roles.start, stops,
    chests: TILE_WORLD_CHESTS[id] || tileWorldChests(id, stops), // beside the mini-boss rooms, which hold gear (Round 176)
    tierTypes: key => { const z = rooms[key] && rooms[key].zone; return [TILE_WORLD_ZONES[id][(z || 1) - 1]]; }
  };
  WORLD_BOSS_ROOMS[id] = [d.roles.boss, TILE_WORLD_ROLES[id].boss];
  NEXUS_POINTS[id] = { start: d.roles.start, mid: stops.mid };
  QUIET_ROOMS[id] = stops.quiet;
}
TILE_REGIONS.sky.arrive = () => toast('Sky Isles · Windgate Landing. Glass decks drift between the towers of the floating city.');
TILE_REGIONS.wilds.arrive = () => toast('Elaris · the old forest. Paths wind between moss-grown ruins, and boardwalks cross its lakes.');

// --- Walk masks and painted tiles (the Solaris engine, once per world) ---
const tileWorldBits = {};
function tileWorldWalk(id, wx, wy) {
  const w = TILE_WORLD_DATA[id].world;
  let bits = tileWorldBits[id];
  if (!bits) {
    const abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/', n = w.maskW * w.maskH; bits = tileWorldBits[id] = new Uint8Array(n);
    for (let i = 0; i < n; i++) bits[i] = (abc.indexOf(w.mask[Math.floor(i / 6)]) >> (5 - i % 6)) & 1;
  }
  const mx = Math.floor(wx / w.cell), my = Math.floor(wy / w.cell);
  return mx >= 0 && my >= 0 && mx < w.maskW && my < w.maskH && bits[my * w.maskW + mx] === 1;
}
// The map engine is absent in the balance sims (tests/talent-sim.cjs), so these hooks are guarded.
if (typeof ORGANIC_AREAS !== 'undefined') for (const id of ALL_TILE_WORLD_IDS) ORGANIC_AREAS['world:' + id] = {
  src: id + '-world', world: true,
  at(o, ax, ay) { if (ay >= 0 && ay < 500) ay = Math.min(ay, 495); return tileWorldWalk(id, o.area.left * 800 + ax, o.area.top * 500 + ay); },
};
if (typeof neonWorldWalk === 'function') {
  const neonWorldWalkBeforeTiles = neonWorldWalk;
  neonWorldWalk = function (wx, wy) { return TILE_REGIONS[activeRegion] ? tileWorldWalk(activeRegion, wx, wy) : neonWorldWalkBeforeTiles(wx, wy); };
  const neonLooseBeforeTiles = neonLoose;
  neonLoose = function (from, to) { const d = TILE_REGIONS[activeRegion] && TILE_WORLD_DATA[activeRegion]; return d ? !!(d.plan[from] || d.plan[to]) : neonLooseBeforeTiles(from, to); };
}
for (const id of ALL_TILE_WORLD_IDS) { if (typeof JOINED_AREAS !== 'undefined') JOINED_AREAS[id] = []; }
// Vespera's old joined districts and painted blocks belong to the retired map.
VESPERA_ROOM_KEYS.splice(0, VESPERA_ROOM_KEYS.length, ...Object.keys(VESPERA_ROOM_DATA));
if (typeof ORGANIC_AREAS !== 'undefined') for (const k of Object.keys(ORGANIC_AREAS)) if (/^(vespera|chronospire):/.test(k)) delete ORGANIC_AREAS[k];
for (const id of REBUILT_WORLD_IDS) {
  if (typeof DIAG_ART !== 'undefined') delete DIAG_ART[id];
  if (typeof DIAG_MASK_SRC !== 'undefined') delete DIAG_MASK_SRC[id];
  if (typeof CITY_BLOCK_ARTS !== 'undefined') delete CITY_BLOCK_ARTS[id];
}
if (typeof regionDistanceCache !== 'undefined') for (const id of REBUILT_WORLD_IDS) delete regionDistanceCache[id];

const tileWorldImages = {};
// Round 208: the paintings carry a version, so a world repainted under the same file names (the
// Sky Isles in Round 204) isn't shown from the browser's cache. Bump it when tile art changes.
const TILE_ART_VERSION = '235';
function tileWorldArtSrc(id, name) { return 'assets/environment/' + id + '/' + name + '.webp?v=' + TILE_ART_VERSION; }
function paintTileWorld(canvas, id, key) {
  const plan = TILE_WORLD_DATA[id].plan[key]; if (!plan) return false;
  const [name, fx, fy] = plan, src = tileWorldArtSrc(id, name);
  let img = tileWorldImages[src];
  if (!img) { img = new Image(); img.src = src; tileWorldImages[src] = img; }
  if (!(img.complete && img.naturalWidth)) {
    if (canvas.dataset) canvas.dataset.pending = '1'; canvas.pendingImage = img;
    if (img.addEventListener) img.addEventListener('load', () => { if (canvas.isConnected) paintTileWorld(canvas, id, key); }, { once: true });
    return false;
  }
  canvas.width = img.naturalWidth; canvas.height = Math.round(img.naturalWidth * 5 / 8);
  if (canvas.style) { canvas.style.imageRendering = 'auto'; canvas.style.filter = 'none'; }
  const ctx = canvas.getContext('2d'); if (!ctx) return false;
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.save(); ctx.translate(fx ? canvas.width : 0, fy ? canvas.height : 0); ctx.scale(fx ? -1 : 1, fy ? -1 : 1);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height); ctx.restore();
  if (canvas.dataset) delete canvas.dataset.pending; canvas.pendingImage = null;
  return true;
}
const renderBeforeTileWorlds = NeonCity.render;
NeonCity.render = function (container, key) {
  const out = renderBeforeTileWorlds.apply(this, arguments);
  const id = activeRegion, d = TILE_REGIONS[id] && TILE_WORLD_DATA[id];
  if (!d || !d.plan[key] || !container || !container.querySelector) return out;
  if (container.dataset) container.dataset.environment = id;
  const ground = container.querySelector('canvas.city-ground');
  if (ground) { if (ground.classList) ground.classList.add('neon-world', id + '-ground'); paintTileWorld(ground, id, key); }
  if (container.querySelectorAll) for (const w of container.querySelectorAll('.wildlife')) w.remove();
  return out;
};
const tileWorldStyles = document.createElement('style');
tileWorldStyles.textContent = '#world[data-environment="vespera"]{background:#1a2550}#world[data-environment="chronospire"]{background:#3a2814}#world[data-environment="sky"]{background:#2a1f4a}#world[data-environment="sky"] .city-landmark{color:#fff;text-shadow:0 1px 3px #3a1050}'
  + '#world[data-environment="wilds"]{background:#2f5a34}#world[data-environment="wilds"] .city-landmark{color:#eaffd8;text-shadow:0 1px 3px #0d2a12}';
document.head.append(tileWorldStyles);

// --- Exploration: lore, events, names and the objective ---
Object.assign(NEXUS_WORLD_NAMES, { sky: 'Sky Isles', wilds: 'Elaris' });
Object.assign(LORE_NAMES, { sky: ['☁', 'Wind Chime'], wilds: ['❦', 'Elder Stone'] });
LORE.sky = [
  'The chime sings when the wind passes: "The isles were lifted so the storms could not reach them. Now the storms live here too."',
  '"The Stormbell Warden rings once for every traveller. Count the peals, and you will know how many never left."',
  '"Drakes nest where the sun first touches the isles. Their feathers are warm long after they fall."',
  '"The Featherfall Matriarch guards the last roost. Her chicks are clouds; do not step on them."',
  '"The Zenith Roc circles the Eye of the Sky. Ground it, and the wind will carry you down to the old forest of Elaris."'
];
LORE.wilds = [
  'The stone is warm. Words rise in your mind: "Before the Tyrant bloomed, Elaris sang in four voices: flame, tide, root and wind."',
  '"The Tidebound Warden was a guardian once. It guards the river still, but it no longer remembers from what."',
  '"Burn and rot are siblings here. What fire leaves, the poison finishes. Do not fight them both at once."',
  '"The Gale Sovereign crowned itself on the highest branch and called the storm its court."',
  '"The Bloom Tyrant drinks the land\'s four voices. Silence it, and the stormglass road will open to Vespera."'
];
const skyPct = f => Math.ceil(state.maxHp * f);
Object.assign(EVENTS, {
  updraft: { icon: '🌬', name: 'Updraft Well', text: () => 'Warm air rises from a hole in the island. Feathers spin in it.',
    choices: () => [{ label: 'Ride the updraft · heal ' + skyPct(.5) + ' HP', run: () => { state.hp = Math.min(state.maxHp, state.hp + skyPct(.5)); return 'The warm wind lifts you: +' + skyPct(.5) + ' HP.'; } },
                    { label: 'Catch the feathers · +8 Shards', run: () => { state.shards += 8; return 'Shard-tipped feathers: +8 Shards.'; } }] },
  aerie: { icon: '🪺', name: 'Abandoned Aerie', text: () => 'A nest as wide as a cart, lined with lost travellers\' things.',
    choices: () => [{ label: 'Search the nest · +2 potions', run: () => { state.potions += 2; return '+2 healing potions.'; } },
                    { label: 'Take the bright feather · Surge Rite blessing', run: () => { state.blessing = 'surge'; return 'Surge Rite: next fight +1 energy and +1 card on turn 1.'; } }] },
  chimes: { icon: '🎐', name: 'Singing Chimes', text: () => 'Hundreds of chimes hang from a dead tree, all ringing the same note.',
    choices: () => [{ label: 'Listen · train your whole deck +10 uses', run: () => { active().forEach(c => { for (let k = 0; k < 10; k++) recordCardUse(owned(c.uid) || c); }); return 'Every card in your deck gains 10 mastery uses.'; } },
                    { label: 'Cut one down · +8 Shards', run: () => { state.shards += 8; return 'The chime is silver: +8 Shards.'; } }] },
  starwell: { icon: '✦', name: 'Starwell', text: () => 'A pool that reflects the stars even at noon.',
    choices: () => [{ label: 'Drink · 60%: heal 40%, 40%: −10% HP', run: () => { if (Math.random() < .6) { const h = skyPct(.4); state.hp = Math.min(state.maxHp, state.hp + h); return 'Starlight: +' + h + ' HP.'; } const l = skyPct(.1); state.hp = Math.max(1, state.hp - l); return 'Cold as space: −' + l + ' HP.'; } },
                    { label: 'Fill a flask · +1 potion', run: () => { state.potions += 1; return '+1 healing potion.'; } }] }
});
EVENT_POOLS.sky = ['updraft', 'aerie', 'chimes', 'starwell'];
EVENT_POOLS.wilds = ['spring', 'ranger', 'seedpod', 'vines'];
// Card rewards until the per-world pools land (Round 177).
VARIETY_POOLS.sky = [...VARIETY_POOLS.vespera]; VARIETY_POOLS.wilds = [...VARIETY_POOLS.elaris];
const objectiveBeforeTileWorlds = objective;
objective = function () {
  if (activeRegion === 'sky') return state.bosses.includes('zenithRoc') ? 'The portal to Elaris is open in The Eye of the Sky.' : 'Defeat the Zenith Roc in The Eye of the Sky. Its dives come after it circles: save your Block.';
  if (activeRegion === 'wilds') return state.bosses.includes('elarisTyrant') ? 'The portal to Vespera is open in Elderbloom Sanctuary.' : 'Defeat the Bloom Tyrant in Elderbloom Sanctuary. Reserve your counter for charged strikes.';
  return objectiveBeforeTileWorlds();
};

// --- Saves from before Round 179: Vespera and Chronospire have new maps ---
// Exploration there restarts at the world's start (like Solaris in Round 149); character,
// deck, gear and boss kills stay. A game in progress is always on the new maps, so every
// save carries the mark (Round 171 lesson).
const TILE_WORLDS_VERSION = 179;
function migrateRebuiltWorlds(s) {
  if (!s || s.tileWorlds >= TILE_WORLDS_VERSION) return s;
  for (const id of REBUILT_WORLD_IDS) {
    const start = TILE_REGIONS[id].start, mine = k => typeof k === 'string' && k.startsWith(id + ':');
    if (s.regionVisits && Array.isArray(s.regionVisits[id])) s.regionVisits[id] = [start];
    if (s.region === id) { s.room = start; s.pos = { x: 400, y: 300 }; s.visited = [start]; if (s.regionVisits) s.regionVisits[id] = s.visited; s.battle = null; }
    if (s.cooldowns) for (const k of Object.keys(s.cooldowns)) if (mine(k)) delete s.cooldowns[k];
    if (Array.isArray(s.chests)) s.chests = s.chests.filter(c => !mine(c));
    if (s.poi && Array.isArray(s.poi.nexus)) s.poi.nexus = s.poi.nexus.filter(n => !mine(n) || n === nexusId(id, start));
    if (s.poi && Array.isArray(s.poi.used)) s.poi.used = s.poi.used.filter(u => !mine(u));
  }
  s.tileWorlds = TILE_WORLDS_VERSION;
  return s;
}
// Round 197: rooms a world cut for its diagonals. A save standing in one resumes at the world's
// start, and the cut rooms leave the visited lists.
function dropCutRooms(s) {
  if (!s) return s;
  for (const id of ALL_TILE_WORLD_IDS) {
    const cut = TILE_WORLD_DATA[id].cut; if (!cut || !cut.length) continue;
    const gone = k => cut.includes(k), start = TILE_REGIONS[id].start;
    if (s.regionVisits && Array.isArray(s.regionVisits[id])) s.regionVisits[id] = s.regionVisits[id].filter(k => !gone(k));
    if (s.region === id) {
      if (Array.isArray(s.visited)) s.visited = s.visited.filter(k => !gone(k));
      if (gone(s.room)) { s.room = start; s.pos = { x: 400, y: 300 }; if (Array.isArray(s.visited) && !s.visited.includes(start)) s.visited.push(start); }
    }
  }
  return s;
}
const restoreGameBeforeTiles = restoreGame;
restoreGame = function (s) { return restoreGameBeforeTiles(dropCutRooms(migrateRebuiltWorlds(s))); };
const validateImportBeforeTiles = validateImport;
validateImport = function (s) { return validateImportBeforeTiles(dropCutRooms(migrateRebuiltWorlds(s))); };
const saveBeforeTiles = save;
save = function () { if (state) state.tileWorlds = TILE_WORLDS_VERSION; return saveBeforeTiles.apply(this, arguments); };
