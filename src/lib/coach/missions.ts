import {
  NormalizedStudentData,
  DerivedMetrics,
  StudentBaseline,
  TemporalTrends,
  StudentMultiState,
  SeverityAnalysis,
  PriorityResolution,
  DeterministicCoachReport,
} from "./types";
import { TEMPLATES } from "./templates";

function deterministicHash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function selectItem(pool: string[], seedKey: string, fallback: string): string {
  if (!pool || pool.length === 0) return fallback;
  const index = deterministicHash(seedKey) % pool.length;
  return pool[index];
}

export function buildCoachReport(
  data: NormalizedStudentData,
  metrics: DerivedMetrics,
  baseline: StudentBaseline,
  trends: TemporalTrends,
  state: StudentMultiState,
  severity: SeverityAnalysis,
  priority: PriorityResolution
): DeterministicCoachReport {
  const seedKey = `${data.dateStr}_${state.performance}_${state.recovery}_${state.screen}_${priority.primaryFocus}_streak${data.streakDays}`;

  // 1. Raw Report
  let rawReport = `Yesterday's raw report: Sleep ${data.sleep}h. Screen ${data.screenTime}h. `;
  if (metrics.plannedTaskCount > 0) {
    if (metrics.uncompletedTaskNames.length === 0) {
      rawReport += `Planned ${metrics.plannedTaskCount} tasks and executed all of them. `;
    } else {
      rawReport += `Planned ${metrics.plannedTaskCount} tasks but left ${metrics.uncompletedTaskNames[0]} incomplete. `;
    }
  } else {
    rawReport += `No specific tasks planned. `;
  }
  rawReport += `You did ${data.hours}h of study (${metrics.totalQuestions} questions solved).`;

  // 2. Diagnosis
  let diagCategory: string = state.performance;
  if (priority.primaryFocus === "recovery" && (state.recovery === "BURNOUT_RISK" || state.recovery === "SEVERE_SLEEP_DEFICIT")) {
    diagCategory = state.recovery;
  } else if (priority.primaryFocus === "screen" && state.screen === "HIGH") {
    diagCategory = "HIGH_SCREEN";
  } else if (priority.primaryFocus === "planning" && state.planning === "OVERPLANNING") {
    diagCategory = "OVERPLANNING";
  } else if (priority.primaryFocus === "practice" && state.practice === "THEORY_HEAVY") {
    diagCategory = "THEORY_HEAVY";
  } else if (priority.primaryFocus === "practice" && state.practice === "SUBJECT_AVOIDANCE") {
    diagCategory = "SUBJECT_AVOIDANCE";
  }

  const diagPool = TEMPLATES.diagnoses[diagCategory] || TEMPLATES.diagnoses[state.performance] || TEMPLATES.diagnoses.STABLE;
  let diagnosis = selectItem(diagPool, `${seedKey}_diag`, TEMPLATES.diagnoses.STABLE[0]);

  // Interpolate placeholders
  const neglectedSub = metrics.neglectedSubjects[0] || "Chemistry";
  const uncompletedTask = metrics.uncompletedTaskNames[0] || "high-priority task";

  diagnosis = diagnosis
    .replace(/\$\{hours\}/g, String(data.hours))
    .replace(/\$\{sleep\}/g, String(data.sleep))
    .replace(/\$\{screenTime\}/g, String(data.screenTime))
    .replace(/\$\{avgHours\}/g, String(baseline.avgHours))
    .replace(/\$\{avgSleep\}/g, String(baseline.avgSleep))
    .replace(/\$\{plannedCount\}/g, String(metrics.plannedTaskCount))
    .replace(/\$\{completedCount\}/g, String(metrics.completedTaskCount))
    .replace(/\$\{completionRate\}/g, String(Math.round(metrics.taskCompletionRate * 100)))
    .replace(/\$\{questions\}/g, String(metrics.totalQuestions))
    .replace(/\$\{accuracy\}/g, String(metrics.accuracyOverall))
    .replace(/\$\{neglectedSubject\}/g, neglectedSub)
    .replace(/\$\{uncompletedTask\}/g, uncompletedTask);

  // Add specific uncompleted task wound if relevant
  if (metrics.uncompletedTaskNames.length > 0 && !diagnosis.includes(uncompletedTask)) {
    diagnosis += ` Primary bottleneck task remaining: "${uncompletedTask}".`;
  }

  // 3. Verdict
  const verdictPool = TEMPLATES.verdicts[diagCategory] || TEMPLATES.verdicts[state.performance] || TEMPLATES.verdicts.STABLE;
  let verdict = selectItem(verdictPool, `${seedKey}_verdict`, TEMPLATES.verdicts.STABLE[0]);
  verdict = verdict.replace(/\$\{neglectedSubject\}/g, neglectedSub);

  // 4. Today's Mission
  let missionCategory = priority.primaryFocus as string;
  if (priority.primaryFocus === "practice" && state.practice === "SUBJECT_AVOIDANCE") {
    missionCategory = "subject";
  }
  const missionPool = TEMPLATES.missions[missionCategory] || TEMPLATES.missions.performance;
  let todayMission = selectItem(missionPool, `${seedKey}_mission`, TEMPLATES.missions.performance[0]);

  const targetHours = Math.min(10, Math.max(4, Math.round((baseline.avgHours + 1) * 2) / 2));
  const targetQuestions = Math.max(30, Math.round(data.hours * 10 + 15));

  todayMission = todayMission
    .replace(/\$\{targetHours\}/g, String(targetHours))
    .replace(/\$\{targetQuestions\}/g, String(targetQuestions))
    .replace(/\$\{neglectedSubject\}/g, neglectedSub);

  // 5. Closing
  const closing = selectItem(TEMPLATES.closings, `${seedKey}_closing`, TEMPLATES.closings[0]);

  // Combine full formatted text (5-part format)
  const fullFormattedText = `Raw Report:\n${rawReport}\n\nDiagnosis:\n${diagnosis}\n\nVerdict:\n${verdict}\n\nToday's Mission:\n${todayMission}\n\nClosing:\n${closing}`;

  return {
    rawReport,
    diagnosis,
    verdict,
    todayMission,
    closing,
    fullFormattedText,
    explanation: {
      facts: {
        hoursToday: data.hours,
        sleepToday: data.sleep,
        screenToday: data.screenTime,
        questionsToday: metrics.totalQuestions,
        baselineHours: baseline.avgHours,
        baselineSleep: baseline.avgSleep,
        baselineScreen: baseline.avgScreen,
        streakDays: data.streakDays,
      },
      derivedMetrics: metrics,
      baseline,
      trends,
      states: state,
      severity,
      priority,
      confidence: baseline.confidence === "NONE" ? "LOW" : baseline.confidence,
    },
  };
}
