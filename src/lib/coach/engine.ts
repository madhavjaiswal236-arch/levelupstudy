import { RawCoachInput, DeterministicCoachReport } from "./types";
import { normalizeInput } from "./normalize";
import { computeMetrics } from "./metrics";
import { computeBaseline } from "./baseline";
import { computeTrends } from "./trends";
import { classifyMultiState } from "./states";
import { computeSeverity } from "./severity";
import { resolvePriority } from "./priority";
import { buildCoachReport } from "./missions";

/**
 * Canonical Deterministic Personal Student Mentoring Engine
 *
 * Runs 100% locally / server-side without external LLM dependencies.
 * Fully testable, deterministic, and reproducible.
 */
export function generateDeterministicCoachReport(input: RawCoachInput): DeterministicCoachReport {
  // Step 1: Normalize & Sanitize
  const normalized = normalizeInput(input);

  // Step 2: Compute Derived Metrics
  const metrics = computeMetrics(normalized);

  // Step 3: Compute Personal Baselines (EMA)
  const baseline = computeBaseline(normalized.history);

  // Step 4: Detect Temporal Trends
  const trends = computeTrends(normalized.history, normalized.hours, normalized.sleep, normalized.screenTime);

  // Step 5: Multi-Dimensional State Classification
  const state = classifyMultiState(normalized, metrics, baseline, trends);

  // Step 6: Severity Scoring
  const severity = computeSeverity(state, metrics);

  // Step 7: Priority Resolution
  const priority = resolvePriority(severity);

  // Step 8: Build Report & Response Sections
  return buildCoachReport(normalized, metrics, baseline, trends, state, severity, priority);
}
