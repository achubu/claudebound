# Round 352 (owner: "check all enemies to make sure their animations are clean and there are no artifacts").
# Checks every four-frame creature sheet in assets/monsters for:
#   - stray fragments: small pieces near a frame's side edge, apart from the creature (bits of a neighbouring frame);
#   - art touching a frame edge (it would be clipped, or bleed into the next frame);
#   - keying fringe: green or magenta tinted see-through edge pixels;
#   - pale matte: smooth, unsaturated light patches of leftover background, 600px or more, touching the transparency.
# Usage: python3 tools/sprite_audit.py   (prints one line per problem; exit code 1 if any)
# Deliberate effects are listed in ALLOW (orbiting pebbles, steam puffs, a mirage fringe).
import glob, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
ALLOW = {
    ('elaris/dust-devil.png', 'fragment'),       # pebbles orbiting the whirlwind
    ('elaris/cistern-warden.png', 'fragment'),   # steam puffs from its valves
    ('elaris/bloom-tyrant.png', 'fragment'),     # a 3px petal
    ('elaris/bloom-tyrant.png', 'fringe'),       # violet blossoms and green leaves at its edges
    ('elaris/blight-antler.png', 'fringe'),      # green moss and crystals along its back
    ('elaris/mirage-ibis.png', 'fringe'),
    ('city/phase-shade-v2.png', 'fragment'),
    ('city/data-wisp-v2.png', 'fragment'),       # sparks and glitch bits around its core     # glitch pixel blocks breaking off its robe        # its deliberate pink mirage fringe (Round 270)
}

def frames(path):
    im = Image.open(path); W, H = im.size
    if abs(W / 4 - H * 0.75) > H * 0.05:
        return None
    a = np.array(im.convert('RGBA')).astype(int); fw = W // 4
    return [a[:, i * fw:(i + 1) * fw] for i in range(4)]

def audit(path):
    fr = frames(path)
    if fr is None:
        return []
    out = []
    for i, f in enumerate(fr):
        al = f[..., 3]; h, w = al.shape
        lab, n = ndimage.label(al > 30, structure=np.ones((3, 3)))
        if not n:
            out.append(('empty', 'frame %d is empty' % i)); continue
        sz = ndimage.sum(np.ones_like(al), lab, range(1, n + 1)); main = lab == (np.argmax(sz) + 1)
        dist = ndimage.distance_transform_edt(~main)
        for j, s in enumerate(sz):
            if s > sz.max() * 0.05:
                continue
            ys, xs = np.nonzero(lab == j + 1)
            if (xs.min() < w * 0.07 or xs.max() > w * 0.93) and dist[ys, xs].min() > 12:
                out.append(('fragment', 'frame %d: %dpx piece at x %d-%d, apart from the creature' % (i, s, xs.min(), xs.max())))
        e = np.concatenate([al[0], al[-1], al[:, 0], al[:, -1]])
        if (e > 40).sum() > 3:
            out.append(('edge', 'frame %d touches its edge (%d px)' % (i, (e > 40).sum())))
        r, g, b = f[..., 0], f[..., 1], f[..., 2]; soft = (al > 20) & (al < 230)
        green = (soft & (g > r + 40) & (g > b + 40)).sum(); mag = (soft & (r > g + 60) & (b > g + 60)).sum()
        if green > 300 or mag > 300:
            out.append(('fringe', 'frame %d: %d green / %d magenta see-through edge pixels' % (i, green, mag)))
        rgb = f[..., :3].astype(float); lum = rgb.mean(-1); sat = rgb.max(-1) - rgb.min(-1)
        m = ndimage.uniform_filter(lum, 5); m2 = ndimage.uniform_filter(lum * lum, 5); std = np.sqrt(np.clip(m2 - m * m, 0, None))
        pale = (al > 60) & (sat < 26) & (lum > 160) & (std < 10)
        plab, pn = ndimage.label(pale); near = ndimage.binary_dilation(al < 40, iterations=2)
        for j in range(1, pn + 1):
            reg = plab == j
            if reg.sum() >= 600 and (reg & near).any():
                out.append(('matte', 'frame %d: %dpx smooth pale patch on the outline' % (i, reg.sum())))
    return out

if __name__ == '__main__':
    bad = 0
    for p in sorted(glob.glob(os.path.join(ROOT, 'assets/monsters/**/*.png'), recursive=True)):
        rel = os.path.relpath(p, os.path.join(ROOT, 'assets/monsters')).replace(os.sep, '/')
        if '/src/' in '/' + rel or 'preview' in rel:
            continue
        for kind, msg in audit(p):
            if (rel, kind) in ALLOW:
                continue
            print('%s: %s' % (rel, msg)); bad += 1
    print('sprite audit: %d problem(s)' % bad)
    sys.exit(1 if bad else 0)
