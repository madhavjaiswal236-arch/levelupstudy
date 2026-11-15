// src/lib/studyBlock.ts
/**
 * Centralized Study Time Block scheduling engine.
 * Supports standard single-day schedules (e.g. 06:00 to 22:00)
 * AND full cross-midnight overnight schedules (e.g. 11:00 PM to 08:00 AM next morning)
 * ensuring all tasks are strictly and safely scheduled without date or time errors.
 */

import type { Todo } from "../context/AppContext";
import type { StudentScheduleProfile } from "./coach/student-model/profile";
import type { BacklogPlan } from "./backlog/types";

export interface StudyBlockWindow {
  start: string; // "HH:mm" e.g. "23:00"
  end: string;   // "HH:mm" e.g. "08:00"
  startHour: number;
  endHour: number;
  startMinute: number;
  endMinute: number;
  totalDurationMinutes: number;
  isCrossDay: boolean;
}

/**
 * Converts a Date object to local ISO string (YYYY-MM-DDTHH:mm:ss) avoiding UTC drift.
 * Safely guards against null, undefined, or invalid Date inputs.
 */
export function formatLocalISO(date: Date): string {
  const safeDate = !date || isNaN(date.getTime()) ? new Date() : date;
  const y = safeDate.getFullYear();
  const m = String(safeDate.getMonth() + 1).padStart(2, "0");
  const d = String(safeDate.getDate()).padStart(2, "0");
  const h = String(safeDate.getHours()).padStart(2, "0");
  const min = String(safeDate.getMinutes()).padStart(2, "0");
  const s = String(safeDate.getSeconds()).padStart(2, "0");
  return `${y}-${m}-${d}T${h}:${min}:${s}`;
}

/**
 * Safely parses any date representation (YYYY-MM-DD, ISO string, etc.) into a clean 00:00:00 Date object.
 * Never throws RangeError and never produces an Invalid Date.
 */
export function parseDateKeySafely(rawKey?: string | null): Date {
  if (rawKey) {
    const match = String(rawKey).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const y = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const d = parseInt(match[3], 10);
      const dt = new Date(y, m - 1, d, 0, 0, 0, 0);
      if (!isNaN(dt.getTime())) return dt;
    }
    const directDate = new Date(rawKey);
    if (!isNaN(directDate.getTime())) {
      return new Date(directDate.getFullYear(), directDate.getMonth(), directDate.getDate(), 0, 0, 0, 0);
    }
  }
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

const repairDecimalMinuteISO = (val: string): string => {
  const m = val.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{1,2})\.\d+:(\d{2})(.*)$/);
  if (!m) return val;
  const [, datePart, hStr, minStr, secStr, suffix] = m;
  const totalMins = Math.round(parseInt(hStr, 10) * 60 + parseFloat(val.slice(14, val.indexOf(':', 14))));
  const clamped = Math.max(0, Math.min(23 * 60 + 59, totalMins));
  const hh = String(Math.floor(clamped / 60)).padStart(2, "0");
  const mm = String(clamped % 60).padStart(2, "0");
  void minStr;
  return `${datePart}T${hh}:${mm}:${secStr}${suffix || ""}`;
};

const coerceValidTimeString = (val: any): string | undefined => {
  if (!val) return undefined;
  if (typeof val === "object") {
    if (typeof val.toMillis === "function") {
      const ms = val.toMillis();
      return !isNaN(ms) ? formatLocalISO(new Date(ms)) : undefined;
    }
    if (typeof val.seconds === "number") {
      const d = new Date(val.seconds * 1000);
      return !isNaN(d.getTime()) ? formatLocalISO(d) : undefined;
    }
    if (val instanceof Date) {
      return !isNaN(val.getTime()) ? formatLocalISO(val) : undefined;
    }
    return undefined;
  }
  if (typeof val === "number") {
    if (isNaN(val)) return undefined;
    const d = new Date(val);
    return !isNaN(d.getTime()) ? formatLocalISO(d) : undefined;
  }
  const s = repairDecimalMinuteISO(String(val).trim());
  if (!s || s.includes("NaN") || s.toLowerCase().includes("invalid")) return undefined;
  const d = new Date(s);
  return !isNaN(d.getTime()) ? s : undefined;
};

/**
 * Automatically inspects and heals any corrupted tasks with NaN, decimal minutes, or invalid dates.
 */
