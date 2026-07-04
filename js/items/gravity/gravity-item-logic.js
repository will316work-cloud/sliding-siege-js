/* ============================================================
   GRAVITY ORB ITEM — LOGIC

   Wrapped in an IIFE for the same reason as
   extra-swing-item-logic.js — see its header comment.

   Registers its own preview-cell shape into
   ITEM_PREVIEW_CELL_RESOLVERS (see general-item-rendering.js),
   since Gravity Orb is the only item with a non-default (5x5
   area) preview highlight — kept alongside the item that owns
   it rather than centralized, consistent with how attacks keep
   their variant/shape logic self-contained.

   applyGravityOrb() depends on: isRolly()/shrinkRolly() (see
   rolly-enemy-logic.js / grid-logic.js), recomputeAnchors() (see
   grid-logic.js), animateMoveLeap() (see animation-rendering.js).
   ============================================================ */

(function() {
  var labelName = "Gravity Orb";
  var icon = "🌑";
  var description = "Pulls every enemy within a 5x5 area toward your chosen center tile, nearest enemies settling first. Free of bonus decay.";

  ITEM_DEFS.gravity = { name: labelName, icon: icon, desc: description };

  ITEM_EFFECT_RESOLVERS.gravity = async function() {
    if (!itemPreviewCell) { toast('Pick a tile to pull enemies toward.'); return false; }
    if (!debugInfiniteItems) state.items.gravity--;
    await applyGravityOrb(itemPreviewCell);
    toast('Gravity Orb: enemies pulled in!');
    return true;
  };

  ITEM_PREVIEW_CELL_RESOLVERS.gravity = function(cell) {
    var r = cell[0], c = cell[1];
    var cells = [];
    for (var dr=-2; dr<=2; dr++) {
      for (var dc=-2; dc<=2; dc++) {
        var rr=r+dr, cc=c+dc;
        if (rr>=0 && rr<state.rows && cc>=0 && cc<state.cols) cells.push([rr,cc]);
      }
    }
    return cells;
  };
})();

async function applyGravityOrb(center) {
  var cr = center[0], cc = center[1];
  var affected = [];
  var dr, dc;
  for (dr=-2; dr<=2; dr++) for (dc=-2; dc<=2; dc++) {
    var rr=cr+dr, cc2=cc+dc;
    if (rr<0||rr>=state.rows||cc2<0||cc2>=state.cols) continue;
    var id = state.grid[rr][cc2];
    if (id && affected.indexOf(id) === -1) affected.push(id);
  }

  affected.sort(function(idA, idB) {
    var a = state.enemies[idA], b = state.enemies[idB];
    if (!a || !b) return 0;
    var distA = Math.hypot(a.anchor[0]-cr, a.anchor[1]-cc);
    var distB = Math.hypot(b.anchor[0]-cr, b.anchor[1]-cc);
    return distA - distB;
  });

  for (var ai=0; ai<affected.length; ai++) {
    var id2 = affected[ai];
    var en = state.enemies[id2];
    if (!en) continue;
    if (isRolly(en) && en.stretchAxis) shrinkRolly(en);
    var origR = en.anchor[0], origC = en.anchor[1];

    var cellsFreeAt = (function(enemy, enemyId) {
      return function(nr, nc) {
        if (nr < 0 || nc < 0) return false;
        for (var i=0;i<enemy.size[0];i++) for (var j=0;j<enemy.size[1];j++) {
          var rr = (nr+i) % state.rows;
          var cc3 = (nc+j) % state.cols;
          var occ = state.grid[rr][cc3];
          if (occ && occ !== enemyId) return false;
        }
        return true;
      };
    })(en, id2);

    var best = null, bestCenterDist = Infinity, bestOrigDist = Infinity;
    for (var ndr=-2; ndr<=2; ndr++) {
      for (var ndc=-2; ndc<=2; ndc++) {
        var nr = cr+ndr, nc = cc+ndc;
        if (nr<0||nr>=state.rows||nc<0||nc>=state.cols) continue;
        if (!cellsFreeAt(nr, nc)) continue;
        var centerDist = Math.hypot(cr-nr, cc-nc);
        var origDist = Math.hypot(origR-nr, origC-nc);
        if (centerDist < bestCenterDist - 1e-9 ||
            (Math.abs(centerDist - bestCenterDist) < 1e-9 && origDist < bestOrigDist - 1e-9)) {
          best = [nr, nc];
          bestCenterDist = centerDist;
          bestOrigDist = origDist;
        }
      }
    }

    if (!best) continue;
    if (best[0] === origR && best[1] === origC) continue;

    animateMoveLeap(origR, origC, best[0], best[1], en.size[0] > 1, en.size[0], true);

    for (var i2=0;i2<en.size[0];i2++) for (var j2=0;j2<en.size[1];j2++) state.grid[(origR+i2)%state.rows][(origC+j2)%state.cols] = null;
    for (var i3=0;i3<en.size[0];i3++) for (var j3=0;j3<en.size[1];j3++) state.grid[(best[0]+i3)%state.rows][(best[1]+j3)%state.cols] = en.id;
    en.anchor = [best[0], best[1]];
    recomputeAnchors();

    await wait(380);
    render();
    await wait(40);
  }
}
