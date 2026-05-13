import Phaser from 'phaser';
import { LANDMARK } from '../../config.js';

/**
 * Boulder: arcing projectile launched by a BoulderPit. Not a physics body -
 * we lerp x/y over `LANDMARK.pit.boulderArcMs` and add a sine bump for
 * "vertical" height. On landing we apply AoE damage and knockback to the
 * player, body parts, AND any enemies caught in the splash (kiting them
 * under a pit is a real tactic).
 *
 * A drop shadow at the landing point grows as the rock approaches so the
 * player can read the impact even after the telegraph ring is gone.
 */
export class Boulder extends Phaser.GameObjects.Image {
  constructor(scene, x, y, tx, ty, tier = 0) {
    super(scene, x, y, 'boulder');
    scene.add.existing(this);
    this.setDepth(25);
    this.setDisplaySize(36, 36);
    this.setTint(0x9a7050);

    this.startX = x; this.startY = y;
    this.targetX = tx; this.targetY = ty;
    this.startTime = scene.time.now;
    this.duration = LANDMARK.pit.boulderArcMs;
    this.tier = tier;
    this._spin = (Math.random() < 0.5 ? -1 : 1) * (0.005 + Math.random() * 0.005);
    this._impacted = false;

    // Ground shadow grows as the boulder approaches.
    this.shadow = scene.add.ellipse(tx, ty, 16, 8, 0x000000, 0.55).setDepth(24);
    scene.tweens.add({
      targets: this.shadow, scaleX: 2.4, scaleY: 2.4,
      duration: this.duration, ease: 'Linear',
    });
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (this._impacted) return;
    const t = Math.min(1, (time - this.startTime) / this.duration);
    const cx = Phaser.Math.Linear(this.startX, this.targetX, t);
    const cy = Phaser.Math.Linear(this.startY, this.targetY, t);
    // Parabolic arc: peak height at t=0.5.
    const arc = -Math.sin(t * Math.PI) * 180;
    this.setPosition(cx, cy + arc);
    this.rotation += this._spin * delta;
    // Grow slightly as it falls so the silhouette reads as "incoming".
    const scale = 1 + 0.25 * Math.sin(t * Math.PI);
    this.setScale(scale * (36 / this.width));
    if (t >= 1) this.impact();
  }

  impact() {
    if (this._impacted) return;
    this._impacted = true;
    const scene = this.scene;
    if (!scene) { this.destroy(); return; }

    scene.cameras?.main?.shake(220, 0.006);
    scene.spawnExplosion?.(this.targetX, this.targetY, LANDMARK.pit.boulderRadius);
    const r = LANDMARK.pit.boulderRadius;
    const r2 = r * r;
    const dmg = LANDMARK.pit.boulderDamage;
    const knock = LANDMARK.pit.boulderKnockback;

    // Player.
    const p = scene.player;
    if (p?.active) {
      const dx = p.x - this.targetX, dy = p.y - this.targetY;
      const d2 = dx * dx + dy * dy;
      if (d2 <= r2) {
        p.takeDamage?.(dmg, scene.time.now);
        const d = Math.sqrt(d2) || 1;
        p.body?.setVelocity((dx / d) * knock, (dy / d) * knock);
        scene.spawnDamageText?.(p.x, p.y - 20, dmg, 'player');
      }
    }

    // Body parts (half damage so the tail isn't shredded by one boulder).
    if (p?.parts) {
      for (const part of p.parts) {
        if (!part?.active) continue;
        const dx = part.x - this.targetX, dy = part.y - this.targetY;
        if (dx * dx + dy * dy <= r2) {
          part.takeDamage?.(dmg * 0.5);
        }
      }
    }

    // Enemies - reward the player for kiting things under the pit.
    scene.enemies?.getChildren?.().forEach((e) => {
      if (!e || !e.active) return;
      const dx = e.x - this.targetX, dy = e.y - this.targetY;
      if (dx * dx + dy * dy <= r2) {
        e.takeDamage?.(dmg * 0.85);
      }
    });

    if (this.shadow) this.shadow.destroy();
    this.destroy();
  }
}
