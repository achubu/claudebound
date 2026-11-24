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
