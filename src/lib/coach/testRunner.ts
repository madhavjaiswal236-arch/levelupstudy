import { generateDeterministicCoachReport } from "./engine";
import { RawCoachInput } from "./types";

export function runCoachTests(): { passed: boolean; testResults: { name: string; success: boolean; detail: string }[] } {
  const results: { name: string; success: boolean; detail: string }[] = [];

  // Test 1: Strong breakthrough day
  const test1Input: RawCoachInput = {
    hours: 8.5,
    sleep: 8.0,
    screenTime: 1.5,
    completedTasks: [{ id: 1, text: "Laws of Motion PYQs", completed: true, xpReward: 50, type: "Practice" }],
    plannedTasks: [{ id: 1, text: "Laws of Motion PYQs", completed: true, xpReward: 50, type: "Practice" }],
    practiceSessions: [{ id: "s1", date: "2026-08-10", subject: "Physics", chapter: "Laws of Motion", attempted: 45, correct: 40, timeSpent: 120, mistakes: [] }],
    history: [
      { date: "2026-08-05", hoursStudied: 4.0, xpEarned: 200, completedTasks: [], screenTime: 3.0, sleepTime: 7.0 },
      { date: "2026-08-06", hoursStudied: 4.5, xpEarned: 220, completedTasks: [], screenTime: 3.0, sleepTime: 7.5 },
      { date: "2026-08-07", hoursStudied: 5.0, xpEarned: 250, completedTasks: [], screenTime: 2.5, sleepTime: 7.0 },
      { date: "2026-08-08", hoursStudied: 5.0, xpEarned: 250, completedTasks: [], screenTime: 2.5, sleepTime: 7.5 },
    ],
  };

  const res1 = generateDeterministicCoachReport(test1Input);
  const t1Success = res1.explanation.states.performance === "BREAKTHROUGH" || res1.explanation.states.performance === "STRONG_DAY";
  results.push({ name: "Test 1: Breakthrough Day", success: t1Success, detail: `State: ${res1.explanation.states.performance}, Focus: ${res1.explanation.priority.primaryFocus}` });

  // Test 2: Burnout Risk (High hours, low sleep)
  const test2Input: RawCoachInput = {
    hours: 9.0,
    sleep: 4.0,
    screenTime: 2.0,
  };
  const res2 = generateDeterministicCoachReport(test2Input);
  const t2Success = res2.explanation.priority.primaryFocus === "recovery" && res2.explanation.severity.isHealthCritical;
  results.push({ name: "Test 2: Burnout Risk Health Override", success: t2Success, detail: `Is Health Critical: ${res2.explanation.severity.isHealthCritical}, Primary Focus: ${res2.explanation.priority.primaryFocus}` });

  // Test 3: Total Collapse Day
  const test3Input: RawCoachInput = {
    hours: 0.5,
    sleep: 5.0,
    screenTime: 7.0,
  };
  const res3 = generateDeterministicCoachReport(test3Input);
  const t3Success = res3.explanation.states.performance === "TOTAL_COLLAPSE";
  results.push({ name: "Test 3: Total Collapse Day", success: t3Success, detail: `State: ${res3.explanation.states.performance}` });

  // Test 4: Golden Test - Two students with identical today metrics but different history
  // Student A: Improving trajectory
  const studentAInput: RawCoachInput = {
    date: "2026-08-11",
    hours: 5.0,
    sleep: 7.5,
    screenTime: 2.0,
    history: [
      { date: "2026-08-07", hoursStudied: 2.0, xpEarned: 100, completedTasks: [], screenTime: 2.0, sleepTime: 7.5 },
      { date: "2026-08-08", hoursStudied: 2.5, xpEarned: 120, completedTasks: [], screenTime: 2.0, sleepTime: 7.5 },
      { date: "2026-08-09", hoursStudied: 3.0, xpEarned: 150, completedTasks: [], screenTime: 2.0, sleepTime: 7.5 },
      { date: "2026-08-10", hoursStudied: 4.0, xpEarned: 200, completedTasks: [], screenTime: 2.0, sleepTime: 7.5 },
    ],
  };

  // Student B: Declining trajectory
  const studentBInput: RawCoachInput = {
    date: "2026-08-11",
    hours: 5.0,
    sleep: 7.5,
    screenTime: 2.0,
    history: [
      { date: "2026-08-07", hoursStudied: 9.0, xpEarned: 450, completedTasks: [], screenTime: 2.0, sleepTime: 7.5 },
      { date: "2026-08-08", hoursStudied: 8.5, xpEarned: 420, completedTasks: [], screenTime: 2.0, sleepTime: 7.5 },
      { date: "2026-08-09", hoursStudied: 7.5, xpEarned: 380, completedTasks: [], screenTime: 2.0, sleepTime: 7.5 },
      { date: "2026-08-10", hoursStudied: 6.5, xpEarned: 320, completedTasks: [], screenTime: 2.0, sleepTime: 7.5 },
    ],
  };

  const resA = generateDeterministicCoachReport(studentAInput);
  const resB = generateDeterministicCoachReport(studentBInput);

  const goldenTestSuccess = resA.explanation.trends.hoursDirection === "IMPROVING" && resB.explanation.trends.hoursDirection === "DECLINING";
  results.push({
    name: "Golden Test: Trajectory Personalization",
    success: goldenTestSuccess,
    detail: `Student A trend: ${resA.explanation.trends.hoursDirection}, Student B trend: ${resB.explanation.trends.hoursDirection}`,
  });

  // Test 5: Edge cases - NaN and negative numbers
  const test5Input: RawCoachInput = {
    hours: -10 as any,
    sleep: NaN as any,
    screenTime: Infinity as any,
  };
  const res5 = generateDeterministicCoachReport(test5Input);
  const t5Success = res5.explanation.facts.hoursToday === 0 && res5.explanation.facts.sleepToday === 7 && res5.explanation.facts.screenToday === 24;
  results.push({ name: "Test 5: Edge Case Bounds Normalization", success: t5Success, detail: `Normalized hours: ${res5.explanation.facts.hoursToday}, sleep: ${res5.explanation.facts.sleepToday}, screen: ${res5.explanation.facts.screenToday}` });

  // Test 6: Overplanning Detection
  const test6Input: RawCoachInput = {
    hours: 5.0,
    sleep: 7.5,
    screenTime: 2.0,
    plannedTasks: Array(8).fill(null).map((_, i) => ({ id: i, text: `Task ${i}`, completed: i < 2, xpReward: 50, type: "Practice" as const })),
    completedTasks: [
      { id: 0, text: "Task 0", completed: true, xpReward: 50, type: "Practice" as const },
      { id: 1, text: "Task 1", completed: true, xpReward: 50, type: "Practice" as const }
    ],
  };
  const res6 = generateDeterministicCoachReport(test6Input);
  const t6Success = res6.explanation.states.planning === "OVERPLANNING";
  results.push({ name: "Test 6: Overplanning State Classification", success: t6Success, detail: `Planning state: ${res6.explanation.states.planning}` });

  // Test 7: Subject Avoidance & Weakest Subject Computation
  const test7Input: RawCoachInput = {
    hours: 5.0,
    sleep: 7.0,
    screenTime: 2.0,
    practiceSessions: [
      { id: "s1", subject: "Physics", chapter: "Mechanics", attempted: 30, correct: 25, timeSpent: 60, mistakes: [], date: "2026-08-11" },
      { id: "s2", subject: "Mathematics", chapter: "Calculus", attempted: 30, correct: 25, timeSpent: 60, mistakes: [], date: "2026-08-11" },
    ],
  };
  const res7 = generateDeterministicCoachReport(test7Input);
  const t7Success = res7.explanation.derivedMetrics.neglectedSubjects.includes("Chemistry") && res7.explanation.derivedMetrics.weakestSubject === "Chemistry";
  results.push({ name: "Test 7: Subject Avoidance & Weakest Subject", success: t7Success, detail: `Neglected: ${res7.explanation.derivedMetrics.neglectedSubjects.join(", ")}, Weakest: ${res7.explanation.derivedMetrics.weakestSubject}` });

  const allPassed = results.every((r) => r.success);
  return { passed: allPassed, testResults: results };
}
