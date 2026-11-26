# Directional art to wearable equipment

The actor is never regenerated. Start with equipment-only images. The fitter cuts parts, uniformly scales them onto each pose's calibrated region, masks foreground occlusion, protects the Aetherlink and emits the game-grid overlay. Original uncovered actor pixels remain identical. The default unequipped face, hair and actor file never change.

## One preparation command

From repository root, with Pillow, NumPy and SciPy installed:

    python3 tools/art-refresh/wearable/rig/prepare_gear.py --views front.png left.png right.png back.png --slot boots --look cyber-boots --items boots,cloudstepBoots --out /tmp/cyber-boots-candidate

For boots, each directional image contains two equal-width cells, one isolated boot per cell, in the order shown by profiles/boots-guide.png. For a helmet or belt, each view contains just one isolated object. For an existing atlas:

    python3 tools/art-refresh/wearable/rig/prepare_gear.py --atlas tools/art-refresh/wearable/neon-visor/source-atlas.png --slot helmet --look neon-visor --items neonVisor --out tools/art-refresh/wearable/neon-visor

The command copies the source, fits all 36 frames and runs the latest repository validator in dry-run mode. It fails on either an error status or the tool's NOT ADDED message (the current validator can return exit zero on refusal). It writes no runtime assets.

## Source layout

| Slot | Parts per directional view | Atlas layout |
|---|---|---|
| helmet | shell | 2 x 2: down, left, right, up |
| belt | strap/buckle as one object | 2 x 2: down, left, right, up |
| shirt | torso, screen-left shoulder, screen-right shoulder | 4 directional rows x 3 columns |
| pants | waist, screen-left thigh, screen-right thigh, screen-left shin, screen-right shin | 4 directional rows x 5 columns |
| boots | screen-left boot, screen-right boot | 4 directional rows x 2 columns |
| gloves | left glove, right glove | 4 directional rows x 2 columns |

Each cell must have a single connected item on genuine transparency, generous empty gutters and material that overlaps adjoining parts. No actor, face, hands, backdrop or cast shadow. Directions are drawn separately; the tool never mirrors a view. profiles/ contains a silhouette guide and generation prompt for every slot.

For paired leg/boot/glove parts, use symmetric equipment designs. Screen-position tracks follow visible silhouettes, not a guaranteed persistent anatomical leg. Glove tracking uses the Aetherlink where visible and a directional convention where occluded. Distinct left/right details need reviewed anatomical tracks before use. Hidden parts are omitted in occluded frames.

## Output and handoff

The folder includes source-atlas.png, overlay.png, manifest.json, build.json, preview.png, four 256px strips, four 84px strips, four walk GIFs, review/ and validation.txt. If soft head-edge pixels need recolouring, cleaned.png contains a base copy with only those edge colours changed and exactly identical alpha. Claude's importer converts it to a minimal clear patch. It does not replace the actor.

Inspect all directions and all frames at 256px and 84px, then test the look in https://aethercede.com/gear/ with the other armor. Download its manifest. Validation does not judge style, curved junctions or clipping by eye.

Claude installs an approved handoff with the existing tool:

    python3 tools/wearable_add.py --from /tmp/cyber-boots-candidate --review /tmp/my-boots-review

For an item already mapped to an existing look, use that same look name (for example cyber-boots); the validator refuses assigning the same item to a second look. Then Claude runs --check and the integration/browser tests. This source package does not deploy or edit game code.

## Calibration and limits

The six label masks are pinned to the actor SHA-256, original slot-mask SHA-256 and protected-mask SHA-256. The source and placements are recorded for deterministic rebuilds. Regenerate with `python3 tools/art-refresh/wearable/rig/calibrate.py tools/art-refresh/wearable/rig/profiles` only after reviewing any changed base/templates.

These profiles fit close-fitting equipment to the existing silhouette. They do not invent hidden surfaces, compensate for a bad generation, or support large crests/capes/protrusions. Those require an expanded reviewed profile and compatible validation from Claude. Existing masks set occlusion; unusual overlapping designs require review. This is not skeletal animation and does not deform limb textures with a mesh. A neutral bald/bare-arm actor and swappable gauntlet replacements are not delivered by this pipeline.

## Verification

    python3 tools/art-refresh/wearable/rig/test_pipeline.py

The test uses labelled solid-colour structural fixtures (not artwork) for all six slots and 36 frames: exact directional/part correspondence, full calibrated coverage, Aetherlink exclusion, actor preservation, deterministic rebuilds, repository check_look, and rejection of opaque/empty sources and profile drift. The Neon Visor is the real generated-art example and has separately passed the live Gear Studio.
