/* ============================================================
   CHARGE ATTACK CHARGE BAR RENDERING
   ============================================================ */

function updateChargeProgressDisplay() {
  var progress = state.chargePointsProgress;
  var threshold = state.chargePointThreshold;
  document.getElementById('chargeProgressText').textContent = progress + '/' + threshold;
  document.getElementById('chargeFill').style.width = Math.min(100, (progress / threshold) * 100) + '%';
}
