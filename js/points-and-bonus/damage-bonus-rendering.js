/* ============================================================
   DAMAGE BONUS RENDERING
   ============================================================ */

function updateBonusDisplay() {
  var pct = currentBonusPct();
  document.getElementById('bonusPct').textContent = pct;
  document.getElementById('bonusFill').style.width = pct + '%';
}
