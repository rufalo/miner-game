import Phaser from 'phaser';
import { STRUCTURES } from '../../config.js';

/**
 * ChainStructure — a visitable landmark that mutates the player's ingredient
 * tail when they stand inside it (cooldown between uses). The actual effect
 * is implemented in `GameScene.applyChainStructure` keyed by `structureKey`.
 */
export class ChainStructure extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, structureKey, labelText, tint) {
    super(scene, x, y, 'square');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.isChainStructure = true;
    this.structureKey = structureKey;
    this.nextUseAt = 0;

    this.setTint(tint);
    this.setDisplaySize(STRUCTURES.displaySize, STRUCTURES.displaySize);
    this.setDepth(-1);
    this.body.setImmovable(true);
    this.body.allowGravity = false;
    this.body.setSize(64, 64);

    scene.tweens.add({
      targets: this,
      alpha: { from: 0.88, to: 1 },
      scaleX: { from: 0.96, to: 1.04 },
      scaleY: { from: 0.96, to: 1.04 },
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.label = scene.add.text(x, y - STRUCTURES.displaySize / 2 - 14, labelText, {
      fontFamily: 'monospace', fontSize: '10px', color: '#dfe6f2',
    }).setOrigin(0.5, 1).setDepth(0).setAlpha(0.9);
  }

  setPosition(x, y) {
    super.setPosition(x, y);
    if (this.label) this.label.setPosition(x, y - this.displayHeight / 2 - 14);
    return this;
  }

  destroy(fromScene) {
    if (this.label) { this.label.destroy(); this.label = null; }
    super.destroy(fromScene);
  }
}
