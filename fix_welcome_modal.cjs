const fs = require('fs');

// 1. App.tsx
let appCode = fs.readFileSync('src/App.tsx', 'utf8');

const oldAppLogic = `  useEffect(() => {
  if (!isLoaded) return;
  if (playerName === "Player 1" || !playerName) {
  setShowNameModal(true);
  } else {
  setShowNameModal(false);
  }
  }, [playerName, isLoaded]);

  const handleNameSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  if ((tempName || "").trim()) {
  setPlayerName((tempName || "").trim());
  setShowNameModal(false);
  }
  };`;

const newAppLogic = `  useEffect(() => {
    if (!isLoaded) return;
    const hasCompleted = localStorage.getItem("hasCompletedNameSetup") === "true";
    if (!hasCompleted && (!playerName || playerName === "Player 1")) {
      setShowNameModal(true);
    } else {
      if (playerName && playerName !== "Player 1") {
        localStorage.setItem("hasCompletedNameSetup", "true");
      }
      setShowNameModal(false);
    }
  }, [playerName, isLoaded]);

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = (tempName || "").trim();
    if (trimmed) {
      setPlayerName(trimmed);
      localStorage.setItem("hasCompletedNameSetup", "true");
      setShowNameModal(false);
    }
  };`;

appCode = appCode.replace(oldAppLogic, newAppLogic);
fs.writeFileSync('src/App.tsx', appCode);

// 2. Dashboard.tsx
let dashCode = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

const oldDashInput = `                    value={playerName || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPlayerName(val || "Player 1");
                    }}`;

const newDashInput = `                    value={playerName || ""}
                    onChange={(e) => {
                      setPlayerName(e.target.value);
                    }}
                    onBlur={() => {
                      if (!playerName || !playerName.trim()) {
                        setPlayerName("Player 1");
                      }
                    }}`;

dashCode = dashCode.replace(oldDashInput, newDashInput);
fs.writeFileSync('src/pages/Dashboard.tsx', dashCode);

// 3. Settings.tsx
let settingsCode = fs.readFileSync('src/pages/Settings.tsx', 'utf8');

const oldSettingsInput = `              <input
                type="text"
                value={playerName || ""}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
              />`;

const newSettingsInput = `              <input
                type="text"
                value={playerName || ""}
                onChange={(e) => setPlayerName(e.target.value)}
                onBlur={() => {
                  if (!playerName || !playerName.trim()) {
                    setPlayerName("Player 1");
                  }
                }}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
              />`;

settingsCode = settingsCode.replace(oldSettingsInput, newSettingsInput);
fs.writeFileSync('src/pages/Settings.tsx', settingsCode);

console.log("Welcome modal fix applied successfully.");
