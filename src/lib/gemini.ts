import { Capacitor } from '@capacitor/core';
import { generateDeterministicCoachReport } from './coach/engine';

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
  const hrs = metrics.hoursToday || 0;
  const acc = metrics.accuracy || 0;
  const q = metrics.questionsSolved || 0;
  const tgt = metrics.target || 0;
  const streak = metrics.streak || 0;

  if (hrs < 2 && metrics.pendingTasksCount > 0) {
    return `You didn't fail willpower; you failed environmental design. Phone in another room. Win the next 30 minutes.\n\n🔒 Lock: Motion beats stagnation. Break the pattern.`;
  } else if (hrs > 4 && q < 15) {
    return `Reading theory is hiding from failure. Close the book. Give me one 25-minute problem sprint.\n\n🔒 Lock: Fake productivity alert. Chase friction.`;
  } else if (acc < 60 && q > 10) {
    return `You are recognizing theory, not recalling concepts. Read less. Solve more.\n\n🔒 Lock: Your error rate is bleeding out gains. Accuracy > Speed today.`;
  } else if (q >= tgt && tgt > 0) {
    return `Elite execution. You put up numbers today. Now drop it. The ego hangover will kill tomorrow's momentum.\n\n🔒 Lock: Targets hit. Acknowledge it, then drop it.`;
  } else if (streak >= 3) {
    return `Discipline is boring replication. The top 100 ranks aren't built on motivation.\n\n🔒 Lock: Protect the ${streak}-day streak. Return fast.`;
  }
  return "Hours don't crack JEE. Output does. Hunt weaknesses and track problems solved.\n\n🔒 Lock: Focus on execution.";
}

export function generateStaticFeedback(data: any) {
  const report = generateDeterministicCoachReport(data);
  return report.fullFormattedText;
}

