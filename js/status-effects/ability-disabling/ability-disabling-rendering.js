/* ============================================================
   ABILITY DISABLING — RENDERING

   drawMageLinks() draws the dashed line from a Mage to the
   attack card it has disabled. It uses the generic 'document'
   mode thread overlay (getOrCreateThreadOverlay / drawThread,
   from thread-rendering.js) plus resolveCastPoint() (for the
   mage's on-screen point) and elementCenterPoint() (for the
   card's on-screen point) — both from animation-rendering.js /
   thread-rendering.js respectively.

   Siren's curse-thread visual (drawSirenCurseThreads) uses the
   same generic primitives but stays in siren-enemy-rendering.js
   since it owns siren-specific data (state.sirenCursedAttacks /
   state.sirenCursedItems).
   ============================================================ */

function drawMageLinks() {
  var mages = Object.values(state.enemies).filter(function(en) {
    return en.type === 'mage' && en.disabledAttackKey;
  });
  if (mages.length === 0) {
    var existing = document.getElementById('mageLinkOverlay');
    if (existing) existing.remove();
    return;
  }

  var svg = getOrCreateThreadOverlay('mageLinkOverlay', 'mage-link-svg', 'document');

  for (var mi = 0; mi < mages.length; mi++) {
    var mage = mages[mi];
    var p1 = resolveCastPoint(mage);
    var cardEl = document.getElementById('attackCard_' + mage.disabledAttackKey);
    if (!p1 || !cardEl) continue;
    var p2 = elementCenterPoint(cardEl);

    drawThread(svg, p1, p2, {
      stroke: '#d9a8ff',
      strokeOpacity: 0.7,
      strokeWidth: 2,
      dasharray: '4,6'
    });
  }

  document.body.appendChild(svg);
}
