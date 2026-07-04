/* ============================================================
   STANDARD (GRUNT) — LOGIC

   Wrapped in an IIFE so labelName/description/baseHealth/
   baseSize stay local to this file and don't collide with the
   same-named variables in other specific-enemy files (all
   loaded as plain global <script> tags, not modules).
   resolveGruntDuplication() is attached to the global scope
   explicitly since other files (general-enemy-logic.js's
   moveEnemiesOneStepSequenced, turn-logic.js's enemy phase)
   need to call it.
   ============================================================ */

(function() {
  var labelName = "Grunt";
  var description = "A basic enemy. Each enemy phase, if it has an empty tile adjacent (including diagonals), it has a 20% chance to split off a duplicate with the same current and max HP.";
  var baseHealth = 15;
  var baseSize = [1, 1];

  ENEMY_CONSTRUCTORS.standard = function(hp) {
    return {
      hp: hp == null ? baseHealth : hp,
      label: labelName,
      baseSize: baseSize
    };
  };
  ENEMY_CONSTRUCTORS.standard.baseHealth = baseHealth;
  ENEMY_CONSTRUCTORS.standard.label = labelName;
  ENEMY_CONSTRUCTORS.standard.description = description;
})();

var duplicationChance = 0.20;   // NEW

async function resolveGruntDuplication() {
  var grunts = Object.values(state.enemies).filter(function(en) { return en.type === 'standard'; });
  if (grunts.length === 0) {
    return;
  }
  var directions = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
  for (var gi=0; gi<grunts.length; gi++) {
    var grunt = grunts[gi];
    if (!state.enemies[grunt.id]) continue;
    if (grunt.type !== 'standard') continue;

    var ar = grunt.anchor[0], ac = grunt.anchor[1];
    var openSpots = [];
    for (var di=0; di<directions.length; di++) {
      var dr = directions[di][0], dc = directions[di][1];
      var rr = ((ar+dr)%state.rows+state.rows)%state.rows;
      var cc = ((ac+dc)%state.cols+state.cols)%state.cols;
      if (!cellHasNonTransparentOccupant(rr, cc)) openSpots.push([rr,cc]);
    }
    if (openSpots.length === 0) continue;
    if (Math.random() >= duplicationChance) continue;   // CHANGED — was `0.20`

    var spot = openSpots[Math.floor(Math.random()*openSpots.length)];
    var clone = makeEnemy('standard', grunt.hp);
    clone.maxHp = grunt.maxHp;
    placeEnemyAt(spot[0], spot[1], clone);
    log(grunt.label + ' splits off a duplicate!');
    render();
    animateSpawnAt(spot[0], spot[1]);
    await wait(SUBSTEP_DELAY);
  }
}
