import {
  logout,
  saveUserDataToCloud,
  subscribeToCloudUserData,
  loadUserDataFromCloud,
  fetchUserDataDirectlyFromFirestore,
  auth,
} from "@/lib/firebase";
import { reconcileState } from "@/lib/sync/reconciliation";
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
import { reconstructPlanFromTodos } from "@/lib/backlog/engine";
import { getLevelFromXp, getLocalDateString, isCurrentDayTask } from "@/lib/utils";
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
}

export interface LifeMetric {
  day: number;
  sleep: number;
  screenTime: number;
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
  activeBoost: { multiplier: number; expiresAt: number } | null;
  class11EndDate: string | null;
  totalXpGoal: number;
  setTotalXpGoal: (val: number) => void;
  setClass11EndDate: (date: string) => void;
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
  completeRollover: (sleep: number, screenTime: number) => void;
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
  ) => void;
  logFocusSession: (durationMins: number, isDeepFocus: boolean) => void;
  updateChapterStats: (
    subject: string,
    chapterName: string,
    updates: Partial<Chapter>,
  ) => void;
  resetApp: () => void;
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
}

const AppContext = createContext<AppState | undefined>(undefined);

let cachedRolloverTime: string | null = null;
let isRolloverCacheInitialized = false;

export const setCachedRolloverTime = (time: string | null) => {
  cachedRolloverTime = time;
  isRolloverCacheInitialized = true;
};

export const getLogicalDate = (customRolloverTime?: string) => {
  const d = new Date();
  let offset = 3;
  let timeStr = customRolloverTime;
  if (!timeStr) {
    if (isRolloverCacheInitialized) {
      timeStr = cachedRolloverTime || undefined;
    } else {
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          const saved = localStorage.getItem("app_settings_extended");
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && typeof parsed.rolloverTime === "string") {
              timeStr = parsed.rolloverTime;
              cachedRolloverTime = timeStr;
            }
          }
        }
      } catch (e) {
        console.warn("[AppContext] Failed to read cached rollover time from storage:", e);
      } finally {
        isRolloverCacheInitialized = true;
      }
    }
  }
  if (timeStr) {
    const [hours] = timeStr.split(":");
    if (hours !== undefined) {
      const parsedHours = parseInt(hours, 10);
      if (!isNaN(parsedHours)) {
        offset = parsedHours;
      }
    }
  }
  d.setHours(d.getHours() - offset);
  return d;
};

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

  const inHistory = history.some((entry) => isSameLogicalDay(entry.date, todayLogicalDate));
  if (inHistory) return true;

  const inMetrics = lifeMetrics.some((metric) => {
    if ((metric as any).date) {
      return isSameLogicalDay((metric as any).date, todayLogicalDate) && (metric.sleep > 0 || metric.screenTime > 0);
    }
    const metricKey = getStandardDateKey((metric as any).createdAt);
    if (metricKey) {
      return metricKey === todayKey && (metric.sleep > 0 || metric.screenTime > 0);
    }
    const now = getLogicalDate();
    return (
      metric.day === todayLogicalDate.getDate() &&
      now.getMonth() === todayLogicalDate.getMonth() &&
      now.getFullYear() === todayLogicalDate.getFullYear() &&
      (metric.sleep > 0 || metric.screenTime > 0)
    );
  });
  if (inMetrics) return true;

  if (typeof sessionStorage !== "undefined") {
    const sessionCompleted = sessionStorage.getItem(`rollover_completed_${todayKey}`);
    if (sessionCompleted === "true") return true;
  }

  return false;
};

const LOCAL_STORAGE_KEY = "jee_tracker_state";

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

