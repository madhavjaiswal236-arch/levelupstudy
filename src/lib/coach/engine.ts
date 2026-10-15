// src/lib/coach/engine.ts
/**
 * Canonical 14-Stage Pure Cognitive Mentor Engine.
 * Single entry point: runCoach(input, now, outcomeHistory) -> CoachReport.
 * No clock reads, no storage reads inside. Fully deterministic and pure.
 */

import type {
  CoachInput,
  CoachReport,
  MissionRecord,
  ISODate,
  RawCoachInput,
  DeterministicCoachReport,
} from "./types";
import { normalizeCoachInput, computeCoverage, normalizeInput } from "./normalize";
import { computeMetrics } from "./metrics";
import { computeDayTypeBaselines, computeBaseline } from "./baseline";
import {
  computeResidualSeries,
  classifyTrajectory,
  computeTrends,
} from "./trends";
import { calculateSleepTier } from "./safety/sleepTier";
import { updateChapter } from "./student-model/knowledgeTracing";
import { onRetrieval, reviewQueue } from "./student-model/retentionModel";
import { evaluateCalibration } from "./student-model/srlModel";
import { evaluateHypotheses } from "./diagnostics/hypotheses";
import { selectPrimaryMission } from "./interventions/missionPlanner";
import { composeReport } from "./reporting/composeReport";
import { enforceFirewall } from "./reporting/validateReport";
import { classifyMultiState } from "./states";
import { computeSeverity } from "./severity";
import { resolvePriority } from "./priority";
import { buildCoachReport } from "./missions";
import { adaptAppContextToCoachInput } from "./adapters/appContextAdapter";

/**
 * Stage 1 to 14 Pure Canonical Engine Execution.
 */
