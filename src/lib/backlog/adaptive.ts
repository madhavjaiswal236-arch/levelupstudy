import { Todo } from '@/context/AppContext';
import { BacklogPlan, RecalculationDiff, RoadmapDay, RoadmapTask } from './types';
import { addDaysToDate, calculateDateDiffDays, calculateMetrics, generateRoadmap, generateTodosFromRoadmap } from './engine';

export function detectMissedBacklogTasks(
  todos: Todo[],
  planId: string,
  todayDateStr: string
): Todo[] {
  if (!planId) return [];

  return todos.filter(t => {
    if (!t.isBacklogTask || t.backlogPlanId !== planId || t.completed || t.isDeleted) {
      return false;
    }
    if (!t.startTime) return false;
    const taskDate = t.startTime.split('T')[0];
    return taskDate < todayDateStr;
  });
}

export function recalculateRoadmap(
  plan: BacklogPlan,
  currentTodos: Todo[],
  todayDateStr: string
): {
  updatedPlan: BacklogPlan;
  newTodos: Todo[];
  diff: RecalculationDiff;
} {
  const missedTasks = detectMissedBacklogTasks(currentTodos, plan.id, todayDateStr);
  const missedMinutes = missedTasks.reduce((acc, t) => acc + (t.durationMinutes || 60), 0);

  // Remaining days from today until deadline
  const remainingDays = Math.max(1, calculateDateDiffDays(todayDateStr, plan.settings.deadlineDate));

  // Determine updated plan settings
  const updatedSettings = {
    ...plan.settings,
    startDate: todayDateStr
  };

  // Recompute subjects queue by subtracting what is ALREADY completed in todos
  const completedTaskIds = new Set(
    currentTodos.filter(t => t.completed && t.backlogPlanId === plan.id).map(t => t.id)
  );

  // Recalculate remaining chapters from completed tasks
  const updatedSubjects = plan.subjects.map(sub => {
    return {
      ...sub,
      chapters: sub.chapters.map(chap => {
        // Count how many lectures of this chapter are completed
        const completedLecsForChap = currentTodos.filter(
          t => t.completed && t.backlogPlanId === plan.id && t.backlogChapterId === chap.id && t.backlogTaskType === 'lecture'
        ).length;

        const remainingLecs = Math.max(0, chap.lecturesRemaining - completedLecsForChap);
        return {
          ...chap,
          lecturesRemaining: remainingLecs
        };
      })
    };
  });

  const newMetrics = calculateMetrics(updatedSubjects, updatedSettings);
  const updatedPlan: BacklogPlan = {
    ...plan,
    subjects: updatedSubjects,
    settings: updatedSettings,
    metrics: newMetrics,
    updatedAt: new Date().toISOString()
  };

  const newRoadmap = generateRoadmap(updatedPlan);
  updatedPlan.roadmap = newRoadmap;

  // Generate new todos for future days
  const newFutureTodos = generateTodosFromRoadmap(newRoadmap, plan.id);

  // Combine: keep all COMPLETED todos and non-backlog todos, replace future incomplete backlog todos
  const preservedTodos = currentTodos.filter(
    t => !t.isBacklogTask || t.backlogPlanId !== plan.id || t.completed
  );

  const mergedTodos = [...preservedTodos, ...newFutureTodos];

  // Generate reassuring human diff summary
  const changesSummary: string[] = [];
  if (missedTasks.length > 0) {
    changesSummary.push(`${missedTasks.length} missed tasks (${Math.round(missedMinutes / 60)}h ${missedMinutes % 60}m) redistributed smoothly`);
    const bumpMins = Math.round(missedMinutes / Math.min(5, remainingDays));
    if (bumpMins > 0) {
      changesSummary.push(`+${bumpMins} min/day added across the next ${Math.min(5, remainingDays)} study days`);
    }
  }

  if (newMetrics.feasibilityRatio <= 1.05) {
    changesSummary.push(`Target deadline (${plan.settings.deadlineDate}) preserved with 0 compromise ✓`);
  } else {
    changesSummary.push(`Deadline tight — consider +30m capacity or adding 2 buffer days`);
  }
  changesSummary.push('Past history & completed chapters completely preserved.');

  const diff: RecalculationDiff = {
    missedTaskCount: missedTasks.length,
    missedMinutes,
    daysAdjusted: remainingDays,
    changesSummary,
    newProjectedCompletion: newMetrics.projectedCompletionDate,
    deadlinePreserved: newMetrics.feasibilityRatio <= 1.05,
    feasibilityStatus: newMetrics.feasibilityStatus
  };

  return {
    updatedPlan,
    newTodos: mergedTodos,
    diff
  };
}
