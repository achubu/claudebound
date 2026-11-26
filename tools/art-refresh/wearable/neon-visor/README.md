# Neon Visor fitting candidate

Generated four-view source atlas and fitted helmet-only overlay for neonVisor.
Status: REVIEW CANDIDATE, not production approved. No runtime files changed.

All 36 frames pass latest wearable_add.py dry-run. Actor base is hash-locked; no cleaned actor is supplied and original uncovered pixels are unchanged. Original anatomical left Aetherlink remains untouched. Independent front, left, right and back source views are retained.

Visual limitation: the existing helmet mask clips the equipment to the original head silhouette. Small hair fringes remain at the perimeter; validator review reports 814 old-clothing pixels. This needs helmet-mask/coverage review before live integration. Do not treat validator success as visual approval. The fixed clipping method also loses portions of the source helmet silhouette and is unsuitable for protruding crests.

Rebuild from repo root:

    python3 tools/art-refresh/wearable/rig/fit_atlas.py tools/art-refresh/wearable/neon-visor/source-atlas.png tools/art-refresh/wearable/neon-visor --slot helmet --look neon-visor --items neonVisor
    python3 tools/wearable_add.py --from tools/art-refresh/wearable/neon-visor --dry-run --review /tmp/neon-visor-review

Claude owns integration after visual approval. No in-game test or deployment was performed for this candidate.
