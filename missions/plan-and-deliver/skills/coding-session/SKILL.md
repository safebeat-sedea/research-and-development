---
name: coding-session
description: >-
  **Coding session** protocol branch: create a git worktree + branch from origin/main,
  record worktrees and session focus in the plan sidecar via plan-state.mjs, attach the
  worktree in the same Sedea workbench (Mission Control sedea_add_worktree_folder per
  20_efficient-pr-shipping.mdc), then run **`scripts/bootstrap-worktree-dev.sh`** on
  **`WORKTREE_ROOT`** before implementation. On a **spawned child lane** with layer-2 approval,
  **implement the anchored PR plan on this lane** in that worktree; on **prompt-only**
  entry, emit a copy/paste-safe two-phase session prompt for a separate coding chat.
  After the implementation cut point run the **Pre-PR cut-point gate** (diff review, optional
  §7 Before deploy walk), then spawn **pre-pr-review**. Plan-anchored runs validate
  per-PR plans with plan-ws-completeness.mjs (_TBD_ in body requires completion or
  explicit override incomplete plan). Use under mission dispatch, natural language, or
  after planning when handing off implementation.
inputs:
  targetPlanPath:
    type: string
    description: Absolute or workspace-relative path to the PR plan to implement.
    required: false
  targetPlanSlug:
    type: string
    description: Slug for the PR plan to implement.
    required: false
  readyForImplementation:
    type: boolean
    description: Optional hint from a prior **pr-plan** menu (planning handoff only). Does not authorize worktrees.
    required: false
  developerApprovedImplementation:
    type: boolean
    description: Layer 2 output — true only after an authorizing worktree-open gate choice. Not supplied by **pr-plan**.
    required: false
  repoPath:
    type: string
    description: Absolute path to the hosting repo root for a single-repo coding session.
    required: false
  repoPaths:
    type: array
    description: Absolute paths to hosting repo roots for a multi-repo coding session.
    required: false
    default: []
  baseBranch:
    type: string
    description: Remote base branch to branch from; default origin/main unless repo rules say otherwise.
    required: false
    default: origin/main
  branchName:
    type: string
    description: Optional explicit branch name; otherwise derive from plan slug and local branch conventions.
    required: false
  ledgerParent:
    type: string
    description: Ledger parent slug/path copied from the upstream planning agent.
    required: false
  upstreamSkill:
    type: string
    description: Optional context label (developer dispatch, snapshot, pr-plan spawn, planning skill).
    required: false
  planningHandoffMode:
    type: string
    description: >-
      When "sections-1-4-complete" (from pr-plan §5d spawn), §§5–8 may stay _TBD_;
      use Worktree-open gate (pr-plan spawn handoff), not executive-override framing.
    required: false
  promptOnly:
    type: boolean
    description: >-
      When true, stop after worktree attach and emit an external session prompt only (detached
      handoff). Default false for Mission Control spawn from pr-plan — same lane implements.
    required: false
    default: false
warmUpRules:
  - ".sedea/centers/research-and-development/missions/plan-and-deliver/plan.mdc"
  - ".sedea/centers/research-and-development/missions/plan-and-deliver/skills/README.md"
  - ".sedea/centers/research-and-development/docs/development-process.md"
  - ".sedea/centers/research-and-development/rules/20_efficient-pr-shipping.mdc"
  - ".sedea/centers/research-and-development/rules/30_planning-target-resolution.mdc"
---

# Coding session

