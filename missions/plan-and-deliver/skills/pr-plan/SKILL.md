---
name: pr-plan
description: >-
  Populate a PR plan body: draft §§ 1–4 (Single concern, Background, Change scope,
  Reasoning) per Sedea's New Feature Development Process per-PR template. Mirrors
  **phase-plan** for mode #3: scope from parent's `### PR list` item N, grounds § 4
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
  autoContinue:
    type: boolean
    description: When true, report implementation readiness after PR planning; this skill still does not start coding.
    required: false
    default: true
warmUpRules:
  - ".sedea/centers/research-and-development/missions/plan-and-deliver/plan.mdc"
  - ".sedea/centers/research-and-development/missions/plan-and-deliver/skills/README.md"
  - ".sedea/centers/research-and-development/docs/development-process.md"
  - ".sedea/centers/research-and-development/rules/30_planning-target-resolution.mdc"
---

# PR plan: §§ 1–4 from the parent plan

This skill drives the **per-PR planning move** under Sedea's New Feature Development Process: take a freshly-spawned PR plan stub (indexed child from the parent's **`### PR list`** under **`PR breakdown`**, typically right after the **`new-plan`** protocol branch) and populate §§ **1–4** of the **per-PR template** — Single concern, Background, Change scope, Reasoning. §§ **5–8** and the § 7 deploy scaffold stay **`_TBD_`** for **`coding-session`** and later turns unless the **developer** explicitly asks for a **fill** sketch here.

The agent has enough context after step 3 to draft §§ 1–4 from the parent's **`### PR list`** row, **`### Single-concern strategy`**, **`### Sequencing`**, and earlier parent sections (diagrams / changes as *context* — PR plans do **not** embed parent diagrams in the body). § 4 is consumed by **a coding agent** (PR description) and **pre-pr-review** / **a reviewer agent**; keep sentences unambiguous. This skill reports planning readiness; **worktrees and ship execution** belong to **`coding-session`** on a **separate** lane.

The procedure below is a hard contract — do **not** skip steps or start drafting before the target is verified as a PR plan stub.

## Handoff to `coding-session` (spawned child lane)

**`pr-plan`** and **`coding-session`** are **sequential skills on different lanes**. After planning handoff approval, **`pr-plan`** emits **`AGENT_RUN_REQUEST_V1`** for **`coding-session`**; the child owns worktrees, workspace attach, and **implements** the PR plan on that lane (default **spawned implementation lane** — see **`coding-session`** § *Execution mode after worktree attach*).

| Concern | **`pr-plan`** (this skill) | **`coding-session`** |
|---------|---------------------------|----------------------|
| Per-PR §§ **1–4** | Draft and maintain | Read; revise only when the developer returns to planning |
| Per-PR §§ **5–8** | Default **`_TBD_`**; optional *speculative* sketch if the developer picks a fill option | Substantive fill during implementation; final text once code paths are known |
| `readyForImplementation` | Set in `outputs` and passed in spawn `inputs` | Read as layer-1 hint only |
| Worktrees, implementation, ship chain | Out of scope — spawn only | Owns (spawned-lane default) |
| Start **`coding-session`** | Step **5d** after **AskQuestion** **Start coding session** (§5c) when §5a passes | Spawned child lane; layer 2 worktree-open gate runs there |

**Signals (canonical):** **`.sedea/centers/research-and-development/rules/30_planning-target-resolution.mdc`** § *Planning readiness vs ship* and § *Agent checklist (planning vs ship — do not conflate)* — `readyForImplementation` on this lane does **not** authorize code edits, worktrees, commit/push, or §8 `phase` past `not-started`.

**Detached entry still valid:** The developer may still start **`coding-session`** via a new Mission Control session, natural language, or snapshot per **development-process.md** § *Start implementation (`coding-session` entry)* — without a **`pr-plan`** spawn.

## Trigger

- Mission dispatch or explicit request to run the **`pr-plan`** protocol branch.
- Natural language: draft PR plan, populate PR plan body, fill per-PR §§ 1–4.
- Immediately after **`new-plan`** ignition when the parent dual-title is **`PR breakdown`** — the usual next step on the new child stub.

The **developer** picks the next move per **30_planning-target-resolution** § *Sedea input channel*.

## Step 1 — Identify the target plan and verify it's a PR plan stub

The skill operates on a **target** `.plan.md` resolved before this skill runs, per [`30_planning-target-resolution.mdc`](../../../../rules/30_planning-target-resolution.mdc) § *Resolution order*. Acknowledge the target slug in one line when this skill starts. Resolve targets from session, snapshot, or explicit path — **planning-target-resolution** is normative. Do **not** infer the target from the IDE’s focused-file list alone.

