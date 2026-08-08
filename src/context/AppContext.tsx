import {
  logout,
  saveUserDataToCloud,
  subscribeToCloudUserData,
  loadUserDataFromCloud,
} from "@/lib/firebase";
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
  id: number;
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
}

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
  updateTask: (id: number, updates: Partial<Todo>) => void;
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
  setNeedsRollover: (val: boolean) => void;
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
}

const AppContext = createContext<AppState | undefined>(undefined);

export const getLogicalDate = (customRolloverTime?: string) => {
  const d = new Date();
  let offset = 3;
  let timeStr = customRolloverTime;
  if (!timeStr) {
    try {
      const saved = localStorage.getItem("app_settings_extended");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.rolloverTime) {
          timeStr = parsed.rolloverTime;
        }
      }
    } catch (e) {}
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

const LOCAL_STORAGE_KEY = "jee_tracker_state";

export function AppProvider({ children }: { children: ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [needsRollover, setNeedsRollover] = useState(false);
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
          if (
            parsed.lastStudyDate &&
            parsed.lastStudyDate !== todayDateString
          ) {
            setNeedsRollover(true);

            // Check for missed days or underperformance
            const lastDate = new Date(parsed.lastStudyDate);
            const missingDates = [];

            // Calculate historical average XP (removed)

            // If they didn't do anything or underperformed significantly on the last active day
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
          setClass11EndDate(parsed.class11EndDate || null);
          setTotalXpGoal(parsed.totalXpGoal || 800000);
          setIsClass11SetupDone(
            parsed.class11EndDate ? parsed.isClass11SetupDone || false : false,
          );
          setBacklogPriorities(parsed.backlogPriorities || {});
          setHasSeenRules(parsed.hasSeenRules || false);

          const loadedTodos = parsed.todos || [];
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

          // Remove fake data based on fake task names, but DO NOT delete historical entries for new months.
          loadedHistory = loadedHistory.filter((entry: any) => {
            const hasFakeTasks = entry.completedTasks?.some(
              (t: any) =>
                t.text === "Completed Physics Module" ||
                t.text === "Chemistry PYQs",
            );
            if (hasFakeTasks) return false;
            return true;
          });

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
          setLevel(parsed.level || 1);
          setStreakDays(parsed.streakDays || 0);
          setLastStudyDate(parsed.lastStudyDate || null);
          setDailyTarget(parsed.dailyTarget || 100);
          setAccuracy(parsed.accuracy || 0);
          setSpeedScore(parsed.speedScore || 0);
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
    lastLocalMutationTimeRef.current = Date.now();

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
    };
    const jsonString = JSON.stringify(stateToSave);

    const localTimeoutId = setTimeout(() => {
      if (Capacitor.isNativePlatform()) {
        Preferences.set({ key: LOCAL_STORAGE_KEY, value: jsonString });
      } else {
        localStorage.setItem(LOCAL_STORAGE_KEY, jsonString);
      }
    }, 200);

    // Auto-save debounce set to 1000ms (1 second)
    const cloudDelay = 1000;

    const cloudTimeoutId = setTimeout(() => {
      if (
        firebaseUser?.uid &&
        isCloudSyncComplete &&
        !isRemoteSyncingRef.current &&
        !isCalendarPreviewOpenRef.current
      ) {
        if (jsonString !== lastSavedCloudJsonRef.current) {
          lastSavedCloudJsonRef.current = jsonString;
          saveUserDataToCloud(firebaseUser.uid, stateToSave, false);
        }
      }
    }, cloudDelay);

    const flushCloudSave = () => {
      const currentJson = JSON.stringify(stateToSave);
      if (Capacitor.isNativePlatform()) {
        Preferences.set({ key: LOCAL_STORAGE_KEY, value: currentJson });
      } else {
        localStorage.setItem(LOCAL_STORAGE_KEY, currentJson);
      }
      if (
        firebaseUser?.uid &&
        isCloudSyncComplete &&
        !isRemoteSyncingRef.current &&
        currentJson !== lastSavedCloudJsonRef.current
      ) {
        lastSavedCloudJsonRef.current = currentJson;
        saveUserDataToCloud(firebaseUser.uid, stateToSave, true);
      }
    };

    const handleBeforeUnload = () => {
      flushCloudSave();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushCloudSave();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    let capAppStateListener: any = null;
    if (Capacitor.isNativePlatform()) {
      CapApp.addListener("appStateChange", (state) => {
        if (!state.isActive) {
          flushCloudSave();
        }
      }).then((listener) => {
        capAppStateListener = listener;
      });
    }

    return () => {
      clearTimeout(localTimeoutId);
      clearTimeout(cloudTimeoutId);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (capAppStateListener) {
        capAppStateListener.remove();
      }
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

  // Initial Cloud Data Fetch on Auth to ensure cloud state is single source of truth
  useEffect(() => {
    if (!firebaseUser?.uid) {
      setIsCloudSyncComplete(true);
      return;
    }

    setIsCloudSyncComplete(false);
    let cancelled = false;

    const syncCloudOnLogin = async () => {
      try {
        const cloudData = await loadUserDataFromCloud(firebaseUser.uid);
        if (cancelled) return;

        if (!cloudData) {
          // If no cloud data exists, seed initial user doc to Firestore
          const initialStateToSave = {
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
          };
          await saveUserDataToCloud(firebaseUser.uid, initialStateToSave, true);
          lastSavedCloudJsonRef.current = JSON.stringify(initialStateToSave);
          setIsCloudSyncComplete(true);
          return;
        }

        const todayStr = getLogicalDate(cloudData.notificationSettings?.rolloverTime).toDateString();
        const isCloudToday = cloudData.lastStudyDate === todayStr;

        isRemoteSyncingRef.current = true;

        if (isCloudToday) {
          setNeedsRollover(false);
          setPendingMissedDays([]);
          setLastStudyDate(todayStr);
          setXpGainedToday(cloudData.xpGainedToday ?? 0);
          setHoursStudiedToday(cloudData.hoursStudiedToday ?? 0);
          setSpentXpToday(cloudData.spentXpToday ?? 0);
          setLoggedTasksToday(cloudData.loggedTasksToday ?? []);
          if (cloudData.todos !== undefined) setTodos(cloudData.todos);
          if (cloudData.pendingTasks !== undefined) setPendingTasks(cloudData.pendingTasks);
          if (cloudData.history !== undefined) setHistory(cloudData.history);
        } else if (cloudData.lastStudyDate) {
          setLastStudyDate(cloudData.lastStudyDate);
          setNeedsRollover(true);
          if (cloudData.xpGainedToday !== undefined) setXpGainedToday(cloudData.xpGainedToday);
          if (cloudData.hoursStudiedToday !== undefined) setHoursStudiedToday(cloudData.hoursStudiedToday);
          if (cloudData.todos !== undefined) setTodos(cloudData.todos);
          if (cloudData.pendingTasks !== undefined) setPendingTasks(cloudData.pendingTasks);
          if (cloudData.history !== undefined) setHistory(cloudData.history);
        } else {
          setLastStudyDate(todayStr);
          setNeedsRollover(false);
        }

        if (cloudData.xp !== undefined) setXp(cloudData.xp);
        if (cloudData.level !== undefined) setLevel(cloudData.level);
        if (cloudData.streakDays !== undefined) setStreakDays(cloudData.streakDays);
        if (cloudData.questionsSolved !== undefined) setQuestionsSolved(cloudData.questionsSolved);
        if (cloudData.dailyTarget !== undefined) setDailyTarget(cloudData.dailyTarget);
        if (cloudData.syllabus !== undefined) setSyllabus(cloudData.syllabus);
        if (cloudData.playerName !== undefined) setPlayerName(cloudData.playerName);
        if (cloudData.equippedTitle !== undefined) setEquippedTitle(cloudData.equippedTitle);
        if (cloudData.equippedAura !== undefined) setEquippedAura(cloudData.equippedAura);
        if (cloudData.unlockedItems !== undefined) setUnlockedItems(cloudData.unlockedItems);
        if (cloudData.habits !== undefined) setHabits(cloudData.habits);
        if (cloudData.lifeMetrics !== undefined) setLifeMetrics(cloudData.lifeMetrics);
        if (cloudData.practiceSessions !== undefined) setPracticeSessions(cloudData.practiceSessions);
        if (cloudData.ongoingChapters !== undefined) setOngoingChapters(cloudData.ongoingChapters);
        if (cloudData.totalSpentXp !== undefined) setTotalSpentXp(cloudData.totalSpentXp);
        if (cloudData.accuracy !== undefined) setAccuracy(cloudData.accuracy);
        if (cloudData.speedScore !== undefined) setSpeedScore(cloudData.speedScore);
        if (cloudData.focusBadges !== undefined) setFocusBadges(cloudData.focusBadges);
        if (cloudData.activeBoost !== undefined) setActiveBoost(cloudData.activeBoost);
        if (cloudData.class11EndDate !== undefined) setClass11EndDate(cloudData.class11EndDate);
        if (cloudData.isClass11SetupDone !== undefined) setIsClass11SetupDone(cloudData.isClass11SetupDone);
        if (cloudData.backlogPriorities !== undefined) setBacklogPriorities(cloudData.backlogPriorities);
        if (cloudData.hasSeenRules !== undefined) setHasSeenRules(cloudData.hasSeenRules);
        if (cloudData.monthlyGoals !== undefined) setMonthlyGoals(cloudData.monthlyGoals);
        if (cloudData.lastBossDayDate !== undefined) setLastBossDayDate(cloudData.lastBossDayDate);
        if (cloudData.bossDayTargetXp !== undefined) setBossDayTargetXp(cloudData.bossDayTargetXp);
        if (cloudData.bossDayCompleted !== undefined) setBossDayCompleted(cloudData.bossDayCompleted);
        if (cloudData.notificationSettings !== undefined) setNotificationSettings(cloudData.notificationSettings);
        if (cloudData.totalXpGoal !== undefined) setTotalXpGoal(cloudData.totalXpGoal);

        lastSavedCloudJsonRef.current = JSON.stringify(cloudData);

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
  }, [firebaseUser]);

  // Real-Time Cloud Listener with Non-Reverting Smart Sync
  useEffect(() => {
    if (!firebaseUser?.uid || !isCloudSyncComplete) return;

    const unsubscribeCloud = subscribeToCloudUserData(
      firebaseUser.uid,
      (cloudData, metadata) => {
        if (!cloudData) return;

        // Skip local optimistic write snapshots
        if (metadata?.hasPendingWrites) return;

        const cloudJson = JSON.stringify(cloudData);
        if (cloudJson === lastSavedCloudJsonRef.current) return;

        lastSavedCloudJsonRef.current = cloudJson;
        isRemoteSyncingRef.current = true;

        const todayStr = getLogicalDate(cloudData.notificationSettings?.rolloverTime).toDateString();
        const isCloudToday = cloudData.lastStudyDate === todayStr;

        if (isCloudToday) {
          setNeedsRollover(false);
          setPendingMissedDays([]);
          setLastStudyDate(todayStr);
          if (cloudData.xpGainedToday !== undefined) setXpGainedToday(cloudData.xpGainedToday);
          if (cloudData.hoursStudiedToday !== undefined) setHoursStudiedToday(cloudData.hoursStudiedToday);
          if (cloudData.spentXpToday !== undefined) setSpentXpToday(cloudData.spentXpToday);
          if (cloudData.loggedTasksToday !== undefined) setLoggedTasksToday(cloudData.loggedTasksToday);
          if (cloudData.todos !== undefined) setTodos(cloudData.todos);
          if (cloudData.pendingTasks !== undefined) setPendingTasks(cloudData.pendingTasks);
          if (cloudData.history !== undefined) setHistory(cloudData.history);
        } else if (cloudData.lastStudyDate && cloudData.lastStudyDate !== lastStudyDateRef.current) {
          setLastStudyDate(cloudData.lastStudyDate);
          if (cloudData.xpGainedToday !== undefined) setXpGainedToday(cloudData.xpGainedToday);
          if (cloudData.hoursStudiedToday !== undefined) setHoursStudiedToday(cloudData.hoursStudiedToday);
          if (cloudData.todos !== undefined) setTodos(cloudData.todos);
          if (cloudData.pendingTasks !== undefined) setPendingTasks(cloudData.pendingTasks);
          if (cloudData.history !== undefined) setHistory(cloudData.history);
        }

        // Progression updates
        if (cloudData.xp !== undefined) setXp((prev) => Math.max(prev, cloudData.xp));
        if (cloudData.level !== undefined) setLevel((prev) => Math.max(prev, cloudData.level));
        if (cloudData.questionsSolved !== undefined)
          setQuestionsSolved((prev) => Math.max(prev, cloudData.questionsSolved));
        if (cloudData.streakDays !== undefined)
          setStreakDays((prev) => Math.max(prev, cloudData.streakDays));

        if (cloudData.syllabus !== undefined) setSyllabus(cloudData.syllabus);
        if (cloudData.playerName !== undefined) setPlayerName(cloudData.playerName);
        if (cloudData.equippedTitle !== undefined) setEquippedTitle(cloudData.equippedTitle);
        if (cloudData.equippedAura !== undefined) setEquippedAura(cloudData.equippedAura);
        if (cloudData.unlockedItems !== undefined) setUnlockedItems(cloudData.unlockedItems);
        if (cloudData.habits !== undefined) setHabits(cloudData.habits);
        if (cloudData.lifeMetrics !== undefined) setLifeMetrics(cloudData.lifeMetrics);
        if (cloudData.practiceSessions !== undefined) setPracticeSessions(cloudData.practiceSessions);
        if (cloudData.ongoingChapters !== undefined) setOngoingChapters(cloudData.ongoingChapters);
        if (cloudData.totalSpentXp !== undefined) setTotalSpentXp(cloudData.totalSpentXp);
        if (cloudData.dailyTarget !== undefined) setDailyTarget(cloudData.dailyTarget);
        if (cloudData.accuracy !== undefined) setAccuracy(cloudData.accuracy);
        if (cloudData.speedScore !== undefined) setSpeedScore(cloudData.speedScore);
        if (cloudData.focusBadges !== undefined) setFocusBadges(cloudData.focusBadges);
        if (cloudData.activeBoost !== undefined) setActiveBoost(cloudData.activeBoost);
        if (cloudData.class11EndDate !== undefined) setClass11EndDate(cloudData.class11EndDate);
        if (cloudData.isClass11SetupDone !== undefined) setIsClass11SetupDone(cloudData.isClass11SetupDone);
        if (cloudData.backlogPriorities !== undefined) setBacklogPriorities(cloudData.backlogPriorities);
        if (cloudData.hasSeenRules !== undefined) setHasSeenRules(cloudData.hasSeenRules);
        if (cloudData.monthlyGoals !== undefined) setMonthlyGoals(cloudData.monthlyGoals);
        if (cloudData.lastBossDayDate !== undefined) setLastBossDayDate(cloudData.lastBossDayDate);
        if (cloudData.bossDayTargetXp !== undefined) setBossDayTargetXp(cloudData.bossDayTargetXp);
        if (cloudData.bossDayCompleted !== undefined) setBossDayCompleted(cloudData.bossDayCompleted);
        if (cloudData.notificationSettings !== undefined) setNotificationSettings(cloudData.notificationSettings);
        if (cloudData.totalXpGoal !== undefined) setTotalXpGoal(cloudData.totalXpGoal);

        setTimeout(() => {
          isRemoteSyncingRef.current = false;
        }, 300);
      },
    );

    return () => {
      unsubscribeCloud();
    };
  }, [firebaseUser, isCloudSyncComplete]);

  // Handle Cross-Tab Synchronization
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === LOCAL_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setXp(parsed.xp || 0);
          setTodos(parsed.todos || []);
          setPendingTasks(parsed.pendingTasks || []);
          setHistory(parsed.history || []);
          setPracticeSessions(parsed.practiceSessions || []);
          setQuestionsSolved(parsed.questionsSolved || 0);
          // Update other fast-changing visual stats if needed
          setXpGainedToday(parsed.xpGainedToday || 0);
          setSpentXpToday(parsed.spentXpToday || 0);
          setTotalSpentXp(parsed.totalSpentXp || 0);
          setHoursStudiedToday(parsed.hoursStudiedToday || 0);
          setEquippedTitle(parsed.equippedTitle || "");
          setEquippedAura(parsed.equippedAura || "");
          setUnlockedItems(parsed.unlockedItems || []);
          setOngoingChapters(parsed.ongoingChapters || {});
        } catch (err) {
          console.error("Storage event parse error", err);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const latestStateRef = useRef<any>({});

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
    };
  });

  const updateTask = (id: number, updates: Partial<Todo>) => {
    let updatedTodosList: Todo[] = [];
    setTodos((prev) => {
      updatedTodosList = prev.map((t) =>
        t.id === id ? { ...t, ...updates } : t,
      );
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
  };

  const completeRollover = (sleepInput: number, screenTimeInput: number) => {
    updateStreak(sleepInput, screenTimeInput);
    setTimeout(() => {
      saveStateToCloudNow();
    }, 100);
  };

  // Check and update streak on load or when logging session
  const updateStreak = (overrideSleep?: number, overrideScreen?: number) => {
    const today = getLogicalDate().toDateString();
    if (lastStudyDateRef.current === today) return; // Already studied today

    if (lastStudyDateRef.current) {
      const lastDate = new Date(lastStudyDateRef.current);
      const yesterday = getLogicalDate();
      yesterday.setDate(yesterday.getDate() - 1);

      let newStreak = streakDays;
      if (lastDate.toDateString() === yesterday.toDateString()) {
        let currentTarget = dailyTarget;
        if (class11EndDate) {
          const class11EndTimestamp = new Date(class11EndDate).getTime();
          const daysUntilExam = Math.max(
            1,
            Math.ceil((class11EndTimestamp - Date.now()) / (1000 * 3600 * 24)),
          );
          const totalXpRequired = Math.max(0, totalXpGoal - xp);
          currentTarget = Math.max(
            100,
            Math.ceil(totalXpRequired / daysUntilExam),
          );
        }

        const minimumRequiredXp = Math.floor(currentTarget * 0.4);
        const meetsThreshold =
          xpGainedToday >= minimumRequiredXp ||
          todos.filter((t) => t.completed).length >= 2 ||
          (loggedTasksToday.length >= 1 &&
            xpGainedToday >= minimumRequiredXp / 2);

        if (!meetsThreshold) {
          if (streakDays > 1) {
            setConsistencyBroken(true);
          }
          newStreak = 1;
        } else {
          newStreak = streakDays + 1;
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

        if (streakDays > 1) {
          setConsistencyBroken(true);
        }
        setStreakDays(1); // Streak broken
      }

      // -- NEW DAILY ROLLOVER LOGIC --
      const completedTasks = todos.filter((t) => t.completed);
      const uncompletedTasks = todos.filter((t) => !t.completed);
      const curXpGainedToday = xpGainedToday;

      // Update life metrics if overrides provided
      if (overrideSleep !== undefined || overrideScreen !== undefined) {
        setLifeMetrics((prev) => {
          // we use getDate() which is 1-31.
          const dayNum = new Date(lastStudyDate).getDate();
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

        // 1. Log the actual last active date
        if (
          !updatedHistory.some(
            (h) => new Date(h.date).toDateString() === lastDate.toDateString(),
          )
        ) {
          const isLastDateYesterday =
            lastDate.toDateString() === yesterday.toDateString();
          let lifeM = lifeMetrics.find((m) => m.day === lastDate.getDate());
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

          updatedHistory.push({
            date: lastDate.toISOString(),
            hoursStudied: Number(hoursStudiedToday.toFixed(1)),
            xpEarned: curXpGainedToday,
            completedTasks: [...completedTasks, ...loggedTasksToday],
            plannedTasks: [...todos, ...loggedTasksToday],
            sleepTime: sleepUsed,
            screenTime: screenUsed,
          });
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
      const backlogCandidates = uncompletedTasks.filter((t) => {
        if (!t.startTime) return true; // Unscheduled tasks go to backlog
        const taskDayStr = new Date(t.startTime).toDateString();
        return taskDayStr === lastDateStr; // Only tasks scheduled for the rolled-over day go to backlog
      });

      if (backlogCandidates.length > 0) {
        setPendingTasks((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const newPendings = backlogCandidates.filter(
            (u) => !existingIds.has(u.id),
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
    setHasSeenReminder(false);
    setXpGainedToday(0); // Reset daily XP on a new day
    setSpentXpToday(0); // Reset daily spent XP
    setHoursStudiedToday(0); // Reset daily hours
    setQuestionsSolved(0); // Reset daily questions tracker

    // Evaluate Boss Day logic
    if (lastBossDayDate !== today) {
      const now = new Date(today).getTime();
      const last7DaysEntries = history.filter((h) => {
        const daysDiff =
          (now - new Date(h.date).getTime()) / (1000 * 3600 * 24);
        return daysDiff <= 7 && daysDiff > 0;
      });

      const productiveDays = last7DaysEntries.filter(
        (h) => h.hoursStudied >= 1.5 || h.xpEarned > 300,
      ).length;
      const weeklyXp = last7DaysEntries.reduce((acc, h) => acc + h.xpEarned, 0);
      const zeroProgressDays = last7DaysEntries.filter(
        (h) => h.xpEarned === 0,
      ).length;
      const missingDays = 7 - last7DaysEntries.length;
      const hasNoZeroProgressDays = zeroProgressDays + missingDays === 0;

      // Consistency requirement: at least 4 productive days AND decent XP, OR perfectly consistent log without zero days
      const isConsistent =
        (productiveDays >= 4 && weeklyXp >= 2000) ||
        (hasNoZeroProgressDays && last7DaysEntries.length === 7);

      // Trigger on 7-day milestones, but ONLY if consistent
      if (isConsistent && streakDays > 0 && streakDays % 7 === 0) {
        setLastBossDayDate(today);
        setBossDayCompleted(false);
        const avgXpLast7 =
          last7DaysEntries.length > 0
            ? weeklyXp / last7DaysEntries.length
            : 1000;
        // Strategy: The boss day must be significantly harder than the standard daily target to be epic
        // Use the current standard dailyTarget, boost it by 500, or use avg + 800, whichever is highest
        const newTargetXp = Math.max(
          1500,
          dailyTarget + 500,
          Math.floor(avgXpLast7 + 800),
        );
        setBossDayTargetXp(newTargetXp);
      }
    }
  };

  const getStreakMultiplier = () => {
    if (streakDays >= 14) return 1.5;
    if (streakDays >= 7) return 1.2;
    if (streakDays >= 3) return 1.1;
    return 1.0;
  };

  const addXp = (amount: number): number => {
    lastCalendarMutationTimeRef.current = 0;
    updateStreak();
    let finalAmount = amount * getStreakMultiplier();

    // Apply active boost if valid
    if (activeBoost && activeBoost.expiresAt > Date.now()) {
      finalAmount *= activeBoost.multiplier;
    } else if (activeBoost && activeBoost.expiresAt <= Date.now()) {
      setActiveBoost(null); // Clear expired boost
    }

    const roundedFinal = Math.round(finalAmount);

    const currentXp = xp;
    const newXpVal = currentXp + roundedFinal;
    const newLevelVal = Math.min(
      100,
      Math.floor(Math.pow(newXpVal / totalXpGoal, 0.5) * 99) + 1,
    );

    setXp(newXpVal);
    setLevel(newLevelVal);

    setXpGainedToday((prev) => {
      const newXpGained = prev + roundedFinal;
      // Check boss day completion
      if (
        lastBossDayDate === getLogicalDate().toDateString() &&
        bossDayTargetXp &&
        !bossDayCompleted &&
        newXpGained >= bossDayTargetXp
      ) {
        setPendingBossDayBonus(true); // slight delay to avoid state overlap issues
      }
      return newXpGained;
    });

    queueMicrotask(() => {
      saveStateToCloudNow({ xp: newXpVal, level: newLevelVal });
    });

    return roundedFinal;
  };

  const logSession = (
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
      id: Date.now().toString() + i,
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
        const existingSubj = syllabus[subject as keyof SyllabusData];
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
  };

  const logFocusSession = (durationMins: number, isDeepFocus: boolean) => {
    updateStreak();
    setHoursStudiedToday((prev) => Math.min(24, prev + durationMins / 60));

    // Calculate session XP based on Option A: Linear & Scaled Down
    // If the session is Deep Focus OR duration >= 90 mins (1 hour 30 mins), rate is 2 XP/min
    const rate = isDeepFocus || durationMins >= 90 ? 2 : 1;
    const sessionXp = durationMins * rate;

    // Deep Work Bonus: > 90 mins
    if (isDeepFocus && durationMins >= 90) {
      setFocusBadges((prev) => prev + 1);
      // Removed the 500 flat bonus per new constraints, but keeping the boost
      // Grant a 2x XP boost for the next 2 hours
      setActiveBoost({
        multiplier: 2.0,
        expiresAt: Date.now() + 2 * 60 * 60 * 1000,
      });
    }

    addXp(Math.round(sessionXp));
  };

  const updateChapterStats = (
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
  };

  const resetApp = async () => {
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
  };

  const submitMissedDayReasons = (
    reasons: { date: string; reason: string }[],
  ) => {
    setHistory((prev) => {
      const newEntries = reasons.map((r) => ({
        date: r.date,
        hoursStudied: 0,
        xpEarned: 0,
        completedTasks: [],
        screenTime: 0,
        sleepTime: 0,
        isMissed: true,
        missedReason: r.reason,
      }));
      return [...prev, ...newEntries];
    });
    setPendingMissedDays([]);
  };

  const getCurrentChapterForSubject = (subj: string) => {
    if (!subj || !["Physics", "Chemistry", "Mathematics"].includes(subj))
      return null;

    if (ongoingChapters[subj]) {
      return ongoingChapters[subj];
    }

    const matchingTodos = todos
      .filter((t) => t.subject === subj && t.chapter)
      .sort((a, b) => b.id - a.id);

    if (matchingTodos.length > 0) {
      return matchingTodos[0].chapter;
    }

    if (history && history.length > 0) {
      const sortedHistory = [...history].sort(
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

    const chapters = syllabus[subj as keyof typeof syllabus] || [];
    if (chapters.length > 0) {
      return chapters[0].name;
    }
    return null;
  };

  const saveStateToCloudNow = useCallback(
    async (overrides?: Partial<Record<string, any>>): Promise<boolean> => {
      if (!isLoaded) return false;
      const stateToSave = {
        ...latestStateRef.current,
        ...overrides,
      };
      const jsonString = JSON.stringify(stateToSave);
      if (Capacitor.isNativePlatform()) {
        await Preferences.set({ key: LOCAL_STORAGE_KEY, value: jsonString });
      } else {
        localStorage.setItem(LOCAL_STORAGE_KEY, jsonString);
      }

      if (firebaseUser?.uid) {
        lastSavedCloudJsonRef.current = jsonString;
        return await saveUserDataToCloud(firebaseUser.uid, stateToSave, true);
      }
      return true;
    },
    [isLoaded, firebaseUser],
  );

  const notifyCalendarPreviewClosed = useCallback(() => {
    isCalendarPreviewOpenRef.current = false;
    if (calendarSyncTimerRef.current) {
      clearTimeout(calendarSyncTimerRef.current);
    }
    // Schedule cloud sync 1 minute (60,000 ms) after calendar preview is closed
    calendarSyncTimerRef.current = setTimeout(() => {
      calendarSyncTimerRef.current = null;
      saveStateToCloudNow();
    }, 60000);
  }, [saveStateToCloudNow]);

  const scheduleBacklogTask = useCallback(
    async (task: Todo): Promise<void> => {
      const updatedPending = pendingTasks.filter((pt) => pt.id !== task.id);
      const taskToMove: Todo = {
        ...task,
        completed: false,
        startTime: task.startTime || new Date().toISOString(),
      };
      const updatedTodos = [...todos.filter((t) => t.id !== task.id), taskToMove];

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
      needsRollover,
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
    }),
    [
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
      needsRollover,
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
      getCurrentChapterForSubject,
      saveStateToCloudNow,
      scheduleBacklogTask,
      notifyCalendarPreviewOpened,
      notifyCalendarPreviewClosed,
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
