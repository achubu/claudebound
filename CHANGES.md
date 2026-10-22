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

## Round 39 — world rebalance, Vespera rebuilt, unique mini-boss cards

**Balance in one place.** Every enemy-strength setting now lives in the
`BALANCE` block at the top of `assets/expansion.js` (per-world level growth,
world multipliers, elite and boss modifiers, heavy and charged-strike
multipliers, per-boss health). `enemyStats()` is the single source of truth
for an enemy's health and attack, used by battles and by `compendium.html`.

- Removed double scaling (Elaris/Vespera multipliers stacked on rising levels).
- Boss heavy hits capped at 1.3x and boss charged strikes at 1.5x, so a single
  hit no longer decides a boss fight.
- Tuned with `tests/balance-sim.cjs` (real engine, talent-using bot, 4 builds
  x 2 play styles, player level = enemy level). At that fair-fight level a
  typical build beats every final boss ~39% of the time (Thorn Warden, Bloom
  Tyrant, Tempest Colossus) and every mini-boss ~50%; overall about 5-10
  points harder than the previous pass.

**Vespera rebuilt to the city's scale.** 42 rooms (was 4), 8 zones at levels
19-26, generated from a hand-designed maze graph (45 links, 4 loops, all rooms
reachable). Stormglass Reach (start) is unchanged, so existing Vespera saves
load; the parked Promenade and Foundry art became the Prism Bazaar and
Stormforge Foundry districts. Eight storm-touched enemy types (recolored
borrowed sprites), two mini-bosses on side branches with crystal chests (Arc
Sentinel, Lv 21; Resonant Phantom, Lv 25) and a final boss at the far end (the
Tempest Colossus, Lv 27, shifting water/air every 4 turns). Storm visuals:
tinted ground, rain, lightning flashes (disabled under reduced motion).
Element-shifting is now generic (`enemies[id].shift`), no longer Bloom-only.

**Unique mini-boss cards.** Each of the six mini-bosses drops its own card the
first time it is beaten: Soulbound 25% of the time, otherwise the same card
Impermanent. Lunar Edict, Neon Covenant (moved from always-Soulbound to this
rule), Tidebound Aegis, Sovereign Gale, Arc Bulwark, Phantom Resonance. New
card art from `tools/generate_unique_card_art.py` (pixel-art stand-ins; drop
in hand-made art under the same filenames to replace them).

**Also fixed.** Nine eastern city rooms used undefined districts and froze the
screen; tap/click near a room edge now walks through that exit (phones crop
the side exits off screen); compendium shows all cards with all four levels
and live boss dossiers; "Exhaust." no longer duplicated on lightning cards.

## Round 40 — expanded talent trees

Each tree is roughly twice as deep (5 -> 9 rows) and twice as wide (2-3 -> 4-6
paths): Surge 6 -> 17 talents, Disruption 7 -> 17, Resolve 6 -> 16. Rows
unlock at 0/1/3/5/7/10/13/16/20 points spent in that tree; with 29 points in
total no build can take everything. Existing talent ids, ranks and
prerequisites are unchanged (only their row moved), so saved builds stay valid.
Full-clear costs stay within 4 points of each other (36/34/32).

- Surge: Boost & Overdrive · Critical strikes (Lethal Focus, Adrenaline Loop,
  Executioner) · Elemental (Attunement, Kindling, Exploit Weakness,
  Stormcaller) · Momentum combos (Momentum, Flurry) · Armor breaking
  (Sunder, Shatterpoint).
- Disruption: Weaken & Silence (Suppression Field, Static Silence, Dominion)
  · Draw engine (Foresight, Recycler) · Energy (Surge Battery) · Deck ·
  Counter mastery (Counter Weave, Resonant Rebound, Reflux, Null Field).
- Resolve: Armor/Echo/Mirror · Block & retaliation (Bulwark Doctrine,
  Retaliation Coil, Fortress Protocol, Unbreakable) · Life steal (Siphon
  Edge, Second Wind, Undying Core) · Retained-card tempo (Preparation, Total
  Recall, Steady Mind).

Effects live in `assets/talent-matrix.js` and hook the engine through
`cardEffect()` hooks plus wrappers on playCard/endTurn/enemyPlan/startBattle/
loseBattle/stat. `tests/talent-matrix.test.cjs` checks every new talent with
exact numbers. One tree shows at a time on every screen (tabs show points
spent; path chips under each tree); wide trees scroll sideways on phones.

