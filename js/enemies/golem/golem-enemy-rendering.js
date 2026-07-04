/* ============================================================
   GOLEM — RENDERING

   drawGolemLinks() rewritten to use the generic thread-rendering.js
   primitives (gridOffsetMetrics / enemyFootprintCenter /
   getOrCreateThreadOverlay('grid') / drawThread) instead of
   duplicating the grid-metrics + centerOfEnemy() geometry that
   was identically copy-pasted into the original drawSirenLinks
   (see siren-enemy-rendering.js, which now shares this same
   pattern).
   ============================================================ */

function drawGolemLinks(gridEl) {
  var golems = Object.values(state.enemies).filter(function(en) {
    return en.type === 'golem' && en.linkedIds && en.linkedIds.length > 0;
  });
  if (golems.length === 0) {
    return;
  }

  var metrics = gridOffsetMetrics(gridEl);
  if (!metrics) {
    return;
  }

  var lines = [];
  for (var gi = 0; gi < golems.length; gi++) {
    var golem = golems[gi];
    var golemCenter = enemyFootprintCenter(golem, metrics);
    for (var li = 0; li < golem.linkedIds.length; li++) {
      var target = state.enemies[golem.linkedIds[li]];
      if (!target) continue;
      lines.push([golemCenter, enemyFootprintCenter(target, metrics)]);
    }
  }

  if (lines.length === 0) {
    return;
  }

  var svg = getOrCreateThreadOverlay(null, 'golem-link-svg', 'grid');

  for (var i = 0; i < lines.length; i++) {
    drawThread(svg, lines[i][0], lines[i][1], {
      stroke: '#b9b3a0',
      strokeOpacity: 0.6,
      strokeWidth: 3,
      dasharray: '6,5'
    });
  }

  gridEl.appendChild(svg);
}
