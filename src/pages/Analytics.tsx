import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TiltWrapper } from '@/components/TiltWrapper';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, Cell, PieChart, Pie } from 'recharts';
import { Activity, Brain, TrendingUp, AlertCircle, Target, Zap, Clock, Plus, BookOpen, X } from 'lucide-react';
import { useAppContext, SyllabusData } from '@/context/AppContext';
import { TourStep, useTour } from '@/components/TourGuide';

const MISTAKE_TYPES = [
 "Conceptual",
 "Calculation",
 "Formula Error",
 "Silly/Misreading",
 "Time Pressure"
];

const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#a855f7', '#10b981'];

export default function Analytics() {
 const { isLoaded, hasSeenRules, accuracy: globalAccuracy, speedScore: globalSpeedScore, logSession, history, practiceSessions, syllabus, todos, habits } = useAppContext();
 
 const { activeStep, setActiveStep, hasCompleted } = useTour();

 React.useEffect(() => {
 if (isLoaded && hasSeenRules && !hasCompleted('analytics-tracker') && activeStep === null) {
 const timeout = setTimeout(() => setActiveStep('analytics-tracker'), 1000);
 return () => clearTimeout(timeout);
 }
 }, [isLoaded, hasSeenRules, hasCompleted, activeStep, setActiveStep]);

 // Form state
 const [subject, setSubject] = useState<keyof SyllabusData>('Physics');
 const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
 const [attempted, setAttempted] = useState('');
 const [correct, setCorrect] = useState('');
 const [timeSpent, setTimeSpent] = useState('');
 const [selectedMistakes, setSelectedMistakes] = useState<string[]>([]);
 const [isChapterModalOpen, setIsChapterModalOpen] = useState(false);

 const [activeTab, setActiveTab] = useState<'Tracker'|'Insights'|'Trends'>('Tracker');
 const [chartSubject, setChartSubject] = useState<'All'|'Physics'|'Chemistry'|'Mathematics'>('All');
 const [chapterSearch, setChapterSearch] = useState('');

 // Dynamically compute syllabus and consistency data
 const { totalChapters, completedChapters, activeBacklogs, consistencyYield } = useMemo(() => {
 let tot = 0;
 let comp = 0;
 let backlog = 0;

 const chaptersList = Object.values(syllabus) as ReadonlyArray<any[]>;
 chaptersList.forEach(chapters => {
 chapters.forEach(c => {
 tot++;
 if(c.status === 'green' || (c.lectures >= 100 && c.accuracy > 70)) comp++;
 });
 });

 todos.forEach(t => {
 if(!t.completed && (t.type === 'DPP' || t.type === 'Practice' || t.type === 'Lecture')) {
 backlog++;
 }
 });

 let habitsTotal = habits.length;
 let habitsDone = habits.filter(h => h.completedDays.includes(new Date().getDate())).length;
 let todoTotal = todos.length;
 let todoDone = todos.filter(t => t.completed).length;

 let totalTasks = habitsTotal + todoTotal;
 let doneTasks = habitsDone + todoDone;
 let yieldPer = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

 return { totalChapters: tot, completedChapters: comp, activeBacklogs: backlog, consistencyYield: yieldPer };
 }, [syllabus, todos, habits]);

 // Dynamically compute XP trends for the sparkline (last 7 days map)
 const xpTrendData = useMemo(() => {
 const last7Days = [];
 for (let i = 6; i >= 0; i--) {
 const d = new Date();
 d.setDate(d.getDate() - i);
 const dayStr = d.toLocaleDateString(undefined, { weekday: 'short' });
 
 const entry = history.find(e => {
 const hDate = new Date(e.date);
 return hDate.getDate() === d.getDate() && hDate.getMonth() === d.getMonth() && hDate.getFullYear() === d.getFullYear();
 });
 
 last7Days.push({
 day: dayStr,
 xp: entry ? entry.xpEarned || 0 : 0
 });
 }
 return last7Days;
 }, [history]);

 // Dynamically compute heatmap
 const heatmapData = useMemo(() => {
 const days = [];
 for (let i = 29; i >= 0; i--) {
 const d = new Date();
 d.setDate(d.getDate() - i);
 d.setHours(0,0,0,0);
 
 const entry = history.find(e => {
 const hDate = new Date(e.date);
 return hDate.getDate() === d.getDate() && hDate.getMonth() === d.getMonth() && hDate.getFullYear() === d.getFullYear();
 });
 
 let intensity = 0;
 if (entry && !entry.isMissed) {
 if (entry.hoursStudied >= 8) intensity = 4;
 else if (entry.hoursStudied >= 5) intensity = 3;
 else if (entry.hoursStudied >= 2) intensity = 2;
 else if (entry.hoursStudied > 0) intensity = 1;
 }

 days.push({
 date: d,
 intensity,
 hours: entry ? entry.hoursStudied : 0,
 isMissed: entry ? !!entry.isMissed : false,
 missedReason: entry?.missedReason
 });
 }
 return days;
 }, [history]);

 // Dynamically compute tracker trends (14 days)
 const trackerData = useMemo(() => {
 const data = [];
 for (let i = 13; i >= 0; i--) {
 const d = new Date();
 d.setDate(d.getDate() - i);
 const dayStr = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
 
 const entry = history.find(e => {
 const hDate = new Date(e.date);
 return hDate.getDate() === d.getDate() && hDate.getMonth() === d.getMonth() && hDate.getFullYear() === d.getFullYear();
 });
 
 data.push({
 date: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
 fullDate: dayStr,
 hours: entry ? entry.hoursStudied : 0,
 xp: entry ? entry.xpEarned || 0 : 0
 });
 }
 return data;
 }, [history]);

 const { currentWeekXP, lastWeekXP, currentWeekHours, lastWeekHours } = useMemo(() => {
 const lastWk = trackerData.slice(0, 7);
 const currWk = trackerData.slice(7, 14);
 
 return {
 currentWeekXP: currWk.reduce((s, d) => s + d.xp, 0),
 lastWeekXP: lastWk.reduce((s, d) => s + d.xp, 0),
 currentWeekHours: currWk.reduce((s, d) => s + d.hours, 0),
 lastWeekHours: lastWk.reduce((s, d) => s + d.hours, 0),
 };
 }, [trackerData]);

 const filteredPracticeSessions = useMemo(() => {
 if (chartSubject === 'All') return practiceSessions;
 return practiceSessions.filter(ps => ps.subject === chartSubject);
 }, [practiceSessions, chartSubject]);

 // Dynamically compute chapter trends from top 5 practiced chapters
 const chapterTrends = useMemo(() => {
 const activeChapters: {name: string, accuracy: number, subject: string, totalAtt: number, speed: number}[] = [];
 
 // Calculate stats per chapter from filteredPracticeSessions
 const chapStats: Record<string, { att: number, time: number, corr: number, name: string }> = {};
 
 filteredPracticeSessions.forEach(ps => {
 const key = ps.chapter;
 if (!chapStats[key]) chapStats[key] = { att: 0, time: 0, corr: 0, name: key };
 chapStats[key].att += ps.attempted;
 chapStats[key].time += ps.timeSpent;
 chapStats[key].corr += ps.correct;
 });

 Object.values(chapStats).forEach(st => {
 if (st.att > 0) {
 const acc = Math.round((st.corr / st.att) * 100);
 const minsPerQ = st.time / st.att;
 const spd = Math.max(0, Math.min(100, Math.round(100 - (minsPerQ - 1) * 25)));
 activeChapters.push({ name: st.name, accuracy: acc, subject: '', totalAtt: st.att, speed: spd });
 }
 });

 return activeChapters.sort((a,b) => b.totalAtt - a.totalAtt).slice(0, 5);
 }, [filteredPracticeSessions]);

 // Dynamically compute performance data (Accuracy vs Speed over last 7 practice days)
 const performanceData = useMemo(() => {
 const dataByDate: Record<string, { att: number, corr: number, time: number }> = {};
 const last7Days = [];
 
 for (let i = 6; i >= 0; i--) {
 const d = new Date();
 d.setDate(d.getDate() - i);
 const dayStr = d.toLocaleDateString(undefined, { weekday: 'short' });
 last7Days.push(dayStr);
 dataByDate[dayStr] = { att: 0, corr: 0, time: 0 };
 }

 filteredPracticeSessions.forEach(ps => {
 const d = new Date(ps.date);
 const dayStr = d.toLocaleDateString(undefined, { weekday: 'short' });
 if (dataByDate[dayStr]) {
 dataByDate[dayStr].att += ps.attempted;
 dataByDate[dayStr].corr += ps.correct;
 dataByDate[dayStr].time += ps.timeSpent;
 }
 });

 return last7Days.map(dayStr => {
 const p = dataByDate[dayStr];
 const acc = p.att > 0 ? Math.round((p.corr / p.att) * 100) : 0;
 const minsPerQ = p.att > 0 ? p.time / p.att : 0;
 const spd = p.att > 0 ? Math.max(0, Math.min(100, Math.round(100 - (minsPerQ - 1) * 25))) : 0;
 return {
 day: dayStr,
 accuracy: acc,
 speedScore: spd,
 questions: p.att
 };
 });
 }, [filteredPracticeSessions]);

 // Dynamically compute mistake categorization
 const mistakeData = useMemo(() => {
 const counts: Record<string, number> = {};
 MISTAKE_TYPES.forEach(m => counts[m] = 0);
 let total = 0;
 
 filteredPracticeSessions.forEach(ps => {
 ps.mistakes.forEach(m => {
 counts[m] = (counts[m] || 0) + 1;
 total++;
 });
 });
 
 if (total === 0) return [];
 
 return Object.keys(counts).filter(k => counts[k] > 0).map((k, i) => ({
 name: k,
 value: counts[k],
 color: COLORS[i % COLORS.length]
 }));
 }, [filteredPracticeSessions]);

 const groupedRecentLogs = useMemo(() => {
 const groups: Record<string, typeof practiceSessions> = {};
 practiceSessions.forEach(ps => {
 if (!groups[ps.date]) groups[ps.date] = [];
 groups[ps.date].push(ps);
 });
 return Object.values(groups)
 .sort((a, b) => new Date(b[0].date).getTime() - new Date(a[0].date).getTime())
 .reverse()
 .slice(0, 10);
 }, [practiceSessions]);

 const handleLogSession = (e: React.FormEvent) => {
 e.preventDefault();
 const att = parseInt(attempted);
 const corr = parseInt(correct);
 let time = parseInt(timeSpent);

 if (selectedChapters.length === 0 || isNaN(att) || isNaN(corr) || isNaN(time) || att <= 0 || corr < 0 || time <= 0 || att < corr) return;
 
 // Clamp time to 24 hours (1440 mins) to prevent unrealistic inputs
 time = Math.min(1440, time);

 logSession(subject, selectedChapters, att, corr, time, selectedMistakes);

 setAttempted('');
 setCorrect('');
 setTimeSpent('');
 setSelectedChapters([]);
 setSelectedMistakes([]);
 };

 const toggleMistake = (m: string) => {
 setSelectedMistakes(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
 };

 // Generate AI Insights
 const generateInsights = () => {
 let base = {
 dominantMistake: "No data yet",
 mistakeInsight: "Log practice sessions to analyze errors.",
 speedAlert: "No data yet",
 speedInsight: "Log practice sessions to analyze speed.",
 adaptiveAction: "Start practicing to unlock AI adaptive difficulty.",
 consistencyAlert: "Consistency Yield",
 consistencyInsight: "Complete daily protocols to track consistency."
 };

 if (consistencyYield >= 90) {
 base.consistencyInsight = `Your consistency index is ${consistencyYield}% this week. You've unlocked a 1.2x XP multiplier for today's DPP logs.`;
 } else if (consistencyYield > 50) {
 base.consistencyInsight = `Your consistency index is ${consistencyYield}%. Keep pushing to hit 90% for bonus multipliers!`;
 } else if (consistencyYield > 0 || todos.length > 0) {
 base.consistencyInsight = `Your consistency index is dropping (${consistencyYield}%). Focus on completing daily missions before day ends!`;
 }

 if (practiceSessions.length === 0) {
 return base;
 }
 
 // Mistake
 let dominant = "None";
 let max = 0;
 const mCounts: Record<string, number> = {};
 practiceSessions.forEach(ps => ps.mistakes.forEach(m => mCounts[m] = (mCounts[m] || 0) + 1));
 Object.keys(mCounts).forEach(k => { if(mCounts[k] > max) { max = mCounts[k]; dominant = k; } });
 
 let mistakePer = 0;
 const totalM = Object.values(mCounts).reduce((a,b)=>a+b,0);
 if(totalM > 0) mistakePer = Math.round((max/totalM)*100);

 const badChaps = practiceSessions.filter(ps => ps.mistakes.includes(dominant)).map(p => p.chapter);
 const uniqueBadChaps = [...new Set(badChaps)].slice(0, 2);

 const mistakeInsight = dominant !== "None" 
 ? `Dominant error type: ${dominant} (${mistakePer}%). Seen often in ${uniqueBadChaps.join(' and ') || 'various topics'}.`
 : "You are not logging any specific mistakes.";

 // Speed
 const recentSess = practiceSessions[practiceSessions.length - 1];
 const minsPerQ = recentSess.attempted > 0 ? recentSess.timeSpent / recentSess.attempted : 1;
 const avgSpd = minsPerQ > 0 ? Math.round(60 / minsPerQ) : 0;
 
 let speedInsight = `Current rate: ${avgSpd} Qs/hour from last session in ${recentSess.chapter}. `;
 if (avgSpd < 15) speedInsight += "This is too slow for JEE standards. Work on time-bound practice.";
 else if (avgSpd > 30) speedInsight += "Excellent speed! Ensure accuracy isn't dropping.";
 else speedInsight += "Good pacing. Target 25 Qs/hour for optimal performance.";

 // Action
 const weakChaps = chapterTrends.filter(c => c.accuracy < 60);
 const strongChaps = chapterTrends.filter(c => c.accuracy > 80);
 let adaptiveAction = "Continue balanced practice across topics.";
 if (weakChaps.length > 0) {
 adaptiveAction = `Focus heavily on ${weakChaps[0].name} due to low accuracy (${weakChaps[0].accuracy}%). Re-read theory.`;
 } else if (strongChaps.length > 0) {
 adaptiveAction = `You are highly accurate in ${strongChaps[0].name} (${strongChaps[0].accuracy}%). Shift focus to moderate topics.`;
 }

 return { ...base, dominantMistake: dominant, mistakeInsight, speedAlert: "Speed System Active", speedInsight, adaptiveAction };
 };

 const insights = generateInsights();

 const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
 const itemVariants = { hidden: { opacity: 0, y: 30, scale: 0.9 }, show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 120, damping: 10 } } };

 return (
 <div className="space-y-8 pb-12">
 <motion.header variants={itemVariants} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-50px" }} className="flex flex-col gap-6 w-full">
 <div>
 <h1 className="text-4xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-600">
 ADVANCED ANALYTICS
 </h1>
 <p className="dark:text-cyan-400 text-cyan-700 font-mono text-sm mt-1 flex items-center gap-2">
 <Activity className="w-4 h-4" />
 PREDICTIVE PERFORMANCE ENGINE
 </p>
 </div>
 
 <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 w-full">
 <TiltWrapper tiltAmount={4}>
 <Card className="dark:bg-black bg-slate-50 border-yellow-500/30">
 <CardContent className="p-2 sm:p-4 flex flex-col justify-center items-center text-center gap-1 h-full min-w-0">
 <p className="text-[9px] sm:text-[10px] dark:text-yellow-400 text-yellow-700/80 font-mono uppercase whitespace-nowrap overflow-hidden text-ellipsis w-full">XP TREND</p>
 <div className="h-6 sm:h-8 w-full mt-1">
 <ResponsiveContainer width="100%" height="100%">
 <LineChart data={xpTrendData}>
 <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '4px', padding: '2px 4px', fontSize: '10px' }} />
 <Line type="monotone" dataKey="xp" stroke="#eab308" strokeWidth={2} dot={false} isAnimationActive={false} />
 </LineChart>
 </ResponsiveContainer>
 </div>
 </CardContent>
 </Card>
 </TiltWrapper>
 <TiltWrapper tiltAmount={4}>
 <Card className="dark:bg-black bg-slate-50 border-cyan-500/30">
 <CardContent className="p-2 sm:p-4 flex flex-col items-center justify-center text-center gap-1 h-full min-w-0">
 <Target className="w-5 h-5 sm:w-6 sm:h-6 dark:text-cyan-400 text-cyan-700 mb-1" />
 <p className="text-[9px] sm:text-[10px] dark:text-cyan-400 text-cyan-700/80 font-mono uppercase whitespace-nowrap overflow-hidden text-ellipsis w-full">ACCURACY</p>
 <p className="text-sm sm:text-lg font-bold font-mono dark:text-white text-slate-900">{globalAccuracy}%</p>
 </CardContent>
 </Card>
 </TiltWrapper>
 <TiltWrapper tiltAmount={4}>
 <Card className="dark:bg-black bg-slate-50 border-purple-500/30">
 <CardContent className="p-2 sm:p-4 flex flex-col items-center justify-center text-center gap-1 h-full min-w-0">
 <Zap className="w-5 h-5 sm:w-6 sm:h-6 dark:text-purple-400 text-purple-700 mb-1" />
 <p className="text-[9px] sm:text-[10px] dark:text-purple-400 text-purple-700/80 font-mono uppercase whitespace-nowrap overflow-hidden text-ellipsis w-full">SPEED</p>
 <p className="text-sm sm:text-lg font-bold font-mono dark:text-white text-slate-900">{globalSpeedScore}</p>
 </CardContent>
 </Card>
 </TiltWrapper>
 <TiltWrapper tiltAmount={4}>
 <Card className="dark:bg-black bg-slate-50 border-emerald-500/30">
 <CardContent className="p-2 sm:p-4 flex flex-col items-center justify-center text-center gap-1 h-full min-w-0">
 <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 dark:text-emerald-400 text-emerald-700 mb-1" />
 <p className="text-[9px] sm:text-[10px] dark:text-emerald-400 text-emerald-700/80 font-mono uppercase whitespace-nowrap overflow-hidden text-ellipsis w-full">CONSISTENCY</p>
 <p className="text-sm sm:text-lg font-bold font-mono dark:text-white text-slate-900">{consistencyYield}%</p>
 </CardContent>
 </Card>
 </TiltWrapper>
 <TiltWrapper tiltAmount={4}>
 <Card className="dark:bg-black bg-slate-50 border-orange-500/30">
 <CardContent className="p-2 sm:p-4 flex flex-col items-center justify-center text-center gap-1 h-full min-w-0">
 <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 dark:text-orange-400 text-orange-600 mb-1" />
 <p className="text-[9px] sm:text-[10px] dark:text-orange-400 text-orange-600/80 font-mono uppercase whitespace-nowrap overflow-hidden text-ellipsis w-full">SYLLABUS</p>
 <p className="text-sm sm:text-lg font-bold font-mono dark:text-white text-slate-900">{completedChapters}/{totalChapters}</p>
 </CardContent>
 </Card>
 </TiltWrapper>
 <TiltWrapper tiltAmount={4}>
 <Card className="dark:bg-black bg-slate-50 border-rose-500/30">
 <CardContent className="p-2 sm:p-4 flex flex-col items-center justify-center text-center gap-1 h-full min-w-0">
 <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 dark:text-rose-400 text-rose-700 mb-1" />
 <p className="text-[9px] sm:text-[10px] dark:text-rose-400 text-rose-700/80 font-mono uppercase whitespace-nowrap overflow-hidden text-ellipsis w-full">BACKLOGS</p>
 <p className="text-sm sm:text-lg font-bold font-mono dark:text-white text-slate-900">{activeBacklogs}</p>
 </CardContent>
 </Card>
 </TiltWrapper>
 </div>
 </motion.header>

 <div className="flex flex-wrap gap-2 md:gap-4 justify-center md:justify-start border-b dark:border-slate-800 border-slate-200 pb-4 mb-4">
 {[
 { id: 'Tracker', label: 'Growth Tracker' },
 { id: 'Insights', label: 'Insights & Trends' }
 ].map(tab => (
 <button
 key={tab.id}
 onClick={() => setActiveTab(tab.id as any)}
 className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all ${
 activeTab === tab.id 
 ? 'bg-blue-600/20 dark:text-blue-400 text-blue-700 border border-blue-500/50 shadow-md scale-105'
 : 'bg-transparent dark:text-slate-400 text-slate-600 hover:dark:text-slate-200 text-slate-900 hover:dark:bg-slate-800 bg-slate-100'
 }`}
 >
 {tab.label}
 </button>
 ))}
 </div>

 <AnimatePresence mode="wait">
 {activeTab === 'Insights' && (
 <motion.div key="Insights" variants={containerVariants} initial="hidden" animate="show" exit={{ opacity: 0, y: -20 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 <motion.div variants={itemVariants} className="lg:col-span-1 space-y-6">
 <Card className="border-blue-500/30 bg-blue-500/5">
 <CardHeader className="pb-4">
 <CardTitle className="text-lg font-bold dark:text-blue-400 text-blue-700 flex items-center gap-2">
 <Plus className="w-5 h-5" />
 Log Practice Session
 </CardTitle>
 <CardDescription>Input your data to update advanced analytics.</CardDescription>
 </CardHeader>
 <CardContent>
 <form onSubmit={handleLogSession} className="space-y-4">
 <div className="space-y-4">
 <div>
 <label className="text-xs font-bold dark:text-slate-400 text-slate-600 uppercase tracking-wider mb-1 block">Subject</label>
 <select 
 value={subject}
 onChange={(e) => {
 setSubject(e.target.value as keyof SyllabusData);
 setSelectedChapters([]);
 }}
 className="w-full dark:bg-black bg-slate-50 border dark:border-slate-700 border-slate-300 rounded-md p-2 dark:text-white text-slate-900 focus:border-blue-500 outline-none text-sm"
 >
 <option value="Physics">Physics</option>
 <option value="Chemistry">Chemistry</option>
 <option value="Mathematics">Mathematics</option>
 </select>
 </div>
 <div>
 <label className="text-xs font-bold dark:text-slate-400 text-slate-600 uppercase tracking-wider mb-2 block">Select Chapter(s)</label>
 <Button type="button" onClick={() => setIsChapterModalOpen(true)} className="w-full dark:bg-slate-800 bg-slate-100/50 border dark:border-slate-700 border-slate-300 hover:bg-slate-700 dark:text-slate-300 text-slate-600 justify-start font-normal h-10">
 {selectedChapters.length > 0 ? `${selectedChapters.length} Chapters Selected` : 'Select Chapters...'}
 </Button>
 </div>
 </div>
 
 <div className="grid grid-cols-3 gap-3">
 <div>
 <label className="text-[10px] font-bold dark:text-slate-400 text-slate-600 uppercase tracking-wider mb-1 block">Attempted</label>
 <input 
 type="number" min="1" value={attempted || ""} onChange={(e) => setAttempted(e.target.value)}
 className="w-full dark:bg-black bg-slate-50 border dark:border-slate-700 border-slate-300 rounded-md p-2 dark:text-white text-slate-900 focus:border-blue-500 outline-none text-sm"
 placeholder="e.g. 30" required
 />
 </div>
 <div>
 <label className="text-[10px] font-bold dark:text-slate-400 text-slate-600 uppercase tracking-wider mb-1 block">Correct</label>
 <input 
 type="number" min="0" max={attempted || 1000} value={correct || ""} onChange={(e) => setCorrect(e.target.value)}
 className="w-full dark:bg-black bg-slate-50 border dark:border-slate-700 border-slate-300 rounded-md p-2 dark:text-white text-slate-900 focus:border-blue-500 outline-none text-sm"
 placeholder="e.g. 24" required
 />
 </div>
 <div>
 <label className="text-[10px] font-bold dark:text-slate-400 text-slate-600 uppercase tracking-wider mb-1 block">Mins</label>
 <input 
 type="number" min="1" max="1440" value={timeSpent || ""} onChange={(e) => setTimeSpent(e.target.value)}
 className="w-full dark:bg-black bg-slate-50 border dark:border-slate-700 border-slate-300 rounded-md p-2 dark:text-white text-slate-900 focus:border-blue-500 outline-none text-sm"
 placeholder="45" required
 />
 </div>
 </div>

 <div>
 <label className="text-xs font-bold dark:text-slate-400 text-slate-600 uppercase tracking-wider mb-2 block">Mistakes Made (Optional)</label>
 <div className="flex flex-wrap gap-2">
 {MISTAKE_TYPES.map(m => (
 <button
 key={m}
 type="button"
 onClick={() => toggleMistake(m)}
 className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${
 selectedMistakes.includes(m) 
 ? 'bg-rose-500/20 border-rose-500 dark:text-rose-300 dark:text-rose-400 text-rose-700' 
 : 'dark:bg-slate-800 bg-slate-100/50 dark:border-slate-700 border-slate-300 dark:text-slate-400 text-slate-600 hover:border-slate-500'
 }`}
 >
 {m}
 </button>
 ))}
 </div>
 </div>

 <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold h-10 shadow-md">
 SAVE SESSION
 </Button>
 </form>
 </CardContent>
 </Card>

 <Card className="border-cyan-500/30 bg-cyan-500/5 flex flex-col">
 <CardHeader className="pb-3">
 <CardTitle className="flex items-center gap-2 dark:text-cyan-400 text-cyan-700 uppercase tracking-wider text-sm group/ai w-max">
 <motion.div whileHover={{ scale: 1.2, rotate: 15 }} className="relative z-10">
 <Brain className="w-5 h-5 group-hover/ai:drop-shadow-md transition-all" />
 </motion.div>
 AI Performance Analyst
 </CardTitle>
 </CardHeader>
 <CardContent className="space-y-4 flex-1">
 <div className="p-4 dark:bg-black bg-slate-50 rounded-lg border border-red-500/30 shadow-md group/alert">
 <h4 className="font-bold dark:text-red-400 text-red-700 mb-1 flex items-center gap-2 uppercase text-[11px] tracking-wider w-max cursor-pointer">
 <motion.div whileHover={{ scale: 1.2, rotate: -15 }} className="relative z-10">
 <AlertCircle className="w-3.5 h-3.5 group-hover/alert:drop-shadow-md transition-all" />
 </motion.div>
 Mistake Analyzer
 </h4>
 <p className="text-xs dark:text-slate-300 text-slate-600 mt-1">
 {insights.mistakeInsight}
 </p>
 </div>
 <div className="p-4 dark:bg-black bg-slate-50 rounded-lg border border-blue-500/30">
 <h4 className="font-bold dark:text-blue-400 text-blue-700 mb-1 flex items-center gap-2 uppercase text-[11px] tracking-wider">
 <Target className="w-3.5 h-3.5" />
 {insights.consistencyAlert}
 </h4>
 <p className="text-xs dark:text-slate-300 text-slate-600 mt-1">
 {insights.consistencyInsight}
 </p>
 </div>
 <div className="p-4 dark:bg-black bg-slate-50 rounded-lg border border-purple-500/30">
 <h4 className="font-bold dark:text-purple-400 text-purple-700 mb-1 flex items-center gap-2 uppercase text-[11px] tracking-wider">
 <Clock className="w-3.5 h-3.5" />
 {insights.speedAlert}
 </h4>
 <p className="text-xs dark:text-slate-300 text-slate-600 mt-1">
 {insights.speedInsight}
 </p>
 </div>
 <div className="p-4 dark:bg-black bg-slate-50 rounded-lg border border-emerald-500/30">
 <h4 className="font-bold dark:text-emerald-400 text-emerald-700 mb-1 flex items-center gap-2 uppercase text-[11px] tracking-wider">
 <TrendingUp className="w-3.5 h-3.5" />
 Adaptive Core Action
 </h4>
 <p className="text-xs dark:text-slate-300 text-slate-600 mt-1">
 {insights.adaptiveAction}
 </p>
 </div>
 </CardContent>
 </Card>
 </motion.div>
 
 <div className="lg:col-span-2 space-y-6 w-full">
 <div className="flex items-center justify-between mb-4">
 <h2 className="text-xl font-bold tracking-tight dark:text-white text-slate-900 flex items-center gap-2">
 <TrendingUp className="w-5 h-5 dark:text-purple-400 text-purple-700" />
 Performance Trends
 </h2>
 <div className="flex items-center gap-1 dark:bg-slate-800 bg-slate-100/50 p-1 rounded-lg">
 {['All', 'Physics', 'Chemistry', 'Mathematics'].map(sub => (
 <button
 key={sub}
 onClick={() => setChartSubject(sub as any)}
 className={`px-3 py-1 rounded text-xs font-bold transition-all ${
 chartSubject === sub
 ? 'bg-blue-600 dark:text-white text-slate-900 shadow-sm'
 : 'bg-transparent dark:text-slate-400 text-slate-600 hover:dark:text-slate-200 text-slate-900 hover:bg-slate-700'
 }`}
 >
 {sub}
 </button>
 ))}
 </div>
 </div>

 <Card className="dark:bg-black bg-slate-50 dark:border-slate-800 border-slate-200">
 <CardHeader className="pb-2">
 <CardTitle className="dark:text-slate-200 text-slate-900 text-lg">Accuracy vs Speed (Last 7 Days)</CardTitle>
 </CardHeader>
 <CardContent className="h-64">
 {practiceSessions.length > 0 ? (
 <ResponsiveContainer width="100%" height="100%">
 <LineChart data={performanceData}>
 <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
 <XAxis dataKey="day" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
 <YAxis yAxisId="left" stroke="#22d3ee" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} />
 <YAxis yAxisId="right" orientation="right" stroke="#a855f7" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} />
 <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }} />
 <Legend wrapperStyle={{ fontSize: '12px' }} />
 <Line yAxisId="left" type="monotone" name="Accuracy %" dataKey="accuracy" stroke="#22d3ee" strokeWidth={3} dot={{ fill: '#0f172a', stroke: '#22d3ee', strokeWidth: 2, r: 4 }} activeDot={{ r: 6, fill: '#22d3ee' }} />
 <Line yAxisId="right" type="monotone" name="Speed Score" dataKey="speedScore" stroke="#a855f7" strokeWidth={3} dot={{ fill: '#0f172a', stroke: '#a855f7', strokeWidth: 2, r: 4 }} />
 </LineChart>
 </ResponsiveContainer>
 ) : (
 <div className="w-full h-full flex items-center justify-center text-slate-500 font-mono text-xs">No practice data recorded.</div>
 )}
 </CardContent>
 </Card>

 <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pb-2">
 <Card className="dark:bg-black bg-slate-50 dark:border-slate-800 border-slate-200">
 <CardHeader className="pb-2">
 <CardTitle className="dark:text-slate-200 text-slate-900 text-base">Mistake Categorization</CardTitle>
 </CardHeader>
 <CardContent className="h-60">
 {mistakeData.length > 0 ? (
 <ResponsiveContainer width="100%" height="100%">
 <PieChart>
 <Pie data={mistakeData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="value">
 {mistakeData.map((entry, index) => (
 <Cell key={`cell-${index}`} fill={entry.color} />
 ))}
 </Pie>
 <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }} />
 <Legend verticalAlign="bottom" height={40} wrapperStyle={{fontSize: '11px'}} />
 </PieChart>
 </ResponsiveContainer>
 ) : (
 <div className="w-full h-full flex items-center justify-center text-slate-500 font-mono text-xs">No mistakes logged yet.</div>
 )}
 </CardContent>
 </Card>

 <Card className="dark:bg-black bg-slate-50 dark:border-slate-800 border-slate-200">
 <CardHeader className="pb-2">
 <CardTitle className="dark:text-slate-200 text-slate-900 text-base">Active Chapter Trends</CardTitle>
 </CardHeader>
 <CardContent className="h-60">
 {chapterTrends.length > 0 ? (
 <ResponsiveContainer width="100%" height="100%">
 <BarChart data={chapterTrends} layout="vertical" margin={{ left: 5, right: 5 }}>
 <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
 <XAxis type="number" domain={[0, 100]} stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
 <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} width={110} tickLine={false} axisLine={false} tickFormatter={(val) => val.length > 15 ? val.substring(0, 15) + '...' : val} />
 {/* @ts-ignore */}
 <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }} cursor={{ fill: '#1e293b' }} />
 <Legend wrapperStyle={{fontSize: '11px'}} />
 <Bar dataKey="accuracy" name="Accuracy %" fill="#10b981" radius={[0, 4, 4, 0]} barSize={8} />
 <Bar dataKey="speed" name="Speed Score" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={8} />
 </BarChart>
 </ResponsiveContainer>
 ) : (
 <div className="w-full h-full flex items-center justify-center text-slate-500 font-mono text-xs">Complete a practice session.</div>
 )}
 </CardContent>
 </Card>
 </div>
 </div>
 
 {/* ADD RECENT LOGS SECTION TO INSIGHTS */}
 <motion.div variants={itemVariants} className="space-y-6 lg:col-span-3 pt-6 border-t dark:border-slate-800 border-slate-200/50">
 <Card className="dark:bg-black bg-slate-50 dark:border-slate-800 border-slate-200 h-full flex flex-col">
 <CardHeader className="pb-3 border-b dark:border-slate-800 border-slate-200/50">
 <CardTitle className="dark:text-slate-200 text-slate-900 text-sm flex items-center gap-2">
 <Clock className="w-4 h-4 dark:text-slate-400 text-slate-600" />
 Recent Practice Logs
 </CardTitle>
 </CardHeader>
 <CardContent className="flex-1 p-0 overflow-y-auto max-h-[600px] custom-scrollbar">
 {groupedRecentLogs.length > 0 ? (
 <div className="divide-y divide-slate-800">
 {groupedRecentLogs.map((group, idx) => {
 const totalAtt = group.reduce((sum, ps) => sum + ps.attempted, 0);
 const totalCorr = group.reduce((sum, ps) => sum + ps.correct, 0);
 const totalTime = group.reduce((sum, ps) => sum + ps.timeSpent, 0);
 const subject = group[0].subject;
 const date = group[0].date;
 const avgAcc = totalAtt > 0 ? Math.round((totalCorr / totalAtt) * 100) : 0;

 return (
 <div key={`idx-${idx}`} className="p-4 hover:dark:bg-slate-800 bg-slate-100/30 transition-colors">
 <div className="flex justify-between items-start mb-2">
 <div className="flex items-center gap-2">
 <span className="text-[10px] font-bold dark:text-slate-400 text-slate-600 uppercase tracking-wider">{subject}</span>
 <span className="text-[10px] text-slate-500">{new Date(date).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</span>
 </div>
 <span className="font-mono text-xs dark:text-blue-400 text-blue-700">{avgAcc}% Acc</span>
 </div>
 <div className="flex flex-wrap gap-1 mb-2">
 {group.map((ps, i) => (
 <span key={`i-${i}`} className="text-[10px] px-2 py-0.5 rounded dark:bg-slate-800 bg-slate-100 dark:text-slate-300 text-slate-600 border dark:border-slate-700 border-slate-300">
 {ps.chapter.length > 20 ? ps.chapter.substring(0, 20) + '...' : ps.chapter}
 </span>
 ))}
 </div>
 <div className="flex gap-4 text-xs font-mono dark:text-slate-400 text-slate-600">
 <span>{totalCorr}/{totalAtt} Qs</span>
 <span>{totalTime} mins</span>
 <span>{totalAtt > 0 ? Math.round(totalTime / totalAtt) : 0} m/Q</span>
 </div>
 </div>
 );
 })}
 </div>
 ) : (
 <div className="h-full w-full flex items-center justify-center p-8 text-slate-500 text-sm font-mono">No logs yet.</div>
 )}
 </CardContent>
 </Card>
 </motion.div>
 </motion.div>
 )}

 {activeTab === 'Tracker' && (
 <TourStep
 id="analytics-tracker"
 title="Growth Tracker"
 description="Monitor your trajectory, study hours, and XP progression over time. This helps visualize your long-term consistency."
 position="top"
 >
 <motion.div key="Tracker" variants={itemVariants} initial="hidden" animate="show" exit={{ opacity: 0, y: -20 }} className="w-full">
 <Card className="dark:bg-black bg-slate-50 dark:border-slate-800 border-slate-200 overflow-hidden relative">
 <div className="absolute -top-24 -right-24 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />
 <CardHeader className="border-b dark:border-slate-800 border-slate-200/50 pb-6 mb-6">
 <CardTitle className="text-2xl font-black dark:text-slate-100 text-slate-900 flex items-center gap-3">
 <Activity className="w-6 h-6 dark:text-blue-400 text-blue-700" />
 WEEKLY / MONTHLY GROWTH TRACKER
 </CardTitle>
 <CardDescription>Monitor your trajectory, study hours, and XP progression over time.</CardDescription>
 </CardHeader>
 <CardContent>
 <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
 <div className="lg:col-span-1 space-y-6">
 <div className="p-5 dark:bg-black bg-slate-50 rounded-xl border dark:border-slate-700 border-slate-300/50 relative overflow-hidden">
 <div className="absolute -top-8 -right-8 w-24 h-24 bg-blue-500/10 rounded-full blur-[40px] pointer-events-none" />
 <h4 className="text-xs font-bold dark:text-slate-400 text-slate-600 uppercase tracking-wide mb-1">XP This Week</h4>
 <div className="flex items-end justify-between">
 <span className="text-3xl font-black dark:text-blue-400 text-blue-700">{currentWeekXP}</span>
 <span className={`text-sm font-bold ${currentWeekXP >= lastWeekXP ? 'dark:text-emerald-400 text-emerald-700' : 'dark:text-rose-400 text-rose-700'}`}>
 {currentWeekXP >= lastWeekXP ? '+' : ''}{lastWeekXP > 0 ? Math.round(((currentWeekXP - lastWeekXP) / lastWeekXP) * 100) : 100}%
 </span>
 </div>
 <p className="text-[10px] text-slate-500 mt-2 font-mono">VS last week ({lastWeekXP} XP)</p>
 </div>

 <div className="p-5 dark:bg-black bg-slate-50 rounded-xl border dark:border-slate-700 border-slate-300/50 relative overflow-hidden">
 <div className="absolute -top-8 -right-8 w-24 h-24 bg-purple-500/10 rounded-full blur-[40px] pointer-events-none" />
 <h4 className="text-xs font-bold dark:text-slate-400 text-slate-600 uppercase tracking-wide mb-1">Hours This Week</h4>
 <div className="flex items-end justify-between">
 <span className="text-3xl font-black dark:text-purple-400 text-purple-700">{currentWeekHours}h</span>
 <span className={`text-sm font-bold ${currentWeekHours >= lastWeekHours ? 'dark:text-emerald-400 text-emerald-700' : 'dark:text-rose-400 text-rose-700'}`}>
 {currentWeekHours >= lastWeekHours ? '+' : ''}{lastWeekHours > 0 ? Math.round(((currentWeekHours - lastWeekHours) / lastWeekHours) * 100) : 100}%
 </span>
 </div>
 <p className="text-[10px] text-slate-500 mt-2 font-mono">VS last week ({lastWeekHours}h)</p>
 </div>

 <div className="mt-8">
 <h4 className="text-xs font-bold dark:text-slate-400 text-slate-600 uppercase tracking-wide mb-3 flex items-center gap-2">
 Intensity Heatmap (30 Days)
 </h4>
 <div className="flex flex-wrap gap-1.5 group">
 {heatmapData.map((day, i) => {
 const bgColors = [
 'dark:bg-slate-800 bg-slate-100/50 dark:border-slate-800 border-slate-200', 
 'bg-emerald-900/40 border-emerald-800/50', 
 'bg-emerald-700/50 border-emerald-500/50', 
 'bg-emerald-500/70 border-emerald-400', 
 'bg-emerald-400 drop-shadow-md border-emerald-300'
 ];
 let colorClass = bgColors[day.intensity];
 if (day.isMissed) colorClass = 'bg-rose-900/40 border-rose-800';
 
 return (
 <div 
 key={`i-${i}`} 
 className={`w-[1.2rem] h-[1.2rem] rounded-sm border text-center relative cursor-help transition-all hover:scale-125 hover:z-10 ${colorClass}`}
 title={`${day.date}\n${day.isMissed ? 'Missed: ' + day.missedReason : day.xp + ' XP'}`}
 >
 </div>
 );
 })}
 </div>
 </div>
 </div>

 <div className="lg:col-span-3 flex flex-col h-full">
 <h4 className="text-xs font-bold dark:text-slate-400 text-slate-600 uppercase tracking-wide flex items-center gap-2">
 Growth Activity Trajectory
 </h4>
 <div className="flex-1 min-h-[300px] mt-4">
 <ResponsiveContainer width="100%" height="100%">
 <BarChart data={trackerData}>
 <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
 <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
 <YAxis yAxisId="left" stroke="#a855f7" fontSize={11} tickLine={false} axisLine={false} hide />
 <YAxis yAxisId="right" orientation="right" stroke="#3b82f6" fontSize={11} tickLine={false} axisLine={false} />
 <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }} />
 <Legend wrapperStyle={{ fontSize: '12px', marginTop: '10px' }} />
 <Bar yAxisId="left" dataKey="hours" name="Hours Studied" fill="#a855f7" radius={[4, 4, 0, 0]} />
 <Line yAxisId="right" type="monotone" dataKey="xp" name="XP Earned" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#0f172a', stroke: '#3b82f6', strokeWidth: 2, r: 4 }} activeDot={{ r: 6, fill: '#3b82f6' }} />
 </BarChart>
 </ResponsiveContainer>
 </div>
 </div>
 </div>
 </CardContent>
 </Card>
 </motion.div>
 </TourStep>
 )}
 </AnimatePresence>

 <AnimatePresence>
 {isChapterModalOpen && (
 <motion.div 
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="fixed inset-0 z-50 dark:bg-black bg-slate-50 flex items-center justify-center p-4"
 onClick={() => setIsChapterModalOpen(false)}
 >
 <motion.div 
 initial={{ scale: 0.9, y: 20 }}
 animate={{ scale: 1, y: 0 }}
 exit={{ scale: 0.9, y: 20 }}
 onClick={(e) => e.stopPropagation()}
 className="dark:bg-slate-900 bg-white border dark:border-slate-700 border-slate-300 w-full max-w-2xl rounded-xl overflow-hidden shadow-lg relative max-h-[80vh] flex flex-col"
 >
 <div className="flex justify-between items-center p-4 border-b dark:border-slate-800 border-slate-200">
 <h2 className="text-lg font-bold dark:text-slate-100 text-slate-900 flex items-center gap-2">
 <BookOpen className="w-5 h-5 dark:text-blue-400 text-blue-700" />
 Select {subject} Chapters
 </h2>
 <button onClick={() => setIsChapterModalOpen(false)} className="text-slate-500 hover:dark:text-white text-slate-900 transition-colors">
 <X className="w-5 h-5" />
 </button>
 </div>
 <div className="p-3 border-b dark:border-slate-800 border-slate-200 dark:bg-slate-900/50 bg-white">
 <input 
 type="text" 
 placeholder="Search chapter..." 
 value={chapterSearch || ""}
 onChange={(e) => setChapterSearch(e.target.value)}
 className="w-full dark:bg-slate-800 bg-slate-100/80 border dark:border-slate-700 border-slate-300/50 rounded-lg p-2.5 dark:text-slate-200 text-slate-900 focus:border-blue-500 outline-none text-sm placeholder:text-slate-500 transition-colors"
 />
 </div>
 <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
 <div className="flex flex-wrap gap-2">
 {syllabus[subject]
 .filter((c: any) => c.name.toLowerCase().includes(chapterSearch.toLowerCase()))
 .map((c: any) => {
 const isSelected = selectedChapters.includes(c.name);
 return (
 <div 
 key={`${c.subject || Math.random()}-${c.name}`}
 onClick={() => setSelectedChapters(prev => isSelected ? prev.filter(x => x !== c.name) : [...prev, c.name])}
 className={`text-xs px-3 py-2 rounded-lg border cursor-pointer transition-all ${isSelected ? 'bg-blue-600/20 dark:text-blue-300 dark:text-blue-400 text-blue-700 border-blue-500 scale-105 shadow-lg' : 'dark:bg-slate-800 bg-slate-100/50 dark:text-slate-400 text-slate-600 dark:border-slate-700 border-slate-300 hover:border-slate-500 hover:dark:bg-slate-800 bg-slate-100'}`}
 >
 {c.name}
 </div>
 );
 })}
 </div>
 </div>
 <div className="p-4 border-t dark:border-slate-800 border-slate-200 dark:bg-slate-900/80 bg-white flex justify-between items-center">
 <span className="text-sm font-mono dark:text-slate-400 text-slate-600">{selectedChapters.length} selected</span>
 <Button onClick={() => setIsChapterModalOpen(false)} className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg">Done</Button>
 </div>
 </motion.div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 );
}
