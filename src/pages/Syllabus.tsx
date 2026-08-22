import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TiltWrapper } from "@/components/TiltWrapper";
import {
  BrainCircuit,
  Target,
  BookOpen,
  AlertTriangle,
  Clock,
  PlayCircle,
  X,
  TrendingDown,
} from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { TourStep, useTour } from "@/components/TourGuide";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function Syllabus() {
  const {
    syllabus,
    isLoaded,
    todos,
    practiceSessions,
    pendingTasks,
    backlogPriorities,
    setBacklogPriorities,
    ongoingChapters,
    setOngoingChapters,
    history,
    loggedTasksToday,
  } = useAppContext();
  const [activeSubject, setActiveSubject] = useState<
    "Physics" | "Chemistry" | "Mathematics"
  >("Physics");
  const [selectedChapterDetail, setSelectedChapterDetail] = useState<any>(null);
  const [showBacklogs, setShowBacklogs] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<
    "All" | "Must-Do" | "Review"
  >("All");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");

  const { activeStep, setActiveStep, hasCompleted } = useTour();

  useEffect(() => {
    if (isLoaded && !hasCompleted("syllabus-tracker") && activeStep === null) {
      setTimeout(() => setActiveStep("syllabus-tracker"), 500);
    }
  }, [isLoaded, hasCompleted, activeStep, setActiveStep]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "green":
        return "bg-emerald-500/20 border-emerald-500/50 dark:text-emerald-400 text-emerald-700";
      case "yellow":
        return "bg-amber-500/20 border-amber-500/50 dark:text-amber-400 text-amber-700";
      case "red":
        return "bg-red-500/20 border-red-500/50 dark:text-red-400 text-red-700";
      default:
        return "dark:bg-slate-800 bg-slate-100 dark:border-slate-700 border-slate-300 dark:text-slate-400 text-slate-600";
    }
  };

  const getProgressColor = (status: string) => {
    switch (status) {
      case "green":
        return "bg-emerald-500";
      case "yellow":
        return "bg-amber-500";
      case "red":
        return "bg-red-500";
      default:
        return "bg-slate-500";
    }
  };

  const allChapters = useMemo(
    () =>
      Object.entries(syllabus).flatMap(([subject, chapters]) =>
        (chapters as any[]).map((c) => ({ ...c, subject })),
      ),
    [syllabus],
  );

  const getLectureStats = (chapter: any) => {
    if (chapter.lectures === 100) {
      return { display: "100%", percentage: 100 };
    }
    const maxLec = Math.max(
      chapter.lastLectureNumber || 0,
      ...pendingTasks
        .filter(
          (t) => t.chapter === chapter.name && t.subject === chapter.subject,
        )
        .map((t) => t.lectureNumber || 0),
      ...todos
        .filter(
          (t) => t.chapter === chapter.name && t.subject === chapter.subject,
        )
        .map((t) => t.lectureNumber || 0),
    );

    if (maxLec > 0) {
      return {
        display: `${chapter.lastLectureNumber || 0}/${maxLec}`,
        percentage: ((chapter.lastLectureNumber || 0) / maxLec) * 100,
      };
    }
    return {
      display: `${chapter.lectures}%`,
      percentage: chapter.lectures,
    };
  };

  const allBacklogs = useMemo(
    () =>
      [
        ...pendingTasks,
        ...todos.filter(
          (t) =>
            !t.completed &&
            new Date(t.id).getTime() < new Date().setHours(0, 0, 0, 0),
        ),
      ].sort((a, b) => {
        const aPriority = backlogPriorities[a.id] === "Must-Do" ? 1 : 0;
        const bPriority = backlogPriorities[b.id] === "Must-Do" ? 1 : 0;
        return bPriority - aPriority;
      }),
    [pendingTasks, todos, backlogPriorities],
  );

  const totalBacklogTasks = allBacklogs.length;

  const forecastData = useMemo(() => {
    if (totalBacklogTasks === 0) return [];
    const data = [];
    let currentTasks = totalBacklogTasks;
    let day = 0;
    while (currentTasks > 0 && day <= 30) {
      data.push({
        time: day === 0 ? "Now" : `Day ${day}`,
        Tasks: currentTasks,
      });
      day += 1;
      currentTasks = Math.max(0, currentTasks - 2); // 2 tasks daily
    }
    if (data[data.length - 1].Tasks !== 0) {
      data.push({ time: `Target`, Tasks: 0 });
    }
    return data;
  }, [totalBacklogTasks]);

  // Find weak chapters (accuracy < 50% and tier S or A)
  const weakChapters = useMemo(
    () =>
      allChapters.filter(
        (c) =>
          c.accuracy < 50 &&
          (c.tier === "S" || c.tier === "A") &&
          c.status !== "gray",
      ),
    [allChapters],
  );
  const focusMessage =
    weakChapters.length > 0
      ? `Your accuracy in ${weakChapters
          .slice(0, 2)
          .map(
            (c) =>
              `<strong class="dark:text-white text-slate-900">${c.name}</strong>`,
          )
          .join(
            " and ",
          )} is currently below 50%. Since these are high-weightage topics, dedicating extra review time here will yield significant improvements in your overall score.`
      : `You are doing great! Keep practicing high-weightage topics to maintain your momentum.`;

  const filteredBacklogs = useMemo(() => {
    return allBacklogs.filter((task) => {
      const pFilterMatch =
        priorityFilter === "All" ||
        (backlogPriorities[task.id] || "Review") === priorityFilter;
      const cFilterMatch =
        categoryFilter === "All" ||
        (["Physics", "Chemistry", "Mathematics"].includes(categoryFilter) &&
          task.subject === categoryFilter) ||
        (["Lecture", "DPP"].includes(categoryFilter) &&
          task.type === categoryFilter);
      return pFilterMatch && cFilterMatch;
    });
  }, [allBacklogs, priorityFilter, categoryFilter, backlogPriorities]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.9 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: "spring" as any, stiffness: 120, damping: 10 },
    },
  };

  return (
    <div className="space-y-8 pb-12">
      <motion.header
        variants={itemVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-50px" }}
      >
        <h1 className="text-4xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-orange-500">
          SYLLABUS & INTEL
        </h1>
        <p className="dark:text-red-400 text-red-700 font-mono text-sm mt-1 flex items-center gap-2">
          <BrainCircuit className="w-4 h-4" />
          CHAPTER-LEVEL INTELLIGENCE SYSTEM
        </p>
      </motion.header>

      <motion.div
        variants={itemVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-50px" }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* AI Priority Warning */}
        <TiltWrapper tiltAmount={4} className="lg:col-span-2">
          <Card className="border-amber-500/50 bg-amber-500/10 shadow-md hover:-translate-y-1 hover:shadow-md transition-all duration-300">
            <CardContent className="p-6 flex items-start gap-4">
              <AlertTriangle className="w-8 h-8 dark:text-amber-400 text-amber-700 shrink-0" />
              <div>
                <h3 className="text-lg font-bold dark:text-amber-400 text-amber-700 uppercase tracking-wider">
                  Priority Focus Areas
                </h3>
                <p
                  className="dark:text-slate-300 text-slate-600 mt-1"
                  dangerouslySetInnerHTML={{ __html: focusMessage }}
                />
              </div>
            </CardContent>
          </Card>
        </TiltWrapper>

        {/* Backlog Tracker */}
        <Card
          onClick={() => setShowBacklogs(true)}
          className="border-orange-500/30 bg-orange-500/5 hover:-translate-y-1 hover:shadow-md transition-all duration-300 cursor-pointer overflow-hidden lg:col-span-1"
        >
          <CardContent className="p-6 flex flex-col justify-center h-full">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold dark:text-orange-400 text-orange-600 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Pending Backlogs
              </h3>
              <span className="text-2xl font-black font-mono dark:text-white text-slate-900">
                {totalBacklogTasks}
              </span>
            </div>
            <p className="text-xs dark:text-slate-400 text-slate-600 mb-4">
              AI Recovery Target:{" "}
              <strong className="dark:text-orange-400 text-orange-600">
                2 tasks daily
              </strong>{" "}
              to clear before mock season.
            </p>
            <div className="h-2 dark:bg-black bg-slate-50 rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-orange-500 transition-all duration-1000"
                style={{
                  width: `${Math.min(100, (totalBacklogTasks / 50) * 100)}%`,
                }}
              />
            </div>
            <div className="text-center mt-2">
              <span className="text-[10px] text-orange-500/70 font-bold uppercase tracking-widest bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20">
                Open Backlog HQ ⬈
              </span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Subject Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {(["Physics", "Chemistry", "Mathematics"] as const).map((subject) => (
          <button
            key={subject}
            onClick={() => setActiveSubject(subject)}
            className={`px-6 py-3 rounded-lg font-bold tracking-wider transition-all whitespace-nowrap ${
              activeSubject === subject
                ? "bg-slate-100 text-slate-900 shadow-md"
                : "dark:bg-black bg-slate-50 dark:text-slate-400 text-slate-600 border dark:border-white/10 border-black/10 hover:bg-white"
            }`}
          >
            {subject.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Chapter Heatmap */}
      <TourStep
        id="syllabus-tracker"
        title="Syllabus Heatmap"
        description="This is where you track your mastery of each subject. The color coding (Gray -> Red -> Yellow -> Green) shows your proficiency. Aim for Green!"
        position="top"
      >
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {syllabus[activeSubject].map((chapter, idx) => (
            <motion.div
              key={chapter.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(idx * 0.05, 0.5) }}
            >
              <Card
                className={`border ${getStatusColor(chapter.status)} overflow-hidden relative h-full flex flex-col transition-all duration-300 cursor-pointer hover:shadow-md hover:-translate-y-1`}
                onClick={() => setSelectedChapterDetail(chapter)}
              >
                {chapter.status === "red" && (
                  <div className="absolute -top-10 -right-10 w-48 h-48 bg-red-500/10 rounded-full blur-[60px] pointer-events-none" />
                )}
                <CardContent className="p-6 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-xl font-bold dark:text-slate-100 text-slate-900">
                        {chapter.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded ${
                            chapter.tier === "S"
                              ? "bg-red-500/20 dark:text-red-400 text-red-700 border border-red-500/50"
                              : chapter.tier === "A"
                                ? "bg-orange-500/20 dark:text-orange-400 text-orange-600 border border-orange-500/50"
                                : chapter.tier === "B"
                                  ? "bg-blue-500/20 dark:text-blue-400 text-blue-700 border border-blue-500/50"
                                  : "bg-slate-500/20 dark:text-slate-400 text-slate-600 border border-slate-500/50"
                          }`}
                        >
                          TIER {chapter.tier}
                        </span>
                        <span className="text-xs dark:text-slate-400 text-slate-600 font-mono">
                          LVL {chapter.mastery}
                        </span>
                        {ongoingChapters[activeSubject] === chapter.name && (
                          <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse flex-shrink-0">
                            Ongoing
                          </span>
                        )}
                      </div>
                    </div>
                    <span
                      className={`text-xs font-mono px-2 py-1 rounded border ${getStatusColor(chapter.status)}`}
                    >
                      {chapter.confidence.toUpperCase()}
                    </span>
                  </div>

                  <div className="space-y-5 flex-1">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="dark:text-slate-400 text-slate-600 flex items-center gap-2">
                          <Target className="w-4 h-4" /> Accuracy
                        </span>
                        <span className="font-mono font-bold">
                          {chapter.accuracy}%
                        </span>
                      </div>
                      <div className="h-2 dark:bg-black bg-slate-50 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${getProgressColor(chapter.status)}`}
                          style={{ width: `${chapter.accuracy}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="dark:text-slate-400 text-slate-600 flex items-center gap-2">
                          <BookOpen className="w-4 h-4" /> PYQ Completion
                        </span>
                        <span className="font-mono font-bold">
                          {chapter.pyq}%
                        </span>
                      </div>
                      <div className="h-2 dark:bg-black bg-slate-50 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${getProgressColor(chapter.status)}`}
                          style={{ width: `${chapter.pyq}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="dark:text-slate-400 text-slate-600 flex items-center gap-2">
                          <PlayCircle className="w-4 h-4" /> Lectures
                        </span>
                        <span className="font-mono font-bold">
                          {getLectureStats(chapter).display}
                        </span>
                      </div>
                      <div className="h-2 dark:bg-black bg-slate-50 rounded-full overflow-hidden flex">
                        <div
                          className="h-full bg-blue-500 transition-all duration-500"
                          style={{
                            width: `${getLectureStats(chapter).percentage}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </TourStep>

      <AnimatePresence>
        {selectedChapterDetail && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 dark:bg-black bg-slate-50 flex items-center justify-center p-4"
            onClick={() => setSelectedChapterDetail(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="dark:bg-slate-900 bg-white border dark:border-slate-700 border-slate-300 w-full max-w-lg rounded-xl overflow-hidden shadow-lg relative"
            >
              <button
                onClick={() => setSelectedChapterDetail(null)}
                className="absolute top-4 right-4 dark:text-slate-400 text-slate-600 hover:dark:text-white text-slate-900"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="p-6 border-b dark:border-slate-800 border-slate-200">
                <h2 className="text-2xl font-black dark:text-white text-slate-900 pr-8">
                  {selectedChapterDetail.name}
                </h2>
                <div className="flex gap-2 mt-2">
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded ${
                      selectedChapterDetail.tier === "S"
                        ? "bg-red-500/20 dark:text-red-400 text-red-700 border border-red-500/50"
                        : selectedChapterDetail.tier === "A"
                          ? "bg-orange-500/20 dark:text-orange-400 text-orange-600 border border-orange-500/50"
                          : selectedChapterDetail.tier === "B"
                            ? "bg-blue-500/20 dark:text-blue-400 text-blue-700 border border-blue-500/50"
                            : "bg-slate-500/20 dark:text-slate-400 text-slate-600 border border-slate-500/50"
                    }`}
                  >
                    TIER {selectedChapterDetail.tier}
                  </span>
                  <span
                    className={`text-xs font-mono px-2 py-0.5 rounded border ${getStatusColor(selectedChapterDetail.status)}`}
                  >
                    {selectedChapterDetail.confidence.toUpperCase()}
                  </span>
                  {(() => {
                    const isOngoing =
                      ongoingChapters[activeSubject] ===
                      selectedChapterDetail.name;
                    return (
                      <button
                        onClick={() => {
                          setOngoingChapters((prev) => ({
                            ...prev,
                            [activeSubject]: isOngoing
                              ? ""
                              : selectedChapterDetail.name,
                          }));
                        }}
                        className={`text-xs font-bold px-2.5 py-0.5 rounded transition-all flex items-center gap-1 ${
                          isOngoing
                            ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/50"
                            : "dark:bg-slate-800 bg-slate-100 border dark:border-slate-700 border-slate-300 dark:text-slate-400 text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700"
                        }`}
                      >
                        {isOngoing
                          ? "✓ Currently Going On"
                          : "Mark as Currently Going On"}
                      </button>
                    );
                  })()}
                </div>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-bold dark:text-slate-400 text-slate-600 uppercase tracking-wider mb-4 border-b dark:border-slate-800 border-slate-200 pb-2">
                    Mastery Checklist
                  </h3>
                  <div className="space-y-3 font-mono text-sm">
                    {(() => {
                      const allTasksForChapter = [
                        ...todos,
                        ...pendingTasks,
                        ...history.flatMap((h) => h.completedTasks || []),
                        ...loggedTasksToday,
                      ].filter((t) => t.chapter === selectedChapterDetail.name);
                      const lectureTasks = allTasksForChapter.filter(
                        (t) => t.type === "Lecture" || t.type === "Theory",
                      );
                      const maxLec = Math.max(
                        0,
                        selectedChapterDetail.lastLectureNumber || 0,
                        ...lectureTasks.map((t) => t.lectureNumber || 0),
                      );
                      const totalLectures = maxLec;
                      const completedLectures =
                        selectedChapterDetail.lastLectureNumber || 0;
                      const lectureBacklogs = pendingTasks.filter(
                        (t) =>
                          t.chapter === selectedChapterDetail.name &&
                          (t.type === "Lecture" || t.type === "Theory"),
                      ).length;
                      const dppTodos = [...todos, ...pendingTasks].filter(
                        (t) =>
                          t.chapter === selectedChapterDetail.name &&
                          (t.type === "DPP" ||
                            (t.text && t.text.toLowerCase().includes("dpp"))),
                      );
                      const dppCompleted = [
                        ...history.flatMap((h) => h.completedTasks || []),
                        ...loggedTasksToday,
                      ].filter(
                        (t) =>
                          t.chapter === selectedChapterDetail.name &&
                          (t.type === "DPP" ||
                            (t.text && t.text.toLowerCase().includes("dpp"))),
                      );
                      const totalDPPs = new Set([
                        ...dppTodos.map((t) => t.id),
                        ...dppCompleted.map((t) => t.id),
                      ]).size;
                      const completedDPPs = new Set(
                        dppCompleted.map((t) => t.id),
                      ).size;
                      const dppBacklogs = pendingTasks.filter(
                        (t) =>
                          t.chapter === selectedChapterDetail.name &&
                          (t.type === "DPP" ||
                            (t.text && t.text.toLowerCase().includes("dpp"))),
                      ).length;

                      const chapterSessions = practiceSessions.filter(
                        (ps) => ps.chapter === selectedChapterDetail.name,
                      );
                      const completedPYQs = chapterSessions.reduce(
                        (sum, ps) => sum + ps.attempted,
                        0,
                      );
                      const totalCorrect = chapterSessions.reduce(
                        (sum, ps) => sum + ps.correct,
                        0,
                      );
                      const realAccuracy =
                        completedPYQs > 0
                          ? Math.round((totalCorrect / completedPYQs) * 100)
                          : 0;

                      return (
                        <>
                          <div className="flex justify-between items-center">
                            <span className="dark:text-slate-300 text-slate-600">
                              Lectures
                            </span>
                            <span
                              className={
                                completedLectures >= totalLectures &&
                                totalLectures > 0
                                  ? "dark:text-emerald-400 text-emerald-700"
                                  : "dark:text-amber-400 text-amber-700"
                              }
                            >
                              {completedLectures}/
                              {totalLectures > 0 ? totalLectures : "0"}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="dark:text-slate-300 text-slate-600">
                              DPPs
                            </span>
                            <span
                              className={
                                completedDPPs >= totalDPPs && totalDPPs > 0
                                  ? "dark:text-emerald-400 text-emerald-700"
                                  : "dark:text-amber-400 text-amber-700"
                              }
                            >
                              {completedDPPs}/{totalDPPs > 0 ? totalDPPs : "0"}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="dark:text-slate-300 text-slate-600">
                              PYQs Completed
                            </span>
                            <span
                              className={
                                completedPYQs > 0
                                  ? "dark:text-emerald-400 text-emerald-700"
                                  : "dark:text-amber-400 text-amber-700"
                              }
                            >
                              {completedPYQs} Qs
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="dark:text-slate-300 text-slate-600">
                              Accuracy
                            </span>
                            <span
                              className={
                                realAccuracy > 70
                                  ? "dark:text-emerald-400 text-emerald-700"
                                  : "dark:text-amber-400 text-amber-700"
                              }
                            >
                              {realAccuracy}%
                            </span>
                          </div>
                          <div className="flex justify-between items-start mt-2 pt-2 border-t dark:border-slate-800 border-slate-200/50">
                            <span className="dark:text-slate-300 text-slate-600">
                              Active Backlogs
                            </span>
                            <div className="flex flex-col items-end gap-1 text-xs">
                              {lectureBacklogs === 0 && dppBacklogs === 0 ? (
                                <span className="dark:text-emerald-400 text-emerald-700">
                                  None
                                </span>
                              ) : (
                                <>
                                  {lectureBacklogs > 0 && (
                                    <span className="dark:text-rose-400 text-rose-700">
                                      {lectureBacklogs} Lectures pending
                                    </span>
                                  )}
                                  {dppBacklogs > 0 && (
                                    <span className="dark:text-rose-400 text-rose-700">
                                      {dppBacklogs} DPPs pending
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showBacklogs && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center sm:p-6 dark:bg-black bg-slate-50 "
            onClick={() => setShowBacklogs(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="dark:bg-slate-900 bg-white border border-orange-500/30 sm:rounded-2xl p-4 sm:p-6 lg:p-8 w-full sm:max-w-4xl h-full sm:h-auto max-h-screen sm:max-h-[85vh] overflow-y-auto custom-scrollbar shadow-lg relative flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowBacklogs(false)}
                className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 dark:bg-black bg-slate-50 dark:text-slate-400 text-slate-600 hover:dark:text-white text-slate-900 rounded-full transition-colors z-10"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>

              <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8 mt-2 sm:mt-0 pr-12">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-orange-500/20 flex shrink-0 items-center justify-center border border-orange-500/30">
                  <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 dark:text-orange-400 text-orange-600" />
                </div>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black dark:text-white text-slate-900 uppercase tracking-wider">
                    Backlog HQ
                  </h2>
                  <p className="text-sm sm:text-base dark:text-orange-400 text-orange-600 font-mono">
                    Total Pending: {totalBacklogTasks} Tasks
                  </p>
                </div>
              </div>

              {forecastData.length > 0 && (
                <div className="mb-8 dark:bg-slate-900 bg-white border dark:border-slate-800 border-slate-200 rounded-xl p-6 sm:p-8 shadow-xl">
                  <h4 className="text-sm font-bold dark:text-slate-300 text-slate-600 uppercase tracking-wider mb-6 flex items-center gap-2">
                    <TrendingDown className="w-5 h-5 dark:text-orange-400 text-orange-600" />
                    Recovery Forecast
                  </h4>
                  <div className="h-40 sm:h-48 w-full">
                    <ResponsiveContainer width="99%" height="100%">
                      <LineChart
                        data={forecastData}
                        margin={{ top: 10, right: 30, left: -20, bottom: 0 }}
                      >
                        <XAxis
                          dataKey="time"
                          stroke="#475569"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          stroke="#475569"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          domain={[0, "dataMax + 2"]}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "rgba(15,23,42,0.95)",
                            border: "1px solid rgba(249,115,22,0.4)",
                            borderRadius: "8px",
                          }}
                          itemStyle={{ color: "#f97316", fontWeight: "bold" }}
                        />
                        <Line
                          type="monotone"
                          dataKey="Tasks"
                          stroke="#f97316"
                          strokeWidth={3}
                          dot={{ r: 4, fill: "#f97316", strokeWidth: 2 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-sm dark:text-slate-400 text-slate-600 text-center mt-6 font-mono">
                    Projected clear time at 2 tasks/day:{" "}
                    <strong className="dark:text-emerald-400 text-emerald-700">
                      {Math.ceil(totalBacklogTasks / 2)} days
                    </strong>
                  </p>
                </div>
              )}

              <div className="dark:bg-slate-900 bg-white border dark:border-slate-800 border-slate-200 rounded-xl p-6 sm:p-8 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                  <h4 className="text-sm font-bold dark:text-slate-300 text-slate-600 uppercase tracking-wider">
                    Priority Task Queue
                  </h4>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="flex dark:bg-black bg-slate-50 border dark:border-slate-700 border-slate-300 rounded-lg p-1 overflow-x-auto custom-scrollbar">
                      {[
                        "All",
                        "Physics",
                        "Mathematics",
                        "Chemistry",
                        "Lecture",
                        "DPP",
                      ].map((filter) => (
                        <button
                          key={filter}
                          onClick={() => setCategoryFilter(filter)}
                          className={`shrink-0 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${
                            categoryFilter === filter
                              ? "bg-blue-500 dark:text-white text-slate-900 shadow-md"
                              : "dark:text-slate-400 text-slate-600 hover:dark:text-slate-200 text-slate-900 hover:dark:bg-slate-800 bg-slate-100"
                          }`}
                        >
                          {filter}
                        </button>
                      ))}
                    </div>
                    <div className="flex dark:bg-black bg-slate-50 border dark:border-slate-700 border-slate-300 rounded-lg p-1">
                      {["All", "Must-Do", "Review"].map((filter) => (
                        <button
                          key={filter}
                          onClick={() =>
                            setPriorityFilter(
                              filter as "All" | "Must-Do" | "Review",
                            )
                          }
                          className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${
                            priorityFilter === filter
                              ? "bg-orange-500 dark:text-white text-slate-900 shadow-md"
                              : "dark:text-slate-400 text-slate-600 hover:dark:text-slate-200 text-slate-900 hover:dark:bg-slate-800 bg-slate-100"
                          }`}
                        >
                          {filter}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {allBacklogs.length === 0 ? (
                  <div className="text-center py-12 dark:bg-black bg-slate-50 rounded-lg border border-orange-500/10 border-dashed">
                    <Target className="w-12 h-12 dark:text-emerald-400 text-emerald-700/50 mx-auto mb-3" />
                    <p className="text-lg dark:text-emerald-400 text-emerald-700 font-bold">
                      You are completely caught up!
                    </p>
                    <p className="text-sm dark:text-slate-400 text-slate-600 mt-1">
                      No pending tasks or weak topics found.
                    </p>
                  </div>
                ) : filteredBacklogs.length === 0 ? (
                  <div className="text-center py-12 dark:bg-black bg-slate-50 rounded-lg border dark:border-slate-700 border-slate-300 border-dashed">
                    <p className="dark:text-slate-400 text-slate-600 font-bold">
                      No tasks match the selected filters.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredBacklogs.map((task) => {
                      const priority = backlogPriorities[task.id] || "Review";
                      const isMustDo = priority === "Must-Do";

                      const chapter = allChapters.find(
                        (c) =>
                          c.name === task.chapter && c.subject === task.subject,
                      );
                      const stats = chapter ? getLectureStats(chapter) : null;

                      return (
                        <div
                          key={task.id}
                          className={`group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition-all ${isMustDo ? "bg-yellow-950/20 border-yellow-500/60 shadow-md hover:border-yellow-400/80 hover:bg-yellow-900/30" : "dark:bg-slate-900/50 bg-white dark:border-slate-700 border-slate-300/50 hover:border-slate-600"}`}
                        >
                          <div className="flex-1 pr-4 mb-3 sm:mb-0 relative">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-blue-500/20 dark:text-blue-300 dark:text-blue-400 text-blue-700 rounded border border-blue-500/30 uppercase tracking-widest">
                                {task.type}
                              </span>
                              {task.subject && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 dark:bg-slate-800 bg-slate-100 dark:text-slate-300 text-slate-600 rounded uppercase tracking-widest">
                                  {task.subject}
                                </span>
                              )}
                              {isMustDo && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-yellow-500/20 dark:text-yellow-300 dark:text-yellow-400 text-yellow-700 rounded border border-yellow-500/30">
                                  MUST-DO
                                </span>
                              )}
                            </div>
                            <p className="text-base font-bold dark:text-slate-200 text-slate-900">
                              {task.text}
                            </p>
                            <div className="flex items-center gap-4 mt-2">
                              {stats && (
                                <span className="text-xs dark:text-slate-400 text-slate-600 flex items-center gap-1">
                                  <BookOpen className="w-3 h-3" /> Progress:{" "}
                                  {stats.display}
                                </span>
                              )}
                              {chapter && (
                                <span className="text-xs dark:text-slate-400 text-slate-600 flex items-center gap-1">
                                  <Target className="w-3 h-3" />{" "}
                                  {chapter.accuracy}% Acc
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setBacklogPriorities((prev) => ({
                                ...prev,
                                [String(task.id)]: isMustDo ? ("Review" as const) : ("Must-Do" as const),
                              }));
                            }}
                            className={`shrink-0 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                              isMustDo
                                ? "bg-yellow-600/30 hover:bg-yellow-500/50 text-yellow-100 border border-yellow-500/50 shadow-md hover:-translate-y-0.5"
                                : "dark:bg-slate-800 bg-slate-100 dark:text-slate-300 text-slate-600 border dark:border-slate-700 border-slate-300 hover:bg-slate-700 hover:dark:text-white text-slate-900 hover:border-slate-500"
                            }`}
                          >
                            {isMustDo ? "Mark as Review" : "Set to Must-Do"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
