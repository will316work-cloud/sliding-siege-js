/* ============================================================
   DEBUG DELETE MODE — RENDERING
   ============================================================ */

function buildDebugDeleteModeSection() {
  var fragment = document.createDocumentFragment();

  var deleteTitle = document.createElement('div');
  deleteTitle.className = 'debug-panel-title';
  deleteTitle.textContent = '🗑️ Delete Enemy';
  fragment.appendChild(deleteTitle);

  var deleteBtnRow = document.createElement('div');
  deleteBtnRow.className = 'debug-row';
  var deleteToggleBtn = document.createElement('button');
  deleteToggleBtn.className = (debugDeleteModeActive ? 'secondary danger' : 'secondary') + (debugMoveModeActive ? ' disabled' : '');   // CHANGED
  deleteToggleBtn.textContent = debugDeleteModeActive ? 'Disable Delete Mode' : 'Enable Delete Mode';

  deleteToggleBtn.onclick = function() {
    if (debugMoveModeActive) return;
    debugDeleteModeActive = !debugDeleteModeActive;
    debugDeleteTarget = null;
    render();
  };

  deleteBtnRow.appendChild(deleteToggleBtn);
  fragment.appendChild(deleteBtnRow);

  if (debugDeleteModeActive) {
    var deleteHint = document.createElement('div');
    deleteHint.className = 'debug-hint';
    deleteHint.textContent = !debugDeleteTarget ? 'Tap an enemy to select it for deletion.' : 'Selected — press Confirm Delete or tap another enemy.';
    fragment.appendChild(deleteHint);

    var deleteConfirmRow = document.createElement('div');
    deleteConfirmRow.className = 'debug-row';
    var deleteConfirmBtn = document.createElement('button');
    deleteConfirmBtn.className = 'action';
    deleteConfirmBtn.textContent = 'Confirm Delete';
    deleteConfirmBtn.disabled = !debugDeleteTarget;
    deleteConfirmBtn.onclick = debugRequestDeleteConfirm;
    deleteConfirmRow.appendChild(deleteConfirmBtn);
    fragment.appendChild(deleteConfirmRow);
  }

  return fragment;
}
