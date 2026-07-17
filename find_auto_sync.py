import sys

with open('src/components/StudyCalendar.tsx', 'r') as f:
    content = f.read()

import re
matches = re.finditer(r'(updateCalendarEventTime|createCalendarEvent|deleteCalendarEvent)[^\n]+', content)
for m in matches:
    print(m.group(0))

