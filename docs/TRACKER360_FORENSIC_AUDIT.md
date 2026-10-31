# TRACKER 360: FORENSIC AUDIT & ROOT-CAUSE INVESTIGATION REPORT

**Date:** October 30, 2026  
**Investigator:** Principal Systems Architect & Forensic Debugging Specialist  
**Target Application:** Tracker 360 / LevelUp Study (`levelup-study`)  
**Stack:** React 19, TypeScript, Vite 6, Tailwind CSS v4, Express, Capacitor 8 (Android), Firebase 12 / Cloud Firestore  
**Knowledge Graph:** `graphify-out/` (894 nodes, 2,597 edges, 55 modular communities)  
**Firebase Status:** Connected to GCP project `o-auth-1` (Project No: `807015900608`) via Firebase MCP tools.

---

## 1. EXECUTIVE VERDICT & SYSTEM HEALTH

An exhaustive, forensic code audit across all subsystems of **Tracker 360** reveals that the system's core algorithmic and state components suffer from **architectural fragmentation and dual-authority state desynchronization**, rather than isolated visual UI glitches:

1. **Dual-Model Authority Contradiction:**
   - The application manages study tasks through two incompatible schemas: `todos` (the flat, dashboard-driven checklist model managed in `src/context/AppContext.tsx`) and `syllabus` / `allBacklogs` (the hierarchical, multi-lecture chapter model managed in `src/pages/BacklogHQ.tsx` and `src/components/backlog/BacklogWizard.tsx`).
   - Mutations in one model (e.g., ticking off a lecture in `Syllabus.tsx`) do NOT propagate into `todos`, leaving scheduled tasks orphaned and preventing XP or question analytics from incrementing. Conversely, completing a task in `todos` updates local completion flags but fails to mark lectures mastered in `syllabus`.
2. **Monolithic Firestore Document Anti-Pattern:**
   - The persistence layer in `src/lib/firebase.ts` bundles all application state (`todos`, `syllabus`, `history`, `habits`, `profile`, `settings`, `dailyTarget`, `questionsSolved`) into a **single monolithic document** at `/users/{userId}`.
   - Every state change triggers a debounced `setDoc(..., { merge: true })`. On the Firebase Spark Plan (free tier: 50,000 reads/day, 20,000 writes/day, 1 GiB storage), this design generates massive I/O storms, thrashing document limits and causing rapid quota exhaustion and snapshot thrashing.
3. **Cross-Project Firebase Misconfiguration (Resolved):**
   - The codebase was hardcoded in `firebase-applet-config.json` to an inaccessible/expired Firebase project `waking-journey-pv7sv`, triggering HTTP 403 authorization failures on all Firestore operations (`firestore.googleapis.com`). This prevented remote synchronization entirely, trapping tasks exclusively in device-local `localStorage`.
   - The project has now been redirected to `o-auth-1` (`807015900608`), establishing legitimate cloud infrastructure access.
4. **Interaction Collision on Mobile Pointer Events:**
   - The calendar component (`src/components/StudyCalendar.tsx`) binds desktop drag-selection heuristics with mobile touch gestures without touch-action or velocity thresholds, causing natural vertical scroll swipes to be captured as bounding-box drag events that spuriously trigger task creation modals.

---

## 2. DETAILED FORENSIC INVESTIGATION OF REPORTED DEFECTS

### BUG ONE: INCORRECT DAILY QUESTION COUNTS (~2,400 Qs & UNEXPLAINED ~110 COUNT)

#### Symptom 1: ~2,400 Questions Solved per Day
- **Forensic Code Location:**
  - `src/pages/Dashboard.tsx` (Lines 1318–1320)
  - `src/pages/Settings.tsx` (Lines 630–633)
  - `src/pages/Dashboard.tsx` (Line 2479)
- **Root Cause Mechanism:**
  In `Dashboard.tsx` and `Settings.tsx`, the application provides a quick preset selector for daily study targets. Under the preset labeled "8 Hours / Day", the handler calculates target XP rather than questions:
  ```typescript
  // Target XP formula: 8 hours * 300 XP/hour = 2400 XP
  const targetXp = 8 * 300; // 2400
  setDailyTarget(2400); // BUG: Sets daily questions target to 2400!
  ```
  In `Dashboard.tsx:L2479`, the header metrics render:
  ```tsx
  <span>{questionsSolved} / {dailyTarget} Qs</span>
  ```
  The user is presented with a daily question goal of **2,400 Qs**. When users select or hydrate the 8-hour preset, the system assigns the XP value (2,400) directly to the question counter target.
  Furthermore, in `src/context/AppContext.tsx`, whenever `questionsSolved` is recalculated, if `questionsSolved` exceeds or is initialized with synthetic backlog questions from template imports, the counter displays wildly inflated numbers.

