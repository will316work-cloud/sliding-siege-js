/* ============================================================
   GOLEM — LOGIC

   Wrapped in an IIFE for the same reason as standard-enemy-logic.js
   — see its header comment.

   baseHealth is set to 100 (a new value — the original special-
   cased golem HP as `100 + floorNum*6`, diverging from the
   generic formula at higher floors; per agreement, golem now
   scales identically to every other type via baseHealth +
   floor((floorNum-1)*2.5), with 100 chosen to keep floor-1 HP
   close to the old value of 106).

   detonatePendingGolemsSequenced() updated to call
   vulnerabilityMultiplier() (see vulnerability-logic.js) instead
   of the original inline en.vulnerable / linkingGolem.vulnerable
   ternary checks.
   ============================================================ */

(function() {
  var labelName = "Golem";
  var description = "Links to 1-2 random non-bomb and non-golem enemies, absorbing damage meant for linked enemies. When out of health, it goes critical and explodes, damaging half of each enemy's own max HP in a 4x4 area.";
  var baseHealth = 100;
  var baseSize = [2, 2];

  ENEMY_CONSTRUCTORS.golem = function(hp) {
    return {
      hp: hp == null ? baseHealth : hp,
      label: labelName,
      baseSize: baseSize
    };
  };
  ENEMY_CONSTRUCTORS.golem.baseHealth = baseHealth;
  ENEMY_CONSTRUCTORS.golem.label = labelName;
  ENEMY_CONSTRUCTORS.golem.description = description;
})();

function rerollGolemLinks() {
  var golems = Object.values(state.enemies).filter(function(en) {
    return en.type === 'golem' && !en.pendingDetonation;
  });
  if (golems.length === 0) {
    return;
  }

  golems.forEach(function(golem) {
    golem.linkedIds = [];
  });

  golems.forEach(function(golem) {
    var eligible = Object.values(state.enemies).filter(function(en) {
      return en.id !== golem.id && en.type !== 'golem' && en.type !== 'bomb';
    });
    if (eligible.length === 0) {
      golem.linkedIds = [];
      return;
    }
    var pool = eligible.slice();
    var picks = [];
    var desiredCount = 1 + Math.floor(Math.random() * 2);
    var pickCount = Math.min(desiredCount, pool.length);
    for (var i=0; i<pickCount; i++) {
      var idx = Math.floor(Math.random()*pool.length);
      picks.push(pool[idx].id);
      pool.splice(idx, 1);
    }
    golem.linkedIds = picks;
    if (picks.length > 0) {
      log('🔗 A golem links itself to ' + picks.length + ' enem' + (picks.length===1?'y':'ies') + '.');
    }
  });
}

async function animateAndRerollGolemLinks() {
  rerollGolemLinks();
  render();
  var golems = Object.values(state.enemies).filter(function(en) { return en.type === 'golem' && en.linkedIds && en.linkedIds.length > 0; });
  for (var gi=0; gi<golems.length; gi++) {
    var golem = golems[gi];
    for (var li=0; li<golem.linkedIds.length; li++) {
      var target = state.enemies[golem.linkedIds[li]];
      if (!target) continue;
      await playCastThreadAnimation(golem, target, '#b9b3a0');
    }
  }
}

function findLinkingGolemFor(enemyId) {
  var golems = Object.values(state.enemies).filter(function(en) { return en.type === 'golem'; });
  for (var i=0; i<golems.length; i++) {
    var g = golems[i];
    if (g.linkedIds && g.linkedIds.indexOf(enemyId) !== -1) {
      return g;
    }
  }
  return null;
}

