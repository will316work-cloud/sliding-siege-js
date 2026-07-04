/* ============================================================
   MUSHY — LOGIC

   Wrapped in an IIFE for the same reason as standard-enemy-logic.js
   — see its header comment.

   Mushy's only special behavior is spewing spore clouds in the 3x3
   area around itself once per enemy phase. The clouds themselves
   are NOT owned by this file — they're a fully separate transparent-
   entity system living in spore-cloud-logic.js / spore-cloud-
   rendering.js (state.sporeClouds, never written into state.grid/
   state.enemies, so enemies — including Mushy itself — can freely
   stand on the same tile as a cloud). This file only calls
   spewSporeCloudsAround() (see spore-cloud-logic.js) once per
   Mushy per enemy phase.

   Movement: Mushy moves up to 2 spaces per enemy phase, reusing the
   existing type-agnostic moveSpriteUpToDistance() helper (see
   general-enemy-logic.js) — the dispatcher branch for this lives in
   that file's moveEnemiesOneStepSequenced(), exactly like rolly's/
   mage's/sprite's branches (see general-enemy-logic.js patch notes).
   ============================================================ */

(function() {
  var labelName = "Mushy";
  var description = "Each enemy phase, spews lingering spore clouds in the 3x3 area around itself. Enemies can stand on spore clouds freely, but a player attack that hits a spore cloud has that attack disabled for the rest of the turn and all of next turn.";
  var baseHealth = 30;
  var baseSize = [1, 1];

  ENEMY_CONSTRUCTORS.mushy = function(hp) {
    return {
      hp: hp == null ? baseHealth : hp,
      label: labelName,
      baseSize: baseSize
    };
  };
  ENEMY_CONSTRUCTORS.mushy.baseHealth = baseHealth;
  ENEMY_CONSTRUCTORS.mushy.label = labelName;
  ENEMY_CONSTRUCTORS.mushy.description = description;
})();

function isMushy(en) { return en && en.type === 'mushy'; }

// Called once per enemy phase (see turn-logic.js's ENEMY_PHASE_STEPS).
// Every living, non-stunned Mushy spews a fresh batch of spore clouds
// covering the 3x3 area centered on its own tile (wrapped, same
// convention as soul cloud's getSoulCloudExpandedCells). Sequenced
// (await + render + wait) to match the rest of the enemy-phase steps'
// pacing/visual style.
async function resolveMushySporeSpewsSequenced() {
  var mushies = Object.values(state.enemies).filter(isMushy);
  if (mushies.length === 0) return;
  for (var i = 0; i < mushies.length; i++) {
    var mushy = mushies[i];
    if (!state.enemies[mushy.id]) continue;
    if (isStunned(mushy)) continue;
    spewSporeCloudsAround(mushy);
    log('🍄 ' + mushy.label + ' spews a cloud of spores!');
    render();
    await wait(SUBSTEP_DELAY);
  }
}
