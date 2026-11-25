# Wearable gear: showing gear on the hero (Rounds 554-555)

When the hero wears a piece of gear that has a **look**, the map shows it on him. A look is two pictures on the hero's own
sprite-sheet grid, plus a line saying which gear items show it. Adding one is: **Codex delivers the two pictures → Claude runs
one command → tests → merge.** No game code changes per item.

## In short (Round 562)

1. **Codex** fits the item on `assets/characters/protagonist-walk9-base.png`, checks it in the **Gear Studio**
   (**aethercede.com/gear**, `gear/index.html`: drop in the overlay, pick the slot and items, see every check, the review sheet and
   the walk, try it with the rest of the outfit), downloads `manifest.json` there, and opens a pull request with
   `tools/art-refresh/wearable/<look>/{overlay.png, manifest.json, README.md}` (and `cleaned.png` if any).
2. **Claude** runs one command and looks at the review sheet and walks:
   `python3 tools/wearable_add.py --from tools/art-refresh/wearable/<look> --review /tmp/<look>-review`
   then `node tests/hero-wear.test.cjs` with the server running, logs the round and merges.

**Fit templates (Round 563):** `gear/templates/<slot>-mask.png` (white where the slot's gear goes in each of the 36 frames,
from the hero's own clothing and the looks already fitted) and `protected.png` (the Aetherlink, never covered: the tool refuses
more than 30 px over it). The Gear Studio shows each as a guide (the slot's area in cyan, the Aetherlink in red) and downloads
the guide and the mask; the mask is ready for an image generator's masked edit (inpainting) of the base sheet. They are rebuilt
with every import and `--rebuild`; `--check` fails if they are out of date. **Uploading:** when the studio's checks pass, it links
to the look's folder on GitHub's upload page: drag in `overlay.png` and `manifest.json`, commit, and tell Claude.

`manifest.json` is `{"look": "cyber-boots", "slot": "boots", "items": ["boots", "cloudstepBoots"], "cleaned": false}`: the tool
reads the name, slot and items from it, so nothing is copied by hand.

## Designed gear: recipes, no drawing (Round 564)

The Gear Studio's **Designer** makes gear without art: the slot's fit template is the shape, a texture fills it (procedural
ones drawn in code: plain, carbon, hex, brushed, quilted, scales, stripes, plates; or any texture picture under `assets/`),
tinted, with the hero's own shading multiplied in, plus trim along its edge, bands and a glowing seam, all drawn per frame.
**Save to game** opens GitHub's new-file page for `gear/recipes/<itemId>.json` with the recipe filled in; commit it, and the game
draws that item from the recipe (`assets/gear-recipe.js`, used by both the game and the studio) in place of its drawn look.
Committing to `main` puts it live at once; `tests/gear-page.test.cjs` checks every recipe file. Recipes suit plated, woven and
trimmed gear; for painted detail (folds, worn leather, ornament) use the drawn-look process above.

## Fit checklist (look at the review sheet for each)

The tool can't judge fit; these are what went wrong before, and what to look for in every frame of the review sheet:
- **Shoulders** (shirts, vests, armor): the piece wraps over the top of each shoulder to the seam; no shirt shoulder showing
  beside it facing down or up; in the side views the shoulder piece sits on the shoulder and moves with it, with no straight cut
  edge down its front (the chest armor, Round 561).
- **Covers what it replaces:** with the whole outfit on, nothing red on the review sheet's last row (the old khaki trousers and
  brown shoes; the tan hip beside the pouch's old place, Round 558).
- **No paste boxes:** no straight horizontal or vertical edge where the item meets the body that isn't in the drawing (the
  right-facing boots, Round 557).
- **Stacks:** the last row shows it with every other look; look where they meet (waist, ankles, wrists).
- **Walks:** the four walk animations (game size): nothing slides, flickers or jumps between frames.
- **The Aetherlink** on the left forearm is never covered or changed.

