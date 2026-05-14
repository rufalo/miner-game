// Central tuning. Tweak freely - everything reads from here.

export const COLORS = {
  red:    0xff4a5a,
  green:  0x52d97a,
  blue:   0x4aa9ff,
  yellow: 0xffd64a,
};

export const COLOR_KEYS = ['red', 'green', 'blue', 'yellow'];

// CSS color strings for HUD bars
export const COLORS_CSS = {
  red:    '#ff4a5a',
  green:  '#52d97a',
  blue:   '#4aa9ff',
  yellow: '#ffd64a',
};

export const WORLD = {
  size: 16000,           // square world (physics + camera bounds)
  background: 0x05060a,
  gridColor: 0x1b2030,
  gridSize: 280,
};

export const PLAYER = {
  radius: 18,
  baseSpeed: 240,
  baseHP: 60,
  baseCargo: 10,                  // start cap per color
  mineRange: 14,                  // extra reach beyond deposit radius
  mineRate: 6,                    // units / second total transfer
  invulnFlashMs: 220,
  historyPushIntervalMs: 12,      // ms between snake samples (smoother trail)
  segmentSpacingFrames: 7,        // each body part lags N sample intervals along the path
  // Extra history nodes beyond the worst-case trail length (reduces end-pinching).
  historyHeadroom: 48,

  // Dash (Space).
  dashSpeed: 720,
  dashDurationMs: 180,
  dashCooldownMs: 1600,
  dashIframeMs: 260,

  // Built-in base pulse weapon so even a chainless player can defend itself.
  basePulseFireRate: 1.7,         // shots / second
  basePulseDamage: 6,
  basePulseRange: 360,

  /**
   * Max trail (snake) segments: parts with followMode === 'trail'.
   * Orbitals / PRISM do not count. Past this cap, evolutions upgrade existing
   * trail parts instead of appending. Tune up later via meta / upgrades.
   */
  maxTailSegments: 4,
};

// --- Active abilities (Q / E) ---
// Q: Shockwave - radial AoE pulse + knockback.
export const SHOCKWAVE = {
  cooldownMs: 8000,
  radius: 220,
  damage: 28,
  knockbackSpeed: 480,     // burst velocity applied to enemies in radius
  knockbackDecayMs: 220,
  iframeMs: 180,           // brief i-frames so you can panic-cast safely
  scaleDamagePerDraft: 0.15, // each "Shockwave+" card multiplies damage by this+1
  scaleRadiusPerDraft: 0.10, // each "Shockwave+" card multiplies radius by this+1
};

// E: Overcharge - timed buff that doubles fire rate and grants +20% damage
// across ALL weapons (pulse + every body part).
export const OVERCHARGE = {
  cooldownMs: 18000,
  durationMs: 4000,
  fireRateMult: 2.0,
  damageMult: 1.20,
  durationBonusPerDraft: 1000, // each "Overcharge+" card extends duration by 1s
};

export const GREEN = {
  speedBonusPerValue: 0.035,      // +3.5% speed per green.value
};

/**
 * Yellow's role in the evolution system: each yellow part lowers ALL gauge
 * thresholds by `yellowThresholdReduction` (capped at `yellowReductionCap`).
 * The classic +cap behavior is gone; cap is now the evolution threshold.
 */
export const YELLOW = {
  cargoBonusPerValue: 0,          // legacy; no longer used (kept for compat)
};

export const BLUE = {
  // turret
  baseRange: 360,
  rangePerValue: 12,
  baseFireRate: 1.6,              // shots / second at value 1
  fireRatePerValue: 0.08,
  baseDamage: 6,
  damagePerValue: 0.8,
  bulletSpeed: 520,
  bulletLifeMs: 900,
};

export const RED = {
  // missile launcher
  baseRange: 520,
  rangePerValue: 14,
  baseFireRate: 0.45,
  fireRatePerValue: 0.03,
  baseDamage: 14,
  damagePerValue: 1.6,
  missileSpeed: 220,
  missileMaxSpeed: 360,
  missileAccel: 320,
  missileTurnRate: 3.2,           // rad / sec
  missileLifeMs: 4000,
  aoeRadius: 60,
  aoeRadiusPerValue: 4,
};

