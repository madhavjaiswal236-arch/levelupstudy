# LevelUp Study — Cognitive Mentor Engine: Final Reconciled Build Plan

Based on the 52-page rigorous audit, the empirical literature compendium, and user confirmation for **JEE Main & Advanced**, this plan resolves all 8 identified architectural blockers and specifies the phased implementation of the 100% offline, deterministic Cognitive Mentor Engine.

---

## 1. Resolution of the 8 Critical Audit Blockers

| Defect ID | Audit Blocker | Mathematical / Architectural Remedy |
| :--- | :--- | :--- |
| **A1 & A2** | **Inverted Spacing Formula** | Standardize on $R = 2^{-t/h}$ where $h$ is half-life in days. Fix stability growth: $S' = S \cdot (1 + \alpha \cdot M \cdot (1 - R))$ with $\alpha = 3.0$ and $M = 0.8 + 0.4 \cdot P(L)$. Review at $R \approx 0.65$ doubles stability ($\approx 2.1\times$), while same-day repetition yields minimal gain ($\le 1.05\times$). |
| **C1 & C2** | **Conflicting Sleep Firewall** | Canonical single source of truth: **RED tier** when last night $< 5.5$h, 7-day debt $\ge 8$h, or 3 consecutive nights $< 6$h. When RED, `validateReport` **regenerates the entire report** from the `RECOVERY` template (offering only `M0_RECOVERY_SLEEP`), never mutating input or leaving contradictory overload text. |
| **G1 & D2** | **Folklore Challenge Number** | Remove the unverified "+4–5%" citation. Implement **empirical accuracy-band targeting** (<45% step down to worked examples, 45–60% scaffold, 60–85% target zone, >85% with 20+ attempts stretch up to M10) plus a 1-tap post-session perceived difficulty rating (1–5). |
| **B1–B5** | **Trends Corrupted by Day Types & Gaps** | Compute Theil-Sen median slopes on **relative residuals** $\rho = (\text{hours} - \text{dayTypeBaseline}) / \max(\text{dayTypeBaseline}, 1)$ indexed by **calendar day offsets** (not array indices). Null values are preserved without silent zero imputation. 9 deterministic trajectories with explicit predicates. |
| **A4–A8** | **BKT Granularity & Saturation** | Build order-neutral, evenly interleaved sequences capped at **6 observations per session**. Calibrate guess priors by question type (MCQ: 0.25, Multi-correct: 0.08, Numeric: 0.03, Unknown: 0.15). Weight error tags ($1.0$ Knowledge Deficit, $0.9$ Transfer, $0.6$ Procedural, $0.25$ Attentional Slip). Require 3 distinct days for chapter mastery. |
| **D1** | **Novice Gating vs Cognitive Load** | Chapters with $P(L) < 0.35$ or under 2 recorded sessions route strictly to **Worked-Example Ladder (`M2`)**, never unguided closed-book retrieval locks (`M1`), preventing novice cognitive overload (Sweller, 1988). |
| **E1–E4** | **Outcome Tracker Flaws & Permanent Cooldown** | 14-day cooldown with an exploration floor ($0.1$ minimum weight). Separate **adherence** from **efficacy** ($pre$ vs $post$ metric delta evaluated after $\ge 3$ trials). Pure functions with state stored in AppContext. |
| **F1 & F2** | **Diverging Vocabularies & Import Cycles** | Establish single canonical `types.ts` owned by `lib/coach/`. AppContext is decoupled via a dedicated adapter (`adapters/appContextAdapter.ts`). Zero clock or storage side-effects inside `lib/coach/`. |

---

## 2. Phased Rollout Specification

### Phase 0: Canonical Contracts & Adapter Layer
- Create `src/lib/coach/types.ts` containing the canonical unified interfaces: `ISODate`, `DayType`, `QuestionType`, `ErrorTag`, `ErrorCounts`, `PracticeSessionExt`, `ChapterMastery`, `SleepTier`, `Trajectory`, `Hypothesis`, `Mission`, `MissionRecord`.
- Build `src/lib/coach/adapters/appContextAdapter.ts` to map AppContext data shapes into engine inputs cleanly without import cycles.
- Add schema versioning and migration helpers in `src/lib/coach/persistence/`.

