// src/lib/coach/reporting/tone.ts
/**
 * Goggins Intense Discipline Tone Engine with Safety Gate.
 * As defined in Audit Section 5.7:
 * - High intensity on actions and standards, ZERO labeling on character (no lazy, weak, soft).
 * - Redirects discipline to recovery on RED and AMBER tiers.
 * - Switches to neutral empathetic register on distress signals with professional notice.
 * - Deterministic variety via date & mission hash.
 */

import type { SleepTier, MissionId, ISODate } from "../types";

export const BANNED_PHRASES = [
  "lazy",
  "weak",
  "soft",
  "addict",
  "worthless",
  "loser",
  "pathetic",
  "shame",
  "failure as a person",
];

export function containsBannedPhrase(text: string): boolean {
  const lower = text.toLowerCase();
  return BANNED_PHRASES.some((bp) => lower.includes(bp));
}

function simpleHash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function formatMindsetAnchor(
  today: ISODate,
  missionId: MissionId,
  sleepTier: SleepTier,
  confidence: "HIGH" | "MEDIUM" | "LOW",
  distressSignal?: boolean,
): string {
  // Distress signal safety override
  if (distressSignal) {
    return "Prioritize your personal health and well-being. If study stress feels overwhelming, speak with a trusted adult, mentor, or professional counselor.";
  }

  // RED tier redirect
  if (sleepTier === "RED") {
    const redAnchors = [
      "Discipline today is shutting down on time. Tomorrow's focus is earned tonight.",
      "The body requires sleep to build neurons. Close the books. Shutdown is the standard.",
      "Pushing study on an empty tank produces garbage output. Bedtime is non-negotiable.",
    ];
    const idx = simpleHash(`${today}:${missionId}:RED`) % redAnchors.length;
    return redAnchors[idx];
  }

  // AMBER tier redirect
  if (sleepTier === "AMBER") {
    return "Execute your core baseline block with complete intensity, then protect your sleep window. No late-night overtime.";
  }

  // Low confidence notice
  if (confidence === "LOW") {
    return "Data is thin. Execute your session and log tonight so tomorrow's tactical read is razor sharp.";
  }

  // High intensity action anchors
  const intenseAnchors = [
    "No negotiating with the timer. Sit down, open the questions, and execute without hesitation.",
    "Theory feels safe. Problem solving exposes flaws. Put yourself on the line today.",
    "Consistency under friction is the only separator in JEE. Execute the plan.",
    "Do not wait for motivation. Motivation is fickle. Routine and execution build rank.",
  ];

  const idx = simpleHash(`${today}:${missionId}`) % intenseAnchors.length;
  return intenseAnchors[idx];
}
