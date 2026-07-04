/* ============================================================
   ROW/COLUMN DISABLING — RENDERING

   buildGridDOM() (see grid-rendering.js) is responsible for calling
   isLineDisabled('row', rIdx) / isLineDisabled('col', cIdx) (see
   row-col-disabling-logic.js) per row/column button it builds, and
   applying the classes/badge this file provides whenever a line is
   disabled. This file only supplies the small reusable pieces:
   the CSS class suffix and the badge element — it doesn't touch
   the DOM tree directly, since the row/col buttons themselves are
   built inline in buildGridDOM's loops, not via a dedicated builder
   function the way e.g. buildSoulCloudOverlay owns its own cell
   overlay.
   ============================================================ */

// Suggested CSS (add alongside .row-btn/.col-btn's existing rules in
// index.html's <style> block):
//
//   .row-btn.line-disabled, .col-btn.line-disabled {
//     background: rgba(168, 85, 247, 0.25) !important;
//     border-color: rgba(168, 85, 247, 0.7) !important;
//     cursor: not-allowed;
//   }
//   .line-disabled-badge {
//     position: absolute; font-size: 9px; pointer-events: none;
//     top: -2px; right: -2px;
//   }

function lineDisabledBadgeHTML() {
  return '<span class="line-disabled-badge">👻</span>';
}
