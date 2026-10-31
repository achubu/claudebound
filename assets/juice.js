'use strict';
// =====================================================================
// Round 285 (owner request): combat feel. Damage, healing and Block float up from the health bars; a big hit
// shakes the screen; a Hack crash, a counter or a boss's Phase 2 flashes; and short synthesised sounds play for
// hits, Block, healing, crashes, wins and losses (Web Audio, no sound files). The 🔊 button in the battle bar
// mutes them (remembered in this browser). Nothing here changes the rules.
// =====================================================================
const JUICE_SOUND_KEY = 'aethercede-sound';
let juiceAudio = null, juiceLast = null;
function juiceMuted() { try { return localStorage.getItem(JUICE_SOUND_KEY) === 'off'; } catch (e) { return false; } }
function juiceSetMuted(off) { try { localStorage.setItem(JUICE_SOUND_KEY, off ? 'off' : 'on'); } catch (e) { /* private mode */ } }
function juiceCtx() {
  if (juiceMuted() || typeof window === 'undefined') return null;
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
  if (!juiceAudio) { try { juiceAudio = new AC(); } catch (e) { return null; } }
  if (juiceAudio.state === 'suspended' && juiceAudio.resume) juiceAudio.resume();
  return juiceAudio;
}
// One short tone or noise burst: freq (Hz) gliding to freq2 over dur seconds.
function juiceTone(type, freq, freq2, dur, vol = .15, delay = 0) {
  const ctx = juiceCtx(); if (!ctx) return;
  const t = ctx.currentTime + delay, g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); g.connect(ctx.destination);
  if (type === 'noise') {
    const len = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq; src.buffer = buf; src.connect(f); f.connect(g); src.start(t); return;
  }
  const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, freq2), t + dur); o.connect(g); o.start(t); o.stop(t + dur + .02);
}
const JUICE_SOUNDS = {
  hit: () => { juiceTone('noise', 1800, 0, .12, .22); juiceTone('square', 180, 70, .1, .06); },
  bigHit: () => { juiceTone('noise', 900, 0, .3, .32); juiceTone('sawtooth', 120, 40, .25, .1); },
  hurt: () => { juiceTone('sawtooth', 220, 90, .18, .09); },
  block: () => { juiceTone('triangle', 260, 180, .12, .12); },
  heal: () => { juiceTone('sine', 520, 880, .22, .1); juiceTone('sine', 780, 1170, .2, .06, .06); },
  crash: () => { juiceTone('square', 1400, 120, .25, .07); juiceTone('noise', 4000, 0, .15, .12, .05); },
  phase: () => { juiceTone('sawtooth', 110, 55, .6, .12); juiceTone('square', 220, 110, .5, .05, .1); },
  win: () => { [523, 659, 784, 1047].forEach((f, i) => juiceTone('triangle', f, f, .22, .12, i * .09)); },
  lose: () => { [392, 311, 233].forEach((f, i) => juiceTone('triangle', f, f * .97, .3, .12, i * .16)); }
};
function juiceSound(name) { const f = JUICE_SOUNDS[name]; if (f) try { f(); } catch (e) { /* audio is best-effort */ } }

