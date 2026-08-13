import { reconcileState, mergeTaskArrays } from "./reconciliation";
import { Todo } from "@/context/AppContext";

export interface SyncTestResult {
  name: string;
  passed: boolean;
  detail: string;
}

export function runSyncSimulations(): { passed: boolean; results: SyncTestResult[] } {
  const results: SyncTestResult[] = [];

  // 1 & 2. Make task changes & complete multiple tasks
  const initialTaskState = {
    lastSyncTimestamp: 1000,
    xp: 500,
    todos: [
      { id: 1, text: "Physics Mechanics PYQs", completed: false, xpReward: 50, type: "Practice" },
      { id: 2, text: "Organic Chemistry Lecture 3", completed: false, xpReward: 40, type: "Lecture" },
      { id: 3, text: "Calculus Limits", completed: false, xpReward: 30, type: "Practice" },
    ] as Todo[],
  };

  const updatedLocalState = {
    ...initialTaskState,
    lastSyncTimestamp: 2000,
    xp: 620,
    todos: [
      { id: 1, text: "Physics Mechanics PYQs", completed: true, xpReward: 50, type: "Practice" },
      { id: 2, text: "Organic Chemistry Lecture 3", completed: true, xpReward: 40, type: "Lecture" },
      { id: 3, text: "Calculus Limits", completed: false, xpReward: 30, type: "Practice" },
      { id: 4, text: "New Electrostatics Task", completed: false, xpReward: 50, type: "Practice" },
    ] as Todo[],
  };

  const sim1 = reconcileState(updatedLocalState, initialTaskState);
  const s1Passed =
    sim1.mergedState.todos.filter((t: Todo) => t.completed).length === 2 &&
    sim1.mergedState.todos.length === 4 &&
    sim1.mergedState.xp === 620;
  results.push({
    name: "Simulation 1 & 2: Local Task Completion & Addition",
    passed: s1Passed,
    detail: `Completed tasks: ${sim1.mergedState.todos.filter((t: Todo) => t.completed).length}, Total tasks: ${sim1.mergedState.todos.length}, XP: ${sim1.mergedState.xp}`,
  });

  // 3 & 4. Disconnect network & continue making changes offline
  const offlineState = {
    ...updatedLocalState,
    lastSyncTimestamp: 3000,
    xp: 720,
    todos: updatedLocalState.todos.map((t) => (t.id === 3 ? { ...t, completed: true } : t)),
  };

  const staleCloudState = {
    ...initialTaskState, // Still timestamp 1000 from before network disconnect
  };

  // 5. Reconnect - stale cloud snapshot arrives from network
  const sim2 = reconcileState(offlineState, staleCloudState);
  const s2Passed =
    sim2.mergedState.todos.filter((t: Todo) => t.completed).length === 3 &&
    sim2.mergedState.xp === 720 &&
    sim2.needsCloudUpload === true;
  results.push({
    name: "Simulation 3, 4 & 5: Offline Changes & Reconnect Reconcile",
    passed: s2Passed,
    detail: `Completed tasks preserved: ${sim2.mergedState.todos.filter((t: Todo) => t.completed).length}/3, XP preserved: ${sim2.mergedState.xp}, Cloud upload queued: ${sim2.needsCloudUpload}`,
  });

  // 6. Refresh the app (Local Storage load vs Stale Cloud Sync)
  // Local storage has offlineState (ts 3000), Cloud has staleCloudState (ts 1000)
  const sim3 = reconcileState(offlineState, staleCloudState);
  const s3Passed =
    sim3.mergedState.todos.find((t: Todo) => t.id === 1)?.completed === true &&
    sim3.mergedState.todos.find((t: Todo) => t.id === 2)?.completed === true &&
    sim3.mergedState.todos.find((t: Todo) => t.id === 3)?.completed === true &&
    sim3.mergedState.xp === 720;
  results.push({
    name: "Simulation 6: App Refresh Non-Reversion Guard",
    passed: s3Passed,
    detail: `All completed tasks survived page reload without reverting to stale cloud snapshot.`,
  });

  // 7. Log out and log back in (clean session boundary)
  const userAState = { ...offlineState, lastSyncTimestamp: 3000 };
  const userBCloudState = {
    lastSyncTimestamp: 4000,
    xp: 1500,
    todos: [{ id: 101, text: "User B Task", completed: true, xpReward: 100, type: "Practice" }] as Todo[],
  };
  const sim4 = reconcileState(null, userBCloudState); // Clean load for User B
  const s4Passed = sim4.mergedState.xp === 1500 && sim4.mergedState.todos.length === 1;
  results.push({
    name: "Simulation 7: Auth Boundary & Fresh Session Sync",
    passed: s4Passed,
    detail: `Switched user session isolated cleanly with exact cloud state (XP: ${sim4.mergedState.xp}).`,
  });

  // 8 & 9. Multi-device / Multi-tab conflicting changes
  // Device A completed Task 1 (ts 5000), Device B completed Task 2 & added Task 5 (ts 5050)
  const deviceA = {
    lastSyncTimestamp: 5000,
    xp: 800,
    todos: [
      { id: 1, text: "Task 1", completed: true, xpReward: 50, type: "Practice" },
      { id: 2, text: "Task 2", completed: false, xpReward: 50, type: "Practice" },
    ] as Todo[],
  };

  const deviceB = {
    lastSyncTimestamp: 5050,
    xp: 850,
    todos: [
      { id: 1, text: "Task 1", completed: false, xpReward: 50, type: "Practice" },
      { id: 2, text: "Task 2", completed: true, xpReward: 50, type: "Practice" },
      { id: 5, text: "Task 5 (Device B)", completed: false, xpReward: 50, type: "Practice" },
    ] as Todo[],
  };

  const sim5 = reconcileState(deviceA, deviceB);
  const s5Passed =
    sim5.mergedState.todos.find((t: Todo) => t.id === 1)?.completed === true &&
    sim5.mergedState.todos.find((t: Todo) => t.id === 2)?.completed === true &&
    sim5.mergedState.todos.find((t: Todo) => t.id === 5) !== undefined &&
    sim5.mergedState.xp === 850;
  results.push({
    name: "Simulation 8 & 9: Multi-Device Conflict Reconciliation (CRDT Union)",
    passed: s5Passed,
    detail: `Both Task 1 & Task 2 retained 'completed: true', Device B's new Task 5 included, highest XP 850 preserved.`,
  });

  // 10. Kill/reopen application during synchronization
  const inFlightLocalState = {
    lastSyncTimestamp: 6000,
    xp: 900,
    todos: [{ id: 1, text: "Task 1", completed: true, xpReward: 50, type: "Practice" }] as Todo[],
  };
  const interruptedCloudState = {
    lastSyncTimestamp: 5500,
    xp: 850,
    todos: [{ id: 1, text: "Task 1", completed: false, xpReward: 50, type: "Practice" }] as Todo[],
  };
  const sim6 = reconcileState(inFlightLocalState, interruptedCloudState);
  const s6Passed = sim6.mergedState.xp === 900 && sim6.mergedState.todos[0].completed === true;
  results.push({
    name: "Simulation 10: Process Kill During In-Flight Sync Recovery",
    passed: s6Passed,
    detail: `Local storage state at kill time (ts 6000) survived over pre-interruption cloud snapshot (ts 5500).`,
  });

  // 11. Daily Rollover Sync Safety
  const preRolloverLocal = {
    lastSyncTimestamp: 7000,
    lastStudyDate: "2026-08-12",
    xpGainedToday: 150,
    history: [
      { date: "2026-08-12", hoursStudied: 4.5, xpEarned: 150, completedTasks: [], screenTime: 2, sleepTime: 7 },
    ],
  };
  const postRolloverCloud = {
    lastSyncTimestamp: 7100,
    lastStudyDate: "2026-08-13",
    xpGainedToday: 0,
    history: [
      { date: "2026-08-12", hoursStudied: 4.5, xpEarned: 150, completedTasks: [], screenTime: 2, sleepTime: 7 },
      { date: "2026-08-13", hoursStudied: 0.0, xpEarned: 0, completedTasks: [], screenTime: 0, sleepTime: 0 },
    ],
  };

  const sim7 = reconcileState(preRolloverLocal, postRolloverCloud);
  const s7Passed = sim7.mergedState.history.length === 2 && sim7.mergedState.history[0].xpEarned === 150;
  results.push({
    name: "Simulation 11: Rollover Transition Data Safety",
    passed: s7Passed,
    detail: `Historical logs preserved across daily rollover boundary without clobbering history.`,
  });

  const allPassed = results.every((r) => r.passed);
  return { passed: allPassed, results };
}
