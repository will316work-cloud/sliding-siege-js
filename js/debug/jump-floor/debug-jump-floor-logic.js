/* ============================================================
   DEBUG JUMP FLOOR — LOGIC

   Depends on: startNewTurn() (see turn-logic.js), animateFloorSetup()
   (see spawn-pool-processor.js), render() (see turn-rendering.js),
   showConfirm() (see general-ui-logic.js).
   ============================================================ */

var debugJumpFloorValue = '';

async function debugJumpToFloor(floorNum) {
  targetingMode = null; previewTarget = null; selectedItem = null;
  itemTargetingMode = null; itemPreviewCell = null; itemSecondTarget = null;
  debugMoveModeActive = false; debugMoveSource = null;
  debugDeleteModeActive = false; debugDeleteTarget = null;
  hideTipPanel();

  state.floor = floorNum;
  startNewTurn();
  state.enemyPhaseActive = true;
  render();
  await animateFloorSetup(state.floor);
  state.enemyPhaseActive = false;
  startNewTurn();
  render();
}

function debugRequestJumpFloor() {
  if (state.enemyPhaseActive) return;
  var trimmed = (debugJumpFloorValue || '').trim();
  var parsed = Number(trimmed);
  if (!/^\d+$/.test(trimmed) || !Number.isInteger(parsed) || parsed < 1) {
    toast('Enter a valid whole floor number (1 or higher).');
    return;
  }
  showConfirm('🗺️ Jump to Floor ' + parsed + '?', 'This will discard the current floor\'s enemies and progress, and generate a brand new Floor ' + parsed + ' from scratch. Your score, charges, and items are kept. Continue?', function() {
    log('[DEBUG] Jumping to floor ' + parsed + '.');
    toast('Jumping to Floor ' + parsed + '!');
    debugJumpToFloor(parsed);
  });
}
