/* ============================================================
   GLOBAL STATE
   Cross-cutting globals shared across every module. This file
   must load FIRST, before any other script tag in index.html.

   Everything else that used to live here (ATTACK_DEFS, ITEM_DEFS,
   ENEMY_TYPE_INFO, ENEMY_HP_BASES, SLIME_CLUSTER_COLORS,
   MAX_SIRENS_ALIVE, SPRITE_SHAPES, BOMB_VARIANTS, debug-panel
   state, newRunState/init) has been relocated to its respective
   module file.
   ============================================================ */

/* ---------------- Timing constants ---------------- */
var STEP_DELAY = 450;
var SUBSTEP_DELAY = 350;

/* ---------------- Core run state ---------------- */
var state = null;

/* ---------------- Targeting / selection state ---------------- */
var targetingMode = null;
var selectedItem = null;
var previewTarget = null;
var pendingTarget = null;

var itemTargetingMode = null;
var itemPreviewCell = null;
var itemSecondTarget = null;
var itemSecondTargetFootprint = [];

/* ---------------- Pending visual queues ---------------- */
var pendingDamageTexts = [];
var pendingComboText = null;
