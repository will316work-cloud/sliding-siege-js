/* ============================================================
   SIREN — LOGIC

   Wrapped in an IIFE for the same reason as standard-enemy-logic.js
   — see its header comment.

   Siren's curse mechanism writes into state.sirenCursedAttacks /
   state.sirenCursedItems (via sirenShriek/clearSirenCurse/
   tickSirenCurses below), which is the same data that
   ability-disabling-logic.js's isAttackCursed()/isItemCursed()/
   getDisabledAttackKeys()/getDisabledItemKeys() READ from. This
   file does not redefine isAttackCursed/isItemCursed — those
   live exclusively in ability-disabling-logic.js, since siren's
   curse is implemented as one of two underlying mechanisms behind
   the shared ability-disabling query layer (the other being
   Mage's disabledAttackKey).
   ============================================================ */

(function() {
  var labelName = "Siren";
  var description = "Links to 3 random enemies to reduce incoming damage by 90%. Killing all the linked enemies will stun it for one enemy turn. Charges up a shriek for 3 turns, which curses 4 available attacks/items for 1 turn.";
  var baseHealth = 60;
  var baseSize = [3, 3];

  ENEMY_CONSTRUCTORS.siren = function(hp) {
    return {
      hp: hp == null ? baseHealth : hp,
      label: labelName,
      baseSize: baseSize,
      linkedIds: [],
      songCounter: 0,
      stunnedTurnsRemaining: 0
    };
  };
  ENEMY_CONSTRUCTORS.siren.baseHealth = baseHealth;
  ENEMY_CONSTRUCTORS.siren.label = labelName;
  ENEMY_CONSTRUCTORS.siren.description = description;
})();

function isSiren(en) { return en && en.type === 'siren'; }

function aliveSirenCount() {
  return Object.values(state.enemies).filter(isSiren).length;
}

function sirenLinkEligible(en, siren) {
  return en.id !== siren.id && en.type !== 'bomb' && en.type !== 'siren';
}

function linkSiren(siren) {
  var eligible = Object.values(state.enemies).filter(function(en) { return sirenLinkEligible(en, siren); });
  var pool = eligible.slice();
  var picks = [];
  var pickCount = Math.min(3, pool.length);
  for (var i=0; i<pickCount; i++) {
    var idx = Math.floor(Math.random()*pool.length);
    picks.push(pool[idx].id);
    pool.splice(idx, 1);
  }
  siren.linkedIds = picks;
  if (picks.length > 0) {
    applyDamageReduction(siren, 0.90, Infinity);
    log('🔗 A siren links itself to ' + picks.length + ' enem' + (picks.length===1?'y':'ies') + '.');
  }
}

async function animateAndLinkSiren(siren) {
  linkSiren(siren);
  render();
  if (!siren.linkedIds || siren.linkedIds.length === 0) return;
  animateShield(siren);
  for (var i=0; i<siren.linkedIds.length; i++) {
    var target = state.enemies[siren.linkedIds[i]];
    if (!target) continue;
    await playCastThreadAnimation(siren, target, '#2de0d6');
  }
}

async function animateAndRelinkUnlinkedSirens() {
  var sirens = Object.values(state.enemies).filter(isSiren);
  for (var i=0; i<sirens.length; i++) {
    var siren = sirens[i];
    if (isStunned(siren)) continue;
    if (sirenHasActiveLinks(siren)) continue;
    await animateAndLinkSiren(siren);
  }
}

function sirenHasActiveLinks(siren) {
  if (!siren.linkedIds || siren.linkedIds.length === 0) return false;
  return siren.linkedIds.some(function(id) { return !!state.enemies[id]; });
}

function findLinkingSirenFor(enemyId) {
  var sirens = Object.values(state.enemies).filter(isSiren);
  for (var i=0; i<sirens.length; i++) {
    var s = sirens[i];
    if (s.linkedIds && s.linkedIds.indexOf(enemyId) !== -1) return s;
  }
  return null;
}

function applySirenReduction(siren, rawDmg) {
  if (sirenHasActiveLinks(siren)) return Math.round(rawDmg * 0.10);
  return rawDmg;
}

