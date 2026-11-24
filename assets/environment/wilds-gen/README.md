# Elaris (the forest) generator art (Round 549)

The owner's nine Elaris sheets (`src/`, from `tools/art-refresh/elaris-gen-prompts.md`, on magenta: `tools/cut_building_sheet.py`
takes `KEY=magenta` since Round 549), cut like the Sky Isles' art. Not used by the game yet (the Elaris theme is next).

- Edges (Round 550, `src/edge-sheet-2.jpg`, the redrawn sheet on magenta): `surfaces/curb/stone-kerb`, `yard-edge/willow-fence`,
  `park-edge/flower-hedge`, `bridge-edge/rope-rail`, `waterfront-edge/reed-bank`; each cut on its own repeat (two or three
  periods, found by autocorrelation, starting where the ends match best), magenta held back, 128px tall. They tile seamlessly.

- `surfaces/`: `ground/forest-floor`, `road/dirt` (from the middle of the crossroads tile), `plaza/flagstones`, `plaza/gravel`
  (from the middle of the gravel path), `lot/woodchips`, `market-floor/market-green`, `sand/shore-mud`, `water/lake`. The path
  verge tile had stripes running one way and is left out.
- `props/building-<quarter>/`: 31 buildings (the woodcarver came out the same as the timber market hall and is left out),
  `ruinpic-*` 8, `parkpic-*` 8 (their captions were painted out before cutting); `building-px.json` gives their sizes (each
  sheet scaled so its middle building is 200px tall). The sheets' black cell frames were painted out first, and magenta shut
  inside a picture is see-through.
- `props/cargo`, `clutter`, `landmark`, `car`, `tree`, `prop-*`, `lamp`, `sign-traffic`, `traffic-light`: yard pieces, clutter,
  four landmarks, a handcart and a rowing boat, two trees, rooftop kit and posts.
- `props/bridge/`: the boardwalk bridge, `west`/`mid`/`east` (row 2's pieces, the same depth this time) and
  `north`/`vmid`/`south`.
