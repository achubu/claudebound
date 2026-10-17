# Difficulty report (Round 182)

Every enemy in the game, fought at the player's own level with the Difficulty lab (compendium → **Difficulty lab**, or `node tests/difficulty-report.cjs 6`):

- **Who plays:** 16 talent builds × 2 play styles, with talent points spent up to the player's level and cards levelled with the player.
- **What they carry:** the side cards and deck slots from earlier bosses, and every gear piece available by then. That is the earlier worlds' pieces; at a world's second mini-boss, the first mini-boss's piece too; at the final boss, both pieces.
- **What is measured:** regular enemies per species and level (elites left out), and every boss. 6 fights per build and style, so 192 battles per row and 15,936 in all.

**Typical** is the average win rate over all builds and styles. Targets: regular fights 30–100%, mini-bosses 34–50%, final bosses 22–36%.


## Neon Aftermath

| Enemy | Lv | HP / Atk | Typical win | Best build | Worst build | Turns | HP left | Gear | Verdict |
|---|---|---|---|---|---|---|---|---|---|
| Ember Jackal | 1 | 40 / 8 | 100% | 100% Old·Surge | 100% Old·Surge | 5.3 | 79% | 0 | on target |
| Circuit Thornling | 2 | 45 / 8 | 100% | 100% Old·Surge | 100% Old·Surge | 6.1 | 84% | 0 | on target |
| Briar Sentinel | 3 | 56 / 10 · 2 Armor | 63% | 100% S·Sunder | 0% Old·Hybrid | 14.8 | 22% | 0 | on target |
| Tunnel Borehound | 4 | 63 / 10 · 2 Armor | 100% | 100% Old·Surge | 100% Old·Surge | 6.4 | 53% | 0 | on target |
| Phase Shade | 5 | 73 / 13 · 3 Armor | 51% | 100% Old·Resolve | 0% S·Elemental | 8.6 | 36% | 0 | on target |
| Lunar Enforcer (mini-boss) | 5 | 80 / 14 · 4 Armor | 8% | 50% R·Thorns | 0% Old·Surge | 12.2 | 14% | 0 | **too hard** |
| Data Wisp | 6 | 79 / 13 · 3 Armor | 42% | 100% Old·Resolve | 0% Old·Disrupt | 8.9 | 38% | 0 | on target |
| Reactor Mauler | 7 | 91 / 14 · 4 Armor | 64% | 67% Old·Surge | 33% D·Counter | 7.6 | 46% | 0 | on target |
| The Crown Sentinel (mini-boss) | 7 | 93 / 15 · 5 Armor | 100% | 100% Old·Surge | 100% Old·Surge | 6.5 | 68% | 1 | **too easy** |
| Crown Observer | 8 | 104 / 17 · 5 Armor | 41% | 100% Old·Resolve | 0% Old·Disrupt | 8.9 | 37% | 0 | on target |
| Thorn Warden (BOSS) | 9 | 164 / 19 · 6 Armor | 31% | 83% Old·Resolve | 0% Old·Surge | 13.1 | 53% | 2 | on target |

## Solaris

