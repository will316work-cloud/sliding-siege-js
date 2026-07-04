/* ============================================================
   DEBUG JUMP FLOOR — RENDERING
   ============================================================ */

function buildDebugJumpFloorSection() {
  var fragment = document.createDocumentFragment();

  var jumpFloorTitle = document.createElement('div');
  jumpFloorTitle.className = 'debug-panel-title';
  jumpFloorTitle.textContent = '🗺️ Jump to Floor';
  fragment.appendChild(jumpFloorTitle);

  var jumpFloorRow = document.createElement('div');
  jumpFloorRow.className = 'debug-row';
  var jumpFloorInput = document.createElement('input');
  jumpFloorInput.type = 'number';
  jumpFloorInput.min = '1';
  jumpFloorInput.step = '1';
  jumpFloorInput.placeholder = 'Floor #';
  jumpFloorInput.value = debugJumpFloorValue || '';
  jumpFloorInput.style.width = '60px';
  jumpFloorInput.style.background = '#1f1f30';
  jumpFloorInput.style.border = '1px solid #34344a';
  jumpFloorInput.style.borderRadius = '6px';
  jumpFloorInput.style.color = '#eee';
  jumpFloorInput.style.padding = '5px 6px';
  jumpFloorInput.style.fontSize = '12px';
  jumpFloorInput.disabled = state.enemyPhaseActive;
  jumpFloorInput.oninput = function() { debugJumpFloorValue = jumpFloorInput.value; };
  jumpFloorRow.appendChild(jumpFloorInput);
  fragment.appendChild(jumpFloorRow);

  var jumpFloorBtnRow = document.createElement('div');
  jumpFloorBtnRow.className = 'debug-row';
  var jumpFloorBtn = document.createElement('button');
  jumpFloorBtn.className = 'action';
  jumpFloorBtn.textContent = 'Confirm';
  jumpFloorBtn.disabled = state.enemyPhaseActive;
  jumpFloorBtn.onclick = debugRequestJumpFloor;
  jumpFloorBtnRow.appendChild(jumpFloorBtn);
  fragment.appendChild(jumpFloorBtnRow);

  return fragment;
}
