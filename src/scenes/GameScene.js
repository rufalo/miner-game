import Phaser from 'phaser';
import {
  COLORS, COLOR_KEYS, WORLD, PLAYER, MINERAL, PICKUP, TIER,
  EVOLUTION, HYBRIDS, HYBRID_STATS, COMBO, DRAFT, BOSS, BIOME,
} from '../config.js';
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
import { HunterSpawner } from '../systems/HunterSpawner.js';

// localStorage key for best-run persistence.
const BEST_RUN_KEY = 'miner-snake:best-run-v1';

// --- Draft card definitions ---
// Each card: { id, title, desc, rarity, eligible(player, scene), apply(player, scene) }
// `eligible` returns true if the card should be available in the pool.
// `apply` mutates player / scene; recomputeStats + refreshAllPartStats run after.
const DRAFT_CARDS = [
  {
    id: 'tail-cap',
    title: '+1 Max Tail',
    desc: 'Raise your tail capacity by 1 segment.',
    rarity: 'rare',
    eligible: () => true,
    apply: (p) => { p.maxTailBonus = (p.maxTailBonus || 0) + 1; },
  },
  {
    id: 'red-damage',
    title: '+15% Red Damage',
    desc: 'Missiles, swarm and plasma hit 15% harder.',
    eligible: () => true,
    apply: (p) => { p.boosts.redDamageMult *= 1.15; },
  },
  {
    id: 'blue-firerate',
    title: '+15% Blue Fire Rate',
    desc: 'Turrets, rapid and prism shoot 15% faster.',
    eligible: () => true,
    apply: (p) => { p.boosts.blueFireRateMult *= 1.15; },
  },
  {
    id: 'green-speed',
    title: '+18% Green Speed Bonus',
    desc: 'Green parts contribute 18% more to your speed.',
    eligible: () => true,
    apply: (p) => { p.boosts.greenSpeedMult *= 1.18; },
  },
  {
    id: 'yellow-reduction',
    title: '+4% Threshold Discount',
    desc: 'All gauges fill 4% faster (yellow-style discount).',
    eligible: () => true,
    apply: (p) => { p.boosts.extraYellowReduction += 0.04; },
  },
  {
    id: 'pulse-damage',
    title: '+30% Pulse Damage',
    desc: 'Your built-in pulse weapon hits 30% harder.',
    eligible: () => true,
    apply: (p) => { p.boosts.pulseDamageMult *= 1.30; },
  },
  {
    id: 'pulse-firerate',
    title: '+18% Pulse Fire Rate',
    desc: 'Your built-in pulse weapon fires 18% faster.',
    eligible: () => true,
    apply: (p) => { p.boosts.pulseFireRateMult *= 1.18; },
  },
  {
    id: 'dash-cd',
    title: '-15% Dash Cooldown',
    desc: 'Dash recharges 15% faster.',
    eligible: () => true,
    apply: (p) => { p.boosts.dashCooldownMult *= 0.85; },
  },
  {
    id: 'max-hp',
    title: '+15 Max HP',
    desc: 'Raise your maximum HP and heal that amount.',
    eligible: () => true,
    apply: (p) => { p.maxHP += 15; p.hp = Math.min(p.maxHP, p.hp + 15); },
  },
  {
    id: 'heal',
    title: 'Full Heal',
    desc: 'Restore your HP to maximum.',
    eligible: (p) => p.hp < p.maxHP,
    apply: (p) => { p.hp = p.maxHP; },
  },
  {
    id: 'repair-parts',
    title: 'Repair All Parts',
    desc: 'Restore every body part to full HP.',
    eligible: (p) => p.parts.some(x => x.hp < x.maxHP),
    apply: (p) => { for (const part of p.parts) part.hp = part.maxHP; },
  },
  {
    id: 'fuse-lowest',
    title: 'Fuse Lowest 2 Tail',
    desc: 'Combine your two weakest tail segments into one (frees a slot).',
    rarity: 'utility',
    eligible: (p) => p.trailParts().length >= 2,
    apply: (p, s) => {
      const trail = p.trailParts().slice().sort((a, b) => a.value - b.value);
      const a = trail[0], b = trail[1];
      if (!a || !b) return;
      const keep = a.value >= b.value ? a : b;
      const drop = keep === a ? b : a;
      // Bigger of the two absorbs the other's value.
      keep.upgradeValue(drop.value);
      // Remove the dropped part cleanly.
      const idx = p.parts.indexOf(drop);
      if (idx >= 0) p.parts.splice(idx, 1);
      drop.destroy();
      p.chainChanged();
      s.spawnGrowthFx(keep.x, keep.y, keep.tint, 'FUSED');
    },
  },
  {
    id: 'recycle-smallest',
    title: 'Recycle Smallest Tail',
    desc: 'Remove your smallest tail segment, freeing a slot.',
    rarity: 'utility',
    eligible: (p) => p.trailParts().length >= 1,
    apply: (p) => {
      const trail = p.trailParts().slice().sort((a, b) => a.value - b.value);
      const drop = trail[0];
      if (!drop) return;
      const idx = p.parts.indexOf(drop);
      if (idx >= 0) p.parts.splice(idx, 1);
      drop.destroy();
      p.chainChanged();
    },
  },
];

