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
        {/* Vertical Bar */}
        <div className="relative w-10 md:w-14 min-h-[160px] md:min-h-[200px] bg-green-950/40 border border-green-500/30 rounded-lg md:rounded-xl overflow-hidden shrink-0 shadow-md flex flex-col justify-end">
          {/* Pure CSS Drops falling effect - zero re-renders */}
          <div className="absolute inset-0 z-0 rounded-lg md:rounded-xl overflow-hidden pointer-events-none">
            <style>
              {`
              @keyframes dropFall1 {
                0% { transform: translateY(-15px); opacity: 0.9; }
                80% { opacity: 0.7; }
                100% { transform: translateY(220px); opacity: 0; }
              }
              @keyframes dropFall2 {
                0% { transform: translateY(-15px); opacity: 0.8; }
                80% { opacity: 0.6; }
                100% { transform: translateY(220px); opacity: 0; }
              }
              .timebar-drop-1 {
                animation: dropFall1 1.8s cubic-bezier(0.4, 0, 1, 1) infinite;
              }
              .timebar-drop-2 {
                animation: dropFall2 2.4s cubic-bezier(0.4, 0, 1, 1) infinite 0.9s;
              }
              `}
            </style>
            <div className="timebar-drop-1 absolute top-0 left-[35%] w-1 md:w-1.5 h-3 md:h-4 bg-red-400 rounded-full shadow-md" />
            <div className="timebar-drop-2 absolute top-0 left-[65%] w-1 md:w-1.5 h-3 md:h-4 bg-red-400 rounded-full shadow-md" />
          </div>

          {/* Red water fill */}
          <motion.div
            className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-red-600 to-red-500/80 shadow-md z-10 rounded-b-lg md:rounded-b-xl"
            initial={{ height: 0 }}
            animate={{ height: `${fillPercentage}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-white shadow-md blur-[0.5px]" />
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMSIvPgo8L3N2Zz4=')] opacity-30 mix-blend-overlay hidden md:block" />
          </motion.div>
        </div>
        
        {/* Right Info Section */}
        <div className="flex flex-col flex-1 pr-12 md:pr-8 text-left py-1 md:py-2 justify-between gap-2 md:gap-4">
          <div className="flex flex-col gap-1 md:gap-2">
            <h3 className="text-[10px] md:text-sm font-bold dark:text-slate-300 text-slate-600 uppercase tracking-widest flex items-center gap-1.5 md:gap-2 w-max">
              <Clock className="w-3.5 h-3.5 md:w-4 md:h-4 dark:text-red-400 text-red-700" />
              Class 11th Time Remaining
            </h3>
            <div className="flex flex-row items-center gap-3 md:gap-6 flex-wrap mt-0">
              <div className="flex items-baseline gap-1.5 md:gap-2">
                <span className="text-4xl md:text-5xl font-black dark:text-red-400 text-red-700 font-mono tracking-tighter drop-shadow-md leading-none">
                  {daysLeft > 0 ? daysLeft : 0}
                </span>
                <span className="text-lg md:text-3xl font-black dark:text-red-400 text-red-700 md:dark:text-red-400 text-red-700 tracking-wider leading-none">
                  DAYS LEFT
                </span>
              </div>
              
              {requiredHours !== undefined && daysLeft > 0 && (
                <div className="bg-red-950/40 border border-red-500/40 px-3 py-1 md:px-4 md:py-2 rounded-lg flex items-center justify-center gap-2 shadow-md md:ml-4">
                  <Clock className="w-3 h-3 md:w-4 md:h-4 dark:text-red-400 text-red-700" />
                  <span className="text-sm md:text-xl font-black dark:text-red-400 text-red-700 font-mono leading-none">{Math.ceil(requiredHours)}</span>
                  <span className="text-[9px] md:text-xs font-bold dark:text-red-400 text-red-700/80 uppercase tracking-widest mt-px">hrs/day required</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex gap-2 md:gap-4 mt-auto">
            <div className="dark:bg-black bg-slate-50 px-3 py-2 md:p-4 rounded-md md:rounded-xl border dark:border-white/5 border-black/5 flex flex-col justify-center flex-1 md:flex-initial min-w-[100px] md:min-w-[160px]">
              <p className="text-slate-500 mb-1 md:mb-1.5 text-[7px] md:text-xs uppercase tracking-widest font-bold leading-tight">Start Date</p>
              <p className="dark:text-white text-slate-900 font-bold font-mono text-[9px] md:text-sm leading-tight">{startDate.toLocaleDateString()}</p>
            </div>
            <div className="bg-red-950/40 px-3 py-2 md:p-4 rounded-md md:rounded-xl border border-red-500/30 flex flex-col justify-center flex-1 md:flex-initial min-w-[100px] md:min-w-[160px]">
              <p className="dark:text-red-400 text-red-700/80 mb-1 md:mb-1.5 text-[7px] md:text-xs uppercase tracking-widest font-bold leading-tight">Time Elapsed</p>
              <p className="dark:text-red-400 text-red-700 font-bold font-mono text-[9px] md:text-sm leading-tight drop-shadow-md">{fillPercentage.toFixed(4)}%</p>
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
