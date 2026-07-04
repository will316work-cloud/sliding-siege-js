/* ============================================================
   ABILITY DISABLING — LOGIC

   Two enemy types disable player abilities through different
   underlying mechanisms, unified behind the query functions
   below:
     - Mage sets a single en.disabledAttackKey on itself
       (owned/written by mage-enemy-logic.js).
     - Siren's "curse" writes into state.sirenCursedAttacks /
       state.sirenCursedItems, mapping an attack/item key to a
       list of siren IDs currently cursing it (owned/written by
       siren-enemy-logic.js).
   Both attack-list and item-list rendering call into this
   shared query layer rather than checking either mechanism
   directly.
   ============================================================ */

function isAttackCursed(key) {
  return !!(state.sirenCursedAttacks[key] && state.sirenCursedAttacks[key].length > 0);
}

function isItemCursed(key) {
  return !!(state.sirenCursedItems[key] && state.sirenCursedItems[key].length > 0);
}

function getDisabledAttackKeys() {
  var disabled = {};
  Object.values(state.enemies).forEach(function(en) {
    if (en.type === 'mage' && en.disabledAttackKey) {
      disabled[en.disabledAttackKey] = true;
    }
  });
  Object.keys(state.sirenCursedAttacks || {}).forEach(function(k) {
    if (isAttackCursed(k)) disabled[k] = true;
  });
  return disabled;
}

function getDisabledItemKeys() {
  var disabled = {};
  Object.keys(state.sirenCursedItems || {}).forEach(function(k) {
    if (isItemCursed(k)) disabled[k] = true;
  });
  return disabled;
}
