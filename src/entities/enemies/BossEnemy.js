import Phaser from 'phaser';
import { Enemy } from './Enemy.js';
import { BOSS } from '../../config.js';

/**
 * Tier mini-boss. One spawned per tier ring at world seed. Idle until the
 * player closes within `aggroRange`; from then on it slowly pursues and
 * alternates two telegraphed attacks:
 *
 *   - Ring shot: a wide warning ring inflates, then bullets fire in N
 *     directions outward.
 *   - Missile barrage: a smaller red telegraph appears, then several homing
 *     missiles launch.
 *
 * Below 30% HP it enters BERSERK: ~2x speed and faster attacks.
 *
 * Boss-specific state lives on `this.isBoss = true` and `this.tier` so
 * GameScene.onEnemyKilled can route the reward properly.
 */
export class BossEnemy extends Enemy {
  constructor(scene, x, y, tier) {
    super(scene, x, y, 'enemy_boss');
    this.isBoss = true;
    this.tier = tier;

    this.maxHP = BOSS.baseHP + BOSS.hpPerTier * tier;
    this.hp = this.maxHP;
    this.touchDamage = BOSS.contactDamage;
    this.touchCooldownMs = BOSS.contactCooldownMs;
    this.moveSpeed = BOSS.speed;
    this.setDisplaySize(BOSS.displaySize, BOSS.displaySize);
    // Bigger hit box than visual so the player can actually hit it.
    this.body.setSize(64, 64);
    this.body.setOffset(0, 0);
    this.setDepth(2);

    // Berserk flag and entry tween are one-shot.
    this.berserk = false;

    // Attack timers - random initial offset so different bosses don't sync.
    const now = scene.time.now;
    this.nextRingAt = now + 2500 + Math.random() * 1500;
    this.nextBarrageAt = now + 4500 + Math.random() * 2000;

    // Telegraph indicator (created lazily).
    this.telegraph = null;

    // Floating boss-HP bar (drawn each frame).
    this.hpBarBg = scene.add.rectangle(x, y - 50, 110, 8, 0x000000, 0.75)
      .setOrigin(0.5, 0).setStrokeStyle(1, 0x2a3548).setDepth(60);
    this.hpBarFill = scene.add.rectangle(x - 54, y - 49, 108, 6, 0xff3a3a, 0.95)
      .setOrigin(0, 0).setDepth(60);
    this.label = scene.add.text(x, y - 64, `TIER ${tier} BOSS`, {
      fontFamily: 'monospace', fontSize: '12px', color: '#ff9b9b',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5, 1).setDepth(60);
  }

  /** Override: bosses keep aggro forever once engaged. */
  updateAggro() {
    if (this.aggro) return;
    if (this.distToPlayer() < BOSS.aggroRange) this.aggro = true;
  }

  /** Berserk transition. */
  maybeEnterBerserk() {
    if (this.berserk) return;
    if (this.hp / this.maxHP <= BOSS.berserkHpRatio) {
      this.berserk = true;
      this.moveSpeed *= BOSS.berserkSpeedMult;
      // Attacks come faster in berserk - bring schedules forward.
      const now = this.scene.time.now;
      this.nextRingAt    = Math.min(this.nextRingAt,    now + 800);
      this.nextBarrageAt = Math.min(this.nextBarrageAt, now + 1200);
      this.scene.cameras.main.shake(180, 0.005);
      this.scene.flashWaveBanner?.(`TIER ${this.tier} BOSS - BERSERK`);
    }
  }

  /** Show a brief telegraph ring before an attack. */
  showTelegraph(color, durationMs) {
    if (this.telegraph) this.telegraph.destroy();
    const t = this.scene.add.circle(this.x, this.y, 12, 0, 0);
    t.setStrokeStyle(3, color, 0.95).setDepth(40);
    this.telegraph = t;
    this.scene.tweens.add({
      targets: t,
      scale: durationMs > 800 ? 14 : 9,
      alpha: 0.1,
      duration: durationMs,
      onComplete: () => t.destroy(),
    });
    // Keep it stuck to the boss.
    t.followUntil = this.scene.time.now + durationMs;
  }

  fireRingShot() {
    const count = BOSS.ringBulletCount + Math.floor(this.tier * 0.5);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const b = this.scene.spawnBullet(this.x, this.y, a, BOSS.ringBulletDamage + this.tier * 1.2, false);
      // Boost speed beyond Bullet default by adjusting velocity directly.
      if (b?.body) {
        const vx = Math.cos(a) * BOSS.ringBulletSpeed;
        const vy = Math.sin(a) * BOSS.ringBulletSpeed;
        b.body.setVelocity(vx, vy);
        b.setTint(0xff8888);
      }
    }
    this.scene.cameras.main.shake(80, 0.003);
  }

  fireBarrage() {
    const p = this.scene.player;
    if (!p) return;
    const count = BOSS.barrageMissileCount + Math.floor(this.tier * 0.5);
    for (let i = 0; i < count; i++) {
      const a = Math.atan2(p.y - this.y, p.x - this.x)
        + (i - (count - 1) / 2) * 0.18;
      const m = this.scene.spawnMissile(
        this.x, this.y, a,
        BOSS.barrageMissileDamage + this.tier * 1.5,
        BOSS.barrageMissilePartValue, p, false,
      );
      if (m) m.setTint(0xff7777);
    }
  }

  /** Bosses do not destroy on hit; clean up extras here. */
  onDeath() {
    if (this.telegraph) { this.telegraph.destroy(); this.telegraph = null; }
    if (this.hpBarBg)   this.hpBarBg.destroy();
    if (this.hpBarFill) this.hpBarFill.destroy();
    if (this.label)     this.label.destroy();
    super.onDeath();
  }

  update(time, delta) {
    this.updateAggro();
    this.maybeEnterBerserk();

    if (!this.aggro) {
      this.setVelocity(0, 0);
    } else {
      const p = this.scene.player;
      if (p) this.moveToward(p.x, p.y, this.moveSpeed);
    }

    // Telegraph follow.
    if (this.telegraph?.active && time < this.telegraph.followUntil) {
      this.telegraph.setPosition(this.x, this.y);
    }

    // Floating HP bar.
    if (this.hpBarBg?.active) {
      const frac = Math.max(0, this.hp / this.maxHP);
      this.hpBarBg.setPosition(this.x, this.y - 50);
      this.hpBarFill.setPosition(this.x - 54, this.y - 49);
      this.hpBarFill.setSize(108 * frac, 6);
      this.label.setPosition(this.x, this.y - 64);
    }

    this.attemptContactDamage(time);

    if (!this.aggro) return;

    // Ring shot with telegraph.
    if (time >= this.nextRingAt) {
      const ramp = this.berserk ? 0.65 : 1;
      this.showTelegraph(0xff8888, BOSS.ringTelegraphMs);
      this.scene.time.delayedCall(BOSS.ringTelegraphMs, () => {
        if (this.active) this.fireRingShot();
      });
      this.nextRingAt = time + BOSS.ringFireIntervalMs * ramp;
    }

    // Missile barrage with telegraph.
    if (time >= this.nextBarrageAt) {
      const ramp = this.berserk ? 0.65 : 1;
      this.showTelegraph(0xffd54a, BOSS.barrageTelegraphMs);
      this.scene.time.delayedCall(BOSS.barrageTelegraphMs, () => {
        if (this.active) this.fireBarrage();
      });
      this.nextBarrageAt = time + BOSS.barrageIntervalMs * ramp;
    }
  }
}
