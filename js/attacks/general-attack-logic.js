/* ============================================================
   GENERAL ATTACK LOGIC

   ATTACK_CELL_RESOLVERS is a registry, mirroring the
   ENEMY_CONSTRUCTORS pattern from general-enemy-logic.js. Each
   specific-attack-logic file (axe/sword/hammer/ring/crystal)
   registers its own ATTACK_CELL_RESOLVERS[key] = function(r, c,
   variant) {...}, returning the array of [row,col] cells that
   attack hits. getAttackCells() below is a thin dispatcher, so
   adding a 6th attack later never requires editing this file.

   resolveAttack() depends on: isVulnerable()/vulnerabilityMultiplier()
   (see vulnerability-logic.js), hasSoulCloud()/getSoulCloudExpandedCells()
   (see soul-cloud-logic.js), damageReductionMultiplier() (see
   damage-reduction-logic.js), currentBonusPct() (see damage-bonus-logic.js),
   findLinkingGolemFor() (see golem-enemy-logic.js), isSiren()/
   clearSirenCurse()/checkSirenStunOnDeath() (see siren-enemy-logic.js),
   enemyColorHex() (see general-ui-rendering.js), addChargePoints()
   (see points-logic.js), checkGameOverConditions()/finishAfterAttack()
   (see turn-logic.js), showGameOver() (see general-ui-rendering.js /
   turn-rendering.js), animateDeathAt()/animateExplosionAt()/
   queueDamageTextAt()/queueComboTextAt() (see animation-rendering.js).
   ============================================================ */

// Populated by each specific-attack-logic file:
//   ATTACK_DEFS[key] = { name, icon, baseDmg, variants, defaultVariant, desc }
// (mirrors the ENEMY_CONSTRUCTORS pattern). ATTACK_DEFS itself must stay a
// single shared, mutable object — it's read by key from many other files
// (mage curse, siren shriek, tip panel, attack list rendering, shop
// restock/upgrade) and the shop's upgrade reward directly mutates
// ATTACK_DEFS[key].baseDmg at runtime, so this can't be decentralized
// away into per-file constants.

var ATTACK_DEFS = {};
var ATTACK_CELL_RESOLVERS = {};

function getAttackCells(key, r, c, variant) {
  var resolver = ATTACK_CELL_RESOLVERS[key];
  if (!resolver) return [];
  return resolver(r, c, variant);
}

