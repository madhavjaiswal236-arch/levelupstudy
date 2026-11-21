import {
  logout,
  saveUserDataToCloud,
  subscribeToCloudUserData,
  loadUserDataFromCloud,
  fetchUserDataDirectlyFromFirestore,
  deleteUserAccountAndCloudData,
  auth,
} from "@/lib/firebase";
import { reconcileState, hasMeaningfulUserData } from "@/lib/sync/reconciliation";
import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { initAuth } from "@/lib/firebase";
import { BacklogPlan } from "@/lib/backlog/types";
export type { BacklogPlan };
import { reconstructPlanFromTodos } from "@/lib/backlog/engine";
import { getLevelFromXp, getLocalDateString, isCurrentDayTask, getLogicalDate, setCachedRolloverTime } from "@/lib/utils";
export { getLogicalDate, setCachedRolloverTime };
import { sanitizeAndHealTodos, getActiveStudyBlock, calculateNextAvailableStudySlot } from "@/lib/studyBlock";
import { deleteCalendarEvent, deleteGoogleTask } from "@/lib/calendar";
import { StudentScheduleProfile, DEFAULT_SCHEDULE_PROFILE } from "@/lib/coach/student-model/profile";
export type { StudentScheduleProfile };
import { Preferences } from "@capacitor/preferences";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";

export interface Chapter {
  name: string;
  tier: string;
  accuracy: number;
  pyq: number;
  confidence: string;
  status: string;
  lectures: number;
  backlog: number;
  mastery: number;
  lastLectureNumber?: number;
}

export interface SyllabusData {
  Physics: Chapter[];
  Chemistry: Chapter[];
  Mathematics: Chapter[];
}

const defaultChapter = (name: string, tier: string): Chapter => ({
  name,
  tier,
  accuracy: 0,
  pyq: 0,
  confidence: "Not Started",
  status: "gray",
  lectures: 0,
  backlog: 0,
  mastery: 0,
});

const initialSyllabusData: SyllabusData = {
  Physics: [
    defaultChapter("Mathematical Tools", "B"),
    defaultChapter("Laws of Motion", "S"),
    defaultChapter("Work, Energy and Power", "S"),
    defaultChapter("System of Particles and Rotational Motion", "S"),
    defaultChapter("Thermodynamics", "S"),
    defaultChapter("Motion in a Straight Line", "A"),
    defaultChapter("Motion in a Plane", "A"),
    defaultChapter("Gravitation", "A"),
    defaultChapter("Mechanical Properties of Fluids", "A"),
    defaultChapter("Kinetic Theory of Gases", "A"),
    defaultChapter("Oscillations", "A"),
    defaultChapter("Waves", "A"),
    defaultChapter("Units and Measurements", "B"),
    defaultChapter("Mechanical Properties of Solids", "B"),
    defaultChapter("Thermal Properties of Matter", "B"),
  ],
  Chemistry: [
    defaultChapter("Structure of Atom", "S"),
    defaultChapter("Chemical Bonding and Molecular Structure", "S"),
    defaultChapter("Thermodynamics", "S"),
    defaultChapter("Equilibrium", "S"),
    defaultChapter("Organic Chemistry: Basic Principles", "S"),
    defaultChapter("Hydrocarbons", "S"),
    defaultChapter("Classification of Elements and Periodicity", "A"),
    defaultChapter("States of Matter (Gases & Liquids)", "A"),
    defaultChapter("Redox Reactions", "A"),
    defaultChapter("Some Basic Concepts of Chemistry", "B"),
    defaultChapter("s-Block Elements", "B"),
    defaultChapter("p-Block Elements (Group 13 & 14)", "B"),
    defaultChapter("Hydrogen", "C"),
    defaultChapter("Environmental Chemistry", "C"),
  ],
  Mathematics: [
    defaultChapter("Basic Mathematics", "B"),
    defaultChapter("Functions", "S"),
    defaultChapter("Trigonometric Functions", "S"),
    defaultChapter("Complex Numbers", "S"),
    defaultChapter("Quadratic Equations", "S"),
    defaultChapter("Sequences and Series", "S"),
    defaultChapter("Straight Lines", "S"),
    defaultChapter("Conic Sections", "S"),
    defaultChapter("Limits and Derivatives", "S"),
    defaultChapter("Permutations and Combinations", "A"),
    defaultChapter("Binomial Theorem", "A"),
    defaultChapter("Introduction to 3D Geometry", "A"),
    defaultChapter("Probability", "A"),
    defaultChapter("Sets and Relations", "B"),
    defaultChapter("Mathematical Induction", "C"),
    defaultChapter("Linear Inequalities", "C"),
    defaultChapter("Statistics", "C"),
  ],
};

export interface Habit {
  id: string;
  name: string;
  completedDays: number[];
  monthKey?: string;
}

export interface LifeMetric {
  day: number;
  sleep: number;
  screenTime: number;
  date?: string;
}

export interface MonthlyGoal {
  id: string;
  text: string;
  completed: boolean;
}

export interface Todo {
  id: number | string;
  text: string;
  completed: boolean;
  xpReward: number;
  type: string;
  priority?: "Low" | "Medium" | "High";
  subject?: string;
  chapter?: string;
  lectureNumber?: number;
  lectureHours?: number;
  homeworkDone?: boolean;
  dppDone?: boolean;
  calendarSynced?: boolean;
  calendarEventId?: string;
  calendarTaskId?: string;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
  isDeleted?: boolean;
  deletedAt?: number;
  backlogPlanId?: string;
  backlogChapterId?: string;
  backlogDayIndex?: number;
  backlogTaskType?: "lecture" | "practice" | "revision" | "test";
  isBacklogTask?: boolean;
  dateScheduled?: string;
  completedDate?: string;
  completedAt?: number;
  updatedAt?: number;
}

export const generateUniqueTaskId = (prefix = "task"): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};

export interface PracticeSession {
  id: string;
  date: string;
  subject: string;
  chapter: string;
  attempted: number;
  correct: number;
  timeSpent: number;
  mistakes: string[];
  errorCounts?: Partial<Record<"KNOWLEDGE_DEFICIT" | "PROCEDURAL_FLAW" | "ATTENTIONAL_SLIP" | "TRANSFER_FAILURE", number>>;
  confidencePre?: number;
  perceivedDifficulty?: 1 | 2 | 3 | 4 | 5;
  questionType?: "MCQ" | "MULTI" | "NUMERIC" | "UNKNOWN";
  difficultyTier?: 1 | 2 | 3;
  timed?: boolean;
}

export interface PlayHistoryEntry {
  date: string;
  hoursStudied: number;
  xpEarned: number;
  completedTasks: Todo[];
  plannedTasks?: Todo[];
  screenTime: number;
  sleepTime: number;
  isMissed?: boolean;
  missedReason?: string;
  aiFeedback?: string;
}

export interface NotificationSettings {
  taskReminders: boolean;
  motivationalAlerts: boolean;
  studyBlockReminders: boolean;
  streakProtectionAlerts: boolean;
  soundEnabled: boolean;
  frequency: "high" | "balanced" | "gentle";
  rolloverTime?: string;
}

