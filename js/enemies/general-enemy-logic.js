/* ============================================================
   GENERAL ENEMY LOGIC

   Owns the registry-based enemy factory and the generic
   per-enemy-phase movement dispatcher. Per-type construction
   data (labelName, description, baseHealth, baseSize, and any
   type-specific extra fields) lives in each specific-enemy-logic
   file (standard/slime/bomb/rolly/golem/siren/mage/sprite),
   which registers itself into ENEMY_CONSTRUCTORS below. This
   file never hardcodes per-type data itself, so adding a new
   enemy type never requires editing this file.

   Depends on: isStunned() (see stun-logic.js), moveMageMultiStep()
   (see mage-enemy-logic.js), moveAndEnlargeRolly() (see
   rolly-enemy-logic.js), moveSpriteUpToDistance() (see
   sprite-enemy-logic.js), animateMoveLeap()/playTeleportIn() (see
   animation-rendering.js), render() (see turn-rendering.js). These
   are called, not defined, here.
   ============================================================ */

// Populated by each specific-enemy-logic file:
//   ENEMY_CONSTRUCTORS[type] = function(hp) { ...returns a partial
//     enemy object using this file's own local labelName/description/
//     baseHealth/baseSize variables, plus any type-specific extra
//     fields (e.g. bomb's variant, rolly's stretch fields, siren's
//     linkedIds)... };
//   ENEMY_CONSTRUCTORS[type].label = labelName;
//   ENEMY_CONSTRUCTORS[type].description = description;
//   ENEMY_CONSTRUCTORS[type].baseHealth = baseHealth;
//   (all three read via getEnemyLabel/getEnemyDescription/getEnemyBaseHealth
//   below, without this file needing to know any type's actual values)
var ENEMY_CONSTRUCTORS = {};

function wait(ms) {
  return new Promise(function(resolve) {
    setTimeout(resolve, ms);
  });
}

// Accessors over ENEMY_CONSTRUCTORS' per-type metadata. Each specific-
// enemy-logic file sets ENEMY_CONSTRUCTORS[type].label/description/
// baseHealth right alongside registering its constructor — these three
// functions are the single shared read path other files should use
// instead of reaching into the registry directly.
function getEnemyLabel(type) {
  var constructor = ENEMY_CONSTRUCTORS[type];
  return constructor ? constructor.label : null;
}

function getEnemyDescription(type) {
  var constructor = ENEMY_CONSTRUCTORS[type];
  return constructor ? constructor.description : null;
}

function getEnemyBaseHealth(type) {
  var constructor = ENEMY_CONSTRUCTORS[type];
  return constructor ? constructor.baseHealth : null;
}

// baseHealth is read via getEnemyBaseHealth() above, sourced from
// whichever specific-enemy file registered this type's constructor.
// No per-type special cases here — every enemy type, golem included,
// scales the same way going forward.
function scaledEnemyHp(type, floorNum) {
  var baseHealth = getEnemyBaseHealth(type);
  if (baseHealth == null) return null;
  return baseHealth + Math.floor((floorNum - 1) * 2.5);
}

// Thin dispatcher: looks up the registered constructor for `type`,
// lets it build the type-specific partial object, then attaches the
// fields every enemy needs regardless of type. `size` is initialized
// as a fresh copy of whatever baseSize the constructor provided, since
// size is a per-instance runtime value that can change during gameplay
// (e.g. Rolly Polly stretching) while baseSize stays the type's
// constant reset value.
function makeEnemy(type, hp) {
  var id = state.nextId++;
  var constructor = ENEMY_CONSTRUCTORS[type];
  var partial = constructor(hp);
  var enemy = {
    id: id,
    type: type,
    hp: partial.hp,
    maxHp: partial.hp,
    label: partial.label,
    baseSize: partial.baseSize,
    size: partial.baseSize.slice()
  };
  Object.keys(partial).forEach(function(key) {
    if (key === 'hp' || key === 'label' || key === 'baseSize') return;
    enemy[key] = partial[key];
  });
  enemy.pendingSpawn = false;   // CHANGED — moved after enemy is declared/assigned
  return enemy;
}

// Counts how many of a cell's 4 cardinal (non-diagonal) neighbors are
// currently free (or occupied by the enemy itself, via selfId) — used to
// score movement candidates so an enemy prefers landing somewhere with
// more open room around it. Pure grid math, no type-specific behavior.
function countOpenCardinals(r, c, selfId) {
  var dirs = [[-1,0],[1,0],[0,-1],[0,1]];
  var count = 0;
  for (var i=0;i<dirs.length;i++) 
  {
    var rr = r+dirs[i][0], cc = c+dirs[i][1];
    if (rr<0 || rr>=state.rows || cc<0 || cc>=state.cols) 
      continue;

    var blocked = state.grid[rr][cc].some(function(ref) {
      return ref.kind === 'enemy' && ref.id !== selfId;       
    });                                                       
    if (!blocked) 
      count++;                                      
  }
  return count;
}

