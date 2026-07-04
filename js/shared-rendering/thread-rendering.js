/* ============================================================
   THREAD RENDERING (generic)

   A "thread" is a dashed SVG line (or multi-point path)
   connecting two or more points, used throughout the game to
   visualize a relationship between an enemy and something else
   (another enemy, an attack/item card). The original source
   duplicated this SVG-building pattern across 4 functions:
     - drawGolemLinks / drawSirenLinks   (grid-relative <line>)
     - drawMageLinks / drawSirenCurseThreads (document-relative <line>)
     - drawSlimeStrands                  (grid-relative <polyline>)
   This file extracts the shared mechanics so each consumer only
   supplies points + style.

   Two coordinate systems exist in the original source and are
   both supported here:

   1) GRID mode — used by drawGolemLinks / drawSirenLinks /
      drawSlimeStrands. The SVG is appended INSIDE the grid
      element, sized 100%/100%, with point coordinates relative
      to the grid's own top-left corner. No id, never explicitly
      removed — see the rationale below.

   2) DOCUMENT mode — used by drawMageLinks / drawSirenCurseThreads.
      The SVG is appended to document.body as a full-page
      overlay sized to the scrollable document, with point
      coordinates as absolute page coordinates (including scroll
      offset). Always id-based so a fresh render can remove the
      previous overlay before drawing the new one.

   Why the asymmetry: 'grid' mode's parent (the #grid div) is
   rebuilt from scratch on every buildGridDOM() call, so any
   previous grid-relative overlay is already detached (and
   garbage-collected) by the time a new one is appended — explicit
   removal would be redundant work with no benefit. 'document'
   mode's parent (document.body) is never cleared, so without
   explicit id-based removal, every render would stack a new
   full-page SVG on top of the last, leaking one element per call.

   elementCenterPoint(el) (document-relative center of a DOM
   element) lives here since it's the simple, generic half of
   point resolution. The enemy-aware equivalent that also
   accounts for multi-cell footprints and stretched-rolly
   geometry, resolveCastPoint(target), lives in
   animation-rendering.js since it's also used by non-thread
   animations (sparkle/shield/mage-cast-bolt).
   ============================================================ */

var SVG_NS = 'http://www.w3.org/2000/svg';

function getOrCreateThreadOverlay(svgId, cssClass, mode) {
  if (mode === 'document') {
    var existing = document.getElementById(svgId);
    if (existing) existing.remove();

    var docWidth = Math.max(document.documentElement.scrollWidth, window.innerWidth);
    var docHeight = Math.max(document.documentElement.scrollHeight, window.innerHeight);

    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('id', svgId);
    svg.setAttribute('class', cssClass);
    svg.setAttribute('width', docWidth);
    svg.setAttribute('height', docHeight);
    return svg;
  }

  // 'grid' mode — no id, no removal; see header note above.
  var gridSvg = document.createElementNS(SVG_NS, 'svg');
  gridSvg.setAttribute('class', cssClass);
  gridSvg.setAttribute('width', '100%');
  gridSvg.setAttribute('height', '100%');
  return gridSvg;
}

// Document-relative center point of a plain DOM element (adds
// the current scroll offset, matching the original inline
// scrollX/scrollY + getBoundingClientRect() math used by
// drawMageLinks / drawSirenCurseThreads for their card targets).
function elementCenterPoint(el) {
  if (!el) return null;
  var scrollX = window.scrollX || window.pageXOffset || 0;
  var scrollY = window.scrollY || window.pageYOffset || 0;
  var rect = el.getBoundingClientRect();
  return [rect.left + rect.width/2 + scrollX, rect.top + rect.height/2 + scrollY];
}

// style: { stroke, strokeOpacity, strokeWidth, dasharray }
function drawThread(svg, p1, p2, style) {
  var line = document.createElementNS(SVG_NS, 'line');
  line.setAttribute('x1', p1[0]);
  line.setAttribute('y1', p1[1]);
  line.setAttribute('x2', p2[0]);
  line.setAttribute('y2', p2[1]);
  line.setAttribute('stroke', style.stroke);
  line.setAttribute('stroke-opacity', style.strokeOpacity != null ? style.strokeOpacity : 0.7);
  line.setAttribute('stroke-width', style.strokeWidth != null ? style.strokeWidth : 2);
  line.setAttribute('stroke-dasharray', style.dasharray != null ? style.dasharray : '4,6');
  line.setAttribute('stroke-linecap', 'round');
  svg.appendChild(line);
}

