# Neon Helm — ready for Claude's integration test

Look: neon-visor. Slot: helmet. Item: neonVisor. overlay.png is helmet-only, 2304x1024 RGBA, all 36 poses. cleaned.png IS REQUIRED: it recolours only the original soft head perimeter (4985 pixels), keeps original alpha exactly, and prevents original hair-colour fringe. Original actor file and uncovered face/body pixels are unchanged. The Aetherlink remains clear.

The source-atlas.png has separately drawn down, left, right and up views. Build records and size proofs are included. This closed-face design follows the existing head silhouette: no added crest or horns.

Checks completed against main 0121334f09e91d7a064bb199ef781da41c519437:
- Latest wearable_add.py --dry-run passes all 36 frames, no pixels outside the permitted outline, no key-colour residue or Aetherlink overlap.
- Original base SHA-256 pinned; uncovered preview pixels identical. Cleaned alpha exactly original.
- Live Gear Studio: every check passes, helmet-template coverage 97%, 4985 recoloured edge pixels. Manifest downloaded from Studio. Reviewed four directional walk previews with cyber pants/boots/chest/belt/gloves equipped.
- Inspected 256px and 84px directional proofs. Previous visible hair-edge fringe is resolved by the required clean patch.

The CLI full-outfit review's 814 red pixels are its aggregate khaki-trouser/brown-shoe heuristic, NOT hair or helmet pixels (OLD_CLOTHES contains only pants/boots). This is an existing armor-stack diagnostic to inspect separately, not a failed helmet check.

Reproduce:

    python3 tools/art-refresh/wearable/rig/prepare_gear.py --atlas tools/art-refresh/wearable/neon-visor/source-atlas.png --slot helmet --look neon-visor --items neonVisor --out tools/art-refresh/wearable/neon-visor

Claude's import:

    python3 tools/wearable_add.py --from tools/art-refresh/wearable/neon-visor --review /tmp/neon-visor-review
    python3 tools/wearable_add.py --check

Claude handles live equip/unequip, save/load and world-change tests. This handoff changes no runtime files and is not deployed. Only Neon Helm is delivered here; the five other world helms remain separate art requests.
