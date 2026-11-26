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
// Round 579 (owner: "don't try to trace anything exactly, this is an overlay armor piece ... straight lines or curved lines, nothing
// jagged"): the area a piece covers is not its fit template's traced outline but a few straight-edged shapes over it. In each frame
// the template is cut into bands 10px tall; each band's runs (a leg, an arm, the torso) are followed down the frame as strands, and
// each strand becomes one polygon through the middle of its bands, 3px wider than the template on every side. Where strands join or
// part (the crotch), one ends and the next begins. Returns mask data in the template's own format (red > 127 = covered).
function gearCover(m, W, H, slot) {
  const C = 256, S = 10, MG = 3, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d'); g.fillStyle = '#fff';
  for (let r = 0; r < H / C; r++) for (let col = 0; col < W / C; col++) {
    const x0 = col * C, y0 = r * C, done = []; let active = [];
    if (slot === 'belt') { // (a belt is one straight band round the waist: the rows at least 70% as wide as its widest, so a hanging pouch isn't covered)
      const rows = []; for (let y = 0; y < C; y++) { let l = -1, rr = -1; for (let x = 0; x < C; x++) if (m[((y0 + y) * W + x0 + x) * 4] > 127) { if (l < 0) l = x; rr = x; } if (l >= 0) rows.push([y, l, rr]); }
      if (!rows.length) continue; const wmax = Math.max(...rows.map(q => q[2] - q[1])), keep = rows.filter(q => q[2] - q[1] >= wmax * .7), t = keep[0], z = keep[keep.length - 1];
      const tl = Math.min(...keep.slice(0, 3).map(q => q[1])), tr = Math.max(...keep.slice(0, 3).map(q => q[2])), bl = Math.min(...keep.slice(-3).map(q => q[1])), br = Math.max(...keep.slice(-3).map(q => q[2]));
      g.beginPath(); g.moveTo(x0 + tl - 2, y0 + t[0] - 1); g.lineTo(x0 + tr + 3, y0 + t[0] - 1); g.lineTo(x0 + br + 3, y0 + z[0] + 2); g.lineTo(x0 + bl - 2, y0 + z[0] + 2); g.closePath(); g.fill(); continue; }
    for (let yb = 0; yb < C; yb += S) {
      const occ = new Uint8Array(C); let top = -1, bot = -1;
      for (let y = yb; y < Math.min(C, yb + S); y++) for (let x = 0; x < C; x++) if (m[((y0 + y) * W + x0 + x) * 4] > 127) { occ[x] = 1; if (top < 0) top = y; bot = y; }
      const runs = []; for (let x = 0; x < C; x++) if (occ[x]) { const last = runs[runs.length - 1]; if (last && x - last[1] <= 1) last[1] = x; else runs.push([x, x]); }
      const next = [], claimed = new Set();
      for (const [l, rr] of runs) { const hits = active.filter(st => { const q = st.pts[st.pts.length - 1]; return q.l <= rr + 2 && l <= q.r + 2; });
        let st = hits.length === 1 && !claimed.has(hits[0]) ? hits[0] : null; if (st) claimed.add(st); else { st = { pts: [] }; done.push(st); }
        st.pts.push({ y: yb, l, r: rr, top, bot }); next.push(st); }
      active = next; }
    for (const st of done) { const P = st.pts, f = P[0], z = P[P.length - 1], my = q => q.y + S / 2;
      const pts = [[f.l - MG, f.top - MG], ...P.map(q => [q.l - MG, my(q)]), [z.l - MG, z.bot + MG], [z.r + 1 + MG, z.bot + MG], ...P.slice().reverse().map(q => [q.r + 1 + MG, my(q)]), [f.r + 1 + MG, f.top - MG]];
      g.beginPath(); pts.forEach(([x, y], j) => j ? g.lineTo(x0 + x, y0 + Math.max(0, Math.min(C - 1, y))) : g.moveTo(x0 + x, y0 + Math.max(0, Math.min(C - 1, y)))); g.closePath(); g.fill(); } }
  const d = g.getImageData(0, 0, W, H).data; for (let i = 0; i < d.length; i += 4) { const on = d[i + 3] > 127 ? 255 : 0; d[i] = d[i + 1] = d[i + 2] = on; d[i + 3] = 255; } return d;
}
function gearRecipeRender(recipe, imgs) {
  if (recipe.armor && recipe.slot === 'shirt') return gearArmorRender(recipe, imgs); // (Round 569: built armor)
  if (recipe.slot === 'helmet') return gearHelmetRender(recipe, imgs); // (Round 571)
  const W = 2304, H = 1024, C = 256, mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
  const px = im => { const c = mk(), g = c.getContext('2d'); g.drawImage(im, 0, 0); return g.getImageData(0, 0, W, H).data; };
  const b = px(imgs.base), m = gearCover(px(imgs.mask), W, H, recipe.slot), p = px(imgs.protected); // (Round 579: an overlay shape, not the traced outline)
  // the material tile
  const n = Math.max(8, Math.round((recipe.scale || 1) * 48)), tile = document.createElement('canvas'); tile.width = tile.height = n; const tg = tile.getContext('2d');
  if (GEAR_TEXTURES[recipe.texture]) GEAR_TEXTURES[recipe.texture](tg, n); else if (imgs.texture) { const nat = /gear-textures\//.test(recipe.texture || ''), tw = nat ? Math.max(4, Math.round((imgs.texture.width || n) * (recipe.scale || 1))) : n; tile.width = tw; tile.height = Math.max(4, Math.round(tw * (imgs.texture.height || n) / (imgs.texture.width || n))); tg.drawImage(imgs.texture, 0, 0, tile.width, tile.height); } // (Round 574: a picture keeps its proportions; a gear texture draws at its own pixel size times the scale) else GEAR_TEXTURES.plain(tg, n);
  const t = tg.getImageData(0, 0, tile.width, tile.height).data, tint = gearHex(recipe.tint, [120, 128, 140]), shadeK = recipe.shade == null ? 0.8 : +recipe.shade;
  const inM = i => m[i * 4] > 127 && p[i * 4] <= 127;
  const out = new Uint8ClampedArray(W * H * 4), acc = new Uint8Array(W * H), lum = i => (0.3 * b[i * 4] + 0.59 * b[i * 4 + 1] + 0.11 * b[i * 4 + 2]) / 255;
  const trim = recipe.trim && recipe.trim.width ? { c: gearHex(recipe.trim.color, [40, 40, 48]), w: Math.min(6, Math.max(2, recipe.trim.width | 0)) } /* (Round 578: never under 2px: a 1px line blurs at the game's size) */ : null;
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
        const ti = (((y - top) % tile.height) * tile.width + ((x - left) % tile.width)) * 4, sh = b[i * 4 + 3] < 128 ? 1 : Math.max(0, 1 + (lum(i) / avg - 1) * shadeK); // (off the body: no shading to borrow)
        let col = [t[ti] / 255 * tint[0] * 1.6, t[ti + 1] / 255 * tint[1] * 1.6, t[ti + 2] / 255 * tint[2] * 1.6];
        if (bands) { const f = (y - top) / Math.max(1, bot - top); if (bands.at.some(a => Math.abs(f - a) * (bot - top) < bands.w / 2)) { col = bands.c.slice(); acc[i] = 1; } }
        if (seam && rr > rl + 6 && Math.abs(x - mid) <= seam.w / 2) { col = seam.c.slice(); acc[i] = 1; if (seam.glow) col = col.map(v => Math.min(255, v * 1.25)); }
        if (dist && dist[y * C + x] <= trim.w) col = trim.c.slice();
        // (Round 567: solid wherever the shape is, off the hero's body too; a dark rim on the shape's own edge, like his outline)
        const X = x0 + x, Y = y0 + y, edge = !inM(i - 1) || !inM(i + 1) || !inM(i - W) || !inM(i + W), k2 = b[i * 4 + 3] < 128 ? 0.92 : 1;
        if (edge) col = col.map(v => v * 0.22);
        void X; void Y; out.set([col[0] * sh * k2, col[1] * sh * k2, col[2] * sh * k2, 255], i * 4); } } }
  if (recipe.pixel) { const reg = new Uint8Array(W * H), sl = recipe.slot; // (Round 572: each piece in panels, its own per slot)
    for (let r = 0; r < 4; r++) for (let col = 0; col < 9; col++) { const x0 = col * C, y0 = r * C; let t0 = C, b0 = -1, l0 = C, r0 = -1;
      for (let y = 0; y < C; y++) for (let x = 0; x < C; x++) if (out[((y0 + y) * W + x0 + x) * 4 + 3]) { if (y < t0) t0 = y; if (y > b0) b0 = y; if (x < l0) l0 = x; if (x > r0) r0 = x; }
      if (b0 < 0) continue; const hh = Math.max(1, b0 - t0), ww = Math.max(1, r0 - l0), cx = (l0 + r0) / 2;
      for (let y = t0; y <= b0; y++) for (let x = l0; x <= r0; x++) { const i = (y0 + y) * W + x0 + x; if (!out[i * 4 + 3]) continue; const f = (y - t0) / hh; let id = 1;
        if (sl === 'pants') id = f < .1 ? 4 : f > .42 && f < .56 ? 2 : f > .86 ? 3 : (r === 0 || r === 3) && Math.abs(x - cx) < ww * .04 && f < .42 ? 5 : 1; // (waistband, knee pads, cuffs, fly seam)
        else if (sl === 'boots') id = f < .3 ? 2 : f > .64 ? 3 : 1; // (cuff, toe cap)
        else if (sl === 'gloves') id = f < .45 ? 2 : 1; // (knuckle plate)
        else if (sl === 'belt') id = Math.abs(x - cx) < ww * .12 ? 2 : 1; // (buckle)
        else if (sl === 'shirt') id = f < .2 ? 2 : 1; // (yoke)
        reg[i] = id; } }
    gearPixelize(out, reg, acc, recipe.pixel, W, H); } // (Round 570)
  const c = mk(); c.getContext('2d').putImageData(new ImageData(out, W, H), 0, 0); return c;
}
// Round 569 (owner: "I want to see if you can design armor that can be filled with texture"). Built armor: plates placed on the
// body in every frame from the shirt template's measurements (its top, waist, shoulder line and torso width per frame), not
// traced from the shirt: a chest plate, belly plates, a raised collar and pauldrons that stand past the outline. Each plate is
// filled with the recipe's texture and tint, shaded as its own hard surface (lit from the top left, a little of his shading),
// with a dark rim and a light inner edge. His bare forearms and hands stay in front of the chest; the Aetherlink stays clear.
// recipe.armor: { pauldrons: 0-1.6 (size), collar: true|false, plates: 0-3 (belly plates), trim: '#rrggbb' (plate rims),
//                 under: '#rrggbb' | false (the undersuit: the rest of the shirt, darker cloth by default) }
function gearArmorRender(recipe, imgs) {
  const W = 2304, H = 1024, C = 256, A = recipe.armor || {}, mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
  const px = im => { const c = mk(), g = c.getContext('2d'); g.drawImage(im, 0, 0); return g.getImageData(0, 0, W, H).data; };
  const b = px(imgs.base), m = gearCover(px(imgs.mask), W, H, recipe.slot), p = px(imgs.protected); // (Round 579: an overlay shape, not the traced outline)
  const pieces = mk(), pg = pieces.getContext('2d'); // each plate in its own colour: red = id
  const plate = (id, draw) => { pg.fillStyle = `rgb(${id},0,0)`; pg.beginPath(); draw(pg); pg.fill(); };
  const rrect = (g, x0, y0, x1, y1, r) => { r = Math.min(r, (x1 - x0) / 2, (y1 - y0) / 2); g.moveTo(x0 + r, y0); g.arcTo(x1, y0, x1, y1, r); g.arcTo(x1, y1, x0, y1, r); g.arcTo(x0, y1, x0, y0, r); g.arcTo(x0, y0, x1, y0, r); g.closePath(); };
  const inMask = (x, y) => m[(y * W + x) * 4] > 127;
  for (let r = 0; r < 4; r++) for (let col = 0; col < 9; col++) {
    const x0 = col * C, y0 = r * C; let top = -1, bot = -1;
    for (let y = 0; y < 170 && bot < 0; y++) { let any = false; for (let x = 0; x < C; x++) if (inMask(x0 + x, y0 + y)) { any = true; break; } if (any && top < 0) top = y; if (!any && top >= 0 && y > top + 30) bot = y - 1; }
    if (top < 0) continue; if (bot < 0) bot = 169; const Hh = bot - top;
    const extent = y => { let l = -1, rr = -1; for (let x = 0; x < C; x++) if (inMask(x0 + x, y0 + y)) { if (l < 0) l = x; rr = x; } return [l, rr]; };
    // the torso's width a little above the waist (below the sleeves), its middle, and the shoulder line
    const ts = [.68, .72, .76].map(f => extent(top + Math.round(Hh * f))).filter(e => e[0] >= 0), tl = Math.min(...ts.map(e => e[0])), tr = Math.max(...ts.map(e => e[1]));
    const cx = (tl + tr) / 2, w = tr - tl, sy = top + Hh * .21, [sl, sr] = extent(Math.round(sy)), side = r === 1 || r === 2, X = x => x0 + x, Y = y => y0 + y;
    const n = Math.max(0, Math.min(3, A.plates == null ? 2 : A.plates | 0)), chestBot = top + Hh * (n ? .6 : .9);
    // Round 573 (owner, with a line-art armoured hero: "Can you get to this level of detail"): the faceted style: angular
    // pectoral plates either side of a keel, chevron belly segments split down the middle, an angular gorget, shoulder guards in
    // three angular tiers. Side views: a profile chest plate and slanted segments.
    // Round 575 (owner: "Shoulder pads need to be bigger to cover the shoulders entirely"): each pad is sized to its sleeve: from a
    // little inside the torso's edge to past the sleeve's outer edge, and from the top of the shoulder to below the sleeve's hem.
    // Side views: from the chest's middle to past the back at the shoulder line. pads: [x of the inner edge, outer edge, top, bottom, sign].
    const ps = A.pauldrons == null ? 1 : +A.pauldrons, pads = [];
    if (ps > 0) { const run = (x, y, d) => { while (y > 2 && y < 200 && inMask(x0 + Math.round(x), y0 + y + d)) y += d; return y; };
      if (side) { const fw = r === 1 ? -1 : 1, back = fw > 0 ? sl : sr, hh = (Hh * .13 + 3) * Math.max(.6, ps); pads.push([cx + fw * w * .22, back - fw * 11, sy - hh * 1.3, sy + hh * 1.6, -fw]); } // (side: from just before the chest's middle to past the back)
      else for (const [sg, e, t2] of [[-1, sl, tl], [1, sr, tr]]) { const sleeve = Math.abs(t2 - e) > 5, xs = sleeve ? (e + t2) / 2 : t2 - sg * 3;
        const yt = run(xs, Math.round(sy), -1), yb = sleeve ? Math.min(top + Hh * .62, run(xs, Math.round(sy), 1)) : sy + Hh * .14;
        const ext = (Math.max(6, Math.abs(t2 - e)) + 8) * Math.max(.6, ps), dn = (yb - yt) * Math.max(.6, ps);
        pads.push([t2 - sg * 7, t2 - sg * 7 + sg * (ext * 1.35 + 8), yt - 9, yt + dn * 1.15 + 8, sg]); } } // (owner, again: "larger than the character's shoulders": a third wider, rising above the shoulder)
    // Round 575 (owner's second reference, a horned knight): an armoured skirt under the belt: a pointed tabard down the middle and
    // a plate over each hip (side views: one hip plate and the tabard's edge). Ids under 40, so his hands stay in front of it.
    if (A.skirt) { const sp = (id, pts) => plate(id, g => { pts.forEach(([a2, b2], j) => j ? g.lineTo(X(a2), Y(b2)) : g.moveTo(X(a2), Y(b2))); g.closePath(); }), y1 = bot - 4, L2 = Hh * .55;
      if (!side) { sp(35, [[cx - w * .19, y1], [cx + w * .19, y1], [cx + w * .16, y1 + L2 * .85], [cx, y1 + L2], [cx - w * .16, y1 + L2 * .85]]);
        for (const [id, sg] of [[36, -1], [37, 1]]) sp(id, [[cx + sg * w * .21, y1], [cx + sg * w * .5, y1], [cx + sg * w * .56, y1 + L2 * .55], [cx + sg * w * .25, y1 + L2 * .62]]); }
      else { const fw = r === 1 ? -1 : 1; sp(36, [[cx - w * .36, y1], [cx + w * .3, y1], [cx + w * .36, y1 + L2 * .55], [cx - w * .42, y1 + L2 * .55]]);
        sp(35, [[cx + fw * w * .28, y1], [cx + fw * w * .48, y1], [cx + fw * w * .5, y1 + L2 * .85], [cx + fw * w * .34, y1 + L2 * .92]]); } }
    if (A.style === 'faceted') {
      const poly = (id, pts) => plate(id, g => { pts.forEach(([px2, py2], j) => j ? g.lineTo(X(px2), Y(py2)) : g.moveTo(X(px2), Y(py2))); g.closePath(); });
      const t = top + Hh * (side ? .14 : .1), mid = top + Hh * .42, l = cx - w / 2 - 2, rt = cx + w / 2 + 2, fwd = r === 1 ? -1 : 1, mir = pts => pts.map(([a, b2]) => [2 * cx - a, b2]);
      const segs = Math.max(2, n || 3), v = Hh * .04;
      if (!side) { const ul = Math.min(l, sl + w * .16), lp = [[cx - 2, t + 2], [ul + 3, t], [ul, t + Hh * .1], [l + 1, mid - Hh * .04], [cx - w * .12, mid + Hh * .03], [cx - 2, mid - Hh * .03]];
        poly(20, lp); poly(21, mir(lp)); poly(23, [[cx, t - 1], [cx + w * .07, t + Hh * .1], [cx + w * .05, mid], [cx, mid + Hh * .07], [cx - w * .05, mid], [cx - w * .07, t + Hh * .1]]);
        if (r === 0) plate(61, g => { const ey = t + Hh * .16, er = Math.max(2, w * .035); g.moveTo(X(cx), Y(ey - er)); g.lineTo(X(cx + er), Y(ey)); g.lineTo(X(cx), Y(ey + er)); g.lineTo(X(cx - er), Y(ey)); g.closePath(); });
        for (let k = 0; k < segs; k++) { const y1 = mid + Hh * .07 + k * (bot - mid - Hh * .07) / segs, y2 = y1 + (bot - mid - Hh * .07) / segs - 2, hw = w * (.44 - .05 * k);
          const lb = [[cx - 1, y1 + v], [cx - hw, y1], [cx - hw + 2, y2], [cx - 1, y2 + v]]; poly(10 + k, lb); poly(15 + k, mir(lb)); }
        if (A.collar !== false) poly(30, [[cx - w * .26, top + Hh * .02], [cx + w * .26, top + Hh * .02], [cx + w * .17, top + Hh * .12], [cx - w * .17, top + Hh * .12]]); }
      else { const front = cx + fwd * (w / 2 + 2), back = cx - fwd * w / 2;
        poly(20, [[back, t + 4], [cx, t], [front - fwd * 3, t + Hh * .06], [front, mid - Hh * .06], [front - fwd * w * .15, mid + Hh * .04], [back, mid]]);
        for (let k = 0; k < segs; k++) { const y1 = mid + Hh * .06 + k * (bot - mid - Hh * .06) / segs, y2 = y1 + (bot - mid - Hh * .06) / segs - 2;
          poly(10 + k, [[back, y1], [front - fwd * k * 2, y1 + v], [front - fwd * k * 2, y2 + v], [back, y2]]); }
        if (A.collar !== false) poly(30, [[back, top + Hh * .08], [front, top + Hh * .06], [front - fwd * 3, top + Hh * .16], [back + fwd * 2, top + Hh * .16]]); }
      pads.forEach(([xi, xo, yt, yb, sg], k) => { const rx = Math.abs(xo - xi) / 1.9, ry = (yb - yt) / 2.8, ax = xi + sg * .8 * rx, ay = yt + ry * 1.1, P = (fx, fy) => [ax + sg * rx * fx, ay + ry * fy];
        poly(46 + k, [P(-.6, .9), P(1.05, 1.1), P(.9, 1.7), P(-.4, 1.6)]);
        poly(44 + k, [P(-.7, .2), P(1.1, .45), P(1.0, 1.2), P(-.6, 1.05)]);
        poly(40 + k, [P(-.8, -1.1), P(.85, -.75), P(1.1, .35), P(.3, .55), P(-.8, .2)]); });
      continue; }
    // belly plates, narrowing toward the waist
    for (let k = 0; k < n; k++) { const ya = chestBot + 1 + k * (bot - chestBot) / n, yb = chestBot + (k + 1) * (bot - chestBot) / n - 1, s2 = 1 - .06 * (k + 1);
      plate(10 + k, g => rrect(g, X(cx - w * s2 / 2 - 1), Y(ya), X(cx + w * s2 / 2 + 1), Y(yb), 3));
      if (!side) { pg.save(); pg.beginPath(); rrect(pg, X(cx - w * s2 / 2 - 1), Y(ya), X(cx + w * s2 / 2 + 1), Y(yb), 3); pg.clip(); pg.fillStyle = `rgb(${15 + k},0,0)`; pg.fillRect(X(cx), Y(0), C, C); pg.restore(); } } // (Round 572: split down the middle)
    // the chest plate: wider than the torso, a point at its foot facing toward or away from us
    const chestPath = g => { const l = cx - w / 2 - 2, rt = cx + w / 2 + 2, t = top + Hh * (side ? .16 : .1), bt = chestBot;
      const ul = side ? l : Math.min(l, sl + w * .18), ur = side ? rt : Math.max(rt, sr - w * .18); // (front and back: wider at the shoulders)
      g.moveTo(X(ul + 4), Y(t)); g.lineTo(X(ur - 4), Y(t)); g.quadraticCurveTo(X(ur + 1), Y(t + 2), X(ur), Y(t + 8)); g.lineTo(X(rt), Y(bt - 4));
      if (!side) { g.lineTo(X(cx + w * .2), Y(bt)); g.lineTo(X(cx), Y(bt + 3)); g.lineTo(X(cx - w * .2), Y(bt)); } else g.lineTo(X(rt - 3), Y(bt));
      g.lineTo(X(l), Y(bt - 4)); g.lineTo(X(ul), Y(t + 8)); g.quadraticCurveTo(X(ul - 1), Y(t + 2), X(ul + 4), Y(t)); g.closePath(); };
    plate(20, chestPath);
    // (Round 572: the chest in panels: left and right pectoral plates, a lower plate; a small emblem at its heart)
    pg.save(); pg.beginPath(); chestPath(pg); pg.clip(); if (!side) { pg.fillStyle = 'rgb(21,0,0)'; pg.fillRect(X(cx), Y(0), C, C); }
    pg.fillStyle = 'rgb(22,0,0)'; pg.fillRect(X(0), Y(top + Hh * .4), C, C); pg.restore();
    if (r === 0) plate(61, g => { const ey = top + Hh * .32, er = Math.max(3, w * .07); g.moveTo(X(cx), Y(ey - er)); g.lineTo(X(cx + er), Y(ey)); g.lineTo(X(cx), Y(ey + er)); g.lineTo(X(cx - er), Y(ey)); g.closePath(); });
    // the collar: a raised band at the neck
    if (A.collar !== false) plate(30, g => rrect(g, X(cx - w * (side ? .22 : .2)), Y(top + Hh * (side ? .08 : .03)), X(cx + w * (side ? .22 : .2)), Y(top + Hh * (side ? .17 : .11)), 2));
    // pauldrons: at each shoulder (one, at the near shoulder, in the side views), past the outline
    pads.forEach(([xi, xo, yt, yb, sg], k) => { const ax = (xi + xo) / 2, rx = Math.abs(xo - xi) / 2, ry = (yb - yt) / 2, tilt = side ? 0 : sg * .25;
      plate(46 + k, g => g.ellipse(X(ax + sg * 2), Y(yt + ry * 1.55), rx * .8, ry * .42, tilt, 0, Math.PI * 2));
      plate(44 + k, g => g.ellipse(X(ax + sg * 1), Y(yt + ry * 1.2), rx * .9, ry * .5, tilt, 0, Math.PI * 2)); // (Round 572: lames below each pauldron; Round 575: three tiers)
      plate(40 + k, g => g.ellipse(X(ax), Y(yt + ry * .72), rx, ry * .72, tilt, 0, Math.PI * 2)); }); }
  const pd = pg.getImageData(0, 0, W, H).data, id = i => pd[i * 4 + 3] > 127 ? pd[i * 4] : 0;
  // what stays in front: bare skin that isn't shirt (forearms, hands) over the chest and belly; the Aetherlink everywhere
  const skin = i => { const R = b[i * 4], G = b[i * 4 + 1], B = b[i * 4 + 2]; return b[i * 4 + 3] > 200 && m[i * 4] <= 127 && R > G && G > B && R - B > 40 && R > 110; };
  const carve = (i, k) => k < 35 && skin(i); // (Round 579: the skirt (35-37) is an overlay: never cut) // (Round 575: the skirt (35-37) lies over his khaki trousers, which pass the loose skin test; only real skin, his hands, stays in front)
  const n2 = Math.max(8, Math.round((recipe.scale || 1) * 48)), tile = document.createElement('canvas'); tile.width = tile.height = n2; const tg = tile.getContext('2d');
  if (GEAR_TEXTURES[recipe.texture]) GEAR_TEXTURES[recipe.texture](tg, n2); else if (imgs.texture) { const nat = /gear-textures\//.test(recipe.texture || ''), tw = nat ? Math.max(4, Math.round((imgs.texture.width || n2) * (recipe.scale || 1))) : n2; tile.width = tw; tile.height = Math.max(4, Math.round(tw * (imgs.texture.height || n2) / (imgs.texture.width || n2))); tg.drawImage(imgs.texture, 0, 0, tile.width, tile.height); } // (Round 574: a picture keeps its proportions; a gear texture draws at its own pixel size times the scale) else GEAR_TEXTURES.plain(tg, n2);
  const t = tg.getImageData(0, 0, tile.width, tile.height).data, tint = gearHex(recipe.tint, [120, 128, 140]), rim = gearHex(A.trim, [24, 20, 16]), shadeK = recipe.shade == null ? .35 : Math.min(.6, +recipe.shade * .4);
  const lum = i => (.3 * b[i * 4] + .59 * b[i * 4 + 1] + .11 * b[i * 4 + 2]) / 255;
  const out = new Uint8ClampedArray(W * H * 4);
  // each plate's box, for its own light
  const box = {}; for (let i = 0; i < W * H; i++) { const k = id(i); if (!k) continue; const cell = Math.floor(Math.floor(i / W) / C) * 9 + Math.floor((i % W) / C), key = cell * 100 + k, x = i % W, y = Math.floor(i / W);
    const q = box[key] || (box[key] = [x, y, x, y]); if (x < q[0]) q[0] = x; if (y < q[1]) q[1] = y; if (x > q[2]) q[2] = x; if (y > q[3]) q[3] = y; }
  // the undersuit: the rest of the shirt (sleeves, sides) in a darker cloth of the armor's colour, with his own folds
  const under = A.under === false ? null : gearHex(A.under, tint.map(v => v * .55));
  if (under) for (let i = 0; i < W * H; i++) { if (m[i * 4] <= 127 || p[i * 4] > 127 || skin(i)) continue; const sh = b[i * 4 + 3] > 128 ? .55 + lum(i) * 1.6 : 1, edge = [i - 1, i + 1, i - W, i + W, i - 2, i + 2, i - 2 * W, i + 2 * W].some(j => m[j * 4] <= 127); // (Round 578: 2px)
    const col = edge ? rim : under.map(v => v * sh); out.set([col[0], col[1], col[2], 255], i * 4); }
  for (let i = 0; i < W * H; i++) { const k = id(i); if (!k || p[i * 4] > 127) continue; if (carve(i, k)) continue; // (his face, forearms and hands stay in front of the collar, chest and belly)
    const x = i % W, y = Math.floor(i / W), cell = Math.floor(y / C) * 9 + Math.floor(x / C), q = box[cell * 100 + k], fx = (x - q[0]) / Math.max(1, q[2] - q[0]), fy = (y - q[1]) / Math.max(1, q[3] - q[1]);
    const ti = (((y - q[1]) % tile.height) * tile.width + ((x - q[0]) % tile.width)) * 4, light = 1.18 - .32 * (fx * .4 + fy * .6), hero = b[i * 4 + 3] > 128 ? 1 + (lum(i) - .35) * shadeK : 1;
    let col = [t[ti] / 255 * tint[0] * 1.6, t[ti + 1] / 255 * tint[1] * 1.6, t[ti + 2] / 255 * tint[2] * 1.6].map(v => v * light * hero);
    const nb = [i - 1, i + 1, i - W, i + W, i - 2, i + 2, i - 2 * W, i + 2 * W], edge = nb.some(j => id(j) !== k), /* (Round 578: a 2px rim) */ inner = !edge && [i - W - 1, i - W, i - W + 1, i - 1].some(j => id(j) !== k) && fy < .5;
    if (edge) col = rim.slice(); else if (inner) col = col.map(v => Math.min(255, v * 1.35 + 18));
    out.set([col[0], col[1], col[2], 255], i * 4); }
  if (recipe.pixel) { const reg = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) { if (!out[i * 4 + 3]) continue; const k = id(i); reg[i] = k && p[i * 4] <= 127 && !carve(i, k) ? k : 99; }
    const em = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) if (reg[i] === 61) em[i] = 1; gearPixelize(out, reg, em, recipe.pixel, W, H, r => r === 99); } // (Round 570: plates in the set style, the undersuit dark with no accent)
  const c = mk(); c.getContext('2d').putImageData(new ImageData(out, W, H), 0, 0); return c;
}
// Round 570 (owner: "Can you build something more like this", a sheet of pixel-art armour sets): the set style. A recipe with
// `pixel: { dark, base, light, accent }` is drawn as flat pixel art: each region (a plate, the undersuit, a template piece) in three
// flat tones from its own light, a black outline round it, and a neon accent line two pixels inside the outline (not on the
// undersuit); bands and seams are drawn in the accent colour. GEAR_SETS: palettes that dress every slot alike.
const GEAR_SETS = {
  crimson: { name: 'Crimson mech', dark: '#3a1820', base: '#b3303a', light: '#efe6e2', accent: '#ff5a64' },
  venom: { name: 'Venom neon', dark: '#0f1a16', base: '#1f3a2c', light: '#3d6b4c', accent: '#3cff6a' },
  goldline: { name: 'Gold line', dark: '#111118', base: '#26263a', light: '#3f3f58', accent: '#ffcc33' },
  bone: { name: 'Bone', dark: '#3a3a44', base: '#d6d4cc', light: '#ffffff', accent: '#ff3048' },
  frost: { name: 'Frost', dark: '#1a2232', base: '#3c4c68', light: '#8494b4', accent: '#4ff0ff' },
  dune: { name: 'Dune', dark: '#3a2a18', base: '#9a7646', light: '#d8b47a', accent: '#33d1c0' },
};
function gearPixelize(out, reg, acc, pal, W, H, noAccent, ink) { // (Round 572: ink = drawn black lines, rivets inside each panel)
  const D = gearHex(pal.dark, [30, 30, 40]), B = gearHex(pal.base, [80, 80, 100]), L = gearHex(pal.light, [160, 160, 180]), A = gearHex(pal.accent, [80, 240, 255]), K = [12, 10, 16];
  // light, smoothed over 7x7 within the region, so the tones form broad shapes instead of speckle
  const raw = new Float32Array(W * H); for (let i = 0; i < W * H; i++) raw[i] = reg[i] ? .3 * out[i * 4] + .59 * out[i * 4 + 1] + .11 * out[i * 4 + 2] : 0;
  const box = (src, horiz) => { const dst = new Float32Array(W * H), R = 3; for (let i = 0; i < W * H; i++) { if (!reg[i]) continue; let t = 0, n = 0; for (let k = -R; k <= R; k++) { const j = horiz ? i + k : i + k * W; if (j >= 0 && j < W * H && reg[j] === reg[i] && (!horiz || Math.floor(j / W) === Math.floor(i / W))) { t += src[j]; n++; } } dst[i] = t / n; } return dst; };
  const sm = box(box(raw, true), false), lum = i => sm[i];
  // each region's mean light, per 256px frame
  const sum = new Map(); for (let i = 0; i < W * H; i++) { const r = reg[i]; if (!r) continue; const key = r * 64 + Math.floor(Math.floor(i / W) / 256) * 9 + Math.floor((i % W) / 256); const q = sum.get(key) || [0, 0]; q[0] += lum(i); q[1]++; sum.set(key, q); }
  // distance to the region's edge, up to 9
  const d = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) { if (!reg[i]) continue; const x = i % W; if (x === 0 || x === W - 1 || reg[i - 1] !== reg[i] || reg[i + 1] !== reg[i] || reg[i - W] !== reg[i] || reg[i + W] !== reg[i]) d[i] = 1; }
  for (let k = 2; k <= 9; k++) for (let i = W; i < W * H - W; i++) if (reg[i] && !d[i] && (d[i - 1] === k - 1 || d[i + 1] === k - 1 || d[i - W] === k - 1 || d[i + W] === k - 1)) d[i] = k;
  for (let i = 0; i < W * H; i++) { const r = reg[i]; if (!r) continue; const key = r * 64 + Math.floor(Math.floor(i / W) / 256) * 9 + Math.floor((i % W) / 256), q = sum.get(key), v = lum(i) / Math.max(1, q[0] / q[1]), under = noAccent && noAccent(r);
    let c = v < .86 ? D : v > 1.16 ? L : B; if (under) c = v > 1.14 ? B : D;
    // (Round 578, owner: "The outlines need to be more crisp": the hero is shown at a third of this size, so a 1px line blurred
    // into the plate. Outline 2px, the accent a solid 2px line two pixels inside it: about one screen pixel each)
    if ((d[i] && d[i] <= 2) || (ink && ink[i])) c = K; /* (d 0 = deeper than 9: the plate's middle) */ else if (acc[i]) c = A; else if ((d[i] === 5 || d[i] === 6) && !under) c = A;
    else if (d[i] === 8 && !under && ((i % W) + Math.floor(i / W)) % 11 === 0) c = L; // (rivets along each panel's inner ring)
    else if (d[i] === 3 && !under && d[i - W] === 2) c = L; // (Round 573: a highlight along each panel's top edge)
    out[i * 4] = c[0]; out[i * 4 + 1] = c[1]; out[i * 4 + 2] = c[2]; out[i * 4 + 3] = 255; } }
