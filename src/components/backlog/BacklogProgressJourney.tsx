import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import {
  TrendingUp,
  CheckCircle2,
  Clock,
  BookOpen,
  Calendar,
  AlertTriangle,
  Flame,
  Zap,
  ChevronRight,
  Target,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Check
} from 'lucide-react';
import { BacklogPlan, BacklogSubject, BacklogChapterInput } from '@/lib/backlog/types';
import { Todo } from '@/context/AppContext';
import { getLocalDateString } from '@/lib/utils';

interface BacklogProgressJourneyProps {
  plan: BacklogPlan;
  todos: Todo[];
  onSelectTab?: (tab: 'today' | 'curriculum' | 'roadmap' | 'journey') => void;
  onOpenSimulator?: () => void;
}

export type PaceStatus = 'AHEAD' | 'ON_TRACK' | 'BEHIND' | 'CRITICAL';

export const BacklogProgressJourney: React.FC<BacklogProgressJourneyProps> = ({
  plan,
  todos,
  onSelectTab,
  onOpenSimulator
}) => {
  const todayStr = useMemo(() => getLocalDateString(), []);

  // Filter tasks belonging to this backlog plan
  const planTasks = useMemo(() => {
    return todos.filter(
      t => t.isBacklogTask && (!t.backlogPlanId || t.backlogPlanId === plan.id)
    );
  }, [todos, plan.id]);

  const completedTasks = useMemo(() => {
    return planTasks.filter(t => t.completed);
  }, [planTasks]);

  // Tasks expected to be completed by today based on schedule
  const expectedTasksToDate = useMemo(() => {
    return planTasks.filter(t => t.dateScheduled && t.dateScheduled <= todayStr);
  }, [planTasks, todayStr]);

  // Calculations for Pace & Trajectory
  const trajectory = useMemo(() => {
    const totalCount = planTasks.length;
    const completedCount = completedTasks.length;
    const expectedCount = expectedTasksToDate.length;

    // Variance: positive = ahead, negative = behind
    const taskVariance = completedCount - expectedCount;

    // Completed lecture tasks
    const completedLecs = completedTasks.filter(
      t => t.backlogTaskType === 'lecture' || t.type?.toLowerCase() === 'lecture'
    ).length;

    // Completed hours
    const completedMins = completedTasks.reduce((acc, t) => acc + (t.durationMinutes || 120), 0);
    const completedHours = +(completedMins / 60).toFixed(1);

    // Expected hours
    const expectedMins = expectedTasksToDate.reduce((acc, t) => acc + (t.durationMinutes || 120), 0);
    const expectedHours = +(expectedMins / 60).toFixed(1);

    // Total planned hours
    const totalPlannedHours = plan.metrics.totalWorkloadHours;

    // Overall progress percentage
    const progressPct = totalCount > 0 ? Math.min(100, Math.round((completedCount / totalCount) * 100)) : 0;

    // Pace status
    let status: PaceStatus = 'ON_TRACK';
    let statusTitle = 'On Track';
    let statusDesc = 'Maintaining planned momentum. You are clearing sessions right on schedule.';

    if (completedCount >= totalCount && totalCount > 0) {
      status = 'AHEAD';
      statusTitle = 'Backlog Eradicated!';
      statusDesc = 'Congratulations! You have cleared all enrolled backlog chapters.';
    } else if (taskVariance >= 2) {
      status = 'AHEAD';
      statusTitle = 'Ahead of Schedule';
      statusDesc = `You are ${taskVariance} tasks ahead of your daily schedule. Fantastic pace!`;
    } else if (taskVariance <= -3) {
      status = 'CRITICAL';
      statusTitle = 'Critical Delay';
      statusDesc = `You are ${Math.abs(taskVariance)} tasks behind. Consider allocating +45 min daily or extending buffer days.`;
    } else if (taskVariance < 0) {
      status = 'BEHIND';
      statusTitle = 'Slightly Behind';
      statusDesc = `You have ${Math.abs(taskVariance)} unfinished tasks from past days. Resolve them to stay on pace.`;
    }

    // Daily velocity
    const uniqueScheduledDays = new Set(planTasks.map(t => t.dateScheduled).filter(Boolean));
    const passedDays = Array.from(uniqueScheduledDays).filter(d => d && d <= todayStr).length;
    const velocityTasksPerDay = passedDays > 0 ? +(completedCount / passedDays).toFixed(1) : +(completedCount).toFixed(1);

    return {
      totalCount,
      completedCount,
      expectedCount,
      taskVariance,
      completedLecs,
      completedHours,
      expectedHours,
      totalPlannedHours,
      progressPct,
      status,
      statusTitle,
      statusDesc,
      velocityTasksPerDay
    };
  }, [planTasks, completedTasks, expectedTasksToDate, plan.metrics.totalWorkloadHours, todayStr]);

  // Subject-by-Subject Progress Breakdown
  const subjectProgress = useMemo(() => {
    return plan.subjects.map(subject => {
      const subjectTasks = planTasks.filter(t => t.subject === subject.name);
      const subjectCompletedTasks = subjectTasks.filter(t => t.completed);
      const subjectLecs = subject.chapters.reduce(
        (acc, c) => acc + (c.selectedLectures?.length ?? c.lecturesRemaining),
        0
      );
      const subjectCompletedLecs = subjectCompletedTasks.filter(
        t => t.backlogTaskType === 'lecture' || t.type?.toLowerCase() === 'lecture'
      ).length;

      const pct = subjectTasks.length > 0
        ? Math.min(100, Math.round((subjectCompletedTasks.length / subjectTasks.length) * 100))
        : 0;

      // Chapters detail with completion status
      const chapterStatuses = subject.chapters.map(chap => {
        const chapTasks = subjectTasks.filter(
          t => t.backlogChapterId === chap.id || t.chapter === chap.name
        );
        const chapCompletedTasks = chapTasks.filter(t => t.completed);
        const isDone = chapTasks.length > 0 && chapTasks.every(t => t.completed);
        const hasStarted = chapCompletedTasks.length > 0;
        const totalLecs = chap.selectedLectures?.length ?? chap.lecturesRemaining;
        const doneLecs = chapCompletedTasks.filter(
          t => t.backlogTaskType === 'lecture' || t.type?.toLowerCase() === 'lecture'
        ).length;

        return {
          id: chap.id,
          name: chap.name,
          order: chap.order,
          isDone,
          hasStarted,
          totalLecs,
          doneLecs,
          totalTasks: chapTasks.length,
          completedTasks: chapCompletedTasks.length,
          pct: chapTasks.length > 0 ? Math.round((chapCompletedTasks.length / chapTasks.length) * 100) : 0
        };
      });

      return {
        id: subject.id,
        name: subject.name,
        color: subject.color,
        totalTasks: subjectTasks.length,
        completedTasks: subjectCompletedTasks.length,
        totalLecs: subjectLecs,
        completedLecs: subjectCompletedLecs,
        pct,
        chapterStatuses
      };
    });
  }, [plan.subjects, planTasks]);

  // Milestones: 25%, 50%, 75%, 100%
  const milestones = useMemo(() => {
    return [
      {
        pct: 25,
        title: 'Foothold Cleared',
        desc: 'Foundation lectures and early revisions locked in',
        unlocked: trajectory.progressPct >= 25
      },
      {
        pct: 50,
        title: 'Halfway Peak',
        desc: 'Over 50% of backlog cleared across subjects',
        unlocked: trajectory.progressPct >= 50
      },
      {
        pct: 75,
        title: 'Final Surge',
        desc: 'Advanced problem sets and full-chapter revisions',
        unlocked: trajectory.progressPct >= 75
      },
      {
        pct: 100,
        title: 'Backlog Ascended',
        desc: 'All backlog chapters & tests cleared for JEE readiness',
        unlocked: trajectory.progressPct >= 100
      }
    ];
  }, [trajectory.progressPct]);

  // Determine current active focus task
  const nextActiveTask = useMemo(() => {
    return planTasks.find(t => !t.completed);
  }, [planTasks]);

  return (
    <div className="space-y-6">
      {/* 1. STATUS COCKPIT: ON TRACK / AHEAD / BEHIND */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-all">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pb-5 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-start gap-4">
            <div
              className={`p-3 sm:p-3.5 rounded-2xl shrink-0 transition-all ${
                trajectory.status === 'AHEAD'
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  : trajectory.status === 'ON_TRACK'
                  ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30'
                  : trajectory.status === 'BEHIND'
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                  : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
              }`}
            >
              {trajectory.status === 'AHEAD' && <TrendingUp className="w-6 h-6 sm:w-7 sm:h-7" />}
              {trajectory.status === 'ON_TRACK' && <Target className="w-6 h-6 sm:w-7 sm:h-7" />}
              {trajectory.status === 'BEHIND' && <Clock className="w-6 h-6 sm:w-7 sm:h-7" />}
              {trajectory.status === 'CRITICAL' && <AlertTriangle className="w-6 h-6 sm:w-7 sm:h-7" />}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  {trajectory.statusTitle}
                </h2>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border ${
                    trajectory.status === 'AHEAD'
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                      : trajectory.status === 'ON_TRACK'
                      ? 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20'
                      : trajectory.status === 'BEHIND'
                      ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
                      : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20'
                  }`}
                >
                  {trajectory.taskVariance > 0
                    ? `+${trajectory.taskVariance} Tasks Ahead`
                    : trajectory.taskVariance < 0
                    ? `${trajectory.taskVariance} Tasks Behind`
                    : 'Pace Synchronized'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
                {trajectory.statusDesc}
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap self-start lg:self-auto">
            {onOpenSimulator && (
              <button
                type="button"
                onClick={onOpenSimulator}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>Adjust Pace</span>
              </button>
            )}
            {onSelectTab && (
              <button
                type="button"
                onClick={() => onSelectTab('today')}
                className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition shadow-sm flex items-center gap-1.5"
              >
                <span>Today's Tasks</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* 2. PROGRESS GAUGES & METRICS STRIP */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 pt-5">
          {/* Progress % */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Progress
            </span>
            <div className="mt-2">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">
                  {trajectory.progressPct}%
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  ({trajectory.completedCount}/{trajectory.totalCount} tasks)
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 mt-2.5 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${trajectory.progressPct}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="bg-amber-400 h-full rounded-full"
                />
              </div>
            </div>
          </div>

          {/* Lectures Done */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Lectures Cleared
            </span>
            <div className="mt-2">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">
                  {trajectory.completedLecs}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  / {plan.metrics.totalLectures} lectures
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-mono">
                {plan.metrics.totalLectures - trajectory.completedLecs} remaining
              </p>
            </div>
          </div>

          {/* Hours Invested */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Time Cleared
            </span>
            <div className="mt-2">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">
                  {trajectory.completedHours}h
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  / {trajectory.totalPlannedHours}h total
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-mono">
                Expected: {trajectory.expectedHours}h to date
              </p>
            </div>
          </div>

          {/* Velocity & Target */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Study Velocity
            </span>
            <div className="mt-2">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">
                  {trajectory.velocityTasksPerDay}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  tasks / day
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-mono truncate">
                Target: {plan.settings.deadlineDate}
              </p>
            </div>
          </div>
        </div>

        {/* Next Immediate Action Chip */}
        {nextActiveTask && (
          <div className="mt-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping shrink-0" />
              <span className="text-slate-700 dark:text-slate-300">
                <strong>Next In Queue:</strong>{' '}
                <span className="font-semibold text-slate-900 dark:text-white">
                  {nextActiveTask.subject}: {nextActiveTask.text}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <span className="text-slate-500 dark:text-slate-400 font-mono">
                {nextActiveTask.durationMinutes || 120} min
              </span>
              <span className="text-amber-600 dark:text-amber-400 font-bold font-mono">
                +{nextActiveTask.xpReward || 60} XP
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 3. THE BACKLOG JOURNEY: CHAPTER-BY-CHAPTER EXECUTION PIPELINE */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-400/15 text-amber-600 dark:text-amber-400">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Backlog Completion Journey
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Priority sequence per subject (#1 ➔ #2 ➔ #3). Each chapter clears lectures, practice, revision, and test sequentially.
                </p>
              </div>
            </div>

            <span className="hidden sm:inline-block px-3 py-1 rounded-full text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {plan.subjects.length} Subjects Active
            </span>
          </div>
        </div>

        {/* Subject Columns / Accordion Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {subjectProgress.map(sub => (
            <div
              key={sub.id}
              className="p-4 sm:p-5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 flex flex-col justify-between space-y-4"
            >
              {/* Subject Title & Progress Bar */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: sub.color }}
                    />
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                      {sub.name}
                    </h4>
                  </div>
                  <span
                    className="text-xs font-mono font-bold px-2 py-0.5 rounded"
                    style={{
                      color: sub.color,
                      backgroundColor: `${sub.color}15`
                    }}
                  >
                    {sub.pct}% Cleared
                  </span>
                </div>

                <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      backgroundColor: sub.color,
                      width: `${sub.pct}%`
                    }}
                  />
                </div>

                <div className="flex justify-between items-center text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-1.5">
                  <span>{sub.completedLecs} / {sub.totalLecs} lecs done</span>
                  <span>{sub.completedTasks} / {sub.totalTasks} tasks</span>
                </div>
              </div>

              {/* Sequential Chapters in this Subject */}
              <div className="space-y-2.5 pt-2">
                {sub.chapterStatuses.length === 0 ? (
                  <p className="text-xs text-slate-400 font-mono text-center py-4">
                    No chapters enrolled.
                  </p>
                ) : (
                  sub.chapterStatuses.map((chap, idx) => {
                    const isCurrent = !chap.isDone && (idx === 0 || sub.chapterStatuses[idx - 1].isDone);

                    return (
                      <div
                        key={chap.id}
                        className={`p-3 rounded-lg border transition-all ${
                          chap.isDone
                            ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 text-slate-700 dark:text-slate-300'
                            : isCurrent
                            ? 'bg-white dark:bg-slate-900 border-amber-400 dark:border-amber-400/80 shadow-sm'
                            : 'bg-white/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/60 opacity-70'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded shrink-0 ${
                                chap.isDone
                                  ? 'bg-emerald-500 text-white'
                                  : isCurrent
                                  ? 'bg-amber-400 text-slate-950'
                                  : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              #{chap.order}
                            </span>
                            <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                              {chap.name}
                            </span>
                          </div>

                          {chap.isDone ? (
                            <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0 font-mono">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                              <span>CLEARED</span>
                            </span>
                          ) : isCurrent ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-400/15 text-amber-700 dark:text-amber-400 border border-amber-400/30 shrink-0">
                              ACTIVE
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-mono shrink-0">
                              QUEUED
                            </span>
                          )}
                        </div>

                        {/* Mini progress bar for in-progress chapter */}
                        {!chap.isDone && (
                          <div className="mt-2 space-y-1">
                            <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1 overflow-hidden">
                              <div
                                className="bg-amber-400 h-full rounded-full"
                                style={{ width: `${chap.pct}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                              <span>{chap.doneLecs} / {chap.totalLecs} lecs</span>
                              <span>{chap.pct}%</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. JOURNEY MILESTONE CHECKPOINTS (25%, 50%, 75%, 100%) */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Recovery Milestones
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {milestones.map(m => (
            <div
              key={m.pct}
              className={`p-4 rounded-xl border transition-all ${
                m.unlocked
                  ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/40 text-slate-900 dark:text-white'
                  : 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800/70 text-slate-600 dark:text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`text-xs font-mono font-black px-2 py-0.5 rounded-full ${
                    m.unlocked
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {m.pct}%
                </span>
                {m.unlocked ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <span className="text-[11px] font-mono font-bold text-slate-400">
                    {Math.max(0, m.pct - trajectory.progressPct)}% left
                  </span>
                )}
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                {m.title}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {m.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
