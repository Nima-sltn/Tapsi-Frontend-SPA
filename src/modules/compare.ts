/**
 * Service comparison domain logic.
 *
 * Answers one question: *for this trip, what would every service cost?*
 *
 * Pure and DOM-free on purpose — the browser imports it, Node imports it for
 * unit tests. All ordering, ranking and normalisation happens here so the UI
 * only draws bars.
 */
import { SERVICES, estimateFare, type FareInput } from "./fare.js";

/** One ranked row of the cross-service comparison. */
export interface CompareRow {
  key: string;
  label: string;
  total: number;
  /** 1 = cheapest. */
  rank: number;
  /** Share of the most expensive service (0..1]. */
  ratio: number;
  cheapest: boolean;
}

/**
 * Estimates every service for a single trip, cheapest first.
 * @throws {RangeError} Propagated from the fare domain on unknown inputs.
 */
export function compareFare(input: FareInput): CompareRow[] {
  const rows: Array<Omit<CompareRow, "rank" | "ratio" | "cheapest">> = Object.keys(SERVICES).map(
    (key) => {
      const estimate = estimateFare({ ...input, service: key });
      return { key, label: SERVICES[key as keyof typeof SERVICES].label, total: estimate.total };
    }
  );

  rows.sort((a, b) => a.total - b.total);

  const max = rows.length ? (rows[rows.length - 1]?.total ?? 0) : 0;
  return rows.map((row, index) => ({
    ...row,
    rank: index + 1,
    ratio: max > 0 ? row.total / max : 1,
    cheapest: index === 0
  }));
}
