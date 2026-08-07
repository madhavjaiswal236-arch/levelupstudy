const fs = require('fs');
let code = fs.readFileSync('src/pages/Settings.tsx', 'utf8');

// Remove states
code = code.replace(/const \[editXp.*?useState\(false\);/s, '');
// Remove handleSaveStats
code = code.replace(/const handleSaveStats = \(\) => \{.*?\};\n\n/s, '');
// Remove history states
code = code.replace(/const \[newHistDate.*?useState\(false\);/s, '');
// Remove history handlers
code = code.replace(/const handleAddOrUpdateHistory = \(\) => \{.*?\};\n\n/s, '');
code = code.replace(/const handleOpenJsonModal = \(\) => \{.*?\};\n\n/s, '');
code = code.replace(/const handleImportHistoryJson = \(\) => \{.*?\};\n\n/s, '');

// Remove UI sections
code = code.replace(/\{\/\* Progress \& Stats Modifier \*\/}.*?\{\/\* History Repair \& Log Editor \*\/\}/s, '{/* History Repair & Log Editor */}');
code = code.replace(/\{\/\* History Repair \& Log Editor \*\/}.*?\{\/\* JSON Backup Modal \*\/\}/s, '{/* JSON Backup Modal */}');
code = code.replace(/\{\/\* JSON Backup Modal \*\/}.*?\{\/\* Reset Section \*\/\}/s, '{/* Reset Section */}');

fs.writeFileSync('src/pages/Settings.tsx', code);
