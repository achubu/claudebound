# Handoff to Claude — November 26, 2026

Baseline main: 0121334f09e91d7a064bb199ef781da41c519437. No game code, assets/, workflows or round numbers changed.

## Ready

1. Neon Helm (neonVisor), tools/art-refresh/wearable/neon-visor: finished fitting, required cleaned.png soft-edge patch, source atlas, Studio-downloaded manifest and proofs. All 36-frame CLI checks and live Gear Studio checks pass. Studio reviewed with the other five armor slots equipped. Import command is in its README. Claude owns live game integration/equip/save tests.
2. Reusable directional-parts preparation: fit_atlas.py, calibrate.py and prepare_gear.py, with six hash-pinned part profiles, generation prompts and guides. Four input images or one atlas become overlay/manifest/proofs and validated handoff in one command. No manually authored per-frame recipe is required for these calibrated close-fitting designs. See rig/README.md for source layouts and exact limits.
3. Structural tests cover all six slots x36 poses, part/direction correspondence, untouched actor/Aetherlink, deterministic rebuilds, bad source/hash refusal and the validator's exit-zero rejection case. A separate four-input Neon run passed the full CLI dry run as well as the atlas path. The boot-source fitting experiment uses existing art only, not replacement art, and is not shipped as a new look.

## What changed from PR356's first checkpoint

The original head's faint edge pixels lay outside the slot mask. A two-pixel head-perimeter extension plus a minimal colour-only clean patch now removes the hair fringe while keeping original actor alpha. Solid overlay pixels stay within the strict original outline. This is a closed helmet cleanup, not a regenerated bald actor. The 814 old-clothing-colour diagnostic is pants/boots in the existing stacked outfit (see OLD_CLOTHES in wearable_add.py), not hair.

## Scope and remaining art

This supplies the reusable pipeline and Neon Helm. It does not supply a separate bald/bare-arm base, Aetherlink replacement art, or the five other helm designs (Sunforged, Galecrest, Thornward, Stormcaller, Chronoguard). Those remain independent graphics tasks. Paired kits must be symmetric unless anatomical tracks are reviewed. Oversized crests/capes need expanded profiles/validator support. Existing runtime integration is left to Claude, as CHATGPT-NOTES.md requests.
