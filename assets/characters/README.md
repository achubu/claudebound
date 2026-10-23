# Fixed cast

- `protagonist.jpeg`: user-provided male main character. Used on the start screen, character sheet, and in the world. Display name remains Adventurer until the author supplies a name.
- `story-character.jpeg` (now in `unused assets/assets/characters/`): user-provided female character, reserved for future story implementation. Not selectable or spawned.

Original JPEG references are preserved unchanged. Their checkerboard backgrounds are baked into the images, not transparency. The world uses `protagonist-walk9.png` (Round 251), built by `tools/build_hero_sheet.py` from the owner's four 3×3 sheets in `src/` (one per direction). It is a 9×4 sheet: rows down, left, right, up; columns standing, then an eight-frame walk. Walking advances at 85 ms per frame while the hero moves (keys or a tap route; a pause of 0.15 s stops the gait), and facing follows the way he moves; idle shows the standing pose and gently breathes. The earlier generated 4×4 sheet, `protagonist-walk.png`, is in `unused assets/`. Menus, battles, and collisions stop the gait. Story names, dialogue, and relationships are intentionally undefined.

Generated with the built-in image-generation tool. Prompt: create a transparent 4×4 pixel-art walking sheet matching the reference male, with down/left/right/up rows, neutral/step/neutral/opposite-step columns, consistent alignment, blond hair, navy polo, tan trousers, brown shoes and tool belt, and cyan wrist device; omit floating hologram panels, checkerboard, text, and grid lines.
