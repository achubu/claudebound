#!/usr/bin/env python3
"""
Pixel-art illustrations for the Round 49 card-variety cards, painted with
the same pipeline as tools/generate_unique_card_art.py (stormy backdrop;
glow + rune ring at Level 1, orbiting shards at Level 2, rays + gold frame
at Level 3). Output: assets/cards/level<0-3>/<id>.png.
Replace any file with hand-made art of the same name to override it.
Usage: python3 tools/generate_variety_card_art.py
"""
import math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import generate_unique_card_art as gu

CARDS = {
    # id: (background top, bottom, emblem main, emblem light, accent)
    'arcJab':         ((14, 16, 40), (40, 44, 92),  (120, 200, 255), (230, 250, 255), (190, 140, 255)),
    'bulwarkBash':    ((28, 20, 12), (74, 54, 30),  (190, 160, 110), (250, 230, 180), (255, 120, 80)),
    'overclock':      ((16, 18, 22), (50, 56, 66),  (170, 180, 195), (240, 245, 250), (255, 170, 60)),
    'staticShield':   ((10, 22, 36), (26, 60, 90),  (90, 180, 230),  (210, 245, 255), (250, 240, 120)),
    'breachSpike':    ((30, 12, 14), (78, 30, 34),  (200, 90, 80),   (255, 210, 190), (255, 230, 120)),
    'thornlash':      ((10, 26, 12), (30, 70, 34),  (110, 190, 90),  (210, 255, 190), (200, 120, 255)),
    'wildfire':       ((34, 12, 6),  (96, 34, 12),  (255, 140, 40),  (255, 235, 150), (255, 80, 40)),
    'rootbind':       ((18, 22, 10), (52, 60, 24),  (150, 120, 70),  (230, 210, 160), (120, 220, 120)),
    'tidecall':       ((6, 20, 40),  (14, 60, 100), (70, 160, 220),  (200, 240, 255), (255, 255, 255)),
    'verdantPact':    ((10, 28, 22), (26, 80, 60),  (120, 220, 160), (230, 255, 240), (255, 200, 230)),
    'chainLightning': ((14, 12, 36), (40, 34, 90),  (180, 170, 255), (250, 250, 255), (255, 240, 120)),
    'stormBattery':   ((12, 18, 30), (34, 50, 80),  (120, 140, 170), (220, 235, 255), (120, 255, 200)),
    'mirrorguard':    ((16, 16, 30), (46, 46, 86),  (190, 200, 235), (250, 250, 255), (160, 120, 255)),
    'tempestSurge':   ((10, 22, 30), (24, 66, 84),  (120, 220, 230), (240, 255, 255), (255, 210, 120)),
    'prismLance':     ((22, 12, 34), (60, 30, 90),  (220, 160, 255), (255, 240, 255), (130, 255, 240)),
}


