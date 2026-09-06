import { generateDeterministicCoachReport, generateDeterministicDynamicInsight } from './coach/engine';

/**
 * 100% Offline, Deterministic Student Coach & Dynamic Insights
 * Runs entirely locally without network calls, external AI APIs, or keys.
 */

export async function getAICoachFeedback(metrics: {
  hours: number;
  sleep: number;
  screenTime: number;
  completedTasksCount?: number;
  plannedTasksCount?: number;
  completedTasks?: any[];
  plannedTasks?: any[];
  practiceSessions?: any[];
  xpEarned: number;
  targetXp: number;
  level: number;
  streakDays: number;
  history?: any[];
  syllabus?: any;
  accuracy?: number;
  loggedTasksToday?: any[];
}): Promise<string> {
  // Instantly generate deterministic, personalized Goggins-style coaching report
  const report = generateDeterministicCoachReport(metrics);
  return report.fullFormattedText;
}

export async function getDynamicInsight(metrics: {
  hoursToday: number;
  streak: number;
  questionsSolved: number;
  target: number;
  accuracy: number;
  pendingTasksCount: number;
  recentTaskTypes: string;
}): Promise<string> {
  // Instantly generate deterministic live status lock
  return generateDeterministicDynamicInsight(metrics);
}

export function getStaticDynamicInsight(metrics: {
  hoursToday: number;
  streak: number;
  questionsSolved: number;
  target: number;
  accuracy: number;
  pendingTasksCount: number;
  recentTaskTypes: string;
}): string {
  return generateDeterministicDynamicInsight(metrics);
}

export function generateStaticFeedback(data: any): string {
  const report = generateDeterministicCoachReport(data);
  return report.fullFormattedText;
}