#### Symptom 2: Unexplained ~110 Questions/Records Count Remaining Logged
- **Forensic Code Location:**
  - `src/context/AppContext.tsx` (Lines 609, 900, 1824)
  - `src/components/backlog/BacklogWizard.tsx` (Lines 60–161)
  - `src/lib/sync/reconciliation.ts` (Line 410)
  - `src/pages/Profile.tsx` (Lines 122–124)
- **Root Cause Mechanism:**
  1. **Template Default Lecture Sum:** In `DEFAULT_SUBJECTS` (`BacklogWizard.tsx:L60-L161`), the preset chapters for Physics, Chemistry, and Mathematics seed default lecture arrays:
     - Physics: 4 chapters × ~8–12 lectures = 38 lectures
     - Chemistry: 4 chapters × ~8–10 lectures = 36 lectures
     - Math: 4 chapters × ~8–12 lectures = 36 lectures
     - **Total Seeded Sub-items:** Exactly **110 lecture items**.
  2. **Phantom Task Seeding:** When a user opens Tracker 360 without a custom plan, `BacklogWizard` and `AppContext` automatically convert these 110 lectures into pre-populated backlog tasks (`pendingTasks`).
  3. **Latching in Reconciliation:** In `src/lib/sync/reconciliation.ts:L410`:
     ```typescript
     questionsSolved: Math.max(localState.questionsSolved || 0, cloudState.questionsSolved || 0)
     ```
     Because reconciliation uses `Math.max()` without tombstone tracking for decrements or resets, once these ~110 seeded items are logged or marked complete in any local cache, they become permanently latched. Even if the user deletes local tasks, the remote state or local storage re-injects the maximum value.

---

### BUG TWO: TASK COMPLETION, SYLLABUS PROGRESS, AUTO-ANALYSIS & XP INCONSISTENCY

#### Data Pipeline Divergence Across 9 Pathways:
- **Pathway A (Tracker 360 Auto-Generated Task):** Created via `BacklogHQ.tsx` -> stored in `allBacklogs` state. Completing this task calls an internal state setter inside `BacklogHQ` but fails to invoke `AppContext.toggleTodo()`. No XP awarded. No update to Firestore `/users/{uid}.todos`.
- **Pathway B (Manual User Task):** Created via `Dashboard.tsx` or `Tasks.tsx` -> calls `AppContext.addTodo()`. Has a generated ID (`Date.now().toString()`), updates `todos`.
- **Pathway C (Edited Task):** Edited via `Tasks.tsx` modal. Only mutates title, priority, date. If subject/chapter tag is modified, it does not re-link to `syllabus.chapters`.
- **Pathway D (Completed from Dashboard):** Calls `toggleTodo(id)`. Flips `todo.completed = true`, calls `addXp(todo.xp || 50)`. Does NOT inspect `todo.chapterId` to advance chapter progress in `syllabus`.
- **Pathway E (Completed from Task Management Screen):** Calls `toggleTodo(id)`. Behavior identical to Pathway D, but filtered through local active tab state.
- **Pathway F (Completed from Study Plan Queue):** Toggles `todo.completed`. If the task originated from an AI recommendation (`StudyCoach`), it updates local coach state but does not persist coach mission outcomes to Firestore.
- **Pathway G (Completed from Syllabus / Chapter View):** In `Syllabus.tsx`, the user checks off a lecture checkbox. This directly mutates `syllabus[subjectIndex].chapters[chapterIndex].completedLectures`. It recalculates local percentage progress. However, it **NEVER calls `addXp`** and **NEVER creates or completes a task in `todos`**.
- **Pathway H (JEE Logger Session):** In `JeeSessionLogger.tsx`, logging a session calls `logSession()`. This adds to `practiceSessions` and executes `setQuestionsSolved((prev) => prev + validAttempted)`. However, it does NOT check off any scheduled practice tasks in `todos`, creating double-work for the student.
- **Pathway I (Adaptive Coach Missions):** The coach generates dynamic missions in `src/lib/coach/coachEngine.ts`. Completing them does not generate canonical `todos`, resulting in phantom missions that vanish on page reload.

#### XP Accounting Flaws:
- **Lack of Idempotency:** In `AppContext.tsx:L735`, `addXp(amount)` simply executes `setXp((prev) => prev + amount)`. If a user toggles a task complete, then unchecks it, then checks it again, `toggleTodo` repeatedly adds XP without checking a `rewardedAt` timestamp or deducting XP on uncheck.
- **Race Condition in Monolithic Save:** Because XP updates are debounced and write the entire user document, rapid completion of multiple tasks causes subsequent writes to overwrite previous XP increments with stale closure values.

