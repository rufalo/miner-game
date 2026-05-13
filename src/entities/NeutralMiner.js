import Phaser from 'phaser';
import { Enemy } from './enemies/Enemy.js';
import { NEUTRAL, COLOR_KEYS } from '../config.js';

/**
 * NeutralMiner: a non-hostile actor that wanders the world hunting mineral
 * deposits and draining them slowly. Stays neutral until the player attacks
 * them, then enrages and becomes a chaser-like threat.
 *
 * Reuses Enemy as a base so it picks up: physics body, takeDamage flash,
 * preUpdate burn ticks (you can light them on fire), wander() helper, and
 * onDeath() -> scene.onEnemyKilled. We override the AI loop to swap between
 * "look for a deposit" and "hunt the player".
 *
 * On death, drops a small MineralDeposit of a random primary color so the
 * player gets a tangible reward for clearing the area.
 */
export class NeutralMiner extends Enemy {
  constructor(scene, x, y, tier) {
    super(scene, x, y, 'neutral_miner');
    this.tier = tier;
    this.isNeutralMiner = true;
    this.neutral = true;

    this.maxHP = NEUTRAL.miner.hp + NEUTRAL.miner.hpPerTier * tier;
    this.hp = this.maxHP;
    this.touchDamage = 0; // peaceful
    this.touchCooldownMs = NEUTRAL.miner.enragedContactCooldownMs;
    this.moveSpeed = NEUTRAL.miner.speed;
    this.setDisplaySize(26, 26);
    this.setDepth(1);

    this.targetNode = null;
    this.nextScanAt = 0;
    this.miningCooldown = 0;
  }

  /**
   * Override base aggro: neutrals only become "aggro" after they've been
   * attacked (handled in takeDamage -> enrage). Until then we stay peaceful
   * regardless of player proximity.
   */
  updateAggro() {
    if (this.neutral) {
      this.aggro = false;
      return;
    }
    const d = this.distToPlayer();
    if (d > 1400) this.aggro = false;
    else this.aggro = true;
  }

  enrage() {
    if (!this.neutral) return;
    this.neutral = false;
    this.aggro = true;
    this.moveSpeed = NEUTRAL.miner.enragedSpeed;
    this.touchDamage = NEUTRAL.miner.enragedDamage;
    this.targetNode = null;
    this.setTint(0xff8a8a);
    // Brief flash so the change in disposition reads.
    this.scene.tweens.add({
      targets: this, alpha: 0.55, duration: 100, yoyo: true, repeat: 2,
    });
  }

  takeDamage(amount) {
    // Any hit from the player flips this miner hostile before we apply damage,
    // so a single grazing shot doesn't kill a peaceful target with no warning.
    if (this.neutral) this.enrage();
    super.takeDamage(amount);
  }

  onDeath() {
    // Drop a small mineral chunk so killing them is a real economic action.
    const color = Phaser.Utils.Array.GetRandom(COLOR_KEYS);
    this.scene.spawnMineralDrop?.(this.x, this.y, color, NEUTRAL.miner.dropMineralValue);
    super.onDeath();
  }

  /** Find the nearest non-empty deposit. Returns null if there isn't one. */
  findNearestDeposit() {
    let best = null;
    let bestD2 = Infinity;
    this.scene.minerals?.getChildren?.().forEach((m) => {
      if (!m?.active || m.value <= 0) return;
      const dx = m.x - this.x, dy = m.y - this.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD2) { bestD2 = d2; best = m; }
    });
    return best;
  }

  update(time, _delta) {
    if (!this.neutral) {
      // Hostile mode: chase + contact damage. (Mirror ChaserEnemy.)
      this.updateAggro();
      const p = this.scene.player;
      if (p) {
        this.moveToward(p.x, p.y, this.moveSpeed);
        this.attemptContactDamage(time);
      }
      return;
    }

    // Peaceful mode: pick a node, walk to it, drain.
    if (!this.targetNode || !this.targetNode.active || this.targetNode.value <= 0) {
      if (time >= this.nextScanAt) {
        this.targetNode = this.findNearestDeposit();
        this.nextScanAt = time + NEUTRAL.miner.rescanIntervalMs;
      }
    }

    if (this.targetNode) {
      const dx = this.targetNode.x - this.x;
      const dy = this.targetNode.y - this.y;
      const d = Math.hypot(dx, dy) || 1;
      const reach = (this.targetNode.radius || 20) + NEUTRAL.miner.drainRange;
      if (d > reach) {
        this.setVelocity((dx / d) * this.moveSpeed, (dy / d) * this.moveSpeed);
        this.rotation = Math.atan2(dy, dx);
      } else {
        // In range: stop and tick the drain.
        this.setVelocity(0, 0);
        if (time >= this.miningCooldown) {
          this.miningCooldown = time + 333; // ~3 Hz
          const drained = NEUTRAL.miner.drainRate * 0.333;
          const depleted = this.targetNode.drainBy(drained);
          if (depleted) {
            this.scene.onDepositDepleted?.(this.targetNode);
            this.targetNode = null;
          }
        }
      }
    } else {
      // No deposit in sight - wander idly so they aren't statues.
      this.wander(time);
    }
  }
}
