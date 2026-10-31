# Unified New-User Onboarding & First-Launch Experience Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permanently resolve the critical bug where fresh installs/new users are treated as inactive returning users (prompting for yesterday's sleep, broken consistency skulls, and harsh AI mentor critiques), and replace the 6 clashing legacy setup popups with a unified, minimalist, liquid-glass onboarding wizard that seamlessly personalizes the entire app for Class 11, Class 12, Droppers, JEE, and future NEET integration.

**Architecture:** 
1. Introduce a single source of truth `isNewUser` gate in `AppContext.tsx` and `App.tsx` that completely short-circuits daily rollover, absence gap detection, and morning retrospective flows on first launch.
2. Unify 6 conflicting legacy modals (`showNameModal`, `hasSeenRules`, `isClass11SetupDone`, `OnboardingIntake`, `TimeBar/days_left`, and `rolloverStep/metrics`) into one streamlined 3-step `CadetOnboardingWizard.tsx` with progressive disclosure.
3. Establish a future-proof student profile schema supporting Class 11/12/Dropper and JEE/NEET tracks, with automated derivation of schedule capacity, XP goals, and circadian anchors.
4. Clean up confirmed dead and junk files (`public/assets/aistudio` leaks and unrouted components).

**Tech Stack:** React 19, TypeScript, Framer Motion, Tailwind CSS (Liquid Glass Design System), Lucide Icons, Vitest.

---

## 1. Data Classification Matrix

### Category A: What We REALLY Need From The User (Essential Zero-Fluff Inputs)
These are subjective choices that cannot be known or guessed without user input:
1. **Cadet Codename / Name** (`playerName`): Personalized identity across all dashboards, rival battles, and reports.
2. **Academic Stage / Target Cohort** (`academicStage`):
   - `CLASS_11` (Foundation building, long timeline)
   - `CLASS_12` (Board exam + competitive syllabus synchronization)
   - `DROPPER` (High-intensity full-time self-study)
3. **Target Competitive Exam** (`targetExam` - *Future-proofed*):
   - `JEE_MAINS_ADVANCED` (Physics, Chemistry, Mathematics - active default)
   - `NEET_UG` (Physics, Chemistry, Biology - ready for expansion)
4. **Target Exam Year** (`targetYear`):
   - `2025`, `2026`, `2027` (Used to anchor countdown and total syllabus velocity).
5. **Weekly Schedule Archetype** (`scheduleArchetype`):
   - **Regular School + Coaching**: Mon–Fri School, Weekend Coaching (~4h weekday study, ~8h weekend).
   - **Dummy School / Coaching Dominant**: Weekday coaching (~6h study daily).
   - **Self-Study / Online Dropper**: Full study days every day (~8–10h capacity).
6. **Academic Debt State** (`hasExistingBacklog`):
   - `FRESH_START`: Starting on track; 0 backlog tasks injected.
   - `HAS_BACKLOG`: Opens Tracker 360 recovery setup.

---

### Category B: What The App Automatically Infers (NEVER Ask The User)
Asking for these generates unnecessary friction and breaks immersion:
- **Device Date, Timezone & Logical Day Boundary**: Auto-detected via `getLogicalDate()` and system clock past 3:00 AM shift.
- **Total XP Target Goal**: Automatically computed from target date: $\text{Days Remaining} \times 8\text{ hrs} \times 300\text{ XP/hr}$.
- **Daily Capacity & Study Block Times**: Inferred directly from the selected Schedule Archetype (`getExpectedCapacityHours(dayType)`).
- **Bedtime & Lights-Out Schedule**: Mathematically derived via `computeLightsOutTime(wakeTime, targetSleepHours)`.
- **Initial Streak**: Defaults to `0`, increments to `1` upon completing the first daily task.
- **Initial Mastery & Retention**: Set to clean neutral prior ($pL = 0.1$) across all chapters in `syllabusData.ts`.
- **Syllabus Subject Sets**: Auto-loaded based on chosen exam (PCM for JEE, PCB for NEET).

---

### Category C: What Data Is ODD or Harmful to Ask Upfront (Strictly Banned on Day 1)
- **Yesterday's Sleep Hours & Screen Time**: A user who just opened the app has no yesterday record in the system.
- **Reasons for Past Absence / Missed Days**: Accusing a new user of having unaccounted missed days before they've even touched the app.
- **Raw Numerical XP Goals**: Asking a student if they want "800,000 XP" or "50,000 XP" when they don't understand the app's XP economy.
- **Manual 7-Day Day-Type Configuration**: Asking 7 separate dropdown questions for Sunday through Saturday on initial install.
- **Cognitive Confidence Ratings**: Probing "Are you overconfident?" during initial boot causes decision fatigue and defensiveness.

---

### Category D: Future-Proofed Extensible Fields (Architecture Ready)
Fields to embed in `StudentScheduleProfile` and `AppContext` without breaking existing state:
```typescript
export interface ExtensibleStudentProfile {
  // Existing core
  playerName: string;
  targetSleepHours: number;
  usualWakeTime: string;
  weeklyDayTypes: Record<string, DayType>;
  
  // Future-proof cohort integration
  targetExam: 'JEE_MAINS_ADVANCED' | 'NEET_UG' | 'CBSE_BOARDS' | 'FOUNDATION';
  academicStage: 'CLASS_11' | 'CLASS_12' | 'DROPPER';
  targetExamYear: number; // 2025, 2026, 2027
  scheduleArchetype: 'REGULAR_SCHOOL' | 'DUMMY_SCHOOL' | 'DROPPER_SELF_STUDY';
  activeSubjects: string[]; // ['Physics', 'Chemistry', 'Mathematics'] or ['Physics', 'Chemistry', 'Biology']
  onboardingCompletedAt: number; // Timestamp
}
```

