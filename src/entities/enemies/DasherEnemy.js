import { Enemy } from './Enemy.js';
import { ENEMY } from '../../config.js';

export class DasherEnemy extends Enemy {
  constructor(scene, x, y, tier) {
    super(scene, x, y, 'enemy_dasher');
    this.maxHP = ENEMY.dasherHP * (1 + 0.3 * tier);
    this.hp = this.maxHP;
    this.touchDamage = ENEMY.dasherDamage * (1 + 0.15 * tier);
    this.touchCooldownMs = 500;
    this.moveSpeed = ENEMY.dasherSpeed * (1 + 0.08 * tier);
    this.setDisplaySize(30, 30);

    this.nextDashAt = 0;
    this.dashState = 'idle';   // idle | charging | dashing
    this.dashUntil = 0;
  }

  update(time, delta) {
    this.updateAggro();
    if (!this.aggro) {
      this.wander(time);
      return;
    }

    const p = this.scene.player;
    if (this.dashState === 'dashing') {
      if (time >= this.dashUntil) {
        this.dashState = 'idle';
        this.nextDashAt = time + ENEMY.dasherDashCooldownMs;
        this.clearTint();
      } else {
        this.attemptContactDamage(time);
      }
      return;
    }
    if (this.dashState === 'charging') {
      this.setVelocity(0, 0);
      if (time >= this.dashUntil) {
        const dx = p.x - this.x;
        const dy = p.y - this.y;
        const a = Math.atan2(dy, dx);
        this.setVelocity(Math.cos(a) * ENEMY.dasherDashSpeed, Math.sin(a) * ENEMY.dasherDashSpeed);
        this.dashState = 'dashing';
        this.dashUntil = time + ENEMY.dasherDashDurationMs;
        this.setTint(0xff90c0);
      }
      return;
    }

    this.moveToward(p.x, p.y, this.moveSpeed);
    this.attemptContactDamage(time);
    if (time >= this.nextDashAt && this.distToPlayer() < 360) {
      this.dashState = 'charging';
      this.dashUntil = time + ENEMY.dasherDashChargeMs;
      this.setTint(0xfff080);
    }
  }
}
