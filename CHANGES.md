# Balance pass — changes from upstream `achubu/Cardbound`

All changes validated against the repo's own real-script Node test harness
(`tests/*.test.cjs`, run via `node tests/<file>.test.cjs`). 8/8 pass, including
a new `tests/rebalance.test.cjs` written specifically to cover the new
mechanics below. `arena.html` (the standalone Battle Lab prototype) was left
untouched — none of these changes apply to it.

## Why

Goal: make card-level grinding actually necessary to beat tougher enemies,
without relying on RNG-driven difficulty spikes. Full design discussion and
Monte Carlo simulations that led to these numbers are in the conversation
this was built from.

## New mechanic: Armor / Pierce

- Enemies can now have a flat `armor` stat that reduces incoming non-Pierce
  card damage (`assets/expansion.js`, `cardEffect()`). A raw 6-damage Strike
  into 4 armor nets 2 damage; the same card at max level (16 damage) nets 12 —
  armor is what makes leveling *matter*, not just marginally help.
- New card **Shatter Lance** (`index.html`, `defs.shatter`) — 2-cost Attack,
  `pierce:true`, ignores armor entirely. This is the intended "answer card"
  for armored enemies.
- `rules()` in `index.html` now prints "Pierce: ignores enemy armor." on
  cards that have it.

## City enemy retuning (`index.html`, `enemies`)

| Enemy | Old HP/ATK | New HP/ATK/Armor |
|---|---|---|
| Ember Jackal, Circuit Thornling | 35-38 / 7 | unchanged / armor 0 (still the easy tier) |
| Briar Sentinel, Tunnel Borehound | 44-47 / 8 | 46-50 / 8 / armor 2 |
| Phase Shade, Data Wisp, Reactor Mauler | 52-62 / 9-10 | 56-65 / 10-11 / armor 3-4 |
| Crown Observer | 66 / 11 | 72 / 12 / armor 5 |
| Lunar Enforcer (boss) | 72 / 10 | 80 / 11 / armor 4 |
| Thorn Warden (boss) | 95 / 12 | 110 / 14 / armor 6 |

## Bug fix: 3 of the 10 city monsters never spawned

`roomSpawns()` in `assets/expansion.js` picked random patrols from a
hardcoded 5-type list that omitted **Briar Sentinel (vineguard)**,
**Reactor Mauler (forgeBeast)**, and **Crown Observer (crownEye)** — they
had full art, stats, and battle logic but could never actually appear in a
normal playthrough (confirmed by instrumenting `roomSpawns` directly). Fixed
by adding them to the spawn pool.

## Card rebalance (`index.html`, `defs`)

| Card | Old (Lv0→3) | New (Lv0→3) | Why |
|---|---|---|---|
| Ember Blade (strike) | 6/8/10/13 | 6/9/12/16 | steeper mastery reward, matters more against armor |
| Sundering Arc (cleave) | 13/16/19/23 | 13/17/21/26 | stays the top damage card at high levels |
| Winter Bastion | 12/15/18/22 | 11/14/17/21 | was strictly better than Guard at every level; toned down so Guard isn't dead weight |
| Bloom of Life (mend) | cost 1, 6/8/10/13 heal | cost 0, 5/7/9/12 heal | was the worst card in the pool; now free and always worth a slot |

## New card: Shatter Lance

2-cost, Pierce, 10/13/16/20 damage across levels. Added to both the city and
Elaris/Vespera reward pools.

## Bug fix: Elaris reward pool had zero defensive or healing cards

In `winBattle()` (`assets/expansion.js`), the post-victory reward pool for
Elaris/Vespera was `['cinder','venom','gale','counter']` — every option was
an elemental attack/counter card. There was **no way to earn another Bastion
or any healing card once you left the city.** Simulation showed this made
the natural choice (grab the new elemental cards) actively weaker against
the Bloom Tyrant than a deck that happened to still carry an old Bastion
(2.7%–40% win rate vs 26.7%–90% across card levels). Fixed by adding
`bastion` and `mend` to the Elaris/Vespera reward pool.

## Elaris / Vespera region scaling raised

In `startBattle()` (`assets/expansion.js`):
- Elaris: HP scale 1.35× → 1.75×, attack bonus +2 → +5
- Vespera: HP scale 1.6× → 2.1×, attack bonus +4 → +7

Simulation showed a Level-0 deck with zero elemental cards already won
97–100% against every Elaris wildlife type — the second zone wasn't gated at
all. This raises the floor so mastery (and actually using the Prismatic
Counter mechanic) starts to matter outside the boss fight too.

## Deliberately NOT included

Fortify (lingering block), Overclock (burst energy/self-damage), Chain
Lightning (combo scaling), and Adrenaline (comeback energy) were discussed
as design ideas but **not implemented** — they need new persistent
`state.battle` fields threaded through `save()`/`load()`/`validateImport()`,
and I couldn't verify that plumbing without a real browser session (the
Node test harness covers logic, not the full save/reload UI flow for new
fields). Recommend adding them one at a time with their own test-harness
coverage rather than all at once.

## Round 2 — healing, death penalty, loot chests, map tiering

