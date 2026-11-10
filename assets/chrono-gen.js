'use strict';
// =====================================================================
// Round 377 (owner: "procedurally generate the Chronospire on the fly with the bare minimum of assets", a new layout
// once per journey). The room graph, names, levels and roles stay as tools/build_tile_world.py wrote them
// (TILE_WORLD_DATA.chronospire.layout); what is generated from the journey's seed (state.seed) is the inside of every
// room: its roads, squares, sand drifts and buildings.
//   - Each 800x500 room is a 16x10 grid of 50px cells. A road two cells wide runs from each door to a hub; the door on a
//     shared edge sits at the same cells in both rooms. Two 3x3 squares open beside the roads (TILE_WORLD_DATA
//     .chronospire.plazas, where objects stand); boss rooms get an arena and dead ends a court.
//   - The walk mask (tileWorldBits.chronospire, 8px cells) is filled from the grids, so the organic engine, doors,
//     patrols, item placement and the map all work on it as on a painted world.
//   - paintChronoRoom() draws the room: three seamless textures (floor, ground, sand) and sixteen keyed props
//     (assets/environment/chronospire/gen/, made by tools/prepare_chrono_gen.py). The shapes are drawn the dual-grid
//     way (every corner between four cells rounded by its neighbours), with a kerb and a drop shadow.
// A change of seed (a new journey, a loaded or imported save) rebuilds everything and drops the Chronospire entries of
// the caches that do not carry the seed (chronoFlushCaches).
// =====================================================================
const CHRONO_GEN_VERSION = 1, CHRONO_ART_VERSION = '377';
const CG_COLS = 16, CG_ROWS = 10, CG_CELL = 50;
// name: [width, height] of the keyed picture (px), drawn at CHRONO_PROP_SCALE of that in room pixels.
const CHRONO_BUILDINGS = { 'clock-tower': [176, 420], observatory: [341, 420], 'bell-tower': [221, 420], spire: [135, 420], workshop: [383, 420], townhouse: [299, 420], foundry: [368, 420], ruin: [390, 420], hourglass: [343, 420], arch: [304, 420], engine: [420, 368], pavilion: [294, 420] };
const CHRONO_SMALL = { gears: [220, 187], pendulum: [168, 220], crystals: [181, 220], bell: [220, 186] };
const CHRONO_PROP_SCALE = { building: 0.4, small: 0.3 };

