# Layered actor underlayer — art authoring work

Status: **not a complete neutral actor and not ready for runtime import**. This folder does not modify runtime assets. Do not import its outputs with wearable_add.py as a gear item. Codex owns all missing underlayer art and fitting; Claude owns eventual game integration. Nothing in this folder asks Claude to draw the missing anatomy.

The owner's latest fit direction is coverage first: gear panels can cover the underlying shape generously. Precision is needed at the moving joints, including the neck. Use overlapping material and stable attachments at neck/collar, shoulders, elbows, wrists, hips, knees and ankles. No gaps exposing old accessories or clothing, no sliding over a joint, no rectangular cuts. Do not pursue a pixel-for-pixel contour match for every armor panel.

## Sources generated in this pass

`sources/scalp-turnaround.png`: four independently rendered head views used **only as editing material**. Generated faces are not replacements for the original actor's faces. The fitter keeps selected original face features and copies original pixels outside a scalp editing domain.

`sources/bare-feet-turnaround.png`: front, left, right and rear foot material. Not yet fitted to all walk poses. A planted-foot view alone does not provide correct lifted-foot/sole poses.

`sources/bare-arms-turnaround.png`: eight cropped forearm references, no device or wristband. Not yet fitted. The mostly hidden right-facing far arm remains a small visible part. Do not replace the original hand/fingers with the generated hand drawings.

`sources/bare-feet-poses.png`: sixteen planted/lifted/heel-contact/toe-off/sole views. Fitted with manually authored original ankle coordinates in `fit_feet.py`; a review candidate, not production handoff.

`sources/waist-cloth-turnaround.png`: clean cloth beneath all waist accessories in four directions. Not fitted successfully yet.

All five sources were made with built-in image generation. They are working source material, not production-ready sheets. Their prompts are in `SOURCE-PROMPTS.md`.

## Reproducible checks

From the repository root:

```
python3 tools/art-refresh/wearable/layered-master/master.py build /tmp/actor-planes
python3 tools/art-refresh/wearable/layered-master/fit_heads.py /tmp/scalp-review
python3 tools/art-refresh/wearable/layered-master/fit_feet.py /tmp/scalp-review /tmp/foot-review
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

## Ankle fitter and rejected waist attempt

`fit_feet.py` uses 72 original ankle attachments, per-frame source-pose choices, rotations, cloth overlap and ground limits. It removes red fringe/disconnected source components, draws behind the existing cuffs, and verifies no changes outside its explicit editing domain. It saves a 36-frame proof, 84px proof, four walk GIFs and a report with all fit data. Its report is explicitly not production-ready. Some cuff boundaries still need manual seam review.

A waist prototype reused the current base-sheet difference mask and broad skin/hand/cool-color selections. **Rejected:** the difference mask includes damaged forearm pixels; cool-color grouping also keeps blue holster fragments with the Aetherlink. The result clipped some moving forearms and left rectangular cloth transitions. That output is not included and must not be imported. Source cloth is useful, but this pass needs explicit original arm/hand/device ownership and per-frame hip masks before it can replace the cleanup. Simply expanding the current difference mask is unsafe.

The next art work is explicit arm/waist occlusion fitting, retaining original hand/finger pixels and wrist/elbow endpoints, then fitting the generated bare forearm underneath the device/watch. The completed source art is available; the complete usable underlayer is not.

A subsequent texture/capsule forearm prototype was also rejected. Cyan-device centroids and nearby skin clusters do not establish reliable elbow/wrist attachments or a clean visible forearm matte. Restoring warm pixels over that approximation left metal fragments, disconnected edges and straight rectangular joins. Do not use it as the neutral forearm or claim it preserves every finger. The arm source art is valid editing material; its fitting still needs explicit, reviewed limb boundaries and original joint anchors for each pose. Neither failed waist/arm composite is committed as a replacement sheet.