export function runCoach(
  input: CoachInput,
  now?: ISODate,
  outcomeHistory: MissionRecord[] = [],
): CoachReport {
  const currentDate = now || input.today;

  // Stage 1: Ingest & Sanity bounds
  const normalized = normalizeCoachInput(input);

  // Stage 2: Coverage & Day typing
  const coverage = computeCoverage(normalized.dailyHistory, currentDate);

  // Stage 3: Features & Metrics
  const legacyNormalized = normalizeInput({
    hours: normalized.hoursToday,
    sleep: normalized.sleepLastNight ?? 7,
    screenTime: normalized.screenToday ?? 3,
    practiceSessions: normalized.practiceSessions as any,
  });
  const metrics = computeMetrics(legacyNormalized);

  // Stage 4: Day-Type Baselines (slow, frozen against last 7 days)
  const baselines = computeDayTypeBaselines(normalized.dailyHistory);
  const expectedForDayType = (dt: any) => baselines.expectedHours[dt] || 4.5;
  const currentBaselineHours = expectedForDayType(normalized.dayType);

  // Stage 5: Multiscale Theil-Sen Trends & 9 Trajectories
  const residualSeries = computeResidualSeries(
    normalized.dailyHistory,
    expectedForDayType,
    currentDate,
  );
  const trajectoryClass = classifyTrajectory(
    residualSeries,
    normalized.dailyHistory.length,
  );

  // Stage 6: Sleep Tier (Run early so planner & firewall can enforce safety)
  const nights = normalized.dailyHistory.slice(-7).map((d) => ({
    date: d.date,
    hours: d.sleep,
  }));
  // Include last night if recorded
  if (normalized.sleepLastNight !== null) {
    nights.push({ date: currentDate, hours: normalized.sleepLastNight });
  }
  const sleepEval = calculateSleepTier(
    nights,
    normalized.targetSleepHours || 6.0,
  );

  // Stage 7 & 8: Knowledge Update (BKT) and Spaced Retention (Half-life)
  const activeMasteries = { ...(normalized.activeMasteries || {}) };
  for (const session of normalized.practiceSessions) {
    const key = `${session.subject}:${session.chapter}`;
    // 1. Update BKT mastery
    activeMasteries[key] = updateChapter(activeMasteries[key] || null, key, {
      date: session.date,
      attempted: session.attempted,
      correct: session.correct,
      questionType: session.questionType,
      tier: session.difficultyTier,
      errorCounts: session.errorCounts,
    });

    // 2. Update half-life memory stability
    const slipTagged = session.errorCounts?.ATTENTIONAL_SLIP || 0;
    const effectiveAccuracy =
      session.attempted > 0
        ? (session.correct + 0.75 * slipTagged) / session.attempted
        : 0;

    activeMasteries[key] = onRetrieval(
      activeMasteries[key],
      session.date,
      effectiveAccuracy,
      session.attempted,
      normalized.examDate,
    );
  }

  // Stage 9: SRL & Metacognitive Calibration
  evaluateCalibration(normalized.practiceSessions);

  // Stage 10: Diagnostic Hypotheses
  const legacyBaseline = computeBaseline(normalized.dailyHistory);
  const legacyTrends = computeTrends(
    normalized.dailyHistory,
    normalized.hoursToday,
    normalized.sleepLastNight ?? 7,
    normalized.screenToday ?? 3,
  );

  const hypotheses = evaluateHypotheses({
    input: normalized,
    metrics,
    baseline: legacyBaseline,
    trends: legacyTrends,
    sleepTier: sleepEval.tier,
    trajectory: trajectoryClass.trajectory,
    chapterMasteries: activeMasteries,
    coverageRatio: coverage.coverageRatio7d,
    disengaged: coverage.disengaged,
  });

  // Stage 11: Mission Planning & Policy Scoring
  const { mission, primaryHypothesis, rationale } = selectPrimaryMission({
    input: normalized,
    sleepTier: sleepEval.tier,
    hypotheses,
    chapterMasteries: activeMasteries,
    baselineHours: currentBaselineHours,
    outcomeHistory: outcomeHistory.length > 0 ? outcomeHistory : normalized.outcomeHistory || [],
    disengaged: coverage.disengaged,
    accuracyOverall: metrics.accuracyOverall,
    totalAttempts: metrics.totalQuestions,
  });

  // Stage 12: Report Composition & Tone Gating
  const unvalidatedReport = composeReport({
    input: normalized,
    metrics,
    baseline: legacyBaseline,
    trends: legacyTrends,
    trajectoryClass,
    sleepEval,
    coverage,
    hypothesis: primaryHypothesis,
    mission,
    priorityRationale: rationale,
  });

  // Stage 13: Validation & Sleep Safety Firewall
  const { report: finalReport } = enforceFirewall(
    unvalidatedReport,
    sleepEval.tier,
    {
      today: currentDate,
      targetSleepHours: normalized.targetSleepHours || 6.0,
      wakeTime: (normalized.scheduleProfile as any)?.wakeTime || "06:00",
      baselineHours: currentBaselineHours,
    },
  );

  // Stage 14: Dispatch ready report
  return {
    ...finalReport,
    updatedMasteries: activeMasteries,
  };
}

/**
 * Deterministic Coach Report for compatibility with existing UI components & tests.
 */
