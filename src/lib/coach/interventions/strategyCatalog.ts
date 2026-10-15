// src/lib/coach/interventions/strategyCatalog.ts
/**
 * Canonical Strategy & Mission Catalog.
 * As defined in Audit Section 5.3 & 6.3 (item 2).
 * Every mission matches ^If .+, then I will .+[.]$
 * Process XP only. Flat and capped.
 */

import type { Mission, MissionId, ISODate, Subject } from "../types";

export interface MissionParams {
  today: ISODate;
  subject?: Subject | string;
  chapter?: string;
  chapters?: string[];
  startTime?: string;
  wakeTime?: string;
  lightsOutTime?: string;
  questionCount?: number;
  availableHours?: number;
  repairAction?: string;
  targetSleepHours?: number;
}

export const MISSION_XP: Record<MissionId, number> = {
  M0_RECOVERY_SLEEP: 150,
  M1_RETRIEVAL_FIRST: 200,
  M2_WORKED_EXAMPLE_LADDER: 150,
  M3_SPACED_REVIEW: 150,
  M4_INTERLEAVED_MIX: 150,
  M5_ERROR_REPAIR: 150,
  M6_SCHEDULE_FIT: 100,
  M7_MOMENTUM_REANCHOR: 100,
  M8_CALIBRATION_PREDICT: 100,
  M9_DEVICE_QUARANTINE: 100,
  M10_STRETCH_SET: 200,
};

