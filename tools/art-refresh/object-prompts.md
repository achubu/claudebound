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

The green background gets keyed out when the image is wired in, with `tools/key_object.py` (Round 316).

## 1. No image yet (drawn as an emoji glyph)

### Cardsmith (5 worlds, `⚒` glyph). Only Solaris has one (`sol-cardsmith.webp`)

A single generic `cardsmith.webp` would cover all five. One per world fits each world better:

| File | World | Subject |
|---|---|---|
| `cardsmith.webp` (generic, enough on its own) | all | A small blacksmith's stall for magic cards: a sturdy wooden workbench with an anvil, a glowing forge, tongs and a fan of shimmering cards on the bench, a canvas awning overhead. |
| `city-cardsmith.webp` ✅ done (Round 307) | Neon Aftermath | A cyberpunk street forge kiosk built from scrap metal and a shipping crate, neon-cyan sign shaped like an anvil, a glowing plasma forge, holographic cards hovering over the anvil, cables everywhere. |
| `sky-cardsmith.webp` ✅ done (Round 309) | Sky Isles | A floating workshop platform of white stone and brass with a small sail awning, a wind-powered forge with spinning vanes, an anvil with feather-shaped tools, glowing cards fluttering above it like birds. |
| `wilds-cardsmith.webp` ✅ done (Round 308) | Elaris (forest) | A forest forge built into a mossy tree stump, an anvil wrapped in roots, a glowing green ember forge, cards hanging from vines like leaves, mushrooms and lantern light. |
| `vespera-cardsmith.webp` ✅ done (Round 313) | Vespera | A storm-coast forge on a weathered pier plank, a lightning rod channeling a crackling bolt into an anvil, wet slate-blue stone, glowing violet cards, a tarp flapping in the wind. |
| `chronospire-cardsmith.webp` ✅ done (Round 312) | Chronospire | A clockwork forge of bronze gears and a pendulum, an anvil with a clock face set into it, glowing amber cards orbiting slowly, tiny floating cogs and sand. |

### Lore stones (4 worlds, glyph). City (`terminal.webp`) and Solaris (`sol-sundial.webp`) have theirs

| File | World | Name | Subject |
|---|---|---|---|
| `sky-lore.webp` ✅ done (Round 310) | Sky Isles | Wind Chime | A tall white stone post on a small cloud-edged rock, hung with long glass and brass wind chimes, faint glowing runes along the post, ribbons streaming sideways in the wind. |
| `wilds-lore.webp` ✅ done (Round 311) | Elaris (forest) | Elder Stone | An ancient standing stone covered in moss and carved glowing green runes, roots curling around its base, small mushrooms and fireflies. |
| `vespera-lore.webp` ✅ done (Round 341) | Vespera | Storm Glyph | A dark slate obelisk on wet rock with a large carved lightning glyph glowing electric violet, small arcs of lightning crawling over it, rain-slick surface. |
| `chronospire-lore.webp` ✅ done (Round 311) | Chronospire | Chrono Inscription | A bronze-and-marble plaque on a short pedestal, engraved with a clock face and glowing amber script, a small floating hourglass above it, drifting golden sand motes. |

## 2. Sharing one generic image (`event.webp`, a "?" pedestal)

Every event in every world uses the same picture. Each could have its own. Files go in
`assets/items/poi/events/<id>.webp`.

