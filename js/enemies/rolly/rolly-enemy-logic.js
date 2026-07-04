/* ============================================================
   ROLLY POLLY — LOGIC

   Wrapped in an IIFE for the same reason as standard-enemy-logic.js
   — see its header comment.

   countOpenCardinals() has been relocated to general-enemy-logic.js
   since it's a generic grid-math helper also used by Sprite's
   multi-space movement, not rolly-specific. tryEnlargeRolly()
   below calls it from there.

   TODO (deferred per earlier agreement): Rolly's stretch mechanic
   (stretchAxis/stretchBefore/stretchAfter) should eventually be
   migrated to use the generic size vector instead of these
   separate fields, so any future enemy that changes size during
   gameplay can share the same mechanism. Not implemented yet —
   left exactly as in the original source for this pass.
   ============================================================ */

(function() {
  var labelName = "Rolly Polly";
  var description = "Stretches itself horizontally or vertically after moving. Will retract before moving again.";
  var baseHealth = 20;
  var baseSize = [1, 1];

  ENEMY_CONSTRUCTORS.rolly = function(hp) {
    return {
      hp: hp == null ? baseHealth : hp,
      label: labelName,
      baseSize: baseSize,
      stretchAxis: null,
      stretchBefore: 0,
      stretchAfter: 0
    };
  };
  ENEMY_CONSTRUCTORS.rolly.baseHealth = baseHealth;
  ENEMY_CONSTRUCTORS.rolly.label = labelName;
  ENEMY_CONSTRUCTORS.rolly.description = description;
})();

function isRolly(en) { return en && en.type === 'rolly'; }

function rollyFootprintCells(en) {
  var ar = en.anchor[0], ac = en.anchor[1];
  if (!en.stretchAxis) return [[ar, ac]];
  var cells = [];
  if (en.stretchAxis === 'row') {
    for (var dc = -en.stretchBefore; dc <= en.stretchAfter; dc++) {
      cells.push([ar, ((ac + dc) % state.cols + state.cols) % state.cols]);
    }
  } else {
    for (var dr = -en.stretchBefore; dr <= en.stretchAfter; dr++) {
      cells.push([((ar + dr) % state.rows + state.rows) % state.rows, ac]);
    }
  }
  return cells;
}

function clearRollyFootprint(en) {
  var cells = rollyFootprintCells(en);
  for (var i=0;i<cells.length;i++) {
    var r = cells[i][0], c = cells[i][1];
    if (r>=0 && r<state.rows && c>=0 && c<state.cols) removeEnemyRefAt(r, c, en.id);
  }
}

function writeRollyFootprint(en) {
  var cells = rollyFootprintCells(en);
  for (var i=0;i<cells.length;i++) {
    var r = cells[i][0], c = cells[i][1];
    if (r>=0 && r<state.rows && c>=0 && c<state.cols) addEnemyRefAt(r, c, en.id);
  }
}

async function shrinkRolly(en) {                          // CHANGED — now async
  if (!en.stretchAxis) return;
  en._stretchAnim = 'rolly-stretch-shrink';   // NEW
  render();
  await wait(200);                            // NEW — let the shrink animation finish

  clearRollyFootprint(en);
  en.stretchAxis = null;
  en.stretchBefore = 0;
  en.stretchAfter = 0;
  en._stretchAnim = null;                     // NEW
  addEnemyRefAt(en.anchor[0], en.anchor[1], en.id);
}

