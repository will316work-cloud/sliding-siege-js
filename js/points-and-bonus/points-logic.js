/* ============================================================
   POINTS LOGIC

   addScore(amount) is a new extracted function. The original
   source had no dedicated points/score-management function —
   state.score was mutated directly and inline at 7 call sites
   across golem-enemy-logic.js, bomb-enemy-logic.js,
   slime-enemy-logic.js, and general-attack-logic.js. Those call
   sites now call this function instead.
   ============================================================ */

function addScore(amount) {
  state.score += amount;
}
