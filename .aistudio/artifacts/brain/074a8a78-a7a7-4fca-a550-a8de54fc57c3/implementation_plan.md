# Daily First-Open Morning Roadmap & Yesterday's Analysis Flow

A unified, 4-stage sequential morning protocol triggered on the first app launch of each day, connecting the Welcome Screen, the Target Countdown Page, Recovery Metrics Intake, and Consistency / Yesterday's AI Analysis.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architecture has been aligned based on your confirmed preferences:
> - **Navigation Model**: Step-by-step modal sequence with explicit "Continue" / action buttons for predictable user agency.
> - **Absence & Underperformance Flow**: If a day was missed or consistency broken, the user sees the **Absence Reason / Consistency Broken Debrief** first, followed by **Yesterday's Analysis** before entering the dashboard.
> - **Days Left Screen**: Reuses the high-impact countdown screen with large tabular days remaining and pending backlog status.
> - **Rollover Bug Fix**: Resolves the race condition where `needsRollover` was cleared immediately upon saving metrics, allowing Yesterday's Analysis to display reliably.

---

## 1. Overview & Core Concept

When a JEE aspirant opens LevelUp Study for the first time each day, they need immediate orientation, urgency calibration, recovery logging, and objective coaching feedback. 

Instead of disjointed popups appearing at different times or disappearing abruptly, this feature arranges the opening experience into a clear 4-step sequence:
1. **Stage 1 (Welcome Screen)**: High-focus atmospheric briefing screen with one primary CTA to proceed.
2. **Stage 2 (Days Left Page)**: The full countdown page showing exact days left until the target exam date, reinforcing daily focus and urgency.
3. **Stage 3 (Metrics Collection)**: Clean intake for yesterday's sleep hours/minutes and screen time hours/minutes.
4. **Stage 4 (Accountability & Coach Analysis)**:
   - *If consistency broken or day missed*: Displays the Absence Reason debrief first, and upon submission flows directly into Yesterday's Analysis.
   - *If consistent*: Displays Yesterday's Analysis immediately (XP earned, completed tasks, recovery metrics, and the deterministic AI Coach assessment: Diagnosis, Verdict, and Today's Mission).
   - A single "Init Day Protocol / Enter Command Center" button finalizes the protocol and opens the dashboard for the day.

---

## 2. User Experience & Visual Design

### Step-by-Step Flow

```
┌────────────────────────┐      ┌────────────────────────┐
│  STAGE 1: WELCOME      │ ───> │  STAGE 2: DAYS LEFT    │
│  - Atmospheric Canvas  │      │  - Huge Tabular Days   │
│  - "Command Center"    │      │  - Target Date Alert   │
│  - [ Continue / Enter] │      │  - [ Continue ]        │
└────────────────────────┘      └────────────────────────┘
                                            │
                                            ▼
┌────────────────────────┐      ┌────────────────────────┐
│  STAGE 4: ANALYSIS     │ <─── │  STAGE 3: METRICS      │
│  - (Absence if broken) │      │  - Sleep (Hrs / Mins)  │
│  - Yesterday's Report  │      │  - Screen (Hrs / Mins) │
│  - AI Coach Missions   │      │  - [ Calculate Report] │
│  - [ Enter Dashboard ] │      └────────────────────────┘
└────────────────────────┘
```

### Visual Specifications & Consistency
- **Stage 1 (Welcome Screen)**:
  - Deep black canvas (`bg-black`), WebGL shader backdrop, subtle border framing (`border-[#27272a]`), and clear "ENTER COMMAND CENTER" primary action.
- **Stage 2 (Days Left Page)**:
  - Red/crimson accent atmosphere (`border-red-500/30`), massive high-contrast tabular countdown numeral (`text-[8rem] md:text-[12rem] font-black font-mono`), and "Days Remaining" label.
  - Shows pending backlog alert if tasks remain from previous days.
  - "Continue to Daily Intake" button advances smoothly to Stage 3.
- **Stage 3 (Metrics Intake)**:
  - Clean dual inputs for Sleep Time and Screen Time with explicit Hours and Minutes fields.
  - "Calculate Yesterday's Report" button triggers deterministic coaching calculations and advances to Stage 4.
