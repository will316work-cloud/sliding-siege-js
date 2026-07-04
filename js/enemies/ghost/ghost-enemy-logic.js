/* ============================================================
   GHOST — LOGIC

   Wrapped in an IIFE for the same reason as standard-enemy-logic.js
   — see its header comment.

   Ghost is the first enemy type to set ENEMY_CONSTRUCTORS.ghost
   .isTransparent = true (read by grid-logic.js's
   isTransparentEnemyType/isTransparentOccupant/
   cellHasNonTransparentOccupant — see that file's header comment
   for the full transparency model). Movement: 0 means Ghost is
   never handled by the generic random-step mover or any of the
   other per-type movement branches in
   general-enemy-logic.js's moveEnemiesOneStepSequenced() — instead
   that function calls resolveGhostPhantomTeleportsSequenced() (this
   file) directly for both Ghost and Phantom, once per enemy phase,
   in the exact slot regular movement would have happened.

   Curse application (row/col disabling) is a SEPARATE step from
   teleporting — see applyGhostPhantomCurses() below — run as its
   own ENEMY_PHASE_STEPS entry immediately after the movement step,
   per the agreed "teleport happens alongside movement; the curse
   happens right after, before the player's turn starts" sequencing.
   Both functions are shared between Ghost and Phantom (Phantom's
   own file, phantom-enemy-logic.js, only registers its
   ENEMY_CONSTRUCTORS entry — all behavior code lives here to avoid
   duplicating the teleport/curse logic across two files).
   ============================================================ */

(function() {
  var labelName = "Ghost";
  var description = "Teleports to a random tile every enemy phase instead of moving normally, and can land on an occupied tile. Right before your turn starts, it curses either the row or the column it currently occupies, disabling it for your upcoming turn. Killing it re-enables whatever it was disabling.";
  var baseHealth = 20;
  var baseSize = [1, 1];

  ENEMY_CONSTRUCTORS.ghost = function(hp) {
    return {
      hp: hp == null ? baseHealth : hp,
      label: labelName,
      baseSize: baseSize
    };
  };
  ENEMY_CONSTRUCTORS.ghost.baseHealth = baseHealth;
  ENEMY_CONSTRUCTORS.ghost.label = labelName;
  ENEMY_CONSTRUCTORS.ghost.description = description;
  ENEMY_CONSTRUCTORS.ghost.isTransparent = true;
  ENEMY_CONSTRUCTORS.ghost.countsTowardGridFull = true;
})();

function isGhost(en) { return en && en.type === 'ghost'; }
function isPhantom(en) { return en && en.type === 'phantom'; }
function isGhostOrPhantom(en) { return isGhost(en) || isPhantom(en); }

// Picks any in-bounds cell uniformly at random — occupancy is never
// checked, per the agreed "any cell is available for transparent
// entities" rule. Shared by both Ghost (1x1) and Phantom (2x2) since
// neither needs anything beyond "a random anchor cell" — Phantom's
// extra footprint cells are derived the same wrapped way every other
// 2x2 enemy already computes them (see placeEnemyAt's size>1 branch).
function randomGridCell() {
  return [Math.floor(Math.random()*state.rows), Math.floor(Math.random()*state.cols)];
}

// Removes every one of `en`'s own refs from the grid (its current
// footprint only — never touches other occupants stacked on the same
// cells, which is the whole point of the array-based grid model) and
// re-adds them at the new anchor. Equivalent in spirit to
// teleportEnemyTo() (teleport-item-logic.js) but skips that function's
// destination occupancy/room check entirely, since Ghost/Phantom's own
// self-teleport never needs one.
function teleportSelfTo(en, destR, destC) {
  for (var i=0;i<en.size[0];i++) {
    for (var j=0;j<en.size[1];j++) {
      removeEnemyRefAt((en.anchor[0]+i)%state.rows, (en.anchor[1]+j)%state.cols, en.id);
    }
  }
  for (var i2=0;i2<en.size[0];i2++) {
    for (var j2=0;j2<en.size[1];j2++) {
      addEnemyRefAt((destR+i2)%state.rows, (destC+j2)%state.cols, en.id);
    }
  }
  en.anchor = [destR, destC];
}

// Called from moveEnemiesOneStepSequenced (see general-enemy-logic.js)
// in place of normal movement, for every living, non-stunned Ghost/
// Phantom. isStunned() gates this the same way it gates every other
// type's movement branch — a stunned Ghost/Phantom neither teleports
// nor (per applyGhostPhantomCurses below, which separately checks
// isStunned again) re-curses this phase.
async function resolveGhostPhantomTeleportsSequenced() {
  var targets = Object.values(state.enemies).filter(isGhostOrPhantom);
  if (targets.length === 0) return;
  for (var i=0; i<targets.length; i++) {
    var en = targets[i];
    if (!state.enemies[en.id]) continue;
    if (isStunned(en)) continue;
    var dest = randomGridCell();
    var wasWrapped = animateMoveLeap(en.anchor[0], en.anchor[1], dest[0], dest[1], en.size[0] > 1, en.size[0], true);
    teleportSelfTo(en, dest[0], dest[1]);
    render();
    if (wasWrapped) {
      await wait(300); playTeleportIn(dest[0], dest[1], en.size[0] > 1, en.size[0]);
      await wait(SUBSTEP_DELAY - 100 > 0 ? SUBSTEP_DELAY - 100 : 100);
    } else {
      await wait(SUBSTEP_DELAY);
    }
  }
}

// Called as its own ENEMY_PHASE_STEPS entry immediately after the
// movement step (see turn-logic.js patch notes) — curses the row
// and/or column(s) each living, non-stunned Ghost/Phantom now occupies
// at its POST-teleport position. addDisabledLine (see
// row-col-disabling-logic.js) takes the source enemy's id so the
// effect can be torn down on death (see general-attack-logic.js's
// kill branch) without waiting for its natural 1-turn expiry.
async function applyGhostPhantomCurses() {
  var targets = Object.values(state.enemies).filter(isGhostOrPhantom);
  if (targets.length === 0) return;
  for (var i=0; i<targets.length; i++) {
    var en = targets[i];
    if (!state.enemies[en.id]) continue;
    if (isStunned(en)) continue;

    if (isPhantom(en)) {
      for (var dr=0; dr<en.size[0]; dr++) {
        addDisabledLine('row', (en.anchor[0]+dr)%state.rows, en.id, 1);
      }
      for (var dc=0; dc<en.size[1]; dc++) {
        addDisabledLine('col', (en.anchor[1]+dc)%state.cols, en.id, 1);
      }
      log('👻 ' + en.label + ' curses all rows and columns it occupies!');
    } else {
      var axis = Math.random() < 0.5 ? 'row' : 'col';
      var index = axis === 'row' ? en.anchor[0] : en.anchor[1];
      addDisabledLine(axis, index, en.id, 1);
      log('👻 ' + en.label + ' curses its ' + (axis === 'row' ? 'row' : 'column') + '!');
    }
  }
  render();
}