/**
 * RECIPE / CRAFTING SYSTEM
 *
 * Body parts no longer "do stuff" on their own - they are INGREDIENTS that
 * trail behind the player. When the tail fills (max 4) the ingredients are
 * consumed in a COMBINE that grants the player a permanent upgrade.
 *
 * Each color contributes 3 essence values (its primary essence is the highest).
 * Essence totals are multiplied by ingredient `value` so a value-8 blue is
 * way more powerful than a value-2 blue.
 *
 * Combine resolution (in order):
 *   1. Monochrome ultimate  - per-color threshold (red/blue default 2 for
 *      easier shooting; green/yellow default 3) -> ultimate
 *   2. Rainbow              - all 4 primary colors present        -> prism
 *   3. Special pair recipe  - two specific colors both present    -> special
 *   4. Fallback             - highest essence, with a bias toward
 *      weapon-linked essences so mixed batches still often roll guns
 *
 * Granting the same upgrade twice TIERS IT UP (T1 -> T2 -> T3 ...).
 */
export const RECIPE = {
  slots: 4,                   // tail cap == recipe slot cap

  // Held button to manually combine with fewer ingredients (still works fine
  // with 1-3 ingredients - just produces a weaker fallback upgrade).
  // 0 = disabled (auto-combine only when slots full).
  manualCombineMinSlots: 1,

  // Per-color essence contribution. Multiplied by ingredient.value at combine.
  // Primary essence is the largest; secondary/tertiary lead to natural cross
  // combos when colors are mixed.
  essences: {
    // Slightly higher weapon-primary weights so random mixes still lean guns.
    red:    { POWER: 4, HEAT: 3,    BLAST: 2 },
    blue:   { AIM: 4,   CHARGE: 2,  POWER: 1 },
    green:  { SWIFT: 3, VITAL: 2,   AIM: 1 },
    yellow: { FORTIFY: 3, HARVEST: 2, VITAL: 1 },
  },

  // Special pair recipes. Triggers when BOTH listed colors have at least
  // `minEach` ingredients present in the combine. Order matters - first match
  // wins. Put the most common shooting pairs first so they beat niche pairs.
  pairRecipes: [
    { colors: ['blue', 'red'],     minEach: 1, upgrade: 'missile',      label: 'BLUE+RED: MISSILES' },
    { colors: ['blue', 'green'],   minEach: 1, upgrade: 'sniper',       label: 'BLUE+GREEN: SNIPER' },
    { colors: ['red',  'yellow'],  minEach: 1, upgrade: 'heavyTurret',  label: 'RED+YELLOW: HEAVY TURRET' },
    { colors: ['blue', 'yellow'],  minEach: 1, upgrade: 'shield',       label: 'BLUE+YELLOW: SHIELD' },
    { colors: ['red',  'green'],   minEach: 1, upgrade: 'dashStrike',   label: 'RED+GREEN: DASH STRIKE' },
    { colors: ['green', 'yellow'], minEach: 1, upgrade: 'regenBarrier', label: 'GREEN+YELLOW: REGEN BARRIER' },
  ],

  // Monochrome: same-color count threshold. Red/blue default to 2 so LASER /
  // INFERNO show up much sooner; green/yellow stay at 3 so defensive
  // ultimates stay a bit rarer than guns.
  monoRecipes: {
    blue:   { upgrade: 'laser',    tag: 'LASER' },
    red:    { upgrade: 'inferno',  tag: 'INFERNO' },
    green:  { upgrade: 'blink',    tag: 'BLINK' },
    yellow: { upgrade: 'barrier',  tag: 'BARRIER' },
  },
  /** @deprecated use monoThresholdByColor */
  monoThreshold: 3,
  monoThresholdByColor: {
    red: 2, blue: 2, green: 3, yellow: 3,
  },

  // Essences used for shooting (fallback tie-break bias toward guns).
  weaponEssenceKeys: ['POWER', 'AIM', 'HEAT', 'BLAST', 'CHARGE'],
  /** Multiplier on weapon essence totals when picking fallback winner (>1 = guns win ties). */
  weaponEssenceBias: 1.45,

  // All 4 primary colors present in the combine.
  rainbow: { upgrade: 'prism', label: 'RAINBOW: PRISM' },

  // Fallback: highest summed essence -> upgrade. Order also defines tie-break.
  fallbackByEssence: {
    POWER:   'turret',
    AIM:     'sniper',
    HEAT:    'burn',
    CHARGE:  'overcharge',
    BLAST:   'grenade',
    SWIFT:   'speed',
    VITAL:   'regen',
    FORTIFY: 'armor',
    HARVEST: 'harvest',
  },
};

/**
 * Upgrade catalog. Each entry describes one persistent player upgrade.
 *
 * Fields:
 *   label        : HUD display name
 *   color        : tint for the upgrade pill in the HUD
 *   weapon       : true if this upgrade installs an armament that fires from
 *                  the player each tick. If true, `fire` is called inside
 *                  Player.tickArmaments at each cooldown.
 *   maxTier      : tier cap. Each combine that resolves to this upgrade tiers
 *                  it up; tier > maxTier just refunds a small bonus elsewhere
 *                  (handled in RecipeSystem).
 *
 * Tier-specific tunings live inside each `apply()` / `fire()` body so adding
 * a new upgrade only touches this file + UPGRADES.
 */
