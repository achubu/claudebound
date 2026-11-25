# Remaining armor: cyber-gloves preparation

The belt is integrated (Claude Round 554); boots PR #319 is conformed to the current wearable process. Chest art is on branch `codex/cyber-chest-wearable` (PR creation hit a connector error). Pants are supplied by this handoff.

Gloves are the only remaining ungenerated piece. A generation attempt returned usage_limit_reached; no glove image was created. Reported reset epoch: 1795626927. Verify tool availability with an actual authorized glove generation after that point; do not claim generated artwork before success.

Next glove look:
- Look `cyber-gloves`, slot `gloves`.
- Existing IDs `ember, thornhideGloves, tempestGloves`, one shared gunmetal/cyan style, preserving names/stats.
- Short fingerless tactical gloves only on the original hands; no forearm cuff, no replacement Aetherlink. Leave original anatomical left forearm entirely untouched.
- Deliver `tools/art-refresh/wearable/cyber-gloves/overlay.png` (2304 × 1024 RGBA, all 36 cells), optional cleaned.png only if required (original source only), README and optional proofs. No game code/assets writes or round number.
- Start from original `assets/characters/protagonist-walk9.png`, SHA-256 `5c0e6e4f834f317f193e33202700ae7dbb94e0570a5c2924d48c0a079400fb42`.
- `Gloves-Preparation.zip` contains preliminary hand regions/masks and their source script for all 36 frames. These are preparation aids, not validated glove art. Inspect every region against the original: far hands may be occluded and need no invented fingers. Retain the original finger silhouette.
- Use image generation for glove design, then frame fitting/proof checks. Run latest wearable_add.py check_look with the three correct IDs in an isolated fixture before handing off; Claude performs runtime integration and game tests.
