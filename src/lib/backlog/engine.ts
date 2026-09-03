import {
  BacklogPlan,
  BacklogPlanMetrics,
  BacklogPlanSettings,
  BacklogSubject,
  BacklogChapterInput,
  FeasibilityStatus,
  RoadmapDay,
  RoadmapTask
} from './types';
import { Todo, generateUniqueTaskId } from '@/context/AppContext';

export function calculateDateDiffDays(startDateStr: string, endDateStr: string): number {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  const diffTime = end.getTime() - start.getTime();
  return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);
}

export function addDaysToDate(dateStr: string, daysToAdd: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + daysToAdd);
  return date.toISOString().split('T')[0];
}

export function calculateMetrics(
  subjects: BacklogSubject[],
  settings: BacklogPlanSettings
): BacklogPlanMetrics {
  let totalLectures = 0;
  let totalLectureMinutes = 0;
  let totalPracticeQuestions = 0;
  let totalPracticeMinutes = 0;
  let totalRevisionMinutes = 0;
  let totalTestMinutes = 0;

  subjects.forEach(subject => {
    subject.chapters.forEach(chap => {
      const lecs = chap.selectedLectures && chap.selectedLectures.length > 0
        ? chap.selectedLectures.length
        : Math.max(0, chap.lecturesRemaining || 0);
      const dur = Math.max(15, chap.lectureDurationMinutes || 120);
      totalLectures += lecs;
      totalLectureMinutes += lecs * dur;

      if (chap.practice?.enabled) {
        const qCount = Math.max(0, chap.practice.questionCount || 0);
        totalPracticeQuestions += qCount;
        const pMins = chap.practice.customDurationMinutes || (qCount * (chap.practice.estimatedMinutesPerQuestion || 2));
        totalPracticeMinutes += pMins;
      }

      if (settings.revisionEnabled && lecs > 0) {
        const revSessions = Math.max(1, Math.floor(lecs / (settings.revisionAfterEveryNLectures || 6)));
        totalRevisionMinutes += revSessions * (settings.revisionDurationMinutes || 45);
      }

      if (settings.testEnabled && settings.testAfterChapterCompletion && lecs > 0) {
        totalTestMinutes += settings.testDurationMinutes || 90;
      }
    });
  });

  const totalWorkloadMinutes = totalLectureMinutes + totalPracticeMinutes + totalRevisionMinutes + totalTestMinutes;
  const totalWorkloadHours = +(totalWorkloadMinutes / 60).toFixed(1);

  const calendarDays = calculateDateDiffDays(settings.startDate, settings.deadlineDate);
  const buffer = Math.max(0, settings.bufferDays || 0);
  const availableStudyDays = Math.max(1, calendarDays - buffer);

  const requiredDailyMinutes = Math.round(totalWorkloadMinutes / availableStudyDays);
  const requiredDailyLectures = +(totalLectures / availableStudyDays).toFixed(1);

  const targetMins = Math.max(30, settings.targetDailyMinutes || 240);
  const ratio = requiredDailyMinutes / targetMins;

  let feasibilityStatus: FeasibilityStatus = 'ON_TRACK';
  let healthScore = 85;

  if (ratio <= 0.80) {
    feasibilityStatus = 'COMFORTABLE';
    healthScore = 98;
  } else if (ratio <= 0.95) {
    feasibilityStatus = 'ON_TRACK';
    healthScore = 88;
  } else if (ratio <= 1.05) {
    feasibilityStatus = 'TIGHT';
    healthScore = 72;
  } else if (ratio <= 1.25) {
    feasibilityStatus = 'AT_RISK';
    healthScore = 50;
  } else {
    feasibilityStatus = 'IMPOSSIBLE';
    healthScore = 20;
  }

  // Projected completion date
  const neededDays = Math.ceil(totalWorkloadMinutes / targetMins);
  const projectedCompletionDate = addDaysToDate(settings.startDate, neededDays - 1);
  const bufferDaysRemaining = Math.max(0, calendarDays - neededDays);

  return {
    totalLectures,
    totalLectureMinutes,
    totalPracticeQuestions,
    totalPracticeMinutes,
    totalRevisionMinutes,
    totalTestMinutes,
    totalWorkloadMinutes,
    totalWorkloadHours,
    calendarDays,
    availableStudyDays,
    requiredDailyMinutes,
    requiredDailyLectures,
    feasibilityStatus,
    feasibilityRatio: +ratio.toFixed(2),
    projectedCompletionDate,
    bufferDaysRemaining,
    healthScore
  };
}

