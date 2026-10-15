// src/lib/coach/types.ts
/**
 * Canonical types for the LevelUp Study Cognitive Mentor Engine.
 * Single source of truth. Fully decoupled from React and AppContext.
 */

export type ISODate = string; // 'YYYY-MM-DD', student's local date

export type Subject = 'Physics' | 'Chemistry' | 'Mathematics';

export type DayType =
  | 'SCHOOL_DAY'
  | 'COACHING_DAY'
  | 'FULL_STUDY_DAY'
  | 'REST_DAY'
  | 'EXAM_DAY';

export type QuestionType = 'MCQ' | 'MULTI' | 'NUMERIC' | 'UNKNOWN';

export type ErrorTag =
  | 'KNOWLEDGE_DEFICIT'
  | 'PROCEDURAL_FLAW'
  | 'ATTENTIONAL_SLIP'
  | 'TRANSFER_FAILURE';

export type ErrorCounts = Record<ErrorTag, number>; // sum <= attempted - correct

export interface PracticeSessionExt {
  id?: string;
  date: ISODate;
  subject: Subject | string;
  chapter: string;
  attempted: number;
  correct: number;
  timeSpent: number; // minutes
  mistakes?: string[];
  errorCounts?: Partial<ErrorCounts>;
  confidencePre?: number; // 0-100 predicted score (JOL), optional
  perceivedDifficulty?: 1 | 2 | 3 | 4 | 5; // 1 too easy, 3 right, 5 too hard
  questionType?: QuestionType;
  difficultyTier?: 1 | 2 | 3; // 1 concept, 2 JEE Main PYQ, 3 Advanced
  timed?: boolean;
}

export interface ChapterMastery {
  key: string; // `${subject}:${chapter}`
  subject: Subject | string;
  chapter: string;
  pL: number; // estimate, 0..1 (prior-based, not a measurement)
  evidenceCount: number;
  distinctDays: number;
  halfLifeDays: number;
  lastRetrievalDate: ISODate | null;
  errorTotals: ErrorCounts;
}

export type SleepTier = 'GREEN' | 'AMBER' | 'RED';

export type Trajectory =
  | 'SUSTAINED_IMPROVEMENT'
  | 'STRUCTURAL_EXPANSION'
  | 'STABLE'
  | 'TEMPORARY_DIP'
  | 'SUSTAINED_DECLINE'
  | 'RECOVERY_REBOUND'
  | 'CHRONIC_PLATEAU'
  | 'CYCLICAL_VOLATILITY'
  | 'DATA_INSUFFICIENT';

export type HypothesisId =
  | 'PHYSIOLOGICAL_OVERLOAD'
  | 'PASSIVE_INTAKE_NO_RETRIEVAL'
  | 'NOVICE_NEEDS_SCAFFOLD'
  | 'SCHEDULE_COLLISION'
  | 'ACUTE_DISRUPTION'
  | 'CONCEPTUAL_BOTTLENECK'
  | 'ATTENTION_LEAK'
  | 'DISENGAGEMENT';

export interface Evidence {
  label: string;
  value: number | string;
  refs: string[];
}

export interface Hypothesis {
  id: HypothesisId;
  claim: string;
  supporting: Evidence[];
  contradicting: Evidence[]; // actually evaluated, not left empty
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'; // computed from evidence & coverage
  severity: number; // 0..1
  missionId: MissionId;
}

export type MissionId =
  | 'M0_RECOVERY_SLEEP'
  | 'M1_RETRIEVAL_FIRST'
  | 'M2_WORKED_EXAMPLE_LADDER'
  | 'M3_SPACED_REVIEW'
  | 'M4_INTERLEAVED_MIX'
  | 'M5_ERROR_REPAIR'
  | 'M6_SCHEDULE_FIT'
  | 'M7_MOMENTUM_REANCHOR'
  | 'M8_CALIBRATION_PREDICT'
  | 'M9_DEVICE_QUARANTINE'
  | 'M10_STRETCH_SET';

export type VerifyPredicate =
  | {
      type: 'SESSION_LOGGED';
      subject?: Subject | string;
      chapter?: string;
      minAttempts: number;
      timed?: boolean;
      minTier?: 1 | 2 | 3;
    }
  | { type: 'SLEEP_AT_LEAST'; hours: number }
  | { type: 'TASKS_WITHIN_CAPACITY'; maxTasks: number }
  | { type: 'SELF_CONFIRM' };

