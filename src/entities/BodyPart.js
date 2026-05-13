import Phaser from 'phaser';
import {
  BODY_PART, COLORS, BLUE, RED, PLAYER, KIND_BY_COLOR, HYBRID_STATS, COMBO,
  OVERCHARGE, MARK, MARK_ABILITIES,
} from '../config.js';

// Tint cycle for the PRISM orbital.
const PRISM_TINT_CYCLE = [0xff5b6d, 0xffd64a, 0x52d97a, 0x4aa9ff];

/**
 * Body segment. `color` is its identifier (red/blue/green/yellow or a hybrid
 * kind like 'plasma'); `kind` drives weapon/passive behavior. For non-hybrid
 * parts, kind defaults to KIND_BY_COLOR[color].
 *
 * Construction options:
 *   {
 *     color, value, kind?, tint?,
 *     followMode?,        // 'trail' (default) | 'orbit'
 *     lateralOffset?,     // perpendicular offset for split-tail parts
 *     orbitRadius?,       // px distance from player when orbiting
 *     orbitSpeed?,        // rad/sec
 *     orbitStartAngle?,   // initial orbit angle
 *     sizeMult?,          // visual scale multiplier (used for prism/twin)
 *   }
 */
export class BodyPart extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, player, chainIndex, opts) {
    const followMode = opts.followMode || 'trail';
    const orbitRadius = opts.orbitRadius ?? 50;
    const orbitStartAngle = opts.orbitStartAngle ?? 0;

    let sx, sy;
    if (followMode === 'orbit') {
      sx = player.x + Math.cos(orbitStartAngle) * orbitRadius;
      sy = player.y + Math.sin(orbitStartAngle) * orbitRadius;
    } else {
      const s = player.getSnakeTrailPoint(BodyPart.trailFloatSeg(chainIndex, player));
      sx = s.x;
      sy = s.y;
    }
    super(scene, sx, sy, 'square');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.player = player;
    this.color = opts.color;
    this.kind = opts.kind || KIND_BY_COLOR[opts.color] || opts.color;
    this.tint = opts.tint ?? (COLORS[opts.color] ?? 0xffffff);
    this.value = opts.value;
    this.chainIndex = chainIndex;

    // Follow / formation state.
    this.followMode = followMode;
    this.lateralOffset = opts.lateralOffset || 0;
    this.orbitRadius = orbitRadius;
    this.orbitSpeed = opts.orbitSpeed ?? 1.6;
    this.orbitAngle = orbitStartAngle;
    this.sizeMult = opts.sizeMult ?? 1;

    this.applySize();
    this.body.setSize(64, 64);
    this.body.allowGravity = false;
    this.body.setImmovable(true);

    this.setTint(this.tint);
    this.setDepth(this.followMode === 'orbit' ? 5 : -1 - chainIndex);

    this.maxHP = BODY_PART.hpBase + this.value * BODY_PART.hpPerValue;
    this.hp = this.maxHP;

    this.nextFireAt = 0;

