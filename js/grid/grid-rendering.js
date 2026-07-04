/* ============================================================
   GRID — RENDERING

   Depends on: getAttackCells() (see general-attack-logic.js),
   getDisabledAttackKeys()/getDisabledItemKeys() (see
   ability-disabling-logic.js), isStunned() (see stun-logic.js),
   buildStunBadge() (see stun-rendering.js), hasDamageReduction()
   (see damage-reduction-logic.js), buildDamageReductionBadge()
   (see damage-reduction-rendering.js), getSoulCloudExpandedCells()
   (see soul-cloud-logic.js), buildSoulCloudOverlay() (see
   soul-cloud-rendering.js), getBombBlastCells()/bombVariantLabel()
   (see bomb-enemy-logic.js), isSpriteTelegraphCell-related sprite
   shape lookups (see sprite-enemy-logic.js), isRolly() (see
   rolly-enemy-logic.js), debug globals (see debug-*-logic.js),
   confirmButtonReady() (see confirm-button-logic.js), shiftRow/
   shiftCol/revertLastShift (see grid-logic.js), buildDebugPanelDOM()
   (see debug-panel-shell-rendering.js), spacerDiv() (see
   general-ui-rendering.js), and various show*Confirm helpers
   (see general-ui-rendering.js / turn-rendering.js). These are
   all called, not defined, here.
   ============================================================ */

function getGridMetrics() {
  var gridEl = document.getElementById('grid');
  if (!gridEl) return null;
  var cellEls = gridEl.querySelectorAll('.cell');
  if (cellEls.length === 0) return null;
  var firstRect = cellEls[0].getBoundingClientRect();
  var cellSize = firstRect.width;
  var gapPx = 4;
  if (cellEls.length > 1) {
    var secondRect = cellEls[1].getBoundingClientRect();
    if (Math.abs(secondRect.top - firstRect.top) < 1) gapPx = secondRect.left - firstRect.right;
  }
  return { gridEl: gridEl, cellSize: cellSize, gapPx: gapPx, stride: cellSize + gapPx };
}

function cellElAt(r, c) {
  var gridEl = document.getElementById('grid');
  if (!gridEl) return null;
  return gridEl.querySelector('.cell[data-r="' + r + '"][data-c="' + c + '"]');
}

