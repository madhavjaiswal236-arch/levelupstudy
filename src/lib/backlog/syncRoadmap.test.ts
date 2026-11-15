import { describe, it, expect, vi } from 'vitest';
import {
  buildTodosFromRoadmapPreservingProgress,
  syncScheduleWithRoadmap,
  normalizeCalendarTitle,
} from './syncRoadmap';
import { generateRoadmap } from './engine';
import type { BacklogPlan, RoadmapDay } from './types';
import type { Todo } from '@/context/AppContext';
import { filterTodayTasks } from '@/lib/utils';

const makeRoadmap = (): RoadmapDay[] => [
  {
    dayIndex: 14,
    date: '2026-11-14',
    dayType: 'LEARNING',
    totalMinutes: 180,
    tasks: [
      {
        id: 't_d14_1',
        type: 'lecture',
        subject: 'Physics',
        chapter: 'friction',
        chapterId: 'ch_fric',
        lectureNumber: 1,
        title: 'friction — Lecture 1',
        durationMinutes: 180,
        plannedDate: '2026-11-14',
        dayIndex: 14,
      },
    ],
  },
  {
    dayIndex: 15,
    date: '2026-11-15',
    dayType: 'LEARNING',
    totalMinutes: 720,
    tasks: [
      {
        id: 't_d15_1',
        type: 'lecture',
        subject: 'Physics',
        chapter: 'friction',
        chapterId: 'ch_fric',
        lectureNumber: 2,
        title: 'friction — Lecture 2',
        durationMinutes: 180,
        plannedDate: '2026-11-15',
        dayIndex: 15,
      },
      {
        id: 't_d15_2',
        type: 'lecture',
        subject: 'Chemistry',
        chapter: 'Classification of Elements and Periodicity',
        chapterId: 'ch_class',
        lectureNumber: 4,
        title: 'Classification of Elements and Periodicity — Lecture 4',
        durationMinutes: 180,
        plannedDate: '2026-11-15',
        dayIndex: 15,
      },
      {
        id: 't_d15_3',
        type: 'lecture',
        subject: 'Mathematics',
        chapter: 'Trigonometric Functions',
        chapterId: 'ch_trig',
        lectureNumber: 1,
        title: 'Trigonometric Functions — Lecture 1',
        durationMinutes: 180,
        plannedDate: '2026-11-15',
        dayIndex: 15,
      },
      {
        id: 't_d15_4',
        type: 'lecture',
        subject: 'Physics',
        chapter: 'friction',
        chapterId: 'ch_fric',
        lectureNumber: 3,
        title: 'friction — Lecture 3',
        durationMinutes: 180,
        plannedDate: '2026-11-15',
        dayIndex: 15,
      },
    ],
  },
  {
    dayIndex: 16,
    date: '2026-11-16',
    dayType: 'REVISION',
    totalMinutes: 120,
    tasks: [
      {
        id: 't_d16_1',
        type: 'revision',
        subject: 'Physics',
        chapter: 'friction',
        chapterId: 'ch_fric',
        title: 'friction — Revision',
        durationMinutes: 120,
        plannedDate: '2026-11-16',
        dayIndex: 16,
      },
    ],
  },
];

const makePlan = (roadmap: RoadmapDay[]): BacklogPlan => ({
  id: 'plan_1',
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-15T00:00:00.000Z',
  subjects: [],
  settings: {
    startDate: '2026-11-14',
    deadlineDate: '2026-11-16',
    capacityMode: 'hours',
    targetDailyMinutes: 240,
    targetDailyLectures: 2,
    revisionEnabled: true,
    revisionAfterEveryNLectures: 6,
    revisionDurationMinutes: 60,
    testEnabled: true,
    testAfterChapterCompletion: true,
    testDurationMinutes: 90,
    bufferDays: 1,
  },
  metrics: {
    totalLectures: 6,
    totalLectureMinutes: 900,
    totalPracticeQuestions: 0,
    totalPracticeMinutes: 0,
    totalRevisionMinutes: 120,
    totalTestMinutes: 0,
    totalWorkloadMinutes: 1020,
    totalWorkloadHours: 17,
    calendarDays: 3,
    availableStudyDays: 2,
    requiredDailyMinutes: 420,
    requiredDailyLectures: 2,
    feasibilityStatus: 'ON_TRACK',
    feasibilityRatio: 1,
    projectedCompletionDate: '2026-11-16',
    bufferDaysRemaining: 1,
    healthScore: 85,
  },
  roadmap,
});

