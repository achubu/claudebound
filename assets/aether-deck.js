'use strict';
// =====================================================================
// AETHER & THE SIDE DECK (Round 44)
//
// Pitch: during your turn, mark cards in hand to pitch. When you end the
// turn they burn away for the rest of the encounter (exhausted) and give
// Aether equal to their energy cost + 1 (a 1-cost card gives 2). Aether
// carries between turns, up to AETHER_MAX; every encounter starts with
// AETHER_START, so one pitch is enough for the first side draw.
//
// Side deck: a separate, player-built deck of utility counters. Spend
// Round 67: the side deck is always open; side cards cost Aether only
// (SIDE_DRAW_COST + their listed cost, so at least 4).
// Side cards wait in their own row (up to 2) until you play them.
//
// Afflictions: every enemy now carries telegraphed riders on some of its
// actions — debuffs on you, buffs on itself, or nastier strikes. Regular
// enemies have one, mini-bosses two, final bosses three (see
// afflictionCadence for how often). Each is
// shown one turn ahead, so you can pitch now and answer it next turn.
// =====================================================================
const STATIC_CLEANSE_COST = 2, AETHER_START = 2, AETHER_MAX = 8, SIDE_DRAW_COST = 4, SIDE_HAND_MAX = 2, SIDE_DECK_MAX = 6, SIDE_COPIES = 2, MIN_CYCLE = 4;
const regionIndex = () => ({ city: 0, elaris: 1, vespera: 2 })[typeof activeRegion === 'string' ? activeRegion : 'city'] || 0;

// ---------------------------------------------------------------------
// Enemy afflictions
// ---------------------------------------------------------------------
const AFFLICTIONS = {
  bleed:   { name: 'Lacerate', icon: '🩸', type: 'hex', amount: [2, 3, 4], desc: n => 'Bleed ' + n + ': at the end of each of your turns lose that much HP, falling by 1 each turn (stacks to ' + n * 2 + '; never below 1 HP).', answer: ['purify', 'restore', 'anchor'] },
  frail:   { name: 'Enfeeble', icon: '⤓', type: 'hex', desc: () => 'Frail for 2 turns: your cards deal 25% less damage.', answer: ['purify', 'anchor'] },
  shackle: { name: 'Shackle', icon: '⛓', type: 'hex', desc: () => 'Shackled: 1 less energy next turn.', answer: ['purify', 'anchor'] },
  fog:     { name: 'Mind Fog', icon: '☁', type: 'hex', desc: () => 'Fog: you draw 1 fewer card next turn.', answer: ['purify', 'anchor'] },
  static:  { name: 'Static Flood', icon: '≈', type: 'hex', amount: [1, 2, 2], desc: n => 'Shuffles ' + n + ' unplayable Static card' + (n > 1 ? 's' : '') + ' into your draw pile.', answer: ['purify', 'anchor', 'cleanse'] },
  empower: { name: 'Empower', icon: '▲', type: 'hex', amount: [2, 3, 4], desc: n => 'Empower: the enemy gains +' + n + ' attack for the rest of the fight (stacks once, to +' + n * 2 + ').', answer: ['dispel', 'anchor'] },
  barrier: { name: 'Aether Barrier', icon: '⬡', type: 'hex', amount: [5, 10, 16], desc: n => 'Barrier ' + n + ': absorbs damage from your cards until broken (refreshes, does not stack).', answer: ['dispel', 'anchor'] },
  rend:    { name: 'Rend', icon: '✂', type: 'strike', desc: () => 'Rend: this hit cuts through half your Block (Armor still applies).', answer: ['aegis', 'phase', 'mirror', 'anchor'] },
  crush:   { name: 'Crushing Blow', icon: '⬣', type: 'strike', desc: () => 'Crush: this hit deals 30% more damage.', answer: ['phase', 'mirror', 'anchor'] },
  siphon:  { name: 'Siphon', icon: '⟲', type: 'strike', desc: () => 'Siphon: the enemy heals for the HP this hit takes from you.', answer: ['phase', 'mirror', 'anchor'] },
  barrage: { name: 'Barrage', icon: '⁂', type: 'strike', desc: () => 'Barrage: 3 hits at 45% power each. Block and Armor apply to every hit.', answer: ['mirror', 'phase', 'anchor'] }
};
function afflictionAmount(id, region = regionIndex()) { const a = AFFLICTIONS[id].amount; return a ? a[Math.min(region, a.length - 1)] : 0; }
function afflictionText(id, region) { return AFFLICTIONS[id].desc(afflictionAmount(id, region)); }

