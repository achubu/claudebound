# Crystals, touch controls, and Elaris boss

- Three generated crystal silhouettes: Capacity (teal prisms), Assault (amber point), Aegis (blue shield-cut gem), in `assets/items/upgrade-crystals.png`.
- Elite-only 8% drop chance. Conditional rarity weights: Uncommon 80%, Rare 17%, Epic 3%. Each socket grants +1 of its core stat; crystal damage and defense contributions cap at +3 each. Rare/Epic give 1/2 opening Block respectively, taking only the highest equipped rarity. No rarity multipliers or stacking shields.
- Existing crystals without a rarity count as Uncommon. Import validates explicit rarities. Drop IDs are allocated above existing inventory IDs.
- Tap/click terrain to pathfind through accessible roads, or tap an enemy to approach. Tap exit labels to walk to a door. Keyboard/D-pad input cancels the route; menus, battles, blur and page hiding stop it. Camera coordinate conversion supports joined rooms and mobile zoom.
- Touch battle mode: compact combatants, horizontally swipeable hand, select-then-play, and sticky action controls. Mode is automatic on small/coarse-pointer screens and can be toggled in Main menu. Preferences stay local to the browser.
- Normal enemies alternate strikes, guard turns and heavy attacks. Elemental wildlife alternate strike, charge, charged strike and guard. Charged strikes add burn (fire), stacking poison up to 3 (earth), one lost energy next turn (water), or +2 damage on the next attack (air), only when health damage gets through.
- Prismatic Counter can be reserved without a talent. It blocks charged elemental strikes and their statuses, returning 6 damage. It remains armed during a charging turn, but ordinary attacks/guard turns consume an early counter without triggering it. Other retention still requires Memory Buffer.
- Bloom Tyrant: animated Elaris boss at Elderbloom Sanctuary (3,2). Earth/air attack cycles, guard, charge, and enraged damage below half health. Its first defeat grants the Soulbound Lightning card Stormglass Covenant: 7/9/11/13 damage, halves the next enemy attack, Exhaust. Death cannot remove it.
- Victory opens a two-way portal to Vespera, a playable four-cell continuous Stormglass Reach map with stronger patrols, persistent exploration and expanded deck capacity. Assets: `assets/monsters/elaris/bloom-tyrant.png`, `assets/environment/areas/stormglass.webp`.

## Art generation

Built-in image-generation tool. Crystal prompt: three equally sized square transparent cells in a 3:1 row, teal prism cluster / amber spear-point gem / sapphire shield-cut gem, titanium sockets, restrained glow, hand-painted pixel-art-inspired RPG inventory icons, no text or scenery.

Boss prompt: four evenly spaced transparent animation frames, colossal corrupted stag with obsidian bark armor, emerald crystal antlers, violet orchids, turquoise eyes, roots, four slow breathing/stomping poses, left-facing three-quarter view, wide 3:1 sheet, no labels or borders.

Map prompt: one continuous 8:5 top-down alien coastal region with violet crystals, turquoise pools, basalt cliffs, silver grasses and futuristic pylons; wide crossing paths at one-quarter and three-quarter dimensions, scenery outside roads, no panels, text or characters. WebP is a delivery encoding of the generated PNG; road calibration uses the existing continuous-map renderer.

## Validation

`node tests/crystals-touch-boss.test.cjs`
`node tests/combat-balance.test.cjs`
`node tests/combined-rooms.test.cjs`
`node tests/area-art.test.cjs`
`node tests/elaris-wildlife.test.cjs`
`node tests/save-roundtrip.test.cjs`
