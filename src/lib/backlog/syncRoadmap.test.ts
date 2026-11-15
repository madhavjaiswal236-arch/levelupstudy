import { describe, it, expect, vi } from 'vitest';
import {
  buildTodosFromRoadmapPreservingProgress,
  syncScheduleWithRoadmap,
  normalizeCalendarTitle,
} from './syncRoadmap';
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
});
