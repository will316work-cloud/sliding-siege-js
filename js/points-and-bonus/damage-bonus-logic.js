/* ============================================================
   DAMAGE BONUS LOGIC
   ============================================================ */

function currentBonusPct() {
  var decay = state.linesShiftedThisTurn.size * state.bonusStep;
  return Math.max(0, state.bonusMax - decay);
}