Hand off a unit of work into a **dedicated git worktree**, with the worktree visible in the **same Sedea workbench** (multi-root workspace), not a second editor process. **Execution mode** after setup depends on entry path — see [Execution mode after worktree attach](#execution-mode-after-worktree-attach).

**Owns:** per-PR plan §§ **5–8** during implementation (repo rules impact, tests, deploy plan, caveats); `git worktree add`, `plan-state.mjs set-worktrees` / `set-session`, Mission Control worktree attach, **mandatory worktree bootstrap** (`scripts/bootstrap-worktree-dev.sh`), pre-worktree validation + worktree-open gate; **spawned-lane implementation** or curated **prompt-only** session prompt emission; **Pre-PR cut-point gate** (diff review + §7 Before deploy walk) before ship-chain spawns (**`pre-pr-review`**, **`create-pr`**, inline **`pr-review`**).

**Out of scope:** drafting per-PR §§ **1–4** ( **`pr-plan`** ); implementing hosting repo code when this run is **prompt-only** (see [Prompt-only handoff](#prompt-only-handoff)); opening PRs from the planning lane; **`plan-reconcile`** archive cadence except where this skill references it for cleanup narrative.

## Structured choice (Mission Control)

Approval gates and branch picks use **AskQuestion**, **`MC_PHASED_RESPONSE_V1`**, or **`MC_ASKQUESTION_V1`** per **`.sedea/centers/sedea/rules/2_ask-question-instructions.mdc`** and **`../README.md`** § *Recap, structured choice, act* — **preferred:** recap (status, diff, validation) + modal in one message; bare **`MC_ASKQUESTION_V1`** is sentinel-only. **Act** (worktrees, spawn, `git`, code edits) is always after the developer selects in the modal.

On **[Spawned implementation lane](#spawned-implementation-lane)**, **this lane** edits the hosting repo under the worktree through the implementation cut point — do not tell the developer to paste a session prompt into another chat. On **prompt-only** runs, emit the external prompt and **stop** without implementing here.

### Spawned lane — sentinel-first (binding)

On spawned **`coding-session`** lanes the **AskQuestion tool** is usually **unavailable**. Before the [Worktree-open gate](#worktree-open-gate), [Worktree-open gate (pr-plan spawn handoff)](#worktree-open-gate-pr-plan-spawn-handoff), and [Pre-PR cut-point gate](#pre-pr-cut-point-gate):

1. **Self-check:** the assistant message **starts** with **`MC_PHASED_RESPONSE_V1`** (or sentinel-only **`MC_ASKQUESTION_V1`**) — **no** recap prose before the sentinel.
2. Put required recap lines in **`display.markdown`** only (see pr-plan spawn handoff recap below).
3. Copy-paste template for pr-plan spawn **worktree-open** gate (replace `<recap>` when validation adds a line):

```
MC_PHASED_RESPONSE_V1
{"version":1,"display":{"markdown":"<recap>"},"askQuestion":{"modalTitle":"Coding session — start implementation","questions":[{"id":"worktree-open","prompt":"Authorize worktree and implementation on this lane?","allowMultiple":false,"options":[{"id":"continue-fill-5-8","label":"Continue — fill §§5–8 while implementing"},{"id":"revise-plan","label":"Revise PR plan first"},{"id":"change-repo","label":"Change repo or branch settings"},{"id":"defer","label":"Defer implementation"},{"id":"more-details","label":"More details for option _"}]}]}}
```

Default **`<recap>`** for pr-plan spawn: *Planning handoff complete (§§1–4). §§5–8 fill on this lane during implementation.*

## Relationship to `pr-plan`

| Concern | **`pr-plan`** | **`coding-session`** (this skill) |
|---------|--------------|-----------------------------------|
| §§ **1–4** | Drafted on the planning lane | Read for prompts and review; edit only when the developer revises the plan |
| §§ **5–8** | **`_TBD_`** or optional speculative sketch | Substantive fill during implementation |
| Handoff | **`pr-plan`** §5d **`AGENT_RUN_REQUEST_V1`** or detached entry | Spawned child lane or developer-started detached session |

See **`pr-plan/SKILL.md`** § *Handoff to coding-session*.

### pr-plan spawn handoff detection

Treat this run as a **pr-plan spawn handoff** when **either**:

- `inputs.planningHandoffMode === "sections-1-4-complete"`, or
- `inputs.upstreamSkill === "pr-plan"` **and** `inputs.readyForImplementation === true`.

When true, follow [Spawned from `pr-plan` (expected incomplete)](#spawned-from-pr-plan-expected-incomplete) and [Worktree-open gate (pr-plan spawn handoff)](#worktree-open-gate-pr-plan-spawn-handoff) — not the generic incomplete gate with “executive override” labels.

### Spawned from `pr-plan` (expected incomplete)

When [pr-plan spawn handoff detection](#pr-plan-spawn-handoff-detection) applies:

1. Do **not** say the PR plan is “not fully populated,” “incomplete planning,” “not ready,” or that **`pr-plan`** failed.
2. Say: *Planning handoff complete (§§1–4). §§5–8 fill on this lane during implementation.*
3. After **`plan-ws-completeness.mjs`** → `INCOMPLETE` (optional second stdout line `EXPECTED_SECTIONS_5_8_TBD`), treat as **expected**, not a defect — do **not** send the developer back to **`pr-plan`** unless they choose **Revise PR plan first** or **Stop — I'll complete the plan first** (detached / snapshot entry only — demoted on pr-plan spawn path).
4. At the [Worktree-open gate (pr-plan spawn handoff)](#worktree-open-gate-pr-plan-spawn-handoff), use the required recap and **Continue — fill §§5–8 while implementing** as the default authorizing choice — not “executive override” wording.

## Plan-anchored context (optional inputs)

The developer starts **`coding-session`** on a detached lane, via mission dispatch, or as a **spawned child** of **`pr-plan`** (§5d).

When `targetPlanPath` / `targetPlanSlug` are known (message, `@` path, snapshot, or spawn `inputs`), use them for sidecar writes and the session prompt. When spawned from **`pr-plan`**, treat spawn `inputs` and `initiatingPrompt` as authoritative — do not re-resolve from documentation placeholders.

If `upstreamSkill` is **`pr-plan`** and `repoPath` is present in `inputs`, use it as hosting repo root. If repo targets are missing, stop and ask the developer with **AskQuestion** to choose or provide the hosting repo(s). Do not infer from focused files alone.

## Implementation consent (two layers)

Only **two** developer-consent layers apply before worktrees. Do not stack extra approval **AskQuestion** rounds for the same decision.

| Layer | Where decided | Output field | This skill |
|-------|---------------|--------------|------------|
| **1 — Planning handoff** | **`pr-plan`** §5c **Start coding session** + §5d spawn `inputs` | `readyForImplementation` | Hint only; **do not** re-ask. Does **not** authorize worktrees or advance **`.sedea/centers/research-and-development/missions/plan-and-deliver/plan.mdc`** §8 `phase` past `not-started`. |
| **2 — Worktree open** | [Worktree-open gate](#worktree-open-gate) below (one **AskQuestion**) | `developerApprovedImplementation` | Set `true` only after an authorizing choice in that gate. |

**Not consent layers** (validation / setup only — no separate approval **AskQuestion**):

- **`plan-ws-completeness.mjs`** — script check; incomplete plans are handled inside the worktree-open gate (override option), not a second gate.
- **Repo selection** — **AskQuestion** only when `repoPath` / `repoPaths` are missing.

`inputs.developerApprovedImplementation` is never a substitute for layer 2; ignore upstream `true` until the developer picks an authorizing worktree-open option in **this** run.

## Pre-worktree validation (plan completeness)

**Worktree validation** (see **`pr-plan`** §5b and **development-process.md** § *Planning readiness vs worktree completeness*). Independent of layer 1 **`readyForImplementation`**. **`readyForImplementation: true` does not skip this script** — run it unless validation is skipped or the user message already contains **`override incomplete plan`**.

When this run anchors Phase 2 to a Plan Board **`.plan.md`** under **`.sedea/operations/`**, run validation **before** the [Worktree-open gate](#worktree-open-gate) — but **do not** use a separate completeness **AskQuestion**; record the script result and present override/stop choices in that single gate.

**Lane-change snapshots** (*back to plan*, *where are we?*, …) follow **30_planning-target-resolution.mdc** § *PR-plan completeness before coding-session*: when a snapshot lists both an incomplete per-PR plan and **coding-session**, **finishing the plan** must be ordered **first**.

**Skip** when there is **no** plan file anchor.

**Treat as override already chosen** when the user message contains **`override incomplete plan`** (ASCII, case-insensitive) — skip the script; proceed to the worktree-open gate.

Otherwise:

1. Resolve the plan’s **absolute** path. If you cannot, **stop** and ask for a path or `plan-state` linkage.
2. From the **hosting repo root**:
   ```bash
   node .sedea/centers/research-and-development/missions/plan-and-deliver/scripts/plan-ws-completeness.mjs --file "<absolute-plan-path>"
   ```
   - Exit **0** (`OK` / `SKIP_NOT_PER_PR`) → `planCompleteness: complete` for the worktree-open gate.
   - Exit **1** (`INCOMPLETE`) → `planCompleteness: incomplete` — **do not** create worktrees yet; route to the worktree-open gate (pr-plan spawn handoff vs generic incomplete).
   - When [pr-plan spawn handoff detection](#pr-plan-spawn-handoff-detection) applies, `INCOMPLETE` is **expected** (§§5–8 still `_TBD_` by design). If stdout includes `EXPECTED_SECTIONS_5_8_TBD`, treat as the normal §5d handoff. Use [Spawned from `pr-plan` (expected incomplete)](#spawned-from-pr-plan-expected-incomplete) wording — not “plan not fully populated.”

**Multi-repo:** run the script **once** on the shared plan before the worktree-open gate.

## Worktree-open gate

**Layer 2 — single AskQuestion** before any `git worktree add`, sidecar session write, Mission Control worktree attach, or coding-agent prompt emission.

**Recap and structured choice:** Summarize completeness / plan path in **`display.markdown`** when using **`MC_PHASED_RESPONSE_V1`**. On spawned lanes, **`MC_PHASED_RESPONSE_V1` must be line 1** — see [Spawned lane — sentinel-first (binding)](#spawned-lane--sentinel-first-binding). Open this gate via **AskQuestion**, **`MC_PHASED_RESPONSE_V1`**, or **sentinel-only** **`MC_ASKQUESTION_V1`** — prefer one message for recap + modal. See **`../README.md`** § *Recap, structured choice, act (plan-and-deliver)*, **`.sedea/centers/sedea/rules/2_ask-question-instructions.mdc`**, and **`.cursor/rules/mission-control-agent-runtime.mdc`**.

**Branch first:** when [pr-plan spawn handoff detection](#pr-plan-spawn-handoff-detection) applies, use [Worktree-open gate (pr-plan spawn handoff)](#worktree-open-gate-pr-plan-spawn-handoff) below — even when `planCompleteness: complete`. Otherwise use the generic tables in this section.

### Worktree-open gate (pr-plan spawn handoff)

When [pr-plan spawn handoff detection](#pr-plan-spawn-handoff-detection) applies:

**Required recap** (include in `display.markdown` or recap prose before the modal):

*Planning handoff complete (§§1–4). §§5–8 fill on this lane during implementation.*

When `planCompleteness: incomplete`, add one line: *Validation reported incomplete because §§5–8 are still `_TBD_` — expected after **pr-plan** spawn.*

**Required options** (`modalTitle`: *Coding session — start implementation*; list in this order):

| Option id | Label |
|-----------|--------|
| `continue-fill-5-8` | Continue — fill §§5–8 while implementing |
| `revise-plan` | Revise PR plan first |
| `change-repo` | Change repo or branch settings |
| `defer` | Defer implementation |
| `more-details` | More details for option _ |

- Do **not** label the primary path “executive override” or imply **`pr-plan`** failed.
- Do **not** list **Stop — I'll complete the plan first** before **Continue — fill §§5–8 while implementing** on this path (that stop option is for detached / snapshot entry in the generic incomplete gate).
- **`continue-fill-5-8`** → `outputs.developerApprovedImplementation: true` (authorizing).
- All other options → `developerApprovedImplementation: false`.

When `planCompleteness: complete` on a pr-plan spawn handoff, use the generic **complete** option set below (rare — plan fully drafted before coding).

### Generic worktree-open gate

**When `planCompleteness: complete`** (or validation skipped / override already in the user message), required options:

- **Start implementation now**
- **Revise PR plan first**
- **Change repo or branch settings**
- **Defer implementation**
- **More details for option _**

**When `planCompleteness: incomplete`** (and **not** [pr-plan spawn handoff detection](#pr-plan-spawn-handoff-detection)), required options (do **not** offer plain **Start implementation now** without override):

- **Start with incomplete plan (executive override)**
- **Stop — I'll complete the plan first**
- **Revise PR plan first**
- **Change repo or branch settings**
- **Defer implementation**
- **More details for option _**

**Authorizing choices** (set `outputs.developerApprovedImplementation: true`):

- **Start implementation now** — only when `planCompleteness: complete` (generic gate).
- **Continue — fill §§5–8 while implementing** (`continue-fill-5-8`) — pr-plan spawn handoff when `planCompleteness: incomplete`.
- **Start with incomplete plan (executive override)** — generic incomplete gate only (detached / snapshot entry).

All other choices → `developerApprovedImplementation: false`; end or stay `continuationStatus: active` without worktrees. A prior **`pr-plan`** menu option does not substitute for this gate.

## Execution mode after worktree attach

After [Pre-worktree validation](#pre-worktree-validation-plan-completeness), an authorizing [Worktree-open gate](#worktree-open-gate) choice, worktree creation, sidecar writes, and Mission Control attach, choose **one** mode:

| Mode | When | After attach |
|------|------|--------------|
| **Spawned implementation lane** | Mission Control **spawned child** (`AGENT_RUN_REQUEST_V1` for this skill) **and** `outputs.developerApprovedImplementation: true` **and** `inputs.promptOnly` is not `true` **and** the developer did not choose **Defer implementation** at the gate | Continue on **this lane** — [Spawned implementation lane](#spawned-implementation-lane) |
| **Prompt-only handoff** | Detached natural-language entry, **re-use a prior session prompt**, planning snapshot handoff without spawn, `inputs.promptOnly: true`, **Defer implementation**, or Squad Leader orchestration that only needs an external coding chat | [Prompt-only handoff](#prompt-only-handoff) — emit fenced prompt and **stop** |

**Orientation (spawned lane):** Tell the developer you are **implementing on this worktree on this lane**. Do **not** say “paste the prompt in another session” unless **prompt-only** mode applies.

## Spawned implementation lane

Normative path when **`pr-plan`** (or another spawner) opens a **coding-session** child lane and layer 2 is satisfied.

1. **Scope guard** — Edit only files under the attached worktree root(s). Resolve hosting repo root vs worktree per **20_efficient-pr-shipping.mdc**.
2. **Bootstrap gate** — Generic flow step 4 must have completed successfully (`outputs.bootstrapStatus: success`) before hosting-repo edits or substantive §§ **5–8** fill. On bootstrap failure, stop per [Worktree bootstrap (mandatory)](#worktree-bootstrap-mandatory); do not advance `shipPhase` past `worktree`.
3. **Warm-up on this lane** — Follow [Session prompt structure](#session-prompt-structure) Phase 1 steps (workspace readiness, branch check, load **Project rules** from the worktree, plan file + sidecar when anchored). You may skip emitting a fenced **external** session prompt unless the developer asks for a copy.
4. **Read the anchored PR plan** — Load `targetPlanPath` (from spawn `inputs` / `initiatingPrompt`). Use §§ **1–4** for scope context; **first implementation work** is substantive fill of §§ **5–8** (replace `_TBD_` as code paths become known), then code/tests/docs per those sections.
5. **Implement** — Make hosting-repo edits (code, tests, docs) in the worktree until an explicit **committed cut point** or a blocking stop. Maintain **`## Follow-ups`** on the PR plan per **development-process** § *Coding Session*.
6. **Continuation** — Keep `outputs.continuationStatus: "active"` and `outputs.shipPhase: "implementing"` while work remains. Emit **`AGENT_RESULT_RESPONSE_V1`** with `status: partial` when blocked; do **not** use `continuationStatus: terminal` to mean “prompt emitted — hand off elsewhere.”
7. **Cut point** — When implementation is ready for review, follow [Pre-PR cut-point gate](#pre-pr-cut-point-gate-before-review-handoff) on **this same lane**, then [Pre-PR review handoff](#pre-pr-review-handoff) after the developer authorizes spawn.

## Deploy test plan confirmations

When the developer **confirms** a numbered step in the anchored PR plan’s **`## N. Deploy test plan`** (§7 **`### Before deploy`** or **`### After deploy`**), treat chat as **not** the system of record — same contract as **`deploy-walk`**: state lives in the plan file.

1. **Resolve `targetPlanPath`** — from spawn `inputs`, `plan-state.mjs resolve --cwd "<worktreePath>"`, or an explicit `@path` in the message. If multiple plans could apply, use **AskQuestion** once for **which plan** or **which step number** — not whether to persist.
2. **Same-turn file edit** — before the reply ends, patch the matching §7 line: flip `[ ]` → `[x]` for that step number. Optionally append a short dated note on the line or under §7 (for example `— confirmed YYYY-MM-DD`).
3. **Reply** — state the **absolute `targetPlanPath`** you edited and which step numbers were checked.
4. **Do not** tell the developer “you can mark” or “likely done” without editing when you can write the operations plan. If you cannot write (permissions, wrong repo, missing path), say why and offer **`deploy-walk present 7`** / **`deploy-walk <N> done`** or a concrete absolute path.
5. **Terminal `outputs`** — when you emit **`AGENT_RESULT_RESPONSE_V1`** in the same turn after edits, include `outputs.deployPlanStepsChecked` (array of step numbers, e.g. `[1,2,3]`) and `outputs.targetPlanPath`.

**Trigger examples:** “1 confirmed”, “step 2 done”, “3. confirmed” (numbered §7 items). Do not infer confirmation from vague chat (“looks good”) without an explicit step reference — use **AskQuestion** for the step number if needed.

## Prompt-only handoff

Reserved when this run is **not** a spawned implementation lane (see table above).

1. Complete Generic flow steps 1–4 (including [Worktree bootstrap (mandatory)](#worktree-bootstrap-mandatory)) on this lane before emitting the external prompt.
2. Emit a **session prompt** per [Session prompt structure](#session-prompt-structure) inside a [copy/paste-safe](#copypaste-safe-prompt-output-required) fence. State that bootstrap already ran (or document failure and that the external agent must not implement until bootstrap succeeds).
3. Set `outputs.sessionPromptEmitted: true` and `outputs.implementationMode: "prompt-only"`.
4. **Stop** — do not `cd` into the worktree to implement on this lane (bootstrap may still run in step 1 above).
4. When the developer later continues on **this** or another lane after a committed cut point, this skill owns [Pre-PR cut-point gate](#pre-pr-cut-point-gate-before-review-handoff) and [Pre-PR review handoff](#pre-pr-review-handoff).

Detached developers may paste the prompt into a separate Mission Control session; that session then follows the same skill as an implementation lane once layer 2 is satisfied there.

## Copy/paste-safe prompt output (required)

When you emit the final session prompt for the user to paste into **a separate coding agent** session (**prompt-only** mode):

- Wrap the **entire session prompt** in a fenced markdown code block (default ` ```text … ``` `).
- If the body contains triple backticks, use a four-backtick outer fence or escape inner fences.
- Keep explanatory prose **outside** the fence.

## Generic flow (single repo)

Run only **after** [Pre-worktree validation](#pre-worktree-validation-plan-completeness) and an authorizing choice in the [Worktree-open gate](#worktree-open-gate).

1. Create a worktree on a fresh branch from `origin/main`:
   ```bash
   git fetch origin main
   git worktree add <sibling-path> -b <branch> origin/main
   ```
   - Prefix sibling paths with the repo directory basename (see **Worktree setup** in `.sedea/centers/research-and-development/rules/20_efficient-pr-shipping.mdc`).
   - Always branch from **`origin/main`**, not **`main`** (same failure mode as in **efficient-pr-shipping**).
   - Branch naming: **`.sedea/centers/research-and-development/rules/20_efficient-pr-shipping.mdc`** § *Branch naming* (primary **hosting repo** → Sedea **`7_stacked-pr-branch-naming`**; **hosting repo worktree** → `feat/`, `improve/`, `fix/`, …).
   - **Dirty-tree gate (hosting repo)** — Before `git worktree add`, run `git status --porcelain` in the repo that receives the worktree (`HOSTING_ROOT` when branching from the primary hosting repo).
     - **Submodule gitlink-only (non-blocking)** — When the active hosting repo pins `.sedea/` via git submodules (see [`.cursor/rules/dot-sedea.mdc`](.cursor/rules/dot-sedea.mdc) § *Submodule pins*, for example **`sedea-ai/app`**), and **every** porcelain line is a **modified submodule gitlink** under `.sedea/` (paths under `.sedea/centers/` or `.sedea/operations/`), verify pointer-only drift before proceeding:
       ```bash
       git diff --stat -- <submodule-path>
       ```
       **Proceed** when each affected submodule shows only a **2 insertions(+), 2 deletions(-)** gitlink change and no other paths appear in that stat. Routine submodule pin updates do **not** block worktree creation.
     - **Still blocking** — **Stop** when porcelain includes **any** path outside those `.sedea/` submodule gitlink lines (for example `extensions/`, `packages/`, other tracked application source), when `git diff --stat` shows content changes inside a submodule (not pointer-only), or when the hosting repo has non-empty porcelain that is not explained by allowed submodule gitlinks alone.
     - Do **not** stash, commit, discard, or clean the user's WIP to clear a blocking dirty tree.
   - If `baseBranch` input is supplied, it must be a remote branch ref such as `origin/main`; do not accept a local-only branch for worktree creation.

2. **Record the session on the plan** (see [Sidecar state](#sidecar-state)). From the **hosting repo root**:
   ```bash
   node .sedea/centers/research-and-development/missions/plan-and-deliver/scripts/plan-state.mjs set-worktrees \
     --slug <plan-slug> \
     --json '[{"repo":"<repo-basename>","path":"<absolute-worktree-path>"}]'
   node .sedea/centers/research-and-development/missions/plan-and-deliver/scripts/plan-state.mjs set-session \
     --slug <plan-slug> \
     --focus <absolute-worktree-path>
   ```
   Skip when the session has no plan anchor.

3. **Attach the worktree in Sedea** (same workbench): in Mission Control, invoke MCP **`sedea_add_worktree_folder`** with JSON `{ "path": "<absolute-worktree-root>" }` (optional `"name"` for the explorer label). See **20_efficient-pr-shipping.mdc** — *Squad Leader on the main branch vs. agent sessions on worktree* and *Attach the worktree in Sedea*.

   This MCP attach is mandatory before post-setup work. If the MCP call fails, stop with `partial`; report the worktree path and the attach error, and keep `continuationStatus: "active"` so the Squad Leader does not close the implementation lane.

4. **Worktree bootstrap (mandatory)** — see [Worktree bootstrap (mandatory)](#worktree-bootstrap-mandatory). Run before step 5 on every fresh worktree for this session (including **prompt-only** handoff, so the external coding agent starts on a dev-ready tree).

5. **Branch** per [Execution mode after worktree attach](#execution-mode-after-worktree-attach):
   - **Spawned implementation lane** → continue with [Spawned implementation lane](#spawned-implementation-lane) (steps 1–7 there).
   - **Prompt-only handoff** → [Prompt-only handoff](#prompt-only-handoff).

## Worktree bootstrap (mandatory)

After Generic flow step 3 (`sedea_add_worktree_folder`) succeeds, prepare **`WORKTREE_ROOT`** for implementation **before** spawned-lane edits, §§ **5–8** fill, or emitting a **prompt-only** session prompt.

**Resolve paths**

- **`HOSTING_ROOT`** — hosting repo that contains `.sedea/centers/sedea/` (see **20_efficient-pr-shipping.mdc** § *Hosting repo cwd for scripts*). Use spawn `inputs.repoPath` when it points at that root.
- **`WORKTREE_ROOT`** — absolute path from step 1 (`git worktree add`) / sidecar `worktrees[].path`.

**Command** (from **`HOSTING_ROOT`**):

```bash
./scripts/bootstrap-worktree-dev.sh "$WORKTREE_ROOT"
```

The script is idempotent — safe to re-run after partial failure. See `scripts/bootstrap-worktree-dev.sh --help` for **`--skip-*`** flags.

**`--skip-*` flags** — Use only when the developer attests the worktree is already partially set up (for example submodules initialized but vscode compile pending). Record which flags were used in chat and in `outputs.bootstrapSkipFlags` when present.

**Success** — Set `outputs.bootstrapStatus: success`, then continue to Generic flow step 5 and spawned-lane work. Set `outputs.shipPhase: worktree` on the first terminal line that reports setup complete (before `implementing`).

**Failure** — When the script exits non-zero or required smoke checks fail:

1. Capture stderr/stdout tail in `outputs.bootstrapFailureReason` (short string).
2. Emit **`AGENT_RESULT_RESPONSE_V1`** with `status: partial`, `outputs.bootstrapStatus: failed`, `outputs.shipPhase: worktree`, `outputs.developerApprovedImplementation: true` (layer 2 already granted), `outputs.continuationStatus: active`.
3. **Do not** advance `shipPhase` to `implementing`, spawn **`pre-pr-review`**, or make hosting-repo implementation edits until bootstrap succeeds or the developer chooses **Defer** / **Change repo** at a new gate.
4. Offer re-run: same command (idempotent) or documented **`--skip-*`** only after developer attestation.

**Missing script** — When `./scripts/bootstrap-worktree-dev.sh` is absent on the worktree branch (for example PR **1** not merged), stop with `partial`, `bootstrapStatus: failed`, `bootstrapFailureReason` naming the missing path, `shipPhase: worktree`.

## Multi-repo flow (shared branch name)

When the plan’s **Worktree setup** lists two or more repos, or the user asks for a cross-repo session:

1. For **each** repo, `git worktree add` with the **same branch name** (unless the plan says otherwise).
   - Validate every repo before creating any worktree using the same **Dirty-tree gate** as § *Generic flow* step 1. If one repo is blocking-dirty or missing the requested base branch, stop before creating a partial multi-repo session.

2. Optionally create a **`.code-workspace`** file listing each worktree folder with absolute `path` values — use only if your team uses that layout; otherwise attach **each** worktree root with **`sedea_add_worktree_folder`** in turn.

3. **`plan-state.mjs set-worktrees`** with one JSON entry per repo; **`set-session --focus`** to the workspace file **or** primary worktree path per your team convention (must stay consistent with **`resolve --cwd`** expectations in **planning-target-resolution**).

4. **Attach each worktree** with **`sedea_add_worktree_folder`**, then run [Worktree bootstrap (mandatory)](#worktree-bootstrap-mandatory) **once per `WORKTREE_ROOT`** before implementation or prompt emission for that repo.

5. **Branch** per [Execution mode after worktree attach](#execution-mode-after-worktree-attach) (spawned lane implements each repo’s scope in turn, or prompt-only emits **one session prompt per repo** with per-repo scope guards).

6. **Prompt-only:** **Stop** after prompts. **Spawned lane:** continue implementation per repo scope before cut point.

Cleanup when PRs merge: **`sedea_remove_worktree_folder`**, **`git worktree remove`**, **`plan-state.mjs prune-sessions`**, and **`plan-reconcile`** per **development-process** and **efficient-pr-shipping** — not repeated here.

## Pre-PR cut-point gate (before review handoff)

When implementation reaches an explicit **committed cut point** (or the developer signals *ready for review* / *run pre-pr-review*), **stop** — do **not** spawn **`pre-pr-review`** until this gate completes. This gate implements **20_efficient-pr-shipping.mdc** § *Review before commit* workflow layer (pause before advancing to the reviewer lane); git commit/push still follow § *Ship git consent* separately.

### 1. Summarize and direct diff review

1. Present a short summary: commits on the branch (`git log --oneline <baseRef>..HEAD`), touched files, and scope vs the anchored plan when present.
2. Tell the developer to review the change in the **IDE diff** (SCM compare view) and/or `git diff <baseRef>...HEAD` in the worktree. Do **not** treat “implementation done” chat as diff review.
3. If the tree is dirty, say uncommitted work is invisible to **`pre-pr-review`** and offer **More changes** or commit per rule **20** / rule **6** — do not spawn review while dirty.

### 2. Before deploy checklist (plan-anchored)

When `targetPlanPath` resolves to a PR plan:

1. **Read** §7 **`### Before deploy`** (numbered `N. [ ]` / `N. [x]` lines).
2. If the subsection is empty, only an italic *None — …* line, or every item is `[x]`, note that in one line and skip to § *Pre-PR review authorization* below.
3. If any **`[ ]`** items remain, present them as a **numbered context list** (step number + text — not an action menu in prose).
4. Use **AskQuestion** (required when unchecked Before-deploy items exist):

| Option id (illustrative) | Label (brief) |
|--------------------------|---------------|
| `walk-before-deploy` | Walk Before deploy steps now |
| `before-deploy-done` | Before deploy already satisfied |
| `skip-before-deploy` | Skip Before deploy (executive override) |
| `more-changes` | More implementation changes first |
| `more-details` | More details for option _ |

5. **`walk-before-deploy`** — For each unchecked step in order: present the step text and what to run or verify; wait for the developer to report outcome; apply [Deploy test plan confirmations](#deploy-test-plan-confirmations) (flip `[ ]` → `[x]` on confirm). Do **not** invoke full **`deploy-walk`** unless the developer asks — this gate is a lightweight walk on the **coding-session** lane.
6. **`before-deploy-done`** — Proceed only when every Before-deploy line is `[x]` or the developer attests all steps passed (if still `[ ]`, offer **`walk-before-deploy`** or record override in chat before continuing).
7. **`skip-before-deploy`** — Append a dated note under §7 or in **`## Follow-ups`** that Before deploy was skipped by executive override; do not spawn **`pre-pr-review`** in the same turn — continue to § *Pre-PR review authorization*.
8. **`more-changes`** — Return to implementation; keep `continuationStatus: "active"`.

Free-form runs without a plan anchor skip §2.

### Pre-PR review authorization

After diff review is offered and §2 is resolved (or skipped), use **AskQuestion** per rule **20** § *Ship git consent* — workflow layer only unless the **same turn** also needs git options:

| Option id (illustrative) | Label (brief) |
|--------------------------|---------------|
| `proceed-pre-pr-review` | Proceed — spawn pre-pr-review |
| `more-changes` | More changes before review |
| `defer-review` | Defer pre-PR review |
| `more-details` | More details for option _ |

Only **`proceed-pre-pr-review`** (or the **same user message** explicitly authorizing *run pre-pr-review* / *approved cut point* per rule **20**) authorizes advancing to [Pre-PR review handoff](#pre-pr-review-handoff). A workflow pick in a **prior** turn does **not** authorize spawn.

Do **not** spawn **`pre-pr-review`** in the same assistant turn as the authorization **AskQuestion** — wait for the developer’s modal selection or an explicit follow-up message.

## Pre-PR review handoff

This branch spawns **`pre-pr-review`** only **after** [Pre-PR cut-point gate](#pre-pr-cut-point-gate-before-review-handoff) completes and the developer authorizes review.

### Review handoff preconditions

Before spawning **`pre-pr-review`**:

1. [Pre-PR cut-point gate](#pre-pr-cut-point-gate-before-review-handoff) completed — developer reviewed the IDE diff (or equivalent explicit authorization this session) and chose **`proceed-pre-pr-review`** (or same-message authorization per rule **20**); plan-anchored Before-deploy handling resolved per §2 above.
2. `git status --short` in the worktree is empty. Uncommitted edits are invisible to the committed review diff, so do not spawn the reviewer while dirty.
3. `git log --oneline <baseRef>..HEAD` shows at least one commit.
4. `git diff <baseRef>...HEAD` is non-empty.
5. For plan-anchored runs, `plan-state.mjs resolve --cwd "<worktreePath>"` or supplied inputs identify the PR plan.

If any precondition fails, stop with `partial`, keep `continuationStatus: "active"`, and report the missing cut-point task. Do not silently commit, push, or spawn review.

### Review handoff inputs

Compile the **`pre-pr-review`** child inputs:

- `anchorType`: `plan` when a PR plan path is known, otherwise `free-form`.
- `targetPlanPath` / `targetPlanSlug`: required for `plan`.
- `worktreePath`
- `branchName`
- `baseRef`
- `projectRules`: absolute worktree `.cursor/rules/*.mdc` paths curated the same way as the implementation prompt.
- `diffSummary`: commits/files/line counts from the committed diff.
- `ledgerParent`
- `upstreamSkill: "coding-session"`

Spawn `.sedea/centers/research-and-development/missions/plan-and-deliver/skills/pre-pr-review/SKILL.md`, announce that **coding-session** is waiting for the pre-PR review result, and stop. Do not open a PR before the reviewer returns `recommendation: "go"`.

### Review result aggregation

When Mission Control delivers the **`pre-pr-review`** result:

1. Copy `blockers`, `flags`, `proposedFollowUps`, `followUpsAppended`, `codingAgentHandback`, `requiresDeveloperApproval`, `remainingTasks`, `activeLanes`, and `openLedgerEntries` into the coding-session result.
2. If recommendation is `go`, **coding-session** presents the approval gate in **Create-PR handoff after go** because it owns the implementation context, worktree path, branch, diff summary, PR plan path, and reviewer result. Do not make **`pre-pr-review`** spawn `create-pr`.
3. If recommendation is `no-go`, keep the implementation lane active and route back to coding-session fix work **only after developer approval**; do not proceed to PR creation.
4. If review failed, was aborted, or was abandoned, keep the ledger entry blocked until the developer retries, defers, or abandons the review.

### Review feedback approval gate

When **`pre-pr-review`** returns `recommendation: "no-go"` or any `blockers`:

1. Present the review summary to the developer: blockers, `Must`, `Should`, `Defer`, and any proposed follow-ups for the PR plan.
2. Use **AskQuestion** before making any code or plan edits. Required options:
   - **Apply Must fixes** — coding-session may edit only blocker / `Must` items.
   - **Apply Must + Should fixes** — coding-session may edit blocker / `Must` and `Should` items.
   - **Revise review scope** — clarify or challenge reviewer findings before code edits.
   - **Defer / abandon review fixes** — keep ledger blocked or mark the PR plan deferred/abandoned per developer choice.
   - **More details for option _**
3. Do not interpret the reviewer handback itself as approval. No source edits, plan edits, commits, pushes, or new review spawn occur until the developer chooses an approval option.
4. After approved fixes are implemented, require a new explicit committed cut point and spawn **`pre-pr-review`** again. The loop repeats until **`pre-pr-review`** returns `go` or the developer explicitly defers/abandons.
5. Track each loop pass in outputs as `reviewLoopCount` and keep `continuationStatus: "active"` while approval, fixes, commit cut point, or re-review remains open.

### User requests to open a PR (before `create-pr` spawn)

When the developer says *open a PR*, *create a pull request*, or similar **before** **`pre-pr-review`** returns **`go`** and the **Create-PR handoff after go** gate:

1. **Do not** call `gh pr create` or surface GitHub `pull/new/` URLs (rule **20** § *PR creation* and § *User phrases → required handoff*).
2. State the required order: implementation → **committed cut point** → [Pre-PR cut-point gate](#pre-pr-cut-point-gate-before-review-handoff) (diff review + optional §7 Before deploy) → spawn **`pre-pr-review`** → on **`go`**, **AskQuestion** in **Create-PR handoff after go** → spawn **`create-pr`** child only.
3. If they only pushed and expect a PR, confirm whether **`pre-pr-review`** has run; first-push cadence does **not** replace the **`create-pr`** child lane.

### Create-PR handoff after go

When **`pre-pr-review`** returns `recommendation: "go"`:

This path is the normative **`create-pr`** handoff on this lane — it **supersedes** rule **20** § *Commit and push cadence* step 5 prompt-only wording when both apply.

1. Verify the worktree branch is pushed or pushable per **efficient-pr-shipping**. Do not open the PR directly from coding-session — only the **`create-pr`** child may run `gh pr create`.
2. Present the reviewer `go` summary, non-blocking flags, and any proposed follow-ups to the developer, then use **AskQuestion** before plan follow-up mutation or PR creation. Required options:
   - **Approve follow-ups and create PR now**
   - **Create PR without appending proposed follow-ups**
   - **Revise code or plan first**
   - **Defer PR creation**
   - **Abandon this implementation**
   - **More details for option _**
3. Only **Approve follow-ups and create PR now** authorizes appending proposed follow-ups before PR creation. **Create PR without appending proposed follow-ups** authorizes only PR creation. Do not treat `pre-pr-review` `go` as developer approval to mutate the plan or open/prepare a PR.
4. Emit exactly one child-spawn request for `.sedea/centers/research-and-development/missions/plan-and-deliver/skills/create-pr/SKILL.md`.
5. Inputs must include `targetPlanPath`, `targetPlanSlug`, `worktreePath`, `branchName`, `baseRef`, `repoUrl`, `diffSummary`, `prePrReviewRecommendation: "go"`, `prePrReviewFlags`, `followUpsAppended`, `ledgerParent`, and `upstreamSkill: "coding-session"`.
6. Announce that **coding-session** is waiting for the PR-creating agent result and stop. Do not continue to `pr-review` or deploy until `create-pr` reports a PR URL/number or a blocking failure.

When Mission Control delivers the **`create-pr`** result, copy `prUrl`, `prNumber`, `branchName`, `prState`, `reviewState`, `mergeSha`, `mergedAt`, `deployStatus`, `deployTodoStatus`, `remainingTasks`, `activeLanes`, and `openLedgerEntries` into the coding-session result. If the PR was created, keep the mission lane active for inline `pr-review`, merge tracking, and deploy verification. If `create-pr` reports deploy-walk active or blocked, propagate that status upstream without closing the coding-session ledger entry.

### Inline PR review after PR creation

After `create-pr` reports a PR URL/number, the active **coding-session agent** executes `.sedea/centers/research-and-development/missions/plan-and-deliver/skills/pr-review/SKILL.md` inline. Do not spawn a `pr-review` agent.

Inline `pr-review` inputs come from coding-session state:

- `prUrl` / `prNumber`
- `repoUrl`
- `worktreePath`
- `branchName`
- `targetPlanPath` / `targetPlanSlug`
- `ledgerParent`

The inline procedure:

1. Collects PR review comments.
2. Classifies each as `Must fix`, `Should fix`, `Skipped`, or `Skipped → follow-up`.
3. **Commit/push gates (stacked):** **AskQuestion** and **20_efficient-pr-shipping** § *Review before commit* for approval before the next stage; **`git commit`** / **`git push`** only per **`.sedea/centers/sedea/rules/6_git-commit-push-gate.mdc`** when the user **same message** explicitly asks (*commit*, *push*, etc.). Workflow approval alone is not git consent.
4. Applies only the approved fix scope.
5. Runs GitHub reconciliation only after approved fixes are committed/pushed, or immediately for skipped-only triage.
6. Keeps coding-session `continuationStatus: "active"` until all PR comments are resolved, followed up, skipped with rationale, or explicitly deferred.

## Implementation handoff result

When this skill runs as a spawned child, end with a child result containing at least:

- `outputs.targetPlanPath`
- `outputs.targetPlanSlug`
- `outputs.readyForImplementation` — echo layer 1 when known; set only by **`pr-plan`**, not by this gate
- `outputs.developerApprovedImplementation` — layer 2; `true` only after an authorizing worktree-open choice; never inherit from **`pr-plan`**
- `outputs.repoPaths`
- `outputs.worktrees` (array of `{repo, path, branch, attached}`)
- `outputs.bootstrapStatus` — `success` \| `failed` \| omitted when bootstrap not run
- `outputs.bootstrapFailureReason` — when `bootstrapStatus: failed`
- `outputs.bootstrapSkipFlags` — optional array of `--skip-*` flags used with developer attestation
- `outputs.branchName`
- `outputs.sessionPromptEmitted`
- `outputs.implementationMode` — `spawned-lane` \| `prompt-only`
- `outputs.prePrReviewStatus`
- `outputs.prePrReviewRecommendation`
- `outputs.reviewBlockers`
- `outputs.proposedFollowUps`
- `outputs.reviewLoopCount`
- `outputs.developerApprovalStatus`
- `outputs.prCreationApprovalStatus`
- `outputs.createPrStatus`
- `outputs.prUrl`
- `outputs.prNumber`
- `outputs.prState`
- `outputs.reviewState`
- `outputs.mergeSha`
- `outputs.mergedAt`
- `outputs.deployStatus`
- `outputs.deployTodoStatus`
- `outputs.deployPlanStepsChecked` — step numbers flipped to `[x]` in §7 during this turn (when applicable)
- `outputs.prReviewStatus`
- `outputs.prReviewComments`
- `outputs.prReviewDispositions`
- `outputs.prReviewBlockers`
- `outputs.githubReconciliationStatus`
- `outputs.activeLanes`
- `outputs.openLedgerEntries`
- `outputs.remainingTasks`
- `outputs.continuationOwner: "coding-session-agent"`
- `outputs.continuationStatus`

Set `outputs.continuationStatus` as follows:

- `active` when **spawned implementation lane** is coding, reviewing, or waiting on developer approval on **this** lane.
- `active` when **prompt-only** setup finished and an external coding agent (or a later message on this lane) still owns implementation before cut point.
- `active` when pre-pr-review returns blockers and developer approval for fixes is pending.
- `active` when approved review fixes, a new committed cut point, or re-review remains.
- `active` when PR review comments, developer approval, fixes, commit/push, or GitHub reconciliation remain.
- `active` when PR merge, deploy-walk, deploy checklist, or deploy capstone todo remains.
- `active` when worktrees exist but Mission Control attach or prompt emission still needs repair.
- `terminal` only for **prompt-only** runs when worktree/prompt setup is complete and no implementation is tracked on this dispatch, or when explicitly abandoned with no active work.
- `partial` status with `continuationStatus: "active"` when readiness, repo selection, dirty tree, base branch, sidecar write, MCP attach, or **worktree bootstrap** blocks setup (`bootstrapStatus: failed`; cap `shipPhase` at `worktree`).

Do not propose dispatch resolution from this skill; the Squad Leader closes the ledger after coding, review, PR, and deploy verification report terminal status.

## Squad Leader bubble-up (detached lanes)

This skill usually runs **off** the **plan and deliver** leader lane. The Squad Leader §8 ledger often does **not** receive your `AGENT_RESULT_RESPONSE_V1`. After each milestone below, nudge the developer to paste the **Ship recap — plan and deliver** block on the **leader dispatch** (template in **`../../plan.mdc`** §8 *Leader-lane ship recap*).

| Milestone in this skill | Suggested `shipPhase` | Copy from `outputs` |
|-------------------------|----------------------|---------------------|
| Worktrees attached; setup complete (`implementationMode: prompt-only` or pre-code) | `worktree` | `targetPlanPath`, `worktrees`, `developerApprovedImplementation: true`, `remainingTasks` |
| Spawned lane implementing or review loop in progress | `implementing` | `targetPlanPath`, `implementationMode: spawned-lane`, `prePrReviewRecommendation`, `prReviewStatus` |
| Pre-PR **go** | `pre-pr-review` | `targetPlanPath`, `prePrReviewRecommendation: go` |
| PR opened | `pr-open` | `targetPlanPath`, `prUrl`, `prNumber` |
| PR comment triage complete | `pr-review` | `targetPlanPath`, `prReviewStatus`, `githubReconciliationStatus` |
| Deploy walk finished | `deploy-walk` | `targetPlanPath`, `deployStatus`, `deployTodoStatus` |
| Reconcile / archive done | `done` or `reconcile` | `targetPlanPath`, `remainingTasks` (empty) |

Set `rowStatus: blocked` when `prePrReviewRecommendation` is not **go**, review blockers remain, or `remainingTasks` is non-empty with no forward path. Parent **coding-session** agents should forward the same fields when they **do** bubble results to a squad parent.

## Mission Control section 8 sync (required terminal `outputs`)

On **every** terminal `AGENT_RESULT_RESPONSE_V1` (including follow-up re-emits), `outputs` **must** include:

| Field | Rule |
|-------|------|
| `targetPlanPath` | Absolute PR plan `.plan.md` path — **required**; host skips ledger sync without it |
| `shipPhase` | Pick the **Squad Leader bubble-up** row that matches the milestone this terminal reports (`worktree`, `implementing`, `pre-pr-review`, `pr-open`, `pr-review`, `deploy-walk`, `done`, `reconcile`, etc.) |
| `rowStatus` | `open` while work continues; `closed` only when that PR plan is fully done on this branch; `blocked` when pre-PR no-go, review blockers, or deploy/reconcile gates block forward progress |
| `prUrl` / `prNumber` | When `shipPhase` is `pr-open` or later |
| `remainingTasks` | When `rowStatus` is not `closed` |
| `blockedReason` | When `rowStatus` is `blocked` |

Also populate **## Implementation handoff result** domain fields (`developerApprovedImplementation`, `deployStatus`, `prReviewStatus`, etc.). Mission Control writes `ship-ledger.v1.json` and may inject **Ship recap — plan and deliver** on the Squad Leader lane. Manual recap paste remains valid (especially when inline **`pr-review`** never spawns a detached child).

## Sidecar state

Writes go through **`plan-state.mjs`** into **`<slug>.state.yaml`** next to **`<slug>.plan.md`** under **`.sedea/operations/.../plans/`** — never plan frontmatter for `worktrees` / `session`.

```yaml
worktrees:
  - repo: <repo-basename>
    path: <absolute-path>
session:
  focusPath: <absolute-path>
```

- Always a **list** for `worktrees`, even when length is 1.
- **`set-worktrees` replaces the list wholesale** — one active worktree set per plan for this protocol’s session model.
- Absolute paths only (no `~`).
- Skip sidecar updates when there is no plan anchor.

## Session prompt structure

**Block order:** title line → blank line → **Project rules** → **Warm-up** → `---` on its own line → **Task** (Phase 2).

### Project rules bundle (emitter must curate)

Infer touched subtrees from the anchored plan and PR scope. List **absolute** paths to **`<worktree>/.cursor/rules/*.mdc`** the worker must `Read` during warm-up.

- Paths must point at the **worktree**, not the main clone.
- **De-duplicate** and order: baseline → architecture → area-specific.
- **No vendor-specific matrix** — curate from plan headings, § 5 repo rules impact, and file paths. **Repo-specific** path patterns (extra hosting repo roots, package sub-trees, etc.) belong in **that hosting repo’s** `.cursor/rules/*.mdc` — keep this center skill **repo-agnostic**.

### Phase 1 — Warm-up (before the task)

R&D **center** rules (`10_`–`40_`, all `alwaysApply: true`) load on every dispatch via Mission Control. This warm-up block is for **hosting-repo** `.cursor/rules/*.mdc` paths under **Project rules** — list explicit `Read` steps for those only.

**Four vs five steps:** If Phase 2 links a **`.plan.md`** (absolute path), use **five** steps and include **Plan file + sidecar** (step 5). Otherwise use **four** steps (omit step 5).

Phrase a hard gate, e.g. `Warm-up first — do not read the task body below --- until every step above is done and acknowledged`.

1. **Workspace readiness** — **Read** the worktree **`README`** and **`CONTRIBUTING`** when present. For **readiness or pre-task checks**, follow **only** what those files say, what the **plan** explicitly links for setup, and what **`.cursor/rules/*.mdc`** files prescribe **when they describe pre-work or environment gates** (do not invent extra checks). If nothing prescribes a check, one line **Readiness: no checks in README / CONTRIBUTING / cited rules** — continue. If a prescribed check fails, **stop** and ask the user.
2. **Verify branch:** `git branch --show-current` matches the expected branch.
3. **Process handback** — the **developer** continues via **AskQuestion** or **`MC_ASKQUESTION_V1`** (per **30_planning-target-resolution** when a pick is required) or a separate mission dispatch per **development-process**. Name next moves with protocol branches (**`plan-reconcile`**, **`pre-pr-review`**, **`pr-review`**, rule **20** § *Commit and push cadence*).
4. **Load project rules:** `Read` every path under **Project rules**; acknowledge before continuing.
5. **Plan file + sidecar** *(plan-anchored only)*: Plans live under **`.sedea/operations/.../plans/`**; runtime fields (`worktrees`, `prs`, `session`, `parent`, todos via scripts) follow the **`.sedea/operations/`** plan union and **`plan-state.mjs`** contracts — flip todo status only through **`plan-state.mjs`** subcommands (`set-todo-status`, `todo-start`, `todo-done`); do not hand-edit `.state.yaml` except to repair a bad state. After substantive progress on a scoped todo, update status so the Plan Board stays accurate. PR linkage after push follows **20_efficient-pr-shipping** and **`plan-state.mjs upsert-pr`**.

### Phase 2 — Task

Include:

- Which PR to implement (scope, behaviour, files).
- **Plan link:** absolute path to the `.plan.md` (e.g. `@/…/.sedea/operations/…/plans/<slug>.plan.md`). When present, the emitter must have used the **five-step** warm-up.
- **Follow-ups** — per **development-process** *Coding session* / *Feedback collection*: maintain **`## Follow-ups`** on the PR plan; append bullets for out-of-scope ideas with optional `(target: …)` hints.
- **Review cadence** — after implementation and an explicit committed cut point, **a coding agent** runs the **Pre-PR cut-point gate** (summarize changes, developer reviews IDE diff, walk plan §7 **Before deploy** when items remain unchecked), then spawns **`pre-pr-review`** in a fresh reviewer lane; coordinate **`pr-review`** and rule **20** § *Review before commit* / *Commit and push cadence* (name **protocol branches** in prompts and menus).
- **Multi-repo only:** scope guard line per repo.

## Verbatim override

If the user supplies custom prompt text, keep their prose **verbatim** inside Phase 2 after the `---`. Still **prepend** the curated **Project rules** block and the correct **warm-up** step count (four vs five). Merge duplicates without weakening gates.

## Example (illustrative)

When emitting a **real** prompt, substitute **concrete absolute paths** for every `<…>` placeholder (worktree root, hosting repo root, plan file, etc.). Do **not** paste unresolved placeholders into **a coding agent** session.

```text
hosting-repo — feat/01-example

### Project rules (read during warm-up, before the task body)

Use the Read tool on each path below, then acknowledge before starting the task.

- `<absolute-worktree-root>/.cursor/rules/<example>.mdc`

**Warm-up first — do not read the task body below --- until all five steps are done and acknowledged.**

1. Workspace readiness: README, CONTRIBUTING, plan-linked setup, and repo rules only where they prescribe pre-work; stop if a documented check fails.
2. Branch check: expect feat/01-example
3. Process handback: next moves via AskQuestion / mission dispatch; protocol names only.
4. Load every **Project rules** path.
5. Plan + sidecar: `.sedea/operations/…/plans/<slug>.plan.md` and `<slug>.state.yaml`; todo updates via plan-state only.

---

Implement the scoped change described in `@<absolute-hosting-repo-root>/.sedea/operations/joint/plans/<slug>.plan.md` §§ 5–7 for this PR.

**Follow-ups discipline.** Append to `## Follow-ups` on that plan when you discover scope-adjacent items.

Stop after implementation; after an explicit committed cut point, run the **Pre-PR cut-point gate** (diff review + §7 Before deploy when applicable), then spawn **`pre-pr-review`** in a fresh reviewer lane per **development-process**.
```

## Completion (spawned)

Required `outputs` per **## Implementation handoff result**, **Mission Control section 8 sync**, and the bubble-up table (include **`pr-review`** inline fields when that flow ran). Re-emit an **updated** terminal result after user-requested follow-up on this lane (same `correlationId`). Do not emit **`MC_DISPATCH_RESOLVED_V1`** from this skill.

### Host protocol line (required)

Emit **exactly one** line on its own: `AGENT_RESULT_RESPONSE_V1` immediately followed by a single JSON object on the **same** line. Required keys: `version` (1), `correlationId` (from the spawn request), `status`, `summary`, `outputs`, `errors` (use `[]` when none). Populate `outputs` from **Implementation handoff result** **and** include `targetPlanPath`, `shipPhase`, and `rowStatus` on every terminal line. The emitted line must be **valid JSON** (no `{...}` placeholders in the actual output). See **`.sedea/centers/sedea/skills/README.md`** § *Spawned terminal line*.

Stop after the terminal line. Do not emit another `AGENT_RUN_REQUEST_V1` or run the next protocol step in the same turn (see **`../README.md`** § *Terminal stop (normative)*).

## Completion (inline)

Report the fields below in prose to the invoker on the **same lane**. Do **not** emit `AGENT_RUN_REQUEST_V1`, `AGENT_RESULT_RESPONSE_V1`, or `MC_DISPATCH_RESOLVED_V1`. Do **not** add a **Host protocol line** under this section (see **`.sedea/centers/sedea/rules/4_mission.mdc`** § *Inline completion* and **`.sedea/centers/sedea/skills/README.md`** § *Completion (inline)*).

**plan and deliver** normally spawns this skill on a **child lane** — default **spawned implementation lane**, not prompt-only. If run inline, use the same `outputs` semantics as **## Implementation handoff result** and **`## Completion (spawned)`** in prose only (merge **`pr-review`** inline fields when that sub-flow ran).