| File (id) | World | Name | Subject |
|---|---|---|---|
| `terminal` ✅ done (Round 314) | Neon Aftermath | Abandoned Terminal | A cracked public terminal on a scrap stand, flickering red security prompt on the screen, sparking wires, a toppled stool. |
| `medic` ✅ done (Round 315) | Neon Aftermath | Street Medic | A burned-out kiosk turned into a tiny clinic, a white cross sign glowing teal, a cot, bandages and potion bottles on a crate. |
| `vending` ✅ done (Round 316) | Neon Aftermath | Busted Vending Machine | A dented neon vending machine with cracked glass, glowing red and green potion bottles inside, one hanging half out of the slot. |
| `courier` ✅ done (Round 317) | Neon Aftermath | Lost Courier | A sealed parcel with glowing tape lying next to a crashed delivery drone with a bent rotor, a blinking light. |
| `spring` ✅ done (Round 318) | Elaris (forest) | Moonlit Spring | A small clear pool between mossy roots, silver moonlight shimmering on the water, a few lily pads and drifting motes of light. |
| `ranger` ✅ done (Round 319) | Elaris (forest) | Wounded Ranger | A hooded ranger sitting against a tree trunk with a bandaged arm, bow and quiver beside her, a small campfire glow. |
| `seedpod` ✅ done (Round 320) | Elaris (forest) | Glowing Seedpod | A lantern-sized seedpod on a thick stem, its translucent shell pulsing with green-gold Aether light. |
| `vines` ✅ done (Round 321) | Elaris (forest) | Strangling Vines | A leather satchel half swallowed by thorny dark vines, something glinting gold inside. |
| `updraft` ✅ done (Round 322) | Sky Isles | Updraft Well | A round stone opening in a floating island with warm golden air rising out of it, feathers and leaves spiralling upward. |
| `aerie` ✅ done (Round 322) | Sky Isles | Abandoned Aerie | A huge twig nest as wide as a cart on a rocky ledge, lined with lost travellers' things: a lantern, a satchel, a few coins. |
| `chimes` ✅ done (Round 323) | Sky Isles | Singing Chimes | A bare white dead tree hung with hundreds of small glass chimes, soft blue glow, all swaying the same way. |
| `starwell` ✅ done (Round 324) | Sky Isles | Starwell | A small round pool in white stone that reflects a starry night sky even though it is day, little stars glittering in the water. |
| `shelter` ✅ done (Round 325) | Vespera | Storm Shelter | A small glass dome shelter on wet rock, warm light inside with a bedroll and lockers, rain streaking the glass. |
| `conduit` ✅ done (Round 327) | Vespera | Humming Conduit | A cracked metal conduit pipe sticking out of wet stone, raw violet electricity arcing out of the crack. |
| `scavenger` ✅ done (Round 328) | Vespera | Glass Scavenger | A hunched scavenger in a long coat and mirrored goggles beside a cart of glass shards and salvaged crystals. |
| `prism` ✅ done (Round 329) | Vespera | Echoing Prism | A tall crystal prism on a stone base, rainbow light inside it and a faint ghostly afterimage beside it. |
| `clockmaker` ✅ done (Round 330) | Chronospire | Clockmaker's Bench | A workbench covered in tiny gears, springs and a half-built pocket watch, a magnifying lamp glowing warm. |
| `paradoxPool` ✅ done (Round 331) | Chronospire | Paradox Pool | A circular pool framed in bronze clockwork, its water swirling like a clock face, shimmering with amber light. |
| `sandglass` ✅ done (Round 332) | Chronospire | Giant Hourglass | A giant hourglass in a bronze frame, glowing golden sand flowing upward. |
| `echoes` ✅ done (Round 333) | Chronospire | Echoing Corridor | A short archway of bronze and marble with several fading ghostly copies of the arch behind it, like an echo in stone. |

Solaris uses the four forest events too (`spring`, `ranger`, `seedpod`, `vines`), which don't fit a desert city.
Desert events of its own would need new event designs as well as art.

## 2b. Neon Aftermath night objects (Round 298, added to this list in Round 333)

The Round 298 city nights added objects after this list was made. World objects go in `assets/items/poi/` (wired
through `WORLD_POI_ART.city`); events go in `events/` (wired through `EVENT_ART`).

| File | Object | Subject |
|---|---|---|
| `city-wanted-board.webp` ✅ done (Round 333) | Wanted Board | A scrap-metal notice board on rusty legs under a dented awning with a red neon strip, three wanted posters with red X stamps. |
| `city-breaker.webp` ✅ done (Round 334) | Breaker Box (3) | A dented utility breaker cabinet on a pole, door hanging open on a big lever switch, sparking fuses and thick cables. |
| `city-vault.webp` ✅ done (Round 335) | Afterlight Vault | A heavy round vault door set into a concrete wall, glowing cyan seams and a dead keypad, locked until the breakers are on. |
| `events/arcade` ✅ done (Round 336) | Arcade Cabinet | A rain-soaked retro arcade cabinet with a glowing screen and joystick under a scrap awning. |
| `events/racer` ✅ done (Round 337) | Drone Racers | Two small scrap racing drones on a chalk-marked start line, a battered trophy and a crate. |
| `events/billboard` ✅ done (Round 338) | Glitched Billboard | A small standing digital billboard with a glitching, pixel-scrambled screen. |
| `events/toll` ✅ done (Round 339) | Gang Toll | A road barricade of tyres, crates and barbed wire with a spray-painted skull and a tin toll cup. |

## 3. Optional: world variants of shared objects

