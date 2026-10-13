// src/lib/coach/interventions/outcomeTracker.ts
/**
 * Closed-Loop Outcome Tracker: Mission adherence and empirical efficacy estimation.
 * Pure functions: state is persisted outside this engine.
 * As defined in Audit Section 4.8 & 7.2.
 */

import type { MissionId, MissionRecord, ISODate } from "../types";

export const COOLDOWN_DAYS = 14;

export function daysBetween(a: ISODate, b: ISODate): number {
  const [ya, ma, da] = a.split("-").map(Number);
  const [yb, mb, db] = b.split("-").map(Number);
  return Math.round(
    (Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / 86400000,
  );
}

// Record an offered mission idempotently by key `${offeredOn}:${missionId}`
export const recordOffer = (
  history: MissionRecord[],
  record: MissionRecord,
): MissionRecord[] => {
  return history.some((x) => x.key === record.key) ? history : [...history, record];
};

export function strategyWeight(
  id: MissionId,
  history: MissionRecord[],
  today: ISODate,
): {
  weight: number;
  adherence: number | null;
  efficacy: number | null;
  n: number;
} {
  const h = history
    .filter((r) => r.missionId === id || r.key.endsWith(`:${id}`))
    .sort((a, b) => a.offeredOn.localeCompare(b.offeredOn));

  if (!h.length) {
    return { weight: 1.0, adherence: null, efficacy: null, n: 0 };
  }

  // Check 3 consecutive misses within cooldown
  const last3 = h.slice(-3);
  const missedThree = last3.length === 3 && last3.every((r) => !r.completed);

  if (
    missedThree &&
    daysBetween(h[h.length - 1].offeredOn, today) < COOLDOWN_DAYS
  ) {
    return { weight: 0.1, adherence: 0, efficacy: null, n: h.length }; // cooldown with exploration floor
  }

  const adherence = h.filter((r) => r.completed).length / h.length;

  const judged = h.filter(
    (r) =>
      r.completed &&
      r.post !== undefined &&
      r.expectedPost !== undefined,
  );

  // Efficacy stays null (inconclusive) under 3 trials to avoid regression-to-mean illusion
  const efficacy =
    judged.length >= 3
      ? judged.filter((r) => (r.post as number) > (r.expectedPost as number))
          .length / judged.length
      : null;

  const weight = Math.min(
    1.5,
    Math.max(
      0.3,
      0.5 +
        0.5 * adherence +
        (efficacy === null ? 0 : 0.5 * (efficacy - 0.5)),
    ),
  );

  return { weight, adherence, efficacy, n: h.length };
}
