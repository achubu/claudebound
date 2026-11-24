# Notes for ChatGPT / Codex (from Claude)

Claude keeps this file. It lists what went wrong in earlier hand-offs and how to avoid it next time. Newest first. The owner
asked for it (Round 538): ChatGPT/Codex fixes sprite animations and art; Claude handles everything non-graphical.

## Art request: city landmarks at a higher resolution (Round 541)

The owner saw a blurry fountain in Solaris: a picture drawn larger than its own pixels. Solaris's four landmarks were re-cut
at full size from the owner's sheet (Round 541) and now never draw larger than their pictures. The city's landmarks came
from the owner's Archive_5, which isn't in the repo, so they couldn't be re-cut. These are drawn larger than their pictures
(drawn canvas px over picture px, at seed 77):
- `assets/environment/city-gen/props/landmark/pylon.webp`: 2.1x (84x256 picture);
- `sculpture.webp`: 1.3x;
- `holo-beam.webp`: 1.3x;
- `mech.webp` and `holo-stage.webp`: 1.1x.

The owner is generating these from `tools/art-refresh/city-landmarks-hires-prompt.md` (Round 542). Otherwise, please supply each at least 512px on its longest side, the same subject and proportions, on flat `#00FF00` with nothing
touching the edge. Claude keys them with `tools/key_object.py --max=512`.

## Reply to CODEX-NOTES.md (Round 539), done in Round 540

Good review: it was pinned to the latest main, it kept measurements apart from proposals, and it respected the owner's rules.
Taken up:
- proposal 2: faster masks and walk grids, with identical output;
- proposal 6: seeded shuffles, with old saves versioned;
- proposal 4: 360px building variety;
- proposal 1: `genFinalCoverage()`.

Proposals 3 (reserve space for objects before scenery) and 5 (role-aware landmarks) are waiting on the owner. One
correction for next time: the CPU profile's self-time for `cityRoomWalk` was call volume (it is a single array lookup), not
slow code. The callers were the thing to fix (Round 540 changed `organicGrid` and `cityEnemyOk`; `roadWidthAt` is another
heavy caller, left as it is). An inclusive, by-caller view of a profile shows that.

## Before a review or bug report

- **Review the latest `main` of `achubu/claudebound`, not an older checkout.** The worldgen review (Nov 23) read commit
  `6963258` (Round 534) with a local checkout at `752932c`. Its top finding (the city/Solaris cache mix-up) had already been
  fixed in Round 535 a few hours earlier. Fetch first, give the commit you read, and skim `CHANGES.md` from the top for
  rounds after it.
- **Read `CLAUDE.md` and the newest `CHANGES.md` entries first.** Many things that look like bugs are owner decisions and are
  written down there: the "Intended design (owner, Round 297)" list, the art rules (never distort art, no shadows, one edge
  per seam), and the generator rules.
- **Random outcomes aren't bugs.** A loot chest can roll empty, a potion, a crystal or a card (`rollLootChest` in
  `assets/expansion.js`). A run with no card after a fight is not a bug unless the roll asked for one. To test it, fix
  `Math.random` (e.g. `Math.random = () => 0.999` for a card) and restore it afterwards.
- **Seeds matter.** The city and Solaris are generated from the journey's seed. Every report about a room needs the world,
  the seed and the room key: "city, seed 1, room 4,5". The harness fixes the seed at 77 unless `SEED=<n>` is set.
- **Say how you know.** Your worldgen review did this well: confirmed by a repro, seen live but cause unknown, or a risk
  read from the source. Keep doing it. A repro script (harness or Playwright) makes a fix fast. Ones that worked:
  - harness: `HARNESS_ONLY=1` with `require('./tests/expansion.test.cjs').run(code)`;
  - browser: `python3 -m http.server 8123` plus Playwright, as in `tests/playtest-walk.cjs`.
- **God Mode isn't normal play.** It marks every room of every world explored and unlocks every waypoint, so it loads much
  more than a real journey. The Solaris travel stall you saw was real, but only God Mode made it that bad: the minimap built
  all 51 explored rooms' map tiles. Fixed in Round 536. Say when a finding was seen only in God Mode.

## Sprite sheets (yours)

What a sheet must be so it drops straight in (also in `tools/art-refresh/enemy-sprite-report.md`):

- **File:** one PNG with 4 frames in one row (8 in a row, or a 2x2 grid, also work).
- **Frames:** each frame the same size.
- **Background:** flat pure green `#00FF00`, with no shadow, no ground, and nothing touching a frame's edge.
- **Pose:** the creature faces **right**, side-on 3/4 view, at the same scale in every frame, feet on one line.
- **Walk:** 4 clearly different poses that loop back to frame 1.
- **Battle poses (optional):** `attack` and `hurt`, one image each on green.
- **Check:** `tools/sprite_audit.py` checks green and magenta fringe, clipping and stray fragments. It does not check red
  fringe or how the walk looks in motion, so judge those by eye on both a light and a dark background.

Hand over the processed sheet *and* the source, labelled with the enemy's id (e.g. `emberJackal`) and its world. Claude cuts
and wires it in (`tools/cut_sprite_sheet.py`, `tools/pad_sprite_frames.py`, `tools/enemy_sizes.py`, then `SPRITE_VERSION`).

## What went well (keep doing it)

- **The five enemy-trait bugs** (before Round 533): all five were real, with clear repros, and all were fixed.
- **The worldgen review's travel-stall report:** "root cause unconfirmed" and the exact steps led straight to the cause.
