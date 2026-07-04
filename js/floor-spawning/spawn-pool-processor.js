/* ============================================================
   SPAWN POOL PROCESSOR

   Implements the spawn algorithm described in floor-spawn-pool.js's
   header against whichever pool (initialPool or midFloorPool) is
   passed in. Both initial floor setup and mid-floor spawning now
   share this single driver, spawnEnemiesFromPool, with each calling
   it with their own pool from the same floor's FLOOR_SPAWN_POOLS
   entry.

   Depends on: makeEnemy() (see general-enemy-logic.js),
   chooseSlimeClusterAssignment() (see slime-enemy-logic.js),
   getSpawnPoolEntryForFloor() (see floor-spawn-pool.js).
   ============================================================ */

function aliveCountForDimension(dimension) {
  var count = 0;
  Object.values(state.enemies).forEach(function(en) {
    if (dimensionKeyForSize(en.size) === dimension) count++;
  });
  return count;
}

function dimensionKeyForSize(size) {
  return size[0] + 'x' + size[1];
}

function aliveCountForType(type) {
  var count = 0;
  Object.values(state.enemies).forEach(function(en) { if (en.type === type) count++; });
  return count;
}

function findValidPositionsForDimension(dimension) {
  var parts = dimension.split('x');
  var w = parseInt(parts[0], 10), h = parseInt(parts[1], 10);
  var valid = [];
  for (var r=0; r<state.rows; r++) {
    for (var c=0; c<state.cols; c++) {
      var fits = true;
      for (var i=0; i<h && fits; i++) {
        for (var j=0; j<w && fits; j++) {
          var rr = (r+i) % state.rows, cc = (c+j) % state.cols;
          if (cellHasNonTransparentOccupant(rr, cc)) fits = false;
        }
      }
      if (fits) valid.push([r,c]);
    }
  }
  return valid;
}

// Walks an ordered {counts, chance} list, chaining rolls until one
// succeeds (returns a uniformly-picked value from its counts list) or
// every entry is exhausted (returns 0).
function rollChainedCount(chanceList) {
  for (var i=0; i<chanceList.length; i++) {
    var entry = chanceList[i];
    if (Math.random() < entry.chance) {
      return entry.counts[Math.floor(Math.random()*entry.counts.length)];
    }
  }
  return 0;
}

// Walks dimensionChances for one spawn slot. Returns
// { dimension, position, isTransparent } or null if every entry
// (including the 1x1 hard-fallback) fails.
function rollDimensionAndPosition(pool, floorEntry) {
  var maxSizeTypeCounts = floorEntry.maxSizeTypeCounts || {};

  function attemptDimension(dimension, chance) {
    var cap = maxSizeTypeCounts[dimension] != null ? maxSizeTypeCounts[dimension] : Infinity;
    if (aliveCountForDimension(dimension) >= cap) return null;

    var isTransparent = Math.random() < (pool.transparentChance || 0);
    var position;
    if (isTransparent) {
      var r = Math.floor(Math.random()*state.rows);
      var c = Math.floor(Math.random()*state.cols);
      position = [r,c];
    } else {
      var validPositions = findValidPositionsForDimension(dimension);
      if (validPositions.length === 0) return null;
      position = validPositions[Math.floor(Math.random()*validPositions.length)];
    }

    if (Math.random() < chance) {
      return { dimension: dimension, position: position, isTransparent: isTransparent };
    }
    return null;
  }

  for (var i=0; i<pool.dimensionChances.length; i++) {
    var entry = pool.dimensionChances[i];
    var result = attemptDimension(entry.dimension, entry.chance);
    if (result) return result;
  }

  // Hard fallback to 1x1 — still gets its own transparency roll/position
  // check, just no chance-of-failure gate (always "rolls true" once we
  // reach this fallback, matching every other attempt's mechanics minus
  // the chance gate itself).
  var fallbackResult = attemptDimension('1x1', 1.0);
  return fallbackResult;
}

// Walks the dimension's type-weight list (normal or transparent variant)
// for one locked-in spawn slot. Returns a type string, or null if even
// the dimension's default type is capped.
function pickEnemyType(pool, dimension, isTransparent, floorEntry) {
  var typeCaps = floorEntry.typeCaps || {};
  var list = (isTransparent ? pool.typeWeightsByDimensionTransparent[dimension] : pool.typeWeightsByDimension[dimension]) || [];

  for (var i=0; i<list.length; i++) {
    var type = list[i][0], chance = list[i][1];
    var cap = typeCaps[type] != null ? typeCaps[type] : Infinity;
    if (aliveCountForType(type) >= cap) continue;
    if (Math.random() < chance) return type;
  }

  var defaultType = pool.defaultTypeByDimension[dimension];
  if (!defaultType) return null;
  var defaultCap = typeCaps[defaultType] != null ? typeCaps[defaultType] : Infinity;
  if (aliveCountForType(defaultType) >= defaultCap) return null;
  return defaultType;
}

