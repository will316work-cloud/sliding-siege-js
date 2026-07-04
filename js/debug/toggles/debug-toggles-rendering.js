/* ============================================================
   DEBUG TOGGLES — RENDERING

   buildDebugTogglesSection() is a NEW extracted function — the
   original source had no dedicated section builder here, just 3
   consecutive panel.appendChild(buildDebugToggleRow(...)) calls
   directly inline inside buildDebugPanelDOM. This wraps those 3
   calls into one function purely for structural symmetry with
   the other 5 debug sections (enemy-spawn, move-mode, delete-mode,
   clear-floor, jump-floor), each of which has its own section
   builder in this refactor.

   buildDebugToggleRow() (the generic switch-row builder) stays
   here too, alongside its only consumer, rather than in
   debug-panel-shell-rendering.js — it's toggle-specific markup,
   not generic panel-shell scaffolding.
   ============================================================ */

function buildDebugToggleRow(label, isOn, onToggle) {
  var row = document.createElement('div');
  row.className = 'debug-toggle-row';
  var text = document.createElement('span');
  text.textContent = label;
  var switchEl = document.createElement('div');
  switchEl.className = 'debug-toggle-switch' + (isOn ? ' on' : '');
  switchEl.onclick = onToggle;
  row.appendChild(text);
  row.appendChild(switchEl);
  return row;
}

function buildDebugTogglesSection() {
  var fragment = document.createDocumentFragment();

  fragment.appendChild(buildDebugToggleRow('Infinite attacks', debugInfiniteAttacks, function() {
    debugInfiniteAttacks = !debugInfiniteAttacks;
    if (debugInfiniteAttacks) state.attacksRemainingThisTurn = Math.max(state.attacksRemainingThisTurn, 1);
    render();
  }));
  fragment.appendChild(buildDebugToggleRow('Infinite items', debugInfiniteItems, function() {
    debugInfiniteItems = !debugInfiniteItems;
    render();
  }));
  fragment.appendChild(buildDebugToggleRow('Infinite reverts', debugInfiniteReverts, function() {
    debugInfiniteReverts = !debugInfiniteReverts;
    if (debugInfiniteReverts) state.revertsLeft = Math.max(state.revertsLeft, 1);
    render();
  }));

  return fragment;
}

function syncDebugModeToggleButton() {   // NEW
  var btn = document.getElementById('debugModeToggleBtn');
  if (!btn) return;
  btn.textContent = debugModeVisible ? '🛠️ Hide Debug Mode' : '🛠️ Show Debug Mode';
  btn.onclick = function() {
    debugModeVisible = !debugModeVisible;
    render();
  };
}
