# Solaris ground, edges, yards and ruins (Round 515)

Owner: "give me a prompt to improve on solaris graphics as you deem necessary". What Solaris lacks (Round 514 review): its
ground is one sand everywhere, its yards are city car parks (cracked mud with rovers in rows), its yard and oasis rims are the
city's steel rail, its open sand is bare (one plant, one palm), and it has no ruins, walkable gardens or bridges. Four
prompts, each complete on its own, in the layouts the city's sheets used, so they are cut the same way:

- Ground: `tools/prepare_city_art.py` (`texture()`), checked with `python3 tools/tile_check.py`. No tile may have a direction
  (roads run both ways).
- Edges: cut on one repeat like the city's kerb and rail (Round 505). Shown to the owner before they go in (Round 460 rule).
- Props and yard pieces, ruins and gardens: `tools/cut_building_sheet.py` (4 x 4 cells), sized by kind like the city's.

## 1. Ground textures (9 seamless tiles)

```
A sprite sheet of 9 seamless ground textures for a top-down 2D game, matching a set of cartoon desert town buildings
(sandstone and adobe houses, domes, pyramids, palm oases) drawn in clean, crisp game art with dark outlines.

LAYOUT: a grid of 3 columns by 3 rows of equal SQUARE tiles, each tile filling its whole square, with a thin flat pure green
(#00FF00) gap between tiles and round the edge of the sheet. No labels, numbers, letters or text anywhere.

EVERY TILE IS SEAMLESS: the pattern runs off all four edges and continues exactly on the opposite edge, so the tile repeats
without any visible seam or border. No frame, vignette, edge shading or darker rim on any tile; no single big feature in the
middle; even detail spread across the whole square. NO TILE HAS A DIRECTION: no wheel ruts, stripes, rows or grain running one
way, so each tile looks right on a road running across or down.

VIEW: straight down from above (flat ground, no perspective, no horizon).

ROW 1: (1) loose golden desert sand with soft small ripples and a few pebbles; (2) packed, sun-baked pale earth, smoother and
lighter than the sand, with fine hairline cracks; (3) a road of large worn sandstone paving slabs in an irregular pattern,
with thin sand-filled joints.
ROW 2: (4) a market square of small square terracotta and sandstone tiles in a simple pattern, worn and dusty; (5) a caravan
yard of trampled earth with scattered straw and small stones; (6) a threshing floor of hard clay with chaff and straw.
ROW 3: (7) damp dark river-bank sand with tiny pebbles and a few small reeds lying flat; (8) clear desert river water, teal
and blue, with soft ripples and small light glints; (9) a garden path of crushed pale gravel.

STYLE: the same style as the buildings: crisp clean shapes and thin dark line work, flat colours with light, simple shading,
no photo texture, no blur, no noise. A sunny desert town: warm golds, ochres, sandstone, terracotta and pale clay, low
contrast so buildings and people stand out on top.

NOT IN THE PICTURE: no objects standing on the ground, no buildings, no plants standing up, no people or animals, no shadows,
no lines or markings painted on the road.
```

## 2. Edges and a bridge (5 seamless strips)

```
A sprite sheet of 5 seamless horizontal edge strips for a top-down 2D game, matching a set of cartoon desert town buildings
(sandstone and adobe houses, domes, pyramids, palm oases) drawn in clean, crisp game art with dark outlines.

LAYOUT: 5 long horizontal strips stacked one above the other, each strip 8 times as long as it is tall, filling the width of
the sheet, with a thin flat pure green (#00FF00) gap between strips and round the edge of the sheet. No labels, numbers,
letters or text anywhere.

EVERY STRIP IS SEAMLESS ALONG ITS LENGTH: its left end continues exactly into its right end, so it repeats sideways with no
visible seam, and it has the same height and look along its whole length. No end caps, no corners, no frame.

VIEW: straight down from above, the strip lying flat along the ground, its top edge facing one side and its bottom edge the
other.

STRIP 1: a road kerb: a band of pale sandstone kerb blocks with thin dark joints, edging a paved desert road.
STRIP 2: a yard wall: a low wall of sun-dried mud bricks with a rounded plastered top, seen from above, small cracks.
STRIP 3: an oasis rim: a border of rounded river stones with small tufts of green grass between them.
STRIP 4: a bridge parapet: a low carved sandstone balustrade along the side of a bridge, its small pillars evenly spaced.
STRIP 5: a garden edge: a low border of square terracotta tiles set on edge.

STYLE: the same style as the buildings: crisp clean shapes and thin dark line work, flat colours with light, simple shading,
no photo texture, no blur, no noise. A sunny desert town: warm golds, ochres, sandstone, terracotta and pale clay.

NOT IN THE PICTURE: no objects, no buildings, no people, no shadows, no glow spilling onto the background.
```

## 3. Yard pieces and desert clutter (16 objects)

