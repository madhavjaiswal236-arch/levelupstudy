import React, { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { StudyCalendar } from "@/components/StudyCalendar";

import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TiltWrapper } from "@/components/TiltWrapper";
import {
  Play,
  Flame,
  Trophy,
  CheckSquare,
  Plus,
  Trash2,
  Circle,
  CheckCircle2,
  AlertTriangle,
  Skull,
  Lightbulb,
  CalendarClock,
  Zap,
  Clock,
  Square,
  RefreshCw,
  BookOpen,
  Target,
  Shield,
  ShieldAlert,
  BrainCircuit,
  Timer,
  Settings,
  Activity,
  Calendar,
  Maximize,
  EyeOff,
  MousePointerClick,
  Lock as LockIcon,
  AlertCircle,
} from "lucide-react";
import { useAppContext, SyllabusData } from "@/context/AppContext";
import TimeBar from "@/components/TimeBar";
import JeeSessionLogger from "@/components/JeeSessionLogger";
import { predictNextLecture } from "@/lib/utils";
import { DeepFocusOverlay } from "@/components/DeepFocusOverlay";
import { ImmersiveTimer } from "@/components/ImmersiveTimer";
import AnimatedNumber from "@/components/AnimatedNumber";
import { getRankInfo } from "@/lib/utils";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  deleteGoogleTask,
  createGoogleTask,
  updateGoogleTaskStatus,
  markCalendarEventCompleted,
} from "@/lib/calendar";
import {
  getAccessToken,
  getAccessTokenSync,
  googleSignIn,
} from "@/lib/firebase";
import { getDynamicInsight } from "@/lib/gemini";
import { TourStep, useTour } from "@/components/TourGuide";
import { LiveDayOverlay } from "@/components/LiveDayOverlay";
import { HAPTIC_PATTERNS, vibrate } from "@/lib/haptics";
import { useHaptic } from "@/hooks/useHaptic";
import confetti from "canvas-confetti";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableTodoItem } from "@/components/SortableTodoItem";

const SessionActiveButton = React.memo(function SessionActiveButton({
  sessionStartTime,
  onStop,
}: {
  sessionStartTime: number;
  onStop: () => void;
}) {
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - sessionStartTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionStartTime]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex items-stretch md:items-center gap-2 md:gap-3 w-full md:w-auto">
      <div className="flex-1 md:flex-none justify-center bg-red-500/10 border border-red-500/30 px-3 py-2 rounded-xl md:rounded-lg dark:text-red-400 text-red-700 font-mono font-bold text-lg md:text-xl flex items-center gap-2 animate-pulse">
        <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-red-500 shrink-0" />
        {formatTime(elapsedTime)}
      </div>
      <Button
        onClick={onStop}
        variant="destructive"
        size="lg"
        className="flex-1 md:flex-none gap-1 md:gap-2 font-bold tracking-widest shadow-md group overflow-hidden h-auto py-2 md:py-0 rounded-xl md:rounded-lg text-xs md:text-sm"
      >
        <motion.div
          whileHover={{ scale: 1.2, rotate: 90 }}
          transition={{ type: "spring", stiffness: 200, damping: 10 }}
        >
          <Square className="w-4 h-4 md:w-5 md:h-5 fill-current shadow-sm" />
        </motion.div>
        END
      </Button>
    </div>
  );
});

const UncontrolledInput = React.memo(function UncontrolledInput({
  placeholder,
  type = "text",
  autoFocus = false,
  onSubmit,
  buttonText,
  className,
}: any) {
  const [val, setVal] = React.useState("");
  return (
    <div className="flex gap-3">
      <input
        type={type}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (val || "").trim())
            onSubmit((val || "").trim());
        }}
        placeholder={placeholder}
        className={
          className ||
          "flex-1 dark:bg-black bg-white border dark:border-slate-700 border-slate-300 rounded-lg px-4 py-2 dark:text-white text-slate-900 focus:border-cyan-500 outline-none"
        }
        autoFocus={autoFocus}
      />
      <Button
        variant="default"
        className="bg-cyan-600 hover:bg-cyan-500 text-white"
        onClick={() => {
          if ((val || "").trim()) onSubmit((val || "").trim());
        }}
      >
        {buttonText}
      </Button>
    </div>
  );
});

const getGlowClass = (color?: string) => {
  if (!color) return "";
  const c = color.toLowerCase();
  if (c.includes("amber") || c.includes("yellow")) return "icon-glow-amber";
  if (c.includes("cyan")) return "icon-glow-cyan";
  if (c.includes("purple") || c.includes("pink")) return "icon-glow-purple";
  if (c.includes("blue")) return "icon-glow-blue";
  if (c.includes("rose") || c.includes("red")) return "icon-glow-rose";
  if (c.includes("emerald") || c.includes("green")) return "icon-glow-emerald";
  return "icon-glow-amber";
};

const CalendarCheckbox = ({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (c: boolean) => void;
}) => (
  <div
    onClick={() => onChange(!checked)}
    className={`flex items-center gap-3 p-3 rounded-xl border border-dashed transition-all cursor-pointer select-none group mt-2 ${checked ? "dark:bg-cyan-950/30 bg-cyan-50 dark:border-cyan-500/50 border-cyan-400 shadow-sm shadow-cyan-500/10" : "dark:bg-black/50 bg-slate-50 dark:border-slate-800 border-slate-300 dark:hover:bg-slate-900 hover:bg-slate-100"}`}
  >
    <div
      className={`w-5 h-5 flex items-center justify-center rounded transition-all ${checked ? "bg-cyan-500 shadow-md shadow-cyan-500/20" : "dark:bg-slate-800 bg-slate-200 group-hover:bg-slate-300 dark:group-hover:bg-slate-700"}`}
    >
      {checked && <CheckSquare className="w-3.5 h-3.5 text-white" />}
    </div>
    <div className="flex flex-col">
      <div className="flex items-center gap-1.5 text-sm font-bold dark:text-slate-200 text-slate-800 tracking-wide">
        <Calendar className="w-3.5 h-3.5 dark:text-cyan-400 text-cyan-600" />
        Sync to Google Calendar
      </div>
      <span className="text-[10px] dark:text-slate-500 text-slate-500">
        Automatically creates an event block for this task
      </span>
    </div>
  </div>
);

