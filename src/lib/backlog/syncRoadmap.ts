import { Todo, generateUniqueTaskId } from '@/context/AppContext';
import { getLocalDateString } from '@/lib/utils';
import { BacklogPlan, RoadmapDay } from './types';
import { addDaysToDate } from './engine';
import { getTaskSignaturesWithLegacy } from './signature';
import {
  fetchGoogleCalendarEvents,
  batchDeleteCalendarEvents,
  createCalendarEventDirect,
} from '@/lib/calendar';

export function normalizeCalendarTitle(title?: string | null): string {
  return String(title || '')
    .trim()
    .toLowerCase()
    .replace(/^\[done\]\s*/i, '')
    .replace(/\s+/g, ' ');
}

function getLocalYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getGoogleEventDateBounds(ge: any): { startDate: string | null; endDate: string | null } {
  if (ge?.start?.dateTime) {
    const startDt = new Date(ge.start.dateTime);
    const endDtRaw = ge.end?.dateTime ? new Date(ge.end.dateTime) : startDt;
    if (isNaN(startDt.getTime())) return { startDate: null, endDate: null };
    const startDate = getLocalYMD(startDt);
    // Subtract 1ms from exclusive end so midnight endings stay on the prior day
    const endAdjusted = !isNaN(endDtRaw.getTime()) ? new Date(Math.max(startDt.getTime(), endDtRaw.getTime() - 1)) : startDt;
    const endDate = getLocalYMD(endAdjusted);
    return { startDate, endDate };
  }
  if (ge?.start?.date) {
    const startDate = String(ge.start.date).slice(0, 10);
    let endDate = startDate;
    if (ge.end?.date) {
      // Google all-day end.date is exclusive; subtract 1 day
      endDate = addDaysToDate(String(ge.end.date).slice(0, 10), -1);
      if (endDate < startDate) endDate = startDate;
    }
    return { startDate, endDate };
  }
  return { startDate: null, endDate: null };
}

export interface BuildRoadmapSyncResult {
  syncedTodos: Todo[];
  activeRoadmapTodos: Todo[];
  deletedTodos: Todo[];
  preservedOutsideTodos: Todo[];
  planStartDate: string;
  planEndDate: string;
}

/**
 * Authoritatively builds `todos` directly from `backlogPlan.roadmap`:
 * - Every roadmap task is guaranteed to appear on its exact roadmap day & sequential time slot (09:00 AM + 15m breaks)
 * - Existing completion state, XP, homework/DPP flags, and valid calendarEventId are preserved via task signatures
 * - ALL non-roadmap tasks or stale backlog tasks falling inside `[planStartDate .. planEndDate]` are converted
 *   into tombstone records (`isDeleted: true, deletedAt`) so Firestore sync never resurrects old tasks in between.
 */
