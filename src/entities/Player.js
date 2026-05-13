import Phaser from 'phaser';
import { PLAYER, COLOR_KEYS, COLORS, GREEN, EVOLUTION, COMBO } from '../config.js';

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

    // Body parts (BodyPart instances) attached to the snake
    this.parts = [];

    // Combo state.
    this.branchMode = false;           // split-tail unlocked
    this.rainbowSpawned = false;       // PRISM orbital spawned

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

    // Input
    this.cursors = scene.input.keyboard.createCursorKeys();
    this.keys = scene.input.keyboard.addKeys({
      W: Phaser.Input.Keyboard.KeyCodes.W,
      A: Phaser.Input.Keyboard.KeyCodes.A,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      D: Phaser.Input.Keyboard.KeyCodes.D,
      SPACE: Phaser.Input.Keyboard.KeyCodes.SPACE,
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
    this.recomputeStats();
  }

  recomputeStats() {
    let greenBonus = 0;
    let yellowCount = 0;
    for (const p of this.parts) {
      if (p.color === 'green') greenBonus += p.value * GREEN.speedBonusPerValue;
      else if (p.color === 'yellow') yellowCount++;
      // Hybrid bonus contributions:
      else if (p.kind === 'rapid') greenBonus += p.value * GREEN.speedBonusPerValue * 0.3;
    }
    this.speedMultiplier = 1 + greenBonus;

    const reduction = Math.min(
      EVOLUTION.yellowReductionCap,
      yellowCount * EVOLUTION.yellowThresholdReduction
    );

    // Threshold per color = baseThreshold
    //   + per-color ramp (rewards switching colors)
    //   + global ramp from total evolutions across all colors (every upgrade
    //     makes future evolutions cost more, regardless of which color),
    //   minus the yellow reduction.
    let totalEvos = 0;
    for (const c of COLOR_KEYS) totalEvos += this.evolutions[c] || 0;
    for (const color of COLOR_KEYS) {
      const evos = this.evolutions[color] || 0;
      const base =
        EVOLUTION.baseThreshold +
        EVOLUTION.thresholdPerEvolution * evos +
        EVOLUTION.thresholdPerGlobalEvolution * totalEvos;
      this.cargo[color].cap = base * (1 - reduction);
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

    const effective = this.preferredColor === color
      ? amount * EVOLUTION.preferredMineMultiplier
      : amount;
    c.current += effective;

    if (c.current >= c.cap) {
      const overflow = c.current - c.cap;
      this.scene.triggerEvolution?.(color);
      // recomputeStats() inside triggerEvolution updates `cap`; restart gauge.
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
    this.hp -= amount;
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
      this.dashUntil = time + PLAYER.dashDurationMs;
      this.dashReadyAt = time + PLAYER.dashCooldownMs;
      this.iframeUntil = Math.max(this.iframeUntil, time + PLAYER.dashIframeMs);
      this.body.setVelocity(dd.x * PLAYER.dashSpeed, dd.y * PLAYER.dashSpeed);
      this.scene.spawnDashFx?.(this.x, this.y);
    }

    if (time < this.dashUntil) {
      // Lock velocity during dash (don't let WASD slow it down).
      // setVelocity already set above when dash started; keep it constant.
    } else {
      const speed = PLAYER.baseSpeed * (this.speedMultiplier || 1);
      this.setVelocity(dir.x * speed, dir.y * speed);
    }

    if (dir.lengthSq() > 0) this.rotation = Math.atan2(dir.y, dir.x);

    // Built-in base pulse weapon.
    if (time >= this.nextBasePulseAt) {
      const target = this.scene.targeting?.findNearestEnemy(this.x, this.y, PLAYER.basePulseRange);
      if (target) {
        const angle = Math.atan2(target.y - this.y, target.x - this.x);
        this.scene.spawnBullet(this.x, this.y, angle, PLAYER.basePulseDamage, true);
        this.nextBasePulseAt = time + 1000 / PLAYER.basePulseFireRate;
      }
    }

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