// Round 571 (owner: "add helmet slot but use the design for your outlines of our armor vector graphics"): a helmet built over
// his head in every frame, from the helmet template (his head above the shirt): a shell covering hair and face, and by style
//   visor  a glowing band across the eyes (front), on the facing half (sides), a crest line behind;
//   mask   two glowing eye lenses and a breathing grille;
//   knight a narrow eye slit and a raised crest down the middle.
// Drawn in the set style (gearPixelize): the recipe's `pixel` palette, or one made from its tint; the lenses in the accent colour.
function gearHelmetRender(recipe, imgs) {
  const W = 2304, H = 1024, C = 256, Hm = recipe.helmet || {}, style = Hm.style || 'visor', mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
  const px = im => { const c = mk(), g = c.getContext('2d'); g.drawImage(im, 0, 0); return g.getImageData(0, 0, W, H).data; };
  const m = px(imgs.mask), shell = mk(), sg = shell.getContext('2d'), lens = mk(), lg = lens.getContext('2d');
  const rrect = (g, x0, y0, x1, y1, r) => { r = Math.min(r, (x1 - x0) / 2, (y1 - y0) / 2); g.moveTo(x0 + r, y0); g.arcTo(x1, y0, x1, y1, r); g.arcTo(x1, y1, x0, y1, r); g.arcTo(x0, y1, x0, y0, r); g.arcTo(x0, y0, x1, y0, r); g.closePath(); };
  sg.fillStyle = lg.fillStyle = '#fff'; const pgxC = mk(), pgx = pgxC.getContext('2d'), inkC = mk(), ig = inkC.getContext('2d');
  for (let r = 0; r < 4; r++) for (let col = 0; col < 9; col++) {
    const x0 = col * C, y0 = r * C; let L = C, R = -1, T = C, B = -1;
    for (let y = 0; y < 180; y++) for (let x = 0; x < C; x++) if (m[((y0 + y) * W + x0 + x) * 4] > 127) { if (x < L) L = x; if (x > R) R = x; if (y < T) T = y; if (y > B) B = y; }
    if (R < 0) continue; const h = B - T, w = R - L, cx = (L + R) / 2, X = x => x0 + x, Y = y => y0 + y, side = r === 1 || r === 2, fwd = r === 1 ? -1 : 1, eye = T + h * .5;
    // the shell: hair and face covered, its foot a little above the shirt's collar
    { const a = L - 2, z = R + 2, top = T - 2, bot = B + 1, mid = eye + h * .16, jaw = side ? w * .36 : w * .3, jx = side ? cx + fwd * w * .08 : cx; // (a dome, straight sides, a jaw guard tapering to the collar)
      sg.beginPath(); sg.moveTo(X(a), Y(mid)); sg.lineTo(X(a), Y(top + h * .3)); sg.lineTo(X(a + w * .2), Y(top)); sg.lineTo(X(z - w * .2), Y(top)); sg.lineTo(X(z), Y(top + h * .3)); // (Round 573: faceted)
      sg.lineTo(X(z), Y(mid)); sg.lineTo(X(jx + jaw), Y(bot)); sg.lineTo(X(jx - jaw), Y(bot)); sg.closePath(); sg.fill();
      // (seams: a brow line, cheek plates from the eyes to the jaw)
      if (r !== 3) { ig.strokeStyle = '#fff'; ig.lineWidth = 1; ig.beginPath(); if (!side) { ig.moveTo(X(a + 3), Y(eye - h * .2)); ig.lineTo(X(cx), Y(eye - h * .13)); ig.lineTo(X(z - 3), Y(eye - h * .2));
          ig.moveTo(X(L + w * .1), Y(eye + h * .08)); ig.lineTo(X(jx - jaw + 2), Y(bot - 2)); ig.moveTo(X(R - w * .1), Y(eye + h * .08)); ig.lineTo(X(jx + jaw - 2), Y(bot - 2)); }
        else { ig.moveTo(X(cx - fwd * w * .1), Y(top + 3)); ig.lineTo(X(cx - fwd * w * .1), Y(bot - 3)); ig.moveTo(X(cx + fwd * w * .1), Y(eye + h * .1)); ig.lineTo(X(jx + fwd * jaw * .6), Y(bot - 1)); } ig.stroke(); } }
    lg.beginPath();
    if (r === 3) { if (style === 'knight' || style === 'visor') lg.rect(X(cx - 1.5), Y(T + 1), 3, h * .62); } // (behind: a crest line)
    else if (style === 'visor') { if (side) { lg.moveTo(X(cx), Y(eye - h * .1)); lg.lineTo(X(fwd < 0 ? L - 1 : R + 1), Y(eye - h * .04)); lg.lineTo(X(fwd < 0 ? L - 1 : R + 1), Y(eye + h * .08)); lg.lineTo(X(cx), Y(eye + h * .1)); lg.closePath(); } else { lg.moveTo(X(L + w * .08), Y(eye - h * .12)); lg.lineTo(X(cx), Y(eye - h * .03)); lg.lineTo(X(R - w * .08), Y(eye - h * .12)); lg.lineTo(X(R - w * .06), Y(eye + h * .04)); lg.lineTo(X(cx), Y(eye + h * .13)); lg.lineTo(X(L + w * .06), Y(eye + h * .04)); lg.closePath(); } } // (Round 573: a V visor)
    else if (style === 'mask') { const er = Math.max(3, w * .12); if (side) lg.ellipse(X(cx + fwd * w * .26), Y(eye), er, er * .8, 0, 0, 7); else { lg.ellipse(X(cx - w * .22), Y(eye), er, er * .8, 0, 0, 7); lg.moveTo(X(cx + w * .22 + er), Y(eye)); lg.ellipse(X(cx + w * .22), Y(eye), er, er * .8, 0, 0, 7);
        for (let k = -1; k <= 1; k++) { lg.moveTo(0, 0); lg.rect(X(cx + k * w * .1 - 1), Y(eye + h * .2), 2, h * .14); } } }
    else { lg.rect(side ? (fwd < 0 ? X(L - 1) : X(cx)) : X(L + w * .14), Y(eye - 1.5), side ? w / 2 + 1 : w * .72, 3); if (!side) lg.rect(X(cx - 1.5), Y(T + 1), 3, eye - T - 2); }
    lg.fill();
    // (Round 572: ear pods, a crest ridge over the dome, cheek vents and an antenna)
    const er = Math.max(3, w * .13), pods = side ? [[cx - fwd * w * .12, eye + 1]] : [[L - 1, eye + 1], [R + 1, eye + 1]];
    pgx.fillStyle = 'rgb(2,0,0)'; pgx.beginPath(); for (const [ex, ey] of pods) { pgx.moveTo(X(ex + er), Y(ey)); pgx.ellipse(X(ex), Y(ey), er, er * 1.25, 0, 0, 7); } pgx.fill();
    if (style !== 'knight') { pgx.fillStyle = 'rgb(3,0,0)'; pgx.beginPath(); if (side) pgx.rect(X(cx - w * .32), Y(T + 1), w * .5, h * .12); else rrect(pgx, X(cx - w * .09), Y(T - 1), X(cx + w * .09), Y(eye - h * .14), 2); pgx.fill(); }
    // (Round 575, owner's horned knight: horns curving out and up from the dome, in place of the antenna)
    if (Hm.horns) { pgx.fillStyle = 'rgb(5,0,0)'; pgx.beginPath();
      const horn = (bx, by, sg, up) => { const tx = bx + sg * w * .3, ty = by - h * up; pgx.moveTo(X(bx - sg * w * .1), Y(by + h * .06)); pgx.quadraticCurveTo(X(bx + sg * w * .5), Y(by + h * .02), X(tx), Y(ty));
        pgx.quadraticCurveTo(X(bx + sg * w * .2), Y(by - h * .06), X(bx + sg * w * .08), Y(by - h * .1)); pgx.closePath(); };
      if (side) horn(cx - fwd * w * .05, T + h * .2, fwd, .52); else { horn(L + w * .12, T + h * .2, -1, .5); horn(R - w * .12, T + h * .2, 1, .5); } pgx.fill(); }
    else { pgx.fillStyle = 'rgb(4,0,0)'; pgx.beginPath(); const ax = side ? cx - fwd * w * .3 : R - w * .12; pgx.rect(X(ax - 1), Y(T - h * .28), 2, h * .3); pgx.rect(X(ax - 2), Y(T - h * .3), 4, 3); pgx.fill(); }
    ig.fillStyle = '#fff'; ig.beginPath(); for (let k = 0; k < 3; k++) { const vy = eye + h * .2 + k * 3; if (side) ig.rect(X(cx + fwd * w * .12 - w * .08), Y(vy), w * .16, 1); else if (style !== 'mask') { ig.rect(X(cx - w * .34), Y(vy), w * .14, 1); ig.rect(X(cx + w * .2), Y(vy), w * .14, 1); } } ig.fill(); }
  const sd = sg.getImageData(0, 0, W, H).data, ld = lg.getImageData(0, 0, W, H).data, out = new Uint8ClampedArray(W * H * 4), reg = new Uint8Array(W * H), acc = new Uint8Array(W * H);
  const xd = pgxC.getContext('2d').getImageData(0, 0, W, H).data, idd = inkC.getContext('2d').getImageData(0, 0, W, H).data, ink = new Uint8Array(W * H);
  const p = px(imgs.protected), b = px(imgs.base), tint = gearHex(recipe.tint, [90, 96, 110]);
  for (let i = 0; i < W * H; i++) { const xr = xd[i * 4 + 3] > 127 ? xd[i * 4] : 0; if ((sd[i * 4 + 3] < 128 && !xr) || p[i * 4] > 127) continue; reg[i] = xr || 1; if (ld[i * 4 + 3] > 127 && !xr) acc[i] = 1; if (idd[i * 4 + 3] > 127 && sd[i * 4 + 3] >= 128) ink[i] = 1;
    const y = Math.floor(i / W) % C, f = 1.2 - .5 * (y % 256) / 120, v = b[i * 4 + 3] > 128 ? .85 + .3 * (.3 * b[i * 4] + .59 * b[i * 4 + 1] + .11 * b[i * 4 + 2]) / 255 : 1; // (lit from above, a touch of his shading)
    out.set([tint[0] * f * v, tint[1] * f * v, tint[2] * f * v, 255], i * 4); }
  const pal = recipe.pixel || { dark: '#' + tint.map(v => Math.round(v * .5).toString(16).padStart(2, '0')).join(''), base: recipe.tint || '#5a6070', light: '#' + tint.map(v => Math.min(255, Math.round(v * 1.45)).toString(16).padStart(2, '0')).join(''), accent: (recipe.seam && recipe.seam.color) || '#4ff0ff' };
  gearPixelize(out, reg, acc, pal, W, H, null, ink);
  const c = mk(); c.getContext('2d').putImageData(new ImageData(out, W, H), 0, 0); return c;
}
// a recipe's problems (the Gear Studio shows them; the game ignores a recipe that has any)
function gearRecipeProblems(r, slots) { const out = [];
  if (!r || typeof r !== 'object') return ['not a recipe'];
  if (r.v !== GEAR_RECIPE_VERSION) out.push('version must be ' + GEAR_RECIPE_VERSION);
  if (!slots.includes(r.slot)) out.push('slot must be one of ' + slots.join(', '));
  if (!r.texture || !(GEAR_TEXTURES[r.texture] || /^assets\/[\w\/.-]+\.(png|webp|jpe?g)$/.test(r.texture))) out.push('texture must be one of ' + Object.keys(GEAR_TEXTURES).join(', ') + ', or a picture under assets/');
  if (r.armor && r.slot !== 'shirt') out.push('armor is built on the shirt slot');
  for (const k of ['tint']) if (r[k] != null && !gearHex(r[k], null)) out.push(k + ' must be a colour like #7a8494');
  return out; }
