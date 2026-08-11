import { PlayHistoryEntry, Todo, PracticeSession, SyllabusData } from "@/context/AppContext";

export interface RawCoachInput {
  date?: string;
  hours?: number;
  sleep?: number;
  screenTime?: number;
  completedTasks?: Todo[];
  plannedTasks?: Todo[];
  practiceSessions?: PracticeSession[];
  xpEarned?: number;
  targetXp?: number;
  level?: number;
  streakDays?: number;
  history?: PlayHistoryEntry[];
  syllabus?: SyllabusData;
  accuracy?: number;
  loggedTasksToday?: Todo[];
}

export interface NormalizedStudentData {
  dateStr: string;
  hours: number;
  sleep: number;
  screenTime: number;
  completedTasks: Todo[];
  plannedTasks: Todo[];
  practiceSessions: PracticeSession[];
  xpEarned: number;
  targetXp: number;
  level: number;
  streakDays: number;
  history: PlayHistoryEntry[];
  syllabus?: SyllabusData;
  accuracy: number;
  loggedTasksToday: Todo[];
}

export interface DerivedMetrics {
  totalQuestions: number;
  totalCorrect: number;
  accuracyOverall: number;
  outputPerHour: number;
  lectureHours: number;
  practiceHours: number;
  lectureRatio: number; // 0..1
  practiceRatio: number; // 0..1
  
  plannedTaskCount: number;
  completedTaskCount: number;
  taskCompletionRate: number; // 0..1
  highPriorityCompletionRate: number;
  uncompletedTasks: Todo[];
  uncompletedTaskNames: string[];
  
  subjectDistribution: Record<string, number>; // hours or count per subject
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
  hoursSlope: number; // linear regression slope over 7d
  hoursDirection: "IMPROVING" | "STABLE" | "DECLINING";
  consecutiveTrendDays: number;
  
  sleepSlope: number;
  sleepDebt7d: number;
  
  screenSlope: number;
  screenEscalating: boolean;
  
  hoursVolatility: number; // std dev
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
    performance: number; // 0-10
    trend: number;
    recovery: number;
    screen: number;
    planning: number;
    practice: number;
  };
  overall: number; // 0-10 composite
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
}
