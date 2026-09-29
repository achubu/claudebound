# Fixed cast

- `protagonist.jpeg`: user-provided male main character. Used on the start screen, character sheet, and in the world. Display name remains Adventurer until the author supplies a name.
- `story-character.jpeg`: user-provided female character, reserved for future story implementation. Not selectable or spawned.

Original JPEG references are preserved unchanged. Their checkerboard backgrounds are baked into the images, not transparency. The world uses `protagonist-walk.png`, a transparent 4×4 animation sheet generated from the male reference. Rows: down, left, right, up. Columns: neutral, step, neutral, opposite step. Walking advances at 120 ms per frame only while position changes; idle retains facing and gently breathes. Menus, battles, and collisions stop the gait. Story names, dialogue, and relationships are intentionally undefined.

Generated with the built-in image-generation tool. Prompt: create a transparent 4×4 pixel-art walking sheet matching the reference male, with down/left/right/up rows, neutral/step/neutral/opposite-step columns, consistent alignment, blond hair, navy polo, tan trousers, brown shoes and tool belt, and cyan wrist device; omit floating hologram panels, checkerboard, text, and grid lines.
