import rateLimit from 'express-rate-limit';
import express from 'express';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { generateDeterministicCoachReport, generateDeterministicDynamicInsight } from './src/lib/coach/engine';

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Middleware to parse requests
app.use(express.json());
    
// Add CORS
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const configuredOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()) 
    : [];
  const defaultAllowedOrigins = [
    'http://localhost:3000', 
    'capacitor://localhost', 
    'http://localhost',
    'https://localhost'
  ];
  const allowedOrigins = [...defaultAllowedOrigins, ...configuredOrigins];

  if (origin) {
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production' || origin.endsWith('.vercel.app') || origin.endsWith('.run.app')) {
      res.header('Access-Control-Allow-Origin', origin);
    } else {
      return res.status(403).json({ error: 'CORS policy: Origin forbidden' });
    }
  } else {
    // Non-browser or same-origin requests
    if (process.env.NODE_ENV === 'production' && req.headers['x-requested-with'] === 'XMLHttpRequest') {
      return res.status(403).json({ error: 'CORS policy: Missing Origin header' });
    }
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Helper to sanitize text inputs for AI prompts
function sanitizePromptText(text: string): string {
  if (typeof text !== 'string') return '';
  return text
    .replace(/[^\w\s\-\.\,\?\!\:\;]/gi, ' ')
    .slice(0, 100)
    .trim();
}

function sanitizeNumber(val: any, min: number = 0, max: number = 100000): number {
  const num = Number(val);
  if (isNaN(num)) return min;
  return Math.max(min, Math.min(max, num));
}

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
  validate: { xForwardedForHeader: false, trustProxy: false, default: false }
});

app.use('/api/', apiLimiter);

// Initialize the Gemini AI client
const geminiApiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (geminiApiKey && typeof geminiApiKey === 'string' && geminiApiKey.trim().length > 0) {
  try {
    ai = new GoogleGenAI({ apiKey: geminiApiKey });
  } catch (e) {
    console.error("Failed to initialize GoogleGenAI");
  }
}

function generateFeedbackEngine(data: any) {
  const report = generateDeterministicCoachReport(data);
  return report.fullFormattedText;
}

// API router - AI Coach
app.post('/api/ai-coach', async (req, res) => {
  const data = req.body || {};
  const hours = sanitizeNumber(data.hours, 0, 24);
  const sleep = sanitizeNumber(data.sleep, 0, 24);
  const screenTime = sanitizeNumber(data.screenTime, 0, 24);
  const { completedTasks, plannedTasks, practiceSessions, xpEarned, targetXp, level, streakDays, history } = data;

  const fallbackResponse = generateFeedbackEngine({
    ...data,
    hours,
    sleep,
    screenTime,
  });

  if (!ai) {
    console.warn("GEMINI_API_KEY is not defined. Using pure logic engine.");
    return res.json({ feedback: fallbackResponse });
  }

  try {
    let questionsSolved = 0;
    if (practiceSessions && Array.isArray(practiceSessions)) {
      questionsSolved = practiceSessions.reduce((sum: number, s: any) => sum + (s.attempted || 0), 0);
    }
    
    let uncompletedTaskNames = [];
    if (plannedTasks && Array.isArray(plannedTasks)) {
      const completedIds = (completedTasks || []).map((t: any) => t.id);
      uncompletedTaskNames = plannedTasks
        .filter(t => !completedIds.includes(t.id))
        .map(t => sanitizePromptText(t.text))
        .filter(Boolean);
    }

    const prompt = `You are the LevelUp Study AI Engine, a hardcore, ruthless, David Goggins-style coach for a competitive exam student (like IIT-JEE).
You MUST generate a highly personalized performance review based on the EXACT raw data below. 
Analyze the data and evaluate them immediately, matching the tone and EXACT structure of the provided examples.

Raw Data:
- Study Hours: ${hours}h
- Tasks: ${completedTasks?.length || 0} completed out of ${plannedTasks?.length || 0} planned.
- Uncompleted Tasks: ${uncompletedTaskNames.join(', ') || 'None'}
- Sleep: ${sleep}h
- Screen Time: ${screenTime}h
- Questions Solved: ${questionsSolved}

Structure your response EXACTLY with these sections (no markdown bolding or asterisks):

Yesterday's raw report: Sleep ${sleep}h. Screen ${screenTime}h. You planned ${plannedTasks?.length > 0 ? (uncompletedTaskNames.length > 0 ? uncompletedTaskNames.join(', ') + ' but left it incomplete' : plannedTasks?.length + ' tasks and executed them all') : 'no specific tasks'}. You did ${hours}h of study.

Diagnosis: [Brutal, personalized analysis using the EXACT metrics provided above. If they skipped tasks, mention them by name. If they have a wound/weakest topic, tell them it is bleeding and they avoided it.]

Verdict: [Severity-aligned one sentence verdict in all caps, e.g. ELITE, CONSISTENT, OFF TRACK, TOTAL BREAKDOWN.]

Today's mission: [Specific, time-bound, actionable directive based on their exact data.]

Closing: [Goggins-style push. e.g. "The IIT paper doesn't care how you felt yesterday. Stay hard."]`;

    const generateWithTimeout = async (modelName: string) => {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("AI_TIMEOUT")), 12000)
      );
      const apiPromise = ai.models.generateContent({
        model: modelName,
        contents: prompt,
      });
      return Promise.race([apiPromise, timeoutPromise]) as Promise<any>;
    };

    let response;
    try {
      response = await generateWithTimeout('gemini-2.5-flash');
    } catch (e: any) {
      // Secondary fallback attempt with flash 2.0 or immediate static rule engine
      try {
        response = await generateWithTimeout('gemini-2.0-flash');
      } catch (e2) {
        throw e;
      }
    }
    
    if (response?.text) {
      return res.json({ feedback: response.text.trim() });
    }
    return res.json({ feedback: fallbackResponse });
  } catch (error: any) {
    const msg = error?.message || String(error);
    if (msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('high demand') || msg.includes('API_KEY') || msg.includes('AI_TIMEOUT')) {
      console.log("[AI Coach Engine] Gemini API busy/unavailable. Using offline rule-engine fallback.");
    } else {
      console.log("[AI Coach Engine] Rule-engine fallback engaged.");
    }
    return res.json({ feedback: fallbackResponse });
  }
});

