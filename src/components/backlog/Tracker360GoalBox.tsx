import React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Layers,
  Clock,
  Zap,
  Target,
  CheckCircle2,
  Play,
  X,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Flame,
  BookOpen
} from "lucide-react";
import { Todo } from "@/context/AppContext";
import { BacklogPlan } from "@/lib/backlog/types";

interface Tracker360GoalBoxProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Todo[];
  backlogPlan: BacklogPlan | null;
  onStartTask?: (task: Todo) => void;
}

export const Tracker360GoalBox: React.FC<Tracker360GoalBoxProps> = ({
  isOpen,
  onClose,
  tasks,
  backlogPlan,
  onStartTask,
}) => {
  if (!isOpen) return null;

  // Calculate total duration in minutes
  const totalMinutes = tasks.reduce((sum, t) => sum + (t.durationMinutes || 60), 0);
  const totalHours = Math.floor(totalMinutes / 60);
  const remainderMins = totalMinutes % 60;
  const timeFormatted = `${totalHours > 0 ? `${totalHours}h ` : ""}${remainderMins > 0 ? `${remainderMins}m` : totalHours === 0 ? "0m" : ""}`;

  // Calculate total XP
  const totalXp = tasks.reduce((sum, t) => sum + (t.xpReward || 100), 0);
  const completedCount = tasks.filter((t) => t.completed).length;

  // Sprint day calculation if available
  const sprintDayIndex = tasks.find((t) => t.backlogDayIndex)?.backlogDayIndex || 1;
  const totalSprintDays = backlogPlan?.metrics?.availableStudyDays || 30;

  const getSubjectColor = (subject?: string) => {
    switch (subject?.toLowerCase()) {
      case "physics":
        return {
          bg: "bg-cyan-500/10 dark:bg-cyan-500/20",
          text: "text-cyan-700 dark:text-cyan-400",
          border: "border-cyan-500/40",
          dot: "bg-cyan-400",
        };
      case "chemistry":
        return {
          bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
          text: "text-emerald-700 dark:text-emerald-400",
          border: "border-emerald-500/40",
          dot: "bg-emerald-400",
        };
      case "mathematics":
      case "math":
        return {
          bg: "bg-purple-500/10 dark:bg-purple-500/20",
          text: "text-purple-700 dark:text-purple-400",
          border: "border-purple-500/40",
          dot: "bg-purple-400",
        };
      default:
        return {
          bg: "bg-amber-500/10 dark:bg-amber-500/20",
          text: "text-amber-700 dark:text-amber-400",
          border: "border-amber-500/40",
          dot: "bg-amber-400",
        };
    }
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 overflow-hidden">
          {/* Backdrop with Frosted Glass */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
          />

          {/* Unfolding Goal Box Sheet rising from below */}
          <motion.div
            initial={{ y: "100%", opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: "100%", opacity: 0, scale: 0.95 }}
            transition={{
              type: "spring",
              damping: 26,
              stiffness: 220,
              mass: 0.9,
            }}
            className="relative w-full max-w-2xl dark:bg-slate-900 bg-white border border-amber-500/40 sm:rounded-3xl rounded-t-3xl shadow-[0_-10px_40px_rgba(245,158,11,0.15)] overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[85vh] z-10"
          >
            {/* Top Amber Glow Bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-cyan-400 to-amber-500 animate-pulse" />

            {/* Header */}
            <div className="p-6 pb-4 border-b dark:border-slate-800 border-slate-200 relative flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                    <Layers className="w-3.5 h-3.5 animate-spin-slow" /> TRACKER 360 BRIEFING
                  </span>
                  <span className="text-xs font-mono dark:text-slate-400 text-slate-500">
                    Day {sprintDayIndex} of {totalSprintDays}
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black dark:text-white text-slate-900 tracking-tight flex items-center gap-2">
                  Today's Mission Roadmap
                </h2>
                <p className="text-xs sm:text-sm dark:text-slate-400 text-slate-600 mt-0.5">
                  Full targeted breakdown for today. Execute sequentially to maintain sprint velocity.
                </p>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-xl dark:bg-slate-800 bg-slate-100 dark:text-slate-400 text-slate-500 hover:dark:text-white hover:text-slate-900 transition-colors"
                aria-label="Close Roadmap"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-3 gap-3 p-4 sm:p-6 bg-slate-50/50 dark:bg-slate-950/40 border-b dark:border-slate-800/80 border-slate-200">
              <div className="p-3 rounded-2xl dark:bg-slate-900 bg-white border dark:border-slate-800 border-slate-200 text-center shadow-xs">
                <span className="text-[11px] font-mono uppercase tracking-wider dark:text-slate-400 text-slate-500 flex items-center justify-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-cyan-500" /> Target Study
                </span>
                <span className="text-lg sm:text-2xl font-black dark:text-cyan-400 text-cyan-600 block mt-0.5">
                  {timeFormatted}
                </span>
              </div>

              <div className="p-3 rounded-2xl dark:bg-slate-900 bg-white border dark:border-slate-800 border-slate-200 text-center shadow-xs">
                <span className="text-[11px] font-mono uppercase tracking-wider dark:text-slate-400 text-slate-500 flex items-center justify-center gap-1">
                  <Target className="w-3.5 h-3.5 text-amber-500" /> Objectives
                </span>
                <span className="text-lg sm:text-2xl font-black dark:text-amber-400 text-amber-600 block mt-0.5">
                  {completedCount}/{tasks.length}
                </span>
              </div>

              <div className="p-3 rounded-2xl dark:bg-slate-900 bg-white border dark:border-slate-800 border-slate-200 text-center shadow-xs">
                <span className="text-[11px] font-mono uppercase tracking-wider dark:text-slate-400 text-slate-500 flex items-center justify-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-emerald-500" /> Total XP
                </span>
                <span className="text-lg sm:text-2xl font-black dark:text-emerald-400 text-emerald-600 block mt-0.5">
                  +{totalXp} XP
                </span>
              </div>
            </div>

            {/* Task Roadmap List (Sequential Flow) */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 custom-scrollbar">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider dark:text-slate-400 text-slate-600">
                  Sequential Target Schedule
                </span>
                <span className="text-xs font-mono text-cyan-600 dark:text-cyan-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> High Feasibility
                </span>
              </div>

              {tasks.length === 0 ? (
                <div className="text-center py-10 dark:text-slate-400 text-slate-600 font-mono text-sm">
                  No Tracker 360 tasks scheduled for today. Create or recalculate your roadmap in Tracker 360.
                </div>
              ) : (
                tasks.map((task, index) => {
                  const colors = getSubjectColor(task.subject);
                  const isDone = task.completed;

                  return (
                    <motion.div
                      key={task.id || `task-${index}`}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.06 + 0.1 }}
                      className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                        isDone
                          ? "dark:bg-emerald-950/20 bg-emerald-50/50 border-emerald-500/30 opacity-75"
                          : "dark:bg-slate-950/60 bg-white border-slate-200 dark:border-slate-800 hover:border-amber-500/40"
                      }`}
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {/* Step number badge */}
                        <div className="w-7 h-7 rounded-xl dark:bg-slate-800 bg-slate-100 flex items-center justify-center font-mono font-bold text-xs dark:text-slate-300 text-slate-700 shrink-0 mt-0.5">
                          {index + 1}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            {task.subject && (
                              <span
                                className={`px-2 py-0.5 rounded-md text-[11px] font-bold font-mono border ${colors.bg} ${colors.text} ${colors.border}`}
                              >
                                {task.subject}
                              </span>
                            )}
                            {task.chapter && (
                              <span className="text-xs font-medium dark:text-slate-400 text-slate-600 truncate max-w-[200px]">
                                {task.chapter}
                              </span>
                            )}
                          </div>

                          <h4
                            className={`text-sm sm:text-base font-bold truncate ${
                              isDone
                                ? "line-through dark:text-slate-500 text-slate-400"
                                : "dark:text-white text-slate-900"
                            }`}
                          >
                            {task.text}
                          </h4>

                          <div className="flex items-center gap-3 mt-1.5 text-xs font-mono dark:text-slate-400 text-slate-500">
                            <span className="flex items-center gap-1 text-cyan-600 dark:text-cyan-400 font-semibold">
                              <Clock className="w-3.5 h-3.5" />
                              {task.durationMinutes || 60} mins
                            </span>
                            <span>•</span>
                            <span className="text-amber-600 dark:text-amber-400">
                              +{task.xpReward || 100} XP
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action */}
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        {isDone ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                          </span>
                        ) : onStartTask ? (
                          <button
                            onClick={() => {
                              onStartTask(task);
                              onClose();
                            }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold font-mono bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white shadow-xs hover:scale-105 transition-all"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" /> Focus Now
                          </button>
                        ) : (
                          <span className="text-xs font-mono font-semibold dark:text-slate-400 text-slate-500">
                            Pending
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Bottom Footer Call-To-Action */}
            <div className="p-4 sm:p-6 border-t dark:border-slate-800 border-slate-200 bg-slate-50/50 dark:bg-slate-950/60 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs font-mono dark:text-slate-400 text-slate-500 text-center sm:text-left">
                🎯 Target Finish:{" "}
                <span className="dark:text-white text-slate-900 font-bold">
                  {timeFormatted} of high-intensity study
                </span>
              </div>

              <button
                onClick={onClose}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-white shadow-md shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              >
                <span>LOCK IN & START GRIND</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return typeof document !== "undefined"
    ? createPortal(modalContent, document.body)
    : null;
};