function resolveAttack(target, multiplier, wasGood) {
  if (!debugInfiniteAttacks && state.attacksRemainingThisTurn <= 0) return;
  if (!debugInfiniteAttacks) state.attacksRemainingThisTurn--;
  state.attackUsedThisTurn = true;

  var attack = target.attack, r = target.r, c = target.c, variant = target.variant;
  var def = ATTACK_DEFS[attack];
  var cells = getAttackCells(attack, r, c, variant);
  var bonusPct = currentBonusPct();
  var dmgBase = Math.round(def.baseDmg * multiplier * (1 + bonusPct/100));

  var cellSet = {};
  cells.forEach(function(p){ cellSet[p[0]+'_'+p[1]] = true; });

  var hitIds = new Set();
  cells.forEach(function(p) {
    enemiesAtCell(p[0], p[1]).forEach(function(en) { hitIds.add(en.id); });
  });

  Object.values(state.enemies).forEach(function(en) {
    if (!hasSoulCloud(en)) return;
    if (hitIds.has(en.id)) return;
    var expanded = getSoulCloudExpandedCells(en);
    var haloHit = expanded.halo.some(function(p) { return cellSet[p[0]+'_'+p[1]]; });
    if (haloHit) hitIds.add(en.id);
  });

  if (hitIds.size === 0) toast('No targets hit!');
  else toast(wasGood ? ('Nice hit! x' + multiplier.toFixed(1)) : ('Glancing hit x' + multiplier.toFixed(1)));

  var killedTypes = [];
  var deathAnimCells = [];
  var explosionCells = [];

  var bombIdsHit = Array.from(hitIds).filter(function(id){ return state.enemies[id] && state.enemies[id].type === 'bomb'; });
  var attackVoidedByBomb = bombIdsHit.length > 0;

  // Spore cloud destruction-and-disable — skipped ENTIRELY (for every
  // cell in this attack, not just the bomb's own cell) if any bomb is
  // hit anywhere in the attack, per the agreed bomb-priority rule.
  // Runs BEFORE bomb detonation removes the bomb's grid ref below, so
  // "any bomb-hit cell" is checked against the attack's original hit
  // set either way (order doesn't actually matter here since bombIdsHit
  // was already captured above, but doing this first keeps the
  // sequencing readable: spores resolve, THEN bomb voiding/damage).
  if (!attackVoidedByBomb) {
    var sporeCloudCellsHit = [];
    cells.forEach(function(p) {
      sporeCloudsAtCellRef(p[0], p[1]).forEach(function(cloud) {
        sporeCloudCellsHit.push({ p: p, cloud: cloud });
      });
    });
    if (sporeCloudCellsHit.length > 0) {
      sporeCloudCellsHit.forEach(function(hit) {
        removeSporeCloudRefAt(hit.p[0], hit.p[1], hit.cloud.id);
        delete state.sporeClouds[hit.cloud.id];
        animateSporeBurstAt(hit.p[0], hit.p[1]);
      });
      disableAttackFromSporeCloud(attack);
    }
  }

  bombIdsHit.forEach(function(id) {
    var en = state.enemies[id];
    explosionCells.push([en.anchor[0], en.anchor[1]]);
    delete state.enemies[id];
    for (var rr=0; rr<state.rows; rr++) for (var cc=0; cc<state.cols; cc++) removeEnemyRefAt(rr, cc, id);
  });

  if (attackVoidedByBomb) {
    log('💣 Bomb destroyed by direct hit — the rest of this attack is voided!');
  } else {
    hitIds.forEach(function(id) {
      var en = state.enemies[id];
      if (!en) return;
      var dmgPerHit = Math.round(dmgBase * vulnerabilityMultiplier(en) * damageReductionMultiplier(en));

      var linkingGolem = en.type !== 'golem' ? findLinkingGolemFor(en.id) : null;
      if (linkingGolem) {
        var golemDmg = Math.round(dmgPerHit * vulnerabilityMultiplier(linkingGolem) * damageReductionMultiplier(linkingGolem));
        linkingGolem.hp -= golemDmg;
        queueDamageTextAt(linkingGolem.anchor[0], linkingGolem.anchor[1], golemDmg, linkingGolem.size, false, linkingGolem.id);
        log(en.label + "'s damage is redirected to its linked Golem!");
        if (en.type === 'slime') {
          en.pendingHitThisCycle = true;
        }
        if (linkingGolem.hp <= 0 && !linkingGolem.pendingDetonation) {
          linkingGolem.hp = 0;
          linkingGolem.pendingDetonation = true;
          linkingGolem.linkedIds = [];
          log(linkingGolem.label + ' is critically damaged and will explode next enemy phase!');
        }
        return;
      }

      if (en.type === 'slime') {
        en.hp -= dmgPerHit;
        en.pendingHitThisCycle = true;
        queueDamageTextAt(en.anchor[0], en.anchor[1], dmgPerHit, en.size, false, en.id);
        return;
      }

      en.hp -= dmgPerHit;
      queueDamageTextAt(en.anchor[0], en.anchor[1], dmgPerHit, en.size, false, en.id);

      if (en.type === 'golem') {
        if (en.hp <= 0 && !en.pendingDetonation) {
          en.hp = 0;
          en.pendingDetonation = true;
          en.linkedIds = [];
          log(en.label + ' is critically damaged and will explode next enemy phase!');
        }
        return;
      }

      if (en.hp <= 0) {
        deathAnimCells.push([en.anchor[0], en.anchor[1], enemyColorHex(en)]);
        if (isGhostOrPhantom(en)) removeDisabledLinesFromSource(en.id);
        for (var rr2=0; rr2<state.rows; rr2++) for (var cc2=0; cc2<state.cols; cc2++) removeEnemyRefAt(rr2, cc2, id);
        delete state.enemies[id];
        killedTypes.push(en.type);
        addScore(25);
        addChargePoints(25);
        log(en.label + ' defeated! +25 score');
        if (isSiren(en)) clearSirenCurse(en);
        checkSirenStunOnDeath(id);
      }
    });
  }

  deathAnimCells.forEach(function(p){ animateDeathAt(p[0], p[1], p[2]); });
  explosionCells.forEach(function(p){ animateExplosionAt(p[0], p[1]); });

  if (killedTypes.length > 0) {
    var finalComboCount = 0;
    var anyComboAwarded = false;
    killedTypes.forEach(function(t) {
      if (state.comboLastKilledType === t) state.comboCount++;
      else { state.comboLastKilledType = t; state.comboCount = 1; }
      if (state.comboCount >= 2) {
        var comboBonus = 15 * state.comboCount;
        addScore(comboBonus);
        addChargePoints(comboBonus);
        anyComboAwarded = true;
      }
      finalComboCount = state.comboCount;
    });
    if (anyComboAwarded) {
      toast('Combo x' + finalComboCount + '!');
      var sumR = 0, sumC = 0;
      for (var hci=0; hci<cells.length; hci++) { sumR += cells[hci][0]; sumC += cells[hci][1]; }
      var centroidR = Math.round(sumR / cells.length);
      var centroidC = Math.round(sumC / cells.length);
      var wrappedCR = ((centroidR % state.rows) + state.rows) % state.rows;
      var wrappedCC = ((centroidC % state.cols) + state.cols) % state.cols;
      queueComboTextAt(wrappedCR, wrappedCC, finalComboCount);
    }
  }

  addScore(hitIds.size * 5);
  addChargePoints(hitIds.size * 5);
  targetingMode = null;
  if (!debugInfiniteAttacks) state.charges[attack]--;

  var hasAnyAnim = deathAnimCells.length > 0 || explosionCells.length > 0 || hitIds.size > 0;

  if (aliveEnemyCount() > 0 && checkGameOverConditions()) {
    if (hasAnyAnim) {
      setTimeout(function(){ render(); showGameOver(); }, 280);
    } else {
      render();
      showGameOver();
    }
    return;
  }

  if (hasAnyAnim) {
    setTimeout(function(){ render(); finishAfterAttack(); }, 280);
  } else {
    render();
    finishAfterAttack();
  }
}