#!/usr/bin/env python3
"""Round 193: cut a generated 4-frame creature sheet out of its fake-transparent background.

Gemini sheets come on a pale checkerboard with a soft white glow round the creature, so the
background can't be keyed by colour alone. This keeps the creature (coloured or dark pixels),
drops specks, fills holes (so bright glows like the scarab's sun-ball stay solid), feathers the
edge by about a pixel and saves a 256-colour PNG.

    python3 tools/cut_sprite_sheet.py in.webp assets/monsters/elaris/solar-scarab.png [saturation]

Lower the saturation (default 28) for pale creatures whose body would otherwise be cut away.
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as nd

src, out = sys.argv[1], sys.argv[2]
SAT = int(sys.argv[3]) if len(sys.argv) > 3 else 28
im = np.array(Image.open(src).convert('RGBA')).astype(float)
a = im[..., 3:] / 255
rgb = im[..., :3] * a + 255 * (1 - a)
mn = rgb.min(2); sat = rgb.max(2) - mn
core = nd.binary_opening((sat >= SAT) | (mn < 170), iterations=1)
lab, n = nd.label(core); sizes = nd.sum(core, lab, range(1, n + 1))
keep = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s >= 25])
keep = nd.binary_fill_holes(nd.binary_closing(keep, iterations=2))
soft = nd.gaussian_filter(keep.astype(float), 0.7)
alpha = np.where(keep, 1.0, np.clip(soft * 1.6, 0, 1) * ((sat >= SAT * 0.6) | (mn < 200)))
sheet = Image.fromarray(np.dstack([rgb, alpha * 255]).clip(0, 255).astype(np.uint8))
sheet.quantize(256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(out, optimize=True)
w, h = sheet.size
print(f'{out}: {w}x{h}, frames {w // 4}x{h}, transparent {100 * (alpha == 0).mean():.1f}%')
