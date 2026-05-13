import Phaser from 'phaser';
import { ZONES, TIER, COLOR_KEYS } from '../config.js';

/**
 * ZoneSystem
 *
 * Lightweight roster of timed world zones. Each zone is a `{ type, x, y,
 * targetRadius, radius, phase, ... }` record plus a couple of Phaser
 * graphics objects for the fill + ring. Phases:
 *
 *   grow    -> radius lerps 0 -> targetRadius over ZONES.growMs
 *   stable  -> at target radius until stableUntil
 *   shrink  -> radius lerps targetRadius -> 0 over ZONES.shrinkMs
 *   gone    -> awaiting destroy() next tick
 *
 * Effects (per type):
 *   danger : applies dpsToPlayer + dpsToEnemies to anything inside, at tickHz
 *   bloom  : every spawnIntervalMs while stable, spawns a small mineral
 *            inside (up to maxMineralsInside; tracked via `bloomMinerals`)
 *   storm  : ticks slow on the player; periodically lightning-strikes for
 *            strikeDamage if the player is inside
 *
 * The system is intentionally separate from physics groups - zones are not
 * collidable, they are AABB-radius queries on demand. That keeps the
 * implementation cheap and lets us layer effects without worrying about
 * physics body interactions.
 */
export class ZoneSystem {
  constructor(scene) {
    this.scene = scene;
    this.zones = [];
    this.nextSpawnAt = scene.time.now + ZONES.initialDelayMs;
    // Cached weight table for type lottery.
    this.weighted = [];
    for (const [k, def] of Object.entries(ZONES.types)) {
      for (let i = 0; i < (def.weight || 1); i++) this.weighted.push(k);
    }
    // Player slow multiplier this frame (computed in update, read by Player).
    this.playerSpeedMult = 1;
  }

  /**
   * Spawn a single zone of a random eligible type at a random reasonable
   * location, biased toward the player's current ring so it actually
   * interacts with where they are.
   */
  spawnZone(time) {
    if (this.zones.length >= ZONES.maxActive) return;
    const type = Phaser.Utils.Array.GetRandom(this.weighted);
    const def = ZONES.types[type];
    if (!def) return;

    // Place near the player's current radial distance so the zone is reachable.
    const p = this.scene.player;
    const wc = this.scene.worldCenter;
    const pdist = Math.hypot(p.x - wc.x, p.y - wc.y);
    // Within +/- one ringWidth from the player.
    const r = Phaser.Math.FloatBetween(
      Math.max(220, pdist - TIER.ringWidth * 0.5),
      pdist + TIER.ringWidth * 0.7,
    );
    const a = Math.random() * Math.PI * 2;
    const x = wc.x + Math.cos(a) * r;
    const y = wc.y + Math.sin(a) * r;

    // Don't spawn directly on top of the player.
    if (Math.hypot(x - p.x, y - p.y) < 240) return;

    const targetRadius = def.radius + Math.random() * (def.radiusJitter || 0);
    const stable = Array.isArray(def.stableMs)
      ? Phaser.Math.Between(def.stableMs[0], def.stableMs[1])
      : def.stableMs;

    const fill = this.scene.add.circle(x, y, 1, def.tintFill, def.fillAlpha).setDepth(-2);
    const ring = this.scene.add.circle(x, y, 1, 0x000000, 0)
      .setStrokeStyle(2, def.tintRing, def.ringAlpha)
      .setDepth(-2);
    const label = this.scene.add.text(x, y - 8, def.label, {
      fontFamily: 'monospace', fontSize: '11px', color: '#e8ecf2',
    }).setOrigin(0.5, 1).setAlpha(0.85).setDepth(-1);

    const zone = {
      type, def,
      x, y,
      radius: 0,
      targetRadius,
      phase: 'grow',
      growUntil: time + ZONES.growMs,
      stableUntil: time + ZONES.growMs + stable,
      shrinkUntil: time + ZONES.growMs + stable + ZONES.shrinkMs,
      fill, ring, label,
      lastTickAt: 0,
      lastBloomAt: 0,
      bloomMinerals: [],
      _pulsePhase: Math.random() * Math.PI * 2,
    };
    this.zones.push(zone);
  }

