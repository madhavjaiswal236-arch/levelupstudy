import { PlayHistoryEntry } from "@/context/AppContext";
import { StudentBaseline } from "./types";

export function computeBaseline(history: PlayHistoryEntry[]): StudentBaseline {
  const valid = history.filter((h) => !h.isMissed && typeof h.hoursStudied === "number" && !isNaN(h.hoursStudied));

  if (valid.length === 0) {
    return {
      avgHours: 3.5,
      avgSleep: 7.0,
      avgScreen: 3.0,
      avgQuestions: 20,
      avgCompletionRate: 0.8,
      dataPoints: 0,
      confidence: "NONE",
    };
  }

  const alpha = 0.2; // Exponential moving average weight for recent days
  let emaHours = valid[0].hoursStudied || 0;
  let emaSleep = valid[0].sleepTime || 7;
  let emaScreen = valid[0].screenTime || 3.5;
  let emaCompletionRate = 0.75;
  let totalQuestionsCount = 0;
  let daysWithQuestions = 0;

  for (let i = 0; i < valid.length; i++) {
    const h = valid[i];
    const hrs = Math.max(0, h.hoursStudied || 0);
    const slp = Math.max(0, h.sleepTime || 7);
    const scr = Math.max(0, h.screenTime || 3.5);

    const planned = h.plannedTasks?.length || 0;
    const completed = h.completedTasks?.length || 0;
    const rate = planned > 0 ? completed / planned : 0.8;

    if (i === 0) {
      emaHours = hrs;
      emaSleep = slp;
      emaScreen = scr;
      emaCompletionRate = rate;
    } else {
      emaHours = alpha * hrs + (1 - alpha) * emaHours;
      emaSleep = alpha * slp + (1 - alpha) * emaSleep;
      emaScreen = alpha * scr + (1 - alpha) * emaScreen;
      emaCompletionRate = alpha * rate + (1 - alpha) * emaCompletionRate;
    }

    if (typeof h.xpEarned === "number" && h.xpEarned > 0) {
      // Estimate questions from XP if question count isn't stored explicitly
      const approxQ = Math.round(h.xpEarned / 5);
      totalQuestionsCount += approxQ;
      daysWithQuestions++;
    }
  }

  const avgCompletionRate = emaCompletionRate;
  const avgQuestions = daysWithQuestions > 0 ? Math.round(totalQuestionsCount / daysWithQuestions) : Math.round(emaHours * 6);

  const confidence = valid.length >= 10 ? "HIGH" : valid.length >= 4 ? "MEDIUM" : "LOW";

  return {
    avgHours: Math.round(emaHours * 10) / 10,
    avgSleep: Math.round(emaSleep * 10) / 10,
    avgScreen: Math.round(emaScreen * 10) / 10,
    avgQuestions,
    avgCompletionRate: Math.round(avgCompletionRate * 100) / 100,
    dataPoints: valid.length,
    confidence,
  };
}