- **Stage 4A (If Consistency Broken / Missed Days)**:
  - Rose/crimson theme (`border-rose-500/50`) with "MISSION DEBRIEF & RECOVERY" header.
  - Input field for absence reason without guilt-tripping; submitting transitions immediately into Stage 4B (Yesterday's Analysis).
- **Stage 4B (Yesterday's Analysis)**:
  - 4-column metric grid: XP Earned, Tasks Done (`completed / total`), Sleep (`h m`), and Screen (`h m`).
  - Objectives Logged itemized list showing completed vs incomplete tasks.
  - AI Coach Assessment card rendering structured coach feedback (`Diagnosis`, `Verdict`, `Today's Mission`, `Closing`).
  - Final CTA: "Init Day Protocol" closes the morning routine and brings the user to their active workspace.

---

## 3. Key Product Decisions & Bug Fixes

### Bug Fix: Preserving Yesterday's Analysis Screen
- **Root Cause**: In `App.tsx`, an automated rollover watcher hook observed `localStorage.getItem("rollover_completed_${todayKey}")`. When `completeRollover()` wrote to localStorage inside Step 3, the watcher hook detected `protocolExists === true` and instantly called `setNeedsRollover(false)` before Step 2 (Yesterday's Analysis) could render.
- **Fix**: The morning protocol state machine will be driven by a dedicated, resilient sequence controller (`morningProtocolStep`: `welcome` | `days_left` | `metrics` | `absence` | `analysis` | `complete`). `needsRollover` will remain active until the user explicitly clicks "Init Day Protocol" at the end of Stage 4.

### Determining "Consistency Broken" vs "Regular Study"
- The app checks:
  1. Any unrecorded calendar days in `pendingMissedDays` (missed days without logins).
  2. Underperformance criteria: studied hours under minimum threshold (e.g. `< 2.0h`) or severe decline relative to the student's daily target.
- If either condition is true: Show the Absence / Debrief screen first, then proceed to the Coach Analysis report so the student still receives their daily mission and diagnostic feedback.

---

## 4. Technical Architecture & State Strategy

### Sequential Flow State Machine

```
[ App Launch on New Day ]
         │
         ▼
Is First Open of the Day? ── No ──> Normal Dashboard
         │ Yes
         ▼
[ Stage 1: Welcome Screen ]
         │ (User clicks "Enter")
         ▼
[ Stage 2: Days Left Modal ]
         │ (User clicks "Continue")
         ▼
[ Stage 3: Sleep & Screen Intake ]
         │ (User clicks "Calculate Yesterday's Report")
         ▼
Has missed days OR underperformed?
   ├─ Yes ──> [ Stage 4A: Absence Debrief ] ──> (Submit reason) ──┐
   └─ No ─────────────────────────────────────────────────────────┼─> [ Stage 4B: Yesterday's Analysis ]
                                                                      │ (User clicks "Init Day Protocol")
                                                                      ▼
                                                            [ Workspace Dashboard ]
                                                            (Mark day protocol as complete)
```

### Components to Update
1. **`src/App.tsx`**:
   - Consolidate morning modals into a single coordinated flow (`morningStep`: 1, 2, 3, 4A, 4B).
   - Prevent the background rollover monitor from prematurely unmounting the modal after metrics submission.
   - Re-route Stage 1 (Welcome) directly into Stage 2 (Days Left) when opened on a new day.
2. **`src/context/AppContext.tsx`**:
   - Ensure `sessionStorage` / `localStorage` flags for `rollover_completed` are set only after Stage 4 is finalized, or guard `needsRollover` state transition until Stage 4 completes.
3. **`src/pages/Dashboard.tsx`**:
   - Ensure the static "Days Remaining" reminder does not double-prompt if already viewed during the morning sequence.

---

## 5. Verification Plan

- **Compilation & Type Check**: Run `compile_applet` and `lint_applet` to confirm strict TypeScript compliance.
- **Unit & Logic Tests**: Run `npm test -- --run` to ensure all 43 coach engine tests pass without regression.
- **Flow Verification**:
  1. Simulate new day launch -> verify Welcome screen opens.
  2. Click Enter -> verify Days Left screen opens with countdown.
  3. Click Continue -> verify Metrics intake opens for Sleep & Screen time.
  4. Submit metrics -> verify Yesterday's Analysis card opens (does not vanish).
  5. Test broken consistency path -> verify Absence reason screen appears first, followed by Yesterday's Analysis.
  6. Click "Init Day Protocol" -> verify clean transition into the Dashboard workspace.
