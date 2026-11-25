// Round 554 (owner: "implement this as the belt item when equiped as gear"): the worn belt shows on the hero on the map.
// Art by Codex (PR #318, tools/art-refresh/wearable-belt/integration-test/): the hero's sheet with the old brown belt and
// pouch painted out, and a belt-only sheet on the same grid (2304 x 1024: rows down, left, right, up; nine 256px cells, idle
// then the walk). While a belt is worn the two are drawn into one sheet once (cached, by look and art version) and shown in
// place of the hero's sheet; the animation, its frames and timing are the hero's own. No belt, or a picture that fails to
// load: the original hero. Each belt item names its look here, so more designs can follow; the three belts share one.
const HERO_WEAR_VERSION = '554';
const HERO_WEAR_ART = { belt: { scarabBelt: 'cyber-belt', stormglassBelt: 'cyber-belt', hourglassBelt: 'cyber-belt' } };
const HERO_WEAR_LOOKS = { 'cyber-belt': { base: 'assets/characters/wearable/protagonist-walk9-nobelt.png', overlay: 'assets/characters/wearable/belt-overlay.png' } };
const HERO_BASE_SHEET = 'assets/characters/protagonist-walk9.png?v=round251';
let heroWearUrl = null, heroWearKey = '', heroWearToken = 0; const heroWearCache = new Map(), heroWearFailed = new Set();
// the looks the worn gear calls for, slot by slot
function heroWearLooks() {
  if (typeof state === 'undefined' || !state || typeof ensureGear !== 'function') return [];
  ensureGear(); const out = [];
  for (const [slot, map] of Object.entries(HERO_WEAR_ART)) { const id = state.gear && state.gear[slot]; if (id && map[id] && HERO_WEAR_LOOKS[map[id]]) out.push(map[id]); }
  return out;
}
function heroWearPaint() { if (typeof document === 'undefined' || !document.querySelector) return; const el = document.querySelector('#player .hero-sprite'); if (el && el.style) el.style.backgroundImage = heroWearUrl ? 'url("' + heroWearUrl + '")' : ''; }
// called whenever the world is drawn or gear changes: cheap when nothing changed
function heroWearApply() {
  const looks = heroWearLooks(), key = looks.join('+') + '@' + HERO_WEAR_VERSION;
  if (!looks.length || heroWearFailed.has(key)) { heroWearKey = key; heroWearUrl = null; heroWearToken++; return heroWearPaint(); }
  if (key === heroWearKey) return heroWearPaint();
  heroWearKey = key; const tok = ++heroWearToken;
  if (heroWearCache.has(key)) { heroWearUrl = heroWearCache.get(key); return heroWearPaint(); }
  heroWearUrl = null; heroWearPaint(); // (the plain hero until the new sheet is ready, never a blank one)
  if (typeof document === 'undefined' || !document.createElement || typeof Image === 'undefined') return;
  const base = looks.map(l => HERO_WEAR_LOOKS[l].base).find(Boolean) || HERO_BASE_SHEET;
  const srcs = [base, ...looks.map(l => HERO_WEAR_LOOKS[l].overlay).filter(Boolean)].map(s => s.includes('?') ? s : s + '?v=' + HERO_WEAR_VERSION);
  Promise.all(srcs.map(src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error(src)); i.src = src; })))
    .then(imgs => { const c = document.createElement('canvas'); c.width = imgs[0].naturalWidth; c.height = imgs[0].naturalHeight; const g = c.getContext('2d'); for (const i of imgs) g.drawImage(i, 0, 0);
      c.toBlob(b => { if (!b) return; const url = URL.createObjectURL(b);
        while (heroWearCache.size >= 4) { const [k0, u0] = heroWearCache.entries().next().value; heroWearCache.delete(k0); if (u0 !== heroWearUrl) URL.revokeObjectURL(u0); }
        heroWearCache.set(key, url); if (tok === heroWearToken) { heroWearUrl = url; heroWearPaint(); } }); })
    .catch(() => { heroWearFailed.add(key); if (tok === heroWearToken) { heroWearUrl = null; heroWearPaint(); } }); // (a rapid change since: its own call answers)
}
if (typeof renderWorld === 'function') { const renderWorldBeforeWear = renderWorld; renderWorld = function () { const r = renderWorldBeforeWear.apply(this, arguments); heroWearApply(); return r; }; }
if (typeof equipGear === 'function') { const equipGearBeforeWear = equipGear; equipGear = function () { const r = equipGearBeforeWear.apply(this, arguments); heroWearApply(); return r; }; }
if (typeof collectRelic === 'function') { const collectRelicBeforeWear = collectRelic; collectRelic = function () { const r = collectRelicBeforeWear.apply(this, arguments); heroWearApply(); return r; }; }
