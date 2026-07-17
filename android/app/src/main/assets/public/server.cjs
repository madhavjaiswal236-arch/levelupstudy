var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server.ts
var server_exports = {};
__export(server_exports, {
  default: () => server_default
});
module.exports = __toCommonJS(server_exports);
var import_express_rate_limit = __toESM(require("express-rate-limit"), 1);
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var app = (0, import_express.default)();
app.set("trust proxy", 1);
var PORT = 3e3;
app.use(import_express.default.json());
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = ["http://localhost:3000", "capacitor://localhost", "http://localhost"];
  if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== "production") {
    res.header("Access-Control-Allow-Origin", origin || "*");
  } else {
    res.header("Access-Control-Allow-Origin", "*");
  }
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});
var apiLimiter = (0, import_express_rate_limit.default)({
  windowMs: 15 * 60 * 1e3,
  max: 100,
  message: { error: "Too many requests, please try again later." },
  validate: { xForwardedForHeader: false, trustProxy: false, default: false }
});
app.use("/api/", apiLimiter);
var geminiApiKey = process.env.GEMINI_API_KEY;
var ai = null;
if (geminiApiKey && typeof geminiApiKey === "string" && geminiApiKey.trim().length > 0) {
  try {
    ai = new import_genai.GoogleGenAI({ apiKey: geminiApiKey });
  } catch (e) {
    console.error("Failed to initialize GoogleGenAI");
  }
}
app.post("/api/ai-coach", async (req, res) => {
  const { hours, sleep, screenTime, completedTasksCount, plannedTasksCount, history } = req.body;
  const complianceScore = Math.round((completedTasksCount || 0) / Math.max(1, plannedTasksCount || 1) * 100);
  let flags = [];
  if (hours > 4 && completedTasksCount === 0) flags.push("fake_work");
  if (sleep < 6) flags.push("sleep_debt");
  if (screenTime > 4 && hours < 4) flags.push("dopamine_drift");
  if (Array.isArray(history)) {
    const recentMisses = history.filter((h) => h.isMissed || h.hoursStudied < 2).length;
    if (recentMisses >= 3) flags.push("streak_broken_trend");
  }
  let severity = 5;
  if (sleep >= 7) severity -= 1;
  if (screenTime < 2) severity -= 1;
  if (complianceScore >= 80) severity -= 1;
  if (sleep < 6) severity += 1;
  if (screenTime > 4) severity += 1;
  if (complianceScore < 50) severity += 1;
  if (flags.includes("fake_work")) severity += 2;
  if (flags.includes("streak_broken_trend")) severity += 1;
  severity = Math.max(1, Math.min(10, severity));
  let label = "";
  if (severity <= 2) label = "Elite";
  else if (severity <= 4) label = "Consistent";
  else if (severity <= 6) label = "Off Track";
  else if (severity <= 8) label = "Warning: Crash/Burnout";
  else label = "Total Breakdown";
  const p1 = `Yesterday\u2019s raw report: Sleep ${sleep}h. Screen ${screenTime}h. You did ${hours}h of study. Tasks: ${completedTasksCount}/${plannedTasksCount}.`;
  let p2 = "Clean execution.";
  if (flags.includes("fake_work")) p2 = `${hours}h at desk and barely any output. That\u2019s passive consumption, not training.`;
  else if (flags.includes("dopamine_drift")) p2 = `You burnt your dopamine avoiding friction with ${screenTime}h on screens.`;
  else if (flags.includes("sleep_debt")) p2 = "Sleep debt is destroying your retention.";
  else if (flags.includes("streak_broken_trend")) p2 = "You are breaking your promises consistently. The trend is downward.";
  let p3 = "";
  if (severity <= 2) p3 = "Elite output. Maintain rhythm.";
  else if (severity <= 4) p3 = "Consistent. Don't let off the gas.";
  else if (severity <= 6) p3 = "You\u2019re drifting. Wake up.";
  else if (severity <= 8) p3 = "This is self-sabotage dressed as effort.";
  else p3 = "You\u2019re handing your IIT seat to someone who fixes their faults faster.";
  let p4 = "";
  if (flags.includes("fake_work")) p4 = "Today, track only output. Any study hour without output doesn\u2019t count.";
  else if (flags.includes("sleep_debt")) p4 = "Target 6h of sharp work. No more. Sleep 7.5h tonight mandatory. Recovery is the mission.";
  else if (flags.includes("dopamine_drift")) p4 = "Phone locked outside room until first 90-min block complete.";
  else p4 = "Sustain rhythm: deep work with one 90-min block on your weakest topic.";
  const pushes = ["Stay hard.", "The mirror is the only enemy you must beat today.", "Go to war with yourself. I'm watching."];
  const p5 = pushes[Math.floor(Math.random() * pushes.length)];
  const fallbackResponse = `${p1}

${p2}

${p3}

${p4}

${p5}`;
  if (!ai) {
    console.warn("GEMINI_API_KEY is not defined. Using pure logic engine.");
    return res.json({ feedback: fallbackResponse });
  }
  return res.json({ feedback: fallbackResponse });
});
app.post("/api/dynamic-insight", async (req, res) => {
  const { hoursToday, streak, accuracy, questionsSolved, target, pendingTasksCount, recentTaskTypes } = req.body;
  let insight = "Hours don't crack JEE. Output does. Hunt weaknesses and track problems solved.";
  const hrs = hoursToday || 0;
  const acc = accuracy || 0;
  const q = questionsSolved || 0;
  const tgt = target || 0;
  if (hrs < 2 && pendingTasksCount > 0) {
    insight = "You didn't fail willpower; you failed environmental design. Phone in another room. Win the next 30 minutes.\n\n\u{1F512} Lock: Motion beats stagnation. Break the pattern.";
  } else if (hrs > 4 && q < 15) {
    insight = "Reading theory is hiding from failure. Close the book. Give me one 25-minute problem sprint.\n\n\u{1F512} Lock: Fake productivity alert. Chase friction.";
  } else if (acc < 60 && q > 10) {
    insight = "You are recognizing theory, not recalling concepts. Read less. Solve more.\n\n\u{1F512} Lock: Your error rate is bleeding out gains. Accuracy > Speed today.";
  } else if (q >= tgt && tgt > 0) {
    insight = "Elite execution. You put up numbers today. Now drop it. The ego hangover will kill tomorrow's momentum.\n\n\u{1F512} Lock: Targets hit. Acknowledge it, then drop it.";
  } else if (streak >= 3) {
    insight = `Discipline is boring replication. The top 100 ranks aren't built on motivation.

\u{1F512} Lock: Protect the ${streak}-day streak. Return fast.`;
  }
  return res.json({ insight });
});
async function startServer() {
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}
startServer();
var server_default = app;
//# sourceMappingURL=server.cjs.map
