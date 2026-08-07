import { Capacitor } from '@capacitor/core';

const API_BASE_URL = Capacitor.isNativePlatform() 
  ? 'https://ais-pre-2euhcrau4rvk3hkgfjrppb-413884331750.asia-southeast1.run.app' 
  : '';

export async function getAICoachFeedback(metrics: {
  hours: number;
  sleep: number;
  screenTime: number;
  completedTasksCount?: number;
  plannedTasksCount?: number;
  completedTasks?: any[];
  plannedTasks?: any[];
  practiceSessions?: any[];
  xpEarned: number;
  targetXp: number;
  level: number;
  streakDays: number;
  history?: any[];
}) {
 try {
 const res = await fetch(`${API_BASE_URL}/api/ai-coach`, {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 },
 body: JSON.stringify(metrics),
 });

 if (!res.ok) {
 console.warn(`API returned status ${res.status}`);
 return generateStaticFeedback(metrics);
 }

 const data = await res.json();
 return data.feedback || generateStaticFeedback(metrics);
 } catch (err: any) {
 if (String(err).includes("Failed to fetch")) {
 console.warn("AI Coach Client: Server unavailable, using static fallback.");
 } else {
 console.warn("AI Coach Client Warning:", err?.message || err);
 }
 return generateStaticFeedback(metrics);
 }
}

export async function getDynamicInsight(metrics: {
  hoursToday: number,
  streak: number,
  questionsSolved: number,
  target: number,
  accuracy: number,
  pendingTasksCount: number,
  recentTaskTypes: string
}) {
  const staticFallback = getStaticDynamicInsight(metrics);
  try {
    const res = await fetch(`${API_BASE_URL}/api/dynamic-insight`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metrics),
    });

    if (!res.ok) {
      return staticFallback;
    }

    const data = await res.json();
    return data.insight || staticFallback;
  } catch (err: any) {
    return staticFallback;
  }
}

export function getStaticDynamicInsight(metrics: {
  hoursToday: number,
  streak: number,
  questionsSolved: number,
  target: number,
  accuracy: number,
  pendingTasksCount: number,
  recentTaskTypes: string
}) {
  const hrs = metrics.hoursToday || 0;
  const acc = metrics.accuracy || 0;
  const q = metrics.questionsSolved || 0;
  const tgt = metrics.target || 0;
  const streak = metrics.streak || 0;

  if (hrs < 2 && metrics.pendingTasksCount > 0) {
    return `You didn't fail willpower; you failed environmental design. Phone in another room. Win the next 30 minutes.\n\n🔒 Lock: Motion beats stagnation. Break the pattern.`;
  } else if (hrs > 4 && q < 15) {
    return `Reading theory is hiding from failure. Close the book. Give me one 25-minute problem sprint.\n\n🔒 Lock: Fake productivity alert. Chase friction.`;
  } else if (acc < 60 && q > 10) {
    return `You are recognizing theory, not recalling concepts. Read less. Solve more.\n\n🔒 Lock: Your error rate is bleeding out gains. Accuracy > Speed today.`;
  } else if (q >= tgt && tgt > 0) {
    return `Elite execution. You put up numbers today. Now drop it. The ego hangover will kill tomorrow's momentum.\n\n🔒 Lock: Targets hit. Acknowledge it, then drop it.`;
  } else if (streak >= 3) {
    return `Discipline is boring replication. The top 100 ranks aren't built on motivation.\n\n🔒 Lock: Protect the ${streak}-day streak. Return fast.`;
  }
  return "Hours don't crack JEE. Output does. Hunt weaknesses and track problems solved.\n\n🔒 Lock: Focus on execution.";
}

export function generateStaticFeedback(data: any) {
  const { hours = 0, sleep = 0, screenTime = 0, completedTasks = [], plannedTasks = [], practiceSessions = [], xpEarned = 0, targetXp = 1000, history = [] } = data;
  
  let uncompletedTaskNames = [];
  if (plannedTasks && Array.isArray(plannedTasks)) {
    const completedIds = (completedTasks || []).map((t: any) => t.id);
    uncompletedTaskNames = plannedTasks.filter(t => !completedIds.includes(t.id)).map(t => t.text);
  }

  let questionsSolved = 0;
  if (practiceSessions && Array.isArray(practiceSessions)) {
    questionsSolved = practiceSessions.reduce((sum: number, s: any) => sum + (s.attempted || 0), 0);
  }

  let report = `Yesterday’s raw report: Sleep ${sleep}h. Screen ${screenTime}h. `;
  if (plannedTasks.length > 0) {
    if (uncompletedTaskNames.length === 0) {
      report += `You planned ${plannedTasks.length} tasks and executed them all. `;
    } else {
      report += `You planned ${uncompletedTaskNames.join(', ')} but left it incomplete. `;
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
    mission = `No heroics today. Cap study at 6 hours of quality work only. Sleep 7.5+ hours tonight—non-negotiable.`;
    closing = "Even warriors sharpen their swords. Stop swinging a blunt blade. Stay hard.";
  } else if (hours >= 8 && questionsSolved < 15 && hours > 0) {
    diagnosis = `Fake work. You logged ${hours}h, but output is too low. That's not learning; that's mental jogging. Passive reading is a sedative dressed as effort.`;
    verdict = "FAKE WORK. Hours without output is vanity.";
    mission = "Zero passive theory today. You will do timed DPPs only. Every wrong answer gets re-solved until it’s automatic.";
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
    diagnosis = `Zero output. You fried your dopamine with ${screenTime}h of screen time and walked away from the ring before it even started. That’s a surrender.`;
    if (uncompletedTaskNames.length > 0) {
       diagnosis += ` Your repeated ${uncompletedTaskNames[0]} mistakes are festering. Another day of zero progress on the one leak that’s been bleeding.`;
    }
    verdict = "TOTAL BREAKDOWN. This is a total collapse. You're building a pattern of surrender.";
    mission = `Phone locked outside until 10 AM. You will complete exactly one 30-minute DPP. That’s it. Break the inertia.`;
    closing = "The mirror is the only enemy. Go prove you can come back. Stay hard.";
  } else if (hours < 2) {
    diagnosis = `Only ${hours}h logged. You never even stepped into the arena today. You let overwhelm hijack your day.`;
    verdict = "SURRENDER. Guilt is a trap; action is the antidote. Motion beats stagnation.";
    mission = "One lecture + 10 practice questions tomorrow. Phone in another room for the first 30 minutes. That’s it. Prove you can still start.";
    closing = "One small win tomorrow is the first brick in rebuilding your discipline. Stay hard.";
  } else {
    diagnosis = `${hours} hours of study is your baseline. It’s steady, but don’t confuse comfort with progress.`;
    verdict = "PLATEAU ALERT. You’re not regressing, but you’re not growing either.";
    mission = "Progressive overload: add one 90-minute deep-work block to your routine. Track problems completed, not hours.";
  }

  return `${report}\n\nDiagnosis: ${diagnosis}\n\nVerdict: ${verdict}\n\nToday's mission: ${mission}\n\nClosing: ${closing}`;
}
