'use strict';
// Round 275: walking straight at a chest, relic, point of interest, waypoint, the merchant or the Cardsmith
// carries you to it instead of stopping at an invisible edge of the traced street; and keys typed into a
// text box (a favourite deck's name) are not taken as game keys.
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`(() => { newGame(); state.seed = 4242; const out = { worlds: {}, typing: [] };
const itemsIn = () => { const items = [];
  for (const k of Object.keys(rooms)) { if (!organicDef(k)) continue; const p = poiAt(k); if (p) items.push([k, p.type, p, 40]);
    const c = chestFor(k); if (c) items.push([k, 'chest', c, 38]); const q = rooms[k].relic; if (q) items.push([k, 'relic', { x: q[3], y: q[4] }, 48]); }
  const m = merchantRoom(); if (m && organicDef(m.key)) items.push([m.key, 'merchant', m, 40]);
  const s = cardsmithFor(); if (s && organicDef(s.key)) items.push([s.key, 'cardsmith', s, 40]);
  return items; };
// Hold the arrow keys toward the item (8 directions), sliding along walls as move() does.
const approach = (p, rad, x, y) => { for (let t = 0; t < 240; t++) { const dx = Math.sign(Math.round((p.x - x) / 6)), dy = Math.sign(Math.round((p.y - y) / 6)); if (!dx && !dy) break;
  const l = Math.hypot(dx, dy), st = 175 / 60, nx = x + dx / l * st, ny = y + dy / l * st; if (!collides(nx, y)) x = nx; if (!collides(x, ny)) y = ny;
  if (Math.hypot(x - p.x, y - p.y) < rad) return 0; } return Math.hypot(x - p.x, y - p.y); };
for (const region of WORLD_ORDER) { configureRegion(region); state.region = region; const w = out.worlds[region] = { items: 0, padless: [], tries: 0, near: 0 };
  for (const [k, t, p, rad] of itemsIn()) { w.items++; state.room = k;
    if (!itemPadAt(k, p.x, p.y)) w.padless.push(k + ' ' + t);
    const reach = organicReachable(k), pts = organicGrid(k);
    for (let i = 0; i < pts.length; i += 6) { const px = pts[i], py = pts[i + 1], d = Math.hypot(px - p.x, py - p.y);
      if (d < rad || d > 140 || (reach && !reach.has(px + ',' + py))) continue;
      w.tries++; const m = approach(p, rad, px, py); if (m && m < rad + 40) w.near++; } } }
out.typing = [typingKey({ target: { tagName: 'INPUT' } }), typingKey({ target: { tagName: 'TEXTAREA' } }), typingKey({ target: { isContentEditable: true } }), typingKey({ target: { tagName: 'DIV' } })];
return JSON.stringify(out); })()`));
for (const [region, w] of Object.entries(r.worlds)) {
  assert(w.items >= 20, region + ' has its interactables');
  assert.deepStrictEqual(w.padless, [], region + ': every item has a walkable pad');
  const pct = 100 * w.near / w.tries;
  // Before Round 275: Elaris 36%, Vespera 41%, Neon Aftermath 9%. What is left is mostly across water or a wall.
  assert(pct < 14, region + ': ' + pct.toFixed(1) + '% of straight approaches stall just short of an item');
}
assert.deepStrictEqual(r.typing, [true, true, true, false], 'text boxes keep their keys');
console.log('PASS: every interactable in all six worlds has a walkable pad, straight approaches reach it, and text boxes keep W/A/S/D/M and the arrows.');
