'use strict';
// Round 559: the renderer's ownership, de-duplication and retry rules (Codex's review, tools/art-refresh/reviews/
// wearable-process-2026-11-25/repro-renderer.cjs, turned round to assert the corrected behaviour). Mocked Image, canvas and
// toBlob callbacks, so the order things finish in is controlled; the real assets/hero-wear.js.
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict'), path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../assets/hero-wear.js'), 'utf8');
function fixture({ fail = 0, nullBlob = 0, size = [2304, 1024] } = {}) {
  const callbacks = [], created = [], revoked = []; let imageLoads = 0, failLeft = fail, nullLeft = nullBlob, now = 1e6;
  const looks = {}; for (const k of ['A', 'B', 'C', 'D', 'E', 'F']) looks[k] = { slot: 'belt', items: [k], overlay: k + '.png', v: 1 };
  class Image { constructor() { this.naturalWidth = size[0]; this.naturalHeight = size[1]; } set src(s) { if (String(s).startsWith('blob:')) return; imageLoads++; const error = failLeft > 0; if (error) failLeft--; queueMicrotask(() => error ? this.onerror() : this.onload()); } decode() { return Promise.resolve(); } }
  const node = { style: {} };
  const context = vm.createContext({ Image, queueMicrotask, Date: { now: () => now }, console: { warn() {} }, HERO_WEAR_DATA: looks, HERO_WEAR_SLOTS: ['belt'], state: { gear: { belt: 'A' } }, ensureGear() {},
    URL: { createObjectURL() { const u = 'blob:' + created.length; created.push(u); return u; }, revokeObjectURL(u) { revoked.push(u); } },
    document: { querySelector() { return node; }, createElement() { return { getContext() { return { drawImage() {} }; }, toBlob(cb) { if (nullLeft > 0) { nullLeft--; cb(null); } else callbacks.push(cb); } }; } } });
  vm.runInContext(source, context);
  const run = s => vm.runInContext(s, context), flush = () => new Promise(setImmediate);
  return { run, flush, callbacks, created, revoked, node, loads: () => imageLoads, tick: ms => { now += ms; },
    apply: async k => { run('state.gear.belt=' + JSON.stringify(k) + ';heroWearApply()'); await flush(); }, finish: async i => { callbacks[i]({}); await flush(); } };
}
const live = f => f.created.filter(u => !f.revoked.includes(u));
(async () => {
  { // a picture that fails once: retried after the wait, not on every redraw before it
    const f = fixture({ fail: 1 }); await f.apply('A'); const first = f.loads(); await f.apply('A'); await f.apply('A');
    assert.equal(f.loads(), first, 'no retry on every redraw');
    f.tick(2100); await f.apply('A'); assert(f.loads() > first, 'retried after 2s'); await f.finish(0);
    assert.match(f.run('heroWearUrl') || '', /^blob:/, 'and recovered');
  }
  { // no blob from the canvas: a failure, retried later
    const f = fixture({ nullBlob: 1 }); await f.apply('A'); assert.equal(f.run('heroWearUrl'), null); assert.equal(f.run('heroWearFailed.size'), 1, 'recorded');
    f.tick(2100); await f.apply('A'); await f.finish(0); assert.match(f.run('heroWearUrl') || '', /^blob:/, 'recovered');
  }
  { // a gear change retries at once (explicit retry); gives up after three timed retries until then
    const f = fixture({ fail: 99 }); await f.apply('A'); for (const ms of [2100, 8100, 30100, 60000]) { f.tick(ms); await f.apply('A'); }
    const n = f.loads(); f.tick(100000); await f.apply('A'); assert.equal(f.loads(), n, 'no endless retries');
    f.run('heroWearFailed.clear()'); await f.apply('A'); assert(f.loads() > n, 'retried on a gear change');
  }
  { // Codex's race: stale builds, evictions and cache hits leave no URL without an owner
    const f = fixture(); await f.apply('A'); await f.finish(0);
    for (const k of ['B', 'C', 'D', 'E', 'F']) f.run('state.gear.belt=' + JSON.stringify(k) + ';heroWearApply()'); await f.flush(); // (five changes before any picture loads)
    assert.equal(f.callbacks.length, 2, 'builds no longer wanted stop before they encode (only A and F encoded)');
    for (const k of ['B', 'C', 'D', 'E', 'F', 'B', 'C']) { await f.apply(k); while (f.callbacks.length > f.created.length) await f.finish(f.created.length); }
    const owned = new Set([...f.run('[...heroWearCache.values()]'), f.run('heroWearUrl')].filter(Boolean));
    assert.deepEqual(live(f).filter(u => !owned.has(u)), [], 'every live URL is in the cache or on screen');
    assert(f.run('heroWearCache.size') <= 4);
  }
  { // one build per outfit at a time
    const f = fixture(); await f.apply('A'); const n = f.loads(); f.run('heroWearKey = ""'); await f.apply('A'); assert.equal(f.loads(), n, 'no second build while one is pending');
  }
  { // a picture of the wrong size is a failure, never a misregistered outfit
    const f = fixture({ size: [1024, 1024] }); await f.apply('A'); assert.equal(f.callbacks.length, 0); assert.equal(f.run('heroWearUrl'), null); assert.match(f.run('[...heroWearFailed.values()][0].why'), /grid/);
  }
  { // taking it off releases the sheet once nothing holds it
    const f = fixture(); await f.apply('A'); await f.finish(0); f.run('heroWearCache.clear()'); f.run('state.gear.belt=null;heroWearApply()'); assert.equal(live(f).length, 0, 'revoked');
  }
  console.log('hero-wear-renderer ok');
})().catch(e => { console.error(e); process.exit(1); });