export function generateDeterministicCoachReport(
  input: RawCoachInput,
): DeterministicCoachReport {
  // 1. Run legacy pipeline to preserve exact explanation payloads for existing consumers
  const normalized = normalizeInput(input);
  const metrics = computeMetrics(normalized);
  const baseline = computeBaseline(normalized.history);
  const trends = computeTrends(
    normalized.history,
    normalized.hours,
    normalized.sleep,
    normalized.screenTime,
  );
  const state = classifyMultiState(normalized, metrics, baseline, trends);
  const severity = computeSeverity(state, metrics);
  const priority = resolvePriority(severity);
  const legacyReport = buildCoachReport(
    normalized,
    metrics,
    baseline,
    trends,
    state,
    severity,
    priority,
  );

  // 2. Also run the 14-stage pure canonical engine
  const adaptedInput = adaptAppContextToCoachInput(
    {
      today: input.date || input.today,
      hoursStudiedToday: input.hours,
      sleepLastNight: input.sleep,
      screenToday: input.screenTime,
      history: input.history,
      practiceSessions: input.practiceSessions,
    },
    input.date || input.today,
  );

  const canonicalReport = runCoach(adaptedInput, adaptedInput.today);

  let rawReport = legacyReport.rawReport;
  let verdict = legacyReport.verdict;
  let todayMission = legacyReport.todayMission;

  if (canonicalReport.meta?.recoveryOnly || canonicalReport.telemetry?.sleepTier === "RED") {
    todayMission = `MISSION: ${canonicalReport.mission.title}. ${canonicalReport.mission.ifThen}`;
    verdict = "VERDICT: CRITICAL RECOVERY PROTOCOL ACTIVE. Acute sleep deficit overrides standard study targets.";
    rawReport = `Sleep deficit detected (${canonicalReport.telemetry?.sleepLastNight ?? 4}h sleep logged). All cognitive capacity throttled to protect neural consolidation.`;
  }

  return {
    rawReport,
    diagnosis: legacyReport.diagnosis,
    verdict,
    todayMission,
    closing: legacyReport.closing,
    fullFormattedText: `${rawReport}\n\n${legacyReport.diagnosis}\n\n${verdict}\n\n${todayMission}\n\n${legacyReport.closing}`,
    explanation: legacyReport.explanation,
    coachReport: canonicalReport,
  };
}

