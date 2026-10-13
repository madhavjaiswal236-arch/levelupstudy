// src/lib/coach/persistence/migrate.ts
/**
 * Pure migration pipelines for persistent mentor engine state.
 */

import { CURRENT_SCHEMA_VERSION, VersionedMentorState, validateSanityBounds } from "./schema";

export function createDefaultMentorState(): VersionedMentorState {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    lastUpdated: new Date().toISOString(),
    chapterMasteries: {},
    outcomeHistory: [],
    scheduleProfile: {
      Sunday: "FULL_STUDY_DAY",
      Monday: "SCHOOL_DAY",
      Tuesday: "SCHOOL_DAY",
      Wednesday: "SCHOOL_DAY",
      Thursday: "SCHOOL_DAY",
      Friday: "SCHOOL_DAY",
      Saturday: "FULL_STUDY_DAY",
    },
    quarantinedRecords: [],
  };
}

export function migrateMentorState(rawState: any): VersionedMentorState {
  if (!rawState || typeof rawState !== "object") {
    return createDefaultMentorState();
  }

  let state: VersionedMentorState = {
    schemaVersion: Number(rawState.schemaVersion) || 1,
    lastUpdated: rawState.lastUpdated || new Date().toISOString(),
    chapterMasteries: rawState.chapterMasteries || {},
    outcomeHistory: Array.isArray(rawState.outcomeHistory) ? rawState.outcomeHistory : [],
    scheduleProfile: rawState.scheduleProfile || {
      Sunday: "FULL_STUDY_DAY",
      Monday: "SCHOOL_DAY",
      Tuesday: "SCHOOL_DAY",
      Wednesday: "SCHOOL_DAY",
      Thursday: "SCHOOL_DAY",
      Friday: "SCHOOL_DAY",
      Saturday: "FULL_STUDY_DAY",
    },
    quarantinedRecords: Array.isArray(rawState.quarantinedRecords) ? rawState.quarantinedRecords : [],
  };

  // Step 1: Migrate v1 -> v2
  if (state.schemaVersion < 2) {
    // Validate masteries and sanitize
    const sanitizedMasteries: Record<string, any> = {};
    for (const [key, val] of Object.entries(state.chapterMasteries)) {
      if (val && typeof val === "object") {
        sanitizedMasteries[key] = {
          key,
          pL: Math.min(0.99, Math.max(0.01, typeof (val as any).pL === "number" ? (val as any).pL : 0.2)),
          evidenceCount: Number((val as any).evidenceCount) || 0,
          distinctDays: Number((val as any).distinctDays) || 0,
          halfLifeDays: Math.min(90, Math.max(1, Number((val as any).halfLifeDays) || 1.6)),
          lastRetrievalDate: (val as any).lastRetrievalDate || null,
          errorTotals: (val as any).errorTotals || {
            KNOWLEDGE_DEFICIT: 0,
            PROCEDURAL_FLAW: 0,
            ATTENTIONAL_SLIP: 0,
            TRANSFER_FAILURE: 0,
          },
        };
      }
    }
    state.chapterMasteries = sanitizedMasteries;
    state.schemaVersion = 2;
  }

  return state;
}

export function sanitizeHistoryArray(history: any[]): { clean: any[]; quarantined: any[] } {
  const clean: any[] = [];
  const quarantined: any[] = [];

  for (const item of history) {
    const sanity = validateSanityBounds({
      hours: item.hoursStudied ?? item.hours,
      sleep: item.sleepTime ?? item.sleep,
      screen: item.screenTime ?? item.screen,
      attempted: item.attempted,
      correct: item.correct,
    });

    if (sanity.valid) {
      clean.push(item);
    } else {
      quarantined.push({
        reason: sanity.reason || "Sanity bound violation",
        payload: item,
        timestamp: new Date().toISOString(),
      });
    }
  }

  return { clean, quarantined };
}
