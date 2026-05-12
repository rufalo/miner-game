import { Enemy } from './Enemy.js';
import { ENEMY } from '../../config.js';

export class MissileEnemy extends Enemy {
  constructor(scene, x, y, tier) {
    super(scene, x, y, 'enemy_missile');
    this.maxHP = ENEMY.missileEnemyHP * (1 + 0.3 * tier);
    this.hp = this.maxHP;
    this.touchDamage = 4;
    this.moveSpeed = ENEMY.missileEnemySpeed * (1 + 0.06 * tier);
    this.setDisplaySize(32, 32);

    this.fireRate = ENEMY.missileEnemyFireRate * (1 + 0.1 * tier);
    this.damage = ENEMY.missileEnemyDamage * (1 + 0.18 * tier);
    this.range = ENEMY.missileEnemyRange;
    this.keepDistance = ENEMY.missileEnemyKeepDistance;
    this.nextFireAt = 0;
  }

  update(time) {
    this.updateAggro();
    if (!this.aggro) {
      this.wander(time);
      return;
    }
    const p = this.scene.player;
    const d = this.distToPlayer();

    if (d > this.keepDistance + 80) {
      this.moveToward(p.x, p.y, this.moveSpeed);
    } else if (d < this.keepDistance - 80) {
      this.moveToward(p.x, p.y, -this.moveSpeed);
    } else {
      this.setVelocity(0, 0);
      this.rotation = Math.atan2(p.y - this.y, p.x - this.x);
    }

    if (time >= this.nextFireAt && d <= this.range) {
      const a = Math.atan2(p.y - this.y, p.x - this.x);
      // value=2 so explosion is modest
      this.scene.spawnMissile(this.x, this.y, a, this.damage, 2, p, false);
      this.nextFireAt = time + 1000 / this.fireRate;
    }
  }
}
