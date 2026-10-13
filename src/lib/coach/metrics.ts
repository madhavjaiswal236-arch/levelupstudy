// src/lib/coach/metrics.ts
/**
 * Metrics Computation & Normalized Cognitive Yield.
 * Resolves Defect A11: Normalizes cognitive yield multipliers to 1.0 (active retrieval/timed solving),
 * 0.75 (guided practice/worked examples), and 0.35 (passive lecture/rereading).
 * Cognitive yield can never exceed actual hours worked.
 */

import type { NormalizedStudentData, DerivedMetrics, CoachInput } from "./types";

export function computeCognitiveYield(
  lectureHours: number,
  practiceHours: number,
  totalHours: number,
): number {
  // Dunlosky normalized design heuristics (A11):
  // Active retrieval / practice sets: 1.0
  // Mixed / structured scaffolding: 0.75
  // Passive lecture / rereading: 0.35
  const yieldEst = 1.0 * practiceHours + 0.35 * lectureHours;
  // Yield is capped at total hours worked
  return Math.min(totalHours, Math.round(yieldEst * 10) / 10);
}

export function computeMetrics(data: NormalizedStudentData): DerivedMetrics {
  // Practice metrics
  let totalQuestions = 0;
  let totalCorrect = 0;
  const subjectDistribution: Record<string, number> = {};

  for (const session of data.practiceSessions) {
    const attempted = Math.max(0, session.attempted || 0);
    const correct = Math.max(0, Math.min(attempted, session.correct || 0));
    totalQuestions += attempted;
    totalCorrect += correct;

    if (session.subject) {
      subjectDistribution[session.subject] =
        (subjectDistribution[session.subject] || 0) +
        (session.timeSpent ? session.timeSpent / 60 : attempted * 0.05);
    }
  }

  const accuracyOverall =
    totalQuestions > 0
      ? Math.round((totalCorrect / totalQuestions) * 100)
      : data.accuracy || 0;
  const outputPerHour =
    data.hours > 0 ? Math.round(totalQuestions / data.hours) : totalQuestions;

  // Lecture vs Practice breakdown from logged tasks or todo types
  let lectureHours = 0;
  let practiceHours = 0;

  // Deduplicate tasks by ID/text
  const seenTaskIds = new Set<string>();
  const allTasks: typeof data.loggedTasksToday = [];

  for (const t of [...data.loggedTasksToday, ...data.completedTasks]) {
    const key = t.id
      ? String(t.id)
      : `${t.text}_${t.type || ""}_${t.subject || ""}_${t.lectureHours || 0}`;
    if (!seenTaskIds.has(key)) {
      seenTaskIds.add(key);
      allTasks.push(t);
    }
  }

  for (const task of allTasks) {
    const taskHours =
      task.lectureHours ||
      (task.durationMinutes ? task.durationMinutes / 60 : 0.5);
    const typeLower = (task.type || "").toLowerCase();
    if (typeLower.includes("lecture") || typeLower.includes("theory")) {
      lectureHours += taskHours;
    } else if (
      typeLower.includes("practice") ||
      typeLower.includes("dpp") ||
      typeLower.includes("pyq")
    ) {
      practiceHours += taskHours;
    }
    if (task.subject) {
      subjectDistribution[task.subject] =
        (subjectDistribution[task.subject] || 0) + taskHours;
    }
  }

  const totalCategorizedHours = lectureHours + practiceHours;
  const lectureRatio =
    totalCategorizedHours > 0
      ? lectureHours / totalCategorizedHours
      : data.hours > 0 && totalQuestions < 10
        ? 0.8
        : 0.2;
  const practiceRatio = 1 - lectureRatio;

  // Task planning & completion metrics
  const plannedTaskCount = data.plannedTasks.length;
  const completedTaskIds = new Set(data.completedTasks.map((t) => t.id));
  const completedTaskCount = data.completedTasks.length;
  const taskCompletionRate =
    plannedTaskCount > 0
      ? Math.min(1, Math.max(0, completedTaskCount / plannedTaskCount))
      : 1;

  const highPriorityTasks = data.plannedTasks.filter(
    (t) => t.priority === "High",
  );
  const highPriorityCompleted = highPriorityTasks.filter((t) =>
    completedTaskIds.has(t.id),
  ).length;
  const highPriorityCompletionRate =
    highPriorityTasks.length > 0
      ? Math.min(1, Math.max(0, highPriorityCompleted / highPriorityTasks.length))
      : taskCompletionRate;

  const uncompletedTasks = data.plannedTasks.filter(
    (t) => !completedTaskIds.has(t.id),
  );
  const uncompletedTaskNames = uncompletedTasks
    .map((t) =>
      t && typeof t.text === "string"
        ? t.text.trim()
        : (t as any)?.title
          ? String((t as any).title).trim()
          : "Study Task",
    )
    .filter(Boolean);

  const standardSubjects = ["Physics", "Chemistry", "Mathematics"];
  const neglectedSubjects: string[] = [];

  for (const sub of standardSubjects) {
    if (!subjectDistribution[sub] || subjectDistribution[sub] < 0.2) {
      neglectedSubjects.push(sub);
    }
  }

  let weakestSubject: string | undefined = undefined;
  let minVal = Infinity;
  for (const sub of standardSubjects) {
    const hoursSpent = subjectDistribution[sub] || 0;
    if (hoursSpent < minVal) {
      minVal = hoursSpent;
      weakestSubject = sub;
    }
  }

  const sleepDebtToday = Math.max(0, 7.5 - data.sleep);
  const screenDeviation = Math.max(0, data.screenTime - 3.5);

  return {
    totalQuestions,
    totalCorrect,
    accuracyOverall,
    outputPerHour,
    lectureHours,
    practiceHours,
    lectureRatio,
    practiceRatio,
    plannedTaskCount,
    completedTaskCount,
    taskCompletionRate,
    highPriorityCompletionRate,
    uncompletedTasks,
    uncompletedTaskNames,
    subjectDistribution,
    neglectedSubjects,
    weakestSubject,
    sleepDebtToday,
    screenDeviation,
  };
}
