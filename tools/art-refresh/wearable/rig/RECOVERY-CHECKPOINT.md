# Gear pipeline — verified work and interrupted handoff

This is a recovery checkpoint, **not a claim that the pipeline has been fully published**. The execution environment became unavailable while uploading the review package. Do not mark the source/tool handoff or live integration complete from this document alone.

## Owner's required behavior
Generate a few equipment-only directional images, feed them to a repeatable cut/fit/import tool, and get worn gear in the game. Preserve original face pixels, body positions, all 36 cells and original animation. Owner permits a better route than earlier Claude notes provided these requirements hold.

## Implemented and tested in the workspace
Source checkout: main 3e01c106a0524d4903c8c8fa97126e5ca7a74e12.
Source workspace: /workspace/scratch/6fb62b93ef4d/pipeline-final .
Preserved prior workspace: /workspace/scratch/6fb62b93ef4d/chest-work .
No hard reset was performed on the dirty original checkout; a fresh detached worktree was used.

- tools/gear_build.py: directional PNGs or standardized atlas input; automatic alpha/gutter crop, connected-part isolation, uniform scaling and clipping to per-frame part masks; 36-frame overlay and importer manifest; 256/84 strips, walk GIFs, source/profile hashes, full importer preflight.
- --install: ordinary game importer, registry/template rebuild and content-addressed registry URL in index.html; restore previous runtime assets, templates, registry and HTML on failure. Identical source imports keep the look version.
- Six reusable profile families under tools/art-refresh/wearable/rig/profiles: helmet shell; belt; torso plus shoulders; paired boots/gloves; waist/thigh/shin parts. Each supplies labels, guide and generation prompt. Current paired leg/boot track calibration is intended for symmetric kits; do not certify a new asymmetric kit without review.
- tools/gear_layer_kit.py: reversible core/default-layer extraction. Reassembly gives maximum visible RGBA difference 0. Core is an underlay with transparent reserved areas, **not a finished bald actor**. The exact original face/hair remain together in a head default. Forearm defaults retain the original device/watch.
- Actual new Neon Helm: one generated 2x2 atlas (front/down, left, right, back/up) produced all 36 frames and installed locally for existing item neonVisor, slot helmet, look neon-visor.
- Original accepted base SHA256: a1317e9671b0da27e75edee3268cc6a6723ccc140c8b1bdac3f48ee7ea00ba2f. Original full hero SHA256: 5c0e6e4f834f317f193e33202700ae7dbb94e0570a5c2924d48c0a079400fb42. Neither base was regenerated or altered by the gear builder.

## Verification completed before environment loss
- Python functional suite: 3 tests pass, covering all six profiles, exact mask coverage, preview-only no-runtime writes, idempotent installs, rollback after injected post-import failure, base-hash drift and opaque source matte rejection.
- Actual controller harness: item mapping, equip, unchanged position, world change, save/load, unequip, installed artwork path: PASS.
- Existing hero-wear-renderer regression: PASS.
- Existing hero-wear controller harness: PASS.
- Full wearable_add.py --check: PASS; nothing worn gives the original hero back with maximum difference 0.
- Real Neon Helm in live Gear Studio: all 36 frames; 0 soft-edge pixels; no outside pixels/background key color; Aetherlink clear; 100% helmet-template coverage; full outfit visually reviewed. manifest.json downloaded.
- Full local Playwright browser test **did not pass/run successfully**: Chromium executable absent, vendor download returned 403. A browser test and read-only CI workflow were prepared, but no CI/browser success is claimed.
- Failed whole-hero bald/bare-arm generations and failed face-copy cleanup candidates remain rejected. No finished standalone bald/open-face actor exists.

## Reproduce after the workspace is available
The following command was successfully run locally; it is not runnable from this checkpoint-only branch until the tool/source files are recovered and uploaded:
```sh
python3 tools/gear_build.py --slot helmet --look neon-visor --items neonVisor \
  --atlas tools/art-refresh/wearable/neon-visor/source-atlas.png \
  --out /tmp/neon-visor --install
```
Four separate PNGs are supported by --views down.png left.png right.png up.png. Multipart source pictures must follow the supplied part-cell guide; arbitrary concept art is not automatically anatomically segmented.

Local evidence:
- /workspace/scratch/6fb62b93ef4d/atlas-pipeline/fresh-tests.log
- /workspace/scratch/6fb62b93ef4d/atlas-pipeline/latest-build.log
- /workspace/scratch/6fb62b93ef4d/atlas-pipeline/upload-list.json (46-file pending upload inventory)
- /workspace/scratch/6fb62b93ef4d/pipeline-final/tools/art-refresh/wearable/rig/USER-GUIDE.md
- /workspace/scratch/6fb62b93ef4d/pipeline-final/tools/art-refresh/wearable/rig/CLAUDE-HANDOFF.md

## Publication status / exact blockers
Automatic approval review rejected creating a remote tree containing the new runtime look assets, generated registry, HTML cache reference and CI workflow. Stated reason: earlier instructions reserved game integration for Claude and prohibited publishing unfinished art. **Do not bypass that rejection.** A review-only source/art package excluding runtime/workflow changes was being prepared when the execution environment became unavailable.

Some immutable blob uploads may have completed, but there is no verified full pipeline branch/PR. Inspect object SHAs from the local upload inventory before retrying; do not assume a call completed. The older prototype remains PR #347; the separate chest shoulder correction is PR #349. This checkpoint does not supersede either with a completed release.

Next: regain access to the preserved workspace, finish the review-only upload, obtain explicit resolution of the runtime-publication approval block, run the full browser test on a machine with Chromium, then integrate/release. No source hero regeneration is needed for the working closed-helmet overlay path. New gauntlet style slots and a true bare-scalp/open-face actor are separate unfinished work.
