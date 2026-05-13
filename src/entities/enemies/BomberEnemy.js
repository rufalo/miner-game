import Phaser from 'phaser';
import { Enemy } from './Enemy.js';
import { ENEMY } from '../../config.js';

/**
 * Bomber: low-HP kamikaze. Charges the player; when close enough it
 * auto-detonates for AoE damage to the player and adjacent body parts.
 * Also explodes on death (so killing one near you still hurts).
 *
 * Detonation AoE damages:
 *   - player (if within explodeRadius)
 *   - each player BodyPart within explodeRadius
 *   - other nearby enemies (small splash, half damage; rewards baiting)
 */
export class BomberEnemy extends Enemy {
  constructor(scene, x, y, tier) {
    super(scene, x, y, 'enemy_bomber');
    this.tier = tier;
    this.maxHP = ENEMY.bomberHP * (1 + 0.3 * tier);
    this.hp = this.maxHP;
    this.touchDamage = 0; // explosion deals damage, not the touch.
    this.moveSpeed = ENEMY.bomberSpeed * (1 + 0.08 * tier);
    this.radius = ENEMY.bomberExplodeRadius;
    this.damage = ENEMY.bomberExplodeDamage * (1 + 0.18 * tier);
    this.setDisplaySize(30, 30);

    this.detonating = false;

    // Pulse tween so it visually reads as live / armed.
    this._pulse = scene.tweens.add({
      targets: this,
      alpha: 0.55,
      duration: 320,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  detonate() {
    if (this.detonating) return;
    this.detonating = true;
    const scene = this.scene;
    if (!scene) { this.destroy(); return; }
    const cx = this.x, cy = this.y;

    // Visual: expanding ring + bright flash.
    const ring = scene.add.circle(cx, cy, 8, 0xff6a3a, 0);
    ring.setStrokeStyle(4, 0xff6a3a, 0.95).setDepth(45);
    scene.tweens.add({
      targets: ring,
      scale: this.radius / 8,
      alpha: 0,
      duration: 280,
      onComplete: () => ring.destroy(),
    });
    const flash = scene.add.circle(cx, cy, this.radius * 0.6, 0xffd089, 0.55).setDepth(44);
    scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 220,
      onComplete: () => flash.destroy(),
    });
    scene.cameras.main.shake(140, 0.004);

    // Player damage.
    const p = scene.player;
    if (p?.active) {
      const dx = p.x - cx, dy = p.y - cy;
      if (dx * dx + dy * dy <= this.radius * this.radius) {
        p.takeDamage?.(this.damage, scene.time.now);
        scene.spawnDamageText?.(p.x, p.y - 18, this.damage, 'player');
      }
    }
    // Body part damage.
    if (p?.parts) {
      for (const part of p.parts) {
        if (!part?.active) continue;
        const dx = part.x - cx, dy = part.y - cy;
        if (dx * dx + dy * dy <= this.radius * this.radius) {
          const partDmg = this.damage * 0.6;
          part.takeDamage?.(partDmg);
          scene.spawnDamageText?.(part.x, part.y - 14, partDmg, 'player');
        }
      }
    }
    // Friendly fire on nearby enemies (half damage). Rewards kiting them
    // into clusters.
    if (scene.enemies) {
      scene.enemies.getChildren().forEach((e) => {
        if (!e || !e.active || e === this) return;
        const dx = e.x - cx, dy = e.y - cy;
        if (dx * dx + dy * dy <= this.radius * this.radius) {
          e.takeDamage?.(this.damage * 0.5);
        }
      });
    }

    if (this._pulse) { this._pulse.stop(); this._pulse = null; }
    // Notify scene exactly once so kill counts / spawner respawn run.
    scene.onEnemyKilled?.(this);
    this.destroy();
  }

  onDeath() {
    // Death also triggers detonation (so killing one in your face hurts).
    // Skip default Enemy.onDeath so we control the kill notify ourselves.
    this.detonate();
  }

  update(time, delta) {
    this.updateAggro();
    if (this.detonating) return;
    const p = this.scene.player;
    if (!this.aggro || !p) {
      this.wander(time);
      return;
    }
    this.moveToward(p.x, p.y, this.moveSpeed);
    // Auto-detonate when close enough.
    const dx = p.x - this.x, dy = p.y - this.y;
    if (dx * dx + dy * dy <= ENEMY.bomberFuseRadius * ENEMY.bomberFuseRadius) {
      this.detonate();
    }
  }
}