interface InternalTaskItem {
  id: string;
  type: 'lecture' | 'practice' | 'revision' | 'test';
  title: string;
  subject: string;
  chapter: string;
  chapterId: string;
  lectureNumber?: number;
  questionCount?: number;
  durationMinutes: number;
}

export function generateRoadmap(plan: BacklogPlan): RoadmapDay[] {
  const { subjects, settings } = plan;
  const targetDailyMinutes = Math.max(30, settings.targetDailyMinutes || 240);

  // 1. Build ordered queues per subject respecting chapter order
  const subjectQueues: {
    subject: string;
    tasks: InternalTaskItem[];
  }[] = [];

  subjects.forEach(sub => {
    const sortedChapters = [...sub.chapters].sort((a, b) => (a.order || 0) - (b.order || 0));
    const subTasks: InternalTaskItem[] = [];

    sortedChapters.forEach(chap => {
      const lectureList = chap.selectedLectures && chap.selectedLectures.length > 0
        ? [...chap.selectedLectures].sort((a, b) => a - b)
        : Array.from({ length: Math.max(0, chap.lecturesRemaining || 0) }, (_, i) => i + 1);

      const lecs = lectureList.length;
      const lecDur = Math.max(15, chap.lectureDurationMinutes || 120);
      const practiceEnabled = Boolean(chap.practice?.enabled && chap.practice.questionCount > 0);
      const totalPracticeMins = practiceEnabled
        ? (chap.practice.customDurationMinutes || (chap.practice.questionCount * (chap.practice.estimatedMinutesPerQuestion || 2)))
        : 0;

      // Group lectures and practice smartly
      lectureList.forEach((lecNum, idx) => {
        subTasks.push({
          id: `task_${chap.id}_lec_${lecNum}`,
          type: 'lecture',
          title: `${chap.name} — Lecture ${lecNum}`,
          subject: sub.name,
          chapter: chap.name,
          chapterId: chap.id,
          lectureNumber: lecNum,
          durationMinutes: lecDur
        });

        // Insert mid-chapter practice after halfway point if long chapter
        if (practiceEnabled && lecs >= 6 && idx === Math.floor(lecs / 2) - 1) {
          const midPracticeMins = Math.round(totalPracticeMins * 0.45);
          const midQuestions = Math.round((chap.practice.questionCount || 50) * 0.45);
          subTasks.push({
            id: `task_${chap.id}_practice_mid`,
            type: 'practice',
            title: `${chap.name} Practice (${midQuestions} Questions)`,
            subject: sub.name,
            chapter: chap.name,
            chapterId: chap.id,
            questionCount: midQuestions,
            durationMinutes: midPracticeMins
          });
        }

        // Insert revision block if enabled
        if (settings.revisionEnabled && (idx + 1) % (settings.revisionAfterEveryNLectures || 6) === 0 && idx + 1 < lecs) {
          subTasks.push({
            id: `task_${chap.id}_rev_${lecNum}`,
            type: 'revision',
            title: `Revision — ${chap.name} (Part ${Math.floor((idx + 1) / 6)})`,
            subject: sub.name,
            chapter: chap.name,
            chapterId: chap.id,
            durationMinutes: settings.revisionDurationMinutes || 45
          });
        }
      });

      // End of chapter practice
      if (practiceEnabled) {
        const endPracticeMins = lecs >= 6 ? Math.round(totalPracticeMins * 0.55) : totalPracticeMins;
        const endQuestions = lecs >= 6 ? Math.round((chap.practice.questionCount || 50) * 0.55) : (chap.practice.questionCount || 50);
        subTasks.push({
          id: `task_${chap.id}_practice_final`,
          type: 'practice',
          title: `${chap.name} Mastery Practice (${endQuestions} Questions)`,
          subject: sub.name,
          chapter: chap.name,
          chapterId: chap.id,
          questionCount: endQuestions,
          durationMinutes: endPracticeMins
        });
      }

      // End of chapter full revision
      if (settings.revisionEnabled && lecs > 0) {
        subTasks.push({
          id: `task_${chap.id}_rev_final`,
          type: 'revision',
          title: `Full Chapter Revision — ${chap.name}`,
          subject: sub.name,
          chapter: chap.name,
          chapterId: chap.id,
          durationMinutes: settings.revisionDurationMinutes || 45
        });
      }

      // Chapter test if enabled
      if (settings.testEnabled && settings.testAfterChapterCompletion && lecs > 0) {
        subTasks.push({
          id: `task_${chap.id}_test`,
          type: 'test',
          title: `Chapter Test & Analysis — ${chap.name}`,
          subject: sub.name,
          chapter: chap.name,
          chapterId: chap.id,
          durationMinutes: settings.testDurationMinutes || 90
        });
      }
    });

    if (subTasks.length > 0) {
      subjectQueues.push({
        subject: sub.name,
        tasks: subTasks
      });
    }
  });

  const roadmap: RoadmapDay[] = [];
  let currentDayIndex = 1;
  const startDateStr = settings.startDate || new Date().toISOString().split('T')[0];
  let subjectRotationIndex = 0;

  // Distribute tasks across days with round-robin subject rotation
  while (subjectQueues.some(q => q.tasks.length > 0)) {
    const dayDate = addDaysToDate(startDateStr, currentDayIndex - 1);
    const dayTasks: RoadmapTask[] = [];
    let dayRemainingMins = targetDailyMinutes;

    // Check if we should make this day a lighter test/revision day
    let hasTest = false;

    let safetyLoop = 0;
    while (dayRemainingMins > 20 && subjectQueues.some(q => q.tasks.length > 0) && safetyLoop < 20) {
      safetyLoop++;

      const numTotalQueues = subjectQueues.length;
      let chosenQueue: typeof subjectQueues[0] | null = null;
      let chosenTaskIndex = -1;

      // Subject Rotation: Attempt round-robin selection starting at subjectRotationIndex
      const overflowAllowance = targetDailyMinutes * 0.15;
      for (let offset = 0; offset < numTotalQueues; offset++) {
        const qIdx = (subjectRotationIndex + offset) % numTotalQueues;
        const q = subjectQueues[qIdx];
        if (!q || q.tasks.length === 0) continue;

        const headTask = q.tasks[0];
        if (headTask.durationMinutes <= dayRemainingMins + overflowAllowance) {
          chosenQueue = q;
          chosenTaskIndex = 0;
          subjectRotationIndex = (qIdx + 1) % numTotalQueues;
          break;
        }
      }

      // If head task didn't fit, check if any subject in rotation has a smaller task (e.g. revision or practice)
      if (!chosenQueue) {
        for (let offset = 0; offset < numTotalQueues; offset++) {
          const qIdx = (subjectRotationIndex + offset) % numTotalQueues;
          const q = subjectQueues[qIdx];
          if (!q || q.tasks.length === 0) continue;

          const smallerIdx = q.tasks.findIndex(t => t.durationMinutes <= dayRemainingMins);
          if (smallerIdx !== -1) {
            chosenQueue = q;
            chosenTaskIndex = smallerIdx;
            subjectRotationIndex = (qIdx + 1) % numTotalQueues;
            break;
          }
        }
      }

      if (chosenQueue && chosenTaskIndex !== -1) {
        const popped = chosenQueue.tasks.splice(chosenTaskIndex, 1)[0];
        dayTasks.push({
          ...popped,
          plannedDate: dayDate,
          dayIndex: currentDayIndex
        });
        dayRemainingMins -= popped.durationMinutes;

        if (popped.type === 'test') {
          hasTest = true;
          // Don't overload test days with heavy work
          dayRemainingMins = Math.min(dayRemainingMins, 30);
        }
      } else {
        // No task fits without gross overflow; close this day realistically!
        break;
      }
    }

    const dayTotalMinutes = dayTasks.reduce((sum, t) => sum + t.durationMinutes, 0);
    let dayType: RoadmapDay['dayType'] = 'LEARNING';
    if (hasTest) {
      dayType = 'TEST';
    } else if (dayTasks.some(t => t.type === 'revision')) {
      dayType = 'REVISION';
    } else if (dayTotalMinutes < targetDailyMinutes * 0.6) {
      dayType = 'LIGHT';
    }

    const todayDateStr = new Date().toISOString().split('T')[0];
    roadmap.push({
      dayIndex: currentDayIndex,
      date: dayDate,
      dayType,
      tasks: dayTasks,
      totalMinutes: dayTotalMinutes,
      isToday: dayDate === todayDateStr
    });

    currentDayIndex++;
    if (currentDayIndex > 365) break; // Hard safety cap
  }

  return roadmap;
}

