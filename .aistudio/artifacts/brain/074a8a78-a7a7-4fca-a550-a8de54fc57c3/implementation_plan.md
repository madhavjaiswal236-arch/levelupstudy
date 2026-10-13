# Classic UI Restoration & Tracker 360 Full Navigation Plan

Restore the user's classic LevelUp Study interface and exact startup workflow. Reinstate the Tracker 360 navigation tab, remove extraneous SRL toolbars from the Overview dashboard, and format both the Daily Rollover assessment and History page using the exact 4-metric and AI Coach assessment layout shown in the user's screenshot—while retaining the sophisticated underlying diagnostic and retention engine.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The following design decisions were aligned and confirmed via interactive clarification:
> - **Tracker 360 Navigation**: Restored directly in the main sidebar and mobile navigation bar at Level 1, ensuring zero-friction access to the multi-subject rotation engine.
> - **Overview Dashboard**: Removed the extra SRL Cognitive Mentor toolbar from the top of the Overview to return to the clean, familiar study dashboard.
> - **Visual Assessment Card**: Both the Daily Rollover Step 2 and the History day details will use the exact dark-themed layout from the user's reference screenshot (Top metric cards for XP, Tasks Done, Sleep, Screen + Objectives Handled + AI Coach Assessment containing Raw Report, Diagnosis, Verdict, Today's Mission, and Closing Quote).
> - **Zero Logic Deletion**: All underlying mathematical models (retention half-life, sleep safety tiering, trajectory classifications, Bayesian mastery updates) remain 100% active and compute the metrics fed into the clean interface.

---

### 1. Overview & Core Concept

- **What It Delivers**:
  1. **Strict Startup Modal Order**:
     - *Step A*: Exam countdown / Days Left reminder alert on app open.
     - *Step B*: Daily Rollover input modal (Sleep Last Night & Screen Time).
     - *Step C*: Yesterday's Performance Analysis modal featuring the exact reference card layout.
     - *Step D*: Missed Days / Consistency Accountability modal if unrecorded days exist, allowing students to submit their reason for absence to calibrate the pace without guilt.
  2. **Tracker 360 Reintegration**: Restores the `Tracker 360` menu item in the primary sidebar and mobile navigation.
  3. **History Page Completeness**: Every day card in the History log presents the full structured assessment (Raw Report, Diagnosis, Verdict, Mission, Closing) alongside hours, XP, and objectives handled.
- **Target User**: JEE/NEET competitive exam aspirants who need clean daily accountability, clear priorities, and zero visual clutter.

---

### 2. User Experience & Visual Design

#### A. Startup Sequence Walkthrough
```
App Open ──► [Days Left Reminder] ──► [Sleep & Screen Input] ──► [Yesterday Analysis Card] ──► [Missed Days Check] ──► Dashboard
```

#### B. Visual Card Specification (Matching Reference Screenshot)
- **Top 4 Metric Grid**:
  - `XP EARNED`: Cyan (`#38bdf8`) bold tally.
  - `TASKS DONE`: Emerald (`#22c55e`) count.
  - `SLEEP`: Blue (`#60a5fa`) hour string with `h` unit.
  - `SCREEN`: Rose/Pink (`#f43f5e`) hour string with `h` unit.
  - All cards styled with deep navy background (`bg-slate-900/80` or `bg-[#0b1329]`), subtle borders (`border-slate-800`), and rounded rectangular corners.
- **Objectives Handled Section**:
  - Header: `OBJECTIVES HANDLED` in uppercase tracking-widest typography.
  - Interactive rows: Green dot indicator, title + subject + duration, right-aligned `+XP` pill.
- **AI Coach Assessment Card**:
  - Title: Brain icon with `AI COACH ASSESSMENT` in cyan.
  - `Yesterday's raw report`: Sleep, screen, planned tasks completed vs incomplete, and total study hours.
  - `Diagnosis`: Plain-spoken, motivational evaluation of the day's focus vs avoidance.
  - `Verdict`: High-contrast verdict tag (e.g. `CONSISTENT`, `SLIPPING`, `RECOVERY`) with operational context.
  - `Today's mission`: Single tactical objective for the day.
  - `Closing`: Italicized, bold mindset anchor (e.g., *"The IIT paper doesn't care how you felt yesterday. Stay hard."*).

---

### 3. Key Product Decisions & Trade-Offs

- **Sidebar Navigation**:
  - *Decision*: Uncomment and activate `{ id: "backlog", label: "Tracker 360", icon: Layers, requiredLevel: 1 }` in `src/App.tsx`.
  - *Why*: The user explicitly missed the dedicated Tracker 360 screen and requested it back in the primary navigation.
- **Overview Header Layout**:
  - *Decision*: Remove the 3-button SRL toolbar (`Sunday SRL Ritual`, `Schedule Profile`, `SRL Intake`) from `src/pages/Dashboard.tsx`.
  - *Why*: Keeps the Overview clean and uncluttered. SRL routines can run on schedule or reside in Settings.
- **Single Evaluation Engine**:
  - *Decision*: Continue utilizing `generateDeterministicCoachReport` from `src/lib/coach/engine.ts`.
  - *Why*: It already computes the exact 5-part string (`rawReport`, `diagnosis`, `verdict`, `todayMission`, `closing`), while respecting the underlying sleep tier and retention models.

---

### 4. Technical Architecture & Data Strategy

#### Component Hierarchy & Flow
```
┌────────────────────────────────────────────────────────┐
│                        App.tsx                         │
├────────────────────────────────────────────────────────┤
│  Startup Flow Pipeline:                                │
│    1. Days Left Reminder Modal                         │
│    2. Daily Rollover Modal:                            │
│         ├─ Step 1: Sleep & Screen Input                │
│         └─ Step 2: Yesterday Analysis Card (Screenshot) │
│    3. Missed Days Accountability Modal                 │
│                                                        │
│  Navigation Sidebar:                                   │
│    [Dashboard] [Tracker 360] [Calendar] [Missions] ... │
└────────────────────────────────────────────────────────┘
                           │
         ┌─────────────────┴─────────────────┐
         ▼                                   ▼
┌────────────────────────┐         ┌─────────────────────┐
│  src/pages/Dashboard   │         │  src/pages/History  │
├────────────────────────┤         ├─────────────────────┤
│ • Clean classic layout │         │ • Full day analysis │
│ • No SRL toolbar       │         │ • 4 Metric tiles    │
│ • Daily goals & tasks  │         │ • AI Coach details  │
└────────────────────────┘         └─────────────────────┘
```

#### State and Event Transitions
1. `needsRollover === true`: Opens rollover modal on Step 1 (Sleep/Screen).
2. On `submitRollover`: Transitions to Step 2 displaying the exact visual card layout.
3. On dismissal of Step 2: Checks if `pendingMissedDays.length > 0`; if so, smoothly transitions to `MissedDaysModal` where the student inputs the reason for absence.
4. History list items: Clicking or expanding any past date renders the full `AI Coach Assessment` card from `historyItem.aiFeedback`.
