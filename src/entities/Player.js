import Phaser from 'phaser';
import { PLAYER, COLOR_KEYS, COLORS, YELLOW, GREEN } from '../config.js';

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

    // Cargo: { red: { current, cap }, ... }
    this.cargo = {};
    for (const k of COLOR_KEYS) this.cargo[k] = { current: 0, cap: PLAYER.baseCargo };

    // Snake-trail history. Each sample: { x, y, t }
    this.history = [];
    this.historyTimer = 0;

    // Body parts (BodyPart instances) attached to the snake
    this.parts = [];

    // Damage feedback / iframes
    this.iframeUntil = 0;

    // Input
    this.cursors = scene.input.keyboard.createCursorKeys();
    this.keys = scene.input.keyboard.addKeys({
      W: Phaser.Input.Keyboard.KeyCodes.W,
      A: Phaser.Input.Keyboard.KeyCodes.A,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      D: Phaser.Input.Keyboard.KeyCodes.D,
    });
  }

  recomputeStats() {
    // Cargo cap from yellow parts
    let yellowBonus = 0;
    let greenBonus = 0;
    for (const p of this.parts) {
      if (p.color === 'yellow') yellowBonus += p.value * YELLOW.cargoBonusPerValue;
      else if (p.color === 'green') greenBonus += p.value * GREEN.speedBonusPerValue;
    }
    const newCap = PLAYER.baseCargo + yellowBonus;
    for (const k of COLOR_KEYS) {
      this.cargo[k].cap = newCap;
      if (this.cargo[k].current > newCap) this.cargo[k].current = newCap;
    }
    this.speedMultiplier = 1 + greenBonus;
  }

  /**
   * Try to add minerals; clamped by cap. Returns the amount actually added.
   */
  addMinerals(color, amount) {
    const c = this.cargo[color];
    if (!c) return 0;
    const room = c.cap - c.current;
    const give = Math.max(0, Math.min(room, amount));
    c.current += give;
    return give;
  }

  /**
   * Try to spend minerals. Returns true on success.
   */
  spendMinerals(color, amount) {
    const c = this.cargo[color];
    if (!c || c.current < amount) return false;
    c.current -= amount;
    return true;
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

    if (dir.lengthSq() > 0) dir.normalize();

    const speed = PLAYER.baseSpeed * (this.speedMultiplier || 1);
    this.setVelocity(dir.x * speed, dir.y * speed);

    if (dir.lengthSq() > 0) this.rotation = Math.atan2(dir.y, dir.x);

    // --- history buffer (snake trail) ---
    // Newest sample at index 0. Body parts follow a polyline: current player -> h[0] -> h[1] -> ...
    this.historyTimer += delta;
    while (this.historyTimer >= PLAYER.historyPushIntervalMs) {
      this.historyTimer -= PLAYER.historyPushIntervalMs;
      this.history.unshift({ x: this.x, y: this.y });
      const spacing = PLAYER.segmentSpacingFrames;
      const maxLen =
        (this.parts.length + 2) * spacing + PLAYER.historyHeadroom;
      if (this.history.length > maxLen) this.history.length = maxLen;
    }

    // Damage flash
    if (time < this.iframeUntil) {
      this.alpha = 0.5 + 0.5 * Math.sin(time * 0.05);
    } else {
      this.alpha = 1;
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
   * Matches the old integer snap at history[L] when floatSeg = L + 1 (see BodyPart).
   */
  getSnakeTrailPoint(floatSeg) {
    const px = this.x;
    const py = this.y;
    const h = this.history;
    if (floatSeg <= 0 || h.length === 0) return { x: px, y: py };

    let rem = floatSeg;
    let ax = px;
    let ay = py;

    for (let i = 0; i < h.length; i++) {
      const bx = h[i].x;
      const by = h[i].y;
      if (rem <= 1) {
        const t = Math.max(0, Math.min(1, rem));
        return {
          x: ax + (bx - ax) * t,
          y: ay + (by - ay) * t,
        };
      }
      rem -= 1;
      ax = bx;
      ay = by;
    }
    return { x: ax, y: ay };
  }
}
