/* ============================================================
   SLIME — LOGIC

   Wrapped in an IIFE for the same reason as standard-enemy-logic.js
   — see its header comment.

   Slime cluster coloring has been removed: slimes are always
   green, and clusters are visually defined only by the connected
   "waving string" of green threads drawn in slime-enemy-rendering.js
   (drawSlimeStrands). clusterId (the grouping key) is unaffected
   and still used by chooseSlimeClusterAssignment/resolveSlimes/
   drawSlimeStrands.
   ============================================================ */

(function() {
  var labelName = "Slime";
  var description = "Belongs in linked clusters. Damage to slimes only stick if every slime in its cluster is struck in the same cycle — otherwise the whole cluster heals back to full.";
  var baseHealth = 10;
  var baseSize = [1, 1];

  ENEMY_CONSTRUCTORS.slime = function(hp) {
    return {
      hp: hp == null ? baseHealth : hp,
      label: labelName,
      baseSize: baseSize,
      mustOneShot: true
    };
  };
  ENEMY_CONSTRUCTORS.slime.baseHealth = baseHealth;
  ENEMY_CONSTRUCTORS.slime.label = labelName;
  ENEMY_CONSTRUCTORS.slime.description = description;
})();

function chooseSlimeClusterAssignment(enemy) {
  var existingClusters = Array.from(new Set(Object.values(state.enemies)
    .filter(function(e){ return e.type === 'slime'; })
    .map(function(e){ return e.clusterId; })));

  if (existingClusters.length === 0) {
    enemy.clusterId = -2000 - Math.floor(Math.random()*100000);
    return;
  }

  var winners = [];
  existingClusters.forEach(function(cid) {
    var members = Object.values(state.enemies).filter(function(e){ return e.type === 'slime' && e.clusterId === cid; });
    var size = members.length;
    var joinChance = size < 3 ? 0.75 : (size === 3 ? 0.40 : 0);
    var passed = joinChance > 0 && Math.random() < joinChance;
    if (passed) winners.push(cid);
  });

  if (winners.length > 0) {
    var chosenCid = winners[Math.floor(Math.random()*winners.length)];
    enemy.clusterId = chosenCid;
    return;
  }

  enemy.clusterId = -2000 - Math.floor(Math.random()*100000);
}

async function resolveSlimes() {
  var slimes = Object.values(state.enemies).filter(function(en){ return en.type === 'slime'; });
  if (slimes.length === 0) {
    return;
  }
  var clusterIdSet = {};
  slimes.forEach(function(s){ clusterIdSet[s.clusterId] = true; });
  var clusterIds = Object.keys(clusterIdSet);
  var deathAnimCells = [];
  clusterIds.forEach(function(cid) {
    var clusterSlimes = slimes.filter(function(s){ return String(s.clusterId) === String(cid); });
    var anyHit = clusterSlimes.some(function(s){ return s.pendingHitThisCycle; });
    if (!anyHit) return;
    var allHit = clusterSlimes.every(function(s){ return s.pendingHitThisCycle; });
    if (!allHit) {
      clusterSlimes.forEach(function(s) { if (s.pendingHitThisCycle) { s.hp = s.maxHp; animateSparkle(s); } s.pendingHitThisCycle = false; });
      log('🟢 A slime cluster regenerates! Not every member was struck.');
    } else {
      clusterSlimes.forEach(function(s) { s.pendingHitThisCycle = false; });
      clusterSlimes.forEach(function(s) {
        if (s.hp <= 0) {
          deathAnimCells.push([s.anchor[0], s.anchor[1], enemyColorHex(s)]);
          delete state.enemies[s.id];
          for (var rr=0; rr<state.rows; rr++) for (var cc=0; cc<state.cols; cc++) if (state.grid[rr][cc] === s.id) state.grid[rr][cc] = null;
          addScore(25);
          addChargePoints(25);
          log(s.label + ' defeated! +25 score');
          checkSirenStunOnDeath(s.id);
        }
      });
      log('🟢 An entire slime cluster was struck — damage holds!');
    }
  });
  if (deathAnimCells.length > 0) {
    deathAnimCells.forEach(function(p){ animateDeathAt(p[0], p[1], p[2]); });
    await wait(280);
  }
}
