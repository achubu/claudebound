'use strict';
// =====================================================================
// Round 169: the SUNWRAPPED REVENANT, a tech mummy that patrols Solaris.
// It joins the Solaris wildlife pool (earth element, so its charged strike poisons).
//
// Signature move, Entomb (a new affliction): when it lands, the strongest card in your next
// hand is wrapped in linen and can't be played that turn. Purifying Light unwraps it and
// Null Anchor prevents it.
//
// Art: assets/monsters/elaris/sun-revenant.png holds 4 poses (stand, club swing, stand, recoil).
// Round 234: the pose code below serves any creature with `poses` (the Briar Sentinel too).
// In battle it stands and sways, swings when it attacks and recoils when you hit it. On the map
// patrols walk with the 4-frame loop in sun-revenant-walk.png.
// =====================================================================
const SUN_REVENANT = { name: 'Sunwrapped Revenant', icon: '☥', hp: 50, attack: 9, element: 'earth', sheet: 'sun-revenant', cycle: '1.6s', poses: { attack: 1, hurt: 3, walk: 'elaris/sun-revenant-walk' } };
ELARIS_WILDLIFE.sunRevenant = SUN_REVENANT;
enemies.sunRevenant = SUN_REVENANT;
ENEMY_AFFLICTIONS.sunRevenant = ['entomb'];
AFFLICTIONS.entomb = { name: 'Entomb', icon: '☥', type: 'hex', desc: () => 'Entomb: the strongest card in your next hand is wrapped in linen and cannot be played that turn.', answer: ['purify', 'anchor'] };

function entombTarget(b) {
  const cards = b.hand.filter(c => !isJunk(c));
  if (!cards.length) return null;
  const weight = c => { const d = stat(c); return (d.cost || 0) * 100 + (d.damage || 0) + (d.block || 0) + (d.heal || 0); };
  return cards.reduce((best, c) => weight(c) > weight(best) ? c : best, cards[0]);
}
const applyHexBeforeRevenant = applyHex;
applyHex = function (b, id) {
  if (id !== 'entomb') return applyHexBeforeRevenant(b, id);
  const c = entombTarget(b);
  if (!c) { b.logs.push('Entomb: no card to wrap.'); return; }
  b.entombed = c.uid; b.logs.push('Entomb: ' + stat(c).name + ' is wrapped in linen and cannot be played this turn.');
};
const sideEffectBeforeRevenant = sideEffect;
sideEffect = function (b, id) {
  const wrapped = id === 'purify' && b.entombed;
  sideEffectBeforeRevenant(b, id);
  if (wrapped) { b.entombed = null; b.logs.push('The linen burns away.'); }
};
const playCardBeforeRevenant = playCard;
playCard = function (i) {
  const b = state.battle, c = b && b.hand[i];
  if (c && b.entombed === c.uid) return toast(stat(c).name + ' is entombed. It cannot be played this turn.');
  return playCardBeforeRevenant(i);
};
const endTurnBeforeRevenant = endTurn;
endTurn = function () {
  const b = state.battle; if (!b || b.phase !== 'fight') return endTurnBeforeRevenant();
  b.entombed = null; // the wrapping lasts one turn; a new Entomb is applied while the turn resolves
  const hp = state.hp;
  endTurnBeforeRevenant();
  if (state.battle === b && posesOf(b.id) && state.hp < hp) revenantPose('attack', 650);
};

