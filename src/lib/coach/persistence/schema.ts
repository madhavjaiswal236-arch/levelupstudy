// src/lib/coach/persistence/schema.ts
/**
 * Schema definitions and sanity boundaries for persistent mentor state.
 */

export const CURRENT_SCHEMA_VERSION = 2;

export interface VersionedMentorState {
  schemaVersion: number;
  lastUpdated: string;
  chapterMasteries: Record<string, any>;
  outcomeHistory: any[];
  scheduleProfile: Record<string, string>;
  quarantinedRecords: Array<{
    reason: string;
    payload: any;
    timestamp: string;
  }>;
}

export const SANITY_BOUNDS = {
  MAX_HOURS_PER_DAY: 24,
  MAX_SLEEP_HOURS: 24,
  MAX_SCREEN_HOURS: 24,
  MAX_QUESTIONS_PER_SESSION: 500,
  MAX_TIME_PER_SESSION_MIN: 720,
};

export function validateSanityBounds(record: {
  hours?: number | null;
  sleep?: number | null;
  screen?: number | null;
  attempted?: number;
  correct?: number;
}): { valid: boolean; reason?: string } {
  if (record.hours !== undefined && record.hours !== null) {
    if (isNaN(record.hours) || record.hours < 0 || record.hours > SANITY_BOUNDS.MAX_HOURS_PER_DAY) {
      return { valid: false, reason: `Hours ${record.hours} exceeds valid range [0, 24]` };
    }
  }
  if (record.sleep !== undefined && record.sleep !== null) {
    if (isNaN(record.sleep) || record.sleep < 0 || record.sleep > SANITY_BOUNDS.MAX_SLEEP_HOURS) {
      return { valid: false, reason: `Sleep ${record.sleep} exceeds valid range [0, 24]` };
    }
  }
  if (record.screen !== undefined && record.screen !== null) {
    if (isNaN(record.screen) || record.screen < 0 || record.screen > SANITY_BOUNDS.MAX_SCREEN_HOURS) {
      return { valid: false, reason: `Screen ${record.screen} exceeds valid range [0, 24]` };
    }
  }
  if (record.attempted !== undefined && record.correct !== undefined) {
    if (record.correct > record.attempted) {
      return { valid: false, reason: `Correct (${record.correct}) exceeds attempted (${record.attempted})` };
    }
  }
  return { valid: true };
}
