# Comprehensive Audit Resolution & Remediation Plan

This implementation plan resolves all newly identified regressions from commit `5e443f4` and completes all outstanding audit requirements in accordance with your preferences.

---

## 1. Newly Introduced Defect Fixes

### [NEW-01 | S0] Partial-Data-Loss in Backup Recovery Routine
* **Target File**: `src/context/AppContext.tsx` (lines 953–964)
* **Issue**: Corrupted storage recovery loaded backup JSON but only restored 5 fields (`xp`, `level`, `streakDays`, `todos`, `history`), dropping 30+ state slices (practice sessions, syllabus, habits, life metrics, goals) and immediately persisting the stripped state.
* **Fix**: Replace partial state assignments with `applyStateSnapshot(backupParsed)` and set `latestStateRef.current = backupParsed`, matching `importLocalBackup`.

### [NEW-02 | S1] Unvalidated Raw Parameters in Practice Session XP & Time Accounting
* **Target File**: `src/context/AppContext.tsx` (lines 2143–2144)
* **Issue**: Parameter validation created `validAttempted`, `validCorrect`, and `validTime`, but lines 2143–2144 passed raw `attempted`, `correct`, and `timeSpent` to `addXp()` and `setHoursStudiedToday()`.
* **Fix**: Pass `validAttempted`, `validCorrect`, and `validTime` to `addXp` and `setHoursStudiedToday`.

### [NEW-03 | S1] Conditional React Hook Violation in `lunar-gravity-card.tsx`
* **Target File**: `src/components/ui/lunar-gravity-card.tsx` (lines 40–45)
* **Issue**: `useRef` was conditionally called inside an `if (isMobile) { return ... }` early return, violating React Rules of Hooks and causing render crashes when window size toggled across breakpoints.
* **Fix**: Lift all `useRef` and hook declarations to the top level of the component before any early returns.

### [NEW-04 | S2] Task Metadata Overwrite Vulnerability in Reconciliation
* **Target File**: `src/lib/sync/reconciliation.ts` (line 348)
* **Issue**: During cloud sync reconciliation, updating local todo properties omitted `updatedAt`, resetting task timestamps and causing sync ping-pong loops.
* **Fix**: Ensure local task updates inherit `local.updatedAt ?? cloud.updatedAt ?? Date.now()`.

---

## 2. Unresolved Audit Findings & User Decisions

### [AND-01] Android Firebase Project Alignment
* **Target File**: `android/app/google-services.json`
* **Issue**: `google-services.json` pointed to legacy project `waking-journey-pv7sv` while web app uses `ai-studio-levelupstudy-074a8a78-a7a7-4fca-a550-a8de54fc57c3`.
* **Fix**: Align `project_info`, `mobilesdk_app_id`, `client_id`, and `firebase_url` to `ai-studio-levelupstudy-074a8a78-a7a7-4fca-a550-a8de54fc57c3`.

### [TST-01] `vitest` Dev Dependency Installation
* **Action**: Install `vitest` via `install_applet_package` (`IsDevDependency: true`).
* **Fix**: Verify test runner configuration so `npm test` runs cleanly and passes all suites.

### [PER-01] Prune Dead 3D/Three.js Shader Assets
* **Target Files**: `src/App.tsx`, `src/components/ui/lunar-gravity-card.tsx`, `package.json`
* **Issue**: 502 kB unused Three.js/shader assets and imports bloated the main bundle.
* **Fix**: Remove dead 3D asset imports and references, ensuring a lightweight, fast-loading bundle without breaking any visual card components.

### [UI-01 & PER-02] Navigation & Re-render Optimization
* **Target Files**: `src/App.tsx`, `src/context/AppContext.tsx`
* **Fix**: Standardize hardware back button listener stack and optimize timer re-render state selectors to prevent unnecessary re-renders during active focus timer sessions.

---

## 3. Execution & Verification Steps

1. **Dependency Installation**: Install `vitest` package as dev dependency.
2. **Code Remediation**: Apply precise edits to `AppContext.tsx`, `reconciliation.ts`, `lunar-gravity-card.tsx`, `App.tsx`, and `google-services.json`.
3. **Static Analysis & Compilation**: Execute `npx tsc --noEmit` and `compile_applet` to confirm zero build errors or broken imports.
4. **Test Suite Verification**: Run automated tests to verify backup snapshot restoration, parameter validation, and reconciliation logic.
