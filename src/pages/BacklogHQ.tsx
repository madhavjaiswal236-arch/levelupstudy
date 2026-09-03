import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Layers,
  Sparkles,
  Calendar,
  Clock,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  RotateCcw,
  Zap,
  Target,
  ArrowRight,
  TrendingUp,
  Flame,
  Check,
  Edit3,
  Plus,
  Repeat,
  ChevronRight,
  Filter,
  Compass
} from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { BacklogWizard } from '@/components/backlog/BacklogWizard';
import { BacklogSimulator } from '@/components/backlog/BacklogSimulator';
import { BacklogMissedModal } from '@/components/backlog/BacklogMissedModal';
import { ChapterLectureModal } from '@/components/backlog/ChapterLectureModal';
import { BacklogProgressJourney } from '@/components/backlog/BacklogProgressJourney';
import {
  BacklogPlan,
  RoadmapTask,
  BacklogChapterInput,
  FeasibilityStatus
} from '@/lib/backlog/types';
import {
  calculateMetrics,
  generateRoadmap,
  generateTodosFromRoadmap
} from '@/lib/backlog/engine';
import { getLocalDateString } from '@/lib/utils';

export default function BacklogHQ() {
  const {
    backlogPlan,
    setBacklogPlan,
    todos,
    setTodos,
    addXp,
    saveStateToCloudNow
  } = useAppContext();

  // Navigation / Modal States
  const [showWizard, setShowWizard] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);
  const [showMissedModal, setShowMissedModal] = useState(false);

  // Active view tab: 'journey' | 'today' | 'curriculum' | 'roadmap'
  const [activeTab, setActiveTab] = useState<'journey' | 'today' | 'curriculum' | 'roadmap'>('journey');

  // Chapter & Lecture modal states
  const [isChapterModalOpen, setIsChapterModalOpen] = useState(false);
  const [modalSubjectName, setModalSubjectName] = useState('Physics');
  const [modalSubjectColor, setModalSubjectColor] = useState('#06b6d4');
  const [editingChapter, setEditingChapter] = useState<BacklogChapterInput | null>(null);

  // Roadmap filter
  const [activeDayFilter, setActiveDayFilter] = useState<'all' | 'lecture' | 'practice' | 'revision' | 'test'>('all');

  const todayStr = useMemo(() => getLocalDateString(), []);

  // Today's Backlog Tasks from context
  const todaysBacklogTasks = useMemo(() => {
    return todos.filter(t => t.isBacklogTask && t.dateScheduled === todayStr);
  }, [todos, todayStr]);

  // Check for missed tasks from past dates
  const missedTasks = useMemo(() => {
    return todos.filter(
      t => t.isBacklogTask && !t.completed && t.dateScheduled && t.dateScheduled < todayStr
    );
  }, [todos, todayStr]);

  // Overall Plan Statistics
  const planStats = useMemo(() => {
    if (!backlogPlan) return null;
    const allBacklogTasks = todos.filter(
      t => t.isBacklogTask && (!t.backlogPlanId || t.backlogPlanId === backlogPlan.id)
    );
    const completedTasks = allBacklogTasks.filter(t => t.completed);
    const completedLecs = completedTasks.filter(
      t => t.backlogTaskType === 'lecture' || t.type?.toLowerCase() === 'lecture'
    ).length;
    const completedHours = +(completedTasks.reduce((acc, t) => acc + (t.durationMinutes || 0), 0) / 60).toFixed(1);

    // Expected tasks to date
    const expectedTasks = allBacklogTasks.filter(t => t.dateScheduled && t.dateScheduled <= todayStr);
    const variance = completedTasks.length - expectedTasks.length;

    const progressPct = allBacklogTasks.length > 0
      ? Math.round((completedTasks.length / allBacklogTasks.length) * 100)
      : 0;

    let paceLabel = 'On Track';
    let paceTone = 'normal';
    if (progressPct >= 100 && allBacklogTasks.length > 0) {
      paceLabel = 'Completed';
      paceTone = 'ahead';
    } else if (variance >= 2) {
      paceLabel = `+${variance} Ahead`;
      paceTone = 'ahead';
    } else if (variance <= -2) {
      paceLabel = `${variance} Behind`;
      paceTone = 'behind';
    }

    return {
      totalTasks: allBacklogTasks.length,
      completedCount: completedTasks.length,
      completedLecs,
      completedHours,
      progressPct,
      variance,
      paceLabel,
      paceTone
    };
  }, [backlogPlan, todos, todayStr]);

  const handleToggleTask = (task: typeof todos[0]) => {
    setTodos(prev =>
      prev.map(t => {
        if (t.id === task.id) {
          const nextState = !t.completed;
          if (nextState) {
            addXp(t.xpReward || 50);
          }
          return { ...t, completed: nextState };
        }
        return t;
      })
    );
  };

  // Open modal to add a chapter to a specific subject
  const handleOpenAddChapter = (subjectName: string, subjectColor: string) => {
    setModalSubjectName(subjectName);
    setModalSubjectColor(subjectColor);
    setEditingChapter(null);
    setIsChapterModalOpen(true);
  };

  // Open modal to edit existing chapter's lectures
  const handleOpenEditChapter = (chap: BacklogChapterInput, subjectColor: string) => {
    setModalSubjectName(chap.subject);
    setModalSubjectColor(subjectColor);
    setEditingChapter(chap);
    setIsChapterModalOpen(true);
  };

  // Save/Update chapter in active plan
  const handleSaveChapterToPlan = (chapterInput: BacklogChapterInput) => {
    if (!backlogPlan) return;

    const updatedSubjects = backlogPlan.subjects.map(s => {
      if (s.name !== chapterInput.subject) return s;

      const exists = s.chapters.some(c => c.id === chapterInput.id || c.name === chapterInput.name);
      let newChapters: BacklogChapterInput[];

      if (exists) {
        newChapters = s.chapters.map(c =>
          c.id === chapterInput.id || c.name === chapterInput.name ? { ...c, ...chapterInput } : c
        );
      } else {
        newChapters = [...s.chapters, { ...chapterInput, order: s.chapters.length + 1 }];
      }

      return { ...s, chapters: newChapters };
    });

    const newMetrics = calculateMetrics(updatedSubjects, backlogPlan.settings);
    const updatedPlan: BacklogPlan = {
      ...backlogPlan,
      updatedAt: new Date().toISOString(),
      subjects: updatedSubjects,
      metrics: newMetrics
    };

    const newRoadmap = generateRoadmap(updatedPlan);
    updatedPlan.roadmap = newRoadmap;

    const newTodos = generateTodosFromRoadmap(newRoadmap, updatedPlan.id);

    setBacklogPlan(updatedPlan);

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("jee_tracker_backlog_plan", JSON.stringify(updatedPlan));
      } catch (e) {}
    }

    // Keep completed backlog tasks, replace unfinished ones
    let nextTodos: any[] = [];
    setTodos(prev => {
      const nonBacklog = prev.filter(t => !t.isBacklogTask);
      const completedBacklog = prev.filter(t => t.isBacklogTask && t.completed);
      const completedIds = new Set(completedBacklog.map(t => t.id));

      const freshTasks = newTodos.filter(t => !completedIds.has(t.id));
      nextTodos = [...nonBacklog, ...completedBacklog, ...freshTasks];
      return nextTodos;
    });

    saveStateToCloudNow({ backlogPlan: updatedPlan, todos: nextTodos });
  };

  const getHealthBadge = (status: FeasibilityStatus) => {
    switch (status) {
      case 'COMFORTABLE':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
            COMFORTABLE
          </span>
        );
      case 'ON_TRACK':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-400/15 text-amber-700 dark:text-amber-400 border border-amber-400/30">
            ON TRACK
          </span>
        );
      case 'TIGHT':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border border-yellow-500/30">
            TIGHT
          </span>
        );
      case 'AT_RISK':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30">
            AT RISK
          </span>
        );
      case 'IMPOSSIBLE':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/20 text-red-700 dark:text-red-400 border border-red-500/30">
            IMPOSSIBLE
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 rounded-2xl bg-amber-400 text-slate-950 shadow-sm font-black shrink-0">
            <Target className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                TRACKER 360
              </h1>
              <span className="px-2 py-0.5 rounded bg-amber-400/15 text-amber-700 dark:text-amber-400 text-xs font-mono font-bold border border-amber-400/30">
                SUBJECT ROTATION
              </span>
              {planStats && (
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border ${
                    planStats.paceTone === 'ahead'
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                      : planStats.paceTone === 'behind'
                      ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30'
                      : 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border-cyan-500/30'
                  }`}
                >
                  {planStats.paceLabel}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Multi-Subject Academic Scheduler & Interleaved Backlog Recovery
            </p>
          </div>
        </div>

        {backlogPlan && !showWizard && (
          <div className="flex items-center gap-2 flex-wrap self-start md:self-auto">
            <button
              type="button"
              onClick={() => setShowSimulator(true)}
              className="px-3.5 py-2 min-h-[42px] rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-amber-400 text-xs font-bold flex items-center gap-1.5 transition"
            >
              <Sliders className="w-4 h-4 text-amber-500" />
              <span>What-If Simulator</span>
            </button>
            <button
              type="button"
              onClick={() => setShowWizard(true)}
              className="px-3.5 py-2 min-h-[42px] rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black flex items-center gap-1.5 transition shadow-sm"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit Full Plan</span>
            </button>
          </div>
        )}
      </div>

      {/* Missed Tasks Alert Banner */}
      {missedTasks.length > 0 && !showWizard && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 rounded-2xl bg-amber-50 dark:bg-slate-900 border border-amber-300 dark:border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-400/20 text-amber-700 dark:text-amber-400 border border-amber-400/30 shrink-0">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Action Required: {missedTasks.length} Missed {missedTasks.length === 1 ? 'Task' : 'Tasks'} Detected
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Past study sessions were missed. Choose whether you completed them offline or redistribute them smoothly across future days.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowMissedModal(true)}
            className="px-4 py-2.5 min-h-[42px] rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition whitespace-nowrap self-start sm:self-auto shadow-sm"
          >
            Resolve Missed Work
          </button>
        </motion.div>
      )}

      {/* MODE 1: WIZARD ACTIVE */}
      {showWizard && (
        <BacklogWizard
          initialPlan={backlogPlan}
          onComplete={() => setShowWizard(false)}
          onCancel={() => setShowWizard(false)}
        />
      )}

      {/* MODE 2: NO PLAN EXISTS */}
      {!backlogPlan && !showWizard && (
        <div className="space-y-6">
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-10 relative overflow-hidden shadow-sm">
            <div className="max-w-2xl space-y-4 relative z-10">
              <span className="px-3 py-1 rounded-full text-xs font-black tracking-wider bg-amber-400/15 text-amber-700 dark:text-amber-400 border border-amber-400/30">
                SYSTEM READY
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                Escape Backlog Paralysis with <span className="text-amber-500 dark:text-amber-400">Tracker 360</span>
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Select chapters from your curriculum, click individual lecture cards, set default 2-hour sessions, and let the scheduler automatically rotate subjects between Physics, Chemistry, and Mathematics every day.
              </p>

              <div className="pt-3">
                <button
                  type="button"
                  onClick={() => setShowWizard(true)}
                  className="px-7 py-3.5 min-h-[46px] rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm flex items-center gap-2.5 transition shadow-md"
                >
                  <Zap className="w-5 h-5 fill-current" />
                  <span>LAUNCH TRACKER 360 WIZARD</span>
                </button>
              </div>
            </div>
          </div>

          {/* Feature Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-amber-400/15 text-amber-600 dark:text-amber-400 border border-amber-400/30 flex items-center justify-center font-bold">
                <Repeat className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Subject Rotation</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Alternates between Physics, Chemistry, and Mathematics so you avoid study fatigue and make balanced progress daily.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-amber-400/15 text-amber-600 dark:text-amber-400 border border-amber-400/30 flex items-center justify-center font-bold">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Card-Based Lecture Selection</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Select chapters directly from your syllabus. Pick individual lectures with 2-hour default durations that map straight to tasks.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-amber-400/15 text-amber-600 dark:text-amber-400 border border-amber-400/30 flex items-center justify-center font-bold">
                <RotateCcw className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Anti-Overload Recovery</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Missed a day? Minimal-diff re-planning spreads missed hours across future buffer days smoothly with no overwhelming 10-hour days.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MODE 3: ACTIVE PLAN COMMAND CENTER */}
      {backlogPlan && !showWizard && (
        <div className="space-y-6">
          {/* Top 4 Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between h-32 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Lectures Left</span>
                <BookOpen className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">
                  {Math.max(0, backlogPlan.metrics.totalLectures - (planStats?.completedLecs || 0))}
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-normal ml-1.5">/ {backlogPlan.metrics.totalLectures}</span>
                </p>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div
                    className="bg-amber-400 h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.round(((planStats?.completedLecs || 0) / Math.max(1, backlogPlan.metrics.totalLectures)) * 100))}%`
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between h-32 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Workload Hours</span>
                <Clock className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">
                  {backlogPlan.metrics.totalWorkloadHours}h
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400/90 mt-1 font-mono">
                  ~{+(backlogPlan.settings.targetDailyMinutes / 60).toFixed(1)}h / study day
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between h-32 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Target Deadline</span>
                <Calendar className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono truncate">
                  {backlogPlan.settings.deadlineDate}
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400/90 mt-1 font-mono truncate">
                  Projected: {backlogPlan.metrics.projectedCompletionDate}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between h-32 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Plan Health</span>
                <Zap className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  {getHealthBadge(backlogPlan.metrics.feasibilityStatus)}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-mono">
                  Score: <span className="text-slate-900 dark:text-white font-bold">{backlogPlan.metrics.healthScore}/100</span>
                </p>
              </div>
            </div>
          </div>

          {/* Subject Rotation Banner */}
          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-400/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-amber-400/15 text-amber-600 dark:text-amber-400 shrink-0">
                <Repeat className="w-4 h-4" />
              </div>
              <span className="text-slate-700 dark:text-slate-300">
                <strong className="text-slate-900 dark:text-white">Active Rotation Loop:</strong> Tasks interleave sequentially across subjects to maximize focus.
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded text-[11px] font-bold font-mono text-cyan-700 dark:text-cyan-400 bg-cyan-500/10 border border-cyan-500/20">
                Physics
              </span>
              <span className="text-slate-400 dark:text-slate-500">➔</span>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold font-mono text-purple-700 dark:text-purple-400 bg-purple-500/10 border border-purple-500/20">
                Chemistry
              </span>
              <span className="text-slate-400 dark:text-slate-500">➔</span>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold font-mono text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20">
                Mathematics
              </span>
            </div>
          </div>

          {/* Section Navigation Tabs (Optimized for Mobile & Touch) */}
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 overflow-x-auto no-scrollbar">
            {[
              { id: 'journey', label: 'Progress & Journey', icon: TrendingUp },
              { id: 'today', label: "Today's Mission", icon: Target },
              { id: 'curriculum', label: 'Curriculum & Lectures', icon: BookOpen },
              { id: 'roadmap', label: 'Roadmap Schedule', icon: Calendar }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3.5 sm:px-4 py-2 min-h-[42px] rounded-xl font-bold text-xs flex items-center gap-2 transition whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-amber-400 text-slate-950 shadow-sm'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 shadow-sm'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 0: PROGRESS & JOURNEY TRACKER */}
          {activeTab === 'journey' && (
            <BacklogProgressJourney
              plan={backlogPlan}
              todos={todos}
              onSelectTab={setActiveTab}
              onOpenSimulator={() => setShowSimulator(true)}
            />
          )}

          {/* TAB 1: TODAY'S MISSION */}
          {activeTab === 'today' && (
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    Today's Rotated Backlog Tasks
                    <span className="text-xs font-mono font-normal text-slate-500 dark:text-slate-400">({todayStr})</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Tasks are ordered in subject-rotated sequence. Complete here to earn XP immediately.
                  </p>
                </div>

                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-slate-100 dark:bg-slate-950 text-amber-700 dark:text-amber-400 border border-slate-200 dark:border-slate-800 self-start sm:self-auto">
                  {todaysBacklogTasks.filter(t => t.completed).length} / {todaysBacklogTasks.length} Completed
                </span>
              </div>

              {todaysBacklogTasks.length === 0 ? (
                <div className="p-8 text-center text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/40">
                  No backlog tasks scheduled for today! You are on track, or today is a buffer day.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {todaysBacklogTasks.map(task => {
                    const subColor =
                      task.subject === 'Physics'
                        ? '#06b6d4'
                        : task.subject === 'Chemistry'
                        ? '#a855f7'
                        : '#f59e0b';

                    return (
                      <div
                        key={task.id}
                        onClick={() => handleToggleTask(task)}
                        className={`p-4 rounded-xl border transition flex items-center justify-between cursor-pointer min-h-[64px] ${
                          task.completed
                            ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-500/30 text-slate-400'
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-amber-400/50 text-slate-900 dark:text-white shadow-sm'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-6 h-6 rounded-lg flex items-center justify-center border transition shrink-0 ${
                              task.completed
                                ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                                : 'border-slate-300 dark:border-slate-700 hover:border-amber-400'
                            }`}
                          >
                            {task.completed && <CheckCircle2 className="w-4 h-4 stroke-[3]" />}
                          </div>

                          <div>
                            <p className={`text-sm font-semibold ${task.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-white'}`}>
                              {task.text}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400 font-mono flex-wrap">
                              <span
                                className="px-1.5 py-0.2 rounded font-bold text-[11px]"
                                style={{
                                  color: subColor,
                                  backgroundColor: `${subColor}15`
                                }}
                              >
                                {task.subject}
                              </span>
                              <span>{task.durationMinutes || 120} min (2h)</span>
                              <span>•</span>
                              <span className="text-amber-600 dark:text-amber-400 font-bold">+{task.xpReward} XP</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CURRICULUM & LECTURES TRACKER */}
          {activeTab === 'curriculum' && (
            <div className="space-y-6">
              {backlogPlan.subjects.map(sub => {
                const totalSubjectLecs = sub.chapters.reduce(
                  (acc, c) => acc + (c.selectedLectures?.length ?? c.lecturesRemaining),
                  0
                );

                return (
                  <div
                    key={sub.id}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: sub.color }} />
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">{sub.name} Chapters & Lectures</h3>
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-950 text-xs font-mono font-bold text-amber-700 dark:text-amber-400 border border-slate-200 dark:border-slate-800">
                          {totalSubjectLecs} Total Lectures
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenAddChapter(sub.name, sub.color)}
                        className="px-3 py-1.5 min-h-[38px] rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-1.5 transition self-start sm:self-auto shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Select Chapter ({sub.name})</span>
                      </button>
                    </div>

                    <div className="space-y-3">
                      {sub.chapters.length === 0 ? (
                        <p className="text-xs text-slate-400 dark:text-slate-500 py-3 text-center font-mono">
                          No chapters enrolled yet for {sub.name}. Click "Select Chapter" to choose chapters and lectures.
                        </p>
                      ) : (
                        sub.chapters.map(chap => {
                          const lecs = chap.selectedLectures && chap.selectedLectures.length > 0
                            ? chap.selectedLectures
                            : Array.from({ length: chap.lecturesRemaining }, (_, i) => i + 1);

                          return (
                            <div
                              key={chap.id}
                              className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-mono font-bold text-amber-700 dark:text-amber-400 bg-amber-400/10 px-1.5 py-0.2 rounded border border-amber-400/20">
                                      #{chap.order}
                                    </span>
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{chap.name}</h4>
                                  </div>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                                    {lecs.length} lectures enrolled • {chap.lectureDurationMinutes || 120} min per lecture (Total: {+((lecs.length * (chap.lectureDurationMinutes || 120)) / 60).toFixed(1)} hrs)
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleOpenEditChapter(chap, sub.color)}
                                  className="px-3 py-1.5 min-h-[36px] rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-amber-700 dark:text-amber-400 border border-slate-300 dark:border-slate-800 text-xs font-semibold flex items-center gap-1.5 transition shrink-0"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  <span>Edit Lectures</span>
                                </button>
                              </div>

                              {/* Lecture Cards Grid */}
                              <div>
                                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider block mb-1.5">
                                  Selected Lectures:
                                </span>
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {lecs.map(num => (
                                    <div
                                      key={num}
                                      className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-amber-100 dark:bg-amber-400/15 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-400/30 flex items-center gap-1"
                                    >
                                      <span>Lec {num}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 3: ROADMAP TIMELINE */}
          {activeTab === 'roadmap' && (
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Full Roadmap Schedule</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Day-by-day plan with automatic subject rotation</p>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs overflow-x-auto no-scrollbar">
                  {(['all', 'lecture', 'practice', 'revision', 'test'] as const).map(f => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setActiveDayFilter(f)}
                      className={`px-3 py-1.5 rounded-lg capitalize font-semibold transition whitespace-nowrap ${
                        activeDayFilter === f
                          ? 'bg-amber-400 text-slate-950 font-bold'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Days List */}
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {(backlogPlan.roadmap || []).map(day => {
                  const dayTasks = day.tasks.filter(t => {
                    if (activeDayFilter === 'all') return true;
                    return t.type === activeDayFilter;
                  });

                  if (activeDayFilter !== 'all' && dayTasks.length === 0) return null;
                  const isToday = day.date === todayStr;

                  return (
                    <div
                      key={day.dayIndex}
                      className={`p-4 rounded-xl border transition flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                        isToday
                          ? 'bg-amber-50/50 dark:bg-slate-950 border-amber-400 dark:border-amber-400 shadow-sm'
                          : 'bg-slate-50/70 dark:bg-slate-950/70 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center font-mono shrink-0 border ${
                            isToday
                              ? 'bg-amber-400 text-slate-950 font-black border-amber-300'
                              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          <span className="text-[9px] uppercase font-bold">Day</span>
                          <span className="text-sm font-bold">{day.dayIndex}</span>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">{day.date}</span>
                            {isToday && (
                              <span className="px-2 py-0.2 rounded-full text-[10px] font-black bg-amber-400 text-slate-950">
                                TODAY
                              </span>
                            )}
                            <span
                              className={`px-2 py-0.2 rounded text-[10px] font-bold ${
                                day.dayType === 'TEST'
                                  ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                                  : day.dayType === 'REVISION'
                                  ? 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30'
                                  : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400'
                              }`}
                            >
                              {day.dayType}
                            </span>
                          </div>

                          <div className="space-y-1 mt-2">
                            {dayTasks.map(t => {
                              const subColor =
                                t.subject === 'Physics'
                                  ? '#06b6d4'
                                  : t.subject === 'Chemistry'
                                  ? '#a855f7'
                                  : '#f59e0b';

                              return (
                                <div key={t.id} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200 flex-wrap">
                                  <span
                                    className="w-2 h-2 rounded-full shrink-0"
                                    style={{ backgroundColor: subColor }}
                                  />
                                  <span
                                    className="font-bold text-[11px] px-1 py-0.2 rounded font-mono"
                                    style={{
                                      color: subColor,
                                      backgroundColor: `${subColor}15`
                                    }}
                                  >
                                    {t.subject}
                                  </span>
                                  <span className="font-medium">{t.title}</span>
                                  <span className="text-slate-400 dark:text-slate-500 font-mono">({t.durationMinutes}m)</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="text-left md:text-right shrink-0">
                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400 font-mono">
                          {Math.floor(day.totalMinutes / 60)}h {day.totalMinutes % 60}m
                        </span>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 block">estimated</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Chapter & Lecture Selection Modal */}
      {isChapterModalOpen && (
        <ChapterLectureModal
          isOpen={isChapterModalOpen}
          onClose={() => {
            setIsChapterModalOpen(false);
            setEditingChapter(null);
          }}
          subjectName={modalSubjectName}
          subjectColor={modalSubjectColor}
          onSaveChapter={handleSaveChapterToPlan}
          existingChapter={editingChapter}
          existingChapterIds={
            backlogPlan?.subjects
              .find(s => s.name === modalSubjectName)
              ?.chapters.map(c => c.name) || []
          }
        />
      )}

      {/* Simulator Modal */}
      {showSimulator && <BacklogSimulator onClose={() => setShowSimulator(false)} />}

      {/* Missed Tasks Modal */}
      {showMissedModal && missedTasks.length > 0 && (
        <BacklogMissedModal
          missedTasks={missedTasks}
          onClose={() => setShowMissedModal(false)}
        />
      )}
    </div>
  );
}
