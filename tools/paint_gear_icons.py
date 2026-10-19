# Round 176: placeholder icons for the 12 gear pieces (assets/items/gear/<id>.png, 128x128).
#   python3 tools/paint_gear_icons.py
# Each piece is drawn as a simple shaded silhouette of its slot in its world's colours, so the
# Gear screen and the map markers work until the owner's art arrives (same file names).
import os
from PIL import Image, ImageDraw, ImageFilter

OUT = 'assets/items/gear'
WORLD_COLOURS = {  # main, dark, accent
    'city': ((70, 196, 214), (24, 70, 92), (255, 92, 168)),
    'elaris': ((232, 176, 84), (120, 74, 26), (255, 236, 160)),
    'sky': ((176, 214, 246), (70, 110, 170), (255, 255, 255)),
    'wilds': ((96, 168, 78), (36, 76, 34), (232, 210, 120)),
    'vespera': ((122, 132, 238), (40, 40, 110), (190, 240, 255)),
    'chronospire': ((214, 170, 96), (96, 62, 20), (255, 226, 150)),
}
# id: (slot, world) — must match GEAR in assets/gear.js
GEAR = {
    'ember': ('gloves', 'city'), 'boots': ('boots', 'city'),
    'sunwovenShirt': ('shirt', 'elaris'), 'scarabBelt': ('belt', 'elaris'),
    'galeweavePants': ('pants', 'sky'), 'cloudstepBoots': ('boots', 'sky'),
    'thornhideGloves': ('gloves', 'wilds'), 'mossweavePants': ('pants', 'wilds'),
    'stormglassBelt': ('belt', 'vespera'), 'tempestGloves': ('gloves', 'vespera'),
    'timewornShirt': ('shirt', 'chronospire'), 'hourglassBelt': ('belt', 'chronospire'),
}
S = 4  # drawn at 4x and scaled down for smooth edges
SHAPES = {
    'boots': [[(34, 18), (64, 18), (64, 76), (100, 84), (108, 100), (106, 110), (30, 110), (30, 76)]],
    'gloves': [[(36, 110), (36, 60), (30, 40), (34, 34), (42, 40), (46, 54), (46, 22), (54, 20), (58, 50), (60, 16), (68, 16), (70, 50), (74, 20),
                (82, 22), (82, 54), (88, 30), (96, 32), (92, 70), (88, 110)]],
    'shirt': [[(42, 16), (54, 24), (74, 24), (86, 16), (112, 34), (100, 56), (90, 50), (90, 112), (38, 112), (38, 50), (28, 56), (16, 34)]],
    'pants': [[(34, 16), (94, 16), (100, 112), (74, 112), (64, 50), (54, 112), (28, 112)]],
    'belt': [[(12, 52), (116, 52), (116, 76), (12, 76)]],
}


def icon(slot, world):
    main, dark, accent = WORLD_COLOURS[world]
    big = Image.new('RGBA', (128 * S, 128 * S), (0, 0, 0, 0))
    shape = Image.new('L', big.size, 0); ImageDraw.Draw(shape).polygon([(x * S, y * S) for x, y in SHAPES[slot][0]], fill=255)
    shadow = Image.new('RGBA', big.size, (0, 0, 0, 0)); shadow.paste((0, 0, 0, 120), (6 * S, 8 * S), shape)
    big = Image.alpha_composite(big, shadow.filter(ImageFilter.GaussianBlur(5 * S)))
    fill = Image.new('RGBA', big.size, main + (255,)); big.paste(fill, (0, 0), shape)
    # shading: darker lower half, lighter rim on top-left
    d = ImageDraw.Draw(big)
    lower = Image.new('L', big.size, 0); ImageDraw.Draw(lower).rectangle((0, 70 * S, 128 * S, 128 * S), fill=110)
    lower = Image.composite(lower, Image.new('L', big.size, 0), shape)
    big.paste(dark + (255,), (0, 0), lower)
    outline = shape.filter(ImageFilter.MaxFilter(9)); edge = Image.composite(outline, Image.new('L', big.size, 0), Image.eval(shape, lambda v: 255 - v))
    big.paste(dark + (255,), (0, 0), edge)
    # slot details in the accent colour
    if slot == 'boots': d.rectangle((34 * S, 92 * S, 106 * S, 98 * S), fill=accent + (255,)); d.ellipse((40 * S, 30 * S, 56 * S, 46 * S), outline=accent + (255,), width=3 * S)
    if slot == 'gloves': d.rectangle((36 * S, 92 * S, 88 * S, 100 * S), fill=accent + (255,))
    if slot == 'shirt': d.polygon([(54 * S, 24 * S), (64 * S, 40 * S), (74 * S, 24 * S)], fill=dark + (255,)); d.ellipse((58 * S, 60 * S, 70 * S, 72 * S), fill=accent + (255,))
    if slot == 'pants': d.rectangle((34 * S, 16 * S, 94 * S, 26 * S), fill=accent + (255,))
    if slot == 'belt': d.rectangle((50 * S, 46 * S, 78 * S, 82 * S), outline=accent + (255,), width=5 * S); d.line((64 * S, 52 * S, 64 * S, 76 * S), fill=accent + (255,), width=4 * S)
    return big.resize((128, 128), Image.LANCZOS)


def main():
    os.makedirs(OUT, exist_ok=True)
    for gid, (slot, world) in GEAR.items():
        icon(slot, world).save(f'{OUT}/{gid}.png')
    print('painted', len(GEAR), 'gear icons into', OUT)


if __name__ == '__main__':
    main()