async function tryEnlargeRolly(en) { 
  var ar = en.anchor[0], ac = en.anchor[1];
  function freeAt(r, c) {
    if (r<0 || r>=state.rows || c<0 || c>=state.cols) return false;
    return !cellHasNonTransparentOccupant(r, c) || state.grid[r][c].every(function(ref){ return ref.kind === 'enemy' && ref.id === en.id; });
  }
  var rowLeftFree = freeAt(ar, ac-1), rowRightFree = freeAt(ar, ac+1);
  var colUpFree = freeAt(ar-1, ac), colDownFree = freeAt(ar+1, ac);
  var rowHasRoom = rowLeftFree || rowRightFree;
  var colHasRoom = colUpFree || colDownFree;

  if (!rowHasRoom && !colHasRoom) return;

  var axis;
  if (rowHasRoom && colHasRoom) axis = Math.random() < 0.5 ? 'row' : 'col';
  else axis = rowHasRoom ? 'row' : 'col';

  var before = 0, after = 0;
  if (axis === 'row') {
    if (rowLeftFree && rowRightFree) { before = 1; after = 1; }
    else if (rowLeftFree) { before = 1; }
    else { after = 1; }
  } else {
    if (colUpFree && colDownFree) { before = 1; after = 1; }
    else if (colUpFree) { before = 1; }
    else { after = 1; }
  }

  clearRollyFootprint(en);
  en.stretchAxis = axis;
  en.stretchBefore = before;
  en.stretchAfter = after;
  writeRollyFootprint(en);

  en._stretchAnim = 'rolly-stretch-grow';   // NEW
  render();
  await wait(250);                          // NEW — let the grow animation finish
  en._stretchAnim = null;                   // NEW — subsequent renders are static
}

async function moveAndEnlargeRolly(en) {
  var moved = false;
  if (Math.random() >= 0.55) {
    var directions = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
    var ar = en.anchor[0], ac = en.anchor[1];

    var candidates = [];
    for (var di=0; di<directions.length; di++) {
      var dr = directions[di][0], dc = directions[di][1];
      var twoR = ar + dr*2, twoC = ac + dc*2;
      var oneR = ar + dr, oneC = ac + dc;
      var oneFree = oneR>=0 && oneR<state.rows && oneC>=0 && oneC<state.cols && !cellHasNonTransparentOccupant(oneR, oneC);
      if (!oneFree) continue;
      var twoFree = twoR>=0 && twoR<state.rows && twoC>=0 && twoC<state.cols && !cellHasNonTransparentOccupant(twoR, twoC);
      var destR = twoFree ? twoR : oneR;
      var destC = twoFree ? twoC : oneC;
      candidates.push({ destR: destR, destC: destC, cardinalRoom: countOpenCardinals(destR, destC, en.id) });
    }

    if (candidates.length > 0) {
      var maxRoom = Math.max.apply(null, candidates.map(function(c){ return c.cardinalRoom; }));
      var best = candidates.filter(function(c){ return c.cardinalRoom === maxRoom; });
      var choice = best[Math.floor(Math.random()*best.length)];

      var wasWrapped = animateMoveLeap(ar, ac, choice.destR, choice.destC, false, 1, true);
      removeEnemyRefAt(ar, ac, en.id); addEnemyRefAt(choice.destR, choice.destC, en.id);
      en.anchor = [choice.destR, choice.destC];
      moved = true;

      if (wasWrapped) {
        await wait(300); render(); playTeleportIn(choice.destR, choice.destC, false);
        await wait(SUBSTEP_DELAY - 100 > 0 ? SUBSTEP_DELAY - 100 : 100);
      } else {
        await wait(400); render(); await wait(50);
      }
    }
  }

  await tryEnlargeRolly(en);
  render();
  if (moved) await wait(SUBSTEP_DELAY);
}

// Retracts every currently-stretched rolly back to its single anchor
// cell. Called once per enemy phase (see turn-logic.js's
// ENEMY_PHASE_STEPS) before each rolly takes its movement step and
// potentially re-enlarges itself again via moveAndEnlargeRolly above.
async function shrinkAllRollies() {                       // CHANGED — now async
  var rollies = Object.values(state.enemies).filter(isRolly);
  for (var i=0; i<rollies.length; i++) {                   // CHANGED — was forEach
    if (rollies[i].stretchAxis) await shrinkRolly(rollies[i]);   // CHANGED — now awaited
  }
}
