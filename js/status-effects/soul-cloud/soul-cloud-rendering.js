/* ============================================================
   SOUL CLOUD — RENDERING

   buildSoulCloudOverlay(cellEl) is a new extracted helper. The
   original source built this exact overlay div inline inside
   buildGridDOM, once per grid cell that was in a soul cloud's
   halo but not its center (soulCloudHalo[cellKey] &&
   !soulCloudCenters[cellKey]).

   buildGridDOM is responsible for computing the per-cell
   center/halo membership (via getSoulCloudExpandedCells, see
   soul-cloud-logic.js) and only calling this for cells that
   qualify.
   ============================================================ */

function buildSoulCloudOverlay(cellEl) {
  var cloud = document.createElement('div');
  cloud.className = 'soul-cloud';
  cellEl.appendChild(cloud);
}
