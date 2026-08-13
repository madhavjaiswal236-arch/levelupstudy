import { Todo, PlayHistoryEntry, PracticeSession } from "@/context/AppContext";

export function getTimestampMs(val: any): number {
  if (typeof val === "number" && !isNaN(val)) return val;
  if (val && typeof val.toMillis === "function") return val.toMillis();
  if (val && typeof val.seconds === "number") return val.seconds * 1000;
  if (typeof val === "string") {
    const parsed = new Date(val).getTime();
    if (!isNaN(parsed)) return parsed;
  }
  return 0;
}

export function mergeTaskArrays(
  localTasks: Todo[] = [],
  cloudTasks: Todo[] = [],
  localIsNewer: boolean = false
): Todo[] {
  const localMap = new Map<number, Todo>();
  (localTasks || []).forEach((t) => {
    if (t && typeof t.id === "number") localMap.set(t.id, t);
  });

  const cloudMap = new Map<number, Todo>();
  (cloudTasks || []).forEach((t) => {
    if (t && typeof t.id === "number") cloudMap.set(t.id, t);
  });

  const mergedMap = new Map<number, Todo>();
  const allIds = new Set<number>([
    ...Array.from(localMap.keys()),
    ...Array.from(cloudMap.keys()),
  ]);

  for (const id of allIds) {
    const local = localMap.get(id);
    const cloud = cloudMap.get(id);

    if (local && cloud) {
      mergedMap.set(id, {
        ...cloud,
        ...local,
        // CRITICAL DATA SAFETY GUARANTEE:
        // A task marked completed in EITHER local OR cloud remains completed
        completed: Boolean(local.completed || cloud.completed),
        homeworkDone: Boolean(local.homeworkDone || cloud.homeworkDone),
        dppDone: Boolean(local.dppDone || cloud.dppDone),
        calendarSynced: Boolean(local.calendarSynced || cloud.calendarSynced),
        calendarEventId: local.calendarEventId || cloud.calendarEventId,
        calendarTaskId: local.calendarTaskId || cloud.calendarTaskId,
      });
    } else if (local && !cloud) {
      mergedMap.set(id, local);
    } else if (!local && cloud) {
      if (!localIsNewer) {
        mergedMap.set(id, cloud);
      }
    }
  }

  return Array.from(mergedMap.values());
}