Balance: 16 builds (4 original + 4 per tree, one per new path) simulated
across all three worlds; new talents tuned over six passes (e.g. Preparation
originally cut a card's cost every turn and pushed builds to 100%). "Typical"
in tests/balance-sim.cjs is now the 16-build average, and every boss's health
was retuned against it: final bosses ~39%, mini-bosses ~50%. Build averages
across all areas: Surge paths 59-68%, Disruption 62-75%, Resolve 78-93%.

Also fixed: deep trees could centre a node on a quarter column, which CSS
grids drop (rounded to the half-column grid); the talent detail panel was
empty when a tab's selected talent belonged to another tree.

## Round 41 — level cap 60

`MAX_PLAYER_LEVEL` is now 60 (was 30). One talent point per level from level 2,
so 59 points at the cap (was 29). XP stops at the cap; save imports accept
levels 1-60. Aetherlink sockets now unlock every 12 levels (1, 12, 24, 36, 48;
was 1, 6, 12, 20, 30), defined once in `AETHERLINK_SOCKET_LEVELS`. Enemy levels
still top out at 27 in Vespera, so levels 28-60 are headroom for future content.

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

## Round 42 — Card Mastery doubling

- Soulbound cards now need 50 uses for Level 1, 100 for Level 2 and 200 for Level 3 (plus 1 Upgrade Crystal each). Impermanent cards still auto-upgrade every 100 uses.
- Battle hand, deck workshop (Ready filter, upgrade button, tooltips) and save import all use the per-level requirement.
- New test: tests/mastery-doubling.test.cjs.

## Round 43 — Regular enemies 10% tougher

- Every regular and elite enemy in all three worlds has 10% more health (`BALANCE.normalHp`). Mini-bosses and final bosses are unchanged.
- Simulated (balance-sim, 30 fights × 16 builds × 2 styles): typical regular-fight win rates fall about 6–8 points; boss and mini-boss win rates identical. Adding +10% attack too was tested and rejected — it compounds to ~21% and drops some city zones below 20%.

## Round 44 — Pitch, Aether, the side deck and enemy afflictions

New file `assets/aether-deck.js` (+ `assets/aether-deck.css`), loaded after talent-matrix.js. It wraps enemyPlan, endTurn, playCard, cardEffect, startBattle, winBattle, renderBattle, showDeck, newGame, restoreGame and validateImport.

**Pitch & Aether.** Every hand card has a *Pitch* toggle. When you end the turn, marked cards burn away for the rest of the encounter (exhausted) and give Aether = energy cost + 1 (0-cost 1, 1-cost 2, 2-cost 3). Aether carries between turns (max 8); every encounter starts with 2, so one pitched card buys the first draw and later draws take a couple. At least 4 cards must stay cycling, and the retained card can't be pitched.

**Side deck.** A second, player-built deck (up to 6 cards, 2 copies each) managed in the Deck Workshop. Spend 4 Aether to look at its top 2 cards and keep one (the other goes to the bottom). Up to 2 side cards wait in their own row until played; they cost their own energy. New journeys and old saves get Purifying Light, Aegis Ward and Dispel Lance. Drops: 12% from regular enemies, 35% from elites, guaranteed from every boss (final bosses may drop Stasis Field). Pool by world: city tier (Purifying Light, Dispel Lance, Aegis Ward, Null Anchor, Verdant Restore), Elaris adds Grounding Rod and Mirror Sigil, Vespera adds Phase Veil and Aether Overflow.

| Side card | Cost | Effect |
|---|---|---|
| Purifying Light | 0 | Cleanse all debuffs and purge Static; undo this turn's Shackle / Fog |
| Dispel Lance | 0 | Strip Empower and Barrier, 4/7/10 piercing damage by world |
| Aegis Ward | 0 | 4 + level/2 Block; Rend can't cut it this turn |
| Null Anchor | 1 | Prevent the next affliction, whatever it is |
| Verdant Restore | 0 | Heal 5 + level/3, cleanse Bleed |
| Grounding Rod | 0 | Arm a counter for the enemy's current element |
| Mirror Sigil | 1 | Next damaging action: you take half, enemy takes all of it |
| Phase Veil | 1 | Negate all damage of the next damaging action |
| Aether Overflow | 0 | +1 energy, draw 1, +1 Aether |
| Stasis Field | 2 | Enemy skips its next action (final-boss drop) |

**Afflictions.** Riders on enemy actions, telegraphed on the intent panel for this turn and next, each with the side cards that answer it. Hexes: Lacerate (Bleed 2/3/4, stacks to double, never below 1 HP), Enfeeble (Frail: −25% card damage for 2 turns), Shackle (−1 energy), Mind Fog (draw 1 fewer), Static Flood (unplayable Static cards; pitch for 1 Aether), Empower (+2/3/4 attack, stacks once), Aether Barrier (5/10/16, refreshes). Strikes: Rend (cuts half your Block), Crushing Blow (+30%), Siphon (enemy heals the damage), Barrage (3 hits at 45%, Block and Armor per hit). Regular enemies carry one, mini-bosses two, final bosses three; they land every 3rd turn (elites and enraged final bosses every 2nd). A regular enemy's strike affliction lands on its plain attacks (turns 4, 7 …) instead of stacking onto a heavy hit; a boss strike affliction scheduled on a guard/charge turn carries to its next attack.

**Balance.** Simulated with the bot taught to pitch, draw and play side cards (`tests/talent-sim.cjs`; `NO_SIDE=1` turns that off). Typical-build win rates vs Round 43 (30 fights × 16 builds × 2 styles, fair-fight levels): city regulars Lv3 93→66%, Lv7 89→69%, Lv8 41→22% (Crown Observer uses Mind Fog — Shackle there measured 10%); Elaris regulars down 5–17 points; Vespera regulars down 2–20, except Lv26 79→31% (Thunder Mauler's Rend). Mini-bosses: Lunar 47%, Crown Sentinel 42%, Tidebound 49%, Gale 46%, Arc 38%, Resonant 37%. Final bosses: Thorn Warden 31%, Bloom Tyrant 29%, Tempest Colossus 33%. Boss health was retuned with every affliction active so a typical build wins about 40% against mini-bosses and 28% against final bosses (was ~50% / ~39%): perEnemy hp moonKnight .6, crownSentinel .69, thornWarden .64, tidewardenElaris .8, bloomTyrant .46, arcSentinel .64, resonantPhantom .96, stormTyrant .45 (galeSovereign unchanged). balance-sim targets now zone 30–100, mini 34–50, boss 22–36.

Also: compendium gains a Side Deck section, per-enemy affliction notes (with answers) and new attack-guide entries; side-card and Static art via `tools/generate_side_card_art.py`; new `tests/aether-deck.test.cjs` covers pitching, Aether, draws, all 11 afflictions and schedules, all 10 side cards, drops, deck rules and save migration; `tests/trace-fight.cjs` prints one fight's log for debugging.

## Round 45 — Two-bubble enemy intent

- The enemy intent panel is now two bubbles: a rose one for **when you end this turn** and a blue one for **the turn after**. Each shows the action, its damage (or "no attack", "3 × N" for Barrage, "frozen", "negated by Phase Veil"), a counter-window marker, and its own affliction with the answers. Side by side on desktop, stacked on phones.

## Round 46 — Static must be cleansed

- Static junk cards can no longer be pitched for Aether. Each one in your hand has a **Cleanse · 2 ✦** button that spends 2 Aether to remove it for the rest of the encounter; Purifying Light still purges every Static at once, and Null Anchor still prevents Static Flood. Card text, telegraph answers and the compendium say so.
- The simulation bot cleanses Static when it has the Aether. Test coverage: Static can't be pitched, cleansing needs 2 Aether, removes the card from every pile and spends the Aether.

## Round 47 — Readable battle HUD

- New `assets/battle-hud.js` + `assets/battle-hud.css` (visual only; restyles what renderBattle draws). Encounter text scales with the window (`clamp(14px, 1.35vw, 19px)`), so it grows on big screens and stays legible on phones, where the two combatants now stack.
- Health: tall rounded bars with a gloss highlight, large bold numbers, a heart icon for you and a fanged skull for the enemy. Your bar turns green → amber (≤50%) → pulsing red (≤25%).
- Energy: a gold pill with a lightning bolt and one glowing orb per point (empty sockets for spent energy, blue orbs for bonus energy above your maximum) and a big "2/3" count.
- Armor: a steel shield with a gold rim and the number on it. Block: a glowing cyan crystal (orange for enemy Block).
- Intent bubbles, Aether row, combat log and hand title also scale up.

## Round 48 — Intent labels

- The two intent bubbles are now labelled "Enemy move next turn:" (rose) and "Enemy move the turn after:" (blue), in normal case and a little larger.

## Round 49 — Card variety, card choice, energy → Aether, faster city

New file `assets/card-variety.js` (loaded after aether-deck.js); art from `tools/generate_variety_card_art.py`; tests in `tests/card-variety.test.cjs`.

- **Choose your card reward.** A loot chest that holds a card now offers three different cards from the current world's pool; take one or leave them all ("Leave them"). Pools: city 11 cards, Elaris 13, Vespera 13 (Vespera finally has its own).
- **15 new cards, 5 per world, 4 levels each:**
  - City: Arc Jab (0: 3 dmg, +1 Aether), Bulwark Bash (1: damage = your Block), Overclock (0: +1 energy, exhaust; pitches for 3 Aether), Static Shield (1: 6 Block, cleanse 1 debuff), Breach Spike (1: 5 dmg, enemy −2 Armor for the fight).
  - Elaris: Thornlash (1: 4 dmg, Poison 3, doubled if already poisoned), Wildfire (2: 8 dmg, Burn 3 or double an existing Burn, max 10), Rootbind (1: 5 Block, next enemy attack −4), Tidecall (1: draw 2, +1 card next turn), Verdant Pact (0: heal 4, +1 Aether, exhaust).
  - Vespera: Chain Lightning (2: 5 dmg × 3, Armor per hit), Storm Battery (1: +2 Aether, draw 1), Mirrorguard (2: 10 Block, reflect half of what Block stops), Tempest Surge (X: 7 dmg per energy spent), Prism Lance (2: 12 piercing, ignores Barrier).
- **Unspent energy → Aether.** Ending a turn with energy left gives 1 Aether. City side-deck use went from ~0–0.3 to ~0.7–1.5 plays per fight in simulation.
- **Faster early city.** City regular enemies' extra health eased from ×1.1 to ×0.95. Simulated level-3 city fights: ~23 → ~17 turns; level-7: ~12.5 → ~10.
- **Balance.** The simulator's decks now include the new cards a player would pick (BASIC_DECKS=1 restores the old decks), and the bot understands X-cost and multi-hit cards. Boss health retuned so a typical build still wins ~40% vs mini-bosses and ~28% vs final bosses: moonKnight .73, crownSentinel .72, thornWarden .95, tidewardenElaris 1.4, galeSovereign .79, bloomTyrant .77, arcSentinel .72, resonantPhantom .82, stormTyrant .46. Final typical win rates: Lunar 38%, Crown Sentinel 38%, Thorn Warden 27%, Tidebound 45%, Gale 44%, Bloom Tyrant 25%, Arc 41%, Resonant 40%, Tempest Colossus 32%. Regular fights mostly 65–100%; the last Vespera zone (Lv 26) is the hardest at 27%.

## Round 50 — Exploration: points of interest and the Wandering Merchant

New file `assets/exploration.js` (loaded after combined-rooms.js); tests in `tests/exploration.test.cjs`.

- **Points of interest.** About a third (36%) of ordinary rooms in each world (never the start, a boss room or a chest room) get one, placed from the journey seed on a reachable spot at least 150px from patrol homes. Each world has five lore finds plus at least one of each other kind:
  - ⛩ **Aether Shrine** — choose 1 of 3 blessings for your next fight: Ward of Glass (6 + level/2 opening Block), Surge Rite (+1 energy, +1 card on turn 1), Aether Well (+3 Aether), Keen Edge (+3 damage on every attack), Vigil (heal 30% after the win).
  - 🔥 **Campfire** — rest for 35% max HP, or train an active card for +15 mastery uses.
  - ⌨/◈/ϟ **Lore** (Data Terminal / Whispering Stone / Storm Glyph) — five short story fragments per world, +2 Shards each; reading all five gives +15 Shards and a side card.
  - ⬙ **Supply Cache** — 3–6 Shards, 25% chance of a potion.
  - ⚠ **Sealed Cache** — optional risk: 50% +9 Shards, 50% lose 15% max HP (never below 1).
  Each is single-use; walking onto it opens it (step away to reopen). Used ones dim. The map tags rooms with their point of interest and shows found/used counts and lore progress.
- **Shards** (new currency, shown in the HUD): 1–2 per regular win, 3 per elite, 6 per mini-boss, 10 per final boss.
- **Wandering Merchant** 🛒 — sets up in a random ordinary room, with a new room and stock each time you enter a world or are defeated. Three wares from: side-deck card (10), healing potion (5), card bundle (choose 1 of 3, 8), Upgrade Crystal (25), bottled blessing (4); always includes a side card. Each sells once.
- Saves: `shards`, `blessing`, `poi` are validated on import; older saves start with empty exploration data.

## Round 51 — Smoother start in Elaris

Problem (simulated, all 16 builds, player level = enemy level, arriving with the city deck): Elaris Lv 10 regulars won 42%, Lv 11 35%, Lv 12 36%; Drowned Heron 4–9% at Lv 11–12, Storm Moth 22–27%.

- **Entry ramp** (`BALANCE.entryRamp.elaris`): regular and elite enemies (never bosses) at Lv 10/11/12/13 have ×0.90/0.88/0.90/0.95 health and −1/−1/−1/0 attack, so difficulty climbs from the portal instead of jumping.
- **Drowned Heron** health ×0.85 and **Storm Moth** ×0.9 (the two worst early fights).
- **Elaris attunement:** arriving from the city for the first time offers a choice of 1 of 3 Elaris cards (Cinder Lance, Venom Bloom, Gale Cut, Thornlash, Wildfire, Rootbind, Tidecall, Verdant Pact); it joins the active deck if there's room.
- Result with the city deck: Lv 10 **78%**, Lv 11 **66%**, Lv 12 **65%** (Heron 81/59/53%, Moth 61/54/61%). With an Elaris deck after a few rewards: 95/89/88%, then Lv 13 ~70%+. Bosses unchanged.

## Round 52 — Store rules

- The Wandering Merchant no longer sells Upgrade Crystals, and never sells Soulbound cards: card bundles and upgraded cards are always Impermanent.
- New wares: **Upgraded card** (12 Shards — choose 1 of 3 Impermanent cards from this world at level 1, level 2 in Vespera) and **Card upgrade pack** (15 Shards — raise one of your Impermanent cards by a level; mastery starts fresh; can't be bought if you have none to upgrade).
- Every stock is a side card + a card upgrade (upgraded card or pack) + one of potion / card bundle / blessing.
- Every world always has a store: if no ordinary room is free, the merchant sets up in the safe start room. The map now names the area the merchant is in.

## Round 53 — Drop rates

- Loot chests: a card choice is now the most common outcome at **55%** (was 35.5%). Potions 25% (was 35.5%), empty 15% (was 24%); Soulbound jackpot 1% and Upgrade Crystal 4% unchanged.
- Side-deck card drops: **5%** from regular and elite enemies (was 12% / 35%). Bosses still always drop one, lore sets pay one, and the merchant always stocks one.

## Round 54 — Card choice at 40%

- Loot chests: card choice **40%**, potion 35%, empty 20%, Upgrade Crystal 4%, Soulbound 1%. (Side-card drops stay at 5% from regular and elite enemies.)

## Round 55 — Show the unspent-energy Aether

- The unspent-energy rule (Round 49: end a turn with energy left → +1 Aether) was working but invisible until after the turn. The Aether row now counts it in the pending pips and says "+N at end of turn (incl. +1 from unspent energy)"; with nothing pending it reads "Pitch cards or end the turn with energy left to gain Aether".

## Round 56 — Stacked copies in the Deck Workshop

- Copies of the same card at the same level and ownership (Soulbound or Impermanent) now show as one tile with a gold ×N badge and "k of N copies in deck". Buttons work on one copy at a time: Add a copy / Remove a copy / Upgrade a copy / Destroy a copy (destroys the least-used copy not in your deck first). The tile shows the most-used copy's mastery (or a copy that's ready to upgrade).
- The active-deck list stacks the same way ("Sundering Arc · Lv 0 ×2").
- Soulbound and Impermanent copies stay separate stacks because one can be lost and the other can't; different levels stay separate too.

## Round 57 — Weaken button

- The Weaken ability is now a large glowing magenta button with a cracked-blade icon, "WEAKEN" and "Enemy attack −N · once per fight", pulsing while available and lifting on hover. After use it turns into a dimmed "WEAKENED · Enemy attack −N" plate, and the enemy gets a "▼ −N attack" chip. Visual only (battle-hud.js / battle-hud.css).

## Round 58 — View the side deck any time

- The Aether row has a **▾ View side deck** toggle that expands the cards still left in your side deck for this encounter, sorted by name so the draw order stays hidden. They are shown dimmed and can't be played or taken from there. A note says how many are left and whether you have the 4 Aether needed to draw ("You need 4 Aether to draw — you have 2."). Drawing still only happens through the Side deck button, which stays disabled until you have enough Aether.

## Round 59 — The map only shows what you've seen

- Room tags (Boss, Relic, Chest, Crystal, points of interest, the merchant) appear only for areas you have visited; an unexplored area is never tagged.
- The map footer no longer reveals totals: "N areas explored · X hidden chests found · Y relics claimed", and "Points of interest found: N" (with lore read and Shards). The merchant's location is listed only once you've seen its area. (This replaces Round 52's always-named merchant.)

## Round 60 — Upgrade Crystal pickup image

- New `assets/pickups.js`. Every Upgrade Crystal you receive now shows the up-arrow crystal from `assets/items/upgrade-crystals.png` (popping in, then floating) with "You now have N":
  - in the victory screen for loot-chest crystals and the guaranteed mini-boss crystal (beside any card or side-card reward);
  - in an "Item found" window for hidden crystal chests and the Memory Annex crystal in the world.

## Round 61 — Map without overlaps, doorways to the unknown; campfire clarity

- The exploration map is laid out on fixed-size grid cells (150 × 104 px) instead of squeezing the whole explored area into one fixed box, so room panels never overlap. A large map scrolls, and it opens centred on the room you're in.
- Paths leading to areas you haven't explored end in a small glowing **doorway** marker just outside the room — you can see there's a way through without the map revealing what's beyond it.
- Campfires (already single-use) now say so: "The fire burns out after one use", the toast confirms it burned out, a used campfire reads "The campfire has burned out. Each campfire can be used once — to rest or to train one card", and the buttons ignore repeat clicks.

## Round 62 — Damage-over-time per turn

- Both combatants show a "☠ −N HP / turn" badge whenever damage-over-time is active, with the breakdown underneath: on you, Bleed + Burn + Poison (red); on the enemy, Poison + Burn (green). The total matches what actually ticks at the end of the turn (checked in the browser: −5 on you, −7 on the enemy).

## Round 63 — Signal Amplifier and Deep Interference: +1 per rank

- Signal Amplifier now adds +1 Power Boost per rank (Boost = 1 + rank, up to +6 at rank 5; was +1 at ranks 1/3/5, max +4). Deep Interference adds +1 Weaken per rank (Weaken = 1 + rank, up to −6 enemy attack; was max −4). Talent descriptions updated.
- Simulated effect (20 fights × 16 builds × 2 styles): bosses and mini-bosses about 3–13 points easier (e.g. Thorn Warden 27→35%, Crown Sentinel 38→51%, Arc Sentinel 41→54%, Tempest Colossus 32→41%); regular fights a little easier too. Boss health not retuned.

## Round 64: compact burgundy Weaken, always-visible debuffs

- The Weaken button (and the WEAKENED plate) is half its old size and burgundy instead of purple.
- Both combatants have a **Debuffs** strip that is always visible and shows "None" when nothing is active. It lists every active debuff with a tooltip, plus the total HP lost per turn.
  - You: Bleed, Poison, Burn (turns left), Frail, Shackled, Drained, Exposed, Fogged.
  - Enemy: Poison, Burn (amount and turns), Weakened, Rootbind, Frozen, Silenced.
- The scattered duplicates are gone: the top status line, the intent status text and the loose debuff tags.

## Round 65: Aether is only spent when you play a side card

- Drawing from the side deck is free: look at the top 2 side cards, then take one or put both back on top. Viewing the side deck, opening Character, and drawing never cost Aether.
- Playing a side card is what costs Aether: 4, plus the card's own energy. Side cards show a "4 ✦" badge and are greyed out until you can afford them.
- Unspent energy converts 1:1. Each energy left when you end your turn gives 1 Aether, up to the 8 cap. The Aether preview shows the exact amount.
- Updated the Deck Workshop text, the compendium, the tests, and the simulation bot. Bosses stay in target: Thorn Warden 31%, Bloom Tyrant 30%, Tempest Colossus 34% (SEED=11, 30 runs).

## Round 66: Weaken is a one-shot, tripled

- Weaken (once per encounter) now lowers only the enemy's **next attack**, then wears off. It used to last the rest of the fight.
- Its value is tripled: 3 base, +3 per Deep Interference rank, up to 18. Charge turns, guard turns, Silenced turns and frozen turns don't use it up.
- Updated the button, the "WEAKENED" plate (it shows "WEAKEN USED" once spent), the debuff strip, the talent descriptions and the compendium. Balance was not re-simulated, as requested.

## Round 67: the side deck is always open, 4 Aether minimum

- There's no more draw, choose or put-back step. In every fight, every side card in your side deck is shown and can be played directly, once per encounter.
- Side cards cost Aether only, never energy: 4 plus the card's listed cost, so the minimum is 4. Purifying Light, Dispel Lance, Aegis Ward, Verdant Restore, Grounding Rod and Aether Overflow cost 4. Null Anchor, Mirror Sigil and Phase Veil cost 5. Stasis Field costs 6.
- The cost badge on each side card shows its Aether price. Cards you can't afford are greyed out. The panel can be collapsed with "Hide side deck".
- Updated the Deck Workshop text, the compendium (side cards list their Aether cost), the tests and the simulation bot. Balance was not re-simulated.

## Round 68: Jammer Reserve, extra Weaken charges

- New Disruption talent, **Jammer Reserve**: 2 ranks, needs Deep Interference 3, sits beside Suppression Field. Each rank adds +1 Weaken charge per encounter, for up to 3 charges.
- Only one Weaken is active at a time. When it wears off after the enemy's next attack, the button comes back if you have charges left.
- The Weaken button shows "N of M charges left". The WEAKENED plate shows the charges remaining, and once all charges are spent it reads "All 3 charges spent".
- Weaken now runs through a shared `useWeaken()` function. New talent tests cover the charges, one-at-a-time use, and wearing off. The sim bot can use the extra charges.

## Round 69: the merchant always sells potions and unlimited card upgrades

- Every Wandering Merchant now stocks a side card, **healing potions** and **card upgrades**, plus one more ware (an upgraded card, a card bundle or a blessing).
- **Potions** cost ◇ 4 and never sell out. That's about two regular fights of Shards. A potion heals 5 HP (plus 1 per Recovery Protocol rank), so it's priced to be a cheap top-up.
- **Card upgrades** are unlimited. You pay when you pick the card, and the price depends on the level reached: ◇ 12 to level 1, ◇ 20 to level 2, ◇ 30 to level 3. Taking one card from 0 to 3 costs ◇ 62.
  - Why these prices: in the playthrough, a world paid about 150–180 Shards, roughly 1.5 per regular fight, 3 per elite and 6–10 per boss, and runs ended with 200–600 Shards left over. At these prices a world's income buys about three full card upgrades, or about ten single steps.
- The upgrade screen lists your Impermanent cards with their price, cheapest first. Cards you can't afford are greyed out, and you can buy several in a row. Opening it is free, and "Back to the merchant" returns to the shop.
- Updated the exploration tests and the compendium.

## Round 70: XP by level gap, quiet rooms and waystones, compact side deck

- **Less XP for enemies below your level.** Enemies at or above your level give full XP: 25, elites 40, bosses 50. Each level you are above the enemy takes 20% off (80%, 60%, 40%, 25%), with a 10% floor at five or more levels. The victory screen shows "+N XP" and says when it was reduced. In the playthrough, players left the city at level 20–25 against level 1–9 enemies; now clearing a world no longer outruns it.
- **Quiet rooms with events in Elaris and Vespera.**
  - Three rooms per world have no enemies: Elaris 2,2 / 5,6 / 10,7 and Vespera 2,4 / 6,4 / 10,5.
  - Each holds an event with two choices, three different events per world.
  - Elaris events: Moonlit Spring, Wounded Ranger, Glowing Seedpod and Strangling Vines.
  - Vespera events: Storm Shelter, Humming Conduit, Glass Scavenger and Echoing Prism.
  - The choices cover resting, potions, Shards, risky card upgrades, deck training and blessings. Each event can be used once.
- **Waystone shortcuts.** Each world has a waystone at the landing and its twin mid-world: Elaris at Mistbound Thicket (level 15), Vespera at Glasswind Reach (level 22). The landing stone stays dark until you touch the far one. After that you can travel between them any time, for example to go back to the start and the merchant.
- Lore and the four kinds of points of interest are still guaranteed in every world. The minimum number of points of interest was raised so Elaris still fits all of them.
- **Side deck fix.** In battle the side deck is now a compact row of chips showing each card's icon, name and Aether price, with the full text on hover. Chips you can afford glow and play with one click. "Card details" opens the full cards.
- On phones, the fighters and both enemy-move bubbles now sit side by side, so your hand is visible without scrolling.
- New tests in tests/pacing.test.cjs, and the compendium is updated.

## Round 71: the side deck grows from 2 to 6

- New journeys start with room for **2** side cards: Purifying Light and Aegis Ward are equipped, and Dispel Lance waits in your collection to swap in.
- You gain **+1 slot** for each of these bosses, reaching 6 by late Vespera:
  - Crown Sentinel (city), which takes you to 3
  - Gale Sovereign (Elaris), 4
  - Bloom Tyrant (Elaris), 5
  - Resonant Phantom (Vespera), 6
- When a slot opens, the victory screen says so, and an unequipped side card is equipped into it automatically.
- The Deck Workshop shows "Room for N of 6 cards" and names the boss that opens the next slot. Adding a card beyond the current room explains how to expand it.
- Battles only bring the cards that fit. Older saves with more cards equipped than they have room for are trimmed to fit.
- Updated the tests (aether-deck) and the compendium.

## Round 72: the side deck gets its own column beside your hand

- In battle, the side deck now sits in its own column to the right of your hand instead of in a row above it.
- Side cards are stacked one per row, and the column scrolls up and down. The list is capped at 430px on desktop and 300px on phones.
- The column header shows how many side cards are left and how many you can afford right now. Cards you can't afford are greyed out, and their tooltip says how much Aether they need.
- The Aether bar stays above your hand.
- On phones the column is narrower and its cards are compact: name, Aether price and text, with no art.
- The Round 70 "Card details" toggle is gone. The column always shows the full card text.

## Round 73: Nexus Waypoints, with teleporting from the map

- Every world now has a **Nexus Waypoint** at its start and another in its middle:
  - Neon Aftermath: Afterlight Refuge and Tunnelworks Corridor
  - Elaris: Dawnroot Landing and Mistbound Thicket
  - Vespera: Stormglass Landing and Glasswind Reach
- **Walking into a waypoint's room discovers it.** The start waypoints are discovered as soon as you arrive in a world.
- **Teleporting:** the map has a "Nexus Waypoints" panel listing every waypoint you've discovered, grouped by world. Click one to teleport, including to another world you've already reached. Stepping on a waypoint opens the same list. You can't teleport during a fight.
- Teleporting into another world remembers where you'd been there.
- These replace the Round 70 waystones. Older saves with an attuned waystone get both of that world's waypoints.
- Updated tests/pacing.test.cjs, tests/exploration.test.cjs and the compendium.

## Round 74: click a waypoint on the map to teleport

- On the exploration map, every Nexus Waypoint you've discovered in the current world has a cyan glow and a "⟟ Teleport" badge. Click it, or focus it and press Enter or Space, to teleport there.
- The waypoint you're standing at is labelled "⟟ Waypoint" and can't be clicked. Waypoints you haven't discovered aren't clickable, and nothing on the map teleports during a fight.
- The "Nexus Waypoints" button list under the map stays, for waypoints in other worlds.
- Map room panels now carry a `data-cells` attribute so map features can find their rooms.

## Round 75: playtest fixes

- **Fixed: phantom level-up line on victory screens.** Since Round 70, every potion or empty-chest victory showed "Level N! +0 maximum HP, +0 healing, and +0 talent point(s)" and hid the XP gained. A missing pair of brackets made the level-up line always appear. Victory screens now show "+N XP" (and say when it was reduced) and only mention a level-up when one happens.
- **Fixed: card-choice chests didn't show XP at all.** They now show the same "+N XP" line.
- **Fixed: Elaris and Vespera maps started at "34% complete".** Worlds with no relics counted that part as already done. The percentage now averages only the parts a world actually has.
- **Simulation harness:** fights now start with the progress a player would have by then, meaning bosses already beaten (so side deck room grows) and the side cards picked up along the way. Before this, every simulated fight used a 2-card starter side deck.
  - With that fixed, the Bloom Tyrant comes out at 22%, back in its target range, instead of 9%.
  - Late Vespera is still a little too hard: level 26 regulars 28%, the Arc Sentinel 30%, the Tempest Colossus 21%.
- New regression test in tests/pacing.test.cjs for the victory screen.

## Round 76: build balance, elite rewards, city events, bounties, full-exploration reward

- **Talent builds balanced late game.** Defensive and control talents gave flat amounts that couldn't keep up with Vespera's numbers. Reactive Plating, Bulwark Doctrine, Retaliation Coil, Siphon Edge, Counter Weave, Reflux and Weaken now scale with the world: ×1.3 in Elaris and ×1.6 in Vespera. Simulated with SEED=7, 20 fights per build, comparing the worst build before and after (✓ means the average is now in its target range):

  | Fight | Average win rate | Worst builds before | Worst builds now |
  |---|---|---|---|
  | Vespera level 26 regulars | 28% → 50% ✓ | 0% | 5–25% |
  | Arc Sentinel | 30% → 43% ✓ | 0% | 0–15% |
  | Tempest Colossus | 21% → 33% ✓ | 0% | 0–25% |

  - Resolve builds such as R·Retain went from 10–20% to 80–90%. Elemental is still strongest, but no longer the only build that works.
  - Elaris checked: Bloom Tyrant 33%, Tidebound Warden 45%. The Gale Sovereign came out at 52%, so its health went up from 0.79 to 0.82.
  - The talent descriptions mention the scaling.
- **Elites are worth fighting.** An elite's loot chest always gives a card choice instead of an empty chest or a potion (crystal and Soulbound rolls still win). Elites drop 6 Shards instead of 3.
- **City quiet rooms and events.** Overgrown Alley, Wisplight Row and Corrupted Passage have no enemies. Each holds a city event, three of these four per journey:
  - Abandoned Terminal: hack it for Shards, or train your deck.
  - Street Medic: pay for a heal, or get a free potion.
  - Busted Vending Machine: kick it for potions, or pay for one.
  - Lost Courier: return the parcel for a blessing and Shards, or open it for a chance at a side card.
- **Bounties.** Every fight has one optional bounty, shown as a chip in the top bar that turns green when done or grey and crossed out when missed. Victory screens say whether you earned it. The four bounties:
  - Swift: win within 4 turns (5 for elites, 7 for bosses).
  - Untouched: lose no HP.
  - Self-reliant: play no side card.
  - Overkill: deal 15+ damage with one card.
  - Rewards: +3 Shards, +5 for elites, +8 for bosses.
- **Full exploration reward.** Visiting every room and finding every chest and relic in a world gives +20 Shards and a side card, once per world. The map shows a note with the goal.
- New tests in tests/round76.test.cjs, and the compendium is updated.

## Round 77: Chronospire, the fourth world, and the ⏳ Suspend mechanic

**Suspend** comes from Magic: The Gathering.
- A card marked ⏳ Suspend N can be played normally, or set aside for 0 energy with its own **⏳ Suspend · free** button.
- A suspended card waits in the **⏳ Suspended** tray with a big countdown. The number drops by 1 each time you end your turn.
- At 0 the card plays itself at the start of your turn, for free, with its charged bonus. For example, Temporal Barrage deals 14 + 8 = 22 damage.
- You can have up to 3 suspended cards at once.

Making it clear on screen:
- Every Suspend card has a gold "⏳ SUSPEND N" badge. Its rules text spells out the whole rule, including when it fires and its exact charge.
- The Suspend button says when the card will play itself and what bonus it gets.
- The tray shows each card's countdown, when it fires and its charge. After a card fires, a green banner shows what it did, including the damage.
- **How Suspend works** is a 3-step guide. It opens on arrival in Chronospire and the first time you hold a Suspend card, and the tray's button reopens it any time.
- The combat log also records each suspend and each auto-play.

The new cards (all Impermanent, with art from tools/generate_chrono_card_art.py):
- Temporal Barrage, Suspend 2: 14 damage, charged +8.
- Delayed Bulwark, Suspend 1: 9 Block, charged +6.
- Clockwork Volley, Suspend 2: 3 hits of 4, charged +2 per hit.
- Future Sight, Suspend 1: draw 2, charged +1 card.
- Rewind Mend, Suspend 2: heal 7, charged +6. Exhausts.
- Chrono Spike, Suspend 1: 7 piercing damage, charged +4.
- Accelerate, costs 0: all suspended countdowns drop by 1, and anything that reaches 0 fires immediately.

New enemy affliction:
- ⟲ **Rewind** adds 1 turn to every suspended countdown. If nothing is suspended, you lose 1 Aether instead.
- It can be stopped with Purifying Light or Null Anchor.

**Chronospire**, a clockwork citadel where time is broken:
- **Getting there:** a rift opens in the Eye of the Tempest after you beat the Tempest Colossus.
- **Layout:** 34 rooms, all two-way, at levels 28–36.
- **Enemies:** 8 new regular enemies (Gearhound, Tick Moth, Brass Sentry, Lag Wraith, Hourglass Heron, Pendulum Stag, Rust Wisp, Cog Mauler). They reuse existing sprites, recoloured in brass.
- **Bosses:**
  - The Clockwarden, a mini-boss at level 30.
  - The Paradox Twin, a mini-boss at level 33.
  - The Chronarch, the final boss at level 36. It switches element every 4 turns.
- **Points of interest:**
  - Nexus Waypoints at Chronospire Gate and Hourglass Hall.
  - Three quiet rooms with four new events: Clockmaker's Bench, Paradox Pool, Giant Hourglass and Echoing Corridor.
  - Five Chrono Inscription lore entries, two crystal chests and a merchant.
- **On arrival** you get Temporal Barrage and Chrono Spike, plus the Suspend guide.
- **Other numbers:** talents scale ×1.9 here, and side cards drop from all tiers. Card rewards come from the Suspend cards plus late-game staples.

Balance (simulated with SEED=7, 10–12 fights per build; the bot suspends every Suspend card that costs 2 or more):
- Average win rates: regulars 98% at level 28 and 56% at level 35; mini-bosses 48% and 49%; the Chronarch 30%. All are inside their target ranges.
- If the bot never uses Suspend, level 35 regulars drop to 9% and the Chronarch to 1%, so this world is built around the mechanic.

Fixed along the way:
- Elaris, Vespera and Chronospire enemies were invisible in the small battle portrait, because their sprites had no size there.
- The full-exploration map note read "every room, chest here". It now reads "Find every room and hidden chest in this world".

Tests: tests/chronospire.test.cjs. The sims now cover Chronospire, and NO_SUSPEND=1 turns the bot's Suspend use off.

## Round 78: Diagonal shortcuts in Neon Aftermath and Elaris

- New `assets/diagonals.js`. Wherever the old path bent around a corner
  (A → B → C), A and C now also get a direct diagonal road. The old route still
  works. Neon Aftermath gains 25 shortcuts and Elaris gains 14. Boss rooms and
  the joined districts don't get them.
- Rooms with a diagonal road use the new 8-way roundabout art
  (`assets/environment/diagonal/neon-8way.webp` and `jungle-8way.webp`).
- Walk into a corner along the painted diagonal road to cross, or click or tap
  the gold corner label (↗ ↖ ↘ ↙ plus the room name). You arrive at the
  matching corner of the next room. The exploration map draws the diagonal
  links.
- Enemy levels and room distances are unchanged; they are still measured on the
  original grid.
- The industrial foundry maps are saved in `assets/environment/industrial/` for
  a later world.

## Round 79: Purpose-made roundabout art for Neon Aftermath diagonals

- Each Neon Aftermath diagonal room now shows a painting with **only its open
  corner roads**. There are 12 variants in `assets/environment/diagonal/city/`,
  named by their open corners (e.g. `ne-sw.webp`). They were built by combining
  the quadrants of two matching paintings: one with all four diagonals, one with
  none.
- Collision follows the painting: you walk on the roads, sidewalks and
  roundabout, never on rooftops. The walkable area is a 4-pixel trace stored in
  `diagonals.js` (`DIAG_MASK_SRC`).
- You arrive a few steps in along the diagonal you came from. Hidden chests
  whose usual spot is now inside a building move to the nearest pavement.
- Tests: the diagonal connectivity check now flood-fills from the centre to
  each open corner. The chest walkability check accounts for chest relocation.
- Elaris still uses the earlier jungle art until its matching paintings arrive.
- Removed the unused squashed `neon-8way.webp`.

## Round 80: Purpose-made jungle crossroads for Elaris diagonals

- Elaris diagonal rooms now use the new jungle crossroads paintings. There are 9
  variants in `assets/environment/diagonal/elaris/`, built the same way as the
  city ones: each shows only the paths that are open.
- Collision follows the dirt paths, the stepping stones and the clearing around
  the spring. Moss-covered stone curbs and the planted blocks are solid.
- In painted rooms, the walkable area is exactly the traced paths, with no extra
  body-width margin, because jungle paths are only about 45px wide.
- Reaching the room edge near an open corner now counts as taking that diagonal.
  The painted jungle paths don't always meet the exact corner pixel.
- Arrival points sit clear of the corner zones, so you can't bounce straight
  back. Tap-to-move only steps between grid points when the ground in between
  is open, so it routes around thin wall tips.
- Corner labels always show their direction arrow.
- Tests: an arrival must be walkable and outside any corner zone. Corner
  reachability uses the corner zones.
- Removed the unused `jungle-8way.webp`.

## Round 81: Cleaner exploration map

- Removed the oval door markers on unexplored paths. A short dotted line
  leading off a room now marks a path you haven't taken yet.

## Round 82: The exploration map is a giant city

- New `assets/map-terrain.js`. The map paints each explored room's own ground
  art onto the grid, edge to edge: street blocks, the diagonal roundabouts, the
  joined-district paintings and the jungle clearings. Explored Neon Aftermath
  reads as one continuous city, and Elaris as one jungle.
- Unexplored rooms stay dark (fog of war). Your current room has a gold glow.
- Room names are now compact floating tags over their tile, and connection
  lines are thin dotted guides.
- Map cells are 16:10 (176×110) so the art keeps its shape. Room tiles are
  cached after their first draw, and paintings that are still loading redraw
  the map when they finish.
- New `tests/map-terrain.test.cjs`.

## Round 83: Map frontier and seamless joins

- **Seamless joins:** where two explored rooms touch, each tile's edge is
  mirrored a short way into its neighbour and cross-faded. The pictures blend
  instead of meeting at a hard line, and because the edges are mirrored, every
  road stays exactly where it is and runs straight through the join.
- **Frontier:** edges facing unexplored ground are softly dimmed and blurred
  into the fog, with no outline. A blurred, darkened copy of the explored land
  sits underneath, and the sharp art fades out over it near the edges. The
  frontier shape is gently irregular and continuous around corners.
- **Fog:** unexplored ground is dark with a faint survey grid.
- Room name tags are 40% opaque, and the connection lines 30% opaque, so more of the art shows through.
- **Closed roads:** two explored rooms side by side with no path between them
  get a small striped barricade where their roads would meet. This happens in
  Vespera and Chronospire.

## Round 84: Smaller world enemies, danger-coloured names

- New `assets/enemy-labels.js`. Enemies in the world are drawn 20% smaller in
  every world, and their name bubbles are 30% smaller.
- An enemy whose level is 2 or more above yours has its name shown in red. It
  goes back to normal once you catch up.
- New `tests/enemy-labels.test.cjs`.

## Round 85: Sharper map with zoom

- The map terrain is drawn at the screen's real pixel size, device pixel ratio
  included, so it's crisp on high-DPI screens. It redraws at the new resolution
  whenever you zoom. Room art is cached at 400×250, half the room's size.
- The terrain is never stretched. It's always drawn at 16:10 per room, and the
  map no longer widens to fill the panel when only a few rooms are explored.
- **Zoom:** the − / + buttons, a percentage readout and "Fit" sit above the
  map. Ctrl or ⌘ + scroll and trackpad pinch zoom around the cursor, and
  two-finger pinch works on touch screens. The range is 30% to 300%, and the
  zoom is remembered between openings.
- Very large zooms are capped at about 16 megapixels so mobile Safari can still
  draw them.

## Round 86: New Crown Mainframe and Prism Bazaar art

- Crown Mainframe District (Neon Aftermath, 4 rooms) and Prism Bazaar
  (Vespera, 2 rooms) now use the new crossroads paintings: violet crystal
  citadel for the Mainframe, garden bazaar for Prism Bazaar.
- Each room in a district gets the crossroads. Neighbouring rooms are mirror
  images, so every road and kerb meets its twin exactly at the shared edge and
  the district reads as one continuous place.
- Collision follows the painted roads: the east–west and north–south streets
  with their pavements, plus the roundabout. Buildings, towers, ponds and trees
  are solid. Hidden chests in these rooms use the pavement fallback spots.
- The 8-way versions are saved as `mainframe-8way.webp` and
  `promenade-8way.webp`, ready for when those districts get diagonals.

## Round 87: Painted Neon Aftermath streets and a new Crown Mainframe

- **Crown Mainframe District** has a new single 2×2 painting: violet citadels,
  waterfalls and crystal roundabouts. It's calibrated onto the district's
  streets band by band, like the other districts, and replaces the mirrored
  crossroads from Round 86.
- **Plain city rooms are now painted.** The 13 Neon Aftermath rooms with no
  diagonal roads and no district use quarters of two new neon street paintings
  (`assets/environment/city-blocks/neon-a.webp` and `neon-b.webp`): 8
  different crossroads, chosen per room. Each quarter's roads are stretched onto
  the room's existing street corridor, so exits, spawns and points of interest
  stay where they were. Only the four corner blocks are solid; the old loose
  street props are gone with the procedural texture.
- New `assets/city-paintings.js`. The exploration map picks the paintings up
  automatically and redraws once they've loaded.
- New `tests/city-paintings.test.cjs`.

## Round 88: Painted Elaris rooms and the organic-path engine

- **Painted Elaris rooms:** the 7 plain Elaris rooms (no diagonals, not in a
  district) now use quarters of the new jungle crossroads painting
  (`city-blocks/elaris-a.webp`). The sandy roads are fitted onto the existing
  path corridor, so exits, spawns and points of interest are unchanged.
  `city-paintings.js` now takes a painting list per world.
- **Organic-path engine** (`assets/organic-paths.js`): a district can be one
  free-form landscape with winding paths. `tools/build_organic_area.py` traces
  the dirt paths into a walk mask and registers it in `assets/organic-areas.js`.
  Inside such a district:
  - you walk only on the paths;
  - each exit sits where a path meets that edge, and its label is drawn there;
  - you arrive at that door when you come in;
  - patrols and chests move onto the paths;
  - tapping a door label walks you there.
  The engine is off until a fitted painting is registered; it's covered by
  `tests/organic-paths.test.cjs` with a synthetic winding-path district.
- Saved for later: the first organic Elaris draft and the medieval town map
  (`assets/environment/later/`).

## Round 89: Emerald Expanse becomes an organic jungle

- Elaris's Emerald Expanse district (4 rooms) is now one free-form jungle
  painting with winding sandy paths, wooden bridges, waterfalls and temple
  ruins, the first district on the organic-path engine.
- You walk only on the paths and bridges. The three exits (west to Drowned
  Thicket, south to Stormlit Marsh, south to Galeward Shallows) sit where the
  paths leave the painting, with their labels there, and you arrive on the path
  when you come in. Patrols are placed on the paths.
- "Path closed" signs are hidden in organic districts; the painting shows where
  the paths end.
- `build_organic_area.py` accepts several path colours and `--clear` boxes, used
  here to drop a sunbeam the tracer mistook for path.
- Tests: the real painting's three doors must all connect along the paths, and
  every patrol must stand on a path.

## Round 90: Five more organic districts

- Five more districts are now organic paintings with winding paths:
  - **Crown Mainframe District** (Neon Aftermath): rain-soaked neon walkways.
  - **Sunpetal Wilds** (Elaris): sunflower-meadow trails.
  - **Stormglass Reach** (Vespera): storm-cliff flagstones.
  - **Prism Bazaar** (Vespera): cobbled market lanes.
  - **Stormforge Foundry** (Vespera): catwalks over molten channels.
  Six districts in total use the engine now. Wide two-room paintings keep their
  own 3.2:1 shape.
- **Doors on room boundaries:** a door can now sit on a path that leaves the
  district right on the line between two of its rooms. The search may reach up
  to 220 px into a neighbouring district room that has no exit of its own on
  that side. Leaving through such a door hands you to the room that owns the
  exit, and arriving puts you in whichever room the landing spot is in.
- **`build_organic_area.py`:**
  - `--close N` to seal seams and bridge joints;
  - edge-padded closing, so paths keep touching the border;
  - keeps only the largest connected path network.
  Shaded or lightning-lit catwalk colours and bridge colours were added per
  painting.
- Tests: all six real paintings must have every door on a path, landing points
  on a path, all doors connected, and every patrol on a path.

## Round 91: Neon Aftermath becomes one continuous painted city

- **The map:** the first world is rebuilt on your six district paintings, laid
  out as a 3×2 map. Each painting covers 3×3 rooms, so the city is 54 rooms
  (it was 42):
  - Harbor Ruins (start)
  - Neon Square
  - Crystal Citadel
  - Overgrown Park
  - Lantern Quarter
  - Junkyard Lots
- **Streets:** `tools/build_world_map.py` stitches the paintings and traces
  every street, plaza and park path into one connected walk mask (8 px
  cells, in `assets/neon-world.js`).
  - The tracer had to bridge Neon Square's puddled plaza and the Junkyard
    arena, and a few hand-placed links join the plaza steps, the temple
    courtyards and the junkyard spur.
  - It drops the pools and waterfalls the tracer mistook for paving, and
    slivers where a street only grazes a room's edge.
  - `tools/build_world_rooms.py` turns the result into rooms, with exits
    wherever a street crosses a room edge.
- **Each room is an 800×500 window onto the map.** You walk only on the
  painted streets. Leave by any street that crosses the room's edge and you
  arrive at the matching spot in the next room, so walking feels continuous.
  The edge you came in by stays shut briefly so you can't bounce straight
  back.
- **Exit labels** sit on each side's main street, and that street must
  continue on the far side. Tapping a label walks you there.
- **Placement:** patrols, chests, relics, points of interest and the merchant
  are all placed on the streets. You're snapped onto the nearest street if a
  fixed arrival point (portal, waypoint, defeat) lands inside a building.
- **Progression:**
  - The Thorn Warden is at the Warden's Crown, the Crystal Citadel's
    hilltop arena. It also holds the portal to Elaris.
  - The Crown Sentinel guards the Scrap Fortress in the Junkyard (with a
    crystal chest).
  - The Lunar Enforcer guards the Moon Temple in the Lantern Quarter (with
    the Ember Sigil and a crystal chest).
  - Briarstep Boots are in the park's Statue Garden, the Moon Lens on the
    Billboard Steps above Neon Square, and the Upgrade Crystal on the
    Lighthouse Pier.
- **Gates:**
  - The Ember Sigil opens the Crystal Citadel.
  - Briarstep Boots open the Junkyard.
  - The Moon Lens opens the park's lake-bridge shortcut into the Lantern
    Quarter.
  - Enemy zones (1–8) follow walking distance from the Afterlight Refuge.
  - Nexus Waypoints are at the Refuge and in Neon Square.
- **Retired for the city:** the old Crown Mainframe district, the diagonal
  roundabouts and the painted crossroads. That art stays in use in Elaris.
- **Old saves:** they keep the character, deck, levels, relics and boss kills;
  Neon Aftermath exploration restarts at the Refuge. Imports migrate the same
  way.
- **Map:** the exploration map shows the painted city seamlessly, without
  barricades or cross-fades.
- **Engine and fixes:**
  - The organic-path engine now supports whole-world maps, caches walkable
    spots per room, and keeps patrols at least 125 px from doors.
  - Bug fix: crossing between rooms of the same district now works anywhere
    along the seam, not only near the middle. This affected organic districts.
- **Tests:**
  - New: `tests/neon-world.test.cjs` (two-way doors, continuous streets,
    gates and progression, everything on the streets, the portal) and
    `tests/neon-world-migrate.test.cjs`.
  - The harness now loads the page scripts in page order and skips duplicate
    loads.
  - City room references in the older tests were moved to the new layout.

## Round 92: Neon Aftermath pathing playtest and fixes

A full pathing playtest of the painted city with the real controls (now
`tests/neon-world-pathing.test.cjs`). It walks across 1,600+ street crossings
and back, taps from every exit to every other exit, enemy, point of interest,
relic and chest, random-walks with keyboard and taps, and reaches every room
using exit labels alone.

**Fixed**
- **Junkyard sealed off:** the Scrap Fortress, Collapsed Freeway and Overpass
  Ramp couldn't be entered. The street joining them was traced narrower than
  the link threshold. Links are now found on the cleaned 8px mask (24px or
  wider).
- **Thorn Warden unreachable by tapping:** the road out of the Warden's Crown
  hugs the room edge. The walk mask now grows by one 8px cell, so narrow
  necks are passable and tappable.
- **Signal Tower unreachable by tapping:** a side street had two crossings
  into it but only one label. Each side now gets a label for every separate
  street crossing (150px+ apart), and labels follow the patch of street you're
  on. Exits you can't reach from where you stand aren't labelled.
- **Arrivals inside buildings:** landings within the 12px margin the movement
  clamps to pushed you into scenery. Landings now stay inside it, and a clamp
  that would put you on scenery is undone.
- **Sideways landings:** crossing could drop you a few streets over, so you
  couldn't walk straight back. Crossings now continue the same street. You
  enter right at the edge and walk in while it stays street, with only 12px
  of sideways slack. If the street doesn't carry on, there's no crossing.
- **Accidental crossings:** a tap-to-move route could stray over a room edge
  on its way somewhere. Routes now cross only at the end, through the exit
  they were sent to. Edge crossings also only fire while you're heading that
  way (no auto-bounce), which replaces the old 0.7s guard.
- **Traced artefacts:**
  - Water in the Crystal Citadel was traced as street; teal water is now
    excluded.
  - Thin park paths that touched only corner-to-corner are joined, since
    movement is axis by axis.
  - Small isolated scraps of street are removed.
  - The Neon Square plaza steps are joined to the tower plaza.
- **Spots you can't reach:** enemies, points of interest, relics, chests and
  the merchant are never placed on a patch of street with no exit of its own.
  You also never land on one.
- **Doors:** a door must be a spot you can stand on (14px from an edge) and
  must land you on a reachable street.
- **Tap-to-move:**
  - Painted and organic rooms use a finer 8px grid, aligned to the walk
    mask, so narrow streets route.
  - Routes try the other axis before giving up on a kerb corner.
  - Organic districts' internal seams are unaffected.

## Round 93: wider paths, interactables beside the paths

- **Wider paths (about 20%):** every walkable path grows by 10% of its local
  width on each side, capped at 28px a side (`tools/widen_paths.py`).
  - Neon Aftermath's painted city gains about 18% more walkable ground. The
    widening is done on the 4px trace before the game mask is built, in
    `tools/build_world_rooms.py`.
  - The five organic districts' masks (Emerald, Sunpetal, Foundry, Promenade,
    Stormglass) are widened the same way, gaining 17–23% more ground.
- **Interactables off the path:** chests, relics, points of interest, events,
  the Wandering Merchant and Nexus Waypoints in painted and organic rooms now
  stand beside the street rather than on it.
  - A spot is used when it is not walkable itself, the nearest street is
    12–28px away (aiming for 20px), and that street is one you can reach.
    Interaction radii are 38–48px, so you can always use the item.
  - Spots keep 90px clear of exit doors. Points of interest and the merchant
    also keep 150px from patrols. Chests keep clear of the room's relic and
    boss.
  - Tapping an item routes you to the street beside it.
  - Bosses and patrols still stand on the paths.
  - Code: `organicItemSpot()` in `organic-paths.js`; wrappers for `poiSpot`,
    `poiAt` and relics (applied on `configureRegion`) in `neon-world.js`.
- **Room links match where you can stand:** feet sit 22px below your position
  and movement is clamped to a 12px margin. That leaves a band at the top of
  each room, and the outermost column, where you can never stand.
  - The world generator now works out pockets and links on the cells you can
    actually stand on.
  - Before, a street that only joined up inside that band (a sliver at the
    top of Scrap Fortress) looked connected but wasn't.
  - One new real link: Ruined Tower Lot ↔ Collapsed Freeway. Relic gates and
    progression are unchanged.
- **Tests:**
  - New `tests/item-placement.test.cjs` checks every item in organic rooms
    across three seeds and three worlds: beside a reachable path, within
    reach, and tap-routable.
  - neon-world and exploration tests now expect items beside the street.
  - The pathing playtest only starts crossings from street you can reach.

## Round 94: refreshed card illustrations

- Integrated the new pixel-art card illustrations added to the repo: 27
  paintings, 512×512 WebP, in `assets/cards/level0`–`level3`.
  - Arc Jab, Breach Spike, Bulwark Bash, Chain Lightning and Overclock have
    all four levels.
  - Static Shield has levels 0, 2 and 3; Thornlash has 0, 1 and 2; Wildfire
    has level 1.
- `cardArtPath()` in `assets/cards.js` uses them in battles, the deck
  workshop and the compendium.
  - A level without its own painting borrows the nearest lower painted stage,
    or the first painted stage if there's none lower. Stats always follow the
    real level.
  - Every other card keeps its existing art.
- The card script's cache tag is bumped (`?v=art-refresh-27`) in `index.html`
  and `compendium.html`, so browsers fetch the new resolver.
- Brought over `assets/cards/art-refresh.md` (status and follow-up list) and
  `tools/art-refresh/` (prompts and packaging script).
- Left out:
  - `.DS_Store` files.
  - The duplicate `Cardbound/` and top-level `characters/`, `environment/`
    and `monsters/` folders. These are copies of files that already live
    under `assets/`.
  - A 500px `level2/stormglass.png`; the game keeps the 2048px `.jpeg`.
  - The older world/room data in `origin/main`, because Round 93's map is
    newer.
- New `tests/card-art.test.cjs` checks that all 51 cards × 4 levels resolve
  to an existing image and that the refreshed paintings are wired in.

## Round 95: cache tags and a small handoff bundle

- Every local script and stylesheet in `index.html`, and the compendium's
  game frame, now loads with `?v=round94`. Browsers (and GitHub Pages
  visitors) then fetch the new files instead of stale cached ones. This
  matches the cache-busting `origin/main` already used. Bump the tag when
  shipping a new round.
- Added `CLAUDE.md`, handoff notes that Claude reads automatically in new
  sessions.

## Round 96: tidy folders and set aside unused art

- claudebound is now the primary repo (see `CLAUDE.md`). Achubu/Cardbound is
  worked on by ChatGPT and is only a source of image assets.
- Deleted files the game never loads:
  - The nested `Cardbound/` copy of the project. It held older code, and
    images byte-identical to `assets/`.
  - Root-level duplicates of `assets/` content: `characters/`,
    `environment/`, `items/`, `monsters/`, and the `.js`/`.css` copies.
  - `.DS_Store` files.
  - `assets/environment/meadowrest.js`, which `index.html` no longer loads.
- Moved graphics the game no longer uses into `unused assets/`, keeping their
  old paths. `unused assets/README.md` lists what is there and why. Usage was
  checked against:
  - every literal path in the page code;
  - `cardArtPath()` for every card and level;
  - `talentArt()`;
  - the district paintings `JOINED_AREAS` actually uses;
  - `diagArtFor()` across every room in every region.
- Merged `assets/Talent Graphics/` into `assets/talents/`, so all talent art
  lives in one folder. Updated `talentArt()` and `talents.css`.
- `tests/area-art.test.cjs` now derives the district paintings to check from
  `JOINED_AREAS` instead of a fixed list that still named `burnout`.
- Cache tags bumped to `?v=round96`.
- Verified that the full test suite passes, and that a browser run through all
  four regions, every card's art, the talent art and the compendium makes no
  failed requests.

## Round 97: the game is now Aethercede

- Renamed Cardbound to Aethercede everywhere it appears:
  - page titles, the start screen, the main menu, the Battle Lab and the
    compendium;
  - credits, docs and the art-generation prompts.
- The GitHub repo name `achubu/Cardbound` and its Pages URL are left as they
  are, because they name the real repository. Earlier CHANGES.md entries are
  history and keep the old name.
- localStorage keys moved from `cardbound-` to `aethercede-`. New
  `assets/save-migration.js` runs first in `index.html` and `arena.html`. It
  copies every old key to its new name once, never overwriting a new key, so
  these carry over:
  - adventure saves;
  - shared upgrade materials;
  - Battle Lab progress;
  - map zoom and the touch-mode setting.
- Exported save files now use format `aethercede-save`. Import still accepts
  older `cardbound-save` files.
- Test harness env var `CARDBOUND_RENDER` is now `AETHERCEDE_RENDER`.
- Removed a stray tracked `tools/__pycache__` file.
- New `tests/save-migration.test.cjs`. Cache tags bumped to `?v=round97`.


## Round 98: hidden Upgrade Crystal moved to mid-map

- The hidden Upgrade Crystal in Neon Aftermath moved from Lighthouse Pier
  (`2,4`), two rooms from the start, to Broadcast Row (`5,6`).
  - Broadcast Row sits in the central row, at the east edge of the open city.
  - It is next to the Moon Temple and the Ember Sigil gate into the sealed
    Citadel/Junkyard half, where the final boss waits.
  - It is still reachable without any relic.
- It sits at (444, 254), just off the street, and the `organicItemSpot()`
  placement check confirms that spot is beside the street.
- `tools/build_world_rooms.py` now places it there too, so a map rebuild
  keeps the new spot.
- The objective hint now points to Broadcast Row instead of the old "Memory
  Annex" name.
- `tests/neon-world.test.cjs` asserts there is exactly one hidden crystal, on
  `5,6`, reachable from the start with no relics.
- Cache tags bumped to `?v=round98`.

## Round 99: live site link

- Merged `main`'s new `CNAME` (`aethercede.com`). The README's live-build
  link now points to https://aethercede.com/ instead of the old Cardbound
  Pages URL.
- The only remaining `cardbound` strings are intentional:
  - the save migration, which reads old `cardbound-` storage keys;
  - import of old `cardbound-save` files;
  - the `achubu/Cardbound` repo name;
  - CHANGES.md history.

## Round 100: Neon Aftermath rooms painted one image each (first 12)

- Neon Aftermath is being repainted one room per image, so each room gets about
  three times the detail of a 3×3-room district painting.
  - Rooms with their own painting live in `assets/environment/rooms/room-X-Y.webp`.
  - The first 12: the whole top row (`0,4`–`8,4`) and the three harbor rooms
    `0,5`, `1,5` and `2,5`.
  - Every other room keeps its slice of the old district painting until it is
    repainted.
- `paintNeonWorld()` draws a room's own painting onto a full-resolution canvas
  (2000×1250, still shown at 800×500 by CSS), so it stays sharp when scaled up
  on large and high-DPI screens.
- New `tools/build_room_masks.py`:
  - traces each room image's pale teal streets (plus crosswalk and lane paint);
  - joins pieces split by a short straight gap, such as the Spire Gate arch and
    tower or the Warden's Crown crosswalk;
  - keeps only street that reaches the room's exits;
  - writes the result into the world walk mask and the `NEON_ROOM_ART` list in
    `assets/neon-world.js`.
  - Re-run it after adding room images.
- Looser crossings (`neonLoose()` / `neonLandingFrom()`):
  - Separately painted rooms don't line their streets up exactly with their
    neighbours.
  - Between two rooms where either has its own painting, any street reaching
    the shared edge is a door, and you arrive on the nearest street along the
    far edge.
  - Old district rooms keep the strict street-to-street rule, so their painted
    dead ends stay closed.
- Mask cells straddling a room boundary: rooms are 500px tall but mask cells
  are 8px. Lookups inside a room now never read past the room's own last full
  cell, so a room's bottom edge no longer reads the street of the room below.
- Points of interest keep the base rule of standing 150px clear of patrols.
  The 100px fallback is gone, and a room with no such spot gets none.
- New `tests/room-art.test.cjs` checks every painted room:
  - its image exists;
  - its exits have usable doors;
  - crossings land on a street, both ways;
  - it is drawn at full resolution.
- `tests/neon-world.test.cjs` now checks landings with `neonLandingFrom()`.
- Cache tags bumped to `?v=round100`.

## Round 101: small chests and objects on their own spots off the road

- Chests, relics and every point of interest are now small markers, about a
  third of their old size. That includes data terminals, shrines, campfires,
  caches, events, the merchant and Nexus Waypoints. Labels are 9px.
  - Chests: 20px.
  - Points of interest: 20px.
  - Relics: 24px.
  - Hidden crystal: 14×18.
- In painted Neon Aftermath rooms they stand on hand-checked open ground off
  the road (`NOOKS` in `tools/build_room_masks.py`, written to `NEON_NOOKS`).
  - Spots were found by growing outline-free ground out from the road edge,
    since buildings and props in the pixel art have dark outlines.
  - Every spot was then checked by eye. Spots on roofs, props, rails or
    container stacks were dropped, as were any closer than 30px to the road.
  - The three Citadel rooms' spots were picked by hand on their paved
    courtyards.
- Each spot has its own footpath from the street:
  - baked into the walk mask, starting 12px inside the road;
  - ending 16px short of the object's base, so you stand in front of it;
  - drawn as a faint dotted trail over the painting.
- Order per room: relic first, then chest, then the room's point of interest.
  A point of interest moves on to a later spot to stay 150px clear of patrols.
  The start waypoint and the Moon Lens use spots too.
- `tests/room-art.test.cjs` now also checks every spot:
  - it is off the road;
  - it is not walkable itself;
  - it is within reach of its path;
  - it is reachable.
  It also checks that the points of interest, the relic and the waypoint use
  spots, and that the markers are small.
- Cache tags bumped to `?v=round101`.

## Round 102: the Neon Aftermath map is drawn from the streets

- The exploration map (M) no longer pastes room paintings together, because
  separately painted rooms don't line up as one picture. Each explored Neon
  Aftermath room is drawn from the walk mask instead (`mapPathTile()` in
  `assets/map-terrain.js`):
  - a dark street surface with a one-cell neon rim and a soft glow;
  - set on dark ground with faint city blocks.
- The mask is one continuous world, so streets run cleanly from room to room.
- Other worlds keep their art-based map.
- Cache tags bumped to `?v=round102`.

## Round 103: new Sunken Warehouses painting

- Room `2,5` (Sunken Warehouses) is repainted with a fountain roundabout, a
  quay and the city edge. The fountain island is part of the walkable plaza.
- Its item spot moved to the open quay paving beside the crane, (250, 233).
- Cache tags bumped to `?v=round103`.

## Round 104: relaxed pathing in Neon Aftermath

- Playtest finding: you could only walk on the painted asphalt, so sidewalks,
  kerbs and plaza edges blocked you. On touch, any tap within 170px of a side
  edge or 110px of the top/bottom (plus the outer 20% of the screen) was taken
  as "leave the room", which made roads near the edges hard to use.
- Streets are widened by `NEON_RELAX` = 2 mask cells (16px) on every side, at
  load time in `assets/neon-world.js`.
  - This covers sidewalks, kerbs, plaza edges and narrow necks.
  - Widening happens only inside each room, never across a room boundary, and
    not in the outer 16px band of a room, so the crossings between rooms are
    exactly as before.
  - Object spots stay off the path.
- Touch controls (`assets/touch-controls.js`):
  - Only a tap within 44px (sides) or 34px (top/bottom) of an edge, or the outer
    5% of the screen, means "exit".
  - Exits, from a tap at an edge or on an exit sign, head for the street that
    actually leaves on that side (`organicDoor`), not the middle of the edge.
  - A tap on a spot that can't be reached walks you to the closest reachable
    spot within 90px, instead of "Tap an open path nearby".
  - The bottom hint bar no longer swallows taps (`pointer-events:none`).
- Playtested in the browser across all 12 painted rooms:
  - keyboard movement in four directions;
  - tap-to-move to 12 street points per room (all reached, apart from taps right
    at an exit, which correctly take you through);
  - walking by exit signs from the start through the harbor.
- The pathing playtest test passes.
- New checks in `tests/room-art.test.cjs`.
- Cache tags bumped to `?v=round104`.

## Round 105: map connections always line up

- On the exploration map, every Neon Aftermath room's streets are trimmed back
  32px from its edges.
- Each real exit is redrawn as one connector (`mapSeam()`):
  - Both rooms compute it from the same shared-edge data, so the two halves
    meet at the same point and width.
  - Further crossings on the same edge are kept only where the two rooms'
    streets really meet (within 70px).
- Street stubs that reach an edge with no exit, or with no partner across it,
  are cut from the map. Gameplay pathing is unchanged.
- Cache tags bumped to `?v=round105`.
- Follow-up: connectors attach only to street patches of at least 120 mask
  cells, so a thin sliver next to an edge can't capture a crossing. Smaller
  patches are cut from the map. This fixes Lantern Market → Neon Arcade, which
  had hooked onto an isolated sliver at the top of Neon Arcade.

## Round 106: Holo Stage painting

- Room `5,5` (Holo Stage) has its own painting: a four-way crossroads with the
  hologram stage. That makes 13 painted rooms.
- Its item spot is in the open plaza in front of the stage, (118, 128).
- Cache tags bumped to `?v=round106`.

## Round 107: Fountain Row painting

- Room `1,6` (Fountain Row) has its own painting: a four-way crossroads with a
  paved fountain plaza, which is walkable. That makes 14 painted rooms.
- Its item spot is beside the scrap pile in the dock yard, (560, 420).
  Candidate spots on rooftops and planters were rejected.
- Cache tags bumped to `?v=round107`.

## Round 108: Neon Square painting

- Room `4,5` (Neon Square) has its own painting: a T-junction lined with
  shops. That makes 15 painted rooms.
- Its sidewalks are walkable, so the only open ground off the path is a
  storefront alcove between a kiosk and the planters, (236, 120).
  - That spot holds the room's point of interest, including Neon Aftermath's
    second Nexus Waypoint.
  - Spots on café umbrellas and shop signs were rejected.
- A Nexus Waypoint now always takes its spot, even with a patrol within 150px
  (it is not a fight). Before, it fell back to the middle of the road.
- Cache tags bumped to `?v=round108`.

## Round 109: Harbor Gardens painting

- Room `0,6` (Harbor Gardens) has its own painting: a bend in the harbor road
  with the lighthouse and piers. That makes 16 painted rooms.
- Streets reach its top and right exits. The street stub at the bottom edge
  is a painted dead end.
- Its item spot is on the concrete quay beside the crane, (330, 200).
  Candidates in the water, on a container, or with a footpath across props
  were rejected.
- Cache tags bumped to `?v=round109`.

## Round 110: Amethyst Causeway painting

- Room `6,5` (Amethyst Causeway) has its own painting: a T-junction among the
  Citadel waterfalls. That makes 17 painted rooms.
- Streets reach its exits on the top, bottom and left (the east side has no
  exit).
- Its item spot is on open stone ground by the south gate, (520, 440).
- Cache tags bumped to `?v=round110`.

## Round 111: Citadel Heart and Prism Steps paintings

- Room `7,5` (Citadel Heart) has its own painting: a gothic-arched avenue with
  a castle row on the east side. Streets reach its exits on the top, bottom
  and right.
- Room `8,5` (Prism Steps) has its own painting: a crossroads among crystal
  spires and falls. Streets reach its exits on the top, bottom and left.
- That makes 19 painted rooms.
- Item spots:
  - `7,5`: the terrace by the chapel door, (300, 240).
  - `8,5`: the stone plaza in front of the twin falls, (590, 175).
  - Candidates in a fenced pool and on rooftops were rejected.
- Cache tags bumped to `?v=round111`.

## Round 112: Neon Arcade painting

- Room `3,5` (Neon Arcade) has its own painting: an arcade street with a side
  road east. Streets reach its exits on the top, bottom and right.
- That makes 20 painted rooms, and the top two rows are complete.
- Its item spot is on the shopfront pavement beside an arcade cabinet,
  (300, 395). A candidate on a vending machine was rejected.
- Cache tags bumped to `?v=round112`.

## Round 113: Tidewall Street painting

- Room `2,6` (Tidewall Street) has its own painting: a harbor-side bend with
  warehouses and piers. Streets reach its exits on the top and left.
- That makes 21 painted rooms.
- No item spot yet: from here on, rooms go in first and their spots are
  picked in one pass once every room is painted. Until then chests and relics
  use the automatic placement beside the road.
- Cache tags bumped to `?v=round113`.

## Round 114: the rest of row 6 painted

- Rooms `3,6` Canal Walk, `4,6` Glowstep Lane, `5,6` Broadcast Row,
  `6,6` Shattered Aqueduct, `7,6` Violet Crossing and `8,6` Crystal Falls have
  their own paintings. That makes 27 painted rooms: rows 4, 5 and 6 are
  complete.
- `tools/build_room_masks.py` gained `extend_to_edges()`. Some paintings have a
  dark border strip (10px in Glowstep Lane, 60px in Violet Crossing), so a
  street stopped just short of its exit edge. Any street within 80px of an exit
  side with no street at the edge is now carried straight out to it.
- No item spots for these rooms yet. Spots for every room are picked in one
  pass once all rooms are painted.
- Cache tags bumped to `?v=round114`.

## Round 115: row 7 west half painted

- Rooms `0,7` Bandstand Ruins, `1,7` Blossom Grove, `2,7` Carousel Green,
  `3,7` Pagoda Court and `4,7` Dragon Gate have their own paintings. Each
  reaches all of its exits.
- That makes 32 painted rooms.
- The tracer also picks up the paved park footpaths in these garden rooms, so
  they are walkable, in line with the relaxed pathing.
- No item spots yet; they will be picked once all rooms are painted.
- Cache tags bumped to `?v=round115`.

## Round 116: Moon Temple and Scrapyard Gate painted

- Room `5,7` Moon Temple has its own painting: a wide temple plaza, which gives
  room for the boss fight and holds the Ember Sigil relic and a chest. Streets
  reach its exits on the left and bottom.
- Room `6,7` Scrapyard Gate has its own painting: the junkyard entrance.
  Streets reach its exits on the right and bottom. The street stub at the top
  edge is a painted dead end.
- That makes 34 painted rooms.
- Re-uploaded `2,7`, `3,7` and `4,7` were byte-identical to the earlier files,
  so nothing changed for them.
- Item spots (including the Ember Sigil and the chest) will be picked once all
  rooms are painted. Until then they use the automatic placement beside the
  road.
- Cache tags bumped to `?v=round116`.
- `tests/rebalance.test.cjs`: the Elaris chest check reused the city chest's
  position, which now depends on Moon Temple's painting. It now checks Elaris
  rooms at the default chest spot (330, 180).

## Round 117: Parking Garage and Overpass Ramp painted

- Room `7,7` Parking Garage has its own painting. Streets reach its exits on
  the top and left. The top exit still needs the Ember Sigil.
- Room `8,7` Overpass Ramp has its own painting. Its street reaches its bottom
  exit. The overpass stubs at the top and right edges are painted dead ends.
- Row 7 is complete; that makes 36 painted rooms.
- Cache tags bumped to `?v=round117`.

## Round 118: row 8 west third painted

- Rooms `0,8` Willow Paths, `1,8` Old Oak Lawn and `2,8` Lake Bridge have their
  own park paintings. Each reaches all of its exits. Lake Bridge's east exit
  still needs the Moon Lens.
- That makes 39 painted rooms.
- Re-uploaded `2,6` and `8,7` were identical to the files already in, so
  nothing changed for them.
- Cache tags bumped to `?v=round118`.

## Round 119: new Willow Paths painting (room 0,8)

- Replaced `assets/environment/rooms/room-0-8.webp` with the owner's new Willow Paths
  painting. Its streets reach the top, right and bottom exits, so all three crossings work.
- Re-ran `tools/build_room_masks.py`. Still 39 painted rooms.
- No item spots for this room yet. Per the owner, spots are picked in one pass once every
  room image is in place.

## Round 120: rooms 3,8 to 7,8 painted (Koi Garden, Lantern Street, Noodle Row, Faded Lots, Ruined Tower Lot)

- Wired in five new room paintings in row 8. The streets in each one reach every exit the
  room needs (3,8 / 4,8 / 5,8: all four; 6,8: top, bottom, left; 7,8: right and bottom).
- Re-ran `tools/build_room_masks.py`. 44 painted rooms.
- The room-art test's "old rooms stay strict" pair moves to 3,9 / 4,9, which are still unpainted.
- No item spots for these rooms yet, per the owner's hold until every room is in.

## Round 121: rooms 8,8, 0,9 and 1,9 painted (Collapsed Freeway, Statue Garden, row 9)

- Wired in three new room paintings. Their streets reach every exit the room needs
  (8,8: top, bottom, left; 0,9: top and right; 1,9: top, left, right).
- The 3,5 and 1,6 uploads in the same batch match the paintings already in the game, so
  those files are unchanged.
- Re-ran `tools/build_room_masks.py`. 47 painted rooms.
- No item spots for the new rooms yet, per the owner's hold until every room is in.

## Round 122: rooms without item spots fall back to beside-the-street placement

- `neonNooks()` now treats a painted room with an empty spot list as having no spots. Before,
  the Koi Garden (3,8) Nexus Waypoint stood in the middle of the crossroads. That broke the
  neon-world, item-placement and exploration tests. Those rooms' points of interest, chests and
  relics now use `organicItemSpot` beside the street until their spots are picked.

## Round 123: market card upgrades cost three times as much

- The Wandering Merchant's card upgrades now cost ◇ 36 to level 1, ◇ 60 to level 2 and ◇ 90 to
  level 3 (were 12 / 20 / 30), at the owner's request. The merchant's listing and the upgrade
  menu show the new prices. Nothing else in the shop changes.
- `tests/exploration.test.cjs` checks the new prices and the purchase amounts.

## Round 124: the minimap looks like the large map

- The minimap now draws the same terrain as the exploration map: the stylized neon streets
  (or each world's room art), the fog and survey grid, the ragged frontier and the gold frame
  on your room. It is framed on the rooms around you (one room out, clamped to the world).
- `drawMapTerrain(canvas, tileW, bounds)` takes optional bounds. `renderMinimap` is wrapped in
  `assets/map-terrain.js`, and redraws only when the room or the explored set changes.
- `tests/map-terrain.test.cjs` checks the minimap framing and size.

## Round 125: victory loot shows as pictures

- Every piece of loot on the victory screen now has a graphic, not just a line of text
  (end of `assets/pickups.js`):
  - Cards won in the fight show as cards. That includes the covenant cards, boss Soulbound
    cards and a side deck card offered alongside a card choice.
  - Crystals keep their existing art.
  - Potions, Shards, completed bounties, Vigil healing, XP, level-ups, new side deck slots and
    an empty chest each get a small illustrated tile (inline SVG; the empty chest uses the
    loot-chest image, greyed).
- The text lines those tiles replace are removed. Story lines (a portal opening) and missed
  bounties stay as text.
- `winBattle` records the cards each win adds (`b.newCards`).
- New `tests/loot-art.test.cjs` checks which lines become tiles and that won cards are tracked.

## Round 126: talents use a fixed ×1.4, no world scaling

- `talentScale()` is now a flat 1.4 in every world. It was ×1, ×1.3, ×1.6 and ×1.9 for Neon
  Aftermath, Elaris, Vespera and Chronospire.
- Affects the talents that used it, rounded per rank total: Reactive Plating, Bulwark Doctrine,
  Retaliation Coil, Siphon Edge, Counter Weave, Reflux, and Weaken strength (Deep Interference).
- Talent descriptions say "Boosted ×1.4" instead of the per-world multipliers.
- Tests updated: round76, chronospire, talent-matrix, card-variety, plating-armor.

## Round 127: objects standing on a road count as road

- `tools/build_room_masks.py` has a new `fill_road_objects` step. Along every row and column,
  a gap of up to 170px between two stretches of wide street (at least 50px across) is filled
  in, so a gate arch, a bridge, a fountain or debris lying across a street no longer blocks the
  way. Alleys and paths between buildings are too narrow to count, so buildings stay blocked.
  Thin slivers along kerbs and walls are dropped.
- Prime example: the Dragon Gate (4,7) arch is now walked straight through. The fountain plaza
  in Fountain Row (1,6) and debris on the Collapsed Freeway (8,8) also open up.
- Re-ran the tool. `tests/room-art.test.cjs` checks the Dragon Gate.

## Round 128: smaller hero

- The main character is drawn 20% smaller in the world (`#player .hero-sprite` scaled to 0.8,
  from the feet, so they still stand where the game puts them). The breathing animation keeps
  the smaller size, and the ground shadow is narrower to match. Movement and hit areas are
  unchanged.

## Round 129: tap a card's copy count to see every copy

- In the Deck Workshop, the ×N count on a card is now a button. It opens a window listing every
  copy of that card (Soulbound and Impermanent, all levels). Each copy shows its art, type,
  level, a mastery bar with uses so far, and whether it is in the active deck.
- Each copy has its own buttons: put in deck / remove from deck (same deck size, copy limit and
  minimum rules as before) and Upgrade · 1 crystal for a mastered Soulbound copy. Impermanent
  copies show "Upgrades itself".
- The count also appears on a single tile when other copies of the card exist at another level.
- New helpers in `index.html`: `cardCopies`, `addCopyToDeck`, `removeCopyFromDeck`,
  `upgradeCopy`, `showCardCopies`. New `tests/card-copies.test.cjs`.

## Round 130: 30% fewer card drops

- Loot chests now hold a card choice 28% of the time (was 40%). The 12 points go to healing
  potions (35% to 47%). Soulbound jackpot, Upgrade Crystal and empty-chest odds are unchanged.
- Elites used to turn every potion or empty chest into a card choice. Now they do it 70% of the
  time (`ELITE_CARD_ODDS`), so their card drops are also cut by 30%.
- Boss, mini-boss, covenant and side deck card drops are unchanged.
- `tests/rebalance.test.cjs` checks the new 72% boundary and the elite odds.

## Round 131: new Sunken Warehouses (2,5) and Neon Square (4,5) paintings

- Replaced both room images with the owner's new versions. Sunken Warehouses' street reaches
  top and bottom; Neon Square's reaches left, right and bottom, as each room needs.
- Their old item spots (picked for the old paintings) are removed. Those rooms' points of
  interest, chests and relics fall back to beside-the-street placement until the item-spot pass
  once every room is in.
- Re-ran `tools/build_room_masks.py`. Still 47 painted rooms.

## Round 132: the last seven rooms are painted (row 9), all 54 done

- Wired in Fountain Circle (2,9), Jade Alley (3,9), Paper Lantern Way (4,9), Red Lantern
  Market (5,9), Tire Mountains (6,9), South Lot (7,9) and Scrap Fortress (8,9). Every street
  reaches the exits its room needs.
- Every Neon Aftermath room now has its own painting, so every crossing uses the loose rule.
  The room-art test's "old rooms stay strict" check is now "all 54 rooms are painted".
- Re-ran `tools/build_room_masks.py`. Next: the item-spot pass for the rooms that have none.

## Round 133: item spots for every painted room

- With all 54 rooms painted, every room painted after Round 101 now has hand-checked item spots
  (`NOOKS` in `tools/build_room_masks.py`): 35 rooms, 101 spots in all.
- Candidates were traced automatically (open ground 40-85px from the street, away from water,
  low texture), then checked by eye on each painting. Spots sit on open ground (dirt, grass,
  sidewalks, docks, parking lots), never on roofs, statues, benches, stalls or water. Three
  hand-placed spots on paving that counts as road were swapped out.
- The Briarstep Boots relic in Statue Garden (0,9) now stands at the boots cave in the painting.
- Broadcast Row (5,6) has no open ground beside its street, so it keeps beside-the-street
  placement.
- `tests/room-art.test.cjs` now expects 100+ spots and that only 5,6 has none. Every spot passes
  the existing checks: off the path, its own footpath, reachable.

## Round 134: side deck on the left of the hand

- In battle, the side deck column now sits on the left of your hand instead of the right
  (`row.prepend(col)` in `assets/aether-deck.js`), on desktop and phone.
- `tests/aether-deck.test.cjs` checks the order.

## Round 135: new Holo Stage painting (room 5,5)

- Replaced the Holo Stage image with the owner's new version (concert stage in the south-west
  block). The crossroads reaches all four exits.
- New item spots on open ground in the concert lot, (268, 318) and (255, 440), replacing the
  spot picked for the old painting.
- Re-ran `tools/build_room_masks.py`.

## Round 136: first-world unlock items are visible while guarded

Playtest of Neon Aftermath's three relics (Moon Lens 5,4; Ember Sigil 5,7; Briarstep Boots 0,9):
- All three relic rooms are reachable from the start, you can stand next to each relic, each is
  collected once its room is cleared, and the six locked doors open with their relic. With all
  three, every one of the 54 rooms is reachable.
- The problem: a relic stayed invisible until every enemy in its room was beaten, and nothing
  said so. Now a guarded relic is always shown, dimmed with a 🔒, and walking up to it says how
  many enemies are left ("Briarstep Boots is guarded. Defeat the 2 enemies in this area to claim
  it."). Picking it up still needs the room cleared (end of `assets/pickups.js`).
- The objective hints name the exact rooms and say to beat the guards (Moon Temple, Statue
  Garden in the south-west of the park, Billboard Steps above the Holo Stage).
- New `tests/relic-quest.test.cjs` plays the whole chain.

## Round 137: painted sprites for points of interest

- Five new owner sprites (Gemini, magenta background keyed out, cropped, 256px WebP with alpha)
  in `assets/items/poi/`: Nexus Waypoint, Data Terminal, Sealed Cache, Supply Cache, Aether
  Shrine.
- In the world they replace the round emoji badges: 44px, standing on their spot (anchored near
  the bottom), name label below, greyed out once used (end of `assets/pickups.js`).
- The Data Terminal sprite is used for Neon Aftermath's lore points only; Elaris and Vespera
  lore stones, the campfire and the merchant keep their badges until they get art.
- New `tests/poi-art.test.cjs`.

## Round 138: merchant, campfire and event sprites; Elaris map chest

- Three more owner sprites in `assets/items/poi/` (magenta keyed out, cropped, 256px WebP):
  Wandering Merchant, Campfire and the event marker (glowing "?" beacon). They replace those
  emoji badges in every world.
- Map chests in Elaris now use the new `elaris-chest.webp`. Map chests in the other worlds keep
  the original `assets/items/loot-chest.png`, and the loot chest shown after a battle is
  unchanged.
- `tests/poi-art.test.cjs` covers the new sprites and the Elaris chest.

## Round 139: Neon Aftermath 10% harder

- New `BALANCE.difficulty` knob (per world, applied last in `enemyStats`). Neon Aftermath is set
  to 1.1: every enemy there (regulars, elites, mini-bosses and the Thorn Warden) has 10% more
  health and 10% more attack, rounded. Other worlds stay at 1.
- Examples: Emberling 36/7 → 40/8, Moon Knight 73/13 → 80/14, Thorn Warden 149/17 → 164/19.

## Round 140: Upgrade Crystals 1%, card choices 25%

- Loot chest after a fight: Soulbound card 1% (unchanged), Upgrade Crystal 1% (was 4%), empty
  20% (unchanged), healing potion 53% (was 47%), card choice 25% (was 28%).
- Mini-bosses still always drop one Upgrade Crystal; elites still turn a potion or empty chest
  into a card choice 70% of the time.
- `tests/rebalance.test.cjs` checks the new boundaries.

## Round 141: destroying a card gives Shards

- Destroying an Impermanent card in the Deck Workshop now salvages Shards (◇):
  5 × (level + 1), so Level 0 → 5, Level 1 → 10, Level 2 → 15, Level 3 → 20
  (`destroySalvage` in `index.html`). The button shows the amount ("Destroy card · +◇ 15") and
  a message confirms it. Soulbound cards still can't be destroyed.
- `tests/card-copies.test.cjs` checks the amounts. (First pushed as Upgrade Crystals; the owner meant Shards.)

## Round 142: destroy salvage by level

- Destroying a card now gives ◇ 5 / 20 / 50 / 100 Shards for Level 0 / 1 / 2 / 3
  (`DESTROY_SHARDS` in `index.html`), replacing Round 141's 5 per level.

## Round 143: bigger Wandering Merchant

- The merchant sprite is drawn at 72px (other points of interest stay 44px) with a warm glow
  so it stands out; its name label sits below it. `tests/poi-art.test.cjs` checks the size.

## Round 144: choose your side card at the merchant (◇ 100)

- The merchant's side deck card now costs ◇ 100 (was 10) and is no longer random: "Buy Side
  deck card" opens a picker with every side card available in this world (as cards, with how
  many you already own). Picking one pays and adds it; still one per merchant visit.
- `buySideCard` / `openSidePicker` in `assets/exploration.js`; `tests/exploration.test.cjs`
  covers the price, the free picker, getting the chosen card and the once-per-visit limit.

## Round 145: Aetherlink crystals 20% rarer

- Elites now drop an Aetherlink crystal 6.4% of the time (was 8%), as `ELITE_AETHERLINK_ODDS`
  in `assets/expansion.js`. Type (Capacity / Assault / Aegis) and rarity odds (80 / 17 / 3%)
  are unchanged. `tests/rebalance.test.cjs` checks the value.

## Round 146: points of interest show what you got

- Using a point of interest that gives you something now opens an "Acquired" window with
  pictures instead of only a passing message: side cards and cards as cards, plus Shards,
  potion, healing and blessing tiles (end of `assets/pickups.js`). Covers the Data Terminal
  (its +2 Shards, and on the fifth terminal the +15 Shards and side card that weren't shown
  before), supply and sealed caches, events, campfire rests and shrines. The merchant keeps
  its own screens.
- New `tests/poi-rewards.test.cjs`.

## Round 147: Aetherlink gauntlet art

- The owner's gauntlet painting (magenta keyed out, the purple glow kept as a soft halo) is in
  `assets/items/aetherlink-gauntlet.webp` and shown at the top of the Aetherlink screen.
- Its five painted sockets show the game state: each slotted crystal is drawn in its socket
  with a rarity glow, open sockets stay empty, and sockets not yet unlocked are dimmed with a
  lock; hovering a socket names it (`gauntletHTML` in `assets/pickups.js`).
- The screen's drop-rate note now reads the real elite odds (6.4%) instead of a fixed "8%".
- `tests/poi-art.test.cjs` checks the five sockets, a slotted crystal and the locks.

## Round 148: the Aetherlink interface on the new gauntlet screen

- New owner gauntlet painting (`assets/items/aetherlink-gauntlet.webp`, from the clean
  "blankaetherlink" version, magenta keyed out) replaces Round 147's.
- The real Aetherlink socket panels are drawn on its screen (`GAUNTLET_SCREEN` in
  `assets/pickups.js`): five sockets side by side, each with its crystal, name, effect and
  crystal picker, or its unlock level. Text is sized to the gauntlet (container units) and
  checked to fit at desktop and tablet widths.
- On narrow screens each socket shows just its number and crystal; tapping a socket opens the
  crystal picker. Names and effects are still listed in the collection below.
- `tests/poi-art.test.cjs` checks the screen position and that the panels move onto it.

## Round 149: world 2 becomes Solaris (work in progress)

- World 2 (region id still `elaris`, so saves carry over; the name "Elaris" is kept for a
  later world) is now **Solaris**, a sun-scorched desert city on a 9×6, 54-room grid: Neon
  Aftermath's layout mirrored top-to-bottom, start at 0,0 (Dawnfire Gate), mini-bosses at 5,2
  (Temple of the Noon Bell) and 8,0 (Mirror Fortress), the Bloom Tyrant at 8,5 (The Solar
  Crown). Levels 10-17 by distance from the start, 18 for the boss room.
- Rooms are painted from a small kit of flippable tiles: `tools/build_solaris.py` picks a tile
  and a flip for every room (neighbours get different variants), traces the streets once per
  tile and writes the world walk mask, plan and layout to `assets/solaris-data.js`.
  `assets/solaris.js` draws the flipped tile and plugs the mask into the painted-world engine
  (loose crossings, stylized map).
- Owner tiles so far (`assets/environment/solaris/src/`): corner-a, corner-b, t-bottom-a,
  t-bottom-b, t-right-a. Placeholders cut from them stand in for the crossroads, straight
  road and both dead ends until those are painted.
- Old saves standing in an Elaris room resume at Dawnfire Gate. Visible "Elaris" text now
  says "Solaris".

## Round 150: killing blows through enemy Block, Frail and Barrier land

- Bug (owner report): "Bulwark Bash · 31 damage − 5 block = 1 dealt" and "30 damage − 5 block
  = 6 dealt · Frail: −2". When a hit took the enemy to 0 HP, enemy Block, Frail and Barrier
  were subtracted from the HP the enemy had left instead of from the whole hit, so a hit
  that should have killed left the enemy alive with a few HP.
- The base card effect now records the full hit (`b._hitTotal`); the Block wrapper
  (`encounter-depth.js`) and the Frail/Barrier wrapper (`aether-deck.js`) work from the full
  hit on a killing blow and set the enemy's HP once at the end. Hits that don't kill are
  unchanged.
- `tests/card-variety.test.cjs` covers kills and non-kills with Block, Frail and Barrier.

## Round 151: Solaris portal art; smaller, glowing portals

- New owner painting `assets/environment/solaris-portal.webp` (magenta keyed out by flood fill
  from the edges, so the neon signs inside the arch survive): a sandstone sun-gate with the
  neon city inside. It replaces the old forest portal for the Solaris portal that leads back
  to Neon Aftermath (`assets/solaris.js`).
- Every portal is drawn at half its old size (48×72, the sun-gate 59×79) and pulses with a
  soft glow (cyan; gold and cyan for the sun-gate). Reduced-motion players get a steady glow.
- `tests/poi-art.test.cjs` checks the art and sizes.

## Round 152: make a card Soulbound for 500 Shards

- Impermanent cards get a "Make Soulbound · ◇ 500" button in the Deck Workshop (it binds the
  most-used copy in the stack) and on each copy in the all-copies window. The card keeps its
  level and mastery uses; from then on it is protected and levels up the Soulbound way
  (mastery plus an Upgrade Crystal). `soulbindCard` / `SOULBIND_COST` in `index.html`.
- `tests/card-copies.test.cjs` checks the price, the kept level and uses, and that it binds once.

## Round 153: the Cardsmith

- Every world now has a **Cardsmith** (⚒) in its start room, beside the Nexus Waypoint
  (`assets/cardsmith.js`). Walk up to it to:
  - upgrade an Impermanent card by one level (◇ 36 / 60 / 90, same prices as the merchant);
  - make an Impermanent card Soulbound (◇ 500; it keeps its level and mastery).
- The "Make Soulbound" buttons added to the Deck Workshop in Round 152 moved to the Cardsmith.
  The merchant still sells card upgrades too.
- New `tests/cardsmith.test.cjs`. CLAUDE.md now lists `solaris` and `cardsmith` in the script
  order and notes that `elaris` is shown as Solaris.

## Round 154: Solaris sprites for the merchant, Cardsmith, Sun Dials and chests

- Four owner sprites (magenta keyed out by flood fill from the edges, plus enclosed pockets of
  the background colour, e.g. under the awnings) in `assets/items/poi/`: `sol-merchant`,
  `sol-cardsmith`, `sol-sundial`, `sol-chest`.
- In Solaris they replace the merchant, the ⚒ Cardsmith badge, the ☀ Sun Dial badge and the
  forest chest on the map (end of `assets/cardsmith.js`). Other worlds keep their own art.
- `tests/cardsmith.test.cjs` checks the files and that they are used in Solaris only.

## Round 155: city portal into Solaris

- New owner painting `assets/environment/city-solaris-portal.webp`: a steel-and-neon gate with
  the sunlit desert city inside. It replaces the old forest portal for the Neon Aftermath
  portal into Solaris (Warden's Crown), half size with the cyan pulsing glow
  (`assets/solaris.js`). `tests/poi-art.test.cjs` checks it.

## Round 156: the Cardsmith moves to the middle of each world

- The Cardsmith now stands in the room of each world's middle Nexus Waypoint instead of the
  start room: Neon Square (city), Brass Yards (Solaris), Glasswind Reach (Vespera), Hourglass
  Hall (Chronospire), about halfway in. Its spot keeps clear of the waypoint and the room's
  patrols. `tests/cardsmith.test.cjs` checks the room and the clearance.

## Round 157: lore points hold 15 Shards

- Each lore point (Data Terminal in Neon Aftermath, Sun Dial in Solaris, Storm Glyph in
  Vespera, and Chronospire's) now gives ◇ 15 Shards when read, up from 2 (`LORE_SHARDS` in
  `assets/exploration.js`). Reading all five in a world still adds ◇ 15 and a side card.
- `tests/exploration.test.cjs` checks the new total.

## Round 158: caches hold more Shards

- Supply caches now give ◇ 15 Shards (was 3-6; the 25% chance of a potion is unchanged).
- Sealed caches now give ◇ 25 on a good pry (was 9); the other 50% still shocks you for 15%
  of your max HP. They stay worth more than a supply cache because of that risk.
- `CACHE_SHARDS` / `SEALED_SHARDS` in `assets/exploration.js`; `tests/exploration.test.cjs`
  checks both.

## Round 159: side deck cards stack; destroy a copy for 5 Shards

- In the Deck Workshop's side deck panel, copies of the same side card now stack into one tile
  with a ×N count and an "x of N copies in side deck" line, like the main deck. Each stack has
  "+ Add a copy", "− Remove a copy" and "Destroy a copy · +◇ 5".
- Destroying a side card removes a spare copy first (one not in the side deck) and gives
  ◇ 5 Shards (`destroySideCard`, `SIDE_DESTROY_SHARDS` in `assets/aether-deck.js`).
- `tests/aether-deck.test.cjs` checks the stacking and the Shards.

## Round 160: boosted talents climb in steps

- The ×1.4 multiplier on talents is gone (`talentScale()` is now 1). Boosted talents use fixed
  steps instead: ranks 1-5 count as 1, 2, 4, 6, 8 (`TALENT_STEPS` in `index.html`).
  - Bulwark Doctrine: +1 / +2 / +4 Block on Defense cards.
  - Retaliation Coil: 1 / 2 / 4 damage back.
  - Counter Weave: +2 / +4 / +8 counter damage. Reflux: 2 / 4 / 8 HP.
  - Siphon Edge: 1 / 2 HP.
  - Reactive Plating: +1 / +2 / +4 / +6 / +8 Armor.
  - Deep Interference: Weaken 3 + 3 per step (6 / 9 / 15 / 21 / 27); base Weaken is 3 again.
- Talent descriptions list the per-rank values. Tests updated: round76, chronospire,
  talent-matrix, card-variety, plating-armor.

## Round 245: a pop-up when a Swipe makes you discard

- The owner found it unclear when a Swipe happens. Now the turn after one opens with a pop-up:
  "<enemy> swiped at you", how many HP it took (and how much was blocked), and your hand to pick
  the card to discard.
- Clicking a card discards it and closes the pop-up. Closing the pop-up without picking leaves the
  choice on the battle screen as before. Pair partners' swipes open it too; the simulator's bot
  skips it (`swipePopup` in `assets/charge-swipe.js`).
- `charge-swipe` test checks the pop-up's text; checked in the browser on desktop and phone.

## Round 243: pairs of enemies from the Sky Isles on

- The owner asked for regular enemies that are harder without being boring or too hard. Of the
  options offered, they chose pairs of enemies, starting in the Sky Isles, with a new battle
  tutorial and without making the battle screen taller.
- `assets/enemy-pairs.js`:
  - **Which patrols:** half of the regular patrols in the Sky Isles, Elaris, Vespera and
    Chronospire are two enemies (`pairMateFor`; fixed per patrol and journey). The partner is a
    species from a neighbouring zone. Bosses, mini-bosses and elites never pair.
  - **On the map:** the partner stands beside the patrol, with "×2 · A + B" in its name.
  - **In battle:**
    - Both act every turn. Block and Armor protect you from both.
    - Your cards and the effects on an enemy (Burn, Poison, Weaken, Freeze, Hack, the Prismatic
      Counter) apply to your target, which you switch by clicking the other panel.
    - When one falls the other fights on. Beating both wins, with 1.5× XP.
  - **How it runs:** the target lives in the usual battle fields. The other enemy's fields wait in
    `b.pair.other` and are swapped in (`withPairMate`) to read its intent or let it act
    (`pairMateActs`: attacks, charged strikes, Block, afflictions, Swipe, Shear). It acts first at
    the end of your turn, then the turn resolves as usual.
  - **Screen:** the same height or less. The enemy panel splits in two side by side (the target
    outlined in gold), and the two intent bubbles show each enemy's next move instead of one
    enemy's next two.
  - **Tutorial:** the first pair fight opens a short guide (`state.tips.pairs`).
- **Strength:** each of the pair has part of a lone enemy's HP and attack:
  - Sky Isles 70%/78%
  - Elaris 72%/80%
  - Vespera 82%/87%
  - Chronospire 72%/80%

  Tuned with the Difficulty lab on regular encounters with every patrol a pair. Typical pair-fight
  win rates: Sky Isles 68%, Elaris 67%, Vespera 73%, Chronospire 73%, against 93-100% for single
  enemies. With half the patrols paired, regular encounters come to roughly 80-85%.
- **Known limit:** when your target dies at the end of a turn from Burn or Poison, the other enemy
  can act twice that turn.
- New `tests/enemy-pairs.test.cjs`.

## Round 242: enemies swipe while they charge

- The owner asked for something to happen during an enemy's charge-up turn, for example a swipe that
  forces a discard.
- 🗡 **Swipe** (`assets/charge-swipe.js`):
  - On a charge turn ("Gathering … energy") the enemy now swipes for 30% of its attack, rounded up.
    Block and Armor apply as usual.
  - At the start of your next turn you discard 1 card of your choice. It uses Sift's discard screen
    (any card in hand may go; nothing else can be played until you choose).
  - The intent shows it a turn ahead. Frozen or silenced enemies don't swipe.
  - Neon Aftermath's patrols have no element and never charge, so there it comes only from its
    elemental bosses. From Solaris on, every charging creature swipes.
- `cycle-card.js` labels the discard by its cause (`b.siftReason`: Sift or Swipe).
- New `tests/charge-swipe.test.cjs`.

## Round 241: Tailwind cards show their printed numbers outside the fight

- The owner reported Tailwind cards showing wrong values on the reward page and elsewhere.
- Cause: Tailwind, Growth and Discharge add their live bonus whenever a battle is loaded. The reward
  screen opens while the finished battle is still loaded, so a Gust Chain on offer added last turn's
  Tailwind to its damage.
- Fix (`liveBattleCard` in `assets/world-mechanics.js`): the live bonus applies only during a fight
  and only to that fight's own cards (hand, draw pile, discard, exhaust, or the card being played).
  Everywhere else a card shows its printed numbers (after the Round 240 boost in later worlds).
- New `tests/mech-live-values.test.cjs`.

## Round 240: attack cards +25% after Neon Aftermath

- Owner request: attack cards deal 25% more damage in every world after Neon Aftermath.
- `assets/attack-boost.js` scales each attack card's printed damage numbers (rounded) when a later
  world is configured, and puts them back in Neon Aftermath. So text, live bonuses and the damage
  dealt agree:
  - base damage;
  - Tempest Surge's damage per energy;
  - the damage in Tailwind, Follow-through, Amplify and Choose-one modes.

  Strike 6 → 8, Cleave 13 → 16, Tempest Surge 7 → 9 per energy, Gust Chain's Tailwind +2 → +3.
- Not scaled:
  - **Bulwark Bash** (it hits with your Block): the owner counts it as a defensive card.
  - **Defense cards and Skills:** Dusk Protocol's damage mode is unchanged.
  - **Block on hybrid attacks:** Silver Riposte and Lunar Edict scale their damage only.
  - **Talent, crystal and Boost bonuses:** added on top as before.
- Difficulty lab, typical win rate over 16 builds × 2 styles, before Round 237 → with Rounds
  237 and 240 (before Swipe, Round 242):
  - Mini-bosses mostly rose above their 34-50% target: Stormbell Warden 48 → 88, Tidebound Warden
    46 → 77, Gale Sovereign 40 → 59, Arc Sentinel 32 → 55, Resonant Phantom 47 → 66, Clockwarden
    36 → 63. Featherfall Matriarch 44 → 36 and Paradox Twin 41 → 47 held.
  - Final bosses: Zenith Roc 28 → 40, Bloom Tyrant 33 → 61, Tempest Colossus 41 → 30, Chronarch
    29 → 33 (target 22-36).
  - Regular enemies: 90-100% almost everywhere.

  Boss HP was not retuned; that is left to the owner.
- New `tests/attack-boost.test.cjs`.

## Round 239: Overdrive's button

- Owner request: the Overdrive button on the battle screen's encounter line is renamed
  "Overdrive - Double Value" (it was "Overdrive ×2"). It no longer sits right against the " · "
  before it: talent buttons on that line get an 8px gap (`layout-polish.css`). Echo and Overload
  get the gap too.

## Round 238: mechanic tags on the card, so the Deck screen shows them

- The owner asked for the Tailwind tag right after the card's description, because the Deck screen
  didn't show it. Round 229 drew it as a badge above the card, in battle only.
- Every world-mechanic card now carries its tag (⌁ HACK, ☀ HEAT, 🪶 TAILWIND, 🌱 GROWTH,
  ⚡ STORMCHARGE) as a small pill at the end of its rules text, wherever it is drawn: hand, Deck
  screen, rewards, merchant. Chronospire's ⏳ Suspend cards keep their own markings.
- It is added in a `cardHTML` wrapper in `assets/world-mechanics.js`. In battle a Growth card's
  pill still shows how far it has grown. The badge above the card and its spacers are gone.
- Tests: `mech-badge` checks the tag after the description in battle and in the Deck screen, on
  desktop and phone.

## Round 237: the Sky Isles push back on turtling: Shear and stronger damage over time

- **Why:** the owner found the Sky Isles too easy with a defensive build (save file at player
  level 25: Reactive Plating 5, which is 8 Armor, plus Block cards, gear and potions). The
  simulator played that save through every Sky Isles fight:
  - Regular enemies cost 0-2 HP, fights took 8-14 turns, and boss fights took 33 turns.
  - Sky Isles hits are 9-12, so 8 Armor took most of every hit before Block.
- **Options offered:** Shear, a rising storm, paying off defence, or an optional challenge. The
  owner chose Shear plus stronger statuses instead of the storm.
- 🌪 **Shear** (`assets/sky-storm.js`, Sky Isles only):
  - Every 3rd turn's attack ignores your Armor (Reactive Plating). Block from cards still stops it,
    and the intent says so.
  - While the turn resolves, the outermost `endTurn` sets `b.shearing`, and `scaledRank('plating')`
    reads 0.
  - The sim bot plans its Block for it.
- 🔥☣🩸 **Stronger damage over time, Sky Isles onward** (`assets/status-dots.js`). Armor and Block
  can't stop any of it; cleansing (Purifying Light, Static Shield) or healing answers it.
  - **Scorch** (new): Burn N for 3 turns, refreshing, not stacking (2, 2, 3, 4, 5, 6 by world).
    It uses the existing Burn, which now has a strength (`b.burnPower`, shown in the battle tags).
    A charged fire strike still burns for 2.
  - **Venom** (new): Poison +N, stacking to 3×N, until cleansed (1, 1, 2, 2, 3, 3).
  - **Bleed** now grows past Solaris: 2, 3, 4, 5, 6, 7.
  - Sky Isles enemies trade Crush and Barrage (both blunted by Armor) for these: Sunfeather Drake
    Scorch, Gale Harpy Bleed, Stormbell Warden Shackle + Scorch, Featherfall Matriarch Bleed +
    Headwind, Zenith Roc Empower + Scorch + Bleed.
  - Some enemies in Elaris, Vespera and Chronospire carry them too.
- **Effect on the owner's save:**
  - In a Sunfeather Drake fight, Scorch did 15 damage through Armor and Block, and Mend healed it
    back.
  - Gale Harpy and Thunderhorn Ram fights now cost about 13-22 HP of 59.
- The rising storm (enemy hits growing late in a fight) was built and measured, then dropped. Every
  setting killed the slow defensive deck in long boss fights.
- `tests/sky-storm.test.cjs`.

## Round 236: Sift, a deck-cycling card in every world

- The owner asked for a card in every world that cycles the deck: 0 energy, draw 1, discard 1 of
  your choice. While it was being built they added that the card just drawn is not a choice.
- **Sift** (⇄, Skill, 0 energy):
  - Draw 1 card, then discard 1 card you already held, your choice.
  - Upgrades: +1 Aether at level 1, draw 2 at level 2, both at level 3.
  - Like the Prismatic Counter, it is in every world's card rewards. New `assets/cycle-card.js`.
- **The choice:**
  - The hand waits: clicking a card you already held discards it, and the drawn card is dimmed
    and labelled "JUST DRAWN".
  - Nothing else can be played until you choose. Ending the turn ends the choice, since the hand
    is discarded anyway.
  - With nothing drawn, or only the drawn card in hand, there is no choice.
  - Discarding is not playing: no recap line, no Follow-through, no Pressure.
- It loads after `touch-controls` and `layout-polish`, so the choice owns the hand's taps in touch
  mode too, and the touch "Play" button is hidden while choosing.
- The sim bot discards the weakest card it may (`siftDefaultIndex`: junk first). The Difficulty
  lab's decks don't include Sift, so its numbers are unchanged.
- No painting yet: the card shows its ⇄ icon until art comes. The compendium's game frame is
  bumped to `round236`.
- Tests: new `tests/sift.test.cjs`; checked in the browser on desktop and phone.

## Round 235: new Sky Isles tiles with glass terraces

- The owner painted six Sky Isles tiles from the Round 232 prompts. They are in the same city,
  with grey glass terraces beside the deck where items stand. They are kept in
  `src/owner/` under readable names:
  - two corners (`corner-a`, and `corner-b` as a second variant);
  - a T painted with its branch up. Turned top to bottom it is `t-bottom-a` (the paintings are
    strictly top-down).
  - the three bridge tiles: `diag-sw-b`, `diag-se` and `diag-nw`.
- `diag-se` and `diag-nw` were painted with the deck from the top only, which is what the prompt
  asked for. The rooms beside the cut corners also need it from the right, so `corner-a`'s east arm
  is laid in with a soft edge, clear of the bridge (the paintings share one base city).
- `tools/prepare_sky_tiles.py`:
  - The old built bridges and `parts/bridge.jpg` are gone. All three bridge tiles are the owner's,
    with hand-drawn bridge outlines.
  - The trace takes the new set's near-white deck highlights.
  - Terraces (`TERRACES`) are walkable ground, joined to the deck by a short path when apart from
    it. A terrace across a deck arm (the corner's top, the T's bottom) runs to the edge, so the
    doorway stays open.
- Item squares (`tools/plazas.py`) sit on the terraces. 44 of 51 Sky Isles rooms now have one, up
  from 33. Only `t-right-a` (7 rooms; no new painting was sent for it) has none.
- The replaced paintings moved to `unused assets/assets/environment/sky/src/round204/`.
  `TILE_ART_VERSION` is 235.
- Tests: plazas, sky-diagonals, tile-worlds, item-placement, walk-past and waypoints pass. The Sky
  Isles playtest walk is clean.

## Round 234: the Briar Sentinel is animated

- The owner sent two sheets for Neon Aftermath's Briar Sentinel (`vineguard`): four battle poses
  (stand, shield up, slash with a pink trail, stand) and a six-frame walk, on black.
- Keyed off the black with a filled silhouette, so the dark armour joints stay. Small enclosed
  gaps are filled; large ones stay see-through.
  - Composed with `tools/compose_sprite_sheet.py` into `assets/monsters/city/briar-sentinel.png`.
  - The walk uses frames 2-5 (shield forward), in `briar-sentinel-walk.png`.
  - Both padded with `pad_sprite_frames.py`.
- It is a `WILDLIFE_ART` entry with `poses: { attack: 2, hurt: 1, walk }`. The Arc Sentinel and
  the Brass Sentry, which borrow its art, animate too (recoloured as before).
- The Sunwrapped Revenant's pose code (`assets/sun-revenant.js`) now serves any creature that
  lists `poses` (`posesOf()`, CSS variables for the frames and the walk sheet).
- Fixed: a `#battleModal .compact-monster` rule pinned every sprite to frame 0, so the
  attack and hurt poses never showed, not even the Revenant's.
- `SPRITE_VERSION` 234. New `tests/briar-sentinel.test.cjs`.

## Round 233: a deck slot for every boss; new cards wait for the player

- The owner asked for +1 max deck size for every boss defeated, and that newly acquired cards not
  go into the deck automatically: the player chooses.
- **Deck size:** `worldDeckBonus()` now counts every boss beaten, mini-bosses included (three per
  world, eighteen in all), not only the five bosses that open the next world.
  - With no talents or devices that is 6 at the start and 24 with every boss down.
  - The victory screen shows a "Deck slot" tile when a slot opens.
  - The old `WORLD_BOSSES` list is gone.
- **New cards wait in the collection.** None of these put cards in the deck any more:
  - battle rewards (`chooseReward`, `chooseCardReward`, the random card loot);
  - card bundles;
  - Solaris's attunement pick;
  - the worlds' arrival gifts (`mechanicGift`, Chronospire's Suspend cards);
  - new side cards (`addSideCard`).

  New deck and side-deck slots are left empty (the side deck's `fillSideDeck` is gone). The texts
  now say the cards are in the collection, to add from Deck.
- The Deck button counts the cards gained since the Deck screen was last opened
  ("Deck · 3 new", gold outline). New `assets/deck-choice.js`; it also rebinds the Deck button
  to the whole `showDeck` chain.
- The tutorial's deck line says one slot more for every boss beaten.
- The balance sim and the Difficulty lab equip the sim player's side cards themselves. Their
  numbers are unchanged: their decks are built before the beaten bosses are set.
- Tests: `world-deck` (18 bosses, +1 each, counted once; reward, gift and side card stay out of
  the deck; the badge) and `aether-deck` updated.

## Round 232: items stand in the open squares beside the road

- The owner asked that interactable objects stand only in open areas off the road (like Solaris's
  little paved yards), and for prompts where a painting has none.
- `tools/plazas.py` lists hand-checked spots on every tile painting, picked by eye over a grid,
  never on roofs, props, trees or water:
  - Solaris: paved yards and sand squares.
  - Elaris: the ruins' flagstones and clearings beside the trail.
  - Vespera: flats of rock and sand and the old stone circle.
  - Sky Isles: the terraces and the round plaza.
- The builders open each spot up to the walk mask (a disc round it and a footpath to the nearest
  road) and write each room's spots, flipped with the room, into the data (`SOLARIS_PLAZAS`,
  `TILE_WORLD_DATA[w].plazas`).
- `assets/plazas.js`:
  - `organicItemSpot()` picks the nearest open square first, for chests, gear, points of interest,
    the merchant, the Cardsmith and Nexus Waypoints. A square may be as close as 70px to a patrol
    or another item before it is passed over.
  - Patrols keep 90px out of the squares.
  - A room whose painting has no square keeps the old spot beside the road.
- Neon Aftermath already worked this way (hand-picked nooks, Round 101), so it is unchanged.
- Squares per world:
  - Solaris, Elaris and Vespera: every room has at least two.
  - Sky Isles: 33 of 51 rooms. Its plain lanes (the T, the three diagonal walkways, and the corner,
    which has only one small bay) have nothing but rooftops beside the deck.
  - Chronospire: none; its tiles are still generated stand-ins.

  Prompts for new paintings of those tiles were given to the owner.
- Tests: new `tests/plazas.test.cjs`. Items in rooms with a square stand in one, and each can be
  walked up to.

## Round 231: the last Solaris room in the new look

- The owner painted the tile asked for in Round 230: streets west, east and south with a stone
  causeway to the top-left. It is `diag-t-b-s1` and serves 5,1 (Mirage Bazaar), the far end of the
  causeway from 4,0. All 51 Solaris rooms now use the new top-down look.
- The causeway is grey stone, which the colour trace doesn't pick up, so `prepare_solaris_tiles.py`
  can outline one by hand (`CAUSEWAY`, at 800x500). Walking up from 4,0 again arrives on it.
- The old diag-t-b paintings moved to `unused assets/`.
- Tests: `solaris-landmarks` expects no old-style rooms. The Solaris playtest walk is clean.

## Round 230: two more Solaris tiles; one room left in the old style

- The owner sent four more Solaris paintings. Two fit:
  - **top-right** (streets east and south, causeway to the top-right corner) is the corner
    causeway, `diag-corner-s1`. It now serves rooms 0,4 and 8,4 (mirrored).
  - **dead-left** has a street south as well as west, so it is a corner. Turned half way round it is
    a second corner tile, `corner-s2`, for variety (corners fill 19 rooms). It also serves the
    west dead end at 4,5, where its south street runs off the map's bottom edge.
- **Builder** (`tools/build_solaris.py`):
  - When no tile fits a room exactly, an extra painted street may run off the map, as diagonal
    tiles already allowed.
  - The new look's tiles (`-s1`, `-s2`) are chosen over old ones whenever both fit.
  - No generated stand-ins once real paintings are in.
  - `prepare_solaris_tiles.py` can turn a painting half way round (`TURN`) and outlines a
    causeway to any corner (`CORNER`).
- The other two (`diag1`: a west street with a boardwalk to the bottom-right corner; `top-left`:
  streets east and south with a causeway to the top-left) fit no room. Not used.
- **Still in the old style:** the T causeway room 5,1 (streets west, east and south, causeway to
  the top-left). It is the only one; `solaris-landmarks` checks that.
- The old dead-left and diag-corner paintings move to `unused assets/`.

## Round 229: the first Nexus Waypoint is a few rooms in; mechanic badges above the cards; bigger enemies, smaller names

- **First waypoint moved** (`assets/waypoints.js`). Each world's first Nexus Waypoint used to stand in
  the room you arrive in. It is now three rooms in, in a room with nothing else in it: no point of
  interest, merchant, Cardsmith, chest, relic, event or patrol. The rooms were picked with the
  game's own checks, avoiding quiet rooms, bosses, the middle waypoint and dead ends:
  - Neon Aftermath: Blossom Grove (1,7)
  - Solaris: Sandglass Terrace (1,2)
  - Sky Isles: Moonrise Court (5,0)
  - Elaris: Emerald Thicket (6,4)
  - Vespera: Mist Marsh (1,3)
  - Chronospire: Chime Court (0,2)
- `NEXUS_POINTS[world].start` now names that room, and `.arrival` names the arrival room, which has
  no waypoint. Points of interest, the merchant and the Cardsmith skip the waypoint's room, and its
  patrols are removed. Discovering it shows the same message as the middle waypoint.
- A save that had discovered a world's old start-room waypoint keeps it, moved to the new room.
- The waypoint list now names any Solaris room (it only knew the old two).
- **Mechanic badges above the cards** (`assets/world-mechanics.js`). The 🪶 Tailwind badge (and
  every world's mechanic badge) sat on the card, over its Level row. It now sits centred above the
  card. In a hand with any badge, the other cards get an invisible spacer of the same height, so the
  hand stays level.
- **Enemies on the map are 10% larger** (their sprite scale .8 → .88, `layout-polish.css`), and **their
  name labels are smaller** (55% of the original size, was 70%; `enemy-labels.js`).
- New tests: `waypoints` (every world, three seeds: distance, an empty room, travel, old saves) and
  `mech-badge` (Chromium, desktop and phone).
- Updated tests for the new waypoint rooms: `pacing`, `rebuilt-worlds-migrate`, `room-art` (the city's
  waypoint stands on one of Blossom Grove's hand-checked spots), `solaris-patrols` (the waypoint rooms have none).

## Round 228: Solaris gets a new look (the owner's top-down golden city)

- **New tiles.** The owner's seven top-down paintings of a golden desert city (pale sandstone
  streets between terracotta roofs, palms, turquoise canals, sun-mirrors) replace Solaris's
  tiles in 47 of its 51 rooms: corner, cross (a sundial plaza), dead-top, straight (a canal
  bridge), t-bottom and t-right, plus a diagonal causeway tile.
- `tools/prepare_solaris_tiles.py` traces the streets by colour into walk masks
  (`src/masks/`), bridges arms the trace stops short of, and fills only small gaps, so the
  obelisk and fountains stay solid. The new tiles are named `-s1`, so they don't collide with
  the old tiles' hand-drawn masks.
- **Builder** (`tools/build_solaris.py`):
  - Uses a tile's own mask when it has one.
  - Lets the top-down `-s1` diagonals flip top-to-bottom too (`FLIP_DIAG_ALL`). The old ones
    had perspective.
  - Knows the new tile's shape, `diag-t-c` (streets north, east and south, causeway to the
    top-left). That one tile now serves three of the six diagonal rooms (1,3, 7,3, and 4,0,
    where its north street runs off the map).
  - Limits saved tile images to 2000px wide.
- **Landmarks retired.** The six landmark paintings (the Solar Crown and the Stronghold yards and
  four relic rooms) were in the old style, so those rooms use the new tiles (`USE_LANDMARKS =
  False`). Room names, bosses and relics are unchanged. The old tiles and landmarks move to
  `unused assets/assets/environment/solaris/src/`, and their built images are removed.
- **Still in the old style until painted:** the west dead end (4,5), the corner causeway with
  streets east and south (0,4, and mirrored at 8,4), and the T causeway with streets east, south
  and west (5,1). `tests/solaris-landmarks.test.cjs` lists exactly these four rooms.
- `node tests/playtest-walk.cjs elaris` reaches every door and item in all 51 rooms.
- Fix (Round 227's Esc): when the chest held a card choice, Esc left the screen open; it now skips the
  choice as the Skip button does, then continues. `reward-escape` covers every kind of loot.

## Round 227: Vespera gets the owner's storm coast; Esc closes the victory screens; the merchant buys potions

- **Vespera (world 5) is painted.** The owner's 15 top-down tiles of a storm-lashed glass coast (a
  pale golden sand path over dark rock, violet crystals, glowing tide pools) replace the grey
  stand-ins. The new `tools/prepare_vespera_tiles.py` traces the path by colour and bridges arms
  the trace stops short of (stepping stones at the edges, a stream ford), reusing Elaris's
  `arms()`. The piers are outlined by hand (`PIER`). Two tiles carry a pier that ends in the water
  (`corner-b`, `t-right2`): it's decoration, and those are a second corner and a second t-right.
- **Three storm-sea inlets.** Rooms 2,2, 6,2 and 6,3 are cut, and their neighbours are joined by
  piers across the water. With the five pier tiles as painted only one room could be cut, so
  `diag-c` (paths north, east and south with a pier to the top-left) is the owner's
  top-left pier tile with `t-right`'s north arm laid over it. 51 rooms; `node
  tests/playtest-walk.cjs vespera` reaches every door and item. `TILE_ART_VERSION` is 227.
- The straight tile is unused: Vespera's only straight room sits beside an inlet.
- **Esc closes the victory screens** (`assets/battle-recap.js`). It opens the loot chest first if
  it's still shut, so potions and Shards are kept. If the chest holds a card choice, Esc skips it
  as the Skip button does. Then it continues to the map. It does nothing during a fight.
- **Merchant** (`assets/exploration.js`): card upgrades are no longer sold here (they stay at
  the Cardsmith, ◇ 36 / 60 / 90). Its stock is now a side card, potions and one other ware. It
  also buys healing potions back for ◇ 10 each (`POTION_SELL_PRICE`). The merchant's potion price
  rises from ◇ 4 to ◇ 15, so buying potions to sell back loses Shards.
- Tests: new `reward-escape` (Chromium). `tile-worlds` and `crystals-touch-boss` expect 51 Vespera
  rooms; `exploration` covers the new stock and potion sales.

## Round 226: ⚔ Pressure makes decks without Block viable; a new-journey tutorial; Nano Mend

- **The problem, measured.** The owner felt Block was essential, and the Difficulty lab agreed. It
  compared each world's sim deck with the same deck with its Block and Counter cards swapped for
  its own attacks (16 builds × 2 styles). The Block-free decks fell to 0–23% against mini-bosses
  in Neon Aftermath, Solaris and Vespera (the standard decks won about 40%). One enemy hit takes
  45–72% of your HP (up to 130% for a Solaris mini-boss), and even an all-attack hand needs 4–17
  turns to kill, so a deck that doesn't block dies in about two hits.
- **⚔ Pressure** (`assets/pressure.js`). On a turn where you gain no Block from a card, every few
  damage you deal takes 1 off the enemy's attack that turn, up to half. The rate is per world,
  because late decks deal far more damage per energy: 2 in Neon Aftermath and Solaris, 3 in the
  Sky Isles, 4 in Elaris, 6 in Vespera and Chronospire (`PRESSURE_PER_BY_WORLD`, tuned with the
  lab). It counts damage from hand and side cards. Gaining Block from any card, Counters
  included, cancels it for that turn. The enemy's move shows the lower number as you play, with
  a line saying what Pressure is doing or why it isn't ("⚔ No Pressure: you gained Block this turn").
- **Re-tuned for it.** With Pressure, the standard decks won too often from the Sky Isles on, so
  boss HP went up (`BALANCE.perEnemy`): Stormbell Warden .76→.93, Featherfall Matriarch .94→1.15,
  Zenith Roc .5→.79, Tidebound Warden 1.15→1.31, Gale Sovereign (Elaris) .78→1.01, Bloom Tyrant
  (Elaris) .7→.8, Arc Sentinel .9→1.03, Tempest Colossus .63→.77, Clockwarden 1.16→1.25, Paradox
  Twin 1.28→1.46, Chronarch .62→.87. In the lab every mini-boss is now 39–49% (target 34–50%), every
  final boss 25–32% (target 22–36%; Thorn Warden 46%, target 34–50%), and regular enemies 45%+.
- **Where it lands** (typical win rate, standard deck / no Block or Counter cards):

  | | Neon Aftermath | Solaris | Sky Isles | Elaris | Vespera | Chronospire |
  |---|---|---|---|---|---|---|
  | mini-bosses | 47–49 / 16–31 | 43–47 / 0 | 42–45 / 31–47 | 44–47 / 40–41 | 40–44 / 28–31 | 39–41 / 42–72 |
  | final boss | 46 / 21 | 31 / 0 | 31 / 33 | 32 / 43 | 29 / 60 | 25 / 55 |

  From the Sky Isles on, a deck without Block is as good as one with it, or better against the
  last bosses. Neon Aftermath's mini-bosses and Solaris's still need Block: they hit for 65–130%
  of your HP and have about 540 HP, and Solaris's Siphon heals them from every hit you take. Those
  fights teach Block, as the starting deck and tutorial do.
- **Nano Mend** (new, `assets/cards.js`): 1 energy, heal 7 (9 / 11 / 14 at higher levels), not
  Exhaust, so unlike Bloom of Life it can be used every time you draw it. Its picture is a
  recoloured stand-in of Bloom of Life's (`refreshedCardArt`) until the owner paints one.
- **New-journey tutorial** (`assets/tutorial.js`). "Begin new journey" and the main menu's "New
  journey" open six short pages on what Neon Aftermath teaches (exploring and the boss gate,
  battles and intents, Block and Pressure, Aether and the side deck, ⌁ Hack, Soulbound and
  Impermanent cards and talents). You then pick the 6 cards your journey starts with, from Ember
  Blade ×3, Crystal Ward ×3, Silver Riposte, Starlit Focus, Bloom of Life and Nano Mend. The first
  copy of each picked card is ◆ Soulbound, and the cards show it as you pick. Escape doesn't skip
  the tutorial, and continuing a journey saved mid-tutorial reopens the pick. `newGame()` is
  unchanged (tests and the lab still get the old starter deck).
- Tests: new `pressure`, `tutorial` (Chromium, desktop and phone). `stagger` marks its turns as
  guarded so it measures the daze alone; `card-art` lists Nano Mend. Pressure is in the harness
  and sim script lists.

## Round 225: Elaris gets the owner's forest, and one line tops the battle screen

- **Elaris (world 4) is painted.** The owner's 11 top-down forest tiles replace the grey
  stand-ins. All 11 share one base forest (the ruins and trees sit in the same places), so the new
  `tools/prepare_wilds_tiles.py` lifts a path arm or a stretch of plain forest from one tile into
  another with a soft seam, making the shapes that weren't painted:
  - `t-bottom-a`: the cross with its north arm grown over.
  - The boardwalk tiles: north and east paths (`diag-a`/`diag-b`, as painted); with a south arm
    added (`diag-c`); with south instead of north (`diag-d`); and `diag-e` (the owner's diag-se:
    a path north and a boardwalk to the bottom-right).
  - The owner's "t-bottom" runs its side path on, under a tree, to the right edge, so it is a
    second t-right (`t-right-b`).
- **Three forest lakes.** Rooms 2,0, 2,3 and 6,3 are cut, and their neighbours are joined by
  boardwalks across the water (`cut`, and the world's own `dshapes` in `build_tile_world.py`). A
  lake blocks the side path on its own side, and these are the only cuts whose neighbours keep
  clear of their lakes. 51 rooms.
- **A path round the fountain.** The owner asked for one: the cross now has a ring of path painted
  round its fountain, in the paths' own colour and grain, under the standing stones. The ring is
  walkable; the fountain isn't.
- **Walk masks** are traced by the path's golden tan. Arms that run on under a tree are bridged to
  the edge and in to the room's middle (some junctions are painted as moss). The boardwalks are
  outlined by hand (`BOARDWALK`), and only pieces joined to an exit are kept.
  `node tests/playtest-walk.cjs wilds` reaches every door and item in all 51 rooms;
  `PLAYTEST_DETAIL=1` now lists each problem it finds.
- The two straight tiles are kept but unused: Elaris's only straight room sits beside a lake. The
  one corner painting covers 18 rooms, so a second corner would add the most variety.
- `TILE_ART_VERSION` is now 225. The owner's originals are in `assets/environment/wilds/src/owner/`.
- **Battle screen:** the encounter ("Encounter: Storm Moth") moved from the log line into the top
  line, beside the element: "Encounter: Storm Moth · Element: air · reserve Prismatic Counter". A
  fight with no element still gets the top line. The log line above the Aether panel shows only
  moves, and is hidden until the first one (`assets/layout-polish.js`).
- A point of interest whose only spot 150px clear of patrols was under the HUD or minimap (Elaris's
  north-and-west corner rooms) now stands up to 90px from a patrol instead (`assets/neon-world.js`).
- New tests: `elaris-tiles` (lakes, boardwalk doors, one connected path per tile, the fountain
  ring) and `battle-header` (Chromium, desktop and phone). `tile-worlds` expects 51 Elaris rooms.

## Round 224: cybernetic robot creatures for the Sky Isles

- The owner's new sheets turn every Sky Isles creature into a cybernetic robot in the sky city's
  white, chrome, cyan and gold: the Sunfeather Drake, Rain Drone, Gale Harpy, Thunderhorn Ram,
  the Stormbell Warden and the Featherfall Matriarch (mini-bosses) and the Zenith Roc (boss).
- Gemini drew 4 to 8 poses per image in two rows rather than four in one, so the new
  `tools/compose_sprite_sheet.py` builds the sheet: key the image with `cut_sprite_sheet.py`, then
  pick four poses by box. Each pose takes the pieces that lie mostly inside its box (a neighbour's
  wing tip is left out). All four are drawn at one scale, standing on one baseline, over their feet,
  in 3:4 frames. Only the single widest pose (spread wings) may shrink on its own, so wide
  creatures aren't small in every frame. `--ground-line` clears the thin ground lines Gemini
  painted under the Roc's and the Matriarch's feet. Poses used:
  - Drake: wings up, wings low, fire breath, wings raised.
  - Drone: hover, tilt, water jet, recoil in mist.
  - Harpy: hover, wings wide, wind slash, hover.
  - Ram: stand, rear, lightning charge, stamp.
  - Warden: the top row (stand, hammer raised, strike with lightning, lower). Its bottom row ran
    off the image.
  - Matriarch and Roc: their four poses.
- `SPRITE_VERSION` is now 224 (and `elaris-wildlife.js?v=round224`), so browsers fetch the new
  sheets. New `tests/sky-sprites.test.cjs` checks each sheet is four 3:4 frames with clear sides.

## Round 223: the new Zenith Roc, and sprite padding drops stray wing tips

- A Zenith Roc sheet had one frame's wing crossing into the next frame's cell, which leaves a
  sliver at that frame's edge while the creature animates. `tools/pad_sprite_frames.py` now clears
  small pieces (under 4% of the frame's creature) that touch a frame's left or right edge
  (`drop_strays`). Re-running it on every installed sheet changes none of them.
- **The new Zenith Roc**: the owner's armoured silver eagle with an orbiting sun sphere that powers
  up across the frames (a sun burst and a holographic ring under it in frame 3). Cut from its
  green background and padded; frame 2's wing tip, which crossed into frame 3, is gone.
  `SPRITE_VERSION` is now 223, so browsers fetch it. Checked in the Eye of the Sky.

## Round 222: the Rain Drone replaces the Cloud Wisp

- The owner disliked the Cloud Wisp. Their new sheet, a white weather drone with a cyan lens,
  four rotors and a water tank spraying rain, takes its place as the **Rain Drone** (same id
  `skyWisp`, so saves carry over; water element, ☔). The sheet is `assets/monsters/sky/rain-drone.png`;
  the old one moved to `unused assets/`.
- **Green-background sheets.** The Sky City is full of magenta, so new sheets come on flat green.
  `tools/cut_sprite_sheet.py` now keys green the same way it keys magenta, and pulls leftover
  green out of the edges (cyan, white and gold keep their colour). The magenta sheets still come
  out byte-for-byte the same. Then `pad_sprite_frames.py` leaves the usual gutter.
- The compendium's Headwind note names the Rain Drone. `tile-worlds`, `elaris-wildlife` and
  `sky-diagonals` pass, and the drone was checked in a Sky Isles room.

## Round 221: two more painted Sky City diagonals

- The owner painted two more diagonal pieces (in `src/diagonal-owner/`):
  - `diag-nw.jpg`: deck from the top and right edges, plus a bridge to the top-left. It replaces
    the built `diag-nw` in rooms 1,5, 7,5 and 7,0 (mirrored to fit; the Sky Isles flip both ways).
  - `diag-sw-b.jpg`: deck from the top and left edges, plus a bridge to the bottom-right. That is
    the `diag-sw` shape mirrored, so it is stored mirrored as a second `diag-sw` version, and the
    builder chose it for Sunbeam Arch (2,4). Round 220's `diag-sw` painting fits the same room
    and stays as the alternative.
- Each bridge's glass outline is added by hand (`OWNER_BRIDGE`) and must reach the image edge,
  or the builder finds no diagonal door.
- Only `diag-se` is still built by the tool, in rooms 8,1 and 8,4.
- `TILE_ART_VERSION` is now 221. `sky-diagonals`, `tile-worlds` and `item-placement` pass.
  `playtest-walk sky`: 51 rooms, 375 crossings, no problems.

## Round 220: the owner's painted diagonal in the Sky Isles

- The owner painted a Sky City diagonal piece: deck from the top and right edges, and a glass
  bridge to the bottom-left. It replaces the built `diag-sw` tile in Sunbeam Arch (2,4).
  - Owner diagonals live in `src/diagonal-owner/` and override the built ones
    (`owner_diagonals()` in `tools/prepare_sky_tiles.py`).
  - The bridge glass is darker than the deck, so its outline is added by hand (`OWNER_BRIDGE`).
- The other diagonal rooms need a bridge to a different corner, so they keep the built pieces.
- `TILE_ART_VERSION` is now 219, so browsers fetch the new painting.
- `sky-diagonals`, `tile-worlds` and `item-placement` pass. `playtest-walk sky`: 51 rooms, 375
  crossings, no problems.

## Round 219: a slimmer last-moves line and Aether panel

- The owner asked for the "Encounter / last moves" line and the Aether panel to be smaller, with
  smaller text. Both are now about 20px tall (from about 33px and 37px): 11px text, 2px padding,
  and smaller Aether pips (`assets/layout-polish.css`). Checked in the browser.

## Round 218: diagonal crossings land beside the door; Edge Calibration +1 per rank

- **Diagonal crossings landed at the wrong edge.** Taking Ember Crossing's diagonal road into
  Radiant Causeway (Solaris) put you at the bottom of the room instead of on its diagonal road at
  the top-left. Every diagonal crossing, in Solaris and the Sky Isles, did the same.
  - Cause: after any room change, the organic engine moved you to the door matching the opposite
    straight edge. A diagonal direction has no straight opposite, so it fell back to a default
    door and replaced the diagonal arrival.
  - Fix: that step now only runs for straight exits (`assets/organic-paths.js`). Diagonals keep
    their own arrival beside the partner's diagonal door.
  - `solaris-diagonals` and `sky-diagonals` now also check that you arrive within 160px of the
    partner's diagonal door. Before, they only checked that you landed on a road, which is how
    this slipped through.
- **Edge Calibration: +1 damage per rank** (+1 / +2 / +3 / +4 / +5), as the owner asked. It was
  rank ÷ 2 rounded up (+1 / +1 / +2 / +2 / +3). `attackBonus()` in `index.html`. Its description
  now reads "Attacks deal +1 damage per rank (+5 at rank 5)", and `talent-matrix` checks both.

## Round 217: Edge Calibration says what each rank gives

- The owner flagged Edge Calibration's text. It read "+1 damage to every Attack at ranks 1, 3
  and 5", which sounds like +1 at every rank (or a flat +1). In fact it adds rank ÷ 2 rounded up:
  +1 / +1 / +2 / +2 / +3 damage at ranks 1–5 (`attackBonus()`). The description now says exactly
  that, in the same style as the other talents: "Attacks deal +1 / +1 / +2 / +2 / +3 damage
  (ranks 1-5)." No change to how it plays.

## Round 216: half-height you / enemy boxes in battle

- The owner asked for the two health boxes at half their size, with the bars along the bottom.
  Each box is now two rows:
  - Top row: the name, small Block / Armor badges (the shield and crystal shrink from about 34px
    to about 20px), and the debuffs, right-aligned.
  - Bottom row: a slim 16px health bar across the box.
- Tighter padding and slightly smaller text throughout (`assets/layout-polish.css`).
- Desktop: the boxes went from 157px to about 52px tall (the whole battle screen from 901px to
  841px). Phones: from 143px to about 89px. Checked in the browser at both widths, with Block,
  Armor and debuffs showing, and no page errors.

## Round 215: half-size items, and a tighter battle screen

- **Items at half size.** Points of interest, chests, gear and the merchant (everything you can
  open or pick up) are drawn at 50% of their old size, around the same centre. Their name
  labels stay full size and sit just under the picture. Portals keep their size. One CSS rule in
  `assets/layout-polish.css` (`scale:.5`, with the label scaled back up). Placement, reach and tap
  routes are unchanged. Checked with close-ups in four worlds.
- **Tighter battle screen.** Less padding and smaller gaps between every part: the panel's own
  padding, your and the enemy's boxes, the debuff strips, the enemy-move boxes, the last moves,
  the Aether panel, the Turn / energy bar, "Your hand" and the cards. On desktop the screen went
  from 988px to 901px tall; phones tighten too. Checked in the browser at both widths.

## Round 214: the element line at the top of the battle screen, End turn beside the energy

- The owner asked for "Element: earth · reserve Prismatic Counter" at the very top of the battle
  screen. In Round 211 it had moved under the Aether panel; it now leads the battle screen
  (`assets/layout-polish.js`). Everything else keeps the Round 211 order: you and the enemy, the
  enemy's moves, the last moves, Aether, the Turn / energy / level bar, then your hand. Checked
  in the browser.
- **End turn** moved from the battle footer to the right end of the Turn / energy / level bar.
  On narrow phones the bar wraps, so it sits right-aligned on its own line. Checked in the
  browser at desktop and phone widths: the button ends the turn, with no page errors.

## Round 213: the Cardsmith asks before it upgrades or binds

- Clicking a card at the Cardsmith used to spend the Shards at once. Both actions now open a
  confirmation first: the card, the question ("Upgrade Ember Blade to level 1 for ◇ 36?" or
  "Make … Soulbound for ◇ 500? It will never be lost."), your Shards, and **Upgrade** /
  **Make Soulbound** or **Cancel**. Cancel goes back to the Cardsmith with nothing changed
  (`cardsmithConfirm`, `askUpgrade` and `askSoulbind` in `assets/cardsmith.js`).
- The Cardsmith's upgrade note now says the card keeps its progress toward the next level (Round
  212), instead of "Its mastery starts fresh".
- `tests/cardsmith.test.cjs` checks that asking changes nothing, Cancel keeps the card as it was,
  and Yes upgrades or binds. Checked in the browser too.

## Round 212: items stand on open ground, and paid upgrades keep progress

- **Items no longer sit on buildings in Solaris and the Sky Isles.** Items (points of interest,
  chests, gear, the merchant, waypoints, the Cardsmith) are placed just off the walkable path,
  12–28px from it. In these two painted worlds everything off the road or deck is buildings, so
  many landed on roofs and walls. There, `organicItemSpot` now picks walkable, reachable ground
  22–40px inside its edge (`ITEM_IN`, `itemsOnGround()` in `assets/organic-paths.js`). The
  pictures are about 50px wide, so they stay fully on the ground beside the lane, clear of doors
  and patrols as before. Neon Aftermath keeps its hand-checked spots, and the other worlds keep
  the off-path rule.
  - Checked with close-up crops in both worlds. `playtest-walk` for both: every room, door and
    item route works, and walking past triggers no pop-ups.
  - `item-placement` and `playtest-walk` now expect on-ground items in these two worlds.
- **Paid upgrades keep a card's progress.** Raising an Impermanent card a level at the Cardsmith,
  or with the merchant's upgrade pack, used to reset its progress toward the next automatic
  upgrade to 0. It is now kept. (It is always below the threshold, or the card would already
  have levelled.) The Cardsmith's upgrade moved into `cardsmithUpgrade(c)`. Tests in `cardsmith`
  and `exploration`.

## Round 211: battle page tidy-up and a final-turn recap on the victory screens

Four requests from the owner:

- **Final turn on the victory screens** (new `assets/battle-recap.js`, loaded after
  `layout-polish.js`). The fight ends as the last card lands, so the finishing move was never
  seen. The victory screens (loot chest, card choice) now open with a "Final turn" box: each card
  played on your last turn, what it did (damage dealt, Block gained) and which one finished the
  enemy. A win by damage over time or a side card names that instead.
- **The last moves above the Aether panel.** The battle log line (`#combatLog`, the "·"-joined
  last moves) moved from the bottom of the page to just above the Aether panel, in a small box.
- **The element line and the Turn / energy / level bar under the Aether panel**, in that order.
- **No enemy picture on the battle page.** The enemy's name, health, debuffs and moves stay.
- The moves are in `assets/layout-polish.js`'s battle wrapper, the styles in `layout-polish.css`.
  Checked in the browser at desktop and phone widths, with no page errors.
- Tests: new `tests/battle-recap.test.cjs` (cards and what each did, only the final turn, a
  damage-over-time win, names escaped).

## Round 210: the Prismatic Counter drops in every world

- The owner asked for it everywhere. Since Round 178 it had been in Solaris's reward pool only.
  (An older pool list also named Vespera and Chronospire, but `world-cards.js` replaced it.)
  It is now in every world's pool, including Neon Aftermath, Sky Isles and Elaris. It is the
  one card allowed in more than one pool (`assets/world-cards.js`).
- No other change: it can still be lost in a defeat like any Impermanent card.
- `tests/world-cards.test.cjs` lets the counter be shared and checks it is in every pool.
  `world-cards.js` cache tag is now round210.

## Round 209: smaller enemies on the map

- Asked to make all enemies 20% smaller: every enemy on the map is now drawn at 80% of its old
  size. That covers Neon Aftermath's monsters, the creature sheets, mini-bosses and bosses. One
  rule in `assets/layout-polish.css` scales the `.monster-sprite` inside each `.enemy-node`
  around its feet, so enemies stand in the same spot and their labels stay under them. CSS
  `scale` stacks with the sprite's left/right facing flip. Positions, collisions and fights are
  unchanged, and so are battle portraits.
- Checked in the browser: sprites measure 80% of before (131→105px, 168→134px, 104→83px), with
  no page errors.

## Round 208: no stale Sky Isles paintings from the browser cache

- The owner saw the map "reverted to an older state". `main` had the Sky City art (checked), but
  Round 204 repainted the Sky Isles under the same file names (`corner-a.webp` and so on). The
  game loaded those without a version, so a browser could keep showing the old marble islands.
- Tile-world paintings now load through `tileWorldArtSrc(id, name)` in `assets/tile-worlds.js`,
  which adds `?v=TILE_ART_VERSION` (204). The room preloader uses the same URL, so it still
  shares the painter's cached image. Bump `TILE_ART_VERSION` whenever tile art changes. Checked
  in the browser: rooms request `sky/cross-a.webp?v=204`.

## Round 207: the concept-lab cards drop one world later

- Neon Aftermath already had plenty of cards, so each pair from Round 206 moved up a world
  (`MECH_CARDS` in `assets/card-mechanics.js`):
  - Cinder Capacitor and Dusk Protocol: Neon Aftermath → Solaris.
  - Crystal Aegis and Tidal Decision: Elaris → Vespera.
  - Wardbreaker Step and Afterimage Ward: Vespera → Chronospire.
- Each is still in exactly one world's reward pool (`tests/card-mechanics.test.cjs`). Copies
  already found stay in your collection.
- Asked to remove the blank-image Reversal cards: this game has none left. Round 188 removed the
  four single-element Reversal cards (saves holding one load it as a Prismatic Counter), and a
  browser pass over the compendium found no broken images and no "Reversal" text. They are
  still in `achubu/Cardbound`'s copy of the game, which Claude doesn't change.

## Round 206: six cards from the Cardbound concept lab

`achubu/Cardbound` added a review-only "card concept lab" (`assets/concepts/cards.json`): 16
text-only cards across 8 mechanics borrowed from Magic, Hearthstone and Flesh and Blood. I
picked the three mechanics that fit this game without new screens and add a real decision:

- **⤳ Follow-through** (Wardbreaker Step, Afterimage Ward; Vespera). A bonus if the card you
  played just before this one, this turn, was a Defense (or an Attack). It makes the order you
  play cards matter. Side cards, pitching and Suspend's automatic plays don't count. A card whose
  bonus is ready glows gold in your hand.
- **⚡ Amplify** (Cinder Capacitor, Neon Aftermath; Crystal Aegis, Elaris). A second button plays
  the card for one more energy with a bonus. That competes with banking unspent energy as
  Aether.
- **◇ Choose one** (Dusk Protocol, Neon Aftermath; Tidal Decision, Elaris). One button per mode,
  and only that mode resolves; clicking the card plays the first. Tidal Decision exhausts either
  way.

Not taken: Cycle, Foresee and Reprise (they need new screens for reordering or playing from the
discard pile), Prepared (only works with the Retain talent), and Improvise (temporary generated
cards; the concept notes flag its risks).

- The numbers start from the concept lab's: each mode or base sits just under the dedicated card
  of its role, and the bonus is what makes the card worth a slot. Each card drops in one world's
  reward pool only.
- How it works (`assets/card-mechanics.js`, loaded after `stagger.js`): a `stat` wrapper reads
  the battle's `amplifyUid`, `modePick` and `chain` (the last card played by hand this turn), so
  costs, damage and Block resolve through the usual card effects. `playCardWith(i, choice)`
  plays with Amplify or a mode chosen.
- Placeholder art for all four levels comes from `tools/generate_world_card_art.py`, until the
  owner paints them. The compendium shows them (its frame's tag is now round206).
- Found while testing: a new helper shared its name with `world-mechanics.js`'s `addBonus` and
  replaced it, breaking Tailwind. It is now `mechAddBonus`, and I checked every new name for
  clashes.
- Tests: new `tests/card-mechanics.test.cjs` (pools, rules text, Follow-through after the right
  and wrong kind, the turn reset, Suspend not counting, Amplify cost, damage and Block, and both
  modes). `card-variety` counts 58 world cards. Checked in the browser too.

## Round 205: Accelerate's last two paintings from achubu/Cardbound

- Checked `achubu/Cardbound` (head defe3cb, 2026-10-20) for images we don't have. The only new
  ones are Accelerate levels 2 and 3. Its other differing files are the creature sheets before
  Round 200's padding, and old PNGs we already replaced or keep in `unused assets/`.
- `assets/cards/level2/accelerate.webp` and `level3/accelerate.webp` are in, so Accelerate now
  has all four stages (`refreshedCardArt`). Every refreshed card now has its full set. Cache tag
  `cards.js?v=round205` in `index.html` and `compendium.html`. `tests/card-art.test.cjs` updated.

## Round 204: the Sky Isles become a floating city

The owner didn't like the island look and asked for a dense, vibrant, futuristic sky city with
very little empty sky, and seamless connections without clearly marked roads. New prompts asked
for top-down tiles where you walk on one continuous pale glass deck that flows between packed
neon buildings and meets each open edge around its middle.

- **The owner's tiles** (2624x1632): corner, cross, straight, T to the right, T downward, and
  dead-ends from below and to the right. Each shape's openings are consistent (top x 357–442,
  bottom 324–448, sides y 207–291 on the 800x500 room), so neighbouring rooms line up.
- **Diagonals.** The generator's one diagonal came out as a top exit plus a bridge to the
  bottom-right corner, which fits no room. So `tools/prepare_sky_tiles.py` (rewritten for the
  city) builds the three diagonal pieces. Each is the corner tile with that painted bridge laid
  from its middle to the corner (a strip of the bridge turned to point at the corner, mirrored
  past its clean stretch) and the cross tile's fountain plaza pasted over the joint. The source
  is kept in `src/parts/bridge.jpg`.
- **Walk masks** are traced from the deck's pale cyan (its grid lines a stronger cyan). On the
  diagonal pieces the plaza and bridge are added as laid out, because the fountain's colours and
  the rims would otherwise hole or split the traced deck.
- **Lighter paintings.** The city art is dense, so the builder's new `max_width` (2000 for the
  Sky Isles) keeps each painting about 500 KB instead of 800 KB. That's still 2.5× the 800px room.
