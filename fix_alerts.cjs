const fs = require('fs');
let profile = fs.readFileSync('src/pages/Profile.tsx', 'utf8');

if (!profile.includes('const [syncMsg, setSyncMsg] = useState("");')) {
  profile = profile.replace(/const \[isPulling, setIsPulling\] = useState\(false\);/, `const [isPulling, setIsPulling] = useState(false);\n const [syncMsg, setSyncMsg] = useState("");`);
}

profile = profile.replace(/alert\("Data successfully pushed to cloud."\);/g, `setSyncMsg("Data successfully pushed to cloud."); setTimeout(() => setSyncMsg(""), 3000);`);
profile = profile.replace(/alert\("Failed to upload data"\);/g, `setSyncMsg("Failed to upload data. Check console."); setTimeout(() => setSyncMsg(""), 3000);`);
profile = profile.replace(/alert\("Failed to download data"\);/g, `setSyncMsg("Failed to download data. Check console."); setTimeout(() => setSyncMsg(""), 3000);`);
profile = profile.replace(/if \(window.confirm\("Are you sure you want to pull data\? This will overwrite your current progress on this device."\)\) \{/, `if (true) { setSyncMsg("Pulling...");`);
profile = profile.replace(/alert\(\`Domain not authorized(.*?)\`\);/s, `setSyncMsg("Domain not authorized in Firebase! Note: It can take a few minutes for Firebase to apply this setting. Please ensure you have added exactly this domain to Firebase Console -> Authentication -> Settings -> Authorized domains:\\n\\n" + window.location.hostname);`);
profile = profile.replace(/alert\("Authentication is restricted by the browser in this preview iframe. Please use the 'Open in New Tab' button \(top right of preview\) to log in."\);/, `setSyncMsg("Authentication is restricted in this preview iframe. Please click 'Open in New Tab' (top right).");`);
profile = profile.replace(/alert\("Login failed: " \+ \(err\.message \|\| 'Unknown error\. Check console for details\.'\)\);/, `setSyncMsg("Login failed: " + (err.message || 'Unknown error. Check console for details.'));`);

// add syncMsg display
if (!profile.includes('{syncMsg && <div className="p-3 mb-4 bg-emerald-500/20 text-emerald-100 rounded-md border border-emerald-500/50">{syncMsg}</div>}')) {
  profile = profile.replace(/<CardContent className="space-y-6">/, `<CardContent className="space-y-6">\n{syncMsg && <div className="p-3 mb-4 bg-emerald-500/20 text-emerald-100 rounded-md border border-emerald-500/50">{syncMsg}</div>}`);
}

fs.writeFileSync('src/pages/Profile.tsx', profile);

let app = fs.readFileSync('src/App.tsx', 'utf8');

if (!app.includes('const [syncMsg, setSyncMsg] = useState("");')) {
  app = app.replace(/const \[isPushingToCloud, setIsPushingToCloud\] = useState\(false\);/, `const [isPushingToCloud, setIsPushingToCloud] = useState(false);\n  const [syncMsg, setSyncMsg] = useState("");`);
}

app = app.replace(/alert\("Failed to push data: " \+ \(e\.message \|\| e\)\);/g, `setSyncMsg("Failed to push data: " + (e.message || e)); setTimeout(() => setSyncMsg(""), 5000);`);
app = app.replace(/alert\("Failed to pull data"\);/g, `setSyncMsg("Failed to pull data"); setTimeout(() => setSyncMsg(""), 5000);`);

if (!app.includes('{syncMsg && <div className="p-3 mt-4 bg-red-500/20 text-red-100 rounded-md border border-red-500/50">{syncMsg}</div>}')) {
  app = app.replace(/<p className="text-slate-400 mb-6 text-sm">/g, `<p className="text-slate-400 mb-6 text-sm">\n{syncMsg && <div className="p-3 mt-4 bg-red-500/20 text-red-100 rounded-md border border-red-500/50">{syncMsg}</div>}`);
}

fs.writeFileSync('src/App.tsx', app);