def emblem(d, card, main, light, accent):
    cx, cy = 64, 62
    if card == 'arcJab':
        d.ellipse([cx - 16, cy - 6, cx + 16, cy + 26], fill=main, outline=light)  # fist
        for i in range(4): d.rectangle([cx - 14 + i * 7, cy - 10, cx - 9 + i * 7, cy], fill=light)
        d.line([(cx + 18, cy - 30), (cx + 8, cy - 16), (cx + 16, cy - 14), (cx + 4, cy)], fill=accent, width=3)
    elif card == 'bulwarkBash':
        d.rounded_rectangle([cx - 24, cy - 32, cx + 24, cy + 30], radius=10, fill=main, outline=light, width=2)
        d.polygon([(cx, cy - 18), (cx + 14, cy), (cx, cy + 18), (cx - 14, cy)], fill=accent)
        for k in range(5): d.line([cx + 26, cy - 20 + k * 10, cx + 40, cy - 24 + k * 10], fill=light, width=2)
    elif card == 'overclock':
        for k in range(10):
            a = k * math.pi / 5
            d.rectangle([cx + int(28 * math.cos(a)) - 4, cy + int(28 * math.sin(a)) - 4, cx + int(28 * math.cos(a)) + 4, cy + int(28 * math.sin(a)) + 4], fill=main)
        d.ellipse([cx - 26, cy - 26, cx + 26, cy + 26], fill=main, outline=light, width=2)
        d.ellipse([cx - 10, cy - 10, cx + 10, cy + 10], fill=gu.lerp(main, (0, 0, 0), .5))
        d.line([cx, cy, cx + 18, cy - 14], fill=accent, width=3)
    elif card == 'staticShield':
        d.ellipse([cx - 30, cy - 34, cx + 30, cy + 34], fill=gu.lerp(main, (0, 0, 0), .3), outline=light, width=2)
        for k in range(6):
            a = k * math.pi / 3
            d.line([(cx, cy), (cx + int(26 * math.cos(a)), cy + int(26 * math.sin(a)) + (4 if k % 2 else -4)), (cx + int(30 * math.cos(a)), cy + int(30 * math.sin(a)))], fill=accent, width=2)
        d.ellipse([cx - 7, cy - 7, cx + 7, cy + 7], fill=light)
    elif card == 'breachSpike':
        d.polygon([(cx - 4, cy - 40), (cx + 4, cy - 40), (cx + 8, cy + 10), (cx, cy + 40), (cx - 8, cy + 10)], fill=main, outline=light)
        for side in (-1, 1):
            d.polygon([(cx + side * 12, cy + 4), (cx + side * 34, cy - 6), (cx + side * 30, cy + 14)], fill=gu.lerp(main, (0, 0, 0), .3), outline=accent)
    elif card == 'thornlash':
        pts = [(cx - 34 + k * 5, cy + int(20 * math.sin(k * .6))) for k in range(15)]
        d.line(pts, fill=main, width=4)
        for k in range(1, 14, 2):
            x, y = pts[k]; d.polygon([(x, y - 3), (x + 4, y - 12), (x + 6, y - 2)], fill=light)
        d.ellipse([cx + 26, cy + 4, cx + 38, cy + 16], fill=accent)
    elif card == 'wildfire':
        for i, (w, h, col) in enumerate(((30, 44, main), (20, 32, accent), (10, 18, light))):
            d.polygon([(cx, cy - h), (cx + w, cy + 10), (cx + w // 2, cy + 30), (cx - w // 2, cy + 30), (cx - w, cy + 10)], fill=col)
    elif card == 'rootbind':
        for k in range(5):
            a = -math.pi / 2 + (k - 2) * .45
            pts = [(cx + int(r * math.cos(a + .25 * math.sin(r / 6))), cy + 30 - int(r * .9)) for r in range(0, 56, 4)]
            d.line(pts, fill=main, width=3)
        d.ellipse([cx - 20, cy - 10, cx + 20, cy + 10], outline=accent, width=3)
    elif card == 'tidecall':
        for i, r in enumerate((34, 24, 14)):
            d.arc([cx - r, cy - r, cx + r, cy + r], 200, 520, fill=[main, light, accent][i], width=3)
        d.polygon([(cx - 6, cy - 4), (cx + 6, cy - 4), (cx, cy + 8)], fill=light)
    elif card == 'verdantPact':
        d.polygon([(cx, cy - 34), (cx + 22, cy - 6), (cx, cy + 30), (cx - 22, cy - 6)], fill=main, outline=light)
        d.line([cx, cy - 30, cx, cy + 26], fill=gu.lerp(main, (0, 0, 0), .4), width=2)
        d.ellipse([cx - 6, cy - 6, cx + 6, cy + 6], fill=accent)
    elif card == 'chainLightning':
        for k, off in enumerate((-22, 0, 22)):
            d.line([(cx + off - 6, cy - 36), (cx + off + 6, cy - 12), (cx + off - 4, cy - 8), (cx + off + 8, cy + 18)], fill=[main, light, accent][k], width=3)
        for k in range(3): d.ellipse([cx - 30 + k * 22, cy + 18, cx - 22 + k * 22, cy + 26], fill=light)
    elif card == 'stormBattery':
        d.rounded_rectangle([cx - 18, cy - 30, cx + 18, cy + 32], radius=5, fill=main, outline=light, width=2)
        d.rectangle([cx - 7, cy - 36, cx + 7, cy - 30], fill=light)
        for k in range(3): d.rectangle([cx - 12, cy + 18 - k * 14, cx + 12, cy + 26 - k * 14], fill=accent)
    elif card == 'mirrorguard':
        d.polygon([(cx, cy - 36), (cx + 28, cy - 22), (cx + 24, cy + 14), (cx, cy + 36), (cx - 24, cy + 14), (cx - 28, cy - 22)], fill=gu.lerp(main, (0, 0, 0), .2), outline=light)
        d.polygon([(cx, cy - 36), (cx + 28, cy - 22), (cx + 24, cy + 14), (cx, cy + 36)], fill=main)
        for k in range(3): d.line([cx + 30 + k * 4, cy - 10 + k * 8, cx + 44 + k * 4, cy - 16 + k * 8], fill=accent, width=2)
    elif card == 'tempestSurge':
        for k in range(36):
            t = k / 36 * 4 * math.pi; r = 4 + k
            d.ellipse([cx + int(r * math.cos(t)) - 2, cy + int(r * math.sin(t)) - 2, cx + int(r * math.cos(t)) + 2, cy + int(r * math.sin(t)) + 2], fill=gu.lerp(main, accent, k / 36))
        d.ellipse([cx - 6, cy - 6, cx + 6, cy + 6], fill=light)
    elif card == 'prismLance':
        d.polygon([(cx - 36, cy + 30), (cx + 34, cy - 34), (cx + 38, cy - 30), (cx - 32, cy + 34)], fill=light)
        d.polygon([(cx + 26, cy - 40), (cx + 44, cy - 22), (cx + 40, cy - 42)], fill=main)
        for k, col in enumerate(((255, 90, 90), (255, 220, 90), (90, 255, 140), (90, 170, 255))):
            d.line([cx - 10 + k * 4, cy + 4 - k * 4, cx - 40 + k * 4, cy + 10 - k * 4], fill=col, width=2)


if __name__ == '__main__':
    gu.CARDS.clear(); gu.CARDS.update(CARDS); gu.emblem = emblem
    for card in CARDS:
        for level in range(4):
            out = os.path.join(gu.ROOT, 'assets', 'cards', 'level%d' % level, card + '.png')
            gu.paint(card, level).save(out, optimize=True)
    print('wrote', len(CARDS) * 4, 'files')
