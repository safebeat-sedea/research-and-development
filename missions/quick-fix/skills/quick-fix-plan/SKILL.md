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
    description: description-of-fix from Squad Leader §2 intake (sole intake mode).
    required: true
  changeList:
    type: array
    description: Non-empty confirmed synthesized bullet list of quick-fix items.
    required: true
  changeDescription:
    type: string
    description: Required free-form prose source for synthesized bullets.
    required: true
  title:
    type: string
    description: Plan tree title from intake.
    required: false
  dispatch scope:
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

**Normative mode:** **Spawned only** on **`quick-fix`** — child lane owns minimal parent scaffold, inline **`new-plan`**, inline **`pr-plan`**, and **`coding-session`** spawn via **`pr-plan`** §5d. Does **not** run **`master-planner`**, **`pr-breakdown`**, **`delivery-phases`**, or **`phase-planner`**.

**Procedure authority:** [`.sedea/centers/research-and-development/missions/quick-fix/plan.mdc`](.sedea/centers/research-and-development/missions/quick-fix/plan.mdc) §4 — execute that section on **this** lane.

## Warm-up manifest (spawned)

Per [`.sedea/centers/sedea/docs/lane-manifest-contract.md`](.sedea/centers/sedea/docs/lane-manifest-contract.md). Spawned from **`quick-fix`** §3 only. Host merge: `effectiveWarmUp = dedupe(bootstrapRules → laneRules → skillWarmUp)`. Frontmatter matches this table.

**Invoker `warmUpRules` override (binding):** On **`mission_control_spawn_agent`**, merge skill frontmatter **`warmUpRules`** and ensure **`quick-fix/plan.mdc`** is present — **not** `plan-and-deliver/plan.mdc`.

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

## Agent messaging (MCP)

**MCP spawn/result skill.** Parent→child spawn and child terminal result use MCP tools per **`.sedea/centers/sedea/rules/4_mission.mdc`** § *Agent-to-agent spawn protocol*.

| Action | MCP tool |
|--------|----------|
| Parent spawn (when this skill emits a child lane) | **`mission_control_spawn_agent`** |
| **This** spawned lane terminal (and terminal re-emits) | **`mission_control_send_agent_result`** |

**Binding:**

- Run **`../README.md`** § *MCP spawn preflight* (rows M1–M8) before every MCP spawn; **forbidden** host-resolved identity keys in MCP args (`correlationId`, `dispatchId`, `slotId`, … — see README § *Host-resolved identity*).
- Inline skills on this mission stay **inline-only** — no spawn wire change unless the protocol step explicitly spawns a child lane.


## Spawn contract

**Invokers:** **`quick-fix`** Squad Leader §3 only. **`skillPath`** for **`mission_control_spawn_agent`**:

`.sedea/centers/research-and-development/missions/quick-fix/skills/quick-fix-plan/SKILL.md`

**Inline on this lane (not separate spawns):** [`.sedea/centers/research-and-development/missions/plan-and-deliver/skills/new-plan/SKILL.md`](.sedea/centers/research-and-development/missions/plan-and-deliver/skills/new-plan/SKILL.md), [`.sedea/centers/research-and-development/missions/plan-and-deliver/skills/pr-plan/SKILL.md`](.sedea/centers/research-and-development/missions/plan-and-deliver/skills/pr-plan/SKILL.md) — per **`quick-fix/plan.mdc`** §4 steps 3–5.

Run **`../plan-and-deliver/skills/README.md`** § *Universal spawn preflight* before emit.

## Checkpoint turn UX (skill-local)

Under Checkpoint trust (`trustLevel: checkpoint`), auto-advance scripted happy-path steps; emit structured choice only at **USER_CHECKPOINT** markers in this section, implicit external-wait surfaces, or exception paths. **No cross-skill inheritance** — gate defaults here apply only to **`quick-fix-plan`**; invoker mission **`quick-fix`** documents Squad Leader gates — see **`quick-fix/plan.mdc`** §§1–3 and §8 for intake, child-failure, and dispatch-resolution markers.

**Real-dispatch test loop (binding):** After merge, run one full **`quick-fix-plan`** spawn on a Checkpoint dispatch through inline **`pr-plan`** §5c and collect a developer verdict before the parent phase advances the next cross-mission skill PR — per **Planning protocol skills UX** § *Single-concern strategy*.

Marker syntax: [`.sedea/centers/sedea/docs/user-checkpoint-marker-syntax.md`](.sedea/centers/sedea/docs/user-checkpoint-marker-syntax.md).

