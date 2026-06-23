---
name: quick-fix-plan
description: >-
  Quick Fix Plan agent — minimal parent plan scaffold plus inline new-plan and
  pr-plan for a single PR (complexity ≤6). Spawned from quick-fix §3 only.
designation:
  allowed: Quick-fix parent plan scaffold; inline new-plan and pr-plan on planning lane
  forbidden: Application implementation; worktree ship; dispatch resolution on leader lane
inputs:
  intakeMode:
    type: string
    description: provide-list or description-of-fix from Squad Leader §2 intake.
    required: true
  changeList:
    type: array
    description: Non-empty confirmed bullet list of quick-fix items.
    required: true
  changeDescription:
    type: string
    description: Required when intakeMode is description-of-fix; prose source for bullets.
    required: false
  title:
    type: string
    description: Plan tree title from intake.
    required: false
  operationsUserId:
    type: string
    description: Operations user id from Mission Control session context.
    required: true
  centerSlug:
    type: string
    description: Center slug; quick-fix uses research-and-development.
    required: true
  complexityConfirmed:
    type: boolean
    description: True when developer attested each item is complexity 6 or under.
    required: true
laneRules:
  - ".sedea/centers/sedea/rules/2_ask-question-instructions.mdc"
  - ".sedea/centers/research-and-development/rules/30_planning-target-resolution.mdc"
  - ".sedea/centers/research-and-development/missions/quick-fix/skills/quick-fix-plan/SKILL.md"
  - ".sedea/centers/research-and-development/missions/plan-and-deliver/skills/README.md"
warmUpRules:
  - ".sedea/centers/research-and-development/missions/quick-fix/plan.mdc"
  - ".sedea/centers/research-and-development/missions/plan-and-deliver/skills/README.md"
  - ".sedea/centers/research-and-development/docs/development-process.md"
  - ".sedea/centers/research-and-development/rules/10_plan-naming-convention.mdc"
---

# Quick Fix Plan

**Normative mode:** **Spawned only** on **`quick-fix`** — child lane owns minimal parent scaffold, inline **`new-plan`**, inline **`pr-plan`**, and **`coding-session`** spawn via **`pr-plan`** §5d. Does **not** run **`planner`**, **`pr-breakdown`**, **`delivery-phases`**, or **`phase-planner`**.

**Procedure authority:** [`.sedea/centers/research-and-development/missions/quick-fix/plan.mdc`](.sedea/centers/research-and-development/missions/quick-fix/plan.mdc) §4 — execute that section on **this** lane.

## Warm-up manifest (spawned)

Per [`.sedea/centers/sedea/docs/lane-manifest-contract.md`](.sedea/centers/sedea/docs/lane-manifest-contract.md). Spawned from **`quick-fix`** §3 only. Host merge: `effectiveWarmUp = dedupe(bootstrapRules → laneRules → skillWarmUp)`. Frontmatter matches this table.

**Invoker `warmUpRules` override (binding):** On **`AGENT_RUN_REQUEST_V1`**, merge skill frontmatter **`warmUpRules`** and ensure **`quick-fix/plan.mdc`** is present — **not** `plan-and-deliver/plan.mdc`.

### `bootstrapRules` — host-resolved (R&D layer)

| Path | Purpose |
|------|---------|
| `.sedea/centers/research-and-development/rules/bootstrap.mdc` | Sole R&D `alwaysApply: true` bootstrap |

### `skillWarmUp` — frontmatter `warmUpRules`

| Path | Purpose |
|------|---------|
| `.sedea/centers/research-and-development/missions/quick-fix/plan.mdc` | Mission protocol §§3–5 |
| `.sedea/centers/research-and-development/missions/plan-and-deliver/skills/README.md` | Spawn contracts, inline **`new-plan`** / **`pr-plan`** |
| `.sedea/centers/research-and-development/docs/development-process.md` | Cadence |
| `.sedea/centers/research-and-development/rules/10_plan-naming-convention.mdc` | Plan naming |

### `laneRules` — frontmatter `laneRules`

| Path | Purpose |
|------|---------|
| `.sedea/centers/sedea/rules/2_ask-question-instructions.mdc` | Structured choice |
| `.sedea/centers/research-and-development/rules/30_planning-target-resolution.mdc` | Planning target resolution |
| `.sedea/centers/research-and-development/missions/quick-fix/skills/quick-fix-plan/SKILL.md` | This skill |
| `.sedea/centers/research-and-development/missions/plan-and-deliver/skills/README.md` | Inline execution contracts |

## Spawn contract

**Invokers:** **`quick-fix`** Squad Leader §3 only. **`skillPath`** for **`AGENT_RUN_REQUEST_V1`**:

`.sedea/centers/research-and-development/missions/quick-fix/skills/quick-fix-plan/SKILL.md`

**Inline on this lane (not separate spawns):** [`.sedea/centers/research-and-development/missions/plan-and-deliver/skills/new-plan/SKILL.md`](.sedea/centers/research-and-development/missions/plan-and-deliver/skills/new-plan/SKILL.md), [`.sedea/centers/research-and-development/missions/plan-and-deliver/skills/pr-plan/SKILL.md`](.sedea/centers/research-and-development/missions/plan-and-deliver/skills/pr-plan/SKILL.md) — per **`quick-fix/plan.mdc`** §4 steps 3–5.

Run **`../plan-and-deliver/skills/README.md`** § *Universal spawn preflight* before emit.

## Steps

1. Validate spawn **`inputs`**: non-empty **`changeList`**, **`operationsUserId`**, **`complexityConfirmed: true`**, **`intakeMode`**; when **`description-of-fix`**, require **`changeDescription`**.
2. Execute **`quick-fix/plan.mdc`** §4 procedure (minimal parent → inline **`new-plan`** → inline **`pr-plan`** → **`coding-session`** §5d spawn).
3. Emit child terminal **`AGENT_RESULT_RESPONSE_V1`** per **`## Completion (spawned)`** below.

**Forbidden:** second PR row; **`planner`** / **`pr-breakdown`** / **`delivery-phases`** / **`phase-planner`**; Squad Leader **`MC_DISPATCH_RESOLVED_V1`** on this lane.

## Completion (spawned)

### Host protocol line (required)

Emit **exactly one** line: `AGENT_RESULT_RESPONSE_V1` + JSON on the **same** line. Required keys: `version` (1), `correlationId` (from spawn), `status`, `summary`, `outputs`, `errors` (`[]` when none).

Required `outputs` fields:

- `outputs.parentPlanPath`
- `outputs.targetPlanPath`
- `outputs.readyForImplementation`
- `outputs.prPlanHandoffReady` (or equivalent per inline **`pr-plan`** handoff)
- `outputs.activeLanes` — include detached **`coding-session`** row when spawned
- `outputs.openLedgerEntries`
- `outputs.remainingTasks`
- `outputs.continuationOwner` — `"squad-leader"` on terminal success
- `outputs.continuationStatus` — `"terminal"` when PR plan handoff complete

Stop after each terminal line (see **`../plan-and-deliver/skills/README.md`** § *Terminal stop (normative)*). Do **not** re-spawn **`new-plan`** or **`pr-plan`** as separate child lanes.