describe('syncRoadmap', () => {
  it('rebuilds Day 15 with all 4 roadmap tasks for Today Mission and tombstones stray tasks inside the roadmap window', () => {
    const roadmap = makeRoadmap();
    const existingTodos: Todo[] = [
      // Completed Chemistry task matching Day 15 #2
      {
        id: 101,
        text: 'Classification of Elements and Periodicity — Lecture 4',
        completed: true,
        completedAt: 1700000000000,
        completedDate: '2026-11-15',
        homeworkDone: true,
        dppDone: false,
        xpReward: 270,
        type: 'Lecture',
        subject: 'Chemistry',
        chapter: 'Classification of Elements and Periodicity',
        lectureNumber: 4,
        isBacklogTask: true,
        backlogChapterId: 'ch_class',
        backlogTaskType: 'lecture',
        dateScheduled: '2026-11-15',
      },
      // Stray non-roadmap task on 2026-11-15 ("his own stories in between")
      {
        id: 202,
        text: 'Random Extra Task Inside Roadmap Window',
        completed: false,
        xpReward: 60,
        type: 'Practice',
        subject: 'Physics',
        dateScheduled: '2026-11-15',
        startTime: '2026-11-15T11:00:00',
        endTime: '2026-11-15T12:00:00',
        calendarEventId: 'gcal_stray_local',
      },
      // Old backlog task from previous plan
      {
        id: 203,
        text: 'Old Backlog Task Removed From Roadmap',
        completed: false,
        xpReward: 60,
        type: 'Lecture',
        isBacklogTask: true,
        backlogChapterId: 'ch_old',
        dateScheduled: '2026-11-25',
      },
      // Undated incomplete task while today (2026-11-15) is inside roadmap window
      {
        id: 204,
        text: 'Undated Stray Task',
        completed: false,
        xpReward: 60,
        type: 'Practice',
      },
      // Non-backlog task strictly OUTSIDE roadmap window (must be preserved)
      {
        id: 301,
        text: 'Future Mock Exam Next Month',
        completed: false,
        xpReward: 100,
        type: 'Test',
        dateScheduled: '2026-12-10',
        startTime: '2026-12-10T10:00:00',
        endTime: '2026-12-10T13:00:00',
      },
    ];

    const result = buildTodosFromRoadmapPreservingProgress(roadmap, 'plan_1', existingTodos, {
      todayStr: '2026-11-15',
      nowMs: 1700050000000,
    });

    expect(result.planStartDate).toBe('2026-11-14');
    expect(result.planEndDate).toBe('2026-11-16');
    expect(result.activeRoadmapTodos).toHaveLength(6);

    // Filter Day 15 tasks using the exact Dashboard Today's Mission filter
    const todaysTasks = filterTodayTasks(result.syncedTodos, '2026-11-15');
    expect(todaysTasks.map((t) => t.text)).toEqual([
      'friction — Lecture 2',
      'Classification of Elements and Periodicity — Lecture 4',
      'Trigonometric Functions — Lecture 1',
      'friction — Lecture 3',
    ]);

    // Check sequential 09:00 + 15m break schedule on Day 15
    expect(todaysTasks[0].startTime).toBe('2026-11-15T09:00:00');
    expect(todaysTasks[0].endTime).toBe('2026-11-15T12:00:00');
    expect(todaysTasks[1].startTime).toBe('2026-11-15T12:15:00');
    expect(todaysTasks[1].endTime).toBe('2026-11-15T15:15:00');
    expect(todaysTasks[2].startTime).toBe('2026-11-15T15:30:00');
    expect(todaysTasks[2].endTime).toBe('2026-11-15T18:30:00');
    expect(todaysTasks[3].startTime).toBe('2026-11-15T18:45:00');
    expect(todaysTasks[3].endTime).toBe('2026-11-15T21:45:00');

    // Preserved completion metadata on matched Chemistry task
    expect(todaysTasks[1].completed).toBe(true);
    expect(todaysTasks[1].homeworkDone).toBe(true);
    expect(todaysTasks[1].xpReward).toBe(270);

    // Tombstones created for 202, 203, 204
    const deletedIds = result.deletedTodos.map((t) => t.id).sort();
    expect(deletedIds).toEqual([202, 203, 204]);
    expect(result.deletedTodos.every((t) => t.isDeleted && t.deletedAt === 1700050000000)).toBe(true);

    // Outside task 301 preserved cleanly
    expect(result.preservedOutsideTodos.map((t) => t.id)).toEqual([301]);
  });

  it('syncs Google Calendar by reusing exact matches, deleting all non-roadmap events in range, and creating missing events', async () => {
    const roadmap = makeRoadmap();
    const plan = makePlan(roadmap);

    // Exact timestamp matching local 2026-11-15T12:15:00 .. 15:15:00
    const d15Task2Start = new Date('2026-11-15T12:15:00').toISOString();
    const d15Task2End = new Date('2026-11-15T15:15:00').toISOString();

    const fetchedEvents = [
      // Exact match for Day 15 task 2 (even with [Done] prefix) -> SHOULD BE KEPT
      {
        id: 'gcal_keep_1',
        summary: '[Done] Classification of Elements and Periodicity — Lecture 4',
        start: { dateTime: d15Task2Start },
        end: { dateTime: d15Task2End },
      },
      // Wrong time for Day 15 task 1 -> SHOULD BE DELETED & RECREATED at 09:00
      {
        id: 'gcal_wrong_time',
        summary: 'friction — Lecture 2',
        start: { dateTime: new Date('2026-11-15T06:00:00').toISOString() },
        end: { dateTime: new Date('2026-11-15T09:00:00').toISOString() },
      },
      // Stray non-roadmap event inside roadmap window -> SHOULD BE DELETED
      {
        id: 'gcal_stray_in_window',
        summary: 'Random Distraction Event',
        start: { dateTime: new Date('2026-11-15T16:00:00').toISOString() },
        end: { dateTime: new Date('2026-11-15T17:00:00').toISOString() },
      },
      // All-day event on 2026-11-16 inside window -> SHOULD BE DELETED
      {
        id: 'gcal_allday_in_window',
        summary: 'Manual All Day Note',
        start: { date: '2026-11-16' },
        end: { date: '2026-11-17' },
      },
      // Read-only birthday inside window -> SHOULD NOT BE DELETED
      {
        id: 'gcal_birthday',
        eventType: 'birthday',
        summary: 'Friend Birthday',
        start: { date: '2026-11-15' },
        end: { date: '2026-11-16' },
      },
      // Event on 2026-11-20 strictly outside [2026-11-14 .. 2026-11-16] -> SHOULD NOT BE DELETED
      {
        id: 'gcal_outside',
        summary: 'Future Event',
        start: { dateTime: new Date('2026-11-20T10:00:00').toISOString() },
        end: { dateTime: new Date('2026-11-20T12:00:00').toISOString() },
      },
    ];

    const batchDeleteSpy = vi.fn(async (ids) => ids.length);
    let createCounter = 0;
    const createSpy = vi.fn(async (_title, startTime, endTime) => {
      createCounter++;
      return {
        id: `created_${createCounter}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      };
    });

    const res = await syncScheduleWithRoadmap({
      backlogPlan: plan,
      todos: [
        {
          id: 900,
          text: 'Old deleted local task',
          completed: false,
          xpReward: 50,
          type: 'Practice',
          dateScheduled: '2026-11-15',
          calendarEventId: 'gcal_stray_from_todo',
        },
      ],
      hasGoogleAuth: true,
      todayStr: '2026-11-15',
      calendarOps: {
        fetchEvents: async () => fetchedEvents,
        batchDeleteEvents: batchDeleteSpy,
        createEventDirect: createSpy,
      },
    });

    expect(res.keptGoogleCount).toBe(1);
    expect(res.createdGoogleCount).toBe(5);
    expect(res.deletedGoogleCount).toBe(4);
    expect(batchDeleteSpy).toHaveBeenCalledTimes(1);

    const deletedIds = new Set(batchDeleteSpy.mock.calls[0][0]);
    expect(deletedIds).toEqual(
      new Set([
        'gcal_wrong_time',
        'gcal_stray_in_window',
        'gcal_allday_in_window',
        'gcal_stray_from_todo',
      ])
    );

    const activeSynced = res.finalTodos.filter((t) => !t.isDeleted);
    expect(activeSynced).toHaveLength(6);
    expect(activeSynced.every((t) => t.calendarSynced && Boolean(t.calendarEventId))).toBe(true);
  });

  it('handles midnight rollover cleanly when daily workload exceeds 15 hours', () => {
    const heavyRoadmap: RoadmapDay[] = [
      {
        dayIndex: 1,
        date: '2026-11-15',
        dayType: 'LEARNING',
        totalMinutes: 960,
        tasks: [
          {
            id: 'h1',
            type: 'lecture',
            subject: 'Physics',
            chapter: 'Optics',
            chapterId: 'ch_opt',
            lectureNumber: 1,
            title: 'Optics — Lecture 1',
            durationMinutes: 600,
            plannedDate: '2026-11-15',
            dayIndex: 1,
          },
          {
            id: 'h2',
            type: 'lecture',
            subject: 'Chemistry',
            chapter: 'Bonding',
            chapterId: 'ch_bond',
            lectureNumber: 1,
            title: 'Bonding — Lecture 1',
            durationMinutes: 400,
            plannedDate: '2026-11-15',
            dayIndex: 1,
          },
        ],
      },
    ];

    const res = buildTodosFromRoadmapPreservingProgress(heavyRoadmap, 'plan_heavy', [], {
      todayStr: '2026-11-15',
    });

    const t2 = res.activeRoadmapTodos[1];
    expect(new Date(t2.endTime!).getTime()).toBeGreaterThan(new Date(t2.startTime!).getTime());
    expect(t2.endTime!.startsWith('2026-11-16T')).toBe(true);
  });

  it('normalizes [Done] prefixes and whitespace consistently', () => {
    expect(normalizeCalendarTitle('[Done]  Friction — Lecture 2 ')).toBe('friction — lecture 2');
  });

  it('schedules 12 tasks across a 12-hour timeline day and recovers all tasks via retry passes after Google rate-limit errors', async () => {
    // 6 tasks x 105m + 5 breaks x 15m = 705m (~11h45m timeline starting 09:00 -> 20:45) on Day 1 + 6 tasks on Day 2
    const makeDayTasks = (dayIdx: number, dateStr: string, offset: number) =>
      Array.from({ length: 6 }, (_, i) => ({
        id: `t_${dayIdx}_${i}`,
        type: (i % 2 === 0 ? 'lecture' : 'practice') as 'lecture' | 'practice',
        subject: i % 3 === 0 ? 'Physics' : i % 3 === 1 ? 'Chemistry' : 'Mathematics',
        chapter: `Chapter ${offset + i}`,
        chapterId: `ch_${offset + i}`,
        lectureNumber: i + 1,
        title: `Chapter ${offset + i} — Task ${i + 1}`,
        durationMinutes: 105,
        plannedDate: dateStr,
        dayIndex: dayIdx,
      }));

    const largeRoadmap: RoadmapDay[] = [
      {
        dayIndex: 1,
        date: '2026-12-01',
        dayType: 'LEARNING',
        totalMinutes: 630,
        tasks: makeDayTasks(1, '2026-12-01', 1),
      },
      {
        dayIndex: 2,
        date: '2026-12-02',
        dayType: 'LEARNING',
        totalMinutes: 630,
        tasks: makeDayTasks(2, '2026-12-02', 7),
      },
    ];

    const largePlan = makePlan(largeRoadmap);
    const attemptCounter = new Map<string, number>();

    // Simulate Google Calendar rejecting tasks #3..#12 on first pass (rate-limit after 2 writes!)
    // and recovering on sequential retry passes
    const flakyCreateSpy = vi.fn(async (title: string, startTime: Date, endTime: Date) => {
      const prevAttempts = attemptCounter.get(title) || 0;
      attemptCounter.set(title, prevAttempts + 1);

      const totalCallsSoFar = flakyCreateSpy.mock.calls.length;
      if (prevAttempts === 0 && totalCallsSoFar > 2) {
        throw new Error('Google Calendar API error: 403 rateLimitExceeded');
      }

      return {
        id: `gcal_${title.replace(/\s+/g, '_')}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      };
    });

    const res = await syncScheduleWithRoadmap({
      backlogPlan: largePlan,
      todos: [],
      hasGoogleAuth: true,
      todayStr: '2026-11-15',
      calendarOps: {
        fetchEvents: async () => [],
        batchDeleteEvents: async () => 0,
        createEventDirect: flakyCreateSpy,
      },
      syncOptions: {
        batchSize: 2,
        batchDelayMs: 0,
        retryDelayMs: 0,
      },
    });

    expect(res.roadmapTaskCount).toBe(12);
    expect(res.createdGoogleCount).toBe(12);
    expect(res.failedGoogleCount).toBe(0);

    const active = res.finalTodos.filter((t) => !t.isDeleted);
    expect(active).toHaveLength(12);
    expect(active.every((t) => t.calendarSynced && Boolean(t.calendarEventId))).toBe(true);

    // Every task must stay on its planned Dec 1 or Dec 2 date at exact sequential :00 second slots (never today's date/now())
    const day1Tasks = active.filter((t) => t.dateScheduled === '2026-12-01');
    const day2Tasks = active.filter((t) => t.dateScheduled === '2026-12-02');
    expect(day1Tasks).toHaveLength(6);
    expect(day2Tasks).toHaveLength(6);
    expect(day1Tasks[0].startTime).toBe('2026-12-01T09:00:00');
    expect(day1Tasks[5].startTime).toBe('2026-12-01T19:00:00');
    expect(day1Tasks[5].endTime).toBe('2026-12-01T20:45:00');
    expect(day2Tasks[0].startTime).toBe('2026-12-02T09:00:00');
  });

  it('accurately reports failedGoogleCount without marking failed events as synced', async () => {
    const roadmap = makeRoadmap();
    const plan = makePlan(roadmap);

    const failingCreateSpy = vi.fn(async (title: string, startTime: Date, endTime: Date) => {
      if (title.includes('Lecture 4')) {
        throw new Error('403 persistent quota exceeded');
      }
      return {
        id: `gcal_${title.length}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      };
    });

    const res = await syncScheduleWithRoadmap({
      backlogPlan: plan,
      todos: [],
      hasGoogleAuth: true,
      todayStr: '2026-11-15',
      calendarOps: {
        fetchEvents: async () => [],
        batchDeleteEvents: async () => 0,
        createEventDirect: failingCreateSpy,
      },
      syncOptions: {
        batchSize: 2,
        batchDelayMs: 0,
        retryDelayMs: 0,
      },
    });

    expect(res.roadmapTaskCount).toBe(6);
    expect(res.createdGoogleCount).toBe(5);
    expect(res.failedGoogleCount).toBe(1);

    const failedTask = res.finalTodos.find((t) => t.text.includes('Lecture 4'));
    expect(failedTask?.calendarSynced).toBe(false);
    expect(failedTask?.calendarEventId).toBeUndefined();
  });

  it('rounds fractional durations (e.g. 112.5m from 45 questions) so ALL 6 tasks on a day get valid integer ISO timestamps', async () => {
    const day16Roadmap: RoadmapDay[] = [
      {
        dayIndex: 16,
        date: '2026-11-16',
        dayType: 'LEARNING',
        totalMinutes: 713,
        tasks: [
          {
            id: 'd16_1',
            type: 'practice',
            subject: 'Chemistry',
            chapter: 'Classification of Elements and Periodicity',
            chapterId: 'ch_class',
            title: 'Classification of Elements and Periodicity Mastery Practice (80 Questions)',
            durationMinutes: 200,
            plannedDate: '2026-11-16',
            dayIndex: 16,
          },
          {
            id: 'd16_2',
            type: 'lecture',
            subject: 'Mathematics',
            chapter: 'Trigonometric Functions',
            chapterId: 'ch_trig',
            lectureNumber: 2,
            title: 'Trigonometric Functions — Lecture 2',
            durationMinutes: 180,
            plannedDate: '2026-11-16',
            dayIndex: 16,
          },
          {
            id: 'd16_3',
            type: 'practice',
            subject: 'Physics',
            chapter: 'friction',
            chapterId: 'ch_fric',
            title: 'friction Mastery Practice (45 Questions)',
            durationMinutes: 112.5, // 45 * 2.5m fractional duration
            plannedDate: '2026-11-16',
            dayIndex: 16,
          },
          {
            id: 'd16_4',
            type: 'revision',
            subject: 'Chemistry',
            chapter: 'Classification of Elements and Periodicity',
            chapterId: 'ch_class',
            title: 'Full Chapter Revision — Classification of Elements and Periodicity',
            durationMinutes: 45,
            plannedDate: '2026-11-16',
            dayIndex: 16,
          },
          {
            id: 'd16_5',
            type: 'lecture',
            subject: 'Mathematics',
            chapter: 'Trigonometric Functions',
            chapterId: 'ch_trig',
            lectureNumber: 3,
            title: 'Trigonometric Functions — Lecture 3',
            durationMinutes: 180,
            plannedDate: '2026-11-16',
            dayIndex: 16,
          },
          {
            id: 'd16_6',
            type: 'revision',
            subject: 'Physics',
            chapter: 'friction',
            chapterId: 'ch_fric',
            title: 'Full Chapter Revision — friction',
            durationMinutes: 45,
            plannedDate: '2026-11-16',
            dayIndex: 16,
          },
        ],
      },
    ];

    const plan = makePlan(day16Roadmap);
    const createdTitles: string[] = [];
    const res = await syncScheduleWithRoadmap({
      backlogPlan: plan,
      todos: [],
      hasGoogleAuth: true,
      todayStr: '2026-11-15',
      calendarOps: {
        fetchEvents: async () => [],
        batchDeleteEvents: async () => 0,
        createEventDirect: async (title, start, end) => {
          expect(isNaN(start.getTime())).toBe(false);
          expect(isNaN(end.getTime())).toBe(false);
          createdTitles.push(title);
          return {
            id: `gcal_${createdTitles.length}`,
            startTime: start.toISOString(),
            endTime: end.toISOString(),
          };
        },
      },
      syncOptions: { batchSize: 1, batchDelayMs: 0, retryDelayMs: 0 },
    });

    expect(res.createdGoogleCount).toBe(6);
    expect(res.failedGoogleCount).toBe(0);

    const active = res.finalTodos.filter((t) => !t.isDeleted);
    expect(active).toHaveLength(6);
    active.forEach((t) => {
      expect(Number.isInteger(t.durationMinutes)).toBe(true);
      expect(t.startTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00$/);
      expect(t.endTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00$/);
      expect(isNaN(new Date(t.startTime!).getTime())).toBe(false);
      expect(isNaN(new Date(t.endTime!).getTime())).toBe(false);
    });
    expect(active[2].durationMinutes).toBe(113);
    expect(active[2].endTime).toBe('2026-11-16T17:43:00');
    expect(active[3].startTime).toBe('2026-11-16T17:58:00');
  });

  it('generates integer-only task durations in generateRoadmap and wave-paces >45 task syncs completely', async () => {
    const planWith45Qs: BacklogPlan = {
      id: 'plan_frac',
      createdAt: '2026-11-15T00:00:00.000Z',
      updatedAt: '2026-11-15T00:00:00.000Z',
      settings: {
        startDate: '2026-11-15',
        deadlineDate: '2026-12-30',
        capacityMode: 'hours',
        targetDailyMinutes: 360,
        targetDailyLectures: 3,
        weekdayDailyMinutes: 360,
        weekendDailyMinutes: 360,
        revisionEnabled: true,
        revisionAfterEveryNLectures: 4,
        revisionDurationMinutes: 45,
        testEnabled: false,
        testAfterChapterCompletion: false,
        testDurationMinutes: 60,
        bufferDays: 2,
        studyBlockStart: '09:00',
        studyBlockEnd: '21:00',
      },
      subjects: [
        {
          id: 'sub_p',
          name: 'Physics',
          color: '#38bdf8',
          chapters: Array.from({ length: 10 }, (_, i) => ({
            id: `ch_${i}`,
            name: `Chapter ${i + 1}`,
            subject: 'Physics',
            order: i + 1,
            lecturesRemaining: 4,
            lectureDurationMinutes: 90,
            practice: {
              enabled: true,
              questionCount: 45, // 45 * 2.5 = 112.5m if unrounded!
              estimatedMinutesPerQuestion: 2.5,
            },
          })),
        },
      ],
      metrics: {
        totalLectures: 40,
        totalLectureMinutes: 3600,
        totalPracticeQuestions: 450,
        totalPracticeMinutes: 1125,
        totalRevisionMinutes: 450,
        totalTestMinutes: 0,
        totalWorkloadMinutes: 5175,
        totalWorkloadHours: 86,
        calendarDays: 46,
        availableStudyDays: 44,
        requiredDailyMinutes: 118,
        requiredDailyLectures: 1,
        feasibilityStatus: 'ON_TRACK',
        feasibilityRatio: 0.5,
        projectedCompletionDate: '2026-12-20',
        bufferDaysRemaining: 10,
        healthScore: 95,
      },
      roadmap: [],
    };

    const generated = generateRoadmap(planWith45Qs);
    const totalTasks = generated.reduce((sum, d) => sum + d.tasks.length, 0);
    expect(totalTasks).toBeGreaterThan(45);
    generated.forEach((d) =>
      d.tasks.forEach((task) => {
        expect(Number.isInteger(task.durationMinutes)).toBe(true);
      })
    );

    const wavePlan = makePlan(generated);
    let createdCount = 0;
    const res = await syncScheduleWithRoadmap({
      backlogPlan: wavePlan,
      todos: [],
      hasGoogleAuth: true,
      todayStr: '2026-11-15',
      calendarOps: {
        fetchEvents: async () => [],
        batchDeleteEvents: async () => 0,
        createEventDirect: async (_t, start, end) => {
          createdCount++;
          return {
            id: `gcal_wave_${createdCount}`,
            startTime: start.toISOString(),
            endTime: end.toISOString(),
          };
        },
      },
      syncOptions: {
        batchSize: 1,
        batchDelayMs: 0,
        retryDelayMs: 0,
        waveSize: 20,
        waveCooldownMs: 0,
      },
    });

    expect(res.roadmapTaskCount).toBe(totalTasks);
    expect(res.createdGoogleCount).toBe(totalTasks);
    expect(res.failedGoogleCount).toBe(0);
  });
});