export const UPGRADES = {
  // --- Weapon modules (fire from player) ---
  turret: {
    label: 'Turret',   color: 0x4aa9ff, weapon: true,
    fireRate: [1.4, 1.9, 2.5, 3.2],
    damage:   [10,  15,  21,  30],
    range:    260,
  },
  sniper: {
    label: 'Sniper',   color: 0x9af7ff, weapon: true,
    fireRate: [0.55, 0.8, 1.1, 1.5],
    damage:   [40,   60,  85,  120],
    range:    520,
    critMult: 2,
  },
  laser: {
    label: 'Laser',    color: 0x6ddfff, weapon: true,
    // Laser fires a fast hitscan-style beam (high fire rate, piercing bullet).
    fireRate: [3.0, 4.0, 5.0, 6.0],
    damage:   [8,   12,  17,  24],
    range:    640,
    pierce:   3,
  },
  missile: {
    label: 'Missiles', color: 0xff7a3a, weapon: true,
    fireRate: [0.85, 1.1, 1.4, 1.8],
    damage:   [28,   40,  56,  78],
    range:    420,
    count:    [1, 1, 2, 2],
  },
  heavyTurret: {
    label: 'Heavy Turret', color: 0xffa64a, weapon: true,
    fireRate: [0.9, 1.2, 1.5, 1.9],
    damage:   [22, 32, 46, 64],
    range:    320,
    pierce:   1,
  },
  inferno: {
    label: 'Inferno',  color: 0xff5a5a, weapon: true,
    fireRate: [1.6, 2.2, 2.8, 3.5],
    damage:   [16,  22,  30,  40],
    range:    280,
    burnDps:  [12, 18, 26, 36],
    burnMs:   2400,
  },
  grenade: {
    label: 'Grenade',  color: 0xff8a44, weapon: true,
    fireRate: [0.7, 0.95, 1.25, 1.6],
    damage:   [24, 34, 48, 66],
    range:    340,
    aoeRadius: 90,
  },
  prism: {
    label: 'Prism',    color: 0xffffff, weapon: true,
    // Prism fires 3 bullets in different colors; high fire rate.
    fireRate: [2.2, 3.0, 3.8, 4.6],
    damage:   [12, 18, 25, 34],
    range:    340,
  },
  burn: {
    label: 'Burn',     color: 0xff6a3a, weapon: false,
    // Damages enemies within radius continuously.
    auraRadius: [120, 160, 200, 240],
    auraDps:    [10,  16,  24,  34],
  },
  // --- Passive / defensive ---
  shield: {
    label: 'Shield',   color: 0xb0e7ff, weapon: false,
    // Absorb HP layer that regenerates over time.
    maxShield:   [25, 45, 70, 100],
    regenPerSec: [3,  5,  8,  12],
    regenDelayMs: 3500,
  },
  barrier: {
    label: 'Barrier',  color: 0xffe27a, weapon: false,
    // Bigger, slower-regen shield.
    maxShield:   [60, 100, 150, 220],
    regenPerSec: [4,  6,   9,   13],
    regenDelayMs: 5000,
  },
  regenBarrier: {
    label: 'Regen Barrier', color: 0xa8e88a, weapon: false,
    // Smaller shield + HP regen. Hybrid green+yellow.
    maxShield:   [20, 35, 55, 80],
    regenPerSec: [4,  6,  9,  13],
    regenDelayMs: 2800,
    hpRegenPerSec: [1, 2, 3, 5],
  },
  armor: {
    label: 'Armor',    color: 0xc0b070, weapon: false,
    // % incoming damage reduction.
    damageReduction: [0.10, 0.18, 0.28, 0.40],
  },
  regen: {
    label: 'Regen',    color: 0x8aef7a, weapon: false,
    hpRegenPerSec: [2, 4, 6, 9],
  },
  // --- Stat-only ---
  speed: {
    label: 'Speed',    color: 0x52d97a, weapon: false,
    speedMult: [1.10, 1.20, 1.32, 1.48],
  },
  blink: {
    label: 'Blink',    color: 0x6effa0, weapon: false,
    // Reduces dash cooldown and increases iframe duration on dash.
    dashCdMult:  [0.85, 0.72, 0.60, 0.48],
    dashIframeBonusMs: [60, 120, 180, 260],
  },
  harvest: {
    label: 'Harvest',  color: 0xffd64a, weapon: false,
    mineRateMult: [1.20, 1.40, 1.65, 2.00],
    gaugeFillBonus: [0.10, 0.20, 0.32, 0.50],
  },
  overcharge: {
    label: 'Overcharge', color: 0xffe27a, weapon: false,
    // Improves the E ability rather than firing on its own.
    durationBonusMs: [600, 1400, 2400, 3600],
    cdMult:          [0.92, 0.82, 0.70, 0.58],
  },
  dashStrike: {
    label: 'Dash Strike', color: 0xff9aa0, weapon: false,
    // Shockwave fires automatically at the start of every dash.
    radius: [110, 150, 190, 230],
    damage: [16, 24, 34, 48],
  },
};

