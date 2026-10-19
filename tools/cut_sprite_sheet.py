#!/usr/bin/env python3
"""Round 193: cut a generated 4-frame creature sheet out of its fake-transparent background.

Gemini sheets come on a pale checkerboard with a soft white glow round the creature, so the
background can't be keyed by colour alone. This keeps the creature (coloured or dark pixels),
drops specks, fills holes (so bright glows like the scarab's sun-ball stay solid), feathers the
edge by about a pixel and saves a 256-colour PNG.

    python3 tools/cut_sprite_sheet.py in.webp assets/monsters/elaris/solar-scarab.png [saturation] [--no-floor]

Lower the saturation (default 28) for pale creatures whose body would otherwise be cut away.

Sheets drawn on a flat magenta background (any shade; the colour is read from the border) are
chroma-keyed instead, and each frame is
padded to the game's 3:4 frame (bottom-aligned) when the sheet is shorter than that.
--no-floor drops a painted stone floor under the creature's feet: in the bottom sixth of the
sheet, cool (blue-grey) pixels go, warm ones (brass, sand, dust) stay.
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as nd

args = [a for a in sys.argv[1:] if not a.startswith('--')]
src, out = args[0], args[1]
SAT = int(args[2]) if len(args) > 2 else 28
NO_FLOOR = '--no-floor' in sys.argv
im = np.array(Image.open(src).convert('RGBA')).astype(float)
a = im[..., 3:] / 255
rgb = im[..., :3] * a + 255 * (1 - a)
mn = rgb.min(2); sat = rgb.max(2) - mn


def save(rgb, alpha):
    rgb = np.where(alpha[..., None] > 0, rgb, 0)  # blank colour under transparent pixels, so the palette is spent on the creature
    sheet = Image.fromarray(np.dstack([rgb, alpha * 255]).clip(0, 255).astype(np.uint8))
    w, h = sheet.size
    if h < round(w / 4 * 4 / 3) - 2:  # Round 193: pad short frames to 3:4, standing near the bottom
        H = round(w / 4 * 4 / 3); rows = np.where((alpha > 0.1).sum(1) > 2)[0]
        top = max(0, min(H - h, round(H * 0.9) - rows.max()))
        tall = Image.new('RGBA', (w, H), (0, 0, 0, 0)); tall.paste(sheet, (0, top)); sheet = tall
    sheet.quantize(256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(out, optimize=True)
    w, h = sheet.size
    print(f'{out}: {w}x{h}, frames {w // 4}x{h}, transparent {100 * (alpha == 0).mean():.1f}%')


key = np.minimum(rgb[..., 0], rgb[..., 2]) - rgb[..., 1]
border = np.concatenate([rgb[:6].reshape(-1, 3), rgb[-6:].reshape(-1, 3), rgb[:, :6].reshape(-1, 3), rgb[:, -6:].reshape(-1, 3)])
bgc = np.median(border, 0); kb = bgc[[0, 2]].min() - bgc[1]
if kb > 100:  # flat magenta (or purple-magenta) background, read from the border
    alpha = np.clip((kb * 0.76 - key) / (kb * 0.6), 0, 1)
    alpha[alpha < 0.12] = 0
    col = (rgb - (1 - alpha[..., None]) * bgc) / np.maximum(alpha, 1e-3)[..., None]
    col[..., 1] = np.maximum(col[..., 1], 0)
    col = col.clip(0, 255)
    if NO_FLOOR:
        h = alpha.shape[0]; zone = np.zeros_like(alpha, bool); zone[int(h * 0.82):] = True
        alpha[zone & ((col[..., 2] >= col[..., 0] - 6) | (key > 40))] = 0
    # Despill: JPEG blur mixes magenta into edges and outlines, which shows as pink. Pull blue
    # down on magenta-ish pixels (red and blue both above green), and red too near the edge, so
    # gold, orange, blue and white are left alone.
    pinkish = (col[..., 0] > col[..., 1] + 10) & (col[..., 2] > col[..., 1] * 0.8)
    edge = nd.binary_dilation(alpha == 0, iterations=3)
    col[..., 2] = np.where(pinkish, np.minimum(col[..., 2], col[..., 1] * 0.85 + 8), col[..., 2])
    col[..., 0] = np.where(pinkish & edge, np.minimum(col[..., 0], col[..., 1] * 1.3 + 12), col[..., 0])
    # Soft pixels (thin dust rings, edges) take the colour of the nearest solid pixel, which
    # removes the pink cast that unmixing leaves on them.
    solid = alpha >= 0.95
    _, (iy, ix) = nd.distance_transform_edt(~solid, return_indices=True)
    soft = (alpha > 0) & ~solid
    col[soft] = col[iy[soft], ix[soft]]
    # Drop specks left behind (by the floor cut, or JPEG noise).
    lab, n = nd.label(alpha > 0); sizes = nd.sum(alpha > 0, lab, range(1, n + 1))
    alpha[np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s < 12])] = 0
    col[alpha == 0] = 0
    save(col, alpha); sys.exit()

core = nd.binary_opening((sat >= SAT) | (mn < 170), iterations=1)
lab, n = nd.label(core); sizes = nd.sum(core, lab, range(1, n + 1))
keep = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s >= 25])
keep = nd.binary_fill_holes(nd.binary_closing(keep, iterations=2))
soft = nd.gaussian_filter(keep.astype(float), 0.7)
alpha = np.where(keep, 1.0, np.clip(soft * 1.6, 0, 1) * ((sat >= SAT * 0.6) | (mn < 200)))
save(rgb, alpha)
