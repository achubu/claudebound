# Key a painted map object off a bright green background (Rounds 307-318).
# Usage: python3 tools/key_object.py source.jpg out.webp [lo hi] [--keep-green]   (greenness fades from opaque at lo to clear at hi; default 90 170)
# Green is capped at max(red, blue) everywhere (despill), green patches the background does not reach stay opaque
# when their colour differs from the background (Round 317: holes in the art, same colour as the background, still clear;
# Round 318: judged by median colour, patches of 200px or more),
# the result is trimmed and scaled to 256px, and a preview over four grounds is written beside it.
import sys
from PIL import Image
import numpy as np
from scipy import ndimage
keep_green = '--keep-green' in sys.argv; args = [x for x in sys.argv[1:] if x != '--keep-green']
src, out_path = args[0], args[1]; lo = float(args[2]) if len(args) > 2 else 90; hi = float(args[3]) if len(args) > 3 else 170
a = np.asarray(Image.open(src).convert('RGB')).astype(np.float32); r, g, b = a[..., 0], a[..., 1], a[..., 2]
gx = g - np.maximum(r, b)
alpha = np.clip((hi - gx) / (hi - lo), 0, 1)
# --keep-green (Round 318, for art with real greens: moss, leaves): despill only the see-through edge, as in Round 311.
g2 = np.where(alpha < 0.98, np.minimum(g, np.maximum(r, b) + 20), g) if keep_green else np.minimum(g, np.maximum(r, b))
lab, n = ndimage.label(alpha < 0.5)
edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
# Round 317: only patches whose colour differs from the background (a green light, not a hole in a rotor ring).
bg = np.median(a[np.isin(lab, list(edge))], axis=0)
# Round 318: median colour, and at least 200px, so thin slivers between leaves or roots (darkened by blended edges) still clear.
keep = [i for i in range(1, n + 1) if i not in edge and (lab == i).sum() >= 200 and np.linalg.norm(np.median(a[lab == i], 0) - bg) > 60]
inner = np.isin(lab, keep)
grown = ndimage.binary_dilation(inner, iterations=3) & (alpha < 1)
print('enclosed green px kept:', int(grown.sum()))
alpha = np.where(grown, 1, alpha); g2 = np.where(grown, g, g2)
o = Image.fromarray(np.dstack([r, g2, b, alpha * 255]).clip(0, 255).astype(np.uint8), 'RGBA')
bb = o.getchannel('A').point(lambda v: 255 if v > 60 else 0).getbbox(); o = o.crop(bb)
w, h = o.size; s = 256 / max(w, h); o = o.resize((round(w * s), round(h * s)), Image.LANCZOS)
o.save(out_path, quality=92, method=6); print('bbox', bb, 'size', o.size)
grounds = [(30, 40, 60), (200, 190, 170), (150, 215, 235), (60, 95, 50)]
prev = Image.new('RGBA', (len(grounds) * (o.width + 10) + 10, o.height + 20), (0, 0, 0, 255))
for i, c in enumerate(grounds):
    t = Image.new('RGBA', o.size, c + (255,)); t.alpha_composite(o); prev.paste(t, (10 + i * (o.width + 10), 10))
prev.resize((prev.width * 2, prev.height * 2), Image.NEAREST).save(out_path.rsplit('.', 1)[0] + '-preview.png')
