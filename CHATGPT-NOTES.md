# Notes for ChatGPT / Codex (from Claude)

Claude keeps this file. It lists what went wrong in earlier hand-offs and how to avoid it next time. Newest first. The owner
asked for it (Round 538): ChatGPT/Codex fixes sprite animations and art; Claude handles everything non-graphical.

## Wearable gear: how to hand over any item the hero wears (Round 555; read this before boots or any new item)

The belt went in (Round 554, your PR #318: good work: right size and grid, outline kept exactly, all 36 frames, clean
alpha). To make every next item quick, there is now **one process for all wearable gear**:
**`tools/art-refresh/wearable-gear.md`**. Read it before making the boots. In short:

- For each look deliver, in `tools/art-refresh/wearable/<look>/` (a pull request; no game code, nothing under `assets/`, no
  round number):
  1. **`overlay.png`**: the item only, 2304 x 1024 RGBA on the hero's grid (rows down, left, right, up; nine 256px cells),
     transparent elsewhere, in all 36 frames, inside the hero's outline (soft edge only), holes where a hand or arm passes in
     front, the Aetherlink on his left arm never covered, each direction drawn for itself;
  2. **`cleaned.png`** only if old clothing must go: the **original** `protagonist-walk9.png` with **only this slot's** old
     clothing painted out, alpha identical to the original. Always start from the original sheet, never from the belt's
     cleaned sheet: Claude's tool keeps only the pixels you changed, so the belt and boots stack;
  3. **`README.md`**: look name (`cyber-boots`), slot (`boots`), the gear item ids it is for (from `assets/gear.js`), and whether
     `cleaned.png` is included.
- Claude runs `tools/wearable_add.py`, which checks all of that, files the art, writes the game's registry and makes proof
  strips. If it refuses, Claude will tell you exactly what failed.
- The boots: the boot items in `assets/gear.js` are the ids with `slot: 'boots'`. Say in the README which of them show your
  design (they may all share one).

## Art request: the equipped belt (Nov 24; done in Round 554, superseded by the process above)

Thanks for the handoff: the behaviour notes are clear and Claude will follow them. The game side is simple: the worn belt is
`state.gear.belt`, and the map hero is one sprite sheet drawn as a CSS background. When a belt is worn, Claude draws the hero
sheet and then a belt sheet on top, once per equip, and shows the result. What's missing is the belt sheet itself. Please
deliver exactly this:

**1. `belt-overlay.png`: the belt only, on the hero's grid**
- PNG, RGBA, **2304 x 1024 px**, the same size as `assets/characters/protagonist-walk9.png`.
- The same grid: **4 rows x 9 columns of 256 x 256 cells**. Rows from top: **0 facing down (front), 1 facing left, 2
  facing right, 3 facing up (back)**. Column 0 is standing; columns 1-8 are the walk.
- Each cell holds only that frame's belt, at the exact pixel position of the hero's waist in the same cell of
  `protagonist-walk9.png`. Lay it over the original sheet in an image editor at 100% and step through all 36 cells: the belt
  must sit on the hips in every frame and move with them.
- Everything that isn't belt is **fully transparent** (alpha 0): no background, no shadow, no glow, no red, green or magenta
  fringe on the edges.
- Where the hero's hand or arm passes in front of the belt, the belt has a hole there (no belt pixels over the hand).
- Front view: the buckle at the front. Back view: the back strap. Left and right are each drawn for their own direction:
  don't flip one to make the other.
- Don't move, crop, recentre or scale anything inside a cell. Don't change the hero.

**2. The old brown belt and pouch (pick one)**
- The brown belt and pouch are painted into the hero sheet. Either make the new belt **cover them completely in all 36
  frames**,
- or deliver **`protagonist-walk9-nobelt.png`**: the same sheet, same size and grid, identical except the brown belt and pouch
  are painted out (filled with his shirt or trousers as they'd look under it). Claude uses it only while a belt is worn; with no
  belt the original stays.

**3. Proof before handing over**
- One PNG per row: the original sheet with `belt-overlay.png` laid over it (over the no-belt sheet if you made one), all 9
  frames, shown at 256px and at the game's size (84px a frame).
- Tell Claude which option you took in step 2.

Claude then handles the rest: belt pictures by item (all three belts, `scarabBelt`, `stormglassBelt` and `hourglassBelt`,
share this one until there are more designs), equip, swap and unequip, save and load, world changes, a fallback if the
picture fails to load, and the checks in your acceptance list.

**One process note:** commit 54b04fc was pushed straight to `main` as "Round 551" while Claude's Round 551 (Elaris on the
generator, now Round 552) was open on a branch. Before numbering a round, check the latest `## Round` in `CHANGES.md` on `main` **and** any
open pull request; when in doubt, hand the work to Claude to log.

## Art request: city landmarks at a higher resolution (Round 541; done in Round 543, the owner generated them)

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
