'use strict';
// =====================================================================
// Round 78: diagonal shortcuts in Neon Aftermath and Elaris.
// Wherever the path bends around a corner (A → B → C with B on the corner),
// A and C also get a direct diagonal road. The old path still works, so
// nothing is cut off. Rooms with a diagonal road use the 8-way roundabout
// art (assets/environment/diagonal/*.webp); the diagonal roads run from the
// room's corners into the main street, and walking into a corner takes you
// to the diagonal neighbour.
// =====================================================================
const DIAG_DIRS = { ne: [1, -1], nw: [-1, -1], se: [1, 1], sw: [-1, 1] };
const DIAG_OPP = { ne: 'sw', sw: 'ne', nw: 'se', se: 'nw' };
const DIAG_ART = { city: 'assets/environment/diagonal/city/ne-nw-se-sw.webp', elaris: 'assets/environment/diagonal/elaris/nw-se.webp' };
// Round 79: Neon Aftermath has one painting per combination of open corners,
// built from an all-diagonal and a no-diagonal painting of the same crossing.
const DIAG_VARIANT_DIR = { city: 'assets/environment/diagonal/city/', elaris: 'assets/environment/diagonal/elaris/' };
function diagArtFor(key) {
  const dir = DIAG_VARIANT_DIR[activeRegion];
  return dir ? dir + diagonalExits(key).join('-') + '.webp' : DIAG_ART[activeRegion];
}
// Walkable road + sidewalk, traced from the two source paintings (4px cells,
// 200x125, bit-packed). A point uses the all-diagonal trace inside an open
// corner's block and the no-diagonal trace everywhere else, exactly how the
// variant paintings are composed.
const DIAG_MASK_SRC = { city: { all: '///gAAAAAAAAAAD///8AAAAAAAAAAB//////8AAAAAAAAAAA////AAAAAAAAAAA///////gAAAAAAAAAAP///wAAAAAAAAACf//////8gAAAAAAAAAD///8AAAAAAAAAD/////////AAAAAAAAAA////AAAAAAAAAD/////////8AAAAAAAAAP///wAAAAAAAAB//////////gAAAAAAAAD///8AAAAAAAAA///////////gAAAAAAAA////AAAAAAAAAf//////////8AAAAAAAAP///wAAAAAAAAP///////////wAAAAAAAD///8AAAAAAAAH///////////+AAAAAAAA////AAAAAAAAD////////////4AAAAAAAP///wAAAAAAAB/////////////gAAAAAAD///8AAAAAAAA//////3//////8AAAAAAA////AAAAAAAHf/////8+//////wAAAAAAP///wAAAAAAD///////OH/////+AAAAAAD///8AAAAAAB///////AA//////wAAAAAA////AAAAAAB///////gAH//////AAAAAAP///wAAAAAB///////gAA//////4AAAAAD///8AAAAAB///////gAAf//////AAAAAA////AAAAAA///////wAAH//////4AAAAAP///wAAAAAf//////wAAA///////AAAAAD///8AAAAAP//////4AAAH//////4AAAAA////AAAAAH//////4AAAAf//////8AAAAP///wAAAAD//////4AAAAD///////wAAAD///8AAAAf//////8AAAAAP//////+AAAA////AAAAP//////8AAAAAA///////4AAAP///wAAAH//////+AAAAAAH///////gAAD///8AAAD//////+AAAAAAAf//////8AAA////AAAB//////+AAAAAAAB+//////gAAP///wAAA///////AAAAAAAAPH/////+AAD///8AAAf//////AAAAAAAAAg//////4AA////AAAP//////gAAAAAAAAAH//////AAP///wAAX//////gAAAAAAAAAA//////4AD///8AAP//////gAAAAAAAAAAP//////AA////AAH//////wAAAAAAAAAAH//////4AP///wAH//////wAAAAAAAAAAA///////4P////B3//////4AAAAAAAAAAAH///////n////4///////4AAAAAAAAAAAAf////////////f//////4AAAAAAAAAAAAD///////////////////8AAAAAAAAAAAAAJ//////////////////8AAAAAAAAAAAAAAP/////////////////+AAAAAAAAAAAAAAB/////////////////+AAAAAAAAAAAAAAAPGf///////////////AAAAAAAAAAAAAAABgD///////////////gAAAAAAAAAAAAAAAAAf//////////////wAAAAAAAAAAAAAAAAAD//////////////4AAAAAAAAAAAAAAAAAA//////////////+AAAAAAAAAAAAAAAAAAf//////////////wAAAAAAAAAAAAAAAGAP//////////////4AAAAAAAAAAAAAAAAxn//////////////8AAAAAAAA//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////8AAAAAAAAAB//////////////4AAAAAAAAAAAAAAAAAAP//////////////gAAAAAAAAAAAAAAAAAB//////////////4AAAAAAAAAAAAAAAAAAP/////////////8AAAAAAAAAAAAAAAAAAB//////////////AAAAAAAAAAAAAAAAAAAf/////////////4AAAAAAAAAAAAAAAAAAP//////////////AAAAAAAAAAAAAAAAAAH//////////////4AAAAAAAAAAAAAAAAAD///////////////AAAAAAAAAAAAAAAAAB///////////////8AAAAAAAAAAAAAAAAA////////////////wAAAAAAAAAAAAAAAA////////////////+AAAAAAAAAAAAAAAAf////////////////4AAAAAAAAAAAAAAAf///+/////n///////gAAAAAAAAAAAAAAP///+H////wP//////8AAAAAAAAAAAAAAH///9Av///wA///////wAAAAAAAAAAAAAX///+AD///8AH//////+AAAAAAAAAAAAAP////AA////AA///////4AAAAAAAAAABAf////gAP///wAH///////gAAAAAAAAAA4P////gAD///8AAf//////8AAAAAAAAAAfH////wAA////AAD///////wAAAAAAAAAP7////wAAP///wAAP//////+AAAAAAAAAH/////4AAD///8AAA///////4AAAAAAAAA/////4AAA////AAAH///////gAAAAAAAAP////4AAAP///wAAAf//////8AAAAAAAAH////8AAAD///8AAAB///////wAAAAAAAD////8AAAA////AAAAP//////+AAAAAAAB////+AAAAP///wAAAA///////4AAAAAAB////+AAAAD///8AAAAH///////gAAAAAA////+AAAAA////AAAAAf//////8AAAAAA/////AAAAAP///wAAAAD///////wAAAAAf////AAAAAD///8AAAAAP//////+AAAAAP////gAAAAA////AAAAAA///////4AAAAH////gAAAAAP///wAAAAAH///////gAAAD////gAAAAAD///8AAAAAAf//////8AAAD////wAAAAAA////AAAAAAD///////wAAB////wAAAAAAP///wAAAAAAP//////+AAD////4AAAAAAD///8AAAAAAA///////wAB////4AAAAAAA////AAAAAAAH//////8AA////4AAAAAAAP///wAAAAAAAf//////AB////8AAAAAAAD///8AAAAAAAD//////wA////8AAAAAAAA////AAAAAAAAP/////8B////+AAAAAAAAP///wAAAAAAAA//////A////+AAAAAAAAD///8AAAAAAAAH/////wf///+AAAAAAAAA////AAAAAAAAAf////8P////AAAAAAAAAP///wAAAAAAAAD/////H////AAAAAAAAAD///8AAAAAAAAAP////3////gAAAAAAAAA////AAAAAAAAAA/////////gAAAAAAAAAP///wAAAAAAAAAH////////wAAAAAAAAAD///8AAAAAAAAAA////////4AAAAAAAAAA////AAAAAAAAAAH///8=', none: 'AAAAAAAAAAAAAAD///8AAAAAAAAAAAAAAAAAAAAAAAAAAAAA////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///wAAAAAAAAAAAAAAAAAAAAAAAAAAAAD///8AAAAAAAAAAAAAAAAAAAAAAAAAAAAA////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///wAAAAAAAAAAAAAAAAAAAAAAAAAAAAD///8AAAAAAAAAAAAAAAAAAAAAAAAAAAAA////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///wAAAAAAAAAAAAAAAAAAAAAAAAAAAAD///8AAAAAAAAAAAAAAAAAAAAAAAAAAAAA////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///wAAAAAAAAAAAAAAAAAAAAAAAAAAAAD///8AAAAAAAAAAAAAAAAAAAAAAAAAAAAA////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///wAAAAAAAAAAAAAAAAAAAAAAAAAAAAD///8AAAAAAAAAAAAAAAAAAAAAAAAAAAAA////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///wAAAAAAAAAAAAAAAAAAAAAAAAAAAAD///8AAAAAAAAAAAAAAAAAAAAAAAAAAAAA////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///wAAAAAAAAAAAAAAAAAAAAAAAAAAAAD///8AAAAAAAAAAAAAAAAAAAAAAAAAAAAA////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///wAAAAAAAAAAAAAAAAAAAAAAAAAAAAD///8AAAAAAAAAAAAAAAAAAAAAAAAAAAAA////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///wAAAAAAAAAAAAAAAAAAAAAAAAAAAAD///8AAAAAAAAAAAAAAAAAAAAAAAAAAAAA////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///wAAAAAAAAAAAAAAAAAAAAAAAAAAAAD///8AAAAAAAAAAAAAAAAAAAAAAAAAAAAA////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///wAAAAAAAAAAAAAAAAAAAAAAAAAAAAD///8AAAAAAAAAAAAAAAAAAAAAAAAAAAAA////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///wAAAAAAAAAAAAAAAAAAAAAAAAAAAAD///8AAAAAAAAAAAAAAAAAAAAAAAAAAAAA////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///wAAAAAAAAAAAAAAAAAAAAAAAAAAAAD///8AAAAAAAAAAAAAAAAAAAAAAAAAAAAA////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///wAAAAAAAAAAAAAAAAAAAAAAAAAAAAD///8AAAAAAAAAAAAAAAAAAAAAAAAAAAAA////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///wAAAAAAAAAAAAAAAAAAAAAAAAAAAAD///8AAAAAAAAAAAAAAAAAAAAAAAAAAAAA////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///wAAAAAAAAAAAAAAAAAAAAAAAAAAAAD///8AAAAAAAAAAAAAAAAAAAAAAAAAAAAA////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///wAAAAAAAAAAAAAA//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////8AAAAAAAAAAAAAAP///wAAAAAAAAAAAAAAAAAAAAAAAAAAAAD///8AAAAAAAAAAAAAAAAAAAAAAAAAAAAA////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///wAAAAAAAAAAAAAAAAAAAAAAAAAAAAD///8AAAAAAAAAAAAAAAAAAAAAAAAAAAAA////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///wAAAAAAAAAAAAAAAAAAAAAAAAAAAAD///8AAAAAAAAAAAAAAAAAAAAAAAAAAAAA////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///wAAAAAAAAAAAAAAAAAAAAAAAAAAAAD///8AAAAAAAAAAAAAAAAAAAAAAAAAAAAA////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///wAAAAAAAAAAAAAAAAAAAAAAAAAAAAD///8AAAAAAAAAAAAAAAAAAAAAAAAAAAAA////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///wAAAAAAAAAAAAAAAAAAAAAAAAAAAAD///8AAAAAAAAAAAAAAAAAAAAAAAAAAAAA////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///wAAAAAAAAAAAAAAAAAAAAAAAAAAAAD///8AAAAAAAAAAAAAAAAAAAAAAAAAAAAA////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///wAAAAAAAAAAAAAAAAAAAAAAAAAAAAD///8AAAAAAAAAAAAAAAAAAAAAAAAAAAAA////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///wAAAAAAAAAAAAAAAAAAAAAAAAAAAAD///8AAAAAAAAAAAAAAAAAAAAAAAAAAAAA////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///wAAAAAAAAAAAAAAAAAAAAAAAAAAAAD///8AAAAAAAAAAAAAAAAAAAAAAAAAAAAA////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///wAAAAAAAAAAAAAAAAAAAAAAAAAAAAD///8AAAAAAAAAAAAAAAAAAAAAAAAAAAAA////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///wAAAAAAAAAAAAAAAAAAAAAAAAAAAAD///8AAAAAAAAAAAAAAAAAAAAAAAAAAAAA////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///wAAAAAAAAAAAAAAAAAAAAAAAAAAAAD///8AAAAAAAAAAAAAAAAAAAAAAAAAAAAA////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///wAAAAAAAAAAAAAAAAAAAAAAAAAAAAD///8AAAAAAAAAAAAAAAAAAAAAAAAAAAAA////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///wAAAAAAAAAAAAAAAAAAAAAAAAAAAAD///8AAAAAAAAAAAAAAAAAAAAAAAAAAAAA////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///wAAAAAAAAAAAAAAAAAAAAAAAAAAAAD///8AAAAAAAAAAAAAAAAAAAAAAAAAAAAA////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///wAAAAAAAAAAAAAAAAAAAAAAAAAAAAD///8AAAAAAAAAAAAAAAAAAAAAAAAAAAAA////AAAAAAAAAAAAAAA=' }, elaris: { all: '//AAAAAAAAAAAAAD/8AAAAAAAAAAAAAP///4AAAAAAAAAAAAA//AAAAAAAAAAAAAH////AAAAAAAAAAAAAP/wAAAAAAAAAAAAD////4AAAAAAAAAAAAD/8AAAAAAAAAAAAB/////wAAAAAAAAAAAA//AAAAAAAAAAAAB/////+AAAAAAAAAAAAP/wAAAAAAAAAAAB//////4AAAAAAAAAAAD/8AAAAAAAAAAAB///////AAAAAAAAAAAA//AAAAAAAAAAAA///5///+AAAAAAAAAAAP/wAAAAAAAAAAAf//8P///wAAAAAAAAAAD/8AAAAAAAAAAA///+A////AAAAAAAAAAA//AAAAAAAAAAAf//zAD///8AAAAAAAAAAP/wAAAAAAAAAAP//wAAP///wAAAAAAAAAD/8AAAAAAAAAAH//4AAAn///AAAAAAAAAA//AAAAAAAAAAD//4AAAAf//4AAAAAAAAAP/wAAAAAAAAAH//4AAAAD///AAAAAAAAAD/8AAAAAAAAAH//8AAAAAH//8AAAAAAAAA//AAAAAAAAAD//8AAAAAAf//gAAAAAAAAP/wAAAAAAAAB//8AAAAAAD///AAAAAAAAD/8AAAAAAAAB//8AAAAAAAf//4AAAAAAAA//AAAAAAAAA//+AAAAAAAD///gAAAAAAAP/wAAAAAAAAf//AAAAAAAAf//8AAAAAAAD/8AAAAAAAAP//gAAAAAAAD///wAAAAAAA//AAAAAAAAf//QAAAAAAAAf///AAAAAAAP/wAAAAAAB///AAAAAAAAADf//8AAAAAAD/8AAAAAAB///gAAAAAAAAAD///gAAAAAA//AAAAAAA///AAAAAAAAAAAP//8AAAAAAP/wAAAAAAf//gAAAAAAAAAAA///gAAAAAD/8AAAAAAf//wAAAAAAAAAAAD///AAAAAA//AAAAAA///gAAAAAAAAAAAAP//4AAAAAP/wAAAAAf//wAAAAAAAAAAAAB///gAAAAD/8AAAAAP//4AAAAAAAAAAAAAP///AAAAA//AAAAAf//8AAAAAAAAAAAAAB///4AAAAP/wAAAAP//+AAAAAAAAAAAAAAP///EAAAD/8AAAAH///AAAAAAAAAAAAAAB////gAAA//AAAAH///wAAAAAAAAAAAAAAB///8AAAP/4AAAP///8AAAAAAAAAAAAAAAH///wAAD//AAAP///+AAAAAAAAAAAAAAAAf//+AAA//wAAH////AAAAAAAAAAAAAAAAB///wAAP/4AAH////wAAAAAAAAAAAAAAAAH//+AAD/+AAH////+AAAAAAAAAAAAAAAAAP//wAA//AAD/////AAAAAAAAAAAAAAAAAB///AAP/wAB/////gAAAAAAAAAAAAAAAAAP//8AD/8AD/////wAAAAAAAAAAAAAAAAAB///wA//AB///z/4AAAAAAAAAAAAAAAAAAH//+Af/4A///wf8AAAAAAAAAAAAAAAAAAA///4P//A///wD+AAAAAAAAAAAAAAAAAAAH///H//4///4AfAAAAAAAAAAAAAAAAAAAA///////f//4ADgAAAAAAAAAAAAAAAAAAAH/////////8AAAAAAAAAAAAAAAAAAAAAAA/////////+AAAAAAAAAAAAAAAAAAAAAAAH/////////AAAAAAAAAAAAAAAAAAAAAAAA/////////gAAAAAAAAAAAAAAAAAAAAAAAP////////4AAAAAAAAAAAAAAAAAAAAAAAH/////////AAAAAAAAAAAAAAAAAAAAAAAD/////////4AAAAAAAAAAAAAAAAAAAAAAB//////////AAAAAAAAAAAD/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////AAAAAAAAA0AB/////////8CgAAAAAAAAAAAAAAAAAAAAAP////////+AAAAAAAAAAAAAAAAAAAAAAAB/////////AAAAAAAAAAAAAAAAAAAAAAAAP////////gAAAAAAAAAAAAAAAAAAAAAAAB////////wAAAAAAAAAAAAAAAAAAAAAAAAf///////+AAAAAAAAAAAAAAAAAAAAAAAAP////////wAAAAAAAAAAAAAAAAAAAAAAAH////////+AAAAAAAAAAAAAAAAAAAAAAAD/////////wAAAAAAAAAAAAAAAAAAAAAAH/////////+AAAAAAAAAAAAAAAAAAAAAAH///v//////wAAAAAAAAAAAAAAAAAAAAAH///x///j//+AAAAAAAAAAAAAAAAAAAAAD///wP//wf//8AAAAAAAAAAAAAAAAAAAAB///gB//4B///gAAAAAAAAAAAAAAAAAAAA///wAP/8AP//+AAAAAAAAAAAAAAAAAAAA///4AD//AAf//4AAAAAAAAAAAAAAAAAAA///8AA//4AD///gAAAAAAAAAAAAAAAAABf//+AAP/8AAf//+AAAAAAAAAAAAAAAAAB///8AAD/+AAB///wAAAAAAAAAAAAAAAAA///+AAA//AAAP//+AAAAAAAAAAAAAAAAAf//+AAAP/wAAAf//wAAAAAAAAAAAAAAAAP///AAAD/8AAAD///AAAAAAAAAAAAAAAAP//8gAAA//AAAAP//4AAB4AAAAAAAAAAAH//+AAAAP/wAAAA///gAA/gAAAAAAAAAAH///AAAAD/8AAAAH//8AAf8AAAAAAAAAAD///gAAAA//AAAAAf//wAP/gAAAAAAAAAD//+QAAAAP/wAAAAD///AH/wAAAAAAAAAH//+AAAAAD/8AAAAAH//8D/4AAAAAAAAAP//+AAAAAA//AAAAAA///h/8AAAAAAAAAH//+AAAAAAP/wAAAAAH/////AAAAAAAAAD///AAAAAAD/8AAAAAAf////wAAAAAAAAD///gAAAAAA//AAAAAAD////4AAAAAAAAB///gAAAAAAP/wAAAAAAf///8AAAAAAAAB///wAAAAAAD/8AAAAAAD///+AAAAAAAAB///wAAAAAAA//AAAAAAAf///wAAAAAAAB///gAAAAAAAP/wAAAAAAD///+AAAAAAAA///gAAAAAAAD/8AAAAAAAc///wAAAAAAA///wAAAAAAAA//AAAAAAAAH//+AAAAAAAf//4AAAAAAAAP/wAAAAAAAA///4AAAAAAP//8AAAAAAAAD/8AAAAAAAAH///AAAAAAH//+AAAAAAAAA//AAAAAAAAA///4AAAAAD///AAAAAAAAAP/wAAAAAAAAH///AAAAAH///gAAAAAAAAD/8AAAAAAAAA///4AAAAH///wAAAAAAAAA//AAAAAAAAAD///wAAAH//+YAAAAAAAAAP/wAAAAAAAAAP///AAAH//+AAAAAAAAAAD/8AAAAAAAAAB///8AAD//+AAAAAAAAAAA//AAAAAAAAAAJ///wAB///AAAAAAAAAAAP/wAAAAAAAAAAH///AD///gAAAAAAAAAAD/8AAAAAAAAAAAf//8B///wAAAAAAAAAAA//AAAAAAAAAAAB///g///4AAAAAAAAAAAP/wAAAAAAAAAAAH//+f//8AAAAAAAAAAAD/8AAAAAAAAAAAAP//////AAAAAAAAAAAA//AAAAAAAAAAAAB//////wAAAAAAAAAAAP/wAAAAAAAAAAAAP/////4AAAAAAAAAAAD/8AAAAAAAAAAAAB/////8AAAAAAAAAAAA//AAAAAAAAAAAAAP/8=', none: 'AAAAAAAAAAAAAAAD/8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB//gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB//+AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA///wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAf//+AAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///wAAAAAAAAAAAAAAAAAAAAAAAAAAAAH///+AAAAAAAAAAAAAAAAAAAAAAAAAAAAB////gAAAAAAAAAAAAAD/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////AAAAAAAAAAAAAAH////AAAAAAAAAAAAAAAAAAAAAAAAAAAAB////gAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///wAAAAAAAAAAAAAAAAAAAAAAAAAAAAB///4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAP//8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAB//+AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//AAAAAAAAAAAAAAAA=' } };
const DIAG_QUAD = {
  city: { nw: [0, 0, 370, 222], ne: [428, 0, 800, 222], sw: [0, 278, 370, 500], se: [428, 278, 800, 500] },
  elaris: { nw: [0, 0, 378, 226], ne: [422, 0, 800, 226], sw: [0, 270, 378, 500], se: [422, 270, 800, 500] },
};
const diagMasks = {};
function diagMask(region, which) {
  const k = region + ':' + which; if (diagMasks[k]) return diagMasks[k];
  const abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/', src = DIAG_MASK_SRC[region][which].replace(/=+$/, '');
  const bits = new Uint8Array(200 * 125);
  for (let i = 0; i < bits.length; i++) bits[i] = (abc.indexOf(src[Math.floor(i / 6)]) >> (5 - i % 6)) & 1; // base64 is 6 bits per char
  return diagMasks[k] = bits;
}
function diagMaskWalk(key, x, y) {
  const fx = Math.max(0, Math.min(799, x)), fy = Math.max(0, Math.min(499, y + 22));
  const open = diagonalExits(key).find(d => { const [l, t, r, b] = DIAG_QUAD[activeRegion][d]; return fx >= l && fx < r && fy >= t && fy < b; });
  return diagMask(activeRegion, open ? 'all' : 'none')[(fy >> 2) * 200 + (fx >> 2)] === 1;
}
function usesDiagMask(key) { return !!DIAG_MASK_SRC[activeRegion] && isDiagonalRoom(key); }
// In the painted rooms the traced paths already are the walkable area, so the
// usual body-width margin is dropped there (the jungle paths are only ~45px wide).
const walkableBeforeDiag = walkable;
walkable = function (key, x, y, margin) {
  if (usesDiagMask(key)) return x >= 0 && x <= 800 && y >= 0 && y <= 500 && !NeonCity.blocked(key, x, y);
  return walkableBeforeDiag(key, x, y, margin);
};
// The painted diagonal roads: from each corner to the main east-west street.
const DIAG_SEG = { nw: [0, 0, 140, 250], ne: [800, 0, 660, 250], sw: [0, 500, 140, 250], se: [800, 500, 660, 250] };
// Where you appear after walking in from that corner.
const DIAG_ARRIVE = { nw: { x: 35, y: 43 }, ne: { x: 765, y: 43 }, sw: { x: 35, y: 418 }, se: { x: 765, y: 418 } };
const DIAG_BAND = 38;

