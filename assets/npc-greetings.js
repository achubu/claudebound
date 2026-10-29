'use strict';
// =====================================================================
// Round 281 (owner request): the first time you walk into a room with the Wandering Merchant or the Cardsmith,
// they greet you and say in a few lines what they offer. It happens once per journey for each (state.npcMet),
// in whichever world you first meet them. "Visit now" opens their shop; "Later" closes it.
// =====================================================================
const NPC_GREETINGS = {
  merchant: {
    icon: '🛒', name: 'Wandering Merchant',
    line: '"Ah, a traveller with Shards in their pocket! Sit, sit. I carry a little of everything."',
    offers: ['Sells cards, potions and other wares for ◇ Shards.', 'Buys your spare healing potions back.', 'Moves on to a new room after you leave, with fresh stock.']
  },
  cardsmith: {
    icon: '⚒', name: 'Cardsmith',
    line: '"Mind the sparks. Bring me a card and I\'ll make it sing."',
    offers: ['Upgrades an Impermanent card by one level for ◇ Shards.', 'Makes a card ◆ Soulbound: protected, and it levels up with mastery.', 'Stays in the same place in each world.']
  }
};
function npcHere(kind) {
  if (!state || !rooms[state.room]) return null;
  const p = kind === 'merchant' ? (typeof merchantRoom === 'function' && merchantRoom()) : (typeof cardsmithFor === 'function' && cardsmithFor());
  return p && p.key === state.room ? p : null;
}
function npcGreet(kind) {
  const g = NPC_GREETINGS[kind]; if (!g) return;
  state.npcMet = state.npcMet || {}; state.npcMet[kind] = true; save();
  keys = {};
  openMenu('<div class="eyebrow">NEW FACE</div><h2>' + g.icon + ' ' + g.name + '</h2><p class="npc-line">' + g.line + '</p>'
    + '<ul class="npc-offers">' + g.offers.map(o => '<li>' + o + '</li>').join('') + '</ul>'
    + '<div class="poi-actions"><button id="npcVisit" class="primary">Visit now</button><button id="npcLater">Later</button></div>');
  const visit = $('npcVisit'), later = $('npcLater'), p = npcHere(kind);
  if (later) later.onclick = closeMenu;
  if (visit) visit.onclick = () => { if (kind === 'merchant' && p) openMerchant(p); else if (kind === 'cardsmith') openCardsmith(); else closeMenu(); };
}
function npcGreetingDue() {
  if (!state || state.battle || (typeof godModeOn === 'function' && godModeOn())) return null;
  const met = state.npcMet || {};
  return ['merchant', 'cardsmith'].find(k => !met[k] && npcHere(k)) || null;
}
const renderWorldBeforeGreetings = renderWorld;
renderWorld = function () {
  const out = renderWorldBeforeGreetings.apply(this, arguments);
  const due = npcGreetingDue();
  if (due && typeof $ === 'function' && $('menuOverlay') && $('menuOverlay').classList.contains('hidden')) npcGreet(due);
  return out;
};
if (typeof document !== 'undefined' && document.createElement && document.head) {
  const st = document.createElement('style');
  st.textContent = '.npc-line{font-style:italic;color:#ffe7b0;font-size:16px}.npc-offers{margin:10px 0 16px;padding-left:20px;line-height:1.6}.npc-offers li{margin:2px 0}';
  document.head.append(st);
}
