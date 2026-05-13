import Phaser from 'phaser';
import { BODY_PART, COLORS, BLUE, RED, PLAYER, KIND_BY_COLOR, HYBRID_STATS, COMBO, OVERCHARGE } from '../config.js';

// Tint cycle for the PRISM orbital.
const PRISM_TINT_CYCLE = [0xff5b6d, 0xffd64a, 0x52d97a, 0x4aa9ff];

/**
 * Body segment. `color` is its identifier (red/blue/green/yellow or a hybrid
 * kind like 'plasma'); `kind` drives weapon/passive behavior. For non-hybrid
 * parts, kind defaults to KIND_BY_COLOR[color].
 *
 * Construction options:
 *   {
 *     color, value, kind?, tint?,
 *     followMode?,        // 'trail' (default) | 'orbit'
 *     lateralOffset?,     // perpendicular offset for split-tail parts
 *     orbitRadius?,       // px distance from player when orbiting
 *     orbitSpeed?,        // rad/sec
 *     orbitStartAngle?,   // initial orbit angle
 *     sizeMult?,          // visual scale multiplier (used for prism/twin)
 *   }
 */
export class BodyPart extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, player, chainIndex, opts) {
    const followMode = opts.followMode || 'trail';
    const orbitRadius = opts.orbitRadius ?? 50;
    const orbitStartAngle = opts.orbitStartAngle ?? 0;

    let sx, sy;
    if (followMode === 'orbit') {
      sx = player.x + Math.cos(orbitStartAngle) * orbitRadius;
      sy = player.y + Math.sin(orbitStartAngle) * orbitRadius;
    } else {
      const s = player.getSnakeTrailPoint(BodyPart.trailFloatSeg(chainIndex, player));
      sx = s.x;
      sy = s.y;
    }
    super(scene, sx, sy, 'square');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.player = player;
    this.color = opts.color;
    this.kind = opts.kind || KIND_BY_COLOR[opts.color] || opts.color;
    this.tint = opts.tint ?? (COLORS[opts.color] ?? 0xffffff);
    this.value = opts.value;
    this.chainIndex = chainIndex;

    // Follow / formation state.
    this.followMode = followMode;
    this.lateralOffset = opts.lateralOffset || 0;
    this.orbitRadius = orbitRadius;
    this.orbitSpeed = opts.orbitSpeed ?? 1.6;
    this.orbitAngle = orbitStartAngle;
    this.sizeMult = opts.sizeMult ?? 1;

    this.applySize();
    this.body.setSize(64, 64);
    this.body.allowGravity = false;
    this.body.setImmovable(true);

    this.setTint(this.tint);
    this.setDepth(this.followMode === 'orbit' ? 5 : -1 - chainIndex);

    this.maxHP = BODY_PART.hpBase + this.value * BODY_PART.hpPerValue;
    this.hp = this.maxHP;