| Enemy | Lv | HP / Atk | Typical win | Best build | Worst build | Turns | HP left | Gear | Verdict |
|---|---|---|---|---|---|---|---|---|---|
| Mirage Ibis | 10 | 128 / 23 | 99% | 100% Old·Surge | 83% S·Sunder | 6.1 | 73% | 2 | on target |
| Dune Scorpion | 11 | 123 / 23 | 93% | 100% Old·Disrupt | 67% Old·Surge | 5.7 | 82% | 2 | on target |
| Solar Scarab | 11 | 106 / 22 | 96% | 100% Old·Disrupt | 67% S·Sunder | 5.4 | 83% | 2 | on target |
| Mirage Ibis | 11 | 130 / 24 | 95% | 100% Old·Disrupt | 67% S·Sunder | 6.3 | 82% | 2 | on target |
| Sunwrapped Revenant | 11 | 139 / 24 | 95% | 100% Old·Disrupt | 67% S·Sunder | 5.9 | 83% | 2 | on target |
| Dune Scorpion | 12 | 130 / 24 | 95% | 100% Old·Disrupt | 83% Old·Surge | 5.8 | 87% | 2 | on target |
| Dune Scorpion | 13 | 142 / 26 | 95% | 100% Old·Disrupt | 83% Old·Surge | 5.1 | 85% | 2 | on target |
| Mirage Ibis | 13 | 151 / 27 | 99% | 100% Old·Surge | 83% S·Elemental | 5.6 | 79% | 2 | on target |
| Dust Devil | 13 | 151 / 27 | 96% | 100% Old·Disrupt | 83% Old·Surge | 4.6 | 87% | 2 | on target |
| Dune Scorpion | 14 | 155 / 27 | 89% | 100% Old·Disrupt | 50% S·Crit | 5.5 | 82% | 2 | on target |
| Mirage Ibis | 14 | 165 / 28 | 95% | 100% Old·Disrupt | 83% Old·Surge | 5.5 | 70% | 2 | on target |
| Dust Devil | 14 | 165 / 28 | 87% | 100% Old·Disrupt | 50% S·Crit | 4.9 | 81% | 2 | on target |
| Sunwrapped Revenant | 14 | 176 / 28 | 90% | 100% Old·Disrupt | 50% S·Crit | 5.2 | 81% | 2 | on target |
| The Cistern Warden (mini-boss) | 14 | 314 / 30 · 3 Armor | 92% | 100% Old·Disrupt | 67% S·Crit | 8 | 75% | 2 | **too easy** |
| Dune Scorpion | 15 | 160 / 28 | 93% | 100% Old·Disrupt | 67% S·Crit | 5.8 | 77% | 2 | on target |
| Mirage Ibis | 15 | 170 / 29 | 99% | 100% Old·Surge | 83% S·Crit | 5.8 | 75% | 2 | on target |
| Sunwrapped Revenant | 15 | 182 / 29 | 99% | 100% Old·Surge | 83% S·Crit | 5.7 | 77% | 2 | on target |
| Dune Scorpion | 16 | 166 / 30 | 97% | 100% Old·Surge | 83% S·Crit | 6.3 | 79% | 2 | on target |
| Solar Scarab | 16 | 143 / 29 | 91% | 100% Old·Disrupt | 67% S·Crit | 6.6 | 78% | 2 | on target |
| Mirage Ibis | 16 | 176 / 31 | 91% | 100% Old·Disrupt | 67% Old·Surge | 5.4 | 86% | 2 | on target |
| Dust Devil | 16 | 176 / 31 | 89% | 100% Old·Disrupt | 50% S·Momentum | 6.2 | 70% | 2 | on target |
| Sunwrapped Revenant | 16 | 188 / 31 | 93% | 100% Old·Surge | 50% S·Momentum | 6 | 80% | 2 | on target |
| The Noon Toller (mini-boss) | 16 | 185 / 33 · 3 Armor | 73% | 100% Old·Disrupt | 33% Old·Surge | 6.7 | 52% | 3 | **too easy** |
| Solar Scarab | 17 | 147 / 30 | 86% | 100% Old·Disrupt | 50% S·Crit | 6.2 | 66% | 2 | on target |
| Mirage Ibis | 17 | 181 / 32 | 89% | 100% Old·Disrupt | 50% S·Crit | 5.6 | 72% | 2 | on target |
| Dust Devil | 17 | 182 / 32 | 91% | 100% Old·Disrupt | 50% S·Momentum | 5.8 | 72% | 2 | on target |
| Sunwrapped Revenant | 17 | 194 / 32 | 85% | 100% Old·Disrupt | 33% S·Momentum | 5.8 | 67% | 2 | on target |
| The Sun Pharaoh (BOSS) | 18 | 420 / 34 | 51% | 100% Old·Disrupt | 0% Old·Surge | 7.8 | 39% | 4 | **too easy** |

## Sky Isles

