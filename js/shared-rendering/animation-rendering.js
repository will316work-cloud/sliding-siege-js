/* ============================================================
   ANIMATION RENDERING (generic)

   Depends on: cellElAt()/getGridMetrics() (see grid-rendering.js),
   nonSquareFootprintSpan()/enemyWraps() (see grid-logic.js).
   These are called, not defined, here.

   Note: hexToRgba() (a pure color utility) was relocated to
   general-ui-logic.js since it's a generic helper, not an
   animation.
   ============================================================ */

function animateSpawnAt(r, c) {
  var cell = cellElAt(r, c);
  if (cell) {
    var sprite = cell.querySelector('.enemy');
    if (sprite) { sprite.classList.add('spawn-grow'); return; }   // CHANGED — early-return for the 1x1 case, unchanged behavior
  }

  // NEW — multi-cell case: find every piece belonging to the enemy anchored at (r,c)
  var gridEl = document.getElementById('grid');
  if (!gridEl) return;
  var anchorEnemyId = null;
  var allBlocks = Array.prototype.slice.call(gridEl.querySelectorAll('.enemy-block[data-enemy-id]'));
  allBlocks.forEach(function(b) {
    if (Number(b.dataset.pieceR) === r && Number(b.dataset.pieceC) === c) anchorEnemyId = b.dataset.enemyId;
  });
  if (anchorEnemyId == null) return;

  var pieceBlocks = allBlocks.filter(function(b) { return b.dataset.enemyId === anchorEnemyId; });
  pieceBlocks.forEach(function(block) {
    block.classList.add('spawn-grow');   // transform-origin defaults to 50% 50% (center) — no per-piece origin math needed
  });
}

function queueDamageTextAt(r, c, amount, size, isHeal, enemyId) {
  var wrappedR = ((r % state.rows) + state.rows) % state.rows;
  var wrappedC = ((c % state.cols) + state.cols) % state.cols;
  pendingDamageTexts.push([wrappedR, wrappedC, amount, !!isHeal, enemyId]);
}

// Finds whichever DOM element currently carries this enemy's actual
// rendered name/HP text — the small .enemy sprite for a 1x1 enemy, or the
// specific .enemy-block piece (drawMultiCellEnemyBlocks / drawRollyBlocks)
// that was marked via data-enemy-text-id. This is the right anchor for the
// floating indicator regardless of footprint size or wrapping, since it's
// the literal element the name/HP are drawn into — not a separately
// recomputed "center", which could disagree with where the text actually
// sits once a multi-cell body wraps around a grid edge.
function findEnemyTextEl(enemyId) {
  var grid = document.getElementById('grid');
  if (!grid) return null;
  return grid.querySelector('[data-enemy-text-id="' + enemyId + '"]');
}

function flushDamageTexts() {
  for (var i=0;i<pendingDamageTexts.length;i++) {
    var entry = pendingDamageTexts[i];
    var r = entry[0], c = entry[1], amount = entry[2], isHeal = entry[3];
    var enemyId = entry[4];
    var anchorEl = enemyId != null ? findEnemyTextEl(enemyId) : null;
    var cell = cellElAt(r, c);
    if (!anchorEl && !cell) continue;

    var dmgDiv = document.createElement('div');
    dmgDiv.className = 'floatdmg' + (isHeal ? ' heal' : '');
    dmgDiv.textContent = (isHeal ? '+' : '-') + amount;
    var jitterPct = (Math.random() - 0.5) * 30;

    if (anchorEl) {
      // Position relative to the element that actually shows the name/HP
      // text, at its horizontal middle, just above its top edge — correct
      // for any footprint size and unaffected by wrapping, since anchorEl
      // is exactly the rendered piece carrying that text.
      var rect = anchorEl.getBoundingClientRect();
      var gridRect = document.getElementById('grid').getBoundingClientRect();
      dmgDiv.style.position = 'absolute';
      dmgDiv.style.left = (rect.left - gridRect.left + rect.width/2 + jitterPct) + 'px';
      dmgDiv.style.top = (rect.top - gridRect.top) + 'px';
      document.getElementById('grid').appendChild(dmgDiv);
    } else {
      dmgDiv.style.left = 'calc(50% + ' + jitterPct + 'px)';
      cell.appendChild(dmgDiv);
    }
    (function(div) { setTimeout(function(){ div.remove(); }, 1150); })(dmgDiv);
  }
  pendingDamageTexts = [];
}

