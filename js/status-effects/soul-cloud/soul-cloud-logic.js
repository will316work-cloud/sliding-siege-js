/* ============================================================
   SOUL CLOUD — LOGIC

   hasSoulCloud / applySoulCloud / getSoulCloudExpandedCells are
   new extracted accessors/helpers. The original source read/
   wrote the raw en.soulCloudTurns flag directly and inline at
   3 call sites:
     - buildGridDOM (rendering)      — built the halo/center cell
       maps via an inline geometry loop over en.size
     - resolveAttack (hit detection) — expanded the hit check by
       1 cell in every direction around any soul-clouded enemy
       not already hit, using the same en.size-based geometry
     - applySelectedItem (Expanded Soul item) — wrote
       en1.soulCloudTurns = 1
   getSoulCloudExpandedCells(en) captures the shared "every cell
   within 1 ring of this enemy's footprint" geometry so both the
   rendering halo and the hit-detection expansion stay in sync.
   ============================================================ */

function hasSoulCloud(en) {
  return !!(en && en.soulCloudTurns > 0);
}

function applySoulCloud(en, turns) {
  if (!en) return;
  en.soulCloudTurns = turns == null ? 1 : turns;
}

// Returns { center: [[r,c], ...], halo: [[r,c], ...] } where
// `center` is the enemy's own footprint (wrapped) and `halo` is
// every cell exactly 1 ring outward from that footprint
// (wrapped), matching the original inline geometry used by both
// buildGridDOM's cloud overlay and resolveAttack's hit expansion.
function getSoulCloudExpandedCells(en) {
  var ar = en.anchor[0], ac = en.anchor[1];
  var center = [];
  var halo = [];
  var i, j;
  for (i = 0; i < en.size[0]; i++) {
    for (j = 0; j < en.size[1]; j++) {
      center.push([((ar + i) % state.rows + state.rows) % state.rows, ((ac + j) % state.cols + state.cols) % state.cols]);
    }
  }
  for (i = -1; i <= en.size[0]; i++) {
    for (j = -1; j <= en.size[1]; j++) {
      var rr = ((ar + i) % state.rows + state.rows) % state.rows;
      var cc = ((ac + j) % state.cols + state.cols) % state.cols;
      halo.push([rr, cc]);
    }
  }
  return { center: center, halo: halo };
}
