# City landmarks at a higher resolution (Round 542)

Five of Neon Aftermath's landmarks are drawn larger than their pictures (up to 2.1x), so they look blurry. Their source
(Archive_5) isn't in the repo, so they can't be re-cut. This prompt asks for the same five at a size where each one fills a
cell of roughly 700-900px; Claude keys them with `tools/key_object.py --max=512` (they need at least 512px on the longest
side) and replaces `assets/environment/city-gen/props/landmark/{pylon,sculpture,holo-beam,mech,holo-stage}.webp`, keeping
each one's proportions as listed.

```
A sprite sheet of 5 separate landmark objects for a top-down 2D game set in a ruined futuristic neon city at night, on a
flat solid pure green background (#00FF00), with no gradient, pattern, texture or shadow in the background.

LAYOUT: the sheet is a wide landscape image. An invisible grid of 3 columns by 2 rows of equal cells; the five objects fill
the first five cells, left to right, top row first, and the last cell (bottom right) is empty green. Exactly one object in
each cell, centred, as large as possible while keeping clear green space between every object and on every side. Nothing
crosses from one cell into another. No labels, numbers, letters or text anywhere.

HIGH DETAIL: each object should fill most of its cell, drawn at high resolution with crisp, clean line work, so it stays
sharp when shown large.

THE FIVE OBJECTS, in order:
1. A tall, thin square neon pylon: a dark steel post standing upright, about three times as tall as it is wide, with four
   stacked glowing glass panels on its front, from top to bottom cyan, magenta, dark (unlit) and amber, and a grey metal cap
   and a small square base.
2. A broken star sculpture: a large flat monument of cracked grey concrete shaped like a six-armed star or asterisk lying on
   the ground, its arms broken and jagged, with thin glowing neon tubes in cyan, magenta and amber running along the arms,
   one small orange warning light on one arm. Wider than it is tall.
3. A hologram beam: a round dark metal platform with a glowing cyan ring, eight short lamp posts standing evenly around its
   edge, and a tall column of translucent cyan and magenta light rising from the centre, about as tall as the platform is
   wide.
4. A fallen robot mech: a large grey armoured humanoid robot sitting slumped against a broken square concrete plinth, one
   knee raised, one glowing red eye and a glowing orange core light in its chest, cracked plating. Slightly wider than it
   is tall.
5. A hologram stage: a round dark metal stage with a glowing cyan ring and a cyan circle pattern on its floor, short lamp
   posts with cyan lights round its edge, and a floating cyan wireframe diamond hologram above the middle. Wider than it is
   tall.

VIEW: seen from above, tilted 30 degrees from straight down, orthographic (no perspective, no vanishing point): you see the
top of each object and a little of its front, which faces the viewer and the bottom of the image. Each object has a thin dark
outline round its whole shape.

STYLE: detailed 2D game art, crisp clean shapes and thin dark line work, painterly shading on dark steel and cracked
concrete, bright saturated neon glows in cyan, magenta and amber.

NOT IN THE PICTURE: no ground, no street or floor patch under the objects (except each object's own platform or plinth); no
cast shadows; no glow spilling onto the green background; no people; nothing floating between the objects.
```
