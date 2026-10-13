// src/lib/coach/student-model/knowledgeTracing.ts
/**
 * Bayesian Knowledge Tracing (BKT) Engine for Chapter Mastery.
 * Resolves Defects A4-A8:
 * - JEE-calibrated guess priors by question type (MCQ: 0.25, MULTI: 0.08, NUMERIC: 0.03, UNKNOWN: 0.15)
 * - Order-neutral evenly interleaved sequence capped at 6 observations per session
 * - Error-tag weighting (attentional slips attenuated to 0.25 weight)
 * - Multi-day mastery gate (requires >= 3 distinct days)
 */

import type { ChapterMastery, ErrorCounts, ISODate, QuestionType } from "../types";

export interface BKTParams {
  pS: number;
  pT: number;
  guess: Record<QuestionType, number>;
}

export const PRIORS: BKTParams = {
  pS: 0.10, // slip probability
  pT: 0.05, // transition probability per observation
  guess: {
    MCQ: 0.25,
    MULTI: 0.08,
    NUMERIC: 0.03,
    UNKNOWN: 0.15,
  },
};

export const P_L0 = 0.20; // initial prior mastery
export const MAX_OBS = 6; // maximum BKT observations per session to avoid single-session saturation

export const TIER_W: Record<number, number> = {
  1: 0.7, // Concept level
  2: 1.0, // JEE Main PYQ
  3: 1.1, // JEE Advanced
};

export const TAG_W = {
  KNOWLEDGE_DEFICIT: 1.0,
  TRANSFER_FAILURE: 0.9,
  PROCEDURAL_FLAW: 0.6,
  ATTENTIONAL_SLIP: 0.25, // Attentional slip is an execution slip, not lack of mastery
};

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

function posterior(
  p: number,
  correct: boolean,
  pS: number,
  pG: number,
): number {
  const num = correct ? p * (1 - pS) : p * pS;
  const den = correct ? num + (1 - p) * pG : num + (1 - p) * (1 - pG);
  return den > 0 ? num / den : p;
}

// Evenly interleaved, order-neutral sequence; at most MAX_OBS observations per session
export function buildSequence(
  attempted: number,
  correct: number,
): boolean[] {
  const m = Math.min(attempted, MAX_OBS);
  if (m <= 0) return [];
  const wrong = m - Math.round((m * correct) / attempted);
  const seq: boolean[] = [];

  for (let i = 0; i < m; i++) {
    const isWrong =
      Math.floor(((i + 1) * wrong) / m) > Math.floor((i * wrong) / m);
    seq.push(!isWrong);
  }
  return seq;
}

function wrongWeight(
  tags: Partial<ErrorCounts> | undefined,
  wrongTotal: number,
): number {
  if (!tags || wrongTotal <= 0) return 1.0;
  let tagged = 0;
  let sum = 0;

  (Object.keys(TAG_W) as (keyof typeof TAG_W)[]).forEach((k) => {
    const n = Math.min(tags[k] ?? 0, wrongTotal - tagged);
    tagged += n;
    sum += n * TAG_W[k];
  });

  return (sum + (wrongTotal - tagged) * 1.0) / wrongTotal; // untagged counts as full deficit
}

export function updateChapter(
  prev: ChapterMastery | null,
  key: string,
  s: {
    date: ISODate;
    attempted: number;
    correct: number;
    questionType?: QuestionType;
    tier?: 1 | 2 | 3;
    errorCounts?: Partial<ErrorCounts>;
  },
  params: BKTParams = PRIORS,
): ChapterMastery {
  const [sub, ...chapParts] = key.split(":");
  const chap = chapParts.join(":");

  const base: ChapterMastery = prev ?? {
    key,
    subject: sub || "Physics",
    chapter: chap || key,
    pL: P_L0,
    evidenceCount: 0,
    distinctDays: 0,
    halfLifeDays: 1.6,
    lastRetrievalDate: null,
    errorTotals: {
      KNOWLEDGE_DEFICIT: 0,
      PROCEDURAL_FLAW: 0,
      ATTENTIONAL_SLIP: 0,
      TRANSFER_FAILURE: 0,
    },
  };

  if (s.attempted <= 0) return base;

  const pG = params.guess[s.questionType ?? "UNKNOWN"] ?? 0.15;
  const tierW = TIER_W[s.tier ?? 2] ?? 1.0;
  const wW = wrongWeight(s.errorCounts, s.attempted - s.correct);

  let p = base.pL;
  for (const ok of buildSequence(s.attempted, s.correct)) {
    const post = posterior(p, ok, params.pS, pG);
    const w = Math.min(1.1, tierW * (ok ? 1 : wW));
    const blended = p + w * (post - p);
    p = clamp(blended + (1 - blended) * params.pT, 0.01, 0.99);
  }

  const totals = { ...base.errorTotals };
  (Object.keys(totals) as (keyof ErrorCounts)[]).forEach((k) => {
    totals[k] += s.errorCounts?.[k] ?? 0;
  });

  return {
    ...base,
    pL: Math.round(p * 1000) / 1000,
    evidenceCount: base.evidenceCount + Math.min(s.attempted, MAX_OBS),
    distinctDays:
      base.distinctDays + (base.lastRetrievalDate === s.date ? 0 : 1),
    lastRetrievalDate: s.date,
    errorTotals: totals,
  };
}
