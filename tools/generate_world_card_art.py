#!/usr/bin/env python3
"""
Round 178: placeholder pixel-art illustrations for each world's own reward cards and the new
mini-boss cards, painted with the pipeline in tools/generate_unique_card_art.py (backdrop;
glow + rune ring at Level 1, orbiting shards at Level 2, rays + gold frame at Level 3).
Output: assets/cards/level<0-3>/<id>.png. Replace any file with hand-made art of the same name.
Usage: python3 tools/generate_world_card_art.py
"""
import math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import generate_unique_card_art as gu

DESERT = ((40, 22, 8), (110, 66, 24))
SKY = ((40, 90, 150), (150, 200, 240))
FOREST = ((10, 30, 14), (34, 80, 40))
STORM = ((14, 14, 40), (44, 40, 96))
BRASS = ((36, 22, 10), (92, 62, 28))
NEON = ((8, 14, 30), (30, 40, 90))
CARDS = {
    # id: (background top, bottom, emblem main, emblem light, accent, motif)
    'sunflare':        (*DESERT, (255, 170, 40), (255, 240, 160), (255, 90, 40), 'sun'),
    'sandVeil':        (*DESERT, (220, 180, 110), (255, 240, 200), (160, 110, 60), 'shield'),
    'scarabSwarm':     (*DESERT, (60, 160, 120), (200, 255, 220), (255, 210, 90), 'scarabs'),
    'oasisDraught':    (*DESERT, (70, 170, 220), (210, 245, 255), (120, 220, 120), 'flask'),
    'solarLance':      (*DESERT, (255, 200, 80), (255, 250, 210), (255, 120, 40), 'lance'),
    'skyfall':         (*SKY, (240, 250, 255), (255, 255, 255), (120, 170, 255), 'feather'),
    'featherguard':    (*SKY, (200, 225, 255), (255, 255, 255), (255, 220, 120), 'shield'),
    'updraft':         (*SKY, (230, 245, 255), (255, 255, 255), (120, 255, 220), 'cloud'),
    'thunderclap':     (*SKY, (255, 240, 120), (255, 255, 230), (160, 140, 255), 'bolt'),
    'cloudburst':      (*SKY, (120, 180, 240), (230, 245, 255), (255, 255, 255), 'wave'),
    'elderRoot':       (*FOREST, (140, 100, 60), (220, 190, 140), (150, 230, 110), 'roots'),
    'sporeCloud':      (*FOREST, (170, 120, 220), (240, 220, 255), (150, 230, 110), 'spores'),
    'briarWall':       (*FOREST, (90, 150, 70), (200, 240, 170), (220, 90, 120), 'shield'),
    'crystalShard':    (*STORM, (170, 200, 255), (245, 250, 255), (130, 255, 240), 'crystal'),
    'crystalWard':     (*STORM, (140, 150, 240), (230, 235, 255), (255, 240, 120), 'shield'),
    'riptide':         (*STORM, (70, 140, 230), (210, 235, 255), (255, 255, 255), 'wave'),
    'squallStep':      (*STORM, (150, 170, 220), (240, 245, 255), (190, 140, 255), 'feather'),
    'cisternAegis':    (*DESERT, (90, 170, 220), (220, 245, 255), (230, 180, 90), 'shield'),
    'noonPeal':        (*DESERT, (240, 190, 90), (255, 245, 200), (255, 255, 255), 'bell'),
    'stormbellToll':   (*SKY, (200, 210, 255), (255, 255, 255), (255, 240, 120), 'bell'),
    'featherfallGrace': (*SKY, (255, 235, 200), (255, 255, 255), (150, 210, 255), 'feather'),
    'gearwardBulwark': (*BRASS, (210, 160, 80), (255, 235, 180), (120, 80, 30), 'gear'),
    'paradoxEdge':     (*BRASS, (230, 190, 110), (255, 245, 210), (130, 220, 255), 'hourglass'),
    # Round 185: the world mechanic cards (Hack, Heat, Tailwind, Growth, Stormcharge).
    'packetSniff':     (*NEON, (95, 242, 224), (220, 255, 250), (255, 80, 200), 'circuit'),
    'logicBomb':       (*NEON, (60, 60, 80), (200, 210, 230), (255, 90, 60), 'bomb'),
    'ghostProtocol':   (*NEON, (130, 200, 255), (235, 250, 255), (95, 242, 224), 'shield'),
    'zeroDay':         (*NEON, (255, 80, 200), (255, 220, 245), (95, 242, 224), 'circuit'),
    'sunstoke':        (*DESERT, (255, 140, 40), (255, 230, 160), (255, 60, 30), 'sun'),
    'scorchingSands':  (*DESERT, (240, 170, 70), (255, 235, 180), (255, 90, 30), 'wave'),
    'heatwave':        (*DESERT, (255, 110, 50), (255, 210, 150), (255, 230, 120), 'wave'),
    'noonBlaze':       (*DESERT, (255, 220, 90), (255, 255, 220), (255, 70, 20), 'sun'),
    'gustChain':       (*SKY, (210, 240, 255), (255, 255, 255), (120, 200, 255), 'swirl'),
    'slipstream':      (*SKY, (180, 225, 255), (255, 255, 255), (160, 255, 230), 'feather'),
    'windWall':        (*SKY, (190, 220, 250), (255, 255, 255), (120, 170, 255), 'shield'),
    'skydive':         (*SKY, (240, 250, 255), (255, 255, 255), (255, 200, 110), 'lance'),
    'saplingStrike':   (*FOREST, (120, 210, 90), (220, 255, 190), (180, 130, 70), 'sprout'),
    'barkskin':        (*FOREST, (130, 95, 55), (210, 180, 130), (140, 220, 100), 'shield'),
    'bloomMend':       (*FOREST, (240, 150, 200), (255, 230, 245), (140, 220, 100), 'sprout'),
    'ancientOak':      (*FOREST, (110, 80, 45), (200, 170, 120), (90, 190, 80), 'roots'),
    'staticCoil':      (*STORM, (190, 160, 255), (245, 235, 255), (130, 255, 240), 'coil'),
    'capacitorSpark':  (*STORM, (255, 240, 120), (255, 255, 230), (190, 150, 255), 'bolt'),
    'thunderhead':     (*STORM, (120, 120, 200), (220, 220, 255), (255, 240, 120), 'cloud'),
    'lightningRod':    (*STORM, (200, 200, 220), (255, 255, 255), (255, 240, 120), 'lance'),
    # Round 206: cards from the Cardbound concept lab (Amplify, Choose one, Follow-through).
    'cinderCapacitor': (*NEON, (255, 150, 60), (255, 230, 170), (95, 242, 224), 'coil'),
    'duskProtocol':    (*NEON, (170, 120, 255), (235, 220, 255), (255, 80, 200), 'circuit'),
    'crystalAegis':    (*FOREST, (120, 230, 220), (230, 255, 250), (140, 220, 100), 'crystal'),
    'tidalDecision':   (*FOREST, (80, 170, 230), (215, 245, 255), (140, 220, 100), 'wave'),
    'wardbreakerStep': (*STORM, (255, 210, 110), (255, 250, 220), (130, 255, 240), 'lance'),
    'afterimageWard':  (*STORM, (170, 160, 255), (240, 235, 255), (255, 210, 110), 'shield'),
}
MOTIF = {k: v[5] for k, v in CARDS.items()}


