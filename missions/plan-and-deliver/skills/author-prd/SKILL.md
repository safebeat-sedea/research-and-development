---
name: author-prd
description: Gather evidence and draft or update a flexible Product or Feature Requirements Document.
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
  operationsUserId:
    type: string
    description: Current Mission Control operations user id for user-private operations paths.
    required: true
laneRules:
  - ".sedea/centers/sedea/rules/2_ask-question-instructions.mdc"
  - ".sedea/centers/research-and-development/missions/plan-and-deliver/skills/author-prd/SKILL.md"
  - ".sedea/centers/research-and-development/missions/plan-and-deliver/plan.mdc"
  - ".sedea/centers/research-and-development/rules/31_operations-user-id.mdc"
warmUpRules:
  - ".sedea/centers/research-and-development/missions/plan-and-deliver/plan.mdc"
  - ".sedea/centers/research-and-development/missions/plan-and-deliver/skills/README.md"
  - ".sedea/centers/research-and-development/docs/development-process.md"
  - ".sedea/centers/research-and-development/rules/31_operations-user-id.mdc"
---

# Skill: author-prd

## Purpose

Gather evidence, calibrate section policy, and draft or update a Product or Feature Requirements Document that is complete and correct enough to feed the **research-and-development** center **`plan and deliver`** mission (`.sedea/centers/research-and-development/missions/plan-and-deliver/` — Master Plan via **`planner`**). The document structure is flexible: mandatory sections define planning readiness, important sections raise visible gaps, and optional sections appear only when the feature needs them.

## Inputs

- `prdTitle`
- `prdDescription` — required; collected on the Squad Leader lane in **plan.mdc** §2 before spawn
- `operation`: `create` or `manage`
- `targetPath` when supplied
- `sourceMaterials` (optional seed materials)
- `operationsUserId` — `create` writes under `.sedea/operations/<operationsUserId>/docs/`
- `sectionPolicy`
- `existingPrdBody` for updates

## Procedure

1. Validate the operation:
 - `create` drafts a new PRD.
 - `manage` updates or reviews an existing PRD.
 - `create` always resolves output under `.sedea/operations/<operationsUserId>/docs/`; do not create PRDs under `.sedea/operations/joint/docs/`.
1b. **Leader intake guard** (spawned from **`plan and deliver`**):
 - If `prdDescription` is missing or empty → end with `failure` and ask the Squad Leader to complete **plan.mdc** §2 intake (do not draft).
 - When `sourceMaterials` is empty and the user did not explicitly choose **no sources yet** on the leader lane → run step 3 (evidence loop) before drafting; **do not** infer goals, requirements, or acceptance criteria from `prdTitle` alone.
 - Treat `prdDescription` and leader `sourceMaterials` as authoritative seeds; ask only for gaps mandatory sections still lack.
2. Initialize a source ledger:
 - start from `prdDescription`, `sourceMaterials`, and any documents, URLs, notes, paths, excerpts, screenshots, thoughts, or related artifacts from the Squad Leader handoff.
 - leave the ledger empty when no seed materials were supplied.
 - preserve attribution so claims can be traced back to sources.
 - list unreadable or unavailable seed sources as blockers or caveats.
3. Run the evidence-gathering loop:
 - use **AskQuestion**, **`MC_PHASED_RESPONSE_V1`** per **`.sedea/centers/sedea/rules/2_ask-question-instructions.mdc`** § **Context and structured choice** to ask for documents, URLs, write-ups, thoughts, screenshots, mocks, user or stakeholder evidence, implementation constraints, and related PRDs when needed — put each choosable path in modal `options`, not prose menus.
 - read local files and `@path` references completely.
 - fetch readable URLs when available; if a URL is inaccessible, ask for an accessible copy or pasted content.
 - extract candidate facts into the source ledger after each added material.
 - stop collecting only when mandatory sections have enough evidence, or when the user explicitly says no more material is available.
4. Calibrate section policy:
 - use caller-provided policy when present.
 - ask the user to classify sections when their importance is unclear or when policy affects planning readiness.
 - otherwise apply the default policy below.
 - do not require optional sections when they are not relevant.
5. Identify gaps and ask targeted questions:
 - identify product problem, users, goals, non-goals, requirements, dependencies, risks, rollout, and acceptance criteria.
 - ask targeted follow-up questions for missing mandatory content.
 - report important-section gaps and ask whether to gather more data, mark them optional/not applicable, or carry them as visible gaps.
 - mark contradictions and missing mandatory information as open questions until resolved.
