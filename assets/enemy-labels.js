'use strict';
// =====================================================================
// Round 84: world enemies are drawn 20% smaller, their name bubbles 30%
// smaller, and an enemy 2+ levels above you has its name in red.
// =====================================================================
function markDangerousEnemies(root) {
  if (!state || !root || !root.querySelectorAll) return;
  for (const node of root.querySelectorAll('.enemy-node')) {
    const m = /Lv\.(\d+)/.exec((node.dataset && node.dataset.name) || '');
    const over = !!m && Number(m[1]) >= state.playerLevel + 2;
    if (node.classList) node.classList.toggle('enemy-overlevel', over);
  }
}
const renderWorldBeforeEnemyLabels = renderWorld;
renderWorld = function () {
  const out = renderWorldBeforeEnemyLabels.apply(this, arguments);
  markDangerousEnemies(typeof document !== 'undefined' && document.getElementById ? document.getElementById('world') : null);
  return out;
};
const enemyLabelStyles = document.createElement('style');
// `scale` composes with the nodes' existing translate(-50%,-50%) and walk
// animations. The name bubble sits inside the node, so it already shrinks to
// 80%; another .875 brings it to 70% of its old size.
enemyLabelStyles.textContent = '.enemy-node{scale:.8}'
  + '.enemy-node:after{scale:.875;transform-origin:50% 0}'
  + '.enemy-node.enemy-overlevel:after{color:#ff5b5b!important;border-color:#ff5b5b!important;text-shadow:0 0 6px #ff1f1f66}';
document.head.append(enemyLabelStyles);
