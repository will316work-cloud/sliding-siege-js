/* ============================================================
   GRID — LOGIC

   state.grid[r][c] is always an array of occupant refs:
     { kind: 'enemy', id }       — a real entry in state.enemies
     { kind: 'sporeCloud', id }  — a real entry in state.sporeClouds
   Empty cell = []. Multiple refs in one cell represent stacking —
   legal whenever at least one of the stacked things is transparent
   (see isTransparentOccupant below); normal (non-transparent)
   enemies still only ever land on cells with zero non-transparent
   occupants already there (enforced by callers, not by this file —
   see cellHasNonTransparentOccupant()).

   Depends on: aliveEnemyCount() (see turn-logic.js),
   isRolly()/rollyFootprintCells() (see rolly-enemy-logic.js),
   toast()/log() (see general-ui-logic.js), updateBonusDisplay()
   (see damage-bonus-rendering.js), render() (see turn-rendering.js).
   ============================================================ */

function emptyGrid(rows, cols) {
  var g = [];
  for (var r=0;r<rows;r++) {
    var row = [];
    for (var c=0;c<cols;c++) row.push([]);
    g.push(row);
  }
  return g;
}

// True if this specific enemy TYPE is transparent (see
// ENEMY_CONSTRUCTORS[type].isTransparent, set by ghost/phantom's
// own files). Spore clouds are always transparent but aren't an
// enemy type, so they're handled separately wherever both can
// appear (isTransparentOccupant below covers both).
function isTransparentEnemyType(type) {
  var constructor = ENEMY_CONSTRUCTORS[type];
  return !!(constructor && constructor.isTransparent);
}

function isTransparentOccupant(ref) {
  if (!ref) return false;
  if (ref.kind === 'sporeCloud') return true;
  var en = state.enemies[ref.id];
  return !!(en && isTransparentEnemyType(en.type));
}

// "Blocked for normal-enemy purposes" — true if this cell holds at
// least one non-transparent occupant. A cell containing only
// transparent occupants (Ghost/Phantom/spore clouds) still reads as
// open to anything that isn't itself transparent.
function cellHasNonTransparentOccupant(r, c) {
  return state.grid[r][c].some(function(ref) { return !isTransparentOccupant(ref); });
}

// Every occupant ref in a cell that resolves to a live enemy object
// (spore-cloud refs excluded) — used by attack hit detection.
function enemiesAtCell(r, c) {
  return state.grid[r][c]
    .filter(function(ref) { return ref.kind === 'enemy'; })
    .map(function(ref) { return state.enemies[ref.id]; })
    .filter(Boolean);
}

// Every occupant ref in a cell that resolves to a live spore cloud —
// used by attack hit detection / cycling / teleport targeting.
function sporeCloudsAtCellRef(r, c) {
  return state.grid[r][c]
    .filter(function(ref) { return ref.kind === 'sporeCloud'; })
    .map(function(ref) { return state.sporeClouds[ref.id]; })
    .filter(Boolean);
}

function removeEnemyRefAt(r, c, id) {
  state.grid[r][c] = state.grid[r][c].filter(function(ref) {
    return !(ref.kind === 'enemy' && ref.id === id);
  });
}

function addEnemyRefAt(r, c, id) {
  state.grid[r][c].push({ kind: 'enemy', id: id });
}

function removeSporeCloudRefAt(r, c, id) {
  state.grid[r][c] = state.grid[r][c].filter(function(ref) {
    return !(ref.kind === 'sporeCloud' && ref.id === id);
  });
}

function addSporeCloudRefAt(r, c, id) {
  state.grid[r][c].push({ kind: 'sporeCloud', id: id });
}

// placeEnemyAt is unchanged in spirit from before — still writes the
// enemy's full footprint and sets its anchor — but pushes refs into
// each cell's array instead of overwriting a single slot. Callers are
// responsible for having already checked cellHasNonTransparentOccupant
// for every footprint cell first if `enemy`'s type is NOT transparent
// (this function itself does not gate on that — see spawn-pool-
// processor.js / debug-enemy-spawn-logic.js / ghost/phantom's own
// teleport-self code for where that check happens before calling in).
function placeEnemyAt(r, c, enemy) {
  var dr, dc, rr, cc;
  if (enemy.size[0] > 1 || enemy.size[1] > 1) {
    for (dr=0; dr<enemy.size[0]; dr++) {
      for (dc=0; dc<enemy.size[1]; dc++) {
        rr = (r+dr) % state.rows; cc = (c+dc) % state.cols;
        addEnemyRefAt(rr, cc, enemy.id);
      }
    }
    enemy.anchor = [r,c];
  } else {
    addEnemyRefAt(r, c, enemy.id);
    enemy.anchor = [r,c];
  }
  state.enemies[enemy.id] = enemy;
}

