import React, {
  useState,
  useEffect,
  useMemo,
  Suspense,
  lazy,
  useRef,
} from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard,
  Target,
  ShoppingBag,
  LineChart,
  BrainCircuit,
  Zap,
  Shield,
  Trophy,
  Swords,
  BookOpen,
  Crosshair,
  Flame,
  RefreshCw,
  User,
  Skull,
  AlertCircle,
  Lock as LockIcon,
  Moon,
  Sun,
  Settings as SettingsIcon,
  Calendar,
  Keyboard,
  X,
  HelpCircle,
} from "lucide-react";
import {
  AppProvider,
  useAppContext,
  getLogicalDate,
} from "./context/AppContext";
import { getXpForLevel } from "./lib/utils";
import { useHaptic } from "./hooks/useHaptic";
import { useAuthToken } from "./hooks/useAuthToken";
import { useCapacitorSetup } from "./hooks/useCapacitorSetup";
import { getAICoachFeedback } from "./lib/gemini";
import confetti from "canvas-confetti";

import Dashboard from "./pages/Dashboard";
const Missions = lazy(() => import("./pages/Missions"));
const Store = lazy(() => import("./pages/Store"));
const SettingsPage = lazy(() => import("./pages/Settings"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Syllabus = lazy(() => import("./pages/Syllabus"));
import { HAPTIC_PATTERNS, vibrate } from "./lib/haptics";
import { sendNotification } from "./lib/notifications";
import { useNotificationScheduler } from "./hooks/useNotificationScheduler";
import { NotificationToastContainer } from "./components/NotificationToastContainer";
import { googleSignIn } from "./lib/firebase";

const LunarGravityCanvas = lazy(() =>
  import("./components/ui/lunar-gravity-card").then((m) => ({
    default: m.LunarGravityCanvas,
  })),
);
const ShaderAnimation = lazy(() =>
  import("./components/ui/shader-animation").then((m) => ({
    default: m.ShaderAnimation,
  })),
);
const WebGLShader = lazy(() =>
  import("./components/ui/web-gl-shader").then((m) => ({
    default: m.WebGLShader,
  })),
);
const LiquidButton = lazy(() =>
  import("./components/ui/liquid-glass-button").then((m) => ({
    default: m.LiquidButton,
  })),
);
import { TextReveal } from "./components/ui/text-reveal";
import { PageSkeleton } from "./components/PageSkeleton";

const Protocols = lazy(() => import("./pages/Protocols"));
const Rivals = lazy(() => import("./pages/Rivals"));
const Profile = lazy(() => import("./pages/Profile"));
const History = lazy(() => import("./pages/History"));

const MOTIVATIONAL_QUOTES = [
  "Discipline equals freedom.",
  "The pain of discipline is far less than the pain of regret.",
  "Success is the sum of small efforts, repeated day in and day out.",
  "Don't stop when you're tired. Stop when you're done.",
  "Your future is created by what you do today, not tomorrow.",
  "It's not about perfect. It's about effort.",
  "Focus on the step in front of you, not the whole staircase.",
];

import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";

function AppContent() {
  useCapacitorSetup();
  // Power Saver Mode for Mobile
  const [isPowerSaver, setIsPowerSaver] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const showShortcutsModalRef = useRef(false);
  useEffect(() => {
    showShortcutsModalRef.current = showShortcutsModal;
  }, [showShortcutsModal]);

  const levelRef = useRef(1);
  const {
    xp,
    level,
    streakDays,
    dailyTarget,
    playerName,
    setPlayerName,
    isLoaded,
    needsRollover,
    setNeedsRollover,
    consistencyBroken,
    setConsistencyBroken,
    completeRollover,
    history,
    setHistory,
    pendingMissedDays,
    submitMissedDayReasons,
    lastStudyDate,
    practiceSessions,
    pendingTasks,
    todos,
    xpGainedToday,
    hoursStudiedToday,
    notificationSettings,
    firebaseUser,
    setFirebaseUser,
    setHasToken,
    isCloudSyncComplete,
  } = useAppContext();

  useNotificationScheduler({
    notificationSettings,
    todos,
    streakDays,
    hoursStudiedToday,
    dailyTarget,
    isLoaded,
  });

  useEffect(() => {
    levelRef.current = level;
  }, [level]);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      const listener = CapApp.addListener("backButton", () => {
        setActiveTab((prev) => {
          if (prev !== "dashboard") {
            return "dashboard";
          } else {
            CapApp.exitApp();
            return prev;
          }
        });
      });
      return () => {
        listener.then((l) => l.remove());
      };
    }
  }, []);
  useEffect(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (!isMobile) return;
    if ("getBattery" in navigator) {
      (navigator as any)
        .getBattery()
        .then((battery: any) => {
          const updateBattery = () => {
            setIsPowerSaver(!battery.charging && battery.level <= 0.2);
          };
          updateBattery();
          battery.addEventListener("levelchange", updateBattery);
          battery.addEventListener("chargingchange", updateBattery);
        })
        .catch(() => {});
    }
  }, []);
  useAuthToken();
  const processedHistoryRef = useRef(new Set<string>());

  const [showWelcomeHero, setShowWelcomeHero] = useState(false);
  const [forceLoaded, setForceLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setForceLoaded(true);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  const effectiveLoaded = isLoaded || forceLoaded;

  useEffect(() => {
    if (!effectiveLoaded) return;
    const hasSeenForever = localStorage.getItem(
      "welcome_hero_dismissed_forever",
    );
    if (!hasSeenForever) {
      setShowWelcomeHero(true);
    }
  }, [effectiveLoaded]);

  const handleEnterApp = () => {
    localStorage.setItem("welcome_hero_dismissed_forever", "true");
    setShowWelcomeHero(false);
    vibrate(HAPTIC_PATTERNS.SUCCESS);
  };

  const [isSigningInStart, setIsSigningInStart] = useState(false);

  const handleStartSignIn = async () => {
    setIsSigningInStart(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setFirebaseUser(res.user);
        setHasToken(true);
      }
    } catch (err: any) {
      console.error(err);
      if (
        err?.code === "auth/unauthorized-domain" ||
        err?.message?.includes("unauthorized-domain")
      ) {
        alert(
          `Domain not authorized in Firebase! Note: It can take a few minutes for Firebase to apply this setting. Please ensure you have added exactly this domain to Firebase Console -> Authentication -> Settings -> Authorized domains:\n\n${window.location.hostname}`,
        );
      } else if (
        err?.message?.includes("popup") ||
        err?.message?.includes("internal-error")
      ) {
        alert(
          "Authentication is restricted by the browser in this preview iframe. Please use the 'Open in New Tab' button (top right of preview) to log in.",
        );
      } else {
        alert("Login failed: " + (err?.message || "Unknown error. Check console for details."));
      }
    } finally {
      setIsSigningInStart(false);
    }
  };

  // Periodic Rollover Check past 3:00 AM
  useEffect(() => {
    if (!isLoaded || !lastStudyDate) return;
    if (firebaseUser && !isCloudSyncComplete) return;

    const interval = setInterval(
      () => {
        const currentLogicalDate = getLogicalDate();

        if (
          lastStudyDate !== currentLogicalDate.toDateString() &&
          !needsRollover
        ) {
          setNeedsRollover(true);
        }
      },
      isPowerSaver ? 300000 : 60000,
    ); // Check every minute

    return () => clearInterval(interval);
  }, [
    isLoaded,
    lastStudyDate,
    needsRollover,
    setNeedsRollover,
    isPowerSaver,
    firebaseUser,
    isCloudSyncComplete,
  ]);

  const [showLevelUp, setShowLevelUp] = useState(false);
  const [prevLevel, setPrevLevel] = useState<number | null>(null);
  const [showNameModal, setShowNameModal] = useState(false);
  const [tempName, setTempName] = useState("");
  const [quote, setQuote] = useState("");

  const [isDarkMode, setIsDarkMode] = useState(() =>
    localStorage.getItem("theme") === "light" ? false : true,
  );

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const [missedDayInputs, setMissedDayInputs] = useState<{
    [date: string]: string;
  }>(() => {
    try {
      const saved = sessionStorage.getItem("missedDayInputs");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [toastMessage, setToastMessage] = useState("");
  const [proTip, setProTip] = useState<{
    title: string;
    message: string;
  } | null>(null);

  const { hapticLevelUp, hapticSuccess } = useHaptic();

  const [visitedTabs, setVisitedTabs] = useState<Record<string, boolean>>(
    () => {
      try {
        const saved = localStorage.getItem("visited_tabs");
        return saved ? JSON.parse(saved) : { dashboard: true };
      } catch {
        return { dashboard: true };
      }
    },
  );

  const tabTips: Record<string, { title: string; message: string }> = {
    syllabus: {
      title: "Command Center",
      message:
        "Track your command over topics. Focus on weaknesses before they become liabilities.",
    },
    protocols: {
      title: "Daily Rituals",
      message:
        "Strict protocols ensure consistent performance. Follow them religiously.",
    },
    quests: {
      title: "Side Missions",
      message:
        "Complete missions for extra XP and rewards to accelerate your growth.",
    },
    store: {
      title: "Black Market",
      message:
        "Spend your hard-earned XP on temporary focus boosts and aesthetics.",
    },
    history: {
      title: "Archives",
      message:
        "Analyze past performance. Those who ignore history are doomed to repeat it.",
    },
    analytics: {
      title: "Metrics Hub",
      message:
        "Data doesn't lie. Use these charts to optimize your study grind.",
    },
    rivals: {
      title: "Arena",
      message:
        "Compete against your peers. Let their progress be your motivation.",
    },
    profile: {
      title: "Identity",
      message:
        "Manage your player identity, stats, and critical system settings.",
    },
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  const handleTabChange = (tabId: string) => {
    vibrate(HAPTIC_PATTERNS.TAP);
    setActiveTab(tabId);
    if (!visitedTabs[tabId] && tabTips[tabId]) {
      setProTip(tabTips[tabId]);
      const newVisited = { ...visitedTabs, [tabId]: true };
      setVisitedTabs(newVisited);
      try {
        localStorage.setItem("visited_tabs", JSON.stringify(newVisited));
      } catch {}
      setTimeout(() => setProTip(null), 6000); // Hide after 6 seconds
    } else {
      setProTip(null);
    }
  };

  // Rollover state
  const [sleepInput, setSleepInput] = useState<string>(
    () => sessionStorage.getItem("rollover_sleepInput") || "",
  );
  const [sleepMinsInput, setSleepMinsInput] = useState<string>(
    () => sessionStorage.getItem("rollover_sleepMinsInput") || "",
  );
  const [screenInput, setScreenInput] = useState<string>(
    () => sessionStorage.getItem("rollover_screenInput") || "",
  );
  const [screenMinsInput, setScreenMinsInput] = useState<string>(
    () => sessionStorage.getItem("rollover_screenMinsInput") || "",
  );
  const [rolloverStep, setRolloverStep] = useState<number>(1);

  useEffect(() => {
    const handleGlobalClick = (e: Event) => {
      const target = e.target as HTMLElement;
      const isInteractive = target.closest(
        'button, a, [role="button"], input[type="checkbox"], input[type="radio"], .cursor-pointer, .hover\\:scale-105',
      );
      if (isInteractive) {
        vibrate(HAPTIC_PATTERNS.TAP);
      }
    };

    // Use pointerdown/touchstart for lower latency haptics on mobile
    document.addEventListener("pointerdown", handleGlobalClick, {
      capture: true,
      passive: true,
    });

    return () => {
      document.removeEventListener("pointerdown", handleGlobalClick, {
        capture: true,
      });
    };
  }, []);

  useEffect(() => {
    setQuote(
      MOTIVATIONAL_QUOTES[
        Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)
      ],
    );
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    if (playerName === "Player 1" || !playerName) {
      setShowNameModal(true);
    } else {
      setShowNameModal(false);
    }
  }, [playerName, isLoaded]);

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((tempName || "").trim()) {
      setPlayerName((tempName || "").trim());
      setShowNameModal(false);
    }
  };

  const handleRolloverSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let parsedSleepHrs = parseFloat(sleepInput) || 0;
    let parsedSleepMins = parseFloat(sleepMinsInput) || 0;
    if (parsedSleepHrs > 24) parsedSleepHrs = 24;
    if (parsedSleepHrs === 24) parsedSleepMins = 0;
    if (parsedSleepMins > 59) parsedSleepMins = 59;
    const finalSleep = Number(
      (parsedSleepHrs + parsedSleepMins / 60).toFixed(2),
    );

    let parsedScreenHrs = parseFloat(screenInput) || 0;
    let parsedScreenMins = parseFloat(screenMinsInput) || 0;
    if (parsedScreenHrs > 24) parsedScreenHrs = 24;
    if (parsedScreenHrs === 24) parsedScreenMins = 0;
    if (parsedScreenMins > 59) parsedScreenMins = 59;
    const finalScreen = Number(
      (parsedScreenHrs + parsedScreenMins / 60).toFixed(2),
    );

    completeRollover(finalSleep, finalScreen);
    setRolloverStep(2);
  };

  useEffect(() => {
    if (!isLoaded || history.length === 0) return;

    const processHistory = async () => {
      let needsUpdate = false;
      const updatedHistory = [...history];

      for (let i = 0; i < updatedHistory.length; i++) {
        const fb = updatedHistory[i].aiFeedback;
        if (
          (!fb || !fb.includes("Diagnosis:")) &&
          !processedHistoryRef.current.has(updatedHistory[i].date)
        ) {
          processedHistoryRef.current.add(updatedHistory[i].date);
          needsUpdate = true;
          const entry = updatedHistory[i];

          let planned = entry.plannedTasks;
          if (!planned || planned.length === 0) {
            planned = entry.completedTasks.map((t) => ({ ...t })) as any;
            if (planned.length === 0) {
              planned = [
                {
                  id: "dummy",
                  text: "Daily Planned Tasks",
                  completed: false,
                } as any,
              ];
            }
          }

          const feedback = await getAICoachFeedback({
            hours: entry.hoursStudied || 0,
            sleep: entry.sleepTime !== undefined ? entry.sleepTime : 0,
            screenTime: entry.screenTime !== undefined ? entry.screenTime : 0,
            completedTasks: entry.completedTasks || [],
            plannedTasks: planned || [],
            practiceSessions: practiceSessions || [],
            xpEarned: entry.xpEarned || 0,
            targetXp: stateRef.current?.dailyTarget || 1000,
            level: stateRef.current?.level || 1,
            streakDays: stateRef.current?.streakDays || 0,
            history: updatedHistory.slice(Math.max(0, i - 7), i),
          });

          updatedHistory[i] = {
            ...entry,
            aiFeedback: feedback,
          };
        }
      }

      if (needsUpdate) {
        setHistory(updatedHistory);
      }
    };

    processHistory();
  }, [history.length, isLoaded, setHistory, practiceSessions]);

  const closeRollover = () => {
    setNeedsRollover(false);
    setRolloverStep(1);
    setSleepInput("");
    setSleepMinsInput("");
    setScreenInput("");
    setScreenMinsInput("");
  };

  const handleMissedDaysSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const reasons = pendingMissedDays.map((dateStr) => ({
      date: dateStr,
      reason: missedDayInputs[dateStr] || "Unaccounted absence",
    }));
    submitMissedDayReasons(reasons);
    setMissedDayInputs({});
  };

  useEffect(() => {
    if (!isLoaded) return;

    if (prevLevel === null) {
      // First initialized load
      setPrevLevel(level);
    } else if (level > prevLevel) {
      // Real level up during session
      setShowLevelUp(true);
      setPrevLevel(level);
      hapticLevelUp();

      const playLevelUpSound = () => {
        try {
          const AudioContext =
            window.AudioContext || (window as any).webkitAudioContext;
          if (!AudioContext) return;
          const ctx = new AudioContext();

          const playTone = (
            freq: number,
            startTime: number,
            duration: number,
            type: OscillatorType = "sine",
            vol: number = 0.2,
          ) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);

            gain.gain.setValueAtTime(0, ctx.currentTime + startTime);
            gain.gain.linearRampToValueAtTime(
              vol,
              ctx.currentTime + startTime + 0.1,
            );
            gain.gain.exponentialRampToValueAtTime(
              0.001,
              ctx.currentTime + startTime + duration,
            );

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(ctx.currentTime + startTime);
            osc.stop(ctx.currentTime + startTime + duration);
          };

          // Ethereal / Ambient Lydian chord swell
          playTone(440.0, 0.0, 3.0, "sine", 0.15); // A4
          playTone(554.37, 0.1, 3.0, "sine", 0.15); // C#5
          playTone(659.25, 0.2, 3.0, "sine", 0.15); // E5
          playTone(830.61, 0.3, 3.5, "sine", 0.15); // G#5
          playTone(987.77, 0.4, 4.0, "sine", 0.15); // B5

          // Shimmering overtones
          playTone(1318.51, 0.3, 2.5, "triangle", 0.05); // E6
          playTone(1661.22, 0.5, 3.0, "triangle", 0.05); // G#6
          playTone(2489.02, 0.7, 3.5, "triangle", 0.03); // D#7
          setTimeout(() => ctx.close(), 5000);
        } catch (e) {
          console.error("Audio play failed", e);
        }
      };

      playLevelUpSound();

      confetti({
        particleCount: 300,
        spread: 160,
        origin: { y: 0.6 },
        colors: ["#fbcfe8", "#a7f3d0", "#bae6fd", "#fef08a", "#e9d5ff"],
        disableForReducedMotion: true,
      });

      setTimeout(() => setShowLevelUp(false), 5000);
    }
  }, [level, prevLevel, isLoaded]);

  // Notifications logic
  const lastHourNotified = React.useRef<number | null>(null);
  const stateRef = useRef({
    xpGainedToday,
    pendingTasks,
    todos,
    notificationSettings,
    dailyTarget,
    level,
    streakDays,
  });

  useEffect(() => {
    stateRef.current = {
      xpGainedToday,
      pendingTasks,
      todos,
      notificationSettings,
      dailyTarget,
      level,
      streakDays,
    };
  }, [
    xpGainedToday,
    pendingTasks,
    todos,
    notificationSettings,
    dailyTarget,
    level,
    streakDays,
  ]);

  useEffect(() => {
    if (!isLoaded) return;
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    const interval = setInterval(() => {
      if ("Notification" in window && Notification.permission === "granted") {
        const { xpGainedToday, pendingTasks, todos, notificationSettings } =
          stateRef.current;
        const hour = new Date().getHours();

        // Prevent duplicate notifications in the same hour
        if (lastHourNotified.current === hour) return;

        const isFocusMode = localStorage.getItem("focusModeActive") === "true";
        if (isFocusMode) return; // Don't interrupt focus sessions with general alerts

        let notified = false;

        // At 18:00 (6 PM) if XP is very low
        if (
          hour === 18 &&
          xpGainedToday < 100 &&
          notificationSettings.motivationalAlerts
        ) {
          sendNotification("Wake up. Time is ticking.", {
            body: "You've barely earned any XP today. Get a task done right now. Stay hard.",
            icon: "/icon.png",
            silent: !notificationSettings.soundEnabled,
          });
          notified = true;
        }

        // Motivation at 14:00 (2 PM)
        if (hour === 14 && notificationSettings.motivationalAlerts) {
          sendNotification("Midday Checkpoint", {
            body: "Don't let the day slip away. You're competing against millions. Put the work in.",
            icon: "/icon.png",
            silent: !notificationSettings.soundEnabled,
          });
          notified = true;
        }

        // Remind at 21:00 (9 PM) if there are still pending tasks
        const uncompletedTodos = todos.filter((t) => !t.completed).length;
        const totalRemaining = pendingTasks.length + uncompletedTodos;
        if (
          hour === 21 &&
          totalRemaining > 0 &&
          notificationSettings.motivationalAlerts
        ) {
          sendNotification("Unfinished Business", {
            body: `You still have ${totalRemaining} tasks remaining today. Don't go to sleep until you finish them.`,
            icon: "/icon.png",
            silent: !notificationSettings.soundEnabled,
          });
          notified = true;
        }

        if (notified) {
          lastHourNotified.current = hour;
        }
      }
    }, 1000 * 60); // Check every minute

    return () => clearInterval(interval);
  }, [isLoaded]);

  // Upcoming Task Notifications logic
  const notifiedTasksRef = React.useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!isLoaded) return;

    const taskInterval = setInterval(() => {
      if (
        "Notification" in window &&
        Notification.permission === "granted" &&
        stateRef.current.notificationSettings.taskReminders
      ) {
        const { todos, notificationSettings } = stateRef.current;
        const now = new Date();
        const upcomingTodos = todos.filter((t) => !t.completed && t.startTime);

        upcomingTodos.forEach((task) => {
          if (!task.startTime || notifiedTasksRef.current.has(task.id)) return;

          let startTimeObj: Date;
          if (task.startTime.includes("T")) {
            startTimeObj = new Date(task.startTime);
          } else {
            const [hours, minutes] = task.startTime.split(":");
            startTimeObj = new Date();
            startTimeObj.setHours(
              parseInt(hours, 10) || 0,
              parseInt(minutes, 10) || 0,
              0,
              0,
            );
          }

          const timeDiffMs = startTimeObj.getTime() - now.getTime();
          const timeDiffMinutes = Math.floor(timeDiffMs / 60000);

          // If task is starting in 0 to 10 minutes
          if (timeDiffMinutes >= 0 && timeDiffMinutes <= 10) {
            sendNotification("Upcoming Scheduled Task", {
              body: `Your task "${task.text}" starts in ${timeDiffMinutes} minute(s). Get ready!`,
              icon: "/icon.png",
              silent: !notificationSettings.soundEnabled,
            });
            notifiedTasksRef.current.add(task.id);
          }
        });
      }
    }, 1000 * 60); // Check every minute

    return () => clearInterval(taskInterval);
  }, [isLoaded]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea
      if (
        ["INPUT", "TEXTAREA", "SELECT"].includes(
          (e.target as HTMLElement)?.tagName,
        )
      ) {
        return;
      }

      // Escape key to close shortcuts overlay
      if (e.key === "Escape") {
        if (showShortcutsModalRef.current) {
          e.preventDefault();
          setShowShortcutsModal(false);
        }
        return;
      }

      // Shift + ? = Open Shortcuts Overlay
      if (e.shiftKey && (e.key === "?" || e.key === "Help")) {
        e.preventDefault();
        setShowShortcutsModal((prev) => !prev);
        return;
      }

      // Tab Navigation Shortcuts (Shift + Key)
      if (e.shiftKey && !["S", "N", "C"].includes(e.key.toUpperCase())) {
        const tabShortcuts: Record<string, string> = {
          d: "dashboard",
          y: "syllabus",
          h: "history",
          a: "analytics",
          m: "quests",
          p: "protocols",
          r: "rivals",
          i: "profile",
          g: "settings",
        };
        const targetTab = tabShortcuts[e.key.toLowerCase()];
        if (targetTab) {
          const tabObj = tabs.find((t) => t.id === targetTab);
          if (tabObj) {
            if (levelRef.current >= tabObj.requiredLevel) {
              e.preventDefault();
              handleTabChange(targetTab);
              showToast(`Switched to ${tabObj.label}`);
            } else {
              showToast(
                `${tabObj.label} unlocks at Level ${tabObj.requiredLevel}`,
              );
            }
            return;
          }
        }
      }

      // Shift + S = Pomodoro
      if (e.shiftKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        showToast("Launching Pomodoro...");
        setActiveTab("dashboard");
        // Wait for tab to mount and render
        setTimeout(
          () => window.dispatchEvent(new CustomEvent("shortcut:pomodoro")),
          200,
        );
      }

      // Shift + N = New Task
      if (e.shiftKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        showToast("Create new task");
        setActiveTab("dashboard");
        setTimeout(
          () => window.dispatchEvent(new CustomEvent("shortcut:new-task")),
          200,
        );
      }

      // Shift + C to go to Profile Calendar interface
      if (e.shiftKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        showToast("View Calendar Settings");
        setActiveTab("profile");
        setTimeout(
          () =>
            window.dispatchEvent(new CustomEvent("shortcut:calendar-profile")),
          200,
        );
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const tabs = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      requiredLevel: 1,
    },
    { id: "syllabus", label: "Syllabus", icon: BookOpen, requiredLevel: 1 },
    { id: "history", label: "History", icon: RefreshCw, requiredLevel: 1 },
    { id: "analytics", label: "Analytics", icon: LineChart, requiredLevel: 6 },
    { id: "quests", label: "Missions", icon: Target, requiredLevel: 3 },
    { id: "protocols", label: "Protocols", icon: Shield, requiredLevel: 4 },
    { id: "store", label: "Store", icon: ShoppingBag, requiredLevel: 8 },
    { id: "rivals", label: "Peers", icon: Swords, requiredLevel: 5 },
    { id: "profile", label: "Profile", icon: User, requiredLevel: 1 },
    { id: "settings", label: "Settings", icon: SettingsIcon, requiredLevel: 1 },
  ];

  const tabIndex = tabs.findIndex((t) => t.id === activeTab);
  const [direction, setDirection] = useState(0);

  const handleSwipeLeft = () => {
    if (tabIndex < tabs.length - 1) {
      setDirection(1);
      handleTabChange(tabs[tabIndex + 1].id);
    }
  };

  const handleSwipeRight = () => {
    if (tabIndex > 0) {
      setDirection(-1);
      handleTabChange(tabs[tabIndex - 1].id);
    }
  };

  const handleNavigationKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const currentIdx = tabs.findIndex((tab) => tab.id === activeTab);
      let nextIdx = currentIdx;
      if (e.key === "ArrowRight") {
        nextIdx = (currentIdx + 1) % tabs.length;
      } else {
        nextIdx = (currentIdx - 1 + tabs.length) % tabs.length;
      }

      // Find the first unlocked tab
      let foundTab = tabs[nextIdx];
      let attempts = 0;
      while (level < foundTab.requiredLevel && attempts < tabs.length) {
        if (e.key === "ArrowRight") {
          nextIdx = (nextIdx + 1) % tabs.length;
        } else {
          nextIdx = (nextIdx - 1 + tabs.length) % tabs.length;
        }
        foundTab = tabs[nextIdx];
        attempts++;
      }

      if (level >= foundTab.requiredLevel) {
        handleTabChange(foundTab.id);
        // Also focus the newly selected tab button
        setTimeout(() => {
          const button = document.getElementById("tab-btn-" + foundTab.id);
          if (button) {
            button.focus();
          }
        }, 10);
      }
    }
  };

  const touchStartX = React.useRef(0);
  const touchEndX = React.useRef(0);
  const touchStartY = React.useRef(0);
  const touchEndY = React.useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchStartY.current = e.targetTouches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
    touchEndY.current = e.targetTouches[0].clientY;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distanceX = touchStartX.current - touchEndX.current;
    const distanceY = touchStartY.current - touchEndY.current;
    const isHorizontalSwipe = Math.abs(distanceX) > Math.abs(distanceY);
    const isValidSwipe = Math.abs(distanceX) > 50;

    if (isHorizontalSwipe && isValidSwipe) {
      if (distanceX > 0) handleSwipeLeft();
      else handleSwipeRight();
    }
    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  if (!effectiveLoaded) {
    return (
      <div className="min-h-[100dvh] dark:bg-black bg-slate-50 flex flex-col items-center justify-center relative overflow-hidden dark:text-slate-200 text-slate-900 font-sans p-4">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.15)_0%,transparent_70%)]" />
        <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin z-10" />
        <p className="mt-4 dark:text-cyan-400 text-cyan-700/50 font-mono text-sm tracking-[0.3em] uppercase animate-pulse z-10">
          Initializing System...
        </p>
        <button
          type="button"
          onClick={() => setForceLoaded(true)}
          className="mt-6 z-10 px-5 py-2.5 rounded-xl border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 font-mono text-xs tracking-wider uppercase transition-all cursor-pointer"
        >
          Open App Directly
        </button>
      </div>
    );
  }

  if (effectiveLoaded && showWelcomeHero) {
    return (
      <div className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-black text-white font-sans select-none z-[10000]">
        {/* Background WebGL Shader Animation now rendered in front of the card */}
        <div
          className="absolute inset-0 z-30 opacity-90 pointer-events-none mix-blend-screen"
          style={{ mixBlendMode: "screen" }}
        >
          <ErrorBoundary>
            <Suspense
              fallback={<div className="absolute inset-0 bg-transparent" />}
            >
              <WebGLShader />
            </Suspense>
          </ErrorBoundary>
        </div>

        {/* Ambient Overlay to darken background slightly and make text pop */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/80 z-10 pointer-events-none" />

        {/* Foreground Content container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.0, ease: "easeOut" }}
          className="relative z-20 w-full max-w-3xl px-6 py-12 flex flex-col items-center justify-center min-h-screen"
        >
          <div className="relative border border-[#27272a] p-2 w-full mx-auto rounded-3xl bg-black/40 backdrop-blur-md">
            <main className="relative border border-[#27272a] rounded-2xl py-12 px-6 md:px-12 overflow-hidden flex flex-col items-center">
              <span className="text-[10px] md:text-xs uppercase tracking-[0.4em] text-cyan-400 font-bold mb-4 text-center block">
                WELCOME TO THE ULTIMATE COMMAND CENTER
              </span>

              <h1 className="mb-1 text-white text-center text-5xl md:text-7xl font-bold tracking-tighter leading-none">
                LevelUp
              </h1>
              <h2 className="mb-6 text-white text-center text-6xl md:text-8xl font-black tracking-tighter leading-none">
                Study
              </h2>

              <p className="text-white/60 px-6 text-center text-xs md:text-sm lg:text-base max-w-md leading-relaxed mb-8">
                Your study command center is online. Monitor concepts, practice
                custom protocols, track daily milestones, and elevate your
                learnings.
              </p>

              <div className="mb-6 flex items-center justify-center gap-2">
                <span className="relative flex h-3 w-3 items-center justify-center">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
                </span>
                <p className="text-xs text-green-500 uppercase tracking-widest font-semibold">
                  System Calibrated & Online
                </p>
              </div>

              {/* Start-screen Google Auth options */}
              {firebaseUser ? (
                <div className="mb-8 flex flex-col items-center gap-2 px-5 py-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 backdrop-blur-md">
                  <div className="flex items-center gap-3">
                    {firebaseUser.photoURL ? (
                      <img
                        src={firebaseUser.photoURL}
                        className="w-8 h-8 rounded-full border border-cyan-400"
                        alt="User"
                      />
                    ) : (
                      <User className="w-5 h-5 text-cyan-400" />
                    )}
                    <div className="text-left">
                      <p className="text-xs font-bold text-white">
                        {firebaseUser.displayName || "Google Account"}
                      </p>
                      <p className="text-[10px] text-cyan-300 font-mono">
                        {firebaseUser.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Multi-Device Cloud Sync Active
                  </div>
                </div>
              ) : (
                <div className="mb-8 flex flex-col items-center gap-2.5 w-full max-w-xs">
                  <button
                    type="button"
                    onClick={handleStartSignIn}
                    disabled={isSigningInStart}
                    className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-2xl bg-white text-slate-900 font-bold text-sm hover:bg-slate-100 transition-all shadow-[0_0_20px_rgba(255,255,255,0.25)] hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50"
                  >
                    {isSigningInStart ? (
                      <RefreshCw className="w-5 h-5 animate-spin text-slate-900" />
                    ) : (
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                    )}
                    <span>
                      {isSigningInStart ? "Signing in..." : "Sign In with Google"}
                    </span>
                  </button>
                  <p className="text-[11px] text-slate-400 text-center">
                    Sync XP, streak & tasks across all devices
                  </p>
                </div>
              )}

              <div className="flex justify-center w-full">
                <Suspense
                  fallback={
                    <button className="h-14 px-10 rounded-full border border-white/20 text-white bg-white/5 animate-pulse">
                      Let's Go
                    </button>
                  }
                >
                  <LiquidButton
                    className="text-white border border-white/20 rounded-full hover:scale-105 duration-300 transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_40px_rgba(6,182,212,0.5)] cursor-pointer"
                    size="xl"
                    onClick={handleEnterApp}
                  >
                    {firebaseUser ? "Launch Command Center" : "Continue as Guest"}
                  </LiquidButton>
                </Suspense>
              </div>
            </main>
          </div>
        </motion.div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard />;
      case "syllabus":
        return <Syllabus />;
      case "protocols":
        return <Protocols />;
      case "quests":
        return <Missions />;
      case "store":
        return <Store />;
      case "settings":
        return <SettingsPage />;
      case "history":
        return <History />;
      case "analytics":
        return <Analytics />;
      case "rivals":
        return <Rivals />;
      case "profile":
        return <Profile />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-[100dvh] dark:bg-black bg-slate-50 dark:text-slate-200 text-slate-900 font-sans selection:bg-cyan-400 flex flex-col relative w-full overflow-x-hidden">
      <NotificationToastContainer />
      {/* Immersive Grid Background */}
      <div className="fixed -inset-10 pointer-events-none z-0 subtle-bg-grid" />

      {/* Background Glows */}
      <div className="hidden fixed -inset-10 pointer-events-none z-0 overflow-hidden">
        {/* Top left cyan glow */}
        <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] max-w-[600px] max-h-[600px] rounded-full bg-cyan-400/20 dark:bg-cyan-500/12 blur-[100px] md:blur-[150px]  pointer-events-none" />
        {/* Bottom right purple glow */}
        <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] max-w-[600px] max-h-[600px] rounded-full bg-purple-400/20 dark:bg-purple-500/12 blur-[100px] md:blur-[150px]  pointer-events-none" />
        {/* Middle left amber/yellow warm glow */}
        <div className="absolute top-[30%] left-[5%] w-[40vw] h-[40vw] max-w-[400px] max-h-[400px] rounded-full bg-amber-400/15 dark:bg-amber-500/8 blur-[100px] md:blur-[140px] pointer-events-none" />
        {/* Middle right pink glow */}
        <div className="absolute top-[50%] right-[5%] w-[45vw] h-[45vw] max-w-[450px] max-h-[450px] rounded-full bg-pink-400/15 dark:bg-pink-500/8 blur-[110px] md:blur-[150px] pointer-events-none" />
      </div>

      {/* Enter Name Modal */}
      {createPortal(
        <AnimatePresence>
          {showNameModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] dark:bg-black bg-slate-50 overflow-y-auto custom-scrollbar flex flex-col"
            >
              <div className="w-full flex justify-center p-4 py-12 m-auto">
                <motion.div
                  initial={{ scale: 0.8, y: 50, opacity: 0 }}
                  animate={{ scale: 1, y: 0, opacity: 1 }}
                  transition={{ type: "spring", bounce: 0.5, duration: 0.8 }}
                  className="dark:bg-slate-900 bg-white border border-cyan-500/30 p-8 md:p-12 rounded-3xl max-w-lg w-full text-center shadow-md relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50" />
                  <Trophy className="w-16 h-16 dark:text-yellow-400 text-yellow-700 mx-auto mb-6 drop-shadow-md" />
                  <h2 className="text-3xl font-black dark:text-white text-slate-900 mb-2 uppercase tracking-widest">
                    Welcome, Challenger
                  </h2>
                  <p className="dark:text-cyan-400 text-cyan-700/80 mb-8 font-mono text-sm">
                    Enter your name to begin your journey.
                  </p>

                  <form onSubmit={handleNameSubmit} className="space-y-6">
                    <input
                      type="text"
                      value={tempName || ""}
                      onChange={(e) => setTempName(e.target.value)}
                      placeholder="Your Name"
                      id="nameInput"
                      className="w-full dark:bg-black bg-white border dark:border-slate-700 border-slate-300 rounded-xl p-4 dark:text-white text-slate-900 text-center text-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-colors"
                      autoFocus
                      required
                    />
                    <button
                      type="submit"
                      className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-lg py-4 rounded-xl shadow-md hover:shadow-md transition-all hover:scale-[1.02]"
                    >
                      START ADVENTURE
                    </button>
                  </form>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      {/* Consistency Broken Modal */}
      {createPortal(
        <AnimatePresence>
          {consistencyBroken && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] dark:bg-black bg-slate-50 overflow-y-auto custom-scrollbar flex flex-col"
            >
              <div className="w-full flex justify-center p-4 py-12 m-auto relative">
                {/* Background breathing effect */}
                <motion.div
                  animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.5, 0.3] }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="absolute inset-0 bg-red-950/30"
                />

                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", bounce: 0.4, duration: 1 }}
                  className="relative z-10 max-w-4xl w-full text-center flex flex-col items-center"
                >
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="mb-8 relative"
                  >
                    <div className="absolute inset-0 bg-red-500/20  rounded-full" />
                    <Skull className="w-32 h-32 md:w-48 md:h-48 dark:text-red-400 text-red-700 drop-shadow-md relative z-10" />
                  </motion.div>

                  <h1 className="text-5xl md:text-7xl font-black dark:text-white text-slate-900 mb-6 uppercase tracking-widest drop-shadow-md">
                    Consistency Broken
                  </h1>

                  <div className="space-y-4 mb-12 max-w-2xl mx-auto">
                    <p className="text-xl md:text-3xl dark:text-red-400 text-red-700 font-mono uppercase tracking-widest">
                      You let your guard down.
                    </p>
                    <p className="text-lg md:text-xl dark:text-slate-300 text-slate-900 leading-relaxed">
                      The momentum has stopped. The streak is gone. Guilt is
                      temporary, but the lost time is permanent.
                      <br />
                      <br />
                      <span className="dark:text-white text-slate-900 font-bold">
                        Acknowledge the failure. But the war isn't over.
                        Rebuild.
                      </span>
                    </p>
                  </div>

                  <button
                    onClick={() => setConsistencyBroken(false)}
                    className="bg-transparent border-2 border-red-500 dark:text-red-400 text-red-700 hover:bg-red-500 hover:dark:text-white text-slate-900 px-12 py-5 rounded-none font-black text-xl md:text-2xl tracking-[0.3em] uppercase transition-all duration-300 shadow-md hover:shadow-md"
                  >
                    Forgive & Restart
                  </button>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      {/* Rollover Modal */}
      {createPortal(
        <AnimatePresence>
          {needsRollover && !showNameModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9998] dark:bg-black bg-slate-50 overflow-y-auto custom-scrollbar flex flex-col"
            >
              <div className="w-full flex justify-center p-4 py-12 m-auto">
                <motion.div
                  initial={{ scale: 0.8, y: 50, opacity: 0 }}
                  animate={{ scale: 1, y: 0, opacity: 1 }}
                  transition={{ type: "spring", bounce: 0.5, duration: 0.8 }}
                  className="dark:bg-slate-900 bg-white border border-cyan-500/30 p-8 rounded-3xl max-w-2xl w-full text-center shadow-md relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50" />

                  {rolloverStep === 1 ? (
                    <>
                      <h2 className="text-3xl font-black dark:text-white text-slate-900 mb-2 uppercase tracking-widest flex items-center justify-center gap-3">
                        <RefreshCw className="w-8 h-8 dark:text-cyan-400 text-cyan-700 animate-spin-slow" />{" "}
                        New Day Protocol!
                      </h2>
                      <p className="dark:text-cyan-400 text-cyan-700/80 mb-8 font-mono text-sm">
                        Initialize your systems for today. Let's record
                        yesterday's recovery stats.
                      </p>

                      <form
                        onSubmit={handleRolloverSubmit}
                        className="space-y-6"
                      >
                        <div className="grid grid-cols-2 gap-8">
                          <div>
                            <label className="block dark:text-slate-400 text-slate-600 font-mono text-sm mb-2 text-left uppercase border-b dark:border-slate-700 border-slate-300 pb-2">
                              Sleep Time
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="number"
                                min="0"
                                max="24"
                                value={sleepInput || ""}
                                onChange={(e) => setSleepInput(e.target.value)}
                                placeholder="Hrs"
                                className="w-full dark:bg-black bg-white border dark:border-slate-700 border-slate-300 rounded-xl p-3 dark:text-white text-slate-900 text-center text-lg focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all"
                                required
                              />
                              <input
                                type="number"
                                min="0"
                                max="59"
                                value={sleepMinsInput || ""}
                                onChange={(e) =>
                                  setSleepMinsInput(e.target.value)
                                }
                                placeholder="Mins"
                                className="w-full dark:bg-black bg-white border dark:border-slate-700 border-slate-300 rounded-xl p-3 dark:text-white text-slate-900 text-center text-lg focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block dark:text-slate-400 text-slate-600 font-mono text-sm mb-2 text-left uppercase border-b dark:border-slate-700 border-slate-300 pb-2">
                              Screen Time
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="number"
                                min="0"
                                max="24"
                                value={screenInput || ""}
                                onChange={(e) => setScreenInput(e.target.value)}
                                placeholder="Hrs"
                                className="w-full dark:bg-black bg-white border dark:border-slate-700 border-slate-300 rounded-xl p-3 dark:text-white text-slate-900 text-center text-lg focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all"
                                required
                              />
                              <input
                                type="number"
                                min="0"
                                max="59"
                                value={screenMinsInput || ""}
                                onChange={(e) =>
                                  setScreenMinsInput(e.target.value)
                                }
                                placeholder="Mins"
                                className="w-full dark:bg-black bg-white border dark:border-slate-700 border-slate-300 rounded-xl p-3 dark:text-white text-slate-900 text-center text-lg focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all"
                              />
                            </div>
                          </div>
                        </div>
                        <button
                          type="submit"
                          className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-lg py-4 rounded-xl shadow-md hover:shadow-md transition-all hover:scale-[1.02]"
                        >
                          CALCULATE YESTERDAY'S REPORT
                        </button>
                      </form>
                    </>
                  ) : (
                    <>
                      {(() => {
                        const latestEntry =
                          history.length > 0
                            ? history[history.length - 1]
                            : null;
                        const latestWithFeedback =
                          history
                            .slice()
                            .reverse()
                            .find((e) => e.aiFeedback) || latestEntry;
                        if (!latestEntry)
                          return (
                            <div className="dark:text-white text-slate-900">
                              Loading data...
                            </div>
                          );

                        return (
                          <div className="text-left space-y-6">
                            <header className="text-center mb-6">
                              <h2 className="text-3xl font-black dark:text-white text-slate-900 mb-2 uppercase tracking-widest">
                                Yesterday's Analysis
                              </h2>
                              <p className="dark:text-cyan-400 text-cyan-700/80 font-mono text-sm mb-4">
                                AI Coach Evaluation
                              </p>
                            </header>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                              <div className="dark:bg-black bg-white p-4 rounded-xl border dark:border-slate-800 border-slate-200 text-center">
                                <span className="text-xs dark:text-slate-500 text-slate-600 uppercase block mb-1">
                                  XP Earned
                                </span>
                                <span className="text-xl font-bold dark:text-cyan-400 text-cyan-700">
                                  {latestEntry.xpEarned}
                                </span>
                              </div>
                              <div className="dark:bg-black bg-white p-4 rounded-xl border dark:border-slate-800 border-slate-200 text-center">
                                <span className="text-xs dark:text-slate-500 text-slate-600 uppercase block mb-1">
                                  Tasks Done
                                </span>
                                <span className="text-xl font-bold dark:text-emerald-400 text-emerald-700">
                                  {latestEntry.completedTasks.length}
                                </span>
                              </div>
                              <div className="dark:bg-black bg-white p-4 rounded-xl border dark:border-slate-800 border-slate-200 text-center">
                                <span className="text-xs dark:text-slate-500 text-slate-600 uppercase block mb-1">
                                  Sleep
                                </span>
                                <span className="text-xl font-bold dark:text-blue-400 text-blue-700">
                                  {latestEntry.sleepTime}h
                                </span>
                              </div>
                              <div className="dark:bg-black bg-white p-4 rounded-xl border dark:border-slate-800 border-slate-200 text-center">
                                <span className="text-xs dark:text-slate-500 text-slate-600 uppercase block mb-1">
                                  Screen
                                </span>
                                <span className="text-xl font-bold dark:text-rose-400 text-rose-700">
                                  {latestEntry.screenTime}h
                                </span>
                              </div>
                            </div>

                            {/* Completed Tasks List */}
                            {latestEntry.completedTasks.length > 0 && (
                              <div className="mb-6">
                                <h3 className="text-sm font-bold dark:text-slate-400 text-slate-600 uppercase tracking-wider mb-3">
                                  Objectives Handled
                                </h3>
                                <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
                                  {latestEntry.completedTasks.map((t, idx) => (
                                    <div
                                      key={t.id || `t-${idx}`}
                                      className="flex items-center gap-3 p-3 dark:bg-black bg-white border dark:border-slate-800 border-slate-200 rounded-lg"
                                    >
                                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                      <span className="dark:text-slate-300 text-slate-900 text-sm flex-1">
                                        {t.text}
                                      </span>
                                      <span className="dark:text-cyan-400 text-cyan-700 text-xs font-mono">
                                        +{t.xpReward} XP
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Output AI Motivation */}
                            <div className="bg-cyan-900/10 border border-cyan-800/50 p-5 rounded-2xl mt-4">
                              <h3 className="flex items-center gap-2 dark:text-cyan-400 text-cyan-700 font-bold mb-3 uppercase text-sm tracking-wider">
                                <BrainCircuit className="w-5 h-5" /> AI Coach
                                Assessment
                              </h3>
                              <div className="dark:text-slate-300 text-slate-900 text-sm leading-relaxed space-y-3">
                                {latestWithFeedback.aiFeedback ? (
                                  latestWithFeedback.aiFeedback
                                    .split("\n\n")
                                    .map(
                                      (
                                        paragraph: string,
                                        idx: number,
                                        arr: string[],
                                      ) => (
                                        <p
                                          key={`idx-${idx}`}
                                          className={
                                            idx === arr.length - 1
                                              ? "pt-2 font-bold dark:text-white text-slate-900 italic border-t dark:border-slate-800 border-slate-200 mt-3"
                                              : ""
                                          }
                                        >
                                          {paragraph}
                                        </p>
                                      ),
                                    )
                                ) : latestEntry.isMissed ? (
                                  <div className="text-slate-500 italic">
                                    <p>
                                      No recent performance data to analyze.
                                    </p>
                                  </div>
                                ) : (
                                  <div className="animate-pulse">
                                    <p>
                                      Coach is analyzing yesterday's
                                      performance...
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={closeRollover}
                              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-lg py-4 rounded-xl shadow-md hover:shadow-md transition-all hover:scale-[1.02] uppercase tracking-widest mt-6"
                            >
                              Init Day Protocol
                            </button>
                          </div>
                        );
                      })()}
                    </>
                  )}
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      {/* Missed Days Modal */}
      {createPortal(
        <AnimatePresence>
          {pendingMissedDays.length > 0 && !needsRollover && !showNameModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9998] dark:bg-black bg-slate-50 overflow-y-auto custom-scrollbar flex flex-col"
            >
              <div className="w-full flex justify-center p-4 py-12 m-auto">
                <motion.div
                  initial={{ scale: 0.9, y: 20, opacity: 0 }}
                  animate={{ scale: 1, y: 0, opacity: 1 }}
                  transition={{ type: "spring", bounce: 0.4, duration: 0.6 }}
                  className="bg-slate-950 border border-rose-500/50 p-8 rounded-3xl max-w-xl w-full text-center shadow-md relative overflow-hidden my-8"
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-rose-500 to-transparent opacity-50" />

                  <h2 className="text-2xl font-black dark:text-rose-400 text-rose-700 mb-2 uppercase tracking-widest flex items-center justify-center gap-3">
                    <AlertCircle className="w-8 h-8 dark:text-rose-400 text-rose-700 animate-pulse" />{" "}
                    ACCOUNTABILITY AUTOPSY
                  </h2>
                  <p className="dark:text-slate-400 text-slate-600 mb-6 font-mono text-sm leading-relaxed">
                    You either missed or severely underperformed on the
                    following training days. The exam doesn't care about your
                    excuses, but this system does. State exactly why you failed
                    to execute. Be brutally honest.
                  </p>

                  <form
                    onSubmit={handleMissedDaysSubmit}
                    className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar text-left mb-6"
                  >
                    {pendingMissedDays.map((dateStr) => {
                      const dateObj = new Date(dateStr);
                      return (
                        <div
                          key={dateStr}
                          className="dark:bg-black bg-slate-50 border border-rose-900/50 rounded-xl p-4"
                        >
                          <label className="block dark:text-rose-400 text-rose-700 font-black text-sm mb-2 uppercase border-b border-rose-900/50 pb-2">
                            {dateObj.toLocaleDateString(undefined, {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}{" "}
                            - TARGET MISSED
                          </label>
                          <textarea
                            value={missedDayInputs[dateStr] || ""}
                            onChange={(e) =>
                              setMissedDayInputs((prev) => ({
                                ...prev,
                                [dateStr]: e.target.value,
                              }))
                            }
                            placeholder="I failed to execute because..."
                            className="w-full dark:bg-slate-900/80 bg-white border dark:border-slate-700 border-slate-300/80 rounded-lg p-3 text-white text-sm focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none transition-all placeholder:text-slate-600 font-mono resize-none h-20"
                            required
                          />
                        </div>
                      );
                    })}
                    <button
                      type="submit"
                      className="w-full bg-gradient-to-r from-rose-700 to-rose-900 hover:from-rose-600 hover:to-rose-800 text-white font-black text-lg py-4 rounded-xl shadow-md hover:shadow-md transition-all hover:scale-[1.02] mt-4 uppercase tracking-widest sticky bottom-0 border border-rose-500/30"
                    >
                      SUBMIT & ACCEPT PENALTY
                    </button>
                  </form>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      {/* Level Up Notification */}
      <AnimatePresence>
        {showLevelUp && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: 20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: 50, x: 20, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-4 md:bottom-10 right-4 md:right-10 z-[9999] max-w-sm dark:bg-slate-900/90 bg-white border border-pink-500/50 shadow-md rounded-xl p-4 flex gap-4 pr-10"
          >
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500/20 to-emerald-500/20 flex items-center justify-center relative">
                <Trophy className="w-5 h-5 text-pink-400" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-ping" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-900" />
              </div>
            </div>
            <div>
              <h4 className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-emerald-400 font-black uppercase tracking-widest text-xs mb-1 flex items-center gap-2">
                LEVEL UP ACHIEVED
              </h4>
              <p className="dark:text-slate-300 text-slate-900 text-sm leading-relaxed font-bold">
                You are now Level {level}!
              </p>
              <p className="dark:text-slate-400 text-slate-600 text-xs mt-1">
                Keep pushing towards your ultimate goal.
              </p>
            </div>
            <button
              onClick={() => setShowLevelUp(false)}
              className="absolute top-2 right-2 p-1 dark:text-slate-500 text-slate-600 hover:dark:text-white text-slate-900 transition-colors"
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Navigation */}
      <nav
        className="relative z-10 w-full border-b dark:border-white/5 border-black/5 dark:bg-[#0a0f16]/80 bg-white flex items-center justify-between px-3 py-2 md:px-6 md:py-3"
        style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
      >
        {/* Empty div for flex balance if needed, or theme toggle placeholder */}
        <div className="hidden md:block w-10"></div>

        {/* Navigation Links */}
        <div
          role="tablist"
          aria-label="Main Navigation"
          onKeyDown={handleNavigationKeyDown}
          className="hidden md:flex items-center justify-center gap-1"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isLocked = level < tab.requiredLevel;
            const isProfile = tab.id === "profile";
            let progressPercent = 0;
            let xpReq = 0;
            if (isLocked) {
              xpReq = getXpForLevel(tab.requiredLevel);
              progressPercent = Math.min(100, Math.max(0, (xp / xpReq) * 100));
            }
            return (
              <motion.button
                key={tab.id}
                id={`tab-btn-${tab.id}`}
                role="tab"
                aria-selected={isActive}
                tabIndex={isActive ? 0 : -1}
                aria-label={tab.label}
                onClick={() => {
                  if (isLocked) {
                    showToast(
                      `Unlock ${tab.label} at Level ${tab.requiredLevel} (${Math.ceil(xpReq - xp)} XP left)`,
                    );
                  } else {
                    handleTabChange(tab.id);
                  }
                }}
                whileHover={!isLocked ? { scale: 1.05 } : {}}
                whileTap={!isLocked ? { scale: 0.95 } : {}}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-300 relative group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0f16] ${
                  isActive
                    ? "dark:text-white text-slate-900 bg-cyan-950/60 border border-cyan-500/30 shadow-md"
                    : isLocked
                      ? "text-slate-600 cursor-not-allowed opacity-50"
                      : "dark:text-slate-400 text-slate-600 hover:dark:text-slate-200 text-slate-900 hover:bg-cyan-950/30 border border-transparent hover:border-cyan-500/10"
                } ${isProfile ? "ml-2 border border-purple-500/20 bg-purple-950/20 shadow-md hover:border-purple-500/40" : ""}`}
              >
                {isActive && (
                  <div
                    className={`absolute inset-0 rounded-lg animate-pulse pointer-events-none ${isProfile ? "bg-purple-500/10" : "bg-cyan-500/10"}`}
                  />
                )}

                {isProfile ? (
                  <div className="relative flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border border-purple-400/50 animate-[spin_4s_linear_infinite]" />
                    <div className="absolute inset-0 rounded-full border border-purple-500/30 animate-[spin_3s_linear_infinite_reverse]" />
                    <Icon
                      className={`w-4 h-4 transition-all duration-300 ${isActive ? "dark:text-purple-400 text-purple-700 drop-shadow-md icon-glow-purple" : "dark:text-purple-300 dark:text-purple-400 text-purple-700 group-hover:text-purple-200 icon-glow-purple"}`}
                    />
                  </div>
                ) : (
                  <motion.div
                    whileHover={!isLocked ? { scale: 1.2, rotate: 10 } : {}}
                    transition={{ duration: 0.5 }}
                  >
                    {isLocked ? (
                      <LockIcon className="w-4 h-4" />
                    ) : (
                      <Icon
                        className={`w-4 h-4 transition-all duration-300 ${isActive ? "dark:text-cyan-400 text-cyan-700 drop-shadow-md" : "group-hover:dark:text-cyan-300 dark:text-cyan-400 text-cyan-700 group-hover:drop-shadow-md"}`}
                      />
                    )}
                  </motion.div>
                )}

                <div className="flex items-center gap-1.5 relative z-10 mr-0.5">
                  <span
                    className={`font-bold tracking-wider text-[13px] ${isProfile ? (isActive ? "text-purple-100" : "text-purple-200") : ""} ${tab.id === "settings" ? "hidden" : ""}`}
                  >
                    {tab.label}
                  </span>
                  {isProfile && (
                    <span className="bg-purple-600/30 dark:text-purple-300 dark:text-purple-400 text-purple-700 border border-purple-500/30 text-[10px] font-black px-1.5 py-0.5 rounded">
                      Lv{level}
                    </span>
                  )}
                </div>
                {tab.id === "settings" && (
                  <div className="hidden md:block absolute top-full mt-2 left-1/2 -translate-x-1/2 dark:bg-slate-800 bg-white border dark:border-slate-700 border-slate-200 shadow-xl rounded-lg px-3 py-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-50 whitespace-nowrap transform translate-y-1 group-hover:translate-y-0">
                    <span className="text-xs font-bold dark:text-slate-300 text-slate-700">
                      {tab.label}
                    </span>
                  </div>
                )}

                {isLocked && !isProfile && (
                  <div className="absolute top-1 right-1 flex flex-col items-end gap-0.5 pointer-events-none">
                    <span className="px-1.5 py-[2px] dark:bg-slate-800 bg-slate-100 text-[8px] dark:text-slate-400 text-slate-600 rounded border dark:border-slate-700 border-slate-300 leading-none shadow-md">
                      Lvl {tab.requiredLevel}
                    </span>
                  </div>
                )}
                {isActive && (
                  <motion.div
                    layoutId="activeTabIndicatorDesktop"
                    className={`absolute -bottom-px left-2 right-2 h-0.5 shadow-md rounded-full ${isProfile ? "bg-purple-400 shadow-md" : "bg-cyan-400"}`}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Theme Toggle (Right aligned) */}
        <div className="hidden md:flex justify-end w-10">
          <motion.button
            whileHover={{ scale: 1.1, rotate: 15 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleTheme}
            className="w-8 h-8 rounded-full border dark:border-white/10 border-black/10 dark:bg-white/5 bg-black/5 flex items-center justify-center dark:text-slate-400 text-slate-600 dark:text-slate-400 text-slate-600 hover:text-cyan-600 dark:hover:text-cyan-400 hover:border-cyan-500/50 dark:hover:bg-cyan-950/30 hover:bg-cyan-50 hover:shadow-md transition-all relative group"
          >
            <div className="absolute inset-0 bg-cyan-400/20 opacity-0 group-hover:opacity-100 transition-opacity " />
            <Moon size={14} className="relative z-10 hidden dark:block" />
            <Sun size={14} className="relative z-10 block dark:hidden" />
          </motion.button>
        </div>

        {/* Mobile Menu Button (Simplified for now) */}
        <div className="md:hidden flex items-center w-full justify-start overflow-x-auto no-scrollbar gap-1 px-1">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={toggleTheme}
            className="flex flex-col items-center justify-center gap-1 p-1.5 rounded-lg flex-shrink-0 transition-all duration-300 dark:text-slate-400 text-slate-600 hover:dark:text-slate-200 text-slate-900 border border-transparent hover:bg-cyan-950/30"
          >
            <Moon size={18} className="hidden dark:block" />
            <Sun size={18} className="block dark:hidden" />
          </motion.button>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isLocked = level < tab.requiredLevel;
            const isProfile = tab.id === "profile";
            let progressPercent = 0;
            let xpReq = 0;
            if (isLocked) {
              xpReq = getXpForLevel(tab.requiredLevel);
              progressPercent = Math.min(100, Math.max(0, (xp / xpReq) * 100));
            }
            return (
              <motion.button
                key={tab.id}
                onClick={() => {
                  if (isLocked) {
                    showToast(
                      `Unlock ${tab.label} at Level ${tab.requiredLevel} (${Math.ceil(xpReq - xp)} XP left)`,
                    );
                  } else {
                    handleTabChange(tab.id);
                  }
                }}
                whileTap={!isLocked ? { scale: 0.9 } : {}}
                className={`flex flex-col items-center gap-1 p-1.5 rounded-lg transition-all duration-300 flex-shrink-0 relative group ${
                  isActive
                    ? "dark:text-white text-slate-900 bg-cyan-950/60 border border-cyan-500/30"
                    : isLocked
                      ? "text-slate-600 cursor-not-allowed opacity-50"
                      : "dark:text-slate-400 text-slate-600 hover:dark:text-slate-200 text-slate-900 hover:bg-cyan-950/30 border border-transparent"
                } ${isProfile ? "border border-purple-500/20 bg-purple-950/20 shadow-md" : ""}`}
              >
                {isActive && (
                  <div
                    className={`absolute inset-0 rounded-lg animate-pulse pointer-events-none ${isProfile ? "bg-purple-500/10" : "bg-cyan-500/10"}`}
                  />
                )}

                {isProfile ? (
                  <div className="relative flex items-center justify-center p-0.5 mt-0.5">
                    <div className="absolute inset-0 rounded-full border border-purple-400/50 animate-[spin_4s_linear_infinite]" />
                    <div className="absolute inset-0 rounded-full border border-purple-500/30 animate-[spin_3s_linear_infinite_reverse]" />
                    <Icon
                      className={`w-4 h-4 transition-all duration-300 ${isActive ? "dark:text-purple-400 text-purple-700 drop-shadow-md icon-glow-purple" : "dark:text-purple-300 dark:text-purple-400 text-purple-700 icon-glow-purple"}`}
                    />
                  </div>
                ) : (
                  <motion.div
                    whileTap={!isLocked ? { rotate: -10 } : {}}
                    transition={{ duration: 0.3 }}
                  >
                    {isLocked ? (
                      <LockIcon className="w-4 h-4" />
                    ) : (
                      <Icon
                        className={`w-4 h-4 transition-all duration-300 ${isActive ? "dark:text-cyan-400 text-cyan-700 drop-shadow-md" : "group-hover:dark:text-cyan-300 dark:text-cyan-400 text-cyan-700 group-hover:drop-shadow-md"}`}
                      />
                    )}
                  </motion.div>
                )}

                <div className="flex items-center gap-1 relative z-10 mb-0.5 mt-0.5">
                  <span
                    className={`font-bold tracking-widest text-[9px] ${isProfile ? (isActive ? "text-purple-100" : "text-purple-200") : ""} ${tab.id === "settings" ? "hidden" : ""}`}
                  >
                    {tab.label}
                  </span>
                  {isProfile && (
                    <span className="bg-purple-600/30 dark:text-purple-300 dark:text-purple-400 text-purple-700 border border-purple-500/30 text-[8px] font-black px-1 rounded-sm leading-none flex items-center">
                      Lv{level}
                    </span>
                  )}
                </div>

                {isLocked && !isProfile && (
                  <div className="absolute top-1 right-1 flex flex-col items-end gap-0.5 pointer-events-none">
                    <span className="px-1 py-[1px] dark:bg-slate-800 bg-slate-100 text-[6px] dark:text-slate-400 text-slate-600 rounded border dark:border-slate-700 border-slate-300 leading-none shadow-md whitespace-nowrap">
                      {Math.ceil(xpReq - xp)} XP left
                    </span>
                    <div className="w-6 h-0.5 dark:bg-slate-800 bg-slate-100 rounded-full overflow-hidden border dark:border-slate-700 border-slate-300">
                      <div
                        className="h-full bg-cyan-600 transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                )}
                {isActive && (
                  <div
                    className={`absolute -bottom-px left-1 right-1 h-0.5 shadow-md rounded-full ${isProfile ? "bg-purple-400 shadow-md" : "bg-cyan-400"}`}
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </nav>

      {/* Main Header */}
      <header className="relative pt-4 pb-2 px-2 md:pt-12 md:pb-6 md:px-6 text-center shrink-0">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center justify-center gap-2 md:gap-4 mb-2 md:mb-4"
        >
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            whileHover={{ scale: 1.15, rotate: 10 }}
            className="group cursor-pointer relative hidden sm:block"
          >
            <Trophy className="w-8 h-8 md:w-12 md:h-12 text-yellow-500 dark:text-yellow-400 icon-glow-yellow transition-all duration-300" />
          </motion.div>

          <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 dark:from-[#9effff] dark:via-[#4ba8ff] dark:to-[#d8b4fe] drop-shadow-[0_0_35px_rgba(59,130,246,0.35)]">
            LevelUp Study
          </h1>

          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{
              duration: 3.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.5,
            }}
            whileHover={{ scale: 1.15, rotate: 10 }}
            className="group cursor-pointer relative hidden sm:block"
          >
            <Zap className="w-8 h-8 md:w-12 md:h-12 text-cyan-500 dark:text-cyan-400 icon-glow-cyan transition-all duration-300" />
          </motion.div>
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-sm md:text-lg dark:text-cyan-200 text-cyan-700/80 font-medium flex items-center justify-center gap-1 md:gap-2 leading-tight"
        >
          <span className="text-base md:text-xl hidden sm:inline">🎮</span>
          <span className="hidden sm:inline">
            Transform your study journey into an epic RPG adventure
          </span>
          <span className="sm:hidden text-xs">RPG-style study adventure</span>
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-2 md:mt-4 inline-block dark:bg-black bg-white border dark:border-white/10 border-black/10 px-4 py-1 md:px-6 md:py-2 rounded-full mx-auto max-w-full overflow-hidden"
        >
          <p className="text-[10px] md:text-sm font-mono dark:text-amber-300/90 dark:text-amber-400 text-amber-700 font-bold italic truncate">
            "{quote}"
          </p>
        </motion.div>
      </header>

      {/* Top Loading Progress Bar */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab + "-loader"}
          className="fixed top-0 left-0 right-0 h-1 z-[9999] pointer-events-none"
        >
          <motion.div
            initial={{ width: "0%", opacity: 1 }}
            animate={{ width: "100%", opacity: 0 }}
            transition={{
              width: { duration: 0.6, ease: "easeInOut" },
              opacity: { duration: 0.2, delay: 0.5 },
            }}
            className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 shadow-md"
          />
        </motion.div>
      </AnimatePresence>

      <main
        className="flex-1 relative p-2 sm:p-4 md:p-6 lg:p-10 pb-2 flex flex-col"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex-1 overflow-visible relative">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={activeTab}
              custom={direction}
              initial={{ opacity: 0, x: direction * 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -50 }}
              transition={{
                duration: 0.2,
                type: "spring",
                stiffness: 400,
                damping: 40,
              }}
              className="max-w-7xl mx-auto w-full relative"
            >
              <ErrorBoundary>
                <Suspense fallback={<PageSkeleton />}>
                  {renderContent()}
                </Suspense>
              </ErrorBoundary>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <footer className="mt-12 py-6 text-center border-t dark:border-white/5 border-black/5">
          <p className="dark:text-slate-400 text-slate-600 font-medium text-sm tracking-wide">
            Made with{" "}
            <span className="dark:text-red-400 text-red-700 animate-pulse inline-block">
              ❤️
            </span>{" "}
            by Madhav
          </p>
        </footer>
      </main>

      {/* Pro Tip Indicator */}
      <AnimatePresence>
        {proTip && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: 20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: 50, x: 20, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-4 md:bottom-10 right-4 md:right-10 z-[9998] max-w-sm dark:bg-slate-900/90 bg-white border border-amber-500/50 shadow-md rounded-xl p-4 flex gap-4 pr-10"
          >
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center relative">
                <BrainCircuit className="w-5 h-5 dark:text-amber-400 text-amber-700" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-slate-900" />
              </div>
            </div>
            <div>
              <h4 className="dark:text-amber-400 text-amber-700 font-bold uppercase tracking-widest text-xs mb-1 flex items-center gap-2">
                Pro Tip: {proTip.title}
              </h4>
              <p className="dark:text-slate-300 text-slate-900 text-sm leading-relaxed">
                {proTip.message}
              </p>
            </div>
            <button
              onClick={() => setProTip(null)}
              className="absolute top-2 right-2 p-1 dark:text-slate-500 text-slate-600 hover:dark:text-white text-slate-900 transition-colors"
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Toast Message */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: 20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: 50, x: 20, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-4 md:bottom-10 right-4 md:right-10 z-[9999] max-w-sm dark:bg-slate-900/90 bg-white border border-cyan-500/50 shadow-md rounded-xl p-4 flex gap-4 pr-10"
          >
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center relative">
                <LockIcon className="w-5 h-5 dark:text-cyan-400 text-cyan-700" />
              </div>
            </div>
            <div className="flex flex-col justify-center">
              <h4 className="dark:text-cyan-400 text-cyan-700 font-bold uppercase tracking-widest text-xs mb-1 flex items-center gap-2">
                Locked
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
          {showShortcutsModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[10001] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={() => setShowShortcutsModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                transition={{ type: "spring", duration: 0.3 }}
                className="dark:bg-slate-900 bg-white border dark:border-cyan-500/30 border-slate-200 p-6 md:p-8 rounded-2xl max-w-2xl w-full text-left shadow-2xl relative overflow-hidden dark:text-white text-slate-900"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header decor */}
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-50" />

                {/* Header */}
                <div className="flex items-center justify-between mb-6 border-b dark:border-slate-800 border-slate-200 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg dark:bg-cyan-500/10 bg-cyan-50 border dark:border-cyan-500/30 border-cyan-200 flex items-center justify-center">
                      <Keyboard className="w-5 h-5 dark:text-cyan-400 text-cyan-700 animate-pulse" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold tracking-wider uppercase dark:text-white text-slate-900">
                        System Commands
                      </h2>
                      <p className="text-xs dark:text-slate-400 text-slate-600 font-mono">
                        Global Keyboard Shortcuts Help
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowShortcutsModal(false)}
                    className="p-1.5 rounded-lg border dark:border-slate-800 border-slate-200 dark:hover:border-slate-700 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400 text-slate-600 hover:text-slate-900 dark:hover:text-white transition-all"
                    aria-label="Close shortcuts overlay"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Body */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Tab Shortcuts */}
                  <div>
                    <h3 className="text-xs font-mono uppercase tracking-widest dark:text-cyan-400 text-cyan-700 border-b dark:border-slate-800/60 border-slate-200 pb-1.5 mb-3">
                      Jump to Section
                    </h3>
                    <div className="space-y-2.5">
                      {[
                        {
                          key: "D",
                          label: "Dashboard",
                          desc: "Main station & timers",
                          icon: LayoutDashboard,
                          req: 1,
                        },
                        {
                          key: "Y",
                          label: "Syllabus",
                          desc: "Subjects & masteries",
                          icon: BookOpen,
                          req: 1,
                        },
                        {
                          key: "H",
                          label: "History",
                          desc: "Study archives & logs",
                          icon: RefreshCw,
                          req: 1,
                        },
                        {
                          key: "A",
                          label: "Analytics",
                          desc: "XP charts & reports",
                          icon: LineChart,
                          req: 6,
                        },
                        {
                          key: "M",
                          label: "Missions",
                          desc: "XP quests & tasks",
                          icon: Target,
                          req: 3,
                        },
                        {
                          key: "P",
                          label: "Protocols",
                          desc: "Daily habits & logs",
                          icon: Shield,
                          req: 4,
                        },
                        {
                          key: "R",
                          label: "Peers",
                          desc: "Social rankings",
                          icon: Swords,
                          req: 5,
                        },
                        {
                          key: "I",
                          label: "Profile",
                          desc: "Identity & profile settings",
                          icon: User,
                          req: 1,
                        },
                        {
                          key: "G",
                          label: "Settings",
                          desc: "General preferences",
                          icon: SettingsIcon,
                          req: 1,
                        },
                      ].map((item) => {
                        const isLocked = level < item.req;
                        const Icon = item.icon;
                        return (
                          <div
                            key={item.key}
                            className="flex items-center justify-between group p-1.5 rounded-lg dark:hover:bg-slate-800/30 hover:bg-slate-100/70 transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Icon
                                className={`w-4 h-4 flex-shrink-0 ${isLocked ? "dark:text-slate-600 text-slate-400" : "dark:text-slate-300 text-slate-700"}`}
                              />
                              <div className="min-w-0">
                                <span
                                  className={`text-xs font-semibold block leading-none truncate ${isLocked ? "dark:text-slate-600 text-slate-400 line-through" : "dark:text-slate-200 text-slate-800"}`}
                                >
                                  {item.label}
                                </span>
                                <span className="text-[10px] dark:text-slate-400 text-slate-500 block truncate mt-0.5">
                                  {item.desc}
                                </span>
                              </div>
                              {isLocked && (
                                <span className="text-[9px] font-mono text-amber-600 border border-amber-500/20 bg-amber-500/5 px-1 rounded-sm leading-none flex-shrink-0">
                                  Lvl {item.req}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <kbd className="px-1.5 py-0.5 text-[9px] font-mono font-bold dark:bg-slate-950 bg-slate-100 border dark:border-slate-700/80 border-slate-300 rounded shadow dark:text-slate-300 text-slate-600">
                                Shift
                              </kbd>
                              <span className="dark:text-slate-500 text-slate-400 text-[10px] font-mono">
                                +
                              </span>
                              <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-bold dark:bg-slate-950 bg-slate-100 border dark:border-slate-700/80 border-slate-300 rounded shadow dark:text-cyan-400 text-cyan-700 uppercase">
                                {item.key}
                              </kbd>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Action Shortcuts */}
                  <div className="flex flex-col justify-between">
                    <div>
                      <h3 className="text-xs font-mono uppercase tracking-widest dark:text-cyan-400 text-cyan-700 border-b dark:border-slate-800/60 border-slate-200 pb-1.5 mb-3">
                        Action Shortcuts
                      </h3>
                      <div className="space-y-3">
                        {[
                          {
                            keys: ["Shift", "S"],
                            label: "Pomodoro Timer",
                            desc: "Launch focus mode immediately",
                            icon: Zap,
                          },
                          {
                            keys: ["Shift", "N"],
                            label: "Create Task",
                            desc: "Quick-add task modal",
                            icon: Zap,
                          },
                          {
                            keys: ["Shift", "C"],
                            label: "Calendar Setup",
                            desc: "Connect/configure Google Calendar",
                            icon: Calendar,
                          },
                          {
                            keys: ["Shift", "?"],
                            label: "Keyboard Help",
                            desc: "Toggle this command helper overlay",
                            icon: HelpCircle,
                          },
                          {
                            keys: ["Esc"],
                            label: "Close Modal",
                            desc: "Close any active overlay helper",
                            icon: X,
                          },
                        ].map((item, idx) => {
                          const Icon = item.icon;
                          return (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-1.5 rounded-lg dark:hover:bg-slate-800/30 hover:bg-slate-100/70 transition-colors"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <Icon className="w-4 h-4 dark:text-cyan-400 text-cyan-700 flex-shrink-0" />
                                <div className="min-w-0">
                                  <span className="text-xs font-semibold dark:text-slate-200 text-slate-800 block leading-none truncate">
                                    {item.label}
                                  </span>
                                  <span className="text-[10px] dark:text-slate-400 text-slate-500 block truncate mt-0.5">
                                    {item.desc}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                {item.keys.map((k, kIdx) => (
                                  <React.Fragment key={kIdx}>
                                    {kIdx > 0 && (
                                      <span className="dark:text-slate-500 text-slate-400 text-[10px] font-mono">
                                        +
                                      </span>
                                    )}
                                    <kbd
                                      className={`px-1.5 py-0.5 text-[10px] font-mono font-bold dark:bg-slate-950 bg-slate-100 border dark:border-slate-700/80 border-slate-300 rounded shadow ${k === "Shift" ? "dark:text-slate-300 text-slate-600" : "dark:text-cyan-400 text-cyan-700"}`}
                                    >
                                      {k}
                                    </kbd>
                                  </React.Fragment>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="mt-6 md:mt-0 p-3 dark:bg-slate-950/40 bg-slate-50 rounded-xl border dark:border-slate-800/60 border-slate-200">
                      <p className="text-[11px] dark:text-slate-400 text-slate-600 leading-relaxed font-mono">
                        💡{" "}
                        <span className="dark:text-cyan-400 text-cyan-700 font-semibold">
                          Protip:
                        </span>{" "}
                        You can also use{" "}
                        <kbd className="px-1 py-0.5 dark:bg-slate-800 bg-slate-200 border dark:border-slate-700 border-slate-300 rounded dark:text-slate-300 text-slate-700 text-[9px]">
                          ←
                        </kbd>{" "}
                        and{" "}
                        <kbd className="px-1 py-0.5 dark:bg-slate-800 bg-slate-200 border dark:border-slate-700 border-slate-300 rounded dark:text-slate-300 text-slate-700 text-[9px]">
                          →
                        </kbd>{" "}
                        arrow keys to slide between unlocked system modules!
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}

import { TourProvider } from "./components/TourGuide";

import { ErrorBoundary } from "./components/ErrorBoundary";

export default function App() {
  return (
    <AppProvider>
      <TourProvider>
        <ErrorBoundary>
          <AppContent />
        </ErrorBoundary>
      </TourProvider>
    </AppProvider>
  );
}
