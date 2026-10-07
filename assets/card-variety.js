'use strict';
// =====================================================================
// CARD VARIETY (Round 49)
// 15 new cards, 5 per world, each pulling on a different system (Aether,
// Block, Armor, damage-over-time, enemy attacks, energy), plus card
// rewards you choose: a loot chest that holds a card now offers three
// from the current world's pool, or you can leave them.
// =====================================================================
function tieredCard(id, name, cost, kind, icon, tiers, extra = {}) {
  defs[id] = { name, cost, kind, icon, ...extra, tiers };
}
// --- Neon Aftermath ---
tieredCard('arcJab', 'Arc Jab', 0, 'Attack', 'ϟ', [{ damage: 3, aether: 1 }, { damage: 4, aether: 1 }, { damage: 5, aether: 1 }, { damage: 6, aether: 2 }]);
tieredCard('bulwarkBash', 'Bulwark Bash', 1, 'Attack', '⛊', [{ blockStrike: 0 }, { blockStrike: 2 }, { blockStrike: 4 }, { blockStrike: 6 }]);
tieredCard('overclock', 'Overclock', 0, 'Skill', '⚙', [{ energy: 1 }, { energy: 1, draw: 1 }, { energy: 1, draw: 1 }, { energy: 2, draw: 1 }], { exhaust: true, pitchAether: 3 });
tieredCard('staticShield', 'Static Shield', 1, 'Defense', '⌁', [{ block: 6, cleanse: 1 }, { block: 8, cleanse: 1 }, { block: 10, cleanse: 1 }, { block: 12, cleanse: 2 }]);
tieredCard('breachSpike', 'Breach Spike', 1, 'Attack', '⟟', [{ damage: 5, breach: 2 }, { damage: 6, breach: 2 }, { damage: 8, breach: 2 }, { damage: 9, breach: 3 }]);
// --- Elaris ---
tieredCard('thornlash', 'Thornlash', 1, 'Poison Attack', '☘', [{ damage: 4, poison: 3, venomSurge: true }, { damage: 5, poison: 3, venomSurge: true }, { damage: 6, poison: 4, venomSurge: true }, { damage: 8, poison: 4, venomSurge: true }], { element: 'earth' });
tieredCard('wildfire', 'Wildfire', 2, 'Fire Attack', '🔥', [{ damage: 8, kindle: 3 }, { damage: 10, kindle: 3 }, { damage: 12, kindle: 4 }, { damage: 15, kindle: 4 }], { element: 'fire' });
tieredCard('rootbind', 'Rootbind', 1, 'Defense', '❦', [{ block: 5, bind: 4 }, { block: 6, bind: 5 }, { block: 8, bind: 5 }, { block: 9, bind: 7 }]);
tieredCard('tidecall', 'Tidecall', 1, 'Skill', '≋', [{ draw: 2, drawNext: 1 }, { draw: 2, drawNext: 1, block: 2 }, { draw: 3, drawNext: 1 }, { draw: 3, drawNext: 1, block: 4 }]);
tieredCard('verdantPact', 'Verdant Pact', 0, 'Healing', '❧', [{ heal: 4, aether: 1 }, { heal: 5, aether: 1 }, { heal: 7, aether: 1 }, { heal: 9, aether: 2 }], { exhaust: true });
// --- Vespera ---
tieredCard('chainLightning', 'Chain Lightning', 2, 'Lightning Attack', '⚡', [{ damage: 5, hits: 3 }, { damage: 6, hits: 3 }, { damage: 7, hits: 3 }, { damage: 7, hits: 4 }], { element: 'lightning' });
tieredCard('stormBattery', 'Storm Battery', 1, 'Skill', '🔋', [{ aether: 2, draw: 1 }, { aether: 2, draw: 1, block: 3 }, { aether: 3, draw: 1 }, { aether: 3, draw: 2 }]);
tieredCard('mirrorguard', 'Mirrorguard', 2, 'Defense', '◑', [{ block: 10, mirrorBlock: true }, { block: 12, mirrorBlock: true }, { block: 15, mirrorBlock: true }, { block: 18, mirrorBlock: true }]);
tieredCard('tempestSurge', 'Tempest Surge', 0, 'Attack', '🌀', [{ xDamage: 7 }, { xDamage: 8 }, { xDamage: 9 }, { xDamage: 11 }], { xCost: true });
tieredCard('prismLance', 'Prism Lance', 2, 'Attack', '✧', [{ damage: 12 }, { damage: 15 }, { damage: 18 }, { damage: 22 }], { pierce: true, pierceBarrier: true });

