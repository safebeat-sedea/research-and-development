---
name: brainstorm-research
description: >-
  Optional free-form research session on a spawned child lane. Produces a
  brainstorm report under the active dispatch bundle docs/ for downstream PRD,
  Ad-Hoc PRD, quick-fix planning, or debug handover. Invoked from R&D mission
  intake when the developer selects brainstorm-first.
designation:
  allowed: Research, synthesize, and write brainstorm report under operations docs; approval gate
  forbidden: Application code; git ship; spawn downstream planning agents from this lane
inputs:
  invokerMissionSlug:
    type: string
    description: >-
      Mission that spawned this lane (plan-and-deliver, single-phase, quick-fix,
      debug-and-fix).
    required: true
  bundleDirectory:
    type: string
    description: Absolute dispatch bundle directory from lane identity / spawn preamble.
    required: true
  researchTopic:
    type: string
    description: Optional short title for the research session and report filename.
    required: false
  researchPrompt:
    type: string
    description: Optional opening question, problem area, or scope hint from Squad Leader intake.
    required: false
  openingSeeds:
    type: string
    description: Optional remainder text from the dispatch opening message after command phrase.
    required: false
laneRules:
  - ".sedea/centers/sedea/rules/2_ask-question-instructions.mdc"
  - ".sedea/centers/research-and-development/missions/plan-and-deliver/skills/brainstorm-research/SKILL.md"
  - ".sedea/centers/research-and-development/rules/31_dispatch-scope.mdc"
  - ".sedea/centers/research-and-development/missions/plan-and-deliver/skills/README.md"
warmUpRules:
  - ".sedea/centers/research-and-development/missions/plan-and-deliver/skills/README.md"
  - ".sedea/centers/research-and-development/docs/development-process.md"
  - ".sedea/centers/research-and-development/rules/10_plan-naming-convention.mdc"
---

# Brainstorm research

## Warm-up manifest (spawned)

Per [`.sedea/centers/sedea/docs/lane-manifest-contract.md`](.sedea/centers/sedea/docs/lane-manifest-contract.md) and **`../README.md`** § *Definitive `laneRules`*. Host merge: `effectiveWarmUp = dedupe(bootstrapRules → laneRules → skillWarmUp)`. **Invoker `warmUpRules` override (binding):** merge skill frontmatter **`warmUpRules`** but **add** the **invoking mission `plan.mdc`** (§§1–2.5) — **not** full plan-and-deliver unless that mission is the invoker.

### `bootstrapRules` — host-resolved (R&D layer)

| Path | Purpose |
|------|---------|
| `.sedea/centers/research-and-development/rules/bootstrap.mdc` | Sole R&D `alwaysApply: true` bootstrap |

### `skillWarmUp` — frontmatter `warmUpRules`

| Path | Purpose |
|------|---------|
| *(invoker-supplied on spawn)* **Invoking mission `plan.mdc`** | Mission protocol for brainstorm-first intake |
| `.sedea/centers/research-and-development/missions/plan-and-deliver/skills/README.md` | Spawn contracts, terminal stop |
| `.sedea/centers/research-and-development/docs/development-process.md` | § *Brainstorm research (optional pre-intake)* |
| `.sedea/centers/research-and-development/rules/10_plan-naming-convention.mdc` | Report filename slug |

### `laneRules` — frontmatter `laneRules`

| Path | Purpose |
|------|---------|
| `.sedea/centers/sedea/rules/2_ask-question-instructions.mdc` | Structured choice for research and approval |
| `.sedea/centers/research-and-development/missions/plan-and-deliver/skills/brainstorm-research/SKILL.md` | This skill procedure |
| `.sedea/centers/research-and-development/rules/31_dispatch-scope.mdc` | Dispatch scope + explicit docs paths |
| `.sedea/centers/research-and-development/missions/plan-and-deliver/skills/README.md` | Spawn preflight |

**Intent:** **Brainstorm research agent** runs a free-form exploration with the developer, writes a structured report, and closes with **approve report** (hand off to Squad Leader for auto-chained downstream spawn) or **abandon dispatch** (direction not viable).

**This skill never** emits **`mission_control_spawn_agent`** for **`author-prd`**, **`ad-hoc-prd`**, **`quick-fix-plan`**, or **`debug-and-fix`** — the **invoking Squad Leader** auto-spawns the downstream agent after terminal approval per the invoker mission **`plan.mdc`** §2.5.

## When this skill applies

**Actor:** **Brainstorm research agent** — spawned child lane only.

**Act when** the invoker selected **`brainstorm-first`** at mission intake and supplied **`bundleDirectory`** + **`invokerMissionSlug`**.

If **`bundleDirectory`** or **`invokerMissionSlug`** is missing, stop with `status: "partial"`, `outputs.missingFields` populated — do not write files.

## Research session (steps)

