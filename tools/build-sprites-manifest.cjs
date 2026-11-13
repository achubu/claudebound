// Round 421: writes sprites/manifest.json for the Textures page (aethercede.com/sprites): every picture the top-down city
// draws, grouped by category, read from CITY_SURFACES / CITY_TD_ART (assets/chrono-gen.js) and the files on disk.
// Run after adding art:  node tools/build-sprites-manifest.cjs
// (tests/sprites-page.test.cjs fails when the manifest is out of date.)
'use strict';
process.env.HARNESS_ONLY = '1';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const CITY = path.join(ROOT, 'assets', 'environment', 'city-gen');

function build() {
  const { run } = require(path.join(ROOT, 'tests', 'expansion.test.cjs'));
  const reg = JSON.parse(run(`JSON.stringify({ surfaces: CITY_SURFACES, art: CITY_TD_ART, tex: GEN_THEMES.city.tex, surfaceSlots: [...CITY_SURFACE_SLOTS],
    poi: WORLD_POI_ART.city, chest: WORLD_CHEST_ART.city, generic: POI_ART, events: EVENT_POOLS.city,
    creatures: Object.values(WILDLIFE_ART).filter(a => String(a.sheet).startsWith('city/')).map(a => ({ name: a.name, sheets: [a.sheet].concat(a.poses && typeof a.poses.walk === 'string' ? [a.poses.walk] : []) })) })`));
  const size = rel => { const p = path.join(ROOT, rel); return fs.existsSync(p) ? fs.statSync(p).size : 0; };
  const pic = (rel, extra = {}) => ({ name: path.basename(rel).replace(/\.(webp|png)$/, ''), src: rel, bytes: size(rel), ...extra });
  const city = rel => 'assets/environment/city-gen/' + rel;
  const byName = (a, b) => a.name.localeCompare(b.name), byLabel = (a, b) => a.label.localeCompare(b.label);
  const type = (key, label, rule, walk, folder, files, scale) => ({ key, label, rule, walk, folder, scale: scale || null, files: files.sort(byName) });
  const KIND = { ground: 'Ground', edge: 'Edges and borders', building: 'Buildings' }, categories = [];
  for (const kind of ['ground', 'edge', 'building']) categories.push({ title: KIND[kind], types: reg.surfaces.filter(s => s.kind === kind).map(s => {
    const files = [];
    for (const b of s.base || []) files.push(pic(city((reg.tex[b] || b) + '.webp'), { role: 'base texture' }));
    for (const n of (s.slot && reg.art[s.slot]) || []) files.push(pic(city('surfaces/' + s.slot + '/' + n + '.webp')));
    return type(s.key, s.label, s.rule, s.walk, 'city-gen/surfaces/' + s.key + '/', files, s.scale);
  }).sort(byLabel) });
  const PROP = { 'prop-ac': 'Air-conditioning units', 'prop-vent': 'Vents', 'prop-tank': 'Water tanks', 'prop-stairs': 'Stair huts', 'prop-solar': 'Solar panels', 'prop-skylight': 'Skylights', 'sign-h': 'Neon signs (wide)', 'sign-v': 'Neon signs (tall)', car: 'Vehicles', tree: 'Trees' };
  categories.push({ title: 'Props', types: Object.entries(reg.art).filter(([slot]) => !reg.surfaceSlots.includes(slot)).map(([slot, ns]) =>
    type(slot, PROP[slot] || slot, slot.startsWith('prop-') ? 'Stands on roofs, sized per kind, never over a neighbour.' : slot === 'car' ? 'Parked inside the main streets, clear of crossings, doors and objects; blocks the way.' : slot === 'tree' ? 'Stands in parks; blocks the way.' : 'Only on the front of a building whose street is in front; never stretched.', false, 'city-gen/props/' + slot + '/', ns.map(n => pic(city('props/' + slot + '/' + n + '.webp'))))).sort(byLabel) });
  const OBJ = { cardsmith: 'Cardsmith', wantedBoard: 'Wanted Board', breaker: 'Breaker boxes', vault: 'Afterlight Vault', nexus: 'Nexus Waypoint', merchant: 'Merchant' }, GEN = { sealed: 'Sealed door', cache: 'Cache', shrine: 'Shrine', campfire: 'Campfire', event: 'Event marker' }, poiRel = n => 'assets/items/poi/' + n + '.webp';
  const objects = Object.entries(reg.poi).map(([k, n]) => type(k, OBJ[k] || k, 'Stands on its own square (a forecourt at a building entrance).', false, 'items/poi/', [pic(poiRel(n))]));
  objects.push(type('chest', 'Chest', 'Stands on a square; glows.', false, 'items/poi/', [pic(poiRel(reg.chest))]));
  for (const [k, n] of Object.entries(reg.generic)) if (!reg.poi[k]) objects.push(type(k, GEN[k] || k, 'Shared with other worlds.', false, 'items/poi/', [pic(poiRel(n))]));
  objects.push(type('events', 'City events', 'One picture per event that can appear in the city.', false, 'items/poi/events/', reg.events.map(e => pic('assets/items/poi/events/' + e + '.webp'))));
  objects.push(type('portal', 'Portal to Solaris', 'The gate on to the next world.', false, 'environment/', [pic('assets/environment/city-solaris-portal.webp')]));
  categories.push({ title: 'Objects', types: objects.filter(t => t.files.every(f => f.bytes)).sort(byLabel) });
  categories.push({ title: 'Creatures', types: reg.creatures.map(c => type(c.name, c.name, 'A sheet of four frames, one row.', false, 'monsters/city/', c.sheets.map(sh => pic('assets/monsters/' + sh + '.png')))).sort(byLabel) });
  const legacy = fs.readdirSync(path.join(CITY, 'legacy')).filter(f => f.endsWith('.webp'));
  categories.push({ title: 'Legacy (not drawn)', types: [type('legacy', 'Old side-on buildings and textures', 'Kept for reference; the top-down city does not draw these.', null, 'city-gen/legacy/', legacy.map(f => pic(city('legacy/' + f))))] });
  return { title: 'Textures', note: 'Every picture the game draws, by world, then category, then type, then name. Built by tools/build-sprites-manifest.cjs from the game\'s own tables (CITY_SURFACES, CITY_TD_ART and the object and creature tables).',
    worlds: [{ key: 'city', name: 'Neon Aftermath', categories }] };
}
module.exports = { build };
if (require.main === module) {
  const m = build(), out = path.join(ROOT, 'sprites', 'manifest.json');
  fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, JSON.stringify(m, null, 1) + '\n');
  const n = m.worlds.reduce((a, w) => a + w.categories.reduce((b, c) => b + c.types.reduce((d, t) => d + t.files.length, 0), 0), 0);
  console.log('wrote sprites/manifest.json: ' + m.worlds.length + ' world(s), ' + n + ' pictures');
}
