import { SeverityAnalysis, PriorityResolution } from "./types";

export function resolvePriority(severity: SeverityAnalysis): PriorityResolution {
  const priorityOrder: { key: PriorityResolution["primaryFocus"]; weight: number; healthCritical: boolean }[] = [
    { key: "recovery", weight: 10, healthCritical: true },
    { key: "performance", weight: 8, healthCritical: false },
    { key: "trend", weight: 7, healthCritical: false },
    { key: "planning", weight: 6, healthCritical: false },
    { key: "practice", weight: 5, healthCritical: false },
    { key: "screen", weight: 4, healthCritical: false },
  ];

  const scored = priorityOrder
    .map((p) => ({
      ...p,
      rawScore: severity.axes[p.key] || 0,
      weightedScore: (severity.axes[p.key] || 0) * p.weight,
    }))
    .sort((a, b) => {
      if (a.healthCritical && a.rawScore >= 8 && (!b.healthCritical || b.rawScore < 8)) return -1;
      if (b.healthCritical && b.rawScore >= 8 && (!a.healthCritical || a.rawScore < 8)) return 1;
      return b.weightedScore - a.weightedScore;
    });

  const primaryFocus = scored[0].key;
  const secondaryFocus = scored[1] && scored[1].rawScore >= 4 ? scored[1].key : null;

  let reason = `Primary bottleneck identified as ${primaryFocus.toUpperCase()} with severity score ${severity.axes[primaryFocus]}/10.`;
  if (severity.isHealthCritical && primaryFocus === "recovery") {
    reason = `HEALTH CRITICAL OVERRIDE: Sleep debt and recovery deficit (${severity.axes.recovery}/10) must be addressed before workload expansion.`;
  }

  return {
    primaryFocus,
    secondaryFocus,
    reason,
  };
}