    this.nextFireAt = 0;
    this.applyKindStats();
  }

  applySize() {
    const size = (BODY_PART.baseSize + this.value * BODY_PART.sizePerValue) * (this.sizeMult || 1);
    this.setDisplaySize(size, size);
  }

  /**
   * Recomputes weapon stats from `value` and `kind`. Called when constructed
   * and again whenever the part is upgraded.
   */
  applyKindStats() {
    switch (this.kind) {
      case 'turret':
        this.fireRate = BLUE.baseFireRate + this.value * BLUE.fireRatePerValue;
        this.range    = BLUE.baseRange    + this.value * BLUE.rangePerValue;
        this.damage   = BLUE.baseDamage   + this.value * BLUE.damagePerValue;
        break;
      case 'missile':
        this.fireRate = RED.baseFireRate + this.value * RED.fireRatePerValue;
        this.range    = RED.baseRange    + this.value * RED.rangePerValue;
        this.damage   = RED.baseDamage   + this.value * RED.damagePerValue;
        break;
      case 'plasma': {
        const s = HYBRID_STATS.plasma;
        this.fireRate = s.baseFireRate + this.value * s.fireRatePerValue;
        this.range    = s.baseRange    + this.value * s.rangePerValue;
        this.damage   = s.baseDamage   + this.value * s.damagePerValue;
        break;
      }
      case 'swarm': {
        const s = HYBRID_STATS.swarm;
        this.fireRate = s.baseFireRate + this.value * s.fireRatePerValue;
        this.range    = s.baseRange    + this.value * s.rangePerValue;
        this.damage   = s.baseDamage   + this.value * s.damagePerValue;
        break;
      }
      case 'rapid': {
        const s = HYBRID_STATS.rapid;
        this.fireRate = s.baseFireRate + this.value * s.fireRatePerValue;
        this.range    = s.baseRange    + this.value * s.rangePerValue;
        this.damage   = s.baseDamage   + this.value * s.damagePerValue;
        break;
      }
      case 'prism':
        this.fireRate = COMBO.prismFireRate;
        this.range    = COMBO.prismRange;
        this.damage   = COMBO.prismBaseDamage + this.value * COMBO.prismDamagePerValue;
        break;
      default:
        // Passive parts (speed / cargo): no weapon stats.
        break;
    }

    // Stack-fused parts get a fire-rate / damage boost on top of base kind.
    if (this.stackBoost) {
      this.fireRate *= COMBO.stackFireRateMult;
      this.damage   *= COMBO.stackDamageMult;
    }

    // Draft-card persistent boosts. Apply by color so "red damage" hits
    // missiles + swarm (red-derived), "blue fire rate" hits turret + rapid +
    // plasma + prism (blue-derived).
    const b = this.player?.boosts;
    if (b && this.damage != null) {
      const RED_KINDS  = new Set(['missile', 'swarm', 'plasma']);
      const BLUE_KINDS = new Set(['turret', 'rapid', 'plasma', 'prism']);
      if (RED_KINDS.has(this.kind))  this.damage   *= b.redDamageMult || 1;
      if (BLUE_KINDS.has(this.kind)) this.fireRate *= b.blueFireRateMult || 1;
    }
  }

  /**
   * Bumps `value` by `by`, refreshes size, HP and weapon stats, and plays a
   * brief grow-shrink tween.
   */
  upgradeValue(by) {
    this.value += by;
    this.applySize();
    this.maxHP = BODY_PART.hpBase + this.value * BODY_PART.hpPerValue;
    this.hp = this.maxHP;
    this.applyKindStats();
    const baseScale = this.scaleX;
    this.scene.tweens.add({
      targets: this,
      scaleX: baseScale * 1.6,
      scaleY: baseScale * 1.6,
      yoyo: true,
      duration: 220,
      ease: 'Quad.easeOut',
    });
  }

  takeDamage(amount) {
    this.hp -= amount;
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(50, () => {
      if (this.active) this.setTint(this.tint);
    });
    if (this.hp <= 0) this.destroyPart();
  }

  destroyPart() {
    // "Volatile Tail" draft card: detonate the dying segment in a small AoE
    // before removing it. Damage scales with the part's `value`.
    if (this.player?.boosts?.volatileTail && this.scene) {
      const radius = 110 + this.value * 6;
      const dmg = 14 + this.value * 3;
      this.scene.castShockwave?.(this.x, this.y, radius, dmg, {
        color: this.tint, knockback: 0,
      });
    }
    const idx = this.player.parts.indexOf(this);
    if (idx >= 0) this.player.parts.splice(idx, 1);
    // Losing the PRISM allows a future RAINBOW combo to spawn a new one.
    if (this.kind === 'prism' && this.player) this.player.rainbowSpawned = false;
    // Reindex trail parts + refresh branched offsets + recompute stats.
    this.player.chainChanged?.();
    this.destroy();
  }

  /**
   * Continuous distance along the player->history polyline (in edge units).
   * Calibrated so integer spacing matches the old `sampleHistory(lag)` target of history[lag].
   */
  static trailFloatSeg(chainIndex, player) {
    const spacing = PLAYER.segmentSpacingFrames;
    const lag = (chainIndex + 1) * spacing;
    const frac =
      player.historyTimer / Math.max(1e-6, PLAYER.historyPushIntervalMs);
    return lag + 1 + frac;
  }

  /**
   * Called from GameScene update loop after Player updates.
   */
  update(time, delta) {
    if (!this.player.active) return;

    if (this.followMode === 'orbit') {
      this.orbitAngle += this.orbitSpeed * (delta / 1000);
      const px = this.player.x + Math.cos(this.orbitAngle) * this.orbitRadius;
      const py = this.player.y + Math.sin(this.orbitAngle) * this.orbitRadius;
      this.setPosition(px, py);
      // Face the direction of travel (tangent to the orbit).
      this.rotation = this.orbitAngle + Math.PI / 2;
    } else {
      const seg = BodyPart.trailFloatSeg(this.chainIndex, this.player);
      const s = this.player.getSnakeTrailPoint(seg);
      let x = s.x;
      let y = s.y;
      if (this.lateralOffset) {
        // s.tx / s.ty come from a SINGLE 12 ms polyline segment, which makes the
        // tangent wobble between frames and snap at segment boundaries -> visible
        // lateral flicker for split-tail parts. Smooth it by sampling a point
        // slightly newer and slightly older on the trail and taking the unit
        // delta between them. Window ~1.5 units = ~18 ms of player movement.
        const w = 1.5;
        const a = this.player.getSnakeTrailPoint(Math.max(0, seg - w));
        const b = this.player.getSnakeTrailPoint(seg + w);
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const tx = dx / len;
        const ty = dy / len;
        // Perpendicular to the smoothed tangent: (-ty, tx)
        x += -ty * this.lateralOffset;
        y +=  tx * this.lateralOffset;
      }
      this.setPosition(x, y);
    }

    if (this.body) {
      this.body.setVelocity(0, 0);
      this.body.reset(this.x, this.y);
    }

    // PRISM cycles through the four primary tints to advertise itself.
    if (this.kind === 'prism') {
      const i = Math.floor(time / 220) % PRISM_TINT_CYCLE.length;
      this.setTint(PRISM_TINT_CYCLE[i]);
    }

    if (time < this.nextFireAt) return;

    const weapon = this.weaponInfo();
    if (!weapon) return;
    const target = this.scene.targeting?.findNearestEnemy(this.x, this.y, this.range);
    if (!target) return;

    const angle = Math.atan2(target.y - this.y, target.x - this.x);

    // Overcharge window: temporarily bump damage and fire rate. We swap
    // `damage` for the duration of the fire() call so the existing dispatchers
    // pick it up without each one having to know about overcharge.
    const overcharged = this.player && this.scene.time.now < (this.player.overchargeUntil || 0);
    if (overcharged) {
      const origDmg = this.damage;
      this.damage = origDmg * OVERCHARGE.damageMult;
      try { weapon.fire(this, target, angle); }
      finally { this.damage = origDmg; }
      this.nextFireAt = time + 1000 / (this.fireRate * OVERCHARGE.fireRateMult);
    } else {
      weapon.fire(this, target, angle);
      this.nextFireAt = time + 1000 / this.fireRate;
    }
  }

  /**
   * Pulls the current piercing bonus from the player's boosts (defaults to 0).
   * Read at fire time so newly-granted draft cards take effect immediately.
   */
  pierceCount() {
    return this.player?.boosts?.bulletPierce ?? 0;
  }

  /**
   * Volley size for missile-kind parts. Reads `boosts.missileMultishot`. Always
   * at least 1. Twin Missile sets this to 2; cards could push it higher.
   */
  missileCount() {
    return Math.max(1, this.player?.boosts?.missileMultishot ?? 1);
  }

  /** Returns a dispatcher for the current weapon kind, or null for passives. */
  weaponInfo() {
    switch (this.kind) {
      case 'turret':
        return { fire: (self, _t, a) => {
          const b = self.scene.spawnBullet(self.x, self.y, a, self.damage, true);
          if (b) b.pierceLeft = self.pierceCount();
        } };
      case 'missile':
        return { fire: (self, t, a) => {
          const n = self.missileCount();
          // Symmetric fan: 1 -> dead center, 2 -> +/-, 3 -> [-,0,+], ...
          const spread = 0.18;
          for (let i = 0; i < n; i++) {
            const off = n === 1 ? 0 : (i - (n - 1) / 2) * spread;
            const m = self.scene.spawnMissile(self.x, self.y, a + off, self.damage, self.value, t, true);
            if (m && self.player?.boosts?.clusterMissiles) m.cluster = true;
          }
        } };
      case 'plasma':
        return { fire: (self, _t, a) => {
          const b = self.scene.spawnPlasma(self.x, self.y, a, self.damage, self.value);
          if (b) b.pierceLeft = self.pierceCount();
        } };
      case 'swarm':
        return { fire: (self, t, a) => {
          const m = self.scene.spawnSwarmMissile(self.x, self.y, a, self.damage, self.value, t);
          if (m && self.player?.boosts?.clusterMissiles) m.cluster = true;
        } };
      case 'rapid':
        return { fire: (self, _t, a) => {
          const b = self.scene.spawnRapidBullet(self.x, self.y, a, self.damage);
          if (b) b.pierceLeft = self.pierceCount();
        } };
      case 'prism':
        return { fire: (self, _t, a) => {
          const colors = PRISM_TINT_CYCLE;
          const fan = COMBO.prismFanRadians;
          const pierce = self.pierceCount();
          for (let i = 0; i < 4; i++) {
            const off = (i - 1.5) * (fan / 3);
            const b = self.scene.spawnBullet(self.x, self.y, a + off, self.damage, true);
            b.setTint(colors[i]);
            if (pierce > 0) b.pierceLeft = pierce;
          }
        } };
      default:
        return null;
    }
  }
}
