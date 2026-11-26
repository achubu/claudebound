# Cyber boots — corrected overlay

Look: cyber-boots. Slot: boots. Item IDs: boots, cloudstepBoots.

2304 × 1024 RGBA, 4 rows down/left/right/up, 9 cells per row. No cleaned.png. Fit on protagonist-walk9-base.png, SHA256 a1317e9671b0da27e75edee3268cc6a6723ccc140c8b1bdac3f48ee7ea00ba2f.

Only right-facing row 2, frames 3 and 7 (idle counted as 0) have changed. The rear ankle transitions use a newly generated rounded collar instead of the rectangular paste edge; forward boots, soles and other 34 cells are unchanged. fix-proof.png shows both repaired poses.

Latest tools/wearable_add.py from main 562377a1c25ccc72dd153aa94adc3b516e63daf7 passed --dry-run in isolated fixture for this look and these item IDs. Proofs inspected at 256 and 84. Claude owns import, full-outfit equip/save/world tests and release. No runtime assets, code or round number changed here.

Import: python3 tools/wearable_add.py --look cyber-boots --slot boots --items boots,cloudstepBoots --overlay tools/art-refresh/wearable/cyber-boots/overlay.png --dry-run --proof /tmp/cyber-boots-fix

After review omit --dry-run to import. Both revised overlays should be tested together. Original source pixels outside garment regions are retained; Aetherlink and original hands are excluded.
