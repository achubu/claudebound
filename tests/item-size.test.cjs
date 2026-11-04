'use strict';
// Round 348: interactable objects share one size in every world (32px on screen, 44px for the merchant and the
// Cardsmith; boxes are double that under Round 215's half scale) and stay fully opaque until used.
const assert = require('assert'), fs = require('fs'), path = require('path');
const css = fs.readFileSync(path.join(__dirname, '..', 'assets', 'layout-polish.css'), 'utf8');
const tail = css.slice(css.indexOf('Round 348'));
assert(css.indexOf('Round 348') > 0, 'the Round 348 block is in layout-polish.css (loaded last)');
assert(/#world \.poi-node,#world \.poi-node\.poi-art,#world \.map-chest,#world \.relic:not\(\.hidden-crystal\)\{width:64px!important;height:64px!important\}/.test(tail), 'one object size');
assert(/poi-cardsmith\{width:88px!important;height:88px!important\}/.test(tail), 'one NPC size');
assert(/#world \.poi-node:not\(\.used\),#world \.map-chest,#world \.relic\{opacity:1!important\}/.test(tail), 'opaque until used');
assert(/#world \.poi-node,#world \.map-chest,#world \.relic\{scale:\.5\}/.test(css), 'the half scale the sizes assume');
console.log('item-size ok');
