import { motion, AnimatePresence } from 'motion/react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { TiltWrapper } from '../components/TiltWrapper';
import { useAppContext, PlayHistoryEntry, Todo } from '../context/AppContext';
import { Calendar, Clock, Target, Zap, CheckCircle2, ChevronRight, Monitor, Activity, TrendingUp, Cpu, Award, ShieldAlert, Sparkles, Flame, Loader2, BrainCircuit } from 'lucide-react';
import { TourStep, useTour } from '../components/TourGuide';
import { useState, useEffect, useMemo } from 'react';

// Daily Rating System Helper
const getDailyRating = (hoursStudied: number) => {
 if (hoursStudied >= 8) return { rank: 'S', label: 'S Tier (Perfect)', color: 'dark:text-yellow-400 text-yellow-700 font-black drop-shadow-md', bg: 'bg-yellow-400/10', border: 'border-yellow-400/50' };
 if (hoursStudied >= 6) return { rank: 'A', label: 'A Tier', color: 'dark:text-cyan-400 text-cyan-700 font-bold', bg: 'bg-cyan-400/10', border: 'border-cyan-400/30' };
 if (hoursStudied >= 3) return { rank: 'B', label: 'B Tier', color: 'dark:text-emerald-400 text-emerald-700 font-bold', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30' };
 return { rank: 'F', label: 'Missed', color: 'dark:text-rose-400 text-rose-700 font-bold', bg: 'bg-rose-500/10', border: 'border-rose-500/30' };
};

export default function History() {
 const { history, xp, level, streakDays, isLoaded, hoursStudiedToday, loggedTasksToday, practiceSessions } = useAppContext();
 const { activeStep, setActiveStep, hasCompleted } = useTour();
 
 const [selectedTask, setSelectedTask] = useState<Todo | null>(null);
 const [expandedArchiveDates, setExpandedArchiveDates] = useState<string[]>([]);

 useEffect(() => {
 if (isLoaded && !hasCompleted('history-intro') && activeStep === null) {
 setTimeout(() => setActiveStep('history-intro'), 500);
 }
 }, [isLoaded, hasCompleted, activeStep, setActiveStep]);

 const reversedHistory = [...history].reverse();
 
 const today = new Date();
 const todayStr = today.toDateString();
 
 const yesterday = new Date(today);
 yesterday.setDate(yesterday.getDate() - 1);
 const yesterdayStr = yesterday.toDateString();

 const dayBefore = new Date(today);
 dayBefore.setDate(dayBefore.getDate() - 2);
 const dayBeforeStr = dayBefore.toDateString();

 const recentHistory = reversedHistory.filter(entry => {
 const entryDateStr = new Date(entry.date).toDateString();
 return entryDateStr === todayStr || entryDateStr === yesterdayStr || entryDateStr === dayBeforeStr;
 });

 const archivedHistory = reversedHistory.filter(entry => {
 const entryDateStr = new Date(entry.date).toDateString();
 return entryDateStr !== todayStr && entryDateStr !== yesterdayStr && entryDateStr !== dayBeforeStr;
 });

 const latestEntry = reversedHistory[0] || null;
  const latestWithFeedback = reversedHistory.find(e => e.aiFeedback) || latestEntry;

 const yesterdayEntry = reversedHistory.find(entry => new Date(entry.date).toDateString() === yesterdayStr) || null;

 const toggleArchive = (dateStr: string) => {
 setExpandedArchiveDates(prev => prev.includes(dateStr) ? prev.filter(d => d !== dateStr) : [...prev, dateStr]);
 };

 const currentLevelStartXp = Math.floor(800000 * Math.pow((level - 1) / 99, 2));
  const nextLevelStartXp = Math.floor(800000 * Math.pow(level / 99, 2));
  const xpInCurrentLevel = xp - currentLevelStartXp;
  const xpNeededForNextLevel = nextLevelStartXp - currentLevelStartXp;
  const levelProgress = level === 100 ? 100 : Math.min(100, Math.max(0, (xpInCurrentLevel / xpNeededForNextLevel) * 100));

 const containerVariants = {
 hidden: { opacity: 0 },
 show: { opacity: 1, transition: { staggerChildren: 0.1 } }
 };

 const itemVariants = {
 hidden: { opacity: 0, y: 30, scale: 0.9 },
 show: { 
 opacity: 1, 
 y: 0, 
 scale: 1, 
 transition: { 
 type: 'spring' as const, 
 stiffness: 150, 
 damping: 12, 
 bounce: 0.4 
 } 
 }
 };

 // Calculate 10-day stats
 const last10Days = history.slice(-10);
 const tenDaysHours = last10Days.reduce((acc, curr) => acc + curr.hoursStudied, 0);
 const tenDaysXp = last10Days.reduce((acc, curr) => acc + curr.xpEarned, 0);
 const consistentDays = last10Days.filter(day => day.hoursStudied >= 3).length;

 const totalHours = history.reduce((acc, curr) => acc + curr.hoursStudied, 0);
 const totalCompleted = history.reduce((acc, curr) => acc + curr.completedTasks.length, 0);

 // Recovery Mode logic
 const last3Days = history.slice(-3);
 const needsRecovery = last3Days.length === 3 && last3Days.every(d => d.hoursStudied < 3);

 // Behavior Pattern Detection
  const getInsights = () => {
    if (last10Days.length < 3) {
      return [{
        title: "Data Collection Phase",
        metric: "Insufficient Data",
        description: "Log at least 3 days of combat history to unlock the neural pattern matrix.",
        type: "neutral"
      }];
    }
    const insights = [];
    const avgSleep = last10Days.reduce((acc, d) => acc + d.sleepTime, 0) / last10Days.length;
    const avgHours = last10Days.reduce((acc, d) => acc + d.hoursStudied, 0) / last10Days.length;
    const daysUnder6hSleep = last10Days.filter(d => d.sleepTime < 6);
    if (avgSleep < 6) {
      const hoursWhenSleepDeprived = daysUnder6hSleep.reduce((acc, d) => acc + d.hoursStudied, 0) / (daysUnder6hSleep.length || 1);
      insights.push({
        title: "Sleep Debt Bottleneck",
        metric: `${avgSleep.toFixed(1)}h Avg Sleep`,
        description: `Severe sleep deprivation is bleeding your output. On low-sleep days, your average output drops to ${hoursWhenSleepDeprived.toFixed(1)}h.`,
        type: "danger"
      });
    }
    const daysMap = { "Monday": 0, "Tuesday": 0, "Wednesday": 0, "Thursday": 0, "Friday": 0, "Saturday": 0, "Sunday": 0 };
    const daysCount = { "Monday": 0, "Tuesday": 0, "Wednesday": 0, "Thursday": 0, "Friday": 0, "Saturday": 0, "Sunday": 0 };
    last10Days.forEach(d => {
      const dayName = new Date(d.date).toLocaleDateString("en-US", { weekday: "long" }) as keyof typeof daysMap;
      if (daysMap[dayName] !== undefined) {
        daysMap[dayName] += d.hoursStudied;
        daysCount[dayName] += 1;
      }
    });
    let bestDay = "Monday", worstDay = "Monday";
    let bestAvg = -1, worstAvg = 999;
    Object.keys(daysMap).forEach(day => {
      const db = day as keyof typeof daysMap;
      if (daysCount[db] > 0) {
        const avg = daysMap[db] / daysCount[db];
        if (avg > bestAvg) { bestAvg = avg; bestDay = db; }
        if (avg < worstAvg) { worstAvg = avg; worstDay = db; }
      }
    });
    if (bestAvg > avgHours + 1 && bestAvg > 4) {
      insights.push({
        title: "Peak Momentum",
        metric: `${bestDay}s`,
        description: `You are consistently pulling your highest output (${bestAvg.toFixed(1)}h) on ${bestDay}s. Capitalize on this by scheduling your hardest subjects here.`,
        type: "positive"
      });
    }
    if (worstAvg < avgHours - 1 && worstAvg < 3 && daysCount[worstDay as keyof typeof daysCount] > 1) {
      insights.push({
        title: "Vulnerability Window",
        metric: `${worstDay}s`,
        description: `Your execution collapses on ${worstDay}s (Avg: ${worstAvg.toFixed(1)}h). Pre-plan a lighter, high-success-rate schedule to break the friction.`,
        type: "warning"
      });
    }
    const zeroDays = last10Days.filter(d => d.hoursStudied === 0).length;
    if (zeroDays > 0) {
      insights.push({
        title: "Zero-Day Bleed",
        metric: `${zeroDays} Missed`,
        description: `You had ${zeroDays} zero-output days recently. A 0h day kills compounding gains. Lower the bar, do 1h, but never zero.`,
        type: "danger"
      });
    } else if (last10Days.length >= 7) {
      insights.push({
        title: "Unbreakable Chain",
        metric: "No Zero Days",
        description: `Zero missed days in the matrix. You have established a concrete baseline of consistency.`,
        type: "positive"
      });
    }
    const highScreenLowOutput = last10Days.filter(d => d.screenTime > 4 && d.hoursStudied < 3).length;
    if (highScreenLowOutput >= 2) {
      insights.push({
        title: "Dopamine Leak",
        metric: `${highScreenLowOutput} Drift Days`,
        description: `High screen time is directly sabotaging your study hours. Leave the phone outside the room for the first 90-minute block.`,
        type: "warning"
      });
    }
    if (insights.length === 0) {
      insights.push({
        title: "Stable Orbit",
        metric: "Baseline Output",
        description: `Your study patterns are stable but lack extreme high-leverage days. Consider pushing a single "Apex Day" this week.`,
        type: "neutral"
      });
    }
    return insights;
  };

 const insights = getInsights();

 // Boss Day Logic (Every 7th day)
 const isBossDay = history.length > 0 && Math.floor((new Date().getTime() - new Date(history[0].date).getTime()) / (1000 * 60 * 60 * 24)) % 7 === 6;

 // Emulated User streak count
 const streakForBadges = consistentDays; // Fallback to consistentDays if context streak isn't robust
 
 return (
 <div className="w-full h-full p-4 md:p-8 overflow-y-auto pb-32">
 <motion.div variants={containerVariants} initial="hidden" animate="show" className="max-w-6xl mx-auto space-y-8">
 
 <TourStep
 id="history-intro"
 title="Combat Log & Analytics"
 description="View your past study sessions and get AI-powered insights on your study habits based on your historical data."
 position="bottom"
 >
 <header className="mb-8">
 <h1 className="text-3xl font-black dark:text-white text-slate-900 uppercase tracking-widest flex items-center gap-3">
 <motion.div whileHover={{ scale: 1.2, rotate: -15 }} className="relative z-10">
 <div className="absolute inset-0 bg-cyan-400/30 rounded-full  opacity-50" />
 <Calendar className="w-8 h-8 dark:text-cyan-400 text-cyan-700 relative z-10 drop-shadow-md" />
 </motion.div>
 Combat Log
 </h1>
 <p className="dark:text-slate-400 text-slate-600 mt-2 font-mono text-sm max-w-xl">
 Review past operational performance. Data dictates future strategy. Consistency is the only path to mastery.
 </p>
 </header>
 </TourStep>

 {/* Momentum & Boss Day Metrics Row */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <motion.div variants={itemVariants}>
 <TiltWrapper tiltAmount={2}>
 <Card className="dark:bg-black bg-slate-50 border dark:border-slate-800 border-slate-200 p-6 relative overflow-hidden">
 <div className="absolute top-0 right-0 p-4 opacity-5"><TrendingUp className="w-24 h-24" /></div>
 <h3 className="text-sm font-bold dark:text-cyan-400 text-cyan-700 uppercase tracking-wider mb-2 flex items-center gap-2 group/meter w-max">
 <motion.div whileHover={{ scale: 1.3, rotate: 15 }} className="relative">
 <Activity className="w-4 h-4 group-hover/meter:drop-shadow-md transition-all" />
 </motion.div> Momentum Meter
 </h3>
 <div className="flex justify-between items-end mb-2">
 <span className="text-2xl font-black dark:text-white text-slate-900">Level {level}</span>
 <span className="dark:text-slate-400 text-slate-600 font-mono text-sm">Next Rank: {xp} / {xpNeededForNextLevel} XP</span>
 </div>
 <div className="h-3 w-full dark:bg-slate-900 bg-white rounded-full overflow-hidden shadow-md">
 <motion.div 
 initial={{ width: 0 }}
 animate={{ width: `${levelProgress}%` }}
 transition={{ duration: 1, delay: 0.2 }}
 className="h-full bg-gradient-to-r from-cyan-600 to-blue-400 shadow-md" 
 />
 </div>
 </Card>
 </TiltWrapper>
 </motion.div>

 <motion.div variants={itemVariants}>
 <TiltWrapper tiltAmount={2}>
 <Card className={`p-6 relative overflow-hidden ${isBossDay ? 'bg-gradient-to-br from-rose-950/40 to-black border-rose-500/50' : 'dark:bg-black bg-slate-50 border dark:border-slate-800 border-slate-200'}`}>
 {isBossDay && <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 animate-pulse"></div>}
 <div className="absolute top-0 right-0 p-4 opacity-5"><Target className="w-24 h-24 dark:text-rose-400 text-rose-700" /></div>
 <h3 className={`text-sm font-bold uppercase tracking-wider mb-2 flex items-center gap-2 group/boss w-max flex items-center gap-2 ${isBossDay ? 'dark:text-rose-400 text-rose-700' : 'dark:text-slate-400 text-slate-600'}`}>
 <motion.div whileHover={{ scale: 1.3, rotate: 15 }} className="relative">
 <Target className="w-4 h-4 group-hover/boss:drop-shadow-md transition-all" />
 </motion.div> 7th Day Boss Protocol
 </h3>
 {isBossDay ? (
 <div>
 <p className="text-2xl font-black dark:text-white text-slate-900 mb-1 drop-shadow-md">BOSS DAY ACTIVE</p>
 <p className="text-sm text-rose-200">Defeat today's harder goals for a 2x XP Multiplier. Do not fail.</p>
 </div>
 ) : (
 <div>
 <p className="text-xl font-bold dark:text-slate-300 text-slate-600 mb-1">Standard Operations</p>
 <p className="text-sm text-slate-500 font-mono">Build stats before the day 7 assessment.</p>
 </div>
 )}
 </Card>
 </TiltWrapper>
 </motion.div>
 </div>

 {/* Yesterday's Summary & Past Entries list */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 {/* Main Past Entries List */}
 <div className="lg:col-span-2 space-y-8">
 {history.length === 0 ? (
 <div>
 <h2 className="text-xl font-bold dark:text-white text-slate-900 uppercase tracking-wider mb-4 border-b dark:border-white/10 border-black/10 pb-2">Recent Combat Records</h2>
 <div className="text-center p-8 dark:bg-black bg-slate-50 border dark:border-slate-800 border-slate-200 rounded-xl group/empty">
 <motion.div whileHover={{ scale: 1.2, rotate: -15, y: -5 }} className="relative inline-block mb-4">
 <Clock className="w-12 h-12 text-slate-600 group-hover/empty:text-slate-500 transition-colors drop-shadow-md" />
 </motion.div>
 <p className="dark:text-slate-400 text-slate-600 font-mono">No historical data available. Complete tasks today to form tomorrow's history.</p>
 </div>
 </div>
 ) : (
 <>
 <div>
 <h2 className="text-xl font-bold dark:text-white text-slate-900 uppercase tracking-wider mb-4 border-b dark:border-white/10 border-black/10 pb-2">Recent Combat Records</h2>
 <div className="space-y-4">
 {recentHistory.map((entry, idx) => {
 const rating = getDailyRating(entry.hoursStudied);
 if (entry.isMissed) {
 return (
 <div key={`recent-${entry.date}-${idx}`} className="mb-4">
 <TiltWrapper tiltAmount={2}>
 <Card className="dark:bg-black bg-slate-50 border border-rose-900/50 hover:shadow-md transition-all duration-300">
 <CardHeader className="py-4">
 <div className="flex items-center justify-between">
 <CardTitle className="dark:text-slate-200 text-slate-900 text-lg flex items-center gap-2 group/date w-max cursor-pointer">
 <div className="relative">
 <Calendar className="w-5 h-5 dark:text-rose-400 text-rose-700 group-hover/date:drop-shadow-md transition-all" />
 </div>
 {new Date(entry.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
 </CardTitle>
 <div className="px-2.5 py-0.5 rounded-full border border-rose-900 bg-rose-900/30 dark:text-rose-400 text-rose-700 font-mono text-xs font-semibold">
 MISSED DAY
 </div>
 </div>
 </CardHeader>
 <CardContent className="py-4 border-t border-rose-900/30 space-y-2">
 <span className="text-sm dark:text-rose-400 text-rose-700/80 uppercase tracking-wider mb-2 block font-bold">Reason for Absence</span>
 <div className="p-3 rounded-md border border-rose-900/50 bg-rose-950/20 dark:text-slate-300 text-slate-600 italic">
 "{entry.missedReason}"
 </div>
 </CardContent>
 </Card>
 </TiltWrapper>
 </div>
 );
 }
 return (
 <motion.div key={`history-${entry.date}-${idx}`} variants={itemVariants} viewport={{ once: true }}>
 <TiltWrapper tiltAmount={2}>
 <Card className={`dark:bg-black bg-slate-50 border ${rating.border} hover:shadow-md transition-all duration-300`}>
 <CardHeader className="py-4">
 <div className="flex items-center justify-between">
 <CardTitle className="dark:text-slate-200 text-slate-900 text-lg flex items-center gap-2 group/date w-max cursor-pointer">
 <motion.div whileHover={{ scale: 1.2, rotate: 15 }} className="relative">
 <Calendar className="w-5 h-5 dark:text-slate-400 text-slate-600 group-hover/date:dark:text-slate-300 text-slate-600 group-hover/date:drop-shadow-md transition-all" />
 </motion.div>
 {new Date(entry.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
 </CardTitle>
 <div className="flex items-center gap-3">
 <span className={rating.color}>{rating.label}</span>
 <div className={`px-2.5 py-0.5 rounded-full border ${rating.border} ${rating.bg} font-mono text-xs font-semibold`}>
 {entry.xpEarned} XP
 </div>
 </div>
 </div>
 </CardHeader>
 <CardContent className="py-4 border-t dark:border-white/5 border-black/5 space-y-4">
 <div className="grid grid-cols-3 gap-4 text-center">
 <div className="dark:bg-slate-900/50 bg-white p-2 rounded border dark:border-slate-800 border-slate-200">
 <span className="text-xs dark:text-slate-400 text-slate-600 block uppercase font-mono">Hours</span>
 <span className="text-lg font-bold dark:text-white text-slate-900">{entry.hoursStudied || 0}</span>
 </div>
 <div className="dark:bg-slate-900/50 bg-white p-2 rounded border dark:border-slate-800 border-slate-200">
 <span className="text-xs dark:text-slate-400 text-slate-600 block uppercase font-mono">Sleep</span>
 <span className="text-lg font-bold dark:text-blue-400 text-blue-700">{entry.sleepTime || 0} h</span>
 </div>
 <div className="dark:bg-slate-900/50 bg-white p-2 rounded border dark:border-slate-800 border-slate-200">
 <span className="text-xs dark:text-slate-400 text-slate-600 block uppercase font-mono">Screen</span>
 <span className="text-lg font-bold dark:text-orange-400 text-orange-600">{entry.screenTime || 0} h</span>
 </div>
 </div>
 <div>
 <span className="text-sm dark:text-slate-400 text-slate-600 uppercase tracking-wider mb-2 block font-bold">Objectives Handled</span>
 <div className="space-y-2">
 {entry.completedTasks.map((task, tidx) => (
 <div 
 key={`task-${entry.date}-${task.id || tidx}`} 
 onClick={() => setSelectedTask(task === selectedTask ? null : task)}
 className={`p-3 rounded-md border flex flex-col gap-2 cursor-pointer transition-all ${selectedTask?.id === task.id ? 'border-cyan-500 bg-cyan-500/10' : 'dark:border-slate-800 border-slate-200 dark:bg-black bg-slate-50 hover:dark:border-slate-700 border-slate-300'}`}
 >
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <CheckCircle2 className="w-4 h-4 dark:text-emerald-400 text-emerald-700" />
 <span className="dark:text-slate-200 text-slate-900">{task.text}</span>
 </div>
 <span className="text-xs font-mono dark:text-cyan-400 text-cyan-700">+{task.xpReward} XP</span>
 </div>
 
 {/* Expandable Details */}
 <AnimatePresence>
 {selectedTask?.id === task.id && (
 <motion.div 
 initial={{ opacity: 0, height: 0 }} 
 animate={{ opacity: 1, height: 'auto' }} 
 exit={{ opacity: 0, height: 0 }}
 className="overflow-hidden mt-2 pt-2 border-t dark:border-white/10 border-black/10"
 >
 {task.subject ? (
 <div className="grid grid-cols-4 gap-2 text-xs font-mono">
 <div className="dark:bg-slate-900/80 bg-white p-2 rounded border dark:border-slate-700 border-slate-300">
 <span className="dark:text-slate-400 text-slate-600 block">Lec No:</span>
 <span className="dark:text-purple-400 text-purple-700">{task.lectureNumber || '-'}</span>
 </div>
 <div className="dark:bg-slate-900/80 bg-white p-2 rounded border dark:border-slate-700 border-slate-300">
 <span className="dark:text-slate-400 text-slate-600 block">Lecture:</span>
 <span className="dark:text-white text-slate-900">{task.lectureHours || 0} Hrs</span>
 </div>
 <div className="dark:bg-slate-900/80 bg-white p-2 rounded border dark:border-slate-700 border-slate-300">
 <span className="dark:text-slate-400 text-slate-600 block">Homework:</span>
 <span className={task.homeworkDone ? "dark:text-emerald-400 text-emerald-700" : "text-slate-500"}>
 {task.homeworkDone ? "Done" : "Pending"}
 </span>
 </div>
 <div className="dark:bg-slate-900/80 bg-white p-2 rounded border dark:border-slate-700 border-slate-300">
 <span className="dark:text-slate-400 text-slate-600 block">DPP:</span>
 <span className={task.dppDone ? "dark:text-emerald-400 text-emerald-700" : "text-slate-500"}>
 {task.dppDone ? "Done" : "Pending"}
 </span>
 </div>
 </div>
 ) : (
 <div className="text-xs font-mono dark:text-slate-400 text-slate-600 dark:bg-slate-900/80 bg-white p-3 rounded border dark:border-slate-700 border-slate-300">
 General task logged. No specialized metadata attached.
 </div>
 )}
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 ))}
 </div>
 </div>
 {entry.aiFeedback && (
 <div className="bg-cyan-900/10 border border-cyan-800/50 p-4 rounded-xl mt-4">
 <h4 className="flex items-center gap-2 dark:text-cyan-400 text-cyan-700 font-bold mb-3 uppercase text-xs tracking-wider">
 <BrainCircuit className="w-4 h-4" /> AI Coach Assessment
 </h4>
 <div className="dark:text-slate-300 text-slate-600 text-sm leading-relaxed space-y-3 whitespace-pre-wrap">
 {entry.aiFeedback.split('\n\n').map((paragraph, idx, arr) => (
 <p key={`idx-${idx}`} className={idx === arr.length - 1 ? "pt-2 font-bold dark:text-white text-slate-900 italic border-t border-cyan-800/50 mt-2" : ""}>
 {paragraph}
 </p>
 ))}
 </div>
 </div>
 )}
 </CardContent>
 </Card>
 </TiltWrapper>
 </motion.div>
 );
 })}
 </div>
 </div>

 {archivedHistory.length > 0 && (
 <div>
 <h2 className="text-xl font-bold text-slate-500 uppercase tracking-wider mb-4 border-b dark:border-slate-800 border-slate-200 pb-2">Archive Database</h2>
 <div className="space-y-3">
 {archivedHistory.map((entry, idx) => {
 const isExpanded = expandedArchiveDates.includes(entry.date);
 const rating = getDailyRating(entry.hoursStudied);
 if (entry.isMissed) {
 return (
 <div key={`recent-${entry.date}-${idx}`} className="mb-4">
 <TiltWrapper tiltAmount={2}>
 <Card className="dark:bg-black bg-slate-50 border border-rose-900/50 hover:shadow-md transition-all duration-300">
 <CardHeader className="py-4">
 <div className="flex items-center justify-between">
 <CardTitle className="dark:text-slate-200 text-slate-900 text-lg flex items-center gap-2 group/date w-max cursor-pointer">
 <div className="relative">
 <Calendar className="w-5 h-5 dark:text-rose-400 text-rose-700 group-hover/date:drop-shadow-md transition-all" />
 </div>
 {new Date(entry.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
 </CardTitle>
 <div className="px-2.5 py-0.5 rounded-full border border-rose-900 bg-rose-900/30 dark:text-rose-400 text-rose-700 font-mono text-xs font-semibold">
 MISSED DAY
 </div>
 </div>
 </CardHeader>
 <CardContent className="py-4 border-t border-rose-900/30 space-y-2">
 <span className="text-sm dark:text-rose-400 text-rose-700/80 uppercase tracking-wider mb-2 block font-bold">Reason for Absence</span>
 <div className="p-3 rounded-md border border-rose-900/50 bg-rose-950/20 dark:text-slate-300 text-slate-600 italic">
 "{entry.missedReason}"
 </div>
 </CardContent>
 </Card>
 </TiltWrapper>
 </div>
 );
 }
 
 if (entry.isMissed) {
 return (
 <div key={`history-${entry.date}-${idx}`} className="mb-4">
 <TiltWrapper tiltAmount={2}>
 <Card className="dark:bg-black bg-slate-50 border border-rose-900/50 hover:shadow-md transition-all duration-300">
 <CardHeader className="py-4">
 <div className="flex items-center justify-between">
 <CardTitle className="dark:text-slate-200 text-slate-900 text-lg flex items-center gap-2 group/date w-max cursor-pointer">
 <div className="relative">
 <Calendar className="w-5 h-5 dark:text-rose-400 text-rose-700 group-hover/date:drop-shadow-md transition-all" />
 </div>
 {new Date(entry.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
 </CardTitle>
 <div className="px-2.5 py-0.5 rounded-full border border-rose-900 bg-rose-900/30 dark:text-rose-400 text-rose-700 font-mono text-xs font-semibold">
 MISSED DAY
 </div>
 </div>
 </CardHeader>
 <CardContent className="py-4 border-t border-rose-900/30 space-y-2">
 <span className="text-sm dark:text-rose-400 text-rose-700/80 uppercase tracking-wider mb-2 block font-bold">Reason for Absence</span>
 <div className="p-3 rounded-md border border-rose-900/50 bg-rose-950/20 dark:text-slate-300 text-slate-600 italic">
 "{entry.missedReason}"
 </div>
 </CardContent>
 </Card>
 </TiltWrapper>
 </div>
 );
 }
 return (
 <div key={`archive-${entry.date}-${idx}`} className="dark:bg-black bg-slate-50 border dark:border-slate-800 border-slate-200 rounded-xl overflow-hidden transition-all">
 <button 
 onClick={() => toggleArchive(entry.date)}
 className="w-full flex items-center justify-between p-4 hover:dark:bg-slate-900/50 hover:bg-slate-100 dark:bg-black bg-white transition-colors"
 >
 <div className="flex items-center gap-3">
 <ChevronRight className={`w-4 h-4 dark:text-slate-400 text-slate-500 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
            <Calendar className="w-4 h-4 dark:text-slate-400 text-slate-500" />
 <span className="dark:text-slate-300 text-slate-600 font-bold tracking-wide">
 {new Date(entry.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
 </span>
 </div>
 <div className="flex items-center gap-3">
 <span className={`text-xs px-2 py-1 rounded font-bold ${rating.bg} ${rating.color}`}>
 {rating.rank} Tier
 </span>
 <span className="text-xs font-mono text-slate-500">{entry.xpEarned} XP</span>
 </div>
 </button>

 <AnimatePresence>
 {isExpanded && (
 <motion.div
 initial={{ height: 0, opacity: 0 }}
 animate={{ height: 'auto', opacity: 1 }}
 exit={{ height: 0, opacity: 0 }}
 className="border-t dark:border-slate-800 border-slate-200 dark:bg-black bg-slate-50"
 >
 <div className="p-4 space-y-4">
 <div className="grid grid-cols-3 gap-4 text-center">
 <div className="dark:bg-slate-900/50 bg-white p-2 rounded border dark:border-slate-800 border-slate-200">
 <span className="text-[10px] text-slate-500 block uppercase font-mono">Hours</span>
 <span className="text-sm font-bold dark:text-white text-slate-900">{entry.hoursStudied || 0}</span>
 </div>
 <div className="dark:bg-slate-900/50 bg-white p-2 rounded border dark:border-slate-800 border-slate-200">
 <span className="text-[10px] text-slate-500 block uppercase font-mono">Sleep</span>
 <span className="text-sm font-bold dark:text-blue-400 text-blue-700">{entry.sleepTime || 0}h</span>
 </div>
 <div className="dark:bg-slate-900/50 bg-white p-2 rounded border dark:border-slate-800 border-slate-200">
 <span className="text-[10px] text-slate-500 block uppercase font-mono">Screen</span>
 <span className="text-sm font-bold dark:text-orange-400 text-orange-600">{entry.screenTime || 0}h</span>
 </div>
 </div>
 <div>
 <span className="text-xs text-slate-500 uppercase mb-2 block font-bold">Tasks Completed</span>
 <div className="space-y-1">
 {entry.completedTasks.map((t, i) => (
 <div key={`${entry.date}-archive-task-${t.id || i}-${i}`} className="flex justify-between items-center text-xs py-1 border-b dark:border-slate-800 border-slate-200/50 last:border-0">
 <span className="dark:text-slate-300 text-slate-600 truncate max-w-[70%]">{t.text}</span>
 <span className="dark:text-cyan-400 text-cyan-700 font-mono">+{t.xpReward}</span>
 </div>
 ))}
 {entry.completedTasks.length === 0 && (
 <span className="text-slate-600 text-xs italic">No specific tasks logged.</span>
 )}
 </div>
 </div>
 {entry.aiFeedback && (
 <div className="mt-4 pt-3 border-t dark:border-slate-800 border-slate-200/50">
 <span className="text-[10px] dark:text-indigo-400 text-indigo-600 uppercase font-mono block mb-2 flex items-center gap-1">
 <BrainCircuit className="w-3 h-3" /> Coach Verdict
 </span>
 <div className="space-y-2 dark:text-slate-400 text-slate-600 text-xs italic whitespace-pre-wrap">
 {entry.aiFeedback.split('\n\n').map((paragraph, idx, arr) => (
 <p key={`idx-${idx}`} className={idx === arr.length - 1 ? "font-bold dark:text-slate-300 text-slate-600 not-italic" : ""}>
 {paragraph}
 </p>
 ))}
 </div>
 </div>
 )}
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 );
 })}
 </div>
 </div>
 )}
 </>
 )}
 </div>

 {/* Right Column: Summaries & AI */}
 <div className="space-y-6">
 
 {/* AI Coach Layer */}
 <motion.div variants={itemVariants}>
 <TiltWrapper tiltAmount={4}>
 <Card className="bg-gradient-to-br from-indigo-950/80 to-black border-indigo-500/50 relative overflow-hidden">
 <div className="absolute -top-4 right-0 p-4 opacity-10"><Cpu className="w-32 h-32 dark:text-indigo-400 text-indigo-600" /></div>
 <CardHeader>
 <CardTitle className="dark:text-indigo-400 text-indigo-600 uppercase tracking-widest text-sm flex items-center gap-2">
 <Sparkles className="w-4 h-4" /> AI Coach Analysis
 </CardTitle>
 </CardHeader>
 <CardContent className="relative z-10 space-y-4">
 {latestWithFeedback ? (
 <div className="dark:bg-black bg-slate-50 border border-indigo-500/30 p-4 rounded-xl relative">
 {!latestWithFeedback.aiFeedback ? (
 <div className="flex items-center gap-3 dark:text-indigo-400 text-indigo-600">
 <Loader2 className="w-5 h-5 animate-spin" />
 <span className="text-sm font-mono animate-pulse">Generating neural feedback...</span>
 </div>
 ) : (
 <div className="space-y-3 text-sm text-indigo-100 leading-relaxed font-medium whitespace-pre-wrap">
 {latestWithFeedback.aiFeedback.split('\n\n').map((paragraph, idx, arr) => (
 <p key={`idx-${idx}`} className={idx === arr.length - 1 ? "pt-2 font-bold dark:text-white text-slate-900 italic border-t border-indigo-500/50 mt-2" : ""}>
 {paragraph}
 </p>
 ))}
 </div>
 )}
 </div>
 ) : (
 <p className="text-sm dark:text-slate-400 text-slate-600">Waiting for first day data...</p>
 )}

 {needsRecovery && (
 <div className="bg-rose-950/40 border border-rose-500/50 p-4 rounded-xl flex gap-3 mt-4 group/recovery">
 <motion.div whileHover={{ scale: 1.2, rotate: 15 }} className="shrink-0 relative">
 <ShieldAlert className="w-5 h-5 dark:text-rose-400 text-rose-700 drop-shadow-md group-hover/recovery:drop-shadow-md transition-all" />
 </motion.div>
 <div>
 <p className="text-xs font-bold dark:text-rose-400 text-rose-700 uppercase">Recovery Check-in: Target Reduction</p>
 <p className="text-xs text-rose-200 mt-1">Sustained drop in hours detected. This is data, not weakness (fatigue/overload). Action: Drop tomorrow's target to 3 hours just to rebuild consistency. Momentum &gt; Intensity.</p>
 </div>
 </div>
 )}
 </CardContent>
 </Card>
 </TiltWrapper>
 </motion.div>

 {/* Pattern Detection */}
 <motion.div variants={itemVariants}>
 <TiltWrapper tiltAmount={4}>
 <Card className="dark:bg-black bg-slate-50 border dark:border-slate-800 border-slate-200">
 <CardHeader>
 <CardTitle className="dark:text-cyan-400 text-cyan-700 uppercase tracking-widest text-sm flex items-center gap-2 group/matrix w-max">
 <motion.div whileHover={{ scale: 1.2, rotate: -15 }} className="relative">
 <Monitor className="w-4 h-4 group-hover/matrix:drop-shadow-md transition-all" />
 </motion.div> 10-Day Pattern Matrix
 </CardTitle>
 </CardHeader>
    <CardContent>
      <div className="grid grid-cols-1 gap-4">
        {insights.map((insight: any, i) => (
          <div key={`i-${i}`} className={`p-4 rounded-xl border relative overflow-hidden transition-all duration-300 hover:shadow-lg ${insight.type === "positive" ? "dark:bg-emerald-950/20 bg-emerald-50 dark:border-emerald-500/30 border-emerald-300 hover:border-emerald-500/50" : insight.type === "warning" ? "dark:bg-amber-950/20 bg-amber-50 dark:border-amber-500/30 border-amber-300 hover:border-amber-500/50" : insight.type === "danger" ? "dark:bg-rose-950/20 bg-rose-50 dark:border-rose-500/30 border-rose-300 hover:border-rose-500/50" : "dark:bg-slate-900/40 bg-slate-100 dark:border-slate-800 border-slate-300 hover:border-slate-500/50"}`}>
            <div className="flex justify-between items-start mb-2">
              <h4 className={`text-sm font-bold uppercase tracking-wider ${insight.type === "positive" ? "dark:text-emerald-400 text-emerald-700" : insight.type === "warning" ? "dark:text-amber-400 text-amber-700" : insight.type === "danger" ? "dark:text-rose-400 text-rose-700" : "dark:text-slate-400 text-slate-600"}`}>{insight.title}</h4>
              <span className={`text-xs font-mono px-2 py-0.5 rounded-full border ${insight.type === "positive" ? "dark:border-emerald-500/30 border-emerald-400/50 dark:text-emerald-300 text-emerald-800 dark:bg-emerald-500/10 bg-emerald-500/20" : insight.type === "warning" ? "dark:border-amber-500/30 border-amber-400/50 dark:text-amber-300 text-amber-800 dark:bg-amber-500/10 bg-amber-500/20" : insight.type === "danger" ? "dark:border-rose-500/30 border-rose-400/50 dark:text-rose-300 text-rose-800 dark:bg-rose-500/10 bg-rose-500/20" : "dark:border-slate-700 border-slate-400/50 dark:text-slate-400 text-slate-700 dark:bg-slate-800/50 bg-slate-300/20"}`}>{insight.metric}</span>
            </div>
            <p className="text-sm dark:text-slate-300 text-slate-700 leading-relaxed">{insight.description}</p>
          </div>
        ))}
      </div>
    </CardContent>
 </Card>
 </TiltWrapper>
 </motion.div>

 {/* Micro Rewards System */}
 <motion.div variants={itemVariants}>
 <TiltWrapper tiltAmount={4}>
 <Card className="bg-gradient-to-tr from-amber-950/40 to-black border-amber-500/30">
 <CardHeader>
 <CardTitle className="dark:text-amber-400 text-amber-700 uppercase tracking-widest text-sm flex items-center gap-2 group/rewards w-max">
 <motion.div whileHover={{ scale: 1.2, rotate: 15 }} className="relative">
 <Award className="w-4 h-4 group-hover/rewards:drop-shadow-md transition-all" />
 </motion.div> Micro Rewards
 </CardTitle>
 </CardHeader>
 <CardContent>
 <div className="flex flex-wrap gap-2">
 {streakForBadges >= 7 && (
 <div className="bg-amber-500/20 border border-amber-500/50 dark:text-amber-300 dark:text-amber-400 text-amber-700 text-xs px-3 py-1.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md hover:scale-105 transition-transform cursor-default group/badge1">
 <motion.div whileHover={{ scale: 1.3, rotate: -15 }}><Award className="w-3 h-3 group-hover/badge1:drop-shadow-md transition-all" /></motion.div> Consistency Beast
 </div>
 )}
 {(latestEntry?.hoursStudied ?? 0) >= 8 && (
 <div className="bg-rose-500/20 border border-rose-500/50 dark:text-rose-300 dark:text-rose-400 text-rose-700 text-xs px-3 py-1.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md hover:scale-105 transition-transform cursor-default group/badge2">
 <motion.div whileHover={{ scale: 1.3, rotate: 15 }}><Flame className="w-3 h-3 group-hover/badge2:drop-shadow-md transition-all" /></motion.div> Apex Predator
 </div>
 )}
 {(latestEntry?.sleepTime ?? 8) < 6 && (latestEntry?.hoursStudied ?? 0) > 5 && (
 <div className="bg-purple-500/20 border border-purple-500/50 dark:text-purple-300 dark:text-purple-400 text-purple-700 text-xs px-3 py-1.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1.5 hover:scale-105 transition-transform cursor-default group/badge3">
 <motion.div whileHover={{ scale: 1.3, rotate: -15 }}><Activity className="w-3 h-3 group-hover/badge3:drop-shadow-md transition-all" /></motion.div> Late Night Grinder
 </div>
 )}
 {streakForBadges < 7 && (latestEntry?.hoursStudied ?? 0) < 8 && (
 <p className="text-xs text-slate-500 uppercase tracking-widest">Achieve S-Tier limits to unlock badges.</p>
 )}
 </div>
 </CardContent>
 </Card>
 </TiltWrapper>
 </motion.div>

 {/* 10 Day Level Up Progress */}
 <motion.div variants={itemVariants}>
 <TiltWrapper tiltAmount={4}>
 <Card className="bg-gradient-to-br from-emerald-900/40 to-black border-emerald-500/30 relative overflow-hidden">
 <div className="absolute -bottom-4 -right-4 p-4 opacity-10"><Activity className="w-32 h-32" /></div>
 <CardHeader>
 <CardTitle className="dark:text-emerald-400 text-emerald-700 uppercase tracking-widest text-sm flex items-center gap-2 group/10day w-max">
 <motion.div whileHover={{ scale: 1.2, rotate: 15 }} className="relative">
 <CheckCircle2 className="w-4 h-4 group-hover/10day:drop-shadow-md transition-all" />
 </motion.div>
 10-Day Consistency
 </CardTitle>
 </CardHeader>
 <CardContent className="relative z-10 space-y-4">
 <div className="flex justify-between items-end">
 <div>
 <p className="text-3xl font-black dark:text-white text-slate-900">{consistentDays}/10</p>
 <p className="text-xs font-mono dark:text-emerald-400 text-emerald-700 uppercase">Days Active</p>
 </div>
 <div className="text-right">
 <p className="text-xl font-bold dark:text-white text-slate-900">{tenDaysHours}</p>
 <p className="text-xs font-mono dark:text-slate-400 text-slate-600 uppercase">Total Hrs</p>
 </div>
 </div>
 {/* Progress bar */}
 <div className="h-2 w-full dark:bg-slate-800 bg-slate-100 rounded-full overflow-hidden">
 <motion.div 
 initial={{ width: 0 }}
 whileInView={{ width: `${(consistentDays / 10) * 100}%` }}
 transition={{ duration: 1, delay: 0.5 }}
 className="h-full bg-emerald-500" 
 />
 </div>
 </CardContent>
 </Card>
 </TiltWrapper>
 </motion.div>

 </div>
 </div>
 </motion.div>
 </div>
 );
}
