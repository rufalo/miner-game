import Phaser from 'phaser';
import { UPGRADES } from '../config.js';

/**
 * RecipeUpgrades
 *
 * Per-upgrade behavior. Two kinds:
 *
 *   1. Stat / passive upgrades (e.g. speed, shield, armor, regen) mutate
 *      player state when first installed and during their `tick` (regen, etc).
 *      They don't fire projectiles.
 *
 *   2. Weapon upgrades (turret, sniper, laser, missile, etc) install an
 *      armament that the player ticks every frame; the armament finds a
 *      target and spawns bullets / missiles when ready.
 *
 * Both kinds are stored on `player.armaments` as a flat list so the player
 * update loop only needs one tick function.
 *
 * Each upgrade can be granted multiple times - subsequent grants TIER it up
 * (clamped to the catalog's tier array length). `installOrUpgrade` does the
 * bookkeeping and returns whether this was a tier-up or new install.
 */

const tierAt = (arr, tier) => arr[Math.min(tier - 1, arr.length - 1)];

/**
 * Install (or tier up) an upgrade on the player. Idempotent: existing
 * armaments are tiered up in place; new ones are appended. The player's
 * persistent buffs (`boosts`, max HP, max shield, etc) are recomputed at
 * the end.
 *
 * Returns the armament that was created/updated, plus a flag.
 *
 * @param {Object} player Player instance
 * @param {string} key UPGRADES key
 * @returns {{ armament: object, tier: number, wasNew: boolean }}
 */
export function installOrUpgrade(player, key) {
  const def = UPGRADES[key];
  if (!def) return null;

  let arm = player.armaments?.find(a => a.key === key);
  let wasNew = false;
  if (!arm) {
    arm = makeArmament(key);
    player.armaments.push(arm);
    wasNew = true;
  } else {
    const maxTier = (def.fireRate || def.damage || def.maxShield || def.speedMult
      || def.dashCdMult || def.mineRateMult || def.damageReduction
      || def.hpRegenPerSec || def.durationBonusMs || def.auraDps
      || def.radius || [1])?.length ?? 4;
    arm.tier = Math.min(arm.tier + 1, maxTier);
  }
  recomputePassives(player);
  return { armament: arm, tier: arm.tier, wasNew };
}

/**
 * Create a fresh armament record for an upgrade key. We seed the per-armament
 * fire timer here so newly-installed weapons don't all fire on the same frame.
 */
function makeArmament(key) {
  return {
    key,
    tier: 1,
    nextFireAt: 0,
    // Per-weapon RNG offset so volleys spread out a little.
    _jitter: Math.random() * 200,
  };
}

/**
 * Recompute everything that depends on the current set of installed
 * armaments. Called after every install/tier-up so caller doesn't have to
 * remember which buffs to refresh.
 */
export function recomputePassives(player) {
  // Reset to base values; armaments below add to these.
  player.recipeBoosts = {
    speedMult: 1,
    mineRateMult: 1,
    gaugeFillBonus: 0,
    dashCdMult: 1,
    dashIframeBonusMs: 0,
    damageReduction: 0,
    hpRegenPerSec: 0,
    overchargeDurationBonusMs: 0,
    overchargeCdMult: 1,
    dashStrike: null, // { radius, damage }
  };
  let maxShield = 0;
  let shieldRegen = 0;
  let shieldDelayMs = 99999;

  for (const arm of player.armaments) {
    const def = UPGRADES[arm.key];
    if (!def) continue;
    const t = arm.tier;
    switch (arm.key) {
      case 'speed':
        player.recipeBoosts.speedMult *= tierAt(def.speedMult, t);
        break;
      case 'harvest':
        player.recipeBoosts.mineRateMult *= tierAt(def.mineRateMult, t);
        player.recipeBoosts.gaugeFillBonus += tierAt(def.gaugeFillBonus, t);
        break;
      case 'blink':
        player.recipeBoosts.dashCdMult *= tierAt(def.dashCdMult, t);
        player.recipeBoosts.dashIframeBonusMs += tierAt(def.dashIframeBonusMs, t);
        break;
      case 'armor':
        player.recipeBoosts.damageReduction = Math.min(
          0.75,
          player.recipeBoosts.damageReduction + tierAt(def.damageReduction, t),
        );
        break;
      case 'regen':
        player.recipeBoosts.hpRegenPerSec += tierAt(def.hpRegenPerSec, t);
        break;
      case 'overcharge':
        player.recipeBoosts.overchargeDurationBonusMs += tierAt(def.durationBonusMs, t);
        player.recipeBoosts.overchargeCdMult *= tierAt(def.cdMult, t);
        break;
      case 'shield':
      case 'barrier':
        maxShield += tierAt(def.maxShield, t);
        shieldRegen += tierAt(def.regenPerSec, t);
        shieldDelayMs = Math.min(shieldDelayMs, def.regenDelayMs);
        break;
      case 'regenBarrier':
        maxShield += tierAt(def.maxShield, t);
        shieldRegen += tierAt(def.regenPerSec, t);
        shieldDelayMs = Math.min(shieldDelayMs, def.regenDelayMs);
        player.recipeBoosts.hpRegenPerSec += tierAt(def.hpRegenPerSec, t);
        break;
      case 'dashStrike':
        player.recipeBoosts.dashStrike = {
          radius: tierAt(def.radius, t),
          damage: tierAt(def.damage, t),
        };
        break;
      default:
        // Weapons / aura handled in tick.
        break;
    }
  }

  // Shield bookkeeping. Top up the current shield if our cap grew.
  const newMax = maxShield;
  if (newMax > 0) {
    const had = player.maxShield || 0;
    player.maxShield = newMax;
    player.shieldRegenPerSec = shieldRegen;
    player.shieldRegenDelayMs = shieldDelayMs;
    if (had === 0) player.shield = newMax;
    else player.shield = Math.min(newMax, (player.shield || 0) + (newMax - had));
  }
}

