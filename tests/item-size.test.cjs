'use strict';
// Round 348, raised in Round 358: interactable objects share one size in every world (40px on screen, 55px for the
// merchant and the Cardsmith, drawn at real size since Round 358's fix of the half-scale offset), stay solid until used, and only
// Nexus Waypoints and hidden chests glow, in the world's colour.
const assert = require('assert'), fs = require('fs'), path = require('path');
const css = fs.readFileSync(path.join(__dirname, '..', 'assets', 'layout-polish.css'), 'utf8');
const i = css.lastIndexOf('Round 358'); assert(i > 0, 'the Round 358 block is in layout-polish.css (loaded last)');
const tail = css.slice(i);
assert(/#world \.poi-node,#world \.poi-node\.poi-art,#world \.map-chest,#world \.relic:not\(\.hidden-crystal\)\{width:40px!important;height:40px!important\}/.test(tail), 'one object size');
assert(/poi-cardsmith\{width:55px!important;height:55px!important\}/.test(tail), 'one NPC size');
assert(/#world \.poi-node,#world \.map-chest,#world \.relic\{scale:1!important\}/.test(tail), 'Round 358: drawn at real size, centred on the spot (no half scale)');
assert(/#world#world \.poi-node:not\(\.used\),#world#world \.map-chest,#world#world \.relic\{opacity:1!important\}/.test(tail), 'solid until used');
assert(/animation:none!important;filter:drop-shadow\(0 0 1px #000c\)!important;box-shadow:none!important/.test(tail), 'no glow on ordinary objects');
assert(/\.poi-node\.poi-nexus:not\(\.used\)\{animation:waypointGlow/.test(tail), 'waypoints glow');
assert(/#world#world \.map-chest\{animation:waypointGlow/.test(tail) && /crystal-chest\{--wp-glow:#5ff2ff\}/.test(tail), 'chests glow too (owner), crystal chests cyan');
for (const env of ['neon', 'solaris', 'sky', 'wilds', 'vespera', 'chronospire']) assert(tail.includes('[data-environment="' + env + '"]{--wp-glow:'), 'a waypoint colour for ' + env);
// Round 383: 40% bigger (56px, and 76px for the merchant and the Cardsmith).
const j = css.lastIndexOf('Round 383'); assert(j > i, 'the Round 383 block comes last');
assert(/\.relic:not\(\.hidden-crystal\)\{width:56px!important;height:56px!important\}/.test(css.slice(j)) && /poi-cardsmith\{width:76px!important;height:76px!important\}/.test(css.slice(j)), 'Round 383 sizes');
console.log('item-size ok');
