// src/lib/coach/student-model/srlModel.ts
/**
 * Self-Regulated Learning (SRL) & Metacognitive Calibration Engine.
 * Resolves Defect A10:
 * - Rolling signed JOL prediction gap over rolling >= 5 sessions and >= 50 attempts
 * - Planning feasibility audit (forethought check vs 1.2x median capacity)
 */

import type { PracticeSessionExt } from "../types";

export interface CalibrationEvaluation {
  rollingSignedGap: number | null; // Predicted accuracy - actual accuracy
  status: "CALIBRATED" | "OVERCONFIDENT" | "UNDERCONFIDENT" | "INSUFFICIENT_DATA";
  sessionCount: number;
  totalAttempts: number;
  message: string;
}

export function evaluateCalibration(
  sessions: PracticeSessionExt[],
): CalibrationEvaluation {
  // Filter sessions that recorded pre-session confidence (JOL: 0-100)
  const jolSessions = sessions.filter(
    (s) =>
      typeof s.confidencePre === "number" &&
      !isNaN(s.confidencePre) &&
      s.attempted >= 5,
  );

  const totalAttempts = jolSessions.reduce((sum, s) => sum + s.attempted, 0);

  // Require >= 5 sessions and >= 50 attempts for defensible metacognitive calibration
  if (jolSessions.length < 5 || totalAttempts < 50) {
    return {
      rollingSignedGap: null,
      status: "INSUFFICIENT_DATA",
      sessionCount: jolSessions.length,
      totalAttempts,
      message: `Calibration data accumulating (${jolSessions.length}/5 sessions, ${totalAttempts}/50 questions). Keep logging predictions.`,
    };
  }

  // Compute signed difference between predicted accuracy and realized accuracy
  let sumSignedDiff = 0;
  for (const s of jolSessions) {
    const actualAccuracy = (s.correct / s.attempted) * 100;
    const diff = (s.confidencePre as number) - actualAccuracy;
    sumSignedDiff += diff;
  }

  const rollingSignedGap = Math.round((sumSignedDiff / jolSessions.length) * 10) / 10;

  if (rollingSignedGap > 15) {
    return {
      rollingSignedGap,
      status: "OVERCONFIDENT",
      sessionCount: jolSessions.length,
      totalAttempts,
      message: `Overconfidence bias detected (+${rollingSignedGap}% average prediction gap). Predicted fluency is outpacing retrieval execution.`,
    };
  }

  if (rollingSignedGap < -15) {
    return {
      rollingSignedGap,
      status: "UNDERCONFIDENT",
      sessionCount: jolSessions.length,
      totalAttempts,
      message: `Underconfidence bias detected (${rollingSignedGap}% average prediction gap). Execution accuracy exceeds self-assessment.`,
    };
  }

  return {
    rollingSignedGap,
    status: "CALIBRATED",
    sessionCount: jolSessions.length,
    totalAttempts,
    message: `Metacognitive calibration is sharp (gap within +-15%). Predictions match actual retrieval performance.`,
  };
}

export interface PlanningFeasibilityCheck {
  feasible: boolean;
  plannedHours: number;
  capacityLimit: number;
  ratio: number;
  warning?: string;
}

export function checkPlanningFeasibility(
  plannedHours: number,
  medianCapacityForDayType: number,
): PlanningFeasibilityCheck {
  const capacityLimit = Math.round(1.2 * medianCapacityForDayType * 10) / 10;
  const feasible = plannedHours <= capacityLimit;
  const ratio = Math.round((plannedHours / Math.max(1, medianCapacityForDayType)) * 100) / 100;

  return {
    feasible,
    plannedHours,
    capacityLimit,
    ratio,
    warning: !feasible
      ? `Planned load (${plannedHours}h) exceeds 1.2x median capacity (${capacityLimit}h) for this day type. High risk of task slippage.`
      : undefined,
  };
}
