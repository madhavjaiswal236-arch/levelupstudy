import React, { useState } from 'react';
import { Card } from '../components/ui/card';
import { Settings as SettingsIcon, Clock, Bell, User, Database, ChevronRight, LogOut, Trash2, Target, Terminal, RefreshCw } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export default function Settings() {
  const { 
    notificationSettings, setNotificationSettings,
    playerName, setPlayerName,
    dailyTarget, setDailyTarget, class11EndDate, setClass11EndDate, totalXpGoal, setTotalXpGoal, xp,
    resetApp, firebaseUser
  } = useAppContext();

  // These could be moved to AppContext later if we want them globally applied
  const [rolloverTime, setRolloverTime] = useState("03:00");
  const [pomoTime, setPomoTime] = useState(25);
  const [deepWorkTime, setDeepWorkTime] = useState(50);
  const [mainGoal, setMainGoal] = useState("Crack JEE 2026");

  const handleSave = () => {
    // Save to local storage for now
    localStorage.setItem('app_settings_extended', JSON.stringify({
      rolloverTime, pomoTime, deepWorkTime, mainGoal
    }));
    alert("Settings saved successfully!");
  };

  React.useEffect(() => {
    const saved = localStorage.getItem('app_settings_extended');
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
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">Settings</h1>
          <p className="text-slate-500 dark:text-slate-400">Tweak the system to your preference.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Identity & Goals */}
        <Card className="p-6 bg-white dark:bg-black border-slate-200 dark:border-slate-800 shadow-md rounded-2xl">
          <div className="flex items-center gap-2 mb-6">
            <User className="w-5 h-5 text-blue-500" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Identity & Goals</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Player Name</label>
              <input 
                type="text" 
                value={playerName || ""}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Main Objective</label>
              <input 
                type="text" 
                value={mainGoal || ""}
                onChange={(e) => setMainGoal(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Target End Date (Exam Date)</label>
              <input 
                type="date" 
                value={class11EndDate ? class11EndDate.split('T')[0] : ''}
                onChange={(e) => setClass11EndDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
              <p className="text-xs text-slate-500 mt-1">Daily Target is auto-calculated as 40% of the required daily XP to hit your goal.</p>
            </div>

          </div>
        </Card>

        
        {/* Goal Estimator */}
        <Card className="p-6 bg-white dark:bg-black border-slate-200 dark:border-slate-800 shadow-md rounded-2xl md:col-span-2">
          <div className="flex items-center gap-2 mb-6">
            <Target className="w-5 h-5 text-emerald-500" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Goal Estimator & Target Calibrator</h2>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Select your ultimate XP goal. We calculate the total hours of deep work required (assuming ~300 XP per hour). 
            Set your Target End Date in Identity to see your daily required hours.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[100000, 500000, 600000, 650000, 700000, 800000, 1000000].map(goalVal => {
              const remainingXp = Math.max(0, goalVal - (xp || 0));
              const totalHours = Math.ceil(remainingXp / 300);
              
              let dailyHoursStr = "";
              if (class11EndDate) {
                const end = new Date(class11EndDate).getTime();
                const days = Math.max(1, Math.ceil((end - Date.now()) / (1000 * 3600 * 24)));
                const daily = (totalHours / days).toFixed(1);
                dailyHoursStr = daily + " hrs/day";
              }

              return (
                <div 
                  key={goalVal}
                  onClick={() => setTotalXpGoal(goalVal)}
                  className={`p-4 rounded-xl cursor-pointer border transition-all ${totalXpGoal === goalVal ? 'bg-emerald-500/10 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-500/50'}`}
                >
                  <div className="text-lg font-black dark:text-white text-slate-900 mb-1">
                    {(goalVal / 1000)}k XP
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
            })}
          </div>
        </Card>


        {/* Timers & Schedule */}
        <Card className="p-6 bg-white dark:bg-black border-slate-200 dark:border-slate-800 shadow-md rounded-2xl">
          <div className="flex items-center gap-2 mb-6">
            <Clock className="w-5 h-5 text-purple-500" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Schedule & Timers</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Day Rollover Time (24h)</label>
              <input 
                type="time" 
                value={rolloverTime || ""}
                onChange={(e) => setRolloverTime(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 transition-colors"
              />
              <p className="text-xs text-slate-500 mt-1">Default is 03:00 AM.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Pomodoro (mins)</label>
                <input 
                  type="number" 
                  value={pomoTime}
                  onChange={(e) => setPomoTime(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Deep Work (mins)</label>
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
        <Card className="p-6 bg-white dark:bg-black border-slate-200 dark:border-slate-800 shadow-md rounded-2xl">
          <div className="flex items-center gap-2 mb-6">
            <Bell className="w-5 h-5 text-amber-500" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Notifications</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Task Reminders</p>
                <p className="text-xs text-slate-500">Alerts when tasks are pending</p>
              </div>
              <div 
                className={`w-12 h-6 rounded-full cursor-pointer transition-colors relative ${notificationSettings.taskReminders ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                onClick={() => setNotificationSettings(prev => ({ ...prev, taskReminders: !prev.taskReminders }))}
              >
                <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${notificationSettings.taskReminders ? 'left-7' : 'left-1'}`} />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Motivational Alerts</p>
                <p className="text-xs text-slate-500">Tough-love check-ins</p>
              </div>
              <div 
                className={`w-12 h-6 rounded-full cursor-pointer transition-colors relative ${notificationSettings.motivationalAlerts ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                onClick={() => setNotificationSettings(prev => ({ ...prev, motivationalAlerts: !prev.motivationalAlerts }))}
              >
                <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${notificationSettings.motivationalAlerts ? 'left-7' : 'left-1'}`} />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Sound Effects</p>
                <p className="text-xs text-slate-500">In-app audio cues</p>
              </div>
              <div 
                className={`w-12 h-6 rounded-full cursor-pointer transition-colors relative ${notificationSettings.soundEnabled ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                onClick={() => setNotificationSettings(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }))}
              >
                <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${notificationSettings.soundEnabled ? 'left-7' : 'left-1'}`} />
              </div>
            </div>
          </div>
        </Card>

        {/* Data & Account */}
        <Card className="p-6 bg-white dark:bg-black border-slate-200 dark:border-slate-800 shadow-md rounded-2xl">
          <div className="flex items-center gap-2 mb-6">
            <Database className="w-5 h-5 text-red-500" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Data & Account</h2>
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
                if (confirm("Are you sure you want to hard reset the app? This will wipe ALL your local data and progress!")) {
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
}
