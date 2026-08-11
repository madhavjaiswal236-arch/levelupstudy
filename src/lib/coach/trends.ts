import { PlayHistoryEntry } from "@/context/AppContext";
import { TemporalTrends } from "./types";

export function computeTrends(history: PlayHistoryEntry[], currentHours: number, currentSleep: number, currentScreen: number): TemporalTrends {
  // Combine historical valid entries with today's current figures
  const recent = history.slice(-6).filter((h) => !h.isMissed);
  const dataPoints = [...recent.map((h) => ({
    hours: h.hoursStudied || 0,
    sleep: h.sleepTime || 7,
    screen: h.screenTime || 3.5,
  })), { hours: currentHours, sleep: currentSleep, screen: currentScreen }];

  if (dataPoints.length < 2) {
    return {
      hoursSlope: 0,
      hoursDirection: "STABLE",
      consecutiveTrendDays: 0,
      sleepSlope: 0,
      sleepDebt7d: Math.max(0, 7.5 - currentSleep),
      screenSlope: 0,
      screenEscalating: currentScreen > 5,
      hoursVolatility: 0,
    };
  }

  // Linear regression helper
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

  const hoursDirection = hoursSlope > 0.3 ? "IMPROVING" : hoursSlope < -0.3 ? "DECLINING" : "STABLE";

  // Calculate consecutive trend days in the current direction
  let consecutiveTrendDays = 1;
  for (let i = hoursVals.length - 1; i > 0; i--) {
    const diff = hoursVals[i] - hoursVals[i - 1];
    if ((hoursSlope > 0 && diff >= 0) || (hoursSlope < 0 && diff <= 0)) {
      consecutiveTrendDays++;
    } else {
      break;
    }
  }

  // Sleep debt 7d = sum of (7.5 - sleep) for all days
  const sleepDebt7d = Math.round(sleepVals.reduce((sum, s) => sum + Math.max(0, 7.5 - s), 0) * 10) / 10;
  const screenEscalating = screenSlope > 0.4 || currentScreen > 5;

  // Standard deviation of hours
  const meanHours = hoursVals.reduce((a, b) => a + b, 0) / hoursVals.length;
  const variance = hoursVals.reduce((acc, v) => acc + Math.pow(v - meanHours, 2), 0) / hoursVals.length;
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
