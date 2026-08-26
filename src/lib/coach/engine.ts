import { RawCoachInput, DeterministicCoachReport } from "./types";
import { normalizeInput } from "./normalize";
import { computeMetrics } from "./metrics";
import { computeBaseline } from "./baseline";
import { computeTrends } from "./trends";
import { classifyMultiState } from "./states";
import { computeSeverity } from "./severity";
import { resolvePriority } from "./priority";
import { buildCoachReport } from "./missions";

/**
 * Canonical Deterministic Personal Student Mentoring Engine
 *
 * Runs 100% locally / server-side without external LLM dependencies.
 * Fully testable, deterministic, and reproducible.
 */
export function generateDeterministicCoachReport(input: RawCoachInput): DeterministicCoachReport {
  // Step 1: Normalize & Sanitize
  const normalized = normalizeInput(input);

  // Step 2: Compute Derived Metrics
  const metrics = computeMetrics(normalized);

  // Step 3: Compute Personal Baselines (EMA)
  const baseline = computeBaseline(normalized.history);

  // Step 4: Detect Temporal Trends
  const trends = computeTrends(normalized.history, normalized.hours, normalized.sleep, normalized.screenTime);

  // Step 5: Multi-Dimensional State Classification
  const state = classifyMultiState(normalized, metrics, baseline, trends);

  // Step 6: Severity Scoring
  const severity = computeSeverity(state, metrics);

  // Step 7: Priority Resolution
  const priority = resolvePriority(severity);

  // Step 8: Build Report & Response Sections
  return buildCoachReport(normalized, metrics, baseline, trends, state, severity, priority);
}

/**
 * Canonical Deterministic Dynamic Insight Generator
 * For live dashboard banners and real-time status locks.
 */
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
    targetXp: data.targetXp || data.dailyTarget || data.totalXpGoal || data.target || 1000,
    accuracy: data.accuracy || 0,
    history: data.history || [],
    plannedTasks: data.pendingTasksCount ? Array(data.pendingTasksCount).fill({ text: "Pending Task", completed: false }) : [],
    practiceSessions: data.questionsSolved ? [{
      id: "session_dynamic",
      date: new Date().toISOString(),
      subject: "General",
      chapter: "Practice",
      timeSpent: 30,
      attempted: data.questionsSolved,
      correct: Math.round((data.questionsSolved * (data.accuracy || 70)) / 100),
      mistakes: []
    }] : []
  });

  return `${report.diagnosis}\n\n🔒 Lock: ${report.todayMission}`;
}