- The loading and backdrop colour is now the city's deep purple, and the arrival line mentions
  glass decks between the towers.
- The marble island set moved to `unused assets/assets/environment/sky/`.
- Same map as Round 197: 51 rooms, the same three cut rooms and diagonal links.
  `node tests/playtest-walk.cjs sky`: 51 rooms, 375 crossings, no problems. `sky-diagonals`,
  `tile-worlds`, `item-placement`, `walk-past` and `crystals-touch-boss` pass.
  Cache tags for `sky-data.js`, `tile-worlds.js` and `room-preload.js` are now round204.

## Round 203: Nexus Waypoints in world order

- The waypoint list (Aetherlink and the map) showed worlds in the order they were added to the
  code: Neon Aftermath, Solaris, Vespera, Chronospire, Sky Isles, Elaris. It now follows the
  travel order (`WORLD_ORDER`), with each world's start waypoint before its mid-world one
  (`nexusRegions()` in `assets/exploration.js`).
- `tests/god-mode.test.cjs` (which unlocks every waypoint) checks the list and the buttons are
  in world order.

## Round 202: far fewer side cards

The owner found far too many side cards dropping. About 6–7 came per world, around 40 over a
run: every boss and mini-boss, 5% of other fights, the lore and world-completion rewards, and a
50% event. Now:

- Final bosses still always drop one (the Sun Pharaoh's 30% Stasis chance is kept).
- Mini-bosses: 25% (they already give gear). Regular and elite enemies: 2% (was 5%).
  (`SIDE_DROP_MINI` and `SIDE_DROP_REGULAR` in `assets/aether-deck.js`.)
- Reading all five lore finds: 25 Shards instead of 15 Shards and a side card.
- Exploring a world fully: 35 Shards instead of 20 Shards and a side card.
- The supply-cache event's side card: 25% (was 50%).
- Unchanged: the merchant's side card (you choose and pay) and the ranger event (costs a potion).

That's about 2 per world. The Deck Workshop note, the map's completion hint and the compendium
now say so. Tests in `aether-deck` (rates for regulars, elites, mini-bosses and final bosses),
`exploration`, `round76` and `poi-rewards` were updated.

## Round 201: smooth edges on the creatures

- The creature sprite sheets (Solaris, the Sky Isles, the forest animals and their recoloured
  copies in Vespera and Chronospire) were drawn with `image-rendering: pixelated`. That suits
  tiny pixel art drawn bigger, but these sheets are paintings about 2000px wide drawn at
  90–150px. Nearest-pixel scaling then just drops pixels, which gave jagged outlines. They now
  scale smoothly (`assets/elaris-wildlife.js` for rooms and battles, `assets/battle-hud.css` for
  the battle portrait). City enemies already scaled smoothly.
- Sprite sheet URLs carry `?v=SPRITE_VERSION` (now 200, in `elaris-wildlife.js`; also used by
  `encounter-depth.js` and `sun-revenant.js`), so browsers fetch Round 200's re-cut sheets rather
  than cached ones. Bump it when sheets change.

## Round 200: no more line through the Cistern Warden

- **The line was a cutout mistake, not in the owner's art.** In Round 196, `tools/cut_sprite_sheet.py`
  learnt to erase the thin dark lines some generated sheets draw round and between their frames
  (any column dark in 85% of its height). The Cistern Warden's dark body made two columns look
  like such a line, so they were erased right through him in his second frame. A frame line now
  also needs background just beside it (8px each side, the sheet's edge counting as background).
  Checked against every source sheet: only the warden's false line is dropped, and every real
  frame line is still found. The warden was cut again from the owner's image.
- **A clear gutter between frames.** The game scales sheets down. With smoothing, a pixel or two
  of the next frame shows at a frame's side, so art touching a frame's edge flickered as a thin
  line while creatures animated. Most sheets, including the old forest ones, had art within a
  few pixels of an edge. The new `tools/pad_sprite_frames.py` shrinks each frame of a sheet by
  the same amount (2–5%) about its bottom-centre, leaving at least 14px clear at the sides and
  top. Sheet sizes are unchanged, and two sheets that already had room were left alone.

## Round 199: the Gear screen lists only gear you have found

- The Gear collection used to list all 12 pieces, with "Undiscovered …" placeholders for the
  ones you didn't have. It now shows only the gear you own. With nothing found yet it says
  "No gear found yet. Each mini-boss guards a piece." The HUD objective still names each world's
  two pieces and who guards them (`assets/gear.js`).
- `tests/gear.test.cjs` checks that unfound gear isn't listed and that an empty collection says
  so. `gear.js` cache tag is now round199.

## Round 198: God Mode

A main-menu option (also on the start screen) for trying the game out, from `assets/god-mode.js`
(loaded last).

- **Any card wins.** Playing any card, from the hand or the side deck, wins the fight at once,
  bosses included, with the usual rewards. Cards you couldn't afford can be clicked too. The
  card's own effect is skipped.
- **Every Nexus Waypoint** in every world is unlocked, so you can travel anywhere straight away.
- **Every map is revealed**: each world's rooms all count as visited.
- **Nothing is saved.** On entering, the journey is saved where it stands. After that, writes to
  the game's save and material keys are ignored, and export and import are off. Leaving God
  Mode reloads the page, and reloading rolls back to that save. Started from the start screen,
  God Mode plays a fresh journey that is never stored. A ⚡ GOD MODE badge shows while it is on.
- Tests: new `tests/god-mode.test.cjs` (cards don't win without it; any card wins with it, a boss
  counts; all waypoints and maps are open, including after a waypoint trip to another world;
  nothing reaches the save; export is off; the save is the pre-God journey). In the browser:
  storage is byte-for-byte unchanged through a God session, and leaving or reloading resumes
  the journey from before.
- Also fixed two tests after Round 197's new Sky Isles map:
  - `tests/crystals-touch-boss.test.cjs` still expected 54 Sky Isles rooms (51 now).
  - `tests/walk-past.test.cjs` picks the Sky Isles shrine room, then loops through every world. Its
    closing redraw ran in Chronospire, where that room (7,1) doesn't exist. It now goes back to
    the Sky Isles first.
- All five other worlds' walks (`tests/playtest-walk.cjs`) are clean after Round 197's gear
  placement change.

## Round 197: the Sky Isles are painted, with diagonal walkways

The Sky Isles now use the owner's top-down tiles instead of stand-ins, and three edge rooms are
cut so the map is less rectangular (51 rooms, as in Solaris).

- **The owner's tiles** (2624x1632, `assets/environment/sky/src/`): two crosses, the corner,
  straight, T to the right and T downward, and four dead-ends to the right. They are strictly
  top-down with every walkway leaving its edge at the exact middle, so they flip both ways.
- **Made from them** by the new `tools/prepare_sky_tiles.py` (no dead-end-from-below or diagonal
  tiles came back from the generator):
  - `dead-bottom-a/b/c`: three of the dead-right paintings turned a quarter turn, cropped round
    the lookout and scaled back up. Their sources are kept in `src/rotate/`.
  - `src/diagonal/diag-se/nw/sw`: the corner tile with a third walkway from its bend to that
    corner of the image. The walkway is a strip of the straight tile turned to point at the
    corner, so its stones and rim match, and the cross tile's round plaza is laid over the joint.
  - Walk masks for every tile, traced by colour: the marble and its rim are warm grey, clouds
    white-blue and islands green. An opening drops island cliffs and props, padded so it does not
    eat the room edges. Some walkways start at an island's edge rather than the image's (the left
    arm of the T and cross tiles), so each exit also gets a walkway-wide strip across the grass to
    its edge.
- **Corner cuts and diagonals in tile worlds** (`tools/build_tile_world.py`):
  - A world may list `cut` rooms. As in Solaris, the two rooms beside each cut are joined by a
    diagonal exit, and each diagonal door (where the painted walkway leaves the room) goes into
    the data's `diag` table.
  - The Sky Isles cut 8,0 and 8,5 (two corners) and 2,5 (a notch in the bottom edge). Of all the
    choices, these need the fewest diagonal paintings (three).
  - `top_down` worlds may flip diagonal tiles both ways.
- **Engine.** `assets/solaris.js`'s diagonal doors read the active world's table
  (`worldDiagTable()`: `SOLARIS_DIAG` in Solaris, `TILE_WORLD_DATA[world].diag` in a tile world).
  Entering, arriving clear of the door, the ↗ labels and tap routes all work as in Solaris.
- **Saves.** A save standing in a cut room resumes at Windgate Landing, and cut rooms leave the
  visited lists (`dropCutRooms` in `assets/tile-worlds.js`). Without this, such a save would have
  failed to load ("Invalid room").
- **Gear kept clear of its guard.** In a corner tile the only open ground near the requested spot
  is beside the bend, where the mini-boss stands. When a relic lands within 60px of a patrol it
  is placed again, at least 90px (else 70px) away (`assets/neon-world.js`). Relics elsewhere don't
  move.
- The corner painting is used in 18 rooms. A second version would cut down the repetition.
- Tests: new `tests/sky-diagonals.test.cjs` (51 rooms, no stand-ins, three links both ways that
  arrive on the walkway, the save migration, Solaris keeping its own doors). `tile-worlds` expects
  51 Sky rooms. `node tests/playtest-walk.cjs sky`: 51 rooms, 375 crossings, no problems.
  Cache tags for `solaris.js`, `sky-data.js`, `tile-worlds.js` and `neon-world.js` are now round197.

## Round 196: the Sky Isles creatures get their own art

- **Seven new sheets** in `assets/monsters/sky/`, from the owner's prompts: the Sunfeather Drake,
  Cloud Wisp, Gale Harpy and Thunderhorn Ram, the Stormbell Warden and Featherfall Matriarch
  mini-bosses, and the Zenith Roc final boss. They replace the forest animals that the Sky
  Isles drew with a blue hue shift (`SKY_TINT`, now gone).
- **How they are wired:** `tile-worlds.js` adds art-only keys to `WILDLIFE_ART` (`skyDrakeArt`
  and so on) with `tint: 'none'`. In `elaris-wildlife.js`, a sheet name with a folder
  (`sky/zenith-roc`) is read from that folder under `assets/monsters/`. `big: true` draws the
  Zenith Roc in the larger boss box that the Bloom Tyrant uses.
- **Cutout tool:** some of these sheets had thin dark lines round and between the frames.
  `tools/cut_sprite_sheet.py` paints any line that is dark along 85% of a row or column as
  background, and reads the background colour a few pixels inside the edge. The Solaris magenta
  sheets were re-cut with this version, so the tool still reproduces every file.
- `tests/tile-worlds.test.cjs` now checks that all seven Sky Isles enemies use their own
  untinted sheets of four 3:4 frames, and that the Roc gets the boss box. Cache tags for
  `elaris-wildlife.js` and `tile-worlds.js` are now round196.

## Round 195: the rest of the Solaris roster gets its own art

Every Solaris enemy now has the owner's own sheet; none borrow forest art any more.

- **New sheets** in `assets/monsters/elaris/`, cut from the owner's magenta-background sheets
  with `tools/cut_sprite_sheet.py`:
  - `mirage-ibis.png`: the Mirage Ibis (`drownedHeron`), a Thoth-style ibis with an ankh staff
    and a heat-haze shimmer.
  - `dune-scorpion.png`: the Dune Scorpion (`blightAntler`), with a glowing copper stinger.
  - `cistern-warden.png`: the Cistern Warden mini-boss (`tidewardenElaris`), a brass golem with
    water sloshing in its tank.
  - `noon-toller.png`: the Noon Toller mini-boss (`galeSovereign`), a bell-headed knight with a
    hammer. Its cycle went from .7s (the moth's flutter) to 1.2s, to suit a heavy walk.
  - `sun-pharaoh.png`: the Sun Pharaoh final boss (`bloomTyrant`), whose sun halo grows across
    the frames. `encounter-depth.js` now gives it this sheet; `forestTyrant` keeps the old Bloom
    Tyrant sheet for the Sky Isles, Elaris, Vespera and Chronospire bosses.
  - `dust-devil.png` was re-cut from the owner's sharper copy of the same sheet.
- **Tool changes:**
  - The magenta key reads the background colour from the sheet's border, so purple-magenta
    backgrounds (the ibis) work too.
  - Despill only touches magenta-ish pixels (red and blue both above green). Gold, orange glows,
    the Pharaoh's blue stripes and the golem's water keep their colour.
  - `--no-floor` removes the painted stone floor tile the golem and the knight stood on: in the
    bottom sixth of the sheet, cool and magenta pixels go, while brass, dust and sand stay.
  - Specks under 12 pixels are dropped.
  - All the magenta sheets were cut with the final version, so the tool reproduces every file.
- The sheets are 2064x688 (four 516x688 frames) and 170 to 285 KB each.
- Tests: `elaris-wildlife` checks all thirteen sheets and which species uses each (the forest
  keys keep the old sheets); `solaris-roster` checks the Pharaoh's sheet; `rebalance` now expects
  the mini-bosses' own sheets. `ELARIS-ART.md` marks every planned sheet as in. Cache tags for
  `elaris-wildlife.js` and `encounter-depth.js` are now round195.

## Round 194: the Dust Devil gets its own sprite sheet

- **New art.** The owner's 4-frame Dust Devil sheet (a sand tornado with glowing eyes and
  orbiting rocks) is now `assets/monsters/elaris/dust-devil.png`, used by `stormMoth` (Dust
  Devil, Solaris). The Noon Toller and the other worlds keep the moth sheet for now.
- **Magenta backgrounds.** This sheet was drawn on flat magenta, and saved as a JPEG.
  `tools/cut_sprite_sheet.py` now chroma-keys magenta sheets. JPEG blur mixes magenta into
  outlines and the thin dust rings, so red and blue are capped against green to take the pink
  back out, and soft edge pixels take the colour of the nearest solid pixel.
- **Frame shape.** The sheet was 2000x496 (square frames). The game draws sprites in 3:4 boxes,
  so the tool pads short sheets to 3:4 with the creature standing near the bottom, as the other
  sheets do.
- Colour under fully transparent pixels is now blanked before the 256-colour palette is made,
  so the palette goes to the creature. The scarab sheet was re-cut with the updated tool.
- `tests/elaris-wildlife.test.cjs` checks the Dust Devil sheet, and that the moth sheet stays for
  the other worlds. `elaris-wildlife.js` cache tag is now round194.

## Round 193: the Solar Scarab gets its own sprite sheet

- **New art.** The owner's 4-frame Solar Scarab sheet (a brass beetle rolling a sun-ball) is now
  `assets/monsters/elaris/solar-scarab.png`, and `cinderFox` (Solar Scarab, Solaris) uses it in
  rooms and battles. Vespera and Chronospire still use the fox sheet through `forestFox`.
- **Cutting the background.** The sheet came on a fake checkerboard with a soft white glow
  round the creature. Keying out the near-white background left a grey halo, and it punched
  holes in the bright centre of the sun-ball. `tools/cut_sprite_sheet.py` instead keeps the
  creature's coloured and dark pixels, fills holes (so the ball stays solid), feathers the edge
  by about a pixel, and saves a 256-colour PNG (180 KB instead of 1 MB). Use it for the
  next Solaris sheets.
- `tests/elaris-wildlife.test.cjs` accepts any sheet of four equal upright frames (the owner's
  sheets are 2000x667, the forest ones 2172x724), and checks that the scarab has its own sheet
  and that the fox sheet stays for the other worlds. `elaris-wildlife.js` cache tag is now round193.

## Round 192: Solaris diagonals, no flash of old room art, glowing items

- **Solaris corners cut, with diagonal roads.** The owner asked for a less rectangular map.
  - Rooms 0,3 Copper Wells, 8,3 Radiant Crossing and 5,0 Halo Court are gone (Solaris now has
    51 rooms). All three were corner rooms on the outer edge, with nothing in them.
  - The two rooms beside each cut are joined by a diagonal road: 0,4 ↔ 1,3, 7,3 ↔ 8,4, and
    4,0 ↔ 5,1.
  - Those six rooms use the owner's new diagonal paintings in
    `assets/environment/solaris/src/diagonal/`: `diag-corner-a`, `diag-t-a` (two versions)
    and `diag-t-b` (two versions). Only side-to-side flips are used.
  - Room 4,0 takes a mirrored `diag-t-a`, whose extra north road runs off the top of the map as a
    painted dead end, so no `diag-corner-b` painting was needed.
- **How the diagonal doors work.**
  - `tools/build_solaris.py` cuts the rooms (`CUT`), links the neighbours, picks diagonal tiles
    (`DSHAPES`), and writes each diagonal door, the spot where the painted road leaves the room,
    to `SOLARIS_DIAG` in `assets/solaris-data.js`.
  - In `assets/solaris.js`, walking into a diagonal door (within 36px) takes you to the partner
    room. You arrive a short way along its diagonal road, clear of its door, so you never bounce
    straight back. It reuses the corner-exit code from `assets/diagonals.js`.
  - Diagonal exit labels (↗ ↖ ↘ ↙ plus the room name) sit at their doors; tapping one walks you
    through.
  - Where a diagonal leaves through the same edge as a straight exit (rooms 1,3 and 7,3), the
    straight door ignores that stretch (`organicDoorExcluded`, a new hook in
    `assets/organic-paths.js`).
  - The map draws the diagonal links on its own.
  - Enemy levels are re-spread by walking distance, and the Solar Crown stays at 18.
  - Old saves standing in a removed room resume at Dawnfire Gate (the existing check on Solaris
    room keys).
- **No more flash of old art on entering a room** (new `assets/room-preload.js`). A room's ground
  was first drawn with the old district or forest art, and its own painting replaced it once the
  image loaded, so on a first visit the old art showed for a moment. Two fixes:
  - While the painting loads, the room now shows its world's plain ground colour.
  - The paintings of the rooms next to you start loading as soon as you arrive, so they are
    usually ready before you walk in.
  - This covers Solaris, the tile worlds and Neon Aftermath's repainted rooms.
- **Items glow.** Points of interest (data terminals, shrines, caches and so on), map chests and
  relic/gear markers now have a white rim and a slow pulsing glow: cyan in Neon Aftermath, warm
  gold elsewhere. Point-of-interest art is drawn at 52px (was 44). Used ones are greyed at 80%
  opacity (was 45%), so they stay readable. With reduced motion the glow is steady.
  (`assets/layout-polish.css`.)
- **No dotted footpaths.** The footpath lines from the street to each item in Neon Aftermath's
  painted rooms (Round 101) are no longer drawn. The paths are still walkable in the mask.
- Tests: new `tests/solaris-diagonals.test.cjs`. `expansion` updated for 51 Solaris rooms.
  `tests/playtest-walk.cjs` now also walks diagonal doors; for Solaris: 51 rooms, 374
  crossings, no problems, no page errors.

## Round 191: four new Solaris road paintings

- The owner painted four new Solaris road tiles. They are added to the kit in
  `assets/environment/solaris/src/`, and `tools/build_solaris.py` now spreads 11 rooms over them:

  | Tile | Shape (exits as painted) | Rooms |
  |---|---|---|
  | `t-right-b` | north, east, south: market quarter with striped awnings | 8,1 · 1,4 · 3,4 · 7,4 |
  | `corner-c` | north, east: brick-paved road through walled courtyards | 2,0 · 6,0 · 3,3 · 6,3 |
  | `t-bottom-c` | east, south, west, with a short stub north (the cliffs close the top) | 4,4 · 1,5 · 3,5 |
  | `dead-top-b` | north, ending in a ring plaza | 3,2 |

  Before this, one T-junction painting covered 10 rooms and the two corner paintings 8 each.
- The images arrived 16:9 (2000x1116 and 2752x1536). Each is cropped to the kit's 16:10 around
  its vertical road, so the roads still leave at the middle of each edge.
- `corner-c` is laid in bricks with grout lines, which the colour tracer cannot read (it came out
  patchy, and the two halves did not meet). Its walk area is drawn by hand in `MANUAL`. The
  stone rings in the middle of `dead-top-b` and `t-bottom-c` are added to the traced roads in
  `EXTRA`.
- Checked:
  - Solaris, organic-path, item-placement, relic, gear and exploration tests pass.
  - `tests/playtest-walk.cjs elaris`: all 54 rooms, 386 crossings and 68 item routes, with no
    problems and no page errors.
  - Screenshots of the new rooms in the game.

## Round 190: Chronospire card paintings from achubu/Cardbound

- Checked `achubu/Cardbound` again (commit eb48d8d, "Expand Chronospire card illustrations").
  It added 24 paintings for all seven Chronospire Suspend cards:
  - Chrono Spike, Clockwork Volley, Delayed Bulwark, Future Sight, Rewind Mend and Temporal
    Barrage now have paintings at all four levels.
  - Accelerate has levels 0 and 1; level 1 is reused at levels 2 and 3, as in Cardbound.
- `refreshedCardArt` now lists 110 paintings. The placeholder PNGs these replace moved to
  `unused assets/assets/cards/`. `cards.js?v=` tag bumped to round190.
- Cardbound's other new commit adds a "card concept lab" to its compendium. That is code, not
  art, so it was not taken (this repo only takes images from Cardbound).
- `card-art` test: Accelerate is now its example of a card with fewer paintings than levels.

## Round 189: Cinder Lance chains into a daze

- Cinder Lance (1 energy, Fire, drops in Solaris) was a weaker Sunflare. Now play two Cinder Lances
  in the same turn and the enemy is dazed: its attack that turn deals 50% less damage. It works on
  every enemy, bosses included, and an enemy can be dazed at most once every 3 turns. The intent
  bubble shows the lower number. A "✸ Chain" tray in battle shows the count and the recovery
  turns (new `assets/stagger.js`). The card is now 6/7/9/11 damage with Burn 2 (Burn 3 at level 3);
  it was 5/7/9/11 with Burn 2.
- Designs tried in the Difficulty lab first (sim only):
  - Stun on any 3 attacks in a turn: Chronospire bosses went from 30-49% to 88-100%.
  - Stun on every 3rd copy played in a fight: one copy was enough, because the same card counts
    again each time it is reshuffled. It took the Featherfall Matriarch from 47% to 100%.
  - The owner's version, two copies in one turn, needs more than one copy in hand at once.
- The daze strength was swept with decks that carry three Cinder Lances. Boss win rates averaged
  over Solaris to Chronospire: 0% (no daze) 19, 25% 25, 50% 32, 75% 35, against 37 for normal
  decks. 50% makes the three-Lance build nearly as good as a normal deck. 75% makes the Zenith Roc,
  the Featherfall Matriarch and the Tempest Colossus too easy with it (55-66%). In Solaris (7-card
  decks) and Chronospire it stays weaker than a normal deck at any strength: the three slots cost
  more than the daze gives.
- Normal decks are unchanged (they hold at most one Cinder Lance, which never chains).
- Tests: new `tests/stagger.test.cjs`. `talent-matrix` updated for Cinder Lance's new 6 base
  damage. The compendium's mechanics list explains the chain.

## Round 188: the unused Reversal cards are gone

- The four single-element counters (Fire, Water, Earth and Air Reversal, `counter_<element>`) were
  left over from before the Prismatic Counter. No drop, reward pool or starting deck used them, but
  they still showed in the compendium's card gallery. They are removed from `defs`, and their art
  moved to `unused assets/assets/cards/`. The compendium now lists 90 cards.
- Old saves that still hold one still load. `validateImport` checks every card id, so it now runs
  `normalizeElementalCards` first. That turns the Reversals into one Prismatic Counter (keeping the
  copy in the deck), including cards inside a battle in progress. The "Elemental counters
  combined" message still shows.
- Tests: new `tests/retired-cards.test.cjs`. `expansion` and `combat-balance` now use the
  Prismatic Counter, or a hand-made old card for the migration check.
- On phones up to 480px wide, the Character screen's talent tree used to run about 76px past
  the edge and needed a sideways swipe. Its nodes are now smaller, so a five-path branch fits
  (`assets/layout-polish.css`).
- Bug hunt, nothing else found:
  - a random-play battle fuzzer: about 25,000 actions in short fights across all six worlds,
    plus about 90,000 in long fights with a near-unkillable player;
  - `tests/playtest-walk.cjs` for all six worlds: every room, about 2,300 crossings, every item
    reachable, no page errors;
  - a 390x844 sweep of every menu and battle screen in every world, looking for anything
    wider than the screen.

## Round 187: playtest fixes for phones, desktop and the Hack gift

From a browser playtest at 1280x800, 390x844 and 360x640 (items 1-6 of the playtest report).

- **The Hack gift (bug from Round 185).** The starting deck is full (6/6), so Packet Sniff and
  Ghost Protocol go to the collection; the log used to say "now in your deck". The log and the
  arrival screens now say where the cards went (`giftPlacement`). Neon Aftermath's gift also
  marked the Hack guide as seen, so it never opened. Now the "New mechanic: Hack" screen opens
  once you leave the reward screen (`state.pendingMechIntro`, shown by a `finishBattle` wrapper).
  `mechanicGift` returns `{ placed }`, or false if the world's gift was already given.
- **Mechanic guides on phones (bug from Round 185).** The "How it works" box now goes below the
  hand instead of above it, so the cards stay on screen. Only one guide opens by itself at a time.
  The trays are one compact row on phones.
- **Phones, the map.** The room now fills the space between the HUD and the controls, at least
  380 room pixels wide, instead of sitting in the top half with a 300px black band below it. The
  HUD is shorter and no longer covers the room. On short phones the part of the room that does not
  fit is clipped instead of drawing under the HUD. New `assets/layout-polish.js` replaces
  `updateAreaCamera`; it measures the HUD and menu row and re-measures when they change size.
- **Phones, battles.** The side deck folds into one row above the hand ("Show" / "Hide"). The
  enemy-move boxes show one line of their affliction (tap a box for the rest). The "Your hand"
  header is hidden and the card art is a little shorter. At 390x844 the hand now starts at y=400
  (was 451, with the side column taking a third of the width) and whole cards fit above the
  footer. The enemy portrait is larger.
- **Desktop.** The room sits below the top menu row, so the menu no longer covers the north exit
  label (Saltwind Docks in the start room). "Art credits" moved from the top row into the main menu.
- **Desktop.** The on-screen arrow pad only shows in touch mode.
- Styles: new `assets/layout-polish.css`, loaded last. Tap-to-move was re-checked at all three sizes.
- Tests: new `tests/layout-polish.test.cjs`. Screen placement (guide below the hand, folding
  side deck, no gap under the room) was checked with Playwright screenshots.

## Round 186: 23 more paintings from achubu/Cardbound

- Checked `achubu/Cardbound` again (commit f3495b8, "Complete tracked card art upgrades").
  It added 23 card paintings; all are wired in (`refreshedCardArt` in `assets/cards.js`):
  - Level 1, 2 and 3 paintings for seven cards that had only their level-0 painting: Arc
    Bulwark, Lunar Edict, Mirrorguard, Phantom Resonance, Prism Lance, Sovereign Gale and
    Tidebound. Their art now changes as they level up, like the other refreshed cards.
  - Real art for two Chronospire Suspend cards, Temporal Barrage and Clockwork Volley. Cardbound
    painted only level 0 and uses it at every level; so does this game. Their placeholder PNGs
    moved to `unused assets/assets/cards/`.
- There were no other new images (no new monsters, rooms, items or side cards).
- The 20 world-mechanic cards from Round 185 have no Cardbound art yet and keep their placeholders.
- `cards.js?v=` tag bumped to round186. `card-art` test updated (86 refreshed paintings; Temporal
  Barrage is now its example of a card with one painting).
- Fixed a flaky `crystals-touch-boss` test caused by Round 185. It fights a random Solaris enemy,
  and when that was the Solar Scarab, the new Sunstroke affliction cost 2 HP on a charging turn
  that the test expects to cost nothing. The test is about counters, so it now clears that
  fight's afflictions.

## Round 185: a card mechanic for every world

Every world now has its own card mechanic, like Chronospire's ⏳ Suspend (new
`assets/world-mechanics.js`, loaded after `world-cards.js`):

| World | Mechanic | How it works | Cards | Works against it |
|---|---|---|---|---|
| Neon Aftermath | ⌁ Hack | Hack cards add Glitch to the enemy. At 5 it crashes and skips its next action; each crash patches it (+2 to the next limit). | Packet Sniff, Logic Bomb, Ghost Protocol, Zero Day | 🛡 Firewall (Crown Observer, Crown Sentinel): wipes Glitch, +1 to the limit |
| Solaris | ☀ Heat | Heat cards build Heat (max 6, lasts between turns). Your next attack sears for 2 per Heat (Noon Blaze: 3) and spends it. | Sunstoke, Scorching Sands, Heatwave, Noon Blaze | 🥵 Sunstroke (Solar Scarab, Noon Toller): lose your Heat and 1 HP for each; with none, lose 2-4 HP |
| Sky Isles | 🪶 Tailwind | Every card played adds 1 Tailwind this turn. Tailwind cards get a bonus per card already played (up to 4). | Gust Chain, Slipstream, Wind Wall, Skydive | 🌬 Headwind (Cloud Wisp, Featherfall Matriarch): your first 2 cards next turn add none |
| Elaris | 🌱 Growth | Growth cards grow each time you play them in a fight (up to 4 times). | Sapling Strike, Barkskin, Bloom Mend, Ancient Oak | 🍂 Blight (Storm Moth, Gale Sovereign): your most-grown card withers; with none, lose HP |
| Vespera | ⚡ Stormcharge | Stored charge (max 20, lasts between turns) strikes back, ignoring Armor, when an enemy attack lands. Lightning Rod lets it out now. | Static Coil, Capacitor Spark, Thunderhead, Lightning Rod | ⏚ Dampen (Arc Wisp, Resonant Phantom): half the charge drains; with none, −1 Aether |
| Chronospire | ⏳ Suspend | unchanged (`assets/chronospire.js`) | | ⟲ Rewind |

- The 4 cards of each mechanic join that world's reward pool (`VARIETY_POOLS`, `NEW_CARD_WORLD`).
- Arriving in a world through its portal gives two of them and opens a "New mechanic" screen with
  a 3-step guide (`mechanicGift`). In Neon Aftermath, Packet Sniff and Ghost Protocol come with
  your first win. A save that loads inside a world it has not had the gift for gets it then. The
  cards go into the deck only when it has room; otherwise they wait in the collection.
- In battle, a tray above the hand shows the mechanic's count (Glitch, Heat, Tailwind, Growth,
  Stormcharge) with a "How it works" guide that opens by itself the first time you hold one of its
  cards. The cards carry a badge (Growth cards show how much they have grown). Tailwind and Growth
  change the numbers on the card face live.
