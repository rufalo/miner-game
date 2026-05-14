import Phaser from 'phaser';
import { MINERAL, PICKUP, TIER, ENEMY, COLOR_KEYS, LANDMARK, NEUTRAL, PATROL, STRUCTURES } from '../config.js';
import { MineralDeposit } from '../entities/MineralDeposit.js';
import { BodyPartPickup } from '../entities/BodyPartPickup.js';
import { BossEnemy } from '../entities/enemies/BossEnemy.js';
import { BoulderPit } from '../entities/world/BoulderPit.js';
import { NeutralMiner } from '../entities/NeutralMiner.js';
import { PatrollerEnemy } from '../entities/enemies/PatrollerEnemy.js';
import { ChainStructure } from '../entities/world/ChainStructure.js';

// Owns mineral/pickup/enemy zone seeding and respawn-elsewhere behavior.
export class Spawner {
  constructor(scene, tiers) {
    this.scene = scene;
    this.tiers = tiers;
    this.zones = []; // { x, y, tier, enemies: [], anchorDeposit }
    this.bosses = []; // BossEnemy instances spawned at world seed
    this.landmarks = []; // BoulderPit instances
    this.neutrals = []; // NeutralMiner instances
    this.chainStructures = []; // ChainStructure instances
  }

  /**
   * Build the initial world layout once.
   */
  seedWorld() {
    this.seedInnerMinerals();
    this.seedInnerPickups();
    this.seedOuterZones();
    this.seedBosses();
    this.seedLandmarks();
    this.seedNeutralMiners();
    this.seedPatrollers();
    this.seedChainStructures();
  }

  /** Weighted random key from STRUCTURES.defs. */
  pickChainStructureType() {
    const pool = [];
    for (const [key, def] of Object.entries(STRUCTURES.defs)) {
      for (let i = 0; i < (def.weight || 1); i++) pool.push(key);
    }
    return Phaser.Utils.Array.GetRandom(pool);
  }

  /**
   * Seed visitable chain mutators: a few inside the safe ring + one per
   * outer tier. Each picks a random effect type (solar conflux, prism spire,
   * etc.) so every run reads differently.
   */
  seedChainStructures() {
    this.chainStructures = this.chainStructures || [];
    const wc = this.scene.worldCenter;

    const placeOne = (x, y) => {
      const key = this.pickChainStructureType();
      const def = STRUCTURES.defs[key];
      if (!def) return;
      const s = new ChainStructure(this.scene, x, y, key, def.label, def.tint);
      this.scene.chainStructures.add(s);
      this.chainStructures.push(s);
    };

    for (let i = 0; i < STRUCTURES.innerCount; i++) {
      const p = this.randomInnerPoint(420);
      placeOne(p.x, p.y);
    }

    for (let tier = 1; tier <= TIER.maxTier; tier++) {
      const ringInner = TIER.safeRadius + (tier - 1) * TIER.ringWidth;
      const ringOuter = TIER.safeRadius + tier * TIER.ringWidth;
      for (let j = 0; j < STRUCTURES.perTier; j++) {
        const a = Math.random() * Math.PI * 2;
        const r = Phaser.Math.FloatBetween(ringInner + 120, ringOuter - 120);
        placeOne(wc.x + Math.cos(a) * r, wc.y + Math.sin(a) * r);
      }
    }
  }

