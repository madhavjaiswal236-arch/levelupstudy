// src/lib/coach/student-model/profile.ts
/**
 * Student Schedule Profile & Weekly Day-Type Registry.
 */

import type { DayType } from "../types";

export interface StudentScheduleProfile {
  weeklyDayTypes: Record<string, DayType>;
  targetSleepHours: number;
  usualWakeTime: string; // e.g. "06:00"
  maxConsecutiveStudyHours: number;
  studyBlockStart?: string; // e.g. "06:00"
  studyBlockEnd?: string;   // e.g. "22:00"
  intakeAnswers?: {
    revisionStyle?: string;
    predictionAccuracy?: string;
    longestFocusBlock?: string;
    initiationFriction?: string;
  };
}

export const DEFAULT_SCHEDULE_PROFILE: StudentScheduleProfile = {
  weeklyDayTypes: {
    Sunday: "FULL_STUDY_DAY",
    Monday: "SCHOOL_DAY",
    Tuesday: "SCHOOL_DAY",
    Wednesday: "SCHOOL_DAY",
    Thursday: "SCHOOL_DAY",
    Friday: "COACHING_DAY",
    Saturday: "FULL_STUDY_DAY",
  },
  targetSleepHours: 6.0,
  usualWakeTime: "06:00",
  maxConsecutiveStudyHours: 3.5,
  studyBlockStart: "06:00",
  studyBlockEnd: "22:00",
};

export function getExpectedCapacityHours(dayType: DayType): number {
  switch (dayType) {
    case "SCHOOL_DAY":
      return 4.0;
    case "COACHING_DAY":
      return 5.0;
    case "FULL_STUDY_DAY":
      return 8.5;
    case "EXAM_DAY":
      return 6.0;
    case "REST_DAY":
      return 1.5;
    default:
      return 5.0;
  }
}
