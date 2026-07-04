/* ============================================================
   DAMAGE REDUCTION — LOGIC
   ============================================================ */

function hasDamageReduction(en) {
  return !!(en && en.damageReductionTurnsRemaining > 0 && en.damageReductionPct > 0);
}

// turns === Infinity means "lasts indefinitely until something else clears
// it" (used by Siren's link-based reduction, which has no natural turn
// countdown — it ends only when her links are gone). tickDamageReductions
// skips anything set to Infinity, so it's never cleared by the generic
// per-phase expiry; only an explicit clearDamageReduction call ends it.
function applyDamageReduction(en, pct, turns) {
  if (!en) return;
  en.damageReductionPct = pct;
  var requested = turns == null ? 1 : turns;
  en.damageReductionTurnsRemaining = en.damageReductionTurnsRemaining === Infinity
    ? Infinity
    : Math.max(en.damageReductionTurnsRemaining || 0, requested);
}

function clearDamageReduction(en) {
  if (!en) return;
  en.damageReductionPct = 0;
  en.damageReductionTurnsRemaining = 0;
}

function damageReductionMultiplier(en) {
  return hasDamageReduction(en) ? (1 - en.damageReductionPct) : 1;
}

// Ends the buff for everyone carrying a *finite* duration, right after
// golems explode each enemy phase, per the agreed expiry timing. Anything
// set to last indefinitely (Siren's link-based reduction) is left alone —
// it only ever ends via an explicit clearDamageReduction call.
function tickDamageReductions() {
  Object.values(state.enemies).forEach(function(en) {
    if (en.damageReductionTurnsRemaining > 0 && en.damageReductionTurnsRemaining !== Infinity) {
      en.damageReductionTurnsRemaining = 0;
      en.damageReductionPct = 0;
    }
  });
}
