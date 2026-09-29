# Continuous area paintings

Six dedicated full-area paintings replace repeated 800 × 500 background panels in joined areas. Generated with the built-in image-generation tool, using the same detailed, pixel-painting-inspired process as the Elaris wildlife. The production assets are WebP copies of the original paintings for faster loading.

| Area | Asset under `assets/environment/areas/` |
|---|---|
| Burnout Avenue / West Service Road | `burnout.webp` |
| Promenade Market | `promenade.webp` |
| Foundry Quarter | `foundry.webp` |
| Crown Mainframe District | `mainframe.webp` |
| Sunpetal Wilds | `sunpetal.webp` |
| Emerald Expanse | `emerald.webp` |

Each asset represents the entire connected area. `assets/combined-rooms.js` renders one world-sized canvas below interaction overlays. Continuous adjacent image bands calibrate the painted road edges to the existing street collision footprints. Every source pixel is used once in order; no repeated atlas quadrants, missing strips or room-sized image boundaries. Local save coordinates, gates, patrol counts and encounters remain stable. Old procedural street props are removed from collision in these painted areas because those props are absent from the paintings. Small rooms retain their original renderer.

## Prompt set

Initial shared prompt: “Use case: stylized-concept. Asset: production top-down 2D RPG scrolling map background. Render ONE cohesive continuous environment, NOT an atlas, NOT separate panels, NO seams, NO repeated quadrants, NO borders. Orthographic overhead with slight front-facing object depth, intricate hand-painted pixel-art-inspired textures, crisp readable shapes, matching detailed illustrated futuristic fantasy creature sprites. Paths flat and unobstructed; buildings, trees, rocks and water strictly outside road corridors. Consistent scale and lighting across entire image. Outer paths reach image edges. No sky, horizon, perspective vanishing point, characters, enemies, UI, lettering, text, gridlines or labels.”

Subjects:
- Burnout: rain-wet ruined futuristic avenue from utility workshops into magenta neon arcade buildings, cyan cables and puddles.
- Promenade: abandoned futuristic market reclaimed by botanical gardens, mossy storefronts, cyan lights and flowering vines.
- Foundry: ruined industrial campus, amber furnaces, steel halls, cooling pipes and machinery around a central factory island.
- Mainframe: futuristic citadel with violet server buildings, dark metal architecture, cyan conduits and central data vault.
- Sunpetal: golden alien meadow transitioning naturally into orchid rainforest, turquoise pools, emerald trees and violet flowers.
- Emerald: continuous alien rainforest basin with canopy, ferns, orchids, pools, waterfalls and mossy stones.

Two-cell layout: 3:1 panorama with one horizontal road at half height and vertical roads at one-quarter and three-quarter width. Four-cell layout: 8:5 panorama with horizontal and vertical roads at one-quarter and three-quarter dimensions.

Final edit prompt (reference: the matching initial painting): “Edit this top-down RPG map for gameplay. Preserve this exact environment theme, palette, detailed pixel-painted visual style, and cohesive continuous scene. WIDEN and ALIGN the avenues so several characters can walk side by side. Two broad vertical avenues must occupy strips x=18% through32% and x=68% through82%, top edge to bottom edge. ALL ground in these crossing strips must be flat unobstructed walking surface (road or dirt trail matching the reference). Put buildings, pools, trees, machinery and rocks strictly in the remaining terrain islands. Broad avenues and generous open intersections are critical. Maintain natural textures and attractive small details, no objects obstructing any avenue. ONE continuous area, no panels, divisions, borders, text, UI, characters or gridlines.”

Horizontal-road supplement: y=32%–64% for wide maps; y=16%–32% and 66%–82% for four-cell maps. Emerald's edit requested dirt/short grass trails, 18% path height, orchids and pools outside the paths, and preserved its rainforest reference.

## Checks

Run `node tests/area-art.test.cjs`, `node tests/combined-rooms.test.cjs`, and `node tests/save-roundtrip.test.cjs`.

These verify asset signatures, complete source/destination coverage, continuous calibration boundaries, collision islands, internal route traversal, external gate requirements, camera bounds, and save/export/import round trips in both regions.