/**
 * DYNAMIC ZONES
 *
 * A roaming roster of timed zones the ZoneSystem spawns periodically. Each
 * zone has a lifecycle (grow -> stable -> shrink -> gone) and a `type` that
 * drives its effect:
 *
 *   danger : tints orange, ticks DoT to anything inside (player + enemies)
 *   bloom  : tints green, periodically spawns extra mineral deposits inside
 *   storm  : tints purple, slows movement + occasional lightning damage
 *
 * Zones add agency: avoid danger spots (or kite enemies into them), camp
 * bloom spots while they last, push through storms for shortcuts. They
 * arrive without explicit player input so the world keeps changing.
 */
export const ZONES = {
  // System-wide pacing.
  maxActive: 6,                // hard cap on simultaneous zones
  spawnIntervalMs: 12000,      // base time between spawn attempts
  initialDelayMs: 8000,        // first zone shows up this long after run start

  // Common lifecycle (per-type overrides below).
  growMs:   2500,
  shrinkMs: 2500,

  // Per-type tuning. `weight` biases the spawn lottery so bloom is most
  // common, danger second, storm rarest.
  types: {
    danger: {
      weight: 3,
      radius: 180,
      radiusJitter: 60,
      stableMs: [22000, 38000],
      tickHz: 4,
      dpsToPlayer: 8,
      dpsToEnemies: 14,        // a kite-into-zone tactic should work
      tintFill: 0xff5a2a,
      tintRing: 0xff8a3a,
      fillAlpha: 0.10,
      ringAlpha: 0.55,
      label: 'TOXIC POOL',
    },
    bloom: {
      weight: 4,
      radius: 200,
      radiusJitter: 60,
      stableMs: [18000, 30000],
      spawnIntervalMs: 4500,    // new mineral chunk inside every X ms
      maxMineralsInside: 5,
      mineralValueMin: 3,
      mineralValueMax: 7,
      tintFill: 0x6dffae,
      tintRing: 0x8aff7a,
      fillAlpha: 0.10,
      ringAlpha: 0.50,
      label: 'BLOOM',
    },
    storm: {
      weight: 2,
      radius: 230,
      radiusJitter: 60,
      stableMs: [16000, 26000],
      tickHz: 1,                // 1 Hz lightning strike
      strikeDamage: 10,
      strikeChance: 0.45,       // chance per tick a strike happens at all
      slowMult: 0.65,           // player speed mult while inside
      tintFill: 0x7a6bff,
      tintRing: 0xb0a8ff,
      fillAlpha: 0.08,
      ringAlpha: 0.55,
      label: 'STORM',
    },
  },
};

/**
 * PATROL ENEMIES
 *
 * Roaming guards that walk a fixed loop until they detect the player. Once
 * triggered they switch to pursuit; if they lose sight for long enough they
 * walk back to their route and resume the patrol.
 */
export const PATROL = {
  perTier: 2,                  // patroller routes seeded per tier ring
  waypointCount: [3, 5],       // patrols pick this many waypoints
  routeRadius: 380,            // max distance any waypoint sits from route center
  speedPatrol: 75,
  speedChase: 165,
  hpBase: 28,
  hpPerTier: 14,
  damage: 8,
  contactCooldownMs: 600,
  detectRange: 320,            // distance at which patroller spots the player
  loseSightRange: 540,         // beyond this, alert timer ticks down
  alertDecayMs: 2800,          // ms outside loseSightRange before reverting to patrol
  waypointArriveDist: 28,
  // Visual: a brief ! symbol when alerted, ? when losing track.
};

/**
 * Automatic world hazards / authored landmarks. Each tier ring seeds a few
 * boulder pits that telegraph + lob arcing AoE rocks at the player.
 *
 * Pits also damage enemies caught in the AoE - kite hunters/zone enemies
 * across one and the world fights itself for a moment.
 */