export function generateTodosFromRoadmap(roadmap: RoadmapDay[], planId: string): Todo[] {
  const todos: Todo[] = [];

  roadmap.forEach(day => {
    day.tasks.forEach((task, idx) => {
      // Create time slots in morning/afternoon/evening
      const startHour = 9 + Math.min(8, idx * 2);
      const startHourStr = String(startHour).padStart(2, '0') + ':00';
      const endHourStr = String(startHour + Math.max(1, Math.round(task.durationMinutes / 60))).padStart(2, '0') + ':00';

      const capitalizedType =
        task.type === 'lecture' ? 'Lecture' :
        task.type === 'practice' ? 'Practice' :
        task.type === 'revision' ? 'Revision' : 'Test';

      const xp = Math.max(60, Math.round(task.durationMinutes * 1.5));

      todos.push({
        id: generateUniqueTaskId(`bl_${task.chapterId.slice(0, 6)}`),
        text: task.title,
        completed: false,
        xpReward: xp,
        type: capitalizedType,
        priority: task.type === 'lecture' || task.type === 'test' ? 'High' : 'Medium',
        subject: task.subject,
        chapter: task.chapter,
        lectureNumber: task.lectureNumber,
        startTime: `${day.date}T${startHourStr}`,
        endTime: `${day.date}T${endHourStr}`,
        durationMinutes: task.durationMinutes,
        backlogPlanId: planId,
        backlogChapterId: task.chapterId,
        backlogDayIndex: day.dayIndex,
        backlogTaskType: task.type,
        isBacklogTask: true,
        dateScheduled: day.date
      });
    });
  });

  return todos;
}

