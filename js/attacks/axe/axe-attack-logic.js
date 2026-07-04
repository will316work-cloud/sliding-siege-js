/* ============================================================
   AXE ATTACK — LOGIC

   Wrapped in an IIFE so labelName/icon/baseDmg/variants/
   defaultVariant/description stay local to this file and don't
   collide with the same-named variables in the other 4 attack
   files (all loaded as plain global <script> tags).
   ============================================================ */

(function() {
  var labelName = "Axe Chop";
  var icon = "🪓";
  var baseDmg = 14;
  var variants = ['row','col'];
  var defaultVariant = 'row';
  var description = "Chops a full row or column through the targeted tile. Click the yellow anchor tile again to toggle between row and column.";

  ATTACK_DEFS.axe = { name: labelName, icon: icon, baseDmg: baseDmg, variants: variants, defaultVariant: defaultVariant, desc: description };

  ATTACK_CELL_RESOLVERS.axe = function(r, c, variant) {
    var R = state.rows, C = state.cols;
    var cells = [];
    if (variant === 'row') {
      for (var cc=0; cc<C; cc++) cells.push([r,cc]);
    } else {
      for (var rr=0; rr<R; rr++) cells.push([rr,c]);
    }
    return cells;
  };
})();