export function buildTodosFromRoadmapPreservingProgress(
  roadmap: RoadmapDay[],
  planId: string,
  existingTodos: Todo[],
  options?: {
    todayStr?: string;
    nowMs?: number;
  }
): BuildRoadmapSyncResult {
  const nowMs = options?.nowMs ?? Date.now();
  const todayStr = options?.todayStr ?? getLocalDateString();
  const BREAK_MINUTES = 15;

  const validDates = roadmap
    .map((d) => d.date)
    .filter((d): d is string => Boolean(d && /^\d{4}-\d{2}-\d{2}/.test(d)))
    .map((d) => d.slice(0, 10))
    .sort();

  const planStartDate = validDates[0] || todayStr;
  const planEndDate = validDates[validDates.length - 1] || planStartDate;

  // Candidate pool for preserving completion / metadata on matched roadmap items.
  // Order priority: completed & non-deleted first, then incomplete non-deleted, then deleted.
  const sortedCandidates = [...(existingTodos || [])].sort((a, b) => {
    const score = (t: Todo) => (t.isDeleted ? 0 : 10) + (t.completed ? 5 : 0) + (t.isBacklogTask ? 2 : 0);
    return score(b) - score(a);
  });

  // Index candidates by legacy/canonical signatures and chapter+type+lec tuple
  const claimedExistingIds = new Set<string>();
  const findMatchingExistingTodo = (
    task: RoadmapDay['tasks'][number],
    synthesizedCandidate: Partial<Todo>
  ): Todo | undefined => {
    const targetSigs = new Set(getTaskSignaturesWithLegacy(synthesizedCandidate));

    // 1. Direct ID match
    const byId = sortedCandidates.find(
      (t) => !claimedExistingIds.has(String(t.id)) && String(t.id) === String(task.id)
    );
    if (byId) return byId;

    // 2. Canonical / legacy signature match
    const bySig = sortedCandidates.find((t) => {
      if (claimedExistingIds.has(String(t.id))) return false;
      const tSigs = getTaskSignaturesWithLegacy(t);
      return tSigs.some((s) => targetSigs.has(s));
    });
    if (bySig) return bySig;

    // 3. Chapter + type + lectureNumber fallback
    return sortedCandidates.find((t) => {
      if (claimedExistingIds.has(String(t.id))) return false;
      if (!t.isBacklogTask) return false;
      const sameChapter =
        (t.backlogChapterId && t.backlogChapterId === task.chapterId) ||
        (t.chapter && t.chapter.trim().toLowerCase() === task.chapter.trim().toLowerCase());
      const sameType = (t.backlogTaskType || t.type?.toLowerCase()) === task.type;
      const sameLec =
        task.type !== 'lecture' ||
        task.lectureNumber === undefined ||
        t.lectureNumber === task.lectureNumber;
      return Boolean(sameChapter && sameType && sameLec);
    });
  };

  const activeRoadmapTodos: Todo[] = [];

  roadmap.forEach((day) => {
    let currentStartMins = 9 * 60; // 09:00 AM start
    const dayDateClean = (day.date || planStartDate).slice(0, 10);

    day.tasks.forEach((task) => {
      const duration = Math.max(15, task.durationMinutes || 120);

      const startDayOffset = Math.floor(currentStartMins / (24 * 60));
      const startMinsInDay = currentStartMins % (24 * 60);
      const startH = Math.floor(startMinsInDay / 60);
      const startM = startMinsInDay % 60;
      const startDateStr = startDayOffset > 0 ? addDaysToDate(dayDateClean, startDayOffset) : dayDateClean;

      const endMinsTotal = currentStartMins + duration;
      const endDayOffset = Math.floor(endMinsTotal / (24 * 60));
      const endMinsInDay = endMinsTotal % (24 * 60);
      const endH = Math.floor(endMinsInDay / 60);
      const endM = endMinsInDay % 60;
      const endDateStr = endDayOffset > 0 ? addDaysToDate(dayDateClean, endDayOffset) : dayDateClean;

      const startISO = `${startDateStr}T${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}:00`;
      const endISO = `${endDateStr}T${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}:00`;

      const capitalizedType =
        task.type === 'lecture'
          ? 'Lecture'
          : task.type === 'practice'
          ? 'Practice'
          : task.type === 'revision'
          ? 'Revision'
          : 'Test';

      const defaultXp = Math.max(60, Math.round(duration * 1.5));

      const probe: Partial<Todo> = {
        text: task.title,
        type: capitalizedType,
        subject: task.subject,
        chapter: task.chapter,
        lectureNumber: task.lectureNumber,
        backlogChapterId: task.chapterId,
        backlogTaskType: task.type,
      };

      const matched = findMatchingExistingTodo(task, probe);
      if (matched) {
        claimedExistingIds.add(String(matched.id));
      }

      const todoItem: Todo = {
        ...(matched || {}),
        id: matched?.id ?? generateUniqueTaskId(`bl_${task.chapterId.slice(0, 6)}`),
        text: task.title,
        completed: Boolean(matched?.completed),
        completedAt: matched?.completed ? matched.completedAt : undefined,
        completedDate: matched?.completed ? matched.completedDate : undefined,
        homeworkDone: matched?.homeworkDone,
        dppDone: matched?.dppDone,
        xpReward: matched?.xpReward || defaultXp,
        type: capitalizedType,
        priority: task.type === 'lecture' || task.type === 'test' ? 'High' : 'Medium',
        subject: task.subject,
        chapter: task.chapter,
        lectureNumber: task.lectureNumber,
        startTime: startISO,
        endTime: endISO,
        durationMinutes: duration,
        backlogPlanId: planId,
        backlogChapterId: task.chapterId,
        backlogDayIndex: day.dayIndex,
        backlogTaskType: task.type,
        isBacklogTask: true,
        dateScheduled: dayDateClean,
        isDeleted: false,
        deletedAt: undefined,
        updatedAt: nowMs,
      };

      activeRoadmapTodos.push(todoItem);
      currentStartMins = endMinsTotal + BREAK_MINUTES;
    });
  });

  // Every leftover task from existingTodos is either preserved (if strictly outside the roadmap window and not a backlog task)
  // OR tombstoned (if it's an old backlog task, inside [planStartDate .. planEndDate], or an undated incomplete task while today is inside the roadmap).
  const todayInRange = todayStr >= planStartDate && todayStr <= planEndDate;
  const preservedOutsideTodos: Todo[] = [];
  const deletedTodos: Todo[] = [];

  (existingTodos || []).forEach((t) => {
    if (!t || (typeof t.id !== 'string' && typeof t.id !== 'number')) return;
    if (claimedExistingIds.has(String(t.id))) return;

    if (t.isDeleted) {
      // Keep existing recent tombstone intact
      deletedTodos.push(t);
      return;
    }

    const schedDate = t.dateScheduled?.slice(0, 10) || t.startTime?.slice(0, 10) || null;
    const endDate = t.endTime?.slice(0, 10) || schedDate;

    const isInsideRoadmapWindow = Boolean(
      schedDate && endDate && endDate >= planStartDate && schedDate <= planEndDate
    );
    const isUndatedVisibleToday = !schedDate && !t.completed && todayInRange;

    if (t.isBacklogTask || t.backlogChapterId || isInsideRoadmapWindow || isUndatedVisibleToday) {
      deletedTodos.push({
        ...t,
        isDeleted: true,
        deletedAt: nowMs,
        updatedAt: nowMs,
      });
    } else {
      preservedOutsideTodos.push(t);
    }
  });

  const syncedTodos = [...preservedOutsideTodos, ...activeRoadmapTodos, ...deletedTodos];

  return {
    syncedTodos,
    activeRoadmapTodos,
    deletedTodos,
    preservedOutsideTodos,
    planStartDate,
    planEndDate,
  };
}

