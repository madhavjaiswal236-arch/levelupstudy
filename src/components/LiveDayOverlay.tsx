import React, { useMemo } from "react";
import { motion } from "motion/react";
import {
 X,
 Target,
 Zap,
 Clock,
 BrainCircuit,
 Play,
 CheckCircle2,
 ListTodo,
 Plus,
} from "lucide-react";
import { useAppContext } from "@/context/AppContext";

interface LiveDayOverlayProps {
 onClose: () => void;
}

export function LiveDayOverlay({ onClose }: LiveDayOverlayProps) {
 const {
 xpGainedToday,
 hoursStudiedToday,
 questionsSolved,
 todos,
 setTodos,
 loggedTasksToday,
 dailyTarget,
 playerName,
 lifeMetrics,
 xp,
 class11EndDate
 } = useAppContext();

 const class11EndTimestamp = class11EndDate ? new Date(class11EndDate).getTime() : 0;
 const daysUntilExam = Math.max(1, Math.ceil((class11EndTimestamp - Date.now()) / (1000 * 3600 * 24)));
 const totalXpRequired = (800000 - xp);
 const dailyXpRequired = class11EndDate ? Math.max(100, Math.ceil(totalXpRequired / daysUntilExam)) : dailyTarget;

 // Combine all activities of the day
 const timelineEvents = useMemo(() => {
 const events: any[] = [];

 // Created tasks today
 todos.forEach((t) => {
 const taskDate = new Date(t.id);
 if (taskDate.toDateString() === new Date().toDateString()) {
 events.push({
 time: taskDate,
 type: "created",
 title: t.text,
 subject: t.subject,
 icon: ListTodo,
 color: "dark:text-blue-400 text-blue-700",
 });
 }

 // Completed tasks today (assuming completion time is near when they were marked, but we don't store exact completion time in basic task, so we'll approximate or just use loggedTasksToday)
 });

 // Logged sessions today
 loggedTasksToday.forEach((log) => {
 events.push({
 time: new Date(log.id),
 type: "completed",
 title: log.text || `${log.subject} - ${log.chapter} (${log.type})`,
 subject: log.subject,
 icon: CheckCircle2,
 color: "dark:text-emerald-400 text-emerald-700",
 xp: log.xpReward,
 });
 });

 events.sort((a, b) => b.time.getTime() - a.time.getTime()); // newest first
 return events;
 }, [todos, loggedTasksToday]);

 const pendingToday = useMemo(() => todos.filter(
 (t) =>
 !t.completed &&
 new Date(t.id).toDateString() === new Date().toDateString(),
 ), [todos]);

 // AI Coach Analysis logic (Enhanced)
 const progressPercent = dailyXpRequired > 0 ? (xpGainedToday / dailyXpRequired) * 100 : 0;
 const xpRemaining = Math.max(0, dailyXpRequired - xpGainedToday);
 
 const todayMetric = lifeMetrics.find(m => m.day === new Date().getDate()) || { sleep: 0, screenTime: 0 };
 const sleep = todayMetric.sleep;
 const screen = todayMetric.screenTime;

 // Plan Execution
 const plannedTasks = todos.length;
 const completedTasks = todos.filter(t => t.completed).length;

 // Output Quality
 // Calculate total output score: 1 question = 1 point, 1 task = 10 points, 1 logged session = 15 points
 const outputScore = questionsSolved + (completedTasks * 10) + (loggedTasksToday.length * 15);
 const outputPerHour = hoursStudiedToday > 0 ? (outputScore / hoursStudiedToday) : 0;
 
 const lectureHours = loggedTasksToday.filter(t => t.type === 'Lecture' || t.type === 'Theory').reduce((acc, t) => acc + (t.lectureHours || 0), 0);

 // Severity Scoring
 let severity = 5;
 
 // XP Progress
 if (progressPercent >= 100) severity -= 2;
 else if (progressPercent >= 50) severity -= 1;
 else if (progressPercent === 0) severity += 3;
 else if (progressPercent < 25) severity += 2;

 let flags: string[] = [];

 // Fake work vs Lecture Heavy
 if (hoursStudiedToday > 1 && outputPerHour < 15) {
 if (lectureHours > hoursStudiedToday * 0.5) {
 severity += 1;
 flags.push('lecture_heavy');
 } else {
 severity += 2;
 flags.push('fake_work');
 }
 }

 // Sleep sabotage
 if (sleep > 0 && sleep < 6) {
 severity += 1;
 flags.push('sleep_sabotage');
 }

 // Dopamine drift
 if (screen > 4) {
 severity += 1;
 flags.push('dopamine_drift');
 }

 severity = Math.max(1, Math.min(10, severity));

 let mentorHeading = "";
 if (severity <= 2) mentorHeading = "DOMINATION. BUT THE WAR ISN'T OVER.";
 else if (severity <= 4) mentorHeading = "STEADY. DON'T CONFUSE MOTION WITH PROGRESS.";
 else if (severity <= 6) mentorHeading = "YOU'RE BLEEDING THE DAY. WAKE UP.";
 else if (severity <= 8) mentorHeading = "SELF-SABOTAGE IN PROGRESS.";
 else mentorHeading = "YOU SURRENDERED. PROVE YOU'RE NOT DONE.";

 // Cold Numbers
 let coldNumbers = `XP: ${Math.floor(xpGainedToday)}/${dailyXpRequired} (${Math.min(100, Math.floor(progressPercent))}%). Study: ${hoursStudiedToday.toFixed(1)}h. Tasks: ${completedTasks}/${plannedTasks}. Sleep: ${sleep}h. Screen: ${screen}h. Questions solved: ${questionsSolved}.`;

 // Wounds
 let woundText = "";
 if (flags.includes('lecture_heavy')) {
 woundText += `${hoursStudiedToday.toFixed(1)}h of study, but mostly just watching lectures. Passive learning feels like work, but active practice gets you the rank. `;
 } else if (flags.includes('fake_work')) {
 woundText += `${hoursStudiedToday.toFixed(1)}h of 'study' but dangerously low output (few questions/tasks completed). That's mental jogging, not training. Hours without output is vanity. `;
 }
 if (flags.includes('dopamine_drift')) {
 woundText += `${screen}h of screen time burned your focus before you even opened a book. Cheap dopamine beats your dream every time you let it. `;
 }
 if (flags.includes('sleep_sabotage')) {
 woundText += `${sleep}h of sleep is cognitive decay. You're grinding with a blunt blade. `;
 }

 if (woundText === "") {
 woundText = "You're on track, but the margin for error is zero. Don't coast.";
 }

 // Verdict
 let verdictText = "";
 if (severity <= 2) verdictText = "Today was a victory. But the IIT list is full of one-day champions. Come back tomorrow and do it again.";
 else if (severity <= 4) verdictText = "Acceptable, not exceptional. The next rank requires you to stretch the acceptable into the savage.";
 else if (severity <= 6) verdictText = "This is a day that will quietly kill your rank. Fix it before the sun sets, or let it stain your week.";
 else if (severity <= 8) verdictText = "You are actively eroding your own potential. This isn't a bad day—it's a choice to stay comfortable.";
 else verdictText = "You stepped out of the ring today. The exam doesn't care. The only thing that matters now is whether you get back in tomorrow.";

 // Prescription
 let missionText = "";
 if (flags.includes('lecture_heavy')) {
 missionText = "Tomorrow's first session must be pure practice. No lectures, no theory. Just problems and you. Minimum 30 questions before touching a video.";
 } else if (flags.includes('fake_work')) {
 missionText = "Starting your next session, track only output. I want 20 questions or 2 major tasks completed per hour. Any hour below that doesn't count.";
 } else if (severity >= 9) {
 missionText = "Your only job tomorrow is to win a single 30-minute block. One DPP. Phone out of the room. Build from that tiny win.";
 } else {
 missionText = `Sustain the rhythm. Target ${hoursStudiedToday + 1}h of deep work, with a non-negotiable 90-minute block on your weakest topic.`;
 }
 if (screen > 3) {
 missionText += " Phone locked/outside room until the first 90-minute block is complete.";
 }

 // Goggins Push
 const pushLibrary = [
 "Stay hard.",
 "The mirror. That's your only enemy.",
 "One more day of savage discipline, or one more day closer to regret. Choose.",
 "Your family's sacrifice doesn't pay for comfort. Go earn it."
 ];
 const pushText = pushLibrary[Math.floor(Math.random() * pushLibrary.length)];

 const finalMentorText = `${coldNumbers}\n\n${woundText}\n\nVerdict: ${verdictText}\n\nMission for tomorrow: ${missionText}\n\n${pushText}`;

 return (
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 transition={{ duration: 0.2 }}
 className="fixed inset-0 z-[10000] dark:bg-black bg-slate-50 flex items-center justify-center p-4 md:p-8"
 >
 <motion.div
 initial={{ y: 20, opacity: 0, scale: 0.95 }}
 animate={{ y: 0, opacity: 1, scale: 1 }}
 exit={{ y: 20, opacity: 0, scale: 0.95 }}
 transition={{ type: "spring", stiffness: 400, damping: 30 }}
 className="w-full max-w-5xl relative dark:bg-[#0a0f16] bg-white border border-cyan-500/30 rounded-3xl shadow-md flex flex-col max-h-[95vh] md:max-h-[90vh]"
 >
 <button
 onClick={onClose}
 className="absolute top-4 right-4 md:top-6 md:right-6 p-2 dark:bg-slate-800 bg-slate-100/50 hover:bg-slate-700 dark:text-slate-400 text-slate-600 hover:text-white rounded-full transition-all border dark:border-slate-700 border-slate-300/50 z-20"
 >
 <X className="w-5 h-5" />
 </button>

 <div className="overflow-y-auto custom-scrollbar p-6 md:p-10 relative z-10 w-full h-full">
 <motion.div
 initial={{ y: 10, opacity: 0 }}
 animate={{ y: 0, opacity: 1 }}
 transition={{ type: "spring", bounce: 0.4, delay: 0.1 }}
 className="text-left mb-8 relative flex items-center gap-6 border-b dark:border-slate-800 border-slate-200 pb-6"
 >
 <div className="absolute top-1/2 left-0 -translate-y-1/2 w-36 h-36 bg-cyan-500/10 rounded-full blur-[50px] pointer-events-none" />
 <div className="inline-flex items-center justify-center p-3 rounded-2xl dark:bg-slate-900 bg-white border border-cyan-500/30 shadow-md shrink-0">
 <Zap className="w-8 h-8 dark:text-cyan-400 text-cyan-700" />
 </div>
 <div>
 <h1 className="text-3xl md:text-4xl font-black dark:text-white text-slate-900 uppercase tracking-widest mb-1">
 Live Day{" "}
 <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
 Telemetry
 </span>
 </h1>
 <p className="dark:text-slate-400 text-slate-600 text-sm uppercase tracking-wider font-bold">
 Real-time performance analysis
 </p>
 </div>
 </motion.div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
 {/* XP Box */}
 <motion.div
 initial={{ scale: 0.9, opacity: 0 }}
 animate={{ scale: 1, opacity: 1 }}
 transition={{ delay: 0.2 }}
 className="dark:bg-slate-900/80 bg-white border dark:border-slate-700 border-slate-300/50 rounded-2xl p-6 relative overflow-hidden flex flex-col items-center justify-center text-center"
 >
 <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-blue-500" />
 <Target className="w-8 h-8 dark:text-cyan-400 text-cyan-700 mb-3 opacity-80" />
 <p className="text-sm dark:text-slate-400 text-slate-600 font-bold uppercase tracking-widest mb-1">
 XP Harvested
 </p>
 <h2 className="text-4xl font-black dark:text-white text-slate-900 drop-shadow-md">
 {Math.floor(xpGainedToday).toLocaleString()}
 </h2>
 </motion.div>

 {/* Time Box */}
 <motion.div
 initial={{ scale: 0.9, opacity: 0 }}
 animate={{ scale: 1, opacity: 1 }}
 transition={{ delay: 0.3 }}
 className="dark:bg-slate-900/80 bg-white border dark:border-slate-700 border-slate-300/50 rounded-2xl p-6 relative overflow-hidden flex flex-col items-center justify-center text-center"
 >
 <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500" />
 <Clock className="w-8 h-8 dark:text-purple-400 text-purple-700 mb-3 opacity-80" />
 <p className="text-sm dark:text-slate-400 text-slate-600 font-bold uppercase tracking-widest mb-1">
 Time on Target
 </p>
 <h2 className="text-4xl font-black dark:text-white text-slate-900 drop-shadow-md">
 {hoursStudiedToday.toFixed(1)}
 <span className="text-xl text-slate-500 ml-1">hrs</span>
 </h2>
 </motion.div>

 {/* Tasks Box */}
 <motion.div
 initial={{ scale: 0.9, opacity: 0 }}
 animate={{ scale: 1, opacity: 1 }}
 transition={{ delay: 0.4 }}
 className="dark:bg-slate-900/80 bg-white border dark:border-slate-700 border-slate-300/50 rounded-2xl p-6 relative overflow-hidden flex flex-col items-center justify-center text-center"
 >
 <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-green-500" />
 <CheckCircle2 className="w-8 h-8 dark:text-emerald-400 text-emerald-700 mb-3 opacity-80" />
 <p className="text-sm dark:text-slate-400 text-slate-600 font-bold uppercase tracking-widest mb-1">
 Objectives Cleared
 </p>
 <h2 className="text-4xl font-black dark:text-white text-slate-900 drop-shadow-md">
 {loggedTasksToday.length}
 </h2>
 </motion.div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
 {/* Mentor Analysis */}
 <motion.div
 initial={{ x: -20, opacity: 0 }}
 animate={{ x: 0, opacity: 1 }}
 transition={{ delay: 0.5 }}
 className="bg-gradient-to-b from-blue-950/40 to-slate-900/80 border border-blue-500/30 rounded-3xl p-6 md:p-8 relative overflow-hidden"
 >
 <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-[90px] -translate-y-1/3 translate-x-1/4 pointer-events-none" />

 <div className="flex items-center gap-4 mb-6">
 <div className="w-12 h-12 rounded-full bg-blue-900/50 border border-blue-500/50 flex items-center justify-center">
 <BrainCircuit className="w-6 h-6 dark:text-blue-400 text-blue-700" />
 </div>
 <div>
 <h3 className="text-sm font-bold dark:text-blue-400 text-blue-700 uppercase tracking-widest">
 Mentor Review
 </h3>
 <p className="text-xl font-black dark:text-white text-slate-900 tracking-wide">
 {mentorHeading}
 </p>
 </div>
 </div>

 <div className="space-y-4">
 <p className="dark:text-slate-400 text-slate-600 text-xs font-mono bg-slate-950/50 p-2 rounded-lg border dark:border-slate-800 border-slate-200">
 {coldNumbers}
 </p>
 <p className="dark:text-slate-300 text-slate-600 text-base leading-relaxed font-medium">
 {woundText}
 </p>
 <div className="dark:bg-slate-900/50 bg-white p-3 rounded-lg border dark:border-slate-800 border-slate-200/50">
 <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Verdict</span>
 <p className="dark:text-slate-200 text-slate-900 text-sm font-medium">{verdictText}</p>
 </div>
 <div className="bg-blue-950/30 p-4 rounded-lg border border-blue-900/50 mt-4 relative overflow-hidden group">
 <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors" />
 <span className="text-xs font-bold dark:text-blue-400 text-blue-700 uppercase tracking-widest block mb-2 relative z-10 flex items-center gap-2">
 <Target className="w-4 h-4" /> Tactical Correction
 </span>
 <p className="text-blue-100 text-sm font-medium mb-3 relative z-10">{missionText}</p>
 <button
 onClick={() => {
 setTodos(prev => [...prev, {
 id: Date.now(),
 text: `Tactical Mission: ${missionText}`,
 completed: false,
 xpReward: 150,
 type: 'Practice',
 priority: 'High'
 }]);
 onClose();
 }}
 className="relative z-10 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
 >
 <Plus className="w-4 h-4" /> Accept as Task (+150 XP)
 </button>
 </div>
 <p className="dark:text-cyan-400 text-cyan-700 font-bold text-lg uppercase tracking-widest mt-6">
 "{pushText}"
 </p>
 </div>

 {pendingToday.length > 0 && (
 <div className="mt-8 pt-6 border-t dark:border-slate-700 border-slate-300/50">
 <h4 className="text-sm font-bold dark:text-slate-400 text-slate-600 uppercase tracking-widest mb-4">
 Pending Objectives
 </h4>
 <ul className="space-y-3">
 {pendingToday.slice(0, 3).map((task) => (
 <li
 key={task.id}
 className="flex items-start gap-3 dark:bg-slate-900/50 bg-white p-3 rounded-lg border dark:border-slate-800 border-slate-200"
 >
 <div className="mt-0.5 w-2 h-2 rounded-full bg-orange-500 shrink-0" />
 <div>
 <p className="dark:text-slate-200 text-slate-900 font-medium text-sm leading-tight">
 {task.text}
 </p>
 <p className="dark:text-orange-400 text-orange-600/80 text-xs font-bold uppercase tracking-wider mt-1">
 {task.subject}
 </p>
 </div>
 </li>
 ))}
 {pendingToday.length > 3 && (
 <li className="text-center text-sm text-slate-500 font-bold">
 +{pendingToday.length - 3} more pending
 </li>
 )}
 </ul>
 </div>
 )}
 </motion.div>

 {/* Timeline */}
 <motion.div
 initial={{ x: 20, opacity: 0 }}
 animate={{ x: 0, opacity: 1 }}
 transition={{ delay: 0.6 }}
 className="dark:bg-slate-900/80 bg-white border dark:border-slate-700 border-slate-300/50 rounded-3xl p-6 md:p-8"
 >
 <h3 className="text-sm font-bold dark:text-slate-400 text-slate-600 uppercase tracking-widest mb-8 flex items-center gap-2">
 <Play className="w-4 h-4 dark:text-cyan-400 text-cyan-700" /> Action Log
 </h3>

 <div className="relative pl-6 border-l dark:border-slate-800 border-slate-200 space-y-8">
 {timelineEvents.length === 0 ? (
 <div className="text-center py-8">
 <p className="text-slate-500 italic">
 No activity detected yet today.
 </p>
 </div>
 ) : (
 timelineEvents.map((evt, idx) => {
 const Icon = evt.icon;
 return (
 <div key={`idx-${idx}`} className="relative">
 <div
 className={`absolute -left-[35px] w-6 h-6 rounded-full dark:bg-slate-900 bg-white border-2 dark:border-slate-700 border-slate-300 flex items-center justify-center ring-4 ring-black`}
 >
 <Icon className={`w-3 h-3 ${evt.color}`} />
 </div>
 <div className="dark:bg-slate-800 bg-slate-100/50 border dark:border-slate-700 border-slate-300/50 p-4 rounded-xl">
 <div className="flex justify-between items-start mb-1">
 <span className="text-xs font-bold text-slate-500">
 {evt.time.toLocaleTimeString([], {
 hour: "2-digit",
 minute: "2-digit",
 })}
 </span>
 {evt.xp && (
 <span className="text-xs font-bold dark:text-cyan-400 text-cyan-700 bg-cyan-950/50 px-2 py-0.5 rounded-full">
 +{evt.xp} XP
 </span>
 )}
 </div>
 <p className="dark:text-slate-200 text-slate-900 font-medium">
 {evt.title}
 </p>
 <p
 className={`text-xs font-bold uppercase tracking-wider mt-2 ${evt.color}`}
 >
 {evt.type}
 </p>
 </div>
 </div>
 );
 })
 )}
 </div>
 </motion.div>
 </div>

 <button
 onClick={onClose}
 className="w-full mt-6 dark:bg-slate-800 bg-slate-100 hover:bg-slate-700 text-white font-bold py-4 rounded-xl border border-slate-600 transition-all uppercase tracking-widest shrink-0"
 >
 Back to Dashboard
 </button>
 </div>
 </motion.div>
 </motion.div>
 );
}