export const LANDMARK = {
  pit: {
    perTier: 2,                  // boulder pits per tier ring
    sizePx: 70,
    aggroRange: 720,             // only fires within this distance of player
    intervalMin: 5500,           // ms between eruptions
    intervalMax: 9500,
    telegraphMs: 1100,           // warning ring lifetime
    boulderArcMs: 1100,          // flight time start -> impact
    boulderRadius: 110,          // impact AoE
    boulderDamage: 22,
    boulderKnockback: 360,
    hp: 220,                     // can be destroyed for a mineral reward
    hpPerTier: 60,
    rewardCountMin: 3,           // mineral drops on destruction
    rewardCountMax: 5,
    rewardValueMin: 4,
    rewardValueMax: 9,
  },
};

/**
 * Non-hostile actors. Walk around mining deposits like the player. Stay
 * neutral until attacked, at which point they enrage into a chaser-like
 * threat. Drop a small mineral chunk on death.
 */
export const NEUTRAL = {
  miner: {
    perTier: 3,                  // neutral miners seeded per tier ring
    speed: 90,
    enragedSpeed: 165,
    hp: 26,
    hpPerTier: 8,
    drainRate: 2.4,              // mineral units / sec drained from deposits
    drainRange: 18,              // extra reach beyond deposit radius
    rescanIntervalMs: 1500,
    enragedDamage: 6,
    enragedContactCooldownMs: 600,
    dropMineralValue: 3,
  },
};

/**
 * CHAIN STRUCTURES — visitable world objects that reshape the ingredient tail.
 * Stand inside and touch the structure; after `cooldownMs` you can use it
 * again. Effects only apply to primary-color trail ingredients (red/green/
 * blue/yellow); hybrid kinds are skipped.
 *
 * Types (see GameScene.applyChainStructure for behavior):
 *   solar_conflux   — all blue -> yellow
 *   verdant_well    — all yellow -> green
 *   prism_spire     — every part steps one step in RGBY cycle
 *   ruby_cyan_gate  — red <-> blue swap on each part
 *   chaos_orb       — shuffle all part colors randomly
 *   core_forge      — +2 value on one random part
 *   fracture_anvil  — merge two lowest-value parts into one (sum values)
 *   twin_echo       — duplicate weakest part if tail has room, else +1 value on weakest
 */
export const STRUCTURES = {
  cooldownMs: 13000,
  /** Extra reach beyond half display widths for "standing in" the structure. */
  interactRange: 44,
  innerCount: 2,               // seeded inside safe radius (near early play)
  perTier: 1,                  // one random structure per outer tier ring
  displaySize: 46,
  defs: {
    solar_conflux:  { weight: 3, tint: 0xffe066, label: 'SOLAR CONFLUX' },
    verdant_well:   { weight: 2, tint: 0x5cff8a, label: 'VERDANT WELL' },
    prism_spire:    { weight: 3, tint: 0xf0f4ff, label: 'PRISM SPIRE' },
    ruby_cyan_gate: { weight: 2, tint: 0xff5ec7, label: 'RUBY/CYAN GATE' },
    chaos_orb:      { weight: 2, tint: 0xc4a8ff, label: 'CHAOS ORB' },
    core_forge:     { weight: 3, tint: 0xff8a44, label: 'CORE FORGE' },
    fracture_anvil: { weight: 2, tint: 0x8a9aaa, label: 'FRACTURE ANVIL' },
    twin_echo:      { weight: 2, tint: 0xa8dcff, label: 'TWIN ECHO' },
  },
};

export const BODY_PART = {
  baseSize: 8,                    // px per side at value 0
  sizePerValue: 2,
  hpBase: 18,
  hpPerValue: 4,
};

/**
 * Evolution system: cargo bars are now gauges. When a gauge reaches its
 * threshold (cargo.cap), it consumes the cargo and triggers growth.
 *  - First few times you fill a color, a new segment of that color is appended
 *    to the snake.
 *  - Past `upgradeAtPartCount` parts of the color, growth instead upgrades the
 *    weakest matching part.
 *  - If another color's gauge is at >= `hybridGaugeMin` when one fills, both
 *    are consumed and a HYBRID part is spawned (recipes in HYBRIDS below).
 */
/**
 * Mark tier system. A part's `mark` (1..4) is derived from its accumulated
 * `value`. Each promotion unlocks a qualitative ability instead of just bigger
 * numbers. The set of abilities per `kind` is defined in MARK_ABILITIES.
 */
export const MARK = {
  thresholds: [0, 8, 18, 32],     // value >= thresholds[i] -> mark = i+1
  promoteShakeMs: 120,
};

