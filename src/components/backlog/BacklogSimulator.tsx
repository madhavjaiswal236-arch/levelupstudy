import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sliders, Sparkles, Clock, Calendar, CheckCircle2, AlertCircle, X, ArrowRight } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { calculateMetrics, generateRoadmap, generateTodosFromRoadmap } from '@/lib/backlog/engine';
import { BacklogPlan, FeasibilityStatus } from '@/lib/backlog/types';

interface BacklogSimulatorProps {
  onClose: () => void;
}

export const BacklogSimulator: React.FC<BacklogSimulatorProps> = ({ onClose }) => {
  const { backlogPlan, setBacklogPlan, todos, setTodos, saveStateToCloudNow } = useAppContext();

  if (!backlogPlan) return null;

  const [simDailyHours, setSimDailyHours] = useState<number>(
    +(backlogPlan.settings.targetDailyMinutes / 60).toFixed(1)
  );
  const [simDeadline, setSimDeadline] = useState<string>(backlogPlan.settings.deadlineDate);

  // Compute live simulated metrics
  const simMetrics = useMemo(() => {
    const tempSettings = {
      ...backlogPlan.settings,
      targetDailyMinutes: Math.round(simDailyHours * 60),
      deadlineDate: simDeadline
    };
    return calculateMetrics(backlogPlan.subjects, tempSettings);
  }, [backlogPlan, simDailyHours, simDeadline]);

  const currentHours = +(backlogPlan.settings.targetDailyMinutes / 60).toFixed(1);
  const hoursDiff = +(simDailyHours - currentHours).toFixed(1);

  // Calculate day difference between current projected completion and simulated
  const currentProjDate = new Date(backlogPlan.metrics.projectedCompletionDate).getTime();
  const simProjDate = new Date(simMetrics.projectedCompletionDate).getTime();
  const daysSaved = Math.round((currentProjDate - simProjDate) / (1000 * 3600 * 24));

  const getStatusColor = (status: FeasibilityStatus) => {
    switch (status) {
      case 'COMFORTABLE':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'ON_TRACK':
        return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
      case 'TIGHT':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'AT_RISK':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
      case 'IMPOSSIBLE':
        return 'text-red-500 bg-red-500/20 border-red-500/40';
      default:
        return 'text-slate-400 bg-slate-800 border-slate-700';
    }
  };

  const handleApplyChanges = () => {
    const updatedPlan: BacklogPlan = {
      ...backlogPlan,
      settings: {
        ...backlogPlan.settings,
        targetDailyMinutes: Math.round(simDailyHours * 60),
        targetDailyLectures: Math.round((simDailyHours * 60) / 120),
        deadlineDate: simDeadline
      },
      metrics: simMetrics,
      updatedAt: new Date().toISOString()
    };

    const newRoadmap = generateRoadmap(updatedPlan);
    updatedPlan.roadmap = newRoadmap;

    const newFutureTodos = generateTodosFromRoadmap(newRoadmap, updatedPlan.id);

    // Keep completed tasks, replace incomplete backlog tasks
    const preservedTodos = todos.filter(
      t => !t.isBacklogTask || t.backlogPlanId !== updatedPlan.id || t.completed
    );

    const mergedTodos = [...preservedTodos, ...newFutureTodos];

    setBacklogPlan(updatedPlan);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("jee_tracker_backlog_plan", JSON.stringify(updatedPlan));
      } catch (e) {}
    }
    setTodos(mergedTodos);
    saveStateToCloudNow({ backlogPlan: updatedPlan, todos: mergedTodos });
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-6 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-400/15 text-amber-400 border border-amber-400/30">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-wide">
                  Tracker 360: What-If Simulator
                </h3>
                <p className="text-xs text-slate-400">
                  Experiment with daily study pace and deadlines without affecting your active roadmap
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
          <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
            {/* Control 1: Daily Capacity */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-300 font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  Daily Backlog Time
                </label>
                <span className="text-base font-bold text-amber-400 font-mono">
                  {simDailyHours} hrs / day
                  <span className="text-xs text-slate-400 ml-1.5 font-normal">
                    ({Math.round(simDailyHours * 60)} min)
                  </span>
                </span>
              </div>
              <input
                type="range"
                min="1.5"
                max="8"
                step="0.5"
                value={simDailyHours}
                onChange={e => setSimDailyHours(parseFloat(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>1.5h (Light)</span>
                <span>4.0h (Standard)</span>
                <span>8.0h (Hardcore)</span>
              </div>
            </div>

            {/* Control 2: Target Deadline */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-300 font-semibold flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-400" />
                  Target Completion Date
                </label>
                <input
                  type="date"
                  value={simDeadline}
                  onChange={e => setSimDeadline(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-sm text-white font-mono focus:border-amber-400 outline-none"
                />
              </div>
            </div>

            {/* Comparison Cards */}
            <div className="grid grid-cols-2 gap-3">
              {/* Current Active Plan */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-2">
                  Active Plan
                </p>
                <p className="text-sm font-semibold text-white font-mono">
                  {currentHours}h / day
                </p>
                <p className="text-xs text-slate-400 mt-1 font-mono">
                  Finish: {backlogPlan.metrics.projectedCompletionDate}
                </p>
                <span className={`inline-block mt-2 px-2 py-0.5 rounded text-[11px] font-semibold border ${getStatusColor(backlogPlan.metrics.feasibilityStatus)}`}>
                  {backlogPlan.metrics.feasibilityStatus.replace('_', ' ')}
                </span>
              </div>

              {/* What-If Scenario */}
              <div className="p-4 rounded-xl bg-amber-400/5 border border-amber-400/30">
                <p className="text-[11px] uppercase tracking-wider text-amber-400 font-bold mb-2 flex items-center justify-between">
                  <span>Simulated</span>
                  <Sparkles className="w-3.5 h-3.5" />
                </p>
                <p className="text-sm font-semibold text-white font-mono">
                  {simDailyHours}h / day
                  {hoursDiff !== 0 && (
                    <span className={`text-xs ml-1.5 font-mono ${hoursDiff > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                      ({hoursDiff > 0 ? `+${hoursDiff}h` : `${hoursDiff}h`})
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-300 mt-1 font-mono">
                  Finish: <span className="text-white font-bold">{simMetrics.projectedCompletionDate}</span>
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${getStatusColor(simMetrics.feasibilityStatus)}`}>
                    {simMetrics.feasibilityStatus.replace('_', ' ')}
                  </span>
                  {daysSaved !== 0 && (
                    <span className={`text-[11px] font-bold ${daysSaved > 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {daysSaved > 0 ? `${daysSaved} days saved ✓` : `${Math.abs(daysSaved)} days later`}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Feasibility Advice */}
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 leading-relaxed">
              <span className="font-semibold text-amber-400">Tracker 360 Feedback: </span>
              {simMetrics.feasibilityStatus === 'COMFORTABLE' &&
                'Generous buffer! You will easily clear all lectures and question practice well before your deadline.'}
              {simMetrics.feasibilityStatus === 'ON_TRACK' &&
                'Optimal sustainable pace. Balances high chapter clearance with rest and retention.'}
              {simMetrics.feasibilityStatus === 'TIGHT' &&
                'Moderate intensity. Minimal buffer for missed days; consistency is required.'}
              {simMetrics.feasibilityStatus === 'AT_RISK' &&
                'High risk of burnout or incomplete backlog. Consider adding 30-45m daily or pushing deadline back.'}
              {simMetrics.feasibilityStatus === 'IMPOSSIBLE' &&
                'Physical study capacity exceeded. Please extend your deadline or prioritize highest-yield chapters.'}
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 bg-slate-950/80 border-t border-slate-800 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              onClick={handleApplyChanges}
              className="flex-1 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black flex items-center justify-center gap-2 transition shadow-sm"
            >
              <span>Apply Changes to Plan</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