async function detonatePendingGolemsSequenced() {
  var golems = Object.values(state.enemies).filter(function(en) {
    return en.type === 'golem' && en.pendingDetonation;
  });
  if (golems.length === 0) {
    return;
  }

  for (var gi=0; gi<golems.length; gi++) {
    var golem = golems[gi];
    if (!state.enemies[golem.id]) {
      continue;
    }
    var ar = golem.anchor[0];
    var ac = golem.anchor[1];

    var hitTargetIds = [];
    for (var dr=-1; dr<=2; dr++) {
      for (var dc=-1; dc<=2; dc++) {
        var rr = ar+dr;
        var cc = ac+dc;
        if (rr < 0 || rr >= state.rows || cc < 0 || cc >= state.cols) {
          continue;
        }
        enemiesAtCell(rr, cc).forEach(function(en) {                          // CHANGED
          if (en.id !== golem.id && hitTargetIds.indexOf(en.id) === -1) hitTargetIds.push(en.id);  // CHANGED
        });
      }
    }

    log('💥 A critically damaged Golem explodes in a 4x4 blast!');
    animateExplosionAt(ar, ac);
    animateExplosionAt(ar, ac+1);
    animateExplosionAt(ar+1, ac);
    animateExplosionAt(ar+1, ac+1);
    animateDeathAt(ar, ac, enemyColorHex(golem));

    delete state.enemies[golem.id];
    for (var grr=0; grr<state.rows; grr++) {
      for (var gcc=0; gcc<state.cols; gcc++) {
        removeEnemyRefAt(grr, gcc, golem.id);   // CHANGED
      }
    }
    addScore(25);
    addChargePoints(25);
    log(golem.label + ' finally destroyed in the explosion! +25 score');
    checkSirenStunOnDeath(golem.id);

    var deathAnimCells = [];
    for (var hi=0; hi<hitTargetIds.length; hi++) {
      var id2 = hitTargetIds[hi];
      var en = state.enemies[id2];
      if (!en) {
        continue;
      }

      var halfMaxDmg = Math.round(en.maxHp * 0.5);
      var linkingGolem = en.type !== 'golem' ? findLinkingGolemFor(en.id) : null;

      if (linkingGolem) {
        var golemHalfMaxDmg = Math.round(linkingGolem.maxHp * 0.5);
        var golemRealDmg = Math.round(golemHalfMaxDmg * vulnerabilityMultiplier(linkingGolem) * damageReductionMultiplier(linkingGolem));
        linkingGolem.hp -= golemRealDmg;
        queueDamageTextAt(linkingGolem.anchor[0], linkingGolem.anchor[1], golemRealDmg, linkingGolem.size, false, linkingGolem.id);
        log(en.label + "'s explosion damage is redirected to its linked Golem!");
        if (en.type === 'slime') {
          en.pendingHitThisCycle = true;
        }
        if (linkingGolem.hp <= 0 && !linkingGolem.pendingDetonation) {
          linkingGolem.hp = 0;
          linkingGolem.pendingDetonation = true;
          linkingGolem.linkedIds = [];
          log(linkingGolem.label + ' is critically damaged and will explode next enemy phase!');
        }
        continue;
      }

      var realDmg = Math.round(halfMaxDmg * vulnerabilityMultiplier(en) * damageReductionMultiplier(en));

      if (en.type === 'slime') {
        en.hp -= realDmg;
        en.pendingHitThisCycle = true;
        queueDamageTextAt(en.anchor[0], en.anchor[1], realDmg, en.size, false, en.id);
        log(en.label + ' takes ' + realDmg + ' explosion damage (pending resolution)!');
        continue;
      }

      en.hp -= realDmg;
      queueDamageTextAt(en.anchor[0], en.anchor[1], realDmg, en.size, false, en.id);

      if (en.type === 'golem') {
        if (en.hp <= 0 && !en.pendingDetonation) {
          en.hp = 0;
          en.pendingDetonation = true;
          en.linkedIds = [];
          log(en.label + ' is critically damaged and will explode next enemy phase!');
        }
        continue;
      }

      if (en.hp <= 0) {
        deathAnimCells.push([en.anchor[0], en.anchor[1], enemyColorHex(en)]);
        delete state.enemies[id2];
        for (var rr3=0; rr3<state.rows; rr3++) {
          for (var cc3=0; cc3<state.cols; cc3++) {
            removeEnemyRefAt(rr3, cc3, id2);     // CHANGED
          }
        }
        addScore(25);
        addChargePoints(25);
        log(en.label + ' caught in the explosion and defeated! +25 score');
        if (isSiren(en)) clearSirenCurse(en);
        checkSirenStunOnDeath(id2);
      } else {
        log(en.label + ' takes ' + realDmg + ' explosion damage!');
      }
    }

    for (var di=0; di<deathAnimCells.length; di++) {
      animateDeathAt(deathAnimCells[di][0], deathAnimCells[di][1], deathAnimCells[di][2]);
    }
    await wait(280);
    render();
    await wait(SUBSTEP_DELAY);
  }
}
