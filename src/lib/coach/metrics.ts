import { NormalizedStudentData, DerivedMetrics } from "./types";

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
      subjectDistribution[session.subject] = (subjectDistribution[session.subject] || 0) + (session.timeSpent ? session.timeSpent / 60 : attempted * 0.05);
    }
  }

  const accuracyOverall = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : data.accuracy || 0;
  const outputPerHour = data.hours > 0 ? Math.round(totalQuestions / data.hours) : totalQuestions;

  // Lecture vs Practice breakdown from logged tasks or todo types
  let lectureHours = 0;
  let practiceHours = 0;

  const allTasks = [...data.loggedTasksToday, ...data.completedTasks];
  for (const task of allTasks) {
    const taskHours = task.lectureHours || (task.durationMinutes ? task.durationMinutes / 60 : 0.5);
    const typeLower = (task.type || "").toLowerCase();
    if (typeLower.includes("lecture") || typeLower.includes("theory")) {
      lectureHours += taskHours;
    } else if (typeLower.includes("practice") || typeLower.includes("dpp") || typeLower.includes("pyq")) {
      practiceHours += taskHours;
    }
    if (task.subject) {
      subjectDistribution[task.subject] = (subjectDistribution[task.subject] || 0) + taskHours;
    }
  }

  const totalCategorizedHours = lectureHours + practiceHours;
  const lectureRatio = totalCategorizedHours > 0 ? lectureHours / totalCategorizedHours : (data.hours > 0 && totalQuestions < 10 ? 0.8 : 0.2);
  const practiceRatio = 1 - lectureRatio;

  // Task planning & completion metrics
  const plannedTaskCount = data.plannedTasks.length;
  const completedTaskIds = new Set(data.completedTasks.map((t) => t.id));
  const completedTaskCount = data.completedTasks.length;
  const taskCompletionRate = plannedTaskCount > 0 ? completedTaskCount / plannedTaskCount : 1;

  const highPriorityTasks = data.plannedTasks.filter((t) => t.priority === "High");
  const highPriorityCompleted = highPriorityTasks.filter((t) => completedTaskIds.has(t.id)).length;
  const highPriorityCompletionRate = highPriorityTasks.length > 0 ? highPriorityCompleted / highPriorityTasks.length : taskCompletionRate;

  const uncompletedTasks = data.plannedTasks.filter((t) => !completedTaskIds.has(t.id));
  const uncompletedTaskNames = uncompletedTasks.map((t) => t.text.trim()).filter(Boolean);

  // Detect neglected subjects (from standard subjects: Physics, Chemistry, Mathematics)
  const standardSubjects = ["Physics", "Chemistry", "Mathematics"];
  const neglectedSubjects: string[] = [];

  for (const sub of standardSubjects) {
    if (!subjectDistribution[sub] || subjectDistribution[sub] < 0.2) {
      neglectedSubjects.push(sub);
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
    sleepDebtToday,
    screenDeviation,
  };
}