| Object | Now | Worlds sharing it |
|---|---|---|
| Hidden loot chest | `assets/items/loot-chest.png` (Solaris has `sol-chest.webp`) | Neon Aftermath, Sky Isles, Elaris, Vespera, Chronospire |
| Wandering Merchant | `merchant.webp` (Solaris has `sol-merchant.webp`) | the same five |
| World portal | `assets/environment/elaris-portal.png` (Solaris has `solaris-portal.webp`) | Sky Isles, Elaris, Vespera, Chronospire |

Once images are delivered they need wiring in (`POI_ART` / `SOLARIS_POI_ART` in `assets/pickups.js` and
`assets/cardsmith.js`, plus a per-event and per-world lookup).

## 4. Audit (Round 336): everything on the map, checked in every room of all six worlds

A Chromium pass rendered every room of every world and recorded each interactable and how it is drawn. Everything
has a painting except:

| Still a glyph or the shared image | Where |
|---|---|

Shared on purpose, so optional (see section 3):
- The hidden loot chest (`loot-chest.png`) in five worlds; Solaris has its own.
- The merchant (`merchant.webp`) in five worlds; Solaris has its own.
- The world portal (`elaris-portal.png`) in four worlds.
- The shrine, campfire, cache, sealed cache and Nexus Waypoint images, one each across all worlds.
- The twelve gear relics each have their own image (`assets/items/gear/`), and none are broken.

### Creatures that still borrow another creature's sheet (recolored)

| Sheet | Borrowed by |
|---|---|
| `city/briar-sentinel-walk` | Brass Sentry (Chronospire); The Arc Sentinel has its own since Round 339 |
| `city/crown-observer` | The Clockwarden (Chronospire) |
| `city/data-wisp` | Rust Wisp (Chronospire); Arc Wisp has its own since Round 336 |
| `city/phase-shade` | The Resonant Phantom (Vespera mini-boss), Lag Wraith, The Paradox Twin (Chronospire) |
| `elaris/blight-antler` | none since Round 346 (the Pendulum Stag has its own) |
| `elaris/bloom-tyrant` | The Chronarch (Chronospire boss); The Tempest Colossus has its own since Round 340 |
| `elaris/cinder-fox` | none since Round 341 (the Gearhound has its own) |
| `elaris/drowned-heron` | The Tidebound Warden (Elaris mini-boss, not recolored); the Hourglass Heron has its own since Round 346 |
| `elaris/storm-moth` | The Gale Sovereign (Elaris mini-boss, not recolored); the Tick Moth has its own since Round 342 |
| `reactor-mauler` | Cog Mauler (Chronospire); Thunder Mauler has its own since Round 338 |

## 5. Nexus Waypoints, one per world (owner request, Round 339)

Every world uses the same `nexus.webp`. Each world gets its own, wired through `WORLD_POI_ART.<world>.nexus`
(`assets/items/poi/<world>-nexus.webp`). Use the shared style lines above, with a green background.

| File | World | Subject |
|---|---|---|
| `city-nexus.webp` ✅ done (Round 340) | Neon Aftermath | A waist-high cyberpunk teleport pad: a round scrap-metal platform ringed with cyan neon tubing, with a holographic ring of glowing cyan glyphs spinning in the air above it, cables snaking from its base into cracked asphalt, and a small flickering control post beside it. |
| `elaris-nexus.webp` | Solaris | A sun-temple waypoint: a round sandstone dais with a carved golden sunburst inlaid in its floor, two short obelisks with glowing amber hieroglyph-like runes at its sides, and a warm golden beam of light rising from the centre, with sand drifting across the steps. |
| `sky-nexus.webp` ✅ done (Round 341) | Sky Isles | A floating sky-shrine waypoint: a round white marble platform with brass rails hovering over a small cloud, with three tall curved brass vanes around it and a pale-blue swirling wind portal glowing between them, plus feathers and wisps of cloud circling it. |
| `wilds-nexus.webp` ✅ done (Round 341) | Elaris (forest) | A druidic forest waypoint: a ring of mossy standing stones around a flat stone disc carved with a glowing green spiral, with roots and ferns at its base, fireflies, and a soft column of green light rising from the spiral. |
| `vespera-nexus.webp` ✅ done (Round 341) | Vespera | A storm-coast waypoint: a round slate platform on wet black rock, ringed by three iron lightning rods, with a crackling ring of violet lightning hovering above its centre and rain-slick stone reflecting the violet glow. |
| `chronospire-nexus.webp` | Chronospire | A clockwork waypoint: a round bronze-and-marble platform inlaid with a large clock face, two interlocking golden gear rings slowly turning upright above it, and an amber light shimmering through their middle, with sand motes drifting upward. |

## 6. Hidden loot chests, one per world (optional, Round 341)

