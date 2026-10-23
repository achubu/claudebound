# Aethercede: notes for Claude sessions

Aethercede is a browser card-battler/exploration game in vanilla JS with no
build step. Open `index.html` directly. `compendium.html` is the card
gallery; `arena.html` is a standalone prototype and is left untouched.

**Read `CHANGES.md` first.** Every round of work (Round 1 to Round 251) is
logged there with its reasoning. Add a new `## Round N:` entry for each
change set.

## How the code is put together

- **Script order matters (see `index.html`):**
  - `save-migration.js` (copies old `cardbound-` storage keys to
    `aethercede-`), then `neon-city.js`, then `cards.js`, then the inline game script, which holds
    the `rooms` literal for Neon Aftermath.
  - Then `elaris-wildlife`, `expansion`, `encounter-depth`, `talent-matrix`,
    `aether-deck`, `card-variety`, `battle-hud`, `sun-revenant`.
  - Then `combined-rooms`, `diagonals`, `city-paintings`, `organic-paths`, `plazas` (Round 232),
    `organic-areas`, `exploration`, `neon-world`, `solaris`, `chronospire`,
    `sky-data`, `wilds-data`, `vespera-data`, `chronospire-data`, `tile-worlds`, `world-cards`, `world-mechanics`, `stagger`, `card-mechanics`, `pressure`, `pickups`, `cardsmith`, `gear`, `waypoints` (Round 229: each world's first Nexus Waypoint stands three rooms in, alone in its room), `deck-choice` (Round 233: new cards wait in the collection; +1 deck slot per boss), `room-preload`. (`solaris-data.js` loads just before `expansion.js`.)
  - Then `touch-controls`, `map-terrain`, `enemy-labels`, `layout-polish` (Round 187: room camera/placement
    on desktop and phones, phone battle layout; styles in `layout-polish.css`, loaded last), `cycle-card` (Round 236: Sift and
    its discard choice), `sky-storm` and `status-dots` (Round 237), `attack-boost` (Round 240), `charge-swipe` (Round 242),
    `enemy-pairs` (Round 243: two enemies at once from the Sky Isles on), `battle-recap`
    (Round 211: the final turn on the victory screens), `tutorial` (Round 226: a new journey's guide and
    starting-deck pick; it hangs off the New journey buttons, not `newGame()`), then
    `god-mode` (Round 198: any card wins, all waypoints and maps open; while it is on, writes to the
    save keys are ignored, so leaving rolls back).
- **Features wrap earlier functions:** `const fBefore = f; f = function () {...}`.
  Prefer `function` declarations for new globals that other files test with
  `typeof`.
- **Six worlds, in `WORLD_ORDER` (Round 175), swapped in by `configureRegion(region)`:**
  - `city` is Neon Aftermath.
  - `elaris` is shown to players as **Solaris** (Round 149): 51 rooms built from
    flipped tiles by `tools/build_solaris.py` into `assets/solaris-data.js`. Round 192 cut three
    corner rooms and joined their neighbours with diagonal roads (`CUT`, `SOLARIS_DIAG`). Round 228: a new
    top-down look (`tools/prepare_solaris_tiles.py` first; tiles named `-s1` bring their own masks); the old
    landmark paintings are retired (`USE_LANDMARKS`).
  - `sky` is the **Sky Isles** and `wilds` is **Elaris** (the forest). Both are tile-built
    like Solaris by `tools/build_tile_world.py` into `assets/<id>-data.js`, and run by
    `assets/tile-worlds.js`. Stand-in tiles come from `tools/paint_placeholder_tiles.py`.
    Every new world is built this way. Round 197: the Sky Isles use the owner's top-down tiles
    (51 rooms, three cut for diagonal walkways: `cut`/`diag` in the data); since Round 204 they
    are a dense floating city walked on a glass deck. Run `tools/prepare_sky_tiles.py`
    (walk masks; Round 235: the owner's tiles in `src/owner/`, glass terraces) before building it. Round 225: Elaris uses the owner's
    forest (three lakes crossed by boardwalks); run `tools/prepare_wilds_tiles.py` before
    building it. It makes missing shapes by blending arms between tiles that share one base
    painting. Round 227: Vespera uses the owner's storm coast (three sea inlets crossed by piers);
    run `tools/prepare_vespera_tiles.py` before building it. Bump `TILE_ART_VERSION` in
    `assets/tile-worlds.js` when tile paintings change, so browsers fetch the new ones (Round 208).
  - `vespera` (levels 37-45) and `chronospire` (46-54) were rebuilt the same way in
    Round 179 (Chronospire is the layout turned on its side: 6 wide, 9 tall).
    `tile-worlds.js` swaps their room tables in place.
- **Neon Aftermath is one painted world map** (Round 91+):
  - 6 district images in a 3×2 grid, cut into 9×6 rooms. Room keys are
    `cx,(cy+4)` and the start room is `'0,5'`.
  - The walk mask lives in `assets/neon-world.js` (8px cells). The foot point
    is y+22.
  - Round 100+: rooms are being repainted one image each in
    `assets/environment/rooms/room-X-Y.webp` (16:10, about 2000x1250). After
    adding room images, run `python3 tools/build_room_masks.py`. It traces the
    streets into the walk mask and lists the rooms in `NEON_ROOM_ART`.
    Crossings to or from these rooms are loose: any street reaching the edge
    lands on the nearest street across (`neonLandingFrom`). Rooms without an
    image use the old district slices.
  - Round 101+: each painted room also lists hand-checked open-ground spots
    beside the street (`NOOKS` in the build tool), each with a footpath.
    Chests, relics and points of interest stand there as small markers. When
    adding rooms, pick 2-3 spots on open ground 30-100px off the road (never on
    roofs, props or water), add them to `NOOKS`, and re-run the tool.
  - Old rebuild pipeline (district paintings): `tools/build_world_map.py`, then
    `tools/build_world_rooms.py`, then the step that writes the rooms literal
    and mask into `index.html` and `neon-world.js`. Paths are widened with
    `tools/widen_paths.py`.
- **Organic engine** (`assets/organic-paths.js`): painted and tile worlds walk on traced
  masks through it (`ORGANIC_AREAS['world:<id>']`). The old joined districts in
  `assets/organic-areas.js` are no longer used by any world (Round 179):
  - Doors sit where paths meet room edges.
  - Pockets are tracked; reachability is checked.
  - `organicItemSpot()` places items beside the paths.
- **Gear** (Round 176, `assets/gear.js`): two pieces per world, one in each mini-boss room;
  both open the final boss room (`requires: 'gate:<world>'`). Worn in 5 slots via the Gear screen.
- **Interactables** (chests, relics, POIs, merchant, Nexus Waypoints) sit just
  off the walkable path, 12–28px from reachable street, clear of the HUD/minimap corners
  (`screenCovered`) and of patrols. In Solaris and the Sky Isles, where off the path is all buildings,
  they stand on the walkable ground 22–40px inside its edge instead (Round 212, `itemsOnGround()`). Round 232: in the tile worlds
  they stand in hand-picked open squares beside the road first (`tools/plazas.py`, opened up to the walk mask by the builders;
  `assets/plazas.js`). When adding tile paintings, pick 2-3 such spots for each in `PLAZAS` and rebuild. Enemies and bosses stand on paths. On a tap route only
  the tapped item opens (Round 184).
- **World card mechanics** (Round 185, `assets/world-mechanics.js`): Neon Aftermath ⌁ Hack, Solaris ☀ Heat,
  Sky Isles 🪶 Tailwind, Elaris 🌱 Growth, Vespera ⚡ Stormcharge; Chronospire's ⏳ Suspend is in `chronospire.js`.
  Each has 4 cards in its world's pool, an arrival gift of 2 (city: first win), a battle tray with a guide, a tag after
  each card's description (Round 238),
  and an affliction that works against it.
- **⚔ Pressure** (Round 226, `assets/pressure.js`): on a turn where you gain no Block from a card, every
  `pressurePer()` damage you deal (2 in the first two worlds, rising to 6 late) takes 1 off the enemy's
  attack that turn, up to half. It makes decks without Block viable; boss HP was re-tuned for it.
- **Concept-lab card mechanics** (Round 206, `assets/card-mechanics.js`): ⤳ Follow-through, ⚡ Amplify and
  ◇ Choose one, via a `stat` wrapper reading `b.chain`, `b.amplifyUid` and `b.modePick`.
- **Creature sprite sheets** (4 frames, one row; magenta or, since Round 222, green background): cut generated art with `tools/cut_sprite_sheet.py`,
  then run `tools/pad_sprite_frames.py` on the result so no art touches a frame's edge (Round 200).
  When an image has more poses than 4 (often two rows), key it, then pick four with
  `tools/compose_sprite_sheet.py` (Round 224).
  Bump `SPRITE_VERSION` in `assets/elaris-wildlife.js` when sheets change. Sheets drawn on black: key with a
  filled silhouette (Round 234). A creature with battle poses and a walk lists `poses: { attack, hurt, walk }` (`sun-revenant.js`).
- **Card art** comes from `cardArtPath()` in `assets/cards.js`. The refreshed
  WebP illustrations are listed in `refreshedCardArt`. Status and pending
  prompts: `assets/cards/art-refresh.md` and `tools/art-refresh/`. When art
  paths change, bump the `cards.js?v=` tag in `index.html` and
  `compendium.html`.

## Folder layout

- Repo root: `index.html`, `compendium.html`, `arena.html` and the design
  notes (`*.md`).
- `assets/`: everything the game loads. That is the scripts and stylesheets,
  plus image folders `cards/`, `characters/`, `environment/`, `items/`,
  `monsters/` and `talents/`.
- `unused assets/`: graphics the game no longer loads, kept under their old
  paths, with a README. Don't reference it from game code. Move a file back
  into `assets/` when it is wired in again.
- `tests/` and `tools/`.
- Don't add top-level copies of `assets/` folders. Owner uploads sometimes
  create them, so fold the files into `assets/` instead.

## Tests

- Real-script Node harness: `tests/expansion.test.cjs` loads the page
  scripts in order. `HARNESS_ONLY=1` exports `{run, context}` without running
  its own checks. `run(code)` returns the value of the code it runs.
- Run everything (takes several minutes):
  `for t in tests/*.test.cjs; do timeout 300 node $t || echo FAIL $t; done`
- Key suites:
  - `neon-world`, `neon-world-pathing` (crossings, tap routes, fuzz; ~1 min)
  - `organic-paths`
  - `item-placement`
  - `card-art`
  - `room-art` (per-room Neon Aftermath paintings)
  - `exploration`
  - `rebalance`
- Browser check: serve with `python3 -m http.server 8123` and drive it with
  Playwright. `node tests/playtest-walk.cjs [world]` walks every door and item with tap routes.
- Difficulty: compendium → Difficulty lab, or `node tests/difficulty-report.cjs [fights] [world]`
  (shared code in `assets/sim/`). Tune bosses with the lab (it wears gear); `tests/balance-sim.cjs`
  plays without gear.

## Working conventions

- Every round:
  1. Make the change.
  2. Update or add tests.
  3. Run the suite.
  4. Add a CHANGES.md entry.
  5. Commit.
  6. Push the branch.
  7. Open a pull request to `main` and merge it (squash). The owner asked for this every round:
     merge without asking, unless there is a specific concern, such as failing tests, a risky or
     unverified change, or something only the owner can decide. In that case say so and ask.
     After a squash merge, restart the working branch from `main`.
- Owner: Aleksey (GitHub `achubu`). Repos: `achubu/claudebound` is Claude's
  repo and the most up-to-date code; work and push here. `achubu/Cardbound`
  is worked on by ChatGPT; use it only as a source of up-to-date image assets
  and don't push code there. The repo keeps its old name; the game is
  Aethercede.
- Art comes from the owner's image generator (Gemini). When integrating, skip
  `.DS_Store` files and duplicate top-level folders.
- Painted dead ends at room edges are intentional. A street that ends at an
  edge with no matching street on the other side is not a crossing.
