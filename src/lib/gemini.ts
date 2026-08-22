import { Capacitor } from '@capacitor/core';
import { generateDeterministicCoachReport, generateDeterministicDynamicInsight } from './coach/engine';
import { auth } from './firebase';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL 
  || (Capacitor.isNativePlatform() 
      ? ((import.meta as any).env?.VITE_API_URL || 'https://ais-pre-2euhcrau4rvk3hkgfjrppb-413884331750.asia-southeast1.run.app') 
      : '');

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  try {
    const user = auth?.currentUser;
    if (user) {
      const token = await user.getIdToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
  } catch (e) {
    // Guest or offline mode
  }
  return headers;
}

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
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/api/ai-coach`, {
      method: 'POST',
      headers,
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
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/api/dynamic-insight`, {
      method: 'POST',
      headers,
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

