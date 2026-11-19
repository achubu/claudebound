# Walkable parks and ruined buildings for Neon Aftermath (Round 500)

Owner: "lets get prompts for walkable park areas, also unwalkable ruins and destroyed buildings". The building sheets' layout
(4 x 4 cells, wide and narrow in every row, one scale), so `tools/cut_building_sheet.py` cuts them. Parks are whole walkable
rectangles of ground with their own kerb and an entrance gap at the front (no drawn grass and rims); ruins replace the
generated ruin (a roof with a hole) on the blast-zone lots they fit. Each prompt is complete on its own.

## Parks (walkable)

```
A sprite sheet of 16 separate small city parks for a top-down 2D game, on a flat solid pure green background (#00FF00), with
no gradient, pattern or texture in the background.

LAYOUT: an invisible grid of 4 columns by 4 rows of equal cells; each cell is a tall rectangle, 3 units wide by 4 units tall.
Exactly one park in each cell, centred, with clear green space between every park and on every side. Nothing crosses from
one cell into another. No labels, numbers, letters or text anywhere.

In every row, columns 1 and 2 are WIDE parks and columns 3 and 4 are NARROW parks:
- A WIDE park is a rectangle as wide as its cell and about as tall as its cell.
- A NARROW park is a rectangle two thirds as wide as its cell and about as tall as its cell.
Every park is a flat, solid rectangle of ground with straight, crisp edges and square corners, filling its whole rectangle,
with a low concrete kerb or low wall round all four sides and an open gap in the kerb at the middle of the bottom side (the
entrance). All 16 parks share one scale: a bench is the same size in every park.

THESE ARE PLACES TO WALK: most of each park is open paving or paths that a person can walk across. Things in it stay small
and low or sit along the edges: benches, planters, lamps, bins, small trees in round planters, low hedges. The middle of the
park stays open.

ROW 1, market quarter plazas: a neon night-market square with stall-free paving and hanging lanterns, a seating court with
tables and benches, a small square with a hologram sculpture, a narrow alley garden with vending machines.
ROW 2, homes quarter: a community vegetable garden with raised beds, a children's playground with a slide and swings, a
basketball court with a cracked surface, a narrow pocket garden with laundry lines.
ROW 3, tech quarter: a clean plaza of light-grey tiles with glowing floor lines, a zen data garden with raked gravel and
glowing stones, a solar-panel shade court, a narrow drone-landing pad garden.
ROW 4, garden quarter: a koi pond garden (the pond small, in one corner, with stepping stones), a shrine garden with a small
gate and lanterns, a bamboo grove with a winding path, a narrow moss and stone-lantern garden.

VIEW: seen from above, tilted 30 degrees from straight down, orthographic (no perspective, no vanishing point). The ground is
flat, so it fills its rectangle; anything standing on it (lamps, trees, benches) shows a little of its front. No side walls.

STYLE: detailed 2D game art, crisp clean shapes, a gritty futuristic cyberpunk city at night: dark paving, concrete and steel,
teal, magenta and amber neon, soft lamp light, dark green plants. No old-world materials: no brick, cobblestone, terracotta
tile or wooden clapboard.

NOT IN THE PICTURE: no buildings, no streets or roads, nothing outside each park's rectangle; no cast shadows; no glow or light
spilling onto the background; no people or animals; nothing floating between the parks.
```

## Ruins (blocked)

```
A sprite sheet of 16 separate ruined, destroyed buildings for a top-down 2D game, on a flat solid pure green background
(#00FF00), with no gradient, pattern or texture in the background.

LAYOUT: an invisible grid of 4 columns by 4 rows of equal cells; each cell is a tall rectangle, 3 units wide by 4 units tall.
Exactly one ruin in each cell, centred, with clear green space between every ruin and on every side. Nothing crosses from
one cell into another. No labels, numbers, letters or text anywhere.

In every row, columns 1 and 2 are WIDE ruins and columns 3 and 4 are NARROW ruins:
- A WIDE ruin is as wide as its cell. What is left of its roof fills the top third and its broken front wall the bottom two
  thirds, with 1 to 3 floors still standing.
- A NARROW ruin is two thirds as wide as its cell. What is left of its roof fills the top quarter and its broken front wall
  the rest, with 1 to 3 floors still standing.
All 16 ruins share one scale: every floor is the same height in every ruin. Each ruin keeps the straight outline of the
building it was: its rubble stays inside that rectangle, nothing spills outside it.

THESE ARE BLOCKED PLACES: solid wrecks, not open ground. Broken walls, collapsed floors, a roof with a big hole or fallen in,
twisted steel beams and exposed rebar, scorch marks, broken windows, piles of rubble and fallen concrete slabs inside.

ROW 1, market quarter: a burned-out noodle bar with a melted awning, a collapsed arcade with dead neon signs, a gutted pawn shop
with broken shutters, a narrow capsule hotel with its pods spilled open.
ROW 2, homes quarter: a half-collapsed tenement block, a crushed stack of shipping-container homes, a burned shanty block, a
narrow apartment tower snapped off at the second floor.
ROW 3, tech quarter: a glass office with its curtain wall shattered, a server block with a blown-out roof, a wrecked power
substation with fallen cables, a narrow antenna relay with a toppled mast.
ROW 4, the blast zone: a bombed-out block with a crater in its roof, a fire-gutted block with only its front wall standing, a
building cut in half showing its floors inside, a narrow pile of a fallen building held up by steel beams.

VIEW: seen from above, tilted 30 degrees from straight down, orthographic (no perspective, no vanishing point). You see what is
left of the roof from above, and below it only the front wall, which faces the viewer and the bottom of the image. No side
walls are visible. Each ruin has a 1-pixel dark outline round its whole shape.

STYLE: detailed 2D game art, crisp clean shapes, a gritty futuristic cyberpunk city at night: dark concrete, steel, glass,
burned metal, a few flickering broken neon tubes, faint embers. No old-world materials: no brick, cobblestone, terracotta tile
or wooden clapboard.

NOT IN THE PICTURE: no ground, no street, no pavement under the ruins; no cast shadows; no smoke clouds or glow spilling onto
the background; no people; nothing floating between the ruins.
```