def emblem(d, card, main, light, accent):
    cx, cy, m = 64, 62, MOTIF[card]
    if m == 'sun':
        for k in range(12):
            a = k * math.pi / 6; d.line([cx + 22 * math.cos(a), cy + 22 * math.sin(a), cx + 38 * math.cos(a), cy + 38 * math.sin(a)], fill=accent, width=4)
        d.ellipse([cx - 20, cy - 20, cx + 20, cy + 20], fill=main, outline=light, width=2); d.ellipse([cx - 8, cy - 10, cx + 4, cy + 2], fill=light)
    elif m == 'shield':
        d.polygon([(cx, cy - 36), (cx + 30, cy - 24), (cx + 26, cy + 12), (cx, cy + 36), (cx - 26, cy + 12), (cx - 30, cy - 24)], fill=main, outline=light)
        d.polygon([(cx, cy - 26), (cx + 18, cy - 18), (cx + 15, cy + 6), (cx, cy + 24)], fill=gu.lerp(main, light, .4))
        d.ellipse([cx - 7, cy - 7, cx + 7, cy + 7], fill=accent)
    elif m == 'scarabs':
        for dx, dy in ((-20, -14), (18, -10), (-2, 16)):
            d.ellipse([cx + dx - 12, cy + dy - 9, cx + dx + 12, cy + dy + 13], fill=main, outline=light)
            d.line([cx + dx, cy + dy - 9, cx + dx, cy + dy + 13], fill=accent, width=2); d.ellipse([cx + dx - 5, cy + dy - 15, cx + dx + 5, cy + dy - 7], fill=accent)
    elif m == 'flask':
        d.rectangle([cx - 6, cy - 36, cx + 6, cy - 18], fill=light); d.ellipse([cx - 26, cy - 22, cx + 26, cy + 32], fill=main, outline=light, width=2)
        d.ellipse([cx - 18, cy - 4, cx + 18, cy + 26], fill=accent); d.ellipse([cx - 14, cy - 14, cx - 4, cy - 4], fill=light)
    elif m == 'lance':
        d.polygon([(cx - 38, cy + 32), (cx + 30, cy - 30), (cx + 36, cy - 24), (cx - 32, cy + 38)], fill=main)
        d.polygon([(cx + 22, cy - 40), (cx + 46, cy - 16), (cx + 44, cy - 42)], fill=light)
        for k in range(4): d.line([cx - 20 + k * 10, cy + 20 - k * 10, cx - 30 + k * 10, cy + 6 - k * 10], fill=accent, width=2)
    elif m == 'feather':
        d.line([cx - 30, cy + 34, cx + 26, cy - 34], fill=light, width=3)
        for k in range(9):
            t = k / 8; px, py = cx - 24 + t * 46, cy + 26 - t * 54
            d.line([px, py, px - 18 + t * 6, py - 4], fill=main, width=4); d.line([px, py, px + 6, py + 16 - t * 6], fill=gu.lerp(main, accent, t), width=4)
    elif m == 'cloud':
        for dx, dy, r in ((-18, 6, 16), (0, -6, 20), (20, 6, 16), (0, 12, 16)): d.ellipse([cx + dx - r, cy + dy - r, cx + dx + r, cy + dy + r], fill=main)
        for k in range(3): d.line([cx - 16 + k * 16, cy + 36, cx - 16 + k * 16, cy + 24], fill=accent, width=3); d.polygon([(cx - 22 + k * 16, cy + 26), (cx - 10 + k * 16, cy + 26), (cx - 16 + k * 16, cy + 18)], fill=accent)
    elif m == 'bolt':
        d.polygon([(cx + 6, cy - 40), (cx - 18, cy + 4), (cx - 2, cy + 4), (cx - 10, cy + 40), (cx + 20, cy - 8), (cx + 4, cy - 8)], fill=main, outline=light)
        for k in range(3): d.arc([cx - 36 + k * 6, cy - 30 + k * 6, cx + 36 - k * 6, cy + 30 - k * 6], 200, 340, fill=accent, width=2)
    elif m == 'wave':
        for k in range(3):
            y = cy - 20 + k * 18
            d.arc([cx - 40, y - 14, cx, y + 14], 180, 360, fill=gu.lerp(main, light, k / 3), width=5); d.arc([cx, y - 14, cx + 40, y + 14], 0, 180, fill=gu.lerp(main, light, k / 3), width=5)
        d.ellipse([cx + 24, cy - 36, cx + 32, cy - 28], fill=accent)
    elif m == 'roots':
        d.rectangle([cx - 8, cy - 34, cx + 8, cy + 10], fill=main)
        for dx in (-30, -14, 14, 30): d.line([cx, cy + 6, cx + dx, cy + 36], fill=main, width=5)
        d.ellipse([cx - 26, cy - 46, cx + 26, cy - 18], fill=accent)
    elif m == 'spores':
        for k in range(14):
            a = k * 2.4; r = 6 + (k * 7) % 30; s = 3 + k % 4
            d.ellipse([cx + r * math.cos(a) - s, cy + r * math.sin(a) - s, cx + r * math.cos(a) + s, cy + r * math.sin(a) + s], fill=[main, light, accent][k % 3])
    elif m == 'crystal':
        d.polygon([(cx, cy - 40), (cx + 20, cy - 8), (cx + 8, cy + 36), (cx - 8, cy + 36), (cx - 20, cy - 8)], fill=main, outline=light)
        d.polygon([(cx, cy - 40), (cx + 20, cy - 8), (cx, cy)], fill=light); d.line([cx, cy, cx, cy + 36], fill=accent, width=2)
    elif m == 'gear':
        for k in range(10):
            a = k * math.pi / 5; d.rectangle([cx + 30 * math.cos(a) - 7, cy + 30 * math.sin(a) - 7, cx + 30 * math.cos(a) + 7, cy + 30 * math.sin(a) + 7], fill=main)
        d.ellipse([cx - 30, cy - 30, cx + 30, cy + 30], fill=main, outline=light, width=2); d.ellipse([cx - 11, cy - 11, cx + 11, cy + 11], fill=accent)
    elif m == 'hourglass':
        d.rectangle([cx - 26, cy - 38, cx + 26, cy - 32], fill=light); d.rectangle([cx - 26, cy + 32, cx + 26, cy + 38], fill=light)
        d.polygon([(cx - 20, cy - 32), (cx + 20, cy - 32), (cx + 3, cy), (cx + 20, cy + 32), (cx - 20, cy + 32), (cx - 3, cy)], fill=main, outline=light)
        d.polygon([(cx - 12, cy + 30), (cx + 12, cy + 30), (cx, cy + 14)], fill=accent); d.line([cx, cy, cx, cy + 14], fill=accent, width=2)
    elif m == 'circuit':
        for k in range(5):
            y = cy - 32 + k * 16; d.line([cx - 38, y, cx - 8 + (k % 2) * 16, y], fill=main, width=3); d.line([cx - 8 + (k % 2) * 16, y, cx + 10, cy], fill=main, width=3)
            d.ellipse([cx - 42, y - 4, cx - 34, y + 4], fill=accent)
        d.rectangle([cx + 6, cy - 16, cx + 38, cy + 16], fill=gu.lerp(main, (0, 0, 0), .5), outline=light, width=2); d.rectangle([cx + 16, cy - 6, cx + 28, cy + 6], fill=accent)
    elif m == 'bomb':
        d.ellipse([cx - 28, cy - 18, cx + 28, cy + 38], fill=main, outline=light, width=2); d.rectangle([cx - 6, cy - 26, cx + 6, cy - 16], fill=light)
        d.line([cx, cy - 26, cx + 14, cy - 40], fill=light, width=3); d.ellipse([cx + 10, cy - 46, cx + 22, cy - 34], fill=accent); d.ellipse([cx - 16, cy - 6, cx - 4, cy + 6], fill=light)
    elif m == 'swirl':
        for k in range(4): d.arc([cx - 40 + k * 9, cy - 34 + k * 8, cx + 40 - k * 9, cy + 34 - k * 8], 20 + k * 40, 300 + k * 40, fill=gu.lerp(main, accent, k / 3), width=5)
    elif m == 'sprout':
        d.rectangle([cx - 3, cy - 10, cx + 3, cy + 36], fill=accent)
        d.ellipse([cx - 34, cy - 30, cx, cy - 2], fill=main, outline=light); d.ellipse([cx, cy - 40, cx + 34, cy - 10], fill=main, outline=light)
        d.ellipse([cx - 30, cy + 28, cx + 30, cy + 40], fill=gu.lerp(accent, (0, 0, 0), .4))
    elif m == 'coil':
        for k in range(6): d.ellipse([cx - 22, cy - 36 + k * 11, cx + 22, cy - 24 + k * 11], outline=gu.lerp(main, light, k / 5), width=4)
        d.line([cx - 30, cy + 34, cx + 30, cy - 38], fill=accent, width=2)
    elif m == 'bell':
        d.polygon([(cx - 8, cy - 34), (cx + 8, cy - 34), (cx + 26, cy + 18), (cx - 26, cy + 18)], fill=main, outline=light)
        d.rectangle([cx - 30, cy + 16, cx + 30, cy + 22], fill=light); d.ellipse([cx - 6, cy + 22, cx + 6, cy + 34], fill=accent)
        for k in range(2): d.arc([cx - 46 - k * 6, cy - 20 - k * 6, cx + 46 + k * 6, cy + 30 + k * 6], 300, 60, fill=accent, width=2)


if __name__ == '__main__':
    gu.CARDS.clear(); gu.CARDS.update({k: v[:5] for k, v in CARDS.items()}); gu.emblem = emblem
    # Painting is not deterministic, so only missing files are written (--force repaints them all).
    force, n = '--force' in sys.argv, 0
    for card in CARDS:
        for level in range(4):
            out = os.path.join(gu.ROOT, 'assets', 'cards', 'level%d' % level, card + '.png')
            if force or not os.path.exists(out): gu.paint(card, level).save(out, optimize=True); n += 1
    print('wrote', n, 'files')
