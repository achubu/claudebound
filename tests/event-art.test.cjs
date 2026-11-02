'use strict';
// Round 314: each event can have its own painting (assets/items/poi/events/<id>.webp); the rest keep event.webp.
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const fs = require('fs');
const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`(() => { newGame(); const o = {};
  configureRegion('city'); o.terminal = poiArt({ type: 'event', event: 'terminal' }); o.medic = poiArt({ type: 'event', event: 'medic' }); o.lore = poiArt({ type: 'lore' });
  configureRegion('wilds'); o.wildsTerminal = poiArt({ type: 'event', event: 'terminal' });
  configureRegion('city'); return JSON.stringify(o); })()`));
assert.strictEqual(r.terminal, 'events/terminal', 'the Abandoned Terminal uses its own painting');
assert.strictEqual(r.wildsTerminal, 'events/terminal', 'event art follows the event, not the world');
assert.strictEqual(r.medic, 'event', 'events without a painting keep the shared one');
assert.strictEqual(r.lore, 'terminal', 'the city lore terminal is unchanged');
const ids = JSON.parse(run('JSON.stringify(EVENT_ART)'));
const known = JSON.parse(run('JSON.stringify(Object.keys(EVENTS))'));
for (const id of ids) {
  assert(known.includes(id), id + ' is a real event');
  assert.strictEqual(fs.readFileSync('assets/items/poi/events/' + id + '.webp').toString('ascii', 0, 4), 'RIFF', id + ' is a WebP image');
}
console.log('event-art ok');
