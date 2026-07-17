with open('src/components/StudyCalendar.tsx', 'r') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "          subject: t.subject || 'Default'," in line:
        lines.insert(i+1, "          calendarEventId: t.calendarEventId,\n")
        break

with open('src/components/StudyCalendar.tsx', 'w') as f:
    f.writelines(lines)