export interface Mission {
  id: MissionId;
  kind: 'RECOVERY' | 'STUDY';
  title: string;
  ifThen: string; // must match: ^If .+, then I will .+[.]$
  window: { from: ISODate; to: ISODate };
  durationMin?: number; // STUDY only, 15-90
  targetSleepHours?: number; // RECOVERY only
  verify: VerifyPredicate;
  xp: number; // flat process XP
  evidenceId: string; // key in Evidence Registry
  metric: string; // pre/post metric name
}

export interface MissionRecord {
  key: string; // `${offeredOn}:${missionId}` (idempotent)
  hypothesisId: HypothesisId;
  missionId: MissionId;
  offeredOn: ISODate;
  accepted: boolean;
  completed: boolean;
  frictionRating?: 1 | 2 | 3 | 4 | 5;
  pre?: number;
  post?: number;
  expectedPost?: number;
}

export interface EvidenceRegistryItem {
  id: string;
  shortCitation: string;
  claim: string;
  grade: 'A' | 'B' | 'C';
  provenance: 'IN_CORPUS' | 'OUTSIDE_CORPUS';
  verified: boolean;
  studentExplanation: string;
}

export interface DayRecord {
  date: ISODate;
  dayType: DayType;
  hours: number | null; // null for unlogged/missing days
  sleep: number | null; // null for unlogged nights
  screen: number | null; // null for unlogged screen time
  xp: number;
  completedTasksCount: number;
  plannedTasksCount: number;
  questionsSolved?: number;
  correctQuestions?: number;
}

export interface CoachInput {
  today: ISODate;
  dayType: DayType;
  hoursToday: number;
  sleepLastNight: number | null;
  screenToday: number | null;
  targetSleepHours?: number; // default 6.0
  examDate?: ISODate;
  dailyHistory: DayRecord[]; // sorted oldest to newest
  practiceSessions: PracticeSessionExt[];
  activeMasteries?: Record<string, ChapterMastery>;
  outcomeHistory?: MissionRecord[];
  scheduleProfile?: Record<string, DayType>; // e.g. "Monday": "SCHOOL_DAY"
  distressSignalLogged?: boolean;
}

export interface CoachReport {
  // 7-part canonical report format
  telemetry: {
    hoursToday: number;
    sleepLastNight: number | null;
    screenToday: number | null;
    sleepDebt7d: number;
    coverageRatio7d: number;
    disengaged: boolean;
    sleepTier: SleepTier;
    cognitiveYieldToday: number;
  };
  pattern: {
    trajectory: Trajectory;
    slope7d: number;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    summary: string;
  };
  hypothesis: {
    id: HypothesisId;
    claim: string;
    supporting: Evidence[];
    contradicting: Evidence[];
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    severity: number;
  };
  priority: {
    rationale: string;
    bottleneck: string;
  };
  mission: Mission;
  evidence: {
    registryId: string;
    citation: string;
    grade: 'A' | 'B' | 'C';
    isDesignHeuristic: boolean;
    explanation: string;
  };
  mindsetAnchor: string;

  // Metadata
  meta: {
    generatedOn: ISODate;
    recoveryOnly: boolean;
    provisional: boolean;
    tone: 'GOGGINS_INTENSE';
    remedyApplied?: 'RECOVERY_REGENERATED' | 'AMBER_CAPPED';
  };
  updatedMasteries?: Record<string, ChapterMastery>;
}

// -------------------------------------------------------------
// Backwards-Compatible Legacy Types (so legacy consumers compile)
// -------------------------------------------------------------

export interface RawCoachInput {
  date?: string;
  hours?: number;
  sleep?: number;
  screenTime?: number;
  completedTasks?: any[];
  plannedTasks?: any[];
  practiceSessions?: any[];
  xpEarned?: number;
  targetXp?: number;
  level?: number;
  streakDays?: number;
  history?: any[];
  syllabus?: any;
  accuracy?: number;
  loggedTasksToday?: any[];
  today?: string;
  dayType?: DayType;
  examDate?: string;
}

