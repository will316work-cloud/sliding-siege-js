/* ============================================================
   DEBUG MOVE MODE — LOGIC

   debugMoveModeOnCellClick() is FIXED versus the original source:
   en.size is now a [width, height] array (see general-enemy-logic.js
   for the size/baseSize design), not a scalar. The original's
   `var size = en.size; for(i<size;...) for(j<size;...)` loops are
   replaced with separate row/col bounds from en.size[0]/en.size[1].
   ============================================================ */

var debugMoveModeActive = false;
var debugMoveSource = null;
var debugMoveDestCell = null;   // NEW — tracks previewed destination before confirming

function debugMoveModeOnCellClick(r, c) {
  if (!debugMoveSource) {
    var occupant = getCycledOccupant(r, c);
    if (!occupant || occupant.kind !== 'enemy') { toast('Tap a tile that has an enemy on it.'); return; }
    debugMoveSource = [r, c, occupant];
    buildGridDOM();
    return;
  }
  var en = state.enemies[debugMoveSource[2].id];
  if (!en) { debugMoveSource = null; debugMoveDestCell = null; buildGridDOM(); return; }

  if (!debugMoveDestCell) {                                        // NEW — first destination click only previews
    debugMoveDestCell = [r, c];
    buildGridDOM();
    return;
  }

  if (debugMoveDestCell[0] !== r || debugMoveDestCell[1] !== c) {  // NEW — re-pick destination
    debugMoveDestCell = [r, c];
    buildGridDOM();
    return;
  }

  var srcIsTransparent = isTransparentEnemyType(en.type);
  if (!srcIsTransparent) {
    var fits = true;
    for (var i=0;i<en.size[0];i++) for (var j=0;j<en.size[1];j++) {
      var rr=(r+i)%state.rows, cc=(c+j)%state.cols;
      if (cellHasNonTransparentOccupant(rr, cc) && !(rr===debugMoveSource[0] && cc===debugMoveSource[1])) fits = false;
    }
    if (!fits) { toast("That spot doesn't have enough room for this enemy."); return; }
  }

  teleportOccupantTo(debugMoveSource[2], [r, c]);
  log('[DEBUG] Moved ' + en.label + ' to (' + r + ',' + c + ').');
  toast(en.label + ' moved!');
  debugMoveSource = null;
  debugMoveDestCell = null;
  selectedItem = null; itemTargetingMode = null; itemPreviewCell = null; itemSecondTarget = null;
  state.selectedItemUsedThisTurn = false;
  render();
}

function getDebugMoveFootprintCells(cell) {   // NEW — mirrors ITEM_PREVIEW_CELL_RESOLVERS.teleport
  if (!debugMoveSource) return [[cell[0], cell[1]]];
  var en = state.enemies[debugMoveSource[2].id];
  var size = en ? en.size : [1,1];
  var cells = [];
  for (var i=0;i<size[0];i++) for (var j=0;j<size[1];j++) cells.push([(cell[0]+i)%state.rows, (cell[1]+j)%state.cols]);
  return cells;
}
