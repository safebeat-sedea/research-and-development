---
name: pr-breakdown
description: >-
 Decompose a target Master Plan or Phase plan into PRs (mode #3 set-level) under
 Sedea's New Feature Development Process. Verifies template stage, ensures
 **`### Decomposition assessment`** exists (inserts if missing), gates
 **Delivery phases** vs multi-PR vs single-PR **PR breakdown**, then drafts
 **`### Single-concern strategy`**, **`### Sequencing`**, and **`### PR list`**.
 Child PR stubs and **`Plan:`** lines follow **new-plan** indexed handoff (inline under **planner**; spawned when standalone); per-PR
 §§ 1–4 follow **pr-plan**. Target resolved per
 planning-target-resolution. Use under mission dispatch, **pr-breakdown**
 protocol branch, or natural language (decompose into PRs, draft PR breakdown).
inputs:
  targetPlanPath:
    type: string
    description: Absolute or workspace-relative path to the Master Plan or Phase plan being decomposed.
    required: true
  targetPlanSlug:
    type: string
    description: Slug for the target plan.
    required: true
  parentAgentRole:
    type: string
    description: Upstream owner that invoked this skill inline, usually master-plan-agent or phase-planner-agent.
    required: false
  ledgerParent:
    type: string
    description: Slug/path of the ledger parent entry the Squad Leader tracks.
    required: false
  complexityBand:
    type: string
    description: Plan-scope complexity band copied from the upstream plan, when available.
    required: false
  complexityScore:
    type: number
    description: Plan-scope complexity score copied from the upstream plan, when available.
    required: false
  decompositionAssessment:
    type: string
    description: Current Decomposition assessment block from the upstream plan.
    required: false
  routeLock:
    type: string
    description: Optional upstream-selected route. When set to pr-breakdown, do not route back to delivery-phases unless the assessment creates a blocking conflict.
    required: false
  prBreakdownShape:
    type: string
    description: Optional upstream route detail for PR breakdown, single or multi.
    required: false
  hoistFromPhasePath:
    type: string
    description: >-
      When set, scope single-PR breakdown from this phase plan file; targetPlanPath
      must be the decomposition ancestor (parent of that phase), not the phase plan.
    required: false
  hoistFromPhaseSlug:
    type: string
    description: Slug of the phase plan being hoisted (must match hoistFromPhasePath).
    required: false
  scopeParentIndex:
    type: number
    description: One-based Delivery phases index on the target ancestor for the hoisted phase row.
    required: false
  decomposeOnPhasePlan:
    type: boolean
    description: When true, allow single-PR pr-breakdown on a phase plan target (override hoist).
    required: false
    default: false
warmUpRules:
  - ".sedea/centers/research-and-development/missions/plan-and-deliver/plan.mdc"
  - ".sedea/centers/research-and-development/missions/plan-and-deliver/skills/README.md"
  - ".sedea/centers/research-and-development/docs/development-process.md"
  - ".sedea/centers/research-and-development/rules/30_planning-target-resolution.mdc"
---

# PR breakdown — mode #3 decomposition

This skill drives **mode #3** (set-level **PR breakdown**) under Sedea's New Feature Development Process. **Input:** a target **Master Plan** or **Phase plan** whose dual-title section (`Delivery phases | PR breakdown`) is undecided or is already **`PR breakdown`**. **Output:** that section drafted as **`### Single-concern strategy`**, **`### Sequencing`**, and **`### PR list`** (numbered child PRs). Each row is expanded **depth-first** per **`### Sequencing`** ship gates via **`new-plan`** (indexed — **inline** when this skill runs under **`planner`**), then **`pr-plan`** **inline** on that lane (see [`new-plan/SKILL.md`](../new-plan/SKILL.md) populator handoff).

The procedure below is a hard contract — do **not** skip steps, re-order them, or start drafting before stage is verified.

## Trigger

- Mission dispatch or explicit request to run the **`pr-breakdown`** protocol branch.
- Natural language: decompose into PRs, draft PR breakdown, PR breakdown.
- After **`planner`** when the developer has already chosen **`PR breakdown`** for § 6 — **`planner`** runs this skill **inline** on the same lane; this skill drafts § 6 and owns indexed PR-child creation (**`new-plan`** + inline **`pr-plan`** on that lane).
- After **`phase-planner`** when route is **`pr-breakdown`** (including single-PR hoist on ancestor) — **`phase-planner`** runs this skill **inline** on the phase-planner lane.

The **developer** picks the next move per **30_planning-target-resolution** § *Sedea input channel*.

### Inline invoker lane (binding)

When **`parentAgentRole`** is **`phase-planner-agent`**, this skill runs **inline on the active phase-planner child lane** — even when **`targetPlanPath`** is the decomposition **ancestor** (Master Plan) after single-PR hoist (`hoistFromPhasePath` set). The **write target** (which `.plan.md` file is edited) is **not** the **execution lane**.

**Forbidden:**

- Prose redirect to the **`planner`** lane, **`planner`** Step **7**, or *"open the Master Plan agent"* because **`targetPlanPath`** names the ancestor Master Plan.
- Treating ancestor file paths as permission to hand decomposition back to **`master-plan-agent`** while **`phase-planner-agent`** invoked this skill inline.

**Required:** Report **`## Completion (inline)`** to the **phase-planner** invoker on the **same** child lane; merge fields per **`phase-planner/SKILL.md`** Step **5e**.

### Inline handoff — **pr-breakdown** → **`new-plan`** (step 6 act-after-select)

When **`parentAgentRole`** is **`master-plan-agent`** or **`phase-planner-agent`** (this skill inline under **`planner`** or **`phase-planner`**), run **`new-plan`** **inline on this lane** for **eligible** row index(es) only — **do not** emit **`AGENT_RUN_REQUEST_V1`** for **`new-plan`**. **Depth-first gate:** parse **`### Sequencing`** per **development-process.md** § *Depth-first plan-tree traversal* — expand only PR indices that are **ship-eligible** (sequential: lowest pending **N** whose prior PR in the chain is ship-complete; parallel stage: all pending indices in the current stage once the prior stage is fully ship-complete). Load `.sedea/centers/research-and-development/missions/plan-and-deliver/skills/new-plan/SKILL.md`, construct inline context per eligible row from the table below, follow that skill’s steps (including inline **`pr-plan`**), and merge each **`## Completion (inline)`** into this skill’s ledger (`childRows`, `spawnedPlans`, `activeLanes`, `openLedgerEntries`, `remainingTasks`). Inline **`new-plan`** may still spawn **`coding-session`** via inline **`pr-plan`** §5d.

| Inline context field | Value (per row **N**) |
|----------------------|------------------------|
| `mode` | `"indexed-child"` |
| `parentPlanPath` | Absolute path to this skill’s `targetPlanPath` |
| `parentPlanSlug` | This skill’s `targetPlanSlug` |
| `index` | Row number **N** (one or more eligible indices per expand pass — parallel stage may authorize multiple) |
| `childKind` | `"pr-plan"` |
| `requestedPopulatorSkill` | `"pr-plan"` |
| `ledgerParent` | `ledgerParent` from this skill’s inputs when present |
| `upstreamSkill` | `"pr-breakdown"` |
| `parentAgentRole` | `"pr-breakdown-agent"` |
| `decompositionKind` | `"pr-breakdown"` |
| `autoChainFirstPr` | `true` only when **`approve-list`** auto-expand runs on this lane (see §6 act-after-select); otherwise omit or `false` |
| `parentRowSingleConcern` | Full text of item **N** **Single concern** sub-bullet under **`### PR list`** (PR description seed — parse from parent `.plan.md` before handoff) |

When **`hoistFromPhasePath`** is set (**step 3.6**), **K = 1**; also pass `hoistFromPhase: true`, `hoistFromPhasePath`, `hoistFromPhaseSlug`, and `scopeParentIndex` on the ancestor row.

**Parse `parentRowSingleConcern`:** Read the parent plan’s **`### PR list`** block; for ordered item **N**, take the nested **Single concern.** sub-bullet body (label may read `Single concern` or `Single concern.`). Trim leading/trailing whitespace only — do not paraphrase. That string is the PR description seed for inline **`pr-plan`** §1.

**Standalone spawned** path: emit **`AGENT_RUN_REQUEST_V1`** per row instead (see step 6 act-after-select).

## Step 1 — Identify the target plan and verify stage

The skill operates on a **target** `.plan.md` resolved before this skill runs, per [`30_planning-target-resolution.mdc`](../../../../rules/30_planning-target-resolution.mdc) § *Resolution order*. Acknowledge the target slug in one line when this skill starts (e.g. *Target plan: `<slug>` (from prior structured choice).*). Resolve targets from session, snapshot, or explicit path — **planning-target-resolution** is normative. Do **not** infer the target from the IDE’s focused-file list alone.

If there is no resolved target, **stop** and emit a fresh *Where we are now in the plan tree* snapshot with **`AskQuestion`** or **`MC_PHASED_RESPONSE_V1`** in **one turn** per **30_planning-target-resolution** § *Sedea input channel* and **`../README.md`** § *Recap, structured choice, act* (`display.markdown` + `askQuestion`). **Obsolete:** recap-only turn without structured choice. Then continue.

Acknowledge in one line: *"Target plan: `<slug>`."*

**Verify the stage** from the plan body and frontmatter (`kind:`), and the sidecar when it helps disambiguate. The target must be a **Master Plan** or **Phase plan**:

- **`kind: roadmap_topic`** or the file is clearly a **roadmap topic** → **stop** with: *"This is a roadmap topic. Roadmap topics do not decompose into PRs here. Open a child Master Plan and run **`pr-breakdown`** on that plan."*
- Body has **`## Single concern`** (PR plan template) → **stop** with: *"This is a PR plan. PR plans are leaves; they are not decomposed with **`pr-breakdown`**. Use **`coding-session`** or **`pr-review`** as appropriate."*
- Master Plan or Phase plan → proceed.
- Ambiguous (stub with no distinguishing sections yet) → use **AskQuestion** with one `option` per stage (Master Plan, Phase plan, PR plan); if not Master or Phase plan, **stop**.

Acknowledge: *"Stage: <Master Plan | Phase plan>; proceeding."*

### 1b — Single-PR hoist gate (phase plan target)

Run **after** stage verification when **all** of the following hold:

- Body is a **Phase plan** (not Master Plan).
- `decomposeOnPhasePlan` is not `true`.
- `hoistFromPhasePath` is **not** set on this spawn (this lane is **not** already running hoisted breakdown on an ancestor).
- `prBreakdownShape` is `"single"` **or** `routeLock` is `"pr-breakdown"` with upstream `parentAgentRole: "phase-planner-agent"` **and** `### Decomposition assessment` on the target recommends **single-PR** `PR breakdown` (PR count band `single` or routing line contains `single-PR`).

**Stop** (do not draft § 5 PR breakdown on this phase plan):

> *"Single-PR **`PR breakdown`** after **`phase-planner`** should **hoist** to the decomposition **ancestor** (the plan that owns this phase's **`Delivery phases`** row), not run set-level **`pr-breakdown`** on this phase file. Re-run **`pr-breakdown` inline on this phase-planner lane** with `targetPlanPath` = ancestor, plus `hoistFromPhasePath` / `hoistFromPhaseSlug`, `scopeParentIndex`, and `prBreakdownShape: \"single\"` — **do not** switch to the **`planner`** lane. Or set `decomposeOnPhasePlan: true` only when the developer explicitly wants a one-PR § 5 on this phase plan."*

Return `partial` with `remainingTasks` naming the hoist when **`phase-planner`** inline handoff omitted ancestor retargeting — **not** as permission to redirect to **`planner`**.

When **`hoistFromPhasePath`** **is** set, the **target** must be the **ancestor** (Master or Phase plan whose **`Delivery phases`** list contains item **`scopeParentIndex`** for the hoisted phase). The phase file at **`hoistFromPhasePath`** is **scope-only** — do not use it as `targetPlanPath`. Acknowledge: *"Hoist mode: ancestor `<target-slug>`, phase scope `<hoistFromPhaseSlug>`, row N=<index>."* Then continue; **step 3.6** runs after step 3.

## Step 2 — Load the development-process doc

Read `.sedea/centers/research-and-development/docs/development-process.md` with the Read tool, **no offset, no limit** (hosting repo root). Acknowledge in one sentence: *"Loaded development-process.md; will follow § 3 PR breakdown set-level template + § 6/§ 5 contents rule."*

This is a **standards document**, not an executable plan — its sections describe the process you apply. Re-read on every invocation; do not rely on session memory.

## Step 3 — Read the target plan and locate the dual-title section

Read the target plan in full. Locate the dual-title section — the last numbered section before optional Caveats:

- **Master Plan:** `## 6. Delivery phases | PR breakdown` or `## 6. PR breakdown`.
- **Phase plan:** `## 5. Delivery phases | PR breakdown` or `## 5. PR breakdown`.

Inspect the section and apply:

| Section state | Meaning | Action |
| --- | --- | --- |
| Heading is `Delivery phases \| PR breakdown` and the dual-title **list** is still `_TBD_` (assessment may or may not exist yet) | Decision pending on recursion shape | Step 3.5 → Step 4 → Step 5 when a PR-breakdown path is chosen |
| Heading is already `PR breakdown` with empty / `_TBD_` body (set-level sub-sections not yet drafted) | **PR breakdown** chosen; need set-level draft | Step 3.5 → **Skip step 4** → Step 5 (use **`### Decomposition assessment`** to choose single-item vs multi-item **`### PR list`**; default to **multi** if ambiguous — **flag** when assessment clearly says single but you drafted multiple) |
| Heading is already `PR breakdown` with all three sub-sections populated | Already drafted | Step 6 (handoff menu) |
| Heading is already `PR breakdown` with some sub-sections drafted, others `_TBD_` | Partially drafted | Step 5, filling only still-`_TBD_` sub-sections unless asked to replace existing text |
| Heading is already `Delivery phases` | Wrong skill | **Stop:** *"This plan’s decomposition is **`Delivery phases`**. Use the **`delivery-phases`** protocol branch on this plan to draft the phase list."* |

Acknowledge the state in one line.

## Step 3.6 — Hoisted single-PR from a phase plan (ancestor target)

Run when **`hoistFromPhasePath`** and **`scopeParentIndex`** are set and **`prBreakdownShape`** is `"single"` (or step 4 would route to **step 5s**).

1. Read the phase plan at **`hoistFromPhasePath`** in full. Use §§ 2–4 and **`### Decomposition assessment`** as the **only** scope for the single PR (not the ancestor's full feature scope).
2. Read the **target** (ancestor) plan. Locate **`## 6. Delivery phases`** (Master) or **`## 5. Delivery phases`** (Phase parent). If the ancestor dual-title is still `Delivery phases | PR breakdown` with `_TBD_` list: when **`parentAgentRole`** is **`phase-planner-agent`**, run **`delivery-phases`** **inline on this same phase-planner lane** on the ancestor (or close with structured choice to defer) — **forbidden** to redirect to the **`planner`** lane. When **`master-plan-agent`**, run **`delivery-phases`** inline on the **`planner`** lane or stop with structured choice. Then re-enter hoist.
3. Match **`scopeParentIndex`** to the numbered row whose **`Plan:`** links the hoisted phase plan (or whose title matches **`hoistFromPhaseSlug`** / phase `name:`). If no row matches, return `partial` and report the index mismatch.
4. **`StrReplace`** on the ancestor — update **only** that row:
 - Set the **Decomposition decision** sub-bullet to **`PR breakdown`**.
 - If the row has a single **`Plan:`** line pointing at the phase plan, rename the label to **`Phase plan:`** (keep the phase link) and add a sibling sub-bullet **`Plan:`** with `_TBD_` (or `_TBD_` spawn placeholder) for the PR plan **`new-plan`** will create.
 - If the row already has separate **`Phase plan:`** / **`Plan:`** lines, set **`Plan:`** to `_TBD_` only when the PR link is still missing.
5. **`StrReplace`** on the phase plan — under **`## 5. Delivery phases | PR breakdown`**, replace `_TBD_` with a short hoisted note (one paragraph): PR breakdown is authored on ancestor **`<ancestor-slug>`** row **N**; do not draft a § 5 **`PR breakdown`** list on this phase file.
6. Draft the single-PR set-level block (**`### Single-concern strategy`**, **`### Sequencing`**, **`### PR list`** with **K = 1**) using **step 5s**, grounded in the **phase** plan scope from step 1. **Do not** retitle the ancestor's top-level § 6 / § 5 from **`Delivery phases`** to **`PR breakdown`** — the hoisted PR is row-scoped on the ancestor list.
7. When **`upstreamRouteApproved: true`** or **`skipPrBreakdownApprovalModal: true`** from **`phase-planner`** with **`autoContinue: true`**, **write** the drafted **`### Single-concern strategy` / `### Sequencing` / `### PR list`** block to the ancestor plan (row-scoped anchor under the target **`Delivery phases`** section) **before** inline **`new-plan`** — do **not** keep chat-only **`hoistPendingWrite`** as a stall. When upstream route is **not** pre-approved, **preferred:** proceed to **step 6** with `hoistPendingWrite: true` and present the draft for approval before **`new-plan`** spawn.
8. After developer approval (step 6 **`expand-eligible`** or **`approve-list`** followed by expand on a later turn): **inline** (`parentAgentRole` **`master-plan-agent`** or **`phase-planner-agent`**) — run **`new-plan`** **inline** per [Inline handoff](#inline-handoff--pr-breakdown--new-plan-step-6-act-after-select) with hoist fields. **Standalone spawned** — emit **`AGENT_RUN_REQUEST_V1`** for **`new-plan`** with `inputs` including `mode: "indexed-child"`, `parentPlanPath` / `parentPlanSlug` (ancestor), `index: scopeParentIndex`, `childKind: "pr-plan"`, `requestedPopulatorSkill: "pr-plan"`, `hoistFromPhase: true`, `hoistFromPhasePath`, `hoistFromPhaseSlug`, `decompositionKind: "pr-breakdown"`, `upstreamSkill: "pr-breakdown"`, plus `ledgerParent` when known. Pass the drafted single-PR row title in `initiatingPrompt` when helpful.

**Skip** steps **4** and **5** (whole-plan dual-title gate and set-level rewrite on the ancestor) when step 3.6 applies — unless the developer explicitly chooses **`decomposeOnPhasePlan`** on a follow-up turn.

Acknowledge: *"Hoist: row N on ancestor updated; phase §5 noted; ready for PR child spawn after approval."*

## Step 3.5 — Ensure `### Decomposition assessment`

Before **AskQuestion** (step 4) or before drafting set-level **`PR breakdown`** (step 5 when step 4 is skipped), the plan file must contain **`### Decomposition assessment`** so the **developer** and the agent share the same sizing snapshot.

1. If the plan body **already contains** the heading **`### Decomposition assessment`**, **read it** and acknowledge one line in chat — do **not** duplicate it.
2. Otherwise **infer** the same dimensions as **[`phase-planner` / § 4g — `### Decomposition assessment`](../phase-planner/SKILL.md)** (kinds of change, PR count band, sequencing / coupling, routing recommendation, confidence) — from the same inputs you will use in step 5a (Master: §§ 4–5; Phase: §§ 2–4). Then **`StrReplace`** insert the full **`### Decomposition assessment`** block **immediately above** the dual-title heading (`## 6. …` or `## 5. …`):
 - Use a unique `old_string` anchor of the form `## <N>. Delivery phases \| PR breakdown\n\n_TBD_` **or** `## <N>. PR breakdown\n\n_TBD_` (match the file exactly — include the chosen heading line).
 - `new_string` is: `### Decomposition assessment` + blank line + bullet lines + blank line + the same `## <N>. …` heading + `\n\n_TBD_`.

Do **not** remove an existing assessment authored by **`phase-planner`** / **`planner`** unless the **developer** asked to replace it.

## Step 4 — Decision gate (when the heading is still `Delivery phases | PR breakdown`)

Run this step **only** when the dual-title heading is still the **dual** form and the list body is `_TBD_` (after step 3.5).

When the skill was spawned with `routeLock: "pr-breakdown"` (or with `parentAgentRole: "master-plan-agent"` or `"phase-planner-agent"` after the developer chose **PR breakdown**), the route family is already decided upstream. Do not offer **Delivery phases** as a normal choice. Instead:

- If `### Decomposition assessment` recommends `PR breakdown` single-PR, use `pr_breakdown_single`.
- If it recommends `PR breakdown` multi-PR, or the recommendation is ambiguous but PR-ready, use `pr_breakdown_multi`.
- If it strongly recommends `Delivery phases`, stop and surface the conflict to the developer: continue with PR breakdown anyway, switch to `delivery-phases`, or revise the assessment. Do not silently bounce to `delivery-phases`.

When no upstream route lock exists, use **AskQuestion** to ask:

> How should this plan recurse next? Use **`### Decomposition assessment`** as the default if you agree with it.

**Three options (required):**

- **Delivery phases** (`id: delivery_phases`) — child entries are phase plans; the **`delivery-phases`** protocol branch owns that decomposition path.
- **PR breakdown — multiple PRs** (`id: pr_breakdown_multi`) — PR-ready; two or more executor-ready PRs.
- **PR breakdown — single PR** (`id: pr_breakdown_single`) — PR-ready; **one** numbered item in **`### PR list`** (then **`new-plan`** indexed item **1** creates the single child; **`pr-plan`** when available).

If the developer picks **`delivery_phases`**, **stop** with: *"Use the **`delivery-phases`** protocol branch on this plan — it sets the heading to **`Delivery phases`** and drafts the numbered list of child phases per the doc."* Do not draft anything in this skill; do not change the heading here.

If the developer picks **`pr_breakdown_multi`** or **`pr_breakdown_single`**, continue to step 5. Treat **`pr_breakdown_single`** as routing to **step 5s**; **`pr_breakdown_multi`** runs **5a–5d** with **K ≥ 2** expected (**K = 1** only on the single-PR path from step 4, or when step 4 was skipped and assessment forces one PR — see step 5).

## Step 5 — Draft the three sub-sections

The output is the three set-level sub-sections from **development-process.md** § 3: **`### Single-concern strategy`**, **`### Sequencing`**, **`### PR list`**.

**Routing:**

- If step 4 chose **`pr_breakdown_single`**, jump to **step 5s** — skip the multi-PR branch of 5a.
- If step 4 was **skipped** (heading already **`PR breakdown`**) and **`### Decomposition assessment`** recommends **single-PR** **`PR breakdown`**, use **step 5s** unless prior mission context explicitly demands multiple PRs — **flag** if you override the assessment.
- Otherwise use **5a–5d** for **multi-PR** decomposition (typical **K = 2–5**).

### 5a — Infer PR boundaries from the parent plan

**PR sizing metrics:** apply **`.sedea/centers/research-and-development/docs/development-process.md`** § *PR sizing — test cases and kinds of changes* (canonical). Keep in sync with **`.sedea/centers/research-and-development/rules/20_efficient-pr-shipping.mdc`** § *Keep PRs small and focused* — edit the development-process subsection first when buckets or kinds rules change.

Read the target plan’s earlier sections:

- **Master Plan:** § 4 Architectural design + § 5 Changes (including **`### Decomposition assessment`**, when present).
- **Phase plan:** § 2 Scope + § 3 Code design + § 4 Changes (including **`### Decomposition assessment`**, when present).

Pick PR boundaries that respect Strategy #6 (single concern per deliverable) and Strategy #4 (small chunks, fast to production):

- A PR is the **smallest deliverable unit** of this plan — one concern, one purpose, one reason to change. If two concerns are tempting to bundle, split them.
- PRs are ordered when there is a real sequencing constraint (schema migration before consumers; feature flag before code that reads it; contract change before UI that consumes it). Otherwise they can run in parallel.
- Aim for **2–5 PRs** in a typical multi-PR pass. **Exactly one PR** is a **first-class** outcome — use **step 5s** or **`pr_breakdown_single`**; do **not** treat it as an error. More than ~6 PRs usually means the plan should have stayed at **`Delivery phases`** first — **flag** when you proceed anyway.
- Each PR must be **shippable on its own** (Strategy #4): merging it should leave the system in a working state. Flag non-obvious reliance on flags, additive schema, or compat layers per PR.
- **Size each candidate PR by test-case count, not by lines** (canonical: **development-process.md** § *PR sizing — test cases and kinds of changes*). For each PR under consideration, estimate **test cases** it introduces or meaningfully changes — unit + integration / snapshot + exploratory recordings, each enumerated case counted once. Buckets: **≤ 10** simple, **11–20** mid-sized, **21+** heavy (same thresholds as rule **20** § *Keep PRs small and focused*). Heavy is a signal to **investigate** splitting — not automatically wrong. Do not split within one **kind** of change (instance batching). Raw changed-line count is **not** a size signal.
- **Kinds-of-changes lens** (same canonical subsection). Count **distinct kinds** — N instances of the same shape across N files is one kind. **A reviewer agent** reads the first instance carefully and skims the rest. Split only when each half ships value on its own.

### 5b — Draft each sub-section per the doc’s § 3 set-level template

Apply **development-process.md** § 3 *Set-level template* literally. The three sub-sections, in order:

#### `### Single-concern strategy`

One or two sentences on how this plan keeps each PR single-concern (Strategy #6). Tailor when the split is non-obvious. Optional short bullets (short-bullet rule) for tempting bundles you split; skip when the sentence is enough.

#### `### Sequencing`

How PRs relate in time — **authoritative for depth-first expand eligibility** (see **development-process.md** § *Depth-first plan-tree traversal*). Use staged bullets with explicit **`(sequential)`** or **`(parallel)`** labels, e.g. *Stage 1 (sequential): PR 1 → PR 2; Stage 2 (parallel): PR 3, PR 4*. Labels must match bolded titles in **`### PR list`**. Optional Mermaid supplements the bullets; when both exist, the staged bullet form governs **`new-plan`** gates.

#### `### PR list`

A **short numbered list** — one item per PR, in roughly **`### Sequencing`** order. Each item line: PR **slug or short title**, **bolded**, so the **`new-plan`** protocol branch (indexed spawn) can derive the child name (see **`new-plan`** § *Indexed child spawn*). Under each item, two nested sub-bullets:

- **Single concern.** One-line **PR description seed** (full prose; carved out of the short-bullet rule) — this is the exact text inline **`pr-plan`** must copy into child **`## 1. Single concern`** when `parentRowSingleConcern` is passed (no paraphrase or tighten).
- **Plan.** A **`Plan:`** line whose placeholder **matches the parent file’s existing shape** when present; otherwise state the child file is pending after **`new-plan`** indexed spawn for this list item **N**. The relative Markdown link is filled when **`new-plan`** creates the child and updates the parent; **`plan-reconcile`** can repair wiring.

Optional: one short intro under `## <N>. PR breakdown` before **`### Single-concern strategy`** when framing helps; skip when unnecessary.

### 5s — Single PR (set-level)

Use when step 4 returned **`pr_breakdown_single`**, or when step 4 was skipped and **`### Decomposition assessment`** clearly recommends **single-PR** **`PR breakdown`**.

When **`hoistFromPhasePath`** is set, **5s** drafts content from the **phase** plan at that path (§§ 2–4), not from the full ancestor plan — the ancestor remains in **`Delivery phases`** mode at the section heading; only row **N** becomes PR-ready (see **step 3.6**).

Draft the same three sub-headings, but:

- **`### Single-concern strategy`:** one or two sentences — the whole plan ships as **one** mergeable unit.
- **`### Sequencing`:** one short bullet such as *Single PR — no sibling ordering.*
- **`### PR list`:** **Exactly one** numbered item (`1. **<slug>**`). Derive **`<slug>`** from frontmatter `name:` or the plan title. **Single concern** sub-bullet = full PR description seed (proto-§ 1 for the whole change; verbatim into inline **`pr-plan`** §1). **Plan:** same placeholder contract as **5b** for item **1**.

Then run **5c** with **K = 1**.

### 5c — Write to the parent plan

Use `StrReplace` to mutate **only** the dual-title section (the `## <N>. Delivery phases | PR breakdown` or `## <N>. PR breakdown` heading **and** the `_TBD_` or empty body **directly under it**). Do **not** delete **`### Decomposition assessment`** when it sits **above** that heading.

Replace:

- The heading: `## <N>. Delivery phases | PR breakdown` → `## <N>. PR breakdown` (`<N>` is **6** for Master Plan, **5** for Phase plan).
- The body: `_TBD_` → optional intro + the three sub-sections from **5b** or **5s**.

**Bold** the PR slug on each item’s first line. Keep slugs short (about 2–5 words; kebab-case or `snake_case` per repo habit).

If the section is **partially drafted**, replace only still-`_TBD_` sub-sections — preserve the **developer**’s existing text unless they ask to revise it.

Do **not** modify any other section in the same call.

After writing, read the file back and confirm the section reads as intended.

### 5d — Notify draft (recap)

**Structured choice delivery** per **`.sedea/centers/sedea/rules/2_ask-question-instructions.mdc`** § **Context and structured choice**. Do **not** use implementation labels like “Turn A/B” in developer-facing chat.

After step **5c**, present step **6** handoff in **one turn** via **`MC_PHASED_RESPONSE_V1`** or **AskQuestion tool** — put in **`display.markdown`** (or brief prose with the tool):

1. A **`file://`** link to the target `.plan.md` under `.sedea/operations/.../plans/...` (resolved path from **`plan-state resolve`** or equivalent).
2. One line: *Drafted `## <N>. PR breakdown` with **K** PR rows — open the plan to review the full section.*

Do **not** mirror the full **`PR breakdown`** body in chat (no duplicated headings, tables, Mermaid fences, or numbered PR list). The plan file is the review surface.

Count **K** from numbered rows under **`### PR list`** before the approval modal (`K = 1` is valid on the single-PR path). If **K = 0**, treat as drafting failure — do not open structured-choice spawn paths; return failure or partial per **Completion (spawned)** / standalone handoff.

**Obsolete:** separate recap-only pass without **`askQuestion`** — step **6** options belong on the **same** turn as the link + one-line summary.

## Step 6 — Hand back with next-move options

**Structured choice** then **act after the developer selects** — see **`../README.md`** § *Recap, structured choice, act (plan-and-deliver)*.

### Structured choice — Approval (interactive)

**Preferred:** **AskQuestion tool** (brief recap allowed in the same message) or **`MC_PHASED_RESPONSE_V1`** with recap in `display.markdown` and options in `askQuestion` — one assistant message.

**Legacy split (when the tool and phased envelope are unavailable):** send the step **5d** recap, then a **separate** message with `MC_PHASED_RESPONSE_V1`** (sentinel-first; no recap prose before the sentinel).

Collect the developer’s choice via **AskQuestion**, **`MC_PHASED_RESPONSE_V1`** only in the structured-choice message — not in the same message as spawns or **`AGENT_RESULT_RESPONSE_V1`**.

- When using (no phased envelope), the structured-choice message must contain **only** the sentinel line and JSON object — **no** prose, plan recap, or markdown fences before or between the sentinel and JSON.
- Put every choosable path in **`options`** (`id` / `label`). Do **not** duplicate those choices as a numbered prose menu in the same turn.

Required **`options`** (adapt labels; keep **K** visible in the **`prompt`** when helpful):

| Option id (illustrative) | Label (brief) |
| --- | --- |
| `approve-list` | Approve PR breakdown — expand first PR when eligible |
| `expand-eligible` | Expand eligible PR row(s) |
| `revise` | Revise PR breakdown first |
| `defer` | Defer child PR plan creation |
| `abandon` | Abandon this branch |
| `more-details` | More details for option _ |

**Inline under `planner` or `phase-planner`:** Structured-choice approval is mandatory before indexed **`new-plan`** handoff **except** when **`upstreamRouteApproved: true`** or **`skipPrBreakdownApprovalModal: true`** from **`phase-planner`** with **`autoContinue: true`** (see **Cascade route approval** in act-after-select below) — then run **`approve-list`** act-after-select **same turn** without opening Step **6** modal. Do **not** emit **`AGENT_RESULT_RESPONSE_V1`** for this skill when **`parentAgentRole`** is **`master-plan-agent`** or **`phase-planner-agent`** — report **`## Completion (inline)`** to the invoker instead. Run **`new-plan`** **inline** on this lane (no child lanes for **`new-plan`**); **`coding-session`** child lanes may open from inline **`pr-plan`**.

**Standalone (spawned):** After structured-choice approval, emit **`AGENT_RESULT_RESPONSE_V1`** with `continuationStatus: "active"` when spawning **`new-plan`** child lanes — **not** in the structured-choice message. On **revise**, run step **6a** then repeat recap → structured choice.

### Act after developer selects

In a **new** assistant turn after the developer selects an option in the approval modal:

| Choice | Action |
| --- | --- |
| **Cascade route approval** (no modal) | When **`upstreamRouteApproved: true`** OR **`skipPrBreakdownApprovalModal: true`** from inline **`phase-planner`** with **`autoContinue: true`**, and PR index **1** is depth-first eligible: treat as **`approve-list`** without re-asking — write hoisted PR block if `hoistPendingWrite`, then **same turn** inline **`new-plan`** index **1** with `autoChainFirstPr: true` and `parentRowSingleConcern` from item **1**; merge inline **`new-plan`** / **`pr-plan`**. **Forbidden:** Step **6** modal on this path. **`planner`** Step **7** route approval and **`phase-planner`** Step **5b** route approval are **equivalent upstream consent** for first PR expand. |
| **Approve PR breakdown** (`approve-list`) | Record `developerApprovalStatus: "list-approved"`. **Inline under `planner` or `phase-planner`:** when PR index **1** is depth-first eligible per **30_planning-target-resolution** § *Depth-first expansion eligibility*, **same turn** run inline **`new-plan`** for index **1** only with `autoChainFirstPr: true` and `parentRowSingleConcern` from item **1** (see [Inline handoff](#inline-handoff--pr-breakdown--new-plan-step-6-act-after-select)); merge inline **`new-plan`** / **`pr-plan`** completion. When index **1** is not eligible, keep **`Plan:`** placeholders `_TBD_` and report why — do **not** run **`new-plan`**. **Standalone spawned:** keep **`Plan:`** placeholders `_TBD_` on **`approve-list`** alone — use **`expand-eligible`** to spawn. |
| **Expand eligible PR row(s)** (`expand-eligible`) | Parse **`### Sequencing`**; resolve eligible indices per **30_planning-target-resolution** § *Depth-first expansion eligibility*. **Inline:** run **`new-plan`** once per eligible index (parallel stage may be >1); merge each **`## Completion (inline)`**; record **`coding-session`** spawns in `activeLanes`. **Standalone spawned:** one **`AGENT_RUN_REQUEST_V1`** per eligible index. If none eligible, stop with reason (prior PR/stage ship incomplete) — do not spawn. |
| **Revise PR breakdown first** | Run step **6a**, then repeat recap → structured choice. Do **not** spawn children or emit terminal success until re-approved. |
| **Defer child PR plan creation** | Emit **`AGENT_RESULT_RESPONSE_V1`** with defer semantics; do not spawn. |
| **Abandon this branch** | Emit **`AGENT_RESULT_RESPONSE_V1`** with `status: "abandoned"` (or `partial` when work remains documented). |
| **More details for option _** | Elaborate in **`display.markdown`** (or brief prose), then **`askQuestion`** again on the **same** turn — no prose-only elaboration handoff. |

Do not return terminal **success** upstream until every indexed row has returned terminal status (inline or spawned **`new-plan`** + inline **`pr-plan`** / **`coding-session`**) or the developer explicitly defers/abandons the remaining rows (step **6b**).

## Step 6a — Follow-up turns

When the **developer** asks to revise the **`PR breakdown`** block, re-read that section, apply edits via `StrReplace`, then repeat **recap** (link + one-line **K** summary only) and **structured choice** — prefer **`MC_PHASED_RESPONSE_V1`** or **AskQuestion** for recap + modal in one message; do **not** combine a full section echo with in one message.

When the **developer** chooses hand off or populate children in standalone use, run **`new-plan`** inline or emit child-spawn requests for **`new-plan`** / **`pr-plan`** instead of impersonating those skills’ full procedures in the same turn. When the handoff ends the assistant turn while waiting for a child result, close with structured choice per [`.sedea/centers/sedea/rules/2_ask-question-instructions.mdc`](.sedea/centers/sedea/rules/2_ask-question-instructions.mdc) § **Turn completion invariant** — do not prose-only stop after handoff.

## Step 6b — Aggregate indexed child results

**Inline `new-plan` under `planner` or `phase-planner`:** After each inline **`new-plan`** row completes, merge its **`## Completion (inline)`** into `childRows` and `spawnedPlans`. If inline **`pr-plan`** reports handoff in progress or an active **`coding-session`** child, keep the row open and add the lane to `activeLanes`. When Mission Control delivers a **`coding-session`** child result, match by correlation id from inline **`pr-plan`** `spawnCorrelationId`, then `outputs.targetPlanPath` / `outputs.targetPlanSlug`.

**Ship-complete merge (spawn chain):** When a delivered result (inline **`new-plan`**, standalone **`new-plan`**, or nested **`coding-session`**) carries **`outputs.prShipComplete: true`** with **`parentIndex`** matching a **`### PR list`** row:

1. Set **`childRows[N].status: ship-complete`** (and echo **`shipPhase: done`**, **`rowStatus: closed`** on the row record when present).
2. Recompute **`expandEligibleIndices`** per **30_planning-target-resolution** § *Depth-first expansion eligibility* and parsed **`### Sequencing`**.
3. Set **`outputs.expandEligibleIndices`** on this lane's result; keep **`continuationStatus: active`** when eligible indices remain unexpanded.
4. **Re-emit updated terminal** (standalone spawned) or report **`## Completion (inline)`** (under **`planner`** / **`phase-planner`**) with fresh **`outputs`** — same **`correlationId`** — so upstream **`planner`** Step **7b** can surface **`expand-eligible`** when spawn-chain **`prShipComplete`** is present.
5. On the **next** structured-choice turn after merge, include **`expand-eligible`** in the modal when **`expandEligibleIndices`** is non-empty (prefer **`MC_PHASED_RESPONSE_V1`** with one-line recap in `display.markdown`).

**Standalone spawned `new-plan`:** When Mission Control delivers a child result from a spawned **`new-plan`** lane:

1. Match it to the ledger entry by correlation id first, then by `outputs.parentPlanSlug` + `outputs.parentIndex`.
2. If the result reports a created child plan (`outputs.planPath` / `outputs.planSlug`), add it to `spawnedPlans` and mark that row `created`.
3. If the result reports inline **`pr-plan`** handoff or an active **`coding-session`** child from inline **`pr-plan`**, keep the row open and add the lane to `activeLanes`.
4. If the result reports terminal completion with no remaining tasks, close that row as `completed`.
5. If the result is `partial`, keep the row open and copy its `remainingTasks`.
6. If the result is `failure`, `aborted`, or `abandoned`, mark the row blocked and ask the developer whether to retry that row, defer it, accept partial resolution, or abandon the branch.

Only return `continuationStatus: "terminal"` when every row is explicitly `completed`, `deferred`, `abandoned`, or `out_of_scope`, and no active inline **`pr-plan`** handoff or **`coding-session`** lanes remain for those rows. Silence or a missing row is not completion.

## One primary choice per turn — surface observations

Match the discipline in **`planner`**, **`delivery-phases`**, and **`phase-planner`**: perform exactly what was chosen; scope stays on the chosen pass. If you notice gaps (Changes bullets that do not map to a PR, sequencing tension, assessment vs draft mismatch), list short **numbered observations** in **`display.markdown`** (or brief prose) and close the **same turn** with **AskQuestion** (revise pass, accept as-is, or **More details for option _**). When you need an explicit accept/skip decision on flags, use **AskQuestion** with one `option` per flag plus **More details for option _**.

## Scope guard

**Owns:** the parent plan’s dual-title **`PR breakdown`** section (heading + set-level body); **step 3.5** may insert **`### Decomposition assessment`** above that heading when missing; **step 5d** recap notifies the developer (link + one-line **K** summary — not a full chat mirror).

**Out of scope:** renaming child plans after **`new-plan`** creates them; per-PR §§ 1–4 inline (**`pr-plan`** owns the body); later per-PR sections and worktrees (**`coding-session`**, **`plan-reconcile`** per **`development-process.md`**); edits outside the dual-title block (except the assessment insert in **3.5**); `git` / commit automation; **`Delivery phases`** list body (**`delivery-phases`**); roadmap topics and PR plans (step 1 stops).

## Completion (spawned)

### Host protocol line (required)

Emit **exactly one** line on its own: `AGENT_RESULT_RESPONSE_V1` immediately followed by a single JSON object on the **same** line. Required keys: `version` (1), `correlationId` (from the spawn request), `status`, `summary`, `outputs`, `errors` (use `[]` when none). Populate `outputs` from the list below. The emitted line must be **valid JSON** (no `{...}` placeholders in the actual output). Re-emit an **updated** line after user-requested follow-up on this lane (same `correlationId`). See **`.sedea/centers/sedea/skills/README.md`** § *Spawned terminal line*.

Required `outputs` fields:

- `outputs.targetPlanPath`, `outputs.targetPlanSlug`
- `outputs.decompositionKind`: `"pr-breakdown"`
- `outputs.childCount`, `outputs.developerApprovalStatus`
- `outputs.childRows` — `{index, title, status, planPath?, planSlug?, correlationId?, remainingTasks?, shipPhase?, rowStatus?}` — use **`status: ship-complete`** when **`prShipComplete`** merged for that index
- `outputs.expandEligibleIndices` — one-based PR indices eligible for **`expand-eligible`** after last ship-complete merge
- `outputs.spawnedPlans`, `outputs.activeLanes`, `outputs.openLedgerEntries`, `outputs.remainingTasks`
- `outputs.continuationOwner`: `"pr-breakdown-agent"`
- `outputs.continuationStatus` — `active` while approval, child creation, or population remains; `terminal` when all PR rows are closed, deferred, abandoned, or out of scope

Emit **`AGENT_RESULT_RESPONSE_V1`** only in **step 6 act-after-select** (after the developer responds to structured choice), or when announcing spawn wait / defer / abandon — **never** in the same message as recap-only or structured-choice approval. Stop after the terminal line in that turn. Do not emit another `AGENT_RUN_REQUEST_V1` or run the next protocol step in the same turn as the terminal line (see **`../README.md`** § *Terminal stop (normative)*).

## Completion (inline)

Report the fields below in prose to the invoker on the **same lane**. Do **not** emit `AGENT_RUN_REQUEST_V1`, `AGENT_RESULT_RESPONSE_V1`, or `MC_DISPATCH_RESOLVED_V1`. Do **not** add a **Host protocol line** under this section (see **`.sedea/centers/sedea/rules/4_mission.mdc`** § *Inline completion* and **`.sedea/centers/sedea/skills/README.md`** § *Completion (inline)*).

**Primary path:** **`planner`** Step 7 or **`phase-planner`** Step 5 runs this skill **inline** (`parentAgentRole: "master-plan-agent"` or `"phase-planner-agent"`). Runs **`new-plan`** **inline** on the same lane (then inline **`pr-plan`**). Use the same `outputs` semantics as **`## Completion (spawned)`** in prose only — the invoker lane merges ledger fields. **Standalone** mission dispatch may still spawn this skill on a child lane; then use **`## Completion (spawned)`** and spawn **`new-plan`** child lanes per step 6.
