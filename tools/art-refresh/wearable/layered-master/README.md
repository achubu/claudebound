# Layered actor underlayer — art authoring work

Status: **not a complete neutral actor and not ready for runtime import**. This folder does not modify runtime assets. Do not import its outputs with wearable_add.py as a gear item. Codex owns all missing underlayer art and fitting; Claude owns eventual game integration. Nothing in this folder asks Claude to draw the missing anatomy.

The owner's latest fit direction is coverage first: gear panels can cover the underlying shape generously. Precision is needed at the moving joints, including the neck. Use overlapping material and stable attachments at neck/collar, shoulders, elbows, wrists, hips, knees and ankles. No gaps exposing old accessories or clothing, no sliding over a joint, no rectangular cuts. Do not pursue a pixel-for-pixel contour match for every armor panel.

## Sources generated in this pass

`sources/scalp-turnaround.png`: four independently rendered head views used **only as editing material**. Generated faces are not replacements for the original actor's faces. The fitter keeps selected original face features and copies original pixels outside a scalp editing domain.

`sources/bare-feet-turnaround.png`: front, left, right and rear foot material. Not yet fitted to all walk poses. A planted-foot view alone does not provide correct lifted-foot/sole poses.

`sources/bare-arms-turnaround.png`: eight cropped forearm references, no device or wristband. Not yet fitted. The mostly hidden right-facing far arm remains a small visible part. Do not replace the original hand/fingers with the generated hand drawings.

All three sources were made with built-in image generation. They are working source material, not production-ready sheets. Their prompts are in `SOURCE-PROMPTS.md`.

## Reproducible checks

From the repository root:

```
python3 tools/art-refresh/wearable/layered-master/master.py build /tmp/actor-planes
python3 tools/art-refresh/wearable/layered-master/fit_heads.py /tmp/scalp-review
python3 tools/art-refresh/wearable/layered-master/test_master.py
```

The original source hash is `5c0e6e4f834f317f193e33202700ae7dbb94e0570a5c2924d48c0a079400fb42`. The grid remains 2304×1024, four rows of nine 256px cells. No actor frame is globally recentered or rescaled.

`master.py` extracts eight disjoint region planes and a hash-locked ownership map. Its default reconstruction is **exactly the original RGBA image**. These are coarse region planes, not recovered original authoring layers: `head-and-hair` remains joined, and hidden anatomy and independent arms are explicitly unavailable. Its `equip` command uses the current game's compositor to review already integrated gear; it does not certify the rejected PR361 belt.

`fit_heads.py` produces an internal scalp-fit sheet, a face-feature lock mask, a separately preserved original neck/collar attachment mask, edit-domain mask, all-frame head proof, 84px sheet, four walk GIFs, and report. It checks zero drift on its protected feature mask, on the original neck/collar attachment mask, and outside its edit domain. **That is not proof every original face pixel is identical:** the forehead, temples and newly exposed scalp are edited; mask boundaries still need full review. A score gate rejects uncertain registrations. The report always says `production_ready: false` because this is not the requested complete neutral sheet.

## Remaining work owned by Codex

1. Finish and review scalp/face/ear boundaries at 256 and 84. Original visible face preservation must be independently checked, not inferred from a self-selected mask.
2. Fit feet to the original ankles in every pose, including lifted feet and visible soles. Preserve trouser cuff coordinates and neck/body/limb positions.
3. Fit the new bare wrist/forearm material beneath the removable Aetherlink/watch. Retain the original fingers and hand silhouette. Original device art must remain separately recoverable.
4. Finish belt/pouch cloth cleanup without restoring brown leather fragments with a broad hand mask. The PR361 belt is visually rejected; PR362 is not integrated.
5. Build the complete layer stack with seam overlap and correct foreground order, review all 36 poses and outfit combinations, then deliver usable art and a concrete integration contract. No draft actor is approved for production.
