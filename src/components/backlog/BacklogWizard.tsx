import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Layers,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Clock,
  BookOpen,
  Calendar,
  Sparkles,
  Sliders,
  CheckCircle2,
  ChevronRight,
  AlertTriangle,
  RotateCcw,
  Zap,
  Target,
  Edit3,
  Repeat
} from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import {
  BacklogChapterInput,
  BacklogPlan,
  BacklogPlanSettings,
  BacklogSubject,
  FeasibilityStatus
} from '@/lib/backlog/types';
import { calculateMetrics, generateRoadmap, generateTodosFromRoadmap } from '@/lib/backlog/engine';
import { ChapterLectureModal } from './ChapterLectureModal';

interface BacklogWizardProps {
  onComplete: () => void;
  onCancel?: () => void;
  initialPlan?: BacklogPlan | null;
}

const DEFAULT_SUBJECTS: BacklogSubject[] = [
  {
    id: 'sub-phy',
    name: 'Physics',
    color: '#06b6d4', // cyan-500
    chapters: [
      {
        id: 'phy-nlm',
        name: "Newton's Laws of Motion",
        subject: 'Physics',
        order: 1,
        selectedLectures: [1, 2, 3, 4, 5],
        lecturesRemaining: 5,
        lectureDurationMinutes: 120, // 2 Hours default
        totalLecturesInChapter: 15,
        practice: {
          enabled: true,
          questionCount: 45,
          estimatedMinutesPerQuestion: 2.5
        }
      },
      {
        id: 'phy-wpe',
        name: 'Work, Power & Energy',
        subject: 'Physics',
        order: 2,
        selectedLectures: [1, 2, 3, 4],
        lecturesRemaining: 4,
        lectureDurationMinutes: 120, // 2 Hours default
        totalLecturesInChapter: 12,
        practice: {
          enabled: true,
          questionCount: 40,
          estimatedMinutesPerQuestion: 2.5
        }
      }
    ]
  },
  {
    id: 'sub-chem',
    name: 'Chemistry',
    color: '#a855f7', // purple-500
    chapters: [
      {
        id: 'chem-atomic',
        name: 'Structure of Atom',
        subject: 'Chemistry',
        order: 1,
        selectedLectures: [1, 2, 3, 4],
        lecturesRemaining: 4,
        lectureDurationMinutes: 120, // 2 Hours default
        totalLecturesInChapter: 14,
        practice: {
          enabled: true,
          questionCount: 40,
          estimatedMinutesPerQuestion: 2
        }
      },
      {
        id: 'chem-bond',
        name: 'Chemical Bonding and Molecular Structure',
        subject: 'Chemistry',
        order: 2,
        selectedLectures: [1, 2, 3, 4, 5],
        lecturesRemaining: 5,
        lectureDurationMinutes: 120, // 2 Hours default
        totalLecturesInChapter: 16,
        practice: {
          enabled: true,
          questionCount: 50,
          estimatedMinutesPerQuestion: 2
        }
      }
    ]
  },
  {
    id: 'sub-math',
    name: 'Mathematics',
    color: '#f59e0b', // amber-500
    chapters: [
      {
        id: 'math-quad',
        name: 'Quadratic Equations',
        subject: 'Mathematics',
        order: 1,
        selectedLectures: [1, 2, 3, 4],
        lecturesRemaining: 4,
        lectureDurationMinutes: 120, // 2 Hours default
        totalLecturesInChapter: 12,
        practice: {
          enabled: true,
          questionCount: 45,
          estimatedMinutesPerQuestion: 3
        }
      },
      {
        id: 'math-seq',
        name: 'Sequences and Series',
        subject: 'Mathematics',
        order: 2,
        selectedLectures: [1, 2, 3, 4, 5],
        lecturesRemaining: 5,
        lectureDurationMinutes: 120, // 2 Hours default
        totalLecturesInChapter: 15,
        practice: {
          enabled: true,
          questionCount: 40,
          estimatedMinutesPerQuestion: 3
        }
      }
    ]
  }
];

