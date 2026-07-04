/* ============================================================
   PHANTOM — LOGIC

   Wrapped in an IIFE for the same reason as standard-enemy-logic.js
   — see its header comment.

   Phantom is the larger ghost variant — same transparency model,
   same teleport-instead-of-move behavior, same curse-after-
   teleporting timing. ALL of that shared behavior lives in
   ghost-enemy-logic.js (resolveGhostPhantomTeleportsSequenced(),
   applyGhostPhantomCurses(), isGhostOrPhantom()) — this file only
   registers Phantom's own ENEMY_CONSTRUCTORS entry (30 HP, 2x2,
   isTransparent). Load order: ghost-enemy-logic.js loads first (see
   index.html), so isGhost/isPhantom/isGhostOrPhantom are already
   defined as plain globals by the time anything calls them.
   ============================================================ */

(function() {
  var labelName = "Phantom";
  var description = "Larger ghost variant. Teleports to a random tile every enemy phase instead of moving normally, and can land on an occupied tile. Right before your turn starts, it curses all 2 rows and 2 columns it currently occupies, disabling each for your upcoming turn. Killing it re-enables whatever it was disabling.";
  var baseHealth = 30;
  var baseSize = [2, 2];

  ENEMY_CONSTRUCTORS.phantom = function(hp) {
    return {
      hp: hp == null ? baseHealth : hp,
      label: labelName,
      baseSize: baseSize
    };
  };
  ENEMY_CONSTRUCTORS.phantom.baseHealth = baseHealth;
  ENEMY_CONSTRUCTORS.phantom.label = labelName;
  ENEMY_CONSTRUCTORS.phantom.description = description;
  ENEMY_CONSTRUCTORS.phantom.isTransparent = true;
  ENEMY_CONSTRUCTORS.phantom.countsTowardGridFull = true;
})();