// Regular enemies: one. Mini-bosses: two. Final bosses: three.
const ENEMY_AFFLICTIONS = {
  emberling: ['bleed'], thornling: ['frail'], vineguard: ['barrier'], burrower: ['rend'], shade: ['fog'], cryptWisp: ['static'], forgeBeast: ['crush'], crownEye: ['fog'],
  moonKnight: ['rend', 'shackle'], crownSentinel: ['static', 'empower'], thornWarden: ['barrier', 'bleed', 'crush'],
  cinderFox: ['barrage'], drownedHeron: ['siphon'], blightAntler: ['frail'], stormMoth: ['fog'],
  tidewardenElaris: ['siphon', 'barrier'], galeSovereign: ['barrage', 'shackle'], bloomTyrant: ['bleed', 'empower', 'rend'],
  vespFox: ['crush'], vespThorn: ['static'], vespMoth: ['barrage'], vespHeron: ['siphon'], vespShade: ['shackle'], vespStag: ['barrier'], vespWisp: ['fog'], vespMauler: ['rend'],
  arcSentinel: ['barrier', 'shackle'], resonantPhantom: ['static', 'siphon'], stormTyrant: ['empower', 'barrage', 'frail']
};
// How often riders come: every 3rd turn (2, 5, 8 …) for regular enemies,
// mini-bosses and final bosses; every 2nd turn (2, 4, 6 …) for elites and
// for final bosses once enraged (below half health). Long fights still
// pile up: Empower and Bleed stack (to a cap), so stalling is punished.
function afflictionCadence(b) {
  const e = enemies[b.id] || {};
  if (b.enemy.boss && !e.miniBoss) return b.enemy.hp <= b.enemy.maxHp / 2 ? 2 : 3;
  return b.enemy.elite ? 2 : 3;
}
// Regular enemies with a strike affliction aim it at their plain attack
// turns (4, 7, 10 …) rather than stacking it onto a heavy hit.
function riderStart(b, every) {
  const list = ENEMY_AFFLICTIONS[b.id];
  return !b.enemy.boss && list.length === 1 && AFFLICTIONS[list[0]].type === 'strike' ? every + 1 : 2;
}
function scheduledRider(b, turn) {
  const list = ENEMY_AFFLICTIONS[b.id]; if (!list || !list.length || turn < 1) return null;
  const every = afflictionCadence(b);
  if (every === 1) return list[(turn - 1) % list.length];
  const first = riderStart(b, every);
  if (turn < first || (turn - first) % every) return null;
  return list[Math.floor((turn - first) / every) % list.length];
}
const enemyPlanBeforeAether = enemyPlan;
const baseDamageAt = (b, t) => (enemyPlanBeforeAether(b, t).damage || 0) > 0;
// The rider that lands on `turn`. A strike rider scheduled on a turn with
// no attack (guard / charge) carries over to the next attacking turn.
function riderAt(b, turn) {
  const own = scheduledRider(b, turn);
  if (own) return AFFLICTIONS[own].type === 'hex' || baseDamageAt(b, turn) ? own : null;
  if (afflictionCadence(b) === 1) return null;
  for (let back = 1; back <= 2; back++) {
    const s = turn - back, r = s >= 1 ? scheduledRider(b, s) : null; if (!r) continue;
    if (AFFLICTIONS[r].type !== 'strike') return null;
    for (let t = s; t < turn; t++) if (baseDamageAt(b, t)) return null;
    return baseDamageAt(b, turn) ? r : null;
  }
  return null;
}
function firstRiderTurn(b) { for (let t = b.turn; t < b.turn + 10; t++) if (riderAt(b, t)) return t; return -1; }
function firstDamagingTurn(b) { for (let t = b.turn; t < b.turn + 10; t++) if (baseDamageAt(b, t)) return t; return -1; }

enemyPlan = function (b = state.battle, turn = b?.turn) {
  const plan = enemyPlanBeforeAether(b, turn);
  if (!b || !b.enemy || plan.kind === 'silenced') return plan;
  const out = { ...plan };
  let rider = riderAt(b, turn);
  if (rider && b.anchor && firstRiderTurn(b) === turn) { out.anchored = rider; rider = null; }
  if (rider && AFFLICTIONS[rider].type === 'strike' && !(out.damage > 0)) rider = null;
  out.rider = rider;
  if (rider === 'crush') out.damage = Math.round(out.damage * 1.3);
  if (rider === 'barrage') { out.hits = 3; out.damage = Math.max(1, Math.round(out.damage * .45)); }
  if (out.damage > 0 && (b.veil || b.mirror) && firstDamagingTurn(b) === turn) {
    if (b.veil) { out.veiled = out.damage * (out.hits || 1); out.damage = 0; if (rider && AFFLICTIONS[rider].type === 'strike') out.rider = null; }
    else if (b.mirror) { out.mirrored = out.damage * (out.hits || 1); out.damage = Math.ceil(out.damage / 2); }
  }
  if (out.rider) out.name = out.name + ' + ' + AFFLICTIONS[out.rider].name;
  return out;
};
intent = function () { const p = enemyPlan(); return p.damage * (p.hits || 1); };

// ---------------------------------------------------------------------
// Side deck cards (collected, then built into a deck of up to 6)
// ---------------------------------------------------------------------
const playerLv = () => (typeof state === 'object' && state && state.playerLevel) || 1;
const aegisBlock = () => 4 + Math.ceil(playerLv() / 2);
const restoreHeal = () => 5 + Math.ceil(playerLv() / 3);
const dispelDamage = () => 4 + 3 * regionIndex();
const SIDE_CARDS = {
  purify:   { name: 'Purifying Light', icon: '✚', cost: 0, tier: 0, kind: 'Cleanse', text: () => 'Cleanse all your debuffs and purge every Static. Undoes this turn\'s Shackle and Fog.' },
  dispel:   { name: 'Dispel Lance', icon: '✕', cost: 0, tier: 0, kind: 'Dispel', text: () => 'Strip all Empower and Barrier from the enemy, then deal ' + dispelDamage() + ' piercing damage.' },
  aegis:    { name: 'Aegis Ward', icon: '⛨', cost: 0, tier: 0, kind: 'Ward', text: () => 'Gain ' + aegisBlock() + ' Block. This turn, Rend cannot cut through your Block.' },
  anchor:   { name: 'Null Anchor', icon: '⚓', cost: 1, tier: 0, kind: 'Prevent', text: () => 'Prevent the enemy\'s next affliction, whatever it is. Stays armed until it stops one.' },
  restore:  { name: 'Verdant Restore', icon: '❀', cost: 0, tier: 0, kind: 'Recovery', text: () => 'Heal ' + restoreHeal() + ' HP and cleanse Bleed.' },
  ground:   { name: 'Grounding Rod', icon: '⏚', cost: 0, tier: 1, kind: 'Counter', text: () => 'Arm a counter against the enemy\'s current element: its charged strike is cancelled and 6 damage returned.' },
  mirror:   { name: 'Mirror Sigil', icon: '◐', cost: 1, tier: 1, kind: 'Reflect', text: () => 'The enemy\'s next damaging action is mirrored: you take half, and it takes the full amount.' },
  phase:    { name: 'Phase Veil', icon: '◌', cost: 1, tier: 2, kind: 'Negate', text: () => 'Negate all damage from the enemy\'s next damaging action. Strike afflictions on it fail.' },
  overflow: { name: 'Aether Overflow', icon: '✦', cost: 0, tier: 2, kind: 'Tempo', text: () => 'Gain 1 energy, draw 1 card and gain 1 Aether.' },
  stasis:   { name: 'Stasis Field', icon: '⌛', cost: 2, tier: 3, kind: 'Control', text: () => 'The enemy skips its next action entirely. Only final bosses drop this.' }
};
const SIDE_STARTER = ['purify', 'aegis', 'dispel'];
// Round 71: the side deck starts with room for 2 cards and grows to 6
// (SIDE_DECK_MAX) over the game: +1 for each of these bosses.
const SIDE_START_SLOTS = 2, SIDE_GROWTH_BOSSES = ['crownSentinel', 'galeSovereign', 'bloomTyrant', 'resonantPhantom'];
function sideDeckMax(s = state) { const beaten = (s && Array.isArray(s.bosses)) ? s.bosses : []; return Math.min(SIDE_DECK_MAX, SIDE_START_SLOTS + SIDE_GROWTH_BOSSES.filter(id => beaten.includes(id)).length); }
function fillSideDeck(s = state) { // equip unequipped side cards into newly opened slots
  for (const c of s.side.pool) { if (s.side.deck.length >= sideDeckMax(s)) break; if (!s.side.deck.includes(c.uid) && s.side.deck.map(u => s.side.pool.find(x => x.uid === u)).filter(x => x && x.id === c.id).length < SIDE_COPIES) s.side.deck.push(c.uid); }
}
function sidePoolFor(region = regionIndex()) { return Object.keys(SIDE_CARDS).filter(id => SIDE_CARDS[id].tier <= region); }
function sideArtPath(id) { return 'assets/cards/side/' + id + '.png'; }

