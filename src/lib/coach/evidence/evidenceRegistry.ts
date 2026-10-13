// src/lib/coach/evidence/evidenceRegistry.ts
/**
 * Canonical Graded Evidence Registry.
 * As defined in Audit Section 1.1 & 4.4.
 * Grades:
 *   A = Strong convergent evidence
 *   B = Established single-source / extrapolated
 *   C = Design choice / heuristic
 * UI Rule: Shown as 'Evidence' only if verified && grade is A or B; otherwise shown as 'Design heuristic'.
 */

import type { EvidenceRegistryItem } from "../types";

export const EVIDENCE_REGISTRY: Record<string, EvidenceRegistryItem> = {
  EVD_RETRIEVAL_PRACTICE: {
    id: "EVD_RETRIEVAL_PRACTICE",
    shortCitation: "Dunlosky et al., 2013",
    claim: "Practice testing beats passive rereading for long-term conceptual retention.",
    grade: "A",
    provenance: "IN_CORPUS",
    verified: true,
    studentExplanation:
      "Testing yourself forces active memory reconstruction, creating durable pathways for exam recall.",
  },
  EVD_DISTRIBUTED_PRACTICE: {
    id: "EVD_DISTRIBUTED_PRACTICE",
    shortCitation: "Dunlosky et al., 2013; Cepeda et al., 2006",
    claim: "Spacing problem sets across expanding intervals prevents rapid decay.",
    grade: "A",
    provenance: "IN_CORPUS",
    verified: true,
    studentExplanation:
      "Reviewing just as a topic begins to fade strengthens synaptic memory far more than same-day cramming.",
  },
  EVD_COGNITIVE_LOAD: {
    id: "EVD_COGNITIVE_LOAD",
    shortCitation: "Sweller, 1988; Cowan, 2001",
    claim: "Working memory is limited to 4+-1 chunks; novices require worked examples before unguided solving.",
    grade: "A",
    provenance: "IN_CORPUS",
    verified: true,
    studentExplanation:
      "Attempting complex unsolved problems before schemas are formed overloads working memory and slows learning.",
  },
  EVD_IMPLEMENTATION_INTENTIONS: {
    id: "EVD_IMPLEMENTATION_INTENTIONS",
    shortCitation: "Gollwitzer, 1999",
    claim: "Pre-committing actions in 'If-Then' syntax significantly increases execution rates.",
    grade: "A",
    provenance: "IN_CORPUS",
    verified: true,
    studentExplanation:
      "Linking a specific environmental trigger directly to an immediate action eliminates decision paralysis.",
  },
  EVD_SLEEP_CONSOLIDATION: {
    id: "EVD_SLEEP_CONSOLIDATION",
    shortCitation: "Walker & Stickgold, 2004",
    claim: "Slow-wave and REM sleep are physiologically mandatory for neuroplastic synaptic consolidation.",
    grade: "A",
    provenance: "IN_CORPUS",
    verified: true,
    studentExplanation:
      "Sleep is not downtime; it is when the brain stabilizes memories and clears neurochemical fatigue.",
  },
  EVD_INTERLEAVING: {
    id: "EVD_INTERLEAVING",
    shortCitation: "Dunlosky et al., 2013; Rohrer & Taylor, 2007",
    claim: "Mixing related chapter problem types improves discriminative category selection.",
    grade: "B",
    provenance: "IN_CORPUS",
    verified: true,
    studentExplanation:
      "Shuffling problem types trains you to diagnose which formula to use, mirroring actual JEE exam conditions.",
  },
  EVD_ELABORATIVE_ERROR: {
    id: "EVD_ELABORATIVE_ERROR",
    shortCitation: "Dunlosky et al., 2013",
    claim: "Elaborative interrogation on errors repairs conceptual misunderstandings.",
    grade: "B",
    provenance: "IN_CORPUS",
    verified: true,
    studentExplanation:
      "Explaining why a wrong answer occurred and rewriting the step isolates the root misconception.",
  },
  EVD_CALIBRATION: {
    id: "EVD_CALIBRATION",
    shortCitation: "Zimmerman, 2002; Compendium Rubric",
    claim: "Metacognitive calibration prediction closes the gap between perceived fluency and real execution.",
    grade: "B",
    provenance: "IN_CORPUS",
    verified: true,
    studentExplanation:
      "Estimating your score before attempting a set reveals false confidence before the exam does.",
  },
  EVD_ATTENTION_RESIDUE: {
    id: "EVD_ATTENTION_RESIDUE",
    shortCitation: "Leroy, 2009; Compendium §4.2",
    claim: "Task switching and digital interruptions leave persistent cognitive residue.",
    grade: "B",
    provenance: "IN_CORPUS",
    verified: true,
    studentExplanation:
      "Keeping the phone outside the study environment protects sustained executive attention.",
  },
  EVD_MOMENTUM_ANCHOR: {
    id: "EVD_MOMENTUM_ANCHOR",
    shortCitation: "Bandura, 1997; Compendium §3",
    claim: "Low-friction starting anchors restore self-efficacy following study disruptions.",
    grade: "B",
    provenance: "IN_CORPUS",
    verified: true,
    studentExplanation:
      "A quick, guaranteed win on familiar material restarts momentum without cognitive exhaustion.",
  },
  EVD_FLOW_CHALLENGE_TUNING: {
    id: "EVD_FLOW_CHALLENGE_TUNING",
    shortCitation: "Gold & Ciorciari, 2020 (Design Heuristic)",
    claim: "Perceived balance between challenge and skill fosters deep engagement.",
    grade: "C",
    provenance: "IN_CORPUS",
    verified: false,
    studentExplanation:
      "Targeting questions within 60-85% accuracy maintains engagement without discouragement or boredom.",
  },
};