const WILDFIRE_CAP = 10; // doubled Burn is capped so Wildfire chains can't run away
const VARIETY_POOLS = {
  city: ['cleave', 'riposte', 'bastion', 'mend', 'spark', 'shatter', 'arcJab', 'bulwarkBash', 'overclock', 'staticShield', 'breachSpike'],
  elaris: ['cinder', 'venom', 'gale', 'counter', 'bastion', 'mend', 'thornlash', 'wildfire', 'rootbind', 'tidecall', 'verdantPact', 'bulwarkBash', 'breachSpike'],
  vespera: ['counter', 'bastion', 'cleave', 'shatter', 'cinder', 'gale', 'chainLightning', 'stormBattery', 'mirrorguard', 'tempestSurge', 'prismLance', 'wildfire', 'tidecall']
};
const NEW_CARD_WORLD = { arcJab: 'city', bulwarkBash: 'city', overclock: 'city', staticShield: 'city', breachSpike: 'city', thornlash: 'elaris', wildfire: 'elaris', rootbind: 'elaris', tidecall: 'elaris', verdantPact: 'elaris', chainLightning: 'vespera', stormBattery: 'vespera', mirrorguard: 'vespera', tempestSurge: 'vespera', prismLance: 'vespera' };

// Live numbers: Bulwark Bash hits for your Block, Tempest Surge for your energy.
const statBeforeVariety = stat;
stat = function (c) {
  const d = statBeforeVariety(c);
  if (d.blockStrike === undefined && !d.xDamage) return d;
  const b = typeof state === 'object' && state && state.battle;
  const out = { ...d };
  if (d.blockStrike !== undefined) out.damage = (b ? b.block : 0) + d.blockStrike;
  if (d.xDamage) out.damage = d.xDamage * (b ? (b.xSpend ?? b.energy) : 1);
  return out;
};
const rulesBeforeVariety = rules;
rules = function (c) {
  const d = defs[c.id] && defs[c.id].tiers[c.level || 0]; if (!d) return rulesBeforeVariety(c);
  const def = defs[c.id], lead = [], tail = [];
  if (d.blockStrike !== undefined) lead.push('Deal damage equal to your Block' + (d.blockStrike ? ' + ' + d.blockStrike : '') + '.');
  if (d.xDamage) lead.push('Spend all your energy: deal ' + d.xDamage + ' damage per energy.');
  if (d.aether) tail.push('Gain ' + d.aether + ' Aether.');
  if (d.cleanse) tail.push('Cleanse ' + d.cleanse + ' debuff' + (d.cleanse > 1 ? 's' : '') + '.');
  if (d.breach) tail.push('Enemy loses ' + d.breach + ' Armor for the fight.');
  if (d.venomSurge) tail.push('If already poisoned, double it.');
  if (d.kindle) tail.push('Burn ' + d.kindle + ' for 2 turns, or double an existing Burn (max ' + WILDFIRE_CAP + ').');
  if (d.bind) tail.push('The enemy\'s next attack deals ' + d.bind + ' less.');
  if (d.drawNext) tail.push('Draw ' + d.drawNext + ' extra next turn.');
  if (d.mirrorBlock) tail.push('This turn, reflect half the damage your Block stops.');
  if (def.pierceBarrier) tail.push('Ignores Barrier.');
  if (def.pitchAether) tail.push('Pitches for ' + def.pitchAether + ' Aether.');
  let base = rulesBeforeVariety(c);
  if (d.blockStrike !== undefined || d.xDamage) base = base.replace(/Deal \d+ damage\.( Pierce: ignores enemy armor\.)?/, '');
  if (d.venomSurge) base = base.replace(/ Poison: \+2 stacking damage each turn\./, ' Poison ' + d.poison + '.');
  if (d.hits) base = base.replace(/Deal (\d+) damage\./, 'Deal $1 damage ' + d.hits + ' times.');
  return [lead.join(' '), base.replace(/ Burn: 2 damage for 2 turns\./, ''), tail.join(' ')].join(' ').replace(/\s+/g, ' ').trim();
};

function cleanseOne(b) {
  if (b.bleed > 0) { b.bleed = 0; return 'Bleed'; }
  if (b.frail > 0) { b.frail = 0; return 'Frail'; }
  if (b.playerPoison > 0) { b.playerPoison = 0; return 'poison'; }
  if (b.playerBurn > 0) { b.playerBurn = 0; return 'burn'; }
  const junk = b.hand.findIndex(c => defs[c.id] && defs[c.id].unplayable);
  if (junk >= 0) { b.hand.splice(junk, 1); return 'a Static card'; }
  if (b.shackledNow) { b.energy += 1; b.shackledNow = false; return 'Shackle'; }
  if (b.exposed) { b.exposed = 0; return 'exposure'; }
  return null;
}