function ensureSide(s = state) {
  if (!s) return;
  if (!s.side || !Array.isArray(s.side.pool) || !Array.isArray(s.side.deck)) {
    s.side = { pool: [], deck: [], next: 1 };
    for (const id of SIDE_STARTER) { const card = { uid: 's' + s.side.next++, id }; s.side.pool.push(card); if (s.side.deck.length < sideDeckMax(s)) s.side.deck.push(card.uid); }
  }
  if (s.side.deck.length > sideDeckMax(s)) s.side.deck = s.side.deck.slice(0, sideDeckMax(s));
  s.side.next = Math.max(s.side.next || 1, ...s.side.pool.map(c => Number(String(c.uid).slice(1)) + 1));
}
const sideCopies = id => state.side.deck.map(u => state.side.pool.find(c => c.uid === u)).filter(c => c && c.id === id).length;
function addSideCard(id) {
  ensureSide(); const card = { uid: 's' + state.side.next++, id }; state.side.pool.push(card);
  if (state.side.deck.length < sideDeckMax() && sideCopies(id) < SIDE_COPIES) state.side.deck.push(card.uid);
  return card;
}
function toggleSideCard(uid) {
  const card = state.side.pool.find(c => c.uid === uid); if (!card) return;
  if (state.side.deck.includes(uid)) state.side.deck = state.side.deck.filter(u => u !== uid);
  else {
    if (state.side.deck.length >= sideDeckMax()) return toast('Your side deck holds ' + sideDeckMax() + ' cards right now. Beat bosses to expand it (up to ' + SIDE_DECK_MAX + ').');
    if (sideCopies(card.id) >= SIDE_COPIES) return toast('Up to ' + SIDE_COPIES + ' copies of ' + SIDE_CARDS[card.id].name + '.');
    state.side.deck.push(uid);
  }
  save();
}

// ---------------------------------------------------------------------
// Static: the junk card some enemies shuffle into your deck
// ---------------------------------------------------------------------
defs.static = { name: 'Static', cost: 0, kind: 'Junk', icon: '≈', unplayable: true, hidden: true, tiers: [{}, {}, {}, {}] };
const isJunk = c => !!(c && defs[c.id] && defs[c.id].unplayable);
let staticSerial = 1;
function makeStatic() { return { uid: 'static-' + staticSerial++, id: 'static', level: 0, uses: 0, soulbound: false, junk: true }; }
const rulesBeforeAether = rules;
rules = function (c) { return defs[c.id] && defs[c.id].unplayable ? 'Unplayable and cannot be pitched. Spend ' + STATIC_CLEANSE_COST + ' Aether to cleanse it, or purge every Static with Purifying Light.' : rulesBeforeAether(c); };

