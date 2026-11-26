# One working armor set — final junction cleanup

Baseline main: 6fb70de486c30e6843508c797116b75c233a0757 (Round 590), November 26, 2026. Claude's corrected Neon Helm fitting is retained. All six slots have integrated drawn art; this handoff polishes the remaining visible gaps rather than drawing more variants.

| Slot | Look | Update |
|---|---|---|
| Pants | cyber-pants | 2052 waist target pixels fitted from nearby approved trouser material, closing the tan strip between chest and belt |
| Boots | cyber-boots | Ten exposed brown edge pixels covered with nearby approved boot material |
| Gloves | cyber-gloves | Overlay unchanged; required cleaned.png restores 985 original hand pixels damaged by the earlier beltless-base pouch cleanup |
| Belt | cyber-belt | Existing art retained |
| Chest | cyber-chest | Existing corrected shoulders retained |
| Helm | neon-visor | Claude's Round 590 cheek/chin refit retained |

## Claude: import all three supplied folders

    python3 tools/wearable_add.py --from tools/art-refresh/wearable/set-review/handoff/cyber-pants --review /tmp/set-pants
    python3 tools/wearable_add.py --from tools/art-refresh/wearable/set-review/handoff/cyber-boots --review /tmp/set-boots
    python3 tools/wearable_add.py --from tools/art-refresh/wearable/set-review/handoff/cyber-gloves --review /tmp/set-gloves
    python3 tools/wearable_add.py --check

The glove clean patch copies exact original protagonist-walk9.png hand RGB within the supplied original hand mask, outside protected Aetherlink pixels, with base alpha identical. This repairs the complete equipped set. The global base is not replaced: when gloves are unequipped its existing hand overpainting remains a separate base-art issue. Claude may handle that separately with a coordinated base/profile hash update.

## Verification

All three CLI --dry-run checks pass all 36 frames. Live Gear Studio also passed each updated look (pants 99% template coverage, boots 100%, gloves 98%, clean alpha identical and 985 repainted hand pixels, Aetherlink clear); manifest values were checked/downloaded there. Studio allows one new look at a time: the combined three-update set was composed locally using the actual repository compositor. full-set.png shows all 36 corrected frames at 256px; waist-before-after.png shows the waistband and original finger restoration. Four 84px strips and looping walk previews were generated and reviewed locally; regenerate them with review_set.py.

Latest-main --check passes all six current looks and reconstructs the unequipped hero at max difference 0. Hero-wear renderer regression, hero-wear harness and helmet harness pass. A six-slot harness probe confirmed the full look order and removing each piece leaves the other five. The optional local hero-wear browser leg was skipped without a local server, not counted as a pass. No new live-game save/reload/world-change test of these files is claimed; Claude owns integration and those checks.

The old-clothing-colour heuristic dropped from 801 pants/13 boots matches to 152/3. Remaining matches are not blindly painted: it also catches hand shadows and soft edges. Visual review, not a zero-red count, governs the hand preservation.

## Reproduce without runtime writes

    python3 tools/art-refresh/wearable/set-review/fix_junctions.py
    python3 tools/art-refresh/wearable/set-review/review_set.py /tmp/current-set
    python3 tools/art-refresh/wearable/set-review/review_set.py /tmp/corrected-set tools/art-refresh/wearable/set-review/handoff

source-hashes.json locks original/base, masks, accepted art and original hand preparation ZIP. Rebuilding refuses source drift. No face, position, Aetherlink or movement changes. No new generated design, runtime assets, game code, tests, round number or deployment in this PR.
