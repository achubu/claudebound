// Round 187: playtest fixes. The Hack gift says where the cards went and introduces Hack once
// the reward screen closes; mechanic guides sit below the hand; the room fits between the HUD
// and the controls; Art credits are in the main menu; the side deck folds on phones.
process.env.HARNESS_ONLY = '1';
const assert = require('assert'), fs = require('fs'), path = require('path');
const { run } = require('./expansion.test.cjs');
run(fs.readFileSync(path.join(__dirname, '../assets/layout-polish.js'), 'utf8'));
run(`{
const realRandom = Math.random; Math.random = () => 0.99;
// 1. First win in Neon Aftermath: the Hack cards go to the collection (Round 233: always), and it says so.
newGame(); state.room = Object.keys(rooms).find(k => roomSpawns(k).some(s => !s.boss && !s.elite)); state.cooldowns = {};
startBattle(roomSpawns(state.room).find(s => !s.boss && !s.elite).uid);
let b = state.battle; assert.equal(state.deck.length, maxDeckSize(), 'the starting deck is full');
b.enemy.hp = 0; winBattle();
assert.equal(b.phase, 'reward');
assert(b.logs.some(l => l.includes('They are in your collection: open Deck to add them')), 'the log says where the Hack cards went');
assert(!state.deck.some(u => ['packetSniff', 'ghostProtocol'].includes(state.pool.find(c => c.uid === u).id)), 'not in the deck');
assert(!(state.tips || {}).hack, 'the Hack guide is not marked as seen yet');
assert(state.pendingMechIntro && state.pendingMechIntro.region === 'city');
finishBattle();
assert(!$('menuOverlay').classList.contains('hidden'), 'closing the rewards opens the Hack intro');
assert($('menuModal').innerHTML.includes('New mechanic: Hack') && $('menuModal').innerHTML.includes('They are in your collection'), 'and it explains where the cards are');
assert(state.tips.hack && !state.pendingMechIntro, 'shown once');
closeMenu();
// Round 233: even with room in the deck the gift waits in the collection; the player adds it.
newGame(); state.deck = state.deck.slice(0, 4); const g = mechanicGift('elaris', false);
assert.equal(g.placed, 0); assert.equal(state.deck.length, 4); assert(giftPlacement(WORLD_MECHANICS.elaris).includes('in your collection'));
// 2. A mechanic guide goes below the hand, not above it; only one opens by itself at a time.
newGame(); state.room = Object.keys(rooms).find(k => roomSpawns(k).some(s => !s.boss)); state.tips = {};
startBattle(roomSpawns(state.room).find(s => !s.boss).uid); b = state.battle;
b.hand = ['packetSniff', 'gustChain', 'strike'].map(make); renderBattle();
assert.equal(Object.values(b.mechHelp).filter(Boolean).length, 1, 'one guide at a time');
// (Where the guide and the folding side deck land on screen is checked in a real browser: see CHANGES.md, Round 187.)
// 3 and 5: the room sits below the menu row on desktop, and fills the space under the HUD on phones.
globalThis.innerWidth = 1280; globalThis.innerHeight = 800; worldTopCache = null;
let v = worldViewport(); assert(v.top >= 6 && v.scale <= 1.6 && Math.abs(v.left * 2 + 800 * v.scale - 1280) < 1, 'desktop: centred below the menu row');
globalThis.innerWidth = 390; globalThis.innerHeight = 844; worldTopCache = { w: 390, h: 844, top: 140 };
v = worldViewport(); assert.equal(v.top, 140); assert(v.viewWidth >= 379.5 && v.viewWidth <= 480, 'phone: at least 380 room pixels wide');
assert(v.top + 500 * v.scale <= 844 - PHONE_CONTROLS + 1 || v.viewHeight < 500, 'phone: the room ends above the controls');
Math.random = realRandom;
}`);
const css = fs.readFileSync(path.join(__dirname, '../assets/layout-polish.css'), 'utf8'), html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
assert(css.includes('#nav .art-credits{display:none}') && css.includes('body:not(.touch-mode) #touch{display:none}'), 'Art credits leave the top row; the arrow pad is touch-only');
assert(fs.readFileSync(path.join(__dirname, '../assets/layout-polish.js'), 'utf8').includes("p.className = 'menu-credits'"), 'the main menu gets the Art credits link');
assert(html.includes('assets/layout-polish.js') && html.includes('assets/layout-polish.css'), 'loaded by the page');
console.log('PASS: Hack gift wording and intro after the rewards, one guide at a time, room placement on desktop and phones, Art credits in the menu, arrow pad touch-only.');
