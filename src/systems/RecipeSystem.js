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

    // 1. Monochrome ultimate (3+ of one color).
    for (const c of ['red', 'blue', 'green', 'yellow']) {
      if (colors[c] >= RECIPE.monoThreshold) {
        const r = RECIPE.monoRecipes[c];
        if (r) return { upgrade: r.upgrade, label: r.label, essences, colors, ruleType: 'mono' };
      }
    }

    // 2. Rainbow (all 4 primary colors present). Checked before pairs so a
    //    fully-mixed 4-stack always grants the rainbow upgrade.
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

    // 4. Fallback: highest summed essence.
    let bestKey = null;
    let bestVal = -1;
    for (const [k, v] of Object.entries(essences)) {
      if (v > bestVal) {
        bestVal = v;
        bestKey = k;
      }
    }
    const upgrade = (bestKey && RECIPE.fallbackByEssence[bestKey]) || 'turret';
    const label = bestKey ? `MIX: ${bestKey}` : 'MIX';
    return { upgrade, label, essences, colors, ruleType: 'fallback' };
  }
}