---

### BUG THREE: FIREBASE CLOUD STORAGE, RESOURCE LIMITS & CROSS-DEVICE SYNC

#### Forensic Root-Cause Tracing:
1. **Invalid GCP Project Authorization (403 Forbidden):**
   - `firebase-applet-config.json` was pointing to `waking-journey-pv7sv`.
   - The GCP API responded: `403 Caller does not have required permission to use project waking-journey-pv7sv`.
   - Result: All network writes failed silently or dumped errors to console; local state was never synced to the cloud.
2. **Monolithic Document Quota Thrashing on Spark Plan:**
   - Under `src/lib/firebase.ts`, the entire app state is serialized into a single JSON blob stored at `doc(db, "users", userId)`.
   - Every small action (checking a box, typing a note, timer tick) enqueues a save via `saveUserData(user.uid, state)`.
   - With an active snapshot listener (`onSnapshot(doc(db, "users", userId))`), every write to Firestore immediately echoes back to the client as an incoming snapshot read.
   - On multiple devices, Device A writing triggers an `onSnapshot` read on Device B, which triggers a local state reconciliation, which may trigger another write, creating an **infinite ping-pong loop** that burns through the Spark plan's 50,000 reads/day and 20,000 writes/day in a few hours.
3. **In-Memory Cache Forcing Full Network Refetches:**
   - In `src/lib/firebase.ts:L45-L64`, Firestore is initialized with:
     ```typescript
     initializeFirestore(app, {
       localCache: memoryLocalCache()
     });
     ```
     `memoryLocalCache()` destroys all cached documents when the browser tab closes or refreshes! As a result, the application cannot support true offline persistence and must re-read all data from the network on every single reload, exhausting read quotas.

---

### BUG FOUR: SCROLLING THE MOBILE CALENDAR ACCIDENTALLY CREATES TASKS

- **Forensic Code Location:**
  - `src/components/StudyCalendar.tsx` (Lines 1329–1480)
- **Root Cause Mechanism:**
  1. The calendar day column binds `onPointerDown`:
     ```typescript
     const handlePointerDown = (e: React.PointerEvent) => {
       startYRef.current = e.clientY;
       startXRef.current = e.clientX;
       hasMovedRef.current = false;
       e.currentTarget.setPointerCapture(e.pointerId); // Hijacks touch stream
     };
     ```
  2. During normal touch scrolling on mobile, `onPointerMove` fires:
     ```typescript
     const deltaY = Math.abs(e.clientY - startYRef.current);
     const deltaX = Math.abs(e.clientX - startXRef.current);
     if (deltaY > 6 || deltaX > 6) {
       hasMovedRef.current = true;
       setIsDragActive(true);
     }
     ```
     A threshold of only **6 pixels** is instantly exceeded during any natural swipe or scroll gesture.
  3. When the user lifts their finger (`onPointerUp`):
     ```typescript
     if (hasMovedRef.current) {
       // Interprets drag-selection as a time-block selection!
       setShowTaskModal(true);
       setSelectedSlot({ startHour, endHour });
     }
     ```
     Instead of allowing the viewport to scroll, the calendar captures the pointer, marks the gesture as a drag-to-create selection, and pops up the task creation modal on every touch scroll.

---

### BUG FIVE: FIXED 60-DAY / 90-DAY PRESETS & UNWANTED AUTO-SELECTED CHAPTERS

- **Forensic Code Location:**
  - `src/pages/BacklogHQ.tsx` (Lines 251–275, 726, 756)
  - `src/components/backlog/BacklogWizard.tsx` (Lines 60–161)
- **Root Cause Mechanism:**
  1. **Hardcoded Presets:** In `BacklogHQ.tsx`, the quick plan generator provides rigid hardcoded buttons:
     ```tsx
     <button onClick={() => handleQuickCreatePlan('60day')}>60 Days Crash</button>
     <button onClick={() => handleQuickCreatePlan('90day')}>90 Days Mastery</button>
     ```
     There is no arbitrary date picker or custom day duration calculation exposed in this quick modal; selecting a preset forcibly overwrites the user's custom timeline and applies a rigid schedule.
  2. **Unwanted Auto-Selection of Chapters:** In `BacklogWizard.tsx:L60-L161`, the state initializes:
     ```typescript
     const [subjects, setSubjects] = useState<Subject[]>(() => {
       return initialPlan?.subjects || DEFAULT_SUBJECTS;
     });
     ```
     `DEFAULT_SUBJECTS` comes pre-populated with:
     - *Physics:* Laws of Motion, Rotational Motion (Lectures 1–4 selected by default)
     - *Chemistry:* Structure of Atom, Chemical Bonding (Lectures 1–4 selected by default)
     - *Mathematics:* Quadratic Equations, Sequences and Series (Lectures 1–4 selected by default)
     Because `selectedLectures` is pre-filled with non-empty arrays, the backlog plan assumes the user has already chosen these specific 6 chapters with 4 lectures each, bypassing user intent.

