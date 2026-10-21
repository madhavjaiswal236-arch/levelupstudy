import { Todo, PlayHistoryEntry, PracticeSession, SyllabusData, Habit, LifeMetric, MonthlyGoal } from "@/context/AppContext";

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
  _localIsNewer: boolean = false
): Todo[] {
  const localMap = new Map<string, Todo>();
  (localTasks || []).forEach((t) => {
    if (t && (typeof t.id === "string" || typeof t.id === "number")) {
      localMap.set(String(t.id), t);
    }
  });

  const cloudMap = new Map<string, Todo>();
  (cloudTasks || []).forEach((t) => {
    if (t && (typeof t.id === "string" || typeof t.id === "number")) {
      cloudMap.set(String(t.id), t);
    }
  });

  const mergedMap = new Map<string, Todo>();
  const allIds = new Set<string>([
    ...Array.from(localMap.keys()),
    ...Array.from(cloudMap.keys()),
  ]);

  for (const id of allIds) {
    const local = localMap.get(id);
    const cloud = cloudMap.get(id);

    const isDeleted = Boolean(local?.isDeleted || cloud?.isDeleted);
    const deletedAt = Math.max(local?.deletedAt || 0, cloud?.deletedAt || 0);
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

    if (isDeleted) {
      // Retain tombstone in merged set so stale offline devices do not resurrect it
      if (!deletedAt || Date.now() - deletedAt <= THIRTY_DAYS_MS) {
        mergedMap.set(id, {
          ...(cloud || {}),
          ...(local || {}),
          id,
          isDeleted: true,
          deletedAt: deletedAt || Date.now(),
        } as any);
      }
      continue;
    }

    if (local && cloud) {
      const localUpdated = (local as any).updatedAt || (local as any).completedAt || 0;
      const cloudUpdated = (cloud as any).updatedAt || (cloud as any).completedAt || 0;
      const localIsNewer = localUpdated >= cloudUpdated;

      const baseTask = localIsNewer ? { ...cloud, ...local } : { ...local, ...cloud };
      mergedMap.set(id, {
        ...baseTask,
        // Completion reversibility based on newest mutation timestamp
        completed: (localUpdated > 0 || cloudUpdated > 0)
          ? (localIsNewer ? Boolean(local.completed) : Boolean(cloud.completed))
          : Boolean(local.completed || cloud.completed),
        homeworkDone: (localUpdated > 0 || cloudUpdated > 0)
          ? (localIsNewer ? Boolean(local.homeworkDone) : Boolean(cloud.homeworkDone))
          : Boolean(local.homeworkDone || cloud.homeworkDone),
        dppDone: (localUpdated > 0 || cloudUpdated > 0)
          ? (localIsNewer ? Boolean(local.dppDone) : Boolean(cloud.dppDone))
          : Boolean(local.dppDone || cloud.dppDone),
        calendarSynced: Boolean(local.calendarSynced || cloud.calendarSynced),
        calendarEventId: local.calendarEventId || cloud.calendarEventId,
        calendarTaskId: local.calendarTaskId || cloud.calendarTaskId,
      });
    } else if (local && !cloud) {
      mergedMap.set(id, local);
    } else if (!local && cloud) {
      // NEVER drop cloud tasks just because local was empty!
      mergedMap.set(id, cloud);
    }
  }

  // Deduplicate tasks: drop duplicate Google calendar events and duplicate scheduled slots
  const deduplicated: Todo[] = [];
  const seenGoogleEventIds = new Set<string>();
  const seenSlotSignatures = new Set<string>();

  for (const t of mergedMap.values()) {
    if (t.isDeleted) {
      deduplicated.push(t);
      continue;
    }

    if (t.calendarEventId && !t.calendarEventId.startsWith("local-")) {
      if (seenGoogleEventIds.has(t.calendarEventId)) {
        continue; // duplicate task referencing same Google Calendar event
      }
      seenGoogleEventIds.add(t.calendarEventId);
    }

    if (t.text && t.startTime) {
      const sMs = new Date(t.startTime).getTime();
      const roundedSlot = Math.round(sMs / (20 * 60 * 1000));
      const sig = `${(t.subject || "").trim().toLowerCase()}_${t.text.trim().toLowerCase().replace(/^\[done\]\s*/i, "")}_${roundedSlot}`;
      if (seenSlotSignatures.has(sig)) {
        continue; // duplicate task in identical slot
      }
      seenSlotSignatures.add(sig);
    }

    deduplicated.push(t);
  }

  return deduplicated;
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

export function mergeSyllabusData(
  localSyllabus?: SyllabusData,
  cloudSyllabus?: SyllabusData
): SyllabusData | undefined {
  if (!cloudSyllabus && localSyllabus) return localSyllabus;
  if (!localSyllabus && cloudSyllabus) return cloudSyllabus;
  if (!localSyllabus && !cloudSyllabus) return undefined;

  const result: any = { ...localSyllabus };
  const subjects: (keyof SyllabusData)[] = ["Physics", "Chemistry", "Mathematics"];

  for (const subj of subjects) {
    const localChaps = localSyllabus?.[subj] || [];
    const cloudChaps = cloudSyllabus?.[subj] || [];

    const map = new Map<string, any>();
    localChaps.forEach((c) => {
      if (c && c.name) map.set(c.name, { ...c });
    });

    cloudChaps.forEach((c) => {
      if (c && c.name) {
        const existing = map.get(c.name);
        if (existing) {
          map.set(c.name, {
            ...existing,
            ...c,
            mastery: Math.max(existing.mastery || 0, c.mastery || 0),
            lectures: Math.max(existing.lectures || 0, c.lectures || 0),
            pyq: Math.max(existing.pyq || 0, c.pyq || 0),
            accuracy: Math.max(existing.accuracy || 0, c.accuracy || 0),
            backlog: c.backlog !== undefined ? c.backlog : existing.backlog || 0,
            confidence: c.confidence || existing.confidence || "Not Started",
            status: c.status || existing.status || "gray",
            lastLectureNumber: Math.max(existing.lastLectureNumber || 0, c.lastLectureNumber || 0),
          });
        } else {
          map.set(c.name, { ...c });
        }
      }
    });

    if (map.size > 0) {
      result[subj] = Array.from(map.values());
    }
  }

  return result as SyllabusData;
}

export function mergeHabits(
  localHabits: Habit[] = [],
  cloudHabits: Habit[] = []
): Habit[] {
  const map = new Map<string, Habit>();
  (cloudHabits || []).forEach((h) => {
    if (h && h.id) map.set(String(h.id), { ...h });
  });
  (localHabits || []).forEach((h) => {
    if (h && h.id) {
      const existing = map.get(String(h.id));
      if (existing) {
        map.set(String(h.id), {
          ...existing,
          ...h,
          completedDays: Array.from(new Set([...(existing.completedDays || []), ...(h.completedDays || [])])),
        });
      } else {
        map.set(String(h.id), { ...h });
      }
    }
  });
  return Array.from(map.values());
}

export function mergeMonthlyGoals(
  localGoals: MonthlyGoal[] = [],
  cloudGoals: MonthlyGoal[] = []
): MonthlyGoal[] {
  const map = new Map<string, MonthlyGoal>();
  (cloudGoals || []).forEach((g) => {
    if (g && g.id) map.set(String(g.id), { ...g });
  });
  (localGoals || []).forEach((g) => {
    if (g && g.id) {
      const existing = map.get(String(g.id));
      if (existing) {
        map.set(String(g.id), {
          ...existing,
          ...g,
          completed: Boolean(existing.completed || g.completed),
        });
      } else {
        map.set(String(g.id), { ...g });
      }
    }
  });
  return Array.from(map.values());
}

export function mergeLifeMetrics(
  localMetrics: LifeMetric[] = [],
  cloudMetrics: LifeMetric[] = []
): LifeMetric[] {
  const map = new Map<string, LifeMetric>();

  const getMetricKey = (m: LifeMetric): string => {
    if ((m as any).date) return String((m as any).date);
    if (m.day) return `day_${m.day}`;
    return `unknown_${Math.random()}`;
  };

  (cloudMetrics || []).forEach((m) => {
    if (m && (m.day || (m as any).date)) {
      map.set(getMetricKey(m), { ...m });
    }
  });

  (localMetrics || []).forEach((m) => {
    if (m && (m.day || (m as any).date)) {
      const key = getMetricKey(m);
      const existing = map.get(key);
      if (existing) {
        map.set(key, {
          day: m.day || existing.day,
          date: (m as any).date || (existing as any).date,
          sleep:
            typeof m.sleep === "number" && !isNaN(m.sleep) && m.sleep >= 0
              ? m.sleep
              : existing.sleep || 0,
          screenTime:
            typeof m.screenTime === "number" && !isNaN(m.screenTime) && m.screenTime >= 0
              ? m.screenTime
              : existing.screenTime || 0,
        });
      } else {
        map.set(key, { ...m });
      }
    }
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

  const syllabus = mergeSyllabusData(localState.syllabus, cloudState.syllabus);
  const habits = mergeHabits(localState.habits, cloudState.habits);
  const monthlyGoals = mergeMonthlyGoals(localState.monthlyGoals, cloudState.monthlyGoals);
  const lifeMetrics = mergeLifeMetrics(localState.lifeMetrics, cloudState.lifeMetrics);

  const xp = Math.max(localState.xp || 0, cloudState.xp || 0);
  const level = Math.max(localState.level || 1, cloudState.level || 1);
  const questionsSolved = Math.max(
    localState.questionsSolved || 0,
    cloudState.questionsSolved || 0
  );
  // Streak integrity: use the streak from the state with the most recent study activity / timestamp
  const streakDays = localIsNewer
    ? (localState.streakDays ?? cloudState.streakDays ?? 0)
    : (cloudState.streakDays ?? localState.streakDays ?? 0);
  const coins = localIsNewer
    ? (localState.coins ?? cloudState.coins ?? 0)
    : (cloudState.coins ?? localState.coins ?? 0);
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

  // Non-destructive base state
  const baseState = {
    ...cloudState,
    ...localState,
  };

  // Retain cloud strings/objects if local has empty defaults
  const playerName = (localState.playerName && localState.playerName !== "Player 1")
    ? localState.playerName
    : (cloudState.playerName || localState.playerName || "Player 1");

  const appStartDate = localState.appStartDate || cloudState.appStartDate || null;

  const mergedState = {
    ...cloudState,
    ...localState,
    appStartDate,
    xp,
    level,
    questionsSolved,
    streakDays,
    coins,
    totalSpentXp,
    focusBadges,
    xpGainedToday,
    hoursStudiedToday,
    spentXpToday,
    lastStudyDate,
    playerName,
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
