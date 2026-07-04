/* ============================================================
   TURN LOGIC

   finishTurn()'s enemy phase is data-driven: ENEMY_PHASE_STEPS is
   an ordered list where each entry is run as
   "wait(STEP_DELAY) -> await entry.run() -> [entry.companion()] ->
   render() -> [check entry.checkEarlyExit(), maybe exit]" — every
   entry follows this exact same shape, including tickSirenCurses
   (which in the original source ran with no wait/render of its
   own; per agreement, it now gets the same treatment as every
   other step, which adds one extra short delay/render at the very
   start of the enemy phase that didn't exist before — a deliberate
   change, not an oversight).

   Two entries carry extra behavior as properties rather than as
   separate list entries, since they're companions to (not
   independent steps of) the entry they're attached to:
     - companion: a synchronous function that runs immediately
       after entry.run() resolves, before that entry's render().
       (detonatePendingGolemsSequenced -> tickDamageReductions;
       moveEnemiesOneStepSequenced -> pickNextShapesForAllSprites)
     - checkEarlyExit / onEarlyExit: after that entry's render(),
       checkEarlyExit() is called; if it returns true, onEarlyExit
       fires and the whole phase ends immediately. ('shop' opens
       the shop because the board was cleared after resolveSlimes;
       'gameover' shows the game-over screen because
       checkGameOverConditions() returned true after the movement
       step — matching the original's two early-return checks.)

   The two true pre-conditions for running the phase AT ALL — no
   enemies alive, or enemies frozen this turn — are NOT list
   entries; they gate whether the loop runs, not a step within it,
   exactly as in the original source.

   Depends on: gridIsCompletelyOccupied() (see grid-logic.js),
   openShop() (see shop-logic.js), showGameOver() (see
   turn-rendering.js), tickStunDurations() (see stun-logic.js),
   tickSirenCurses()/resolveSirenSongsAndShrieks()/
   animateAndRelinkUnlinkedSirens() (see siren-enemy-logic.js),
   detonateBombsSequenced() (see bomb-enemy-logic.js),
   detonatePendingGolemsSequenced()/animateAndRerollGolemLinks()
   (see golem-enemy-logic.js), tickDamageReductions() (see
   damage-reduction-logic.js), resolveSlimes() (see
   slime-enemy-logic.js), resolveAllSpriteCasts()/
   pickNextShapesForAllSprites() (see sprite-enemy-logic.js),
   resolveGruntDuplication() (see standard-enemy-logic.js),
   shrinkAllRollies() (see rolly-enemy-logic.js — note: this
   function itself is defined there, not here, despite being
   called as part of this file's loop), spawnNewEnemiesSequenced()
   (see spawn-pool-processor.js), rerollMageDisablesSequenced()
   (see mage-enemy-logic.js), moveEnemiesOneStepSequenced() (see
   general-enemy-logic.js), render() (see turn-rendering.js).
   ============================================================ */

function aliveEnemyCount() {
  return Object.keys(state.enemies).length;
}

function noAttackChargesLeft() {
  if (debugInfiniteAttacks) return false;
  var keys = Object.keys(state.charges);
  for (var i=0;i<keys.length;i++) {
    if (state.charges[keys[i]] > 0) return false;
  }
  return true;
}

function checkGameOverConditions() {
  if (state.gameOver) return true;
  if (gridIsCompletelyOccupied()) {
    state.gameOver = true;
    state.gameOverReason = 'The grid is completely full of enemies!';
    return true;
  }
  if (noAttackChargesLeft()) {
    state.gameOver = true;
    state.gameOverReason = "You're out of attack charges with no way to fight back!";
    return true;
  }
  return false;
}

function finishAfterAttack() {
  if (aliveEnemyCount() === 0) { setTimeout(function(){ openShop(); }, 400); return; }
  var anyItemsAvailable = debugInfiniteItems || Object.values(state.items).some(function(c){ return c > 0; });
  var attacksExhausted = !debugInfiniteAttacks && state.attacksRemainingThisTurn <= 0;
  var turnShouldEnd = attacksExhausted && (state.selectedItemUsedThisTurn || !anyItemsAvailable);
  if (turnShouldEnd) setTimeout(function(){ finishTurn(); }, 500);
  else toast(!attacksExhausted
    ? ('Attack used — ' + (debugInfiniteAttacks ? '∞' : state.attacksRemainingThisTurn) + ' attack(s) left this turn!')
    : 'Attack used — use an item (or Skip Turn) to end your turn.');
}

