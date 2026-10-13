# Implementation Plan - Restoring Classic Performance Insight & AI Coach Assessment

Restore the classic Overview structure, revert the Performance Insight title, remove unwanted briefing buttons and Scenario Lab elements, and format the AI Coach Assessment exactly as shown in the user's reference screenshot (`Screenshot 2026-06-26 011230.png`).

---

## 1. User Intent & Clarification Confirmation
Based on your direct answers:
- **Dashboard Title & Action**: Revert `"AI Coach Live Insight"` back to `"Performance Insight"` and eliminate the `"FULL BRIEFING →"` button.
- **Visual Presentation**: Restore the exact single-card **AI Coach Assessment** card format matching your screenshot (`Screenshot 2026-06-26 011230.png`) in both the morning rollover debrief and the History page.
- **Scenario Lab Removal**: Completely remove the Scenario Lab / Simulator mode and arbitrary sleep/screen editing inside the analysis display.
- **Fresh Daily Inputs**: Ensure sleep and screen recording strictly requires fresh data for each day's evaluation rather than pre-filling or relying on previous months' historical averages.

---

## 2. Proposed Changes

### A. Dashboard Overview (`src/pages/Dashboard.tsx`)
- Revert the header title from `<BrainCircuit /> AI Coach Live Insight` back to `Performance Insight`.
- Remove the `FULL BRIEFING →` link/button and remove opening the complex multi-tab modal from this card.
- Retain the clean, direct daily insight text and locking mechanism.

### B. AI Coach Report Engine (`src/lib/coach/engine.ts` & `missions.ts`)
- Ensure `generateDeterministicCoachReport` directly returns the exact, battle-tested 5-part report produced by `buildCoachReport`:
  - **Yesterday's raw report**: `Sleep [X]h. Screen [Y]h. Planned [N] tasks...`
  - **Diagnosis**: Targeted analysis of yesterday's execution friction and bleeding wounds.
  - **Verdict**: Plain-language consistency rating (`CONSISTENT`, `DOMINANT EXECUTION`, `RECOVERY DEFICIT`, etc.).
  - **Today's mission**: Actionable first 90-minute task.
  - **Closing**: High-intensity closing quote (*"The IIT paper doesn't care how you felt yesterday. Stay hard."*).
- Remove the override that was replacing this classic format with the multi-metric telemetry text.

### C. Rollover Modal Step 2 (`src/App.tsx`)
- Revert from the 2-column multi-card grid to the exact visual structure from your reference screenshot:
  1. **Top Metric Strip**: 4 stat cards in a single row:
     - `XP EARNED` (Cyan)
     - `TASKS DONE` (Emerald)
     - `SLEEP` (Blue, e.g. `1h`)
     - `SCREEN` (Rose, e.g. `1h`)
  2. **Objectives Handled**: Clean list with emerald bullet indicators and `+XP` rewards.
  3. **AI Coach Assessment Card**: Single container with cyan header icon (`BrainCircuit`) and the exact parsed sections formatted with proper spacing and bold italic closing quote.

### D. History Page (`src/pages/History.tsx`)
- Update the expandable daily log assessment in `History.tsx` to use the identical single-card card layout as Step 2, ensuring consistent historical viewing for all past days.

### E. Fresh Daily Data Protocol (`src/App.tsx` & `src/context/AppContext.tsx`)
- Keep the rollover input form clean and blank/fresh for each day.
- Prevent arbitrary editing of sleep/screen values after submission so that daily evaluations represent committed, unaltered records.
- Remove Scenario Lab controls from `CoachAnalysisModal.tsx`.

---

## 3. Verification Plan
1. **Compilation & Lint**: Run `lint_applet` and `compile_applet` to confirm error-free TypeScript compilation.
2. **Visual Inspection**:
   - Verify Overview displays `Performance Insight` with no `FULL BRIEFING →` button.
   - Verify Rollover Step 2 displays the exact card from the screenshot.
   - Verify History cards match the screenshot layout.
   - Verify Scenario Lab is absent.
