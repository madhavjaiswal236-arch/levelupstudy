import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { CheckSquare, Activity, Target, Plus, Trash2, Shield, Moon, Smartphone, Clock, Sparkles } from 'lucide-react';
import { useAppContext, MonthlyGoal, Habit } from '../context/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TourStep, useTour } from '@/components/TourGuide';

const Protocols = React.memo(function Protocols() {
 const { 
 monthlyGoals, setMonthlyGoals, 
 habits, setHabits, 
 lifeMetrics, setLifeMetrics,
 class11EndDate,
 totalXpGoal,
 xp,
 xpGainedToday,
 isLoaded
 } = useAppContext();

 const { activeStep, setActiveStep, hasCompleted } = useTour();

 useEffect(() => {
 if (isLoaded && !hasCompleted('protocols-intro') && activeStep === null) {
 setTimeout(() => setActiveStep('protocols-intro'), 500);
 }
 }, [isLoaded, hasCompleted, activeStep, setActiveStep]);

 const [newGoalText, setNewGoalText] = useState('');
 const [newHabitName, setNewHabitName] = useState('');

 // Dynamic calculation for target study hours based on remaining days and syllabus/XP
 const daysLeft = useMemo(() => {
   if (class11EndDate) {
     const diff = Math.ceil((new Date(class11EndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
     return Math.max(1, diff);
   }
   const defaultTarget = new Date('2026-05-01').getTime();
   const diff = Math.ceil((defaultTarget - Date.now()) / (1000 * 60 * 60 * 24));
   return Math.max(1, diff);
 }, [class11EndDate]);

 // Target daily hours calibrated to automatically suggest/enforce at least 8 hours
 const autoTargetDailyHours = useMemo(() => {
   const remainingXp = Math.max(0, (totalXpGoal || 800000) - (xp - xpGainedToday));
   const calculatedHours = (remainingXp / daysLeft) / 300;
   return Math.max(8, Math.round(calculatedHours));
 }, [totalXpGoal, xp, xpGainedToday, daysLeft]);

 const handleApplyAutoGoal = () => {
   const autoGoalText = `Complete ${autoTargetDailyHours} Hours of Focused JEE Study Daily (${daysLeft} Days Remaining)`;
   if (!monthlyGoals.some(g => g.text.includes(`${autoTargetDailyHours} Hours`))) {
     const newGoal: MonthlyGoal = {
       id: Date.now().toString(),
       text: autoGoalText,
       completed: false
     };
     setMonthlyGoals([newGoal, ...monthlyGoals]);
   }
 };

 // --- Monthly Goals Handlers ---
 const handleAddGoal = (e: React.FormEvent) => {
 e.preventDefault();
 if (!(newGoalText || "").trim()) return;
 const newGoal: MonthlyGoal = {
 id: Date.now().toString(),
 text: (newGoalText || "").trim(),
 completed: false
 };
 setMonthlyGoals([...monthlyGoals, newGoal]);
 setNewGoalText('');
 };

 const toggleGoal = (id: string) => {
 setMonthlyGoals(monthlyGoals.map(g => 
 g.id === id ? { ...g, completed: !g.completed } : g
 ));
 };

 const deleteGoal = (id: string) => {
 setMonthlyGoals(monthlyGoals.filter(g => g.id !== id));
 };

 // --- Habit Tracker Handlers ---
 const handleAddHabit = (e: React.FormEvent) => {
 e.preventDefault();
 if (!(newHabitName || "").trim()) return;
 const newHabit: Habit = {
 id: Date.now().toString(),
 name: (newHabitName || "").trim(),
 completedDays: []
 };
 setHabits([...habits, newHabit]);
 setNewHabitName('');
 };

 const toggleHabitDay = (habitId: string, day: number) => {
 setHabits(habits.map(h => {
 if (h.id === habitId) {
 const isCompleted = h.completedDays.includes(day);
 const newCompletedDays = isCompleted 
 ? h.completedDays.filter(d => d !== day)
 : [...h.completedDays, day];
 return { ...h, completedDays: newCompletedDays };
 }
 return h;
 }));
 };

 const deleteHabit = (id: string) => {
 setHabits(habits.filter(h => h.id !== id));
 };

 // --- Life Metrics Handlers ---
 const updateMetric = (day: number, field: 'sleep' | 'screenTime', value: number) => {
 setLifeMetrics(lifeMetrics.map(m => 
 m.day === day ? { ...m, [field]: value } : m
 ));
 };

 const currentDay = new Date().getDate(); // Assuming current month for simplicity

 return (
 <div className="space-y-8 pb-12">
 <header>
 <h1 className="text-4xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r dark:from-white dark:to-slate-500 from-slate-900 to-slate-600 flex items-center gap-3">
 <Shield className="w-10 h-10 dark:text-cyan-400 text-cyan-700" />
 DISCIPLINE PROTOCOLS
 </h1>
 <p className="dark:text-cyan-400 text-cyan-700 font-mono text-sm mt-1 flex items-center gap-2">
 <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse shadow-md" />
 LIFE OPERATING SYSTEM ONLINE
 </p>
 </header>

 {/* SECTION 1: Monthly Directives (Goals) */}
 <Card className="border-cyan-500/30 dark:bg-black bg-slate-50 relative overflow-hidden group">
 <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/5 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-all duration-1000 -translate-x-full group-hover:translate-x-full ease-in-out pointer-events-none z-20" />
 <CardHeader className="border-b dark:border-white/5 border-black/5 pb-4 relative z-10 group/header">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
   <CardTitle className="text-xl font-bold flex items-center gap-2 dark:text-cyan-400 text-cyan-700 uppercase tracking-widest">
     <motion.div whileHover={{ scale: 1.2, rotate: 15 }} className="relative">
       <Target className="w-5 h-5 group-hover/header:drop-shadow-md transition-all" />
     </motion.div>
     Monthly Directives
   </CardTitle>
   <div className="flex items-center gap-2">
     <span className="text-xs font-mono dark:text-cyan-300 text-cyan-700 font-bold bg-cyan-500/10 border border-cyan-500/30 px-2.5 py-1 rounded-full flex items-center gap-1.5">
       <Clock className="w-3.5 h-3.5" />
       Optimal Target: <span className="text-emerald-400 font-black">{autoTargetDailyHours} hrs/day</span> ({daysLeft}d left)
     </span>
   </div>
 </div>
 </CardHeader>
 <CardContent className="p-6 relative z-10">
 <div className="mb-6 p-4 rounded-xl border border-cyan-500/30 dark:bg-cyan-950/20 bg-cyan-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
   <div className="flex items-center gap-3">
     <div className="p-2.5 bg-cyan-500/20 rounded-lg text-cyan-400 shrink-0">
       <Sparkles className="w-5 h-5" />
     </div>
     <div>
       <p className="text-xs font-bold font-mono uppercase tracking-wider dark:text-cyan-300 text-cyan-800">
         Calibrated Study Protocol
       </p>
       <p className="text-xs dark:text-slate-300 text-slate-700">
         Based on {daysLeft} days remaining, your target is automatically set to <strong className="text-cyan-400">{autoTargetDailyHours} hours</strong> of daily focused study.
       </p>
     </div>
   </div>
   <Button
     type="button"
     size="sm"
     onClick={handleApplyAutoGoal}
     className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold uppercase tracking-wider shrink-0"
   >
     Adopt Auto-Goal
   </Button>
 </div>

 <form onSubmit={handleAddGoal} className="flex gap-3 mb-6">
 <input
 type="text"
 value={newGoalText}
 onChange={(e) => setNewGoalText(e.target.value)}
 placeholder="Enter a new goal for this month..."
 className="flex-1 dark:bg-black bg-slate-50 border dark:border-slate-700 border-slate-300 rounded-lg px-4 py-3 dark:text-white text-slate-900 focus:border-cyan-500 outline-none transition-colors"
 />
 <Button type="submit" variant="default" className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 group/add">
 <motion.div whileHover={{ scale: 1.2, rotate: 90 }} className="relative">
 <Plus className="w-5 h-5 group-hover/add:drop-shadow-md transition-all" />
 </motion.div>
 </Button>
 </form>

 <div className="space-y-3">
 {monthlyGoals.length === 0 ? (
 <p className="text-slate-500 text-center py-4 italic">No directives set. Define your mission.</p>
 ) : (
 monthlyGoals.map(goal => (
 <motion.div 
 key={goal.id}
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 className={`flex items-center justify-between p-4 rounded-lg border transition-all ${
 goal.completed 
 ? 'bg-emerald-500/10 border-emerald-500/30 dark:text-emerald-400 text-emerald-700/70' 
 : 'dark:bg-slate-900/50 bg-white dark:border-slate-700 border-slate-300 dark:text-slate-200 text-slate-900 hover:border-cyan-500/50'
 }`}
 >
 <div className="flex items-center gap-4 flex-1 cursor-pointer" onClick={() => toggleGoal(goal.id)}>
 <div className={`w-6 h-6 rounded flex items-center justify-center border ${
 goal.completed ? 'bg-emerald-500 border-emerald-500' : 'border-slate-500'
 }`}>
 {goal.completed && <CheckSquare className="w-4 h-4 text-black" />}
 </div>
 <span className={`text-lg font-medium ${goal.completed ? 'line-through' : ''}`}>
 {goal.text}
 </span>
 </div>
 <button onClick={() => deleteGoal(goal.id)} className="text-slate-500 hover:dark:text-red-400 text-red-700 transition-colors p-2">
 <Trash2 className="w-5 h-5" />
 </button>
 </motion.div>
 ))
 )}
 </div>
 </CardContent>
 </Card>

 {/* SECTION 2: The Protocol Grid (Habit Tracker) */}
 <TourStep
 id="protocols-intro"
 title="The Protocol Grid"
 description="Establish daily habits to build relentless discipline. Track your streaks over a rolling 30-day period. Discipline equals freedom."
 position="top"
 >
 <Card className="border-purple-500/30 dark:bg-black bg-slate-50 relative overflow-hidden group">
 <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/5 to-cyan-500/0 opacity-0 group-hover:opacity-100 transition-all duration-1000 -translate-x-full group-hover:translate-x-full ease-in-out pointer-events-none z-20" />
 <CardHeader className="border-b dark:border-white/5 border-black/5 pb-4 relative z-10 flex flex-row items-center justify-between group/header">
 <CardTitle className="text-xl font-bold flex items-center gap-2 dark:text-purple-400 text-purple-700 uppercase tracking-widest">
 <motion.div whileHover={{ scale: 1.2, rotate: -15 }} className="relative">
 <CheckSquare className="w-5 h-5 group-hover/header:drop-shadow-md transition-all" />
 </motion.div>
 Protocol Grid (30 Days)
 </CardTitle>
 </CardHeader>
 <CardContent className="p-6 relative z-10">
 <form onSubmit={handleAddHabit} className="flex gap-3 mb-6">
 <input
 type="text"
 value={newHabitName}
 onChange={(e) => setNewHabitName(e.target.value)}
 placeholder="New Habit (e.g., Workout, Read)"
 className="flex-1 dark:bg-black bg-slate-50 border dark:border-slate-700 border-slate-300 rounded-lg px-4 py-2 dark:text-white text-slate-900 focus:border-purple-500 outline-none transition-colors"
 />
 <Button type="submit" variant="default" className="bg-purple-600 hover:bg-purple-500 text-white">
 Add Habit
 </Button>
 </form>

 <div className="pb-4 w-full">
 {habits.length === 0 ? (
 <p className="text-slate-500 text-center py-8 italic">No protocols established. Build your routine.</p>
 ) : (
 <div className="w-full">
 <div className="flex mb-2 w-full">
 <div className="w-24 sm:w-32 md:w-40 shrink-0"></div>
 <div className="flex flex-1 gap-0.5 sm:gap-1">
 {Array.from({ length: 30 }, (_, i) => (
 <div key={`i-${i}`} className={`flex-1 text-center text-[8px] sm:text-[10px] font-mono ${i + 1 === currentDay ? 'dark:text-cyan-400 text-cyan-700 font-bold' : 'text-slate-500'}`}>
 {i + 1}
 </div>
 ))}
 </div>
 </div>

 <div className="space-y-2 w-full">
 {habits.map(habit => (
 <div key={habit.id} className="flex items-center hover:bg-white rounded-lg transition-colors p-1 w-full">
 <div className="w-24 sm:w-32 md:w-40 shrink-0 flex items-center justify-between pr-2 sm:pr-4">
 <span className="font-medium dark:text-slate-200 text-slate-900 text-xs sm:text-sm truncate pr-1 sm:pr-2" title={habit.name}>{habit.name}</span>
 <button onClick={() => deleteHabit(habit.id)} className="text-slate-600 hover:dark:text-red-400 text-red-700 shrink-0">
 <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
 </button>
 </div>
 <div className="flex flex-1 gap-0.5 sm:gap-1">
 {Array.from({ length: 30 }, (_, i) => {
 const day = i + 1;
 const isCompleted = habit.completedDays.includes(day);
 return (
 <button
 key={day}
 onClick={() => toggleHabitDay(habit.id, day)}
 className={`flex-1 aspect-square rounded-[2px] sm:rounded flex items-center justify-center transition-all ${
 isCompleted 
 ? 'bg-cyan-500/20 border border-cyan-400 shadow-md' 
 : 'dark:bg-slate-900 bg-white border dark:border-slate-800 border-slate-200 hover:border-slate-600'
 }`}
 >
 {isCompleted && <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-cyan-400" />}
 </button>
 );
 })}
 </div>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 </CardContent>
 </Card>
 </TourStep>

 {/* SECTION 3: Life Metrics */}
 <Card className="border-blue-500/30 dark:bg-black bg-slate-50 relative overflow-hidden group">
 <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-cyan-500/0 opacity-0 group-hover:opacity-100 transition-all duration-1000 -translate-x-full group-hover:translate-x-full ease-in-out pointer-events-none z-20" />
 <CardHeader className="border-b dark:border-white/5 border-black/5 pb-4 relative z-10 group/header">
 <CardTitle className="text-xl font-bold flex items-center gap-2 dark:text-blue-400 text-blue-700 uppercase tracking-widest">
 <motion.div whileHover={{ scale: 1.2, rotate: 15 }} className="relative">
 <Activity className="w-5 h-5 group-hover/header:drop-shadow-md transition-all" />
 </motion.div>
 Life Metrics Analytics
 </CardTitle>
 </CardHeader>
 <CardContent className="p-6 relative z-10">
 
 {/* Daily Input Area */}
 <div className="dark:bg-slate-900/50 bg-white border dark:border-slate-800 border-slate-200 rounded-xl p-4 mb-8 flex flex-col sm:flex-row items-center gap-6">
 <div className="dark:text-slate-300 text-slate-600 font-medium whitespace-nowrap">
 Log Today (Day {currentDay}):
 </div>
 <div className="flex items-center gap-3">
 <Moon className="w-5 h-5 dark:text-purple-400 text-purple-700" />
 <input 
 type="number" 
 min="0" max="24" step="0.5"
 placeholder="Sleep (hrs)"
 value={lifeMetrics[currentDay - 1]?.sleep ?? ''}
 onChange={(e) => updateMetric(currentDay, 'sleep', parseFloat(e.target.value) || 0)}
 className="w-24 dark:bg-black bg-slate-50 border dark:border-slate-700 border-slate-300 rounded-lg px-3 py-2 dark:text-white text-slate-900 focus:border-purple-500 outline-none"
 />
 </div>
 <div className="flex items-center gap-3">
 <Smartphone className="w-5 h-5 dark:text-orange-400 text-orange-600" />
 <input 
 type="number" 
 min="0" max="24" step="0.5"
 placeholder="Screen (hrs)"
 value={lifeMetrics[currentDay - 1]?.screenTime ?? ''}
 onChange={(e) => updateMetric(currentDay, 'screenTime', parseFloat(e.target.value) || 0)}
 className="w-24 dark:bg-black bg-slate-50 border dark:border-slate-700 border-slate-300 rounded-lg px-3 py-2 dark:text-white text-slate-900 focus:border-orange-500 outline-none"
 />
 </div>
 </div>

 {/* Chart */}
 <div className="h-[300px] w-full mt-4">
 <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
 <LineChart data={lifeMetrics} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
 <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
 <XAxis 
 dataKey="day" 
 stroke="#94a3b8" 
 tick={{ fill: '#94a3b8', fontSize: 12 }}
 tickLine={false}
 axisLine={false}
 />
 <YAxis 
 stroke="#94a3b8" 
 tick={{ fill: '#94a3b8', fontSize: 12 }}
 tickLine={false}
 axisLine={false}
 domain={[0, 16]}
 />
 <Tooltip 
 contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
 itemStyle={{ color: '#e2e8f0' }}
 />
 <Legend wrapperStyle={{ paddingTop: '20px' }} />
 <Line 
 type="monotone" 
 dataKey="sleep" 
 name="Sleep (hrs)" 
 stroke="#a855f7" 
 strokeWidth={3}
 dot={{ r: 4, fill: '#a855f7', strokeWidth: 0 }}
 activeDot={{ r: 6, fill: '#c084fc' }}
 />
 <Line 
 type="monotone" 
 dataKey="screenTime" 
 name="Screen Time (hrs)" 
 stroke="#f97316" 
 strokeWidth={3}
 dot={{ r: 4, fill: '#f97316', strokeWidth: 0 }}
 activeDot={{ r: 6, fill: '#fb923c' }}
 />
 </LineChart>
 </ResponsiveContainer>
 </div>
 </CardContent>
 </Card>
 </div>
 );
});

export default Protocols;
