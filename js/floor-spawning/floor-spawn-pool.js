/* ============================================================
   FLOOR SPAWN POOL (data)

   Declarative spawn data per floor range. Replaces the original
   typesUnlocked/floorSpawnWeights/ENEMY_DIMENSION_POOLS/
   dimensionForType mechanisms with one structure that
   spawn-pool-processor.js's algorithm reads from.

   Each entry has:
     floorRanges: list of [min,max] pairs (max may be Infinity).
       A type can reappear in a later range after a gap.
     maxSizeTypeCounts: per-dimension alive cap, default Infinity
       if omitted (e.g. {'2x2': 1} caps total 2x2s alive at 1).
     typeCaps: per-type alive cap, default Infinity if omitted
       (e.g. {siren: 2}). Shared between this floor's initialPool
       and midFloorPool (not duplicated per-pool).
     initialPool / midFloorPool: each has its OWN independent
       randomSpawnCountChances, dimensionChances, transparentChance,
       typeWeightsByDimension, typeWeightsByDimensionTransparent,
       and defaultTypeByDimension.

   Algorithm (see spawn-pool-processor.js for the implementation):
     1. Roll randomSpawnCountChances (ordered {counts, chance} list,
        chained — first success wins, else count = 0) to get N.
     2. For each of N spawn slots independently (fresh dimension +
        position re-rolled per slot):
        a. Walk dimensionChances in order. Per entry: check
           maxSizeTypeCounts cap (skip entry if met) -> roll
           transparentChance fresh -> if not transparent, scan for
           a valid empty position (skip entry if none); if
           transparent, position is free (any cell). Pick position
           uniformly -> roll this entry's own chance (success locks
           in dimension+position+transparency flag and stops the
           walk; failure discards and tries the next entry).
        b. If every dimensionChances entry fails, hard-fallback to
           1x1 (still gets its own transparentChance roll/position
           check) -- if 1x1's cap is met or no position exists, the
           whole slot fails (nothing spawns).
     3. Type selection: walk the locked dimension's
        typeWeightsByDimension (or typeWeightsByDimensionTransparent
        if the slot rolled transparent) in order -- skip a type if
        its typeCaps cap is met, else roll its chance (success picks
        it and stops). If every type fails, fall back to that
        dimension's defaultTypeByDimension entry, but the default
        type STILL respects its own typeCaps cap -- if even the
        default is capped, the slot fails with no enemy placed
        despite having a locked-in dimension+position.

   Numeric note: many of the chance values below were derived from
   the original game's relative weighted-random spawn tables, using
   chance_i = weight_i / (sum of weights from i to the end of the
   list) -- this exact formula reproduces the original distribution
   when entries are walked in order, so the new chained-chance
   system picks each type with the same probability the old
   single-weighted-pick system did.

   IMPORTANT CAVEAT: in the original 5000-line source, Siren and
   Sprite were NEVER part of any natural spawn system (floorSpawnWeights
   never included them, and typesUnlocked never unlocked them) -- both
   were only ever placeable via the debug panel's manual spawn. This
   floor-6+ entry now includes both in typeWeightsByDimension for the
   first time, at conservative low chances, since the original game
   had no spawn behavior for them to faithfully translate. Likewise,
   Golem's old "typesUnlocked at floor 5" was a latent inconsistency
   in the original (floorSpawnWeights gave it zero actual chance until
   floor 6) -- floor 5 below intentionally fixes this per instruction,
   rather than reproducing the bug.
   ============================================================ */


function getSpawnPoolEntryForFloor(floorNum) {
  for (var i=0; i<FLOOR_SPAWN_POOLS.length; i++) {
    var entry = FLOOR_SPAWN_POOLS[i];
    for (var r=0; r<entry.floorRanges.length; r++) {
      var range = entry.floorRanges[r];
      if (floorNum >= range[0] && floorNum <= range[1]) return entry;
    }
  }
  return null;
}

function randIntInclusive(min, max) {   // NEW
  return min + Math.floor(Math.random() * (max - min + 1));
}

function getGridDimensionsForFloor(floorNum) {   // NEW
  var entry = getSpawnPoolEntryForFloor(floorNum);
  if (!entry) return { rows: 5, cols: 5 };
  var width = randIntInclusive(entry.widthRange[0], entry.widthRange[1]);
  var height = randIntInclusive(entry.heightRange[0], entry.heightRange[1]);
  return { rows: height, cols: width };
}

