import { describe, it, expect } from "vitest";
import {
  reconcileState,
  mergeTaskArrays,
  hasMeaningfulUserData,
} from "./reconciliation";

describe("Local-First Data Safety & Reconciliation", () => {
  it("hasMeaningfulUserData distinguishes blank defaults from real user progress", () => {
    expect(hasMeaningfulUserData(null)).toBe(false);
    expect(hasMeaningfulUserData({})).toBe(false);
    expect(
      hasMeaningfulUserData({
        xp: 0,
        level: 1,
        questionsSolved: 0,
        streakDays: 0,
        playerName: "Player 1",
        todos: [],
        history: [],
        backlogPlan: null,
      })
    ).toBe(false);

    expect(hasMeaningfulUserData({ xp: 150 })).toBe(true);
    expect(
      hasMeaningfulUserData({
        todos: [{ id: 1, text: "Physics Lecture 1", completed: false }],
      })
    ).toBe(true);
    expect(
      hasMeaningfulUserData({
        todos: [{ id: 1, text: "Deleted", isDeleted: true }],
      })
    ).toBe(false);
    expect(
      hasMeaningfulUserData({
        backlogPlan: { subjects: [{ name: "Physics", chapters: [] }] },
      })
    ).toBe(true);
    expect(hasMeaningfulUserData({ playerName: "Madhav" })).toBe(true);
  });

  it("NEVER lets an empty cloud doc with a newer timestamp wipe or zero out local data", () => {
    const localState = {
      xp: 12450,
      level: 8,
      streakDays: 14,
      questionsSolved: 320,
      xpGainedToday: 540,
      hoursStudiedToday: 4.5,
      playerName: "Madhav",
      todos: [
        {
          id: "t1",
          text: "Rotational Motion — Lecture 3",
          completed: false,
          subject: "Physics",
          type: "Lecture",
          updatedAt: 1700000000000,
        },
      ],
      history: [
        {
          date: "2026-11-14T10:00:00.000Z",
          hoursStudied: 6,
          xpEarned: 1200,
          completedTasks: [],
          plannedTasks: [],
        },
      ],
      backlogPlan: {
        id: "plan-1",
        subjects: [{ name: "Physics", chapters: [{ name: "Friction" }] }],
      },
      lastSyncTimestamp: 1700000000000,
    };

    // Simulate a blank cloud document stamped with a MUCH NEWER serverTimestamp
    const blankNewerCloud = {
      xp: 0,
      level: 1,
      streakDays: 0,
      questionsSolved: 0,
      xpGainedToday: 0,
      hoursStudiedToday: 0,
      playerName: "Player 1",
      todos: [],
      history: [],
      backlogPlan: null,
      updatedAt: 1900000000000,
      lastSyncTimestamp: 1900000000000,
    };

    const { mergedState, needsCloudUpload, localWasNewer } = reconcileState(
      localState,
      blankNewerCloud
    );

    expect(localWasNewer).toBe(true);
    expect(needsCloudUpload).toBe(true);
    expect(mergedState.xp).toBe(12450);
    expect(mergedState.level).toBe(8);
    expect(mergedState.streakDays).toBe(14);
    expect(mergedState.questionsSolved).toBe(320);
    expect(mergedState.playerName).toBe("Madhav");
    expect(mergedState.todos).toHaveLength(1);
    expect(mergedState.history).toHaveLength(1);
    expect(mergedState.backlogPlan?.id).toBe("plan-1");
  });

  it("preserves full local state verbatim when cloud returns null/unavailable", () => {
    const localState = {
      xp: 5000,
      todos: [{ id: 1, text: "Keep me", completed: false }],
    };
    const res = reconcileState(localState, null);
    expect(res.mergedState).toEqual(localState);
    expect(res.needsCloudUpload).toBe(true);
    expect(res.localWasNewer).toBe(true);
  });

  it("restores populated cloud data cleanly when local is genuinely empty", () => {
    const emptyLocal = {
      xp: 0,
      level: 1,
      todos: [],
      history: [],
      backlogPlan: null,
      playerName: "Player 1",
      lastSyncTimestamp: Date.now(),
    };
    const populatedCloud = {
      xp: 8900,
      level: 6,
      streakDays: 9,
      questionsSolved: 150,
      playerName: "Madhav",
      todos: [{ id: "c1", text: "Cloud Task", completed: false }],
      history: [],
      backlogPlan: { id: "cloud-plan", subjects: [{ name: "Chemistry", chapters: [] }] },
      lastSyncTimestamp: Date.now() - 60000,
    };

    const { mergedState } = reconcileState(emptyLocal, populatedCloud);
    expect(mergedState.xp).toBe(8900);
    expect(mergedState.streakDays).toBe(9);
    expect(mergedState.questionsSolved).toBe(150);
    expect(mergedState.playerName).toBe("Madhav");
    expect(mergedState.todos.filter((t: any) => !t.isDeleted)).toHaveLength(1);
    expect(mergedState.backlogPlan?.id).toBe("cloud-plan");
  });

  it("prevents an older stale cloud tombstone from deleting a newer local task", () => {
    const localTasks: any[] = [
      {
        id: "task-42",
        text: "Updated locally after stale cloud delete",
        completed: false,
        updatedAt: 2000000,
      },
    ];
    const cloudTasks: any[] = [
      {
        id: "task-42",
        text: "Old cloud version",
        isDeleted: true,
        deletedAt: 1000000,
      },
    ];

    const merged = mergeTaskArrays(localTasks, cloudTasks);
    expect(merged).toHaveLength(1);
    expect(merged[0].isDeleted).toBeFalsy();
    expect(merged[0].text).toBe("Updated locally after stale cloud delete");
  });

  it("honors a genuinely newer cloud tombstone over an older local task", () => {
    const localTasks: any[] = [
      {
        id: "task-99",
        text: "Older local task",
        completed: false,
        updatedAt: 1000000,
      },
    ];
    const cloudTasks: any[] = [
      {
        id: "task-99",
        text: "Deleted on another device",
        isDeleted: true,
        deletedAt: Date.now(),
      },
    ];

    const merged = mergeTaskArrays(localTasks, cloudTasks);
    expect(merged).toHaveLength(1);
    expect(merged[0].isDeleted).toBe(true);
  });
});
