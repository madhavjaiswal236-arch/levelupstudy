# CompetitorIQ Skill Routing Registry

**Purpose:** a pre-researched, task-specific map telling Antigravity which skills/tools to use for each part of the CompetitorIQ YouTube creator analytics audit. Keep this beside `ANTIGRAVITY_GOD_MODE_CREATORIQ_PROMPT.md` or copy it into the repository as `docs/audit/SKILL_ROUTING_REGISTRY.md`.

**Research date:** 21 October 2026.

## Important scope and evidence labels

This registry covers every specific skill/tool name mentioned in the supplied CompetitorIQ audit dossier and the follow-up request (including Superpowers, reverse-engineering, Anthropic frontend design, Impeccable, and UI UX Pro Max). The attached files do **not** contain the complete directory/manifests of all globally installed skills, so no outside reviewer can truthfully enumerate every skill installed on this PC. The purpose here is to eliminate broad discovery and preassign the relevant known capabilities. Antigravity should only check availability of the exact relevant entries below, not crawl every unrelated skill directory.

- **Publicly verified:** a public upstream project/documentation page was found for this named capability. The exact locally installed version may differ.
- **Dossier name; local existence unverified:** the supplied audit named it, but this research did not establish a reliable public upstream definition. It may be a local/private/custom skill. Use it if the exact installed `SKILL.md` exists; otherwise use the fallback listed.
- **Tool/framework, not a skill:** useful software that needs to be run/configured, not invoked as agent expertise.
- **Category label, not a unique skill ID:** the phrase is too broad to select a precise artifact without a local name.

An online search failing to find a skill does **not** prove that it is fake or absent. Exact local `SKILL.md` contents and actual tool availability take precedence over descriptions in this document.

---

## 1. Task-to-skill routing table

