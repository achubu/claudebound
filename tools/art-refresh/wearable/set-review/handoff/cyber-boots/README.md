# cyber-boots: armor-set polish

Slot: boots. Existing item IDs and clean requirement are in manifest.json. Read ../../README.md first. This updates the existing look; no new item or design.

No cleaned.png. Overlay uses only existing accepted garment material to close the small exposed clothing gaps.

Claude's import:

    python3 tools/wearable_add.py --from tools/art-refresh/wearable/set-review/handoff/cyber-boots --review /tmp/cyber-boots-set-review

Import all three supplied looks and run --check plus runtime equip/save/world tests. No runtime changes or deployment are included here.
