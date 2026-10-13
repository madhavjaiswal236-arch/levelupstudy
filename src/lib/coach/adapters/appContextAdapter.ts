// src/lib/coach/adapters/appContextAdapter.ts
/**
 * Adapter Layer: Maps AppContext state shapes into pure Cognitive Mentor Engine inputs.
 * Ensures the engine has ZERO dependencies on React, hooks, or AppContext internals.
 */

import type {
  CoachInput,
  DayRecord,
  PracticeSessionExt,
  DayType,
  ISODate,
  QuestionType,
  ErrorCounts,
} from "../types";

export interface AppContextDataPayload {
  today?: ISODate;
  hoursStudiedToday?: number;
  sleepLastNight?: number | null;
  screenToday?: number | null;
  targetSleepHours?: number;
  examDate?: ISODate;
  history?: Array<{
    date: string;
    hoursStudied: number;
    xpEarned: number;
    completedTasks?: any[];
    plannedTasks?: any[];
    screenTime?: number;
    sleepTime?: number;
    isMissed?: boolean;
    aiFeedback?: string;
  }>;
  practiceSessions?: Array<{
    id?: string;
    date: string;
    subject: string;
    chapter: string;
    attempted: number;
    correct: number;
    timeSpent: number;
    mistakes?: string[];
    errorCounts?: Partial<ErrorCounts>;
    confidencePre?: number;
    perceivedDifficulty?: 1 | 2 | 3 | 4 | 5;
    questionType?: QuestionType;
    difficultyTier?: 1 | 2 | 3;
    timed?: boolean;
  }>;
  scheduleProfile?: Record<string, DayType>;
  distressSignalLogged?: boolean;
}

export function inferDayTypeFromDate(
  dateStr: string,
  profile?: Record<string, DayType>,
): DayType {
  const d = new Date(dateStr);
  const dayIndex = isNaN(d.getTime()) ? new Date().getDay() : d.getDay();
  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const name = dayNames[dayIndex];

  if (profile && profile[name]) {
    return profile[name];
  }

  // Default baseline JEE rhythm:
  // Mon-Fri: Coaching / School
  // Sat: Full Study Day
  // Sun: Full Study Day / Review
  if (dayIndex === 0) return "FULL_STUDY_DAY";
  if (dayIndex === 6) return "FULL_STUDY_DAY";
  return "COACHING_DAY";
}

export function adaptAppContextToCoachInput(
  payload: AppContextDataPayload,
  nowDateStr?: ISODate,
): CoachInput {
  const today =
    payload.today ||
    nowDateStr ||
    new Date().toISOString().split("T")[0];

  const dayType = inferDayTypeFromDate(today, payload.scheduleProfile);

  const rawHistory = payload.history || [];
  const dailyHistory: DayRecord[] = rawHistory.map((h) => {
    const rawDate = h.date.includes("T") ? h.date.split("T")[0] : h.date;
    const hDayType = inferDayTypeFromDate(rawDate, payload.scheduleProfile);

    return {
      date: rawDate,
      dayType: hDayType,
      hours: h.isMissed ? 0 : typeof h.hoursStudied === "number" ? h.hoursStudied : null,
      sleep: typeof h.sleepTime === "number" && h.sleepTime > 0 ? h.sleepTime : null,
      screen: typeof h.screenTime === "number" ? h.screenTime : null,
      xp: h.xpEarned || 0,
      completedTasksCount: (h.completedTasks || []).length,
      plannedTasksCount: (h.plannedTasks || []).length,
    };
  });

  const practiceSessions: PracticeSessionExt[] = (payload.practiceSessions || []).map((p) => {
    const rawDate = p.date.includes("T") ? p.date.split("T")[0] : p.date;
    return {
      id: p.id,
      date: rawDate,
      subject: p.subject as any,
      chapter: p.chapter,
      attempted: p.attempted || 0,
      correct: p.correct || 0,
      timeSpent: p.timeSpent || 0,
      mistakes: p.mistakes,
      errorCounts: p.errorCounts,
      confidencePre: p.confidencePre,
      perceivedDifficulty: p.perceivedDifficulty,
      questionType: p.questionType || "MCQ",
      difficultyTier: p.difficultyTier || 2,
      timed: p.timed,
    };
  });

  return {
    today,
    dayType,
    hoursToday: payload.hoursStudiedToday ?? 0,
    sleepLastNight: payload.sleepLastNight ?? null,
    screenToday: payload.screenToday ?? null,
    targetSleepHours: payload.targetSleepHours ?? 7.5,
    examDate: payload.examDate,
    dailyHistory,
    practiceSessions,
    scheduleProfile: payload.scheduleProfile,
    distressSignalLogged: payload.distressSignalLogged,
  };
}