Wired through `WORLD_CHEST_ART` in `assets/cardsmith.js` (`assets/items/poi/<world>-chest.webp`, a CSS rule per world).
Solaris already has `sol-chest.webp`.

| File | World | Subject |
|---|---|---|
| `city-chest.webp` | Neon Aftermath | A dented steel strongbox salvaged from the ruins, lid open a crack on cyan light, coins and a crystal, hazard tape and a blinking pink keypad, on wet cracked asphalt. |
| `sky-chest.webp` ✅ done (Round 341) | Sky Isles | A white-washed wooden chest bound in brass with feather hinges and a wind rune, on a puff of cloud, pale-blue light and coins inside, a ribbon streaming in the wind. |
| `wilds-chest.webp` ✅ done (Round 342) | Elaris (forest) | A moss-covered wooden chest bound in roots and old iron, lid open a crack on green-gold light and coins, ferns and mushrooms around it. |
| `vespera-chest.webp` ✅ done (Round 342) | Vespera | A barnacled sea chest of dark wood and iron washed up on wet black rock, violet light and coins inside, a coil of rope and a few shells. |
| `chronospire-chest.webp` ✅ done (Round 342) | Chronospire | A bronze clockwork chest with gear hinges and a small clock-face lock, amber light and coins inside, on a marble tile with sand grains. |

## 7. Merchants and portals, one per world (Round 342)

Merchants go through `WORLD_POI_ART.<world>.merchant` (`assets/items/poi/<world>-merchant.webp`); all five are done in
Round 342 (Solaris has `sol-merchant.webp`). Portals go through `WORLD_PORTAL_ART` in `assets/cardsmith.js`
(`assets/environment/<world>-portal.webp`), replacing the shared `elaris-portal.png`:

| File | World | Subject |
|---|---|---|
| `sky-portal.webp` ✅ done (Round 342) | Sky Isles | A white marble arch trimmed in brass with feather carvings and a wind-rune keystone, on a marble step on a cloud, a swirling pale-blue sky portal inside. |
| `wilds-portal.webp` | Elaris (forest) | An archway of two great twisted trees whose branches meet overhead, hung with moss and glowing lanterns, a swirling green-gold portal between their trunks, roots and ferns at the base. |
| `vespera-portal.webp` | Vespera | A tall arch of dark wet slate pillars bound in iron, a lightning glyph at its keystone, a swirling violet storm portal crackling inside, on wet black rock. |
| `chronospire-portal.webp` | Chronospire | A bronze-and-marble arch shaped like a giant clock ring with gears at its base, a swirling amber portal with faint clock hands inside, sand motes drifting. |

## 8. The switch puzzle in every world (Round 345)

Each world's three switches and its vault (`WORLD_RELAYS` in `assets/world-relays.js`) are drawn as glyphs until
painted. Wire paintings through `WORLD_POI_ART.<world>.<type>` (`assets/items/poi/<world>-<type>.webp`).

| Type | World | Subject |
|---|---|---|
| `sunMirror` | Solaris | A tall bronze mirror on a carved sandstone pivot, tilted toward the sun, a beam of golden light glancing off it. |
| `sunVault` | Solaris | A squat sandstone vault with a big carved sun-disc lock and gold trim, half-buried in sand. |
| `windVane` ✅ done (Round 346) | Sky Isles | A great brass weather vane on a marble post on a cloud, its arrow and feathered tail spinning in the wind. |
| `galeStrongbox` ✅ done (Round 346) | Sky Isles | A brass-bound strongbox chained to a scrap of white deck, a spinning wind-lock dial on its front. |
| `spiritLantern` ✅ done (Round 346) | Elaris | An old wardens' lantern on a root-wrapped wooden post, glowing green-gold, moss and ferns at its base. |
| `heartHollow` ✅ done (Round 346) | Elaris | A great hollow tree trunk with a doorway grown over with bark, glowing runes around it, roots and mushrooms. |
| `stormRod` ✅ done (Round 346) | Vespera | A tall iron lightning rod on wet black rock, a crackling violet bolt striking its tip, a snapped cable at its base. |
| `stormStrongroom` ✅ done (Round 346) | Vespera | A squat slate strongroom with an iron door and a storm-lock crackling with violet sparks, rain on the stone. |
| `stoppedClock` ✅ done (Round 346) | Chronospire | A tall bronze-and-marble standing clock with a pendulum and glowing amber dial, gears showing through its side. |
| `chronoVault` ✅ done (Round 346) | Chronospire | A bronze vault with a large clock-face lock, golden sand drifting upward around it, on a marble tile. |

