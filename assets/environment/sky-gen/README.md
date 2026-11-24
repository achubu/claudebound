# Sky Isles generator art (Round 545)

The owner's eight sheets for a generated Sky Isles (`src/`, from the prompts in `tools/art-refresh/sky-gen-prompts.md`), cut
like Solaris's art and sorted by slot. Not used by the game yet: the Sky Isles theme for the generator (`GEN_THEMES`) comes
next.

- `surfaces/`: square ground textures (512px, tiled): `ground/deck` (open deck), `sidewalk/glass-tiles` (walkway edge),
  `road/glass-walk` (walkways), `plaza/mosaic`, `plaza/pavers` and `plaza/glass-panes` (squares, garden paths; glass panes: Round 547, eight panes of the owner's 10 x 10 grid cut between inner frame lines, `src/plaza-sheet.jpeg`), `lot/cargo-plates` (cargo decks),
  `sand/grating` (deck beside open sky), `water/clouds` (open sky, the "water" of this world). Deck, cargo plates and glass
  tiles had their large soft shading evened out so they don't show a grid of blotches; the hexagonal glass plaza was left out
  (its pattern isn't regular, so it can't tile). Edge strips (128px tall, cut on one repeat of their own, the dark background
  keyed out): `curb/glass-kerb`, `yard-edge/glass-rail`, `park-edge/planter-rim`, `bridge-edge/glass-parapet`,
  `waterfront-edge/deck-rim`.
- `props/building-<quarter>/`: 32 buildings (market: the skyport bazaar; homes; tech: the aether works; garden: the sky
  gardens), `props/ruinpic-<quarter>/` 8 wrecks, `props/parkpic-<quarter>/` 8 walkable roof gardens, cut with
  `tools/cut_building_sheet.py` (sheet 1's dark cell frames were painted green first). `building-px.json` gives each one's
  size in the game: each sheet scaled so its middle building is 200px tall (as Round 496).
- `props/cargo`, `clutter`, `landmark`, `car`, `tree`, `prop-*`, `lamp`, `sign-traffic`, `traffic-light`: yard pieces,
  clutter, four landmarks, two vehicles, two trees, rooftop kit and posts.
- `props/bridge/`: the north-south bridge's `north` end, `vmid` section (repeats) and `south` end; the east-west bridge's
  `west` end, `mid` section (repeats) and `east` end (Round 546, cut from the whole bridge in `src/bridge-sheet.jpg`).
