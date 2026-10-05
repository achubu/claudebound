#!/usr/bin/env python3
"""
Pixel-art illustrations for the mini-boss unique cards (Round 38).

Each card is painted at 128x128 and scaled 8x (nearest-neighbour) to
1024x1024, matching the crisp pixel look of the existing card art. Every
level escalates the same scene so upgrades read at a glance:
  Level 0  the emblem on a stormy backdrop
  Level 1  + inner glow and a rune ring
  Level 2  + orbiting crystal shards and sparks
  Level 3  + radiant rays and a gold frame

Output: assets/cards/level<0-3>/<id>.png. Replace any file with hand-made
art of the same name and the game picks it up automatically.
Usage: python3 tools/generate_unique_card_art.py
"""
import math, os, random
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = 128

CARDS = {
    # id: (background top, background bottom, emblem main, emblem light, accent)
    'lunarEdict':       ((10, 18, 48),  (28, 54, 92),   (196, 214, 240), (250, 252, 255), (90, 200, 230)),
    'tidebound':        ((6, 26, 44),   (14, 70, 96),   (60, 150, 200),  (170, 230, 250), (240, 250, 255)),
    'sovereignGale':    ((12, 34, 40),  (30, 92, 92),   (160, 240, 220), (240, 255, 250), (255, 214, 110)),
    'arcBulwark':       ((24, 10, 46),  (60, 30, 96),   (130, 110, 200), (200, 190, 255), (255, 230, 90)),
    'phantomResonance': ((16, 8, 36),   (52, 20, 80),   (170, 120, 240), (235, 210, 255), (110, 240, 255)),
}


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def background(top, bottom, rnd):
    img = Image.new('RGB', (S, S))
    px = img.load()
    for y in range(S):
        row = lerp(top, bottom, y / (S - 1))
        for x in range(S):
            # soft diagonal rain streaks
            streak = ((x * 2 + y) % 11 == 0) and rnd.random() < .35
            px[x, y] = lerp(row, (200, 220, 255), .12) if streak else row
    d = ImageDraw.Draw(img)
    for _ in range(26):  # stars / storm motes
        x, y = rnd.randrange(S), rnd.randrange(S // 2)
        d.point((x, y), fill=lerp(top, (255, 255, 255), .7))
    # ground band
    d.rectangle([0, 104, S, S], fill=lerp(bottom, (0, 0, 0), .45))
    for x in range(0, S, 6):
        d.line([x, 104, x + 3, 104], fill=lerp(bottom, (255, 255, 255), .15))
    return img


def glow(img, center, radius, color, strength):
    layer = Image.new('RGB', (S, S), (0, 0, 0))
    ImageDraw.Draw(layer).ellipse([center[0] - radius, center[1] - radius, center[0] + radius, center[1] + radius], fill=color)
    layer = layer.filter(ImageFilter.GaussianBlur(radius / 2.2))
    return Image.blend(img, Image.composite(layer, img, layer.convert('L')), strength)


def emblem(d, card, main, light, accent):
    cx, cy = 64, 62
    if card == 'lunarEdict':
        d.ellipse([cx - 30, cy - 30, cx + 30, cy + 30], fill=main)
        d.ellipse([cx - 18, cy - 38, cx + 40, cy + 22], fill=None)
        d.ellipse([cx - 16, cy - 34, cx + 38, cy + 24], fill=(18, 34, 72))  # carve crescent
        d.polygon([(cx - 6, cy - 2), (cx + 2, cy - 2), (cx + 2, cy + 36), (cx - 2, cy + 42), (cx - 6, cy + 36)], fill=light)  # blade
        d.rectangle([cx - 14, cy + 6, cx + 10, cy + 10], fill=accent)  # guard
    elif card == 'tidebound':
        d.polygon([(cx - 30, cy - 30), (cx + 30, cy - 30), (cx + 30, cy + 4), (cx, cy + 36), (cx - 30, cy + 4)], fill=main, outline=light)
        for i, off in enumerate((-10, 2, 14)):
            pts = [(cx - 24 + k * 4, cy + off + int(4 * math.sin(k * 1.1 + i))) for k in range(13)]
            d.line(pts, fill=light if i != 1 else accent, width=2)
    elif card == 'sovereignGale':
        for r in range(6, 34, 4):
            a0 = r * 0.35
            pts = [(cx + int((r + t * 3) * math.cos(a0 + t)), cy + int((r + t * 3) * math.sin(a0 + t))) for t in [k / 6 for k in range(0, 16)]]
            d.line(pts, fill=main if r % 8 else light, width=2)
        d.polygon([(cx - 14, cy - 34), (cx - 8, cy - 44), (cx - 2, cy - 36), (cx + 4, cy - 46), (cx + 10, cy - 36), (cx + 16, cy - 44), (cx + 18, cy - 32), (cx - 16, cy - 32)], fill=accent)
    elif card == 'arcBulwark':
        d.rounded_rectangle([cx - 26, cy - 36, cx + 26, cy + 34], radius=8, fill=main, outline=light, width=2)
        d.rectangle([cx - 20, cy - 30, cx + 20, cy + 28], outline=lerp(main, (0, 0, 0), .4))
        d.polygon([(cx + 4, cy - 30), (cx - 12, cy + 2), (cx - 1, cy + 2), (cx - 8, cy + 28), (cx + 12, cy - 6), (cx + 1, cy - 6), (cx + 8, cy - 30)], fill=accent)
    elif card == 'phantomResonance':
        for r in (34, 26, 18):
            d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=main if r != 26 else accent, width=2)
        d.polygon([(cx - 14, cy + 16), (cx - 14, cy - 6), (cx, cy - 18), (cx + 14, cy - 6), (cx + 14, cy + 16), (cx + 8, cy + 10), (cx + 3, cy + 16), (cx - 3, cy + 10), (cx - 8, cy + 16)], fill=light)
        d.rectangle([cx - 7, cy - 4, cx - 3, cy + 1], fill=(30, 10, 60))
        d.rectangle([cx + 3, cy - 4, cx + 7, cy + 1], fill=(30, 10, 60))


