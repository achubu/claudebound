'use strict';
// Rounds 507-510 (owner): the city's sea wall stands on the grid (genCoastSand). Pinned here, on two seeds:
// - the walkway between a street and the sand is at least GEN.coastWalk cells wide (no street cell within that of sand);
// - no lot (building, yard, park, landmark) within GEN.coastLotGap cells of the sand, so no building or rim meets the beach
//   and no edge overlaps another (the wall's strip is half a cell either side of its seam);
// - every straight run of the wall is at least GEN.wallMinRun cells long (the coast is decided in blocks of that size);
// - one answer for the whole city (genCoastSand), so rooms agree at their seams.
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`(() => { const out = {};
  for (const sd of [77, 9]) { newGame(); state.seed = sd; state.region = 'city'; configureRegion('city'); cityGenEnsure();
    out[sd] = genWith('city', () => { const seed = chronoSeed(), f = genCoastSand(seed), wl = genWorld(seed), SW = GEN.coastWalk, LG = GEN.coastLotGap, KQ = GEN.wallMinRun;
      let sand = 0, nearStreet = 0, nearLot = 0; const lotCell = new Uint8Array(wl.CW * wl.CH);
      for (const l of wl.lotsPx) for (let Y = Math.floor(l.r[1] / 25); Y < Math.ceil(l.r[3] / 25); Y++) for (let X = Math.floor(l.r[0] / 25); X < Math.ceil(l.r[2] / 25); X++) if (X >= 0 && Y >= 0 && X < wl.CW && Y < wl.CH) lotCell[Y * wl.CW + X] = 1;
      for (let Y = 0; Y < wl.CH; Y++) for (let X = 0; X < wl.CW; X++) { if (!f(X, Y)) continue; sand++;
        for (let b = -SW; b <= SW; b++) for (let a = -SW; a <= SW; a++) { const x = X + a, y = Y + b; if (x >= 0 && y >= 0 && x < wl.CW && y < wl.CH && wl.cell[y * wl.CW + x] === 2) { nearStreet++; b = SW + 1; break; } }
        for (let b = -LG; b <= LG; b++) for (let a = -LG; a <= LG; a++) { const x = X + a, y = Y + b; if (x >= 0 && y >= 0 && x < wl.CW && y < wl.CH && lotCell[y * wl.CW + x]) { nearLot++; b = LG + 1; break; } } }
      // straight runs of the wall: horizontal seams (paving above or below sand), counted along each row, and vertical ones
      let runs = 0, short = 0; const pav = (X, Y) => X >= 0 && Y >= 0 && X < wl.CW && Y < wl.CH && !f(X, Y);
      for (const [hz] of [[1], [0]]) { const A = hz ? wl.CH : wl.CW, B = hz ? wl.CW : wl.CH;
        for (let a = 1; a < A; a++) { let len = 0, kind = 0;
          for (let b = 0; b <= B; b++) { const p = b < B ? (hz ? [pav(b, a - 1), pav(b, a)] : [pav(a - 1, b), pav(a, b)]) : [false, false], k = p[0] !== p[1] ? (p[0] ? 1 : 2) : 0;
            if (k === kind && k) { len++; continue; } if (kind && len) { const edge = b - len === 0 || b === B; if (!edge) { runs++; if (len < KQ) { short++; (globalThis.SHORTS = globalThis.SHORTS || []).push((hz ? 'h' : 'v') + a + '@' + (b - len) + 'x' + len); } } } kind = k; len = k ? 1 : 0; } } }
      return { sand, nearStreet, nearLot, runs, short, list: (globalThis.SHORTS || []).splice(0) }; }); }
  return JSON.stringify(out); })()`));
for (const [sd, o] of Object.entries(r)) {
  assert(o.sand > 100, 'seed ' + sd + ': the city has a beach');
  assert.strictEqual(o.nearStreet, 0, 'seed ' + sd + ': the walkway before the sea wall is at least coastWalk cells wide');
  assert.strictEqual(o.nearLot, 0, 'seed ' + sd + ': no lot within coastLotGap of the sand');
  assert.strictEqual(o.short, 0, 'seed ' + sd + ': sea wall runs shorter than wallMinRun: ' + o.list.join(' '));
}
console.log('PASS: the sea wall: ' + Object.entries(r).map(([s, o]) => 'seed ' + s + ' ' + o.runs + ' runs, ' + o.short + ' short').join('; '));
