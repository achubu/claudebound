'use strict';
// =====================================================================
// Round 149: SOLARIS, world 2 (the region id stays 'elaris' so saves and
// progress carry over; "Elaris" is kept for a later world).
// 54 rooms on a 9x6 grid (Neon Aftermath's layout mirrored top-to-bottom),
// painted from a small kit of room tiles that are flipped to fit each room:
// tools/build_solaris.py picks a tile and flip per room, traces the streets
// and writes assets/solaris-data.js (SOLARIS_PLAN, SOLARIS_WORLD mask).
// Rooms use the same painted-world engine as Neon Aftermath: you walk the
// traced streets and leave by any street that reaches an edge.
// =====================================================================
const solarisBits = (() => {
  const abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/', src = SOLARIS_WORLD.mask, n = SOLARIS_WORLD.maskW * SOLARIS_WORLD.maskH, bits = new Uint8Array(n);
  for (let i = 0; i < n; i++) bits[i] = (abc.indexOf(src[Math.floor(i / 6)]) >> (5 - i % 6)) & 1;
  return bits;
})();
function solarisWalk(wx, wy) {
  const mx = Math.floor(wx / SOLARIS_WORLD.cell), my = Math.floor(wy / SOLARIS_WORLD.cell);
  return mx >= 0 && my >= 0 && mx < SOLARIS_WORLD.maskW && my < SOLARIS_WORLD.maskH && solarisBits[my * SOLARIS_WORLD.maskW + mx] === 1;
}
ORGANIC_AREAS['world:elaris'] = {
  src: 'solaris-world', world: true,
  at(o, ax, ay) { if (ay >= 0 && ay < 500) ay = Math.min(ay, 495); return solarisWalk(o.area.left * 800 + ax, o.area.top * 500 + ay); },
};
// The world walk test answers for whichever painted world you are in (the stylized map uses it).
const neonWorldWalkBeforeSolaris = neonWorldWalk;
neonWorldWalk = function (wx, wy) { return activeRegion === 'elaris' ? solarisWalk(wx, wy) : neonWorldWalkBeforeSolaris(wx, wy); };
// Crossings to and from Solaris rooms are loose, like Neon's painted rooms.
const neonLooseBeforeSolaris = neonLoose;
neonLoose = function (from, to) { return activeRegion === 'elaris' ? !!(SOLARIS_PLAN[from] || SOLARIS_PLAN[to]) : neonLooseBeforeSolaris(from, to); };
// The old Elaris districts, diagonal rooms and painted blocks don't apply to the new grid.
if (typeof JOINED_AREAS !== 'undefined' && JOINED_AREAS.elaris) JOINED_AREAS.elaris.length = 0;
for (const k of Object.keys(ORGANIC_AREAS)) if (k.startsWith('elaris:')) delete ORGANIC_AREAS[k];
if (typeof DIAG_ART !== 'undefined') delete DIAG_ART.elaris;
if (typeof DIAG_MASK_SRC !== 'undefined') delete DIAG_MASK_SRC.elaris;
if (typeof CITY_BLOCK_ARTS !== 'undefined') delete CITY_BLOCK_ARTS.elaris;
if (typeof regionDistanceCache !== 'undefined') delete regionDistanceCache.elaris;

