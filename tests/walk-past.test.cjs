// Round 184: things beside the path. On a tap route only what was tapped opens; something already
// used doesn't pop up again when walked past (a tap on it still opens it); items avoid the HUD and
// minimap corners; painted-room chests keep clear of patrols.
const { run } = require('./expansion.test.cjs');
run(require('fs').readFileSync(require('path').join(__dirname, '../assets/touch-controls.js'), 'utf8'));
run(`{
const shown = () => !document.getElementById('menuOverlay').classList.contains('hidden');
const toasts = []; const realToast = toast; toast = m => toasts.push(m);
newGame(); state.seed = 12345; spawnCatalog = {}; state.region = 'sky'; configureRegion('sky'); ensureExplore();
const key = Object.keys(rooms).find(k => { const p = poiAt(k); return p && p.type === 'shrine'; }), p = poiAt(key);
assert(key, 'a shrine to test with');
for (const k in poiCache) delete poiCache[k];
const reset = () => { closeMenu(); document.getElementById('menuOverlay').classList.add('hidden'); cancelTouchRoute(); poiArmed = null; state.room = key; state.pos = { x: p.x, y: p.y + 30 }; };
// Walking up to an unused one opens it.
reset(); checkWorldInteractions(); assert(shown(), 'an unused shrine opens when you reach it');
// On a tap route to a far door, passing it does not.
reset(); const doorAt = { n: { x: 400, y: 15 }, s: { x: 400, y: 485 }, e: { x: 785, y: 250 }, w: { x: 15, y: 250 } }, far = Object.keys(rooms[key].exits).map(d => doorAt[d]).sort((a, b) => Math.hypot(b.x - p.x, b.y - p.y) - Math.hypot(a.x - p.x, a.y - p.y))[0];
setTouchDestination(far); assert(activeTouchRoute(), 'a route elsewhere'); checkWorldInteractions(); assert(!shown(), 'passing by on a route to somewhere else does not open it');
// Used: walking past shows a note, not the menu; tapping it opens it.
state.poi.used.push(p.id);
reset(); checkWorldInteractions(); assert(!shown() && /already used/.test(toasts.at(-1)), 'a used shrine only shows a note');
reset(); setTouchDestination({ x: p.x, y: p.y }); cancelTouchRoute(); poiArmed = null; checkWorldInteractions(); assert(shown(), 'tapping a used shrine opens it to look again');
// Placement: in every world and a few seeds, no point of interest under the HUD or the minimap,
// and painted-room chests clear of patrols.
for (const seed of [3, 77, 4041]) { state.seed = seed;
 for (const w of WORLD_ORDER) { configureRegion(w); state.region = w; for (const k in poiCache) delete poiCache[k];
  for (const [k, q] of Object.entries(worldPOIs())) if (q.type !== 'nexus') assert(!screenCovered(q.x, q.y), w + ' ' + k + ' ' + q.type + ' is under the HUD or minimap');
  for (const k of Object.keys(rooms)) { const c = chestFor(k); if (!c) continue; for (const s of roomSpawns(k)) assert(Math.hypot(s.x - c.x, s.y - c.y) > 60, w + ' ' + k + ' chest beside a patrol'); }
 }}
toast = realToast; closeMenu();
console.log('PASS: on a tap route only the tapped item opens, used items do not pop up when walked past, and items keep clear of the HUD, minimap and patrols.');
}`);