// ---------------------------------------------------------------------
// Battle state
// ---------------------------------------------------------------------
function aetherInit(b) {
  if (!b || b.aetherReady) return;
  ensureSide();
  b.aetherReady = true; b.aether = b.aether ?? AETHER_START; b.pitch = []; b.sideHand = []; b.sideChoice = null;
  b.sideDraw = shuffle(state.side.deck.slice(0, sideDeckMax()).map(u => state.side.pool.find(c => c.uid === u)).filter(Boolean).map(c => ({ ...c })));
  b.bleed = 0; b.frail = 0; b.empower = 0; b.anchor = false; b.veil = false; b.mirror = false; b.rendProof = false;
}
function pitchValue(c) { return isJunk(c) ? 0 : defs[c.id]?.pitchAether ?? ((defs[c.id]?.cost ?? 1) + 1); }
function cycleCount(b) { return [...b.draw, ...b.discard, ...b.hand].filter(c => !isJunk(c)).length; }
function canPitch(b, c) {
  if (!c || b.savedUid === c.uid) return false;
  if (isJunk(c)) return false;
  const marked = b.hand.filter(h => b.pitch.includes(h.uid) && !isJunk(h)).length;
  return cycleCount(b) - marked - 1 >= MIN_CYCLE;
}
function pendingAether(b) { return b.hand.filter(c => b.pitch.includes(c.uid)).reduce((n, c) => n + pitchValue(c), 0); }
function togglePitch(uid) {
  const b = state.battle; if (!b || b.phase !== 'fight') return; aetherInit(b);
  const c = b.hand.find(h => h.uid === uid); if (!c) return;
  if (b.pitch.includes(uid)) b.pitch = b.pitch.filter(u => u !== uid);
  else { if (!canPitch(b, c)) return toast(b.savedUid === uid ? 'A retained card cannot be pitched.' : 'Keep at least ' + MIN_CYCLE + ' cards in this encounter\'s deck.'); b.pitch.push(uid); }
  save(); renderBattle();
}
function resolvePitch(b) {
  const pitched = b.hand.filter(c => b.pitch.includes(c.uid) && c.uid !== b.savedUid);
  b.pitch = [];
  if (!pitched.length) return;
  const gain = pitched.reduce((n, c) => n + pitchValue(c), 0), before = b.aether;
  b.hand = b.hand.filter(c => !pitched.includes(c));
  b.exhaust.push(...pitched.filter(c => !isJunk(c)));
  b.aether = Math.min(AETHER_MAX, b.aether + gain);
  b.logs.push('Pitched ' + pitched.map(c => stat(c).name).join(', ') + ': +' + (b.aether - before) + ' Aether.');
}
function cleanseStatic(uid) {
  const b = state.battle; if (!b || b.phase !== 'fight') return; aetherInit(b);
  const c = b.hand.find(h => h.uid === uid); if (!c || !isJunk(c)) return;
  if (b.aether < STATIC_CLEANSE_COST) return toast('Cleansing Static costs ' + STATIC_CLEANSE_COST + ' Aether.');
  b.aether -= STATIC_CLEANSE_COST; b.hand = b.hand.filter(h => h !== c); b.pitch = b.pitch.filter(u => u !== uid);
  b.logs.push('Cleansed a Static card (−' + STATIC_CLEANSE_COST + ' Aether).');
  save(); renderBattle();
}
function drawSide() {
  const b = state.battle; if (!b || b.phase !== 'fight') return; aetherInit(b);
  if (b.sideChoice) return;
  if (b.sideHand.length >= SIDE_HAND_MAX) return toast('You can hold ' + SIDE_HAND_MAX + ' side cards. Play one first.');
  if (!b.sideDraw.length) return toast('Your side deck is empty for this encounter.');
  if (b.sideDraw.length === 1) { b.sideHand.push(b.sideDraw.shift()); b.logs.push('Side deck: drew ' + SIDE_CARDS[b.sideHand.at(-1).id].name + '.'); }
  else b.sideChoice = b.sideDraw.splice(0, 2);
  save(); renderBattle();
}
function chooseSide(i) {
  const b = state.battle; if (!b || !b.sideChoice) return;
  const pick = b.sideChoice[i], other = b.sideChoice[1 - i];
  b.sideHand.push(pick); if (other) b.sideDraw.push(other); b.sideChoice = null;
  b.logs.push('Side deck: took ' + SIDE_CARDS[pick.id].name + (other ? ', ' + SIDE_CARDS[other.id].name + ' goes to the bottom' : '') + '.');
  save(); renderBattle();
}
function putBackSide() {
  const b = state.battle; if (!b || !b.sideChoice) return;
  b.sideDraw.unshift(...b.sideChoice); b.sideChoice = null;
  b.logs.push('Side deck: put both cards back on top.');
  save(); renderBattle();
}
function sideUsable(b, id) {
  if (id === 'ground') { const p = enemyPlan(b); return !!(p.element || b.enemy.element); }
  return true;
}
// Round 67: the side deck is always open. Every side card left this
// encounter can be played straight from it, paid in Aether only:
// SIDE_DRAW_COST (4) plus the card's old energy cost, so never below 4.
function sideAetherCost(id) { return SIDE_DRAW_COST + (SIDE_CARDS[id]?.cost || 0); }
function sideAvailable(b) { return [...(b.sideHand || []), ...(b.sideChoice || []), ...(b.sideDraw || [])]; }
function playSideCard(uid) {
  const b = state.battle; if (!b || b.phase !== 'fight') return; aetherInit(b);
  const card = sideAvailable(b).find(c => c.uid === uid); if (!card) return;
  const cost = sideAetherCost(card.id);
  if (b.aether < cost) return toast(SIDE_CARDS[card.id].name + ' costs ' + cost + ' Aether. You have ' + b.aether + '.');
  if (!sideUsable(b, card.id)) return toast('This enemy has no element to ground.');
  b.aether -= cost;
  for (const k of ['sideHand', 'sideChoice', 'sideDraw']) if (Array.isArray(b[k])) b[k] = b[k].filter(c => c.uid !== uid);
  if (b.sideChoice && !b.sideChoice.length) b.sideChoice = null;
  b.logs.push('Side deck: ' + SIDE_CARDS[card.id].name + ' (−' + cost + ' Aether).');
  sideEffect(b, card.id);
  if (!b.enemy.hp) winBattle();
  save(); renderBattle();
}
function playSide(i) { const b = state.battle; const card = b && b.sideHand && b.sideHand[i]; if (card) playSideCard(card.uid); }
function purgeStatic(b) {
  let n = 0;
  for (const k of ['hand', 'draw', 'discard']) { const before = b[k].length; b[k] = b[k].filter(c => !isJunk(c)); n += before - b[k].length; }
  b.pitch = b.pitch.filter(u => b.hand.some(c => c.uid === u));
  return n;
}
function sideEffect(b, id) {
  const name = SIDE_CARDS[id].name;
  if (id === 'purify') {
    const purged = purgeStatic(b);
    if (b.shackledNow) { b.energy += 1; b.shackledNow = false; }
    if (b.foggedNow) { drawCards(1); b.foggedNow = false; }
    b.bleed = 0; b.frail = 0; b.playerBurn = 0; b.playerPoison = 0; b.drained = false; b.exposed = 0;
    b.logs.push(name + ': debuffs cleansed' + (purged ? ', ' + purged + ' Static purged' : '') + '.');
  } else if (id === 'dispel') {
    const stripped = (b.empower || 0) + (b.enemy.barrier || 0);
    b.enemy.attack -= b.empower || 0; b.empower = 0; b.enemy.barrier = 0;
    const dmg = dispelDamage(); b.enemy.hp = Math.max(0, b.enemy.hp - dmg);
    b.logs.push(name + (stripped ? ': enemy buffs stripped, ' : ': ') + dmg + ' piercing damage.');
  } else if (id === 'aegis') { b.block += aegisBlock(); b.rendProof = true; b.logs.push(name + ': ' + aegisBlock() + ' Block, Rend-proof this turn.'); }
  else if (id === 'anchor') { b.anchor = true; b.logs.push(name + ': the next affliction will be prevented.'); }
  else if (id === 'restore') { const heal = restoreHeal(); state.hp = Math.min(state.maxHp, state.hp + heal); b.bleed = 0; b.logs.push(name + ': healed ' + heal + ', Bleed cleansed.'); }
  else if (id === 'ground') { const el = enemyPlan(b).element || b.enemy.element; b.counter = COUNTERS[el]; b.logs.push(name + ': counter armed against ' + el + '.'); }
  else if (id === 'mirror') { b.mirror = true; b.logs.push(name + ': the next damaging action will be mirrored.'); }
  else if (id === 'phase') { b.veil = true; b.logs.push(name + ': the next damaging action will pass through you.'); }
  else if (id === 'overflow') { b.energy += 1; drawCards(1); b.aether = Math.min(AETHER_MAX, b.aether + 1); b.logs.push(name + ': +1 energy, +1 card, +1 Aether.'); }
  else if (id === 'stasis') { b.freeze = Math.max(b.freeze || 0, 1); b.logs.push(name + ': the enemy will skip its next action.'); }
}

