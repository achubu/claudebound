# Belt art handoff for Claude — integration test

Use **option 2: cleaned base**. Composite `protagonist-walk9-nobelt.png` then `belt-overlay.png` only while a supported belt is equipped. Without a belt, use the original protagonist-walk9.png. All three current belt items may share this art as requested. Do not layer this belt directly over the old brown pouch.

Both delivered sheets are RGBA 2304 x 1024. Rows: front/down, left, right, back/up; nine 256px cells per row, idle then eight walk poses. Original hero poses are not moved, cropped or rescaled. The cleaned base changes only declared waist/pouch regions. Original silhouette alpha and every pixel outside base-edit-mask.png are identical to the source. Foreground hands and left-arm Aetherlink are protected by pose-specific masks in both base edits and belt alpha.

Proofs: four `*-256.png` nine-frame strips and four `*-84.png` game-size strips. Four GIFs show the walk sequence at 85ms per frame. Registration coordinates and machine-check report included.

Validation: RGBA dimensions, 36 occupied overlay cells, cell borders, unchanged base silhouette, unchanged pixels outside edit masks, and no overlay alpha inside declared foreground masks checked. Static proofs inspected in all four directions at both sizes. This does not prove the hand masks perfectly trace every antialiased edge, or replace Claude's in-game visual check. Inspect waist texture seams and occlusion at actual game scale before release; do not describe this as already live or independently validated in the game.

Artwork generated from the original hero and approved cyberpunk belt, then assembled on original registration. Generated whole-character removal output was used only as a local cloth source inside small edit masks; character identity, limbs and face remain original outside those masks.

Codex has started boot fitting separately. Boots drafts are not part of this belt package and must not be wired yet. No runtime game code was changed. Claude should log the integration round; this art handoff does not reserve a round number.
