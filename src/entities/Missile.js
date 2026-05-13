import Phaser from 'phaser';
import { RED } from '../config.js';

export class Missile extends Phaser.Physics.Arcade.Sprite {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @param {number} angle  initial heading in radians
   * @param {number} damage
   * @param {number} value  part value (drives aoe scaling)
   * @param {Phaser.GameObjects.GameObject} target  optional homing target
   * @param {boolean} friendly
   */
  constructor(scene, x, y, angle, damage, value, target, friendly) {
    super(scene, x, y, 'missile');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.damage = damage;
    this.partValue = value || 1;
    this.target = target || null;
    this.friendly = !!friendly;
    this.aoe = RED.aoeRadius + this.partValue * RED.aoeRadiusPerValue;

    this.setTint(friendly ? 0xff8aa8 : 0xffc04a);
    this.setDisplaySize(20, 9);
    this.body.setSize(16, 6);
    this.body.setOffset(1, 1);
    this.body.allowGravity = false;

    this.heading = angle;
    this.speed = RED.missileSpeed;
    this.rotation = angle;
    this.setVelocity(Math.cos(angle) * this.speed, Math.sin(angle) * this.speed);

    this.lifeUntil = scene.time.now + RED.missileLifeMs;

    // Smoke trail
    this.lastTrailAt = 0;
  }

  update(time, delta) {
    if (time >= this.lifeUntil) return this.destroy();

    if (this.target && !this.target.active) this.target = null;
    if (this.target) {
      const dx = this.target.x - this.x;
      const dy = this.target.y - this.y;
      const want = Math.atan2(dy, dx);
      let diff = Phaser.Math.Angle.Wrap(want - this.heading);
      const maxTurn = RED.missileTurnRate * (delta / 1000);
      diff = Phaser.Math.Clamp(diff, -maxTurn, maxTurn);
      this.heading += diff;
    }

    this.speed = Math.min(RED.missileMaxSpeed, this.speed + RED.missileAccel * (delta / 1000));
    this.setVelocity(Math.cos(this.heading) * this.speed, Math.sin(this.heading) * this.speed);
    this.rotation = this.heading;

    if (time - this.lastTrailAt > 35) {
      this.lastTrailAt = time;
      this.scene.spawnSmokePuff?.(this.x, this.y);
    }
  }

  /**
   * Called by GameScene on hit. Applies AoE. If `cluster` is set (granted by
   * the "Cluster Missiles" draft card) the explosion also spawns 6 short-lived
   * shrapnel bullets in a ring for friendly missiles.
   */
  explode() {
    this.scene.spawnExplosion?.(this.x, this.y, this.aoe);
    const group = this.friendly ? this.scene.enemies : null;
    if (group) {
      const enemies = group.getChildren();
      for (const e of enemies) {
        if (!e.active) continue;
        const dx = e.x - this.x;
        const dy = e.y - this.y;
        if (dx * dx + dy * dy <= this.aoe * this.aoe) {
          e.takeDamage?.(this.damage);
        }
      }
      if (this.cluster) {
        const count = 6;
        const dmg = this.damage * 0.35;
        for (let i = 0; i < count; i++) {
          const a = (i / count) * Math.PI * 2;
          const b = this.scene.spawnBullet(this.x, this.y, a, dmg, true);
          if (b) {
            b.setTint(0xffb86a);
            b.lifeUntil = this.scene.time.now + 420;
          }
        }
      }
    } else {
      // Enemy missile -> damage player + body parts in aoe
      const p = this.scene.player;
      if (p && p.active) {
        const dx = p.x - this.x;
        const dy = p.y - this.y;
        if (dx * dx + dy * dy <= this.aoe * this.aoe) {
          p.takeDamage(this.damage, this.scene.time.now);
        }
        for (const part of p.parts.slice()) {
          const dx2 = part.x - this.x;
          const dy2 = part.y - this.y;
          if (dx2 * dx2 + dy2 * dy2 <= this.aoe * this.aoe) {
            part.takeDamage(this.damage * 0.7);
          }
        }
      }
    }
    this.destroy();
  }
}
