import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronDown,
  ChevronUp,
  Square,
  CheckSquare,
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
  Compass,
  Trash2,
  BrainCircuit,
  Download,
  FileText,
} from 'lucide-react';
import { exportRoadmapToPdf } from '@/lib/backlog/exportPdf';
import { useAppContext } from '@/context/AppContext';
import { BacklogWizard, DEFAULT_SUBJECTS } from '@/components/backlog/BacklogWizard';
import { BacklogSimulator } from '@/components/backlog/BacklogSimulator';
import { BacklogMissedModal } from '@/components/backlog/BacklogMissedModal';
import { ChapterLectureModal } from '@/components/backlog/ChapterLectureModal';
import { BacklogProgressJourney } from '@/components/backlog/BacklogProgressJourney';
import { SpacedMemoryWidget } from '@/components/coach/SpacedMemoryWidget';
import {
  BacklogPlan,
  BacklogPlanSettings,
  RoadmapTask,
  BacklogChapterInput,
  FeasibilityStatus
} from '@/lib/backlog/types';
import {
  calculateMetrics,
  generateRoadmap,
  generateTodosFromRoadmap,
  addDaysToDate
} from '@/lib/backlog/engine';
import { getTaskSignaturesWithLegacy } from '@/lib/backlog/signature';
import { getLocalDateString } from '@/lib/utils';
import {
  createCalendarEvent,
  rescheduleCalendarEvents,
  fetchGoogleCalendarEvents
} from '@/lib/calendar';
import {
  getAccessTokenSync,
  refreshGoogleToken,
  googleSignIn,
  auth
} from '@/lib/firebase';