export function simulatePlan(
  plan: BacklogPlan,
  overrides: {
    targetDailyMinutes?: number;
    deadlineDate?: string;
  }
) {
  const tempSettings: BacklogPlanSettings = {
    ...plan.settings,
    ...overrides
  };

  const metrics = calculateMetrics(plan.subjects, tempSettings);
  return {
    metrics,
    daysSaved: plan.metrics.calendarDays - metrics.calendarDays,
    hoursDiff: +((tempSettings.targetDailyMinutes - plan.settings.targetDailyMinutes) / 60).toFixed(1)
  };
}

export function reconstructPlanFromTodos(todos: Todo[]): BacklogPlan | null {
  const backlogTasks = todos.filter(t => t.isBacklogTask && !t.isDeleted);
  if (backlogTasks.length === 0) return null;

  const planId = backlogTasks.find(t => t.backlogPlanId)?.backlogPlanId || `plan_${Date.now()}`;

  // Find dates
  const dates = backlogTasks
    .map(t => t.dateScheduled || (t.startTime ? t.startTime.split('T')[0] : ''))
    .filter(Boolean)
    .sort();

  const startDate = dates.length > 0 ? dates[0] : new Date().toISOString().split('T')[0];
  const deadlineDate = dates.length > 0 ? dates[dates.length - 1] : addDaysToDate(startDate, 30);

  // Group by subject and chapter
  const subjectsMap: Record<string, Map<string, {
    id: string;
    name: string;
    lectures: number[];
    lectureDurations: number[];
    practiceCount: number;
    hasRevision: boolean;
    hasTest: boolean;
    order: number;
  }>> = {
    Physics: new Map(),
    Chemistry: new Map(),
    Mathematics: new Map()
  };

  backlogTasks.forEach((t) => {
    const subName = (t.subject === 'Physics' || t.subject === 'Chemistry' || t.subject === 'Mathematics')
      ? t.subject
      : 'Physics';
    const chapName = t.chapter || 'Backlog Chapter';
    const chapId = t.backlogChapterId || `chap_${chapName.toLowerCase().replace(/\s+/g, '_')}`;

    const map = subjectsMap[subName];
    if (!map.has(chapName)) {
      map.set(chapName, {
        id: chapId,
        name: chapName,
        lectures: [],
        lectureDurations: [],
        practiceCount: 0,
        hasRevision: false,
        hasTest: false,
        order: map.size + 1
      });
    }

    const chapEntry = map.get(chapName)!;
    if (t.backlogTaskType === 'lecture') {
      const lecNum = t.lectureNumber || (chapEntry.lectures.length + 1);
      if (!chapEntry.lectures.includes(lecNum)) {
        chapEntry.lectures.push(lecNum);
      }
      if (t.durationMinutes) {
        chapEntry.lectureDurations.push(t.durationMinutes);
      }
    } else if (t.backlogTaskType === 'practice') {
      chapEntry.practiceCount += 25;
    } else if (t.backlogTaskType === 'revision') {
      chapEntry.hasRevision = true;
    } else if (t.backlogTaskType === 'test') {
      chapEntry.hasTest = true;
    }
  });

  const subjects: BacklogSubject[] = (['Physics', 'Chemistry', 'Mathematics'] as const).map(subName => {
    const color = subName === 'Physics' ? '#3B82F6' : subName === 'Chemistry' ? '#10B981' : '#F59E0B';
    const chapters: BacklogChapterInput[] = Array.from(subjectsMap[subName].values()).map(c => {
      const lecs = c.lectures.length > 0 ? c.lectures.sort((a, b) => a - b) : [1];
      const avgDur = c.lectureDurations.length > 0
        ? Math.round(c.lectureDurations.reduce((a, b) => a + b, 0) / c.lectureDurations.length)
        : 105;

      return {
        id: c.id,
        name: c.name,
        subject: subName,
        lecturesRemaining: lecs.length,
        selectedLectures: lecs,
        lectureDurationMinutes: avgDur,
        difficulty: 'Medium' as const,
        priority: 'Medium' as const,
        order: c.order,
        practice: {
          enabled: c.practiceCount > 0,
          questionCount: c.practiceCount > 0 ? c.practiceCount : 30,
          estimatedMinutesPerQuestion: 2
        }
      };
    });

    return {
      id: subName.toLowerCase(),
      name: subName,
      color,
      chapters
    };
  });

  const totalMinutes = backlogTasks.reduce((sum, t) => sum + (t.durationMinutes || 90), 0);
  const diffDays = calculateDateDiffDays(startDate, deadlineDate);
  const targetDailyMinutes = Math.min(600, Math.max(60, Math.round(totalMinutes / Math.max(1, diffDays))));

  const settings: BacklogPlanSettings = {
    startDate,
    deadlineDate,
    capacityMode: 'hours',
    targetDailyMinutes,
    targetDailyLectures: Math.max(1, Math.round(targetDailyMinutes / 105)),
    revisionEnabled: true,
    revisionAfterEveryNLectures: 6,
    revisionDurationMinutes: 45,
    testEnabled: true,
    testAfterChapterCompletion: true,
    testDurationMinutes: 90,
    bufferDays: Math.max(1, Math.round(diffDays * 0.1))
  };

  const metrics = calculateMetrics(subjects, settings);
  const plan: BacklogPlan = {
    id: planId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    subjects,
    settings,
    metrics
  };

  plan.roadmap = generateRoadmap(plan);
  return plan;
}
