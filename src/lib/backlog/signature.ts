/**
 * Canonical task signature generator for BacklogHQ & Tracker 360.
 * Eliminates practice task collisions and unifies reconciliation across
 * BacklogWizard, adaptive recalculation, and BacklogHQ.
 */

export function getTaskSignature(task: {
  backlogChapterId?: string;
  chapter?: string;
  subject?: string;
  backlogTaskType?: string;
  type?: string;
  lectureNumber?: number;
  text?: string;
  title?: string;
  id?: string | number;
}): string {
  const chap = (task.backlogChapterId || task.chapter || '').toLowerCase().trim();
  const rawType = (task.backlogTaskType || task.type || '').toLowerCase().trim();
  const taskText = (task.text || task.title || '').toLowerCase().trim();
  const lecNum = typeof task.lectureNumber === 'number' && !isNaN(task.lectureNumber) ? task.lectureNumber : 0;

  // 1. Practice tasks: distinguish mid-practice from final/mastery practice
  if (rawType.includes('practice')) {
    let sub = 'standard';
    if (taskText.includes('mastery') || taskText.includes('final')) {
      sub = 'final';
    } else if (taskText.includes('mid')) {
      sub = 'mid';
    }
    return `${chap}_practice_${sub}`;
  }

  // 2. Revision tasks: distinguish interim part revisions from full chapter revisions
  if (rawType.includes('revision')) {
    let sub = 'standard';
    if (taskText.includes('full') || taskText.includes('final')) {
      sub = 'final';
    } else if (lecNum > 0) {
      sub = `lec_${lecNum}`;
    } else {
      const partMatch = taskText.match(/part\s*(\d+)/i);
      if (partMatch) {
        sub = `part_${partMatch[1]}`;
      }
    }
    return `${chap}_revision_${sub}`;
  }

  // 3. Test tasks
  if (rawType.includes('test')) {
    return `${chap}_test`;
  }

  // 4. Default: Lecture
  return `${chap}_lecture_${lecNum}`;
}

/**
 * Returns all possible legacy signature representations for a task.
 * Used during transition so existing completed tasks saved in localStorage or Firestore
 * are recognized without resurrection.
 */
export function getTaskSignaturesWithLegacy(task: {
  backlogChapterId?: string;
  chapter?: string;
  subject?: string;
  backlogTaskType?: string;
  type?: string;
  lectureNumber?: number;
  text?: string;
  title?: string;
  id?: string | number;
}): string[] {
  const canonical = getTaskSignature(task);
  const chap = (task.backlogChapterId || task.chapter || '').toLowerCase().trim();
  const rawType = (task.backlogTaskType || task.type || '').toLowerCase().trim();
  const lecNum = typeof task.lectureNumber === 'number' ? task.lectureNumber : 0;
  const legacy1 = `${chap}_${rawType}_${lecNum}`;
  const legacy2 = `${(task.subject || '').toLowerCase().trim()}_${chap}_${(task.text || task.title || '').toLowerCase().trim()}`;

  const set = new Set([canonical, legacy1, legacy2].filter(Boolean));
  return Array.from(set);
}