var FLOOR_SPAWN_POOLS = [
  {
    floorRanges: [[1,1]],
    widthRange: [5,5],     // NEW
    heightRange: [5,5],    // NEW
    maxSizeTypeCounts: {},
    typeCaps: {},
    initialPool: {
      randomSpawnCountChances: [
        { counts: [3,4], chance: 1.0 }
      ],
      dimensionChances: [
        { dimension: '1x1', chance: 1.0 }
      ],
      transparentChance: 0,
      typeWeightsByDimension: {
        '1x1': [ ['standard', 1.0] ]
      },
      typeWeightsByDimensionTransparent: {
        '1x1': []
      },
      defaultTypeByDimension: { '1x1': 'standard' }
    },
    midFloorPool: {
      randomSpawnCountChances: [
        { counts: [1], chance: 0.75 }
      ],
      dimensionChances: [
        { dimension: '1x1', chance: 1.0 }
      ],
      transparentChance: 0,
      typeWeightsByDimension: {
        '1x1': [ ['standard', 1.0] ]
      },
      typeWeightsByDimensionTransparent: {
        '1x1': []
      },
      defaultTypeByDimension: { '1x1': 'standard' }
    }
  },
  {
    floorRanges: [[2,2]],
    widthRange: [5,6],     // NEW
    heightRange: [5,6],    // NEW
    maxSizeTypeCounts: {},
    typeCaps: {},
    initialPool: {
      randomSpawnCountChances: [
        { counts: [5,6], chance: 1.0 }
      ],
      dimensionChances: [
        { dimension: '1x1', chance: 1.0 }
      ],
      transparentChance: 0,
      typeWeightsByDimension: {
        '1x1': [ ['rolly', 0.9], ['standard', 1.0] ]
      },
      typeWeightsByDimensionTransparent: {
        '1x1': []
      },
      defaultTypeByDimension: { '1x1': 'standard' }
    },
    midFloorPool: {
      randomSpawnCountChances: [
        { counts: [3], chance: 0.125 },
        { counts: [2], chance: 0.4 },
        { counts: [1], chance: 1.0 }
      ],
      dimensionChances: [
        { dimension: '1x1', chance: 1.0 }
      ],
      transparentChance: 0,
      typeWeightsByDimension: {
        '1x1': [ ['rolly', 0.9], ['standard', 1.0] ]
      },
      typeWeightsByDimensionTransparent: {
        '1x1': []
      },
      defaultTypeByDimension: { '1x1': 'standard' }
    }
  },
  {
    floorRanges: [[3,3]],
    widthRange: [6,6],     // NEW
    heightRange: [6,6],    // NEW
    maxSizeTypeCounts: {},
    typeCaps: {},
    initialPool: {
      randomSpawnCountChances: [
        { counts: [5,6], chance: 1.0 }
      ],
      dimensionChances: [
        { dimension: '1x1', chance: 1.0 }
      ],
      transparentChance: 0,
      typeWeightsByDimension: {
        '1x1': [ ['slime', 0.80], ['standard', 0.50], ['rolly', 1.0] ]
      },
      typeWeightsByDimensionTransparent: {
        '1x1': []
      },
      defaultTypeByDimension: { '1x1': 'standard' }
    },
    midFloorPool: {
      randomSpawnCountChances: [
        { counts: [1], chance: 0.55 }
      ],
      dimensionChances: [
        { dimension: '1x1', chance: 1.0 }
      ],
      transparentChance: 0,
      typeWeightsByDimension: {
        '1x1': [ ['slime', 0.80], ['standard', 0.50], ['rolly', 1.0] ]
      },
      typeWeightsByDimensionTransparent: {
        '1x1': []
      },
      defaultTypeByDimension: { '1x1': 'standard' }
    }
  },
  {
    floorRanges: [[4,4]],
    widthRange: [6,7],     // NEW
    heightRange: [6,7],    // NEW
    maxSizeTypeCounts: {},
    typeCaps: {},
    initialPool: {
      randomSpawnCountChances: [
        { counts: [6,7], chance: 1.0 }
      ],
      dimensionChances: [
        { dimension: '1x1', chance: 1.0 }
      ],
      transparentChance: 0,
      typeWeightsByDimension: {
        '1x1': [ ['bomb', 0.40], ['slime', 0.50], ['standard', 1.0] ]
      },
      typeWeightsByDimensionTransparent: {
        '1x1': []
      },
      defaultTypeByDimension: { '1x1': 'standard' }
    },
    midFloorPool: {
      randomSpawnCountChances: [
        { counts: [1], chance: 0.6 }
      ],
      dimensionChances: [
        { dimension: '1x1', chance: 1.0 }
      ],
      transparentChance: 0,
      typeWeightsByDimension: {
        '1x1': [ ['bomb', 0.40], ['slime', 0.50], ['standard', 1.0] ]
      },
      typeWeightsByDimensionTransparent: {
        '1x1': []
      },
      defaultTypeByDimension: { '1x1': 'standard' }
    }
  },
  {
    floorRanges: [[5,5]],
    widthRange: [7,7],     // NEW
    heightRange: [7,7],    // NEW
    maxSizeTypeCounts: { '2x2': 1 },
    typeCaps: { golem: 1 },
    initialPool: {
      randomSpawnCountChances: [
        { counts: [6,7], chance: 1.0 }
      ],
      dimensionChances: [
        { dimension: '2x2', chance: 1.0 },
        { dimension: '1x1', chance: 1.0 }
      ],
      transparentChance: 0,
      typeWeightsByDimension: {
        '2x2': [ ['golem', 1.0] ],
        '1x1': [ ['standard', 0.25], ['rolly', 0.333], ['slime', 0.5], ['bomb', 1.0] ]
      },
      typeWeightsByDimensionTransparent: {
        '2x2': [],
        '1x1': []
      },
      defaultTypeByDimension: { '2x2': 'golem', '1x1': 'standard' }
    },
    midFloorPool: {
      randomSpawnCountChances: [
        { counts: [3], chance: 0.125 },
        { counts: [2], chance: 0.4 },
        { counts: [1], chance: 1.0 }
      ],
      dimensionChances: [
        { dimension: '1x1', chance: 1.0 }
      ],
      transparentChance: 0,
      typeWeightsByDimension: {
        '1x1': [ ['standard', 0.25], ['rolly', 0.333], ['slime', 0.5], ['bomb', 1.0] ]
      },
      typeWeightsByDimensionTransparent: {
        '1x1': []
      },
      defaultTypeByDimension: { '1x1': 'standard' }
    }
  },
  {
    // Floor 6+: every 1x1 type unlocked, plus Golem (2x2) and, as new
    // additions beyond the original game's actual spawn behavior (see
    // file header caveat), Siren (3x3, capped at 2 alive per
    // instruction) and Sprite (1x1) at conservative low chances.
    floorRanges: [[6, Infinity]],
    widthRange: [6,8],     // NEW
    heightRange: [7,8],    // NEW
    maxSizeTypeCounts: {},
    typeCaps: { siren: 2 },
    initialPool: {
      randomSpawnCountChances: [
        { counts: [8,9,10], chance: 0.4 },
        { counts: [6,7], chance: 1.0 }
      ],
      dimensionChances: [
        { dimension: '3x3', chance: 0.05 },
        { dimension: '2x2', chance: 0.2 },
        { dimension: '1x1', chance: 1.0 }
      ],
      transparentChance: 0,
      typeWeightsByDimension: {
        '3x3': [ ['siren', 1.0] ],
        '2x2': [ ['golem', 1.0] ],
        '1x1': [ ['standard', 0.2], ['slime', 0.25], ['bomb', 0.333], ['rolly', 0.5], ['mage', 0.7], ['sprite', 1.0] ]
      },
      typeWeightsByDimensionTransparent: {
        '3x3': [],
        '2x2': [],
        '1x1': []
      },
      defaultTypeByDimension: { '3x3': 'siren', '2x2': 'golem', '1x1': 'standard' }
    },
    midFloorPool: {
      randomSpawnCountChances: [
        { counts: [3], chance: 0.125 },
        { counts: [2], chance: 0.4 },
        { counts: [1], chance: 1.0 }
      ],
      dimensionChances: [
        { dimension: '3x3', chance: 0.025 },
        { dimension: '2x2', chance: 0.25 },
        { dimension: '1x1', chance: 1.0 }
      ],
      transparentChance: 0,
      typeWeightsByDimension: {
        '3x3': [ ['siren', 1.0] ],
        '2x2': [ ['golem', 1.0] ],
        '1x1': [ ['standard', 0.2], ['slime', 0.25], ['bomb', 0.333], ['rolly', 0.5], ['mage', 0.7], ['sprite', 1.0] ]
      },
      typeWeightsByDimensionTransparent: {
        '3x3': [],
        '2x2': [],
        '1x1': []
      },
      defaultTypeByDimension: { '3x3': 'siren', '2x2': 'golem', '1x1': 'standard' }
    }
  }
];