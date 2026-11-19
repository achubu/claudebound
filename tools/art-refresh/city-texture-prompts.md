# City ground textures and edges to match the owner's buildings (Round 503)

Owner: "can we get matching texture tiles that fit in better with the aesthetic of the buildings?". Two complete prompts. The
ground sheet's tiles are prepared with `tools/prepare_city_art.py` (`texture()`) and checked with `python3 tools/tile_check.py`
(seams and repeats); the edges replace the kerb, yard rim, park rim and beach lip, which are shown to the owner before they go
in (Round 460 rule: don't change edges without showing the owner first).

## Ground textures (9 seamless tiles)

```
A sprite sheet of 9 seamless ground textures for a top-down 2D game, matching a set of cartoon cyberpunk city buildings drawn
in clean, crisp game art with dark outlines.

LAYOUT: a grid of 3 columns by 3 rows of equal SQUARE tiles, each tile filling its whole square, with a thin flat pure green
(#00FF00) gap between tiles and round the edge of the sheet. No labels, numbers, letters or text anywhere.

EVERY TILE IS SEAMLESS: the pattern runs off all four edges and continues exactly on the opposite edge, so the tile repeats
without any visible seam or border. No frame, vignette, edge shading or darker rim on any tile; no single big feature in the
middle; even detail spread across the whole square.

VIEW: straight down from above (flat ground, no perspective, no horizon).

ROW 1: (1) city sidewalk paving of large square concrete slabs with thin dark joints; (2) a plaza paving of smaller hexagonal
tiles; (3) road asphalt, dark, with fine cracks and a few small patches, no lane markings.
ROW 2: (4) a parking yard of worn concrete with faint oil stains and a few cracks, no markings; (5) a cargo yard of steel
deck plates with rivets; (6) cracked rubble ground: broken concrete, grit and small debris, flat.
ROW 3: (7) pale grey beach sand with small ripples and a few pebbles; (8) dark night sea water with soft ripples; (9) a
dark paved alley of narrow stone setts in a running pattern, worn smooth.

STYLE: the same style as the buildings: crisp clean shapes and thin dark line work, flat colours with light, simple shading,
no photo texture, no blur, no noise. A gritty futuristic cyberpunk city at night: muted dark blue-greys and slate, low
contrast so buildings stand out on top, a few tiny teal or amber specks of reflected neon at most. No old-world materials:
no brick, cobblestones, terracotta or wooden boards.

NOT IN THE PICTURE: no objects standing on the ground, no buildings, no cars, no people, no shadows, no glow, no lines or
markings painted on the road.
```

## Edges (4 seamless strips)

```
A sprite sheet of 4 seamless horizontal edge strips for a top-down 2D game, matching a set of cartoon cyberpunk city buildings
drawn in clean, crisp game art with dark outlines.

LAYOUT: 4 long horizontal strips stacked one above the other, each strip 8 times as long as it is tall, filling the width of
the sheet, with a thin flat pure green (#00FF00) gap between strips and round the edge of the sheet. No labels, numbers,
letters or text anywhere.

EVERY STRIP IS SEAMLESS ALONG ITS LENGTH: its left end continues exactly into its right end, so it repeats sideways with no
visible seam, and it has the same height and look along its whole length. No end caps, no corners, no frame.

VIEW: straight down from above, with the strip's top edge facing the ground on one side and its bottom edge the other.

STRIP 1: a road kerb: a band of pale grey concrete kerb stones with thin dark joints, a darker gutter line along its bottom edge.
STRIP 2: a yard rim: a low steel rail fence on a concrete base, seen from above, posts at even spacing.
STRIP 3: a park kerb: a low dark stone border with a thin teal light strip running along it.
STRIP 4: a beach lip: a worn concrete sea wall edge, pale on top, with a darker face along its bottom edge.

STYLE: the same style as the buildings: crisp clean shapes and thin dark line work, flat colours with light, simple shading,
no photo texture, no blur, no noise. A gritty futuristic cyberpunk city at night: muted dark blue-greys and slate, small teal
or amber neon accents. No old-world materials: no brick, cobblestones, terracotta or wooden boards.

NOT IN THE PICTURE: no objects, no buildings, no cars, no people, no shadows, no glow spilling onto the background.
```
