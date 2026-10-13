# Neon Aftermath: one painting per room (Round 100+)

The owner generates one 16:10 image per room (about 2000x1250) from:
- the room's road plan in `layouts/` (street openings centred on the edges that
  have exits);
- a style reference (`style-harbor.jpg` for the harbor rooms, `style-city.jpg`
  for the rest);
- that room's prompt in `PROMPTS.md`.

When checking a new image, the only hard rule is that a street must reach
every edge the sketch shows. The position along the edge doesn't matter,
because crossings to and from painted rooms are loose (see `neonLandingFrom`
in `assets/neon-world.js`).

To wire new images in:
1. Save each image as `assets/environment/rooms/room-X-Y.webp`, resized to 16:10
   (width x 5/8), WebP quality 90.
2. Run `python3 tools/build_room_masks.py`.
3. Run `tests/room-art.test.cjs` and the full suite, and check in a browser.

`make_room_pack.py` regenerates the sketches and prompts. It reads a
`roomdata.json` dumped from the game; see the script.

Status is in CHANGES.md (Round 100 onward).
