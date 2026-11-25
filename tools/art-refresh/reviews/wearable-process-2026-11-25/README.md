# Wearable gear: code and workflow review for Claude

Reviewed November 25, 2026 against main `6961365800c058677b39dca47bab76e4212dd6d2` (Round 555). Fetch main again before implementing. Scope: `assets/hero-wear.js`, `tools/wearable_add.py`, `tests/hero-wear.test.cjs`, generated registry, and the current wearable-gear contract. **Review and reproducible probes only; no fixes or runtime changes.** Claude owns code, Codex owns art.

## Keep the existing architecture

Keep original hero registration, per-slot overlays/clear patches, one composition per outfit change, unchanged animation timing, and independent left-arm Aetherlink. The renderer already has a four-entry composed-sheet cache, versioned look keys, a plain-hero fallback and a token preventing an old async result from replacing the current outfit. Do not propose these as missing features.

The largest workflow saving is to reuse a verified slot template and masks instead of regenerating full characters and rediscovering registration for each item.

## Priorities

| Priority | Work | Evidence | Acceptance |
|---|---|---|---|
| 1 | Enforce spatial/alpha rules in the art validator | Synthetic invalid art passes today; probes below | Reject forbidden slot edits, Aetherlink edits, faint background and placeholder frames |
| 2 | Centralize outfit URL ownership and disposal | Offline async probe leaves five live URLs with four cached outfits | Repeated races/evictions leave no URLs outside cache/current/pending ownership |
| 3 | Add recoverable load/encode state | Transient image error is remembered for session; null blob stalls same-key redraws | Bounded retry or explicit retry can recover without endless redraw retries |
| 4 | Validate full stacked outfits before handoff | Individual structural checks cannot detect clear-patch/neighbor-slot seams | Solo, pair and full-set proofs, plus rendered integration tests |
| 5 | Reuse decoded assets and deduplicate pending outfit builds | Source observation: each uncached outfit creates fresh Images for base and all layers | One in-flight build per key; bounded decoding cache; stale work avoids needless encoding |
| 6 | Use a single source manifest and versioned fitting templates | Current IDs/paths/commands are duplicated between README, CLI and handoffs | One import command; source-sheet hash and slot masks are checked |
| 7 | Make validation read-only and registration transactional | --check rewrites the registry before returning failure | Failed checks/imports leave the working tree unchanged |

## 1. Structural validation currently does not enforce the whole art contract

**Reproduced using the unmodified latest check_look in an isolated fixture.** The included `repro-validator.py` deliberately supplies invalid synthetic input, without writing assets. Each case is accepted with zero outline violations:

- one opaque magenta pixel on the head in each frame, declared as boots;
- one alpha-1 pixel in empty space per frame;
- a full-sheet magenta image with alpha 60;
- magenta pixels on the bright left-arm tech region, declared as boots;
- a cleaned source repainting 81,160 visible head-region pixels, supplied as a boots clear patch, with original alpha unchanged.

Why: occupied-frame validation only tests max alpha != 0; outline counting only tests overlay alpha > 60 and hero alpha < 128; no slot masks, color-fringe check, protected-Aetherlink mask or slot-specific cleaned-image delta mask is consulted. The cleaned-source check enforces alpha identity, not which body regions changed.

These are validation gaps, **not evidence that current integrated art contains those deliberate defects**. Earlier art handoffs passing this function establish grid/occupancy/outline checks only; independent masking and visual inspection remain necessary.

Recommended additions:

