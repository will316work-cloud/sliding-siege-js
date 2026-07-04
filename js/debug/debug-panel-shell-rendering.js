/* ============================================================
   DEBUG PANEL SHELL — RENDERING

   buildDebugPanelDOM() is REWRITTEN as a thin shell. The original
   source built every section's markup directly, inline, in one
   ~190-line function. Each section now has its own builder
   (buildDebugEnemySpawnSection, buildDebugTogglesSection,
   buildDebugMoveModeSection, buildDebugDeleteModeSection,
   buildDebugClearFloorSection, buildDebugJumpFloorSection — see
   each section's own -rendering.js file), and this function just
   creates the outer panel div and calls each section builder in
   order, inserting the same divider elements between them that
   the original had.
   ============================================================ */

function buildDebugPanelDOM() {
  if (!debugModeVisible) return document.createDocumentFragment();   // NEW — empty, renders nothing

  var panel = document.createElement('div');
  panel.className = 'debug-panel';

  panel.appendChild(buildDebugEnemySpawnSection());

  var divider1 = document.createElement('div');
  divider1.className = 'debug-divider';
  panel.appendChild(divider1);

  panel.appendChild(buildDebugTogglesSection());

  var divider2 = document.createElement('div');
  divider2.className = 'debug-divider';
  panel.appendChild(divider2);

  panel.appendChild(buildDebugMoveModeSection());

  var divider3 = document.createElement('div');
  divider3.className = 'debug-divider';
  panel.appendChild(divider3);

  panel.appendChild(buildDebugDeleteModeSection());

  var divider4 = document.createElement('div');
  divider4.className = 'debug-divider';
  panel.appendChild(divider4);

  panel.appendChild(buildDebugClearFloorSection());

  var divider5 = document.createElement('div');
  divider5.className = 'debug-divider';
  panel.appendChild(divider5);

  panel.appendChild(buildDebugJumpFloorSection());

  return panel;
}