---

## 2. Minimalist, Liquid-Glass UX/UI Presentation Flow

The new user setup will be presented in a **single, distraction-free Liquid-Glass Dialog** with 3 micro-steps:

```
┌───────────────────────────────────────────────────────────────┐
│  LEVELUP COMMAND CALIBRATION                     [ Step 1/3 ] │
│  "System Calibrated & Online"                                 │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  STEP 1: CADET IDENTITY & TARGET                              │
│  • Codename Input: [ Enter your callsign... ]                 │
│  • Cohort: [ Class 11th ] [ Class 12th ] [ Dropper ]         │
│  • Target Exam: [ JEE 2026 ] [ JEE 2027 ] [ NEET (Future) ]   │
│                                                               │
├───────────────────────────────────────────────────────────────┤
│  STEP 2: SCHEDULE ARCHETYPE (One-Tap Capacity)                │
│  • [ Regular School + Coaching ] (~4h weekdays, ~8h weekend) │
│  • [ Dummy School / Coaching ]   (~6h daily self-study)       │
│  • [ Full Self-Study / Dropper ] (~9h daily deep focus)       │
│  • Wake Time: [ 06:00 AM ]  Target Sleep: [ 7.0 Hours ]      │
│                                                               │
├───────────────────────────────────────────────────────────────┤
│  STEP 3: ACADEMIC PREPARATION STANDING                        │
│  • [ Clean Slate / Starting Fresh ] -> Jump right to study!  │
│  • [ I Have Existing Backlogs ]     -> Prime Tracker 360      │
│                                                               │
├───────────────────────────────────────────────────────────────┤
│                               [ Continue / Launch Command ] → │
└───────────────────────────────────────────────────────────────┘
```

**Aesthetic Tokens Used**:
- Card: `dark:bg-slate-950/80 bg-white/90 backdrop-blur-2xl border border-white/10 dark:border-cyan-500/20 shadow-2xl rounded-3xl`
- Active Option: `bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.2)]`
- Primary Button: `LiquidButton` from `src/components/ui/liquid-glass-button.tsx` with smooth haptic click.

---

## 3. Implementation Tasks & Verification

### Task 1: Create `isNewUser` Sentinel and Clean First-Launch Guards
**Files:**
- Modify: `src/context/AppContext.tsx`
- Modify: `src/App.tsx`

**Implementation:**
- Add `isNewUser` boolean check in `AppContext`: true if `localStorage.getItem("levelup_onboarding_completed") !== "true"` and `xp === 0 && history.length === 0`.
- In `AppContext.tsx:applyParsedState`, if `isNewUser` is true or `lastStudyDate` is null, do NOT trigger `needsRollover` or `pendingMissedDays`.
- In `App.tsx`, if `isNewUser` is true:
  - Do NOT initialize `morningStep` with `"welcome"` or `"days_left"`.
  - Disable rollover check interval on Day 1.
  - Automatically mark `morning_roadmap_completed_${todayKey}` and `rollover_completed_${todayKey}` upon completing onboarding.

### Task 2: Build the Minimalist `CadetOnboardingWizard` Component
**Files:**
- Create: `src/components/onboarding/CadetOnboardingWizard.tsx`

**Implementation:**
- Interactive 3-step carousel with liquid-glass aesthetic.
- Step 1: Callsign (`playerName`), Grade (`CLASS_11` | `CLASS_12` | `DROPPER`), Target Exam (`JEE` | `NEET`), Target Year.
- Step 2: Schedule Archetype (auto-populates `weeklyDayTypes`, `dailyTargetHours`, `targetSleepHours`, and `usualWakeTime`).
- Step 3: Preparation state (Fresh start vs Backlog).
- Atomically saves to `AppContext` and writes `levelup_onboarding_completed = true` to `localStorage`.

### Task 3: Suppress Legacy Conflicting Popups in `App.tsx` and `Dashboard.tsx`
**Files:**
- Modify: `src/App.tsx`
- Modify: `src/pages/Dashboard.tsx`

**Implementation:**
- In `App.tsx`: Remove or gate `showNameModal` behind `!isNewUser` (handled directly by the Wizard).
- In `Dashboard.tsx`: Gate `hasSeenRules`, `isClass11SetupDone`, and `showIntakeModal` so they do not open on top of the Wizard.
- Ensure that once onboarding finishes, the dashboard opens clean, focused, and free of error banners.

### Task 4: Clean Up Dead Code and Leaked Public Files
**Files:**
- Remove: `public/assets/aistudio/Paste_October_22__2026_-_3_34AM_7207ce3a`
- Remove: `public/assets/aistudio/SKILL_ROUTING_REGISTRY_55c45dcc.md`
- Remove: `src/components/ui/demo.tsx`
- Fix or prune: `src/pages/Strategy.tsx`, `src/pages/HallOfFame.tsx`

### Task 5: Vitest & Type Verification
**Commands:**
- `npm run lint` (`tsc --noEmit`)
- `npm test` (`vitest run`)
- Verify zero runtime regressions.
