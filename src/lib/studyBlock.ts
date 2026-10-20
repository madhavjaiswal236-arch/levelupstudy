// src/lib/studyBlock.ts
/**
 * Centralized Study Time Block scheduling engine.
 * Ensures all tasks (Tracker 360 roadmap, manual student tasks, backlog starts)
 * are strictly scheduled within the student's chosen daily study window.
 */

import type { Todo } from "../context/AppContext";
import type { StudentScheduleProfile } from "./coach/student-model/profile";
import type { BacklogPlan } from "./backlog/types";

export interface StudyBlockWindow {
  start: string; // "HH:mm" e.g. "17:00"
  end: string;   // "HH:mm" e.g. "23:00"
  startHour: number;
  endHour: number;
  totalDurationMinutes: number;
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

  // Handle cross-midnight or zero duration blocks
  let startTotalMins = sHour * 60 + sMin;
  let endTotalMins = eHour * 60 + eMin;

  if (endTotalMins <= startTotalMins) {
    // e.g. 17:00 to 01:00 next day = 8 hours
    endTotalMins += 24 * 60;
  }

  const duration = Math.max(60, endTotalMins - startTotalMins);

  return {
    start: finalStart,
    end: finalEnd,
    startHour: sHour,
    endHour: eHour,
    totalDurationMinutes: duration,
  };
}

/**
 * Format "HH:mm" into a friendly 12-hour string (e.g. "05:00 PM").
 */
export function formatTime12h(timeStr?: string): string {
  if (!timeStr) return "06:00 AM";
  const [hStr, mStr] = timeStr.split(":");
  let h = parseInt(hStr || "6", 10);
  const m = mStr || "00";
  const ampm = h >= 12 ? "PM" : "AM";
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${String(h).padStart(2, "0")}:${m} ${ampm}`;
}

/**
 * Calculate the next free slot inside the student's study time block for a given date.
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

  let blockStartMins = sHour * 60 + sMin;
  let blockEndMins = eHour * 60 + eMin;
  if (blockEndMins <= blockStartMins) {
    blockEndMins += 24 * 60;
  }

  // Find all tasks scheduled on targetDate that have start/end times
  const dayTasks = existingTasks.filter(
    (t) =>
      !t.isDeleted &&
      !t.completed &&
      t.startTime &&
      t.startTime.startsWith(targetDateStr)
  );

  // Parse occupied intervals in minutes relative to start of target day
  const occupiedIntervals: { start: number; end: number }[] = [];
  dayTasks.forEach((t) => {
    if (!t.startTime) return;
    const startD = new Date(t.startTime);
    const endD = t.endTime ? new Date(t.endTime) : new Date(startD.getTime() + (t.durationMinutes || 60) * 60000);
    const startM = startD.getHours() * 60 + startD.getMinutes();
    let endM = endD.getHours() * 60 + endD.getMinutes();
    if (endM <= startM) endM = startM + (t.durationMinutes || 60);
    occupiedIntervals.push({ start: startM, end: endM });
  });

  // Sort intervals by start time
  occupiedIntervals.sort((a, b) => a.start - b.start);

  // If today is the target date, ensure we don't schedule in the past if now is within block
  const now = new Date();
  const todayDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  let earliestStartMins = blockStartMins;

  if (targetDateStr === todayDateStr) {
    const nowMins = now.getHours() * 60 + now.getMinutes();
    if (nowMins > blockStartMins && nowMins < blockEndMins - 15) {
      // Round up to nearest 15-minute slot
      earliestStartMins = Math.ceil(nowMins / 15) * 15;
    } else if (nowMins >= blockEndMins - 15) {
      // Past today's study block window: search from block start for today's plan
      earliestStartMins = blockStartMins;
    }
  }

  // Find a free window between earliestStartMins and blockEndMins
  let candidateStart = earliestStartMins;
  const taskDuration = Math.max(30, durationMinutes);

  for (const interval of occupiedIntervals) {
    if (interval.end <= candidateStart) {
      continue;
    }
    if (interval.start >= candidateStart + taskDuration) {
      // Free gap found!
      break;
    }
    // Conflict, jump candidateStart to the end of this interval + 5 min buffer
    candidateStart = Math.max(candidateStart, interval.end + 5);
  }

  let finalStartMins = candidateStart;
  let finalEndMins = finalStartMins + taskDuration;

  // If block is full, pack after the last interval or keep within bounds
  if (finalEndMins > blockEndMins && occupiedIntervals.length === 0) {
    // Empty block but duration > block length, fit to block start
    finalStartMins = blockStartMins;
    finalEndMins = Math.min(blockStartMins + taskDuration, 23 * 60 + 59);
  } else if (finalEndMins > 23 * 60 + 59) {
    finalEndMins = 23 * 60 + 59;
    finalStartMins = Math.max(0, finalEndMins - taskDuration);
  }

  const startH = Math.floor(finalStartMins / 60) % 24;
  const startM = finalStartMins % 60;
  const endH = Math.floor(finalEndMins / 60) % 24;
  const endM = finalEndMins % 60;

  const startStr = `${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")}`;
  const endStr = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;

  return {
    startTime: `${targetDateStr}T${startStr}:00`,
    endTime: `${targetDateStr}T${endStr}:00`,
    dateScheduled: targetDateStr,
  };
}

/**
 * Re-aligns a collection of tasks so they all fit strictly within the given study block.
 */
export function realignTasksToStudyBlock(
  tasks: Todo[],
  studyBlockStart: string = "06:00",
  studyBlockEnd: string = "22:00"
): Todo[] {
  const startH = parseInt(studyBlockStart.split(":")[0], 10) || 6;
  let endH = parseInt(studyBlockEnd.split(":")[0], 10) || 22;
  if (endH <= startH) endH = startH + 12;
  const blockDuration = Math.max(2, endH - startH);

  // Group uncompleted tasks by date
  const dateMap = new Map<string, Todo[]>();
  tasks.forEach((t) => {
    if (!t.completed && t.startTime && !t.isDeleted) {
      const dKey = t.startTime.split("T")[0];
      if (!dateMap.has(dKey)) dateMap.set(dKey, []);
      dateMap.get(dKey)!.push(t);
    }
  });

  const updatedMap = new Map<string, Todo>();
  tasks.forEach((t) => updatedMap.set(String(t.id), t));

  dateMap.forEach((dayTasks, dKey) => {
    const count = dayTasks.length;
    const stepH = count > 1 ? Math.min(3, blockDuration / count) : 2;

    dayTasks.forEach((task, idx) => {
      const startHourNum = Math.min(endH - 1, Math.floor(startH + idx * stepH));
      const startStr = String(startHourNum).padStart(2, "0") + ":00:00";
      const durHours = Math.max(1, Math.round((task.durationMinutes || 90) / 60));
      const endHourNum = Math.min(23, startHourNum + durHours);
      const endStr = String(endHourNum).padStart(2, "0") + ":00:00";

      updatedMap.set(String(task.id), {
        ...task,
        startTime: `${dKey}T${startStr}`,
        endTime: `${dKey}T${endStr}`,
        dateScheduled: dKey,
        updatedAt: Date.now(),
      });
    });
  });

  return Array.from(updatedMap.values());
}
