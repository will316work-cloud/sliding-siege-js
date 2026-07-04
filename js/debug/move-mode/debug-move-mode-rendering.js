/* ============================================================
   DEBUG MOVE MODE — RENDERING
   ============================================================ */

function buildDebugMoveModeSection() {
  var fragment = document.createDocumentFragment();

  var moveTitle = document.createElement('div');
  moveTitle.className = 'debug-panel-title';
  moveTitle.textContent = '🧲 Move Enemy';
  fragment.appendChild(moveTitle);

  var moveBtnRow = document.createElement('div');
  moveBtnRow.className = 'debug-row';
  var moveToggleBtn = document.createElement('button');
  moveToggleBtn.className = (debugMoveModeActive ? 'secondary danger' : 'secondary') + (debugDeleteModeActive ? ' disabled' : '');   // CHANGED
  moveToggleBtn.textContent = debugMoveModeActive ? 'Disable Move Mode' : 'Enable Move Mode';

  moveToggleBtn.onclick = function() {
    if (debugDeleteModeActive) return;
    debugMoveModeActive = !debugMoveModeActive;
    debugMoveSource = null;
    debugMoveDestCell = null;
    selectedItem = null; itemTargetingMode = null; itemPreviewCell = null; itemSecondTarget = null;
    state.selectedItemUsedThisTurn = false;
    render();
  };

  moveBtnRow.appendChild(moveToggleBtn);
  fragment.appendChild(moveBtnRow);

  if (debugMoveModeActive) {
    var moveHint = document.createElement('div');
    moveHint.className = 'debug-hint';
    moveHint.textContent = !debugMoveSource ? 'Tap an enemy to select it.'
      : !debugMoveDestCell ? 'Now tap an empty destination with enough room.'
      : 'Tap the highlighted tile again to confirm, or tap elsewhere to re-pick.';
    fragment.appendChild(moveHint);
  }

  return fragment;
}
