import re

def fix_study_calendar():
    with open('src/components/StudyCalendar.tsx', 'r') as f:
        content = f.read()

    # Change editingEvent type to any to avoid Todo mismatch
    content = content.replace(
        'const [editingEvent, setEditingEvent] = useState<Todo | null>(null);',
        'const [editingEvent, setEditingEvent] = useState<any>(null);'
    )
    
    # Fix Store.tsx variants
    with open('src/pages/Store.tsx', 'r') as f:
        store_content = f.read()
    store_content = store_content.replace('type: "spring"', 'type: "spring" as any')
    with open('src/pages/Store.tsx', 'w') as f:
        f.write(store_content)

    # Fix Syllabus.tsx variants
    with open('src/pages/Syllabus.tsx', 'r') as f:
        syllabus_content = f.read()
    syllabus_content = syllabus_content.replace('type: "spring"', 'type: "spring" as any')
    with open('src/pages/Syllabus.tsx', 'w') as f:
        f.write(syllabus_content)

    with open('src/components/StudyCalendar.tsx', 'w') as f:
        f.write(content)

fix_study_calendar()
