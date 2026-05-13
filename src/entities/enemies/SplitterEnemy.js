import Phaser from 'phaser';
import { Enemy } from './Enemy.js';
import { ENEMY } from '../../config.js';
import { ChaserEnemy } from './ChaserEnemy.js';

/**
 * Splitter: chunky melee bruiser. Slow, decent HP. When killed it bursts
 * into `splitterMinionCount` fast, fragile mini-chasers that immediately
 * aggro on the player. Mini-chasers are stat-overridden ChaserEnemy
 * instances so they reuse the existing AI / FX pipeline.
 */
export class SplitterEnemy extends Enemy {
  constructor(scene, x, y, tier) {
    super(scene, x, y, 'enemy_splitter');
    this.tier = tier;
    this.maxHP = ENEMY.splitterHP * (1 + 0.3 * tier);
    this.hp = this.maxHP;
    this.touchDamage = ENEMY.splitterDamage * (1 + 0.12 * tier);
    this.touchCooldownMs = ENEMY.splitterContactCooldownMs;
    this.moveSpeed = ENEMY.splitterSpeed * (1 + 0.05 * tier);
    this.setDisplaySize(42, 42);
  }

  spawnMinions() {
    const count = ENEMY.splitterMinionCount + Math.floor(this.tier * 0.5);
    const baseAngle = Math.random() * Math.PI * 2;
    for (let i = 0; i < count; i++) {
      const a = baseAngle + (i / count) * Math.PI * 2;
      const r = 20 + Math.random() * 12;
      const x = this.x + Math.cos(a) * r;
      const y = this.y + Math.sin(a) * r;
      const m = new ChaserEnemy(this.scene, x, y, this.tier);
      // Override base ChaserEnemy stats with mini-chaser tuning.
      m.maxHP = ENEMY.splitterMinionHP * (1 + 0.25 * this.tier);
      m.hp = m.maxHP;
      m.moveSpeed = ENEMY.splitterMinionSpeed * (1 + 0.05 * this.tier);
      m.touchDamage = ENEMY.splitterMinionDamage * (1 + 0.1 * this.tier);
      m.setDisplaySize(18, 18);
      m.aggro = true; // born angry
      this.scene.enemies.add(m);
    }
    // Small puff so the split visually reads.
    const ring = this.scene.add.circle(this.x, this.y, 18, 0xff8a44, 0);
    ring.setStrokeStyle(3, 0xff8a44, 0.95).setDepth(40);
    this.scene.tweens.add({
      targets: ring,
      scale: 4,
      alpha: 0,
      duration: 420,
      onComplete: () => ring.destroy(),
    });
  }

  onDeath() {
    this.spawnMinions();
    super.onDeath();
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
