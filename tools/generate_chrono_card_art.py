#!/usr/bin/env python3
"""
Pixel-art illustrations for the Round 77 Chronospire (Suspend) cards, painted
with the same pipeline as tools/generate_unique_card_art.py. Brass-and-amber
palette with clock, hourglass and gear emblems.
Output: assets/cards/level<0-3>/<id>.png. Usage: python3 tools/generate_chrono_card_art.py
"""
import math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import generate_unique_card_art as gu

CARDS = {
    'temporalBarrage': ((30, 18, 6), (84, 52, 14), (240, 180, 70), (255, 240, 200), (255, 110, 60)),
    'delayedBulwark':  ((20, 18, 12), (66, 56, 34), (200, 170, 110), (250, 235, 190), (120, 200, 255)),
    'clockworkVolley': ((22, 16, 8), (70, 50, 22), (210, 160, 80), (255, 230, 170), (255, 210, 90)),
    'futureSight':     ((14, 12, 30), (44, 36, 80), (190, 170, 255), (245, 240, 255), (255, 210, 120)),
    'rewindMend':      ((10, 24, 18), (30, 70, 50), (140, 220, 170), (230, 255, 240), (255, 210, 120)),
    'chronoSpike':     ((26, 14, 8), (76, 40, 18), (230, 150, 70), (255, 225, 180), (180, 220, 255)),
    'accelerate':      ((24, 20, 6), (80, 66, 16), (250, 210, 80), (255, 250, 210), (255, 140, 60)),
}


def clock(d, cx, cy, r, main, light, accent, hand_a=-1.0, hand_b=.6):
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=gu.lerp(main, (0, 0, 0), .35), outline=light, width=3)
    for k in range(12):
        a = k * math.pi / 6
        x1, y1 = cx + int((r - 3) * math.cos(a)), cy + int((r - 3) * math.sin(a))
        x2, y2 = cx + int((r - 8) * math.cos(a)), cy + int((r - 8) * math.sin(a))
        d.line([(x1, y1), (x2, y2)], fill=light, width=2)
    d.line([(cx, cy), (cx + int(r * .55 * math.cos(hand_a)), cy + int(r * .55 * math.sin(hand_a)))], fill=accent, width=3)
    d.line([(cx, cy), (cx + int(r * .8 * math.cos(hand_b)), cy + int(r * .8 * math.sin(hand_b)))], fill=light, width=2)
    d.ellipse([cx - 3, cy - 3, cx + 3, cy + 3], fill=accent)


def gear(d, cx, cy, r, color, outline, teeth=8):
    pts = []
    for k in range(teeth * 2):
        a = k * math.pi / teeth
        rr = r if k % 2 == 0 else r - 6
        pts.append((cx + int(rr * math.cos(a)), cy + int(rr * math.sin(a))))
    d.polygon(pts, fill=color, outline=outline)
    d.ellipse([cx - r // 3, cy - r // 3, cx + r // 3, cy + r // 3], fill=gu.lerp(color, (0, 0, 0), .5))


def hourglass(d, cx, cy, h, main, light, accent):
    d.rectangle([cx - h // 2, cy - h, cx + h // 2, cy - h + 5], fill=light)
    d.rectangle([cx - h // 2, cy + h - 5, cx + h // 2, cy + h], fill=light)
    d.polygon([(cx - h // 2 + 4, cy - h + 5), (cx + h // 2 - 4, cy - h + 5), (cx + 3, cy), (cx - 3, cy)], fill=gu.lerp(main, (0, 0, 0), .4), outline=light)
    d.polygon([(cx - 3, cy), (cx + 3, cy), (cx + h // 2 - 4, cy + h - 5), (cx - h // 2 + 4, cy + h - 5)], fill=gu.lerp(main, (0, 0, 0), .4), outline=light)
    d.polygon([(cx - h // 2 + 8, cy + h - 6), (cx + h // 2 - 8, cy + h - 6), (cx, cy + h // 2)], fill=accent)
    d.line([(cx, cy), (cx, cy + h // 2)], fill=accent, width=2)


def emblem(d, card, main, light, accent):
    cx, cy = 64, 62
    if card == 'temporalBarrage':
        clock(d, cx, cy, 30, main, light, accent)
        for k in range(5):
            a = -2.4 + k * .35
            d.line([(cx + int(34 * math.cos(a)), cy + int(34 * math.sin(a))), (cx + int(52 * math.cos(a)), cy + int(52 * math.sin(a)))], fill=accent, width=3)
    elif card == 'delayedBulwark':
        d.polygon([(cx, cy - 36), (cx + 30, cy - 24), (cx + 26, cy + 14), (cx, cy + 36), (cx - 26, cy + 14), (cx - 30, cy - 24)], fill=main, outline=light)
        clock(d, cx, cy - 2, 16, gu.lerp(main, (255, 255, 255), .2), light, accent, -1.57, 0)
    elif card == 'clockworkVolley':
        gear(d, cx - 10, cy + 6, 22, main, light)
        gear(d, cx + 22, cy - 18, 14, gu.lerp(main, light, .3), light, 6)
        for k in range(3): d.ellipse([cx + 4 + k * 12, cy + 18 - k * 14, cx + 12 + k * 12, cy + 26 - k * 14], fill=accent)
    elif card == 'futureSight':
        d.ellipse([cx - 34, cy - 18, cx + 34, cy + 18], fill=light, outline=main, width=2)
        d.ellipse([cx - 14, cy - 14, cx + 14, cy + 14], fill=main)
        clock(d, cx, cy, 10, (40, 30, 70), light, accent, -1.57, .3)
    elif card == 'rewindMend':
        for k in range(28):
            a = -math.pi * .2 + k * math.pi * 1.6 / 28
            d.ellipse([cx + int(30 * math.cos(a)) - 3, cy + int(30 * math.sin(a)) - 3, cx + int(30 * math.cos(a)) + 3, cy + int(30 * math.sin(a)) + 3], fill=gu.lerp(main, light, k / 28))
        d.polygon([(cx + 28, cy - 22), (cx + 40, cy - 8), (cx + 22, cy - 6)], fill=light)
        d.rectangle([cx - 4, cy - 14, cx + 4, cy + 14], fill=accent); d.rectangle([cx - 14, cy - 4, cx + 14, cy + 4], fill=accent)
    elif card == 'chronoSpike':
        hourglass(d, cx - 14, cy, 24, main, light, accent)
        d.polygon([(cx + 4, cy + 26), (cx + 40, cy - 30), (cx + 44, cy - 26), (cx + 8, cy + 30)], fill=light)
        d.polygon([(cx + 34, cy - 38), (cx + 50, cy - 22), (cx + 48, cy - 40)], fill=accent)
    elif card == 'accelerate':
        for k in range(2):
            ox = cx - 22 + k * 24
            d.polygon([(ox - 10, cy - 24), (ox + 18, cy), (ox - 10, cy + 24)], fill=[main, light][k], outline=accent)
        for k in range(4): d.line([(cx - 46, cy - 12 + k * 8), (cx - 34, cy - 12 + k * 8)], fill=accent, width=2)


if __name__ == '__main__':
    gu.CARDS.clear(); gu.CARDS.update(CARDS); gu.emblem = emblem
    for card in CARDS:
        for level in range(4):
            out = os.path.join(gu.ROOT, 'assets', 'cards', 'level%d' % level, card + '.png')
            gu.paint(card, level).save(out, optimize=True)
    print('wrote', len(CARDS) * 4, 'files')
