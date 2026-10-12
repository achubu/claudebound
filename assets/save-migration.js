// Round 97: the game was renamed from Cardbound to Aethercede, and every
// localStorage key moved from the `cardbound-` prefix to `aethercede-`.
// Copy old keys across once so existing saves, upgrade materials, Battle Lab
// progress and settings carry over. Old keys are left in place.
(function migrateCardboundStorage() {
  try {
    const oldKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('cardbound-')) oldKeys.push(key);
    }
    for (const key of oldKeys) {
      const renamed = 'aethercede-' + key.slice('cardbound-'.length);
      if (localStorage.getItem(renamed) === null) localStorage.setItem(renamed, localStorage.getItem(key));
    }
  } catch (e) { /* storage unavailable (private mode): nothing to migrate */ }
})();
