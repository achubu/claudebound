'use strict';
// =====================================================================
// Round 87: painted city blocks. Neon Aftermath's ordinary rooms (no
// diagonal roads, not part of a district) now use quarters of two hand-made
// 2x2 street paintings instead of the procedural texture atlas. Each quarter
// is one crossroads; its roads are stretched band by band onto the room's
// existing street corridor (x 292–500, y 157–322), so collision, exits and
// every spawn/POI spot stay exactly where they were.
// =====================================================================
// Roads (with pavements/verges) in each painting, as fractions of the image.
// Round 88: Elaris's plain rooms use the jungle crossroads painting the same way.
const CITY_BLOCK_ARTS = {
  city: [
    { src: 'assets/environment/city-blocks/neon-a.webp', x: [[.205, .295], [.705, .795]], y: [[.205, .33], [.64, .78]] },
    { src: 'assets/environment/city-blocks/neon-b.webp', x: [[.205, .30], [.70, .795]], y: [[.205, .34], [.65, .79]] },
  ],
  elaris: [
    { src: 'assets/environment/city-blocks/elaris-a.webp', x: [[.295, .345], [.655, .705]], y: [[.27, .335], [.665, .735]] },
  ],
};
const CITY_BLOCK_ART = CITY_BLOCK_ARTS.city;
const CITY_BLOCK_DEST = { x: [0, 292, 500, 800], y: [0, 157, 322, 500] };
const cityBlockImages = {};
function cityBlockImage(src) {
  let img = cityBlockImages[src];
  if (!img) { img = new Image(); img.src = src; cityBlockImages[src] = img; }
  return img;
}
// 8 distinct tiles: 2 paintings x 4 quarters.
function cityBlockTile(key) {
  const arts = CITY_BLOCK_ARTS[activeRegion] || CITY_BLOCK_ART;
  const n = hashSeed('cityblock:' + activeRegion + ':' + key) % (arts.length * 4), art = arts[n >> 2], qx = n & 1, qy = (n >> 1) & 1;
  // Source bands inside the chosen quarter, in quarter-local fractions.
  const band = (r, q) => [0, (r[q][0] - q * .5) * 2, (r[q][1] - q * .5) * 2, 1];
  return { art, qx, qy, bx: band(art.x, qx), by: band(art.y, qy) };
}
function usesCityPainting(key) {
  return !!CITY_BLOCK_ARTS[activeRegion] && !!rooms[key] && !(typeof isDiagonalRoom === 'function' && isDiagonalRoom(key))
    && !(typeof joinedArea === 'function' && joinedArea(key).cells.length > 1);
}
function paintCityBlock(canvas, key) {
  const t = cityBlockTile(key), img = cityBlockImage(t.art.src);
  if (!(img.complete && img.naturalWidth)) {
    if (canvas.dataset) canvas.dataset.pending = '1';
    if (img.addEventListener) img.addEventListener('load', () => { if (canvas.isConnected) paintCityBlock(canvas, key); if (state && !state.battle && state.room === key) renderWorld(); }, { once: true });
    return false;
  }
  const ctx = canvas.getContext('2d'); if (!ctx) return false;
  ctx.imageSmoothingEnabled = true;
  const qw = img.naturalWidth / 2, qh = img.naturalHeight / 2, ox = t.qx * qw, oy = t.qy * qh, D = CITY_BLOCK_DEST;
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    const sx = ox + t.bx[i] * qw, sw = (t.bx[i + 1] - t.bx[i]) * qw, sy = oy + t.by[j] * qh, sh = (t.by[j + 1] - t.by[j]) * qh;
    ctx.drawImage(img, sx, sy, sw, sh, D.x[i], D.y[j], D.x[i + 1] - D.x[i], D.y[j + 1] - D.y[j]);
  }
  if (canvas.dataset) delete canvas.dataset.pending;
  return true;
}
const renderBeforeCityPaint = NeonCity.render;
NeonCity.render = function (container, key, r) {
  const out = renderBeforeCityPaint.apply(this, arguments);
  if (!usesCityPainting(key) || !container || !container.querySelector) return out;
  const ground = container.querySelector('canvas.city-ground');
  if (ground) { if (ground.classList) ground.classList.add('painted-block'); paintCityBlock(ground, key); }
  return out;
};
// The painted blocks have no loose street props: only the four corner blocks are solid.
const blockedBeforeCityPaint = NeonCity.blocked;
NeonCity.blocked = function (key, x, y) {
  if (!usesCityPainting(key)) return blockedBeforeCityPaint(key, x, y);
  return [[0, 0, 292, 157], [500, 0, 300, 157], [0, 322, 292, 178], [500, 322, 300, 178]]
    .some(([l, t, w, h]) => x > l - 12 && x < l + w + 12 && y + 25 > t - 5 && y + 25 < t + h + 5);
};
