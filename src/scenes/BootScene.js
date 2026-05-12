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
    }
    g.generateTexture(key, size, size);
    g.destroy();
  }
}
