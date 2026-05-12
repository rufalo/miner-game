import Phaser from 'phaser';
import { COLORS, PICKUP } from '../config.js';
import { BodyPart } from './BodyPart.js';

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

    // Floating cost label
    this.label = scene.add.text(x, y - this.size / 2 - 12,
      `${value} ${color}`, {
        fontFamily: 'monospace', fontSize: '11px', color: '#dfe6f2',
      }).setOrigin(0.5, 1);

    this._affordable = true;
  }

  setPosition(x, y) {
    super.setPosition(x, y);
    if (this.label) this.label.setPosition(x, y - this.size / 2 - 12);
    return this;
  }

  /**
   * Re-color label / sprite based on whether the player can currently afford this.
   * Called every frame from GameScene.
   */
  refreshAffordability(player) {
    if (!this.label) return;
    const c = player.cargo[this.color];
    const can = !!(c && c.current >= this.value);
    if (can === this._affordable) return;
    this._affordable = can;
    // Color the label to signal cost. Sprite keeps its pulse tween.
    this.label.setColor(can ? '#dfe6f2' : '#ff8090');
    this.label.setText(can ? `${this.value} ${this.color}` : `${this.value} ${this.color}  -  need more`);
  }

  /**
   * Check proximity and attempt purchase. Returns true if attached.
   */
  tryPurchase(player) {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const r = this.size / 2 + player.displayWidth / 2 + PICKUP.pickupRange;
    if (dx * dx + dy * dy > r * r) return false;
    if (!player.spendMinerals(this.color, this.value)) return false;

    const part = new BodyPart(this.scene, player, player.parts.length, {
      color: this.color,
      value: this.value,
    });
    player.parts.push(part);
    this.scene.bodyParts.add(part);
    player.recomputeStats();
    return true;
  }

  destroyPickup() {
    if (this.label) this.label.destroy();
    this.label = null;
    this.destroy();
  }
}
