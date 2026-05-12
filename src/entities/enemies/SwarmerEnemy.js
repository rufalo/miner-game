import { Enemy } from './Enemy.js';
import { ENEMY } from '../../config.js';

/**
 * Tiny fast melee. Spawned in waves by HunterSpawner. Low HP, dies in one or
 * two pulse shots, but in a pack they shred unguarded players.
 */
export class SwarmerEnemy extends Enemy {
  constructor(scene, x, y) {
    super(scene, x, y, 'enemy_swarmer');
    this.maxHP = ENEMY.swarmerHP;
    this.hp = this.maxHP;
    this.touchDamage = ENEMY.swarmerDamage;
    this.touchCooldownMs = ENEMY.swarmerContactCooldownMs;
    this.moveSpeed = ENEMY.swarmerSpeed;
    this.setDisplaySize(16, 16);
    this.aggro = true;
  }

  updateAggro() { this.aggro = true; }

  update(time) {
    const p = this.scene.player;
    if (!p) return;
    // Slight scatter / weave so packs look alive, not laser-locked.
    const wob = Math.sin((time + this._wobSeed) * 0.005) * 22;
    const dx = p.x - this.x, dy = p.y - this.y;
    const d = Math.hypot(dx, dy) || 1;
    const nx = dx / d, ny = dy / d;
    // Tangent vector for wobble.
    const tx = -ny, ty = nx;
    this.setVelocity(
      nx * this.moveSpeed + tx * wob,
      ny * this.moveSpeed + ty * wob,
    );
    this.rotation = Math.atan2(dy, dx);
    this.attemptContactDamage(time);
  }

  // Lazy wobble phase, unique per instance.
  get _wobSeed() {
    if (this.__wobSeed === undefined) this.__wobSeed = Math.random() * 10000;
    return this.__wobSeed;
  }
}
