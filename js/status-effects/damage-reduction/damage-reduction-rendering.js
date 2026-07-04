/* ============================================================
   DAMAGE REDUCTION — RENDERING

   buildDamageReductionBadge(parentEl) is a new extracted
   helper. The original source built this exact badge inline,
   identically, at three call sites:
     - buildGridDOM            (single-cell enemies)
     - drawMultiCellEnemyBlocks (golem/siren-sized enemies)
     - drawRollyBlocks          (stretched rolly polly enemies)
   Each call site is responsible for checking hasDamageReduction(en)
   before calling this and for choosing the correct parent
   element (ediv / block) to append to.

   The text-based reduction line shown in the enemy tip panel
   ("Damage reduced by X% ...") is NOT part of this file — it
   stays in showEnemyTipPanel (see tip-panel-rendering.js) since
   it's stats-list text, not a badge.
   ============================================================ */

function buildDamageReductionBadge(parentEl) {
  var reductionBadge = document.createElement('div');
  reductionBadge.className = 'damage-reduction-badge';
  reductionBadge.textContent = '🛡️';
  parentEl.appendChild(reductionBadge);
}
