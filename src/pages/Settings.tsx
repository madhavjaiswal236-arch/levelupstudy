import React, { useState, useMemo, useRef, useEffect } from "react";
import { Card } from "../components/ui/card";
import {
  Settings as SettingsIcon,
  Clock,
  Bell,
  User,
  Database,
  ChevronRight,
  LogOut,
  Trash2,
  Target,
  Terminal,
  RefreshCw,
  Zap,
  Flame,
  CheckCircle2,
  Sliders,
  Volume2,
  ShieldAlert,
  ExternalLink,
  Globe,
  Edit3,
  Plus,
  History as HistoryIcon,
  Save,
  FileText,
  Check,
  CloudDownload,
  CloudUpload,
  Download,
  Upload,
  AlertTriangle,
  Loader2,
  Lock,
  Trophy,
  Sparkles,
  RotateCcw,
  Award,
  HardDrive,
  Activity,
  Server,
  Layers,
  Cpu,
  Wifi,
  CheckCheck,
  BarChart3,
  Calendar,
  ShieldCheck,
} from "lucide-react";
import { useAppContext } from "../context/AppContext";
import {
  getLevelFromXp,
  getXpForLevel,
  getRankInfo,
  getLevelProgress,
  getLocalDateString,
  isCurrentDayTask,
} from "../lib/utils";
import {
  requestNotificationPermissions,
  triggerMotivationNotification,
  triggerTaskReminder,
  triggerStudyBlockNotification,
  triggerStreakProtectionAlert,
  sendNotification,
  getChromeNotificationPermissionState,
  isInIframe,
} from "../lib/notifications";