// Frail and Barrier act on the damage your cards deal.
const cardEffectBeforeAether = cardEffect;
cardEffect = function (c, empowered, doubleAttack) {
  const b = state.battle, before = b.enemy.hp;
  cardEffectBeforeAether(c, empowered, doubleAttack);
  let dealt = before - b.enemy.hp; if (dealt <= 0) return;
  if (b.frail > 0) { const cut = Math.round(dealt * .25); if (cut) { b.enemy.hp += cut; dealt -= cut; b.logs.push('Frail: −' + cut + ' damage.'); } }
  if (b.enemy.barrier > 0 && dealt > 0 && !stat(c).pierceBarrier) { const soak = Math.min(b.enemy.barrier, dealt); b.enemy.hp += soak; b.enemy.barrier -= soak; b.logs.push('Barrier absorbs ' + soak + (b.enemy.barrier ? ' (' + b.enemy.barrier + ' left).' : ' and breaks.')); }
};
const playCardBeforeAether = playCard;
playCard = function (i) {
  const b = state.battle, c = b && b.hand[i];
  if (c && isJunk(c)) return toast('Static is unplayable. Spend ' + STATIC_CLEANSE_COST + ' Aether to cleanse it.');
  if (b && c) { aetherInit(b); b.pitch = b.pitch.filter(u => u !== c.uid); }
  return playCardBeforeAether(i);
};

function applyHex(b, id) {
  const n = afflictionAmount(id), name = AFFLICTIONS[id].name;
  if (id === 'bleed') { b.bleed = Math.min(n * 2, (b.bleed || 0) + n); b.logs.push(name + ': Bleed ' + b.bleed + '.'); }
  else if (id === 'frail') { b.frail = 2; b.logs.push(name + ': your cards deal 25% less damage for 2 turns.'); }
  else if (id === 'shackle') { b.energy = Math.max(0, b.energy - 1); b.shackledNow = true; b.logs.push(name + ': −1 energy this turn.'); }
  else if (id === 'fog') { if (b.hand.length > 1) { b.draw.unshift(b.hand.pop()); b.foggedNow = true; } b.logs.push(name + ': you drew 1 fewer card.'); }
  else if (id === 'static') { for (let k = 0; k < n; k++) b.draw.splice(Math.floor(Math.random() * (b.draw.length + 1)), 0, makeStatic()); b.logs.push(name + ': ' + n + ' Static shuffled into your draw pile.'); }
  else if (id === 'empower') { const add = Math.max(0, Math.min(n, n * 2 - (b.empower || 0))); b.enemy.attack += add; b.empower = (b.empower || 0) + add; b.logs.push(name + (add ? ': enemy attack +' + add + '.' : ': already at full power.')); }
  else if (id === 'barrier') { b.enemy.barrier = Math.max(b.enemy.barrier || 0, n); b.logs.push(name + ': ' + b.enemy.barrier + ' Barrier.'); }
}

