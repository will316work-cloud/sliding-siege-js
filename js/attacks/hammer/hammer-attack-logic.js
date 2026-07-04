/* ============================================================
   HAMMER ATTACK — LOGIC

   Wrapped in an IIFE for the same reason as axe-attack-logic.js
   — see its header comment.
   ============================================================ */

(function() {
  var labelName = "Hammer Drop";
  var icon = "🔨";
  var baseDmg = 20;
  var variants = [0,90,180,270];
  var defaultVariant = 0;
  var description = "Smashes a 2x2 area anchored at the targeted tile. Click the yellow anchor tile again to rotate which quadrant is hit.";

  ATTACK_DEFS.hammer = { name: labelName, icon: icon, baseDmg: baseDmg, variants: variants, defaultVariant: defaultVariant, desc: description };

  ATTACK_CELL_RESOLVERS.hammer = function(r, c, variant) {
    var R = state.rows, C = state.cols;
    function inBounds(rr,cc) { return rr >= 0 && rr < R && cc >= 0 && cc < C; }
    var offsetsByRot = {
      0:   [[0,0],[0,1],[1,0],[1,1]],
      90:  [[0,0],[0,-1],[1,0],[1,-1]],
      180: [[0,0],[0,-1],[-1,0],[-1,-1]],
      270: [[0,0],[0,1],[-1,0],[-1,1]]
    };
    var offs = offsetsByRot[variant] || offsetsByRot[0];
    var cells = [];
    for (var oi=0; oi<offs.length; oi++) {
      var rr = r+offs[oi][0], cc = c+offs[oi][1];
      if (inBounds(rr,cc)) cells.push([rr,cc]);
    }
    return cells;
  };
})();
