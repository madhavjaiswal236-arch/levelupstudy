import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
 return twMerge(clsx(inputs))
}

export const getXpForLevel = (level: number, totalXpGoal: number = 800000) => {
  if (level <= 1) return 0;
  return Math.floor(totalXpGoal * Math.pow((Math.min(level, 100) - 1) / 99, 2));
};

export const getLevelFromXp = (xp: number, totalXpGoal: number = 800000) => {
  if (xp <= 0) return 1;
  return Math.min(100, Math.floor(Math.pow(xp / totalXpGoal, 0.5) * 99) + 1);
};

export const getLevelProgress = (xp: number, level: number, totalXpGoal: number = 800000) => {
  if (level >= 100) return 100;
  const currentLevelStartXp = getXpForLevel(level, totalXpGoal);
  const nextLevelStartXp = getXpForLevel(level + 1, totalXpGoal);
  const xpInCurrentLevel = Math.max(0, xp - currentLevelStartXp);
  const xpNeededForNextLevel = Math.max(1, nextLevelStartXp - currentLevelStartXp);
  return Math.min(100, Math.max(0, (xpInCurrentLevel / xpNeededForNextLevel) * 100));
};

export const getRankInfo = (level: number) => {
 if (level >= 100) return { rank: 'God Tier', title: 'IIT Legend 🏆', color: 'dark:text-emerald-400 text-emerald-700', bg: 'bg-emerald-500/20', border: 'border-emerald-500/50' };
 if (level >= 91) return { rank: 'S+', title: 'AIR 1 Slayer', color: 'dark:text-green-400 text-green-700', bg: 'bg-green-500/20', border: 'border-green-500/50' };
 if (level >= 71) return { rank: 'S', title: 'IIT Contender', color: 'dark:text-yellow-400 text-yellow-700', bg: 'bg-yellow-500/20', border: 'border-yellow-500/50' };
 if (level >= 51) return { rank: 'A', title: 'Advanced Challenger', color: 'dark:text-red-400 text-red-700', bg: 'bg-red-500/20', border: 'border-red-500/50' };
 if (level >= 36) return { rank: 'B', title: 'Aspirant Warrior', color: 'dark:text-purple-400 text-purple-700', bg: 'bg-purple-500/20', border: 'border-purple-500/50' };
 if (level >= 21) return { rank: 'C', title: 'Problem Solver', color: 'dark:text-blue-400 text-blue-700', bg: 'bg-blue-500/20', border: 'border-blue-500/50' };
 if (level >= 11) return { rank: 'D', title: 'Concept Builder', color: 'dark:text-slate-300 text-slate-600', bg: 'bg-slate-500/20', border: 'border-slate-500/50' };
 return { rank: 'E', title: 'Foundation Starter', color: 'dark:text-amber-400 text-amber-700', bg: 'bg-amber-500/20', border: 'border-amber-500/50' };
};

export const predictNextLecture = (subject: string, chapter: string, todos: any[], history: any[], syllabus: any) => {
  if (!subject || !chapter) return '';

  const stat = syllabus?.[subject]?.find((c: any) => c.name === chapter);

  const pendingLecTasks = todos.filter((t: any) => 
    !t.completed && 
    t.subject === subject && 
    t.chapter === chapter && 
    (t.type === 'Lecture' || t.type === 'Theory') &&
    t.lectureNumber !== undefined
  );

  const completedLecTasks = history.flatMap((h: any) => h.completedTasks || []).filter((t: any) => 
    t.subject === subject && 
    t.chapter === chapter && 
    (t.type === 'Lecture' || t.type === 'Theory') &&
    t.lectureNumber !== undefined
  );

  let maxScheduled = 0;
  if (pendingLecTasks.length > 0) {
    maxScheduled = Math.max(...pendingLecTasks.map((t: any) => Number(t.lectureNumber) || 0));
  }

  let maxCompleted = 0;
  if (completedLecTasks.length > 0) {
    maxCompleted = Math.max(...completedLecTasks.map((t: any) => Number(t.lectureNumber) || 0));
  }

  const syllabusLastLec = stat?.lastLectureNumber || 0;

  return String(Math.max(maxScheduled, maxCompleted, syllabusLastLec) + 1);
};

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffFactor?: number;
  shouldRetry?: (error: any) => boolean;
}

export async function withExponentialBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? 3;
  const initialDelayMs = options.initialDelayMs ?? 500;
  const maxDelayMs = options.maxDelayMs ?? 10000;
  const backoffFactor = options.backoffFactor ?? 2;
  const shouldRetry = options.shouldRetry ?? (() => true);

  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      if (attempt > maxRetries || !shouldRetry(error)) {
        throw error;
      }
      const calculatedDelay = initialDelayMs * Math.pow(backoffFactor, attempt - 1);
      const jitter = Math.random() * 250;
      const delayMs = Math.min(calculatedDelay + jitter, maxDelayMs);

      console.warn(`[Exponential Backoff ${attempt}/${maxRetries}] Operation failed. Retrying in ${Math.round(delayMs)}ms...`, error);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getTaskScheduledDate(task: {
  dateScheduled?: string;
  startTime?: string;
  id?: number | string;
}): string | null {
  if (task.dateScheduled) {
    const trimmed = String(task.dateScheduled).trim();
    const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[1]}-${match[2]}-${match[3]}`;
    return trimmed;
  }
  if (task.startTime) {
    const trimmed = String(task.startTime).trim();
    const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[1]}-${match[2]}-${match[3]}`;
    return trimmed.slice(0, 10);
  }
  if (typeof task.id === "number") {
    const d = new Date(task.id);
    if (!isNaN(d.getTime())) {
      return getLocalDateString(d);
    }
  }
  return null;
}

export function isCurrentDayTask(
  task: {
    id?: number | string;
    completed?: boolean;
    dateScheduled?: string;
    startTime?: string;
    isBacklogTask?: boolean;
    backlogDayIndex?: number;
    completedDate?: string;
    completedAt?: number;
  },
  todayStr?: string
): boolean {
  const currentDay = todayStr || getLocalDateString();
  const taskDate = getTaskScheduledDate(task);

  if (taskDate) {
    if (taskDate === currentDay) return true;
    // An unfinished task from past days rolls over into today's active study plan
    if (taskDate < currentDay && !task.completed) return true;
    // Future date task is strictly excluded from today's plan
    return false;
  }

  // If it's a backlog task with future backlogDayIndex
  if (task.isBacklogTask && typeof task.backlogDayIndex === "number" && task.backlogDayIndex > 1) {
    return false;
  }

  // If completed on this date
  if (task.completedDate === currentDay) {
    return true;
  }

  // If completed on a different date, exclude from today
  if (task.completedDate && task.completedDate !== currentDay) {
    return false;
  }

  // For untracked/undated items:
  // If incomplete, it belongs to today's active tasks
  if (!task.completed) return true;

  // If completed and untracked, check if id was created on this day
  if (typeof task.id === "number") {
    const d = new Date(task.id);
    if (!isNaN(d.getTime())) {
      return getLocalDateString(d) === currentDay;
    }
  }

  return true;
}

export function filterTodayTasks<T extends {
  id?: number | string;
  completed?: boolean;
  isDeleted?: boolean;
  dateScheduled?: string;
  startTime?: string;
  isBacklogTask?: boolean;
  backlogDayIndex?: number;
  completedDate?: string;
  completedAt?: number;
}>(
  tasks: T[],
  todayStr: string = getLocalDateString()
): T[] {
  return tasks.filter((t) => !t.isDeleted && isCurrentDayTask(t, todayStr));
}