interface AppState {
  notificationSettings: NotificationSettings;
  setNotificationSettings: React.Dispatch<
    React.SetStateAction<NotificationSettings>
  >;
  xp: number;
  setXp: React.Dispatch<React.SetStateAction<number>>;
  xpGainedToday: number;
  setXpGainedToday: React.Dispatch<React.SetStateAction<number>>;
  spentXpToday: number;
  setSpentXpToday: React.Dispatch<React.SetStateAction<number>>;
  totalSpentXp: number;
  setTotalSpentXp: React.Dispatch<React.SetStateAction<number>>;
  hoursStudiedToday: number;
  setHoursStudiedToday: React.Dispatch<React.SetStateAction<number>>;
  level: number;
  setLevel: React.Dispatch<React.SetStateAction<number>>;
  questionsSolved: number;
  setQuestionsSolved: React.Dispatch<React.SetStateAction<number>>;
  practiceSessions: PracticeSession[];
  setPracticeSessions: React.Dispatch<React.SetStateAction<PracticeSession[]>>;
  dailyTarget: number;
  setDailyTarget: React.Dispatch<React.SetStateAction<number>>;
  accuracy: number;
  speedScore: number;
  streakDays: number;
  setStreakDays: React.Dispatch<React.SetStateAction<number>>;
  lastStudyDate: string | null;
  setLastStudyDate: React.Dispatch<React.SetStateAction<string | null>>;
  focusBadges: number;
  setFocusBadges: React.Dispatch<React.SetStateAction<number>>;
  syllabus: SyllabusData;
  setSyllabus: React.Dispatch<React.SetStateAction<SyllabusData>>;
  activeBoost: { multiplier: number; expiresAt: number } | null;
  appStartDate: string;
  setAppStartDate: React.Dispatch<React.SetStateAction<string>>;
  class11EndDate: string | null;
  totalXpGoal: number;
  setTotalXpGoal: (val: number) => void;
  setClass11EndDate: (date: string) => void;
  scheduleProfile: StudentScheduleProfile;
  setScheduleProfile: React.Dispatch<React.SetStateAction<StudentScheduleProfile>>;
  isClass11SetupDone: boolean;
  setIsClass11SetupDone: (val: boolean) => void;
  backlogPriorities: Record<string, "Must-Do" | "Review">;
  setBacklogPriorities: React.Dispatch<
    React.SetStateAction<Record<string, "Must-Do" | "Review">>
  >;
  hasSeenReminder: boolean;
  setHasSeenReminder: (val: boolean) => void;
  hasSeenRules: boolean;
  setHasSeenRules: (val: boolean) => void;
  notifyCalendarMutation: () => void;
  todos: Todo[];
  setTodos: React.Dispatch<React.SetStateAction<Todo[]>>;
  backlogPlan: BacklogPlan | null;
  setBacklogPlan: React.Dispatch<React.SetStateAction<BacklogPlan | null>>;
  updateTask: (id: number | string, updates: Partial<Todo>) => void;
  loggedTasksToday: Todo[];
  setLoggedTasksToday: React.Dispatch<React.SetStateAction<Todo[]>>;
  pendingTasks: Todo[];
  setPendingTasks: React.Dispatch<React.SetStateAction<Todo[]>>;
  history: PlayHistoryEntry[];
  setHistory: React.Dispatch<React.SetStateAction<PlayHistoryEntry[]>>;
  playerName: string;
  setPlayerName: (name: string) => void;
  habits: Habit[];
  setHabits: React.Dispatch<React.SetStateAction<Habit[]>>;
  lifeMetrics: LifeMetric[];
  setLifeMetrics: React.Dispatch<React.SetStateAction<LifeMetric[]>>;
  monthlyGoals: MonthlyGoal[];
  setMonthlyGoals: React.Dispatch<React.SetStateAction<MonthlyGoal[]>>;
  isLoaded: boolean;
  needsRollover: boolean;
  setNeedsRollover: (val: boolean, reason?: string) => void;
  lastSyncTimestamp: number;
  setLastSyncTimestamp: React.Dispatch<React.SetStateAction<number>>;
  consistencyBroken: boolean;
  setConsistencyBroken: (val: boolean) => void;
  completeRollover: (sleep: number, screenTime: number, feedback?: string) => void;
  pendingMissedDays: string[];
  setPendingMissedDays: React.Dispatch<React.SetStateAction<string[]>>;
  submitMissedDayReasons: (reasons: { date: string; reason: string }[]) => void;
  lastBossDayDate: string | null;
  setLastBossDayDate: React.Dispatch<React.SetStateAction<string | null>>;
  bossDayTargetXp: number | null;
  setBossDayTargetXp: React.Dispatch<React.SetStateAction<number | null>>;
  bossDayCompleted: boolean;
  setBossDayCompleted: React.Dispatch<React.SetStateAction<boolean>>;
  addXp: (amount: number) => number;
  getStreakMultiplier: () => number;
  logSession: (
    subject: string,
    chapters: string[],
    attempted: number,
    correct: number,
    timeSpent: number,
    mistakes: string[],
    errorCounts?: Partial<Record<"KNOWLEDGE_DEFICIT" | "PROCEDURAL_FLAW" | "ATTENTIONAL_SLIP" | "TRANSFER_FAILURE", number>>,
    confidencePre?: number,
    perceivedDifficulty?: 1 | 2 | 3 | 4 | 5,
    questionType?: "MCQ" | "MULTI" | "NUMERIC" | "UNKNOWN",
    difficultyTier?: 1 | 2 | 3,
    timed?: boolean,
  ) => void;
  logFocusSession: (durationMins: number, isDeepFocus: boolean) => void;
  updateChapterStats: (
    subject: string,
    chapterName: string,
    updates: Partial<Chapter>,
  ) => void;
  resetApp: () => void;
  logoutUser: () => Promise<void>;
  firebaseUser: import("firebase/auth").User | null;
  setFirebaseUser: React.Dispatch<
    React.SetStateAction<import("firebase/auth").User | null>
  >;
  hasToken: boolean;
  setHasToken: React.Dispatch<React.SetStateAction<boolean>>;
  isCloudSyncComplete: boolean;
  equippedTitle: string;
  setEquippedTitle: (title: string) => void;
  equippedAura: string;
  setEquippedAura: (aura: string) => void;
  unlockedItems: string[];
  setUnlockedItems: React.Dispatch<React.SetStateAction<string[]>>;
  ongoingChapters: Record<string, string>;
  setOngoingChapters: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
  getCurrentChapterForSubject: (subj: string) => string | null;
  saveStateToCloudNow: (overrides?: Partial<Record<string, any>>) => Promise<boolean>;
  scheduleBacklogTask: (task: Todo) => Promise<void>;
  notifyCalendarPreviewOpened: () => void;
  notifyCalendarPreviewClosed: () => void;
  forceFetchAndRestoreFromCloud: () => Promise<{
    success: boolean;
    message: string;
    stats?: { xp: number; level: number; tasks: number; historyDays: number };
  }>;
  exportLocalBackup: () => void;
  importLocalBackup: (jsonContent: string) => { success: boolean; message: string };
  showWelcomeHero: boolean;
  setShowWelcomeHero: React.Dispatch<React.SetStateAction<boolean>>;
  triggerWelcomeScreen: () => void;
  dismissWelcomeHero: () => void;
  markReminderSeen: () => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

export const getStandardDateKey = (dateInput?: string | Date | number | null): string => {
  if (!dateInput) return "";
  if (typeof dateInput === "object" && dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return "";
    const y = dateInput.getFullYear();
    const m = String(dateInput.getMonth() + 1).padStart(2, "0");
    const d = String(dateInput.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (typeof dateInput === "number") {
    const dObj = new Date(dateInput);
    if (isNaN(dObj.getTime())) return "";
    const y = dObj.getFullYear();
    const m = String(dObj.getMonth() + 1).padStart(2, "0");
    const d = String(dObj.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const str = String(dateInput).trim();
  if (!str) return "";

  const ymdMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymdMatch) {
    return `${ymdMatch[1]}-${ymdMatch[2]}-${ymdMatch[3]}`;
  }

  const parsed = new Date(str);
  if (isNaN(parsed.getTime())) return str;
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, "0");
  const d = String(parsed.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export const isSameLogicalDay = (
  dateA?: string | Date | number | null,
  dateB?: string | Date | number | null
): boolean => {
  if (!dateA || !dateB) return false;
  const keyA = getStandardDateKey(dateA);
  const keyB = getStandardDateKey(dateB);
  if (keyA && keyB && keyA === keyB) return true;

  const strA = String(dateA).trim();
  const strB = String(dateB).trim();
  if (strA === strB) return true;

  return false;
};

export const hasTodayProtocolRecord = (
  history: PlayHistoryEntry[] = [],
  lifeMetrics: LifeMetric[] = [],
  todayLogicalDate: Date
): boolean => {
  const todayKey = getStandardDateKey(todayLogicalDate);
  if (!todayKey) return false;

  // 1. Explicit rollover completion flag for today
  if (typeof sessionStorage !== "undefined") {
    const sessionCompleted = sessionStorage.getItem(`rollover_completed_${todayKey}`);
    if (sessionCompleted === "true") return true;
  }
  if (typeof localStorage !== "undefined") {
    const localCompleted = localStorage.getItem(`rollover_completed_${todayKey}`);
    if (localCompleted === "true") return true;
  }

  // 2. Check if yesterday's recovery stats have already been recorded in history
  const yesterdayObj = new Date(todayLogicalDate);
  yesterdayObj.setDate(yesterdayObj.getDate() - 1);
  const yesterdayKey = getStandardDateKey(yesterdayObj);

  const yesterdayEntry = history.find((entry) => isSameLogicalDay(entry.date, yesterdayKey));
  if (yesterdayEntry && yesterdayEntry.sleepTime && yesterdayEntry.sleepTime > 0) {
    return true;
  }

  // 3. Check if yesterday's sleep was recorded in lifeMetrics
  const yesterdayMetric = lifeMetrics.find(
    (m) => m.date ? isSameLogicalDay(m.date, yesterdayKey) : false
  );
  if (yesterdayMetric && yesterdayMetric.sleep > 0) {
    return true;
  }

  return false;
};

export const calculateAbsenceGap = (
  lastStudyDateStr: string | null,
  logicalToday: Date
): string[] => {
  if (!lastStudyDateStr) return [];
  const lastDateKey = getStandardDateKey(lastStudyDateStr);
  const todayKey = getStandardDateKey(logicalToday);
  if (!lastDateKey || lastDateKey === todayKey) return [];

  const lastDate = new Date(lastDateKey);
  if (isNaN(lastDate.getTime())) return [];

  // Yesterday is handled exclusively by the Daily Rollover modal.
  // Missed days autopsy only applies to unaccounted absence days PRIOR to yesterday.
  const yesterday = new Date(logicalToday);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = getStandardDateKey(yesterday);

  if (lastDateKey >= yesterdayKey) return [];

  const missingDates: string[] = [];
  const tempDate = new Date(lastDate);
  tempDate.setDate(tempDate.getDate() + 1);

  let safetyCounter = 0;
  while (
    !isNaN(tempDate.getTime()) &&
    getStandardDateKey(tempDate) < yesterdayKey &&
    safetyCounter < 60
  ) {
    missingDates.push(getStandardDateKey(tempDate));
    tempDate.setDate(tempDate.getDate() + 1);
    safetyCounter++;
  }

  return missingDates;
};

const LOCAL_STORAGE_KEY = "jee_tracker_state";

export function reconcilePerDayHistory(
  existingHistory: PlayHistoryEntry[] = [],
  lastStudyDateStr: string | null,
  todayKey: string,
  xpGainedOnLastDate: number = 0,
  hoursStudiedOnLastDate: number = 0,
): { updatedHistory: PlayHistoryEntry[]; isNewDay: boolean } {
  if (!lastStudyDateStr || !todayKey) {
    return { updatedHistory: existingHistory, isNewDay: false };
  }
  const lastKey = getStandardDateKey(lastStudyDateStr);
  if (!lastKey || lastKey >= todayKey) {
    return { updatedHistory: existingHistory, isNewDay: false };
  }

  let updated = [...existingHistory];

  // 1. Archive last active day's progress to lastKey
  const lastDateIndex = updated.findIndex((h) => getStandardDateKey(h.date) === lastKey);
  if (lastDateIndex >= 0) {
    updated[lastDateIndex] = {
      ...updated[lastDateIndex],
      hoursStudied: Math.max(updated[lastDateIndex].hoursStudied || 0, Number((hoursStudiedOnLastDate || 0).toFixed(1))),
      xpEarned: Math.max(updated[lastDateIndex].xpEarned || 0, xpGainedOnLastDate || 0),
    };
  } else {
    const parsedLast = new Date(lastKey);
    if (!isNaN(parsedLast.getTime())) {
      updated.push({
        date: parsedLast.toISOString(),
        hoursStudied: Number((hoursStudiedOnLastDate || 0).toFixed(1)),
        xpEarned: xpGainedOnLastDate || 0,
        completedTasks: [],
        plannedTasks: [],
        sleepTime: 0,
        screenTime: 0,
      });
    }
  }

  // 2. Fill all gap dates between lastKey and todayKey
  const tempDate = new Date(lastKey);
  if (!isNaN(tempDate.getTime())) {
    tempDate.setDate(tempDate.getDate() + 1);
    let safety = 0;
    while (safety < 60 && !isNaN(tempDate.getTime())) {
      const gapKey = getStandardDateKey(tempDate);
      if (!gapKey || gapKey >= todayKey) break;

      if (!updated.some((h) => getStandardDateKey(h.date) === gapKey)) {
        updated.push({
          date: tempDate.toISOString(),
        hoursStudied: 0,
        xpEarned: 0,
        completedTasks: [],
        plannedTasks: [],
        sleepTime: 0,
        screenTime: 0,
        isMissed: true,
        missedReason: "Absent day",
      });
      }
      tempDate.setDate(tempDate.getDate() + 1);
      safety++;
    }
  }

  updated.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return { updatedHistory: updated, isNewDay: true };
}

export const calculate8HourGoalXp = (
  endDateStr: string | null | undefined,
  currentXp: number = 0,
): { goalXp: number; daysRemaining: number; totalHours: number } => {
  let daysRemaining = 300;
  if (endDateStr) {
    const end = new Date(endDateStr).getTime();
    if (!isNaN(end) && end > Date.now()) {
      const diffDays = Math.ceil((end - Date.now()) / (1000 * 3600 * 24));
      daysRemaining = Math.max(1, diffDays);
    }
  }
  const totalHours = daysRemaining * 8;
  const goalXp = Math.round(daysRemaining * 8 * 300 + Math.max(0, currentXp));
  return { goalXp, daysRemaining, totalHours };
};

const BACKUP_STORAGE_KEY = `${LOCAL_STORAGE_KEY}_backup`;
const VAULT_STORAGE_KEY = `${LOCAL_STORAGE_KEY}_vault`;

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  taskReminders: true,
  motivationalAlerts: true,
  studyBlockReminders: true,
  streakProtectionAlerts: true,
  soundEnabled: true,
  frequency: "high",
};

const createDefaultLifeMetrics = (): LifeMetric[] =>
  Array.from({ length: 31 }, (_, i) => ({
    day: i + 1,
    sleep: 0,
    screenTime: 0,
  }));

function safeParseLocalKey(key: string): any | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function readBestLocalSnapshot(): any | null {
  const candidates = [
    safeParseLocalKey(LOCAL_STORAGE_KEY),
    safeParseLocalKey(BACKUP_STORAGE_KEY),
    safeParseLocalKey(VAULT_STORAGE_KEY),
  ].filter(Boolean);

  if (candidates.length === 0) return null;

  // Prefer the first snapshot that contains actual user data so an accidental empty primary key
  // automatically self-heals from _backup or _vault.
  const best = candidates.find((c) => hasMeaningfulUserData(c)) || candidates[0];

  if (!best.backlogPlan && typeof window !== "undefined") {
    try {
      const backupPlanStr = localStorage.getItem("jee_tracker_backlog_plan");
      if (backupPlanStr) {
        best.backlogPlan = JSON.parse(backupPlanStr);
      }
    } catch {}
  }

  return best;
}

function hasExistingLocalUserDataOnDisk(): boolean {
  const keys = [LOCAL_STORAGE_KEY, BACKUP_STORAGE_KEY, VAULT_STORAGE_KEY];
  for (const key of keys) {
    const parsed = safeParseLocalKey(key);
    if (parsed && hasMeaningfulUserData(parsed)) {
      return true;
    }
  }
  return false;
}

let idleBackupHandle: any = null;
function scheduleIdleBackupWrite(jsonString: string, updateVault: boolean) {
  if (typeof window === "undefined" || !window.localStorage) return;
  const writeBackups = () => {
    idleBackupHandle = null;
    try {
      localStorage.setItem(BACKUP_STORAGE_KEY, jsonString);
      if (updateVault) {
        localStorage.setItem(VAULT_STORAGE_KEY, jsonString);
      }
    } catch {}
  };

  if (idleBackupHandle !== null) {
    if (typeof (window as any).cancelIdleCallback === "function") {
      (window as any).cancelIdleCallback(idleBackupHandle);
    } else {
      clearTimeout(idleBackupHandle);
    }
    idleBackupHandle = null;
  }

  if (typeof (window as any).requestIdleCallback === "function") {
    idleBackupHandle = (window as any).requestIdleCallback(writeBackups, { timeout: 1500 });
  } else {
    idleBackupHandle = setTimeout(writeBackups, 0);
  }
}

function safePersistLocalState(
  stateObj: any,
  preSerializedJson?: string,
  options?: { forceAllowEmpty?: boolean; immediateBackup?: boolean }
): string | null {
  const meaningful = hasMeaningfulUserData(stateObj);
  if (!meaningful && !options?.forceAllowEmpty && !Capacitor.isNativePlatform()) {
    if (hasExistingLocalUserDataOnDisk()) {
      console.warn(
        "[Local-First Guard] Blocked empty state from overwriting existing local user data."
      );
      return null;
    }
  }

  const jsonString = preSerializedJson || JSON.stringify(stateObj);

  if (Capacitor.isNativePlatform()) {
    Preferences.set({ key: LOCAL_STORAGE_KEY, value: jsonString }).catch(() => {});
  } else if (typeof window !== "undefined" && window.localStorage) {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, jsonString);
      if (options?.immediateBackup) {
        localStorage.setItem(BACKUP_STORAGE_KEY, jsonString);
        if (meaningful) {
          localStorage.setItem(VAULT_STORAGE_KEY, jsonString);
        }
      } else {
        scheduleIdleBackupWrite(jsonString, meaningful);
      }
    } catch (e) {
      console.warn("[Local-First Guard] localStorage write warning:", e);
    }
  }

  return jsonString;
}

function normalizeParsedLocalState(parsed: any) {
  const today = getLogicalDate();
  const todayKey = getStandardDateKey(today);
  const savedStorageDate =
    typeof window !== "undefined" ? localStorage.getItem("levelup_app_start_date") : null;
  const loadedAppStartDate = parsed.appStartDate || savedStorageDate || todayKey;
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem("levelup_app_start_date", loadedAppStartDate);
    }
  } catch {}

  const effectiveLastStudyDate =
    parsed.lastStudyDate ||
    (parsed.history && parsed.history.length > 0
      ? getStandardDateKey(parsed.history[parsed.history.length - 1].date)
      : null);
  const isToday = isSameLogicalDay(effectiveLastStudyDate, today);
  const protocolRecordExists = hasTodayProtocolRecord(
    parsed.history || [],
    parsed.lifeMetrics || [],
    today
  );

  let loadedHistory = Array.isArray(parsed.history) ? parsed.history : [];
  let loadedXpToday = parsed.xpGainedToday || 0;
  let loadedHoursToday = parsed.hoursStudiedToday || 0;
  let loadedStreak = parsed.streakDays || 0;

  if (effectiveLastStudyDate && effectiveLastStudyDate < todayKey) {
    const { updatedHistory } = reconcilePerDayHistory(
      loadedHistory,
      effectiveLastStudyDate,
      todayKey,
      loadedXpToday,
      loadedHoursToday
    );
    loadedHistory = updatedHistory;
    loadedXpToday = 0;
    loadedHoursToday = 0;
    loadedStreak = 0;
  }

  let initialNeedsRollover = false;
  let initialPendingMissedDays: string[] = [];
  if (isToday || protocolRecordExists) {
    initialNeedsRollover = false;
  } else if (effectiveLastStudyDate) {
    initialNeedsRollover = true;
    const missingDates = calculateAbsenceGap(effectiveLastStudyDate, today);
    if (missingDates.length > 0) {
      initialPendingMissedDays = missingDates;
    }
  }

  const loadedSyllabus = parsed.syllabus || initialSyllabusData;
  const mergedSyllabus: SyllabusData = { ...initialSyllabusData };
  (["Physics", "Chemistry", "Mathematics"] as const).forEach((subject) => {
    if (loadedSyllabus[subject]) {
      const subjectChapters = [...loadedSyllabus[subject]];
      initialSyllabusData[subject].forEach((defaultCap) => {
        if (!subjectChapters.some((c: any) => c.name === defaultCap.name)) {
          subjectChapters.push(defaultCap);
        }
      });
      mergedSyllabus[subject] = subjectChapters;
    }
  });

  const loadedEndDate = parsed.class11EndDate || null;
  const calc8Hr = calculate8HourGoalXp(loadedEndDate, parsed.xp || 0);

  let loadedBacklogPlan: BacklogPlan | null = parsed.backlogPlan || null;
  if (!loadedBacklogPlan && typeof window !== "undefined") {
    try {
      const backupPlanStr = localStorage.getItem("jee_tracker_backlog_plan");
      if (backupPlanStr) {
        loadedBacklogPlan = JSON.parse(backupPlanStr);
      }
    } catch {}
  }

  const rawTodos = sanitizeAndHealTodos<Todo>(parsed.todos || []);
  const dedupedTodos = Array.from(
    new Map(rawTodos.map((t: Todo) => [t.id, t])).values()
  ) as Todo[];

  if (!loadedBacklogPlan && dedupedTodos.length > 0) {
    loadedBacklogPlan = reconstructPlanFromTodos(dedupedTodos);
  }

  const rawLoggedTasks = sanitizeAndHealTodos<Todo>(parsed.loggedTasksToday || []);
  const dedupedLoggedTasks = Array.from(
    new Map(rawLoggedTasks.map((t: Todo) => [t.id, t])).values()
  ) as Todo[];

  const rawPendingTasks = sanitizeAndHealTodos<Todo>(parsed.pendingTasks || []);
  const dedupedPendingTasks = Array.from(
    new Map(rawPendingTasks.map((t: Todo) => [t.id, t])).values()
  ) as Todo[];

  let loadMetrics: LifeMetric[] = parsed.lifeMetrics;
  if (!loadMetrics || loadMetrics.length < 31) {
    loadMetrics = Array.from({ length: 31 }, (_, i) => {
      const ext = (parsed.lifeMetrics || []).find((m: any) => m.day === i + 1);
      return ext || { day: i + 1, sleep: 0, screenTime: 0 };
    });
  }

