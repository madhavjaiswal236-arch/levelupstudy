import { predictNextLecture } from "../lib/utils";
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, ChevronDown, X, BookOpen } from 'lucide-react';
import { useAppContext, SyllabusData } from '@/context/AppContext';
import { useHaptic } from '@/hooks/useHaptic';

const XP_RATES = {
 Physics: { Lecture: 250, Theory: 250, Practice: 300, PYQs: 350, Revision: 200, DPP: 300 },
 Chemistry: { Lecture: 250, Theory: 250, Practice: 300, PYQs: 350, Revision: 200, DPP: 300 },
 Mathematics: { Lecture: 250, Theory: 250, Practice: 300, PYQs: 350, Revision: 200, DPP: 300 },
};

type Subject = keyof typeof XP_RATES;
type SessionType = 'Lecture' | 'Theory' | 'Practice' | 'PYQs' | 'Revision' | 'DPP';

interface JeeSessionLoggerProps {
 pendingSessionLog?: { subject: string; chapter: string; type: string; taskId?: number } | null;
 clearPendingSessionLog?: () => void;
}

export default function JeeSessionLogger({ pendingSessionLog, clearPendingSessionLog }: JeeSessionLoggerProps) {
 const { syllabus, addXp, setHoursStudiedToday, updateChapterStats, setQuestionsSolved, todos, setTodos, loggedTasksToday, setLoggedTasksToday, getStreakMultiplier, activeBoost, setPendingTasks, history, getCurrentChapterForSubject } = useAppContext();
 const { hapticSuccess } = useHaptic();
 
 const [isExpanded, setIsExpanded] = useState(false);
 const [pendingTaskId, setPendingTaskId] = useState<number | null>(null);
 const [subject, setSubject] = useState<Subject | null>(null);
 const [chapter, setChapter] = useState<string | null>(null);
 const [isChapterModalOpen, setIsChapterModalOpen] = useState(false);
 const [sessionType, setSessionType] = useState<SessionType>('Lecture');
 const [hours, setHours] = useState<number | string>('1.75');
 const [minutes, setMinutes] = useState<number | string>('');
 const [lectureNumber, setLectureNumber] = useState<number | string>('');
 const [questions, setQuestions] = useState<number | string>('');
 const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
 const [accuracy, setAccuracy] = useState<number>(80);
 const [isLectureComplete, setIsLectureComplete] = useState<boolean>(false);
 
 // DPP Status Modal State
 const [showDppModal, setShowDppModal] = useState(false);
 const [dppStatus, setDppStatus] = useState<'solved' | 'not_solved' | 'not_provided' | 'scheduled'>('solved');
 const [dppMarksScored, setDppMarksScored] = useState<number | string>('');
 const [dppTotalMarks, setDppTotalMarks] = useState<number | string>('');

 const parsedScored = parseFloat(dppMarksScored as string) || 0;
 const parsedTotal = parseFloat(dppTotalMarks as string) || 0;
 const calculatedDppAccuracy = parsedTotal > 0 ? Math.round((parsedScored / parsedTotal) * 100) : 0;

 useEffect(() => {
 if (chapter && subject && (sessionType === 'Lecture' || sessionType === 'Theory' || sessionType === 'DPP')) {
 const stat = syllabus[subject]?.find(c => c.name === chapter);
      if (sessionType === "Lecture" || sessionType === "Theory") {
        setLectureNumber(predictNextLecture(subject, chapter, todos, history, syllabus));
      } else if (sessionType === "DPP") {
        if (stat && stat.lastLectureNumber !== undefined) {
          setLectureNumber(stat.lastLectureNumber || 1);
        } else {
          setLectureNumber("");
        }
      }
    }
 }, [chapter, subject, sessionType, syllabus, todos]);

 useEffect(() => {
 if (pendingSessionLog) {
 setIsExpanded(true);
 setSubject(pendingSessionLog.subject as Subject);
 setChapter(pendingSessionLog.chapter);
 if (pendingSessionLog.taskId) {
 setPendingTaskId(pendingSessionLog.taskId);
 }
 
 const typeMap: Record<string, SessionType> = {
 'Lecture': 'Lecture',
 'Practice': 'Practice',
 'DPP': 'DPP',
 'Chapter Test': 'Practice',
 'Revision': 'Revision',
 'PYQs': 'PYQs'
 };
 
 const st = typeMap[pendingSessionLog.type] || 'Practice';
 setSessionType(st);

 // Pre-fill custom duration if the task has one
 let hoursVal: number | string = '1.75';
 const matchedTodo = todos.find(t => t.id === pendingSessionLog.taskId);
 if (matchedTodo) {
   if (matchedTodo.durationMinutes) {
     hoursVal = (matchedTodo.durationMinutes / 60).toString();
   } else if (matchedTodo.startTime && matchedTodo.endTime) {
     const diffMs = new Date(matchedTodo.endTime).getTime() - new Date(matchedTodo.startTime).getTime();
     const diffMins = Math.round(diffMs / 60000);
     if (diffMins > 0) {
       hoursVal = (diffMins / 60).toString();
     }
   }
 }
 setHours(hoursVal);
 
 if (st === 'DPP') {
 setDppStatus('solved');
 setShowDppModal(true);
 setIsExpanded(false);
 } else {
 setIsExpanded(true);
 }
 
 if (clearPendingSessionLog) {
 clearPendingSessionLog();
 }
 }
 }, [pendingSessionLog, clearPendingSessionLog, todos]);

 const handlePreLogCheck = () => {
 if (!subject || !chapter || (sessionType !== 'DPP' && !hours)) return;
 if (sessionType === 'Lecture' || sessionType === 'Theory') {
 setShowDppModal(true);
 } else {
 handleLogSession();
 }
 };

 const handleLogSession = () => {
 if (!subject || !chapter || (sessionType !== 'DPP' && !hours)) return;
 
 // When completing a Scheduled DPP, we don't ask for time. We'll grant a baseline 1 hour of XP for completing it.
 let numHours = sessionType === 'DPP' ? 1 : Math.max(0, parseFloat(hours as string) || 0);

 // Enforce realistic benchmarks
 if (sessionType === 'Lecture' || sessionType === 'Theory') {
 if (numHours > 12) numHours = 12;
 } else {
 if (numHours > 16) numHours = 16;
 }

 const numQuestions = Math.max(0, parseInt(questions as string) || 0);
 
 const rate = XP_RATES[subject][sessionType];
 let earnedXp = Math.round(rate * numHours);
 
 if (sessionType === 'Lecture' || sessionType === 'Theory') {
 if (dppStatus === 'not_solved') {
 earnedXp = Math.round(earnedXp * 0.5); // 50% penalty
 } else if (dppStatus === 'scheduled') {
 earnedXp = Math.round(earnedXp * 0.75); // 25% penalty
 }
 } else if (sessionType === 'DPP') {
 if (dppStatus === 'not_solved' || dppStatus === 'scheduled') {
 earnedXp = 0;
 }
 }
 
 const finalEarnedXp = addXp(earnedXp);
 setHoursStudiedToday(prev => Math.min(24, prev + numHours));
 
 if (numQuestions > 0) {
 setQuestionsSolved(prev => prev + numQuestions);
 }
 
 const currentStats = syllabus[subject].find(c => c.name === chapter);
 const currentAccuracy = currentStats?.accuracy || 0;
 const currentPyq = currentStats?.pyq || 0;
 // Store lecture string name or number inside backlog? No, let's keep the percentage.
 const currentLectures = currentStats?.lectures || 0;
 
 let newAccuracy = currentAccuracy;
 const isDppAccuracyNeeded = ((sessionType === 'Lecture' || sessionType === 'Theory') && dppStatus === 'solved') || sessionType === 'DPP';
 if (numQuestions > 0 || isDppAccuracyNeeded) {
 const userAcc = isDppAccuracyNeeded ? calculatedDppAccuracy : accuracy;
 if (currentAccuracy === 0) {
 newAccuracy = Math.min(99, userAcc);
 } else {
 newAccuracy = Math.min(99, Math.round((currentAccuracy + userAcc) / 2));
 }
 }
 
 let updates: any = {
 accuracy: newAccuracy,
 status: newAccuracy >= 80 ? 'green' : newAccuracy >= 50 ? 'yellow' : 'red',
 confidence: newAccuracy >= 80 ? 'Strong' : newAccuracy >= 50 ? 'Average' : 'Weak'
 };
 
 if (sessionType === 'Theory' || sessionType === 'Lecture') {
 updates.lectures = isLectureComplete ? 100 : Math.min(99, currentLectures + (numHours * 10)); 
 const parsedLecNum = parseInt(lectureNumber as string);
 if (!isNaN(parsedLecNum)) {
 updates.lastLectureNumber = parsedLecNum;
 }
 } else if (sessionType === 'DPP') {
 const parsedLecNum = parseInt(lectureNumber as string);
 if (!isNaN(parsedLecNum)) {
 // Update the lecture number attached to this DPP to the latest if applicable
 updates.lastLectureNumber = parsedLecNum;
 }
 } else if (sessionType === 'PYQs') {
 updates.pyq = Math.min(100, currentPyq + (numQuestions * 2)); 
 }
 
 updateChapterStats(subject, chapter, updates);

 const extraInfo = sessionType === 'DPP' && dppMarksScored !== '' && dppTotalMarks !== ''
 ? ` | Score: ${dppMarksScored}/${dppTotalMarks} (${calculatedDppAccuracy}%)`
 : '';
 
 const isOneShot = (sessionType === 'Lecture' || sessionType === 'Theory') && numHours > 4;
 
 // Save to daily logged entry
 const taskDetails = sessionType === 'DPP' ? extraInfo.replace(' | ', '') : `(${numHours}h${isOneShot ? ' One-Shot' : ''}${numQuestions > 0 ? `, ${numQuestions} Qs` : ''})${extraInfo}`;
 const newLoggedTask = {
 id: Date.now(),
 text: `${subject} - ${chapter}: ${sessionType} ${taskDetails}`.trim(),
 completed: true,
 xpReward: finalEarnedXp,
 type: sessionType,
 subject,
 chapter,
 lectureHours: numHours,
 dppDone: (sessionType === 'Lecture' || sessionType === 'Theory' || sessionType === 'DPP') ? (dppStatus === 'solved' || sessionType === 'DPP') : undefined
 };
 
 if (!pendingTaskId) {
 setLoggedTasksToday([...loggedTasksToday, newLoggedTask]);
 }
 
 if (dppStatus === 'scheduled' && (sessionType === 'Lecture' || sessionType === 'Theory')) {
 setPendingTasks(prev => [...prev, {
 id: Date.now() + Math.random(),
 text: `DPP Backlog: ${subject} - ${chapter}${lectureNumber ? ` (Lecture ${lectureNumber})` : ''}`,
 completed: false,
 xpReward: 50,
 type: 'DPP',
 subject,
 chapter,
 lectureNumber: parseInt(lectureNumber as string) || undefined
 }]);
 }
 
 // Update local task if completed from log
 if (pendingTaskId) {
 setTodos(todos.map(t => {
 if (t.id === pendingTaskId) {
 return {
 ...t,
 lectureHours: numHours,
 homeworkDone: true, // simplified logic
 dppDone: (sessionType === 'Lecture' || sessionType === 'Theory') ? (dppStatus === 'solved') : undefined,
 xpReward: finalEarnedXp
 };
 }
 return t;
 }));
 setPendingTaskId(null);
 }
 
 hapticSuccess();
 
 setIsExpanded(false);
 setSubject(null);
 setChapter(null);
 setHours('1.75');
 setMinutes('');
 setLectureNumber('');
 setQuestions('');
 setIsLectureComplete(false);
 setAccuracy(80);
 setDppMarksScored('');
 setDppTotalMarks('');
 };

 return (
 <>
 <Card className="dark:border-cyan-500/40 border-cyan-300/40 dark:bg-[#0a0f1c]/80 bg-white shadow-md overflow-hidden relative mb-8 group font-sans">
 <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/5 to-blue-500/0 opacity-0 group-hover:opacity-100 transition-all duration-1000 pointer-events-none" />
 
 <div 
 className="p-6 cursor-pointer flex justify-between items-center relative z-10" 
 onClick={() => setIsExpanded(!isExpanded)}
 >
 <div className="flex items-center gap-4 group/logger">
 <motion.div whileHover={{ scale: 1.2, rotate: 15 }} className="p-3 bg-cyan-500/20 rounded-xl border border-cyan-500/30 shadow-md">
 <Activity className="w-6 h-6 dark:text-cyan-400 text-cyan-700 group-hover/logger:drop-shadow-md transition-all" />
 </motion.div>
 <div>
 <h2 className="text-2xl font-heading font-black dark:text-white text-slate-900 tracking-widest uppercase drop-shadow-md">Log JEE Session</h2>
 <p className="dark:text-cyan-400/70 text-cyan-700/70 text-xs font-bold tracking-widest uppercase mt-1">Report output to update your AIR trajectory</p>
 </div>
 </div>
 <ChevronDown className={`w-6 h-6 dark:text-cyan-400 text-cyan-700 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
 </div>
 
 <AnimatePresence>
 {isExpanded && (
 <motion.div
 initial={{ height: 0, opacity: 0 }}
 animate={{ height: 'auto', opacity: 1 }}
 exit={{ height: 0, opacity: 0 }}
 transition={{ duration: 0.3 }}
 className="border-t dark:border-slate-800 border-slate-200"
 >
 <CardContent className="p-6 space-y-8">
 
 {/* Subject & Session Type */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div>
 <label className="text-xs font-bold dark:text-slate-400 text-slate-600 uppercase tracking-wider mb-3 block">Subject</label>
 <div className="grid grid-cols-3 gap-2">
 {(['Physics', 'Chemistry', 'Mathematics'] as Subject[]).map(s => {
   const suggested = getCurrentChapterForSubject(s);
   return (
     <button
       key={s}
       onClick={() => { 
         setSubject(s); 
         setChapter(suggested); 
       }}
       className={`py-2.5 px-2 rounded-lg text-sm font-bold transition-all border flex flex-col items-center justify-center gap-1 ${subject === s ? 'bg-cyan-500/20 border-cyan-400 dark:text-cyan-300 dark:text-cyan-400 text-cyan-700 shadow-md' : 'dark:bg-black bg-slate-50 dark:border-slate-700 border-slate-300 dark:text-slate-400 text-slate-600 hover:border-slate-500'}`}
     >
       <span>{s}</span>
       {suggested && (
         <span className="text-[10px] dark:text-cyan-500/80 text-cyan-700/80 font-medium truncate max-w-full px-1">
           {suggested.substring(0, 10)}{suggested.length > 10 ? '...' : ''}
         </span>
       )}
     </button>
   );
 })}
 </div>
 </div>
 
 <div>
 <label className="text-xs font-bold dark:text-slate-400 text-slate-600 uppercase tracking-wider mb-3 block">Session Type</label>
 <div className="grid grid-cols-5 gap-2">
 {(['Lecture', 'Theory', 'Practice', 'PYQs', 'Revision'] as SessionType[]).map(t => (
 <button
 key={t}
 onClick={() => setSessionType(t)}
 className={`py-3 px-1 rounded-lg text-xs font-bold transition-all border ${sessionType === t ? 'bg-purple-500/20 border-purple-400 dark:text-purple-300 dark:text-purple-400 text-purple-700 shadow-md' : 'dark:bg-black bg-slate-50 dark:border-slate-700 border-slate-300 dark:text-slate-400 text-slate-600 hover:border-slate-500'}`}
 >
 {t}
 </button>
 ))}
 </div>
 </div>
 </div>

 {/* Chapter Selection Display */}
 {subject && (
 <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
 <label className="text-xs font-bold dark:text-slate-400 text-slate-600 uppercase tracking-wider mb-3 block">Selected Chapter</label>
 <div 
 onClick={() => setIsChapterModalOpen(true)}
 className={`p-4 rounded-xl border cursor-pointer transition-all flex justify-between items-center ${chapter ? 'bg-blue-500/10 border-blue-500/40 hover:bg-blue-500/20' : 'dark:bg-slate-900/50 bg-white dark:border-slate-700 border-slate-300 border-dashed hover:border-cyan-500/50'}`}
 >
 {chapter ? (
 <div className="flex items-center gap-3">
 <BookOpen className="w-5 h-5 dark:text-blue-400 text-blue-700" />
 <div className="flex flex-col sm:flex-row sm:items-center gap-2">
 <span className="text-lg font-heading font-bold dark:text-white text-slate-900">{chapter}</span>
 {chapter === getCurrentChapterForSubject(subject) && (
 <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full w-max">
 Current Chapter
 </span>
 )}
 </div>
 </div>
 ) : (
 <span className="dark:text-slate-500 text-slate-600 italic">Click to select a chapter...</span>
 )}
 <Button variant="ghost" size="sm" className="dark:text-cyan-400 text-cyan-700 hover:dark:text-cyan-300 dark:text-cyan-400 text-cyan-700 hover:bg-cyan-500/10">
 {chapter ? 'Change' : 'Select'}
 </Button>
 </div>
 </motion.div>
 )}

 {/* Metrics */}
 <div className="grid grid-cols-1 md:grid-cols-4 gap-6 tracking-wide">
 {sessionType !== 'DPP' && (
 <div>
 <label className="text-xs font-bold dark:text-slate-400 text-slate-600 uppercase tracking-wider mb-3 block">Hours</label>
 <input
 type="number"
 step="0.01"
 min="0"
 max={(sessionType === 'Lecture' || sessionType === 'Theory') ? 12 : 16}
 value={hours}
 onChange={(e) => {
 let val = parseFloat(e.target.value);
 const maxLimit = (sessionType === 'Lecture' || sessionType === 'Theory') ? 12 : 16;
 if (val > maxLimit) {
 setHours(maxLimit.toString());
 } else {
 setHours(e.target.value);
 }
 }}
 placeholder="e.g. 1.5"
 className="w-full dark:bg-black bg-slate-50 border dark:border-slate-700 border-slate-300 rounded-xl px-4 py-3 dark:text-white text-slate-900 font-mono text-lg focus:border-cyan-500 outline-none transition-all"
 />
 {(() => {
 const hVal = parseFloat(hours as string);
 if (isNaN(hVal) || hVal <= 0) return null;
 const wholeHours = Math.floor(hVal);
 const fraction = hVal - wholeHours;
 const mins = Math.round(fraction * 60);
 const hrsStr = wholeHours > 0 ? `${wholeHours} hour${wholeHours !== 1 ? 's' : ''}` : '';
 const minsStr = mins > 0 ? `${mins} minute${mins !== 1 ? 's' : ''}` : '';
 if (!hrsStr && !minsStr) return null;
 return (
 <p className="text-[11px] dark:text-slate-500 text-slate-600 mt-2 tracking-wide whitespace-nowrap">{hours} means {hrsStr} {minsStr}</p>
 );
 })()}
 </div>
 )}
 {sessionType === 'DPP' || sessionType === 'Lecture' || sessionType === 'Theory' ? (
 <div>
 <label className="text-xs font-bold dark:text-slate-400 text-slate-600 uppercase tracking-wider mb-3 block">Lec No.</label>
 <input
 type="number"
 min="1"
 value={lectureNumber}
 onChange={(e) => setLectureNumber(e.target.value)}
 placeholder="e.g. 4"
 className="w-full dark:bg-black bg-slate-50 border dark:border-slate-700 border-slate-300 rounded-xl px-4 py-3 dark:text-white text-slate-900 font-mono text-lg focus:border-purple-500 outline-none transition-all"
 />
 </div>
 ) : null}
 <div>
 <label className="text-xs font-bold dark:text-slate-400 text-slate-600 uppercase tracking-wider mb-3 block">Difficulty</label>
 <div className="grid grid-cols-3 gap-2">
 {(['Easy', 'Medium', 'Hard'] as const).map(d => (
 <button
 key={d}
 onClick={() => setDifficulty(d)}
 className={`py-3 px-1 rounded-xl text-xs font-bold transition-all border ${difficulty === d ? (d === 'Easy' ? 'bg-green-500/20 border-green-400 dark:text-green-300 dark:text-green-400 text-green-700' : d === 'Medium' ? 'bg-yellow-500/20 border-yellow-400 dark:text-yellow-300 dark:text-yellow-400 text-yellow-700' : 'bg-red-500/20 border-red-400 dark:text-red-300 dark:text-red-400 text-red-700') : 'dark:bg-black bg-slate-50 dark:border-slate-700 border-slate-300 dark:text-slate-400 text-slate-600'}`}
 >
 {d.charAt(0)}
 </button>
 ))}
 </div>
 </div>
 {sessionType === 'DPP' ? (
 <>
 <div>
 <label className="text-xs font-bold dark:text-slate-400 text-slate-600 uppercase tracking-wider mb-3 block">Marks Scored</label>
 <input
 type="number"
 min="0"
 value={dppMarksScored}
 onChange={(e) => setDppMarksScored(e.target.value)}
 placeholder="e.g. 15"
 className="w-full dark:bg-black bg-slate-50 border dark:border-slate-700 border-slate-300 rounded-xl px-4 py-3 dark:text-white text-slate-900 font-mono text-lg focus:border-cyan-500 outline-none transition-all"
 />
 </div>
 <div>
 <label className="text-xs font-bold dark:text-slate-400 text-slate-600 uppercase tracking-wider mb-3 block">Total Marks</label>
 <input
 type="number"
 min="1"
 value={dppTotalMarks}
 onChange={(e) => setDppTotalMarks(e.target.value)}
 placeholder="e.g. 20"
 className="w-full dark:bg-black bg-slate-50 border dark:border-slate-700 border-slate-300 rounded-xl px-4 py-3 dark:text-white text-slate-900 font-mono text-lg focus:border-cyan-500 outline-none transition-all"
 />
 </div>
 {parsedTotal > 0 && typeof dppMarksScored === 'string' && dppMarksScored !== '' && (
 <div className="md:col-span-2 text-center p-3 border border-cyan-500/30 bg-cyan-950/20 rounded-xl font-bold uppercase tracking-widest text-sm dark:text-cyan-400 text-cyan-700">
 Calculated Accuracy: {calculatedDppAccuracy}%
 </div>
 )}
 </>
 ) : (
 <div>
 <label className="text-xs font-bold dark:text-slate-400 text-slate-600 uppercase tracking-wider mb-3 block">Qs Solved</label>
 <input
 type="number"
 min="0"
 value={questions}
 onChange={(e) => setQuestions(e.target.value)}
 placeholder="e.g. 45"
 className="w-full dark:bg-black bg-slate-50 border dark:border-slate-700 border-slate-300 rounded-xl px-4 py-3 dark:text-white text-slate-900 font-mono text-lg focus:border-cyan-500 outline-none transition-all"
 />
 </div>
 )}
 </div>

 {/* Accuracy Slider */}
 {sessionType !== 'DPP' && (
 <div>
 <div className="flex justify-between mb-3">
 <label className="text-xs font-bold dark:text-slate-400 text-slate-600 uppercase tracking-wider">Accuracy: {accuracy}%</label>
 <span className="text-xs font-bold dark:text-slate-500 text-slate-600 uppercase tracking-wider">
 {accuracy >= 80 ? 'Building' : accuracy >= 50 ? 'Learning' : 'Struggling'}
 </span>
 </div>
 <input
 type="range"
 min="0"
 max="100"
 value={accuracy}
 onChange={(e) => setAccuracy(parseInt(e.target.value))}
 className="w-full h-2 dark:bg-slate-800 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-cyan-400"
 />
 </div>
 )}

 {/* Lecture Completion Checkbox */}
 {(sessionType === 'Lecture' || sessionType === 'Theory') && (
 <button 
 onClick={() => setIsLectureComplete(!isLectureComplete)}
 className="flex w-full items-center gap-4 dark:bg-black bg-slate-50 hover:bg-cyan-950/30 p-4 rounded-xl border dark:border-slate-700 border-slate-300/50 hover:border-cyan-900/50 transition-colors text-left"
 >
 <motion.div
 animate={{ scale: isLectureComplete ? [1, 1.2, 1] : 1 }}
 transition={{ duration: 0.2 }}
 className="shrink-0"
 >
 {isLectureComplete ? (
 <div className="w-6 h-6 flex items-center justify-center bg-cyan-500 rounded border border-cyan-400 shadow-md">
 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 dark:text-white text-slate-900">
 <polyline points="20 6 9 17 4 12"></polyline>
 </svg>
 </div>
 ) : (
 <div className="w-6 h-6 rounded border border-slate-600 dark:bg-slate-800 bg-slate-100" />
 )}
 </motion.div>
 <span className="text-sm font-medium dark:text-slate-300 text-slate-600">
 Mark all lectures complete for this chapter (100%)
 </span>
 </button>
 )}

 {/* Submit */}
 <Button 
 onClick={handlePreLogCheck}
 disabled={!subject || !chapter || (sessionType !== 'DPP' && !hours) || (sessionType === 'DPP' && (dppMarksScored === '' || dppTotalMarks === '' || parsedScored > parsedTotal || parsedTotal <= 0))}
 className="w-full py-6 text-xl font-bold uppercase tracking-[0.3em] font-mono bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 dark:text-white text-slate-900 shadow-md disabled:opacity-50 disabled:shadow-none transition-all group/inject"
 >
 <motion.div whileHover={{ scale: 1.2, rotate: 15 }} className="relative z-10">
 <Activity className="w-5 h-5 mr-3 group-hover/inject:drop-shadow-md transition-all" />
 </motion.div>
 Inject Mission Data
 </Button>

 </CardContent>
 </motion.div>
 )}
 </AnimatePresence>
 </Card>

 {createPortal(
 <AnimatePresence>
 {showDppModal && (
 <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 dark:bg-black bg-slate-50 overflow-y-auto custom-scrollbar">
 <motion.div
 initial={{ scale: 0.9, y: 20, opacity: 0 }}
 animate={{ scale: 1, y: 0, opacity: 1 }}
 exit={{ scale: 0.9, y: 20, opacity: 0 }}
 className="dark:bg-slate-900 bg-white border dark:border-slate-700 border-slate-300 p-6 md:p-8 rounded-2xl max-w-md w-full shadow-md relative overflow-hidden my-auto"
 >
 <h2 className="text-2xl font-black dark:text-white text-slate-900 mb-6 uppercase tracking-widest text-center">Daily Practice Problem</h2>
 
 {sessionType !== 'DPP' && (
 <div className="space-y-4 mb-8">
 <Button 
 variant={dppStatus === 'solved' ? "default" : "outline"}
 className={`w-full justify-start ${dppStatus === 'solved' ? 'bg-cyan-600 hover:bg-cyan-500 dark:text-white text-slate-900 border-cyan-500 shadow-md' : 'dark:border-slate-700 border-slate-300 dark:text-slate-300 text-slate-600'}`}
 onClick={() => setDppStatus('solved')}
 >
 <BookOpen className="w-4 h-4 mr-2" /> DPP Solved
 </Button>
 <Button 
 variant={dppStatus === 'not_solved' ? "destructive" : "outline"}
 className={`w-full justify-start ${dppStatus === 'not_solved' ? 'bg-red-600 hover:bg-red-500 dark:text-white text-slate-900 shadow-md' : 'dark:border-slate-700 border-slate-300 dark:text-slate-300 text-slate-600'} group/dpp1`}
 onClick={() => setDppStatus('not_solved')}
 >
 <motion.div whileHover={{ scale: 1.2, rotate: -15 }}><X className="w-4 h-4 mr-2 group-hover/dpp1:drop-shadow-md transition-all" /></motion.div> Did Not Solve DPP
 </Button>
 <Button 
 variant={dppStatus === 'not_provided' ? "secondary" : "outline"}
 className={`w-full justify-start ${dppStatus === 'not_provided' ? 'bg-slate-700 dark:text-white text-slate-900 border-slate-500' : 'dark:border-slate-700 border-slate-300 dark:text-slate-300 text-slate-600'} group/dpp2`}
 onClick={() => setDppStatus('not_provided')}
 >
 <motion.div whileHover={{ scale: 1.2, rotate: 15 }}><Activity className="w-4 h-4 mr-2 group-hover/dpp2:drop-shadow-md transition-all" /></motion.div> DPP Not Provided For Lecture
 </Button>
 <Button 
 variant={dppStatus === 'scheduled' ? "default" : "outline"}
 className={`w-full justify-start ${dppStatus === 'scheduled' ? 'bg-amber-600 hover:bg-amber-500 text-amber-100 border-amber-500 shadow-md' : 'dark:border-slate-700 border-slate-300 dark:text-slate-300 text-slate-600'}`}
 onClick={() => setDppStatus('scheduled')}
 >
 <BookOpen className="w-4 h-4 mr-2 dark:text-amber-400 text-amber-700" /> Schedule for Later
 </Button>
 </div>
 )}
 
 <AnimatePresence>
 {dppStatus === 'not_solved' && (
 <motion.div 
 initial={{ opacity: 0, height: 0 }}
 animate={{ opacity: 1, height: 'auto' }}
 exit={{ opacity: 0, height: 0 }}
 className="mb-8 p-4 bg-red-950/40 border border-red-500/50 rounded-lg text-sm dark:text-red-400 text-red-700 font-medium"
 >
 ⚠️ Warning: Since you skipped the DPP, you will receive a 50% XP penalty for this lecture session. The lecture cannot be fully completed without practicing!
 </motion.div>
 )}
 {dppStatus === 'scheduled' && (
 <motion.div 
 initial={{ opacity: 0, height: 0 }}
 animate={{ opacity: 1, height: 'auto' }}
 exit={{ opacity: 0, height: 0 }}
 className="mb-8 p-4 bg-amber-950/40 border border-amber-500/50 rounded-lg text-sm dark:text-amber-400 text-amber-700 font-medium"
 >
 ⚠️ Note: Since you scheduled the DPP for later, you will receive a 25% XP penalty for this lecture session. Make sure to complete it!
 </motion.div>
 )}
 {dppStatus === 'solved' && (
 <motion.div 
 initial={{ opacity: 0, height: 0 }}
 animate={{ opacity: 1, height: 'auto' }}
 exit={{ opacity: 0, height: 0 }}
 className="mb-8"
 >
 <div className="flex justify-between mb-3">
 <label className="text-xs font-bold dark:text-slate-400 text-slate-600 uppercase tracking-wider">DPP Accuracy</label>
 <span className={`text-xs font-bold uppercase tracking-wider ${calculatedDppAccuracy >= 80 ? 'dark:text-green-400 text-green-700' : calculatedDppAccuracy >= 50 ? 'dark:text-yellow-400 text-yellow-700' : 'dark:text-red-400 text-red-700'}`}>
 {parsedTotal > 0 ? `${calculatedDppAccuracy}% Accuracy` : 'Awaiting Input'}
 </span>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div className="relative">
 <label className="text-[10px] font-bold dark:text-slate-500 text-slate-600 uppercase absolute -top-2 left-3 dark:bg-slate-900 bg-white px-1">Marks Scored</label>
 <input
 type="number"
 min="0"
 value={dppMarksScored}
 onChange={(e) => setDppMarksScored(e.target.value)}
 className="w-full dark:bg-black bg-slate-50 border dark:border-slate-700 border-slate-300 rounded-lg p-3 dark:text-white text-slate-900 text-center text-lg focus:border-cyan-500 outline-none transition-colors font-mono"
 placeholder="e.g. 15"
 />
 </div>
 <div className="relative">
 <label className="text-[10px] font-bold dark:text-slate-500 text-slate-600 uppercase absolute -top-2 left-3 dark:bg-slate-900 bg-white px-1">Total Marks</label>
 <input
 type="number"
 min="1"
 value={dppTotalMarks}
 onChange={(e) => setDppTotalMarks(e.target.value)}
 className="w-full dark:bg-black bg-slate-50 border dark:border-slate-700 border-slate-300 rounded-lg p-3 dark:text-white text-slate-900 text-center text-lg focus:border-cyan-500 outline-none transition-colors font-mono"
 placeholder="e.g. 20"
 />
 </div>
 </div>
 </motion.div>
 )}
 </AnimatePresence>

 <div className="flex gap-3 mt-4">
 <Button 
 onClick={() => setShowDppModal(false)}
 variant="outline" 
 className="w-1/3 dark:border-slate-700 border-slate-300 dark:text-slate-400 text-slate-600 hover:dark:text-white text-slate-900"
 >
 Back
 </Button>
 <Button 
 disabled={dppStatus === 'solved' && (parsedTotal <= 0 || parsedScored > parsedTotal || dppMarksScored === '' || dppTotalMarks === '')}
 onClick={() => {
 handleLogSession();
 setShowDppModal(false);
 }}
 className={`w-2/3 dark:text-white text-slate-900 font-bold uppercase tracking-widest ${dppStatus === 'not_solved' ? 'bg-red-600 hover:bg-red-500 shadow-md' : 'bg-cyan-600 hover:bg-cyan-500 shadow-md'}`}
 >
 Confirm Logs
 </Button>
 </div>
 </motion.div>
 </div>
 )}
 </AnimatePresence>,
 document.body
 )}

 {createPortal(
 <AnimatePresence>
 {isChapterModalOpen && subject && (
 <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 dark:bg-black bg-slate-50 ">
 <motion.div 
 initial={{ opacity: 0, scale: 0.95, y: 20 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95, y: 20 }}
 className="dark:bg-[#0a0f1c] bg-white border border-cyan-500/50 rounded-2xl p-6 w-full max-w-4xl max-h-[85vh] flex flex-col shadow-md font-sans"
 >
 <div className="flex justify-between items-center mb-6">
 <div>
 <h3 className="text-2xl font-heading font-bold dark:text-white text-slate-900 uppercase tracking-wider">Select Chapter</h3>
 <p className="dark:text-cyan-400 text-cyan-700 text-sm font-medium">{subject}</p>
 </div>
 <Button variant="ghost" size="icon" onClick={() => setIsChapterModalOpen(false)} className="dark:text-slate-400 text-slate-600 hover:text-white hover:dark:bg-slate-800 bg-slate-100 rounded-full group/close">
 <motion.div whileHover={{ scale: 1.2, rotate: 90 }}><X className="w-6 h-6 group-hover/close:drop-shadow-md transition-all" /></motion.div>
 </Button>
 </div>
 
 <div className="overflow-y-auto custom-scrollbar pr-2 flex-1">
 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
 {syllabus[subject].map(c => {
   const isRecommended = getCurrentChapterForSubject(subject) === c.name;
   return (
     <button
       key={c.name}
       onClick={() => { 
         setChapter(c.name); 
         setIsChapterModalOpen(false); 
       }}
       className={`p-4 rounded-xl text-left transition-all border flex flex-col gap-2 relative overflow-hidden ${chapter === c.name ? 'bg-cyan-500/20 border-cyan-400 shadow-md' : isRecommended ? 'border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-950/10 hover:border-cyan-500/50' : 'dark:bg-black bg-slate-50 dark:border-slate-800 border-slate-200 hover:border-cyan-500/50 hover:dark:bg-slate-900 bg-white'}`}
     >
       <div className="flex items-center justify-between w-full">
         <span className={`text-sm font-bold leading-tight ${chapter === c.name ? 'dark:text-cyan-400 text-cyan-700' : isRecommended ? 'dark:text-emerald-400 text-emerald-700 font-bold' : 'dark:text-slate-200 text-slate-900'}`}>{c.name}</span>
         {isRecommended && (
           <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 animate-pulse">
             Current
           </span>
         )}
       </div>
       <div className="flex gap-2 mt-auto pt-2">
         <span className="text-[10px] px-2 py-1 rounded dark:bg-slate-800 bg-slate-100 dark:text-slate-400 text-slate-600 font-mono">Lec: {c.lectures}%</span>
         <span className="text-[10px] px-2 py-1 rounded dark:bg-slate-800 bg-slate-100 dark:text-slate-400 text-slate-600 font-mono">PYQ: {c.pyq}%</span>
       </div>
     </button>
   );
 })}
 </div>
 </div>
 </motion.div>
 </div>
 )}
 </AnimatePresence>,
 document.body
 )}
 </>
 );
}