1. Commit calibrated per-slot allowed regions and separate immutable Aetherlink/face/foreground masks for all 36 poses, pinned to the original hero sheet's hash. Reject overlay and cleaned-source deltas outside the allowed regions. Masks must accommodate legitimate equipment occlusion; do not use an unreviewed color threshold as their source of truth.
2. Check meaningful per-frame alpha coverage, with slot-appropriate limits rather than a single arbitrary pixel count. Some far-side items can be mostly occluded, so reviewed per-frame expectations are better than identical thresholds.
3. Count all nonzero outside-region alpha, report the offending cells and alpha-weighted area, and allow antialiasing only in a narrow silhouette band. A global 2,000-pixel allowance should not permit remote opaque fragments, and the alpha-60 boundary must not permit a sheet-sized translucent matte.
4. Flag color-matte pixels, isolated components, unexplained clean-patch edits and failed source hashes. Legitimate colored gear can exist: distinguish edge-connected matte from intentional details rather than banning cyan/magenta everywhere.
5. Emit a diagnostic PNG showing rejected pixels and row/column, so Codex can correct the actual mask rather than iterate blindly.

## 2. Stale async completion can orphan the active blob URL

**Reproduced by `repro-renderer.cjs`, using the real renderer with controlled Image/toBlob callbacks.** The fixture provides six synthetic look keys to exercise future multi-slot outfits; current main has only the belt look, so this is a latent scaling issue as more looks are integrated.

Repro sequence:
1. Compose A; start B, C, D, E and F.
2. Complete B/C/D, then F; cache holds B/C/D/F.
3. Select cached B.
4. Stale E finishes. FIFO eviction deletes B but deliberately skips revoking its currently displayed URL.
5. Select cached C. B is no longer current, no longer cached, and nothing owns a later revoke.

Result: six URLs created, one revoked, **five live URLs with only four cache entries**. Stale callbacks can also overwrite a cache entry for the same key without disposing its previous URL.

Fix direction: one owner/disposal function for cache and active URL references, or pin the active entry during eviction and dispose it when ownership ends. Deduplicate in-flight keys; skip or safely dispose stale results. If implementing LRU, promote entries on cache hit; the current map is FIFO. Do not revoke a URL while it is still displayed.

Regression checks should model callback order, A→B→A before completion, hits during eviction, stale errors, unequip and teardown. Actual browser resource profiling should follow; this probe demonstrates ownership/control flow, not measured mobile memory usage.

## 3. Load failure and null-blob recovery

**Reproduced by the renderer probe.**

- Image failure: the first request loads two fixture images and fails one. Reapplying the same outfit loads no additional images because heroWearFailed remembers the key. Even an unequip/re-equip cannot retry that failed key during the session. The base-hero fallback is safe, but a temporary offline/HTTP failure becomes a session-long cosmetic failure.
- Null toBlob result: the callback returns immediately, leaving heroWearKey equal to the requested key, heroWearUrl null and no failure record. Same-key redraws never retry. A change to a different outfit key and back can restart it; unlike the image-failure case, reload is not the only recovery.

Use explicit idle/loading/ready/retryable-failure state, bounded retry/backoff, and an explicit retry opportunity such as online recovery or a gear selection. Avoid a network retry on every world redraw. Handle encode failure and thrown errors from deferred callbacks consistently.

## 4. Require stacked proofs and widen integration coverage

The current importer proves one look over the original hero, and the current test is intentionally belt-focused. It does not establish that later pants, boots, chest and gloves compose correctly together.

Our pants preparation exposed a real workflow seam: the belt's clear patch revealed original tan hip cloth through holes left for the old pouch in a dark pants overlay. The solo pants validator could not detect it. It was caught in the combined outfit proof, not in a live game run.

Generate solo proofs, each relevant pair, and the full current set with the **same clears-first / overlays-in-slot-order algorithm as runtime**. Include cleared-only views and light/dark backgrounds. For five shared slot looks, there are 32 visual on/off combinations including plain, even though the gear IDs have 432 possible equipped/none combinations. Deduplicate proof/cache work by visual look key; the runtime key already does this.

Test every item ID's mapping, pairwise stacking, all five together, rapid switching, failures of one layer, save/restore/import, world redraw and independent Aetherlink protection. Verify a broken look cannot produce a partially applied clear patch that erases clothing without its overlay.

The browser test currently exits successfully when :8123 is unavailable and can skip the reload assertion if gear is absent. This is explicit development behavior, not proof CI currently skips it. Add a required-browser CI mode where either situation fails, while retaining an explicitly optional local mode. Record which phases actually ran.