| Task | First choice | Add these only when relevant | What the agent should do | Avoid |
|---|---|---|---|---|
| Start a complex engineering session | **Superpowers `using-superpowers`** (if installed) | `brainstorming`, `writing-plans` | Load the operating workflow before edits; make a short plan without reopening settled requirements | Dump every skill into context or create a planning-only session that never implements |
| Map the existing codebase | **Reverse-engineering skill** (exact local name is unspecified; use only if installed) | `awesome-architecture-audit` (local existence unverified); Graphify CLI if present | Trace route → service → storage → UI flows, identify active vs legacy code, map call/dependency graph, confirm with actual source | Inferring architecture from filenames or trusting the old graph/audit without refresh |
| Architecture / module boundaries | `awesome-architecture-audit` (if exact local skill exists) | Superpowers `dispatching-parallel-agents`, `requesting-code-review` | Find coupling, duplication, dead paths, unclear ownership, runtime/config mismatches; provide file/symbol evidence | Large rewrites based only on scores or graph centrality |
| Database integrity / migration | `awesome-database-audit` (if installed) | `deprecation-and-migration` (if installed); Superpowers `writing-plans`, TDD, verification | Test JSON persistence, atomicity, concurrent writes, schema drift and restore; plan reversible migration only if evidence justifies it | Migrating to PostgreSQL/Supabase merely because it is fashionable; destructive data changes without backup |
| Debug build/API/runtime defects | Superpowers `systematic-debugging` | `test-driven-development`, `verification-before-completion` | Reproduce, trace root cause, add a failing regression test, make the smallest fix, rerun affected tests | Blind patches, unrelated cleanup mixed into the fix, repeated guesses |
| Implement core functionality or repair metrics | Superpowers `test-driven-development` | `executing-plans`; project test skills if installed | RED → GREEN → REFACTOR; cover boundary cases before claiming completeness | Writing the implementation first and adding superficial tests afterward |
| API key / server / request security | `security-audit` (if installed) | `api-security-best-practices`, `security-and-hardening` (if installed); Superpowers review skills | Threat-model key handling, URL validation, SSRF, CORS, XSS, path traversal, route exposure, logs, quotas, and local binding; verify fixes with safe local tests | Exposing secrets in reports; destructive penetration tests; placing API keys in browser storage/URLs |
| UI/UX structure and redesign | **Impeccable** `shape` (if its command is exposed) | Anthropic `frontend-design`, UI UX Pro Max | Decide page hierarchy and flows using product context; retain good existing patterns; implement real UI | Starting with colors/animations before understanding the user task |
| Pick/design a consistent system | **UI UX Pro Max** local design search (if installed) | Impeccable `document`/`extract`; Anthropic `frontend-design` | Search for creator analytics/dashboard patterns and React stack guidance; derive a coherent system; save it only if useful | Copying every search result literally or treating the design database as a replacement for product judgment |
| Final visual/accessibility/responsive audit | **Impeccable `audit` then `critique`** (if those commands are exposed) | UI UX Pro Max stack rules; Playwright/browser screenshots; Impeccable `polish` last | Check contrast, focus, keyboard use, responsive layouts, state design, overflow, chart alternatives, load/error/empty states; inspect rendered UI | Claiming visual verification without opening the actual rendered interface |
| Build/review a distinct visual concept | Anthropic **`frontend-design`** (publicly verified) | Impeccable `shape` before implementation, UI UX Pro Max for stack/design data | Create one purposeful visual direction appropriate to a data-dense creator intelligence tool and deliver production-ready components | Treating frontend-design as a backend, API, or security audit skill |
| React/Vite performance | `react-component-performance` and/or `web-performance-optimization` (if local skills exist) | Browser Performance tools, React Profiler, bundle analyzer, Superpowers debugging | Profile first; prove request/render/bundle issue; compare before/after behavior | Optimizing by intuition; adding D3/large animation packages without measurable need |
| Creator analytics and charts | `kpi-dashboard-design` / `claude-d3js-skill` only if exact local skills exist | UI UX Pro Max chart guidance; deterministic analytics unit tests | Validate definitions, denominators, cohort/sample size, time window, age normalization and accessible alternatives; retain current Recharts unless D3 solves a proven need | Mistaking D3.js for a skill; decorative plots; unsupported causal interpretations |
| Test-gap assessment | `awesome-test-gap-audit` (if exact local skill exists) | Superpowers TDD and verification; Vitest, Playwright | Map critical paths to unit, service, route and E2E coverage; add tests for highest-risk gaps | Equating code coverage percentage with correctness |
| Browser-based end-to-end validation | Playwright skill/command only if installed; **Playwright itself is a tool/framework** | `playwright-cli` if present, Superpowers verification | Exercise add creator, refresh, detail, compare, export, persistence, error/quota flows using mocked API responses | Live quota-consuming tests by default, or assuming a `playwright` skill exists merely because the package is installed |
| Observability | `observability-and-instrumentation` (if local skill exists) | Existing logger/metrics utilities, tests for redaction | Add minimal, structured, locally useful and redacted status for request categories, cache, quota/errors, durations and refresh age | Unnecessary external telemetry or logging sensitive headers/tokens |
| New reusable skills/rules | Superpowers `writing-skills`; Anthropic `skill-creator` only if installed | Actual Antigravity workspace rule conventions | Create small task-focused instructions, test the skill if the authoring workflow supports evaluations, and verify the installed harness discovers it | Long always-on instructions duplicating the whole audit report |
| Final delivery claim | Superpowers `verification-before-completion` | `requesting-code-review`, `receiving-code-review`, final test run | Require evidence from actual commands and review the final diff; list unrun checks | Saying “done”, “secure”, or “all tests pass” without proof |

---

## 2. Exact skills/capabilities named in the supplied material

### A. Publicly verified upstream capability

#### Superpowers — software engineering workflow, not a single magic skill

