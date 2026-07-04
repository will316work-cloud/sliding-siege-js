/* ============================================================
   MAGE — LOGIC

   Wrapped in an IIFE for the same reason as standard-enemy-logic.js
   — see its header comment.

   rerollMageDisablesSequenced() writes en.disabledAttackKey,
   which ability-disabling-logic.js's getDisabledAttackKeys()
   reads from — this file owns the write side, ability-disabling-
   logic.js owns the shared read/query side (alongside Siren's
   curse maps).
   ============================================================ */

(function() {
  var labelName = "Mage";
  var description = "Casts a disabling spell on any of your available attacks, that lasts for 1 turn, which can be broken if killed.";
  var baseHealth = 25;
  var baseSize = [1, 1];

  ENEMY_CONSTRUCTORS.mage = function(hp) {
    return {
      hp: hp == null ? baseHealth : hp,
      label: labelName,
      baseSize: baseSize
    };
  };
  ENEMY_CONSTRUCTORS.mage.baseHealth = baseHealth;
  ENEMY_CONSTRUCTORS.mage.label = labelName;
  ENEMY_CONSTRUCTORS.mage.description = description;
})();

async function rerollMageDisablesSequenced() {
  var mages = Object.values(state.enemies).filter(function(en) { return en.type === 'mage'; });
  if (mages.length === 0) {
    return;
  }
  var availableKeys = Object.keys(ATTACK_DEFS).filter(function(k) {
    return debugInfiniteAttacks || (state.charges[k] || 0) > 0;
  });
  if (availableKeys.length === 0) {
    mages.forEach(function(mage) { mage.disabledAttackKey = null; });
    return;
  }
  for (var mi=0; mi<mages.length; mi++) {
    var mage = mages[mi];
    if (!state.enemies[mage.id]) continue;
    var key = availableKeys[Math.floor(Math.random()*availableKeys.length)];
    mage.disabledAttackKey = key;
    log('🔮 A Mage casts a disabling spell on ' + ATTACK_DEFS[key].name + '!');
    render();
    await playMageCastAnimation(mage, key);
    await wait(150);
  }
}

async function moveMageMultiStep(mage) {
  var directions = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
  for (var step=0; step<3; step++) {
    if (!state.enemies[mage.id]) return;
    if (Math.random() < 0.55) continue;
    var ar = mage.anchor[0], ac = mage.anchor[1];
    var shuffled = directions.slice().sort(function(){ return Math.random()-0.5; });
    var moved = false, wasWrapped = false, destR, destC;
    for (var di=0; di<shuffled.length; di++) {
      var dr = shuffled[di][0], dc = shuffled[di][1];
      var nr = ((ar+dr)%state.rows+state.rows)%state.rows;
      var nc = ((ac+dc)%state.cols+state.cols)%state.cols;
      if (state.grid[nr][nc]) continue;
      wasWrapped = animateMoveLeap(ar, ac, nr, nc, false);
      destR = nr; destC = nc;
      state.grid[ar][ac] = null;
      state.grid[nr][nc] = mage.id;
      mage.anchor = [nr, nc];
      moved = true;
      break;
    }
    if (!moved) {
      break;
    }
    if (wasWrapped) {
      await wait(300);
      render();
      playTeleportIn(destR, destC, false);
      await wait(150);
    } else {
      await wait(280);
      render();
      await wait(40);
    }
  }
}
