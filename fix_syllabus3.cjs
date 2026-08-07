const fs = require('fs');
let code = fs.readFileSync('src/pages/Syllabus.tsx', 'utf8');

const targetToRemove = ` const dppTodos = chapterTodos.filter(t => t.type === 'DPP' || (t.text && t.text.toLowerCase().includes('dpp'))); const totalDPPs = dppTodos.length; const completedDPPs = dppTodos.filter(t => t.completed).length; const dppBacklogs = dppTodos.filter(t => !t.completed && (t as any).date && new Date((t as any).date).getTime() < new Date().setHours(0,0,0,0)).length || dppTodos.filter(t => !t.completed && new Date(t.id).getTime() < new Date().setHours(0,0,0,0)).length;`;

code = code.replace(targetToRemove, '');
fs.writeFileSync('src/pages/Syllabus.tsx', code);
