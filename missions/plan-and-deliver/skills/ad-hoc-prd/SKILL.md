---
name: ad-hoc-prd
description: >-
 Scaffold a minimal Ad-Hoc PRD (bugs / small improvements) as
 `ad_hoc_<slug>_<hex>.ad-hoc-prd.md` under **personal operations docs only:**
 `.sedea/operations/<operationsUserId>/docs/` (never `joint/docs/`).
 Ad-Hoc PRD is upstream root input for **`planner`**; no existing `.plan.md`
 link is required. For **Ad-Hoc PRD creator** agent sessions — explicit
 mission dispatch or upstream agent only. Does not edit
 `.plan.md` files or run/spawn **`planner`** from this lane (invokers own downstream spawn).
designation:
  allowed: Scaffold ad-hoc PRD under operations docs; gather change-request evidence
  forbidden: Application code; Master Plan or PR plan edits; spawn planner; git ship
inputs:
  createIntent:
    type: boolean
    description: True when the upstream protocol selected the ad-hoc PRD branch.
    required: true
  title:
    type: string
    description: Non-empty title for the Ad-Hoc PRD.
    required: false
  details:
    type: string
    description: Change-request description used to draft Problem, Desired outcome, and Proposed solution.
    required: true
  operationsUserId:
    type: string
    description: Operations user id supplied by Mission Control; required for user-private docs.
    required: true
  sourceSummary:
    type: string
    description: Optional short summary of where this ad-hoc request came from.
    required: false
  roadmapHints:
    type: array
    description: Optional roadmap, related slug, or worktree hints from the upstream protocol.
    required: false
    default: []
laneRules:
  - ".sedea/centers/sedea/rules/2_ask-question-instructions.mdc"
  - ".sedea/centers/research-and-development/missions/plan-and-deliver/skills/ad-hoc-prd/SKILL.md"
  - ".sedea/centers/research-and-development/rules/31_operations-user-id.mdc"
  - ".sedea/centers/research-and-development/missions/plan-and-deliver/skills/README.md"
warmUpRules:
  - ".sedea/centers/research-and-development/missions/plan-and-deliver/skills/README.md"
  - ".sedea/centers/research-and-development/docs/development-process.md"
  - ".sedea/centers/research-and-development/rules/10_plan-naming-convention.mdc"
---

# Ad-Hoc PRD

## Warm-up manifest (spawned)

Per [`.sedea/centers/sedea/docs/lane-manifest-contract.md`](.sedea/centers/sedea/docs/lane-manifest-contract.md) and **`../README.md`** § *Default warm-up*. Spawned from **`single-phase`** §3 or **`debug-and-fix`** §5c — **not** plan-and-deliver §3 (which uses **`author-prd`**). Host merge: `effectiveWarmUp = dedupe(bootstrapRules → laneRules → skillWarmUp)`. Frontmatter matches this table. **No `alwaysApply` frontmatter flip.**

**Invoker `warmUpRules` override (binding):** On **`AGENT_RUN_REQUEST_V1`**, invokers merge skill frontmatter **`warmUpRules`** but **must add** the **invoking mission `plan.mdc`** — **`.sedea/centers/research-and-development/missions/single-phase/plan.mdc`** (§§1–3) or **`.sedea/centers/research-and-development/missions/debug-and-fix/plan.mdc`** (post-fix step **5c**) — **instead of** `plan-and-deliver/plan.mdc`. See **`../README.md`** § *Definitive `laneRules`* and each mission's spawn step.

### `bootstrapRules` — host-resolved (R&D layer)

| Path | Purpose |
|------|---------|
| `.sedea/centers/research-and-development/rules/bootstrap.mdc` | Sole R&D `alwaysApply: true` bootstrap (≤10 KB); host merges when `centerSlug === research-and-development` |

### `skillWarmUp` — frontmatter `warmUpRules`

