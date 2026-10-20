'use strict';
// =====================================================================
// Round 192: no flash of old art when you enter a room.
// The room's ground canvas is first drawn with the old district/forest art; the room's own
// painting replaces it once its image has loaded. On a first visit that showed the old art
// for a moment. Now, while the painting is still loading the room shows its world's plain
// ground colour, and the paintings of the rooms next to you are loaded ahead of time so
// they are usually ready before you walk in.
// =====================================================================
const ROOM_LOADING_COLOR = { city: '#0b1422', elaris: '#e9b45a', sky: '#2a1f4a', wilds: '#2f5a34', vespera: '#1a2550', chronospire: '#3a2814' };
function blankWhileLoading(canvas) {
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d'); if (!ctx) return;
  if (canvas.style) canvas.style.filter = 'none';
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.filter = 'none';
  ctx.fillStyle = ROOM_LOADING_COLOR[activeRegion] || '#0b1422'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}
for (const name of ['paintSolaris', 'paintTileWorld', 'paintNeonWorld']) {
  if (typeof window === 'undefined' || typeof window.eval !== 'function') break;
  const before = window.eval('typeof ' + name + ' === "function" ? ' + name + ' : null');
  if (!before) continue;
  window.__roomPaintWrap = function (canvas) { const ok = before.apply(this, arguments); if (ok === false && canvas && canvas.pendingImage) blankWhileLoading(canvas); return ok; };
  window.eval(name + ' = window.__roomPaintWrap');
}

// The image a room will paint with (the same cached Image objects the painters use).
function roomPaintingImage(key) {
  try {
    if (activeRegion === 'elaris' && typeof SOLARIS_PLAN === 'object' && SOLARIS_PLAN[key]) return solarisTile(SOLARIS_PLAN[key][0]);
    const d = typeof TILE_WORLD_DATA === 'object' && TILE_REGIONS[activeRegion] && TILE_WORLD_DATA[activeRegion];
    if (d && d.plan[key]) {
      const src = tileWorldArtSrc(activeRegion, d.plan[key][0]);
      if (!tileWorldImages[src]) { const img = new Image(); img.src = src; tileWorldImages[src] = img; }
      return tileWorldImages[src];
    }
    if (activeRegion === 'city' && typeof neonWorldCell === 'function' && neonWorldCell(key)) {
      const [cx, cy] = neonWorldCell(key);
      return neonRoomArt(key) ? neonRoomImage(key) : neonWorldTile(cx, cy);
    }
  } catch (e) { /* a room without a painting */ }
  return null;
}
function preloadNeighbourPaintings(key) {
  const r = rooms && rooms[key]; if (!r || typeof Image === 'undefined') return [];
  const out = [];
  for (const raw of Object.values(r.exits || {})) {
    const to = typeof raw === 'string' ? raw : raw && raw.to;
    if (to && rooms[to]) { const img = roomPaintingImage(to); if (img) out.push(img); }
  }
  return out;
}
const renderWorldBeforePreload = renderWorld;
renderWorld = function () {
  const r = renderWorldBeforePreload.apply(this, arguments);
  if (state && state.room) preloadNeighbourPaintings(state.room);
  return r;
};
