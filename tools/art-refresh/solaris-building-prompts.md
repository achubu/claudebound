# Whole-building sprites for Solaris (Round 497)

Owner: "give me prompts for solaris next, buildings, desert huts, pyramids, all desert themed". The same layout as the city's
(`city-building-prompts.md`), so `tools/cut_building_sheet.py` cuts them the same way; rows follow Solaris's four quarters
(theme `GEN_THEMES.solaris`: `market` the bazaar, `homes` the mud-brick homes, `tech` the solar works, `garden` the water
quarter). Low buildings (1-2 floors, as the generated ones, `floorRange`), daylight. Solaris's building lots are about the size
of the city's (mostly 100-175 wide, 175-225 deep). Each prompt is complete on its own.

## Sheet 1

```
A sprite sheet of 16 separate buildings for a top-down 2D game, on a flat solid pure green background (#00FF00), with no
gradient, pattern or texture in the background.

LAYOUT: an invisible grid of 4 columns by 4 rows of equal cells; each cell is a tall rectangle, 3 units wide by 4 units tall.
Exactly one building in each cell, centred, with clear green space between every building and on every side. Nothing crosses
from one cell into another. No labels, numbers, letters or text anywhere.

In every row, columns 1 and 2 are WIDE buildings and columns 3 and 4 are NARROW buildings:
- A WIDE building is as wide as its cell. Its roof fills the top half of the building and its front wall the bottom half,
  with 1 or 2 floors.
- A NARROW building is two thirds as wide as its cell. Its roof fills the top 60% of the building and its front wall the
  rest, with 1 or 2 floors.
All 16 buildings share one scale: every floor is the same height in every building, and a doorway is the same height in
every building.

ROW 1, the bazaar quarter (a busy desert market): a spice merchant's shop, a covered bazaar hall, a lamp and crystal seller's
stall house, a tea house. Ground floors open as shopfronts with striped fabric awnings, hanging lamps, baskets and jars.
ROW 2, the mud-brick homes quarter (plain family homes): a two-floor adobe house, a courtyard house, a small domed hut, a
narrow mud-brick tower house. Simple wooden doors, small windows with shutters, rugs and water jars on the roofs.
ROW 3, the solar works quarter (desert technology): a solar power hall with a roof of solar panels, a mirror-tower workshop, a
battery and crystal store, a narrow wind-catcher pump house. Sandstone walls with copper pipes, teal glass and tech panels.
ROW 4, the water quarter (wells and gardens): a public well house, a bathhouse with a low dome, a water seller's shop, a
narrow cistern tower. Blue-glazed tiles, palm fronds and potted plants, brass taps and channels.

VIEW: seen from above, tilted 30 degrees from straight down, orthographic (no perspective, no vanishing point). You see the
whole roof from above, and below it only the front wall, which faces the viewer and the bottom of the image. No side walls
are visible. Walls and roof edges are straight and crisp. Each building has a 1-pixel dark outline round its whole shape.

THE ROOF: mostly flat roofs with a low parapet, or low domes, or the stepped top of a small pyramid; rooftop details stand on
them (water tanks, wind catchers, solar mirrors, chimneys, awnings, rugs drying, clay jars), all kept inside the roof's edge.

THE FRONT WALL: 1 or 2 floors. Every window is whole: none is cut off at the left or right edge of the wall. The ground floor
faces the street with its doorway, arch or stall opening.

STYLE: detailed 2D game art, crisp clean shapes, a sunny techno-desert city in bright daylight: warm sandstone, adobe and
mud brick, clay and copper, woven canopies, with futuristic touches: solar panels, brass pipes, teal glass, small glowing
crystals and tech panels. Warm sand, ochre, terracotta and copper colours with teal accents.

NOT IN THE PICTURE: no ground, no sand, no street or path under the buildings; no cast shadows; no glow spilling onto the
background; no people or animals; nothing floating between the buildings.
```

## Sheet 2

```
A sprite sheet of 16 separate buildings for a top-down 2D game, on a flat solid pure green background (#00FF00), with no
gradient, pattern or texture in the background.

LAYOUT: an invisible grid of 4 columns by 4 rows of equal cells; each cell is a tall rectangle, 3 units wide by 4 units tall.
Exactly one building in each cell, centred, with clear green space between every building and on every side. Nothing crosses
from one cell into another. No labels, numbers, letters or text anywhere.

In every row, columns 1 and 2 are WIDE buildings and columns 3 and 4 are NARROW buildings:
- A WIDE building is as wide as its cell. Its roof fills the top half of the building and its front wall the bottom half,
  with 1 or 2 floors.
- A NARROW building is two thirds as wide as its cell. Its roof fills the top 60% of the building and its front wall the
  rest, with 1 or 2 floors.
All 16 buildings share one scale: every floor is the same height in every building, and a doorway is the same height in
every building.

ROW 1, the bazaar quarter (a busy desert market): a carpet seller's shop, a caravan inn, a jewellery and amulet stall house,
a fruit and date seller's stall. Ground floors open as shopfronts with striped fabric awnings, hanging lamps, rugs, baskets.
ROW 2, the mud-brick homes quarter: a thatch-and-adobe hut, a house with a rooftop terrace, a round domed beehive hut, a
narrow two-floor house with a wind catcher. Simple wooden doors, small shuttered windows, laundry and jars on the roofs.
ROW 3, the solar works quarter (desert technology): a small stepped-pyramid power station with a glowing crystal at its top,
a sand-skiff repair hangar with a wide door, a narrow observatory tower with a brass telescope, a narrow solar relay mast house.
Sandstone and copper with solar panels, teal glass and tech panels.
ROW 4, the water quarter and temples: a small stepped-pyramid shrine with an entrance at its foot, a sun temple with columns,
a narrow obelisk gate house, a narrow oasis garden house with palms on its roof. Blue-glazed tiles, gold sun symbols, plants.

VIEW: seen from above, tilted 30 degrees from straight down, orthographic (no perspective, no vanishing point). You see the
whole roof from above, and below it only the front wall, which faces the viewer and the bottom of the image. No side walls
are visible. Walls and roof edges are straight and crisp. Each building has a 1-pixel dark outline round its whole shape.

THE ROOF: mostly flat roofs with a low parapet, or low domes, or the stepped top of a small pyramid; rooftop details stand on
them (water tanks, wind catchers, solar mirrors, chimneys, awnings, rugs drying, clay jars), all kept inside the roof's edge.

THE FRONT WALL: 1 or 2 floors. Every window is whole: none is cut off at the left or right edge of the wall. The ground floor
faces the street with its doorway, arch or stall opening.

STYLE: detailed 2D game art, crisp clean shapes, a sunny techno-desert city in bright daylight: warm sandstone, adobe and
mud brick, clay and copper, woven canopies, with futuristic touches: solar panels, brass pipes, teal glass, small glowing
crystals and tech panels. Warm sand, ochre, terracotta and copper colours with teal accents.

NOT IN THE PICTURE: no ground, no sand, no street or path under the buildings; no cast shadows; no glow spilling onto the
background; no people or animals; nothing floating between the buildings.
```
