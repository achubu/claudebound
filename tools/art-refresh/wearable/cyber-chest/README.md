# Cyber chest — shoulder correction

Look cyber-chest; slot shirt; items sunwovenShirt, timewornShirt. overlay.png is 2304×1024 RGBA, 36 original 256px cells, rows down/left/right/up. No cleaned.png.

Shoulder-only correction extracted from independently generated views, clipped to original navy shoulder pixels and the reviewed shirt template. Front/back straps extend toward the shoulder seams; side views have filled, curved shoulder caps instead of the floating open rings/vertical cut. The accepted center/lower vest artwork is retained. All original hero pixels outside the overlay, including head/face, remain byte-identical when composited. No whole-hero replacement is used.

Base: assets/characters/protagonist-walk9-base.png, SHA256 a1317e9671b0da27e75edee3268cc6a6723ccc140c8b1bdac3f48ee7ea00ba2f. Reviewed against main afc76fd870bbf5ac479f0093ef1ae387db813d97.

Latest wearable_add.py --dry-run PASS. Gear Studio at https://aethercede.com/gear/ passes all checks: 36 frames, zero edge pixels, nothing outside hero, no key color, Aetherlink clear, 100% within shirt template. Both shirt IDs selected, manifest.json downloaded from the page. Full-outfit review inspected there; native 256px and 84px proof strips reviewed offline. review.png is a compact all-frame upper-body proof. Structural pass is not a substitute for Claude's final animation/acceptance review.

Claude: python3 tools/wearable_add.py --from tools/art-refresh/wearable/cyber-chest --review /tmp/cyber-chest-review . Own integration and live tests; no runtime edits or round number in this handoff. This remains fitted to the current beltless base; the new bald/bare-arm neutral-base experiments are rejected and must NOT be imported.