// Generic "move up to maxDist spaces in one direction, picking the
// destination with the most open cardinal room" capability. Originally
// only used by Sprite, but is fully type-agnostic — any current or future
// enemy type that should be able to move more than 1 space per turn can
// call this directly (e.g. sprite-enemy-logic.js calls
// moveSpriteUpToDistance(sprite, 3)).
async function moveSpriteUpToDistance(en, maxDist) {
  if (Math.random() >= 0.55) return;
  var directions = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
  var ar = en.anchor[0], ac = en.anchor[1];

  var candidates = [];
  for (var di=0; di<directions.length; di++) {
    var dr = directions[di][0], dc = directions[di][1];
    var bestDist = 0, bestR = ar, bestC = ac;
    for (var dist=1; dist<=maxDist; dist++) {
      var checkR = ar + dr*dist, checkC = ac + dc*dist;
      var inBounds = checkR>=0 && checkR<state.rows && checkC>=0 && checkC<state.cols;
      if (!inBounds || state.grid[checkR][checkC]) break;
      bestDist = dist; bestR = checkR; bestC = checkC;
    }
    if (bestDist === 0) continue;
    candidates.push({ destR: bestR, destC: bestC, dist: bestDist, cardinalRoom: countOpenCardinals(bestR, bestC, en.id) });
  }
  if (candidates.length === 0) return;

  var maxRoom = Math.max.apply(null, candidates.map(function(c){ return c.cardinalRoom; }));
  var best = candidates.filter(function(c){ return c.cardinalRoom === maxRoom; });
  var choice = best[Math.floor(Math.random()*best.length)];

  var wasWrapped = animateMoveLeap(ar, ac, choice.destR, choice.destC, false, 1, true);
  state.grid[ar][ac] = null;
  state.grid[choice.destR][choice.destC] = en.id;
  en.anchor = [choice.destR, choice.destC];

  if (wasWrapped) {
    await wait(300); render(); playTeleportIn(choice.destR, choice.destC, false);
    await wait(SUBSTEP_DELAY - 100 > 0 ? SUBSTEP_DELAY - 100 : 100);
  } else {
    await wait(400); render(); await wait(50);
  }
}

// Generic per-enemy-phase movement dispatcher. Branches by en.type
// only to call out to type-specific move functions defined in their
// own files; everything else falls through to a generic random
// one-step move (used by standard/slime/bomb/golem/siren).
async function moveEnemiesOneStepSequenced() {
  var directions = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
  var enemiesArr = Object.values(state.enemies);
  for (var ei=0; ei<enemiesArr.length; ei++) {
    var en = enemiesArr[ei];
    if (!state.enemies[en.id]) continue;
    if (en.pendingDetonation) continue;
    if (isStunned(en)) continue;
    if (isGhostOrPhantom(en)) continue;
    if (en.type === 'mage') {
      await moveMageMultiStep(en);
      continue;
    }
    if (en.type === 'rolly') {
      await moveAndEnlargeRolly(en);
      continue;
    }
    if (en.type === 'sprite') {
      await moveSpriteUpToDistance(en, 3);
      continue;
    }
    if (Math.random() < 0.55) continue;
    var ar = en.anchor[0], ac = en.anchor[1];
    var shuffled = directions.slice().sort(function(){ return Math.random()-0.5; });
    var moved = false, wasWrapped = false, destR, destC;
    for (var di=0; di<shuffled.length; di++) {
      var dr = shuffled[di][0], dc = shuffled[di][1];
      var nr = ((ar+dr)%state.rows+state.rows)%state.rows;
      var nc = ((ac+dc)%state.cols+state.cols)%state.cols;
      if (en.size[0] > 1) {
        var cellsNeeded = [], cellsCurrent = [];
        for (var i=0;i<en.size[0];i++) for (var j=0;j<en.size[1];j++) {
          cellsNeeded.push([(nr+i)%state.rows, (nc+j)%state.cols]);
          cellsCurrent.push([(ar+i)%state.rows, (ac+j)%state.cols]);
        }
        var isOwnCell = (function(cellsCur) {
          return function(rr,cc) {
            for (var oi=0; oi<cellsCur.length; oi++) {
              if (cellsCur[oi][0]===rr && cellsCur[oi][1]===cc) return true;
            }
            return false;
          };
        })(cellsCurrent);
        var allFree = true;
        for (var cn=0; cn<cellsNeeded.length; cn++) {
          var cnr = cellsNeeded[cn][0], cnc = cellsNeeded[cn][1];
          if (cellHasNonTransparentOccupant(cnr,cnc) && !isOwnCell(cnr,cnc)) { allFree = false; break; }
        }
        if (!allFree) continue;
        wasWrapped = animateMoveLeap(ar, ac, nr, nc, true, en.size[0]);
        destR = nr; destC = nc;
        for (var cc4=0; cc4<cellsCurrent.length; cc4++) removeEnemyRefAt(cellsCurrent[cc4][0], cellsCurrent[cc4][1], en.id);
        for (var cn2=0; cn2<cellsNeeded.length; cn2++) addEnemyRefAt(cellsNeeded[cn2][0], cellsNeeded[cn2][1], en.id);
        en.anchor = [nr,nc];
        moved = true; break;
      } else {
        if (cellHasNonTransparentOccupant(nr,nc)) continue;
        wasWrapped = animateMoveLeap(ar, ac, nr, nc, false);
        destR = nr; destC = nc;
        removeEnemyRefAt(ar, ac, en.id); addEnemyRefAt(nr, nc, en.id); en.anchor = [nr,nc];
        moved = true; break;
      }
    }
    if (moved) {
      if (wasWrapped) {
        await wait(300); render(); playTeleportIn(destR, destC, en.size[0] > 1, en.size[0]);
        await wait(SUBSTEP_DELAY - 100 > 0 ? SUBSTEP_DELAY - 100 : 100);
      } else {
        await wait(400); render(); await wait(50);
      }
    }
  }
  await resolveGhostPhantomTeleportsSequenced();
}