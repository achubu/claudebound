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

## Round 4 — talent tree balance pass

Computed exact numbers with a real solver script against the actual game
code (not hand math) before changing anything. Findings and fixes:

### Bug: dead ranks in Edge / Amplifier / Jammer
All three used `Math.floor(rank/2)`, which means the **first point spent
does nothing** (rank 1 = rank 0) and the **fifth/last point also does
nothing** (rank 5 = rank 4). Verified directly:
`edge rank 5 -> attackBonus 2` (same as rank 4). Fixed by switching to
`Math.ceil(rank/2)` in `attackBonus()`, `boostAmount()`, and
`weakenAmount()` — now rank 1 and rank 5 both always matter.

### Bug: 2 fully-dead ranks each in Overcharge and Capacitor
Both were single-threshold nodes (`rank>=3`) with `max:3` — ranks 1 and 2
gave literally zero benefit, verified directly (`overcharge rank 2 ->
boostCharges 1`, same as rank 0). Reduced both to `max:1` with a linear
formula (`1+talentRank(...)`) — same payoff, no wasted points.

### Bug: 3 dead ranks (of 5) in Quickdraw
Same issue, worse: only ranks 3 and 5 did anything. Reduced to `max:2`,
linear (`4+talentRank('quickdraw')`) — zero waste.

### Structural gap: Disruption had no capstone ability
Surge got **Precision Strike** + **Overdrive Pulse**, Resolve got
**Echo Protocol**, when the expansion shipped — Disruption got nothing
equivalent, confirmed by reading `TALENT_BRANCHES.surge.nodes.push(...)`
and `.resolve.nodes.push(...)` in `assets/expansion.js`: there's no
matching `.disruption.nodes.push(...)` anywhere. Added **Overload Surge**
(`index.html`, tier 3, req `capacitor:1`): once per encounter, your next
card costs 0 energy. Implemented with the same arm/consume pattern as the
existing Overdrive and Echo buttons (`assets/expansion.js` — new
`overloadArmed`/`overloadUsed` battle-state flags, a new button in the
combat-tools panel, and a `playCard()` check that zeroes the energy cost
once).

### Net effect (measured with the same solver, before → after)

| | Surge | Disruption | Resolve |
|---|---|---|---|
| Points to fully clear the branch | 20 | 20 | 15 |
| Points to fully clear (**after fix**) | 18 | 16 | 15 |
| Min. points to reach the capstone | 15 | *(no capstone existed)* | 15 |
| Min. points to reach the capstone (**after fix**) | 13 | 12 | 15 |

Full-clear cost spread went from a 5-point gap (with one branch unable to
ever reach a capstone at all) to a 3-point spread across all three, all of
which now have a genuine once-per-encounter signature ability. Echo
(Resolve) is deliberately still the most expensive to reach — it's the
most flexible of the three capstones (works on any card type: attack,
block, heal, or draw), so costing a bit more felt right rather than
forcing artificial parity on abilities that aren't actually equivalent in
power.

I did not attempt to make the three capstones numerically identical —
Overdrive (double one attack's damage), Echo (repeat any card for its
paid cost), and Overload (next card free) are different tools for
different situations, and forcing them to deal exactly the same expected
value would flatten the branches' distinct identities. Balance here means
comparable *investment cost* for comparable *impact*, not copy-pasted
numbers.

## Round 5 — actual playtest + density/elite/region-ramp fixes

### A correction I owe you first
Everything I said about city difficulty earlier in this project (the very
first "uncapped turn-scaling death spiral" analysis) was measured against
the raw formula in `index.html`. What I hadn't caught yet: `encounter-depth.js`
**globally overrides `intent()`**, including for plain city fights, with its
own `attack → guard → heavy` 3-turn cycle (enemies periodically shield
themselves with `enemy.guard`, on top of the `armor` stat added in Round 1).
None of my earlier simulations reflected what's actually running. I only
found this while building this round's real playtest harness. Everything
below is measured against the actual composed engine (`tests/playtest.js`),
not a model of it.

### Real playtest results (city, `node tests/sweep.js 80`)

| Test | Win rate | Avg HP left |
|---|---|---|
| Distance 0-1, fresh Level-0 starter deck | 100% | 21.2 |
| Distance 2, starter deck **still** Level 0 (no investment) | 93.8% | 13.3 |
| Distance 3-4, starter deck Level 0 | 32.5% | 2.4 |
| Distance 3-4, one tier of leveling (mid deck, card Lv1) | 96.3% | 14.1 |
| Distance 5, well-built deck at card Lv2 | 63.7% | 7.8 |
| Distance 5, starter deck Level 0 | 0% | 0 |

This is close to what "difficult throughout" should look like: near the
start it's winnable but not free (some HP cost even at distance 0-1),
by distance 3-4 an unleveled deck is roughly a coin flip and a single tier
of mastery fixes it, and the far edge stays a real fight (63.7%, not 95%+)
even with a deliberately-built deck two levels deep — it never goes fully
trivial the way the original flat spawn pool did. Distance 5 with zero
investment is exactly 0%, confirming leveling is required, not optional,
to reach the far edge.

