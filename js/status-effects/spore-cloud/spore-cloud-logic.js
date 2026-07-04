/* ============================================================
   SPORE CLOUD — LOGIC

   Spore clouds are real grid occupants now (tracked via refs in
   state.grid, same array every enemy uses — see grid-logic.js's
   header comment for the full transparency model), but are NOT
   enemies: no id in state.enemies, no anchor/size/hp fields. Their
   own data lives in state.sporeClouds (id -> {id, turnsRemaining}),
   and "where is this cloud right now" is always answered by looking
   at the grid (sporeCloudsAtCellRef for "what's in this cell",
   findSporeCloudCell in teleport-item-logic.js for "which cell holds
   this id") rather than a redundant position field on the cloud
   object itself.

   spewSporeCloudsAround() still pushes one cloud per cell of the 3x3
   area around a Mushy (re-spewing onto an already-clouded cell
   refreshes duration rather than stacking duplicate clouds in the
   same cell). tickSporeClouds() still decrements/removes expired
   clouds once per enemy phase. The attack-disabling-on-hit mechanism
   (disableAttackFromSporeCloud / tickSporeDisabledAttacks /
   isAttackSporeDisabled) is UNCHANGED from the original Mushy work —
   only the destruction trigger moved (it's now inline in
   resolveAttack, see general-attack-logic.js, since destruction
   requires reading the attack's hit cells' actual ref arrays, which
   only resolveAttack already has on hand).
   ============================================================ */

function makeSporeCloud(turns) {
  var id = state.nextSporeCloudId++;
  return { id: id, turnsRemaining: turns == null ? 2 : turns };
}

function spewSporeCloudsAround(en) {
  var ar = en.anchor[0], ac = en.anchor[1];
  for (var dr = -1; dr <= 1; dr++) {
    for (var dc = -1; dc <= 1; dc++) {
      var rr = ((ar + dr) % state.rows + state.rows) % state.rows;
      var cc = ((ac + dc) % state.cols + state.cols) % state.cols;
      var existingCloud = sporeCloudsAtCellRef(rr, cc)[0];
      if (existingCloud) {
        existingCloud.turnsRemaining = Math.max(existingCloud.turnsRemaining, 2);
      } else {
        var cloud = makeSporeCloud(2);
        state.sporeClouds[cloud.id] = cloud;
        addSporeCloudRefAt(rr, cc, cloud.id);
      }
    }
  }
}

function tickSporeClouds() {
  Object.keys(state.sporeClouds).forEach(function(id) {
    var cloud = state.sporeClouds[id];
    cloud.turnsRemaining--;
    if (cloud.turnsRemaining <= 0) {
      var cell = findSporeCloudCell(cloud.id);
      if (cell) removeSporeCloudRefAt(cell[0], cell[1], cloud.id);
      delete state.sporeClouds[id];
    }
  });
}

function disableAttackFromSporeCloud(key) {
  state.sporeDisabledAttacks[key] = 2;
  log('🍄 Spore cloud bursts — ' + (ATTACK_DEFS[key] ? ATTACK_DEFS[key].name : key) + ' is disabled for the rest of this turn and all of next turn!');
}

function tickSporeDisabledAttacks() {
  Object.keys(state.sporeDisabledAttacks).forEach(function(key) {
    state.sporeDisabledAttacks[key]--;
    if (state.sporeDisabledAttacks[key] <= 0) delete state.sporeDisabledAttacks[key];
  });
}

function isAttackSporeDisabled(key) {
  return !!(state.sporeDisabledAttacks[key] > 0);
}