  /**
   * Per-frame tick. Lerps lifecycles, ticks effects, retires expired zones.
   */
  update(time, _delta) {
    this.playerSpeedMult = 1;

    if (time >= this.nextSpawnAt && this.zones.length < ZONES.maxActive) {
      this.spawnZone(time);
      this.nextSpawnAt = time + ZONES.spawnIntervalMs;
    }

    const p = this.scene.player;
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const z = this.zones[i];

      // Lifecycle radius lerp.
      if (z.phase === 'grow') {
        const t = 1 - (z.growUntil - time) / ZONES.growMs;
        z.radius = Math.max(0, Math.min(1, t)) * z.targetRadius;
        if (time >= z.growUntil) { z.radius = z.targetRadius; z.phase = 'stable'; }
      } else if (z.phase === 'stable') {
        z.radius = z.targetRadius;
        if (time >= z.stableUntil) z.phase = 'shrink';
      } else if (z.phase === 'shrink') {
        const t = (z.shrinkUntil - time) / ZONES.shrinkMs;
        z.radius = Math.max(0, Math.min(1, t)) * z.targetRadius;
        if (time >= z.shrinkUntil) {
          this.destroyZone(z);
          this.zones.splice(i, 1);
          continue;
        }
      }

      // Sync visuals.
      const pulse = 1 + 0.04 * Math.sin(time * 0.004 + z._pulsePhase);
      z.fill.setRadius(z.radius);
      z.ring.setRadius(z.radius * pulse);

      // Effects (only while at meaningful size).
      if (z.radius >= 40) this.applyEffects(z, p, time);
    }
  }

  /** Apply the per-frame effects of a single zone. */
  applyEffects(z, player, time) {
    if (!player?.active) return;
    const dx = player.x - z.x;
    const dy = player.y - z.y;
    const r2 = z.radius * z.radius;
    const inside = dx * dx + dy * dy <= r2;

    if (z.type === 'danger') {
      const def = z.def;
      const period = 1000 / def.tickHz;
      if (time - z.lastTickAt >= period) {
        z.lastTickAt = time;
        const playerDmg = def.dpsToPlayer / def.tickHz;
        const enemyDmg = def.dpsToEnemies / def.tickHz;
        if (inside) {
          // Bypass iframes for environmental tick? No - keep iframes so dash
          // through a pool isn't a death sentence.
          player.takeDamage?.(playerDmg, time);
        }
        // Damage enemies inside too (this is the "kite into pool" tactic).
        this.scene.enemies?.getChildren?.().forEach((e) => {
          if (!e || !e.active) return;
          const ex = e.x - z.x, ey = e.y - z.y;
          if (ex * ex + ey * ey <= r2) e.takeDamage?.(enemyDmg);
        });
      }
    } else if (z.type === 'bloom') {
      const def = z.def;
      if (z.phase === 'stable' &&
          time - z.lastBloomAt >= def.spawnIntervalMs &&
          z.bloomMinerals.filter(m => m.active).length < def.maxMineralsInside) {
        z.lastBloomAt = time;
        // Pick a random spot inside (rejection sample for uniform-ish).
        for (let tries = 0; tries < 8; tries++) {
          const a = Math.random() * Math.PI * 2;
          const dist = Math.sqrt(Math.random()) * z.radius * 0.85;
          const mx = z.x + Math.cos(a) * dist;
          const my = z.y + Math.sin(a) * dist;
          const color = Phaser.Utils.Array.GetRandom(COLOR_KEYS);
          const value = Phaser.Math.Between(def.mineralValueMin, def.mineralValueMax);
          const m = this.scene.spawner?.spawnMineral?.(mx, my, color, value);
          if (m) { z.bloomMinerals.push(m); break; }
        }
      }
    } else if (z.type === 'storm') {
      const def = z.def;
      if (inside) this.playerSpeedMult = Math.min(this.playerSpeedMult, def.slowMult);
      const period = 1000 / def.tickHz;
      if (time - z.lastTickAt >= period) {
        z.lastTickAt = time;
        if (inside && Math.random() < def.strikeChance) {
          // Visual: brief bolt line above the player into the strike target.
          const sx = player.x + (Math.random() * 80 - 40);
          const sy = player.y;
          this.scene.spawnExplosion?.(sx, sy, 60);
          this.scene.cameras?.main?.shake(110, 0.003);
          player.takeDamage?.(def.strikeDamage, time);
        }
      }
    }
  }

  destroyZone(z) {
    if (z.fill)  z.fill.destroy();
    if (z.ring)  z.ring.destroy();
    if (z.label) z.label.destroy();
  }

  /**
   * Reset (e.g. on GameScene.restart). Cleans up all visuals.
   */
  shutdown() {
    for (const z of this.zones) this.destroyZone(z);
    this.zones.length = 0;
  }
}
