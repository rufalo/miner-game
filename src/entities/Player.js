import Phaser from 'phaser';
import {
  PLAYER, COLOR_KEYS, COLORS, GREEN, EVOLUTION, COMBO, SHOCKWAVE, OVERCHARGE,
  SET_BONUSES,
} from '../config.js';
import { tickArmaments, tickPassives, absorbDamage } from '../systems/RecipeUpgrades.js';

export class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'player');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // The 'player' texture is 128x128. setCircle takes source pixels, but the
    // body's world size scales with the sprite, so this is correct.
    this.setDisplaySize(PLAYER.radius * 2, PLAYER.radius * 2);
    this.body.setCircle(64);
    this.setCollideWorldBounds(true);

    this.maxHP = PLAYER.baseHP;
    this.hp = this.maxHP;

    // Cargo bars are EVOLUTION GAUGES. When `current` reaches `cap` for a
    // color, a growth event fires and the gauge resets.
    this.cargo = {};
    for (const k of COLOR_KEYS) this.cargo[k] = { current: 0, cap: EVOLUTION.baseThreshold };

    // How many evolutions have been triggered for each color (drives the next
    // threshold and the value of newly-spawned parts).
    this.evolutions = { red: 0, blue: 0, green: 0, yellow: 0 };

    // Soft steering: when set, mining this color fills its gauge faster.
    this.preferredColor = null;

    // Snake-trail history. Each sample: { x, y, t }
    this.history = [];
    this.historyTimer = 0;

    // Body parts (BodyPart instances) attached to the snake. Each part is
    // a RECIPE INGREDIENT now (color + value); they trail visually but do
    // not fire weapons or grant passive stats on their own. When the tail
    // hits `RECIPE.slots`, the recipe combines and grants a player upgrade.
    this.parts = [];

    // Recipe-granted persistent state.
    this.armaments = [];               // installed UPGRADES entries with tiers
    this.recipeBoosts = {              // recomputed in RecipeUpgrades.recomputePassives
      speedMult: 1,
      mineRateMult: 1,
      gaugeFillBonus: 0,
      dashCdMult: 1,
      dashIframeBonusMs: 0,
      damageReduction: 0,
      hpRegenPerSec: 0,
      overchargeDurationBonusMs: 0,
      overchargeCdMult: 1,
      dashStrike: null,
    };
    this.maxShield = 0;
    this.shield = 0;
    this.shieldRegenPerSec = 0;
    this.shieldRegenDelayMs = 3500;
    this.shieldHitAt = 0;

    // Legacy combo state (kept zeroed so existing call sites stay safe; the
    // pre-recipe combo/hybrid path is no longer triggered).
    this.branchMode = false;
    this.rainbowSpawned = false;

    // Mark-tier aggregated passive effects (sum of every part's markEffects).
    // Refreshed inside chainChanged() so adds / upgrades both update it.
    this.markAggregate = {
      regenHpPerSec: 0,
      auraDps: 0,
      auraRadius: 0,
      dashEchoMs: 0,
      gaugeFillBonus: 0,
      lifestealPer5: 0,
      doublePickupChance: 0,
    };
    // Active set bonuses, also refreshed in chainChanged().
    this.setBonuses = {};
    // Regen accumulator + soft heartbeat for aura damage.
    this._regenCarry = 0;
    this._lifestealCarry = 0;
    this._nextAuraAt = 0;
    // Track total minerals mined across the run so the cargo Mark 3 lifesteal
    // can fire every N units.
    this._mineralAccum = 0;

    // --- Draft-granted persistent buffs ---
    // Bonus added to PLAYER.maxTailSegments by "+1 Max Tail" cards.
    this.maxTailBonus = 0;
    // Multiplicative boosts read inside BodyPart.applyKindStats / recomputeStats.
    this.boosts = {
      redDamageMult: 1,
      blueFireRateMult: 1,
      greenSpeedMult: 1,            // multiplies green's contribution to player speed
      pulseDamageMult: 1,
      pulseFireRateMult: 1,
      dashCooldownMult: 1,          // <1 = faster dash recharge
      extraYellowReduction: 0,      // adds on top of yellow part reduction
      // --- weapon-modifying ---
      bulletPierce: 0,              // # extra enemies each turret/pulse bullet pierces
      missileMultishot: 1,          // # missiles fired per missile-part volley
      clusterMissiles: false,       // missiles spawn shrapnel bullets on impact
      volatileTail: false,          // body parts explode in AoE when destroyed
      // --- active ability scaling ---
      shockwaveDamageMult: 1,
      shockwaveRadiusMult: 1,
      shockwaveCooldownMult: 1,
      overchargeDurationBonusMs: 0,
      overchargeCooldownMult: 1,
    };
    // Cards consumed while alive; persists across deaths only if we save it
    // (currently per-run only).
    this.draftsTaken = 0;

    // Damage feedback / iframes
    this.iframeUntil = 0;

    // Last movement direction (used by dash if no input held).
    this.lastDir = new Phaser.Math.Vector2(1, 0);

    // Evolution halo (visible when any gauge is near full).
    this.halo = scene.add.image(x, y, 'ring')
      .setDisplaySize(PLAYER.radius * 3.4, PLAYER.radius * 3.4)
      .setDepth(-1)
      .setAlpha(0);

    // Dash / base weapon timers.
    this.dashUntil = 0;
    this.dashReadyAt = 0;
    this.nextBasePulseAt = 0;

    // Active-ability cooldown / state.
    this.shockwaveReadyAt = 0;
    this.overchargeReadyAt = 0;
    this.overchargeUntil = 0;

    // Input
    this.cursors = scene.input.keyboard.createCursorKeys();
    this.keys = scene.input.keyboard.addKeys({
      W: Phaser.Input.Keyboard.KeyCodes.W,
      A: Phaser.Input.Keyboard.KeyCodes.A,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      D: Phaser.Input.Keyboard.KeyCodes.D,
      SPACE: Phaser.Input.Keyboard.KeyCodes.SPACE,
      Q: Phaser.Input.Keyboard.KeyCodes.Q,
      E: Phaser.Input.Keyboard.KeyCodes.E,
      ONE: Phaser.Input.Keyboard.KeyCodes.ONE,
      TWO: Phaser.Input.Keyboard.KeyCodes.TWO,
      THREE: Phaser.Input.Keyboard.KeyCodes.THREE,
      FOUR: Phaser.Input.Keyboard.KeyCodes.FOUR,
    });
    // Map keys to color names in canonical UI order (matches HUD bars).
    this.preferKeyMap = [
      ['ONE',   'red'],
      ['TWO',   'green'],
      ['THREE', 'blue'],
      ['FOUR',  'yellow'],
    ];
  }

  /**
   * Number of attached body parts of a given primary color. Hybrid parts are
   * NOT counted toward any single primary color for upgrade decisions.
   */
  partsOfColor(color) {
    let n = 0;
    for (const p of this.parts) if (p.color === color) n++;
    return n;
  }

  /** Iterates only trail-following parts (excludes orbital units). */
  trailParts() {
    return this.parts.filter(p => p.followMode !== 'orbit');
  }

  /** Current trail cap (base + draft bonus). Centralized so cards can grow it. */
  maxTail() {
    return PLAYER.maxTailSegments + (this.maxTailBonus || 0);
  }

  /** Re-applies stats on every body part (e.g. after a boost is granted). */
  refreshAllPartStats() {
    for (const p of this.parts) p.applyKindStats?.();
  }

  /**
   * Re-assigns trail chain indices (skipping orbital parts) and refreshes
   * branched lateral offsets when split-tail mode is active. Call this any
   * time the parts list changes.
   */
  chainChanged() {
    let idx = 0;
    for (const p of this.parts) {
      if (p.followMode === 'orbit') {
        p.chainIndex = -1;
        continue;
      }
      p.chainIndex = idx;
      // Branch offsets only apply past the threshold once branch mode is on.
      if (this.branchMode && idx >= COMBO.branchAtParts) {
        const beyond = idx - COMBO.branchAtParts;
        p.lateralOffset = (beyond % 2 === 0 ? -1 : 1) * COMBO.branchLateralPx;
      } else {
        p.lateralOffset = 0;
      }
      idx++;
    }

    this.recomputeMarkAggregate();
    this.recomputeSetBonuses();
    // Re-apply weapon stats so set-bonus multipliers and mark fireRate/damage
    // changes take effect immediately.
    this.refreshAllPartStats();
    this.recomputeStats();
  }

  /**
   * Recipe redesign note:
   * Mark / set bonus aggregation is intentionally a no-op now. Body parts
   * are inert ingredients; the passive buffs they used to grant (regen,
   * aura, lifesteal, etc) moved to the recipe upgrade catalog so the same
   * effects are achievable by combining the right ingredients.
   *
   * The functions are kept (returning safe defaults) so any stale call
   * sites in GameScene / UIScene don't crash during the transition.
   */
  recomputeMarkAggregate() {
    this.markAggregate = {
      regenHpPerSec: 0, auraDps: 0, auraRadius: 0, dashEchoMs: 0,
      gaugeFillBonus: 0, lifestealPer5: 0, doublePickupChance: 0,
    };
  }

  recomputeSetBonuses() {
    this.setBonuses = {
      damageMult: 1, speedMult: 1, preferredMineBonus: 0,
      missileAoeMult: 1, turretRangeMult: 1, passiveRegenHpPerSec: 0,
      active: [],
    };
  }

  recomputeStats() {
    // Movement speed comes from the recipe Speed upgrade now (+ draft boosts).
    // Body parts no longer contribute passive speed/cargo - that flavor moved
    // to the recipe ingredient + upgrade catalog.
    const greenMult = this.boosts?.greenSpeedMult ?? 1;
    const recipeSpeed = this.recipeBoosts?.speedMult ?? 1;
    this.speedMultiplier = greenMult * recipeSpeed;

    // Evolution gauge thresholds. No more yellow-part discount (the Harvest
    // recipe upgrade applies a gauge fill bonus instead, which is simpler
    // and more legible).
    let totalEvos = 0;
    for (const c of COLOR_KEYS) totalEvos += this.evolutions[c] || 0;
    for (const color of COLOR_KEYS) {
      const evos = this.evolutions[color] || 0;
      const base =
        EVOLUTION.baseThreshold +
        EVOLUTION.thresholdPerEvolution * evos +
        EVOLUTION.thresholdPerGlobalEvolution * totalEvos;
      this.cargo[color].cap = base;
    }
  }

  /**
   * Pump minerals into the matching gauge. If the gauge tops up, fires an
   * evolution event via the GameScene and resets the gauge (carrying overflow).
   * Always returns `amount` so deposits drain at a constant rate regardless of
   * the gauge state.
   */
  addMinerals(color, amount) {
    const c = this.cargo[color];
    if (!c) return 0;
    if (!this.speedMultiplier) this.recomputeStats();

    const preferredMult = EVOLUTION.preferredMineMultiplier;
    let effective = this.preferredColor === color ? amount * preferredMult : amount;
    // Harvest upgrade: percent bonus on every gauge fill.
    const gaugeBonus = this.recipeBoosts?.gaugeFillBonus ?? 0;
    if (gaugeBonus > 0) effective *= 1 + gaugeBonus;
    c.current += effective;

    if (c.current >= c.cap) {
      const overflow = c.current - c.cap;
      this.scene.triggerEvolution?.(color);
      this.cargo[color].current = Math.min(overflow, this.cargo[color].cap * 0.95);
    }
    return amount;
  }

  /**
   * Directly add to a gauge without triggering preferred multiplier. Used by
   * booster pickups. Still triggers evolution if the gauge fills.
   */
  pumpGauge(color, amount) {
    const c = this.cargo[color];
    if (!c) return;
    c.current += amount;
    if (c.current >= c.cap) {
      const overflow = c.current - c.cap;
      this.scene.triggerEvolution?.(color);
      this.cargo[color].current = Math.min(overflow, this.cargo[color].cap * 0.95);
    }
  }

  takeDamage(amount, now) {
    if (now < this.iframeUntil) return;
    // Armor / damage reduction (capped by recomputePassives at 75%).
    const dr = this.recipeBoosts?.damageReduction ?? 0;
    let dmg = amount * (1 - dr);
    // Shield first, then HP.
    dmg = absorbDamage(this, dmg, now);
    if (dmg > 0) this.hp -= dmg;
    this.iframeUntil = now + PLAYER.invulnFlashMs;
    this.scene.cameras.main.shake(80, 0.004);
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(60, () => this.clearTint());
    if (this.hp <= 0) {
      this.hp = 0;
      this.scene.onPlayerDeath?.();
    }
  }

  update(time, delta) {
    if (!this.body) return;
    if (!this.speedMultiplier) this.recomputeStats();

    // Steering: 1-4 toggles a "preferred" color (faster gauge fill while mining it).
    for (const [keyName, color] of this.preferKeyMap) {
      if (Phaser.Input.Keyboard.JustDown(this.keys[keyName])) {
        this.preferredColor = (this.preferredColor === color) ? null : color;
      }
    }

    // --- input -> direction vector ---
    const dir = new Phaser.Math.Vector2(0, 0);

    if (this.cursors.left.isDown || this.keys.A.isDown) dir.x -= 1;
    if (this.cursors.right.isDown || this.keys.D.isDown) dir.x += 1;
    if (this.cursors.up.isDown || this.keys.W.isDown) dir.y -= 1;
    if (this.cursors.down.isDown || this.keys.S.isDown) dir.y += 1;

    const pointer = this.scene.input.activePointer;
    if (dir.lengthSq() === 0 && pointer.isDown) {
      // Mouse drag: move toward world-space cursor
      const wp = pointer.positionToCamera(this.scene.cameras.main);
      dir.set(wp.x - this.x, wp.y - this.y);
      // Dead zone: don't jitter when basically on top of cursor
      if (dir.length() < 6) dir.set(0, 0);
    }

    if (dir.lengthSq() > 0) {
      dir.normalize();
      this.lastDir.copy(dir);
    }

    // Dash on Space (uses lastDir if no current input).
    const spaceJustPressed = Phaser.Input.Keyboard.JustDown(this.keys.SPACE);
    if (spaceJustPressed && time >= this.dashReadyAt) {
      const dd = dir.lengthSq() > 0 ? dir : this.lastDir;
      const dashCdMult = (this.boosts?.dashCooldownMult ?? 1)
        * (this.recipeBoosts?.dashCdMult ?? 1);
      const dashIframeBonus = this.recipeBoosts?.dashIframeBonusMs ?? 0;
      this.dashUntil = time + PLAYER.dashDurationMs;
      this.dashReadyAt = time + PLAYER.dashCooldownMs * dashCdMult;
      this.iframeUntil = Math.max(this.iframeUntil,
        time + PLAYER.dashIframeMs + dashIframeBonus);
      this.body.setVelocity(dd.x * PLAYER.dashSpeed, dd.y * PLAYER.dashSpeed);
      this.scene.spawnDashFx?.(this.x, this.y);
      // Recipe DASH STRIKE upgrade: shockwave at dash start.
      const ds = this.recipeBoosts?.dashStrike;
      if (ds) {
        this.scene.castShockwave?.(this.x, this.y, ds.radius, ds.damage, {
          color: 0xff9aa0, knockback: 0,
        });
      }
    }

    if (time < this.dashUntil) {
      // Lock velocity during dash (don't let WASD slow it down).
      // setVelocity already set above when dash started; keep it constant.
    } else {
      // World zones can slow the player (storm zones). ZoneSystem refreshes
      // this every frame in its update tick.
      const zoneMult = this.scene?.zoneSystem?.playerSpeedMult ?? 1;
      const speed = PLAYER.baseSpeed * (this.speedMultiplier || 1) * zoneMult;
      this.setVelocity(dir.x * speed, dir.y * speed);
    }

    if (dir.lengthSq() > 0) this.rotation = Math.atan2(dir.y, dir.x);

    // Q: Shockwave. Radial AoE around the player with a small i-frame window
    // so it doubles as a panic button.
    if (Phaser.Input.Keyboard.JustDown(this.keys.Q) && time >= this.shockwaveReadyAt) {
      const radius = SHOCKWAVE.radius * (this.boosts?.shockwaveRadiusMult ?? 1);
      const dmg = SHOCKWAVE.damage * (this.boosts?.shockwaveDamageMult ?? 1);
      const cd = SHOCKWAVE.cooldownMs * (this.boosts?.shockwaveCooldownMult ?? 1);
      this.iframeUntil = Math.max(this.iframeUntil, time + SHOCKWAVE.iframeMs);
      this.shockwaveReadyAt = time + cd;
      this.scene.castShockwave?.(this.x, this.y, radius, dmg);
    }

    // E: Overcharge. Recipe Overcharge upgrade extends duration / shortens cd.
    if (Phaser.Input.Keyboard.JustDown(this.keys.E) && time >= this.overchargeReadyAt) {
      const durBonus = (this.boosts?.overchargeDurationBonusMs ?? 0)
        + (this.recipeBoosts?.overchargeDurationBonusMs ?? 0);
      const cdMult = (this.boosts?.overchargeCooldownMult ?? 1)
        * (this.recipeBoosts?.overchargeCdMult ?? 1);
      const dur = OVERCHARGE.durationMs + durBonus;
      const cd = OVERCHARGE.cooldownMs * cdMult;
      this.overchargeUntil = time + dur;
      this.overchargeReadyAt = time + cd;
      this.scene.castOvercharge?.(this, dur);
    }
    const overcharged = time < this.overchargeUntil;

    // Built-in base pulse weapon.
    if (time >= this.nextBasePulseAt) {
      const target = this.scene.targeting?.findNearestEnemy(this.x, this.y, PLAYER.basePulseRange);
      if (target) {
        const angle = Math.atan2(target.y - this.y, target.x - this.x);
        let dmg  = PLAYER.basePulseDamage * (this.boosts?.pulseDamageMult ?? 1);
        let rate = PLAYER.basePulseFireRate * (this.boosts?.pulseFireRateMult ?? 1);
        if (overcharged) {
          dmg *= OVERCHARGE.damageMult;
          rate *= OVERCHARGE.fireRateMult;
        }
        const b = this.scene.spawnBullet(this.x, this.y, angle, dmg, true);
        if (b && (this.boosts?.bulletPierce ?? 0) > 0) {
          b.pierceLeft = this.boosts.bulletPierce;
        }
        this.nextBasePulseAt = time + 1000 / rate;
      }
    }

    // --- Recipe armaments + passive upgrades (replaces the old per-part
    //     weapon + mark tick path). Weapons fire from the player center;
    //     passives (shield regen, HP regen, burn aura) tick alongside.
    tickArmaments(this, this.scene, time, delta);
    tickPassives(this, this.scene, time, delta);

    // --- history buffer (snake trail) ---
    // Newest sample at index 0. Body parts follow a polyline: current player -> h[0] -> h[1] -> ...
    this.historyTimer += delta;
    while (this.historyTimer >= PLAYER.historyPushIntervalMs) {
      this.historyTimer -= PLAYER.historyPushIntervalMs;
      this.history.unshift({ x: this.x, y: this.y });
      const spacing = PLAYER.segmentSpacingFrames;
      const tailLen = this.trailParts().length;
      const maxLen =
        (tailLen + 2) * spacing + PLAYER.historyHeadroom;
      if (this.history.length > maxLen) this.history.length = maxLen;
    }

    // Damage flash
    if (time < this.iframeUntil) {
      this.alpha = 0.5 + 0.5 * Math.sin(time * 0.05);
    } else {
      this.alpha = 1;
    }

    // Evolution halo: pick the most-filled gauge and pulse if it's near full.
    if (this.halo) {
      this.halo.setPosition(this.x, this.y);
      let bestRatio = 0;
      let bestColor = null;
      for (const color of COLOR_KEYS) {
        const c = this.cargo[color];
        const r = c.cap > 0 ? c.current / c.cap : 0;
        if (r > bestRatio) { bestRatio = r; bestColor = color; }
      }
      if (bestRatio >= EVOLUTION.haloThreshold && bestColor) {
        const t = (bestRatio - EVOLUTION.haloThreshold) / (1 - EVOLUTION.haloThreshold);
        const alpha = 0.18 + 0.32 * Math.sin(time * 0.012) * t + 0.25 * t;
        this.halo.setAlpha(Math.max(0, Math.min(0.7, alpha)));
        this.halo.setTint(COLORS[bestColor]);
      } else {
        this.halo.setAlpha(0);
      }
    }
  }

  /**
   * Discrete sample (oldest = higher index). Kept for backwards compatibility.
   */
  sampleHistory(lagIndex) {
    if (this.history.length === 0) return { x: this.x, y: this.y };
    const i = Math.min(lagIndex, this.history.length - 1);
    return this.history[i];
  }

  /**
   * Smooth position along the snake polyline.
   * One unit of `floatSeg` walks one edge: player->h[0], then h[0]->h[1], etc.
   * Matches the old integer snap at history[L] when floatSeg = L + 1.
   * Also returns `tx`, `ty`: the unit tangent of the segment at that point
   * (used to compute lateral offset for branched split-tail parts).
   */
  getSnakeTrailPoint(floatSeg) {
    const px = this.x;
    const py = this.y;
    const h = this.history;
    if (floatSeg <= 0 || h.length === 0) return { x: px, y: py, tx: 1, ty: 0 };

    let rem = floatSeg;
    let ax = px;
    let ay = py;

    for (let i = 0; i < h.length; i++) {
      const bx = h[i].x;
      const by = h[i].y;
      const dx = bx - ax;
      const dy = by - ay;
      const len = Math.hypot(dx, dy) || 1;
      const tx = dx / len;
      const ty = dy / len;
      if (rem <= 1) {
        const t = Math.max(0, Math.min(1, rem));
        return {
          x: ax + dx * t,
          y: ay + dy * t,
          tx, ty,
        };
      }
      rem -= 1;
      ax = bx;
      ay = by;
    }
    return { x: ax, y: ay, tx: 1, ty: 0 };
  }
}