| Path | Purpose |
|------|---------|
| *(invoker-supplied on spawn)* **Invoking mission `plan.mdc`** — **`single-phase/plan.mdc`** (§§1–3) or **`debug-and-fix/plan.mdc`** (§5c) | Mission protocol for this spawn — **not** `plan-and-deliver/plan.mdc` |
| `.sedea/centers/research-and-development/missions/plan-and-deliver/skills/README.md` | Spawn contracts, terminal stop |
| `.sedea/centers/research-and-development/docs/development-process.md` | Ad-hoc vs Master Plan routing |
| `.sedea/centers/research-and-development/rules/10_plan-naming-convention.mdc` | Ad-hoc PRD filename slug |

### `laneRules` — frontmatter `laneRules`

| Path | Purpose |
|------|---------|
| `.sedea/centers/sedea/rules/2_ask-question-instructions.mdc` | Structured choice for missing inputs |
| `.sedea/centers/research-and-development/missions/plan-and-deliver/skills/ad-hoc-prd/SKILL.md` | This skill procedure |
| `.sedea/centers/research-and-development/rules/31_operations-user-id.mdc` | User-private docs path |
| `.sedea/centers/research-and-development/missions/plan-and-deliver/skills/README.md` | Spawn preflight |

**Intent:** **Ad-Hoc PRD creator agent** turns a short **change request** (bug or small improvement) into a **minimal Ad-Hoc PRD** — a **standalone root artifact**. **Master Plans** and all other plans are **downstream** of the PRD (see **development-process**); this skill does **not** require or resolve a parent `.plan.md`, and does **not** spawn **`planner`** from this lane.

### Downstream `planner` (invoker-owned — binding)

This skill **never** emits **`AGENT_RUN_REQUEST_V1`** for **`planner`**. Downstream Master Plan work is **invoker protocol**, not ad-hoc PRD scope:

| Invoker | After terminal PRD approval (`developerApprovedPrd: true`) |
|---------|-----------------------------------------------------------|
| **`single-phase`** Squad Leader | **Same leader turn:** auto-chain **`single-phase/plan.mdc`** §4 seed compile → §5 spawn **`planner`** (no duplicate PRD approval on leader) |
| **`debug-and-fix`** Squad Leader | Continue post-fix protocol per **`debug-and-fix/plan.mdc`** — **`ad-hoc-prd`** captures fix context; **`planner`** only when developer routes to **`plan and deliver`** / **`single-phase`**, not by default from §5c alone |

**Forbidden:** reading "does not spawn **`planner`**" as "no **`planner`** on the dispatch" — **`single-phase`** §5 **`planner`** spawn is **expected** after this child terminal. **`outputs.prdRef`** / **`outputs.prdPath`** are the handoff inputs for §4 seed compile on the invoker lane.

**File type:** **`.ad-hoc-prd.md`** so tooling recognizes the shape (§§ 1–3 + **Master Plan** placeholder line).

## When this skill applies

**Actor:** **Ad-Hoc PRD creator agent** — session that runs after **explicit invocation** (mission dispatch or upstream agent). **Developers do not invoke skills by name**; routing is always an agent decision.

**Act in this turn** when **`ad-hoc-prd`** is engaged **and** the dispatch / handoff supplies **all** of:

1. **Create intent** — upstream step chose the ad-hoc change-request path (e.g. plan protocol “ad-hoc task description” branch).
2. **Title** — non-empty title for the Ad-Hoc PRD (handoff fields or captured change-request summary).
3. **Details** — non-empty change-request body.
4. **Operations user id** — Mission Control supplied `operationsUserId`.

If any required field is missing in spawned mode, stop with `partial` and report `outputs.missingFields`; do not invent a title, write under `joint`, or continue with a guessed operations path. In standalone mode, collect missing **title** / **details** via **AskQuestion**, **`MC_PHASED_RESPONSE_V1`** per **`.sedea/centers/sedea/rules/2_ask-question-instructions.mdc`** and **`../README.md`** § *Recap, structured choice, act*.

