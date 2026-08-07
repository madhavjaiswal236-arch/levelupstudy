const fs = require('fs');
let code = fs.readFileSync('src/pages/Syllabus.tsx', 'utf8');

const target = `const chapterTodos = todos.filter(t => t.chapter === selectedChapterDetail.name);  const lectureTodos = chapterTodos.filter(t => t.type === 'Lecture'); const totalLectures = lectureTodos.length; const completedLectures = lectureTodos.filter(t => t.completed).length; const lectureBacklogs = lectureTodos.filter(t => !t.completed && (t as any).date && new Date((t as any).date).getTime() < new Date().setHours(0,0,0,0)).length || lectureTodos.filter(t => !t.completed && new Date(t.id).getTime() < new Date().setHours(0,0,0,0)).length; const dppTodos = chapterTodos.filter(t => t.type === 'DPP' || (t.text && t.text.toLowerCase().includes('dpp'))); const totalDPPs = dppTodos.length; const completedDPPs = dppTodos.filter(t => t.completed).length; const dppBacklogs = dppTodos.filter(t => !t.completed && (t as any).date && new Date((t as any).date).getTime() < new Date().setHours(0,0,0,0)).length || dppTodos.filter(t => !t.completed && new Date(t.id).getTime() < new Date().setHours(0,0,0,0)).length;`;

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

if (code.includes(target)) {
  code = code.replace(target, replacement.replace(/\n/g, ' '));
  fs.writeFileSync('src/pages/Syllabus.tsx', code);
  console.log("Success");
} else {
  console.log("Target not found");
}
