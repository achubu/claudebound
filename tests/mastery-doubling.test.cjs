// Soulbound Card Mastery doubles each level: 50 → 100 → 200. Impermanent stays 100.
const { run } = require('./expansion.test.cjs');
run(`{
newGame();
const soul = state.pool.find(c => c.soulbound) || (() => { const c = make('strike'); c.soulbound = true; state.pool.push(c); return c; })();
const imp = make('strike'); imp.soulbound = false;
[[0, 50], [1, 100], [2, 200]].forEach(([lv, need]) => { soul.level = lv; assert.equal(masteryUses(soul), need, 'Soulbound level ' + lv + ' needs ' + need); imp.level = lv; assert.equal(masteryUses(imp), 100, 'Impermanent stays 100'); });
soul.level = 1; soul.uses = 99; assert(cardHTML(soul).includes('99/100')); assert(!cardHTML(soul).includes('READY'));
soul.uses = 100; assert(cardHTML(soul).includes('READY TO UPGRADE'));
soul.level = 2; soul.uses = 150; assert(cardHTML(soul).includes('150/200'));
const save = JSON.parse(JSON.stringify({ ...state, version: 3 }));
const sv = save.pool.find(c => c.uid === soul.uid); sv.level = 2; sv.uses = 200;
try { validateImport(save); } catch (e) { if (/card data/.test(e.message)) throw e; }
sv.uses = 201; assert.throws(() => validateImport(save), /card data/);
console.log('PASS: Soulbound mastery 50/100/200, impermanent 100, display and import bounds.');
}`);
