# Neon Aftermath: top-down city art (Round 402)

The city is drawn at a 30-degree three-quarter view (roofs from above, south walls showing). Every piece below fills an
art slot in `CITY_TD_ART` (`assets/chrono-gen.js`). Until a slot has art, the game draws a placeholder.

Add each image with:

    python3 tools/prepare_city_art.py <image> <slot> <name>

then bump the `chrono-gen.js?v=` tag in `index.html`. Several images per slot are welcome (the game picks among them).

Shared style line (end of every prompt): *dark ruined cyberpunk city at night, painterly game art, muted blue-grey with
warm window light and neon accents, no text, no letters*.

## Textures (fill the whole image, seamless)

1. **roof** (`roof-tar`, `roof-metal`, `roof-concrete`): Seamless tileable texture seen straight from above, 1024x1024, a
   flat city rooftop of [cracked tar paper with patches / rusted corrugated metal sheets / stained concrete slabs with
   drains], puddles, grime, no objects, flat even lighting, edges tile seamlessly.
2. **wall** (`wall-concrete`, `wall-brick`, `wall-panel`): One storey of a building's front wall seen straight on, a wide
   strip 2048x512, [stained concrete / dark brick / metal cladding panels] with a regular row of windows, some lit warm
   yellow and some dark, air-conditioning units and cables, flat front view with no perspective, the left and right edges
   tile seamlessly.
3. **shop** (`shop-food`, `shop-tech`, `shop-shutter`): One storey of a street-level shopfront seen straight on, a wide
   strip 2048x512, [a noodle bar with lanterns and steamy windows / a repair shop with glowing screens / roll-down shutters
   with graffiti and one lit doorway], an awning along the top, flat front view with no perspective, the left and right
   edges tile seamlessly.

## Things on a flat solid green background (one per image, centred, whole thing visible)

4. **prop-ac**: a rooftop air-conditioning unit seen from directly above, square metal box with a round fan grille.
5. **prop-vent**: a round rooftop exhaust vent seen from directly above.
6. **prop-tank**: a round rooftop water tank on a small platform, seen from directly above.
7. **prop-stairs**: a small rooftop stairwell hut with a door, seen from above at a slight angle.
8. **prop-solar**: a rectangular rooftop solar panel array seen from directly above, dark blue cells in a metal frame.
9. **prop-skylight**: a rooftop skylight seen from directly above, glowing warm light from inside.
10. **sign-h**: a long horizontal neon sign board seen straight on, glowing [pink / cyan / orange] tubes forming abstract
    glyph shapes (no readable letters), dark backing box.
11. **sign-v**: a tall vertical blade neon sign seen straight on, glowing glyph shapes stacked top to bottom (no readable
    letters), dark backing box.
12. **car**: a parked compact car seen from directly above, facing right (east), [yellow taxi / dark sedan / small van],
    slightly battered.

## Things on a flat solid magenta background (green things)

13. **tree**: a single tree crown seen from directly above, round and leafy, dark green with a few glowing teal leaves.

## Round 424: parks, street furniture and ruins

Four sheets. Every one ends with the shared style line. Send each as a zip and say which sheet it is. Until art arrives,
none of these is drawn and none of them blocks the way.

**A. Park grounds (8 textures, slot `park`)**
> A game texture sheet, 2048x1024, a perfect grid of 4 columns and 2 rows of square tiles, each 512x512, separated by
> thin lines of flat solid green. Each tile is a seamless ground texture seen straight down from above, flat even
> lighting, no shadows, no perspective, no objects, every edge repeating seamlessly. Top row: 1. wild overgrown grass
> with clover and weeds; 2. dry patchy yellow-brown grass with bare earth; 3. grass with small broken concrete chunks
> and brick bits sunk into it; 4. cracked dark earth with weeds in the cracks. Bottom row: 5. moss and grass growing
> over old broken paving slabs; 6. gravel with tufts of grass; 7. grass strewn with dead leaves and a little litter;
> 8. muddy trampled grass with small puddles. Dark ruined cyberpunk city at night, painterly game art, muted blue-grey
> with warm window light and neon accents, no text, no letters.

