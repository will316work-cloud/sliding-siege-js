/* ============================================================
   DEBUG DELETE MODE — LOGIC
   ============================================================ */

var debugDeleteModeActive = false;
var debugDeleteTarget = null;

function debugDeleteModeOnCellClick(r, c) {
  var occupant = getCycledOccupant(r, c);   // CHANGED
  if (!occupant) { toast('Tap a tile that has something on it.'); return; }
  debugDeleteTarget = [r, c, occupant];     // CHANGED
  buildGridDOM();
}

function debugRequestDeleteConfirm() {
  if (!debugDeleteTarget) return;
  var occupant = debugDeleteTarget[2];                 // CHANGED

  if (occupant.kind === 'sporeCloud') {                // NEW
    var cloud = state.sporeClouds[occupant.id];
    if (cloud) {
      removeSporeCloudRefAt(debugDeleteTarget[0], debugDeleteTarget[1], cloud.id);
      delete state.sporeClouds[cloud.id];
      toast('Spore cloud deleted!');
    }
    debugDeleteTarget = null; render(); return;
  }

  var en = state.enemies[occupant.id];                 // CHANGED
  if (!en) { debugDeleteTarget = null; render(); return; }
  if (isSiren(en)) clearSirenCurse(en);
  if (isGhostOrPhantom(en)) removeDisabledLinesFromSource(en.id);  // NEW
  clearEnemyFromGrid(en);
  delete state.enemies[en.id];
  log('[DEBUG] Deleted ' + en.label + ' at (' + en.anchor[0] + ',' + en.anchor[1] + ').');
  toast(en.label + ' deleted!');
  debugDeleteTarget = null;
  render();
}

function clearEnemyFromGrid(en) {
  if (isRolly(en) && en.stretchAxis) { clearRollyFootprint(en); return; }
  for (var r=0; r<state.rows; r++) for (var c=0; c<state.cols; c++) removeEnemyRefAt(r, c, en.id);  // CHANGED
}
