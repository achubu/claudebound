# Elaris wildlife and gateway

Generated with the built-in image-generation tool. Transparent source PNGs are used directly; no artificial walking frames were made by moving a static sprite. Each animal has four distinct poses, shown with stepped CSS animation in exploration and battles. Reduced-motion settings use the first frame.

| Species | Element | Sheet | Cycle |
|---|---|---|---|
| Cinder Fox | Fire | `assets/monsters/elaris/cinder-fox.png` | 0.95 s |
| Drowned Heron | Water | `assets/monsters/elaris/drowned-heron.png` | 1.4 s |
| Blight Antler | Earth | `assets/monsters/elaris/blight-antler.png` | 1.2 s |
| Storm Moth | Air | `assets/monsters/elaris/storm-moth.png` | 0.7 s |

Each sheet is 2172×724, containing four 543×724 cells. World sprites use the same 3:4 cell aspect ratio. The gateway is `assets/environment/elaris-portal.png` (1024×1536), with a separate label below the art and a gentle cyan glow. Rendering and species definitions live in `assets/elaris-wildlife.js`.

## Generation prompts

Shared wildlife prompt (substitute the subject and motion below):

> Use case: stylized-concept. Production pixel-art game animation sprite sheet for Cardbound, matching detailed 16-bit RPG character sprites. ONE horizontal row of EXACTLY FOUR equal square frames in a wide 4:1 sheet. Each frame contains the SAME [subject]. [motion]. Three-quarter side view facing RIGHT, entire animal visible in every frame. Identical scale, body center and baseline in every frame; generous transparent padding so antlers/wings never cross cell boundaries. Crisp intentional pixel clusters, detailed shaded pixels, readable silhouette at 96px game size, no photorealism or smooth painting. Transparent background with actual alpha, no floor, no backdrop, no borders, no grid lines, no text. These are real successive animation frames, not four different creatures.

The generator returned 3:1 sheets rather than the requested 4:1; the game uses their actual cell aspect ratio without stretching.

- Fox subject: a corrupted fox, charcoal fur, ember-orange crystalline growths on shoulders and tail, glowing amber eyes. Motion: four distinct walking gait poses with alternating legs and swishing tail.
- Heron subject: a corrupted long-legged heron, teal feathers, luminous blue water crystals, hanging aquatic tendrils, pale cyan eyes. Motion: four distinct slow stepping poses with lifting legs and subtle wing motion.
- Stag subject: a corrupted forest stag, mossy brown hide, twisted branching antlers with violet corruption and green crystal growths. Motion: four distinct walking gait poses with alternating hooves and subtly moving head.
- Moth subject: a corrupted giant moth, indigo body, broad violet and pale turquoise patterned wings, luminous eyes and trailing antennae. Motion: four distinct flying wingbeat poses, wings high, halfway down, down, halfway up.

Portal prompt:

> Use case: stylized-concept. A single game-world portal sprite for a detailed pixel-art science fantasy RPG. Upright oval ancient futuristic ring of weathered dark metal and luminous cyan circuitry, intertwined with delicate alien vines. Through the oval opening we clearly SEE the destination: a beautiful lush alien planet, emerald rainforest, distant turquoise waterfall, violet flowers, a huge pale moon and sunlight. Portal interior fully filled with landscape, outside ring genuinely transparent alpha. Three-quarter front perspective, entire ring and small grounded pedestal visible, generous padding. Crisp detailed pixel clusters consistent with 16-bit RPG sprites, no smooth vector illustration, no lettering, no labels, no UI, no characters. Strong readable silhouette when displayed 130px high. The portal is a window onto the planet rather than a blank swirl.

## Verification

`node tests/elaris-wildlife.test.cjs` checks species coverage, elemental identity, animated markup, preserved city artwork and sheet dimensions. The combined-area integration suite also passes. The generated art was visually inspected and alpha checked. Hosted browser playback still needs verification; the cloud browser cannot open local files.