**Details:** Payload text — change-request description, thread excerpt, labeled context — use to draft **§1 Problem**, **§2 Desired outcome**, and **§3 Proposed solution**. If thin, use concise **TBD** bullets and say what to confirm.

**Optional context** (never required): roadmap hints, related slugs, or worktree paths may appear in the payload; they do **not** replace title + body and do **not** force a **`Plan:`** link to an existing `.plan.md`.

## Complexity guard

Ad-hoc means **shorter PRD input**, not lower delivery scrutiny. Do not use this branch to bypass decomposition or implementation validation.

- Capture broad scope, multi-system impact, unclear acceptance criteria, data migration, security/auth, rollout risk, or test uncertainty in **§3 Proposed solution** as explicit risks / unknowns.
- If the request is obviously larger than a small change, still write the short PRD when inputs are sufficient, but set `outputs.complexityGuard: "needs-master-plan-assessment"` and include the reasons in `outputs.remainingTasks`.
- Leave all complexity scoring, decomposition routing, and downstream agent spawning to **`planner`** and later skills.

## Operations user id (required to write)

New Ad-Hoc PRDs are written **only** to:

**`.sedea/operations/<operationsUserId>/docs/`**

Use the **Mission Control supplied** `operationsUserId` from skill inputs / session warm-up (refresh with `sedea_get_current_user` when needed). If it is missing, stop with `partial` and report `outputs.missingFields: ["operationsUserId"]`. Do **not** write under **`joint/docs/`** as a fallback.

Create **`docs/`** under that segment if missing.

**Joint:** This skill **never** creates files under **`.sedea/operations/joint/docs/`**. If the work should become shared, **the developer** moves the file into **`joint/docs/`** (or another agreed location) outside this skill — e.g. git move / editor.

**Lookup:** When checking for an existing file by basename, search **only** **`.sedea/operations/<operationsUserId>/docs/`** for this protocol.

## Refresh lane display (when stale)

After **`title`** / change-request scope is clear (before writing the Ad-Hoc PRD):

1. Compare the visible tab **title** / **hover** to this lane's work (ad-hoc title or problem summary).
2. When spawn labels are **generic or wrong**, call MCP **`mission_control_update_lane_display`** on **this lane only** with non-empty **`title`** and optional **`description`** / **`hoverDescription`** (max lengths in [`.sedea/centers/sedea/rules/9_display-metadata-authority.mdc`](.sedea/centers/sedea/rules/9_display-metadata-authority.mdc)).
3. **Skip** when spawn labels already match scope.
4. **Forbidden:** **`mission_control_update_dispatch_display`** from a child lane.

See [`.sedea/centers/research-and-development/rules/50_mission-control-display-metadata-discipline.mdc`](../../../../rules/50_mission-control-display-metadata-discipline.mdc) § *Child lane — refresh own slot when labels are stale*.

## Steps

1. **Validate inputs** — `createIntent === true`, non-empty `title`, non-empty `details`, and non-empty `operationsUserId`.
2. **Use** **§ Ad-Hoc PRD file shape (template)** below — no external template file.
3. **Filename:** `ad_hoc_<slugified-title>_<8-hex>.ad-hoc-prd.md` — slugify title (lowercase, non-alphanumerics → `_`, collapse repeats, max ~48 chars) + `_<random 8 hex>` (`crypto.randomBytes(4).toString('hex')` or equivalent).
4. **Write** under **`.sedea/operations/<operationsUserId>/docs/`**:
 - `# <Title>` — handoff title (not the filename).
 - **`Master Plan:`** line — `_TBD_` plus one sentence that **`planner`** will create the `.plan.md` from this Ad-Hoc PRD and the developer should paste or link that path here when it exists (do **not** invent a plan path).
 - **`## 1–3`** sections filled from handoff details; `_TBD_` where unavoidable + say what is missing.
