#!/usr/bin/env python3
"""
Generates placeholder card art: one image per (card id, level) pair.
Run again any time a card is added — existing files are skipped unless
--force is passed, so re-running after adding one new card only fills the
gap instead of regenerating everything.

Output: assets/cards/level<level>/<id>.png  (e.g. assets/cards/level0/strike.png)
Replace any of these with real art using the exact same filename and the
game will pick it up automatically — no code changes needed.
"""
import os, sys, json, subprocess
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, 'assets', 'cards')
W, H = 420, 220
FORCE = '--force' in sys.argv

FONT_BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
FONT_REG = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'

# id -> (short ASCII tag, base color, accent color)
# Colors are chosen to loosely match each card's theme/element so the
# placeholders are at least visually sortable at a glance before real art
# lands.
STYLE = {
    'strike':        ('STR', (120, 40, 40),   (230, 120, 90)),
    'guard':         ('GRD', (35, 70, 110),   (140, 190, 230)),
    'focus':         ('FOC', (80, 50, 120),   (190, 150, 230)),
    'cleave':        ('CLV', (140, 35, 35),   (255, 140, 70)),
    'riposte':       ('RIP', (110, 60, 30),   (230, 170, 90)),
    'bastion':       ('BAS', (30, 60, 100),   (150, 210, 255)),
    'mend':          ('MND', (30, 100, 60),   (140, 230, 160)),
    'spark':         ('SPK', (100, 90, 20),   (255, 230, 120)),
    'shatter':       ('SHT', (90, 90, 100),   (220, 220, 235)),
    'phoenix':       ('PHX', (120, 60, 10),   (255, 180, 60)),
    'oath':          ('OTH', (70, 55, 110),   (215, 190, 255)),
    'verdict':       ('VRD', (100, 80, 20),   (255, 220, 130)),
    'glacial':       ('GLC', (20, 70, 110),   (170, 225, 255)),
    'cinder':        ('CIN', (140, 50, 20),   (255, 140, 60)),
    'venom':         ('VEN', (40, 90, 30),    (150, 230, 90)),
    'gale':          ('GAL', (30, 100, 100),  (170, 240, 240)),
    'counter':       ('CTR', (30, 90, 100),   (160, 230, 235)),
    'counter_fire':  ('C-F', (140, 50, 20),   (255, 150, 70)),
    'counter_water': ('C-W', (20, 70, 120),   (140, 200, 255)),
    'counter_earth': ('C-E', (60, 90, 30),    (190, 230, 130)),
    'counter_air':   ('C-A', (30, 100, 100),  (170, 240, 240)),
    'stormglass':    ('STM', (70, 30, 110),   (220, 190, 255)),
}

LEVEL_RING = [(120,120,120), (170,200,120), (120,170,220), (230,190,90)]  # 0..3

def font(path, size):
    return ImageFont.truetype(path, size)

def draw_card(cid, level, name, kind, cost, soulbound):
    tag, base, accent = STYLE.get(cid, (cid[:3].upper(), (70,70,70), (200,200,200)))
    img = Image.new('RGB', (W, H), base)
    d = ImageDraw.Draw(img)

    # diagonal gradient-ish texture via translucent bands (cheap, no numpy needed)
    for i in range(0, W + H, 14):
        shade = 14 if (i // 14) % 2 == 0 else 0
        d.line([(i, 0), (0, i)], fill=tuple(min(255, c + shade) for c in base), width=7)

    # level ring border
    ring = LEVEL_RING[level]
    d.rectangle([4, 4, W-5, H-5], outline=ring, width=6)
    if soulbound:
        d.rectangle([12, 12, W-13, H-13], outline=(230, 210, 255), width=2)

    # big ASCII tag
    f_tag = font(FONT_BOLD, 78)
    bbox = d.textbbox((0,0), tag, font=f_tag)
    tw, th = bbox[2]-bbox[0], bbox[3]-bbox[1]
    d.text(((W-tw)/2, 34-bbox[1]), tag, font=f_tag, fill=accent)

    # card name
    f_name = font(FONT_BOLD, 26)
    bbox = d.textbbox((0,0), name, font=f_name)
    tw = bbox[2]-bbox[0]
    if tw > W - 24:
        f_name = font(FONT_BOLD, 20)
        bbox = d.textbbox((0,0), name, font=f_name)
        tw = bbox[2]-bbox[0]
    d.text(((W-tw)/2, 130), name, font=f_name, fill=(255,255,255))

    # kind / cost / level footer
    f_small = font(FONT_REG, 15)
    already_says_soulbound = 'soulbound' in kind.lower()
    footer = f'{kind.upper()}  ·  COST {cost}  ·  LV{level}' + ('  ·  SOULBOUND' if soulbound and not already_says_soulbound else '')
    bbox = d.textbbox((0,0), footer, font=f_small)
    tw = bbox[2]-bbox[0]
    d.text(((W-tw)/2, 168), footer, font=f_small, fill=(225,225,225))

    # id label in the corner, so it's obvious which file this is even out of context
    f_id = font(FONT_REG, 12)
    d.text((10, H-22), cid, font=f_id, fill=(255,255,255))
    d.text((10, H-22), cid, font=f_id, fill=(0,0,0))  # cheap outline via double-draw offset
    d.text((9, H-23), cid, font=f_id, fill=(255,255,255))

    # placeholder watermark
    f_ph = font(FONT_REG, 12)
    ph = 'PLACEHOLDER — replace this file'
    bbox = d.textbbox((0,0), ph, font=f_ph)
    tw = bbox[2]-bbox[0]
    d.text((W-tw-10, H-22), ph, font=f_ph, fill=(255,255,255,))

    return img

def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for level in range(4):
        os.makedirs(os.path.join(OUT_DIR, f'level{level}'), exist_ok=True)
    # Pull the authoritative card list straight from the real game code
    # rather than hand-maintaining a duplicate list here.
    script_dir = os.path.dirname(os.path.abspath(__file__))
    harness = os.path.join(script_dir, '_dump_defs.cjs')
    with open(harness, 'w') as f:
        f.write("""
const {run}=require('../tests/expansion.test.cjs');
run(`
newGame();
const out=Object.entries(defs).map(([id,d])=>({id,name:d.name,kind:d.kind,cost:d.cost,soulbound:!!d.soulbound}));
console.log(JSON.stringify(out));
`);
""")
    result = subprocess.run(['node', harness], cwd=script_dir, capture_output=True, text=True)
    os.remove(harness)
    if result.returncode != 0:
        print(result.stdout, result.stderr, file=sys.stderr)
        sys.exit(1)
    cards = json.loads(result.stdout.strip().splitlines()[-1])

    made, skipped = 0, 0
    for c in cards:
        for level in range(4):
            path = os.path.join(OUT_DIR, f'level{level}', f"{c['id']}.png")
            if os.path.exists(path) and not FORCE:
                skipped += 1
                continue
            img = draw_card(c['id'], level, c['name'], c['kind'], c['cost'], c['soulbound'])
            img.save(path)
            made += 1
    print(f'Generated {made} placeholder(s), skipped {skipped} existing file(s), in {OUT_DIR}')
    print(f'Total cards: {len(cards)} x 4 levels = {len(cards)*4} images expected')

if __name__ == '__main__':
    main()
