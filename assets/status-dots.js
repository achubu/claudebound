'use strict';
// =====================================================================
// Round 237: stronger damage over time, from the Sky Isles onward (owner request). Armor and Block
// can't stop it, so a defensive deck has to cleanse it (Purifying Light, Static Shield's cleanse,
// Verdant Restore for Bleed) or out-heal it (Mend, potions).
// - 🔥 Scorch (new): Burn N for 3 turns; it refreshes rather than stacks. It sets the existing Burn
//   (b.playerBurn turns), now with a strength (b.burnPower; a charged fire strike still burns for 2).
// - ☣ Venom (new): Poison +N, stacking to 3×N; it does not fade until cleansed (the existing Poison).
// - 🩸 Bleed grows past Solaris too (2, 3, 4, then 5, 6, 7).
// Strength by world (WORLD_ORDER index) in each affliction's `amount`. Sky Isles enemies trade Crush
// and Barrage (both blunted by Armor) for these; later worlds' enemies carry them too.
// =====================================================================
Object.assign(AFFLICTIONS, {
  scorch: { name: 'Scorch', icon: '🔥', type: 'hex', amount: [2, 2, 3, 4, 5, 6], desc: n => 'Scorch: Burn ' + n + ' for 3 turns: lose ' + n + ' HP at the end of each turn (refreshes, does not stack). Ignores Armor and Block.', answer: ['purify', 'anchor', 'cleanse'] },
  venom:  { name: 'Venom', icon: '☣', type: 'hex', amount: [1, 1, 2, 2, 3, 3], desc: n => 'Venom: Poison +' + n + ' (stacks to ' + n * 3 + '): lose that much HP at the end of each turn until cleansed. Ignores Armor and Block.', answer: ['purify', 'anchor', 'cleanse'] }
});
AFFLICTIONS.bleed.amount = [2, 3, 4, 5, 6, 7];
Object.assign(ENEMY_AFFLICTIONS, {
  // Sky Isles
  skyDrake: ['scorch'], skyHarpy: ['bleed'],
  stormbellWarden: ['shackle', 'scorch'], featherMatriarch: ['bleed', 'headwind'], zenithRoc: ['empower', 'scorch', 'bleed'],
  // Elaris (the forest)
  elarisFox: ['bleed'], tideboundWarden: ['venom', 'barrier'], elarisTyrant: ['venom', 'bleed', 'empower'],
  // Vespera
  vespFox: ['scorch'], vespThorn: ['venom'], vespMauler: ['bleed'], arcSentinel: ['barrier', 'scorch'], stormTyrant: ['empower', 'scorch', 'bleed'],
  // Chronospire
  chronoMauler: ['bleed'], chronoHeron: ['venom'], paradoxTwin: ['rewind', 'venom'], chronarch: ['rewind', 'empower', 'scorch']
});
const applyHexBeforeDots = applyHex;
applyHex = function (b, id) {
  if (id !== 'scorch' && id !== 'venom') return applyHexBeforeDots.apply(this, arguments);
  const n = afflictionAmount(id), name = AFFLICTIONS[id].name;
  if (id === 'scorch') { b.burnPower = Math.max(n, b.playerBurn > 0 ? (b.burnPower || 0) : 0); b.playerBurn = 3; b.logs.push('🔥 ' + name + ': Burn ' + b.burnPower + ' for 3 turns.'); }
  else { b.playerPoison = Math.min(n * 3, (b.playerPoison || 0) + n); b.logs.push('☣ ' + name + ': Poison ' + b.playerPoison + '.'); }
};
// A burn that has run out forgets its strength (a charged fire strike burns for 2 again).
const endTurnBeforeDots = endTurn;
endTurn = function () {
  const r = endTurnBeforeDots.apply(this, arguments), b = state && state.battle;
  if (b && !(b.playerBurn > 0)) b.burnPower = 0;
  return r;
};
