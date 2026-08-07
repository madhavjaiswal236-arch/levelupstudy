const fs = require('fs');
let code = fs.readFileSync('src/pages/Syllabus.tsx', 'utf8');

const replacement = `const allTasksForChapter = [...todos, ...pendingTasks, ...history.flatMap(h => h.completedTasks || []), ...loggedTasksToday].filter(t => t.chapter === selectedChapterDetail.name);
const lectureTasks = allTasksForChapter.filter(t => t.type === 'Lecture' || t.type === 'Theory');
const maxLec = Math.max(0, selectedChapterDetail.lastLectureNumber || 0, ...lectureTasks.map(t => t.lectureNumber || 0));
const totalLectures = maxLec;
const completedLectures = selectedChapterDetail.lastLectureNumber || 0;
const lectureBacklogs = pendingTasks.filter(t => t.chapter === selectedChapterDetail.name && (t.type === 'Lecture' || t.type === 'Theory')).length;
const dppTodos = [...todos, ...pendingTasks].filter(t => t.chapter === selectedChapterDetail.name && (t.type === 'DPP' || (t.text && t.text.toLowerCase().includes('dpp'))));
const dppCompleted = [...history.flatMap(h => h.completedTasks || []), ...loggedTasksToday].filter(t => t.chapter === selectedChapterDetail.name && (t.type === 'DPP' || (t.text && t.text.toLowerCase().includes('dpp'))));
const totalDPPs = new Set([...dppTodos.map(t => t.id), ...dppCompleted.map(t => t.id)]).size;
const completedDPPs = new Set(dppCompleted.map(t => t.id)).size;
const dppBacklogs = pendingTasks.filter(t => t.chapter === selectedChapterDetail.name && (t.type === 'DPP' || (t.text && t.text.toLowerCase().includes('dpp')))).length;`;

code = code.replace(/const chapterTodos = todos\.filter[^]*?new Date\(\)\.setHours\(0,0,0,0\)\)\.length;/, replacement);
fs.writeFileSync('src/pages/Syllabus.tsx', code);
