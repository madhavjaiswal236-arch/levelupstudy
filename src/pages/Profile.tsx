import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/context/AppContext';
import { User, Trophy, Zap, Target, BookOpen, Edit2, Check, Shield, Calendar, GripVertical, Lock as LockIcon, CheckCircle2, AlertTriangle, Settings } from 'lucide-react';
import { HAPTIC_PATTERNS, vibrate } from "@/lib/haptics";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getRankInfo } from '@/lib/utils';
import { initAuth, googleSignIn, logout, getAccessToken } from '@/lib/firebase';
import { User as FirebaseUser } from 'firebase/auth';
import { rescheduleCalendarEvents, createCalendarEvent, createGoogleTask } from '@/lib/calendar';
import { Todo } from '@/context/AppContext';

export default function Profile() {
 const { 
 playerName, setPlayerName, xp, level, streakDays, syllabus, todos, setTodos, 
 pendingTasks, setPendingTasks, firebaseUser, setFirebaseUser, hasToken, setHasToken, 
 resetApp, equippedTitle, setEquippedTitle, equippedAura, setEquippedAura, history, questionsSolved,
 notificationSettings, setNotificationSettings, forceUploadData, forceDownloadData
 } = useAppContext();
 const [isEditing, setIsEditing] = useState(false);
 const [tempName, setTempName] = useState(playerName);
 const [isLoggingIn, setIsLoggingIn] = useState(false);
 const [isPushing, setIsPushing] = useState(false);
 const [isPulling, setIsPulling] = useState(false);
 const [syncMsg, setSyncMsg] = useState("");
 const [currentTimeDate, setCurrentTimeDate] = useState(new Date());

 const handlePush = async () => {
   setIsPushing(true);
   try {
     await forceUploadData();
     setSyncMsg("Data successfully pushed to cloud."); setTimeout(() => setSyncMsg(""), 3000);
   } catch(e) {
     console.error(e);
     setSyncMsg("Failed to upload data. Check console."); setTimeout(() => setSyncMsg(""), 3000);
   } finally {
     setIsPushing(false);
   }
 };

 const handlePull = async () => {
   if (true) { setSyncMsg("Pulling...");
     setIsPulling(true);
     try {
       await forceDownloadData();
     } catch(e) {
       console.error(e);
       setSyncMsg("Failed to download data. Check console."); setTimeout(() => setSyncMsg(""), 3000);
     } finally {
       setIsPulling(false);
     }
   }
 };

 const auraStyles: Record<string, string> = {
 aura_flame: "shadow-md border-amber-500 ring-2 ring-amber-500/50 animate-pulse",
 aura_emerald: "shadow-md border-emerald-500 ring-2 ring-emerald-500/50 animate-pulse",
 aura_solar: "shadow-md border-rose-500 ring-2 ring-rose-500/50 animate-pulse",
 aura_neon: "shadow-md border-cyan-400 ring-2 ring-cyan-400/50 animate-pulse"
 };

 const stats = useMemo(() => {
 const totalCompleted = (todos || []).filter(t => t.completed).length + 
 (history || []).reduce((sum, entry) => sum + (entry.completedTasks?.length || 0), 0);
 
 const hasEarlyBird = (todos || []).some(t => {
 if (!t.startTime) return false;
 const h = new Date(t.startTime).getHours();
 return h >= 4 && h < 9;
 }) || new Date().getHours() >= 4 && new Date().getHours() < 9 || (history || []).some(h => h.completedTasks?.some(t => {
 if (!t.startTime) return false;
 const hh = new Date(t.startTime).getHours();
 return hh >= 4 && hh < 9;
 }));

 return {
 totalCompleted,
 hasEarlyBird
 };
 }, [todos, history]);

 const badges = useMemo(() => {
 return [
 {
 id: 'streak_7',
 name: 'Consistency Champion',
 requirementTxt: 'Maintain a 7+ Day Study Streak',
 description: 'Demonstrate dedication by studying 7 consecutive days.',
 icon: '🔥',
 unlocked: (streakDays || 0) >= 7,
 currentCount: streakDays || 0,
 targetCount: 7,
 percent: Math.min(100, Math.round(((streakDays || 0) / 7) * 100)),
 rewardTitle: 'Consistent Legend',
 auraId: 'aura_flame',
 color: 'from-orange-500 to-amber-500 border-amber-500/50 shadow-orange-500/20'
 },
 {
 id: 'tasks_5',
 name: 'Rising Star',
 requirementTxt: 'Complete 5 Study Tasks',
 description: 'Kickstart your JEE study plan and tick off 5 study tasks.',
 icon: '✨',
 unlocked: stats.totalCompleted >= 5,
 percent: Math.min(100, Math.round((stats.totalCompleted / 5) * 100)),
 currentCount: stats.totalCompleted,
 targetCount: 5,
 rewardTitle: 'Rising Scholar',
 auraId: 'aura_neon',
 color: 'from-blue-500 to-cyan-500 border-cyan-500/50 shadow-blue-500/20'
 },
 {
 id: 'tasks_100',
 name: 'Century Crusader',
 requirementTxt: 'Complete 100 Tasks or Solve 100 PYQs',
 description: 'Perform massive study execution with 100 total study milestones or questions.',
 icon: '🏆',
 unlocked: stats.totalCompleted >= 100 || (questionsSolved || 0) >= 100,
 percent: Math.min(100, Math.round((Math.max(stats.totalCompleted, questionsSolved || 0) / 100) * 100)),
 currentCount: Math.max(stats.totalCompleted, questionsSolved || 0),
 targetCount: 100,
 rewardTitle: 'Grandmaster',
 auraId: 'aura_emerald',
 color: 'from-emerald-500 to-teal-500 border-emerald-500/50 shadow-emerald-500/20'
 },
 {
 id: 'early_bird',
 name: 'Early Bird',
 requirementTxt: 'Study early between 4 AM - 9 AM',
 description: 'Wake up early to beat the competition before standard hours.',
 icon: '🌅',
 unlocked: stats.hasEarlyBird,
 currentCount: stats.hasEarlyBird ? 1 : 0,
 targetCount: 1,
 percent: stats.hasEarlyBird ? 100 : 0,
 rewardTitle: 'Dawn Bringer',
 auraId: 'aura_solar',
 color: 'from-rose-500 to-red-500 border-rose-500/50 shadow-rose-500/20'
 },
 {
 id: 'level_5',
 name: 'Academic Elite',
 requirementTxt: 'Ascend to Level 5',
 description: 'Acquire high level study power by gaining level 5.',
 icon: '⚡',
 unlocked: (level || 1) >= 5,
 percent: Math.min(100, Math.round(((level || 1) / 5) * 100)),
 currentCount: level || 1,
 targetCount: 5,
 rewardTitle: 'True Academic Elite',
 auraId: 'aura_neon',
 color: 'from-purple-500 to-pink-500 border-purple-500/50 shadow-purple-500/20'
 }
 ];
 }, [streakDays, stats, questionsSolved, level]);

 const [resetProgress, setResetProgress] = useState(0);
 const resetIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

 const startResetTimer = () => {
 if (resetIntervalRef.current) return;
 setResetProgress(0);
 resetIntervalRef.current = setInterval(() => {
 setResetProgress(prev => {
 if (prev >= 100) {
 if (resetIntervalRef.current) {
 clearInterval(resetIntervalRef.current);
 resetIntervalRef.current = null;
 }
 resetApp();
 return 100;
 }
 return prev + 0.5; // 20s total -> 200 ticks * 100ms
 });
 }, 100);
 };

 const cancelResetTimer = () => {
 if (resetIntervalRef.current) {
 clearInterval(resetIntervalRef.current);
 resetIntervalRef.current = null;
 }
 setResetProgress(0);
 };

 useEffect(() => {
 const timer = setInterval(() => setCurrentTimeDate(new Date()), 60000);
 
 const handleCalendarScroll = () => {
 const tryScroll = (attempts = 0) => {
 const el = document.getElementById('profile-calendar-integration');
 if (el) {
 el.scrollIntoView({ behavior: 'smooth' });
 if (attempts === 0) {
 el.classList.add('ring-2', 'ring-cyan-400', 'ring-offset-2', 'ring-offset-black', 'transition-all', 'duration-500');
 setTimeout(() => el.classList.remove('ring-2', 'ring-cyan-400', 'ring-offset-2', 'ring-offset-black'), 1500);
 }
 }
 if (attempts < 3) {
 setTimeout(() => tryScroll(attempts + 1), 200);
 }
 };
 tryScroll();
 };
 
 window.addEventListener('shortcut:calendar-profile', handleCalendarScroll);
 return () => {
 clearInterval(timer);
 window.removeEventListener('shortcut:calendar-profile', handleCalendarScroll);
 };
 }, []);

 const handleLogin = async () => {
 setIsLoggingIn(true);
 try {
 const result = await googleSignIn();
 if (result) {
 setFirebaseUser(result.user);
 setHasToken(true);
 }
 } catch (err: any) {
 console.error(err);
 if (err?.code === 'auth/unauthorized-domain' || err?.message?.includes('unauthorized-domain')) {
 setSyncMsg("Domain not authorized in Firebase! Note: It can take a few minutes for Firebase to apply this setting. Please ensure you have added exactly this domain to Firebase Console -> Authentication -> Settings -> Authorized domains:\n\n" + window.location.hostname);
 } else if (err?.message?.includes('popup') || err?.message?.includes('internal-error')) {
 setSyncMsg("Authentication is restricted in this preview iframe. Please click 'Open in New Tab' (top right).");
 } else {
 setSyncMsg("Login failed: " + (err.message || 'Unknown error. Check console for details.'));
 }
 } finally {
 setIsLoggingIn(false);
 }
 };

 const handleLogout = async () => {
    vibrate(HAPTIC_PATTERNS.THUD);
 await logout();
 setFirebaseUser(null);
 setHasToken(false);
 };

 const [syncedTasks, setSyncedTasks] = useState<(Todo & { previewStart?: Date, previewEnd?: Date })[]>([]);
 
 useEffect(() => {
 // Include previously synced tasks, and any unsynced tasks that have a preview (we'll filter later)
 // Actually, just include all todos that have a calendar event or need scheduling
 const tasks = todos;
 setSyncedTasks(prev => {
 // Re-map synced tasks from todos directly
 if (prev.length !== tasks.length) {
 return tasks.map(t => ({ ...t, previewStart: t.startTime ? new Date(t.startTime) : undefined, previewEnd: t.endTime ? new Date(t.endTime) : undefined }));
 }
 for (let i = 0; i < prev.length; i++) {
 if (prev[i].id !== tasks[i].id || prev[i].startTime !== tasks[i].startTime || prev[i].endTime !== tasks[i].endTime || prev[i].completed !== tasks[i].completed) {
 return tasks.map(t => ({ ...t, previewStart: t.startTime ? new Date(t.startTime) : undefined, previewEnd: t.endTime ? new Date(t.endTime) : undefined }));
 }
 }
 return prev;
 });
 }, [todos]);

 const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
 const [isRescheduling, setIsRescheduling] = useState(false);
 const [toastMessage, setToastMessage] = useState("");
 const [toastType, setToastType] = useState<'success'|'error'>('success');

 const showToast = (msg: string, type: 'success'|'error') => {
 setToastMessage(msg);
 setToastType(type);
 setTimeout(() => setToastMessage(""), 3000);
 };

 const onDragStart = (e: React.DragEvent, index: number) => {
 setDraggedItemIndex(index);
 e.dataTransfer.effectAllowed = "move";
 };

 const onDragOver = (e: React.DragEvent, index: number) => {
 e.preventDefault();
 if (draggedItemIndex === null || draggedItemIndex === index) return;
 const newTasks = [...syncedTasks];
 const dragged = newTasks[draggedItemIndex];
 newTasks.splice(draggedItemIndex, 1);
 newTasks.splice(index, 0, dragged);
 setDraggedItemIndex(index);
 setSyncedTasks(newTasks);
 };

 const onDragEnd = () => {
 setDraggedItemIndex(null);
 };

 const handleSaveSchedule = async () => {
    vibrate(HAPTIC_PATTERNS.TAP);
 setIsRescheduling(true);
 let allSuccess = true;

 let token = await getAccessToken();
 if (!token) {
   try {
     await googleSignIn();
     token = await getAccessToken();
     if (!token) {
       setIsRescheduling(false);
       return;
     }
   } catch (err) {
     setIsRescheduling(false);
     return;
   }
 }
 
 // Reschedule existing events
 const eventsToUpdate = syncedTasks.filter(t => t.calendarEventId && t.previewStart && t.previewEnd).map(t => ({
 eventId: t.calendarEventId!,
 startTime: t.previewStart!,
 endTime: t.previewEnd!
 }));
 if (eventsToUpdate.length > 0) {
 const updateSuccess = await rescheduleCalendarEvents(eventsToUpdate);
 if (!updateSuccess) allSuccess = false;
 }

 // Create new events for backlog items that were dragged to timeline
 const eventsToCreate = syncedTasks.filter(t => !t.calendarEventId && t.previewStart && t.previewEnd);
 const newTodos = [...todos];
 
 for (const t of eventsToCreate) {
 try {
 const durationMinutes = (t.previewEnd!.getTime() - t.previewStart!.getTime()) / 60000;
 const result = await createCalendarEvent(t.text, durationMinutes, t.type || 'Lecture', false, newTodos, t.previewStart!, t.previewEnd!);
 
 // Update the task context
 const index = newTodos.findIndex(td => td.id === t.id);
 if (index !== -1) {
 newTodos[index] = { ...newTodos[index], calendarEventId: result.id, calendarSynced: true, startTime: t.previewStart!.toISOString(), endTime: t.previewEnd!.toISOString() };
 }
 } catch (err) {
 console.error("Failed to create event for backlog task", err);
 allSuccess = false;
 }
 }

 if (allSuccess && eventsToUpdate.length === 0 && eventsToCreate.length === 0) {
 showToast("No changes to apply.", "success");
 setIsRescheduling(false);
 return;
 }

 if (eventsToUpdate.length > 0) {
 // Update global context with new mapped times for updated events
 for (const t of eventsToUpdate) {
 const index = newTodos.findIndex(td => td.calendarEventId === t.eventId);
 if (index !== -1) {
 newTodos[index] = { ...newTodos[index], startTime: t.startTime.toISOString(), endTime: t.endTime.toISOString() };
 }
 }
 }
 
 setTodos(newTodos);

 if (allSuccess) {
 showToast("Timeline applied successfully to Google Calendar!", "success");
 } else {
 showToast("Saved locally, but failed to apply all changes to Google Calendar.", "error");
 }
 setIsRescheduling(false);
 };

 const handleSaveName = () => {
    vibrate(HAPTIC_PATTERNS.DOUBLE_TAP);
 if ((tempName || "").trim()) {
 setPlayerName((tempName || "").trim());
 }
 setIsEditing(false);
 };

 const rankInfo = getRankInfo(level);

 // Calculate performance data from actual syllabus
 const performanceData = useMemo(() => {
 const data: { subject: string, chapter: string, score: number }[] = [];
 ['Physics', 'Chemistry', 'Mathematics'].forEach(sub => {
 const chapters = syllabus[sub as keyof typeof syllabus];
 // Only show chapters that have some progress
 const activeChapters = chapters.filter(c => c.pyq > 0 || c.accuracy > 0 || c.lectures > 0);
 
 activeChapters.forEach(chap => {
 const score = Math.round((chap.pyq + chap.accuracy + chap.lectures) / 3);
 data.push({
 subject: sub,
 chapter: chap.name.length > 15 ? chap.name.substring(0, 15) + '...' : chap.name,
 score
 });
 });
 });
 
 // If no data, provide some empty state or placeholders
 if (data.length === 0) {
 return [
 { subject: 'Physics', chapter: 'No Data Yet', score: 0 },
 { subject: 'Chemistry', chapter: 'No Data Yet', score: 0 },
 { subject: 'Mathematics', chapter: 'No Data Yet', score: 0 },
 ];
 }
 
 // Sort by score descending and take top 10 to avoid overcrowding
 return data.sort((a, b) => b.score - a.score).slice(0, 10);
 }, [syllabus]);

const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

 const toggleExpand = (id: string, e: React.MouseEvent) => {
 e.stopPropagation();
 setExpandedIds(prev => ({...prev, [id]: !prev[id]}));
 };

 const handleDurationChange = (id: string, newDurationMin: number) => {
 const cappedDuration = Math.max(5, Math.min(1440, newDurationMin));
 setSyncedTasks(prev => prev.map(t => {
 if (t.id.toString() === id && t.previewStart) {
 return {
 ...t,
 previewEnd: new Date(t.previewStart.getTime() + cappedDuration * 60000)
 };
 }
 return t;
 }));
 };

 return (
 <div className="space-y-8 pb-12">
 <header>
 <h1 className="text-4xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r dark:from-white dark:to-slate-500 from-slate-900 to-slate-600">
 PLAYER PROFILE
 </h1>
 <div className="dark:text-cyan-400 text-cyan-700 font-mono text-sm mt-1 flex items-center gap-2 group/profile w-max cursor-pointer">
 <motion.div whileHover={{ scale: 1.2, rotate: 15 }} className="relative">
 <User className="w-4 h-4 group-hover/profile:drop-shadow-md transition-all" />
 </motion.div>
 YOUR STATS & PERFORMANCE
 </div>
 </header>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 {/* Player Info Card */}
 <Card className="md:col-span-1 border-cyan-500/30 dark:bg-black bg-slate-50 relative overflow-hidden">
 <div className="absolute -top-12 -right-12 w-48 h-48 bg-cyan-500/10 rounded-full blur-[60px] pointer-events-none" />
 <CardContent className="p-8 flex flex-col items-center text-center space-y-6">
 <div className="relative group/avatar cursor-pointer">
 <motion.div 
 whileHover={{ scale: 1.1, rotate: 5 }} 
 transition={{ type: "tween", duration: 0.5 }} 
 className={`w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center border-4 border-black transition-all ${
 equippedAura && auraStyles[equippedAura] ? auraStyles[equippedAura] : 'shadow-md group-hover/avatar:shadow-md'
 }`}
 >
 <User className="w-12 h-12 dark:text-white text-slate-900 group-hover/avatar:scale-110 transition-transform" />
 </motion.div>
 <div className="absolute -bottom-2 -right-2 dark:bg-black bg-slate-50 rounded-full p-1 border border-cyan-500/50">
 <Trophy className="w-5 h-5 dark:text-amber-400 text-amber-700" />
 </div>
 </div>

 <div className="w-full">
 {isEditing ? (
 <div className="flex items-center gap-2">
 <Input
 value={tempName || ""}
 onChange={(e) => setTempName(e.target.value)}
 className="dark:bg-black bg-slate-50 border-cyan-500/50 text-center font-bold text-lg"
 autoFocus
 onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
 />
 <Button size="icon" variant="ghost" onClick={handleSaveName} className="dark:text-green-400 text-green-700 hover:dark:text-green-300 dark:text-green-400 text-green-700 hover:bg-green-400/10">
 <Check className="w-5 h-5" />
 </Button>
 </div>
 ) : (
 <div className="flex flex-col items-center">
 <div className="flex items-center justify-center gap-2 group cursor-pointer" onClick={() => setIsEditing(true)}>
 <h2 className="text-2xl font-black dark:text-white text-slate-900">{playerName}</h2>
 <Edit2 className="w-4 h-4 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
 </div>
 {equippedTitle && (
 <motion.span 
 initial={{ opacity: 0, scale: 0.9 }}
 animate={{ opacity: 1, scale: 1 }}
 className="px-2.5 py-0.5 bg-cyan-950/80 border border-cyan-500/30 dark:text-cyan-400 text-cyan-700 rounded text-[9px] font-mono tracking-widest uppercase font-bold mt-1 shadow-md"
 >
 🏆 {equippedTitle}
 </motion.span>
 )}
 </div>
 )}
 <div className="flex flex-col items-center gap-1 mt-2">
 <div className={`px-3 py-1 rounded-md border ${rankInfo.bg} ${rankInfo.border} flex items-center gap-2 inline-flex`}>
 <Shield className={`w-4 h-4 ${rankInfo.color}`} />
 <span className={`text-xs font-bold ${rankInfo.color}`}>Rank {rankInfo.rank}</span>
 </div>
 <p className={`text-sm font-bold mt-1 ${rankInfo.color}`}>{rankInfo.title}</p>
 <p className="text-xs font-mono dark:text-slate-400 text-slate-600 mt-1">Level {level}</p>
 </div>
 </div>

 <div className="w-full grid grid-cols-2 gap-4 pt-4 border-t dark:border-white/10 border-black/10 mt-4 mb-4">
 <div className="text-center">
 <span className="text-xs font-bold dark:text-slate-400 text-slate-600 uppercase tracking-wider block mb-1">Total XP</span>
 <span className="text-xl font-black dark:text-cyan-400 text-cyan-700 font-mono">{xp.toLocaleString()}</span>
 </div>
 <div className="text-center">
 <span className="text-xs font-bold dark:text-slate-400 text-slate-600 uppercase tracking-wider block mb-1">Streak</span>
 <span className="text-xl font-black dark:text-amber-400 text-amber-700 font-mono flex items-center justify-center gap-1">
 {streakDays} <Zap className="w-4 h-4" />
 </span>
 </div>
 </div>
 </CardContent>
 </Card>

 {/* Performance Graph Card */}
 <Card className="md:col-span-2 border-purple-500/30 dark:bg-black bg-slate-50 relative overflow-hidden">
 <div className="absolute -top-16 -left-16 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px] pointer-events-none" />
 <CardHeader>
 <CardTitle className="flex items-center gap-2 dark:text-purple-400 text-purple-700">
 <Target className="w-5 h-5" />
 Chapter Mastery
 </CardTitle>
 <p className="text-sm dark:text-slate-400 text-slate-600">Your top performing chapters based on lectures, practice, and accuracy.</p>
 </CardHeader>
 <CardContent>
 <div className="h-80 w-full mt-4">
 <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
 <BarChart data={performanceData} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
 <XAxis 
 dataKey="chapter" 
 stroke="#475569" 
 tick={{ fill: '#94a3b8', fontSize: 12 }}
 angle={-45}
 textAnchor="end"
 interval={0}
 />
 <YAxis 
 stroke="#475569" 
 tick={{ fill: '#94a3b8', fontSize: 12 }}
 domain={[0, 100]}
 />
 <Tooltip 
 cursor={{ fill: 'rgba(255,255,255,0.05)' }}
 contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc' }}
 itemStyle={{ color: '#c084fc', fontWeight: 'bold' }}
 />
 <Bar dataKey="score" radius={[4, 4, 0, 0]}>
 {performanceData.map((entry, index) => (
 <Cell key={`cell-${index}`} fill={
 entry.subject === 'Physics' ? '#3b82f6' : 
 entry.subject === 'Chemistry' ? '#10b981' : 
 '#8b5cf6'
 } />
 ))}
 </Bar>
 </BarChart>
 </ResponsiveContainer>
 </div>
 <div className="flex justify-center gap-6 mt-6">
 <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500"></div><span className="text-xs dark:text-slate-400 text-slate-600">Physics</span></div>
 <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500"></div><span className="text-xs dark:text-slate-400 text-slate-600">Chemistry</span></div>
 <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-purple-500"></div><span className="text-xs dark:text-slate-400 text-slate-600">Mathematics</span></div>
 </div>
 </CardContent>
 </Card>

 

 {/* Achievements Card */}
 <Card className="md:col-span-3 border-amber-500/30 dark:bg-black bg-slate-50 relative overflow-hidden mt-6">
 <div className="absolute -top-16 -right-16 w-64 h-64 bg-amber-500/5 rounded-full blur-[80px] pointer-events-none" />
 <CardHeader>
 <CardTitle className="flex items-center gap-2 dark:text-amber-400 text-amber-700">
 <Trophy className="w-5 h-5" />
 Achievements & Prestige Badges
 </CardTitle>
 <p className="text-sm dark:text-slate-400 text-slate-600">Unlock premium milestones and equip prestige player titles or glowing status custom auras.</p>
 </CardHeader>
 <CardContent>
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
 {badges.map((b) => {
 const isEquipped = equippedTitle === b.rewardTitle;
 const isAuraEquipped = b.auraId ? equippedAura === b.auraId : false;
 
 return (
 <motion.div 
 key={b.id}
 whileHover={{ y: -4 }}
 className={`p-4 rounded-xl border relative flex flex-col justify-between overflow-hidden transition-all duration-300 ${
 b.unlocked 
 ? `dark:bg-slate-900 bg-white dark:border-slate-700 border-slate-300 shadow-lg` 
 : 'bg-slate-950/40 border-slate-900 opacity-60'
 }`}
 >
 {!b.unlocked && (
 <div className="absolute top-2 right-2 bg-slate-950 p-1 rounded-full border dark:border-slate-800 border-slate-200">
 <LockIcon className="w-3 h-3 text-slate-500" />
 </div>
 )}
 
 <div>
 {/* Badge Icon Header */}
 <div className="flex items-center gap-3 mb-3">
 <span className={`text-3xl filter ${b.unlocked ? 'drop-shadow-md' : 'grayscale'}`}>
 {b.icon}
 </span>
 <div>
 <h4 className="font-bold text-sm dark:text-white text-slate-900 tracking-wide">{b.name}</h4>
 <span className="text-[10px] dark:text-slate-400 text-slate-600 font-mono block leading-none mt-0.5">{b.requirementTxt}</span>
 </div>
 </div>
 
 <p className="text-xs dark:text-slate-300 text-slate-600 mb-4 font-normal leading-relaxed">{b.description}</p>
 </div>

 <div className="space-y-3 pt-3 border-t dark:border-white/5 border-black/5">
 {/* Milestone tracking progress bar */}
 {b.targetCount !== undefined && b.percent !== undefined && (
 <div className="space-y-1">
 <div className="flex items-center justify-between text-[10px] font-mono">
 <span className="dark:text-slate-400 text-slate-600">Progress</span>
 <span className="dark:text-cyan-400 text-cyan-700 font-bold">{b.currentCount} / {b.targetCount}</span>
 </div>
 <div className="w-full h-1 dark:bg-black bg-slate-50 rounded-full overflow-hidden">
 <div className="h-full bg-cyan-400 transition-all duration-500" style={{ width: `${b.percent}%` }} />
 </div>
 </div>
 )}
 
 {b.unlocked ? (
 <div className="flex flex-col gap-1.5">
 {b.rewardTitle && (
 <Button 
 size="sm"
 variant="outline"
 onClick={() => {
 if (isEquipped) {
 setEquippedTitle(""); // Unequip
 } else {
 setEquippedTitle(b.rewardTitle);
 }
 }}
 className={`h-7 text-[10px] font-bold tracking-widest uppercase font-mono transition-all w-full ${
 isEquipped 
 ? 'bg-amber-500 text-black border-amber-400 hover:bg-amber-450 hover:text-black shadow-md' 
 : 'dark:bg-black bg-slate-50 dark:text-slate-300 text-slate-600 border-slate-750 hover:dark:bg-black bg-slate-50'
 }`}
 >
 {isEquipped ? '✓ Equipped' : 'Equip Title'}
 </Button>
 )}
 
 {b.auraId && (
 <Button 
 size="sm"
 variant="outline"
 onClick={() => {
 if (isAuraEquipped) {
 setEquippedAura(""); // Unequip
 } else {
 setEquippedAura(b.auraId);
 }
 }}
 className={`h-7 text-[10px] font-bold tracking-widest uppercase font-mono transition-all w-full ${
 isAuraEquipped 
 ? 'bg-cyan-500 text-black border-cyan-400 hover:bg-cyan-450 hover:text-black shadow-md' 
 : 'dark:bg-black bg-slate-50 dark:text-slate-300 text-slate-600 border-slate-750 hover:dark:bg-black bg-slate-50'
 }`}
 >
 {isAuraEquipped ? '❇ Active Glow' : 'Equip Aura'}
 </Button>
 )}
 </div>
 ) : (
 <div className="text-center py-1">
 <span className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-widest">Locked</span>
 </div>
 )}
 </div>
 </motion.div>
 );
 })}
 </div>
 </CardContent>
 </Card>

 {/* Account Settings Card */}
 <Card className="md:col-span-3 border-indigo-500/30 dark:bg-black bg-slate-50 relative overflow-hidden mt-6">
 <CardHeader>
 <CardTitle className="flex items-center gap-2 dark:text-indigo-400 text-indigo-700">
 <Settings className="w-5 h-5" />
 Account & Sync Settings
 </CardTitle>
 <p className="text-sm dark:text-slate-400 text-slate-600">Manage your account and data synchronization across devices.</p>
 </CardHeader>
 <CardContent className="space-y-4">
 <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 bg-indigo-950/20 rounded-xl border border-indigo-900/50 gap-4">
 <div>
 <h3 className="dark:text-indigo-100 text-indigo-900 font-bold tracking-wide">Google Sign In</h3>
 <p className="text-sm dark:text-indigo-400 text-indigo-700">
 {firebaseUser ? `Signed in as ${firebaseUser.email || firebaseUser.displayName}` : "Sign in to sync your progress across devices and enable Calendar integration."}
 </p>
 </div>
 {firebaseUser ? (
 <Button onClick={handleLogout} variant="outline" className="border-indigo-500/50 dark:text-indigo-400 text-indigo-700 hover:bg-indigo-500/10">
 Sign Out
 </Button>
 ) : (
 <Button onClick={handleLogin} disabled={isLoggingIn} className="bg-indigo-600 text-white hover:bg-indigo-700 shadow-md border-indigo-500">
 {isLoggingIn ? "Signing in..." : "Sign In with Google"}
 </Button>
 )}
 </div>
 
 {firebaseUser && (
 <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 bg-emerald-950/20 rounded-xl border border-emerald-900/50 gap-4 mt-4">
 <div>
 <h3 className="dark:text-emerald-100 text-emerald-900 font-bold tracking-wide">Manual Data Sync</h3>
 <p className="text-sm dark:text-emerald-400 text-emerald-700 max-w-lg">
 Pushing data will upload your current device's data to the cloud. Pulling data will download data from the cloud to this device, overwriting current local progress.
 </p>
 </div>
 <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
 <Button onClick={handlePush} disabled={isPushing} variant="default" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white whitespace-nowrap">
 {isPushing ? "Pushing..." : "Push Data to Cloud"}
 </Button>
 <Button onClick={handlePull} disabled={isPulling} variant="outline" className="flex-1 border-emerald-500/50 dark:text-emerald-400 text-emerald-700 hover:bg-emerald-500/10 whitespace-nowrap">
 {isPulling ? "Pulling..." : "Pull Data from Cloud"}
 </Button>
 </div>
 </div>
 )}
 </CardContent>
 </Card>

 {/* Danger Zone: Hard Reset */}
 <Card className="md:col-span-3 border-rose-500/30 dark:bg-black bg-slate-50 relative overflow-hidden mt-6">
 <CardHeader>
 <CardTitle className="flex items-center gap-2 dark:text-rose-400 text-rose-700">
 <Shield className="w-5 h-5" />
 Danger Zone
 </CardTitle>
 <p className="text-sm dark:text-slate-400 text-slate-600">Irreversible, destructive actions. Proceed with extreme caution.</p>
 </CardHeader>
 <CardContent>
 <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 bg-rose-950/20 rounded-xl border border-rose-900/50 gap-4">
 <div>
 <h3 className="text-rose-100 font-bold tracking-wide">Factory Reset Profile</h3>
 <p className="text-sm dark:text-rose-400 text-rose-700">Purges all local state, history, syllabus progress, and starts completely fresh as a Level 1 user. This action cannot be undone.</p>
 </div>
 <button
 onMouseDown={startResetTimer}
 onMouseUp={cancelResetTimer}
 onMouseLeave={cancelResetTimer}
 onTouchStart={startResetTimer}
 onTouchEnd={cancelResetTimer}
 onTouchCancel={cancelResetTimer}
 className="relative overflow-hidden bg-rose-950 border-2 border-rose-600 dark:text-rose-400 text-rose-700 uppercase font-black whitespace-nowrap rounded-md font-mono select-none px-6 py-3 transition-colors shadow-md"
 >
 <div 
 className="absolute inset-0 bg-rose-600 origin-left transition-transform duration-100 ease-linear"
 style={{ transform: `scaleX(${resetProgress / 100})` }}
 />
 <span className={`relative z-10 flex items-center justify-center gap-2 ${resetProgress > 0 ? "dark:text-white text-slate-900" : ""}`}>
 <Shield className="w-4 h-4" />
 {resetProgress > 0 ? `HOLD: ${Math.floor(resetProgress)}%` : "NUKE ACCOUNT DATA"}
 </span>
 </button>
 </div>
 </CardContent>
 </Card>
 </div>
 <AnimatePresence>
 {toastMessage && (
 <motion.div
 initial={{ opacity: 0, y: 50, x: 20 }}
 animate={{ opacity: 1, y: 0, x: 0 }}
 exit={{ opacity: 0, y: 50, x: 20, scale: 0.9 }}
 transition={{ type: "spring", stiffness: 300, damping: 25 }}
 className={`fixed bottom-4 md:bottom-10 right-4 md:right-10 z-[100] max-w-sm dark:bg-slate-900/90 bg-white border shadow-xl rounded-xl p-4 flex gap-4 pr-10 ${
 toastType === 'success' 
 ? 'border-emerald-500/50 shadow-md' 
 : 'border-rose-500/50 shadow-md'
 }`}
 >
 <div className="flex-shrink-0">
 <div className={`w-10 h-10 rounded-full flex items-center justify-center relative ${
 toastType === 'success' ? 'bg-emerald-500/20' : 'bg-rose-500/20'
 }`}>
 {toastType === 'success' ? (
 <CheckCircle2 className="w-5 h-5 dark:text-emerald-400 text-emerald-700" />
 ) : (
 <AlertTriangle className="w-5 h-5 dark:text-rose-400 text-rose-700" />
 )}
 {toastType !== 'success' && (
 <>
 <div className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full animate-ping" />
 <div className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-slate-900" />
 </>
 )}
 </div>
 </div>
 <div className="flex flex-col justify-center">
 <h4 className={`font-bold uppercase tracking-widest text-xs mb-1 flex items-center gap-2 ${
 toastType === 'success' ? 'dark:text-emerald-400 text-emerald-700' : 'dark:text-rose-400 text-rose-700'
 }`}>
 {toastType === 'success' ? 'Success' : 'Alert'}
 </h4>
 <p className="dark:text-slate-300 text-slate-600 text-sm leading-relaxed font-medium">
 {toastMessage}
 </p>
 </div>
 <button 
 onClick={() => setToastMessage("")}
 className="absolute top-2 right-2 p-1 text-slate-500 hover:dark:text-white text-slate-900 transition-colors"
 >
 ×
 </button>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 );
}