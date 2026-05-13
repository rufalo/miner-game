import Phaser from 'phaser';
import { Enemy } from './Enemy.js';
import { PATROL } from '../../config.js';

/**
 * PatrollerEnemy
 *
 * Walks a fixed loop of waypoints. Switches to chase when the player enters
 * `detectRange`, and after losing the player for `alertDecayMs` (player past
 * `loseSightRange` continuously) it walks back to its current waypoint and
 * resumes the patrol.
 *
 * State machine:
 *   patrol -> chase (player inside detectRange)
 *   chase  -> patrol (player past loseSightRange for alertDecayMs)
 *
 * Waypoint route is supplied at construction (array of {x, y}). The enemy
 * cycles through them in order, picking the next one when within
 * `waypointArriveDist`.
 *
 * Visual cues: '!' floats above when newly aggro'd; '?' floats above while
 * decaying back to patrol. Keeps the player's mental model clear.
 */
export class PatrollerEnemy extends Enemy {
  constructor(scene, route, tier = 1) {
    const start = route[0] || { x: 0, y: 0 };
    super(scene, start.x, start.y, 'enemy_patroller');
    this.tier = tier;
    this.route = route.slice();
    this.targetIdx = 1 % this.route.length;
    this.state = 'patrol';
    this.alertedSince = 0;
    this.lostSightSince = 0;
    this.iconText = null;
    this.iconShownAt = 0;

    this.maxHP = PATROL.hpBase + tier * PATROL.hpPerTier;
    this.hp = this.maxHP;
    this.touchDamage = PATROL.damage;
    this.touchCooldownMs = PATROL.contactCooldownMs;
    this.moveSpeed = PATROL.speedPatrol;
    this.setDisplaySize(32, 32);
    this.aggro = false;
  }

  /** Patrollers manage their own aggro from a detection check, not the
   *  default zone-aggro logic. */
  updateAggro() { /* handled in update() */ }

  showIcon(text, color = '#ffd64a') {
    if (this.iconText) this.iconText.destroy();
    this.iconText = this.scene.add.text(this.x, this.y - this.displayHeight, text, {
      fontFamily: 'monospace', fontSize: '14px', color, fontStyle: 'bold',
    }).setOrigin(0.5, 1).setDepth(10);
    this.iconShownAt = this.scene.time.now;
  }

  destroy(...args) {
    if (this.iconText) { this.iconText.destroy(); this.iconText = null; }
    super.destroy(...args);
  }

  /** Advance to the next waypoint, wrapping around the route. */
  nextWaypoint() {
    this.targetIdx = (this.targetIdx + 1) % this.route.length;
  }

  update(time, _delta) {
    const p = this.scene.player;
    if (!p?.active) { this.setVelocity(0, 0); return; }

    // Float the alert/lost icon with the body, retire after 1.6s.
    if (this.iconText) {
      this.iconText.setPosition(this.x, this.y - this.displayHeight - 4);
      if (time - this.iconShownAt > 1600) { this.iconText.destroy(); this.iconText = null; }
    }

    const d = this.distToPlayer();

    if (this.state === 'patrol') {
      if (d <= PATROL.detectRange) {
        this.state = 'chase';
        this.alertedSince = time;
        this.lostSightSince = 0;
        this.aggro = true;
        this.showIcon('!', '#ff5b6d');
      } else {
        this.walkRoute(time);
        return;
      }
    }

    if (this.state === 'chase') {
      // Player loses us only after staying outside loseSightRange for
      // alertDecayMs continuously. Re-entering the detectRange resets the
      // lose-sight timer.
      if (d > PATROL.loseSightRange) {
        if (!this.lostSightSince) {
          this.lostSightSince = time;
          this.showIcon('?', '#9aa6bd');
        }
        if (time - this.lostSightSince >= PATROL.alertDecayMs) {
          this.state = 'patrol';
          this.aggro = false;
          this.lostSightSince = 0;
          return;
        }
      } else {
        this.lostSightSince = 0;
      }
      this.moveToward(p.x, p.y, PATROL.speedChase);
      this.attemptContactDamage(time);
    }
  }

  walkRoute(_time) {
    const target = this.route[this.targetIdx];
    if (!target) { this.setVelocity(0, 0); return; }
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const d = Math.hypot(dx, dy);
    if (d < PATROL.waypointArriveDist) {
      this.nextWaypoint();
      return;
    }
    const s = this.moveSpeed;
    this.setVelocity((dx / d) * s, (dy / d) * s);
    this.rotation = Math.atan2(dy, dx);
  }
}
