# Sky Isles on the generator: art set (Round 544)

Owner: "lets do whatever will yield us consistent results across worlds when using our procedural algorithm, if you require
new art for that just send the prompts". The city and Solaris are built by one generator from the journey's seed; the Sky
Isles, Elaris and Vespera are still hand-tiled paintings, and the Chronospire runs an older version of the generator. The way
to consistent worlds is to give every world the same generator with its own art set. The Sky Isles are next in world order.

The Sky Isles' look stays as it is (the owner's tiles in `assets/environment/sky/`): a pastel cyberpunk city floating above the
clouds, pink, violet and magenta towers with cyan glass, roof gardens and glass domes, walked on a pale glowing glass deck. On
the generator, open sky takes the place of Solaris's rivers (gaps between the islands, crossed by glass bridges).

Nine prompts, each complete on its own, in the layouts the tools already cut (the same as Solaris's sheets):
1. Ground textures (9 seamless tiles): `tools/prepare_city_art.py`, then `python3 tools/tile_check.py`.
2. Edges (5 seamless strips): cut on one repeat; shown to the owner before they go in (Round 460 rule).
3. Buildings, sheet 1 and 4. Buildings, sheet 2 (16 each): `tools/cut_building_sheet.py`.
5. Yard pieces and clutter (16) and 6. Ruins and walkable roof gardens (16): `tools/cut_building_sheet.py`.
7. Landmarks, vehicles, trees and rooftop kit (16): `tools/cut_building_sheet.py`; landmarks keyed at up to 512px (Round 541).
8. The bridge, east to west and 9. north to south: cut into pieces like Solaris's (Rounds 519 and 528).

Generate each as large as the generator allows (wide or tall as the layout says); every object should fill most of its cell.

## 1. Ground textures (9 seamless tiles)

```
A sprite sheet of 9 seamless ground textures for a top-down 2D game, matching a pastel cyberpunk city floating above the
clouds (pink, violet and magenta towers with cyan glass, roof gardens and glass domes, walked on a pale glowing glass deck),
drawn in clean, crisp game art with dark outlines.

LAYOUT: a grid of 3 columns by 3 rows of equal SQUARE tiles, each tile filling its whole square, with a thin flat pure green
(#00FF00) gap between tiles and round the edge of the sheet. No labels, numbers, letters or text anywhere.

EVERY TILE IS SEAMLESS: the pattern runs off all four edges and continues exactly on the opposite edge, so the tile repeats
without any visible seam or border. No frame, vignette, edge shading or darker rim on any tile; no single big feature in the
middle; even detail spread across the whole square. NO TILE HAS A DIRECTION: no stripes, arrows, rows or grain running one
way, so each tile looks right on a walkway running across or down.

VIEW: straight down from above (flat ground, no perspective, no horizon).

ROW 1: (1) the open deck: pale pearl-white metal deck plating in large square panels with thin seams and a few small rivets;
(2) the walkway edge: small pale cyan glass tiles in a fine square grid, softly lit from below; (3) the main walkway: large
square panes of pale glowing cyan glass in a square grid with thin silver frames.
ROW 2: (4) a plaza: hexagonal glass panes in pale cyan and lavender with thin silver frames; (5) a cargo deck: dark violet
metal plates with bolts and small vents; (6) a market deck: a mosaic of small pink, violet and cyan glass tiles.
ROW 3: (7) the deck beside open sky: dark slate metal grating with fine holes; (8) OPEN SKY seen from far above: soft white and
pale pink clouds over a deep blue-violet sky, fluffy and even, no horizon; (9) a garden path: pale rounded stone pavers with a
little moss in the joints.

STYLE: the same style as the buildings: crisp clean shapes and thin dark line work, flat colours with light, simple shading,
no photo texture, no blur, no noise. Pastel pinks, violets, lavender and pale cyan with soft glows, low contrast so buildings
and people stand out on top.

NOT IN THE PICTURE: no objects standing on the ground, no buildings, no plants standing up, no people, no shadows, no lines or
markings painted on the walkways.
```

## 2. Edges (5 seamless strips)

```
A sprite sheet of 5 seamless horizontal edge strips for a top-down 2D game, matching a pastel cyberpunk city floating above
the clouds (pink, violet and magenta towers with cyan glass, roof gardens and glass domes, walked on a pale glowing glass
deck), drawn in clean, crisp game art with dark outlines.

LAYOUT: 5 long horizontal strips stacked one above the other, each strip 8 times as long as it is tall, filling the width of
the sheet, with a thin flat pure green (#00FF00) gap between strips and round the edge of the sheet. No labels, numbers,
letters or text anywhere.

EVERY STRIP IS SEAMLESS ALONG ITS LENGTH: its left end continues exactly into its right end, so it repeats sideways with no
visible seam, and it has the same height and look along its whole length. No end caps, no corners, no frame.

VIEW: straight down from above, the strip lying flat along the ground, its top edge facing one side and its bottom edge the
other.

STRIP 1: a walkway kerb: a low rim of pale silver metal with a thin glowing cyan light line along it, edging a glass walkway.
STRIP 2: a yard railing: a low railing of pale glass panels between slim chrome posts, seen from above, with a thin pink light
along its top.
STRIP 3: a garden rim: a border of white planter boxes with small pink and teal flowers and leaves spilling over.
STRIP 4: a bridge parapet: a tall balustrade of clear cyan glass panels between ornate silver posts with small glowing lamps.
STRIP 5: the deck's edge over open sky: a thick rim of dark violet metal with a glowing magenta light strip and small
warning lights, the outer side of a floating platform.

STYLE: the same style as the buildings: crisp clean shapes and thin dark line work, flat colours with light, simple shading,
no photo texture, no blur, no noise. Pastel pinks, violets, lavender and pale cyan with soft neon glows.

NOT IN THE PICTURE: no objects, no buildings, no people, no shadows, no glow spilling onto the background.
```

## 3. Buildings, sheet 1

```
A sprite sheet of 16 separate buildings for a top-down 2D game, on a flat solid pure green background (#00FF00), with no
gradient, pattern or texture in the background.

LAYOUT: an invisible grid of 4 columns by 4 rows of equal cells; each cell is a tall rectangle, 3 units wide by 4 units tall.
Exactly one building in each cell, centred, with clear green space between every building and on every side. Nothing crosses
from one cell into another. No labels, numbers, letters or text anywhere.

In every row, columns 1 and 2 are WIDE buildings and columns 3 and 4 are NARROW buildings:
- A WIDE building is as wide as its cell. Its roof fills the top half of the building and its front wall the bottom half,
  with 2 or 3 floors.
- A NARROW building is two thirds as wide as its cell. Its roof fills the top 60% of the building and its front wall the
  rest, with 2 or 3 floors.
All 16 buildings share one scale: every floor is the same height in every building, and a doorway is the same height in
every building.

ROW 1, the skyport bazaar quarter (a busy floating market): a holo-sign shop with a glowing awning, a covered market hall with
a glass roof, a drone-parts stall house, a tea and noodle bar. Ground floors open as shopfronts with neon awnings, hanging
paper lanterns and glowing signs without readable text.
ROW 2, the sky homes quarter (apartments): a stacked apartment block with balconies, a terrace house with a roof garden, a
round pod home with a glass dome, a narrow tower house with bay windows. Simple doors, round and square windows, potted plants.
ROW 3, the aether works quarter (floating-city technology): a power hall with glowing crystal cores on its roof, an airship
dock tower with a landing pad, a data spire workshop, a narrow antenna mast house. Violet metal with cyan glass, pipes and tech
panels.
ROW 4, the sky gardens quarter (greenhouses and parks): a glass-domed greenhouse, a tea pavilion with a curved roof, a
hydroponics house with green-glowing windows, a narrow bell tower with a small dome. Pink blossoms, teal leaves, glass domes.

VIEW: seen from above, tilted 30 degrees from straight down, orthographic (no perspective, no vanishing point). You see the
whole roof from above, and below it only the front wall, which faces the viewer and the bottom of the image. No side walls
are visible. Walls and roof edges are straight and crisp. Each building has a 1-pixel dark outline round its whole shape.

THE ROOF: flat roofs with a low parapet, or glass domes, or roof gardens; rooftop details stand on them (air units, vents,
satellite dishes, solar panels, small trees and flower beds, water tanks), all kept inside the roof's edge.

THE FRONT WALL: 2 or 3 floors. Every window is whole: none is cut off at the left or right edge of the wall. The ground floor
faces the walkway with its doorway, arch or shop opening.

STYLE: detailed 2D game art, crisp clean shapes, a pastel cyberpunk city floating above the clouds in soft daylight: pink,
violet, magenta and lavender walls, cyan and teal glass, silver trim, gold domes, soft neon glows in windows and signs.

NOT IN THE PICTURE: no ground, no deck, no walkway or path under the buildings; no cast shadows; no glow spilling onto the
background; no people or animals; nothing floating between the buildings.
```

## 4. Buildings, sheet 2

```
A sprite sheet of 16 separate buildings for a top-down 2D game, on a flat solid pure green background (#00FF00), with no
gradient, pattern or texture in the background.

LAYOUT: an invisible grid of 4 columns by 4 rows of equal cells; each cell is a tall rectangle, 3 units wide by 4 units tall.
Exactly one building in each cell, centred, with clear green space between every building and on every side. Nothing crosses
from one cell into another. No labels, numbers, letters or text anywhere.

In every row, columns 1 and 2 are WIDE buildings and columns 3 and 4 are NARROW buildings:
- A WIDE building is as wide as its cell. Its roof fills the top half of the building and its front wall the bottom half,
  with 2 or 3 floors.
- A NARROW building is two thirds as wide as its cell. Its roof fills the top 60% of the building and its front wall the
  rest, with 2 or 3 floors.
All 16 buildings share one scale: every floor is the same height in every building, and a doorway is the same height in
every building.

ROW 1, the skyport bazaar quarter: a fashion boutique with a curved glass front, a hover-courier depot with a wide door, an
arcade with glowing screens, a narrow lantern shop. Neon awnings, hanging lanterns, glowing signs without readable text.
ROW 2, the sky homes quarter: a long row of townhouses with balconies, a courtyard apartment with a garden roof, a stacked pod
cluster, a narrow tall apartment with a round window. Simple doors, potted plants, laundry lines.
ROW 3, the aether works quarter: a wind-turbine hall with turbines on its roof, a weather station with dishes and a radar dome,
a narrow crystal battery tower, a narrow beacon house with a glowing light on top. Violet metal, cyan glass, pipes and panels.
ROW 4, the sky gardens quarter and temples: a cloud temple with pale columns and a gold dome, a blossom-tree pavilion, a
narrow observatory with a telescope dome, a narrow shrine gate house. Pink blossoms, teal leaves, glass and gold.

VIEW: seen from above, tilted 30 degrees from straight down, orthographic (no perspective, no vanishing point). You see the
whole roof from above, and below it only the front wall, which faces the viewer and the bottom of the image. No side walls
are visible. Walls and roof edges are straight and crisp. Each building has a 1-pixel dark outline round its whole shape.

THE ROOF: flat roofs with a low parapet, or glass domes, or roof gardens; rooftop details stand on them (air units, vents,
satellite dishes, solar panels, small trees and flower beds, water tanks), all kept inside the roof's edge.

THE FRONT WALL: 2 or 3 floors. Every window is whole: none is cut off at the left or right edge of the wall. The ground floor
faces the walkway with its doorway, arch or shop opening.

STYLE: detailed 2D game art, crisp clean shapes, a pastel cyberpunk city floating above the clouds in soft daylight: pink,
violet, magenta and lavender walls, cyan and teal glass, silver trim, gold domes, soft neon glows in windows and signs.

NOT IN THE PICTURE: no ground, no deck, no walkway or path under the buildings; no cast shadows; no glow spilling onto the
background; no people or animals; nothing floating between the buildings.
```

## 5. Yard pieces and clutter (16 objects)

```
A sprite sheet of 16 separate objects for a top-down 2D game set in a pastel cyberpunk city floating above the clouds, on a
flat solid pure green background (#00FF00), with no gradient, pattern or texture in the background.

LAYOUT: an invisible grid of 4 columns by 4 rows of equal SQUARE cells. Exactly one object in each cell, centred, with clear
green space between every object and on every side. Nothing crosses from one cell into another. No labels, numbers, letters
or text anywhere.

ONE SCALE FOR ALL 16: a person would stand as tall as the market kiosk's counter is wide. Rows 1 and 2 are large pieces that
nearly fill their cell; rows 3 and 4 are small pieces about half the height of their cell.

ROW 1, cargo deck pieces: a stack of rounded violet cargo pods; a hover pallet loaded with crates; a small delivery drone
resting on its landing pad; a cargo crane arm on a base.
ROW 2, market deck pieces: a market kiosk with a neon awning and fruit; a holo-sign stand with a glowing screen without
readable text; a vending machine with glowing buttons; a noodle cart with a paper lantern.
ROW 3, small clutter: a cluster of round planters with pink flowers; a bench of curved white metal; a small glowing lamp post;
a recycling bin with a glowing light.
ROW 4, small scatter: a pile of small crates; a tall potted blossom tree; a rooftop vent; a small satellite dish on a stand.

VIEW: seen from above, tilted 30 degrees from straight down, orthographic (no perspective, no vanishing point): you see the
top of each object and a little of its front, which faces the viewer and the bottom of the image. Each object has a 1-pixel
dark outline round its whole shape.

STYLE: detailed 2D game art, crisp clean shapes and thin dark line work, flat colours with light, simple shading. Pastel
pinks, violets, lavender, pale cyan and silver with soft neon glows.

NOT IN THE PICTURE: no ground, no deck patch or base under the objects (except a piece's own pad or stand); no cast shadows;
no people; no glow spilling onto the background; nothing floating between the objects.
```

## 6. Ruins (blocked) and walkable roof gardens (16 pictures)

```
A sprite sheet of 16 separate pictures for a top-down 2D game set in a pastel cyberpunk city floating above the clouds, on a
flat solid pure green background (#00FF00), with no gradient, pattern or texture in the background: rows 1 and 2 are wrecked,
storm-damaged buildings, rows 3 and 4 are small walkable gardens.

LAYOUT: an invisible grid of 4 columns by 4 rows of equal cells; each cell is a tall rectangle, 3 units wide by 4 units tall.
Exactly one picture in each cell, centred, with clear green space between every picture and on every side. Nothing crosses
from one cell into another. No labels, numbers, letters or text anywhere.

In every row, columns 1 and 2 are WIDE and columns 3 and 4 are NARROW:
- A WIDE picture is as wide as its cell and about as tall as its cell.
- A NARROW picture is two thirds as wide as its cell and about as tall as its cell.
All 16 share one scale: a doorway is the same size in every picture.

ROWS 1 AND 2, RUINS (blocked, solid wrecks): each keeps the straight outline of the building it was, with all its wreckage
inside that rectangle and nothing spilling outside it. What is left of the roof fills the top part and the broken front wall
the bottom part, 1 or 2 floors still standing. Shattered glass, bent violet metal, dead neon signs, torn awnings, a cracked
glass dome.
ROW 1: a storm-wrecked market hall; a shattered glass greenhouse; a broken apartment block with one wall standing; a snapped
antenna tower.
ROW 2: a burnt-out arcade; a crashed airship gondola resting on a broken roof; a cracked glass-domed pod home; a narrow broken
gate with half an arch.

ROWS 3 AND 4, ROOF GARDENS (places to walk): each is a flat, solid rectangle of ground with straight, crisp edges and square
corners, filling its whole rectangle, with a low white planter border round all four sides and an open gap in the border at
the middle of the bottom side (the entrance). Most of each garden is open paving or paths that a person can walk across;
things in it stay small and low or sit along the edges. The middle stays open.
ROW 3: a blossom-tree court with a small round pond in one corner and benches; a tea garden with low hedges round a paved
centre; a lantern garden with paper lanterns on poles along one side; a narrow garden path with potted blossom trees.
ROW 4: a fountain court with a small glass fountain off-centre; a flower garden in low raised beds; a terrace of cushions and
low tables under a light canopy; a narrow stepping-stone garden beside a small channel of water.

VIEW: seen from above, tilted 30 degrees from straight down, orthographic (no perspective, no vanishing point). The ground of a
garden is flat, so it fills its rectangle; anything standing on it shows a little of its front. A ruin shows its roof from
above and its front wall below it, facing the viewer; no side walls. Each picture has a 1-pixel dark outline round its whole
shape.

STYLE: detailed 2D game art, crisp clean shapes and thin dark line work, flat colours with light, simple shading. Pastel
pinks, violets, lavender, pale cyan and silver, pink blossoms and teal leaves, soft neon glows.

NOT IN THE PICTURE: no walkways or deck outside each picture's rectangle; no cast shadows; no people or animals; no glow
spilling onto the background; nothing floating between the pictures.
```

## 7. Landmarks, vehicles, trees and rooftop kit (16 objects)

```
A sprite sheet of 16 separate objects for a top-down 2D game set in a pastel cyberpunk city floating above the clouds, on a
flat solid pure green background (#00FF00), with no gradient, pattern or texture in the background.

LAYOUT: the sheet is a large square image. An invisible grid of 4 columns by 4 rows of equal SQUARE cells. Exactly one object
in each cell, centred, with clear green space between every object and on every side. Nothing crosses from one cell into
another. No labels, numbers, letters or text anywhere.

HIGH DETAIL: each object fills most of its cell, drawn at high resolution with crisp, clean line work, so it stays sharp when
shown large.

ROW 1, LANDMARKS (large monuments, each nearly filling its cell): a giant floating crystal above a round silver plinth, glowing
cyan and pink; a tall slim wind spire with spinning blades and a glowing beacon on top; a statue of a winged guardian on a
square pedestal; a round glass fountain with three tiers and glowing water.
ROW 2, VEHICLES AND TREES: a small parked sky-skiff (a sleek hover car without wheels) facing right; a small parked delivery
hover-van facing right; a round blossom tree with pink flowers, seen from above; a round tree with teal leaves, seen from above.
ROW 3, ROOFTOP KIT (small, about half the height of their cell): a rooftop air unit with a fan; a round water tank on legs; a
small satellite dish; a small solar panel on a stand.
ROW 4, STREET OBJECTS (small, about half the height of their cell): a tall slim street lamp with a glowing cyan globe; a
holo-sign post with a glowing panel without readable text; a small traffic beacon post with pink and cyan lights; a short
bollard with a glowing ring.

VIEW: seen from above, tilted 30 degrees from straight down, orthographic (no perspective, no vanishing point): you see the
top of each object and a little of its front, which faces the viewer and the bottom of the image. Each object has a 1-pixel
dark outline round its whole shape.

STYLE: detailed 2D game art, crisp clean shapes and thin dark line work, flat colours with light, simple shading. Pastel
pinks, violets, lavender, pale cyan, silver and gold with soft neon glows.

NOT IN THE PICTURE: no ground, no deck patch under the objects (except each object's own plinth, pedestal or base); no cast
shadows; no people; no glow spilling onto the green background; nothing floating between the objects.
```

## 8. The bridge, east to west

```
A sprite sheet of one grand glass sky bridge for a top-down 2D game, matching a pastel cyberpunk city floating above the
clouds (pink, violet and magenta towers with cyan glass, roof gardens and glass domes, walked on a pale glowing glass deck),
drawn in clean, crisp game art with dark outlines. On a flat solid pure green background (#00FF00), with no gradient, pattern
or texture in the background.

THE BRIDGE: an over-the-top, monumental bridge for a walkway crossing open sky between two floating islands: a wide deck of
pale glowing cyan glass panes in silver frames, with a thin pink light line running along both edges; tall balustrades of
clear cyan glass panels between ornate silver posts along both sides; at each end a pair of slim gate pylons with small gold
domes and glowing cyan crystals, standing on the corners of the deck; tall lamp posts with glowing globes and a few hanging
pink and violet banners along the balustrades. The deck runs left to right; its two long sides are the top and bottom edges.

LAYOUT: two rows, with clear green space between every piece and round the edge of the sheet. No labels, numbers, letters or
text anywhere.
ROW 1: the whole bridge, about 4 times as long as it is wide, centred.
ROW 2: the same bridge cut into three separate pieces, side by side with green space between them, all at exactly the same
scale and the same width (top edge to bottom edge) as the bridge in row 1:
  PIECE 1, the WEST END: the left gate pylons and the first part of the deck; its right edge is a straight vertical cut
  through the deck.
  PIECE 2, the MIDDLE SECTION: a square length of deck with balustrades, one lamp post on each side in its middle; its left
  and right edges are straight vertical cuts, and it repeats seamlessly: its left edge continues exactly into its right edge,
  so many copies placed end to end make one unbroken bridge.
  PIECE 3, the EAST END: the last part of the deck and the right gate pylons; its left edge is a straight vertical cut through
  the deck, matching the middle section exactly.

VIEW: straight down from directly above (orthographic, no perspective, no tilt): you see the deck from above and the tops of
the balustrades, posts, pylons and lamps. No front faces or side walls are visible.

STYLE: detailed 2D game art, crisp clean shapes and thin dark line work, flat colours with light, simple shading, a 1-pixel
dark outline round each piece. Pastel pinks, violets, pale cyan glass, silver and gold, soft neon glows.

NOT IN THE PICTURE: no clouds, no sky, no islands, no ground, no walkway beyond the bridge; no cast shadows; no glow spilling
onto the green background; no people or vehicles; nothing floating between the pieces.
```

## 9. The bridge, north to south

```
A sprite sheet of one grand glass sky bridge for a top-down 2D game, matching a pastel cyberpunk city floating above the
clouds (pink, violet and magenta towers with cyan glass, roof gardens and glass domes, walked on a pale glowing glass deck),
drawn in clean, crisp game art with dark outlines. On a flat solid pure green background (#00FF00), with no gradient, pattern
or texture in the background.

THE BRIDGE: an over-the-top, monumental bridge for a walkway crossing open sky between two floating islands: a wide deck of
pale glowing cyan glass panes in silver frames, with a thin pink light line running along both edges; tall balustrades of
clear cyan glass panels between ornate silver posts along both sides; at each end a pair of slim gate pylons with small gold
domes and glowing cyan crystals, standing on the corners of the deck; tall lamp posts with glowing globes and a few hanging
pink and violet banners along the balustrades. THE DECK RUNS FROM THE TOP OF THE IMAGE TO THE BOTTOM: its two long sides, with
the balustrades, are its left and right edges.

LAYOUT: three columns, with clear green space between every piece and round the edge of the sheet. No labels, numbers, letters
or text anywhere.
COLUMN 1: the whole bridge, about 4 times as tall as it is wide, centred.
COLUMNS 2 AND 3: the same bridge cut into three separate pieces, at exactly the same scale and the same width (left edge to
right edge) as the bridge in column 1, one above another in column 2 and column 3 with green space between them:
  PIECE 1 (top of column 2), the NORTH END: the top pair of gate pylons and the first part of the deck; its bottom edge is a
  straight horizontal cut through the deck.
  PIECE 2 (bottom of column 2), the MIDDLE SECTION: a square length of deck with balustrades, one lamp post on each side in
  its middle; its top and bottom edges are straight horizontal cuts, and it repeats seamlessly: its top edge continues exactly
  into its bottom edge, so many copies stacked one above another make one unbroken bridge.
  PIECE 3 (column 3), the SOUTH END: the last part of the deck and the bottom pair of gate pylons; its top edge is a straight
  horizontal cut through the deck, matching the middle section exactly.

VIEW: seen from above, tilted 30 degrees from straight down, orthographic (no perspective, no vanishing point), like the
buildings: you see the deck from above, the pylons, posts and lamps standing up with a little of their south-facing front
showing, the gold domes upright. The deck itself is flat, so its two long edges are straight vertical lines.

STYLE: detailed 2D game art, crisp clean shapes and thin dark line work, flat colours with light, simple shading, a 1-pixel
dark outline round each piece. Pastel pinks, violets, pale cyan glass, silver and gold, soft neon glows.

NOT IN THE PICTURE: no clouds, no sky, no islands, no ground, no walkway beyond the bridge; no cast shadows; no glow spilling
onto the green background; no people or vehicles; nothing floating between the pieces.
```

## Fixes after the first sheets (Round 546)

The first east-west bridge came back running north-south; the second (`src/bridge-sheet.jpg`) is drawn tilted like the
north-south one and its row-2 middle piece is two panes deep against the ends' one, so the pieces were cut from row 1's whole
bridge instead (west end, a 2-pane middle that repeats, east end). The hexagonal plaza's pattern isn't regular, so a
replacement plaza tile was asked for: a strict 8 x 8 checkerboard of square glass panes, seamless (optional; the mosaic and
pavers stand in).

## Round 582: filling the bare deck, and a second sky

After Round 581 about a fifth of the Sky Isles' land is still bare deck. Two more sheets (owner: "I can generate those using a
prompt and Google Gemini"). Each prompt is complete on its own.

- **10. Deck dressing (16 pictures):** 8 flat pieces you can walk over (inlays, pads, low beds) and 8 small standing pieces, for the
  bare deck. Cut with `tools/cut_building_sheet.py`; the flat ones go where the deck is bare and never block, the standing ones
  block like clutter.
- **11. A second sky (2 seamless tiles):** two more cloud seas in the same look as `surfaces/water/cloud-sea`, mixed in soft patches
  over the first so its repeat stops showing. Cut and checked with `tools/prepare_city_art.py` and `python3 tools/tile_check.py`.

### 10. Deck dressing (16 pictures)

```
A sprite sheet of 16 separate objects for a top-down 2D game set in a pastel cyberpunk city floating above the clouds (pink,
violet and magenta towers with cyan glass, roof gardens and glass domes, walked on a pale pearl-white metal deck), on a flat
solid pure green background (#00FF00), with no gradient, pattern or texture in the background.

LAYOUT: an invisible grid of 4 columns by 4 rows of equal SQUARE cells. Exactly one object in each cell, centred, with clear
green space between every object and on every side. Nothing crosses from one cell into another. No labels, numbers, letters
or text anywhere.

ONE SCALE FOR ALL 16: a person would stand as tall as the bench in row 3 is long. Rows 1 and 2 are flat pieces that nearly
fill their cell; rows 3 and 4 are standing pieces about half the height of their cell.

ROWS 1 AND 2 ARE FLAT, set into the deck, nothing standing up, so a person can walk across them; each has a clean edge all
round: ROW 1: a round mosaic medallion of pink, violet and cyan glass tiles; a glowing cyan landing-pad circle with a thin
ring of lights; a square inlay of lavender glass panes in a silver frame; a low round garden bed level with the deck, full of
small pink and white flowers. ROW 2: a shallow square reflecting pool with a silver rim and pale glowing water; a hexagonal
inlay of small cyan floor lights; a long rectangle of soft moss and tiny blossoms in a silver frame; a round compass rose of
silver lines and glowing cyan points inlaid in the deck.
ROWS 3 AND 4 ARE SMALL STANDING PIECES: ROW 3: a curved white metal bench with a pink cushion; a round planter with a small
blossom tree; a slim holo-lantern on a short post with a soft cyan glow; a small drinking fountain of white metal and glass.
ROW 4: a cluster of three short glowing bollards; a little round café table with two stools; a telescope on a tripod
pointed at the sky; a tall narrow planter of hanging violet flowers.

VIEW: seen from above, tilted 30 degrees from straight down, orthographic (no perspective, no vanishing point): you see the
top of each object and a little of its front, which faces the viewer and the bottom of the image. The flat pieces in rows 1
and 2 are seen almost straight down. Each object has a 1-pixel dark outline round its whole shape.

STYLE: detailed 2D game art, crisp clean shapes and thin dark line work, flat colours with light, simple shading. Pastel
pinks, violets, lavender, pale cyan and silver with soft neon glows, low contrast for the flat pieces so they sit on the deck
and don't look like objects.

NOT IN THE PICTURE: no ground, no deck patch or base around the objects (except a piece's own rim or frame); no cast shadows;
no people; no glow spilling onto the background; nothing floating between the objects.
```

### 11. A second sky (2 seamless tiles)

```
A sprite sheet of 2 seamless textures for a top-down 2D game set in a pastel cyberpunk city floating above the clouds (pink,
violet and magenta towers with cyan glass, walked on a pale glowing glass deck): the open sky seen from far above, between
the floating islands.

LAYOUT: 2 equal SQUARE tiles side by side, each filling its whole square, with a thin flat pure green (#00FF00) gap between
them and round the edge of the sheet. No labels, numbers, letters or text anywhere.

EVERY TILE IS SEAMLESS: the clouds run off all four edges and continue exactly on the opposite edge, so the tile repeats
without any visible seam or border. No frame, vignette, edge shading or darker rim; no single big feature in the middle; even
detail spread across the whole square, so no one cloud stands out when the tile repeats.

VIEW: straight down from far above, onto a sea of clouds (no horizon, no perspective, no sun).

TILE 1: soft billowing clouds in pale pink, lavender and white over a deep blue-violet sky, with a few small gaps showing the
deep violet below. TILE 2: the same clouds thinner and wispier, more of the deep blue-violet sky showing through in long
soft gaps, a faint cyan glow in the gaps.

STYLE: the same as the rest of the Sky Isles: clean painted 2D game art, soft rounded cloud shapes with gentle violet
shading and thin soft outlines, pastel pinks, violets, lavender and white over deep blue-violet; no photo texture, no noise.
Even light everywhere, low contrast, so the islands and bridges stand out on top.

NOT IN THE PICTURE: no islands, buildings, birds, ships, people, sun, moon or stars; no shadows.
```

## Round 585: both bridges again, in one picture (owner: "vertical bridge bottom is no good, we need to regenerate that";
## "these are upside down"; "in future when we generate bridge prompts we need to account for this"; "vertical and horizontal
## bridges should be generated in a single prompt")

The old north-south south end was a thin cap narrower than the deck, with its two pylons hanging off its bottom edge upside down
(caps pointing down). Until new art comes the game draws that piece only down to the end of its deck (`bridgeV.south.clip`).

**Rules for every bridge prompt** (any world):
1. One prompt makes both bridges, east-west and north-south, in one picture, so they match.
2. The two ends of a bridge are mirror images, the same length and as wide as the deck; each ends in a flat landing with a
   straight edge, and nothing is drawn past it.
3. Every standing thing (pylons, posts, lamps, banners) stands UPRIGHT in every piece, caps and lamps at the top, the same at the
   south end as at the north: image generators like to mirror the north end into the south end, which turns its pylons upside
   down. Say so in the prompt, and check the pieces before cutting them.
4. Each bridge comes whole and cut into its three pieces, at one scale; the middle piece repeats seamlessly.

When it is back: cut the six pieces from the two whole bridges, measure them into `bridgeDeck` (east-west) and `bridgeV`
(north-south; Round 528's measurements: where each piece's deck starts and ends, its deck's left edge and width), drop `clip`,
and run `tools/recolor_sky.py` over them.

### 12. Both bridges, east to west and north to south (blue and steel)

```
A sprite sheet of one grand glass sky bridge drawn twice, once running east to west and once running north to south, for a
top-down 2D game, matching a cool blue and steel cyberpunk city floating above white clouds (steel-grey and white buildings with
cyan glass, glass domes, walked on a pale steel deck with riveted panels), drawn in clean, crisp game art with dark outlines. On a
flat solid pure green (#00FF00) background, with no gradient, pattern or texture in the background.

THE BRIDGE: a monumental bridge for a walkway crossing open sky between two floating islands: a wide deck of pale glowing cyan
glass panes in brushed steel frames, with a thin bright cyan light line along both long edges; tall balustrades of clear cyan
glass panels between slim steel posts along both long sides; tall lamp posts with glowing white globes and a few hanging blue
banners along the balustrades. AT EACH END a pair of gate pylons of steel and glass with glowing cyan crystals and small silver
caps, standing ON the deck's two end corners, inside the deck's width, and a short flat landing plate of riveted steel deck, as
wide as the bridge, that ends the deck with a straight edge. Nothing is drawn past either landing plate. THE TWO ENDS OF EACH
BRIDGE ARE THE SAME LENGTH AND THE SAME WIDTH AS THE DECK.

EVERYTHING STANDS UPRIGHT: every pylon, post, lamp and banner in every piece stands the right way up, its cap, crystal, globe or
top at the top of the image, at both ends of both bridges. The pylons at the south end of the north-south bridge stand upright on
the deck exactly like the ones at its north end: never upside down, never hanging below the deck, never mirrored top to bottom.

LAYOUT: two bands, one above the other, with clear green space between every piece and round the edge of the sheet. No labels,
numbers, letters or text anywhere.
TOP BAND, THE EAST-WEST BRIDGE: its deck runs from left to right, its two long sides (with the balustrades) are its top and
bottom edges. ROW 1: the whole bridge, about 4 times as wide as it is tall, centred. ROW 2: the same bridge cut into three
separate pieces side by side, at exactly the same scale and height as in row 1: the WEST END (the left landing plate, the left
pair of pylons and the first part of the deck; its right edge a straight vertical cut through the deck), the MIDDLE SECTION (a
square length of deck with balustrades, one lamp post on each side in its middle; its left and right edges straight vertical
cuts; it repeats seamlessly, its right edge continuing exactly into its left), and the EAST END (the last part of the deck, the
right pair of pylons and the right landing plate; its left edge a straight vertical cut matching the middle section).
BOTTOM BAND, THE NORTH-SOUTH BRIDGE: its deck runs from top to bottom, its two long sides (with the balustrades) are its left and
right edges, straight vertical lines. COLUMN 1: the whole bridge, about 4 times as tall as it is wide. COLUMNS 2 AND 3: the same
bridge cut into three separate pieces at exactly the same scale and width as in column 1: the NORTH END (top of column 2: the top
landing plate, the top pair of pylons and the first part of the deck; its bottom edge a straight horizontal cut), the MIDDLE
SECTION (bottom of column 2: a square length of deck, one lamp post on each side in its middle; straight horizontal cuts top and
bottom; it repeats seamlessly, its top edge continuing exactly into its bottom), and the SOUTH END (column 3: the last part of the
deck, the bottom pair of pylons, standing upright, and the bottom landing plate; its top edge a straight horizontal cut matching
the middle section; the same length as the north end).

VIEW: seen from above, tilted 30 degrees from straight down, orthographic (no perspective, no vanishing point), like the
buildings: you see each deck from above, and the pylons, posts and lamps standing up with a little of their south-facing front
showing, on both bridges. The decks themselves are flat, so their long edges are straight lines.

STYLE: detailed 2D game art, crisp clean shapes and thin dark line work, flat colours with light, simple shading, a 1-pixel dark
outline round each piece. Cool blues, cyan glass, steel grey, white and silver, soft cyan glows. No pink, no purple, no gold.

NOT IN THE PICTURE: no clouds, no sky, no islands, no ground beyond the landing plates, no walkway beyond the bridges; no cast
shadows; no glow spilling onto the green background; no people or vehicles; nothing floating between the pieces.
```