const Dashboard = React.memo(function Dashboard() {
  const [pulseStreak, setPulseStreak] = useState(false);
  const { hapticSuccess } = useHaptic();
  const {
    isLoaded,
    playerName,
    setPlayerName,
    totalXpGoal,
    xp,
    level,
    xpGainedToday,
    streakDays,
    hoursStudiedToday,
    questionsSolved,
    dailyTarget,
    accuracy,
    activeBoost,
    class11EndDate,
    isClass11SetupDone,
    setIsClass11SetupDone,
    todos,
    pendingTasks,
    hasSeenRules,
    setHasSeenRules,
    hasSeenReminder,
    setHasSeenReminder,
    getStreakMultiplier,
    lastBossDayDate,
    bossDayTargetXp,
    bossDayCompleted,
    equippedTitle,
    equippedAura,
    addXp,
    syllabus,
    backlogPriorities,
    updateTask,
    logFocusSession,
    setTodos,
    setPendingTasks,
    setClass11EndDate,
    history,
    getCurrentChapterForSubject,
    scheduleBacklogTask,
    saveStateToCloudNow,
  } = useAppContext();

  const { activeStep, setActiveStep, hasCompleted } = useTour();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSortByPriority(false);
      setTodos((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const auraStyles: Record<string, string> = {
    aura_flame: "shadow-md border-amber-500/50 ring-2 ring-amber-500/20",
    aura_emerald: "shadow-md border-emerald-500/50 ring-2 ring-emerald-500/20",
    aura_solar: "shadow-md border-rose-500/50 ring-2 ring-rose-500/20",
    aura_neon: "shadow-md border-cyan-400/50 ring-2 ring-cyan-400/20",
  };

  useEffect(() => {
    // Only start tour if loaded, setup is done, and they haven't completed the first step
    if (
      isLoaded &&
      hasSeenRules &&
      isClass11SetupDone &&
      hasSeenReminder &&
      !hasCompleted("dashboard-log") &&
      activeStep === null
    ) {
      const timeout = setTimeout(() => setActiveStep("dashboard-log"), 1000); // Small delay to let UI settle
      return () => clearTimeout(timeout);
    }
  }, [
    isLoaded,
    hasSeenRules,
    isClass11SetupDone,
    hasSeenReminder,
    hasCompleted,
    activeStep,
    setActiveStep,
  ]);

  const [tempDate, setTempDate] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("error");

  const showToast = (msg: string, type: "success" | "error" = "error") => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(""), 5000);
  };

  // Study Session Timer State
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);

  const [showLogSessionModal, setShowLogSessionModal] = useState(false);
  const [logSessionDeepFocus, setLogSessionDeepFocus] = useState(false);
  const [logSessionHours, setLogSessionHours] = useState(0);
  const [logSessionMins, setLogSessionMins] = useState(0);
  const [maxSessionDuration, setMaxSessionDuration] = useState(0);
  const [sortByPriority, setSortByPriority] = useState(false);
  const [currentProTip, setCurrentProTip] = useState(
    "Connect your Calendar in settings to auto-schedule blocked review time. Time-blocking your pending topics ensures nothing slips through the cracks before exams!",
  );

  const [dynamicInsight, setDynamicInsight] = useState<string | null>(null);
  const [showLiveDay, setShowLiveDay] = useState(false);

  const allBacklogTasks = useMemo(() => {
    const rawBacklogs = [
      ...pendingTasks.filter((t) => t.subject !== "Personal"),
      ...todos.filter((t) => {
        if (t.completed || t.subject === "Personal") return false;
        if (typeof t.id === "number") {
          return new Date(t.id).toDateString() !== new Date().toDateString() && t.id < Date.now();
        }
        if (t.startTime) {
          return new Date(t.startTime) < new Date();
        }
        return false;
      }),
    ];
    const uniqueMap = new Map();
    rawBacklogs.forEach((t) => uniqueMap.set(t.id, t));
    return Array.from(uniqueMap.values());
  }, [pendingTasks, todos]);

  const [backlogFilter, setBacklogFilter] = useState<string>("All");

  const filteredDashboardBacklogs = useMemo(() => {
    return allBacklogTasks.filter((task) => {
      if (backlogFilter === "All") return true;
      if (
        backlogFilter === "Physics" ||
        backlogFilter === "Mathematics" ||
        backlogFilter === "Chemistry"
      ) {
        return task.subject === backlogFilter;
      }
      if (backlogFilter === "Lecture" || backlogFilter === "DPP") {
        return task.type === backlogFilter;
      }
      return true;
    });
  }, [allBacklogTasks, backlogFilter]);

  const recentTaskTypesStr = useMemo(
    () =>
      todos
        .slice(-3)
        .map((t) => t.type)
        .join(", "),
    [todos],
  );
  const completedTodosCount = useMemo(
    () => todos.filter((t) => t.completed).length,
    [todos],
  );

  useEffect(() => {
    let active = true;
    const fetchInsight = async () => {
      const insight = await getDynamicInsight({
        hoursToday: hoursStudiedToday,
        streak: streakDays,
        questionsSolved,
        target: dailyTarget,
        accuracy,
        pendingTasksCount: pendingTasks.length,
        recentTaskTypes: recentTaskTypesStr,
      });
      if (active && insight) {
        setDynamicInsight(insight);
      }
    };

    const timeout = setTimeout(fetchInsight, 2000);
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [
    hoursStudiedToday,
    questionsSolved,
    completedTodosCount,
    streakDays,
    dailyTarget,
    accuracy,
    pendingTasks.length,
    recentTaskTypesStr,
  ]);

  useEffect(() => {
    const PRO_TIPS = [
      "Zero-day is just data. Phone out. 25-min DPP sprint right now. You're not lazy; you were avoiding. Break the inertia.",
      "10hrs + 4hrs sleep = 4hrs real learning. Sleep IS the study. Get it tonight.",
      "Don't jump to 12 hours. Add 90 mins. Compound beats explosive every time.",
      "Not lazy. Dopamine-hacked. Phone out of the room. 30 mins. Break the pattern.",
      "Reading = recognition. JEE needs recall. Close the book. Open the DPP. Now.",
      "Streak broke. Speed of return is the real skill. 5 hours. Back now.",
      "You recognize it. JEE needs you to recall it cold. Unseen questions only. Go.",
      "Skipping mocks = voluntary blindness. Sit the mock. Score doesn't matter. Data does.",
      "Hours don't crack JEE. Output does. Track questions solved, not sitting time.",
    ];
    const CALENDAR_TIP =
      "Connect your Calendar in settings to auto-schedule blocked review time. Time-blocking your pending topics ensures nothing slips through the cracks before exams!";

    if (Math.random() > 0.5) {
      setCurrentProTip(CALENDAR_TIP);
    } else {
      setCurrentProTip(PRO_TIPS[Math.floor(Math.random() * PRO_TIPS.length)]);
    }
  }, []);

  // Task Adder State
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [taskStep, setTaskStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);

  // Determine the best subject and chapter to continue
  const getContinueTarget = () => {
    // 1. If user has already selected a subject and chapter, use those
    if (selectedSubject && selectedChapter) {
      return { subject: selectedSubject, chapter: selectedChapter };
    }

    // 2. Find the most recently added task in todos that has a subject and chapter
    if (todos && todos.length > 0) {
      const sortedTodos = [...todos].sort((a, b) => String(b.id).localeCompare(String(a.id)));
      const lastTodoWithChapter = sortedTodos.find(
        (t) => t.subject && t.chapter,
      );
      if (
        lastTodoWithChapter &&
        lastTodoWithChapter.subject &&
        lastTodoWithChapter.chapter
      ) {
        return {
          subject: lastTodoWithChapter.subject,
          chapter: lastTodoWithChapter.chapter,
        };
      }
    }

    // 3. Find from history
    if (history && history.length > 0) {
      const sortedHistory = [...history].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
      for (const entry of sortedHistory) {
        if (entry.completedTasks && entry.completedTasks.length > 0) {
          const lastCompleted = [...entry.completedTasks]
            .reverse()
            .find((t) => t.subject && t.chapter);
          if (lastCompleted && lastCompleted.subject && lastCompleted.chapter) {
            return {
              subject: lastCompleted.subject,
              chapter: lastCompleted.chapter,
            };
          }
        }
      }
    }

    // 4. Fallback to ongoing/suggested chapters in Physics, Chemistry, Mathematics
    const subjects = ["Physics", "Chemistry", "Mathematics"];
    for (const sub of subjects) {
      const ongoing = getCurrentChapterForSubject(sub);
      if (ongoing) {
        return { subject: sub, chapter: ongoing };
      }
    }

    // 5. Hard fallback
    const fallbackChapter =
      getCurrentChapterForSubject("Physics") || "Units and Measurements";
    return { subject: "Physics", chapter: fallbackChapter };
  };

  const continueTarget = getContinueTarget();
  const [customTaskName, setCustomTaskName] = useState("");
  const [lectureNumberInput, setLectureNumberInput] = useState<string>("");
  const [hasEditedLecture, setHasEditedLecture] = useState(false);
  const [taskPriority, setTaskPriority] = useState<"Low" | "Medium" | "High">(
    "Medium",
  );
  const [addToCalendarOption, setAddToCalendarOption] = useState(true);

  const [customDuration, setCustomDuration] = useState(105);

  const [showConfigTimer, setShowConfigTimer] = useState(false);

  // Immersive Timer State
  const [timerMode, setTimerMode] = useState<
    "pomodoro" | "deepwork" | "custom"
  >("pomodoro");
  const [customMins, setCustomMins] = useState(25);
  const [timerTaskId, setTimerTaskId] = useState<number | string | null>(null);
  const [isStrictMode, setIsStrictMode] = useState(false);

  const [isImmersiveTimerActive, setIsImmersiveTimerActive] = useState(false);
  const [immersiveInitialSeconds, setImmersiveInitialSeconds] = useState(0);

  useEffect(() => {
    if (isSessionActive || isImmersiveTimerActive) {
      localStorage.setItem("focusModeActive", "true");
    } else {
      localStorage.removeItem("focusModeActive");
    }

    return () => {
      localStorage.removeItem("focusModeActive");
    };
  }, [isSessionActive, isImmersiveTimerActive]);

  // Pending Session Log State
  const [pendingSessionLog, setPendingSessionLog] = useState<{
    subject: string;
    chapter: string;
    type: string;
    taskId?: number | string;
  } | null>(null);

  // Task Completion Modal State
  const [completingTask, setCompletingTask] = useState<number | string | null>(null);
  const [lectureNotes, setLectureNotes] = useState(false);
  const [lectureQuestions, setLectureQuestions] = useState(false);
  const [lectureHomework, setLectureHomework] = useState(false);

  const [practiceQuestions, setPracticeQuestions] = useState(0);
  const [practiceCorrect, setPracticeCorrect] = useState(0);

  // Remove duplicate backlogFilter state

  useEffect(() => {
    const handlePomodoroShortcut = () => {
      setTimerMode("pomodoro");
      setImmersiveInitialSeconds(25 * 60);
      setIsImmersiveTimerActive(true);
      setShowConfigTimer(false);
    };

    const handleNewTaskShortcut = () => {
      setIsAddingTask(true);
      setTaskStep(1);

      // Try multiple times to ensure we scroll correctly after animations
      const tryScroll = (attempts = 0) => {
        const el = document.getElementById("dashboard-tasks-section");
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
          if (attempts === 0) {
            el.classList.add(
              "ring-2",
              "ring-cyan-400",
              "ring-offset-2",
              "ring-offset-black",
              "transition-all",
              "duration-500",
            );
            setTimeout(
              () =>
                el.classList.remove(
                  "ring-2",
                  "ring-cyan-400",
                  "ring-offset-2",
                  "ring-offset-black",
                ),
              1500,
            );
          }
        }
        if (attempts < 3) {
          setTimeout(() => tryScroll(attempts + 1), 200);
        }
      };

      tryScroll();
    };

    window.addEventListener("shortcut:pomodoro", handlePomodoroShortcut);
    window.addEventListener("shortcut:new-task", handleNewTaskShortcut);

    return () => {
      window.removeEventListener("shortcut:pomodoro", handlePomodoroShortcut);
      window.removeEventListener("shortcut:new-task", handleNewTaskShortcut);
    };
  }, []);

  const handleStartStudyClick = () => {
    vibrate(HAPTIC_PATTERNS.HEARTBEAT);
    window.open("https://pw.live", "_blank");
    setIsSessionActive(true);
    setSessionStartTime(Date.now());
    setLogSessionDeepFocus(false);
  };

  const handleStartImmersiveTimer = () => {
    vibrate(HAPTIC_PATTERNS.HEARTBEAT);
    let minutes = 25;
    let customPomo = 25;
    let customDeep = 50;
    try {
      const savedSettings = localStorage.getItem("app_settings_extended");
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        if (parsed.pomoTime) customPomo = parsed.pomoTime;
        if (parsed.deepWorkTime) customDeep = parsed.deepWorkTime;
      }
    } catch (e) {}

    if (timerMode === "pomodoro") minutes = customPomo;
    else if (timerMode === "deepwork") minutes = customDeep;
    else minutes = customMins;

    const seconds = minutes * 60;
    setImmersiveInitialSeconds(seconds);
    setIsImmersiveTimerActive(true);
    setShowConfigTimer(false);
    setLogSessionDeepFocus(timerMode === "deepwork");
  };

  const handleImmersiveComplete = (
    elapsedSeconds: number,
    taskId: number | null,
    breaches: number,
  ) => {
    setIsImmersiveTimerActive(false);
    const exactMins = elapsedSeconds / 60;
    const durationMins = Math.floor(exactMins);
    const h = Math.floor(durationMins / 60);
    const m = durationMins % 60;

    // Strict Mode: 15 minutes minimum to log session
    if (isStrictMode && exactMins < 15) {
      showToast(
        "Strict Mode: Session must be at least 15 minutes to claim XP.",
        "error",
      );
      return;
    }

    setMaxSessionDuration(exactMins);
    setLogSessionHours(h);
    setLogSessionMins(m);
    setLogSessionDeepFocus(timerMode === "deepwork");
    setShowLogSessionModal(true);
    if (taskId) {
      // Find the task and set it as completed
      const t = todos.find((t) => t.id === taskId);
      if (t && !t.completed) {
        updateTask(taskId, { completed: true });
      }
    }
  };

  const handleImmersiveExitEarly = (
    elapsedSeconds: number,
    breaches: number,
  ) => {
    setIsImmersiveTimerActive(false);
    const exactMins = elapsedSeconds / 60;
    const durationMins = Math.floor(exactMins);

    if (isStrictMode && exactMins < 15) {
      showToast(
        "Strict Mode: Task aborted before 15 minutes. No XP gained.",
        "error",
      );
      return;
    }

    const h = Math.floor(durationMins / 60);
    const m = durationMins % 60;
    setMaxSessionDuration(exactMins);
    setLogSessionHours(h);
    setLogSessionMins(m);
    setLogSessionDeepFocus(timerMode === "deepwork");
    setShowLogSessionModal(true);
  };

  const handleStopSession = () => {
    if (sessionStartTime) {
      const exactMins = (Date.now() - sessionStartTime) / 60000;
      const durationMins = Math.floor(exactMins);
      const h = Math.floor(durationMins / 60);
      const m = durationMins % 60;
      setMaxSessionDuration(exactMins);
      setLogSessionHours(h);
      setLogSessionMins(m);
      setLogSessionDeepFocus(false);
      setShowLogSessionModal(true);
    } else {
      setIsSessionActive(false);
      setSessionStartTime(null);
    }
  };

  const handleConfirmLogSession = () => {
    // We use maxSessionDuration if they didn't adjust it down, to keep the exact seconds precision.
    let finalMins = logSessionHours * 60 + logSessionMins;

    // If the manual input exactly matches the floor of the recorded time, use the float to keep precision
    if (finalMins === Math.floor(maxSessionDuration)) {
      finalMins = maxSessionDuration;
    } else if (finalMins > maxSessionDuration) {
      // Don't allow logging more than actual time
      return;
    }

    if (finalMins > 0) {
      hapticSuccess();
      logFocusSession(finalMins, logSessionDeepFocus);
    }
    setShowLogSessionModal(false);
    setIsSessionActive(false);
    setSessionStartTime(null);
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const resetTaskAdder = () => {
    setIsAddingTask(false);
    setTaskStep(1);
    setSelectedSubject(null);
    setSelectedChapter(null);
    setCustomTaskName("");
    setLectureNumberInput("");
    setHasEditedLecture(false);
    setTaskPriority("Medium");
    setAddToCalendarOption(true);
  };

  const handleAddTask = async (
    xpReward: number,
    taskName: string,
    type: string,
    overrideLectureNumber?: string,
    addToCalendar: boolean = true,
    durationInput?: number,
  ) => {
    let nameWithLec = taskName;
    const lecNum = overrideLectureNumber || lectureNumberInput;
    if (type === "Lecture" && lecNum) {
      nameWithLec = `${taskName} ${lecNum}`;
    }
    let text = nameWithLec;
    if (selectedSubject && selectedChapter) {
      text = `${selectedSubject} - ${selectedChapter}: ${nameWithLec}`;
    }
    const taskId = Date.now();

    // Set duration (override default if custom duration is provided)
    let durationMinutes = durationInput || 105;
    if (!durationInput) {
      if (
        type === "Practice" ||
        type === "Custom" ||
        type === "Revision" ||
        type === "Quick Custom"
      ) {
        durationMinutes = 60;
      } else if (type === "Chapter Test") {
        durationMinutes = 120;
      }
    }

    // Calculate XP dynamically on an hourly basis
    let calculatedXp = xpReward;
    const currentSub = selectedSubject || undefined;
    if (currentSub) {
      let baseXpPerHour = 120; // 120 XP per hour by default
      if (
        currentSub === "Mathematics" ||
        currentSub.toLowerCase().includes("math")
      ) {
        baseXpPerHour = 150; // 150 XP per hour for Mathematics
      }
      calculatedXp = Math.max(
        10,
        Math.round((durationMinutes / 60) * baseXpPerHour),
      );

      // Priority multiplier
      if (taskPriority === "High")
        calculatedXp = Math.round(calculatedXp * 1.5);
      else if (taskPriority === "Low")
        calculatedXp = Math.round(calculatedXp * 0.8);
    } else {
      calculatedXp = Math.max(10, Math.round((durationMinutes / 60) * 120));
      if (taskPriority === "High")
        calculatedXp = Math.round(calculatedXp * 1.5);
      else if (taskPriority === "Low")
        calculatedXp = Math.round(calculatedXp * 0.8);
    }

    const newTask = {
      id: taskId,
      text,
      completed: false,
      xpReward: calculatedXp,
      type,
      priority: taskPriority,
      subject: selectedSubject || undefined,
      chapter: selectedChapter || undefined,
      lectureNumber:
        type === "Lecture" && lecNum ? parseInt(lecNum) : undefined,
      durationMinutes: durationMinutes,
    };

    setTodos((prev) => {
      const isDuplicate = prev.some(
        (t) =>
          t.id === newTask.id ||
          (t.text === newTask.text &&
            t.type === newTask.type &&
            t.subject === newTask.subject &&
            t.chapter === newTask.chapter &&
            !t.completed),
      );
      if (isDuplicate) return prev;
      const updated = [...prev, newTask];
      saveStateToCloudNow({ todos: updated });
      return updated;
    });
    resetTaskAdder();

    if (!addToCalendar) {
      showToast("Task added locally!", "success");
      return;
    }

    // Schedule it with calendar
    try {
      let token = getAccessTokenSync();
      if (!token) {
        try {
          showToast("Connecting to Google Calendar...", "success");
          const loginRes = await googleSignIn();
          if (!loginRes) {
            throw new Error(
              "Google Calendar login in progress or redirecting...",
            );
          }
        } catch (loginErr: any) {
          throw new Error(
            `Google Calendar login required: ${loginErr.message || "Login failed"}`,
          );
        }
      }

      const result = await createCalendarEvent(
        text,
        durationMinutes,
        type || "Lecture",
        false,
        todos,
      );
      if (result && result.id) {
        let taskResult = null;
        try {
          taskResult = result.endTime
            ? await createGoogleTask(text, new Date(result.endTime))
            : null;
        } catch (taskErr: any) {
          console.error("Task creation failed:", taskErr);
          showToast(
            "Event created, but failed to sync Task. (Enable Tasks API in Cloud Console)",
          );
        }

        setTodos((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  calendarSynced: true,
                  calendarEventId: result.id,
                  calendarTaskId: taskResult ? taskResult.id : undefined,
                  startTime: result.startTime,
                  endTime: result.endTime,
                }
              : t,
          ),
        );

        if (result.hasConflict) {
          showToast(
            "Warning: This task overlaps with an existing calendar event!",
          );
        } else if (taskResult) {
          showToast("Scheduled on Calendar & Tasks!", "success");
        } else {
          showToast("Scheduled on Calendar!", "success");
        }
      }
    } catch (e: any) {
      const errorMsg = (e.message || "").toLowerCase();
      if (
        errorMsg.includes("access token") ||
        errorMsg.includes("login") ||
        errorMsg.includes("auth") ||
        errorMsg.includes("unauthorized") ||
        errorMsg.includes("401")
      ) {
        try {
          showToast(
            "Authentication needed. Opening Google login...",
            "success",
          );
          const loginRes = await googleSignIn();
          if (loginRes) {
            const result = await createCalendarEvent(
              text,
              durationMinutes,
              type || "Lecture",
              false,
              todos,
            );
            if (result && result.id) {
              let taskResult = null;
              try {
                taskResult = result.endTime
                  ? await createGoogleTask(text, new Date(result.endTime))
                  : null;
              } catch (taskErr: any) {
                console.error("Task creation failed during retry:", taskErr);
                showToast(
                  "Event created, but failed to sync Task. (Enable Tasks API in Cloud Console)",
                );
              }
              setTodos((prev) =>
                prev.map((t) =>
                  t.id === taskId
                    ? {
                        ...t,
                        calendarSynced: true,
                        calendarEventId: result.id,
                        calendarTaskId: taskResult ? taskResult.id : undefined,
                        startTime: result.startTime,
                        endTime: result.endTime,
                      }
                    : t,
                ),
              );
              if (result.hasConflict) {
                showToast(
                  "Warning: This task overlaps with an existing calendar event!",
                );
              } else if (taskResult) {
                showToast("Scheduled on Calendar & Tasks!", "success");
              } else {
                showToast("Scheduled on Calendar!", "success");
              }
              return;
            }
          }
        } catch (retryErr: any) {
          console.error("Retry failed:", retryErr);
        }
      }
      showToast(
        `Added locally. Calendar error: ${e.message || "Unknown error"}`,
      );
    }
  };

  const handleStartBacklog = async (task: any) => {
    // 1. Move to todos and immediately save to Firestore BEFORE calendar auth/sync!
    await scheduleBacklogTask(task);

    // 2. Schedule it with calendar
    try {
      let token = getAccessTokenSync();
      if (!token) {
        try {
          showToast("Connecting to Google Calendar...", "success");
          const loginRes = await googleSignIn();
          if (!loginRes) {
            throw new Error(
              "Google Calendar login in progress or redirecting...",
            );
          }
        } catch (loginErr: any) {
          throw new Error(
            `Google Calendar login required: ${loginErr.message || "Login failed"}`,
          );
        }
      }

      let durationMinutes = 105;
      if (
        task.type === "Practice" ||
        task.type === "Custom" ||
        task.type === "Revision"
      ) {
        durationMinutes = 60;
      } else if (task.type === "Chapter Test") {
        durationMinutes = 120;
      }

      const result = await createCalendarEvent(
        task.text,
        durationMinutes,
        task.type || "Lecture",
        false,
        todos,
      );
      if (result && result.id) {
        let taskResult = null;
        try {
          taskResult = result.endTime
            ? await createGoogleTask(task.text, new Date(result.endTime))
            : null;
        } catch (taskErr: any) {
          console.error("Task creation failed:", taskErr);
          showToast(
            "Event created, but failed to sync Task. (Enable Tasks API in Cloud Console)",
          );
        }

        const updatedTodos = todos.map((t) =>
          t.id === task.id
            ? {
                ...t,
                calendarSynced: true,
                calendarEventId: result.id,
                calendarTaskId: taskResult ? taskResult.id : undefined,
                startTime: result.startTime,
                endTime: result.endTime,
              }
            : t,
        );
        setTodos(updatedTodos);
        await saveStateToCloudNow({ todos: updatedTodos });

        if (result.hasConflict) {
          showToast(
            "Warning: This task overlaps with an existing calendar event!",
          );
        } else if (taskResult) {
          showToast("Backlog scheduled on Calendar & Tasks!", "success");
        } else {
          showToast("Backlog scheduled on Calendar only.", "success");
        }
      } else {
        showToast("Started backlog, but failed to sync to calendar.");
      }
    } catch (e: any) {
      const errorMsg = (e.message || "").toLowerCase();
      if (
        errorMsg.includes("access token") ||
        errorMsg.includes("login") ||
        errorMsg.includes("auth") ||
        errorMsg.includes("unauthorized") ||
        errorMsg.includes("401")
      ) {
        try {
          showToast(
            "Authentication needed. Opening Google login...",
            "success",
          );
          const loginRes = await googleSignIn();
          if (loginRes) {
            let durationMinutes = 105;
            if (
              task.type === "Practice" ||
              task.type === "Custom" ||
              task.type === "Revision"
            ) {
              durationMinutes = 60;
            } else if (task.type === "Chapter Test") {
              durationMinutes = 120;
            }
            const result = await createCalendarEvent(
              task.text,
              durationMinutes,
              task.type || "Lecture",
              false,
              todos,
            );
            if (result && result.id) {
              let taskResult = null;
              try {
                taskResult = result.endTime
                  ? await createGoogleTask(task.text, new Date(result.endTime))
                  : null;
              } catch (taskErr: any) {
                console.error("Task creation failed during retry:", taskErr);
                showToast(
                  "Event created, but failed to sync Task. (Enable Tasks API in Cloud Console)",
                );
              }
              const updatedTodos = todos.map((t) =>
                t.id === task.id
                  ? {
                      ...t,
                      calendarSynced: true,
                      calendarEventId: result.id,
                      calendarTaskId: taskResult ? taskResult.id : undefined,
                      startTime: result.startTime,
                      endTime: result.endTime,
                    }
                  : t,
              );
              setTodos(updatedTodos);
              await saveStateToCloudNow({ todos: updatedTodos });
              if (result.hasConflict) {
                showToast(
                  "Warning: This task overlaps with an existing calendar event!",
                );
              } else if (taskResult) {
                showToast("Backlog scheduled on Calendar & Tasks!", "success");
              } else {
                showToast("Backlog scheduled on Calendar only.", "success");
              }
              return;
            }
          }
        } catch (retryErr: any) {
          console.error("Retry failed:", retryErr);
        }
      }
      showToast(
        `Started locally. Calendar error: ${e.message || "Unknown error"}`,
      );
    }
  };

  const toggleTodo = (id: number) => {
    const todo = todos.find((t) => t.id === id);
    if (todo && !todo.completed) {
      vibrate(HAPTIC_PATTERNS.SUCCESS);
      setPulseStreak(true);
      setTimeout(() => setPulseStreak(false), 500);
    } else {
      vibrate(HAPTIC_PATTERNS.TAP);
    }
    const task = todos.find((t) => t.id === id);
    if (!task) return;

    const isNowCompleted = !task.completed;

    if (isNowCompleted) {
      hapticSuccess();
      // Set as pending session log and mark as completed locally
      setPendingSessionLog({
        subject: task.subject || "Physics",
        chapter: task.chapter || "General",
        type: task.type,
        taskId: task.id,
      });

      updateTask(id, { completed: true });

      // Gamified Reward: Critical Mission confetti burst
      if (task.priority === "High") {
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ["#f43f5e", "#ec4899", "#8b5cf6", "#22d3ee"],
          zIndex: 9999,
        });
      }
    } else {
      // Unchecking
      updateTask(id, { completed: false });
    }

    // Sync task status to Google Tasks and Calendar asynchronously
    if (task.calendarTaskId) {
      updateGoogleTaskStatus(
        task.calendarTaskId,
        isNowCompleted ? "completed" : "needsAction",
      ).catch(console.error);
    }
    if (task.calendarEventId) {
      markCalendarEventCompleted(
        task.calendarEventId,
        isNowCompleted,
        task.text,
      ).catch(console.error);
    }
  };

  const deleteTodo = async (id: number) => {
    const todoToDelete = todos.find((t) => t.id === id);
    const updatedTodos = todos.filter((t) => t.id !== id);
    setTodos(updatedTodos);
    saveStateToCloudNow({ todos: updatedTodos });

    if (todoToDelete?.calendarEventId) {
      try {
        await deleteCalendarEvent(todoToDelete.calendarEventId);
        if (todoToDelete.calendarTaskId) {
          await deleteGoogleTask(todoToDelete.calendarTaskId);
        }
        showToast("Task removed from App and Calendar", "success");
      } catch (err: any) {
        console.error("Failed to remove from calendar:", err);
        showToast(
          `Removed from App. (Calendar error: ${err.message || "Unknown"})`,
          "error",
        );
      }
    } else {
      showToast("Task removed from App", "success");
    }
  };

  const handleSetDate = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempDate) {
      setClass11EndDate(tempDate);
    }
    setIsClass11SetupDone(true);
  };

  const handleSkipSetup = () => {
    setIsClass11SetupDone(true);
  };

  const isBoostActive = activeBoost && activeBoost.expiresAt > Date.now();
  const daysLeft = class11EndDate
    ? Math.ceil(
        (new Date(class11EndDate).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24),
      )
    : 0;

  const currentLevelStartXp = Math.floor(
    totalXpGoal * Math.pow((level - 1) / 99, 2),
  );
  const nextLevelStartXp = Math.floor(totalXpGoal * Math.pow(level / 99, 2));
  const xpInCurrentLevel = xp - currentLevelStartXp;
  const xpNeededForNextLevel = nextLevelStartXp - currentLevelStartXp;
  const levelProgress =
    level === 100 ? 1 : xpInCurrentLevel / xpNeededForNextLevel;

  // Staggered animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.9 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: "spring" as const, stiffness: 120, damping: 10 },
    },
  };

  // Dynamic Study Hours Calculation
  const TOTAL_XP_GOAL = totalXpGoal;
  const XP_PER_HOUR = 300;
  const DEEP_FOCUS_BONUS = 500;

  // Calculate remaining XP using the start of the day baseline so daily target doesn't shrink as you study today.
  const remainingXpAtStartOfDay = Math.max(
    0,
    TOTAL_XP_GOAL - (xp - xpGainedToday),
  );
  const remainingDaysForCalc = Math.max(1, daysLeft);

  const dailyXpRequired = remainingXpAtStartOfDay / remainingDaysForCalc;
  const baseStudyHours = dailyXpRequired / XP_PER_HOUR;

  const adjustedDailyXp = Math.max(0, dailyXpRequired - DEEP_FOCUS_BONUS);
  const optimizedStudyHours = adjustedDailyXp / XP_PER_HOUR;

  const formattedBaseHours = baseStudyHours.toFixed(1);
  const formattedOptimizedHours = optimizedStudyHours.toFixed(1);

  const displayedTodos = useMemo(() => {
    let sourceTodos = todos.filter((t) => t.subject !== "Personal");
    const uniqueMap = new Map();
    sourceTodos.forEach((t) => uniqueMap.set(t.id, t));
    sourceTodos = Array.from(uniqueMap.values());

    if (!sortByPriority) return sourceTodos;
    const priorityWeight: Record<string, number> = {
      High: 3,
      Medium: 2,
      Low: 1,
    };
    return sourceTodos.sort((a, b) => {
      // First sort by completion status
      if (a.completed && !b.completed) return 1;
      if (!a.completed && b.completed) return -1;
      // Then sort by priority
      const pA = priorityWeight[a.priority || "Medium"];
      const pB = priorityWeight[b.priority || "Medium"];
      return pB - pA;
    });
  }, [todos, sortByPriority]);

  return (
    <div className="space-y-4 md:space-y-8">
      <AnimatePresence>
        {showLiveDay && (
          <LiveDayOverlay onClose={() => setShowLiveDay(false)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: 20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: 50, x: 20, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className={`fixed bottom-4 md:bottom-10 right-4 md:right-10 z-[100] max-w-sm dark:bg-slate-900/90 bg-white border shadow-xl rounded-xl p-4 flex gap-4 pr-10 ${
              toastType === "success"
                ? "border-emerald-500/50 shadow-md"
                : "border-rose-500/50 shadow-md"
            }`}
          >
            <div className="flex-shrink-0">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center relative ${
                  toastType === "success"
                    ? "bg-emerald-500/20"
                    : "bg-rose-500/20"
                }`}
              >
                {toastType === "success" ? (
                  <CheckCircle2 className="w-5 h-5 dark:text-emerald-400 text-emerald-700" />
                ) : (
                  <AlertTriangle className="w-5 h-5 dark:text-rose-400 text-rose-700" />
                )}
                {toastType !== "success" && (
                  <>
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full animate-ping" />
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-slate-900" />
                  </>
                )}
              </div>
            </div>
            <div className="flex flex-col justify-center">
              <h4
                className={`font-bold uppercase tracking-widest text-xs mb-1 flex items-center gap-2 ${
                  toastType === "success"
                    ? "dark:text-emerald-400 text-emerald-700"
                    : "dark:text-rose-400 text-rose-700"
                }`}
              >
                {toastType === "success" ? "Success" : "Alert"}
              </h4>
              <p className="dark:text-slate-300 text-slate-900 text-sm leading-relaxed font-medium">
                {toastMessage}
              </p>
            </div>
            <button
              onClick={() => setToastMessage("")}
              className="absolute top-2 right-2 p-1 dark:text-slate-500 text-slate-600 hover:dark:text-white text-slate-900 transition-colors"
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {createPortal(
        <AnimatePresence>
          {!isClass11SetupDone && (
            <motion.div
              key="class11SetupModalPortal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center dark:bg-black bg-slate-50 p-4"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="dark:bg-slate-900 bg-white border dark:border-slate-800 border-slate-200 p-8 rounded-2xl max-w-md w-full shadow-lg"
              >
                <h2 className="text-2xl font-black dark:text-white text-slate-900 mb-2">
                  INITIALIZE TRACKER
                </h2>
                <p className="dark:text-slate-400 text-slate-600 mb-6 text-sm">
                  Please enter the end date of your Class 11th academic year to
                  calibrate the time tracking system.
                </p>
                <form onSubmit={handleSetDate} className="space-y-6">
                  <div>
                    <label
                      htmlFor="endDateInput"
                      className="block text-xs font-bold dark:text-slate-500 text-slate-600 uppercase tracking-wider mb-2"
                    >
                      End Date
                    </label>
                    <input
                      id="endDateInput"
                      type="date"
                      required
                      value={tempDate}
                      onChange={(e) => setTempDate(e.target.value)}
                      className="w-full dark:bg-black bg-white border dark:border-slate-700 border-slate-300 rounded-lg p-3 dark:text-white text-slate-900 focus:border-cyan-500 outline-none transition-colors"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSkipSetup}
                      className="w-1/3 dark:border-slate-700 border-slate-300 dark:text-slate-400 text-slate-600 hover:text-white hover:dark:bg-slate-800 bg-slate-100"
                    >
                      SKIP
                    </Button>
                    <Button
                      type="submit"
                      variant="default"
                      className="w-2/3 bg-cyan-600 hover:bg-cyan-500 text-white border-cyan-500"
                    >
                      CALIBRATE
                    </Button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      {createPortal(
        <AnimatePresence>
          {isClass11SetupDone &&
            class11EndDate &&
            hasSeenRules &&
            !hasSeenReminder && (
              <motion.div
                key="hasSeenReminderModalPortal"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[9999] flex items-center justify-center dark:bg-black bg-slate-50 p-4"
              >
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", bounce: 0.5 }}
                  className="bg-red-950/20 border border-red-500/30 p-8 md:p-16 rounded-3xl max-w-3xl w-full text-center shadow-md relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-50" />
                  <h2 className="text-2xl md:text-3xl font-bold dark:text-red-400 text-red-700 mb-2 uppercase tracking-widest flex items-center justify-center gap-3">
                    <motion.div
                      whileHover={{ scale: 1.2, rotate: 15 }}
                      transition={{ type: "spring", stiffness: 300 }}
                      className="relative"
                    >
                      <Clock className="w-8 h-8 relative z-10 drop-shadow-md" />
                    </motion.div>
                    Time is Ticking
                  </h2>
                  <div className="text-[8rem] md:text-[12rem] leading-none font-black dark:text-white text-slate-900 mb-4 drop-shadow-md">
                    {daysLeft > 0 ? daysLeft : 0}
                  </div>
                  <p className="text-2xl md:text-4xl dark:text-red-400 text-red-700 font-mono mb-6 uppercase tracking-widest">
                    {daysLeft > 0 ? "Days Remaining" : "Time is Up"}
                  </p>

                  {pendingTasks.length > 0 && (
                    <div className="mb-10 p-6 bg-red-950/40 border border-red-500/30 rounded-xl max-w-xl mx-auto text-left">
                      <h3 className="dark:text-red-400 text-red-700 font-bold uppercase tracking-wider flex items-center gap-2 mb-3">
                        <Shield className="w-5 h-5" /> Pending Backlogs Alert
                      </h3>
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                        {Array.from(
                          new Map(pendingTasks.map((t) => [t.id, t])).values(),
                        ).map((pt: any, i) => (
                          <div
                            key={pt.id || `pt-${i}`}
                            className="flex flex-col gap-1 p-2 rounded-lg bg-red-900/10 border border-red-800/50"
                          >
                            <span className="text-red-200 font-medium text-sm drop-shadow-md">
                              {pt.text}
                            </span>
                            <span className="text-[10px] dark:text-red-400 text-red-700/80 font-mono uppercase">
                              Incomplete Goal
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button
                    size="lg"
                    onClick={() => setHasSeenReminder(true)}
                    className="bg-red-600 hover:bg-red-500 text-white text-xl px-12 py-8 h-auto rounded-2xl font-black tracking-widest shadow-md hover:shadow-md transition-all hover:scale-105"
                  >
                    ACKNOWLEDGE
                  </Button>
                </motion.div>
              </motion.div>
            )}
        </AnimatePresence>,
        document.body,
      )}

      <AnimatePresence>
        {isSessionActive && sessionStartTime && (
          <DeepFocusOverlay
            key="deepFocusOverlay"
            sessionStartTime={sessionStartTime}
            onStop={handleStopSession}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isImmersiveTimerActive && (
          <ImmersiveTimer
            key="immersiveTimer"
            initialSeconds={immersiveInitialSeconds}
            taskId={timerTaskId}
            taskName={
              timerTaskId
                ? todos.find((t) => t.id === timerTaskId)?.text
                : undefined
            }
            isStrictMode={isStrictMode}
            onComplete={handleImmersiveComplete}
            onExitEarly={handleImmersiveExitEarly}
          />
        )}
      </AnimatePresence>

      {createPortal(
        <AnimatePresence>
          {showLogSessionModal && (
            <motion.div
              key="logSessionModalPortal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center dark:bg-black bg-slate-50 p-4"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="dark:bg-slate-900 bg-white border dark:border-slate-800 border-slate-200 p-8 rounded-2xl max-w-md w-full shadow-lg"
              >
                <h2 className="text-2xl font-black dark:text-white text-slate-900 mb-2">
                  LOG SESSION XP
                </h2>
                <p className="dark:text-slate-400 text-slate-600 mb-6 text-sm">
                  Verify the duration of your study session. You can reduce the
                  logged time, but cannot exceed the tracked session time.
                </p>
                <div className="mb-6">
                  {(() => {
                    const isDeepOrOvertime =
                      logSessionDeepFocus ||
                      logSessionHours * 60 + logSessionMins >= 90;
                    return (
                      <span
                        className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${isDeepOrOvertime ? "bg-purple-500/10 text-purple-400 border-purple-500/25" : "bg-cyan-500/10 text-cyan-400 border-cyan-500/25"}`}
                      >
                        {isDeepOrOvertime
                          ? "⚡ Deep Focus/Overtime Session (2 XP/min)"
                          : "📚 Standard Study Session (1 XP/min)"}
                      </span>
                    );
                  })()}
                </div>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold dark:text-slate-500 text-slate-600 uppercase tracking-wider mb-2">
                        Hours
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={Math.floor(maxSessionDuration / 60)}
                        value={logSessionHours}
                        onChange={(e) =>
                          setLogSessionHours(
                            Math.max(
                              0,
                              Math.min(
                                Math.floor(maxSessionDuration / 60),
                                parseInt(e.target.value) || 0,
                              ),
                            ),
                          )
                        }
                        className="w-full dark:bg-black bg-white border dark:border-slate-700 border-slate-300 rounded-lg p-3 dark:text-white text-slate-900 focus:border-cyan-500 outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold dark:text-slate-500 text-slate-600 uppercase tracking-wider mb-2">
                        Minutes
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={logSessionMins}
                        onChange={(e) => {
                          let m = parseInt(e.target.value) || 0;
                          if (
                            logSessionHours >=
                            Math.floor(maxSessionDuration / 60)
                          ) {
                            m = Math.min(maxSessionDuration % 60, m);
                          } else {
                            m = Math.min(59, m);
                          }
                          setLogSessionMins(Math.max(0, m));
                        }}
                        className="w-full dark:bg-black bg-white border dark:border-slate-700 border-slate-300 rounded-lg p-3 dark:text-white text-slate-900 focus:border-cyan-500 outline-none transition-colors"
                      />
                    </div>
                  </div>
                  <div className="dark:bg-slate-800 bg-slate-100/50 p-4 rounded-lg flex justify-between items-center border dark:border-slate-700 border-slate-300">
                    <span className="dark:text-slate-400 text-slate-600 font-bold">
                      XP to Earn:
                    </span>
                    <span className="dark:text-cyan-400 text-cyan-700 font-black text-xl">
                      {(() => {
                        const mins = logSessionHours * 60 + logSessionMins;
                        const rate = logSessionDeepFocus || mins >= 90 ? 2 : 1;
                        const base = mins * rate;
                        let mult = getStreakMultiplier();
                        if (activeBoost && activeBoost.expiresAt > Date.now())
                          mult *= activeBoost.multiplier;
                        return Math.round(base * mult);
                      })()}{" "}
                      XP
                    </span>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowLogSessionModal(false)}
                      className="w-1/3 dark:border-slate-700 border-slate-300 dark:text-slate-400 text-slate-600 hover:text-white hover:dark:bg-slate-800 bg-slate-100"
                    >
                      CANCEL
                    </Button>
                    <Button
                      onClick={handleConfirmLogSession}
                      variant="default"
                      className="w-2/3 bg-cyan-600 hover:bg-cyan-500 text-white border-cyan-500"
                    >
                      CLAIM XP
                    </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      {createPortal(
        <AnimatePresence>
          {showConfigTimer && (
            <motion.div
              key="configTimerModalPortal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center dark:bg-black bg-slate-50 p-4"
            >
              <motion.div
                initial={{ scale: 0.9, y: 30, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                transition={{ type: "spring", bounce: 0.4 }}
                className="dark:bg-slate-900 bg-white border border-purple-500/30 p-8 rounded-3xl max-w-lg w-full shadow-md relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50" />

                <button
                  onClick={() => setShowConfigTimer(false)}
                  className="absolute top-6 right-6 dark:text-slate-500 text-slate-600 hover:dark:text-white text-slate-900"
                >
                  ✕
                </button>

                <h2 className="text-2xl font-black dark:text-white text-slate-900 uppercase tracking-widest mb-6 flex items-center justify-center gap-3">
                  <motion.div
                    whileHover={{ scale: 1.2, rotate: 10 }}
                    transition={{ duration: 0.5 }}
                    className="relative z-20"
                  >
                    <div className="absolute inset-0 bg-purple-400/40 rounded-full  opacity-50" />
                    <Timer className="w-6 h-6 dark:text-purple-400 text-purple-700 drop-shadow-md relative z-10" />
                  </motion.div>
                  Configure Timer
                </h2>

                <div className="space-y-6">
                  <div className="relative">
                    <div className="space-y-6">
                      <div>
                        <label className="text-xs font-bold dark:text-slate-400 text-slate-600 uppercase tracking-widest block mb-3">
                          Duration Mode
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            onClick={() => setTimerMode("pomodoro")}
                            className={`py-3 rounded-lg border font-mono text-sm transition-all ${timerMode === "pomodoro" ? "bg-purple-500/20 border-purple-500 dark:text-white text-slate-900" : "dark:bg-black bg-slate-50 dark:border-slate-700 border-slate-300 dark:text-slate-400 text-slate-600 hover:border-slate-500"}`}
                          >
                            POMODORO
                            <br />
                            <span className="text-[10px] opacity-70">25m</span>
                          </button>
                          <button
                            onClick={() => setTimerMode("deepwork")}
                            className={`py-3 rounded-lg border font-mono text-sm transition-all ${timerMode === "deepwork" ? "bg-purple-500/20 border-purple-500 dark:text-white text-slate-900" : "dark:bg-black bg-slate-50 dark:border-slate-700 border-slate-300 dark:text-slate-400 text-slate-600 hover:border-slate-500"}`}
                          >
                            DEEP WORK
                            <br />
                            <span className="text-[10px] opacity-70">50m</span>
                          </button>
                          <button
                            onClick={() => setTimerMode("custom")}
                            className={`py-3 rounded-lg border font-mono text-sm transition-all ${timerMode === "custom" ? "bg-purple-500/20 border-purple-500 dark:text-white text-slate-900" : "dark:bg-black bg-slate-50 dark:border-slate-700 border-slate-300 dark:text-slate-400 text-slate-600 hover:border-slate-500"}`}
                          >
                            CUSTOM
                            <br />
                            <span className="text-[10px] opacity-70">SET</span>
                          </button>
                        </div>

                        {timerMode === "custom" && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            className="mt-3"
                          >
                            <input
                              type="number"
                              min="1"
                              max="180"
                              value={customMins}
                              onChange={(e) =>
                                setCustomMins(
                                  Math.max(
                                    1,
                                    Math.min(
                                      180,
                                      parseInt(e.target.value) || 1,
                                    ),
                                  ),
                                )
                              }
                              className="w-full dark:bg-black bg-white border dark:border-slate-700 border-slate-300 rounded-lg p-3 dark:text-white text-slate-900 text-center text-xl focus:border-purple-500 outline-none"
                            />
                          </motion.div>
                        )}
                      </div>

                      <div>
                        <label className="text-xs font-bold dark:text-slate-400 text-slate-600 uppercase tracking-widest flex items-center gap-2 mb-3 group/label w-max cursor-pointer">
                          <motion.div
                            whileHover={{ scale: 1.3, rotate: 15 }}
                            className="relative"
                          >
                            <div className="absolute inset-0 bg-cyan-400/30 rounded-full  opacity-0 group-hover/label:opacity-100 transition-opacity" />
                            <Target className="w-5 h-5 dark:text-cyan-400 text-cyan-700 drop-shadow-md relative z-10" />
                          </motion.div>
                          Link Mission
                        </label>
                        <div className="dark:bg-black bg-white border dark:border-slate-700 border-slate-300/80 hover:border-cyan-500/40 rounded-xl overflow-hidden relative group transition-all duration-300 shadow-md">
                          <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                          <div className="max-h-48 overflow-y-auto custom-scrollbar p-2 space-y-2 relative z-10">
                            <button
                              onClick={() => setTimerTaskId(null)}
                              className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all flex items-center group/btn relative overflow-hidden ${!timerTaskId ? "bg-purple-900/30 text-purple-200 border border-purple-500/50 shadow-md" : "dark:bg-black bg-white dark:text-slate-400 text-slate-600 hover:dark:text-slate-200 text-slate-900 border border-transparent hover:dark:border-white/10 border-black/10 hover:bg-white"}`}
                            >
                              {!timerTaskId && (
                                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-transparent pointer-events-none" />
                              )}
                              <motion.div
                                whileHover={{ scale: 1.2, rotate: -15 }}
                                className="relative"
                              >
                                <Shield
                                  className={`w-5 h-5 mr-3 transition-colors ${!timerTaskId ? "dark:text-purple-400 text-purple-700 drop-shadow-md" : "opacity-50 group-hover/btn:dark:text-purple-300 dark:text-purple-400 text-purple-700 group-hover/btn:opacity-100 group-hover/btn:drop-shadow-md"}`}
                                />
                              </motion.div>
                              <div className="flex flex-col">
                                <span className="font-bold tracking-wide">
                                  Free Flow
                                </span>
                                <span className="text-xs opacity-60 font-mono">
                                  Unlinked Session
                                </span>
                              </div>
                            </button>
                            {Array.from(
                              new Map(
                                todos
                                  .filter((t) => !t.completed)
                                  .map((t) => [t.id, t]),
                              ).values(),
                            ).map((task: any) => (
                              <button
                                key={task.id}
                                onClick={() => setTimerTaskId(task.id)}
                                className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all flex items-center group/btn relative overflow-hidden ${timerTaskId === task.id ? "bg-cyan-900/30 text-cyan-100 border border-cyan-500/50 shadow-md" : "dark:bg-black bg-white dark:text-slate-300 text-slate-900 hover:dark:text-cyan-300 dark:text-cyan-400 text-cyan-700 border border-transparent hover:border-cyan-500/20 hover:bg-cyan-950/20"}`}
                              >
                                {timerTaskId === task.id && (
                                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-transparent pointer-events-none" />
                                )}
                                <motion.div
                                  whileHover={{ scale: 1.2, rotate: 15 }}
                                  className="relative flex-shrink-0"
                                >
                                  <Target
                                    className={`w-5 h-5 mr-3 transition-colors ${timerTaskId === task.id ? "dark:text-cyan-400 text-cyan-700 animate-pulse drop-shadow-md" : "opacity-50 group-hover/btn:dark:text-cyan-400 text-cyan-700 group-hover/btn:opacity-100 group-hover/btn:drop-shadow-md"}`}
                                  />
                                </motion.div>
                                <div className="flex flex-col overflow-hidden">
                                  <span className="font-bold tracking-wide truncate pr-4">
                                    {task.text}
                                  </span>
                                  <span className="text-[10px] dark:text-slate-500 text-slate-600 font-mono tracking-wider mt-0.5 uppercase flex items-center gap-1">
                                    EXP:{" "}
                                    <span className="dark:text-amber-400 text-amber-700 font-bold">
                                      +{task.xpReward} XP
                                    </span>
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Strict Mode Glassmorphism Overlay */}
                    <AnimatePresence>
                      {isStrictMode && (
                        <motion.div
                          key="strictModeProtocolBanner"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute -inset-4 z-20 flex flex-col items-center justify-center bg-slate-950/70 rounded-2xl border border-red-900/30 shadow-md overflow-hidden "
                        >
                          {/* Ambient Soft Glow */}
                          <motion.div
                            animate={{
                              scale: [1, 1.1, 1],
                              opacity: [0.3, 0.5, 0.3],
                            }}
                            transition={{
                              duration: 4,
                              repeat: Infinity,
                              ease: "easeInOut",
                            }}
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-[radial-gradient(ellipse_at_center,rgba(225,29,72,0.15)_0%,transparent_60%)] pointer-events-none"
                          />

                          <motion.div
                            initial={{ y: -10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.1 }}
                            className="relative z-10 flex flex-col items-center mb-4 mt-2"
                          >
                            <ShieldAlert
                              className="w-8 h-8 dark:text-rose-400 text-rose-700 mb-2 drop-shadow-md"
                              strokeWidth={1.5}
                            />
                            <h3 className="text-lg font-black text-rose-50 uppercase tracking-[0.2em]">
                              Strict Protocol
                            </h3>
                          </motion.div>

                          <div className="space-y-3 w-full px-8 text-left relative z-10 pb-2">
                            <motion.div
                              initial={{ opacity: 0, x: -15 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.2 }}
                              className="flex items-center gap-3"
                            >
                              <div className="w-8 h-8 rounded-full bg-rose-950/50 border border-rose-900/50 shadow-md flex items-center justify-center flex-shrink-0">
                                <Maximize className="w-3 h-3 dark:text-rose-400 text-rose-700" />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs dark:text-white text-slate-900 font-bold tracking-wider uppercase">
                                  Fullscreen
                                </span>
                                <span className="text-[9px] dark:text-slate-400 text-slate-600 font-mono tracking-widest uppercase">
                                  Mandatory Focus
                                </span>
                              </div>
                            </motion.div>

                            <motion.div
                              initial={{ opacity: 0, x: -15 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.3 }}
                              className="flex items-center gap-3"
                            >
                              <div className="w-8 h-8 rounded-full bg-rose-950/50 border border-rose-900/50 shadow-md flex items-center justify-center flex-shrink-0">
                                <EyeOff className="w-3 h-3 dark:text-rose-400 text-rose-700" />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs dark:text-white text-slate-900 font-bold tracking-wider uppercase">
                                  Tab Guard
                                </span>
                                <span className="text-[9px] dark:text-slate-400 text-slate-600 font-mono tracking-widest uppercase">
                                  Breach Logic Armed
                                </span>
                              </div>
                            </motion.div>

                            <motion.div
                              initial={{ opacity: 0, x: -15 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.4 }}
                              className="flex items-center gap-3"
                            >
                              <div className="w-8 h-8 rounded-full bg-rose-950/50 border border-rose-900/50 shadow-md flex items-center justify-center flex-shrink-0">
                                <LockIcon className="w-3 h-3 dark:text-rose-400 text-rose-700" />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs dark:text-white text-slate-900 font-bold tracking-wider uppercase">
                                  15 Min Lock
                                </span>
                                <span className="text-[9px] dark:text-slate-400 text-slate-600 font-mono tracking-widest uppercase">
                                  Minimum To Save
                                </span>
                              </div>
                            </motion.div>

                            <motion.div
                              initial={{ opacity: 0, x: -15 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.5 }}
                              className="flex items-center gap-3"
                            >
                              <div className="w-8 h-8 rounded-full bg-rose-950/50 border border-rose-900/50 shadow-md flex items-center justify-center flex-shrink-0">
                                <MousePointerClick className="w-3 h-3 dark:text-rose-400 text-rose-700" />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs dark:text-white text-slate-900 font-bold tracking-wider uppercase">
                                  20s Abort
                                </span>
                                <span className="text-[9px] dark:text-slate-400 text-slate-600 font-mono tracking-widest uppercase">
                                  Hold To Exit
                                </span>
                              </div>
                            </motion.div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="flex items-center justify-between p-4 dark:bg-black bg-slate-50 border dark:border-slate-800 border-slate-200 rounded-xl relative z-30">
                    <div>
                      <h4 className="dark:text-white text-slate-900 font-bold text-sm tracking-wider uppercase flex items-center gap-2 group/strict">
                        <motion.div
                          whileHover={{ scale: 1.2, rotate: 15 }}
                          className="relative"
                        >
                          <Shield
                            className={`w-4 h-4 transition-all ${isStrictMode ? "dark:text-red-400 text-red-700 drop-shadow-md" : "dark:text-emerald-400 text-emerald-700 group-hover/strict:drop-shadow-md"}`}
                          />
                        </motion.div>{" "}
                        Strict Mode
                      </h4>
                      <p className="text-xs dark:text-slate-400 text-slate-600 font-mono mt-1">
                        Disables easy exit & enforces fullscreen focus.
                      </p>
                    </div>
                    <button
                      onClick={() => setIsStrictMode(!isStrictMode)}
                      className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 ${isStrictMode ? "bg-red-600" : "bg-slate-700"}`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${isStrictMode ? "left-7" : "left-1"}`}
                      />
                    </button>
                  </div>

                  <button
                    onClick={handleStartImmersiveTimer}
                    className={`w-full py-4 mt-4 dark:text-white text-slate-900 font-black text-lg tracking-widest uppercase rounded-xl transition-all hover:scale-[1.02] relative z-30 ${isStrictMode ? "bg-gradient-to-r from-red-700 to-rose-600 shadow-md hover:shadow-md" : "bg-gradient-to-r from-purple-600 to-indigo-600 shadow-md hover:shadow-md"}`}
                  >
                    ENTER FOCUS
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      {/* Boss Day Banner */}
      <AnimatePresence>
        {lastBossDayDate === new Date().toDateString() &&
          bossDayTargetXp &&
          !bossDayCompleted && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              className="mb-4 md:mb-8 relative rounded-xl md:rounded-2xl overflow-hidden border border-amber-500/50 shadow-md md:shadow-md bg-gradient-to-r from-amber-900/60 via-red-900/60 to-amber-900/60 p-4 md:p-8"
            >
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')] opacity-20 mix-blend-overlay pointer-events-none" />

              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 md:gap-6 relative z-10">
                <div>
                  <h2 className="text-lg md:text-3xl font-black dark:text-amber-400 text-amber-700 drop-shadow-md tracking-widest flex items-center gap-2 md:gap-3">
                    <Flame className="w-5 h-5 md:w-8 md:h-8 dark:text-red-400 text-red-700 animate-pulse" />
                    BOSS DAY ACTIVE
                  </h2>
                  <p className="mt-1 md:mt-2 text-[11px] md:text-base text-red-100/80 font-mono leading-tight md:leading-normal">
                    You've shown immense consistency. Today, the difficulty
                    increases. Push beyond your limits to earn a massive reward.
                  </p>
                </div>

                <div className="flex flex-row md:flex-col items-center md:items-end justify-between dark:bg-black bg-slate-50 md:bg-transparent p-3 md:p-0 rounded-lg md:rounded-none shrink-0 mt-2 md:mt-0">
                  <div className="flex flex-col">
                    <div className="text-[10px] md:text-sm font-bold dark:text-slate-300 text-slate-900 uppercase tracking-widest md:mb-1">
                      Target
                    </div>
                    <div className="hidden md:block text-xs font-mono dark:text-amber-400 text-amber-700/80 mt-1">
                      Reward: +1000 XP & Glory
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="text-xl md:text-4xl font-black dark:text-white text-slate-900">
                      {xpGainedToday} /{" "}
                      <span className="dark:text-amber-400 text-amber-700">
                        {bossDayTargetXp}
                      </span>{" "}
                      XP
                    </div>
                    <div className="block md:hidden text-[9px] font-mono dark:text-amber-400 text-amber-700/80 uppercase mt-0.5">
                      +1000 XP & Glory
                    </div>
                  </div>
                </div>
              </div>

              <div className="w-full h-1.5 md:h-2 dark:bg-black bg-white mt-3 md:mt-6 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${Math.min(100, (xpGainedToday / bossDayTargetXp) * 100)}%`,
                  }}
                  className="h-full bg-gradient-to-r from-red-500 to-amber-400"
                />
              </div>
            </motion.div>
          )}
      </AnimatePresence>

      <motion.header
        variants={itemVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-50px" }}
        className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 mb-4 md:mb-0"
      >
        <div className="flex justify-between items-start w-full md:w-auto">
          <div>
            <h1 className="text-2xl md:text-4xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r dark:from-white dark:to-slate-500 from-slate-900 to-slate-600">
              OVERVIEW
            </h1>
            <p className="dark:text-cyan-400 text-cyan-700 font-mono text-[10px] md:text-sm mt-0.5 md:mt-1 flex items-center gap-1 md:gap-2">
              <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-cyan-500 animate-pulse shadow-md shrink-0" />
              SYSTEM ONLINE{" "}
              <span className="hidden md:inline">• MENTOR MODE ACTIVE</span>
            </p>
          </div>
          <div className="block md:hidden">
            <div className="flex items-center gap-2">
              <Shield
                className={`w-4 h-4 ${getRankInfo(level).color} ${getGlowClass(getRankInfo(level).color)}`}
              />
              <span className="text-xs font-bold dark:text-white text-slate-900">
                LVL {level}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 md:gap-4 w-full md:w-auto">
          {isBoostActive && (
            <div className="flex justify-center items-center gap-1 md:gap-2 bg-amber-500/20 border border-amber-500/50 px-3 py-2 md:px-4 md:py-2 rounded-xl md:rounded-lg dark:text-amber-400 text-amber-700 font-bold animate-pulse text-xs md:text-base">
              <motion.div
                whileHover={{ scale: 1.3, rotate: 15 }}
                className="relative z-10"
              >
                <Zap className="w-4 h-4 md:w-5 md:h-5 text-amber-500 dark:text-amber-400 icon-glow-amber" />
              </motion.div>
              {activeBoost.multiplier}x BOOST
            </div>
          )}

          {isSessionActive && sessionStartTime ? (
            <SessionActiveButton
              sessionStartTime={sessionStartTime}
              onStop={handleStopSession}
            />
          ) : (
            <Button
              onClick={handleStartStudyClick}
              variant="default"
              size="lg"
              className="w-full md:w-auto gap-2 font-bold tracking-widest bg-cyan-600 hover:bg-cyan-500 text-white border-cyan-500 shadow-md group overflow-hidden h-12 md:h-11 rounded-xl md:rounded-lg text-xs md:text-sm"
            >
              <motion.div
                whileHover={{ scale: 1.2, rotate: 15 }}
                transition={{ type: "spring", stiffness: 200, damping: 10 }}
              >
                <Play className="w-4 h-4 md:w-5 md:h-5 fill-current drop-shadow-md group-hover:scale-110 transition-transform" />
              </motion.div>
              START STUDY
            </Button>
          )}
        </div>
      </motion.header>

      <motion.div
        variants={itemVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-50px" }}
        className="grid grid-cols-1 xl:grid-cols-5 gap-4 md:gap-6 mb-6 mt-6 md:mt-8"
      >
        {class11EndDate && (
          <div className="xl:col-span-3 h-full">
            <TourStep
              id="dashboard-log"
              title="Log Session & Deep Focus"
              description="Use the Start Study Session button or the Deep Focus timer (inside the progress bar) to log your study hours. This builds your streak and daily XP."
              position="bottom"
              nextStep="dashboard-player"
            >
              <TimeBar
                endDateStr={class11EndDate}
                requiredHours={optimizedStudyHours}
                onStartDeepFocus={() => setShowConfigTimer(true)}
              />
            </TourStep>
          </div>
        )}

        {/* Insights & Tips */}
        <div
          className={`flex flex-col gap-3 md:gap-4 justify-between h-full ${!class11EndDate ? "xl:col-span-5" : "xl:col-span-2"}`}
        >
          <motion.div className="bg-blue-500/10 border-l-2 md:border-l-4 border-blue-500 p-3 md:p-4 rounded-r-xl md:rounded-r-lg border-t border-r border-b dark:border-white/5 border-black/5 md:border-transparent hover:translate-x-1 md:hover:translate-x-2 transition-transform duration-300 flex-1">
            <div className="flex items-start gap-2 md:gap-3 h-full">
              <motion.div
                whileHover={{ scale: 1.3, rotate: 15 }}
                className="relative z-10 shrink-0 mt-0.5"
              >
                <div className="absolute inset-0 bg-blue-500/40 rounded-full  opacity-30" />
                <Lightbulb className="w-6 h-6 dark:text-blue-400 text-blue-700 drop-shadow-md relative z-10" />
              </motion.div>
              <div className="flex flex-col justify-center h-full">
                <h2 className="dark:text-blue-400 text-blue-700 font-bold uppercase tracking-wider text-xs md:text-sm mb-1">
                  Performance Insight
                </h2>
                <div className="dark:text-slate-300 text-slate-900 text-xs md:text-sm leading-relaxed font-medium whitespace-pre-wrap">
                  {dynamicInsight
                    ? dynamicInsight
                    : hoursStudiedToday < 4 && streakDays < 14
                      ? `Focus on building consistency first. Phone out of the room. Win the first 30 mins with a 25-min sprint.\n\n🔒 Lock: Motion beats stagnation.`
                      : streakDays >= 3
                        ? `Consistent momentum! The ego hangover is the enemy now. Acknowledge the ${streakDays} days, then drop it and execute today.\n\n🔒 Lock: Protect the streak.`
                        : questionsSolved < dailyTarget && dailyTarget > 0
                          ? `Fake productivity is reading theory. Close the book, open the DPP. You are ${dailyTarget - questionsSolved} questions away.\n\n🔒 Lock: Let the friction guide you.`
                          : `Elite output yesterday means nothing today. Reset to zero. Master the fundamentals and prove it again.\n\n🔒 Lock: Reset to zero.`}
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div className="bg-purple-500/10 border-l-2 md:border-l-4 border-purple-500 p-3 md:p-4 rounded-r-xl md:rounded-r-lg border-t border-r border-b dark:border-white/5 border-black/5 md:border-transparent hover:translate-x-1 md:hover:translate-x-2 transition-transform duration-300 flex-1">
            <div className="flex items-start gap-2 md:gap-3 h-full">
              <motion.div
                whileHover={{ scale: 1.3, rotate: -15 }}
                className="relative z-10 shrink-0 mt-0.5"
              >
                <Zap className="w-6 h-6 text-purple-600 dark:text-purple-400 icon-glow-purple" />
              </motion.div>
              <div className="flex flex-col justify-center h-full">
                <h3 className="dark:text-purple-400 text-purple-700 font-bold uppercase tracking-wider text-xs md:text-sm mb-1">
                  Pro Tip
                </h3>
                <p className="dark:text-slate-300 text-slate-900 text-xs md:text-sm leading-snug">
                  {currentProTip}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      <motion.div
        variants={itemVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-50px" }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-4 md:mb-8"
      >
        <TourStep
          id="dashboard-player"
          title="Player Status"
          description="This is your main dashboard. It tracks your level, XP, daily targets, and current rank. Consistency is key here; a higher streak grants greater XP multipliers!"
          position="bottom"
          className="md:col-span-2"
          nextStep="dashboard-tasks"
        >
          <TiltWrapper tiltAmount={2} className="h-full">
            <Card className="relative overflow-visible dark:border-white/5 border-black/5 md:border-cyan-500/30 shadow-md md:shadow-md hover:-translate-y-1 hover:shadow-md md:hover:shadow-md transition-all duration-300 group h-full dark:bg-slate-900 bg-white md:dark:bg-black rounded-3xl md:rounded-lg">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/10 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-all duration-1000 -translate-x-full group-hover:translate-x-full ease-in-out pointer-events-none z-20" />
              <div className="absolute -top-12 -right-12 w-48 h-48 bg-cyan-500/10 rounded-full blur-[60px] pointer-events-none" />
              <CardHeader className="flex flex-row items-start md:items-center justify-between relative z-10 pt-4 px-5 md:pt-5 md:px-6 pb-0 gap-2">
                <div className="flex flex-row items-center gap-2">
                  <motion.div
                    whileHover={{ scale: 1.3, rotate: 10 }}
                    className="cursor-pointer relative shrink-0"
                  >
                    <div className="absolute inset-0 bg-cyan-400/30 rounded-full  opacity-0 group-hover/title:opacity-100 transition-opacity" />
                    <Target className="w-8 h-8 md:w-6 md:h-6 dark:text-cyan-400 text-cyan-700 drop-shadow-md relative z-10" />
                  </motion.div>
                  <CardTitle className="text-lg md:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 uppercase tracking-widest leading-tight">
                    Player
                    <br className="block md:hidden" /> Status
                  </CardTitle>
                </div>
                <div className="flex items-center gap-2 md:gap-4 ml-auto">
                  <div
                    className={`px-2 py-1 md:px-3 md:py-1 rounded-xl md:rounded-md border ${getRankInfo(level).bg} ${getRankInfo(level).border} flex items-center gap-1 md:gap-2 group/rank cursor-default shadow-lg dark:bg-black bg-white `}
                  >
                    <motion.div
                      whileHover={{ scale: 1.2, rotate: -15 }}
                      className="relative shrink-0"
                    >
                      <Shield
                        className={`w-3.5 h-3.5 md:w-4 md:h-4 ${getRankInfo(level).color} group-hover/rank:drop-shadow-md transition-all`}
                      />
                    </motion.div>
                    <span
                      className={`text-[10px] md:text-sm font-bold ${getRankInfo(level).color} flex flex-col md:inline items-center leading-none`}
                    >
                      <span>Rank</span>
                      <span className="md:hidden">
                        {getRankInfo(level).rank}
                      </span>
                      <span className="hidden md:inline">
                        {" "}
                        {getRankInfo(level).rank}
                      </span>
                    </span>
                  </div>
                  <div className="flex flex-col items-end text-right">
                    <span className="text-[9px] md:text-xs font-bold dark:text-slate-400 text-slate-600 uppercase tracking-widest block leading-none mb-1">
                      Player
                    </span>
                    <div className="flex flex-col items-end">
                      <span className="text-base md:text-xl font-black dark:text-white text-slate-900 drop-shadow-md leading-none">
                        {playerName}
                      </span>
                      {equippedTitle && (
                        <span className="text-[8px] md:text-[10px] font-mono font-black dark:text-cyan-400 text-cyan-700 bg-cyan-950/40 border border-cyan-500/20 rounded px-1.5 py-0.5 tracking-widest uppercase mt-1 md:mt-1 shadow-md block mt-1">
                          🏆 {equippedTitle}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-5 md:px-6 md:pb-6 pt-0 flex flex-col md:flex-row items-center gap-6 md:gap-10 w-full mt-0">
                {/* Circular Progress Bar (Always visible) */}
                <div className="relative w-64 h-64 md:w-56 md:h-56 items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-500 flex">
                  <div className="absolute inset-0 bg-cyan-500/10 rounded-full  mix-blend-screen pointer-events-none" />
                  {equippedAura && auraStyles[equippedAura] && (
                    <div
                      className={`absolute inset-2 rounded-full border pointer-events-none ${auraStyles[equippedAura]}`}
                    />
                  )}
                  {/* Holographic Ring Effect */}
                  <svg
                    className="w-full h-full transform -rotate-90 overflow-visible"
                    viewBox="0 0 100 100"
                  >
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="rgba(255,255,255,0.05)"
                      strokeWidth="8"
                    />
                    <motion.circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="url(#cyan-gradient)"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray="283"
                      initial={{ strokeDashoffset: 283 }}
                      animate={{ strokeDashoffset: 283 - 283 * levelProgress }}
                      transition={{ duration: 2, ease: "easeOut" }}
                      className="drop-shadow-md"
                    />
                    <defs>
                      <linearGradient
                        id="cyan-gradient"
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="0%"
                      >
                        <stop offset="0%" stopColor="#06b6d4" />
                        <stop offset="100%" stopColor="#3b82f6" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center mt-2">
                    <span className="text-6xl md:text-5xl font-black tracking-tighter dark:text-white text-slate-900 drop-shadow-md">
                      LVL {level}
                    </span>
                    <span className="text-sm md:text-xs font-mono dark:text-cyan-400 text-cyan-700 mt-2 font-bold tracking-widest">
                      {level === 100
                        ? "MAX"
                        : `${xpInCurrentLevel} / ${xpNeededForNextLevel}`}
                    </span>
                  </div>
                </div>

                <div className="flex-1 space-y-6 w-full">
                  <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-900 to-black border dark:border-white/10 border-black/10 p-6 group hover:-translate-y-1 hover:shadow-md transition-all duration-300">
                    <div className="absolute -top-16 -right-16 w-48 h-48 bg-purple-500/10 rounded-full blur-[60px] group-hover:bg-purple-500/15 transition-all duration-500 pointer-events-none" />
                    <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-cyan-500/10 rounded-full blur-[50px] group-hover:bg-cyan-500/15 transition-all duration-500 pointer-events-none" />

                    <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-start relative z-10 gap-4 sm:gap-0">
                      <h3 className="text-2xl sm:text-xl font-bold dark:text-slate-200 text-slate-900 flex items-center gap-3 sm:gap-2 group-hover:scale-[1.02] transition-transform">
                        <motion.div
                          whileHover={{ scale: 1.3, rotate: 10 }}
                          transition={{ duration: 0.5 }}
                          className="cursor-pointer relative z-20 shrink-0"
                        >
                          <Trophy
                            className={`w-8 h-8 sm:w-7 sm:h-7 ${getRankInfo(level).color} ${getGlowClass(getRankInfo(level).color)}`}
                          />
                        </motion.div>
                        <span
                          className={`text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 leading-tight`}
                        >
                          {getRankInfo(level).title}
                        </span>
                      </h3>
                      <div className="bg-cyan-950/50 border dark:border-cyan-500/30 border-cyan-300/40 rounded-xl px-5 py-3 sm:px-4 sm:py-2 text-left sm:text-right shadow-md w-full sm:w-auto">
                        <span className="text-[11px] sm:text-[10px] font-bold dark:text-cyan-400 text-cyan-700 uppercase tracking-widest block mb-1 sm:mb-1">
                          Total XP Earned
                        </span>
                        <span className="text-4xl sm:text-3xl font-black dark:text-white text-slate-900 font-mono drop-shadow-md leading-none">
                          <AnimatedNumber value={xp} />
                        </span>
                      </div>
                    </div>

                    <div className="mt-8 sm:mt-6 relative z-10">
                      <div className="flex justify-between items-end mb-3 sm:mb-2">
                        <span className="text-[10px] sm:text-xs font-bold dark:text-slate-400 text-slate-600 uppercase tracking-wider flex items-center gap-1.5 sm:gap-1 group/ug w-max">
                          <motion.div
                            whileHover={{ scale: 1.3, rotate: 15 }}
                            className="relative z-10 shrink-0"
                          >
                            <Zap className="w-4 h-4 sm:w-4 sm:h-4 dark:text-amber-400 text-amber-700 drop-shadow-md group-hover/ug:drop-shadow-md transition-all" />
                          </motion.div>
                          <span className="leading-tight">
                            Ultimate
                            <br className="sm:hidden" /> Goal
                          </span>
                        </span>
                        <span className="text-lg sm:text-base font-black dark:text-purple-400 text-purple-700 font-mono drop-shadow-md text-right">
                          <AnimatedNumber value={TOTAL_XP_GOAL} />{" "}
                          <span className="text-sm">XP</span>
                        </span>
                      </div>
                      <div className="h-4 dark:bg-slate-800 bg-slate-100/80 rounded-full overflow-hidden border dark:border-white/5 border-black/5 relative">
                        <motion.div
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-600 via-fuchsia-500 to-cyan-500"
                          initial={{ width: 0 }}
                          animate={{
                            width: `${Math.min(100, (xp / totalXpGoal) * 100)}%`,
                          }}
                          transition={{
                            duration: 2,
                            delay: 0.5,
                            ease: "easeOut",
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shimmer" />
                      </div>
                      <p className="text-xs sm:text-sm dark:text-slate-500 text-slate-600 mt-2 font-mono text-center sm:text-right">
                        <AnimatedNumber value={Math.max(0, totalXpGoal - xp)} />{" "}
                        XP remaining to God Tier
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 group hover:-translate-y-1 transition-transform duration-300">
                    <div className="flex justify-between text-sm font-mono">
                      <span className="dark:text-slate-400 text-slate-600">
                        Daily Output Target
                      </span>
                      <span className="dark:text-cyan-400 text-cyan-700">
                        {questionsSolved} / {dailyTarget} Qs
                      </span>
                    </div>
                    <div className="h-2 dark:bg-slate-800 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                        initial={{ width: 0 }}
                        animate={{
                          width: `${Math.min(100, (questionsSolved / dailyTarget) * 100)}%`,
                        }}
                        transition={{ duration: 1.5, delay: 0.5 }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TiltWrapper>
        </TourStep>

        {/* Quick Stats & XP Breakdown */}
        <div className="grid grid-cols-2 gap-4 md:gap-0 md:flex md:flex-col justify-between md:space-y-6">
          <TiltWrapper tiltAmount={4} className="flex-1">
            <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20 h-full hover:-translate-y-1 hover:shadow-md transition-all duration-300 group relative overflow-visible">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/10 to-cyan-500/0 opacity-0 group-hover:opacity-100 transition-all duration-1000 -translate-x-full group-hover:translate-x-full ease-in-out pointer-events-none z-20" />
              <CardContent className="p-4 md:p-6 flex flex-col items-center justify-center h-full gap-2 md:gap-4 text-center relative z-10">
                <motion.div
                  className="w-10 h-10 md:w-16 md:h-16 rounded-full bg-blue-500/20 flex flex-col items-center justify-center relative cursor-pointer group/icon shrink-0"
                  whileHover={{ scale: 1.15, rotate: 5 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="absolute inset-0 bg-blue-500/30 rounded-full  opacity-0 group-hover/icon:opacity-100 transition-duration-500 pointer-events-none animate-pulse" />
                  <Flame className="w-5 h-5 md:w-8 md:h-8 dark:text-blue-400 text-blue-700 drop-shadow-md group-hover/icon:dark:text-blue-300 dark:text-blue-400 text-blue-700 group-hover/icon:drop-shadow-md transition-all duration-300 relative z-10" />
                </motion.div>
                <div>
                  <p className="text-[10px] md:text-sm dark:text-blue-400 text-blue-700/80 font-mono uppercase tracking-wider leading-tight">
                    Acc. Multiplier
                  </p>
                  <p className="text-2xl md:text-4xl font-black mt-1 md:mt-2 dark:text-white text-slate-900">
                    {(accuracy >= 80
                      ? 1.5
                      : accuracy >= 60
                        ? 1.2
                        : 1.0
                    ).toFixed(1)}
                    x
                  </p>
                  <p className="text-[9px] md:text-xs dark:text-slate-400 text-slate-600 mt-1 md:mt-2 hidden sm:block">
                    Maintain &gt;80% accuracy to increase.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TiltWrapper>

          <TiltWrapper tiltAmount={4} className="flex-1">
            <Card className="dark:bg-black bg-white dark:border-orange-500/20 h-full hover:-translate-y-1 hover:shadow-md transition-all duration-300 relative overflow-visible group">
              <div className="absolute inset-0 pointer-events-none opacity-20 group-hover:opacity-40 transition-opacity duration-500">
                <motion.div
                  animate={{ y: [0, -20, 0], x: [0, 10, 0], rotate: 10 }}
                  transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="absolute top-2 left-2 md:top-4 md:left-4"
                >
                  <motion.div whileHover={{ scale: 1.4, rotate: 15 }}>
                    <Flame className="w-4 h-4 md:w-8 md:h-8 text-orange-500 drop-shadow-md" />
                  </motion.div>
                </motion.div>
                <motion.div
                  animate={{ y: [0, 20, 0], x: [0, -10, 0], rotate: -10 }}
                  transition={{
                    duration: 10,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 1,
                  }}
                  className="absolute bottom-2 right-2 md:bottom-4 md:right-4"
                >
                  <motion.div whileHover={{ scale: 1.4, rotate: 15 }}>
                    <Zap className="w-3 h-3 md:w-6 md:h-6 text-yellow-500 dark:text-yellow-400 icon-glow-yellow" />
                  </motion.div>
                </motion.div>
                <motion.div
                  animate={{ y: [0, -15, 0], x: [0, -15, 0], rotate: 15 }}
                  transition={{
                    duration: 9,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 2,
                  }}
                  className="absolute top-1/2 right-4 md:right-8"
                >
                  <motion.div whileHover={{ scale: 1.4, rotate: -15 }}>
                    <Trophy className="w-3 h-3 md:w-5 md:h-5 text-amber-500 dark:text-amber-400 icon-glow-amber" />
                  </motion.div>
                </motion.div>
              </div>
              <CardContent className="p-4 md:p-6 flex flex-col justify-center items-center h-full text-center relative z-10">
                <h3 className="text-[10px] md:text-sm font-bold dark:text-orange-400 text-orange-600 uppercase tracking-wider mb-1 md:mb-2 flex items-center gap-1 md:gap-2 group-hover:scale-105 transition-transform">
                  <motion.div
                    whileHover={{ scale: 1.5, rotate: 10 }}
                    transition={{ duration: 0.5 }}
                    className="cursor-pointer relative z-20"
                  >
                    <Flame className="w-4 h-4 md:w-5 md:h-5 text-orange-500 dark:text-orange-400 icon-glow-rose" />
                  </motion.div>
                  Current Streak
                </h3>
                <motion.div
                  animate={
                    pulseStreak
                      ? {
                          scale: [1, 1.3, 1],
                          color: ["#fb923c", "#ffffff", "#fb923c"],
                        }
                      : {}
                  }
                  transition={{ duration: 0.5 }}
                  className="text-2xl md:text-5xl font-black dark:text-white text-slate-900 drop-shadow-md"
                >
                  {streakDays}{" "}
                  <span className="text-xs md:text-2xl text-orange-500 uppercase tracking-widest pl-1">
                    Days
                  </span>
                </motion.div>
                <p className="text-[9px] md:text-xs dark:text-slate-400 text-slate-600 mt-1 md:mt-4 hidden sm:block">
                  Keep the fire burning! Study daily to maintain your streak.
                </p>
              </CardContent>
            </Card>
          </TiltWrapper>
        </div>
      </motion.div>

      {/* Today's XP Goal */}
      <motion.div
        variants={itemVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-50px" }}
        className="grid grid-cols-1 gap-6 mb-8"
      >
        <TiltWrapper tiltAmount={6}>
          <Card
            onClick={() => setShowLiveDay(true)}
            className="cursor-pointer relative overflow-visible border-blue-400/50 shadow-md hover:shadow-md transition-all duration-500 dark:bg-gradient-to-br dark:from-blue-950/80 dark:to-black bg-gradient-to-br from-blue-100 to-white transform hover:scale-[1.01]"
          >
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')] opacity-20 mix-blend-overlay pointer-events-none" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-70" />

            <CardHeader className="pt-4 pb-2 md:pt-6 md:pb-2 relative z-10 text-center">
              <CardTitle className="text-xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300 uppercase tracking-widest flex items-center justify-center gap-2 md:gap-3 drop-shadow-md group/goal">
                <motion.div
                  whileHover={{ scale: 1.2, rotate: 15 }}
                  className="relative z-10"
                >
                  <Target className="w-5 h-5 md:w-8 md:h-8 text-blue-500 dark:text-blue-400 icon-glow-blue relative z-10" />
                </motion.div>
                Today's XP Goal
              </CardTitle>
            </CardHeader>
            <CardContent className="relative z-10 px-4 pb-6 md:px-6 md:pt-4 md:pb-8">
              {!class11EndDate ? (
                <div className="dark:bg-black bg-white border dark:border-slate-700 border-slate-300 rounded-xl p-6 text-center flex flex-col items-center justify-center group/uncal">
                  <motion.div
                    whileHover={{ scale: 1.2, rotate: -15 }}
                    className="relative mb-2"
                  >
                    <Target className="w-8 h-8 text-slate-600 drop-shadow-md group-hover/uncal:dark:text-slate-400 text-slate-600 transition-colors" />
                  </motion.div>
                  <h3 className="text-md font-bold dark:text-slate-300 text-slate-900 mb-1">
                    Goal Not Calibrated
                  </h3>
                  <Button
                    onClick={() => setIsClass11SetupDone(false)}
                    variant="outline"
                    size="sm"
                    className="mt-2 border-blue-500/50 dark:text-blue-400 text-blue-700 hover:bg-blue-950/50"
                  >
                    Calibrate Now
                  </Button>
                </div>
              ) : (
                <div className="space-y-6 max-w-4xl mx-auto">
                  <div className="relative">
                    <div className="h-8 bg-blue-950/50 rounded-full overflow-hidden relative border border-blue-500/30 shadow-inner">
                      <div
                        className={`h-full rounded-full transition-[width,background-color] duration-1000 ease-out relative overflow-hidden ${
                          (xpGainedToday /
                            Math.max(1, Math.round(dailyXpRequired))) *
                            100 >=
                          70
                            ? "bg-gradient-to-r from-emerald-600 to-green-400 shadow-md"
                            : (xpGainedToday /
                                  Math.max(1, Math.round(dailyXpRequired))) *
                                  100 >=
                                40
                              ? "bg-gradient-to-r from-amber-500 to-yellow-300 shadow-md"
                              : "bg-gradient-to-r from-red-600 to-rose-400 shadow-md"
                        }`}
                        style={{
                          width: `${Math.min(100, isNaN(dailyXpRequired) || dailyXpRequired === 0 ? 0 : (xpGainedToday / Math.max(1, Math.round(dailyXpRequired))) * 100)}%`,
                        }}
                      >
                        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%,transparent_100%)] bg-[length:20px_20px] " />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-end px-2 pt-4">
                    <div className="text-left">
                      <span className="text-[10px] md:text-sm font-bold dark:text-blue-300 dark:text-blue-400 text-blue-700/70 uppercase tracking-wider block mb-1">
                        Current Earned
                      </span>
                      <span className="text-3xl md:text-6xl font-black dark:text-white text-slate-900 font-mono drop-shadow-md">
                        <AnimatedNumber value={xpGainedToday} />{" "}
                        <span className="text-lg md:text-2xl dark:text-blue-400 text-blue-700">
                          XP
                        </span>
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] md:text-sm font-bold dark:text-blue-300 dark:text-blue-400 text-blue-700/70 uppercase tracking-wider block mb-1">
                        Maximum Target
                      </span>
                      <span className="text-xl md:text-4xl font-black text-blue-200/80 font-mono">
                        <AnimatedNumber value={Math.round(dailyXpRequired)} />{" "}
                        <span className="text-sm md:text-lg dark:text-blue-400 text-blue-700/50">
                          XP
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TiltWrapper>
      </motion.div>

      {/* Log JEE Session */}
      <JeeSessionLogger
        pendingSessionLog={pendingSessionLog}
        clearPendingSessionLog={() => setPendingSessionLog(null)}
      />

      {/* Quick Log */}
      <motion.div
        variants={itemVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-50px" }}
        className="mb-8"
      >
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 group/title w-max">
          <motion.div
            whileHover={{ scale: 1.3, rotate: 15 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-amber-400/30 rounded-full  opacity-0 group-hover/title:opacity-100 transition-opacity duration-300" />
            <Zap className="w-5 h-5 dark:text-amber-400 text-amber-700 drop-shadow-md relative z-10 group-hover/title:drop-shadow-md transition-all" />
          </motion.div>
          QUICK LOG
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
          <button
            onClick={() => {
              setLectureNotes(true);
              addXp(30);
              hapticSuccess();
            }}
            disabled={lectureNotes}
            className={`flex items-center justify-between p-3 md:p-4 rounded-xl border transition-all ${lectureNotes ? "bg-cyan-900/20 dark:border-cyan-500/30 border-cyan-300/40 opacity-50 cursor-not-allowed" : "dark:bg-black bg-white border dark:border-slate-700 border-slate-300 hover:border-cyan-500/50 hover:dark:bg-slate-800 bg-slate-100/50"}`}
          >
            <div className="text-left">
              <p className="text-sm md:text-base dark:text-slate-200 text-slate-900 font-bold">
                Made Notes
              </p>
              <p className="text-[10px] md:text-xs dark:text-slate-400 text-slate-600">
                Daily Habit
              </p>
            </div>
            <div className="bg-cyan-500/20 dark:text-cyan-400 text-cyan-700 px-2 md:px-3 py-1 rounded-lg text-xs md:text-sm font-bold">
              +
              {Math.round(
                30 *
                  getStreakMultiplier() *
                  (activeBoost && activeBoost.expiresAt > Date.now()
                    ? activeBoost.multiplier
                    : 1),
              )}{" "}
              XP
            </div>
          </button>

          <button
            onClick={() => {
              setLectureQuestions(true);
              addXp(70);
              hapticSuccess();
            }}
            disabled={lectureQuestions}
            className={`flex items-center justify-between p-3 md:p-4 rounded-xl border transition-all ${lectureQuestions ? "bg-cyan-900/20 dark:border-cyan-500/30 border-cyan-300/40 opacity-50 cursor-not-allowed" : "dark:bg-black bg-white border dark:border-slate-700 border-slate-300 hover:border-cyan-500/50 hover:dark:bg-slate-800 bg-slate-100/50"}`}
          >
            <div className="text-left">
              <p className="text-sm md:text-base dark:text-slate-200 text-slate-900 font-bold">
                Practiced 10-20 Qs
              </p>
              <p className="text-[10px] md:text-xs dark:text-slate-400 text-slate-600">
                Daily Habit
              </p>
            </div>
            <div className="bg-cyan-500/20 dark:text-cyan-400 text-cyan-700 px-2 md:px-3 py-1 rounded-lg text-xs md:text-sm font-bold">
              +
              {Math.round(
                70 *
                  getStreakMultiplier() *
                  (activeBoost && activeBoost.expiresAt > Date.now()
                    ? activeBoost.multiplier
                    : 1),
              )}{" "}
              XP
            </div>
          </button>

          <button
            onClick={() => {
              setLectureHomework(true);
              addXp(20);
              hapticSuccess();
            }}
            disabled={lectureHomework}
            className={`flex items-center justify-between p-3 md:p-4 rounded-xl border transition-all ${lectureHomework ? "bg-cyan-900/20 dark:border-cyan-500/30 border-cyan-300/40 opacity-50 cursor-not-allowed" : "dark:bg-black bg-white border dark:border-slate-700 border-slate-300 hover:border-cyan-500/50 hover:dark:bg-slate-800 bg-slate-100/50"}`}
          >
            <div className="text-left">
              <p className="text-sm md:text-base dark:text-slate-200 text-slate-900 font-bold">
                Homework Done
              </p>
              <p className="text-[10px] md:text-xs dark:text-slate-400 text-slate-600">
                Good habit
              </p>
            </div>
            <div className="bg-cyan-500/20 dark:text-cyan-400 text-cyan-700 px-2 md:px-3 py-1 rounded-lg text-xs md:text-sm font-bold">
              +
              {Math.round(
                20 *
                  getStreakMultiplier() *
                  (activeBoost && activeBoost.expiresAt > Date.now()
                    ? activeBoost.multiplier
                    : 1),
              )}{" "}
              XP
            </div>
          </button>
        </div>
      </motion.div>

      {/* To-Do List */}
      <TourStep
        id="dashboard-tasks"
        title="Study Plan Queue"
        description="Add, manage, and check off your study tasks here. Clicking 'Add Task' guides you through selecting a topic, generating calendar points automatically."
        position="top"
      >
        <motion.div
          variants={itemVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-50px" }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2 group/title w-max">
              <motion.div
                whileHover={{ scale: 1.3, rotate: -10 }}
                className="cursor-pointer relative"
              >
                <div className="absolute inset-0 bg-cyan-400/30 rounded-full  opacity-0 group-hover/title:opacity-100 transition-opacity" />
                <CheckSquare className="w-6 h-6 dark:text-cyan-400 text-cyan-700 drop-shadow-md relative z-10" />
              </motion.div>
              STUDY PLAN
            </h2>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortByPriority(!sortByPriority)}
                className={`dark:border-slate-700 border-slate-300 h-8 ${sortByPriority ? "bg-cyan-900/50 dark:text-cyan-400 text-cyan-700 border-cyan-500/50" : "dark:bg-black bg-white dark:text-slate-400 text-slate-600"}`}
              >
                Sort by Urgency
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowCalendar(true)}
                className="h-8 px-3 text-white border-none rounded-[7px] font-bold gap-1.5 bg-[rgb(0,140,255)] uppercase tracking-[2px] text-[11px] transition-[box-shadow] duration-500 shadow-[0_0_25px_rgb(0,140,255)] hover:shadow-[0_0_5px_rgb(0,140,255),0_0_25px_rgb(0,140,255),0_0_50px_rgb(0,140,255),0_0_100px_rgb(0,140,255)]"
              >
                <Calendar className="w-4 h-4 text-white" />
                Calendar
              </Button>
            </div>
          </div>
          <Card
            id="dashboard-tasks-section"
            className="dark:border-white/10 border-black/10 dark:bg-black bg-white hover:-translate-y-1 hover:shadow-md transition-all duration-300 group relative overflow-hidden scroll-mt-24"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-all duration-1000 -translate-x-full group-hover:translate-x-full ease-in-out pointer-events-none z-20" />
            <CardContent className="p-3 md:p-6 relative z-10">
              {isAddingTask ? (
                <div className="dark:bg-slate-900/50 bg-white border dark:border-cyan-500/30 border-cyan-300/40 rounded-xl p-4 mb-6">
                  <div className="flex items-center gap-4 mb-4 pb-4 border-b dark:border-white/10 border-black/10">
                    <span className="text-xs font-bold dark:text-slate-400 text-slate-600 uppercase tracking-widest">
                      Priority:
                    </span>
                    <div className="flex gap-2">
                      {(["Low", "Medium", "High"] as const).map((p) => (
                        <button
                          key={p}
                          onClick={() => setTaskPriority(p)}
                          className={`text-xs px-3 py-1 rounded-full font-bold transition-all ${
                            taskPriority === p
                              ? p === "High"
                                ? "bg-rose-500/20 dark:text-rose-400 text-rose-700 border border-rose-500/50"
                                : p === "Medium"
                                  ? "bg-amber-500/20 dark:text-amber-400 text-amber-700 border border-amber-500/50"
                                  : "bg-emerald-500/20 dark:text-emerald-400 text-emerald-700 border border-emerald-500/50"
                              : "dark:bg-slate-800 bg-slate-100 dark:text-slate-500 text-slate-600 hover:dark:text-slate-300 text-slate-900 border border-transparent"
                          }`}
                        >
                          {p === "High" ? "CRITICAL MISSION" : p}
                        </button>
                      ))}
                    </div>
                  </div>
                  {taskStep === 1 && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold dark:text-cyan-400 text-cyan-700 uppercase tracking-wider">
                          Select Subject
                        </h3>
                        {continueTarget && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-[10px] bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 border-cyan-500/50 hover:bg-cyan-500/30"
                            onClick={() => {
                              setSelectedSubject(continueTarget.subject);
                              setSelectedChapter(continueTarget.chapter);
                              setTaskStep(3);
                            }}
                          >
                            Continue: {continueTarget.subject} -{" "}
                            {continueTarget.chapter.substring(0, 15)}
                            {continueTarget.chapter.length > 15
                              ? "..."
                              : ""}{" "}
                            &rarr;
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {["Physics", "Chemistry", "Mathematics"].map((sub) => {
                          const suggested = getCurrentChapterForSubject(sub);
                          return (
                            <Button
                              key={sub}
                              variant="outline"
                              className="dark:border-slate-700 border-slate-300 hover:border-cyan-500 hover:dark:text-cyan-400 text-cyan-700 dark:text-slate-300 text-slate-900 dark:bg-black bg-white flex flex-col items-center justify-center py-4 h-auto gap-1"
                              onClick={() => {
                                setSelectedSubject(sub);
                                setSelectedChapter(null);
                                setTaskStep(2);
                              }}
                            >
                              <span className="font-bold">{sub}</span>
                              {suggested && (
                                <span className="text-[10px] dark:text-cyan-400/80 text-cyan-700/80 font-medium truncate max-w-full px-1">
                                  {suggested.substring(0, 15)}
                                  {suggested.length > 15 ? "..." : ""}
                                </span>
                              )}
                            </Button>
                          );
                        })}
                      </div>
                      <Button
                        variant="outline"
                        className="mt-3 w-full border-dashed border-purple-500/50 hover:border-purple-500 hover:bg-purple-500/10 dark:text-purple-400 text-purple-700"
                        onClick={() => {
                          setSelectedSubject(null);
                          setSelectedChapter(null);
                          setTaskStep(6 as any);
                        }}
                      >
                        <Plus className="w-4 h-4 mr-2" /> Quick Custom Task
                      </Button>
                      <Button
                        variant="ghost"
                        className="mt-4 dark:text-slate-500 text-slate-600 w-full hover:dark:text-slate-300 text-slate-900"
                        onClick={resetTaskAdder}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                  {taskStep === 2 && selectedSubject && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold dark:text-cyan-400 text-cyan-700 uppercase tracking-wider">
                          Select Chapter ({selectedSubject})
                        </h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setTaskStep(1)}
                          className="dark:text-slate-400 text-slate-600 h-6 text-xs hover:dark:text-slate-300 text-slate-900"
                        >
                          Back
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                        {syllabus[selectedSubject as keyof SyllabusData].map(
                          (chap) => {
                            const isRecommended =
                              getCurrentChapterForSubject(selectedSubject) ===
                              chap.name;
                            return (
                              <Button
                                key={chap.name}
                                variant="outline"
                                className={`justify-between text-left h-auto py-2.5 px-3 border flex items-center w-full ${isRecommended ? "border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-950/10 hover:border-cyan-500 hover:dark:text-cyan-400 text-cyan-700" : "dark:border-slate-700 border-slate-300 hover:border-cyan-500 dark:text-slate-300 text-slate-900 dark:bg-black bg-white hover:dark:text-cyan-400 text-cyan-700"}`}
                                onClick={() => {
                                  setSelectedChapter(chap.name);
                                  setTaskStep(3);
                                  setHasEditedLecture(false);
                                  setLectureNumberInput("");
                                }}
                              >
                                <span className="truncate">{chap.name}</span>
                                {isRecommended && (
                                  <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ml-2">
                                    Current
                                  </span>
                                )}
                              </Button>
                            );
                          },
                        )}
                      </div>
                    </div>
                  )}
                  {taskStep === 3 && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold dark:text-cyan-400 text-cyan-700 uppercase tracking-wider">
                          Select Task Type
                        </h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setTaskStep(2)}
                          className="dark:text-slate-400 text-slate-600 h-6 text-xs hover:dark:text-slate-300 text-slate-900"
                        >
                          Back
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <Button
                          variant="outline"
                          className="dark:border-slate-700 border-slate-300 hover:border-blue-500 hover:dark:text-blue-400 text-blue-700 dark:text-slate-300 text-slate-900 dark:bg-black bg-white flex flex-col items-center py-6 h-auto gap-2 group/taskbtn"
                          onClick={() => setTaskStep(5)}
                        >
                          <motion.div
                            whileHover={{ scale: 1.2, rotate: 15 }}
                            className="relative"
                          >
                            <Play className="w-6 h-6 group-hover/taskbtn:drop-shadow-md transition-all" />
                          </motion.div>
                          <span>Lecture</span>
                        </Button>
                        <Button
                          variant="outline"
                          className="dark:border-slate-700 border-slate-300 hover:border-green-500 hover:dark:text-green-400 text-green-700 dark:text-slate-300 text-slate-900 dark:bg-black bg-white flex flex-col items-center py-6 h-auto gap-2 group/taskbtn"
                          onClick={() =>
                            handleAddTask(
                              50,
                              "Question Practice",
                              "Practice",
                              undefined,
                              addToCalendarOption,
                              customDuration,
                            )
                          }
                        >
                          <motion.div
                            whileHover={{ scale: 1.2, rotate: -10 }}
                            className="relative"
                          >
                            <CheckSquare className="w-6 h-6 group-hover/taskbtn:drop-shadow-md transition-all" />
                          </motion.div>
                          <span>Practice</span>
                        </Button>
                        <Button
                          variant="outline"
                          className="dark:border-slate-700 border-slate-300 hover:border-emerald-500 hover:dark:text-emerald-400 text-emerald-700 dark:text-slate-300 text-slate-900 dark:bg-black bg-white flex flex-col items-center py-6 h-auto gap-2 group/taskbtn"
                          onClick={() =>
                            handleAddTask(
                              50,
                              "DPP",
                              "DPP",
                              undefined,
                              addToCalendarOption,
                              customDuration,
                            )
                          }
                        >
                          <motion.div
                            whileHover={{ scale: 1.2, rotate: 15 }}
                            className="relative"
                          >
                            <CheckSquare className="w-6 h-6 group-hover/taskbtn:drop-shadow-md transition-all" />
                          </motion.div>
                          <span>DPP</span>
                        </Button>
                        <Button
                          variant="outline"
                          className="dark:border-slate-700 border-slate-300 hover:border-purple-500 hover:dark:text-purple-400 text-purple-700 dark:text-slate-300 text-slate-900 dark:bg-black bg-white flex flex-col items-center py-6 h-auto gap-2 group/taskbtn"
                          onClick={() =>
                            handleAddTask(
                              200,
                              "Chapter Test",
                              "Chapter Test",
                              undefined,
                              addToCalendarOption,
                              customDuration,
                            )
                          }
                        >
                          <motion.div
                            whileHover={{ scale: 1.2, rotate: -15 }}
                            className="relative"
                          >
                            <CheckSquare className="w-6 h-6 group-hover/taskbtn:drop-shadow-md transition-all" />
                          </motion.div>
                          <span>Chapter Test</span>
                        </Button>
                        <Button
                          variant="outline"
                          className="dark:border-slate-700 border-slate-300 hover:border-indigo-500 hover:dark:text-indigo-400 text-indigo-600 dark:text-slate-300 text-slate-900 dark:bg-black bg-white flex flex-col items-center py-6 h-auto gap-2 group/taskbtn"
                          onClick={() =>
                            handleAddTask(
                              50,
                              "Revision",
                              "Revision",
                              undefined,
                              addToCalendarOption,
                              customDuration,
                            )
                          }
                        >
                          <motion.div
                            whileHover={{ scale: 1.2, rotate: 90 }}
                            className="relative"
                          >
                            <RefreshCw className="w-6 h-6 group-hover/taskbtn:drop-shadow-md transition-all" />
                          </motion.div>
                          <span>Revision</span>
                        </Button>
                        <Button
                          variant="outline"
                          className="dark:border-slate-700 border-slate-300 hover:border-rose-500 hover:dark:text-rose-400 text-rose-700 dark:text-slate-300 text-slate-900 dark:bg-black bg-white flex flex-col items-center py-6 h-auto gap-2 group/taskbtn"
                          onClick={() =>
                            handleAddTask(
                              100,
                              "PYQs",
                              "Practice",
                              undefined,
                              addToCalendarOption,
                              customDuration,
                            )
                          }
                        >
                          <motion.div
                            whileHover={{ scale: 1.2, rotate: 15 }}
                            className="relative"
                          >
                            <Target className="w-6 h-6 group-hover/taskbtn:drop-shadow-md transition-all" />
                          </motion.div>
                          <span>PYQs</span>
                        </Button>
                        <Button
                          variant="outline"
                          className="dark:border-slate-700 border-slate-300 hover:border-amber-500 hover:dark:text-amber-400 text-amber-700 dark:text-slate-300 text-slate-900 dark:bg-black bg-white flex flex-col items-center py-6 h-auto gap-2 group/taskbtn"
                          onClick={() => setTaskStep(4)}
                        >
                          <motion.div
                            whileHover={{ scale: 1.2, rotate: 90 }}
                            className="relative"
                          >
                            <Plus className="w-6 h-6 group-hover/taskbtn:drop-shadow-md transition-all" />
                          </motion.div>
                          <span>Custom</span>
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        className="mt-4 dark:text-slate-500 text-slate-600 w-full hover:dark:text-slate-300 text-slate-900"
                        onClick={resetTaskAdder}
                      >
                        Skip / Cancel
                      </Button>
                    </div>
                  )}
                  {taskStep === 4 && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold dark:text-cyan-400 text-cyan-700 uppercase tracking-wider">
                          Custom Task
                        </h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setTaskStep(3)}
                          className="dark:text-slate-400 text-slate-600 h-6 text-xs hover:dark:text-slate-300 text-slate-900"
                        >
                          Back
                        </Button>
                      </div>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const val = (
                            e.currentTarget.elements.namedItem(
                              "taskName",
                            ) as HTMLInputElement
                          ).value;
                          if ((val || "").trim()) {
                            handleAddTask(
                              50,
                              (val || "").trim(),
                              "Custom",
                              undefined,
                              addToCalendarOption,
                              customDuration,
                            );
                          }
                        }}
                        className="flex flex-col gap-3"
                      >
                        <div className="flex gap-3">
                          <input
                            name="taskName"
                            type="text"
                            placeholder="Enter custom task name..."
                            autoFocus={true}
                            className="flex-1 dark:bg-black bg-white border dark:border-slate-700 border-slate-300 rounded-lg px-4 py-2 dark:text-white text-slate-900 focus:border-cyan-500 outline-none"
                          />
                          <Button
                            type="submit"
                            variant="default"
                            className="bg-cyan-600 hover:bg-cyan-500 text-white"
                          >
                            Add
                          </Button>
                        </div>
                        <CalendarCheckbox
                          checked={addToCalendarOption}
                          onChange={setAddToCalendarOption}
                        />
                        {false && (
                          <label>
                            <input
                              type="checkbox"
                              checked={addToCalendarOption}
                              onChange={(e) =>
                                setAddToCalendarOption(e.target.checked)
                              }
                              className="rounded border-slate-600 text-cyan-500 focus:ring-cyan-500/50"
                            />
                            Add this task to Google Calendar
                          </label>
                        )}
                      </form>
                    </div>
                  )}
                  {taskStep === 5 && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold dark:text-cyan-400 text-cyan-700 uppercase tracking-wider">
                          Enter Lecture Number
                        </h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setTaskStep(3)}
                          className="dark:text-slate-400 text-slate-600 h-6 text-xs hover:dark:text-slate-300 text-slate-900"
                        >
                          Back
                        </Button>
                      </div>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const val = (
                            e.currentTarget.elements.namedItem(
                              "lectureNum",
                            ) as HTMLInputElement
                          ).value;
                          const finalVal =
                            (val || "").trim() ||
                            predictNextLecture(
                              selectedSubject || "",
                              selectedChapter || "",
                              todos,
                              history,
                              syllabus,
                            );
                          if (finalVal) {
                            handleAddTask(
                              100,
                              "Lecture",
                              "Lecture",
                              finalVal,
                              addToCalendarOption,
                              customDuration,
                            );
                          }
                        }}
                        className="flex flex-col gap-3"
                      >
                        <div className="flex gap-3">
                          <input
                            name="lectureNum"
                            type="number"
                            placeholder="e.g. 4"
                            value={
                              (hasEditedLecture
                                ? lectureNumberInput
                                : predictNextLecture(
                                    selectedSubject || "",
                                    selectedChapter || "",
                                    todos,
                                    history,
                                    syllabus,
                                  )) || ""
                            }
                            onChange={(e) => {
                              setLectureNumberInput(e.target.value);
                              setHasEditedLecture(true);
                            }}
                            autoFocus={true}
                            className="flex-1 dark:bg-black bg-white border dark:border-slate-700 border-slate-300 rounded-lg px-4 py-2 dark:text-white text-slate-900 focus:border-cyan-500 outline-none"
                          />
                          <Button
                            type="submit"
                            variant="default"
                            className="bg-cyan-600 hover:bg-cyan-500 text-white"
                          >
                            Add
                          </Button>
                        </div>
                        <CalendarCheckbox
                          checked={addToCalendarOption}
                          onChange={setAddToCalendarOption}
                        />
                        {false && (
                          <label>
                            <input
                              type="checkbox"
                              checked={addToCalendarOption}
                              onChange={(e) =>
                                setAddToCalendarOption(e.target.checked)
                              }
                              className="rounded border-slate-600 text-cyan-500 focus:ring-cyan-500/50"
                            />
                            Add this task to Google Calendar
                          </label>
                        )}
                      </form>
                    </div>
                  )}
                  {taskStep === 6 && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold dark:text-cyan-400 text-cyan-700 uppercase tracking-wider">
                          Quick Custom Task
                        </h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setTaskStep(1)}
                          className="dark:text-slate-400 text-slate-600 h-6 text-xs hover:dark:text-slate-300 text-slate-900"
                        >
                          Back
                        </Button>
                      </div>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const val = (
                            e.currentTarget.elements.namedItem(
                              "taskName",
                            ) as HTMLInputElement
                          ).value;
                          if ((val || "").trim()) {
                            handleAddTask(
                              50,
                              (val || "").trim(),
                              "Quick Custom",
                              undefined,
                              addToCalendarOption,
                              customDuration,
                            );
                          }
                        }}
                        className="flex flex-col gap-3"
                      >
                        <div className="flex gap-3">
                          <input
                            name="taskName"
                            type="text"
                            placeholder="Enter task name..."
                            autoFocus={true}
                            className="flex-1 dark:bg-black bg-white border dark:border-slate-700 border-slate-300 rounded-lg px-4 py-2 dark:text-white text-slate-900 focus:border-cyan-500 outline-none"
                          />
                          <Button
                            type="submit"
                            variant="default"
                            className="bg-cyan-600 hover:bg-cyan-500 text-white"
                          >
                            Add
                          </Button>
                        </div>
                        <CalendarCheckbox
                          checked={addToCalendarOption}
                          onChange={setAddToCalendarOption}
                        />
                        {false && (
                          <label>
                            <input
                              type="checkbox"
                              checked={addToCalendarOption}
                              onChange={(e) =>
                                setAddToCalendarOption(e.target.checked)
                              }
                              className="rounded border-slate-600 text-cyan-500 focus:ring-cyan-500/50"
                            />
                            Add this task to Google Calendar
                          </label>
                        )}
                      </form>
                    </div>
                  )}
                </div>
              ) : (
                <div className="relative">
                  {activeStep === "dashboard-tasks" && !isAddingTask && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: [0, -10, 0] }}
                      transition={{
                        repeat: Infinity,
                        duration: 1.5,
                        ease: "easeInOut",
                      }}
                      className="absolute -top-12 left-1/2 -translate-x-1/2 z-[105] pointer-events-none flex flex-col items-center"
                    >
                      <MousePointerClick className="w-8 h-8 dark:text-cyan-400 text-cyan-700 drop-shadow-md" />
                      <span className="bg-cyan-500 text-black text-[10px] font-black px-2 py-1 rounded shadow-md mt-1 whitespace-nowrap uppercase tracking-widest">
                        Click Add Task
                      </span>
                    </motion.div>
                  )}
                  <Button
                    onClick={() => {
                      setIsAddingTask(true);
                      setTaskStep(1);
                    }}
                    variant="outline"
                    className={`w-full border-dashed ${activeStep === "dashboard-tasks" && !isAddingTask ? "border-cyan-400 bg-cyan-900/30 dark:text-cyan-300 dark:text-cyan-400 text-cyan-700 shadow-md" : "border-slate-600/50 dark:text-slate-400 text-slate-600 hover:dark:text-cyan-400 text-cyan-700 hover:border-cyan-500 hover:bg-cyan-950/20"} mb-4 md:mb-6 py-4 md:py-6 group/add transition-all relative z-[102]`}
                  >
                    <motion.div
                      whileHover={{ scale: 1.3, rotate: 90 }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 10,
                      }}
                    >
                      <Plus className="w-4 h-4 md:w-5 md:h-5 mr-2 md:mr-3 group-hover/add:drop-shadow-md" />
                    </motion.div>
                    <span className="font-bold tracking-widest text-xs md:text-sm">
                      ADD NEW TASK
                    </span>
                  </Button>
                </div>
              )}

              <div className="space-y-3">
                <AnimatePresence>
                  {displayedTodos.length === 0 ? (
                    <motion.div
                      key="empty-todos"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center py-8 dark:text-slate-500 text-slate-600 font-mono text-sm"
                    >
                      NO ACTIVE TASKS. ADD A GOAL TO BEGIN.
                    </motion.div>
                  ) : (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={displayedTodos.map((t) => t.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-3">
                          {displayedTodos.map((todo) => (
                            <SortableTodoItem
                              key={todo.id}
                              todo={todo}
                              toggleTodo={toggleTodo}
                              deleteTodo={deleteTodo}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}
                </AnimatePresence>
              </div>

              <div className="mt-6 pt-4 border-t dark:border-white/10 border-black/10 text-center">
                <p className="text-sm dark:text-slate-400 text-slate-600 italic">
                  Log the study session to earn the XP and contribute to your
                  daily total.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </TourStep>

      {/* Backlog Area */}
      {allBacklogTasks.length > 0 && (
        <motion.div
          variants={itemVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-50px" }}
          className="mt-8"
        >
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 group/title w-max dark:text-red-400 text-red-700 uppercase tracking-widest">
            <motion.div
              whileHover={{ scale: 1.3, rotate: -10 }}
              className="cursor-pointer relative"
            >
              <div className="absolute inset-0 bg-red-400/30 rounded-full  opacity-0 group-hover/title:opacity-100 transition-opacity" />
              <AlertTriangle className="w-6 h-6 dark:text-red-400 text-red-700 drop-shadow-md relative z-10" />
            </motion.div>
            BACKLOG AREA
          </h2>
          <div className="flex flex-wrap gap-2 mb-4">
            {[
              "All",
              "Physics",
              "Mathematics",
              "Chemistry",
              "Lecture",
              "DPP",
            ].map((f) => (
              <button
                key={f}
                onClick={() => setBacklogFilter(f)}
                className={`px-3 py-1 text-xs font-bold rounded-full border transition-all ${
                  backlogFilter === f
                    ? "bg-red-500/30 text-red-200 border-red-500/50"
                    : "dark:bg-black bg-white dark:text-slate-400 text-slate-600 dark:border-slate-700 border-slate-300 hover:border-slate-500 hover:dark:text-slate-300 text-slate-900"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <Card className="border-red-500/30 bg-red-950/10 relative overflow-hidden group">
            <CardContent className="p-4 sm:p-6">
              <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                <AnimatePresence>
                  {filteredDashboardBacklogs.map((task) => {
                    const isMustDo = backlogPriorities[task.id] === "Must-Do";
                    return (
                      <motion.div
                        key={`backlog-${task.id}`}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{
                          type: "spring",
                          stiffness: 300,
                          damping: 25,
                        }}
                        className={`flex flex-col justify-between p-3 rounded-lg border shadow-lg transition-colors duration-300 relative overflow-hidden ${
                          isMustDo
                            ? "border-yellow-500/60 bg-yellow-950/20 shadow-md hover:border-yellow-400/80 hover:bg-yellow-900/30"
                            : "border-red-500/40 dark:bg-black bg-slate-50 hover:border-red-400/80 hover:bg-red-900/40"
                        }`}
                      >
                        <div
                          className={`absolute -top-10 -right-10 w-24 h-24 rounded-full blur-[30px] pointer-events-none ${isMustDo ? "bg-yellow-500/15" : "bg-red-500/10"}`}
                        />
                        <div>
                          <div className="flex items-start gap-2 mb-2">
                            <AlertTriangle
                              className={`w-4 h-4 shrink-0 mt-0.5 ${isMustDo ? "dark:text-yellow-400 text-yellow-700" : "dark:text-red-400 text-red-700"}`}
                            />
                            <span className="text-xs font-bold dark:text-slate-200 text-slate-900 leading-tight">
                              {task.text}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 text-[9px] uppercase font-mono tracking-wider font-bold">
                            {isMustDo && (
                              <span className="px-1.5 py-0.5 bg-yellow-500/20 dark:text-yellow-300 dark:text-yellow-400 text-yellow-700 rounded border border-yellow-500/30">
                                MUST-DO
                              </span>
                            )}
                            <span
                              className={`px-1.5 py-0.5 rounded border ${isMustDo ? "bg-yellow-500/10 text-yellow-200 border-yellow-500/20" : "bg-red-500/20 dark:text-red-300 dark:text-red-400 text-red-700 border-red-500/30"}`}
                            >
                              {task.type}
                            </span>
                            {task.subject && (
                              <span className="px-1.5 py-0.5 bg-blue-500/20 dark:text-blue-300 dark:text-blue-400 text-blue-700 rounded border border-blue-500/30">
                                {task.subject}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleStartBacklog(task)}
                          className={`mt-3 w-full h-7 text-[10px] tracking-wider uppercase font-bold border ${
                            isMustDo
                              ? "bg-yellow-600/30 hover:bg-yellow-500/50 text-yellow-100 border-yellow-500/50"
                              : "bg-red-600/30 hover:bg-red-500/50 text-red-100 border-red-500/50"
                          }`}
                        >
                          <RefreshCw className="w-3 h-3 mr-1.5" /> Start
                        </Button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {createPortal(
        <AnimatePresence>
          {!hasSeenRules && isLoaded && (
            <div className="fixed inset-0 dark:bg-black bg-slate-50 z-[9999] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="dark:bg-slate-900 bg-white border dark:border-cyan-500/30 border-cyan-300/40 rounded-xl p-6 max-w-md w-full shadow-lg shadow-cyan-900/20"
              >
                <div className="flex items-center gap-3 mb-4 group/welcome">
                  <motion.div
                    whileHover={{ scale: 1.2, rotate: 15 }}
                    className="p-2 bg-cyan-500/20 rounded-lg relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-cyan-400/20 rounded-lg  opacity-0 group-hover/welcome:opacity-100 transition-opacity" />
                    <Shield className="w-6 h-6 dark:text-cyan-400 text-cyan-700 drop-shadow-md relative z-10 group-hover/welcome:drop-shadow-md transition-all" />
                  </motion.div>
                  <div className="flex flex-col">
                    <h2 className="text-xl font-bold dark:text-white text-slate-900 leading-tight">
                      Welcome to LevelUp Study
                    </h2>
                    <span className="text-[10px] font-mono dark:text-cyan-400 text-cyan-700 uppercase tracking-widest font-black">
                      JEE RPG Study Deck
                    </span>
                  </div>
                </div>

                <div className="mb-5 bg-slate-950/40 p-4 border dark:border-slate-800 border-slate-200 rounded-xl">
                  <label className="block text-[10px] font-mono font-black dark:text-cyan-400 text-cyan-700 uppercase tracking-widest mb-1.5">
                    Choose Your Cadet Codename
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full bg-slate-950 border dark:border-cyan-500/30 border-cyan-300/40 rounded-lg px-3 py-2 dark:text-white text-slate-900 font-bold focus:border-cyan-400 hover:border-cyan-400/50 outline-none transition-all text-sm font-mono shadow-md"
                    value={playerName || ""}
                    onChange={(e) => {
                      setPlayerName(e.target.value);
                    }}
                    onBlur={() => {
                      if (!playerName || !playerName.trim()) {
                        setPlayerName("Player 1");
                      }
                    }}
                    placeholder="Enter your hero name..."
                  />
                  <p className="text-[10px] dark:text-slate-500 text-slate-600 font-mono mt-1">
                    *Equip custom prestige titles in the Profile tab after
                    unlocks.
                  </p>
                </div>

                <div className="space-y-4 dark:text-slate-300 text-slate-900 text-sm mb-6">
                  <p>Rules of the Game to Conquer your JEE Rank:</p>

                  <ul className="space-y-3 font-medium">
                    <li className="flex gap-2 text-xs">
                      <span className="dark:text-cyan-400 text-cyan-700 font-bold">
                        1.
                      </span>
                      <span>
                        <strong>Earn Study XP:</strong> Solve daily syllabus
                        PYQs, check off study tasks, and run focus sessions to
                        earn XP.
                      </span>
                    </li>
                    <li className="flex gap-2 text-xs">
                      <span className="dark:text-cyan-400 text-cyan-700 font-bold">
                        2.
                      </span>
                      <span>
                        <strong>Maintain Streak:</strong> Finish at least 1
                        study task daily. Consistency unlocks high multiplier
                        rewards.
                      </span>
                    </li>
                    <li className="flex gap-2 text-xs">
                      <span className="dark:text-cyan-400 text-cyan-700 font-bold">
                        3.
                      </span>
                      <span>
                        <strong>Deep Focus:</strong> Toggle Strict Focus timers.
                        Multi-hour focus earns special visual reward badges.
                      </span>
                    </li>
                    <li className="flex gap-2 text-xs">
                      <span className="dark:text-cyan-400 text-cyan-700 font-bold">
                        4.
                      </span>
                      <span>
                        <strong>Ascend Leaderboard:</strong> Earn prestigious
                        titles and glowing status auras to customize your
                        avatar.
                      </span>
                    </li>
                  </ul>
                </div>

                <Button
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 uppercase tracking-wider font-mono text-xs shadow-md hover:shadow-md transition-all"
                  onClick={() => setHasSeenRules(true)}
                >
                  Assemble study squad &gt;&gt;
                </Button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body,
      )}
      <AnimatePresence>
        {showCalendar && (
          <StudyCalendar
            onClose={() => setShowCalendar(false)}
            dailyXpRequired={Math.round(dailyXpRequired)}
            onToggleTodo={toggleTodo}
          />
        )}
      </AnimatePresence>
    </div>
  );
});

export default Dashboard;
