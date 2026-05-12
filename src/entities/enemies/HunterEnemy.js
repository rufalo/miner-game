import { Enemy } from './Enemy.js';
import { ENEMY } from '../../config.js';

/**
 * Persistent seeker: no home position, always aggro. Spawned by HunterSpawner
 * just off-screen and pathed straight toward the player from then on.
 * Moderate speed, moderate HP, decent contact damage.
 */
export class HunterEnemy extends Enemy {
  constructor(scene, x, y) {
    super(scene, x, y, 'enemy_hunter');
    this.maxHP = ENEMY.hunterHP;
    this.hp = this.maxHP;
    this.touchDamage = ENEMY.hunterDamage;
    this.touchCooldownMs = ENEMY.hunterContactCooldownMs;
    this.moveSpeed = ENEMY.hunterSpeed;
    this.setDisplaySize(34, 34);
    this.aggro = true;
  }

  // Persistent: never de-aggro, never wander.
  updateAggro() { this.aggro = true; }

  update(time, delta) {
    const p = this.scene.player;
    if (!p) return;
    this.moveToward(p.x, p.y, this.moveSpeed);
    this.attemptContactDamage(time);
  }
}
