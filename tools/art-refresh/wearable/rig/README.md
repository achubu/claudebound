# Locked actor, directional equipment fitting

fit_atlas.py accepts one transparent 2x2 equipment atlas: down/front, left, right, up/back. It trims each independently drawn view, uniformly scales and centers it over each frame's calibrated mask, and emits a 2304x1024 overlay, manifest, source/base/mask hashes, placements, full preview, 256/84px strips and looping walk previews. Pillow, NumPy and SciPy are required.

The original actor is immutable and hash-checked. Source cells must have clear gutters; opaque backgrounds and missing coverage fail rather than silently passing. No faces or body frames are regenerated. Only helmet and belt are supported here. Shirts, pants, boots and gloves require articulated part masks/tracks; this script does not solve them and must not be advertised as a universal garment importer.

Use the example's two commands, then inspect every direction at 256 and 84px. wearable_add.py --dry-run verifies repository constraints without writing runtime assets. A passing check is necessary but not sufficient: original slot masks may clip new silhouettes or leave fringes. A closed helm can conceal hair; a true bald/open-face base is not supplied. New gauntlet swapping is also not implemented.

Generated helm source is retained so fitting is deterministic without another generation call. The script emits only a handoff folder. Claude reviews and handles runtime integration.