app.post("/api/dynamic-insight", async (req, res) => {
  const body = req.body || {};
  const hrs = sanitizeNumber(body.hoursToday, 0, 24);
  const streak = sanitizeNumber(body.streak, 0, 3650);
  const acc = sanitizeNumber(body.accuracy, 0, 100);
  const q = sanitizeNumber(body.questionsSolved, 0, 10000);
  const tgt = sanitizeNumber(body.target, 0, 10000);
  const pendingTasksCount = sanitizeNumber(body.pendingTasksCount, 0, 1000);

  const fallbackInsight = generateDeterministicDynamicInsight({
    hoursToday: hrs,
    streak,
    accuracy: acc,
    questionsSolved: q,
    target: tgt,
    pendingTasksCount
  });

  if (!ai) {
    return res.json({ insight: fallbackInsight });
  }

  try {
    const prompt = `Act as a hardcore, ruthless David Goggins-style study coach for a highly competitive student. 
Give them ONE short, piercing insight (max 2 sentences) based on their live performance today, followed by a "🔒 Lock:" statement giving a strict rule.
Their live data right now:
- Hours studied today: ${hrs}h
- Questions solved today: ${q} (Target: ${tgt})
- Accuracy: ${acc}%
- Current Streak: ${streak} days

Make it brutal and direct. If their questions are low but hours are high, scold them for fake work. If accuracy is low, scold them for rushing. If they are doing great, tell them to stay humble and not let ego ruin tomorrow.`;

    const generateWithTimeout = async (modelName: string) => {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("AI_TIMEOUT")), 12000)
      );
      const apiPromise = ai.models.generateContent({
        model: modelName,
        contents: prompt,
      });
      return Promise.race([apiPromise, timeoutPromise]) as Promise<any>;
    };

    let response;
    try {
      response = await generateWithTimeout('gemini-2.5-flash');
    } catch (e) {
      try {
        response = await generateWithTimeout('gemini-2.0-flash');
      } catch (e2) {
        throw e;
      }
    }
    
    if (response?.text) {
      return res.json({ insight: response.text.trim() });
    }
    return res.json({ insight: fallbackInsight });
  } catch (error: any) {
    const msg = error?.message || String(error);
    if (msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('high demand') || msg.includes('API_KEY') || msg.includes('AI_TIMEOUT')) {
      console.log("[Dynamic Insight] Gemini API busy/unavailable. Using offline rule-engine fallback.");
    } else {
      console.log("[Dynamic Insight] Rule-engine fallback engaged.");
    }
    return res.json({ insight: fallbackInsight });
  }
});

async function startServer() {
  // Vite development middleware vs Static file server
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();

export default app;
