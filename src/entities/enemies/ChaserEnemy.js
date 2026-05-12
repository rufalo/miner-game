import { Enemy } from './Enemy.js';
import { ENEMY } from '../../config.js';

export class ChaserEnemy extends Enemy {
  constructor(scene, x, y, tier) {
    super(scene, x, y, 'enemy_chaser');
    this.maxHP = ENEMY.chaserHP * (1 + 0.3 * tier);
    this.hp = this.maxHP;
    this.touchDamage = ENEMY.chaserDamage * (1 + 0.15 * tier);
    this.touchCooldownMs = ENEMY.chaserContactCooldownMs;
    this.moveSpeed = ENEMY.chaserSpeed * (1 + 0.08 * tier);
    this.setDisplaySize(30, 30);
  }

  update(time, delta) {
    this.updateAggro();
    if (this.aggro) {
      this.moveToward(this.scene.player.x, this.scene.player.y, this.moveSpeed);
      this.attemptContactDamage(time);
    } else {
      this.wander(time);
    }
  }
}