/**
 * Per-kind unlocks at each mark. Used by BodyPart.applyMarkAbilities() to set
 * flags read by the weapon dispatcher and update loop. Anything not declared
 * here is treated as "no extra effect" at that mark.
 */
export const MARK_ABILITIES = {
  turret:  { 2: { multishot: 1 }, 3: { pierce: 1 }, 4: { critChance: 0.25 } },
  missile: { 2: { multishot: 1 }, 3: { burn: { dps: 4, durMs: 1500 } }, 4: { fireRateMult: 1.20 } },
  speed:   { 2: { regenHpPerSec: 0.40 }, 3: { auraDps: 4, auraRadius: 80 }, 4: { dashEchoMs: 1000 } },
  cargo:   { 2: { gaugeFillBonus: 0.05 }, 3: { lifestealPer5: 1 }, 4: { doublePickupChance: 0.08 } },
  plasma:  { 2: { pierce: 1 }, 3: { onHitAoeRadius: 60, onHitAoeDamageMult: 0.35 }, 4: { damageMult: 1.25 } },
  swarm:   { 2: { multishot: 1 }, 3: { burn: { dps: 3, durMs: 1200 } }, 4: { damageMult: 1.25 } },
  rapid:   { 2: { pierce: 1 }, 3: { fireRateMult: 1.25 }, 4: { critChance: 0.25 } },
  prism:   { 2: { damageMult: 1.20 }, 3: { fireRateMult: 1.20 }, 4: { pierce: 1 } },
};

/**
 * Set bonuses computed in Player.chainChanged() based on attached part colors.
 * Threshold = how many of that color it takes to activate.
 */
export const SET_BONUSES = {
  red:    { count: 3, key: 'pyrotechnician', missileAoeMult: 1.15 },
  blue:   { count: 3, key: 'marksman',        turretRangeMult: 1.15 },
  green:  { count: 3, key: 'greased',         passiveRegenHpPerSec: 0.5 },
  yellow: { count: 3, key: 'logistics',       preferredMineBonus: 0.10 },
  // Polychrome: at least 1 of each primary color attached.
  polychrome: { key: 'polychrome', damageMult: 1.05, speedMult: 1.05 },
};

export const EVOLUTION = {
  baseThreshold: 16,              // first evolution of a color needs this much
  thresholdPerEvolution: 10,      // each evolution of that color makes the next cost more
  /**
   * Global ramp: each evolution event (append OR upgrade, any color) also
   * bumps the threshold of every gauge by this much. Compounds with the
   * per-color ramp above so even repeatedly upgrading the same color makes
   * the whole snake harder to grow further.
   */
  thresholdPerGlobalEvolution: 5,
  upgradeAtPartCount: 3,          // past this many same-color parts, upgrades instead
  upgradeValueIncrement: 2,       // how much value an upgrade adds to the chosen part
  baseValue: 4,                   // starting `value` of a new evolution part
  valuePerEvolution: 1,           // +value for each prior evolution of the color
  hybridGaugeMin: 0.8,            // partner gauge must be at >= 80% to fuse
  preferredMineMultiplier: 1.35,  // when this color is "preferred" (keys 1-4)
  yellowThresholdReduction: 0.04, // each yellow part reduces all thresholds by 4%
  yellowReductionCap: 0.45,       // hard cap at 45% reduction
  haloThreshold: 0.8,             // visual halo + glow starts at this gauge ratio
};

/** Behavior kind per primary color (drives BodyPart logic). */
export const KIND_BY_COLOR = {
  red: 'missile',
  blue: 'turret',
  green: 'speed',
  yellow: 'cargo',
};

/**
 * Hybrid recipes. Keys are alphabetically sorted "a+b". Each defines a unique
 * behavior `kind` plus visual `tint` and `label`.
 *
 *  - plasma (blue+red)   : slow, high-damage single shot (long range)
 *  - swarm  (green+red)  : rapid small homing missiles
 *  - rapid  (blue+green) : very high fire-rate weak bullets
 */
export const HYBRIDS = {
  'blue+red':   { kind: 'plasma', tint: 0xb14aff, label: 'PLASMA' },
  'green+red':  { kind: 'swarm',  tint: 0xff9b3a, label: 'SWARM' },
  'blue+green': { kind: 'rapid',  tint: 0x4affd9, label: 'RAPID' },
};