const cardEffectBeforeVariety = cardEffect;
cardEffect = function (c, empowered, doubleAttack) {
  const b = state.battle, d = stat(c);
  const poisonedBefore = (b.poison || 0) > 0, burningBefore = b.burnTurns > 0 ? b.burn : 0;
  const hits = d.hits || 1;
  for (let k = 0; k < hits && b.enemy.hp > 0; k++) cardEffectBeforeVariety(c, empowered && k === 0, doubleAttack && k === 0);
  if (hits > 1) b.logs.push(d.name + ': ' + hits + ' hits.');
  if (d.aether && typeof aetherInit === 'function') { aetherInit(b); b.aether = Math.min(AETHER_MAX, b.aether + d.aether); b.logs.push('+' + d.aether + ' Aether.'); }
  if (d.cleanse) for (let k = 0; k < d.cleanse; k++) { const what = cleanseOne(b); if (what) b.logs.push('Cleansed ' + what + '.'); }
  if (d.breach) { const cut = Math.min(b.enemy.armor || 0, d.breach); if (cut) { b.enemy.armor -= cut; b.logs.push('Breach: enemy Armor −' + cut + '.'); } }
  if (d.venomSurge && poisonedBefore && d.poison) { b.poison += d.poison; b.logs.push('Venom surge: Poison doubled.'); }
  if (d.kindle) {
    if (burningBefore) { b.burn = Math.min(WILDFIRE_CAP, burningBefore * 2); b.burnTurns = 2; b.logs.push('Wildfire: Burn doubled to ' + b.burn + '.'); }
    else { b.burn = d.kindle; b.burnTurns = 2; }
  }
  if (d.bind) { b.bind = (b.bind || 0) + d.bind; b.logs.push('Rootbind: next attack −' + b.bind + '.'); }
  if (d.drawNext) b.drawNext = (b.drawNext || 0) + d.drawNext;
  if (d.mirrorBlock) b.mirrorBlock = true;
};

const playCardBeforeVariety = playCard;
playCard = function (i) {
  const b = state.battle, c = b && b.hand[i];
  if (!c) return playCardBeforeVariety(i);
  const def = defs[c.id] || {};
  if (def.xCost) {
    if (b.energy <= 0) return toast('Tempest Surge needs at least 1 energy.');
    b.xSpend = b.energy;
    playCardBeforeVariety(i);
    if (!b.hand.includes(c)) b.energy = 0;
    b.xSpend = null;
    return;
  }
  return playCardBeforeVariety(i);
};

// Rootbind lowers the enemy's next attack; Mirrorguard reflects half the
// damage your Block stops; Tidecall draws extra next turn.
const enemyPlanBeforeVariety = enemyPlan;
enemyPlan = function (b = state.battle, turn = b?.turn) {
  const plan = enemyPlanBeforeVariety(b, turn);
  if (!b || !b.bind || !(plan.damage > 0)) return plan;
  let first = b.turn; while (first < turn && !(enemyPlanBeforeVariety(b, first).damage > 0)) first++;
  if (first !== turn) return plan;
  return { ...plan, damage: Math.max(0, plan.damage - b.bind), bound: b.bind };
};
const endTurnBeforeVariety = endTurn;
endTurn = function () {
  const b = state.battle; if (!b || b.phase !== 'fight') return;
  const plan = enemyPlan(b), plating = talentRank('plating');
  const hitsOn = !(b.freeze > 0) && plan.kind !== 'silenced' && plan.damage > 0;
  const incoming = hitsOn ? Math.max(0, (b.disrupted ? Math.ceil(plan.damage / 2) : plan.damage) - plating) * (plan.hits || 1) : 0;
  const stopped = b.mirrorBlock ? Math.min(b.block, incoming) : 0;
  const bound = plan.bound && hitsOn;
  const turn = b.turn, extra = b.drawNext || 0;
  endTurnBeforeVariety();
  if (state.battle !== b) return;
  b.mirrorBlock = false;
  if (bound) b.bind = 0;
  if (stopped > 1 && b.enemy.hp > 0) { const back = Math.floor(stopped / 2); b.enemy.hp = Math.max(0, b.enemy.hp - back); b.logs.push('Mirrorguard reflects ' + back + '.'); }
  if (b.phase === 'fight' && b.turn > turn && extra) { drawCards(extra); b.drawNext = 0; b.logs.push('Tidecall: +' + extra + ' card.'); }
  if (b.phase === 'fight' && !b.enemy.hp) winBattle();
  save(); renderBattle();
};

