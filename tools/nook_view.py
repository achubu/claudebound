#!/usr/bin/env python3
# Round 339: draw a Neon Aftermath room's painting with its final walk mask (cyan) and nook footpaths (red) on top.
# Usage: python3 tools/nook_view.py 1,6 x0,y0,x1,y1 out.png   (crop box in room px; output is the crop at 2x)
import sys
sys.path.insert(0, 'tools')
import build_room_masks as b
import numpy as np
from PIL import Image, ImageDraw
key = sys.argv[1]; crop = tuple(int(v) for v in sys.argv[2].split(',')); out = sys.argv[3]
cx, cy = key.split(','); exits = b.room_exits()[key]
t = b.trace(f'assets/environment/rooms/room-{cx}-{cy}.webp')
road = b.keep_exits(b.room_fixes(key, t, b.fill_road_objects(b.extend_to_edges(b.axis_bridges(t), exits))), exits)
nk = b.nook_paths(key, road); print('exits', exits, 'nooks', nk)
im = Image.open(f'assets/environment/rooms/room-{cx}-{cy}.webp').convert('RGB').resize((800, 500))
im.paste((0, 255, 255), mask=Image.fromarray((road * 80).astype(np.uint8)))
d = ImageDraw.Draw(im)
for x, y, ax, ay, ex, ey in nk: d.line((ax, ay, ex, ey), fill=(255, 0, 0), width=4); d.ellipse((x - 6, y - 6, x + 6, y + 6), outline=(255, 255, 0), width=2)
for g in range(0, 800, 50): d.line((g, 0, g, 500), fill=(255, 255, 255) if g % 100 == 0 else (80, 80, 80))
for g in range(0, 500, 50): d.line((0, g, 800, g), fill=(255, 255, 255) if g % 100 == 0 else (80, 80, 80))
c = im.crop(crop); c.resize((c.width * 2, c.height * 2)).save(out)