export function buildMission(id: MissionId, p: MissionParams): Mission {
  const window = { from: p.today, to: p.today };
  const sub = p.subject || "Physics";
  const chap = p.chapter || "Laws of Motion";
  const n = p.questionCount || 15;
  const time = p.startTime || "16:00";
  const lights = p.lightsOutTime || "22:30";
  const wake = p.wakeTime || "06:00";

  switch (id) {
    case "M0_RECOVERY_SLEEP":
      return {
        id: "M0_RECOVERY_SLEEP",
        kind: "RECOVERY",
        title: "Physiological Recovery Window",
        ifThen: `If it is ${lights}, then I will close the books and screens and sleep until ${wake}.`,
        window,
        targetSleepHours: p.targetSleepHours || 6.0,
        verify: { type: "SLEEP_AT_LEAST", hours: Math.max(5.0, (p.targetSleepHours || 6.0) - 0.5) },
        xp: MISSION_XP.M0_RECOVERY_SLEEP,
        evidenceId: "EVD_SLEEP_CONSOLIDATION",
        metric: "Next-day sleep and cognitive recovery",
      };

    case "M1_RETRIEVAL_FIRST":
      return {
        id: "M1_RETRIEVAL_FIRST",
        kind: "STUDY",
        title: "Closed-Book Retrieval Lock",
        ifThen: `If I sit down for ${sub} at ${time}, then I will do a closed-book timed set of ${n} questions on ${chap} before opening any video or notes, and check answers only after the timer ends.`,
        window,
        durationMin: 45,
        verify: { type: "SESSION_LOGGED", subject: sub, chapter: chap, minAttempts: n, timed: true },
        xp: MISSION_XP.M1_RETRIEVAL_FIRST,
        evidenceId: "EVD_RETRIEVAL_PRACTICE",
        metric: "Active retrieval share vs passive lecture",
      };

    case "M2_WORKED_EXAMPLE_LADDER":
      return {
        id: "M2_WORKED_EXAMPLE_LADDER",
        kind: "STUDY",
        title: "Worked-Example Scaffolding Ladder",
        ifThen: `If I start ${chap} at ${time}, then I will study 2 worked examples line by line, solve 1 with the last step hidden, then solve 1 fully on my own.`,
        window,
        durationMin: 45,
        verify: { type: "SESSION_LOGGED", subject: sub, chapter: chap, minAttempts: 3, minTier: 1 },
        xp: MISSION_XP.M2_WORKED_EXAMPLE_LADDER,
        evidenceId: "EVD_COGNITIVE_LOAD",
        metric: "Novice schema acquisition and tier-1 accuracy",
      };

    case "M3_SPACED_REVIEW":
      return {
        id: "M3_SPACED_REVIEW",
        kind: "STUDY",
        title: "Spaced Consolidation Review",
        ifThen: `If it is ${time}, then I will do 10-15 closed-book questions on each of ${p.chapters ? p.chapters.slice(0, 3).join(", ") : chap} before starting anything new.`,
        window,
        durationMin: 45,
        verify: { type: "SESSION_LOGGED", minAttempts: 10, timed: true },
        xp: MISSION_XP.M3_SPACED_REVIEW,
        evidenceId: "EVD_DISTRIBUTED_PRACTICE",
        metric: "Half-life retrievability restoration",
      };

    case "M4_INTERLEAVED_MIX":
      return {
        id: "M4_INTERLEAVED_MIX",
        kind: "STUDY",
        title: "Interleaved Discriminate Set",
        ifThen: `If I finish ${chap}, then I will shuffle 4 problems each from ${p.chapters ? p.chapters.slice(0, 3).join(", ") : "related topics"} and name the governing principle before solving each.`,
        window,
        durationMin: 60,
        verify: { type: "SESSION_LOGGED", minAttempts: 12 },
        xp: MISSION_XP.M4_INTERLEAVED_MIX,
        evidenceId: "EVD_INTERLEAVING",
        metric: "Mixed-set discrimination accuracy",
      };

    case "M5_ERROR_REPAIR":
      return {
        id: "M5_ERROR_REPAIR",
        kind: "STUDY",
        title: "Targeted Error Reconstruction",
        ifThen: `If I get a problem wrong in ${chap}, then I will ${p.repairAction || "explain the core principle in my own words and solve a fresh variation"} before moving on.`,
        window,
        durationMin: 30,
        verify: { type: "SESSION_LOGGED", chapter: chap, minAttempts: 5 },
        xp: MISSION_XP.M5_ERROR_REPAIR,
        evidenceId: "EVD_ELABORATIVE_ERROR",
        metric: "Specific error tag reduction",
      };

    case "M6_SCHEDULE_FIT":
      return {
        id: "M6_SCHEDULE_FIT",
        kind: "STUDY",
        title: "Capacity-Constrained Planning",
        ifThen: `If I open the planner tonight, then I will keep only 2 tasks that fit ${p.availableHours || 3} hours and finish both before adding anything.`,
        window,
        durationMin: 20,
        verify: { type: "TASKS_WITHIN_CAPACITY", maxTasks: 3 },
        xp: MISSION_XP.M6_SCHEDULE_FIT,
        evidenceId: "EVD_IMPLEMENTATION_INTENTIONS",
        metric: "Task completion rate on constrained days",
      };

    case "M7_MOMENTUM_REANCHOR":
      return {
        id: "M7_MOMENTUM_REANCHOR",
        kind: "STUDY",
        title: "Low-Friction Momentum Re-Anchor",
        ifThen: `If I sit down at ${time}, then I will do a 25-minute set on a chapter I already know before touching anything new.`,
        window,
        durationMin: 25,
        verify: { type: "SESSION_LOGGED", minAttempts: 8 },
        xp: MISSION_XP.M7_MOMENTUM_REANCHOR,
        evidenceId: "EVD_MOMENTUM_ANCHOR",
        metric: "Study habit re-initiation",
      };

    case "M8_CALIBRATION_PREDICT":
      return {
        id: "M8_CALIBRATION_PREDICT",
        kind: "STUDY",
        title: "Pre-Session Calibration Forecast",
        ifThen: `If I am about to start a timed set, then I will write my predicted score first and compare after.`,
        window,
        durationMin: 20,
        verify: { type: "SELF_CONFIRM" },
        xp: MISSION_XP.M8_CALIBRATION_PREDICT,
        evidenceId: "EVD_CALIBRATION",
        metric: "Judgment of Learning (JOL) calibration gap",
      };

    case "M9_DEVICE_QUARANTINE":
      return {
        id: "M9_DEVICE_QUARANTINE",
        kind: "STUDY",
        title: "Environment Distraction Quarantine",
        ifThen: `If a study block starts, then I will put my phone in another room until the block ends.`,
        window,
        durationMin: 45,
        verify: { type: "SELF_CONFIRM" },
        xp: MISSION_XP.M9_DEVICE_QUARANTINE,
        evidenceId: "EVD_ATTENTION_RESIDUE",
        metric: "Session focus preservation",
      };

    case "M10_STRETCH_SET":
      return {
        id: "M10_STRETCH_SET",
        kind: "STUDY",
        title: "Deliberate Mastery Stretch",
        ifThen: `If my review block is done, then I will do ${n} timed questions one tier up, or at the same tier with 10% less time.`,
        window,
        durationMin: 45,
        verify: { type: "SESSION_LOGGED", minAttempts: n, timed: true, minTier: 3 },
        xp: MISSION_XP.M10_STRETCH_SET,
        evidenceId: "EVD_FLOW_CHALLENGE_TUNING",
        metric: "High-tier execution and speed threshold",
      };
  }
}
