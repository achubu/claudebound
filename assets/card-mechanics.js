'use strict';
// =====================================================================
// Round 206: three card mechanics from the Cardbound concept lab (assets/concepts/cards.json
// there; review-only text proposals, picked for fitting this game without new screens).
// - ⤳ Follow-through: a bonus if the card you played just before this one, this turn, was of the
//   named kind (an Attack, or a Defense). Side cards, pitching and Suspend's automatic plays
//   neither start nor continue a sequence.
// - ⚡ Amplify: play it for 1 more energy for a bonus (a second button under the card). It
//   competes with banking unspent energy as Aether.
// - ◇ Choose one: two printed modes; pick one with the buttons under the card (clicking the card
//   plays the first). Only that mode resolves.
// Numbers start from the concept lab's and sit just under the dedicated cards of each role.
// =====================================================================
// Solaris (Round 207; was Neon Aftermath)
tieredCard('cinderCapacitor', 'Cinder Capacitor', 1, 'Attack', '⚡', [{ damage: 5, amplify: { damage: 6 } }, { damage: 7, amplify: { damage: 7 } }, { damage: 9, amplify: { damage: 8 } }, { damage: 12, amplify: { damage: 10 } }]);
tieredCard('duskProtocol', 'Dusk Protocol', 1, 'Skill', '◐', [{ modes: [{ damage: 5 }, { block: 4 }] }, { modes: [{ damage: 7 }, { block: 6 }] }, { modes: [{ damage: 9 }, { block: 8 }] }, { modes: [{ damage: 12 }, { block: 10 }] }]);
// Vespera (Round 207; was Elaris)
tieredCard('crystalAegis', 'Crystal Aegis', 1, 'Defense', '❖', [{ block: 4, amplify: { block: 5 } }, { block: 6, amplify: { block: 6 } }, { block: 8, amplify: { block: 7 } }, { block: 10, amplify: { block: 9 } }]);
tieredCard('tidalDecision', 'Tidal Decision', 1, 'Skill', '≋', [{ modes: [{ block: 7 }, { draw: 1 }] }, { modes: [{ block: 9 }, { draw: 1 }] }, { modes: [{ block: 12 }, { draw: 1 }] }, { modes: [{ block: 15 }, { draw: 1 }] }], { exhaust: true });
// Chronospire (Round 207; was Vespera)
tieredCard('wardbreakerStep', 'Wardbreaker Step', 1, 'Attack', '⤳', [{ damage: 4, follow: { after: 'Defense', damage: 4 } }, { damage: 6, follow: { after: 'Defense', damage: 5 } }, { damage: 8, follow: { after: 'Defense', damage: 6 } }, { damage: 10, follow: { after: 'Defense', damage: 8 } }]);
tieredCard('afterimageWard', 'Afterimage Ward', 1, 'Defense', '⤳', [{ block: 3, follow: { after: 'Attack', block: 4 } }, { block: 5, follow: { after: 'Attack', block: 4 } }, { block: 6, follow: { after: 'Attack', block: 5 } }, { block: 8, follow: { after: 'Attack', block: 6 } }]);
// Round 207: each pair moved up a world (Neon Aftermath had enough cards).
const MECH_CARDS = { elaris: ['cinderCapacitor', 'duskProtocol'], vespera: ['crystalAegis', 'tidalDecision'], chronospire: ['wardbreakerStep', 'afterimageWard'] };
for (const [world, ids] of Object.entries(MECH_CARDS)) { VARIETY_POOLS[world].push(...ids); for (const id of ids) NEW_CARD_WORLD[id] = world; }

// The kind a card counts as for Follow-through.
function mechKindIs(id, kind) { const k = (defs[id] && defs[id].kind) || ''; return kind === 'Attack' ? /Attack/.test(k) : kind === 'Defense' ? /Defense/.test(k) : k === kind; }
function followReady(b, d) { return !!(b && d && d.follow && b.chain && b.chain.turn === b.turn && mechKindIs(b.chain.id, d.follow.after)); }
const MODE_TEXT = { damage: n => 'deal ' + n + ' damage', block: n => 'gain ' + n + ' Block', draw: n => 'draw ' + n + ' card' + (n > 1 ? 's' : '') };
function modeText(m) { return Object.entries(m).map(([k, n]) => MODE_TEXT[k] ? MODE_TEXT[k](n) : k).join(' and '); }
function mechAddBonus(out, bonus) { for (const [k, n] of Object.entries(bonus)) if (k !== 'after') out[k] = (out[k] || 0) + n; }

