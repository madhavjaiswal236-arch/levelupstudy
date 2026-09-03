import { RawCoachInput, NormalizedStudentData } from "./types";

export function normalizeInput(input: RawCoachInput): NormalizedStudentData {
  const sanitizeNum = (val: any, fallback: number = 0, min: number = 0, max: number = 24): number => {
    if (val === undefined || val === null || typeof val !== "number" || isNaN(val) || !isFinite(val)) {
      return fallback;
    }
    return Math.min(Math.max(val, min), max);
  };

  const sanitizeGenericNum = (val: any, fallback: number = 0): number => {
    if (val === undefined || val === null || typeof val !== "number" || isNaN(val) || !isFinite(val)) {
      return fallback;
    }
    return Math.max(0, val);
  };

  const hours = sanitizeNum(input.hours, 0, 0, 24);
  const sleep = sanitizeNum(input.sleep, 7, 0, 24);
  const screenTime = sanitizeNum(input.screenTime, 0, 0, 24);

  const dateStr = input.date || new Date().toISOString();
  const targetDay = dateStr.slice(0, 10);

  const completedTasks = Array.isArray(input.completedTasks) ? input.completedTasks : [];
  const rawPlanned = Array.isArray(input.plannedTasks) ? input.plannedTasks : [];
  // Exclude tasks scheduled for future dates so the coach only evaluates this day's planned load
  const plannedTasks = rawPlanned.filter((t: any) => {
    if (!t) return false;
    const taskDate = t.dateScheduled || (typeof t.startTime === "string" && t.startTime.length >= 10 ? t.startTime.slice(0, 10) : null);
    if (taskDate && taskDate > targetDay) {
      return false;
    }
    return true;
  });
  const practiceSessions = Array.isArray(input.practiceSessions) ? input.practiceSessions : [];
  const history = Array.isArray(input.history) ? input.history : [];
  const loggedTasksToday = Array.isArray(input.loggedTasksToday) ? input.loggedTasksToday : [];

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