| Enemy | Lv | HP / Atk | Typical win | Best build | Worst build | Turns | HP left | Gear | Verdict |
|---|---|---|---|---|---|---|---|---|---|
| Sunfeather Drake | 19 | 202 / 30 | 95% | 100% Old·Surge | 67% R·Leech | 5.8 | 68% | 4 | on target |
| Sunfeather Drake | 20 | 208 / 30 | 100% | 100% Old·Surge | 100% Old·Surge | 5.5 | 74% | 4 | on target |
| Cloud Wisp | 21 | 232 / 30 · 1 Armor | 98% | 100% Old·Surge | 83% Old·Resolve | 7.1 | 67% | 4 | on target |
| Cloud Wisp | 22 | 238 / 30 · 1 Armor | 96% | 100% Old·Surge | 67% S·Sunder | 7.1 | 71% | 4 | on target |
| Gale Harpy | 23 | 264 / 32 | 97% | 100% Old·Surge | 50% R·Retain | 6.7 | 73% | 4 | on target |
| The Stormbell Warden (mini-boss) | 23 | 246 / 33 · 4 Armor | 52% | 100% Old·Surge | 0% Old·Resolve | 6.5 | 55% | 4 | **too easy** |
| Gale Harpy | 24 | 271 / 32 | 95% | 100% Old·Surge | 83% Old·Disrupt | 6.8 | 70% | 4 | on target |
| Thunderhorn Ram | 25 | 298 / 32 · 2 Armor | 68% | 100% S·Elemental | 17% R·Retain | 7.5 | 43% | 4 | on target |
| The Featherfall Matriarch (mini-boss) | 25 | 294 / 34 · 3 Armor | 72% | 100% Old·Surge | 0% Old·Hybrid | 10.4 | 50% | 5 | **too easy** |
| Thunderhorn Ram | 26 | 305 / 32 · 2 Armor | 73% | 100% S·Elemental | 17% S·Sunder | 7.5 | 49% | 4 | on target |
| The Zenith Roc (BOSS) | 27 | 319 / 34 · 2 Armor | 59% | 100% S·Elemental | 0% Old·Resolve | 8.2 | 43% | 6 | **too easy** |

## Elaris

| Enemy | Lv | HP / Atk | Typical win | Best build | Worst build | Turns | HP left | Gear | Verdict |
|---|---|---|---|---|---|---|---|---|---|
| Cinder Fox | 28 | 218 / 39 | 100% | 100% Old·Surge | 100% Old·Surge | 5.3 | 76% | 6 | on target |
| Cinder Fox | 29 | 223 / 39 | 93% | 100% Old·Surge | 67% S·Momentum | 5.4 | 68% | 6 | on target |
| Blight Antler | 30 | 263 / 40 | 100% | 100% Old·Surge | 100% Old·Surge | 5.5 | 73% | 6 | on target |
| Blight Antler | 31 | 269 / 41 | 98% | 100% Old·Surge | 83% S·Sunder | 5.9 | 73% | 6 | on target |
| Drowned Heron | 32 | 308 / 42 | 70% | 100% D·Silence | 0% R·Thorns | 7.8 | 68% | 6 | on target |
| The Tidebound Warden (mini-boss) | 32 | 361 / 44 · 3 Armor | 87% | 100% Old·Surge | 0% R·Thorns | 9.8 | 53% | 6 | **too easy** |
| Drowned Heron | 33 | 314 / 42 | 56% | 100% S·Elemental | 0% R·Thorns | 8.6 | 57% | 6 | on target |
| Storm Moth | 34 | 337 / 42 | 91% | 100% Old·Surge | 50% R·Retain | 7.6 | 55% | 6 | on target |
| The Gale Sovereign (mini-boss) | 34 | 252 / 44 · 3 Armor | 64% | 100% S·Elemental | 0% Old·Surge | 6.8 | 58% | 7 | **too easy** |
| Storm Moth | 35 | 343 / 43 | 83% | 100% S·Elemental | 33% S·Sunder | 7.8 | 55% | 6 | on target |
| The Bloom Tyrant (BOSS) | 36 | 531 / 44 | 58% | 100% S·Crit | 0% Old·Surge | 9.2 | 49% | 8 | **too easy** |

## Vespera

