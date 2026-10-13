import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  BrainCircuit,
  Target,
  Flame,
  CheckCircle2,
  X,
  Plus,
  Activity,
  Award,
  FileText,
  Clock,
  Zap,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Moon,
  Smartphone,
  BookOpen,
  FlaskConical,
  RefreshCw,
  ChevronRight,
  Info,
  Check,
} from "lucide-react";
import { useAppContext, Todo } from "@/context/AppContext";
import { runCoach, generateDeterministicCoachReport } from "@/lib/coach/engine";
import { adaptAppContextToCoachInput } from "@/lib/coach/adapters/appContextAdapter";
import { HAPTIC_PATTERNS, vibrate } from "@/lib/haptics";
import type { CoachReport, CoachInput, DayRecord } from "@/lib/coach/types";

interface CoachAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CoachAnalysisModal({ isOpen, onClose }: CoachAnalysisModalProps) {
  const {
    history,
    setHistory,
    lifeMetrics,
    todos,
    setTodos,
    loggedTasksToday,
    hoursStudiedToday,
    dailyTarget,
    level,
    streakDays,
    practiceSessions,
    syllabus,
    accuracy,
  } = useAppContext();

  const [activeTab, setActiveTab] = useState<"personal" | "scenarios">("personal");
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>("s1_temporary_dip");
  const [missionAdded, setMissionAdded] = useState(false);

  // Recovery input step: 1 = Take Sleep & Screen, 2 = View Coach Report
  const latestEntry = history.length > 0 ? history[history.length - 1] : null;
  const hasExistingSleep =
    latestEntry && typeof latestEntry.sleepTime === "number" && latestEntry.sleepTime > 0;

  const [step, setStep] = useState<number>(hasExistingSleep ? 2 : 1);
  const [sleepHrs, setSleepHrs] = useState<string>(
    latestEntry?.sleepTime ? Math.floor(latestEntry.sleepTime).toString() : "7",
  );
  const [sleepMins, setSleepMins] = useState<string>(
    latestEntry?.sleepTime
      ? Math.round((latestEntry.sleepTime - Math.floor(latestEntry.sleepTime)) * 60).toString()
      : "0",
  );
  const [screenHrs, setScreenHrs] = useState<string>(
    latestEntry?.screenTime ? Math.floor(latestEntry.screenTime).toString() : "3",
  );
  const [screenMins, setScreenMins] = useState<string>(
    latestEntry?.screenTime
      ? Math.round((latestEntry.screenTime - Math.floor(latestEntry.screenTime)) * 60).toString()
      : "0",
  );

  const handleSaveSleepAndScreen = (e: React.FormEvent) => {
    e.preventDefault();
    const sH = Math.min(24, Math.max(0, parseFloat(sleepHrs) || 0));
    const sM = Math.min(59, Math.max(0, parseFloat(sleepMins) || 0));
    const finalSleep = Number((sH + sM / 60).toFixed(2));

    const scH = Math.min(24, Math.max(0, parseFloat(screenHrs) || 0));
    const scM = Math.min(59, Math.max(0, parseFloat(screenMins) || 0));
    const finalScreen = Number((scH + scM / 60).toFixed(2));

    // Update history with the recorded recovery stats
    const todayStr = new Date().toISOString().split("T")[0];
    setHistory((prev) => {
      const idx = prev.findIndex((h) => h.date.startsWith(todayStr));
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = {
          ...copy[idx],
          sleepTime: finalSleep,
          screenTime: finalScreen,
        };
        return copy;
      }
      return [
        ...prev,
        {
          date: todayStr,
          hoursStudied: hoursStudiedToday || 0,
          xpEarned: 0,
          completedTasks: todos.filter((t) => t.completed),
          sleepTime: finalSleep,
          screenTime: finalScreen,
        },
      ];
    });

