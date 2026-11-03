'use strict';
// Round 325 (owner): interactable objects on the map glow less and carry no name label underneath.
// Their name pops up above them while you interact with them instead.

// 1. Styles: no labels under items, a softer glow. (The enemy labels with level and bounty stay.)
(function () {
  if (typeof document === 'undefined' || !document.createElement) return;
  const s = document.createElement('style');
  s.textContent =
    // No name under points of interest, the merchant, Nexus Waypoints or relics.
    '#world .poi-node::after,#world .relic::after,#world .relic:after{content:none!important;display:none!important}'
    // A softer, smaller pulse (its own name: layout-polish.css loads later and would win a same-named @keyframes): about half the old reach, and fainter (it was 12px + 22px at its peak).
    + '#world .poi-node.poi-art:not(.used):not(.poi-merchant),#world .map-chest,#world .relic{animation:itemGlowSoft 2.4s ease-in-out infinite!important}'
    + '@keyframes itemGlowSoft{0%,100%{filter:drop-shadow(0 0 1px #fff9) drop-shadow(0 0 3px color-mix(in srgb,var(--item-glow) 55%,transparent)) drop-shadow(0 0 1px #000)}'
    + '50%{filter:drop-shadow(0 0 1.5px #fffb) drop-shadow(0 0 7px color-mix(in srgb,var(--item-glow) 65%,transparent)) drop-shadow(0 0 1px #000)}}'
    + '@media(prefers-reduced-motion:reduce){#world .poi-node.poi-art:not(.used):not(.poi-merchant),#world .map-chest,#world .relic{filter:drop-shadow(0 0 1px #fff9) drop-shadow(0 0 5px color-mix(in srgb,var(--item-glow) 60%,transparent))!important}}'
    // The merchant and the Cardsmiths had their own strong halos.
    + '#world .poi-node.poi-art.poi-merchant{filter:drop-shadow(0 0 3px #ffd27a88) drop-shadow(0 0 1px #000)!important}'
    + '#world .poi-node.poi-art.poi-cardsmith{filter:drop-shadow(0 0 3px #ffb35a88) drop-shadow(0 0 1px #000)!important}'
    // Glyph-drawn objects (no painting yet) had a 16-18px ring glow.
    + '#world .poi-node:not(.poi-art){box-shadow:0 0 6px #b58cff55!important}'
    // The pop-up name.
    + '.item-name-pop{position:absolute;transform:translate(-50%,-100%);z-index:30;pointer-events:none;white-space:nowrap;'
    + 'font:700 12px system-ui;color:#fff3d6;background:#0b1420e6;border:1px solid #ffffff33;border-radius:6px;padding:3px 8px;'
    + 'box-shadow:0 2px 6px #0008;animation:itemNamePop 2.6s ease-out forwards}'
    + '@keyframes itemNamePop{0%{opacity:0;margin-top:4px}10%{opacity:1;margin-top:0}80%{opacity:1}100%{opacity:0}}';
  document.head.append(s);
})();

// 2. The pop-up: the name of the item closest to the player, shown just above it.
function itemNameAt(node) {
  const raw = (node && node.dataset && node.dataset.name) || (node && node.title) || '';
  return raw.replace(/\s*·\s*used$/, '');
}
function showItemName(match) {
  try {
    const world = typeof $ === 'function' && $('world'), player = typeof $ === 'function' && $('player');
    if (!world || !world.querySelectorAll || !player || !player.getBoundingClientRect) return null;
    const pr = player.getBoundingClientRect(), wr = world.getBoundingClientRect(), px = pr.left + pr.width / 2, py = pr.top + pr.height / 2;
    let best = null, bestD = Infinity;
    for (const n of world.querySelectorAll('.poi-node,.relic,.map-chest')) {
      if (match && !match(n)) continue;
      const r = n.getBoundingClientRect(); if (!r.width) continue;
      const d = Math.hypot(r.left + r.width / 2 - px, r.top + r.height / 2 - py);
      if (d < bestD) { bestD = d; best = n; }
    }
    const name = best && itemNameAt(best); if (!name) return null;
    for (const old of world.querySelectorAll('.item-name-pop')) old.remove();
    const r = best.getBoundingClientRect(), pop = document.createElement('div');
    pop.className = 'item-name-pop'; pop.textContent = name;
    // #world may be scaled to fit the screen: convert screen pixels back to its own units.
    const k = wr.width && world.offsetWidth ? world.offsetWidth / wr.width : 1;
    pop.style.left = ((r.left + r.width / 2 - wr.left) * k) + 'px'; pop.style.top = ((r.top - wr.top) * k - 4) + 'px';
    world.append(pop); setTimeout(() => pop.remove(), 2700);
    return name;
  } catch (e) { return null; }
}

if (typeof openPOI === 'function') {
  const openPOIBeforeNames = openPOI;
  openPOI = function (p) { showItemName(); return openPOIBeforeNames.apply(this, arguments); };
}
if (typeof collectRelic === 'function') {
  const collectRelicBeforeNames = collectRelic;
  collectRelic = function (q) { showItemName(n => n.classList && n.classList.contains('relic')); return collectRelicBeforeNames.apply(this, arguments); };
}
