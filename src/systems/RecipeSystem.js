import { RECIPE } from '../config.js';

/**
 * RecipeSystem
 *
 * Pure resolver: takes a list of ingredients (each { color, value }) and
 * returns the upgrade key that should be granted on combine. State (slots,
 * tail, combine triggering, FX) is owned by Player / GameScene; this module
 * only knows the rule table.
 *
 * Why split it out:
 *   - keeps the rule table testable in isolation
 *   - makes adding new combos a one-line config change
 *   - decouples the "what upgrade do I get?" question from the snake-tail
 *     plumbing inside Player / GameScene
 */
export class RecipeSystem {
  /**
   * Sum essence contributions weighted by ingredient value.
   *
   * @param {Array<{color: string, value: number}>} ingredients
   * @returns {Record<string, number>}
   */
  static computeEssences(ingredients) {
    const totals = {};
    for (const ing of ingredients) {
      const map = RECIPE.essences[ing.color];
      if (!map) continue;
      const v = Math.max(1, ing.value || 1);
      for (const [essence, amount] of Object.entries(map)) {
        totals[essence] = (totals[essence] || 0) + amount * v;
      }
    }
    return totals;
  }

  /** Count of each color in the ingredient list. */
  static countColors(ingredients) {
    const counts = { red: 0, green: 0, blue: 0, yellow: 0 };
    for (const ing of ingredients) {
      if (counts[ing.color] !== undefined) counts[ing.color]++;
    }
    return counts;
  }

  /**
   * Resolve a list of ingredients into an upgrade decision.
   *
   * Returns:
   *   {
   *     upgrade: string,     // upgrade key from UPGRADES
   *     label: string,       // human-readable label for the banner
   *     essences: { ... },   // for UI / debug
   *     colors: { red: ..., blue: ..., ... },
   *     ruleType: 'mono' | 'pair' | 'rainbow' | 'fallback',
   *   }
   */
  static resolve(ingredients) {
    const essences = RecipeSystem.computeEssences(ingredients);
    const colors = RecipeSystem.countColors(ingredients);

    // 1. Monochrome ultimate (threshold per color; red/blue default lower).
    for (const c of ['red', 'blue', 'green', 'yellow']) {
      const thresh =
        RECIPE.monoThresholdByColor?.[c] ?? RECIPE.monoThreshold ?? 3;
      if (colors[c] >= thresh) {
        const r = RECIPE.monoRecipes[c];
        if (r) {
          const tag = r.tag || r.upgrade.toUpperCase();
          const label = `${colors[c]}× ${c.toUpperCase()}: ${tag}`;
          return { upgrade: r.upgrade, label, essences, colors, ruleType: 'mono' };
        }
      }
    }

    // 2. Rainbow (all 4 primary colors present). Before pairs so a full
    //    spectrum always grants prism.
    if (colors.red >= 1 && colors.blue >= 1 && colors.green >= 1 && colors.yellow >= 1) {
      const r = RECIPE.rainbow;
      return { upgrade: r.upgrade, label: r.label, essences, colors, ruleType: 'rainbow' };
    }

    // 3. Special pair recipes.
    for (const r of RECIPE.pairRecipes) {
      const [a, b] = r.colors;
      if (colors[a] >= r.minEach && colors[b] >= r.minEach) {
        return { upgrade: r.upgrade, label: r.label, essences, colors, ruleType: 'pair' };
      }
    }

    // 4. Fallback: highest summed essence, with optional bias so weapon-linked
    //    essences win close ties against speed / armor / harvest.
    const weaponKeys = new Set(RECIPE.weaponEssenceKeys || []);
    const bias = RECIPE.weaponEssenceBias ?? 1;
    let bestKey = null;
    let bestScore = -1;
    for (const [k, v] of Object.entries(essences)) {
      const mult = weaponKeys.has(k) ? bias : 1;
      const score = v * mult;
      if (score > bestScore) {
        bestScore = score;
        bestKey = k;
      }
    }
    const upgrade = (bestKey && RECIPE.fallbackByEssence[bestKey]) || 'turret';
    const label = bestKey ? `MIX: ${bestKey}` : 'MIX';
    return { upgrade, label, essences, colors, ruleType: 'fallback' };
  }
}
