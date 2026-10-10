'use strict';
// =====================================================================
// Round 82: the exploration map is drawn from the rooms themselves.
// Every explored room's actual ground art (procedural street blocks, the
// roundabout paintings, joined-district paintings, jungle clearings…) is laid
// edge to edge on the map grid, so the explored part of a world reads as one
// continuous giant city or jungle. Unexplored rooms stay dark (fog of war).
// The room labels shrink to small tags floating over their tile.
// =====================================================================
const MAP_TILE_W = 400, MAP_TILE_H = 250; // cached art per room (16:10, half of the 800x500 room)
const MAP_MAX_PIXELS = 16e6; // stay under mobile Safari's canvas size limit
const mapTileCache = {};
const mapImageCache = {};
function whenImageLoads(img, fn) { if (fn && img.addEventListener) img.addEventListener('load', fn, { once: true }); }
function mapImage(src, onReady) {
  let img = mapImageCache[src];
  if (!img) { img = new Image(); img.src = src; mapImageCache[src] = img; }
  if (!(img.complete && img.naturalWidth)) whenImageLoads(img, onReady);
  return img;
}
// Paint one ordinary room's ground into a tile canvas. Returns null while some
// of its art is still loading (onReady fires when it can be drawn).
function mapRoomTile(key, onReady) {
  const ck = activeRegion + ':' + key; if (mapTileCache[ck]) return mapTileCache[ck];
  const holder = document.createElement('div');
  try { NeonCity.render(holder, key, rooms[key]); } catch (e) { return null; }
  const tile = document.createElement('canvas'); tile.width = MAP_TILE_W; tile.height = MAP_TILE_H;
  const ctx = tile.getContext('2d'); ctx.imageSmoothingEnabled = true; ctx.fillStyle = '#0b1218'; ctx.fillRect(0, 0, MAP_TILE_W, MAP_TILE_H);
  let complete = true;
  for (const node of Array.from(holder.children || [])) {
    if (node.tagName === 'CANVAS' && /city-ground/.test(node.className)) {
      ctx.filter = (node.style && node.style.filter) || 'none'; ctx.drawImage(node, 0, 0, MAP_TILE_W, MAP_TILE_H); ctx.filter = 'none';
    } else if (/diag-ground/.test(node.className || '')) {
      const m = /url\(["']?([^"')]+)/.exec(node.style.backgroundImage || ''); if (!m) continue;
      const img = mapImage(m[1], onReady);
      if (img.complete && img.naturalWidth) ctx.drawImage(img, 0, 0, MAP_TILE_W, MAP_TILE_H); else complete = false;
    }
  }
  // A painted city block whose image is still loading (Round 87).
  if (holder.querySelector && holder.querySelector('canvas[data-pending]')) { complete = false; if (typeof cityBlockTile === 'function') whenImageLoads(cityBlockImage(cityBlockTile(key).art.src), onReady); }
  if (complete) mapTileCache[ck] = tile;
  return tile;
}
// A joined district's single painting, spanning all of its cells.
function mapAreaTile(area, onReady) {
  const ck = activeRegion + ':' + area.cells.join('|'); if (mapTileCache[ck]) return mapTileCache[ck];
  let texture = areaPaintings[area.art];
  if (!texture) { texture = new Image(); areaPaintings[area.art] = texture; texture.src = 'assets/environment/areas/' + area.art + '.webp'; }
  if (!(texture.complete && texture.naturalWidth)) { whenImageLoads(texture, onReady); return null; }
  const canvas = document.createElement('canvas'); canvas.width = area.width; canvas.height = area.height;
  paintJoinedArea(canvas, area, texture);
  return mapTileCache[ck] = canvas;
}
function mapBounds() {
  // Same framing as showMap: explored rooms plus one ring, clamped to the world.
  const keys = Object.keys(rooms), vis = keys.filter(k => state.visited.includes(k)), b = vis.length ? vis : [state.room];
  const X = k => Number(k.split(',')[0]), Y = k => Number(k.split(',')[1]);
  return {
    minX: Math.max(Math.min(...b.map(X)) - 1, Math.min(...keys.map(X))), maxX: Math.min(Math.max(...b.map(X)) + 1, Math.max(...keys.map(X))),
    minY: Math.max(Math.min(...b.map(Y)) - 1, Math.min(...keys.map(Y))), maxY: Math.min(Math.max(...b.map(Y)) + 1, Math.max(...keys.map(Y))),
  };
}
// Per-world look for the frontier of the explored area and the fog beyond it.
const MAP_THEME = {
  city: { fog: '#05080d', grid: 'rgba(80,170,230,.07)', rim: '#38d6ff', barrier: ['#ff5a6e', '#2a0f16'] },
  elaris: { fog: '#040a06', grid: 'rgba(120,220,140,.05)', rim: '#9dff8a', barrier: ['#7a4b26', '#2b1a0c'] },
  vespera: { fog: '#06060d', grid: 'rgba(160,140,255,.06)', rim: '#b9a2ff', barrier: ['#ffcf5a', '#2a2208'] },
  chronospire: { fog: '#0a0705', grid: 'rgba(255,200,120,.06)', rim: '#ffcc66', barrier: ['#ffcc66', '#2a1d08'] },
};
const MAP_SIDES = { e: [1, 0], w: [-1, 0], s: [0, 1], n: [0, -1] };
// A smooth curve through the points (midpoint quadratic smoothing).
function mapCurve(c, pts, move = true) {
  if (move) c.moveTo(...pts[0]); else c.lineTo(...pts[0]);
  for (let i = 1; i < pts.length - 1; i++) c.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2);
  c.lineTo(...pts[pts.length - 1]);
}
// tileW is the on-screen device-pixel width of one room, so the terrain is
// drawn 1:1 with the screen (sharp at any zoom) and always at exactly 16:10.
function drawMapTerrain(canvasEl, tileW) {
  const { minX, maxX, minY, maxY } = mapBounds(), cols = maxX - minX + 1.8, rows = maxY - minY + 1.8;
  let TW = Math.round(tileW || MAP_TILE_W * 0.64);
  TW = Math.max(64, Math.min(TW, Math.floor(Math.sqrt(MAP_MAX_PIXELS / (cols * rows * 0.625)))));
  const TH = TW * 0.625, k = TW / 256; // k scales the hand-tuned edge sizes
  const W = Math.round(cols * TW), H = Math.round(rows * TH), theme = MAP_THEME[activeRegion] || MAP_THEME.city;
  canvasEl.width = W; canvasEl.height = H;
  const ctx = canvasEl.getContext('2d'); if (!ctx) return;
  const redraw = () => { if (canvasEl.isConnected) drawMapTerrain(canvasEl, tileW); };
  const at = (x, y) => [(x - minX + 0.4) * TW, (y - minY + 0.4) * TH];
  const explored = new Set(Object.keys(rooms).filter(k => state.visited.includes(k)));
  const K = (x, y) => x + ',' + y, XY = k => k.split(',').map(Number);
  const sameArea = (a, b) => { const A = joinedArea(a); return A.cells.length > 1 && A.cells.includes(b); };
  // Each explored cell's art (a whole room tile, or its slice of a district painting).
  const source = {};
  for (const key of explored) {
    const area = joinedArea(key);
    if (area.art && area.cells.length > 1) {
      const tile = mapAreaTile(area, redraw); if (!tile) continue;
      const [kx, ky] = XY(key); source[key] = { img: tile, sx: (kx - area.left) * tile.width / (area.width / 800), sy: (ky - area.top) * tile.height / (area.height / 500), sw: tile.width / (area.width / 800), sh: tile.height / (area.height / 500) };
    } else { const tile = mapRoomTile(key, redraw); if (tile) source[key] = { img: tile, sx: 0, sy: 0, sw: tile.width, sh: tile.height }; }
  }
  // 1) Fog beyond the frontier: dark ground with a faint survey grid.
  ctx.fillStyle = theme.fog; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = theme.grid; ctx.lineWidth = 1;
  for (let x = 0; x <= W; x += TW / 4) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y <= H; y += TH / 4) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  // 2) The explored land is built on its own layer so its edges can be shaped.
  const land = document.createElement('canvas'); land.width = W; land.height = H;
  const L = land.getContext('2d'); if (!L) return;
  for (const [key, s] of Object.entries(source)) { const [x, y] = at(...XY(key)); L.drawImage(s.img, s.sx, s.sy, s.sw, s.sh, x, y, TW, TH); }
  // 3) Seams: where two explored rooms touch, each one's edge is mirrored a
  //    short way into its neighbour and faded out, so the two pictures
  //    cross-fade instead of meeting at a hard line. Mirroring keeps every road
  //    exactly where it is, so streets run straight through the join.
  const O = Math.round(26 * k), strip = document.createElement('canvas'), S = strip.getContext('2d');
  for (const [key, s] of Object.entries(source)) {
    const [kx, ky] = XY(key), [x, y] = at(kx, ky), fx = s.sw / TW, fy = s.sh / TH;
    for (const [side, [dx, dy]] of Object.entries(MAP_SIDES)) {
      const n = K(kx + dx, ky + dy); if (!source[n] || sameArea(key, n)) continue;
      const horiz = dx !== 0; strip.width = horiz ? O : TW; strip.height = horiz ? TH : O;
      S.clearRect(0, 0, strip.width, strip.height); S.save();
      // Source edge band of the tile, flipped across the shared edge.
      if (horiz) { S.translate(O, 0); S.scale(-1, 1); S.drawImage(s.img, s.sx + (dx > 0 ? s.sw - O * fx : 0), s.sy, O * fx, s.sh, 0, 0, O, TH); }
      else { S.translate(0, O); S.scale(1, -1); S.drawImage(s.img, s.sx, s.sy + (dy > 0 ? s.sh - O * fy : 0), s.sw, O * fy, 0, 0, TW, O); }
      S.restore();
      S.globalCompositeOperation = 'destination-in';
      const g = horiz ? S.createLinearGradient(dx > 0 ? 0 : O, 0, dx > 0 ? O : 0, 0) : S.createLinearGradient(0, dy > 0 ? 0 : O, 0, dy > 0 ? O : 0);
      g.addColorStop(0, 'rgba(0,0,0,.5)'); g.addColorStop(1, 'rgba(0,0,0,0)'); S.fillStyle = g; S.fillRect(0, 0, strip.width, strip.height);
      S.globalCompositeOperation = 'source-over';
      L.drawImage(strip, dx > 0 ? x + TW : dx < 0 ? x - O : x, dy > 0 ? y + TH : dy < 0 ? y - O : y);
    }
  }
  // 4) Closed roads: two explored rooms side by side with no exit between them
  //    get a barricade where their roads would meet, so a continuous-looking
  //    street never lies about a connection.
  for (const key of Object.keys(source)) {
    const [kx, ky] = XY(key), [x, y] = at(kx, ky), ex = rooms[key].exits;
    for (const side of ['e', 's']) {
      const [dx, dy] = MAP_SIDES[side], n = K(kx + dx, ky + dy);
      if (!source[n] || sameArea(key, n)) continue;
      const linked = Object.values(ex).some(e => (typeof e === 'string' ? e : e.to) === n); if (linked) continue;
      L.save(); L.translate(side === 'e' ? x + TW : x + TW / 2, side === 'e' ? y + TH / 2 : y + TH); if (side === 'e') L.rotate(Math.PI / 2);
      const bw = TW * 0.2, bh = 7 * k; L.fillStyle = theme.barrier[1]; L.fillRect(-bw / 2 - 2, -bh / 2 - 2, bw + 4, bh + 4);
      for (let i = 0; i < 6; i++) { L.fillStyle = i % 2 ? theme.barrier[1] : theme.barrier[0]; L.fillRect(-bw / 2 + i * bw / 6, -bh / 2, bw / 6, bh); }
      L.restore();
    }
  }
  // 5) Frontier: every edge that faces unexplored ground is torn into a
  //    ragged, seeded line; the band inside it is dimmed and blurred in step 6.
  // Each frontier edge ends exactly where its neighbouring edge begins (a fixed
  // inset at the ends, jitter only in between), so the frontier is one unbroken shape
  // that turns cleanly around outer and inner corners.
  const F = 64 * k, D0 = 11 * k, fades = [], has = (x, y) => !!source[K(x, y)];
  L.globalCompositeOperation = 'destination-out';
  for (const key of Object.keys(source)) {
    const [kx, ky] = XY(key), [x, y] = at(kx, ky), rand = seeded(hashSeed(activeRegion + key + 'frontier'));
    for (const [side, [dx, dy]] of Object.entries(MAP_SIDES)) {
      if (has(kx + dx, ky + dy)) continue;
      const horiz = dx !== 0; // a vertical edge (east/west side) when horiz
      // Along-edge axis: neighbours before/after this tile on the same frontier.
      const [ax, ay] = horiz ? [0, 1] : [1, 0], base = horiz ? y : x, span = horiz ? TH : TW;
      const endOffset = sgn => {
        const nx = kx + ax * sgn, ny = ky + ay * sgn;
        if (!has(nx, ny)) return sgn < 0 ? D0 : span - D0;             // outer corner
        if (!has(nx + dx, ny + dy)) return sgn < 0 ? 0 : span;          // frontier continues straight
        return sgn < 0 ? -D0 : span + D0;                               // inner corner
      };
      const s0 = endOffset(-1), s1 = endOffset(1), steps = 9, pts = [];
      for (let i = 0; i <= steps; i++) {
        const t = i / steps, along = base + s0 + (s1 - s0) * t;
        const d = i === 0 || i === steps ? D0 : (6 + rand() * 12 + Math.sin(t * Math.PI * 3 + rand()) * 3) * k;
        pts.push(horiz ? [dx > 0 ? x + TW - d : x + d, along] : [along, dy > 0 ? y + TH - d : y + d]);
      }
      const edge = horiz ? (dx > 0 ? x + TW : x) : (dy > 0 ? y + TH : y), a0 = Math.min(base, base + s0), a1 = Math.max(base + span, base + s1); // outer corners erase all the way to the tile corner
      // Erase beyond the ragged line…
      L.beginPath(); mapCurve(L, pts);
      if (horiz) { L.lineTo(edge, a1); L.lineTo(edge, a0); } else { L.lineTo(a1, edge); L.lineTo(a0, edge); }
      L.closePath(); L.fillStyle = '#000'; L.fill();
      // The band just inside it fades later, on the sharp layer only.
      fades.push({ horiz, dx, dy, x, y, edge, a0, a1 });
    }
  }
  L.globalCompositeOperation = 'source-over';
  // 6) Soft, dim frontier (no outline): a blurred, darkened copy of the land
  //    sits underneath, and the sharp land fades out over it near the edges,
  //    so explored ground melts into the fog. The blur is a down-and-up scale,
  //    which works in every browser.
  const small = document.createElement('canvas'), q = Math.max(4, Math.round(8 * k)); small.width = Math.max(1, Math.round(W / q)); small.height = Math.max(1, Math.round(H / q));
  const SM = small.getContext('2d'); SM.imageSmoothingEnabled = true; SM.drawImage(land, 0, 0, small.width, small.height);
  SM.globalCompositeOperation = 'source-atop'; SM.fillStyle = 'rgba(0,0,0,.5)'; SM.fillRect(0, 0, small.width, small.height);
  ctx.save(); ctx.imageSmoothingEnabled = true; ctx.drawImage(small, 0, 0, W, H); ctx.restore();
  L.globalCompositeOperation = 'destination-out';
  for (const f of fades) {
    const { horiz, dx, dy, x, y, edge, a0, a1 } = f, sign = horiz ? -dx : -dy, far = edge + sign * F;
    const g = horiz ? L.createLinearGradient(edge, 0, far, 0) : L.createLinearGradient(0, edge, 0, far);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(.35, 'rgba(0,0,0,.75)'); g.addColorStop(1, 'rgba(0,0,0,0)'); L.fillStyle = g;
    const lo = Math.min(edge, far), hi = Math.max(edge, far);
    if (horiz) L.fillRect(lo, a0, hi - lo, a1 - a0); else L.fillRect(a0, lo, a1 - a0, hi - lo);
  }
  L.globalCompositeOperation = 'source-over';
  ctx.drawImage(land, 0, 0);
  // Where you are.
  const [hx, hy] = at(...XY(state.room));
  ctx.save(); ctx.strokeStyle = '#ffd27acc'; ctx.lineWidth = 5 * k; ctx.shadowColor = '#ffd27a'; ctx.shadowBlur = 18 * k;
  ctx.strokeRect(hx + 3 * k, hy + 3 * k, TW - 6 * k, TH - 6 * k); ctx.restore();
}
// --- Zoom ---
// The map keeps its own zoom between openings. Zooming resizes the map
// (labels stay readable at their normal size) and redraws the terrain at the
// new on-screen resolution so it stays sharp.
let mapZoom = 1;
try { mapZoom = Number(localStorage.getItem('cardbound-map-zoom')) || 1; } catch (e) { mapZoom = 1; }
const MAP_ZOOM_MIN = 0.3, MAP_ZOOM_MAX = 3;
function applyMapZoom(map, scroller, zoom, focus) {
  zoom = Math.max(MAP_ZOOM_MIN, Math.min(MAP_ZOOM_MAX, zoom));
  const baseW = Number(map.dataset.baseW), baseH = Number(map.dataset.baseH);
  // Keep the point under the cursor (or the centre) where it is.
  const fx = focus ? focus.x : scroller.clientWidth / 2, fy = focus ? focus.y : scroller.clientHeight / 2;
  const relX = (scroller.scrollLeft + fx) / (map.offsetWidth || 1), relY = (scroller.scrollTop + fy) / (map.offsetHeight || 1);
  mapZoom = zoom; try { localStorage.setItem('cardbound-map-zoom', String(zoom)); } catch (e) { /* private mode */ }
  map.style.width = Math.round(baseW * zoom) + 'px'; map.style.height = Math.round(baseH * zoom) + 'px';
  scroller.scrollLeft = relX * map.offsetWidth - fx; scroller.scrollTop = relY * map.offsetHeight - fy;
  const label = document.querySelector('.map-zoom-level'); if (label) label.textContent = Math.round(zoom * 100) + '%';
  clearTimeout(applyMapZoom.timer);
  applyMapZoom.timer = setTimeout(() => { const t = map.querySelector('.map-terrain'); if (t) drawMapTerrain(t, mapTileScreenWidth(map)); }, 140);
}
function mapTileScreenWidth(map) {
  const { minX, maxX } = mapBounds(), dpr = (typeof devicePixelRatio === 'number' && devicePixelRatio) || 1;
  return (map.offsetWidth || Number(map.dataset.baseW) * mapZoom) / (maxX - minX + 1.8) * dpr;
}
const showMapBeforeTerrain = showMap;
showMap = function () {
  showMapBeforeTerrain();
  const map = document.querySelector && document.querySelector('.map-canvas'); if (!map || !state) return;
  const scroller = map.parentElement;
  map.classList.add('map-city');
  // Base size = the 16:10 grid the map was laid out on (never stretched to fill).
  map.dataset.baseW = parseFloat(map.style.width) || 0; map.dataset.baseH = parseFloat(map.style.height) || 0;
  const terrain = document.createElement('canvas'); terrain.className = 'map-terrain'; terrain.setAttribute('aria-hidden', 'true');
  map.prepend(terrain);
  // Zoom controls just above the map.
  if (scroller && scroller.before) {
    const bar = document.createElement('div'); bar.className = 'map-zoom';
    bar.innerHTML = '<button type="button" class="map-zoom-out" aria-label="Zoom out">−</button><span class="map-zoom-level">100%</span><button type="button" class="map-zoom-in" aria-label="Zoom in">+</button><button type="button" class="map-zoom-reset">Fit</button><small>Ctrl + scroll or pinch to zoom</small>';
    scroller.before(bar);
    bar.querySelector('.map-zoom-in').onclick = () => applyMapZoom(map, scroller, mapZoom * 1.25);
    bar.querySelector('.map-zoom-out').onclick = () => applyMapZoom(map, scroller, mapZoom / 1.25);
    bar.querySelector('.map-zoom-reset').onclick = () => {
      const fit = Math.min(scroller.clientWidth / Number(map.dataset.baseW), scroller.clientHeight / Number(map.dataset.baseH));
      applyMapZoom(map, scroller, fit);
    };
    if (scroller.addEventListener) {
      // Trackpad pinch and Ctrl+wheel arrive as wheel events with ctrlKey.
      scroller.addEventListener('wheel', e => {
        if (!e.ctrlKey && !e.metaKey) return; e.preventDefault();
        const r = scroller.getBoundingClientRect();
        applyMapZoom(map, scroller, mapZoom * Math.exp(-Math.max(-60, Math.min(60, e.deltaY)) * 0.004), { x: e.clientX - r.left, y: e.clientY - r.top });
      }, { passive: false });
      // Two-finger pinch on touch screens.
      let pinch = null;
      const dist = t => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
      scroller.addEventListener('touchstart', e => { if (e.touches.length === 2) pinch = { d: dist(e.touches), z: mapZoom }; }, { passive: true });
      scroller.addEventListener('touchmove', e => {
        if (!pinch || e.touches.length !== 2) return; e.preventDefault();
        const r = scroller.getBoundingClientRect(), cx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - r.left, cy = (e.touches[0].clientY + e.touches[1].clientY) / 2 - r.top;
        applyMapZoom(map, scroller, pinch.z * dist(e.touches) / pinch.d, { x: cx, y: cy });
      }, { passive: false });
      scroller.addEventListener('touchend', () => { pinch = null; });
    }
  }
  map.style.width = Math.round(Number(map.dataset.baseW) * mapZoom) + 'px'; map.style.height = Math.round(Number(map.dataset.baseH) * mapZoom) + 'px';
  const label = document.querySelector('.map-zoom-level'); if (label) label.textContent = Math.round(mapZoom * 100) + '%';
  drawMapTerrain(terrain, mapTileScreenWidth(map));
  const here = map.querySelector('.current-room'); if (here && here.scrollIntoView) here.scrollIntoView({ block: 'center', inline: 'center' });
};
const mapTerrainStyles = document.createElement('style');
mapTerrainStyles.textContent = '.map-canvas.map-city{background:#070b10;min-width:0;flex:none}'
  + '.map-zoom{display:flex;align-items:center;gap:6px;margin:0 0 6px}.map-zoom button{min-width:32px;padding:3px 10px}.map-zoom .map-zoom-level{min-width:46px;text-align:center;font:12px system-ui;color:#bfe6ff}.map-zoom small{opacity:.6;margin-left:6px}'
  + '.map-terrain{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;image-rendering:auto}'
  + '.map-city .map-links{z-index:1}'
  + '.map-city .panel{z-index:2;width:auto!important;height:auto!important;min-width:0;min-height:0;padding:5px 9px 4px;text-align:center;background:rgba(7,13,20,.4);border-color:#5d86a066;border-radius:8px;box-shadow:0 2px 10px #000a;backdrop-filter:blur(2px)}'
  + '.map-city .panel b{display:block;font-size:11px;white-space:nowrap}'
  + '.map-city .panel small{font-size:9px}'
  // Roads are visible in the art now, so the connection lines become thin dotted guides.
  + '.map-city .map-link{vector-effect:non-scaling-stroke;stroke-width:2.5px;stroke-dasharray:2px 6px;opacity:.3;stroke:#bfe6ff}'
  + '.map-city .map-link.locked{stroke:#ff8a9a;stroke-dasharray:2px 4px}'
  + '.map-city .map-link.map-stub{opacity:.3;stroke:#bfe6ff}';
document.head.append(mapTerrainStyles);