function diagonalExits(key) { const r = rooms[key]; return r && r.exits ? Object.keys(DIAG_DIRS).filter(d => r.exits[d]) : []; }
function isDiagonalRoom(key) { return !!DIAG_ART[activeRegion] && diagonalExits(key).length > 0; }
function addDiagonalShortcuts() {
  if (!DIAG_ART[activeRegion]) return 0;
  // joinedArea is a global function from combined-rooms.js (a function lookup,
  // not a `const`, so it resolves even if this ran before that file loaded).
  const joinedFn = globalThis.joinedArea;
  const joined = { has: k => typeof joinedFn === 'function' && joinedFn(k).cells.length > 1 };
  const linked = (a, b) => !!rooms[a] && Object.values(rooms[a].exits).some(e => e === b); // plain (unlocked) exits only
  const boss = k => { const r = rooms[k]; return (r.enemy && enemies[r.enemy[0]] && enemies[r.enemy[0]].boss) || (activeRegion === 'elaris' && k === '10,9'); };
  let added = 0;
  for (const [k, r] of Object.entries(rooms)) {
    const [x, y] = k.split(',').map(Number);
    for (const [dir, [dx, dy]] of Object.entries(DIAG_DIRS)) {
      const c = (x + dx) + ',' + (y + dy); if (!rooms[c] || r.exits[dir]) continue;
      if (joined.has(k) || joined.has(c) || boss(k) || boss(c)) continue;
      const b1 = (x + dx) + ',' + y, b2 = x + ',' + (y + dy);
      if ((linked(k, b1) && linked(b1, c)) || (linked(k, b2) && linked(b2, c))) { r.exits[dir] = c; rooms[c].exits[DIAG_OPP[dir]] = k; added++; }
    }
  }
  return added;
}
const configureRegionBeforeDiag = configureRegion;
configureRegion = function (region) { configureRegionBeforeDiag(region); addDiagonalShortcuts(); };

