/* ============================================================
   STUN — LOGIC
   ============================================================ */

function isStunned(en) {
  return !!(en && en.stunnedTurnsRemaining > 0);
}

function applyStun(en, turns) {
  if (!en) return;
  en.stunnedTurnsRemaining = Math.max(en.stunnedTurnsRemaining || 0, turns == null ? 1 : turns);
}

function tickStunDurations() {
  Object.values(state.enemies).forEach(function(en) {
    if (en.stunnedTurnsRemaining > 0) {
      en.stunnedTurnsRemaining--;
    }
  });
}
