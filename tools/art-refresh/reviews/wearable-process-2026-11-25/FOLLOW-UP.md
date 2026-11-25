# Additional pipeline investigation

Reviewed after the initial handoff, against the same Round 555 baseline. No implementation changes.

## Manifest integrity before any write
A direct offline call to `check_look` accepts both an empty item list and `['boots','boots']` without problems. The ordinary import path uses that function; therefore `--items ,` can create art that maps to no item, and duplicate IDs can be imported. The later `--check` loop detects the repeated ID, creating inconsistent import/check behavior. Reject empty and repeated item IDs at import time and validate existing manifests with the same schema. Require a known slot, nonempty unique IDs, positive integer art revision and explicit clear-patch flag. Give filename/field-specific errors rather than uncaught KeyError/type exceptions. This is authoring robustness, not evidence of malformed production data.

## Deployment/version consistency
Art URLs use renderer version plus look revision; index.html's registry query version is a separate manual deployment step documented in wearable-gear.md. Forgetting the latter can leave a client on an old registry even though new art exists. Generate a small deterministic release manifest with registry digest, base-hero digest and look pixel hashes. Have release validation verify that the HTML registry reference changed when generated registry bytes changed. Keep new registry and all referenced art in the same release. Retain old versioned URLs long enough for existing clients. This is a proposed guard against human error, not a reproduced live caching failure.

## Validate browser inputs too
The importer enforces sheet dimensions, but the runtime derives its canvas size from the loaded base and draws overlays at natural size without checking their dimensions. A misplaced or incorrectly deployed asset can therefore yield a successfully cached, misregistered outfit. Check all loaded image dimensions against the base grid before composition, fall back safely and provide a useful development diagnostic. Reuse retry handling from the primary report; do not poison the key permanently.

## One-command review package
Build a deterministic staging-only command, for example `wearable_prepare --from-folder <look> --out <review-dir>`, that emits:
- validated overlay and optional clear patch, tied to original-hero SHA256;
- machine-readable validation results and artifact hashes;
- solo, relevant pairwise and full-outfit proofs using the actual compositor rules;
- four-direction animation previews at native and game size, with frame labels and fixed timing;
- import command, item IDs, source provenance and explicit approval status.

Keep raw generation experiments outside deployable asset paths. CI should publish review artifacts without promoting them. Production import should consume the reviewed exact hashes. This removes the risk of reviewing a preview and importing a different final PNG. Existing handoff ZIPs are useful; standardize their contents rather than inventing another format per item.

## Calibrated templates and regression fixtures
Maintain one versioned calibration bundle for all 36 original hero poses: slot allowed regions, front-of-item body masks, Aetherlink exclusion, boot contact anchors, waist anchors and direction-specific metadata. Mark human-reviewed exceptions explicitly. Never derive the right arm by mirroring the left. Store a few known-good and intentionally invalid small fixtures so validators can be changed without weakening art rules accidentally.

Use the already-fitted belt/boots/pants/chest as initial regression assets, subject to Claude's acceptance; their existence alone does not mark them production approved. Prioritize glove hand/left-forearm boundaries next. When the hero base changes, fail validation on hash mismatch and recalibrate deliberately rather than silently fitting old masks to new pixels.

## Suggested order
1. Shared manifest schema, read-only preflight and atomic writes.
2. Base hash + spatial masks + rejected-pixel diagnostics.
3. Deterministic review package and exact-hash import.
4. Release reference checks and browser dimension validation.
5. Measure decode/composition latency and memory on target phones before changing renderer resolution or worker strategy.

All speed and deployment suggestions here are proposals; no browser benchmark or production deployment test was performed.
