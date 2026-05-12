import { Enemy } from './Enemy.js';
import { ENEMY } from '../../config.js';

export class GunnerEnemy extends Enemy {
  constructor(scene, x, y, tier) {
    super(scene, x, y, 'enemy_gunner');
    this.maxHP = ENEMY.gunnerHP * (1 + 0.3 * tier);
    this.hp = this.maxHP;
    this.touchDamage = 4;
    this.moveSpeed = ENEMY.gunnerSpeed * (1 + 0.06 * tier);
    this.setDisplaySize(28, 28);

    this.fireRate = ENEMY.gunnerFireRate * (1 + 0.1 * tier);
    this.damage = ENEMY.gunnerBulletDamage * (1 + 0.15 * tier);
    this.range = ENEMY.gunnerRange;
    this.keepDistance = ENEMY.gunnerKeepDistance;
    this.nextFireAt = 0;
  }

  update(time, delta) {
    this.updateAggro();
    if (!this.aggro) {
      this.wander(time);
      return;
    }
    const p = this.scene.player;
    const d = this.distToPlayer();

    if (d > this.keepDistance + 60) {
      this.moveToward(p.x, p.y, this.moveSpeed);
    } else if (d < this.keepDistance - 60) {
      this.moveToward(p.x, p.y, -this.moveSpeed);
    } else {
      this.setVelocity(0, 0);
      this.rotation = Math.atan2(p.y - this.y, p.x - this.x);
    }

    if (time >= this.nextFireAt && d <= this.range) {
      const a = Math.atan2(p.y - this.y, p.x - this.x);
      this.scene.spawnBullet(this.x, this.y, a, this.damage, false);
      this.nextFireAt = time + 1000 / this.fireRate;
    }
  }
}
