'use strict';
// =====================================================================
// Round 379 (owner: boss rooms "unlocked using a system of breakers in the world and ... mini boss wins acquiring loot
// that unlocks rooms with bosses. These should require backtracking"). The locks of the generated Chronospire
// (assets/chrono-gen.js plans where everything stands; this file, loaded last of the world scripts, applies them):
//   1. Breaker 1 (Gate wing) opens the sealed door to wing A.
//   2. The Clockwarden, deep in wing A, guards the first gear piece; holding it opens Boss room 1, back in the Gate wing.
//   3. The Mainspring Colossus there carries the mainspring Breaker 2 (wing A) needs; Breaker 2 opens wing B.
//   4. The Paradox Twin, deep in wing B, guards the second gear piece; holding it opens Boss room 2, back in wing A.
//   5. The Hollow Hour there frees Breaker 3 (wing B); Breaker 3 opens The Last Second, beside the gate.
// The breakers are this world's three relay switches (assets/world-relays.js), so all three still open the Chrono Vault.
// Doors carry `requires: 'chrono:<token>'` (breaker1-3, loot1-2), answered by hasRelic().
// =====================================================================
const CHRONO_BOSSES = ['mainspringColossus', 'hollowHour'];
Object.assign(WORLD_RELAYS.chronospire.sw, { icon: '⚙', name: 'Spire Breaker' });
Object.assign(WORLD_RELAYS.chronospire, {
  swText: 'A brass breaker on a stone plinth, its lever down and its dial dark. Thrown, it sends the spire\'s power down a sealed line.',
  act: '⚙ Throw the breaker', onText: 'The breaker hums, its dial lit', grid: 'breakers thrown',
  toastOn: '⚙ Breaker thrown', toastAll: '⚙ All three breakers hum! The Chrono Vault is open.'
});
POI_INFO[WORLD_RELAYS.chronospire.sw.type] = { icon: '⚙', name: 'Spire Breaker' };
function chronoBreakerOn(i) { const s = typeof worldRelayState === 'function' && worldRelayState('chronospire'); return !!s && s.on.includes(i); }
function chronoBossDown(i) { return !!state && state.bosses.includes(CHRONO_BOSSES[i]); }
function chronoToken(t) {
  const gear = gearOf('chronospire');
  return t === 'breaker1' ? chronoBreakerOn(0) : t === 'breaker2' ? chronoBreakerOn(1) : t === 'breaker3' ? chronoBreakerOn(2)
    : t === 'loot1' ? ownsGear(gear[0]) : t === 'loot2' ? ownsGear(gear[1]) : false;
}
// What a lock is called on the Map screen and wherever a requirement is named.
if (typeof relicName === 'function') {
  const relicNameBeforeChronoLocks = relicName;
  relicName = function (id) {
    if (typeof id !== 'string' || !id.startsWith('chrono:')) return relicNameBeforeChronoLocks.apply(this, arguments);
    const t = id.slice(7), gear = gearOf('chronospire');
    return t === 'loot1' ? GEAR[gear[0]].name : t === 'loot2' ? GEAR[gear[1]].name : 'Breaker ' + t.slice(-1);
  };
}
const hasRelicBeforeChronoLocks = hasRelic;
hasRelic = function (id) { return typeof id === 'string' && id.startsWith('chrono:') ? chronoToken(id.slice(7)) : hasRelicBeforeChronoLocks.apply(this, arguments); };

// The locked doors, set on the live room table after every other script has shaped it.
function chronoLockedDoors() {
  const g = typeof chronoMap !== 'undefined' && chronoMap; if (!g) return [];
  const only = k => Object.values(g.layout[k].exits)[0], R = g.roles;
  return [[g.doors.A[0], g.doors.A[1], 'breaker1'], [g.doors.B[0], g.doors.B[1], 'breaker2'], [R.boss1, only(R.boss1), 'loot1'], [R.boss2, only(R.boss2), 'loot2'], [R.boss, only(R.boss), 'breaker3']];
}
function chronoApplyLocks() {
  for (const [a, b, token] of chronoLockedDoors()) for (const [x, y] of [[a, b], [b, a]]) {
    const r = rooms[x]; if (!r) continue;
    for (const [dir, raw] of Object.entries(r.exits)) if ((typeof raw === 'string' ? raw : raw && raw.to) === y) r.exits[dir] = { to: y, requires: 'chrono:' + token };
  }
}
const configureRegionBeforeChronoLocks = configureRegion;
configureRegion = function (region) { const out = configureRegionBeforeChronoLocks.apply(this, arguments); if (region === 'chronospire') chronoApplyLocks(); return out; };

function chronoLockMessage(token) {
  const R = chronoMap.roles, name = k => rooms[k] ? rooms[k].name : '?', gear = gearOf('chronospire');
  if (token === 'breaker1') return 'A sealed wing door, its gears dead. The breaker in ' + name(R.breaker1) + ' powers it.';
  if (token === 'breaker2') return 'A sealed wing door. The breaker in ' + name(R.breaker2) + ' powers it' + (chronoBossDown(0) ? '.' : ', and that breaker needs the mainspring The Mainspring Colossus carries.');
  if (token === 'breaker3') return 'The last door. The breaker in ' + name(R.breaker3) + ' powers it' + (chronoBossDown(1) ? '.' : ', and that breaker stays dead while The Hollow Hour holds its hour.');
  const i = token === 'loot1' ? 0 : 1, mini = i ? 'The Paradox Twin' : 'The Clockwarden';
  return 'This door answers only to the ' + GEAR[gear[i]].name + ', guarded by ' + mini + ' in ' + name(i ? R.mini2 : R.mini1) + '.';
}
const transitionBeforeChronoLocks = transition;
transition = function (dir) {
  const info = exitInfo(dir);
  if (activeRegion === 'chronospire' && info && typeof info.requires === 'string' && info.requires.startsWith('chrono:') && doorLocked(info)) { toast(chronoLockMessage(info.requires.slice(7))); return false; }
  return transitionBeforeChronoLocks.apply(this, arguments);
};