    // Mark tier (1..4) derived from `value`. Promotions trigger qualitative
    // ability unlocks via applyMarkAbilities().
    this.mark = 1;
    this.markEffects = {};   // populated by applyMarkAbilities()
    this.markGlow = null;    // visual ring drawn at mark 2+
    this.applyKindStats();
  }

  /** Mark tier (1..4) for a given accumulated value. */
  static markForValue(v) {
    let m = 1;
    for (let i = 0; i < MARK.thresholds.length; i++) {
      if (v >= MARK.thresholds[i]) m = i + 1;
    }
    return m;
  }

  /**
   * Merges every MARK_ABILITIES entry up to this.mark into this.markEffects.
   * Each ability is a flat object (multishot, pierce, etc); later marks can
   * override earlier ones for the same key (e.g. successive +pierce just take
   * the highest one).
   */
  applyMarkAbilities() {
    const table = MARK_ABILITIES[this.kind] || {};
    const eff = {};
    for (let m = 2; m <= this.mark; m++) {
      const row = table[m];
      if (!row) continue;
      for (const k of Object.keys(row)) {
        // Numeric accumulators stack additively; multipliers compose; flags overwrite.
        const v = row[k];
        if (typeof v === 'number') {
          if (k.endsWith('Mult')) eff[k] = (eff[k] ?? 1) * v;
          else eff[k] = (eff[k] ?? 0) + v;
        } else {
          eff[k] = v;
        }
      }
    }
    this.markEffects = eff;
    this.refreshMarkGlow();
  }

  /**
   * Adds / refreshes a subtle outer ring whose color and thickness reflect
   * the mark tier. Mark 1 = no ring.
   */
  refreshMarkGlow() {
    if (!this.scene) return;
    const colors = [0, 0xcfd6e3, 0xffd64a, 0xff8a4a]; // M1, M2, M3, M4
    if (this.mark <= 1) {
      if (this.markGlow) { this.markGlow.destroy(); this.markGlow = null; }
      return;
    }
    const c = colors[this.mark - 1] || 0xffffff;
    if (!this.markGlow) {
      this.markGlow = this.scene.add.image(this.x, this.y, 'ring').setDepth(-2);
    }
    const size = this.displayWidth + 12;
    this.markGlow.setDisplaySize(size, size);
    this.markGlow.setTint(c);
    this.markGlow.setAlpha(this.mark === 2 ? 0.45 : this.mark === 3 ? 0.55 : 0.7);
  }

  applySize() {
    const size = (BODY_PART.baseSize + this.value * BODY_PART.sizePerValue) * (this.sizeMult || 1);
    this.setDisplaySize(size, size);
  }

  /**
   * Recomputes weapon stats from `value` and `kind`. Called when constructed
   * and again whenever the part is upgraded. Also recomputes the part's mark
   * tier and its ability flags (markEffects).
   */
  applyKindStats() {
    // Recompute mark from accumulated value. Track previous mark so we can
    // play a promotion banner on upgrade.
    const prevMark = this.mark || 1;
    this.mark = BodyPart.markForValue(this.value);
    this.applyMarkAbilities();

    switch (this.kind) {
      case 'turret':
        this.fireRate = BLUE.baseFireRate + this.value * BLUE.fireRatePerValue;
        this.range    = BLUE.baseRange    + this.value * BLUE.rangePerValue;
        this.damage   = BLUE.baseDamage   + this.value * BLUE.damagePerValue;
        break;
      case 'missile':
        this.fireRate = RED.baseFireRate + this.value * RED.fireRatePerValue;
        this.range    = RED.baseRange    + this.value * RED.rangePerValue;
        this.damage   = RED.baseDamage   + this.value * RED.damagePerValue;
        break;
      case 'plasma': {
        const s = HYBRID_STATS.plasma;
        this.fireRate = s.baseFireRate + this.value * s.fireRatePerValue;
        this.range    = s.baseRange    + this.value * s.rangePerValue;
        this.damage   = s.baseDamage   + this.value * s.damagePerValue;
        break;
      }
      case 'swarm': {
        const s = HYBRID_STATS.swarm;
        this.fireRate = s.baseFireRate + this.value * s.fireRatePerValue;
        this.range    = s.baseRange    + this.value * s.rangePerValue;
        this.damage   = s.baseDamage   + this.value * s.damagePerValue;
        break;
      }
      case 'rapid': {
        const s = HYBRID_STATS.rapid;
        this.fireRate = s.baseFireRate + this.value * s.fireRatePerValue;
        this.range    = s.baseRange    + this.value * s.rangePerValue;
        this.damage   = s.baseDamage   + this.value * s.damagePerValue;
        break;
      }
      case 'prism':
        this.fireRate = COMBO.prismFireRate;
        this.range    = COMBO.prismRange;
        this.damage   = COMBO.prismBaseDamage + this.value * COMBO.prismDamagePerValue;
        break;
      default:
        // Passive parts (speed / cargo): no weapon stats.
        break;
    }

    // Stack-fused parts get a fire-rate / damage boost on top of base kind.
    if (this.stackBoost) {
      this.fireRate *= COMBO.stackFireRateMult;
      this.damage   *= COMBO.stackDamageMult;
    }

    // Draft-card persistent boosts. Apply by color so "red damage" hits
    // missiles + swarm (red-derived), "blue fire rate" hits turret + rapid +
    // plasma + prism (blue-derived).
    const b = this.player?.boosts;
    if (b && this.damage != null) {
      const RED_KINDS  = new Set(['missile', 'swarm', 'plasma']);
      const BLUE_KINDS = new Set(['turret', 'rapid', 'plasma', 'prism']);
      if (RED_KINDS.has(this.kind))  this.damage   *= b.redDamageMult || 1;
      if (BLUE_KINDS.has(this.kind)) this.fireRate *= b.blueFireRateMult || 1;
    }

    // Mark multipliers (damageMult / fireRateMult). These compose on top of
    // every other modifier including draft boosts and stack fusion.
    const eff = this.markEffects;
    if (eff.damageMult && this.damage != null)   this.damage   *= eff.damageMult;
    if (eff.fireRateMult && this.fireRate != null) this.fireRate *= eff.fireRateMult;

    // Set-bonus multipliers from Player.chainChanged. Applied here so they
    // refresh whenever any part changes.
    const sb = this.player?.setBonuses;
    if (sb) {
      if (this.kind === 'missile' && sb.missileAoeMult) {
        // Missile range/damage stay the same; AoE is on the Missile instance,
        // which reads partValue. We instead pass a multiplier through
        // markEffects so the missile spawner can scale aoe at fire time.
      }
      if (sb.damageMult && this.damage != null) this.damage *= sb.damageMult;
    }

    // If we just promoted, the GameScene can show a banner.
    if (this.mark > prevMark && this.scene && this.player?.active) {
      this.scene.spawnMarkPromotionFx?.(this);
    }
  }

  /**
   * Bumps `value` by `by`, refreshes size, HP and weapon stats, and plays a
   * brief grow-shrink tween.
   */
  upgradeValue(by) {
    this.value += by;
    this.applySize();
    this.maxHP = BODY_PART.hpBase + this.value * BODY_PART.hpPerValue;
    this.hp = this.maxHP;
    this.applyKindStats();
    const baseScale = this.scaleX;
    this.scene.tweens.add({
      targets: this,
      scaleX: baseScale * 1.6,
      scaleY: baseScale * 1.6,
      yoyo: true,
      duration: 220,
      ease: 'Quad.easeOut',
    });
  }

  takeDamage(amount) {
    this.hp -= amount;
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(50, () => {
      if (this.active) this.setTint(this.tint);
    });
    if (this.hp <= 0) this.destroyPart();
  }

  destroyPart() {
    // "Volatile Tail" draft card: detonate the dying segment in a small AoE
    // before removing it. Damage scales with the part's `value`.
    if (this.player?.boosts?.volatileTail && this.scene) {
      const radius = 110 + this.value * 6;
      const dmg = 14 + this.value * 3;
      this.scene.castShockwave?.(this.x, this.y, radius, dmg, {
        color: this.tint, knockback: 0,
      });
    }
    const idx = this.player.parts.indexOf(this);
    if (idx >= 0) this.player.parts.splice(idx, 1);
    // Losing the PRISM allows a future RAINBOW combo to spawn a new one.
    if (this.kind === 'prism' && this.player) this.player.rainbowSpawned = false;
    // Reindex trail parts + refresh branched offsets + recompute stats.
    this.player.chainChanged?.();
    if (this.markGlow) { this.markGlow.destroy(); this.markGlow = null; }
    this.destroy();
  }

  /**
   * Continuous distance along the player->history polyline (in edge units).
   * Calibrated so integer spacing matches the old `sampleHistory(lag)` target of history[lag].
   */
  static trailFloatSeg(chainIndex, player) {
    const spacing = PLAYER.segmentSpacingFrames;
    const lag = (chainIndex + 1) * spacing;
    const frac =
      player.historyTimer / Math.max(1e-6, PLAYER.historyPushIntervalMs);
    return lag + 1 + frac;
  }

  /**
   * Called from GameScene update loop after Player updates.
   */
  update(time, delta) {
    if (!this.player.active) return;

    if (this.followMode === 'orbit') {
      this.orbitAngle += this.orbitSpeed * (delta / 1000);
      const px = this.player.x + Math.cos(this.orbitAngle) * this.orbitRadius;
      const py = this.player.y + Math.sin(this.orbitAngle) * this.orbitRadius;
      this.setPosition(px, py);
      // Face the direction of travel (tangent to the orbit).
      this.rotation = this.orbitAngle + Math.PI / 2;
    } else {
      const seg = BodyPart.trailFloatSeg(this.chainIndex, this.player);
      const s = this.player.getSnakeTrailPoint(seg);
      let x = s.x;
      let y = s.y;
      if (this.lateralOffset) {
        // s.tx / s.ty come from a SINGLE 12 ms polyline segment, which makes the
        // tangent wobble between frames and snap at segment boundaries -> visible
        // lateral flicker for split-tail parts. Smooth it by sampling a point
        // slightly newer and slightly older on the trail and taking the unit
        // delta between them. Window ~1.5 units = ~18 ms of player movement.
        const w = 1.5;
        const a = this.player.getSnakeTrailPoint(Math.max(0, seg - w));
        const b = this.player.getSnakeTrailPoint(seg + w);
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const tx = dx / len;
        const ty = dy / len;
        // Perpendicular to the smoothed tangent: (-ty, tx)
        x += -ty * this.lateralOffset;
        y +=  tx * this.lateralOffset;
      }
      this.setPosition(x, y);
    }

    if (this.body) {
      this.body.setVelocity(0, 0);
      this.body.reset(this.x, this.y);
    }

    // PRISM cycles through the four primary tints to advertise itself.
    if (this.kind === 'prism') {
      const i = Math.floor(time / 220) % PRISM_TINT_CYCLE.length;
      this.setTint(PRISM_TINT_CYCLE[i]);
    }

    // Mark glow follows the part, gently pulsing so it advertises promotion.
    if (this.markGlow) {
      this.markGlow.setPosition(this.x, this.y);
      const baseAlpha = this.mark === 2 ? 0.45 : this.mark === 3 ? 0.55 : 0.7;
      this.markGlow.setAlpha(baseAlpha + 0.10 * Math.sin(time * 0.006));
    }

    if (time < this.nextFireAt) return;

    const weapon = this.weaponInfo();
    if (!weapon) return;
    const target = this.scene.targeting?.findNearestEnemy(this.x, this.y, this.range);
    if (!target) return;

    const angle = Math.atan2(target.y - this.y, target.x - this.x);

    // Overcharge window: temporarily bump damage and fire rate. We swap
    // `damage` for the duration of the fire() call so the existing dispatchers
    // pick it up without each one having to know about overcharge.
    const overcharged = this.player && this.scene.time.now < (this.player.overchargeUntil || 0);
    if (overcharged) {
      const origDmg = this.damage;
      this.damage = origDmg * OVERCHARGE.damageMult;
      try { weapon.fire(this, target, angle); }
      finally { this.damage = origDmg; }
      this.nextFireAt = time + 1000 / (this.fireRate * OVERCHARGE.fireRateMult);
    } else {
      weapon.fire(this, target, angle);
      this.nextFireAt = time + 1000 / this.fireRate;
    }
  }

  /**
   * Pulls the current piercing bonus from the player's boosts (defaults to 0)
   * plus this part's mark-granted pierce bonus.
   */
  pierceCount() {
    const base = this.player?.boosts?.bulletPierce ?? 0;
    const fromMark = this.markEffects?.pierce ?? 0;
    return base + fromMark;
  }

  /**
   * Volley size. Combines Twin/Tri Missile draft cards with mark-granted
   * multishot. Mark 2 missile/swarm contributes +1, mark 4 contributes more.
   */
  missileCount() {
    const base = Math.max(1, this.player?.boosts?.missileMultishot ?? 1);
    const fromMark = this.markEffects?.multishot ?? 0;
    return Math.max(1, base + fromMark);
  }

  /**
   * Turret/rapid/prism multishot. Same shape as missileCount, only used for
   * bullet weapons. Pulse weapon (player base) is unaffected.
   */
  bulletMultishot() {
    return 1 + (this.markEffects?.multishot ?? 0);
  }

  /**
   * Rolls crit. Returns the actual damage to deal for one shot, plus a flag
   * the caller can use to color-flash. Crit doubles damage.
   */
  rollDamage() {
    const crit = (this.markEffects?.critChance ?? 0) > 0
      && Math.random() < this.markEffects.critChance;
    return { dmg: crit ? this.damage * 2 : this.damage, crit };
  }

  /** Burn config (if any) for projectiles this part fires. */
  burnSpec() {
    return this.markEffects?.burn || null;
  }

  /**
   * Decorates a spawned bullet with mark abilities: pierce, crit color,
   * burn payload. Returns the bullet for chaining.
   */
  _decorateBullet(b, dmgRoll) {
    if (!b) return b;
    if (this.pierceCount() > 0) b.pierceLeft = this.pierceCount();
    if (dmgRoll?.crit) {
      b.setTint(0xffffff);
      b.setDisplaySize(b.displayWidth * 1.25, b.displayHeight * 1.25);
    }
    const burn = this.burnSpec();
    if (burn) b.burn = burn;
    return b;
  }

  /** Returns a dispatcher for the current weapon kind, or null for passives. */
  weaponInfo() {
    switch (this.kind) {
      case 'turret':
        return { fire: (self, _t, a) => {
          const n = self.bulletMultishot();
          const spread = 0.08;
          for (let i = 0; i < n; i++) {
            const off = n === 1 ? 0 : (i - (n - 1) / 2) * spread;
            const roll = self.rollDamage();
            const b = self.scene.spawnBullet(self.x, self.y, a + off, roll.dmg, true);
            self._decorateBullet(b, roll);
          }
        } };
      case 'missile':
        return { fire: (self, t, a) => {
          const n = self.missileCount();
          const burn = self.burnSpec();
          // Symmetric fan: 1 -> dead center, 2 -> +/-, 3 -> [-,0,+], ...
          const spread = 0.18;
          for (let i = 0; i < n; i++) {
            const off = n === 1 ? 0 : (i - (n - 1) / 2) * spread;
            const m = self.scene.spawnMissile(self.x, self.y, a + off, self.damage, self.value, t, true);
            if (!m) continue;
            if (self.player?.boosts?.clusterMissiles) m.cluster = true;
            // Polychrome set + missile AoE set bonuses act through the missile.
            const sb = self.player?.setBonuses;
            if (sb?.missileAoeMult && m.aoe) m.aoe *= sb.missileAoeMult;
            if (burn) m.burn = burn;
          }
        } };
      case 'plasma':
        return { fire: (self, _t, a) => {
          const roll = self.rollDamage();
          const b = self.scene.spawnPlasma(self.x, self.y, a, roll.dmg, self.value);
          self._decorateBullet(b, roll);
          // Mark 3 plasma: on-hit AoE radius + damage multiplier hitch-hike on
          // the bullet so the overlap handler can read it.
          if (b && self.markEffects?.onHitAoeRadius) {
            b.onHitAoeRadius = self.markEffects.onHitAoeRadius;
            b.onHitAoeDamage = roll.dmg * (self.markEffects.onHitAoeDamageMult ?? 0.35);
          }
        } };
      case 'swarm':
        return { fire: (self, t, a) => {
          const burn = self.burnSpec();
          const m = self.scene.spawnSwarmMissile(self.x, self.y, a, self.damage, self.value, t);
          if (m && self.player?.boosts?.clusterMissiles) m.cluster = true;
          if (m && burn) m.burn = burn;
        } };
      case 'rapid':
        return { fire: (self, _t, a) => {
          const n = self.bulletMultishot();
          const spread = 0.06;
          for (let i = 0; i < n; i++) {
            const off = n === 1 ? 0 : (i - (n - 1) / 2) * spread;
            const roll = self.rollDamage();
            const b = self.scene.spawnRapidBullet(self.x, self.y, a + off, roll.dmg);
            self._decorateBullet(b, roll);
          }
        } };
      case 'prism':
        return { fire: (self, _t, a) => {
          const colors = PRISM_TINT_CYCLE;
          const fan = COMBO.prismFanRadians;
          const pierce = self.pierceCount();
          for (let i = 0; i < 4; i++) {
            const off = (i - 1.5) * (fan / 3);
            const b = self.scene.spawnBullet(self.x, self.y, a + off, self.damage, true);
            b.setTint(colors[i]);
            if (pierce > 0) b.pierceLeft = pierce;
          }
        } };
      default:
        return null;
    }
  }
}