- Rules text explains each keyword. Compendium → Mechanics has an entry for each.
- Placeholder art for the 20 cards (`tools/generate_world_card_art.py`; it now writes only
  missing files, because painting is not deterministic; `--force` repaints all of them).

Balance (Difficulty lab, gear worn):
- The lab's decks get the two arrival cards at the end, as the game does (they join only if the
  deck has room). Putting them first pushed Rootbind and Riposte out of the 7-card Solaris deck and
  dropped the Cistern Warden from 44% to 0%.
- The mechanic afflictions replaced one rider on five mini-bosses, and three of them got easier.
  Re-tuned health: Crown Sentinel ×1.29 → ×1.45 (53% → 43%), Resonant Phantom ×1.25 → ×1.7
  (60% → about 41%), Noon Toller ×1.22 → ×1.35 (53% → 44%). The Featherfall Matriarch and the
  Gale Sovereign stayed on target. Every other fight in all six worlds stayed on target too.
- The Node sim (`tests/talent-sim.cjs`) now loads `sun-revenant.js`. Without it the Sun Pharaoh's
  Entomb was undefined and the Node report stopped at that fight. The browser lab already loaded it.

Tests: new `tests/world-mechanics.test.cjs`. `expansion` (the first-win gift is marked taken
before the reward-choice check) and `card-variety` (52 world reward cards) updated.