  /**
   * Per tier, drop a handful of patrol routes. Each route is `waypointCount`
   * points scattered around a route center, walked in order. PatrollerEnemy
   * cycles through them at patrol speed and chases the player when seen.
   */
  seedPatrollers() {
    this.patrollers = this.patrollers || [];
    for (let tier = 1; tier <= TIER.maxTier; tier++) {
      const ringInner = TIER.safeRadius + (tier - 1) * TIER.ringWidth;
      const ringOuter = TIER.safeRadius + tier * TIER.ringWidth;
      for (let i = 0; i < PATROL.perTier; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = Phaser.Math.FloatBetween(ringInner + 200, ringOuter - 200);
        const cx = this.scene.worldCenter.x + Math.cos(a) * r;
        const cy = this.scene.worldCenter.y + Math.sin(a) * r;
        const wpCount = Phaser.Math.Between(PATROL.waypointCount[0], PATROL.waypointCount[1]);
        const route = [];
        for (let w = 0; w < wpCount; w++) {
          const wa = (w / wpCount) * Math.PI * 2 + Math.random() * 0.5;
          const wr = Phaser.Math.FloatBetween(PATROL.routeRadius * 0.4, PATROL.routeRadius);
          route.push({ x: cx + Math.cos(wa) * wr, y: cy + Math.sin(wa) * wr });
        }
        const p = new PatrollerEnemy(this.scene, route, tier);
        this.scene.enemies.add(p);
        this.patrollers.push(p);
      }
    }
  }

  /**
   * Place `LANDMARK.pit.perTier` boulder pits in each tier ring at evenly
   * spaced angles, rotated per tier so they don't line up with bosses. Each
   * pit is anchored ~60-80% of the way out into its ring.
   */
  seedLandmarks() {
    for (let tier = 1; tier <= TIER.maxTier; tier++) {
      const ringInner = TIER.safeRadius + (tier - 1) * TIER.ringWidth;
      const ringOuter = TIER.safeRadius + tier * TIER.ringWidth;
      const count = LANDMARK.pit.perTier;
      const phase = (tier - 1) * (Math.PI / TIER.maxTier) + 0.7; // offset from bosses
      for (let i = 0; i < count; i++) {
        const a = phase + (i / count) * Math.PI * 2 + (Math.random() * 0.4 - 0.2);
        const r = Phaser.Math.FloatBetween(
          ringInner + (ringOuter - ringInner) * 0.45,
          ringInner + (ringOuter - ringInner) * 0.80,
        );
        const x = this.scene.worldCenter.x + Math.cos(a) * r;
        const y = this.scene.worldCenter.y + Math.sin(a) * r;
        const pit = new BoulderPit(this.scene, x, y, tier);
        this.scene.landmarks.add(pit);
        this.landmarks.push(pit);
      }
    }
  }

  /**
   * Sprinkle neutral miners across each tier ring. They pathfind to the
   * nearest mineral deposit on their own once active.
   */
  seedNeutralMiners() {
    for (let tier = 1; tier <= TIER.maxTier; tier++) {
      const ringInner = TIER.safeRadius + (tier - 1) * TIER.ringWidth;
      const ringOuter = TIER.safeRadius + tier * TIER.ringWidth;
      for (let i = 0; i < NEUTRAL.miner.perTier; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = Phaser.Math.FloatBetween(ringInner + 80, ringOuter - 80);
        const x = this.scene.worldCenter.x + Math.cos(a) * r;
        const y = this.scene.worldCenter.y + Math.sin(a) * r;
        const m = new NeutralMiner(this.scene, x, y, tier);
        this.scene.enemies.add(m);
        this.neutrals.push(m);
      }
    }
    // Also a couple inside the safe ring so the player sees one early.
    for (let i = 0; i < 2; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Phaser.Math.FloatBetween(360, TIER.safeRadius - 120);
      const x = this.scene.worldCenter.x + Math.cos(a) * r;
      const y = this.scene.worldCenter.y + Math.sin(a) * r;
      const m = new NeutralMiner(this.scene, x, y, 0);
      this.scene.enemies.add(m);
      this.neutrals.push(m);
    }
  }

