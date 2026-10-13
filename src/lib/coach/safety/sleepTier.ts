// src/lib/coach/safety/sleepTier.ts
/**
 * Single source of truth for Sleep Tiers and Debt calculation.
 * As defined in Audit Section 4.2 & 7.2.
 */

import type { ISODate, SleepTier } from "../types";

export interface Night {
  date: ISODate;
  hours: number | null;
} // last 7 calendar days, oldest first

export interface SleepEvaluation {
  tier: SleepTier;
  debt: number;
  loggedNights: number;
  partial: boolean;
}

export function calculateSleepTier(nights: Night[], target = 7.5): SleepEvaluation {
  const logged = nights.filter(
    (n): n is { date: ISODate; hours: number } => n.hours !== null && !isNaN(n.hours),
  );

  const last = nights.length ? nights[nights.length - 1].hours : null;

  // Sleep debt = sum over logged nights of max(0, target - sleep)
  const debt =
    Math.round(
      logged.reduce((s, n) => s + Math.max(0, target - n.hours), 0) * 10,
    ) / 10;

  // With fewer than 4 logged nights, debt is partial and debt rule is disabled
  const partial = logged.length < 4;

  const runBelow = (x: number, k: number) =>
    nights.length >= k &&
    nights.slice(-k).every((n) => n.hours !== null && !isNaN(n.hours) && n.hours < x);

  // RED: Last night < 5.5h; OR 7-day debt >= 8h (if not partial); OR 3 consecutive nights < 6.0h
  const red =
    (last !== null && last < 5.5) ||
    (!partial && debt >= 8) ||
    runBelow(6.0, 3);

  // AMBER: Last night 5.5-6.5h; OR 7-day debt 4 to <8h (if not partial); OR 2 consecutive nights < 6.5h
  const amber =
    !red &&
    ((last !== null && last < 6.5) ||
      (!partial && debt >= 4) ||
      runBelow(6.5, 2));

  const tier: SleepTier = red ? "RED" : amber ? "AMBER" : "GREEN";

  return { tier, debt, loggedNights: logged.length, partial };
}

// Derive lights-out time from next wake time and target sleep
export function computeLightsOutTime(wakeTime = "06:00", targetHours = 7.5): string {
  const [wH, wM] = wakeTime.split(":").map(Number);
  const totalWakeMins = wH * 60 + (wM || 0);
  const sleepMins = Math.round(targetHours * 60);
  let bedMins = totalWakeMins - sleepMins;
  if (bedMins < 0) bedMins += 24 * 60;

  const bedH = Math.floor(bedMins / 60);
  const bedM = bedMins % 60;
  return `${String(bedH).padStart(2, "0")}:${String(bedM).padStart(2, "0")}`;
}