**Upstream:** [obra/superpowers](https://github.com/obra/superpowers)

Use the installed skills in this sequence, only where the task warrants them:

1. `using-superpowers` — discover and follow the framework's own workflow.
2. `brainstorming` — only to resolve real ambiguity; most product scope is already specified in the master prompt.
3. `writing-plans` — break complex changes into verifiable tasks.
4. `dispatching-parallel-agents` — independent READ-ONLY audits only; do not let agents edit the same files concurrently.
5. `test-driven-development` — every bug/feature with testable behavior: create a failing test, implement, make it pass, refactor.
6. `systematic-debugging` — for failing builds, tests, runtime surprises, stale data and flaky workflows; find a root cause before fixing.
7. `executing-plans` or `subagent-driven-development` — execute the implementation plan with checkpoints if present in the installed version.
8. `requesting-code-review` and `receiving-code-review` — review substantial changes and respond to evidence-backed findings.
9. `verification-before-completion` — mandatory before final completion claims.
10. `writing-skills` — only if creating/updating reusable agent skills.

Do not mechanically invoke every step for a one-line fix. Do apply TDD/debugging/verification rigor to the parts that warrant it. For this full-project task, planning, parallel read-only audit, TDD, independent review, and final verification are warranted.

Antigravity installation/integration is documented by the upstream project; if these exact skills are missing, do not assume that the plugin is active just because the user mentioned it. [Antigravity support/install guidance](https://github.com/obra/superpowers#installation).

#### Anthropic `frontend-design` — visual direction and production UI

**Upstream:** [anthropics/skills — frontend-design](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md)

Use for the product's high-level visual direction and production-grade React interface work. It emphasizes designing around the subject/audience, distinctive visual decisions, purposeful typography and motion, meaningful copy, and deliberate error/empty states. It is **not** the tool for API correctness, security, database migration, or test orchestration.

For CompetitorIQ, apply it after understanding the creator-analysis user journey and before substantial UI refactoring. Keep analytics information dense but readable. Avoid copying generic SaaS dashboard patterns without a reason.

#### Impeccable — focused UI/UX audit and refinement workflow

**Upstream:** [pbakaus/impeccable](https://github.com/pbakaus/impeccable)

Use the actual installed command surface when available. Recommended sequence for an existing app:

1. `impeccable document` or `init` only if the product/design context is missing or stale; inspect existing `PRODUCT.md`/`DESIGN.md` before writing new ones.
2. `impeccable shape` before changing information architecture or a significant flow.
3. `impeccable critique` to assess hierarchy/clarity and user experience.
4. `impeccable audit` for accessibility, performance, responsive and implementation quality checks.
5. Implement prioritized real findings.
6. `impeccable harden` for error states, text overflow, input edge cases and failure handling where needed.
7. `impeccable adapt` for responsive/device behavior, `optimize` only for measured performance problems, and `typeset`/`layout`/`clarify` only when their named issue exists.
8. `impeccable polish` as the final visual refinement pass; inspect the rendered result at actual target sizes and rerun the audit after fixes.

Do not blindly call all 23 commands. Select only those relevant to actual findings. If the skill isn't installed as a slash command, load its actual `SKILL.md` and use the supported workflow rather than pretending the command was executed.

#### UI UX Pro Max — searchable design intelligence, not a UI framework

**Public references:** [Aston1690/ui-ux-pro-max](https://github.com/Aston1690/ui-ux-pro-max) and its [SKILL.md](https://github.com/Aston1690/ui-ux-pro-max/blob/main/SKILL.md).

When the local skill is present, first run its documented local design-system search. The upstream documented pattern is similar to:

`python3 <skill-root>/scripts/search.py "creator analytics dashboard content-dense dark responsive" --design-system -p "CompetitorIQ"`

Resolve `<skill-root>` from the installed skill rather than guessing a path. Use the result as evidence for palette, type, spacing, layout, chart and anti-pattern choices. Then search stack-specific React guidance using the skill's documented command. Persist a master design system only if its script supports it and the design should be reused. Inspect local version's `SKILL.md` because data counts and command options can vary across forks/releases.

Do not run this during backend-only work. Do not treat generated color/font suggestions as more important than accessibility, actual application context, or readable charts.

### B. Named in the supplied dossier; exact public upstream definition not independently verified here

The following identifiers occur in the user's supplied dossier. They may be privately installed/local custom skills; **do not assume they are absent or present**. Use only when that exact identifier's local skill file exists and its instructions fit the task.

| Exact dossier identifier | Assigned job if the exact skill exists | Fallback if missing |
|---|---|---|
| `awesome-architecture-audit` | Architecture/module-boundary audit | Reverse-engineering skill if present + direct repo evidence + read-only reviewer |
| `awesome-database-audit` | Persistence correctness, database risks, schema/backup/migration audit | Direct tests of current `database.js` and JSON data path; recommend SQLite only with evidence |
| `deprecation-and-migration` | Staged compatibility and reversible schema/module migration | Write an explicit expand/migrate/verify/rollback plan; preserve backup |
| `api-security-best-practices` | API input/credential/security controls | `security-audit` and direct OWASP-aligned review if present; test key redaction and route validation |
| `security-and-hardening` | Local API hardening, CORS, rate limiting, input validation, headers | `security-audit` plus targeted automated/manual tests |
| `security-audit` | Threat model and prioritized application security review | Direct threat model + available code-security tooling; label limits honestly |
| `anthropic-frontend-design` | Use only if this is a distinct installed skill/fork, for visual direction | Prefer the publicly verified `frontend-design` instructions; avoid duplicating the same design pass |
| `claude-d3js-skill` | Specialized D3 visualizations only if a real need exists | Keep existing Recharts; use accessible SVG/canvas/chart patterns already in stack |
| `kpi-dashboard-design` | Dashboard hierarchy, KPI framing and chart selection | UI UX Pro Max + Impeccable audit/critique + metric glossary |
| `awesome-test-gap-audit` | Identify missing test coverage for key flows | Write a flow-to-test matrix and use available runner/browser tool |
| `react-component-performance` | Profile component rendering and React state behavior | React Profiler + browser Performance panel; measure before/after |
| `web-performance-optimization` | Bundles, network, loading/render performance | Production build analysis, Lighthouse/DevTools if installed, targeted tests |
| `observability-and-instrumentation` | Local diagnostics, structured logs and measurements | Add minimal local counters/timing and redaction tests using current logger |
| `vitest` | The dossier calls this a capability for unit testing | **Vitest is primarily a test runner/framework, not an agent skill.** Inspect package manifests first; use it if installed/configured or add only if justified. |
| `playwright` | Browser end-to-end testing capability | **Playwright is a tool/framework, not automatically a skill.** Use installed CLI/skill and project dependency if present. |
| `playwright-cli` | Browser-control/CLI workflow if installed | Use supported Playwright API/CLI; do not assume package or skill presence |

### C. User-mentioned concepts where no exact identifier was provided

| Mention | How to route it |
|---|---|
| “Agent Skills” | This names a skill format/ecosystem, not one unique skill. Prefer actual `SKILL.md` instructions with explicit trigger, workflow, constraints and references. Do not invent a skill ID from the category label. |
| “Reverse engineering skill” | Exact installed slug unknown. If installed, use it to map this repository's own code, routes, dependency graph and data flow. Do not reverse-engineer third-party YouTube internals, scrape private data or bypass API controls. |
| “Anthropic” | Too broad. For this project, the known relevant public capability is `anthropics/skills` → `frontend-design`; use another Anthropic skill only if its exact name and scope is known. |
| “Many more” | Their identifiers aren't in the attachments. Do not claim to have catalogued unseen local skills. Apply the relevant known map above and report the limited evidence scope. |

### D. Tools/frameworks mentioned in the dossier (not agent skills)

- **Graphify:** a code/data-graph extraction tool/CLI, if installed. Rebuild its graph only when useful and only in the repo; graph centrality is a navigation aid, not proof that a module needs a rewrite.
- **Vitest:** unit/integration test runner.
- **Playwright / Playwright CLI:** browser automation / end-to-end testing.
- **D3.js:** data visualization library. The presence of a purported `claude-d3js-skill` would be separate from the library itself.
- **React Profiler / browser DevTools / Lighthouse / bundle analyzers:** diagnostic tools when installed; use only the tools actually available.

---

## 3. Required invocation plan for this project

Use this compact sequence instead of broad skill exploration:

1. **Process bootstrap:** If available, load Superpowers `using-superpowers`. Create a short task artifact/checklist. Use `writing-plans` for the multi-stage audit and implementation.
2. **Parallel read-only review:** If agents are available, dispatch separate read-only passes for (a) architecture/data flow, (b) security/API key exposure, (c) analytics/API correctness, (d) UI/accessibility/performance, and (e) tests. Consolidate all findings before editing.
3. **Architecture:** Use the exact reverse-engineering/architecture-audit skill if installed; otherwise inspect the active route/service/state/database paths directly. Use Graphify only if already available and useful. Reconcile, don't trust, the old 408-node/832-edge graph.
4. **Security first:** Load whichever of the listed security skills actually exists. Audit the exposed API-key handling, CORS, URL parsing, request validation, local server binding, error/log redaction, and persistent data safety before UI work.
5. **Implementation:** Use Superpowers TDD for metrics, cache/pagination, input parsing and persistence. Use systematic debugging for failures. Fix one root cause at a time.
6. **UI:** Use Anthropic `frontend-design` for a coherent high-level direction; UI UX Pro Max for its searchable design system/React-specific guidance; Impeccable `shape` only for consequential flow changes, then `audit` + `critique`, implement real issues, and `polish` at the end. These are complementary roles, not three separate redesigns.
7. **Testing:** Use the existing Vitest/Playwright setup if configured. Keep API tests mocked to avoid burning quota. Use `awesome-test-gap-audit` only if the exact skill exists.
8. **Review and completion:** Use Superpowers review workflow and `verification-before-completion`; rerun project checks and inspect final diff. Report the exact commands/results and unavailable skill names.

### Priority hierarchy when instructions conflict

1. Safety, law, official platform policies, credential protection and data integrity.
2. User's product scope and explicit acceptance criteria.
3. Existing repository architecture/rules and official API documentation.
4. The exact installed skill's specialized instructions.
5. This registry's capability mapping.
6. Generic design/style preferences.

If a local skill's actual `SKILL.md` contradicts this registry, follow the exact installed instruction where appropriate, then update the registry to reflect the local version. Never fake an invocation or assume a public fork exactly matches the local build.

---

## 4. Official technical references that are more authoritative than skills

These are sources-of-truth for the product domain, not skills:

- [YouTube Data API reference](https://developers.google.com/youtube/data/reference/rest)
- [YouTube `playlistItems.list`](https://developers.google.com/youtube/data/reference/rest/v3/playlistItems/list) — uploads playlist enumeration; official docs state playlist items represent videos within the playlist.
- [YouTube `videos.list`](https://developers.google.com/youtube/data/reference/rest/v3/videos/list) — batched retrieval of video resources.
- [YouTube Data API quota calculator](https://developers.google.com/youtube/v3/determine_quota_cost) — validate current quota units and daily limits; never hard-code tutorial-era assumptions.
- [YouTube Analytics API reference](https://developers.google.com/youtube/analytics/reference/) — owner-authorized analytics and OAuth scope requirements.
- [Anthropic skills repository](https://github.com/anthropics/skills) — upstream skill definitions/examples, not proof that any skill is installed in this machine.
- [Superpowers repository](https://github.com/obra/superpowers) — upstream engineering workflow and skill definitions.
- [Impeccable repository](https://github.com/pbakaus/impeccable) — UI/UX commands and references.
- [UI UX Pro Max repository](https://github.com/Aston1690/ui-ux-pro-max) — searchable design data and skill workflow.

**Do not install every upstream project automatically.** This is a routing/evaluation registry, not permission to clone or install packages. Use existing installed versions first, record actual usage, and add a dependency only when the benefit is clear.
