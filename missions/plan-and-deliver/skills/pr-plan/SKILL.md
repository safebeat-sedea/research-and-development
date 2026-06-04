---
name: pr-plan
description: >-
 Populate a PR plan body: draft §§ 1–4 (Single concern, Background, Change scope,
 Reasoning) per Sedea's New Feature Development Process per-PR template. Mirrors
 **phase-planner** for mode #3: scope from parent's `### PR list` item N, grounds § 4
 in parent's `### Single-concern strategy` + `### Sequencing`, scopes § 3 from the
 parent's changes. §§ 5–8 and deploy scaffolding stay `_TBD_` for **coding-session**
 (and follow-up turns). Appends canonical `deploy-test-plan-verified` todo per
 development-process.md. Target resolved per planning-target-resolution. Use under
 mission dispatch, **pr-plan** protocol branch, natural language, or after **new-plan**
 ignition on a `PR breakdown` child stub.
inputs:
  targetPlanPath:
    type: string
    description: Path to the PR plan stub to populate.
    required: true
  targetPlanSlug:
    type: string
    description: Slug for the PR plan stub.
    required: true
  parentPlanPath:
    type: string
    description: Path to the parent plan containing the PR list row.
    required: true
  parentPlanSlug:
    type: string
    description: Slug for the parent plan.
    required: true
  parentIndex:
    type: number
    description: One-based PR list index that produced this child.
    required: true
  ledgerParent:
    type: string
    description: Ledger parent slug/path copied from the upstream agent.
    required: false
  upstreamSkill:
    type: string
    description: Skill that requested this PR plan population, usually new-plan.
    required: false
  parentAgentRole:
    type: string
    description: When new-plan-agent, report Completion (inline) to the invoker instead of AGENT_RESULT_RESPONSE_V1.
    required: false
  autoContinue:
    type: boolean
    description: Legacy spawn hint only — does not skip §5c handoff or §5d spawn. When true, still run Step 5 through §5c (and §5d when the developer picks Start coding session).
    required: false
    default: true
  parentRowSingleConcern:
    type: string
    description: PR description seed from parent ### PR list item N Single concern sub-bullet; copy verbatim to ## 1. Single concern.
    required: false
  skipPrPlanHandoffModal:
    type: boolean
    description: When true (pr-breakdown approve-list auto-chain), skip §5c modal after §§1–4; report inline completion with prPlanHandoffSkipped.
    required: false
    default: false
warmUpRules:
  - ".sedea/centers/research-and-development/missions/plan-and-deliver/plan.mdc"
  - ".sedea/centers/research-and-development/missions/plan-and-deliver/skills/README.md"
  - ".sedea/centers/research-and-development/docs/development-process.md"
  - ".sedea/centers/research-and-development/rules/30_planning-target-resolution.mdc"
---

# PR plan: §§ 1–4 from the parent plan

**Normative execution (plan and deliver):** **Inline only** on the invoker lane — **`new-plan`** step 4 with **`parentAgentRole: "new-plan-agent"`**. Report **`## Completion (inline)`**; do **not** emit **`AGENT_RESULT_RESPONSE_V1`** for **`pr-plan`**. **Exception:** §5d may emit **`AGENT_RUN_REQUEST_V1`** for **`coding-session`** on a **new** child lane. A standalone spawned **`pr-plan`** child is non-default. See **`../README.md`** § *Normative execution mode*.

This skill drives the **per-PR planning move** under Sedea's New Feature Development Process: take a freshly-spawned PR plan stub (indexed child from the parent's **`### PR list`** under **`PR breakdown`**, typically right after the **`new-plan`** protocol branch) and populate §§ **1–4** of the **per-PR template** — Single concern, Background, Change scope, Reasoning. §§ **5–8** and the § 7 deploy scaffold stay **`_TBD_`** for **`coding-session`** and later turns unless the **developer** explicitly asks for a **fill** sketch here.

The agent has enough context after step 3 to draft §§ 1–4 from the parent's **`### PR list`** row, **`### Single-concern strategy`**, **`### Sequencing`**, and earlier parent sections (diagrams / changes as *context* — PR plans do **not** embed parent diagrams in the body). § 4 is consumed by **a coding agent** (PR description) and **pre-pr-review** / **a reviewer agent**; keep sentences unambiguous. This skill reports planning readiness; **worktrees and ship execution** belong to **`coding-session`** on a **separate** lane.

The procedure below is a hard contract — do **not** skip steps or start drafting before the target is verified as a PR plan stub.

**Worktree removal ownership (binding).** This skill populates plans only — **do not remove worktrees you do not own.** Worktree create/remove belongs to **`coding-session`** after §5d handoff. **`git worktree list` is read-only** unless rule **0** § *Worktree ownership* preconditions hold. See [`.sedea/centers/sedea/rules/0_hosting-repo.mdc`](.sedea/centers/sedea/rules/0_hosting-repo.mdc) § *Worktree ownership*.

