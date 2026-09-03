import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sliders, Sparkles, Clock, Calendar, CheckCircle2, AlertCircle, X, ArrowRight, Layers } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import {
  calculateMetrics,
  generateRoadmap,
  generateTodosFromRoadmap,
  calculateDateDiffDays,
  addDaysToDate
} from '@/lib/backlog/engine';
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

  const daysDiffFromStart = useMemo(() => {
    return Math.max(1, calculateDateDiffDays(backlogPlan.settings.startDate, simDeadline));
  }, [backlogPlan.settings.startDate, simDeadline]);

  // Pace Presets for Simulator (with 10h-13h recommendation for >50 lectures)
  const pacePresets = useMemo(() => {
    const totalMinutes =
      simMetrics.totalLectureMinutes +
      simMetrics.totalPracticeMinutes +
      (backlogPlan.settings.revisionEnabled ? Math.round(simMetrics.totalLectures / (backlogPlan.settings.revisionAfterEveryNLectures || 6)) * 45 : 0) +
      (backlogPlan.settings.testEnabled ? backlogPlan.subjects.reduce((a, s) => a + s.chapters.length, 0) * 90 : 0);

    const isLargeBacklog = simMetrics.totalLectures > 50;
    const bufferDays = backlogPlan.settings.bufferDays || 0;

    let options: Array<{ days: number; badge: string; desc: string }>;

    if (isLargeBacklog && totalMinutes > 0) {
      const daysFor12h = Math.max(3, Math.round(totalMinutes / (12 * 60)) + bufferDays);
      const daysFor10h = Math.max(4, Math.round(totalMinutes / (10.2 * 60)) + bufferDays);
      const daysFor7h = Math.max(7, Math.round(totalMinutes / (7 * 60)) + bufferDays);
      const daysFor4h = Math.max(14, Math.round(totalMinutes / (4 * 60)) + bufferDays);

      const dayMap = new Map<number, { badge: string; desc: string }>();
      dayMap.set(daysFor12h, {
        badge: '⚡ Fast Sprint (~12h/day)',
        desc: 'Maximum viable clearance (<13h/day) to complete >50 lectures rapidly.'
      });
      dayMap.set(daysFor10h, {
        badge: '🔥 Power Pace (~10h/day)',
        desc: '10h+ intensive daily schedule recommended for rapid syllabus clearance.'
      });
      dayMap.set(daysFor7h, {
        badge: 'Moderate Pace (~7h/day)',
        desc: 'Consistent daily effort spread over multiple weeks.'
      });
      dayMap.set(daysFor4h, {
        badge: 'Extended Pace (~4h/day)',
        desc: 'Longer duration timeline spread across multiple months.'
      });

      options = Array.from(dayMap.entries())
        .map(([days, info]) => ({ days, ...info }))
        .sort((a, b) => a.days - b.days);
    } else {
      options = [
        { days: 30, badge: 'Blitz Pace', desc: 'Maximum-effort sprint for urgent completion.' },
        { days: 60, badge: 'Intensive Pace', desc: 'High-focus daily schedule ahead of tests.' },
        { days: 90, badge: 'Fast Pace', desc: 'Intensive plan for faster completion.' },
        { days: 120, badge: 'Balanced Pace', desc: 'Manageable daily workload with steady progress.' }
      ];
    }

    return options.map(opt => {
      const studyDays = Math.max(1, opt.days - bufferDays);
      const dailyReqMins = Math.round(totalMinutes / studyDays);
      const dailyHrs = Math.floor(dailyReqMins / 60);
      const dailyRemMins = dailyReqMins % 60;
      const dailyLecs = +(dailyReqMins / 120).toFixed(1);
      const totalDailyHoursNum = +(dailyReqMins / 60).toFixed(1);

      const isRecommended = isLargeBacklog
        ? totalDailyHoursNum >= 10 && totalDailyHoursNum < 13
        : totalDailyHoursNum >= 3.5 && totalDailyHoursNum <= 6;

      let feasibilityLabel = 'Comfortable';
      let feasibilityClass = 'text-emerald-400 font-semibold';
      if (totalDailyHoursNum >= 13) {
        feasibilityLabel = 'Extreme (>13h)';
        feasibilityClass = 'text-rose-500 font-bold';
      } else if (totalDailyHoursNum >= 10) {
        feasibilityLabel = isLargeBacklog ? '🔥 Recommended (10-13h)' : 'Demanding (10h+)';
        feasibilityClass = isLargeBacklog ? 'text-amber-300 font-black' : 'text-amber-400 font-semibold';
      } else if (totalDailyHoursNum >= 7) {
        feasibilityLabel = 'Demanding';
        feasibilityClass = 'text-amber-400 font-semibold';
      } else if (totalDailyHoursNum >= 4) {
        feasibilityLabel = 'Moderate';
        feasibilityClass = 'text-sky-400 font-semibold';
      }

      const isSelected = Math.abs(daysDiffFromStart - opt.days) <= 1;

      return {
        ...opt,
        dailyReqMins,
        dailyHrs,
        dailyRemMins,
        dailyLecs,
        totalDailyHoursNum,
        feasibilityLabel,
        feasibilityClass,
        isRecommended,
        isSelected
      };
    });
  }, [simMetrics, backlogPlan, daysDiffFromStart]);

  const handleSelectPacePreset = (days: number, dailyReqMins: number) => {
    const newDeadline = addDaysToDate(backlogPlan.settings.startDate, days);
    setSimDeadline(newDeadline);
    setSimDailyHours(+(dailyReqMins / 60).toFixed(1));
  };

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

    // Keep completed tasks, replace incomplete backlog tasks without duplicating
    const completedBacklog = todos.filter(t => t.isBacklogTask && t.completed);
    const completedSignatures = new Set(
      completedBacklog.map(t => `${t.backlogChapterId || t.chapter}_${t.backlogTaskType || t.type}_${t.lectureNumber || 0}`)
    );

    const freshTasks = newFutureTodos.filter(t => {
      const sig = `${t.backlogChapterId || t.chapter}_${t.backlogTaskType || t.type}_${t.lectureNumber || 0}`;
      return !completedSignatures.has(sig);
    });

    const preservedTodos = todos.filter(
      t => !t.isBacklogTask || t.backlogPlanId !== updatedPlan.id || t.completed
    );

    const mergedTodos = [...preservedTodos, ...freshTasks];

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
          <div className="p-6 overflow-y-auto space-y-5 flex-1 custom-calendar-scrollbar">
            {/* High Backlog Alert if > 50 Lectures */}
            {simMetrics.totalLectures > 50 && (
              <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-200">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-300">
                    High Backlog Volume: {simMetrics.totalLectures} Lectures ({Math.round(simMetrics.totalLectureMinutes / 60)}h)
                  </p>
                  <p className="text-slate-300 mt-0.5">
                    Fast-track <strong>10h to &lt;13h per day</strong> plans are recommended below to ensure you clear the syllabus before mock exams.
                  </p>
                </div>
              </div>
            )}

            {/* PROMINENT CARD: EXACT DAYS REQUIRED AT SELECTED PACE */}
            <div className="p-4 sm:p-5 rounded-2xl border-2 border-amber-400/80 bg-gradient-to-br from-amber-500/15 via-slate-950 to-sky-950/40 shadow-lg space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-1 shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Exact Active Pace</span>
                </span>
                <span className="text-xs font-bold text-amber-400 font-mono">
                  {daysDiffFromStart} Days Total
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Exact Duration:</span>
                  <span className="text-lg font-black text-white font-mono">{daysDiffFromStart} Days</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Daily Backlog Time:</span>
                  <span className="text-lg font-black text-amber-400 font-mono">{simDailyHours} hrs/d</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-slate-400 block">Est. Completion:</span>
                  <span className="text-xs font-bold text-slate-200 font-mono">
                    {new Date(simDeadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-300 leading-snug">
                {simMetrics.totalLectures > 50 && simDailyHours >= 10 && simDailyHours < 13
                  ? `⚡ Recommended Fast-Track Pace! At ~${simDailyHours}h/day, you will complete all ${simMetrics.totalLectures} lectures in ${daysDiffFromStart} days.`
                  : `At ${simDailyHours}h/day, completing ${simMetrics.totalLectures} lectures will require exactly ${daysDiffFromStart} days.`}
              </p>
            </div>

            {/* Small Cards Grid: Pace Presets by Days */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  <span>Choose Duration Preset</span>
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  Click card to simulate
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {pacePresets.map(preset => (
                  <div
                    key={preset.days}
                    onClick={() => handleSelectPacePreset(preset.days, preset.dailyReqMins)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                      preset.isSelected
                        ? 'border-amber-400 bg-amber-500/10 ring-1 ring-amber-400/50 shadow-md'
                        : preset.isRecommended
                        ? 'border-amber-500/60 bg-slate-950 hover:border-amber-400 hover:bg-slate-900/80'
                        : 'border-slate-800/90 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-900/60'
                    }`}
                  >
                    {preset.isRecommended && (
                      <span className="absolute -top-2 right-2 px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[9px] tracking-wide uppercase">
                        🔥 Recommended
                      </span>
                    )}

                    <div>
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-black text-white font-mono">
                            {preset.days} Days
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                              preset.isSelected
                                ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                                : 'bg-slate-800 text-slate-300 border border-slate-700'
                            }`}
                          >
                            {preset.badge}
                          </span>
                        </div>

                        <span className={`text-[11px] ${preset.feasibilityClass}`}>
                          {preset.feasibilityLabel}
                        </span>
                      </div>

                      <p className="text-[10.5px] text-slate-400 mt-1 line-clamp-2 leading-tight">
                        {preset.desc}
                      </p>
                    </div>

                    <div className="pt-2 mt-2 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-200 font-mono">
                        about {preset.dailyHrs > 0 ? `${preset.dailyHrs}h ` : ''}{preset.dailyRemMins}m a day
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        ~{preset.dailyLecs} lecs/d
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

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
