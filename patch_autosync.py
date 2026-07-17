with open('src/components/StudyCalendar.tsx', 'r') as f:
    lines = f.readlines()

autosync_effect = """
  // Auto-sync changes to Google Calendar
  useEffect(() => {
    if (unsyncedChanges && !isSyncing) {
      const timer = setTimeout(() => {
        handleCalendarSync();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [unsyncedChanges, todos]); // trigger when unsyncedChanges becomes true, and has latest todos
"""

# find where to insert
insert_idx = -1
for i, line in enumerate(lines):
    if "const currentSubjectChapters = useMemo(() => {" in line:
        insert_idx = i
        break

lines.insert(insert_idx, autosync_effect)

with open('src/components/StudyCalendar.tsx', 'w') as f:
    f.writelines(lines)
