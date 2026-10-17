# Round 174: placeholder room tiles for the tile-built worlds that have no owner paintings yet.
#   python3 tools/paint_placeholder_tiles.py sky      # world 3, the sky islands
#   python3 tools/paint_placeholder_tiles.py wilds    # world 4, Elaris (the forest)
# Paints one 1600x1000 tile per road shape into assets/environment/<world>/src/ (named
# <shape>-ph so they read as stand-ins), and writes each tile's exact walk area to
# src/masks/<name>.png, so tools/build_tile_world.py needs no colour tracing for them.
# An owner painting with the same shape (e.g. src/cross-a.jpg) is used instead once it lands;
# delete the -ph tile then.
import os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage as nd

W, H = 1600, 1000  # drawn at 2x the 800x500 room
S = 2
# Road shapes as painted (same names as tools/build_solaris.py SHAPES).
SHAPES = {'cross': 'nesw', 'corner': 'ne', 't-bottom': 'esw', 't-right': 'nes', 'straight': 'ns', 'dead-bottom': 's', 'dead-right': 'e'}
HALF = 40  # half the path width, in room pixels


def road_mask(exits, half=HALF, hub=70):
    """Walk area in 800x500 room pixels: a band from each exit to the centre, plus a round hub."""
    im = Image.new('L', (800, 500), 0); d = ImageDraw.Draw(im)
    cx, cy = 400, 250
    for e in exits:
        if e == 'n': d.rectangle((cx - half, 0, cx + half, cy), fill=255)
        if e == 's': d.rectangle((cx - half, cy, cx + half, 500), fill=255)
        if e == 'w': d.rectangle((0, cy - half, cx, cy + half), fill=255)
        if e == 'e': d.rectangle((cx, cy - half, 800, cy + half), fill=255)
    d.ellipse((cx - hub, cy - hub, cx + hub, cy + hub), fill=255)
    return im


