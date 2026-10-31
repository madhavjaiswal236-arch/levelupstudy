import { Todo, SyllabusData } from "@/context/AppContext";
import { getLocalDateString } from "@/lib/utils";

export interface TaskCompletionEvent {
  taskId: string | number;
  chapterName?: string;
  subjectName?: string;
  lectureNumber?: number | string;
  taskType?: string;
  questionsCompleted?: number;
  xpAwarded?: number;
  completedAt?: number;
  idempotencyKey?: string;
  source: 'DASHBOARD' | 'TASKS' | 'SYLLABUS' | 'BACKLOG' | 'JEE_LOGGER';
}

export interface TaskCompletionResult {
  updatedTodos: Todo[];
  updatedSyllabus: SyllabusData;
  xpToGrant: number;
  isFirstCompletion: boolean;
}

/**
 * Authoritative canonical task completion helper.
 * Synchronizes dashboard tasks, backlog roadmap items, and syllabus chapter lectures.
 * Enforces strict XP idempotency so repeated unchecking/checking does not farm infinite XP.
 */
export function processCanonicalTaskToggle(
  todos: Todo[],
  syllabus: SyllabusData,
  toggledId: string | number,
  targetCompleted?: boolean,
  xpAwardedDefault: number = 50
): TaskCompletionResult {
  const now = Date.now();
  const todayDate = getLocalDateString();
  let xpToGrant = 0;
  let isFirstCompletion = false;
  let linkedSubject: string | undefined;
  let linkedChapter: string | undefined;
  let linkedLectureNum: number | undefined;

  const updatedTodos: Todo[] = todos.map((todo) => {
    if (String(todo.id) !== String(toggledId)) return todo;

    const nextCompleted = targetCompleted !== undefined ? targetCompleted : !todo.completed;
    const wasAlreadyCompleted = Boolean(todo.completed);

    linkedSubject = todo.subject;
    linkedChapter = todo.chapter;
    if (todo.lectureNumber) {
      linkedLectureNum = typeof todo.lectureNumber === "number" ? todo.lectureNumber : parseInt(String(todo.lectureNumber), 10);
    }

    // XP Idempotency Check: only award XP if never previously completed
    if (nextCompleted && !wasAlreadyCompleted) {
      if (!todo.completedAt) {
        xpToGrant = todo.xpReward || xpAwardedDefault;
        isFirstCompletion = true;
      }
    }

    return {
      ...todo,
      completed: nextCompleted,
      completedAt: nextCompleted ? (todo.completedAt || now) : undefined,
      completedDate: nextCompleted ? (todo.completedDate || todayDate) : undefined,
      updatedAt: now,
    };
  });

  // Propagate to syllabus if task matches a subject and chapter
  const updatedSyllabus: SyllabusData = { ...syllabus };
  if (linkedSubject && linkedChapter && updatedSyllabus[linkedSubject as keyof SyllabusData]) {
    const subjectList = [...updatedSyllabus[linkedSubject as keyof SyllabusData]];
    const chapIndex = subjectList.findIndex((c) => c.name.toLowerCase() === linkedChapter!.toLowerCase());

    if (chapIndex >= 0) {
      const chap = { ...subjectList[chapIndex] };
      const totalLectures = chap.lectures || 8;
      
      if (linkedLectureNum && linkedLectureNum > 0) {
        const currentLast = chap.lastLectureNumber || 0;
        const targetCompletedState = targetCompleted !== undefined ? targetCompleted : true;
        
        let newLast = currentLast;
        if (targetCompletedState && linkedLectureNum > currentLast) {
          newLast = linkedLectureNum;
        } else if (!targetCompletedState && linkedLectureNum === currentLast) {
          newLast = Math.max(0, currentLast - 1);
        }

        const mastery = Math.min(100, Math.round((newLast / totalLectures) * 100));
        chap.lastLectureNumber = newLast;
        chap.mastery = mastery;
        if (mastery >= 100) {
          chap.status = "green";
        } else if (mastery >= 40) {
          chap.status = "yellow";
        } else if (newLast > 0) {
          chap.status = "yellow";
        }
      }

      subjectList[chapIndex] = chap;
      updatedSyllabus[linkedSubject as keyof SyllabusData] = subjectList;
    }
  }

  return {
    updatedTodos,
    updatedSyllabus,
    xpToGrant,
    isFirstCompletion,
  };
}

/**
 * When a lecture is toggled directly inside Syllabus.tsx or ChapterDetailModal.tsx,
 * this function toggles the lecture, updates chapter mastery, awards XP idempotently,
 * and marks any matching task in `todos` as completed.
 */
export function processSyllabusLectureToggle(
  todos: Todo[],
  syllabus: SyllabusData,
  subject: string,
  chapterName: string,
  lectureNumber: number,
  xpAwardAmount: number = 50
): {
  updatedTodos: Todo[];
  updatedSyllabus: SyllabusData;
  xpToGrant: number;
} {
  const updatedSyllabus: SyllabusData = { ...syllabus };
  const subjectChapters = [...(updatedSyllabus[subject as keyof SyllabusData] || [])];
  const chapIndex = subjectChapters.findIndex((c) => c.name === chapterName);

  if (chapIndex === -1) {
    return { updatedTodos: todos, updatedSyllabus: syllabus, xpToGrant: 0 };
  }

  const chap = { ...subjectChapters[chapIndex] };
  const totalLecs = chap.lectures || 8;
  const currentLast = chap.lastLectureNumber || 0;

  const newLast = currentLast === lectureNumber ? lectureNumber - 1 : lectureNumber;
  const isAdvancing = newLast > currentLast;
  const xpToGrant = isAdvancing ? (newLast - currentLast) * xpAwardAmount : 0;
  const mastery = Math.min(100, Math.round((newLast / totalLecs) * 100));

  chap.lastLectureNumber = newLast;
  chap.mastery = mastery;
  if (mastery >= 100) chap.status = "green";
  else if (mastery >= 40) chap.status = "yellow";
  else if (newLast > 0) chap.status = "yellow";
  else chap.status = "red";

  subjectChapters[chapIndex] = chap;
  updatedSyllabus[subject as keyof SyllabusData] = subjectChapters;

  const now = Date.now();
  const todayDate = getLocalDateString();

  const updatedTodos: Todo[] = todos.map((todo) => {
    const isMatchingTodo =
      !todo.isDeleted &&
      todo.subject === subject &&
      todo.chapter === chapterName &&
      (todo.lectureNumber !== undefined
        ? Number(todo.lectureNumber) <= newLast
        : todo.text.includes(`Lecture ${lectureNumber}`) || todo.text.includes(`Lec ${lectureNumber}`));

    if (isMatchingTodo) {
      const markCompleted = todo.lectureNumber !== undefined ? Number(todo.lectureNumber) <= newLast : isAdvancing;
      return {
        ...todo,
        completed: markCompleted,
        completedAt: markCompleted ? (todo.completedAt || now) : undefined,
        completedDate: markCompleted ? (todo.completedDate || todayDate) : undefined,
        updatedAt: now,
      };
    }
    return todo;
  });

  return {
    updatedTodos,
    updatedSyllabus,
    xpToGrant,
  };
}
