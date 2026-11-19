'use strict';
// Round 496 (owner: whole-building sprites "only ... where they fit"; "never distort buildings to make them fit. you can increase
// or decrease the size but never distort"): every building picture the city places is scaled by one factor for both sides
// (0.75-1.25 of its size), stands inside its lot's box, belongs to the lot's quarter, and no two lots within 40px of each other
// show the same picture. Every listed picture exists on disk with a size in CITY_BUILDING_PX.
process.env.HARNESS_ONLY = '1';
const assert = require('assert'), fs = require('fs'), path = require('path');
const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`(() => { newGame(); const out = { seeds: {}, art: genWith('city', () => Object.entries(CITY_TD_ART).filter(([k]) => k.startsWith('building-')).flatMap(([k, l]) => l.map(n => [cityArtPath(k, n), !!CITY_BUILDING_PX[n]]))) };
  for (const sd of [77, 1, 9]) { state.seed = sd; configureRegion('city'); cityGenEnsure();
    out.seeds[sd] = genWith('city', () => { const wl = genWorld(String(sd)), bad = [], twins = []; let placed = 0, lots = 0;
      for (const l of wl.lotsPx) { if (l.use !== 'roof' || l.mall) continue; lots++; const sp = cityLotSprite(l); if (!sp) continue; placed++;
        const d = CITY_BUILDING_PX[sp.n], bw = l.r[2] - l.r[0] - 16, bh = l.r[3] - l.r[1] - 16, sx = sp.w / d[0], sy = sp.h / d[1];
        if (Math.abs(sx - sy) > 1e-9 || sx < 0.75 - 1e-9 || sx > 1.25 + 1e-9 || sp.w > bw + 1e-6 || sp.h > bh + 1e-6 || sp.slot !== 'building-' + l.district) bad.push(sp.n + '@' + l.seed);
        for (const o of wl.lotsPx) { if (o === l || o.seed > l.seed) continue; const q = cityLotSprite(o); if (q && q.n === sp.n && o.r[0] < l.r[2] + 40 && o.r[2] > l.r[0] - 40 && o.r[1] < l.r[3] + 40 && o.r[3] > l.r[1] - 40) twins.push(sp.n); } }
      return { placed, lots, bad, twins }; }); }
  return JSON.stringify(out); })()`));
for (const [p, sized] of r.art) { assert(fs.existsSync(path.join(__dirname, '..', 'assets', 'environment', 'city-gen', p + '.webp')), 'building picture on disk: ' + p); assert(sized, 'building picture has a size: ' + p); }
for (const [sd, o] of Object.entries(r.seeds)) {
  assert.deepStrictEqual(o.bad, [], 'seed ' + sd + ': every building picture undistorted, 0.75-1.25, inside its lot, of its quarter');
  assert.deepStrictEqual(o.twins, [], 'seed ' + sd + ': no two neighbouring lots show the same picture');
  assert(o.placed > o.lots * 0.5, 'seed ' + sd + ': most building lots have a picture (' + o.placed + '/' + o.lots + ')');
}
console.log('PASS: ' + r.art.length + ' building pictures; ' + Object.entries(r.seeds).map(([s, o]) => 'seed ' + s + ' ' + o.placed + '/' + o.lots).join(', ') + ' lots built from them, never distorted, no twins side by side.');