## How it works in the game

- The hero is one sprite sheet, `assets/characters/protagonist-walk9.png`: **2304 x 1024 px, 4 rows x 9 columns of 256 x 256
  cells**. Rows from the top: **0 facing down (front), 1 facing left, 2 facing right, 3 facing up (back)**. Column 0 is
  standing; columns 1-8 are the walk.
- **Round 559: the base for all gear is `assets/characters/protagonist-walk9-base.png`**: the same hero, same grid and outline,
  **without his brown tool belt and pouch**. Fit every new look on this sheet. The brown belt is the belt slot's *default look*
  (`assets/characters/wearable/default-belt/patch.png`): the game draws it whenever no belt with a look is worn, so with nothing
  worn the hero is exactly the original sheet (the tool checks this, to the pixel).
- A look has:
  - an **overlay**: the item alone, on that grid, everything else transparent;
  - optionally a **clear patch**: the pixels where the hero's old clothing is painted out (for the belt, the old brown belt and
    pouch), opaque, everything else transparent. Made by the tool from a cleaned hero; nobody draws it by hand.
- When gear changes, `assets/hero-wear.js` draws: the base (the beltless hero) → every worn look's clear patch (inside the hero's
  own outline) → slot by slot, in the order **pants, boots, shirt, belt, gloves** (later on top), the worn look's overlay, or
  the slot's default look (the brown belt) where nothing with a look is worn there. The result is cached
  and replaces the hero's sheet; the animation, frames and timing are untouched. Without a look, or if a picture fails to load,
  the plain hero shows.
- Because each look only carries its own pixels, looks for different slots (belt and boots) **stack**: there is never a
  cleaned hero per combination.
- The registry `assets/hero-wear-looks.js` is generated from `assets/characters/wearable/<look>/look.json` by the tool. Never
  edit it by hand.

## What Codex delivers for each look

Put the files in `tools/art-refresh/wearable/<look>/` (for example `tools/art-refresh/wearable/cyber-boots/`) and open a pull
request. Don't change game code or anything under `assets/`; don't take a round number (Claude logs it).

1. **`overlay.png`**: PNG, RGBA, **exactly 2304 x 1024**, the hero's grid as above.
   - Each cell holds only that frame's item, at the exact pixel position on the hero in the same cell. Check by laying it over
     **`protagonist-walk9-base.png`** (the beltless hero) at 100% and stepping through all 36 cells: it sits on the body and
     moves with it. Where the old pouch was, the base has plain trouser cloth: pants cover it like the rest of the leg.
   - **Every one of the 36 cells has the item** in it (a frame where it is hidden still shows what little is visible).
   - Everything that isn't the item is **fully transparent**: no background, shadow, glow or green/magenta/red fringe.
   - **Inside the hero's outline**: the item may not stick out past his silhouette except along its soft antialiased edge (the
     tool allows 2000 px across the whole sheet).
   - Where a hand, arm or other body part passes in front of the item, the item has a hole there.
   - **The Aetherlink on his anatomical LEFT arm is never covered or changed** (gloves included).
   - Each direction is drawn for itself: never flip left to make right.
   - Don't move, crop, recentre or scale anything inside a cell; don't change the hero.