| Step | Checkpoint behavior | Gate |
|------|---------------------|------|
| **1** — Validate spawn `inputs` | Auto-advance when Squad Leader §3 handoff supplies complete `inputs` | **Gate** when required fields missing — [Missing inputs gate](#missing-inputs-gate-binding) |
| **2a** — Resolve `HOSTING_ROOT` | Auto-advance | exception: main-clone invariant failure |
| **2b** — Minimal parent scaffold | Auto-advance on successful write | exception: write failure → `partial` / `failure` |
| **2c** — Inline **`new-plan`** (indexed child) | Auto-advance — scope pre-confirmed on **`quick-fix`** §2; skip **`new-plan`** step **3** populator approval | exception: indexed validation / depth-first blockers per **`new-plan/SKILL.md`** |
| **2d** — Inline **`pr-plan`** steps **1–4** | Auto-advance through §§1–4 draft | open items per **`pr-plan`** Step **5-open-items** when multiple gaps |
| **§5c** — Implementation handoff (inline **`pr-plan`**) | **Gate** — **first developer-pick gate on this lane** | **`pr-plan`** §5c — start coding session (below) |
| **§5d** — Spawn **`coding-session`** | Act-after-select; **#external-wait** on detached child | — |
| **§5e** — Aggregate **`coding-session`** child | **#external-wait**; re-emit terminal when child completes | — |
| **3** — Terminal **`mission_control_send_agent_result`** | Auto-advance after §5e merge or honest `partial` / `failure` | exception: blocked handoff → report without prose idle |

### Missing inputs gate (binding)

When **`changeList`**, **`complexityConfirmed`**, **`intakeMode`**, or **`changeDescription`** are missing:

USER_CHECKPOINT — provide missing quick-fix planning inputs on this lane.

| Option id | Label |
|-----------|--------|
| `provide-change-list` | Supply change list |
| `provide-description` | Supply fix description |
| `defer` | Defer — return partial result to Squad Leader |
| `more-details` | More details for option _ |

- **Next-step resolution:** Auto-advance to step **2** when all required inputs resolve — no `USER_CHECKPOINT` on happy-path spawn handoff with complete `inputs`.

### Inline handoff — **quick-fix-plan** → **`new-plan`**

Run **`new-plan`** **inline on this lane** — **do not** emit **`mission_control_spawn_agent`** for **`new-plan`**. Load [`.sedea/centers/research-and-development/missions/plan-and-deliver/skills/new-plan/SKILL.md`](../../plan-and-deliver/skills/new-plan/SKILL.md), construct inline context from the table below, follow that skill's indexed-child steps, and merge stub paths before inline **`pr-plan`**.

| Inline context field | Value |
|----------------------|--------|
| `mode` | `indexed-child` |
| `parentPlanPath` / `parentPlanSlug` | From step **2b** minimal parent |
| `index` | `1` (single PR row) |
| `childKind` | `pr-plan` |
| `requestedPopulatorSkill` | `pr-plan` |
| `upstreamSkill` | `"quick-fix-plan"` |
| `ledgerParent` | Parent slug from step **2b** sidecar (`parent: null` → parent slug of minimal parent file) |

**Skip populator approval (binding):** Squad Leader **`quick-fix`** §2 already confirmed scope and complexity; **`requestedPopulatorSkill: pr-plan`** is locked by spawn contract — proceed from stub write to inline **`pr-plan`** without **`new-plan`** step **3** modal.

### Inline handoff — **quick-fix-plan** → **`pr-plan`**

Run **`pr-plan`** **inline on this lane** — **do not** emit **`mission_control_spawn_agent`** for **`pr-plan`**. Load [`.sedea/centers/research-and-development/missions/plan-and-deliver/skills/pr-plan/SKILL.md`](../../plan-and-deliver/skills/pr-plan/SKILL.md), construct inline context from the table below, follow that skill's steps through §5e, and merge **`## Completion (inline)`** fields into this skill's terminal **`outputs`**.

| Inline context field | Value |
|----------------------|--------|
| `targetPlanPath` / `targetPlanSlug` | Child PR stub from inline **`new-plan`** |
| `parentPlanPath` / `parentPlanSlug` | Minimal parent from step **2b** |
| `parentIndex` | `1` |
| `parentAgentRole` | `"quick-fix-plan-agent"` |
| `upstreamSkill` | `"quick-fix-plan"` |
| `parentRowSingleConcern` | Single quick-fix concern synthesized from **`changeList`** / **`changeDescription`** |
| `ledgerParent` | Parent slug from step **2b** |

Inline **`pr-plan`** may still spawn **`coding-session`** per **`pr-plan`** §5d; this lane aggregates that child result per **`pr-plan`** §5e before step **3** terminal emit.

## Steps

1. **Validate spawn `inputs`** — non-empty **`changeList`**, **`complexityConfirmed: true`**, **`intakeMode: description-of-fix`**, and required **`changeDescription`**.

   - **Next-step resolution:** Auto-advance to step **2** when validation passes — no `USER_CHECKPOINT` on happy path. When required fields are missing, open [Missing inputs gate](#missing-inputs-gate-binding) or return `partial` with `outputs.missingFields` when this lane cannot collect inputs.

2. **Execute **`quick-fix/plan.mdc`** §4 procedure** on **this** lane:

   **2a. Resolve `HOSTING_ROOT`** — operations writes on main hosting clone only per **`0_hosting-repo.mdc`**.

   - **Next-step resolution:** Auto-advance to **2b** — no `USER_CHECKPOINT` on this substep.

   **2b. Minimal parent plan** — scaffold under `.sedea/operations/.../plans/` with title from **`title`**, **`### PR list`** with exactly one row summarizing **`changeList`**, sidecar **`parent: null`**, **`status: started`**.

   - **Next-step resolution:** Auto-advance to **2c** on successful write — exception: write failure → `partial` / `failure` terminal.

   **2c. Inline **`new-plan`** — per [Inline handoff — quick-fix-plan → new-plan](#inline-handoff--quick-fix-plan--new-plan); indexed child **`index: 1`**, **`childKind: pr-plan`**.

   - **Next-step resolution:** Auto-advance to **2d** after stub + parent `Plan:` link — skip populator approval gate.

   **2d. Inline **`pr-plan`** — populate §§1–4 from **`changeList`** / **`initiatingPrompt`**; §§5–8 remain **`_TBD_`** for **`coding-session`**. Run §5a–5b readiness; open §5c when ready.

USER_CHECKPOINT — approve implementation handoff and start coding session (inline **`pr-plan`** §5c; fill §§5–8 on detached **`coding-session`** lane).

   Required options per **`pr-plan/SKILL.md`** §5c structured choice table (`start-coding-session`, `revise-section`, `prefill-sections`, `commit-reminder`, `defer`, `more-details`). **`defaultOptionId: start-coding-session`** when §5a passes.

   - **Next-step resolution:** **`start-coding-session`** → run **2e** §5d spawn; other picks → re-offer §5c or defer per **`pr-plan`** rules — no prose-only idle.

   **2e. Spawn and aggregate **`coding-session`** — when developer picks **`start-coding-session`**, run **`pr-plan`** §5d **`mission_control_spawn_agent`** then §5e child aggregation. **#external-wait** until child terminal; merge child **`outputs`** before step **3**.

   - **Next-step resolution:** Auto-advance to step **3** after §5e merge or honest blocked handoff. **Forbidden:** prose-only idle at external-wait surfaces — use structured resume options per rule **2** § *External-wait / next-step modal*.

3. **Emit child terminal **`mission_control_send_agent_result`** per **`## Completion (spawned)`** below.

   - **Next-step resolution:** Auto-advance to terminal MCP result — no additional `USER_CHECKPOINT` on happy path after §5e completes.

**Forbidden:** second PR row; **`master-planner`** / **`pr-breakdown`** / **`delivery-phases`** / **`phase-planner`**; Squad Leader **`mission_control_propose_dispatch_resolution`** on this lane.

## Completion (spawned)

### MCP result preflight (`mission_control_send_agent_result`)

| Step | Check |
|------|--------|
| R1 | Call **`mission_control_send_agent_result`** with **`status`**, **`summary`**, optional **`outputs`** / **`errors`** |
| R2 | **Forbidden args absent** — no **`correlationId`**, **`dispatchId`**, **`slotId`**, or other host-resolved keys |
| R3 | Populate **`outputs`** from the required field list below |
| R4 | Re-emit updated MCP result after user-requested follow-up on this lane (same spawn session; host resolves **`correlationId`**) |

Required `outputs` fields:

- `outputs.parentPlanPath`, `outputs.parentPlanSlug`
- `outputs.targetPlanPath`, `outputs.targetPlanSlug`
- `outputs.readyForImplementation`, `outputs.implementationReadinessReasons`
- `outputs.implementationHandoffStatus` — `not-offered` | `offered` | `deferred` | `spawned-coding-session` | `coding-session-terminal`
- `outputs.prPlanHandoffReady` — `true` when §§1–4 drafted and §5a passes (alias for leader ledger ack)
- `outputs.spawnCorrelationId` — UUID from §5d when `implementationHandoffStatus` is `spawned-coding-session` or until child terminal is merged
- `outputs.codingSessionStatus` — echo child `status` when §5e applies
- `outputs.activeLanes`, `outputs.openLedgerEntries`, `outputs.remainingTasks` — bubble from inline **`pr-plan`** / **`coding-session`** when present

Stop after the MCP result call. Do not emit another **`mission_control_spawn_agent`** on this lane except **`coding-session`** per inline **`pr-plan`** §5d (see **`../README.md`** § *Terminal stop (normative)*).