export function generateDeterministicDynamicInsight(data: {
  hoursToday?: number;
  streak?: number;
  questionsSolved?: number;
  target?: number;
  targetXp?: number;
  dailyTarget?: number;
  totalXpGoal?: number;
  accuracy?: number;
  pendingTasksCount?: number;
  recentTaskTypes?: string;
  sleep?: number;
  screenTime?: number;
  history?: any[];
  yesterdayStats?: {
    hours?: number;
    sleep?: number;
    screenTime?: number;
    completedTasksCount?: number;
    totalPlannedCount?: number;
    questions?: number;
    accuracy?: number;
    dateStr?: string;
    feedbackText?: string;
    xpEarned?: number;
  };
}): string {
  // 1. Resolve Previous Day (Yesterday) Telemetry & Analysis
  const yStats: {
    hours?: number;
    sleep?: number;
    screenTime?: number;
    completedTasksCount?: number;
    totalPlannedCount?: number;
    questions?: number;
    accuracy?: number;
    dateStr?: string;
    feedbackText?: string;
    xpEarned?: number;
  } | null = data.yesterdayStats || (() => {
    if (data.history && data.history.length > 0) {
      const validPast = data.history.filter((h: any) => h && (h.hoursStudied !== undefined || h.sleepTime !== undefined));
      if (validPast.length > 0) {
        const last = validPast[validPast.length - 1];
        return {
          hours: typeof last.hoursStudied === "number" ? last.hoursStudied : 0,
          sleep: typeof last.sleepTime === "number" ? last.sleepTime : (data.sleep ?? 7.0),
          screenTime: typeof last.screenTime === "number" ? last.screenTime : (data.screenTime ?? 2.0),
          completedTasksCount: Array.isArray(last.completedTasks) ? last.completedTasks.length : 0,
          totalPlannedCount: Array.isArray(last.plannedTasks) ? last.plannedTasks.length : (Array.isArray(last.completedTasks) ? last.completedTasks.length : 0),
          feedbackText: typeof last.aiFeedback === "string" ? last.aiFeedback : undefined,
          dateStr: typeof last.date === "string" ? (last.date.includes("T") ? last.date.split("T")[0] : last.date) : "Yesterday",
          xpEarned: typeof last.xpEarned === "number" ? last.xpEarned : 0,
        };
      }
    }
    if (data.sleep !== undefined || data.screenTime !== undefined) {
      return {
        hours: 0,
        sleep: data.sleep ?? 7.0,
        screenTime: data.screenTime ?? 2.0,
        completedTasksCount: 0,
        totalPlannedCount: 0,
        dateStr: "Yesterday",
      };
    }
    return null;
  })();

  if (yStats) {
    const hours = typeof yStats.hours === "number" ? yStats.hours : 0;
    const sleep = typeof yStats.sleep === "number" ? yStats.sleep : 7.0;
    const screen = typeof yStats.screenTime === "number" ? yStats.screenTime : 2.0;
    const questions = yStats.questions ?? (data.questionsSolved && data.questionsSolved > 0 ? data.questionsSolved : undefined);
    const accuracy = yStats.accuracy ?? (data.accuracy && data.accuracy > 0 ? data.accuracy : undefined);

    // 1. Accuracy & Error Diagnostics (Critical for JEE Aspirants)
    if (questions && questions >= 15 && accuracy !== undefined) {
      if (accuracy >= 80) {
        return `Yesterday: ${hours}h study with ${questions} questions at ${accuracy}% accuracy. Sharp problem retention—advance to timed JEE Advanced multi-correct and numerical questions today.`;
      }
      if (accuracy < 65) {
        return `Yesterday: ${questions} questions attempted but accuracy was ${accuracy}%. Negative marking penalizes unreviewed mistakes—spend your first block analyzing calculation slips before starting fresh DPPs.`;
      }
      return `Yesterday: ${hours}h study and ${questions} questions at ${accuracy}% accuracy. Solid JEE rhythm—aim to increase your solving speed to under 2.5 minutes per question today.`;
    }

    // 2. High Study Hours but Passive Learning Check (>= 5h without problem solving logged)
    if (hours >= 5 && (!questions || questions < 10)) {
      return `Logged ${hours}h yesterday, but passive theory review won't crack JEE cutoffs. Shift gears today: convert concepts into active pen-and-paper problem solving with at least 35 timed DPP questions.`;
    }

    // 3. Screen Distraction vs JEE Study Hours
    if (screen >= 3.5) {
      return `Screen time reached ${screen}h yesterday against ${hours}h of study. JEE competition won't wait—keep devices in another room and secure your first 30 DPP questions before noon.`;
    }

    // 4. Sleep Deficit impacting JEE Numerical Accuracy
    if (sleep < 5.5) {
      if (hours >= 5) {
        return `Put in ${hours}h yesterday on just ${sleep}h sleep. Mental fatigue induces silly calculation errors in numericals—tackle high-yield chapters while fresh and protect tonight's rest.`;
      }
      return `Sleep was curtailed (${sleep}h) and study lagged at ${hours}h yesterday. Rebuild your JEE momentum today: eliminate phone scrolling and complete one disciplined 60-minute DPP session.`;
    }

    // 5. Strong Study Hours (>= 6h)
    if (hours >= 6) {
      return `Dominant ${hours}h study logged yesterday (${sleep}h rest). Keep the syllabus velocity rolling today by testing yourself against recent JEE Main and Advanced PYQs.`;
    }

    // 6. Low Study Hours (< 3.5h)
    if (hours < 3.5) {
      if (sleep >= 7.0) {
        return `Rest was solid (${sleep}h), but study stalled at ${hours}h yesterday. Inertia is the only hurdle—open your priority chapter DPP and win the first 45 minutes right now.`;
      }
      return `Study dipped to ${hours}h yesterday. In JEE prep, every lost day increases backlog pressure—clear your desk, set a 50-minute timer, and earn your first study block today.`;
    }

    // 7. Balanced Consistency (3.5h - 5.9h)
    return `Consistent ${hours}h foundation yesterday (${sleep}h rest). Accelerate today's output: target 30 timed questions across Physics and Math to build authentic exam tempo.`;
  }

  // Fallback for new profile or first day
  const hoursToday = data.hoursToday || 0;
  if (hoursToday > 0) {
    return `Good start with ${hoursToday}h logged today. Keep phones docked away and push towards your daily JEE question target.`;
  }
  return `Every JEE rank starts with disciplined problem blocks. Dock entertainment devices away and conquer your first 45-minute focus session.`;
}