function buildSpawnEnemy(type, floorNum) {
  var enemy = makeEnemy(type, scaledEnemyHp(type, floorNum));
  enemy.pendingSpawn = true;   // NEW
  if (type === 'slime') chooseSlimeClusterAssignment(enemy);
  return enemy;
}

// Unified spawn driver. Rolls a spawn count from pool, then resolves
// each slot independently (fresh dimension+position+type every time),
// placing enemies onto the live state.grid as it goes (so later slots
// in the same call see earlier slots' occupancy). Returns the list of
// { enemy, position } placed, in placement order, for callers that want
// to animate/log each spawn sequentially.
function spawnEnemiesFromPool(pool, floorEntry, floorNum) {
  var placed = [];
  var count = rollChainedCount(pool.randomSpawnCountChances);
  for (var i=0; i<count; i++) {
    var slot = rollDimensionAndPosition(pool, floorEntry);
    if (!slot) continue;
    var type = pickEnemyType(pool, slot.dimension, slot.isTransparent, floorEntry);
    if (!type) continue;
    var enemy = buildSpawnEnemy(type, floorNum);
    placeEnemyAt(slot.position[0], slot.position[1], enemy);
    placed.push({ enemy: enemy, position: slot.position });
  }
  return placed;
}

function generateFloor(floorNum) {
  var dims = getGridDimensionsForFloor(floorNum);   // CHANGED — was the hardcoded sizes/pick lookup
  state.rows = dims.rows; state.cols = dims.cols;     // CHANGED
  state.grid = emptyGrid(state.rows, state.cols);
  state.enemies = {};

  var floorEntry = getSpawnPoolEntryForFloor(floorNum);
  if (floorEntry) {
    spawnEnemiesFromPool(floorEntry.initialPool, floorEntry, floorNum);
  }
  log('Floor ' + floorNum + ': ' + state.rows + 'x' + state.cols + ' grid, ' + Object.keys(state.enemies).length + ' enemies.');
}

async function animateFloorSetup(floorNum) {
  var dims = getGridDimensionsForFloor(floorNum);   // CHANGED — was the hardcoded sizes/pick lookup
  state.rows = dims.rows; state.cols = dims.cols;     // CHANGED
  state.grid = emptyGrid(state.rows, state.cols);
  state.enemies = {};
  render();

  var floorEntry = getSpawnPoolEntryForFloor(floorNum);
  var placedList = floorEntry ? spawnEnemiesFromPool(floorEntry.initialPool, floorEntry, floorNum) : [];

  for (var pi = 0; pi < placedList.length; pi++) {
    var item = placedList[pi];
    item.enemy.pendingSpawn = false;   // NEW — reveal just this one
    log((pi === 0 ? 'Floor ' + floorNum + ' begins! ' : '') + 'A ' + item.enemy.label.toLowerCase() + ' appears!');
    render();
    animateSpawnAt(item.position[0], item.position[1]);
    await wait(SUBSTEP_DELAY);
    if (item.enemy.type === 'slime') await animateSlimeClusterJoin(item.enemy);
  }

  await wait(STEP_DELAY);
  await animateAndRerollGolemLinks();
  render();
  await animateAndRelinkUnlinkedSirens();
  render();

  await wait(STEP_DELAY);
  await resolveSirenSongsAndShrieks();
  render();

  await wait(STEP_DELAY);
  await rerollMageDisablesSequenced();
  render();

  await wait(STEP_DELAY);
  await moveEnemiesOneStepSequenced();
  pickNextShapesForAllSprites();
  render();

  log('Floor ' + floorNum + ': ' + state.rows + 'x' + state.cols + ' grid, ' + Object.keys(state.enemies).length + ' enemies.');   // CHANGED — was `rows`/`cols`, undefined identifiers left over from before the getGridDimensionsForFloor refactor
}

async function spawnNewEnemiesSequenced() {
  var floorEntry = getSpawnPoolEntryForFloor(state.floor);
  if (!floorEntry) return;
  var placedList = spawnEnemiesFromPool(floorEntry.midFloorPool, floorEntry, state.floor);
  for (var i=0; i<placedList.length; i++) {
    var item = placedList[i];
    item.enemy.pendingSpawn = false;   // NEW
    log('A new ' + item.enemy.label.toLowerCase() + ' emerges from the shadows!');
    render();
    animateSpawnAt(item.position[0], item.position[1]);
    await wait(SUBSTEP_DELAY);
    if (item.enemy.type === 'slime') await animateSlimeClusterJoin(item.enemy);
  }
}
