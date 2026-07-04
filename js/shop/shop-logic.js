/* ============================================================
   SHOP LOGIC

   Depends on: ATTACK_DEFS (see general-attack-logic.js / each
   specific-attack-logic.js), ITEM_DEFS (see general-item-logic.js
   / each specific-item-logic.js).
   ============================================================ */

function generateShopOffers() {
  var offers = [];
  var restockKey = randomKey(ATTACK_DEFS);
  var restockAmt = 1 + Math.floor(Math.random()*3);
  offers.push({
    label: 'Restock: +' + restockAmt + ' ' + ATTACK_DEFS[restockKey].icon + ' ' + ATTACK_DEFS[restockKey].name,
    apply: function() { state.charges[restockKey] += restockAmt; },
    toastMsg: '+' + restockAmt + ' ' + ATTACK_DEFS[restockKey].name + ' charges!'
  });
  var upgradeKey = randomKey(ATTACK_DEFS);
  offers.push({
    label: 'Upgrade: ' + ATTACK_DEFS[upgradeKey].icon + ' ' + ATTACK_DEFS[upgradeKey].name + ' +25% power (this run)',
    apply: function() { ATTACK_DEFS[upgradeKey].baseDmg = Math.round(ATTACK_DEFS[upgradeKey].baseDmg * 1.25); },
    toastMsg: ATTACK_DEFS[upgradeKey].name + ' power increased!'
  });
  var itemKey = randomKey(ITEM_DEFS);
  var itemAmt = 1 + Math.floor(Math.random()*2);
  offers.push({
    label: 'Item: +' + itemAmt + ' ' + ITEM_DEFS[itemKey].icon + ' ' + ITEM_DEFS[itemKey].name,
    apply: function() { state.items[itemKey] = (state.items[itemKey]||0) + itemAmt; },
    toastMsg: '+' + itemAmt + ' ' + ITEM_DEFS[itemKey].name + '!'
  });
  if (Math.random() < 0.18) {
    offers.push({
      label: '✨ Rare: +1 Max Revert per turn (now ' + (state.maxRevertsPerTurn+1) + ')',
      apply: function() { state.maxRevertsPerTurn++; },
      toastMsg: 'Max reverts per turn increased to ' + state.maxRevertsPerTurn + '!'
    });
  }
  return offers;
}

function randomKey(obj) { var keys = Object.keys(obj); return keys[Math.floor(Math.random()*keys.length)]; }
