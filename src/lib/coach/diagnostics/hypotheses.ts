// src/lib/coach/diagnostics/hypotheses.ts
/**
 * Diagnostic Hypotheses Engine.
 * Evaluates both supporting AND contradicting evidence for the 8 canonical hypotheses.
 * Computes severity and confidence deterministically.
 */

import type {
  Hypothesis,
  HypothesisId,
  Evidence,
  CoachInput,
  DerivedMetrics,
  StudentBaseline,
  TemporalTrends,
  SleepTier,
  Trajectory,
  ChapterMastery,
} from "../types";

export interface DiagnosticInput {
  input: CoachInput;
  metrics: DerivedMetrics;
  baseline: StudentBaseline;
  trends: TemporalTrends;
  sleepTier: SleepTier;
  trajectory: Trajectory;
  chapterMasteries: Record<string, ChapterMastery>;
  coverageRatio: number;
  disengaged: boolean;
}

export function evaluateHypotheses(ctx: DiagnosticInput): Hypothesis[] {
  const hypotheses: Hypothesis[] = [];

  // 1. PHYSIOLOGICAL_OVERLOAD
  {
    const supporting: Evidence[] = [];
    const contradicting: Evidence[] = [];

    if (ctx.sleepTier === "RED") {
      supporting.push({
        label: "Critical Sleep Tier",
        value: "RED",
        refs: ["Sleep telemetry"],
      });
    }
    if (ctx.input.sleepLastNight !== null && ctx.input.sleepLastNight < 5.5) {
      supporting.push({
        label: "Acute Sleep Deficit",
        value: `${ctx.input.sleepLastNight}h`,
        refs: ["Night log"],
      });
    }
    if (ctx.trends.sleepDebt7d >= 8) {
      supporting.push({
        label: "High 7-day Debt",
        value: `${ctx.trends.sleepDebt7d}h`,
        refs: ["7-day rolling window"],
      });
    }

    if (ctx.input.sleepLastNight !== null && ctx.input.sleepLastNight >= 6.0) {
      contradicting.push({
        label: "Normal Last Night Sleep",
        value: `${ctx.input.sleepLastNight}h`,
        refs: ["Night log"],
      });
    }
    if (ctx.trends.sleepDebt7d < 2.0) {
      contradicting.push({
        label: "Negligible Sleep Debt",
        value: `${ctx.trends.sleepDebt7d}h`,
        refs: ["7-day window"],
      });
    }

    if (supporting.length > 0) {
      hypotheses.push({
        id: "PHYSIOLOGICAL_OVERLOAD",
        claim: "Severe physiological exhaustion suppressing memory consolidation and executive control.",
        supporting,
        contradicting,
        confidence: ctx.sleepTier === "RED" ? "HIGH" : "MEDIUM",
        severity: ctx.sleepTier === "RED" ? 1.0 : 0.7,
        missionId: "M0_RECOVERY_SLEEP",
      });
    }
  }

  // 2. DISENGAGEMENT
  {
    const supporting: Evidence[] = [];
    const contradicting: Evidence[] = [];

    if (ctx.disengaged) {
      supporting.push({
        label: "Low Logging Coverage",
        value: `${Math.round(ctx.coverageRatio * 100)}%`,
        refs: ["7-day activity check"],
      });
    }
    if (ctx.input.hoursToday === 0 && ctx.metrics.plannedTaskCount === 0) {
      supporting.push({
        label: "Zero Activity Today",
        value: 0,
        refs: ["Today telemetry"],
      });
    }

    if (ctx.coverageRatio >= 0.8) {
      contradicting.push({
        label: "High Logging Coverage",
        value: `${Math.round(ctx.coverageRatio * 100)}%`,
        refs: ["7-day activity check"],
      });
    }

    if (supporting.length > 0 && ctx.disengaged) {
      hypotheses.push({
        id: "DISENGAGEMENT",
        claim: "Disengagement from study routine detected; logging consistency lapsed.",
        supporting,
        contradicting,
        confidence: ctx.coverageRatio < 0.4 ? "HIGH" : "MEDIUM",
        severity: 0.85,
        missionId: "M7_MOMENTUM_REANCHOR",
      });
    }
  }

  // 3. NOVICE_NEEDS_SCAFFOLD
  {
    const supporting: Evidence[] = [];
    const contradicting: Evidence[] = [];

    // Find any chapter with low mastery (< 0.35) or low accuracy (< 45%) with >= 10 attempts
    let lowMasteryChapter: string | null = null;
    for (const [key, m] of Object.entries(ctx.chapterMasteries)) {
      if (m.pL < 0.35 || (m.errorTotals.KNOWLEDGE_DEFICIT >= 5 && m.pL < 0.45)) {
        lowMasteryChapter = key;
        break;
      }
    }

    if (lowMasteryChapter) {
      supporting.push({
        label: "Novice Chapter Mastery",
        value: lowMasteryChapter,
        refs: ["Knowledge tracing model"],
      });
    }

    if (ctx.metrics.accuracyOverall < 45 && ctx.metrics.totalQuestions >= 10) {
      supporting.push({
        label: "Low Execution Accuracy",
        value: `${ctx.metrics.accuracyOverall}%`,
        refs: ["Session logs"],
      });
    }

    if (ctx.metrics.accuracyOverall >= 75) {
      contradicting.push({
        label: "High Session Accuracy",
        value: `${ctx.metrics.accuracyOverall}%`,
        refs: ["Session logs"],
      });
    }

    if (supporting.length > 0 && lowMasteryChapter) {
      hypotheses.push({
        id: "NOVICE_NEEDS_SCAFFOLD",
        claim: "Novice cognitive overload: working memory saturated due to unformed schemas.",
        supporting,
        contradicting,
        confidence: "HIGH",
        severity: 0.75,
        missionId: "M2_WORKED_EXAMPLE_LADDER",
      });
    }
  }

  // 4. PASSIVE_INTAKE_NO_RETRIEVAL
  {
    const supporting: Evidence[] = [];
    const contradicting: Evidence[] = [];

    if (ctx.metrics.lectureRatio >= 0.7 && ctx.metrics.lectureHours >= 2.0) {
      supporting.push({
        label: "High Lecture Proportion",
        value: `${Math.round(ctx.metrics.lectureRatio * 100)}%`,
        refs: ["Categorized hours"],
      });
    }
    if (ctx.metrics.totalQuestions < 10 && ctx.input.hoursToday >= 3.0) {
      supporting.push({
        label: "Negligible Retrieval Practice",
        value: `${ctx.metrics.totalQuestions} questions in ${ctx.input.hoursToday}h`,
        refs: ["Practice sessions"],
      });
    }

    if (ctx.metrics.practiceRatio >= 0.6) {
      contradicting.push({
        label: "Dominant Practice Ratio",
        value: `${Math.round(ctx.metrics.practiceRatio * 100)}%`,
        refs: ["Categorized hours"],
      });
    }

    if (supporting.length > 0) {
      hypotheses.push({
        id: "PASSIVE_INTAKE_NO_RETRIEVAL",
        claim: "Passive consumption illusion: extensive watching/reading without active retrieval generation.",
        supporting,
        contradicting,
        confidence: ctx.metrics.totalQuestions === 0 ? "HIGH" : "MEDIUM",
        severity: 0.7,
        missionId: "M1_RETRIEVAL_FIRST",
      });
    }
  }

  // 5. SCHEDULE_COLLISION
  {
    const supporting: Evidence[] = [];
    const contradicting: Evidence[] = [];

    if (
      ctx.metrics.taskCompletionRate < 0.5 &&
      ctx.metrics.plannedTaskCount >= 5 &&
      (ctx.input.dayType === "SCHOOL_DAY" || ctx.input.dayType === "COACHING_DAY")
    ) {
      supporting.push({
        label: "High Incompletion on School/Coaching Day",
        value: `${Math.round(ctx.metrics.taskCompletionRate * 100)}% completion`,
        refs: ["Task planner"],
      });
    }

    if (ctx.metrics.taskCompletionRate >= 0.8) {
      contradicting.push({
        label: "High Task Completion Rate",
        value: `${Math.round(ctx.metrics.taskCompletionRate * 100)}%`,
        refs: ["Task planner"],
      });
    }

    if (supporting.length > 0) {
      hypotheses.push({
        id: "SCHEDULE_COLLISION",
        claim: "Schedule capacity collision: unrealistic planned task load on fixed-schedule school/coaching day.",
        supporting,
        contradicting,
        confidence: "MEDIUM",
        severity: 0.6,
        missionId: "M6_SCHEDULE_FIT",
      });
    }
  }

  // 6. ATTENTION_LEAK
  {
    const supporting: Evidence[] = [];
    const contradicting: Evidence[] = [];

    if (ctx.input.screenToday !== null && ctx.input.screenToday >= 5.0) {
      supporting.push({
        label: "Elevated Screen Time",
        value: `${ctx.input.screenToday}h`,
        refs: ["Daily screen log"],
      });
    }
    if (ctx.trends.screenEscalating) {
      supporting.push({
        label: "Escalating Screen Trend",
        value: "Slope > 0.4",
        refs: ["7-day screen regression"],
      });
    }

    if (ctx.input.screenToday !== null && ctx.input.screenToday < 2.5) {
      contradicting.push({
        label: "Low Screen Time Today",
        value: `${ctx.input.screenToday}h`,
        refs: ["Daily screen log"],
      });
    }

    if (supporting.length > 0) {
      hypotheses.push({
        id: "ATTENTION_LEAK",
        claim: "Digital distraction & cognitive residue leaking sustained focus windows.",
        supporting,
        contradicting,
        confidence: ctx.input.screenToday && ctx.input.screenToday > 6 ? "HIGH" : "MEDIUM",
        severity: 0.65,
        missionId: "M9_DEVICE_QUARANTINE",
      });
    }
  }

  // 7. ACUTE_DISRUPTION
  {
    const supporting: Evidence[] = [];
    const contradicting: Evidence[] = [];

    if (ctx.trajectory === "TEMPORARY_DIP") {
      supporting.push({
        label: "Temporary Dip Detected",
        value: "Acute residual dip",
        refs: ["Multiscale residual classifier"],
      });
    }

    if (ctx.trajectory === "SUSTAINED_IMPROVEMENT" || ctx.trajectory === "STABLE") {
      contradicting.push({
        label: "Stable/Improving Trajectory",
        value: ctx.trajectory,
        refs: ["Trajectory classifier"],
      });
    }

    if (supporting.length > 0) {
      hypotheses.push({
        id: "ACUTE_DISRUPTION",
        claim: "Isolated temporary dip inside a solid multi-day rhythm.",
        supporting,
        contradicting,
        confidence: "MEDIUM",
        severity: 0.5,
        missionId: "M7_MOMENTUM_REANCHOR",
      });
    }
  }

  // 8. CONCEPTUAL_BOTTLENECK
  {
    const supporting: Evidence[] = [];
    const contradicting: Evidence[] = [];

    let totalErrors = 0;
    for (const m of Object.values(ctx.chapterMasteries)) {
      totalErrors +=
        m.errorTotals.KNOWLEDGE_DEFICIT +
        m.errorTotals.PROCEDURAL_FLAW +
        m.errorTotals.ATTENTIONAL_SLIP +
        m.errorTotals.TRANSFER_FAILURE;
    }

    if (totalErrors >= 6) {
      supporting.push({
        label: "Tagged Error History",
        value: `${totalErrors} tagged mistakes`,
        refs: ["Practice session error tags"],
      });
    }

    if (supporting.length > 0) {
      hypotheses.push({
        id: "CONCEPTUAL_BOTTLENECK",
        claim: "Persistent conceptual or procedural flaws accumulating without deliberate error isolation.",
        supporting,
        contradicting,
        confidence: "MEDIUM",
        severity: 0.6,
        missionId: "M5_ERROR_REPAIR",
      });
    }
  }

  return hypotheses;
}