function queueComboTextAt(r, c, comboCount) {
  pendingComboText = { r: r, c: c, text: 'COMBO x' + comboCount + '!' };
}

function flushComboText() {
  if (!pendingComboText) return;
  var cell = cellElAt(pendingComboText.r, pendingComboText.c);
  if (cell) {
    var wrap = document.createElement('div');
    wrap.className = 'combo-indicator';
    var span = document.createElement('span');
    span.textContent = pendingComboText.text;
    wrap.appendChild(span);
    cell.appendChild(wrap);
    (function(el) { setTimeout(function(){ el.remove(); }, 1350); })(wrap);
  }
  pendingComboText = null;
}

function animateDeathAt(r, c, colorHex) {
  var cell = cellElAt(r, c);
  if (!cell) return;
  var burst = document.createElement('div');
  burst.className = 'particle-burst';
  for (var i=0; i<10; i++) {
    var p = document.createElement('div');
    p.className = 'particle';
    var angle = (i / 10) * Math.PI * 2 + Math.random()*0.4;
    var dist = 18 + Math.random()*14;
    p.style.setProperty('--px', Math.cos(angle)*dist + 'px');
    p.style.setProperty('--py', Math.sin(angle)*dist + 'px');
    p.style.background = colorHex || '#ffce4a';
    burst.appendChild(p);
  }
  cell.appendChild(burst);
  setTimeout(function(){ burst.remove(); }, 550);
}

function animateExplosionAt(r, c, blastCells) {
  var metrics = getGridMetrics();
  if (!metrics) return;
  var gridEl = metrics.gridEl, cellSize = metrics.cellSize, gapPx = metrics.gapPx, stride = metrics.stride;
  var firstCell = gridEl.querySelector('.cell');
  if (!firstCell) return;
  var firstCellRect = firstCell.getBoundingClientRect();
  var gridRect = gridEl.getBoundingClientRect();
  var baseTop = firstCellRect.top - gridRect.top;
  var baseLeft = firstCellRect.left - gridRect.left;

  // blastCells (NEW optional param): when provided (cross/diag bombs,
  // or any future non-square pattern), draw one circle overlay per
  // cell in the list, plus the bomb's own origin cell, instead of
  // assuming a 3x3 square. When omitted, falls back to the original
  // 3x3-square behavior (used by Golem's explosion, which has no
  // variant concept).
  if (blastCells) {
    var allCells = blastCells.concat([[r,c]]);
    allCells.forEach(function(p) {
      var rr = p[0], cc = p[1];
      if (rr < 0 || rr >= state.rows || cc < 0 || cc >= state.cols) return;
      var overlay = document.createElement('div');
      overlay.className = 'explosion-overlay';
      overlay.style.top = (baseTop + rr*stride) + 'px';
      overlay.style.left = (baseLeft + cc*stride) + 'px';
      overlay.style.width = cellSize + 'px';
      overlay.style.height = cellSize + 'px';
      overlay.innerHTML = '<div class="explosion-flash"></div>' + ((rr===r && cc===c) ? '<div class="explosion-ring"></div>' : '');
      gridEl.appendChild(overlay);
      (function(ov) { setTimeout(function(){ ov.remove(); }, 550); })(overlay);
    });
    return;
  }

  var rowStart = r - 1, colStart = c - 1;
  var wraps = rowStart < 0 || rowStart + 3 > state.rows || colStart < 0 || colStart + 3 > state.cols;
  var overlay;
  if (!wraps) {
    overlay = document.createElement('div');
    overlay.className = 'explosion-overlay';
    overlay.style.top = (baseTop + rowStart*stride) + 'px';
    overlay.style.left = (baseLeft + colStart*stride) + 'px';
    overlay.style.width = (3*cellSize + 2*gapPx) + 'px';
    overlay.style.height = (3*cellSize + 2*gapPx) + 'px';
    overlay.innerHTML = '<div class="explosion-flash"></div><div class="explosion-ring"></div>';
    gridEl.appendChild(overlay);
    setTimeout(function(){ overlay.remove(); }, 550);
    return;
  }
  for (var dr=-1; dr<=1; dr++) {
    for (var dc=-1; dc<=1; dc++) {
      var rrw = r+dr, ccw = c+dc;
      if (rrw < 0 || rrw >= state.rows || ccw < 0 || ccw >= state.cols) continue;
      overlay = document.createElement('div');
      overlay.className = 'explosion-overlay';
      overlay.style.top = (baseTop + rrw*stride) + 'px';
      overlay.style.left = (baseLeft + ccw*stride) + 'px';
      overlay.style.width = cellSize + 'px';
      overlay.style.height = cellSize + 'px';
      overlay.innerHTML = '<div class="explosion-flash"></div>' + (dr===0 && dc===0 ? '<div class="explosion-ring"></div>' : '');
      gridEl.appendChild(overlay);
      (function(ov) { setTimeout(function(){ ov.remove(); }, 550); })(overlay);
    }
  }
}

