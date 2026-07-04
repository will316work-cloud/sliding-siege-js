/* ============================================================
   STUN — RENDERING

   buildStunBadge(parentEl) is a new extracted helper. The
   original source built this exact badge inline, identically,
   at three call sites:
     - buildGridDOM            (single-cell enemies)
     - drawMultiCellEnemyBlocks (golem/siren-sized enemies)
     - drawRollyBlocks          (stretched rolly polly enemies)
   Each call site is responsible for checking isStunned(en)
   before calling this and for choosing the correct parent
   element (ediv / block) to append to.
   ============================================================ */

function buildStunBadge(parentEl) {
  var stunBadge = document.createElement('div');
  stunBadge.className = 'stun-badge';
  stunBadge.textContent = '😵';
  parentEl.appendChild(stunBadge);
}
