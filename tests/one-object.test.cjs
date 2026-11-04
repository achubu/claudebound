'use strict';
// Round 350 (owner): no room holds more than one interactable object, and no world's first room holds any.
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`(() => { const out = [];
  for (let seed = 0; seed < 4; seed++) for (const w of WORLD_ORDER) {
    newGame(); state.seed = 'one-object-' + seed; state.region = w; configureRegion(w);
    const shop = merchantRoom(), smith = typeof cardsmithRoom === 'function' ? cardsmithRoom() : null;
    for (const k of Object.keys(rooms)) {
      const items = [];
      if (poiAt(k)) items.push('poi:' + poiAt(k).type);
      if (chestFor(k)) items.push('chest');
      if (rooms[k].relic) items.push('relic');
      if (shop && shop.key === k) items.push('merchant');
      if (smith === k) items.push('cardsmith');
      if (typeof cityNightsItems === 'function') for (const i of cityNightsItems(k)) items.push('city:' + i.type);
      if (typeof worldRelayItems === 'function') for (const i of worldRelayItems(k)) items.push('relay:' + i.type);
      if (items.length > 1 || (isStartRoom(k) && items.length)) out.push(w + ' ' + k + (isStartRoom(k) ? ' (start)' : '') + ': ' + items.join(', '));
    }
  }
  return JSON.stringify(out); })()`));
assert.deepStrictEqual(r, [], 'rooms breaking the rule:\n' + r.join('\n'));
console.log('one-object ok');
