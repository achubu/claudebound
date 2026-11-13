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
