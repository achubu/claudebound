# Solaris generator art (Round 481)

The owner's four sheets for a generated Solaris (`src/`), cut and prepared like the city's art, sorted by slot:
`surfaces/<slot>/` (square textures 512px, tiled; strips 128px tall: walls one storey, shop fronts one storey, kerbs and
edges) and `props/<slot>/` (keyed objects, 256px on the long side). Not yet used by the game: the Solaris theme for the
generator (`GEN_THEMES`) comes next.

Not used from the sheets: the thatched and canvas roofs (each drawn as one hut roof or one sheet, not a repeating
surface). The oasis rim was redrawn as a straight strip (Round 482, `src/oasis-rim.jpeg`) and cut on one whole repeat
into `surfaces/park-edge/oasis-rim.webp`, so it tiles without a seam. The clay, sandstone and
gravel roofs were drawn inside a raised frame; they are cut inside it.