export function mergeHistoryEntries(
  localHistory: PlayHistoryEntry[] = [],
  cloudHistory: PlayHistoryEntry[] = []
): PlayHistoryEntry[] {
  const map = new Map<string, PlayHistoryEntry>();

  const getKey = (h: PlayHistoryEntry) => {
    if (!h || !h.date) return "";
    const d = new Date(h.date);
    if (isNaN(d.getTime())) return String(h.date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  (cloudHistory || []).forEach((h) => {
    const key = getKey(h);
    if (key) map.set(key, { ...h });
  });

  (localHistory || []).forEach((h) => {
    const key = getKey(h);
    if (!key) return;
    const existing = map.get(key);
    if (existing) {
      map.set(key, {
        ...existing,
        ...h,
        hoursStudied: Math.max(existing.hoursStudied || 0, h.hoursStudied || 0),
        xpEarned: Math.max(existing.xpEarned || 0, h.xpEarned || 0),
        completedTasks: mergeTaskArrays(
          h.completedTasks || [],
          existing.completedTasks || [],
          false
        ),
        plannedTasks: mergeTaskArrays(
          h.plannedTasks || [],
          existing.plannedTasks || [],
          false
        ),
        sleepTime: (h.sleepTime || 0) > 0 ? h.sleepTime : existing.sleepTime || 0,
        screenTime: (h.screenTime || 0) > 0 ? h.screenTime : existing.screenTime || 0,
      });
    } else {
      map.set(key, { ...h });
    }
  });

  return Array.from(map.values()).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

export function mergePracticeSessions(
  localSessions: PracticeSession[] = [],
  cloudSessions: PracticeSession[] = []
): PracticeSession[] {
  const map = new Map<string, PracticeSession>();

  (cloudSessions || []).forEach((s) => {
    if (s && s.id) map.set(s.id, { ...s });
  });

  (localSessions || []).forEach((s) => {
    if (s && s.id) map.set(s.id, { ...s });
  });

  return Array.from(map.values());
}

export interface ReconcileResult {
  mergedState: any;
  needsCloudUpload: boolean;
  localWasNewer: boolean;
}

export function reconcileState(
  localState: any,
  cloudState: any
): ReconcileResult {
  if (!cloudState && localState) {
    return {
      mergedState: localState,
      needsCloudUpload: true,
      localWasNewer: true,
    };
  }
  if (!localState && cloudState) {
    return {
      mergedState: cloudState,
      needsCloudUpload: false,
      localWasNewer: false,
    };
  }
  if (!localState && !cloudState) {
    return {
      mergedState: {},
      needsCloudUpload: false,
      localWasNewer: false,
    };
  }

  const localTs = getTimestampMs(
    localState.lastSyncTimestamp || localState.lastLocalMutationTime
  );
  const cloudTs = getTimestampMs(
    cloudState.lastSyncTimestamp || cloudState.updatedAt
  );

  const localIsNewer = localTs > cloudTs;

  const todos = mergeTaskArrays(
    localState.todos,
    cloudState.todos,
    localIsNewer
  );
  const loggedTasksToday = mergeTaskArrays(
    localState.loggedTasksToday,
    cloudState.loggedTasksToday,
    localIsNewer
  );
  const pendingTasks = mergeTaskArrays(
    localState.pendingTasks,
    cloudState.pendingTasks,
    localIsNewer
  );

  const history = mergeHistoryEntries(
    localState.history,
    cloudState.history
  );
  const practiceSessions = mergePracticeSessions(
    localState.practiceSessions,
    cloudState.practiceSessions
  );

  const xp = Math.max(localState.xp || 0, cloudState.xp || 0);
  const level = Math.max(localState.level || 1, cloudState.level || 1);
  const questionsSolved = Math.max(
    localState.questionsSolved || 0,
    cloudState.questionsSolved || 0
  );
  const streakDays = Math.max(
    localState.streakDays || 0,
    cloudState.streakDays || 0
  );
  const totalSpentXp = Math.max(
    localState.totalSpentXp || 0,
    cloudState.totalSpentXp || 0
  );
  const focusBadges = Math.max(
    localState.focusBadges || 0,
    cloudState.focusBadges || 0
  );

  const sameLogicalDay =
    localState.lastStudyDate &&
    cloudState.lastStudyDate &&
    localState.lastStudyDate === cloudState.lastStudyDate;

  let xpGainedToday = localState.xpGainedToday || 0;
  let hoursStudiedToday = localState.hoursStudiedToday || 0;
  let spentXpToday = localState.spentXpToday || 0;

  if (sameLogicalDay) {
    xpGainedToday = Math.max(
      localState.xpGainedToday || 0,
      cloudState.xpGainedToday || 0
    );
    hoursStudiedToday = Math.max(
      localState.hoursStudiedToday || 0,
      cloudState.hoursStudiedToday || 0
    );
    spentXpToday = Math.max(
      localState.spentXpToday || 0,
      cloudState.spentXpToday || 0
    );
  } else if (!localIsNewer && cloudState.lastStudyDate) {
    xpGainedToday = cloudState.xpGainedToday || 0;
    hoursStudiedToday = cloudState.hoursStudiedToday || 0;
    spentXpToday = cloudState.spentXpToday || 0;
  }

  const lastStudyDate = localIsNewer
    ? localState.lastStudyDate || cloudState.lastStudyDate
    : cloudState.lastStudyDate || localState.lastStudyDate;

  const mergedTs = Math.max(localTs, cloudTs, Date.now());

  const mergedState = {
    ...cloudState,
    ...localState,
    xp,
    level,
    questionsSolved,
    streakDays,
    totalSpentXp,
    focusBadges,
    xpGainedToday,
    hoursStudiedToday,
    spentXpToday,
    lastStudyDate,
    todos,
    loggedTasksToday,
    pendingTasks,
    history,
    practiceSessions,
    lastSyncTimestamp: mergedTs,
  };

  const jsonMerged = JSON.stringify(mergedState);
  const jsonCloud = JSON.stringify(cloudState);
  const needsCloudUpload = localIsNewer || jsonMerged !== jsonCloud;

  return {
    mergedState,
    needsCloudUpload,
    localWasNewer: localIsNewer,
  };
}
