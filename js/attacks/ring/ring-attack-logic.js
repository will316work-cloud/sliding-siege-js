/* ============================================================
   RING ATTACK — LOGIC

   Wrapped in an IIFE for the same reason as axe-attack-logic.js
   — see its header comment.
   ============================================================ */

(function() {
  var labelName = "Ring Spell";
  var icon = "💫";
  var baseDmg = 10;
  var variants = [1,2,3];
  var defaultVariant = 1;
  var description = "Casts a 1-tile-thick square ring around the targeted center (the center itself is not hit). Click the yellow center tile again to cycle the ring's radius from 1 to 3.";

  ATTACK_DEFS.ring = { name: labelName, icon: icon, baseDmg: baseDmg, variants: variants, defaultVariant: defaultVariant, desc: description };

  ATTACK_CELL_RESOLVERS.ring = function(r, c, variant) {
    var R = state.rows, C = state.cols;
    function inBounds(rr,cc) { return rr >= 0 && rr < R && cc >= 0 && cc < C; }
    var rad = variant;
    var cells = [];
    for (var dr=-rad; dr<=rad; dr++) {
      for (var dc=-rad; dc<=rad; dc++) {
        if (Math.max(Math.abs(dr), Math.abs(dc)) !== rad) continue;
        var rr = r+dr, cc = c+dc;
        if (inBounds(rr,cc)) cells.push([rr,cc]);
      }
    }
    return cells;
  };
})();
