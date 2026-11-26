# cyber-gloves: armor-set polish

Slot: gloves. Existing item IDs and clean requirement are in manifest.json. Read ../../README.md first. This updates the existing look; no new item or design.

REQUIRED cleaned.png restores original fingers. Overlay is the unchanged integrated glove art. Original base alpha stays identical.

Claude's import:

    python3 tools/wearable_add.py --from tools/art-refresh/wearable/set-review/handoff/cyber-gloves --review /tmp/cyber-gloves-set-review

Import all three supplied looks and run --check plus runtime equip/save/world tests. No runtime changes or deployment are included here.