const endTurnBeforeAether = endTurn;
endTurn = function () {
  const b = state.battle; if (!b || b.phase !== 'fight') return;
  aetherInit(b);
  // Round 49: up to 1 unspent energy turns into Aether.
  if (b.energy > 0 && b.aether < AETHER_MAX) { const gain = Math.min(b.energy, AETHER_MAX - b.aether); b.aether += gain; b.logs.push('Unspent energy: +' + gain + ' Aether.'); }
  resolvePitch(b);
  if (b.bleed > 0) { const loss = Math.max(0, Math.min(b.bleed, state.hp - 1)); state.hp -= loss; b.logs.push('Bleed: ' + loss + ' HP.'); b.bleed--; }
  if (b.frail > 0) b.frail--;
  b.shackledNow = false; b.foggedNow = false;
  const plan = enemyPlan(b), rider = plan.rider, aff = rider && AFFLICTIONS[rider];
  const dot = (b.poison || 0) + (b.burnTurns > 0 ? b.burn : 0);
  const countered = plan.kind === 'elemental' && b.counter && COUNTERS[plan.element] === b.counter;
  const acts = !(b.freeze > 0) && plan.kind !== 'silenced' && !countered && dot < b.enemy.hp;
  const plating = talentRank('plating');
  let siphon = 0;
  if (acts) {
    if (rider === 'rend') { if (b.rendProof) b.logs.push('Aegis Ward holds against Rend.'); else { const cut = Math.ceil(b.block / 2); b.block -= cut; if (cut) b.logs.push('Rend: cuts through ' + cut + ' of your Block.'); } }
    if (rider === 'barrage' && plan.damage > 0) {
      let extra = 0;
      for (let k = 0; k < 2; k++) { const net = Math.max(0, plan.damage - plating), soak = Math.min(b.block, net); b.block -= soak; extra += net - soak; }
      state.hp = Math.max(0, state.hp - extra); b.logs.push('Barrage: first two hits deal ' + extra + '.');
      siphon += extra;
    }
    if (plan.damage > 0) { const hit = b.disrupted ? Math.ceil(plan.damage / 2) : plan.damage; siphon += Math.max(0, hit - plating - b.block); }
  }
  b.rendProof = false;
  endTurnBeforeAether();
  if (state.battle !== b || b.phase !== 'fight') return;
  if (acts) {
    // Wards are spent only now: the engine above re-reads enemyPlan(), which must still see them.
    if (plan.anchored) { b.anchor = false; b.logs.push('Null Anchor: ' + AFFLICTIONS[plan.anchored].name + ' is prevented.'); }
    if (plan.veiled) { b.veil = false; b.logs.push('Phase Veil: ' + plan.veiled + ' damage passes through you.'); }
    if (plan.mirrored) { b.mirror = false; b.enemy.hp = Math.max(0, b.enemy.hp - plan.mirrored); b.logs.push('Mirror Sigil: ' + plan.mirrored + ' damage reflected.'); }
    if (rider === 'siphon' && siphon > 0) { const heal = Math.min(siphon, b.enemy.maxHp - b.enemy.hp); b.enemy.hp += heal; b.logs.push('Siphon: the enemy heals ' + heal + '.'); }
    if (aff && aff.type === 'hex') applyHex(b, rider);
  } else if (rider) b.logs.push(AFFLICTIONS[rider].name + ' fizzles.');
  if (!b.enemy.hp) winBattle();
  save(); renderBattle();
};

const startBattleBeforeAether = startBattle;
startBattle = function (spawnId) {
  startBattleBeforeAether(spawnId);
  const b = state.battle;
  if (b && b.phase === 'fight' && b.turn === 1 && !b.aetherReady) { aetherInit(b); save(); renderBattle(); }
};

// ---------------------------------------------------------------------
// Side card rewards
// ---------------------------------------------------------------------
function rollSideDrop(b, roll = Math.random()) {
  const final = b.enemy.boss && !(enemies[b.id] || {}).miniBoss;
  const chance = b.enemy.boss ? 1 : .05; // Round 53: 5% from regular and elite enemies; bosses always
  if (roll >= chance) return null;
  ensureSide();
  const owned = id => state.side.pool.filter(c => c.id === id).length;
  if (final && owned('stasis') < SIDE_COPIES && Math.random() < .3) return addSideCard('stasis');
  const pool = sidePoolFor().filter(id => id !== 'stasis');
  const weight = id => Math.max(1, 4 - owned(id) * 2);
  let r = Math.random() * pool.reduce((n, id) => n + weight(id), 0);
  for (const id of pool) { r -= weight(id); if (r <= 0) return addSideCard(id); }
  return addSideCard(pool[0]);
}
const winBattleBeforeAether = winBattle;
winBattle = function () {
  const b = state.battle; if (!b || b.phase !== 'fight') return;
  winBattleBeforeAether();
  if (b.phase !== 'reward') return;
  const card = rollSideDrop(b);
  if (card) { b.sideDrop = card.uid; b.special = b.special || []; b.special.push('✦ Side deck card: ' + SIDE_CARDS[card.id].name + (state.side.deck.includes(card.uid) ? ' — added to your side deck.' : '. Add it in the Deck Workshop.')); }
};

const newGameBeforeAether = newGame;
newGame = function () { newGameBeforeAether(); ensureSide(); save(); };
const restoreGameBeforeAether = restoreGame;
restoreGame = function (s) { ensureSide(s); return restoreGameBeforeAether(s); };
const validateImportBeforeAether = validateImport;
validateImport = function (s) {
  if (s && s.side !== undefined) {
    const side = s.side, ids = new Set();
    if (!side || !Array.isArray(side.pool) || !Array.isArray(side.deck) || side.pool.length > 500 || side.deck.length > SIDE_DECK_MAX) throw Error('Invalid side deck.');
    for (const c of side.pool) { if (!c || typeof c.uid !== 'string' || !/^s\d+$/.test(c.uid) || ids.has(c.uid) || !Object.hasOwn(SIDE_CARDS, c.id)) throw Error('Invalid side card.'); ids.add(c.uid); }
    if (new Set(side.deck).size !== side.deck.length || side.deck.some(u => !ids.has(u))) throw Error('Invalid side deck.');
    const counts = {}; for (const u of side.deck) { const id = side.pool.find(c => c.uid === u).id; counts[id] = (counts[id] || 0) + 1; if (counts[id] > SIDE_COPIES) throw Error('Invalid side deck.'); }
  }
  return validateImportBeforeAether(s);
};

