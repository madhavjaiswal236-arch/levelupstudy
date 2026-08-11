export interface TemplatePool {
  diagnoses: Record<string, string[]>;
  verdicts: Record<string, string[]>;
  missions: Record<string, string[]>;
  closings: string[];
}

export const TEMPLATES: TemplatePool = {
  diagnoses: {
    // Performance & Trend Diagnoses
    BREAKTHROUGH: [
      "Outstanding session. You logged ${hours}h of focused study against your baseline of ${avgHours}h. You're executing well above average with clear momentum.",
      "A breakthrough day. Logging ${hours}h of deep work represents a sharp upward shift from your baseline of ${avgHours}h. Execution was high-volume and high-clarity.",
    ],
    STRONG_DAY: [
      "Solid execution. You logged ${hours}h of study today, outperforming your baseline of ${avgHours}h. Your discipline is steadily compound-building.",
      "A clean win today. You posted ${hours}h compared to your usual ${avgHours}h baseline. Workload execution was structured and focused.",
    ],
    STABLE: [
      "Steady baseline performance. You logged ${hours}h of study today against your baseline of ${avgHours}h. Consistent, but keep pushing for progressive overload.",
      "Work executed right at your baseline of ${avgHours}h. You maintained position today. The goal now is to incrementally stretch deep work capacity.",
    ],
    MILD_DECLINE: [
      "Output dropped slightly today to ${hours}h, below your average baseline of ${avgHours}h. This is an isolated dip, but monitor execution to avoid a multi-day slide.",
      "You logged ${hours}h today versus your baseline of ${avgHours}h. Not a complete collapse, but a minor regression in execution pace.",
    ],
    SEVERE_DECLINE: [
      "Significant execution drop. You logged only ${hours}h today compared to your personal baseline of ${avgHours}h. Output fell off sharply.",
      "Your study time contracted to ${hours}h today, down significantly from your ${avgHours}h benchmark. The day was severely under-executed.",
    ],
    TOTAL_COLLAPSE: [
      "Near-zero execution today (${hours}h logged). This is a total breakdown in study routine. You allowed friction or distraction to derail the day entirely.",
      "Critical execution failure with only ${hours}h logged. Your day ended in surrender. Re-establishing baseline discipline must happen immediately tomorrow.",
    ],

    // Recovery & Sleep Diagnoses
    BURNOUT_RISK: [
      "Dangerous overreach detected. You logged ${hours}h of study but sacrificed sleep down to ${sleep}h. Pushing high volume on depleted sleep is a recipe for cognitive collapse.",
      "Self-sabotage masked as hard work. Logging ${hours}h on only ${sleep}h of sleep produces rapid cognitive decay. You cannot sustain top-tier problem solving on empty tanks.",
    ],
    SEVERE_SLEEP_DEFICIT: [
      "Severe sleep deprivation alert (${sleep}h logged). Sleep debt directly degrades working memory and accuracy. Rest is non-negotiable.",
      "You logged only ${sleep}h of sleep. Operating under chronic sleep debt creates artificial study friction and slow retention.",
    ],
    ACCUMULATED_DEBT: [
      "Accumulated sleep debt detected over recent days (averaging ${avgSleep}h vs 7.5h benchmark). Cognitive fatigue is compounding.",
    ],

    // Distraction & Screen Diagnoses
    HIGH_SCREEN: [
      "High screen time alert (${screenTime}h). Screen time consumed your peak mental energy, fragmenting focus and shortening deep work capacity.",
      "You logged ${screenTime}h of screen time today. High digital stimulation drains dopamine reserves and directly sabotages study focus.",
    ],
    ESCALATING_SCREEN: [
      "Screen time has been escalating over recent days (currently ${screenTime}h). Distraction is quietly eroding study time.",
    ],

    // Planning Diagnoses
    OVERPLANNING: [
      "Overplanning trap detected. You planned ${plannedCount} tasks but completed only ${completedCount} (a ${completionRate}% execution rate). Massive task lists breed paralysis.",
      "Workload friction alert: You set an unrealistically large task list (${plannedCount} tasks) and completed only ${completedCount}. Reduce task volume to increase execution velocity.",
    ],

    // Practice & Subject Diagnoses
    THEORY_HEAVY: [
      "Passive study alert. You logged ${hours}h of study but attempted only ${questions} practice questions. Watching lectures without problem-solving creates a false sense of mastery.",
      "Theory-heavy day. Hours were logged, but active output was too low (${questions} questions solved). Passive consumption will not convert to test scores.",
    ],
    SUBJECT_AVOIDANCE: [
      "Subject avoidance detected: You spent minimal or zero time on ${neglectedSubject} today. Neglecting weak subjects creates critical exam vulnerabilities.",
      "Imbalanced study: ${neglectedSubject} was completely untouched today. Protect rank balance by forcing early exposure to neglected subjects.",
    ],
    LOW_ACCURACY: [
      "Low practice accuracy warning: Practice accuracy dropped to ${accuracy}%. Speed without conceptual accuracy is counter-productive.",
    ],
  },

  verdicts: {
    BREAKTHROUGH: [
      "VERDICT: DOMINANT EXECUTION. You set the bar today — now lock in recovery and repeat.",
      "VERDICT: BREAKTHROUGH PERFORMANCE. Clean momentum built.",
    ],
    STRONG_DAY: [
      "VERDICT: SOLID WIN. Disciplined execution above baseline.",
      "VERDICT: STRONG PROGRESSION. Compound effort paying off.",
    ],
    STABLE: [
      "VERDICT: BASELINE MAINTAINED. Consistent, but aim for progressive overload.",
      "VERDICT: HOLDING THE LINE. Push for higher intensity tomorrow.",
    ],
    MILD_DECLINE: [
      "VERDICT: MINOR SLIP. Re-anchor to baseline discipline immediately.",
      "VERDICT: WARNING LIGHT. Do not allow one slip to become a multi-day slump.",
    ],
    SEVERE_DECLINE: [
      "VERDICT: SEVERE SLUMP. Execution fell dangerously low.",
      "VERDICT: OFF TRACK. Re-engage basic study routines immediately.",
    ],
    TOTAL_COLLAPSE: [
      "VERDICT: TOTAL BREAKDOWN. Day surrendered to friction.",
      "VERDICT: CRITICAL FAILURE. Immediate reset required.",
    ],
    BURNOUT_RISK: [
      "VERDICT: UNSUSTAINABLE OVERREACH. Sleep deprivation will destroy retention.",
    ],
    SEVERE_SLEEP_DEFICIT: [
      "VERDICT: SLEEP DEFICIT ALERT. Rest is a prerequisite for cognitive output.",
    ],
    HIGH_SCREEN: [
      "VERDICT: DISTRACTION DISPLACEMENT. Screen time stole deep work.",
    ],
    OVERPLANNING: [
      "VERDICT: AMBITION WITHOUT EXECUTION. Shrink task list, boost completion rate.",
    ],
    THEORY_HEAVY: [
      "VERDICT: PASSIVE ILLUSION. Convert lecture hours into active problem solving.",
    ],
    SUBJECT_AVOIDANCE: [
      "VERDICT: SUBJECT AVOIDANCE. Exposure to ${neglectedSubject} is mandatory.",
    ],
  },

  missions: {
    recovery: [
      "MISSION: Mandatory sleep target of 7.5+ hours tonight. Cap total study at ${targetHours}h and prioritize high-quality rest.",
      "MISSION: Lights out by 10:30 PM. No late-night marathons. Protect your cognitive engine.",
    ],
    performance: [
      "MISSION: Target ${targetHours}h of deep work tomorrow. Complete your hardest 90-minute study block in the first 3 hours of the day.",
      "MISSION: Re-establish benchmark execution. Lock in 2 uninterrupted 90-minute deep-work sessions before mid-day.",
    ],
    screen: [
      "MISSION: Put phone in another room during study blocks. Cap total screen time under 2.5h tomorrow.",
      "MISSION: Zero entertainment screens before completing your first 3 hours of study.",
    ],
    planning: [
      "MISSION: Tomorrow, set maximum 3 high-priority tasks. Finish all 3 before adding anything else.",
      "MISSION: Cut your planned task list in half. Focus on 100% completion rate over task volume.",
    ],
    practice: [
      "MISSION: Solved target: Minimum ${targetQuestions} practice questions tomorrow before watching any lectures.",
      "MISSION: 90 minutes of timed DPP/PYQ practice in your weakest chapter before noon.",
    ],
    subject: [
      "MISSION: First 90 minutes tomorrow strictly dedicated to ${neglectedSubject}. No exceptions.",
      "MISSION: Solve at least 25 PYQs/DPPs in ${neglectedSubject} tomorrow morning.",
    ],
  },

  closings: [
    "Disciplined execution compounds over time. Show up tomorrow.",
    "Consistency is built day by day. Reset and execute.",
    "Small daily wins compound into massive results. Stay focused.",
    "Focus on the process. Execution speaks louder than intention.",
    "No excuses. Protect your routine and execute.",
  ],
};
