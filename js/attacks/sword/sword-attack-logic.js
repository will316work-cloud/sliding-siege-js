/* ============================================================
   SWORD ATTACK — LOGIC

   Wrapped in an IIFE for the same reason as axe-attack-logic.js
   — see its header comment.
   ============================================================ */

(function() {
  var labelName = "Sword Slice";
  var icon = "🗡️";
  var baseDmg = 13;
  var variants = ['diag_ur','diag_dr'];
  var defaultVariant = 'diag_ur';
  var description = "Slices a full diagonal line through the targeted tile, edge to edge. Click the yellow anchor tile again to flip the diagonal direction.";

  ATTACK_DEFS.sword = { name: labelName, icon: icon, baseDmg: baseDmg, variants: variants, defaultVariant: defaultVariant, desc: description };

  ATTACK_CELL_RESOLVERS.sword = function(r, c, variant) {
    var R = state.rows, C = state.cols;
    function inBounds(rr,cc) { return rr >= 0 && rr < R && cc >= 0 && cc < C; }
    var cells = [];
    var stepDr = variant === 'diag_ur' ? -1 : 1;
    var maxK = Math.max(R,C);
    for (var k = -maxK; k <= maxK; k++) {
      var rr = r + stepDr*k, cc = c + k;
      if (inBounds(rr,cc)) cells.push([rr,cc]);
    }
    return cells;
  };
})();
