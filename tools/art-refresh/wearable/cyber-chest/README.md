# cyber-chest

- Look: `cyber-chest`
- Slot: `shirt`
- Gear item IDs: `sunwovenShirt, timewornShirt` (Sunwoven Shirt and Timeworn Shirt share this chest-armor design).
- `cleaned.png`: **not included**. This sleeveless armor is worn over the existing navy shirt; the shirt remains visible at sleeves, collar and armholes.
- Source: original `protagonist-walk9.png`, SHA-256 `5c0e6e4f834f317f193e33202700ae7dbb94e0570a5c2924d48c0a079400fb42`. No belt-cleaned or other combined base was used.

`overlay.png` is 2304 × 1024 RGBA, four rows down/left/right/up, nine 256px cells per row (idle then eight walk frames). Each direction uses separate generated artwork; left/right are not mirrored. The original hero is never moved, rescaled or regenerated in the delivered overlay. All non-armor pixels are transparent. Original sleeves show through the near-side armholes. Protection masks exclude skin, hands, the left-arm Aetherlink, and other areas outside the torso. The vest ends above the belt.

## Integrate with Claude's wearable process

```sh
python3 tools/wearable_add.py --look cyber-chest --slot shirt --items sunwovenShirt,timewornShirt --overlay tools/art-refresh/wearable/cyber-chest/overlay.png --proof /tmp/cyber-chest-proofs
```

Do not pass `--clean`. Use the normal shirt slot in the existing slot order; do not change gear names, stats, rewards or ownership. No code or files under assets/ are changed in this art handoff, and no round number is reserved. Claude owns registry generation, runtime tests, logging and merge.

## Validation and proof review

Latest `wearable_add.py` `check_look` passes against the current original hero and gear table: no problems, **0 pixels past the outline**, all 36 cells populated. Additional checks confirm no color-matte pixels, no changes to original hero pixels outside overlay alpha, and no armor alpha inside declared protected regions.

`Chest-Proofs.zip` contains Claude-tool-generated original/equipped comparisons in all four directions at 256px and 84px, four walk GIFs, registration/protection data, validation report and a combined outfit preview. That preview is for comparison only, not a replacement hero sheet or a separate base required for every outfit.

Static proofs were inspected at both sizes. Claude must still inspect the actual game animation, equipment switching, saves, fallback and mobile rendering before release. Check sleeve occlusion, armor/waist seam and belt/boots stacking at game scale. This is ready for integration testing, not a claim of live release.