// --- Poses ---------------------------------------------------------
// Round 234: any creature whose art lists poses ({ attack, hurt: frame index, walk: sheet }) stands
// on frame 0 and sways in battle, strikes when it hits you, braces when you hit it, and walks with
// its own 4-frame walk sheet on the map. Borrowed art (enemies[id].art) brings its poses along.
function posesOf(id) {
  const e = typeof enemies !== 'undefined' && enemies[id], key = e && e.art ? e.art : id;
  const a = ELARIS_WILDLIFE[key] || (typeof WILDLIFE_ART !== 'undefined' && WILDLIFE_ART[key]);
  return a && a.poses ? a.poses : null;
}
let revenantPoseState = null;
function revenantPose(kind, ms) {
  revenantPoseState = { kind, until: Date.now() + ms };
  applyRevenantPose();
  if (typeof setTimeout === 'function') setTimeout(applyRevenantPose, ms + 20);
}
function applyRevenantPose() {
  if (typeof document === 'undefined' || !document.querySelectorAll) return;
  const live = revenantPoseState && Date.now() < revenantPoseState.until ? revenantPoseState.kind : null;
  document.querySelectorAll('#battleOverlay .pose-sprite').forEach(el => {
    if (!el.classList) return;
    el.classList.toggle('pose-attack', live === 'attack');
    el.classList.toggle('pose-hurt', live === 'hurt');
  });
}
const cardEffectBeforeRevenant = cardEffect;
cardEffect = function (c, empowered, doubleAttack) {
  const b = state.battle, before = b && b.enemy ? b.enemy.hp : 0;
  const r = cardEffectBeforeRevenant(c, empowered, doubleAttack);
  if (b && posesOf(b.id) && b.enemy && b.enemy.hp < before) revenantPose('hurt', 420);
  return r;
};
const monsterArtBeforeRevenant = monsterArt;
monsterArt = function (id) {
  const html = monsterArtBeforeRevenant(id), a = ELARIS_WILDLIFE[id] || (typeof WILDLIFE_ART !== 'undefined' && WILDLIFE_ART[id]);
  const p = a && a.poses; if (!p) return html;
  const at = f => (f / 3 * 100).toFixed(6) + '%';
  const vars = '--pose-attack:' + at(p.attack) + ';--pose-hurt:' + at(p.hurt) + ';' + (p.walk ? '--walk-sheet:url(' + wildlifeSheetUrl(p.walk) + ');' : '');
  return html.replace('wildlife-sprite"', 'wildlife-sprite pose-sprite' + (p.walk ? ' has-walk' : '') + '"').replace('style="', 'style="' + vars);
};
const renderBattleBeforeRevenant = renderBattle;
renderBattle = function () {
  renderBattleBeforeRevenant.apply(this, arguments);
  const b = state && state.battle; if (!b || b.phase !== 'fight') return;
  applyRevenantPose();
  if (!b.entombed || !document.querySelectorAll) return;
  document.querySelectorAll('#hand .card-wrap').forEach((wrap, i) => {
    const c = b.hand[i]; if (!c || c.uid !== b.entombed) return;
    const card = wrap.querySelector('.card'); if (!card || !card.classList) return;
    card.classList.add('entombed'); card.title = 'Entombed: cannot be played this turn. Purifying Light unwraps it.';
    const own = card.querySelector('.ownership'); if (own) own.textContent = '☥ ENTOMBED';
  });
};

if (typeof document !== 'undefined' && document.createElement && document.head) {
  const style = document.createElement('style');
  style.textContent = `
.enemy-node .wildlife-sprite.pose-sprite,.battle-monster .wildlife-sprite.pose-sprite,.compact-monster .wildlife-sprite.pose-sprite{background-position:0 0;animation:revenantSway 2.6s ease-in-out infinite}
.enemy-node .wildlife-sprite.pose-sprite.has-walk{background-image:var(--walk-sheet)!important;animation:wildlifeFrames 1.1s steps(1,end) infinite}
.wildlife-sprite.pose-sprite.pose-attack{background-position:var(--pose-attack,33.333333%) 0;animation:revenantLunge .65s ease-out}
.wildlife-sprite.pose-sprite.pose-hurt{background-position:var(--pose-hurt,100%) 0;animation:revenantRecoil .42s ease-out}
#battleModal .compact-monster .wildlife-sprite.pose-sprite.pose-attack{background-position:var(--pose-attack,33.333333%) 0}#battleModal .compact-monster .wildlife-sprite.pose-sprite.pose-hurt{background-position:var(--pose-hurt,100%) 0}
@keyframes revenantSway{0%,100%{transform:scaleX(var(--enemy-facing,1)) translateY(0) rotate(0)}50%{transform:scaleX(var(--enemy-facing,1)) translateY(-2px) rotate(-1.2deg)}}
@keyframes revenantLunge{0%{transform:scaleX(var(--enemy-facing,1)) translateX(0)}35%{transform:scaleX(var(--enemy-facing,1)) translateX(-6%)}100%{transform:scaleX(var(--enemy-facing,1)) translateX(0)}}
@keyframes revenantRecoil{0%{transform:scaleX(var(--enemy-facing,1)) translateX(0);filter:brightness(1.8) drop-shadow(0 5px 3px #0009)}100%{transform:scaleX(var(--enemy-facing,1)) translateX(0);filter:drop-shadow(0 5px 3px #0009)}}
#hand .card.entombed{filter:sepia(.85) saturate(.6) brightness(.8);cursor:not-allowed;position:relative}
#hand .card.entombed:after{content:'☥ ENTOMBED';position:absolute;inset:40% 6% auto;padding:6px 0;text-align:center;font:700 13px system-ui;letter-spacing:.08em;color:#3b2a12;background:repeating-linear-gradient(-12deg,#e8d6a8 0 9px,#cdb57e 9px 12px);border:1px solid #8a6d3a;transform:rotate(-6deg)}
@media(prefers-reduced-motion:reduce){.wildlife-sprite.pose-sprite{animation:none!important}}
`;
  document.head.append(style);
}
