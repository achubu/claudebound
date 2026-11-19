'use strict';
// Round 513 (owner: "chests in the world dont show the rewards as a pop up"): opening a hidden chest shows one pop-up with
// everything it held (its potion or crystal, and its loot card), not toasts.
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`(() => { newGame(); configureRegion('city'); if (typeof cityGenEnsure === 'function') cityGenEnsure();
  let shown = null; const om = openMenu; openMenu = html => { shown = html; };
  const k = Object.keys(rooms).find(k => { const c = chestFor(k); return c && c.reward !== 'crystal'; }); const c = chestFor(k);
  state.room = k; state.pos = { x: c.x, y: c.y }; const pool0 = state.pool.length; checkWorldInteractions(); openMenu = om;
  return JSON.stringify({ k, shown, opened: state.chests.includes(c.id), card: state.pool.length - pool0 }); })()`));
assert(r.opened, 'the chest in ' + r.k + ' opened');
assert(r.shown && /HIDDEN CHEST/.test(r.shown), 'a pop-up shows what the chest held');
assert(/Healing Potion/.test(r.shown), 'the potion is in the pop-up');
if (r.card) assert(/chestCardHost/.test(r.shown) && /in your collection/.test(r.shown), 'the loot card is in the pop-up');
console.log('PASS: a hidden chest shows its rewards in a pop-up (' + r.k + ', card: ' + r.card + ').');
