/* ============================================================
   DEBUG ENEMY SPAWN — LOGIC

   debugConfirmSpawnEnemy()'s siren cap check is FIXED versus the
   original source: MAX_SIRENS_ALIVE was removed (see global-state
   refactor) and the cap now lives per-floor in FLOOR_SPAWN_POOLS'
   typeCaps (see floor-spawn-pool.js). This reads
   getSpawnPoolEntryForFloor(state.floor).typeCaps.siren instead,
   falling back to Infinity (uncapped) if the current floor has no
   typeCaps.siren entry at all.

   debugOnCellClick() is the dispatcher cell-click-logic.js's grid
   onclick handler calls into when a debug enemy type is selected —
   it itself dispatches further into move-mode/delete-mode handlers
   if either of those is active, matching the original's priority
   order (move mode and delete mode both take precedence over spawn
   preview).
   ============================================================ */

var DEBUG_ENEMY_TYPES = ['standard', 'slime', 'bomb', 'golem', 'mage', 'rolly', 'siren', 'sprite', 'mushy', 'ghost', 'phantom'];  // CHANGED
var debugSelectedType = null;
var debugPreviewCell = null;

function debugFootprintCells(type, r, c) {
  var size = (type === 'golem' || type === 'phantom') ? 2 : (type === 'siren' ? 3 : 1);  // CHANGED
  var cells = [];
  for (var dr=0; dr<size; dr++) for (var dc=0; dc<size; dc++) cells.push([(r+dr)%state.rows, (c+dc)%state.cols]);
  return cells;
}

function debugOnCellClick(r, c) {
  if (debugMoveModeActive) { debugMoveModeOnCellClick(r, c); return; }
  if (debugDeleteModeActive) { debugDeleteModeOnCellClick(r, c); return; }
  if (!debugSelectedType) return;
  debugPreviewCell = [r, c];
  buildGridDOM();
}

async function debugConfirmSpawnEnemy() {
  if (!debugSelectedType || !debugPreviewCell) return;
  var r = debugPreviewCell[0], c = debugPreviewCell[1];
  var type = debugSelectedType;
  var footprint = debugFootprintCells(type, r, c);
  var occupied = !isTransparentEnemyType(type) && footprint.some(function(cell){ return cellHasNonTransparentOccupant(cell[0], cell[1]); });  // CHANGED
  if (occupied) { toast('Target tile(s) are occupied — pick an empty spot.'); return; }
  
  var floorEntry = getSpawnPoolEntryForFloor(state.floor);
  var sirenCap = (floorEntry && floorEntry.typeCaps && floorEntry.typeCaps.siren != null) ? floorEntry.typeCaps.siren : Infinity;
  if (type === 'siren' && aliveSirenCount() >= sirenCap) {
    toast('Only ' + sirenCap + ' Sirens can be alive at once.');
    return;
  }
  var scaledHp = scaledEnemyHp(type, state.floor);
  var enemy = makeEnemy(type, scaledHp);
  if (type === 'slime') chooseSlimeClusterAssignment(enemy);
  placeEnemyAt(r, c, enemy);
  log('[DEBUG] Spawned ' + type + ' at (' + r + ',' + c + ').');
  toast('Spawned ' + type + '!');
  debugSelectedType = null;
  debugPreviewCell = null;
  render();
  if (type === 'slime') await animateSlimeClusterJoin(enemy);
  if (type === 'golem') await animateAndRerollGolemLinks();
  if (type === 'siren') await animateAndLinkSiren(enemy);
}