function animateMoveLeap(fr, fc, tr, tc, isMultiCell, enemySize, forceDirect) {
  var metrics = getGridMetrics();
  if (!metrics) return false;
  var stride = metrics.stride;
  var sprites = [];
  if (isMultiCell) {
    var gridEl = metrics.gridEl;
    var firstCell = gridEl.querySelector('.cell');
    if (!firstCell) return false;
    var firstCellRect = firstCell.getBoundingClientRect();
    var gridRect = gridEl.getBoundingClientRect();
    var baseTop = firstCellRect.top - gridRect.top;
    var baseLeft = firstCellRect.left - gridRect.left;
    var size = enemySize || 2;
    var footprintCells = [];
    for (var i=0; i<size; i++) {
      for (var j=0; j<size; j++) {
        footprintCells.push([(fr+i)%state.rows, (fc+j)%state.cols]);
      }
    }
    var targetPositions = {};
    for (var fi=0; fi<footprintCells.length; fi++) {
      var rr = footprintCells[fi][0], cc = footprintCells[fi][1];
      targetPositions[Math.round(baseTop + rr*stride) + '_' + Math.round(baseLeft + cc*stride)] = true;
    }
    var blocks = gridEl.querySelectorAll('.enemy-block');
    for (var bi=0; bi<blocks.length; bi++) {
      var b = blocks[bi];
      var bTop = Math.round(parseFloat(b.style.top));
      var bLeft = Math.round(parseFloat(b.style.left));
      if (targetPositions[bTop + '_' + bLeft]) sprites.push(b);
    }
  } else {
    var fromCell = cellElAt(fr, fc);
    if (fromCell) {
      var s = fromCell.querySelector('.enemy');
      if (s) sprites = [s];
    }
  }
  if (sprites.length === 0) return false;

  var rawDr = tr - fr, rawDc = tc - fc;
  var rowWrapped = !forceDirect && Math.abs(rawDr) > state.rows / 2;
  var colWrapped = !forceDirect && Math.abs(rawDc) > state.cols / 2;

  var k;
  if (!rowWrapped && !colWrapped) {
    for (k=0;k<sprites.length;k++) {
      sprites[k].style.setProperty('--leap-x', (rawDc * stride) + 'px');
      sprites[k].style.setProperty('--leap-y', (rawDr * stride) + 'px');
      sprites[k].classList.add('leap-anim');
    }
    return false;
  }
  var edgeDr = rowWrapped ? (rawDr > 0 ? -1 : 1) * stride * 0.6 : rawDr * stride;
  var edgeDc = colWrapped ? (rawDc > 0 ? -1 : 1) * stride * 0.6 : rawDc * stride;
  for (k=0;k<sprites.length;k++) {
    sprites[k].style.setProperty('--leap-x', edgeDc + 'px');
    sprites[k].style.setProperty('--leap-y', edgeDr + 'px');
    sprites[k].classList.add('teleport-out-anim');
  }
  return true;
}

