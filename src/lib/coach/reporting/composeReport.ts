// src/lib/coach/reporting/composeReport.ts
/**
 * 7-Part Canonical Report Composer.
 * As defined in Audit Section 4.1, 5.8 & 7.2.
 */

import type {
  CoachReport,
  CoachInput,
  DerivedMetrics,
  StudentBaseline,
  TemporalTrends,
  Hypothesis,
  Mission,
} from "../types";
import type { TrajectoryClassification } from "../trends";
import type { SleepEvaluation } from "../safety/sleepTier";
import type { NormalizedCoverage } from "../normalize";
import { EVIDENCE_REGISTRY } from "../evidence/evidenceRegistry";
import { formatMindsetAnchor } from "./tone";
import { computeCognitiveYield } from "../metrics";

export interface CompositionContext {
  input: CoachInput;
  metrics: DerivedMetrics;
  baseline: StudentBaseline;
  trends: TemporalTrends;
  trajectoryClass: TrajectoryClassification;
  sleepEval: SleepEvaluation;
  coverage: NormalizedCoverage;
  hypothesis: Hypothesis;
  mission: Mission;
  priorityRationale: string;
}

export function composeReport(ctx: CompositionContext): CoachReport {
  const {
    input,
    metrics,
    trajectoryClass,
    sleepEval,
    coverage,
    hypothesis,
    mission,
    priorityRationale,
  } = ctx;

  const cognitiveYieldToday = computeCognitiveYield(
    metrics.lectureHours,
    metrics.practiceHours,
    input.hoursToday,
  );

  const evidenceItem = EVIDENCE_REGISTRY[mission.evidenceId] || {
    id: mission.evidenceId,
    shortCitation: "Empirical Learning Science",
    claim: "Structured deliberate practice improves learning outcomes.",
    grade: "C" as const,
    provenance: "IN_CORPUS" as const,
    verified: false,
    studentExplanation: "Deliberate practice with fast feedback drives mastery.",
  };

  const mindsetAnchor = formatMindsetAnchor(
    input.today,
    mission.id,
    sleepEval.tier,
    trajectoryClass.confidence,
    input.distressSignalLogged,
  );

  return {
    telemetry: {
      hoursToday: input.hoursToday,
      sleepLastNight: input.sleepLastNight,
      screenToday: input.screenToday,
      sleepDebt7d: sleepEval.debt,
      coverageRatio7d: coverage.coverageRatio7d,
      disengaged: coverage.disengaged,
      sleepTier: sleepEval.tier,
      cognitiveYieldToday,
    },
    pattern: {
      trajectory: trajectoryClass.trajectory,
      slope7d: trajectoryClass.slope7d,
      confidence: trajectoryClass.confidence,
      summary: trajectoryClass.summary,
    },
    hypothesis: {
      id: hypothesis.id,
      claim: hypothesis.claim,
      supporting: hypothesis.supporting,
      contradicting: hypothesis.contradicting,
      confidence: hypothesis.confidence,
      severity: hypothesis.severity,
    },
    priority: {
      bottleneck: hypothesis.claim,
      rationale: priorityRationale,
    },
    mission,
    evidence: {
      registryId: evidenceItem.id,
      citation: evidenceItem.shortCitation,
      grade: evidenceItem.grade,
      isDesignHeuristic: !evidenceItem.verified || evidenceItem.grade === "C",
      explanation: evidenceItem.studentExplanation,
    },
    mindsetAnchor,
    meta: {
      generatedOn: input.today,
      recoveryOnly: sleepEval.tier === "RED",
      provisional: trajectoryClass.confidence === "MEDIUM" && trajectoryClass.trajectory === "TEMPORARY_DIP",
      tone: "GOGGINS_INTENSE",
    },
  };
}
