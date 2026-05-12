import { Enemy } from './Enemy.js';
import { ENEMY } from '../../config.js';

export class BruteEnemy extends Enemy {
  constructor(scene, x, y, tier) {
    super(scene, x, y, 'enemy_brute');
    this.maxHP = ENEMY.bruteHP * (1 + 0.5 * tier);
    this.hp = this.maxHP;
    this.touchDamage = ENEMY.bruteDamage * (1 + 0.2 * tier);
    this.touchCooldownMs = ENEMY.bruteContactCooldownMs;
    this.moveSpeed = ENEMY.bruteSpeed * (1 + 0.05 * tier);
    this.setDisplaySize(46, 46);
    this.knockback = ENEMY.bruteKnockback;
  }

  attemptContactDamage(time) {
    if (time - this.lastContactAt < this.touchCooldownMs) return;
    const p = this.scene.player;
    const dx = p.x - this.x, dy = p.y - this.y;
    const r = (this.displayWidth + p.displayWidth) / 2;
    if (dx * dx + dy * dy <= r * r) {
      p.takeDamage(this.touchDamage, time);
      this.lastContactAt = time;
      // Knockback
      const d = Math.hypot(dx, dy) || 1;
      const k = this.knockback;
      p.body.setVelocity(p.body.velocity.x + (dx / d) * k, p.body.velocity.y + (dy / d) * k);
      this.scene.cameras.main.shake(120, 0.006);
    }
  }

  update(time) {
    this.updateAggro();
    if (this.aggro) {
      this.moveToward(this.scene.player.x, this.scene.player.y, this.moveSpeed);
      this.attemptContactDamage(time);
    } else {
      this.wander(time);
    }
  }
}