function playTeleportIn(tr, tc, isMultiCell, enemySize) {
  if (isMultiCell) {
    var metrics = getGridMetrics();
    if (!metrics) return;
    var gridEl = metrics.gridEl;
    var firstCell = gridEl.querySelector('.cell');
    if (!firstCell) return;
    var firstCellRect = firstCell.getBoundingClientRect();
    var gridRect = gridEl.getBoundingClientRect();
    var baseTop = firstCellRect.top - gridRect.top;
    var baseLeft = firstCellRect.left - gridRect.left;
    var size = enemySize || 2;
    var footprintCells = [];
    for (var i=0; i<size; i++) {
      for (var j=0; j<size; j++) {
        footprintCells.push([(tr+i)%state.rows, (tc+j)%state.cols]);
      }
    }
    var targetPositions = {};
    for (var fi=0; fi<footprintCells.length; fi++) {
      var rr = footprintCells[fi][0], cc = footprintCells[fi][1];
      targetPositions[Math.round(baseTop + rr*metrics.stride) + '_' + Math.round(baseLeft + cc*metrics.stride)] = true;
    }
    var blocks = gridEl.querySelectorAll('.enemy-block');
    for (var bi=0; bi<blocks.length; bi++) {
      var b = blocks[bi];
      var bTop = Math.round(parseFloat(b.style.top));
      var bLeft = Math.round(parseFloat(b.style.left));
      if (targetPositions[bTop + '_' + bLeft]) b.classList.add('teleport-in-anim');
    }
    return;
  }
  var destCell = cellElAt(tr, tc);
  var destSprite = destCell ? destCell.querySelector('.enemy') : null;
  if (destSprite) destSprite.classList.add('teleport-in-anim');
}

function enemyAnchorEl(en) {
  if (!en || !en.anchor) return null;
  return cellElAt(en.anchor[0], en.anchor[1]);
}

// Document-relative center point of either a plain DOM element
// or an enemy object (handling multi-cell and stretched-rolly
// geometry). Used by animateSparkle/animateShield below, and by
// playCastThreadAnimation (mage-enemy-rendering.js) and
// drawMageLinks (ability-disabling-rendering.js) to find a
// caster's/target's on-screen point.
function resolveCastPoint(target) {
  var scrollX = window.scrollX || window.pageXOffset || 0;
  var scrollY = window.scrollY || window.pageYOffset || 0;

  if (target instanceof Element) {
    var rect = target.getBoundingClientRect();
    return [rect.left + rect.width/2 + scrollX, rect.top + rect.height/2 + scrollY];
  }

  var en = target;
  if (!en || !en.anchor) return null;
  var ar = en.anchor[0], ac = en.anchor[1];
  var size = (en.size && en.size[0]) || 1;
  var anchorCell = cellElAt(ar, ac);
  if (!anchorCell) return null;
  var anchorRect = anchorCell.getBoundingClientRect();
  var anchorCenter = [anchorRect.left + anchorRect.width/2 + scrollX, anchorRect.top + anchorRect.height/2 + scrollY];

  var rollySpan = nonSquareFootprintSpan(en);
  if (rollySpan) {
    if (enemyWraps(en)) return anchorCenter;
    var midR = rollySpan.axis === 'col' ? ar + (rollySpan.after - rollySpan.before) / 2 : ar;
    var midC = rollySpan.axis === 'row' ? ac + (rollySpan.after - rollySpan.before) / 2 : ac;
    var midCell = cellElAt(Math.round(midR), Math.round(midC));
    if (!midCell) return anchorCenter;
    var midRect = midCell.getBoundingClientRect();
    return [midRect.left + midRect.width/2 + scrollX, midRect.top + midRect.height/2 + scrollY];
  }

  if (size <= 1 || enemyWraps(en)) {
    return anchorCenter;
  }

  var farCell = cellElAt(ar + size - 1, ac + size - 1);
  if (!farCell) {
    return anchorCenter;
  }
  var farRect = farCell.getBoundingClientRect();
  var x = (anchorRect.left + farRect.left + farRect.width) / 2 + scrollX;
  var y = (anchorRect.top + farRect.top + farRect.height) / 2 + scrollY;
  return [x, y];
}

function animateSparkle(en) {
  var p = resolveCastPoint(en);
  if (!p) return;
  for (var i=0; i<6; i++) {
    var particle = document.createElement('div');
    particle.className = 'sparkle-particle';
    var angle = (i / 6) * Math.PI * 2 + Math.random()*0.4;
    var dist = 14 + Math.random()*10;
    particle.style.position = 'fixed';
    particle.style.left = (p[0] - (window.scrollX||0)) + 'px';
    particle.style.top = (p[1] - (window.scrollY||0)) + 'px';
    particle.style.setProperty('--sx', Math.cos(angle)*dist + 'px');
    particle.style.setProperty('--sy', Math.sin(angle)*dist + 'px');
    document.body.appendChild(particle);
    (function(el) { setTimeout(function(){ el.remove(); }, 750); })(particle);
  }
}

