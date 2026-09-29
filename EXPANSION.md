# Elaris / Aetherlink expansion

The integrated adventure (`index.html`) now loads `assets/expansion.js` after its original engine. The isolated `arena.html` remains the earlier combat prototype; this expansion is played from the main adventure.

## Exploration

- City rooms use the original fixed street layout, artwork, props, rain and lighting from before the variable-size experiment. Elaris keeps its region artwork with a fixed room footprint. Procedural room sizes and both experimental border treatments have been removed.
- Selected neighboring blocks form seamless 1600×500 streets and 1600×1000 districts. The camera follows the player at the original sprite scale. Burnout/West Service Road and Promenade/Market are two-block streets; the Foundry and Crown/Mainframe districts each join four blocks. Elaris has a two-block Sunpetal area and four-block Emerald area. Internal crossings preserve exact position and do not advance enemy respawn timers; exterior relic gates remain intact.
- The city retains its 24-area connection graph and relic gates. Elaris contains 12 forest, plains, rainforest, and riverland areas.
- Small unsafe rooms contain one patrol. Two-block streets contain three patrols and four-block districts contain four, with separated home sectors and a 55-pixel patrol radius. Each has a unique encounter/cooldown identity. Bosses are permanently defeated; normal patrols return after three exterior room transitions.
- Four city caches and three Elaris caches contain two small potions each, once per run.
- Defeating the Thorn Warden guarantees **Glacial Covenant**, a Soulbound Ice card, and opens a clickable two-way portal at Warden Mainframe.
- Entering Elaris for the first time grants all four counter cards. Elaris attunement adds four deck slots while in that region.

## Combat and progression

- Starter deck: two Ember Blades, two Crystal Wards, Starlit Focus, Bloom of Life.
- Every level restores five HP (capped at max) and grants one maximum HP. Vital Mesh remains additive.
- Surge: Precision Strike adds 3% critical chance per rank (five ranks); critical attacks deal double damage. Overdrive Pulse doubles the next attack once per encounter.
- Resolve: Echo Protocol repeats the next card once per encounter, paying energy and training the physical card only once. The repeated effect does not consume another Boost or Overdrive.
- Every victory automatically awards exactly one random Impermanent card. Boss-specific Soulbound rewards and potion/crystal drops are additional.
- Ice skips one enemy attack. Burn deals two damage for two turns. Poison adds stacking damage each turn. Air's Gale Cut deals damage and draws a card.
- Matching weakness increases elemental card damage by 50%. Counter cards arm against the next enemy attack and negate it while reflecting six damage when matched.

| Enemy | Counter card element |
|---|---|
| Fire | Water |
| Water | Air |
| Earth | Fire |
| Air | Earth |

## Aetherlink Gauntlet

Elite patrols have an 8% chance to drop one device crystal. Ordinary enemies and bosses do not roll device crystals. Capacity adds one deck slot, Assault adds one damage per attack-card effect, and Aegis adds one Block per defense-card effect. Crystals remain separate from physical-card upgrade materials.

Socket counts unlock at levels 1, 6, 12, 20, and 30. Crystals can be moved or removed outside active fights. Removing capacity may require reducing the active deck before the next encounter.

## Saves

This build starts a fresh expansion save (`cardbound-expansion-v3`). Automatic local saves include combat state. Menu → Export/Import transfers JSON between encounters, including map seed, region progress, cards, talents, device, and card-upgrade materials. Imports are checked before replacing the active run. New Journey is available from the menu if card losses end a run.

## Verification

Run `node tests/combined-rooms.test.cjs` for combined-area movement, internal route accessibility, patrol density, camera boundaries, cooldown preservation and locked-exit checks. This also runs the expansion integration suite. The combined build still needs a hosted-browser playtest; the cloud browser disallows local file previews.

Run `node tests/expansion.test.cjs`. It executes the actual browser scripts in a Node VM with a DOM adapter. Tests cover progression, device bonuses, freeze, counters, Echo, Overdrive, poison, rewards, combat save reload, the boss-to-portal route, import rejection, one-time chests, and connected room routes across seeds. These are logic/integration tests, not rendered-browser tests. Chromium installation failed in this workspace; visual/mobile playtesting is still required.

## Generated assets

Built-in image generation created `assets/characters/character-portal.webp` and `assets/environment/elaris-atlas.webp`; originals were retained outside the repository. WebP files are optimized delivery copies.

- Portrait prompt: preserve the exact blond pixel-art protagonist, pose, clothes, face and cyan wrist holograms; replace the checkerboard with a detailed ruined neon city and a cyan portal onto lush alien rainforest, waterfalls, and luminous flowers. No labels.
- Environment prompt: four equal top-down pixel-art panels, sunlit forest, wildflower plains with wildlife, dense emerald rainforest, and turquoise riverbank; rich natural textures and open playable clearings, no UI or labels.