function chronoHash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function chronoRng(str) { let a = chronoHash(str) || 1; return function () { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function chronoSeed() { return typeof state !== 'undefined' && state && state.seed != null ? String(state.seed) : 'aethercede'; }

// The first of the two cells a door takes on its edge: rows 3-5 on a side wall, columns 5-10 on the top or bottom
// (clear of the HUD panel in the top-left corner and the minimap in the bottom-right).
function chronoDoorCell(seed, key, dir) {
  const to = TILE_WORLD_DATA.chronospire.layout[key].exits[dir], pair = [key, to].sort().join('|');
  const r = chronoRng(seed + ':door:' + pair)();
  return dir === 'e' || dir === 'w' ? 3 + Math.floor(r * 3) : 5 + Math.floor(r * 6);
}
function chronoLandingRooms() {
  const out = [TILE_WORLD_DATA.chronospire.roles.start], nx = typeof NEXUS_POINTS !== 'undefined' && NEXUS_POINTS.chronospire;
  if (nx) for (const k of [nx.start, nx.mid, nx.arrival]) if (k && !out.includes(k)) out.push(k);
  return out;
}
// One room's grids: floor (walkable), sand, its hub and squares. Props are added when the room is first painted.
function chronoRoomPlan(seed, key) {
  const lay = TILE_WORLD_DATA.chronospire.layout[key], roles = TILE_WORLD_DATA.chronospire.roles, rnd = chronoRng(seed + ':room:' + key);
  const floor = new Uint8Array(CG_COLS * CG_ROWS), sand = new Uint8Array(CG_COLS * CG_ROWS);
  const carve = (x0, y0, x1, y1) => { for (let y = Math.max(0, Math.min(y0, y1)); y <= Math.min(CG_ROWS - 1, Math.max(y0, y1)); y++) for (let x = Math.max(0, Math.min(x0, x1)); x <= Math.min(CG_COLS - 1, Math.max(x0, x1)); x++) floor[y * CG_COLS + x] = 1; };
  const at = (x, y) => x >= 0 && y >= 0 && x < CG_COLS && y < CG_ROWS && floor[y * CG_COLS + x] === 1;
  // The hub's top-left cell (2x2). Rooms the game drops you into at the room's middle (the world's first room and the
  // Nexus Waypoint rooms) have their hub there, with a court around it.
  const landing = chronoLandingRooms().includes(key);
  const hx = landing ? 7 : 5 + Math.floor(rnd() * 5), hy = landing ? 5 : 3 + Math.floor(rnd() * 3);
  carve(hx, hy, hx + 1, hy + 1); if (landing) carve(hx - 1, hy - 1, hx + 2, hy + 2);
  const dirs = Object.keys(lay.exits).filter(d => d.length === 1).sort();
  for (const d of dirs) {
    const c = chronoDoorCell(seed, key, d), bend = rnd() < 0.45;
    if (d === 'w' || d === 'e') {
      const edge = d === 'w' ? 0 : CG_COLS - 1;
      // Straight in to the hub's columns then along them, or with a bend at a column in between.
      const mx = bend ? (d === 'w' ? 2 + Math.floor(rnd() * Math.max(1, hx - 3)) : hx + 3 + Math.floor(rnd() * Math.max(1, CG_COLS - 4 - (hx + 3)))) : hx;
      const col = Math.max(1, Math.min(CG_COLS - 3, mx));
      carve(edge, c, col + (d === 'w' ? 1 : 0), c + 1); carve(col, c, col + 1, hy + 1); carve(col, c < hy ? hy : hy, col + 1, hy + 1); carve(col, hy, hx + 1, hy + 1);
    } else {
      const edge = d === 'n' ? 0 : CG_ROWS - 1;
      const my = bend ? (d === 'n' ? 1 + Math.floor(rnd() * Math.max(1, hy - 1)) : hy + 2 + Math.floor(rnd() * Math.max(1, CG_ROWS - 3 - (hy + 2)))) : hy;
      const row = Math.max(1, Math.min(CG_ROWS - 3, my));
      carve(c, edge, c + 1, row + (d === 'n' ? 1 : 0)); carve(c, row, hx + 1, row + 1); carve(hx, row, hx + 1, hy + 1);
    }
  }
  const boss = key === roles.boss || key === roles.mini1 || key === roles.mini2;
  if (boss) carve(Math.max(1, hx - 2), Math.max(1, hy - 1), Math.min(CG_COLS - 2, hx + 3), Math.min(CG_ROWS - 2, hy + 2)); // an arena
  else if (dirs.length === 1) carve(hx - 1, hy - 1, hx + 2, hy + 2); // a dead end's court
  // Squares: 3x3 blocks of open ground with one side on a road, one cell in from the room's edge.
  const plazas = [];
  // Strict first (exactly one side on a road), then any block that touches a road, so every room has somewhere to stand an object.
  for (const loose of [false, true, 'any']) { // 'any': a crowded room widens a road into its square
    if (plazas.length >= (loose === 'any' ? 1 : 2)) break;
    const cand = [];
    for (let py = 1; py + 2 <= CG_ROWS - 2; py++) for (let px = 1; px + 2 <= CG_COLS - 2; px++) {
      let clear = true; for (let y = py; y <= py + 2 && clear; y++) for (let x = px; x <= px + 2; x++) if (at(x, y)) { clear = false; break; }
      let over = 0; if (loose === 'any') { for (let y = py; y <= py + 2; y++) for (let x = px; x <= px + 2; x++) if (at(x, y)) over++; if (over > 4) continue; } else if (!clear) continue;
      const sides = [[0, -1], [0, 3], [-1, 0], [3, 0]].map(([dx, dy], i) => { let n = 0; for (let k = 0; k < 3; k++) if (i < 2 ? at(px + k, py + dy) : at(px + dx, py + k)) n++; return n; });
      const total = sides.reduce((a, b) => a + b, 0);
      if (loose === 'any' ? total + over < 1 : loose ? total < 1 : (sides.filter(n => n >= 2).length !== 1 || total > 4)) continue;
      const x = (px + 1.5) * CG_CELL, y = (py + 1.5) * CG_CELL - 22; // the spot whose foot point is the square's centre
      cand.push({ px, py, x, y, s: rnd() + over * 3 + (typeof screenCovered === 'function' && screenCovered(x, y) ? 2 : 0) });
    }
    cand.sort((a, b) => a.s - b.s);
    for (const gap of [5, 4]) for (const c of cand) { // well apart first, then a cell's gap between them
      if (plazas.length >= 2) break;
      if (plazas.some(p => Math.abs(p.px - c.px) < gap && Math.abs(p.py - c.py) < gap)) continue;
      plazas.push(c);
    }
  }
  for (const p of plazas) carve(p.px, p.py, p.px + 2, p.py + 2);
  // Sand drifts: up to two blobs of open ground, a cell clear of every road and of the room's edge.
  const free = (x, y) => { if (x < 1 || y < 1 || x > CG_COLS - 2 || y > CG_ROWS - 2) return false; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (at(x + dx, y + dy)) return false; return true; };
  for (let b = 0, blobs = Math.floor(rnd() * 3); b < blobs; b++) {
    const open = []; for (let y = 1; y < CG_ROWS - 1; y++) for (let x = 1; x < CG_COLS - 1; x++) if (free(x, y) && !sand[y * CG_COLS + x]) open.push([x, y]);
    if (!open.length) break;
    const cells = [open[Math.floor(rnd() * open.length)]], want = 4 + Math.floor(rnd() * 9);
    sand[cells[0][1] * CG_COLS + cells[0][0]] = 1;
    for (let tries = 0; cells.length < want && tries < 80; tries++) {
      const [x, y] = cells[Math.floor(rnd() * cells.length)], [dx, dy] = [[1, 0], [-1, 0], [0, 1], [0, -1]][Math.floor(rnd() * 4)];
      if (free(x + dx, y + dy) && !sand[(y + dy) * CG_COLS + x + dx]) { sand[(y + dy) * CG_COLS + x + dx] = 1; cells.push([x + dx, y + dy]); }
    }
  }
  return { key, floor, sand, hub: [(hx + 1) * CG_CELL, (hy + 1) * CG_CELL - 22], plazas: plazas.map(p => [p.x, p.y]), props: null };
}
// Buildings and small props on the open ground: the whole picture clear of roads, squares and each other.
function chronoRoomProps(seed, plan) {
  if (plan.props) return plan.props;
  const rnd = chronoRng(seed + ':props:' + plan.key), out = [];
  const blocked = (x0, y0, x1, y1, grid) => { for (let cy = Math.max(0, Math.floor(y0 / CG_CELL)); cy <= Math.min(CG_ROWS - 1, Math.floor(y1 / CG_CELL)); cy++) for (let cx = Math.max(0, Math.floor(x0 / CG_CELL)); cx <= Math.min(CG_COLS - 1, Math.floor(x1 / CG_CELL)); cx++) if (grid[cy * CG_COLS + cx]) return true; return false; };
  const place = (table, kind, want, tries) => {
    const names = Object.keys(table); let made = 0;
    for (let t = 0; t < tries && made < want; t++) {
      const name = names[Math.floor(rnd() * names.length)], [iw, ih] = table[name], w = iw * CHRONO_PROP_SCALE[kind], h = ih * CHRONO_PROP_SCALE[kind];
      const x = w / 2 + 6 + rnd() * (800 - w - 12), y = h + 6 + rnd() * (500 - h - 12);
      const box = [x - w / 2 + 6, y - h + 8, x + w / 2 - 6, y - 2];
      if (blocked(box[0], box[1], box[2], box[3], plan.floor)) continue;
      if (kind === 'small' && blocked(box[0], box[1], box[2], box[3], plan.sand) && rnd() < 0.6) continue; // few things lie on the sand
      if (out.some(p => name === p.name && Math.hypot(p.x - x, p.y - y) < (kind === 'small' ? 380 : 300))) continue; // the same building twice only far apart
      if (out.some(p => box[0] < p.box[2] - 8 && box[2] > p.box[0] + 8 && box[1] < p.box[3] - 8 && box[3] > p.box[1] + 8)) continue;
      out.push({ name, kind, x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h), box }); made++;
    }
  };
  place(CHRONO_BUILDINGS, 'building', 9, 400); place(CHRONO_SMALL, 'small', 4, 40);
  out.sort((a, b) => a.y - b.y);
  return plan.props = out;
}

// --- The world for the current seed ---
let chronoSeedNow = null, chronoPlans = {}, chronoPlazaTable = {};
function chronoFlushCaches() {
  const mine = k => typeof k === 'string' && k.indexOf('chronospire') >= 0;
  const drop = o => { if (o && typeof o === 'object') for (const k of Object.keys(o)) if (mine(k)) delete o[k]; };
  // Every cache keyed by world and room that does not also carry the journey's seed, and the seeded ones for good measure.
  if (typeof organicDoorCache !== 'undefined') { drop(organicDoorCache); drop(organicDoorsCache); }
  if (typeof organicPoints !== 'undefined') { drop(organicPoints); drop(organicMains); drop(organicReach); drop(organicItemCache); }
  if (typeof plazaFitCache !== 'undefined') drop(plazaFitCache);
  if (typeof cardsmithCache !== 'undefined') drop(cardsmithCache);
  if (typeof relaySpotCache !== 'undefined') drop(relaySpotCache);
  if (typeof itemSpotCache !== 'undefined') drop(itemSpotCache);
  if (typeof spotCache !== 'undefined') { drop(spotCache); drop(poiCache); }
  if (typeof itemPadCache !== 'undefined') drop(itemPadCache);
  if (typeof spawnCatalog !== 'undefined') { drop(spawnCatalog); drop(patrolCatalog); }
  if (typeof mapTileCache !== 'undefined') { drop(mapTileCache); drop(mapPatchCache); drop(mapSeamCache); drop(mapRoadCache); drop(mapRoadRawCache); drop(mapRoadAlignCache); }
  if (typeof minimapTerrainKey !== 'undefined') minimapTerrainKey = '';
  if (typeof touchGridCache !== 'undefined') for (const k of [...touchGridCache.keys()]) if (mine(k)) touchGridCache.delete(k);
}
function chronoBuild(seed) {
  const d = TILE_WORLD_DATA.chronospire, w = d.world;
  chronoPlans = {}; chronoPlazaTable = {};
  for (const key of Object.keys(d.layout)) { const p = chronoPlans[key] = chronoRoomPlan(seed, key); if (p.plazas.length) chronoPlazaTable[key] = p.plazas; }
  const bits = new Uint8Array(w.maskW * w.maskH);
  for (let my = 0; my < w.maskH; my++) {
    const wy = my * w.cell + w.cell / 2, cy = Math.floor(wy / 500), gy = Math.floor((wy - cy * 500) / CG_CELL);
    for (let mx = 0; mx < w.maskW; mx++) {
      const wx = mx * w.cell + w.cell / 2, cx = Math.floor(wx / 800), p = chronoPlans[cx + ',' + cy];
      if (p && p.floor[gy * CG_COLS + Math.floor((wx - cx * 800) / CG_CELL)]) bits[my * w.maskW + mx] = 1;
    }
  }
  tileWorldBits.chronospire = bits; chronoSeedNow = seed + '|' + chronoLandingRooms().join(';');
  chronoFlushCaches();
}
// Built on first use (after every script has loaded) and again whenever the seed, or the set of landing rooms, changes.
function chronoEnsure() { const s = chronoSeed(); if (s + '|' + chronoLandingRooms().join(';') !== chronoSeedNow) chronoBuild(s); }
function chronoPlan(key) { chronoEnsure(); return chronoPlans[key] || null; }

Object.defineProperty(TILE_WORLD_DATA.chronospire, 'plazas', { get() { chronoEnsure(); return chronoPlazaTable; }, enumerable: true, configurable: true });
// Everything that reads the Chronospire's ground goes through one of these; each checks the seed first.
{
  const walkBefore = tileWorldWalk;
  tileWorldWalk = function (id) { if (id === 'chronospire') chronoEnsure(); return walkBefore.apply(this, arguments); };
  if (typeof organicDef === 'function') { const defBefore = organicDef; organicDef = function () { if (activeRegion === 'chronospire') chronoEnsure(); return defBefore.apply(this, arguments); }; }
  const configureBefore = configureRegion;
  configureRegion = function () { chronoEnsure(); const out = configureBefore.apply(this, arguments); chronoEnsure(); return out; };
  const newGameBeforeChrono = newGame;
  newGame = function () { const out = newGameBeforeChrono.apply(this, arguments); chronoEnsure(); return out; };
  // A save made on an older layout (the stand-in tiles, or an earlier generator) resumes at its room's hub.
  const restoreBeforeChrono = restoreGame;
  restoreGame = function (s) {
    if (s && s.region === 'chronospire' && s.chronoGen !== CHRONO_GEN_VERSION && TILE_WORLD_DATA.chronospire.layout[s.room]) {
      const p = chronoRoomPlan(s.seed != null ? String(s.seed) : 'aethercede', s.room); s.pos = { x: p.hub[0], y: p.hub[1] };
    }
    if (s) s.chronoGen = CHRONO_GEN_VERSION;
    const out = restoreBeforeChrono.apply(this, arguments); chronoEnsure(); return out;
  };
  // Wherever a fall-back position (the room's middle) lands off the roads, stand at the room's hub instead.
  const renderBeforeChrono = renderWorld;
  renderWorld = function () {
    if (state && activeRegion === 'chronospire' && !state.battle && state.pos && !walkable(state.room, state.pos.x, state.pos.y)) { const p = chronoPlan(state.room); if (p) state.pos = { x: p.hub[0], y: p.hub[1] }; }
    return renderBeforeChrono.apply(this, arguments);
  };
  const saveBeforeChrono = save;
  save = function () { if (state) state.chronoGen = CHRONO_GEN_VERSION; return saveBeforeChrono.apply(this, arguments); };
}

// --- Painting ---
const chronoImages = {};
function chronoArtImage(name) {
  const src = 'assets/environment/chronospire/gen/' + name + '.webp?v=' + CHRONO_ART_VERSION;
  let img = chronoImages[src]; if (!img) { img = new Image(); img.src = src; chronoImages[src] = img; }
  return img;
}
// The shape of a grid as a white picture, K canvas pixels per room pixel, each corner rounded the dual-grid way: an
// outer corner (both side neighbours empty) is cut to a quarter circle, an inner one (both filled) is filled in.
function chronoShape(grid, K, radius) {
  const c = document.createElement('canvas'); c.width = 800 * K; c.height = 500 * K;
  const g = c.getContext('2d'), T = CG_CELL * K, R = radius * K;
  const at = (x, y) => grid[Math.max(0, Math.min(CG_ROWS - 1, y)) * CG_COLS + Math.max(0, Math.min(CG_COLS - 1, x))] === 1;
  g.fillStyle = '#fff';
  for (let y = 0; y < CG_ROWS; y++) for (let x = 0; x < CG_COLS; x++) if (at(x, y)) g.fillRect(x * T, y * T, T, T);
  const corner = (x, y, sx, sy, cut) => {
    const px = (x + (sx > 0 ? 1 : 0)) * T, py = (y + (sy > 0 ? 1 : 0)) * T, qx = sx > 0 ? px - R : px, qy = sy > 0 ? py - R : py;
    g.globalCompositeOperation = cut ? 'destination-out' : 'source-over'; g.fillRect(qx, qy, R, R);
    g.globalCompositeOperation = cut ? 'source-over' : 'destination-out'; g.beginPath(); g.arc(px - sx * R, py - sy * R, R, 0, Math.PI * 2); g.fill();
  };
  for (let y = 0; y < CG_ROWS; y++) for (let x = 0; x < CG_COLS; x++) for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    const inX = x + sx >= 0 && x + sx < CG_COLS, inY = y + sy >= 0 && y + sy < CG_ROWS;
    if (at(x, y)) { if (!at(x + sx, y) && !at(x, y + sy)) corner(x, y, sx, sy, true); }
    else if (inX && inY && at(x + sx, y) && at(x, y + sy)) corner(x, y, sx, sy, false);
  }
  g.globalCompositeOperation = 'source-over';
  return c;
}
function chronoTint(shape, fill) {
  const c = document.createElement('canvas'); c.width = shape.width; c.height = shape.height;
  const g = c.getContext('2d'); g.drawImage(shape, 0, 0); g.globalCompositeOperation = 'source-in';
  g.fillStyle = fill; g.fillRect(0, 0, c.width, c.height);
  return c;
}
function paintChronoRoom(canvas, key) {
  const plan = chronoPlan(key); if (!plan || typeof document === 'undefined') return false;
  const props = chronoRoomProps(chronoSeed(), plan);
  const names = ['ground', 'floor', 'sand', ...new Set(props.map(p => p.name))], imgs = {};
  for (const n of names) imgs[n] = chronoArtImage(n);
  const waiting = names.map(n => imgs[n]).find(i => !(i.complete && i.naturalWidth));
  if (waiting) {
    if (canvas.dataset) canvas.dataset.pending = '1'; canvas.pendingImage = waiting;
    if (waiting.addEventListener) waiting.addEventListener('load', () => { if (canvas.isConnected) paintChronoRoom(canvas, key); }, { once: true });
    return false;
  }
  const K = 2, W = 800 * K, H = 500 * K; canvas.width = W; canvas.height = H;
  if (canvas.style) { canvas.style.imageRendering = 'auto'; canvas.style.filter = 'none'; }
  const ctx = canvas.getContext('2d'); if (!ctx) return false;
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  // The textures run on from room to room: the pattern starts at the world's corner, not the room's.
  const [cx, cy] = key.split(',').map(Number), offY = (cy * H) % 800, offX = (cx * W) % 800;
  const fill = (g, img) => { g.save(); g.translate(-offX, -offY); g.fillStyle = g.createPattern(img, 'repeat'); g.fillRect(offX, offY, W, H); g.restore(); };
  fill(ctx, imgs.ground);
  ctx.fillStyle = 'rgba(8,6,24,.28)'; ctx.fillRect(0, 0, W, H); // the machinery sits back, so the roads read at a glance
  const layer = (grid, img, radius) => {
    const shape = chronoShape(grid, K, radius), c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d'); g.drawImage(shape, 0, 0); g.globalCompositeOperation = 'source-in'; fill(g, img);
    return { shape, art: c };
  };
  const ring = (pic, r) => { for (let a = 0; a < 8; a++) ctx.drawImage(pic, Math.round(Math.cos(a * Math.PI / 4) * r), Math.round(Math.sin(a * Math.PI / 4) * r)); };
  if (plan.sand.some(v => v)) {
    const s = layer(plan.sand, imgs.sand, 22);
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.7)'; ctx.shadowBlur = 18; ctx.drawImage(chronoTint(s.shape, '#3a2c52'), 0, 0); ctx.restore();
    ring(chronoTint(s.shape, '#6b5a86'), 3); ctx.drawImage(s.art, 0, 0);
  }
  const f = layer(plan.floor, imgs.floor, 18);
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.85)'; ctx.shadowBlur = 26; ctx.shadowOffsetY = 12; ctx.drawImage(chronoTint(f.shape, '#0a0714'), 0, 0); ctx.restore();
  ring(chronoTint(f.shape, '#1c1206'), 9); ring(chronoTint(f.shape, '#b88a3c'), 6); ring(chronoTint(f.shape, '#5a3f18'), 2);
  ctx.drawImage(f.art, 0, 0);
  for (const p of props) {
    const img = imgs[p.name];
    ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.ellipse(p.x * K, (p.y - p.h * 0.07) * K, p.w * 0.46 * K, p.w * 0.16 * K, 0, 0, Math.PI * 2); ctx.fill();
    ctx.drawImage(img, (p.x - p.w / 2) * K, (p.y - p.h) * K, p.w * K, p.h * K);
  }
  if (canvas.dataset) delete canvas.dataset.pending; canvas.pendingImage = null;
  return true;
}
