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

  const completedTasks = Array.isArray(input.completedTasks) ? input.completedTasks : [];
  const plannedTasks = Array.isArray(input.plannedTasks) ? input.plannedTasks : [];
  const practiceSessions = Array.isArray(input.practiceSessions) ? input.practiceSessions : [];
  const history = Array.isArray(input.history) ? input.history : [];
  const loggedTasksToday = Array.isArray(input.loggedTasksToday) ? input.loggedTasksToday : [];

  const xpEarned = sanitizeGenericNum(input.xpEarned, 0);
  const targetXp = sanitizeGenericNum(input.targetXp, 1000);
  const level = sanitizeGenericNum(input.level, 1);
  const streakDays = sanitizeGenericNum(input.streakDays, 0);
  const accuracy = sanitizeGenericNum(input.accuracy, 0);

  const dateStr = input.date || new Date().toISOString();

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
