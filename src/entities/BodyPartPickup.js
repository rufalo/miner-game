import Phaser from 'phaser';
import { COLORS, PICKUP } from '../config.js';

/**
 * Booster pickup (formerly the body-part vendor). Walking next to it grants
 * an instant gauge boost equal to ~60% of the player's current threshold for
 * the matching color. No cargo cost. Larger `value` = larger booster.
 */
export class BodyPartPickup extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, color, value) {
    super(scene, x, y, 'square');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.color = color;
    this.value = value;
    this.size = PICKUP.baseSize + value * PICKUP.sizePerValue;

    this.setTint(COLORS[color]);
    this.setDisplaySize(this.size, this.size);
    this.body.setSize(64, 64); // body auto-scales with displaySize
    this.body.setImmovable(true);
    this.body.allowGravity = false;

    // Subtle pulse
    scene.tweens.add({
      targets: this,
      alpha: { from: 1, to: 0.65 },
      duration: 900,
      yoyo: true,
      repeat: -1,
    });

    this.label = scene.add.text(x, y - this.size / 2 - 12,
      `+${color} boost`, {
        fontFamily: 'monospace', fontSize: '11px', color: '#dfe6f2',
      }).setOrigin(0.5, 1);
  }

  setPosition(x, y) {
    super.setPosition(x, y);
    if (this.label) this.label.setPosition(x, y - this.size / 2 - 12);
    return this;
  }

  /** Boosters are always usable; this is kept so the scene's pickup loop has
   *  a uniform interface. */
  refreshAffordability(_player) { /* no-op now */ }

  /**
   * If the player is close enough, drain the booster: fill ~60% of their
   * matching gauge (booster `value` scales this slightly). May trigger an
   * evolution if the boost overfills.
   */
  tryConsume(player) {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const r = this.size / 2 + player.displayWidth / 2 + PICKUP.pickupRange;
    if (dx * dx + dy * dy > r * r) return false;

    const c = player.cargo[this.color];
    if (!c) return false;
    // Booster strength: 60% of current threshold + small scale from value.
    const amount = c.cap * 0.6 + this.value * 0.4;
    player.pumpGauge(this.color, amount);

    this.scene.spawnBoosterFx?.(this.x, this.y, this.color);
    return true;
  }

  /** Backwards-compatible alias. */
  tryPurchase(player) { return this.tryConsume(player); }

  destroyPickup() {
    if (this.label) this.label.destroy();
    this.label = null;
    this.destroy();
  }
}
