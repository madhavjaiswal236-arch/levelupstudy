export interface TemplatePool {
  diagnoses: Record<string, string[]>;
  verdicts: Record<string, string[]>;
  missions: Record<string, string[]>;
  closings: string[];
}

/**
 * High-accountability JEE coach copy.
 * Keep the language forceful, specific, and action-oriented without confusing
 * shame with discipline or exhaustion with toughness.
 * All ${...} tokens are placeholders expected by the existing renderer.
 */
export const TEMPLATES: TemplatePool = {
  diagnoses: {
    // Performance & trend diagnoses
    BREAKTHROUGH: [
      "Look at the numbers: ${hours}h today against your usual ${avgHours}h. That's not a lucky mood; that's evidence you can raise your standard and follow through. Don't turn one great day into a victory speech. Study what worked, protect your sleep, and build the next day on top of this one.",
      "Today, you pushed past your normal ${avgHours}h and put in ${hours}h. Remember this day for the decisions that produced it: when you started, how you handled distractions, and how quickly you returned after a difficult question. The job now is to repeat the process, not chase the feeling.",
      "This is the kind of day that changes your evidence about yourself. ${hours}h of study against a ${avgHours}h baseline. The old voice may say, 'I've earned an easy day tomorrow.' Catch that bargain before it starts. Recover properly, then show that today's performance can become a pattern.",
    ],
    STRONG_DAY: [
      "You put in ${hours}h against your ${avgHours}h baseline. That's a proper day's work. Take the win, but keep your eyes open: one strong day doesn't secure a rank. What matters now is whether you can show up tomorrow without needing today's excitement to carry you.",
      "The work showed up today: ${hours}h, above your usual ${avgHours}h. Don't waste the result by congratulating yourself all night or planning an impossible schedule for tomorrow. Record what worked, choose the next three priorities, and get back to it.",
    ],
    STABLE: [
      "You logged ${hours}h, right around your usual ${avgHours}h. You kept the engine running, and consistency matters—but be honest in the mirror: did those hours produce understanding, solved questions, and corrected mistakes? Hours are the receipt, not the whole result. Tomorrow, improve one part of the process.",
      "Today looks like your normal ${avgHours}h baseline: ${hours}h done. No disaster, no breakthrough. That's useful information. Don't demand a dramatic transformation overnight; find the one leak in the day and close it. Better starts, fewer phone checks, or more independent questions—pick the real problem and attack it.",
    ],
    MILD_DECLINE: [
      "You logged ${hours}h versus your usual ${avgHours}h. The gap isn't a verdict on who you are, but it is a signal you need to examine. Where did the time go? When did the first bargain begin—'five minutes more,' 'I'll start after this,' or 'I'll make it up tomorrow'? Name the moment, then design tomorrow so that same trap is harder to repeat.",
      "Today's output slipped to ${hours}h, below your ${avgHours}h baseline. Don't dramatize one imperfect day, and don't excuse it either. Look at the facts, identify the decision that cost you the most time, and correct that decision early tomorrow before the day gets away from you.",
    ],
    SEVERE_DECLINE: [
      "You logged ${hours}h against a usual ${avgHours}h. That's a serious drop, and pretending otherwise won't help you. But calling yourself useless won't recover the lost hours either. Find the first point where your plan broke, remove one source of friction, and rebuild tomorrow around a first study block you can actually start on time.",
      "The numbers show a sharp fall: ${hours}h today, well below your ${avgHours}h baseline. Somewhere between intention and action, the day slipped away. Don't hide behind a fresh timetable. Choose the first task, set the start time, put the phone out of reach, and earn the first hour before you negotiate with yourself again.",
    ],
    TOTAL_COLLAPSE: [
      "Time for the accountability mirror. ${hours}h studied, ${questions} questions attempted, ${screenTime}h on screens, and ${sleep}h of sleep. Read the numbers without editing the story. Today, your actions did not match the goal you say matters to you. That hurts to admit, but it gives us a starting point. Tomorrow is not a punishment marathon: it is a clean reset with one protected study block, a defined question target, and the phone out of reach.",
      "Today got away from you: ${hours}h of study while screen time reached ${screenTime}h. Your internal negotiator may already be making a deal—'I'll start properly tomorrow'—but tomorrow begins with the first decision you make, not a speech. Identify what pulled you off course, set a realistic first block, and finish it before entertainment. No self-insults. No excuses. Evidence through action.",
      "This was a poor execution day. Own that plainly. ${hours}h studied, ${questions} questions solved, and ${screenTime}h on screens. The JEE competition is real; other students are using their time to learn and practise. You cannot control their schedules, and imagining them working won't solve your backlog. You can control the next 60 minutes. Start there, then stack the next right decision on top of it.",
    ],

    // Recovery & sleep diagnoses
    BURNOUT_RISK: [
      "You logged ${hours}h of study but slept only ${sleep}h. Don't let the part of you that wants to prove toughness turn exhaustion into a badge. Serious preparation requires a brain that can remember, reason, and catch mistakes. Tonight, recovery is part of the contract. Tomorrow's work should be demanding and focused—not built on pretending you're a machine.",
      "${hours}h of study on ${sleep}h of sleep may look impressive on paper, but the question is what you actually retained and how accurately you can solve problems. The negotiator can trick you in either direction: it can tell you to quit at the first hard question, or tell you to keep grinding when your concentration is gone. Respond to the evidence. Protect sleep and return with a sharper plan.",
      "You're pushing study hours while sleep sits at ${sleep}h. This is the point to show judgment, not just stubbornness. A disciplined student protects the conditions that make learning work. Lower the load if needed, finish the essential task, and give recovery the same seriousness you give lectures and DPPs.",
    ],
    SEVERE_SLEEP_DEFICIT: [
      "You recorded ${sleep}h of sleep. That is not a challenge to brag about or a debt to keep borrowing against. Sleep affects attention, learning, and decision-making. Tonight, your mission is to restore a proper sleep window—not to prove you can survive another late-night marathon. Tomorrow's focus starts with tonight's decision.",
      "Look at the mirror honestly: ${sleep}h of sleep. If your plan depends on repeatedly cutting rest, the plan is broken. You do not build a reliable JEE performance by making every study session harder than it needs to be. Set a realistic stop time, prepare tomorrow's first task, and get the recovery your brain needs.",
      "Your sleep was only ${sleep}h. The tough choice is not always doing more; sometimes it's refusing the late-night bargain that steals tomorrow's concentration. Protect a full night of sleep, then return to the work with a clear head and a concrete target.",
    ],
    ACCUMULATED_DEBT: [
      "Your recent average is ${avgSleep}h of sleep. This is a pattern, not just one rough night. If you keep borrowing hours from recovery, the bill shows up in attention, patience, and avoidable errors. Stop treating sleep as spare time. Set a repeatable bedtime routine and rebuild a schedule you can sustain through the week.",
      "The trend matters: you're averaging ${avgSleep}h of sleep. Don't wait until every study block feels like pushing through wet cement before you change something. The mission is to stabilise recovery across several nights, not chase one perfect night and then repeat the same cycle.",
    ],

    // Distraction & screen diagnoses
    HIGH_SCREEN: [
      "${screenTime}h on screens. That's a number worth facing without excuses. When the phone keeps offering the next clip, your negotiator doesn't need to defeat your ambition; it only needs to delay the start by ten minutes, then ten more. Stop making the decision while the phone is in your hand. Put it in another room, start the first block, and let your actions answer the question of what matters today.",
      "Today's screen time reached ${screenTime}h. Don't hide behind 'I needed a break' if the break kept expanding and your work never restarted. Rest is deliberate; endless scrolling is a default. Put a clear boundary around entertainment, keep the device away during study, and make the next break something you choose after completing the task—not something that chooses for you.",
      "You cannot control every distraction that appears, but you can change how easy it is to follow it. ${screenTime}h on screens says your current setup needs stronger boundaries. Silence the notifications, move the phone, and begin with a small, specific task. Stop relying on willpower while the temptation sits beside your notebook.",
    ],
    ESCALATING_SCREEN: [
      "Your screen time is now ${screenTime}h, and the concern is the direction it's moving. Habits are built through repeated small permissions: one extra clip, one delayed start, one more check. Catch the pattern while it's still easier to change. Tomorrow, put the phone away before the first study block and track whether you start on time.",
      "The screen-time trend is climbing, currently at ${screenTime}h. This is your warning light—not a reason for a dramatic vow you'll forget by lunch. Add friction: log out, block the distracting app during study, and keep the phone physically away. Make the good decision easier than the bad one.",
    ],

    // Planning diagnoses
    OVERPLANNING: [
      "You planned ${plannedCount} tasks and completed ${completedCount}: ${completionRate}%. Look at the gap between the person who wrote the list and the person who had to execute it. A heroic timetable is easy to write at night. The real test is what you finish when the day gets difficult. Tomorrow, choose three high-value tasks, define what 'done' means, and finish them before adding more.",
      "${completedCount} out of ${plannedCount} tasks completed. The plan promised more than the day delivered, and making the next list even bigger won't fix that. Your negotiator loves an oversized plan because planning feels like progress without the discomfort of starting. Cut the list, begin with the hardest meaningful task, and earn the right to add anything else.",
      "Your completion rate was ${completionRate}% (${completedCount}/${plannedCount}). No more using an elaborate plan as proof that work is happening. Put the three outcomes that matter most at the top, break the first one into a clear starting action, and measure the day by completed work—not by how ambitious the schedule looked.",
    ],

    // Practice & subject diagnoses
    THEORY_HEAVY: [
      "You studied for ${hours}h but attempted only ${questions} questions. Be honest: did you test what you understood, or did the lecture simply feel familiar while the teacher was solving it? JEE eventually asks you to think without the teacher beside you. Close the video, attempt the problem yourself, stay with it long enough to make a real attempt, and then analyse the solution.",
      "${hours}h of study and ${questions} questions. The imbalance is the story today. Watching a solution can make a problem look obvious; producing the solution yourself is a different skill. Tomorrow, put a question block before more optional lecture time. Record the errors, revisit the concept behind them, and prove the learning on a fresh question.",
      "The hours are there, but active practice is low: ${questions} questions. Don't mistake familiarity for mastery. When a problem pushes back, that is not a signal to immediately open the solution. Write what you know, try a path, identify the exact point you're stuck, and only then use help strategically.",
    ],
    SUBJECT_AVOIDANCE: [
      "${neglectedSubject} received little or no attention today. That subject won't become less intimidating while you keep walking around it. Your mind will offer perfectly reasonable-sounding deals: 'I'll do it after I finish this chapter' or 'I'll start when I'm in the mood.' Put ${neglectedSubject} into the first serious block tomorrow, while the day is still yours to direct.",
      "You left ${neglectedSubject} untouched. Don't turn that into a permanent label about being bad at the subject. Treat it as a training gap. Start with one defined subtopic, attempt a few questions, mark exactly where understanding breaks, and use that evidence to guide the next session.",
      "The imbalance is clear: ${neglectedSubject} needs attention. A strong preparation plan doesn't let discomfort choose the timetable. Give this subject an early, protected block tomorrow. The target isn't instant mastery; it's honest contact with the material and measurable progress instead of another day of avoidance.",
    ],
    LOW_ACCURACY: [
      "Your practice accuracy is ${accuracy}%. Don't hide from that number, and don't respond by racing through even more questions. Accuracy is feedback. Separate conceptual gaps from calculation errors, rushed reading, and poor question selection. Then redo the missed questions without looking at the solution and explain why the correct method works.",
      "${accuracy}% accuracy means speed alone is not the answer right now. The job is not to protect your ego by counting every attempt as progress; the job is to find the pattern behind the misses. Review each error, name the cause, and solve a similar question to check whether the lesson actually stuck.",
      "The mirror says ${accuracy}% accuracy. Good—now you have something concrete to improve. Slow the process enough to see where it breaks. Was the concept missing, the algebra careless, the question misread, or the method inefficient? Make a short error log and turn today's mistakes into tomorrow's practice set.",
    ],
  },

  verdicts: {
    BREAKTHROUGH: [
      "VERDICT: YOU RAISED YOUR STANDARD. Now make the process repeatable; don't let one good day become an excuse to coast.",
      "VERDICT: REAL MOMENTUM. Record what worked, recover properly, and come back ready to do the work again.",
    ],
    STRONG_DAY: [
      "VERDICT: A DAY YOU CAN BUILD ON. Take the win, then return to the contract tomorrow.",
      "VERDICT: ABOVE YOUR BASELINE. Pride is fine; complacency is expensive. Keep the routine alive.",
    ],
    STABLE: [
      "VERDICT: YOU HELD YOUR GROUND. Now improve one part of the process instead of waiting for a more motivated mood.",
      "VERDICT: STEADY, NOT FINISHED. Keep the consistency and raise the quality of the next session.",
    ],
    MILD_DECLINE: [
      "VERDICT: SMALL SLIP, HONEST CORRECTION. Identify the leak and stop it from becoming tomorrow's pattern.",
      "VERDICT: WARNING, NOT A SENTENCE. Own the gap, reset the start, and get back to measurable work.",
    ],
    SEVERE_DECLINE: [
      "VERDICT: THE DAY FELL SHORT. No excuses, no self-pity—find the breakdown point and rebuild from the first block.",
      "VERDICT: RESET REQUIRED. Make tomorrow's first action obvious, small enough to start, and important enough to matter.",
    ],
    TOTAL_COLLAPSE: [
      "VERDICT: YOU DIDN'T EXECUTE THE PLAN. Face it clearly, learn from it, and prove the correction with the next block—not with another promise.",
      "VERDICT: THE NUMBERS DON'T MATCH THE GOAL. The day is over; the lesson isn't. Remove the biggest distraction and earn one clean win tomorrow.",
    ],
    BURNOUT_RISK: [
      "VERDICT: HARD WORK NEEDS RECOVERY. Don't confuse running yourself down with building discipline.",
      "VERDICT: PROTECT THE ENGINE. Sleep and focused work belong in the same plan; fix the imbalance before it compounds.",
    ],
    SEVERE_SLEEP_DEFICIT: [
      "VERDICT: RECOVERY FIRST. The disciplined move is to protect sleep now so tomorrow's work has a fair chance.",
      "VERDICT: STOP BORROWING FROM TOMORROW. Set a proper stop time and get the rest your learning needs.",
    ],
    ACCUMULATED_DEBT: [
      "VERDICT: THIS IS A TREND, NOT A BAD NIGHT. Stabilise the next few nights instead of repeating the same bargain.",
      "VERDICT: YOUR ROUTINE NEEDS REPAIR. Treat sleep as a fixed part of preparation, not leftover time.",
    ],
    HIGH_SCREEN: [
      "VERDICT: TOO MUCH TIME LEAKED AWAY. Change the environment before asking willpower to fight the same battle again.",
      "VERDICT: MAKE DISTRACTION HARDER TO REACH. Phone away, task defined, first block started.",
    ],
    ESCALATING_SCREEN: [
      "VERDICT: THE HABIT IS GROWING. Interrupt it now with a real boundary, not another vague promise.",
      "VERDICT: CATCH THE TREND EARLY. Reduce access to the distraction and measure whether your starts improve.",
    ],
    OVERPLANNING: [
      "VERDICT: THE PLAN WAS BIGGER THAN THE EXECUTION. Shrink the list and finish what matters.",
      "VERDICT: LESS PROMISING, MORE PROVING. Three clear priorities; completion before expansion.",
    ],
    THEORY_HEAVY: [
      "VERDICT: FAMILIARITY ISN'T MASTERY. Close the lecture and prove what you can solve alone.",
      "VERDICT: PRACTICE IS THE NEXT REP. Attempt first, check second, analyse every mistake.",
    ],
    SUBJECT_AVOIDANCE: [
      "VERDICT: THE WEAK SPOT NEEDS YOUR ATTENTION. Put ${neglectedSubject} first; don't wait for it to feel comfortable.",
      "VERDICT: STOP LETTING DISCOMFORT WRITE THE TIMETABLE. Give ${neglectedSubject} a protected block tomorrow.",
    ],
    LOW_ACCURACY: [
      "VERDICT: PRECISION BEFORE MORE VOLUME. Find the error pattern and prove you've corrected it.",
      "VERDICT: EVERY MISS MUST TEACH YOU SOMETHING. Review, categorise, redo, and test the lesson on a fresh problem.",
    ],
  },

  missions: {
    recovery: [
      "MISSION: Protect 7–8 hours of uninterrupted restorative sleep tonight (never drop below your 6h baseline). Set a realistic stop time, prepare tomorrow's first task, and don't trade recovery for a late-night performance you can't sustain.",
      "MISSION: Recovery contract. Finish only the essential work, set your study materials out for the morning, put the phone away, and give yourself a full 7–8h sleep window. No heroic all-nighter.",
    ],
    performance: [
      "MISSION: Target ${targetHours}h of focused study, adjusted for school, coaching, and available energy. Start with one protected 60–90 minute block on your hardest priority. Define the deliverable before you begin and keep the phone out of reach until the block is done.",
      "MISSION: Tomorrow is built one block at a time. Complete your first focused session before entertainment, then take a planned break and return for the next block. Track actual focus, not just time spent at the desk. Don't increase the target if recovery or accuracy is already deteriorating.",
    ],
    screen: [
      "MISSION: Before the first study block, put the phone in another room or use a blocker. No entertainment scrolling until the first defined task is complete. Record your screen time honestly tomorrow; the goal is to change the pattern, not just make a promise.",
      "MISSION: Make the distraction harder to reach. Turn off non-essential notifications, sign out of the app that captures you, and leave your phone away from the desk for two focused blocks. After the work, choose a bounded break deliberately instead of falling into an endless feed.",
    ],
    planning: [
      "MISSION: Choose three high-value tasks for tomorrow. Write what 'done' means for each one—specific lecture segment, problem set, or error review. Finish the first before adding tasks. Your scoreboard is completed work, not the length of the list.",
      "MISSION: Cut tomorrow's list to the essentials. Put the most avoided important task first, break it into a clear first action, and review completion at day's end. If something doesn't fit, reschedule it honestly instead of pretending every task will happen.",
    ],
    practice: [
      "MISSION: Complete a focused block of ${targetQuestions} questions at a level appropriate to your current chapter. Attempt each one before checking the solution, mark errors by cause, and redo the missed questions. If the target is too large for the available time, reduce it and do the review properly.",
      "MISSION: Set aside 60–90 minutes for timed DPP/PYQ practice. No passive watching during the block. Afterward, classify every miss as a concept gap, calculation error, misread, or strategy issue; your error log decides what you revise next.",
    ],
    subject: [
      "MISSION: Give ${neglectedSubject} the first protected study block tomorrow. Start with one subtopic, attempt a small set of questions, and mark exactly where you get stuck. You do not need to master the whole subject in one morning; you do need to stop leaving it untouched.",
      "MISSION: Complete a focused ${neglectedSubject} session and review the result. Choose a defined set of DPP/PYQ questions appropriate to your level, attempt them honestly, then correct the mistakes. Measure progress by what you understand better at the end—not by forcing an arbitrary number.",
    ],
  },

  closings: [
    "Your internal negotiator will be back tomorrow with another reasonable-sounding excuse. You don't need to win the whole week in one speech. You need to win the next decision. Put the phone away, open the work, and begin.",
    "The competition is real, but staring at imaginary competitors won't solve a single question. Use the pressure properly: one focused block, one honest attempt, one corrected mistake at a time.",
    "Motivation can show up or stay home. The plan still needs a start time. Keep the promise small enough to execute and important enough to respect.",
    "The mirror isn't there to insult you. It's there to remove the story and show you the facts. Read them, make the correction, and let tomorrow's actions speak.",
    "Mental toughness isn't pretending you're never tired or never frustrated. It's staying engaged with a difficult task, asking for help when you've made a real attempt, and returning after a setback without drama.",
    "Don't end tonight with another grand promise. Set out the book, choose the first question, decide the start time, and protect your sleep. Make tomorrow easier to begin and harder to derail.",
    "You don't need to feel fearless before you start. Start while the task is uncomfortable, work the problem honestly, and let confidence grow from evidence.",
    "A bad day is data, not your identity. Take the lesson without carrying the shame. Tomorrow, make the first right decision early and build from there.",
  ],
};
