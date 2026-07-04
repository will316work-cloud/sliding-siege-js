/* ============================================================
   SLIME — RENDERING

   drawSlimeStrands() draws one connected dashed "string" per
   slime cluster, always in a fixed green — slime cluster
   coloring has been removed (see slime-enemy-logic.js header).
   Rewritten to use the generic thread-rendering.js primitives
   (gridOffsetMetrics / getOrCreateThreadOverlay / drawThreadPath)
   instead of duplicating grid-metrics + raw <polyline> code
   inline.

   animateSlimeClusterJoin() plays the cast-thread animation
   (see playCastThreadAnimation in animation-rendering.js) from
   a newly-joined slime to its nearest cluster-mate. No longer
   guards on clusterColor (removed) — only on having a cluster
   to join.
   ============================================================ */

function drawSlimeStrands(gridEl) {
  var slimes = Object.values(state.enemies).filter(function(en) { return en.type === 'slime'; });
  if (slimes.length < 2) {
    return;
  }

  var metrics = gridOffsetMetrics(gridEl);
  if (!metrics) return;

  function centerOf(r, c) {
    return [metrics.baseLeft + c*metrics.stride + metrics.cellSize/2, metrics.baseTop + r*metrics.stride + metrics.cellSize/2];
  }

  function gridDist(a, b) {
    var dr = b.anchor[0] - a.anchor[0];
    var dc = b.anchor[1] - a.anchor[1];
    return Math.sqrt(dr*dr + dc*dc);
  }

  function buildClusterPath(members) {
    var remaining = members.slice();
    var path = [remaining.shift()];
    while (remaining.length > 0) {
      var current = path[path.length - 1];
      var nearestIdx = 0;
      var nearestDist = Infinity;
      for (var i=0; i<remaining.length; i++) {
        var d = gridDist(current, remaining[i]);
        if (d < nearestDist) { nearestDist = d; nearestIdx = i; }
      }
      path.push(remaining[nearestIdx]);
      remaining.splice(nearestIdx, 1);
    }
    return path;
  }

  var clusterIdSet = {};
  slimes.forEach(function(s){ clusterIdSet[s.clusterId] = true; });
  var clusterIds = Object.keys(clusterIdSet);

  var paths = [];
  for (var ci = 0; ci < clusterIds.length; ci++) {
    var cid = clusterIds[ci];
    var members = slimes.filter(function(s) { return String(s.clusterId) === String(cid); });
    if (members.length < 2) continue;
    paths.push(buildClusterPath(members));
  }

  if (paths.length === 0) {
    return;
  }

  var svg = getOrCreateThreadOverlay(null, 'slime-strand-svg', 'grid');

  for (var pi = 0; pi < paths.length; pi++) {
    var path = paths[pi];
    var points = path.map(function(en) { return centerOf(en.anchor[0], en.anchor[1]); });
    drawThreadPath(svg, points, {
      stroke: '#2f9e52',
      strokeOpacity: 0.6,
      strokeWidth: 3,
      dasharray: '6,5'
    });
  }

  gridEl.appendChild(svg);
}

async function animateSlimeClusterJoin(slime) {
  var mates = Object.values(state.enemies).filter(function(e) {
    return e.type === 'slime' && e.id !== slime.id && String(e.clusterId) === String(slime.clusterId);
  });
  if (mates.length === 0) return;

  function gridDist(a, b) {
    var dr = b.anchor[0] - a.anchor[0];
    var dc = b.anchor[1] - a.anchor[1];
    return Math.sqrt(dr*dr + dc*dc);
  }
  var nearest = mates[0], nearestDist = gridDist(slime, mates[0]);
  for (var i=1; i<mates.length; i++) {
    var d = gridDist(slime, mates[i]);
    if (d < nearestDist) { nearestDist = d; nearest = mates[i]; }
  }

  await playCastThreadAnimation(slime, nearest, '#2f9e52');
}