    vibrate(HAPTIC_PATTERNS.SUCCESS);
    setStep(2); // Reveal Coach Report after taking sleep & screen
  };

  // Compute Live Canonical Coach Report
  const personalReport: CoachReport = useMemo(() => {
    const sH = parseFloat(sleepHrs) || 7;
    const sM = parseFloat(sleepMins) || 0;
    const scH = parseFloat(screenHrs) || 3;
    const scM = parseFloat(screenMins) || 0;

    const adapted = adaptAppContextToCoachInput(
      {
        hoursStudiedToday: hoursStudiedToday || 0,
        sleepLastNight: Number((sH + sM / 60).toFixed(2)),
        screenToday: Number((scH + scM / 60).toFixed(2)),
        history,
        practiceSessions,
      },
      new Date().toISOString().split("T")[0],
    );

    return runCoach(adapted, adapted.today);
  }, [hoursStudiedToday, sleepHrs, sleepMins, screenHrs, screenMins, history, practiceSessions]);

  // Pre-configured Golden Scenarios Matrix (T01-T27)
  const scenariosList = useMemo(() => {
    // Scenario 1: Student A - Temporary Dip (5 strong days + 1 dip day)
    const s1Input: CoachInput = {
      today: "2026-10-12",
      dayType: "FULL_STUDY_DAY",
      hoursToday: 1.5,
      sleepLastNight: 7.5,
      screenToday: 2.0,
      targetSleepHours: 7.5,
      dailyHistory: [
        { date: "2026-10-06", dayType: "FULL_STUDY_DAY", hours: 6.0, sleep: 7.5, screen: 2.0, xp: 300, completedTasksCount: 4, plannedTasksCount: 4 },
        { date: "2026-10-07", dayType: "FULL_STUDY_DAY", hours: 6.0, sleep: 7.5, screen: 2.0, xp: 300, completedTasksCount: 4, plannedTasksCount: 4 },
        { date: "2026-10-08", dayType: "FULL_STUDY_DAY", hours: 6.0, sleep: 7.5, screen: 2.0, xp: 300, completedTasksCount: 4, plannedTasksCount: 4 },
        { date: "2026-10-09", dayType: "FULL_STUDY_DAY", hours: 6.0, sleep: 7.5, screen: 2.0, xp: 300, completedTasksCount: 4, plannedTasksCount: 4 },
        { date: "2026-10-10", dayType: "FULL_STUDY_DAY", hours: 6.0, sleep: 7.5, screen: 2.0, xp: 300, completedTasksCount: 4, plannedTasksCount: 4 },
        { date: "2026-10-11", dayType: "FULL_STUDY_DAY", hours: 1.5, sleep: 7.5, screen: 2.0, xp: 80, completedTasksCount: 1, plannedTasksCount: 4 },
      ],
      practiceSessions: [{ date: "2026-10-11", subject: "Physics", chapter: "Laws of Motion", attempted: 15, correct: 12, timeSpent: 45 }],
    };

    // Scenario 2: Student B - Sustained Decline (8h down to 2h over 7 days)
    const s2Input: CoachInput = {
      today: "2026-10-12",
      dayType: "FULL_STUDY_DAY",
      hoursToday: 2.0,
      sleepLastNight: 7.5,
      screenToday: 2.0,
      targetSleepHours: 7.5,
      dailyHistory: [
        { date: "2026-10-03", dayType: "FULL_STUDY_DAY", hours: 8.0, sleep: 7.5, screen: 2.0, xp: 400, completedTasksCount: 5, plannedTasksCount: 5 },
        { date: "2026-10-04", dayType: "FULL_STUDY_DAY", hours: 8.0, sleep: 7.5, screen: 2.0, xp: 400, completedTasksCount: 5, plannedTasksCount: 5 },
        { date: "2026-10-05", dayType: "FULL_STUDY_DAY", hours: 8.0, sleep: 7.5, screen: 2.0, xp: 400, completedTasksCount: 5, plannedTasksCount: 5 },
        { date: "2026-10-06", dayType: "FULL_STUDY_DAY", hours: 7.0, sleep: 7.5, screen: 2.0, xp: 350, completedTasksCount: 4, plannedTasksCount: 5 },
        { date: "2026-10-07", dayType: "FULL_STUDY_DAY", hours: 6.0, sleep: 7.5, screen: 2.0, xp: 300, completedTasksCount: 4, plannedTasksCount: 5 },
        { date: "2026-10-08", dayType: "FULL_STUDY_DAY", hours: 5.0, sleep: 7.5, screen: 2.0, xp: 250, completedTasksCount: 3, plannedTasksCount: 5 },
        { date: "2026-10-09", dayType: "FULL_STUDY_DAY", hours: 4.0, sleep: 7.5, screen: 2.0, xp: 200, completedTasksCount: 2, plannedTasksCount: 5 },
        { date: "2026-10-10", dayType: "FULL_STUDY_DAY", hours: 3.0, sleep: 7.5, screen: 2.0, xp: 150, completedTasksCount: 2, plannedTasksCount: 5 },
        { date: "2026-10-11", dayType: "FULL_STUDY_DAY", hours: 2.0, sleep: 7.5, screen: 2.0, xp: 100, completedTasksCount: 1, plannedTasksCount: 5 },
      ],
      practiceSessions: [],
    };

    // Scenario 3: Acute Sleep Deficit (9h study, 4.0h sleep -> RED tier M0 override)
    const s3Input: CoachInput = {
      today: "2026-10-12",
      dayType: "FULL_STUDY_DAY",
      hoursToday: 9.0,
      sleepLastNight: 4.0,
      screenToday: 2.0,
      targetSleepHours: 7.5,
      dailyHistory: [
        { date: "2026-10-11", dayType: "FULL_STUDY_DAY", hours: 9.0, sleep: 4.0, screen: 2.0, xp: 450, completedTasksCount: 5, plannedTasksCount: 5 },
      ],
      practiceSessions: [],
    };

    // Scenario 4: Novice Working-Memory Overload (P(L) < 0.35 -> M2 Worked Example Ladder)
    const s4Input: CoachInput = {
      today: "2026-10-12",
      dayType: "SCHOOL_DAY",
      hoursToday: 4.0,
      sleepLastNight: 7.5,
      screenToday: 2.0,
      dailyHistory: [
        { date: "2026-10-11", dayType: "SCHOOL_DAY", hours: 4.0, sleep: 7.5, screen: 2.0, xp: 200, completedTasksCount: 3, plannedTasksCount: 3 },
      ],
      practiceSessions: [{ date: "2026-10-11", subject: "Physics", chapter: "Rotational Motion", attempted: 10, correct: 3, timeSpent: 40 }],
      activeMasteries: {
        "Physics:Rotational Motion": {
          key: "Physics:Rotational Motion",
          subject: "Physics",
          chapter: "Rotational Motion",
          pL: 0.22,
          evidenceCount: 10,
          distinctDays: 1,
          halfLifeDays: 1.6,
          lastRetrievalDate: "2026-10-11",
          errorTotals: { KNOWLEDGE_DEFICIT: 5, PROCEDURAL_FLAW: 2, ATTENTIONAL_SLIP: 0, TRANSFER_FAILURE: 0 },
        },
      },
    };

    // Scenario 5: High Mastery Pyq Execution (P(L) >= 0.75, Acc >= 85% -> M10 Deliberate Stretch Set)
    const s5Input: CoachInput = {
      today: "2026-10-12",
      dayType: "FULL_STUDY_DAY",
      hoursToday: 6.0,
      sleepLastNight: 8.0,
      screenToday: 1.5,
      dailyHistory: [
        { date: "2026-10-11", dayType: "FULL_STUDY_DAY", hours: 6.0, sleep: 8.0, screen: 1.5, xp: 400, completedTasksCount: 4, plannedTasksCount: 4 },
      ],
      practiceSessions: [{ date: "2026-10-11", subject: "Mathematics", chapter: "Calculus", attempted: 25, correct: 23, timeSpent: 90 }],
      activeMasteries: {
        "Mathematics:Calculus": {
          key: "Mathematics:Calculus",
          subject: "Mathematics",
          chapter: "Calculus",
          pL: 0.88,
          evidenceCount: 40,
          distinctDays: 6,
          halfLifeDays: 12.0,
          lastRetrievalDate: "2026-10-11",
          errorTotals: { KNOWLEDGE_DEFICIT: 1, PROCEDURAL_FLAW: 1, ATTENTIONAL_SLIP: 0, TRANSFER_FAILURE: 0 },
        },
      },
    };

    // Scenario 6: Spaced Review Queue Trigger (R < 0.65, P(L) >= 0.35 -> M3)
    const s6Input: CoachInput = {
      today: "2026-10-12",
      dayType: "FULL_STUDY_DAY",
      hoursToday: 5.0,
      sleepLastNight: 7.5,
      screenToday: 2.0,
      dailyHistory: [
        { date: "2026-10-11", dayType: "FULL_STUDY_DAY", hours: 5.0, sleep: 7.5, screen: 2.0, xp: 250, completedTasksCount: 3, plannedTasksCount: 3 },
      ],
      practiceSessions: [],
      activeMasteries: {
        "Chemistry:Thermodynamics": {
          key: "Chemistry:Thermodynamics",
          subject: "Chemistry",
          chapter: "Thermodynamics",
          pL: 0.75,
          evidenceCount: 25,
          distinctDays: 4,
          halfLifeDays: 3.0,
          lastRetrievalDate: "2026-09-20", // 22 days ago -> R ~ 2^(-22/3) ~ 0.006 < 0.65
          errorTotals: { KNOWLEDGE_DEFICIT: 0, PROCEDURAL_FLAW: 0, ATTENTIONAL_SLIP: 0, TRANSFER_FAILURE: 0 },
        },
      },
    };

    // Scenario 7: Boom-and-Bust Swings -> Cyclical Volatility
    const s7Dates = ["2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", "2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10", "2026-10-11"];
    const s7Input: CoachInput = {
      today: "2026-10-12",
      dayType: "FULL_STUDY_DAY",
      hoursToday: 8.5,
      sleepLastNight: 7.0,
      screenToday: 3.0,
      dailyHistory: s7Dates.map((d, i) => ({
        date: d,
        dayType: "FULL_STUDY_DAY",
        hours: i % 2 === 0 ? 9.5 : 1.5, // wild swings: 9.5h then 1.5h
        sleep: 7.0,
        screen: 3.0,
        xp: 200,
        completedTasksCount: 2,
        plannedTasksCount: 3,
      })),
      practiceSessions: [],
    };

    // Scenario 8: Disengaged Absence (3+ missed days -> M7 Momentum Re-Anchor)
    const s8Input: CoachInput = {
      today: "2026-10-12",
      dayType: "SCHOOL_DAY",
      hoursToday: 0,
      sleepLastNight: null,
      screenToday: null,
      dailyHistory: [
        { date: "2026-10-06", dayType: "SCHOOL_DAY", hours: 4.0, sleep: 7.5, screen: 2.0, xp: 200, completedTasksCount: 3, plannedTasksCount: 3 },
        { date: "2026-10-07", dayType: "SCHOOL_DAY", hours: 4.0, sleep: 7.5, screen: 2.0, xp: 200, completedTasksCount: 3, plannedTasksCount: 3 },
        { date: "2026-10-08", dayType: "SCHOOL_DAY", hours: null, sleep: null, screen: null, xp: 0, completedTasksCount: 0, plannedTasksCount: 0 },
        { date: "2026-10-09", dayType: "SCHOOL_DAY", hours: null, sleep: null, screen: null, xp: 0, completedTasksCount: 0, plannedTasksCount: 0 },
        { date: "2026-10-10", dayType: "SCHOOL_DAY", hours: null, sleep: null, screen: null, xp: 0, completedTasksCount: 0, plannedTasksCount: 0 },
        { date: "2026-10-11", dayType: "SCHOOL_DAY", hours: null, sleep: null, screen: null, xp: 0, completedTasksCount: 0, plannedTasksCount: 0 },
      ],
      practiceSessions: [],
    };

    // Scenario 9: Metacognitive Overconfidence -> M8 Calibration Prediction
    const s9Input: CoachInput = {
      today: "2026-10-12",
      dayType: "FULL_STUDY_DAY",
      hoursToday: 5.0,
      sleepLastNight: 7.5,
      screenToday: 2.0,
      dailyHistory: [
        { date: "2026-10-11", dayType: "FULL_STUDY_DAY", hours: 5.0, sleep: 7.5, screen: 2.0, xp: 250, completedTasksCount: 3, plannedTasksCount: 3 },
      ],
      practiceSessions: [
        { date: "2026-10-07", subject: "Mathematics", chapter: "Trigonometry", attempted: 12, correct: 6, timeSpent: 40, confidencePre: 85 },
        { date: "2026-10-08", subject: "Mathematics", chapter: "Trigonometry", attempted: 10, correct: 5, timeSpent: 35, confidencePre: 90 },
        { date: "2026-10-09", subject: "Mathematics", chapter: "Trigonometry", attempted: 10, correct: 5, timeSpent: 35, confidencePre: 80 },
        { date: "2026-10-10", subject: "Mathematics", chapter: "Trigonometry", attempted: 10, correct: 6, timeSpent: 35, confidencePre: 85 },
        { date: "2026-10-11", subject: "Mathematics", chapter: "Trigonometry", attempted: 10, correct: 5, timeSpent: 35, confidencePre: 85 },
      ],
    };

    return [
      { id: "s1_temporary_dip", name: "Scenario 1: Student A (Temporary Dip)", desc: "5 strong days (6h) followed by an isolated 1.5h dip. Engine detects acute dip, refuses sustained decline, and issues low-friction re-anchor.", report: runCoach(s1Input, s1Input.today) },
      { id: "s2_sustained_decline", name: "Scenario 2: Student B (Sustained Decline)", desc: "Continuous drift from 8h down to 2h over 7 days. Engine detects sustained negative residual slope and prescribes structural capacity recalibration.", report: runCoach(s2Input, s2Input.today) },
      { id: "s3_critical_sleep", name: "Scenario 3: Sleep Deprivation Override (RED)", desc: "9h study with only 4h sleep. Sleep Firewall halts all study missions, regenerates report to recovery mode, and prescribes M0 Sleep Cap.", report: runCoach(s3Input, s3Input.today) },
      { id: "s4_novice_gate", name: "Scenario 4: Novice Chapter Gating", desc: "Low mastery chapter (pL = 0.22). Novice gate prevents cognitive overload by routing to M2 Worked Examples rather than unguided retrieval.", report: runCoach(s4Input, s4Input.today) },
      { id: "s5_stretch_set", name: "Scenario 5: High-Mastery Stretch (M10)", desc: "High mastery (pL = 0.88, 92% accuracy). Green sleep tier unlocks M10 Deliberate Stretch Set to elevate problem tier without burnout.", report: runCoach(s5Input, s5Input.today) },
      { id: "s6_spaced_review", name: "Scenario 6: Spaced Review Queue (M3)", desc: "Mastered chapter decays below 0.65 retrievability threshold. Half-life model injects M3 Spaced Consolidation Review.", report: runCoach(s6Input, s6Input.today) },
      { id: "s7_cyclical_volatility", name: "Scenario 7: Boom-and-Bust Swings", desc: "Erratic alternate 9.5h and 1.5h days. Theil-Sen MAD spread flags Cyclical Volatility to stabilize baseline pacing.", report: runCoach(s7Input, s7Input.today) },
      { id: "s8_disengaged", name: "Scenario 8: Disengaged Absence (3+ Days)", desc: "3 consecutive missing calendar days. Engine detects disengagement flag and issues a non-punitive momentum restart.", report: runCoach(s8Input, s8Input.today) },
      { id: "s9_calibration", name: "Scenario 9: Metacognitive Overconfidence", desc: "Predicted 85% score vs 50% realized execution over 5 sessions. Triggers pre-session calibration forecast to eliminate illusion of fluency.", report: runCoach(s9Input, s9Input.today) },
    ];
  }, []);

  const activeScenario = scenariosList.find((s) => s.id === selectedScenarioId) || scenariosList[0];
  const displayReport = activeTab === "personal" ? personalReport : activeScenario.report;

  const handleAcceptMission = () => {
    if (!displayReport.mission || missionAdded) return;
    const cleanMissionText = displayReport.mission.title;
    const newTask: Todo = {
      id: Date.now(),
      text: `[Coach Mission] ${displayReport.mission.ifThen}`,
      completed: false,
      xpReward: displayReport.mission.xp,
      type: "Practice",
      priority: "High",
    };
    setTodos((prev) => [newTask, ...prev]);
    vibrate(HAPTIC_PATTERNS.SUCCESS);
    setMissionAdded(true);
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="coachAnalysisModalOverlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center dark:bg-black/90 bg-slate-900/80 backdrop-blur-md p-3 sm:p-5 overflow-y-auto custom-scrollbar"
      >
        <motion.div
          initial={{ scale: 0.94, y: 16, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.94, y: 16, opacity: 0 }}
          transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
          className="relative w-full max-w-5xl dark:bg-slate-950 bg-white border dark:border-cyan-500/35 border-cyan-600/35 rounded-3xl p-4 sm:p-6 md:p-7 shadow-2xl my-auto text-left overflow-hidden flex flex-col max-h-[94vh]"
        >
          {/* Subtle Ambient Top Border Glow */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-90" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full dark:text-slate-400 text-slate-500 hover:dark:text-white hover:text-slate-900 dark:hover:bg-slate-900 hover:bg-slate-100 transition-colors z-30 cursor-pointer"
            aria-label="Close Analysis"
          >
            <X className="w-5 h-5" />
          </button>

          {/* STEP 1: Enter Sleep & Screen (if not yet submitted) */}
          {step === 1 ? (
            <div className="space-y-6 max-w-xl mx-auto my-auto py-8 text-center">
              <div className="inline-flex p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 mb-2">
                <Moon className="w-8 h-8 animate-pulse" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black dark:text-white text-slate-900 uppercase tracking-widest">
                Daily Recovery Check-In
              </h2>
              <p className="text-sm dark:text-slate-400 text-slate-600 font-mono">
                The Cognitive Mentor Engine gates all daily tactical advice through your sleep & screen telemetry.
              </p>

              <form onSubmit={handleSaveSleepAndScreen} className="space-y-5 text-left">
                <div className="grid grid-cols-2 gap-4">
                  {/* Sleep Input */}
                  <div className="p-4 rounded-2xl dark:bg-slate-900 bg-slate-50 border dark:border-slate-800 border-slate-200">
                    <label className="text-xs font-bold uppercase tracking-wider dark:text-slate-400 text-slate-600 block mb-2 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-400" /> Sleep Last Night
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="0"
                        max="24"
                        step="0.5"
                        value={sleepHrs}
                        onChange={(e) => setSleepHrs(e.target.value)}
                        placeholder="Hrs"
                        className="w-full p-2.5 text-center font-mono text-base font-bold rounded-xl dark:bg-black bg-white border dark:border-slate-700 border-slate-300 dark:text-white text-slate-900 outline-none focus:border-cyan-500"
                        required
                      />
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={sleepMins}
                        onChange={(e) => setSleepMins(e.target.value)}
                        placeholder="Mins"
                        className="w-full p-2.5 text-center font-mono text-base font-bold rounded-xl dark:bg-black bg-white border dark:border-slate-700 border-slate-300 dark:text-white text-slate-900 outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  {/* Screen Input */}
                  <div className="p-4 rounded-2xl dark:bg-slate-900 bg-slate-50 border dark:border-slate-800 border-slate-200">
                    <label className="text-xs font-bold uppercase tracking-wider dark:text-slate-400 text-slate-600 block mb-2 flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-rose-400" /> Screen Time
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="0"
                        max="24"
                        step="0.5"
                        value={screenHrs}
                        onChange={(e) => setScreenHrs(e.target.value)}
                        placeholder="Hrs"
                        className="w-full p-2.5 text-center font-mono text-base font-bold rounded-xl dark:bg-black bg-white border dark:border-slate-700 border-slate-300 dark:text-white text-slate-900 outline-none focus:border-cyan-500"
                        required
                      />
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={screenMins}
                        onChange={(e) => setScreenMins(e.target.value)}
                        placeholder="Mins"
                        className="w-full p-2.5 text-center font-mono text-base font-bold rounded-xl dark:bg-black bg-white border dark:border-slate-700 border-slate-300 dark:text-white text-slate-900 outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-sm uppercase tracking-widest shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
                >
                  Confirm & View Cognitive Evaluation →
                </button>
              </form>
            </div>
          ) : (
            <>
              {/* STEP 2: The Canonical 7-Part Cognitive Mentor Report */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 mb-3 border-b dark:border-slate-800 border-slate-200 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shrink-0">
                    <BrainCircuit className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg sm:text-xl font-black dark:text-white text-slate-900 uppercase tracking-widest leading-none">
                        Cognitive Mentor Directive
                      </h2>
                      <span
                        className={`text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full border ${
                          displayReport.telemetry.sleepTier === "RED"
                            ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                            : displayReport.telemetry.sleepTier === "AMBER"
                              ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                              : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                        }`}
                      >
                        Tier {displayReport.telemetry.sleepTier}
                      </span>
                    </div>
                    <p className="dark:text-cyan-400 text-cyan-700 font-mono text-[11px] tracking-wider mt-1">
                      100% Offline Deterministic Engine • JEE Learning Science
                    </p>
                  </div>
                </div>

                {/* Mode Selector: Personal vs Scenario Simulator */}
                <div className="flex items-center gap-2">
                  <div className="bg-slate-900 p-1 rounded-xl border border-slate-800 flex text-xs font-bold">
                    <button
                      onClick={() => setActiveTab("personal")}
                      className={`px-3 py-1.5 rounded-lg transition-all ${
                        activeTab === "personal"
                          ? "bg-cyan-500 text-black shadow-sm"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      My Directive
                    </button>
                    <button
                      onClick={() => setActiveTab("scenarios")}
                      className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                        activeTab === "scenarios"
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <FlaskConical className="w-3.5 h-3.5" /> Scenarios Lab
                    </button>
                  </div>
                  <button
                    onClick={() => setStep(1)}
                    className="text-[11px] font-mono text-slate-400 hover:text-cyan-400 underline ml-1 cursor-pointer"
                  >
                    Edit Sleep
                  </button>
                </div>
              </div>

              {/* Scenario Switcher Bar (if in scenarios tab) */}
              {activeTab === "scenarios" && (
                <div className="mb-3 p-2.5 rounded-2xl dark:bg-indigo-950/30 bg-indigo-50 border dark:border-indigo-800/40 border-indigo-200 shrink-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                      <FlaskConical className="w-3.5 h-3.5" /> Select Audit Test Scenario ({scenariosList.length})
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Deterministic Fixtures T01-T27
                    </span>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                    {scenariosList.map((sc) => (
                      <button
                        key={sc.id}
                        onClick={() => {
                          setSelectedScenarioId(sc.id);
                          setMissionAdded(false);
                        }}
                        className={`text-[11px] px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all border shrink-0 ${
                          selectedScenarioId === sc.id
                            ? "bg-indigo-600 text-white border-indigo-400 shadow-md"
                            : "dark:bg-black/60 bg-white border-slate-700 text-slate-300 hover:border-slate-500"
                        }`}
                      >
                        {sc.name.split(":")[1]?.trim() || sc.name}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 italic">
                    "{activeScenario.desc}"
                  </p>
                </div>
              )}

              {/* Part 1: Telemetry Quick Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3.5 shrink-0">
                <div className="dark:bg-slate-900/90 bg-slate-50 border dark:border-slate-800 border-slate-200 p-2.5 rounded-xl text-center">
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">Hours Today</span>
                  <span className="text-sm sm:text-base font-black dark:text-white text-slate-900">
                    {displayReport.telemetry.hoursToday}h
                  </span>
                </div>
                <div className="dark:bg-slate-900/90 bg-slate-50 border dark:border-slate-800 border-slate-200 p-2.5 rounded-xl text-center">
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">Sleep Last Night</span>
                  <span className="text-sm sm:text-base font-black dark:text-blue-400 text-blue-600">
                    {displayReport.telemetry.sleepLastNight !== null ? `${displayReport.telemetry.sleepLastNight}h` : "Unlogged"}
                  </span>
                </div>
                <div className="dark:bg-slate-900/90 bg-slate-50 border dark:border-slate-800 border-slate-200 p-2.5 rounded-xl text-center">
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">Screen Time</span>
                  <span className="text-sm sm:text-base font-black dark:text-rose-400 text-rose-600">
                    {displayReport.telemetry.screenToday !== null ? `${displayReport.telemetry.screenToday}h` : "Unlogged"}
                  </span>
                </div>
                <div className="dark:bg-slate-900/90 bg-slate-50 border dark:border-slate-800 border-slate-200 p-2.5 rounded-xl text-center">
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">7d Sleep Debt</span>
                  <span className="text-sm sm:text-base font-black dark:text-amber-400 text-amber-600">
                    {displayReport.telemetry.sleepDebt7d}h
                  </span>
                </div>
                <div className="col-span-2 sm:col-span-1 dark:bg-slate-900/90 bg-slate-50 border dark:border-slate-800 border-slate-200 p-2.5 rounded-xl text-center">
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">Cognitive Yield</span>
                  <span className="text-sm sm:text-base font-black dark:text-cyan-400 text-cyan-600">
                    {displayReport.telemetry.cognitiveYieldToday}h
                  </span>
                </div>
              </div>

              {/* 2-Column Core Body: 7 Parts */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 overflow-y-auto custom-scrollbar pr-1 flex-1">
                {/* Left Column: Parts 2, 3, 4 */}
                <div className="lg:col-span-6 flex flex-col gap-3">
                  {/* Part 2: Behavioral Trajectory & Theil-Sen Trend */}
                  <div className="p-3.5 rounded-2xl dark:bg-slate-900/80 bg-slate-50 border dark:border-slate-800 border-slate-200">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-cyan-400" />
                        <h4 className="text-xs font-black uppercase tracking-wider text-cyan-400">
                          Trajectory & Theil-Sen Slope
                        </h4>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
                        {displayReport.pattern.trajectory}
                      </span>
                    </div>
                    <p className="dark:text-slate-200 text-slate-800 text-xs sm:text-sm font-medium leading-relaxed">
                      {displayReport.pattern.summary}
                    </p>
                  </div>

                  {/* Part 3: Diagnostic Hypothesis (Supporting & Contradicting) */}
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-amber-400" />
                          <h4 className="text-xs font-black uppercase tracking-wider text-amber-400">
                            Diagnostic Hypothesis: {displayReport.hypothesis.id}
                          </h4>
                        </div>
                        <span className="text-[10px] font-mono text-amber-300">
                          Conf: {displayReport.hypothesis.confidence}
                        </span>
                      </div>
                      <p className="dark:text-amber-100 text-slate-900 text-xs sm:text-sm font-semibold mb-2">
                        {displayReport.hypothesis.claim}
                      </p>

                      {/* Evidence breakdown */}
                      <div className="space-y-1.5 mt-2 pt-2 border-t border-amber-500/20">
                        {displayReport.hypothesis.supporting.map((sup, i) => (
                          <div key={i} className="flex items-center justify-between text-[11px] text-amber-200/90 font-mono">
                            <span>• Supporting: {sup.label}</span>
                            <span className="font-bold">{sup.value}</span>
                          </div>
                        ))}
                        {displayReport.hypothesis.contradicting.map((con, i) => (
                          <div key={i} className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                            <span>• Contradicting: {con.label}</span>
                            <span>{con.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Part 4: Priority & Bottleneck Rationale */}
                  <div className="p-3.5 rounded-2xl dark:bg-slate-900/80 bg-slate-50 border dark:border-slate-800 border-slate-200">
                    <h4 className="text-xs font-black uppercase tracking-wider text-blue-400 mb-1">
                      Priority Rationale
                    </h4>
                    <p className="dark:text-slate-300 text-slate-700 text-xs leading-relaxed">
                      {displayReport.priority.rationale}
                    </p>
                  </div>
                </div>

                {/* Right Column: Parts 5, 6, 7 */}
                <div className="lg:col-span-6 flex flex-col gap-3">
                  {/* Part 5: Today's Tactical Mission (High Priority) */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-950/60 via-slate-900/90 to-emerald-950/40 border border-cyan-500/40 shadow-lg flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-cyan-400" />
                          <h4 className="text-xs font-black uppercase tracking-wider text-cyan-400">
                            Today's Mission: {displayReport.mission.id}
                          </h4>
                        </div>
                        <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950 px-2 py-0.5 rounded-md border border-cyan-800">
                          +{displayReport.mission.xp} XP
                        </span>
                      </div>

                      <h5 className="text-xs font-bold text-slate-200 mb-1.5 uppercase tracking-wide">
                        {displayReport.mission.title}
                      </h5>

                      <div className="p-3 rounded-xl bg-black/40 border border-cyan-500/20 mb-3">
                        <p className="dark:text-cyan-100 text-slate-900 text-xs sm:text-sm font-semibold font-mono leading-relaxed">
                          {displayReport.mission.ifThen}
                        </p>
                      </div>

                      <div className="text-[11px] font-mono text-slate-400 space-y-1">
                        <div>Metric: {displayReport.mission.metric}</div>
                        <div>Auto-Verify: {displayReport.mission.verify.type}</div>
                      </div>
                    </div>

                    <div className="mt-3">
                      {!missionAdded ? (
                        <button
                          onClick={handleAcceptMission}
                          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                        >
                          <Plus className="w-4 h-4" /> Accept Mission Into Daily Objectives (+{displayReport.mission.xp} XP)
                        </button>
                      ) : (
                        <div className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 py-2 px-3 rounded-xl text-center font-bold flex items-center justify-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5" /> Mission Active In Daily Objectives
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Part 6: Scientific Evidence & Provenance */}
                  <div className="p-3.5 rounded-2xl dark:bg-slate-900/80 bg-slate-50 border dark:border-slate-800 border-slate-200">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-purple-400">
                          Evidence: {displayReport.evidence.citation}
                        </h4>
                      </div>
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-purple-950/60 border border-purple-800/40 text-purple-300">
                        {displayReport.evidence.isDesignHeuristic ? "Design Heuristic" : `Grade ${displayReport.evidence.grade}`}
                      </span>
                    </div>
                    <p className="dark:text-slate-300 text-slate-700 text-xs leading-relaxed">
                      {displayReport.evidence.explanation}
                    </p>
                  </div>

                  {/* Part 7: Mindset Anchor (Goggins Intense) */}
                  <div className="p-3 rounded-2xl dark:bg-slate-900/80 bg-slate-50 border dark:border-slate-800 border-slate-200">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Flame className="w-3.5 h-3.5 text-orange-400" />
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-orange-400">
                        Mindset Anchor
                      </h4>
                    </div>
                    <p className="dark:text-slate-200 text-slate-800 text-xs italic font-medium">
                      "{displayReport.mindsetAnchor}"
                    </p>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="mt-3 pt-3 border-t dark:border-slate-800 border-slate-200 flex flex-col sm:flex-row gap-3 items-center justify-between shrink-0">
                <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-cyan-500" />
                  Offline Cognitive Mentor Engine • Pure TypeScript
                </span>
                <button
                  onClick={onClose}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-xs uppercase tracking-widest shadow-md hover:scale-105 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  Enter Command Center <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
