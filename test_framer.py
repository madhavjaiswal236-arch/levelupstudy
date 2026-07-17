import sys

with open('src/components/StudyCalendar.tsx', 'r') as f:
    content = f.read()

print("onClick" in content)
