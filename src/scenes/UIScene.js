import Phaser from 'phaser';
import { COLOR_KEYS, COLORS, HUD, MINIMAP, PLAYER, TIER, WORLD, EVOLUTION, DRAFT, SHOCKWAVE, OVERCHARGE } from '../config.js';

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

    // Active ability cooldown bars (Q + E). Slightly narrower than dash and
    // stacked under it so the trio reads as one ability column.
    this.shockBg = this.add.rectangle(0, 0, 120, 5, 0x111722).setOrigin(0.5, 0).setStrokeStyle(1, 0x2a3548);
    this.shockFill = this.add.rectangle(0, 0, 118, 3, 0xff8a4a).setOrigin(0.5, 0);
    this.shockLabel = this.add.text(0, 0, 'SHOCKWAVE (Q)', {
      fontFamily: 'monospace', fontSize: '10px', color: '#9aa6bd',
    }).setOrigin(0.5, 0);

    this.overBg = this.add.rectangle(0, 0, 120, 5, 0x111722).setOrigin(0.5, 0).setStrokeStyle(1, 0x2a3548);
    this.overFill = this.add.rectangle(0, 0, 118, 3, 0xffd64a).setOrigin(0.5, 0);
    this.overLabel = this.add.text(0, 0, 'OVERCHARGE (E)', {
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
      'WASD/arrows  -  Space: dash  -  Q: shockwave  -  E: overcharge  -  1-4: prefer color  -  Esc: pause', {
        fontFamily: 'monospace', fontSize: '11px', color: '#8693ad',
      }).setOrigin(0.5, 0);

    // --- Draft progress bar (just under the parts text) ---
    this.draftBg = this.add.rectangle(HUD.margin, 0, HUD.barWidth, 6, 0x111722).setOrigin(0, 0).setStrokeStyle(1, 0x2a3548);
    this.draftFill = this.add.rectangle(HUD.margin + 1, 0, 0, 4, 0xffe2a8).setOrigin(0, 0);
    this.draftLabel = this.add.text(HUD.margin + HUD.barWidth + 8, 0, '', {
      fontFamily: 'monospace', fontSize: '11px', color: '#ffe2a8',
    });

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

    // --- Draft overlay ---
    // Built once with empty card slots; refreshed in showDraft() each time.
    this.draftGroup = this.add.container(0, 0).setVisible(false).setDepth(1100);
    this.draftDim = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0.7).setOrigin(0, 0);
    this.draftTitle = this.add.text(0, 0, 'CHOOSE AN UPGRADE', {
      fontFamily: 'monospace', fontSize: '24px', color: '#ffe2a8',
    }).setOrigin(0.5, 0.5);
    this.draftHelp = this.add.text(0, 0, 'click a card  or  press 1 / 2 / 3', {
      fontFamily: 'monospace', fontSize: '13px', color: '#9aa6bd',
    }).setOrigin(0.5, 0.5);
    this.draftGroup.add([this.draftDim, this.draftTitle, this.draftHelp]);

    // Build a fixed number of card slots; we'll mutate them in showDraft.
    this.draftCards = [];
    for (let i = 0; i < DRAFT.optionCount; i++) {
      const card = this.add.container(0, 0).setVisible(false).setSize(220, 220);
      const bg = this.add.rectangle(0, 0, 220, 220, 0x111722, 0.95).setStrokeStyle(2, 0x3a4868);
      const ttl = this.add.text(0, -82, '', {
        fontFamily: 'monospace', fontSize: '15px', color: '#ffe2a8',
        align: 'center', wordWrap: { width: 200 },
      }).setOrigin(0.5, 0);
      const dsc = this.add.text(0, -10, '', {
        fontFamily: 'monospace', fontSize: '12px', color: '#dfe6f2',
        align: 'center', wordWrap: { width: 200 },
      }).setOrigin(0.5, 0.5);
      const idx = this.add.text(0, 76, '', {
        fontFamily: 'monospace', fontSize: '14px', color: '#9adcff',
      }).setOrigin(0.5, 0.5);
      card.add([bg, ttl, dsc, idx]);
      card.bg = bg; card.ttl = ttl; card.dsc = dsc; card.idx = idx;
      // Click to pick. Hover uses the card's current frame colors so elite
      // cards keep their gold outline even after un-hovering.
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerover', () => bg.setStrokeStyle(3, card._hoverColor ?? 0xffd54a));
      bg.on('pointerout',  () => {
        const fc = card._frameColor ?? 0x3a4868;
        const isElite = fc === 0xffd54a;
        bg.setStrokeStyle(isElite ? 3 : 2, fc);
      });
      bg.on('pointerdown', () => this.pickDraft(i));
      this.draftGroup.add(card);
      this.draftCards.push(card);
    }

    // --- Input ---
    this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.rKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.draftKeys = [
      this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE),
      this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO),
      this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE),
    ];

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
    this.shockBg.setPosition(width / 2, HUD.margin + 58);
    this.shockFill.setPosition(width / 2, HUD.margin + 59);
    this.shockLabel.setPosition(width / 2, HUD.margin + 66);
    this.overBg.setPosition(width / 2, HUD.margin + 80);
    this.overFill.setPosition(width / 2, HUD.margin + 81);
    this.overLabel.setPosition(width / 2, HUD.margin + 88);

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

    // Draft overlay layout (3 horizontal cards centered).
    this.draftDim.setSize(width, height);
    this.draftTitle.setPosition(width / 2, height / 2 - 200);
    this.draftHelp.setPosition(width / 2, height / 2 + 170);
    const gap = 30;
    const cardW = 220;
    const total = this.draftCards.length * cardW + (this.draftCards.length - 1) * gap;
    let cx = width / 2 - total / 2 + cardW / 2;
    for (const c of this.draftCards) {
      c.setPosition(cx, height / 2);
      cx += cardW + gap;
    }

    // Draft progress bar positioned right below the parts text.
    const partsY = HUD.margin + COLOR_KEYS.length * (HUD.barHeight + 8) + 4;
    const draftY = partsY + 18;
    this.draftBg.setPosition(HUD.margin, draftY);
    this.draftFill.setPosition(HUD.margin + 1, draftY + 1);
    this.draftLabel.setPosition(HUD.margin + HUD.barWidth + 8, draftY - 2);
  }

  get gs() { return this.scene.get('GameScene'); }

  update(time) {
    const gs = this.gs;
    const p = gs?.player;
    if (!p) return;

    this.updateBars(p);
    this.updateMinimap(p);
    this.updateDash(p, time);
    this.updateAbilities(p, time);

    const dist = Math.hypot(p.x - gs.worldCenter.x, p.y - gs.worldCenter.y);
    const tier = gs.tiers.tierForDistance(dist);
    const hs = gs.hunterSpawner;
    let line = `tier ${tier}   |   dist ${Math.floor(dist)}`;
    if (hs) {
      const hCount = hs.activeHunterCount();
      const hTarget = hs.targetHunterCount();
      const wave = Math.ceil(hs.secondsUntilWave(time ?? this.time.now));
      line += `   |   hunters ${hCount}/${hTarget}   wave in ${wave}s`;
    }
    this.tierText.setText(line);

    // HP
    const hpFrac = Math.max(0, p.hp / p.maxHP);
    this.hpFill.setSize(238 * hpFrac, 10);
    this.hpText.setText(`HP ${Math.ceil(p.hp)} / ${p.maxHP}`);

    // Draft progress bar.
    this.updateDraftProgress(gs);

    // Draft overlay takes priority over pause input.
    if (gs.pendingDraft) {
      if (!this.draftGroup.visible) this.showDraft(gs.pendingDraft);
      for (let i = 0; i < this.draftKeys.length; i++) {
        if (Phaser.Input.Keyboard.JustDown(this.draftKeys[i])) {
          this.pickDraft(i);
          break;
        }
      }
      // Still allow R to restart even mid-draft (in case the player gets stuck).
      if (Phaser.Input.Keyboard.JustDown(this.rKey)) {
        this.draftGroup.setVisible(false);
        for (const c of this.draftCards) c.setVisible(false);
        this.pauseGroup.setVisible(false);
        this.recapGroup.setVisible(false);
        gs.restartGame();
      }
      return; // skip pause toggle while drafting
    } else if (this.draftGroup.visible) {
      this.draftGroup.setVisible(false);
      for (const c of this.draftCards) c.setVisible(false);
    }

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

    // Death recap. Hide whenever the player is alive again (e.g. after a
    // restart) so a stale visible flag can't survive a scene reset.
    if (gs.deathPayload && !this.recapGroup.visible) {
      this.showRecap(gs.deathPayload);
    } else if (!gs.deathPayload && this.recapGroup.visible) {
      this.recapGroup.setVisible(false);
    }
  }

  updateDraftProgress(gs) {
    const ratio = Math.max(0, Math.min(1,
      (gs.evolutionsSinceLastDraft ?? 0) / DRAFT.everyNEvolutions));
    this.draftFill.setSize((HUD.barWidth - 2) * ratio, 4);
    this.draftLabel.setText(
      `draft ${Math.min(DRAFT.everyNEvolutions, gs.evolutionsSinceLastDraft ?? 0)}/${DRAFT.everyNEvolutions}` +
      (gs.player ? `   picks ${gs.player.draftsTaken ?? 0}` : '')
    );
  }

  showDraft(payload) {
    const opts = payload.options || [];
    const elite = !!payload.elite;
    const frameColor = elite ? 0xffd54a : 0x3a4868;
    const hoverColor = elite ? 0xffe98a : 0xffd54a;
    const titleColor = elite ? '#ffd54a' : '#ffe2a8';
    for (let i = 0; i < this.draftCards.length; i++) {
      const c = this.draftCards[i];
      const opt = opts[i];
      if (!opt) { c.setVisible(false); continue; }
      c.setVisible(true);
      c.ttl.setText(opt.title);
      c.ttl.setColor(titleColor);
      c.dsc.setText(opt.desc);
      c.idx.setText(`[ ${i + 1} ]`);
      c.bg.setStrokeStyle(elite ? 3 : 2, frameColor);
      c._frameColor = frameColor;   // remember so pointerout restores it
      c._hoverColor = hoverColor;
    }
    this.draftTitle.setText(elite ? 'BOSS REWARD - ELITE UPGRADE' : 'CHOOSE AN UPGRADE');
    this.draftTitle.setColor(titleColor);
    this.draftGroup.setVisible(true);
    // If a normal pause overlay was up, hide it - the draft is its own pause.
    this.pauseGroup.setVisible(false);
  }

  pickDraft(i) {
    const gs = this.gs;
    if (!gs || !gs.pendingDraft) return;
    const opt = gs.pendingDraft.options?.[i];
    if (!opt) return;
    gs.applyDraftChoice(opt);
    // Hide immediately; update() will refresh visibility next tick.
    this.draftGroup.setVisible(false);
    for (const c of this.draftCards) c.setVisible(false);
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

    // Body part summary including hybrid kinds + combo state.
    const counts = { red: 0, green: 0, blue: 0, yellow: 0, plasma: 0, swarm: 0, rapid: 0, prism: 0 };
    let orbitalCount = 0;
    for (const part of p.parts) {
      counts[part.color] = (counts[part.color] || 0) + 1;
      if (part.followMode === 'orbit') orbitalCount++;
    }
    const hybridLine = (counts.plasma + counts.swarm + counts.rapid) > 0
      ? `   hyb  P:${counts.plasma} S:${counts.swarm} Ra:${counts.rapid}`
      : '';
    const comboBits = [];
    if (orbitalCount > 0) comboBits.push(`orb:${orbitalCount}`);
    if (counts.prism > 0) comboBits.push('PRISM');
    if (p.branchMode) comboBits.push('SPLIT');
    const comboLine = comboBits.length ? `   [${comboBits.join(' ')}]` : '';
    const trailLen = p.trailParts().length;
    const tailCap = PLAYER.maxTailSegments;
    this.partsText.setText(
      `parts  R:${counts.red}  G:${counts.green}  B:${counts.blue}  Y:${counts.yellow}   tail ${trailLen}/${tailCap}${hybridLine}${comboLine}`
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

  /**
   * Q (Shockwave) + E (Overcharge) cooldown / active-window bars.
   * The Overcharge bar serves a double purpose: while the buff is ACTIVE the
   * bar fills the *duration window* and turns bright; once the buff ends, the
   * bar drains again from full to refill as cooldown.
   */
  updateAbilities(p, time) {
    const t = time ?? 0;

    // --- Shockwave (Q) ---
    const qReady = t >= (p.shockwaveReadyAt ?? 0);
    let qFrac;
    if (qReady) qFrac = 1;
    else {
      const cd = SHOCKWAVE.cooldownMs * (p.boosts?.shockwaveCooldownMult ?? 1);
      const remaining = Math.max(0, p.shockwaveReadyAt - t);
      qFrac = 1 - remaining / cd;
    }
    this.shockFill.setSize(118 * Math.max(0, Math.min(1, qFrac)), 3);
    this.shockFill.setFillStyle(qReady ? 0xff8a4a : 0x6b3d22);
    this.shockLabel.setColor(qReady ? '#ff8a4a' : '#6c7791');

    // --- Overcharge (E) ---
    const active = t < (p.overchargeUntil ?? 0);
    if (active) {
      const dur = OVERCHARGE.durationMs + (p.boosts?.overchargeDurationBonusMs ?? 0);
      const left = Math.max(0, p.overchargeUntil - t);
      const f = Math.max(0, Math.min(1, left / dur));
      this.overFill.setSize(118 * f, 3);
      this.overFill.setFillStyle(0xffe27a);
      this.overLabel.setColor('#ffe27a').setText('OVERCHARGED!');
    } else {
      const eReady = t >= (p.overchargeReadyAt ?? 0);
      let frac;
      if (eReady) frac = 1;
      else {
        const cd = OVERCHARGE.cooldownMs * (p.boosts?.overchargeCooldownMult ?? 1);
        const remaining = Math.max(0, p.overchargeReadyAt - t);
        frac = 1 - remaining / cd;
      }
      this.overFill.setSize(118 * Math.max(0, Math.min(1, frac)), 3);
      this.overFill.setFillStyle(eReady ? 0xffd64a : 0x6b5722);
      this.overLabel.setColor(eReady ? '#ffd64a' : '#6c7791').setText('OVERCHARGE (E)');
    }
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

    // Persistent hunters / swarmers (mobile threats) and special enemy types
    // (sniper / bomber / splitter) - drawn brighter so they stand out from
    // generic enemy-zone occupants.
    const enemies = this.gs.enemies?.getChildren?.() ?? [];
    for (const e of enemies) {
      if (!e.active) continue;
      const key = e.texture?.key;
      if (key === 'enemy_hunter') {
        g.fillStyle(0xff2a2a, 0.95);
        g.fillCircle(e.x * k, e.y * k, 2.5);
      } else if (key === 'enemy_swarmer') {
        g.fillStyle(0xffe14a, 0.95);
        g.fillCircle(e.x * k, e.y * k, 1.5);
      } else if (key === 'enemy_sniper') {
        // Cyan cross: stands out at a glance.
        g.fillStyle(0x9affff, 0.95);
        g.fillRect(e.x * k - 2.5, e.y * k - 0.5, 5, 1);
        g.fillRect(e.x * k - 0.5, e.y * k - 2.5, 1, 5);
      } else if (key === 'enemy_bomber') {
        g.fillStyle(0xff6a3a, 0.95);
        g.fillCircle(e.x * k, e.y * k, 2);
      } else if (key === 'enemy_splitter') {
        g.fillStyle(0xff8a44, 0.95);
        g.fillCircle(e.x * k, e.y * k, 2.5);
      }
    }

    // Bosses (large red diamonds, very visible).
    for (const e of enemies) {
      if (!e.active || !e.isBoss) continue;
      const bx = e.x * k;
      const by = e.y * k;
      const s = 5;
      g.fillStyle(0xff3a3a, 1);
      g.lineStyle(1, 0xffffff, 0.9);
      g.beginPath();
      g.moveTo(bx, by - s);
      g.lineTo(bx + s, by);
      g.lineTo(bx, by + s);
      g.lineTo(bx - s, by);
      g.closePath();
      g.fillPath();
      g.strokePath();
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
      `bosses defeated  ${f.bossesDefeated ?? 0}`,
      `max tier         ${f.maxTier}`,
      `parts attached   ${f.partsAttached}`,
      ``,
      `best run`,
      `  time           ${formatTime(best.msAlive)}`,
      `  minerals       ${Math.floor(best.mineralsMined)}`,
      `  kills          ${best.kills}`,
      `  bosses         ${best.bossesDefeated ?? 0}`,
      `  max tier       ${best.maxTier}`,
    ];
    if (payload.isNewBest) lines.push('', 'NEW BEST RUN!');
    this.recapBody.setText(lines.join('\n'));
    this.recapTitle.setText(payload.isNewBest ? 'You were destroyed - new best!' : 'You were destroyed');
    this.recapGroup.setVisible(true);
  }
}
