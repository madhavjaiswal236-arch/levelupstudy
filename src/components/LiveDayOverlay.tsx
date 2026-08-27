import React, { useMemo } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import {
  X,
  Target,
  Zap,
  Clock,
  BrainCircuit,
  Play,
  CheckCircle2,
  ListTodo,
  Plus,
} from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { generateDeterministicCoachReport } from "@/lib/coach/engine";

interface LiveDayOverlayProps {
  onClose: () => void;
}

export function LiveDayOverlay({ onClose }: LiveDayOverlayProps) {
  const {
    xpGainedToday,
    hoursStudiedToday,
    questionsSolved,
    todos,
    setTodos,
    loggedTasksToday,
    dailyTarget,
    playerName,
    lifeMetrics,
    xp,
    class11EndDate,
    practiceSessions,
    level,
    streakDays,
    history,
    syllabus,
    accuracy,
  } = useAppContext();

  const class11EndTimestamp = class11EndDate
    ? new Date(class11EndDate).getTime()
    : 0;
  const daysUntilExam = Math.max(
    1,
    Math.ceil((class11EndTimestamp - Date.now()) / (1000 * 3600 * 24)),
  );
  const totalXpRequired = 800000 - xp;
  const dailyXpRequired = class11EndDate
    ? Math.max(100, Math.ceil(totalXpRequired / daysUntilExam))
    : dailyTarget;

  // Combine all activities of the day
  const timelineEvents = useMemo(() => {
    const events: any[] = [];

    // Created tasks today
    todos.forEach((t) => {
      const taskDate = new Date(t.id);
      if (taskDate.toDateString() === new Date().toDateString()) {
        events.push({
          time: taskDate,
          type: "created",
          title: t.text,
          subject: t.subject,
          icon: ListTodo,
          color: "dark:text-blue-400 text-blue-700",
        });
      }
    });

    // Logged sessions today
    loggedTasksToday.forEach((log) => {
      events.push({
        time: new Date(log.id),
        type: "completed",
        title: log.text || `${log.subject} - ${log.chapter} (${log.type})`,
        subject: log.subject,
        icon: CheckCircle2,
        color: "dark:text-emerald-400 text-emerald-700",
        xp: log.xpReward,
      });
    });

    events.sort((a, b) => b.time.getTime() - a.time.getTime()); // newest first
    return events;
  }, [todos, loggedTasksToday]);

  const pendingToday = useMemo(
    () =>
      todos.filter(
        (t) =>
          !t.completed &&
          new Date(t.id).toDateString() === new Date().toDateString(),
      ),
    [todos],
  );

  // AI Coach Analysis logic (Canonical Engine)
  const todayMetric = lifeMetrics.find(
    (m) => m.day === new Date().getDate(),
  ) || { sleep: 0, screenTime: 0 };
  const sleep = todayMetric.sleep;
  const screen = todayMetric.screenTime;

  const coachReport = useMemo(() => {
    return generateDeterministicCoachReport({
      hours: hoursStudiedToday,
      sleep,
      screenTime: screen,
      completedTasks: todos.filter((t) => t.completed),
      plannedTasks: todos,
      practiceSessions,
      xpEarned: xpGainedToday,
      targetXp: dailyXpRequired,
      level,
      streakDays,
      history,
      syllabus,
      accuracy,
      loggedTasksToday,
    });
  }, [
    hoursStudiedToday,
    sleep,
    screen,
    todos,
    practiceSessions,
    xpGainedToday,
    dailyXpRequired,
    level,
    streakDays,
    history,
    syllabus,
    accuracy,
    loggedTasksToday,
  ]);

  const severityScore = coachReport.explanation.severity.overall;
  let mentorHeading = "";
  if (severityScore <= 2)
    mentorHeading = "DOMINATION. BUT THE WAR ISN'T OVER.";
  else if (severityScore <= 4)
    mentorHeading = "STEADY. DON'T CONFUSE MOTION WITH PROGRESS.";
  else if (severityScore <= 6)
    mentorHeading = "YOU'RE BLEEDING THE DAY. WAKE UP.";
  else if (severityScore <= 8)
    mentorHeading = "SELF-SABOTAGE IN PROGRESS.";
  else mentorHeading = "YOU SURRENDERED. PROVE YOU'RE NOT DONE.";

  if (typeof document === "undefined") return null;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[10000] dark:bg-black/80 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 md:p-8 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 20, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 20, opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-5xl relative dark:bg-[#0a0f16] bg-white border border-cyan-500/30 rounded-3xl shadow-2xl flex flex-col max-h-[95vh] md:max-h-[90vh] my-auto"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 md:top-6 md:right-6 p-2 dark:bg-slate-800 bg-slate-100/50 hover:bg-slate-700 dark:text-slate-400 text-slate-600 hover:text-white rounded-full transition-all border dark:border-slate-700 border-slate-300/50 z-20"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="overflow-y-auto custom-scrollbar p-6 md:p-10 relative z-10 w-full h-full">
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", bounce: 0.4, delay: 0.1 }}
            className="text-left mb-8 relative flex items-center gap-6 border-b dark:border-slate-800 border-slate-200 pb-6"
          >
            <div className="absolute top-1/2 left-0 -translate-y-1/2 w-36 h-36 bg-cyan-500/10 rounded-full blur-[50px] pointer-events-none" />
            <div className="inline-flex items-center justify-center p-3 rounded-2xl dark:bg-slate-900 bg-white border border-cyan-500/30 shadow-md shrink-0">
              <Zap className="w-8 h-8 dark:text-cyan-400 text-cyan-700" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black dark:text-white text-slate-900 uppercase tracking-widest mb-1">
                Live Day{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                  Telemetry
                </span>
              </h1>
              <p className="dark:text-slate-400 text-slate-600 text-sm uppercase tracking-wider font-bold">
                Real-time performance analysis
              </p>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* XP Box */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="dark:bg-slate-900/80 bg-white border dark:border-slate-700 border-slate-300/50 rounded-2xl p-6 relative overflow-hidden flex flex-col items-center justify-center text-center"
            >
              <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-blue-500" />
              <Target className="w-8 h-8 dark:text-cyan-400 text-cyan-700 mb-3 opacity-80" />
              <p className="text-sm dark:text-slate-400 text-slate-600 font-bold uppercase tracking-widest mb-1">
                XP Harvested
              </p>
              <h2 className="text-4xl font-black dark:text-white text-slate-900 drop-shadow-md">
                {Math.floor(xpGainedToday).toLocaleString()}
              </h2>
            </motion.div>

            {/* Time Box */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="dark:bg-slate-900/80 bg-white border dark:border-slate-700 border-slate-300/50 rounded-2xl p-6 relative overflow-hidden flex flex-col items-center justify-center text-center"
            >
              <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500" />
              <Clock className="w-8 h-8 dark:text-purple-400 text-purple-700 mb-3 opacity-80" />
              <p className="text-sm dark:text-slate-400 text-slate-600 font-bold uppercase tracking-widest mb-1">
                Time on Target
              </p>
              <h2 className="text-4xl font-black dark:text-white text-slate-900 drop-shadow-md">
                {hoursStudiedToday.toFixed(1)}
                <span className="text-xl text-slate-500 ml-1">hrs</span>
              </h2>
            </motion.div>

            {/* Tasks Box */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="dark:bg-slate-900/80 bg-white border dark:border-slate-700 border-slate-300/50 rounded-2xl p-6 relative overflow-hidden flex flex-col items-center justify-center text-center"
            >
              <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-green-500" />
              <CheckCircle2 className="w-8 h-8 dark:text-emerald-400 text-emerald-700 mb-3 opacity-80" />
              <p className="text-sm dark:text-slate-400 text-slate-600 font-bold uppercase tracking-widest mb-1">
                Objectives Cleared
              </p>
              <h2 className="text-4xl font-black dark:text-white text-slate-900 drop-shadow-md">
                {loggedTasksToday.length}
              </h2>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Mentor Analysis */}
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="bg-gradient-to-b from-blue-950/40 to-slate-900/80 border border-blue-500/30 rounded-3xl p-6 md:p-8 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-[90px] -translate-y-1/3 translate-x-1/4 pointer-events-none" />

              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-blue-900/50 border border-blue-500/50 flex items-center justify-center">
                  <BrainCircuit className="w-6 h-6 dark:text-blue-400 text-blue-700" />
                </div>
                <div>
                  <h3 className="text-sm font-bold dark:text-blue-400 text-blue-700 uppercase tracking-widest">
                    Mentor Review
                  </h3>
                  <p className="text-xl font-black dark:text-white text-slate-900 tracking-wide">
                    {mentorHeading}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <p className="dark:text-slate-400 text-slate-600 text-xs font-mono bg-slate-950/50 p-2 rounded-lg border dark:border-slate-800 border-slate-200">
                  {coachReport.rawReport}
                </p>
                <p className="dark:text-slate-300 text-slate-600 text-base leading-relaxed font-medium">
                  {coachReport.diagnosis}
                </p>
                <div className="dark:bg-slate-900/50 bg-white p-3 rounded-lg border dark:border-slate-800 border-slate-200/50">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">
                    Verdict
                  </span>
                  <p className="dark:text-slate-200 text-slate-900 text-sm font-medium">
                    {coachReport.verdict}
                  </p>
                </div>
                <div className="bg-blue-950/30 p-4 rounded-lg border border-blue-900/50 mt-4 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors" />
                  <span className="text-xs font-bold dark:text-blue-400 text-blue-700 uppercase tracking-widest block mb-2 relative z-10 flex items-center gap-2">
                    <Target className="w-4 h-4" /> Tactical Correction
                  </span>
                  <p className="text-blue-100 text-sm font-medium mb-3 relative z-10">
                    {coachReport.todayMission}
                  </p>
                  <button
                    onClick={() => {
                      setTodos((prev) => [
                        ...prev,
                        {
                          id: Date.now(),
                          text: `Tactical Mission: ${coachReport.todayMission}`,
                          completed: false,
                          xpReward: 150,
                          type: "Practice",
                          priority: "High",
                        },
                      ]);
                      onClose();
                    }}
                    className="relative z-10 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Accept as Task (+150 XP)
                  </button>
                </div>
                <p className="dark:text-cyan-400 text-cyan-700 font-bold text-lg uppercase tracking-widest mt-6">
                  "{coachReport.closing}"
                </p>
              </div>

              {pendingToday.length > 0 && (
                <div className="mt-8 pt-6 border-t dark:border-slate-700 border-slate-300/50">
                  <h4 className="text-sm font-bold dark:text-slate-400 text-slate-600 uppercase tracking-widest mb-4">
                    Pending Objectives
                  </h4>
                  <ul className="space-y-3">
                    {pendingToday.slice(0, 3).map((task) => (
                      <li
                        key={task.id}
                        className="flex items-start gap-3 dark:bg-slate-900/50 bg-white p-3 rounded-lg border dark:border-slate-800 border-slate-200"
                      >
                        <div className="mt-0.5 w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                        <div>
                          <p className="dark:text-slate-200 text-slate-900 font-medium text-sm leading-tight">
                            {task.text}
                          </p>
                          <p className="dark:text-orange-400 text-orange-600/80 text-xs font-bold uppercase tracking-wider mt-1">
                            {task.subject}
                          </p>
                        </div>
                      </li>
                    ))}
                    {pendingToday.length > 3 && (
                      <li className="text-center text-sm text-slate-500 font-bold">
                        +{pendingToday.length - 3} more pending
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </motion.div>

            {/* Timeline */}
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="dark:bg-slate-900/80 bg-white border dark:border-slate-700 border-slate-300/50 rounded-3xl p-6 md:p-8"
            >
              <h3 className="text-sm font-bold dark:text-slate-400 text-slate-600 uppercase tracking-widest mb-8 flex items-center gap-2">
                <Play className="w-4 h-4 dark:text-cyan-400 text-cyan-700" />{" "}
                Action Log
              </h3>

              <div className="relative pl-6 border-l dark:border-slate-800 border-slate-200 space-y-8">
                {timelineEvents.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-slate-500 italic">
                      No activity detected yet today.
                    </p>
                  </div>
                ) : (
                  timelineEvents.map((evt, idx) => {
                    const Icon = evt.icon;
                    return (
                      <div key={`idx-${idx}`} className="relative">
                        <div
                          className={`absolute -left-[35px] w-6 h-6 rounded-full dark:bg-slate-900 bg-white border-2 dark:border-slate-700 border-slate-300 flex items-center justify-center ring-4 ring-black`}
                        >
                          <Icon className={`w-3 h-3 ${evt.color}`} />
                        </div>
                        <div className="dark:bg-slate-800 bg-slate-100/50 border dark:border-slate-700 border-slate-300/50 p-4 rounded-xl">
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-xs font-bold text-slate-500">
                              {evt.time.toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            {evt.xp && (
                              <span className="text-xs font-bold dark:text-cyan-400 text-cyan-700 bg-cyan-950/50 px-2 py-0.5 rounded-full">
                                +{evt.xp} XP
                              </span>
                            )}
                          </div>
                          <p className="dark:text-slate-200 text-slate-900 font-medium">
                            {evt.title}
                          </p>
                          <p
                            className={`text-xs font-bold uppercase tracking-wider mt-2 ${evt.color}`}
                          >
                            {evt.type}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </div>

          <button
            onClick={onClose}
            className="w-full mt-6 dark:bg-slate-800 bg-slate-100 hover:bg-slate-700 text-white font-bold py-4 rounded-xl border border-slate-600 transition-all uppercase tracking-widest shrink-0"
          >
            Back to Dashboard
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  );
}