// --- Walking: the diagonal roads are open ground ---
function distToSeg(px, py, [x1, y1, x2, y2]) {
  const vx = x2 - x1, vy = y2 - y1, t = Math.max(0, Math.min(1, ((px - x1) * vx + (py - y1) * vy) / (vx * vx + vy * vy)));
  return Math.hypot(px - (x1 + t * vx), py - (y1 + t * vy));
}
function onDiagonalRoad(key, x, y) { return !usesDiagMask(key) && isDiagonalRoom(key) && diagonalExits(key).some(d => distToSeg(x, y + 20, DIAG_SEG[d]) < DIAG_BAND); }
const blockedBeforeDiag = NeonCity.blocked;
NeonCity.blocked = function (key, x, y) {
  if (usesDiagMask(key)) return !diagMaskWalk(key, x, y); // the painting decides: road and sidewalk only
  if (onDiagonalRoad(key, x, y)) return false; return blockedBeforeDiag(key, x, y);
};

// --- Leaving through a corner ---
// Painted roads don't always meet the exact corner pixel, so reaching the room
// edge anywhere near an open corner counts as going through it.
function diagCornerAt(key, p) {
  const ex = rooms[key] && rooms[key].exits; if (!ex) return null;
  const L = p.x <= 16, R = p.x >= 784, T = p.y <= 16, B = p.y >= 484;
  const zones = { nw: (L && p.y <= 120) || (T && p.x <= 160), ne: (R && p.y <= 120) || (T && p.x >= 640), sw: (L && p.y >= 380) || (B && p.x <= 160), se: (R && p.y >= 380) || (B && p.x >= 640) };
  return Object.keys(zones).find(d => zones[d] && ex[d]) || null;
}
const moveBeforeDiag = move;
move = function (dt) {
  moveBeforeDiag(dt);
  if (!state || state.battle || !rooms[state.room]) return;
  const corner = diagCornerAt(state.room, state.pos);
  if (corner) transition(corner);
};
// Arrive a short walk in from the corner, on the painted diagonal road.
function diagArrival(key, corner) {
  if (!usesDiagMask(key)) return { ...DIAG_ARRIVE[corner] };
  const [cx, cy] = { nw: [0, 0], ne: [800, 0], sw: [0, 500], se: [800, 500] }[corner], len = Math.hypot(400 - cx, 250 - cy);
  for (let d = 70; d < 300; d += 5) {
    const fx = cx + (400 - cx) * d / len, fy = cy + (250 - cy) * d / len, x = Math.round(fx), y = Math.round(fy - 22);
    if (x > 24 && x < 776 && y > 24 && y < 476 && walkable(key, x, y, 8)) return { x, y }; // clear of the corner trigger zones
  }
  return { x: 400, y: 280 };
}
const transitionBeforeDiag = transition;
transition = function (dir) {
  if (!DIAG_DIRS[dir]) return transitionBeforeDiag(dir);
  const ok = transitionBeforeDiag(dir);
  if (ok) { state.pos = diagArrival(state.room, DIAG_OPP[dir]); save(); renderWorld(); }
  return ok;
};

