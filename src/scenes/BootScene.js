import Phaser from 'phaser';

// Generates all runtime textures so we ship zero asset files.
// Convention: white textures (tint at use site) at a reference size, scaled where needed.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create() {
    this.makeCircle('circle', 64);
    this.makeCircleRing('ring', 64, 6);
    this.makeRect('square', 64, 64);
    this.makeRect('pixel', 1, 1);

    // Player body (slightly different - radial gradient feel)
    this.makePlayerTex();

    // Bullet (small dot)
    this.makeCircle('bullet', 6);

    // Missile (elongated capsule)
    this.makeMissile('missile');

    // Enemy textures (each one a distinct silhouette so the player can read them)
    this.makeEnemyTex('enemy_chaser',  0xff7a3a, 'circle');
    this.makeEnemyTex('enemy_dasher',  0xff3aa9, 'diamond');
    this.makeEnemyTex('enemy_gunner',  0xb56dff, 'triangle');
    this.makeEnemyTex('enemy_missile', 0x6dfff0, 'pentagon');
    this.makeEnemyTex('enemy_brute',   0xff5555, 'hex');
    this.makeEnemyTex('enemy_hunter',   0xff2a2a, 'spike');
    this.makeEnemyTex('enemy_swarmer',  0xffe14a, 'circle');
    this.makeEnemyTex('enemy_splitter', 0xff8a44, 'cluster');
    this.makeEnemyTex('enemy_sniper',   0x9affff, 'cross');
    this.makeEnemyTex('enemy_bomber',   0xff6a3a, 'mine');
    this.makeEnemyTex('enemy_patroller', 0xb56dff, 'arrow');
    this.makeBossTex('enemy_boss',      0xff3a3a);

    // World features (landmarks + neutral actors).
    this.makeLandmarkPit('landmark_pit', 0x6a4a2a);
    this.makeBoulder('boulder', 0x9a7050);
    this.makeEnemyTex('neutral_miner', 0x8aa6cf, 'worker');

    this.scene.start('GameScene');
    this.scene.launch('UIScene');
  }

  makeCircle(key, radius) {
    const g = this.add.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffffff, 1);
    g.fillCircle(radius, radius, radius);
    g.generateTexture(key, radius * 2, radius * 2);
    g.destroy();
  }

  makeCircleRing(key, radius, thickness) {
    const g = this.add.graphics({ x: 0, y: 0, add: false });
    g.lineStyle(thickness, 0xffffff, 1);
    g.strokeCircle(radius, radius, radius - thickness / 2);
    g.generateTexture(key, radius * 2, radius * 2);
    g.destroy();
  }

  makeRect(key, w, h) {
    const g = this.add.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, w, h);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  makePlayerTex() {
    const r = 64;
    const g = this.add.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffffff, 1);
    g.fillCircle(r, r, r);
    g.fillStyle(0x000000, 0.18);
    g.fillCircle(r, r, r * 0.65);
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(r - r * 0.25, r - r * 0.25, r * 0.18);
    g.generateTexture('player', r * 2, r * 2);
    g.destroy();
  }

  makeMissile(key) {
    const w = 18, h = 8;
    const g = this.add.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffffff, 1);
    // Body
    g.fillRect(2, 0, w - 4, h);
    // Nose
    g.fillTriangle(w - 4, 0, w, h / 2, w - 4, h);
    // Fins
    g.fillTriangle(0, -2, 4, 0, 4, h);
    g.fillTriangle(0, h + 2, 4, 0, 4, h);
    g.generateTexture(key, w, h + 4);
    g.destroy();
  }

  makeEnemyTex(key, color, shape) {
    const size = 64;
    const half = size / 2;
    const g = this.add.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(color, 1);
    g.lineStyle(3, 0x111722, 1);

    switch (shape) {
      case 'circle':
        g.fillCircle(half, half, half - 2);
        g.strokeCircle(half, half, half - 2);
        break;
      case 'diamond':
        g.fillPoints([
          { x: half, y: 2 },
          { x: size - 2, y: half },
          { x: half, y: size - 2 },
          { x: 2, y: half },
        ], true);
        g.strokePoints([
          { x: half, y: 2 },
          { x: size - 2, y: half },
          { x: half, y: size - 2 },
          { x: 2, y: half },
        ], true);
        break;
      case 'triangle': {
        const pts = [
          { x: half, y: 4 },
          { x: size - 4, y: size - 4 },
          { x: 4, y: size - 4 },
        ];
        g.fillPoints(pts, true);
        g.strokePoints(pts, true);
        break;
      }
      case 'pentagon': {
        const pts = [];
        for (let i = 0; i < 5; i++) {
          const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
          pts.push({ x: half + Math.cos(a) * (half - 4), y: half + Math.sin(a) * (half - 4) });
        }
        g.fillPoints(pts, true);
        g.strokePoints(pts, true);
        break;
      }
      case 'hex': {
        const pts = [];
        for (let i = 0; i < 6; i++) {
          const a = (i * Math.PI * 2) / 6;
          pts.push({ x: half + Math.cos(a) * (half - 4), y: half + Math.sin(a) * (half - 4) });
        }
        g.fillPoints(pts, true);
        g.strokePoints(pts, true);
        break;
      }
      case 'spike': {
        // 4-point star (sharp, predator-y)
        const pts = [];
        const outer = half - 4;
        const inner = outer * 0.42;
        for (let i = 0; i < 8; i++) {
          const a = -Math.PI / 2 + (i * Math.PI) / 4;
          const r = (i % 2 === 0) ? outer : inner;
          pts.push({ x: half + Math.cos(a) * r, y: half + Math.sin(a) * r });
        }
        g.fillPoints(pts, true);
        g.strokePoints(pts, true);
        break;
      }
      case 'cluster': {
        // Splitter: a big lobed cluster of 4 circles (reads as "about to split").
        const r = half * 0.42;
        const offs = [
          { x: half - r * 0.7, y: half - r * 0.7 },
          { x: half + r * 0.7, y: half - r * 0.7 },
          { x: half - r * 0.7, y: half + r * 0.7 },
          { x: half + r * 0.7, y: half + r * 0.7 },
        ];
        for (const o of offs) {
          g.fillCircle(o.x, o.y, r);
          g.strokeCircle(o.x, o.y, r);
        }
        break;
      }
      case 'cross': {
        // Sniper: a thin "+" reticle silhouette.
        const arm = half - 6;
        const thick = 8;
        g.fillRect(half - thick, 4, thick * 2, size - 8);
        g.fillRect(4, half - thick, size - 8, thick * 2);
        g.lineStyle(2, 0x111722, 1);
        g.strokeRect(half - thick, 4, thick * 2, size - 8);
        g.strokeRect(4, half - thick, size - 8, thick * 2);
        // small ring overlay so it reads as a scope.
        g.lineStyle(2, 0x111722, 1);
        g.strokeCircle(half, half, arm * 0.45);
        break;
      }
      case 'mine': {
        // Bomber: spiked sea-mine. Circle with short outward triangles.
        g.fillCircle(half, half, half - 10);
        g.strokeCircle(half, half, half - 10);
        const spikes = 8;
        for (let i = 0; i < spikes; i++) {
          const a = (i / spikes) * Math.PI * 2;
          const cx = half + Math.cos(a) * (half - 10);
          const cy = half + Math.sin(a) * (half - 10);
          const tx = half + Math.cos(a) * (half - 2);
          const ty = half + Math.sin(a) * (half - 2);
          const nx = -Math.sin(a) * 4;
          const ny =  Math.cos(a) * 4;
          g.fillTriangle(cx + nx, cy + ny, cx - nx, cy - ny, tx, ty);
        }
        // Central white dot (fuse).
        g.fillStyle(0xffffff, 0.95);
        g.fillCircle(half, half, 4);
        break;
      }
      case 'arrow': {
        // Patroller: a directional chevron + small ring around it so it reads
        // as "this thing is looking somewhere" (it rotates to match its
        // current heading at runtime).
        g.lineStyle(3, 0x111722, 1);
        g.strokeCircle(half, half, half - 6);
        g.fillCircle(half, half, half - 6);
        // Chevron pointing right (sprite rotates to actual heading at runtime).
        g.fillStyle(0x111722, 1);
        const pts = [
          { x: half + 14, y: half },
          { x: half - 6,  y: half - 12 },
          { x: half - 2,  y: half },
          { x: half - 6,  y: half + 12 },
        ];
        g.fillPoints(pts, true);
        // Eye pip so even when stationary the patroller reads as "alive".
        g.fillStyle(0xffffff, 0.9);
        g.fillCircle(half - 10, half - 8, 2.5);
        break;
      }
      case 'worker': {
        // Neutral miner: circle body with a small pickaxe slash so it reads
        // as "industrial / not aggressive".
        g.fillCircle(half, half, half - 6);
        g.strokeCircle(half, half, half - 6);
        // Pickaxe-ish slash: a thick rotated rectangle.
        g.lineStyle(4, 0x111722, 1);
        g.fillStyle(0x111722, 1);
        const w = 6, len = half * 0.9;
        const cx = half - len * 0.35, cy = half - len * 0.35;
        const ex = half + len * 0.35, ey = half + len * 0.35;
        g.fillTriangle(cx - w, cy + w, cx + w, cy - w, ex, ey);
        g.fillTriangle(ex + w, ey - w, ex - w, ey + w, cx, cy);
        // Bright dot eye so they look "alive" but harmless.
        g.fillStyle(0xffffff, 0.9);
        g.fillCircle(half + 6, half - 8, 3);
        break;
      }
    }
    g.generateTexture(key, size, size);
    g.destroy();
  }

  /**
   * Landmark: boulder pit. Dark ring with a crater interior and a few
   * scattered rocks around the lip, so it reads as "something dangerous lives
   * here". Tinted at use site via setTint to vary by tier later.
   */
  makeLandmarkPit(key, color) {
    const size = 128;
    const half = size / 2;
    const g = this.add.graphics({ x: 0, y: 0, add: false });
    // Outer rim (lighter)
    g.fillStyle(color, 1);
    g.fillCircle(half, half, half - 4);
    // Inner crater (dark)
    g.fillStyle(0x111722, 0.95);
    g.fillCircle(half, half, half - 22);
    // Rim stroke
    g.lineStyle(3, 0x111722, 1);
    g.strokeCircle(half, half, half - 4);
    // Scattered rocks around the lip
    g.fillStyle(0x5a4030, 1);
    g.lineStyle(2, 0x111722, 1);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      const r = half - 14;
      const rx = half + Math.cos(a) * r;
      const ry = half + Math.sin(a) * r;
      g.fillCircle(rx, ry, 6 + (i % 2) * 2);
      g.strokeCircle(rx, ry, 6 + (i % 2) * 2);
    }
    // Central faint glow so eruption telegraph reads from the pit.
    g.fillStyle(0xff6a3a, 0.35);
    g.fillCircle(half, half, half * 0.35);
    g.generateTexture(key, size, size);
    g.destroy();
  }

  /** Boulder projectile: chunky asteroid silhouette. */
  makeBoulder(key, color) {
    const size = 40;
    const half = size / 2;
    const g = this.add.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(color, 1);
    g.lineStyle(2, 0x111722, 1);
    // Irregular polygon to read as a rock.
    const pts = [
      { x: half - 14, y: half - 6 },
      { x: half - 6,  y: half - 14 },
      { x: half + 4,  y: half - 16 },
      { x: half + 14, y: half - 6 },
      { x: half + 16, y: half + 4 },
      { x: half + 6,  y: half + 14 },
      { x: half - 6,  y: half + 16 },
      { x: half - 16, y: half + 4 },
    ];
    g.fillPoints(pts, true);
    g.strokePoints(pts, true);
    // Highlights for volume.
    g.fillStyle(0xffffff, 0.18);
    g.fillCircle(half - 5, half - 5, 4);
    g.generateTexture(key, size, size);
    g.destroy();
  }

  /** Big chunky gear/boss silhouette. */
  makeBossTex(key, color) {
    const size = 128;
    const half = size / 2;
    const g = this.add.graphics({ x: 0, y: 0, add: false });

    // Outer ring with notches. Keep everything inside the canvas.
    g.fillStyle(color, 1);
    g.lineStyle(4, 0x111722, 1);
    const outerPts = [];
    const teeth = 12;
    const outerR = half - 12;
    const toothR = half - 4;
    for (let i = 0; i < teeth * 2; i++) {
      const a = (i / (teeth * 2)) * Math.PI * 2;
      const r = (i % 2 === 0) ? toothR : outerR;
      outerPts.push({ x: half + Math.cos(a) * r, y: half + Math.sin(a) * r });
    }
    g.fillPoints(outerPts, true);
    g.strokePoints(outerPts, true);

    // Inner core ring.
    g.fillStyle(0x111722, 1);
    g.fillCircle(half, half, outerR * 0.6);

    // Hex core.
    g.fillStyle(color, 1);
    g.lineStyle(3, 0x111722, 1);
    const corePts = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      corePts.push({ x: half + Math.cos(a) * (outerR * 0.5), y: half + Math.sin(a) * (outerR * 0.5) });
    }
    g.fillPoints(corePts, true);
    g.strokePoints(corePts, true);

    // Central "eye".
    g.fillStyle(0xffffff, 0.95);
    g.fillCircle(half, half, outerR * 0.18);

    g.generateTexture(key, size, size);
    g.destroy();
  }
}
