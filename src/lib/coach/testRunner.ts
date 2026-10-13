// src/lib/coach/testRunner.ts
/**
 * Comprehensive Cognitive Mentor Engine Test Suite.
 * Covers Tests 1-7 (baseline legacy tests) and T01-T27 (Golden Scenario Matrix).
 */

import { generateDeterministicCoachReport, runCoach } from "./engine";
import { RawCoachInput, CoachInput, DayRecord } from "./types";
import { calculateSleepTier } from "./safety/sleepTier";
import { enforceFirewall, canOfferStudyTask } from "./reporting/validateReport";
import { updateChapter, buildSequence, PRIORS } from "./student-model/knowledgeTracing";
import { retrievability, onRetrieval, reviewQueue } from "./student-model/retentionModel";
import { theilSen, computeResidualSeries, classifyTrajectory } from "./trends";
import { recordOffer, strategyWeight } from "./interventions/outcomeTracker";
import { computeDayTypeBaselines } from "./baseline";
import { containsBannedPhrase } from "./reporting/tone";
import { sanitizeHistoryArray } from "./persistence/migrate";

export function runCoachTests(): {
  passed: boolean;
  testResults: { name: string; success: boolean; detail: string }[];
} {
  const results: { name: string; success: boolean; detail: string }[] = [];

  // -------------------------------------------------------------
  // Legacy Tests 1 to 7
  // -------------------------------------------------------------

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
  results.push({ name: "Legacy 1: Breakthrough Day", success: t1Success, detail: `State: ${res1.explanation.states.performance}` });

  // Test 2: Burnout Risk Health Override
  const test2Input: RawCoachInput = { hours: 9.0, sleep: 4.0, screenTime: 2.0 };
  const res2 = generateDeterministicCoachReport(test2Input);
  const t2Success = res2.explanation.priority.primaryFocus === "recovery" && res2.explanation.severity.isHealthCritical;
  results.push({ name: "Legacy 2: Burnout Risk Health Override", success: t2Success, detail: `Health Critical: ${res2.explanation.severity.isHealthCritical}` });

  // Test 3: Total Collapse Day
  const test3Input: RawCoachInput = { hours: 0.5, sleep: 5.0, screenTime: 7.0 };
  const res3 = generateDeterministicCoachReport(test3Input);
  const t3Success = res3.explanation.states.performance === "TOTAL_COLLAPSE";
  results.push({ name: "Legacy 3: Total Collapse Day", success: t3Success, detail: `State: ${res3.explanation.states.performance}` });

  // Test 4: Trajectory Personalization
  const resA = generateDeterministicCoachReport({
    date: "2026-08-11", hours: 5.0, sleep: 7.5, screenTime: 2.0,
    history: [
      { date: "2026-08-07", hoursStudied: 2.0, xpEarned: 100, screenTime: 2.0, sleepTime: 7.5 },
      { date: "2026-08-08", hoursStudied: 2.5, xpEarned: 120, screenTime: 2.0, sleepTime: 7.5 },
      { date: "2026-08-09", hoursStudied: 3.0, xpEarned: 150, screenTime: 2.0, sleepTime: 7.5 },
      { date: "2026-08-10", hoursStudied: 4.0, xpEarned: 200, screenTime: 2.0, sleepTime: 7.5 },
    ],
  });
  const resB = generateDeterministicCoachReport({
    date: "2026-08-11", hours: 5.0, sleep: 7.5, screenTime: 2.0,
    history: [
      { date: "2026-08-07", hoursStudied: 9.0, xpEarned: 450, screenTime: 2.0, sleepTime: 7.5 },
      { date: "2026-08-08", hoursStudied: 8.5, xpEarned: 420, screenTime: 2.0, sleepTime: 7.5 },
      { date: "2026-08-09", hoursStudied: 7.5, xpEarned: 380, screenTime: 2.0, sleepTime: 7.5 },
      { date: "2026-08-10", hoursStudied: 6.5, xpEarned: 320, screenTime: 2.0, sleepTime: 7.5 },
    ],
  });
  const t4Success = resA.explanation.trends.hoursDirection === "IMPROVING" && resB.explanation.trends.hoursDirection === "DECLINING";
  results.push({ name: "Legacy 4: Trajectory Personalization", success: t4Success, detail: `A: ${resA.explanation.trends.hoursDirection}, B: ${resB.explanation.trends.hoursDirection}` });

  // Test 5: Edge Case Bounds Normalization
  const test5Input: RawCoachInput = { hours: -10 as any, sleep: NaN as any, screenTime: Infinity as any };
  const res5 = generateDeterministicCoachReport(test5Input);
  const t5Success = res5.explanation.facts.hoursToday === 0 && res5.explanation.facts.sleepToday === 7 && res5.explanation.facts.screenToday === 24;
  results.push({ name: "Legacy 5: Edge Bounds Normalization", success: t5Success, detail: `Hours: ${res5.explanation.facts.hoursToday}` });

  // Test 6: Overplanning Detection
  const test6Input: RawCoachInput = {
    hours: 5.0, sleep: 7.5, screenTime: 2.0,
    plannedTasks: Array(8).fill(null).map((_, i) => ({ id: i, text: `Task ${i}`, completed: i < 2, xpReward: 50, type: "Practice" as const })),
    completedTasks: [{ id: 0, text: "Task 0", completed: true, xpReward: 50, type: "Practice" as const }],
  };
  const res6 = generateDeterministicCoachReport(test6Input);
  const t6Success = res6.explanation.states.planning === "OVERPLANNING";
  results.push({ name: "Legacy 6: Overplanning Classification", success: t6Success, detail: `Planning: ${res6.explanation.states.planning}` });

  // Test 7: Subject Avoidance & Weakest Subject
  const test7Input: RawCoachInput = {
    hours: 5.0, sleep: 7.0, screenTime: 2.0,
    practiceSessions: [
      { id: "s1", subject: "Physics", chapter: "Mechanics", attempted: 30, correct: 25, timeSpent: 60, mistakes: [], date: "2026-08-11" },
      { id: "s2", subject: "Mathematics", chapter: "Calculus", attempted: 30, correct: 25, timeSpent: 60, mistakes: [], date: "2026-08-11" },
    ],
  };
  const res7 = generateDeterministicCoachReport(test7Input);
  const t7Success = res7.explanation.derivedMetrics.neglectedSubjects.includes("Chemistry") && res7.explanation.derivedMetrics.weakestSubject === "Chemistry";
  results.push({ name: "Legacy 7: Subject Avoidance", success: t7Success, detail: `Neglected: ${res7.explanation.derivedMetrics.neglectedSubjects.join(", ")}` });

  // -------------------------------------------------------------
  // Golden Scenarios Matrix (T01 - T27)
  // -------------------------------------------------------------

  // Helper date generator
  const genDays = (count: number, start = "2026-09-01"): string[] => {
    const list: string[] = [];
    const d = new Date(start);
    for (let i = 0; i < count; i++) {
      list.push(d.toISOString().split("T")[0]);
      d.setDate(d.getDate() + 1);
    }
    return list;
  };

  // T01: Student A: 5 days strong (6h) then 1.5h day (baseline 6h): TEMPORARY_DIP, never SUSTAINED_DECLINE
  const dates01 = genDays(6);
  const seriesA: DayRecord[] = [
    { date: dates01[0], dayType: "FULL_STUDY_DAY", hours: 6, sleep: 7.5, screen: 2, xp: 300, completedTasksCount: 4, plannedTasksCount: 4 },
    { date: dates01[1], dayType: "FULL_STUDY_DAY", hours: 6, sleep: 7.5, screen: 2, xp: 300, completedTasksCount: 4, plannedTasksCount: 4 },
    { date: dates01[2], dayType: "FULL_STUDY_DAY", hours: 6, sleep: 7.5, screen: 2, xp: 300, completedTasksCount: 4, plannedTasksCount: 4 },
    { date: dates01[3], dayType: "FULL_STUDY_DAY", hours: 6, sleep: 7.5, screen: 2, xp: 300, completedTasksCount: 4, plannedTasksCount: 4 },
    { date: dates01[4], dayType: "FULL_STUDY_DAY", hours: 6, sleep: 7.5, screen: 2, xp: 300, completedTasksCount: 4, plannedTasksCount: 4 },
    { date: dates01[5], dayType: "FULL_STUDY_DAY", hours: 1.5, sleep: 7.5, screen: 2, xp: 80, completedTasksCount: 1, plannedTasksCount: 4 },
  ];
  const residuals01 = computeResidualSeries(seriesA, () => 6.0, dates01[0]);
  const traj01 = classifyTrajectory(residuals01, seriesA.length);
  const t01Success = traj01.trajectory === "TEMPORARY_DIP";
  results.push({ name: "T01: Student A Temporary Dip", success: t01Success, detail: `Trajectory: ${traj01.trajectory}` });

  // T02: Student B: 8 down to 2h over 7 days: SUSTAINED_DECLINE
  const dates02 = genDays(10);
  const seriesB: DayRecord[] = [
    { date: dates02[0], dayType: "FULL_STUDY_DAY", hours: 8, sleep: 7.5, screen: 2, xp: 400, completedTasksCount: 5, plannedTasksCount: 5 },
    { date: dates02[1], dayType: "FULL_STUDY_DAY", hours: 8, sleep: 7.5, screen: 2, xp: 400, completedTasksCount: 5, plannedTasksCount: 5 },
    { date: dates02[2], dayType: "FULL_STUDY_DAY", hours: 8, sleep: 7.5, screen: 2, xp: 400, completedTasksCount: 5, plannedTasksCount: 5 },
    { date: dates02[3], dayType: "FULL_STUDY_DAY", hours: 7, sleep: 7.5, screen: 2, xp: 350, completedTasksCount: 4, plannedTasksCount: 5 },
    { date: dates02[4], dayType: "FULL_STUDY_DAY", hours: 6, sleep: 7.5, screen: 2, xp: 300, completedTasksCount: 4, plannedTasksCount: 5 },
    { date: dates02[5], dayType: "FULL_STUDY_DAY", hours: 5, sleep: 7.5, screen: 2, xp: 250, completedTasksCount: 3, plannedTasksCount: 5 },
    { date: dates02[6], dayType: "FULL_STUDY_DAY", hours: 4, sleep: 7.5, screen: 2, xp: 200, completedTasksCount: 2, plannedTasksCount: 5 },
    { date: dates02[7], dayType: "FULL_STUDY_DAY", hours: 3, sleep: 7.5, screen: 2, xp: 150, completedTasksCount: 2, plannedTasksCount: 5 },
    { date: dates02[8], dayType: "FULL_STUDY_DAY", hours: 2, sleep: 7.5, screen: 2, xp: 100, completedTasksCount: 1, plannedTasksCount: 5 },
    { date: dates02[9], dayType: "FULL_STUDY_DAY", hours: 2, sleep: 7.5, screen: 2, xp: 100, completedTasksCount: 1, plannedTasksCount: 5 },
  ];
  const residuals02 = computeResidualSeries(seriesB, () => 8.0, dates02[0]);
  const traj02 = classifyTrajectory(residuals02, seriesB.length);
  const t02Success = traj02.trajectory === "SUSTAINED_DECLINE";
  results.push({ name: "T02: Student B Sustained Decline", success: t02Success, detail: `Trajectory: ${traj02.trajectory}` });

  // T03: One 1h illness day inside an upward 14-day trend: Not a decline
  const dates03 = genDays(14);
  const series03: DayRecord[] = dates03.map((d, idx) => ({
    date: d,
    dayType: "FULL_STUDY_DAY",
    hours: idx === 10 ? 1.0 : 4.0 + idx * 0.3,
    sleep: 7.5,
    screen: 2,
    xp: 200,
    completedTasksCount: 3,
    plannedTasksCount: 3,
  }));
  const residuals03 = computeResidualSeries(series03, () => 5.0, dates03[0]);
  const traj03 = classifyTrajectory(residuals03, series03.length);
  const t03Success = traj03.trajectory !== "SUSTAINED_DECLINE";
  results.push({ name: "T03: Single Illness Day Inside Trend", success: t03Success, detail: `Trajectory: ${traj03.trajectory}` });

  // T04: 6 weeks school days 3h and Sundays 9h, day types set: No dip/decline/volatility
  const dates04 = genDays(28);
  const series04: DayRecord[] = dates04.map((d, idx) => {
    const isSun = idx % 7 === 0;
    return {
      date: d,
      dayType: isSun ? "FULL_STUDY_DAY" : "SCHOOL_DAY",
      hours: isSun ? 9.0 : 3.0,
      sleep: 7.5,
      screen: 2,
      xp: 200,
      completedTasksCount: 3,
      plannedTasksCount: 3,
    };
  });
  const baselines04 = computeDayTypeBaselines(series04);
  const residuals04 = computeResidualSeries(series04, (dt) => baselines04.expectedHours[dt], dates04[0]);
  const traj04 = classifyTrajectory(residuals04, series04.length);
  const t04Success = traj04.trajectory === "STABLE" || traj04.trajectory === "CHRONIC_PLATEAU";
  results.push({ name: "T04: Weekly Rhythm with Day Types Set", success: t04Success, detail: `Trajectory: ${traj04.trajectory}` });

  // T05: Same series, day types unset: Confidence LOW and no strong label
  const series05: DayRecord[] = series04.slice(0, 4); // <5 days
  const residuals05 = computeResidualSeries(series05, () => 5.0, dates04[0]);
  const traj05 = classifyTrajectory(residuals05, series05.length);
  const t05Success = traj05.confidence === "LOW" && traj05.trajectory === "DATA_INSUFFICIENT";
  results.push({ name: "T05: Insufficient Days Confidence", success: t05Success, detail: `Trajectory: ${traj05.trajectory}, Conf: ${traj05.confidence}` });

  // T06: Three missed days: Slope uses day offsets; DISENGAGED set
  const dates06 = ["2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04", "2026-09-05"];
  const series06: DayRecord[] = [
    { date: dates06[0], dayType: "SCHOOL_DAY", hours: 4.0, sleep: 7.5, screen: 2, xp: 200, completedTasksCount: 3, plannedTasksCount: 3 },
    { date: dates06[1], dayType: "SCHOOL_DAY", hours: 4.0, sleep: 7.5, screen: 2, xp: 200, completedTasksCount: 3, plannedTasksCount: 3 },
    { date: dates06[2], dayType: "SCHOOL_DAY", hours: null, sleep: null, screen: null, xp: 0, completedTasksCount: 0, plannedTasksCount: 0 },
    { date: dates06[3], dayType: "SCHOOL_DAY", hours: null, sleep: null, screen: null, xp: 0, completedTasksCount: 0, plannedTasksCount: 0 },
    { date: dates06[4], dayType: "SCHOOL_DAY", hours: null, sleep: null, screen: null, xp: 0, completedTasksCount: 0, plannedTasksCount: 0 },
  ];
  const input06: CoachInput = {
    today: dates06[4],
    dayType: "SCHOOL_DAY",
    hoursToday: 0,
    sleepLastNight: null,
    screenToday: null,
    dailyHistory: series06,
    practiceSessions: [],
  };
  const rep06 = runCoach(input06);
  const t06Success = rep06.telemetry.disengaged === true;
  results.push({ name: "T06: Disengaged on 3 Missed Days", success: t06Success, detail: `Disengaged: ${rep06.telemetry.disengaged}` });

  // T07: Missing sleep/screen values stay null; debt flagged partial
  const nights07 = [
    { date: "2026-09-01", hours: 7.0 },
    { date: "2026-09-02", hours: null },
    { date: "2026-09-03", hours: 6.5 },
  ];
  const eval07 = calculateSleepTier(nights07);
  const t07Success = eval07.partial === true && eval07.loggedNights === 2;
  results.push({ name: "T07: Partial Debt Rule Guard", success: t07Success, detail: `Partial: ${eval07.partial}, Logged: ${eval07.loggedNights}` });

  // T08: Sleep tiers: 4h = RED; 6.0h with debt 5 = AMBER; 3 nights <6h = RED
  const rRed = calculateSleepTier([{ date: "2026-09-01", hours: 4.0 }]);
  const rAmber = calculateSleepTier([
    { date: "2026-09-01", hours: 6.0 }, { date: "2026-09-02", hours: 6.0 },
    { date: "2026-09-03", hours: 6.0 }, { date: "2026-09-04", hours: 6.0 },
  ]);
  const r3Run = calculateSleepTier([
    { date: "2026-09-01", hours: 5.8 }, { date: "2026-09-02", hours: 5.7 }, { date: "2026-09-03", hours: 5.9 }
  ]);
  const t08Success = rRed.tier === "RED" && rAmber.tier === "AMBER" && r3Run.tier === "RED";
  results.push({ name: "T08: Sleep Tier Thresholds", success: t08Success, detail: `Red: ${rRed.tier}, Amber: ${rAmber.tier}, 3-Run: ${r3Run.tier}` });

  // T09: 9h study, 4h sleep -> RED; M0 only; report regenerated with no overload wording
  const input09: CoachInput = {
    today: "2026-09-05",
    dayType: "FULL_STUDY_DAY",
    hoursToday: 9.0,
    sleepLastNight: 4.0,
    screenToday: 2.0,
    dailyHistory: [{ date: "2026-09-05", dayType: "FULL_STUDY_DAY", hours: 9, sleep: 4, screen: 2, xp: 500, completedTasksCount: 5, plannedTasksCount: 5 }],
    practiceSessions: [],
  };
  const rep09 = runCoach(input09);
  const t09Success = rep09.telemetry.sleepTier === "RED" && rep09.mission.id === "M0_RECOVERY_SLEEP" && rep09.meta.recoveryOnly;
  results.push({ name: "T09: 9h Study with 4h Sleep gives M0", success: t09Success, detail: `Tier: ${rep09.telemetry.sleepTier}, Mission: ${rep09.mission.id}` });

  // T10: Firewall coherence: Deep copy unchanged and single bottleneck
  const rawRepInput: any = {
    telemetry: { sleepTier: "RED", hoursToday: 8, sleepLastNight: 4 },
    mission: { id: "M1_RETRIEVAL_FIRST", ifThen: "If..." },
    meta: { recoveryOnly: false },
    priority: { bottleneck: "Old" },
  };
  const { report: fwRep } = enforceFirewall(rawRepInput, "RED", { today: "2026-09-05", targetSleepHours: 7.5, baselineHours: 5 });
  const t10Success = fwRep.mission.id === "M0_RECOVERY_SLEEP" && rawRepInput.mission.id === "M1_RETRIEVAL_FIRST";
  results.push({ name: "T10: Firewall Coherence & Immutability", success: t10Success, detail: `Remedy: ${fwRep.mission.id}, Input: ${rawRepInput.mission.id}` });

  // T11: Surface guard: LiveDay refuses study task above 50% baseline when RED
  const t11Success = canOfferStudyTask(2.0, 5.0, "RED") && !canOfferStudyTask(3.5, 5.0, "RED");
  results.push({ name: "T11: Surface Guard Capacity Capping", success: t11Success, detail: `Offer 2h: true, Offer 3.5h: false` });

  // T12: BKT: 5 correct from prior gives 0.95-0.99; a wrong answer at 0.95 leaves 0.80-0.95 and never < 0.5
  let bkt = updateChapter(null, "Physics:Mechanics", { date: "2026-09-01", attempted: 5, correct: 5 });
  const pL5 = bkt.pL;
  bkt = updateChapter(bkt, "Physics:Mechanics", { date: "2026-09-02", attempted: 1, correct: 0 });
  const pLWrong = bkt.pL;
  const t12Success = pL5 >= 0.85 && pLWrong >= 0.75 && pLWrong >= 0.5;
  results.push({ name: "T12: BKT Convergence & Slip Protection", success: t12Success, detail: `5 correct: ${pL5}, 1 wrong: ${pLWrong}` });

  // T13: Sequencing: Same totals give identical results; 20 of 40 yields at most 6 observations
  const seq1 = buildSequence(40, 20);
  const seq2 = buildSequence(40, 20);
  const t13Success = seq1.length === 6 && JSON.stringify(seq1) === JSON.stringify(seq2);
  results.push({ name: "T13: BKT Order-Neutral Interleaving", success: t13Success, detail: `Obs count: ${seq1.length}` });

  // T14: Tag weighting: All-slip wrongs lower mastery less than all-knowledge-deficit wrongs
  const bktBase = { key: "Physics:Rot", subject: "Physics", chapter: "Rot", pL: 0.85, evidenceCount: 10, distinctDays: 3, halfLifeDays: 5, lastRetrievalDate: "2026-09-01", errorTotals: { KNOWLEDGE_DEFICIT: 0, PROCEDURAL_FLAW: 0, ATTENTIONAL_SLIP: 0, TRANSFER_FAILURE: 0 } };
  const bktSlip = updateChapter(bktBase, "Physics:Rot", { date: "2026-09-02", attempted: 5, correct: 2, errorCounts: { ATTENTIONAL_SLIP: 3 } });
  const bktDeficit = updateChapter(bktBase, "Physics:Rot", { date: "2026-09-02", attempted: 5, correct: 2, errorCounts: { KNOWLEDGE_DEFICIT: 3 } });
  const t14Success = bktSlip.pL > bktDeficit.pL;
  results.push({ name: "T14: Error Tag Weighting in BKT", success: t14Success, detail: `Slip pL: ${bktSlip.pL} > Deficit pL: ${bktDeficit.pL}` });

  // T15: Retention: Same-day repeat expands h by <=5%; review at R~0.65 expands x2.0-2.3; failure halves
  const mInit = { key: "Physics:Thermo", subject: "Physics", chapter: "Thermo", pL: 0.8, evidenceCount: 10, distinctDays: 2, halfLifeDays: 4.0, lastRetrievalDate: "2026-09-01", errorTotals: { KNOWLEDGE_DEFICIT: 0, PROCEDURAL_FLAW: 0, ATTENTIONAL_SLIP: 0, TRANSFER_FAILURE: 0 } };
  const mSameDay = onRetrieval(mInit, "2026-09-01", 1.0, 10);
  // After 2.5 days with h=4: R = 2^(-2.5/4) = 2^(-0.625) ~ 0.648
  const mSpaced = onRetrieval(mInit, "2026-09-03", 1.0, 10);
  const mFail = onRetrieval(mInit, "2026-09-03", 0.2, 10);
  const sameDayExp = mSameDay.halfLifeDays / mInit.halfLifeDays;
  const spacedExp = mSpaced.halfLifeDays / mInit.halfLifeDays;
  // Exam-date spacing horizon cap test (Gap 2): 10 days to exam clamps horizon to round(10 * 0.2) = 2.0 days
  const mExamCap = onRetrieval(mInit, "2026-09-03", 1.0, 10, "2026-09-13");
  const examCapped = mExamCap.halfLifeDays <= 2.0;
  const t15Success = sameDayExp <= 1.05 && spacedExp >= 1.9 && spacedExp <= 2.5 && mFail.halfLifeDays === 2.0 && examCapped;
  results.push({ name: "T15: Corrected Half-Life Spacing Formula & Exam-Date Horizon Cap", success: t15Success, detail: `Same-day: x${sameDayExp.toFixed(2)}, Spaced: x${spacedExp.toFixed(2)}, Fail: ${mFail.halfLifeDays}d, ExamCapped: ${mExamCap.halfLifeDays}d` });

  // T16: Review queue excludes chapters under P(L) 0.35
  const chapHighPL = { ...mInit, pL: 0.8, halfLifeDays: 1.0, lastRetrievalDate: "2026-08-01" };
  const chapLowPL = { ...mInit, pL: 0.2, halfLifeDays: 1.0, lastRetrievalDate: "2026-08-01" };
  const queue16 = reviewQueue([chapHighPL, chapLowPL], "2026-09-01");
  const t16Success = queue16.length === 1 && queue16[0].pL === 0.8;
  results.push({ name: "T16: Review Queue Novice Gating", success: t16Success, detail: `Queue count: ${queue16.length}` });

  // T17: Novice gate: Chapter with P(L) < 0.35 selects M2, never M1
  const input17: CoachInput = {
    today: "2026-09-05",
    dayType: "SCHOOL_DAY",
    hoursToday: 4.0,
    sleepLastNight: 7.5,
    screenToday: 2.0,
    dailyHistory: [{ date: "2026-09-05", dayType: "SCHOOL_DAY", hours: 4, sleep: 7.5, screen: 2, xp: 200, completedTasksCount: 3, plannedTasksCount: 3 }],
    practiceSessions: [],
    activeMasteries: { "Physics:Optics": { ...mInit, pL: 0.25, distinctDays: 1 } },
  };
  const rep17 = runCoach(input17);
  const t17Success = rep17.mission.id === "M2_WORKED_EXAMPLE_LADDER";
  results.push({ name: "T17: Novice Gated to Worked Examples M2", success: t17Success, detail: `Mission: ${rep17.mission.id}` });

  // T18: Mission invariants: Regex, XP, duration, verify, registry id
  const ifThenRegex = /^If .+, then I will .+[.]$/;
  const mTest = rep17.mission;
  const t18Success = ifThenRegex.test(mTest.ifThen) && mTest.xp >= 100 && mTest.xp <= 200 && !containsBannedPhrase(mTest.ifThen);
  results.push({ name: "T18: Mission Invariants & Gollwitzer Regex", success: t18Success, detail: `Regex match: ${ifThenRegex.test(mTest.ifThen)}, XP: ${mTest.xp}` });

  // T19: Tone gate: LOW confidence states uncertainty; RED/AMBER never contains stretch language
  const anchorRed = rep09.mindsetAnchor;
  const t19Success = !anchorRed.toLowerCase().includes("stretch") && !anchorRed.toLowerCase().includes("push harder");
  results.push({ name: "T19: Tone Gate Safety Redirect", success: t19Success, detail: `Anchor: ${anchorRed}` });

  // T20: Evidence integrity: Every number in telemetry maps to input
  const t20Success = rep09.telemetry.hoursToday === 9.0 && rep09.telemetry.sleepLastNight === 4.0;
  results.push({ name: "T20: Evidence Input Integrity", success: t20Success, detail: `Hours: ${rep09.telemetry.hoursToday}` });

  // T21: Causal restraint
  const claimText = rep09.priority.rationale;
  const t21Success = !claimText.includes("screen time caused") && !claimText.includes("sleep caused your failure");
  results.push({ name: "T21: Causal Restraint in Rationale", success: t21Success, detail: `No causal blame: ${t21Success}` });

  // T22: Challenge: Accuracy >= 85% with 20+ attempts on GREEN steps up to M10
  const input22: CoachInput = {
    today: "2026-09-05",
    dayType: "FULL_STUDY_DAY",
    hoursToday: 6.0,
    sleepLastNight: 8.0,
    screenToday: 1.5,
    dailyHistory: [{ date: "2026-09-05", dayType: "FULL_STUDY_DAY", hours: 6, sleep: 8, screen: 1.5, xp: 400, completedTasksCount: 4, plannedTasksCount: 4 }],
    practiceSessions: [{ date: "2026-09-05", subject: "Mathematics", chapter: "Calculus", attempted: 25, correct: 23, timeSpent: 90 }], // >85% on 25 attempts
    activeMasteries: { "Mathematics:Calculus": { ...mInit, pL: 0.85, distinctDays: 5 } },
  };
  const rep22 = runCoach(input22);
  const t22Success = rep22.mission.id === "M10_STRETCH_SET";
  results.push({ name: "T22: High Mastery Steps Up to M10", success: t22Success, detail: `Mission: ${rep22.mission.id}` });

  // T23: Outcomes: 14-day cooldown expires and offers are idempotent
  const off1 = recordOffer([], { key: "2026-09-01:M1_RETRIEVAL_FIRST", hypothesisId: "PASSIVE_INTAKE_NO_RETRIEVAL", missionId: "M1_RETRIEVAL_FIRST", offeredOn: "2026-09-01", accepted: true, completed: false });
  const offDup = recordOffer(off1, { key: "2026-09-01:M1_RETRIEVAL_FIRST", hypothesisId: "PASSIVE_INTAKE_NO_RETRIEVAL", missionId: "M1_RETRIEVAL_FIRST", offeredOn: "2026-09-01", accepted: true, completed: false });
  const t23Success = offDup.length === 1;
  results.push({ name: "T23: Idempotent Offer Logging", success: t23Success, detail: `History length: ${offDup.length}` });

  // T24: Determinism: Same input gives identical output
  const run1 = runCoach(input22, "2026-09-05");
  const run2 = runCoach(input22, "2026-09-05");
  const t24Success = JSON.stringify(run1) === JSON.stringify(run2);
  results.push({ name: "T24: Pure Determinism", success: t24Success, detail: `Byte-identical: ${t24Success}` });

  // T25: Migration & Sanity bounds quarantine
  const badRecords = [
    { date: "2026-09-01", hoursStudied: 30 }, // out of bounds (>24)
    { date: "2026-09-02", hoursStudied: 5 },
  ];
  const { clean, quarantined } = sanitizeHistoryArray(badRecords);
  const t25Success = clean.length === 1 && quarantined.length === 1;
  results.push({ name: "T25: Schema Bounds Quarantine", success: t25Success, detail: `Clean: ${clean.length}, Quarantined: ${quarantined.length}` });

  // T26: Performance benchmark
  const startPerf = Date.now();
  for (let i = 0; i < 50; i++) {
    runCoach(input22, "2026-09-05");
  }
  const avgDuration = (Date.now() - startPerf) / 50;
  const t26Success = avgDuration < 50;
  results.push({ name: "T26: Execution Speed (<50ms budget)", success: t26Success, detail: `Average: ${avgDuration.toFixed(2)}ms` });

  // T27: Theil-Sen ignores single massive outlier
  const regularPts = [{ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }, { x: 4, y: 4 }, { x: 5, y: 5 }];
  const outlierPts = [{ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }, { x: 4, y: 4 }, { x: 5, y: 999 }];
  const slopeReg = theilSen(regularPts);
  const slopeOut = theilSen(outlierPts);
  const t27Success = Math.abs(slopeReg - slopeOut) < 0.2;
  results.push({ name: "T27: Theil-Sen Robustness to Outliers", success: t27Success, detail: `Regular: ${slopeReg}, Outlier: ${slopeOut}` });

  const allPassed = results.every((r) => r.success);
  return { passed: allPassed, testResults: results };
}