def noise(rng, scale, blur):
    n = Image.fromarray((rng.random((H // scale, W // scale)) * 255).astype('uint8')).resize((W, H), Image.BICUBIC)
    return np.asarray(n.filter(ImageFilter.GaussianBlur(blur))).astype(float) / 255


def big(mask):
    return mask.resize((W, H), Image.NEAREST)


def blend(base, color, alpha):
    a = np.clip(alpha, 0, 1)[..., None]
    return base * (1 - a) + np.array(color, float) * a


def grow(mask, px):
    if px <= 0: return mask
    dist = nd.distance_transform_edt(np.asarray(mask) == 0)
    return Image.fromarray(((dist <= px) * 255).astype('uint8'))


def soft(mask, r):
    return np.asarray(mask.filter(ImageFilter.GaussianBlur(r))).astype(float) / 255


def paint_sky(exits, rng):
    """Floating sky islands: marble walkways on grassy rock, over clouds."""
    y = np.linspace(0, 1, H)[:, None]
    top, bot = np.array([86, 152, 220], float), np.array([200, 230, 252], float)
    img = top * (1 - y[..., None]) + bot * y[..., None]
    img = np.broadcast_to(img, (H, W, 3)).copy()
    # clouds: two layers of soft noise
    for scale, blur, cut, col in ((160, 40, .53, (250, 252, 255)), (80, 22, .56, (236, 244, 252))):
        n = noise(rng, scale, blur); img = blend(img, col, (n - cut) * 9)
    road = big(road_mask(exits))
    island = grow(road, 64 * S)
    # rock underside: the island shape pushed down and darkened
    under = Image.new('L', (W, H), 0); under.paste(island, (0, 26 * S))
    img = blend(img, (96, 88, 120), soft(under, 3) * .95)
    img = blend(img, (70, 62, 96), soft(under, 3) * (1 - soft(island, 2)) * .8)
    # grassy top
    grass = soft(island, 2); g = noise(rng, 6, 2)
    img = blend(img, (110, 176, 96), grass)
    img = blend(img, (84, 150, 78), grass * (g > .55))
    # little flowers and stones on the grass, never on the path
    rd = np.asarray(grow(road, 6 * S)) > 0; isl = np.asarray(island) > 0
    for _ in range(260):
        x, yy = int(rng.random() * W), int(rng.random() * H)
        if isl[yy, x] and not rd[yy, x]:
            c = [(255, 246, 170), (250, 200, 230), (240, 250, 255)][int(rng.random() * 3)]
            img[max(0, yy - 2):yy + 3, max(0, x - 2):x + 3] = c
    # marble walkway with tile seams and a gold edge
    path = soft(road, 1.5)
    img = blend(img, (236, 232, 244), path)
    seam = np.zeros((H, W), bool); seam[:, ::48] = True; seam[::48, :] = True
    img = blend(img, (196, 190, 214), path * seam * .7)
    edge = soft(grow(road, 4 * S), 1) - path
    img = blend(img, (226, 190, 92), np.clip(edge, 0, 1))
    # floating rocks in open sky
    for _ in range(7):
        x, yy, r = int(rng.random() * W), int(rng.random() * H), int(10 + rng.random() * 22)
        if not isl[min(H - 1, yy), min(W - 1, x)]:
            m = Image.new('L', (W, H), 0); ImageDraw.Draw(m).ellipse((x - r, yy - r // 2, x + r, yy + r), fill=255)
            img = blend(img, (110, 100, 136), soft(m, 1.5))
            m2 = Image.new('L', (W, H), 0); ImageDraw.Draw(m2).ellipse((x - r, yy - r // 2, x + r, yy + r // 4), fill=255)
            img = blend(img, (120, 184, 104), soft(m2, 1.5))
    # pillars beside the hub
    for dx, dy in ((-118, -112), (118, -112), (-118, 112), (118, 112)):
        x, yy = (400 + dx) * S, (250 + dy) * S
        if isl[yy, x] and not rd[yy, x]:
            d = ImageDraw.Draw(m := Image.new('L', (W, H), 0)); d.rectangle((x - 9, yy - 46, x + 9, yy + 8), fill=255)
            img = blend(img, (240, 236, 248), soft(m, 1)); img[yy - 50:yy - 42, x - 13:x + 14] = (226, 190, 92)
    return img


def paint_wilds(exits, rng):
    """Elaris forest: a dirt trail through mossy grass, under a dense canopy."""
    n1, n2 = noise(rng, 30, 10), noise(rng, 6, 2)
    img = np.zeros((H, W, 3)) + np.array([58, 112, 58], float)
    img = blend(img, (78, 138, 66), (n1 - .45) * 3)
    img = blend(img, (46, 94, 50), (n2 > .62) * .6)
    road = big(road_mask(exits))
    rd = np.asarray(grow(road, 30 * S)) > 0
    # canopy: tree crowns away from the trail
    crowns = Image.new('L', (W, H), 0); dc = ImageDraw.Draw(crowns)
    hi = Image.new('L', (W, H), 0); dh = ImageDraw.Draw(hi)
    for _ in range(140):
        x, yy, r = int(rng.random() * W), int(rng.random() * H), int(40 + rng.random() * 60)
        if not rd[min(H - 1, yy), min(W - 1, x)] and not rd[min(H - 1, yy + r // 2), min(W - 1, x)]:
            dc.ellipse((x - r, yy - r, x + r, yy + r), fill=255)
            dh.ellipse((x - r * .55 - r * .2, yy - r * .55 - r * .25, x + r * .55 - r * .2, yy + r * .55 - r * .25), fill=255)
    shadow = Image.new('L', (W, H), 0); shadow.paste(crowns, (14, 22))
    img = blend(img, (24, 48, 30), soft(shadow, 10) * .7)
    cr = soft(crowns, 2); img = blend(img, (34, 86, 44), cr)
    img = blend(img, (52, 118, 56), cr * soft(hi, 6) * .9)
    img = blend(img, (30, 72, 40), cr * (n2 > .6) * .5)
    # flowers in the grass
    open_ground = (np.asarray(crowns) == 0) & ~(np.asarray(grow(road, 4 * S)) > 0)
    for _ in range(360):
        x, yy = int(rng.random() * W), int(rng.random() * H)
        if open_ground[yy, x]:
            c = [(250, 236, 140), (226, 150, 210), (250, 250, 250), (150, 200, 255)][int(rng.random() * 4)]
            img[max(0, yy - 2):yy + 2, max(0, x - 2):x + 2] = c
    # dirt trail with a darker rim and pebbles
    rim = soft(grow(road, 5 * S), 3); img = blend(img, (96, 70, 44), rim)
    path = soft(road, 2); img = blend(img, (176, 140, 92), path)
    img = blend(img, (150, 116, 74), path * (n2 > .58) * .6)
    rp = np.asarray(road) > 0
    for _ in range(300):
        x, yy = int(rng.random() * W), int(rng.random() * H)
        if rp[yy, x]: img[yy:yy + 3, x:x + 4] = (200, 178, 140)
    return img


PAINTERS = {'sky': paint_sky, 'wilds': paint_wilds}


def main(world):
    out = f'assets/environment/{world}/src'; os.makedirs(out + '/masks', exist_ok=True)
    for i, (shape, exits) in enumerate(SHAPES.items()):
        rng = np.random.default_rng(1000 + i * 17 + len(world))
        img = PAINTERS[world](exits, rng)
        name = shape + '-ph'
        Image.fromarray(np.clip(img, 0, 255).astype('uint8')).save(f'{out}/{name}.jpg', quality=90)
        road_mask(exits).save(f'{out}/masks/{name}.png')
        print('painted', world, name)


if __name__ == '__main__':
    if len(sys.argv) != 2 or sys.argv[1] not in PAINTERS: raise SystemExit('usage: paint_placeholder_tiles.py sky|wilds')
    main(sys.argv[1])