### Mend buffed
`Bloom of Life` heal amounts raised from 5/7/9/12 → **7/9/12/16** (still 0
cost). Armor made fights longer, so sustain needed to scale with it.

### Defeat now heals to full HP
`loseBattle()` (`assets/expansion.js`) changed from `Math.max(1,Math.ceil
(state.maxHp/2))` to `state.hp=state.maxHp`. Death now fully resets HP
instead of leaving you at half.

**Worth knowing:** combined with the loot chest below, this means a
struggling player can retreat, lose on purpose, and come back at full HP —
the only real cost is a chance of losing a random Impermanent card (never a
Soulbound one). That's an intentional, low-friction way to "reset" a bad
run, but it also means death carries very little strategic weight anymore.
If that turns out to feel too forgiving in practice, the easiest dial to
turn is the loot chest's card-loss-on-death check in `baseLoseBattle()`
(`index.html`) — currently one random Impermanent card, always.

### New mechanic: Loot Chest (`assets/expansion.js`)
Replaced the old system (always get a card + separate ~8-10% potion roll)
with a single weighted roll on every non-boss victory:

- **1%** — Soulbound card (Phoenix/Oath/Verdict) — the jackpot
- **25%** — empty. The reward screen names a random animal
  (`LOOT_THIEVES` — fox, alley cat, crow, raccoon, sewer rat, stray dog)
  that got to the chest first and ran off with everything inside.
- **37%** — small healing potion
- **37%** — random Impermanent card from the usual reward pool

Implemented as `rollLootChest()`, called from `winBattle()`. The reward
screen (`renderBattle()`) was rewritten to show "VICTORY · LOOT CHEST" and
display whichever of the three outcomes actually happened. Boss-specific
guaranteed drops (Glacial Covenant, Stormglass Covenant, the extra 10%
boss-soulbound roll, the 8% elite-crystal roll) are unchanged and layer on
top of the chest roll as before.

This is a deliberate simplification: the old region-dependent potion odds
(10% city / 8% Elaris / 6% Vespera) are gone in favor of one flat rate
everywhere. If you want Vespera's chests to feel rarer/richer than the
city's, that's a natural follow-up (make `LOOT_CHEST_ODDS` a function of
`activeRegion`).

### Map redesign: enemies now scale with distance from the start room
Previously `roomSpawns()` picked enemy types from one flat list applied to
every city room regardless of location — a fresh player could stumble into
a "late-game" enemy one room from spawn. Fixed with real graph analysis, not
guesswork: computed actual BFS distance from Afterlight Refuge (`1,1`) across
all 24 city rooms (see `cityRoomDistances()`), then bucketed the spawn pool
by that distance:

| Distance from start | Spawn pool |
|---|---|
| 0-1 (adjacent) | Ember Jackal, Circuit Thornling only |
| 2 | + Tunnel Borehound, Briar Sentinel |
| 3 | Tunnel Borehound, Briar Sentinel, Phase Shade, Data Wisp |
| 4-5 (map edges) | Phase Shade, Data Wisp, Reactor Mauler, Crown Observer |

The real graph is shallow (max distance 5 across 24 rooms), which is why the
bands are close together — verified against the actual `CITY_ROOMS` graph,
not assumed. Designated boss rooms (Lunar Enforcer, Thorn Warden) are
untouched — tiering only changes the *random* patrol pool, never the
authored boss encounters. Warden Mainframe (Thorn Warden) sits at distance 4,
so the final boss now sits right at the hardest tier of the map, as intended.

## Round 3 — chest graphic + open button

The victory screen no longer reveals loot instantly. `winBattle()` still
resolves the roll immediately (state changes happen right away, same as
before), but the reward screen now shows a closed chest first:

- A new `.loot-chest-graphic` element, styled to glow like treasure, with an
  **"Open Chest"** button.
- No new image file was added — per your instruction, it **recycles
  `assets/items/upgrade-crystals.png`** (the existing Aetherlink crystal
  icon sheet), using the same `background-size:300%` slicing trick the
  crystal-collection UI already uses elsewhere in the codebase
  (`assets/mobile-crystals.css`), tinted gold via CSS `filter` (sepia +
  hue-rotate + drop-shadow) with a slow pulsing glow animation so it reads
  as "loot" rather than "tech crystal."
- Clicking **Open Chest** sets `b.chestOpened=true`, saves, and re-renders
  — only then does the actual result (card / potion / empty-with-thief /
  Soulbound) appear, exactly as it did before this change.

No test relies on the reward screen's exact markup (tests call the
underlying functions directly, not simulated clicks), so this was a
UI-only, zero-risk change — confirmed with 3 full back-to-back runs of the
whole suite (24/24 passes) since the loot-pool test involves real
unmocked randomness over thousands of trials.

## Testing

```
for f in tests/*.test.cjs; do node "$f"; done
```
All 8 pass. `tests/rebalance.test.cjs` covers armor/pierce math, the revived
enemy types, the Elaris reward-pool fix, the region-scaling increase, full-HP
defeat recovery, the loot chest's exact odds boundaries (0%, 0.99%, 1%,
49.9%, 50% rolls), and that distance-based tiering actually produces only
easy enemies next to the start and only hard ones at the map's edges, and
that the empty-chest band grants no card/potion while still naming a thief.
