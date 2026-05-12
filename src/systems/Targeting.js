// Cheap nearest-enemy lookup. Kept simple - linear scan over the enemies group.
// If perf becomes an issue, swap for a spatial grid keyed by GameScene.

export class Targeting {
  constructor(scene) {
    this.scene = scene;
  }

  findNearestEnemy(x, y, range) {
    const enemies = this.scene.enemies?.getChildren?.() ?? [];
    let best = null;
    let bestD2 = range * range;
    for (const e of enemies) {
      if (!e.active) continue;
      const dx = e.x - x;
      const dy = e.y - y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD2) {
        bestD2 = d2;
        best = e;
      }
    }
    return best;
  }
}
