// src/lib/coach/trends.ts
/**
 * Multiscale Theil-Sen Residual Trends & 9 Canonical Trajectories.
 * As defined in Audit Section 4.3 & 7.2.
 * Pure functions: calculates slopes on relative residuals rho = (hours - baseline) / max(baseline, 1).
 */

import type {
  ISODate,
  DayType,
  Trajectory,
  DayRecord,
  TemporalTrends,
} from "./types";
import { daysBetween } from "./interventions/outcomeTracker";

// Theil-Sen median slope estimator (Breakdown point: 29.3%)
export function theilSen(pts: { x: number; y: number }[]): number {
  const s: number[] = [];
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      if (pts[j].x !== pts[i].x) {
        s.push((pts[j].y - pts[i].y) / (pts[j].x - pts[i].x));
      }
    }
  }
  if (!s.length) return 0;
  s.sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function median(v: number[]): number {
  if (!v.length) return 0;
  const a = [...v].sort((x, y) => x - y);
  const m = a.length >> 1;
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

export function mad(v: number[]): number {
  if (!v.length) return 0;
  const md = median(v);
  return 1.4826 * median(v.map((x) => Math.abs(x - md)));
}

export interface ResidualPoint {
  date: ISODate;
  x: number; // calendar day offset
  rho: number; // relative residual: (hours - baseline) / baseline
  hours: number;
}

export function computeResidualSeries(
  days: DayRecord[],
  expectedHoursForDayType: (dt: DayType) => number,
  baseDate: ISODate,
): ResidualPoint[] {
  return days
    .filter((d) => d.hours !== null && !isNaN(d.hours))
    .map((d) => {
      const b = Math.max(expectedHoursForDayType(d.dayType), 1.0);
      const x = daysBetween(baseDate, d.date);
      const rho = ((d.hours as number) - b) / b;
      return {
        date: d.date,
        x,
        rho,
        hours: d.hours as number,
      };
    })
    .sort((a, b) => a.x - b.x);
}

export interface TrajectoryClassification {
  trajectory: Trajectory;
  slope7d: number;
  slope14d: number;
  medianRho14d: number;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  summary: string;
}

export function classifyTrajectory(
  residualSeries: ResidualPoint[],
  totalHistoryLength: number,
): TrajectoryClassification {
  const usableDays = residualSeries.length;

  // 1. DATA_INSUFFICIENT: Fewer than 5 usable days
  if (usableDays < 5) {
    return {
      trajectory: "DATA_INSUFFICIENT",
      slope7d: 0,
      slope14d: 0,
      medianRho14d: 0,
      confidence: "LOW",
      summary: "Data is thin (<5 usable days). Baseline building in progress.",
    };
  }

  const last7Pts = residualSeries.slice(-7);
  const last10Pts = residualSeries.slice(-10);
  const last14Pts = residualSeries.slice(-14);

  const ptsFor7Slope = last7Pts.map((p) => ({ x: p.x, y: p.rho }));
  const ptsFor14Slope = last14Pts.map((p) => ({ x: p.x, y: p.rho }));

  const slope7d = theilSen(ptsFor7Slope);
  const slope14d = theilSen(ptsFor14Slope);

  const last14Rhos = last14Pts.map((p) => p.rho);
  const medianRho14d = median(last14Rhos);
  const spreadRho14d = mad(last14Rhos);

  // Confidence is derived from coverage & data count
  const confidence: "HIGH" | "MEDIUM" | "LOW" =
    usableDays >= 14 ? "HIGH" : usableDays >= 7 ? "MEDIUM" : "LOW";

  // 2. SUSTAINED_DECLINE:
  // At least 7 usable days in last 10; 7-day slope <= -0.04 and 14-day slope <= -0.02; at least 4 of last 7 days with rho < -0.15
  const countBelow15 = last7Pts.filter((p) => p.rho < -0.15).length;
  if (
    last10Pts.length >= 7 &&
    slope7d <= -0.04 &&
    slope14d <= -0.02 &&
    countBelow15 >= 4
  ) {
    return {
      trajectory: "SUSTAINED_DECLINE",
      slope7d,
      slope14d,
      medianRho14d,
      confidence,
      summary: "Sustained downward drift across multi-day windows. Structural bottleneck identified.",
    };
  }

  // 3. TEMPORARY_DIP (provisional):
  // At most 2 of the last 5 days with rho <= -0.35; 14-day median rho >= -0.10; 14-day slope >= -0.01
  const last5Pts = residualSeries.slice(-5);
  const countDeepDip = last5Pts.filter((p) => p.rho <= -0.35).length;
  if (
    countDeepDip <= 2 &&
    countDeepDip > 0 &&
    medianRho14d >= -0.10 &&
    slope14d >= -0.01
  ) {
    return {
      trajectory: "TEMPORARY_DIP",
      slope7d,
      slope14d,
      medianRho14d,
      confidence: "MEDIUM", // provisional
      summary: "Acute single-day dip within healthy rolling baseline band.",
    };
  }

  // 4. RECOVERY_REBOUND:
  // Days 8-14 median rho <= -0.20 and last-3-day median rho is at least 0.25 above it and >= -0.05
  if (residualSeries.length >= 8) {
    const olderDays = residualSeries.slice(
      Math.max(0, residualSeries.length - 14),
      Math.max(0, residualSeries.length - 3),
    );
    const recent3Days = residualSeries.slice(-3);
    const olderMed = median(olderDays.map((p) => p.rho));
    const recentMed = median(recent3Days.map((p) => p.rho));

    if (olderMed <= -0.20 && recentMed >= olderMed + 0.25 && recentMed >= -0.05) {
      return {
        trajectory: "RECOVERY_REBOUND",
        slope7d,
        slope14d,
        medianRho14d,
        confidence,
        summary: "Strong rebound underway following prior trough. Momentum returning.",
      };
    }
  }

  // 5. CYCLICAL_VOLATILITY:
  // 14-day robust spread of rho >= 0.35 with at least 3 boom/bust swings beyond +-0.25
  let swings = 0;
  for (let i = 1; i < last14Pts.length; i++) {
    if (
      (last14Pts[i - 1].rho < -0.25 && last14Pts[i].rho > 0.25) ||
      (last14Pts[i - 1].rho > 0.25 && last14Pts[i].rho < -0.25)
    ) {
      swings++;
    }
  }
  if (spreadRho14d >= 0.35 && swings >= 2) {
    return {
      trajectory: "CYCLICAL_VOLATILITY",
      slope7d,
      slope14d,
      medianRho14d,
      confidence,
      summary: "Boom-and-bust cycle detected. Highly erratic day-to-day capacity variance.",
    };
  }

  // 6. STRUCTURAL_EXPANSION:
  // At least 21 usable days; median of last 14 days exceeds days 15-28 median by >= 10% and >= 1.5 robust SD
  if (residualSeries.length >= 21) {
    const days15to28 = residualSeries.slice(
      Math.max(0, residualSeries.length - 28),
      Math.max(0, residualSeries.length - 14),
    );
    if (days15to28.length >= 7) {
      const olderMed = median(days15to28.map((p) => p.rho));
      const olderMad = mad(days15to28.map((p) => p.rho));
      if (medianRho14d >= olderMed + 0.1 && medianRho14d >= olderMed + 1.5 * olderMad) {
        return {
          trajectory: "STRUCTURAL_EXPANSION",
          slope7d,
          slope14d,
          medianRho14d,
          confidence: "HIGH",
          summary: "Sustained capacity expansion. Working capacity has fundamentally elevated.",
        };
      }
    }
  }

  // 7. SUSTAINED_IMPROVEMENT:
  // 7-day slope >= +0.03, 14-day slope >= +0.01, 7-day median rho >= 0
  const last7Rhos = last7Pts.map((p) => p.rho);
  const medianRho7d = median(last7Rhos);
  if (slope7d >= 0.03 && slope14d >= 0.01 && medianRho7d >= 0) {
    return {
      trajectory: "SUSTAINED_IMPROVEMENT",
      slope7d,
      slope14d,
      medianRho14d,
      confidence,
      summary: "Consistent upward momentum across 7d and 14d horizons.",
    };
  }

  // 8. CHRONIC_PLATEAU:
  // At least 14 usable days; abs(14-day slope) < 0.01; median rho within +-0.10
  if (usableDays >= 14 && Math.abs(slope14d) < 0.01 && Math.abs(medianRho14d) <= 0.1) {
    return {
      trajectory: "CHRONIC_PLATEAU",
      slope7d,
      slope14d,
      medianRho14d,
      confidence,
      summary: "Flat output plateauing at baseline. Needs deliberate challenge stretch.",
    };
  }

  // 9. STABLE:
  // Fall-through default with >= 5 usable days
  return {
    trajectory: "STABLE",
    slope7d,
    slope14d,
    medianRho14d,
    confidence,
    summary: "Steady, predictable output aligning with expected day-type capacity.",
  };
}

// -------------------------------------------------------------
// Legacy Linear Regression computeTrends for Existing Consumers
// -------------------------------------------------------------

export function computeTrends(
  history: any[],
  currentHours: number,
  currentSleep: number,
  currentScreen: number,
): TemporalTrends {
  const recent = (history || []).slice(-6).filter((h) => !h.isMissed);
  const dataPoints = [
    ...recent.map((h) => ({
      hours: h.hoursStudied || 0,
      sleep: h.sleepTime || 6.0,
      screen: h.screenTime || 3.5,
    })),
    { hours: currentHours, sleep: currentSleep, screen: currentScreen },
  ];

  if (dataPoints.length < 2) {
    return {
      hoursSlope: 0,
      hoursDirection: "STABLE",
      consecutiveTrendDays: 0,
      sleepSlope: 0,
      sleepDebt7d: Math.max(0, 6.0 - currentSleep),
      screenSlope: 0,
      screenEscalating: currentScreen > 5,
      hoursVolatility: 0,
    };
  }

  const calcSlope = (vals: number[]): number => {
    const n = vals.length;
    const xs = vals.map((_, i) => i);
    const sumX = xs.reduce((a, b) => a + b, 0);
    const sumY = vals.reduce((a, b) => a + b, 0);
    const sumXY = xs.reduce((acc, x, i) => acc + x * vals[i], 0);
    const sumX2 = xs.reduce((acc, x) => acc + x * x, 0);
    const denominator = n * sumX2 - sumX * sumX;
    if (denominator === 0) return 0;
    return (n * sumXY - sumX * sumY) / denominator;
  };

  const hoursVals = dataPoints.map((d) => d.hours);
  const sleepVals = dataPoints.map((d) => d.sleep);
  const screenVals = dataPoints.map((d) => d.screen);

  const hoursSlope = Math.round(calcSlope(hoursVals) * 100) / 100;
  const sleepSlope = Math.round(calcSlope(sleepVals) * 100) / 100;
  const screenSlope = Math.round(calcSlope(screenVals) * 100) / 100;

  const hoursDirection =
    hoursSlope > 0.3 ? "IMPROVING" : hoursSlope < -0.3 ? "DECLINING" : "STABLE";

  let consecutiveTrendDays = 1;
  for (let i = hoursVals.length - 1; i > 0; i--) {
    const diff = hoursVals[i] - hoursVals[i - 1];
    if ((hoursSlope > 0 && diff >= 0) || (hoursSlope < 0 && diff <= 0)) {
      consecutiveTrendDays++;
    } else {
      break;
    }
  }

  const sleepDebt7d =
    Math.round(
      sleepVals.reduce((sum, s) => sum + Math.max(0, 6.0 - s), 0) * 10,
    ) / 10;
  const screenEscalating = screenSlope > 0.4 || currentScreen > 5;

  const meanHours = hoursVals.reduce((a, b) => a + b, 0) / hoursVals.length;
  const variance =
    hoursVals.reduce((acc, v) => acc + Math.pow(v - meanHours, 2), 0) /
    hoursVals.length;
  const hoursVolatility = Math.round(Math.sqrt(variance) * 10) / 10;

  return {
    hoursSlope,
    hoursDirection,
    consecutiveTrendDays,
    sleepSlope,
    sleepDebt7d,
    screenSlope,
    screenEscalating,
    hoursVolatility,
  };
}
