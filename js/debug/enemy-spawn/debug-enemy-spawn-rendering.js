/* ============================================================
   DEBUG ENEMY SPAWN — RENDERING

   buildDebugEnemySpawnSection() is extracted from the top portion
   of the original monolithic buildDebugPanelDOM (the type-button
   row, hint text, and Confirm Spawn button) — including the
   section's own title, matching how every other debug section
   below carries its own title.
   ============================================================ */

function buildDebugEnemySpawnSection() {
  var fragment = document.createDocumentFragment();

  var title = document.createElement('div');
  title.className = 'debug-panel-title';
  title.textContent = '🛠️ Debug: Spawn Enemy';
  fragment.appendChild(title);

  var typeRow = document.createElement('div');
  typeRow.className = 'debug-row vertical';
  DEBUG_ENEMY_TYPES.forEach(function(type) {
    var btn = document.createElement('div');
    btn.className = 'debug-type-btn' + (debugSelectedType === type ? ' selected' : '') + (otherDebugInteractionsLocked() ? ' disabled' : '');
    btn.textContent = type;
    btn.onclick = function() {
      if (otherDebugInteractionsLocked()) return;
      debugSelectedType = (debugSelectedType === type) ? null : type;
      debugPreviewCell = null;
      buildGridDOM();
    };
    typeRow.appendChild(btn);
  });
  fragment.appendChild(typeRow);

  var hint = document.createElement('div');
  hint.className = 'debug-hint';
  if (debugSelectedType) {
    hint.textContent = debugPreviewCell
      ? ('Previewing ' + debugSelectedType + ' at (' + debugPreviewCell[0] + ',' + debugPreviewCell[1] + '). Confirm or tap another tile.')
      : ('Tap a tile to preview where the ' + debugSelectedType + ' will spawn.');
  } else {
    hint.textContent = 'Pick an enemy type, then tap a tile on the grid to preview its placement.';
  }
  fragment.appendChild(hint);

  var btnRow = document.createElement('div');
  btnRow.className = 'debug-row';
  var confirmBtn = document.createElement('button');
  confirmBtn.className = 'action';
  confirmBtn.textContent = 'Confirm Spawn';
  confirmBtn.disabled = !debugSelectedType || !debugPreviewCell || otherDebugInteractionsLocked();
  confirmBtn.onclick = debugConfirmSpawnEnemy;
  btnRow.appendChild(confirmBtn);
  fragment.appendChild(btnRow);

  return fragment;
}
