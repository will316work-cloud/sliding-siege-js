/* ============================================================
   BOMB — LOGIC

   Wrapped in an IIFE for the same reason as standard-enemy-logic.js
   — see its header comment. BOMB_VARIANTS and pickBombVariant()
   are also scoped inside the IIFE since pickBombVariant's only
   caller is the bomb constructor defined in this same closure.

   detonateBombsSequenced() depends on: isVulnerable()/
   vulnerabilityMultiplier() (see vulnerability-logic.js),
   damageReductionMultiplier() (see damage-reduction-logic.js),
   findLinkingGolemFor() (see golem-enemy-logic.js), isSiren()/
   clearSirenCurse()/checkSirenStunOnDeath() (see siren-enemy-logic.js),
   enemyColorHex() (see general-ui-rendering.js), animateExplosionAt()/
   animateDeathAt()/queueDamageTextAt() (see animation-rendering.js),
   addChargePoints() (see points-logic.js).
   ============================================================ */

(function() {
  var labelName = "Bomb";
  var description = "Hitting this bomb directly will make it blow up and interrupt your attack. Left to blow up on the enemy's turn, it deals half of each caught enemy's own max HP. There are three variants: a 3x3 square blast, a full row+column blast, or a full diagonal-cross blast — check its tooltip to see which one.";
  var baseHealth = 14;
  var baseSize = [1, 1];
  var BOMB_VARIANTS = ['square', 'cross', 'diag'];

  function pickBombVariant() {
    return BOMB_VARIANTS[Math.floor(Math.random()*BOMB_VARIANTS.length)];
  }

  ENEMY_CONSTRUCTORS.bomb = function(hp) {
    return {
      hp: hp == null ? baseHealth : hp,
      label: labelName,
      baseSize: baseSize,
      variant: pickBombVariant()
    };
  };
  ENEMY_CONSTRUCTORS.bomb.baseHealth = baseHealth;
  ENEMY_CONSTRUCTORS.bomb.label = labelName;
  ENEMY_CONSTRUCTORS.bomb.description = description;
})();

function getBombBlastCells(bomb) {
  var br = bomb.anchor[0], bc = bomb.anchor[1];
  var R = state.rows, C = state.cols;
  function inBounds(rr,cc) { return rr >= 0 && rr < R && cc >= 0 && cc < C; }
  var cells = [];
  var variant = bomb.variant || 'square';
  if (variant === 'cross') {
    for (var cc=0; cc<C; cc++) { if (cc !== bc && inBounds(br,cc)) cells.push([br,cc]); }
    for (var rr=0; rr<R; rr++) { if (rr !== br && inBounds(rr,bc)) cells.push([rr,bc]); }
  } else if (variant === 'diag') {
    var maxK = Math.max(R,C);
    for (var k=-maxK; k<=maxK; k++) {
      if (k === 0) continue;
      var dRR = br+k, dCC = bc+k;
      if (inBounds(dRR,dCC)) cells.push([dRR,dCC]);
      var dRR2 = br+k, dCC2 = bc-k;
      if (inBounds(dRR2,dCC2)) cells.push([dRR2,dCC2]);
    }
  } else {
    for (var dr=-1; dr<=1; dr++) {
      for (var dc=-1; dc<=1; dc++) {
        if (dr === 0 && dc === 0) continue;
        var brr = br+dr, bcc = bc+dc;
        if (inBounds(brr,bcc)) cells.push([brr,bcc]);
      }
    }
  }
  return cells;
}

function bombVariantLabel(variant) {
  if (variant === 'cross') return 'Row+Column';
  if (variant === 'diag') return 'Diagonal';
  return '3x3 Square';
}

async function detonateBombsSequenced() {
  var bombs = Object.values(state.enemies).filter(function(en){ return en.type === 'bomb'; });
  if (bombs.length === 0) {
    return;
  }
  for (var bi=0; bi<bombs.length; bi++) {
    var bomb = bombs[bi];
    if (!state.enemies[bomb.id]) {
      continue;
    }
    var br = bomb.anchor[0];
    var bc = bomb.anchor[1];

    var hitTargetIds = [];
    var blastCells = getBombBlastCells(bomb);
    for (var bcIdx=0; bcIdx<blastCells.length; bcIdx++) {
      var rr = blastCells[bcIdx][0], cc = blastCells[bcIdx][1];
      enemiesAtCell(rr, cc).forEach(function(en) {          // CHANGED
        if (en.id !== bomb.id && hitTargetIds.indexOf(en.id) === -1) hitTargetIds.push(en.id);  // CHANGED
      });
    }

    log('💥 Bomb detonates (' + bombVariantLabel(bomb.variant) + ' blast)!');
    animateExplosionAt(br, bc, blastCells);   // CHANGED — was animateExplosionAt(br, bc)
    animateDeathAt(br, bc, enemyColorHex(bomb));
    delete state.enemies[bomb.id];
    for (var rr2=0; rr2<state.rows; rr2++) {
      for (var cc2=0; cc2<state.cols; cc2++) {
        removeEnemyRefAt(rr2, cc2, bomb.id);
      }
    }

    var deathAnimCells = [];
    for (var hi=0; hi<hitTargetIds.length; hi++) {
      var id2 = hitTargetIds[hi];
      var en = state.enemies[id2];
      if (!en) continue;

      var halfMaxDmg = Math.round(en.maxHp * 0.5);
      var linkingGolem = en.type !== 'golem' ? findLinkingGolemFor(en.id) : null;

      if (linkingGolem) {
        var golemHalfMaxDmg = Math.round(linkingGolem.maxHp * 0.5);
        var golemRealDmg = Math.round(golemHalfMaxDmg * vulnerabilityMultiplier(linkingGolem) * damageReductionMultiplier(linkingGolem));
        linkingGolem.hp -= golemRealDmg;
        queueDamageTextAt(linkingGolem.anchor[0], linkingGolem.anchor[1], golemRealDmg, linkingGolem.size, false, linkingGolem.id);
        log(en.label + "'s blast damage is redirected to its linked Golem!");
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
        log(en.label + ' takes ' + realDmg + ' blast damage (pending resolution)!');
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
            removeEnemyRefAt(rr3, cc3, id2);
          }
        }
        addScore(25);
        addChargePoints(25);
        log(en.label + ' caught in the blast and defeated! +25 score');
        if (isSiren(en)) clearSirenCurse(en);
        checkSirenStunOnDeath(id2);
      } else {
        log(en.label + ' takes ' + realDmg + ' blast damage!');
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
