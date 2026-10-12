# Card illustration refresh

Replaces the simple procedural emblems imported from Claudebound with detailed
pixel-art scenes matching the original Cardbound card illustrations.

Generated with the built-in image generation tool. The style reference is
`assets/cards/level0/strike.png`: crisp pixel clusters, richly shaded materials,
dark navy shadows, jewel-tone magic, and atmospheric cyan/violet lighting.

The prompt set, output paths, and completion status are in
`tools/art-refresh/prompts.json`. Generation stopped at the image service's
usage limit after 27 illustrations. The remaining 64 prompts are pending.

Completed four-stage sets: Arc Jab, Breach Spike, Bulwark Bash,
Chain Lightning, and Overclock.

Partially completed sets: Static Shield (0, 2, 3), Thornlash (0, 1, 2), and
Wildfire (1). Their other levels reuse the nearest completed lower stage, or
the first available stage. This affects only the illustration, never stats.
The other 23 card designs, including Static and the ten side cards, retain
their previous artwork until replacement illustrations can be generated.

Completed assets are 512 × 512 WebP files in `assets/cards/level0/` through
`assets/cards/level3/`. The shared `cardArtPath` function supplies them to
battles, deck views, and the compendium.
The rest of the original collection retains its existing artwork and formats.

`tools/art-refresh/package.py` resizes and encodes the generated illustrations
without changing composition. The older `generate_*_card_art.py` scripts create
the superseded PNG emblems; they do not produce the current WebP illustrations.

This refresh does not change map files, movement, card effects, progression,
or saved-game data.

## Follow-up: finish generation when available

The artwork pass is **not complete**. Keep the 64 pending entries in
`tools/art-refresh/prompts.json` open until their generated files have been
visually reviewed, installed, and verified in the game. Do not mark reused
stage artwork as a newly generated illustration.

Resume in this order to cover more card designs before spending the next
allowance on upgrades:

1. Generate base art for the 23 untouched designs: Rootbind, Tidecall,
   Verdant Pact, Tempest Surge, Storm Battery, Mirrorguard, Prism Lance,
   Arc Bulwark, Lunar Edict, Phantom Resonance, Sovereign Gale, Tidebound,
   Static, and all ten side-deck cards.
2. Complete the five missing stages for partially refreshed cards:
   Static Shield 1, Thornlash 3, and Wildfire 0, 2, 3.
3. Generate the remaining 36 upgrade illustrations for the twelve newly
   refreshed upgradeable cards.

Reuse completed illustrations only as temporary fallbacks. Preserve the
existing art for designs still waiting; never point the game at pending files.
Use the original pixel-art reference and the saved prompts. Stop the batch
on the first usage-limit response, retaining all successful outputs.

After each batch, update completion statuses and the shared art resolvers,
check every card level and side-card image reference, run the existing test
suite, and verify live card rendering. Bump the card-data version in both
`index.html` and `compendium.html` when artwork paths change. The two uploaded
map files remain explicitly out of scope.

## Chronospire artwork follow-up

The sync from Claudebound `8ecd90b4` adds seven more card designs:
Temporal Barrage, Delayed Bulwark, Clockwork Volley, Rewind Mend,
Accelerate, Chrono Spike, and Future Sight. Review and replace their
procedural illustrations in a later generation pass, with distinct art for
levels 0–3 (28 additional illustrations). Keep their supplied PNGs until
replacements are generated and verified. These are separate from the
64 pending prompts above; no new images were generated during this sync.
