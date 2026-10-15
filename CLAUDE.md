# Aethercede: notes for Claude sessions

Aethercede is a browser card-battler/exploration game in vanilla JS with no
build step. Open `index.html` directly. `compendium.html` is the card
gallery; `arena.html` is a standalone prototype and is left untouched.

**Read `CHANGES.md` first.** Every round of work (Round 1 to Round 121) is
logged there with its reasoning. Add a new `## Round N:` entry for each
change set.

## How the code is put together

- **Script order matters (see `index.html`):**
  - `save-migration.js` (copies old `cardbound-` storage keys to
    `aethercede-`), then `neon-city.js`, then `cards.js`, then the inline game script, which holds
    the `rooms` literal for Neon Aftermath.
  - Then `elaris-wildlife`, `expansion`, `encounter-depth`, `talent-matrix`,
    `aether-deck`, `card-variety`, `battle-hud`.
  - Then `combined-rooms`, `diagonals`, `city-paintings`, `organic-paths`,
    `organic-areas`, `exploration`, `neon-world`, `chronospire`, `pickups`.
  - Then `touch-controls`, `map-terrain`, `enemy-labels`.
- **Features wrap earlier functions:** `const fBefore = f; f = function () {...}`.
  Prefer `function` declarations for new globals that other files test with
  `typeof`.
- **Three worlds, swapped in by `configureRegion(region)`:**
  - `city` is Neon Aftermath.
  - `elaris`.
  - `vespera`.
  - `chronospire` is a fourth area.
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
- **Organic districts** (Elaris/Vespera) use traced masks in
  `assets/organic-areas.js` with the engine in `assets/organic-paths.js`:
  - Doors sit where paths meet room edges.
  - Pockets are tracked; reachability is checked.
  - `organicItemSpot()` places items beside the paths.
- **Interactables** (chests, relics, POIs, merchant, Nexus Waypoints) sit just
  off the walkable path, 12–28px from reachable street. Enemies and bosses
  stand on paths.
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
  Playwright.

## Working conventions

- Every round:
  1. Make the change.
  2. Update or add tests.
  3. Run the suite.
  4. Add a CHANGES.md entry.
  5. Commit.
  6. Push the branch.
- Owner: Aleksey (GitHub `achubu`). Repos: `achubu/claudebound` is Claude's
  repo and the most up-to-date code; work and push here. `achubu/Cardbound`
  is worked on by ChatGPT; use it only as a source of up-to-date image assets
  and don't push code there. The repo keeps its old name; the game is
  Aethercede.
- Art comes from the owner's image generator (Gemini). When integrating, skip
  `.DS_Store` files and duplicate top-level folders.
- Painted dead ends at room edges are intentional. A street that ends at an
  edge with no matching street on the other side is not a crossing.
