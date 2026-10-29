'use strict';
// Round 282: the Map, Deck and Character buttons call the latest version of their screen (the Map button used to
// open the bare map from before exploration.js and map-terrain.js added the streets, fog and zoom).
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const fs = require('fs'), path = require('path');
const { run } = require('./expansion.test.cjs');
run(fs.readFileSync(path.join(__dirname, '../assets/layout-polish.js'), 'utf8'));
const r = JSON.parse(run(`(() => { const hits = []; const keep = { showMap, showDeck, showCharacter };
  showMap = () => hits.push('map'); showDeck = () => hits.push('deck'); showCharacter = () => hits.push('char');
  for (const id of ['mapBtn', 'deckBtn', 'charBtn']) $(id).onclick();
  showMap = keep.showMap; showDeck = keep.showDeck; showCharacter = keep.showCharacter; return JSON.stringify(hits); })()`));
assert.deepStrictEqual(r, ['map', 'deck', 'char'], 'each button opens the current screen');
console.log('PASS: the Map, Deck and Character buttons open the latest version of their screens.');