function enemyWraps(en) {
  if (isRolly(en) && en.stretchAxis) {
    if (en.stretchAxis === 'row') return en.anchor[1] + en.stretchAfter >= state.cols || en.anchor[1] - en.stretchBefore < 0;
    return en.anchor[0] + en.stretchAfter >= state.rows || en.anchor[0] - en.stretchBefore < 0;
  }
  if (!en.size || (en.size[0] <= 1 && en.size[1] <= 1)) return false;
  return (en.anchor[0] + en.size[0] > state.rows) || (en.anchor[1] + en.size[1] > state.cols);
}

function nonSquareFootprintSpan(en) {
  if (isRolly(en) && en.stretchAxis) {
    return { axis: en.stretchAxis, before: en.stretchBefore, after: en.stretchAfter, lineLen: en.stretchBefore + en.stretchAfter + 1 };
  }
  return null;
}

function findAxisStart(indices, gridSize, size) {
  var sorted = Array.from(indices).sort(function(a,b){ return a-b; });
  if (size <= 1 || sorted.length <= 1) return sorted[0];
  var targetSet = new Set(sorted);
  for (var i=0;i<sorted.length;i++) {
    var candidate = sorted[i];
    var matches = true;
    for (var k=0; k<size; k++) {
      if (!targetSet.has((candidate + k) % gridSize)) { matches = false; break; }
    }
    if (matches) return candidate;
  }
  return sorted[0];
}

// recomputeAnchors — rebuilds anchors by scanning every cell's ARRAY for
// each id (instead of a single slot per cell). This is the key fix
// versus the old single-slot model: a transparent occupant sharing a
// normal enemy's cell never overwrites that enemy's own ref, so the
// normal enemy's cell-count for its own id is never corrupted by
// something else stacking there. Only enemy refs are scanned here —
// spore clouds have no anchor/shape to recompute (they're always 1x1
// and their position is simply "whichever cell currently holds a ref to
// their id", looked up directly via sporeCloudsAtCellRef when needed).
function recomputeAnchors() {
  var seen = {};
  for (var r=0;r<state.rows;r++) {
    for (var c=0;c<state.cols;c++) {
      state.grid[r][c].forEach(function(ref) {
        if (ref.kind !== 'enemy') return;
        if (!seen[ref.id]) seen[ref.id] = [];
        seen[ref.id].push([r,c]);
      });
    }
  }
  var ids = Object.keys(seen);
  for (var i=0;i<ids.length;i++) {
    var id = parseInt(ids[i]);
    var en = state.enemies[id];
    if (!en) continue;
    var cells = seen[id];

    if (isRolly(en) && en.stretchAxis) {
      var axis = en.stretchAxis;
      var fixedIdx = axis === 'row'
        ? Array.from(new Set(cells.map(function(c){ return c[0]; })))
        : Array.from(new Set(cells.map(function(c){ return c[1]; })));
      var varyingIdxs = axis === 'row'
        ? cells.map(function(c){ return c[1]; })
        : cells.map(function(c){ return c[0]; });
      var expectedLen = en.stretchBefore + en.stretchAfter + 1;
      var formsContiguousLine = fixedIdx.length === 1 && cells.length === expectedLen &&
        new Set(varyingIdxs).size === expectedLen;

      if (!formsContiguousLine) {
        cells.forEach(function(p){ removeEnemyRefAt(p[0], p[1], id); });
        en.stretchAxis = null; en.stretchBefore = 0; en.stretchAfter = 0;
        en.anchor = cells[0];
        addEnemyRefAt(cells[0][0], cells[0][1], id);
      } else {
        var gridSize = axis === 'row' ? state.cols : state.rows;
        var startVarying = findAxisStart(new Set(varyingIdxs), gridSize, expectedLen);
        en.anchor = axis === 'row' ? [fixedIdx[0], (startVarying + en.stretchBefore) % gridSize]
                                    : [(startVarying + en.stretchBefore) % gridSize, fixedIdx[0]];
      }
      continue;
    }

    if (en.size[0] === 1 && en.size[1] === 1) { en.anchor = cells[0]; continue; }
    var rowIndices = Array.from(new Set(cells.map(function(c){ return c[0]; })));
    var colIndices = Array.from(new Set(cells.map(function(c){ return c[1]; })));
    en.anchor = [findAxisStart(rowIndices, state.rows, en.size[0]), findAxisStart(colIndices, state.cols, en.size[1])];
  }
}

