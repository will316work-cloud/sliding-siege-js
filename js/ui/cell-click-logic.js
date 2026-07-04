/* ============================================================
   CELL CLICK LOGIC

   onCellClick's plain-inspect branch and itemOnCellClick's
   target-selection branch both resolve "what's actually on this
   tile" via getCycledOccupant() (see grid-logic.js) instead of a
   direct state.grid[r][c] id lookup — since a cell can now hold
   multiple stacked refs (enemy + enemy, enemy + spore cloud, etc.),
   clicking repeatedly on the SAME cell cycles through its occupants
   one at a time rather than always resolving to "whichever one
   happens to be first."

   Depends on: showEnemyTipPanel()/hideTipPanel() (see
   tip-panel-rendering.js / general-ui-logic.js), showSporeCloudTipPanel()
   (NEW — see tip-panel-rendering.js patch below), getItemPreviewCells()
   (see general-item-rendering.js), render() (see turn-rendering.js).
   ============================================================ */

function onCellClick(r,c) {
  if (state.enemyPhaseActive) return;
  if (!targetingMode) {
    if (!itemTargetingMode) {
      var occupant = getCycledOccupant(r, c);          // CHANGED
      if (!occupant) { hideTipPanel(); return; }
      if (occupant.kind === 'sporeCloud') {
        var cloud = state.sporeClouds[occupant.id];
        if (cloud) showSporeCloudTipPanel(cloud); else hideTipPanel();
      } else {
        var en = state.enemies[occupant.id];           // CHANGED
        if (en) showEnemyTipPanel(en); else hideTipPanel();
      }
    }
    return;
  }
  if (previewTarget && previewTarget.r === r && previewTarget.c === c) {
    var def = ATTACK_DEFS[targetingMode];
    var variants = def.variants;
    var idx = variants.indexOf(previewTarget.variant);
    var nextVariant = variants[(idx+1) % variants.length];
    previewTarget = { attack: targetingMode, r: r, c: c, variant: nextVariant };
    render();
    return;
  }
  var def2 = ATTACK_DEFS[targetingMode];
  var carriedVariant = previewTarget ? previewTarget.variant : def2.defaultVariant;
  previewTarget = { attack: targetingMode, r: r, c: c, variant: carriedVariant };
  render();
}

function itemOnCellClick(r, c) {
  if (state.enemyPhaseActive) return;
  if (!itemTargetingMode) return;
  if (itemTargetingMode === 'extraSwing') return;

  if (itemTargetingMode === 'teleport' && itemPreviewCell) {
    var srcOccupant = getCycledOccupant(itemPreviewCell[0], itemPreviewCell[1]);  // CHANGED
    if (!srcOccupant) { itemPreviewCell = null; render(); return; }
    var srcIsTransparent = srcOccupant.kind === 'sporeCloud' || isTransparentEnemyType((state.enemies[srcOccupant.id] || {}).type);  // CHANGED
    var srcSize = srcOccupant.kind === 'sporeCloud' ? [1,1] : state.enemies[srcOccupant.id].size;  // CHANGED

    if (!srcIsTransparent) {
      if (cellHasNonTransparentOccupant(r, c)) { toast('Pick an empty tile as the destination.'); return; }  // CHANGED
      var fits = true;
      for (var i=0;i<srcSize[0];i++) for (var j=0;j<srcSize[1];j++) {
        var rr=(r+i)%state.rows, cc=(c+j)%state.cols;
        if (cellHasNonTransparentOccupant(rr, cc)) fits = false;  // CHANGED
      }
      if (!fits) { toast("That spot doesn't have enough room for this enemy."); return; }
    }

    itemSecondTarget = [r,c];
    itemSecondTargetFootprint = [];                                        // NEW
    for (var fi=0; fi<srcSize[0]; fi++) for (var fj=0; fj<srcSize[1]; fj++) {
      itemSecondTargetFootprint.push([(r+fi)%state.rows, (c+fj)%state.cols]);
    }
    render();
    return;
  }

  itemPreviewCell = [r, c, getCycledOccupant(r, c)];   // make sure this 3-element form is actually present
  itemSecondTarget = null;
  render();
}