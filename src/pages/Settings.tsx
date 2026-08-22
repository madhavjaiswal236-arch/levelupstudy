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
} from "lucide-react";
import { useAppContext, PlayHistoryEntry } from "../context/AppContext";
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
  } = useAppContext();

  const [permStatus, setPermStatus] = useState<string | null>(null);

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
      } catch (e) {}
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

        {/* Data & Account */}
        <Card className="p-6 bg-white dark:bg-black border-slate-200 dark:border-slate-800 shadow-md rounded-2xl">
          <div className="flex items-center gap-2 mb-6">
            <Database className="w-5 h-5 text-red-500" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Data & Account
            </h2>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleSave}
              className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold py-3 rounded-xl hover:opacity-90 transition-opacity shadow-md"
            >
              Save Configuration
            </button>

            <button
              onClick={() => {
                localStorage.removeItem("welcome_hero_dismissed_forever");
                window.location.reload();
              }}
              className="w-full flex items-center justify-center gap-2 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold py-3 rounded-xl hover:bg-cyan-500/20 transition-colors border border-cyan-500/20 shadow-sm"
            >
              <RefreshCw className="w-4 h-4 animate-spin-slow" />
              Return to Welcome Screen
            </button>

            <button
              onClick={() => {
                if (
                  confirm(
                    "Are you sure you want to hard reset the app? This will wipe ALL your local data and progress!",
                  )
                ) {
                  resetApp();
                }
              }}
              className="w-full flex items-center justify-center gap-2 bg-red-500/10 text-red-600 dark:text-red-400 font-bold py-3 rounded-xl hover:bg-red-500/20 transition-colors border border-red-500/20 shadow-sm"
            >
              <Trash2 className="w-4 h-4" />
              Hard Reset App Data
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
});

export default Settings;
