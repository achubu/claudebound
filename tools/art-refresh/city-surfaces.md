# Neon Aftermath: city surfaces (Round 420; layout rules Round 445)

Every surface of the top-down city, in drawing order. The rules live in `CITY_SURFACES` (`assets/chrono-gen.js`), which
the generator reads; `tests/city-surfaces.test.cjs` checks that every surface has its art, that every picture is listed,
and the walk rules. Art lives in `assets/environment/city-gen/`:

- `surfaces/<surface>/`: the ground and building surfaces below;
- `props/<kind>/`: things standing on them (rooftop air units, vents, tanks, stair huts, solar panels, skylights, neon
  signs, cars, trees, rubble, street lights, traffic lights, traffic signs);
- `legacy/`: the old 3/4 city's buildings and textures, not drawn by the top-down city.

Add art with `python3 tools/prepare_city_art.py <image> <slot> <name>` (or `--sheet` / `--objects` for sheets); it goes to
the right folder and into `CITY_TD_ART`. Bump the `chrono-gen.js?v=` tag in `index.html` after.

| # | Surface | Folder | Walk | Rule |
|---|---|---|---|---|
| 1 | Sea | `surfaces/sea/` (water) | no | Only along the city edge, never inland; whole 50px grid cells, corners rounded. |
| 2 | Waterfront (beach sand) | `surfaces/waterfront/` (sand) | yes | Exactly one grid cell wide round the sea; no border between sand and sea. |
| 3 | Waterfront edge | `surfaces/waterfront-edge/` | yes | Shoreline strip along the outline where sand meets paving, bent round corners. |
| 4 | Sidewalk | `surfaces/sidewalk/` | yes | All ground that is not road, sea, sand, lot or park; one paving per city block (the first on half the blocks), so it only changes across a street. Squares where objects stand are sidewalk. Drawn at 0.22. |
| 5 | Road | `surfaces/road/` (road-wet) | yes | One texture for every road and alley (Round 430). Main roads 100px with a dashed centre line (two lanes), alleys 50px; crossings exactly as wide as their roads. Drawn at 0.45. |
| 6 | Curb | `surfaces/curb/` | yes | Kerb-stone strip along both edges of every road, on the sidewalk side, bent round corners. |
| 7 | Under buildings (lot) | `surfaces/lot/` (yard) | no | Fills a building's whole lot; a 4px footing shows round the building. Lots lie wholly on their block. |
| 8 | Park | `surfaces/park/` (overgrowth + grasses) | yes (trees, rubble no) | About 8% of lots; rounded corners; a clear cell of sidewalk from other parks and the shore. Round 424: one grass over the park, a second in soft patches, tiled 140px; rubble lies in it. |
| 9 | Park edge | `surfaces/park-edge/` | yes | One kerb strip per park, round its outline, on a solid base. |
| 10 | Roofs | `surfaces/roof/` | no | Tiled 160px; raised parapet and cast shadow; rooftop props sized per kind. |
| 11 | Walls | `surfaces/wall/` | no | Floor by floor, each starting and ending on plain wall between windows; at least 3 floors (Round 427), storeys 42px. |
| 12 | Shopfronts | `surfaces/shop/` | no | The street floor of a building whose street is to the south. |
| 13 | Ruins (burnt-out wall) | `surfaces/ruin-wall/` | no | A ruin's walls, fitted floor by floor between window holes. Round 439: a ruin has an ordinary roof with a hole in it (`props/roof-hole/`), no rubble. |

Round 424, things standing in the street (`props/<slot>/`, placed by `cityStreetFurniture`): **lamp** (both kerbs of
every main road, about every 150px), **traffic-light** (two opposite corners of each crossing of three or more main
roads), **sign-traffic** (one side of each alley mouth on a main road), **rubble** (2 to 4 per park, on ruined floors).
Posts stand upright on their foot at their own proportions, keep clear of cars, crossings, doors, object squares,
buildings, the sea and each other (60px), and block the way. A slot with no art places nothing.

Rules for all art: two textures never meet without a border between them (a kerb, an edge strip or a building) (Round 430); never stretched (scaled evenly only); nothing is drawn in a slot that has no picture (no drawn
stand-ins); enemies stand only where their whole sprite is on walkable ground.

## Layout rules (Round 445)

Checked by `tests/city-layout.test.cjs`:

- **Sidewalk:** a strip 25px wide runs along every main road and round its corners, and is never built on. Alleys have none.
- **Lots:** the rest of the ground is cut into rectangles along the streets, then into rows 175 to 325px deep and lots
  125 to 275px wide, with 25px alleys in about a third of the cuts.
- **Buildings:** a lot with room for three storeys is a building. Every storey is 42 to 50px tall on screen.
- **Small lots:** a lot too small for a building is a yard (cargo on the docks, rubble in a blast zone, a parking lot
  elsewhere) or a pocket park.
- **Beach:** nothing stands within 75px of the sea, so the sand and the shoreline strip are always clear.
- **Across rooms:** a building looks the same in every room it reaches into.
- **Neighbours:** buildings beside or behind each other don't share a wall or a roof, where the art allows.
- **Ruins:** gathered in blast zones, not sprinkled evenly.
- **Roads:** every corner, square and dead end turns on one 22px radius. Only a boss's room has a square. Vehicles park
  along east-west streets and in parking lots.
- **Paving:** one sidewalk paving for the whole city.
- **Walking:** only ground joined to a room's streets can be walked on.
- **Coast (Round 446):** the shoreline is smooth bays and headlands, never a staircase of cells. The sand is wider in
  bays, with a wet band at the water, pale shallows and a thin line of foam.
- **Rooftop kit (Round 446):** nothing stands on glass or garden roofs; roofs with their own lights or drains take only
  small kit (`CITY_ROOF_KIT`).
- **Landmarks (Round 447):** about 1 room in 4 has one, in an open square on a lot beside a street. The same landmark is
  never used twice close together.
- **Street clutter (Round 447):** on the sidewalks of main roads, against the buildings, between the lamps.
- **Quarters (Round 447):** a quarter is a neighbourhood of several streets, not a single room.
- **Soft edges (Round 447):** roads have a dark gutter along the kerbs; parks and yards have a darker rim; building
  shadows have soft edges.
- **Main roads (Round 449):** their rows and columns come from the journey's seed; a room's edge is crossed only on a
  street, so every door sits on its road.
- **The mall (Round 450):** one a city, about four rooms with its parking; market-quarter art for now (no mall art of its own yet).
