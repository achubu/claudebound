'use strict';
// Round 314: each event can have its own painting (assets/items/poi/events/<id>.webp); the rest keep event.webp.
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const fs = require('fs');
const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`(() => { newGame(); const o = {};
  configureRegion('city'); o.terminal = poiArt({ type: 'event', event: 'terminal' }); o.medic = poiArt({ type: 'event', event: 'medic' }); o.vending = poiArt({ type: 'event', event: 'vending' }); o.courier = poiArt({ type: 'event', event: 'courier' }); o.spring = poiArt({ type: 'event', event: 'spring' }); o.ranger = poiArt({ type: 'event', event: 'ranger' }); o.seedpod = poiArt({ type: 'event', event: 'seedpod' }); o.vines = poiArt({ type: 'event', event: 'vines' }); o.updraft = poiArt({ type: 'event', event: 'updraft' }); o.aerie = poiArt({ type: 'event', event: 'aerie' }); o.chimes = poiArt({ type: 'event', event: 'chimes' }); o.lore = poiArt({ type: 'lore' });
  configureRegion('wilds'); o.wildsTerminal = poiArt({ type: 'event', event: 'terminal' });
  configureRegion('elaris'); o.solSpring = poiArt({ type: 'event', event: 'spring' });
  configureRegion('city'); return JSON.stringify(o); })()`));
assert.strictEqual(r.terminal, 'events/terminal', 'the Abandoned Terminal uses its own painting');
assert.strictEqual(r.wildsTerminal, 'events/terminal', 'event art follows the event, not the world');
assert.strictEqual(r.medic, 'events/medic', 'Round 315: the Street Medic uses its painting');
assert.strictEqual(r.vending, 'events/vending', 'Round 316: the Busted Vending Machine uses its painting');
assert.strictEqual(r.courier, 'events/courier', 'Round 317: the Lost Courier uses its painting');
assert.strictEqual(r.spring, 'events/spring', 'Round 318: the Moonlit Spring uses its painting');
assert.strictEqual(r.solSpring, 'events/spring', 'Solaris borrows the forest events, paintings included');
assert.strictEqual(r.ranger, 'events/ranger', 'Round 319: the Wounded Ranger uses her painting');
assert.strictEqual(r.seedpod, 'events/seedpod', 'Round 320: the Glowing Seedpod uses its painting');
assert.strictEqual(r.vines, 'events/vines', 'Round 321: the Strangling Vines use their painting');
assert.strictEqual(r.updraft, 'events/updraft', 'Round 322: the Updraft Well uses its painting');
assert.strictEqual(r.aerie, 'events/aerie', 'Round 322: the Abandoned Aerie uses its painting');
assert.strictEqual(r.chimes, 'event', 'events without a painting keep the shared one');
assert.strictEqual(r.lore, 'terminal', 'the city lore terminal is unchanged');
const ids = JSON.parse(run('JSON.stringify(EVENT_ART)'));
const known = JSON.parse(run('JSON.stringify(Object.keys(EVENTS))'));
for (const id of ids) {
  assert(known.includes(id), id + ' is a real event');
  assert.strictEqual(fs.readFileSync('assets/items/poi/events/' + id + '.webp').toString('ascii', 0, 4), 'RIFF', id + ' is a WebP image');
}
console.log('event-art ok');