// The breakers stand where the map planned them, not where the relay bands would put them.
const worldRelayRoomsBeforeChronoLocks = worldRelayRooms;
worldRelayRooms = function () {
  if (activeRegion === 'chronospire' && state && typeof chronoEnsure === 'function') { chronoEnsure(); const R = chronoMap.roles; return [R.breaker1, R.breaker2, R.breaker3]; }
  return worldRelayRoomsBeforeChronoLocks.apply(this, arguments);
};
// Breakers 2 and 3 are dead until the boss before them is beaten.
const openRelayBeforeChronoLocks = openRelay;
openRelay = function (p) {
  if (activeRegion === 'chronospire' && p && p.index >= 1 && !chronoBreakerOn(p.index) && !chronoBossDown(p.index - 1)) {
    return relayMenu('⚙ Spire Breaker', p.index === 1
      ? '<p>The lever swings loose: the breaker\'s mainspring has been torn out.</p><p class="notice">The Mainspring Colossus carries it. Its foundry, ' + rooms[chronoMap.roles.boss1].name + ', opens to whoever holds the ' + GEAR[gearOf('chronospire')[0]].name + '.</p>'
      : '<p>The dial runs backwards and the lever will not stay thrown: something is holding this hour still.</p><p class="notice">The Hollow Hour keeps it. Its room, ' + rooms[chronoMap.roles.boss2].name + ', opens to whoever holds the ' + GEAR[gearOf('chronospire')[1]].name + '.</p>', []);
  }
  return openRelayBeforeChronoLocks.apply(this, arguments);
};
if (typeof poiArt === 'function') {
  const poiArtBeforeChronoLocks = poiArt;
  poiArt = function (p) { return activeRegion === 'chronospire' && p && p.type === WORLD_RELAYS.chronospire.sw.type ? (chronoBreakerOn(p.index) ? 'chronospire-breaker-on' : 'chronospire-breaker') : poiArtBeforeChronoLocks.apply(this, arguments); };
}

// The objective names the next step of the chain.
function chronoNextStep() {
  if (!state || typeof chronoMap === 'undefined' || !chronoMap) return null;
  const R = chronoMap.roles, name = k => rooms[k] ? rooms[k].name : '?', gear = gearOf('chronospire'), g = i => GEAR[gear[i]].name;
  if (!chronoBreakerOn(0)) return ['breaker1', 'Throw the breaker in ' + name(R.breaker1) + ' to open the sealed wing.'];
  if (!ownsGear(gear[0])) return ['mini1', 'Defeat The Clockwarden in ' + name(R.mini1) + ' for the ' + g(0) + ': it opens ' + name(R.boss1) + '.'];
  if (!chronoBossDown(0)) return ['boss1', 'The ' + g(0) + ' opens ' + name(R.boss1) + '. Defeat The Mainspring Colossus there.'];
  if (!chronoBreakerOn(1)) return ['breaker2', 'With the Colossus\'s mainspring, throw the breaker in ' + name(R.breaker2) + ' to open the second wing.'];
  if (!ownsGear(gear[1])) return ['mini2', 'Defeat The Paradox Twin in ' + name(R.mini2) + ' for the ' + g(1) + ': it opens ' + name(R.boss2) + '.'];
  if (!chronoBossDown(1)) return ['boss2', 'The ' + g(1) + ' opens ' + name(R.boss2) + '. Defeat The Hollow Hour there.'];
  if (!chronoBreakerOn(2)) return ['breaker3', 'The hour is freed. Throw the breaker in ' + name(R.breaker3) + ' to open ' + name(R.boss) + '.'];
  return ['boss', name(R.boss) + ' is open. Face The Chronarch.'];
}
const objectiveBeforeChronoLocks = objective;
objective = function () {
  if (activeRegion !== 'chronospire' || !state || state.bosses.includes('chronarch')) return objectiveBeforeChronoLocks.apply(this, arguments);
  const step = chronoNextStep(); return step ? step[1] : objectiveBeforeChronoLocks.apply(this, arguments);
};

// A gate stands in each locked doorway of the room: sealed, or open once its lock is answered.
const renderWorldBeforeChronoLocks = renderWorld;
renderWorld = function () {
  const out = renderWorldBeforeChronoLocks.apply(this, arguments);
  if (!state || state.battle || activeRegion !== 'chronospire' || typeof document === 'undefined' || !document.createElement) return out;
  const world = $('world'), r = rooms[state.room]; if (!world || !world.append || !r) return out;
  for (const [dir, raw] of Object.entries(r.exits)) {
    if (!raw || typeof raw !== 'object' || typeof raw.requires !== 'string' || !raw.requires.startsWith('chrono:')) continue;
    const d = typeof organicDoor === 'function' && organicDoor(state.room, dir); if (!d || !d.edge) continue;
    const el = document.createElement('img'); el.className = 'chrono-gate'; el.alt = '';
    el.src = 'assets/items/poi/chronospire-gate-' + (doorLocked(raw) ? 'sealed' : 'open') + '.webp?v=379';
    el.style.cssText = 'position:absolute;left:' + Math.max(46, Math.min(754, d.edge.x)) + 'px;top:' + Math.max(40, Math.min(470, d.edge.y + 22)) + 'px;width:92px;transform:translate(-50%,-62%);pointer-events:none;z-index:1';
    world.append(el);
  }
  return out;
};
