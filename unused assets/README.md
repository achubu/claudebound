# Unused assets

Graphics the game no longer loads, kept here instead of deleted. Nothing in
`index.html`, `compendium.html`, `arena.html` or `assets/` points at this
folder, so files here can be reused, reworked or removed freely.

Each file keeps its old path under this folder (for example
`assets/cards/level0/arcJab.png` is now
`unused assets/assets/cards/level0/arcJab.png`), so moving one back is a
single `git mv`.

What's here (Round 96):

- `assets/cards/level0-3/*.png`: the original art for the 8 cards that now use
  refreshed `.webp` paintings (arcJab, breachSpike, bulwarkBash,
  chainLightning, overclock, staticShield, thornlash, wildfire), plus the
  500px `level2/stormglass.png` (the game uses the `.jpeg`).
- `assets/cards/` (Round 180): the PNG emblems replaced by the refreshed paintings from
  `achubu/Cardbound` (52 card stages across 13 cards, and all 10 side cards in `side/`).
- `assets/environment/areas/`: `burnout`, `mainframe`, `mainframe-8way` and
  `promenade-8way`. Round 179 added `emerald` and `sunpetal` (old Elaris, unused
  since Solaris in Round 149) and `foundry`, `promenade` and `stormglass` (old
  Vespera, retired when Vespera became a tile world). Neon Aftermath became one painted world map in Round 91,
  so the city-only district paintings are no longer drawn.
- `assets/environment/diagonal/city/`: the per-corner Neon Aftermath diagonal
  variants. The city no longer has diagonal rooms. `ne-nw-se-sw.webp` stays in
  `assets/` because `diagonals.js` still names it.
- `assets/environment/industrial/`, `assets/environment/later/`: drafts that
  were never wired in.
- `assets/environment/{cottage,roof,terrain,trees}.png`: used only by the old
  Meadowrest scene (`meadowrest.js`), which the game stopped loading and which
  was removed in Round 96.
- `assets/characters/story-character.jpeg`: reserved for a future story
  character and not used yet.
- `assets/talents/talent5.jpeg`: the one uploaded talent graphic with no talent
  mapped to it.
- `c-*.png`: 800x500 district renders that sat in the repo root.
- `old-copies/environment/areas/*.webp`: older versions of the district
  paintings that sat in a duplicate root `environment/` folder. The current
  versions live in `assets/environment/areas/`.
- `assets/environment/sky/` (Round 204): the first Sky Isles set (marble walkways between
  floating islands, Round 197), with its sources, derived tiles and walk masks. The Sky Isles
  are now the owner's dense floating city.
