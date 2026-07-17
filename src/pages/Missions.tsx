import { motion, AnimatePresence } from 'motion/react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { TiltWrapper } from '../components/TiltWrapper';
import { CheckCircle2, Circle, Activity, BrainCircuit, Target, AlertTriangle } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { TourStep, useTour } from '../components/TourGuide';
import { useEffect } from 'react';

import { markCalendarEventCompleted, updateGoogleTaskStatus } from '../lib/calendar';

export default function Missions() {
 const { todos, setTodos, pendingTasks, isLoaded } = useAppContext();
 const { activeStep, setActiveStep, hasCompleted } = useTour();

 useEffect(() => {
 if (isLoaded && !hasCompleted('missions-intro') && activeStep === null) {
 setTimeout(() => setActiveStep('missions-intro'), 500);
 }
 }, [isLoaded, hasCompleted, activeStep, setActiveStep]);

 const toggleQuest = (id: number) => {
   const task = todos.find(t => t.id === id);
   if (task) {
     if (task.calendarEventId) markCalendarEventCompleted(task.calendarEventId, !task.completed, task.text).catch(console.error);
     if (task.calendarTaskId) updateGoogleTaskStatus(task.calendarTaskId, !task.completed ? 'completed' : 'needsAction').catch(console.error);
   }
 setTodos(todos.map(q => {
 if (q.id === id) {
 return { ...q, completed: !q.completed };
 }
 return q;
 }));
 };

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
 transition: { type: "spring" as const, stiffness: 120, damping: 10 } 
 }
 };

 return (
 <div className="space-y-8 pb-12">
 <motion.header variants={itemVariants} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-50px" }} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
 <div>
 <h1 className="text-4xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r dark:from-white dark:to-slate-500 from-slate-900 to-slate-600">
 DAILY GOALS
 </h1>
 <p className="dark:text-cyan-400 text-cyan-700 font-mono text-sm mt-1 flex items-center gap-2">
 <BrainCircuit className="w-4 h-4" />
 YOUR STUDY PLAN
 </p>
 </div>
 </motion.header>

 {pendingTasks.filter(t => t.subject !== 'Personal').length > 0 && (
 <motion.div variants={itemVariants} className="space-y-4 mb-8">
 <h2 className="text-xl font-bold flex items-center gap-2 dark:text-rose-400 text-rose-700 uppercase tracking-widest">
 <AlertTriangle className="w-5 h-5" />
 Pending Backlog
 </h2>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {pendingTasks.filter(t => t.subject !== 'Personal').map((task) => (
 <Card key={`backlog-${task.id}`} className="border-rose-500/20 bg-rose-950/10">
 <CardContent className="p-4 flex gap-4">
 <AlertTriangle className="w-5 h-5 dark:text-rose-400 text-rose-700 shrink-0 opacity-50" />
 <div>
 <p className="dark:text-slate-300 text-slate-600 font-medium mb-1 line-through decoration-rose-500/50">{task.text}</p>
 <div className="flex gap-2">
 <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-rose-500/10 dark:text-rose-400 text-rose-700 border border-rose-500/20">{task.type}</span>
 <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-orange-500/10 dark:text-orange-400 text-orange-600 border border-orange-500/20">Missed</span>
 </div>
 </div>
 </CardContent>
 </Card>
 ))}
 </div>
 </motion.div>
 )}

 <motion.div variants={containerVariants} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-50px" }} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
 {/* Daily Quests */}
 <TourStep
 id="missions-intro"
 title="Daily Missions"
 description="These are the specific tasks you set up from the dashboard. Check them off as you complete them to earn XP and progress towards your daily goal."
 position="right"
 className="lg:col-span-2 space-y-4"
 >
 <motion.div variants={itemVariants} className="space-y-4">
 <h2 className="text-xl font-bold flex items-center gap-2 dark:text-slate-200 text-slate-900">
 <Target className="w-5 h-5 dark:text-cyan-400 text-cyan-700" />
 TODAY'S TARGETS
 </h2>
 {todos.filter(t => t.subject !== 'Personal').length === 0 ? (
 <Card className="dark:border-white/10 border-black/10 dark:bg-black bg-slate-50">
 <CardContent className="p-8 text-center dark:text-slate-400 text-slate-600">
 No tasks added for today. Add some from the Dashboard!
 </CardContent>
 </Card>
 ) : (
 todos.filter(t => t.subject !== 'Personal').map((quest) => (
 <motion.div
 key={`todo-${quest.id}`}
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 >
 <Card 
 className={`cursor-pointer transition-all duration-300 relative overflow-hidden ${
 quest.completed ? 'border-green-500/30 bg-green-500/5' : 'dark:border-white/10 border-black/10 dark:bg-black bg-slate-50 hover:border-cyan-500/50'
 }`}
 onClick={() => toggleQuest(quest.id)}
 >
 <AnimatePresence>
 {quest.completed && (
 <motion.div 
 key="completion-flash"
 className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-transparent z-0 pointer-events-none"
 initial={{ opacity: 0.8, scaleX: 0, originX: 0 }}
 animate={{ opacity: 0, scaleX: 1 }}
 exit={{ opacity: 0 }}
 transition={{ duration: 0.7, ease: "easeOut" }}
 />
 )}
 </AnimatePresence>
 <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
 <div className="flex items-start sm:items-center gap-4">
 <motion.div
 key={quest.completed ? 'checked' : 'unchecked'}
 initial={{ scale: quest.completed ? 1.5 : 0.9, rotate: quest.completed ? -15 : 0, opacity: 0 }}
 animate={{ scale: 1, rotate: 0, opacity: 1 }}
 transition={{ type: "spring", stiffness: 400, damping: 15, bounce: 0.6 }}
 className={quest.completed ? "dark:text-green-400 text-green-700" : "text-slate-500"}
 >
 {quest.completed ? (
 <CheckCircle2 className="w-6 h-6 drop-shadow-md shrink-0 mt-1 sm:mt-0" />
 ) : (
 <Circle className="w-6 h-6 shrink-0 mt-1 sm:mt-0" />
 )}
 </motion.div>
 <div>
 <span className={`text-lg font-medium block ${quest.completed ? 'text-slate-500 line-through' : 'dark:text-slate-200 text-slate-900'}`}>
 {quest.text}
 </span>
 <span className={`text-xs font-mono px-2 py-0.5 rounded-md mt-2 inline-block ${quest.completed ? 'opacity-50 grayscale' : ''} dark:text-cyan-400 text-cyan-700 bg-cyan-400/10`}>
 [{quest.type}]
 </span>
 </div>
 </div>
 <span className={`font-mono px-3 py-1 rounded-full text-sm font-bold shrink-0 ${quest.completed ? 'dark:text-green-400 text-green-700/50 bg-green-500/10' : 'dark:text-cyan-400 text-cyan-700 bg-cyan-400/10'}`}>
 +{quest.xpReward} XP
 </span>
 </CardContent>
 </Card>
 </motion.div>
 ))
 )}
 </motion.div>
 </TourStep>

 {/* Redemption System & Urgency */}
 <motion.div variants={itemVariants} className="space-y-6">
 <TiltWrapper tiltAmount={4}>
 <Card className="border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-transparent relative overflow-hidden transition-all duration-300">
 <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-500/15 rounded-full blur-[60px] pointer-events-none" />
 <CardHeader>
 <CardTitle className="flex items-center gap-2 dark:text-blue-400 text-blue-700">
 <Activity className="w-5 h-5" />
 CONSISTENCY TRACKER
 </CardTitle>
 </CardHeader>
 <CardContent>
 <p className="text-sm dark:text-slate-300 text-slate-600 mb-4">
 You missed a high-priority task yesterday. Completing a review session today will help you stay on track and maintain your streak.
 </p>
 <div className="dark:bg-black bg-slate-50 p-4 rounded-lg border border-blue-500/50 mb-4 shadow-md">
 <p className="font-bold dark:text-slate-200 text-slate-900">Review 30 Mechanics Concepts</p>
 <div className="flex justify-between mt-2 text-xs font-mono">
 <span className="dark:text-slate-400 text-slate-600">Status: Review Pending</span>
 <span className="dark:text-green-400 text-green-700">Reward: Streak Restored</span>
 </div>
 </div>
 <Button variant="outline" className="w-full font-bold tracking-widest border-blue-500/50 dark:text-blue-400 text-blue-700 hover:bg-blue-500/10 hover:shadow-md transition-all">
 START REVIEW SESSION
 </Button>
 </CardContent>
 </Card>
 </TiltWrapper>
 </motion.div>
 </motion.div>
 </div>
 );
}