const Settings = React.memo(function Settings() {
  const {
    notificationSettings,
    setNotificationSettings,
    playerName,
    setPlayerName,
    dailyTarget,
    setDailyTarget,
    class11EndDate,
    setClass11EndDate,
    totalXpGoal,
    setTotalXpGoal,
    xp,
    setXp,
    level,
    setLevel,
    streakDays,
    setStreakDays,
    hoursStudiedToday,
    setHoursStudiedToday,
    questionsSolved,
    setQuestionsSolved,
    xpGainedToday,
    setXpGainedToday,
    history,
    setHistory,
    resetApp,
    firebaseUser,
    todos,
    forceFetchAndRestoreFromCloud,
    saveStateToCloudNow,
    exportLocalBackup,
    importLocalBackup,
    triggerWelcomeScreen,
  } = useAppContext();

  const [permStatus, setPermStatus] = useState<string | null>(null);
  const [isRestoringCloud, setIsRestoringCloud] = useState(false);
  const [cloudStatusMsg, setCloudStatusMsg] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [isSavingCloud, setIsSavingCloud] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [nukeProgress, setNukeProgress] = useState(0);
  const nukeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Storage Diagnostics and Deep Sync State
  const [storageStatsTick, setStorageStatsTick] = useState(0);
  const [deepSyncLog, setDeepSyncLog] = useState<{
    time: string;
    status: "idle" | "syncing" | "success" | "error";
    message: string;
    details?: string;
  }>({
    time: new Date().toLocaleTimeString(),
    status: "idle",
    message: "Ready for Deep Sync",
  });

  const storageStats = useMemo(() => {
    if (typeof window === "undefined" || !window.localStorage) {
      return { totalBytes: 0, totalKb: "0.0", totalMb: "0.00", percentQuota: "0.00", keyCount: 0, items: [] };
    }
    let totalBytes = 0;
    const items: { key: string; bytes: number; kb: string; count?: number; label: string }[] = [];

    const keyLabels: Record<string, string> = {
      levelup_syllabus_v3: "JEE Syllabus & PYQs",
      levelup_todos_v2: "Study Tasks & Lectures",
      levelup_history: "Historical Study Logs",
      levelup_practice_sessions_v2: "Deep Focus Sessions",
      levelup_xp_v2: "XP Counter",
      levelup_level_v2: "Player Level",
      levelup_streak_v2: "Streak Counter",
      levelup_active_day: "Active Study Day",
      levelup_last_login_date: "Last Activity Timestamp",
      levelup_notifications_v1: "Notification Settings",
      levelup_audio_ambient: "Ambient Sound Settings",
      levelup_daily_target_v2: "Daily Target XP",
      levelup_total_xp_goal: "Total Exam Goal XP",
      levelup_player_name: "Player Name",
    };

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const val = localStorage.getItem(key) || "";
        const bytes = (key.length + val.length) * 2; // UTF-16 approximate
        totalBytes += bytes;
        let count: number | undefined = undefined;
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed)) count = parsed.length;
          else if (typeof parsed === "object" && parsed !== null) count = Object.keys(parsed).length;
        } catch (_) {}
        items.push({
          key,
          label: keyLabels[key] || key,
          bytes,
          kb: (bytes / 1024).toFixed(1),
          count,
        });
      }
    }
    items.sort((a, b) => b.bytes - a.bytes);
    return {
      totalBytes,
      totalKb: (totalBytes / 1024).toFixed(1),
      totalMb: (totalBytes / (1024 * 1024)).toFixed(2),
      percentQuota: ((totalBytes / (5 * 1024 * 1024)) * 100).toFixed(2),
      keyCount: localStorage.length,
      items,
    };
  }, [storageStatsTick, todos, history, xp, level]);

  const refreshStorageStats = () => {
    setStorageStatsTick((t) => t + 1);
  };

  const handleDeepSync = async () => {
    setIsSavingCloud(true);
    setDeepSyncLog({
      time: new Date().toLocaleTimeString(),
      status: "syncing",
      message: "Forcefully packing and deep-syncing local snapshot to Firestore...",
    });
    try {
      const ok = await saveStateToCloudNow();
      if (ok) {
        setDeepSyncLog({
          time: new Date().toLocaleTimeString(),
          status: "success",
          message: "Deep Sync Complete! 100% of local state pushed to Firestore.",
          details: `Synced ${todos.length} tasks, ${history.length} study logs, full syllabus masteries, and ${xp.toLocaleString()} XP.`,
        });
        setCloudStatusMsg({
          type: "success",
          text: "Deep Sync Success: All local entities forcefully pushed to Firestore.",
        });
      } else {
        setDeepSyncLog({
          time: new Date().toLocaleTimeString(),
          status: "error",
          message: "Deep Sync failed: User not authenticated or Firestore unavailable.",
        });
        setCloudStatusMsg({
          type: "error",
          text: "Deep Sync failed: Please sign in or check network connection.",
        });
      }
    } catch (err: any) {
      setDeepSyncLog({
        time: new Date().toLocaleTimeString(),
        status: "error",
        message: err?.message || "Deep Sync encountered an unexpected error.",
      });
    } finally {
      setIsSavingCloud(false);
      refreshStorageStats();
    }
  };

  const startNukeTimer = () => {
    if (nukeTimerRef.current) return;
    setNukeProgress(0);
    nukeTimerRef.current = setInterval(() => {
      setNukeProgress((prev) => {
        if (prev >= 100) {
          if (nukeTimerRef.current) {
            clearInterval(nukeTimerRef.current);
            nukeTimerRef.current = null;
          }
          resetApp();
          return 100;
        }
        return prev + 0.5; // 20 seconds hold to wipe: 100ms interval * 200 ticks = 20000ms = 20s
      });
    }, 100);
  };

  const cancelNukeTimer = () => {
    if (nukeTimerRef.current) {
      clearInterval(nukeTimerRef.current);
      nukeTimerRef.current = null;
    }
    setNukeProgress(0);
  };

  const handleForceRestore = async () => {
    setIsRestoringCloud(true);
    setCloudStatusMsg(null);
    try {
      const res = await forceFetchAndRestoreFromCloud();
      if (res.success) {
        setCloudStatusMsg({
          type: "success",
          text: res.message,
        });
      } else {
        setCloudStatusMsg({
          type: "error",
          text: res.message,
        });
      }
    } catch (err: any) {
      setCloudStatusMsg({
        type: "error",
        text: err?.message || "Failed to fetch data from cloud.",
      });
    } finally {
      setIsRestoringCloud(false);
    }
  };

  const handlePushToCloud = async () => {
    setIsSavingCloud(true);
    setCloudStatusMsg(null);
    try {
      const ok = await saveStateToCloudNow();
      if (ok) {
        setCloudStatusMsg({
          type: "success",
          text: "Local state successfully saved to Cloud Firestore!",
        });
      } else {
        setCloudStatusMsg({
          type: "error",
          text: "Failed to push to Cloud. Check if you are signed in.",
        });
      }
    } catch (err: any) {
      setCloudStatusMsg({
        type: "error",
        text: err?.message || "Cloud push failed.",
      });
    } finally {
      setIsSavingCloud(false);
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        const res = importLocalBackup(content);
        if (res.success) {
          setCloudStatusMsg({ type: "success", text: res.message });
        } else {
          setCloudStatusMsg({ type: "error", text: res.message });
        }
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleRequestPermissions = async () => {
    const granted = await requestNotificationPermissions();
    if (granted) {
      setPermStatus("Permission Granted!");
      sendNotification("🎉 System Notifications Enabled", {
        body: "You will now receive high-priority study alerts, task reminders, and motivation!",
        type: "general",
      });
    } else {
      setPermStatus("Permission Denied or Blocked by Browser/OS");
    }
    setTimeout(() => setPermStatus(null), 4000);
  };

  const [rolloverTime, setRolloverTime] = useState("03:00");
  const [pomoTime, setPomoTime] = useState(25);
  const [deepWorkTime, setDeepWorkTime] = useState(50);
  const [mainGoal, setMainGoal] = useState("Crack JEE 2026");

  const handleSave = () => {
    try {
      localStorage.setItem(
        "app_settings_extended",
        JSON.stringify({
          rolloverTime,
          pomoTime,
          deepWorkTime,
          mainGoal,
        }),
      );
      setSaveSuccessMsg("Configuration saved successfully!");
      setTimeout(() => setSaveSuccessMsg(null), 3500);
    } catch (e) {
      console.error("Failed to save configuration", e);
      setSaveSuccessMsg("Failed to save settings to local storage.");
      setTimeout(() => setSaveSuccessMsg(null), 3500);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem("app_settings_extended");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.rolloverTime) setRolloverTime(parsed.rolloverTime);
        if (parsed.pomoTime) setPomoTime(parsed.pomoTime);
        if (parsed.deepWorkTime) setDeepWorkTime(parsed.deepWorkTime);
        if (parsed.mainGoal) setMainGoal(parsed.mainGoal);
      } catch (e) {
        console.warn("Failed to parse app_settings_extended in Settings", e);
      }
    }
  }, []);

  return (
    <div className="w-full max-w-5xl mx-auto pb-24 md:pb-12 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header & Quick Telemetry Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800/80 pb-6">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm">
            <SettingsIcon className="w-7 h-7 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Settings & Preferences
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Calibrate goals, configure smart notifications, and manage system persistence.
            </p>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${firebaseUser ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
            <span className="text-slate-600 dark:text-slate-300 font-semibold">
              {firebaseUser ? "Cloud Active" : "Local Only"}
            </span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-cyan-500" />
            <span>{storageStats.totalKb} KB</span>
          </div>
        </div>
      </div>

      {/* SECTION 1: Study Profile & Schedule Calibration (Balanced 2-Column Grid) */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            01. System Calibration
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Identity & Goals */}
          <Card className="p-6 bg-white dark:bg-slate-950 border-slate-200/90 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-shadow rounded-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-100 dark:border-slate-900">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Identity & Goals
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Personalized dashboard identity & target milestones
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold font-mono uppercase text-slate-600 dark:text-slate-400 mb-1.5">
                    Player Name
                  </label>
                  <input
                    type="text"
                    value={playerName || ""}
                    onChange={(e) => setPlayerName(e.target.value)}
                    onBlur={() => {
                      if (!playerName || !playerName.trim()) {
                        setPlayerName("Player 1");
                      }
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold font-mono uppercase text-slate-600 dark:text-slate-400 mb-1.5">
                    Main Objective
                  </label>
                  <input
                    type="text"
                    value={mainGoal || ""}
                    onChange={(e) => setMainGoal(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold font-mono uppercase text-slate-600 dark:text-slate-400 mb-1.5">
                    Target Exam Date
                  </label>
                  <input
                    type="date"
                    value={class11EndDate ? class11EndDate.split("T")[0] : ""}
                    onChange={(e) => setClass11EndDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <p className="text-[11px] text-slate-400 mt-1 font-mono">
                    Used to compute required daily study hours based on your target XP goal.
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Schedule & Timers */}
          <Card className="p-6 bg-white dark:bg-slate-950 border-slate-200/90 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-shadow rounded-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-100 dark:border-slate-900">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Schedule & Timers
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Day boundary cutoff & focus session intervals
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold font-mono uppercase text-slate-600 dark:text-slate-400 mb-1.5">
                    Day Rollover Time (24h)
                  </label>
                  <input
                    type="time"
                    value={rolloverTime || ""}
                    onChange={(e) => setRolloverTime(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 transition-colors font-mono"
                  />
                  <p className="text-[11px] text-slate-400 mt-1 font-mono">
                    Time when daily streak & daily targets advance (default: 03:00 AM).
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3.5 pt-1">
                  <div>
                    <label className="block text-xs font-bold font-mono uppercase text-slate-600 dark:text-slate-400 mb-1.5">
                      Pomodoro (mins)
                    </label>
                    <input
                      type="number"
                      min={5}
                      max={120}
                      value={pomoTime}
                      onChange={(e) => setPomoTime(Number(e.target.value))}
                      className="w-full bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 transition-colors font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold font-mono uppercase text-slate-600 dark:text-slate-400 mb-1.5">
                      Deep Work (mins)
                    </label>
                    <input
                      type="number"
                      min={10}
                      max={240}
                      value={deepWorkTime}
                      onChange={(e) => setDeepWorkTime(Number(e.target.value))}
                      className="w-full bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 transition-colors font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* SECTION 2: Goal Estimator & Target Calibrator (Full Width Bento Card) */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            02. Exam Pace & Goal Estimator
          </span>
        </div>

        <Card className="p-6 bg-white dark:bg-slate-950 border-slate-200/90 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-shadow rounded-2xl">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-900">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Target Calibrator & Goal Milestones
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    8h/Day Auto-Paced
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select your exam XP benchmark to compute total and daily required hours (based on ~300 XP/hr). The 8 Hours/Day Target automatically calculates the optimal goal until your target date.
                </p>
              </div>
            </div>
          </div>

          {/* Featured 8h/day Block + Milestone Presets Grid */}
          <div className="space-y-4">
            {(() => {
              const daysRemaining = (() => {
                if (class11EndDate) {
                  const end = new Date(class11EndDate).getTime();
                  if (!isNaN(end) && end > Date.now()) {
                    return Math.max(1, Math.ceil((end - Date.now()) / (1000 * 3600 * 24)));
                  }
                }
                return 300;
              })();

              const eightHourGoalVal = Math.round(daysRemaining * 8 * 300 + Math.max(0, xp || 0));
              const eightHourTotalHours = daysRemaining * 8;
              const isEightHourSelected = totalXpGoal === eightHourGoalVal;

              const presetGoals = [100000, 500000, 600000, 650000, 700000, 800000, 1000000];

              return (
                <>
                  {/* Primary 8-Hour Goal Block */}
                  <div
                    onClick={() => {
                      setTotalXpGoal(eightHourGoalVal);
                      setDailyTarget(2400);
                    }}
                    className={`p-4 md:p-5 rounded-2xl border transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      isEightHourSelected
                        ? "bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-cyan-500/15 border-emerald-500 text-slate-900 dark:text-white shadow-md ring-2 ring-emerald-500/30"
                        : "bg-slate-50/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={`p-3 rounded-xl ${isEightHourSelected ? "bg-emerald-500 text-white" : "bg-emerald-500/10 text-emerald-500"}`}>
                        <Zap className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm md:text-base font-black tracking-tight text-slate-900 dark:text-white">
                            8 Hours / Day Target (Recommended)
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                            Auto-Calibrated
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Calculated for {daysRemaining} days remaining until {class11EndDate ? new Date(class11EndDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "Target Exam Date"} at 8h/day (2,400 XP/d)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 self-end md:self-auto">
                      <div className="text-right">
                        <div className="text-lg md:text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                          {(eightHourGoalVal / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}k XP
                        </div>
                        <div className="text-xs font-bold text-slate-500 dark:text-slate-400 font-mono">
                          {eightHourTotalHours}h total (8.0 h/d)
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isEightHourSelected ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 dark:border-slate-700"}`}>
                        {isEightHourSelected && <CheckCircle2 className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Standard Milestone Blocks */}
                  <div>
                    <div className="text-xs font-mono font-bold uppercase text-slate-400 dark:text-slate-500 mb-2">
                      Or Select Fixed Milestone:
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                      {presetGoals.map((goalVal) => {
                        const remainingXp = Math.max(0, goalVal - (xp || 0));
                        const totalHours = Math.ceil(remainingXp / 300);
                        const daily = (totalHours / daysRemaining).toFixed(1);
                        const dailyHoursStr = `${daily} h/d`;
                        const isSelected = totalXpGoal === goalVal;

                        return (
                          <button
                            key={goalVal}
                            type="button"
                            onClick={() => setTotalXpGoal(goalVal)}
                            className={`p-3.5 rounded-xl text-left border transition-all cursor-pointer ${
                              isSelected
                                ? "bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-sm ring-1 ring-emerald-500/30"
                                : "bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-emerald-500/40 text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            <div className="text-xs font-black font-mono tracking-tight">
                              {goalVal / 1000}k XP
                            </div>
                            <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
                              {totalHours}h total
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1 font-mono">
                              {dailyHoursStr}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </Card>
      </div>

      {/* SECTION 3: Smart Notification System (Full Width Structured Card) */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            03. Notification Engine
          </span>
        </div>

        <Card className="p-6 bg-white dark:bg-slate-950 border-slate-200/90 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-shadow rounded-2xl space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-4 pb-3 border-b border-slate-100 dark:border-slate-900">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Smart Study Notification Center
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Task reminders, study block pacing, streak shields, and competitor alerts
                </p>
              </div>
            </div>

            <button
              onClick={handleRequestPermissions}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-black font-bold rounded-xl text-xs font-mono flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5" />
              {permStatus || "Enable Desktop Alerts"}
            </button>
          </div>

          {/* Desktop Permission Banner */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-2.5">
              <Globe className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    Chrome Desktop Popups:
                  </span>
                  {getChromeNotificationPermissionState() === "granted" ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold text-[10px] font-mono">
                      ENABLED (Granted)
                    </span>
                  ) : getChromeNotificationPermissionState() === "denied" ? (
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 font-bold text-[10px] font-mono">
                      BLOCKED IN CHROME
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-bold text-[10px] font-mono">
                      PERMISSION REQUIRED
                    </span>
                  )}
                </div>
                <p className="text-slate-500 dark:text-slate-400 mt-1 leading-relaxed text-[11px]">
                  Sends native OS popups when study blocks start, tasks are due, or streak shields trigger.
                </p>
                {isInIframe() && (
                  <p className="text-amber-600 dark:text-amber-400/90 mt-0.5 text-[11px] font-medium">
                    💡 AI Studio preview iframe: Chrome requires opening in a dedicated tab for desktop popups.
                  </p>
                )}
              </div>
            </div>

            {isInIframe() && (
              <button
                type="button"
                onClick={() => window.open(window.location.href, "_blank")}
                className="px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border border-cyan-500/30 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open in Tab
              </button>
            )}
          </div>

          {/* 2-Column Grid: Alert Categories on Left, Pacing & Tests on Right */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Category Toggles */}
            <div className="space-y-2.5">
              <span className="text-xs font-mono uppercase text-slate-400 font-bold block mb-2">
                Active Notification Categories
              </span>

              {/* Task Reminders */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div>
                    <p className="font-bold text-xs text-slate-900 dark:text-white">Task & Objective Alerts</p>
                    <p className="text-[11px] text-slate-500">Urgent task deadlines & study start cues</p>
                  </div>
                </div>
                <div
                  className={`w-10 h-5 rounded-full cursor-pointer transition-colors relative shrink-0 ${notificationSettings.taskReminders ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-700"}`}
                  onClick={() =>
                    setNotificationSettings((prev) => ({
                      ...prev,
                      taskReminders: !prev.taskReminders,
                    }))
                  }
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-all ${notificationSettings.taskReminders ? "left-5.5" : "left-1"}`}
                  />
                </div>
              </div>

              {/* Motivational Alerts */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <Zap className="w-4 h-4 text-yellow-500 shrink-0" />
                  <div>
                    <p className="font-bold text-xs text-slate-900 dark:text-white">Motivational & Rival Alerts</p>
                    <p className="text-[11px] text-slate-500">Competitor check-ins & tough-love boosts</p>
                  </div>
                </div>
                <div
                  className={`w-10 h-5 rounded-full cursor-pointer transition-colors relative shrink-0 ${notificationSettings.motivationalAlerts ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-700"}`}
                  onClick={() =>
                    setNotificationSettings((prev) => ({
                      ...prev,
                      motivationalAlerts: !prev.motivationalAlerts,
                    }))
                  }
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-all ${notificationSettings.motivationalAlerts ? "left-5.5" : "left-1"}`}
                  />
                </div>
              </div>

              {/* Study Block Reminders */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-cyan-500 shrink-0" />
                  <div>
                    <p className="font-bold text-xs text-slate-900 dark:text-white">Study Block Launch Cues</p>
                    <p className="text-[11px] text-slate-500">Notifications at block start & halfway</p>
                  </div>
                </div>
                <div
                  className={`w-10 h-5 rounded-full cursor-pointer transition-colors relative shrink-0 ${notificationSettings.studyBlockReminders ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-700"}`}
                  onClick={() =>
                    setNotificationSettings((prev) => ({
                      ...prev,
                      studyBlockReminders: !prev.studyBlockReminders,
                    }))
                  }
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-all ${notificationSettings.studyBlockReminders ? "left-5.5" : "left-1"}`}
                  />
                </div>
              </div>

              {/* Streak Protection */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <Flame className="w-4 h-4 text-amber-500 shrink-0" />
                  <div>
                    <p className="font-bold text-xs text-slate-900 dark:text-white">Streak Shield Warning</p>
                    <p className="text-[11px] text-slate-500">Urgent alerts at 2 PM, 6 PM, 9 PM</p>
                  </div>
                </div>
                <div
                  className={`w-10 h-5 rounded-full cursor-pointer transition-colors relative shrink-0 ${notificationSettings.streakProtectionAlerts ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-700"}`}
                  onClick={() =>
                    setNotificationSettings((prev) => ({
                      ...prev,
                      streakProtectionAlerts: !prev.streakProtectionAlerts,
                    }))
                  }
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-all ${notificationSettings.streakProtectionAlerts ? "left-5.5" : "left-1"}`}
                  />
                </div>
              </div>

              {/* Audio & Haptic */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <Volume2 className="w-4 h-4 text-purple-500 shrink-0" />
                  <div>
                    <p className="font-bold text-xs text-slate-900 dark:text-white">Audio & Haptic Effects</p>
                    <p className="text-[11px] text-slate-500">In-app chime effects and phone haptics</p>
                  </div>
                </div>
                <div
                  className={`w-10 h-5 rounded-full cursor-pointer transition-colors relative shrink-0 ${notificationSettings.soundEnabled ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-700"}`}
                  onClick={() =>
                    setNotificationSettings((prev) => ({
                      ...prev,
                      soundEnabled: !prev.soundEnabled,
                    }))
                  }
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-all ${notificationSettings.soundEnabled ? "left-5.5" : "left-1"}`}
                  />
                </div>
              </div>
            </div>

            {/* Pacing and Live Test Buttons */}
            <div className="space-y-4">
              <div>
                <span className="text-xs font-mono uppercase text-slate-400 font-bold block mb-2">
                  Delivery Frequency & Pacing
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "high", label: "High", desc: "Every 20-30m" },
                    { id: "balanced", label: "Balanced", desc: "Every 45-60m" },
                    { id: "gentle", label: "Gentle", desc: "Every 2+ hrs" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        setNotificationSettings((prev) => ({
                          ...prev,
                          frequency: item.id as any,
                        }))
                      }
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        notificationSettings.frequency === item.id
                          ? "bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400 font-black shadow-sm"
                          : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-700"
                      }`}
                    >
                      <div className="text-xs font-bold font-mono">{item.label}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5 font-mono">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-xs font-mono uppercase text-slate-400 font-bold block mb-2">
                  Live Test Trigger Console
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => triggerMotivationNotification()}
                    className="p-2.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border border-yellow-500/30 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    Motivation
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const todayStr = getLocalDateString();
                      const todayPending = todos.filter(
                        (t) => !t.completed && !t.isDeleted && isCurrentDayTask(t, todayStr),
                      );
                      const urgent =
                        todayPending.find((t) => t.priority === "High") ||
                        todayPending[0] ||
                        todos.find((t) => !t.completed);
                      triggerTaskReminder(
                        urgent ? urgent.text : "Solve 10 Physics PYQs",
                        todayPending.length || 1,
                      );
                    }}
                    className="p-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Task Alert
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerStudyBlockNotification("Mathematics", "start")}
                    className="p-2.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    Study Block
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerStreakProtectionAlert(streakDays || 5, hoursStudiedToday || 0)}
                    className="p-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Flame className="w-3.5 h-3.5" />
                    Streak Shield
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* SECTION 4: Data Management & System Diagnostics (Balanced 2-Column Grid) */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            04. Persistence & Storage Maintenance
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card A (Left): Cloud Sync & Backups */}
          <Card className="p-6 bg-white dark:bg-slate-950 border-slate-200/90 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-shadow rounded-2xl flex flex-col justify-between space-y-5">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-900">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-500">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      Cloud Sync & Backups
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Cross-device cloud synchronization & JSON snapshots
                    </p>
                  </div>
                </div>

                {firebaseUser ? (
                  <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-mono font-bold rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Connected
                  </span>
                ) : (
                  <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10px] font-mono font-bold rounded-full">
                    Local Mode
                  </span>
                )}
              </div>

              {/* Status Alert */}
              {cloudStatusMsg && (
                <div
                  className={`mt-4 p-3 rounded-xl text-xs font-medium border flex items-start gap-2.5 ${
                    cloudStatusMsg.type === "success"
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                      : cloudStatusMsg.type === "error"
                      ? "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300"
                      : "bg-cyan-500/10 border-cyan-500/30 text-cyan-700 dark:text-cyan-300"
                  }`}
                >
                  {cloudStatusMsg.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-bold">{cloudStatusMsg.type === "success" ? "Success" : "Notice"}</p>
                    <p className="mt-0.5 opacity-90">{cloudStatusMsg.text}</p>
                  </div>
                </div>
              )}

              {/* Cloud Sync Actions */}
              <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center gap-2">
                  <CloudDownload className="w-4 h-4 text-cyan-500" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Firestore Cloud Storage
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Restore or push your complete state (XP, syllabus masteries, study logs, tasks).
                </p>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={handleForceRestore}
                    disabled={isRestoringCloud || !firebaseUser}
                    className="flex items-center justify-center gap-1.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 text-white font-bold py-2 px-3 rounded-lg text-xs font-mono transition-all shadow-sm cursor-pointer"
                  >
                    {isRestoringCloud ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CloudDownload className="w-3.5 h-3.5" />}
                    {isRestoringCloud ? "Fetching..." : "Fetch Cloud"}
                  </button>

                  <button
                    onClick={handlePushToCloud}
                    disabled={isSavingCloud || !firebaseUser}
                    className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-40 text-white font-bold py-2 px-3 rounded-lg text-xs font-mono transition-all border border-slate-700 cursor-pointer"
                  >
                    {isSavingCloud ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CloudUpload className="w-3.5 h-3.5" />}
                    {isSavingCloud ? "Saving..." : "Push Cloud"}
                  </button>
                </div>
              </div>

              {/* JSON Backup & Recovery */}
              <div className="mt-3 p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-500" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Offline Local Backup (.json)
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Export or import a direct JSON snapshot file for manual safekeeping.
                </p>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={exportLocalBackup}
                    className="flex items-center justify-center gap-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 font-bold py-2 px-3 rounded-lg text-xs font-mono transition-all border border-purple-500/20 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export (.json)
                  </button>

                  <label className="flex items-center justify-center gap-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 font-bold py-2 px-3 rounded-lg text-xs font-mono transition-all border border-purple-500/20 cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    Import (.json)
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json"
                      onChange={handleFileImport}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* General Actions */}
            <div className="space-y-2.5 pt-3 border-t border-slate-100 dark:border-slate-900">
              {saveSuccessMsg && (
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs font-mono text-center font-bold flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {saveSuccessMsg}
                </div>
              )}

              <button
                onClick={handleSave}
                className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold py-2.5 rounded-xl hover:opacity-90 transition-opacity shadow-sm text-xs font-mono cursor-pointer flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Configuration
              </button>

              <button
                onClick={() => {
                  triggerWelcomeScreen();
                }}
                className="w-full flex items-center justify-center gap-2 bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 font-bold py-2.5 rounded-xl hover:bg-cyan-500/20 active:scale-[0.99] transition-all border border-cyan-500/20 shadow-sm text-xs font-mono cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Return to Welcome Screen
              </button>
            </div>
          </Card>

          {/* Card B (Right): Storage Diagnostics & Deep Sync & Safe Wipe */}
          <Card className="p-6 bg-white dark:bg-slate-950 border-slate-200/90 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-shadow rounded-2xl flex flex-col justify-between space-y-5">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-900">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-500">
                    <HardDrive className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      Storage Diagnostics & Deep Sync
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Local telemetry & storage quota footprint
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={refreshStorageStats}
                    className="p-1.5 text-xs font-mono bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-lg transition-colors cursor-pointer"
                    title="Refresh Storage Footprint"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={handleDeepSync}
                    disabled={isSavingCloud}
                    className="px-3 py-1 text-xs font-mono font-bold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {isSavingCloud ? <Loader2 className="w-3 h-3 animate-spin" /> : <CloudUpload className="w-3 h-3" />}
                    {isSavingCloud ? "Syncing..." : "Deep Sync"}
                  </button>
                </div>
              </div>

              {/* 4 Mini Stat Blocks */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4">
                <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
                    Used
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-base font-mono font-black text-cyan-600 dark:text-cyan-400">
                      {storageStats.totalKb}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">KB</span>
                  </div>
                  <span className="text-[9px] text-slate-400 font-mono">
                    {storageStats.percentQuota}% quota
                  </span>
                </div>

                <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
                    Local Keys
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-base font-mono font-black text-emerald-600 dark:text-emerald-400">
                      {storageStats.keyCount}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">keys</span>
                  </div>
                  <span className="text-[9px] text-slate-400 font-mono">
                    {todos.length} active tasks
                  </span>
                </div>

                <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
                    Logs & History
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-base font-mono font-black text-amber-600 dark:text-amber-400">
                      {history.length}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">days</span>
                  </div>
                  <span className="text-[9px] text-slate-400 font-mono">
                    {xp.toLocaleString()} XP
                  </span>
                </div>

                <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
                    Cloud State
                  </span>
                  <div className="flex items-center gap-1 mt-1">
                    <div className={`w-1.5 h-1.5 rounded-full ${firebaseUser ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
                    <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 truncate">
                      {firebaseUser ? "Active" : "Guest"}
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-400 font-mono truncate block">
                    {firebaseUser?.email ? "Synced" : "Local"}
                  </span>
                </div>
              </div>

              {/* Deep Sync Status Banner */}
              <div
                className={`mt-3.5 p-3 rounded-xl border flex items-start gap-2.5 transition-colors text-xs ${
                  deepSyncLog.status === "syncing"
                    ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-700 dark:text-cyan-300"
                    : deepSyncLog.status === "success"
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                    : deepSyncLog.status === "error"
                    ? "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300"
                    : "bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {deepSyncLog.status === "syncing" && <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-500" />}
                  {deepSyncLog.status === "success" && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                  {deepSyncLog.status === "error" && <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />}
                  {deepSyncLog.status === "idle" && <Activity className="w-3.5 h-3.5 text-cyan-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold font-mono uppercase tracking-wider text-[10px]">
                      Sync Engine • {deepSyncLog.time}
                    </span>
                    <span className="font-mono text-[9px] opacity-75">
                      {deepSyncLog.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] font-medium leading-tight">{deepSyncLog.message}</p>
                </div>
              </div>

              {/* Storage Key Allocation Breakdown */}
              <div className="mt-3.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1">
                    <Layers className="w-3 h-3 text-cyan-500" />
                    Storage Allocation Breakdown
                  </span>
                </div>

                <div className="max-h-36 overflow-y-auto space-y-1 pr-1 border border-slate-200 dark:border-slate-800 rounded-xl p-2 bg-slate-50/50 dark:bg-slate-900/40">
                  {storageStats.items.slice(0, 8).map((item) => {
                    const maxBytes = storageStats.totalBytes || 1;
                    const ratio = Math.min(100, Math.max(4, (item.bytes / maxBytes) * 100));
                    return (
                      <div
                        key={item.key}
                        className="p-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 text-[11px] font-mono flex flex-col gap-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-700 dark:text-slate-300 truncate">
                            {item.label}
                          </span>
                          <span className="text-cyan-600 dark:text-cyan-400 font-bold shrink-0">
                            {item.kb} KB
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                            style={{ width: `${ratio}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Danger Zone: Protected Wipe */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-900">
              <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/5 space-y-2">
                <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                  <Lock className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider">
                    Protected Data Wipe (Hold 20s)
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal">
                  To prevent accidental wipes, press and hold the button below for 20 seconds to delete all local records.
                </p>

                <div className="relative overflow-hidden rounded-lg">
                  <div
                    className="absolute left-0 top-0 bottom-0 bg-rose-600 transition-all"
                    style={{ width: `${nukeProgress}%` }}
                  />
                  <button
                    type="button"
                    onMouseDown={startNukeTimer}
                    onMouseUp={cancelNukeTimer}
                    onMouseLeave={cancelNukeTimer}
                    onTouchStart={startNukeTimer}
                    onTouchEnd={cancelNukeTimer}
                    className="relative z-10 w-full py-2 text-center text-xs font-mono font-bold text-rose-600 dark:text-rose-400 hover:text-rose-500 active:text-white bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg transition-all select-none cursor-pointer"
                  >
                    {nukeProgress > 0
                      ? `HOLDING... ${Math.round(nukeProgress)}% (${Math.max(0, 20 - nukeProgress * 0.2).toFixed(1)}s)`
                      : "CLICK & HOLD TO WIPE DATA (20s)"}
                  </button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
});

export default Settings;