  /**
   * One boss per tier ring at a fixed angle (rotated by tier so they don't
   * line up on the same compass heading) at the outer edge of the ring.
   */
  seedBosses() {
    for (let tier = 1; tier <= TIER.maxTier; tier++) {
      const ringOuter = TIER.safeRadius + tier * TIER.ringWidth;
      // Bosses sit ~85% of the way out into their ring.
      const r = ringOuter - TIER.ringWidth * 0.15;
      // Rotate by tier so each boss is on a different compass heading.
      const angle = (tier - 1) * (Math.PI * 2 / TIER.maxTier) + Math.PI / TIER.maxTier;
      const x = this.scene.worldCenter.x + Math.cos(angle) * r;
      const y = this.scene.worldCenter.y + Math.sin(angle) * r;
      const boss = new BossEnemy(this.scene, x, y, tier);
      this.scene.enemies.add(boss);
      this.bosses.push(boss);
    }
  }

  seedInnerMinerals() {
    for (const color of COLOR_KEYS) {
      for (let i = 0; i < MINERAL.innerPerColor; i++) {
        const p = this.randomInnerPoint();
        const value = Phaser.Math.Between(MINERAL.innerValueMin, MINERAL.innerValueMax);
        this.spawnMineral(p.x, p.y, color, value);
      }
    }
  }

  seedInnerPickups() {
    // Bias: green and yellow more common near spawn; blue and red rarer
    const weights = { green: 3, yellow: 3, blue: 1, red: 1 };
    const colors = [];
    for (const k of COLOR_KEYS) for (let i = 0; i < weights[k]; i++) colors.push(k);

    for (let i = 0; i < PICKUP.innerCount; i++) {
      const color = Phaser.Utils.Array.GetRandom(colors);
      const p = this.randomInnerPoint(520); // keep pickups away from exact spawn
      const [lo, hi] = this.tiers.pickupValueRange(0);
      const value = Phaser.Math.Between(lo, hi);
      this.spawnPickup(p.x, p.y, color, value);
    }
  }

  seedOuterZones() {
    const ringPad = 140;
    const zoneJitter = 0.22; // fraction of one slot: breaks perfect symmetry

    for (let tier = 1; tier <= TIER.maxTier; tier++) {
      const ringInner = TIER.safeRadius + (tier - 1) * TIER.ringWidth;
      const ringOuter = TIER.safeRadius + tier * TIER.ringWidth;
      for (let i = 0; i < ENEMY.zonesPerTier; i++) {
        // Evenly space zones around the ring so they do not bunch on one side.
        const baseAngle = (i / ENEMY.zonesPerTier) * Math.PI * 2;
        const angle = baseAngle + (Math.random() * 2 - 1) * zoneJitter * (Math.PI * 2 / ENEMY.zonesPerTier);
        const r = Phaser.Math.FloatBetween(ringInner + ringPad, ringOuter - ringPad);
        const cx = this.scene.worldCenter.x + Math.cos(angle) * r;
        const cy = this.scene.worldCenter.y + Math.sin(angle) * r;
        const zone = { x: cx, y: cy, tier, enemies: [] };
        this.zones.push(zone);

        // Anchor mineral deposit at zone center
        const color = Phaser.Utils.Array.GetRandom(COLOR_KEYS);
        const [lo, hi] = this.tiers.mineralValueRange(tier);
        this.spawnMineral(cx, cy, color, Phaser.Math.Between(lo, hi));

        // One body-part pickup near the zone (rarer colors bias outward)
        const partColors = tier >= 3
          ? ['blue', 'red', 'red', 'yellow', 'green']
          : ['blue', 'red', 'yellow', 'green', 'green'];
        const partColor = Phaser.Utils.Array.GetRandom(partColors);
        const [plo, phi] = this.tiers.pickupValueRange(tier);
        const px = cx + Phaser.Math.Between(-220, 220);
        const py = cy + Phaser.Math.Between(-220, 220);
        this.spawnPickup(px, py, partColor, Phaser.Math.Between(plo, phi));

        // Enemies for the zone (caller assembles types via callback)
        const count = Phaser.Math.Between(ENEMY.enemiesPerZoneMin, ENEMY.enemiesPerZoneMax);
        for (let e = 0; e < count; e++) {
          const ex = cx + Phaser.Math.Between(-280, 280);
          const ey = cy + Phaser.Math.Between(-280, 280);
          const ent = this.scene.spawnEnemyForTier(ex, ey, tier);
          if (ent) {
            ent.homeX = cx;
            ent.homeY = cy;
            zone.enemies.push(ent);
          }
        }
      }
    }
  }

