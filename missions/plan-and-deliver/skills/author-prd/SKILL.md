---
name: author-prd
description: Gather evidence and draft or update a flexible Product or Feature Requirements Document.
designation:
  allowed: Gather evidence; draft or update PRD under operations docs; PRD approval gate
  forbidden: Application code; center or mission rule edits; spawn children; git ship
inputs:
  prdTitle:
    type: string
    description: Human-friendly PRD title.
    required: true
  prdDescription:
    type: string
    description: Problem, users, goals, or scope summary collected by the Squad Leader before spawn.
    required: true
  operation:
    type: string
    description: Either create or manage.
    required: true
  targetPath:
    type: string
    description: Output path for create mode or existing PRD path for manage mode.
    required: false
  sourceMaterials:
    type: array
    description: Seed materials from Squad Leader intake (plan.mdc §2); author-prd extends the ledger for remaining gaps.
    required: false
    default: []
  sectionPolicy:
    type: object
    description: Map of PRD sections to mandatory, important, optional, or not applicable.
    required: false
  existingPrdBody:
    type: string
    description: Existing PRD content when operation is manage.
    required: false
  operationsDocsDirectory:
    type: string
    description: Absolute workspace scope-level docs directory under .sedea/operations/.../docs/ from lane identity or spawn inputs.
    required: true
laneRules:
  - ".sedea/centers/sedea/rules/2_ask-question-instructions.mdc"
  - ".sedea/centers/research-and-development/missions/plan-and-deliver/skills/author-prd/SKILL.md"
  - ".sedea/centers/research-and-development/missions/plan-and-deliver/plan.mdc"
warmUpRules:
  - ".sedea/centers/research-and-development/missions/plan-and-deliver/plan.mdc"
  - ".sedea/centers/research-and-development/missions/plan-and-deliver/skills/README.md"
  - ".sedea/centers/research-and-development/docs/development-process.md"
---

# Skill: author-prd

## Warm-up manifest (spawned)

Per [`.sedea/centers/sedea/docs/lane-manifest-contract.md`](.sedea/centers/sedea/docs/lane-manifest-contract.md) and **`../README.md`** § *Definitive `laneRules`* (**`author-prd` child** row). Host merge: `effectiveWarmUp = dedupe(bootstrapRules → laneRules → skillWarmUp)`. Frontmatter matches this table; spawners may omit run-request **`laneRules`** when identical (README spawn preflight row 11). **No `alwaysApply` frontmatter flip.**

### `bootstrapRules` — host-resolved (R&D layer)

| Path | Purpose |
|------|---------|
| `.sedea/centers/research-and-development/rules/bootstrap.mdc` | Sole R&D `alwaysApply: true` bootstrap (≤10 KB); host merges when `centerSlug === research-and-development` |

### `skillWarmUp` — frontmatter `warmUpRules`

| Path | Purpose |
|------|---------|
| `.sedea/centers/research-and-development/missions/plan-and-deliver/plan.mdc` | Squad Leader §§1–3 PRD intake |
| `.sedea/centers/research-and-development/missions/plan-and-deliver/skills/README.md` | Spawn contracts, terminal stop |
| `.sedea/centers/research-and-development/docs/development-process.md` | PRD templates, planning readiness |

### `laneRules` — frontmatter `laneRules`

| Path | Purpose |
|------|---------|
| `.sedea/centers/sedea/rules/2_ask-question-instructions.mdc` | Structured choice, PRD approval |
| `.sedea/centers/research-and-development/missions/plan-and-deliver/skills/author-prd/SKILL.md` | This skill procedure |
| `.sedea/centers/research-and-development/missions/plan-and-deliver/plan.mdc` | Squad Leader §§1–3 (role minimum) |

## Agent messaging (MCP)

**MCP spawn/result skill.** Parent→child spawn and child terminal result use MCP tools per **`.sedea/centers/sedea/rules/4_mission.mdc`** § *Agent-to-agent spawn protocol*.

| Action | MCP tool |
|--------|----------|
| Parent spawn (when this skill emits a child lane) | **`mission_control_spawn_agent`** |
| **This** spawned lane terminal (and terminal re-emits) | **`mission_control_send_agent_result`** |

