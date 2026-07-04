/* ============================================================
   SHOP RENDERING

   Depends on: generateShopOffers() (see shop-logic.js), toast()
   (see general-ui-logic.js), startNewTurn() (see turn-logic.js),
   render() (see turn-rendering.js), animateFloorSetup() (see
   spawn-pool-processor.js).
   ============================================================ */

function openShop() {
  var overlay = document.createElement('div');
  overlay.className = 'shop-overlay';
  var offers = generateShopOffers();
  var selectedIdx = null;
  overlay.innerHTML =
    '<div class="shop-box"><h2 style="text-align:center; color:#ffce4a;">🛒 Restock Shop</h2>' +
    '<div class="small" style="text-align:center; margin-top:4px;">Floor ' + state.floor + ' cleared! Score: ' + state.score + '</div>' +
    '<div class="small" style="text-align:center; margin-top:6px;" id="shopHint">Choose ONE reward, then confirm.</div>' +
    '<div class="shop-items" id="shopItems"></div>' +
    '<button class="action" id="shopConfirmBtn" style="width:100%;" disabled>Confirm Choice & Continue</button></div>';
  document.body.appendChild(overlay);
  var itemsDiv = overlay.querySelector('#shopItems');
  var confirmBtn = overlay.querySelector('#shopConfirmBtn');
  function renderOffers() {
    itemsDiv.innerHTML = '';
    offers.forEach(function(offer, idx) {
      var div = document.createElement('div');
      div.className = 'shop-item' + (selectedIdx===idx ? ' selected' : '');
      div.innerHTML = '<div>' + offer.label + '</div>' + (selectedIdx===idx ? '<div class="pick-badge">Selected</div>' : '');
      div.onclick = function() { selectedIdx = idx; renderOffers(); };
      itemsDiv.appendChild(div);
    });
    confirmBtn.disabled = selectedIdx === null;
  }
  renderOffers();
  confirmBtn.onclick = async function() {
    if (selectedIdx === null) return;
    offers[selectedIdx].apply();
    toast(offers[selectedIdx].toastMsg);
    overlay.remove();
    state.floor++;
    startNewTurn();
    state.enemyPhaseActive = true;
    render();
    await animateFloorSetup(state.floor);
    state.enemyPhaseActive = false;
    startNewTurn();
    render();
  };
}
