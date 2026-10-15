import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Card, CardContent } from '@/components/ui/card';
import { Clock } from 'lucide-react';

interface TimeBarProps {
  endDateStr: string;
  requiredHours?: number;
  onStartDeepFocus?: () => void;
}

export const TimeBar: React.FC<TimeBarProps> = React.memo(({ endDateStr, requiredHours, onStartDeepFocus }) => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    // 60-second interval is optimal and saves CPU cycles and garbage collection
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const { startDate, endDate, fillPercentage, daysLeft } = useMemo(() => {
    const end = new Date(endDateStr);
    let startYear = end.getFullYear();
    if (end.getMonth() < 3) {
      startYear -= 1;
    }
    const start = new Date(startYear, 3, 1);
    const totalTime = end.getTime() - start.getTime();
    const elapsedTime = now.getTime() - start.getTime();
    let fill = (elapsedTime / (totalTime || 1)) * 100;
    fill = Math.max(0, Math.min(100, fill));
    const days = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return {
      startDate: start,
      endDate: end,
      fillPercentage: fill,
      daysLeft: days,
    };
  }, [endDateStr, now]);

  return (
    <Card className="h-full dark:bg-black bg-slate-50 dark:border-slate-800 border-slate-200 rounded-3xl md:rounded-2xl overflow-hidden relative group shadow-lg md:shadow-none p-4 md:p-6 flex flex-col justify-center">
      {onStartDeepFocus && (
        <div className="absolute top-4 right-4 z-40">
          <div className="relative group/btn">
            <div className="absolute inset-0 bg-purple-500 rounded-full blur-md opacity-40 animate-pulse group-hover/btn:opacity-70 transition-opacity" />
            <motion.button 
              onClick={onStartDeepFocus}
              className="relative flex items-center justify-center p-3 md:p-4 rounded-full bg-slate-100 dark:bg-black border border-purple-500/50 transition-all active:scale-95 cursor-pointer"
              whileHover={{ scale: 1.15, rotate: 5 }}
              whileTap={{ scale: 0.9, rotate: -5 }}
              aria-label="Start Deep Focus"
            >
              <div className="relative flex items-center justify-center">
                <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400 animate-spin-slow" />
              </div>
            </motion.button>
          </div>
        </div>
      )}

      <CardContent className="p-0 flex flex-row gap-4 md:gap-8 items-stretch relative z-10 w-full">
        {/* Vertical Tube Bar */}
        <div className="relative w-10 md:w-14 min-h-[160px] md:min-h-[200px] bg-[#071813] dark:bg-[#02140d] border border-emerald-500/40 dark:border-emerald-500/50 rounded-lg md:rounded-xl overflow-hidden shrink-0 shadow-[0_0_12px_rgba(16,185,129,0.2),inset_0_0_10px_rgba(16,185,129,0.12)] ring-1 ring-emerald-500/25 flex flex-col justify-end">
          {/* Pure CSS Drops falling effect - EXACTLY 1 drop per second */}
          <div className="absolute inset-0 z-0 rounded-lg md:rounded-xl overflow-hidden pointer-events-none">
            <style>
              {`
              @keyframes exactOneDropPerSecond {
                0% {
                  transform: translate3d(-50%, -20px, 0) scaleY(1.3);
                  opacity: 0;
                }
                12% {
                  opacity: 1;
                }
                85% {
                  opacity: 0.95;
                }
                100% {
                  transform: translate3d(-50%, 215px, 0) scaleY(0.75);
                  opacity: 0;
                }
              }
              .timebar-drop-single {
                animation: exactOneDropPerSecond 1.0s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
                will-change: transform, opacity;
              }
              `}
            </style>
            {/* Strictly ONE warm coral-red drop falling per second */}
            <div className="timebar-drop-single absolute top-0 left-1/2 w-1.5 md:w-2 h-4 md:h-5 bg-[#f87171] rounded-full shadow-[0_0_6px_rgba(248,113,113,0.7)]" />
          </div>

          {/* Warm Coral-Red Water Fill with subtle light-pink/white meniscus */}
          <motion.div
            className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-[#c53737] via-[#dc4747] to-[#f87171] z-10 rounded-b-lg md:rounded-b-xl"
            initial={{ height: 0 }}
            animate={{ height: `${fillPercentage}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          >
            {/* Subtle light-pink/white horizontal gradient meniscus along the top edge */}
            <div className="absolute top-0 left-0 w-full h-[2.5px] bg-gradient-to-r from-pink-200/70 via-white/95 to-pink-200/70 shadow-[0_0_6px_rgba(255,255,255,0.8)]" />
          </motion.div>
        </div>
        
        {/* Right Info Section */}
        <div className="flex flex-col flex-1 pr-12 md:pr-8 text-left py-1 md:py-2 justify-between gap-2 md:gap-4">
          <div className="flex flex-col gap-1 md:gap-2">
            <h3 className="text-[10px] md:text-sm font-bold dark:text-slate-300 text-slate-600 uppercase tracking-widest flex items-center gap-1.5 md:gap-2 w-max">
              <Clock className="w-3.5 h-3.5 md:w-4 md:h-4 dark:text-[#f87171] text-[#e05252]" />
              Class 11th Time Remaining
            </h3>
            <div className="flex flex-row items-center gap-3 md:gap-6 flex-wrap mt-0">
              <div className="flex items-baseline gap-1.5 md:gap-2">
                <span className="text-4xl md:text-5xl font-black dark:text-[#f87171] text-[#e05252] font-mono tracking-tighter leading-none">
                  {daysLeft > 0 ? daysLeft : 0}
                </span>
                <span className="text-lg md:text-3xl font-black dark:text-[#f87171] text-[#e05252] tracking-wider leading-none">
                  DAYS LEFT
                </span>
              </div>
              
              {requiredHours !== undefined && daysLeft > 0 && (
                <div className="bg-[#f87171]/10 dark:bg-[#f87171]/15 border border-[#f87171]/30 px-3 py-1 md:px-4 md:py-2 rounded-lg flex items-center justify-center gap-2 shadow-sm md:ml-4">
                  <Clock className="w-3 h-3 md:w-4 md:h-4 dark:text-[#f87171] text-[#e05252]" />
                  <span className="text-sm md:text-xl font-black dark:text-[#f87171] text-[#e05252] font-mono leading-none">{Math.ceil(requiredHours)}</span>
                  <span className="text-[9px] md:text-xs font-bold dark:text-[#f87171]/80 text-[#e05252]/80 uppercase tracking-widest mt-px">hrs/day required</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex gap-2 md:gap-4 mt-auto">
            <div className="dark:bg-black bg-slate-50 px-3 py-2 md:p-4 rounded-md md:rounded-xl border dark:border-white/5 border-black/5 flex flex-col justify-center flex-1 md:flex-initial min-w-[100px] md:min-w-[160px]">
              <p className="text-slate-500 mb-1 md:mb-1.5 text-[7px] md:text-xs uppercase tracking-widest font-bold leading-tight">Start Date</p>
              <p className="dark:text-white text-slate-900 font-bold font-mono text-[9px] md:text-sm leading-tight">{startDate.toLocaleDateString()}</p>
            </div>
            <div className="bg-[#f87171]/10 dark:bg-[#f87171]/15 px-3 py-2 md:p-4 rounded-md md:rounded-xl border border-[#f87171]/25 flex flex-col justify-center flex-1 md:flex-initial min-w-[100px] md:min-w-[160px]">
              <p className="dark:text-[#f87171]/80 text-[#e05252]/80 mb-1 md:mb-1.5 text-[7px] md:text-xs uppercase tracking-widest font-bold leading-tight">Time Elapsed</p>
              <p className="dark:text-[#f87171] text-[#e05252] font-bold font-mono text-[9px] md:text-sm leading-tight">{fillPercentage.toFixed(4)}%</p>
            </div>
            <div className="dark:bg-black bg-slate-50 px-3 py-2 md:p-4 rounded-md md:rounded-xl border dark:border-white/5 border-black/5 flex flex-col justify-center flex-1 md:flex-initial hidden md:flex min-w-[100px] md:min-w-[160px]">
              <p className="text-slate-500 mb-1 md:mb-1.5 text-[7px] md:text-xs uppercase tracking-widest font-bold leading-tight">End Date</p>
              <p className="dark:text-white text-slate-900 font-bold font-mono text-[9px] md:text-sm leading-tight">{endDate.toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

export default TimeBar;
