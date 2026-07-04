/* ============================================================
   TIP PANEL RENDERING

   showEnemyTipPanel() has two fixes versus the original source:
     - ENEMY_TYPE_INFO no longer exists (each enemy type's label/
       description moved into its own specific-enemy-logic file
       during the global-state refactor). This now reads
       getEnemyLabel(en.type)/getEnemyDescription(en.type) (see
       general-enemy-logic.js) instead.
     - The "Cluster: <color name>" stats line is removed — slime
       cluster coloring no longer exists (slimes are always green,
       clusters are shown only via the connected thread visual in
       slime-enemy-rendering.js).

   Also updated to call isVulnerable() (see vulnerability-logic.js)
   and hasSoulCloud() (see soul-cloud-logic.js) instead of the
   original inline en.vulnerable / en.soulCloudTurns>0 checks.

   Depends on: showTipPanel() (see general-ui-logic.js),
   findLinkingGolemFor() (see golem-enemy-logic.js),
   findLinkingSirenFor()/isSiren() (see siren-enemy-logic.js),
   bombVariantLabel() (see bomb-enemy-logic.js), isRolly() (see
   grid-logic.js), isStunned() (see stun-logic.js),
   hasDamageReduction() (see damage-reduction-logic.js),
   isSprite()/spriteShapeLabel() (see sprite-enemy-logic.js).
   Tooltip anchoring: every show*TipPanel below now computes an
   anchor point (viewport coords) so showTipPanel() overlays the
   panel with its top-left corner on the center of the clicked
   thing. For enemies drawn as multiple wrap-around pieces
   (multi-cell blocks / stretched rollies), the anchor is the
   center of the specific piece containing the clicked cell —
   found by testing which .enemy-block[data-enemy-id] rect
   contains the clicked cell's center. Requires each rolly piece
   to carry data-enemy-id too (see rolly-enemy-rendering.js).
   ============================================================ */

function tipAnchorForCell(r, c) {
  if (r == null || c == null) return null;
  var cellEl = cellElAt(r, c);
  if (!cellEl) return null;
  var rect = cellEl.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function tipAnchorForEnemy(en, r, c) {
  var cellAnchor = tipAnchorForCell(r, c);
  if (!cellAnchor) return null;
  var cellEl = cellElAt(r, c);
  if (cellEl) {
    // 1x1 inline sprite (possibly stacked-offset): center of its own sprite.
    var sprites = cellEl.querySelectorAll('.enemy');
    for (var i = 0; i < sprites.length; i++) {
      if (sprites[i].dataset.enemyTextId === String(en.id)) {
        var sRect = sprites[i].getBoundingClientRect();
        return { x: sRect.left + sRect.width / 2, y: sRect.top + sRect.height / 2 };
      }
    }
  }
  // Multi-cell block / stretched rolly: the piece whose rect contains
  // the clicked cell's center — so a wrapping enemy anchors on the
  // segment that was actually clicked.
  var blocks = document.querySelectorAll('.enemy-block[data-enemy-id="' + en.id + '"]');
  for (var b = 0; b < blocks.length; b++) {
    var bRect = blocks[b].getBoundingClientRect();
    if (cellAnchor.x >= bRect.left && cellAnchor.x <= bRect.right &&
        cellAnchor.y >= bRect.top && cellAnchor.y <= bRect.bottom) {
      return { x: bRect.left + bRect.width / 2, y: bRect.top + bRect.height / 2 };
    }
  }
  return cellAnchor;
}

function tipAnchorForElement(el) {
  if (!el) return null;
  var rect = el.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function showEnemyTipPanel(en, clickedR, clickedC) {
  var label = getEnemyLabel(en.type) || en.type;
  var desc = getEnemyDescription(en.type) || '';
  var stats = ['HP: ' + Math.max(0, en.hp) + ' / ' + en.maxHp];
  if (isVulnerable(en)) stats.push('⚠️ Marked vulnerable (+20% damage taken)');
  if (hasSoulCloud(en)) stats.push('👻 Hitbox expanded this turn');
  if (en.type === 'golem' && en.pendingDetonation) stats.push('💥 Critical! Will explode next enemy phase');
  if (en.type === 'golem' && en.linkedIds && en.linkedIds.length > 0) {
    stats.push('🔗 Linked to ' + en.linkedIds.length + ' enemy/enemies — hits on them redirect here');
  }
  if (en.type === 'mage' && en.disabledAttackKey) {
    stats.push('🔮 Disabling: ' + ATTACK_DEFS[en.disabledAttackKey].name);
  }
  var linkingGolem = en.type !== 'golem' ? findLinkingGolemFor(en.id) : null;
  if (linkingGolem) stats.push('🔗 Linked to a Golem — damage to this enemy redirects to it');
  var linkingSiren = en.type !== 'siren' ? findLinkingSirenFor(en.id) : null;
  if (linkingSiren) stats.push('🔗 Linked to a Siren — her damage reduction depends on you killing this enemy');
  if (en.type === 'bomb') stats.push('💥 Blast pattern: ' + bombVariantLabel(en.variant));
  if (isRolly(en) && en.stretchAxis) stats.push('↔️ Currently stretched along its ' + (en.stretchAxis === 'row' ? 'row' : 'column'));
  if (isSiren(en)) {
    var activeLinks = en.linkedIds ? en.linkedIds.filter(function(id){ return !!state.enemies[id]; }).length : 0;
    stats.push('🔗 Active links: ' + activeLinks + ' / 3');
    stats.push(isStunned(en) ? '😵 Stunned — skips her next enemy turn' : '🎵 Song charge: ' + (en.songCounter || 0) + ' / 3');
  }
  if (isSprite(en)) {
    stats.push(isStunned(en) ? '😵 Stunned — her queued spell is frozen' : '✨ Next cast: ' + spriteShapeLabel(en.queuedShape));
  }
  if (isStunned(en) && !isSiren(en) && !isSprite(en)) stats.push('😵 Stunned — skips its next enemy turn');
  if (hasDamageReduction(en)) {
    var reductionLabel = en.damageReductionTurnsRemaining === Infinity
      ? '🛡️ Damage reduced by ' + Math.round(en.damageReductionPct*100) + '% (lasts until her links are killed)'
      : '🛡️ Damage reduced by ' + Math.round(en.damageReductionPct*100) + '% this turn';
    stats.push(reductionLabel);
  }
  showTipPanel(label, desc, stats, tipAnchorForEnemy(en, clickedR, clickedC));
}

function showAttackTipPanel(key) {
  var def = ATTACK_DEFS[key];
  if (!def) return;
  showTipPanel(def.icon + ' ' + def.name, def.desc, null, tipAnchorForElement(document.getElementById('attackCard_' + key)));
}

function showItemTipPanel(key) {
  var def = ITEM_DEFS[key];
  if (!def) return;
  showTipPanel(def.icon + ' ' + def.name, def.desc, null, tipAnchorForElement(document.getElementById('itemCard_' + key)));
}

function showSporeCloudTipPanel(cloud, clickedR, clickedC) {
  showTipPanel('🍄 Spore Cloud', 'Lasts ' + cloud.turnsRemaining + ' more enemy phase(s). Any attack that hits it destroys it and disables that attack for the rest of this turn and all of next turn. Bombs take priority — if a bomb is hit anywhere in the same attack, the cloud survives that hit.', [], tipAnchorForCell(clickedR, clickedC));
}