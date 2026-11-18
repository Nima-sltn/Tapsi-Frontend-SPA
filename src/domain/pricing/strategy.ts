/**
 * Strategy Pattern implementation for multi-service fare calculations.
 *
 * Encapsulates the pricing formula and tariff parameters of each mobility service
 * behind a unified `PricingStrategy` interface, decoupling the pricing domain
 * from specific service implementations and allowing open-closed extensibility.
 */

import { toToman, type Toman } from "../../types.js";

export interface PricingBreakdown {
  readonly base: Toman;
  readonly distance: Toman;
  readonly time: Toman;
  readonly total: Toman;
}

export interface PricingStrategy {
  readonly key: string;
  readonly label: string;
  readonly base: number;
  readonly perKm: number;
  readonly perMin: number;
  calculate(distanceKm: number, durationMin: number, timeMultiplier: number): PricingBreakdown;
}

abstract class BasePricingStrategy implements PricingStrategy {
  abstract readonly key: string;
  abstract readonly label: string;
  abstract readonly base: number;
  abstract readonly perKm: number;
  abstract readonly perMin: number;

  calculate(distanceKm: number, durationMin: number, timeMultiplier: number): PricingBreakdown {
    const safeKm = Math.max(0, distanceKm);
    const safeMin = Math.max(0, durationMin);
    const safeMultiplier = Math.max(0.1, timeMultiplier);

    const baseCost = this.base;
    const distanceCost = safeKm * this.perKm;
    const timeCost = safeMin * this.perMin;
    const subtotal = baseCost + distanceCost + timeCost;
    const total = Math.round((subtotal * safeMultiplier) / 1000) * 1000;

    return {
      base: toToman(baseCost),
      distance: toToman(distanceCost),
      time: toToman(timeCost),
      total: toToman(total)
    };
  }
}

export class ClassicPricingStrategy extends BasePricingStrategy {
  readonly key = "classic";
  readonly label = "تپسی کلاسیک";
  readonly base = 25000;
  readonly perKm = 6500;
  readonly perMin = 600;
}

export class PlusPricingStrategy extends BasePricingStrategy {
  readonly key = "plus";
  readonly label = "تپسی پلاس";
  readonly base = 45000;
  readonly perKm = 9000;
  readonly perMin = 900;
}

export class MotoPricingStrategy extends BasePricingStrategy {
  readonly key = "moto";
  readonly label = "موتوپیک";
  readonly base = 18000;
  readonly perKm = 5000;
  readonly perMin = 700;
}

export class AutopeykPricingStrategy extends BasePricingStrategy {
  readonly key = "autopeyk";
  readonly label = "اتوپیک";
  readonly base = 30000;
  readonly perKm = 7000;
  readonly perMin = 500;
}

export class LinePricingStrategy extends BasePricingStrategy {
  readonly key = "line";
  readonly label = "تپسی لاین";
  readonly base = 20000;
  readonly perKm = 4500;
  readonly perMin = 400;
}

/** Registry of available pricing strategies mapping service keys to instances. */
export class PricingStrategyRegistry {
  private readonly strategies = new Map<string, PricingStrategy>();

  constructor() {
    this.register(new ClassicPricingStrategy());
    this.register(new PlusPricingStrategy());
    this.register(new MotoPricingStrategy());
    this.register(new AutopeykPricingStrategy());
    this.register(new LinePricingStrategy());
  }

  register(strategy: PricingStrategy): void {
    this.strategies.set(strategy.key, strategy);
  }

  get(key: string): PricingStrategy | undefined {
    return this.strategies.get(key);
  }

  has(key: string): boolean {
    return this.strategies.has(key);
  }

  getAll(): PricingStrategy[] {
    return Array.from(this.strategies.values());
  }
}

export const defaultStrategyRegistry = new PricingStrategyRegistry();
