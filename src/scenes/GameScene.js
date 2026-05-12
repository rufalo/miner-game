import Phaser from 'phaser';
import { COLORS, COLOR_KEYS, WORLD, PLAYER, MINERAL, PICKUP, TIER } from '../config.js';
import { Player } from '../entities/Player.js';
import { BodyPart } from '../entities/BodyPart.js';
import { MineralDeposit } from '../entities/MineralDeposit.js';
import { BodyPartPickup } from '../entities/BodyPartPickup.js';
import { Bullet } from '../entities/Bullet.js';
import { Missile } from '../entities/Missile.js';
import { ChaserEnemy } from '../entities/enemies/ChaserEnemy.js';
import { DasherEnemy } from '../entities/enemies/DasherEnemy.js';
import { GunnerEnemy } from '../entities/enemies/GunnerEnemy.js';
import { MissileEnemy } from '../entities/enemies/MissileEnemy.js';
import { BruteEnemy } from '../entities/enemies/BruteEnemy.js';
import { Tiers } from '../systems/Tiers.js';
import { Spawner } from '../systems/Spawner.js';
import { Targeting } from '../systems/Targeting.js';

export class GameScene extends Phaser.Scene {
  constructor() { super({ key: 'GameScene' }); }

  create() {
    this.worldCenter = { x: WORLD.size / 2, y: WORLD.size / 2 };
    this.physics.world.setBounds(0, 0, WORLD.size, WORLD.size);
    this.cameras.main.setBounds(0, 0, WORLD.size, WORLD.size);

    this.drawBackground();

    // Groups
    this.minerals = this.physics.add.group({ runChildUpdate: false });
    this.pickups = this.physics.add.group({ runChildUpdate: false });
    this.bodyParts = this.physics.add.group({ runChildUpdate: false });
    this.enemies = this.physics.add.group({ runChildUpdate: true });
    this.playerBullets = this.physics.add.group({ runChildUpdate: true });
    this.enemyBullets = this.physics.add.group({ runChildUpdate: true });
    this.playerMissiles = this.physics.add.group({ runChildUpdate: true });
    this.enemyMissiles = this.physics.add.group({ runChildUpdate: true });
    this.fx = this.add.group();

    // Systems
    this.tiers = new Tiers(this.worldCenter);
    this.targeting = new Targeting(this);
    this.spawner = new Spawner(this, this.tiers);

    // Player
    this.player = new Player(this, this.worldCenter.x, this.worldCenter.y);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);

    // World seeding
    this.spawner.seedWorld();

    // Overlaps
    this.physics.add.overlap(this.playerBullets, this.enemies, this.onBulletHitEnemy, null, this);
    this.physics.add.overlap(this.enemyBullets, this.player, this.onBulletHitPlayer, null, this);
    this.physics.add.overlap(this.enemyBullets, this.bodyParts, this.onBulletHitBodyPart, null, this);
    this.physics.add.overlap(this.playerMissiles, this.enemies, this.onMissileHitEnemy, null, this);
    this.physics.add.overlap(this.enemyMissiles, this.player, this.onMissileHitPlayer, null, this);
    this.physics.add.overlap(this.enemyMissiles, this.bodyParts, this.onMissileHitBodyPart, null, this);

