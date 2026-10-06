#!/usr/bin/env python3
"""
Pixel-art illustrations for the Round 44 side-deck cards and the Static
junk card, in the same style as tools/generate_unique_card_art.py.

Side cards: assets/cards/side/<id>.png (128x128 scaled 4x to 512x512; side
cards have no levels). Static: assets/cards/level<0-3>/static.png (1024).
Replace any file with hand-made art of the same name to override it.
Usage: python3 tools/generate_side_card_art.py
"""
import math, os, random, sys
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from generate_unique_card_art import background, glow, lerp, S, ROOT

# id: (background top, bottom, main, light, accent)
SIDE = {
    'purify':   ((22, 20, 52), (60, 52, 110), (250, 240, 200), (255, 255, 240), (150, 230, 255)),
    'dispel':   ((30, 10, 30), (80, 30, 70), (230, 120, 200), (255, 210, 240), (255, 240, 120)),
    'aegis':    ((10, 22, 46), (30, 60, 100), (120, 170, 230), (210, 235, 255), (255, 214, 110)),
    'anchor':   ((8, 18, 34), (20, 50, 80), (150, 170, 200), (230, 240, 255), (140, 110, 255)),
    'restore':  ((8, 30, 22), (24, 80, 52), (120, 220, 140), (220, 255, 220), (255, 190, 220)),
    'ground':   ((24, 18, 10), (70, 52, 30), (220, 190, 120), (255, 240, 200), (120, 220, 255)),
    'mirror':   ((14, 14, 34), (44, 44, 90), (190, 200, 240), (250, 250, 255), (180, 120, 255)),
    'phase':    ((10, 10, 30), (36, 24, 80), (150, 120, 240), (230, 220, 255), (120, 255, 230)),
    'overflow': ((20, 10, 40), (60, 30, 110), (200, 160, 255), (255, 240, 255), (255, 220, 120)),
    'stasis':   ((10, 20, 30), (30, 60, 80), (150, 220, 230), (240, 255, 255), (255, 200, 120)),
}


def emblem(d, card, main, light, accent):
    cx, cy = 64, 62
    if card == 'purify':
        d.rectangle([cx - 6, cy - 32, cx + 6, cy + 32], fill=main)
        d.rectangle([cx - 32, cy - 6, cx + 32, cy + 6], fill=main)
        d.rectangle([cx - 3, cy - 28, cx + 3, cy + 28], fill=light)
        for k in range(8):
            a = k * math.pi / 4 + math.pi / 8
            d.line([cx + int(14 * math.cos(a)), cy + int(14 * math.sin(a)), cx + int(40 * math.cos(a)), cy + int(40 * math.sin(a))], fill=accent)
    elif card == 'dispel':
        d.line([cx - 34, cy + 34, cx + 30, cy - 30], fill=main, width=6)
        d.polygon([(cx + 22, cy - 38), (cx + 38, cy - 22), (cx + 40, cy - 40)], fill=light)
        for r in (10, 18, 26):
            d.arc([cx - r, cy - r, cx + r, cy + r], 200, 340, fill=accent, width=2)
        d.line([cx - 20, cy - 20, cx + 20, cy + 20], fill=accent, width=3)
    elif card == 'aegis':
        d.polygon([(cx, cy - 38), (cx + 30, cy - 26), (cx + 26, cy + 14), (cx, cy + 38), (cx - 26, cy + 14), (cx - 30, cy - 26)], fill=main, outline=light)
        d.polygon([(cx, cy - 26), (cx + 18, cy - 18), (cx + 15, cy + 8), (cx, cy + 24), (cx - 15, cy + 8), (cx - 18, cy - 18)], outline=accent)
        d.rectangle([cx - 2, cy - 20, cx + 2, cy + 18], fill=accent)
    elif card == 'anchor':
        d.ellipse([cx - 7, cy - 38, cx + 7, cy - 24], outline=light, width=3)
        d.rectangle([cx - 3, cy - 24, cx + 3, cy + 30], fill=main)
        d.rectangle([cx - 18, cy - 16, cx + 18, cy - 12], fill=main)
        d.arc([cx - 30, cy - 4, cx + 30, cy + 40], 20, 160, fill=light, width=5)
        for r in (40, 46):
            d.arc([cx - r, cy - r, cx + r, cy + r], 0, 360, fill=accent)
    elif card == 'restore':
        for k in range(5):
            a = k * 2 * math.pi / 5 - math.pi / 2
            px, py = cx + int(18 * math.cos(a)), cy + int(18 * math.sin(a))
            d.ellipse([px - 13, py - 13, px + 13, py + 13], fill=main, outline=light)
        d.ellipse([cx - 9, cy - 9, cx + 9, cy + 9], fill=accent)
        d.line([cx, cy + 22, cx - 6, cy + 44], fill=(80, 170, 90), width=3)
    elif card == 'ground':
        d.rectangle([cx - 3, cy - 36, cx + 3, cy + 18], fill=main)
        for i, w in enumerate((30, 20, 10)):
            y = cy + 22 + i * 7
            d.rectangle([cx - w, y, cx + w, y + 3], fill=light)
        d.line([(cx - 20, cy - 40), (cx - 8, cy - 26), (cx - 16, cy - 22), (cx - 2, cy - 8)], fill=accent, width=2)
        d.line([(cx + 22, cy - 38), (cx + 10, cy - 24), (cx + 18, cy - 20), (cx + 4, cy - 6)], fill=accent, width=2)
    elif card == 'mirror':
        d.ellipse([cx - 30, cy - 36, cx + 30, cy + 36], fill=lerp(main, (0, 0, 0), .3), outline=light, width=3)
        d.pieslice([cx - 24, cy - 30, cx + 24, cy + 30], 90, 270, fill=main)
        d.line([cx - 14, cy - 16, cx + 6, cy - 26], fill=light, width=2)
        d.line([cx, cy - 34, cx, cy + 34], fill=accent, width=2)
    elif card == 'phase':
        for i, r in enumerate((36, 28, 20, 12)):
            col = lerp(main, accent, i / 3)
            for k in range(0, 360, 24):
                a = math.radians(k + i * 9)
                x, y = cx + int(r * math.cos(a)), cy + int(r * math.sin(a))
                d.rectangle([x - 1, y - 1, x + 1, y + 1], fill=col)
        d.ellipse([cx - 6, cy - 6, cx + 6, cy + 6], fill=light)
    elif card == 'overflow':
        d.polygon([(cx, cy - 38), (cx + 9, cy - 9), (cx + 38, cy), (cx + 9, cy + 9), (cx, cy + 38), (cx - 9, cy + 9), (cx - 38, cy), (cx - 9, cy - 9)], fill=main, outline=light)
        d.polygon([(cx, cy - 18), (cx + 5, cy - 5), (cx + 18, cy), (cx + 5, cy + 5), (cx, cy + 18), (cx - 5, cy + 5), (cx - 18, cy), (cx - 5, cy - 5)], fill=accent)
    elif card == 'stasis':
        d.polygon([(cx - 22, cy - 36), (cx + 22, cy - 36), (cx + 3, cy), (cx + 22, cy + 36), (cx - 22, cy + 36), (cx - 3, cy)], outline=light, fill=lerp(main, (0, 0, 0), .5))
        d.polygon([(cx - 14, cy - 30), (cx + 14, cy - 30), (cx, cy - 6)], fill=accent)
        d.polygon([(cx - 16, cy + 32), (cx + 16, cy + 32), (cx, cy + 18)], fill=accent)
        d.rectangle([cx - 26, cy - 40, cx + 26, cy - 36], fill=main)
        d.rectangle([cx - 26, cy + 36, cx + 26, cy + 40], fill=main)


