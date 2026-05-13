import Phaser from 'phaser';
import { COLORS, MINERAL, PLAYER } from '../config.js';

export class MineralDeposit extends Phaser.Physics.Arcade.Sprite {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @param {string} color
   * @param {number} value 2-15
   */
  constructor(scene, x, y, color, value) {
    super(scene, x, y, 'circle');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.color = color;
    this.startValue = value;
    this.value = value;       // depletes as the player mines
    this.radius = MINERAL.baseRadius + value * MINERAL.radiusPerValue;

    this.setTint(COLORS[color]);
    this.setDisplaySize(this.radius * 2, this.radius * 2);
    this.body.setCircle(64); // texture is 128x128; body auto-scales with sprite
    this.body.setImmovable(true);
    this.body.allowGravity = false;

    // A ring overlay for a slight halo effect
    this.halo = scene.add.image(x, y, 'ring');
    this.halo.setTint(COLORS[color]);
    this.halo.setAlpha(0.35);
    this.halo.setDisplaySize(this.radius * 2 + 8, this.radius * 2 + 8);
  }

  setPosition(x, y) {
    super.setPosition(x, y);
    if (this.halo) this.halo.setPosition(x, y);
    return this;
  }

  /**
   * Returns true if the player is close enough to mine.
   */
  isInRange(player) {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    return d <= this.radius + player.displayWidth / 2 + PLAYER.mineRange;
  }

  /**
   * Transfer minerals to the player. Called by GameScene with delta in seconds.
   * Returns true if the deposit became fully depleted this tick.
   */
  mineTick(player, dtSec) {
    if (!this.isInRange(player)) return false;
    const want = PLAYER.mineRate * dtSec;
    const avail = Math.min(this.value, want);
    if (avail <= 0) return false;
    const taken = player.addMinerals(this.color, avail);
    this.value -= taken;
    // Shrink visually as it depletes
    const frac = Math.max(0.25, this.value / this.startValue);
    this.setDisplaySize(this.radius * 2 * frac, this.radius * 2 * frac);
    if (this.halo) this.halo.setDisplaySize(this.radius * 2 * frac + 8, this.radius * 2 * frac + 8);
    if (this.value <= 0.0001) return true;
    return false;
  }

  /**
   * Drain `amount` units from the deposit WITHOUT going through a player.
   * Used by NeutralMiner actors that compete with the player for nodes.
   * Returns true if the deposit is fully depleted.
   */
  drainBy(amount) {
    if (this.value <= 0) return true;
    this.value = Math.max(0, this.value - amount);
    const frac = Math.max(0.25, this.value / this.startValue);
    this.setDisplaySize(this.radius * 2 * frac, this.radius * 2 * frac);
    if (this.halo) this.halo.setDisplaySize(this.radius * 2 * frac + 8, this.radius * 2 * frac + 8);
    return this.value <= 0.0001;
  }

  destroyDeposit() {
    if (this.halo) this.halo.destroy();
    this.halo = null;
    this.destroy();
  }
}
