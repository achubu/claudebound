# Gear recipes

One file per gear item, `<itemId>.json` (ids in `assets/gear.js`), made in the Gear Studio's Designer (aethercede.com/gear) and
saved here with its "Save to game" button. The game draws a worn item from its recipe (`assets/gear-recipe.js`), in place of
the item's drawn look; a missing or broken recipe falls back to the drawn look. `tests/gear-page.test.cjs` checks every file here.
See `tools/art-refresh/wearable-gear.md`.
