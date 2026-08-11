import { StudentMultiState, DerivedMetrics, SeverityAnalysis } from "./types";

export function computeSeverity(state: StudentMultiState, metrics: DerivedMetrics): SeverityAnalysis {
  const axes = {
    performance: 0,
    trend: 0,
    recovery: 0,
    screen: 0,
    planning: 0,
    practice: 0,
  };

  // Performance severity (0..10)
  switch (state.performance) {
    case "TOTAL_COLLAPSE": axes.performance = 10; break;
    case "SEVERE_DECLINE": axes.performance = 8; break;
    case "MILD_DECLINE": axes.performance = 5; break;
    case "STABLE": axes.performance = 2; break;
    case "STRONG_DAY": axes.performance = 1; break;
    case "BREAKTHROUGH": axes.performance = 0; break;
  }

  // Trend severity
  switch (state.trend) {
    case "DECLINING": axes.trend = 8; break;
    case "OSCILLATING": axes.trend = 5; break;
    case "POST_PEAK_DROP": axes.trend = 6; break;
    case "STABLE_TREND": axes.trend = 2; break;
    case "RECOVERY_REBOUND": axes.trend = 1; break;
    case "BUILDING_MOMENTUM": axes.trend = 0; break;
  }

  // Recovery severity
  switch (state.recovery) {
    case "BURNOUT_RISK": axes.recovery = 10; break;
    case "ACCUMULATED_DEBT": axes.recovery = 9; break;
    case "SEVERE_SLEEP_DEFICIT": axes.recovery = 8; break;
    case "MILD_SLEEP_DEFICIT": axes.recovery = 4; break;
    case "RECOVERY_TREND": axes.recovery = 1; break;
    case "WELL_RECOVERED": axes.recovery = 0; break;
  }

  // Screen severity
  switch (state.screen) {
    case "HIGH": axes.screen = 8; break;
    case "ESCALATING": axes.screen = 7; break;
    case "MODERATE": axes.screen = 4; break;
    case "CONTROLLED": axes.screen = 0; break;
  }

  // Planning severity
  switch (state.planning) {
    case "OVERPLANNING": axes.planning = 7; break;
    case "CHRONIC_INCOMPLETE": axes.planning = 6; break;
    case "UNDERPLANNING": axes.planning = 3; break;
    case "REALISTIC_PLANNING": axes.planning = 0; break;
  }

  // Practice severity
  switch (state.practice) {
    case "SUBJECT_AVOIDANCE": axes.practice = 7; break;
    case "LOW_ACCURACY_WARNING": axes.practice = 6; break;
    case "THEORY_HEAVY": axes.practice = 5; break;
    case "PRACTICE_HEAVY": axes.practice = 2; break;
    case "BALANCED": axes.practice = 0; break;
  }

  const isHealthCritical = axes.recovery >= 8;

  // Composite overall score
  const weights = {
    performance: 0.25,
    trend: 0.20,
    recovery: 0.20,
    screen: 0.10,
    planning: 0.15,
    practice: 0.10,
  };

  const overall = Math.round(
    Object.entries(weights).reduce((sum, [key, weight]) => sum + (axes[key as keyof typeof axes] || 0) * weight, 0) * 10
  ) / 10;

  // Find primary concern
  let primaryConcern = "performance";
  let maxScore = -1;
  for (const [key, score] of Object.entries(axes)) {
    if (score > maxScore) {
      maxScore = score;
      primaryConcern = key;
    }
  }

  return {
    axes,
    overall,
    primaryConcern,
    isHealthCritical,
  };
}
