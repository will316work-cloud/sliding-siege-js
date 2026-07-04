/* ============================================================
   CONFIRM BUTTON LOGIC

   Depends on: getDisabledAttackKeys() (see ability-disabling-logic.js),
   applySelectedItem() (see general-item-logic.js), finishAfterAttack()
   (see turn-logic.js), startQTE() (see qte-logic.js), render() (see
   turn-rendering.js).
   ============================================================ */

function itemConfirmReady() {
  if (!itemTargetingMode) return false;
  if (itemTargetingMode === 'extraSwing') return true;
  if (itemTargetingMode === 'teleport') return !!(itemPreviewCell && itemSecondTarget);
  return !!itemPreviewCell;
}

function confirmButtonReady() {
  if (targetingMode) return !!previewTarget;
  if (itemTargetingMode) return itemConfirmReady();
  return false;
}

function onConfirmPressed() {
  if (state.enemyPhaseActive) { toast("It's the enemies' turn — please wait!"); return; }
  if (targetingMode) { confirmAttack(); return; }
  if (itemTargetingMode) { confirmItem(); return; }
  toast('Select an attack or item first!');
}

async function confirmItem() {
  if (!itemConfirmReady()) {
    toast(itemTargetingMode === 'teleport' && itemPreviewCell ? 'Now tap an empty destination tile.' : 'Select a target first!');
    return;
  }
  await applySelectedItem();
  render();
  finishAfterAttack();
}

function confirmAttack() {
  if (!previewTarget) { toast('Tap a tile to target first!'); return; }
  var disabledKeys = getDisabledAttackKeys();
  if (disabledKeys[previewTarget.attack]) {
    toast('That attack is currently disabled!');
    targetingMode = null;
    previewTarget = null;
    render();
    return;
  }
  pendingTarget = previewTarget;
  previewTarget = null;
  startQTE();
}
