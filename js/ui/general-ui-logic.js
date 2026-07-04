/* ============================================================
   GENERAL UI LOGIC
   ============================================================ */

var logCallCount = 0;   // NEW

function log(msg) {
  logCallCount++;        // NEW
  var el = document.getElementById('log');
  var d = document.createElement('div');
  d.textContent = msg;
  el.prepend(d);
  while (el.children.length > 30) el.removeChild(el.lastChild);
}

function toast(msg) {
  var t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(function(){ t.remove(); }, 1600);
}

function hexToRgba(hex, alpha) {
  var h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map(function(c){ return c+c; }).join('');
  var r = parseInt(h.substring(0,2), 16);
  var g = parseInt(h.substring(2,4), 16);
  var b = parseInt(h.substring(4,6), 16);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}

// anchorPoint (optional): { x, y } in VIEWPORT coordinates. When
// provided, the panel is absolutely positioned so its top-left corner
// sits on that point (clamped so the whole panel stays inside the
// viewport). When omitted, the panel renders in-flow inside
// #tipPanelSlot exactly as before.
function showTipPanel(title, desc, statsLines, anchorPoint) {
  var slot = document.getElementById('tipPanelSlot');
  slot.innerHTML = '';
  var panel = document.createElement('div');
  panel.className = 'tip-panel';
  var titleDiv = document.createElement('div');
  titleDiv.className = 'tip-panel-title';
  titleDiv.textContent = title;
  panel.appendChild(titleDiv);
  var descDiv = document.createElement('div');
  descDiv.className = 'tip-panel-desc';
  descDiv.textContent = desc;
  panel.appendChild(descDiv);
  if (statsLines && statsLines.length > 0) {
    var statsDiv = document.createElement('div');
    statsDiv.className = 'tip-panel-stats';
    statsLines.forEach(function(line) {
      var lineDiv = document.createElement('div');
      lineDiv.textContent = line;
      statsDiv.appendChild(lineDiv);
    });
    panel.appendChild(statsDiv);
  }
  var closeRow = document.createElement('div');
  closeRow.className = 'tip-panel-close';
  var closeBtn = document.createElement('button');
  closeBtn.textContent = 'Close';
  closeBtn.onclick = function() { hideTipPanel(); };
  closeRow.appendChild(closeBtn);
  panel.appendChild(closeRow);
  if (anchorPoint) {
    panel.style.position = 'absolute';
    panel.style.zIndex = '40';
    slot.appendChild(panel);
    // Measure after insertion, then clamp so the panel stays fully
    // on-screen; otherwise the top-left corner sits exactly on the anchor.
    var margin = 4;
    var x = Math.max(margin, Math.min(anchorPoint.x, window.innerWidth - panel.offsetWidth - margin));
    var y = Math.max(margin, Math.min(anchorPoint.y, window.innerHeight - panel.offsetHeight - margin));
    panel.style.left = (x + window.scrollX) + 'px';
    panel.style.top = (y + window.scrollY) + 'px';
  } else {
    slot.appendChild(panel);
  }
}

function hideTipPanel() {
  document.getElementById('tipPanelSlot').innerHTML = '';
}

// Generic confirm modal — moved here from its original turn-cycle-
// adjacent location in the source (it sat right next to
// skipTurnConfirmed), since it has zero turn-specific content; any
// file can call showConfirm(title, message, onConfirm) for any kind
// of yes/no confirmation.
function showConfirm(title, message, onConfirm) {
  var overlay = document.createElement('div');
  overlay.className = 'confirm-overlay';
  overlay.innerHTML =
    '<div class="confirm-box"><h3>' + title + '</h3><p>' + message + '</p>' +
    '<div class="confirm-row">' +
      '<button class="confirm-cancel" id="confirmCancelBtn">Cancel</button>' +
      '<button class="confirm-proceed" id="confirmProceedBtn">Confirm</button>' +
    '</div></div>';
  document.body.appendChild(overlay);
  var cancelBtn = overlay.querySelector('#confirmCancelBtn');
  var proceedBtn = overlay.querySelector('#confirmProceedBtn');
  cancelBtn.focus();
  function close() { overlay.remove(); }
  cancelBtn.onclick = close;
  proceedBtn.onclick = function() { close(); onConfirm(); };
  overlay.onclick = function(e) { if (e.target === overlay) close(); };
  function escHandler(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', escHandler); } }
  document.addEventListener('keydown', escHandler);
}
