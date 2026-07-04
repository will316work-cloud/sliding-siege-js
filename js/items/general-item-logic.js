/* ============================================================
   GENERAL ITEM LOGIC

   Populated by each specific-item-logic file:
     ITEM_DEFS[key] = { name, icon, desc }  (mirrors ATTACK_DEFS —
       see general-attack-logic.js's header comment for why this
       must stay one shared, mutable object rather than being
       decentralized into per-file constants: it's read by key
       from multiple other files, e.g. siren's shriek curse list)
     ITEM_EFFECT_RESOLVERS[key] = async function() {...}  — does
       that item's full validate-apply-consume logic and returns
       true on success / false|undefined if it bailed out early
       (e.g. no target picked yet). applySelectedItem() below is a
       thin dispatcher, so adding a 6th item never requires editing
       this file.
   ============================================================ */

var ITEM_DEFS = {};
var ITEM_EFFECT_RESOLVERS = {};

async function applySelectedItem() {
  if (!selectedItem) return;
  if (state.selectedItemUsedThisTurn && !debugInfiniteItems) return;   // CHANGED
  var key = selectedItem;

  var resolver = ITEM_EFFECT_RESOLVERS[key];
  if (!resolver) return;
  var succeeded = await resolver();
  if (!succeeded) return;

  if (!debugInfiniteItems) state.selectedItemUsedThisTurn = true;   // CHANGED
  selectedItem = null;
  itemTargetingMode = null;
  itemPreviewCell = null;
  itemSecondTarget = null;
}
