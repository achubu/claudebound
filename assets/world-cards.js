'use strict';
// =====================================================================
// Round 178: every world drops its own cards. No card appears in two worlds'
// reward pools, so each world's chest and elite rewards are its own. Solaris,
// the Sky Isles, Elaris and Vespera gain new cards for this; the forest cards
// that used to drop in Solaris now drop in Elaris, where they belong.
// Art: tools/generate_world_card_art.py (placeholders, assets/cards/level<0-3>/).
// =====================================================================
// --- Solaris: sun, sand and scarabs ---
tieredCard('sunflare', 'Sunflare', 1, 'Fire Attack', '☀', [{ damage: 6, burn: 2 }, { damage: 7, burn: 2 }, { damage: 9, burn: 3 }, { damage: 11, burn: 3 }], { element: 'fire' });
tieredCard('sandVeil', 'Sand Veil', 1, 'Defense', '⌇', [{ block: 6, draw: 1 }, { block: 7, draw: 1 }, { block: 9, draw: 1 }, { block: 11, draw: 1 }]);
tieredCard('scarabSwarm', 'Scarab Swarm', 2, 'Poison Attack', '⁂', [{ damage: 3, hits: 3, poison: 2 }, { damage: 4, hits: 3, poison: 2 }, { damage: 4, hits: 3, poison: 3 }, { damage: 5, hits: 3, poison: 3 }], { element: 'earth' });
tieredCard('oasisDraught', 'Oasis Draught', 1, 'Healing', '⛲', [{ heal: 5, block: 3 }, { heal: 6, block: 4 }, { heal: 8, block: 4 }, { heal: 10, block: 5 }]);
tieredCard('solarLance', 'Solar Lance', 2, 'Fire Attack', '☼', [{ damage: 11 }, { damage: 13 }, { damage: 16 }, { damage: 19 }], { element: 'fire', pierce: true });
// --- Sky Isles: wind, feathers and thunder ---
tieredCard('skyfall', 'Skyfall', 2, 'Air Attack', '🪶', [{ damage: 10, draw: 1 }, { damage: 12, draw: 1 }, { damage: 15, draw: 1 }, { damage: 18, draw: 1 }], { element: 'air' });
tieredCard('featherguard', 'Featherguard', 1, 'Defense', '❖', [{ block: 6, drawNext: 1 }, { block: 7, drawNext: 1 }, { block: 9, drawNext: 1 }, { block: 11, drawNext: 1 }]);
tieredCard('updraft', 'Updraft', 0, 'Skill', '🌬', [{ draw: 1, aether: 1 }, { draw: 2, aether: 1 }, { draw: 2, aether: 2 }, { draw: 3, aether: 2 }]);
tieredCard('thunderclap', 'Thunderclap', 1, 'Lightning Attack', 'ϟ', [{ damage: 5, shock: true }, { damage: 6, shock: true }, { damage: 8, shock: true }, { damage: 10, shock: true }], { element: 'lightning' });
tieredCard('cloudburst', 'Cloudburst', 1, 'Water Attack', '☔', [{ damage: 3, hits: 2, heal: 2 }, { damage: 4, hits: 2, heal: 2 }, { damage: 4, hits: 2, heal: 3 }, { damage: 5, hits: 2, heal: 4 }], { element: 'water' });
// --- Elaris: roots, spores and briars ---
tieredCard('elderRoot', 'Elder Root', 2, 'Poison Attack', '🌳', [{ damage: 8, poison: 3 }, { damage: 10, poison: 3 }, { damage: 12, poison: 4 }, { damage: 14, poison: 5 }], { element: 'earth' });
tieredCard('sporeCloud', 'Spore Cloud', 1, 'Skill', '✺', [{ poison: 4, draw: 1 }, { poison: 5, draw: 1 }, { poison: 6, draw: 1 }, { poison: 8, draw: 1 }]);
tieredCard('briarWall', 'Briar Wall', 2, 'Defense', '❧', [{ block: 10, bind: 3 }, { block: 12, bind: 4 }, { block: 14, bind: 5 }, { block: 17, bind: 6 }]);
// --- Vespera: storm crystal and the tide ---
tieredCard('crystalShard', 'Crystal Shard', 1, 'Lightning Attack', '✦', [{ damage: 6 }, { damage: 7 }, { damage: 9 }, { damage: 11 }], { element: 'lightning', pierce: true });
tieredCard('crystalWard', 'Crystal Ward', 2, 'Defense', '⬡', [{ block: 9, shock: true }, { block: 11, shock: true }, { block: 13, shock: true }, { block: 16, shock: true }]);
tieredCard('riptide', 'Riptide', 1, 'Water Attack', '≈', [{ damage: 6, draw: 1 }, { damage: 7, draw: 1 }, { damage: 9, draw: 1 }, { damage: 11, draw: 1 }], { element: 'water' });
tieredCard('squallStep', 'Squall Step', 1, 'Defense', '↯', [{ block: 6, aether: 1 }, { block: 7, aether: 1 }, { block: 9, aether: 1 }, { block: 11, aether: 2 }]);
// --- Mini-boss cards: the forest drops go home to Elaris; Solaris and the Sky Isles get their own ---
addCard('cisternAegis', 'Cistern Aegis', 1, 'Unique Defense', '⛲', { block: 9, heal: 3, element: 'water' });
addCard('noonPeal', 'Noon Peal', 1, 'Unique Attack', '🔔', { damage: 7, shock: true, element: 'air' });
addCard('stormbellToll', 'Stormbell Toll', 2, 'Unique Attack', 'ϟ', { damage: 12, draw: 1, element: 'lightning' });
addCard('featherfallGrace', 'Featherfall Grace', 2, 'Unique Defense', '🪶', { block: 12, heal: 4, element: 'air' });
Object.assign(MINI_BOSS_CARDS, {
  tidewardenElaris: 'cisternAegis', galeSovereign: 'noonPeal',
  tideboundWarden: 'tidebound', galeSovereignElaris: 'sovereignGale',
  stormbellWarden: 'stormbellToll', featherMatriarch: 'featherfallGrace'
});

// --- One pool per world, no card in two pools ---
Object.assign(VARIETY_POOLS, {
  city: ['cleave', 'riposte', 'bastion', 'mend', 'spark', 'shatter', 'arcJab', 'bulwarkBash', 'overclock', 'staticShield', 'breachSpike'],
  elaris: ['cinder', 'venom', 'gale', 'counter', 'sunflare', 'sandVeil', 'scarabSwarm', 'oasisDraught', 'solarLance'],
  sky: ['chainLightning', 'stormBattery', 'tempestSurge', 'skyfall', 'featherguard', 'updraft', 'thunderclap', 'cloudburst'],
  wilds: ['thornlash', 'wildfire', 'rootbind', 'tidecall', 'verdantPact', 'elderRoot', 'sporeCloud', 'briarWall'],
  vespera: ['mirrorguard', 'prismLance', 'crystalShard', 'crystalWard', 'riptide', 'squallStep'],
  chronospire: [...CHRONO_CARDS]
});
// Where each reward card is first found (Chronospire's Suspend cards are listed in chronospire.js).
for (const [world, ids] of Object.entries(VARIETY_POOLS)) if (world !== 'chronospire') for (const id of ids) if (!['cleave', 'riposte', 'bastion', 'mend', 'spark', 'shatter', 'cinder', 'venom', 'gale', 'counter'].includes(id)) NEW_CARD_WORLD[id] = world;
