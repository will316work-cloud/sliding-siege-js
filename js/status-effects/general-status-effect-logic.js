/* ============================================================
   GENERAL STATUS EFFECT LOGIC
   Shared, type-agnostic status-effect plumbing. Per-effect
   logic (stun, damage reduction, ability disabling,
   vulnerability, soul cloud, row/col disabling) lives in its
   own dedicated file alongside this one.
   ============================================================ */

// Ticks down any status effect that decays once per enemy
// phase and isn't already owned by a more specific ticker
// (stun and damage-reduction have their own tick functions).
function tickStatusEffects() {
  Object.values(state.enemies).forEach(function(en) {
    if (en.soulCloudTurns > 0) {
      en.soulCloudTurns--;
    }
  });
}