function animateShield(en) {
  var p = resolveCastPoint(en);
  if (!p) return;
  var shield = document.createElement('div');
  shield.className = 'shield-form';
  shield.style.position = 'fixed';
  shield.style.left = (p[0] - (window.scrollX||0) - 20) + 'px';
  shield.style.top = (p[1] - (window.scrollY||0) - 20) + 'px';
  shield.style.width = '40px';
  shield.style.height = '40px';
  document.body.appendChild(shield);
  setTimeout(function(){ shield.remove(); }, 700);
}

// Animated "cast bolt" that flies from origin to dest and flashes on
// arrival. Used by golem (link reroll), siren (link + curse threads),
// mage (disable-spell cast), and slime (cluster-join visual) — genuinely
// generic across enemy types, not owned by any single one. Depends on
// hexToRgba() (see general-ui-logic.js) and wait() (see
// general-enemy-logic.js).
async function playCastThreadAnimation(origin, dest, color) {
  var p1 = resolveCastPoint(origin);
  if (!p1) return;

  var pulse = document.createElement('div');
  pulse.className = 'mage-cast-pulse';
  pulse.style.position = 'absolute';
  pulse.style.left = p1[0] + 'px';
  pulse.style.top = p1[1] + 'px';
  pulse.style.width = '0';
  pulse.style.height = '0';
  pulse.style.transform = 'translate(-50%, -50%)';
  pulse.style.boxShadow = '0 0 0 0 ' + hexToRgba(color, 0.9);
  document.body.appendChild(pulse);
  await wait(260);

  var p2 = resolveCastPoint(dest);
  if (!p2) {
    setTimeout(function(){ pulse.remove(); }, 600);
    return;
  }

  var bolt = document.createElement('div');
  bolt.className = 'mage-cast-bolt';
  bolt.style.background = 'radial-gradient(circle, #fff 0%, ' + color + ' 50%, ' + hexToRgba(color, 0) + ' 100%)';
  bolt.style.boxShadow = '0 0 8px 3px ' + hexToRgba(color, 0.9);
  bolt.style.left = p1[0] + 'px';
  bolt.style.top = p1[1] + 'px';
  document.body.appendChild(bolt);

  await new Promise(function(resolve) {
    var startTime = performance.now();
    var duration = 320;
    function step(now) {
      var t = Math.min(1, (now - startTime) / duration);
      var ease = t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t+2, 2)/2;
      bolt.style.left = (p1[0] + (p2[0]-p1[0])*ease) + 'px';
      bolt.style.top = (p1[1] + (p2[1]-p1[1])*ease) + 'px';
      if (t < 1) requestAnimationFrame(step);
      else resolve();
    }
    requestAnimationFrame(step);
  });
  bolt.remove();
  pulse.remove();

  var destFlash = document.createElement('div');
  destFlash.className = 'mage-cast-card-flash';
  destFlash.style.position = 'absolute';
  destFlash.style.left = p2[0] + 'px';
  destFlash.style.top = p2[1] + 'px';
  destFlash.style.width = '0';
  destFlash.style.height = '0';
  destFlash.style.transform = 'translate(-50%, -50%)';
  destFlash.style.boxShadow = 'inset 0 0 0 0 ' + hexToRgba(color, 0.9);
  destFlash.style.background = 'radial-gradient(circle, ' + hexToRgba(color, 0.65) + ' 0%, ' + hexToRgba(color, 0) + ' 70%)';
  destFlash.style.borderRadius = '50%';
  document.body.appendChild(destFlash);
  setTimeout(function(){ destFlash.remove(); }, 520);
}

function animateSporeBurstAt(r, c) {
  var cellEl = cellElAt(r, c);
  if (!cellEl) return;
  var burst = document.createElement('div');
  burst.className = 'spore-burst';
  burst.textContent = '💨';
  cellEl.appendChild(burst);
  setTimeout(function(){ burst.remove(); }, 500);
}