/** Tunables for hybrid weapon behaviors. */
export const HYBRID_STATS = {
  plasma: {
    baseFireRate: 0.45,
    fireRatePerValue: 0.03,
    baseRange: 540,
    rangePerValue: 12,
    baseDamage: 20,
    damagePerValue: 2.2,
    bulletScale: 1.8,
    bulletSpeed: 460,
    lifeMs: 1100,
  },
  swarm: {
    baseFireRate: 1.4,
    fireRatePerValue: 0.06,
    baseRange: 380,
    rangePerValue: 10,
    baseDamage: 6,
    damagePerValue: 0.9,
    aoeRadius: 36,
    aoeRadiusPerValue: 2,
  },
  rapid: {
    baseFireRate: 4.0,
    fireRatePerValue: 0.18,
    baseRange: 300,
    rangePerValue: 8,
    baseDamage: 2.2,
    damagePerValue: 0.4,
  },
};

export const MINERAL = {
  baseRadius: 4,
  radiusPerValue: 2.5,
  innerValueMin: 2,
  innerValueMax: 10,
  outerValueMin: 5,
  outerValueMax: 15,
  /** Deposits spawned per color in the inner safe zone (lower = sparser). */
  innerPerColor: 9,
  outerCountPerZone: 1,           // per enemy zone
};

export const PICKUP = {
  baseSize: 8,
  sizePerValue: 2,
  innerValueMin: 5,
  innerValueMax: 15,
  innerCount: 8,                  // body-part pickups in inner safe zone (spread across area)
  outerCountPerZone: 1,
  pickupRange: 14,
};

export const TIER = {
  // Sized so tier-4 outer ring stays inside WORLD.size / 2 (~8000 with size 16000).
  safeRadius: 2000,
  ringWidth: 1400,
  maxTier: 4,
};

export const ENEMY = {
  /** Zones per ring. Higher = more clusters around each ring. */
  zonesPerTier: 7,
  enemiesPerZoneMin: 3,
  enemiesPerZoneMax: 5,
  // shared
  aggroRange: 360,
  deAggroRange: 720,
  // chaser
  chaserSpeed: 130,
  chaserHP: 22,
  chaserDamage: 8,
  chaserContactCooldownMs: 600,
  // dasher
  dasherSpeed: 150,
  dasherDashSpeed: 460,
  dasherHP: 26,
  dasherDamage: 12,
  dasherDashChargeMs: 500,
  dasherDashDurationMs: 350,
  dasherDashCooldownMs: 2200,
  // gunner
  gunnerSpeed: 90,
  gunnerHP: 18,
  gunnerRange: 360,
  gunnerKeepDistance: 260,
  gunnerFireRate: 1.1,
  gunnerBulletDamage: 6,
  gunnerBulletSpeed: 380,
  // missile
  missileEnemySpeed: 70,
  missileEnemyHP: 24,
  missileEnemyRange: 520,
  missileEnemyKeepDistance: 380,
  missileEnemyFireRate: 0.35,
  missileEnemyDamage: 16,
  // brute
  bruteSpeed: 70,
  bruteHP: 90,
  bruteDamage: 22,
  bruteContactCooldownMs: 900,
  bruteKnockback: 320,
  /** Idle patrol radius around home (px). */
  wanderRadiusMin: 160,
  wanderRadiusMax: 320,

  // --- Persistent hunters (no home, always seek the player) ---
  hunterSpeed: 155,
  hunterHP: 36,
  hunterDamage: 11,
  hunterContactCooldownMs: 650,

  // --- Swarmers (small fast melee, spawned in packs) ---
  swarmerSpeed: 220,
  swarmerHP: 6,
  swarmerDamage: 5,
  swarmerContactCooldownMs: 450,

  // --- Splitter (large, slow; spawns minions on death) ---
  splitterSpeed: 80,
  splitterHP: 70,
  splitterDamage: 12,
  splitterContactCooldownMs: 800,
  splitterMinionCount: 3,
  splitterMinionHP: 10,
  splitterMinionSpeed: 200,
  splitterMinionDamage: 5,

  // --- Sniper (very long range, telegraphed beam, fragile) ---
  sniperSpeed: 70,
  sniperHP: 16,
  sniperRange: 900,
  sniperKeepDistance: 720,
  sniperFireRate: 0.45,             // attempts per second (beam volleys)
  sniperTelegraphMs: 1200,
  sniperBeamSpeed: 1500,            // fast "bullet" used for the beam
  sniperBeamDamage: 22,

  // --- Bomber (kamikaze, low HP, explodes on contact OR death) ---
  bomberSpeed: 130,
  bomberHP: 14,
  bomberExplodeRadius: 90,
  bomberExplodeDamage: 22,
  bomberFuseRadius: 50,             // auto-detonate within this distance
};

/**
 * Hunter spawner: persistent threat system. Maintains a target number of
 * active hunters that always seek the player, plus periodic swarmer waves.
 * Pressure scales with run time and max tier reached.
 */