When spawned by `new-plan`, `targetPlanPath`, `targetPlanSlug`, `parentPlanPath`, `parentPlanSlug`, and `parentIndex` are already locked. Treat missing or conflicting values as a spawn-contract failure: stop with `failure` or `partial` and report the missing field. Do not fall back to IDE focus or free-form target discovery in spawned mode.

If there is no resolved target, **stop** and emit a fresh *Where we are now in the plan tree* snapshot (information-only turn); in a **separate** turn, collect the lane pick via **AskQuestion** or **`MC_ASKQUESTION_V1`** per **30_planning-target-resolution** § *Sedea input channel*, then continue.

Acknowledge in one line: *"Target plan: `<slug>`."*

### 1a — Verify the body's template state

Read the target plan in full and apply:

| Body state | Meaning | Action |
| --- | --- | --- |
| Has `## Overview` + `## Phasing` + `## Out of scope` (**new-plan** stub) | Fresh stub, drafting needed | Step 1b → Step 2 → Step 3 → Step 4 (full body rewrite) |
| Has `## 1. Single concern` … `## 4. Reasoning` with `_TBD_` under one or more of §§ 1–4 | Partially drafted | Step 1b → Step 2 → Step 3 → Step 4 (fill only still-`_TBD_` sections) |
| Has §§ 1–4 all populated | Already drafted | Step 5 (handoff menu) |
| Master Plan body (`## 4. Architectural design` + `## 6. Delivery phases \| PR breakdown`) | Wrong skill | **Stop:** use **`master-plan`**. |
| Phase plan body (`## 1. Background` … `## 4. Changes` for mode #2) | Wrong skill | **Stop:** use **`phase-plan`**. |

Acknowledge the body state in one line.

If the **new-plan** stub sections carry **non-stub user content**, merge it into § 2 / § 3 in your own words and **flag** that merge in the echo or handoff.

### 1b — Verify parent topology

Read the target plan's sidecar `<slug>.state.yaml` for `parent:`.

- `parent: null` (or sidecar missing) → **stop:** PR plans require a parent under **`PR breakdown`**. Fix via **`plan-reconcile`** or by hand, or use **`master-plan`** if this file should be a Master Plan.
- `parent:` does not resolve to an existing `.plan.md` under the same `.sedea/operations/.../plans/` tree → **stop:** fix sidecar before drafting.
- Parent is a **roadmap topic** grouping plan → **stop:** children should be Master Plans, not PR plans; fix sidecar or use **`master-plan`**.
- Parent resolves; read parent's dual-title block (`## 6. …` Master, `## 5. …` Phase):
  - Heading **`PR breakdown`** → proceed.
  - Heading **`Delivery phases`** → **stop:** use **`phase-plan`** on this file (phase child), not **`pr-plan`**.
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

One sentence. Default: copy or lightly tighten the parent's **Single concern** sub-bullet for item **N**. Keep concrete, active voice, single purpose (Strategy #6).

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

**`StrReplace` anchor:** last existing todo's `    status: …` line + newline + `isProject:` → reinsert that status line + newline + the YAML block above + newline + `isProject:`. Append only; do not remove executor todos.

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
| **Worktree gate** | **`coding-session`** § *Worktree-open gate* | Per-PR body has **no** `_TBD_` outside fenced code, unless the developer chooses **Start with incomplete plan (executive override)** or sends **`override incomplete plan`** in the message. |

`readyForImplementation: true` does **not** bypass **`plan-ws-completeness.mjs`** or authorize worktrees. The Squad Leader §8 ship ledger must keep `phase: not-started` until completeness passes or is overridden **and** **`coding-session`** reports `developerApprovedImplementation: true` (**`.sedea/centers/research-and-development/missions/plan-and-deliver/plan.mdc`** §7–§8). Agents that report “ready” here may still hit **`INCOMPLETE`** at worktree open — that is expected; point the developer to finish §§ 5–8, pre-fill sketches (option 2), or the **`coding-session`** override path.

However:

- If § 4 **Considered & rejected** is `_TBD_`, add a non-blocking `remainingTasks` note for `coding-session`.
- If parent link is blocked, keep `continuationStatus: "active"` until **`plan-reconcile`** repairs it or the upstream agent explicitly accepts the partial state.
- Do not run worktrees or implementation on this lane; spawn **`coding-session`** only per §5d.

### 5c — Hand back (information-only + AskQuestion)

**Transcript boundary:** One assistant turn with (1)–(2) only — no **AskQuestion** in the same message. A **separate** turn runs **AskQuestion** per **`.sedea/centers/sedea/rules/2_ask-question-instructions.mdc`**.

1. A **`file://`** link to the target `.plan.md` under `.sedea/operations/.../plans/...`.
2. One-line summary: *Drafted per-PR §§ 1–4; implementation readiness: `<ready|not ready>`; §§ 5–8 remain **`_TBD_`** for **`coding-session`** unless you request a fill sketch.*

**Next turn — AskQuestion** (`modalTitle`: *PR plan — next move*). Required options (brief `label`; put detail in `prompt` when needed):

| Option id | Label |
|-----------|--------|
| `start-coding-session` | Start coding session |
| `revise-section` | Revise a section |
| `prefill-sections` | Pre-fill §§ 5–8 (sketch) |
| `commit-reminder` | Commit when ready |
| `defer` | Defer |
| `more-details` | More details for option _ |

- **`start-coding-session`** — Run §5d when §5a passes; if not ready, explain blockers in `remainingTasks` and do **not** spawn.
- **`revise-section`** — Developer names § *N* and feedback; one focused `StrReplace`; echo; re-offer §5c.
- **`prefill-sections`** — Same as former option 2 (speculative § 5–8 sketch); re-offer §5c.
- **`commit-reminder`** — Remind the developer to commit; this skill does **not** run `git`; re-offer §5c.
- **`defer`** — No spawn; set `implementationHandoffStatus: "deferred"` when reporting completion.

**Stop** after §5c AskQuestion or after §5d spawn announcement — do not run **`coding-session`** procedures on this lane.

### 5d — Spawn `coding-session` (after `start-coding-session`)

Run only when the developer chose **`start-coding-session`** and §5a readiness passes (or they explicitly accept starting with known blockers — still run §5d but pass `readyForImplementation: false` and list blockers in `initiatingPrompt`).

1. **Resolve paths** (all absolute; never documentation placeholders):
   - `targetPlanPath` — absolute path to the target `.plan.md` on this lane.
   - `targetPlanSlug` — slug from filename.
   - `parentPlanPath` / `parentPlanSlug` / `parentIndex` — from steps 1–3 when known.
   - `ledgerParent` — parent slug from sidecar `parent:` (not a placeholder string).
   - `repoPath` — walk up from `targetPlanPath` until **`.sedea/centers/sedea/`** exists; use the parent of **`.sedea/`** as hosting repo root.
2. **Build `initiatingPrompt`** — one short block: §1 single concern; §3 change-scope bullets; parent `### PR list` item **N**; `readyForImplementation` and §5a gaps; non-blocking `remainingTasks`.
3. **Emit exactly one** child-spawn line (valid JSON on the same line; new UUID per spawn):

   - `skillPath`: `.sedea/centers/research-and-development/missions/plan-and-deliver/skills/coding-session/SKILL.md`
   - `name`: `Coding session`
   - `slug`: `coding-session-<targetPlanSlug>` (unique per dispatch)
   - `description`: Worktree and implementation handoff after pr-plan
   - `inputs`: `targetPlanPath`, `targetPlanSlug`, `readyForImplementation`, `repoPath`, `ledgerParent`, `upstreamSkill: "pr-plan"`; include `parentPlanPath`, `parentPlanSlug`, `parentIndex` when known
   - Optional `warmUpRules`: merge **`.sedea/centers/research-and-development/rules/20_efficient-pr-shipping.mdc`** if not already loaded from skill frontmatter

4. Announce that this agent is waiting for the **`coding-session`** child result; **stop** — no second spawn in the same turn.
5. Set `implementationHandoffStatus: "spawned-coding-session"` and record `spawnCorrelationId` matching the spawn request until the child terminal arrives.

### 5e — Aggregate `coding-session` child result

When Mission Control delivers **`AGENT_RESULT_RESPONSE_V1`** for the spawn `correlationId`:

1. Match by `correlationId` first, then `outputs.targetPlanPath` / `outputs.targetPlanSlug`.
2. Summarize for the developer: child status, whether worktrees were created, `developerApprovedImplementation`, `planCompleteness`, and `remainingTasks`.
3. Copy `outputs.activeLanes`, `outputs.openLedgerEntries`, and child `remainingTasks` into this lane's result when reporting upstream.
4. Do **not** treat child `developerApprovedImplementation: true` as permission to edit code on the **`pr-plan`** lane.
5. Re-offer §5c **AskQuestion** when the developer may revise the plan or spawn again after a failed/partial child run.

## Step 5a — Follow-up turns

On revise requests, re-read the section, `StrReplace`, echo, re-offer the step 5c **AskQuestion** menu.

On **fill** requests for § 5–8, draft the requested section with explicit *sketch* caveats; offer revise or accept; executor still owns final polish. After any fill, recompute implementation readiness and update the result contract.

## One primary choice per turn — surface observations

Perform exactly what was chosen. List short **numbered observations** for gaps (parent list mismatch, thin **Considered & rejected**, heavy § 3). No typed flag-control vocabulary.

## Scope guard

**Owns:** target PR plan **body** §§ 1–4; **4a-bis** append-only capstone todo; implementation readiness assessment; optional **fill** sketches for § 5–8 when explicitly chosen.

**Out of scope:** parent **`### PR list`** edits; parent **`Plan:`** wiring (**`plan-reconcile`**); frontmatter `name` / `overview` / `isProject` (except **4a-bis** append); running **`coding-session`** procedures on this lane (worktrees, `git worktree`, MCP attach, implementation edits); Master / Phase templates (**`master-plan`**, **`phase-plan`**).

**In scope for spawn:** one **`AGENT_RUN_REQUEST_V1`** for **`coding-session`** per §5d after **AskQuestion** **`start-coding-session`** with real absolute paths.

Stop after the step 5c **AskQuestion** turn, after §5d spawn announcement, or after §5e child summary — per terminal stop rules below.

## Completion (spawned)

### Host protocol line (required)

Emit **exactly one** line on its own: `AGENT_RESULT_RESPONSE_V1` immediately followed by a single JSON object on the **same** line. Required keys: `version` (1), `correlationId` (from the spawn request), `status`, `summary`, `outputs`, `errors` (use `[]` when none). Populate `outputs` from the list below. The emitted line must be **valid JSON** (no `{...}` placeholders in the actual output). Re-emit an **updated** line after user-requested follow-up on this lane (same `correlationId`). See **`.sedea/centers/sedea/skills/README.md`** § *Spawned terminal line*.

Required `outputs` fields:

- `outputs.targetPlanPath`, `outputs.targetPlanSlug`
- `outputs.parentPlanPath`, `outputs.parentPlanSlug`, `outputs.parentIndex`
- `outputs.parentPlanLinkStatus` — `linked` | `blocked` | `unknown`
- `outputs.readyForImplementation`, `outputs.implementationReadinessReasons`
- `outputs.implementationHandoffStatus` — `not-offered` | `offered` | `deferred` | `spawned-coding-session` | `coding-session-terminal` (child finished); not `developerApprovedImplementation`
- `outputs.spawnCorrelationId` — UUID from §5d when `implementationHandoffStatus` is `spawned-coding-session` or until child terminal is merged
- `outputs.codingSessionStatus` — echo child `status` when §5e applies
- `outputs.activeLanes`, `outputs.openLedgerEntries`, `outputs.remainingTasks`
- `outputs.continuationOwner`: `"pr-plan-agent"`
- `outputs.continuationStatus`:
  - `terminal` when handoff menu is complete, no **`coding-session`** child is open, parent link is trusted, and no blocking `remainingTasks` (or developer deferred/abandoned)
  - `active` when parent link repair, fill sketches, **`coding-session`** child lane is open, or §5c menu not yet offered
  - `terminal` with `readyForImplementation: false` only when upstream or developer marks the PR plan deferred, abandoned, or out of scope

Complete §5d spawn (when chosen) + wait announcement **before** the terminal line when spawning. Stop after the terminal line. Do not emit a second **`AGENT_RUN_REQUEST_V1`** in the same turn after the terminal line (see **`../README.md`** § *Terminal stop (normative)*).

## Completion (inline)

Report the fields below in prose to the invoker on the **same lane**. Do **not** emit `AGENT_RUN_REQUEST_V1`, `AGENT_RESULT_RESPONSE_V1`, or `MC_DISPATCH_RESOLVED_V1`. Do **not** add a **Host protocol line** under this section (see **`.sedea/centers/sedea/rules/4_mission.mdc`** § *Inline completion* and **`.sedea/centers/sedea/skills/README.md`** § *Completion (inline)*).

Spawned from **`new-plan`** or decomposition paths in normal flow. If run inline, use the same `outputs` semantics as **`## Completion (spawned)`** in prose only.
