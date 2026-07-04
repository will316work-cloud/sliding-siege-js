/* ============================================================
   ROW/COLUMN DISABLING — LOGIC

   Generic effect storage for "this row/column cannot be slid right
   now." Currently the only producers are Ghost (1 entry per
   teleport, row OR column) and Phantom (4 entries per teleport — 2
   rows + 2 columns), but this file knows nothing about either type
   by name; it just stores { axis, index, sourceId, turnsRemaining }
   entries in state.disabledLines (a plain array) and answers
   queries against them. Any future enemy/item that wants to disable
   a line just calls addDisabledLine the same way.

   Each entry tracks its own sourceId specifically so it can be torn
   down the instant its source dies (see removeDisabledLinesFromSource,
   called from general-attack-logic.js's kill branch) rather than
   waiting for its natural 1-turn expiry — per the agreed "killing a
   ghost/phantom re-enables whatever it was disabling" rule. Two
   different sources disabling the SAME (axis, index) pair are stored
   as two separate entries deliberately (not merged/deduped) — killing
   one source's Ghost still leaves the line disabled if another
   source's entry for that same line is still alive.

   Tick timing: tickDisabledLines() is called as the very FIRST
   ENEMY_PHASE_STEPS entry (see turn-logic.js), i.e. at the START of
   the enemy phase, BEFORE Ghost/Phantom teleport or re-curse that
   same phase. This is what makes a duration-1 entry created near the
   END of enemy-phase N survive all of player-turn N+1's worth of
   gameplay and only clear at the very start of enemy-phase N+1 —
   i.e. "lasts for the player's upcoming turn, expires at the start
   of the next enemy phase, just before fresh curses are applied for
   that phase."
   ============================================================ */

function addDisabledLine(axis, index, sourceId, turns) {
  state.disabledLines.push({ axis: axis, index: index, sourceId: sourceId, turnsRemaining: turns == null ? 1 : turns });
}

function removeDisabledLinesFromSource(sourceId) {
  state.disabledLines = state.disabledLines.filter(function(entry) { return entry.sourceId !== sourceId; });
}

function isLineDisabled(axis, index) {
  return state.disabledLines.some(function(entry) { return entry.axis === axis && entry.index === index; });
}

// Every distinct sourceId currently disabling this exact (axis, index)
// pair — used by row-col-disabling-rendering.js to decide which badge
// icon(s) to show, and available for future use (e.g. a tooltip
// listing which enemy is responsible).
function disabledLineSources(axis, index) {
  return state.disabledLines
    .filter(function(entry) { return entry.axis === axis && entry.index === index; })
    .map(function(entry) { return entry.sourceId; });
}

// True if ANY line in the given index set (for the given axis) is
// currently disabled — used by shiftRow/shiftCol (see grid-logic.js)
// to decide whether to abort an entire linked-shift group. Per the
// agreed rule, a single disabled line anywhere in the linked group
// blocks the WHOLE group, including lines in that group that aren't
// themselves disabled.
function anyLineInSetDisabled(axis, indexSet) {
  var axisType = axis === 'r' ? 'row' : 'col';
  var arr = Array.from(indexSet);
  for (var i=0; i<arr.length; i++) {
    if (isLineDisabled(axisType, arr[i])) return true;
  }
  return false;
}

// Ticks every entry's remaining duration down by 1, dropping any that
// reach 0. Called from the FIRST ENEMY_PHASE_STEPS entry (see
// turn-logic.js) — see this file's header comment for why that timing
// (rather than tying into the existing tickStatusEffects, which runs
// at the START of the player's turn) is what makes the 1-turn duration
// land correctly.
function tickDisabledLines() {
  state.disabledLines = state.disabledLines
    .map(function(entry) { return { axis: entry.axis, index: entry.index, sourceId: entry.sourceId, turnsRemaining: entry.turnsRemaining - 1 }; })
    .filter(function(entry) { return entry.turnsRemaining > 0; });
}
