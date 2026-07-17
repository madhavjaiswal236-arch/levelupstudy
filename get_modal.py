import sys

with open('src/components/StudyCalendar.tsx', 'r') as f:
    content = f.read()

start_idx = content.find("{/* Create Task Modal */}")
end_idx = content.find("</AnimatePresence>", start_idx) + 18

print(content[start_idx:end_idx])