def paint_side(card):
    top, bottom, main, light, accent = SIDE[card]
    rnd = random.Random(sum(map(ord, card)))
    img = glow(background(top, bottom, rnd), (64, 62), 40, accent, .5)
    d = ImageDraw.Draw(img)
    for k in range(20):  # rune ring
        a = k * math.pi / 10
        x, y = 64 + int(48 * math.cos(a)), 62 + int(48 * math.sin(a))
        d.rectangle([x - 1, y - 1, x + 1, y + 1], fill=lerp(top, accent, .7))
    emblem(d, card, main, light, accent)
    d.rectangle([1, 1, S - 2, S - 2], outline=lerp(accent, (255, 255, 255), .2), width=1)
    return img.resize((512, 512), Image.NEAREST)


def paint_static(level):
    rnd = random.Random(99 + level)
    img = Image.new('RGB', (S, S), (18, 18, 22))
    px = img.load()
    for y in range(S):
        for x in range(S):
            v = rnd.randrange(20, 120)
            band = (y // 6) % 5 == 0
            px[x, y] = (v + (40 if band else 0), v, v + (30 if band else 10))
    d = ImageDraw.Draw(img)
    for k in range(6):
        y = rnd.randrange(10, 118)
        d.line([0, y, S, y + rnd.randrange(-3, 4)], fill=(150, 210, 255), width=1)
    d.text((44, 56), 'STATIC', fill=(230, 240, 255))
    return img.resize((1024, 1024), Image.NEAREST)


if __name__ == '__main__':
    out = os.path.join(ROOT, 'assets', 'cards', 'side')
    os.makedirs(out, exist_ok=True)
    for card in SIDE:
        p = os.path.join(out, card + '.png'); paint_side(card).save(p, optimize=True); print('wrote', os.path.relpath(p, ROOT))
    for level in range(4):
        p = os.path.join(ROOT, 'assets', 'cards', 'level%d' % level, 'static.png'); paint_static(level).save(p, optimize=True); print('wrote', os.path.relpath(p, ROOT))
