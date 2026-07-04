/* ============================================================
   ATTACK & ITEM LIST RENDERING

   Depends on: currentBonusPct() (see damage-bonus-logic.js),
   getDisabledAttackKeys()/getDisabledItemKeys() (see
   ability-disabling-logic.js), showAttackTipPanel()/
   showItemTipPanel()/hideTipPanel() (see tip-panel-rendering.js /
   general-ui-logic.js), render() (see turn-rendering.js).
   ============================================================ */

function attackVariantLabel(key, variant) {
  if (key === 'axe') return variant === 'row' ? 'Row' : 'Column';
  if (key === 'sword') return variant === 'diag_ur' ? '↗ Diagonal' : '↘ Diagonal';
  if (key === 'hammer') return variant + '°';
  if (key === 'ring') return 'Radius ' + variant;
  if (key === 'crystal') return variant === 'plus' ? '+ Shape' : 'X Shape';
  return '';
}

function renderAttackList() {
  var list = document.getElementById('attackList');
  list.innerHTML = '';
  var noAttacksLeft = (!debugInfiniteAttacks && state.attacksRemainingThisTurn <= 0) || state.enemyPhaseActive || otherDebugInteractionsLocked();
  var bonusPct = currentBonusPct();
  var disabledKeys = getDisabledAttackKeys();
  Object.keys(ATTACK_DEFS).forEach(function(key) {
    var def = ATTACK_DEFS[key];
    var rawCharges = state.charges[key] || 0;
    if (!debugInfiniteAttacks && rawCharges <= 0) return;
    var chargesDisplay = debugInfiniteAttacks ? '∞' : rawCharges;
    var totalDmg = Math.round(def.baseDmg * (1 + bonusPct/100));
    var isDisabled = !!disabledKeys[key];
    var div = document.createElement('div');
    div.id = 'attackCard_' + key;
    div.className = 'attack-btn' + (targetingMode===key ? ' selected':'') + ((noAttacksLeft || isDisabled) ? ' disabled':'');
    div.innerHTML =
      '<div class="ic-row"><div class="ic">' + def.icon + '</div><div class="ct">x' + chargesDisplay + '</div></div>' +
      '<div>' + def.name + (isDisabled ? ' 🔮' : '') + '</div>' +
      '<div class="dmg-row"><div class="dmg-base">Base ' + def.baseDmg + '</div><div class="dmg-total">' + totalDmg + ' dmg</div></div>';
    div.onclick = function() {
      if (noAttacksLeft || isDisabled) return;
      selectedItem = null; itemTargetingMode = null; itemPreviewCell = null; itemSecondTarget = null;
      targetingMode = (targetingMode===key) ? null : key;
      previewTarget = null;
      if (targetingMode) showAttackTipPanel(key);
      else hideTipPanel();
      render();
    };
    list.appendChild(div);
  });
}

function renderItemList() {
  var list = document.getElementById('itemList');
  list.innerHTML = '';
  var disabledItemKeys = getDisabledItemKeys();
  Object.keys(ITEM_DEFS).forEach(function(key) {
    var def = ITEM_DEFS[key];
    var rawCount = state.items[key] || 0;
    if (!debugInfiniteItems && rawCount <= 0) return;
    var countDisplay = debugInfiniteItems ? '∞' : rawCount;
    var isCursed = !!disabledItemKeys[key];
    var disabled = (state.selectedItemUsedThisTurn && !debugInfiniteItems) || state.enemyPhaseActive || isCursed || otherDebugInteractionsLocked();
    var div = document.createElement('div');
    div.id = 'itemCard_' + key;
    div.className = 'item-btn' + (selectedItem===key ? ' selected':'') + (disabled ? ' disabled':'');
    div.innerHTML =
      '<div class="ic-row"><div class="ic">' + def.icon + '</div><div class="ct">x' + countDisplay + '</div></div>' +
      '<div>' + def.name + (isCursed ? ' 🎶' : '') + '</div>';
    div.title = def.desc;
    div.onclick = function() {
      if (disabled) return;
      if (selectedItem === key) {
        selectedItem = null; itemTargetingMode = null; itemPreviewCell = null; itemSecondTarget = null;
        hideTipPanel();
      } else {
        targetingMode = null; previewTarget = null;
        selectedItem = key; itemTargetingMode = key; itemPreviewCell = null; itemSecondTarget = null;
        showItemTipPanel(key);
      }
      render();
    };
    list.appendChild(div);
  });
}