/**
 * Per-frame tick for every installed armament. Weapons fire on cooldown;
 * passive auras (burn) tick at their own cadence.
 *
 * Centralizing the spawn calls here keeps Player.update small and means a
 * new weapon only needs an entry in the switch below.
 */
export function tickArmaments(player, scene, time, delta) {
  for (const arm of player.armaments) {
    const def = UPGRADES[arm.key];
    if (!def) continue;
    const t = arm.tier;

    if (def.weapon) {
      if (time < arm.nextFireAt) continue;
      const rate = tierAt(def.fireRate, t);
      const damage = tierAt(def.damage, t);
      // Find a target inside this weapon's range (each weapon has its own
      // range so a Sniper can reach further than a Turret).
      const target = scene.targeting?.findNearestEnemy(player.x, player.y, def.range || 320);
      if (!target) { arm.nextFireAt = time + 120; continue; }
      const angle = Math.atan2(target.y - player.y, target.x - player.x);
      fireWeapon(player, scene, arm, def, target, angle, damage);
      arm.nextFireAt = time + 1000 / Math.max(0.01, rate);
      continue;
    }

    // Aura-type upgrades (burn DoT around player).
    if (arm.key === 'burn') {
      arm.nextFireAt = arm.nextFireAt || 0;
      if (time < arm.nextFireAt) continue;
      arm.nextFireAt = time + 200; // 5 Hz tick
      const radius = tierAt(def.auraRadius, t);
      const dps = tierAt(def.auraDps, t);
      const tickDmg = dps * 0.2;
      const r2 = radius * radius;
      scene.enemies?.getChildren?.().forEach((e) => {
        if (!e?.active) return;
        const dx = e.x - player.x, dy = e.y - player.y;
        if (dx * dx + dy * dy <= r2) e.takeDamage?.(tickDmg);
      });
      // Subtle aura ring pulse so the player can see the radius.
      if (!arm._pulse || !arm._pulse.active) {
        const c = scene.add.circle(player.x, player.y, radius, 0xff6a3a, 0.04).setDepth(-3);
        arm._pulse = c;
        scene.tweens.add({
          targets: c, alpha: 0, duration: 180,
          onComplete: () => { c.destroy(); arm._pulse = null; },
        });
      }
    }
  }
}

/**
 * Per-weapon-type spawn helpers. Each one consults the scene's existing
 * spawn methods so projectiles share physics groups / overlaps with the
 * rest of the game.
 */
