import Phaser from 'phaser';
import { COLOR_KEYS, COLORS, HUD, MINIMAP, PLAYER, TIER, WORLD, EVOLUTION } from '../config.js';

const formatTime = (ms) => {
  const s = Math.floor(ms / 1000);
  const mm = Math.floor(s / 60);
  const ss = (s % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
};

// Heads-up display + minimap + pause + death recap.
export class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' });
  }

  create() {
    // NOTE: never cache `gameScene` -- `scene.restart()` swaps the instance.
    // We always look it up via the helper below.

    // --- Cargo bars ---
    this.bars = {};
    this.labels = {};

    COLOR_KEYS.forEach((color, i) => {
      const y = HUD.margin + i * (HUD.barHeight + 8);
      const bg = this.add.rectangle(HUD.margin, y, HUD.barWidth, HUD.barHeight, 0x111722)
        .setOrigin(0, 0)
        .setStrokeStyle(1, 0x2a3548);
      const fill = this.add.rectangle(HUD.margin + 1, y + 1, HUD.barWidth - 2, HUD.barHeight - 2, COLORS[color])
        .setOrigin(0, 0);
      const lbl = this.add.text(HUD.margin + HUD.barWidth + 8, y - 1, '', {
        fontFamily: 'monospace', fontSize: '12px', color: '#dfe6f2',
      });
      // "PREFER" indicator: a small dot to the left of each bar that lights up
      // when this color is the player's preferred one.
      const dot = this.add.circle(HUD.margin - 8, y + HUD.barHeight / 2, 4, COLORS[color], 0.25)
        .setStrokeStyle(1, COLORS[color], 0.6);
      this.bars[color] = { bg, fill, dot };
      this.labels[color] = lbl;
    });

    const partsY = HUD.margin + COLOR_KEYS.length * (HUD.barHeight + 8) + 4;
    this.partsText = this.add.text(HUD.margin, partsY, '', {
      fontFamily: 'monospace', fontSize: '12px', color: '#9aa6bd',
    });

    // --- HP bar (top-center) ---
    this.hpBg = this.add.rectangle(0, 0, 240, 12, 0x111722)
      .setOrigin(0.5, 0)
      .setStrokeStyle(1, 0x2a3548);
    this.hpFill = this.add.rectangle(0, 0, 238, 10, 0xff5b6d).setOrigin(0.5, 0);
    this.hpText = this.add.text(0, 0, '', {
      fontFamily: 'monospace', fontSize: '11px', color: '#e8ecf2',
    }).setOrigin(0.5, 0);

    // Tier readout (bottom-left)
    this.tierText = this.add.text(HUD.margin, this.scale.height - HUD.margin - 18, '', {
      fontFamily: 'monospace', fontSize: '12px', color: '#9aa6bd',
    });

    // Dash cooldown bar (just below the HP bar)
    this.dashBg = this.add.rectangle(0, 0, 120, 5, 0x111722).setOrigin(0.5, 0).setStrokeStyle(1, 0x2a3548);
    this.dashFill = this.add.rectangle(0, 0, 118, 3, 0xa5d8ff).setOrigin(0.5, 0);
    this.dashLabel = this.add.text(0, 0, 'DASH (Space)', {
      fontFamily: 'monospace', fontSize: '10px', color: '#9aa6bd',
    }).setOrigin(0.5, 0);

    // --- Minimap ---
    this.minimap = this.add.container(0, 0);
    this.minimapBg = this.add.rectangle(0, 0, MINIMAP.size, MINIMAP.size, MINIMAP.background, MINIMAP.alpha)
      .setOrigin(0, 0)
      .setStrokeStyle(1, MINIMAP.border);
    this.minimapGfx = this.add.graphics();
    this.minimap.add([this.minimapBg, this.minimapGfx]);

    // --- Tip line ---
    this.tipText = this.add.text(this.scale.width / 2, HUD.margin,
      'WASD / arrows / hold mouse: move   -   Space: dash   -   1-4: prefer color   -   Esc: pause', {
        fontFamily: 'monospace', fontSize: '11px', color: '#8693ad',
      }).setOrigin(0.5, 0);

    // --- Pause overlay ---
    this.pauseGroup = this.add.container(0, 0).setVisible(false).setDepth(1000);
    this.pauseDim = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0.55).setOrigin(0, 0);
    this.pauseTitle = this.add.text(0, 0, 'PAUSED', {
      fontFamily: 'monospace', fontSize: '34px', color: '#ffe2a8',
    }).setOrigin(0.5, 0.5);
    this.pauseHelp = this.add.text(0, 0, '[ Esc ] resume     [ R ] restart', {
      fontFamily: 'monospace', fontSize: '14px', color: '#dfe6f2',
    }).setOrigin(0.5, 0.5);
    this.pauseGroup.add([this.pauseDim, this.pauseTitle, this.pauseHelp]);

    // --- Death recap overlay ---
    this.recapGroup = this.add.container(0, 0).setVisible(false).setDepth(1000);
    this.recapDim = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0.7).setOrigin(0, 0);
    this.recapTitle = this.add.text(0, 0, 'You were destroyed', {
      fontFamily: 'monospace', fontSize: '28px', color: '#ffe2a8',
    }).setOrigin(0.5, 0.5);
    this.recapBody = this.add.text(0, 0, '', {
      fontFamily: 'monospace', fontSize: '14px', color: '#dfe6f2', align: 'left',
    }).setOrigin(0.5, 0);
    this.recapHelp = this.add.text(0, 0, '[ R ] restart', {
      fontFamily: 'monospace', fontSize: '14px', color: '#9adcff',
    }).setOrigin(0.5, 0.5);
    this.recapGroup.add([this.recapDim, this.recapTitle, this.recapBody, this.recapHelp]);

    // --- Input ---
    this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.rKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);

    this.scale.on('resize', this.onResize, this);
    this.onResize({ width: this.scale.width, height: this.scale.height });
  }

  onResize({ width, height }) {
    this.hpBg.setPosition(width / 2, HUD.margin + 18);
    this.hpFill.setPosition(width / 2, HUD.margin + 19);
    this.hpText.setPosition(width / 2, HUD.margin + 19);

    this.dashBg.setPosition(width / 2, HUD.margin + 36);
    this.dashFill.setPosition(width / 2, HUD.margin + 37);
    this.dashLabel.setPosition(width / 2, HUD.margin + 44);

    this.tipText.setPosition(width / 2, HUD.margin);
    this.tierText.setPosition(HUD.margin, height - HUD.margin - 18);

    // Minimap top-right
    this.minimap.setPosition(width - MINIMAP.size - MINIMAP.margin, MINIMAP.margin);

    // Pause overlay
    this.pauseDim.setSize(width, height);
    this.pauseTitle.setPosition(width / 2, height / 2 - 30);
    this.pauseHelp.setPosition(width / 2, height / 2 + 16);

    // Recap overlay
    this.recapDim.setSize(width, height);
    this.recapTitle.setPosition(width / 2, height / 2 - 110);
    this.recapBody.setPosition(width / 2, height / 2 - 70);
    this.recapHelp.setPosition(width / 2, height / 2 + 130);
  }

  get gs() { return this.scene.get('GameScene'); }

  update(time) {
    const gs = this.gs;
    const p = gs?.player;
    if (!p) return;

    this.updateBars(p);
    this.updateMinimap(p);
    this.updateDash(p, time);

    const dist = Math.hypot(p.x - gs.worldCenter.x, p.y - gs.worldCenter.y);
    const tier = gs.tiers.tierForDistance(dist);
    this.tierText.setText(`tier ${tier}   |   dist ${Math.floor(dist)}`);

    // HP
    const hpFrac = Math.max(0, p.hp / p.maxHP);
    this.hpFill.setSize(238 * hpFrac, 10);
    this.hpText.setText(`HP ${Math.ceil(p.hp)} / ${p.maxHP}`);

    // Pause toggle
    if (Phaser.Input.Keyboard.JustDown(this.escKey) && p.hp > 0) {
      this.togglePause();
    }

    // Restart key (R)
    if (Phaser.Input.Keyboard.JustDown(this.rKey)) {
      if (gs.paused || p.hp <= 0) {
        // Clear overlays in this scene, then restart GameScene.
        // UIScene keeps running and re-attaches to the new GameScene next frame.
        this.pauseGroup.setVisible(false);
        this.recapGroup.setVisible(false);
        gs.restartGame();
      }
    }

    // Death recap
    if (gs.deathPayload && !this.recapGroup.visible) {
      this.showRecap(gs.deathPayload);
    }
  }

  updateBars(p) {
    const t = this.time?.now ?? performance.now();
    for (const color of COLOR_KEYS) {
      const c = p.cargo[color];
      const ratio = c.cap > 0 ? Math.max(0, Math.min(1, c.current / c.cap)) : 0;
      this.bars[color].fill.setSize((HUD.barWidth - 2) * ratio, HUD.barHeight - 2);
      this.bars[color].fill.setFillStyle(COLORS[color]);

      // Imminent-evolution pulse when above halo threshold.
      if (ratio >= EVOLUTION.haloThreshold) {
        const pulse = 0.7 + 0.3 * Math.sin(t * 0.012);
        this.bars[color].fill.setAlpha(pulse);
        this.labels[color].setColor('#ffd54a');
      } else {
        this.bars[color].fill.setAlpha(1);
        this.labels[color].setColor('#dfe6f2');
      }

      // "PREFER" dot
      if (p.preferredColor === color) {
        this.bars[color].dot.setFillStyle(COLORS[color], 1);
        this.bars[color].dot.setStrokeStyle(2, 0xffffff, 0.95);
      } else {
        this.bars[color].dot.setFillStyle(COLORS[color], 0.2);
        this.bars[color].dot.setStrokeStyle(1, COLORS[color], 0.55);
      }

      // Label: gauge progress + evolution count + threshold.
      const evos = p.evolutions?.[color] ?? 0;
      const partsOfColor = p.parts.filter(x => x.color === color).length;
      const modeTag = partsOfColor >= EVOLUTION.upgradeAtPartCount ? ' UPG' : '';
      this.labels[color].setText(
        `${color.padEnd(6)} ${Math.floor(c.current)} / ${Math.floor(c.cap)}   evo ${evos}${modeTag}`
      );
    }

    // Body part summary including hybrid kinds.
    const counts = { red: 0, green: 0, blue: 0, yellow: 0, plasma: 0, swarm: 0, rapid: 0 };
    for (const part of p.parts) counts[part.color] = (counts[part.color] || 0) + 1;
    const hybridLine = (counts.plasma + counts.swarm + counts.rapid) > 0
      ? `   hyb  P:${counts.plasma} S:${counts.swarm} Ra:${counts.rapid}`
      : '';
    this.partsText.setText(
      `parts  R:${counts.red}  G:${counts.green}  B:${counts.blue}  Y:${counts.yellow}${hybridLine}`
    );
  }

  updateDash(p, time) {
    const ready = (time ?? 0) >= (p.dashReadyAt ?? 0);
    let frac;
    if (ready) frac = 1;
    else {
      const cd = PLAYER.dashCooldownMs;
      const remaining = Math.max(0, p.dashReadyAt - time);
      frac = 1 - remaining / cd;
    }
    this.dashFill.setSize(118 * Math.max(0, Math.min(1, frac)), 3);
    this.dashFill.setFillStyle(ready ? 0xa5d8ff : 0x4a6f99);
    this.dashLabel.setColor(ready ? '#a5d8ff' : '#6c7791');
  }

  updateMinimap(p) {
    const g = this.minimapGfx;
    g.clear();
    const size = MINIMAP.size;
    const wx = WORLD.size;
    const k = size / wx;
    const cx = wx / 2;
    const cy = wx / 2;

    // Tier rings
    g.lineStyle(1, MINIMAP.ringColor, 0.9);
    g.strokeCircle(size / 2, size / 2, TIER.safeRadius * k);
    g.lineStyle(1, MINIMAP.ringColor, 0.5);
    for (let t = 1; t <= TIER.maxTier; t++) {
      g.strokeCircle(size / 2, size / 2, (TIER.safeRadius + t * TIER.ringWidth) * k);
    }

    // Enemy zones (only outer rings)
    const zones = this.gs.spawner?.zones ?? [];
    for (const z of zones) {
      const zx = (z.x - 0) * k;
      const zy = (z.y - 0) * k;
      const aliveCount = z.enemies.filter(e => e.active).length;
      if (aliveCount === 0) continue;
      g.fillStyle(MINIMAP.enemyZoneColor, 0.7);
      g.fillCircle(zx, zy, 2 + Math.min(3, aliveCount));
    }

    // Pickups (color dots)
    const pickups = this.gs.pickups?.getChildren?.() ?? [];
    for (const pk of pickups) {
      if (!pk.active) continue;
      g.fillStyle(COLORS[pk.color], 0.9);
      g.fillCircle(pk.x * k, pk.y * k, 2);
    }

    // Player (with heading triangle)
    const px = p.x * k;
    const py = p.y * k;
    g.fillStyle(MINIMAP.playerColor, 1);
    g.fillCircle(px, py, 3);
    g.lineStyle(1, MINIMAP.playerColor, 0.7);
    const r = p.rotation ?? 0;
    g.lineBetween(px, py, px + Math.cos(r) * 7, py + Math.sin(r) * 7);
  }

  togglePause() {
    const gs = this.gs;
    if (!gs) return;
    if (gs.paused) {
      gs.setPaused(false);
      this.pauseGroup.setVisible(false);
    } else {
      gs.setPaused(true);
      this.pauseGroup.setVisible(true);
    }
  }

  showRecap(payload) {
    const f = payload.final;
    const best = payload.best || f;
    const lines = [
      `time alive       ${formatTime(f.msAlive)}`,
      `minerals mined   ${Math.floor(f.mineralsMined)}`,
      `enemies killed   ${f.kills}`,
      `max tier         ${f.maxTier}`,
      `parts attached   ${f.partsAttached}`,
      ``,
      `best run`,
      `  time           ${formatTime(best.msAlive)}`,
      `  minerals       ${Math.floor(best.mineralsMined)}`,
      `  kills          ${best.kills}`,
      `  max tier       ${best.maxTier}`,
    ];
    if (payload.isNewBest) lines.push('', 'NEW BEST RUN!');
    this.recapBody.setText(lines.join('\n'));
    this.recapTitle.setText(payload.isNewBest ? 'You were destroyed - new best!' : 'You were destroyed');
    this.recapGroup.setVisible(true);
  }
}
