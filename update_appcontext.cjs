const fs = require('fs');
let code = fs.readFileSync('src/context/AppContext.tsx', 'utf8');

const targetStr = `  // Save state on change
  useEffect(() => {
    if (!isLoaded) return;
    const stateToSave = {
      xp,
      xpGainedToday,
      spentXpToday,
      totalSpentXp,
      hoursStudiedToday,
      level,
      questionsSolved,
      dailyTarget,
      accuracy,
      speedScore,
      streakDays,
      lastStudyDate,
      focusBadges,
      syllabus,
      activeBoost,
      class11EndDate,
      isClass11SetupDone,
      backlogPriorities,
      todos,
      loggedTasksToday,
      pendingTasks,
      history,
      practiceSessions,
      playerName,
      hasSeenRules,
      habits,
      lifeMetrics,
      monthlyGoals,
      lastBossDayDate,
      bossDayTargetXp,
      bossDayCompleted,
      equippedTitle,
      equippedAura,
      unlockedItems,
      notificationSettings,
      totalXpGoal,
      ongoingChapters,
    };`;

const replacementStr = `  // Save state on change
  useEffect(() => {
    if (!isLoaded) return;

    // Integrity Check: De-duplicate daily logged tasks before state persistence
    const validatedLoggedTasks: Todo[] = [];
    const seenTaskKeys = new Set<string>();

    for (const task of loggedTasksToday) {
      if (!task) continue;
      const key = task.id
        ? \`id_\${task.id}\`
        : \`\${task.subject || ''}_\${task.chapter || ''}_\${task.type || ''}_\${task.lectureNumber || ''}_\${task.text || ''}\`;
      if (!seenTaskKeys.has(key)) {
        seenTaskKeys.add(key);
        validatedLoggedTasks.push(task);
      }
    }

    // Validate completed lecture counts map correctly to progress state (Syllabus)
    const validatedSyllabus = { ...syllabus };
    let syllabusUpdated = false;

    if (validatedSyllabus && typeof validatedSyllabus === 'object') {
      (Object.keys(validatedSyllabus) as (keyof SyllabusData)[]).forEach((subj) => {
        if (Array.isArray(validatedSyllabus[subj])) {
          validatedSyllabus[subj] = validatedSyllabus[subj].map((chap) => {
            if (!chap) return chap;
            const loggedLecNums = validatedLoggedTasks
              .filter((t) => t.subject === subj && t.chapter === chap.name && (t.type === 'Lecture' || t.type === 'Theory') && t.lectureNumber !== undefined)
              .map((t) => Number(t.lectureNumber) || 0);

            const todoLecNums = todos
              .filter((t) => t.completed && t.subject === subj && t.chapter === chap.name && (t.type === 'Lecture' || t.type === 'Theory') && t.lectureNumber !== undefined)
              .map((t) => Number(t.lectureNumber) || 0);

            const historyLecNums = (history || [])
              .flatMap((h) => h.completedTasks || [])
              .filter((t) => t.subject === subj && t.chapter === chap.name && (t.type === 'Lecture' || t.type === 'Theory') && t.lectureNumber !== undefined)
              .map((t) => Number(t.lectureNumber) || 0);

            const maxCompletedLec = Math.max(
              0,
              chap.lastLectureNumber || 0,
              ...loggedLecNums,
              ...todoLecNums,
              ...historyLecNums
            );

            if (maxCompletedLec > (chap.lastLectureNumber || 0)) {
              syllabusUpdated = true;
              return { ...chap, lastLectureNumber: maxCompletedLec };
            }
            return chap;
          });
        }
      });
    }

    const stateToSave = {
      xp,
      xpGainedToday,
      spentXpToday,
      totalSpentXp,
      hoursStudiedToday,
      level,
      questionsSolved,
      dailyTarget,
      accuracy,
      speedScore,
      streakDays,
      lastStudyDate,
      focusBadges,
      syllabus: syllabusUpdated ? validatedSyllabus : syllabus,
      activeBoost,
      class11EndDate,
      isClass11SetupDone,
      backlogPriorities,
      todos,
      loggedTasksToday: validatedLoggedTasks,
      pendingTasks,
      history,
      practiceSessions,
      playerName,
      hasSeenRules,
      habits,
      lifeMetrics,
      monthlyGoals,
      lastBossDayDate,
      bossDayTargetXp,
      bossDayCompleted,
      equippedTitle,
      equippedAura,
      unlockedItems,
      notificationSettings,
      totalXpGoal,
      ongoingChapters,
    };`;

code = code.replace(/  \/\/ Save state on change\n  useEffect\(\(\) => \{\n    if \(!isLoaded\) return;\n    const stateToSave = \{[^}]*?\n    \};/s, replacementStr);

// Cloud sync de-duplication
code = code.replace(
  'if (cloudData.loggedTasksToday !== undefined) setLoggedTasksToday(cloudData.loggedTasksToday);',
  `if (cloudData.loggedTasksToday !== undefined) {
        const uniqueCloudTasks: Todo[] = [];
        const seenCloudKeys = new Set<string>();
        for (const task of cloudData.loggedTasksToday || []) {
          if (!task) continue;
          const key = task.id
            ? \`id_\${task.id}\`
            : \`\${task.subject || ''}_\${task.chapter || ''}_\${task.type || ''}_\${task.lectureNumber || ''}_\${task.text || ''}\`;
          if (!seenCloudKeys.has(key)) {
            seenCloudKeys.add(key);
            uniqueCloudTasks.push(task);
          }
        }
        setLoggedTasksToday(uniqueCloudTasks);
      }`
);

fs.writeFileSync('src/context/AppContext.tsx', code);
