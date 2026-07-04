/* ============================================================
   SPORE CLOUD — RENDERING

   buildSporeCloudOverlay(cellEl) mirrors buildSoulCloudOverlay
   (see soul-cloud-rendering.js) — a small absolutely-positioned
   div appended into a cell's DOM node. Unlike soul cloud (which
   is keyed off enemy data and only ever overlaps an enemy's own
   halo), spore clouds are keyed off the standalone state.sporeClouds
   map and can sit on any cell, occupied or not, since they're a
   transparent entity that never reserves grid space.

   grid-rendering.js's buildGridDOM() is responsible for checking
   hasSporeCloudAt(r,c) (see spore-cloud-logic.js) per cell and only
   calling this for cells that qualify (see grid-rendering.js patch
   notes).

   Suggested CSS (add alongside .soul-cloud's rules in index.html's
   <style> block):

     .spore-cloud {
       position: absolute; inset: 3px;
       border-radius: 8px;
       background: rgba(168, 85, 247, 0.22);
       border: 1px dashed rgba(168, 85, 247, 0.65);
       display: flex; align-items: center; justify-content: center;
       font-size: 15px;
       pointer-events: none;
       z-index: 5;
     }
   ============================================================ */

function buildSporeCloudOverlay(cellEl) {
  var cloud = document.createElement('div');
  cloud.className = 'spore-cloud';
  cloud.textContent = '🍄';
  cellEl.appendChild(cloud);
}