function buildGridDOM() {
  var area = document.getElementById('gridArea');
  area.innerHTML = '';

  var wrap = document.createElement('div');
  wrap.className = 'grid-wrap';
  var midRow = document.createElement('div');
  midRow.className = 'grid-mid-row';

  var rowControlsLeft = document.createElement('div');
  rowControlsLeft.className = 'row-controls';
  var leftTrack = document.createElement('div');
  leftTrack.className = 'row-btn-track';
  var rowControlsRight = document.createElement('div');
  rowControlsRight.className = 'row-controls';
  var rightTrack = document.createElement('div');
  rightTrack.className = 'row-btn-track';

  var gridButtonsDisabled = state.enemyPhaseActive || (!debugInfiniteAttacks && state.attacksRemainingThisTurn <= 0) || otherDebugInteractionsLocked();  // CHANGED

  for (var r=0; r<state.rows; r++) {
    (function(rIdx) {
      var rowDisabled = isLineDisabled('row', rIdx);  // NEW
      var leftBtn = document.createElement('div');
      leftBtn.className = 'row-btn' + (state.rowsTouchedThisTurn.has(rIdx) ? ' used' : '') + (gridButtonsDisabled ? ' disabled' : '') + (rowDisabled ? ' line-disabled' : '');  // CHANGED
      leftBtn.innerHTML = '◀' + (rowDisabled ? lineDisabledBadgeHTML() : '');  // CHANGED
      leftBtn.onclick = function() { shiftRow(rIdx, -1); };
      leftTrack.appendChild(leftBtn);
      var rightBtn = document.createElement('div');
      rightBtn.className = 'row-btn' + (state.rowsTouchedThisTurn.has(rIdx) ? ' used' : '') + (gridButtonsDisabled ? ' disabled' : '') + (rowDisabled ? ' line-disabled' : '');  // CHANGED
      rightBtn.innerHTML = '▶' + (rowDisabled ? lineDisabledBadgeHTML() : '');  // CHANGED
      rightBtn.onclick = function() { shiftRow(rIdx, 1); };
      rightTrack.appendChild(rightBtn);
    })(r);
  }
  rowControlsLeft.appendChild(spacerDiv()); rowControlsLeft.appendChild(leftTrack); rowControlsLeft.appendChild(spacerDiv());
  rowControlsRight.appendChild(spacerDiv()); rowControlsRight.appendChild(rightTrack); rowControlsRight.appendChild(spacerDiv());

  var gridOuter = document.createElement('div');
  gridOuter.className = 'grid-outer';
  var colControls = document.createElement('div');
  colControls.className = 'col-controls';
  colControls.style.marginBottom = '6px';
  for (var c=0; c<state.cols; c++) {
    (function(cIdx) {
      var colDisabledUp = isLineDisabled('col', cIdx);  // NEW
      var up = document.createElement('div');
      up.className = 'col-btn' + (state.colsTouchedThisTurn.has(cIdx) ? ' used' : '') + (gridButtonsDisabled ? ' disabled' : '') + (colDisabledUp ? ' line-disabled' : '');  // CHANGED
      up.innerHTML = '▲' + (colDisabledUp ? lineDisabledBadgeHTML() : '');  // CHANGED
      up.onclick = function() { shiftCol(cIdx, -1); };
      colControls.appendChild(up);
    })(c);
  }

  var grid = document.createElement('div');
  grid.id = 'grid';
  grid.style.gridTemplateColumns = 'repeat(' + state.cols + ', 1fr)';
  grid.style.gridTemplateRows = 'repeat(' + state.rows + ', 1fr)';
  grid.style.width = Math.min(420, state.cols*60) + 'px';

  var hitboxCells = [];
  if (previewTarget) hitboxCells = getAttackCells(previewTarget.attack, previewTarget.r, previewTarget.c, previewTarget.variant);
  function isHitboxCell(r,c) { return hitboxCells.some(function(p){ return p[0]===r && p[1]===c; }); }
  function isAnchorCell(r,c) { return previewTarget && previewTarget.r===r && previewTarget.c===c; }

  function isDebugMoveSourcePreview(r,c) {           // NEW — mirrors isItemPreviewCell/isItemAnchor for the selected enemy
    if (!debugMoveModeActive || !debugMoveSource) return false;
    return getDebugMoveFootprintCells([debugMoveSource[0], debugMoveSource[1]]).some(function(p){ return p[0]===r && p[1]===c; });
  }
  function isDebugMoveSourceAnchor(r,c) {
    return debugMoveModeActive && debugMoveSource && debugMoveSource[0]===r && debugMoveSource[1]===c;
  }

  var itemPreviewCells = [];
  if (itemTargetingMode && itemPreviewCell) itemPreviewCells = getItemPreviewCells(itemTargetingMode, itemPreviewCell);
  function isItemPreviewCell(r,c) { return itemPreviewCells.some(function(p){ return p[0]===r && p[1]===c; }); }
  function isItemAnchor(r,c) { return itemPreviewCell && itemPreviewCell[0]===r && itemPreviewCell[1]===c; }
  function isItemDestination(r,c) {
    if (!itemSecondTarget) return false;
    return getItemPreviewCells('teleport', itemSecondTarget).some(function(p){ return p[0]===r && p[1]===c; });
  }
  function isDebugMoveDestPreview(r,c) {              // RENAMED + fixed from isDebugMoveDestinationCell
    if (!debugMoveModeActive || !debugMoveSource || !debugMoveDestCell) return false;
    return getDebugMoveFootprintCells(debugMoveDestCell).some(function(p){ return p[0]===r && p[1]===c; });
  }

  var soulCloudCenters = {};
  var soulCloudHalo = {};
  Object.values(state.enemies).forEach(function(en) {
    if (!hasSoulCloud(en)) return;
    var expanded = getSoulCloudExpandedCells(en);
    expanded.center.forEach(function(p) { soulCloudCenters[p[0] + '_' + p[1]] = true; });
    expanded.halo.forEach(function(p) { soulCloudHalo[p[0] + '_' + p[1]] = true; });
  });

  var debugFootprint = [];
  if (debugSelectedType && debugPreviewCell) debugFootprint = debugFootprintCells(debugSelectedType, debugPreviewCell[0], debugPreviewCell[1]);
  function isDebugCell(r,c) { return debugFootprint.some(function(p){ return p[0]===r && p[1]===c; }); }
  function isDebugAnchor(r,c) { return debugPreviewCell && debugPreviewCell[0]===r && debugPreviewCell[1]===c; }

  // CHANGED — debugDeleteTarget is now [r, c, occupantRef], footprint
  // derived from the stored ref (no re-cycling on render — see
  // debug-delete-mode-logic.js).
  var debugDeleteFootprint = [];
  if (debugDeleteTarget) {
    var ddRef = debugDeleteTarget[2];
    if (ddRef && ddRef.kind === 'enemy') {
      var ddEn = state.enemies[ddRef.id];
      if (ddEn) {
        if (isRolly(ddEn) && ddEn.stretchAxis) {
          debugDeleteFootprint = rollyFootprintCells(ddEn);
        } else {
          for (var ddi=0; ddi<ddEn.size[0]; ddi++) {
            for (var ddj=0; ddj<ddEn.size[1]; ddj++) {
              debugDeleteFootprint.push([(ddEn.anchor[0]+ddi)%state.rows, (ddEn.anchor[1]+ddj)%state.cols]);
            }
          }
        }
      }
    } else if (ddRef) {
      debugDeleteFootprint = [[debugDeleteTarget[0], debugDeleteTarget[1]]];
    }
  }
  function isDebugDeleteCell(r,c) { return debugDeleteFootprint.some(function(p){ return p[0]===r && p[1]===c; }); }

  var bombBlastCells = {};
  Object.values(state.enemies).forEach(function(en) {
    if (en.type !== 'bomb') return;
    var cells = getBombBlastCells(en);
    cells.forEach(function(p) { bombBlastCells[p[0] + '_' + p[1]] = true; });
  });
  function isBombBlastCell(r,c) { return !!bombBlastCells[r + '_' + c]; }

  var spriteTelegraphCells = {};
  Object.values(state.enemies).forEach(function(en) {
    if (!isSprite(en) || !en.queuedShape) return;
    spriteShapeCells(en).forEach(function(p) { spriteTelegraphCells[p[0] + '_' + p[1]] = true; });
  });
  function isSpriteTelegraphCell(r,c) { return !!spriteTelegraphCells[r + '_' + c]; }

  for (var r2=0; r2<state.rows; r2++) {
    for (var c2=0; c2<state.cols; c2++) {
      (function(r, c) {
        var cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.r = r;
        cell.dataset.c = c;

        // CHANGED — state.grid[r][c] is now an array of refs, not a
        // single id. Split into enemy refs / spore-cloud refs, render
        // every inline (1x1, non-stretched) enemy ref as its own
        // offset sprite (so stacked occupants are all visible and all
        // individually clickable via getCycledOccupant), then overlay
        // a spore-cloud icon if any are present. Multi-cell enemies
        // (golem/siren/phantom/stretched-rolly) are intentionally
        // skipped here — unchanged from before, they're drawn by the
        // separate drawMultiCellEnemyBlocks/drawRollyBlocks passes.
        var cellRefs = state.grid[r][c];
        var cellEnemyRefs = cellRefs.filter(function(ref){ return ref.kind === 'enemy'; });
        var cellSporeRefs = cellRefs.filter(function(ref){ return ref.kind === 'sporeCloud'; });

        var inlineEnemyRefs = cellEnemyRefs.filter(function(ref) {
          var en = state.enemies[ref.id];
          return en && !en.pendingSpawn && en.size[0] === 1 && en.size[1] === 1 && !(isRolly(en) && en.stretchAxis);   // CHANGED
        });

        inlineEnemyRefs.forEach(function(ref, idx) {
          var en = state.enemies[ref.id];
          var ediv = buildGenericEnemySprite(en);  // CHANGED — see general-enemy-rendering.js
          if (idx > 0) ediv.classList.add('stacked-offset-' + idx);  // NEW
          if (en.type === 'bomb') decorateBombSprite(ediv, en);      // CHANGED — see bomb-enemy-rendering.js
          if (hasDamageReduction(en)) buildDamageReductionBadge(ediv);
          if (isStunned(en)) buildStunBadge(ediv);
          cell.appendChild(ediv);
        });

        if (cellSporeRefs.length > 0) buildSporeCloudOverlay(cell);  // NEW

        var cellKey = r + '_' + c;
        if (soulCloudHalo[cellKey] && !soulCloudCenters[cellKey]) {
          buildSoulCloudOverlay(cell);
        }

        if (isBombBlastCell(r,c)) {
          var blastZone = document.createElement('div');
          blastZone.className = 'bomb-blast-zone';
          cell.appendChild(blastZone);
        }

        if (isSpriteTelegraphCell(r,c)) {
          var spriteTelegraph = document.createElement('div');
          spriteTelegraph.className = 'sprite-hitbox-telegraph';
          cell.appendChild(spriteTelegraph);
        }

        if (isHitboxCell(r,c)) {
          var overlay = document.createElement('div');
          overlay.className = 'hitbox-overlay';
          cell.appendChild(overlay);
        }
      
        if (isAnchorCell(r,c)) {
          var anchorDot = document.createElement('div');
          anchorDot.className = 'anchor-dot';
          cell.appendChild(anchorDot);
        }

        if (isItemPreviewCell(r,c)) {
          var overlay2 = document.createElement('div');
          overlay2.className = 'item-destination-marker';   // CHANGED — removed the no-op ' anchor' suffix (and uses the real class name per the earlier fix)
          cell.appendChild(overlay2);
          if (isItemAnchor(r,c)) {                            // NEW
            var itemAnchorDot = document.createElement('div');
            itemAnchorDot.className = 'anchor-dot';
            cell.appendChild(itemAnchorDot);
          }
        }

        if (isDebugMoveSourcePreview(r,c)) {
          var dmSrcOverlay = document.createElement('div');
          dmSrcOverlay.className = 'item-destination-marker' + (isDebugMoveSourceAnchor(r,c) ? ' anchor' : '');
          cell.appendChild(dmSrcOverlay);
          var dmSrcDot = document.createElement('div');
          dmSrcDot.className = 'hitbox-dot';
          cell.appendChild(dmSrcDot);
        }

        if (isItemDestination(r,c)) {
          var destOverlay = document.createElement('div');
          destOverlay.className = 'item-destination-marker';   // CHANGED from item-preview-overlay
          cell.appendChild(destOverlay);
        }

        if (isDebugMoveDestPreview(r,c)) {
          var dmDestOverlay = document.createElement('div');
          dmDestOverlay.className = 'item-destination-marker';   // CHANGED from item-preview-overlay
          cell.appendChild(dmDestOverlay);
        }

        if (isDebugCell(r,c)) {
          var debugOverlay = document.createElement('div');
          debugOverlay.className = 'hitbox-overlay' + (isDebugAnchor(r,c) ? ' anchor' : '');
          cell.appendChild(debugOverlay);
        }

        if (isDebugDeleteCell(r,c)) {
          var debugDeleteOverlay = document.createElement('div');
          debugDeleteOverlay.className = 'hitbox-overlay anchor';
          cell.appendChild(debugDeleteOverlay);
        }

        cell.onclick = function() {
          if (debugDeleteModeActive) { debugDeleteModeOnCellClick(r, c); return; }
          if (debugMoveModeActive) { debugMoveModeOnCellClick(r, c); return; }
          if (otherDebugInteractionsLocked()) return;
          if (debugSelectedType) { debugOnCellClick(r, c); return; }
          if (itemTargetingMode) { itemOnCellClick(r, c); return; }
          onCellClick(r, c);   // CHANGED — was `if (targetingMode) { onCellClick(r, c); return; }`; onCellClick must always run so its own !targetingMode tooltip branch can fire
        };

        grid.appendChild(cell);
      })(r2, c2);
    }
  }

  gridOuter.appendChild(colControls);
  gridOuter.appendChild(grid);

  var colControlsBottom = document.createElement('div');
  colControlsBottom.className = 'col-controls';
  colControlsBottom.style.marginTop = '6px';
  for (var c3=0; c3<state.cols; c3++) {
    (function(cIdx) {
      var colDisabledDown = isLineDisabled('col', cIdx);  // NEW
      var down = document.createElement('div');
      down.className = 'col-btn' + (state.colsTouchedThisTurn.has(cIdx) ? ' used' : '') + (gridButtonsDisabled ? ' disabled' : '') + (colDisabledDown ? ' line-disabled' : '');  // CHANGED
      down.innerHTML = '▼' + (colDisabledDown ? lineDisabledBadgeHTML() : '');  // CHANGED
      down.onclick = function() { shiftCol(cIdx, 1); };
      colControlsBottom.appendChild(down);
    })(c3);
  }
  gridOuter.appendChild(colControlsBottom);

  midRow.appendChild(rowControlsLeft);
  midRow.appendChild(gridOuter);
  midRow.appendChild(rowControlsRight);

  var sideActions = document.createElement('div');
  sideActions.className = 'side-actions';
  sideActions.innerHTML =
    '<button id="confirmAttackBtn">✅ Confirm</button>' +
    '<button class="secondary" id="revertBtn">↩️ Revert (' + (debugInfiniteReverts ? '∞' : state.revertsLeft) + ')</button>' +
    '<button class="secondary" id="skipTurnBtn">⏭️ Skip Turn</button>' +
    '<button class="secondary danger" id="restartBtn">🔄 Restart Game</button>';

  var debugPanel = buildDebugPanelDOM();
  wrap.appendChild(debugPanel); wrap.appendChild(midRow); wrap.appendChild(sideActions);
  area.innerHTML = '';
  area.appendChild(wrap);

  var sampleRowBtn = leftTrack.querySelector('.row-btn');
  if (sampleRowBtn) {
    var widthPx = Math.max(10, Math.round(sampleRowBtn.getBoundingClientRect().height)) + 'px';
    area.querySelectorAll('.col-btn').forEach(function(btn){ btn.style.width = widthPx; });
  }

  drawMultiCellEnemyBlocks(grid);
  drawRollyBlocks(grid);
  drawGolemLinks(grid);
  drawSirenLinks(grid);
  drawSlimeStrands(grid);
  flushDamageTexts();
  flushComboText();

  document.getElementById('confirmAttackBtn').onclick = onConfirmPressed;
  document.getElementById('revertBtn').onclick = revertLastShift;
  document.getElementById('skipTurnBtn').onclick = function() {
    showConfirm('⏭️ Skip Turn?', 'This will end your turn immediately without attacking, using an item, or finishing your slides. Enemies will act normally. Continue?', skipTurnConfirmed);
  };
  document.getElementById('restartBtn').onclick = function() {
    showConfirm('🔄 Restart Game?', 'This will erase your current run — score, floor progress, charges, and items — and start a brand new game from Floor 1. This cannot be undone. Continue?', restartGameConfirmed);
  };
  document.getElementById('confirmAttackBtn').disabled = !confirmButtonReady() || state.enemyPhaseActive || otherDebugInteractionsLocked();  // CHANGED
  document.getElementById('revertBtn').disabled = (!debugInfiniteReverts && (state.revertsLeft <= 0 || state.shiftHistory.length === 0)) || (debugInfiniteReverts && state.shiftHistory.length === 0) || state.enemyPhaseActive || otherDebugInteractionsLocked();  // CHANGED
  document.getElementById('skipTurnBtn').disabled = state.enemyPhaseActive || otherDebugInteractionsLocked();  // CHANGED
}

