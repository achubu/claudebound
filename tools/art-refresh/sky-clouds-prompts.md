# Sky Isles: cloud variety (Round 553)

The open sky under the Sky Isles' islands is one 512px cloud texture (`assets/environment/sky-gen/surfaces/water/clouds.webp`)
repeated everywhere, so its pattern shows. Two pictures fix that:

1. a much larger seamless cloud texture with more going on in it, so the repeat is hard to see;
2. a sheet of separate clouds (puffs, banks, wisps) that Claude scatters over the sky from the seed, drifting under the
   islands and bridges, so no two stretches of sky look the same. They are objects, not ground, so they need no border
   (never two textures side by side without one: owner rule).

Each prompt is complete on its own (owner rule, Round 494).

## Prompt 1: the cloud sea texture

```
A single seamless tileable texture for a top-down 2D game: a sea of clouds seen from straight above, filling the whole image
edge to edge, for a pastel cyberpunk city floating above the clouds in soft daylight.

SEAMLESS: the texture must tile perfectly in both directions: whatever leaves the right edge comes back on the left edge, and
whatever leaves the bottom edge comes back on the top edge, with no visible seam, no border, no frame and no vignette (the
corners as bright as the middle).

SIZE AND DETAIL: a square image, as large as possible (2048 x 2048 if you can). It must not look like a small pattern repeated:
the clouds vary across the whole image: a few large thick billowing cloud banks, many medium puffs, thin wispy streaks
between them, and two or three gaps where the deep sky shows through between the clouds. No two clouds the same shape or size.

COLOURS: soft pastel daylight: cloud tops pale pink, lavender and white with soft cream highlights; their shaded sides dusty
violet and periwinkle; the deep sky showing through the gaps a deep blue-violet. Even lighting from straight above, so the
light is the same everywhere in the image (no sun, no light source, no brighter side).

VIEW: straight down from high above (orthographic top-down), no horizon, no perspective, no sky dome.

STYLE: detailed 2D game art, painterly but clean, soft rounded cloud shapes with gentle shading, matching a pastel cyberpunk
fantasy sky city (pink, violet and cyan tones).

NOT IN THE PICTURE: no islands, no buildings, no birds, no airships, no people, no text, no logos, no sun, no stars, no lens
flare, no frame or border, no dark vignette at the corners.
```

## Prompt 2: separate clouds to scatter over the sky

```
A sprite sheet of 12 separate clouds for a top-down 2D game set in a pastel cyberpunk city floating above the clouds in soft
daylight, on a flat solid pure green background (#00FF00), with no gradient, pattern, texture or shadow in the background.

LAYOUT: the sheet is a wide landscape image. An invisible grid of 4 columns by 3 rows of equal cells; exactly one cloud in each
cell, centred, as large as possible while keeping clear green space between every cloud and on every side. Nothing crosses
from one cell into another; no cloud touches the edge of its cell. No labels, numbers, letters or text anywhere.

THE 12 CLOUDS, all different shapes and sizes, seen from straight above:
1. a large round billowing cumulus puff;
2. a long low cloud bank, about three times as wide as it is tall;
3. a cluster of three small round puffs close together;
4. a thin wispy streak of cloud, long and narrow, with feathered ends;
5. a heart-shaped soft cloud;
6. a ragged torn cloud with holes through it;
7. a tall stacked cloud with layered rounded tops;
8. two thin parallel wisps;
9. a small single round puff;
10. a wide flat cloud with a scalloped edge;
11. a curling cloud shaped like a soft wave;
12. a big irregular cloud with several lobes.

COLOURS: soft pastel daylight: cloud tops pale pink, lavender and white with soft cream highlights; their shaded undersides
dusty violet and periwinkle. Even lighting from straight above, the same on every cloud. The edges of each cloud are soft but
solid enough to cut out cleanly: no glow, haze or mist spreading into the green, and no green showing through the clouds.

VIEW: straight down from high above (orthographic top-down), no perspective.

STYLE: detailed 2D game art, painterly but clean, soft rounded shapes with gentle shading, matching a pastel cyberpunk fantasy
sky city (pink, violet and cyan tones).

NOT IN THE PICTURE: no sky behind the clouds, no islands, no buildings, no birds, no people, no shadows on the background, no
text.
```
