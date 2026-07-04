/* ============================================================
   EXTRA SWING ITEM — LOGIC

   Wrapped in an IIFE so labelName/icon/description stay local
   to this file and don't collide with the same-named variables
   in the other 4 item files (all loaded as plain global
   <script> tags).
   ============================================================ */

(function() {
  var labelName = "Extra Swing";
  var icon = "⚔️";
  var description = "Grants one additional attack use this turn. No targeting needed — just press Confirm.";

  ITEM_DEFS.extraSwing = { name: labelName, icon: icon, desc: description };

  ITEM_EFFECT_RESOLVERS.extraSwing = async function() {
    if (!debugInfiniteItems) state.items.extraSwing--;
    state.attacksRemainingThisTurn++;
    toast('Extra Swing: +1 attack use this turn!');
    return true;
  };
})();
