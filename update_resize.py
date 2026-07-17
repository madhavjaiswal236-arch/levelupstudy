import sys
import re

with open('src/components/StudyCalendar.tsx', 'r') as f:
    content = f.read()

# Update event creation snapping
bad_create = """                 // Snap start to nearest 15 mins
                 const rawStartHour = 5 + (y / 80);
                 const startHour = Math.floor(rawStartHour * 4) / 4;"""
good_create = """                 // Snap start to nearest minute
                 const rawStartHour = 5 + (y / 80);
                 const startHour = Math.floor(rawStartHour * 60) / 60;"""
content = content.replace(bad_create, good_create)

# Update resize logic (updateSize)
bad_resize_size = """                      let rawDeltaMins = deltaY / (80 / 60);
                      let newDurationMins = Math.round((originalDurationMins + rawDeltaMins) / 15) * 15;
                      if (newDurationMins < 15) newDurationMins = 15;"""
good_resize_size = """                      let rawDeltaMins = deltaY / (80 / 60);
                      let newDurationMins = Math.round(originalDurationMins + rawDeltaMins);
                      if (newDurationMins < 5) newDurationMins = 5;"""
content = content.replace(bad_resize_size, good_resize_size)

with open('src/components/StudyCalendar.tsx', 'w') as f:
    f.write(content)

print("Updated resize snapping.")