let mechPlain = false; // while writing rules text, show the printed numbers
const statBeforeMech = stat;
stat = function (c) {
  const d = statBeforeMech(c);
  if (!d || !(d.amplify || d.modes || d.follow)) return d;
  const b = typeof state === 'object' && state && state.battle, out = { ...d };
  if (d.modes) { const pick = b && b.modePick && b.modePick.uid === c.uid ? b.modePick.mode : 0; Object.assign(out, d.modes[pick] || d.modes[0]); }
  if (mechPlain || !b) return out;
  if (d.amplify && b.amplifyUid === c.uid) { out.cost = d.cost + 1; mechAddBonus(out, d.amplify); }
  if (followReady(b, d)) mechAddBonus(out, d.follow);
  return out;
};
const rulesBeforeMech = rules;
rules = function (c) {
  const def = defs[c && c.id], d = def && def.tiers[c.level || 0];
  if (!d || !(d.amplify || d.modes || d.follow)) return rulesBeforeMech(c);
  if (d.modes) return 'Choose one: ' + d.modes.map(modeText).join('; or ') + '.' + (def.exhaust ? ' Exhaust.' : '');
  mechPlain = true; let text; try { text = rulesBeforeMech(c); } finally { mechPlain = false; }
  if (d.amplify) text += ' ⚡ Amplify (+1 energy): ' + modeText(d.amplify).replace(/^deal (\d+) damage$/, '+$1 damage').replace(/^gain (\d+) Block$/, '+$1 Block') + '.';
  if (d.follow) text += ' ⤳ Follow-through: if the card you played just before this one, this turn, was ' + (d.follow.after === 'Attack' ? 'an Attack' : 'a Defense') + ', ' + (d.follow.damage ? '+' + d.follow.damage + ' damage' : '+' + d.follow.block + ' Block') + '.';
  return text;
};

// Play with a choice made (Amplify or a mode), then clear it.
function playCardWith(i, choice) {
  const b = state && state.battle, c = b && b.hand[i]; if (!c) return;
  if (choice.amplify) b.amplifyUid = c.uid; else b.modePick = { uid: c.uid, mode: choice.mode };
  try { playCard(i); } finally { if (state.battle === b) { b.amplifyUid = null; b.modePick = null; } }
}
// Follow-through remembers the last card you played by hand this turn.
const playCardBeforeMech = playCard;
playCard = function (i) {
  const b = state && state.battle, c = b && b.hand[i], auto = !!(b && c && b.firingUid === c.uid);
  const d = c && stat(c), amplified = !!(b && c && b.amplifyUid === c.uid), followed = !!(b && d && followReady(b, d));
  const r = playCardBeforeMech.apply(this, arguments);
  if (b && c && !b.hand.includes(c) && state.battle === b) {
    if (amplified) b.logs.push('⚡ Amplified ' + d.name + '.');
    if (followed) b.logs.push('⤳ Follow-through: ' + d.name + ' ' + (d.follow.damage ? '+' + d.follow.damage + ' damage' : '+' + d.follow.block + ' Block') + '.');
    if (!auto) { b.chain = { turn: b.turn, id: c.id }; if (b.phase === 'fight') renderBattle(); } // redraw: the next card may now glow
  }
  return r;
};

// Buttons under Amplify and Choose-one cards, and a glow on a ready Follow-through.
const renderBattleBeforeMech = renderBattle;
renderBattle = function () {
  renderBattleBeforeMech.apply(this, arguments);
  const b = state && state.battle; if (!b || b.phase !== 'fight' || typeof document === 'undefined' || !document.querySelectorAll) return;
  document.querySelectorAll('#hand .card-wrap').forEach((wrap, i) => {
    const c = b.hand[i], def = c && defs[c.id], d = def && def.tiers[c.level || 0]; if (!d || !wrap.append) return;
    const add = (label, title, ok, choice) => {
      const btn = document.createElement('button'); btn.className = 'ability mech-choice'; btn.textContent = label; btn.title = title; btn.disabled = !ok;
      btn.onclick = e => { if (e && e.stopPropagation) e.stopPropagation(); playCardWith(i, choice); }; wrap.append(btn);
    };
    if (d.amplify) add('⚡ Amplify · ' + (def.cost + 1) + ' energy', 'Play for 1 more energy: ' + modeText(d.amplify) + ' more.', b.energy >= def.cost + 1, { amplify: true });
    if (d.modes) d.modes.forEach((m, k) => add((k ? '◇ ' : '◆ ') + modeText(m).replace(/^./, s => s.toUpperCase()), 'Choose this mode.', b.energy >= def.cost, { mode: k }));
    if (d.follow && followReady(b, d)) { const card = wrap.querySelector && wrap.querySelector('.card'); if (card && card.classList) card.classList.add('follow-ready'); }
  });
};
if (typeof document !== 'undefined' && document.createElement && document.head) {
  const st = document.createElement('style');
  st.textContent = '.ability.mech-choice{border-color:#8fd7ff;color:#d8f2ff}#hand .card.follow-ready{box-shadow:0 0 0 2px #ffd36a,0 0 16px #ffd36a99}';
  document.head.append(st);
}
