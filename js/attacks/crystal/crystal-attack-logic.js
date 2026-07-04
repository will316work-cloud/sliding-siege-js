/* ============================================================
   CRYSTAL ATTACK — LOGIC

   Wrapped in an IIFE for the same reason as axe-attack-logic.js
   — see its header comment.
   ============================================================ */

(function() {
  var labelName = "Crystal Bomb";
  var icon = "🔷";
  var baseDmg = 16;
  var variants = ['plus','x'];
  var defaultVariant = 'plus';
  var description = "Detonates the targeted tile plus 2 tiles outward in a + or X pattern. Click the yellow center tile again to switch between the two shapes.";

  ATTACK_DEFS.crystal = { name: labelName, icon: icon, baseDmg: baseDmg, variants: variants, defaultVariant: defaultVariant, desc: description };

  ATTACK_CELL_RESOLVERS.crystal = function(r, c, variant) {
    var R = state.rows, C = state.cols;
    function inBounds(rr,cc) { return rr >= 0 && rr < R && cc >= 0 && cc < C; }
    var cells = [];
    if (inBounds(r,c)) cells.push([r,c]);
    var dirs = variant === 'plus' ? [[1,0],[-1,0],[0,1],[0,-1]] : [[1,1],[1,-1],[-1,1],[-1,-1]];
    for (var di=0; di<dirs.length; di++) {
      for (var k=1;k<=2;k++) {
        var rr = r+dirs[di][0]*k, cc = c+dirs[di][1]*k;
        if (inBounds(rr,cc)) cells.push([rr,cc]);
      }
    }
    return cells;
  };
})();