5. **Present for approval** — Recap the new file (workspace / `file://` link, one-line summary of §§1–3). Use **AskQuestion**, **`MC_PHASED_RESPONSE_V1`** per **`../README.md`** § *Recap, structured choice, act* and **`.sedea/centers/sedea/rules/2_ask-question-instructions.mdc`**.

 **Detect open items** before building the modal: `_TBD_` bullets in §§1–3, explicit risks or unknowns in **§3 Proposed solution**, thin or ambiguous acceptance criteria, and `outputs.complexityGuard: needs-master-plan-assessment`.

 **When open items exist** — **one modal, multiple questions**:
 - **`display.markdown`:** numbered list — each open item elaborated (section, gap text, why a decision matters, agent-proposed resolution options).
 - **`askQuestion.questions`:** **one entry per open item** — each with its own `id`, `prompt`, and `options` scoped to **that item only** (for example accept proposed resolution A/B, mark not applicable, defer to planner, gather more evidence). **Forbidden:** merging all open-item picks into a single `questions` entry.
 - **Last question** (always final in the array): `id` e.g. `prd-approval`, `prompt` summarizing readiness to approve or revise, `options`: **Approve PRD**, **Revise PRD**, **More details for option _**.
 - **Forbidden:** one combined question whose `options` mixes per-item resolution picks with **Approve PRD** / **Revise PRD**; a separate resolve-only modal that omits **Approve PRD** / **Revise PRD** until all items are cleared.
 - **Many open items:** batch across turns when one modal would be impractical; **each batch still ends with** the **Approve PRD** / **Revise PRD** question as the **last** `questions` entry.

 **When no open items remain** — single `questions` entry with minimum options:
 - **Approve PRD** — developer accepts this Ad-Hoc PRD for **`planner`** input
 - **Revise PRD** — edit the `.ad-hoc-prd.md` on this lane, then return to step 5
 - **More details for option _**

 Do **not** treat the write alone as developer approval. Mention optional **manual move** to **`joint/docs/`** only if **the developer** wants shared visibility.

5a. **On open-item resolution pick** — Apply the selected resolution for **that question's item** to the `.ad-hoc-prd.md`, then return to step 5 with the same multi-question approval shape.

6. **On approve** — Set `outputs.developerApprovedPrd: true`, ensure `prdRef` / `prdPath` / `prdTitle` reflect the approved file, then emit the terminal **`AGENT_RESULT_RESPONSE_V1`** with `continuationStatus: terminal` and `continuationOwner: "squad-leader"`.
7. **On revise** — Apply edits to the Ad-Hoc PRD file, then repeat step 5 until the developer approves or abandons (report `aborted` / `abandoned` only when they clearly stop).

## Completion (spawned)

### Host protocol line (required)

Emit **exactly one** line on its own: `AGENT_RESULT_RESPONSE_V1` immediately followed by a single JSON object on the **same** line. Required keys: `version` (1), `correlationId` (from the spawn request), `status`, `summary`, `outputs`, `errors` (use `[]` when none). Populate `outputs` from the list below. The emitted line must be **valid JSON** (no `{...}` placeholders in the actual output). Re-emit an **updated** line after user-requested follow-up on this lane (same `correlationId`). See **`.sedea/centers/sedea/skills/README.md`** § *Spawned terminal line*.

Required `outputs` fields:

- `outputs.prdPath`
- `outputs.prdRef`
- `outputs.prdTitle`
- `outputs.operationsUserId`
- `outputs.developerApprovedPrd` — `true` only when the developer selected **Approve PRD** on this lane; `false` on non-terminal results
- `outputs.missingFields`
- `outputs.roadmapHints`
- `outputs.complexityGuard`
- `outputs.activeLanes`
- `outputs.openLedgerEntries`
- `outputs.remainingTasks`
- `outputs.continuationOwner`
- `outputs.continuationStatus`

Set `continuationOwner` and `continuationStatus`:

- After the initial write (step 4), before developer approval: `continuationOwner: "ad-hoc-prd-agent"`, `continuationStatus: "active"`. Emit an **`AGENT_RESULT_RESPONSE_V1`** with `developerApprovedPrd: false` so the invoking Squad Leader **acknowledges only** — do **not** advance **`single-phase`** §4 or **`debug-and-fix`** §7 from that result alone.
- While required inputs are missing: `continuationOwner: "ad-hoc-prd-agent"`, `continuationStatus: "active"`, `developerApprovedPrd: false` — Squad Leader collects only when this skill cannot run step 5 (see missing-fields cases below).
- On developer **Approve PRD**: `continuationOwner: "squad-leader"`, `continuationStatus: "terminal"`, `developerApprovedPrd: true`, `prdRef` populated — invoking Squad Leader may continue (**`single-phase`** §4 → §5 **`planner`**, or **`debug-and-fix`** post-fix routing per that mission's `plan.mdc`).
- `partial` with `continuationStatus: "active"` when file writing fails or content is too thin to offer approval until clarification.

**Continuation ownership.** When spawned under **`single-phase`** or **`debug-and-fix`**, this lane owns the PRD approval gate (steps 5–7), mirroring **`author-prd`** approval semantics on plan-and-deliver. The **invoking Squad Leader** does **not** duplicate approval **AskQuestion** on the leader lane. This skill does not spawn **`planner`**. A child result with `developerApprovedPrd: false` is never permission to continue the invoking mission's downstream steps.

Ledger expectations:

- `activeLanes: []` when the PRD write succeeds; this skill starts no child lanes.
- `openLedgerEntries: []` when terminal.
- `remainingTasks` should include any missing clarifications, complexity warnings, or write failure recovery steps.

Error states:

- Missing required inputs → `status: "partial"`, no file write, `continuationStatus: "active"`, and `missingFields` populated.
- Missing `operationsUserId` → `status: "partial"`, no file write, `missingFields: ["operationsUserId"]`.
- File already exists at the generated path → generate a different 8-hex suffix once; if still blocked, return `failure`.
- Write failure → `status: "failure"` or `partial` if recoverable, with `errors[].message` and `remainingTasks`.

Stop after each **`AGENT_RESULT_RESPONSE_V1`** for the current turn (see **`../README.md`** § *Terminal stop (normative)*). When `continuationStatus` is `active`, the developer continues on **this** lane (approve, revise, or clarify); re-emit an **updated** terminal line with the same `correlationId` when approval completes or scope changes. Do not emit another `AGENT_RUN_REQUEST_V1` or spawn **`planner`** from this skill.

## Completion (inline)

Report the fields below in prose to the invoker on the **same lane**. Do **not** emit `AGENT_RUN_REQUEST_V1`, `AGENT_RESULT_RESPONSE_V1`, or `MC_DISPATCH_RESOLVED_V1`. Do **not** add a **Host protocol line** under this section (see **`.sedea/centers/sedea/rules/4_mission.mdc`** § *Inline completion* and **`.sedea/centers/sedea/skills/README.md`** § *Completion (inline)*).

**Normative invokers:** **`single-phase`** §3 and **`debug-and-fix`** §5c run this skill **spawned only**. **`plan and deliver`** uses **`author-prd`** §3 instead — not this skill. If another invoker runs inline, use the same `outputs` semantics as **`## Completion (spawned)`** in prose only.

## Ad-Hoc PRD file shape (template)

Use this shape for every new **`.ad-hoc-prd.md`** file.

```markdown
# <Title>

**Master Plan:** _TBD — run **`planner`** using this Ad-Hoc PRD as input; replace this line with a link to the resulting `.plan.md` when it exists._

## 1. Problem statement

<What is wrong or missing? Who is affected? Evidence / symptom?>

## 2. Desired outcome

<What “good” looks like — observable or testable when possible>

## 3. Proposed solution

<What to change, where, main steps, risks or unknowns>
```

## Out of scope

- Does **not** create or edit **`.plan.md`** files or sidecars (use **`new-plan`** / **`planner`** downstream).
- Does **not** auto-run or spawn **`planner`** on this lane. Invokers own downstream spawn — **`single-phase`** §4 → §5 after terminal approval; see § *Downstream `planner` (invoker-owned)* above.
