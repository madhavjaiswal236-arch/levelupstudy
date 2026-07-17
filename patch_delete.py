with open('src/components/StudyCalendar.tsx', 'r') as f:
    lines = f.readlines()

# Add calendarEventId to scheduledEvents
for i, line in enumerate(lines):
    if "          subject: t.subject || 'Default'," in line:
        lines.insert(i+1, "          calendarEventId: t.calendarEventId,\n")
        break

# Update onClick handler
for i, line in enumerate(lines):
    if "onClick={(e) => {" in line:
        start_idx = i
        end_idx = -1
        for j in range(i, len(lines)):
            if "}}" in lines[j] and "className=" in lines[j+1]:
                end_idx = j
                break
        
        replacement = """                  onClick={(e) => {
                    e.stopPropagation();
                    setTodos(prev => prev.filter(t => t.id !== ev.id));
                    setUnsyncedChanges(true);
                    if ((ev as any).calendarEventId) {
                      deleteCalendarEvent((ev as any).calendarEventId).catch(console.error);
                    }
                  }}
"""
        del lines[start_idx:end_idx+1]
        lines.insert(start_idx, replacement)
        break

with open('src/components/StudyCalendar.tsx', 'w') as f:
    f.writelines(lines)