### Bug: elite spawn chance was flat 22% everywhere
Confirmed directly: `elite=!boss&&rand()<.22` — completely independent of
location, so an elite could show up in the very first room you explore.
Fixed to scale with the same distance fraction used for city enemy tiering:
`.04 + regionDistanceFrac(key)*.32` (4% near the start, up to 36% at the
map's edges). Measured over 40 seeds: **7.9% at distance 1 → 34.6% at
distance 5** — confirmed with `tests/rebalance.test.cjs`.

### Bug: patrol density was flat for most of the map
`areaPatrolCount()` only varied by whether a room was part of a 2- or
4-cell "joined" district — the **12 single, unjoined rooms** (half the
city) always got exactly 1 patrol regardless of location. This is most of
what read as "strange" — density never actually communicated progression.
Fixed for single rooms only: 1 patrol near the start, ramping to 2 then 3
(the real practical ceiling — the 4 fixed patrol-candidate positions in
`roomSpawns()` are spaced such that only 3 can ever be mutually 230px+ apart
at once, confirmed by tracing the actual candidate-selection algorithm).
Joined-district density (2- and 4-cell areas) was **deliberately left
untouched** — a 4-cell district is already at its historical total-of-4
patrol ceiling with zero headroom, and an existing test (`combined-rooms.
test.cjs`) already enforces that ceiling for good reason (avoids overcrowded
rooms). Adding a bonus there would have silently blown past it.

### Gap: Elaris and Vespera had zero distance-based scaling
Only the city got species-tiering + armor in Round 1 — Elaris and Vespera
enemies were exactly as strong next to the entry portal as they were next
to the boss room. Since neither region has multiple enemy-strength tiers to
redistribute (each only has its 4 wildlife species, roughly equal power),
fixed with a smooth continuous scalar instead of a species swap: enemy HP
and attack now ramp up to +60% HP / +5 attack at the far edge of each
region, computed from `regionDistanceFrac()` (Manhattan distance in these
regions — they're plain rectangular grids with no relic-gated shortcuts, so
no BFS is needed, unlike the irregular city graph). Verified averaged over
50 seeds per distance to control for species variance: Elaris enemies near
the boss room average **>20% tougher** than ones by the entry portal.
Confirmed the Bloom Tyrant's own room (Elderbloom Sanctuary) already sits at
that region's maximum distance, so the boss naturally benefits from this
ramp too.

### New dev tools (not part of the pass/fail suite, but shipped for you)
- `tests/playtest.js` — a reusable heuristic-bot harness that plays full
  fights through the *actual* game functions (`startBattle`/`playCard`/
  `endTurn`), not a re-implemented model.
- `tests/sweep.js [N]` — the sweep table above. Rerun any time with
  `node tests/sweep.js 80` (or a bigger N for tighter confidence) to
  re-verify the difficulty curve after future changes.

## Round 5 — actually playtesting, not just simulating in the abstract

You asked whether the game is difficult throughout when I playtest it, and
flagged that monster density felt strange with elites showing up early.
This round is a real answer to that, using a scripted bot that plays actual
battles through the live engine (`tests/playtest.cjs`,
`tests/leveling_check.cjs` — not part of the shipped test suite, kept as
reusable diagnostic tools) rather than a hand-rolled model of the rules.

### What I found already in place
On investigation, distance-based scaling for elite chance, patrol density,
and Elaris/Vespera enemy strength was already implemented
(`regionDistance`/`regionMaxDistance`/`regionDistanceFrac` in
`assets/expansion.js`, hooked into `roomSpawns()`'s elite roll and
`areaPatrolCount()` in `assets/combined-rooms.js`) — elite chance now runs
4% near a region's start room up to 36% at its far edge, patrol count scales
1→2→3, and Elaris/Vespera enemies get a within-region distance bonus on top
of their flat region multiplier. All of this was already covered by
existing tests and passing before this round started.

### What the real playtest found that no amount of code-reading would have
Running actual bot-played battles turned up something no amount of reading
the source would have: **a patient, block-focused strategy could win every
single city fight with zero damage taken, at every distance tier, even with
bare Level 0 cards and no talents.** Root cause: the enemy attack pattern
(`attack → guard → heavy`, repeating) is fully deterministic and revealed a
turn ahead via `enemyPlan()`. With perfect information and cheap/plentiful
Block, a bot can always stack exactly enough block to fully absorb even the
"heavy" hit — no amount of enemy HP/armor tuning changes that, because it
only makes fights last longer, not more dangerous, when every hit is
perfectly telegraphed and perfectly blockable.

**The actual fix:** the "heavy" hit's damage multiplier itself now scales
with distance from the start room — 1.5x near the entrance, up to 2.5x at
the map's edges (`enemyPlan()` in `assets/encounter-depth.js`). This makes
the big hit outscale what a starter-tier Block stack can reliably cover,
without touching anything about early-map fights (near the start, the
multiplier stays close to its original 1.5x).

### An honest note on how I found this
My first few rounds of playtesting in this session reported 100% win rates
with zero damage taken at every distance, including the hardest tier — I
was about to conclude the difficulty gradient wasn't working. It turned out
**my own playtest script had a bug**, not the game: since defeat now heals
to full HP (an earlier change you asked for), my win/loss check
(`state.hp>0`) was true after every loss too, silently counting losses as
wins. A phase-based check (`state.battle.phase==='reward'`) fixed it, and
the corrected numbers told a completely different, much more useful story.
I'm noting this because the fix above (the heavy-hit scaling) was only
findable once the measurement itself was trustworthy — worth keeping in
mind if you extend `tests/playtest.cjs` further.

### Real numbers, from the actual engine, Level 0 gear / no talents
(60 simulated battles per row, scripted bot: lethal check → arm counter →
block the current threat → heal below 50% → best damage/energy card)

| City room (by distance from start) | Win rate |
|---|---|
| Burnout Avenue (dist 0-1) | 100% |
| Cable Market (dist 2) | 95% |
| Furnace District (dist 3) | 23-27% |
| Memory Annex (dist 4-5) | 0% |

And confirming the "leveling required" half of the story, at the same room
(Memory Annex, the hardest tier) as gear actually improves:

| Gear | Win rate |
|---|---|
| Level 0, starter deck | 0% |
| Level 1, starter deck | 18% |
| Level 2, starter deck | 72% |
| Level 2, deck with Cleave+Bastion | 77% |
| Level 3, better deck | 97% |

Elaris showed the same shape (entry ~88%, near the Bloom Tyrant ~30% at
Level 1 gear). Vespera's flat region multiplier was tuned down slightly
(regionScale 2.1→1.9, attack bonus +7→+6) after the first pass showed its
*entry* room only winnable ~60% of the time at Level 2 gear — too hard for
an entrance. After the tweak: entry ~75%, far corner ~45%, preserving the
gradient while making the doorway feel like a doorway.

## Round 6 — armor was invisible in the UI

Report: "my attack cards aren't registering correct damage against
enemies — if I do 6 damage the enemy isn't taking 6 damage." The math was
correct the whole time (armor has worked as designed since Round 1) — the
bug was that **armor was never shown anywhere in the UI.** A Strike dealing
6 raw damage into an armored enemy nets less, exactly as intended, but the
only trace of that was a log line ("Armor absorbs X damage") competing with
everything else in a 5-line scrolling combat log — genuinely easy to miss
and reasonable to read as a bug.

Fixed in two places:
- **Enemy panel now shows a persistent 🛡 Armor stat** next to HP
  (`index.html`), plus a one-line explainer ("Armor blocks N damage from
  every non-Pierce hit. Pierce cards ignore it.") whenever the current
  enemy has any.
- **The combat log line itself now does the math in front of the player**:
  instead of two separate entries ("Armor absorbs 3 damage" / "Ember Blade
  · 3 damage"), a single line now reads `Ember Blade · 6 dmg − 3 armor = 3
  dealt` (`cardEffect()` in `assets/expansion.js`) — no math left implicit.

## Round 7 — real chest artwork

Replaced the recycled crystal-icon placeholder with actual chest artwork you
provided. New file: `assets/items/loot-chest.png` — cropped to a single
chest from your source image, background flood-filled to transparent so it
floats cleanly on the dark battle screen instead of showing a white box.
`.loot-chest-graphic` in `assets/expansion.js` now points at this image
directly (`background-size:contain`) instead of slicing/tinting the
Aetherlink crystal sheet — no more sepia/hue-rotate filter needed since the
art is already the right theme, just kept the pulsing glow animation.

## Round 8 — one Soulbound copy of each starter card

Request: make one of each starter card type Soulbound so it can't be lost.
Starter deck is `strike, strike, guard, guard, focus, mend` — the fix marks
exactly the **first** copy of each unique id (1 Strike, 1 Guard, Focus,
Mend) as Soulbound, leaving the duplicate Strike and duplicate Guard as
normal Impermanent cards still genuinely at risk on defeat.

This had to be per-**instance**, not per-card-type — the game's real
Soulbound cards (Phoenix/Oath/Verdict/Glacial/Stormglass) are Soulbound by
their card *definition*, so simply flagging `defs.strike.soulbound=true`
would have made every future Strike you ever find in a loot chest
permanently unlosable too, not just your starting one.

- `make()` (`index.html`) gained an optional third argument to force a
  specific card *instance's* Soulbound flag, independent of its
  definition's default.
- `newGame()` (`assets/expansion.js`) now passes that override for exactly
  the first occurrence of each starter card id.
- **Caught and fixed a real bug along the way**: `validateImport()` was
  unconditionally rebuilding every card's `soulbound` flag from its
  definition on every save import (`c.soulbound=!!defs[c.id].soulbound`),
  which would have silently wiped this protection the moment you exported
  and reimported a save. Changed to only force `true` for cards that are
  Soulbound by definition, otherwise preserve whatever the save says —
  verified directly with an export→import round trip in the test suite,
  not just assumed.

## Round 9 — swapped in your cleaner chest artwork

Replaced `assets/items/loot-chest.png` with your new, higher-quality single
chest image (was already tightly cropped, no second chest to trim out this
time). Background removed the same way as before — flood-filled from the
border rather than a flat white→alpha threshold, so it doesn't eat into any
light-colored pixels that are part of the chest art itself (the pale
crystal facets, the glowing rune inlays) — then cropped tight to the
result. Same filename, so no code changes were needed; `.loot-chest-graphic`
in `assets/expansion.js` already pointed at this path.

## Round 10 — Escape closes menus

Added an Escape-key handler (`index.html`) alongside the existing `M`-key
map toggle, in the same keydown listener. Pressing Escape while any menu
screen is open (Map, Character/Talents, Deck Workshop, Aetherlink, Main
Menu — anything routed through the shared `#menuOverlay`/`closeMenu()`
system) closes it, the same as clicking that screen's own "Return" button.
Guarded so it does nothing on the start screen, during normal exploration,
or mid-battle when no menu is layered on top — and ignores held-key repeat
so it only fires once per press.

**Not covered by the automated test suite**: the Node/DOM-shim harness
stubs `addEventListener` as a no-op, so there's no way to script "press
Escape" and assert the menu closed. Verified by tracing the exact condition
against every place `openMenu()`/`closeMenu()` is called, and confirmed the
full suite still passes (rules out a syntax error), but this one specific
behavior should be spot-checked by hand in a browser.

## Round 11 — per-card art, ready for your own artwork

Every card in the game now has its own image, wired up and ready for you to
replace with real art. No gameplay logic touched.

### What's there now
`assets/cards/<id>-lv<level>.png` — one file per **unique card × mastery
level**, e.g. `strike-lv0.png` through `strike-lv3.png`. All 22 cards in
`defs` (pulled directly from the live game data, not hand-typed — see
below) × 4 levels = **88 files**, generated as clearly-labeled placeholders
(colored by card kind, big ASCII tag, full card name, cost/level/Soulbound
footer, and the card's own id printed in the corner so you always know
which file you're looking at even outside the game).

### How to replace them
Just overwrite a file with the same name — `strike-lv2.png`, say — with
your own art, same or different dimensions (it's rendered with
`object-fit:cover`, so it'll crop to fit rather than distort). No code
changes needed. If a file is ever missing or fails to load, the card falls
back to its original icon glyph automatically instead of breaking.

### `tools/generate_card_placeholders.py`
Kept in the repo as a real, reusable tool, not a one-off script. Pulls the
card list straight from the live game code (via the same Node/VM test
harness everything else in this project uses) rather than a hand-maintained
list that could drift out of sync, so if you add a new card to `defs`
later, running this again fills in just that card's 4 missing placeholders
without touching any files you've already replaced with real art
(`--force` regenerates everything if you ever want to reset).

### Where the art actually renders
`cardHTML()` (`index.html`) is the single function every card view in the
game goes through — deck workshop, hand during battle, loot chest reveals,
talent-adjacent screens — so this one change point covers every place a
card appears, confirmed by reading the full call chain rather than assumed.

### Also fixed: a flaky test I ran into along the way
While validating this, `tests/rebalance.test.cjs`'s elite-spawn-rate check
(from the Round 5 distance-scaling work) occasionally failed on pure
sampling variance — a pre-existing issue unrelated to card art, caught
because I ran the suite several times in a row rather than once. Bumped its
sample size 60→300 per distance band and confirmed stable across 6+ runs.

## Round 12 — premium card frame (CSS only, no art needed)

Upgraded the card frame's chrome to read closer to a premium foil trading
card, inspired by a reference image you shared. Pure CSS/markup — no new
art assets, works with the existing placeholder images from Round 11 and
will work with your real art too. All of this was actually rendered with
headless Chromium (via Playwright) at every step and visually inspected,
not just reasoned about from the CSS — which is how the two real bugs below
got caught before shipping instead of after.

### What changed (`index.html` — `cardHTML()` and the `<style>` block)
- **Ornate double-border + 4 corner gem accents** — a dark inner ring plus a
  thin gold (purple for Soulbound) ring, with small glowing gem dots at
  each corner, all done with layered `box-shadow` and `::after`
  radial-gradients — no extra DOM elements needed.
- **Foil shimmer** — a slow diagonal sheen sweeps across the card
  (`::before`, animated `background-position`, `mix-blend-mode:overlay`),
  respects `prefers-reduced-motion`.
- **Embossed gold-gradient title** (purple for Soulbound) using
  `background-clip:text` + a thin dark `-webkit-text-stroke` for
  definition against the similarly-toned card background.
- **Kind-glyph badge** in the corner of the rules box — reuses the card's
  existing `icon` field a second time, so no new data or mapping needed.
- **Diamond-shaped level pips** (via `clip-path`) with a glow on filled
  ranks, instead of plain rounded rectangles.
- **Glossier mastery bar** with a subtle top highlight strip.
- **Card serial footer** (e.g. `STR-001/022`) — id-based tag, position in
  `Object.keys(defs)`, and total card count, all pulled live from the game
  data, not hand-typed.

### Two real bugs caught by actually rendering it, not just reading the CSS
1. **`text-shadow` silently desaturates `background-clip:text` gradients in
   Chromium** — the gold title read as muddy gray until I isolated the
   exact property causing it (confirmed with a side-by-side debug render)
   and switched to `filter:drop-shadow` instead, which doesn't have this
   interaction.
2. **The mastery bar (`.track`) is a `<span>`, which is `display:inline` by
   default — and inline elements ignore explicit `height` entirely**, per
   the CSS spec. Its fill child's `height:100%` was resolving against an
   indeterminate ancestor instead, ballooning to ~290px and pushing the new
   serial footer far outside the visible card. Root-caused by measuring
   every child element's actual bounding box in real Chromium rather than
   guessing, then fixed with one `display:block`. (For comparison: the HP
   meter bar never had this problem because it's built on a `<div>`, which
   is block-level by default — confirmed there's no second instance of this
   pattern anywhere else in the codebase.)

## Round 13 — toned down the shine, fixed a real overlay bug

Feedback: too shiny/distracting, and something was overlaid on the center
of every card's art. Both addressed:

### Removed the animated foil shimmer
The diagonal sweeping sheen (`.card::before`, `@keyframes foilSweep`) is
gone entirely — with several cards visible at once in the deck workshop,
continuous motion across all of them was the likely source of "distracting."
The static double-border and corner-gem accents (`.card::after`) stay; those
don't move.

### Fixed a real bug: the fallback glyph was painting on top of loaded art
The small icon glyph in the art panel was only ever supposed to be a
fallback — shown if a card's image file is missing or fails to load, hidden
once real art is there. Instead it was rendering on top of *every* card's
art, always, including the placeholder art from Round 11. Root cause: `.art
img` had no explicit `z-index`, while `.art-glyph` had `z-index:0` and comes
later in the DOM — in CSS stacking order, an explicit `z-index:0` beats an
implicit `z-index:auto` in the same tier, so the later glyph painted above
the image regardless of load success. Gave `.art img` `z-index:1` so it
unambiguously stacks above the glyph; the glyph now only shows through when
there's genuinely no image to display. Caught by re-examining my own
Round 12 screenshots after your report — it was visible there too, I'd
missed it.

Both fixes verified with real Chromium renders, not just read off the CSS.

## Round 14 — "14 dmg into 4 block hit for nothing"

Investigated by reproducing the exact scenario through the real engine
before touching anything — didn't want to guess. Direct test: enemy with 0
armor, 4 Block, hit with a 14-damage attack.

**The math was already correct**: 14 − 4 = 10 net damage, confirmed with
several variations (single hit, two hits in the same turn depleting Block
across both) — no compounding bug, no double-absorption, nothing zeroed
out. So this wasn't the same class of issue as the earlier Armor report.

**The actual problem was visibility** — the mechanic worked but was
essentially invisible, making a correct 10-damage hit easy to misread as
"nothing happened":

1. **No persistent Block indicator.** Unlike Armor (which got a `🛡 N
   Armor` tag next to the enemy's HP back in Round 6), Block only ever
   appeared in a transient status line inside the attack-intent box.
   Fixed: `.enemy.guard` now gets the same treatment as Armor — `◈ N
   Block` next to HP, plus an explanatory note, whenever it's active
   (`index.html`).
2. **"Enemy Block 0" printed as noise on nearly every turn**, since Block
   is normally 0 outside the enemy's periodic guard phase. Seeing "Block 0"
   constantly trains you to stop reading that line — so the one turn it
   said "Block 4," it blended in as more of the same. Fixed: the status
   line (`assets/encounter-depth.js`) now only appears when there's
   actually something to report (nonzero Block, an active status effect,
   or Enraged).
3. **The log split the math into two disconnected lines** — `"Big Hit · 14
   damage"` immediately followed by a separate `"Rootguard absorbs 4
   damage."` — instead of showing the net result in one place. Fixed the
   same way the Armor log was fixed in Round 6: `cardEffect()`'s wrapper in
   `assets/encounter-depth.js` now amends the existing damage line in
   place — `Big Hit · 14 damage − 4 block = 10 dealt` — rather than
   appending a second line.

Verified directly: the exact reported scenario (0 armor, 4 Block, 14
damage) now nets 90 HP remaining from 100, with that single combined log
line, and the Block indicator visible on the enemy panel *before* the
card is even played — not just reasoned about, tested against the real
`playCard()`/`cardEffect()` call chain.

## Round 15 — purple rules box for Soulbound cards

The card text box was tan on every card, including Soulbound ones, which
clashed with their purple frame. Added a Soulbound-specific override
(`index.html`): the rules box goes from tan (`#e3d5b4`) to a light lavender
(`#ddd0ee`) with dark plum text (`#2c1f3d`) instead of navy, and the small
"ATTACK"/"SOULBOUND ATTACK" type label shifts from muted brown to muted
purple to match. Verified with a real Chromium render before shipping —
the lavender box now reads as part of the same purple family as the border
and title, instead of looking like a leftover default.

## Round 16 — Upgrade Crystal drop rate, 2 new hidden chests, unified chest art

### A real scarcity problem, found before implementing anything
Investigated the existing "Card upgrade crystals" mechanic (`materials()` /
`setMaterials()`) before touching anything — it already existed, distinct
from the Aetherlink device crystals. Leveling a card up requires **both**
50 uses of mastery **and** spending one of these crystals. Checked how many
existed on the map: **exactly one, ever**, at Memory Annex. That's a hard
ceiling on how many cards could ever be leveled up in an entire playthrough
— a real gap given the armor/tiering balance work assumes meaningful card
leveling is possible.

### Recommended and implemented a drop rate
Added Upgrade Crystal as a 5th possible outcome of the post-battle loot
chest (`assets/expansion.js`), at **4%** — chosen to sit close to the
existing 8% elite-only device-crystal rate as a precedent for "a good drop
rate" already established in this game, while not being elite-gated (elites
are already rare, 4–36% depending on distance, so gating a second reward
behind them would make it doubly rare). New odds:

| Outcome | Odds |
|---|---|
| Soulbound card | 1% (unchanged) |
| **Upgrade Crystal (new)** | **4%** |
| Empty (looted by an animal) | 24% |
| Potion | 35.5% |
| Random Impermanent card | 35.5% |

The reward screen shows a dedicated "◆ Upgrade Crystal" result with the
running total, and the combat log reads `Loot chest: an Upgrade Crystal! (N
total)`.

### 2 new hidden chests, both granting Upgrade Crystals
Added to `chestFor()` (`assets/expansion.js`): **Reactor Causeway (3,3)**
and **Lastlight Shelter (4,3)** — both previously empty rooms (no relic, no
boss role), moderately far from the start, clear of both boss rooms. Unlike
the loot-chest drop above, these are guaranteed, one-time, walk-up-to-collect
pickups — the same interaction as the 4 existing potion caches, just
granting a crystal instead. The original 4 city potion caches and 3 Elaris
potion caches are untouched.

### All map chests now use the actual loot-chest artwork
Previously every hidden chest (old and new) rendered as a plain `▣` glyph.
Replaced with the same `assets/items/loot-chest.png` art used for the
battle-reward chest, at a smaller 46px scale with the existing pulsing glow
animation, in both places a chest can render — `renderWorld()`
(`assets/expansion.js`) for the current cell, and `assets/combined-rooms.js`
for the adjacent cells the minimap draws. Verified with a real Chromium
render, not just assumed from the CSS.

### A test-methodology note
The Node/VM harness's DOM shim has a no-op `.append()` — only content set
via direct `.innerHTML = "..."` string assignment can be read back in
tests. `renderWorld()` builds the map exclusively via `.append()` calls, so
I couldn't assert on its rendered output the way I did for the battle
screen (which uses `.innerHTML =`). Switched to source-level checks instead
(confirming `.secret-chest` is gone and `.map-chest` — pointing at the real
PNG — exists in both render call sites) and did the actual visual
confirmation with a real Chromium screenshot during development instead.

## Round 17 — map exploration overhaul (Metroid + Castlevania)

You asked whether a Metroid/Castlevania-style map overhaul was feasible,
then said the real complaint was that every room "feels like moving around
in a rectangle." I read the actual map/room data before proposing
anything, which changed the plan for the better — and led to picking a
different one of the two reference games for each of the game's two map
screens, since that's genuinely how they differ from each other:

- **Corner minimap** (always visible, already a pixel-positioned node
  graph) → leaned into **Super Metroid**: real room-size variation,
  connecting lines, locked-route lines.
- **Full map screen** (already CSS Grid) → leaned into **Castlevania
  SotN**: native grid-spanning for multi-cell areas, room-type icons, a
  completion percentage.

### The actual root cause of "it's all one rectangle"
The map data already has genuine multi-cell districts that share one
continuous background — 2- and 4-cell "joined areas" like the 4-cell Crown
Mainframe District (`JOINED_AREAS` in `assets/combined-rooms.js`) — but
every map screen rendered every single cell as the same uniform-sized box,
completely discarding that real shape/size information. Fixing this
didn't require inventing new content, just actually using data that was
already there.

### What changed
- **`roomFootprint()`** (new, `index.html`): computes each room's box size
  from its *real* footprint — a joined area spanning N columns/rows draws
  proportionally bigger, and even single unjoined rooms get a small
  deterministic size/aspect jitter (seeded by the room key, so it's stable
  across renders, not randomly reshuffling every time you open the map) —
  purely so the map doesn't read as a grid of identical tiles.
- **`graphLinks()`** (`index.html`): rewritten to skip drawing a connector
  line between two cells that are actually the same joined area (they're
  one box now), and to correctly mark a genuinely relic-gated, not-yet-open
  route with the existing crimson dashed "locked" styling.
- **`roomTag()`** (new): identifies Boss / Safe / Relic / Crystal / Chest
  rooms for small colored badges on both map screens.
- **Full map (`showMap()`, `assets/expansion.js`)**: completely rewritten
  — joined areas now use native `grid-column/row: span N` instead of one
  cell per room, added SECURE/DANGER/BOSS/YOU ARE HERE status text, room-
  type badges, a 🔒 hint naming the required relic on routes you've
  actually seen (never shown for unvisited rooms, so it can't spoil
  anything), and an overall completion percentage combining areas visited,
  hidden chests found, and relics claimed. The `combined-rooms.js` wrapper
  that used to bolt on a "· joined area" text label after the fact is now
  redundant (the box's own size communicates that) and was removed.
- **Corner minimap (`renderMinimap()`, `index.html`)**: same footprint
  logic, plus a small colored corner dot per room-type tag.

### A real cross-file bug this surfaced
The base test harness (`tests/expansion.test.cjs`, shared by every other
test file) doesn't load `combined-rooms.js` — which defines `joinedArea()`
— even though the real game always does. Calling it directly from the new
map code broke every single test the moment I ran the suite. Added
`getJoinedArea()`, a defensive wrapper that falls back to treating a room
as its own single-cell area when `joinedArea` isn't loaded, matching the
same `typeof X==='function'` pattern already used elsewhere in this
codebase for other optional cross-file dependencies.

### Verified with real Chromium renders, not just the CSS
Generated actual `renderMinimap()`/`showMap()` output from the live game
engine and rendered it with headless Chromium mid-development — confirmed
real size variation between a 4-cell joined district and a single room,
the dashed locked-route line, current-room highlighting, and the relic/
safe/boss badges all render correctly together, not just in isolation.

## Round 18 — square card art container

Changed `.art` (`index.html`) from a fixed `height:92px` (a ~1.7:1
landscape rectangle) to `aspect-ratio:1/1` — the container is now a true
square regardless of the card's own width, so any square artwork you drop
in later (`assets/cards/<id>-lv<level>.png`, same filenames as before)
will display correctly via the existing `object-fit:cover`. No image files
were touched — this is purely the container.

Verified with a real Chromium render using the actual game engine's
`cardHTML()` output and the existing Round 11 placeholder art: the square
frame crops cleanly, and the rest of the card (rules box, level pips,
mastery bar, serial footer) still lays out correctly below the now-taller
art area — the card simply grows to fit, since `.card` was already
`min-height` rather than a fixed height.

One honest note: while re-running the suite I hit a single, one-off
`TypeError` in `joinedArea()` inside the pre-existing fixed-seed room-walk
sweep in `tests/expansion.test.cjs` — since this CSS-only change cannot
possibly affect that JS logic, I swept 3,000 seeds across all three
regions plus 5 direct reruns of the file plus 5 full 8-file suite runs (40
test-file executions total) and could not reproduce it again. Flagging it
rather than quietly ignoring it, but treating it as a non-reproducible
anomaly rather than a real bug given the volume of clean runs since.

## Round 19 — card art reset to blank squares

Replaced all 88 labeled placeholder images (`assets/cards/<id>-lv<level>.png`
— the colored, text-labeled ones from Round 11) with plain blank white
500×500 PNGs, ready for you to overwrite with real art later. Same
filenames, same 500×500 size the square container (Round 18) expects — no
code changes needed, just overwrite a file to replace it.

Pulled the card list straight from the live game (`Object.keys(defs)`,
same 22 cards) rather than assuming the old placeholder set was still
accurate, so nothing was missed or renamed by mistake.

## Round 20 — card art reorganized into level folders, and a real flake finally root-caused

### Card art reorganization
Moved all 88 files from the flat `assets/cards/<id>-lv<level>.png` naming
into `assets/cards/level0/`, `level1/`, `level2/`, `level3/`, each holding
`<id>.png`. Updated `cardArtPath()` (`index.html`) and
`tools/generate_card_placeholders.py` to match, so the generator still
works correctly if it's ever run again.

### The recurring flake, finally chased down instead of dismissed
While re-testing the reorg, I hit the same intermittent crash noted (and
too quickly written off) back in Round 18. This time I didn't let it go —
instrumented a live reproduction that patched `joinedArea()` in place to
log its exact call state the moment it threw, then swept it across
repeated fresh processes until it actually reproduced with full state
captured.

**Root cause, confirmed, not guessed:** a Round 5 test helper searched for
a room containing a specific enemy type using a single random-seed roll —
`Object.keys(rooms).find(key=>roomSpawns(key).some(s=>s.type==='blightAntler'))`
— with no fallback if that one roll happened not to place that enemy
anywhere in the region. On an unlucky seed, `.find()` legitimately returned
`undefined`, `state.room` got set to `undefined`, and several calls later
`joinedArea()` crashed trying to read `rooms[undefined].name`. This was a
genuine, reproducible bug in my own test code (not the shipped game, and
not anything introduced by today's file-reorg), just rare enough (~1-3% of
runs) to look like noise for two rounds running.

**Fixed at the source**: replaced the single-roll search with
`findRoomWithType()`, which retries across fresh seeds (up to 40 attempts)
until it actually finds a matching room, and asserts loudly if it somehow
never does, rather than silently proceeding with `undefined`. Also caught
and fixed my own follow-up bug while wiring the fix in — I forgot to set
`state.room` to the found city room before calling `startBattle()`, which
looks up its spawn via `state.room` and silently no-ops on a mismatch. Both
now fixed and stress-tested at 50/50 clean runs, plus 5 full 8-file suite
runs (40/40 individual file passes) with no recurrence.

### Two stale assertions from this session's own earlier reorg
Found and fixed two test assertions still checking the *old* flat filename
format (`strike-lv2.png`) that no longer exists on disk after the folder
reorg above — a real gap in my own verification from a few turns back that
I hadn't caught until running the full suite properly this time.

## Round 21 — map expansion (4 new rooms, zero new art)

You asked whether the map could be expanded without new art. Checked how
room visuals actually render before answering: single rooms are drawn
procedurally on canvas from a shared atlas image sliced into exactly 6
district cells (`assets/environment/neon-city.js`) — matching the game's 6
existing districts exactly, one-to-one. New single rooms just reuse one of
those 6 districts; no new art needed. The bigger "joined areas" (Foundry
Quarter, Crown Mainframe District, etc.) are different — each is one real
hand-painted illustration sliced across multiple cells — those genuinely do
need new art. Went ahead with the no-art option.

### What was added
Found the real gaps in the city's grid first rather than guessing — 24 of
28 possible grid cells were occupied, leaving exactly 4 empty: `-1,2`,
`-1,3`, `5,0`, `5,3`. Filled all four:

| Room | District | Connects to |
|---|---|---|
| Undercroft Reservoir | FLOODLINE | Gearwood Verge (n), Rusted Aqueduct (e), Silt Collector (s) |
| Silt Collector | FLOODLINE | Undercroft Reservoir (n), Siltwheel Basin (e) |
| Skybridge Relay | CITADEL | Starwatch Gallery (w), Ashen Lift (s) |
| Flooded Terminus | POWER GRID | Coilgrave Annex (n), Warden Exhaust (w) |

All 7 existing neighboring rooms got the matching reverse exit added.
`places` in `neon-city.js` got the 4 new district/name/landmark entries,
appended at the end so no existing room's index (which positions its enemy/
relic sprite) shifts.

### A real bug this surfaced: `regionMaxDistance()` was hardcoded
`regionMaxDistance('city')` returned a hardcoded `5` — a guess that
happened to match the original 24-room graph's actual diameter, not a real
computation. Adding a room that extends the map's true diameter to 6
(Flooded Terminus, via Coilgrave Annex) exposed this immediately: the new
farthest room capped out at the *same* difficulty ceiling as the old
distance-5 rooms instead of actually being the new max. Fixed by computing
it from the real graph (`Math.max(...Object.values(cityRoomDistances()))`)
instead of a constant — Elaris/Vespera were left on their original tested
constants since they didn't change this round and swapping their basis
wasn't worth the risk.

This recalibrates every room's relative distance fraction slightly (by
design — a graph that's one room wider makes every other room proportionally
closer to center), which correctly shifted a few patrol-density and
heavy-hit-multiplier thresholds for pre-existing rooms. Updated the 3 test
assertions that had hardcoded the old thresholds, re-verified each new
expected value against the live graph rather than just bumping numbers
until it passed, and made the heavy-hit "map edge" test find the actual
farthest room dynamically instead of hardcoding a room key — so it can't
go stale the next time the map grows.

### Verified, not assumed
The existing "generated-room routes" sweep (part of the shared base test
harness) walks every room and every exit for connectivity/walkability
across multiple seeds — it passed immediately on the first run with the
new rooms in place. Also rendered both map screens with real Chromium
using actual explored-state data: new rooms display correctly, current-
room highlighting works, the area count correctly reads "12/28" instead of
the old 24-room total, and the grid properly extended to show the new far-
edge cells without any layout changes needed.

## Round 22 (part 1 of a large request) — patrol spawns no longer sit near entryways

You asked for a large combined set of changes: 2 mini-bosses per world
guaranteeing an Upgrade Crystal, a brand-new main boss for Vespera (which
currently has none), a 5x map expansion for Vespera, and a fix so patrols
don't spawn right next to room entrances. This is genuinely too much to
responsibly do in one pass with the same rigor as everything else in
this document, so I'm shipping the entryway fix now — fully implemented and
tested — and continuing with the rest (mini-bosses, Vespera's new boss, the
map expansion) next.

Found the actual mechanics before touching anything: a room's 4 possible
entry points are `(35,250)`/`(765,250)`/`(400,35)`/`(400,465)`
(`transition()`, `index.html`). Patrols wander up to 75px from their home
spot and trigger a fight within 43px of wherever they currently are
(`animateEnemy`) — a worst-case danger zone of ~118px from any entry. The
old default home sectors, `(400,130)` and `(400,385)`, sat only 80-95px
from the north/south entries — inside that zone, meaning a patrol could
realistically wander close enough to ambush you the moment you walked in.

### Why this took real iteration, not a one-line fix
Every room turns out to have 4 fixed static building blocks in its corners
(`solids()`, `assets/environment/neon-city.js`), leaving only a narrow
cross-shaped walkable area — far less freedom to reposition patrols than
it first looked. My first redesign (corner positions, mathematically ideal
on paper) turned out to be walkable in **zero** of 28 city rooms — sitting
exactly inside those building blocks. Traced it empirically rather than
guessing further, found the actual safe points the real geometry allows,
and discovered the rare 3-patrol (farthest-tier) rooms only support one
specific triple of positions at all — there's no arrangement of 3 points in
that cross shape that's both mutually 230px+ apart *and* fully clear of
every entry simultaneously.

### The fix
`roomSpawns()` (`assets/expansion.js`) now picks its candidate list based
on how many patrols the room actually needs:
- **1-2 patrols (the common case, verified 100% of the time now):**
  `(270,245)` and `(610,245)` first — both fully clear of the danger zone —
  with `(350,245)`/`(450,245)` as next-best fallbacks for the couple of
  rooms where a room-specific prop blocks one of the primary two.
- **3 patrols (rare, only the farthest-tier rooms):** the one verified-
  working triple, `(610,245)`+`(400,130)`+`(400,385)` — an honest,
  documented compromise, since the fixed building geometry doesn't allow a
  fully-safe triple to exist at all.

## Round 22 (part 2) — mini-bosses for City and Elaris

Continuing the large combined request. 4 of the planned 6 mini-bosses are
done, tested end-to-end, and passing the full suite — City's 2 and
Elaris's 2. Vespera (which needs a main boss from scratch, 2 mini-bosses,
and the 5x map expansion) is still pending.

### The approach: real special abilities, zero new AI code
Investigated `enemyPlan()` before writing anything: it turns out any enemy
with a truthy `element` field automatically gets the full telegraphed
attack→charge→elemental→guard pattern (1.8x hits, status effects, weakness
triangle) — completely independent of region, already fully tested
machinery. So every mini-boss's "special ability" is just: give it an
`element` in its data. No new state machine, no new battle code.

### City (`index.html`)
- **Lunar Enforcer** (the existing `moonKnight`) — gained `element:'water'`
  and `miniBoss:true`. Same enemy, same sprite, now has a genuine signature
  move it didn't have before.
- **The Crown Sentinel** (new) — reuses the existing Crown Observer
  artwork (`crown-observer.png`) under a new id/name, `element:'air'`,
  placed at Skybridge Relay (the Round 21 room).

### Elaris (`assets/elaris-wildlife.js`, `assets/expansion.js`)
- **The Tidebound Warden** (new) — reuses the Drowned Heron sprite sheet,
  `element:'water'`, placed at Sapphire Falls (`3,1`).
- **The Gale Sovereign** (new) — reuses the Storm Moth sprite sheet,
  `element:'air'`, placed at Mistfall Basin (`2,2`).

### Real bugs found and fixed along the way
1. **Element was hardcoded to `null` for any city enemy**, regardless of
   what its own definition said — a leftover from before any city enemy
   ever had one. Would have silently broken every city mini-boss's special
   ability. Fixed to read the enemy's own `element` field directly.
2. **Elaris's boss-placement was entirely hardcoded to `bloomTyrant` at
   room `3,2`**, with no generic mechanism for placing any other boss —
   unlike the city, which already supported room-designated bosses via
   `r.enemy`. Generalized it (also sets up Vespera's boss placement for
   free, next).
3. **Elaris rooms are generated programmatically** (a 4×3 loop), not read
   from a static per-room object like the city — there was nowhere to hang
   an `enemy` designation at all. Added a small `bossRooms` lookup inside
   that generation loop.
4. **The real one**: mini-bosses had to be added to `ELARIS_WILDLIFE` to
   reuse its sprites, but that's *also* the pool `roomSpawns()` draws
   random patrol types from — meaning a mini-boss could have randomly
   spawned as an ordinary low-tier patrol anywhere in Elaris, not just at
   its own designated room. Confirmed this actually happened (a pre-
   existing test caught it: expected exactly 4 regular species, observed
   6). Fixed by excluding boss-flagged entries from the random-type pool,
   then verified 0 leaks across 15 seeds.
5. Updated one pre-existing test's outdated assumption that `bloomTyrant`
   was the *only* possible Elaris boss type — a legitimate update now that
   Elaris has mini-bosses too, not a bug in the new code.

## Round 23 — three real reports, plus a fourth bug found chasing them

Three issues reported from actual play, all investigated with the real
engine rather than guessed at from description alone.

### 1. "6 attack didn't break the block, no armor, no reason for it"
Reproduced the exact numbers from the report (5 Block, three consecutive
6-damage attacks) directly — the math was correct every time (confirmed
extensively, again). The real issue was **timing**: every enemy action,
Block included, resolves at the *end* of the turn that telegraphs it —
identical to how a charge-up attack works. So the moment you see "Rootguard:
5 enemy Block" in the log, that Block doesn't exist yet; it only becomes
active starting the *next* turn — by which point the enemy has often
already moved on to a completely different queued action (a Heavy Attack,
in the reported case), making the leftover Block look unexplained. Fixed
the message (`assets/encounter-depth.js`) to say plainly what actually
happens: "Rootguard primed: 5 Block will protect the enemy starting next
turn."

### 2. Loot chests placed like patrol hazards, should be off-path
They were: every hidden chest sat at a fixed `(400,145)`, exactly on the
main north-south walking line connecting a room's north and south
entrances — in the way, not off to the side. Moved to `(330,180)`
(`assets/expansion.js`), verified walkable in all 28 city rooms and all 12
Elaris rooms, and off both the north-south and east-west through-lines.

### 3. Lost the starter Mend, "makes things very difficult"
Root-caused, not just patched: the one-Soulbound-per-starter-type
protection (Round 8) only ever gets *applied* by a brand-new game —
`load()`/`validateImport()` only ever *preserve* an existing soulbound
flag, they never retroactively grant one. Any save that predates this
protection (or lost it some other way) stays permanently unprotected just
by continuing to load it. Added `healStarterProtection()`
(`assets/expansion.js`), called from `restoreGame()` on every load: if a
starter type (Strike/Guard/Focus/Mend) has at least one copy but none
protected, its first copy is protected — same rule `newGame()` already
uses, just applied retroactively where it's missing. Verified directly: a
simulated "old-format" save with zero protection on any card comes back
from `load()` with exactly one protected copy of each starter type.

### 4. Found while stress-testing the above: mini-bosses could grant 2 crystals
Not reported — caught by running the Round 22 mini-boss tests repeatedly
while verifying today's fixes, at roughly a 9% real rate. Root cause: the
post-battle loot chest has its own independent 4% chance to roll
`'crystal'` (Round 16), completely unrelated to a mini-boss's *guaranteed*
crystal (Round 22) — when both coincidentally fired on the same kill, the
player silently got 2 instead of the promised 1. Technically "working as
built" (my own Round 22 comment even said "on top of whatever their normal
loot chest roll gave"), but a guarantee that unpredictably sometimes
doubles is a bad guarantee. Fixed (`assets/expansion.js`): a mini-boss kill
can no longer roll into the loot chest's own `'crystal'` outcome — that
specific coincidence now redirects to a card reward instead, so the
guarantee means exactly what it says. Verified with a targeted 200-run
stress test of the exact scenario that used to fail ~9% of the time: 0/200
after the fix.

## Round 24 — the full map screen redesigned to actually read as a map

You asked for undiscovered areas to be genuinely hidden, shapes that
aren't just a grid of rectangles, connector lines between rooms, more
spacing, and an overall feel closer to opening a hand-drawn map. This
replaces the Round 17 CSS-grid block map entirely.

### Real fog of war
The old map drew a same-shaped "Unknown" box at every undiscovered area's
exact grid position and size — which quietly told you the whole map's
layout (how many rooms, their shapes, where they connect) before you'd
earned any of it. Undiscovered areas now render **nothing at all**. A
visited room's real exit toward unexplored territory shows only as a
short line fading into the dark — enough to know there's more to find,
nothing about what it is.

### Organic shapes, not touching rectangles
Switched from CSS Grid (`grid-column`/`grid-row` spanning, cells touching
edge to edge) to percentage-based absolute positioning
(`mapAreaFootprint()`, `assets/expansion.js`), with real gaps between
rooms. Each room gets an asymmetric, deterministically-seeded
`border-radius` (a hand-drawn "blob" rather than a sharp rectangle) plus a
small individual rotation, both stable across renders (seeded off the
room key) so the map doesn't reshuffle every time it's opened.

### Connector lines
An SVG layer draws a gently curved path between any two rooms you've
visited that are actually connected, and a short fading stub from a
visited room toward an exit that leads somewhere you haven't been —
dashed, ink-like strokes; a locked (relic-gated) route gets a distinct
reddish dash pattern.

### The viewport now frames only what's actually explored
Previously the canvas reserved space for the entire region's grid — early
in a run, that left most of the screen empty around a small cluster in one
corner. The bounding box is now computed from `state.visited` (plus one
ring of padding for stubs to fade into), so the map fills its space from
the very first room onward and grows outward as you explore, rather than
staying a small island in a mostly-empty rectangle.

### Iterated against real renders, not just the HTML
Caught with actual Chromium screenshots, not assumed: room-type badges
initially overlapped the room name (fixed by moving them above the box
instead of into its corner, plus more top padding); adjacent organic blobs
initially crowded and overlapped each other (fixed by re-tuning the size/
fill-ratio math, since a rotated blob's visual footprint reaches further
than its own bounding width/height suggests); a 3-line room name
("Canal Pump House") in a small box could still clip a badge (fixed with a
minimum panel size). Verified again after each fix, across a multi-room
explored city cluster, a fresh single-room game, and an Elaris map with a
mini-boss room — all render cleanly.

## Round 25 — map shape reverted to rectangles, and real per-boss move patterns

### Map: kept the spacing and connector lines, reverted the organic shapes
You liked the Round 24 spacing and connector lines but not the hand-drawn
blob shapes. Reverted `mapAreaFootprint()` and the panel CSS
(`assets/expansion.js`) to plain rectangles (a small consistent 6px
corner radius, matching the rest of the UI) — removed the per-room
asymmetric border-radius and rotation entirely. Room size is still based
on real footprint (a joined area still draws meaningfully wider than a
single room), and everything else from Round 24 — percentage-based
spacing, the SVG connector lines, fog-of-war hiding of undiscovered areas
— is untouched.

### Every boss now has its own real move sequence
You asked whether bosses each play through their own small set of moves —
checked directly and found the honest answer was no: all 4 mini-bosses
shared one identical 4-turn template (differing only by which element
colored their one signature hit), and the city's own final boss,
`thornWarden`, had no element or special pattern at all — mechanically
identical to an ordinary patrol, just with bigger numbers.

Added a `BOSS_PATTERNS` lookup (`assets/encounter-depth.js`) giving each
boss its own sequence built from the existing move types
(attack/guard/heavy/charge/elemental), each with a distinct cadence and
identity:

| Boss | Pattern | Identity |
|---|---|---|
| Thorn Warden (city final boss) | guard→attack→heavy→guard→charge→elemental→attack | slow defensive wall, punishes patience |
| Lunar Enforcer | attack→attack→charge→elemental→attack | aggressive ambusher, minimal guard |
| The Crown Sentinel | charge→elemental→guard→attack→charge→elemental | patient marksman, charges often |
| The Tidebound Warden | guard→attack→charge→elemental→guard→attack | tank, guards both sides of its burst |
| The Gale Sovereign | attack→charge→elemental→heavy→charge→elemental | storm, back-to-back charges |
| The Bloom Tyrant | *(unchanged — already had a real 6-turn dual-element cycle)* | |

Gave `thornWarden` an element (`earth`, fitting its bramble/root theme) so
its pattern's charge/elemental turns actually have something to key off
of. Verified directly: all 6 sequences are genuinely distinct from each
other, and critically, the two pairs that share an element (the two water
bosses, the two air bosses) still play nothing alike — which was the
actual point.

## Round 26 (part 1) — City rebuilt as a linear spine with branching mini-boss detours

You asked for the map to become a true left-to-right linear progression
instead of an open world — divergent paths to the mini-bosses that find
their way back to the main path and the final boss, applied to every
world. This is genuinely the largest structural change in the project so
far, since it touches the actual room graph (not just visuals) plus every
system that places content in it. Doing all three worlds at once risked a
rushed, undercooked result across too many interconnected systems, so
City is being shipped first as a complete, fully-tested foundation; Elaris
and Vespera (which also still needs its entire boss roster built from
Round 22's unfinished scope) are next.

### The new structure (12 rooms, down from 28)
```
Afterlight Refuge (START) → Central Interchange → Promenade Market (joined)
  → Skyrail Approach ─┬→ Signal Observatory (direct)
                       └→ Vault Station [Lunar Enforcer + Ember Sigil + crystal chest] → rejoins ahead
  → Signal Observatory ─┬→ Crown Mainframe District (direct)
                         └→ Skybridge Relay [Crown Sentinel + Moon Lens + crystal chest] → rejoins ahead
  → Crown Mainframe District (joined) → Warden Mainframe = FINAL BOSS (Thorn Warden)
```

Both mini-boss branches are genuine diverge-and-reconverge detours —
bidirectional going in, one-way on the rejoin, so taking the branch is
optional but never a shortcut back the wrong way. The two existing hand-
painted joined districts (Promenade Market, Crown Mainframe District) were
kept exactly as they were and the spine was built to run straight through
them, since their art is calibrated to that specific cell adjacency and
can't be safely reshuffled. The relic-gate system (`requires: 'ember'`
etc.) was removed entirely — a true linear spine doesn't need gates to
prevent shortcuts, and keeping them would have created a chicken-and-egg
problem (a gate blocking the very branch where its own key is found).
Relics are now standalone rewards for exploring the branches instead.

### A real latent bug found and fixed along the way
`configure()` (`assets/environment/neon-city.js`) assumed every entry in
its `places` lookup had a matching room and would have crashed on any
future room removal. Added a safety guard rather than just avoiding the
issue this time.

### Fixing the test suite: real work, not mechanical find-replace
16 rooms were removed, and five different test files had accumulated
hardcoded references to specific rooms across every previous round —
fixing this took real care, not blind substitution:
- One fix I almost got wrong: a chest-test line looked like it needed a
  City-specific room, but tracing the actual execution order showed it
  runs *after* a portal travel to Elaris, so the original room reference
  was already correct — "fixing" it would have broken something that
  wasn't broken.
- Two tests needed a *synthetic* relic-gated exit constructed on the fly
  to keep testing the underlying lock mechanism, since City no longer has
  a real one — and both needed the temporary exit properly restored
  afterward (not just deleted), since later tests in the same shared
  process depend on that connection being real.
- One movement test turned out to be specifically exercising
  `joinedExit()`'s seamless continuous-coordinate transition (for moving
  between two cells of the same joined area) — a different mechanic from
  a standard room-to-room transition. The replacement rooms had to also be
  a real joined pair, not just any adjacent rooom, or the test would
  silently verify the wrong thing.
- Several distance/patrol/elite-rate thresholds were recalculated against
  the new graph's actual values (verified from the live engine) rather
  than assumed to still hold — the new spine's max distance is 7, not 6,
  so every distance-fraction-dependent expectation shifted slightly.

All 8 test files pass, and the new map was verified with a real Chromium
render of the fully-explored city: the spine reads clearly left to right,
both branches visibly diverge from the spine and reconverge into Crown
Mainframe District, and both boss rooms are flagged.

## Round 26 (part 2) — Elaris rebuilt the same way

Continuing the map restructure. Elaris gets the same linear-spine
treatment as City, with one added wrinkle: its rooms were previously
*programmatically generated* (a plain 4×3 loop in `configureRegion()`),
not hand-authored — a non-uniform spine-with-branches topology doesn't fit
a generic grid loop, so it's now hand-authored too, matching City.

### The new structure (same 12 rooms, none removed — just reconnected)
```
Dawnroot Landing (START) → Sunpetal Wilds (joined)
  → Emerald Expanse (joined) → Elderbloom Sanctuary = FINAL BOSS (Bloom Tyrant)

Branch A: Sunpetal Wilds → Jade River → Sapphire Falls [Tidebound Warden]
  → rejoins directly into the boss room
Branch B: Dawnroot Landing → Fernveil Grove → Canopy Cathedral [Gale Sovereign]
  → rejoins into Emerald Expanse
```

Unlike City, no rooms needed removing here — all 12 already had enough
flavor and existing connections to reshape into a clean spine + 2
branches just by redirecting exits and relocating the two mini-bosses
(Gale Sovereign moved from Mistfall Basin, which is now a required spine
room inside Emerald Expanse, to its own dedicated branch room, Canopy
Cathedral — a boss living inside a room you're required to pass through
anyway isn't a real branch). Both existing hand-painted joined districts
(Sunpetal Wilds, Emerald Expanse) were kept with their original internal
adjacency, same as City's districts — only their *external* connections
were pruned or redirected to remove shortcuts. Bloom Tyrant stays at its
existing room key, since that key is tied directly to the
Vespera-portal-unlock logic elsewhere.

### Much smaller test fallout than City's
Because no room keys were deleted (just reconnected and one boss
relocated), only 2 fixes were needed across all 8 test files: one hardcoded
reference to Gale Sovereign's old room, and one genuine flake this exposed
— a different test file relied on a single random rule to find a specific
Elaris enemy type with no retry, which the changed spawn distribution made
just likely enough to fail (confirmed genuinely flaky before the fix:
2 failures in 5 runs; 0 in 8 after, using the same retry-across-seeds
pattern already established in Round 20).

Verified with a real Chromium render of the fully-explored Elaris map:
same left-to-right spine, both branches visibly diverging and
reconverging — one straight into the boss room, one into the joined
district — exactly matching City's pattern.

## Round 27 (part 1) — map line accuracy, boss room exclusivity, chest scarcity

Three concrete fixes from your feedback, applied to both City and Elaris
immediately since they're universal, not tied to a specific region's
layout. The bigger asks from the same message — an enemy level system
with on-screen display, and substantially expanding the map so each
section is dominated by one enemy type in escalating difficulty "waves"
— are large enough to need their own dedicated pass; this is the
well-scoped part shipped now.

### 1. Map connections are now straight, not wavy
The connector-line SVG was drawing every link as a slightly curved path
(a deliberate "hand-drawn" touch from Round 24) — which could make two
rooms sitting directly next to each other look like they connected at a
diagonal. Removed the curve entirely (`assets/expansion.js`): lines are
now a plain straight segment between room centers, so cardinally-aligned
rooms connect with a clean horizontal/vertical line, and only genuinely
diagonal room pairs (like a branch's rejoin point) show an angled one —
because that's their real spatial relationship, not an artistic flourish.

### 2. Mini-bosses (and the main boss) now have their room to themselves
Checked directly and found a real bug: `3,1` (Lunar Enforcer) also had a
random Data Wisp patrol, and `5,0` (Crown Sentinel) had two Phase Shades
— the distance-based patrol-density formula was still populating boss
rooms with ordinary enemies alongside the boss. Fixed in `roomSpawns()`:
any room flagged as a boss room (mini or main, in either region) now gets
exactly one spawn — the boss, nothing else.

### 3. Chests are scarce and actually off the path now
Checked city's chest rooms against the mandatory spine and found 4 of 6
sitting directly on it — you'd pass them no matter what, which isn't "off
the path" in any real sense, and Elaris's chests were in the same
position (all 3 on the spine or in the boss room itself). Every chest in
both regions now lives specifically in a mini-boss branch room — city
keeps its 2 Upgrade Crystal chests (already correctly placed, from Round
26), Elaris's chests move from the spine into its 2 branch rooms. Both
regions go from a mix of spine/branch chests down to exactly 2, both
genuinely optional, both in a stable location that reaching the mini-boss
already requires finding — nothing for this to need to move again.

Verified with a real Chromium render of the fully-explored city: the
lines read as true straight connections, both boss rooms are flagged red
with no other enemy present, and the chest count correctly reads 0/2.

## Round 29 — City rebuilt to match your hand-designed maze, plus a real enemy-level system

You provided an exact map layout (Excel grid, confirmed via both the
image and text versions matching) — a true maze with loops, not the
simpler spine-with-branches shape from Round 28. This replaces that
layout entirely.

### The map, parsed and verified programmatically
Rather than hand-transcribing a 42-room grid (high risk of a silent
misread), the grid was parsed into exact (row, col) cells and run through
a real BFS: 42 cells, 46 edges, zero unreachable rooms, 5 genuine loops
(a tree with 42 nodes would have exactly 41 edges — 46 confirms the
branches really do loop back with multiple paths, matching what the
layout shows). The two mini-bosses sit at distance 6 and 9 from the
start; the main boss at distance 11, at the end of the long corridor —
same relative positioning as your drawing.

### A real bug caught by the test suite, not by inspection
The first level-bucketing formula silently produced **zero rooms at
level 1** — meaning the easiest enemy could never actually appear
anywhere on the 42-room map. This wasn't visible by eye; it only
surfaced because a retry-based test (`findRoomWithType`, 40 fresh-seed
attempts) still came back empty. Traced to the exact rounding error,
fixed, and verified all 8 levels are populated before moving on
(distribution: L1:1, L2:5, L3:4, L4:8, L5:8, L6:5, L7:8, L8:2 rooms).

### Enemy level: a real stat driver, not just a label
`enemyLevel(key)` is now the single source of truth for both the number
shown next to an enemy's name in battle and their actual HP/attack
scaling — city previously had **zero** distance-based scaling at all
(hardcoded to a 0 multiplier), relying purely on which species showed up.
Level is shown in the battle UI next to the enemy's name, color-coded
against the player's own level (green = ready, amber = close, red = go
level up first) via a new `levelColor()` helper.

### Zone-exclusive enemy types — real "waves," not a cumulative pool
`cityTierTypes()` was rewritten from a cumulative distance-pool (where
3-4 enemy types could all appear in the same room) to a strict per-room
`zone` field — each of the 8 zones spawns exactly one enemy type, so
reaching a new zone means a real "wave" of a new, tougher enemy, not a
random mix diluted with easier types you've already outgrown.

### Everything art-dependent re-anchored, not rebuilt
The one existing joined-art district with a compatible 2×2 block in the
new shape (Crown Mainframe District) was kept — its percentage-based art
calibration doesn't care about room coordinates, only cell adjacency, so
only the `JOINED_AREAS` cell list needed updating. The other existing
district (Promenade Market) had no matching slot in this layout and was
parked for a future region rather than forced in somewhere it wouldn't
fit.

### Also fixed along the way
- `portalTarget()` hardcoded the *previous* boss room as the City-to-
  Elaris portal trigger — would have silently broken region transitions
  after the boss moved. Caught and fixed before it shipped.
- `configure()`'s safety guard (added in Round 26) paid off directly this
  round — no crashes from the `places`/`rooms` key mismatches that
  happened naturally mid-rebuild.
- Straightened out the map's connector lines (no more artificial curve
  that could make adjacent rooms look diagonally connected) and made
  mini-boss/main-boss rooms spawn-exclusive (no stray extra patrols
  sharing a boss's room) — both carried over cleanly to the new layout
  with no extra work, since they're generic fixes.

### Test suite: extensive, deliberate repair — not mechanical find-replace
Two full rounds of test breakage (first from the zone/level system, then
again from the complete room-graph replacement) were worked through
methodically against real engine output, not assumption:
- Recalculated every distance-fraction-dependent threshold (patrol
  density, elite rate, heavy-hit scaling) against the new graph's actual
  BFS distances (max distance 12), verified from the live engine each
  time rather than estimated.
- Caught and fixed a test helper that pointed a synthetic locked-gate
  target at a room already connected to its source by a different path —
  `graphLinks()`'s own link-deduplication was silently swallowing the
  synthetic locked link, not a bug in the game.
- Rebuilt the map-render and footprint tests with real connected room
  clusters from the new graph, not just swapped individual keys.

All 8 test files verified clean across 4 full consecutive runs (32/32),
and the final maze was confirmed with a real Chromium render of the
fully-explored map against your original layout: the long corridor to
the main boss, both looping mini-boss branches, and the interconnected
right-side cluster all match.

## Round 30 — Elaris rebuilt as its own fresh maze, plus a real minimap bug fix

### Elaris: same concept as City's maze, a genuinely different shape
Not a reskin of City's layout — a diagonal/zigzag main corridor (not a
long horizontal one), with an early branch (west of the start, looping
down to the Tidebound Warden) and a late branch (looping through the
Gale Sovereign near the end), plus a small secondary loop pocket
mid-path. Built and verified the same disciplined way as City: cells
defined explicitly, then run through a real BFS before any game code was
written — 30 rooms, 39 edges (10 more than a tree needs, confirming real
loops), zero unreachable cells. Elaris only has 4 wildlife types (vs.
City's 8), so each spans 2 of the 8 zone levels; levels continue from
where City's left off (9-18) rather than restarting at 1, since the
player should be meaningfully stronger by the time they reach this
region. Both existing hand-painted Elaris districts (Sunpetal Wilds,
Emerald Expanse) were relocated into real adjacent/2×2 blocks in the new
shape.

### Two real bugs found and fixed, not just stale key cleanup
- `regionMaxDistance('elaris')` was **hardcoded to 5** this entire time —
  never made dynamic like City's. Worse, `regionDistance` used a raw
  `x+y` coordinate-sum as a distance approximation, which is exact on a
  plain grid but is just wrong once the region becomes a real maze with
  loops (confirmed directly: the old shortcut gave a near/far difficulty
  sample that wasn't meaningfully different at all). Generalized City's
  proper BFS distance function to work for any region with a frozen room
  snapshot, added the equivalent `ELARIS_ROOMS` snapshot, and verified
  the fix directly against live engine output.
- Every hardcoded reference to Bloom Tyrant's old room key (`'3,2'`) —
  `roomSpawns()`'s boss-detection checks, both directions of
  `portalTarget()` — was found and updated alongside the room data, not
  left stale like a near-miss earlier this session almost left City's
  portal.
- A touch-movement test's failure led to catching a design-constraint
  mismatch: it expected crossing between two specific rooms, which only
  worked in the *old* maze because those rooms happened to sit inside a
  joined art district (continuous-coordinate movement, not a normal
  per-room transition). Traced with the real engine rather than guessed,
  then pointed the test at the actual joined-area cells in the new maze.

### Minimap bug fix (reported directly, with a screenshot)
The inline minimap was reusing the full map screen's whole-region layout
math at a tiny 126×82px widget size — fine for a 12-room spine, illegible
once a region grew past ~20 rooms (every box shrinks and overlaps as the
map grows). It also never delivered on "limited information about your
surroundings" from earlier in this session — it was always the whole
region, just shrunk down, not actually scoped to nearby rooms.
Rewritten (`localMapNodes()` + a new `renderMinimap()`) to compute a
genuine local neighborhood — BFS 2 steps out from the player's actual
room via real exits — and lay out only that subset, so box size no
longer degrades as the map grows, regardless of total region size. The
overall discovered/total count is still shown in the header for
big-picture progress; only the visual grid itself is now local. A
regression test was added confirming the local neighborhood stays small
and constant regardless of how much of the map has been explored (it
depends only on position, never on exploration progress).

All 8 test files verified clean across 3 consecutive full runs (24/24),
plus real Chromium renders of both the fully-explored Elaris maze
(confirming the shape, both boss branches, and both art districts) and
the fixed minimap widget (confirming legible, properly-sized, correctly
color-coded boxes against the originally-reported broken state).

## Round 31 — the actual chest-movement bug

Earlier rounds treated "chests keep moving" as meta feedback about me
relocating their *room* placement across successive map rebuilds, and
fixed that (down to 2 per region, both off the mandatory path). That
wasn't what this was about — chests were visibly oscillating back and
forth on screen, in real time, like a patrolling enemy.

### Root cause: a CSS animation replacing transform instead of combining it
`.map-chest` centers itself with a base `transform: translate(-50%,
-50%)`. Its glow animation's 50% keyframe set `transform: scale(1.04)` —
in CSS, an animated `transform` **replaces** the property entirely for
that keyframe rather than stacking with the base value. So twice every
2.4-second cycle, the chest lost its centering offset, snapped about half
its own width/height away, then snapped back — a repeating back-and-forth
jump, exactly like a patrol AI.

Verified the exact magnitude directly (isolated CSS test, sampled the
real rendered position across the full animation cycle via Chromium):
the old rule jumped the chest roughly 22px diagonally and back every
cycle; a hand-copied snippet wasn't used for this, since the earlier
chest.x/chest.y investigation showed those values are static — the bug
had to be in rendering, not placement, so the actual injected CSS text
was pulled and tested as-is.

### Fix
Gave `.map-chest` its own dedicated `mapChestGlow` animation that keeps
`translate(-50%, -50%)` chained through every keyframe, so centering
survives the whole cycle. `.loot-chest-graphic` (the reward-screen
chest, which has no base transform to lose) keeps the original shared
`chestGlow` animation unchanged — only the one affected rule was touched.

Re-verified after the fix with the same method: position now stays
within 1px across the full cycle, with only the intended size-pulse
(46→48→46px) remaining.

### Regression test
Added a check against the actual live CSS the game injects (not a
hand-copied snippet, which would defeat the purpose) — confirms
`.map-chest` no longer shares the plain animation and that its own
keyframe keeps the translate chained with the scale.

## Round 32 — crystal chests now require defeating the nearby boss

### New requirement: defeat the boss before the chest opens
An Upgrade Crystal chest sits in the same room as a mini-boss by design,
but you could previously just walk past the fight and loot it. Fixed in
`checkWorldInteractions()`: a crystal-reward chest now checks whether the
room's boss is in `state.bosses` (actually defeated) before allowing
collection — walking into it beforehand shows a toast naming the boss to
beat, with no state change. Elaris's potion chests are unaffected; this
is specifically about crystal rewards, which are the ones placed next to
a boss.

### Verified enemy level display is already complete, not just assumed
Before touching anything, checked directly whether every enemy category
in both regions (regular patrol, elite, mini-boss, main boss, city and
Elaris) actually carries and renders a level: traced real battle starts
down to the actual injected HTML (`<h2>Ember Jackal <span class=
"enemy-level"... >Lv.1</span></h2>`), not just the underlying data. It
was already correct everywhere — no changes needed there; Vespera is the
only region still missing this, same as everything else about it.

### Test coverage
Extended the chest test to cover the actual sequence: walk up before the
fight (blocked, no crystal, not marked collected), defeat the boss for
real (the actual `startBattle`/`playCard`/`finishBattle` flow, not just
flipping a flag), then walk up again (now grants the crystal). Caught
and fixed two of my own mistakes while writing it: used a test-only
finishing card (`__finisher`) before its definition existed yet in file
order, and missed that `checkWorldInteractions()` bails out immediately
while a battle is still open on its reward screen — both found by
running the test and tracing the actual failure, not by assumption.

## Round 33 — enemy level was missing from the world-map label specifically

You were right, and the screenshot pinned it down exactly: the level
display I'd verified earlier only ever covered the **battle screen**'s
`<h2>` — the floating name label that appears over an enemy while
exploring, before you've engaged it, never got the same treatment. Two
genuinely separate pieces of UI, and I'd only checked one.

### Why it couldn't just reuse the battle screen's colored badge
The battle screen's level tag is real HTML (a colored `<span>`). The
world-map label is a CSS `::after{content:attr(data-name)}` pseudo-
element — and `content: attr()` can only render plain text, never HTML,
so the same color-coded span trick doesn't work here. The positioning
for this label is also split across three cascading theme-specific CSS
rules I didn't fully trust myself to restructure safely in one pass.
Given the choice between a bigger, riskier CSS rework for color-coding
here too, or a small, safe fix that reliably shows the number, I took the
safe one: the level is now appended as plain text directly into the
label string itself (`'Ember Jackal · Lv.1'`), in both live code paths
that build it — `renderWorld()` (expansion.js, your current room) and
`appendPatrols()` (combined-rooms.js, other cells of a joined district).
The dead copy in index.html's unused base `renderWorld()` got the same
treatment for consistency, though it's never actually called.

### Verified against your exact screenshot
Computed the label directly through the real engine for the same enemy
and room from your screenshot and confirmed it now reads "Ember Jackal ·
Lv.1" — not just that a level field exists somewhere, but the literal
string that will render. Added a regression test checking this
specifically, separate from the existing battle-screen level test.

## Round 34 — battle screen condensed so cards are always visible

A full redesign of the battle screen's top info area, aimed specifically
at small screens: previously a separate toolbar plus two tall full-width
stat panels, pushing the hand of cards down far enough that it could
require scrolling before seeing a single card.

### The new layout
One compact block directly above the hand: a slim Turn/Energy/Level/
Character row, then the player and enemy side by side (not stacked),
each with a name, a health bar with the HP numbers overlaid directly on
the bar itself (saves a whole line versus writing them separately), and
compact inline tags for Block/Armor/Guard — full explanations moved to
hover tooltips instead of permanent paragraphs. The enemy's current and
next attack sit in a single intent bar right below. Player health is
green, enemy health is red, confirmed programmatically (not just by eye)
with an RGB-channel check on the actual CSS values.

### A second space-eater found only by testing in a real browser
The mock-based Node test harness doesn't track DOM built via
`appendChild`/`prepend`, so initial verification missed a whole separate
panel: `.combat-tools`, prepended above everything else, which
unconditionally showed "Enemy element: Neutral · Freeze 0 · Burn 0
turns · Poison 0" — every single battle, even when literally nothing
there was active. Caught by actually loading the real game in Chromium
and measuring where the cards landed, not by trusting the mock's
approximation. Fixed to only render when something is genuinely relevant
(a real element, an active status effect, or an available talent
ability), and dropped a one-time "Elaris enemies are tougher" tip that
didn't need repeating every battle.

### What this took to get right, not just change
- A first attempt at ellipsis-truncating long enemy names didn't work —
  diagnosed as a classic flexbox gotcha (flex children need explicit
  `min-width:0` before `overflow:hidden`/`text-overflow:ellipsis` can
  actually engage) and fixed properly rather than papering over it.
- Restructured the header layout a second time after confirming the
  first version cramped names and HP onto one line badly enough to lose
  the name entirely on narrow screens — moved HP onto the bar itself
  instead, giving the name its own full-width line.
- Preserved every class name (`.intent`, `.battle-footer>.muted`,
  `#hand`) that `encounter-depth.js` depends on finding via
  `querySelector` after this HTML renders — confirmed this specifically
  still works with a real Chromium `querySelector` call, since the Node
  test mock can't simulate that lookup and a false pass there wouldn't
  mean much.
- Verified a regular (non-elite, non-boss) enemy name displays in full
  at the target small viewport, and that a worst-case long name (a boss
  with the Elite prefix) degrades gracefully to an ellipsis rather than
  breaking the layout.
- Measured, not guessed: at a real 390×700 mobile viewport, cards now
  start at y=261px (previously well below the fold with the old two-
  panel layout) — confirmed directly in Chromium, not estimated.

All 8 test files pass across 3 consecutive full runs, plus a new
regression test covering the condensed structure, the color-coding, and
that every downstream injection point survived the redesign.

## Round 35 — Mirror Array (new capstone talent) and a WoW Classic-style talent tree

### Mirror Array: clone a card into your deck for the encounter
A genuinely new mechanic, not a reskin of the existing Echo Protocol
(which just replays a card — this adds a real temporary copy to your
draw pile). Implemented as a per-card button on each card in hand, same
established pattern as the existing Boost/Retain abilities, so you
choose exactly which card to clone. The clone is deliberately never
soulbound and never counts toward permanent card mastery (it isn't a
real owned card, just a battle-scoped duplicate) — and because it only
lives inside `state.battle`, it vanishes automatically the instant the
encounter ends, no special cleanup needed.

Sits at a brand-new **tier 4**, the true end of the Resolve branch,
gated behind **Echo Protocol itself** (not just a point threshold) —
matching how WoW's own capstone talents work: you need the specific
talent before it, not just enough points spent some other way.

### Talent tree: redesigned to read as a real tree, not a scrolling list
Replaced the single-column stack of wide text cards with rows of compact
icon nodes connected by lines:
- Nodes grouped into **tier rows** (multiple nodes per row wherever the
  tree actually branches), instead of one flat vertical list.
- **Connector lines** between every talent and its prerequisite, gold
  when unlocked and dashed gray when not — computed from each node's
  real rendered position (reusing the exploration map's proven
  connector-line technique) rather than hand-tuned coordinates, so it
  handles branching and even a same-tier dependency (Disruption's
  Overload → Capacitor) without special-casing.
- Full name and description moved into a **hover tooltip** (gold title,
  description, current rank, status) instead of permanently-visible
  text — the piece that actually makes a compact icon grid readable.
- Kept the game's existing dark sci-fi palette (gold/amber already used
  elsewhere for emphasis) rather than a literal parchment reskin, so it
  reads as *this game's* talent tree in WoW's layout, not a mismatched
  genre swap.

### A real bug caught before it shipped
First visual verification showed Mirror Array completely missing from
the rendered tree. Traced to the test environment using a stale copy of
`expansion.js` left over from an earlier task — not a game bug, but
worth noting since trusting that render without digging in would have
been a false pass.

All 8 test files verified clean across 3 consecutive full runs, with
dedicated coverage for both the new talent's data (tier, requirement,
point threshold, the actual clone-and-expire gameplay sequence) and the
new rendering (tier-rows present, tooltip markup carries the real
name/description, old always-visible text blocks gone, the connector
function runs safely with no real DOM to measure). Verified visually
with real Chromium renders, including an actual hover-triggered tooltip
on the new talent.

## Round 36 — card size made a true fixed constant

The original "card size changed" report turned out to be a browser-
caching artifact on your end (confirmed gone in a fresh incognito
session), not a real bug — but along the way you asked for something
concrete and worth keeping regardless: cards should have one fixed size
that never shrinks on narrow screens, while everything else (HUD,
minimap, etc.) keeps adapting as it already did.

### What changed
Measured your reference screenshot directly (a pixel grid overlaid on
the actual image) rather than estimating: cards there render at ~218px
wide. `.card`/`.card-wrap` now use that as a true fixed width (up from
174px), and the old mobile-breakpoint override that scaled cards via
`calc(50vw - 31px)` on narrow screens was removed entirely — card size
no longer varies with viewport width at all. Confirmed directly in
Chromium at both a narrow (400px) and wide (900px) viewport: card width
measured identically (218px) at both, while the HUD still shrinks on the
narrow one exactly as before. Only the card itself was pinned.

### A real, unrelated flaky test found and fixed along the way
While verifying this, a pre-existing test (Round 33's world-map label
check) turned up genuinely flaky under repeated stress-testing — it
assumed the first patrol spawn would never roll Elite, which isn't true,
occasionally producing "★ ELITE · Ember Jackal · Lv.1" instead of the
expected plain string. Fixed with an explicit non-elite filter plus a
retry-across-seeds loop (consistent with how this exact class of bug was
handled in earlier rounds), confirmed with 20 consecutive stress-test
runs, zero failures.

One honest note: while fixing that flaky test, a regex typo
(double-escaped backslash) slipped into my own edit and broke the suite
outright for a bit. Caught and fixed before shipping — all 8 files now
verified clean across 4 consecutive full runs (32/32).

## Round 37 — card data decoupled for compendium.html, with the gap actually closed

Gemini (building a separate `compendium.html` page) asked for `defs`
(card definitions) to be extracted from `index.html` into its own file so
an external page could read it. The core idea was sound, but Gemini's
specific instructions didn't match this repo and had a bug baked in that
would've made the whole thing silently fail.

### What was wrong with the request as given
- Asked for `cards.js` at the repository root — every other JS module in
  this project lives under `assets/`. Put it at `assets/cards.js` instead
  and pointed `compendium.html` there.
- `compendium.html` also referenced a `game.js` that doesn't exist
  anywhere (the game's logic lives inline in `index.html` itself, which
  is exactly why the data needed splitting out — the logic can't be),
  and root-level `expansion.js`/`encounter-depth.js` that are actually
  under `assets/`. Fixed all three paths.

### The bug that would have made this not work at all
`const defs = {...}` at the top of a script creates a plain global
*identifier* (`defs` works fine from anywhere in that same document,
which is why `index.html` itself was never the problem) — but it does
**not** create a `window.defs` property. `compendium.html`'s own
detection script only ever checked `window.X` names, so no matter what
name got added to that list, it could never have found the data. Fixed
by explicitly mirroring onto `window` in `assets/cards.js` (guarded so
it's a no-op in the test suite, which has no `window` at all), and added
`window.defs` to `compendium.html`'s own check.

### Closing the gap from last round
Also moved `stat()`, `rules()`, and `cardArtPath()` into `assets/cards.js`
alongside `defs`, and rewired `compendium.html` to use them directly
instead of guessing at field names that don't exist on this data (there's
no flat `desc`/`type`/`img` string on a `defs` entry — the real effect
lives in `tiers`, `kind` is the actual type field, and `icon` is a single
glyph, not an image path). Also fixed `compendium.html` converting its
card object to an array via `Object.values()`, which silently threw away
each card's id (the object key) — without the id there's no way to build
the real art path or feed the card back through `rules()`. Verified
directly in a real browser: the compendium page now shows the real
type (Attack/Defense/Skill), the real generated rules text ("Deal 6
damage.", "Gain 5 block."), and the actual card art, not a placeholder.

### Verified both ends independently
The test harness only ever extracted `index.html`'s *inline* `<script>`
content — it had no way to know about an externally-sourced `<script
src>` file, so without updating it, moving `defs` out would have broken
all 8 test files silently. Fixed alongside the refactor, not as an
afterthought. Confirmed the real game still plays correctly post-move
(a card play actually resolves damage, `cardArtPath`/`rules` return
identical output to before) and confirmed the compendium page separately,
both via real Chromium renders, not just test-mode checks. 24/24 test
runs clean across 3 full passes.

## Round 38 — card size reverted, per explicit request

Round 36's fixed 218px card size (and removal of the mobile-responsive
scaling) read as too big in practice. Rolled all of it back:
`.card`/`.card-wrap` are 174px again, and the `calc(50vw - 31px)` mobile
override (145px floor) is restored, so cards once again scale with
viewport width exactly as they did before Round 36. Removed the
regression test that had specifically locked in the 218px behavior, since
it was asserting a decision that's now reversed — a prior, already-
understood state doesn't need new coverage of its own. Verified directly:
card renders at 174px again, and all 8 test files pass clean across 3
full runs.

## Testing

```
for f in tests/*.test.cjs; do node "$f"; done
```
All 8 pass. `tests/rebalance.test.cjs` covers armor/pierce math, the revived
enemy types, the Elaris reward-pool fix, the region-scaling increase, full-HP
defeat recovery, the loot chest's exact odds boundaries (0%, 0.99%, 1%,
49.9%, 50% rolls), and that distance-based tiering actually produces only
easy enemies next to the start and only hard ones at the map's edges, that
the empty-chest band grants no card/potion while still naming a thief, that
every talent rank (including the first and last) always does something,
that Overload Surge actually lets a card through with 0 energy exactly once,
that the heavy-hit multiplier scales with distance without regressing
early-map fights, that the combat log now explains an armor reduction in
one readable line instead of two separate ones, that exactly one starter
copy of each card type survives both an import round trip and 100
simulated defeat card-loss rolls while its duplicate stays at risk, that
`cardHTML()` references the correct per-card-per-level art path with a
working glyph fallback, that all 22 cards × 4 levels (88 files) actually
exist on disk, that the mastery bar's `display:block` fix is present in
the CSS source, that `.art img` stacks above `.art-glyph` so the fallback
icon can't overlay loaded art, and that the animated foil sweep is gone
while the static corner-gem accents remain (the Node/VM harness can't run
real layout or paint order, so these check the CSS rules directly — the
actual visual fixes were verified with real Chromium renders during
development), that a 14-damage hit into 4 Block correctly nets 10 damage in
one combined log line, that the enemy panel shows Block before the card
consuming it is even played, and that "Enemy Block 0" no longer prints as
status-line noise, that Soulbound cards override the rules-box color to
a purple tone rather than reusing the tan default, that the new loot chest
odds land in the right bands (including the new 4% Upgrade Crystal band)
and actually increment the persistent `materials()` count, that the city
map has exactly 6 hidden chests (2 granting crystals, 4 unchanged potion
caches) with Elaris untouched at 3, that walking to a new crystal chest
grants a crystal and not a potion, and that both chest-rendering call sites
use the real loot-chest artwork instead of the old glyph, that a real
4-cell joined area renders meaningfully bigger than a single room on both
map screens, that unjoined single-room sizes are deterministically varied
rather than uniform, that locked relic-gated routes are correctly flagged,
that room-type tags identify the right rooms, that the completion
percentage is sane and reaches exactly 100% once everything is found, and
that a locked-route hint never appears on a room the player hasn't visited
yet, and (Round 18) verified with a real Chromium render that the now-
square art container crops cleanly with object-fit:cover and the rest of
the card still lays out correctly beneath it. Round 20 replaced the
find-a-matching-room test helper with one that retries across fresh seeds
instead of trusting a single random roll (stress-tested at 50/50 clean
runs of the file plus 5 full 8-file suite runs with no recurrence of the
crash it used to cause), and fixed two assertions still checking the old
flat card-art filename format after the level-folder reorg. Round 21
verified the 4 new rooms are fully connected and walkable (the existing
generated-room-routes sweep), confirmed `regionMaxDistance()` now reflects
the real graph instead of a stale constant, and re-verified (not just
bumped) the 3 pre-existing threshold assertions that correctly shifted as
a result. Round 22 verified every 1-2-patrol room's spawn sectors are
genuinely clear of the measured ~118px entry-danger zone, and that the
documented rare 3-patrol exception still resolves without crashing across
a 7-seed x 2-region sweep. Round 22 part 2 verified all 4 mini-bosses
spawn at their correct designated rooms with their element intact, get the
real telegraphed elemental pattern (not a plain attack), guarantee exactly
1 Upgrade Crystal each on defeat, and — the one that actually mattered —
never once spawn as an ordinary random patrol across a 15-seed sweep.
Round 23 verified the hidden chest position is walkable in every room of
both regions, that Block is confirmed inactive during the very turn that
telegraphs it and active starting the next, that a simulated old-format
save with zero starter protection comes back from load() with exactly one
protected copy of each starter type, and that a mini-boss kill grants
exactly 1 Upgrade Crystal — never 2 — across 60 different seeds. Round 24
verified the new map canvas replaces the CSS-grid system entirely (no more
grid-column positioning), that rooms use real percentage-based spacing and
an organic asymmetric border-radius with per-room rotation, that a
connector-line SVG layer with real and stub links is present, that
per-room shapes are stable across repeated calls, and that an unvisited
area's real name never appears in the map HTML before it's been found —
plus real Chromium renders of a multi-room city cluster, a fresh single-
room game, and an Elaris map, iterated against each screenshot until the
badge/spacing/overflow issues those renders caught were actually fixed.
Round 25 verified the map still sizes rooms by real footprint as plain
rectangles (no organic radius/rotation remaining) with spacing and
connector lines intact, and that all 6 bosses now have genuinely distinct
move sequences — including confirming the two same-element boss pairs
don't just share a reskinned template. Round 26 verified all 8 test files
pass against the rebuilt city graph, with every affected threshold
recalculated (not just re-keyed) against the new topology's real values,
plus a real Chromium render of the fully-explored city confirming the
spine reads left to right with both branches visibly diverging and
reconverging into the final district. Round 26 part 2 verified all 8 test
files pass against the rebuilt Elaris graph, confirmed the same flaky-
random-roll class of bug from Round 20 was genuinely reproducing (2/5
runs) before fixing it the same way (0/8 after), and a real Chromium
render of the fully-explored Elaris map confirming the same spine-plus-
branches structure as City. Round 27 part 1 verified every boss room (mini
or main, both regions) spawns exactly the boss and nothing else, that no
chest sits on either region's mandatory spine, and confirmed with a real
Chromium render that connector lines are genuinely straight between
cardinally-aligned rooms.
