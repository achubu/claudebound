# All-outfit fit audit and original foreground repair

Baseline: main 3a2d81f6f0c6891541091ccfb1ff46ca8e86111a, November 27, 2026. Other helm variants are paused at the owner's request until the existing set is confirmed.

## Reproduced failure

Nothing-worn is correctly restored by the default brown belt. But equipping cyber-belt suppresses that default patch: the partly repainted hands/device from the beltless base become visible, and some fitted belt pixels cover the foreground hand during the walk. Gloves hide much of the hand problem only while equipped. All-64-combination testing caught the conditional case.

## Validated repair

restore_belt.py copies 1425 original hand/device RGB pixels with original alpha identical and removes 682 fitted-belt pixels over the original foreground hands/device. The device mask comes from the ORIGINAL hero, not the partly erased base. No new hand, face, gauntlet or character is generated. No new base hash or movement change.

The corrected overlay.png is supplied. IMPORTANT: cleaned.png is also REQUIRED, but its large-file upload was interrupted when the execution workspace became unavailable. It must be rebuilt losslessly from existing repository source with the included script before import. This PR is a review/reproduction handoff, NOT a ready-to-deploy art release. Source art and the repair are complete; the compiled cleanup PNG and extra image proofs have not all been uploaded.

## Claude: rebuild and import

    python3 tools/art-refresh/wearable/fit-review/restore_belt.py
    python3 tools/wearable_add.py --from tools/art-refresh/wearable/fit-review/cyber-belt --dry-run --review /tmp/belt-fit-review
    python3 tools/art-refresh/wearable/fit-review/check_combinations.py /tmp/after-outfits.json tools/art-refresh/wearable/fit-review/cyber-belt

The first command produces cleaned.png, overlay.png and original-device-mask.png from pinned repository inputs. No generation allowance or new artwork is needed. The cleanup PNG that was validated had git blob SHA 7c595fe883f72271893ec8f51d6e6347ecfaf738; the supplied overlay is 40b3c4d9cb810e9529091c09ff05cc8d210eb5ec. Source hashes guard against drift.

After reviewing the generated proofs:

    python3 tools/wearable_add.py --from tools/art-refresh/wearable/fit-review/cyber-belt --review /tmp/belt-fit-review
    python3 tools/wearable_add.py --check

Please test belt alone without gloves, complete set minus gloves, full set, switching belt/gloves in both orders, save/load and world travel. Claude owns integration. No assets/, game code, runtime tests or release round are changed.

## Completed checks

- All 64 on/off equipment combinations x36 frames: zero original exposed-hand, uncovered-face or original cyan Aetherlink-core mismatches above RGB tolerance 3. See after-combinations.json. The wider protected-margin metric is recorded separately because its dilation includes neighbouring clothes.
- New belt dry-run: passes all 36 frames. Live Gear Studio: every check passes, 639 soft-edge pixels, 94% template coverage, 1425 cleaned pixels, exact cleaned alpha, Aetherlink clear; manifest downloaded there.
- Inspected all 36 cells for each of the six individual pieces in 2x-native close-up contact sheets. Reviewed complete-set 256/84 proofs and four-direction Studio walks for belt alone, all armor minus gloves, and full armor.
- Existing main --check passes six looks and reproduces the bare hero at max difference 0. No new live-game save/reload test of this candidate is claimed.

Remaining step: Claude must rebuild the missing compiled cleanup PNG, import this corrected belt and confirm the in-game combination tests. This audit does not promise aesthetic perfection from automated checks. The other pieces retain their current accepted art. Other helm designs remain on hold pending this confirmation.