export interface RoadmapCalendarOps {
  fetchEvents?: (timeMin: Date, timeMax: Date) => Promise<any[]>;
  batchDeleteEvents?: (ids: (string | undefined | null)[]) => Promise<number>;
  createEventDirect?: (
    title: string,
    startTime: Date,
    endTime: Date,
    type: string,
    isCompleted: boolean
  ) => Promise<{ id: string; startTime: string; endTime: string } | null>;
}

export interface SyncScheduleWithRoadmapResult {
  finalTodos: Todo[];
  planStartDate: string;
  planEndDate: string;
  roadmapTaskCount: number;
  deletedLocalCount: number;
  deletedGoogleCount: number;
  createdGoogleCount: number;
  failedGoogleCount: number;
  keptGoogleCount: number;
  remainingGoogleEvents: any[];
}

export interface SyncScheduleOptions {
  batchSize?: number;
  batchDelayMs?: number;
  retryDelayMs?: number;
}

/**
 * Full authoritative sync:
 * 1. Syncs local `todos` strictly to `backlogPlan.roadmap` and tombstones all non-roadmap tasks inside `[planStartDate .. planEndDate]`.
 * 2. If `hasGoogleAuth`, fetches ALL Google Calendar events in `[planStartDate .. planEndDate]`, keeps exact 1-to-1 roadmap matches,
 *    DELETES every other event inside `[planStartDate .. planEndDate]`, and creates all missing roadmap events cleanly with rate-limit pacing & retries.
 */
