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
  const reg = JSON.parse(run(`JSON.stringify({ surfaces: CITY_SURFACES, art: CITY_TD_ART, tex: GEN_THEMES.city.tex, surfaceSlots: [...CITY_SURFACE_SLOTS] })`));
  const size = rel => { const p = path.join(CITY, rel); return fs.existsSync(p) ? fs.statSync(p).size : 0; };
  const pic = (rel, extra = {}) => ({ name: path.basename(rel, '.webp'), src: 'assets/environment/city-gen/' + rel, bytes: size(rel), ...extra });
  const KIND = { ground: 'Ground', edge: 'Edges and borders', building: 'Buildings' };
  const groups = [];
  for (const kind of ['ground', 'edge', 'building']) {
    const items = reg.surfaces.filter(s => s.kind === kind).map(s => {
      const files = [];
      for (const b of s.base || []) files.push(pic((reg.tex[b] || b) + '.webp', { role: 'base texture' }));
      for (const n of (s.slot && reg.art[s.slot]) || []) files.push(pic('surfaces/' + s.slot + '/' + n + '.webp'));
      return { key: s.key, label: s.label, rule: s.rule, walk: s.walk, scale: s.scale || null, folder: 'surfaces/' + s.key + '/', files };
    });
    groups.push({ title: KIND[kind], items });
  }
  const PROP = { 'prop-ac': 'Air-conditioning units', 'prop-vent': 'Vents', 'prop-tank': 'Water tanks', 'prop-stairs': 'Stair huts', 'prop-solar': 'Solar panels', 'prop-skylight': 'Skylights', 'sign-h': 'Neon signs (wide)', 'sign-v': 'Neon signs (tall)', car: 'Vehicles', tree: 'Trees' };
  const props = Object.entries(reg.art).filter(([slot]) => !reg.surfaceSlots.includes(slot))
    .map(([slot, ns]) => ({ key: slot, label: PROP[slot] || slot, rule: slot.startsWith('prop-') ? 'Stands on roofs, sized per kind, never over a neighbour.' : slot === 'car' ? 'Parked inside the main streets, clear of crossings, doors and objects; blocks the way.' : slot === 'tree' ? 'Stands in parks; blocks the way.' : 'Only on the front of a building whose street is in front; never stretched.', walk: false, folder: 'props/' + slot + '/', files: ns.map(n => pic('props/' + slot + '/' + n + '.webp')) }));
  groups.push({ title: 'Props (standing on the surfaces)', items: props });
  const legacy = fs.readdirSync(path.join(CITY, 'legacy')).filter(f => f.endsWith('.webp')).sort();
  groups.push({ title: 'Legacy (old 3/4 city, not drawn)', items: [{ key: 'legacy', label: 'Old side-on buildings and textures', rule: 'Kept for reference; the top-down city does not draw these.', walk: null, folder: 'legacy/', files: legacy.map(f => pic('legacy/' + f)) }] });
  return { title: 'Textures', note: 'Neon Aftermath, the generated top-down city. Built by tools/build-sprites-manifest.cjs from CITY_SURFACES and CITY_TD_ART in assets/chrono-gen.js.', groups };
}
module.exports = { build };
if (require.main === module) {
  const m = build(), out = path.join(ROOT, 'sprites', 'manifest.json');
  fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, JSON.stringify(m, null, 1) + '\n');
  const n = m.groups.reduce((a, g) => a + g.items.reduce((b, i) => b + i.files.length, 0), 0);
  console.log('wrote sprites/manifest.json: ' + m.groups.length + ' categories, ' + n + ' pictures');
}
