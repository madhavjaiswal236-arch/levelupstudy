// src/lib/coach/normalize.ts
/**
 * Normalization & Coverage Engine.
 * Resolves Defect B3 (no silent imputation) & B4 (disengagement detection).
 * Strictly preserves null values for absent metrics.
 */

import type {
  RawCoachInput,
  NormalizedStudentData,
  DayRecord,
  ISODate,
  CoachInput,
} from "./types";
import { inferDayTypeFromDate } from "./adapters/appContextAdapter";

export interface NormalizedCoverage {
  totalCalendarDays: number;
  usableDays: number; // days where hours is not null
  coverageRatio7d: number;
  consecutiveNoDataDays: number;
  disengaged: boolean;
}

export function computeCoverage(
  dailyHistory: DayRecord[],
  today: ISODate,
): NormalizedCoverage {
  // Take last 7 days window
  const last7 = dailyHistory.slice(-7);
  const usable7 = last7.filter((d) => d.hours !== null).length;
  const coverageRatio7d = last7.length > 0 ? usable7 / last7.length : 0;

  // Check consecutive no-data days ending at today
  let consecutiveNoDataDays = 0;
  for (let i = dailyHistory.length - 1; i >= 0; i--) {
    if (dailyHistory[i].hours === null) {
      consecutiveNoDataDays++;
    } else {
      break;
    }
  }

  // DISENGAGED: 3+ consecutive no-data days, OR coverage < 50% in last 7 days (when at least 4 calendar days exist)
  const disengaged =
    consecutiveNoDataDays >= 3 || (last7.length >= 4 && coverageRatio7d < 0.5);

  const usableDays = dailyHistory.filter((d) => d.hours !== null).length;

  return {
    totalCalendarDays: dailyHistory.length,
    usableDays,
    coverageRatio7d: Math.round(coverageRatio7d * 100) / 100,
    consecutiveNoDataDays,
    disengaged,
  };
}

export function normalizeCoachInput(input: CoachInput): CoachInput {
  const sanitizedHistory = input.dailyHistory.map((d) => ({
    date: d.date,
    dayType: d.dayType || inferDayTypeFromDate(d.date, input.scheduleProfile),
    hours:
      d.hours !== null && !isNaN(d.hours)
        ? Math.min(24, Math.max(0, d.hours))
        : null,
    sleep:
      d.sleep !== null && !isNaN(d.sleep)
        ? Math.min(24, Math.max(0, d.sleep))
        : null,
    screen:
      d.screen !== null && !isNaN(d.screen)
        ? Math.min(24, Math.max(0, d.screen))
        : null,
    xp: Math.max(0, d.xp || 0),
    completedTasksCount: Math.max(0, d.completedTasksCount || 0),
    plannedTasksCount: Math.max(0, d.plannedTasksCount || 0),
    questionsSolved: d.questionsSolved,
    correctQuestions: d.correctQuestions,
  }));

  return {
    ...input,
    hoursToday: Math.min(24, Math.max(0, input.hoursToday || 0)),
    sleepLastNight:
      input.sleepLastNight !== null && !isNaN(input.sleepLastNight)
        ? Math.min(24, Math.max(0, input.sleepLastNight))
        : null,
    screenToday:
      input.screenToday !== null && !isNaN(input.screenToday)
        ? Math.min(24, Math.max(0, input.screenToday))
        : null,
    targetSleepHours: input.targetSleepHours || 6.0,
    dailyHistory: sanitizedHistory,
  };
}

// -------------------------------------------------------------
// Backwards-Compatible Legacy Normalizer
// -------------------------------------------------------------

export function normalizeInput(input: RawCoachInput): NormalizedStudentData {
  const sanitizeNum = (
    val: any,
    fallback: number = 0,
    min: number = 0,
    max: number = 24,
  ): number => {
    if (val === Infinity) return max;
    if (val === -Infinity) return min;
    if (
      val === undefined ||
      val === null ||
      typeof val !== "number" ||
      isNaN(val) ||
      !isFinite(val)
    ) {
      return fallback;
    }
    return Math.min(Math.max(val, min), max);
  };

  const sanitizeGenericNum = (val: any, fallback: number = 0): number => {
    if (
      val === undefined ||
      val === null ||
      typeof val !== "number" ||
      isNaN(val) ||
      !isFinite(val)
    ) {
      return fallback;
    }
    return Math.max(0, val);
  };

  const hours = sanitizeNum(input.hours, 0, 0, 24);
  const sleep = sanitizeNum(input.sleep, 7, 0, 24);
  const screenTime = sanitizeNum(input.screenTime, 0, 0, 24);

  const dateStr = input.date || new Date().toISOString();
  const targetDay = dateStr.slice(0, 10);

  const completedTasks = Array.isArray(input.completedTasks)
    ? input.completedTasks
    : [];
  const rawPlanned = Array.isArray(input.plannedTasks)
    ? input.plannedTasks
    : [];
  const plannedTasks = rawPlanned.filter((t: any) => {
    if (!t) return false;
    const taskDate =
      t.dateScheduled ||
      (typeof t.startTime === "string" && t.startTime.length >= 10
        ? t.startTime.slice(0, 10)
        : null);
    if (taskDate && taskDate > targetDay) {
      return false;
    }
    return true;
  });
  const practiceSessions = Array.isArray(input.practiceSessions)
    ? input.practiceSessions
    : [];
  const history = Array.isArray(input.history) ? input.history : [];
  const loggedTasksToday = Array.isArray(input.loggedTasksToday)
    ? input.loggedTasksToday
    : [];

  const xpEarned = sanitizeGenericNum(input.xpEarned, 0);
  const targetXp = sanitizeGenericNum(input.targetXp, 1000);
  const level = sanitizeGenericNum(input.level, 1);
  const streakDays = sanitizeGenericNum(input.streakDays, 0);
  const accuracy = sanitizeGenericNum(input.accuracy, 0);

  return {
    dateStr,
    hours,
    sleep,
    screenTime,
    completedTasks,
    plannedTasks,
    practiceSessions,
    xpEarned,
    targetXp,
    level,
    streakDays,
    history,
    syllabus: input.syllabus,
    accuracy,
    loggedTasksToday,
  };
}
