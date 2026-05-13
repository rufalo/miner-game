import Phaser from 'phaser';
import { Enemy } from './Enemy.js';
import { ENEMY } from '../../config.js';

/**
 * Sniper: very long range, fragile. Telegraphs a thin red line that follows
 * the player for `sniperTelegraphMs` ms, then locks the angle and fires a
 * very fast bullet (effectively a hitscan beam). Tries to stay at
 * `sniperKeepDistance` from the player; backs up if you close in.
 *
 * Engagement loop:
 *   - idle / wander                          if !aggro
 *   - aim telegraph (thin red line) ~1.2 s   on fire start
 *   - fire fast bullet + bright beam visual  at telegraph end
 *   - cooldown until next fire attempt
 */
export class SniperEnemy extends Enemy {
  constructor(scene, x, y, tier) {
    super(scene, x, y, 'enemy_sniper');
    this.tier = tier;
    this.maxHP = ENEMY.sniperHP * (1 + 0.25 * tier);
    this.hp = this.maxHP;
    this.touchDamage = 0; // no melee
    this.moveSpeed = ENEMY.sniperSpeed * (1 + 0.05 * tier);
    this.fireRate = ENEMY.sniperFireRate * (1 + 0.07 * tier);
    this.damage = ENEMY.sniperBeamDamage * (1 + 0.18 * tier);
    this.range = ENEMY.sniperRange;
    this.keepDistance = ENEMY.sniperKeepDistance;
    this.setDisplaySize(32, 32);

    this.nextFireAt = scene.time.now + 1500 + Math.random() * 1500;
    this.telegraph = null;    // Phaser.GameObjects.Graphics (line)
    this.aiming = false;      // mid-telegraph
  }

  /** Draw / update the thin telegraph line from sniper to current player pos. */
  updateTelegraph() {
    if (!this.aiming) return;
    if (!this.telegraph) {
      this.telegraph = this.scene.add.graphics().setDepth(35);
    }
    this.telegraph.clear();
    this.telegraph.lineStyle(2, 0xff5252, 0.85);
    const p = this.scene.player;
    if (!p) return;
    this.telegraph.lineBetween(this.x, this.y, p.x, p.y);
  }

  clearTelegraph() {
    if (this.telegraph) {
      this.telegraph.destroy();
      this.telegraph = null;
    }
    this.aiming = false;
  }

  fireBeam() {
    const p = this.scene.player;
    if (!p) return;
    const angle = Math.atan2(p.y - this.y, p.x - this.x);

    // Visual beam: a thick line that fades out quickly.
    const beam = this.scene.add.graphics().setDepth(38);
    const reach = ENEMY.sniperRange * 1.4;
    const ex = this.x + Math.cos(angle) * reach;
    const ey = this.y + Math.sin(angle) * reach;
    beam.lineStyle(4, 0xff7070, 0.95);
    beam.lineBetween(this.x, this.y, ex, ey);
    this.scene.tweens.add({
      targets: beam,
      alpha: 0,
      duration: 220,
      onComplete: () => beam.destroy(),
    });

    // Hitscan-ish: spawn a very fast enemy bullet that crosses the screen in
    // ~150 ms, so the player still has agency by dashing.
    const b = this.scene.spawnBullet(this.x, this.y, angle, this.damage, false);
    if (b?.body) {
      b.body.setVelocity(
        Math.cos(angle) * ENEMY.sniperBeamSpeed,
        Math.sin(angle) * ENEMY.sniperBeamSpeed,
      );
      b.setTint(0xff5252);
      b.setDisplaySize(8, 8);
      // Extend lifetime so the fast bullet can actually traverse the screen.
      b.lifeUntil = this.scene.time.now + 1200;
    }
  }

  onDeath() {
    this.clearTelegraph();
    super.onDeath();
  }

  update(time, delta) {
    this.updateAggro();
    if (!this.aggro) {
      this.clearTelegraph();
      this.wander(time);
      return;
    }
    const p = this.scene.player;
    if (!p) return;
    const d = this.distToPlayer();

    // Kite: back away if too close.
    if (d < this.keepDistance) {
      this.moveToward(p.x, p.y, -this.moveSpeed);
    } else if (d > this.range * 0.95) {
      // Re-engage if outside max range.
      this.moveToward(p.x, p.y, this.moveSpeed);
    } else {
      this.setVelocity(0, 0);
      this.rotation = Math.atan2(p.y - this.y, p.x - this.x);
    }

    // Aim then fire.
    if (this.aiming) {
      this.updateTelegraph();
    } else if (time >= this.nextFireAt && d <= this.range) {
      this.aiming = true;
      this.updateTelegraph();
      this.scene.time.delayedCall(ENEMY.sniperTelegraphMs, () => {
        if (this.active && this.aiming) {
          this.clearTelegraph();
          this.fireBeam();
          this.nextFireAt = this.scene.time.now + 1000 / this.fireRate;
        }
      });
    }
  }
}
