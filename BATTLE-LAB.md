# Cardbound Battle Lab

Play `arena.html` to work exclusively on card battles. `index.html` now contains the integrated Shattered Wilds adventure using the same card and player-progression systems. A valid Battle Lab v3 save is imported when a new integrated journey begins.


## Player experience and ability unlocks

- Players begin at Level 1 with 0/100 XP.
- A normal victory awards 25 XP.
- A boss victory awards 50 XP.
- A defeat still awards 10 XP for completing the encounter.
- Every 100 XP increases the player level by one.
- Level 2 unlocks Power Boost: once per encounter, select one eligible card for +1 damage, +1 block, or +1 healing on its next play. The selection may be changed until the card is played.
- Level 3 unlocks Weaken: once per encounter, reduce all enemy attack intents by 1 for the remainder of that encounter.
- Level 4 requires one permanent mastery choice in the Deck Workshop: improve Power Boost to +2, or improve Weaken to -2. The unchosen ability remains at its original strength.
- Level 5 unlocks Retain: select one unplayed card per turn to keep it in hand through turn-end. The retained card joins the next four-card draw.
- Player level, XP, and both ability states persist in the Battle Lab save.



## Interface and navigation

- Soulbound cards use purple frames, a solid diamond symbol, and a prominent **Soulbound · Protected** banner.
- Impermanent cards use bronze frames, a hollow diamond symbol, and an **Impermanent · At Risk** banner.
- Every card displays three upgrade pips and a proportional 0–50 mastery bar.
- Cards at 50/50 use a highlighted **Ready to Upgrade** state.
- The Deck Workshop includes filters for All, Active Deck, Soulbound, Impermanent, and Upgrade Ready cards.
- Active-deck cards receive a blue outline and also appear in a compact deck list.
- Add/remove, upgrade, destroy, Power Boost, Retain, and Weaken controls have distinct labels and visual treatments.
- The sticky status bar keeps battle, level/XP, health, deck size, world materials, and Character Sheet access visible.
- The Character Sheet uses an XP bar and separates Soulbound and Impermanent collection totals.

## Character Sheet

The Character button is available from both combat and the Deck Workshop. It opens a non-destructive overlay showing:

- Current player level and progress toward the next 100-XP threshold.
- Level 2 Power Boost status and its current +1/+2 strength.
- Level 3 Weaken status and its current -1/-2 strength.
- The permanent Level 4 mastery choice, or whether that choice is still pending.
- Level 5 Retain status.
- Owned-card counts at Levels 0, 1, 2, and 3.
- Cards that have reached 50/50 uses and are ready to upgrade.
- Current open-world upgrade materials, Soulbound-card count, and total card-pool size.

## Card mastery and upgrades

- Every owned card starts at Level 0 with 0/50 uses.
- Playing a specific physical card increments that card's use counter once.
- Each upgrade requires 50 uses; progress stops at 50 until the upgrade is completed.
- A ready card also consumes one upgrade material to advance.
- Completing an upgrade resets that card to 0/50 uses for the next level.
- Cards have three upgrades: Level 1, Level 2, and Level 3.
- Newly rewarded normal and Soulbound cards always start at Level 0.

## Open-world upgrade materials

- Upgrade materials are shared through `cardbound-upgrade-materials-v1` localStorage.
- Battle Lab victories and card destruction do not create upgrade materials.
- Regular open-world monsters have a 10% chance to drop one material.
- The open-world Thorn Warden guarantees one material.
- The adventure quest panel displays the shared material balance.

## Deck Workshop

- The card pool contains every card owned during the run.
- Build an active deck of 4–10 cards from the pool.
- Add and remove owned cards freely between battles.
- Impermanent cards may be destroyed, but destruction does not provide world materials.
- Soulbound cards may be trained and upgraded, but cannot be destroyed or lost.

## Soulbound drops and card loss

- Every third Battle Lab encounter is a boss.
- A defeated Battle Lab boss has a strict 10% chance to offer one Soulbound card.
- Soulbound cards never appear in normal rewards.
- Defeat can permanently remove one random Impermanent card from the active deck.
- Defeat does not reduce the active deck below its four-card playable minimum.

Progress uses `cardbound-battle-lab-v3` localStorage and remains separate from adventure saves, while the upgrade-material balance is shared between both modes.

## Validation

Automated checks cover Level 0 initialization, the 49/50-use boundary, the 50th-use ready state, blocking upgrades without a world material, material consumption, progress reset after upgrading, Level 0 rewards, and destruction without material creation.

The v3 mastery system starts a fresh Battle Lab run so every card begins at Level 0; the shared open-world material balance is preserved.