// ---------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------
function sideCardElement(card, onClick, disabled = false) {
  const def = SIDE_CARDS[card.id], wrap = document.createElement('div'); wrap.className = 'card-wrap side-wrap';
  const btn = document.createElement('button'); btn.className = 'card side-card'; btn.disabled = disabled; btn.onclick = onClick;
  btn.innerHTML = '<span class="ownership">✦ SIDE DECK · ' + def.kind.toUpperCase() + '</span><span class="cost aether" title="Costs ' + sideAetherCost(card.id) + ' Aether">' + sideAetherCost(card.id) + '✦</span><span class="card-name">' + def.name + '</span><span class="art"><img src="' + sideArtPath(card.id) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'"><span class="art-glyph">' + def.icon + '</span></span><span class="rules"><span class="kind-badge">' + def.icon + '</span><span class="type">' + def.kind.toUpperCase() + '</span>' + def.text() + '</span>';
  btn.setAttribute('aria-label', 'Side card ' + def.name + ', ' + sideAetherCost(card.id) + ' Aether. ' + def.text());
  wrap.append(btn); return wrap;
}
function addHTML(el, html) { if (!html) return; const span = document.createElement('span'); span.className = 'aether-extra'; span.innerHTML = html; el.append(span); }
function answerNames(id) { return AFFLICTIONS[id].answer.map(a => a === 'cleanse' ? 'spending ' + STATIC_CLEANSE_COST + ' Aether to cleanse it' : SIDE_CARDS[a].name).join(', '); }
function afflictionLine(plan, label) {
  if (plan.anchored) return '<p class="affliction anchored">⚓ ' + label + AFFLICTIONS[plan.anchored].name + ' will be prevented by Null Anchor.</p>';
  if (!plan.rider) return '';
  const a = AFFLICTIONS[plan.rider];
  const text = afflictionText(plan.rider), body = label ? label + '<b>' + a.name + '</b> — ' + text : text.replace(/^([^:]+):/, '<b>$1:</b>');
  return '<p class="affliction ' + a.type + '">' + a.icon + ' ' + body + ' <span class="answer">Answer: ' + answerNames(plan.rider) + '.</span></p>';
}
function intentBubble(plan, cls, label, frozen) {
  const dmg = frozen ? 'frozen · skips its action' : plan.kind === 'silenced' ? 'silenced · no action' : plan.veiled ? 'negated by Phase Veil' : plan.damage > 0 ? (plan.hits > 1 ? plan.hits + ' × ' + plan.damage + ' damage' : plan.damage + ' damage') : 'no attack';
  return '<div class="intent-bubble ' + cls + '"><span class="when">' + label + '</span><b class="what">' + plan.name + '</b><span class="dmg">' + dmg + (plan.kind === 'elemental' && !frozen ? ' · <em>counter window</em>' : '') + '</span>'
    + afflictionLine(plan, '')
    + (plan.mirrored ? '<p class="affliction anchored">◐ Mirror Sigil: you take half, the enemy takes ' + plan.mirrored + '.</p>' : '') + '</div>';
}
const renderBattleBeforeAether = renderBattle;
renderBattle = function () {
  renderBattleBeforeAether();
  const b = state && state.battle; if (!b) return;
  const m = $('battleModal');
  if (b.phase === 'reward' && b.chestOpened && b.sideDrop) {
    const card = state.side.pool.find(c => c.uid === b.sideDrop), host = $('randomReward');
    if (card && host) host.append(sideCardElement(card, () => {}, true));
    return;
  }
  if (b.phase !== 'fight') return;
  aetherInit(b);
  // Telegraph: two bubbles — what the enemy does when you end this turn,
  // and what it does the turn after — each with its own affliction.
  const plan = enemyPlan(b), next = enemyPlan(b, b.turn + 1), box = m.querySelector('.intent');
  if (box) {
    const status = box.querySelector('.encounter-status'), statusHTML = status && status.outerHTML ? status.outerHTML : '';
    box.classList.add('intent-split');
    box.innerHTML = '<div class="intent-bubbles">' + intentBubble(plan, 'now', 'Enemy move next turn:', b.freeze > 0) + intentBubble(next, 'later', 'Enemy move the turn after:', false) + '</div>' + statusHTML;
  }
  // Status tags.
  const youTags = m.querySelector('.compact-side.you .compact-tags'), foeTags = m.querySelector('.compact-side.enemy .compact-tags');
  const tag = (cls, text, title) => '<b class="' + cls + '" title="' + title + '">' + text + '</b>';
  if (youTags) addHTML(youTags, (b.anchor ? tag('ward-tag', '⚓ Anchor', 'The next affliction will be prevented.') : '') + (b.veil ? tag('ward-tag', '◌ Veil', 'The next damaging action is negated.') : '') + (b.mirror ? tag('ward-tag', '◐ Mirror', 'The next damaging action is mirrored.') : '') + (b.rendProof ? tag('ward-tag', '⛨ Rend-proof', 'Rend cannot bypass your Block this turn.') : ''));
  if (foeTags) addHTML(foeTags, (b.empower ? tag('buff-tag', '▲ +' + b.empower + ' attack', 'Empowered. Dispel Lance strips it.') : '') + (b.enemy.barrier ? tag('buff-tag', '⬡ Barrier ' + b.enemy.barrier, 'Absorbs damage from your cards. Dispel Lance strips it.') : ''));
  // Pitch toggles on hand cards.
  document.querySelectorAll('#hand .card-wrap').forEach((wrap, i) => {
    const c = b.hand[i]; if (!c) return;
    if (isJunk(c)) { const card = wrap.querySelector('.card'); if (card) { card.classList.add('junk'); const own = card.querySelector('.ownership'); if (own) own.textContent = '≈ STATIC · JUNK'; const cost = card.querySelector('.cost'); if (cost) cost.textContent = '✕'; card.querySelector('.mastery-label')?.remove(); card.querySelector('.track')?.remove(); } }
    if (isJunk(c)) {
      const clean = document.createElement('button'); clean.className = 'ability cleanse';
      clean.textContent = 'Cleanse · ' + STATIC_CLEANSE_COST + ' ✦'; clean.disabled = b.aether < STATIC_CLEANSE_COST;
      clean.title = 'Spend ' + STATIC_CLEANSE_COST + ' Aether to remove this Static from the encounter.';
      clean.onclick = e => { e.stopPropagation?.(); cleanseStatic(c.uid); };
      wrap.append(clean); return;
    }
    const marked = b.pitch.includes(c.uid), btn = document.createElement('button');
    btn.className = 'ability pitch' + (marked ? ' selected' : '');
    btn.textContent = marked ? '✓ Pitching · +' + pitchValue(c) + ' ✦' : 'Pitch · +' + pitchValue(c) + ' ✦';
    btn.disabled = !marked && !canPitch(b, c);
    btn.title = 'At the end of your turn this card burns away for the rest of the encounter and gives ' + pitchValue(c) + ' Aether.';
    btn.onclick = e => { e.stopPropagation?.(); togglePitch(c.uid); };
    wrap.querySelector('.card')?.classList.toggle('pitched', marked);
    wrap.append(btn);
  });
  // Aether panel and side hand.
  const panel = document.createElement('div'); panel.className = 'aether-panel';
  const energyBonus = Math.max(0, b.energy), pend = pendingAether(b) + energyBonus, pips = Array.from({ length: AETHER_MAX }, (_, k) => '<i class="' + (k < b.aether ? 'on' : k < Math.min(AETHER_MAX, b.aether + pend) ? 'pending' : '') + '"></i>').join('');
  const avail = sideAvailable(b).slice().sort((x, y) => sideAetherCost(x.id) - sideAetherCost(y.id) || SIDE_CARDS[x.id].name.localeCompare(SIDE_CARDS[y.id].name));
  panel.innerHTML = '<div class="aether-row"><b>✦ Aether ' + b.aether + '/' + AETHER_MAX + '</b><span class="aether-pips" aria-hidden="true">' + pips + '</span>' + (pend ? '<small>+' + Math.min(pend, AETHER_MAX - b.aether) + ' at end of turn' + (energyBonus ? ' (incl. +' + energyBonus + ' from unspent energy)' : '') + '</small>' : '<small>Pitch cards or end the turn with energy left to gain Aether</small>') + '</div>';
  const handTitle = m.querySelector('.hand-title');
  if (handTitle && handTitle.before) handTitle.before(panel); else m.append(panel);
  // Round 72: the side deck is its own column beside your hand — one card per
  // row, scrolling up and down.
  const hand = $('hand');
  if (!hand || !hand.parentNode || !hand.before) return;
  const row = document.createElement('div'); row.className = 'hand-row';
  hand.before(row); row.append(hand);
  const col = document.createElement('aside'); col.className = 'side-column'; col.setAttribute('aria-label', 'Side deck');
  const ready = avail.filter(c => b.aether >= sideAetherCost(c.id) && sideUsable(b, c.id)).length;
  col.innerHTML = '<div class="side-col-head"><b>✦ Side deck</b><small>' + (avail.length ? avail.length + ' left · ' + ready + ' playable' : 'used up this fight') + '</small></div><div class="side-col-list" id="sideHand"></div>';
  row.append(col);
  const host = $('sideHand');
  if (host && host.append) avail.forEach(card => {
    const off = b.aether < sideAetherCost(card.id) || !sideUsable(b, card.id);
    const el = sideCardElement(card, () => playSideCard(card.uid), off);
    if (off && b.aether < sideAetherCost(card.id)) el.title = 'Needs ' + sideAetherCost(card.id) + ' Aether (you have ' + b.aether + ').';
    host.append(el);
  });
};

