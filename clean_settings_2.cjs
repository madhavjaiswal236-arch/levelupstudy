const fs = require('fs');
let code = fs.readFileSync('src/pages/Settings.tsx', 'utf8');

// Remove the useEffect
code = code.replace(/  \/\/ Sync state when context values load or update\n  React\.useEffect\(\(\) => \{[^}]*\}\, \[.*?\]\);\n/s, '');

// Remove the JSON backup modal block
code = code.replace(/        \{\/\* JSON Backup Modal \*\/\}.*?\{\/\* Reset Section \*\/\}/s, '{/* Reset Section */}');

fs.writeFileSync('src/pages/Settings.tsx', code);