// points: array of [x,y] pairs forming one continuous polyline
// (used by drawSlimeStrands for its cluster path).
function drawThreadPath(svg, points, style) {
  if (points.length < 2) return;
  var pointsStr = points.map(function(pt) { return pt[0] + ',' + pt[1]; }).join(' ');
  var polyline = document.createElementNS(SVG_NS, 'polyline');
  polyline.setAttribute('points', pointsStr);
  polyline.setAttribute('fill', 'none');
  polyline.setAttribute('stroke', style.stroke);
  polyline.setAttribute('stroke-opacity', style.strokeOpacity != null ? style.strokeOpacity : 0.7);
  polyline.setAttribute('stroke-width', style.strokeWidth != null ? style.strokeWidth : 2);
  polyline.setAttribute('stroke-dasharray', style.dasharray != null ? style.dasharray : '4,6');
  polyline.setAttribute('stroke-linecap', 'round');
  polyline.setAttribute('stroke-linejoin', 'round');
  svg.appendChild(polyline);
}

// Grid-relative center of an enemy's footprint, given a grid
// metrics object ({ cellSize, gapPx, stride } — see
// getGridMetrics() in grid-rendering.js) plus the grid's own
// baseTop/baseLeft offset. Extracted from the IDENTICAL
// centerOfEnemy() closure that was duplicated verbatim inside
// both drawGolemLinks and drawSirenLinks (rolly-span midpoint
// handling, wrap handling, multi-cell span handling included).
function enemyFootprintCenter(en, metrics) {
  var ar = en.anchor[0], ac = en.anchor[1];
  var anchorTopLeftX = metrics.baseLeft + ac * metrics.stride;
  var anchorTopLeftY = metrics.baseTop + ar * metrics.stride;
  var anchorCenter = [anchorTopLeftX + metrics.cellSize/2, anchorTopLeftY + metrics.cellSize/2];

  var rollySpan = nonSquareFootprintSpan(en);
  if (rollySpan) {
    if (enemyWraps(en)) return anchorCenter;
    var midR = rollySpan.axis === 'col' ? ar + (rollySpan.after - rollySpan.before) / 2 : ar;
    var midC = rollySpan.axis === 'row' ? ac + (rollySpan.after - rollySpan.before) / 2 : ac;
    var midTopLeftX = metrics.baseLeft + Math.round(midC) * metrics.stride;
    var midTopLeftY = metrics.baseTop + Math.round(midR) * metrics.stride;
    return [midTopLeftX + metrics.cellSize/2, midTopLeftY + metrics.cellSize/2];
  }

  if (en.size[0] > 1 && enemyWraps(en)) {
    return anchorCenter;
  }
  var span = en.size[0] * metrics.cellSize + (en.size[0] - 1) * metrics.gapPx;
  return [anchorTopLeftX + span/2, anchorTopLeftY + span/2];
}

// Computes the baseTop/baseLeft offset of a grid's first cell
// relative to the grid element itself — the piece of metrics
// that getGridMetrics() (grid-rendering.js) doesn't provide but
// enemyFootprintCenter() needs. Extracted from the identical
// inline block duplicated at the top of drawGolemLinks,
// drawSirenLinks, and drawSlimeStrands.
function gridOffsetMetrics(gridEl) {
  var cellEls = gridEl.querySelectorAll('.cell');
  if (cellEls.length === 0) return null;
  var firstCellRect = cellEls[0].getBoundingClientRect();
  var gridRect = gridEl.getBoundingClientRect();
  var cellSize = firstCellRect.width;
  var gapPx = 4;
  if (cellEls.length > 1) {
    var secondCellRect = cellEls[1].getBoundingClientRect();
    if (Math.abs(secondCellRect.top - firstCellRect.top) < 1) {
      gapPx = secondCellRect.left - firstCellRect.right;
    }
  }
  var baseTop = firstCellRect.top - gridRect.top;
  var baseLeft = firstCellRect.left - gridRect.left;
  return { cellSize: cellSize, gapPx: gapPx, stride: cellSize + gapPx, baseTop: baseTop, baseLeft: baseLeft };
}