## Round 184: playtest fixes for pathing and things beside the path

- Owner request: playtest for bad pathing, poor placement of interactable items, and bugs.
- **New `tests/playtest-walk.cjs`** (Playwright, run on demand):
  - In every world it walks the hero with the game's own tap-to-move routes
    (`setTouchDestination` + `move()`) through every door, from every spot where the hero
    actually arrives.
  - From each arrival it tap-routes to every item in the room, and checks placement:
    overlaps, patrols, the portal, and the HUD panel or minimap on a 1280×800 screen.
  - It opens every menu in every world.
  - Each run covers 6 × 54 rooms, about 820 arrivals, 2,321 door crossings and about 390 item
    routes.
- **Found and fixed:**
  - **Walking past something stopped a tap route.** A point of interest, the merchant, a
    Nexus Waypoint or the Cardsmith opens when you come within 40px. Items stand 12-28px off
    the path, so any tap route along that path opened them and cancelled the route; you had to
    close the menu and tap again. On a phone this hit about 70 crossings per world.
    - Now a tap route only opens what was tapped: `touchPassingBy()` and `touchTapped()` in
      `touch-controls.js`, checked in `exploration.js` and `cardsmith.js`.
    - Walking with the keys still opens what you walk into.
  - **Used points of interest popped up every time** you walked past ("You have already used
    this."). They now show a short note instead; tap one to look again.
  - **Items under the HUD or the minimap:**
    - Seen in Neon Aftermath: the start Nexus at 658,383, and lore and campfires at 102-179,
      117-120.
    - Seen in Solaris: a cache at 140,166.
    - Fix: new `screenCovered(x, y)` in `organic-paths.js` (top-left 225×180, bottom-right
      from 650,350). `organicItemSpot()` avoids those areas when a room has another spot, and
      Neon Aftermath's painted spots skip them.
    - In a Neon Aftermath room whose only painted spots are covered, the point of interest goes
      to another room. The Nexus keeps its place if there is no other spot.
  - **Two Neon Aftermath chests had a patrol standing on them:** Billboard Steps 5,4 (18px)
    and Pagoda Court 3,7 (16px), so reaching them started a fight. A painted chest spot is now
    used only when no patrol stands within 70px; otherwise the chest keeps the patrol-clear spot
    beside the street.
- **After the fixes, three runs with different seeds:** every room in every world was visited,
  every door crossed, every item reached, with no walk-past popups, no placement problems, no
  page errors and no menu errors.
- **Not covered by the walk:** patrols move and collide only in the animation loop, which the
  walker doesn't run, so walking into patrols isn't exercised. Combat is covered by the other
  suites and the Difficulty lab.
- New `tests/walk-past.test.cjs`: tap routes, used points of interest, and HUD, minimap and
  patrol clearance over three seeds in all six worlds.
- Cache tags bumped to `?v=round184`.

## Round 183: every boss re-tuned with gear worn

- The Round 182 report showed that, with gear worn, every mini-boss and final boss from
  Solaris on was too easy. It also showed Neon Aftermath's two mini-bosses the wrong way
  round: the Lunar Enforcer won 8%, the Crown Sentinel 100%.
- Owner request: Neon Aftermath's three bosses at about **40%**. Everything else keeps the
  usual targets: mini-bosses about 42%, final bosses about 29%.
- **How:** each boss's health (`BALANCE.perEnemy`) was bisected in the Difficulty lab: real
  battles in the browser, gear worn, 16 builds × 2 styles × 6 fights.
- **Cistern Warden:** its win rate barely moved with health (still 51% at 4.5×), because its
  base attack (11) is the weakest of any boss at its level. It gets **health 2.4× and +7
  attack** (538 HP, 37 attack), which wins 44%.

  | Boss | Health | Wins with gear |
  |---|---|---|
  | Lunar Enforcer | .73 → .55 | 8% → 40% |
  | Crown Sentinel | .72 → 1.29 | 100% → 40% |
  | Thorn Warden | .95 → .75 | 31% → 41% |
  | Cistern Warden | 1.4 → 2.4, +7 attack | 92% → 44% |
  | Noon Toller | .82 → 1.22 | 73% → 42% |
  | Sun Pharaoh | .77 → .96 | 51% → 31% |
  | Stormbell Warden | .65 → .76 | 52% → 42% |
  | Featherfall Matriarch | .78 → .94 | 72% → 42% |
  | Zenith Roc | .42 → .50 | 59% → 31% |
  | Tidebound Warden | .91 → 1.15 | 87% → 41% |
  | Gale Sovereign | .65 → .78 | 64% → 43% |
  | Bloom Tyrant | .58 → .70 | 58% → 29% |
  | Arc Sentinel | .72 → .90 | 66% → 42% |
  | Resonant Phantom | .99 → 1.25 | 72% → 42% |
  | Tempest Colossus | .45 → .63 | 49% → 28% |
  | Clockwarden | .85 → 1.16 | 84% → 42% |
  | Paradox Twin | .93 → 1.28 | 83% → 43% |
  | Chronarch | .47 → .62 | 60% → 29% |

- **Result:** a full lab run puts **all 80 encounters on target**. `DIFFICULTY-REPORT.md` is
  regenerated from that run.
- The lab judges the Thorn Warden against 34-50%, through the new `SIM_TARGET_BY_WORLD` in
  `assets/sim/lab.js`.
- `tests/balance-sim.cjs` still plays without gear, so it now reads these bosses as hard. Tune
  bosses with the lab, which wears gear like a player does.
- Cache tags bumped to `?v=round183`.

## Round 182: the Difficulty lab, and a difficulty report for every enemy

- Owner request: test the whole game and break down the difficulty of every enemy, each
  fought at the player's own level, with all the items available by then, and with the talent
  trees used up to that level. Owner request: run it from the compendium whenever wanted.
- **Compendium → Difficulty lab** (new section and nav link):
  - Pick a world or all worlds, and how many fights per build and style. Press **Run**.
  - It plays real battles in the compendium's hidden game frame and fills a table: each
    enemy's HP and attack at that level, typical win rate, best and worst build, average
    turns, HP left when won, gear worn, and a verdict against the targets.
  - **Copy results** gives tab-separated rows for a spreadsheet.
  - All six worlds at 6 fights take about 100 s.
  - While it runs, saving, drawing and storage writes in the frame are switched off, and
    every `aethercede-` key is restored afterwards. A journey in another tab is never
    touched; a planted save stayed byte-identical in the browser check.
- **Shared code:**
  - `assets/sim/bot.js`: the sim's bot, moved out of `tests/talent-sim.cjs`.
  - `assets/sim/lab.js`: the 16 builds, decks, earlier bosses and side cards, moved out of
    `tests/balance-sim.cjs`. It also holds `simEncounters()` (every encounter, with the gear
    available by then) and `simEncounterRun()` (all builds and styles, one step at a time).
  - The balance sim reads its settings from `lab.js`, and gives identical results (Lunar
    Enforcer check before and after).
  - The game itself does not load these files.
  - `tests/talent-sim.cjs` also loads `gear.js`. Gear does nothing unless a piece is owned.
- **New `tests/difficulty-report.cjs [fights] [world]`:** the same lab from the command line.
- **The report:** `DIFFICULTY-REPORT.md` lists all 83 encounters, 15,936 battles at 6 fights
  per build and style. 17 are off target:
  - **Neon Aftermath's mini-bosses are swapped in difficulty.** The Lunar Enforcer (Lv 5)
    wins 8% (too hard) and the Crown Sentinel (Lv 7) 100% (too easy). This was already so
    before this session (8223aab, Round 170) and does not depend on gear (98% without it).
  - **With gear worn, every mini-boss and final boss from Solaris on reads too easy:**
    - Mini-bosses: 52-92%.
    - Final bosses: the Sun Pharaoh 51%, Zenith Roc 59%, Bloom Tyrant 58%, Tempest Colossus
      49%, Chronarch 60%.
    - These were tuned in Rounds 177 and 181 without gear (about 42% and 29%), so the gear
      boosts roughly double the boss win rates.
    - Regular fights are all on target.
- New `tests/difficulty-lab.test.cjs`: every world's encounters and their gear, and one
  encounter run end to end.

## Round 181: mini-boss balance after the Vespera and Chronospire rebuild

- On the new maps the Arc Sentinel and the Clockwarden stand 2 levels higher than before
  (41 and 50). In the fair-level sim that made them slightly easy (53% and 55% wins; target
  34-50%). Chronospire's level 53 regular fights (the Thunder Mauler's zone) read slightly
  hard at 24%.
