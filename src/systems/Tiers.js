import { TIER, MINERAL, PICKUP } from '../config.js';

export class Tiers {
  constructor(worldCenter) {
    this.center = worldCenter;
  }

  tierForDistance(d) {
    if (d <= TIER.safeRadius) return 0;
    const t = 1 + Math.floor((d - TIER.safeRadius) / TIER.ringWidth);
    return Math.min(TIER.maxTier, t);
  }

  /**
   * Inclusive value range for a mineral at this tier.
   */
  mineralValueRange(tier) {
    if (tier === 0) return [MINERAL.innerValueMin, MINERAL.innerValueMax];
    const bonus = tier * 2;
    return [MINERAL.outerValueMin + bonus, MINERAL.outerValueMax + bonus];
  }

  pickupValueRange(tier) {
    if (tier === 0) return [PICKUP.innerValueMin, Math.max(PICKUP.innerValueMin + 1, PICKUP.innerValueMax - 4)];
    const bonus = tier * 2;
    return [PICKUP.innerValueMin + bonus, PICKUP.innerValueMax + bonus];
  }
}
