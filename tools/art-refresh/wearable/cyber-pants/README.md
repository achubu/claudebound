# Cyber pants — corrected overlay

Look: cyber-pants. Slot: pants. Item IDs: galeweavePants, mossweavePants.

2304 × 1024 RGBA, 4 rows down/left/right/up, 9 cells per row. No cleaned.png. Fit on protagonist-walk9-base.png, SHA256 a1317e9671b0da27e75edee3268cc6a6723ccc140c8b1bdac3f48ee7ea00ba2f.

Re-fitted against the beltless base, extending generated trouser material over hip cloth exposed where the old pouch was. Existing accepted leg art is retained; missing coverage and old-pouch hip fabric are filled. fix-proof.png shows all side-view hips with the complete five-piece outfit.

Latest tools/wearable_add.py from main 562377a1c25ccc72dd153aa94adc3b516e63daf7 passed --dry-run in isolated fixture for this look and these item IDs. Proofs inspected at 256 and 84. Claude owns import, full-outfit equip/save/world tests and release. No runtime assets, code or round number changed here.

Import: python3 tools/wearable_add.py --look cyber-pants --slot pants --items galeweavePants,mossweavePants --overlay tools/art-refresh/wearable/cyber-pants/overlay.png --dry-run --proof /tmp/cyber-pants-fix

After review omit --dry-run to import. Both revised overlays should be tested together. Original source pixels outside garment regions are retained; Aetherlink and original hands are excluded.
