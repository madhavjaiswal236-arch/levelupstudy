const fs = require('fs');
let code = fs.readFileSync('src/components/JeeSessionLogger.tsx', 'utf8');

// 1. Update lastLectureNumber mapping to validate against max
const oldBlock1 = `    const parsedLecNum = parseInt(lectureNumber as string);
    if (!isNaN(parsedLecNum)) {
      updates.lastLectureNumber = parsedLecNum;
    }
  } else if (sessionType === 'DPP') {
    const parsedLecNum = parseInt(lectureNumber as string);
    if (!isNaN(parsedLecNum)) {
      // Update the lecture number attached to this DPP to the latest if applicable
      updates.lastLectureNumber = parsedLecNum;
    }`;

code = code.replace(/const parsedLecNum = parseInt\(lectureNumber as string\);[^]*?updates\.lastLectureNumber = parsedLecNum;\s*\}/, (match) => {
  return `const parsedLecNum = parseInt(lectureNumber as string);
    if (!isNaN(parsedLecNum) && parsedLecNum > 0) {
      const currentLastLec = currentChapterStat?.lastLectureNumber || 0;
      updates.lastLectureNumber = Math.max(currentLastLec, parsedLecNum);
    }`;
});

code = code.replace(/if \(!pendingTaskId\) \{\s*setLoggedTasksToday\(\[\.\.\.loggedTasksToday\, newLoggedTask\]\);\s*\}/, `if (!pendingTaskId) {
    // Integrity check: prevent duplicate entry creation
    const isDuplicate = loggedTasksToday.some(t => {
      if (t.id === newLoggedTask.id) return true;
      if (t.subject === subject && t.chapter === chapter && t.type === sessionType) {
        if (newLoggedTask.lectureNumber !== undefined && t.lectureNumber === newLoggedTask.lectureNumber) return true;
        if (t.text === newLoggedTask.text) return true;
      }
      return false;
    });

    if (!isDuplicate) {
      setLoggedTasksToday([...loggedTasksToday, newLoggedTask]);
    }
  }`);

fs.writeFileSync('src/components/JeeSessionLogger.tsx', code);
