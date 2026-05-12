import Phaser from 'phaser';
import { BODY_PART, COLORS, BLUE, RED, PLAYER } from '../config.js';

export class BodyPart extends Phaser.Physics.Arcade.Sprite {
  /**
   * @param {Phaser.Scene} scene
   * @param {import('./Player.js').Player} player
   * @param {number} chainIndex  zero-based position in the snake
   * @param {{color:string, value:number}} opts
   */
  constructor(scene, player, chainIndex, opts) {
    const start = player.getSnakeTrailPoint(BodyPart.trailFloatSeg(chainIndex, player));
    super(scene, start.x, start.y, 'square');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.player = player;
    this.color = opts.color;
    this.value = opts.value;
    this.chainIndex = chainIndex;

    const size = BODY_PART.baseSize + this.value * BODY_PART.sizePerValue;
    this.setDisplaySize(size, size);
    // body.setSize is in source texture pixels - the body auto-scales with
    // the sprite, so using the full 64x64 source matches the displaySize.
    this.body.setSize(64, 64);
    this.body.allowGravity = false;
    this.body.setImmovable(true);

    this.setTint(COLORS[this.color]);
    this.setDepth(-1 - chainIndex);

    this.maxHP = BODY_PART.hpBase + this.value * BODY_PART.hpPerValue;
    this.hp = this.maxHP;

    // Weapon timers
    this.nextFireAt = 0;
    if (this.color === 'blue') {
      this.fireRate = BLUE.baseFireRate + this.value * BLUE.fireRatePerValue;
      this.range = BLUE.baseRange + this.value * BLUE.rangePerValue;
      this.damage = BLUE.baseDamage + this.value * BLUE.damagePerValue;
    } else if (this.color === 'red') {
      this.fireRate = RED.baseFireRate + this.value * RED.fireRatePerValue;
      this.range = RED.baseRange + this.value * RED.rangePerValue;
      this.damage = RED.baseDamage + this.value * RED.damagePerValue;
    }
  }

  takeDamage(amount) {
    this.hp -= amount;
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(50, () => {
      if (this.active) this.setTint(COLORS[this.color]);
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
    // +1: first edge is player -> history[0]; old lag L used history[L] = vertex L+1.
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

    // Weapons
    if ((this.color === 'blue' || this.color === 'red') && time >= this.nextFireAt) {
      const target = this.scene.targeting?.findNearestEnemy(this.x, this.y, this.range);
      if (target) {
        this.fireAt(target, time);
        this.nextFireAt = time + 1000 / this.fireRate;
      }
    }
  }

  fireAt(target, time) {
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const angle = Math.atan2(dy, dx);
    if (this.color === 'blue') {
      this.scene.spawnBullet(this.x, this.y, angle, this.damage, true);
    } else {
      this.scene.spawnMissile(this.x, this.y, angle, this.damage, this.value, target, true);
    }
  }
}
