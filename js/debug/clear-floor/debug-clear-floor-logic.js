/* ============================================================
   DEBUG CLEAR FLOOR — LOGIC

   Depends on: showConfirm() (see general-ui-logic.js),
   emptyGrid() (see grid-logic.js), openShop() (see
   shop-rendering.js).
   ============================================================ */

function debugRequestClearFloor() {
  if (state.enemyPhaseActive) return;
  showConfirm('🧹 Clear Floor?', 'This will instantly remove every enemy currently on the grid and send you straight to the shop, exactly as if you cleared the floor normally. Continue?', function() {
    targetingMode = null; previewTarget = null; selectedItem = null;
    itemTargetingMode = null; itemPreviewCell = null; itemSecondTarget = null;
    debugMoveModeActive = false; debugMoveSource = null;
    debugDeleteModeActive = false; debugDeleteTarget = null;
    hideTipPanel();
    state.enemies = {};
    state.grid = emptyGrid(state.rows, state.cols);
    state.sirenCursedAttacks = {};
    state.sirenCursedItems = {};
    state.sporeClouds = {};                  // NEW
    state.sporeDisabledAttacks = {};         // NEW
    state.disabledLines = [];                // NEW
    log('[DEBUG] Floor cleared manually.');
    toast('Floor cleared!');
    render();
    openShop();
  });
}
