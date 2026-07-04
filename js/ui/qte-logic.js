/* ============================================================
   QTE LOGIC

   Depends on: resolveAttack() (see general-attack-logic.js).
   ============================================================ */

function startQTE() {
  var overlay = document.createElement('div');
  overlay.className = 'qte-overlay';
  var zoneStart = 35 + Math.random()*15, zoneWidth = 18;
  overlay.innerHTML =
    '<div class="qte-box">' +
      '<div style="font-weight:700; margin-bottom:4px;">⚔️ Strike Timing!</div>' +
      '<div class="small">Click to stop the marker in the highlighted zone</div>' +
      '<div class="qte-track">' +
        '<div class="qte-zone" style="left:' + zoneStart + '%; width:' + zoneWidth + '%;"></div>' +
        '<div class="qte-marker" id="qteMarker" style="left:0%;"></div>' +
      '</div>' +
      '<button class="action" id="qteBtn">STRIKE</button>' +
    '</div>';
  document.body.appendChild(overlay);
  var marker = overlay.querySelector('#qteMarker');
  var pos = 0, dir = 1, speed = 1.8, running = true;
  function tick() {
    if (!running) return;
    pos += dir*speed;
    if (pos >= 100) { pos = 100; dir = -1; }
    if (pos <= 0) { pos = 0; dir = 1; }
    marker.style.left = pos + '%';
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  overlay.querySelector('#qteBtn').onclick = function() {
    running = false;
    var inZone = pos >= zoneStart && pos <= zoneStart+zoneWidth;
    var centerDist = Math.abs(pos - (zoneStart+zoneWidth/2));
    var multiplier = inZone ? (centerDist < zoneWidth*0.25 ? 1.6 : 1.3) : 0.7;
    overlay.remove();
    resolveAttack(pendingTarget, multiplier, inZone);
    pendingTarget = null;
  };
}
