# Cyber gloves — Claude integration handoff

- Look: `cyber-gloves`; slot: `gloves`.
- Items: `ember, thornhideGloves, tempestGloves` (one shared look; no stat changes).
- `overlay.png`: 2304 × 1024 RGBA, four independently drawn directions down/left/right/up, nine 256px cells each.
- No `cleaned.png` is needed. This is a short fingerless gunmetal glove, fitted inside the original hand regions; original distal fingers remain visible. Cyan detailing is restrained; the original left forearm Aetherlink supplies the main cyan light.
- Fit base: `assets/characters/protagonist-walk9-base.png`, SHA256 `a1317e9671b0da27e75edee3268cc6a6723ccc140c8b1bdac3f48ee7ea00ba2f`. Verified against main blob `4290c2227b0ee92ae268e2a8d8333f27245e052a`.
- Instructions and validator read from main `8141c47c3c42689b4dd7aa01169efd983a2660dd` (Round 559).
- Original hero SHA256 `5c0e6e4f834f317f193e33202700ae7dbb94e0570a5c2924d48c0a079400fb42`. Preparation masks came from the cyber-gloves-preparation ZIP on codex/cyber-pants-wearable.

## Preparation and verification
Built-in image generation succeeded for a new glove design. The generated full-hero image was **not** used as a replacement hero: glove material alone was registered per cell and extracted inside the prepared hand masks, eroded away from original silhouettes, with original distal hand regions retained. No view was mirrored. Cyan tech regions and a 2px margin were excluded. All transparent overlay RGB is zero.

Latest `wearable_add.py --dry-run` passed in an isolated fixture using the exact base, original hero, gear IDs and a default-belt patch reconstructed from their RGB delta. 36/36 cells have 172–419 solid glove pixels. No pixels outside the hand masks or over detected base cyan tech; no change in the silhouette's nonzero-alpha support. Interior alpha can become opaque where the glove is drawn; the source base's RGB/alpha is never edited. This is an overlay, not a cleaned hero.

Proofs at 256px and 84px for all four directions are in `Gloves-Proofs.zip`, with validation hashes and per-cell registration offsets. Reviewed for fit, exposed fingertips, left/right independence and forearm separation. Solo proofs include the default brown belt. Claude should still test the full outfit, equip/swap/unequip, saves and live animation. Structural validation is not a claim of live integration.

## Import
```sh
python3 tools/wearable_add.py --look cyber-gloves --slot gloves \
  --items ember,thornhideGloves,tempestGloves \
  --overlay tools/art-refresh/wearable/cyber-gloves/overlay.png \
  --dry-run --proof /tmp/cyber-gloves-proofs
```
After review, omit `--dry-run` to import. Claude owns runtime integration and the release round. No runtime code or assets changed in this handoff.

## Generation prompt
Precise-object edit of the base hero: short fingerless charcoal/gunmetal tactical gloves with small steel hand plates and restrained cyan seams; end at wrist, no forearm cuff; retain original fingers, thumb, hand silhouettes, poses, grid, scale and all non-glove pixels; leave anatomical LEFT Aetherlink unchanged; hidden far hands stay hidden; independent directions; transparent background; no shadow/text. Extraction, rather than whole-sheet replacement, enforces the original hero invariants.