def paint(card, level):
    top, bottom, main, light, accent = CARDS[card]
    rnd = random.Random(hash((card, 7)) & 0xffff)
    img = background(top, bottom, rnd)
    if level >= 3:  # radiant rays behind everything
        d = ImageDraw.Draw(img)
        for k in range(16):
            a = k * math.pi / 8
            d.polygon([(64, 62), (64 + int(90 * math.cos(a - .07)), 62 + int(90 * math.sin(a - .07))), (64 + int(90 * math.cos(a + .07)), 62 + int(90 * math.sin(a + .07)))], fill=lerp(top, accent, .35))
    if level >= 1:
        img = glow(img, (64, 62), 34 + level * 4, accent, .45 + level * .1)
    d = ImageDraw.Draw(img)
    if level >= 1:  # rune ring
        for k in range(24):
            a = k * math.pi / 12
            x, y = 64 + int(46 * math.cos(a)), 62 + int(46 * math.sin(a))
            d.rectangle([x - 1, y - 1, x + 1, y + 1], fill=lerp(accent, (255, 255, 255), .3) if k % 3 == 0 else lerp(top, accent, .6))
    emblem(d, card, main, light, accent)
    if level >= 2:  # orbiting shards + sparks
        for k in range(6):
            a = k * math.pi / 3 + .4
            x, y = 64 + int(54 * math.cos(a)), 62 + int(38 * math.sin(a))
            d.polygon([(x, y - 5), (x + 3, y), (x, y + 5), (x - 3, y)], fill=light, outline=accent)
        for _ in range(18):
            x, y = rnd.randrange(14, 114), rnd.randrange(10, 100)
            d.point((x, y), fill=(255, 255, 230))
    if level >= 3:  # gold frame
        gold, dark = (240, 196, 90), (120, 80, 30)
        d.rectangle([1, 1, S - 2, S - 2], outline=gold, width=2)
        d.rectangle([4, 4, S - 5, S - 5], outline=dark)
        for x, y in ((3, 3), (S - 4, 3), (3, S - 4), (S - 4, S - 4)):
            d.rectangle([x - 2, y - 2, x + 2, y + 2], fill=gold)
    return img.resize((1024, 1024), Image.NEAREST)


if __name__ == '__main__':
    for card in CARDS:
        for level in range(4):
            out = os.path.join(ROOT, 'assets', 'cards', 'level%d' % level, card + '.png')
            paint(card, level).save(out, optimize=True)
            print('wrote', os.path.relpath(out, ROOT))
