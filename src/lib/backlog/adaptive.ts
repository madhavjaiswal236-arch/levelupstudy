import { Todo } from '@/context/AppContext';
import { BacklogPlan, RecalculationDiff, RoadmapDay, RoadmapTask, BacklogSubject } from './types';
import {
  addDaysToDate,
  calculateDateDiffDays,
  calculateMetrics,
  generateRoadmap,
  generateTodosFromRoadmap
} from './engine';
import { getTaskSignature, getTaskSignaturesWithLegacy } from './signature';
import { getLocalDateString } from '@/lib/utils';

export function detectMissedBacklogTasks(
  todos: Todo[],
  planId: string,
  todayDateStr?: string
): Todo[] {
  if (!planId) return [];
  const referenceDate = todayDateStr || getLocalDateString();

  return todos.filter(t => {
    if (!t.isBacklogTask || t.backlogPlanId !== planId || t.completed || t.isDeleted) {
      return false;
    }
    const taskDate = t.dateScheduled || (t.startTime ? t.startTime.split('T')[0] : '');
    if (!taskDate) return false;
    return taskDate < referenceDate;
  });
}

export function recalculateRoadmap(
  plan: BacklogPlan,
  currentTodos: Todo[],
  todayDateStr?: string,
  preferredStrategy?: 'SMOOTH' | 'WEEKEND_CATCHUP' | 'EXTEND_DEADLINE'
): {
  updatedPlan: BacklogPlan;
  newTodos: Todo[];
  diff: RecalculationDiff;
} {
  const referenceDate = todayDateStr || getLocalDateString();
  const missedTasks = detectMissedBacklogTasks(currentTodos, plan.id, referenceDate);
  const missedMinutes = missedTasks.reduce((acc, t) => acc + (t.durationMinutes || 60), 0);

  // Preserve immutable original syllabus source to prevent progressive subtraction drift
  const sourceSubjects: BacklogSubject[] = plan.originalSubjects && plan.originalSubjects.length > 0
    ? plan.originalSubjects
    : plan.subjects;

  // Selected recovery strategy
  const activeStrategy = preferredStrategy || plan.settings.recoveryStrategy || 'SMOOTH';

  // Calculate remaining days from today until deadline
  let effectiveDeadline = plan.settings.deadlineDate;
  if (activeStrategy === 'EXTEND_DEADLINE') {
    // Extend deadline by the required days to keep workload completely flat
    const extraDaysNeeded = Math.ceil(missedMinutes / Math.max(30, plan.settings.targetDailyMinutes));
    if (extraDaysNeeded > 0) {
      effectiveDeadline = addDaysToDate(plan.settings.deadlineDate, extraDaysNeeded);
    }
  }

  const remainingDays = Math.max(1, calculateDateDiffDays(referenceDate, effectiveDeadline));

  // Determine updated plan settings with anti-burnout surge cap
  const maxSurge = plan.settings.maxDailySurgeMinutes || Math.min(60, Math.round(plan.settings.targetDailyMinutes * 0.15));
  const updatedSettings = {
    ...plan.settings,
    startDate: referenceDate,
    deadlineDate: effectiveDeadline,
    recoveryStrategy: activeStrategy,
    maxDailySurgeMinutes: maxSurge
  };

  // Collect all completed backlog tasks and build signature set (with legacy aliases)
  const completedBacklogTasks = currentTodos.filter(
    t => t.completed && t.isBacklogTask && (!t.backlogPlanId || t.backlogPlanId === plan.id)
  );

  const completedSignatures = new Set<string>();
  completedBacklogTasks.forEach(t => {
    getTaskSignaturesWithLegacy(t).forEach(sig => completedSignatures.add(sig));
  });

  // Derive remaining work from original source without destructive mutation
  const updatedSubjects = sourceSubjects.map(sub => {
    return {
      ...sub,
      chapters: sub.chapters.map(chap => {
        // Collect completed lecture numbers for this chapter
        const completedLectureNumbers = new Set(
          completedBacklogTasks
            .filter(t => (t.backlogChapterId === chap.id || t.chapter === chap.name) && (t.backlogTaskType === 'lecture' || t.type === 'Lecture') && typeof t.lectureNumber === 'number')
            .map(t => t.lectureNumber!)
        );

        let remainingSelectedLectures: number[] | undefined;
        let remainingLecs = 0;

        if (chap.selectedLectures && chap.selectedLectures.length > 0) {
          remainingSelectedLectures = chap.selectedLectures.filter(
            lecNum => !completedLectureNumbers.has(lecNum)
          );
          remainingLecs = remainingSelectedLectures.length;
        } else {
          const totalEnrolled = chap.totalLecturesInChapter && chap.totalLecturesInChapter >= chap.lecturesRemaining
            ? chap.totalLecturesInChapter
            : chap.lecturesRemaining;
          remainingLecs = Math.max(0, totalEnrolled - completedLectureNumbers.size);
        }

        return {
          ...chap,
          selectedLectures: remainingSelectedLectures,
          lecturesRemaining: remainingLecs
        };
      })
    };
  });

  const newMetrics = calculateMetrics(updatedSubjects, updatedSettings);
  const updatedPlan: BacklogPlan = {
    ...plan,
    subjects: updatedSubjects,
    originalSubjects: sourceSubjects, // Preserved immutable source
    settings: updatedSettings,
    metrics: newMetrics,
    updatedAt: new Date().toISOString()
  };

  const newRoadmap = generateRoadmap(updatedPlan);
  updatedPlan.roadmap = newRoadmap;

  // Generate new todos for future days and filter out any that match already-completed signatures
  const newFutureTodos = generateTodosFromRoadmap(newRoadmap, plan.id);
  const freshTasks = newFutureTodos.filter(t => {
    const sigs = getTaskSignaturesWithLegacy(t);
    return !sigs.some(s => completedSignatures.has(s));
  });

  // Preserve user custom modifications on existing incomplete future tasks (e.g., custom time notes)
  const existingFutureIncompleteMap = new Map<string, Todo>();
  currentTodos
    .filter(t => t.isBacklogTask && t.backlogPlanId === plan.id && !t.completed && !t.isDeleted)
    .forEach(t => {
      const sig = getTaskSignature(t);
      existingFutureIncompleteMap.set(sig, t);
    });

  const reconciledFreshTasks = freshTasks.map(fresh => {
    const sig = getTaskSignature(fresh);
    const existing = existingFutureIncompleteMap.get(sig);
    if (existing) {
      // Retain custom priority or user-adjusted duration if present
      return {
        ...fresh,
        priority: existing.priority || fresh.priority,
        durationMinutes: existing.durationMinutes || fresh.durationMinutes
      };
    }
    return fresh;
  });

  // Combine: keep all COMPLETED todos and non-backlog todos, replace incomplete backlog todos with reconciled fresh ones
  const preservedTodos = currentTodos.filter(
    t => !t.isBacklogTask || t.backlogPlanId !== plan.id || t.completed
  );

  const mergedTodos = [...preservedTodos, ...reconciledFreshTasks];

  // Daily diff calculations
  const oldDailyMins = plan.metrics.requiredDailyMinutes || plan.settings.targetDailyMinutes;
  const newDailyMins = newMetrics.requiredDailyMinutes;
  const dailyDiff = newDailyMins - oldDailyMins;

  // Generate reassuring and honest human diff summary
  const changesSummary: string[] = [];
  let overflowWarning: string | undefined;

  if (missedTasks.length > 0) {
    const missedHours = Math.floor(missedMinutes / 60);
    const missedMinsRemainder = missedMinutes % 60;
    changesSummary.push(`${missedTasks.length} missed tasks (${missedHours}h ${missedMinsRemainder}m) redistributed via ${activeStrategy.replace('_', ' ').toLowerCase()}`);

    if (activeStrategy === 'EXTEND_DEADLINE') {
      changesSummary.push(`Deadline shifted to ${effectiveDeadline} to keep daily workload completely comfortable (0m extra stress)`);
    } else if (activeStrategy === 'WEEKEND_CATCHUP') {
      changesSummary.push(`Weekdays kept calm; catch-up concentrated onto upcoming weekend focus sessions`);
    } else {
      if (dailyDiff > 0) {
        changesSummary.push(`+${Math.min(maxSurge, dailyDiff)} min/day smooth adjustment across remaining days`);
      } else {
        changesSummary.push(`Daily pace sustained without surge`);
      }
    }
  }

  if (newMetrics.feasibilityRatio > 1.15) {
    overflowWarning = `Workload exceeds daily surge limit (+${maxSurge}m). Consider extending deadline by 2–3 buffer days for realistic mastery.`;
    changesSummary.push(overflowWarning);
  } else if (newMetrics.feasibilityRatio <= 1.0) {
    changesSummary.push(`Target deadline preserved with 100% feasibility ✓`);
  } else {
    changesSummary.push(`Pace is tight but achievable with consistent study.`);
  }

  changesSummary.push('Past study history and completed chapters fully preserved.');

  const diff: RecalculationDiff = {
    missedTaskCount: missedTasks.length,
    missedMinutes,
    daysAdjusted: remainingDays,
    changesSummary,
    newProjectedCompletion: newMetrics.projectedCompletionDate,
    deadlinePreserved: newMetrics.feasibilityRatio <= 1.05 && effectiveDeadline === plan.settings.deadlineDate,
    feasibilityStatus: newMetrics.feasibilityStatus,
    currentAvgDailyMinutes: oldDailyMins,
    newAvgDailyMinutes: newDailyMins,
    dailySurgeMinutes: Math.max(0, dailyDiff),
    recommendedStrategy: newMetrics.feasibilityRatio > 1.15 ? 'EXTEND_DEADLINE' : 'SMOOTH',
    overflowWarning
  };

  return {
    updatedPlan,
    newTodos: mergedTodos,
    diff
  };
}
