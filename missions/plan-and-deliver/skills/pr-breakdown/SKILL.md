---
name: pr-breakdown
description: >-
  Decompose a target Master Plan or Phase plan into PRs (mode #3 set-level) under
  Sedea's New Feature Development Process. Verifies template stage, ensures
  **`### Decomposition assessment`** exists (inserts if missing), gates
  **Delivery phases** vs multi-PR vs single-PR **PR breakdown**, then drafts
  **`### Single-concern strategy`**, **`### Sequencing`**, and **`### PR list`**.
  Child PR stubs and **`Plan:`** lines follow **new-plan** indexed spawn; per-PR
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
    description: Upstream owner that spawned this skill, usually master-plan-agent.
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
warmUpRules:
  - ".sedea/centers/research-and-development/missions/plan-and-deliver/plan.mdc"
  - ".sedea/centers/research-and-development/missions/plan-and-deliver/skills/README.md"
  - ".sedea/centers/research-and-development/docs/development-process.md"
  - ".sedea/centers/research-and-development/rules/30_planning-target-resolution.mdc"
---

# PR breakdown — mode #3 decomposition

This skill drives **mode #3** (set-level **PR breakdown**) under Sedea's New Feature Development Process. **Input:** a target **Master Plan** or **Phase plan** whose dual-title section (`Delivery phases | PR breakdown`) is undecided or is already **`PR breakdown`**. **Output:** that section drafted as **`### Single-concern strategy`**, **`### Sequencing`**, and **`### PR list`** (numbered child PRs). Each row is expanded into its own PR plan via the **`new-plan`** protocol branch (indexed child), then the **`pr-plan`** protocol branch on each new child (see [`new-plan/SKILL.md`](../new-plan/SKILL.md) populator handoff).

The procedure below is a hard contract — do **not** skip steps, re-order them, or start drafting before stage is verified.

## Trigger

- Mission dispatch or explicit request to run the **`pr-breakdown`** protocol branch.
- Natural language: decompose into PRs, draft PR breakdown, PR breakdown.
- After **`master-plan`** when the developer has already chosen **`PR breakdown`** for § 6 — **`master-plan`** spawns this skill; this skill drafts § 6 and owns indexed PR-child spawning for that branch.

The **developer** picks the next move per **30_planning-target-resolution** § *Sedea input channel*.

## Step 1 — Identify the target plan and verify stage

The skill operates on a **target** `.plan.md` resolved before this skill runs, per [`30_planning-target-resolution.mdc`](../../../../rules/30_planning-target-resolution.mdc) § *Resolution order*. Acknowledge the target slug in one line when this skill starts (e.g. *Target plan: `<slug>` (from prior structured choice).*). Resolve targets from session, snapshot, or explicit path — **planning-target-resolution** is normative. Do **not** infer the target from the IDE’s focused-file list alone.

If there is no resolved target, **stop** and emit a fresh *Where we are now in the plan tree* snapshot (information-only turn); in a **separate** turn, collect the lane pick via **AskQuestion** or **`MC_ASKQUESTION_V1`** per **30_planning-target-resolution** § *Sedea input channel*, then continue.

Acknowledge in one line: *"Target plan: `<slug>`."*

**Verify the stage** from the plan body and frontmatter (`kind:`), and the sidecar when it helps disambiguate. The target must be a **Master Plan** or **Phase plan**:

- **`kind: roadmap_topic`** or the file is clearly a **roadmap topic** → **stop** with: *"This is a roadmap topic. Roadmap topics do not decompose into PRs here. Open a child Master Plan and run **`pr-breakdown`** on that plan."*
- Body has **`## Single concern`** (PR plan template) → **stop** with: *"This is a PR plan. PR plans are leaves; they are not decomposed with **`pr-breakdown`**. Use **`coding-session`** or **`pr-review`** as appropriate."*
- Master Plan or Phase plan → proceed.
- Ambiguous (stub with no distinguishing sections yet) → use **AskQuestion** or **`MC_ASKQUESTION_V1`** with one `option` per stage (Master Plan, Phase plan, PR plan); if not Master or Phase plan, **stop**.

Acknowledge: *"Stage: <Master Plan | Phase plan>; proceeding."*

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

## Step 3.5 — Ensure `### Decomposition assessment`

Before **AskQuestion** (step 4) or before drafting set-level **`PR breakdown`** (step 5 when step 4 is skipped), the plan file must contain **`### Decomposition assessment`** so the **developer** and the agent share the same sizing snapshot.

1. If the plan body **already contains** the heading **`### Decomposition assessment`**, **read it** and acknowledge one line in chat — do **not** duplicate it.
2. Otherwise **infer** the same dimensions as **[`phase-plan` / § 4g — `### Decomposition assessment`](../phase-plan/SKILL.md)** (kinds of change, PR count band, sequencing / coupling, routing recommendation, confidence) — from the same inputs you will use in step 5a (Master: §§ 4–5; Phase: §§ 2–4). Then **`StrReplace`** insert the full **`### Decomposition assessment`** block **immediately above** the dual-title heading (`## 6. …` or `## 5. …`):
   - Use a unique `old_string` anchor of the form `## <N>. Delivery phases \| PR breakdown\n\n_TBD_` **or** `## <N>. PR breakdown\n\n_TBD_` (match the file exactly — include the chosen heading line).
   - `new_string` is: `### Decomposition assessment` + blank line + bullet lines + blank line + the same `## <N>. …` heading + `\n\n_TBD_`.

Do **not** remove an existing assessment authored by **`phase-plan`** / **`master-plan`** unless the **developer** asked to replace it.

## Step 4 — Decision gate (when the heading is still `Delivery phases | PR breakdown`)

Run this step **only** when the dual-title heading is still the **dual** form and the list body is `_TBD_` (after step 3.5).

When the skill was spawned with `routeLock: "pr-breakdown"` (or with `parentAgentRole: "master-plan-agent"` after the developer chose **PR breakdown**), the route family is already decided upstream. Do not offer **Delivery phases** as a normal choice. Instead:

- If `### Decomposition assessment` recommends `PR breakdown` single-PR, use `pr_breakdown_single`.
- If it recommends `PR breakdown` multi-PR, or the recommendation is ambiguous but PR-ready, use `pr_breakdown_multi`.
- If it strongly recommends `Delivery phases`, stop and surface the conflict to the developer: continue with PR breakdown anyway, switch to `delivery-phases`, or revise the assessment. Do not silently bounce to `delivery-phases`.

When no upstream route lock exists, use **AskQuestion** or **`MC_ASKQUESTION_V1`** to ask:

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

How PRs relate in time — bullet list by stage and/or a small Mermaid `graph LR` when dependencies are non-trivial. Labels must match bolded titles in **`### PR list`**.

#### `### PR list`

A **short numbered list** — one item per PR, in roughly **`### Sequencing`** order. Each item line: PR **slug or short title**, **bolded**, so the **`new-plan`** protocol branch (indexed spawn) can derive the child name (see **`new-plan`** § *Indexed child spawn*). Under each item, two nested sub-bullets:

- **Single concern.** One-line proto-§ 1 summary (full prose; carved out of the short-bullet rule).
- **Plan.** A **`Plan:`** line whose placeholder **matches the parent file’s existing shape** when present; otherwise state the child file is pending after **`new-plan`** indexed spawn for this list item **N**. The relative Markdown link is filled when **`new-plan`** creates the child and updates the parent; **`plan-reconcile`** can repair wiring.

Optional: one short intro under `## <N>. PR breakdown` before **`### Single-concern strategy`** when framing helps; skip when unnecessary.

### 5s — Single PR (set-level)

Use when step 4 returned **`pr_breakdown_single`**, or when step 4 was skipped and **`### Decomposition assessment`** clearly recommends **single-PR** **`PR breakdown`**.

Draft the same three sub-headings, but:

- **`### Single-concern strategy`:** one or two sentences — the whole plan ships as **one** mergeable unit.
- **`### Sequencing`:** one short bullet such as *Single PR — no sibling ordering.*
- **`### PR list`:** **Exactly one** numbered item (`1. **<slug>**`). Derive **`<slug>`** from frontmatter `name:` or the plan title. **Single concern** sub-bullet = full proto-§ 1 for the whole change. **Plan:** same placeholder contract as **5b** for item **1**.

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

### 5d — Notify draft (Turn A — information-only)

**Mission Control transcript boundary:** This turn is **information-only**. Do **not** include **`MC_ASKQUESTION_V1`**, the **AskQuestion** tool, **`AGENT_RESULT_RESPONSE_V1`**, or **`AGENT_RUN_REQUEST_V1`** here.

After step **5c**, end Turn A with **only**:

1. A **`file://`** link to the target `.plan.md` under `.sedea/operations/.../plans/...` (resolved path from **`plan-state resolve`** or equivalent).
2. One line: *Drafted `## <N>. PR breakdown` with **K** PR rows — open the plan to review the full section.*

Do **not** mirror the full **`PR breakdown`** body in chat (no duplicated headings, tables, Mermaid fences, or numbered PR list). The plan file is the review surface.

Count **K** from numbered rows under **`### PR list`** before Turn B (`K = 1` is valid on the single-PR path). If **K = 0**, treat as drafting failure — do not run Turn B; return failure or partial per **Completion (spawned)** / standalone handoff.

## Step 6 — Hand back with next-move options

Run **Turn B** and **Turn C** as **separate assistant turns**. Never combine Turn A, Turn B, and Turn C in one message.

### Turn B — Approval (interactive only)

In a **new** assistant turn after Turn A, collect the developer’s choice via **AskQuestion** or **`MC_ASKQUESTION_V1`** only.

- When using **`MC_ASKQUESTION_V1`**, the message must contain **only** the sentinel line and JSON object — **no** prose, plan recap, or markdown fences before or between the sentinel and JSON.
- Put every choosable path in **`options`** (`id` / `label`). Do **not** duplicate those choices as a numbered prose menu in the same turn.

Required **`options`** (adapt labels; keep **K** visible in the **`prompt`** when helpful):

| Option id (illustrative) | Label (brief) |
| --- | --- |
| `approve-spawn` | Approve PR breakdown and spawn PR plans |
| `revise` | Revise PR breakdown first |
| `defer` | Defer child PR plan creation |
| `abandon` | Abandon this branch |
| `more-details` | More details for option _ |

**Standalone / non-spawned:** After Turn B, **stop** and wait for the developer’s next message. On **revise**, run step **6a** then repeat Turn A → Turn B. On other choices, act per the labels above without impersonating **`new-plan`** / **`pr-plan`** in the same turn.

**Spawned under `master-plan`:** Turn B is mandatory before indexed child spawns. Do **not** emit **`AGENT_RESULT_RESPONSE_V1`** in Turn B.

### Turn C — Act on choice (after developer replies)

In a **new** assistant turn after the developer selects an option in Turn B:

| Choice | Action |
| --- | --- |
| **Approve PR breakdown and spawn PR plans** | Emit one **`AGENT_RUN_REQUEST_V1`** per PR row **1…K** for `.sedea/centers/research-and-development/missions/plan-and-deliver/skills/new-plan/SKILL.md`. Each request’s `inputs` must include `mode: "indexed-child"`, `parentPlanPath`, `parentPlanSlug`, `index`, `childKind: "pr-plan"`, `requestedPopulatorSkill: "pr-plan"`, `ledgerParent`, `upstreamSkill: "pr-breakdown"`, and `decompositionKind: "pr-breakdown"`. Record each spawned child in the ledger (`active`, keyed by correlation id + `(parentPlanSlug, index)`). Announce waiting for **K** indexed child results. Then emit **`AGENT_RESULT_RESPONSE_V1`** with `continuationStatus: "active"` (or `partial` when appropriate) — **not** in Turn A or Turn B. |
| **Revise PR breakdown first** | Run step **6a**, then repeat Turn A → Turn B. Do **not** spawn children or emit terminal success until re-approved. |
| **Defer child PR plan creation** | Emit **`AGENT_RESULT_RESPONSE_V1`** with defer semantics; do not spawn. |
| **Abandon this branch** | Emit **`AGENT_RESULT_RESPONSE_V1`** with `status: "abandoned"` (or `partial` when work remains documented). |
| **More details for option _** | Elaborate in prose (information-only), then run Turn B again. |

Do not return terminal **success** upstream until every spawned **`new-plan`** lane has returned terminal status or the developer explicitly defers/abandons the remaining rows (step **6b**).

## Step 6a — Follow-up turns

When the **developer** asks to revise the **`PR breakdown`** block, re-read that section, apply edits via `StrReplace`, then repeat **Turn A** (link + one-line **K** summary only) and **Turn B** — do **not** combine a full section echo with **`MC_ASKQUESTION_V1`** in one message.

When the **developer** chooses spawn or populate children in standalone use, emit child-spawn requests for **`new-plan`** / **`pr-plan`** instead of impersonating those skills’ full procedures in the same turn. Stop after spawning if the result is needed for the next step.

## Step 6b — Aggregate indexed child results

When Mission Control delivers a child result from a spawned **`new-plan`** lane:

1. Match it to the ledger entry by correlation id first, then by `outputs.parentPlanSlug` + `outputs.parentIndex`.
2. If the result reports a created child plan (`outputs.planPath` / `outputs.planSlug`), add it to `spawnedPlans` and mark that row `created`.
3. If the result reports an active populator lane (`pr-plan`), keep the row open and add the populator lane to `activeLanes`.
4. If the result reports terminal completion with no remaining tasks, close that row as `completed`.
5. If the result is `partial`, keep the row open and copy its `remainingTasks`.
6. If the result is `failure`, `aborted`, or `abandoned`, mark the row blocked and ask the developer whether to retry that row, defer it, accept partial resolution, or abandon the branch.

Only return `continuationStatus: "terminal"` when every row is explicitly `completed`, `deferred`, `abandoned`, or `out_of_scope`, and no active populator lanes remain. Silence or a missing row is not completion.

## One primary choice per turn — surface observations

Match the discipline in **`master-plan`**, **`delivery-phases`**, and **`phase-plan`**: perform exactly what was chosen; scope stays on the chosen pass. If you notice gaps (Changes bullets that do not map to a PR, sequencing tension, assessment vs draft mismatch), list short **numbered observations** in the chat reply (information-only). When you need an explicit accept/skip decision on flags, use **AskQuestion** or **`MC_ASKQUESTION_V1`** with one `option` per flag plus **More details for option _**.

## Scope guard

**Owns:** the parent plan’s dual-title **`PR breakdown`** section (heading + set-level body); **step 3.5** may insert **`### Decomposition assessment`** above that heading when missing; **step 5d** Turn A notifies the developer (link + one-line **K** summary — not a full chat mirror).

**Out of scope:** renaming child plans after **`new-plan`** creates them; per-PR §§ 1–4 inline (**`pr-plan`** owns the body); later per-PR sections and worktrees (**`coding-session`**, **`plan-reconcile`** per **`development-process.md`**); edits outside the dual-title block (except the assessment insert in **3.5**); `git` / commit automation; **`Delivery phases`** list body (**`delivery-phases`**); roadmap topics and PR plans (step 1 stops).

## Completion (spawned)

### Host protocol line (required)

Emit **exactly one** line on its own: `AGENT_RESULT_RESPONSE_V1` immediately followed by a single JSON object on the **same** line. Required keys: `version` (1), `correlationId` (from the spawn request), `status`, `summary`, `outputs`, `errors` (use `[]` when none). Populate `outputs` from the list below. The emitted line must be **valid JSON** (no `{...}` placeholders in the actual output). Re-emit an **updated** line after user-requested follow-up on this lane (same `correlationId`). See **`.sedea/centers/sedea/skills/README.md`** § *Spawned terminal line*.

Required `outputs` fields:

- `outputs.targetPlanPath`, `outputs.targetPlanSlug`
- `outputs.decompositionKind`: `"pr-breakdown"`
- `outputs.childCount`, `outputs.developerApprovalStatus`
- `outputs.childRows` — `{index, title, status, planPath?, planSlug?, correlationId?, remainingTasks?}`
- `outputs.spawnedPlans`, `outputs.activeLanes`, `outputs.openLedgerEntries`, `outputs.remainingTasks`
- `outputs.continuationOwner`: `"pr-breakdown-agent"`
- `outputs.continuationStatus` — `active` while approval, child creation, or population remains; `terminal` when all PR rows are closed, deferred, abandoned, or out of scope

Emit **`AGENT_RESULT_RESPONSE_V1`** only in **step 6 Turn C** (after the developer responds to Turn B), or when announcing spawn wait / defer / abandon — **never** in the same turn as Turn A or Turn B. Stop after the terminal line in that turn. Do not emit another `AGENT_RUN_REQUEST_V1` or run the next protocol step in the same turn as the terminal line (see **`../README.md`** § *Terminal stop (normative)*).

## Completion (inline)

Report the fields below in prose to the invoker on the **same lane**. Do **not** emit `AGENT_RUN_REQUEST_V1`, `AGENT_RESULT_RESPONSE_V1`, or `MC_DISPATCH_RESOLVED_V1`. Do **not** add a **Host protocol line** under this section (see **`.sedea/centers/sedea/rules/4_mission.mdc`** § *Inline completion* and **`.sedea/centers/sedea/skills/README.md`** § *Completion (inline)*).

Spawned from the **Master Plan agent** or decomposition paths in normal flow. If run inline, use the same `outputs` semantics as **`## Completion (spawned)`** in prose only.
