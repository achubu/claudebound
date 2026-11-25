# cyber-pants

- Look: `cyber-pants`
- Slot: `pants`
- Gear IDs: `galeweavePants, mossweavePants` (both existing pants items share this design).
- `cleaned.png`: not included. The overlay covers the visible old trousers. Original boots, hands, torso and anatomical left-arm Aetherlink are protected. The dark trouser layer also fills the hip area beneath the former pouch, so belt clear patches do not reveal tan cloth when looks stack; wearing these pants alone may cover part of the old pouch. Check that aesthetic with and without the belt during integration.
- Based on the original hero only, never a belt-cleaned or combined outfit base.

`overlay.png` is RGBA 2304 × 1024, rows down/left/right/up, nine 256px cells per row, idle plus eight walking poses. Each direction is independently drawn. The fitted clothing retains the original leg silhouette and positions; no new gait is introduced. Knee and thigh panels follow each source pose.

## Claude integration

```sh
python3 tools/wearable_add.py --look cyber-pants --slot pants --items galeweavePants,mossweavePants --overlay tools/art-refresh/wearable/cyber-pants/overlay.png --proof /tmp/cyber-pants-proofs
```

No `--clean` is needed. Use existing slot order (pants before boots, shirt, belt, gloves). No gear ID/stat/reward changes or runtime code edits. Claude logs the implementation round and runs game tests before release.

## Checks

Exact current `wearable_add.py` `check_look`: PASS, all 36 cells, correct dimensions, **0 pixels outside the outline**. Extra checks: no colored matte pixels; no pants alpha in the explicit original-hand masks. Original hero pixels outside the overlay remain unchanged.

`Pants-Proofs.zip` contains Claude-tool original/equipped comparison strips at 256px and 84px for all four views, walk GIFs, registration and mask data, validation report and a complete outfit preview using the separately supplied boots/chest/belt art. Static proofs inspected at both sizes. Actual game animation, gear switching, saving, fallback and mobile checks remain Claude's integration step.

Gloves are pending image-generation allowance; they are not included or claimed complete. No files under assets/, game code or round number in this art handoff.
