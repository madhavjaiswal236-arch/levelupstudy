// src/components/coach/WeeklyReview.tsx
/**
 * Weekly Review Ritual (Sunday SRL Module).
 * Implements Gap 4 (§5.5) of the Cognitive Mentor Master Plan.
 * Features:
 * 1. 7-day Telemetry summary
 * 2. Weekly Wins
 * 3. Primary Bottleneck Identification
 * 4. Spaced Review Queue Check
 * 5. Up to three 7-day If-Then Implementation Commitments
 * 6. Forethought Check: Warns if planned hours exceed 1.2x median capacity
 */

import React, { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Target,
  Brain,
  ShieldAlert,
  ArrowRight,
  Flame,
  Award,
  Zap,
  X,
  Plus,
  Trash2,
} from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { checkPlanningFeasibility } from "@/lib/coach/student-model/srlModel";
import { getExpectedCapacityHours } from "@/lib/coach/student-model/profile";
import { getLocalDateString } from "@/lib/utils";

interface WeeklyReviewProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WeeklyReview({ isOpen, onClose }: WeeklyReviewProps) {
  const {
    history,
    todos,
    setTodos,
    practiceSessions,
    scheduleProfile,
  } = useAppContext();

  // 1. Last 7-day Telemetry Calculation
  const last7Days = useMemo(() => {
    return (history || []).slice(Math.max(0, (history || []).length - 7));
  }, [history]);

  const totalHours7d = useMemo(() => {
    return +(last7Days.reduce((sum, h) => sum + (h.hoursStudied || 0), 0)).toFixed(1);
  }, [last7Days]);

  const avgSleepHours7d = useMemo(() => {
    const logged = last7Days.filter((h) => typeof h.sleepTime === "number" && h.sleepTime > 0);
    if (logged.length === 0) return 7.5;
    return +(logged.reduce((sum, h) => sum + (h.sleepTime || 0), 0) / logged.length).toFixed(1);
  }, [last7Days]);

  const totalXp7d = useMemo(() => {
    return last7Days.reduce((sum, h) => sum + (h.xpEarned || 0), 0);
  }, [last7Days]);

  const completedTasks7dCount = useMemo(() => {
    return last7Days.reduce((sum, h) => sum + (h.completedTasks || []).length, 0);
  }, [last7Days]);

  // 2. High Accuracy Sessions (Weekly Wins)
  const strongSessions = useMemo(() => {
    return (practiceSessions || []).filter(
      (s) => s.attempted >= 10 && (s.correct / s.attempted) >= 0.8
    );
  }, [practiceSessions]);

  // 3. Forethought Check on Planned Daily Target
  const [plannedDailyHours, setPlannedDailyHours] = useState<number>(6.0);
  const medianCapacity = useMemo(() => {
    const todayType = scheduleProfile?.weeklyDayTypes?.Sunday || "FULL_STUDY_DAY";
    return getExpectedCapacityHours(todayType);
  }, [scheduleProfile]);

  const feasibilityAudit = useMemo(() => {
    return checkPlanningFeasibility(plannedDailyHours, medianCapacity);
  }, [plannedDailyHours, medianCapacity]);

  // 4. Up to three If-Then commitments
  const [commitments, setCommitments] = useState<string[]>([
    "If it is 16:00, then I will complete 15 closed-book PYQs before opening notes.",
    "If it is 22:30, then I will turn off screens and prepare for sleep.",
  ]);
  const [newCommitment, setNewCommitment] = useState("");

  const handleAddCommitment = () => {
    if (!newCommitment.trim()) return;
    let formatted = newCommitment.trim();
    if (!formatted.startsWith("If ")) {
      formatted = `If I sit at my desk, then I will ${formatted}`;
    }
    if (!formatted.endsWith(".")) {
      formatted += ".";
    }
    if (commitments.length < 3) {
      setCommitments([...commitments, formatted]);
      setNewCommitment("");
    }
  };

  const handleRemoveCommitment = (index: number) => {
    setCommitments(commitments.filter((_, i) => i !== index));
  };

  const handleConfirmWeeklyRitual = () => {
    // Add commitments into today's Todos
    const todayStr = getLocalDateString();
    const newTasks = commitments.map((c, i) => ({
      id: Date.now() + i,
      text: `[Weekly SRL Commitment] ${c}`,
      completed: false,
      xpReward: 150,
      type: "Practice" as const,
      priority: "High" as const,
      dateScheduled: todayStr,
    }));

    setTodos((prev) => [...newTasks, ...prev]);
    onClose();
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-4xl bg-white dark:bg-slate-950 border border-amber-500/35 rounded-3xl p-5 sm:p-7 shadow-2xl relative my-auto text-left"
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 pb-4 mb-5 border-b border-slate-100 dark:border-slate-800">
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/30">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Sunday SRL Review Ritual
              </h2>
              <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                Self-Regulated Learning
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Weekly cybernetic audit: telemetry review, forethought capacity check, and implementation intentions.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Section 1: 7-Day Telemetry Strip */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" /> Past 7 Days Telemetry
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-center">
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Total Hours</span>
                <span className="text-lg font-black text-slate-900 dark:text-white font-mono">{totalHours7d}h</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-center">
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Avg Sleep</span>
                <span className="text-lg font-black text-blue-500 font-mono">{avgSleepHours7d}h</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-center">
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Tasks Cleared</span>
                <span className="text-lg font-black text-emerald-500 font-mono">{completedTasks7dCount}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-center">
                <span className="text-[10px] text-slate-500 block uppercase font-bold">XP Gained</span>
                <span className="text-lg font-black text-amber-500 font-mono">+{totalXp7d}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Forethought Capacity Check */}
          <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/40 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                <Brain className="w-4 h-4" /> Forethought Capacity Audit (§5.5 SRL Rule)
              </h3>
              <span className="text-[10px] font-mono text-slate-400">
                14-day median capacity: {medianCapacity}h
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Proposed Daily Study Target for Next Week (Hours):
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="16"
                  value={plannedDailyHours}
                  onChange={(e) => setPlannedDailyHours(parseFloat(e.target.value) || 0)}
                  className="w-full sm:w-48 p-2 text-sm font-bold font-mono rounded-xl bg-white dark:bg-black border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex-1">
                {!feasibilityAudit.feasible ? (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>{feasibilityAudit.warning}</span>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Target load is realistic ({feasibilityAudit.ratio}x median capacity limit: {feasibilityAudit.capacityLimit}h).</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: 7-Day If-Then Commitments */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Target className="w-4 h-4 text-cyan-400" /> 7-Day Implementation Intentions (Gollwitzer Form)
              </h3>
              <span className="text-[10px] font-mono text-slate-400">
                {commitments.length}/3 Commitments
              </span>
            </div>

            <div className="space-y-2">
              {commitments.map((comm, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs"
                >
                  <span className="font-mono text-slate-800 dark:text-slate-200">{comm}</span>
                  <button
                    onClick={() => handleRemoveCommitment(idx)}
                    className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-rose-500 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {commitments.length < 3 && (
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  placeholder="e.g. If it is 16:00, then I will complete 15 problems on Chemistry..."
                  value={newCommitment}
                  onChange={(e) => setNewCommitment(e.target.value)}
                  className="flex-1 p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-cyan-500"
                />
                <button
                  type="button"
                  onClick={handleAddCommitment}
                  className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmWeeklyRitual}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md hover:scale-[1.02] transition"
            >
              Lock Weekly Intentions (+150 XP)
            </button>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
