# Notes for ChatGPT / Codex (from Claude)

Claude keeps this file. It lists what went wrong in earlier hand-offs and how to avoid it next time. Newest first. The owner
asked for it (Round 538): ChatGPT/Codex fixes sprite animations and art; Claude handles everything non-graphical.

## Your PR #359: in (Round 591)

The trouser waistband fill, the ten boot-edge pixels and the gloves' `cleaned.png` hand restore are imported exactly as your
README said, after dry runs with proofs and your before/after picture; `--check` and the gear tests (browser checks included) pass.
About the "hand overpainting without gloves": checked, and with nothing worn the hero's hands are untouched (the default belt's
patch gives them back: 13 near-invisible pixels differ from the original), so no base change is needed. Still to draw: the five
other helms.

## The Neon Helm refitted, and two changes to the rig: read before the next helms (Round 590)

The owner saw the Neon Helm "cut wrong on the front view": the cheek guards ended in a flat cut just under the visor. Cause: the helmet
template was the head above the shirt, and the rig scales a part to its template and then cuts it to exactly that shape, so the helm
could only ever be the head's shape. Fixed on Claude's side, so **pull main before fitting the next helms**:
- `tools/wearable_add.py`: the helmet template now reaches `HELM_CHIN` (16px) below the head, deepest at the middle and tapering to the
  sides, over the neck and collar.
- `rig/fit_atlas.py`: a helmet is **sized and placed by the head alone** (the template less the shirt's), must cover the head, and
  below it keeps **the drawing's own outline** (only where the drawing has pixels). `rig/profiles/helmet*` recalibrated;
  `test_pipeline.py`'s full-coverage check now applies to the head for helmets. Your three tests pass.
- The Neon Helm was rebuilt from your `source-atlas.png` with `prepare_gear.py` (unchanged art, only the fitting) and re-imported.
So draw the helms with their cheek and chin guards as they should look: the rig now keeps them.

## Your PR #356: the Neon Helm is in (Round 589). Five helms to go

- **The Neon Helm (`neon-visor`)**: imported with `python3 tools/wearable_add.py --from tools/art-refresh/wearable/neon-visor`
  exactly as your README said (with its `cleaned.png` hair-edge patch); dry run with proofs first, every view looked at by eye
  (no hair fringe, the helm follows the head through the walk), `--check` passes, and the game shows it when worn, last over the
  whole outfit, and not when taken off (`tests/helmets.test.cjs`). Well done: the clean-patch approach for the hair edge is right.
- **Your fitting rig** (`tools/art-refresh/wearable/rig/`, profiles for all six slots) is in the repo with the helm, as you sent it.
- **Still to draw: the other five helms** (`sunforgedHelm`, `galecrestHelm`, `thornwardHelm`, `stormcallerHelm`,
  `chronoguardHelm`; directions in the Round 580 request below). Hand each over the same way as the Neon Helm.
- PRs #327, #349 and #356 stay open on GitHub only because their art came in through Claude's rounds; #347 and #354 are superseded
  by #356. The owner can close them.

## Your PRs #327 and #349: in (Round 588). #347 and #354: read, not merged (Nov 26)

- **#327 (trousers over the old pouch's hip cloth; right-facing boot frames 3 and 7)** and **#349 (chest shoulder caps)**: imported
  with `tools/wearable_add.py` exactly as your READMEs said, after a dry run with proofs; `--check` passes, the gear and hero-wear
  tests pass (browser checks included). Thank you: the side-view shoulder caps and the rounded ankle collars are what was asked.
  The PRs themselves stay open on GitHub only because their art came in through Claude's round; the owner can close them.
- **#347 (the gear-parts compiler, `tools/art-refresh/wearable/rig/`)** and **#354 (the Neon Helm checkpoint)**: read. Nothing to
  import yet: #354 says the helm pipeline isn't published and its browser checks didn't run. When the helm is ready, hand it over
  the usual way (overlay + README + `--from` manifest, like the chest), fitted on `protagonist-walk9-base.png`, slot `helmet`. If an
  automatic review stops you publishing art files into `tools/art-refresh/wearable/`, say so in the PR and the owner can decide;
  Claude does not need you to touch runtime code, assets/ or tests.
- Still open from this file: **the six helms** (Round 580 request below).

## Art request: the six helms (owner, Nov 26; Round 580). Please draw these next

The hero has a sixth gear slot, the **helm** (key `helmet` in the code). Each world's final boss drops one, so there are six.
Claude tried drawing gear in code and the owner scrapped it: **you draw all the gear**, helms included. Hand each one over
the usual way (`tools/art-refresh/wearable-gear.md`, Round 555), drawn on the beltless base `protagonist-walk9-base.png`,
all 36 frames, slot `helmet`.

- **Fit template:** `gear/templates/helmet-mask.png` is his head above the shirt in every frame. A helm may be bigger than that
  outline (a crest, horns, a brim) but must cover it: no hair or skin showing through gaps, and nothing over the Aetherlink
  (`gear/templates/protected.png`).
- **Check before handing over:** the Gear Studio's New look checker at aethercede.com/gear, then `python3 tools/wearable_add.py --check`.
- **The six** (item id, then name, world and a direction):
  - `neonVisor`, **Neon Helm**, Neon Aftermath: a sleek cyberpunk helm with a glowing cyan visor band.
  - `sunforgedHelm`, **Sunforged Helm**, Solaris (desert): bronze, with a sun crest and a cloth neck guard.
  - `galecrestHelm`, **Galecrest Helm**, Sky Isles: light silver, with a swept wing-shaped crest.
  - `thornwardHelm`, **Thornward Helm**, Elaris (forest): dark wood and leaf plates, with thorn spikes along the top.
  - `stormcallerHelm`, **Stormcaller Helm**, Vespera (storm coast): steel, with lightning-blue trim and a fin crest.
  - `chronoguardHelm`, **Chronoguard Helm**, Chronospire: brass clockwork, with a round gear on each side and a lens visor.
- One item per look; the slot draws last, over everything else.

## Fit templates for every slot (Round 563)

`gear/templates/<slot>-mask.png`: white where that slot's gear goes, in each of the 36 frames (the Gear Studio shows it as a
guide). Use it as the inpainting mask when you generate a piece on the base sheet, and keep the piece inside it unless it is
meant to be bigger (a cape, shoulder plates). `gear/templates/protected.png` is the Aetherlink: the tool now refuses a look with
more than 30 px over it. It caught the cyber belt covering the Aetherlink's screen in three left-facing frames; Claude removed
those pixels (`tools/art-refresh/wearable/cyber-belt/`). For the chest armor's shoulder refit, the shirt template shows exactly
where the shoulders are.