// Deck Workshop: the side deck panel.
const showDeckBeforeAether = showDeck;
showDeck = function () {
  showDeckBeforeAether(); ensureSide();
  const host = document.querySelector('#menuModal .workshop'); if (!host) return;
  const panel = document.createElement('div'); panel.className = 'panel side-workshop';
  panel.innerHTML = '<div class="eyebrow">SIDE DECK · AETHER</div><b>Side deck ' + state.side.deck.length + '/' + sideDeckMax() + '</b><p class="muted">Room for ' + sideDeckMax() + ' of ' + SIDE_DECK_MAX + ' cards. ' + (sideDeckMax() < SIDE_DECK_MAX ? 'Next slot: beat ' + SIDE_GROWTH_BOSSES.filter(id => !state.bosses.includes(id)).map(id => enemies[id] ? enemies[id].name : id)[0] + '. ' : 'Fully expanded. ') + '</p><p class="muted">In battle, pitch cards from your hand at the end of your turn: each burns away for that encounter and gives Aether equal to its cost + 1. Your whole side deck is open in every fight: play any side card once per encounter for Aether (4 minimum, shown on the card). Unspent energy turns into Aether 1 for 1. Up to ' + SIDE_COPIES + ' copies of each. Side cards drop from 5% of regular and elite enemies and from every boss; the merchant always sells one.</p><div class="cards" id="sidePoolCards"></div>';
  host.append(panel);
  const list = $('sidePoolCards');
  [...state.side.pool].sort((a, c) => SIDE_CARDS[a.id].tier - SIDE_CARDS[c.id].tier || a.id.localeCompare(c.id)).forEach(card => {
    const wrap = sideCardElement(card, () => {}), inDeck = state.side.deck.includes(card.uid);
    wrap.firstChild.classList.toggle('active', inDeck);
    const btn = document.createElement('button'); btn.textContent = inDeck ? '− Remove from side deck' : '+ Add to side deck';
    btn.onclick = () => { toggleSideCard(card.uid); showDeck(); };
    const actions = document.createElement('div'); actions.className = 'actions'; actions.append(btn); wrap.append(actions); list.append(wrap);
  });
};

// Round 71: beating a growth boss opens a side deck slot (and fills it).
const winBattleBeforeSideGrowth = winBattle;
winBattle = function () {
  const b = state.battle, before = sideDeckMax();
  winBattleBeforeSideGrowth();
  const after = sideDeckMax();
  if (after > before && state.side) { fillSideDeck(); if (b && Array.isArray(b.special)) b.special.push('✦ Side deck expanded: room for ' + after + ' of ' + SIDE_DECK_MAX + ' side cards.'); save(); }
};
