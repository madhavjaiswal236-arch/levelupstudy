export interface BacklogPracticeConfig {
  enabled: boolean;
  questionCount: number;
  estimatedMinutesPerQuestion: number;
  customDurationMinutes?: number;
}

export interface BacklogChapterInput {
  id: string;
  name: string;
  subject: string;
  order: number;
  lecturesRemaining: number;
  lectureDurationMinutes: number;
  selectedLectures?: number[];
  totalLecturesInChapter?: number;
  practice: BacklogPracticeConfig;
  status?: "NOT_STARTED" | "IN_PROGRESS" | "LECTURES_COMPLETE" | "PRACTICE_PENDING" | "COMPLETED";
}

export interface BacklogSubject {
  id: string;
  name: string;
  color: string;
  chapters: BacklogChapterInput[];
}

export interface BacklogPlanSettings {
  startDate: string; // YYYY-MM-DD
  deadlineDate: string; // YYYY-MM-DD
  capacityMode: "hours" | "lectures";
  targetDailyMinutes: number;
  targetDailyLectures: number;
  revisionEnabled: boolean;
  revisionAfterEveryNLectures: number;
  revisionDurationMinutes: number;
  testEnabled: boolean;
  testAfterChapterCompletion: boolean;
  testDurationMinutes: number;
  bufferDays: number;
}

export type FeasibilityStatus = "COMFORTABLE" | "ON_TRACK" | "TIGHT" | "AT_RISK" | "IMPOSSIBLE";

export interface BacklogPlanMetrics {
  totalLectures: number;
  totalLectureMinutes: number;
  totalPracticeQuestions: number;
  totalPracticeMinutes: number;
  totalRevisionMinutes: number;
  totalTestMinutes: number;
  totalWorkloadMinutes: number;
  totalWorkloadHours: number;
  calendarDays: number;
  availableStudyDays: number;
  requiredDailyMinutes: number;
  requiredDailyLectures: number;
  feasibilityStatus: FeasibilityStatus;
  feasibilityRatio: number;
  projectedCompletionDate: string;
  bufferDaysRemaining: number;
  healthScore: number;
}

export interface RoadmapTask {
  id: string;
  type: "lecture" | "practice" | "revision" | "test";
  title: string;
  subject: string;
  chapter: string;
  chapterId: string;
  lectureNumber?: number;
  questionCount?: number;
  durationMinutes: number;
  plannedDate: string; // YYYY-MM-DD
  dayIndex: number;
  completed?: boolean;
}

export interface RoadmapDay {
  dayIndex: number;
  date: string; // YYYY-MM-DD
  dayType: "LEARNING" | "REVISION" | "TEST" | "LIGHT" | "BUFFER";
  tasks: RoadmapTask[];
  totalMinutes: number;
  isToday?: boolean;
}

export interface BacklogPlan {
  id: string;
  createdAt: string;
  updatedAt: string;
  subjects: BacklogSubject[];
  settings: BacklogPlanSettings;
  metrics: BacklogPlanMetrics;
  roadmap?: RoadmapDay[];
}

export interface RecalculationDiff {
  missedTaskCount: number;
  missedMinutes: number;
  daysAdjusted: number;
  changesSummary: string[];
  newProjectedCompletion: string;
  deadlinePreserved: boolean;
  feasibilityStatus: FeasibilityStatus;
}