export function sanitizeAndHealTodos<T extends Record<string, any>>(rawList: T[]): T[] {
  if (!Array.isArray(rawList)) return [];
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return rawList.map((t: any) => {
    if (!t || typeof t !== "object") return t;
    const cleanStart = coerceValidTimeString(t.startTime);
    const cleanEnd = coerceValidTimeString(t.endTime);
    const rawStartStr = t.startTime ? String(t.startTime) : undefined;
    const rawEndStr = t.endTime ? String(t.endTime) : undefined;
    const dSched = t.dateScheduled ? String(t.dateScheduled) : undefined;
    const hasFractionalDuration = typeof t.durationMinutes === "number" && !Number.isInteger(t.durationMinutes);

    const isStartTimeCorrupt = Boolean(t.startTime && !cleanStart);
    const isEndTimeCorrupt = Boolean(t.endTime && !cleanEnd);
    const isDateSchedCorrupt = Boolean(dSched && (dSched.includes("NaN") || !/^\d{4}-\d{2}-\d{2}/.test(dSched)));

    // Also ensure we never leave half-corrupted start/end pairs or non-string timestamps
    const needsNormalization =
      isStartTimeCorrupt ||
      isEndTimeCorrupt ||
      isDateSchedCorrupt ||
      hasFractionalDuration ||
      (cleanStart && cleanStart !== rawStartStr) ||
      (cleanEnd && cleanEnd !== rawEndStr) ||
      (Boolean(cleanStart) && !cleanEnd) ||
      (!cleanStart && Boolean(cleanEnd));

    if (needsNormalization) {
      let cleanDate = todayStr;
      if (dSched && /^\d{4}-\d{2}-\d{2}/.test(dSched) && !dSched.includes("NaN")) {
        cleanDate = dSched.slice(0, 10);
      } else if (cleanStart && /^\d{4}-\d{2}-\d{2}/.test(cleanStart)) {
        cleanDate = cleanStart.slice(0, 10);
      } else if (rawStartStr && /^\d{4}-\d{2}-\d{2}/.test(rawStartStr) && !rawStartStr.includes("NaN")) {
        cleanDate = rawStartStr.slice(0, 10);
      }
      const bothValid = Boolean(cleanStart && cleanEnd);
      return {
        ...t,
        dateScheduled: cleanDate,
        startTime: bothValid ? cleanStart : undefined,
        endTime: bothValid ? cleanEnd : undefined,
        ...(hasFractionalDuration ? { durationMinutes: Math.max(15, Math.round(t.durationMinutes)) } : {}),
      };
    }
    return t;
  });
}

/**
 * Resolves the active study block configuration from scheduleProfile, backlogPlan, or local storage.
 */
export function getActiveStudyBlock(
  scheduleProfile?: StudentScheduleProfile | null,
  backlogPlan?: BacklogPlan | null
): StudyBlockWindow {
  let startStr =
    scheduleProfile?.studyBlockStart ||
    backlogPlan?.settings?.studyBlockStart;
  let endStr =
    scheduleProfile?.studyBlockEnd ||
    backlogPlan?.settings?.studyBlockEnd;

  if (!startStr || !endStr) {
    if (typeof window !== "undefined") {
      try {
        const savedProfile = localStorage.getItem("LEVELUP_SCHEDULE_PROFILE");
        if (savedProfile) {
          const parsed = JSON.parse(savedProfile);
          if (parsed.studyBlockStart) startStr = parsed.studyBlockStart;
          if (parsed.studyBlockEnd) endStr = parsed.studyBlockEnd;
        }
        if (!startStr || !endStr) {
          const savedPlan = localStorage.getItem("jee_tracker_backlog_plan");
          if (savedPlan) {
            const parsed = JSON.parse(savedPlan);
            if (parsed.settings?.studyBlockStart) startStr = parsed.settings.studyBlockStart;
            if (parsed.settings?.studyBlockEnd) endStr = parsed.settings.studyBlockEnd;
          }
        }
      } catch {}
    }
  }

  const finalStart = startStr || "06:00";
  const finalEnd = endStr || "22:00";

  let sHour = parseInt(finalStart.split(":")[0], 10);
  let sMin = parseInt(finalStart.split(":")[1] || "0", 10);
  let eHour = parseInt(finalEnd.split(":")[0], 10);
  let eMin = parseInt(finalEnd.split(":")[1] || "0", 10);

  if (isNaN(sHour)) sHour = 6;
  if (isNaN(sMin)) sMin = 0;
  if (isNaN(eHour)) eHour = 22;
  if (isNaN(eMin)) eMin = 0;

  const startTotalMins = sHour * 60 + sMin;
  let endTotalMins = eHour * 60 + eMin;
  const isCrossDay = endTotalMins <= startTotalMins;

  if (isCrossDay) {
    // Cross-midnight overnight block (e.g. 23:00 to 08:00 next day = 9 hours)
    endTotalMins += 24 * 60;
  }

  const duration = Math.max(60, endTotalMins - startTotalMins);

  return {
    start: finalStart,
    end: finalEnd,
    startHour: sHour,
    endHour: eHour,
    startMinute: sMin,
    endMinute: eMin,
    totalDurationMinutes: duration,
    isCrossDay,
  };
}

