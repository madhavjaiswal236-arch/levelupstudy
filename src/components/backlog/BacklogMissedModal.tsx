import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, CheckCircle2, RefreshCw, Calendar, Clock, ArrowRight, ShieldCheck, X, Sparkles, Sliders } from 'lucide-react';
import { Todo, useAppContext } from '@/context/AppContext';
import { recalculateRoadmap } from '@/lib/backlog/adaptive';
import { RecalculationDiff } from '@/lib/backlog/types';
import { getLocalDateString } from '@/lib/utils';

interface BacklogMissedModalProps {
  missedTasks: Todo[];
  onClose: () => void;
}

export const BacklogMissedModal: React.FC<BacklogMissedModalProps> = ({ missedTasks, onClose }) => {
  const { backlogPlan, setBacklogPlan, todos, setTodos, updateTask, addXp, saveStateToCloudNow } = useAppContext();
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());
  const [selectedStrategy, setSelectedStrategy] = useState<'SMOOTH' | 'WEEKEND_CATCHUP' | 'EXTEND_DEADLINE'>('SMOOTH');
  const [diffPreview, setDiffPreview] = useState<RecalculationDiff | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const toggleSelect = (id: string | number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleMarkSelectedCompleted = () => {
    if (selectedIds.size === 0) return;
    let earnedXp = 0;
    selectedIds.forEach(id => {
      const task = missedTasks.find(t => t.id === id);
      if (task) {
        updateTask(id, { completed: true });
        earnedXp += task.xpReward || 100;
      }
    });

    if (earnedXp > 0) {
      addXp(earnedXp);
    }
    onClose();
  };

  const handlePreviewRecalculate = (strategyToPreview?: 'SMOOTH' | 'WEEKEND_CATCHUP' | 'EXTEND_DEADLINE') => {
    if (!backlogPlan) return;
    const strat = strategyToPreview || selectedStrategy;
    const todayStr = getLocalDateString();
    const { diff } = recalculateRoadmap(backlogPlan, todos, todayStr, strat);
    setDiffPreview(diff);
  };

  const handleConfirmRecalculate = () => {
    if (!backlogPlan) return;
    setIsApplying(true);
    const todayStr = getLocalDateString();
    const { updatedPlan, newTodos } = recalculateRoadmap(backlogPlan, todos, todayStr, selectedStrategy);

    setBacklogPlan(updatedPlan);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("jee_tracker_backlog_plan", JSON.stringify(updatedPlan));
      } catch (e) {}
    }
    setTodos(newTodos);
    saveStateToCloudNow({ backlogPlan: updatedPlan, todos: newTodos });
    setIsApplying(false);
    onClose();
  };

  const totalMissedMins = missedTasks.reduce((acc, t) => acc + (t.durationMinutes || 60), 0);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          className="relative w-full max-w-2xl bg-slate-900/95 border border-amber-500/40 rounded-2xl shadow-[0_0_50px_rgba(245,158,11,0.25)] overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-6 bg-gradient-to-r from-amber-950/50 via-slate-900 to-slate-900 border-b border-amber-500/20 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
                  Missed Backlog Work Detected
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                    {missedTasks.length} {missedTasks.length === 1 ? 'task' : 'tasks'}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Total load: <span className="text-amber-400 font-semibold">{Math.floor(totalMissedMins / 60)}h {totalMissedMins % 60}m</span>. Decide how Tracker 360 should resolve this work.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
            {!diffPreview ? (
              <>
                <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800">
                  <div className="flex items-center justify-between mb-3 text-xs text-slate-400 font-semibold uppercase tracking-wider">
                    <span>Unfinished Tasks from Previous Days</span>
                    <button
                      onClick={() => {
                        if (selectedIds.size === missedTasks.length) {
                          setSelectedIds(new Set());
                        } else {
                          setSelectedIds(new Set(missedTasks.map(t => t.id)));
                        }
                      }}
                      className="text-cyan-400 hover:underline capitalize"
                    >
                      {selectedIds.size === missedTasks.length ? 'Deselect All' : 'Select All Completed'}
                    </button>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {missedTasks.map(task => {
                      const isSelected = selectedIds.has(task.id);
                      return (
                        <div
                          key={task.id}
                          onClick={() => toggleSelect(task.id)}
                          className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                            isSelected
                              ? 'bg-emerald-950/30 border-emerald-500/40 text-white'
                              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded flex items-center justify-center border transition ${
                              isSelected ? 'bg-emerald-500 border-emerald-400 text-slate-950' : 'border-slate-600'
                            }`}>
                              {isSelected && <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{task.text}</p>
                              <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                                <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                                  {task.subject}
                                </span>
                                <span>{task.durationMinutes} min</span>
                                <span>•</span>
                                <span className="text-amber-400/80">+{task.xpReward} XP</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Strategy Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                    Select Recovery Strategy
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setSelectedStrategy('SMOOTH')}
                      className={`p-3 rounded-xl border text-left transition ${
                        selectedStrategy === 'SMOOTH'
                          ? 'bg-cyan-950/40 border-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400'
                      }`}
                    >
                      <p className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                        Smooth Spread
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1 leading-tight">
                        Spread across upcoming days with a strict 15% daily surge cap.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedStrategy('WEEKEND_CATCHUP')}
                      className={`p-3 rounded-xl border text-left transition ${
                        selectedStrategy === 'WEEKEND_CATCHUP'
                          ? 'bg-purple-950/40 border-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.25)]'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400'
                      }`}
                    >
                      <p className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-purple-400" />
                        Weekend Focus
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1 leading-tight">
                        Keep weekdays calm; catch up during high-energy weekend slots.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedStrategy('EXTEND_DEADLINE')}
                      className={`p-3 rounded-xl border text-left transition ${
                        selectedStrategy === 'EXTEND_DEADLINE'
                          ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400'
                      }`}
                    >
                      <p className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-emerald-400" />
                        Buffer Shift
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1 leading-tight">
                        Shift deadline cleanly by missed days without adding daily stress.
                      </p>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={handleMarkSelectedCompleted}
                    disabled={selectedIds.size === 0}
                    className={`p-3.5 rounded-xl border flex flex-col items-center text-center gap-1.5 transition ${
                      selectedIds.size > 0
                        ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-400 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                        : 'bg-slate-800/40 border-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="text-sm font-bold">Mark {selectedIds.size} Done Offline</span>
                    <span className="text-xs opacity-80">Studied offline; keep plan unchanged</span>
                  </button>

                  <button
                    onClick={() => handlePreviewRecalculate()}
                    className="p-3.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 border border-cyan-400/30 text-white flex flex-col items-center text-center gap-1.5 shadow-[0_0_20px_rgba(6,182,212,0.3)] transition"
                  >
                    <RefreshCw className="w-5 h-5" />
                    <span className="text-sm font-bold">Preview Redistribution</span>
                    <span className="text-xs text-cyan-200">Inspect anti-burnout schedule diff</span>
                  </button>
                </div>
              </>
            ) : (
              /* Enhanced Diff Preview */
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-950/80 border border-cyan-500/30">
                  <div className="flex items-center gap-2 text-cyan-400 font-semibold mb-2">
                    <ShieldCheck className="w-5 h-5" />
                    <span>Plan Recalculation Impact</span>
                  </div>
                  <ul className="space-y-2 text-sm text-slate-300">
                    {diffPreview.changesSummary.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-cyan-400 mt-1">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Daily Workload Comparison Card */}
                {diffPreview.currentAvgDailyMinutes !== undefined && diffPreview.newAvgDailyMinutes !== undefined && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                      <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Previous Pace</p>
                      <p className="text-lg font-bold text-slate-200 mt-1">
                        {Math.floor(diffPreview.currentAvgDailyMinutes / 60)}h {diffPreview.currentAvgDailyMinutes % 60}m<span className="text-xs font-normal text-slate-400">/day</span>
                      </p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-900/60 border border-cyan-500/40">
                      <p className="text-[11px] text-cyan-400 uppercase tracking-wider font-semibold">Adjusted Pace</p>
                      <p className="text-lg font-bold text-white mt-1">
                        {Math.floor(diffPreview.newAvgDailyMinutes / 60)}h {diffPreview.newAvgDailyMinutes % 60}m<span className="text-xs font-normal text-slate-400">/day</span>
                        {diffPreview.dailySurgeMinutes && diffPreview.dailySurgeMinutes > 0 ? (
                          <span className="text-xs text-amber-400 ml-1.5 font-medium">(+{diffPreview.dailySurgeMinutes}m)</span>
                        ) : null}
                      </p>
                    </div>
                  </div>
                )}

                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Projected Target Completion</p>
                    <p className="text-base font-bold text-white mt-0.5">{diffPreview.newProjectedCompletion}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                    diffPreview.deadlinePreserved
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  }`}>
                    {diffPreview.feasibilityStatus.replace('_', ' ')}
                  </span>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setDiffPreview(null)}
                    className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm transition"
                  >
                    Adjust Strategy
                  </button>
                  <button
                    onClick={handleConfirmRecalculate}
                    disabled={isApplying}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm shadow-[0_0_20px_rgba(6,182,212,0.4)] transition"
                  >
                    {isApplying ? 'Applying Update...' : 'Confirm & Apply Schedule'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