export const BacklogWizard: React.FC<BacklogWizardProps> = ({ onComplete, onCancel, initialPlan }) => {
  const { setBacklogPlan, setTodos, saveStateToCloudNow } = useAppContext();

  // Wizard Steps: 1. Setup Chapters & Lectures -> 2. Review Backlog -> 3. Capacity & Rotation -> 4. Roadmap & Commit
  const [step, setStep] = useState<number>(1);

  // Form State
  const [subjects, setSubjects] = useState<BacklogSubject[]>(
    initialPlan?.subjects || DEFAULT_SUBJECTS
  );
  const [activeSubjectId, setActiveSubjectId] = useState<string>(
    initialPlan?.subjects[0]?.id || DEFAULT_SUBJECTS[0].id
  );

  // Modal State for Chapter & Lecture selection
  const [isChapterModalOpen, setIsChapterModalOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState<BacklogChapterInput | null>(null);

  // Settings State
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const defaultDeadline = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  }, []);

  const [startDate, setStartDate] = useState<string>(
    initialPlan?.settings.startDate || todayStr
  );
  const [deadlineDate, setDeadlineDate] = useState<string>(
    initialPlan?.settings.deadlineDate || defaultDeadline
  );
  const [capacityMode, setCapacityMode] = useState<'hours' | 'lectures'>('hours');
  const [dailyHours, setDailyHours] = useState<number>(
    initialPlan ? +(initialPlan.settings.targetDailyMinutes / 60).toFixed(1) : 4.0
  );
  const [dailyLectures, setDailyLectures] = useState<number>(
    initialPlan?.settings.targetDailyLectures || 2
  );

  // Optional toggles
  const [revisionEnabled, setRevisionEnabled] = useState<boolean>(
    initialPlan?.settings.revisionEnabled ?? true
  );
  const [revisionAfterEvery, setRevisionAfterEvery] = useState<number>(
    initialPlan?.settings.revisionAfterEveryNLectures || 6
  );
  const [testEnabled, setTestEnabled] = useState<boolean>(
    initialPlan?.settings.testEnabled ?? true
  );
  const [bufferDays, setBufferDays] = useState<number>(
    initialPlan?.settings.bufferDays ?? 2
  );

  // Synchronize hours and lectures (based on 2-hour = 120 min lectures)
  const handleDailyHoursChange = (val: number) => {
    setDailyHours(val);
    setDailyLectures(Math.max(1, Math.round((val * 60) / 120)));
  };

  const handleDailyLecturesChange = (val: number) => {
    setDailyLectures(val);
    setDailyHours(+((val * 120) / 60).toFixed(1));
  };

  // Live Metrics
  const currentSettings: BacklogPlanSettings = useMemo(() => ({
    startDate,
    deadlineDate,
    capacityMode,
    targetDailyMinutes: Math.round(dailyHours * 60),
    targetDailyLectures: dailyLectures,
    revisionEnabled,
    revisionAfterEveryNLectures: revisionAfterEvery,
    revisionDurationMinutes: 45,
    testEnabled,
    testAfterChapterCompletion: true,
    testDurationMinutes: 90,
    bufferDays
  }), [startDate, deadlineDate, capacityMode, dailyHours, dailyLectures, revisionEnabled, revisionAfterEvery, testEnabled, bufferDays]);

  const metrics = useMemo(() => {
    return calculateMetrics(subjects, currentSettings);
  }, [subjects, currentSettings]);

  // Preview Roadmap (with round-robin Subject Rotation)
  const previewRoadmap = useMemo(() => {
    if (step < 3) return [];
    const tempPlan: BacklogPlan = {
      id: 'preview',
      createdAt: todayStr,
      updatedAt: todayStr,
      subjects,
      settings: currentSettings,
      metrics
    };
    return generateRoadmap(tempPlan);
  }, [subjects, currentSettings, metrics, step, todayStr]);

  // Active Subject
  const activeSubject = subjects.find(s => s.id === activeSubjectId) || subjects[0];

  // Save / Update chapter from ChapterLectureModal
  const handleSaveChapterFromModal = (chapterInput: BacklogChapterInput) => {
    setSubjects(prev =>
      prev.map(s => {
        if (s.id !== activeSubject.id) return s;

        const exists = s.chapters.some(c => c.id === chapterInput.id || c.name === chapterInput.name);
        let updatedChapters: BacklogChapterInput[];

        if (exists) {
          updatedChapters = s.chapters.map(c =>
            c.id === chapterInput.id || c.name === chapterInput.name ? { ...c, ...chapterInput } : c
          );
        } else {
          const newOrder = s.chapters.length + 1;
          updatedChapters = [...s.chapters, { ...chapterInput, order: newOrder }];
        }

        return { ...s, chapters: updatedChapters };
      })
    );
  };

  const handleRemoveChapter = (subjectId: string, chapterId: string) => {
    setSubjects(prev =>
      prev.map(s => {
        if (s.id !== subjectId) return s;
        const filtered = s.chapters.filter(c => c.id !== chapterId);
        const reordered = filtered.map((c, idx) => ({ ...c, order: idx + 1 }));
        return { ...s, chapters: reordered };
      })
    );
  };

  const handleMoveChapter = (subjectId: string, chapterIndex: number, direction: 'up' | 'down') => {
    setSubjects(prev =>
      prev.map(s => {
        if (s.id !== subjectId) return s;
        const newChapters = [...s.chapters];
        const targetIndex = direction === 'up' ? chapterIndex - 1 : chapterIndex + 1;
        if (targetIndex < 0 || targetIndex >= newChapters.length) return s;

        const temp = newChapters[chapterIndex];
        newChapters[chapterIndex] = newChapters[targetIndex];
        newChapters[targetIndex] = temp;

        const reordered = newChapters.map((c, idx) => ({ ...c, order: idx + 1 }));
        return { ...s, chapters: reordered };
      })
    );
  };

  // Commit Plan to App Context
  const handleCommitPlan = () => {
    const planId = `plan_${Date.now()}`;
    const newPlan: BacklogPlan = {
      id: planId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      subjects,
      settings: currentSettings,
      metrics
    };

    const roadmap = generateRoadmap(newPlan);
    newPlan.roadmap = roadmap;

    const newTodos = generateTodosFromRoadmap(roadmap, planId);

    // Save to context
    setBacklogPlan(newPlan);

    // Save directly to dedicated fallback key in localStorage
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("jee_tracker_backlog_plan", JSON.stringify(newPlan));
      } catch (e) {
        console.warn("Failed to write backlog plan to backup storage:", e);
      }
    }

    // Replace previous backlog tasks with new ones
    let updatedTodos: any[] = [];
    setTodos(prev => {
      const nonBacklog = prev.filter(t => !t.isBacklogTask);
      updatedTodos = [...nonBacklog, ...newTodos];
      return updatedTodos;
    });

    // Flush immediately to local storage and Firestore
    saveStateToCloudNow({ backlogPlan: newPlan, todos: updatedTodos });

    onComplete();
  };

  const getStatusBadge = (status: FeasibilityStatus) => {
    switch (status) {
      case 'COMFORTABLE':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            COMFORTABLE
          </span>
        );
      case 'ON_TRACK':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-400/15 text-amber-400 border border-amber-400/30">
            ON TRACK
          </span>
        );
      case 'TIGHT':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">
            TIGHT
          </span>
        );
      case 'AT_RISK':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            AT RISK
          </span>
        );
      case 'IMPOSSIBLE':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30">
            IMPOSSIBLE
          </span>
        );
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Wizard Header Bar with Clean Yellow/Amber Highlights */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-amber-400 text-slate-950 shadow-sm font-black">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-white tracking-wide">
                TRACKER 360 SETUP
              </h2>
              <span className="text-xs px-2 py-0.5 rounded bg-amber-400/15 text-amber-400 font-mono font-bold border border-amber-400/30">
                Step {step} of 4
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {step === 1 && 'Select chapters from syllabus & pick individual lectures (Default: 2 Hours)'}
              {step === 2 && 'Review total enrolled workload and priority execution queues'}
              {step === 3 && 'Calibrate daily capacity and enable subject rotation schedule'}
              {step === 4 && 'Preview your day-by-day roadmap with automatic subject rotation'}
            </p>
          </div>
        </div>

        {/* Step Indicator Buttons */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          {[
            { num: 1, label: 'Chapters' },
            { num: 2, label: 'Review' },
            { num: 3, label: 'Pace' },
            { num: 4, label: 'Roadmap' }
          ].map(s => (
            <button
              key={s.num}
              type="button"
              onClick={() => {
                if (s.num <= step) setStep(s.num);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                s.num === step
                  ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                  : s.num < step
                  ? 'bg-slate-800 text-amber-300 border border-amber-400/20'
                  : 'bg-slate-950 text-slate-500 border border-slate-800 cursor-not-allowed'
              }`}
            >
              <span>{s.num}.</span>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* STEP 1: CHAPTER & LECTURE SELECTION */}
      {step === 1 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Subject Switcher */}
          <div className="flex gap-2 border-b border-slate-800 pb-3 overflow-x-auto">
            {subjects.map(s => {
              const count = s.chapters.reduce(
                (acc, c) => acc + (c.selectedLectures?.length ?? c.lecturesRemaining),
                0
              );
              const isSelected = s.id === activeSubject.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveSubjectId(s.id)}
                  className={`px-4 py-2.5 rounded-xl border flex items-center gap-2.5 transition whitespace-nowrap ${
                    isSelected
                      ? 'bg-slate-800 border-amber-400 text-white shadow-sm'
                      : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="font-semibold text-sm">{s.name}</span>
                  <span className="px-2 py-0.5 rounded bg-slate-900 text-xs text-amber-400 font-mono font-bold">
                    {count} lecs
                  </span>
                </button>
              );
            })}
          </div>

          {/* Chapters List for Active Subject */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: activeSubject.color }}
                  />
                  {activeSubject.name} Enrolled Backlog Chapters
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Ordered by priority. Click <span className="text-amber-400 font-semibold">Select Chapters</span> to choose from syllabus and select individual lecture cards.
                </p>
              </div>

              {/* Select Chapters Button */}
              <button
                type="button"
                onClick={() => {
                  setEditingChapter(null);
                  setIsChapterModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-2 shadow-sm transition self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Select Chapters from Syllabus</span>
              </button>
            </div>

            {/* Chapters in Active Subject Queue */}
            <div className="space-y-3 pt-2">
              {activeSubject.chapters.length === 0 ? (
                <div className="p-8 text-center text-slate-400 border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
                  <BookOpen className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-300">No chapters selected for {activeSubject.name} yet.</p>
                  <p className="text-xs text-slate-500 mt-1">Click above to select chapters and pick lectures.</p>
                </div>
              ) : (
                activeSubject.chapters.map((chap, idx) => {
                  const lecList = chap.selectedLectures && chap.selectedLectures.length > 0
                    ? chap.selectedLectures
                    : Array.from({ length: chap.lecturesRemaining }, (_, i) => i + 1);
                  const totalHrs = +((lecList.length * (chap.lectureDurationMinutes || 120)) / 60).toFixed(1);

                  return (
                    <div
                      key={chap.id}
                      className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-amber-400/10 border border-amber-400/30 text-amber-400 flex items-center justify-center font-bold text-xs font-mono shrink-0 mt-0.5">
                          #{chap.order}
                        </div>
                        <div className="space-y-2 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-sm font-bold text-white truncate">{chap.name}</h4>
                            <span className="text-xs text-slate-400 font-mono">
                              ({totalHrs} hrs total)
                            </span>
                          </div>

                          {/* Individual Lecture Pills */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] text-slate-400 font-medium mr-1">
                              Lectures:
                            </span>
                            {lecList.map(n => (
                              <span
                                key={n}
                                className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-amber-400/15 text-amber-300 border border-amber-400/30"
                              >
                                Lec {n}
                              </span>
                            ))}
                            <span className="text-[11px] text-slate-400 ml-1 font-mono">
                              ({chap.lectureDurationMinutes || 120}m / lec)
                            </span>
                          </div>

                          {/* Extra config indicators */}
                          {chap.practice?.enabled && (
                            <div className="text-[11px] text-purple-400 flex items-center gap-1 font-mono">
                              <span>+ {chap.practice.questionCount} practice questions included</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Chapter Item Controls */}
                      <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingChapter(chap);
                            setIsChapterModalOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-400 hover:text-amber-300 border border-slate-800 text-xs font-semibold flex items-center gap-1.5 transition"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit Lectures</span>
                        </button>

                        <div className="flex items-center bg-slate-900 rounded-lg border border-slate-800 p-0.5">
                          <button
                            type="button"
                            onClick={() => handleMoveChapter(activeSubject.id, idx, 'up')}
                            disabled={idx === 0}
                            className="p-1 text-slate-400 hover:text-white disabled:opacity-30 transition"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveChapter(activeSubject.id, idx, 'down')}
                            disabled={idx === activeSubject.chapters.length - 1}
                            className="p-1 text-slate-400 hover:text-white disabled:opacity-30 transition"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveChapter(activeSubject.id, chap.id)}
                          className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                          title="Remove Chapter"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm shadow-sm flex items-center gap-2 transition"
            >
              <span>Review Backlog Summary</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* STEP 2: TOTAL WORKLOAD REVIEW */}
      {step === 2 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Overview Metric Cards */}
          <div>
            <p className="text-xs text-amber-400 font-bold uppercase tracking-wider mb-2">
              Level 1 — Total Enrolled Workload
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <p className="text-xs text-slate-400">Total Lectures</p>
                <p className="text-2xl font-black text-white mt-1 font-mono">{metrics.totalLectures}</p>
                <p className="text-[11px] text-amber-400 mt-1">≈ {+(metrics.totalLectureMinutes / 60).toFixed(1)} hrs</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <p className="text-xs text-slate-400">Question Practice</p>
                <p className="text-2xl font-black text-purple-400 mt-1 font-mono">{metrics.totalPracticeQuestions}</p>
                <p className="text-[11px] text-slate-400 mt-1">≈ {+(metrics.totalPracticeMinutes / 60).toFixed(1)} hrs</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-900 border border-amber-400/30 bg-amber-400/5">
                <p className="text-xs text-slate-400">Total Workload</p>
                <p className="text-2xl font-black text-amber-400 mt-1 font-mono">{metrics.totalWorkloadHours}h</p>
                <p className="text-[11px] text-slate-400 mt-1">Complete effort estimate</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <p className="text-xs text-slate-400">Enrolled Chapters</p>
                <p className="text-2xl font-black text-emerald-400 mt-1 font-mono">
                  {subjects.reduce((acc, s) => acc + s.chapters.length, 0)}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">Across 3 subjects</p>
              </div>
            </div>
          </div>

          {/* Subject Breakdown Cards */}
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">
              Level 2 — Subject Workloads
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {subjects.map(s => {
                const subLecs = s.chapters.reduce(
                  (acc, c) => acc + (c.selectedLectures?.length ?? c.lecturesRemaining),
                  0
                );
                const subHours = +(
                  s.chapters.reduce(
                    (acc, c) =>
                      acc +
                      (c.selectedLectures?.length ?? c.lecturesRemaining) * (c.lectureDurationMinutes || 120) +
                      (c.practice?.enabled ? c.practice.questionCount * 2.5 : 0),
                    0
                  ) / 60
                ).toFixed(1);

                return (
                  <div
                    key={s.id}
                    className="p-4 rounded-xl bg-slate-900 border border-slate-800"
                    style={{ borderTopColor: s.color, borderTopWidth: 3 }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-white flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                        {s.name}
                      </span>
                      <span className="text-xs font-mono text-slate-400">{s.chapters.length} chaps</span>
                    </div>
                    <div className="mt-3 flex items-baseline justify-between">
                      <span className="text-xl font-bold text-white font-mono">{subLecs} lecs</span>
                      <span className="text-xs text-amber-400 font-mono">≈ {subHours} hrs</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Priority Order Breakdown */}
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">
              Level 3 — Priority Order Per Subject
            </p>
            <div className="space-y-3">
              {subjects.map(s => (
                <div key={s.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                    {s.name} Order
                  </h4>
                  <div className="space-y-1.5">
                    {s.chapters.map(c => {
                      const count = c.selectedLectures?.length ?? c.lecturesRemaining;
                      return (
                        <div
                          key={c.id}
                          className="flex items-center justify-between text-xs py-1.5 px-3 rounded bg-slate-900 border border-slate-800"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded bg-slate-800 text-amber-400 font-bold font-mono flex items-center justify-center">
                              #{c.order}
                            </span>
                            <span className="text-slate-200 font-medium">{c.name}</span>
                          </div>
                          <div className="flex items-center gap-3 text-slate-400 font-mono">
                            <span>{count} lecs ({c.lectureDurationMinutes || 120}m)</span>
                            {c.practice?.enabled && <span>{c.practice.questionCount} Qs</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm transition"
            >
              Back to Chapters
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm shadow-sm flex items-center gap-2 transition"
            >
              <span>Calibrate Deadline & Pace</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* STEP 3: DEADLINE, CAPACITY & ROTATION */}
      {step === 3 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Dynamic Recommendation Card with Yellow Accent */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-amber-400/30 bg-amber-400/5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <Sparkles className="w-4 h-4" />
                <span>Dynamic Pace Recommendation</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950 border border-slate-800 text-xs text-amber-300">
                <Repeat className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-semibold">Subject Rotation Enabled</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-300">
              <div>
                <span className="text-slate-400 block">Total Workload:</span>
                <span className="text-base font-bold text-white font-mono">
                  {metrics.totalLectures} lectures ≈ {metrics.totalWorkloadHours} hours
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Available Study Days:</span>
                <span className="text-base font-bold text-white font-mono">
                  {metrics.availableStudyDays} days ({metrics.calendarDays} calendar - {bufferDays} buffer)
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Recommended Daily Pace:</span>
                <span className="text-base font-bold text-amber-400 font-mono">
                  ~{metrics.requiredDailyLectures} lecs/day ≈ {+(metrics.requiredDailyMinutes / 60).toFixed(1)}h / day
                </span>
              </div>
            </div>
          </div>

          {/* Controls: Target Date & Daily Capacity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Target Date */}
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-400" />
                  Target Completion Deadline
                </label>
                <input
                  type="date"
                  value={deadlineDate}
                  min={todayStr}
                  onChange={e => setDeadlineDate(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white font-mono focus:border-amber-400 outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Buffer Days (for emergencies / exam prep):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="7"
                    value={bufferDays}
                    onChange={e => setBufferDays(parseInt(e.target.value))}
                    className="w-full accent-amber-400"
                  />
                  <span className="text-xs font-mono font-bold text-amber-400 w-14 text-right">
                    {bufferDays} days
                  </span>
                </div>
              </div>
            </div>

            {/* Daily Capacity Slider */}
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  Daily Capacity Target
                </label>
                <div className="flex rounded-lg bg-slate-950 p-0.5 border border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setCapacityMode('hours')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition ${
                      capacityMode === 'hours' ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-400'
                    }`}
                  >
                    Hours
                  </button>
                  <button
                    type="button"
                    onClick={() => setCapacityMode('lectures')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition ${
                      capacityMode === 'lectures' ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-400'
                    }`}
                  >
                    Lectures
                  </button>
                </div>
              </div>

              {capacityMode === 'hours' ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Daily Study Hours:</span>
                    <span className="font-bold text-amber-400 font-mono text-sm">
                      {dailyHours}h / day ({Math.round(dailyHours * 60)} min)
                    </span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="10"
                    step="0.5"
                    value={dailyHours}
                    onChange={e => handleDailyHoursChange(parseFloat(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                    <span>2.0h (1 lec)</span>
                    <span>4.0h (2 lecs)</span>
                    <span>6.0h (3 lecs)</span>
                    <span>10.0h (5 lecs)</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Daily Lectures (2h each):</span>
                    <span className="font-bold text-amber-400 font-mono text-sm">
                      {dailyLectures} lectures / day (≈ {dailyLectures * 2}h)
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={dailyLectures}
                    onChange={e => handleDailyLecturesChange(parseInt(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                    <span>1 lec (2h)</span>
                    <span>2 lecs (4h)</span>
                    <span>3 lecs (6h)</span>
                    <span>5 lecs (10h)</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Academic Settings & Health Status */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-wrap">
              <label className="text-xs text-slate-300 flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={revisionEnabled}
                  onChange={e => setRevisionEnabled(e.target.checked)}
                  className="accent-amber-400"
                />
                <span>Periodic Revision Blocks (Every 6 lectures)</span>
              </label>

              <label className="text-xs text-slate-300 flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={testEnabled}
                  onChange={e => setTestEnabled(e.target.checked)}
                  className="accent-purple-400"
                />
                <span>Chapter Mastery Tests</span>
              </label>
            </div>

            <div className="text-xs text-slate-400 font-mono flex items-center gap-2">
              <span>Plan Feasibility:</span>
              {getStatusBadge(metrics.feasibilityStatus)}
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm transition"
            >
              Back to Summary
            </button>
            <button
              type="button"
              onClick={() => setStep(4)}
              className="px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm shadow-sm flex items-center gap-2 transition"
            >
              <span>Preview Rotation Roadmap</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* STEP 4: ROADMAP PREVIEW WITH SUBJECT ROTATION */}
      {step === 4 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Top Summary Banner */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-amber-400/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white tracking-wide">
                  Roadmap Generated: {previewRoadmap.length} Days
                </h3>
                {getStatusBadge(metrics.feasibilityStatus)}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Projected Completion:{' '}
                <span className="text-amber-400 font-bold">{metrics.projectedCompletionDate}</span>
                {metrics.projectedCompletionDate <= deadlineDate ? (
                  <span className="text-emerald-400 font-semibold ml-1.5">
                    ({metrics.bufferDaysRemaining} days ahead of {deadlineDate} deadline ✓)
                  </span>
                ) : (
                  <span className="text-rose-400 font-semibold ml-1.5">
                    (Past deadline by {Math.abs(metrics.bufferDaysRemaining)} days ⚠)
                  </span>
                )}
              </p>
            </div>

            <button
              type="button"
              onClick={handleCommitPlan}
              className="px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm shadow-md flex items-center gap-2 transition"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>LAUNCH TRACKER 360</span>
            </button>
          </div>

          {/* Subject Rotation Explanation Box */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3 text-xs text-slate-300">
            <div className="p-2 rounded-lg bg-amber-400/15 text-amber-400 shrink-0">
              <Repeat className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-white">Subject Rotation Active: </span>
              Your daily tasks alternate between Physics, Chemistry, and Mathematics so you avoid study fatigue and make balanced progress across all subjects.
            </div>
          </div>

          {/* Day by Day Roadmap Preview Cards */}
          <div className="space-y-3 max-h-[480px] overflow-y-auto pr-2 custom-scrollbar">
            {previewRoadmap.map(day => (
              <div
                key={day.dayIndex}
                className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center font-mono shrink-0">
                    <span className="text-[10px] uppercase text-slate-500 font-bold">Day</span>
                    <span className="text-sm font-black text-amber-400">{day.dayIndex}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-400">{day.date}</span>
                      <span
                        className={`px-2 py-0.2 rounded text-[10px] font-bold ${
                          day.dayType === 'TEST'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : day.dayType === 'REVISION'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : 'bg-amber-400/10 text-amber-300 border border-amber-400/20'
                        }`}
                      >
                        {day.dayType}
                      </span>
                    </div>

                    <div className="space-y-1.5 mt-2">
                      {day.tasks.map(t => {
                        const subColor =
                          t.subject === 'Physics'
                            ? '#06b6d4'
                            : t.subject === 'Chemistry'
                            ? '#a855f7'
                            : '#f59e0b';

                        return (
                          <div key={t.id} className="flex items-center gap-2 text-xs text-slate-200">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: subColor }}
                            />
                            <span
                              className="font-bold text-[11px] px-1.5 py-0.2 rounded font-mono"
                              style={{
                                color: subColor,
                                backgroundColor: `${subColor}15`
                              }}
                            >
                              {t.subject}
                            </span>
                            <span className="truncate">{t.title}</span>
                            <span className="text-[11px] text-slate-400 font-mono shrink-0">
                              ({t.durationMinutes}m)
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-bold text-amber-400 font-mono">
                    {Math.floor(day.totalMinutes / 60)}h {day.totalMinutes % 60}m
                  </span>
                  <span className="text-[11px] text-slate-500 block">estimated</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between pt-2">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm transition"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleCommitPlan}
              className="px-8 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm shadow-md flex items-center gap-2 transition"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>COMMIT & START TRACKER 360</span>
            </button>
          </div>
        </motion.div>
      )}

      {/* Chapter & Lecture Selection Modal */}
      {isChapterModalOpen && (
        <ChapterLectureModal
          isOpen={isChapterModalOpen}
          onClose={() => {
            setIsChapterModalOpen(false);
            setEditingChapter(null);
          }}
          subjectName={activeSubject.name}
          subjectColor={activeSubject.color}
          onSaveChapter={handleSaveChapterFromModal}
          existingChapter={editingChapter}
          existingChapterIds={activeSubject.chapters.map(c => c.name)}
        />
      )}
    </div>
  );
};