function fireWeapon(player, scene, arm, def, target, angle, damage) {
  switch (arm.key) {
    case 'turret':
    case 'heavyTurret':
    case 'prism': {
      const b = scene.spawnBullet?.(player.x, player.y, angle, damage, true);
      if (b) {
        if (def.pierce) b.pierceLeft = def.pierce;
        // Prism cycles bullet tints for visual flair.
        if (arm.key === 'prism') {
          const tints = [0xff5b6d, 0xffd64a, 0x52d97a, 0x4aa9ff];
          b.setTint(tints[Math.floor(scene.time.now / 90) % tints.length]);
        }
        if (arm.key === 'heavyTurret') b.setScale(1.6, 1.6);
      }
      break;
    }
    case 'sniper': {
      const b = scene.spawnBullet?.(player.x, player.y, angle, damage, true);
      if (b) {
        b.setTint(0x9af7ff);
        b.setScale(1.4, 1.4);
        if (b.body) b.body.setVelocity(Math.cos(angle) * 1100, Math.sin(angle) * 1100);
      }
      break;
    }
    case 'laser': {
      const b = scene.spawnBullet?.(player.x, player.y, angle, damage, true);
      if (b) {
        b.setTint(0x6ddfff);
        b.setScale(1.0, 2.4);
        b.pierceLeft = def.pierce || 3;
        if (b.body) b.body.setVelocity(Math.cos(angle) * 1500, Math.sin(angle) * 1500);
      }
      // Short visible beam line so it reads as a laser.
      const beam = scene.add.line(0, 0, player.x, player.y,
        player.x + Math.cos(angle) * (def.range || 600),
        player.y + Math.sin(angle) * (def.range || 600),
        0x9af7ff, 0.7).setOrigin(0, 0).setLineWidth(2).setDepth(8);
      scene.tweens.add({ targets: beam, alpha: 0, duration: 90,
        onComplete: () => beam.destroy() });
      break;
    }
    case 'missile': {
      const count = tierAt(def.count, arm.tier);
      const spread = count > 1 ? 0.18 : 0;
      for (let i = 0; i < count; i++) {
        const off = count === 1 ? 0 : (i - (count - 1) / 2) * spread;
        scene.spawnMissile?.(player.x, player.y, angle + off, damage, 6, target, true);
      }
      break;
    }
    case 'inferno': {
      const b = scene.spawnBullet?.(player.x, player.y, angle, damage, true);
      if (b) {
        b.setTint(0xff5a5a);
        b.burn = {
          dps: tierAt(def.burnDps, arm.tier),
          durMs: def.burnMs,
        };
      }
      break;
    }
    case 'grenade': {
      // Reuse missile with a short range / fast detonation as a "grenade".
      const m = scene.spawnMissile?.(player.x, player.y, angle, damage, 8, target, true);
      if (m) {
        m.aoe = def.aoeRadius;
        m.setTint(0xff8a44);
      }
      break;
    }
    default:
      break;
  }
}

/**
 * Shield damage absorption. Returns the damage that should still hit HP
 * after the shield soaks some of it. Mutates player.shield and resets the
 * "no regen until" timer.
 */
export function absorbDamage(player, amount, now) {
  if (!player.maxShield || player.maxShield <= 0) return amount;
  if (player.shield <= 0) return amount;
  const absorbed = Math.min(amount, player.shield);
  player.shield -= absorbed;
  player.shieldHitAt = now;
  return amount - absorbed;
}

/**
 * Per-frame shield regen + HP regen tick driven by recipe boosts. Called
 * from Player.update.
 */
export function tickPassives(player, scene, time, delta) {
  const dt = delta / 1000;
  // Shield regen after a brief no-hit window.
  if (player.maxShield > 0 && player.shield < player.maxShield) {
    const last = player.shieldHitAt || 0;
    if (time - last >= (player.shieldRegenDelayMs || 3000)) {
      player._shieldCarry = (player._shieldCarry || 0) + (player.shieldRegenPerSec || 0) * dt;
      if (player._shieldCarry >= 1) {
        const add = Math.floor(player._shieldCarry);
        player._shieldCarry -= add;
        player.shield = Math.min(player.maxShield, player.shield + add);
      }
    }
  }
  // HP regen (recipe-granted, in addition to anything else).
  const regen = player.recipeBoosts?.hpRegenPerSec || 0;
  if (regen > 0 && player.hp < player.maxHP) {
    player._recipeRegenCarry = (player._recipeRegenCarry || 0) + regen * dt;
    if (player._recipeRegenCarry >= 1) {
      const heal = Math.floor(player._recipeRegenCarry);
      player._recipeRegenCarry -= heal;
      player.hp = Math.min(player.maxHP, player.hp + heal);
    }
  }
}