## The Gear Studio: check your gear there before handing it over (Round 562)

**aethercede.com/gear** draws the hero exactly as the game does and runs the same checks as `tools/wearable_add.py`. Drop in
your overlay (and cleaned sheet), pick the slot and gear items, and it shows: every check; a review sheet of all 36 frames (as he
is · with your look · the whole outfit with old clothing that should be hidden in red); the walk at game size; and your piece
worn with every other look. When it passes, **download `manifest.json` there** and put it in your hand-off folder beside
`overlay.png` (Claude's tool reads the name, slot and items from it). Go through the **fit checklist** in
`tools/art-refresh/wearable-gear.md` on the review sheet: shoulders, nothing red, no paste boxes, the walk. Those are the three
problems found so far (boots, pants, chest armor), and all three show plainly on the review sheet.

## Chest armor: refit the shoulders (owner, Nov 25; Round 561)

The owner: the armor is "not fitting around the shoulders". At 256px, `cyber-chest` (overlay over the base sheet):
- **Facing down (row 0) and up (row 3):** the vest's top edge is narrower than his shoulders, so the navy shirt's shoulder seams
  stick out past it on both sides. Make the vest **wrap over the top of each shoulder** to the shoulder seam, its armhole meeting
  the sleeve, so no shirt shoulder shows above or beside the vest (the sleeves below stay navy).
- **Facing left (row 1):** a round shoulder pad floats behind the shoulder blade. Put the shoulder piece **on** the shoulder,
  following its curve, moving with it in every walk frame.
- **Facing right (row 2):** the vest stops in a straight vertical edge down the front of the shoulder. Wrap it round the shoulder
  the same way; no straight cut edges.
Check all 36 frames at 256px over `protagonist-walk9-base.png`, keep the outline (`--dry-run` will refuse anything outside it),
and re-deliver `tools/art-refresh/wearable/cyber-chest/overlay.png` in a pull request. The rest of the vest is good.

## The gloves (your PR #325): in (Round 560). Still to come: the pants and boot fixes

The gloves went in first time: fitted on the new base sheet, the fingertips showing, the Aetherlink untouched, every direction
drawn for itself, and you ran `--dry-run` before handing over, exactly as intended. The whole outfit (pants, boots, chest,
belt, gloves) now stacks on the hero.

**Two fixes are still open** (details below in this file):
1. **Pants:** re-fit `cyber-pants` on the base sheet so it covers the trouser cloth where the pouch was (the tan patch at the
   hip in the side views, still visible with the full outfit).
2. **Boots:** the right-facing row, frames 3 and 7: the hard-edged rectangular patch at the back boot's ankle.
Deliver each as a new `overlay.png` in its look's folder, in a pull request; run `--dry-run` first.

## Reply to your wearable-process review (PR #323), done in Round 559

Excellent review: pinned to a commit, every claim reproduced or labelled as a proposal, the roles respected. Taken up:

- **Renderer** (`assets/hero-wear.js`): every composed sheet's URL has one owner (the cache or the screen) and is revoked when
  neither holds it; the cache is LRU; one build per outfit at a time; a build no longer wanted stops before it encodes; a
  failure (picture won't load, wrong size, no blob) is retried after 2s, 8s and 30s, and at once on a gear change or when the
  browser comes back online; every picture's size is checked before drawing. Your probe is now a regression test asserting the
  corrected behaviour: `tests/hero-wear-renderer.test.cjs` (it also covers your race: no URL left without an owner).
- **Validator** (`tools/wearable_add.py`): `--check` is read-only; empty or repeated item ids are refused; any pixel at all
  more than 2px outside the hero is refused (your faint matte and far fragments); each frame needs 40 solid item pixels (your
  alpha-1 frames); pure key-colour pixels are refused; a refused import writes a picture of the rejected pixels in red.
  **`--dry-run`**: every check and the proofs, nothing written under `assets/`. Use it before a hand-off instead of an
  isolated copy of `check_look`. `tests/wearable-tool.test.cjs` checks each rule.
- **Browser test**: `REQUIRE_BROWSER=1` makes a missing server or a skipped reload check a failure.
- **Stacked proofs**: the Round 559 base sheet (above) removes the clear-patch-under-pants seam at its root.

Not yet, and yours to lead when you want it: **calibrated per-slot regions and protected masks** (Aetherlink, face, hands) for
all 36 poses, pinned to the base sheet's hash. With them the validator can refuse a head or Aetherlink pixel inside an
otherwise good item, which it can't today. Please build the masks (they need your eye), deliver them as
`tools/art-refresh/wearable/templates/<slot>-allowed.png` and `protected.png` on the hero's grid (white = allowed or protected,
from the **base** sheet), and Claude will wire them into `check_look`. Also later: a release manifest with hashes, and
measuring decode time on phones before changing the renderer further.

## New base sheet for all gear: the hero without his tool belt (Round 559; read this first)

**Fit every look from now on on `assets/characters/protagonist-walk9-base.png`**: the hero, same grid and outline, without his
brown tool belt and pouch (your cleaned sheet from the belt handoff). The brown belt is now the belt slot's default look,
drawn by the game when no belt is worn, so the hero with nothing worn is unchanged. What this means for you:
- lay your overlay over the **base** sheet when fitting and checking;
- a `cleaned.png`, if one is ever needed, starts from the **base**;
- no belt needs a cleaned sheet again.

**The pants fix becomes simpler:** fit the pants on the base sheet. Where the pouch was, the base has plain trouser cloth:
cover it like the rest of the leg (that is the tan patch beside the cyber belt). Re-deliver `tools/art-refresh/wearable/
cyber-pants/overlay.png` in a new pull request; Claude re-runs the tool. The boots and chest armor are fine as they are.

`tools/art-refresh/wearable-gear.md` is updated to match.

## Pants and chest armor (your PRs #321 and #322): in, with one fix to the pants (Round 558)

Both went through `tools/wearable_add.py` first time and look good worn together with the boots and belt. Thank you for
checking the combined outfit and for flagging the pouch in the pants README: that was exactly the right thing to check.

**The fix (pants):** with the pants **and** the belt worn, a **tan patch shows at the hip in the side views** (rows 1 and 2,
most frames). The belt's clear patch (`assets/characters/wearable/cyber-belt/clear.png`: every pixel with alpha 255) repaints the
old pouch as tan trouser cloth, and part of that area lies outside the leg your pants follow. Superseded by Round 559 (above): fit the pants on the new
base sheet, covering the trouser cloth where the pouch was.

**Gloves:** when the image generator is available again, deliver `cyber-gloves` the same way (your preparation notes are right:
fingerless, only on the hands, the left forearm's Aetherlink untouched, ids `ember, thornhideGloves, tempestGloves`).

## The boots (your PR #319): in, with one fix to make (Round 557)

Thank you: this followed the process to the letter (folder, README, look name, slot, item ids, no cleaned sheet needed, 0 px
past the outline). `tools/wearable_add.py` took it first time, and the boots stack with the belt.

**One fix, please:** in the **right-facing row (row 2, the third row from the top), frames 3 and 7** (counting the idle frame
as 0), the boot nearer the back has a **hard-edged rectangular patch at the ankle**: a straight vertical and a straight
horizontal edge, as if a box was pasted over the leg there. It is hard to see at game size but plain at 256px. Redraw just
those two cells so the boot's top meets the trouser leg with the boot's own outline, then update `overlay.png` in
`tools/art-refresh/wearable/cyber-boots/` in a new pull request. Claude re-runs the tool; the look updates in place.

**How to catch it yourself next time:** besides the tool's checks (which can't see a straight seam), look at every cell at
256px for straight horizontal or vertical edges in the overlay that aren't in the drawing: they are paste boxes.

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
- The boots: the boot items in `assets/gear.js` are `boots` (Briarstep Boots) and `cloudstepBoots` (Cloudstep Boots). Say in the README which of them show your
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
