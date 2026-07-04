/* ============================================================
   GENERAL ITEM RENDERING

   ITEM_PREVIEW_CELL_RESOLVERS is populated by any specific-item-
   logic file whose item needs a non-default preview shape (today,
   only Gravity Orb's 5x5-area highlight — see gravity-item-logic.js).
   getItemPreviewCells() below falls back to a single-cell preview
   ([[r,c]]) for any item that doesn't register one, matching the
   original source's default branch.
   ============================================================ */

var ITEM_PREVIEW_CELL_RESOLVERS = {};

ITEM_PREVIEW_CELL_RESOLVERS.teleport = function(cell) {
  var occupant = (itemPreviewCell && itemPreviewCell.length > 2) ? itemPreviewCell[2] : null;
  var size = (occupant && occupant.kind === 'enemy' && state.enemies[occupant.id]) ? state.enemies[occupant.id].size : [1,1];
  var cells = [];
  for (var i=0;i<size[0];i++) for (var j=0;j<size[1];j++) cells.push([(cell[0]+i)%state.rows, (cell[1]+j)%state.cols]);
  return cells;
};

function getItemPreviewCells(itemKey, cell) {
  var resolver = ITEM_PREVIEW_CELL_RESOLVERS[itemKey];
  if (resolver) return resolver(cell);
  return [[cell[0], cell[1]]];
}