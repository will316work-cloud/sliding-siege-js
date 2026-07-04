/* ============================================================
   DEBUG CLEAR FLOOR — RENDERING
   ============================================================ */

function buildDebugClearFloorSection() {
  var fragment = document.createDocumentFragment();

  var clearFloorTitle = document.createElement('div');
  clearFloorTitle.className = 'debug-panel-title';
  clearFloorTitle.textContent = '🧹 Clear Floor';
  fragment.appendChild(clearFloorTitle);

  var clearFloorBtnRow = document.createElement('div');
  clearFloorBtnRow.className = 'debug-row';
  var clearFloorBtn = document.createElement('button');
  clearFloorBtn.className = 'secondary danger';
  clearFloorBtn.textContent = 'Clear Floor → Shop';
  clearFloorBtn.disabled = state.enemyPhaseActive;
  clearFloorBtn.onclick = debugRequestClearFloor;
  clearFloorBtnRow.appendChild(clearFloorBtn);
  fragment.appendChild(clearFloorBtnRow);

  return fragment;
}