export const HUNTER = {
  /** Target = base + perMinute * elapsedMinutes + perTier * maxTier (clamped). */
  baseCount: 2,
  perMinute: 0.9,
  perTier: 0.7,
  maxCount: 14,

  /** Min ms between hunter spawn attempts (when below target). */
  spawnIntervalMs: 7000,
  spawnIntervalMinMs: 2500,
  spawnIntervalDropPerTier: 800,

  /** Distance off-screen to spawn hunters (units). */
  spawnDistance: 720,

  /** Periodic swarmer wave. */
  swarmIntervalMinMs: 35000,
  swarmIntervalMaxMs: 60000,
  swarmFirstWaveDelayMs: 25000,
  swarmCountMin: 5,
  swarmCountMax: 9,
  swarmTierBonus: 2,              // +N swarmers per tier reached
};

/**
 * Combo system: parts can auto-merge or unlock alternative follow patterns.
 *  - STACK   : 2 adjacent trail parts of the same weapon color fuse into one
 *              ORBITAL part that keeps the same weapon kind but fires faster.
 *  - RAINBOW : having at least one part of every primary color in the chain
 *              spawns a PRISM orbital that fires multi-color spread shots.
 *  - BRANCH  : once `branchAtParts` trail parts are attached, all additional
 *              segments alternate to either side of the trail to form a
 *              split-tail (visual offset, no extra parts).
 */
export const COMBO = {
  // First `branchAtParts` trail indices stay on the spine; higher indices get
  // alternating lateral offset. With a small max tail (4), use 2 so the last
  // two segments visibly split before you hit the cap.
  branchAtParts: 2,
  branchLateralPx: 26,               // perpendicular offset of branched parts

  stackFireRateMult: 1.55,           // orbital twin fires this much faster
  stackDamageMult: 1.30,
  stackOrbitRadius: 46,
  stackOrbitSpeed: 2.2,               // rad / sec

  rainbowOrbitRadius: 78,
  rainbowOrbitSpeed: 1.05,
  prismFireRate: 1.2,                // shots / sec
  prismRange: 380,
  prismBaseDamage: 7,
  prismDamagePerValue: 0.5,
  prismFanRadians: 0.55,              // total fan width across 4 shots
  prismValue: 8,
};

/**
 * Draft-pick system: every `everyNEvolutions` growth events, the game pauses
 * and offers the player `optionCount` random upgrade / maintenance cards.
 */
export const DRAFT = {
  everyNEvolutions: 5,            // one draft pick every 5 growth events
  optionCount: 3,
};

/**
 * Tier mini-boss anchored to each outer ring (tiers 1..maxTier). One per tier
 * at run-seed time. Defeating a boss drops a guaranteed draft pick and a
 * burst of high-value minerals. Stats scale by tier.
 */
export const BOSS = {
  baseHP: 260,
  hpPerTier: 220,
  speed: 60,
  berserkSpeedMult: 1.9,
  berserkHpRatio: 0.30,           // <= 30% HP enters berserk

  aggroRange: 760,
  displaySize: 70,

  contactDamage: 18,
  contactCooldownMs: 700,

  // Ring shot
  ringFireIntervalMs: 4200,
  ringBulletCount: 10,
  ringBulletSpeed: 280,
  ringBulletDamage: 6,
  ringTelegraphMs: 700,

  // Missile barrage
  barrageIntervalMs: 6500,
  barrageMissileCount: 3,
  barrageMissileDamage: 14,
  barrageMissilePartValue: 4,
  barrageTelegraphMs: 900,

  // Reward
  mineralValueMin: 12,
  mineralValueMax: 16,
  mineralDropCount: 4,            // one per primary color (R/G/B/Y)
  mineralScatterPx: 80,
};

/**
 * Subtle background tint per tier so the player feels progression outward.
 * Tier 0 (safe zone) is just the world background; tiers 1..N are drawn
 * as concentric rings beneath the grid.
 */
export const BIOME = {
  // Hex tints (RGB blended onto WORLD.background at low alpha).
  tierColors: [0x0a1422, 0x141026, 0x261020, 0x261812],
  ringAlpha: 0.55,
};

export const HUD = {
  barWidth: 160,
  barHeight: 14,
  margin: 14,
};

export const MINIMAP = {
  size: 200,              // px square
  margin: 14,
  background: 0x05060a,
  border: 0x2a3548,
  ringColor: 0x2a3548,
  enemyZoneColor: 0xff5b6d,
  pickupColor: 0xffd64a,
  playerColor: 0xffffff,
  alpha: 0.85,
};