// linkedLinesForAxis is UNCHANGED from before — it never read
// state.grid directly, only en.size/en.anchor/rollyFootprintCells, all
// of which are still plain enemy-object fields untouched by the grid
// array migration.
function linkedLinesForAxis(axisType, seedIdx) {
  var result = new Set([seedIdx]);
  var changed = true;
  while (changed) {
    changed = false;
    var enemiesArr = Object.values(state.enemies);
    for (var ei=0; ei<enemiesArr.length; ei++) {
      var en = enemiesArr[ei];
      var fullRange = null;

      if (en.size[0] >= 2 || en.size[1] >= 2) {
        var ar = en.anchor[0], ac = en.anchor[1];
        var axisSize = axisType === 'r' ? en.size[0] : en.size[1];
        fullRange = [];
        for (var i=0;i<axisSize;i++) {
          fullRange.push(axisType === 'r' ? (ar + i) % state.rows : (ac + i) % state.cols);
        }
      } else if (isRolly(en) && en.stretchAxis) {
        var cells = rollyFootprintCells(en);
        var spansThisAxis = en.stretchAxis === 'row' ? (axisType === 'c') : (axisType === 'r');
        if (spansThisAxis) {
          var idxSet = new Set(cells.map(function(p){ return axisType === 'r' ? p[0] : p[1]; }));
          if (idxSet.size > 1) fullRange = Array.from(idxSet);
        }
      }

      if (!fullRange) continue;
      var touches = false;
      for (var fi=0; fi<fullRange.length; fi++) if (result.has(fullRange[fi])) touches = true;
      if (!touches) continue;
      for (var fj=0; fj<fullRange.length; fj++) {
        if (!result.has(fullRange[fj])) { result.add(fullRange[fj]); changed = true; }
      }
    }
  }
  result.delete(seedIdx);
  return result;
}

function snapshotGrid() {
  // Deep-enough copy: new outer/inner arrays, new per-cell arrays, but
  // ref objects themselves are immutable-by-convention (never mutated
  // in place, always replaced wholesale by add/removeXRefAt), so
  // sharing the ref objects between snapshots is safe.
  return state.grid.map(function(row){ return row.map(function(cell){ return cell.slice(); }); });
}

function pushShiftHistory(linesIdx, axisType) {
  var touchedSet = axisType === 'r' ? state.rowsTouchedThisTurn : state.colsTouchedThisTurn;
  var arr = Array.from(linesIdx);
  var anyNew = false;
  for (var i=0;i<arr.length;i++) if (!touchedSet.has(arr[i])) anyNew = true;
  if (!anyNew) return;
  state.shiftHistory.push({
    grid: snapshotGrid(), lines: new Set(state.linesShiftedThisTurn),
    rowsTouched: new Set(state.rowsTouchedThisTurn), colsTouched: new Set(state.colsTouchedThisTurn),
    decayStepCounter: state.decayStepCounter,
    enemyAnchors: Object.fromEntries(Object.entries(state.enemies).map(function(pair){ return [pair[0], pair[1].anchor]; })),
    touchedIndices: new Set(linesIdx)
  });
}

// shiftRow/shiftCol gain ONE new guard each (see Part 3 — row/col
// disabling) right at the top, before any mutation: if any line in the
   // linked group (including the seed line itself) is currently
// disabled, the whole shift is aborted. That guard is layered in by
// Part 3's patch, not duplicated here — this file's own job is just
// the array-aware row/col swap below, otherwise identical in
// structure to before.
function shiftRow(r, dir) {
  if (state.enemyPhaseActive) { toast("It's the enemies' turn — wait for your turn!"); return; }
  if (!debugInfiniteAttacks && state.attacksRemainingThisTurn <= 0) { toast('No attacks left — grid is locked for this turn!'); return; }
  var extraRows = linkedLinesForAxis('r', r);
  var rowsToShift = new Set([r]);
  extraRows.forEach(function(x){ rowsToShift.add(x); });
  if (anyLineInSetDisabled('r', rowsToShift)) { toast('A disabled row is part of this shift — it cannot move!'); return; }
  pushShiftHistory(rowsToShift, 'r');
  rowsToShift.forEach(function(rr) {
    var row = state.grid[rr].slice();
    state.grid[rr] = dir === 1 ? [row[row.length-1]].concat(row.slice(0, row.length-1)) : row.slice(1).concat([row[0]]);
  });
  recomputeAnchors();
  var anyNewRow = false;
  rowsToShift.forEach(function(rr){ if (!state.rowsTouchedThisTurn.has(rr)) anyNewRow = true; });
  if (anyNewRow) state.linesShiftedThisTurn.add(state.decayStepCounter++);
  rowsToShift.forEach(function(rr){ state.rowsTouchedThisTurn.add(rr); });
  updateBonusDisplay();
  render();
}

