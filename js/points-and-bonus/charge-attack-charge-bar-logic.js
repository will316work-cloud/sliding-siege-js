/* ============================================================
   CHARGE ATTACK CHARGE BAR LOGIC

   Depends on: ATTACK_DEFS (see general-attack-logic.js / each
   specific-attack-logic.js), toast() (see general-ui-logic.js).
   ============================================================ */

function addChargePoints(amount) {
  state.chargePointsProgress += amount;
  while (state.chargePointsProgress >= state.chargePointThreshold) {
    state.chargePointsProgress -= state.chargePointThreshold;
    state.chargePointThreshold += 10;
    var keys = Object.keys(ATTACK_DEFS);
    var key = keys[Math.floor(Math.random()*keys.length)];
    state.charges[key] = (state.charges[key]||0) + 1;
    toast('+1 ' + ATTACK_DEFS[key].name + ' charge!');
  }
}
