import Phaser from 'phaser';
import { LANDMARK } from '../../config.js';

/**
 * BoulderPit: an authored world landmark that periodically launches an arcing
 * boulder at the player when they get close. Has HP and can be destroyed for
 * a mineral payout; until then it ramps tension whenever the player crosses
 * its aggro zone.
 *
 * Lifecycle:
 *   idle      - dormant; ticks only check whether the player is in aggro range
 *   telegraph - shows a flashing ring at the predicted impact point
 *   cooldown  - boulder launched; back to idle on the next interval roll
 */
export class BoulderPit extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, tier) {
    super(scene, x, y, 'landmark_pit');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.isLandmark = true;
    this.tier = tier;
    this.setDisplaySize(LANDMARK.pit.sizePx, LANDMARK.pit.sizePx);
    this.body.allowGravity = false;
    this.body.setImmovable(true);
    this.body.setCircle(48); // texture is 128x128; auto-scales with sprite
    this.setDepth(-2);

    this.maxHP = LANDMARK.pit.hp + LANDMARK.pit.hpPerTier * tier;
    this.hp = this.maxHP;

    // First eruption windowed so newly-spawned pits don't all fire at once.
    this.nextFireAt = scene.time.now + 2500 + Math.random() * 3500;
    this.state = 'idle';
    this.telegraphMarker = null;

    // Subtle living-pit pulse so the player can spot it on the map.
    this._pulse = scene.tweens.add({
      targets: this, alpha: 0.78, duration: 900, yoyo: true,
      repeat: -1, ease: 'Sine.easeInOut',
    });
  }

  /**
   * Called every frame by the physics group (runChildUpdate: true).
   */
  update(time, _delta) {
    const p = this.scene?.player;
    if (!p?.active) return;

    if (this.state === 'idle') {
      if (time < this.nextFireAt) return;
      const dx = p.x - this.x, dy = p.y - this.y;
      const r = LANDMARK.pit.aggroRange;
      if (dx * dx + dy * dy > r * r) {
        // Player too far away; defer next check briefly.
        this.nextFireAt = time + 600;
        return;
      }
      this.startTelegraph(time);
    } else if (this.state === 'telegraph' && time >= this.fireAt) {
      this.fireBoulder();
    }
  }

  startTelegraph(time) {
    const p = this.scene.player;
    this.targetX = p.x;
    this.targetY = p.y;
    this.fireAt = time + LANDMARK.pit.telegraphMs;
    this.state = 'telegraph';

    const ring = this.scene.add.circle(this.targetX, this.targetY,
      LANDMARK.pit.boulderRadius, 0xff6a3a, 0)
      .setStrokeStyle(2, 0xff6a3a, 0.85)
      .setDepth(40);
    this.scene.tweens.add({
      targets: ring, alpha: 0.55, duration: 220, yoyo: true, repeat: -1,
    });
    this.telegraphMarker = ring;
  }

  fireBoulder() {
    if (this.telegraphMarker) {
      this.telegraphMarker.destroy();
      this.telegraphMarker = null;
    }
    this.scene.spawnBoulder?.(this.x, this.y, this.targetX, this.targetY, this.tier);
    this.state = 'idle';
    this.nextFireAt = this.scene.time.now + Phaser.Math.Between(
      LANDMARK.pit.intervalMin, LANDMARK.pit.intervalMax,
    );
  }

  takeDamage(amount) {
    this.hp -= amount;
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(60, () => {
      if (this.active) this.clearTint();
    });
    if (this.hp <= 0) this.onDestroyed();
  }

  onDestroyed() {
    if (this.telegraphMarker) { this.telegraphMarker.destroy(); this.telegraphMarker = null; }
    if (this._pulse) { this._pulse.stop(); this._pulse = null; }
    this.scene.onLandmarkDestroyed?.(this);
    this.scene.spawnExplosion?.(this.x, this.y, 180);
    this.scene.cameras?.main?.shake(220, 0.005);
    this.destroy();
  }
}
