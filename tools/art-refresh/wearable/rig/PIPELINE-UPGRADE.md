# Original-foreground armor pipeline

This extends the existing six-slot directional-parts fitter; no new actor or gear design is generated. All changes live under tools/art-refresh/wearable/rig. Claude still handles runtime integration.

The pipeline now automatically clips original foreground hands and device, protects the uncovered head, and merges original-source hand/device RGB into a cleaned sheet with exactly unchanged base alpha. Gloves may cover hand backs, while the original hand under them is restored. The protected device comes from the ORIGINAL hero, not the partly repainted beltless base. Source actor/base hashes must match. Item cleanup can no longer rely on the default brown belt's restoration to hide damage.

Previews and 256/84 strips/walks are rebuilt AFTER this cleanup, with the repository's actual source-atop/default-patch compositor. A READY.json structural marker is removed at the start and emitted only after validation; it explicitly says visual review is required and records image hashes. It is not production approval or a claim of perfection.

## Prepare each item

    python3 tools/art-refresh/wearable/rig/prepare_gear.py --views front.png left.png right.png back.png --slot boots --look cyber-boots --items boots,cloudstepBoots --out /tmp/cyber-boots-candidate --audit-outfits

Use the existing profile guide and part-cell layout for the chosen slot (see README.md). --atlas remains supported. The optional exhaustive flag compares all 64 on/off outfits x36 frames before issuing a marker. Use it for release review. Audit reports baseline, candidate and regression counts separately; inherited current-main problems cannot masquerade as new item damage. Existing baseline issues remain visible even if there are zero NEW regressions. No new regression is permitted by this gate.

The checks measure original exposed-hand skin, uncovered head and original cyan device core with RGB tolerance 3. They do not prove every casing pixel, correct joint art, identity of an asymmetric limb, cloth continuity or aesthetics. Review the output and walks. Source images must still obey the part-cell contract. Free-form photographs, oversized crests/capes and asymmetric gear require reviewed calibration; a fitter cannot invent hidden surfaces.

## Tests

    python3 tools/art-refresh/wearable/rig/test_foreground.py
    python3 tools/art-refresh/wearable/rig/test_pipeline.py

Foreground tests exercise all six slots, the glove exception, exact original restoration, identical alpha, repeatability and refusal of changed clean alpha. Existing six-slot fitting/failure tests remain meaningful; their mocked-builder fixture now invokes the real builder before the validator-refusal check.

PR361's belt repair remains separate integration work. This pipeline does not silently import it or change current runtime art. Claude should import that validated belt handoff and run game equip/save/travel tests before calling the whole live set cleared. This upgrade produces candidate art and review evidence only.

Measured on main 3a2d81f: two new foreground tests pass, three existing fitter tests pass, a real Neon source-atlas end-to-end preparation passes CLI dry-run, and its 64-outfit audit has zero new regressions. The report still flags 32 outfits with inherited/current belt issues; this is NOT a clean whole-game sign-off. Each of the six current real-art looks also passed check_look after the new foreground pass. No source art changes or game deployment are included.