export function AppProvider({ children }: { children: ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [needsRolloverState, setNeedsRolloverState] = useState(false);
  const [lastSyncTimestamp, setLastSyncTimestampState] = useState<number>(0);
  const lastSyncTimestampRef = useRef<number>(0);

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
  const [xp, setXp] = useState(0);
  const [xpGainedToday, setXpGainedToday] = useState(0);
  const [spentXpToday, setSpentXpToday] = useState(0);
  const [totalSpentXp, setTotalSpentXp] = useState(0);
  const [hoursStudiedToday, setHoursStudiedToday] = useState(0);
  const [level, setLevel] = useState(1);
  const [questionsSolved, setQuestionsSolved] = useState(0);
  const [dailyTarget, setDailyTarget] = useState(100);
  const [accuracy, setAccuracy] = useState(0);
  const [speedScore, setSpeedScore] = useState(0);

  const [streakDays, setStreakDays] = useState(0);
  const [lastStudyDate, setLastStudyDateState] = useState<string | null>(null);
  const lastStudyDateRef = useRef<string | null>(null);
  const setLastStudyDate = (val) => {
    setLastStudyDateState(val);
    lastStudyDateRef.current =
      typeof val === "function" ? val(lastStudyDateRef.current) : val;
  };
  const [focusBadges, setFocusBadges] = useState(0);
  const [syllabus, setSyllabus] = useState<SyllabusData>(initialSyllabusData);
  const [activeBoost, setActiveBoost] = useState<{
    multiplier: number;
    expiresAt: number;
  } | null>(null);
  const [class11EndDate, setClass11EndDate] = useState<string | null>(null);
  const [totalXpGoal, setTotalXpGoal] = useState<number>(800000);
  const [isClass11SetupDone, setIsClass11SetupDone] = useState(false);
  const [backlogPriorities, setBacklogPriorities] = useState<
    Record<string, "Must-Do" | "Review">
  >({});
  const [hasSeenReminder, setHasSeenReminder] = useState(false);
  const [hasSeenRules, setHasSeenRules] = useState(false);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [backlogPlan, setBacklogPlan] = useState<BacklogPlan | null>(null);
  const [loggedTasksToday, setLoggedTasksToday] = useState<Todo[]>([]);
  const [pendingTasks, setPendingTasks] = useState<Todo[]>([]);
  const [history, setHistory] = useState<PlayHistoryEntry[]>([]);
  const [practiceSessions, setPracticeSessions] = useState<PracticeSession[]>(
    [],
  );
  const [pendingMissedDays, setPendingMissedDays] = useState<string[]>([]);

  const [playerName, setPlayerName] = useState<string>("Player 1");
  const [habits, setHabits] = useState<Habit[]>([]);
  const [lifeMetrics, setLifeMetrics] = useState<LifeMetric[]>(
    Array.from({ length: 31 }, (_, i) => ({
      day: i + 1,
      sleep: 0,
      screenTime: 0,
    })),
  );
  const [monthlyGoals, setMonthlyGoals] = useState<MonthlyGoal[]>([]);
  const [lastBossDayDate, setLastBossDayDate] = useState<string | null>(null);
  const [bossDayTargetXp, setBossDayTargetXp] = useState<number | null>(null);
  const [bossDayCompleted, setBossDayCompleted] = useState<boolean>(false);
  const [pendingBossDayBonus, setPendingBossDayBonus] =
    useState<boolean>(false);
  const [equippedTitle, setEquippedTitle] = useState<string>("");
  const [equippedAura, setEquippedAura] = useState<string>("");
  const [unlockedItems, setUnlockedItems] = useState<string[]>([]);
  const [ongoingChapters, setOngoingChapters] = useState<Record<string, string>>({});
  const isCalendarPreviewOpenRef = useRef(false);
  const calendarSyncTimerRef = useRef<any>(null);

  const [showWelcomeHero, setShowWelcomeHero] = useState<boolean>(() => {
    try {
      if (typeof window === "undefined" || !window.localStorage) return false;
      const dismissedForever = localStorage.getItem("welcome_hero_dismissed_forever");
      if (dismissedForever === "true") return false;

      // If user already has any recorded local state, do not show welcome hero on load
      const localRaw = localStorage.getItem(LOCAL_STORAGE_KEY) || localStorage.getItem("jee_tracker_state");
      if (localRaw) {
        try {
          const parsed = JSON.parse(localRaw);
          if (
            (parsed.xp && parsed.xp > 0) ||
            (parsed.todos && parsed.todos.length > 0) ||
            (parsed.history && parsed.history.length > 0)
          ) {
            return false;
          }
        } catch {}
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
    useState<NotificationSettings>({
      taskReminders: true,
      motivationalAlerts: true,
      studyBlockReminders: true,
      streakProtectionAlerts: true,
      soundEnabled: true,
      frequency: "high",
    });
  const [firebaseUser, setFirebaseUser] = useState<
    import("firebase/auth").User | null
  >(null);
  const [hasToken, setHasToken] = useState<boolean>(false);
  const [isCloudSyncComplete, setIsCloudSyncComplete] = useState<boolean>(false);
  const lastSavedCloudJsonRef = useRef<string>("");
  const isRemoteSyncingRef = useRef<boolean>(false);
  const lastLocalMutationTimeRef = useRef<number>(0);
  const lastCalendarMutationTimeRef = useRef<number>(0);
  const hasUnsavedLocalChangesRef = useRef<boolean>(false);

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

  // Load state on mount with safety fallback timeout
  useEffect(() => {
    let unmounted = false;
    const safetyTimeout = setTimeout(() => {
      if (!unmounted) {
        setIsLoaded(true);
      }
    }, 1500);

    const loadState = async () => {
      try {
        let saved: string | null = null;
        if (Capacitor.isNativePlatform()) {
          const { value } = await Preferences.get({ key: LOCAL_STORAGE_KEY });
          saved = value;
        } else {
          saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        }

        if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setXp(parsed.xp || 0);
          setLevel(parsed.level || 1);
          setQuestionsSolved(parsed.questionsSolved || 0);
          setDailyTarget(parsed.dailyTarget || 100);
          setAccuracy(parsed.accuracy || 0);
          setSpeedScore(parsed.speedScore || 0);
          setStreakDays(parsed.streakDays || 0);
          setLastStudyDate(parsed.lastStudyDate || null);

          const today = getLogicalDate();
          const todayDateString = today.toDateString();
          const isToday = isSameLogicalDay(parsed.lastStudyDate, today);
          const protocolRecordExists = hasTodayProtocolRecord(parsed.history || [], parsed.lifeMetrics || [], today);

          console.log(`[Local Storage Load] lastStudyDate: "${parsed.lastStudyDate}", TodayKey: "${getStandardDateKey(today)}", isToday: ${isToday}, protocolRecordExists: ${protocolRecordExists}`);

          if (isToday || protocolRecordExists) {
            setNeedsRollover(false, "Local storage load: today is already completed or matches lastStudyDate");
            setLastStudyDate(getStandardDateKey(today));
          } else if (parsed.lastStudyDate) {
            setNeedsRollover(true, "Local storage load: lastStudyDate is from a previous day");

            // Check for missed days or underperformance
            const lastDate = new Date(parsed.lastStudyDate);
            const missingDates = [];

            // Calculate historical average XP (removed)

            if (!isNaN(lastDate.getTime())) {
              const lastSessionXp = parsed.xpGainedToday || 0;
              let dailyRequiredForCalc = parsed.dailyTarget || 100;
              if (parsed.class11EndDate) {
                const class11EndTimestamp = new Date(
                  parsed.class11EndDate,
                ).getTime();
                const daysUntilExam = Math.max(
                  1,
                  Math.ceil(
                    (class11EndTimestamp - Date.now()) / (1000 * 3600 * 24),
                  ),
                );
                const totalXpRequired = Math.max(
                  0,
                  (parsed.totalXpGoal || 800000) - (parsed.xp || 0),
                );
                dailyRequiredForCalc = Math.max(
                  100,
                  Math.ceil(totalXpRequired / daysUntilExam),
                );
              }

              if (lastSessionXp < dailyRequiredForCalc * 0.4) {
                missingDates.push(lastDate.toISOString());
              }

              const tempDate = new Date(lastDate);
              tempDate.setDate(tempDate.getDate() + 1);

              let safetyCounter = 0;
              while (
                !isNaN(tempDate.getTime()) &&
                tempDate.toDateString() !== todayDateString &&
                tempDate < today &&
                safetyCounter < 60
              ) {
                missingDates.push(tempDate.toISOString());
                tempDate.setDate(tempDate.getDate() + 1);
                safetyCounter++;
              }

              if (missingDates.length > 0) {
                setPendingMissedDays(missingDates);
              }
            }
          }
          setXpGainedToday(parsed.xpGainedToday || 0);
          setSpentXpToday(parsed.spentXpToday || 0);
          setTotalSpentXp(parsed.totalSpentXp || 0);
          setHoursStudiedToday(parsed.hoursStudiedToday || 0);

          setFocusBadges(parsed.focusBadges || 0);

          const loadedSyllabus = parsed.syllabus || initialSyllabusData;
          const mergedSyllabus: SyllabusData = { ...initialSyllabusData };

          (["Physics", "Chemistry", "Mathematics"] as const).forEach(
            (subject) => {
              if (loadedSyllabus[subject]) {
                const subjectChapters = [...loadedSyllabus[subject]];
                initialSyllabusData[subject].forEach((defaultCap) => {
                  if (
                    !subjectChapters.some(
                      (c: any) => c.name === defaultCap.name,
                    )
                  ) {
                    subjectChapters.push(defaultCap);
                  }
                });
                mergedSyllabus[subject] = subjectChapters;
              }
            },
          );
          setSyllabus(mergedSyllabus);

          setActiveBoost(parsed.activeBoost || null);
          const loadedEndDate = parsed.class11EndDate || null;
          setClass11EndDate(loadedEndDate);
          const calc8Hr = calculate8HourGoalXp(loadedEndDate, parsed.xp || 0);
          setTotalXpGoal(parsed.totalXpGoal || calc8Hr.goalXp);
          setIsClass11SetupDone(
            loadedEndDate ? parsed.isClass11SetupDone || false : false,
          );
          setBacklogPriorities(parsed.backlogPriorities || {});

          let loadedBacklogPlan: BacklogPlan | null = parsed.backlogPlan || null;
          if (!loadedBacklogPlan && typeof window !== "undefined") {
            try {
              const backupPlanStr = localStorage.getItem("jee_tracker_backlog_plan");
              if (backupPlanStr) {
                loadedBacklogPlan = JSON.parse(backupPlanStr);
              }
            } catch (e) {
              console.warn("Failed to load backlog plan from backup key:", e);
            }
          }

          const loadedTodos = parsed.todos || [];
          if (!loadedBacklogPlan && loadedTodos.length > 0) {
            loadedBacklogPlan = reconstructPlanFromTodos(loadedTodos);
          }
          setBacklogPlan(loadedBacklogPlan);
          setHasSeenRules(parsed.hasSeenRules || false);
          setTodos(
            Array.from(
              new Map(loadedTodos.map((t: Todo) => [t.id, t])).values(),
            ) as Todo[],
          );
          const loadedLoggedTasks = parsed.loggedTasksToday || [];
          setLoggedTasksToday(
            Array.from(
              new Map(loadedLoggedTasks.map((t: Todo) => [t.id, t])).values(),
            ) as Todo[],
          );
          const loadedPendingTasks = parsed.pendingTasks || [];
          setPendingTasks(
            Array.from(
              new Map(loadedPendingTasks.map((t: Todo) => [t.id, t])).values(),
            ) as Todo[],
          );
          let loadedHistory = parsed.history || [];
          setHistory(loadedHistory);
          setPracticeSessions(parsed.practiceSessions || []);
          setPlayerName(parsed.playerName || "Player 1");
          setHabits(parsed.habits || []);
          let loadMetrics = parsed.lifeMetrics;
          if (!loadMetrics || loadMetrics.length < 31) {
            loadMetrics = Array.from({ length: 31 }, (_, i) => {
              const ext = (parsed.lifeMetrics || []).find(
                (m: any) => m.day === i + 1,
              );
              return ext || { day: i + 1, sleep: 0, screenTime: 0 };
            });
          }
          setLifeMetrics(loadMetrics);
          setMonthlyGoals(parsed.monthlyGoals || []);

          setLastBossDayDate(parsed.lastBossDayDate || null);
          setBossDayTargetXp(parsed.bossDayTargetXp || null);
          setBossDayCompleted(parsed.bossDayCompleted || false);
          setEquippedTitle(parsed.equippedTitle || "");
          setEquippedAura(parsed.equippedAura || "");
          setUnlockedItems(parsed.unlockedItems || []);
          setOngoingChapters(parsed.ongoingChapters || {});
          if (parsed.notificationSettings) {
            setNotificationSettings(parsed.notificationSettings);
          }
        } catch (e) {
          console.error("Failed to parse local storage", e);
        }
      }
      } catch (err) {
        console.error("Error in loadState:", err);
      } finally {
        if (!unmounted) {
          clearTimeout(safetyTimeout);
          setIsLoaded(true);
        }
      }
    };
    loadState();
    return () => {
      unmounted = true;
      clearTimeout(safetyTimeout);
    };
  }, []);

  // Save state on change
  useEffect(() => {
    if (!isLoaded) return;

    const now = Date.now();
    if (isRemoteSyncingRef.current) {
      // Change came from cloud listener, do not flag as local mutation
      isRemoteSyncingRef.current = false;
    } else {
      // Genuine local mutation
      hasUnsavedLocalChangesRef.current = true;
      lastLocalMutationTimeRef.current = now;
      lastSyncTimestampRef.current = now;
    }

    const stateToSave = {
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
      lastSyncTimestamp: lastSyncTimestampRef.current || now,
    };
    const jsonString = JSON.stringify(stateToSave);

    const localTimeoutId = setTimeout(() => {
      if (Capacitor.isNativePlatform()) {
        Preferences.set({ key: LOCAL_STORAGE_KEY, value: jsonString });
      } else {
        localStorage.setItem(LOCAL_STORAGE_KEY, jsonString);
      }
    }, 100);

    // Batch state updates into a 1000ms debounce to prevent exhausting the Firestore write stream
    const cloudDelay = 1000;

    const cloudTimeoutId = setTimeout(async () => {
      if (
        firebaseUser?.uid &&
        isCloudSyncComplete
      ) {
        if (jsonString !== lastSavedCloudJsonRef.current) {
          lastSavedCloudJsonRef.current = jsonString;
          const ok = await saveUserDataToCloud(firebaseUser.uid, stateToSave, false);
          if (ok) {
            hasUnsavedLocalChangesRef.current = false;
          }
        } else {
          hasUnsavedLocalChangesRef.current = false;
        }
      }
    }, cloudDelay);

    return () => {
      clearTimeout(localTimeoutId);
      clearTimeout(cloudTimeoutId);
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
  ]);

  // Dedicated single-instance listener for page unload, visibility hidden and mobile pause
  useEffect(() => {
    const flushCurrentState = () => {
      if (!isLoaded || isRemoteSyncingRef.current) return;
      const stateToSave = latestStateRef.current;
      if (!stateToSave || Object.keys(stateToSave).length === 0) return;
      const currentJson = JSON.stringify(stateToSave);
      if (Capacitor.isNativePlatform()) {
        Preferences.set({ key: LOCAL_STORAGE_KEY, value: currentJson });
      } else {
        localStorage.setItem(LOCAL_STORAGE_KEY, currentJson);
      }
      if (
        firebaseUser?.uid &&
        isCloudSyncComplete &&
        currentJson !== lastSavedCloudJsonRef.current
      ) {
        lastSavedCloudJsonRef.current = currentJson;
        saveUserDataToCloud(firebaseUser.uid, stateToSave, true).then((ok) => {
          if (ok) {
            hasUnsavedLocalChangesRef.current = false;
          }
        });
      }
    };

    const handleBeforeUnload = () => {
      flushCurrentState();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushCurrentState();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    let isMounted = true;
    let capAppStateListener: any = null;
    if (Capacitor.isNativePlatform()) {
      CapApp.addListener("appStateChange", (state) => {
        if (!state.isActive) {
          flushCurrentState();
        } else {
          // App resumed from background: check if date shifted past 3 AM
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
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (capAppStateListener) {
        capAppStateListener.remove();
      }
    };
  }, [isLoaded, firebaseUser, isCloudSyncComplete]);

  // Initial Cloud Data Fetch on Auth to ensure cloud state is single source of truth
  useEffect(() => {
    if (!firebaseUser?.uid) {
      setIsCloudSyncComplete(true);
      return;
    }

    // Gated: wait until local state is fully loaded from disk before reconciling with Cloud
    if (!isLoaded) {
      return;
    }

    setIsCloudSyncComplete(false);
    let cancelled = false;

    const syncCloudOnLogin = async () => {
      try {
        const cloudData = await loadUserDataFromCloud(firebaseUser.uid);
        if (cancelled) return;

        if (!cloudData) {
          // Network error or offline: keep local state safe, do NOT overwrite cloud with empty state!
          setIsCloudSyncComplete(true);
          return;
        }

        if ((cloudData as any).__docExists === false) {
          // Brand new Firestore account with no document yet: if user has local data, push to cloud
          const currentLocal = latestStateRef.current;
          const hasLocalData = (currentLocal.xp || 0) > 0 || (currentLocal.todos || []).length > 0 || (currentLocal.history || []).length > 0;
          if (hasLocalData && firebaseUser?.uid) {
            await saveUserDataToCloud(firebaseUser.uid, currentLocal, true);
            lastSavedCloudJsonRef.current = JSON.stringify(currentLocal);
          }
          setIsCloudSyncComplete(true);
          return;
        }

        // NON-REVERTING SMART RECONCILIATION
        const currentLocal = latestStateRef.current;
        const { mergedState, needsCloudUpload } = reconcileState(currentLocal, cloudData);

        isRemoteSyncingRef.current = true;

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
        if (mergedState.class11EndDate !== undefined) setClass11EndDate(mergedState.class11EndDate);
        if (mergedState.isClass11SetupDone !== undefined) setIsClass11SetupDone(mergedState.isClass11SetupDone);
        if (mergedState.backlogPriorities !== undefined) setBacklogPriorities(mergedState.backlogPriorities);
        if (mergedState.backlogPlan !== undefined) {
          setBacklogPlan(mergedState.backlogPlan);
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
        if (mergedState.todos !== undefined) setTodos(mergedState.todos);
        if (mergedState.loggedTasksToday !== undefined) setLoggedTasksToday(mergedState.loggedTasksToday);
        if (mergedState.pendingTasks !== undefined) setPendingTasks(mergedState.pendingTasks);
        if (mergedState.history !== undefined) setHistory(mergedState.history);
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

        if (mergedState.lastSyncTimestamp) {
          setLastSyncTimestamp(mergedState.lastSyncTimestamp);
          lastSyncTimestampRef.current = mergedState.lastSyncTimestamp;
        }

        lastSavedCloudJsonRef.current = JSON.stringify(mergedState);
        hasUnsavedLocalChangesRef.current = false;
        lastLocalMutationTimeRef.current = 0;

        if (needsCloudUpload && firebaseUser?.uid) {
          await saveUserDataToCloud(firebaseUser.uid, mergedState, true);
        }

        setTimeout(() => {
          isRemoteSyncingRef.current = false;
          setIsCloudSyncComplete(true);
        }, 300);
      } catch (err) {
        console.error("Cloud login sync error:", err);
        setIsCloudSyncComplete(true);
      }
    };

    syncCloudOnLogin();

    return () => {
      cancelled = true;
    };
  }, [firebaseUser, isLoaded]);

  // Real-Time Cloud Listener removed to prevent feedback write loops and stream exhaustion.
  // Data is loaded on initial app load / refresh via syncCloudOnLogin.
  // Cross-tab sync remains active via localStorage events.


  // Handle Cross-Tab Synchronization
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === LOCAL_STORAGE_KEY && e.newValue) {
        try {
          isRemoteSyncingRef.current = true;
          const parsed = JSON.parse(e.newValue);
          if (parsed.xp !== undefined) setXp(parsed.xp);
          if (parsed.todos !== undefined) setTodos(parsed.todos);
          if (parsed.loggedTasksToday !== undefined) setLoggedTasksToday(parsed.loggedTasksToday);
          if (parsed.pendingTasks !== undefined) setPendingTasks(parsed.pendingTasks);
          if (parsed.history !== undefined) setHistory(parsed.history);
          if (parsed.practiceSessions !== undefined) setPracticeSessions(parsed.practiceSessions);
          if (parsed.questionsSolved !== undefined) setQuestionsSolved(parsed.questionsSolved);
          if (parsed.xpGainedToday !== undefined) setXpGainedToday(parsed.xpGainedToday);
          if (parsed.spentXpToday !== undefined) setSpentXpToday(parsed.spentXpToday);
          if (parsed.totalSpentXp !== undefined) setTotalSpentXp(parsed.totalSpentXp);
          if (parsed.hoursStudiedToday !== undefined) setHoursStudiedToday(parsed.hoursStudiedToday);
          if (parsed.level !== undefined) setLevel(parsed.level);
          if (parsed.streakDays !== undefined) setStreakDays(parsed.streakDays);
          if (parsed.lastStudyDate !== undefined) setLastStudyDate(parsed.lastStudyDate);
          if (parsed.focusBadges !== undefined) setFocusBadges(parsed.focusBadges);
          if (parsed.syllabus !== undefined) setSyllabus(parsed.syllabus);
          if (parsed.habits !== undefined) setHabits(parsed.habits);
          if (parsed.lifeMetrics !== undefined) setLifeMetrics(parsed.lifeMetrics);
          if (parsed.monthlyGoals !== undefined) setMonthlyGoals(parsed.monthlyGoals);
          if (parsed.dailyTarget !== undefined) setDailyTarget(parsed.dailyTarget);
          if (parsed.accuracy !== undefined) setAccuracy(parsed.accuracy);
          if (parsed.speedScore !== undefined) setSpeedScore(parsed.speedScore);
          if (parsed.equippedTitle !== undefined) setEquippedTitle(parsed.equippedTitle);
          if (parsed.equippedAura !== undefined) setEquippedAura(parsed.equippedAura);
          if (parsed.unlockedItems !== undefined) setUnlockedItems(parsed.unlockedItems);
          if (parsed.ongoingChapters !== undefined) setOngoingChapters(parsed.ongoingChapters);
          if (parsed.activeBoost !== undefined) setActiveBoost(parsed.activeBoost);
          if (parsed.playerName !== undefined) setPlayerName(parsed.playerName);
          if (parsed.class11EndDate !== undefined) setClass11EndDate(parsed.class11EndDate);
          if (parsed.isClass11SetupDone !== undefined) setIsClass11SetupDone(parsed.isClass11SetupDone);
          if (parsed.backlogPriorities !== undefined) setBacklogPriorities(parsed.backlogPriorities);
          if (parsed.backlogPlan !== undefined) setBacklogPlan(parsed.backlogPlan);
          if (parsed.totalXpGoal !== undefined) setTotalXpGoal(parsed.totalXpGoal);
          if (parsed.bossDayTargetXp !== undefined) setBossDayTargetXp(parsed.bossDayTargetXp);
          if (parsed.bossDayCompleted !== undefined) setBossDayCompleted(parsed.bossDayCompleted);
          if (parsed.lastBossDayDate !== undefined) setLastBossDayDate(parsed.lastBossDayDate);
          if (parsed.notificationSettings !== undefined) setNotificationSettings(parsed.notificationSettings);
          if (parsed.hasSeenRules !== undefined) setHasSeenRules(parsed.hasSeenRules);
          setTimeout(() => {
            isRemoteSyncingRef.current = false;
          }, 300);
        } catch (err) {
          console.error("Storage event parse error", err);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const latestStateRef = useRef<any>({});
  const pendingRolloverSaveRef = useRef<boolean>(false);

  useEffect(() => {
    latestStateRef.current = {
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
      lastSyncTimestamp: lastSyncTimestampRef.current,
    };

    if (pendingRolloverSaveRef.current) {
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
      if (Capacitor.isNativePlatform()) {
        Preferences.set({ key: LOCAL_STORAGE_KEY, value: jsonString });
      } else {
        localStorage.setItem(LOCAL_STORAGE_KEY, jsonString);
      }
      if (firebaseUser?.uid && isCloudSyncComplete) {
        lastSavedCloudJsonRef.current = jsonString;
        saveUserDataToCloud(firebaseUser.uid, stateToSave, true).then((ok) => {
          if (ok) {
            hasUnsavedLocalChangesRef.current = false;
          }
        });
      }
    }
  });

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
      if (!isLoaded || !isCloudSyncComplete) return false;
      const now = Date.now();
      lastSyncTimestampRef.current = now;
      const stateToSave = {
        ...latestStateRef.current,
        lastSyncTimestamp: now,
        ...overrides,
      };
      latestStateRef.current = stateToSave;
      const jsonString = JSON.stringify(stateToSave);
      if (Capacitor.isNativePlatform()) {
        await Preferences.set({ key: LOCAL_STORAGE_KEY, value: jsonString });
      } else {
        localStorage.setItem(LOCAL_STORAGE_KEY, jsonString);
      }

      if (firebaseUser?.uid) {
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

  const updateTask = useCallback((id: number | string, updates: Partial<Todo>) => {
    let updatedTodosList: Todo[] = [];
    setTodos((prev) => {
      updatedTodosList = prev.map((t) => {
        if (String(t.id) === String(id)) {
          const enriched = { ...t, ...updates };
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

    if (updates.completed !== undefined) {
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
    if (isSameLogicalDay(lastStudyDateRef.current, todayObj) && overrideSleep === undefined && overrideScreen === undefined) return; // Already studied today

    const state = latestStateRef.current;
    if (lastStudyDateRef.current) {
      const lastDate = new Date(lastStudyDateRef.current);
      const yesterday = getLogicalDate();
      yesterday.setDate(yesterday.getDate() - 1);

      let newStreak = state.streakDays || 0;
      if (lastDate.toDateString() === yesterday.toDateString()) {
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

  const completeRollover = useCallback((sleepInput: number, screenTimeInput: number) => {
    updateStreak(sleepInput, screenTimeInput);

    const yesterdayObj = getLogicalDate();
    yesterdayObj.setDate(yesterdayObj.getDate() - 1);
    const yesterdayStr = yesterdayObj.toDateString();

    setLifeMetrics((prev) => {
      const dayNum = yesterdayObj.getDate();
      const exists = prev.some((m) => m.day === dayNum);
      if (exists) {
        return prev.map((m) =>
          m.day === dayNum
            ? { ...m, sleep: sleepInput, screenTime: screenTimeInput }
            : m,
        );
      }
      return [...prev, { day: dayNum, sleep: sleepInput, screenTime: screenTimeInput }];
    });

    setHistory((prevHistory) => {
      let updated = [...prevHistory];
      const idx = updated.findIndex(
        (h) => new Date(h.date).toDateString() === yesterdayStr,
      );
      if (idx >= 0) {
        updated[idx] = {
          ...updated[idx],
          sleepTime: sleepInput,
          screenTime: screenTimeInput,
          aiFeedback: updated[idx].aiFeedback ?? undefined,
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
        });
      }
      return updated;
    });

    const todayKey = getStandardDateKey(getLogicalDate());
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(`rollover_completed_${todayKey}`, "true");
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
  ) => {
    if (attempted === 0 || chapters.length === 0) return;
    updateStreak();
    setQuestionsSolved((prev) => prev + attempted);

    const sessionAccuracy = Math.round((correct / attempted) * 100);
    setAccuracy((prev) =>
      prev === 0
        ? sessionAccuracy
        : Math.round(prev * 0.8 + sessionAccuracy * 0.2),
    );

    const minsPerQ = timeSpent / attempted;
    const sessionSpeed = Math.max(
      0,
      Math.min(100, Math.round(100 - (minsPerQ - 1) * 25)),
    );
    setSpeedScore((prev) =>
      prev === 0 ? sessionSpeed : Math.round(prev * 0.8 + sessionSpeed * 0.2),
    );

    const perChapAttempted = Math.max(
      1,
      Math.floor(attempted / chapters.length),
    );
    const perChapCorrect = Math.max(0, Math.floor(correct / chapters.length));
    const perChapTime = Math.max(1, Math.floor(timeSpent / chapters.length));

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
    addXp(attempted * 10 + correct * 5);
    setHoursStudiedToday((prev) => Math.min(24, prev + timeSpent / 60));
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
      await logout();
    } catch (e) {
      console.error("Error during logout:", e);
    }
    if (Capacitor.isNativePlatform()) {
      await Preferences.clear();
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      localStorage.removeItem("visited_tabs");
      localStorage.removeItem("app_tour_completed");
      localStorage.removeItem("store_items_state");
    }
    sessionStorage.clear();
    window.location.reload();
  }, []);

  const submitMissedDayReasons = useCallback((
    reasons: { date: string; reason: string }[],
  ) => {
    setHistory((prev) => {
      const updated = [...prev];
      reasons.forEach((r) => {
        const rDateStr = new Date(r.date).toDateString();
        const existingIdx = updated.findIndex(
          (h) => new Date(h.date).toDateString() === rDateStr,
        );
        if (existingIdx >= 0) {
          updated[existingIdx] = {
            ...updated[existingIdx],
            isMissed: true,
            missedReason: r.reason,
          };
        } else {
          updated.push({
            date: r.date,
            hoursStudied: 0,
            xpEarned: 0,
            completedTasks: [],
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

    const state = latestStateRef.current;
    const ongoing = state.ongoingChapters || ongoingChapters;
    if (ongoing[subj]) {
      return ongoing[subj];
    }

    const curTodos: Todo[] = state.todos || todos;
    const matchingTodos = curTodos
      .filter((t) => t.subject === subj && t.chapter)
      .sort((a, b) => String(b.id).localeCompare(String(a.id)));

    if (matchingTodos.length > 0) {
      return matchingTodos[0].chapter || null;
    }

    const curHistory: PlayHistoryEntry[] = state.history || history;
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

    const curSyllabus = state.syllabus || syllabus;
    const chapters = curSyllabus[subj as keyof typeof curSyllabus] || [];
    if (chapters.length > 0) {
      return chapters[0].name;
    }
    return null;
  }, [ongoingChapters, todos, history, syllabus]);

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
      const currentLocal = latestStateRef.current;
      const { mergedState } = reconcileState(currentLocal, cloudData);

      isRemoteSyncingRef.current = true;

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
      if (mergedState.class11EndDate !== undefined) setClass11EndDate(mergedState.class11EndDate);
      if (mergedState.isClass11SetupDone !== undefined) setIsClass11SetupDone(mergedState.isClass11SetupDone);
      if (mergedState.backlogPriorities !== undefined) setBacklogPriorities(mergedState.backlogPriorities);
      if (mergedState.backlogPlan !== undefined) setBacklogPlan(mergedState.backlogPlan);
      if (mergedState.todos !== undefined) setTodos(mergedState.todos);
      if (mergedState.loggedTasksToday !== undefined) setLoggedTasksToday(mergedState.loggedTasksToday);
      if (mergedState.pendingTasks !== undefined) setPendingTasks(mergedState.pendingTasks);
      if (mergedState.history !== undefined) setHistory(mergedState.history);
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

      latestStateRef.current = mergedState;
      const jsonString = JSON.stringify(mergedState);
      if (Capacitor.isNativePlatform()) {
        await Preferences.set({ key: LOCAL_STORAGE_KEY, value: jsonString });
      } else {
        localStorage.setItem(LOCAL_STORAGE_KEY, jsonString);
      }

      lastSavedCloudJsonRef.current = jsonString;
      hasUnsavedLocalChangesRef.current = false;

      setTimeout(() => {
        isRemoteSyncingRef.current = false;
        setIsCloudSyncComplete(true);
      }, 300);

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
  }, [firebaseUser]);

  const exportLocalBackup = useCallback(() => {
    try {
      const stateToExport = latestStateRef.current;
      const jsonString = JSON.stringify(stateToExport, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const dateStr = new Date().toISOString().split("T")[0];
      a.href = url;
      a.download = `jee_tracker_backup_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Failed to export local backup:", e);
    }
  }, []);

  const importLocalBackup = useCallback((jsonContent: string): { success: boolean; message: string } => {
    try {
      const parsed = JSON.parse(jsonContent);
      if (!parsed || typeof parsed !== "object") {
        return { success: false, message: "Invalid backup JSON file format." };
      }
      const currentLocal = latestStateRef.current;
      const { mergedState } = reconcileState(currentLocal, parsed);

      isRemoteSyncingRef.current = true;

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
      if (mergedState.class11EndDate !== undefined) setClass11EndDate(mergedState.class11EndDate);
      if (mergedState.isClass11SetupDone !== undefined) setIsClass11SetupDone(mergedState.isClass11SetupDone);
      if (mergedState.backlogPriorities !== undefined) setBacklogPriorities(mergedState.backlogPriorities);
      if (mergedState.backlogPlan !== undefined) setBacklogPlan(mergedState.backlogPlan);
      if (mergedState.todos !== undefined) setTodos(mergedState.todos);
      if (mergedState.loggedTasksToday !== undefined) setLoggedTasksToday(mergedState.loggedTasksToday);
      if (mergedState.pendingTasks !== undefined) setPendingTasks(mergedState.pendingTasks);
      if (mergedState.history !== undefined) setHistory(mergedState.history);
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

      latestStateRef.current = mergedState;
      const jsonString = JSON.stringify(mergedState);
      if (Capacitor.isNativePlatform()) {
        Preferences.set({ key: LOCAL_STORAGE_KEY, value: jsonString });
      } else {
        localStorage.setItem(LOCAL_STORAGE_KEY, jsonString);
      }

      setTimeout(() => {
        isRemoteSyncingRef.current = false;
      }, 300);

      return { success: true, message: `Backup restored successfully (${mergedState.xp || 0} XP, ${(mergedState.todos || []).length} tasks)!` };
    } catch (e: any) {
      return { success: false, message: `Failed to parse backup file: ${e?.message || String(e)}` };
    }
  }, []);

  const scheduleBacklogTask = useCallback(
    async (task: Todo): Promise<void> => {
      const updatedPending = pendingTasks.filter((pt) => String(pt.id) !== String(task.id));
      const taskToMove: Todo = {
        ...task,
        completed: false,
        startTime: task.startTime || new Date().toISOString(),
      };
      const updatedTodos = [...todos.filter((t) => String(t.id) !== String(task.id)), taskToMove];

      setPendingTasks(updatedPending);
      setTodos(updatedTodos);

      await saveStateToCloudNow({
        pendingTasks: updatedPending,
        todos: updatedTodos,
      });
    },
    [pendingTasks, todos, saveStateToCloudNow],
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
      activeBoost,
      class11EndDate,
      setClass11EndDate,
      totalXpGoal,
      setTotalXpGoal,
      isClass11SetupDone,
      setIsClass11SetupDone,
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
    }),
    [
      showWelcomeHero,
      triggerWelcomeScreen,
      dismissWelcomeHero,
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
