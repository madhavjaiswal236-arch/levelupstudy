// src/lib/coach/baseline.ts
/**
 * Day-Type Robust Baselines.
 * Resolves Defect B1 (day-type confounding) and Baseline Drift problem.
 * Baselines use slow medians over at least 21 days per day type, frozen against last 7 days.
 */

import type { DayType, DayRecord, StudentBaseline } from "./types";
import { getExpectedCapacityHours } from "./student-model/profile";

export interface DayTypeBaselineMap {
  expectedHours: Record<DayType, number>;
  sampleCounts: Record<DayType, number>;
  robustMedians: Record<DayType, number>;
}

export function medianOf(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function computeDayTypeBaselines(
  dailyHistory: DayRecord[],
): DayTypeBaselineMap {
  const allDayTypes: DayType[] = [
    "SCHOOL_DAY",
    "COACHING_DAY",
    "FULL_STUDY_DAY",
    "REST_DAY",
    "EXAM_DAY",
  ];

  const expectedHours: Record<DayType, number> = {} as any;
  const sampleCounts: Record<DayType, number> = {} as any;
  const robustMedians: Record<DayType, number> = {} as any;

  // Freeze against last 7 days if history is long enough (>14 days), to prevent baseline drift
  const candidateHistory =
    dailyHistory.length > 14 ? dailyHistory.slice(0, -7) : dailyHistory;

  allDayTypes.forEach((dt) => {
    const defaultCapacity = getExpectedCapacityHours(dt);
    const validHours = candidateHistory
      .filter((d) => d.dayType === dt && d.hours !== null && !isNaN(d.hours))
      .map((d) => d.hours as number);

    sampleCounts[dt] = validHours.length;

    if (validHours.length >= 3) {
      const med = medianOf(validHours);
      robustMedians[dt] = Math.round(med * 10) / 10;
      expectedHours[dt] = Math.max(1.0, Math.round(med * 10) / 10);
    } else {
      robustMedians[dt] = defaultCapacity;
      expectedHours[dt] = defaultCapacity;
    }
  });

  return { expectedHours, sampleCounts, robustMedians };
}

// Legacy EMA Baseline for existing UI consumers
export function computeBaseline(history: any[]): StudentBaseline {
  const valid = (history || []).filter(
    (h) =>
      !h.isMissed &&
      typeof h.hoursStudied === "number" &&
      !isNaN(h.hoursStudied),
  );

  if (valid.length === 0) {
    return {
      avgHours: 3.5,
      avgSleep: 7.0,
      avgScreen: 3.0,
      avgQuestions: 20,
      avgCompletionRate: 0.8,
      dataPoints: 0,
      confidence: "NONE",
    };
  }

  const alpha = 0.2;
  let emaHours = valid[0].hoursStudied || 0;
  let emaSleep = valid[0].sleepTime || 7;
  let emaScreen = valid[0].screenTime || 3.5;
  let emaCompletionRate = 0.75;
  let totalQuestionsCount = 0;
  let daysWithQuestions = 0;

  for (let i = 0; i < valid.length; i++) {
    const h = valid[i];
    const hrs = Math.max(0, h.hoursStudied || 0);
    const slp = Math.max(0, h.sleepTime || 7);
    const scr = Math.max(0, h.screenTime || 3.5);

    const planned = h.plannedTasks?.length || 0;
    const completed = h.completedTasks?.length || 0;
    const rate = planned > 0 ? completed / planned : 0.8;

    if (i === 0) {
      emaHours = hrs;
      emaSleep = slp;
      emaScreen = scr;
      emaCompletionRate = rate;
    } else {
      emaHours = alpha * hrs + (1 - alpha) * emaHours;
      emaSleep = alpha * slp + (1 - alpha) * emaSleep;
      emaScreen = alpha * scr + (1 - alpha) * emaScreen;
      emaCompletionRate = alpha * rate + (1 - alpha) * emaCompletionRate;
    }

    if (typeof h.xpEarned === "number" && h.xpEarned > 0) {
      const approxQ = Math.round(h.xpEarned / 5);
      totalQuestionsCount += approxQ;
      daysWithQuestions++;
    }
  }

  const avgCompletionRate = emaCompletionRate;
  const avgQuestions =
    daysWithQuestions > 0
      ? Math.round(totalQuestionsCount / daysWithQuestions)
      : Math.round(emaHours * 6);

  const confidence =
    valid.length >= 10 ? "HIGH" : valid.length >= 4 ? "MEDIUM" : "LOW";

  return {
    avgHours: Math.round(emaHours * 10) / 10,
    avgSleep: Math.round(emaSleep * 10) / 10,
    avgScreen: Math.round(emaScreen * 10) / 10,
    avgQuestions,
    avgCompletionRate: Math.round(avgCompletionRate * 100) / 100,
    dataPoints: valid.length,
    confidence,
  };
}
