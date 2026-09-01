import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, AlertTriangle, Play, Pause, Square, XSquare, ShieldAlert, Zap } from "lucide-react";
import { HAPTIC_PATTERNS, vibrate } from "@/lib/haptics";
import { Capacitor } from "@capacitor/core";

interface ImmersiveTimerProps {
  initialSeconds: number;
  taskId: number | string | null;
  taskName?: string;
  isStrictMode: boolean;
  onComplete: (elapsedSeconds: number, completedTaskId: number | string | null, breaches: number) => void;
  onExitEarly: (elapsedSeconds: number, breaches: number) => void;
}

export function ImmersiveTimer({
 initialSeconds,
 taskId,
 taskName,
 isStrictMode,
 onComplete,
 onExitEarly,
}: ImmersiveTimerProps) {
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const [isActive, setIsActive] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [breaches, setBreaches] = useState(0);
  const [isBreached, setIsBreached] = useState(false);
  const [breachReason, setBreachReason] = useState("");
  
  const endTimeRef = useRef<number | null>(null);

  // Hold-to-exit state
  const [holdProgress, setHoldProgress] = useState(0);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const elapsedSeconds = initialSeconds - timeLeft;
  const elapsedMins = Math.floor(elapsedSeconds / 60);
  let currentMultiplier = 1;
  if (elapsedMins >= 90) currentMultiplier = 2.0;

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && !isPaused && !isBreached && timeLeft > 0) {
      endTimeRef.current = Date.now() + timeLeft * 1000;
      interval = setInterval(() => {
        if (endTimeRef.current) {
          const remaining = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
          setTimeLeft(remaining);
          if (remaining <= 0) {
             setIsActive(false);
             vibrate(HAPTIC_PATTERNS.SUCCESS);
             onComplete(initialSeconds, taskId, breaches);
             if (document.fullscreenElement) {
               document.exitFullscreen().catch(() => {});
             }
          }
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive, isPaused, isBreached, initialSeconds, taskId, onComplete, breaches]);

  useEffect(() => {
    if (!isStrictMode) return;
    const isNative = Capacitor.isNativePlatform();

    const requestFS = () => {
      if (!isNative && !document.fullscreenElement && containerRef.current) {
        containerRef.current.requestFullscreen().catch(() => {});
      }
    };
    
    // Initial request
    requestFS();

    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerBreach("APP / TAB SWITCHING DETECTED");
      }
    };

    const handleFullscreenChange = () => {
      if (!isNative && !document.fullscreenElement) {
        triggerBreach("EXITED FULLSCREEN");
      }
    };
    
    const handleBlur = () => {
      if (!isNative) {
        triggerBreach("WINDOW FOCUS LOST");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      window.removeEventListener("blur", handleBlur);
    };
  }, [isStrictMode]);

 const triggerBreach = (reason: string) => {
 if (!isBreached) {
 setIsPaused(true);
 setIsBreached(true);
 setBreachReason(reason);
 setBreaches(prev => prev + 1);
 }
 };

 const handleResumeFromBreach = () => {
 setIsBreached(false);
 setIsPaused(false);
 if (isStrictMode && !document.fullscreenElement && containerRef.current) {
 containerRef.current.requestFullscreen().catch(() => {});
 }
 };

 const handleStop = () => {
 const elapsed = initialSeconds - timeLeft;
 if (document.fullscreenElement) {
 document.exitFullscreen().catch(() => {});
 }
 onExitEarly(elapsed, breaches);
 };

 const togglePause = () => {
 setIsPaused(!isPaused);
 };

 useEffect(() => {
 if (holdProgress >= 100) {
 if (holdTimerRef.current) clearInterval(holdTimerRef.current);
 handleStop();
 setHoldProgress(0);
 }
 }, [holdProgress]);

 const handleHoldStart = () => {
 if (holdTimerRef.current) clearInterval(holdTimerRef.current);
 setHoldProgress(0);
 holdTimerRef.current = setInterval(() => {
 setHoldProgress(prev => prev + (100 / (20 * 10))); // 20 seconds, updating every 100ms
 }, 100);
 };

 const handleHoldEnd = () => {
 if (holdTimerRef.current) {
 clearInterval(holdTimerRef.current);
 holdTimerRef.current = null;
 }
 if (holdProgress < 100) {
 setHoldProgress(0);
 }
 };

 const formatTime = (seconds: number) => {
 const h = Math.floor(seconds / 3600);
 const m = Math.floor((seconds % 3600) / 60);
 const s = seconds % 60;
 if (h > 0) {
 return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
 }
 return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
 };

 return createPortal(
 <motion.div
 ref={containerRef}
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 transition={{ duration: 0.8 }}
 className="fixed inset-0 z-[9999] flex flex-col items-center justify-center dark:bg-black bg-slate-50 pointer-events-auto overflow-hidden dark:text-slate-200 text-slate-900"
 >
 {/* Ambient glowing background */}
 <div className="absolute inset-0 bg-gradient-to-br from-[#0ae]/5 via-black to-[#a855f7]/5 opacity-70 pointer-events-none" />
 <motion.div 
 animate={{ opacity: [0.2, 0.4, 0.2] }} 
 transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
 className="absolute w-full h-full pointer-events-none opacity-50"
 style={{ background: 'radial-gradient(circle at center, rgba(6,182,212,0.08) 0%, rgba(168,85,247,0.08) 40%, transparent 70%)' }}
 />

 <AnimatePresence>
 {isBreached && isStrictMode && (
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-t from-[#2a0808] to-[#0f0000] "
 >
 <div className="flex flex-col items-center max-w-lg text-center px-4">
 <div className="relative mb-8">
 <div className="absolute inset-0 bg-red-600  opacity-20 rounded-full" />
 <ShieldAlert className="w-20 h-20 dark:text-red-400 text-red-700 relative z-10 drop-shadow-md" strokeWidth={1.5} />
 </div>
 <h2 className="text-4xl sm:text-6xl font-black dark:text-white text-slate-900 uppercase tracking-widest mb-6">Focus Breached</h2>
 <p className="text-sm sm:text-base dark:text-red-400 text-red-700 font-mono mb-12 uppercase tracking-widest">{breachReason}</p>
 
 <button
 onClick={handleResumeFromBreach}
 className="bg-red-600 hover:bg-red-500 text-white font-bold px-8 py-4 rounded-xl tracking-[0.1em] uppercase text-sm sm:text-base shadow-md hover:shadow-md transition-all hover:scale-105 flex items-center gap-3"
 >
 <Play className="w-5 h-5 fill-current" />
 Resume Focus & Enter Fullscreen
 </button>
 </div>
 </motion.div>
 )}
 </AnimatePresence>

 <motion.div
 initial={{ scale: 0.9, y: 20, opacity: 0 }}
 animate={{ scale: 1, y: 0, opacity: 1 }}
 exit={{ scale: 0.9, opacity: 0 }}
 transition={{ type: "spring", bounce: 0.3, duration: 1 }}
 className="text-center relative z-10 flex flex-col items-center w-full max-w-none px-4"
 >
 {/* Task Name & Badges Display */}
 <div className="mb-8 flex flex-wrap justify-center gap-4 min-h-[32px]">
 <AnimatePresence>
 {taskName && (
 <motion.div
 key="taskNameBadge"
 initial={{ opacity: 0, y: -20 }}
 animate={{ opacity: 1, y: 0 }}
 className="inline-flex items-center gap-2 px-4 py-2 rounded-full dark:bg-slate-900/50 bg-white border dark:border-slate-800 border-slate-200 dark:text-slate-300 text-slate-600 font-mono text-sm"
 >
 <CheckCircle2 className="w-4 h-4 dark:text-cyan-400 text-cyan-700" />
 {taskName}
 </motion.div>
 )}
 {currentMultiplier > 1 && (
 <motion.div
 key="multiplierBadge"
 initial={{ opacity: 0, scale: 0.8 }}
 animate={{ opacity: 1, scale: 1 }}
 className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-900/40 border border-indigo-500/50 dark:text-indigo-300 text-indigo-600 font-bold uppercase tracking-widest text-xs drop-shadow-md"
 >
 <Zap className="w-4 h-4 dark:text-indigo-400 text-indigo-600" />
 {currentMultiplier}x EXP ACTIVE
 </motion.div>
 )}
 {isStrictMode && (
 <motion.div
 key="strictModeBadge"
 initial={{ opacity: 0, y: -20 }}
 animate={{ opacity: 1, y: 0 }}
 className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-900/40 border border-red-500/50 dark:text-red-300 dark:text-red-400 text-red-700 font-mono text-sm"
 >
 <AlertTriangle className="w-4 h-4 dark:text-red-400 text-red-700" />
 STRICT MODE ACTIVE
 </motion.div>
 )}
 </AnimatePresence>
 </div>

 {/* Time Display (Breathing) */}
 <motion.div 
 animate={isActive && !isPaused && !isBreached ? { scale: [1, 1.02, 1] } : { scale: 1 }}
 transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
 className={`${timeLeft >= 3600 ? 'text-[60px] sm:text-[100px] md:text-[140px] lg:text-[160px]' : 'text-[100px] sm:text-[140px] md:text-[180px] lg:text-[220px]'} leading-none font-black text-transparent bg-clip-text bg-gradient-to-r from-[#0ae] via-[#3b82f6] to-[#a855f7] tracking-normal font-sans mb-4 w-full flex justify-center whitespace-nowrap px-4 ${!isActive || isPaused ? 'opacity-50' : 'opacity-100'}`}
 style={{ willChange: "transform", lineHeight: "1.1", fontVariantNumeric: "tabular-nums" }}
 >
 {formatTime(timeLeft)}
 </motion.div>
 
 <div className="text-xl sm:text-2xl font-bold tracking-[0.3em] uppercase dark:text-slate-200 text-slate-900 mb-12 h-8">
 {isBreached ? 'Breached' : isPaused ? 'Timer Paused' : 'Deep Focus Engaged'}
 </div>

 {/* Controls */}
 <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mt-8 w-full max-w-2xl px-4 relative z-20">
 {!isStrictMode ? (
 <div className="flex items-center justify-center gap-4">
 <button
 onClick={togglePause}
 className={`w-14 h-14 rounded-full flex items-center justify-center transition-all border ${
 isPaused
 ? 'bg-cyan-900/40 dark:text-cyan-400 text-cyan-700 border-cyan-500/50 hover:bg-cyan-800/40 drop-shadow-md'
 : 'bg-transparent dark:text-slate-400 text-slate-600 dark:border-slate-700 border-slate-300/50 hover:dark:bg-slate-800 bg-slate-100 hover:dark:text-white text-slate-900 hover:border-slate-500'
 }`}
 title={isPaused ? "Resume Session" : "Pause Session"}
 >
 {isPaused ? <Play className="w-5 h-5 ml-1" /> : <Pause className="w-5 h-5" />}
 </button>
 
 <button
 onClick={handleStop}
 className="w-14 h-14 rounded-full flex items-center justify-center transition-all bg-transparent dark:text-slate-400 text-slate-600 border dark:border-slate-700 border-slate-300/50 hover:bg-rose-900/30 hover:dark:text-rose-400 text-rose-700 hover:border-rose-500/50"
 title="End Session"
 >
 <Square className="w-4 h-4 ml-[1px]" />
 </button>
 </div>
 ) : (
 <div className="w-full flex justify-center flex-col items-center">
 <button
 onMouseDown={handleHoldStart}
 onMouseUp={handleHoldEnd}
 onMouseLeave={handleHoldEnd}
 onTouchStart={handleHoldStart}
 onTouchEnd={handleHoldEnd}
 className="relative overflow-hidden px-10 py-5 rounded-xl font-bold uppercase tracking-[0.2em] text-sm transition-all dark:bg-slate-900 bg-white border border-rose-900 shadow-md group select-none"
 >
 <div 
 className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-red-700 to-rose-500 transition-all duration-100 ease-linear"
 style={{ width: `${holdProgress}%` }}
 />
 <span className="relative z-10 dark:text-rose-300 dark:text-rose-400 text-rose-700 group-hover:dark:text-white text-slate-900 flex items-center justify-center gap-2">
 <XSquare className="w-5 h-5" /> 
 Hold To Abort
 </span>
 </button>
 <div className="dark:text-rose-400 text-rose-700/50 font-mono text-[10px] uppercase mt-4 text-center">
 Hold for 20 seconds. <br/> Minimum 15-minute log required.
 </div>
 </div>
 )}
 </div>
 </motion.div>
 </motion.div>,
 document.body
 );
}