- Measured with `tests/balance-sim.cjs` (12 fights per build and style):

  | Enemy | Health | Wins |
  |---|---|---|
  | Arc Sentinel | .69 / .74 / .79 | 53% / 37% / 32% |
  | Clockwarden | .82 / .88 / .94 | 55% / 34% / 30% |
  | Thunder Mauler | .88 | level 53 regular fights 38% |

- Set to **Arc Sentinel .72** and **Clockwarden .85**, between the measured points (about
  42% expected), and **Thunder Mauler .88**.

## Round 180: 46 refreshed paintings from achubu/Cardbound

- Pulled the card art we were missing from `achubu/Cardbound` (its 2026-10-17 art refresh).
  No other files in its `assets/` were new to us, and its card definitions match ours.
  - **36 card paintings** (512 × 512 WebP). Complete four-stage sets for Rootbind, Static,
    Storm Battery, Tempest Surge, Tidecall and Verdant Pact; the missing stages for Static
    Shield (1), Thornlash (3) and Wildfire (0, 2, 3); and base paintings for Arc Bulwark,
    Lunar Edict, Mirrorguard, Phantom Resonance, Prism Lance, Sovereign Gale and Tidebound.
    Stages not painted yet reuse the nearest painted stage, as before.
  - **All 10 side-deck cards:** `sideArtPath()` (`aether-deck.js`) now points at `.webp`.
- `refreshedCardArt` (`cards.js`) lists 63 painted stages across 21 cards; 13 cards have all
  four stages.
- The 52 replaced card PNGs and 10 side-card PNGs moved to `unused assets/assets/cards/`,
  under their old paths.
- `assets/cards/art-refresh.md` and `tools/art-refresh/prompts.json` were synced from
  Cardbound. Still to come there: levels 1-3 for the seven single-stage cards, and the
  Chronospire set.
- Cache tags bumped to `?v=round180` in `index.html` and `compendium.html`.
- `card-art` checks every painting is wired in and every side card uses its painting.

## Round 179: Vespera and Chronospire are tile worlds too

- Owner request: every world is built like Solaris. Vespera and Chronospire are rebuilt from
  road tiles with `tools/build_tile_world.py vespera|chronospire`:
  - **Vespera** uses Neon Aftermath's layout as it is: start 0,1, mini-bosses 5,3 and 8,5,
    the Tempest Colossus at 8,0.
  - **Chronospire** uses it turned on its side, a tall 6×9 spire: start 1,0, mini-bosses 3,5
    and 5,8, the Chronarch at 0,8.
  - Each has 54 rooms. Rosters, levels (37-45 and 46-54) and gear stay the same.
  - The builder now handles turned layouts, grids of any size, and a new `straight-h`
    (east-west) tile shape.
