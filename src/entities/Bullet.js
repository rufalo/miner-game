import Phaser from 'phaser';
import { BLUE, ENEMY } from '../config.js';

export class Bullet extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, angle, damage, friendly) {
    super(scene, x, y, 'bullet');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.damage = damage;
    this.friendly = !!friendly;
    this.setTint(friendly ? 0x9adcff : 0xffb486);
    this.setDisplaySize(8, 8);
    // 'bullet' texture is 12x12; setCircle(6) yields a body that fully covers
    // the displayed bullet after sprite scaling.
    this.body.setCircle(6);
    this.body.allowGravity = false;

    const speed = friendly ? BLUE.bulletSpeed : ENEMY.gunnerBulletSpeed;
    this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    this.rotation = angle;

    this.lifeUntil = scene.time.now + (friendly ? BLUE.bulletLifeMs : 1400);

    // Piercing: # additional enemies this bullet can hit. The overlap handler
    // decrements this and only destroys the bullet when it reaches -1. Used by
    // the "Splinter Rounds" draft card.
    this.pierceLeft = 0;
    // Tracks which enemies were already hit so Phaser's per-frame overlap
    // doesn't double-tap the same target.
    this._hits = null;
  }

  update(time) {
    if (time >= this.lifeUntil) this.destroy();
  }
}