    this.lastTickAt = 0;
  }

  drawBackground() {
    // Grid via a tile-sized graphics generated once
    const tile = WORLD.gridSize;
    const g = this.add.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(WORLD.background, 1);
    g.fillRect(0, 0, tile, tile);
    g.lineStyle(1, WORLD.gridColor, 1);
    g.lineBetween(0, 0, tile, 0);
    g.lineBetween(0, 0, 0, tile);
    g.generateTexture('bg_tile', tile, tile);
    g.destroy();

    this.add.tileSprite(0, 0, WORLD.size, WORLD.size, 'bg_tile')
      .setOrigin(0, 0)
      .setDepth(-100);

    // Concentric tier rings
    const ringG = this.add.graphics();
    ringG.setDepth(-90);
    ringG.lineStyle(2, 0x2a3548, 0.6);
    ringG.strokeCircle(WORLD.size / 2, WORLD.size / 2, TIER.safeRadius);
    ringG.lineStyle(1, 0x2a3548, 0.35);
    for (let t = 1; t <= TIER.maxTier; t++) {
      ringG.strokeCircle(WORLD.size / 2, WORLD.size / 2, TIER.safeRadius + t * TIER.ringWidth);
    }

    // Origin marker
    const marker = this.add.graphics();
    marker.setDepth(-89);
    marker.lineStyle(1, 0x3a4868, 0.7);
    const cx = WORLD.size / 2, cy = WORLD.size / 2;
    marker.lineBetween(cx - 24, cy, cx + 24, cy);
    marker.lineBetween(cx, cy - 24, cx, cy + 24);
    marker.strokeCircle(cx, cy, 6);
  }

  spawnEnemyForTier(x, y, tier) {
    // Each tier slightly shifts the type mix toward more dangerous enemies.
    const roll = Math.random();
    const t = Math.min(4, tier);
    let cls;
    if (t === 1) {
      if (roll < 0.6) cls = ChaserEnemy;
      else if (roll < 0.85) cls = GunnerEnemy;
      else cls = DasherEnemy;
    } else if (t === 2) {
      if (roll < 0.4) cls = ChaserEnemy;
      else if (roll < 0.65) cls = GunnerEnemy;
      else if (roll < 0.85) cls = DasherEnemy;
      else cls = MissileEnemy;
    } else if (t === 3) {
      if (roll < 0.25) cls = ChaserEnemy;
      else if (roll < 0.45) cls = GunnerEnemy;
      else if (roll < 0.7) cls = DasherEnemy;
      else if (roll < 0.9) cls = MissileEnemy;
      else cls = BruteEnemy;
    } else {
      if (roll < 0.18) cls = ChaserEnemy;
      else if (roll < 0.35) cls = GunnerEnemy;
      else if (roll < 0.55) cls = DasherEnemy;
      else if (roll < 0.78) cls = MissileEnemy;
      else cls = BruteEnemy;
    }
    const e = new cls(this, x, y, tier);
    this.enemies.add(e);
    return e;
  }

  spawnBullet(x, y, angle, damage, friendly) {
    const b = new Bullet(this, x, y, angle, damage, friendly);
    (friendly ? this.playerBullets : this.enemyBullets).add(b);
    return b;
  }

  spawnMissile(x, y, angle, damage, partValue, target, friendly) {
    const m = new Missile(this, x, y, angle, damage, partValue, target, friendly);
    (friendly ? this.playerMissiles : this.enemyMissiles).add(m);
    return m;
  }

  spawnSmokePuff(x, y) {
    const c = this.add.circle(x, y, 3, 0xaaaaaa, 0.5);
    c.setDepth(-10);
    this.tweens.add({
      targets: c,
      alpha: 0,
      scale: 2.4,
      duration: 380,
      onComplete: () => c.destroy(),
    });
  }

  spawnExplosion(x, y, radius) {
    const c = this.add.circle(x, y, radius * 0.4, 0xffce80, 0.55);
    const ring = this.add.circle(x, y, 2, 0xffffff, 0.0);
    ring.setStrokeStyle(3, 0xffce80, 0.9);
    this.tweens.add({
      targets: c,
      scale: 2.4,
      alpha: 0,
      duration: 350,
      onComplete: () => c.destroy(),
    });
    this.tweens.add({
      targets: ring,
      scale: radius / 2,
      alpha: 0,
      duration: 380,
      onComplete: () => ring.destroy(),
    });
    this.cameras.main.shake(70, 0.0025);
  }

  // --- Overlap handlers ---
  // Phaser passes (object1, object2) in the same order registered.

  onBulletHitEnemy(bullet, enemy) {
    if (!bullet.active || !enemy.active) return;
    enemy.takeDamage?.(bullet.damage);
    bullet.destroy();
  }

  onBulletHitPlayer(bullet, player) {
    if (!bullet.active) return;
    player.takeDamage(bullet.damage, this.time.now);
    bullet.destroy();
  }

  onBulletHitBodyPart(bullet, part) {
    if (!bullet.active || !part.active) return;
    part.takeDamage?.(bullet.damage * 0.6);
    bullet.destroy();
  }

  onMissileHitEnemy(missile, enemy) {
    if (!missile.active || !enemy.active) return;
    missile.explode();
  }

  onMissileHitPlayer(missile, player) {
    if (!missile.active) return;
    missile.explode();
  }

  onMissileHitBodyPart(missile, part) {
    if (!missile.active || !part.active) return;
    missile.explode();
  }

  onEnemyKilled(enemy) {
    // Drop a small mineral worth ~3
    const colors = COLOR_KEYS;
    const dropColor = Phaser.Utils.Array.GetRandom(colors);
    const value = 3 + Math.floor(Math.random() * 4);
    this.spawner.spawnMineral(
      enemy.x + Phaser.Math.Between(-12, 12),
      enemy.y + Phaser.Math.Between(-12, 12),
      dropColor, value
    );

    // Particle puff
    const puff = this.add.circle(enemy.x, enemy.y, 16, 0xffffff, 0.8);
    this.tweens.add({
      targets: puff, scale: 2, alpha: 0, duration: 280,
      onComplete: () => puff.destroy(),
    });
  }

  onPlayerDeath() {
    this.player.setVelocity(0, 0);
    this.cameras.main.shake(250, 0.02);
    this.player.setTint(0x333333);
  }

  update(time, delta) {
    if (!this.player.active) return;
    if (this.player.hp <= 0) return; // freeze logic on death

    this.player.update(time, delta);

    // Body parts follow trail
    const parts = this.player.parts;
    for (let i = 0; i < parts.length; i++) {
      parts[i].update(time, delta);
    }

    // Mining
    const dtSec = delta / 1000;
    this.minerals.getChildren().slice().forEach(m => {
      if (!m.active) return;
      if (m.mineTick(this.player, dtSec)) {
        const color = m.color;
        const fromX = m.x, fromY = m.y;
        m.destroyDeposit();
        this.spawner.respawnMineral(color, fromX, fromY);
      }
    });

    // Pickup purchases
    this.pickups.getChildren().slice().forEach(p => {
      if (!p.active) return;
      if (p.tryPurchase(this.player)) {
        const color = p.color;
        const fromX = p.x, fromY = p.y;
        p.destroyPickup();
        this.spawner.respawnPickup(color, fromX, fromY);
      }
    });
  }
}
