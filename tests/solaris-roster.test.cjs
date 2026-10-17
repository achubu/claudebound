// Round 172: Solaris enemies renamed and reworked for the sun-scorched desert city.
process.env.HARNESS_ONLY = '1';
const assert = require('assert');
const { run } = require('./expansion.test.cjs');
const r = JSON.parse(run(`(()=>{const o={};newGame();state.region='elaris';configureRegion('elaris');
 o.names=Object.fromEntries(['cinderFox','drownedHeron','blightAntler','stormMoth','tidewardenElaris','galeSovereign','bloomTyrant','sunRevenant'].map(id=>[id,enemies[id].name]));
 o.shift=enemies.bloomTyrant.shift;o.aff=ENEMY_AFFLICTIONS.bloomTyrant;
 o.bossArt=monsterArt('bloomTyrant');o.foxArt=monsterArt('cinderFox');
 o.vespFox=monsterArt('vespFox');o.vespBoss=monsterArt('stormTyrant');o.chronoHound=monsterArt('chronoHound');o.chronarch=monsterArt('chronarch');
 o.borrowers=Object.values(enemies).filter(e=>e.art).map(e=>e.art);
 const boss=roomSpawns('8,5').find(s=>s.boss);state.room='8,5';state.battle=null;startBattle(boss.uid);const b=state.battle;o.bossId=b.id;
 const big=make('cleave'),small=make('strike');b.hand=[small,big];applyHex(b,'entomb');o.entombs=b.entombed===big.uid;
 o.objective=objective();
 return JSON.stringify(o)})()`));
assert.deepStrictEqual(r.names, {
  cinderFox: 'Solar Scarab', drownedHeron: 'Mirage Ibis', blightAntler: 'Dune Scorpion', stormMoth: 'Dust Devil',
  tidewardenElaris: 'The Cistern Warden', galeSovereign: 'The Noon Toller', bloomTyrant: 'The Sun Pharaoh', sunRevenant: 'Sunwrapped Revenant'
});
assert.deepStrictEqual(r.shift, ['fire', 'earth'], 'the Pharaoh shifts between sun and sand');
assert(r.aff.includes('entomb'), 'the Pharaoh entombs like its Revenants');
assert.strictEqual(r.bossId, 'bloomTyrant'); assert(r.entombs, 'Entomb works in the Pharaoh fight');
assert(r.bossArt.includes('aria-label="The Sun Pharaoh"') && r.foxArt.includes('aria-label="Solar Scarab"'));
assert(/Sun Pharaoh|Cistern Warden/.test(r.objective), 'the objective names the new enemies (Round 176: their gear first)');
// Other worlds borrow art-only keys, so Solaris art can change without touching them.
for (const a of r.borrowers) assert(!['cinderFox', 'drownedHeron', 'blightAntler', 'stormMoth', 'bloomTyrant'].includes(a), 'borrows a Solaris id: ' + a);
assert(r.vespFox.includes('cinder-fox.png') && r.chronoHound.includes('cinder-fox.png'), 'Vespera and Chronospire keep the fox sheet');
assert(r.vespBoss.includes('bloom-tyrant.png') && r.chronarch.includes('bloom-tyrant.png'), 'and the old boss sheet');
assert(r.vespFox.includes('aria-label="Static Fox"') && r.vespBoss.includes('aria-label="The Tempest Colossus"'));
console.log('PASS: Solaris roster is desert-themed; Vespera and Chronospire keep their own borrowed art.');
