'use strict';
// Round 326 (owner): every piece of text in the world view is one style and looks the same size on screen:
// 10% smaller than the old enemy labels (6.48px times the map's fit-to-screen scale, at least 8px),
// HUD and buttons included.
// The map (#world) is scaled to fit the window, and some labels sit inside scaled nodes (enemies, items), so each
// label gets its own --wf: the target size divided by the scale it is actually drawn at. The HUD, minimap, buttons
// and toasts are not scaled and read --wtext. Styles are in layout-polish.css.
const WORLD_TEXT_MAP_PX = 6.48, WORLD_TEXT_MIN_PX = 8; // the old labels: 9px in a node drawn at 0.8, so 7.2px; 90% of that
function worldScaleOf(el) {
  const r = el.getBoundingClientRect(), w = el.offsetWidth;
  return r.width && w ? r.width / w : 1;
}
function fitWorldText() {
  try {
    const world = typeof $ === 'function' && $('world');
    if (!world || !world.querySelectorAll || !world.getBoundingClientRect) return 0;
    const target = Math.max(WORLD_TEXT_MIN_PX, WORLD_TEXT_MAP_PX * worldScaleOf(world));
    document.documentElement.style.setProperty('--wtext', target.toFixed(2) + 'px');
    let n = 0;
    for (const el of world.querySelectorAll('*')) {
      if (el.classList.contains('poi-glyph') || el.classList.contains('art-glyph')) continue;
      const hasText = [...el.childNodes].some(c => c.nodeType === 3 && c.textContent.trim());
      const label = el.classList.contains('enemy-node'); // its name is drawn by ::after
      if (!hasText && !label) continue;
      const k = worldScaleOf(el); // drawn width / layout width: the map's fit-to-screen scale times any scale on the way
      if (!k || !isFinite(k)) continue;
      el.style.setProperty('--wf', (target / k).toFixed(2) + 'px'); n++;
    }
    return n;
  } catch (e) { return 0; }
}
if (typeof renderWorld === 'function') {
  const renderWorldBeforeFont = renderWorld;
  renderWorld = function () { const out = renderWorldBeforeFont.apply(this, arguments); fitWorldText(); return out; };
}
if (typeof showItemName === 'function') {
  const showItemNameBeforeFont = showItemName;
  showItemName = function () { const out = showItemNameBeforeFont.apply(this, arguments); fitWorldText(); return out; };
}
if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('resize', () => setTimeout(fitWorldText, 50));