| Enemy | Lv | HP / Atk | Typical win | Best build | Worst build | Turns | HP left | Gear | Verdict |
|---|---|---|---|---|---|---|---|---|---|
| Static Fox | 37 | 409 / 34 | 96% | 100% Old·Surge | 83% Old·Surge | 8.4 | 54% | 8 | on target |
| Prism Thornling | 38 | 436 / 34 · 1 Armor | 100% | 100% Old·Surge | 100% Old·Surge | 7.5 | 74% | 8 | on target |
| Tempest Moth | 39 | 462 / 35 | 100% | 100% Old·Surge | 100% Old·Surge | 8.2 | 73% | 8 | on target |
| Brinewing Heron | 40 | 490 / 36 | 97% | 100% Old·Surge | 33% S·Sunder | 9.6 | 61% | 8 | on target |
| Ion Shade | 41 | 518 / 36 · 2 Armor | 90% | 100% Old·Surge | 0% S·Momentum | 10.2 | 59% | 8 | on target |
| The Arc Sentinel (mini-boss) | 41 | 548 / 37 · 4 Armor | 66% | 100% S·Elemental | 0% S·Crit | 13.1 | 50% | 8 | **too easy** |
| Rimeglass Stag | 42 | 547 / 36 · 2 Armor | 83% | 100% Old·Surge | 0% S·Momentum | 10 | 56% | 8 | on target |
| Arc Wisp | 43 | 577 / 37 · 2 Armor | 88% | 100% Old·Surge | 0% S·Momentum | 12.1 | 49% | 8 | on target |
| The Resonant Phantom (mini-boss) | 43 | 741 / 39 · 3 Armor | 72% | 100% Old·Surge | 0% S·Crit | 15 | 46% | 9 | **too easy** |
| Thunder Mauler | 44 | 607 / 38 · 2 Armor | 66% | 100% S·Elemental | 33% S·Crit | 11.1 | 41% | 8 | on target |
| The Tempest Colossus (BOSS) | 45 | 652 / 38 · 2 Armor | 49% | 100% S·Elemental | 0% Old·Surge | 11.3 | 54% | 10 | **too easy** |

## Chronospire

| Enemy | Lv | HP / Atk | Typical win | Best build | Worst build | Turns | HP left | Gear | Verdict |
|---|---|---|---|---|---|---|---|---|---|
| Gearhound | 46 | 577 / 46 | 100% | 100% Old·Surge | 100% Old·Surge | 7 | 83% | 10 | on target |
| Tick Moth | 47 | 610 / 47 | 100% | 100% Old·Surge | 100% Old·Surge | 7.3 | 79% | 10 | on target |
| Brass Sentry | 48 | 669 / 47 · 2 Armor | 96% | 100% Old·Surge | 83% Old·Surge | 7.6 | 74% | 10 | on target |
| Lag Wraith | 49 | 679 / 48 · 1 Armor | 71% | 100% S·Crit | 33% Old·Surge | 8.3 | 68% | 10 | on target |
| Hourglass Heron | 50 | 714 / 48 | 93% | 100% S·Crit | 83% Old·Surge | 8.4 | 72% | 10 | on target |
| The Clockwarden (mini-boss) | 50 | 887 / 49 · 4 Armor | 84% | 100% S·Crit | 50% Old·Surge | 11.5 | 46% | 10 | **too easy** |
| Pendulum Stag | 51 | 750 / 49 · 2 Armor | 93% | 100% Old·Surge | 67% D·Draw | 9.1 | 62% | 10 | on target |
| Rust Wisp | 52 | 787 / 49 · 2 Armor | 94% | 100% Old·Surge | 67% D·Draw | 9.8 | 67% | 10 | on target |
| The Paradox Twin (mini-boss) | 52 | 954 / 51 · 3 Armor | 83% | 100% S·Crit | 50% D·Draw | 12 | 55% | 11 | **too easy** |
| Cog Mauler | 53 | 726 / 50 · 2 Armor | 71% | 100% S·Crit | 17% D·Draw | 7.7 | 60% | 10 | on target |
| The Chronarch (BOSS) | 54 | 922 / 50 · 3 Armor | 60% | 100% S·Crit | 0% D·Draw | 10.3 | 48% | 12 | **too easy** |
