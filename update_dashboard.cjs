const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

code = code.replace(/setTodos\(\(prev\) => \[\.\.\.prev\, newTask\]\);/, `setTodos((prev) => {
    const isDuplicate = prev.some(
      (t) =>
        t.id === newTask.id ||
        (t.text === newTask.text &&
          t.type === newTask.type &&
          t.subject === newTask.subject &&
          t.chapter === newTask.chapter &&
          !t.completed)
    );
    if (isDuplicate) return prev;
    return [...prev, newTask];
  });`);

fs.writeFileSync('src/pages/Dashboard.tsx', code);

// Also in StudyCalendar.tsx
let calCode = fs.readFileSync('src/components/StudyCalendar.tsx', 'utf8');
calCode = calCode.replace(/const updatedTodos = \[\.\.\.todos\, newTask\];\s*setTodos\(updatedTodos\);/, `const isDuplicate = todos.some(
                          (t) =>
                            t.id === newTask.id ||
                            (t.text === newTask.text &&
                              t.type === newTask.type &&
                              t.subject === newTask.subject &&
                              t.chapter === newTask.chapter &&
                              !t.completed)
                        );
                        if (!isDuplicate) {
                          setTodos([...todos, newTask]);
                        }`);

fs.writeFileSync('src/components/StudyCalendar.tsx', calCode);