/**
 * Format "HH:mm" into a friendly 12-hour string (e.g. "11:00 PM" or "08:00 AM").
 */
export function formatTime12h(timeStr?: string): string {
  if (!timeStr) return "06:00 AM";
  const [hStr, mStr] = timeStr.split(":");
  let h = parseInt(hStr || "6", 10);
  const m = (mStr || "00").slice(0, 2);
  const ampm = h >= 12 ? "PM" : "AM";
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${String(h).padStart(2, "0")}:${m} ${ampm}`;
}

/**
 * Calculate the next free slot inside the student's study time block for a given date.
 * Fully handles multi-day overnight blocks (e.g. 11:00 PM to 08:00 AM) by utilizing
 * continuous millisecond offsets from the target date's midnight base.
 */
export function calculateNextAvailableStudySlot(
  targetDateStr: string, // YYYY-MM-DD
  durationMinutes: number = 90,
  existingTasks: Todo[] = [],
  blockStartStr: string = "06:00",
  blockEndStr: string = "22:00"
): { startTime: string; endTime: string; dateScheduled: string } {
  const [sHourStr, sMinStr] = (blockStartStr || "06:00").split(":");
  const [eHourStr, eMinStr] = (blockEndStr || "22:00").split(":");

  let sHour = parseInt(sHourStr, 10);
  let sMin = parseInt(sMinStr || "0", 10);
  let eHour = parseInt(eHourStr, 10);
  let eMin = parseInt(eMinStr || "0", 10);

  if (isNaN(sHour)) sHour = 6;
  if (isNaN(sMin)) sMin = 0;
  if (isNaN(eHour)) eHour = 22;
  if (isNaN(eMin)) eMin = 0;

  const blockStartMins = sHour * 60 + sMin;
  const morningTailMins = eHour * 60 + eMin;
  const isOvernight = morningTailMins <= blockStartMins;
  let blockEndMins = isOvernight ? morningTailMins + 24 * 60 : morningTailMins;

  // Base timestamp for targetDate at 00:00:00 local time
  const baseDate = parseDateKeySafely(targetDateStr);

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const isTargetToday = targetDateStr === todayStr;
  const nowOffsetMins = (now.getTime() - baseDate.getTime()) / 60000;
  const taskDuration = Math.max(30, Math.round(durationMinutes));

  // Check if now is within target date and currently inside the morning tail of an overnight block (e.g. 00:00 to 08:00 AM)
  const isCurrentlyInMorningTail =
    isTargetToday &&
    isOvernight &&
    nowOffsetMins >= 0 &&
    nowOffsetMins < morningTailMins - 15;

  let windowStartMins = blockStartMins;
  let windowEndMins = blockEndMins;

  if (isCurrentlyInMorningTail) {
    // Student is studying right now in the morning segment (00:00 -> 08:00)
    windowStartMins = Math.ceil(nowOffsetMins / 15) * 15;
    windowEndMins = morningTailMins;
  } else if (isTargetToday && nowOffsetMins > blockStartMins && nowOffsetMins < blockEndMins - 15) {
    // Only adjust to current quarter-hour when scheduling ad-hoc tasks for TODAY
    windowStartMins = Math.ceil(nowOffsetMins / 15) * 15;
  }

  // Extract all existing tasks belonging to this study window
  const occupiedIntervals: { start: number; end: number }[] = [];
  existingTasks.forEach((t) => {
    if (t.isDeleted || t.completed || !t.startTime) return;
    const tStartMs = new Date(t.startTime).getTime();
    if (isNaN(tStartMs)) return;
    const tEndMs = t.endTime ? new Date(t.endTime).getTime() : tStartMs + (t.durationMinutes || 60) * 60000;
    const startOffsetMins = (tStartMs - baseDate.getTime()) / 60000;
    const endOffsetMins = (tEndMs - baseDate.getTime()) / 60000;

    if (endOffsetMins > windowStartMins && startOffsetMins < windowEndMins) {
      occupiedIntervals.push({
        start: Math.max(windowStartMins, startOffsetMins),
        end: Math.min(windowEndMins, Math.max(startOffsetMins + 15, endOffsetMins)),
      });
    }
  });

  // Sort intervals by start offset
  occupiedIntervals.sort((a, b) => a.start - b.start);

  let candidateStart = windowStartMins;

  // Find a free window between candidateStart and windowEndMins
  for (const interval of occupiedIntervals) {
    if (interval.end <= candidateStart) {
      continue;
    }
    if (interval.start >= candidateStart + taskDuration) {
      // Free gap found!
      break;
    }
    // Jump past the occupied interval with a 5-minute breather
    candidateStart = Math.max(candidateStart, interval.end + 5);
  }

  let finalStartMins = candidateStart;
  if (finalStartMins + taskDuration > windowEndMins) {
    // Window is full; fit at windowStartMins or after the last task
    if (occupiedIntervals.length === 0) {
      finalStartMins = windowStartMins;
    } else {
      const last = occupiedIntervals[occupiedIntervals.length - 1];
      finalStartMins = Math.min(last.end + 5, windowEndMins - taskDuration);
      if (finalStartMins < windowStartMins) finalStartMins = windowStartMins;
    }
  }

  const finalEndMins = finalStartMins + taskDuration;

  // Compute exact Date objects ensuring start < end across midnight
  const startDateObj = new Date(baseDate.getTime() + finalStartMins * 60 * 1000);
  const endDateObj = new Date(baseDate.getTime() + finalEndMins * 60 * 1000);

  return {
    startTime: formatLocalISO(startDateObj),
    endTime: formatLocalISO(endDateObj),
    dateScheduled: targetDateStr,
  };
}

/**
 * Re-aligns a collection of tasks so they all fit strictly within the given study block.
 * Seamlessly handles cross-midnight overnight schedules across 2 calendar days.
 */
export function realignTasksToStudyBlock(
  tasks: Todo[],
  studyBlockStart: string = "06:00",
  studyBlockEnd: string = "22:00"
): Todo[] {
  const [sH, sM] = (studyBlockStart || "06:00").split(":").map(Number);
  const [eH, eM] = (studyBlockEnd || "22:00").split(":").map(Number);

  const startTotalMins = (isNaN(sH) ? 6 : sH) * 60 + (isNaN(sM) ? 0 : sM);
  let endTotalMins = (isNaN(eH) ? 22 : eH) * 60 + (isNaN(eM) ? 0 : eM);
  if (endTotalMins <= startTotalMins) {
    endTotalMins += 24 * 60; // Spans across 2 days (overnight schedule)
  }
  const totalBlockDurationMins = Math.max(60, endTotalMins - startTotalMins);

  const now = new Date();
  const defaultTodayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  // Group uncompleted tasks by scheduled date
  const dateMap = new Map<string, Todo[]>();
  tasks.forEach((t) => {
    if (!t.completed && !t.isDeleted) {
      let dKey = "";
      if (t.dateScheduled) {
        const match = String(t.dateScheduled).match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (match) dKey = match[0];
      }
      if (!dKey && t.startTime) {
        const match = String(t.startTime).match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (match) dKey = match[0];
      }
      if (!dKey) {
        dKey = defaultTodayStr;
      }
      if (!dateMap.has(dKey)) dateMap.set(dKey, []);
      dateMap.get(dKey)!.push(t);
    }
  });

  const updatedMap = new Map<string, Todo>();
  tasks.forEach((t) => updatedMap.set(String(t.id), t));

  dateMap.forEach((dayTasks, dKey) => {
    const baseDate = parseDateKeySafely(dKey);

    const count = dayTasks.length;
    const stepMins = count > 1 ? Math.min(180, Math.floor(totalBlockDurationMins / count)) : 120;

    dayTasks.forEach((task, idx) => {
      const durMins = Math.max(15, Math.round(task.durationMinutes || 90));
      const slotStartMins = Math.min(endTotalMins - durMins, startTotalMins + idx * stepMins);
      const slotEndMins = slotStartMins + durMins;

      const startDateObj = new Date(baseDate.getTime() + slotStartMins * 60 * 1000);
      const endDateObj = new Date(baseDate.getTime() + slotEndMins * 60 * 1000);
      const isGenuineSynced = Boolean(
        task.calendarSynced &&
          task.calendarEventId &&
          !String(task.calendarEventId).startsWith("local-")
      );

      updatedMap.set(String(task.id), {
        ...task,
        durationMinutes: durMins,
        startTime: formatLocalISO(startDateObj),
        endTime: formatLocalISO(endDateObj),
        dateScheduled: dKey,
        calendarSynced: isGenuineSynced,
        calendarEventId: task.calendarEventId || `local-${task.id}`,
        updatedAt: Date.now(),
      });
    });
  });

  return Array.from(updatedMap.values());
}
