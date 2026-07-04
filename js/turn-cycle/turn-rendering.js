/* ============================================================
   TURN RENDERING

   Depends on: updateBonusDisplay() (see damage-bonus-rendering.js),
   updateChargeProgressDisplay() (see charge-attack-charge-bar-rendering.js),
   buildGridDOM() (see grid-rendering.js), renderAttackList()/
   renderItemList()/attackVariantLabel() (see attack-item-list-rendering.js),
   drawMageLinks() (see ability-disabling-rendering.js),
   drawSirenCurseThreads() (see siren-enemy-rendering.js), init()
   (see main.js).
   ============================================================ */

function render() {
  document.getElementById('score').textContent = state.score;
  document.getElementById('floor').textContent = state.floor;
  updateBonusDisplay();
  updateChargeProgressDisplay();
  buildGridDOM();

  var logEl = document.getElementById('log');                                          // NEW
  if (logEl) logEl.style.display = debugModeVisible ? '' : 'none';                       // NEW
  syncDebugModeToggleButton(); 

  renderAttackList();
  renderItemList();
  drawMageLinks();
  drawSirenCurseThreads();

  var hintText;
  if (targetingMode) {
    hintText = previewTarget
      ? ('Targeting ' + attackVariantLabel(targetingMode, previewTarget.variant) + ' — click the yellow tile again to change shape, or press Confirm.')
      : ('Tap a tile to preview your ' + ATTACK_DEFS[targetingMode].name + ' hitbox.');
  } else if (itemTargetingMode === 'extraSwing') {
    hintText = 'Press Confirm to use Extra Swing.';
  } else if (itemTargetingMode === 'teleport') {
    hintText = !itemPreviewCell ? 'Tap the enemy you want to teleport.'
      : !itemSecondTarget ? 'Now tap an empty destination tile.'
      : 'Destination selected — press Confirm to teleport.';
  } else if (itemTargetingMode) {
    hintText = itemPreviewCell ? ('Target selected — press Confirm to use ' + ITEM_DEFS[itemTargetingMode].name + '.') : ('Tap a tile/enemy to target ' + ITEM_DEFS[itemTargetingMode].name + '.');
  } else {
    hintText = (state.attacksRemainingThisTurn <= 0 && !debugInfiniteAttacks)
      ? 'Grid locked — use an item or press Skip Turn to end your turn.'
      : 'Slide rows/columns, then pick an attack and tap a tile to preview it.';
  }
  document.getElementById('hint').textContent = hintText;
}

function showGameOver() {
  var overlay = document.createElement('div');
  overlay.className = 'shop-overlay';
  var reason = state.gameOverReason || 'The grid has been overrun!';
  overlay.innerHTML =
    '<div class="shop-box gameover-box"><h2>💀 Game Over</h2>' +
    '<div class="small" style="margin-bottom:8px;">' + reason + '</div>' +
    '<div>You reached Floor ' + state.floor + ' with a score of ' + state.score + '.</div>' +
    '<button class="action" style="margin-top:14px;" id="restartBtn2">Start New Run</button></div>';
  document.body.appendChild(overlay);
  overlay.querySelector('#restartBtn2').onclick = function() { overlay.remove(); init(); };
}

function restartGameConfirmed() { init(); }
