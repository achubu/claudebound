# Cyberpunk belt — art and implementation handoff

Owner requested the belt to appear when equipped through Gear. Read the new owner-request section of root CODEX-NOTES.md for behavior and acceptance criteria.

## Included graphics
- concept.png: approved standalone belt design.
- front-fitting-draft.png, left-fitting-draft.png, right-fitting-draft.png, back-fitting-draft.png: nine-pose character fitting references in each direction. The right view is the clean opaque-background retry; the rejected corrupt right-view generation is excluded.
- Aethercede-Belt-Template-Kit.zip: standalone offline fitter with embedded original hero and belt concept, editable HTML source, Python packaging script, README, simulated-canvas logic checks.
- checksums.json: original source filenames, byte counts and SHA-256.
- next-item-boots-concept.png: new four-view boots design only, not approved or registered to hero frames.

## What Claude can implement
Use existing equipped belt state and a visual registry/compositor. The ZIP provides editable fit records, per-frame foreground masks, four walk previews and exports at the original hero sheet dimensions. The kit is a development tool, not a game runtime dependency.

## What is NOT supplied yet
There is no fully calibrated, production-ready transparent belt-only 36-frame sheet in this folder. Fitting drafts contain complete heroes and must not replace the original hero sheet. Red fringe exists on some transparent drafts; right-facing draft is opaque. The fitter's per-frame anchors are estimates and side/back artwork crops are placeholders. Codex still owns final graphic preparation and in-motion calibration. Do not hide these limitations by treating the kit's provisional default exports as finished art.

The original brown belt and pouch are baked into the hero. Replacement art needs full old-belt coverage or a cleaned base. Keep the Aetherlink on the original anatomical left arm. There are no game-code changes or live asset replacements in this handoff.

## Validation
Offline fitter logic checks passed before packaging. Pixel-accurate fit, real browser exports and live rendering are unverified. Prior browser validation was blocked by a local connection failure. Review original hero animation at game scale before shipping.

The next boots concept is only a design turnaround; additional pose/sole views and per-foot fitting are needed before wearable animation.