6. Draft or update the PRD:
 - keep section ordering stable unless the existing PRD uses a clearly intentional structure.
 - retain useful existing content in `manage` mode.
 - omit optional sections that have no supporting evidence.
 - include `TBD` only when the gap is intentionally surfaced for review.
7. Run completeness review:
 - mandatory gaps block `planningReadiness: ready`.
 - important gaps are reported but do not always block planning.
 - optional gaps do not block planning.
8. Write the document when an output path is resolved, then re-read it and verify the required sections.
9. **Refresh lane display** when spawn labels are generic — MCP **`mission_control_update_lane_display`** on this lane only (rule **50**).
10. **Present for approval** — Recap path, `planningReadiness`, and gap summary. Use **`MC_PHASED_RESPONSE_V1`** with minimum options:
    - **Approve PRD** — accept for **`planner`** on this dispatch
    - **Revise PRD** — edit on this lane, return to step 10
    - **More details for option _**
    Do **not** treat the write alone as developer approval.
11. **On approve** — Set `outputs.developerApprovedPrd: true`, emit terminal **`AGENT_RESULT_RESPONSE_V1`** with `continuationStatus: terminal` and `continuationOwner: squad-leader`.

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

The **`plan and deliver`** Squad Leader spawns this skill on a child lane (**`plan.mdc`** §3). The **Author PRD agent** owns recap, approval, and revision (steps 10–11) — the Squad Leader does **not** duplicate approval on the leader lane.

### Host protocol line (required)

Emit **exactly one** line on its own: `AGENT_RESULT_RESPONSE_V1` immediately followed by a single JSON object on the **same** line. Required keys: `version` (1), `correlationId` (from the spawn request), `status`, `summary`, `outputs`, `errors` (use `[]` when none). Populate `outputs` from the list below. The emitted line must be **valid JSON** (no `{...}` placeholders in the actual output). Re-emit an **updated** line after user-requested follow-up on this lane (same `correlationId`). See **`.sedea/centers/sedea/skills/README.md`** § *Spawned terminal line* and **`.sedea/centers/sedea/rules/4_mission.mdc`** § *Agent session closure*.

Top-level `status`: `success`, `partial`, `failure`, `aborted`, or `abandoned`.

`summary`: 1–3 sentences — PRD path, `planningReadiness`, and whether mandatory gaps remain.

Required `outputs` fields:

- `outputs.prdPath` — workspace-relative or absolute path to the written or updated PRD (omit or empty when no usable file)
- `outputs.prdRef` — same as `prdPath` or `@path` form for **`planner`** seed
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
- `outputs.recommendedNextAction` — when approved, Squad Leader auto-chains **`plan.mdc`** §4 seed + §5 **`planner`** on **this dispatch**

After initial write (step 8), before approval: emit **`AGENT_RESULT_RESPONSE_V1`** with `developerApprovedPrd: false`, `continuationOwner: author-prd-agent`, `continuationStatus: active` so the Squad Leader **acknowledges only**.

Status guidance:

- `success` — PRD written or updated; mandatory sections satisfied; `planningReadiness` is `ready` (important gaps may remain if surfaced).
- `partial` — usable PRD path but mandatory gaps, thin content, or `planningReadiness` is `partial` or `blocked`; include recovery steps in `summary` and `openQuestions`.
- `failure` — no usable PRD artifact (write blocked, invalid inputs after retries); populate `errors`.
- `aborted` / `abandoned` — user or agent stopped before a deliverable PRD.

On spawned lanes, put **`MC_PHASED_RESPONSE_V1`** on **line 1** and **`AGENT_RESULT_RESPONSE_V1`** on the **last line** of the same message when the turn ends (rule **2** § *Same message as spawn terminal*). Stop after the terminal line. Do not spawn downstream planning agents from this skill.

## Completion (inline)

Report **`## Completion (spawned)`** `outputs` in prose. Do **not** emit host protocol lines. **`plan and deliver`** runs this skill **spawned only**.

## Safety constraints

- Do not invent source evidence.
- Do not treat optional sections as mandatory unless the caller or user explicitly marks them mandatory.
- Do not overwrite an existing PRD without preserving useful existing content.
- In `create` mode, do not write outside `.sedea/operations/<operationsUserId>/docs/`.
- In `manage` mode, update only the existing PRD target supplied by the caller or user.
