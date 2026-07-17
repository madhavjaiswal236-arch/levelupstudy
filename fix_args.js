const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

code = code.replace(
  /const handleAddTask = async \([\s\S]*?addToCalendar: boolean = true\s*\) => \{/m,
  `const handleAddTask = async (
    xpReward: number,
    taskName: string,
    type: string,
    overrideLectureNumber?: string,
    addToCalendar: boolean = true,
    durationInput?: number
  ) => {`
);

fs.writeFileSync('src/pages/Dashboard.tsx', code);
