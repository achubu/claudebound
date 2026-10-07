# Cardbound — Shattered Wilds

## Current main-adventure build: Elaris / Aetherlink

The main adventure keeps the original room artwork and joins selected blocks into larger scrolling streets and districts. It includes spaced enemy patrols, secret potion caches, level-up healing and maximum HP, expanded talents, an upgradeable wrist device, elemental cards/counters, a boss portal to Elaris, and save-file export/import. See [EXPANSION.md](EXPANSION.md) for current rules and test instructions. The sections below describe the earlier base game; `arena.html` remains the earlier isolated prototype.

A standalone browser card-battle exploration RPG. Open `index.html` to play the integrated adventure or `arena.html` to use the combat-only Battle Lab. No build step or remote assets are required.

## Integrated open world

The adventure now uses the same physical-card, mastery, deck, Soulbound, player-level, and ability systems as the Battle Lab.

Exploration is organized as an original connected eleven-room labyrinth:

- Move with WASD, arrow keys, or the on-screen directional pad.
- Encounters are visible in the world; collide with an enemy to battle.
- Enemies slowly patrol their spawn area with animated movement and can initiate an encounter if they reach the player.
- Rooms connect in multiple directions and support backtracking.
- The Ember Sigil opens flame seals.
- Briarstep Boots cross living-thorn routes.
- The Moon Lens reveals concealed passages.
- A persistent lower-right minimap records rooms only after they are discovered, highlights the current area, and shows explored-world progress. The full Map screen remains available for room names and relic details.
- Normal enemies respawn after three room transitions; bosses remain defeated.
- Healing stations have been removed; defeated monsters have a 30% chance to drop a small healing potion.
- The Sunken Forge contains a discoverable upgrade material.

This structure takes inspiration from the non-linear exploration principles of early ability-gated adventure games while using original Cardbound locations, layouts, visuals, enemies, characters, and mechanics.


## Visual direction

The integrated world uses an original colorful fantasy-steampunk style:

- Brass and copper pipes, riveted machinery, animated gears, and teal steam lighting.
- Distinct saturated palettes for forests, ember chambers, flooded crypts, moon vaults, forges, and the Warden depths.
- A goggle-and-mechanical-backpack treatment for the player sprite.
- Ten detailed pixel-art cyber-monsters displayed in both exploration and combat:
  - Plasma-jawed Ember Jackal
  - Crystal-tipped Circuit Thornling
  - Armored bio-mech Briar Sentinel
  - Drill-snouted Tunnel Borehound
  - Crescent-armored Lunar Enforcer
  - Holographic Phase Shade
  - Ringed Data Wisp
  - Furnace-bodied Reactor Mauler
  - Crowned surveillance Observer
  - Vine-cabled Thorn Warden
- All artwork is original, dependency-free, and stored directly in the game file.

## Unified combat and progression

- Build a 4–6 card active deck from the owned card pool, then invest in Deck Matrix to reach ten cards.
- Decks allow three copies of a card by default; Pattern Replication raises the limit to five.
- Every physical card starts at Level 0 and tracks its own uses.
- Soulbound cards need 50, then 100, then 200 uses plus one Upgrade Crystal per level; Impermanent cards auto-upgrade every 100 uses.
- Purple Soulbound cards cannot be destroyed or lost.
- Every defeat destroys one random active Impermanent card; Soulbound boss cards are always protected.
- Normal victories award 25 player XP; bosses award 50; defeats award 10.
- Player progression spans Levels 1–60, with one talent point earned at every level from 2 onward (59 points at the cap).
- The three-branch Neural Talent Matrix offers ranked, incremental card-battle upgrades: Surge improves offense and Power Boost, Disruption improves Weaken, draw, energy, deck capacity, and copy limits, and Resolve improves Retain, Block, health, and potion strength.
- Deeper talent rows require points invested in that branch, with capstone upgrades available after ten branch points.
- Talent choices can be freely recompiled outside active encounters, making it practical to test different builds.
- Round 40 expanded each tree to 9 rows and 4-6 build paths (16-17 talents per tree, 50 in total); see CHANGES.md for every path.
- **Pitch & Aether (Round 44):** mark cards in hand to pitch; when you end the turn they burn away for that encounter and give Aether (cost + 1, up to 8 stored). At least 4 cards must stay in the encounter.
- **Card rewards (Round 49):** a loot chest that holds a card offers three from the current world's pool — take one or leave them. Each world adds five new cards: Arc Jab, Bulwark Bash, Overclock, Static Shield, Breach Spike (city); Thornlash, Wildfire, Rootbind, Tidecall, Verdant Pact (Elaris); Chain Lightning, Storm Battery, Mirrorguard, Tempest Surge (X cost), Prism Lance (Vespera).
- **Exploration (Round 50):** about a third of ordinary rooms hold a seeded point of interest — Aether Shrine (blessing for your next fight), Campfire (rest or train a card), Supply Cache, Sealed Cache (risky), and five lore finds per world (all five: 15 Shards + a side card). Enemies drop Shards, spent at the Wandering Merchant (one in every world) on side cards, upgraded Impermanent cards, card upgrade packs, potions, card bundles and blessings — never Soulbound cards or Upgrade Crystals. The merchant moves rooms each time you enter a world or fall.
- **Unspent energy:** ending a turn with energy left over gives 1 Aether.
- **Side deck:** a second, player-built deck of up to 6 utility counters (2 copies each). Spend 4 Aether to look at its top 2 cards and keep one; hold up to 2. Every journey starts with Purifying Light, Aegis Ward and Dispel Lance; more drop from 5% of regular and elite enemies and from every boss, and the merchant always sells one.
- **Enemy afflictions:** every enemy telegraphs riders a turn ahead — Bleed, Frail, Shackle, Fog, Static, Empower, Barrier, Rend, Crush, Siphon and Barrage. Regular enemies have one, mini-bosses two and final bosses three, each landing every 3rd turn (elites and enraged final bosses every 2nd); Empower and Bleed stack once, so stalling is punished. See the compendium for which side card answers what.
- Bosses have a 10% chance to drop an exclusive Soulbound card.
- Normal encounters have a 10% material chance; bosses guarantee one material.

## Saves

This balance update starts a fresh save. The integrated adventure uses `cardbound-integrated-v2`, the Battle Lab uses `cardbound-battle-lab-v4`, and shared upgrade materials use `cardbound-upgrade-materials-v2`. Saves remain specific to the browser and site origin; there is no cloud synchronization.

## Verification

Automated logic checks cover:

- All eleven rooms and their connections
- Ember Sigil, Briarstep Boots, and Moon Lens route gates
- Normal-enemy three-room respawning
- Integrated physical-card mastery
- Player XP, the Level 60 cap, talent points, branch gates, deck capacity, copy limits, and derived combat bonuses
- Boss material guarantees and the 10% Soulbound boundary
- Impermanent defeat loss and Soulbound protection
- Healing-potion drops and fresh-save initialization
- JavaScript syntax and the responsive 800×500 logical world scaling

A full installed-Chromium visual pass was unavailable in the build workspace, so desktop and mobile visual behavior should continue to be checked on the hosted version after deployment.

## Hosting

GitHub Pages deploys the repository root from `main`. The live build is available at:

https://achubu.github.io/Cardbound/
