import Phaser from 'phaser';
import { BODY_PART, COLORS, BLUE, RED, PLAYER, KIND_BY_COLOR, HYBRID_STATS } from '../config.js';

/**
 * Body segment. `color` is its identifier (red/blue/green/yellow or a hybrid
 * kind like 'plasma'); `kind` drives weapon/passive behavior. For non-hybrid
 * parts, kind defaults to KIND_BY_COLOR[color].
 *
 * Construction options:
 *   { color, value, kind?, tint? }
 */
export class BodyPart extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, player, chainIndex, opts) {
    const start = player.getSnakeTrailPoint(BodyPart.trailFloatSeg(chainIndex, player));
    super(scene, start.x, start.y, 'square');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.player = player;
    this.color = opts.color;
    this.kind = opts.kind || KIND_BY_COLOR[opts.color] || opts.color;
    this.tint = opts.tint ?? (COLORS[opts.color] ?? 0xffffff);
    this.value = opts.value;
    this.chainIndex = chainIndex;

    this.applySize();
    this.body.setSize(64, 64);
    this.body.allowGravity = false;
    this.body.setImmovable(true);

    this.setTint(this.tint);
    this.setDepth(-1 - chainIndex);

    this.maxHP = BODY_PART.hpBase + this.value * BODY_PART.hpPerValue;
    this.hp = this.maxHP;

    this.nextFireAt = 0;
    this.applyKindStats();
  }

  applySize() {
    const size = BODY_PART.baseSize + this.value * BODY_PART.sizePerValue;
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
      default:
        // Passive parts (speed / cargo): no weapon stats.
        break;
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
    this.player.parts.forEach((p, i) => (p.chainIndex = i));
    this.player.recomputeStats();
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
    const s = this.player.getSnakeTrailPoint(BodyPart.trailFloatSeg(this.chainIndex, this.player));
    this.setPosition(s.x, s.y);
    if (this.body) {
      this.body.setVelocity(0, 0);
      this.body.reset(this.x, this.y);
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
      default:
        return null;
    }
  }
}
