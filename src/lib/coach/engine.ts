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
import { reviewQueue } from "./student-model/retentionModel";
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
    normalized.targetSleepHours || 7.5,
  );

  // Stage 7: Knowledge Update (Weighted BKT on practice sessions)
  const activeMasteries = { ...(normalized.activeMasteries || {}) };
  for (const session of normalized.practiceSessions) {
    const key = `${session.subject}:${session.chapter}`;
    activeMasteries[key] = updateChapter(activeMasteries[key] || null, key, {
      date: session.date,
      attempted: session.attempted,
      correct: session.correct,
      questionType: session.questionType,
      tier: session.difficultyTier,
      errorCounts: session.errorCounts,
    });
  }

  // Stage 8: Retention & Review Queue
  // (Available via reviewQueue(Object.values(activeMasteries), currentDate))

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
      targetSleepHours: normalized.targetSleepHours || 7.5,
      wakeTime: "06:00",
      baselineHours: currentBaselineHours,
    },
  );

  // Stage 14: Dispatch ready report
  return finalReport;
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

  return {
    rawReport: canonicalReport.priority.rationale,
    diagnosis: canonicalReport.hypothesis.claim,
    verdict: canonicalReport.pattern.summary,
    todayMission: canonicalReport.mission.ifThen,
    closing: canonicalReport.mindsetAnchor,
    fullFormattedText: `${canonicalReport.pattern.summary}\n\n${canonicalReport.hypothesis.claim}\n\n${canonicalReport.mission.ifThen}\n\n${canonicalReport.mindsetAnchor}`,
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
}): string {
  const report = generateDeterministicCoachReport({
    hours: data.hoursToday || 0,
    sleep: data.sleep || 0,
    screenTime: data.screenTime || 0,
    streakDays: data.streak || 0,
    targetXp:
      data.targetXp || data.dailyTarget || data.totalXpGoal || data.target || 1000,
    accuracy: data.accuracy || 0,
    history: data.history || [],
    plannedTasks: data.pendingTasksCount
      ? Array(data.pendingTasksCount).fill({
          text: "Pending Task",
          completed: false,
        })
      : [],
    practiceSessions: data.questionsSolved
      ? [
          {
            id: "session_dynamic",
            date: new Date().toISOString(),
            subject: "General",
            chapter: "Practice",
            timeSpent: 30,
            attempted: data.questionsSolved,
            correct: Math.round(
              (data.questionsSolved * (data.accuracy || 70)) / 100,
            ),
            mistakes: [],
          },
        ]
      : [],
  });

  return `${report.diagnosis}\n\n🔒 Lock: ${report.todayMission}`;
}