export class GameScene extends Phaser.Scene {
  constructor() { super({ key: 'GameScene' }); }

  create() {
    this.worldCenter = { x: WORLD.size / 2, y: WORLD.size / 2 };
    this.physics.world.setBounds(0, 0, WORLD.size, WORLD.size);
    this.cameras.main.setBounds(0, 0, WORLD.size, WORLD.size);

    // Run stats.
    this.stats = {
      startedAt: this.time.now,
      mineralsMined: 0,
      kills: 0,
      maxTier: 0,
      partsAttached: 0,
      bossesDefeated: 0,
    };
    this.paused = false;
    this.deathHandled = false;
    // Must be reset here too: scene.restart() reuses this class instance, so
    // a stale deathPayload would make UIScene re-show the recap immediately.
    this.deathPayload = null;

    // Draft-pick state.
    this.evolutionsSinceLastDraft = 0;
    this.totalEvolutions = 0;          // for display only
    this.pendingDraft = null;          // { options: [...] } while menu is open

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
    this.hunterSpawner = new HunterSpawner(this);

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

    // Per-tier biome tint as filled annuli drawn just above the tile background
    // but beneath everything else. Painted from outside-in so inner tiers cover
    // outer fills correctly.
    const biomeG = this.add.graphics();
    biomeG.setDepth(-95);
    const cxBg = WORLD.size / 2;
    const cyBg = WORLD.size / 2;
    for (let t = TIER.maxTier; t >= 1; t--) {
      const tint = BIOME.tierColors[(t - 1) % BIOME.tierColors.length];
      const outer = TIER.safeRadius + t * TIER.ringWidth;
      biomeG.fillStyle(tint, BIOME.ringAlpha);
      biomeG.fillCircle(cxBg, cyBg, outer);
    }

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

  spawnDashFx(x, y) {
    const ring = this.add.circle(x, y, 14, 0xffffff, 0);
    ring.setStrokeStyle(2, 0xa5d8ff, 0.9);
    ring.setDepth(-5);
    this.tweens.add({
      targets: ring,
      scale: 2.4,
      alpha: 0,
      duration: 280,
      onComplete: () => ring.destroy(),
    });
  }

  /**
   * Floating damage / heal text. `kind`:
   *   'enemy' (player hurts enemy), 'player' (player took damage), 'heal'.
   */
  spawnDamageText(x, y, amount, kind = 'enemy') {
    if (amount <= 0) return;
    const color =
      kind === 'player' ? '#ff7080' :
      kind === 'heal'   ? '#7bff9e' :
                          '#ffe28a';
    const txt = this.add.text(x, y, `${Math.round(amount)}`, {
      fontFamily: 'monospace',
      fontSize: kind === 'enemy' ? '14px' : '15px',
      color,
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5, 1).setDepth(50);
    const dx = Phaser.Math.Between(-12, 12);
    this.tweens.add({
      targets: txt,
      x: txt.x + dx,
      y: txt.y - 28,
      alpha: 0,
      duration: 650,
      onComplete: () => txt.destroy(),
    });
  }

  // --- Hybrid weapon spawners ---

  spawnPlasma(x, y, angle, damage, partValue = 1) {
    const b = new Bullet(this, x, y, angle, damage, true);
    const s = HYBRID_STATS.plasma;
    b.setDisplaySize(8 * s.bulletScale, 8 * s.bulletScale);
    b.setTint(0xd58aff);
    // Override speed and lifetime to plasma's slower, longer-lived feel.
    const vx = Math.cos(angle) * s.bulletSpeed;
    const vy = Math.sin(angle) * s.bulletSpeed;
    b.setVelocity(vx, vy);
    b.lifeUntil = this.time.now + s.lifeMs;
    this.playerBullets.add(b);
    return b;
  }

  spawnRapidBullet(x, y, angle, damage) {
    const b = new Bullet(this, x, y, angle, damage, true);
    b.setDisplaySize(5, 5);
    b.setTint(0xaaffea);
    this.playerBullets.add(b);
    return b;
  }

  spawnSwarmMissile(x, y, angle, damage, partValue, target) {
    // Small, fast, light AoE missile - just a tinted standard missile.
    const m = new Missile(this, x, y, angle, damage, Math.max(1, partValue * 0.5), target, true);
    m.setTint(0xffb56a);
    m.speed = 320;
    m.aoe = HYBRID_STATS.swarm.aoeRadius + partValue * HYBRID_STATS.swarm.aoeRadiusPerValue;
    this.playerMissiles.add(m);
    return m;
  }

  // --- Evolution ---

  triggerEvolution(color) {
    const player = this.player;
    // Look for a partner gauge sitting at or above hybrid threshold.
    let partner = null;
    for (const k of COLOR_KEYS) {
      if (k === color) continue;
      const c = player.cargo[k];
      if (c.cap > 0 && c.current / c.cap >= EVOLUTION.hybridGaugeMin) {
        partner = k;
        break;
      }
    }

    if (partner && this.hybridFor(color, partner)) {
      this.spawnHybridEvolution(color, partner);
    } else {
      this.spawnEvolution(color);
    }
  }

  /** Returns the HYBRIDS entry for the (a,b) pair, or null. */
  hybridFor(a, b) {
    const key = [a, b].sort().join('+');
    return HYBRIDS[key] || null;
  }

  spawnEvolution(color) {
    const player = this.player;
    player.evolutions[color] = (player.evolutions[color] || 0) + 1;

    const trail = player.trailParts();
    const sameColorTrail = trail.filter(p => p.color === color);
    const appendMode =
      sameColorTrail.length < EVOLUTION.upgradeAtPartCount &&
      trail.length < player.maxTail();

    if (appendMode) {
      const value = EVOLUTION.baseValue + (player.evolutions[color] - 1) * EVOLUTION.valuePerEvolution;
      const part = new BodyPart(this, player, trail.length, { color, value });
      player.parts.push(part);
      this.bodyParts.add(part);
      this.spawnGrowthFx(player.x, player.y, COLORS[color], 'NEW ' + color.toUpperCase());
    } else {
      // Upgrade: weakest same-color trail part, or any trail part if none match.
      let candidates = sameColorTrail;
      if (!candidates.length) candidates = trail.slice();
      candidates.sort((a, b) => a.value - b.value);
      const target = candidates[0];
      if (target) {
        target.upgradeValue(EVOLUTION.upgradeValueIncrement);
        this.spawnGrowthFx(target.x, target.y, COLORS[color], 'UPGRADE');
      } else {
        this.spawnGrowthFx(player.x, player.y, COLORS[color], 'GROWTH');
      }
    }

    player.chainChanged();
    this.checkCombos();
    this.noteEvolutionForDraft(1);
  }

  spawnHybridEvolution(colorA, colorB) {
    const player = this.player;
    const hybrid = this.hybridFor(colorA, colorB);
    if (!hybrid) {
      this.spawnEvolution(colorA);
      return;
    }
    // Drain partner gauge fully.
    player.cargo[colorB].current = 0;
    player.evolutions[colorA] = (player.evolutions[colorA] || 0) + 1;
    player.evolutions[colorB] = (player.evolutions[colorB] || 0) + 1;

    const trail = player.trailParts();
    if (trail.length >= player.maxTail()) {
      // Tail full: still consume both gauges / evolutions, but upgrade instead of appending.
      const HYBRID_KINDS = new Set(['plasma', 'swarm', 'rapid']);
      const hybrids = trail.filter(p => HYBRID_KINDS.has(p.kind));
      let candidates = hybrids.length ? hybrids : trail.slice();
      candidates.sort((a, b) => a.value - b.value);
      const target = candidates[0];
      if (target) {
        target.upgradeValue(EVOLUTION.upgradeValueIncrement);
        this.spawnGrowthFx(target.x, target.y, hybrid.tint, hybrid.label + ' UP');
      } else {
        this.spawnGrowthFx(player.x, player.y, hybrid.tint, hybrid.label + ' !');
      }
      this.cameras.main.flash(160, 255, 255, 255, false);
      player.chainChanged();
      this.checkCombos();
      // Hybrid evolutions consume two gauges -> worth 2 toward the next draft.
      this.noteEvolutionForDraft(2);
      return;
    }

    const value = EVOLUTION.baseValue + 2;
    const part = new BodyPart(this, player, trail.length, {
      color: hybrid.kind,
      kind: hybrid.kind,
      tint: hybrid.tint,
      value,
    });
    player.parts.push(part);
    this.bodyParts.add(part);

    this.spawnGrowthFx(player.x, player.y, hybrid.tint, hybrid.label + ' !');
    this.cameras.main.flash(160, 255, 255, 255, false);
    player.chainChanged();
    this.checkCombos();
    this.noteEvolutionForDraft(2);
  }

  // --- Combo system ---

  /**
   * Scans the chain for known combo patterns and applies them.
   * Recipes:
   *   STACK   - 2 adjacent trail parts of the same weapon color (red/blue)
   *             fuse into one ORBITAL twin with boosted fire rate & damage.
   *   RAINBOW - all four primary colors present in chain spawns a PRISM
   *             orbital (one-shot, doesn't consume parts).
   *   BRANCH  - chain length >= COMBO.branchAtParts unlocks split-tail mode.
   */
  checkCombos() {
    const player = this.player;
    if (!player) return;

    // Kinds that have a weapon (passives don't fuse via STACK).
    const STACKABLE = new Set(['turret', 'missile', 'plasma', 'swarm', 'rapid']);

    // STACK: scan trail parts for adjacent same-kind weapon pairs.
    const trail = player.trailParts();
    for (let i = 0; i < trail.length - 1; i++) {
      const a = trail[i];
      const b = trail[i + 1];
      if (!a.active || !b.active) continue;
      if (a.kind !== b.kind) continue;
      if (!STACKABLE.has(a.kind)) continue;
      this.fuseStack(a, b);
      // Chain mutated; re-run combo check after fusion to catch chained combos.
      this.checkCombos();
      return;
    }

    // BRANCH: enable split-tail once chain is long enough.
    if (!player.branchMode && trail.length >= COMBO.branchAtParts) {
      player.branchMode = true;
      player.chainChanged();
      this.flashWaveBanner('SPLIT TAIL UNLOCKED');
    }

    // RAINBOW: need at least one of every primary color present somewhere
    // in the chain (orbital twins still count, branched parts still count).
    if (!player.rainbowSpawned) {
      const present = new Set(player.parts.map(p => p.color));
      const hasAll = COLOR_KEYS.every(k => present.has(k));
      if (hasAll) {
        this.spawnPrismOrbital();
        player.rainbowSpawned = true;
      }
    }
  }

  /**
   * Removes two adjacent same-kind parts and spawns one orbital twin with
   * their combined value plus stack-bonus stats.
   */
  fuseStack(a, b) {
    const player = this.player;
    const x = (a.x + b.x) * 0.5;
    const y = (a.y + b.y) * 0.5;
    const totalValue = a.value + b.value;
    const color = a.color;
    const kind = a.kind;
    const tint = a.tint;

    // Detach both parts from the chain.
    [a, b].forEach(p => {
      const idx = player.parts.indexOf(p);
      if (idx >= 0) player.parts.splice(idx, 1);
      p.destroy();
    });

    // Spawn the twin as an orbital weapon with stack-boost stats.
    const startAngle = Math.random() * Math.PI * 2;
    const twin = new BodyPart(this, player, -1, {
      color,
      kind,
      tint,
      value: totalValue,
      followMode: 'orbit',
      orbitRadius: COMBO.stackOrbitRadius,
      orbitSpeed: COMBO.stackOrbitSpeed,
      orbitStartAngle: startAngle,
      sizeMult: 1.1,
    });
    twin.stackBoost = true;
    twin.applyKindStats();
    player.parts.push(twin);
    this.bodyParts.add(twin);
    player.chainChanged();

    this.spawnGrowthFx(x, y, tint, color.toUpperCase() + ' STACK!');
    this.cameras.main.flash(140, 255, 255, 255, false);
  }

  /**
   * Spawns a single PRISM orbital that follows the player at a wider radius,
   * firing a 4-color spread at the nearest enemy.
   */
  spawnPrismOrbital() {
    const player = this.player;
    const prism = new BodyPart(this, player, -1, {
      color: 'prism',
      kind: 'prism',
      tint: 0xffffff,
      value: COMBO.prismValue,
      followMode: 'orbit',
      orbitRadius: COMBO.rainbowOrbitRadius,
      orbitSpeed: COMBO.rainbowOrbitSpeed,
      orbitStartAngle: Math.PI / 2,
      sizeMult: 1.5,
    });
    player.parts.push(prism);
    this.bodyParts.add(prism);
    player.chainChanged();

    this.spawnGrowthFx(player.x, player.y, 0xffffff, 'RAINBOW PRISM !');
    this.cameras.main.flash(280, 255, 255, 255, false);
    this.cameras.main.shake(160, 0.006);
  }

  // --- Draft pick system ---

  /**
   * Called after every evolution / hybrid evolution. Bumps a counter and,
   * once it crosses the threshold, queues a draft pick (handled by UIScene
   * which calls `applyDraftChoice`).
   */
  noteEvolutionForDraft(weight = 1) {
    this.totalEvolutions += weight;
    this.evolutionsSinceLastDraft += weight;
    if (this.pendingDraft) return; // don't queue while one is already open
    if (this.evolutionsSinceLastDraft >= DRAFT.everyNEvolutions) {
      this.openDraft();
    }
  }

  /**
   * Builds a random pool of eligible draft cards and pauses the game.
   * UIScene watches `this.pendingDraft` to show the menu.
   */
  openDraft() {
    const player = this.player;
    if (!player) return;
    const pool = DRAFT_CARDS.filter(c => c.eligible(player, this));
    if (pool.length === 0) return;
    // Sample without replacement, up to optionCount cards.
    Phaser.Utils.Array.Shuffle(pool);
    const options = pool.slice(0, Math.min(DRAFT.optionCount, pool.length));
    this.pendingDraft = { options };
    this.setPaused(true);
  }

  /** Apply a chosen card and resume play. */
  applyDraftChoice(card) {
    if (!card || !this.pendingDraft) return;
    card.apply(this.player, this);
    this.player.recomputeStats();
    this.player.refreshAllPartStats();
    this.player.draftsTaken++;
    this.evolutionsSinceLastDraft -= DRAFT.everyNEvolutions;
    if (this.evolutionsSinceLastDraft < 0) this.evolutionsSinceLastDraft = 0;
    this.pendingDraft = null;
    this.setPaused(false);
    this.spawnGrowthFx(this.player.x, this.player.y, 0xffe2a8, card.title);
  }

  /** A big ring + floating label centered on (x,y). `tint` is hex int. */
  spawnGrowthFx(x, y, tint, label) {
    const ring = this.add.circle(x, y, 16, 0xffffff, 0);
    ring.setStrokeStyle(3, tint, 1);
    ring.setDepth(40);
    this.tweens.add({
      targets: ring,
      scale: 4,
      alpha: 0,
      duration: 520,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });
    if (label) {
      const t = this.add.text(x, y - 24, label, {
        fontFamily: 'monospace', fontSize: '16px', color: '#ffe28a',
        stroke: '#000', strokeThickness: 3,
      }).setOrigin(0.5, 1).setDepth(60);
      this.tweens.add({
        targets: t,
        y: t.y - 36,
        alpha: 0,
        duration: 1100,
        onComplete: () => t.destroy(),
      });
    }
    this.cameras.main.shake(70, 0.0035);
  }

  /**
   * Big centered text that fades. Used for swarm wave warnings.
   */
  flashWaveBanner(text) {
    const cam = this.cameras.main;
    const t = this.add.text(cam.midPoint.x, cam.midPoint.y - 120, text, {
      fontFamily: 'monospace', fontSize: '22px', color: '#ff8080',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(80).setScrollFactor(1);
    this.tweens.add({
      targets: t, y: t.y - 30, alpha: 0, duration: 1800, ease: 'Quad.easeOut',
      onComplete: () => t.destroy(),
    });
    cam.shake(140, 0.0035);
  }

  spawnBoosterFx(x, y, color) {
    const ring = this.add.circle(x, y, 8, 0xffffff, 0);
    ring.setStrokeStyle(2, COLORS[color], 1);
    this.tweens.add({
      targets: ring, scale: 4, alpha: 0, duration: 320,
      onComplete: () => ring.destroy(),
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
    this.spawnDamageText(enemy.x, enemy.y - enemy.displayHeight / 2, bullet.damage, 'enemy');
    bullet.destroy();
  }

  onBulletHitPlayer(bullet, player) {
    if (!bullet.active) return;
    const before = player.hp;
    player.takeDamage(bullet.damage, this.time.now);
    const taken = before - player.hp;
    if (taken > 0) this.spawnDamageText(player.x, player.y - player.displayHeight / 2, taken, 'player');
    bullet.destroy();
  }

  onBulletHitBodyPart(bullet, part) {
    if (!bullet.active || !part.active) return;
    const dmg = bullet.damage * 0.6;
    part.takeDamage?.(dmg);
    this.spawnDamageText(part.x, part.y - part.displayHeight / 2, dmg, 'player');
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
    this.stats.kills++;

    if (enemy.isBoss) {
      this.onBossKilled(enemy);
      return;
    }

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

  /**
   * Boss-specific reward: dramatic explosion, scattered high-value minerals
   * (one of each primary color), a banner, and a guaranteed draft pick on top
   * of the normal counter (does NOT consume `evolutionsSinceLastDraft`).
   */
  onBossKilled(boss) {
    this.stats.bossesDefeated++;

    // Big explosion + camera flair.
    this.spawnExplosion(boss.x, boss.y, 140);
    this.cameras.main.flash(280, 255, 220, 180, false);
    this.cameras.main.shake(220, 0.008);

    // Scatter one high-value mineral of each color around the death point.
    const drops = COLOR_KEYS.slice(0, BOSS.mineralDropCount);
    drops.forEach((color, i) => {
      const a = (i / drops.length) * Math.PI * 2 + Math.random() * 0.4;
      const r = BOSS.mineralScatterPx * (0.6 + Math.random() * 0.6);
      const x = boss.x + Math.cos(a) * r;
      const y = boss.y + Math.sin(a) * r;
      const value = Phaser.Math.Between(BOSS.mineralValueMin, BOSS.mineralValueMax);
      this.spawner.spawnMineral(x, y, color, value);
    });

    this.flashWaveBanner(`TIER ${boss.tier} BOSS DEFEATED`);

    // Guaranteed draft pick (independent of the evolution counter). If one is
    // already open, this one will fire after the player picks the current one.
    if (!this.pendingDraft) {
      this.openDraft();
    } else {
      // Queue: schedule a check shortly after the current draft might close.
      this.time.delayedCall(200, () => {
        if (!this.pendingDraft) this.openDraft();
      });
    }
  }

  /**
   * Aggregate run stats including ms-alive and best-run persistence.
   */
  buildFinalStats() {
    const ms = Math.max(0, this.time.now - this.stats.startedAt);
    return {
      ...this.stats,
      msAlive: ms,
      partsAttached: this.player?.parts?.length ?? this.stats.partsAttached,
    };
  }

  loadBestRun() {
    try {
      const raw = localStorage.getItem(BEST_RUN_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }
  }

  saveBestRun(current) {
    const best = this.loadBestRun();
    // Composite score: minerals + kills*5 + bosses*200 + tier*100 + time bonus.
    const score = (s) =>
      (s.mineralsMined || 0) + (s.kills || 0) * 5 +
      (s.bossesDefeated || 0) * 200 + (s.maxTier || 0) * 100 +
      Math.floor((s.msAlive || 0) / 5000);
    if (!best || score(current) > score(best)) {
      try { localStorage.setItem(BEST_RUN_KEY, JSON.stringify(current)); } catch (_) {}
      return true;
    }
    return false;
  }

  onPlayerDeath() {
    if (this.deathHandled) return;
    this.deathHandled = true;
    this.player.setVelocity(0, 0);
    this.cameras.main.shake(250, 0.02);
    this.player.setTint(0x333333);

    const final = this.buildFinalStats();
    const isNewBest = this.saveBestRun(final);
    // UIScene watches scene.scene.get('GameScene').deathPayload to show recap.
    this.deathPayload = { final, isNewBest, best: this.loadBestRun() };
  }

  restartGame() {
    // Clear before restart so the UIScene cannot re-show the recap on the
    // frames between scene.restart() being queued and create() running.
    this.deathPayload = null;
    this.scene.restart();
  }

  setPaused(paused) {
    this.paused = !!paused;
    if (paused) this.physics.world.pause();
    else this.physics.world.resume();
  }

  update(time, delta) {
    if (!this.player.active) return;
    if (this.paused) return;
    if (this.player.hp <= 0) return; // freeze logic on death

    this.player.update(time, delta);
    this.hunterSpawner?.update(time);

    // Body parts follow trail
    const parts = this.player.parts;
    for (let i = 0; i < parts.length; i++) {
      parts[i].update(time, delta);
    }

    // Track stat: max tier reached
    const dist = Math.hypot(this.player.x - this.worldCenter.x, this.player.y - this.worldCenter.y);
    const tier = this.tiers.tierForDistance(dist);
    if (tier > this.stats.maxTier) this.stats.maxTier = tier;
    this.stats.partsAttached = parts.length;

    // Mining
    const dtSec = delta / 1000;
    this.minerals.getChildren().slice().forEach(m => {
      if (!m.active) return;
      const before = m.value;
      if (m.mineTick(this.player, dtSec)) {
        this.stats.mineralsMined += before; // remaining was fully taken
        const color = m.color;
        const fromX = m.x, fromY = m.y;
        m.destroyDeposit();
        this.spawner.respawnMineral(color, fromX, fromY);
      } else {
        this.stats.mineralsMined += Math.max(0, before - m.value);
      }
    });

    // Booster pickups: consume on contact, then respawn elsewhere.
    this.pickups.getChildren().slice().forEach(p => {
      if (!p.active) return;
      if (p.tryConsume(this.player)) {
        const color = p.color;
        const fromX = p.x, fromY = p.y;
        p.destroyPickup();
        this.spawner.respawnPickup(color, fromX, fromY);
      }
    });
  }
}
