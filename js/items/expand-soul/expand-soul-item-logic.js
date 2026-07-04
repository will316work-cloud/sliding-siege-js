/* ============================================================
   EXPANDED SOUL ITEM — LOGIC

   Wrapped in an IIFE for the same reason as
   extra-swing-item-logic.js — see its header comment.

   Updated to call applySoulCloud() (see soul-cloud-logic.js,
   Bundle 1) instead of the original inline en1.soulCloudTurns = 1
   write.
   ============================================================ */

(function() {
  var labelName = "Expanded Soul";
  var icon = "👻";
  var description = "Surrounds a chosen enemy with a soul cloud for one turn, making your next attack also count as hitting it from any of its 8 neighboring tiles.";

  ITEM_DEFS.expandSoul = { name: labelName, icon: icon, desc: description };

  ITEM_EFFECT_RESOLVERS.expandSoul = async function() {
    if (!itemPreviewCell) { toast('Pick an enemy to expand.'); return false; }
    var occupant = getCycledOccupant(itemPreviewCell[0], itemPreviewCell[1]);  // CHANGED
    var en1 = occupant && occupant.kind === 'enemy' ? state.enemies[occupant.id] : null;  // CHANGED
    if (!en1) { toast('No enemy on that tile.'); return false; }
    if (!debugInfiniteItems) state.items.expandSoul--;
    applySoulCloud(en1, 1);
    toast('Expanded Soul applied to ' + en1.label + '!');
    return true;
  };
})();