// --- Drawing: 8-way art and corner labels ---
const diagArt = {};
function diagImage(region) { if (!diagArt[region]) { const img = new Image(); img.src = DIAG_ART[region]; diagArt[region] = img; } return diagArt[region]; }
// (No preloading: each room loads only its own painting.)
const renderBeforeDiag = NeonCity.render;
NeonCity.render = function (container, key, r) {
  const out = renderBeforeDiag.apply(this, arguments);
  if (!container || !container.querySelector || !isDiagonalRoom(key)) return out;
  const ground = container.querySelector('.city-ground');
  const art = document.createElement('div'); art.className = 'diag-ground'; art.style.backgroundImage = 'url(' + diagArtFor(key) + ')';
  if (ground && ground.after) ground.after(art); else container.prepend(art);
  for (const dir of diagonalExits(key)) {
    const arrow = '↗↖↘↙'['ne nw se sw'.split(' ').indexOf(dir)], existing = container.querySelector('.city-exit.' + dir);
    if (existing) { if (!String(existing.textContent || '').startsWith(arrow)) existing.textContent = arrow + ' ' + existing.textContent; continue; }
    const raw = r.exits[dir], to = typeof raw === 'string' ? raw : raw.to, node = document.createElement('div');
    node.className = 'city-exit diag ' + dir; node.textContent = '↗↖↘↙'['ne nw se sw'.split(' ').indexOf(dir)] + ' ' + (rooms[to] ? rooms[to].name : '');
    container.append(node);
  }
  container.querySelectorAll('.city-exit.ne,.city-exit.nw,.city-exit.se,.city-exit.sw').forEach(n => n.classList.add('diag'));
  return out;
};
// Tapping/clicking a corner label walks you there (touch-controls handles the rest).
if (typeof document !== 'undefined' && document.getElementById) {
  const world = document.getElementById('world');
  if (world && world.addEventListener) world.addEventListener('click', e => {
    const label = e.target && e.target.closest && e.target.closest('.city-exit.diag'); if (!label || !state || state.battle) return;
    const dir = Object.keys(DIAG_DIRS).find(d => label.classList.contains(d)); if (!dir) return;
    e.stopPropagation(); e.preventDefault();
    const corner = { nw: { x: 14, y: 14 }, ne: { x: 786, y: 14 }, sw: { x: 14, y: 470 }, se: { x: 786, y: 470 } }[dir];
    if (typeof setTouchDestination === 'function') { const area = joinedArea(), o = cellOffset(state.room, area); setTouchDestination({ x: o.x + corner.x, y: o.y + corner.y }, { dir, key: state.room }); }
  }, true);
}
const diagStyles = document.createElement('style');
diagStyles.textContent = '.diag-ground{position:absolute;left:0;top:0;width:800px;height:500px;background-size:800px 500px;background-repeat:no-repeat;image-rendering:auto;pointer-events:none}'
  + '.city-exit.ne{right:4px;top:46px}.city-exit.nw{left:4px;top:156px}.city-exit.se{right:4px;bottom:6px}.city-exit.sw{left:4px;bottom:6px}'
  + '.city-exit.diag{border-color:#ffd27a;color:#ffe7b0;box-shadow:0 0 12px #ffd27a55;cursor:pointer}';
document.head.append(diagStyles);
// The painted roundabout rooms have narrower streets than the generated city
// blocks, so a hidden chest whose usual spot is now inside a building moves to
// the nearest open pavement instead.
const chestForBeforeDiag = chestFor;
chestFor = function (key) {
  const c = chestForBeforeDiag(key); if (!c || !usesDiagMask(key) || walkable(key, c.x, c.y, 8)) return c;
  const spot = [[330, 180], [470, 180], [300, 245], [500, 245], [400, 150]].find(([x, y]) => walkable(key, x, y, 8));
  return spot ? { ...c, x: spot[0], y: spot[1] } : c;
};