  randomInnerPoint(minDist = 160) {
    const edge = 120;
    const maxR = Math.max(minDist + 40, TIER.safeRadius - edge);
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Phaser.Math.FloatBetween(minDist, maxR);
      const x = this.scene.worldCenter.x + Math.cos(a) * r;
      const y = this.scene.worldCenter.y + Math.sin(a) * r;
      return { x, y };
    }
    return { x: this.scene.worldCenter.x, y: this.scene.worldCenter.y };
  }

  /**
   * Pick a respawn point in the same ring as `dist`, away from the player.
   */
  pointInRingAwayFromPlayer(dist, playerX, playerY, awayPad = 1100) {
    const wc = this.scene.worldCenter;
    let bestPt = null;
    let bestD2 = -1;
    const ringPad = 100;
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * Math.PI * 2;
      let r;
      if (dist <= TIER.safeRadius) {
        r = Phaser.Math.FloatBetween(160, TIER.safeRadius - ringPad);
      } else {
        const tier = this.tiers.tierForDistance(dist);
        const ringInner = TIER.safeRadius + (tier - 1) * TIER.ringWidth;
        const ringOuter = TIER.safeRadius + tier * TIER.ringWidth;
        r = Phaser.Math.FloatBetween(ringInner + ringPad, ringOuter - ringPad);
      }
      const x = wc.x + Math.cos(a) * r;
      const y = wc.y + Math.sin(a) * r;
      const dx = x - playerX;
      const dy = y - playerY;
      const d2 = dx * dx + dy * dy;
      if (d2 > bestD2) { bestD2 = d2; bestPt = { x, y }; }
      if (d2 > awayPad * awayPad) return { x, y };
    }
    return bestPt;
  }

  spawnMineral(x, y, color, value) {
    const m = new MineralDeposit(this.scene, x, y, color, value);
    this.scene.minerals.add(m);
    return m;
  }

  spawnPickup(x, y, color, value) {
    const p = new BodyPartPickup(this.scene, x, y, color, value);
    this.scene.pickups.add(p);
    return p;
  }

  /**
   * Called when a mineral is fully mined. Spawn another of the same color somewhere
   * with a value appropriate for the player's current tier (so it stays useful).
   */
  respawnMineral(color, fromX, fromY) {
    const wc = this.scene.worldCenter;
    const dist = Math.hypot(fromX - wc.x, fromY - wc.y);
    const tier = this.tiers.tierForDistance(dist);
    const [lo, hi] = this.tiers.mineralValueRange(tier);
    const value = Phaser.Math.Between(lo, hi);
    const p = this.pointInRingAwayFromPlayer(dist, this.scene.player.x, this.scene.player.y);
    if (!p) return;
    this.spawnMineral(p.x, p.y, color, value);
  }

  /**
   * Called when a body-part pickup is consumed. Place a replacement, biased by tier.
   */
  respawnPickup(color, fromX, fromY) {
    const wc = this.scene.worldCenter;
    const dist = Math.hypot(fromX - wc.x, fromY - wc.y);
    const tier = this.tiers.tierForDistance(dist);
    const [lo, hi] = this.tiers.pickupValueRange(tier);
    const value = Phaser.Math.Between(lo, hi);
    const p = this.pointInRingAwayFromPlayer(dist, this.scene.player.x, this.scene.player.y);
    if (!p) return;
    this.scene.time.delayedCall(4000, () => this.spawnPickup(p.x, p.y, color, value));
  }
}