## Handoff to `coding-session` (spawned child lane)

**`pr-plan`** and **`coding-session`** are **sequential skills on different lanes**. After planning handoff approval, **`pr-plan`** emits **`AGENT_RUN_REQUEST_V1`** for **`coding-session`**; the child owns worktrees, workspace attach, and **implements** the PR plan on that lane (default **spawned implementation lane** — see **`coding-session`** § *Execution mode after worktree attach*). When **`pr-plan`** runs **inline under `new-plan`**, §5d still spawns **`coding-session`** from the **`new-plan`** lane — only the **`pr-plan`** populator lane is eliminated.

| Concern | **`pr-plan`** (this skill) | **`coding-session`** |
|---------|---------------------------|----------------------|
| Per-PR §§ **1–4** | Draft and maintain | Read; revise only when the developer returns to planning |
| Per-PR §§ **5–8** | Default **`_TBD_`**; optional *speculative* sketch if the developer picks a fill option | Substantive fill during implementation; final text once code paths are known |
| `readyForImplementation` | Set in `outputs` and passed in spawn `inputs` | Read as layer-1 hint only |
| Worktrees, implementation, ship chain | Out of scope — spawn only | Owns (spawned-lane default) |
| Start **`coding-session`** | Step **5d** after **AskQuestion** **Start coding session** (§5c) when §5a passes | Spawned child lane with `planningHandoffMode` + `planningHandoffApproved`; layer 2 **auto-authorizes** when §§1–4 drafted (or plan complete) — no second worktree-open modal |

**Signals (canonical):** **`.sedea/centers/research-and-development/rules/30_planning-target-resolution.mdc`** § *Planning readiness vs ship* and § *Agent checklist (planning vs ship — do not conflate)* — `readyForImplementation` on this lane does **not** authorize code edits, worktrees, commit/push, or §8 `phase` past `not-started`.

**Detached entry still valid:** The developer may still start **`coding-session`** via a new Mission Control session, natural language, or snapshot per **development-process.md** § *Start implementation (`coding-session` entry)* — without a **`pr-plan`** spawn.

## Trigger

- Mission dispatch or explicit request to run the **`pr-plan`** protocol branch.
- Natural language: draft PR plan, populate PR plan body, fill per-PR §§ 1–4.
- Immediately after **`new-plan`** ignition when the parent dual-title is **`PR breakdown`** — the usual next step on the new child stub.

The **developer** picks the next move per **30_planning-target-resolution** § *Sedea input channel*.

## Step 1 — Identify the target plan and verify it's a PR plan stub

The skill operates on a **target** `.plan.md` resolved before this skill runs, per [`30_planning-target-resolution.mdc`](../../../../rules/30_planning-target-resolution.mdc) § *Resolution order*. Acknowledge the target slug in one line when this skill starts. Resolve targets from session, snapshot, or explicit path — **planning-target-resolution** is normative. Do **not** infer the target from the IDE’s focused-file list alone.

When spawned by `new-plan` with `parentAgentRole: "new-plan-agent"`, run **inline** on the **`new-plan`** lane: report **`## Completion (inline)`** to the invoker — do **not** emit **`AGENT_RESULT_RESPONSE_V1`**. You may still emit **`AGENT_RUN_REQUEST_V1`** for **`coding-session`** per §5d.

When spawned by `new-plan` without `parentAgentRole: "new-plan-agent"` (legacy standalone populator spawn), `targetPlanPath`, `targetPlanSlug`, `parentPlanPath`, `parentPlanSlug`, and `parentIndex` are already locked. Treat missing or conflicting values as a spawn-contract failure: stop with `failure` or `partial` and report the missing field. Do not fall back to IDE focus or free-form target discovery in spawned mode.

If there is no resolved target, **stop** and emit a fresh *Where we are now in the plan tree* snapshot with **`AskQuestion`** or **`MC_PHASED_RESPONSE_V1`** in **one turn** per **30_planning-target-resolution** § *Sedea input channel* and **`../README.md`** § *Recap, structured choice, act* (`display.markdown` + `askQuestion`). **Obsolete:** recap-only turn without structured choice. Then continue.

Acknowledge in one line: *"Target plan: `<slug>`."*

### 1a — Verify the body's template state

Read the target plan in full and apply:

