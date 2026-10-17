# Card illustration refresh

Replaces the procedural emblems imported from Claudebound with detailed
pixel-art scenes. Images are generated with the built-in image generation tool,
then packaged as 512 × 512 WebP files with `tools/art-refresh/package.py`.

Exact prompts, output paths, references where used, and completion status are
tracked in `tools/art-refresh/prompts.json`. The original style reference is
`assets/cards/level0/strike.png`: crisp pixel clusters, richly shaded materials,
dark navy shadows, jewel-tone magic, and atmospheric cyan/violet lighting.

## Current status — 2026-10-17

**70 unique illustrations complete; 21 original prompts remain pending.**
The latest batch adds 17 upgrades, completing the four-stage sets for Wildfire,
Rootbind, Tidecall, Verdant Pact, Tempest Surge, and Storm Battery.
The previous 26-image batch includes base replacements and all ten side cards.
Thirteen upgradeable cards now have complete four-stage sets.

Shared artwork resolvers use the completed stages in battles, decks, and the
compendium. Pending stages continue to reuse their completed base illustration.

## Remaining work

1. Generate levels 1–3 for Mirrorguard, Prism Lance, Arc Bulwark, Lunar Edict,
   Phantom Resonance, Sovereign Gale, and Tidebound (21 illustrations).
2. Replace all four stages of the seven Chronospire designs: Temporal Barrage,
   Delayed Bulwark, Clockwork Volley, Rewind Mend, Accelerate, Chrono Spike,
   and Future Sight (28 illustrations, outside the original prompt manifest).

**49 illustrations remain in total**, including Chronospire.
Generation hit its usage limit before Mirrorguard level 1; the reported reset
is October 18, 2026 at 10:59 AM EDT.

Stop on the first usage-limit response and retain every successful output.
After each batch, visually review the images, update the completion statuses
and shared resolvers, check all card and side-card paths, run the existing tests,
and verify rendering. Refresh the card script versions in `index.html` and
`compendium.html`, the side-deck script version, and the compendium iframe URL.

Maps, movement, card effects, progression, and saved-game data are outside this
artwork pass. The older `generate_*_card_art.py` scripts create the superseded
PNG emblems and should not overwrite the new illustrations.