function drawMultiCellEnemyBlocks(gridEl) {
  var multiCellEnemies = Object.values(state.enemies).filter(function(en){ return !en.pendingSpawn && (en.size[0] > 1 || en.size[1] > 1); });   // CHANGED
  if (multiCellEnemies.length === 0) return;

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

  multiCellEnemies.forEach(function(en) {
    var ar = en.anchor[0], ac = en.anchor[1], sizeRows = en.size[0], sizeCols = en.size[1];
    var rowWraps = ar + sizeRows > state.rows;
    var colWraps = ac + sizeCols > state.cols;
    var rowRuns = rowWraps ? [[ar, state.rows - ar], [0, sizeRows - (state.rows - ar)]] : [[ar, sizeRows]];
    var colRuns = colWraps ? [[ac, state.cols - ac], [0, sizeCols - (state.cols - ac)]] : [[ac, sizeCols]];
    var pieces = [];
    rowRuns.forEach(function(rowRun) {
      if (rowRun[1] <= 0) return;
      colRuns.forEach(function(colRun) {
        if (colRun[1] <= 0) return;
        pieces.push({ r: rowRun[0], c: colRun[0], h: rowRun[1], w: colRun[1] });
      });
    });

    pieces.forEach(function(piece, pieceIdx) {
      var block = document.createElement('div');
      block.className = 'enemy-block ' + en.type + (isVulnerable(en) ? ' vuln' : '') + (en.pendingDetonation ? ' critical' : '') + (isStunned(en) ? ' stunned' : '');
      block.style.position = 'absolute';
      block.style.top = pxTop(piece.r) + 'px';
      block.style.left = pxLeft(piece.c) + 'px';
      block.style.width = spanPx(piece.w) + 'px';
      block.style.height = spanPx(piece.h) + 'px';
      block.dataset.enemyId = en.id;          // NEW — every piece, not just the anchor, so spawn animation can find them all
      block.dataset.pieceR = piece.r;          // NEW — identifies which piece is the spawn anchor's own piece
      block.dataset.pieceC = piece.c;          // NEW
      if (pieceIdx === 0) {
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
        if (isSiren(en) && !isStunned(en)) attachSirenNoteLoop(block, en.songCounter || 0);
      }
      gridEl.appendChild(block);
    });
  });
}