- **Placeholder tiles:** `tools/paint_placeholder_tiles.py` paints both new styles:
  - Vespera: wet flagstone causeways over dark storm shallows with glowing crystals and rain.
  - Chronospire: brass floor plates through clockwork gears.
  - Each world's own rain and clockwork overlays still play over them.
- **Rooms swapped in place:** `tile-worlds.js` replaces the room tables (`VESPERA_ROOM_DATA`,
  `CHRONO_ROOM_DATA`) in place. Quiet rooms, Nexus Waypoints, boss rooms and chests come from
  the new maps; each chest is in the dead end nearest a mini-boss room.
- **Old saves:** a save on the old Vespera or Chronospire map resumes at the new start; level,
  deck, gear and boss kills stay. That world's waypoints, chests, cooldowns and used points of
  interest are forgotten. The migration runs once, and every save carries the mark
  (`tileWorlds: 179`).
- **Retired:** Vespera's three joined districts (Stormglass Reach, Prism Bazaar, Stormforge
  Foundry) were the last joined districts in the game. Their paintings, along with old Elaris's
  emerald and sunpetal, moved to `unused assets/assets/environment/areas/`.
- **Chronospire's mini-bosses get their own cards:**
  - The Clockwarden drops **Gearward Bulwark** (15 Block, draw 1).
  - The Paradox Twin drops **Paradox Edge** (16 Pierce damage, draw 1).
  - Every mini-boss in the game now has a unique card.
- **Tests:**
  - `tile-worlds` covers all four tile worlds, the full portal chain and the 6×9 spire.
  - New `rebuilt-worlds-migrate`.
  - `organic-paths` now checks every tile world's doors, arrivals and patrols on the engine.
  - Updated for the new maps: `chronospire`, `crystals-touch-boss`, `pacing`, `rebalance`,
    `area-art` and `combined-rooms`.
  - Fix: a Round 175 edit had put a `//` comment in the middle of a line in the `chronospire`
    test, which disabled its "no talent multiplier" check. It runs again.
- **Balance check** on the new maps (sim, 8 fights): Vespera's regular fights are 32-96%, the
  Resonant Phantom 43% and the Tempest Colossus 30%. Chronospire's Paradox Twin is 44% and the
  Chronarch 31%. The Arc Sentinel (53%) and the Clockwarden (55%) now sit 2 levels higher and
  read slightly easy, so their adjustment follows in the next round.

## Round 178: every world drops its own cards

- Owner request: each world has its own set of unique card drops. Chest and elite card
  rewards (choose 1 of 3) come from `VARIETY_POOLS[world]`, and no card is now in two worlds'
  pools. New `assets/world-cards.js` (after `tile-worlds.js`):

  | World | Reward cards |
  |---|---|
  | Neon Aftermath | Cleave, Riposte, Bastion, Mend, Spark, Shatter, Arc Jab, Bulwark Bash, Overclock, Static Shield, Breach Spike |
  | Solaris | Cinder Lance, Venom Bloom, Gale Cut, Prismatic Counter, **Sunflare**, **Sand Veil**, **Scarab Swarm**, **Oasis Draught**, **Solar Lance** |
  | Sky Isles | Chain Lightning, Storm Battery, Tempest Surge, **Skyfall**, **Featherguard**, **Updraft**, **Thunderclap**, **Cloudburst** |
  | Elaris | Thornlash, Wildfire, Rootbind, Tidecall, Verdant Pact (the forest cards, moved from Solaris), **Elder Root**, **Spore Cloud**, **Briar Wall** |
  | Vespera | Mirrorguard, Prism Lance, **Crystal Shard**, **Crystal Ward**, **Riptide**, **Squall Step** |
  | Chronospire | its seven Suspend cards |

- The 17 new reward cards use existing effects only:
  - Sunflare: fire, Burn.
  - Sand Veil: Block + draw.
  - Scarab Swarm: 3 hits + Poison.
  - Oasis Draught: heal + Block.
  - Solar Lance: fire, Pierce.
  - Skyfall: air, draw.
  - Featherguard: Block + a card next turn.
  - Updraft: draw + Aether.
  - Thunderclap: lightning, halves the next enemy attack.
  - Cloudburst: water, 2 hits + heal.
  - Elder Root: earth, Poison.
  - Spore Cloud: Poison + draw.
  - Briar Wall: Block + Bind.
  - Crystal Shard: lightning, Pierce.
  - Crystal Ward: Block + halves the next enemy attack.
  - Riptide: water, draw.
  - Squall Step: Block + Aether.
- **Mini-boss cards:**
  - Elaris's Tidebound Warden and Gale Sovereign drop Tidebound Aegis and Sovereign Gale again.
  - Solaris's Cistern Warden drops **Cistern Aegis**.
  - Solaris's Noon Toller drops **Noon Peal**.
  - The Sky Isles' Stormbell Warden drops **Stormbell Toll**.
  - The Featherfall Matriarch drops **Featherfall Grace**.
  - A drop you already received stays received (`miniDrops` keeps the mini-boss ids).
- **Art:** new `tools/generate_world_card_art.py` paints placeholders for all 21 new cards at
  all 4 levels, with the existing card pipeline and a motif per card.
- Compendium and `cards.js` cache tags bumped. `tests/balance-sim.cjs` still uses its Round 177
  decks for the new worlds (the cards a player carries in), so its numbers are unchanged.
- New `tests/world-cards.test.cjs` checks:
  - No card is in two pools, and offers come only from the current world.
  - Forest cards drop in Elaris, every new mini-boss has its own card, and new cards play as
    written.
  - Every new card has art at all four levels.
- `card-variety` now counts 32 world reward cards.

## Round 177: balance for worlds 3 to 6

- Tuned with `tests/balance-sim.cjs` (16 talent builds × 2 play styles, fair-fight levels).
  Targets: regular fights about 75% wins on average, mini-bosses about 42%, final bosses
  about 29%. Each world's health multiplier was bisected first, then each boss's own
  health.

  | World | `regionHp` | Mini-bosses (hp) | Final boss (hp) | Sim result: regular / minis / boss |
  |---|---|---|---|---|
  | Sky Isles | 2.35 → **2.2** | Stormbell Warden .65, Featherfall Matriarch .78 | Zenith Roc .42 | 58-91% / 42%, 41% / 31% |
  | Elaris | 3.3 → **2.22** | Tidebound Warden .91, Gale Sovereign .65 | Bloom Tyrant .58 | 50-92% / 42%, 48% / 28% |
  | Vespera | 2.35 → **3.02** | Arc Sentinel .69, Resonant Phantom .99 | Tempest Colossus .45 | 45-92% / 42%, 43% / 30% |
  | Chronospire | 3.3 → **3.36** | Clockwarden .82, Paradox Twin .93 | Chronarch .47 | 41-100% / 40%, 42% / 31% |

- Why it moved:
  - At their new levels (+18), Vespera and Chronospire had become too easy: the player has
    18 more levels of talents by then.
  - Elaris on Chronospire's old values was too hard, because Chronospire's numbers assumed
    Suspend cards.
- The sim does not wear gear yet, so real fights are a little easier than these numbers.

## Round 176: gear, two pieces per world that open its boss room

- Owner request: each world has only two items, and both are needed to unlock its boss room.
  Each item is worn and gives a small boost (Armor, attack, health, armor piercing,
  elemental attack, one free cleanse). Items get placeholder graphics and a separate
  **Gear** screen like the Aetherlink.
- **The rule, in every world:** each mini-boss guards one gear piece in its room. You can
  take it once the mini-boss is beaten. Every door into the final boss room is sealed
  (`requires: 'gate:<world>'`) until you hold both pieces, or once that boss is already
  beaten, so old saves aren't locked out.
- **The 12 pieces** (`GEAR` in the new `assets/gear.js`), across 5 slots:

  | World | First mini-boss | Second mini-boss |
  |---|---|---|
  | Neon Aftermath | Ember Gloves (gloves): +1 attack | Briarstep Boots (boots): +1 Armor |
  | Solaris | Sunwoven Shirt (shirt): +5 max HP | Scarab Belt (belt): Pierce 1 |
  | Sky Isles | Galeweave Pants (pants): +1 elemental | Cloudstep Boots (boots): 1 free cleanse |
  | Elaris | Thornhide Gloves (gloves): +2 attack | Mossweave Pants (pants): +2 Armor |
  | Vespera | Stormglass Belt (belt): Pierce 2 | Tempest Gloves (gloves): +2 elemental |
  | Chronospire | Timeworn Shirt (shirt): +12 max HP | Hourglass Belt (belt): 1 free cleanse |

  - Attack and elemental add to card damage, through the talent damage hook.
  - Pierce ignores enemy Armor.
  - Armor stacks with Reactive Plating.
  - A free cleanse is a **✚ Gear cleanse** button in battle: one Purifying Light per fight.
- **Gear screen:** a new **Gear** button sits beside Aetherlink. It shows five slots (boots,
  shirt, pants, belt, gloves), each with a picker, plus the whole collection: undiscovered
  pieces say which world guards them. A piece goes on when you pick it up if its slot is
  empty. Gear can't be changed mid-fight.
- **Art:** new `tools/paint_gear_icons.py` paints a placeholder icon per piece in its world's
  colours (`assets/items/gear/<id>.png`). On the map a piece shows its icon. Owner art with
  the same file names replaces them.
- **Neon Aftermath:**
  - The relic gates are gone. Only the Warden's Crown is sealed.
  - The Ember Sigil is now the Ember Gloves, still in the Moon Temple.
  - The Briarstep Boots moved to the Crown Sentinel's Scrap Fortress.
  - The Moon Lens is retired.
  - The hidden Upgrade Crystal (owner request) is now a crystal chest at 4,4, the dead end in
    the middle of the north edge. A save that already took it finds that chest open.
  - Gear ids stay in `state.relics`, so old saves keep the Ember Sigil and the Boots as their
    gear.
- **Chests moved out of the mini-boss rooms** to nearby rooms, under their old ids, so opened
  chests stay opened:

  | World | Moves |
  |---|---|
  | Neon Aftermath | 8,9 → 5,4 |
  | Solaris | 5,2 → 3,2, 8,0 → 8,2 |
  | Vespera | 1,5 → 2,5, 11,2 → 10,2 |
  | Chronospire | 0,3 → 1,3, 6,6 → 6,5 |
  | Sky Isles | 5,3 and 0,3 |
  | Elaris | 5,2 and 0,2 |

- The objective names the missing pieces and their guardians until both are found.
- **Fixes:**
  - The exploration map's completion counted every relic you carried from other worlds,
    and could go past 100%. It now counts only this world's.
  - The Safe tag on the map uses each world's real start room.
- **Tests:**
  - New `tests/gear.test.cjs`.
  - `relic-quest` now plays the gear chain in all six worlds.
  - Updated: `neon-world`, `room-art`, `rebalance`, `expansion`, `chronospire` (doors into the
    boss room are `{to, requires}` objects) and `solaris-roster`.

## Round 175: the Sky Isles and Elaris join the journey (worlds 3 and 4)

- **Six worlds**, in travel order: Neon Aftermath, Solaris, **Sky Isles** (`sky`), **Elaris**
  (`wilds`), Vespera, Chronospire. Each final boss room's portal leads to the next world's
  start, and each start leads back. Solaris's Solar Crown now opens to the Sky Isles, and
  Vespera's start returns to Elaris.
- **Vespera and Chronospire move up two worlds:** their rooms are 18 levels higher (Vespera
  37-45, Chronospire 46-54).
- **New `assets/tile-worlds.js`** (after `chronospire.js`; data in `assets/sky-data.js` and
  `assets/wilds-data.js` from Round 174) does the following:
  - Runs Solaris's painted-world engine once per world: walk mask, loose crossings and the
    flipped tile per room.
  - Sets up both rosters, rooms, portals, quiet rooms, Nexus Waypoints, lore, events and the
    objective.
- **Sky Isles roster** (sprites borrowed and tinted sky-blue until art arrives):

  | Enemy | Element | Affliction |
  |---|---|---|
  | Sunfeather Drake | fire | Crush |
  | Cloud Wisp | water | Static |
  | Gale Harpy | air | Barrage |
  | Thunderhorn Ram | earth | Rend |
  | The Stormbell Warden (mini-boss, Stormbell Tower) | air | Shackle + Static |
  | The Featherfall Matriarch (mini-boss, Featherfall Roost) | water | Siphon + Fog |
  | **The Zenith Roc** (final boss, The Eye of the Sky) | air/fire | Empower, Barrage, Enfeeble |

  - Events: Updraft Well, Abandoned Aerie, Singing Chimes, Starwell.
  - Lore: Wind Chimes.
- **Elaris roster:** the forest creatures come home under their original names and sprites,
  untinted:
  - Cinder Fox, Blight Antler, Drowned Heron, Storm Moth.
  - The Tidebound Warden (Drowned Weir) and The Gale Sovereign (Stormwing Canopy).
  - **The Bloom Tyrant** (Elderbloom Sanctuary).
  - They have their own ids (`elarisFox`, `tideboundWarden`, `elarisTyrant`, ...), so
    Solaris's renamed desert roster keeps its ids.
  - Events: the forest set (Moonlit Spring, Wounded Ranger, Glowing Seedpod, Vines).
  - Lore: Elder Stones.
- **World registry in `expansion.js`:** `WORLD_ORDER`, `WORLD_NAMES`, `TILE_REGIONS`,
  `regionStartRoom()`, `regionTierTypes()` and `WORLD_BOSS_ROOMS`. Portals, start rooms,
  spawns, chests, saves, distances, titles and the exploration map read these instead of
  per-world `if` chains. `regionIndex()` (`aether-deck.js`) is the world's place in
  `WORLD_ORDER`. Affliction strength and side-card tiers follow it, and Dispel damage grows
  4 + 3 per world.
- **Deck slots:** the Zenith Roc and the Bloom Tyrant each add a deck slot (`WORLD_BOSSES`).
- **Balance:** this round ships starting values. The Sky Isles take Vespera's old
  multipliers and Elaris takes Chronospire's. `tests/balance-sim.cjs` now covers all six
  worlds (`ONLY_REGIONS=sky,wilds`), and the tuned values follow in the next round.
- **Card rewards** in the new worlds borrow Vespera's and Solaris's pools until Round 177
  gives every world its own.
- **Compendium:** lists both new worlds and the new levels.
- **Tests:**
  - New `tests/tile-worlds.test.cjs`: world order, 54 rooms each, enemies on paths, bosses,
    quiet rooms, the tiles ship, levels, the portal chain, rosters and art.
  - `region-rooms-load` covers all six worlds.
  - `chronospire` and `crystals-touch-boss` are updated for the new order.

## Round 174: tile kits for worlds 3 and 4 (Sky Isles and Elaris)

- Owner plan: six worlds in order: Neon Aftermath, Solaris, a new sky world, Elaris (the
  forest, with the old forest creatures), then Vespera and Chronospire. Elaris and every later
  world are built like Solaris, from road-shaped tiles flipped to fit each room.
- New `tools/build_tile_world.py sky|wilds`: Solaris's builder generalised. It reuses the
  tracer and flips from `tools/build_solaris.py`, so Solaris's output does not change. Each
  world turns Neon Aftermath's 54-room layout a different way, so the three tile worlds have
  different maps:

  | World | Region id | Map | Start | Mini-bosses | Final boss | Levels |
  |---|---|---|---|---|---|---|
  | Solaris | `elaris` | flipped top-to-bottom | 0,0 | 5,2 / 8,0 | 8,5 | 10-18 |
  | Sky Isles | `sky` | flipped left-to-right | 8,1 | 3,3 / 0,5 | 0,0 | 19-27 |
  | Elaris | `wilds` | turned half way round | 8,4 | 3,2 / 0,0 | 0,5 | 28-36 |

  The region id `elaris` stays with Solaris so saves carry over; the forest world is `wilds`.
  The builder writes `assets/<world>-data.js` (`TILE_WORLD_DATA.<world>`: walk mask, tile plan,
  rooms, the start/boss/mini-boss rooms and the placeholder list) and the room tiles as `.webp`.
- New `tools/paint_placeholder_tiles.py sky|wilds` paints a stand-in for each of the 7 road
  shapes the layout needs (cross, corner, t-bottom, t-right, straight, dead-bottom,
  dead-right): marble walkways on grassy islands over clouds for the sky, and dirt trails
  under tree canopy for Elaris. It also writes each tile's exact walk area to
  `src/masks/<name>.png`, so the stand-ins need no colour tracing. Owner paintings
  (e.g. `src/cross-a.jpg`) replace them; delete the `-ph` tile then.
- The new data is not loaded by the game yet (next round).

## Round 173: saves in every Chronospire room load

- **Bug:** a save made in 6 of Chronospire's 34 rooms would not load: `9,4`, `9,5`, `9,6`,
  `6,6` (Paradox Twin), `8,6` and `8,7` (the Chronarch). `validateImport` checked
  Chronospire rooms against Solaris's room list, so those rooms failed with "Invalid room"
  and "Continue" reported no save.
- **Fix:** new `regionRoomKeys(region)` in `expansion.js` returns each world's own room list.
  The worlds planned next will extend it.
- New `tests/region-rooms-load.test.cjs` validates a save in every room of every world.

## Round 172: Solaris enemies fit the desert city

- Owner request: rename and rework the Solaris enemies to fit a sun-scorched brass desert
  city. The owner will send new art later. Ids are unchanged, so saves, boss kills and
  mid-fight saves carry over.

  | Was | Now | Change |
  |---|---|---|
  | Cinder Fox | **Solar Scarab** ☼ | fire, Barrage |
  | Drowned Heron | **Mirage Ibis** | water, Siphon |
  | Blight Antler | **Dune Scorpion** | earth, Enfeeble |
  | Storm Moth | **Dust Devil** | air, Mind Fog |
  | The Tidebound Warden | **The Cistern Warden** | mini-boss, Scrapwall Stronghold |
  | The Gale Sovereign | **The Noon Toller** 🔔 | mini-boss, Temple of the Noon Bell |
  | The Bloom Tyrant | **The Sun Pharaoh** ☉ | final boss, Solar Crown |

- **The Sun Pharaoh** shifts between sun and sand (fire/earth, was earth/air). It now uses
  Entomb, the Revenant's linen wrap, in place of Lacerate (Entomb, Empower, Rend).
- Solaris Sun Dial lore, the Solaris objective and the compendium texts use the new names.
- **Art:** the new enemies still show the old forest sheets for now. `ELARIS-ART.md` lists
  the planned file for each one (`solar-scarab.png`, `mirage-ibis.png`, `dune-scorpion.png`,
  `dust-devil.png`, `cistern-warden.png`, `noon-toller.png`, `sun-pharaoh.png`). Vespera
  and Chronospire used to borrow the Solaris ids for their recolored sprites. They now
  borrow art-only keys (`forestFox`, `forestHeron`, `forestStag`, `forestMoth`,
  `forestTyrant`), so new Solaris art won't change them.
- Unchanged: the mini-boss card drops (Tidebound Aegis, Sovereign Gale) and the Stormglass
  Covenant keep their names.
- New `tests/solaris-roster.test.cjs`. Cache tags bumped to `?v=round172`.

## Round 171: resuming a journey keeps your place in Neon Aftermath

- **Bug:** after a refresh, "Continue saved journey" put you back at the
  Afterlight Refuge with the map wiped back to one room. Level, deck, relics
  and boss kills stayed.
- **Cause:** `expansion.js` bound the start button straight to its own
  `newGame`, so the wrappers added later never ran from the button. One of
  them, in `neon-world.js`, marks new games with `cityWorld: 1`. Without that
  mark, every load ran the Round 91 old-city migration, which resets city
  exploration. The aether-deck and exploration `newGame` wrappers were skipped
  too; loads filled in what they set up.
- **Fix:** the start and resume buttons now call the current `newGame` and
  `load`. `neon-world.js` also adds the mark on every save, because a game in
  progress is always on the current map. A save that was made without the
  mark still resets one more time on its next load, then keeps its place.
- New `tests/resume-progress.test.cjs`. Cache tags bumped to `?v=round171`.

## Round 170: the Revenant walks

- The owner's 4-frame walk loop for the Sunwrapped Revenant (contact, passing, contact, passing) is
  keyed off magenta into `assets/monsters/elaris/sun-revenant-walk.png`. Each frame is anchored on
  its legs and set on a shared foot line. Map patrols loop it every 1.1s and flip it when they turn.
  Battle keeps the pose sheet: stand and sway, club swing and recoil.
- The walk sheet ships with the game, so it is wired in directly instead of being probed at load.
- The keyer now also removes magenta specks of 4 pixels or more trapped inside the figure.

## Round 169: the Sunwrapped Revenant, a tech mummy for Solaris

- New Solaris patrol enemy, the **Sunwrapped Revenant** ☥: 50 HP, 9 attack, earth (its charged
  strike poisons). It joins the Solaris wildlife pool (`assets/sun-revenant.js`, loaded after
  `battle-hud`), and the compendium lists it.
- **Entomb**, a new affliction and its signature move: when it lands, the strongest card in your
  next hand is wrapped in linen and can't be played that turn. The card shows "☥ ENTOMBED".
  Purifying Light unwraps it, and Null Anchor prevents it.
- **Art:** the owner's 4-pose sheet, keyed off magenta (`assets/monsters/elaris/sun-revenant.png`).
  The poses are separate stances, not a loop, so the Revenant stands with a breathing sway, swings
  its club when it hits you and recoils when you hit it. If `sun-revenant-walk.png` is added, map
  patrols walk with it instead.
- Also: the compendium's Solaris blurb now describes the desert city.
- New `tests/sun-revenant.test.cjs`; `elaris-wildlife` now expects five Solaris species.

## Round 168: one thing per room

- No room holds two things any more. Waypoints, the Cardsmith, the merchant, points of
  interest (lore, shrines, campfires, caches, sealed vaults, events), relics and hidden chests
  each get their own room.
- **The Cardsmith** used to stand beside the middle Nexus Waypoint. It now has its own room about
  halfway into each world, not in or next to the waypoint's room (`cardsmithRoom` in
  `assets/cardsmith.js`). Points of interest and the merchant skip that room.

  | World | Cardsmith room |
  |---|---|
  | Neon Aftermath | 2,7 Carousel Green |
  | Solaris | 0,4 Ember Terrace |
  | Vespera | 6,5 Ion Marsh Shoals |
  | Chronospire | 6,2 Hourglass Walk |

- **Neon Aftermath's Moon Temple** held both the Ember Sigil and a crystal chest. The chest moved
  to Pagoda Court (3,7), a dead end in the same district, so it is now an off-path find instead of
  being locked behind the Lunar Enforcer.
- Portals are exits, not items, so a start room's waypoint still sits beside the return portal.
- New `tests/one-per-room.test.cjs` checks every world over 5 seeds and 4 merchant moves.
  `cardsmith` and `rebalance` tests are updated; the boss-locked chest test now uses the Crown
  Sentinel's Scrap Fortress.

## Round 167: last Solaris stand-in replaced

- The owner's `sol-dead-top` (road from the top into a turnaround circle) is the dead end for the
  4 rooms that only open north (2,2 3,2 8,2 6,5), unflipped. New shape `dead-top` in
  `tools/build_solaris.py`, with a hand-drawn walk area. Its sand alley below the circle stops short
  of the bottom edge, since no room connects there.
- Solaris now has no stand-in tiles (`SOLARIS_PLACEHOLDERS` is empty). Still to come: the start
  camp and the upright corner, T-junction and observatory paintings.

## Round 166: Solaris crossroads and west dead end

- The owner's `sol-cross-a` (sun-dial roundabout) and `sol-cross-b` (mirror towers) replace the
  crossroads stand-in in 8 rooms, 4 each. `sol-dead-left` (collapsed solar tower) is the room that
  only opens west (4,5). New shape `dead-left` in `tools/build_solaris.py`; the `cross-ph` and
  `dead-right-ph` stand-ins are gone.
- The tracer misses the round plazas, so `EXTRA` adds the roundabout and the dead end's plaza to
  the traced roads.
- `sol-start` in this upload is the colonnade avenue again, so it isn't used. The start camp
  (right and bottom exits) is still to come. The north dead end is the last stand-in.

## Round 165: fewer upside-down Solaris rooms

- `tools/build_solaris.py` now flips a tile top to bottom only when no unflipped or mirrored
  option fits the room, since that flip turns painted buildings upside down. That takes the
  T-junction (`t-right-a`) and straight tiles off the flipped list. The corners, the
  `t-bottom` T-junctions, the north dead end and the observatory still need the flip until
  upright paintings arrive; prompts for those went to the owner.

## Round 164: Solaris landmark rooms and the colonnade straight

- Six of the owner's landmark paintings are now one-off rooms (`assets/environment/solaris/src/landmarks/`):

  | Room | Painting | Notes |
  |---|---|---|
  | 8,5 The Solar Crown | `sol-boss` (arena stronghold) | Bloom Tyrant |
  | 5,2 Scrapwall Stronghold | `sol-miniboss` | Tidebound Warden; was "Temple of the Noon Bell" |
  | 8,0 Temple of the Noon Bell | `sol-relic-ember` (sun temple, brazier) | Gale Sovereign; was "Mirror Fortress" |
  | 0,2 Statue Garden | `sol-relic-boots` | |
  | 6,2 Shattered Array | `sol-relic-crystal` | mirrored left to right |
  | 5,5 Brass Observatory | `sol-relic-lens` | flipped top to bottom (this room only opens north) |

  Each painting went to a room whose exits fit it, preferring no top-to-bottom flip, which turns
  buildings upside down. The two mini-boss room names were swapped to match their new art.
- The colonnade avenue paintings are the real `straight` tiles (`straight-a`, `straight-b`), so
  `straight-ph` is gone. The north dead ends are now cut from the real straight.
- These paintings use textured paving and sand plazas the colour tracer can't follow, so
  `tools/build_solaris.py` has hand-drawn walk areas (`MANUAL`) for them, and a `LANDMARKS` table
  that pins each painting to its room and checks the exits fit.
- Still placeholders: the crossroads (8 rooms), the north dead end (4 rooms) and the west dead end
  (1 room).
- New `tests/solaris-landmarks.test.cjs`.

## Round 163: deck size grows with each world conquered

- Max deck size no longer gets a flat +4 outside Neon Aftermath. Instead it grows by +1, for
  good, each time you beat a world boss that opens the next world: the Thorn Warden (Solaris),
  the Bloom Tyrant (Vespera) and the Storm Tyrant (Chronospire). With no talents or devices that
  is 6 in the city, then 7, 8 and 9 (`worldDeckBonus` in `index.html`).
- A save whose deck is now over the limit is trimmed to fit when it loads (`fitDeckToLimit`); the
  extra cards stay in the collection. Without this the deck-limit check would block every fight.
- Talents: removed the unused `talentScale()` and the "boosted" wording around the stepped values.
  Talents give the same fixed amounts in every world (Plating 1/2/4/6/8 and so on, as in the
  talent descriptions).
- New `tests/world-deck.test.cjs`; `expansion` and `chronospire` tests updated.

## Round 162: fewer patrols in Solaris

- Solaris rooms with two or more regular patrols now spawn one fewer than the shared distance
  formula (`areaPatrolCount`) gives: middle rooms 2→1, far rooms 3→2. Rooms that had a single
  patrol keep it, so no ordinary room is left empty. Mini-boss and boss rooms (`5,2`, `8,0`,
  `8,5`) keep their boss. Across the 54 rooms the regular patrols drop from 96 to 58
  (`roomSpawns` in `assets/expansion.js`). Other worlds are unchanged.
- New `tests/solaris-patrols.test.cjs` checks the count room by room, the bosses, and that the
  city still uses the full count.

## Round 161: armed counters are shown like Frozen

- When a Prismatic Counter is armed, the enemy's status strip shows "⛨ Next fire strike
  countered" (with the element it answers; hover for the effect), the same way Frozen shows
  (`assets/battle-hud.js`). The enemy-move bubble for that charged strike reads "countered · no
  damage" instead of its damage (`assets/aether-deck.js`).