export default function BacklogHQ() {
  const {
    backlogPlan,
    setBacklogPlan,
    todos,
    setTodos,
    updateTask,
    addXp,
    saveStateToCloudNow,
    playerName
  } = useAppContext();

  const handleExportPdf = () => {
    if (!backlogPlan) return;
    exportRoadmapToPdf(backlogPlan, playerName || "Student", todos);
  };

  // Navigation / Modal States
  const [showWizard, setShowWizard] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);
  const [showMissedModal, setShowMissedModal] = useState(false);
  const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const handleApplyAllToCalendar = async () => {
    setIsSyncingCalendar(true);
    setSyncMessage("Syncing all tasks with breaks...");
    try {
      let token = getAccessTokenSync();
      if (!token && auth.currentUser) {
        try { token = await refreshGoogleToken(); } catch (e) {}
      }
      if (!token) {
        try {
          const res = await googleSignIn();
          if (!res) {
            setIsSyncingCalendar(false);
            setSyncMessage(null);
            return;
          }
        } catch (e) {
          console.warn("OAuth login failed or in progress:", e);
        }
      }

      // Step 1: Enforce exact 15-minute breaks on all scheduled tasks
      let currentTodos = [...todos];
      let updated = false;

      const tasksByDate = new Map<string, typeof todos>();
      currentTodos.forEach((t) => {
        if (t.isDeleted || t.completed) return;
        const dateKey = t.dateScheduled || (t.startTime ? t.startTime.split("T")[0] : getLocalDateString());
        if (!tasksByDate.has(dateKey)) {
          tasksByDate.set(dateKey, []);
        }
        tasksByDate.get(dateKey)!.push(t);
      });

      tasksByDate.forEach((dayTasks, dateKey) => {
        let currentStartMins = 9 * 60; // 09:00 AM
        dayTasks.forEach((t) => {
          const durationMins = Math.max(15, t.durationMinutes || (t.lectureHours ? t.lectureHours * 60 : 105));
          const startH = Math.floor(currentStartMins / 60) % 24;
          const startM = currentStartMins % 60;
          const startHHStr = String(startH).padStart(2, "0");
          const startMMStr = String(startM).padStart(2, "0");

          const endMinsTotal = currentStartMins + durationMins;
          const endH = Math.floor(endMinsTotal / 60) % 24;
          const endM = endMinsTotal % 60;
          const endHHStr = String(endH).padStart(2, "0");
          const endMMStr = String(endM).padStart(2, "0");

          const calcStartISO = `${dateKey}T${startHHStr}:${startMMStr}:00`;
          const calcEndISO = `${dateKey}T${endHHStr}:${endMMStr}:00`;

          if (t.startTime !== calcStartISO || t.endTime !== calcEndISO || t.durationMinutes !== durationMins) {
            updated = true;
            const idx = currentTodos.findIndex((item) => item.id === t.id);
            if (idx !== -1) {
              currentTodos[idx] = {
                ...currentTodos[idx],
                startTime: calcStartISO,
                endTime: calcEndISO,
                durationMinutes: durationMins,
                dateScheduled: dateKey,
              };
            }
          }
          currentStartMins = endMinsTotal + 15; // 15-minute break
        });
      });

      if (updated) {
        setTodos(currentTodos);
      }

      // Step 2: Push unsynced tasks to Google Calendar
      const unsynced = currentTodos.filter(t => !t.isDeleted && t.startTime && t.endTime && (!t.calendarEventId || t.calendarEventId.startsWith("local-")));
      let syncedCount = 0;

      for (const t of unsynced) {
        try {
          const tStart = new Date(t.startTime!);
          const tEnd = new Date(t.endTime!);
          const durationMins = Math.max(15, Math.round((tEnd.getTime() - tStart.getTime()) / 60000));
          const res = await createCalendarEvent(
            t.text,
            durationMins,
            t.type || "Lecture",
            false,
            currentTodos,
            tStart,
            tEnd
          );
          if (res && res.id) {
            syncedCount++;
            const idx = currentTodos.findIndex((ct) => ct.id === t.id);
            if (idx !== -1) {
              currentTodos[idx] = {
                ...currentTodos[idx],
                calendarEventId: res.id,
                calendarSynced: true,
              };
            }
          }
        } catch (e) {
          console.warn("Failed to create event for task", t.id, e);
        }
      }

      if (syncedCount > 0) {
        setTodos(currentTodos);
        saveStateToCloudNow({ todos: currentTodos });
      }

      setSyncMessage("All tasks scheduled on Calendar with 15-minute breaks!");
      setTimeout(() => setSyncMessage(null), 4000);
    } catch (err: any) {
      console.error("Single click apply all error:", err);
      setSyncMessage("Tasks scheduled locally with 15-min breaks!");
      setTimeout(() => setSyncMessage(null), 4000);
    } finally {
      setIsSyncingCalendar(false);
    }
  };

  // Active view tab: 'journey' | 'today' | 'curriculum' | 'roadmap' | 'spaced'
  const [activeTab, setActiveTab] = useState<'journey' | 'today' | 'curriculum' | 'roadmap' | 'spaced'>('journey');

  // Chapter & Lecture modal states
  const [isChapterModalOpen, setIsChapterModalOpen] = useState(false);
  const [modalSubjectName, setModalSubjectName] = useState('Physics');
  const [modalSubjectColor, setModalSubjectColor] = useState('#06b6d4');
  const [editingChapter, setEditingChapter] = useState<BacklogChapterInput | null>(null);

  // Roadmap filter
  const [activeDayFilter, setActiveDayFilter] = useState<'all' | 'lecture' | 'practice' | 'revision' | 'test'>('all');

  // Curriculum view subject filter & accordion collapse state for mobile
  const [curriculumSubjectFilter, setCurriculumSubjectFilter] = useState<'all' | 'Physics' | 'Chemistry' | 'Mathematics'>('all');
  const [expandedChapterIds, setExpandedChapterIds] = useState<Record<string, boolean>>({});

  const toggleChapterExpand = (id: string) => {
    setExpandedChapterIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleToggleExpandAllChapters = (expand: boolean) => {
    if (!backlogPlan) return;
    const nextState: Record<string, boolean> = {};
    backlogPlan.subjects.forEach(s => {
      s.chapters.forEach(c => {
        nextState[c.id] = expand;
      });
    });
    setExpandedChapterIds(nextState);
  };

  const handleQuickCreatePlan = (preset: '60day' | '90day') => {
    const days = preset === '60day' ? 60 : 90;
    const targetDailyMinutes = preset === '60day' ? 240 : 210;
    const targetDailyLectures = 2;
    const buffer = preset === '60day' ? 3 : 5;
    const deadline = addDaysToDate(todayStr, days);

    const newSettings: BacklogPlanSettings = {
      startDate: todayStr,
      deadlineDate: deadline,
      capacityMode: 'hours',
      targetDailyMinutes,
      targetDailyLectures,
      revisionEnabled: true,
      revisionAfterEveryNLectures: 6,
      revisionDurationMinutes: 60,
      testEnabled: true,
      testAfterChapterCompletion: true,
      testDurationMinutes: 90,
      bufferDays: buffer,
      studyBlockStart: "06:00",
      studyBlockEnd: "22:00"
    };

    const newSubjects = DEFAULT_SUBJECTS;
    const metrics = calculateMetrics(newSubjects, newSettings);
    const newPlan: BacklogPlan = {
      id: `plan_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      subjects: newSubjects,
      settings: newSettings,
      metrics
    };

    const roadmap = generateRoadmap(newPlan);
    newPlan.roadmap = roadmap;

    const newTodos = generateTodosFromRoadmap(roadmap, newPlan.id);
    setBacklogPlan(newPlan);

    let updatedTodos: typeof todos = [];
    setTodos(prev => {
      const nonBacklog = prev.filter(t => !t.isBacklogTask);
      updatedTodos = [...nonBacklog, ...newTodos];
      return updatedTodos;
    });

    try {
      localStorage.setItem("jee_tracker_backlog_plan", JSON.stringify(newPlan));
    } catch (e) {}

    saveStateToCloudNow({ backlogPlan: newPlan, todos: updatedTodos });
  };

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
    const nextState = !task.completed;
    if (nextState) {
      addXp(task.xpReward || 50);
    } else {
      addXp(-(task.xpReward || 50));
    }
    updateTask(task.id, { completed: nextState });
  };

  const handleDeletePlan = () => {
    if (window.confirm("Are you sure you want to reset and delete your Backlog Plan? This will remove all scheduled backlog tasks from your daily study plan.")) {
      setBacklogPlan(null);
      let updatedTodos: typeof todos = [];
      const now = Date.now();
      setTodos(prev => {
        updatedTodos = prev.map(t => 
          t.isBacklogTask ? { ...t, isDeleted: true, deletedAt: now } : t
        );
        return updatedTodos;
      });
      try {
        localStorage.removeItem("jee_tracker_backlog_plan");
      } catch (e) {}
      saveStateToCloudNow({ backlogPlan: null, todos: updatedTodos });
    }
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

    // Keep completed backlog tasks, replace unfinished ones without duplicating
    let nextTodos: any[] = [];
    setTodos(prev => {
      const nonBacklog = prev.filter(t => !t.isBacklogTask);
      const completedBacklog = prev.filter(t => t.isBacklogTask && t.completed);
      const completedSignatures = new Set<string>();
      completedBacklog.forEach(t => {
        getTaskSignaturesWithLegacy(t).forEach(sig => completedSignatures.add(sig));
      });

      const freshTasks = newTodos.filter(t => {
        const sigs = getTaskSignaturesWithLegacy(t);
        return !sigs.some(s => completedSignatures.has(s));
      });
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 shadow-sm flex items-center justify-center shrink-0">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                TRACKER 360
              </h1>
              <span className="px-2 py-0.5 rounded-md bg-amber-400/10 text-amber-700 dark:text-amber-400 text-[10px] font-mono font-bold border border-amber-400/25">
                INTERLEAVED ROTATION
              </span>
              {planStats && (
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border ${
                    planStats.paceTone === 'ahead'
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25'
                      : planStats.paceTone === 'behind'
                      ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25'
                      : 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/25'
                  }`}
                >
                  {planStats.paceLabel}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
              Multi-Subject Academic Scheduler &amp; Backlog Recovery
            </p>
          </div>
        </div>

        {backlogPlan && !showWizard && (
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full sm:w-auto py-1 shrink-0">
            <button
              type="button"
              onClick={handleExportPdf}
              className="px-3.5 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-sm whitespace-nowrap shrink-0 cursor-pointer"
              title="Export complete day-wise roadmap with checkboxes as a printable PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export PDF</span>
            </button>
            <button
              type="button"
              onClick={handleApplyAllToCalendar}
              disabled={isSyncingCalendar}
              className="px-3 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-sm disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{isSyncingCalendar ? "Syncing..." : "Sync Calendar"}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowSimulator(true)}
              className="px-3 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-amber-500" />
              <span>Simulator</span>
            </button>
            <button
              type="button"
              onClick={() => setShowWizard(true)}
              className="px-3 h-9 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition shadow-sm whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Plan</span>
            </button>
            <button
              type="button"
              onClick={handleDeletePlan}
              className="px-2.5 h-9 rounded-xl bg-slate-100 hover:bg-rose-50 dark:bg-slate-800/80 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-700/80 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap shrink-0 cursor-pointer"
              title="Reset and clear active backlog plan"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        )}
      </div>

      {syncMessage && (
        <div className="p-3 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-lg flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4" />
          <span>{syncMessage}</span>
        </div>
      )}

      {/* Missed Tasks Alert Banner */}
      {missedTasks.length > 0 && !showWizard && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 rounded-2xl liquid-glass-accent flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
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

      {/* MODE 2: NO PLAN EXISTS - INTERACTIVE 3-STEP ARCHITECTURE & 1-CLICK STARTERS */}
      {!backlogPlan && !showWizard && (
        <div className="space-y-6">
          {/* Hero Command Header with Liquid Glass Glow */}
          <div className="rounded-2xl sm:rounded-3xl liquid-glass p-5 sm:p-8 relative overflow-hidden shadow-sm">
            <div className="max-w-3xl space-y-3 relative z-10">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-md text-[10px] sm:text-xs font-mono font-bold bg-amber-400/15 text-amber-700 dark:text-amber-400 border border-amber-400/30">
                  SYSTEM READY
                </span>
                <span className="text-slate-400 dark:text-slate-500 text-xs font-mono">·</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">Multi-Subject Daily Flow Engine</span>
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                Master Your Backlog with <span className="text-amber-500 dark:text-amber-400">Tracker 360</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                Tracker 360 eliminates study fatigue through automated subject rotation. Select chapters, pick individual 2-hour lecture sessions, and generate a day-by-day roadmap with 1-click calendar sync and printable PDF checklists.
              </p>
            </div>

            {/* 3-Step Interactive Blueprint Strip */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-6 border-t border-slate-200/50 dark:border-slate-800/80 mt-6">
              <div className="p-3.5 rounded-xl liquid-glass-pill space-y-1">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-bold font-mono">
                  <span className="w-5 h-5 rounded-full bg-amber-400/20 flex items-center justify-center text-[11px] font-black">1</span>
                  <span>SELECT CHAPTERS &amp; LECS</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Browse your syllabus and tap specific lecture cards (default 2 hours per lecture) with practice questions.
                </p>
              </div>

              <div className="p-3.5 rounded-xl liquid-glass-pill space-y-1">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-bold font-mono">
                  <span className="w-5 h-5 rounded-full bg-amber-400/20 flex items-center justify-center text-[11px] font-black">2</span>
                  <span>CALIBRATE DAILY CAPACITY</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Set daily study hours and target deadline. The engine auto-computes buffer days to prevent burnout.
                </p>
              </div>

              <div className="p-3.5 rounded-xl liquid-glass-pill space-y-1">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-bold font-mono">
                  <span className="w-5 h-5 rounded-full bg-amber-400/20 flex items-center justify-center text-[11px] font-black">3</span>
                  <span>DAILY ROTATION &amp; SYNC</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Physics ➔ Chemistry ➔ Maths rotate automatically with 15-minute breaks and 1-click Google Calendar sync.
                </p>
              </div>
            </div>
          </div>

          {/* 1-Click Starter Presets - Instant Creation */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">
                Start Instantly · Choose a Blueprint
              </span>
              <span className="text-[11px] font-mono text-slate-400">1-click automated setup</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Preset 1: 60-Day Sprint */}
              <div className="p-4 sm:p-5 rounded-2xl liquid-glass liquid-glass-card flex flex-col justify-between space-y-4 group">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-400/15 text-amber-700 dark:text-amber-400 border border-amber-400/30">
                      HIGH INTENSITY
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                      4.0h / day
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span>60-Day Recovery Sprint</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    2 lectures/day rotating across Physics, Chemistry, and Math. Ideal for rapid syllabus recovery with 3 buffer days.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleQuickCreatePlan('60day')}
                  className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-98 text-slate-950 font-black text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
                >
                  <span>Launch 60-Day Sprint</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Preset 2: 90-Day Comprehensive */}
              <div className="p-4 sm:p-5 rounded-2xl liquid-glass liquid-glass-card flex flex-col justify-between space-y-4 group">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border border-cyan-500/30">
                      BALANCED PACE
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                      3.5h / day
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-cyan-500" />
                    <span>90-Day Deep Coverage</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Comprehensive chapter coverage with built-in revision cycles, 5 buffer recovery days, and scheduled chapter tests.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleQuickCreatePlan('90day')}
                  className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer border border-slate-700"
                >
                  <span>Launch 90-Day Plan</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Preset 3: Custom Architecture Wizard */}
              <div className="p-4 sm:p-5 rounded-2xl liquid-glass liquid-glass-card flex flex-col justify-between space-y-4 group">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/15 text-purple-700 dark:text-purple-400 border border-purple-500/30">
                      FULL CONTROL
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                      Custom Specs
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-purple-500" />
                    <span>Custom Blueprint Setup</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Handpick specific chapters from your syllabus, click individual lecture badges, set exact study windows, and configure custom hours.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowWizard(true)}
                  className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer border border-slate-200 dark:border-slate-700"
                >
                  <span>Launch Custom Wizard</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          <SpacedMemoryWidget />
        </div>
      )}

      {/* MODE 3: ACTIVE PLAN COMMAND CENTER */}
      {backlogPlan && !showWizard && (
        <div className="space-y-5">
          {/* Top 4 Stat Cards - High Density, Liquid Glass Specular Aesthetic */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            {/* Card 1: Lectures Left */}
            <div className="p-3 sm:p-4 rounded-xl liquid-glass liquid-glass-card flex flex-col justify-between min-h-[76px] sm:min-h-[88px]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-xs font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Lectures Left</span>
                <BookOpen className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              </div>
              <div className="mt-1">
                <p className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white font-mono tabular-nums leading-tight">
                  {Math.max(0, backlogPlan.metrics.totalLectures - (planStats?.completedLecs || 0))}
                  <span className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 font-normal ml-1">/ {backlogPlan.metrics.totalLectures}</span>
                </p>
                <div className="w-full bg-slate-200/60 dark:bg-slate-800/80 rounded-full h-1 mt-1.5 overflow-hidden">
                  <div
                    className="bg-amber-400 h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.round(((planStats?.completedLecs || 0) / Math.max(1, backlogPlan.metrics.totalLectures)) * 100))}%`
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Card 2: Workload Hours */}
            <div className="p-3 sm:p-4 rounded-xl liquid-glass liquid-glass-card flex flex-col justify-between min-h-[76px] sm:min-h-[88px]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-xs font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Workload</span>
                <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              </div>
              <div className="mt-1">
                <p className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white font-mono tabular-nums leading-tight">
                  {backlogPlan.metrics.totalWorkloadHours}h
                </p>
                <p className="text-[10px] sm:text-xs text-amber-600 dark:text-amber-400 font-mono mt-0.5 truncate">
                  ~{+(backlogPlan.settings.targetDailyMinutes / 60).toFixed(1)}h / day
                </p>
              </div>
            </div>

            {/* Card 3: Target Deadline */}
            <div className="p-3 sm:p-4 rounded-xl liquid-glass liquid-glass-card flex flex-col justify-between min-h-[76px] sm:min-h-[88px]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-xs font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Target Date</span>
                <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              </div>
              <div className="mt-1">
                <p className="text-sm sm:text-xl font-black text-slate-900 dark:text-white font-mono tabular-nums leading-tight truncate">
                  {backlogPlan.settings.deadlineDate}
                </p>
                <p className="text-[10px] sm:text-xs text-amber-600 dark:text-amber-400 font-mono mt-0.5 truncate">
                  Proj: {backlogPlan.metrics.projectedCompletionDate}
                </p>
              </div>
            </div>

            {/* Card 4: Plan Health */}
            <div className="p-3 sm:p-4 rounded-xl liquid-glass liquid-glass-card flex flex-col justify-between min-h-[76px] sm:min-h-[88px]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-xs font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Health</span>
                <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              </div>
              <div className="mt-1">
                <div className="flex items-center gap-1.5">
                  {getHealthBadge(backlogPlan.metrics.feasibilityStatus)}
                </div>
                <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
                  Score: <span className="text-slate-900 dark:text-white font-bold">{backlogPlan.metrics.healthScore}/100</span>
                </p>
              </div>
            </div>
          </div>

          {/* Compact Subject Rotation Ticker with Liquid Glass */}
          <div className="px-3.5 py-2.5 rounded-xl liquid-glass flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs shadow-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
              <span className="text-slate-600 dark:text-slate-400 text-xs font-medium">
                <strong className="text-slate-900 dark:text-white font-semibold">Interleaved Loop:</strong> Sequential daily subject rotation
              </span>
            </div>

            <div className="flex items-center gap-1.5 font-mono text-[11px] self-start sm:self-auto">
              <span className="px-2 py-0.5 rounded font-bold text-cyan-700 dark:text-cyan-400 bg-cyan-500/10 border border-cyan-500/20">
                Physics
              </span>
              <span className="text-slate-400">→</span>
              <span className="px-2 py-0.5 rounded font-bold text-purple-700 dark:text-purple-400 bg-purple-500/10 border border-purple-500/20">
                Chemistry
              </span>
              <span className="text-slate-400">→</span>
              <span className="px-2 py-0.5 rounded font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20">
                Mathematics
              </span>
            </div>
          </div>

          {/* Section Navigation Tabs (Liquid Glass Pills) */}
          <div className="flex items-center gap-1.5 sm:gap-2 border-b border-slate-200/80 dark:border-slate-800/80 pb-2 sm:pb-2.5 overflow-x-auto no-scrollbar">
            {[
              { id: 'journey', label: 'Progress & Journey', icon: TrendingUp },
              { id: 'today', label: "Today's Mission", icon: Target },
              { id: 'spaced', label: 'Spaced Memory', icon: BrainCircuit },
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
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 min-h-[36px] sm:min-h-[42px] rounded-lg sm:rounded-xl font-bold text-xs flex items-center gap-1.5 sm:gap-2 transition whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-amber-400 text-slate-950 shadow-sm'
                      : 'liquid-glass-pill text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
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
            <div className="space-y-6">
              <BacklogProgressJourney
                plan={backlogPlan}
                todos={todos}
                onSelectTab={setActiveTab}
                onOpenSimulator={() => setShowSimulator(true)}
              />
              <SpacedMemoryWidget />
            </div>
          )}

          {/* TAB: SPACED MEMORY CONSOLIDATION */}
          {activeTab === 'spaced' && (
            <SpacedMemoryWidget />
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
                              <span>{task.durationMinutes || 120} min ({+((task.durationMinutes || 120) / 60).toFixed(1)}h)</span>
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
              <SpacedMemoryWidget className="mt-6" />
            </div>
          )}

          {/* TAB 2: CURRICULUM & LECTURES TRACKER (RESPONSIVE ACCORDION & SUBJECT FILTERS) */}
          {activeTab === 'curriculum' && (
            <div className="space-y-4">
              {/* Header & Filter Controls */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-amber-500" />
                      <span>Curriculum &amp; Lectures Tracker</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Enrolled chapters organized by subject. Tap any chapter row to expand or collapse individual lecture cards.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleToggleExpandAllChapters(true)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-300 transition cursor-pointer"
                    >
                      Expand All
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleExpandAllChapters(false)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-300 transition cursor-pointer"
                    >
                      Collapse All
                    </button>
                  </div>
                </div>

                {/* Subject Switcher Filters */}
                <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 overflow-x-auto no-scrollbar">
                  {[
                    { id: 'all', label: 'All Subjects' },
                    { id: 'Physics', label: 'Physics' },
                    { id: 'Chemistry', label: 'Chemistry' },
                    { id: 'Mathematics', label: 'Mathematics' }
                  ].map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setCurriculumSubjectFilter(f.id as any)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                        curriculumSubjectFilter === f.id
                          ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject Chapter Groups */}
              {backlogPlan.subjects
                .filter(sub => curriculumSubjectFilter === 'all' || sub.name === curriculumSubjectFilter)
                .map(sub => {
                  const totalSubjectLecs = sub.chapters.reduce(
                    (acc, c) => acc + (c.selectedLectures?.length ?? c.lecturesRemaining),
                    0
                  );

                  return (
                    <div
                      key={sub.id}
                      className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3.5 shadow-xs"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 dark:border-slate-800/80 pb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: sub.color }} />
                          <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                            {sub.name}
                          </h4>
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300">
                            {sub.chapters.length} chapters · {totalSubjectLecs} lecs
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleOpenAddChapter(sub.name, sub.color)}
                          className="px-3 py-1.5 min-h-[36px] rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition self-start sm:self-auto shadow-xs cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Select Chapter ({sub.name})</span>
                        </button>
                      </div>

                      <div className="space-y-2">
                        {sub.chapters.length === 0 ? (
                          <p className="text-xs text-slate-400 dark:text-slate-500 py-4 text-center font-mono">
                            No chapters enrolled yet for {sub.name}. Click "Select Chapter" to choose chapters and lectures.
                          </p>
                        ) : (
                          sub.chapters.map(chap => {
                            const lecs = chap.selectedLectures && chap.selectedLectures.length > 0
                              ? chap.selectedLectures
                              : Array.from({ length: chap.lecturesRemaining }, (_, i) => i + 1);

                            const isExpanded = expandedChapterIds[chap.id] ?? false;
                            const totalHours = +((lecs.length * (chap.lectureDurationMinutes || 120)) / 60).toFixed(1);

                            return (
                              <div
                                key={chap.id}
                                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70 overflow-hidden transition"
                              >
                                {/* Collapsible Chapter Header Row */}
                                <div
                                  onClick={() => toggleChapterExpand(chap.id)}
                                  className="p-3 sm:p-3.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-100/70 dark:hover:bg-slate-900/70 transition"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <span className="text-[10px] sm:text-xs font-mono font-bold text-amber-700 dark:text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20 shrink-0">
                                      #{chap.order}
                                    </span>
                                    <div className="min-w-0">
                                      <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                                        {chap.name}
                                      </h5>
                                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                                        {lecs.length} lecs · {totalHours}h workload
                                        {chap.practice?.enabled && ` · ${chap.practice.questionCount} Qs`}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenEditChapter(chap, sub.color);
                                      }}
                                      className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-amber-700 dark:text-amber-400 border border-slate-300 dark:border-slate-700 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                                      title="Edit selected lectures and practice count"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                      <span className="hidden sm:inline">Edit</span>
                                    </button>
                                    <div className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                      {isExpanded ? (
                                        <ChevronUp className="w-4 h-4" />
                                      ) : (
                                        <ChevronDown className="w-4 h-4" />
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Expanded Lecture Cards Grid */}
                                {isExpanded && (
                                  <div className="p-3.5 pt-0 border-t border-slate-200/80 dark:border-slate-800/80 mt-2 space-y-2.5">
                                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider pt-2">
                                      <span>Enrolled Lecture Sessions ({chap.lectureDurationMinutes || 120} min each):</span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      {lecs.map(num => (
                                        <div
                                          key={num}
                                          className="px-2.5 py-1 min-h-[32px] rounded-lg text-xs font-mono font-bold bg-amber-100 dark:bg-amber-400/15 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-400/30 flex items-center gap-1 shadow-2xs"
                                        >
                                          <span>Lec {num}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
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

          {/* TAB 3: ROADMAP TIMELINE & INTERACTIVE CHECKLIST */}
          {activeTab === 'roadmap' && (
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-500" />
                    <span>Day-by-Day Roadmap Schedule</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Multi-subject rotation checklist. Tap any task checkbox to mark completed and gain XP directly.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleExportPdf}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                    title="Generate and download complete printable day-wise checklist PDF"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PDF Roadmap</span>
                  </button>

                  {/* Filter Tabs */}
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs overflow-x-auto no-scrollbar">
                    {(['all', 'lecture', 'practice', 'revision', 'test'] as const).map(f => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setActiveDayFilter(f)}
                        className={`px-2.5 py-1 rounded-lg capitalize font-bold text-xs transition whitespace-nowrap cursor-pointer ${
                          activeDayFilter === f
                            ? 'bg-amber-400 text-slate-950 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Days List */}
              <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1.5 custom-calendar-scrollbar">
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
                      className={`p-3.5 sm:p-4 rounded-xl border transition flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                        isToday
                          ? 'bg-amber-50/50 dark:bg-slate-950 border-amber-400 dark:border-amber-400 shadow-xs'
                          : 'bg-slate-50/70 dark:bg-slate-950/70 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div
                          className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex flex-col items-center justify-center font-mono shrink-0 border ${
                            isToday
                              ? 'bg-amber-400 text-slate-950 font-black border-amber-300'
                              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          <span className="text-[8px] sm:text-[9px] uppercase font-bold">Day</span>
                          <span className="text-xs sm:text-sm font-bold">{day.dayIndex}</span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                            <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">{day.date}</span>
                            {isToday && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-amber-400 text-slate-950">
                                TODAY
                              </span>
                            )}
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
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

                          <div className="space-y-1.5 mt-2">
                            {dayTasks.map(t => {
                              const subColor =
                                t.subject === 'Physics'
                                  ? '#06b6d4'
                                  : t.subject === 'Chemistry'
                                  ? '#a855f7'
                                  : '#f59e0b';

                              const matchingTodo = todos.find(
                                todo =>
                                  todo.isBacklogTask &&
                                  (todo.id === t.id ||
                                    (todo.backlogChapterId === t.chapterId &&
                                      todo.backlogTaskType === t.type &&
                                      (t.lectureNumber ? todo.lectureNumber === t.lectureNumber : true)))
                              );
                              const isCompleted = Boolean(matchingTodo?.completed);

                              return (
                                <div
                                  key={t.id}
                                  onClick={() => {
                                    if (matchingTodo) handleToggleTask(matchingTodo);
                                  }}
                                  className={`flex items-center gap-2 text-xs flex-wrap p-1.5 rounded-lg transition cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-900/60 ${
                                    isCompleted
                                      ? 'text-slate-400 dark:text-slate-500 line-through'
                                      : 'text-slate-800 dark:text-slate-200'
                                  }`}
                                  title="Click to toggle completed"
                                >
                                  {isCompleted ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                  ) : (
                                    <div className="w-4 h-4 rounded border border-slate-300 dark:border-slate-600 hover:border-amber-400 shrink-0" />
                                  )}
                                  <span
                                    className="font-bold text-[10px] sm:text-[11px] px-1.5 py-0.5 rounded font-mono"
                                    style={{
                                      color: subColor,
                                      backgroundColor: `${subColor}15`
                                    }}
                                  >
                                    {t.subject}
                                  </span>
                                  <span className="font-semibold text-xs">{t.title}</span>
                                  <span className="text-slate-400 dark:text-slate-500 font-mono text-[11px]">({t.durationMinutes}m)</span>
                                  {isCompleted && (
                                    <span className="no-underline text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                      Done
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="text-left md:text-right shrink-0 pt-1 md:pt-0 border-t md:border-t-0 border-slate-200/60 dark:border-slate-800/60">
                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400 font-mono">
                          {Math.floor(day.totalMinutes / 60)}h {day.totalMinutes % 60}m
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-mono">total day workload</span>
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
