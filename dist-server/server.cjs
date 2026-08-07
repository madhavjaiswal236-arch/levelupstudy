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
function generateFeedbackEngine(data) {
  const { hours = 0, sleep = 0, screenTime = 0, completedTasks = [], plannedTasks = [], practiceSessions = [], xpEarned = 0, targetXp = 1e3, history = [] } = data;
  let uncompletedTaskNames = [];
  if (plannedTasks && Array.isArray(plannedTasks)) {
    const completedIds = (completedTasks || []).map((t) => t.id);
    uncompletedTaskNames = plannedTasks.filter((t) => !completedIds.includes(t.id)).map((t) => t.text);
  }
  let questionsSolved = 0;
  if (practiceSessions && Array.isArray(practiceSessions)) {
    questionsSolved = practiceSessions.reduce((sum, s) => sum + (s.attempted || 0), 0);
  }
  let report = `Yesterday\u2019s raw report: Sleep ${sleep}h. Screen ${screenTime}h. `;
  if (plannedTasks.length > 0) {
    if (uncompletedTaskNames.length === 0) {
      report += `You planned ${plannedTasks.length} tasks and executed them all. `;
    } else {
      report += `You planned ${uncompletedTaskNames.join(", ")} but left it incomplete. `;
    }
  } else {
    report += `You had no specific tasks planned. `;
  }
  report += `You did ${hours}h of study.`;
  let diagnosis = "";
  let verdict = "";
  let mission = "";
  let closing = "The IIT paper doesn't care how you felt yesterday. Stay hard.";
  if (hours >= 8 && sleep >= 7) {
    diagnosis = `Clean execution above the benchmark. You put in the work, kept screen time low, and handled your business.`;
    verdict = "ELITE. Consistent momentum.";
    mission = "Acknowledge the win, then drop it. The ego hangover will kill today's momentum. Plan your first 30 mins and execute.";
  } else if (hours >= 8 && sleep < 6) {
    diagnosis = `You put in ${hours} hours of savage focus, but with only ${sleep}h of sleep, you're wearing your exhaustion like a badge. It's not honor; it's stupidity. Your brain consolidated nothing.`;
    verdict = "SELF-SABOTAGE MASKED AS HARD WORK. Recovery is a weapon, not a weakness.";
    mission = `No heroics today. Cap study at 6 hours of quality work only. Sleep 7.5+ hours tonight\u2014non-negotiable.`;
    closing = "Even warriors sharpen their swords. Stop swinging a blunt blade. Stay hard.";
  } else if (hours >= 8 && questionsSolved < 15 && hours > 0) {
    diagnosis = `Fake work. You logged ${hours}h, but output is too low. That's not learning; that's mental jogging. Passive reading is a sedative dressed as effort.`;
    verdict = "FAKE WORK. Hours without output is vanity.";
    mission = "Zero passive theory today. You will do timed DPPs only. Every wrong answer gets re-solved until it\u2019s automatic.";
  } else if (hours >= 4 && screenTime <= 4) {
    diagnosis = `Good effort (${hours}h). You're checking the boxes, but there's still friction. Keep tightening the screws.`;
    if (uncompletedTaskNames.length > 0) {
      diagnosis += ` You studied for ${hours} hours and never touched the one wound that's bleeding: ${uncompletedTaskNames[0]}. Every day you skip it, the fear grows. Today you watered that fear.`;
    }
    verdict = "CONSISTENT. You're doing the work, but there's room to tighten up.";
    mission = "Maintain the pace. Identify your hardest task and kill it in the first 90 minutes today.";
  } else if (hours >= 2 && screenTime > 4) {
    diagnosis = `You logged ${hours}h, which is under the 5-hour benchmark. You broke inertia but quit when it got hard. That's drifting, not climbing. You fried your dopamine with ${screenTime}h of screen time.`;
    if (uncompletedTaskNames.length > 0) {
      diagnosis += ` You studied for ${hours} hours and never touched the one wound that's bleeding: ${uncompletedTaskNames[0]}.`;
    }
    verdict = "OFF TRACK. You are slipping off the pace. The benchmark is 5 hours minimum.";
    mission = "Target 6 hours of sharp work to compensate. No more passive reading. Incomplete means the mission failed.";
    closing = "One day's discipline away from the next rank. The exam won't ignore your excuses. Stay hard.";
  } else if (hours < 2 && screenTime > 4) {
    diagnosis = `Zero output. You fried your dopamine with ${screenTime}h of screen time and walked away from the ring before it even started. That\u2019s a surrender.`;
    if (uncompletedTaskNames.length > 0) {
      diagnosis += ` Your repeated ${uncompletedTaskNames[0]} mistakes are festering. Another day of zero progress on the one leak that\u2019s been bleeding.`;
    }
    verdict = "TOTAL BREAKDOWN. This is a total collapse. You're building a pattern of surrender.";
    mission = `Phone locked outside until 10 AM. You will complete exactly one 30-minute DPP. That\u2019s it. Break the inertia.`;
    closing = "The mirror is the only enemy. Go prove you can come back. Stay hard.";
  } else if (hours < 2) {
    diagnosis = `Only ${hours}h logged. You never even stepped into the arena today. You let overwhelm hijack your day.`;
    verdict = "SURRENDER. Guilt is a trap; action is the antidote. Motion beats stagnation.";
    mission = "One lecture + 10 practice questions tomorrow. Phone in another room for the first 30 minutes. That\u2019s it. Prove you can still start.";
    closing = "One small win tomorrow is the first brick in rebuilding your discipline. Stay hard.";
  } else {
    diagnosis = `${hours} hours of study is your baseline. It\u2019s steady, but don\u2019t confuse comfort with progress.`;
    verdict = "PLATEAU ALERT. You\u2019re not regressing, but you\u2019re not growing either.";
    mission = "Progressive overload: add one 90-minute deep-work block to your routine. Track problems completed, not hours.";
  }
  return `${report}

Diagnosis: ${diagnosis}

Verdict: ${verdict}

Today's mission: ${mission}

Closing: ${closing}`;
}
app.post("/api/ai-coach", async (req, res) => {
  const data = req.body;
  const { hours, sleep, screenTime, completedTasks, plannedTasks, practiceSessions, xpEarned, targetXp, level, streakDays, history } = data;
  const fallbackResponse = generateFeedbackEngine(data);
  if (!ai) {
    console.warn("GEMINI_API_KEY is not defined. Using pure logic engine.");
    return res.json({ feedback: fallbackResponse });
  }
  try {
    let questionsSolved = 0;
    if (practiceSessions && Array.isArray(practiceSessions)) {
      questionsSolved = practiceSessions.reduce((sum, s) => sum + (s.attempted || 0), 0);
    }
    let uncompletedTaskNames = [];
    if (plannedTasks && Array.isArray(plannedTasks)) {
      const completedIds = (completedTasks || []).map((t) => t.id);
      uncompletedTaskNames = plannedTasks.filter((t) => !completedIds.includes(t.id)).map((t) => t.text);
    }
    const prompt = `You are the LevelUp Study AI Engine, a hardcore, ruthless, David Goggins-style coach for a competitive exam student (like IIT-JEE).
You MUST generate a highly personalized performance review based on the EXACT raw data below. 
Analyze the data and evaluate them immediately, matching the tone and EXACT structure of the provided examples.

Raw Data:
- Study Hours: ${hours}h
- Tasks: ${completedTasks?.length || 0} completed out of ${plannedTasks?.length || 0} planned.
- Uncompleted Tasks: ${uncompletedTaskNames.join(", ") || "None"}
- Sleep: ${sleep}h
- Screen Time: ${screenTime}h
- Questions Solved: ${questionsSolved}

Structure your response EXACTLY with these sections (no markdown bolding or asterisks):

Yesterday's raw report: Sleep ${sleep}h. Screen ${screenTime}h. You planned ${plannedTasks?.length > 0 ? uncompletedTaskNames.length > 0 ? uncompletedTaskNames.join(", ") + " but left it incomplete" : plannedTasks?.length + " tasks and executed them all" : "no specific tasks"}. You did ${hours}h of study.

Diagnosis: [Brutal, personalized analysis using the EXACT metrics provided above. If they skipped tasks, mention them by name. If they have a wound/weakest topic, tell them it is bleeding and they avoided it.]

Verdict: [Severity-aligned one sentence verdict in all caps, e.g. ELITE, CONSISTENT, OFF TRACK, TOTAL BREAKDOWN.]

Today's mission: [Specific, time-bound, actionable directive based on their exact data.]

Closing: [Goggins-style push. e.g. "The IIT paper doesn't care how you felt yesterday. Stay hard."]`;
    const generateWithTimeout = async (modelName) => {
      const timeoutPromise = new Promise(
        (_, reject) => setTimeout(() => reject(new Error("AI_TIMEOUT")), 4e3)
      );
      const apiPromise = ai.models.generateContent({
        model: modelName,
        contents: prompt
      });
      return Promise.race([apiPromise, timeoutPromise]);
    };
    let response;
    try {
      response = await generateWithTimeout("gemini-2.5-flash");
    } catch (e) {
      try {
        response = await generateWithTimeout("gemini-2.0-flash");
      } catch (e2) {
        throw e;
      }
    }
    if (response?.text) {
      return res.json({ feedback: response.text.trim() });
    }
    return res.json({ feedback: fallbackResponse });
  } catch (error) {
    const msg = error?.message || String(error);
    if (msg.includes("503") || msg.includes("UNAVAILABLE") || msg.includes("high demand") || msg.includes("API_KEY") || msg.includes("AI_TIMEOUT")) {
      console.log("[AI Coach Engine] Gemini API busy/unavailable. Using offline rule-engine fallback.");
    } else {
      console.log("[AI Coach Engine] Rule-engine fallback engaged.");
    }
    return res.json({ feedback: fallbackResponse });
  }
});
app.post("/api/dynamic-insight", async (req, res) => {
  const { hoursToday, streak, accuracy, questionsSolved, target, pendingTasksCount, recentTaskTypes } = req.body;
  let fallbackInsight = "Hours don't crack JEE. Output does. Hunt weaknesses and track problems solved.";
  const hrs = hoursToday || 0;
  const acc = accuracy || 0;
  const q = questionsSolved || 0;
  const tgt = target || 0;
  if (hrs < 2 && pendingTasksCount > 0) {
    fallbackInsight = `You didn't fail willpower; you failed environmental design. Phone in another room. Win the next 30 minutes.

\u{1F512} Lock: Motion beats stagnation. Break the pattern.`;
  } else if (hrs > 4 && q < 15) {
    fallbackInsight = `Reading theory is hiding from failure. Close the book. Give me one 25-minute problem sprint.

\u{1F512} Lock: Fake productivity alert. Chase friction.`;
  } else if (acc < 60 && q > 10) {
    fallbackInsight = `You are recognizing theory, not recalling concepts. Read less. Solve more.

\u{1F512} Lock: Your error rate is bleeding out gains. Accuracy > Speed today.`;
  } else if (q >= tgt && tgt > 0) {
    fallbackInsight = `Elite execution. You put up numbers today. Now drop it. The ego hangover will kill tomorrow's momentum.

\u{1F512} Lock: Targets hit. Acknowledge it, then drop it.`;
  } else if (streak >= 3) {
    fallbackInsight = `Discipline is boring replication. The top 100 ranks aren't built on motivation.

\u{1F512} Lock: Protect the ${streak}-day streak. Return fast.`;
  }
  if (!ai) {
    return res.json({ insight: fallbackInsight });
  }
  try {
    const prompt = `Act as a hardcore, ruthless David Goggins-style study coach for a highly competitive student. 
Give them ONE short, piercing insight (max 2 sentences) based on their live performance today, followed by a "\u{1F512} Lock:" statement giving a strict rule.
Their live data right now:
- Hours studied today: ${hrs}h
- Questions solved today: ${q} (Target: ${tgt})
- Accuracy: ${acc}%
- Current Streak: ${streak} days

Make it brutal and direct. If their questions are low but hours are high, scold them for fake work. If accuracy is low, scold them for rushing. If they are doing great, tell them to stay humble and not let ego ruin tomorrow.`;
    const generateWithTimeout = async (modelName) => {
      const timeoutPromise = new Promise(
        (_, reject) => setTimeout(() => reject(new Error("AI_TIMEOUT")), 3e3)
      );
      const apiPromise = ai.models.generateContent({
        model: modelName,
        contents: prompt
      });
      return Promise.race([apiPromise, timeoutPromise]);
    };
    let response;
    try {
      response = await generateWithTimeout("gemini-2.5-flash");
    } catch (e) {
      try {
        response = await generateWithTimeout("gemini-2.0-flash");
      } catch (e2) {
        throw e;
      }
    }
    if (response?.text) {
      return res.json({ insight: response.text.trim() });
    }
    return res.json({ insight: fallbackInsight });
  } catch (error) {
    const msg = error?.message || String(error);
    if (msg.includes("503") || msg.includes("UNAVAILABLE") || msg.includes("high demand") || msg.includes("API_KEY") || msg.includes("AI_TIMEOUT")) {
      console.log("[Dynamic Insight] Gemini API busy/unavailable. Using offline rule-engine fallback.");
    } else {
      console.log("[Dynamic Insight] Rule-engine fallback engaged.");
    }
    return res.json({ insight: fallbackInsight });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
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
