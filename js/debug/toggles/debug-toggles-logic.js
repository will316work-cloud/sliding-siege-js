/* ============================================================
   DEBUG TOGGLES — LOGIC
   ============================================================ */

var debugInfiniteAttacks = false;
var debugInfiniteItems = false;
var debugInfiniteReverts = false;
var debugModeVisible = true;   // NEW — master switch for the debug panel + log section

function otherDebugInteractionsLocked() {
  return debugMoveModeActive || debugDeleteModeActive;
}