  let loadedScheduleProfile: StudentScheduleProfile = DEFAULT_SCHEDULE_PROFILE;
  if (parsed.scheduleProfile) {
    loadedScheduleProfile = parsed.scheduleProfile;
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "LEVELUP_SCHEDULE_PROFILE",
          JSON.stringify(parsed.scheduleProfile)
        );
      }
    } catch {}
  } else {
    try {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("LEVELUP_SCHEDULE_PROFILE");
        if (saved) loadedScheduleProfile = JSON.parse(saved);
      }
    } catch {}
  }

  if (parsed.extendedSettings) {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "app_settings_extended",
          JSON.stringify(parsed.extendedSettings)
        );
      }
    } catch {}
  }

  return {
    appStartDate: loadedAppStartDate,
    xp: parsed.xp || 0,
    xpGainedToday: loadedXpToday,
    spentXpToday: parsed.spentXpToday || 0,
    totalSpentXp: parsed.totalSpentXp || 0,
    hoursStudiedToday: loadedHoursToday,
    level: parsed.level || 1,
    questionsSolved: parsed.questionsSolved || 0,
    dailyTarget: parsed.dailyTarget || 100,
    accuracy: parsed.accuracy || 0,
    speedScore: parsed.speedScore || 0,
    streakDays: loadedStreak,
    lastStudyDate: todayKey,
    focusBadges: parsed.focusBadges || 0,
    syllabus: mergedSyllabus,
    activeBoost: parsed.activeBoost || null,
    class11EndDate: loadedEndDate,
    totalXpGoal: parsed.totalXpGoal || calc8Hr.goalXp,
    isClass11SetupDone: loadedEndDate ? parsed.isClass11SetupDone || false : false,
    scheduleProfile: loadedScheduleProfile,
    backlogPriorities: parsed.backlogPriorities || {},
    backlogPlan: loadedBacklogPlan,
    hasSeenRules: parsed.hasSeenRules || false,
    todos: dedupedTodos,
    loggedTasksToday: dedupedLoggedTasks,
    pendingTasks: dedupedPendingTasks,
    history: loadedHistory,
    practiceSessions: parsed.practiceSessions || [],
    playerName: parsed.playerName || "Player 1",
    habits: parsed.habits || [],
    lifeMetrics: loadMetrics,
    monthlyGoals: parsed.monthlyGoals || [],
    lastBossDayDate: parsed.lastBossDayDate || null,
    bossDayTargetXp: parsed.bossDayTargetXp || null,
    bossDayCompleted: parsed.bossDayCompleted || false,
    equippedTitle: parsed.equippedTitle || "",
    equippedAura: parsed.equippedAura || "",
    unlockedItems: parsed.unlockedItems || [],
    ongoingChapters: parsed.ongoingChapters || {},
    notificationSettings: parsed.notificationSettings || DEFAULT_NOTIFICATION_SETTINGS,
    lastSyncTimestamp: parsed.lastSyncTimestamp || 0,
    needsRollover: initialNeedsRollover,
    pendingMissedDays: initialPendingMissedDays,
  };
}