2. **`cleaned.png`** (only if the item must hide clothing he already wears and can't cover it, e.g. slim shoes over his chunky
   brown boots): the **base** `protagonist-walk9-base.png` with **only that slot's old clothing** painted out (filled with what
   would be under it), same size and grid. (No belt ever needs one now: the base has no belt.)
   - **Its alpha must be identical to the original** (the outline doesn't move): the tool refuses it otherwise.
   - Paint out **only this slot's area**, starting from the base sheet each time, never from another look's cleaned sheet
     (boots: feet and lower shins; pants: legs; shirt: torso and upper arms; belt: waist and pouch; gloves: the hands, never the
     left forearm's Aetherlink).
   - Not needed when the overlay fully covers the old clothing in all 36 frames.
3. **`README.md`**: the look's name (lower-case, hyphens: `cyber-boots`), its slot (`boots`, `pants`, `shirt`, `belt` or
   `gloves`), and the gear items that show it, by their ids in `assets/gear.js` (e.g. `boots, cloudstepBoots` for the Briarstep and Cloudstep Boots; several
   items may share one look). Say whether `cleaned.png` is included.

Proof pictures are welcome but optional: the tool makes them. **Before handing over, run the full checks yourself without
writing anything:** `python3 tools/wearable_add.py --look <name> --slot <slot> --items <ids> --overlay <png> [--clean <png>]
--proof <dir> --dry-run` (Round 559). A refusal lists every problem and saves a picture of the rejected pixels in red.

## What Claude does

```
python3 tools/wearable_add.py --look cyber-boots --slot boots --items boots,cloudstepBoots \
    --overlay tools/art-refresh/wearable/cyber-boots/overlay.png \
    [--clean tools/art-refresh/wearable/cyber-boots/cleaned.png] --proof /tmp/proofs
```

The tool checks everything above (size, all 36 frames, inside the outline, the cleaned sheet's outline, the items exist and
are of that slot, no item in two looks), refuses with a list of problems if any fail, otherwise writes
`assets/characters/wearable/<look>/{overlay.png, clear.png, look.json}`, raises the look's art version (so browsers fetch
the new pictures), regenerates `assets/hero-wear-looks.js` and writes proof strips (original | with the look, all 9 frames of
each direction, at 256px and at the game's 84px). Re-running it with new art updates the look.

Then:
1. look at the proof strips (both sizes, all four directions);
2. `node tests/hero-wear.test.cjs` with the local server running (`python3 -m http.server 8123`): it runs
   `tools/wearable_add.py --check` on every look, and in the browser equips, swaps, unequips, changes world, saves and reloads;
3. log the round in `CHANGES.md`, bump `?v=` on `hero-wear-looks.js` in `index.html`, merge.

Other commands: `python3 tools/wearable_add.py --check` (validate all looks, read-only; the test runs it), `--rebuild`
(regenerate the registry only), `--dry-run` (every check and the proofs for one look, nothing written). To remove a look, delete its folder and run `--rebuild`.

## Things to check where looks meet

- **Fit on the base, check with the defaults.** Fit on the beltless base; then check the look worn alone (the brown belt is
  drawn over it) and with every other look. Pants fitted on the old sheet left the old pouch's area (now trouser cloth on the
  base) tan beside the cyber belt: pants fitted on the base cover it.
- **Straight edges.** The tool can't see a straight horizontal or vertical seam inside a cell (a pasted box); look at every cell
  at 256px.

## Looks so far

| Look | Slot | Items | Clear patch | Round |
|---|---|---|---|---|
| (default) `default-belt` | belt | worn when no belt with a look is | the brown tool belt and pouch | 559 |
| `cyber-belt` | belt | scarabBelt, stormglassBelt, hourglassBelt | no (since Round 559: the base has no belt) | 554-559 |
| `cyber-boots` | boots | boots (Briarstep), cloudstepBoots | no (the overlay covers the brown shoes) | 557 |
| `cyber-pants` | pants | galeweavePants, mossweavePants | no | 558 |
| `cyber-chest` | shirt | sunwovenShirt, timewornShirt | no (armor over the shirt) | 558 |
| `cyber-gloves` | gloves | ember, thornhideGloves, tempestGloves | no (fingerless, over the hands) | 560 |
| recipe: desert scale armor | shirt | sunwovenShirt (in place of cyber-chest) | (designed, `gear/recipes/`) | 566 |
| recipe: desert scarab belt | belt | scarabBelt (in place of cyber-belt) | (designed, `gear/recipes/`) | 566 |
