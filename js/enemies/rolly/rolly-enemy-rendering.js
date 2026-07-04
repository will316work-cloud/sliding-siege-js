/* ============================================================
   ROLLY POLLY — RENDERING

   drawRollyBlocks() updated to call the Bundle 1 accessors
   (isVulnerable, buildDamageReductionBadge, buildStunBadge)
   instead of the original inline en.vulnerable check and
   duplicated badge-building blocks.
   ============================================================ */

function drawRollyBlocks(gridEl) {
  var rollies = Object.values(state.enemies).filter(function(en) { return !en.pendingSpawn && isRolly(en) && en.stretchAxis; });   // CHANGED
  if (rollies.length === 0) return;
  var cellEls = gridEl.querySelectorAll('.cell');
  if (cellEls.length === 0) return;
  var firstCellRect = cellEls[0].getBoundingClientRect();
  var gridRect = gridEl.getBoundingClientRect();
  var cellSize = firstCellRect.width;
  var gapPx = 4;
  if (cellEls.length > 1) {
    var secondCellRect = cellEls[1].getBoundingClientRect();
    if (Math.abs(secondCellRect.top - firstCellRect.top) < 1) gapPx = secondCellRect.left - firstCellRect.right;
  }
  var baseTop = firstCellRect.top - gridRect.top;
  var baseLeft = firstCellRect.left - gridRect.left;
  var stride = cellSize + gapPx;
  function pxTop(i) { return baseTop + i * stride; }
  function pxLeft(i) { return baseLeft + i * stride; }
  function spanPx(n) { return n * cellSize + (n - 1) * gapPx; }

  rollies.forEach(function(en) {
    var ar = en.anchor[0], ac = en.anchor[1];
    var lineLen = en.stretchBefore + en.stretchAfter + 1;
    var startR = en.stretchAxis === 'col' ? ((ar - en.stretchBefore) % state.rows + state.rows) % state.rows : ar;
    var startC = en.stretchAxis === 'row' ? ((ac - en.stretchBefore) % state.cols + state.cols) % state.cols : ac;
    var rowLen = en.stretchAxis === 'col' ? lineLen : 1;
    var colLen = en.stretchAxis === 'row' ? lineLen : 1;

    var rowWraps = startR + rowLen > state.rows;
    var colWraps = startC + colLen > state.cols;
    var rowRuns = rowWraps ? [[startR, state.rows - startR], [0, rowLen - (state.rows - startR)]] : [[startR, rowLen]];
    var colRuns = colWraps ? [[startC, state.cols - startC], [0, colLen - (state.cols - startC)]] : [[startC, colLen]];
    var pieces = [];
    rowRuns.forEach(function(rowRun) {
      colRuns.forEach(function(colRun) {
        if (rowRun[1] > 0 && colRun[1] > 0) pieces.push({ rowStart: rowRun[0], rowLen: rowRun[1], colStart: colRun[0], colLen: colRun[1] });
      });
    });

    function originPercentFor(anchorIdx, pieceStart, pieceLen, gridSize) {   // NEW
      var rel = ((anchorIdx - pieceStart) % gridSize + gridSize) % gridSize;
      if (rel >= pieceLen) {
        var distFromEnd = ((anchorIdx - (pieceStart + pieceLen)) % gridSize + gridSize) % gridSize;
        var distFromStart = ((pieceStart - anchorIdx) % gridSize + gridSize) % gridSize;
        return distFromStart <= distFromEnd ? 0 : 100;
      }
      return ((rel + 0.5) / pieceLen) * 100;
    }

    pieces.forEach(function(piece) {
      var block = document.createElement('div');
      var isAnchorPiece = piece.rowStart === startR && piece.colStart === startC;
      var animClass = en._stretchAnim ? (' ' + en._stretchAnim + '-' + en.stretchAxis) : '';   // CHANGED
      block.className = 'enemy-block rolly' + (isVulnerable(en) ? ' vuln' : '') + (isStunned(en) ? ' stunned' : '') + animClass;   // CHANGED
      block.style.top = pxTop(piece.rowStart) + 'px';
      block.style.left = pxLeft(piece.colStart) + 'px';
      block.style.width = spanPx(piece.colLen) + 'px';
      block.style.height = spanPx(piece.rowLen) + 'px';
      if (en._stretchAnim) {                                                  // NEW
        if (en.stretchAxis === 'row') {
          block.style.transformOrigin = originPercentFor(ac, piece.colStart, piece.colLen, state.cols) + '% 50%';
        } else {
          block.style.transformOrigin = '50% ' + originPercentFor(ar, piece.rowStart, piece.rowLen, state.rows) + '%';
        }
      }
      if (isAnchorPiece) {
        var labelDiv = document.createElement('div');
        labelDiv.className = 'label'; labelDiv.textContent = en.label;
        var hpDiv = document.createElement('div');
        hpDiv.className = 'hp'; hpDiv.textContent = Math.max(0, en.hp);
        block.appendChild(labelDiv); block.appendChild(hpDiv);
        block.dataset.enemyTextId = en.id;
        if (hasDamageReduction(en)) {
          buildDamageReductionBadge(block);
        }
        if (isStunned(en)) {
          buildStunBadge(block);
        }
      }
      gridEl.appendChild(block);
    });
  });
}
