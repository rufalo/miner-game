import Phaser from 'phaser';
import { ENEMY } from '../../config.js';

// Base enemy: home wander + aggro/de-aggro to player.
export class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, textureKey) {
    super(scene, x, y, textureKey);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.homeX = x;
    this.homeY = y;
    this.aggro = false;
    this.lastContactAt = 0;
    this.maxHP = 20;
    this.hp = 20;
    this.touchDamage = 0;
    this.touchCooldownMs = 600;

    // Stats overridden by subclasses
    this.moveSpeed = 100;

    this.body.allowGravity = false;
    this.setDisplaySize(28, 28);
    this.body.setSize(48, 48);
    this.body.setOffset(8, 8);

    // Idle wander
    this.wanderTarget = new Phaser.Math.Vector2(this.homeX, this.homeY);
    this.nextWanderAt = 0;
  }

  takeDamage(amount) {
    this.hp -= amount;
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(50, () => {
      if (this.active) this.clearTint();
    });
    if (this.hp <= 0) this.onDeath();
  }

  /**
   * Burn DoT applied by Mark-3 missile / swarm. Spec: { dps, durMs }. Burns
   * stack by refreshing duration and keeping the higher dps. Damage is ticked
   * by tickBurn() called from the per-enemy update path (via Enemy.update if
   * subclasses opt in, or via the GameScene update loop).
   */
  applyBurn(spec) {
    if (!spec || !this.active) return;
    const now = this.scene.time.now;
    this.burnDps = Math.max(this.burnDps || 0, spec.dps);
    this.burnUntil = Math.max(this.burnUntil || 0, now + spec.durMs);
    if (!this._burnTickAt) this._burnTickAt = now + 250;
  }

  /**
   * Phaser hook that runs every frame on every active sprite, regardless of
   * what the subclass's update() does. We use it to tick burns + advertise
   * an active burn visually without forcing subclasses to call into us.
   */
  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (this.burnUntil) {
      if (time >= this.burnUntil) {
        this.burnUntil = 0;
        this.burnDps = 0;
        this._burnTickAt = 0;
      } else if (time >= (this._burnTickAt || 0)) {
        const dmg = (this.burnDps || 0) * 0.25; // 4 Hz
        this._burnTickAt = time + 250;
        if (dmg > 0) {
          this.hp -= dmg;
          this.scene?.spawnDamageText?.(this.x, this.y - this.displayHeight / 2, dmg, 'enemy');
          if (this.hp <= 0) { this.onDeath(); return; }
        }
      }
    }
  }

  onDeath() {
    this.scene.onEnemyKilled?.(this);
    this.destroy();
  }

  distToPlayer() {
    const p = this.scene.player;
    return Math.hypot(p.x - this.x, p.y - this.y);
  }

  updateAggro() {
    const d = this.distToPlayer();
    if (!this.aggro && d < ENEMY.aggroRange) this.aggro = true;
    else if (this.aggro && d > ENEMY.deAggroRange) this.aggro = false;
  }

  wander(time) {
    if (time >= this.nextWanderAt) {
      const a = Math.random() * Math.PI * 2;
      const r = ENEMY.wanderRadiusMin + Math.random() * (ENEMY.wanderRadiusMax - ENEMY.wanderRadiusMin);
      this.wanderTarget.set(this.homeX + Math.cos(a) * r, this.homeY + Math.sin(a) * r);
      this.nextWanderAt = time + 1500 + Math.random() * 1500;
    }
    const dx = this.wanderTarget.x - this.x;
    const dy = this.wanderTarget.y - this.y;
    const d = Math.hypot(dx, dy);
    if (d < 20) {
      this.setVelocity(0, 0);
    } else {
      const s = this.moveSpeed * 0.35;
      this.setVelocity((dx / d) * s, (dy / d) * s);
    }
  }

  moveToward(tx, ty, speed) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const d = Math.hypot(dx, dy) || 1;
    this.setVelocity((dx / d) * speed, (dy / d) * speed);
    this.rotation = Math.atan2(dy, dx);
  }

  attemptContactDamage(time) {
    if (!this.touchDamage) return;
    if (time - this.lastContactAt < this.touchCooldownMs) return;
    const p = this.scene.player;
    const dx = p.x - this.x, dy = p.y - this.y;
    const r = (this.displayWidth + p.displayWidth) / 2;
    if (dx * dx + dy * dy <= r * r) {
      p.takeDamage(this.touchDamage, time);
      this.lastContactAt = time;
    }
  }
}
