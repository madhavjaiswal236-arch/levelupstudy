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
      "You didn't just miss your study targets; you completely surrendered. Your brain got ${sleep}h of sleep, only for you to squander ${screenTime}h staring at a screen while your commitment to IIT-JEE bled out on the floor. ${hours}h of study, ${questions} questions solved, zero discipline. You weren't even on the track yesterday — you have a gaping wound where your discipline should be.",
      "Total execution breakdown (${hours}h logged). You folded at the first sign of friction. Staring at screens for ${screenTime}h while your competitors solved hundreds of PYQs is cowardice. You either kill your excuses today or the exam will kill your dream.",
    ],

    // Recovery & Sleep Diagnoses
    BURNOUT_RISK: [
      "Dangerous overreach detected. You logged ${hours}h of study but sacrificed sleep down to ${sleep}h. Pushing high volume on depleted sleep is a recipe for cognitive collapse.",
      "Self-sabotage masked as hard work. Logging ${hours}h on only ${sleep}h of sleep produces rapid cognitive decay. You cannot sustain top-tier problem solving on empty tanks.",
      "High study duration (${hours}h) coupled with acute sleep deficit (${sleep}h) increases mistake rates and erodes retention. Recovery must match effort.",
      "Cognitive fatigue alert: ${hours}h logged on just ${sleep}h rest. Working through exhaustion yields diminishing returns.",
    ],
    SEVERE_SLEEP_DEFICIT: [
      "Severe sleep deprivation alert (${sleep}h logged). Sleep debt directly degrades working memory and accuracy. Rest is non-negotiable.",
      "You logged only ${sleep}h of sleep. Operating under chronic sleep debt creates artificial study friction and slow retention.",
      "Acute recovery failure: ${sleep}h of sleep recorded. Neural consolidation of concepts requires at least 7+ hours of quality rest.",
      "Critical sleep deficit (${sleep}h). Your brain cannot encode complex JEE problem patterns without adequate restorative sleep.",
    ],
    ACCUMULATED_DEBT: [
      "Accumulated sleep debt detected over recent days (averaging ${avgSleep}h vs 7.5h benchmark). Cognitive fatigue is compounding.",
      "Multi-day sleep deficit trend (average ${avgSleep}h). Chronic fatigue will silently degrade problem-solving speed and accuracy.",
      "Compounding recovery deficit: Recent sleep average (${avgSleep}h) is below sustainable baseline. Plan an early bedtime to restore neural sharpness.",
      "Sustained sleep compression (averaging ${avgSleep}h). Prevent mid-week burnout by restoring your sleep schedule tonight.",
    ],

    // Distraction & Screen Diagnoses
    HIGH_SCREEN: [
      "High screen time alert (${screenTime}h). Screen time consumed your peak mental energy, fragmenting focus and shortening deep work capacity.",
      "You logged ${screenTime}h of screen time today. High digital stimulation drains dopamine reserves and directly sabotages study focus.",
      "Screen distraction friction: ${screenTime}h of non-study screen time logged. Every hour of doomscrolling directly steals deep focus endurance.",
      "High digital friction (${screenTime}h). Elevated screen exposure fragments attention spans and makes deep problem-solving feel artificially difficult.",
    ],
    ESCALATING_SCREEN: [
      "Screen time has been escalating over recent days (currently ${screenTime}h). Distraction is quietly eroding study time.",
      "Upward screen time trajectory detected (${screenTime}h). Reclaim your prime daytime hours before distraction habits solidify.",
      "Rising digital distraction trend (current: ${screenTime}h). Eliminate background social media to protect deep work blocks.",
      "Screen time creeping up across recent days (${screenTime}h logged). Reinforce app limits to protect focus.",
    ],

    // Planning Diagnoses
    OVERPLANNING: [
      "Overplanning trap detected. You planned ${plannedCount} tasks but completed only ${completedCount} (a ${completionRate}% execution rate). Massive task lists breed paralysis.",
      "Workload friction alert: You set an unrealistically large task list (${plannedCount} tasks) and completed only ${completedCount}. Reduce task volume to increase execution velocity.",
      "Execution deficit: Only ${completedCount} of ${plannedCount} planned tasks completed (${completionRate}% rate). Aim for small, ruthless task lists with 100% completion.",
      "Scope overload: ${plannedCount} tasks planned vs ${completedCount} delivered. Prioritize the top 3 highest-yield milestones tomorrow.",
    ],

    // Practice & Subject Diagnoses
    THEORY_HEAVY: [
      "Passive study alert. You logged ${hours}h of study but attempted only ${questions} practice questions. Watching lectures without problem-solving creates a false sense of mastery.",
      "Theory-heavy day. Hours were logged, but active output was too low (${questions} questions solved). Passive consumption will not convert to test scores.",
      "Lecture imbalance detected: ${hours}h of study with only ${questions} questions solved. Shift the ratio towards active problem solving.",
      "Passive comprehension trap. High study time (${hours}h) but low question output (${questions}). Convert theory into speed by solving timed DPPs.",
    ],
    SUBJECT_AVOIDANCE: [
      "Subject avoidance detected: You spent minimal or zero time on ${neglectedSubject} today. Neglecting weak subjects creates critical exam vulnerabilities.",
      "Imbalanced study: ${neglectedSubject} was completely untouched today. Protect rank balance by forcing early exposure to neglected subjects.",
      "Subject neglect warning: No active work logged for ${neglectedSubject}. Rotate into ${neglectedSubject} first thing tomorrow to eliminate blindspots.",
      "Asymmetric preparation: Zero progress in ${neglectedSubject}. Consistency across all three subjects is non-negotiable for top percentile.",
    ],
    LOW_ACCURACY: [
      "Low practice accuracy warning: Practice accuracy dropped to ${accuracy}%. Speed without conceptual accuracy is counter-productive.",
      "Accuracy dip detected (${accuracy}%). Slow down, analyze fundamental mistakes, and prioritize precision over raw question volume.",
      "Precision alert: ${accuracy}% accuracy in problem-solving. Review solution steps carefully and log every recurring mistake.",
      "Accuracy friction (${accuracy}%). Pause rapid-fire solving and diagnose whether errors are calculation lapses or conceptual gaps.",
    ],
  },

  verdicts: {
    BREAKTHROUGH: [
      "VERDICT: DOMINANT EXECUTION. You set the bar today — now lock in recovery and repeat.",
      "VERDICT: BREAKTHROUGH PERFORMANCE. Clean momentum built.",
      "VERDICT: PEAK FOCUS. High volume and flawless execution achieved.",
    ],
    STRONG_DAY: [
      "VERDICT: SOLID WIN. Disciplined execution above baseline.",
      "VERDICT: STRONG PROGRESSION. Compound effort paying off.",
      "VERDICT: EXCELLENT MOMENTUM. Consistency locked in.",
    ],
    STABLE: [
      "VERDICT: BASELINE MAINTAINED. Consistent, but aim for progressive overload.",
      "VERDICT: HOLDING THE LINE. Push for higher intensity tomorrow.",
      "VERDICT: STEADY PROGRESS. Foundation solid; raise the target.",
    ],
    MILD_DECLINE: [
      "VERDICT: MINOR SLIP. Re-anchor to baseline discipline immediately.",
      "VERDICT: WARNING LIGHT. Do not allow one slip to become a multi-day slump.",
      "VERDICT: SLIGHT DIP. Realign with your daily checklist tomorrow.",
    ],
    SEVERE_DECLINE: [
      "VERDICT: SEVERE SLUMP. Execution fell dangerously low.",
      "VERDICT: OFF TRACK. Re-engage basic study routines immediately.",
      "VERDICT: DISCIPLINE LAPSE. Eliminate distractions and start fresh early.",
    ],
    TOTAL_COLLAPSE: [
      "VERDICT: TOTAL BREAKDOWN. Day surrendered to friction.",
      "VERDICT: CRITICAL FAILURE. Immediate reset required.",
      "VERDICT: ZERO TRACTION. Rebuild baseline with 1 simple win tomorrow.",
    ],
    BURNOUT_RISK: [
      "VERDICT: UNSUSTAINABLE OVERREACH. Sleep deprivation will destroy retention.",
      "VERDICT: OVERLOAD WARNING. Prioritize rest before memory consolidation fails.",
      "VERDICT: RECOVERY DEFICIT. High hours with low sleep leads to diminishing returns.",
    ],
    SEVERE_SLEEP_DEFICIT: [
      "VERDICT: SLEEP DEFICIT ALERT. Rest is a prerequisite for cognitive output.",
      "VERDICT: COGNITIVE DEBT. Sleep is non-negotiable for problem solving.",
      "VERDICT: BRAIN DRAIN. Protect your rest to restore peak mental speed.",
    ],
    HIGH_SCREEN: [
      "VERDICT: DISTRACTION DISPLACEMENT. Screen time stole deep work.",
      "VERDICT: DIGITAL LEAK. Eliminate screen distractions during study hours.",
      "VERDICT: ATTENTION DRAIN. Screen time fragmented prime focus.",
    ],
    ESCALATING_SCREEN: [
      "VERDICT: RISING DISTRACTION. Screen time is climbing; enforce strict limits.",
      "VERDICT: HABIT LEAK. Curtail phone usage before it derails your streak.",
    ],
    OVERPLANNING: [
      "VERDICT: AMBITION WITHOUT EXECUTION. Shrink task list, boost completion rate.",
      "VERDICT: TASK PARALYSIS. Plan less, execute completely.",
      "VERDICT: SCOPE OVERLOAD. Focus on 3 key tasks and finish every one.",
    ],
    THEORY_HEAVY: [
      "VERDICT: PASSIVE ILLUSION. Convert lecture hours into active problem solving.",
      "VERDICT: PRACTICE DEFICIT. Shift from passive watching to solving PYQs.",
      "VERDICT: ACTIVE RECALL NEEDED. Theory without problem solving will not convert.",
    ],
    SUBJECT_AVOIDANCE: [
      "VERDICT: SUBJECT AVOIDANCE. Exposure to ${neglectedSubject} is mandatory.",
      "VERDICT: BLINDSPOT RISK. Rebalance your study schedule with ${neglectedSubject}.",
      "VERDICT: RANK PROTECTION. Give priority time to ${neglectedSubject} tomorrow.",
    ],
    LOW_ACCURACY: [
      "VERDICT: PRECISION DIP. Slow down and eliminate silly calculation mistakes.",
      "VERDICT: ACCURACY ALERT. Focus on conceptual clarity over raw speed.",
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
    "The IIT paper doesn't give a damn about your excuses or your screen time. It only cares about the work. Stay hard.",
    "Nobody is coming to save your rank. Put your head down, eliminate the friction, and execute.",
    "Don't count the days, make the days count. Zero excuses tomorrow.",
    "Discipline equals freedom. Show up tomorrow and take what is yours.",
    "The difference between where you are and where you want to be is the work you're avoiding. Stay hard.",
  ],
};