**B. Rubble (8 objects, slot `rubble`; parks and ruined floors)**
> A game sprite sheet, exactly 8 frames in a perfect grid of 4 columns and 2 rows, every frame square and the same
> size, the whole image 2000x1000. Each frame holds one pile of debris seen from directly above, centred, filling about
> 70% of the frame, with clear empty space on all four sides. 1. a heap of broken concrete slabs; 2. a pile of red
> bricks; 3. a slab of fallen concrete with rusty rebar sticking out; 4. scattered broken masonry with weeds growing
> through; 5. a burnt-out shopping trolley with junk; 6. a tipped-over rusty barrel and scrap metal; 7. a heap of
> broken tiles and glass; 8. a fallen chunk of building cornice. All at one scale and one angle. One flat solid magenta
> background over the whole sheet, no frame borders, no grid lines, no shadows, no ground, no labels. Dark ruined
> cyberpunk city at night, painterly game art, muted blue-grey with warm window light and neon accents, no text, no letters.

**C. Street furniture (8 objects, slots `lamp`, `traffic-light`, `sign-traffic`)**
> A game sprite sheet, exactly 8 frames in a perfect grid of 4 columns and 2 rows, every frame the same size, each
> frame twice as tall as it is wide, the whole image 1600x1600. Each frame holds one tall thin piece of street
> furniture standing upright, seen from the front and a little above (about 30 degrees down), the whole thing visible
> from its foot at the bottom of the frame to its top, centred, with clear empty space on all sides. Top row: 1. a
> tall street lamp with a curved arm and a glowing warm lamp head; 2. a tall twin-headed street lamp, one head broken;
> 3. a modern street light with a cold blue-white glow; 4. a traffic light on a pole with red, amber and green lamps,
> red lit. Bottom row: 5. a traffic light on a pole with a horizontal arm, amber lit; 6. an octagonal red stop sign on
> a bent pole, blank face; 7. a triangular warning sign on a pole, a simple pictogram, no letters; 8. a round no-entry
> sign on a pole, plastered with torn stickers. All at one scale. One flat solid magenta background over the whole sheet,
> no frame borders, no grid lines, no shadows, no ground, no labels. Dark ruined cyberpunk city at night, painterly
> game art, muted blue-grey with warm window light and neon accents, no text, no letters.

**D. Destroyed buildings (4 wall strips, slot `ruin-wall`; 4 floor textures, slot `ruin`)**
> A game art sheet on one flat solid bright green background, 2048x2048, split into two halves.
> Top half: 4 separate horizontal strips stacked one above the other, each running the full width of the image, each
> one storey tall, with a clear band of green between strips. Each strip is the front wall of a burnt-out ruined
> building seen straight on with no perspective, a regular row of empty broken window holes, scorch marks and cracks,
> its left and right edges continuing seamlessly so it can repeat sideways. Strip 1: blackened brick with soot above
> every window. Strip 2: cracked grey concrete with exposed rebar. Strip 3: shattered metal cladding with panels
> missing. Strip 4: plastered wall with collapsed patches showing the bricks.
> Bottom half: 4 square tiles side by side with green gaps between them, each a seamless texture seen straight down
> from above of the inside of a gutted building with its roof gone: collapsed floor slabs, broken beams, rubble and
> ash, a few holes into darkness. 1. burnt timber and ash; 2. broken concrete floor with rebar; 3. fallen bricks and
> tiles; 4. twisted steel girders over rubble. Flat even lighting, no perspective, each tile repeating seamlessly.
> No shadows, no borders, no grid lines, no labels. Dark ruined cyberpunk city at night, painterly game art, muted
> blue-grey with warm window light and neon accents, no text, no letters.

How each is laid (the rules live in `assets/chrono-gen.js`, `CITY_SURFACES` and `cityStreetFurniture`):
- **Park grass:** each park lays one texture over the whole park and a second in soft patches, tiled 140px.
- **Rubble:** 2 to 4 pieces per park, clear of the trees and of each other. Rubble in parks blocks the way. 1 to 3 pieces
  also lie on each ruined floor.
- **Street lights:** stand on the kerb of both sides of every main road, about every 150px, the two sides staggered.
- **Traffic lights:** stand on two opposite corners of a crossing where three or more main roads meet.
- **Traffic signs:** stand on one side of the mouth of an alley that leaves a main road.
- **Posts:** each stands upright on its foot, drawn at its own proportions (street light 54px tall, traffic light 48,
  sign 32), and blocks the way. Every post stays clear of cars, crossing centres, doors, object squares, buildings and
  the sea, and keeps 60px from every other post.
- **Ruins:** about 1 building in 8, chosen by a fixed hash of the lot. A ruin has the gutted floor for a roof, burnt-out
  walls (at least 4 floors, ending between window holes), no parapet, no rooftop props, no shopfront and no signs. It is
  drawn only once both ruin slots have art.
