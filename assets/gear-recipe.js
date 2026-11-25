'use strict';
// Round 564 (owner: "could we combine vector graphics and add textures to the gear generator ... so we never need to upload to
// the site, just choose from textures and vector?"). A gear *recipe* is a few lines of JSON, drawn by the game itself:
//   shape    the slot's fit template (gear/templates/<slot>-mask.png: where that slot's gear goes in each of the 36 frames),
//            never over the Aetherlink (gear/templates/protected.png);
//   material a texture tiled inside it: a procedural one drawn here (GEAR_TEXTURES) or a picture (any path under assets/),
//            tinted, and anchored to each frame's piece so it moves with the body instead of swimming;
//   shading  the hero's own painted light and folds, multiplied in (strength `shade`), so the new material keeps his shading;
//   details  drawn per frame from the shape: a trim along its edge, horizontal bands, a glowing centre seam.
// Used by assets/hero-wear.js (the game: gear/recipes/<itemId>.json) and gear/index.html (the Gear Studio's designer).
// Recipe: { v: 1, slot, name, texture, scale, tint, shade, trim: { color, width }, bands: { color, width, at: [0..1] },
//           seam: { color, width, glow } }  (colours '#rrggbb'; everything but slot and texture optional).
const GEAR_RECIPE_VERSION = 1;
const GEAR_TEXTURES = { // procedural textures: (ctx, size) draws one seamless tile, grey (the tint colours it)
  plain: (g, n) => { g.fillStyle = '#c8c8c8'; g.fillRect(0, 0, n, n); },
  carbon: (g, n) => { g.fillStyle = '#8a8a8a'; g.fillRect(0, 0, n, n); const s = n / 8;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.fillStyle = (x + y) % 2 ? '#b4b4b4' : '#6e6e6e'; g.fillRect(x * s, y * s, s, s / 2); g.fillStyle = (x + y) % 2 ? '#6e6e6e' : '#b4b4b4'; g.fillRect(x * s, y * s + s / 2, s, s / 2); } },
  hex: (g, n) => { g.fillStyle = '#9a9a9a'; g.fillRect(0, 0, n, n); g.strokeStyle = '#5a5a5a'; g.lineWidth = n / 32; const r = n / 3, h = Math.sqrt(3) * r;
    for (let col = -1; col <= 3; col++) for (let row = -1; row <= 3; row++) { const cx = col * 1.5 * r, cy = row * h + (col & 1 ? h / 2 : 0); g.beginPath(); for (let k = 0; k < 6; k++) { const a = Math.PI / 3 * k; g.lineTo(cx + r * .92 * Math.cos(a), cy + r * .92 * Math.sin(a)); } g.closePath(); g.stroke(); } },
  brushed: (g, n) => { g.fillStyle = '#a8a8a8'; g.fillRect(0, 0, n, n); for (let y = 0; y < n; y++) { const v = 150 + Math.round(30 * Math.sin(y * 1.7) * Math.cos(y * 0.37)); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(0, y, n, 1); } },
  quilted: (g, n) => { g.fillStyle = '#b0b0b0'; g.fillRect(0, 0, n, n); g.strokeStyle = '#707070'; g.lineWidth = n / 40; g.beginPath(); g.moveTo(0, 0); g.lineTo(n, n); g.moveTo(n, 0); g.lineTo(0, n); g.moveTo(n / 2, -n / 2); g.lineTo(n * 1.5, n / 2); g.moveTo(-n / 2, n / 2); g.lineTo(n / 2, n * 1.5); g.moveTo(n / 2, -n / 2); g.lineTo(-n / 2, n / 2); g.moveTo(n * 1.5, n / 2); g.lineTo(n / 2, n * 1.5); g.stroke(); },
  scales: (g, n) => { g.fillStyle = '#7c7c7c'; g.fillRect(0, 0, n, n); const r = n / 4; for (let row = 0; row < 5; row++) for (let col = -1; col < 5; col++) { const cx = col * r * 2 + (row % 2 ? r : 0), cy = row * r; g.fillStyle = row % 2 ? '#a6a6a6' : '#b8b8b8'; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI); g.fill(); g.strokeStyle = '#5c5c5c'; g.lineWidth = n / 48; g.stroke(); } },
  stripes: (g, n) => { for (let y = 0; y < n; y += n / 8) { g.fillStyle = (y / (n / 8)) % 2 ? '#9a9a9a' : '#c0c0c0'; g.fillRect(0, y, n, n / 8); } },
  plates: (g, n) => { g.fillStyle = '#a0a0a0'; g.fillRect(0, 0, n, n); g.strokeStyle = '#555'; g.lineWidth = n / 32; g.strokeRect(n * .03, n * .03, n * .94, n * .94); g.fillStyle = '#d0d0d0'; for (const [x, y] of [[.12, .12], [.88, .12], [.12, .88], [.88, .88]]) { g.beginPath(); g.arc(x * n, y * n, n / 24, 0, 6.3); g.fill(); } },
};
function gearHex(c, fb) { const m = /^#?([0-9a-f]{6})$/i.exec(c || ''); if (!m) return fb; const v = parseInt(m[1], 16); return [v >> 16, (v >> 8) & 255, v & 255]; }
// imgs: { base, mask, protected, texture? } (images or canvases on the hero's grid; texture only for picture textures)
function gearRecipeRender(recipe, imgs) {
  const W = 2304, H = 1024, C = 256, mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
  const px = im => { const c = mk(), g = c.getContext('2d'); g.drawImage(im, 0, 0); return g.getImageData(0, 0, W, H).data; };
  const b = px(imgs.base), m = px(imgs.mask), p = px(imgs.protected);
  // the material tile
  const n = Math.max(8, Math.round((recipe.scale || 1) * 48)), tile = document.createElement('canvas'); tile.width = tile.height = n; const tg = tile.getContext('2d');
  if (GEAR_TEXTURES[recipe.texture]) GEAR_TEXTURES[recipe.texture](tg, n); else if (imgs.texture) tg.drawImage(imgs.texture, 0, 0, n, n); else GEAR_TEXTURES.plain(tg, n);
  const t = tg.getImageData(0, 0, n, n).data, tint = gearHex(recipe.tint, [120, 128, 140]), shadeK = recipe.shade == null ? 0.8 : +recipe.shade;
  const inM = i => m[i * 4] > 127 && p[i * 4] <= 127;
  const out = new Uint8ClampedArray(W * H * 4), lum = i => (0.3 * b[i * 4] + 0.59 * b[i * 4 + 1] + 0.11 * b[i * 4 + 2]) / 255;
  const trim = recipe.trim && recipe.trim.width ? { c: gearHex(recipe.trim.color, [40, 40, 48]), w: Math.min(6, recipe.trim.width | 0) } : null;
  const bands = recipe.bands && recipe.bands.at && recipe.bands.at.length ? { c: gearHex(recipe.bands.color, [30, 30, 36]), w: Math.max(1, Math.min(8, recipe.bands.width | 0 || 2)), at: recipe.bands.at.slice(0, 6) } : null;
  const seam = recipe.seam && recipe.seam.width ? { c: gearHex(recipe.seam.color, [54, 241, 255]), w: Math.min(4, recipe.seam.width | 0), glow: !!recipe.seam.glow } : null;
  for (let r = 0; r < 4; r++) for (let col = 0; col < 9; col++) {
    const x0 = col * C, y0 = r * C; let top = C, bot = -1, left = C, right = -1, sum = 0, cnt = 0;
    for (let y = 0; y < C; y++) for (let x = 0; x < C; x++) { const i = (y0 + y) * W + x0 + x; if (!inM(i)) continue; top = Math.min(top, y); bot = Math.max(bot, y); left = Math.min(left, x); right = Math.max(right, x); sum += lum(i); cnt++; }
    if (!cnt) continue; const avg = sum / cnt || 0.5;
    // distance to the shape's edge (up to the trim's width), by rings
    let dist = null; if (trim) { dist = new Uint8Array(C * C).fill(255); const inside = (x, y) => x >= 0 && y >= 0 && x < C && y < C && inM((y0 + y) * W + x0 + x);
      for (let y = 0; y < C; y++) for (let x = 0; x < C; x++) if (inside(x, y) && (!inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1))) dist[y * C + x] = 1;
      for (let k = 2; k <= trim.w; k++) for (let y = 0; y < C; y++) for (let x = 0; x < C; x++) if (dist[y * C + x] === 255 && inside(x, y) && ((x && dist[y * C + x - 1] === k - 1) || (x < C - 1 && dist[y * C + x + 1] === k - 1) || (y && dist[(y - 1) * C + x] === k - 1) || (y < C - 1 && dist[(y + 1) * C + x] === k - 1))) dist[y * C + x] = k; }
    // the seam's line: one x per frame, the middle of the piece over its middle half (arms at its sides don't pull it about)
    let mid = -99; if (seam) { const xs = []; for (let y = top + ((bot - top) >> 2); y <= bot - ((bot - top) >> 2); y++) { let rl = C, rr = -1; for (let x = left; x <= right; x++) if (inM((y0 + y) * W + x0 + x)) { rl = Math.min(rl, x); rr = Math.max(rr, x); } if (rr > rl + 6) xs.push((rl + rr) / 2); }
      xs.sort((a, b) => a - b); if (xs.length) mid = xs[xs.length >> 1]; }
    for (let y = top; y <= bot; y++) { const rl = 0, rr = 99;
      for (let x = left; x <= right; x++) { const i = (y0 + y) * W + x0 + x; if (!inM(i)) continue;
        const ti = (((y - top) % n) * n + ((x - left) % n)) * 4, sh = Math.max(0, 1 + (lum(i) / avg - 1) * shadeK);
        let col = [t[ti] / 255 * tint[0] * 1.6, t[ti + 1] / 255 * tint[1] * 1.6, t[ti + 2] / 255 * tint[2] * 1.6];
        if (bands) { const f = (y - top) / Math.max(1, bot - top); if (bands.at.some(a => Math.abs(f - a) * (bot - top) < bands.w / 2)) col = bands.c.slice(); }
        if (seam && rr > rl + 6 && Math.abs(x - mid) <= seam.w / 2) { col = seam.c.slice(); if (seam.glow) col = col.map(v => Math.min(255, v * 1.25)); }
        if (dist && dist[y * C + x] <= trim.w) col = trim.c.slice();
        out.set([col[0] * sh, col[1] * sh, col[2] * sh, b[i * 4 + 3]], i * 4); } } }
  const c = mk(); c.getContext('2d').putImageData(new ImageData(out, W, H), 0, 0); return c;
}
// a recipe's problems (the Gear Studio shows them; the game ignores a recipe that has any)
function gearRecipeProblems(r, slots) { const out = [];
  if (!r || typeof r !== 'object') return ['not a recipe'];
  if (r.v !== GEAR_RECIPE_VERSION) out.push('version must be ' + GEAR_RECIPE_VERSION);
  if (!slots.includes(r.slot)) out.push('slot must be one of ' + slots.join(', '));
  if (!r.texture || !(GEAR_TEXTURES[r.texture] || /^assets\/[\w\/.-]+\.(png|webp|jpe?g)$/.test(r.texture))) out.push('texture must be one of ' + Object.keys(GEAR_TEXTURES).join(', ') + ', or a picture under assets/');
  for (const k of ['tint']) if (r[k] != null && !gearHex(r[k], null)) out.push(k + ' must be a colour like #7a8494');
  return out; }
