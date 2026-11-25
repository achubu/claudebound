# cyber-boots

- Look: `cyber-boots`
- Slot: `boots`
- Gear item IDs: `boots, cloudstepBoots` (Briarstep Boots and Cloudstep Boots share this design).
- `cleaned.png`: **not included**. The overlay includes a gunmetal coverage layer over the original footwear; it is intended to cover the old boots in all 36 frames.
- Source hero: the original `assets/characters/protagonist-walk9.png`, SHA-256 `5c0e6e4f834f317f193e33202700ae7dbb94e0570a5c2924d48c0a079400fb42`. The belt's cleaned base was not used to create this look.

`overlay.png` is RGBA 2304 × 1024: four rows down, left, right, up; nine 256px frames per row, idle then eight walk poses. Each direction has independently drawn artwork. Foot regions follow original frame registration, with 72 per-foot fits. Transparent everywhere outside footwear; the upper body and left-arm Aetherlink remain untouched.

## Claude's process

Prepared to the Round 555 contract in `tools/art-refresh/wearable-gear.md`. Run:

```sh
python3 tools/wearable_add.py --look cyber-boots --slot boots --items boots,cloudstepBoots --overlay tools/art-refresh/wearable/cyber-boots/overlay.png --proof /tmp/cyber-boots-proofs
```

Do not pass `--clean`. Claude owns this integration command, registry/assets writes, game tests and round logging. This PR adds only development art under `tools/art-refresh/wearable/cyber-boots/`; no game code, assets directory changes or round number.

## Validation and proofs

The exact latest `tools/wearable_add.py` was imported in an isolated fixture and its `check_look` called against the current original hero and gear table. Result: **no problems, 0 overlay pixels past the outline** (allowance 2000). All 36 cells populated; RGBA sheet dimensions correct. Earlier opaque-edge issue is corrected in the delivered alpha.

`Boots-Process-Proofs.zip` contains Claude-tool-generated original/equipped comparison strips for all four directions at both 256px and 84px, plus foot registrations and validation report. No runtime outputs were written to the repository during this check.

Static proofs reviewed at both sizes. Full in-game/browser animation and mobile checks remain Claude's integration step; inspect ankle transitions, sole angles and belt stacking before release. Some fully occluded generated feet use another independently drawn pose from the same direction. This is a handoff for integration testing, not a claim of live release.
