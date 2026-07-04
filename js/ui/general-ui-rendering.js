/* ============================================================
   GENERAL UI RENDERING
   ============================================================ */

function spacerDiv() {
  var d = document.createElement('div');
  d.className = 'row-spacer';
  return d;
}

// Slime cluster coloring has been removed (see slime-enemy-logic.js
// header) — the original en.clusterColor special case is gone, and
// slime now gets a fixed entry in the type-color map below ('#2f9e52',
// matching the green used for slime cluster threads in
// slime-enemy-rendering.js's drawSlimeStrands). Previously slime had
// NO entry here at all, relying entirely on the now-removed
// clusterColor field.
function enemyColorHex(en) {
  var map = {
    standard: '#ff8a8a',
    slime: '#2f9e52',
    golem: '#b9b3a0',
    bomb: '#6e6eff',
    rolly: '#ffb877',
    siren: '#2de0d6',
    sprite: '#ffffff'
  };
  return map[en.type] || '#ffce4a';
}