```
A sprite sheet of 16 separate objects for a top-down 2D game set in a sunny desert town, on a flat solid pure green background
(#00FF00), with no gradient, pattern or texture in the background.

LAYOUT: an invisible grid of 4 columns by 4 rows of equal SQUARE cells. Exactly one object in each cell, centred, with clear
green space between every object and on every side. Nothing crosses from one cell into another. No labels, numbers, letters
or text anywhere.

ONE SCALE FOR ALL 16: a person would stand as tall as the market stall's counter is wide. Rows 1 and 2 are large pieces that
nearly fill their cell; rows 3 and 4 are small pieces about half the height of their cell.

ROW 1, caravan yard pieces: a striped canvas caravan tent with its flaps tied open; a wooden two-wheeled cart loaded with
sacks; a stack of wooden crates and rope-tied bundles; a resting camel lying down with a saddle and blanket.
ROW 2, market yard pieces: a market stall with a cloth awning and fruit; a carpet seller's wooden frame hung with patterned
rugs; a stone well with a wooden winch and a bucket; a stack of straw bales.
ROW 3, small clutter: a cluster of tall clay water jars; a pile of pottery and baskets; a small date palm in a big clay pot;
a cloth banner on a wooden pole.
ROW 4, desert scatter: a cluster of sandstone rocks; a dry thorny desert shrub; a tall green cactus; a bleached animal skull
and bones half in the sand.

VIEW: seen from above, tilted 30 degrees from straight down, orthographic (no perspective, no vanishing point): you see the
top of each object and a little of its front, which faces the viewer and the bottom of the image. Each object has a 1-pixel
dark outline round its whole shape.

STYLE: detailed 2D game art, crisp clean shapes and thin dark line work, flat colours with light, simple shading. A sunny
desert town: warm golds, ochres, sandstone, terracotta, pale clay, faded reds and blues on cloth.

NOT IN THE PICTURE: no ground, no sand patch or base under the objects; no cast shadows; no people; no glow; nothing
floating between the objects.
```

## 4. Ruins (blocked) and walkable oasis gardens (16 pictures)

```
A sprite sheet of 16 separate pictures for a top-down 2D game set in a sunny desert town, on a flat solid pure green
background (#00FF00), with no gradient, pattern or texture in the background: rows 1 and 2 are ruined, half-buried
buildings, rows 3 and 4 are small walkable oasis gardens.

LAYOUT: an invisible grid of 4 columns by 4 rows of equal cells; each cell is a tall rectangle, 3 units wide by 4 units tall.
Exactly one picture in each cell, centred, with clear green space between every picture and on every side. Nothing crosses
from one cell into another. No labels, numbers, letters or text anywhere.

In every row, columns 1 and 2 are WIDE and columns 3 and 4 are NARROW:
- A WIDE picture is as wide as its cell and about as tall as its cell.
- A NARROW picture is two thirds as wide as its cell and about as tall as its cell.
All 16 share one scale: a doorway is the same size in every picture.

ROWS 1 AND 2, RUINS (blocked, solid wrecks): each keeps the straight outline of the building it was, with all its rubble inside
that rectangle and nothing spilling outside it. What is left of the roof fills the top part and the broken front wall the
bottom part, 1 or 2 floors still standing. Sand drifted against the walls and in through the gaps, broken columns, fallen
sandstone blocks, cracked domes.
ROW 1: a ruined temple with toppled columns; a collapsed domed bathhouse half full of sand; a broken mud-brick house with one
wall standing; a cracked watchtower stump.
ROW 2: a sand-buried market hall, only its arches showing; a fallen pyramid shrine with scattered blocks; a ruined well-house
with a caved-in roof; a narrow broken gate with half an arch.

ROWS 3 AND 4, OASIS GARDENS (places to walk): each is a flat, solid rectangle of ground with straight, crisp edges and square
corners, filling its whole rectangle, with a low sandstone or mud-brick border round all four sides and an open gap in the
border at the middle of the bottom side (the entrance). Most of each garden is open paving or paths that a person can walk
across; things in it stay small and low or sit along the edges. The middle stays open.
ROW 3: a palm court with a small square pool in one corner and stone benches; a date grove of small palms in rows round a
paved centre; a shaded courtyard with a cloth awning and cushions along one side; a narrow garden path with potted palms.
ROW 4: a fountain garden with a small tiled fountain off-centre; a herb and flower garden in low raised beds; a terrace of
striped rugs and low tables; a narrow reed and stepping-stone garden beside a small channel of water.

VIEW: seen from above, tilted 30 degrees from straight down, orthographic (no perspective, no vanishing point). The ground of a
garden is flat, so it fills its rectangle; anything standing on it shows a little of its front. A ruin shows its roof from
above and its front wall below it, facing the viewer; no side walls. Each picture has a 1-pixel dark outline round its whole
shape.

STYLE: detailed 2D game art, crisp clean shapes and thin dark line work, flat colours with light, simple shading. A sunny
desert town: warm golds, ochres, sandstone, terracotta and pale clay, clear teal water, fresh green palms.

NOT IN THE PICTURE: no streets or roads, no sand outside each picture's rectangle; no cast shadows; no people or animals; no
glow; nothing floating between the pictures.
```