export interface NormalizedStudentData {
  dateStr: string;
  hours: number;
  sleep: number;
  screenTime: number;
  completedTasks: any[];
  plannedTasks: any[];
  practiceSessions: any[];
  xpEarned: number;
  targetXp: number;
  level: number;
  streakDays: number;
  history: any[];
  syllabus?: any;
  accuracy: number;
  loggedTasksToday: any[];
}

export interface DerivedMetrics {
  totalQuestions: number;
  totalCorrect: number;
  accuracyOverall: number;
  outputPerHour: number;
  lectureHours: number;
  practiceHours: number;
  lectureRatio: number;
  practiceRatio: number;
  plannedTaskCount: number;
  completedTaskCount: number;
  taskCompletionRate: number;
  highPriorityCompletionRate: number;
  uncompletedTasks: any[];
  uncompletedTaskNames: string[];
  subjectDistribution: Record<string, number>;
  neglectedSubjects: string[];
  weakestSubject?: string;
  sleepDebtToday: number;
  screenDeviation: number;
}

export interface StudentBaseline {
  avgHours: number;
  avgSleep: number;
  avgScreen: number;
  avgQuestions: number;
  avgCompletionRate: number;
  dataPoints: number;
  confidence: "HIGH" | "MEDIUM" | "LOW" | "NONE";
}

export interface TemporalTrends {
  hoursSlope: number;
  hoursDirection: "IMPROVING" | "STABLE" | "DECLINING";
  consecutiveTrendDays: number;
  sleepSlope: number;
  sleepDebt7d: number;
  screenSlope: number;
  screenEscalating: boolean;
  hoursVolatility: number;
}

export type PerformanceState =
  | "BREAKTHROUGH"
  | "STRONG_DAY"
  | "STABLE"
  | "MILD_DECLINE"
  | "SEVERE_DECLINE"
  | "TOTAL_COLLAPSE";

export type TrendState =
  | "BUILDING_MOMENTUM"
  | "STABLE_TREND"
  | "DECLINING"
  | "OSCILLATING"
  | "RECOVERY_REBOUND"
  | "POST_PEAK_DROP";

export type PlanningState =
  | "REALISTIC_PLANNING"
  | "OVERPLANNING"
  | "UNDERPLANNING"
  | "CHRONIC_INCOMPLETE";

export type PracticeState =
  | "BALANCED"
  | "THEORY_HEAVY"
  | "PRACTICE_HEAVY"
  | "LOW_ACCURACY_WARNING"
  | "SUBJECT_AVOIDANCE";

export type RecoveryState =
  | "WELL_RECOVERED"
  | "MILD_SLEEP_DEFICIT"
  | "SEVERE_SLEEP_DEFICIT"
  | "ACCUMULATED_DEBT"
  | "BURNOUT_RISK"
  | "RECOVERY_TREND";

export type ScreenState =
  | "CONTROLLED"
  | "MODERATE"
  | "HIGH"
  | "ESCALATING";

export interface StudentMultiState {
  performance: PerformanceState;
  trend: TrendState;
  planning: PlanningState;
  practice: PracticeState;
  recovery: RecoveryState;
  screen: ScreenState;
  streakContext: { days: number; justBroke: boolean };
}

export interface SeverityAnalysis {
  axes: {
    performance: number;
    trend: number;
    recovery: number;
    screen: number;
    planning: number;
    practice: number;
  };
  overall: number;
  primaryConcern: string;
  isHealthCritical: boolean;
}

export interface PriorityResolution {
  primaryFocus: "recovery" | "performance" | "trend" | "planning" | "practice" | "screen";
  secondaryFocus: string | null;
  reason: string;
}

export interface ExplanationPayload {
  facts: {
    hoursToday: number;
    sleepToday: number;
    screenToday: number;
    questionsToday: number;
    baselineHours: number;
    baselineSleep: number;
    baselineScreen: number;
    streakDays: number;
  };
  derivedMetrics: DerivedMetrics;
  baseline: StudentBaseline;
  trends: TemporalTrends;
  states: StudentMultiState;
  severity: SeverityAnalysis;
  priority: PriorityResolution;
  confidence: "HIGH" | "MEDIUM" | "LOW";
}

export interface DeterministicCoachReport {
  rawReport: string;
  diagnosis: string;
  verdict: string;
  todayMission: string;
  closing: string;
  fullFormattedText: string;
  explanation: ExplanationPayload;
  coachReport?: CoachReport;
}