1. **Open the session** — Restate `researchTopic`, `researchPrompt`, and `openingSeeds` when present. Ask what the developer wants to explore; follow free-form chat until enough material exists for a report (no fixed turn count).
2. **Synthesize** — Draft report sections from the conversation (see **Report file shape** below). Use tools (read codebase, search docs) when helpful; cite paths in **Sources consulted**.
3. **Write report** — Save under **`<bundleDirectory>/docs/`** as `brainstorm_<slug>_<8hex>.brainstorm-report.md` (kebab slug from title; regenerate hex on collision once).
4. **Present for approval** — Show report path and summary in **`display.markdown`** (phased) or brief prose; open structured choice:
   - **Approve report** — send to Squad Leader; auto-chain downstream planning per invoker mission
   - **Revise research** — continue session on this lane
   - **Abandon dispatch** — direction not viable; Squad Leader resolves dispatch **`abandoned`**
   - **More details for option _**
5. **On Approve report** — Set `developerApprovedReport: true`, `abandonMission: false`, `continuationStatus: "terminal"`, `continuationOwner: "squad-leader"`. Emit **`MC_REFOCUS_PARENT_V1`** on its own line immediately before the MCP result call (see **`../README.md`** § *Optional parent refocus sentinel*). Populate **`downstreamHandoffSummary`** (concise prose for next spawn **`initiatingPrompt`**) and **`downstreamSpawnTarget`** per invoker (see **Downstream mapping**).
6. **On Abandon dispatch** — Set `developerApprovedReport: false`, `abandonMission: true`, `continuationStatus: "terminal"`, `continuationOwner: "squad-leader"`. Emit **`MC_REFOCUS_PARENT_V1`** then MCP result call with `outputs.abandonReason` when the developer stated one.

## Downstream mapping (binding)

| `invokerMissionSlug` | `downstreamSpawnTarget` | Squad Leader auto-chain (invoker-owned) |
|----------------------|-------------------------|----------------------------------------|
| `plan-and-deliver` | `author-prd` | §2.5 → §3 **`author-prd`** with `prdDescription` + `sourceMaterials` from report |
| `single-phase` | `ad-hoc-prd` | §2.5 → §3 **`ad-hoc-prd`** with `details` from report |
| `quick-fix` | `quick-fix-plan` | §2.5 → §3 **`quick-fix-plan`** with synthesized bullets from report |
| `debug-and-fix` | `enrich-debug-intake` | §2.5 → §2 issue context enriched; continue §3 **`debug-and-fix`** |

## Completion (spawned)

### MCP result preflight (`mission_control_send_agent_result`)

| Step | Check |
|------|--------|
| R1 | Call **`mission_control_send_agent_result`** with **`status`**, **`summary`**, optional **`outputs`** / **`errors`** |
| R2 | **Forbidden args absent** — no **`correlationId`**, **`dispatchId`**, **`slotId`**, or other host-resolved keys |
| R3 | Populate **`outputs`** from the required field list below |
| R4 | Re-emit updated MCP result after user-requested follow-up on this lane (same spawn session; host resolves **`correlationId`**) |

Emit **exactly one** line on its own: `mission_control_send_agent_result` immediately followed by a single JSON object on the **same** line. Required keys: `version` (1), `correlationId`, `status`, `summary`, `outputs`, `errors` (use `[]` when none).

Required `outputs` fields:

- `outputs.brainstormReportPath`
- `outputs.brainstormReportRef` — `@`-prefixed path for handoff
- `outputs.reportTitle`
- `outputs.bundleDirectory`
- `outputs.invokerMissionSlug`
- `outputs.developerApprovedReport` — `true` only on **Approve report**
- `outputs.abandonMission` — `true` only on **Abandon dispatch**
- `outputs.abandonReason` — optional string when abandoning
- `outputs.downstreamSpawnTarget` — see **Downstream mapping**
- `outputs.downstreamHandoffSummary` — required when `developerApprovedReport: true`
- `outputs.continuationOwner`
- `outputs.continuationStatus`
- `outputs.missingFields`
- `outputs.remainingTasks`

**Continuation:**

- During active research before report write or approval: `continuationOwner: "brainstorm-research-agent"`, `continuationStatus: "active"`, `developerApprovedReport: false`, `abandonMission: false`.
- On terminal approve or abandon: `continuationOwner: "squad-leader"`, `continuationStatus: "terminal"`.

**Forbidden:** `developerApprovedReport: true` with empty `downstreamHandoffSummary`. **Forbidden:** spawning downstream agents from this lane.

Stop after the MCP result call (see **`../README.md`** § *Terminal stop (normative)*).

## Report file shape (template)

```markdown
# <Title>

**Invoker mission:** `<invokerMissionSlug>`
**Downstream target:** `<downstreamSpawnTarget>`

## 1. Research question

<What was explored?>

## 2. Findings

<Key observations, options considered, constraints>

## 3. Recommendation

<Preferred direction and rationale>

## 4. Risks and open questions

<What remains uncertain>

## 5. Handoff summary

<Concise block the Squad Leader copies into the next spawn initiatingPrompt / intake fields>

## Sources consulted

<Paths, URLs, or tools used>
```

## Out of scope

- Does **not** create PRDs, plans, or PR plan sidecars — downstream skills own those artifacts.
- Does **not** emit **`MC_DISPATCH_RESOLVED_V1`** — Squad Leader proposes **`abandoned`** when `abandonMission: true`.
