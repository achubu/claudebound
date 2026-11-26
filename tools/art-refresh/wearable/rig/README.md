# Locked hero, reusable gear parts — handoff for Claude

Owner requirement, Nov 26: sheets must have identical positions and faces. Generate a small number of gear graphics, then cut/resize via a repeatable process.

## Reject the drifting whole-hero approach
Whole-sheet AI edits of the neutral/bald hero changed faces, positions and some silhouettes. They are experiments, NOT approved bases and NOT supplied as production assets here. Face-copy cleanup also left hair fragments and duplicate feature edges; rejected. Do not integrate these candidates. The requested no-hair/no-pouch/no-gauntlet/no-watch base is still pending a properly isolated edit.

Keep the current source hero immutable. Build the neutral base once, modifying only reviewed masks for hair/scalp, pouch, left gauntlet and other wrist accessory. Preserve original eyes, brows, nose, mouth, jaw, hands and every unaffected pixel exactly. Changes to hair and gauntlet silhouettes are intentional, but no cell may move or scale. Make an exact pixel-diff proof and human review before accepting the new base. Keep existing hero as fallback. Update masks and fit calibration against the accepted new hash, not a candidate.

## Generate components, never another hero sheet
- Helm: four independent directional drawings, one per down/left/right/up; reuse across nine head anchors per direction when perspective permits.
- Belt: four directional belt parts, with foreground hand masks.
- Chest: torso plus separate near/far shoulder pieces; torso follows chest anchor and shoulder pieces follow upper-arm anchors. A single circular hole scaled with the torso is the cause of the drifting shoulder fit.
- Boots/gloves/gauntlets: separate left and right limb pieces with independent directional views and placements. Keep limb bend variants where one rigid drawing cannot represent the pose.
- Do not promise exactly four drawings for all gear: additional articulated/occluded variants may be necessary. Never mirror a view to create the other side; the character is asymmetric.

## Offline compiler
`compile_parts.py` builds only an overlay and previews. Original base bytes are hash-locked. Parts are cut from an atlas, uniformly scaled around an explicit pivot, placed at calibrated per-frame anchors, and optionally clipped by reviewed foreground visibility masks. Source and mask hashes are pinned. No runtime files are written. All 36 placements must be specified; hidden parts are explicit. Calibration must be reviewed before it will build.

The compiler is a foundation, not a completed calibrated rig. The 36 anchors/occlusion masks must be drawn/reviewed once against the accepted base, then reused for new gear. It does not automatically infer anatomy, bend rigid art or solve shoulder articulation.

Recipe schema 1:
```
{
  "schema": 1,
  "calibration_reviewed": true,
  "base": "relative/path/to/accepted-base.png",
  "base_sha256": "<exact source hash>",
  "parts": [{
    "image": "gear-atlas.png", "sha256": "<atlas hash>",
    "views": {
      "down": {"crop": [0,0,100,100], "pivot": [50,20]},
      "left": {"crop": [100,0,200,100], "pivot": [50,20]},
      "right": {"crop": [200,0,300,100], "pivot": [50,20]},
      "up": {"crop": [300,0,400,100], "pivot": [50,20]}
    },
    "visible_mask": "optional-reviewed-2304x1024-mask.png",
    "visible_mask_sha256": "<mask hash if provided>",
    "frames": ["36 objects in row-major order: {anchor:[x,y],scale:0.25} or {hidden:true}"]
  }]
}
```
The frames string is documentation, not a runnable recipe. Pivot coordinates are local to the cropped part; anchors are local to each 256px cell. Parts composite in listed order. Separate named sources may be used as separate parts where directional/bend variants differ. For invisible part/view combinations use hidden placements.

Run `python3 tools/art-refresh/wearable/rig/compile_parts.py recipe.json --out /tmp/gear-build`, then latest wearable_add.py dry-run and Gear Studio. Download the Gear Studio manifest and include it in the handoff. Compiler invariants do not replace visual review: inspect 36 frames at 256/84, looping motion, full outfit and foreground occlusion. No production-ready claim until those checks pass.

## Current pending art
Chest shoulders and the neutral base are still pending. This PR supplies the repeatable process, not finished replacement sprites. Claude retains game integration; Codex owns calibrated graphics and art preparation. No round number or runtime edits.
