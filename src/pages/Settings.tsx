import React, { useState } from "react";
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
} from "lucide-react";
import { useAppContext, PlayHistoryEntry } from "../context/AppContext";
import {
  getLevelFromXp,
  getXpForLevel,
  getRankInfo,
  getLevelProgress,
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
  } = useAppContext();

  const [permStatus, setPermStatus] = useState<string | null>(null);
  const [isRestoringCloud, setIsRestoringCloud] = useState(false);
  const [cloudStatusMsg, setCloudStatusMsg] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [isSavingCloud, setIsSavingCloud] = useState(false);
  const [nukeProgress, setNukeProgress] = useState(0);
  const nukeTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // XP and Level Editor State
  const [customXp, setCustomXp] = useState<number>(xp || 0);
  const [customLevel, setCustomLevel] = useState<number>(level || 1);
  const [autoComputeLevel, setAutoComputeLevel] = useState<boolean>(true);
  const [xpFeedback, setXpFeedback] = useState<string | null>(null);

  // Keep local editor in sync with context
  React.useEffect(() => {
    setCustomXp(xp || 0);
    setCustomLevel(level || 1);
  }, [xp, level]);

  const handleXpChange = (val: number) => {
    const safeXp = Math.max(0, Math.floor(val || 0));
    setCustomXp(safeXp);
    if (autoComputeLevel) {
      const calculatedLvl = getLevelFromXp(safeXp, totalXpGoal);
      setCustomLevel(calculatedLvl);
    }
  };

  const handleLevelChange = (val: number) => {
    const safeLvl = Math.max(1, Math.min(100, Math.floor(val || 1)));
    setCustomLevel(safeLvl);
    if (autoComputeLevel) {
      const neededXp = getXpForLevel(safeLvl, totalXpGoal);
      setCustomXp(neededXp);
    }
  };

  const handleSaveXpLevel = async () => {
    setXp(customXp);
    setLevel(customLevel);
    setXpFeedback(`Saved: ${customXp.toLocaleString()} XP • Level ${customLevel}`);
    if (firebaseUser) {
      saveStateToCloudNow();
    }
    setTimeout(() => setXpFeedback(null), 3500);
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

  // Progress Stats Editor State

  // History Editor State

  const [histSavedMsg, setHistSavedMsg] = useState(false);

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

  // These could be moved to AppContext later if we want them globally applied
  const [rolloverTime, setRolloverTime] = useState("03:00");
  const [pomoTime, setPomoTime] = useState(25);
  const [deepWorkTime, setDeepWorkTime] = useState(50);
  const [mainGoal, setMainGoal] = useState("Crack JEE 2026");

  const handleSave = () => {
    // Save to local storage for now
    localStorage.setItem(
      "app_settings_extended",
      JSON.stringify({
        rolloverTime,
        pomoTime,
        deepWorkTime,
        mainGoal,
      }),
    );
    alert("Settings saved successfully!");
  };

  React.useEffect(() => {
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
    <div className="w-full max-w-4xl mx-auto pb-24 md:pb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-slate-200 dark:bg-slate-800 rounded-xl">
          <SettingsIcon className="w-8 h-8 text-slate-700 dark:text-slate-300" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">
            Settings
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Tweak the system to your preference.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Identity & Goals */}
        <Card className="p-6 bg-white dark:bg-black border-slate-200 dark:border-slate-800 shadow-md rounded-2xl">
          <div className="flex items-center gap-2 mb-6">
            <User className="w-5 h-5 text-blue-500" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Identity & Goals
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
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
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Main Objective
              </label>
              <input
                type="text"
                value={mainGoal || ""}
                onChange={(e) => setMainGoal(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Target End Date (Exam Date)
              </label>
              <input
                type="date"
                value={class11EndDate ? class11EndDate.split("T")[0] : ""}
                onChange={(e) => setClass11EndDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
              <p className="text-xs text-slate-500 mt-1">
                Daily Target is auto-calculated as 40% of the required daily XP
                to hit your goal.
              </p>
            </div>
          </div>
        </Card>

        {/* XP & Level Calibration Editor */}
        <Card className="p-6 bg-white dark:bg-black border-slate-200 dark:border-slate-800 shadow-md rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                XP & Level Editor
              </h2>
            </div>
            {xpFeedback ? (
              <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-mono font-bold rounded-lg flex items-center gap-1 animate-pulse">
                <Check className="w-3.5 h-3.5" />
                {xpFeedback}
              </span>
            ) : (
              <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs font-mono font-bold rounded-lg flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                Stat Calibration
              </span>
            )}
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Directly customize your player XP and Level to fix desyncs or test ranks.
          </p>

          {/* Current Rank Badge Preview */}
          {(() => {
            const rank = getRankInfo(customLevel);
            const progress = getLevelProgress(customXp, customLevel, totalXpGoal);
            return (
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 mb-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-md text-xs font-black uppercase font-mono border ${rank.bg} ${rank.color} ${rank.border}`}>
                      Rank {rank.rank}
                    </span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {rank.title}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400 font-bold">
                    {progress.toFixed(1)}% to Lvl {Math.min(100, customLevel + 1)}
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 via-cyan-500 to-emerald-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            );
          })()}

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span>Total XP Points</span>
                  <span className="text-[10px] text-amber-500 font-mono">
                    {customXp.toLocaleString()} XP
                  </span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="5000000"
                  step="50"
                  value={customXp}
                  onChange={(e) => handleXpChange(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-white font-mono font-bold text-sm focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span>Player Level (1-100)</span>
                  <span className="text-[10px] text-cyan-500 font-mono">
                    Lvl {customLevel}
                  </span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={customLevel}
                  onChange={(e) => handleLevelChange(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-white font-mono font-bold text-sm focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>
            </div>

            {/* Auto-calculate toggle */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-xs">
                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                  Auto-link XP & Level
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  {autoComputeLevel ? "XP and Level stay mathematically aligned" : "Allows setting arbitrary Level and XP separately"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAutoComputeLevel(!autoComputeLevel)}
                className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ${
                  autoComputeLevel ? "bg-cyan-500" : "bg-slate-300 dark:bg-slate-700"
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-all ${
                    autoComputeLevel ? "left-5" : "left-1"
                  }`}
                />
              </button>
            </div>

            {/* Quick XP modifiers */}
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 font-mono">
                Quick XP Adjust
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: "+1k", val: 1000 },
                  { label: "+5k", val: 5000 },
                  { label: "+25k", val: 25000 },
                  { label: "+100k", val: 100000 },
                  { label: "-1k", val: -1000 },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => handleXpChange(customXp + item.val)}
                    className="px-2.5 py-1 text-xs font-mono font-bold bg-slate-100 dark:bg-slate-900 hover:bg-amber-500/10 hover:text-amber-500 hover:border-amber-500/40 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
                  >
                    {item.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleXpChange(0)}
                  className="px-2.5 py-1 text-xs font-mono font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 rounded-lg transition-colors ml-auto"
                >
                  Reset 0
                </button>
              </div>
            </div>

            {/* Quick Level Presets */}
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 font-mono">
                Level Presets
              </span>
              <div className="grid grid-cols-6 gap-1.5">
                {[1, 10, 25, 50, 75, 100].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => handleLevelChange(lvl)}
                    className={`py-1 text-xs font-mono font-bold rounded-lg border transition-all ${
                      customLevel === lvl
                        ? "bg-cyan-500/20 text-cyan-400 border-cyan-500"
                        : "bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-cyan-500/40 hover:text-cyan-400"
                    }`}
                  >
                    L{lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Save Button */}
            <button
              type="button"
              onClick={handleSaveXpLevel}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-black text-xs py-2.5 rounded-xl transition-all shadow-md active:scale-98 font-mono uppercase tracking-wider"
            >
              <Save className="w-4 h-4" />
              Apply & Save XP / Level
            </button>
          </div>
        </Card>

        {/* Goal Estimator */}
        <Card className="p-6 bg-white dark:bg-black border-slate-200 dark:border-slate-800 shadow-md rounded-2xl md:col-span-2">
          <div className="flex items-center gap-2 mb-6">
            <Target className="w-5 h-5 text-emerald-500" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Goal Estimator & Target Calibrator
            </h2>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Select your ultimate XP goal. We calculate the total hours of deep
            work required (assuming ~300 XP per hour). Set your Target End Date
            in Identity to see your daily required hours.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[100000, 500000, 600000, 650000, 700000, 800000, 1000000].map(
              (goalVal) => {
                const remainingXp = Math.max(0, goalVal - (xp || 0));
                const totalHours = Math.ceil(remainingXp / 300);

                let dailyHoursStr = "";
                if (class11EndDate) {
                  const end = new Date(class11EndDate).getTime();
                  const days = Math.max(
                    1,
                    Math.ceil((end - Date.now()) / (1000 * 3600 * 24)),
                  );
                  const daily = (totalHours / days).toFixed(1);
                  dailyHoursStr = daily + " hrs/day";
                }

                return (
                  <div
                    key={goalVal}
                    onClick={() => setTotalXpGoal(goalVal)}
                    className={`p-4 rounded-xl cursor-pointer border transition-all ${totalXpGoal === goalVal ? "bg-emerald-500/10 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]" : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-500/50"}`}
                  >
                    <div className="text-lg font-black dark:text-white text-slate-900 mb-1">
                      {goalVal / 1000}k XP
                    </div>
                    <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      {totalHours} hrs total
                    </div>
                    {dailyHoursStr && (
                      <div className="text-xs text-slate-500 mt-2 font-mono">
                        {dailyHoursStr}
                      </div>
                    )}
                  </div>
                );
              },
            )}
          </div>
        </Card>

        {/* Timers & Schedule */}
        <Card className="p-6 bg-white dark:bg-black border-slate-200 dark:border-slate-800 shadow-md rounded-2xl">
          <div className="flex items-center gap-2 mb-6">
            <Clock className="w-5 h-5 text-purple-500" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Schedule & Timers
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Day Rollover Time (24h)
              </label>
              <input
                type="time"
                value={rolloverTime || ""}
                onChange={(e) => setRolloverTime(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 transition-colors"
              />
              <p className="text-xs text-slate-500 mt-1">
                Default is 03:00 AM.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Pomodoro (mins)
                </label>
                <input
                  type="number"
                  value={pomoTime}
                  onChange={(e) => setPomoTime(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Deep Work (mins)
                </label>
                <input
                  type="number"
                  value={deepWorkTime}
                  onChange={(e) => setDeepWorkTime(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Notifications */}
        <Card className="p-6 bg-white dark:bg-black border-slate-200 dark:border-slate-800 shadow-md rounded-2xl md:col-span-2">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Bell className="w-6 h-6 text-amber-500 animate-bounce" />
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Smart Notification System
                </h2>
                <p className="text-xs text-slate-500">
                  Configure task reminders, study blocks, rival alerts &
                  motivation pools
                </p>
              </div>
            </div>

            <button
              onClick={handleRequestPermissions}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-black rounded-xl text-xs flex items-center gap-2 shadow-lg transition-transform active:scale-95"
            >
              <Bell className="w-4 h-4" />
              Enable System & Push Permissions
            </button>
          </div>

          {/* Chrome Desktop Notification Status Banner */}
          <div className="mb-6 p-4 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Globe className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">
                    Chrome Desktop System Popups:
                  </span>
                  {getChromeNotificationPermissionState() === "granted" ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold text-[10px]">
                      ENABLED (Granted)
                    </span>
                  ) : getChromeNotificationPermissionState() === "denied" ? (
                    <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 font-bold text-[10px]">
                      BLOCKED IN CHROME
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 font-bold text-[10px]">
                      PERMISSION REQUIRED
                    </span>
                  )}
                </div>
                <p className="text-slate-400 mt-1 leading-relaxed">
                  Sends native OS desktop popups & audio chimes when study
                  blocks start, tasks are due, or streak warnings trigger even
                  if the tab is in the background.
                </p>
                {isInIframe() && (
                  <p className="text-amber-400/90 mt-1 font-medium text-[11px]">
                    💡 Running in AI Studio preview iframe: Chrome requires
                    opening in a dedicated tab for desktop popups.
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {isInIframe() && (
                <button
                  type="button"
                  onClick={() => window.open(window.location.href, "_blank")}
                  className="px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open in New Tab
                </button>
              )}
              <button
                type="button"
                onClick={handleRequestPermissions}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-black rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors"
              >
                <Bell className="w-3.5 h-3.5" />
                Allow Popups
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-4">
              <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold border-b border-slate-800 pb-1">
                Alert Categories
              </h3>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <div>
                  <p className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Task & Objective Reminders
                  </p>
                  <p className="text-xs text-slate-500">
                    High-priority task alerts & start reminders
                  </p>
                </div>
                <div
                  className={`w-12 h-6 rounded-full cursor-pointer transition-colors relative shrink-0 ${notificationSettings.taskReminders ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-700"}`}
                  onClick={() =>
                    setNotificationSettings((prev) => ({
                      ...prev,
                      taskReminders: !prev.taskReminders,
                    }))
                  }
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${notificationSettings.taskReminders ? "left-7" : "left-1"}`}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <div>
                  <p className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    Motivational & Rival Alerts
                  </p>
                  <p className="text-xs text-slate-500">
                    Competitor check-ins & tough-love boosts
                  </p>
                </div>
                <div
                  className={`w-12 h-6 rounded-full cursor-pointer transition-colors relative shrink-0 ${notificationSettings.motivationalAlerts ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-700"}`}
                  onClick={() =>
                    setNotificationSettings((prev) => ({
                      ...prev,
                      motivationalAlerts: !prev.motivationalAlerts,
                    }))
                  }
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${notificationSettings.motivationalAlerts ? "left-7" : "left-1"}`}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <div>
                  <p className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-cyan-400" />
                    Study Block Launch & Midway Alerts
                  </p>
                  <p className="text-xs text-slate-500">
                    Notifications at block start, halfway, & finish
                  </p>
                </div>
                <div
                  className={`w-12 h-6 rounded-full cursor-pointer transition-colors relative shrink-0 ${notificationSettings.studyBlockReminders ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-700"}`}
                  onClick={() =>
                    setNotificationSettings((prev) => ({
                      ...prev,
                      studyBlockReminders: !prev.studyBlockReminders,
                    }))
                  }
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${notificationSettings.studyBlockReminders ? "left-7" : "left-1"}`}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <div>
                  <p className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <Flame className="w-4 h-4 text-amber-500" />
                    Streak Shield Protection Alerts
                  </p>
                  <p className="text-xs text-slate-500">
                    Urgent warnings at 2 PM, 6 PM, 9 PM if hours low
                  </p>
                </div>
                <div
                  className={`w-12 h-6 rounded-full cursor-pointer transition-colors relative shrink-0 ${notificationSettings.streakProtectionAlerts ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-700"}`}
                  onClick={() =>
                    setNotificationSettings((prev) => ({
                      ...prev,
                      streakProtectionAlerts: !prev.streakProtectionAlerts,
                    }))
                  }
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${notificationSettings.streakProtectionAlerts ? "left-7" : "left-1"}`}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <div>
                  <p className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-purple-400" />
                    Audio Cues & Haptic Vibrations
                  </p>
                  <p className="text-xs text-slate-500">
                    In-app audio chimes & mobile haptics
                  </p>
                </div>
                <div
                  className={`w-12 h-6 rounded-full cursor-pointer transition-colors relative shrink-0 ${notificationSettings.soundEnabled ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-700"}`}
                  onClick={() =>
                    setNotificationSettings((prev) => ({
                      ...prev,
                      soundEnabled: !prev.soundEnabled,
                    }))
                  }
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${notificationSettings.soundEnabled ? "left-7" : "left-1"}`}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold border-b border-slate-800 pb-1">
                Notification Density & Testing
              </h3>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-amber-500" />
                  Frequency / Pacing
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      id: "high",
                      label: "High Intensity",
                      desc: "Every 20-30 mins",
                    },
                    {
                      id: "balanced",
                      label: "Balanced",
                      desc: "Every 45-60 mins",
                    },
                    { id: "gentle", label: "Gentle", desc: "Every 2+ hours" },
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
                      className={`p-3 rounded-xl border text-left transition-all ${notificationSettings.frequency === item.id ? "bg-amber-500/10 border-amber-500 text-amber-300 font-black shadow-md" : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 hover:border-slate-700"}`}
                    >
                      <div className="text-xs font-bold">{item.label}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {item.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <p className="text-xs font-bold text-slate-300 mb-2">
                  Live Test Trigger Console
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => triggerMotivationNotification()}
                    className="p-2.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Zap className="w-3.5 h-3.5 shrink-0" />
                    Test Motivation
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const urgent = todos.find((t) => !t.completed);
                      triggerTaskReminder(
                        urgent ? urgent.text : "Solve 10 Physics PYQs",
                        todos.filter((t) => !t.completed).length || 3,
                      );
                    }}
                    className="p-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    Test Task Alert
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      triggerStudyBlockNotification("Mathematics", "start")
                    }
                    className="p-2.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    Test Study Block
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      triggerStreakProtectionAlert(
                        streakDays || 5,
                        hoursStudiedToday || 0,
                      )
                    }
                    className="p-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Flame className="w-3.5 h-3.5 shrink-0" />
                    Test Streak Shield
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Data Persistence, Cloud Restore & Account */}
        <Card className="p-6 bg-white dark:bg-black border-slate-200 dark:border-slate-800 shadow-md rounded-2xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-cyan-500" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Cloud Sync & Data Persistence
              </h2>
            </div>
            {firebaseUser ? (
              <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-mono font-bold rounded-full flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {firebaseUser.email || "Cloud Connected"}
              </span>
            ) : (
              <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs font-mono font-bold rounded-full">
                Offline / Local Storage
              </span>
            )}
          </div>

          <div className="space-y-5">
            {/* Status Toast / Alert if any */}
            {cloudStatusMsg && (
              <div
                className={`p-4 rounded-xl text-sm font-medium border flex items-start gap-3 ${
                  cloudStatusMsg.type === "success"
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                    : cloudStatusMsg.type === "error"
                    ? "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
                    : "bg-cyan-500/10 border-cyan-500/30 text-cyan-600 dark:text-cyan-400"
                }`}
              >
                {cloudStatusMsg.type === "success" ? (
                  <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="font-bold">{cloudStatusMsg.type === "success" ? "Success" : "Notice"}</p>
                  <p className="text-xs opacity-90 mt-0.5">{cloudStatusMsg.text}</p>
                </div>
              </div>
            )}

            {/* Cloud Restore & Sync Actions */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <CloudDownload className="w-4 h-4 text-cyan-500" />
                    Restore Data Directly From Cloud
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Fetches your full state (XP, Level, Tasks, History, Syllabus) from Firestore and merges safely.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  onClick={handleForceRestore}
                  disabled={isRestoringCloud || !firebaseUser}
                  className="w-full flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-xl transition-all shadow-md text-xs font-mono"
                >
                  {isRestoringCloud ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CloudDownload className="w-4 h-4" />
                  )}
                  {isRestoringCloud ? "Fetching Firestore..." : "Fetch & Restore From Cloud"}
                </button>

                <button
                  onClick={handlePushToCloud}
                  disabled={isSavingCloud || !firebaseUser}
                  className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-xl transition-all border border-slate-700 text-xs font-mono"
                >
                  {isSavingCloud ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CloudUpload className="w-4 h-4" />
                  )}
                  {isSavingCloud ? "Saving to Cloud..." : "Sync Local State to Cloud"}
                </button>
              </div>
            </div>

            {/* Offline JSON Backup & Recovery */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-500" />
                  Offline Local Backup (.json)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Export or import an encrypted snapshot of all your local tasks, syllabus masteries, and XP.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  onClick={exportLocalBackup}
                  className="w-full flex items-center justify-center gap-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 font-bold py-2.5 px-4 rounded-xl transition-all border border-purple-500/20 text-xs font-mono"
                >
                  <Download className="w-4 h-4" />
                  Download Backup (.json)
                </button>

                <label className="w-full flex items-center justify-center gap-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 font-bold py-2.5 px-4 rounded-xl transition-all border border-purple-500/20 text-xs font-mono cursor-pointer">
                  <Upload className="w-4 h-4" />
                  Restore From JSON File
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

            {/* General Actions */}
            <div className="space-y-3 pt-2">
              <button
                onClick={handleSave}
                className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold py-3 rounded-xl hover:opacity-90 transition-opacity shadow-md text-sm"
              >
                Save Configuration
              </button>

              <button
                onClick={() => {
                  localStorage.removeItem("welcome_hero_dismissed_forever");
                  window.location.reload();
                }}
                className="w-full flex items-center justify-center gap-2 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold py-3 rounded-xl hover:bg-cyan-500/20 transition-colors border border-cyan-500/20 shadow-sm text-sm"
              >
                <RefreshCw className="w-4 h-4 animate-spin-slow" />
                Return to Welcome Screen
              </button>

              {/* Secure Click & Hold Nuke Button */}
              <div className="pt-2">
                <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/5 space-y-3">
                  <div className="flex items-center gap-2 text-rose-500">
                    <Lock className="w-4 h-4" />
                    <span className="text-xs font-mono font-bold uppercase tracking-wider">
                      Protected Data Destruction (Hold To Wipe)
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    To prevent accidental data loss, local data cannot be deleted with a single click. Click and hold the button below for 20 seconds to permanently wipe local storage.
                  </p>

                  <div className="relative overflow-hidden rounded-xl">
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
                      className="relative z-10 w-full py-3 text-center text-xs font-mono font-bold text-rose-500 hover:text-rose-400 active:text-white bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl transition-all select-none"
                    >
                      {nukeProgress > 0
                        ? `HOLDING... ${Math.round(nukeProgress)}% (${Math.max(0, 20 - nukeProgress * 0.2).toFixed(1)}s remaining)`
                        : "CLICK & HOLD TO NUKE ALL DATA (20s)"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
});

export default Settings;
