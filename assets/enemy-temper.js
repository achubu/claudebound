'use strict';
// =====================================================================
// Round 253 (owner request): fights vary. Enemy moves were fixed and only the draw changed, so a
// build either beat a boss nearly every time or almost never (the Difficulty lab showed most builds
// at 0% or 100%). Now:
// - Temper: each enemy rolls one when the fight starts and shows it in its name. 🔥 Fierce hits
//   harder with less health, 🛡 Hardy has more health and hits softer; half are plain.
// - Every attack rolls up to TEMPER_ROLL either way. The roll is fixed per turn, so the intent
//   shows the exact number a turn ahead.
// Neon Aftermath's first levels (up to TEMPER_FROM_LEVEL - 1) stay plain, for new players.
// Loaded after enemy-armor.js, so both of a pair roll their own.
// =====================================================================
const TEMPERS = [
  { id: 'fierce', name: 'Fierce', icon: '🔥', hp: .85, attack: 1.2, weight: 1 },
  { id: null, weight: 2 },
  { id: 'hardy', name: 'Hardy', icon: '🛡', hp: 1.25, attack: .85, weight: 1 }
];
const TEMPER_ROLL = .15, TEMPER_FROM_LEVEL = 4;
function temperHash(seed, turn) {
  let h = (seed ^ Math.imul(turn + 1, 2654435761)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 2246822507) >>> 0; h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function rollTemper() {
  const total = TEMPERS.reduce((s, t) => s + t.weight, 0); let r = Math.random() * total;
  for (const t of TEMPERS) { if ((r -= t.weight) < 0) return t; }
  return TEMPERS[1];
}
function temperEnemy(e) {
  if (!e || e.temperSeed != null) return;
  e.temperSeed = Math.floor(Math.random() * 4294967296) >>> 0;
  if (globalThis.NO_TEMPER || (activeRegion === 'city' && (e.level || 1) < TEMPER_FROM_LEVEL)) { e.temperSeed = null; e.temperPlain = true; return; }
  const t = rollTemper(); if (!t.id) return;
  e.temper = t.id; e.name = /^The /.test(e.name) ? t.icon + ' The ' + t.name + ' ' + e.name.slice(4) : t.icon + ' ' + t.name + ' ' + e.name; // Round 291: "The Fierce Crown Sentinel", not "Fierce The Crown Sentinel"
  e.maxHp = Math.max(1, Math.round(e.maxHp * t.hp)); e.hp = Math.min(e.maxHp, Math.max(1, Math.round(e.hp * t.hp)));
  e.attack = Math.max(1, Math.round(e.attack * t.attack));
}
// The turn's roll: -TEMPER_ROLL..+TEMPER_ROLL, the same every time it is asked for that turn.
function temperRoll(b, turn) {
  const e = b && b.enemy; if (!e || e.temperSeed == null) return 0;
  return (temperHash(e.temperSeed, turn) * 2 - 1) * TEMPER_ROLL;
}
const startBattleBeforeTemper = startBattle;
startBattle = function (spawnId) {
  const r = startBattleBeforeTemper.apply(this, arguments), b = state && state.battle;
  if (!b || b.phase !== 'fight' || b.spawnId !== spawnId || b.tempered) return r;
  temperEnemy(b.enemy);
  if (b.pair && b.pair.other && b.pair.other.enemy) temperEnemy(b.pair.other.enemy);
  b.tempered = true;
  save(); renderBattle();
  return r;
};
const TEMPER_TEXT = { fierce: '🔥 Fierce: it hits 20% harder but has 15% less health.', hardy: '🛡 Hardy: it has 25% more health but hits 15% softer.' };
// The temper is explained in the intent on the fight's first turn (the battle log stays empty until
// the first move, as in battle-header's checks).
const intentBubbleBeforeTemper = intentBubble;
intentBubble = function (plan, cls, label, frozen) {
  const html = intentBubbleBeforeTemper(plan, cls, label, frozen), b = state && state.battle;
  if (cls !== 'now' || !b || b.turn !== 1 || !b.enemy || !TEMPER_TEXT[b.enemy.temper]) return html;
  return html.replace(/<\/div>$/, '<p class="affliction temper-line">' + TEMPER_TEXT[b.enemy.temper] + '</p></div>');
};
const enemyPlanBeforeTemper = enemyPlan;
enemyPlan = function (b = state.battle, turn = b?.turn) {
  const plan = enemyPlanBeforeTemper(b, turn);
  if (!b || !plan || !(plan.damage > 0)) return plan;
  const roll = temperRoll(b, turn); if (!roll) return plan;
  return { ...plan, damage: Math.max(1, Math.round(plan.damage * (1 + roll))), temperRoll: roll };
};