function tickStatusEffectsAndStartNewTurn() {
  state.linesShiftedThisTurn = new Set();
  state.rowsTouchedThisTurn = new Set();
  state.colsTouchedThisTurn = new Set();
  state.attacksRemainingThisTurn = 1;
  state.attackUsedThisTurn = false;
  state.selectedItemUsedThisTurn = false;
  state.shiftHistory = [];
  state.revertsLeft = state.maxRevertsPerTurn;
  targetingMode = null; previewTarget = null; selectedItem = null;
  itemTargetingMode = null; itemPreviewCell = null; itemSecondTarget = null;
  hideTipPanel();
  tickStatusEffects();
}

function startNewTurn() {
  tickStatusEffectsAndStartNewTurn();
}

var ENEMY_PHASE_STEPS = [
  { run: tickDisabledLines },
  { run: tickSirenCurses },
  { run: detonateBombsSequenced },
  { run: detonatePendingGolemsSequenced, companion: tickDamageReductions },
  { run: resolveSlimes, checkEarlyExit: function() { return aliveEnemyCount() === 0; }, onEarlyExit: 'shop' },
  { run: resolveAllSpriteCasts },
  { run: resolveGruntDuplication },
  { run: resolveMushySporeSpewsSequenced },
  { run: shrinkAllRollies },
  { run: spawnNewEnemiesSequenced },
  { run: animateAndRerollGolemLinks },
  { run: animateAndRelinkUnlinkedSirens },
  { run: resolveSirenSongsAndShrieks },
  { run: rerollMageDisablesSequenced },
  { run: moveEnemiesOneStepSequenced, companion: pickNextShapesForAllSprites, checkEarlyExit: checkGameOverConditions, onEarlyExit: 'gameover' },
  { run: applyGhostPhantomCurses }
];

async function finishTurn() {
  state.enemyPhaseActive = true;
  render();
  try {
    if (aliveEnemyCount() === 0) {
      await wait(STEP_DELAY);
      state.enemyPhaseActive = false;
      openShop();
      return;
    }
    if (state.freezeEnemiesNextTurn) {
      state.freezeEnemiesNextTurn = false;
      log('❄️ Enemies are frozen and skip their entire phase!');
      await wait(STEP_DELAY);
      state.enemyPhaseActive = false;
      startNewTurn();
      render();
      return;
    }

    for (var i = 0; i < ENEMY_PHASE_STEPS.length; i++) {
      var entry = ENEMY_PHASE_STEPS[i];
      var logCountBefore = logCallCount;   // NEW

      await entry.run();
      if (entry.companion) entry.companion();

      if (logCallCount > logCountBefore) {   // NEW — only pay for delay/render if this step actually did something
        render();
        await wait(STEP_DELAY);              // CHANGED — moved after render and now conditional
      }

      if (entry.checkEarlyExit && entry.checkEarlyExit()) {
        if (entry.onEarlyExit === 'shop') {
          await wait(STEP_DELAY);
          state.enemyPhaseActive = false;
          openShop();
          return;
        }
        if (entry.onEarlyExit === 'gameover') {
          tickStunDurations();
          state.enemyPhaseActive = false;
          render();
          showGameOver();
          return;
        }
      }
    }

    await wait(STEP_DELAY);
    tickStunDurations();
    state.enemyPhaseActive = false;
    startNewTurn();
    render();
  } catch (err) {
    console.error('Enemy phase error:', err);
    log('⚠️ Something went wrong during the enemy phase (' + (err && err.message ? err.message : err) + '). Your turn has been restored.');
    tickStunDurations();
    state.enemyPhaseActive = false;
    startNewTurn();
    render();
  }
}

function skipTurnConfirmed() { log('⏭️ Turn skipped voluntarily.'); finishTurn(); }