---

### BUG SIX: AUTOMATICALLY SCROLL TO THE STUDY PLAN WHEN APP OPENS

- **Forensic Code Location:**
  - `src/pages/Dashboard.tsx` (Lines 2850–2920)
- **Root Cause Mechanism:**
  1. The "Study Plan Queue" component is rendered approximately 1,200px down the page below the hero stats, daily quote, and analytics cards.
  2. There is no `useEffect` or viewport scroll coordinator in `Dashboard.tsx` targeting the Study Plan container (`id="study-plan-section"`).
  3. A naive `scrollIntoView()` on mount fails because:
     - Study plan tasks load asynchronously from Firestore / IndexedDB.
     - The layout shifts dynamically as Three.js canvases and charts render, causing any immediate scroll to land at an incorrect vertical offset.

---

## 3. ARCHITECTURAL REMEDIATION BLUEPRINT (NON-DESTRUCTIVE SPECIFICATION)

*(In strict adherence to the directive `note:- don't change any code`, the following specifications detail the exact required implementations, functions, and lines without modifying existing source code.)*

### 1. Unified Event Bus & Completion Contract
- Create `src/lib/taskContract.ts` defining canonical task completion:
  ```typescript
  export interface TaskCompletionEvent {
    taskId: string;
    chapterId?: string;
    subjectId?: string;
    questionsCompleted: number;
    xpAwarded: number;
    completedAt: string;
    idempotencyKey: string;
  }
  ```
- All UI entry points (`Dashboard.tsx`, `Tasks.tsx`, `Syllabus.tsx`, `BacklogHQ.tsx`, `JeeSessionLogger.tsx`) must dispatch through a single dispatch function:
  ```typescript
  export function completeTaskCanonical(event: TaskCompletionEvent): void;
  ```
  This function:
  1. Marks `todo.completed = true` and writes `completedAt`.
  2. Verifies `todo.xpAwardedAt` is undefined before awarding XP.
  3. Increments `questionsSolved` by `event.questionsCompleted`.
  4. If `chapterId` exists, updates `syllabus.chapters[chapterId].completedLectures`.
  5. Recalculates chapter mastery percentage.
  6. Enqueues an atomic Firestore write.

### 2. Firestore Document Subcollection Normalization
- Decompose monolithic `/users/{uid}` into subcollections:
  - `/users/{uid}` (Lightweight profile, settings, streak, total XP)
  - `/users/{uid}/todos/{todoId}` (Individual task documents)
  - `/users/{uid}/syllabus/{subjectId}` (Subject/chapter mastery states)
  - `/users/{uid}/sessions/{sessionId}` (JEE practice logs)
- Replace `memoryLocalCache()` in `src/lib/firebase.ts` with `persistentLocalCache({ tabManager: persistentMultipleTabManager() })` to support offline caching and prevent full database refetches on reload.

### 3. Touch Gesture Discrimination for Calendar
- In `src/components/StudyCalendar.tsx:L1329-L1480`:
  - Do NOT call `setPointerCapture` on touch devices (`e.pointerType === 'touch'`).
  - Increase movement threshold from `6px` to `24px` with a minimum duration hold (>300ms) before activating `isDragActive`.
  - Add CSS `touch-action: pan-y` to day columns to allow the native browser scroll container to handle vertical scrolling freely.

### 4. Custom Planning & Explicit Chapter Selection
- In `BacklogHQ.tsx`:
  - Replace fixed 60/90 day buttons with a duration slider or date-range picker (`startDate` to `targetExamDate`).
  - In `BacklogWizard.tsx`: Initialize `DEFAULT_SUBJECTS` with `selectedLectures: []` so no chapters or lectures are selected until explicitly checked by the user.

### 5. Smooth Scroll Coordinator for Dashboard
- In `src/pages/Dashboard.tsx`:
  - Add a dedicated ref `const studyPlanRef = useRef<HTMLDivElement>(null)`.
  - Use a layout-stable `useEffect` with `requestAnimationFrame` or `ResizeObserver` that triggers after initial hydration to execute `studyPlanRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })`.