function buildInitialBootstrap() {
  const isNative = Capacitor.isNativePlatform();
  const defaultAppStart = (() => {
    try {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("levelup_app_start_date");
        if (saved) return saved;
      }
    } catch {}
    return getStandardDateKey(getLogicalDate());
  })();

  const defaultScheduleProfile = (() => {
    try {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("LEVELUP_SCHEDULE_PROFILE");
        if (saved) return JSON.parse(saved);
      }
    } catch {}
    return DEFAULT_SCHEDULE_PROFILE;
  })();

  if (!isNative && typeof window !== "undefined") {
    const bestLocal = readBestLocalSnapshot();
    if (bestLocal) {
      const normalized = normalizeParsedLocalState(bestLocal);
      // Immediately seed vault if primary/backup had meaningful data and vault didn't exist yet
      if (hasMeaningfulUserData(bestLocal)) {
        try {
          if (!localStorage.getItem(VAULT_STORAGE_KEY)) {
            localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(bestLocal));
          }
        } catch {}
      }
      return {
        isLoadedImmediately: true,
        hadSavedData: true,
        state: normalized,
      };
    }
  }

  return {
    isLoadedImmediately: !isNative,
    hadSavedData: false,
    state: {
      appStartDate: defaultAppStart,
      xp: 0,
      xpGainedToday: 0,
      spentXpToday: 0,
      totalSpentXp: 0,
      hoursStudiedToday: 0,
      level: 1,
      questionsSolved: 0,
      dailyTarget: 100,
      accuracy: 0,
      speedScore: 0,
      streakDays: 0,
      lastStudyDate: null as string | null,
      focusBadges: 0,
      syllabus: initialSyllabusData,
      activeBoost: null as { multiplier: number; expiresAt: number } | null,
      class11EndDate: null as string | null,
      totalXpGoal: 800000,
      isClass11SetupDone: false,
      scheduleProfile: defaultScheduleProfile as StudentScheduleProfile,
      backlogPriorities: {} as Record<string, "Must-Do" | "Review">,
      backlogPlan: null as BacklogPlan | null,
      hasSeenRules: false,
      todos: [] as Todo[],
      loggedTasksToday: [] as Todo[],
      pendingTasks: [] as Todo[],
      history: [] as PlayHistoryEntry[],
      practiceSessions: [] as PracticeSession[],
      playerName: "Player 1",
      habits: [] as Habit[],
      lifeMetrics: createDefaultLifeMetrics(),
      monthlyGoals: [] as MonthlyGoal[],
      lastBossDayDate: null as string | null,
      bossDayTargetXp: null as number | null,
      bossDayCompleted: false,
      equippedTitle: "",
      equippedAura: "",
      unlockedItems: [] as string[],
      ongoingChapters: {} as Record<string, string>,
      notificationSettings: DEFAULT_NOTIFICATION_SETTINGS,
      lastSyncTimestamp: 0,
      needsRollover: false,
      pendingMissedDays: [] as string[],
    },
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const bootstrapRef = useRef<ReturnType<typeof buildInitialBootstrap> | null>(null);
  if (bootstrapRef.current === null) {
    bootstrapRef.current = buildInitialBootstrap();
  }
  const boot = bootstrapRef.current;

  const [isLoaded, setIsLoaded] = useState<boolean>(boot.isLoadedImmediately);
  const [needsRolloverState, setNeedsRolloverState] = useState<boolean>(boot.state.needsRollover);
  const [lastSyncTimestamp, setLastSyncTimestampState] = useState<number>(boot.state.lastSyncTimestamp);
  const lastSyncTimestampRef = useRef<number>(boot.state.lastSyncTimestamp);

  const setLastSyncTimestamp = useCallback((val: number | ((prev: number) => number)) => {
    setLastSyncTimestampState((prev) => {
      const nextVal = typeof val === "function" ? val(prev) : val;
      lastSyncTimestampRef.current = nextVal;
      return nextVal;
    });
  }, []);

  const setNeedsRollover = useCallback((val: boolean, reason?: string) => {
    const today = getLogicalDate();
    const todayKey = getStandardDateKey(today);
    console.log(
      `[Rollover Guard] setNeedsRollover(${val}) | Reason: ${reason || "Unspecified"} | lastStudyDate: "${lastStudyDateRef.current}" | Today: "${today.toDateString()}" (Key: ${todayKey})`
    );
    setNeedsRolloverState(val);
  }, []);

  const [consistencyBroken, setConsistencyBroken] = useState(false);
  const saveStateToCloudNowRef = useRef<any>(null);
  const [xp, setXp] = useState<number>(boot.state.xp);
  const [xpGainedToday, setXpGainedToday] = useState<number>(boot.state.xpGainedToday);
  const [spentXpToday, setSpentXpToday] = useState<number>(boot.state.spentXpToday);
  const [totalSpentXp, setTotalSpentXp] = useState<number>(boot.state.totalSpentXp);
  const [hoursStudiedToday, setHoursStudiedToday] = useState<number>(boot.state.hoursStudiedToday);
  const [level, setLevel] = useState<number>(boot.state.level);
  const [questionsSolved, setQuestionsSolved] = useState<number>(boot.state.questionsSolved);
  const [dailyTarget, setDailyTarget] = useState<number>(boot.state.dailyTarget);
  const [accuracy, setAccuracy] = useState<number>(boot.state.accuracy);
  const [speedScore, setSpeedScore] = useState<number>(boot.state.speedScore);

  const [streakDays, setStreakDays] = useState<number>(boot.state.streakDays);
  const [lastStudyDate, setLastStudyDateState] = useState<string | null>(boot.state.lastStudyDate);
  const lastStudyDateRef = useRef<string | null>(boot.state.lastStudyDate);
  const setLastStudyDate = (val) => {
    setLastStudyDateState(val);
    lastStudyDateRef.current =
      typeof val === "function" ? val(lastStudyDateRef.current) : val;
  };
  const [focusBadges, setFocusBadges] = useState<number>(boot.state.focusBadges);
  const [syllabus, setSyllabus] = useState<SyllabusData>(boot.state.syllabus);
  const [appStartDate, setAppStartDateState] = useState<string>(boot.state.appStartDate);

  const setAppStartDate = useCallback((val: string | ((prev: string) => string)) => {
    setAppStartDateState((prev) => {
      const nextVal = typeof val === "function" ? val(prev) : val;
      const key = getStandardDateKey(nextVal) || nextVal;
      try {
        if (typeof window !== "undefined") {
          localStorage.setItem("levelup_app_start_date", key);
          const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (raw) {
            try {
              const p = JSON.parse(raw);
              p.appStartDate = key;
              safePersistLocalState(p);
            } catch (err) {}
          }
        }
      } catch (e) {}
      queueMicrotask(() => {
        saveStateToCloudNowRef.current?.({ appStartDate: key });
      });
      return key;
    });
  }, []);
  const [activeBoost, setActiveBoost] = useState<{
    multiplier: number;
    expiresAt: number;
  } | null>(boot.state.activeBoost);
  const [class11EndDate, setClass11EndDate] = useState<string | null>(boot.state.class11EndDate);
  const [totalXpGoal, setTotalXpGoal] = useState<number>(boot.state.totalXpGoal);
  const [isClass11SetupDone, setIsClass11SetupDone] = useState<boolean>(boot.state.isClass11SetupDone);
  const [scheduleProfile, setScheduleProfile] = useState<StudentScheduleProfile>(boot.state.scheduleProfile);

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("LEVELUP_SCHEDULE_PROFILE", JSON.stringify(scheduleProfile));
      }
    } catch (e) {}
  }, [scheduleProfile]);
  const [backlogPriorities, setBacklogPriorities] = useState<
    Record<string, "Must-Do" | "Review">
  >(boot.state.backlogPriorities);
  const [hasSeenReminder, setHasSeenReminder] = useState<boolean>(() => {
    try {
      if (typeof window !== "undefined") {
        if (sessionStorage.getItem("has_seen_countdown_reminder_session") === "true") {
          return true;
        }
        const todayKey = getStandardDateKey(getLogicalDate());
        if (localStorage.getItem("has_seen_countdown_reminder_date") === todayKey) {
          return true;
        }
      }
    } catch (e) {}
    return false;
  });

  const markReminderSeen = useCallback(() => {
    setHasSeenReminder(true);
    try {
      if (typeof window !== "undefined") {
        const todayKey = getStandardDateKey(getLogicalDate());
        sessionStorage.setItem("has_seen_countdown_reminder_session", "true");
        localStorage.setItem("has_seen_countdown_reminder_date", todayKey);
      }
    } catch (e) {}
  }, []);
  const [hasSeenRules, setHasSeenRules] = useState<boolean>(boot.state.hasSeenRules);
  const [todos, setTodos] = useState<Todo[]>(boot.state.todos);
  const [backlogPlan, setBacklogPlan] = useState<BacklogPlan | null>(boot.state.backlogPlan);
  const [loggedTasksToday, setLoggedTasksToday] = useState<Todo[]>(boot.state.loggedTasksToday);
  const [pendingTasks, setPendingTasks] = useState<Todo[]>(boot.state.pendingTasks);
  const [history, setHistory] = useState<PlayHistoryEntry[]>(boot.state.history);
  const [practiceSessions, setPracticeSessions] = useState<PracticeSession[]>(
    boot.state.practiceSessions,
  );
  const [pendingMissedDays, setPendingMissedDays] = useState<string[]>(boot.state.pendingMissedDays);

  const [playerName, setPlayerName] = useState<string>(boot.state.playerName);
  const [habits, setHabits] = useState<Habit[]>(boot.state.habits);
  const [lifeMetrics, setLifeMetrics] = useState<LifeMetric[]>(boot.state.lifeMetrics);
  const [monthlyGoals, setMonthlyGoals] = useState<MonthlyGoal[]>(boot.state.monthlyGoals);
  const [lastBossDayDate, setLastBossDayDate] = useState<string | null>(boot.state.lastBossDayDate);
  const [bossDayTargetXp, setBossDayTargetXp] = useState<number | null>(boot.state.bossDayTargetXp);
  const [bossDayCompleted, setBossDayCompleted] = useState<boolean>(boot.state.bossDayCompleted);
  const [pendingBossDayBonus, setPendingBossDayBonus] =
    useState<boolean>(false);
  const [equippedTitle, setEquippedTitle] = useState<string>(boot.state.equippedTitle);
  const [equippedAura, setEquippedAura] = useState<string>(boot.state.equippedAura);
  const [unlockedItems, setUnlockedItems] = useState<string[]>(boot.state.unlockedItems);
  const [ongoingChapters, setOngoingChapters] = useState<Record<string, string>>(boot.state.ongoingChapters);
  const isCalendarPreviewOpenRef = useRef(false);
  const calendarSyncTimerRef = useRef<any>(null);

  const [showWelcomeHero, setShowWelcomeHero] = useState<boolean>(() => {
    try {
      if (typeof window === "undefined" || !window.localStorage) return false;
      const dismissedForever = localStorage.getItem("welcome_hero_dismissed_forever");
      if (dismissedForever === "true") return false;

      if (hasMeaningfulUserData(boot.state)) {
        return false;
      }

      const lastWelcomeDate = localStorage.getItem("levelup_last_welcome_hero_date");
      return !lastWelcomeDate;
    } catch {
      return false;
    }
  });

  const dismissWelcomeHero = useCallback(() => {
    try {
      const todayKey = getStandardDateKey(getLogicalDate());
      localStorage.setItem("levelup_last_welcome_hero_date", todayKey);
      localStorage.setItem("welcome_hero_dismissed_forever", "true");
    } catch (e) {
      console.warn("Could not save welcome hero date to localStorage", e);
    }
    setShowWelcomeHero(false);
  }, []);

  const triggerWelcomeScreen = useCallback(() => {
    setShowWelcomeHero(true);
  }, []);

  const notifyCalendarPreviewOpened = useCallback(() => {
    isCalendarPreviewOpenRef.current = true;
    if (calendarSyncTimerRef.current) {
      clearTimeout(calendarSyncTimerRef.current);
      calendarSyncTimerRef.current = null;
    }
  }, []);
  const [notificationSettings, setNotificationSettings] =
    useState<NotificationSettings>(boot.state.notificationSettings);
  const [firebaseUser, setFirebaseUser] = useState<
    import("firebase/auth").User | null
  >(null);
  const [hasToken, setHasToken] = useState<boolean>(false);
  const [isCloudSyncComplete, setIsCloudSyncComplete] = useState<boolean>(false);
  const lastSavedCloudJsonRef = useRef<string>("");
  const lastSavedLocalJsonRef = useRef<string>("");
  const isRemoteSyncingRef = useRef<boolean>(false);
  const lastLocalMutationTimeRef = useRef<number>(0);
  const lastCalendarMutationTimeRef = useRef<number>(0);
  const hasUnsavedLocalChangesRef = useRef<boolean>(false);
  const latestStateRef = useRef<any>(boot.state);
  const pendingRolloverSaveRef = useRef<boolean>(false);

  // Keep latestStateRef synchronously current on every render BEFORE any useEffect runs
  // (prevents race where syncCloudOnLogin read an empty {} ref before an effect updated it).
  latestStateRef.current = {
    appStartDate,
    xp,
    xpGainedToday,
    spentXpToday,
    totalSpentXp,
    hoursStudiedToday,
    level,
    questionsSolved,
    dailyTarget,
    accuracy,
    speedScore,
    streakDays,
    lastStudyDate,
    focusBadges,
    syllabus,
    activeBoost,
    class11EndDate,
    isClass11SetupDone,
    backlogPriorities,
    backlogPlan,
    todos,
    loggedTasksToday,
    pendingTasks,
    history,
    practiceSessions,
    playerName,
    hasSeenRules,
    habits,
    lifeMetrics,
    monthlyGoals,
    lastBossDayDate,
    bossDayTargetXp,
    bossDayCompleted,
    equippedTitle,
    equippedAura,
    unlockedItems,
    notificationSettings,
    totalXpGoal,
    ongoingChapters,
    scheduleProfile,
    lastSyncTimestamp: lastSyncTimestampRef.current,
  };

  // Helper: always guarantees local disk/vault fallback if in-memory state looks blank
  const getReliableLocalState = useCallback(() => {
    const inMemory = latestStateRef.current || {};
    if (hasMeaningfulUserData(inMemory)) {
      return inMemory;
    }
    const diskBest = readBestLocalSnapshot();
    if (diskBest && hasMeaningfulUserData(diskBest)) {
      return { ...inMemory, ...diskBest };
    }
    return inMemory;
  }, []);

  const remoteSyncResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const beginRemoteSyncApply = useCallback(() => {
    isRemoteSyncingRef.current = true;
    if (remoteSyncResetTimerRef.current) clearTimeout(remoteSyncResetTimerRef.current);
    remoteSyncResetTimerRef.current = setTimeout(() => {
      isRemoteSyncingRef.current = false;
      remoteSyncResetTimerRef.current = null;
    }, 80);
  }, []);

  const applyStateSnapshot = useCallback((mergedState: any) => {
    if (!mergedState || typeof mergedState !== "object") return;
    if (mergedState.xp !== undefined) setXp(mergedState.xp);
    if (mergedState.xpGainedToday !== undefined) setXpGainedToday(mergedState.xpGainedToday);
    if (mergedState.spentXpToday !== undefined) setSpentXpToday(mergedState.spentXpToday);
    if (mergedState.totalSpentXp !== undefined) setTotalSpentXp(mergedState.totalSpentXp);
    if (mergedState.hoursStudiedToday !== undefined) setHoursStudiedToday(mergedState.hoursStudiedToday);
    if (mergedState.level !== undefined) setLevel(mergedState.level);
    if (mergedState.questionsSolved !== undefined) setQuestionsSolved(mergedState.questionsSolved);
    if (mergedState.streakDays !== undefined) setStreakDays(mergedState.streakDays);
    if (mergedState.dailyTarget !== undefined) setDailyTarget(mergedState.dailyTarget);
    if (mergedState.accuracy !== undefined) setAccuracy(mergedState.accuracy);
    if (mergedState.speedScore !== undefined) setSpeedScore(mergedState.speedScore);
    if (mergedState.lastStudyDate !== undefined) setLastStudyDate(mergedState.lastStudyDate);
    if (mergedState.focusBadges !== undefined) setFocusBadges(mergedState.focusBadges);
    if (mergedState.syllabus !== undefined) setSyllabus(mergedState.syllabus);
    if (mergedState.activeBoost !== undefined) setActiveBoost(mergedState.activeBoost);
    if (mergedState.appStartDate !== undefined && mergedState.appStartDate) setAppStartDate(mergedState.appStartDate);
    if (mergedState.class11EndDate !== undefined) setClass11EndDate(mergedState.class11EndDate);
    if (mergedState.isClass11SetupDone !== undefined) setIsClass11SetupDone(mergedState.isClass11SetupDone);
    if (mergedState.backlogPriorities !== undefined) setBacklogPriorities(mergedState.backlogPriorities);
    if (mergedState.backlogPlan !== undefined) {
      // Never overwrite an active local backlog plan with a null/empty remote value
      if (mergedState.backlogPlan || !(latestStateRef.current?.backlogPlan?.subjects?.length > 0)) {
        setBacklogPlan(mergedState.backlogPlan);
      }
      if (mergedState.backlogPlan && typeof window !== "undefined") {
        try {
          localStorage.setItem("jee_tracker_backlog_plan", JSON.stringify(mergedState.backlogPlan));
        } catch (e) {}
      }
    } else {
      try {
        const backupPlanStr = typeof window !== "undefined" ? localStorage.getItem("jee_tracker_backlog_plan") : null;
        if (backupPlanStr) {
          const parsedPlan = JSON.parse(backupPlanStr);
          setBacklogPlan(parsedPlan);
          mergedState.backlogPlan = parsedPlan;
        } else if (mergedState.todos && mergedState.todos.length > 0) {
          const recPlan = reconstructPlanFromTodos(mergedState.todos);
          if (recPlan) {
            setBacklogPlan(recPlan);
            mergedState.backlogPlan = recPlan;
          }
        }
      } catch (e) {}
    }
    if (mergedState.todos !== undefined) setTodos(sanitizeAndHealTodos(mergedState.todos));
    if (mergedState.loggedTasksToday !== undefined) setLoggedTasksToday(sanitizeAndHealTodos(mergedState.loggedTasksToday));
    if (mergedState.pendingTasks !== undefined) setPendingTasks(sanitizeAndHealTodos(mergedState.pendingTasks));
    if (mergedState.history !== undefined) {
      const cleanHistory = Array.isArray(mergedState.history)
        ? mergedState.history
            .filter((h: any) => h && h.date)
            .map((h: any) => {
              if (typeof h.date === "object" && typeof h.date.seconds === "number") {
                return { ...h, date: new Date(h.date.seconds * 1000).toISOString() };
              }
              return h;
            })
            .filter((h: any) => !isNaN(new Date(h.date).getTime()))
        : [];
      setHistory(cleanHistory);
    }
    if (mergedState.practiceSessions !== undefined) setPracticeSessions(mergedState.practiceSessions);
    if (mergedState.playerName !== undefined) setPlayerName(mergedState.playerName);
    if (mergedState.hasSeenRules !== undefined) setHasSeenRules(mergedState.hasSeenRules);
    if (mergedState.habits !== undefined) setHabits(mergedState.habits);
    if (mergedState.lifeMetrics !== undefined) setLifeMetrics(mergedState.lifeMetrics);
    if (mergedState.monthlyGoals !== undefined) setMonthlyGoals(mergedState.monthlyGoals);
    if (mergedState.lastBossDayDate !== undefined) setLastBossDayDate(mergedState.lastBossDayDate);
    if (mergedState.bossDayTargetXp !== undefined) setBossDayTargetXp(mergedState.bossDayTargetXp);
    if (mergedState.bossDayCompleted !== undefined) setBossDayCompleted(mergedState.bossDayCompleted);
    if (mergedState.equippedTitle !== undefined) setEquippedTitle(mergedState.equippedTitle);
    if (mergedState.equippedAura !== undefined) setEquippedAura(mergedState.equippedAura);
    if (mergedState.unlockedItems !== undefined) setUnlockedItems(mergedState.unlockedItems);
    if (mergedState.notificationSettings !== undefined) setNotificationSettings(mergedState.notificationSettings);
    if (mergedState.totalXpGoal !== undefined) setTotalXpGoal(mergedState.totalXpGoal);
    if (mergedState.ongoingChapters !== undefined) setOngoingChapters(mergedState.ongoingChapters);
    if (mergedState.scheduleProfile !== undefined && mergedState.scheduleProfile) {
      setScheduleProfile(mergedState.scheduleProfile);
      try {
        if (typeof window !== "undefined") {
          localStorage.setItem("LEVELUP_SCHEDULE_PROFILE", JSON.stringify(mergedState.scheduleProfile));
        }
      } catch (e) {}
    }
    if (mergedState.extendedSettings !== undefined && mergedState.extendedSettings) {
      try {
        if (typeof window !== "undefined") {
          localStorage.setItem("app_settings_extended", JSON.stringify(mergedState.extendedSettings));
        }
      } catch (e) {}
    }
  }, []);

  const notifyCalendarMutation = useCallback(() => {
    lastCalendarMutationTimeRef.current = Date.now();
    lastLocalMutationTimeRef.current = Date.now();
  }, []);

  useEffect(() => {
    const unsubscribe = initAuth((user, token) => {
      setFirebaseUser(user);
      setHasToken(!!token);
      if (!user) {
        setIsCloudSyncComplete(true);
      }
    });
    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, []);

  // Load state on mount ONLY for native Capacitor Preferences (web already hydrated synchronously on frame 1)
  const isStorageCorruptedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    let unmounted = false;
    const safetyTimeout = setTimeout(() => {
      if (!unmounted) {
        setIsLoaded(true);
      }
    }, 3000);

    const loadNativeState = async () => {
      try {
        const { value: saved } = await Preferences.get({ key: LOCAL_STORAGE_KEY });
        if (saved && !unmounted) {
          try {
            const parsed = JSON.parse(saved);
            const norm = normalizeParsedLocalState(parsed);
            beginRemoteSyncApply();
            applyStateSnapshot(norm);
            setNeedsRolloverState(norm.needsRollover);
            if (norm.pendingMissedDays.length > 0) {
              setPendingMissedDays(norm.pendingMissedDays);
            }
          } catch (e) {
            console.error("Failed to parse native storage", e);
            isStorageCorruptedRef.current = true;
          }
        }
      } catch (err) {
        console.error("Error in loadNativeState:", err);
      } finally {
        if (!unmounted) {
          clearTimeout(safetyTimeout);
          setIsLoaded(true);
        }
      }
    };
    loadNativeState();
    return () => {
      unmounted = true;
      clearTimeout(safetyTimeout);
    };
  }, [applyStateSnapshot]);

  // Save state on change (debounced, deduplicated, and protected against empty overwrites)
  useEffect(() => {
    if (!isLoaded || isStorageCorruptedRef.current) return;

    const now = Date.now();
    const cameFromRemote = isRemoteSyncingRef.current;
    if (cameFromRemote) {
      // Change came from cloud/storage sync, do not flag as local mutation or trigger write-back loop
      isRemoteSyncingRef.current = false;
      if (remoteSyncResetTimerRef.current) {
        clearTimeout(remoteSyncResetTimerRef.current);
        remoteSyncResetTimerRef.current = null;
      }
    } else {
      hasUnsavedLocalChangesRef.current = true;
      lastLocalMutationTimeRef.current = now;
      lastSyncTimestampRef.current = now;
    }

    const saveTimeoutId = setTimeout(() => {
      const stateToSave = {
        ...latestStateRef.current,
        extendedSettings: (() => {
          try {
            const es = typeof localStorage !== "undefined" ? localStorage.getItem("app_settings_extended") : null;
            return es ? JSON.parse(es) : null;
          } catch {
            return null;
          }
        })(),
        lastSyncTimestamp: lastSyncTimestampRef.current || now,
      };

      const jsonString = JSON.stringify(stateToSave);

      // Skip redundant disk writes when serialized snapshot hasn't changed
      if (jsonString !== lastSavedLocalJsonRef.current) {
        const persisted = safePersistLocalState(stateToSave, jsonString);
        if (persisted) {
          lastSavedLocalJsonRef.current = persisted;
        }
      }

      // Only push to cloud on genuine local mutations (and never push empty state over an account)
      if (!cameFromRemote && firebaseUser?.uid && isCloudSyncComplete) {
        if (jsonString !== lastSavedCloudJsonRef.current && hasMeaningfulUserData(stateToSave)) {
          hasUnsavedLocalChangesRef.current = true;
          saveUserDataToCloud(firebaseUser.uid, stateToSave, false).then((ok) => {
            if (ok) {
              lastSavedCloudJsonRef.current = jsonString;
              hasUnsavedLocalChangesRef.current = false;
            }
          });
        } else {
          hasUnsavedLocalChangesRef.current = false;
        }
      }
    }, 400);

    return () => {
      clearTimeout(saveTimeoutId);
    };
  }, [
    isLoaded,
    isCloudSyncComplete,
    firebaseUser,
    xp,
    xpGainedToday,
    spentXpToday,
    totalSpentXp,
    hoursStudiedToday,
    level,
    questionsSolved,
    dailyTarget,
    accuracy,
    speedScore,
    streakDays,
    lastStudyDate,
    focusBadges,
    syllabus,
    activeBoost,
    class11EndDate,
    isClass11SetupDone,
    backlogPriorities,
    backlogPlan,
    todos,
    loggedTasksToday,
    pendingTasks,
    history,
    practiceSessions,
    playerName,
    hasSeenRules,
    habits,
    lifeMetrics,
    monthlyGoals,
    lastBossDayDate,
    bossDayTargetXp,
    bossDayCompleted,
    equippedTitle,
    equippedAura,
    unlockedItems,
    notificationSettings,
    totalXpGoal,
    ongoingChapters,
    scheduleProfile,
    appStartDate,
  ]);

  // Dedicated single-instance listener for page unload, visibility hidden and mobile pause
  useEffect(() => {
    const flushCurrentState = () => {
      if (!isLoaded || isRemoteSyncingRef.current) return;
      const stateToSave = latestStateRef.current;
      if (!stateToSave || Object.keys(stateToSave).length === 0) return;
      const currentJson = JSON.stringify(stateToSave);
      if (currentJson !== lastSavedLocalJsonRef.current) {
        const persisted = safePersistLocalState(stateToSave, currentJson, { immediateBackup: true });
        if (persisted) {
          lastSavedLocalJsonRef.current = persisted;
        }
      }
      if (
        firebaseUser?.uid &&
        isCloudSyncComplete &&
        hasMeaningfulUserData(stateToSave) &&
        (hasUnsavedLocalChangesRef.current || currentJson !== lastSavedCloudJsonRef.current)
      ) {
        saveUserDataToCloud(firebaseUser.uid, stateToSave, true).then((ok) => {
          if (ok) {
            lastSavedCloudJsonRef.current = currentJson;
            hasUnsavedLocalChangesRef.current = false;
          }
        });
      }
    };

    let lastFocusCheckTime = 0;
    const pullLatestCloudState = async () => {
      if (!firebaseUser?.uid || !isCloudSyncComplete || isRemoteSyncingRef.current) return;
      const now = Date.now();
      // Real-time onSnapshot listener already syncs live changes; throttle focus fallback to 60s
      if (now - lastFocusCheckTime < 60000) return;
      lastFocusCheckTime = now;
      try {
        const cloudData = await loadUserDataFromCloud(firebaseUser.uid);
        if (!cloudData || (cloudData as any).__docExists === false) return;
        const currentLocal = getReliableLocalState();
        // Local-first guard: never let empty cloud data wipe local progress
        if (!hasMeaningfulUserData(cloudData) && hasMeaningfulUserData(currentLocal)) {
          return;
        }
        const { mergedState, needsCloudUpload } = reconcileState(currentLocal, cloudData);
        const mergedJson = JSON.stringify(mergedState);
        if (mergedJson !== lastSavedLocalJsonRef.current) {
          beginRemoteSyncApply();
          applyStateSnapshot(mergedState);
          const persisted = safePersistLocalState(mergedState, mergedJson);
          if (persisted) lastSavedLocalJsonRef.current = persisted;
        }
        lastSavedCloudJsonRef.current = mergedJson;
        if (needsCloudUpload && firebaseUser?.uid && hasMeaningfulUserData(mergedState)) {
          saveUserDataToCloud(firebaseUser.uid, mergedState, true).catch(() => {});
        }
      } catch (err) {
        console.warn("[Firestore] Auto-sync on focus/resume (local preserved):", err);
      }
    };

    const handleBeforeUnload = () => {
      flushCurrentState();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushCurrentState();
      } else if (document.visibilityState === "visible") {
        pullLatestCloudState();
      }
    };

    const handleWindowFocus = () => {
      pullLatestCloudState();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    let isMounted = true;
    let capAppStateListener: any = null;
    if (Capacitor.isNativePlatform()) {
      CapApp.addListener("appStateChange", (state) => {
        if (!state.isActive) {
          flushCurrentState();
        } else {
          pullLatestCloudState();
          const today = getLogicalDate();
          const todayKey = getStandardDateKey(today);
          if (lastStudyDateRef.current && lastStudyDateRef.current !== todayKey) {
            setNeedsRollover(true, "App resumed across logical day boundary");
          }
        }
      }).then((listener) => {
        if (isMounted) {
          capAppStateListener = listener;
        } else {
          listener.remove();
        }
      }).catch((err) => {
        console.warn("Failed to attach Capacitor appStateChange listener:", err);
      });
    }

    return () => {
      isMounted = false;
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (capAppStateListener) {
        capAppStateListener.remove();
      }
    };
  }, [isLoaded, firebaseUser, isCloudSyncComplete, applyStateSnapshot, getReliableLocalState]);

  // Initial Cloud Data Fetch on Auth with strict local-first preservation
  useEffect(() => {
    if (!firebaseUser?.uid) {
      setIsCloudSyncComplete(true);
      return;
    }

    if (!isLoaded) {
      return;
    }

    setIsCloudSyncComplete(false);
    let cancelled = false;

    const syncCloudOnLogin = async () => {
      const timeoutId = setTimeout(() => {
        if (!cancelled) {
          setIsCloudSyncComplete(true);
        }
      }, 2500);

      try {
        const cloudData = await loadUserDataFromCloud(firebaseUser.uid);
        clearTimeout(timeoutId);
        if (cancelled) return;

        // Cloud network error or offline: ALWAYS keep local data intact as last resort
        if (!cloudData) {
          setIsCloudSyncComplete(true);
          return;
        }

        const currentLocal = getReliableLocalState();
        const localHasData = hasMeaningfulUserData(currentLocal);
        const cloudHasData =
          (cloudData as any).__docExists !== false && hasMeaningfulUserData(cloudData);

        if ((cloudData as any).__docExists === false || (!cloudHasData && localHasData)) {
          // Cloud is missing/empty while local has data: NEVER wipe local, heal cloud from local!
          if (localHasData && firebaseUser?.uid) {
            const persisted = safePersistLocalState(currentLocal, undefined, { immediateBackup: true });
            await saveUserDataToCloud(firebaseUser.uid, currentLocal, true);
            if (persisted) {
              lastSavedCloudJsonRef.current = persisted;
              lastSavedLocalJsonRef.current = persisted;
            }
          }
          setIsCloudSyncComplete(true);
          return;
        }

        // NON-REVERTING SMART RECONCILIATION (local-first protected)
        const { mergedState, needsCloudUpload } = reconcileState(currentLocal, cloudData);
        const mergedJson = JSON.stringify(mergedState);

        beginRemoteSyncApply();
        applyStateSnapshot(mergedState);
        const persisted = safePersistLocalState(mergedState, mergedJson, { immediateBackup: true });
        if (persisted) {
          lastSavedLocalJsonRef.current = persisted;
        }

        if (mergedState.lastSyncTimestamp) {
          setLastSyncTimestamp(mergedState.lastSyncTimestamp);
          lastSyncTimestampRef.current = mergedState.lastSyncTimestamp;
        }

        lastSavedCloudJsonRef.current = mergedJson;
        hasUnsavedLocalChangesRef.current = false;
        lastLocalMutationTimeRef.current = 0;

        if (needsCloudUpload && firebaseUser?.uid && hasMeaningfulUserData(mergedState)) {
          await saveUserDataToCloud(firebaseUser.uid, mergedState, true);
        }

        // Evaluate day boundary and absence gaps on reconciled state
        const logicalToday = getLogicalDate();
        const effectiveLastDate =
          mergedState.lastStudyDate ||
          (mergedState.history && mergedState.history.length > 0
            ? getStandardDateKey(mergedState.history[mergedState.history.length - 1].date)
            : null);
        const isToday = isSameLogicalDay(effectiveLastDate, logicalToday);
        const protocolRecordExists = hasTodayProtocolRecord(
          mergedState.history || [],
          mergedState.lifeMetrics || [],
          logicalToday
        );

        if (isToday || protocolRecordExists) {
          setNeedsRollover(false, "Cloud sync: today is completed or matches lastStudyDate");
          setLastStudyDate(getStandardDateKey(logicalToday));
        } else if (effectiveLastDate) {
          setNeedsRollover(true, "Cloud sync: lastStudyDate is from a previous day");
          const gaps = calculateAbsenceGap(effectiveLastDate, logicalToday);
          if (gaps.length > 0) {
            setPendingMissedDays(gaps);
          }
        }

        setIsCloudSyncComplete(true);
      } catch (err) {
        // On any cloud error, local data remains 100% intact
        console.error("Cloud login sync error (local data preserved):", err);
        setIsCloudSyncComplete(true);
      }
    };

    syncCloudOnLogin();

    return () => {
      cancelled = true;
    };
  }, [firebaseUser, isLoaded, applyStateSnapshot, getReliableLocalState]);

  // Real-Time Cloud Listener for multi-device sync with write-loop suppression
  useEffect(() => {
    if (!firebaseUser?.uid || !isCloudSyncComplete) {
      return;
    }

    const unsubscribe = subscribeToCloudUserData(firebaseUser.uid, (cloudData, metadata) => {
      if (metadata?.hasPendingWrites) {
        return;
      }

      if (!cloudData || (cloudData as any).__docExists === false) {
        return;
      }

      const currentLocal = getReliableLocalState();
      // Never allow an empty/cleared cloud snapshot to delete meaningful local data
      if (!hasMeaningfulUserData(cloudData) && hasMeaningfulUserData(currentLocal)) {
        return;
      }

      const remoteJson = JSON.stringify(cloudData);
      if (remoteJson === lastSavedCloudJsonRef.current) {
        return;
      }

      const { mergedState, needsCloudUpload } = reconcileState(currentLocal, cloudData);
      const mergedJson = JSON.stringify(mergedState);

      if (mergedJson !== lastSavedLocalJsonRef.current) {
        beginRemoteSyncApply();
        applyStateSnapshot(mergedState);
        const persisted = safePersistLocalState(mergedState, mergedJson);
        if (persisted) lastSavedLocalJsonRef.current = persisted;
      }

      lastSavedCloudJsonRef.current = remoteJson;

      if (mergedState.lastSyncTimestamp) {
        setLastSyncTimestamp(mergedState.lastSyncTimestamp);
        lastSyncTimestampRef.current = mergedState.lastSyncTimestamp;
      }

      if (needsCloudUpload && firebaseUser?.uid && hasMeaningfulUserData(mergedState)) {
        saveUserDataToCloud(firebaseUser.uid, mergedState, true).catch(() => {});
      }
    });

    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, [firebaseUser?.uid, isCloudSyncComplete, applyStateSnapshot, getReliableLocalState]);

  // Handle Cross-Tab Synchronization
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === LOCAL_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          // Protect against another tab pushing empty state over meaningful local data
          if (!hasMeaningfulUserData(parsed) && hasMeaningfulUserData(latestStateRef.current)) {
            return;
          }
          beginRemoteSyncApply();
          lastSavedLocalJsonRef.current = e.newValue;
          applyStateSnapshot(parsed);
        } catch (err) {
          console.error("Storage event parse error", err);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [applyStateSnapshot]);

  // Flush rollover commit immediately when requested
  useEffect(() => {
    if (!pendingRolloverSaveRef.current) return;
    pendingRolloverSaveRef.current = false;
    const todayKey = getStandardDateKey(getLogicalDate());
    const now = Date.now();
    const stateToSave = {
      ...latestStateRef.current,
      lastStudyDate: todayKey,
      lastSyncTimestamp: now,
      lastRolloverTimestamp: now,
      xpGainedToday: 0,
      spentXpToday: 0,
      hoursStudiedToday: 0,
      questionsSolved: 0,
      loggedTasksToday: [],
    };
    latestStateRef.current = stateToSave;
    const jsonString = JSON.stringify(stateToSave);
    const persisted = safePersistLocalState(stateToSave, jsonString, { immediateBackup: true });
    if (persisted) {
      lastSavedLocalJsonRef.current = persisted;
    }
    if (firebaseUser?.uid && isCloudSyncComplete && hasMeaningfulUserData(stateToSave)) {
      lastSavedCloudJsonRef.current = jsonString;
      saveUserDataToCloud(firebaseUser.uid, stateToSave, true).then((ok) => {
        if (ok) {
          hasUnsavedLocalChangesRef.current = false;
        }
      });
    }
  }, [lastStudyDate, history, todos, firebaseUser, isCloudSyncComplete]);

  // Dedicated immediate backup sync for backlogPlan
  useEffect(() => {
    if (!isLoaded) return;
    if (typeof window !== "undefined") {
      try {
        if (backlogPlan) {
          localStorage.setItem("jee_tracker_backlog_plan", JSON.stringify(backlogPlan));
        }
      } catch (e) {
        console.warn("Failed to update backlog plan backup:", e);
      }
    }
  }, [backlogPlan, isLoaded]);

  const saveStateToCloudNow = useCallback(
    async (overrides?: Partial<Record<string, any>>): Promise<boolean> => {
      if (!isLoaded) return false;
      const now = Date.now();
      lastSyncTimestampRef.current = now;
      const stateToSave = {
        ...latestStateRef.current,
        lastSyncTimestamp: now,
        ...overrides,
      };
      latestStateRef.current = stateToSave;
      const jsonString = JSON.stringify(stateToSave);
      const persisted = safePersistLocalState(stateToSave, jsonString);
      if (persisted) {
        lastSavedLocalJsonRef.current = persisted;
      }

      if (firebaseUser?.uid && isCloudSyncComplete && hasMeaningfulUserData(stateToSave)) {
        lastSavedCloudJsonRef.current = jsonString;
        const ok = await saveUserDataToCloud(firebaseUser.uid, stateToSave, true);
        if (ok) {
          hasUnsavedLocalChangesRef.current = false;
        }
        return ok;
      }
      return true;
    },
    [isLoaded, isCloudSyncComplete, firebaseUser],
  );
  saveStateToCloudNowRef.current = saveStateToCloudNow;

  const updateTask = useCallback((id: number | string, updates: Partial<Todo>) => {
    let updatedTodosList: Todo[] = [];
    setTodos((prev) => {
      updatedTodosList = prev.map((t) => {
        if (String(t.id) === String(id)) {
          const enriched = { ...t, ...updates, updatedAt: Date.now() };
          if (updates.completed === true && !t.completed) {
            enriched.completedAt = Date.now();
            enriched.completedDate = getLocalDateString();
          } else if (updates.completed === false) {
            enriched.completedAt = undefined;
            enriched.completedDate = undefined;
          }
          return enriched;
        }
        return t;
      });
      return updatedTodosList;
    });

    // Dispatch a custom broadcast event so independent components (like Calendar Preview) can re-sync if needed
    window.dispatchEvent(
      new CustomEvent("task-updated", {
        detail: { id, updates, updatedTodos: updatedTodosList },
      }),
    );

    if (updates.isDeleted === true) {
      const targetTask = latestStateRef.current.todos.find((t) => String(t.id) === String(id));
      if (targetTask?.calendarEventId && !targetTask.calendarEventId.startsWith("local-")) {
        deleteCalendarEvent(targetTask.calendarEventId).catch((err) =>
          console.warn("Failed to delete Google Calendar event on task deletion:", err),
        );
      }
      if (targetTask?.calendarTaskId) {
        deleteGoogleTask(targetTask.calendarTaskId).catch((err) =>
          console.warn("Failed to delete Google Task on task deletion:", err),
        );
      }
    }

    if (updates.completed !== undefined || updates.isDeleted !== undefined) {
      queueMicrotask(() => {
        saveStateToCloudNow({ todos: updatedTodosList });
      });
    }

    // Synchronize backlog lecture completion with Syllabus Tracker (BUG-06)
    if (updates.completed === true) {
      const targetTask = updatedTodosList.find((t) => String(t.id) === String(id));
      if (
        targetTask &&
        targetTask.isBacklogTask &&
        (targetTask.backlogTaskType === 'lecture' || targetTask.type?.toLowerCase() === 'lecture') &&
        targetTask.subject &&
        targetTask.chapter
      ) {
        const subjectKey = targetTask.subject as keyof SyllabusData;
        setSyllabus((prevSyllabus) => {
          const subList = prevSyllabus[subjectKey];
          if (!subList) return prevSyllabus;

          const chapIndex = subList.findIndex(
            (c) =>
              c.name.toLowerCase() === targetTask.chapter!.toLowerCase() ||
              c.name.toLowerCase().includes(targetTask.chapter!.toLowerCase()) ||
              targetTask.chapter!.toLowerCase().includes(c.name.toLowerCase())
          );

          if (chapIndex === -1) return prevSyllabus;

          const oldChap = subList[chapIndex];
          const newLastLec = Math.max(oldChap.lastLectureNumber || 0, targetTask.lectureNumber || 1);
          const newLecCount = Math.max(oldChap.lectures || 0, newLastLec);

          const updatedSubject = [...subList];
          updatedSubject[chapIndex] = {
            ...oldChap,
            lastLectureNumber: newLastLec,
            lectures: newLecCount,
          };

          const nextSyllabus = { ...prevSyllabus, [subjectKey]: updatedSubject };
          queueMicrotask(() => {
            saveStateToCloudNow({ syllabus: nextSyllabus });
          });
          return nextSyllabus;
        });
      }
    }
  }, [saveStateToCloudNow]);

  // Check and update streak on load or when logging session
  const updateStreak = useCallback((overrideSleep?: number, overrideScreen?: number) => {
    const todayObj = getLogicalDate();
    const today = getStandardDateKey(todayObj);

    if (isSameLogicalDay(lastStudyDateRef.current, todayObj)) {
      // Already recorded for today. Do NOT re-increment streak or inflate daily target.
      if (overrideSleep !== undefined || overrideScreen !== undefined) {
        const yesterdayObj = getLogicalDate();
        yesterdayObj.setDate(yesterdayObj.getDate() - 1);
        const yesterdayDateKey = getStandardDateKey(yesterdayObj);
        setLifeMetrics((prev) => {
          const dayNum = yesterdayObj.getDate();
          return prev.map((m) =>
            (m.day === dayNum || m.date === yesterdayDateKey)
              ? { ...m, sleep: overrideSleep ?? m.sleep, screenTime: overrideScreen ?? m.screenTime, date: yesterdayDateKey }
              : m,
          );
        });
      }
      return;
    }

    const state = latestStateRef.current;
    if (lastStudyDateRef.current) {
      const lastDate = new Date(lastStudyDateRef.current);
      const yesterday = getLogicalDate();
      yesterday.setDate(yesterday.getDate() - 1);

      let newStreak = state.streakDays || 0;
      if (isSameLogicalDay(lastStudyDateRef.current, yesterday)) {
        let currentTarget = state.dailyTarget || 100;
        if (state.class11EndDate) {
          const class11EndTimestamp = new Date(state.class11EndDate).getTime();
          const daysUntilExam = Math.max(
            1,
            Math.ceil((class11EndTimestamp - Date.now()) / (1000 * 3600 * 24)),
          );
          const totalXpRequired = Math.max(0, (state.totalXpGoal || 800000) - (state.xp || 0));
          currentTarget = Math.max(
            100,
            Math.ceil(totalXpRequired / daysUntilExam),
          );
        }

        const minimumRequiredXp = Math.floor(currentTarget * 0.4);
        const curTodos: Todo[] = state.todos || [];
        const curLoggedTasks: Todo[] = state.loggedTasksToday || [];
        const curXpGainedToday: number = state.xpGainedToday || 0;

        const meetsThreshold =
          curXpGainedToday >= minimumRequiredXp ||
          curTodos.filter((t) => t.completed).length >= 2 ||
          (curLoggedTasks.length >= 1 &&
            curXpGainedToday >= minimumRequiredXp / 2);

        if (!meetsThreshold) {
          if (newStreak > 1) {
            setConsistencyBroken(true);
          }
          newStreak = 1;
        } else {
          newStreak = newStreak + 1;
          // Strategic persistence: If 5-7 days consistent and met goals
          if (newStreak >= 5) {
            // Increase daily target linearly to prevent infinite scaling inflation
            setDailyTarget((prev) => Math.min(2000, prev + 50));
          }
        }
        setStreakDays(newStreak);
      } else {
        // Also, if the streak broke, drop the dailyTarget slightly to keep it fair for returning users
        setDailyTarget((prev) => Math.max(100, Math.floor(prev * 0.8)));

        if (newStreak > 1) {
          setConsistencyBroken(true);
        }
        setStreakDays(1); // Streak broken
      }

      // -- NEW DAILY ROLLOVER LOGIC --
      const rolloverDateStr = lastDate ? getLocalDateString(lastDate) : "";
      const lastDayTodos = (state.todos || []).filter(
        (t: Todo) => !t.isDeleted && isCurrentDayTask(t, rolloverDateStr),
      );
      const completedTasks = lastDayTodos.filter((t: Todo) => t.completed);
      const uncompletedTasks = lastDayTodos.filter((t: Todo) => !t.completed);
      const curXpGainedToday = state.xpGainedToday || 0;

      // Update life metrics if overrides provided
      if (overrideSleep !== undefined || overrideScreen !== undefined) {
        setLifeMetrics((prev) => {
          const dayNum = new Date(lastStudyDateRef.current || "").getDate();
          return prev.map((m) =>
            m.day === dayNum
              ? {
                  ...m,
                  sleep: overrideSleep ?? m.sleep,
                  screenTime: overrideScreen ?? m.screenTime,
                }
              : m,
          );
        });
      }

      // Always move to history on rollover so sleep and screen time are saved.
      setHistory((prevHistory) => {
        let updatedHistory = [...prevHistory];

        // 1. Log or merge the actual last active date
        const existingLastDateIndex = updatedHistory.findIndex(
          (h) => new Date(h.date).toDateString() === lastDate.toDateString(),
        );

        const isLastDateYesterday =
          lastDate.toDateString() === yesterday.toDateString();
        let lifeM = (state.lifeMetrics || []).find((m: LifeMetric) => m.day === lastDate.getDate());
        if (!lifeM)
          lifeM = { day: lastDate.getDate(), sleep: 0, screenTime: 0 };

        const sleepUsed =
          isLastDateYesterday && overrideSleep !== undefined
            ? overrideSleep
            : lifeM.sleep;
        const screenUsed =
          isLastDateYesterday && overrideScreen !== undefined
            ? overrideScreen
            : lifeM.screenTime;

        const tasksToLog = [...completedTasks, ...(state.loggedTasksToday || [])];
        const plannedToLog = [...lastDayTodos, ...(state.loggedTasksToday || [])];

        if (existingLastDateIndex === -1) {
          updatedHistory.push({
            date: lastDate.toISOString(),
            hoursStudied: Number((state.hoursStudiedToday || 0).toFixed(1)),
            xpEarned: curXpGainedToday,
            completedTasks: tasksToLog,
            plannedTasks: plannedToLog,
            sleepTime: sleepUsed,
            screenTime: screenUsed,
          });
        } else {
          // Merge completedTasks and plannedTasks into existing entry without dropping them
          const existing = updatedHistory[existingLastDateIndex];
          const mergedCompleted = Array.from(
            new Map(
              [...(existing.completedTasks || []), ...tasksToLog].map((t: Todo) => [
                String(t.id || t.text),
                t,
              ]),
            ).values(),
          );
          const mergedPlanned = Array.from(
            new Map(
              [...(existing.plannedTasks || []), ...plannedToLog].map((t: Todo) => [
                String(t.id || t.text),
                t,
              ]),
            ).values(),
          );

          updatedHistory[existingLastDateIndex] = {
            ...existing,
            hoursStudied: Math.max(
              existing.hoursStudied || 0,
              Number((state.hoursStudiedToday || 0).toFixed(1)),
            ),
            xpEarned: Math.max(existing.xpEarned || 0, curXpGainedToday),
            completedTasks: mergedCompleted,
            plannedTasks: mergedPlanned,
            sleepTime: (sleepUsed > 0 ? sleepUsed : existing.sleepTime) || 0,
            screenTime: (screenUsed > 0 ? screenUsed : existing.screenTime) || 0,
          };
        }

        // 2. Fill in gaps up to yesterday if the lastDate was before yesterday
        let currDate = new Date(lastDate);
        if (!isNaN(currDate.getTime())) {
          currDate.setDate(currDate.getDate() + 1);

          let safetyCounter = 0;
          const logicalToday = getLogicalDate();
          const logicalTodayStr = logicalToday.toDateString();
          while (
            !isNaN(currDate.getTime()) &&
            currDate.toDateString() !== logicalTodayStr &&
            currDate < logicalToday &&
            safetyCounter < 60
          ) {
            if (
              !updatedHistory.some(
                (h) =>
                  new Date(h.date).toDateString() === currDate.toDateString(),
              )
            ) {
              const isYesterday =
                currDate.toDateString() === yesterday.toDateString();

              const sleepUsed =
                isYesterday && overrideSleep !== undefined ? overrideSleep : 0;
              const screenUsed =
                isYesterday && overrideScreen !== undefined ? overrideScreen : 0;

              const missedReason = "Unaccounted absence";

              updatedHistory.push({
                date: currDate.toISOString(),
                hoursStudied: 0,
                xpEarned: 0,
                completedTasks: [],
                plannedTasks: [],
                sleepTime: sleepUsed,
                screenTime: screenUsed,
                isMissed: true,
                missedReason: missedReason,
              });
            }
            currDate.setDate(currDate.getDate() + 1);
            safetyCounter++;
          }
        }

        return updatedHistory;
      });

      // Move uncompleted to pending
      const lastDateStr = lastDate ? lastDate.toDateString() : "";
      const backlogCandidates = uncompletedTasks.filter((t: Todo) => {
        if (!t.startTime) return true; // Unscheduled tasks go to backlog
        const taskDayStr = new Date(t.startTime).toDateString();
        return taskDayStr === lastDateStr; // Only tasks scheduled for the rolled-over day go to backlog
      });

      if (backlogCandidates.length > 0) {
        setPendingTasks((prev) => {
          const existingIds = new Set(prev.map((p) => String(p.id)));
          const newPendings = backlogCandidates.filter(
            (u) => !existingIds.has(String(u.id)),
          );
          return [...prev, ...newPendings];
        });
      }

      setLoggedTasksToday([]);
      // Keep tasks scheduled on other days, clear only those on the rolled-over day (or unscheduled ones)
      setTodos((prev) =>
        prev.filter((t) => {
          if (!t.startTime) return false;
          const taskDayStr = new Date(t.startTime).toDateString();
          return taskDayStr !== lastDateStr;
        }),
      );
      // -- END ROLLOVER LOGIC --
    } else {
      setStreakDays(1); // First day
    }
    setLastStudyDate(today);
    hasUnsavedLocalChangesRef.current = true;
    lastLocalMutationTimeRef.current = Date.now();
    setHasSeenReminder(false);
    setXpGainedToday(0); // Reset daily XP on a new day
    setSpentXpToday(0); // Reset daily spent XP
    setHoursStudiedToday(0); // Reset daily hours
    setQuestionsSolved(0); // Reset daily questions tracker

    // Evaluate Boss Day logic
    if (state.lastBossDayDate !== today) {
      const now = new Date(today).getTime();
      const last7DaysEntries = (state.history || []).filter((h: PlayHistoryEntry) => {
        const daysDiff =
          (now - new Date(h.date).getTime()) / (1000 * 3600 * 24);
        return daysDiff <= 7 && daysDiff > 0;
      });

      const productiveDays = last7DaysEntries.filter(
        (h: PlayHistoryEntry) => h.hoursStudied >= 1.5 || h.xpEarned > 300,
      ).length;
      const weeklyXp = last7DaysEntries.reduce((acc: number, h: PlayHistoryEntry) => acc + h.xpEarned, 0);
      const zeroProgressDays = last7DaysEntries.filter(
        (h: PlayHistoryEntry) => h.xpEarned === 0,
      ).length;
      const missingDays = 7 - last7DaysEntries.length;
      const hasNoZeroProgressDays = zeroProgressDays + missingDays === 0;

      // Consistency requirement: at least 4 productive days AND decent XP, OR perfectly consistent log without zero days
      const isConsistent =
        (productiveDays >= 4 && weeklyXp >= 2000) ||
        (hasNoZeroProgressDays && last7DaysEntries.length === 7);

      // Trigger on 7-day milestones, but ONLY if consistent
      if (isConsistent && (state.streakDays || 0) > 0 && (state.streakDays || 0) % 7 === 0) {
        setLastBossDayDate(today);
        setBossDayCompleted(false);
        const avgXpLast7 =
          last7DaysEntries.length > 0
            ? weeklyXp / last7DaysEntries.length
            : 1000;
        const newTargetXp = Math.max(
          1500,
          (state.dailyTarget || 100) + 500,
          Math.floor(avgXpLast7 + 800),
        );
        setBossDayTargetXp(newTargetXp);
      }
    }
  }, []);

  const completeRollover = useCallback((sleepInput: number, screenTimeInput: number, feedback?: string) => {
    updateStreak(sleepInput, screenTimeInput);

    const yesterdayObj = getLogicalDate();
    yesterdayObj.setDate(yesterdayObj.getDate() - 1);
    const yesterdayStr = yesterdayObj.toDateString();
    const yesterdayDateKey = getStandardDateKey(yesterdayObj);

    setLifeMetrics((prev) => {
      const dayNum = yesterdayObj.getDate();
      const exists = prev.some((m) => m.day === dayNum || (m.date && m.date === yesterdayDateKey));
      if (exists) {
        return prev.map((m) =>
          (m.day === dayNum || m.date === yesterdayDateKey)
            ? { ...m, sleep: sleepInput, screenTime: screenTimeInput, date: yesterdayDateKey }
            : m,
        );
      }
      return [...prev, { day: dayNum, sleep: sleepInput, screenTime: screenTimeInput, date: yesterdayDateKey }];
    });

    setHistory((prevHistory) => {
      let updated = [...prevHistory];
      const idx = updated.findIndex(
        (h) => isSameLogicalDay(h.date, yesterdayDateKey) || new Date(h.date).toDateString() === yesterdayStr,
      );
      if (idx >= 0) {
        updated[idx] = {
          ...updated[idx],
          sleepTime: sleepInput,
          screenTime: screenTimeInput,
          aiFeedback: feedback || updated[idx].aiFeedback || undefined,
        };
      } else {
        const state = latestStateRef.current;
        const yesterdayDateStr = getLocalDateString(yesterdayObj);
        const dayTodos = (state.todos || []).filter(
          (t: Todo) => !t.isDeleted && isCurrentDayTask(t, yesterdayDateStr),
        );
        const completedTasks = dayTodos.filter((t: Todo) => t.completed);
        updated.push({
          date: yesterdayObj.toISOString(),
          hoursStudied: Number((state.hoursStudiedToday || 0).toFixed(1)),
          xpEarned: state.xpGainedToday || 0,
          completedTasks: [...completedTasks, ...(state.loggedTasksToday || [])],
          plannedTasks: [...dayTodos, ...(state.loggedTasksToday || [])],
          sleepTime: sleepInput,
          screenTime: screenTimeInput,
          aiFeedback: feedback,
        });
      }
      return updated;
    });

    const todayKey = getStandardDateKey(getLogicalDate());
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(`rollover_completed_${todayKey}`, "true");
    }
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(`rollover_completed_${todayKey}`, "true");
    }
    const now = Date.now();
    setLastSyncTimestamp(now);
    hasUnsavedLocalChangesRef.current = true;
    lastLocalMutationTimeRef.current = now;
    pendingRolloverSaveRef.current = true;
  }, [updateStreak]);

  const getStreakMultiplier = useCallback(() => {
    const curStreak = latestStateRef.current.streakDays ?? streakDays;
    if (curStreak >= 14) return 1.5;
    if (curStreak >= 7) return 1.2;
    if (curStreak >= 3) return 1.1;
    return 1.0;
  }, [streakDays]);

  const addXp = useCallback((amount: number): number => {
    hasUnsavedLocalChangesRef.current = true;
    lastLocalMutationTimeRef.current = Date.now();
    lastCalendarMutationTimeRef.current = 0;
    updateStreak();
    let finalAmount = amount * getStreakMultiplier();

    const state = latestStateRef.current;
    // Apply active boost if valid
    if (state.activeBoost && state.activeBoost.expiresAt > Date.now()) {
      finalAmount *= state.activeBoost.multiplier;
    } else if (state.activeBoost && state.activeBoost.expiresAt <= Date.now()) {
      setActiveBoost(null); // Clear expired boost
    }

    const roundedFinal = Math.round(finalAmount);

    const currentXp = state.xp ?? xp;
    const goal = state.totalXpGoal || totalXpGoal;
    const calculatedNewXp = currentXp + roundedFinal;
    const calculatedNewLevel = getLevelFromXp(calculatedNewXp, goal);

    setXp(calculatedNewXp);
    if (calculatedNewLevel !== (state.level ?? level)) {
      setLevel(calculatedNewLevel);
    }

    setXpGainedToday((prev) => {
      const newXpGained = prev + roundedFinal;
      // Check boss day completion
      if (
        state.lastBossDayDate === getLogicalDate().toDateString() &&
        state.bossDayTargetXp &&
        !state.bossDayCompleted &&
        newXpGained >= state.bossDayTargetXp
      ) {
        setPendingBossDayBonus(true);
      }
      return newXpGained;
    });

    queueMicrotask(() => {
      saveStateToCloudNow({ xp: calculatedNewXp, level: calculatedNewLevel });
    });

    return roundedFinal;
  }, [updateStreak, getStreakMultiplier, totalXpGoal, xp, level, saveStateToCloudNow]);

  const updateChapterStats = useCallback((
    subject: string,
    chapterName: string,
    updates: Partial<Chapter>,
  ) => {
    setSyllabus((prev) => {
      const subjectData = prev[subject as keyof SyllabusData];
      if (!subjectData) return prev;

      const newSubjectData = subjectData.map((chap) => {
        if (chap.name === chapterName) {
          return { ...chap, ...updates };
        }
        return chap;
      });

      return { ...prev, [subject]: newSubjectData };
    });
  }, []);

  const logSession = useCallback((
    subject: string,
    chapters: string[],
    attempted: number,
    correct: number,
    timeSpent: number,
    mistakes: string[],
    errorCounts?: Partial<Record<"KNOWLEDGE_DEFICIT" | "PROCEDURAL_FLAW" | "ATTENTIONAL_SLIP" | "TRANSFER_FAILURE", number>>,
    confidencePre?: number,
    perceivedDifficulty?: 1 | 2 | 3 | 4 | 5,
    questionType?: "MCQ" | "MULTI" | "NUMERIC" | "UNKNOWN",
    difficultyTier?: 1 | 2 | 3,
    timed?: boolean,
  ) => {
    const validAttempted = Math.max(1, Math.floor(Math.abs(attempted || 0)));
    const validCorrect = Math.max(0, Math.min(validAttempted, Math.floor(Math.abs(correct || 0))));
    const validTime = Math.max(1, Math.min(1440, Math.floor(Math.abs(timeSpent || 0))));

    if (chapters.length === 0) return;
    updateStreak();
    setQuestionsSolved((prev) => prev + validAttempted);

    const sessionAccuracy = Math.round((validCorrect / validAttempted) * 100);
    setAccuracy((prev) =>
      prev === 0
        ? sessionAccuracy
        : Math.round(prev * 0.8 + sessionAccuracy * 0.2),
    );

    const minsPerQ = validTime / validAttempted;
    const sessionSpeed = Math.max(
      0,
      Math.min(100, Math.round(100 - (minsPerQ - 1) * 25)),
    );
    setSpeedScore((prev) =>
      prev === 0 ? sessionSpeed : Math.round(prev * 0.8 + sessionSpeed * 0.2),
    );

    const perChapAttempted = Math.max(
      1,
      Math.floor(validAttempted / chapters.length),
    );
    const perChapCorrect = Math.max(0, Math.min(perChapAttempted, Math.floor(validCorrect / chapters.length)));
    const perChapTime = Math.max(1, Math.floor(validTime / chapters.length));

    const sessionDate = new Date().toISOString();
    // Update practice sessions
    const newSessions = chapters.map((chap, i) => ({
      id: `${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
      date: sessionDate,
      subject,
      chapter: chap,
      attempted: perChapAttempted,
      correct: perChapCorrect,
      timeSpent: perChapTime,
      mistakes,
      errorCounts,
      confidencePre,
      perceivedDifficulty,
      questionType,
      difficultyTier,
      timed,
    }));

    setPracticeSessions((prev) => [...prev, ...newSessions]);

    // Update chapter specific accuracy
    if (subject && chapters.length > 0) {
      chapters.forEach((chapter) => {
        const state = latestStateRef.current;
        const curSyllabus = state.syllabus || syllabus;
        const existingSubj = curSyllabus[subject as keyof SyllabusData];
        if (existingSubj) {
          const existingChap = existingSubj.find((c) => c.name === chapter);
          if (existingChap) {
            const prevAcc = existingChap.accuracy || 0;
            const newAcc =
              prevAcc === 0
                ? sessionAccuracy
                : Math.round(prevAcc * 0.7 + sessionAccuracy * 0.3);
            updateChapterStats(subject, chapter, { accuracy: newAcc });
          }
        }
      });
    }

    // Add XP: 10 per question, 5 per correct
    addXp(validAttempted * 10 + validCorrect * 5);
    setHoursStudiedToday((prev) => Math.min(24, prev + validTime / 60));
  }, [updateStreak, syllabus, updateChapterStats, addXp]);

  const logFocusSession = useCallback((durationMins: number, isDeepFocus: boolean) => {
    updateStreak();
    setHoursStudiedToday((prev) => Math.min(24, prev + durationMins / 60));

    // Calculate session XP based on Option A: Linear & Scaled Down
    // If the session is Deep Focus OR duration >= 90 mins (1 hour 30 mins), rate is 2 XP/min
    const rate = isDeepFocus || durationMins >= 90 ? 2 : 1;
    const sessionXp = durationMins * rate;

    // Deep Work Bonus: > 90 mins
    if (isDeepFocus && durationMins >= 90) {
      setFocusBadges((prev) => prev + 1);
      setActiveBoost({
        multiplier: 2.0,
        expiresAt: Date.now() + 2 * 60 * 60 * 1000,
      });
    }

    addXp(Math.round(sessionXp));
  }, [updateStreak, addXp]);

  const resetApp = useCallback(async () => {
    try {
      await deleteUserAccountAndCloudData();
    } catch (e) {
      console.error("Error during cloud deletion / logout:", e);
      try {
        await logout();
      } catch (err) {}
    }
    try {
      if (Capacitor.isNativePlatform()) {
        await Preferences.clear();
      }
    } catch (e) {}
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {}
    window.location.reload();
  }, []);

  const logoutUser = useCallback(async () => {
    // Persist current local state safely BEFORE signing out so local data is NEVER lost
    try {
      const currentLocal = getReliableLocalState();
      if (hasMeaningfulUserData(currentLocal)) {
        safePersistLocalState(currentLocal, undefined, { immediateBackup: true });
      }
    } catch (e) {}

    try {
      await logout();
    } catch (e) {}
    setFirebaseUser(null);
    setHasToken(false);
    lastSavedCloudJsonRef.current = "";
    hasUnsavedLocalChangesRef.current = false;
    // IMPORTANT: Do NOT delete localStorage or wipe user data on logout!
    // Local data stays safely preserved as the guaranteed last-resort fallback.
  }, [getReliableLocalState]);

  const submitMissedDayReasons = useCallback((
    reasons: { date: string; reason: string }[],
  ) => {
    setHistory((prev) => {
      const updated = [...prev];
      reasons.forEach((r) => {
        const rDateKey = getStandardDateKey(r.date);
        const rDateStr = new Date(r.date).toDateString();
        const existingIdx = updated.findIndex(
          (h) => isSameLogicalDay(h.date, rDateKey) || new Date(h.date).toDateString() === rDateStr,
        );
        if (existingIdx >= 0) {
          updated[existingIdx] = {
            ...updated[existingIdx],
            isMissed: true,
            missedReason: r.reason,
          };
        } else {
          updated.push({
            date: r.date.includes("T") ? r.date : new Date(r.date).toISOString(),
            hoursStudied: 0,
            xpEarned: 0,
            completedTasks: [],
            plannedTasks: [],
            screenTime: 0,
            sleepTime: 0,
            isMissed: true,
            missedReason: r.reason,
          });
        }
      });
      return updated;
    });
    setPendingMissedDays([]);
  }, []);

  const getCurrentChapterForSubject = useCallback((subj: string) => {
    if (!subj || !["Physics", "Chemistry", "Mathematics"].includes(subj))
      return null;

    const state = latestStateRef.current || {};
    const ongoing = state.ongoingChapters || {};
    if (ongoing[subj]) {
      return ongoing[subj];
    }

    const curTodos: Todo[] = state.todos || [];
    const matchingTodos = curTodos
      .filter((t) => t.subject === subj && t.chapter)
      .sort((a, b) => String(b.id).localeCompare(String(a.id)));

    if (matchingTodos.length > 0) {
      return matchingTodos[0].chapter || null;
    }

    const curHistory: PlayHistoryEntry[] = state.history || [];
    if (curHistory && curHistory.length > 0) {
      const sortedHistory = [...curHistory].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
      for (const entry of sortedHistory) {
        if (entry.completedTasks) {
          const matched = entry.completedTasks.find(
            (t) => t.subject === subj && t.chapter,
          );
          if (matched && matched.chapter) {
            return matched.chapter;
          }
        }
      }
    }

    const curSyllabus = state.syllabus || initialSyllabusData;
    const chapters = curSyllabus[subj as keyof typeof curSyllabus] || [];
    if (chapters.length > 0) {
      return chapters[0].name;
    }
    return null;
  }, []);

  const notifyCalendarPreviewClosed = useCallback(() => {
    isCalendarPreviewOpenRef.current = false;
    if (calendarSyncTimerRef.current) {
      clearTimeout(calendarSyncTimerRef.current);
      calendarSyncTimerRef.current = null;
    }
    saveStateToCloudNow();
  }, [saveStateToCloudNow]);

  const forceFetchAndRestoreFromCloud = useCallback(async (): Promise<{
    success: boolean;
    message: string;
    stats?: { xp: number; level: number; tasks: number; historyDays: number };
  }> => {
    const currentUid = firebaseUser?.uid || auth.currentUser?.uid;
    if (!currentUid) {
      return {
        success: false,
        message: "You are not signed in. Please sign in with your Google account first to restore your data from Cloud.",
      };
    }

    try {
      const res = await fetchUserDataDirectlyFromFirestore(currentUid);
      if (!res.success || !res.data) {
        return {
          success: false,
          message: res.error || "No existing cloud document was found in Firestore for this account.",
        };
      }

      const cloudData = res.data;
      const currentLocal = getReliableLocalState();
      const { mergedState } = reconcileState(currentLocal, cloudData);

      beginRemoteSyncApply();
      applyStateSnapshot(mergedState);

      latestStateRef.current = mergedState;
      const jsonString = JSON.stringify(mergedState);
      const persisted = safePersistLocalState(mergedState, jsonString, { immediateBackup: true });
      if (persisted) {
        lastSavedLocalJsonRef.current = persisted;
      }

      lastSavedCloudJsonRef.current = jsonString;
      hasUnsavedLocalChangesRef.current = false;
      setIsCloudSyncComplete(true);

      const tasksCount = (mergedState.todos || []).length;
      const historyDays = (mergedState.history || []).length;

      return {
        success: true,
        message: `Successfully restored data from Cloud! Found ${mergedState.xp || 0} XP (Level ${mergedState.level || 1}), ${tasksCount} tasks, and ${historyDays} study history days.`,
        stats: {
          xp: mergedState.xp || 0,
          level: mergedState.level || 1,
          tasks: tasksCount,
          historyDays,
        },
      };
    } catch (err: any) {
      console.error("forceFetchAndRestoreFromCloud error:", err);
      return {
        success: false,
        message: `Restore failed: ${err?.message || String(err)}`,
      };
    }
  }, [firebaseUser, applyStateSnapshot, getReliableLocalState]);

  const exportLocalBackup = useCallback(() => {
    try {
      const baseState = latestStateRef.current || {};

      let storedBacklogPlan = null;
      let storedScheduleProfile = null;
      let storedExtendedSettings = null;
      let storedStoreItems = null;
      let storedArcadeKeys = null;
      let storedArcadeCodes = null;
      let storedTheme = null;
      let storedTour = null;
      let storedVisited = null;
      let storedStartDate = null;
      const localStorageDump: Record<string, string> = {};

      if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
        try {
          const bp = localStorage.getItem("jee_tracker_backlog_plan");
          if (bp) storedBacklogPlan = JSON.parse(bp);
        } catch (e) {}

        try {
          const sp = localStorage.getItem("LEVELUP_SCHEDULE_PROFILE");
          if (sp) storedScheduleProfile = JSON.parse(sp);
        } catch (e) {}

        try {
          const es = localStorage.getItem("app_settings_extended");
          if (es) storedExtendedSettings = JSON.parse(es);
        } catch (e) {}

        try {
          const si = localStorage.getItem("store_items");
          if (si) storedStoreItems = JSON.parse(si);
        } catch (e) {}

        try {
          const ak = localStorage.getItem("arcade_purchased_keys");
          if (ak) storedArcadeKeys = JSON.parse(ak);
        } catch (e) {}

        try {
          const ac = localStorage.getItem("arcade_issued_codes");
          if (ac) storedArcadeCodes = JSON.parse(ac);
        } catch (e) {}

        try {
          storedTheme = localStorage.getItem("theme");
          storedTour = localStorage.getItem("app_tour_completed");
          storedVisited = localStorage.getItem("visited_tabs");
          storedStartDate = localStorage.getItem("levelup_app_start_date");
        } catch (e) {}

        // Complete dictionary of all localStorage keys for zero-loss recovery
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k) {
              const val = localStorage.getItem(k);
              if (val !== null) {
                localStorageDump[k] = val;
              }
            }
          }
        } catch (e) {}
      }

      const activeBacklogPlan = baseState.backlogPlan || storedBacklogPlan || null;
      const activeScheduleProfile = baseState.scheduleProfile || storedScheduleProfile || DEFAULT_SCHEDULE_PROFILE;
      const activeStartDate = baseState.appStartDate || storedStartDate || getStandardDateKey(getLogicalDate());

      const fullExportBundle = {
        _exportMetadata: {
          app: "LevelUp JEE Tracker 360",
          version: "2.6.0",
          exportDate: new Date().toISOString(),
          format: "full_state_snapshot",
          sourceDevice: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
        },
        // Core Identity & Game Progression
        playerName: baseState.playerName || "Player 1",
        xp: baseState.xp ?? 0,
        level: baseState.level ?? 1,
        questionsSolved: baseState.questionsSolved ?? 0,
        streakDays: baseState.streakDays ?? 0,
        accuracy: baseState.accuracy ?? 0,
        speedScore: baseState.speedScore ?? 0,
        focusBadges: baseState.focusBadges ?? 0,
        xpGainedToday: baseState.xpGainedToday ?? 0,
        spentXpToday: baseState.spentXpToday ?? 0,
        totalSpentXp: baseState.totalSpentXp ?? 0,
        hoursStudiedToday: baseState.hoursStudiedToday ?? 0,
        lastStudyDate: baseState.lastStudyDate || getStandardDateKey(getLogicalDate()),
        appStartDate: activeStartDate,

        // Goals & Calibration
        dailyTarget: baseState.dailyTarget ?? 100,
        totalXpGoal: baseState.totalXpGoal ?? 800000,
        class11EndDate: baseState.class11EndDate ?? null,
        isClass11SetupDone: Boolean(baseState.isClass11SetupDone),
        activeBoost: baseState.activeBoost ?? null,

        // Academic Curriculum & Masteries
        syllabus: baseState.syllabus || initialSyllabusData,
        ongoingChapters: baseState.ongoingChapters || {},
        backlogPriorities: baseState.backlogPriorities || {},

        // Tracker 360 Full Roadmap Plan & Enrolled Lectures
        backlogPlan: activeBacklogPlan,

        // Tasks & Mission Lists
        todos: baseState.todos || [],
        loggedTasksToday: baseState.loggedTasksToday || [],
        pendingTasks: baseState.pendingTasks || [],

        // Study History & Analytics
        history: baseState.history || [],
        practiceSessions: baseState.practiceSessions || [],
        habits: baseState.habits || [],
        lifeMetrics: baseState.lifeMetrics || [],
        monthlyGoals: baseState.monthlyGoals || [],

        // Student Schedule Engine Profile
        scheduleProfile: activeScheduleProfile,

        // Extended App Settings (Pomo, Rollover, Deep Work, Main Goal)
        extendedSettings: storedExtendedSettings || baseState.extendedSettings || {
          rolloverTime: "03:00",
          pomoTime: 25,
          deepWorkTime: 50,
          mainGoal: "Crack JEE 2026",
        },
        notificationSettings: baseState.notificationSettings || null,

        // Boss Day & Cosmetics
        lastBossDayDate: baseState.lastBossDayDate ?? null,
        bossDayTargetXp: baseState.bossDayTargetXp ?? null,
        bossDayCompleted: Boolean(baseState.bossDayCompleted),
        equippedTitle: baseState.equippedTitle || "",
        equippedAura: baseState.equippedAura || "",
        unlockedItems: baseState.unlockedItems || [],
        hasSeenRules: Boolean(baseState.hasSeenRules),

        // Store & Arcade
        storeItems: storedStoreItems || baseState.storeItems || null,
        arcadePurchasedKeys: storedArcadeKeys || baseState.arcadePurchasedKeys || null,
        arcadeIssuedCodes: storedArcadeCodes || baseState.arcadeIssuedCodes || null,

        // UI & Shell Environment
        theme: storedTheme || "dark",
        appTourCompleted: storedTour || null,
        visitedTabs: storedVisited || null,

        // Complete key-value dump for flawless cross-device cloning
        localStorageDump,
      };

      const jsonString = JSON.stringify(fullExportBundle, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const safeName = (baseState.playerName || "student").toLowerCase().replace(/[^a-z0-9]/g, "_");
      const dateStr = new Date().toISOString().split("T")[0];
      a.href = url;
      a.download = `levelup_tracker360_full_backup_${safeName}_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Failed to export complete backup:", e);
    }
  }, []);

  const importLocalBackup = useCallback((jsonContent: string): { success: boolean; message: string } => {
    try {
      const parsed = JSON.parse(jsonContent);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return { success: false, message: "Invalid backup format: root must be a valid JSON object." };
      }

      const data = parsed.data && typeof parsed.data === "object" && !Array.isArray(parsed.data) ? parsed.data : parsed;

      // Schema validation & sanity checks against corrupted or malicious backups
      if (data.xp !== undefined && (typeof data.xp !== "number" || isNaN(data.xp) || data.xp < 0)) {
        return { success: false, message: "Corrupted backup: XP must be a non-negative number." };
      }
      if (data.level !== undefined && (typeof data.level !== "number" || isNaN(data.level) || data.level < 1)) {
        return { success: false, message: "Corrupted backup: Level must be a positive integer." };
      }
      if (data.todos !== undefined && !Array.isArray(data.todos)) {
        return { success: false, message: "Corrupted backup: 'todos' must be an array." };
      }
      if (data.history !== undefined && !Array.isArray(data.history)) {
        return { success: false, message: "Corrupted backup: 'history' must be an array." };
      }
      if (data.syllabus !== undefined && (typeof data.syllabus !== "object" || Array.isArray(data.syllabus))) {
        return { success: false, message: "Corrupted backup: 'syllabus' must be a valid object." };
      }

      const currentLocal = latestStateRef.current || {};
      const { mergedState } = reconcileState(currentLocal, data);

      // Deep restore to localStorage so all components find their data immediately on this device
      if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
        try {
          if (mergedState.backlogPlan) {
            localStorage.setItem("jee_tracker_backlog_plan", JSON.stringify(mergedState.backlogPlan));
          }
          if (mergedState.scheduleProfile) {
            localStorage.setItem("LEVELUP_SCHEDULE_PROFILE", JSON.stringify(mergedState.scheduleProfile));
          }
          if (mergedState.extendedSettings || data.extendedSettings || data.app_settings_extended) {
            localStorage.setItem("app_settings_extended", JSON.stringify(mergedState.extendedSettings || data.extendedSettings || data.app_settings_extended));
          }
          if (mergedState.appStartDate || data.appStartDate) {
            localStorage.setItem("levelup_app_start_date", mergedState.appStartDate || data.appStartDate);
          }
          if (data.storeItems) {
            localStorage.setItem("store_items", JSON.stringify(data.storeItems));
          }
          if (data.arcadePurchasedKeys) {
            localStorage.setItem("arcade_purchased_keys", JSON.stringify(data.arcadePurchasedKeys));
          }
          if (data.arcadeIssuedCodes) {
            localStorage.setItem("arcade_issued_codes", JSON.stringify(data.arcadeIssuedCodes));
          }
          if (data.theme) {
            localStorage.setItem("theme", data.theme);
            if (data.theme === "dark") document.documentElement.classList.add("dark");
            else document.documentElement.classList.remove("dark");
          }
          if (data.appTourCompleted !== undefined) {
            localStorage.setItem("app_tour_completed", typeof data.appTourCompleted === "string" ? data.appTourCompleted : JSON.stringify(data.appTourCompleted));
          }
          if (data.visitedTabs !== undefined) {
            localStorage.setItem("visited_tabs", typeof data.visitedTabs === "string" ? data.visitedTabs : JSON.stringify(data.visitedTabs));
          }

          // Hydrate from localStorageDump for any extra keys
          if (data.localStorageDump && typeof data.localStorageDump === "object") {
            Object.entries(data.localStorageDump).forEach(([k, v]) => {
              if (typeof v === "string" && !localStorage.getItem(k)) {
                localStorage.setItem(k, v);
              }
            });
          }
        } catch (e) {
          console.warn("Error hydrating localStorage keys during backup import:", e);
        }
      }

      beginRemoteSyncApply();
      applyStateSnapshot(mergedState);

      latestStateRef.current = mergedState;
      const jsonString = JSON.stringify(mergedState);
      const persisted = safePersistLocalState(mergedState, jsonString, { immediateBackup: true });
      if (persisted) {
        lastSavedLocalJsonRef.current = persisted;
      }

      // If user is logged into Firebase, immediately push the complete cloned state to Firestore
      if (firebaseUser?.uid && hasMeaningfulUserData(mergedState)) {
        saveUserDataToCloud(firebaseUser.uid, mergedState, true).catch((e) => {
          console.warn("Cloud push after import failed:", e);
        });
        lastSavedCloudJsonRef.current = jsonString;
        hasUnsavedLocalChangesRef.current = false;
      }

      const tasksCount = (mergedState.todos || []).length;
      const historyDays = (mergedState.history || []).length;
      const hasPlan = Boolean(mergedState.backlogPlan);

      return {
        success: true,
        message: `Device Synchronized! Restored ${mergedState.playerName || 'Player'}, ${mergedState.xp || 0} XP (Lvl ${mergedState.level || 1}), ${tasksCount} tasks, ${historyDays} study history days${hasPlan ? ', and full Tracker 360 roadmap' : ''}.`,
      };
    } catch (e: any) {
      return { success: false, message: `Failed to parse and restore backup file: ${e?.message || String(e)}` };
    }
  }, [applyStateSnapshot, firebaseUser]);

  const scheduleBacklogTask = useCallback(
    async (task: Todo): Promise<void> => {
      const updatedPending = pendingTasks.filter((pt) => String(pt.id) !== String(task.id));
      const hasValidExistingSlot =
        Boolean(task.startTime && task.endTime) &&
        !isNaN(new Date(task.startTime!).getTime()) &&
        !isNaN(new Date(task.endTime!).getTime());

      let resolvedStart = task.startTime;
      let resolvedEnd = task.endTime;
      let resolvedDate = task.dateScheduled || (resolvedStart ? resolvedStart.slice(0, 10) : getLocalDateString());

      if (!hasValidExistingSlot) {
        const block = getActiveStudyBlock(scheduleProfile, backlogPlan);
        const slot = calculateNextAvailableStudySlot(
          resolvedDate,
          task.durationMinutes || 90,
          todos,
          block.start,
          block.end,
        );
        resolvedStart = slot.startTime;
        resolvedEnd = slot.endTime;
        resolvedDate = slot.dateScheduled;
      }

      const taskToMove: Todo = {
        ...task,
        completed: false,
        startTime: resolvedStart,
        endTime: resolvedEnd,
        dateScheduled: resolvedDate,
      };
      const updatedTodos = [...todos.filter((t) => String(t.id) !== String(task.id)), taskToMove];

      setPendingTasks(updatedPending);
      setTodos(updatedTodos);

      await saveStateToCloudNow({
        pendingTasks: updatedPending,
        todos: updatedTodos,
      });
    },
    [pendingTasks, todos, scheduleProfile, backlogPlan, saveStateToCloudNow],
  );

  const contextValue = useMemo(
    () => ({
      xp,
      setXp,
      xpGainedToday,
      setXpGainedToday,
      spentXpToday,
      setSpentXpToday,
      totalSpentXp,
      setTotalSpentXp,
      level,
      setLevel,
      questionsSolved,
      setQuestionsSolved,
      dailyTarget,
      setDailyTarget,
      accuracy,
      speedScore,
      streakDays,
      setStreakDays,
      lastStudyDate,
      setLastStudyDate,
      focusBadges,
      setFocusBadges,
      syllabus,
      setSyllabus,
      activeBoost,
      appStartDate,
      setAppStartDate,
      class11EndDate,
      setClass11EndDate,
      totalXpGoal,
      setTotalXpGoal,
      isClass11SetupDone,
      setIsClass11SetupDone,
      scheduleProfile,
      setScheduleProfile,
      backlogPriorities,
      setBacklogPriorities,
      hasSeenReminder,
      setHasSeenReminder,
      hasSeenRules,
      setHasSeenRules,
      notifyCalendarMutation,
      todos,
      setTodos,
      backlogPlan,
      setBacklogPlan,
      updateTask,
      loggedTasksToday,
      setLoggedTasksToday,
      pendingTasks,
      setPendingTasks,
      history,
      setHistory,
      practiceSessions,
      setPracticeSessions,
      playerName,
      setPlayerName,
      habits,
      setHabits,
      lifeMetrics,
      setLifeMetrics,
      monthlyGoals,
      setMonthlyGoals,
      addXp,
      getStreakMultiplier,
      logSession,
      logFocusSession,
      updateChapterStats,
      resetApp,
      logoutUser,
      isLoaded,
      needsRollover: needsRolloverState,
      setNeedsRollover,
      consistencyBroken,
      setConsistencyBroken,
      completeRollover,
      pendingMissedDays,
      setPendingMissedDays,
      submitMissedDayReasons,
      lastBossDayDate,
      setLastBossDayDate,
      bossDayTargetXp,
      setBossDayTargetXp,
      bossDayCompleted,
      setBossDayCompleted,
      firebaseUser,
      setFirebaseUser,
      hasToken,
      setHasToken,
      isCloudSyncComplete,
      equippedTitle,
      setEquippedTitle,
      equippedAura,
      setEquippedAura,
      unlockedItems,
      setUnlockedItems,
      hoursStudiedToday,
      setHoursStudiedToday,
      notificationSettings,
      setNotificationSettings,
      ongoingChapters,
      setOngoingChapters,
      getCurrentChapterForSubject,
      saveStateToCloudNow,
      scheduleBacklogTask,
      notifyCalendarPreviewOpened,
      notifyCalendarPreviewClosed,
      forceFetchAndRestoreFromCloud,
      exportLocalBackup,
      importLocalBackup,
      lastSyncTimestamp,
      setLastSyncTimestamp,
      showWelcomeHero,
      setShowWelcomeHero,
      triggerWelcomeScreen,
      dismissWelcomeHero,
      markReminderSeen,
    }),
    [
      appStartDate,
      setAppStartDate,
      showWelcomeHero,
      triggerWelcomeScreen,
      dismissWelcomeHero,
      markReminderSeen,
      xp,
      xpGainedToday,
      spentXpToday,
      setSpentXpToday,
      totalSpentXp,
      setTotalSpentXp,
      level,
      setLevel,
      questionsSolved,
      setQuestionsSolved,
      dailyTarget,
      setDailyTarget,
      accuracy,
      speedScore,
      streakDays,
      lastStudyDate,
      focusBadges,
      syllabus,
      activeBoost,
      class11EndDate,
      setClass11EndDate,
      totalXpGoal,
      setTotalXpGoal,
      isClass11SetupDone,
      setIsClass11SetupDone,
      scheduleProfile,
      backlogPriorities,
      setBacklogPriorities,
      hasSeenReminder,
      setHasSeenReminder,
      hasSeenRules,
      setHasSeenRules,
      todos,
      setTodos,
      backlogPlan,
      setBacklogPlan,
      updateTask,
      loggedTasksToday,
      setLoggedTasksToday,
      pendingTasks,
      setPendingTasks,
      history,
      setHistory,
      practiceSessions,
      setPracticeSessions,
      playerName,
      setPlayerName,
      habits,
      setHabits,
      lifeMetrics,
      setLifeMetrics,
      monthlyGoals,
      setMonthlyGoals,
      addXp,
      getStreakMultiplier,
      logSession,
      logFocusSession,
      updateChapterStats,
      resetApp,
      logoutUser,
      isLoaded,
      needsRolloverState,
      setNeedsRollover,
      lastSyncTimestamp,
      setLastSyncTimestamp,
      consistencyBroken,
      setConsistencyBroken,
      completeRollover,
      pendingMissedDays,
      setPendingMissedDays,
      submitMissedDayReasons,
      lastBossDayDate,
      setLastBossDayDate,
      bossDayTargetXp,
      setBossDayTargetXp,
      bossDayCompleted,
      setBossDayCompleted,
      firebaseUser,
      setFirebaseUser,
      hasToken,
      setHasToken,
      isCloudSyncComplete,
      equippedTitle,
      setEquippedTitle,
      equippedAura,
      setEquippedAura,
      unlockedItems,
      setUnlockedItems,
      hoursStudiedToday,
      setHoursStudiedToday,
      notificationSettings,
      setNotificationSettings,
      ongoingChapters,
      getCurrentChapterForSubject,
      saveStateToCloudNow,
      scheduleBacklogTask,
      notifyCalendarPreviewOpened,
      notifyCalendarPreviewClosed,
      forceFetchAndRestoreFromCloud,
      exportLocalBackup,
      importLocalBackup,
    ],
  );

  return (
    <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
}
