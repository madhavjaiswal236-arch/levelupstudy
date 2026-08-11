import { Capacitor } from '@capacitor/core';
import { generateDeterministicCoachReport, generateDeterministicDynamicInsight } from './coach/engine';

const API_BASE_URL = Capacitor.isNativePlatform() 
  ? 'https://ais-pre-2euhcrau4rvk3hkgfjrppb-413884331750.asia-southeast1.run.app' 
  : '';


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
}) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/ai-coach`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metrics),
    });

    if (!res.ok) {
      console.warn(`API returned status ${res.status}`);
      return generateStaticFeedback(metrics);
    }

    const data = await res.json();
    return data.feedback || generateStaticFeedback(metrics);
  } catch (err: any) {
    if (String(err).includes("Failed to fetch")) {
      console.warn("AI Coach Client: Server unavailable, using static fallback.");
    } else {
      console.warn("AI Coach Client Warning:", err?.message || err);
    }
    return generateStaticFeedback(metrics);
  }
}

export async function getDynamicInsight(metrics: {
  hoursToday: number,
  streak: number,
  questionsSolved: number,
  target: number,
  accuracy: number,
  pendingTasksCount: number,
  recentTaskTypes: string
}) {
  const staticFallback = getStaticDynamicInsight(metrics);
  try {
    const res = await fetch(`${API_BASE_URL}/api/dynamic-insight`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metrics),
    });

    if (!res.ok) {
      return staticFallback;
    }

    const data = await res.json();
    return data.insight || staticFallback;
  } catch (err: any) {
    return staticFallback;
  }
}

export function getStaticDynamicInsight(metrics: {
  hoursToday: number,
  streak: number,
  questionsSolved: number,
  target: number,
  accuracy: number,
  pendingTasksCount: number,
  recentTaskTypes: string
}) {
  return generateDeterministicDynamicInsight(metrics);
}

export function generateStaticFeedback(data: any) {
  const report = generateDeterministicCoachReport(data);
  return report.fullFormattedText;
}