// --- Ground: the room's tile, flipped as planned. Tiles not painted yet use stand-ins cut
// from the real tiles (SOLARIS_PLACEHOLDERS); drop a new painting into
// assets/environment/solaris/src/ and re-run the tool to replace one.
const solarisImages = {};
function solarisTile(name) {
  let img = solarisImages[name];
  if (!img) { img = new Image(); img.src = 'assets/environment/solaris/' + name + '.webp'; solarisImages[name] = img; }
  return img;
}
function paintSolaris(canvas, key) {
  const plan = SOLARIS_PLAN[key]; if (!plan) return false;
  const [name, fx, fy] = plan, img = solarisTile(name);
  if (!(img.complete && img.naturalWidth)) {
    if (canvas.dataset) canvas.dataset.pending = '1'; canvas.pendingImage = img;
    if (img.addEventListener) img.addEventListener('load', () => { if (canvas.isConnected) paintSolaris(canvas, key); }, { once: true });
    return false;
  }
  canvas.width = img.naturalWidth; canvas.height = Math.round(img.naturalWidth * 5 / 8);
  if (canvas.style) { canvas.style.imageRendering = 'auto'; canvas.style.filter = 'none'; }
  const ctx = canvas.getContext('2d'); if (!ctx) return false;
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.save(); ctx.translate(fx ? canvas.width : 0, fy ? canvas.height : 0); ctx.scale(fx ? -1 : 1, fy ? -1 : 1);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height); ctx.restore();
  if (canvas.dataset) delete canvas.dataset.pending; canvas.pendingImage = null;
  return true;
}
const renderBeforeSolaris = NeonCity.render;
NeonCity.render = function (container, key) {
  const out = renderBeforeSolaris.apply(this, arguments);
  if (activeRegion !== 'elaris' || !SOLARIS_PLAN[key] || !container || !container.querySelector) return out;
  if (container.dataset) container.dataset.environment = 'solaris';
  const ground = container.querySelector('canvas.city-ground');
  if (ground) { if (ground.classList) ground.classList.add('neon-world', 'solaris-ground'); paintSolaris(ground, key); }
  if (container.querySelectorAll) for (const w of container.querySelectorAll('.wildlife')) w.remove();
  return out;
};
const solarisStyles = document.createElement('style');
solarisStyles.textContent = '#world[data-environment="solaris"]{background:#e9b45a}#world[data-environment="solaris"] .city-landmark{color:#fff3d0;text-shadow:0 1px 3px #6a3a00}';
document.head.append(solarisStyles);

// Round 151: in Solaris, the portal home is a sandstone sun-gate showing the neon city inside.
const renderWorldBeforeSolarisPortal = renderWorld;
renderWorld = function () {
  renderWorldBeforeSolarisPortal.apply(this, arguments);
  if (!document.querySelector || typeof portalTarget !== 'function') return;
  const t = portalTarget(), art = t && document.querySelector('#world .portal-art'); if (!art) return;
  if (activeRegion === 'elaris' && t.region === 'city') { art.src = 'assets/environment/solaris-portal.webp'; art.classList.add('solaris-portal'); }
  // Round 155: on the Neon Aftermath side, a steel-and-neon gate shows the desert city inside.
  if (activeRegion === 'city' && t.region === 'elaris') { art.src = 'assets/environment/city-solaris-portal.webp'; art.classList.add('solaris-portal', 'city-solaris-portal'); }
};
const solarisPortalStyles = document.createElement('style');
// Round 151: every portal is drawn at half its old size and pulses with a glow.
solarisPortalStyles.textContent = '.portal-art{width:48px!important;height:72px!important;animation:portalPulse 2.4s ease-in-out infinite!important}'
  + '.portal-art.solaris-portal{width:59px!important;height:79px!important;image-rendering:auto;animation-name:solarPortalPulse!important}'
  + '.portal-art.city-solaris-portal{animation-name:portalPulse!important}'
  + '@keyframes portalPulse{0%,100%{filter:drop-shadow(0 0 4px #42bdd8) drop-shadow(0 0 10px #42bdd866)}50%{filter:drop-shadow(0 0 8px #86fff0) drop-shadow(0 0 20px #86fff0aa)}}'
  + '@keyframes solarPortalPulse{0%,100%{filter:drop-shadow(0 0 4px #ffcf6a) drop-shadow(0 0 10px #5fe9ff66)}50%{filter:drop-shadow(0 0 8px #ffe39a) drop-shadow(0 0 20px #5fe9ffaa)}}'
  + '@media(prefers-reduced-motion:reduce){.portal-art{animation:none!important;filter:drop-shadow(0 0 6px #86fff0)}}';
document.head.append(solarisPortalStyles);