// Floating numbers and effects, from what changed since the last battle render.
function juiceFloat(anchor, text, cls) {
  if (!anchor || !anchor.getBoundingClientRect || !document.body) return;
  const r = anchor.getBoundingClientRect(), n = document.createElement('div');
  n.className = 'juice-float ' + cls; n.textContent = text;
  n.style.left = (r.left + r.width * (.35 + Math.random() * .3)) + 'px'; n.style.top = (r.top - 6) + 'px';
  document.body.append(n); setTimeout(() => n.remove(), 1100);
}
function juiceShake(strong) { const m = $('battleModal'); if (!m || !m.classList) return; m.classList.remove('juice-shake', 'juice-shake-big'); void m.offsetWidth; m.classList.add(strong ? 'juice-shake-big' : 'juice-shake'); setTimeout(() => m.classList.remove('juice-shake', 'juice-shake-big'), 450); }
function juiceFlash(color) { const m = $('battleModal'); if (!m || !m.append) return; const f = document.createElement('div'); f.className = 'juice-flash'; f.style.setProperty('--jf', color); m.append(f); setTimeout(() => f.remove(), 500); }
function juiceSnapshot(b) { return { id: b.spawnId, turn: b.turn, ehp: b.enemy.hp, hp: state.hp, block: b.block || 0, eguard: b.enemy.guard || 0, logs: (b.logs || []).length, phase: b.phase }; }
function juiceReact(b, prev, now) {
  const enemyBar = document.querySelector('#battleModal .hp-row.enemy'), youBar = document.querySelector('#battleModal .hp-row.you');
  const newLogs = (b.logs || []).slice(prev.logs).join(' ');
  const dealt = prev.ehp - now.ehp, lost = prev.hp - now.hp, gained = now.block - prev.block;
  if (dealt > 0) { juiceFloat(enemyBar, '−' + dealt, 'dmg'); const big = dealt >= Math.max(12, b.enemy.maxHp * .15); juiceSound(big ? 'bigHit' : 'hit'); if (big) juiceShake(false); }
  if (dealt < 0) juiceFloat(enemyBar, '+' + (-dealt), 'heal');
  if (lost > 0) { juiceFloat(youBar, '−' + lost, 'dmg'); juiceSound('hurt'); if (lost >= state.maxHp * .25) { juiceShake(true); juiceFlash('#ff3b3b'); } } // Round 295 (owner): the screen shakes only on big hits
  if (lost < 0) { juiceFloat(youBar, '+' + (-lost), 'heal'); juiceSound('heal'); }
  if (gained > 0 && now.turn === prev.turn) { juiceFloat(youBar, '+' + gained + ' 🛡', 'block'); juiceSound('block'); }
  if (/System crash/.test(newLogs)) { juiceFlash('#5ff2e0'); juiceSound('crash'); }
  if (/countered|Counter/.test(newLogs) && dealt <= 0) juiceFlash('#8fd8ff');
  if (/Phase 2/.test(newLogs)) { juiceFlash('#ff9a3c'); juiceSound('phase'); }
}
const renderBattleBeforeJuice = renderBattle;
renderBattle = function () {
  const out = renderBattleBeforeJuice.apply(this, arguments);
  const b = state && state.battle; if (!b || typeof document === 'undefined' || !document.querySelector) { juiceLast = null; return out; }
  if (b.phase === 'fight') {
    const now = juiceSnapshot(b);
    if (juiceLast && juiceLast.id === now.id && juiceLast.phase === 'fight') juiceReact(b, juiceLast, now);
    juiceLast = now;
    const bar = document.querySelector('#battleModal .compact-bar');
    if (bar && !bar.querySelector('.juice-mute')) {
      const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'juice-mute'; btn.title = 'Sound on/off';
      btn.textContent = juiceMuted() ? '🔇' : '🔊'; btn.onclick = e => { e.stopPropagation(); juiceSetMuted(!juiceMuted()); btn.textContent = juiceMuted() ? '🔇' : '🔊'; if (!juiceMuted()) juiceSound('block'); };
      const end = bar.querySelector('#endTurn'); if (end && end.before) end.before(btn); else bar.append(btn);
    }
  } else if (juiceLast && juiceLast.id === b.spawnId && juiceLast.phase === 'fight') {
    juiceSound(b.phase === 'lost' ? 'lose' : 'win'); juiceLast = null;
  }
  return out;
};
if (typeof document !== 'undefined' && document.createElement && document.head) {
  const st = document.createElement('style');
  st.textContent = '.juice-float{position:fixed;z-index:600;pointer-events:none;font:900 22px/1 system-ui;text-shadow:0 2px 0 #000,0 0 10px currentColor;animation:juiceUp 1.1s ease-out forwards}'
    + '.juice-float.dmg{color:#ff6b5a}.juice-float.heal{color:#6dff9a}.juice-float.block{color:#8fd0ff;font-size:18px}'
    + '@keyframes juiceUp{0%{transform:translate(-50%,6px) scale(.7);opacity:0}15%{transform:translate(-50%,-6px) scale(1.15);opacity:1}100%{transform:translate(-50%,-48px) scale(1);opacity:0}}'
    + '#battleModal.juice-shake{animation:juiceShake .3s}#battleModal.juice-shake-big{animation:juiceShakeBig .45s}'
    + '@keyframes juiceShake{20%{transform:translate(-3px,1px)}40%{transform:translate(3px,-1px)}60%{transform:translate(-2px,1px)}80%{transform:translate(2px,0)}}'
    + '@keyframes juiceShakeBig{15%{transform:translate(-7px,2px)}30%{transform:translate(6px,-3px)}45%{transform:translate(-5px,2px)}60%{transform:translate(4px,-1px)}80%{transform:translate(-2px,1px)}}'
    + '.juice-flash{position:absolute;inset:0;z-index:40;pointer-events:none;border-radius:inherit;background:radial-gradient(circle,transparent 30%,var(--jf) 140%);animation:juiceFlash .5s ease-out forwards}'
    + '@keyframes juiceFlash{0%{opacity:.85}100%{opacity:0}}'
    + '#battleModal .juice-mute{margin-left:auto;margin-right:6px;padding:4px 9px;font-size:15px;line-height:1}'
    + '@media(prefers-reduced-motion:reduce){#battleModal.juice-shake,#battleModal.juice-shake-big{animation:none}.juice-float{animation-duration:.6s}}';
  document.head.append(st);
}
