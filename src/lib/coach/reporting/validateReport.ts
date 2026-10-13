// src/lib/coach/reporting/validateReport.ts
/**
 * Sleep Firewall Core: Deep safety enforcement on generated reports and study surfaces.
 * Deep clones inputs and completely regenerates reports under RED tier to prevent
 * contradictory overload advice.
 */

import type { CoachReport, SleepTier, Mission, ISODate } from "../types";
import { computeLightsOutTime } from "../safety/sleepTier";

export interface RecoveryContext {
  today: ISODate;
  targetSleepHours: number;
  wakeTime?: string;
  baselineHours: number;
}

export function canOfferStudyTask(
  hours: number,
  baseline: number,
  tier: SleepTier,
): boolean {
  if (tier === "GREEN") return true;
  if (tier === "AMBER") return hours <= baseline;
  if (tier === "RED") return hours <= 0.5 * baseline;
  return false;
}

export function createRecoveryMission(ctx: RecoveryContext): Mission {
  const lightsOut = computeLightsOutTime(ctx.wakeTime || "06:00", ctx.targetSleepHours);
  const wakeTimeStr = ctx.wakeTime || "06:00";

  return {
    id: "M0_RECOVERY_SLEEP",
    kind: "RECOVERY",
    title: "Mandatory Physiological Recovery",
    ifThen: `If it is ${lightsOut}, then I will close the books and screens and sleep until ${wakeTimeStr}.`,
    window: { from: ctx.today, to: ctx.today },
    targetSleepHours: ctx.targetSleepHours,
    verify: { type: "SLEEP_AT_LEAST", hours: Math.max(5.5, ctx.targetSleepHours - 0.5) },
    xp: 150,
    evidenceId: "EVD_SLEEP_CONSOLIDATION",
    metric: "Next-day sleep and cognitive recovery",
  };
}

export function composeRecoveryReport(
  ctx: RecoveryContext,
  telemetry: CoachReport["telemetry"],
): CoachReport {
  const mission = createRecoveryMission(ctx);

  return {
    telemetry: {
      ...telemetry,
      sleepTier: "RED",
    },
    pattern: {
      trajectory: "DATA_INSUFFICIENT", // safe non-overload default
      slope7d: 0,
      confidence: "HIGH",
      summary: "Critical sleep deficit detected. Cognitive consolidation is halted.",
    },
    hypothesis: {
      id: "PHYSIOLOGICAL_OVERLOAD",
      claim: "Synaptic plasticity and working memory capacity are suppressed by acute or chronic sleep deprivation.",
      supporting: [
        {
          label: "Sleep Deficit",
          value: telemetry.sleepLastNight !== null ? `${telemetry.sleepLastNight}h` : "Severe debt",
          refs: ["Sleep telemetry log"],
        },
      ],
      contradicting: [],
      confidence: "HIGH",
      severity: 1.0,
    },
    priority: {
      bottleneck: "Physiological exhaustion and critical sleep deficit",
      rationale:
        "Pushing study volume on depleted sleep accelerates error rates and degrades long-term retention. Immediate shutdown is the only discipline today.",
    },
    mission,
    evidence: {
      registryId: "EVD_SLEEP_CONSOLIDATION",
      citation: "Walker & Stickgold, 2004",
      grade: "A",
      isDesignHeuristic: false,
      explanation: "Memory stabilization and synaptic homeostasis require non-REM slow wave and REM sleep cycles.",
    },
    mindsetAnchor:
      "Discipline today is shutting down on time. Tomorrow's sharpness is earned tonight.",
    meta: {
      generatedOn: ctx.today,
      recoveryOnly: true,
      provisional: false,
      tone: "GOGGINS_INTENSE",
      remedyApplied: "RECOVERY_REGENERATED",
    },
  };
}

export function applyAmberCaps(report: CoachReport, ctx: RecoveryContext): CoachReport {
  const capped = structuredClone(report);

  // In AMBER: no stretch mission M10 allowed; cap duration at baseline
  if (capped.mission.id === "M10_STRETCH_SET") {
    // Demote to M3 Spaced Review or M7 Momentum
    capped.mission = {
      id: "M7_MOMENTUM_REANCHOR",
      kind: "STUDY",
      title: "Consolidated Practice Block",
      ifThen: "If I sit down at study time, then I will do a 25-minute set on a chapter I already know before touching anything new.",
      window: { from: ctx.today, to: ctx.today },
      durationMin: 25,
      verify: { type: "SESSION_LOGGED", minAttempts: 10 },
      xp: 100,
      evidenceId: "EVD_MOMENTUM_ANCHOR",
      metric: "Baseline study hours stabilization",
    };
  }

  if (capped.mission.durationMin && capped.mission.durationMin > ctx.baselineHours * 60) {
    capped.mission.durationMin = Math.round(Math.max(25, ctx.baselineHours * 60));
  }

  capped.priority.rationale += " [AMBER: Planned volume capped at baseline. Protect sleep window tonight.]";
  capped.meta.remedyApplied = "AMBER_CAPPED";

  return capped;
}

export function enforceFirewall(
  report: CoachReport,
  tier: SleepTier,
  ctx: RecoveryContext,
): { report: CoachReport; remedy?: "RECOVERY_REGENERATED" | "AMBER_CAPPED" } {
  // Use structuredClone so we never mutate caller's object
  const input = structuredClone(report);

  if (tier === "RED") {
    if (input.mission.id === "M0_RECOVERY_SLEEP" && input.meta.recoveryOnly) {
      return { report: input };
    }
    return {
      report: composeRecoveryReport(ctx, input.telemetry),
      remedy: "RECOVERY_REGENERATED",
    };
  }

  if (tier === "AMBER") {
    return {
      report: applyAmberCaps(input, ctx),
      remedy: "AMBER_CAPPED",
    };
  }

  return { report: input };
}
