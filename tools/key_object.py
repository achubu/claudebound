# Key a painted map object off a bright green background (Rounds 307-317).
# Usage: python3 tools/key_object.py source.jpg out.webp [lo hi]   (greenness fades from opaque at lo to clear at hi; default 90 170)
# Green is capped at max(red, blue) everywhere (despill), green patches the background does not reach stay opaque
# when their colour differs from the background (Round 317: holes in the art, same colour as the background, still clear),
# the result is trimmed and scaled to 256px, and a preview over four grounds is written beside it.
import sys
from PIL import Image
import numpy as np
from scipy import ndimage
src, out_path = sys.argv[1], sys.argv[2]; lo = float(sys.argv[3]) if len(sys.argv) > 3 else 90; hi = float(sys.argv[4]) if len(sys.argv) > 4 else 170
a = np.asarray(Image.open(src).convert('RGB')).astype(np.float32); r, g, b = a[..., 0], a[..., 1], a[..., 2]
gx = g - np.maximum(r, b)
alpha = np.clip((hi - gx) / (hi - lo), 0, 1)
g2 = np.minimum(g, np.maximum(r, b))
lab, n = ndimage.label(alpha < 0.5)
edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
# Round 317: only patches whose colour differs from the background (a green light, not a hole in a rotor ring).
bg = np.median(a[np.isin(lab, list(edge))], axis=0)
keep = [i for i in range(1, n + 1) if i not in edge and np.linalg.norm(a[lab == i].mean(0) - bg) > 40]
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