export async function syncScheduleWithRoadmap(params: {
  backlogPlan: BacklogPlan;
  todos: Todo[];
  hasGoogleAuth: boolean;
  todayStr?: string;
  calendarOps?: RoadmapCalendarOps;
  syncOptions?: SyncScheduleOptions;
}): Promise<SyncScheduleWithRoadmapResult> {
  const { backlogPlan, todos, hasGoogleAuth, todayStr, calendarOps, syncOptions } = params;
  const roadmap = backlogPlan.roadmap || [];

  const fetchEventsFn = calendarOps?.fetchEvents ?? fetchGoogleCalendarEvents;
  const batchDeleteFn = calendarOps?.batchDeleteEvents ?? batchDeleteCalendarEvents;
  const createDirectFn = calendarOps?.createEventDirect ?? createCalendarEventDirect;

  const {
    syncedTodos,
    activeRoadmapTodos,
    deletedTodos,
    preservedOutsideTodos,
    planStartDate,
    planEndDate,
  } = buildTodosFromRoadmapPreservingProgress(roadmap, backlogPlan.id, todos, { todayStr });

  const deletedLocalCount = deletedTodos.filter((t) => t.deletedAt && Date.now() - t.deletedAt < 10_000).length;

  if (!hasGoogleAuth || roadmap.length === 0) {
    return {
      finalTodos: syncedTodos,
      planStartDate,
      planEndDate,
      roadmapTaskCount: activeRoadmapTodos.length,
      deletedLocalCount,
      deletedGoogleCount: 0,
      createdGoogleCount: 0,
      failedGoogleCount: 0,
      keptGoogleCount: 0,
      remainingGoogleEvents: [],
    };
  }

  // Parse local range bounds [planStartDate 00:00:00 .. planEndDate 23:59:59]
  const [sy, sm, sd] = planStartDate.split('-').map(Number);
  const [ey, em, ed] = planEndDate.split('-').map(Number);
  const rangeStart = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
  const rangeEnd = new Date(ey, em - 1, ed, 23, 59, 59, 999);

  // Also expand end bound slightly in case a heavy day rolls past midnight
  const fetchEnd = new Date(rangeEnd.getTime() + 12 * 60 * 60 * 1000);

  let gcalEvents: any[] = [];
  try {
    gcalEvents = await fetchEventsFn(rangeStart, fetchEnd);
  } catch (err) {
    console.warn('Could not fetch Google Calendar events for roadmap range:', err);
    gcalEvents = [];
  }

  const TWO_MIN_MS = 2 * 60 * 1000;
  const keptGoogleIds = new Set<string>();
  const matchedEventsList: any[] = [];

  // Match each active roadmap todo 1-to-1 against fetched Google Calendar events
  const updatedRoadmapTodos = activeRoadmapTodos.map((rt) => {
    const rtStartMs = new Date(rt.startTime!).getTime();
    const rtEndMs = new Date(rt.endTime!).getTime();
    const rtNorm = normalizeCalendarTitle(rt.text);

    // 1. Prefer previously linked event if it still matches title + start + end cleanly
    let matchedEv = rt.calendarEventId && !rt.calendarEventId.startsWith('local-')
      ? gcalEvents.find((ge) => {
          if (!ge?.id || ge.status === 'cancelled' || keptGoogleIds.has(ge.id)) return false;
          if (ge.id !== rt.calendarEventId) return false;
          if (!ge.start?.dateTime || !ge.end?.dateTime) return false;
          const gStart = new Date(ge.start.dateTime).getTime();
          const gEnd = new Date(ge.end.dateTime).getTime();
          return (
            normalizeCalendarTitle(ge.summary) === rtNorm &&
            Math.abs(gStart - rtStartMs) <= TWO_MIN_MS &&
            Math.abs(gEnd - rtEndMs) <= TWO_MIN_MS
          );
        })
      : undefined;

    // 2. Otherwise look for any exact-slot unclaimed match in gcalEvents
    if (!matchedEv) {
      matchedEv = gcalEvents.find((ge) => {
        if (!ge?.id || ge.status === 'cancelled' || keptGoogleIds.has(ge.id)) return false;
        if (!ge.start?.dateTime || !ge.end?.dateTime) return false;
        const gStart = new Date(ge.start.dateTime).getTime();
        const gEnd = new Date(ge.end.dateTime).getTime();
        return (
          normalizeCalendarTitle(ge.summary) === rtNorm &&
          Math.abs(gStart - rtStartMs) <= TWO_MIN_MS &&
          Math.abs(gEnd - rtEndMs) <= TWO_MIN_MS
        );
      });
    }

    if (matchedEv?.id) {
      keptGoogleIds.add(matchedEv.id);
      matchedEventsList.push(matchedEv);
      return {
        ...rt,
        calendarEventId: matchedEv.id,
        calendarSynced: true,
      };
    }

    // Old calendarEventId (if any) didn't match exact roadmap schedule; clear it so we delete & recreate cleanly
    return {
      ...rt,
      calendarEventId: undefined,
      calendarSynced: false,
    };
  });

  // Delete EVERY non-kept Google Calendar event inside [planStartDate .. planEndDate]
  const googleIdsToDelete = new Set<string>();

  gcalEvents.forEach((ge) => {
    if (!ge?.id || ge.status === 'cancelled') return;
    if (keptGoogleIds.has(ge.id)) return;
    if (ge.eventType === 'birthday') return; // read-only Google system event

    const { startDate, endDate } = getGoogleEventDateBounds(ge);
    if (startDate && endDate && endDate >= planStartDate && startDate <= planEndDate) {
      googleIdsToDelete.add(ge.id);
    }
  });

  // Also ensure any previously-linked event on tombstoned or superseded tasks inside the schedule gets deleted
  deletedTodos.forEach((dt) => {
    if (dt.calendarEventId && !dt.calendarEventId.startsWith('local-') && !keptGoogleIds.has(dt.calendarEventId)) {
      googleIdsToDelete.add(dt.calendarEventId);
    }
  });
  todos.forEach((orig) => {
    if (orig.calendarEventId && !orig.calendarEventId.startsWith('local-') && !keptGoogleIds.has(orig.calendarEventId)) {
      const origDate = orig.dateScheduled?.slice(0, 10) || orig.startTime?.slice(0, 10);
      if (orig.isBacklogTask || (origDate && origDate >= planStartDate && origDate <= planEndDate)) {
        googleIdsToDelete.add(orig.calendarEventId);
      }
    }
  });

  let deletedGoogleCount = 0;
  if (googleIdsToDelete.size > 0) {
    try {
      deletedGoogleCount = await batchDeleteFn(Array.from(googleIdsToDelete));
    } catch (err) {
      console.warn('Batch delete of non-roadmap Google Calendar events had errors:', err);
    }
  }

  // Create missing roadmap tasks in Google Calendar in paced batches + sequential retry passes
  const toCreateIndices: number[] = [];
  updatedRoadmapTodos.forEach((rt, idx) => {
    if (!rt.calendarEventId && rt.startTime && rt.endTime) {
      toCreateIndices.push(idx);
    }
  });

  const batchSize = Math.max(1, syncOptions?.batchSize ?? 2);
  const batchDelayMs = syncOptions?.batchDelayMs ?? 260;
  const retryDelayMs = syncOptions?.retryDelayMs ?? 1200;

  let createdGoogleCount = 0;

  const tryCreateSingle = async (idx: number): Promise<boolean> => {
    const task = updatedRoadmapTodos[idx];
    const startDt = new Date(task.startTime!);
    const endDt = new Date(task.endTime!);
    if (isNaN(startDt.getTime()) || isNaN(endDt.getTime())) {
      return false;
    }
    const created = await createDirectFn(
      task.text,
      startDt,
      endDt,
      task.type || 'Lecture',
      Boolean(task.completed)
    );
    if (created?.id) {
      updatedRoadmapTodos[idx] = {
        ...updatedRoadmapTodos[idx],
        calendarEventId: created.id,
        calendarSynced: true,
      };
      createdGoogleCount++;
      return true;
    }
    return false;
  };

  // Pass 1: Paced batches
  let failedIndices: number[] = [];
  for (let i = 0; i < toCreateIndices.length; i += batchSize) {
    const chunk = toCreateIndices.slice(i, i + batchSize);
    const results = await Promise.allSettled(chunk.map((idx) => tryCreateSingle(idx)));
    results.forEach((res, offset) => {
      if (res.status !== 'fulfilled' || !res.value) {
        failedIndices.push(chunk[offset]);
      }
    });
    if (batchDelayMs > 0 && i + batchSize < toCreateIndices.length) {
      await new Promise((resolve) => setTimeout(resolve, batchDelayMs));
    }
  }

  // Pass 2 & Pass 3: Strictly sequential recovery passes after cooldown for any rate-limited stragglers
  for (let retryRound = 0; retryRound < 2 && failedIndices.length > 0; retryRound++) {
    const cooldown = retryRound === 0 ? retryDelayMs : Math.round(retryDelayMs * 1.5);
    if (cooldown > 0) {
      await new Promise((resolve) => setTimeout(resolve, cooldown));
    }
    const stillFailed: number[] = [];
    for (const idx of failedIndices) {
      try {
        const ok = await tryCreateSingle(idx);
        if (!ok) stillFailed.push(idx);
      } catch (err) {
        console.warn('Sequential retry create failed for task', updatedRoadmapTodos[idx]?.text, err);
        stillFailed.push(idx);
      }
      if (batchDelayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, batchDelayMs));
      }
    }
    failedIndices = stillFailed;
  }

  const failedGoogleCount = failedIndices.length;
  const finalTodos = [...preservedOutsideTodos, ...updatedRoadmapTodos, ...deletedTodos];

  return {
    finalTodos,
    planStartDate,
    planEndDate,
    roadmapTaskCount: updatedRoadmapTodos.length,
    deletedLocalCount,
    deletedGoogleCount,
    createdGoogleCount,
    failedGoogleCount,
    keptGoogleCount: keptGoogleIds.size,
    remainingGoogleEvents: matchedEventsList,
  };
}
