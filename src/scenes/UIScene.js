import Phaser from 'phaser';
import { COLOR_KEYS, COLORS, HUD, PLAYER } from '../config.js';

// Heads-up display overlayed on top of GameScene.
export class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' });
  }

  create() {
    this.game = this.sys.game;
    this.gameScene = this.scene.get('GameScene');

    this.bars = {};
    this.labels = {};

    COLOR_KEYS.forEach((color, i) => {
      const y = HUD.margin + i * (HUD.barHeight + 8);
      // Background
      const bg = this.add.rectangle(HUD.margin, y, HUD.barWidth, HUD.barHeight, 0x111722)
        .setOrigin(0, 0)
        .setStrokeStyle(1, 0x2a3548);
      // Fill
      const fill = this.add.rectangle(HUD.margin + 1, y + 1, HUD.barWidth - 2, HUD.barHeight - 2, COLORS[color])
        .setOrigin(0, 0);
      // Label
      const lbl = this.add.text(HUD.margin + HUD.barWidth + 8, y - 1, '', {
        fontFamily: 'monospace', fontSize: '12px', color: '#dfe6f2',
      });
      this.bars[color] = { bg, fill };
      this.labels[color] = lbl;
    });

    // Body parts counter
    const partsY = HUD.margin + COLOR_KEYS.length * (HUD.barHeight + 8) + 4;
    this.partsText = this.add.text(HUD.margin, partsY, '', {
      fontFamily: 'monospace', fontSize: '12px', color: '#9aa6bd',
    });

    // HP bar (top-center)
    this.hpBg = this.add.rectangle(0, 0, 240, 12, 0x111722)
      .setOrigin(0.5, 0)
      .setStrokeStyle(1, 0x2a3548);
    this.hpFill = this.add.rectangle(0, 0, 238, 10, 0xff5b6d)
      .setOrigin(0.5, 0);
    this.hpText = this.add.text(0, 0, '', {
      fontFamily: 'monospace', fontSize: '11px', color: '#e8ecf2',
    }).setOrigin(0.5, 0);

    // Tier readout (bottom-left)
    this.tierText = this.add.text(HUD.margin, this.scale.height - HUD.margin - 18, '', {
      fontFamily: 'monospace', fontSize: '12px', color: '#9aa6bd',
    });

    // Game over overlay (hidden until needed)
    this.gameOverText = this.add.text(this.scale.width / 2, this.scale.height / 2,
      '', {
        fontFamily: 'monospace', fontSize: '28px', color: '#ffe2a8', align: 'center',
      }).setOrigin(0.5);
    this.gameOverText.setVisible(false);

    // Tip line
    this.tipText = this.add.text(this.scale.width / 2, HUD.margin, 'WASD / arrows / hold mouse to move', {
      fontFamily: 'monospace', fontSize: '11px', color: '#8693ad',
    }).setOrigin(0.5, 0);

    this.scale.on('resize', this.onResize, this);
    this.onResize({ width: this.scale.width, height: this.scale.height });
  }

  onResize({ width, height }) {
    this.hpBg.setPosition(width / 2, HUD.margin + 18);
    this.hpFill.setPosition(width / 2, HUD.margin + 19);
    this.hpText.setPosition(width / 2, HUD.margin + 19);
    this.tipText.setPosition(width / 2, HUD.margin);
    this.tierText.setPosition(HUD.margin, height - HUD.margin - 18);
    this.gameOverText.setPosition(width / 2, height / 2);
  }

  update() {
    const gs = this.gameScene;
    const p = gs?.player;
    if (!p) return;

    for (const color of COLOR_KEYS) {
      const c = p.cargo[color];
      const ratio = c.cap > 0 ? Math.max(0, Math.min(1, c.current / c.cap)) : 0;
      this.bars[color].fill.setSize((HUD.barWidth - 2) * ratio, HUD.barHeight - 2);
      this.labels[color].setText(`${color.padEnd(6)} ${Math.floor(c.current)} / ${Math.floor(c.cap)}`);
    }

    // Body part summary
    const counts = { red: 0, green: 0, blue: 0, yellow: 0 };
    for (const part of p.parts) counts[part.color]++;
    this.partsText.setText(
      `parts  R:${counts.red}  G:${counts.green}  B:${counts.blue}  Y:${counts.yellow}`
    );

    // HP
    const hpFrac = Math.max(0, p.hp / p.maxHP);
    this.hpFill.setSize(238 * hpFrac, 10);
    this.hpText.setText(`HP ${Math.ceil(p.hp)} / ${p.maxHP}`);

    // Tier
    const dist = Math.hypot(p.x - gs.worldCenter.x, p.y - gs.worldCenter.y);
    const tier = gs.tiers.tierForDistance(dist);
    this.tierText.setText(`tier ${tier}   |   dist ${Math.floor(dist)}`);

    // Game over
    if (p.hp <= 0 && !this.gameOverText.visible) {
      this.gameOverText.setText('You were destroyed.\n\nRefresh to try again.');
      this.gameOverText.setVisible(true);
    }
  }
}
