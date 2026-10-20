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
 */
export function formatLocalISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");
  return `${y}-${m}-${d}T${h}:${min}:${s}`;
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
  const [yStr, mStr, dStr] = targetDateStr.split("-");
  const baseDate = new Date(parseInt(yStr, 10), parseInt(mStr, 10) - 1, parseInt(dStr, 10), 0, 0, 0, 0);

  const now = new Date();
  const nowOffsetMins = (now.getTime() - baseDate.getTime()) / 60000;
  const taskDuration = Math.max(30, durationMinutes);

  // Check if now is within target date and currently inside the morning tail of an overnight block (e.g. 00:00 to 08:00 AM)
  const isCurrentlyInMorningTail =
    isOvernight &&
    nowOffsetMins >= 0 &&
    nowOffsetMins < morningTailMins - 15;

  let windowStartMins = blockStartMins;
  let windowEndMins = blockEndMins;

  if (isCurrentlyInMorningTail) {
    // Student is studying right now in the morning segment (00:00 -> 08:00)
    windowStartMins = Math.ceil(nowOffsetMins / 15) * 15;
    windowEndMins = morningTailMins;
  } else if (nowOffsetMins > blockStartMins && nowOffsetMins < blockEndMins - 15) {
    // Student is studying in the evening segment (e.g. past 23:00)
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
  const [sH, sM] = studyBlockStart.split(":").map(Number);
  const [eH, eM] = studyBlockEnd.split(":").map(Number);

  const startTotalMins = (isNaN(sH) ? 6 : sH) * 60 + (isNaN(sM) ? 0 : sM);
  let endTotalMins = (isNaN(eH) ? 22 : eH) * 60 + (isNaN(eM) ? 0 : eM);
  if (endTotalMins <= startTotalMins) {
    endTotalMins += 24 * 60; // Spans across 2 days
  }
  const totalBlockDurationMins = Math.max(60, endTotalMins - startTotalMins);

  // Group uncompleted tasks by scheduled date
  const dateMap = new Map<string, Todo[]>();
  tasks.forEach((t) => {
    if (!t.completed && !t.isDeleted) {
      let dKey = t.dateScheduled;
      if (!dKey && t.startTime) {
        dKey = t.startTime.split("T")[0];
      }
      if (!dKey) {
        const now = new Date();
        dKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      }
      if (!dateMap.has(dKey)) dateMap.set(dKey, []);
      dateMap.get(dKey)!.push(t);
    }
  });

  const updatedMap = new Map<string, Todo>();
  tasks.forEach((t) => updatedMap.set(String(t.id), t));

  dateMap.forEach((dayTasks, dKey) => {
    const [y, m, d] = dKey.split("-").map(Number);
    const baseDate = new Date(y, m - 1, d, 0, 0, 0, 0);

    const count = dayTasks.length;
    const stepMins = count > 1 ? Math.min(180, Math.floor(totalBlockDurationMins / count)) : 120;

    dayTasks.forEach((task, idx) => {
      const durMins = task.durationMinutes || 90;
      const slotStartMins = Math.min(endTotalMins - durMins, startTotalMins + idx * stepMins);
      const slotEndMins = slotStartMins + durMins;

      const startDateObj = new Date(baseDate.getTime() + slotStartMins * 60 * 1000);
      const endDateObj = new Date(baseDate.getTime() + slotEndMins * 60 * 1000);

      updatedMap.set(String(task.id), {
        ...task,
        startTime: formatLocalISO(startDateObj),
        endTime: formatLocalISO(endDateObj),
        dateScheduled: dKey,
        calendarSynced: true,
        calendarEventId: task.calendarEventId || `local-${task.id}`,
        updatedAt: Date.now(),
      });
    });
  });

  return Array.from(updatedMap.values());
}
