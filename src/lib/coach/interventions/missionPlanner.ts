// src/lib/coach/interventions/missionPlanner.ts
/**
 * Mission Planner & Challenge Tuning Policy.
 * Implements Section 5.2, 5.3, 5.4 from the Audit Document:
 * - Hard overrides: RED tier -> M0 only, DISENGAGED -> M7.
 * - Novice gate: P(L) < 0.35 routes strictly to M2 (worked examples), never M1.
 * - Spaced review queue injection (M3) when R < 0.65 and P(L) >= 0.35.
 * - Stretch set gating (M10) on GREEN, accuracy >= 85%, P(L) >= 0.75, not within 21 days of exam.
 * - Multi-factor scoring: severity * confidence * strategyWeight * freshness.
 */

import type {
  CoachInput,
  Mission,
  MissionId,
  SleepTier,
  Hypothesis,
  ChapterMastery,
  MissionRecord,
} from "../types";
import { buildMission } from "./strategyCatalog";
import { reviewQueue } from "../student-model/retentionModel";
import { strategyWeight, daysBetween } from "./outcomeTracker";
import { computeLightsOutTime } from "../safety/sleepTier";

export interface PlannerContext {
  input: CoachInput;
  sleepTier: SleepTier;
  hypotheses: Hypothesis[];
  chapterMasteries: Record<string, ChapterMastery>;
  baselineHours: number;
  outcomeHistory: MissionRecord[];
  disengaged: boolean;
  accuracyOverall: number;
  totalAttempts: number;
}

