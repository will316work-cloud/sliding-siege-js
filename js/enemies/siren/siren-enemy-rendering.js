/* ============================================================
   SIREN — RENDERING

   drawSirenLinks() rewritten using the same gridOffsetMetrics/
   enemyFootprintCenter/getOrCreateThreadOverlay('grid')/drawThread
   primitives as golem-enemy-rendering.js's drawGolemLinks() — the
   original source duplicated this geometry identically across
   both functions.

   drawSirenCurseThreads() rewritten using getOrCreateThreadOverlay
   ('document')/elementCenterPoint/drawThread instead of its
   original inline scrollX/scrollY + getBoundingClientRect() math.
   ============================================================ */

function drawSirenLinks(gridEl) {
  var sirens = Object.values(state.enemies).filter(function(en) {
    return isSiren(en) && en.linkedIds && en.linkedIds.length > 0;
  });
  if (sirens.length === 0) return;

  var metrics = gridOffsetMetrics(gridEl);
  if (!metrics) return;

  var lines = [];
  sirens.forEach(function(siren) {
    var sirenCenter = enemyFootprintCenter(siren, metrics);
    siren.linkedIds.forEach(function(id) {
      var target = state.enemies[id];
      if (!target) return;
      lines.push([sirenCenter, enemyFootprintCenter(target, metrics)]);
    });
  });
  if (lines.length === 0) return;

  var svg = getOrCreateThreadOverlay(null, 'siren-link-svg', 'grid');

  lines.forEach(function(pair) {
    drawThread(svg, pair[0], pair[1], {
      stroke: '#2de0d6',
      strokeOpacity: 0.65,
      strokeWidth: 3,
      dasharray: '3,6'
    });
  });

  gridEl.appendChild(svg);
}

function drawSirenCurseThreads() {
  var sirens = Object.values(state.enemies).filter(isSiren);
  var hasAnyCurse = Object.keys(state.sirenCursedAttacks || {}).length > 0 || Object.keys(state.sirenCursedItems || {}).length > 0;
  if (sirens.length === 0 || !hasAnyCurse) {
    var existing = document.getElementById('sirenCurseOverlay');
    if (existing) existing.remove();
    return;
  }

  var svg = getOrCreateThreadOverlay('sirenCurseOverlay', 'siren-curse-svg', 'document');

  function drawThreadsFor(map, prefix) {
    Object.keys(map).forEach(function(key) {
      var cardEl = document.getElementById(prefix + key);
      if (!cardEl) return;
      var p2 = elementCenterPoint(cardEl);
      map[key].forEach(function(sirenId) {
        var siren = state.enemies[sirenId];
        if (!siren) return;
        var p1 = resolveCastPoint(siren);
        if (!p1) return;
        drawThread(svg, p1, p2, {
          stroke: '#c040ff',
          strokeOpacity: 0.7,
          strokeWidth: 2,
          dasharray: '2,7'
        });
      });
    });
  }

  drawThreadsFor(state.sirenCursedAttacks || {}, 'attackCard_');
  drawThreadsFor(state.sirenCursedItems || {}, 'itemCard_');

  document.body.appendChild(svg);
}

function animateThreadSnap(siren) {
  var cell = cellElAt(siren.anchor[0], siren.anchor[1]);
  if (!cell) return;
  var snap = document.createElement('div');
  snap.className = 'siren-thread-snap';
  cell.appendChild(snap);
  setTimeout(function(){ snap.remove(); }, 500);
}

function attachSirenNoteLoop(containerEl, count) {
  if (!count || count <= 0) return;
  var spreadOffsets = [[0,0],[-12,3],[12,3]];
  for (var i=0; i<count; i++) {
    var note = document.createElement('div');
    note.className = 'siren-note';
    note.textContent = '♪';
    var off = spreadOffsets[i % spreadOffsets.length];
    note.style.left = 'calc(50% + ' + off[0] + 'px)';
    note.style.top = 'calc(10% + ' + off[1] + 'px)';
    note.style.animationDelay = (i * 0.25) + 's';
    containerEl.appendChild(note);
  }
}
