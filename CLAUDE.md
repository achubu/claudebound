# Aethercede: notes for Claude sessions

Aethercede is a browser card-battler/exploration game in vanilla JS with no
build step. Open `index.html` directly. `compendium.html` is the card
gallery; `arena.html` is a standalone prototype and is left untouched.

**`NOTES.md`** holds the owner's ideas for later (not to build until asked); remind the owner of them when
relevant. **Read `CHANGES.md` first.** Every round of work (Round 1 to Round 499) is
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
    `sky-data`, `wilds-data`, `vespera-data`, `chronospire-data`, `tile-worlds`, `chrono-gen` (Round 377: the Chronospire's rooms are generated from `state.seed`), `world-cards`, `world-mechanics`, `stagger`, `card-mechanics`, `chain` (Round 261: ⛓ Chain N bonuses after N cards played this turn), `pressure`, `pickups`, `cardsmith`, `gear`, `armor-scale` (Round 262: your Armor grows with the world), `gear-rules` (Round 284: each gear piece also changes a rule; bosses a little tougher while you wear gear), `waypoints` (Round 229: each world's first Nexus Waypoint stands three rooms in, alone in its room), `deck-choice` (Round 233: new cards wait in the collection; +1 deck slot per boss), `deck-presets` (Round 256: three favorite decks), `room-preload`, `item-reach` (Round 275: walkable pads around every item, for player movement only), `npc-greetings` (Round 281: the merchant and Cardsmith greet you once), `bounty-plan` (Round 286: each patrol's bounty is fixed before the fight and shown on its map label; bounties pay XP), `quests` (Round 287: quests from shrines, campfires and caches; the Quests screen, one log per world since Round 289; Round 381: six per world, each paying a loot card), `city-nights` (Round 298: Neon Aftermath only: the Wanted Board and three rogues, the Blackout breakers and the Afterlight Vault, four more city events), `world-relays` (Round 345: the Blackout puzzle themed for every other world: three switches open a vault; Round 350: each start-room object moved to its own room near the start, `quietItemRooms`, so no room holds more than one object and no first room any), `spot-fixes`, `chrono-locks` (Round 379). (`solaris-data.js` loads just before `expansion.js`.)
  - Then `touch-controls`, `map-terrain`, `enemy-labels`, `layout-polish` (Round 187: room camera/placement
    on desktop and phones, phone battle layout; styles in `layout-polish.css`, loaded last), `cycle-card` (Round 236: Sift and
    its discard choice), `enemy-drops` (Round 380: each regular enemy drops its one card, `ENEMY_CARD`; the rest of a world's pool is its loot, `worldLootPool`, given by its quests, vault and hidden chests in turn; give a new enemy a card there and keep new loot sources on `worldLootCard`), `sky-storm` and `status-dots` (Round 237), `attack-boost` (Round 240), `charge-swipe` (Round 242),
    `enemy-pairs` (Round 243: two enemies at once from the Sky Isles on), `enemy-armor` (Round 244; doubled in Round 262; Vespera +10% in Round 266), `armor-hud` (Round 262: enemy Armor beside its health, 🛡 −N popups), `enemy-traits` (Round 265: every enemy has its own move pattern and trait; none repeat within a world), `boss-twists` (Round 283: each boss's signature twist, Phase 2 at half health, Overdrive; off in the harness unless `BOSS_TWISTS=1`), `enemy-temper` (Round 253: 🔥 Fierce / 🛡 Hardy tempers and ±15% attack rolls), `battle-recap`
    (Round 211: the final turn on the victory screens), `tutorial` (Round 226: a new journey's guide and
    starting-deck pick; it hangs off the New journey buttons, not `newGame()`), `battle-chips` (Round 254: every
    battle-screen effect as a one- or two-word chip with a hover/tap bubble; keep new battle text short or it gets chipped), `juice` (Round 285: floating numbers, shake, flashes and Web Audio sounds; 🔊 mutes), `ui-clarity` (Round 292: six top-bar buttons, with Save in the Menu; Round 295: the Aetherlink Gauntlet is a section of the Gear screen; End turn glows when nothing is playable; Round 293: no encounter bar, one-line forecasts, slim Pitch buttons; Round 294: a ✕ on every top-bar screen, a compact Character page and Deck screen; Round 296: the Character stat breakdown and the quest log's exploration panel; Round 344: the stats open from a 📊 Stats button), `item-names` (Round 325: no name labels under interactable objects and a softer glow; the name pops up above the object
    when you interact with it), `world-font` (Round 326: all text in the world view, HUD and buttons included, is one
    style and one on-screen size, 10% smaller than the old enemy labels; menus and battle keep their own type), then
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
  - Round 377: **the Chronospire is generated, not painted** (`assets/chrono-gen.js`). The room graph, names, levels and roles
    stay as built; each room's roads, squares and buildings come from the journey's seed on a 16x10 grid of 50px
    cells, read by the walk mask (`chronoWalk`) and `plazas`; rooms are planned on first use. `paintChronoRoom()` draws it from three
    seamless textures and sixteen props (`assets/environment/chronospire/gen/`, `tools/prepare_chrono_gen.py`; bump
    `CHRONO_ART_VERSION` when they change). A seed change rebuilds it and `chronoFlushCaches()` clears the caches that
    don't carry the seed: add any new world-and-room cache there. Bump `CHRONO_GEN_VERSION` when the generator changes
    layouts (saves then restart the Chronospire at its gate). Round 378: pipe beds and chasms from world-wide noise
    (`chronoTerrain`), floor inlays, large set pieces.
  - Round 379: **the Chronospire's room map is generated too** (`chronoGraph`): three wings joined by two sealed doors,
    with the roles placed for a fixed order of play (Breaker 1 → Clockwarden's gear → Boss room 1, the Mainspring
    Colossus → Breaker 2 → Paradox Twin's gear → Boss room 2, the Hollow Hour → Breaker 3 → The Last Second).
    `chronoApplyGraph` rewrites the world's tables in place, so **read `TILE_WORLD_DATA.chronospire.roles` only after
    `configureRegion('chronospire')`**. `assets/chrono-locks.js` (after `spot-fixes`) puts `requires: 'chrono:<token>'` on
    the five doors, makes the relay switches the breakers, and writes the objective.
  - Round 383: the Chronospire's 54 rooms grow on an **8x11 grid** (an irregular shape; room keys run past `5,8`), and a
    room's floor is **shapes on a 25px grid** (`FG_COLS` x `FG_ROWS` = 32x20; `plan.shapes` for the painter, `plan.floor`
    for the mask): door stubs, roads in straight and 45-degree legs, eight-sided hubs and squares, loops and spurs.
    The owner rejected curved roads and round squares: keep the straight-edged look. `chronoMapTile` draws the Map screen's
    tile for a room from the same shapes. **Owner's plan: every world will eventually be built this way**; the Chronospire
    is where it is being ironed out.
  - Round 385: **scenery follows the streets** (`chronoRoomProps`): a district per room (`chronoDistrict`, four quarters
    with their own buildings in `CHRONO_DISTRICTS`), one landmark, rows of buildings on street-front lots with cobbled
    yards, lamps along the kerbs, clutter in the back lots. Add new building art to a district's table.
- **Rounds 387-389: Neon Aftermath is generated too** (`assets/city-gen.js` on the Chronospire's generator, theme
  `GEN_THEMES.city`; art in `assets/environment/city-gen/`). Its room map, names, bosses, gear and events stay; its rooms'
  roads, squares, terrain and buildings come from the journey's seed. The painted rooms, traced mask, nooks and
  `ROOM_SPOT_FIXES` below are history, kept in the code but no longer used by the city; Round 391 moved the paintings
  (`environment/rooms/`, `environment/world/`) to `unused assets/`.
- **Round 420: the top-down city's surfaces** are listed, with their rules, in `CITY_SURFACES` (`assets/chrono-gen.js`):
  sea, waterfront, waterfront edge, sidewalk, road (with lanes), curb, lot (under buildings), park, park edge, roof, wall,
  shop. Art is sorted in `assets/environment/city-gen/surfaces/<surface>/` and `props/<kind>/` (old 3/4 art in `legacy/`);
  add art with `tools/prepare_city_art.py`; `tools/art-refresh/city-surfaces.md` is the readable list and
  `tests/city-surfaces.test.cjs` keeps the registry, folders and walk rules in step. Never stretch art; no drawn stand-ins.
  Round 424: slots for park grasses, rubble, street lights, traffic lights, traffic signs and ruins (`cityStreetFurniture`,
  `cityParkRubble`, `cityIsRuin`); an empty slot places nothing, so nothing invisible blocks the way.
  Round 425: a storey is 36px on screen (the hero is ~60px tall; owner: get buildings close to the hero's scale without
  shrinking the hero); walls up to 62% of a lot; cars 72px, rooftop props 1.4x. Round 427: at least 3 floors (owner),
  storeys 42px; a shallow lot drops floors instead of squeezing them. Round 428: every block is filled (open rectangles of
  3x3+ cells left by the splitting become lots), each room is scored for bare paving (`genWorldScore`) and the lots are
  re-drawn when the worst room is over 20%; `tests/city-fill.test.cjs`. Round 430 (owner): **never mix two textures without
  a border between them**; every road and alley is the one `road-wet` texture. Round 436: cargo yards on the docks
  (`cityIsYard`, `cityYardCargo`; open ground, each piece blocks) and the homes quarter's own walls and roofs. Round 437: textures that don't tile were taken out; run
  `python3 tools/tile_check.py` after adding art (seam score; tiled previews to judge repeats by eye). Round 439: each
  quarter's walls, roofs and street floors in `CITY_DISTRICT_ART`; a ruin is an ordinary roof with a hole (`props/roof-hole/`). Round 441: storeys 50px; city objects 42px
  (merchant/Cardsmith 58px) via `#world.td-city`. Round 442: cars 61px; rooftop props keep 18px from a roof's edge;
  no roof texture with objects painted into it (an edge would cut them). Round 443 (owner): only art that fits the
  futuristic neon city (no old-world brick, cobbles, terracotta, clapboard, present-day cars); one traffic light per crossing;
  lamps evenly spaced along each kerb.
  **Round 445: the city's layout rules** (`genWorld`, pinned by `tests/city-layout.test.cjs`): a 25px sidewalk along every
  main road; lots cut from the buildable ground along the streets (rows 7-13 cells deep, lots 5-11 wide); a lot with room for
  three storeys of 42-50px is a building (`cityLotFloors`), a smaller one a yard (`cityYardPieces`: cargo, rubble or a
  parking lot) or a pocket park; nothing within 75px of the sea. A building's quarter, street side, wall and roof come from
  the city's plan (`l.district`, `l.south`, `l.wallN`, `l.roofN`), never per room: about half the buildings cross a room's
  edge. Ruins gather in blast zones (`l.zone`). Only ground joined to a room's streets is walkable. One paving per city;
  corners turn on `cornerR` (22px). `node tests/city-atlas.cjs [seed] [out.png] [x0,y0,cols,rows] [scale]` paints the whole
  city into one picture for checking by eye.
  Round 446: the coast is drawn from smooth fields over the world's sea cells (bays and headlands, shallows, wet sand,
  foam: the `coast` block in `paintChronoRoom`); `CITY_ROOF_KIT` says what rooftop kit each roof takes (none on glass or
  garden roofs); the city's Map-screen roads come from its street plan (`mapRoadNet`).
  Round 447: landmarks (`use: 'landmark'`, about 1 room in 4, `cityLandmarkBox`), street clutter on the main roads' sidewalks
  (`cityStreetFurniture`, `CITY_CLUTTER_H`), a lot's quarter from smooth noise at its own place (neighbourhoods), `l.south`
  looks past the sidewalk; soft edge bands on roads (gutters), parks, yards and building shadows.
  Round 448: **a new journey's seed is random, so check city changes on several seeds**: `SEED=<n> node
  tests/playtest-walk.cjs city` (seeds 1, 2, 9 and 77 found bugs before) and `tests/city-layout.test.cjs` (six seeds). Walkable
  ground must be joined to the streets through the part of the room that can be walked (not the edge strips); object squares
  keep clear of room edges and of where doors set you down.
  Round 449: the main roads' rows and columns come from the seed (`GEN_THEMES.city.mains`; `GEN.seedNow`); a room's
  edge is walkable only on street cells, so every door sits on its road. `tests/playtest-walk.cjs` applies `SEED` after its own `newGame()`.
  Round 450: **one mall a city** (`GEN.mall`): a four-room window holds one wide three-storey building (`l.mall === 'building'`)
  and parking lots with aisles (`l.mall === 'parking'`, `cityYardPieces`); its streets stay as planned. Round 453: its own art in the slots `mall-wall`, `mall-roof`, `mall-shop` (`cityLotSlots`).
  Round 457 (owner): **an interactable object's picture never overlaps a building or any other sprite** (cars, signs, lamps,
  clutter, landmarks, yard pieces): `citySpriteBoxes` / `cityItemBox`, enforced in `assets/city-gen.js` (`cityFixSpot`), which
  also keeps objects off the street; every room gets a square. Add new sprite kinds to `citySpriteBoxes`.
  Round 459: wall pictures with doors
  (`CITY_DOOR_WALLS`) only on the ground floor; a new wall needs its gaps (`CITY_TD_GAPS`) checked by eye over a ruler, as the
  tool's measure misreads dark or lit windows; floors step their windows (`fitRow`'s `prev`).
  Round 460 (owner): the edges (kerbs, park and yard rims, shore: art and `cityEdgeAlong`) are as in Round 457; the Round 458
  strips and Round 459's mitred drawing looked worse to the owner. Don't change edges without showing the owner first.
  Round 461 (owner chose it): the beach's edge is a drawn concrete lip (`GEN.coastLip`), its masks at full resolution
  (`GEN.coastCrisp`), sand at 0.4 scale, small bare-paving pockets by the sea turned to sand. Round 462: streets meeting the
  sand get the lip too and kerbs stop short of it (never an edge on an edge); rooftop kit only on the plain roofs in
  `CITY_ROOF_KIT` (owner), 24px from a roof's edge. Rounds 463-464 (owner): **3x3 bitmasking** for streets (`cityGridRoad`) and
  for kerbs and park/yard rims (`cityGridKerb`, `GEN.gridKerb`): edges on the 25px cell grid, the strip centred on the seam,
  one piece per straight run and an arc per corner. Use it for any new cell-aligned edge. Round 465 (owner): **one edge per
  seam** (`cityRimKeep`): streets own their kerb, buildings their wall, two yards/parks share one rim. Round 466: buildings stand 8px in from their lot, paving round them.
  Round 469 (owner): every side of a yard or park has a kerb or a rim (tested); rims lie inside their lot, with space round them. Round 470: a 1px black outline round every building. Round 471: a rim's open end meets the kerb (no gap, no overlap).
  Round 473 (owner): objects sized to the hero by kind (`CITY_ITEM_PX`; screen sizes, overlap rule and tests all read it).
  Round 474 (owner): street clutter's picture never over a building (posts may be). Round 475: touching yards (or parks)
  are one area with one rim (`wl.rimLead`); roof holes follow the rooftop-kit rule; no scale animations on the hero (blur). Round 480: rims are drawn per room by the
  area's first lot there, after all ground (`rimDone`, `rimQueue`).
  Round 483: **Solaris on the generator, as a preview** (`GEN_THEMES.solaris`, art in `assets/environment/solaris-gen/`; not
  played yet): the city's art tables read the theme in use (`genThemed`: `GEN.tdArt`, `GEN.districtArt`, ...); oases with pools
  (`cityOasisPool`); `THEME=solaris node tests/city-atlas.cjs` paints it; `tests/solaris-gen.test.cjs`. Round 484 (owner): no lamps in the desert. Round 485 (owner): sand roads, monuments on merged lots (`GEN.landmarkSpan`); density is right. Round 486: **Solaris is played on the generator** (`GEN_REGIONS` / `genLive()` / `genTheme()` in `assets/city-gen.js`;
  no diagonal roads; alleys with a sand verge, `GEN.alleyVerge`); check it with `SEED=<n> node tests/playtest-walk.cjs elaris`.
  Round 489 (owner: missing edges, cut-off textures): **a tree's whole canopy stands inside its park** (`CITY_TREE_INSET`), and (Round 490, owner) **no palm's trunk in a pool** (`cityTreeFootInPool`); **a room
  draws its neighbours' street furniture that reaches into it** (`cityFurnitureNear`); **one answer to where the road is painted**
  (`roadDrawnCell`), used by the coast. Anything drawn near a room's edge must be drawn by every room it reaches into; check with
  `node tests/seam-check.cjs [city|elaris] [seed] [dir]` (a stretch it lists may be an edge that just falls on the seam).
  Round 491: a **massing prototype** for buildings (podium + tower, setbacks, wings, L; towers over the building behind), off
  (`GEN.massing`; `CITY_FLAGS='{"massing":true}'` with `tests/city-atlas.cjs` to see it); not an improvement with the current art.
  Round 496: **the owner's whole buildings** (`props/building-<quarter>/`, `CITY_BUILDING_PX`, `cityLotSprite`, cut with
  `tools/cut_building_sheet.py`) stand on the building lots they fit; the rest stay generated. Round 498 (owner): **no grass parks in the
  city** (`GEN.noParks`; Solaris keeps its oases). Round 499: Solaris has the owner's desert buildings the same way. **Owner rule: never distort a
  building (or any art) to make it fit; scale it by one factor for both sides, or don't place it.** `tests/city-buildings.test.cjs`.
  Round 468 (owner): **no shadows** in the city (`GEN.noShadows`): don't add cast shadows, gutters or dark halos.
  Round 421: the **Textures page** (`sprites/index.html`, aethercede.com/sprites) lists all of it by category from
  `sprites/manifest.json`; after adding art run `node tools/build-sprites-manifest.cjs` (`tests/sprites-page.test.cjs` checks it).
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
  - Round 339: `BRIDGE_CUTS` / `STREET_LINKS` in `tools/build_room_masks.py` are hand fixes for automatic bridges that
    run through buildings; `tools/nook_view.py` draws a room with its walk mask and footpaths. **Open owner note:**
    recheck every route for this problem, starting with the list in `tools/route-review.md`.
  - Round 343: in **every world** the Map screen and minimap don't use the paintings or traced blobs. Each room's main roads are vector
    paths (`mapRoadNet` / `mapRoadSvg` in `assets/map-terrain.js`): one road per exit at a 40px-snapped shared edge
    point, straight or with one 45° jog, meeting at the room's hub, drawn like the owner's example (asphalt, pale kerbs,
    dashed centre line, rounded turns). Objects show as small paintings beside the nearest road (`mapRoomObjects`).
    Round 355: hubs are aligned across rooms (`mapRoadAlign`: one height per east-west chain, one column per north-south
    chain), so roads never jog at a seam.
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
  the tapped item opens (Round 184). Map-object paintings (Cardsmiths, lore stones, waypoints, events, merchants, chests, portals: `WORLD_POI_ART`, `EVENT_ART`, `WORLD_CHEST_ART` and `WORLD_PORTAL_ART` in `assets/cardsmith.js`, Rounds 307–342) are keyed off green with `tools/key_object.py` (`--keep-green` for art with real greens,
  `--clear-enclosed` when glow-tinted background is trapped inside the art, `--warm-olive` for see-through parts that
  key to olive). Round 383: objects are 56px (the merchant and the Cardsmith 76px; `ITEM_BOX` matches). Round 358: objects draw at real size, centred on their spot (no half `scale`); beside a street they reach
  onto it by at most 10% of its width (`ITEM_ROAD_SHARE`, `roadWidthAt`); on open ground (Solaris, Sky Isles, plaza squares)
  the whole picture stands on it (`itemGroundCover`); only waypoints and chests glow. In Neon Aftermath every room's object
  stands at its owner-reviewed spot (`assets/spot-fixes.js`, `ROOM_SPOT_FIXES`; loads after `world-relays`). **Open owner note:**
  the positions still feel random; revisit them. Round 275: each item also has a walkable pad (`assets/item-reach.js`) that only player
  movement uses (`collides()`), so placement code must keep using `walkable()`/`NeonCity.blocked`.
- **World card mechanics** (Round 185, `assets/world-mechanics.js`): Neon Aftermath ⌁ Hack, Solaris ☀ Heat,
  Sky Isles 🪶 Tailwind, Elaris 🌱 Growth, Vespera ⚡ Stormcharge; Chronospire's ⏳ Suspend is in `chronospire.js`.
  Each has 4 cards in its world's pool, an arrival gift of 2 (city: first win), a battle tray with a guide, a tag after
  each card's description (Round 238),
  and an affliction that works against it.
- **⚔ Pressure** (Round 226, `assets/pressure.js`): on a turn where you gain no Block from a card, every
  `pressurePer()` damage you deal (2.2 in the first two worlds, rising to 6.7 late) takes 1 off the enemy's
  attack that turn, up to 45% (Round 280 made it 10% weaker: `PRESSURE_STRENGTH`). It makes decks without Block viable; boss HP was re-tuned for it.
- **Concept-lab card mechanics** (Round 206, `assets/card-mechanics.js`): ⤳ Follow-through, ⚡ Amplify and
  ◇ Choose one, via a `stat` wrapper reading `b.chain`, `b.amplifyUid` and `b.modePick`.
- **Creature sprite sheets** (4 frames, one row; magenta or, since Round 222, green background): cut generated art with `tools/cut_sprite_sheet.py`,
  then run `tools/pad_sprite_frames.py` on the result so no art touches a frame's edge (Round 200).
  When an image has more poses than 4 (often two rows), key it, then pick four with
  `tools/compose_sprite_sheet.py` (Round 224).
  Bump `SPRITE_VERSION` in `assets/elaris-wildlife.js` when sheets change. Sheets drawn on black: key with a
  filled silhouette (Round 234). A creature with battle poses and a walk lists `poses: { attack, hurt, walk }` (`sun-revenant.js`).
  Creature art faces right (the map flips it when walking left, battle flips it to face the player); mirror
  left-facing art per frame (Round 257). Round 351: after adding or re-cutting sheets, run `python3 tools/enemy_sizes.py`
  (it writes `assets/enemy-sizes.css`, which scales each creature on the map toward one painted size), then
  `python3 tools/sprite_audit.py` (Round 352: stray fragments, clipped edges, keying fringe, pale matte). Round 356: a draft that is
  one image with eight walk frames in a row on green goes through `python3 tools/strip_to_sheet.py draft.jpeg assets/monsters/<world>/<name>.png`;
  Round 357: a 2×2 grid of four frames adds `--grid 2 --align 1`. The Gemini prompt that works is `tools/art-refresh/creature-walk-prompt.md`.
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
  its own checks. `run(code)` returns the value of the code it runs. It turns enemy tempers off
  unless `TEMPER=1` (Round 253), so tests see exact numbers; Difficulty lab runs should set it. Enemy traits and species patterns
  (Round 265) are off the same way unless `TRAITS=1`, and so are the merchant/Cardsmith greetings (Round 281) unless `NPC_GREET=1`.
- Round 488: the harness gives every journey the same seed (`FIXED_SEED`: 77, or `SEED=<n>`; `RANDOM_SEEDS=1` for fresh
  ones), so each generated world is built once per test file. A new seed costs seconds (a whole city or Solaris): in a test,
  sweep a few seeds at most, and vary `Math.random` instead of the journey seed when only a roll should change.
- Run everything (about 40 minutes; every test should finish well inside its 300s):
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
  Playwright. `node tests/playtest-walk.cjs [world]` walks every door and item with tap routes. `SEED=<n>` fixes the
  journey's seed (Round 448); without it each run walks a different city.
- Difficulty: compendium → Difficulty lab, or `node tests/difficulty-report.cjs [fights] [world]`
  (shared code in `assets/sim/`; `POLICY: 'naive'` plays cards left to right with no counters or combos, and should lose, Round 262).
  **Win-rate targets (Round 288, owner: 20% lower than the Round 263 Solaris benchmark of 72% / 41%):** about 58% on
  regular fights and 33% on bosses for the average build, in every world (`BALANCE.targetHp` in `expansion.js`; the naive
  player should still lose). Tune each world toward these. Tune bosses with the lab (it wears gear and, since Round 253, plays full
  decks of each world's cards, `SIM_DECKS`); `tests/balance-sim.cjs` plays without gear (and has an older script list).

## Intended design (owner, Round 297): don't propose changing these

A playtest flagged these and the owner confirmed they are intended:
- HP carries over between fights, with little healing outside battle (campfires, potions, level-ups). Fights started
  hurt are meant to be much harder.
- Long boss and mini-boss fights in the later worlds (Vespera, Elaris, Chronospire).
- Losing a fight destroys a random non-Soulbound card and sends you back to the world's start at full HP.
- Potions heal a flat amount.
- Soulbinding costs ◇500.
- Solaris uses the forest's events.

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
- **Image prompts (owner, Round 494): every prompt is complete on its own.** Never split prompts into a shared part and
  per-sheet parts: repeat the shared text inside each prompt, so the owner can copy one whole block per image.
- Painted dead ends at room edges are intentional. A street that ends at an
  edge with no matching street on the other side is not a crossing.