**Binding:**

- Run **`../README.md`** § *MCP spawn preflight* (rows M1–M8) before every MCP spawn; **forbidden** host-resolved identity keys in MCP args (`correlationId`, `dispatchId`, `slotId`, … — see README § *Host-resolved identity*).
- Inline skills on this mission stay **inline-only** — no spawn wire change unless the protocol step explicitly spawns a child lane.

## Checkpoint turn UX (skill-local)

Under Checkpoint trust (`trustLevel: checkpoint`), auto-advance scripted happy-path steps; emit structured choice only at **USER_CHECKPOINT** markers in this section, implicit external-wait surfaces, or exception paths. **No cross-skill inheritance** — gate defaults here apply only to **`author-prd`**; invoker mission **`plan and deliver`** documents Squad Leader gates — see **`plan-and-deliver/plan.mdc`** §3 spawn handover and **§3 resume (Author PRD agent)** for leader-lane ack / auto-chain.

**Real-dispatch test loop (binding):** After merge, run one full **`author-prd`** spawn on a Checkpoint dispatch through step **10** PRD approval (open-item + **Approve PRD** / **Revise PRD** co-present) and collect a developer verdict before the parent phase advances the next skill PR — per **Planning protocol skills UX** § *Single-concern strategy*.

Marker syntax: [`.sedea/centers/sedea/docs/user-checkpoint-marker-syntax.md`](.sedea/centers/sedea/docs/user-checkpoint-marker-syntax.md).

