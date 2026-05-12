import Phaser from 'phaser';
import { HUNTER, WORLD } from '../config.js';
import { HunterEnemy } from '../entities/enemies/HunterEnemy.js';
import { SwarmerEnemy } from '../entities/enemies/SwarmerEnemy.js';

/**
 * Persistent threat system. Two responsibilities:
 *
 *  1. Maintain a target number of HUNTERS active at all times. Hunters always
 *     seek the player, regardless of zones. Pressure scales with run time and
 *     the highest tier the player has reached.
 *
 *  2. Periodically launch SWARMER waves: packs of fast, fragile melee enemies
 *     that flock at the player from off-screen.
 *
 * Spawn locations are computed off-screen relative to the camera, clamped to
 * world bounds, so the player never sees something pop into existence.
 */
export class HunterSpawner {
  constructor(scene) {
    this.scene = scene;
    this.hunters = [];
    this.startedAt = scene.time.now;
    this.nextHunterAt = scene.time.now + 2500;       // small grace period at start
    this.nextSwarmAt = scene.time.now + HUNTER.swarmFirstWaveDelayMs;
    this.lastWaveAnnouncedAt = 0;
  }

  /** Active hunters target count, scaled by run time and max tier. */
  targetHunterCount() {
    const minutes = Math.max(0, (this.scene.time.now - this.startedAt) / 60000);
    const tier = this.scene.stats?.maxTier ?? 0;
    const target = HUNTER.baseCount + minutes * HUNTER.perMinute + tier * HUNTER.perTier;
    return Math.min(HUNTER.maxCount, Math.floor(target));
  }

  hunterSpawnIntervalMs() {
    const tier = this.scene.stats?.maxTier ?? 0;
    return Math.max(
      HUNTER.spawnIntervalMinMs,
      HUNTER.spawnIntervalMs - tier * HUNTER.spawnIntervalDropPerTier,
    );
  }

  /** Pick a point just outside the camera viewport, clamped to world bounds. */
  offscreenPoint(extraPad = 0) {
    const cam = this.scene.cameras.main;
    const px = this.scene.player?.x ?? cam.midPoint.x;
    const py = this.scene.player?.y ?? cam.midPoint.y;
    const dist = Math.max(cam.width, cam.height) * 0.65 + HUNTER.spawnDistance * 0.0 + extraPad;
    const angle = Math.random() * Math.PI * 2;
    const x = Phaser.Math.Clamp(px + Math.cos(angle) * dist, 80, WORLD.size - 80);
    const y = Phaser.Math.Clamp(py + Math.sin(angle) * dist, 80, WORLD.size - 80);
    return { x, y };
  }

  spawnHunter() {
    const p = this.offscreenPoint();
    const h = new HunterEnemy(this.scene, p.x, p.y);
    this.scene.enemies.add(h);
    this.hunters.push(h);
    return h;
  }

  spawnSwarmWave() {
    const tier = this.scene.stats?.maxTier ?? 0;
    const base = Phaser.Math.Between(HUNTER.swarmCountMin, HUNTER.swarmCountMax);
    const count = base + tier * HUNTER.swarmTierBonus;
    // Cluster all swarmers near the same approach vector so they read as a wave.
    const baseAngle = Math.random() * Math.PI * 2;
    const player = this.scene.player;
    if (!player) return;
    for (let i = 0; i < count; i++) {
      const a = baseAngle + (i / Math.max(1, count - 1) - 0.5) * 0.8;
      const dist = Math.max(this.scene.cameras.main.width, this.scene.cameras.main.height) * 0.55
        + (i % 3) * 40;
      const x = Phaser.Math.Clamp(player.x + Math.cos(a) * dist, 80, WORLD.size - 80);
      const y = Phaser.Math.Clamp(player.y + Math.sin(a) * dist, 80, WORLD.size - 80);
      const s = new SwarmerEnemy(this.scene, x, y);
      this.scene.enemies.add(s);
    }
    this.scene.flashWaveBanner?.(`WAVE INCOMING - ${count} swarmers`);
  }

  update(time) {
    // Clean up dead hunters.
    if (this.hunters.length) {
      this.hunters = this.hunters.filter(h => h.active);
    }

    // Top up hunter population.
    if (this.hunters.length < this.targetHunterCount() && time >= this.nextHunterAt) {
      this.spawnHunter();
      this.nextHunterAt = time + this.hunterSpawnIntervalMs();
    }

    // Swarm waves.
    if (time >= this.nextSwarmAt) {
      this.spawnSwarmWave();
      this.nextSwarmAt = time + Phaser.Math.Between(
        HUNTER.swarmIntervalMinMs,
        HUNTER.swarmIntervalMaxMs,
      );
    }
  }

  /** Seconds until the next swarmer wave. */
  secondsUntilWave(now) {
    return Math.max(0, (this.nextSwarmAt - now) / 1000);
  }

  activeHunterCount() {
    return this.hunters.filter(h => h.active).length;
  }
}
