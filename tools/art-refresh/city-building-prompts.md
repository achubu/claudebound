# Whole-building sprites for Neon Aftermath (Round 492)

Owner: "lets get a prompt to generate buildings then we only place them where they fit and leave procedurally generated
buildings everywhere else for now".

One sheet per quarter of the city. Every sheet has the same layout, so it can be cut by machine:

- 4 columns x 2 rows of equal cells, on flat pure green (#00FF00).
- **Top row: 4 wide buildings.** Each fills its cell's width. It is about 3 wide by 4 tall: a flat roof on the top third and
  the front wall, with exactly 3 floors, on the bottom two thirds. In the game: about 150 x 200 px, for lots ~150 px wide.
- **Bottom row: 4 narrow buildings.** Each is two thirds of its cell's width, centred. About 5 wide by 9 tall: the roof on the
  top quarter and the front wall, again exactly 3 floors, on the rest. In the game: about 100 x 180 px, for lots ~100 px wide.
- Floors are the same height in all eight buildings (the scale is what lets them stand beside the generated ones).

The game cuts each building out, measures it, and places it only on lots it fits (scaled by 0.85-1.15 at most, never
stretched). Every other lot keeps a generated building.

Paste the shared part, then one quarter's part.

---

## Shared part (paste first, every time)

```
A sprite sheet of 8 separate buildings for a top-down 2D game, on a flat solid pure green background (#00FF00), with
no gradient, pattern or texture in the background.

LAYOUT: an invisible grid of 4 columns by 2 rows of equal cells. Each cell is a tall rectangle, 3 units wide by 4 units tall.
Exactly one building in each cell, centred, with clear green space between every building and on every side.
Nothing crosses from one cell into another. No labels, numbers, letters or text anywhere.

TOP ROW, 4 wide buildings: each building is as wide as its cell. Its flat roof fills the top third of the building, and its
front wall fills the bottom two thirds, with exactly 3 floors.
BOTTOM ROW, 4 narrow buildings: each building is two thirds as wide as its cell. Its flat roof fills the top quarter of the
building, and its front wall fills the rest, with exactly 3 floors.
All 8 buildings share one scale: every floor is the same height in every building.

VIEW: seen from above, tilted 30 degrees from straight down, orthographic (no perspective, no vanishing point). You see the
whole flat roof from above, and below it only the front wall, which faces the viewer and the bottom of the image. No side
walls are visible. The roof and the front wall are straight rectangles with crisp, straight edges. Each building has a
1-pixel dark outline round its whole shape.

THE ROOF: a flat roof with a low parapet round its edge, and rooftop equipment standing on it (air conditioning units, vents,
water tanks, antennas, small stair huts), all kept inside the parapet.

THE FRONT WALL: exactly 3 floors. Every window is whole: no window is cut off at the left or right edge of the wall. The
ground floor faces the street: an entrance door or a shopfront, at the bottom centre or to one side. Upper floors have
windows, small balconies, pipes, wall-mounted air units.

STYLE: detailed 2D game art, crisp clean shapes, a gritty futuristic cyberpunk city at night: dark concrete, steel, glass and
metal panels, lit windows, teal, magenta and amber neon. No old-world materials: no brick, cobblestone, terracotta tile or
wooden clapboard. No modern-day cars.

NOT IN THE PICTURE: no ground, no street, no pavement, no grass under the buildings; no cast shadows; no glow or light
spilling onto the background; no people; nothing floating between the buildings.
```

## Market quarter (paste after the shared part)

```
THIS SHEET: the market quarter, a crowded neon street market. The 8 buildings are: a noodle bar, an arcade, a pawn shop,
a capsule hotel, a ramen and dumpling stall building, a karaoke bar, a corner store, a street-food court. Ground floors are
shopfronts with lit counters, roll-up shutters and fabric awnings; small glowing signs on the walls (shapes and colours
only, no readable letters); lanterns and cables strung across the fronts.
```

## Homes quarter (paste after the shared part)

```
THIS SHEET: the homes quarter, poor and crowded housing. The 8 buildings are: a stacked tenement block, a block made of
shipping containers, a capsule pod apartment block, a walk-up block of flats, a shanty block of patched metal sheets,
a boarding house, a block with laundry hanging from its balconies, a block with a small rooftop garden. Ground floors have
plain entrance doors (no shops); lots of small balconies, air units, pipes and patched panels; a few windows lit.
```

## Tech quarter (paste after the shared part)

```
THIS SHEET: the tech quarter, sleek corporate and industrial buildings. The 8 buildings are: a glass office block, a server
data block with cooling units, a power substation building, a drone hangar with a wide roof door, a battery depot, a data
relay with antenna arrays on its roof, a robotics workshop, a research lab. Clean glass curtain walls, steel panels, thin
LED light strips, large rooftop cooling fans and solar panels; ground floors are lobbies with glass doors.
```

## Garden quarter (paste after the shared part)

```
THIS SHEET: the garden quarter, futuristic buildings with plants. The 8 buildings are: a greenhouse with a glass roof, a tea
house with a curved-edge roof trim, a shrine gate hall, a hydroponic farm block, a bathhouse, a temple hall, a flower shop
building, a lantern court building. Plants on balconies and roofs, glass panels, soft green and warm lantern light; ground
floors are shop or hall entrances. The roofs stay flat (planters and glass panels on them), with a parapet.
```
