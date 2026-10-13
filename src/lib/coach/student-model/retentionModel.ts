// src/lib/coach/student-model/retentionModel.ts
/**
 * Spaced Retention & Half-Life Memory Model.
 * Resolves Defects A1-A3:
 * - Corrected stability expansion: S' = S * (1 + alpha * M * (1 - R)) with alpha = 3.0
 *   Lower retrievability at review yields greater memory consolidation.
 * - Standardized R = 2^(-t / h) where h is half-life in days.
 * - Spaced review queue gates at pL >= 0.35 and R < 0.65.
 */

import type { ChapterMastery, ISODate } from "../types";
import { daysBetween } from "../interventions/outcomeTracker";

export const ALPHA = 3.0;
export const MIN_H = 1.0;
export const MAX_H = 90;
export const RETRIEVAL_THRESHOLD = 0.65;

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

export function retrievability(
  s: ChapterMastery,
  today: ISODate,
): number | null {
  if (!s.lastRetrievalDate) return null;
  const t = Math.max(0, daysBetween(s.lastRetrievalDate, today));
  return Math.pow(2, -t / Math.max(s.halfLifeDays, MIN_H)); // R = 2^(-t/h)
}

/**
 * Updates half-life upon a retrieval practice session.
 * Accuracy must be EFFECTIVE accuracy: (correct + 0.75 * slipTagged) / attempted
 * Optionally clamps maximum interval to ~20% of remaining days before examDate (Defect A3, §2.2 & §7.6).
 */
export function onRetrieval(
  s: ChapterMastery,
  today: ISODate,
  effectiveAccuracy: number,
  attempts: number,
  examDate?: ISODate,
): ChapterMastery {
  const R = retrievability(s, today) ?? 0;
  let h = s.halfLifeDays;

  if (attempts >= 5 && effectiveAccuracy >= 0.6) {
    // Successful retrieval: lower R yields greater expansion
    const M = 0.8 + 0.4 * s.pL;
    h = h * (1 + ALPHA * M * (1 - R));
  } else if (attempts >= 5 && effectiveAccuracy < 0.4) {
    // Failed retrieval: half-life is cut in half
    h = h * 0.5;
  }
  // Neutral zone (0.4 <= accuracy < 0.6) leaves half-life unchanged

  let maxHorizon = MAX_H;
  if (examDate) {
    const daysLeft = Math.max(1, daysBetween(today, examDate));
    maxHorizon = Math.min(MAX_H, Math.max(MIN_H, Math.round(daysLeft * 0.20)));
  }

  return {
    ...s,
    halfLifeDays: clamp(h, MIN_H, maxHorizon),
    lastRetrievalDate: today,
  };
}

export function reviewQueue(
  all: ChapterMastery[],
  today: ISODate,
): ChapterMastery[] {
  return all
    .filter(
      (c) =>
        c.pL >= 0.35 && (retrievability(c, today) ?? 1) < RETRIEVAL_THRESHOLD,
    )
    .sort(
      (a, b) =>
        (retrievability(a, today) ?? 1) - (retrievability(b, today) ?? 1),
    );
}