// ---------------------------------------------------------------------
// Card rewards: choose 1 of 3, or skip.
// ---------------------------------------------------------------------
function cardOffers(region = activeRegion, n = 3) {
  const pool = [...(VARIETY_POOLS[region] || VARIETY_POOLS.city)], out = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return out.map(id => make(id));
}
const winBattleBeforeVariety = winBattle;
winBattle = function () {
  const b = state.battle; if (!b || b.phase !== 'fight') return;
  winBattleBeforeVariety();
  if (b.phase !== 'reward' || b.lootType !== 'card' || !b.reward) return;
  // Take back the random card the chest added and offer a choice instead.
  const rolled = b.reward;
  state.pool = state.pool.filter(c => c.uid !== rolled.uid); state.deck = state.deck.filter(u => u !== rolled.uid);
  b.offers = cardOffers(); b.reward = null; b.lootType = 'choice';
};
function chooseCardReward(i) {
  const b = state.battle; if (!b || b.lootType !== 'choice') return;
  const card = i == null ? null : b.offers[i];
  if (card) { state.pool.push(card); if (state.deck.length < maxDeckSize() && copiesInDeck(card.id) < maxCopies()) state.deck.push(card.uid); b.reward = card; b.lootType = 'card'; }
  else b.lootType = 'skipped';
  b.offers = null; save(); renderBattle();
}
function rewardExtrasHTML(b) {
  return (b.special || []).map(s => '<p class="notice">' + s + '</p>').join('') + (b.levels && b.levels.length ? '<p>Level ' + state.playerLevel + '! +' + b.levels.length + ' maximum HP, +' + b.levels.length * 5 + ' healing, and +' + b.levels.length + ' talent point(s).</p>' : '');
}
const renderBattleBeforeVariety = renderBattle;
renderBattle = function () {
  const b = state && state.battle;
  if (b && b.phase === 'reward' && b.chestOpened && (b.lootType === 'choice' || b.lootType === 'skipped')) {
    const m = $('battleModal');
    if (b.lootType === 'choice') {
      m.innerHTML = '<div class="eyebrow">VICTORY · LOOT CHEST</div><h2>Choose a card</h2><p class="muted">The chest holds three cards. Take one into your collection, or leave them all.</p><div id="cardOffers" class="cards card-offers"></div>' + rewardExtrasHTML(b) + '<p><button id="skipCards">Leave them</button></p>';
      b.offers.forEach((c, i) => { const el = cardElement(c, () => chooseCardReward(i)); el.classList.add('offer'); $('cardOffers').append(el); });
      $('skipCards').onclick = () => chooseCardReward(null);
    } else {
      m.innerHTML = '<div class="eyebrow">VICTORY · LOOT CHEST</div><h2>Cards left behind</h2><p>You leave the cards in the chest.</p><div id="randomReward" class="cards"></div>' + rewardExtrasHTML(b) + '<button id="continueReward" class="primary">Continue</button>';
      $('continueReward').onclick = finishBattle;
    }
    return;
  }
  renderBattleBeforeVariety();
};

// X-cost cards show "X" instead of a number.
const cardHTMLBeforeVariety = cardHTML;
cardHTML = function (c) {
  const html = cardHTMLBeforeVariety(c);
  return defs[c.id] && defs[c.id].xCost ? html.replace(/<span class="cost">\d+<\/span>/, '<span class="cost">X</span>') : html;
};

// Round 51: arriving in Elaris for the first time, choose one Elaris card,
// so the first fights aren't played with a city-only deck.
const ELARIS_ARRIVAL_POOL = ['cinder', 'venom', 'gale', 'thornlash', 'wildfire', 'rootbind', 'tidecall', 'verdantPact'];
function offerArrivalCard() {
  const pool = [...ELARIS_ARRIVAL_POOL], offers = [];
  while (offers.length < 3) offers.push(make(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]));
  keys = {};
  openMenu('<div class="eyebrow">ELARIS ATTUNEMENT</div><h2>Choose an Elaris card</h2><p>The wilds answer your arrival. Take one card attuned to this world — it joins your active deck if there is room.</p><div class="cards" id="arrivalCards"></div>');
  const host = $('arrivalCards');
  if (host && host.append) offers.forEach(c => host.append(cardElement(c, () => { state.pool.push(c); if (state.deck.length < maxDeckSize() && copiesInDeck(c.id) < maxCopies()) state.deck.push(c.uid); save(); toast(stat(c).name + ' joins your collection.'); closeMenu(); })));
  return offers;
}
const travelPortalBeforeVariety = travelPortal;
travelPortal = function () {
  const from = state.region; travelPortalBeforeVariety();
  if (from === 'city' && state.region === 'elaris' && !state.elarisPick) { state.elarisPick = true; save(); offerArrivalCard(); }
};