function shiftCol(c, dir) {
  if (state.enemyPhaseActive) { toast("It's the enemies' turn — wait for your turn!"); return; }
  if (!debugInfiniteAttacks && state.attacksRemainingThisTurn <= 0) { toast('No attacks left — grid is locked for this turn!'); return; }
  var extraCols = linkedLinesForAxis('c', c);
  var colsToShift = new Set([c]);
  extraCols.forEach(function(x){ colsToShift.add(x); });
  if (anyLineInSetDisabled('c', colsToShift)) { toast('A disabled column is part of this shift — it cannot move!'); return; }
  pushShiftHistory(colsToShift, 'c');
  colsToShift.forEach(function(cc) {
    var colVals = [];
    for (var r=0;r<state.rows;r++) colVals.push(state.grid[r][cc]);
    var newCol = dir === 1 ? [colVals[colVals.length-1]].concat(colVals.slice(0, colVals.length-1)) : colVals.slice(1).concat([colVals[0]]);
    for (var r2=0;r2<state.rows;r2++) state.grid[r2][cc] = newCol[r2];
  });
  recomputeAnchors();
  var anyNewCol = false;
  colsToShift.forEach(function(cc){ if (!state.colsTouchedThisTurn.has(cc)) anyNewCol = true; });
  if (anyNewCol) state.linesShiftedThisTurn.add(state.decayStepCounter++);
  colsToShift.forEach(function(cc){ state.colsTouchedThisTurn.add(cc); });
  updateBonusDisplay();
  render();
}

function revertLastShift() {
  if (!debugInfiniteReverts && state.revertsLeft <= 0) { toast('No reverts left this turn!'); return; }
  if (state.shiftHistory.length === 0) { toast('Nothing to revert!'); return; }
  var last = state.shiftHistory.pop();
  state.grid = last.grid;
  state.linesShiftedThisTurn = last.lines;
  state.rowsTouchedThisTurn = last.rowsTouched;
  state.colsTouchedThisTurn = last.colsTouched;
  state.decayStepCounter = last.decayStepCounter;
  Object.entries(last.enemyAnchors).forEach(function(pair) {
    if (state.enemies[pair[0]]) state.enemies[pair[0]].anchor = pair[1];
  });
  if (!debugInfiniteReverts) state.revertsLeft--;
  toast('Reverted ' + (last.touchedIndices.size > 1 ? 'linked shift' : 'shift') + '! (' + (debugInfiniteReverts ? '∞' : state.revertsLeft) + ' left)');
  updateBonusDisplay();
  render();
}

function gridIsCompletelyOccupied() {
  for (var r=0; r<state.rows; r++) {
    for (var c=0; c<state.cols; c++) {
      if (state.grid[r][c].length === 0) return false;   // CHANGED — was aliveEnemyCount() >= state.rows*state.cols
    }
  }
  return true;
}

// Shared click-cycling state lives on `state` (state.lastClickedCell /
// state.clickCycleIndex) so it persists correctly across re-renders
// (buildGridDOM rebuilds the whole DOM tree every render — see
// grid-rendering.js — so this can't live as a local rendering
// variable). Resets to index 0 whenever the clicked cell differs from
// the last click anywhere on the grid; otherwise advances to the next
// occupant in that cell's array, wrapping around. Used uniformly by
// onCellClick, itemOnCellClick, and debugDeleteModeOnCellClick (see
// cell-click-logic.js / debug-delete-mode-logic.js) so all three
// "click something on the grid" entry points cycle consistently.
function getCycledOccupant(r, c) {
  var refs = state.grid[r][c];
  if (refs.length === 0) {
    state.lastClickedCell = [r, c];
    state.clickCycleIndex = 0;
    return null;
  }
  var sameCell = state.lastClickedCell && state.lastClickedCell[0] === r && state.lastClickedCell[1] === c;
  if (!sameCell) {
    state.lastClickedCell = [r, c];
    state.clickCycleIndex = 0;
  } else {
    state.clickCycleIndex = (state.clickCycleIndex + 1) % refs.length;
  }
  return refs[state.clickCycleIndex];
}
