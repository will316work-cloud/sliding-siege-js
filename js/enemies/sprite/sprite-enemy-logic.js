/* ============================================================
   SPRITE — LOGIC

   Wrapped in an IIFE for the same reason as standard-enemy-logic.js
   — see its header comment. SPRITE_SHAPES is also scoped inside
   the IIFE since it's sprite-specific data, only needed by
   pickNextSpriteShape (defined at top level below, reads
   SPRITE_SHAPES via closure).

   Sprite's multi-space movement is NOT defined in this file —
   it calls moveSpriteUpToDistance() (see general-enemy-logic.js),
   which was generalized so any current or future enemy type can
   move more than 1 space per turn, not just Sprite.
   ============================================================ */

(function() {
  var labelName = "Sprite";
  var description = "Heals all enemies in a row, column, or 3x3 area, or casts a defense buff that lasts for 1 turn for full-health enemies.";
  var baseHealth = 15;
  var baseSize = [1, 1];
  var SPRITE_SHAPES = ['row', 'col', 'square3'];

  ENEMY_CONSTRUCTORS.sprite = function(hp) {
    return {
      hp: hp == null ? baseHealth : hp,
      label: labelName,
      baseSize: baseSize,
      queuedShape: SPRITE_SHAPES[Math.floor(Math.random()*SPRITE_SHAPES.length)],
      stunnedTurnsRemaining: 0
    };
  };
  ENEMY_CONSTRUCTORS.sprite.baseHealth = baseHealth;
  ENEMY_CONSTRUCTORS.sprite.label = labelName;
  ENEMY_CONSTRUCTORS.sprite.description = description;

  // pickNextSpriteShape needs SPRITE_SHAPES, so it's defined inside this
  // IIFE (as a closure over SPRITE_SHAPES) but still exposed at global
  // scope, since moveEnemiesOneStepSequenced / debug spawn code calls it
  // by name like any other top-level function.
  window.pickNextSpriteShape = function(sprite) {
    var others = SPRITE_SHAPES.filter(function(s) { return s !== sprite.queuedShape; });
    sprite.queuedShape = others[Math.floor(Math.random()*others.length)];
  };
})();

function isSprite(en) { return en && en.type === 'sprite'; }

function spriteShapeLabel(shape) {
  if (shape === 'row') return 'Row';
  if (shape === 'col') return 'Column';
  return '3x3 Area';
}

function spriteShapeCells(sprite) {
  var ar = sprite.anchor[0], ac = sprite.anchor[1];
  var shape = sprite.queuedShape;
  var cells = [];
  if (shape === 'row') {
    for (var c=0; c<state.cols; c++) cells.push([ar, c]);
  } else if (shape === 'col') {
    for (var r=0; r<state.rows; r++) cells.push([r, ac]);
  } else {
    for (var dr=-1; dr<=1; dr++) {
      for (var dc=-1; dc<=1; dc++) {
        var rr = ar+dr, cc = ac+dc;
        if (rr>=0 && rr<state.rows && cc>=0 && cc<state.cols) cells.push([rr,cc]);
      }
    }
  }
  return cells;
}

async function resolveSpriteCast(sprite) {
  var cells = spriteShapeCells(sprite);
  var hitIds = new Set();
  cells.forEach(function(p) {
    enemiesAtCell(p[0], p[1]).forEach(function(en) { hitIds.add(en.id); });  // CHANGED
  });
  if (hitIds.size === 0) return;

  log('✨ ' + sprite.label + ' casts her ' + spriteShapeLabel(sprite.queuedShape).toLowerCase() + ' spell!');

  var healedTargets = [];
  var buffedTargets = [];
  hitIds.forEach(function(id) {
    var en = state.enemies[id];
    if (!en) return;
    if (en.hp < en.maxHp) {
      var healAmt = Math.round(en.maxHp * 0.5);
      en.hp = Math.min(en.maxHp, en.hp + healAmt);
      queueDamageTextAt(en.anchor[0], en.anchor[1], healAmt, en.size, true, en.id);
      healedTargets.push(en);
    } else {
      applyDamageReduction(en, 0.20, 1);
      buffedTargets.push(en);
    }
  });

  render();
  for (var i=0; i<healedTargets.length; i++) animateSparkle(healedTargets[i]);
  for (var j=0; j<buffedTargets.length; j++) animateShield(buffedTargets[j]);
  if (healedTargets.length > 0 || buffedTargets.length > 0) await wait(SUBSTEP_DELAY);
}

async function resolveAllSpriteCasts() {
  var sprites = Object.values(state.enemies).filter(isSprite);
  for (var i=0; i<sprites.length; i++) {
    var sprite = sprites[i];
    if (!state.enemies[sprite.id]) continue;
    if (isStunned(sprite)) continue;
    await resolveSpriteCast(sprite);
  }
}

function pickNextShapesForAllSprites() {
  Object.values(state.enemies).filter(isSprite).forEach(function(sprite) {
    if (isStunned(sprite)) return;
    pickNextSpriteShape(sprite);
  });
}