### Phase 1: Data Capture & Safety Firewall v2
- Implement `src/lib/coach/safety/sleepTier.ts`: Pure sleep debt and tier evaluation (GREEN, AMBER, RED) with configurable 7.5h target.
- Implement `src/lib/coach/reporting/validateReport.ts`: Deep-clone firewall that regenerates entire report to recovery mode on RED tier.
- Add Quick-Tag Error Sheet & JOL confidence pre-score in `src/components/JeeSessionLogger.tsx`:
  - 4 quick counters: *Knowledge Deficit*, *Procedural Flaw*, *Attentional Slip*, *Transfer Failure*.
  - Optional 0–100 predicted score before practice.
  - 1-tap post-session perceived difficulty (1–5).
- Add weekly schedule profile support (School Day vs Coaching Day vs Full Study Day).

### Phase 2: Robust Analytics & Residual Trends
- Update `src/lib/coach/normalize.ts`: Enforce sanity bounds, calendar offsets, coverage ratios, and `DISENGAGED` detection.
- Implement `src/lib/coach/baseline.ts`: Slow, robust medians per day type (frozen against last 7 days to prevent baseline drift).
- Implement `src/lib/coach/trends.ts`: Theil-Sen median slopes on relative residuals $\rho$ across 3d, 7d, 14d, 28d horizons, classifying into 9 trajectories:
  `DATA_INSUFFICIENT`, `SUSTAINED_DECLINE`, `TEMPORARY_DIP`, `RECOVERY_REBOUND`, `CYCLICAL_VOLATILITY`, `STRUCTURAL_EXPANSION`, `SUSTAINED_IMPROVEMENT`, `CHRONIC_PLATEAU`, `STABLE`.
- Normalize cognitive yield in `src/lib/coach/metrics.ts` (1.0 active / 0.75 moderate / 0.35 passive).

### Phase 3: Student Knowledge & Retention Models
- Implement `src/lib/coach/student-model/knowledgeTracing.ts`: Weighted BKT with JEE question-type priors, order-neutral interleaved sequencing, and error-tag weighting.
- Implement `src/lib/coach/student-model/retentionModel.ts`: Corrected half-life growth formula $S' = S \cdot (1 + 3.0 \cdot M \cdot (1 - R))$, retrievability calculation $R = 2^{-t/h}$, and Spaced Review Queue ($R < 0.65, P(L) \ge 0.35$).
- Implement `src/lib/coach/student-model/srlModel.ts`: Rolling signed prediction gap (JOL calibration) and planning feasibility audit.
- Backfill existing practice sessions into chapter mastery upon initialization.

### Phase 4: Diagnostic Hypotheses, Evidence Registry & Missions
- Build `src/lib/coach/evidence/evidenceRegistry.ts`: Graded evidence entries (A/B/C) with provenance flags.
- Implement `src/lib/coach/diagnostics/hypotheses.ts`: Evaluates both supporting and contradicting evidence for candidates.
- Implement `src/lib/coach/interventions/strategyCatalog.ts` & `missionPlanner.ts`:
  - Missions `M0` through `M10` formatted with strict Gollwitzer If-Then regex (`^If .+, then I will .+[.]$`).
  - Strict novice gating (novices get `M2_WORKED_EXAMPLE_LADDER`, not unguided retrieval).
  - Challenge tuning by observed accuracy and difficulty taps.
- Implement Goggins Intense Discipline Tone Engine in `src/lib/coach/reporting/tone.ts`:
  - Focused on action accountability, zero student character labeling, neutral register on distress or RED tier.
- Assemble 7-part report in `src/lib/coach/engine.ts`.

### Phase 5: Closed-Loop Outcome Telemetry & Test Suite
- Implement `src/lib/coach/interventions/outcomeTracker.ts`: Idempotent mission recording, 14-day cooldown with exploration floor, and metric rebound measurement.
- Expand test suite in `src/lib/coach/testRunner.ts` with all 27 golden scenario assertions (T01–T27) covering BKT convergence, spacing expansion, firewall coherence, and regression-to-mean controls.

---

## 3. Verification & Validation Criteria
1. **Regression Suite**: `npm test` passes all tests including BKT, Theil-Sen, Sleep Firewall, and Mission Invariants.
2. **Type Safety**: `npm run lint` / `tsc --noEmit` exits with zero errors.
3. **Purity**: Zero `localStorage`, `Date.now()`, or network calls inside `src/lib/coach/`.
4. **Performance**: Engine execution executes in under 50ms (p95) on 90-day histories.
