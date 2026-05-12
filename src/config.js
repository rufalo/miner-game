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
  basePulseFireRate: 0.9,         // shots / second
  basePulseDamage: 4,
  basePulseRange: 280,
};

export const GREEN = {
  speedBonusPerValue: 0.035,      // +3.5% speed per yellow.value... wait, green
};

export const YELLOW = {
  cargoBonusPerValue: 1,          // +1 cap per yellow.value
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
  /** Fewer zones per ring so clusters sit farther apart on the bigger map. */
  zonesPerTier: 5,
  enemiesPerZoneMin: 2,
  enemiesPerZoneMax: 3,
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