## 5. Avoid repeated decode and obsolete composition work

Source observation, not a performance benchmark: every uncached outfit creates fresh Image objects for the base and all clears/overlays, waits for all, then draws and PNG-encodes even if its token is already stale. Only URL publication is token-guarded. Browser HTTP/decoded caches may mitigate this; do not equate new Image objects with guaranteed repeated network downloads.

- Memoize bounded image/decode promises by source URL + art version.
- Deduplicate pending outfit builds by outfit key.
- Recheck token/need before allocating a canvas or calling toBlob; do not encode an obsolete outfit just to discard it unless useful speculative caching was explicitly chosen.
- Benchmark cold/warm gear change latency and rapid switching on representative phones before optimizing encoding.

One raw 2304×1024 RGBA surface is 9 MiB; four raw composed surfaces are 36 MiB, excluding decoded input layers, encoded blobs and GPU copies. These are calculated surface sizes, not measured retained browser memory. Consider a byte budget as well as an entry count. A later experiment could compose at display size × DPR, capped at the 256px master cell, while keeping master assets unchanged; verify sharpness before adopting any downsampling.

## 6. Faster, more reproducible art delivery

Add a machine-readable source manifest beside overlay.png with look, slot, item IDs, source hero hash, art revision and whether cleaned.png is present. Let one import command read it and generate README/registry metadata. This removes repeated transcription of IDs and command arguments.

Keep versioned fitting templates outside runtime:
- 36 registration records for each slot;
- calibrated foreground and Aetherlink protection masks;
- original-clothing coverage masks;
- shared edge/alpha processing;
- proof generation and diagnostic reports.

Generate a new item's design/views once, then fit against the existing template. Do not regenerate the protagonist or derive new masks from image colors for every look: our pants/skin overlap corrections show why that is brittle. New silhouettes may still need manual adjustments; do not promise a universal automatic fitter.

Run one preflight that checks source hash, canonical paths, item IDs, slot masks, transparency, coverage, cleans and stacked proofs. Codex hands over art and the report; Claude runs the importer and runtime tests. Preserve this division of responsibility.

## 7. Read-only checks and atomic imports

**Reproduced in a temporary fixture:** an outdated registry plus --check exits 1 **and rewrites the registry**. The current code calls rebuild() during check and compares afterward. A validation command should compute the expected text in memory and compare without writing. Reserve mutation for --rebuild.

Source observation: a normal add writes overlay, clear, look.json and registry sequentially before proof generation. Stage outputs in a temporary directory and publish atomically after all validations succeed. Failed registration should not leave half of a look or a bumped revision.

Use content hashes to avoid version bumps for unchanged art when appropriate; retain deliberate versioning when output pixels or mapping really change. Add --dry-run / --validate-source so Codex can use the exact full import checks without producing runtime assets in a copied fixture.

## Reproduce and limitations

At the pinned baseline, from the repository root:

```sh
node tools/art-refresh/reviews/wearable-process-2026-11-25/repro-renderer.cjs
python3 tools/art-refresh/reviews/wearable-process-2026-11-25/repro-validator.py
```

The scripts intentionally assert the observed failure modes; once fixed, those assertions should fail and be replaced by ordinary regression tests that assert the corrected behavior. Do not add these intentionally failing-art probes to the main test suite unchanged.

Renderer probes use mocked image/canvas callbacks and synthetic look data, not a live browser or real PNG encoding. Validator probes use the real original hero/gear data and synthetic invalid arrays without writing runtime assets. They do not test a production attack or claim current art is defective. No browser playtest, mobile benchmark or full gameplay suite was run for this review.

Recommended implementation sequence: stronger source validation and diagnostics → URL ownership/retry regression tests → stacked proofs and required-browser CI → shared fitting templates/manifest → measured decode/memory optimization. Ship small changes separately; keep the original hero and movement unchanged.