function checkSirenStunOnDeath(deadEnemyId) {
  var sirens = Object.values(state.enemies).filter(isSiren);
  sirens.forEach(function(siren) {
    if (!siren.linkedIds || siren.linkedIds.indexOf(deadEnemyId) === -1) return;
    if (sirenHasActiveLinks(siren)) return;
    if (isStunned(siren)) return;
    siren.linkedIds = [];
    siren.songCounter = 0;
    clearDamageReduction(siren);
    applyStun(siren, 1);
    clearSirenCurse(siren);
    log(siren.label + "'s last link is destroyed — she is stunned, and her curse breaks!");
    animateThreadSnap(siren);
  });
}

function advanceSirenSong(siren) {
  siren.songCounter = (siren.songCounter || 0) + 1;
  if (siren.songCounter > 3) siren.songCounter = 3;
}

async function sirenShriek(siren) {
  var availableAttacks = Object.keys(ATTACK_DEFS).filter(function(k) {
    return debugInfiniteAttacks || (state.charges[k] || 0) > 0;
  }).map(function(k) { return { kind: 'attack', key: k }; });
  var availableItems = Object.keys(ITEM_DEFS).filter(function(k) {
    return debugInfiniteItems || (state.items[k] || 0) > 0;
  }).map(function(k) { return { kind: 'item', key: k }; });
  var pool = availableAttacks.concat(availableItems);

  var picks = [];
  var pickCount = Math.min(4, pool.length);
  for (var i=0; i<pickCount; i++) {
    var idx = Math.floor(Math.random()*pool.length);
    picks.push(pool[idx]);
    pool.splice(idx, 1);
  }

  picks.forEach(function(p) {
    if (p.kind === 'attack') {
      state.sirenCursedAttacks[p.key] = state.sirenCursedAttacks[p.key] || [];
      state.sirenCursedAttacks[p.key].push(siren.id);
    } else {
      state.sirenCursedItems[p.key] = state.sirenCursedItems[p.key] || [];
      state.sirenCursedItems[p.key].push(siren.id);
    }
  });

  siren.songCounter = 0;
  var names = picks.map(function(p) {
    return p.kind === 'attack' ? ATTACK_DEFS[p.key].name : ITEM_DEFS[p.key].name;
  });
  log('🎶 ' + siren.label + ' shrieks! Cursed: ' + (names.length > 0 ? names.join(', ') : 'nothing — no available cards to curse'));
  toast(siren.label + ' shrieks!');
  render();

  for (var pi=0; pi<picks.length; pi++) {
    var p2 = picks[pi];
    var cardEl = document.getElementById((p2.kind === 'attack' ? 'attackCard_' : 'itemCard_') + p2.key);
    await playCastThreadAnimation(siren, cardEl, '#c040ff');
  }
}

function clearSirenCurse(siren) {
  Object.keys(state.sirenCursedAttacks).forEach(function(k) {
    state.sirenCursedAttacks[k] = state.sirenCursedAttacks[k].filter(function(id) { return id !== siren.id; });
    if (state.sirenCursedAttacks[k].length === 0) delete state.sirenCursedAttacks[k];
  });
  Object.keys(state.sirenCursedItems).forEach(function(k) {
    state.sirenCursedItems[k] = state.sirenCursedItems[k].filter(function(id) { return id !== siren.id; });
    if (state.sirenCursedItems[k].length === 0) delete state.sirenCursedItems[k];
  });
}

function tickSirenCurses() {
  state.sirenCursedAttacks = {};
  state.sirenCursedItems = {};
}

async function resolveSirenSongsAndShrieks() {
  var sirens = Object.values(state.enemies).filter(isSiren);
  if (sirens.length === 0) return;
  for (var i=0; i<sirens.length; i++) {
    var siren = sirens[i];
    if (!state.enemies[siren.id]) continue;
    if (isStunned(siren)) continue;
    if (!sirenHasActiveLinks(siren)) continue;

    if ((siren.songCounter || 0) >= 3) {
      await sirenShriek(siren);
      render();
      await wait(SUBSTEP_DELAY);
      continue;
    }

    advanceSirenSong(siren);
    render();
    await wait(SUBSTEP_DELAY);
  }
}
