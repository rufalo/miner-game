import Phaser from 'phaser';
import { BODY_PART, COLORS, BLUE, RED, PLAYER, KIND_BY_COLOR, HYBRID_STATS, COMBO } from '../config.js';

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
      const s = this.player.getSnakeTrailPoint(BodyPart.trailFloatSeg(this.chainIndex, this.player));
      let x = s.x;
      let y = s.y;
      if (this.lateralOffset) {
        // Perpendicular to the segment tangent: (-ty, tx)
        x += -s.ty * this.lateralOffset;
        y +=  s.tx * this.lateralOffset;
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
    weapon.fire(this, target, angle);
    this.nextFireAt = time + 1000 / this.fireRate;
  }

  /** Returns a dispatcher for the current weapon kind, or null for passives. */
  weaponInfo() {
    switch (this.kind) {
      case 'turret':
        return { fire: (self, _t, a) =>
          self.scene.spawnBullet(self.x, self.y, a, self.damage, true) };
      case 'missile':
        return { fire: (self, t, a) =>
          self.scene.spawnMissile(self.x, self.y, a, self.damage, self.value, t, true) };
      case 'plasma':
        return { fire: (self, _t, a) =>
          self.scene.spawnPlasma(self.x, self.y, a, self.damage, self.value) };
      case 'swarm':
        return { fire: (self, t, a) =>
          self.scene.spawnSwarmMissile(self.x, self.y, a, self.damage, self.value, t) };
      case 'rapid':
        return { fire: (self, _t, a) =>
          self.scene.spawnRapidBullet(self.x, self.y, a, self.damage) };
      case 'prism':
        return { fire: (self, _t, a) => {
          const colors = PRISM_TINT_CYCLE;
          const fan = COMBO.prismFanRadians;
          for (let i = 0; i < 4; i++) {
            const off = (i - 1.5) * (fan / 3);
            const b = self.scene.spawnBullet(self.x, self.y, a + off, self.damage, true);
            b.setTint(colors[i]);
          }
        } };
      default:
        return null;
    }
  }
}
