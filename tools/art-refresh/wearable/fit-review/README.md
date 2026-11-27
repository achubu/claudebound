# Fit review: all six pieces, all 64 equipment combinations

Reviewed main 3a2d81f6f0c6891541091ccfb1ff46ca8e86111a (Round 591) on November 27, 2026. The owner asked to make the current set fit correctly before drawing other helms. No helm variants are generated here.

## Reproduced issue and graphics fix

The default brown belt's patch restores the original hands and Aetherlink when no fitted belt is worn. With cyber-belt equipped, that patch is absent; the beltless base exposes its earlier hand/device overpainting. The previously delivered glove clean patch masks much of the hand damage only while gloves are worn. Additionally, the fitted belt had pixels over foreground hands in some walk poses. Checking only the whole outfit missed these conditional failures.

The cyber-belt handoff here fixes the belt itself:
- REQUIRED cleaned.png copies 1425 exact original-source hand/device RGB pixels, retaining the base alpha exactly. No new hand or gauntlet is drawn.
- overlay.png keeps the accepted belt art but removes 682 pixels over original foreground hands/device, letting them appear in front of the belt.
- The device mask is derived from the ORIGINAL hero, because the beltless base had already lost part of its device. It uses original cyan regions, their filled/dilated casing region, cool source pixels and original hand masks. Original-device-mask.png is an art-review aid, not a runtime replacement template.
- Item IDs unchanged: scarabBelt, stormglassBelt, hourglassBelt. Look cyber-belt, slot belt.

This does not require a new base sheet or change its hash. Restore order works with gloves, without gloves, and with the default belt. Pants, boots, chest, gloves and the refitted Neon Helm are retained.

## Claude import and game tests

    python3 tools/wearable_add.py --from tools/art-refresh/wearable/fit-review/cyber-belt --review /tmp/belt-fit-review
    python3 tools/wearable_add.py --check

The optional clean file is mandatory for THIS look version. Import both cleaned.png and overlay.png, not the overlay alone. Please test cyber belt alone with no gloves, complete set minus gloves, full set, and changing belt/gloves in both orders, then save/load and world travel. Claude owns runtime integration; nothing under assets/, game code or runtime tests is edited here.

## Evidence

- Current-main --check passes all six pieces; bare hero reconstruction max difference 0.
- New belt --dry-run passes all 36 frames. Live Gear Studio passes all checks: 639 edge pixels, 94% belt-template coverage, original clean alpha preserved, 1425 recoloured pixels, Aetherlink clear. Manifest downloaded from Studio.
- All 64 on/off combinations, each composing all 36 frames: zero exposed-hand mismatches, zero original cyan Aetherlink-core mismatches, zero uncovered-face mismatches. RGB comparison tolerance is 3 per channel to allow compositor rounding. This is 2304 frame compositions. See after-combinations.json and check_combinations.py. Legacy protected-mask margin changes are recorded separately because its dilation includes neighbouring clothing; they are not called device-core damage.
- Visual inspection: six individual item contact sheets, each all 36 frames, with native pixels enlarged 2x; fully equipped 256/84 proofs; belt-alone walk; complete set minus gloves and full-set walks in Studio. The six *-fit.png files preserve actual pose/crop proportions and were reviewed for shoulders, waist, ankles, fingers, head/jaw, occlusion and frame continuity. Contact sheets are proofs, not replacement sprites.
- Before/after proof includes the bare hand and the partly erased device. The repair preserves the actor's face, positions and movement.
- This is a graphics fit sign-off within those checks, not a claim that any automated test can guarantee aesthetic perfection or that live save/reload tests of this version ran. No deployment is claimed.

## Reproduction

Pillow, NumPy and SciPy, from repository root:

    python3 tools/art-refresh/wearable/fit-review/restore_belt.py
    python3 tools/art-refresh/wearable/fit-review/check_combinations.py /tmp/before-outfits.json
    python3 tools/art-refresh/wearable/fit-review/check_combinations.py /tmp/after-outfits.json tools/art-refresh/wearable/fit-review/cyber-belt

source-hashes.json prevents rebuilding on changed source art. The comparison tool is read-only. Use the included scripts and original source if a workspace is restored; do not regenerate the actor or change unrelated pixels.
