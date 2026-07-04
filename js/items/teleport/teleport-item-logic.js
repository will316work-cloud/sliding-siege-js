/* ============================================================
   TELEPORT ITEM — LOGIC

   Wrapped in an IIFE for the same reason as
   extra-swing-item-logic.js — see its header comment.

   teleportEnemyTo() depends on: isRolly()/shrinkRolly() (see
   rolly-enemy-logic.js / grid-logic.js), recomputeAnchors()
   (see grid-logic.js).
   ============================================================ */

(function() {
  var labelName = "Teleport";
  var icon = "🌀";
  var description = "Moves a chosen enemy — or spore cloud — to a destination tile. Transparent things (ghosts, phantoms, spore clouds) can go anywhere; everything else needs an empty destination with enough room. Doesn't cost any damage-bonus decay.";

  ITEM_DEFS.teleport = { name: labelName, icon: icon, desc: description };

  ITEM_EFFECT_RESOLVERS.teleport = async function() {
    if (!itemPreviewCell || !itemSecondTarget) { toast('Pick a target, then an empty destination.'); return false; }
    var occupant = getCycledOccupant(itemPreviewCell[0], itemPreviewCell[1]);  // NEW — see Part 4
    if (!occupant) { toast('Nothing on that tile.'); return false; }
    if (!debugInfiniteItems) state.items.teleport--;
    teleportOccupantTo(occupant, itemSecondTarget);
    toast((occupant.kind === 'sporeCloud' ? 'Spore cloud' : state.enemies[occupant.id].label) + ' teleported!');
    return true;
  };
})();

// Works uniformly for an enemy ref OR a sporeCloud ref — only reads
// .size (sporeCloud is always treated as [1,1]) and whether it's
// transparent, never any enemy-specific field (hp/anchor live on the
// underlying object either way and are mutated directly below).
function teleportOccupantTo(occupant, dest) {
  if (occupant.kind === 'sporeCloud') {
    var cloud = state.sporeClouds[occupant.id];
    if (!cloud) return;
    var oldCell = findSporeCloudCell(cloud.id);
    if (oldCell) removeSporeCloudRefAt(oldCell[0], oldCell[1], cloud.id);
    addSporeCloudRefAt(dest[0], dest[1], cloud.id);
    return;
  }
  var en = state.enemies[occupant.id];
  if (!en) return;
  if (isRolly(en) && en.stretchAxis) shrinkRolly(en);
  var ar = en.anchor[0], ac = en.anchor[1];
  for (var i=0;i<en.size[0];i++) for (var j=0;j<en.size[1];j++) removeEnemyRefAt((ar+i)%state.rows, (ac+j)%state.cols, en.id);
  for (var i2=0;i2<en.size[0];i2++) for (var j2=0;j2<en.size[1];j2++) addEnemyRefAt((dest[0]+i2)%state.rows, (dest[1]+j2)%state.cols, en.id);
  en.anchor = [dest[0], dest[1]];
  recomputeAnchors();
}

// Linear scan for which cell currently holds a ref to this spore cloud
// id — spore clouds have no anchor field of their own (unlike enemies),
// so their position is always derived by looking at the grid, not
// stored redundantly on the cloud object itself.
function findSporeCloudCell(cloudId) {
  for (var r=0; r<state.rows; r++) {
    for (var c=0; c<state.cols; c++) {
      if (state.grid[r][c].some(function(ref) { return ref.kind === 'sporeCloud' && ref.id === cloudId; })) return [r, c];
    }
  }
  return null;
}
