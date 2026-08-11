import {
  NormalizedStudentData,
  DerivedMetrics,
  StudentBaseline,
  TemporalTrends,
  StudentMultiState,
  PerformanceState,
  TrendState,
  PlanningState,
  PracticeState,
  RecoveryState,
  ScreenState,
} from "./types";

export function classifyMultiState(
  data: NormalizedStudentData,
  metrics: DerivedMetrics,
  baseline: StudentBaseline,
  trends: TemporalTrends
): StudentMultiState {
  // 1. Performance State
  let performance: PerformanceState = "STABLE";
  const baselineHrs = baseline.confidence !== "NONE" ? baseline.avgHours : 5.0;

  if (data.hours < 1.5) {
    performance = "TOTAL_COLLAPSE";
  } else if (data.hours < baselineHrs - 2.5) {
    performance = "SEVERE_DECLINE";
  } else if (data.hours < baselineHrs - 1.0) {
    performance = "MILD_DECLINE";
  } else if (data.hours >= baselineHrs + 2.5 && data.hours >= 8) {
    performance = "BREAKTHROUGH";
  } else if (data.hours >= baselineHrs + 1.0) {
    performance = "STRONG_DAY";
  } else {
    performance = "STABLE";
  }

  // 2. Trend State
  let trend: TrendState = "STABLE_TREND";
  if (trends.hoursDirection === "IMPROVING" && trends.consecutiveTrendDays >= 3) {
    trend = "BUILDING_MOMENTUM";
  } else if (trends.hoursDirection === "DECLINING" && trends.consecutiveTrendDays >= 3) {
    trend = "DECLINING";
  } else if (trends.hoursVolatility > 2.5) {
    trend = "OSCILLATING";
  } else if (data.hours >= baselineHrs + 1.5 && trends.hoursSlope < 0) {
    trend = "RECOVERY_REBOUND";
  } else if (data.hours < baselineHrs - 1.5 && trends.hoursSlope > 0) {
    trend = "POST_PEAK_DROP";
  }

  // 3. Planning State
  let planning: PlanningState = "REALISTIC_PLANNING";
  if (metrics.plannedTaskCount >= 5 && metrics.taskCompletionRate < 0.4) {
    planning = "OVERPLANNING";
  } else if (metrics.plannedTaskCount <= 1 && data.hours > 3) {
    planning = "UNDERPLANNING";
  } else if (metrics.taskCompletionRate < 0.5) {
    planning = "CHRONIC_INCOMPLETE";
  } else {
    planning = "REALISTIC_PLANNING";
  }

  // 4. Practice State
  let practice: PracticeState = "BALANCED";
  if (metrics.neglectedSubjects.length >= 1 && data.hours >= 3) {
    practice = "SUBJECT_AVOIDANCE";
  } else if (metrics.totalQuestions > 0 && metrics.accuracyOverall < 50) {
    practice = "LOW_ACCURACY_WARNING";
  } else if (data.hours >= 4 && metrics.totalQuestions < 15) {
    practice = "THEORY_HEAVY";
  } else if (metrics.totalQuestions >= 50 && metrics.lectureRatio < 0.2) {
    practice = "PRACTICE_HEAVY";
  } else {
    practice = "BALANCED";
  }

  // 5. Recovery State
  let recovery: RecoveryState = "WELL_RECOVERED";
  if (data.sleep < 5.5 && data.hours >= 8) {
    recovery = "BURNOUT_RISK";
  } else if (data.sleep < 5.5) {
    recovery = "SEVERE_SLEEP_DEFICIT";
  } else if (trends.sleepDebt7d > 10.0) {
    recovery = "ACCUMULATED_DEBT";
  } else if (data.sleep < 6.5) {
    recovery = "MILD_SLEEP_DEFICIT";
  } else if (trends.sleepSlope > 0.3) {
    recovery = "RECOVERY_TREND";
  } else {
    recovery = "WELL_RECOVERED";
  }

  // 6. Screen State
  let screen: ScreenState = "CONTROLLED";
  if (data.screenTime > 5.5) {
    screen = "HIGH";
  } else if (trends.screenEscalating) {
    screen = "ESCALATING";
  } else if (data.screenTime > 3.5) {
    screen = "MODERATE";
  } else {
    screen = "CONTROLLED";
  }

  return {
    performance,
    trend,
    planning,
    practice,
    recovery,
    screen,
    streakContext: {
      days: data.streakDays,
      justBroke: data.streakDays === 0 && baseline.dataPoints > 3,
    },
  };
}
