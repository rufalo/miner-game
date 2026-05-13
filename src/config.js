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