| Step | Checkpoint behavior | Gate |
|------|---------------------|------|
| **1–1b** — Validate + leader intake guard | Auto-advance when spawn `inputs` and docs write root resolve | **Gate** when required fields missing — [Missing inputs gate](#missing-inputs-gate-binding); **`failure`** when leader intake incomplete |
| **2–8** — Ledger, evidence, draft, write | Auto-advance on happy path | exception: write blocked → `failure` / `partial` |
| **9** — Refresh lane display | Auto-advance when spawn labels already match scope | run MCP display update then auto-advance when stale |
| **Post-write MCP result** (`developerApprovedPrd: false`) | External-wait on Squad Leader — leader **acks only** per **`plan.mdc`** §3 resume | **not** permission to advance **`master-planner`** on leader |
| **10** — Present for approval | **Gate** — **first developer-pick gate on this lane** | PRD approval (below) |
| **10a** — Open-item resolution | **Gate** — apply pick, return to step **10** | same multi-question approval shape |
| **11** — On approve | Auto-advance to terminal **`mission_control_send_agent_result`** | — |

### Missing inputs gate (binding)

When **`operationsDocsDirectory`** ( **`create`** ) or required spawn **`inputs`** cannot resolve and the Squad Leader cannot supply them on the leader lane:

USER_CHECKPOINT — provide missing Author PRD inputs on this lane.

| Option id | Label |
|-----------|--------|
| `provide-docs-root` | Supply operations docs directory |
| `provide-description` | Supply PRD description / intake fields |
| `defer` | Defer — return partial result to Squad Leader |
| `more-details` | More details for option _ |

- **Next-step resolution:** Auto-advance to step **2** when all required inputs resolve — no `USER_CHECKPOINT` on happy-path spawn handoff with complete `inputs`.

## Purpose

Gather evidence, calibrate section policy, and draft or update a Product or Feature Requirements Document that is complete and correct enough to feed the **research-and-development** center **`plan and deliver`** mission (`.sedea/centers/research-and-development/missions/plan-and-deliver/` — Master Plan via **`master-planner`**). The document structure is flexible: mandatory sections define planning readiness, important sections raise visible gaps, and optional sections appear only when the feature needs them.

## Inputs

- `prdTitle`
- `prdDescription` — required; collected on the Squad Leader lane in **plan.mdc** §2 before spawn
- `operation`: `create` or `manage`
- `targetPath` when supplied
- `sourceMaterials` (optional seed materials)
- **Docs write root** — **`operationsDocsDirectory`** from lane identity / spawn **`inputs`**, or explicit `targetPath` for **`manage`** — per **`.sedea/centers/research-and-development/rules/31_dispatch-scope.mdc`** § *Docs write root resolution*; do not construct `.sedea/operations/.../` path segments
- `operationsDocsDirectory` (required for **`create`** when `targetPath` is not supplied)
- `sectionPolicy`
- `existingPrdBody` for updates

## Procedure

1. Validate the operation and resolve **docs write root** (binding — **`.sedea/centers/research-and-development/rules/31_dispatch-scope.mdc`** § *Docs write root resolution*):

   - **Next-step resolution:** Auto-advance to step **1b** when validation passes — no `USER_CHECKPOINT` on happy path. When **`operationsDocsDirectory`** or required **`create`** fields are missing, open [Missing inputs gate](#missing-inputs-gate-binding) or return `failure` / `partial` with `outputs.missingFields` when the skill cannot collect on this lane.
 - `create` drafts a new PRD.
 - `manage` updates or reviews an existing PRD.
 - **`create`:** resolve write root: `operationsDocsDirectory` from spawn **`inputs`** or lane identity, or explicit `targetPath` when under `.sedea/operations/`. If none resolve → `failure` with `errors` and `summary` naming the gap — **do not write**.
 - **`create`:** reject paths outside the resolved docs write root.
 - **`manage`:** use explicit `targetPath` or handover-supplied existing PRD path only.
1b. **Leader intake guard** (spawned from **`plan and deliver`**):
 - If `prdDescription` is missing or empty → end with `failure` and ask the Squad Leader to complete **plan.mdc** §2 intake (do not draft).
 - When `sourceMaterials` is empty and the user did not explicitly choose **no sources yet** on the leader lane → run step 3 (evidence loop) before drafting; **do not** infer goals, requirements, or acceptance criteria from `prdTitle` alone.
 - Treat `prdDescription` and leader `sourceMaterials` as authoritative seeds; ask only for gaps mandatory sections still lack.

   - **Next-step resolution:** Auto-advance to step **2** when intake guard passes — no `USER_CHECKPOINT` on happy path.

2. Initialize a source ledger:
 - start from `prdDescription`, `sourceMaterials`, and any documents, URLs, notes, paths, excerpts, screenshots, thoughts, or related artifacts from the Squad Leader handoff.
 - leave the ledger empty when no seed materials were supplied.
 - preserve attribution so claims can be traced back to sources.
 - list unreadable or unavailable seed sources as blockers or caveats.

   - **Next-step resolution:** Auto-advance to step **3** — no `USER_CHECKPOINT` on this step.

3. Run the evidence-gathering loop:
 - use **AskQuestion**, **`mission_control_present_structured_choice`** per **`.sedea/centers/sedea/rules/2_ask-question-instructions.mdc`** § **Context and structured choice** to ask for documents, URLs, write-ups, thoughts, screenshots, mocks, user or stakeholder evidence, implementation constraints, and related PRDs when needed — put each choosable path in modal `options`, not prose menus.
 - read local files and `@path` references completely.
 - fetch readable URLs when available; if a URL is inaccessible, ask for an accessible copy or pasted content.
 - extract candidate facts into the source ledger after each added material.
 - stop collecting only when mandatory sections have enough evidence, or when the user explicitly says no more material is available.

   - **Next-step resolution:** Auto-advance to step **4** when the evidence loop completes — no `USER_CHECKPOINT` on happy path (structured choice within step **3** when gathering material is not a separate protocol gate).

4. Calibrate section policy:
 - use caller-provided policy when present.
 - ask the user to classify sections when their importance is unclear or when policy affects planning readiness.
 - otherwise apply the default policy below.
 - do not require optional sections when they are not relevant.

   - **Next-step resolution:** Auto-advance to step **5** — no `USER_CHECKPOINT` on this step.

5. Identify gaps and ask targeted questions:
 - identify product problem, users, goals, non-goals, requirements, dependencies, risks, rollout, and acceptance criteria.
 - ask targeted follow-up questions for missing mandatory content.
 - report important-section gaps and ask whether to gather more data, mark them optional/not applicable, or carry them as visible gaps.
 - mark contradictions and missing mandatory information as open questions until resolved.

   - **Next-step resolution:** Auto-advance to step **6** — no `USER_CHECKPOINT` on this step.

6. Draft or update the PRD:
 - keep section ordering stable unless the existing PRD uses a clearly intentional structure.
 - retain useful existing content in `manage` mode.
 - omit optional sections that have no supporting evidence.
 - include `TBD` only when the gap is intentionally surfaced for review.

   - **Next-step resolution:** Auto-advance to step **7** — no `USER_CHECKPOINT` on this step.

7. Run completeness review:
 - mandatory gaps block `planningReadiness: ready`.
 - important gaps are reported but do not always block planning.
 - optional gaps do not block planning.

   - **Next-step resolution:** Auto-advance to step **8** — no `USER_CHECKPOINT` on this step.

8. Write the document when an output path is resolved, then re-read it and verify the required sections.

   - **Next-step resolution:** Auto-advance to step **9** after successful write — emit non-terminal **`mission_control_send_agent_result`** with `developerApprovedPrd: false` when **`plan.mdc`** §3 requires leader ack before step **10**; do **not** treat that ack as PRD approval.

9. **Refresh lane display** when spawn labels are generic — MCP **`mission_control_update_lane_display`** on this lane only (rule **50**). **`title`:** `PRD-{semantic title}` where semantic title is **`prdTitle`** or approved PRD heading — see [rule **50**](../../../../rules/50_mission-control-display-metadata-discipline.mdc) § *Lane title prefix conventions*.

   - **Next-step resolution:** Auto-advance to step **10** — no `USER_CHECKPOINT` on this step.

10. **Present for approval** — Recap path, `planningReadiness`, and gap summary. Call **`mission_control_present_structured_choice`** (spawned lanes) or **AskQuestion** per **`.sedea/centers/sedea/rules/2_ask-question-instructions.mdc`**.

USER_CHECKPOINT — approve, revise, or resolve open items on this PRD before Squad Leader §4 seed compile.

 **Detect open items** before building the modal: `outputs.openQuestions`, missing mandatory or important sections, unresolved `TBD` markers, contradictions, and `planningReadiness: partial` or `blocked`.

 **When open items exist** — **one modal, multiple questions**:
 - **`displayMarkdown`:** numbered list — each open item elaborated (section or PRD location, gap text, why a decision matters, agent-proposed resolution options).
 - **`askQuestion.questions`:** **one entry per open item** — each with its own `id`, `prompt`, and `options` scoped to **that item only** (for example accept proposed resolution A/B, mark not applicable, defer to §12 follow-up, gather more evidence). **Forbidden:** merging all open-item picks into a single `questions` entry.
 - **Last question** (always final in the array): `id` e.g. `prd-approval`, `prompt` summarizing readiness to approve or revise, `options`: **Approve PRD**, **Revise PRD**, **More details for option _**.
 - **Forbidden:** one combined question whose `options` mixes per-item resolution picks with **Approve PRD** / **Revise PRD**; a separate resolve-only modal that omits **Approve PRD** / **Revise PRD** until all items are cleared.
 - **Many open items:** batch across turns when one modal would be impractical; **each batch still ends with** the **Approve PRD** / **Revise PRD** question as the **last** `questions` entry (developer may approve mid-stream with remaining gaps documented in §12).

 **When no open items remain** (or only surfaced §12 notes the developer may accept as-is) — single `questions` entry with minimum options:
 - **Approve PRD** — accept for **`master-planner`** on this dispatch (allowed when `planningReadiness: ready` even if §12 lists planner-owned follow-ups)
 - **Revise PRD** — edit on this lane, return to step 10
 - **More details for option _**

 Do **not** treat the write alone as developer approval.

10a. **On open-item resolution pick** — Apply the selected resolution for **that question's item** to the PRD and source ledger, re-run step 7 completeness review, rewrite when needed (step 8), then return to step 10 with the same multi-question approval shape.

   - **Next-step resolution:** Re-open step **10** PRD approval gate after each resolution pick.

11. **On approve** — Set `outputs.developerApprovedPrd: true`, emit terminal **`mission_control_send_agent_result`** with `continuationStatus: terminal` and `continuationOwner: squad-leader`.

   - **Next-step resolution:** Auto-advance to terminal MCP result — no additional `USER_CHECKPOINT` on this step.

## Default section policy

### Mandatory

These sections define whether a PRD can be treated as complete enough for planning.

1. **Summary** — 1-3 paragraphs describing the feature or product change.
2. **Problem / Background** — current state, user pain, business context, or why this should exist.
3. **Goals** — concrete outcomes the feature must achieve.
4. **Non-goals** — explicit exclusions that protect scope.
5. **Scope / Requirements** — user-facing behavior, system behavior, UX surface, or functional requirements.
6. **Acceptance criteria** — observable checks for "done".
7. **Open questions / Review notes** — unresolved decisions, assumptions, and known gaps.

### Important

These sections should be populated when the feature has the relevant surface area.

1. **Source links** — mocks, designs, related PRDs, codebases, plans, tickets, research, or user/stakeholder evidence.
2. **Users and use cases** — personas, workflows, and job-to-be-done context.
3. **Data / interface plan** — interfaces, data shapes, events, data derivations, migrations, integrations, or analytics.
4. **Dependencies / prerequisites** — upstream plans, release controls, contracts, teams, or ordering constraints.
5. **Risks and mitigations** — known technical, product, rollout, or operational risks.
6. **Rollout / release controls** — gates, staged launch, fallback behavior, and stop conditions.
7. **Alternatives considered** — approaches rejected and why.
8. **Follow-ups** — useful work intentionally deferred from this PRD.

### Optional

Include only when the feature benefits from the detail.

1. **Experience surface breakdown** — workflow, surface, component, or interaction sections.
2. **Metrics / success measures** — adoption, conversion, cost, reliability, or quality signals.
3. **Technical derivations** — formulas, aggregation rules, query behavior, or synchronization strategy.
4. **Test strategy** — high-level verification notes before a plan breaks work into PRs.
5. **Team review history** — dated notes from synchronous review sessions.
6. **Appendix** — raw notes, glossary, research excerpts, or extended tables.

### Not Applicable

Mark sections not applicable when they do not fit the feature. Examples: no interface plan for copy-only changes, no rollout section for an internal document-only artifact, or no experience surface for a system-internal contract.

## Flexible PRD template

Use this template as a starting point. Remove optional sections that do not apply. Rename sections when the feature's domain has clearer language, but preserve the mandatory meaning.

```md
# <Feature or product name>

**Status:** Draft
**Sources:** <links, paths, or notes>
**Codebases / systems in scope:** <codebases, services, tools, or none>

## 1. Summary

<What is being built or changed, for whom, and why now.>

## 2. Problem / Background

<Current state, user pain, business context, prior decisions, and relevant constraints.>

## 3. Goals

1. <Outcome>
2. <Outcome>

## 4. Non-goals

| Out of scope | Why deferred / where it belongs |
| --- | --- |
| <Item> | <Reason> |

## 5. Scope / Requirements

### 5.1 <Requirement area>

- <Behavior, surface, rule, or workflow>
- <Important detail>

### 5.2 <Requirement area>

- <Behavior, surface, rule, or workflow>

## 6. Data / Interface / Technical Plan

| Area | Contract | Notes |
| --- | --- | --- |
| <Section> | <Interface, data shape, event, module, workflow, or none> | <Use, constraints, or derivation> |

## 7. Rollout / Release Controls

- <Gate, cohort, fallback, release note, or stop condition>

## 8. Dependencies / Prerequisites

- <Dependency and why it matters>

## 9. Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| <Risk> | <Mitigation> |

## 10. Acceptance Criteria

- <Observable done condition>
- <Observable done condition>

## 11. Follow-ups

- <Deferred item>

## 12. Open Questions / Review Notes

- <Question, assumption, or decision>
```

## Completeness rules

- A PRD is **complete** when every mandatory section has enough specific content for a planner to create a Master Plan without inventing product intent.
- A PRD is **correct** when claims are source-grounded, open questions are explicit, and scope boundaries are not contradicted elsewhere in the document.
- Important sections may remain incomplete only when the gap is visible and the user accepts the PRD as planning-ready or partial.
- Optional sections should be omitted rather than padded with filler.
- `TBD` markers are allowed only when paired with either an explicit approver or a clear explanation of how implementation can proceed without that section.

## Completion (spawned)

The **`plan and deliver`** Squad Leader spawns this skill on a child lane (**`plan.mdc`** §3). The **Author PRD agent** owns recap, approval, and revision (steps 10–11) — the Squad Leader does **not** duplicate approval on the leader lane. Under Checkpoint trust, step **10** is the **USER_CHECKPOINT** surface (open-item + **Approve PRD** / **Revise PRD** co-present) — see **`## Checkpoint turn UX (skill-local)`** above; leader lane follows **`plan.mdc`** §3 resume only.

### MCP result preflight (`mission_control_send_agent_result`)

| Step | Check |
|------|--------|
| R1 | Call **`mission_control_send_agent_result`** with **`status`**, **`summary`**, optional **`outputs`** / **`errors`** |
| R2 | **Forbidden args absent** — no **`correlationId`**, **`dispatchId`**, **`slotId`**, or other host-resolved keys |
| R3 | Populate **`outputs`** from the required field list below |
| R4 | Re-emit updated MCP result after user-requested follow-up on this lane (same spawn session; host resolves **`correlationId`**) |

Top-level `status`: `success`, `partial`, `failure`, `aborted`, or `abandoned`.

`summary`: 1–3 sentences — PRD path, `planningReadiness`, and whether mandatory gaps remain.

Required `outputs` fields:

- `outputs.prdPath` — workspace-relative or absolute path to the written or updated PRD (omit or empty when no usable file)
- `outputs.prdRef` — same as `prdPath` or `@path` form for **`master-planner`** seed
- `outputs.prdTitle`
- `outputs.developerApprovedPrd` — `true` only after **Approve PRD** on this lane
- `outputs.sectionPolicy` — map of section → `mandatory` | `important` | `optional` | `not applicable`
- `outputs.completedSections` — list of section ids or headings populated
- `outputs.missingMandatorySections` — list blocking `planningReadiness: ready`
- `outputs.missingImportantSections` — list of visible gaps (may be non-empty when `status` is `success` or `partial`)
- `outputs.openQuestions` — unresolved decisions or contradictions
- `outputs.sourceLedger` — attributed sources used in the draft
- `outputs.planningReadiness` — `ready`, `partial`, or `blocked`
- `outputs.continuationOwner` — `author-prd-agent` while approval pending; `squad-leader` when terminal approved
- `outputs.continuationStatus` — `active` until approval; `terminal` when approved or abandoned
- `outputs.recommendedNextAction` — when approved, Squad Leader auto-chains **`plan.mdc`** §4 seed + §5 **`master-planner`** on **this dispatch**

After initial write (step 8), before approval: emit **`mission_control_send_agent_result`** with `developerApprovedPrd: false`, `continuationOwner: author-prd-agent`, `continuationStatus: active` so the Squad Leader **acknowledges only**.

Status guidance:

- `success` — PRD written or updated; mandatory sections satisfied; `planningReadiness` is `ready` (important gaps may remain if surfaced).
- `partial` — usable PRD path but mandatory gaps, thin content, or `planningReadiness` is `partial` or `blocked`; include recovery steps in `summary` and `openQuestions`.
- `failure` — no usable PRD artifact (write blocked, invalid inputs after retries); populate `errors`.
- `aborted` / `abandoned` — user or agent stopped before a deliverable PRD.

On spawned lanes, call **`mission_control_present_structured_choice`** **before** **`mission_control_send_agent_result`** in the same message when the turn ends (rule **2** § *Same message as spawn terminal*). Stop after the MCP result call. Do not spawn downstream planning agents from this skill.

## Completion (inline)

Report **`## Completion (spawned)`** `outputs` in prose. Do **not** emit host protocol lines. **`plan and deliver`** runs this skill **spawned only**.

## Safety constraints

- Do not invent source evidence.
- Do not treat optional sections as mandatory unless the caller or user explicitly marks them mandatory.
- Do not overwrite an existing PRD without preserving useful existing content.
- In `create` mode, do not write outside **`operationsDocsDirectory`** (`.sedea/operations/.../docs/`).
- In `manage` mode, update only the existing PRD target supplied by the caller or user.
