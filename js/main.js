/* ============================================================
   MAIN — ENTRY POINT

   This file must load LAST in index.html — it calls init() at
   the very end, which depends on every other module having
   already defined its functions and registered into the various
   shared registries (ENEMY_CONSTRUCTORS, ATTACK_DEFS, ITEM_DEFS,
   ATTACK_CELL_RESOLVERS, ITEM_EFFECT_RESOLVERS, etc.).
   ============================================================ */

function newRunState() {
  return {
    maxRevertsPerTurn: 3, revertsLeft: 3, shiftHistory: [], enemyPhaseActive: false,
    sirenCursedAttacks: {}, sirenCursedItems: {},
    sporeClouds: {}, nextSporeCloudId: 1, sporeDisabledAttacks: {},
    disabledLines: [],
    lastClickedCell: null, clickCycleIndex: 0,
    score: 0, floor: 1, bonusMax: 100, bonusStep: 20,
    linesShiftedThisTurn: new Set(), rowsTouchedThisTurn: new Set(), colsTouchedThisTurn: new Set(),
    decayStepCounter: 0,
    itemSecondTargetFootprint: [],   // NEW — module-level like itemSecondTarget, not nested under state if itemSecondTarget itself is a top-level loose var (check which pattern itemPreviewCell/itemSecondTarget currently use and match it)
    charges: { axe: 2, sword: 2, hammer: 2, ring: 2, crystal: 2 },
    items: { extraSwing: 2, gravity: 2, expandSoul: 2, teleport: 2, vulnerability: 2 },
    selectedAttack: null, selectedItemUsedThisTurn: false,
    attacksRemainingThisTurn: 1, attackUsedThisTurn: false,
    comboLastKilledType: null, comboCount: 0,
    chargePointsProgress: 0, chargePointThreshold: 100,
    freezeEnemiesNextTurn: false, gameOver: false, gameOverReason: null,
    rows: 5, cols: 5, grid: [], enemies: {}, nextId: 1,
    maxRevertsPerTurn: 3, revertsLeft: 3, shiftHistory: [], enemyPhaseActive: false,
    sirenCursedAttacks: {}, sirenCursedItems: {}
  };
}

async function init() {
  state = newRunState();
  state.enemyPhaseActive = true;
  await animateFloorSetup(1);   // CHANGED — removed the render() call that used to sit on the line above this; animateFloorSetup() already renders immediately after it builds state.grid correctly, so calling render() before it ran was the bug
  state.enemyPhaseActive = false;
  render();
}

init();