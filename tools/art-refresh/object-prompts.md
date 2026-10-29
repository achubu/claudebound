# Map object images still needed (Round 290 playtest)

Found by rendering every room of all six worlds and stepping onto every interactable (153 objects).
Everything works; this list is only about **looks**. Objects below are either drawn as a bare emoji
glyph in a circle (no image at all) or share one generic image with many other objects.

Existing object art to match: `assets/items/poi/*.webp`. These are single objects in detailed pixel art,
in a three-quarter top-down view, about 256 px, on a transparent background.

## Shared style (put this in front of every prompt)

> Detailed pixel-art game sprite of a single object, three-quarter top-down view (like a cozy isometric
> RPG), centered, crisp dark outlines, rich shading with dark navy shadows and small glowing accents,
> readable at 48 px. Plain flat bright green (#00FF00) background with no shadow or ground tile on it,
> no text, no border, square image.

The green background gets keyed out when the image is wired in (as with the creature sheets).

## 1. No image yet (drawn as an emoji glyph)

### Cardsmith (5 worlds, `⚒` glyph). Only Solaris has one (`sol-cardsmith.webp`)

A single generic `cardsmith.webp` would cover all five. One per world fits each world better:

| File | World | Subject |
|---|---|---|
| `cardsmith.webp` (generic, enough on its own) | all | A small blacksmith's stall for magic cards: a sturdy wooden workbench with an anvil, a glowing forge, tongs and a fan of shimmering cards on the bench, a canvas awning overhead. |
| `city-cardsmith.webp` | Neon Aftermath | A cyberpunk street forge kiosk built from scrap metal and a shipping crate, neon-cyan sign shaped like an anvil, a glowing plasma forge, holographic cards hovering over the anvil, cables everywhere. |
| `sky-cardsmith.webp` | Sky Isles | A floating workshop platform of white stone and brass with a small sail awning, a wind-powered forge with spinning vanes, an anvil with feather-shaped tools, glowing cards fluttering above it like birds. |
| `wilds-cardsmith.webp` | Elaris (forest) | A forest forge built into a mossy tree stump, an anvil wrapped in roots, a glowing green ember forge, cards hanging from vines like leaves, mushrooms and lantern light. |
| `vespera-cardsmith.webp` | Vespera | A storm-coast forge on a weathered pier plank, a lightning rod channeling a crackling bolt into an anvil, wet slate-blue stone, glowing violet cards, a tarp flapping in the wind. |
| `chronospire-cardsmith.webp` | Chronospire | A clockwork forge of bronze gears and a pendulum, an anvil with a clock face set into it, glowing amber cards orbiting slowly, tiny floating cogs and sand. |

### Lore stones (4 worlds, glyph). City (`terminal.webp`) and Solaris (`sol-sundial.webp`) have theirs

| File | World | Name | Subject |
|---|---|---|---|
| `sky-lore.webp` | Sky Isles | Wind Chime | A tall white stone post on a small cloud-edged rock, hung with long glass and brass wind chimes, faint glowing runes along the post, ribbons streaming sideways in the wind. |
| `wilds-lore.webp` | Elaris (forest) | Elder Stone | An ancient standing stone covered in moss and carved glowing green runes, roots curling around its base, small mushrooms and fireflies. |
| `vespera-lore.webp` | Vespera | Storm Glyph | A dark slate obelisk on wet rock with a large carved lightning glyph glowing electric violet, small arcs of lightning crawling over it, rain-slick surface. |
| `chronospire-lore.webp` | Chronospire | Chrono Inscription | A bronze-and-marble plaque on a short pedestal, engraved with a clock face and glowing amber script, a small floating hourglass above it, drifting golden sand motes. |

## 2. Sharing one generic image (`event.webp`, a "?" pedestal)

Every event in every world uses the same picture. Each could have its own. Files go in
`assets/items/poi/events/<id>.webp`.

| File (id) | World | Name | Subject |
|---|---|---|---|
| `terminal` | Neon Aftermath | Abandoned Terminal | A cracked public terminal on a scrap stand, flickering red security prompt on the screen, sparking wires, a toppled stool. |
| `medic` | Neon Aftermath | Street Medic | A burned-out kiosk turned into a tiny clinic, a white cross sign glowing teal, a cot, bandages and potion bottles on a crate. |
| `vending` | Neon Aftermath | Busted Vending Machine | A dented neon vending machine with cracked glass, glowing red and green potion bottles inside, one hanging half out of the slot. |
| `courier` | Neon Aftermath | Lost Courier | A sealed parcel with glowing tape lying next to a crashed delivery drone with a bent rotor, a blinking light. |
| `spring` | Elaris (forest) | Moonlit Spring | A small clear pool between mossy roots, silver moonlight shimmering on the water, a few lily pads and drifting motes of light. |
| `ranger` | Elaris (forest) | Wounded Ranger | A hooded ranger sitting against a tree trunk with a bandaged arm, bow and quiver beside her, a small campfire glow. |
| `seedpod` | Elaris (forest) | Glowing Seedpod | A lantern-sized seedpod on a thick stem, its translucent shell pulsing with green-gold Aether light. |
| `vines` | Elaris (forest) | Strangling Vines | A leather satchel half swallowed by thorny dark vines, something glinting gold inside. |
| `updraft` | Sky Isles | Updraft Well | A round stone opening in a floating island with warm golden air rising out of it, feathers and leaves spiralling upward. |
| `aerie` | Sky Isles | Abandoned Aerie | A huge twig nest as wide as a cart on a rocky ledge, lined with lost travellers' things: a lantern, a satchel, a few coins. |
| `chimes` | Sky Isles | Singing Chimes | A bare white dead tree hung with hundreds of small glass chimes, soft blue glow, all swaying the same way. |
| `starwell` | Sky Isles | Starwell | A small round pool in white stone that reflects a starry night sky even though it is day, little stars glittering in the water. |
| `shelter` | Vespera | Storm Shelter | A small glass dome shelter on wet rock, warm light inside with a bedroll and lockers, rain streaking the glass. |
| `conduit` | Vespera | Humming Conduit | A cracked metal conduit pipe sticking out of wet stone, raw violet electricity arcing out of the crack. |
| `scavenger` | Vespera | Glass Scavenger | A hunched scavenger in a long coat and mirrored goggles beside a cart of glass shards and salvaged crystals. |
| `prism` | Vespera | Echoing Prism | A tall crystal prism on a stone base, rainbow light inside it and a faint ghostly afterimage beside it. |
| `clockmaker` | Chronospire | Clockmaker's Bench | A workbench covered in tiny gears, springs and a half-built pocket watch, a magnifying lamp glowing warm. |
| `paradoxPool` | Chronospire | Paradox Pool | A circular pool framed in bronze clockwork, its water swirling like a clock face, shimmering with amber light. |
| `sandglass` | Chronospire | Giant Hourglass | A giant hourglass in a bronze frame, glowing golden sand flowing upward. |
| `echoes` | Chronospire | Echoing Corridor | A short archway of bronze and marble with several fading ghostly copies of the arch behind it, like an echo in stone. |

Solaris uses the four forest events too (`spring`, `ranger`, `seedpod`, `vines`), which don't fit a desert city.
Desert events of its own would need new event designs as well as art.

## 3. Optional: world variants of shared objects

| Object | Now | Worlds sharing it |
|---|---|---|
| Hidden loot chest | `assets/items/loot-chest.png` (Solaris has `sol-chest.webp`) | Neon Aftermath, Sky Isles, Elaris, Vespera, Chronospire |
| Wandering Merchant | `merchant.webp` (Solaris has `sol-merchant.webp`) | the same five |
| World portal | `assets/environment/elaris-portal.png` (Solaris has `solaris-portal.webp`) | Sky Isles, Elaris, Vespera, Chronospire |

Once images are delivered they need wiring in (`POI_ART` / `SOLARIS_POI_ART` in `assets/pickups.js` and
`assets/cardsmith.js`, plus a per-event and per-world lookup).
