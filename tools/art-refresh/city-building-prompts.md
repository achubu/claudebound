# Whole-building sprites for Neon Aftermath (Rounds 492-493)

Owner: "lets get a prompt to generate buildings then we only place them where they fit and leave procedurally generated
buildings everywhere else for now"; then "can this be done in a single prompt to make multiple buildings at a time please?
i want at least 4 buildings per sheet per area".

One prompt, one sheet: 4 rows (one per quarter of the city) of 4 buildings. In each row the first two buildings are wide
(about 150 x 200 px in the game, for lots ~150 px wide) and the last two narrow (about 100 x 180 px, for lots ~100 px wide).
All 16 have exactly 3 floors at one scale. Run it again for more variety: every sheet has the same layout, so each is cut the
same way. The game cuts each building out, measures it, and places it only on lots it fits (scaled 0.85-1.15 at most, never
stretched); every other lot keeps a generated building.

## Sheet 1

```
A sprite sheet of 16 separate buildings for a top-down 2D game, on a flat solid pure green background (#00FF00), with no
gradient, pattern or texture in the background.

LAYOUT: an invisible grid of 4 columns by 4 rows of equal cells; each cell is a tall rectangle, 3 units wide by 4 units tall.
Exactly one building in each cell, centred, with clear green space between every building and on every side. Nothing crosses
from one cell into another. No labels, numbers, letters or text anywhere.

In every row, columns 1 and 2 are WIDE buildings and columns 3 and 4 are NARROW buildings:
- A WIDE building is as wide as its cell. Its flat roof fills the top third of the building and its front wall the bottom two
  thirds, with exactly 3 floors.
- A NARROW building is two thirds as wide as its cell. Its flat roof fills the top quarter of the building and its front wall
  the rest, with exactly 3 floors.
All 16 buildings share one scale: every floor is the same height in every building.

ROW 1, the market quarter (a crowded neon street market): a noodle bar, an arcade, a pawn shop, a capsule hotel. Ground floors
are shopfronts with lit counters, roll-up shutters and fabric awnings; small glowing signs (shapes and colours only, no
readable letters); lanterns and cables across the fronts.
ROW 2, the homes quarter (poor, crowded housing): a stacked tenement block, a block made of shipping containers, a capsule pod
apartment block, a shanty block of patched metal sheets. Plain entrance doors on the ground floor (no shops); many small
balconies, air units, pipes, patched panels, laundry; a few windows lit.
ROW 3, the tech quarter (sleek corporate and industrial): a glass office block, a server data block with cooling units, a
power substation, a data relay with antenna arrays. Glass curtain walls, steel panels, thin LED light strips, rooftop cooling
fans and solar panels; ground floors are lobbies with glass doors.
ROW 4, the garden quarter (futuristic buildings with plants): a greenhouse with a glass roof, a tea house with a curved-edge
roof trim, a hydroponic farm block, a bathhouse. Plants on balconies and roofs, glass panels, soft green and warm lantern
light; the roofs stay flat (planters and glass panels on them).

VIEW: seen from above, tilted 30 degrees from straight down, orthographic (no perspective, no vanishing point). You see the
whole flat roof from above, and below it only the front wall, which faces the viewer and the bottom of the image. No side
walls are visible. The roof and the front wall are straight rectangles with crisp, straight edges. Each building has a
1-pixel dark outline round its whole shape.

THE ROOF: flat, with a low parapet round its edge, and rooftop equipment standing on it (air units, vents, water tanks,
antennas, small stair huts), all kept inside the parapet.

THE FRONT WALL: exactly 3 floors. Every window is whole: none is cut off at the left or right edge of the wall. The ground
floor faces the street with its entrance door or shopfront.

STYLE: detailed 2D game art, crisp clean shapes, a gritty futuristic cyberpunk city at night: dark concrete, steel, glass and
metal panels, lit windows, teal, magenta and amber neon. No old-world materials: no brick, cobblestone, terracotta tile or
wooden clapboard. No modern-day cars.

NOT IN THE PICTURE: no ground, no street, no pavement, no grass under the buildings; no cast shadows; no glow or light
spilling onto the background; no people; nothing floating between the buildings.
```

## Sheet 2 (Round 495: 16 more, for variety; the same layout and scale)

```
A sprite sheet of 16 separate buildings for a top-down 2D game, on a flat solid pure green background (#00FF00), with no
gradient, pattern or texture in the background.

LAYOUT: an invisible grid of 4 columns by 4 rows of equal cells; each cell is a tall rectangle, 3 units wide by 4 units tall.
Exactly one building in each cell, centred, with clear green space between every building and on every side. Nothing crosses
from one cell into another. No labels, numbers, letters or text anywhere.

In every row, columns 1 and 2 are WIDE buildings and columns 3 and 4 are NARROW buildings:
- A WIDE building is as wide as its cell. Its flat roof fills the top third of the building and its front wall the bottom two
  thirds, with exactly 3 floors.
- A NARROW building is two thirds as wide as its cell. Its flat roof fills the top quarter of the building and its front wall
  the rest, with exactly 3 floors.
All 16 buildings share one scale: every floor is the same height in every building.

ROW 1, the market quarter (a crowded neon street market): a karaoke bar, a street-food court, a tattoo parlour, a cyber-repair
shop. Ground floors are shopfronts with lit counters, roll-up shutters and fabric awnings; small glowing signs (shapes and
colours only, no readable letters); hanging lanterns, holographic panels and cables across the fronts.
ROW 2, the homes quarter (poor, crowded housing): a walk-up block of flats, a boarding house, a block with a small rooftop
garden, a narrow stacked micro-apartment tower. Plain entrance doors on the ground floor (no shops); many small balconies,
air units, satellite dishes, pipes, patched panels, laundry lines; a few windows lit.
ROW 3, the tech quarter (sleek corporate and industrial): a drone hangar with a wide roof door, a battery depot, a robotics
workshop, a research lab. Glass curtain walls, steel panels, thin LED light strips, rooftop cooling fans, landing pads and
solar panels; ground floors are lobbies with glass doors or loading bays.
ROW 4, the garden quarter (futuristic buildings with plants): a shrine gate hall, a temple hall, a flower shop, a lantern
court. Plants on balconies and roofs, glass panels, hanging lanterns, soft green and warm lantern light; the roofs stay flat
(planters, glass panels and small trees in pots on them).

VIEW: seen from above, tilted 30 degrees from straight down, orthographic (no perspective, no vanishing point). You see the
whole flat roof from above, and below it only the front wall, which faces the viewer and the bottom of the image. No side
walls are visible. The roof and the front wall are straight rectangles with crisp, straight edges. Each building has a
1-pixel dark outline round its whole shape.

THE ROOF: flat, with a low parapet round its edge, and rooftop equipment standing on it (air units, vents, water tanks,
antennas, small stair huts), all kept inside the parapet.

THE FRONT WALL: exactly 3 floors. Every window is whole: none is cut off at the left or right edge of the wall. The ground
floor faces the street with its entrance door or shopfront.

STYLE: detailed 2D game art, crisp clean shapes, a gritty futuristic cyberpunk city at night: dark concrete, steel, glass and
metal panels, lit windows, teal, magenta and amber neon. No old-world materials: no brick, cobblestone, terracotta tile or
wooden clapboard. No modern-day cars.

NOT IN THE PICTURE: no ground, no street, no pavement, no grass under the buildings; no cast shadows; no glow or light
spilling onto the background; no people; nothing floating between the buildings.
```