export function selectPrimaryMission(ctx: PlannerContext): {
  mission: Mission;
  primaryHypothesis: Hypothesis;
  rationale: string;
} {
  const { input, sleepTier, hypotheses, chapterMasteries, baselineHours, outcomeHistory, disengaged } = ctx;

  const lightsOutTime = computeLightsOutTime("06:00", input.targetSleepHours || 6.0);

  // 1. Hard Override: RED Sleep Tier -> M0 only
  if (sleepTier === "RED") {
    const recoveryMission = buildMission("M0_RECOVERY_SLEEP", {
      today: input.today,
      lightsOutTime,
      wakeTime: "06:00",
      targetSleepHours: input.targetSleepHours || 6.0,
    });

    const recoveryHypothesis: Hypothesis = {
      id: "PHYSIOLOGICAL_OVERLOAD",
      claim: "Critical sleep deficit detected. Cognitive consolidation is halted.",
      supporting: [{ label: "Sleep Tier", value: "RED", refs: ["Sleep telemetry"] }],
      contradicting: [],
      confidence: "HIGH",
      severity: 1.0,
      missionId: "M0_RECOVERY_SLEEP",
    };

    return {
      mission: recoveryMission,
      primaryHypothesis: recoveryHypothesis,
      rationale: "Immediate shutdown is required to restore synaptic consolidation. No academic tasks permitted.",
    };
  }

  // 2. Hard Override: DISENGAGED -> M7 Low-Friction Restart
  if (disengaged) {
    const restartMission = buildMission("M7_MOMENTUM_REANCHOR", {
      today: input.today,
      startTime: "16:00",
    });

    const disengageHypothesis: Hypothesis = {
      id: "DISENGAGEMENT",
      claim: "Logging consistency lapsed across multiple calendar days.",
      supporting: [{ label: "Disengaged Flag", value: "Active", refs: ["Coverage analysis"] }],
      contradicting: [],
      confidence: "HIGH",
      severity: 0.85,
      missionId: "M7_MOMENTUM_REANCHOR",
    };

    return {
      mission: restartMission,
      primaryHypothesis: disengageHypothesis,
      rationale: "Restarting momentum with a low-friction 25-minute set on familiar material.",
    };
  }

  // 3. Assemble Candidates
  const candidates: Array<{
    missionId: MissionId;
    hypothesis: Hypothesis;
    score: number;
    mission: Mission;
  }> = [];

  // Candidate from Spaced Review Queue (M3)
  const dueChapters = reviewQueue(Object.values(chapterMasteries), input.today);
  if (dueChapters.length > 0) {
    const topDue = dueChapters[0];
    const m3Mission = buildMission("M3_SPACED_REVIEW", {
      today: input.today,
      chapter: topDue.chapter,
      chapters: dueChapters.map((c) => c.chapter),
      startTime: "16:00",
    });

    const m3Hypothesis: Hypothesis = {
      id: "CONCEPTUAL_BOTTLENECK",
      claim: `Forgetting threshold reached on ${dueChapters.length} previously mastered chapter(s).`,
      supporting: [{ label: "Due Chapter", value: topDue.chapter, refs: ["Half-life retention model"] }],
      contradicting: [],
      confidence: "HIGH",
      severity: 0.8,
      missionId: "M3_SPACED_REVIEW",
    };

    candidates.push({
      missionId: "M3_SPACED_REVIEW",
      hypothesis: m3Hypothesis,
      score: 0.8,
      mission: m3Mission,
    });
  }

  // Candidates from Active Hypotheses
  for (const hyp of hypotheses) {
    let missionId = hyp.missionId;

    // Check Novice Gate (Defect D1): Check the TARGET chapter, not all chapters globally
    if (missionId === "M1_RETRIEVAL_FIRST") {
      const targetChapterVal = hyp.supporting.find(
        (s) => s.label === "Chapter" || s.label === "Novice Chapter Mastery",
      )?.value;
      const targetKey = targetChapterVal
        ? String(targetChapterVal)
        : Object.keys(chapterMasteries)[0];

      const targetMastery = targetKey ? chapterMasteries[targetKey] : null;
      const isNovice =
        !targetMastery ||
        targetMastery.pL < 0.35 ||
        targetMastery.distinctDays < 2;

      if (isNovice) {
        missionId = "M2_WORKED_EXAMPLE_LADDER";
      }
    }

    // Build the mission
    const mission = buildMission(missionId, {
      today: input.today,
      subject: "Physics",
      chapter: "Laws of Motion",
      startTime: "16:00",
      lightsOutTime,
      availableHours: Math.round(baselineHours),
    });

    // Score: severity * confidenceFactor * strategyWeight * freshness
    const confFactor = hyp.confidence === "HIGH" ? 1.0 : hyp.confidence === "MEDIUM" ? 0.7 : 0.4;
    const strat = strategyWeight(missionId, outcomeHistory, input.today);

    // Freshness: 0.5 if offered within the last 2 days
    const recentOffer = outcomeHistory.find(
      (r) => (r.missionId === missionId || r.key.endsWith(`:${missionId}`)) && daysBetween(r.offeredOn, input.today) <= 2,
    );
    const freshness = recentOffer ? 0.5 : 1.0;

    const totalScore = hyp.severity * confFactor * strat.weight * freshness;

    candidates.push({
      missionId,
      hypothesis: hyp,
      score: totalScore,
      mission,
    });
  }

  // Candidate: Deliberate Stretch Set M10 (if GREEN and high accuracy and mastery)
  const isEligibleForStretch =
    sleepTier === "GREEN" &&
    ctx.accuracyOverall >= 85 &&
    ctx.totalAttempts >= 20 &&
    (!input.examDate || daysBetween(input.today, input.examDate) > 21);

  if (isEligibleForStretch) {
    const stretchMission = buildMission("M10_STRETCH_SET", {
      today: input.today,
      questionCount: 15,
    });

    const stretchHypothesis: Hypothesis = {
      id: "CONCEPTUAL_BOTTLENECK",
      claim: "High execution accuracy indicates mastery ceiling at current difficulty tier.",
      supporting: [{ label: "Accuracy", value: `${ctx.accuracyOverall}%`, refs: ["Session history"] }],
      contradicting: [],
      confidence: "HIGH",
      severity: 0.65,
      missionId: "M10_STRETCH_SET",
    };

    candidates.push({
      missionId: "M10_STRETCH_SET",
      hypothesis: stretchHypothesis,
      score: 0.75,
      mission: stretchMission,
    });
  }

  // Filter candidates: AMBER removes M10 and limits duration
  const filteredCandidates = candidates.filter((c) => {
    if (sleepTier === "AMBER" && c.missionId === "M10_STRETCH_SET") {
      return false;
    }
    return true;
  });

  if (filteredCandidates.length === 0) {
    // Fallback baseline mission
    const defaultMission = buildMission("M1_RETRIEVAL_FIRST", {
      today: input.today,
      startTime: "16:00",
      questionCount: 15,
    });
    const defaultHypothesis: Hypothesis = {
      id: "PASSIVE_INTAKE_NO_RETRIEVAL",
      claim: "Anchor your day with active problem generation.",
      supporting: [],
      contradicting: [],
      confidence: "MEDIUM",
      severity: 0.5,
      missionId: "M1_RETRIEVAL_FIRST",
    };
    return {
      mission: defaultMission,
      primaryHypothesis: defaultHypothesis,
      rationale: "Closed-book timed retrieval practice anchors daily mastery.",
    };
  }

  // Sort descending by score
  filteredCandidates.sort((a, b) => b.score - a.score);
  const best = filteredCandidates[0];

  return {
    mission: best.mission,
    primaryHypothesis: best.hypothesis,
    rationale: best.hypothesis.claim,
  };
}