| Body state | Meaning | Action |
| --- | --- | --- |
| Has `## Overview` + `## Phasing` + `## Out of scope` (**new-plan** stub) | Fresh stub, drafting needed | Step 1b → Step 2 → Step 3 → Step 4 (full body rewrite) |
| Has `## 1. Single concern` … `## 4. Reasoning` with `_TBD_` under one or more of §§ 1–4 | Partially drafted | Step 1b → Step 2 → Step 3 → Step 4 (fill only still-`_TBD_` sections) |
| Has §§ 1–4 all populated | Already drafted | Step 5 (handoff menu) |
| Master Plan body (`## 4. Architectural design` + `## 6. Delivery phases \| PR breakdown`) | Wrong skill | **Stop:** use **`planner`**. |
| Phase plan body (`## 1. Background` … `## 4. Changes` for mode #2) | Wrong skill | **Stop:** use **`phase-planner`**. |

Acknowledge the body state in one line.

If the **new-plan** stub sections carry **non-stub user content**, merge it into § 2 / § 3 in your own words and **flag** that merge in the echo or handoff.

### 1b — Verify parent topology

Read the target plan's sidecar `<slug>.state.yaml` for `parent:`.

- `parent: null` (or sidecar missing) → **stop:** PR plans require a parent under **`PR breakdown`**. Fix via **`plan-reconcile`** or by hand, or use **`planner`** if this file should be a Master Plan.
- `parent:` does not resolve to an existing `.plan.md` under the same `.sedea/operations/.../plans/` tree → **stop:** fix sidecar before drafting.
- Parent is a **roadmap topic** grouping plan → **stop:** children should be Master Plans, not PR plans; fix sidecar or use **`planner`**.
- Parent resolves; read parent's dual-title block (`## 6. …` Master, `## 5. …` Phase):
 - Heading **`PR breakdown`** → proceed.
 - Heading **`Delivery phases`** → **stop:** use **`phase-planner`** on this file (phase child), not **`pr-plan`**.
 - Dual-title `Delivery phases | PR breakdown` still `_TBD_` → **stop:** run **`pr-breakdown`** (or **`delivery-phases`**) on the parent first.

Acknowledge: *"Parent: `<parent-slug>` (mode #3 **`PR breakdown`**); proceeding."*

If `parentPlanPath` / `parentPlanSlug` inputs were supplied, they must match the resolved sidecar parent and the parent file read here. If they conflict, stop with `failure`; the child was spawned against the wrong parent context.

## Step 2 — Load the development-process doc

Read `.sedea/centers/research-and-development/docs/development-process.md` with the Read tool, **no offset, no limit** (hosting repo root). Acknowledge: *"Loaded development-process.md; will follow § 3 per-PR template + § 6/§ 5 contents rule."*

Re-read every invocation; do not rely on session memory.

## Step 3 — Read the parent plan and find the PR row

Read the parent plan in full. Locate **`## 6. PR breakdown`** (Master parent) or **`## 5. PR breakdown`** (Phase parent). Inside: **`### Single-concern strategy`**, **`### Sequencing`**, **`### PR list`**.

### 3a — Match the target plan to a numbered item in `### PR list`

Match the target plan's `name:` to the **bolded slug** on a **`### PR list`** row. If spawned input includes `parentIndex`, inspect that exact item first and require it to match the target plan link or title; do not silently pick a different row.

1. Exact match.
2. Slug-normalised match (spaces ↔ `_` / `-`, case-insensitive where helpful).
3. Substring match only when 1–2 fail **and** one row clearly wins.

If ambiguous or no match, **stop**. In standalone mode, use **AskQuestion** so the **developer** picks item **N**, or they fix parent list / child `name:`. In spawned mode, return `partial` with `remainingTasks` naming the row/link mismatch; do not ask the developer from this child lane unless the upstream agent explicitly delegated that choice.

Capture **N**, the **Single concern** sub-bullet (proto-§ 1), and the **Plan** line (link or **`_TBD`** placeholder until **`new-plan`** / **`plan-reconcile`** wires it).

Verify that the captured **Plan** line links to this target plan after **`new-plan`** wiring. If it is still `_TBD`, points to another file, or is missing, continue drafting only if the body is otherwise valid, but report `parentPlanLinkStatus: "blocked"` and add a `remainingTasks` item for **`plan-reconcile`**. Do not report terminal readiness while the parent link is untrusted.

Acknowledge: *"Parent `### PR list` item N=<n>: \"<slug>\" — single concern captured."*

### 3b — Load `### Single-concern strategy` and `### Sequencing`

These ground § 4 **Why this approach** and **Considered & rejected**: split rationale, ordering vs sibling PRs, and explicit sequencing constraints.

### 3c — Load architectural / changes context

- **Master Plan parent:** § 4 Architectural design + § 5 Changes (including **`### Decomposition assessment`** when present).
- **Phase plan parent:** § 2 Scope + § 3 Code design + § 4 Changes.

Use diagrams and lists as **input** to prose; do **not** paste parent Mermaid into the PR plan body. § 3 Change scope stays short bullets only.

Acknowledge one line with what you loaded (diagram count, change bullet count).

## Step 4 — Draft §§ 1–4 into the target plan

### 4a — Write the body (fresh stub case)

When the body is the **new-plan** stub, replace the **entire body** in one `StrReplace` with the per-PR template through §§ 1–4 and **`_TBD_`** for §§ 5–8 (match **development-process.md** § 3 per-PR headings). Use this shape (fill `<…>` from steps 3–4b–4e; keep `**Status:** drafted` date from the agent clock):

````
old_string:
# <display name>

## Overview

<existing overview content>

## Phasing

<existing phasing stub>

## Out of scope

<existing out-of-scope stub>

new_string:
# <display name>

## 1. Single concern

<one sentence per § 4b>

## 2. Background

<2–3 sentences per § 4c>

## 3. Change scope

<short bullets per § 4d>

## 4. Reasoning

### Why this approach

<full sentences per § 4e>

### Considered & rejected

<_TBD_ or entries per § 4e>

## 5. Repo rules impact

_TBD_

## 6. Tests to write

_TBD_

## 7. Deploy test plan

**Status:** drafted *(<YYYY-MM-DD>: PR plan drafted.)*

### Before deploy

_TBD — numbered GFM task list (`1. [ ]` / `2. [ ]` / `3. [ ]`), not dashes, not bare numbers without checkboxes._

### After deploy

_TBD — numbered GFM task list (`1. [ ]` / `2. [ ]` / `3. [ ]`), not dashes, not bare numbers without checkboxes._

## 8. Caveats (optional)

_TBD_
````

Frontmatter **`name`**, **`overview`**, **`isProject`** stay as **`new-plan`** set them. If you ever edit a frontmatter scalar containing `: `, follow [`new-plan/SKILL.md`](../new-plan/SKILL.md) YAML quoting rules.

**Partial bodies:** one `StrReplace` per still-`_TBD_` §, anchored on section headers; do not wipe drafted text.

After the body first matches the per-PR template shape, run **§ 4a-bis** if `deploy-test-plan-verified` is not yet in frontmatter.

### 4b — § 1 Single concern

One sentence. When inline context or spawn **`inputs`** include **`parentRowSingleConcern`**, write **`## 1. Single concern`** to that string **verbatim** (trim outer whitespace only — **no** paraphrase, tighten, or rewrite). That field is the parent **`### PR list`** **Single concern** sub-bullet (PR description seed).

Otherwise: copy the parent's **Single concern** sub-bullet for item **N** without paraphrase when possible; only tighten when the source is ambiguous. Keep concrete, active voice, single purpose (Strategy #6).

### 4c — § 2 Background

Two or three sentences: prior state → gap or trigger → optional narrow context for **a reviewer agent**. Do **not** restate the whole feature; the parent file holds breadth.

### 4d — § 3 Change scope

Short bullets (**2–5 words** per bullet per dev-process). PR-scoped subset of parent's change list; split shared bullets across PRs; **flag** parent bullets that fit no PR boundary.

### 4e — § 4 Reasoning

Full sentences (not the short-bullet rule).

**### Why this approach** — two to four entries typical: cross-PR split rationale from **`### Single-concern strategy`**, sequencing from **`### Sequencing`**, structural choices from parent's design + this PR's slice.

**### Considered & rejected** — alternatives with why rejected; use parent text when present. If parent context has nothing honest, leave **`_TBD_`** and **flag** for **`coding-session`**.

### 4f — Echo to chat

Echo §§ 1–4 with the same headers as the file. Surface flags (unmapped parent bullets, **`_TBD_`** in **Considered & rejected**).

### 4a-bis — Append canonical `deploy-test-plan-verified` todo

After **4a** (full stub → per-PR template **or** first time the body is recognised as per-PR template with `## 7. Deploy test plan`), read frontmatter. If `id: deploy-test-plan-verified` already exists, **skip**.

Otherwise append this list item **immediately before** `isProject:` (indentation: two spaces before `-`, four before `id` / `content` / `status`, six before each `>-` continuation line — match sibling todos):

```yaml
 - id: deploy-test-plan-verified
 content: >-
 Mark done only when every Before-deploy and After-deploy step is checked
 (`[x]`) and the deploy section `**Status:**` reads `done` (walk via `deploy-walk`,
 or edit manually). Independent of PR merge; run `plan-reconcile` protocol branch when you want
 reconcile/archive after merges.
 status: pending
```

**Byte-identical** `content: >-` text must match **development-process.md** § *Frontmatter capstone todo (`deploy-test-plan-verified`)* — if that doc block changes, update this skill in the same change set.

**`StrReplace` anchor:** last existing todo's ` status: …` line + newline + `isProject:` → reinsert that status line + newline + the YAML block above + newline + `isProject:`. Append only; do not remove executor todos.

Echo: *"Inserted frontmatter todo `deploy-test-plan-verified` (per development-process.md)."*

### What not to draft here

Do **not** fully author §§ 5–8 as final text in the same turn as **4a** unless the **developer** explicitly chose a **fill** option in step 5 — those sections are usually best filled in **`coding-session`** once code paths exist. **`pre-pr-review`** treats missing or **`_TBD_`** § 5 / § 7 as hard problems and § 6 as under-documentation risk when the skill is run with strict gates — leaving **`_TBD_`** after **4a** is expected.

## Step 5 — Resolve implementation readiness

After §§ 1–4 are drafted and the deploy capstone todo is present, compute readiness for implementation.

### 5a — Readiness checks

Set `readyForImplementation: true` only when all are true:

- Target body has populated §§ 1–4.
- `## 1. Single concern` is one clear concern.
- `## 3. Change scope` has at least one concrete PR-scoped bullet.
- `## 4. Reasoning` has **Why this approach** populated.
- Parent `### PR list` row is matched and the parent `Plan:` link points to this target plan.
- Frontmatter includes `deploy-test-plan-verified`.

Set `readyForImplementation: false` when any of those checks fail. Add each missing item to `remainingTasks`.

### 5b — Planning completeness

§§ 5–8 may remain `_TBD_` after this skill. That does **not** block **`readyForImplementation`** by itself — see **Handoff to `coding-session`** for the split between speculative sketches here and substantive §§ 5–8 work in **`coding-session`**.

**Two-layer readiness (do not conflate):**

| Layer | Where | What passes |
|-------|--------|-------------|
| **Planning handoff** | This skill → `outputs.readyForImplementation` | §§ 1–4 drafted, capstone todo, parent link (§5a). §§ 5–8 may stay `_TBD_`. |
| **Worktree gate** | **`coding-session`** § *Auto-authorize implementation (pr-plan spawn)* when §5d passes `planningHandoffApproved` | Per-PR body may keep §§ 5–8 `_TBD_`; child lane opens worktree and implements without a second approval modal. Detached entry without spawn still uses the worktree-open gate. |

`readyForImplementation: true` does **not** bypass **`plan-ws-completeness.mjs`** or authorize worktrees on **this** lane. The Squad Leader §8 ship ledger must keep `phase: not-started` until **`coding-session`** reports `developerApprovedImplementation: true` (**`.sedea/centers/research-and-development/missions/plan-and-deliver/plan.mdc`** §7–§8). After §5d spawn, **`INCOMPLETE`** + **`EXPECTED_SECTIONS_5_8_TBD`** is **expected** — the child **auto-authorizes** worktrees when §§1–4 are drafted (no second modal). Detached **`coding-session`** still uses the worktree-open gate.

However:

- If § 4 **Considered & rejected** is `_TBD_`, add a non-blocking `remainingTasks` note for `coding-session`.
- If parent link is blocked, keep `continuationStatus: "active"` until **`plan-reconcile`** repairs it or the upstream agent explicitly accepts the partial state.
- Do not run worktrees or implementation on this lane; spawn **`coding-session`** only per §5d.

**`autoContinue` (frontmatter / spawn `inputs`):** Does **not** authorize skipping Step **5**, §5c, or auto-spawning **`coding-session`**. After §§1–4 are written, **always** run §5a → §5c on this lane (inline under **`new-plan`** or standalone). **`autoContinue: true`** only means readiness may be reported in **`outputs`** — implementation handoff still requires §5c **Start coding session** (or explicit **`defer`**) before §5d.

**Skip §5c on PR-breakdown auto-chain (binding):** When **`skipPrPlanHandoffModal: true`** (inline context from **`new-plan`** after **`pr-breakdown`** **`approve-list`** auto-expand of PR index **1**), after §5a passes run **`## Completion (inline)`** to the invoker with **`implementationHandoffStatus: not-offered`**, **`prPlanHandoffSkipped: true`**, and populated §§1–4 fields — **do not** open §5c on **this** inline **`pr-plan`** turn.

**`skipPrPlanHandoffModal` skips §5c on the inline pr-plan turn only** — it does **not** forbid **`AGENT_RUN_REQUEST_V1`** for **`coding-session`** from the invoker lane afterward.

| Invoker (`parentAgentRole`) | Who owns §5d-equivalent spawn or §5c re-entry |
|-----------------------------|-----------------------------------------------|
| **`new-plan-agent`** on **`planner`** lane | **`planner`** Step **7b** may re-enter inline **`pr-plan`** §5c on the same **`targetPlanPath`**, or defer |
| **`new-plan-agent`** on **`phase-planner`** lane (`phase-planner-agent` subtree) | **`phase-planner/SKILL.md`** Step **5f** — offer spawn or **`reenter-pr-plan-5c`** on **that** child lane; **forbidden** to default to detached **`coding-session`** or **`planner`** prose redirect |

When inline under **`phase-planner`**, include **`invokerRole: phase-planner-agent`** (or equivalent) in inline completion so the parent runs Step **5f** without inferring from README shorthand alone.

**Forbidden after §§1–4 (binding — inline under `new-plan` or upstream on planner):**

- Report **`## Completion (inline)`** to the invoker while **`implementationHandoffStatus`** is still **`not-offered`** (§5c not yet shown) **unless** **`skipPrPlanHandoffModal: true`**.
- Bubble **`readyForImplementation: true`** upstream and return to **`planner`** Step **7b** master-plan menus without offering §5c on **this** lane first **unless** **`skipPrPlanHandoffModal: true`** (then include **`prPlanHandoffSkipped: true`** in inline completion).
- Treat Squad Leader §2 **existing PRD** intake (no session **`ad-hoc-prd`**) as permission to skip §5c — PRD source does **not** change the **`pr-plan`** → **`coding-session`** handoff chain.

Set **`implementationHandoffStatus: "offered"`** when §5c modal is emitted; **`deferred`** when the developer picks **`defer`**; **`spawned-coding-session`** after §5d.

### 5c — Hand back (recap + structured choice)

Per **`.sedea/centers/sedea/rules/2_ask-question-instructions.mdc`** and **`../README.md`** § *Recap, structured choice, act (plan-and-deliver)*. Do **not** use “Turn A/B” labels in developer-facing chat.

**Preferred (one assistant message):** **AskQuestion tool** with brief recap, or **`MC_PHASED_RESPONSE_V1`** with:

- `display.markdown` — link + one-line readiness summary (below)
- `askQuestion` — modal (`modalTitle`: *PR plan — next move*; options from the table)

**Legacy split (obsolete on Mission Control lanes):** Prefer **`MC_PHASED_RESPONSE_V1`** (recap in `display.markdown` + `askQuestion` same turn). If the tool is unavailable, still **must** close with structured choice — do not end with recap-only prose.

#### Recap (same turn as structured choice)

When using the legacy split, do **not** include **`AGENT_RUN_REQUEST_V1`** or **`AGENT_RESULT_RESPONSE_V1`** in the recap message. Put recap content in **`display.markdown`** and **`askQuestion`** on the **same** turn per [`.sedea/centers/sedea/rules/2_ask-question-instructions.mdc`](.sedea/centers/sedea/rules/2_ask-question-instructions.mdc) § **Turn completion invariant**. **Obsolete:** recap-only message with **AskQuestion** deferred to a separate turn.

1. A **`file://`** link to the target `.plan.md` under `.sedea/operations/.../plans/...`.
2. One-line summary: *Drafted per-PR §§ 1–4; implementation readiness: `<ready|not ready>`.*
3. Planning handoff note: *§§ **5–8** stay **`_TBD_`** until **`coding-session`** fills them on the implementation lane (or you choose **Pre-fill §§ 5–8 here (sketch, then coding)** below). Worktree validation may report **incomplete** — that is expected; the child lane **auto-starts** implementation when you pick **Start coding session** (no second approval modal) unless you pre-filled here or use detached entry.*

Do **not** echo the full §§ 1–4 body in chat unless the developer asked for a fill sketch in the same flow.

#### Structured choice — approval modal

Invoke **AskQuestion**, **`MC_PHASED_RESPONSE_V1`** (`modalTitle`: *PR plan — next move*). When using without a phased envelope, sentinel + JSON only — no prose before the sentinel.

Required options (brief `label`; put detail in `prompt` when needed):

| Option id | Label |
|-----------|--------|
| `start-coding-session` | Start coding session — fill §§5–8 there |
| `revise-section` | Revise a section |
| `prefill-sections` | Pre-fill §§5–8 here (sketch, then coding) |
| `commit-reminder` | Commit when ready |
| `defer` | Defer |
| `more-details` | More details for option _ |

- **`start-coding-session`** — Run §5d when §5a passes; if not ready, explain blockers in `remainingTasks` and do **not** spawn.
- **`revise-section`** — Developer names § *N* and feedback; one focused `StrReplace`; echo; re-offer §5c.
- **`prefill-sections`** — Same as former option 2 (speculative § 5–8 sketch); re-offer §5c.
- **`commit-reminder`** — Remind the developer to commit; this skill does **not** run `git`; re-offer §5c.
- **`defer`** — No spawn; set `implementationHandoffStatus: "deferred"` when reporting completion.

**Stop** after §5c AskQuestion or after §5d spawn announcement — do not run **`coding-session`** procedures on this lane.

**Inline under `new-plan`:** After §5c or §5d, report **`## Completion (inline)`** to the invoker — do **not** emit **`AGENT_RESULT_RESPONSE_V1`**. The **`new-plan`** lane merges ledger fields and aggregates **`coding-session`** child results per **`new-plan/SKILL.md`** step **5b**.

### 5d — Spawn `coding-session` (after `start-coding-session`)

Run only when the developer chose **`start-coding-session`** and §5a readiness passes (or they explicitly accept starting with known blockers — still run §5d but pass `readyForImplementation: false` and list blockers in `initiatingPrompt`).

1. **Resolve paths** (all absolute; never documentation placeholders):
 - `targetPlanPath` — absolute path to the target `.plan.md` on this lane.
 - `targetPlanSlug` — slug from filename.
 - `parentPlanPath` / `parentPlanSlug` / `parentIndex` — from steps 1–3 when known.
 - `ledgerParent` — parent slug from sidecar `parent:` (not a placeholder string).
 - `repoPath` — walk up from `targetPlanPath` until **`.sedea/centers/sedea/`** exists; use the parent of **`.sedea/`** as hosting repo root.
2. **Build `initiatingPrompt`** — one short block with required bullets:
 - §1 single concern; §3 change-scope bullets; parent `### PR list` item **N**; `readyForImplementation` and §5a gaps; non-blocking `remainingTasks`.
 - `planningHandoffMode: sections-1-4-complete`
 - `sections5to8Status: TBD-by-design — child owns substantive fill; do not treat as pr-plan failure`
 - `expectedPlanCompleteness: incomplete-until-coding-session-fills-5-8 — auto-authorize worktree when EXPECTED_SECTIONS_5_8_TBD; no second approval modal`
 - `planningHandoffApproved: true` when `readyForImplementation: true` (layer 1 consent from §5c **Start coding session**)
3. **Emit exactly one** child-spawn line (valid JSON on the same line; new UUID per spawn):

 - Cross-check **`../README.md`** § *Universal spawn preflight* (including display-metadata rows **8–10**).
 - `skillPath`: `.sedea/centers/research-and-development/missions/plan-and-deliver/skills/coding-session/SKILL.md`
 - `name`: topic-specific label from §1 single concern or **`targetPlanSlug`** — **not** generic "Coding session" alone when a sharper label fits (≤64 chars)
 - `slug`: `coding-session-<targetPlanSlug>` (unique per dispatch)
 - `description`: one-line implementation scope (for example *Worktree and implementation for PR N …*)
 - `inputs`: `targetPlanPath`, `targetPlanSlug`, `readyForImplementation`, `planningHandoffApproved: true` (only when `readyForImplementation: true`), `planningHandoffMode: "sections-1-4-complete"` (required when `readyForImplementation: true`), `repoPath`, `ledgerParent`, `upstreamSkill: "pr-plan"`; include `parentPlanPath`, `parentPlanSlug`, `parentIndex` when known
 - Optional `warmUpRules`: merge **`.sedea/centers/research-and-development/rules/20_efficient-pr-shipping.mdc`** if not already loaded from skill frontmatter

4. Emit **`AGENT_RUN_REQUEST_V1`**, announce waiting for the **`coding-session`** child result, and close the turn with structured choice per [`.sedea/centers/sedea/rules/2_ask-question-instructions.mdc`](.sedea/centers/sedea/rules/2_ask-question-instructions.mdc) § **Turn completion invariant** — no second spawn in the same turn; do not prose-only stop.
5. Set `implementationHandoffStatus: "spawned-coding-session"` and record `spawnCorrelationId` matching the spawn request until the child terminal arrives.

### 5e — Aggregate `coding-session` child result

When Mission Control delivers **`AGENT_RESULT_RESPONSE_V1`** for the spawn `correlationId`:

1. Match by `correlationId` first, then `outputs.targetPlanPath` / `outputs.targetPlanSlug`.
2. Summarize for the developer: child status, whether worktrees were created, `developerApprovedImplementation`, `planCompleteness`, and `remainingTasks`.
3. Copy `outputs.activeLanes`, `outputs.openLedgerEntries`, and child `remainingTasks` into this lane's result when reporting upstream.
4. When child **`outputs.prShipComplete`** is **`true`**: merge **`shipPhase`**, **`rowStatus`**, **`mainPullStatus`**, **`archivedSlugs`**, and echo **`parentPlanPath`**, **`parentPlanSlug`**, **`parentIndex`** into this lane's **`outputs`**; set **`outputs.implementationHandoffStatus: "coding-session-terminal"`**; set **`outputs.codingSessionStatus`** from child **`status`**.
5. **Re-emit updated terminal:** On a **standalone** spawned lane, emit a fresh **`AGENT_RESULT_RESPONSE_V1`** (same **`correlationId`**) with merged **`outputs`** including **`prShipComplete`** and parent index fields — so **`new-plan`** / **`pr-breakdown`** / **`planner`** receive ship-complete without manual **Ship recap**. **Inline under `new-plan`:** report merged fields in **`## Completion (inline)`** prose instead; the **`new-plan`** lane propagates per **`new-plan/SKILL.md`** step **5b**.
6. Do **not** treat child `developerApprovedImplementation: true` as permission to edit code on the **`pr-plan`** lane.
7. Re-offer §5c **AskQuestion** when the developer may revise the plan or spawn again after a failed/partial child run — unless **`prShipComplete: true`** and the developer defers follow-up on this lane (upstream owns **`expand-eligible`**).

## Step 5a — Follow-up turns

On revise requests, re-read the section, `StrReplace`, echo, re-offer the step 5c **AskQuestion** menu.

On **fill** requests for § 5–8, draft the requested section with explicit *sketch* caveats; offer revise or accept; executor still owns final polish. After any fill, recompute implementation readiness and update the result contract.

## One primary choice per turn — surface observations

Perform exactly what was chosen. List short **numbered observations** for gaps (parent list mismatch, thin **Considered & rejected**, heavy § 3). No typed flag-control vocabulary.

## Scope guard

**Owns:** target PR plan **body** §§ 1–4; **4a-bis** append-only capstone todo; implementation readiness assessment; optional **fill** sketches for § 5–8 when explicitly chosen.

**Out of scope:** parent **`### PR list`** edits; parent **`Plan:`** wiring (**`plan-reconcile`**); frontmatter `name` / `overview` / `isProject` (except **4a-bis** append); running **`coding-session`** procedures on this lane (worktrees, `git worktree`, MCP attach, implementation edits); Master / Phase templates (**`planner`**, **`phase-planner`**).

**In scope for spawn:** one **`AGENT_RUN_REQUEST_V1`** for **`coding-session`** per §5d after **AskQuestion** **`start-coding-session`** with real absolute paths (standalone spawned lane **or** inline under **`new-plan`**).

Stop after the step 5c **AskQuestion** turn, after §5d spawn announcement, or after §5e child summary — per terminal stop rules below. When **`parentAgentRole`** is **`new-plan-agent`**, skip **`AGENT_RESULT_RESPONSE_V1`** and report **`## Completion (inline)`** instead.

## Completion (spawned)

### Host protocol line (required)

Emit **exactly one** line on its own: `AGENT_RESULT_RESPONSE_V1` immediately followed by a single JSON object on the **same** line. Required keys: `version` (1), `correlationId` (from the spawn request), `status`, `summary`, `outputs`, `errors` (use `[]` when none). Populate `outputs` from the list below. The emitted line must be **valid JSON** (no `{...}` placeholders in the actual output). Re-emit an **updated** line after user-requested follow-up on this lane (same `correlationId`). See **`.sedea/centers/sedea/skills/README.md`** § *Spawned terminal line*.

Required `outputs` fields:

- `outputs.targetPlanPath`, `outputs.targetPlanSlug`
- `outputs.parentPlanPath`, `outputs.parentPlanSlug`, `outputs.parentIndex`
- `outputs.parentPlanLinkStatus` — `linked` | `blocked` | `unknown`
- `outputs.readyForImplementation`, `outputs.implementationReadinessReasons`
- `outputs.implementationHandoffStatus` — `not-offered` | `offered` | `deferred` | `spawned-coding-session` | `coding-session-terminal` (child finished); not `developerApprovedImplementation`
- `outputs.prPlanHandoffSkipped` — `true` when §5c was skipped via **`skipPrPlanHandoffModal`** (auto-chain from **`pr-breakdown`** **`approve-list`**)
- `outputs.spawnCorrelationId` — UUID from §5d when `implementationHandoffStatus` is `spawned-coding-session` or until child terminal is merged
- `outputs.codingSessionStatus` — echo child `status` when §5e applies
- `outputs.prShipComplete` — `true` when §5e merged child reconcile complete (archive + main pull)
- `outputs.mainPullStatus`, `outputs.archivedSlugs` — when §5e merged from child
- `outputs.shipPhase`, `outputs.rowStatus` — echo child when **`prShipComplete: true`**
- `outputs.activeLanes`, `outputs.openLedgerEntries`, `outputs.remainingTasks`
- `outputs.continuationOwner`: `"pr-plan-agent"`
- `outputs.continuationStatus`:
 - `terminal` when handoff menu is complete, no **`coding-session`** child is open, parent link is trusted, and no blocking `remainingTasks` (or developer deferred/abandoned)
 - `active` when parent link repair, fill sketches, **`coding-session`** child lane is open, or §5c menu not yet offered
 - `terminal` with `readyForImplementation: false` only when upstream or developer marks the PR plan deferred, abandoned, or out of scope

Complete §5d spawn (when chosen) + wait announcement **before** the terminal line when spawning on a **standalone** spawned lane. Stop after the terminal line. Do not emit a second **`AGENT_RUN_REQUEST_V1`** in the same turn after the terminal line (see **`../README.md`** § *Terminal stop (normative)*). **Inline under `new-plan`:** do **not** emit the terminal line — use **`## Completion (inline)`** below.

## Completion (inline)

Report the fields below in prose to the invoker on the **same lane**. Do **not** emit `AGENT_RUN_REQUEST_V1` for **`pr-plan`**, `AGENT_RESULT_RESPONSE_V1`, or `MC_DISPATCH_RESOLVED_V1`. Do **not** add a **Host protocol line** under this section (see **`.sedea/centers/sedea/rules/4_mission.mdc`** § *Inline completion* and **`.sedea/centers/sedea/skills/README.md`** § *Completion (inline)*). **Exception:** §5d may still emit **`AGENT_RUN_REQUEST_V1`** for **`coding-session`**.

**Primary path:** **`new-plan`** step 4 runs this skill **inline** (`parentAgentRole: "new-plan-agent"`). Use the same `outputs` semantics as **`## Completion (spawned)`** in prose only — the **`new-plan`** lane merges ledger fields and aggregates **`coding-session`** per **`new-plan/SKILL.md`** step **5b**. **Standalone** mission dispatch may still spawn this skill on a child lane; then use **`## Completion (spawned)`** instead.
