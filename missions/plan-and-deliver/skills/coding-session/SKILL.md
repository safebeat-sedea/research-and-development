---
name: coding-session
description: >-
 **Coding session** protocol branch: **create** the worktree with shell **`git worktree add`**
 only (never **`sedea_add_worktree_folder`** for creation), record worktrees and session focus
 in the plan sidecar via plan-state.mjs, **attach** the worktree with MCP
 **`sedea_add_worktree_folder` only** (never editor Add Folder to Workspace), then run
 **`worktree-bootstrap`** **inline** on this lane
 (mandatory wait before any implementation) via [`worktree-bootstrap/SKILL.md`](../worktree-bootstrap/SKILL.md).
 On a **spawned child lane** with layer-2 approval (or **pr-plan** spawn auto-authorize),
 **implement the anchored PR plan on this lane** in that worktree; on **prompt-only**
 entry, emit a copy/paste-safe two-phase session prompt for a separate coding chat.
 After implementation, run the **ship chain** (one cut-point modal: approve + commit +
 Before deploy **deploy-walk** inline → **auto-spawn pre-pr-review** → **auto inline create-pr** on clean **go** → **auto post-merge cleanup** when merged → After deploy **deploy-walk** inline). Plan-anchored runs validate
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
  baseRef:
    type: string
    description: Remote integration ref to create the worktree from; default origin/main unless repo rules say otherwise.
    required: false
    default: origin/main
  worktreeName:
    type: string
    description: Optional explicit worktree name; otherwise derive from plan slug and Sedea rule 7 / rule 20 naming.
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
      use auto-authorize or pr-plan spawn handoff gate, not executive-override framing.
    required: false
  planningHandoffApproved:
    type: boolean
    description: >-
      Layer 1 approval from pr-plan §5c Start coding session. When true with
      planningHandoffMode, waives worktree-open AskQuestion when §§1–4 are drafted.
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
---

# Coding session

Hand off a unit of work into a **dedicated git worktree**, with the worktree visible in the **same Sedea workbench** (multi-root workspace), not a second editor process. Worktree **creation** is **`git worktree add` only**; workbench **attach** is **`sedea_add_worktree_folder` only** — see [Hard rules — git worktree vs workbench attach (binding)](#hard-rules--git-worktree-vs-workbench-attach-binding). **Execution mode** after setup depends on entry path — see [Execution mode after worktree attach](#execution-mode-after-worktree-attach).

**Owns:** per-PR plan §§ **5–8** during implementation (repo rules impact, tests, deploy plan, caveats); `git worktree add`, `plan-state.mjs set-worktrees` / `set-session`, Mission Control worktree attach, **mandatory inline worktree bootstrap** on this lane ([Worktree bootstrap (inline mandatory)](#worktree-bootstrap-inline-mandatory) — wait for `outputs.bootstrapStatus: success` before implementation), pre-worktree validation + worktree-open gate; **spawned-lane implementation** or curated **prompt-only** session prompt emission; [Ship chain after implementation](#ship-chain-after-implementation-coding-session-lane) ([Ship cut-point gate](#ship-cut-point-gate-approve-commit-before-deploy) — one modal approve + commit + Before deploy **`deploy-walk`** inline → **auto-spawn **`pre-pr-review`** → **auto inline **`create-pr`** on clean **go** → **auto** [Post-merge workspace cleanup](#post-merge-workspace-cleanup) when merged → After deploy **`deploy-walk`** inline).

**Out of scope:** drafting per-PR §§ **1–4** ( **`pr-plan`** ); implementing hosting repo code when this run is **prompt-only** (see [Prompt-only handoff](#prompt-only-handoff)); opening PRs from the planning lane; **`plan-reconcile`** archive cadence except where this skill references it for cleanup narrative.

## Worktree create → attach → bootstrap (ownership)

Four **sequential** steps on the **`coding-session`** lane after the [Worktree-open gate](#worktree-open-gate). **`worktree-bootstrap`** runs **only** step 4 — it does **not** replace steps 1–3.

| Step | Owner lane | Action | Tool / skill |
|------|------------|--------|--------------|
| 1 | **`coding-session`** | Create filesystem worktree | `git worktree add` ([Generic flow](#generic-flow-single-repo) step 1) |
| 2 | **`coding-session`** | Record sidecar `worktrees` / `session` | `plan-state.mjs` (step 2) |
| 3 | **`coding-session`** | Mount worktree in Sedea workbench | MCP **`sedea_add_worktree_folder`** (step 3) |
| 4 | **`coding-session`** (inline **`worktree-bootstrap`**) | Dev bootstrap script | `./scripts/bootstrap-worktree-dev.sh` — see [Worktree bootstrap (inline mandatory)](#worktree-bootstrap-inline-mandatory) |

**Not a conflict:** `git worktree add` creates the directory; **`sedea_add_worktree_folder`** adds that path to the Mission Control / editor workspace. **`worktree-bootstrap`** assumes both are done and **forbids** repeating steps 1 or 3 on its lane.

**Removal is the mirror:** post-merge detach/remove applies **only** to the **`WORKTREE_ROOT`** from steps 1–3 on **this pass** — see § *Post-merge workspace cleanup* and rule **20** § *Worktree removal ownership (binding)*. **Do not remove worktrees you do not own.**

## Hard rules — git worktree vs workbench attach (binding)

Agents repeatedly call **`sedea_add_worktree_folder`** instead of **`git worktree add`**, or skip MCP attach after creating the worktree. On **every** **`coding-session`** lane these rules are **non-negotiable**:

| Step | Required | Forbidden |
|------|----------|-----------|
| **1 — Create worktree** | Shell **`git worktree add <path> -b <worktree-name> <base-ref>`** | **`sedea_add_worktree_folder`** (MCP does **not** run git — it only mounts an **existing** folder), `git clone`, manual checkout/mkdir, opening a folder without `git worktree add` |
| **3 — Mount in Sedea workbench** | MCP **`sedea_add_worktree_folder`** with **absolute** `path` (optional `name`) | VS Code / Cursor **Add Folder to Workspace**, hand-edited **`.code-workspace`** as the attach mechanism on Mission Control lanes, assuming step 1 made the worktree appear in the explorer |

**Fixed order:** step **1** → **2** → **3** → **4**. Never call **`sedea_add_worktree_folder`** before **`git worktree add`** succeeds. Never skip step **3** because the directory exists on disk.

**Squad Leader vs this lane:** **20_efficient-pr-shipping.mdc** § *Squad Leader on HOSTING_ROOT* may create the worktree and call **`sedea_add_worktree_folder`** before spawning **`coding-session`**. When this skill runs [Generic flow](#generic-flow-single-repo) on a **spawned implementation lane**, **this lane** owns steps 1–4 end-to-end unless the leader already completed attach and passed absolute **`WORKTREE_ROOT`** in spawn `inputs` — then skip duplicate `git worktree add` / MCP only when the worktree path already exists **and** is already mounted in the workbench.

## Structured choice (Mission Control)

Approval gates and worktree naming picks use **AskQuestion** or **`MC_PHASED_RESPONSE_V1`** per **`.sedea/centers/sedea/rules/2_ask-question-instructions.mdc`** and **`../README.md`** § *Recap, structured choice, act* — recap + modal in **one turn** when practical; rule **2** priority **3** split only when a long draft was already sent (next message = phased sentinel-first). **Act** (worktrees, spawn, `git`, code edits) is always after the developer selects in the modal.

On **[Spawned implementation lane](#spawned-implementation-lane)**, **this lane** edits the hosting repo under the worktree through the implementation cut point — do not tell the developer to paste a session prompt into another chat. On **prompt-only** runs, emit the external prompt and **stop** without implementing here.

## Refresh lane display (when stale)

After **`targetPlanPath`** / PR concern is clear (before worktree attach or immediately after bootstrap succeeds):

1. Compare the visible tab **title** / **hover** to this lane's work (`targetPlanSlug`, §1 single concern).
2. When spawn labels are **generic or wrong**, call MCP **`mission_control_update_lane_display`** on **this lane only** with non-empty **`title`** and optional **`description`** / **`hoverDescription`** (max lengths in [`.sedea/centers/sedea/rules/9_display-metadata-authority.mdc`](.sedea/centers/sedea/rules/9_display-metadata-authority.mdc)).
3. **Skip** when spawn labels already match scope.
4. **Forbidden:** **`mission_control_update_dispatch_display`** from a child lane.

See [`.sedea/centers/research-and-development/rules/50_mission-control-display-metadata-discipline.mdc`](../../../../rules/50_mission-control-display-metadata-discipline.mdc) § *Child lane — refresh own slot when labels are stale*.

### Spawned lane — sentinel-first (binding)

On spawned **`coding-session`** lanes, **in order to use the AskQuestion modal**, use **`MC_PHASED_RESPONSE_V1`** for gates (sentinel-first). Before the [Worktree-open gate](#worktree-open-gate), [Worktree-open gate (pr-plan spawn handoff)](#worktree-open-gate-pr-plan-spawn-handoff), [Ship cut-point gate](#ship-cut-point-gate-approve-commit-before-deploy), [Review feedback approval gate](#review-feedback-approval-gate), [Create-PR handoff after go](#create-pr-handoff-after-go) (exceptional — when **`hasProposedFollowUps`**, **`actionablePrePrFindings`** with developer **`proceed-create-pr`**, or explicit defer/revise before PR), [Post-create-pr handoff gate](#post-create-pr-handoff-gate), and any turn that **awaits a developer pick** before the next **Act** — **unless** [Auto-authorize implementation (pr-plan spawn)](#auto-authorize-implementation-pr-plan-spawn) or [Auto-spawn pre-pr-review](#auto-spawn-pre-pr-review) / [Inline create-pr (auto on clean go)](#inline-create-pr-auto-on-clean-go) / [Post-merge workspace cleanup](#post-merge-workspace-cleanup) auto-advance applies (no modal; proceed):

1. **Self-check:** the assistant message **starts** with **`MC_PHASED_RESPONSE_V1`** — **no** recap prose before the sentinel.
2. Put required recap lines in **`display.markdown`** only (see pr-plan spawn handoff recap below).
3. Copy-paste template for pr-plan spawn **worktree-open** gate (replace `<recap>` when validation adds a line):

```
MC_PHASED_RESPONSE_V1
{"version":1,"display":{"markdown":"<recap>"},"askQuestion":{"modalTitle":"Coding session — start implementation","questions":[{"id":"worktree-open","prompt":"Authorize worktree and implementation on this lane?","allowMultiple":false,"options":[{"id":"continue-fill-5-8","label":"Continue — fill §§5–8 while implementing"},{"id":"revise-plan","label":"Revise PR plan first"},{"id":"change-repo","label":"Change repo or worktree settings"},{"id":"defer","label":"Defer implementation"},{"id":"more-details","label":"More details for option _"}]}]}}
```

Default **`<recap>`** for pr-plan spawn: *Planning handoff complete (§§1–4). §§5–8 fill on this lane during implementation.*

### Prose-only ship handoff forbidden (binding)

On spawned **`coding-session`** lanes, Mission Control opens the AskQuestion UI only when **StreamFinal** parses the **AskQuestion tool** or a valid **`MC_PHASED_RESPONSE_V1`** block (`parsePhasedResponseFromAssistantText` in `extensions/mission-control/src/shared/phasedResponseParse.ts`). Prose menus do **not** open a modal.

**Forbidden** when any ship gate awaits a developer pick (cut-point, review feedback, exceptional create-PR, post-create-PR, or § *Every developer-await turn*):

| Anti-pattern | Why it fails |
|--------------|--------------|
| *Stay advisory until you pick …* / *I'll wait until you …* | Prose handoff — conduct **1** § *No idle handoff*; rule **2** § *Turn completion invariant* |
| *Pick Ship cut-point* / *tell me to push* without **`MC_PHASED_RESPONSE_V1`** | User cannot click options — same |
| *PR created* / PR URL only — *review on GitHub* without post-create-pr **`MC_PHASED_RESPONSE_V1`** | Same — § [Post-create-pr handoff gate](#post-create-pr-handoff-gate) step **7** |
| Recap + diff summary **without** phased envelope on the **same** turn | **No modal** — agent failure |
| Redirect cut-point to Squad Leader or another tab | § *Post-reload / cold session* — cut-point runs **on this lane** |

**Required instead:** emit **`MC_PHASED_RESPONSE_V1`** (sentinel line **1**; recap in **`display.markdown`**; ship options in **`askQuestion`**) per the gate sentinel for that step. Use **Default continuation options** from rule **2** only when **no** ship gate is open.

### Every developer-await turn (binding)

On spawned **`coding-session`** lanes, **any** assistant turn where the developer must **pick** before you **Act** (commit, push, spawn, `gh pr create`, edits, next ship step) **must** end with **`MC_PHASED_RESPONSE_V1`** (or **AskQuestion** tool when available on the lane). This includes — not only ship cut-point:

| Await point | Modal section |
|-------------|----------------|
| Worktree / implementation | [Worktree-open gate](#worktree-open-gate) |
| Review-ready / commit / Before deploy | [Ship cut-point gate](#ship-cut-point-gate-approve-commit-before-deploy) |
| Before deploy manual step | § [Before deploy deploy-walk handoff](#before-deploy-deploy-walk-handoff) step 4 |
| Pre-PR findings | [Review feedback approval gate](#review-feedback-approval-gate) |
| Open PR (exceptional) | [Create-PR handoff after go](#create-pr-handoff-after-go) — only when **`hasProposedFollowUps`** or (**`actionablePrePrFindings`** and developer chose **`proceed-create-pr`**) |
| **After `gh pr create` succeeds** | [Post-create-pr handoff gate](#post-create-pr-handoff-gate) — **same turn**, not prose-only PR URL |
| Waiting on child **`pre-pr-review`** | Structured choice before turn ends (rule **2** § *Default continuation options* or defer) |

**Forbidden:** ending a turn with only a PR link, *PR created — review on GitHub*, *tell me when*, or *pick … in chat* when a gate table exists for that await point.

### Post-reload / cold session (binding)

After Mission Control reload or window restart on **this** spawned **`coding-session`** lane:

1. **You are already on the coding-session child lane** — warm-up and post-restore preamble identify **spawned child**, not Squad Leader.
2. **Never** ask the developer to "switch to" or "continue in" the Coding session tab — they are messaging you here.
3. **[Ship cut-point gate](#ship-cut-point-gate-approve-commit-before-deploy)**, worktree-open, and every other gate in this skill run **on this lane** — emit **`MC_PHASED_RESPONSE_V1`** here; do **not** redirect ship cut-point to another tab or to the Squad Leader.
4. Re-read this SKILL.md and the prior transcript; resume from the last incomplete ship-chain step.

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

When true, follow [Spawned from `pr-plan` (expected incomplete)](#spawned-from-pr-plan-expected-incomplete). After [Pre-worktree validation](#pre-worktree-validation-plan-completeness), use [Auto-authorize implementation (pr-plan spawn)](#auto-authorize-implementation-pr-plan-spawn) when eligible — otherwise [Worktree-open gate (pr-plan spawn handoff)](#worktree-open-gate-pr-plan-spawn-handoff) — not the generic incomplete gate with “executive override” labels.

### Spawned from `pr-plan` (expected incomplete)

When [pr-plan spawn handoff detection](#pr-plan-spawn-handoff-detection) applies:

1. Do **not** say the PR plan is “not fully populated,” “incomplete planning,” “not ready,” or that **`pr-plan`** failed.
2. Say: *Planning handoff complete (§§1–4). §§5–8 fill on this lane during implementation.*
3. After **`plan-ws-completeness.mjs`** → `INCOMPLETE` (optional second stdout line `EXPECTED_SECTIONS_5_8_TBD`), treat as **expected**, not a defect — do **not** send the developer back to **`pr-plan`** unless they choose **Revise PR plan first** or **Stop — I'll complete the plan first** (detached / snapshot entry only — demoted on pr-plan spawn path).
4. When [Auto-authorize implementation (pr-plan spawn)](#auto-authorize-implementation-pr-plan-spawn) does **not** apply, the [Worktree-open gate (pr-plan spawn handoff)](#worktree-open-gate-pr-plan-spawn-handoff) uses **Continue — fill §§5–8 while implementing** as the default authorizing choice — not “executive override” wording.

## Plan-anchored context (optional inputs)

The developer starts **`coding-session`** on a detached lane, via mission dispatch, or as a **spawned child** of **`pr-plan`** (§5d).

When `targetPlanPath` / `targetPlanSlug` are known (message, `@` path, snapshot, or spawn `inputs`), use them for sidecar writes and the session prompt. When spawned from **`pr-plan`**, treat spawn `inputs` and `initiatingPrompt` as authoritative — do not re-resolve from documentation placeholders.

If `upstreamSkill` is **`pr-plan`** and `repoPath` is present in `inputs`, use it as hosting repo root. If repo targets are missing, stop and ask the developer with **AskQuestion** to choose or provide the hosting repo(s). Do not infer from focused files alone.

## Implementation consent (two layers)

Only **two** developer-consent layers apply before worktrees. Do not stack extra approval **AskQuestion** rounds for the same decision.

| Layer | Where decided | Output field | This skill |
|-------|---------------|--------------|------------|
| **1 — Planning handoff** | **`pr-plan`** §5c **Start coding session** + §5d spawn `inputs` | `readyForImplementation`, `planningHandoffApproved` | Hint only; **do not** re-ask. Does **not** authorize worktrees or advance **`.sedea/centers/research-and-development/missions/plan-and-deliver/plan.mdc`** §8 `phase` past `not-started`. |
| **2 — Worktree open** | [Worktree-open gate](#worktree-open-gate) **or** [Auto-authorize implementation (pr-plan spawn)](#auto-authorize-implementation-pr-plan-spawn) | `developerApprovedImplementation` | Set `true` after an authorizing gate choice **or** auto-authorize when spawn handoff + §§1–4 drafted (see below). |

**Not consent layers** (validation / setup only — no separate approval **AskQuestion**):

- **`plan-ws-completeness.mjs`** — script check; incomplete plans are handled inside the worktree-open gate (override option), not a second gate.
- **Repo selection** — **AskQuestion** only when `repoPath` / `repoPaths` are missing.

`inputs.developerApprovedImplementation` is never a substitute for layer 2 on **detached** entry; ignore upstream `true` until the developer picks an authorizing worktree-open option **or** [Auto-authorize implementation (pr-plan spawn)](#auto-authorize-implementation-pr-plan-spawn) applies on this run.

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

**Multi-repo:** run the script **once** on the shared plan before the worktree-open gate or auto-authorize path.

## Auto-authorize implementation (pr-plan spawn)

**Layer 2 waived** — no worktree-open **AskQuestion** or **`MC_PHASED_RESPONSE_V1`** when the developer already approved **Start coding session** on the **`pr-plan`** lane and the PR plan is ready to implement.

### Eligibility (all required)

1. [pr-plan spawn handoff detection](#pr-plan-spawn-handoff-detection) applies.
2. `inputs.planningHandoffApproved === true` **or** (`inputs.readyForImplementation === true` **and** `inputs.upstreamSkill === "pr-plan"`).
3. `inputs.promptOnly` is not `true`.
4. `inputs.repoPath` or non-empty `inputs.repoPaths` is present.
5. After [Pre-worktree validation](#pre-worktree-validation-plan-completeness), **either**:
 - `planCompleteness: complete` (`plan-ws-completeness.mjs` exit **0** / `OK`), **or**
 - `planCompleteness: incomplete` **and** stdout included `EXPECTED_SECTIONS_5_8_TBD` (§§ **1–4** drafted; §§ **5–8** may stay `_TBD_`).

### When eligibility fails

| Failure | Action |
|---------|--------|
| §§ **1–4** still contain `_TBD_` (incomplete without `EXPECTED_SECTIONS_5_8_TBD`) | [Worktree-open gate](#worktree-open-gate) — generic incomplete options; do **not** auto-authorize |
| `readyForImplementation: false` or `planningHandoffApproved` not set | [Worktree-open gate (pr-plan spawn handoff)](#worktree-open-gate-pr-plan-spawn-handoff) or generic gate |
| Missing `repoPath` / `repoPaths` | **AskQuestion** once for repo only — not a second planning-approval round |
| Detached / snapshot entry (no spawn handoff) | [Worktree-open gate](#worktree-open-gate) — layer 2 required |

### When eligible — act without modal

1. Set `outputs.developerApprovedImplementation: true` and `outputs.planCompleteness` from validation.
2. State one informational line (no modal): *Planning handoff approved on **pr-plan** lane. §§1–4 ready — implementing; §§5–8 fill on this lane as code lands.* When `planCompleteness: complete`, use: *PR plan complete — implementing.*
3. Proceed immediately to [Generic flow](#generic-flow) (worktree add, sidecar, attach, bootstrap) — then [Spawned implementation lane](#spawned-implementation-lane).
   - **Bootstrap gate (binding):** Complete Generic flow step 4 inline per [Worktree bootstrap (inline mandatory)](#worktree-bootstrap-inline-mandatory).
   - Set `outputs.bootstrapStatus: pending` before running the script.
   - **If bootstrap is not `success`:** STOP this turn — no product edits, no §§5–8, no ship chain. Follow **Failure** under [Worktree bootstrap (mandatory)](#worktree-bootstrap-mandatory).
   - **Forbidden substitute:** extension-level `npm ci`, `tsc`, or vitest passing does **not** set `bootstrapStatus: success` when the bootstrap script exited non-zero.
4. Do **not** emit **`MC_PHASED_RESPONSE_V1`** for worktree-open on this path.

## Worktree-open gate

**Layer 2 — single AskQuestion** before any `git worktree add`, sidecar session write, Mission Control worktree attach, or coding-agent prompt emission — **skip** when [Auto-authorize implementation (pr-plan spawn)](#auto-authorize-implementation-pr-plan-spawn) applies. After approval, [Generic flow](#generic-flow-single-repo) step **1** is **`git worktree add` only**; step **3** is **`sedea_add_worktree_folder` only** — see [Hard rules](#hard-rules--git-worktree-vs-workbench-attach-binding).

**Recap and structured choice:** Summarize completeness / plan path in **`display.markdown`** when using **`MC_PHASED_RESPONSE_V1`**. On spawned lanes, **`MC_PHASED_RESPONSE_V1` must be line 1** — see [Spawned lane — sentinel-first (binding)](#spawned-lane--sentinel-first-binding). Open every gate via **AskQuestion** or **`MC_PHASED_RESPONSE_V1`** — prefer one message for recap + modal. See **`../README.md`** § *Recap, structured choice, act (plan-and-deliver)*, **`.sedea/centers/sedea/rules/2_ask-question-instructions.mdc`**, and **`.cursor/rules/mission-control-agent-runtime.mdc`**.

**Branch first:** when [Auto-authorize implementation (pr-plan spawn)](#auto-authorize-implementation-pr-plan-spawn) applies, **skip this entire section**. When [pr-plan spawn handoff detection](#pr-plan-spawn-handoff-detection) applies but auto-authorize does not, use [Worktree-open gate (pr-plan spawn handoff)](#worktree-open-gate-pr-plan-spawn-handoff) below — even when `planCompleteness: complete`. Otherwise use the generic tables in this section.

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
| `change-repo` | Change repo or worktree settings |
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
- **Change repo or worktree settings**
- **Defer implementation**
- **More details for option _**

**When `planCompleteness: incomplete`** (and **not** [pr-plan spawn handoff detection](#pr-plan-spawn-handoff-detection)), required options (do **not** offer plain **Start implementation now** without override):

- **Start with incomplete plan (executive override)**
- **Stop — I'll complete the plan first**
- **Revise PR plan first**
- **Change repo or worktree settings**
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
2. **Bootstrap prerequisite (assert first)** — If `outputs.bootstrapStatus !== 'success'` (and no documented attested `--skip-*` in `outputs.bootstrapSkipFlags`), this section is **out of scope**. Only bootstrap recovery per [Worktree bootstrap (mandatory)](#worktree-bootstrap-mandatory) is allowed until success or attested skip flags are recorded. When bootstrap is `pending` or `failed`, **stop** — do not warm up, read the plan for implementation, or edit the worktree. **Forbidden until `outputs.bootstrapStatus: success`:** worktree product edits, plan §§ **5–8** fill, tests, local `npm` / compile, `git commit`, `git push`, [Ship cut-point gate](#ship-cut-point-gate-approve-commit-before-deploy), inline **`deploy-walk`** (Before deploy), spawn **`pre-pr-review`**, inline **`create-pr`**, and ad-hoc Before-deploy checkbox edits that substitute for [Before deploy deploy-walk handoff](#before-deploy-deploy-walk-handoff).
3. **Warm-up on this lane** — Follow [Session prompt structure](#session-prompt-structure) Phase 1 steps (workspace readiness, worktree name check, load **Project rules** from the worktree, plan file + sidecar when anchored). You may skip emitting a fenced **external** session prompt unless the developer asks for a copy.
4. **Read the anchored PR plan** — Load `targetPlanPath` (from spawn `inputs` / `initiatingPrompt`). Use §§ **1–4** for scope context; **first implementation work** is substantive fill of §§ **5–8** (replace `_TBD_` as code paths become known), then code/tests/docs per those sections.
5. **Implement** — Make hosting-repo edits (code, tests, docs) in the worktree until **implementation ready for developer review** or a blocking stop. **Do not** `git commit` or `git push` during implementation — see **20_efficient-pr-shipping.mdc** § *Review before commit* and [Ship cut-point gate](#ship-cut-point-gate-approve-commit-before-deploy) (ship cut-point also requires `outputs.bootstrapStatus: success`). Maintain **`## Follow-ups`** on the PR plan per **development-process** § *Coding Session*.
6. **Continuation** — Keep `outputs.continuationStatus: "active"` and `outputs.shipPhase: "implementing"` while work remains. Emit **`AGENT_RESULT_RESPONSE_V1`** with `status: partial` when blocked; do **not** use `continuationStatus: terminal` to mean “prompt emitted — hand off elsewhere.”
7. **Pre-review verification** — Before [Ship cut-point gate](#ship-cut-point-gate-approve-commit-before-deploy), complete pre-review verification prescribed by applicable **Project rules** paths (hosting-repo **`.cursor/rules/*.mdc`** listed in the session prompt or plan **§5**). **`Read`** each cited rule and run its before-review steps; re-run after each implementation batch. Block the review modal until every prescribed step passes (**exit 0**). Commands and repo-specific paths live in those hosting rules only — do not duplicate them in this skill.
8. **Ship chain** — When implementation is ready for developer review and step **7** passes (or no Project rule prescribes verification), follow [Ship chain after implementation](#ship-chain-after-implementation-coding-session-lane) on **this same lane** ([Ship cut-point gate](#ship-cut-point-gate-approve-commit-before-deploy) — one modal for approve + commit + Before deploy spawn when applicable → **`pre-pr-review`** → **`create-pr`** when authorized). **Do not** skip Before deploy or open a PR before that order completes.

## Deploy test plan confirmations

When the developer **confirms** a numbered step in the anchored PR plan’s **`## N. Deploy test plan`** (§7 **`### Before deploy`** or **`### After deploy`**), treat chat as **not** the system of record — same contract as **`deploy-walk`**: state lives in the plan file. Prefer loading **`deploy-walk`** **inline** for checklist walks — it auto-runs agent-executable steps; use this ad-hoc path only for one-off confirmations when a full inline walk is not running.

**Before deploy + bootstrap:** Do **not** run inline **`deploy-walk`** (Before deploy) or flip **`### Before deploy`** checkboxes via this ad-hoc path until `outputs.bootstrapStatus: success`. **After deploy** confirmations may proceed when the PR is merged per normal rules.

1. **Resolve `targetPlanPath`** — from spawn `inputs`, `plan-state.mjs resolve --cwd "<worktreePath>"`, or an explicit `@path` in the message. If multiple plans could apply, use **AskQuestion** once for **which plan** or **which step number** — not whether to persist.
2. **Same-turn file edit** — before the reply ends, patch the matching §7 line: flip `[ ]` → `[x]` for that step number. Optionally append a short dated note on the line or under §7 (for example `— confirmed YYYY-MM-DD`).
3. **Reply** — state the **absolute `targetPlanPath`** you edited and which step numbers were checked.
4. **Do not** tell the developer “you can mark” or “likely done” without editing when you can write the operations plan. If you cannot write (permissions, wrong repo, missing path), say why and offer **`deploy-walk present 7`** / **`deploy-walk <N> done`** or a concrete absolute path.
5. **Terminal `outputs`** — when you emit **`AGENT_RESULT_RESPONSE_V1`** in the same turn after edits, include `outputs.deployPlanStepsChecked` (array of step numbers, e.g. `[1,2,3]`) and `outputs.targetPlanPath`.

**Trigger examples:** “1 confirmed”, “step 2 done”, “3. confirmed” (numbered §7 items). Do not infer confirmation from vague chat (“looks good”) without an explicit step reference — use **AskQuestion** for the step number if needed.

## Prompt-only handoff

Reserved when this run is **not** a spawned implementation lane (see table above).

1. Complete Generic flow steps 1–4 (including [Worktree bootstrap (inline mandatory)](#worktree-bootstrap-inline-mandatory) — wait for `outputs.bootstrapStatus: success`) before emitting the external prompt.
2. Emit a **session prompt** per [Session prompt structure](#session-prompt-structure) inside a [copy/paste-safe](#copypaste-safe-prompt-output-required) fence. State that bootstrap completed (`outputs.bootstrapStatus: success`) or document failure and that the external agent must not implement until bootstrap succeeds.
3. Set `outputs.sessionPromptEmitted: true` and `outputs.implementationMode: "prompt-only"`.
4. **Stop** — do not `cd` into the worktree to implement on this lane until step 1 reports bootstrap success.
4. When the developer later continues on **this** or another lane after implementation review, this skill owns [Ship chain after implementation](#ship-chain-after-implementation-coding-session-lane) from the appropriate step.

Detached developers may paste the prompt into a separate Mission Control session; that session then follows the same skill as an implementation lane once layer 2 is satisfied there.

## Copy/paste-safe prompt output (required)

When you emit the final session prompt for the user to paste into **a separate coding agent** session (**prompt-only** mode):

- Wrap the **entire session prompt** in a fenced markdown code block (default ` ```text … ``` `).
- If the body contains triple backticks, use a four-backtick outer fence or escape inner fences.
- Keep explanatory prose **outside** the fence.

## Generic flow (single repo)

Run only **after** [Pre-worktree validation](#pre-worktree-validation-plan-completeness) and an authorizing choice in the [Worktree-open gate](#worktree-open-gate).

1. Create a worktree from `origin/main` — **`git worktree add` only** (see [Hard rules](#hard-rules--git-worktree-vs-workbench-attach-binding)):
 ```bash
 git fetch origin main
 git worktree add <sibling-path> -b <worktree-name> origin/main
 ```
 - **Forbidden (step 1):** Do **not** call **`sedea_add_worktree_folder`** to create the worktree — MCP attach only mounts an **existing** path. Worktree creation is **`git worktree add` only**.
 - Prefix sibling paths with the repo directory basename (see **Worktree setup** in `.sedea/centers/research-and-development/rules/20_efficient-pr-shipping.mdc`).
 - Always create from **`origin/main`**, not **`main`** (same failure mode as in **efficient-pr-shipping**).
 - Worktree naming: **`.sedea/centers/research-and-development/rules/20_efficient-pr-shipping.mdc`** § *Worktree naming* (primary **hosting repo** → Sedea **`.sedea/centers/sedea/rules/7_stacked-pr-worktree-naming.mdc`**; **hosting repo worktree** → `feat/`, `improve/`, `fix/`, …).
 - **Dirty-tree gate (hosting repo)** — Before `git worktree add`, run `git status --porcelain` in the repo that receives the worktree (`HOSTING_ROOT` when adding from the primary hosting repo).
 - **Submodule gitlink-only (non-blocking)** — When the active hosting repo pins `.sedea/` via git submodules (see **`.cursor/rules/dot-sedea.mdc`** § *Submodule pins* on the active hosting repo, for example **`sedea-ai/app`**), and **every** porcelain line is a **modified submodule gitlink** under `.sedea/` (paths under `.sedea/centers/` or `.sedea/operations/`), verify pointer-only drift before proceeding:
 ```bash
 git diff --stat -- <submodule-path>
 ```
 **Proceed** when each affected submodule shows only a **2 insertions(+), 2 deletions(-)** gitlink change and no other paths appear in that stat. Routine submodule pin updates do **not** block worktree creation.
 - **Publishing pin to `origin/main`** — Local gitlink drift or a primary-clone submodule checkout update does **not** ship the pin. After a **center-repo** PR merges to **`defaultBranch`**, agents **must** run [`.sedea/centers/sedea/skills/promote-center-submodule-pin/SKILL.md`](.sedea/centers/sedea/skills/promote-center-submodule-pin/SKILL.md) **inline** on the hosting-repo lane — see **`.sedea/centers/research-and-development/rules/20_efficient-pr-shipping.mdc`** § *Center submodule pin promotion (hosting repo)*.
 - **Still blocking** — **Stop** when porcelain includes **any** path outside those `.sedea/` submodule gitlink lines (for example `extensions/`, `packages/`, other tracked application source), when `git diff --stat` shows content changes inside a submodule (not pointer-only), or when the hosting repo has non-empty porcelain that is not explained by allowed submodule gitlinks alone.
 - Do **not** stash, commit, discard, or clean the user's WIP to clear a blocking dirty tree.
 - If `baseRef` input is supplied, it must be a remote integration ref such as `origin/main`; do not accept a local-only ref for worktree creation.

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

3. **Attach the worktree in Sedea** (same workbench) — **`sedea_add_worktree_folder` only** (see [Hard rules](#hard-rules--git-worktree-vs-workbench-attach-binding)): in Mission Control, invoke MCP **`sedea_add_worktree_folder`** with JSON `{ "path": "<absolute-worktree-root>" }` (optional `"name"` for the explorer label). See **20_efficient-pr-shipping.mdc** — *Squad Leader on HOSTING_ROOT vs agent sessions in worktrees* and *Attach the worktree in Sedea*.

 - **Forbidden (step 3):** Do **not** use editor **Add Folder to Workspace**, hand-edited **`.code-workspace`** files, or “open folder” as a substitute for **`sedea_add_worktree_folder`**. Workbench attach is **`sedea_add_worktree_folder` only** (after step 1 succeeds).

 This MCP attach is mandatory before post-setup work. If the MCP call fails, stop with `partial`; report the worktree path and the attach error, and keep `continuationStatus: "active"` so the Squad Leader does not close the implementation lane.

4. **Worktree bootstrap (mandatory wait)** — see [Worktree bootstrap (inline mandatory)](#worktree-bootstrap-inline-mandatory). Run bootstrap **inline on this lane** and **wait** for `outputs.bootstrapStatus: success`. **Do not** proceed to step 5 until bootstrap succeeds — no parallel implementation.

5. **Branch** per [Execution mode after worktree attach](#execution-mode-after-worktree-attach):
 - **Spawned implementation lane** → continue with [Spawned implementation lane](#spawned-implementation-lane) (steps 1–7 there).
 - **Prompt-only handoff** → [Prompt-only handoff](#prompt-only-handoff).

## Worktree bootstrap (mandatory)

After Generic flow step 3 (`sedea_add_worktree_folder`) succeeds, prepare **`WORKTREE_ROOT`** for **implementation**, **commit**, **Before deploy** **`deploy-walk`**, and the rest of the [ship chain](#ship-chain-after-implementation-coding-session-lane). Bootstrap is a **separate mandatory step** on this lane — **finish it before any implementation** (worktree edits, plan §§ **5–8**, tests, or `npm`).

**Resolve paths**

- **`HOSTING_ROOT`** — hosting repo that contains `.sedea/centers/sedea/` (see **20_efficient-pr-shipping.mdc** § *Hosting repo cwd for scripts*). Use spawn `inputs.repoPath` when it points at that root.
- **`WORKTREE_ROOT`** — absolute path from step 1 (`git worktree add`) / sidecar `worktrees[].path`.

**Normative path:** [Worktree bootstrap (inline mandatory)](#worktree-bootstrap-inline-mandatory) — execute **`worktree-bootstrap`** inline on **this** **`coding-session`** lane and wait for completion.

**Spawn exception (rare)** — Spawn **`worktree-bootstrap`** on a child lane **only** when a future mission protocol step explicitly requires a spawned bootstrap specialist. That path is **not** the default for **`coding-session`**; when used, the parent must **wait** for child `outputs.bootstrapStatus: success` before implementation (same gate as inline).

**`--skip-*` flags** — Use only when the developer attests partial setup. Record flags in chat and in `outputs.bootstrapSkipFlags`.

**Success** — Set `outputs.bootstrapStatus: success`, then continue to Generic flow step 5. Set `outputs.shipPhase: worktree` on the first terminal line that reports setup complete (before `implementing`).

**Failure** — When bootstrap fails:

1. Capture stderr/stdout tail in `outputs.bootstrapFailureReason`.
2. Emit **`AGENT_RESULT_RESPONSE_V1`** with `status: partial`, `outputs.bootstrapStatus: failed`, `outputs.shipPhase: worktree`, `outputs.developerApprovedImplementation: true`, `outputs.continuationStatus: active`.
3. **Do not** advance into implementation or the ship chain (`git commit`, [Ship cut-point gate](#ship-cut-point-gate-approve-commit-before-deploy), Before deploy **`deploy-walk`**, **`pre-pr-review`**, **`create-pr`**) until bootstrap succeeds.
4. Offer re-run inline per [Worktree bootstrap (inline mandatory)](#worktree-bootstrap-inline-mandatory); **`--skip-*`** only after developer attestation.
5. **Same-turn stop:** Emit **`MC_PHASED_RESPONSE_V1`** as the first line of the response (spawned lane sentinel-first). **Forbidden in this turn:** any hosting-repo file edit, plan §§5–8 updates, tests run for implementation validation, ship cut-point, or commit.
6. **AskQuestion options (minimum):** Retry full bootstrap · Retry with developer-attested `--skip-*` · Defer · More details for option _.

The partial terminal in step 2 may accompany the modal but does **not** replace the structured retry choice.

**Missing script** — Stop with `partial`, `bootstrapStatus: failed`, `bootstrapFailureReason` naming the missing path, `shipPhase: worktree`.

## Worktree bootstrap (inline mandatory)

Run after attach succeeds (Generic flow step 3 or multi-repo step 4). **Normative default** — inline on **this** lane; **wait** for bootstrap to finish before Generic flow step 5 or [Spawned implementation lane](#spawned-implementation-lane).

1. Set `outputs.bootstrapStatus: pending`.

2. **Execute inline** — In the **same agent session**, read and follow [`.sedea/centers/research-and-development/missions/plan-and-deliver/skills/worktree-bootstrap/SKILL.md`](../worktree-bootstrap/SKILL.md) with **inline** context:

| Field | Value |
|-------|--------|
| `worktreePath` | Absolute **`WORKTREE_ROOT`** |
| `hostingRoot` | Absolute **`HOSTING_ROOT`** |
| `targetPlanPath` / `targetPlanSlug` | When plan-anchored |
| `worktreeName` | Worktree name when known |
| `bootstrapSkipFlags` | Array of attested `--skip-*` tokens, or omit |
| `ledgerParent` | When known |
| `upstreamSkill` | `"coding-session"` |

Follow that skill’s **Completion (inline)** — report `bootstrapStatus`, `bootstrapFailureReason`, and `bootstrapSkipFlags` in prose/`outputs` on this lane. Do **not** emit `AGENT_RUN_REQUEST_V1` for bootstrap on the default path.

3. **Wait** — Do **not** proceed to Generic flow step 5, warm-up, plan §§ **5–8**, product edits, tests, or `npm` until `outputs.bootstrapStatus: success`.

4. **Blocked until `outputs.bootstrapStatus: success`:** all implementation work, `git commit`, `git push`, [Ship cut-point gate](#ship-cut-point-gate-approve-commit-before-deploy), [Before deploy deploy-walk handoff](#before-deploy-deploy-walk-handoff), spawn **`pre-pr-review`**, inline **`create-pr`**.

5. **Multi-repo** — Run inline bootstrap **sequentially** for each **`WORKTREE_ROOT`** (complete one repo’s bootstrap before starting the next). All repos must reach `outputs.bootstrapStatus: success` before any cross-repo implementation.

6. **Retry** — On failure, re-run inline bootstrap (idempotent script) after developer attestation for any **`--skip-*`** flags; do not start implementation until success.

### Bootstrap anti-patterns (binding)

| Anti-pattern | Correct action |
|--------------|----------------|
| Ran `bootstrap-worktree-dev.sh` without reading `worktree-bootstrap/SKILL.md` inline | Read skill inline; set and report `bootstrapStatus` |
| Script exit non-zero but `tsc`/vitest passed | `bootstrapStatus: failed`; stop; modal retry |
| Auto-authorize path skips bootstrap | Auto-authorize skips worktree-open modal only |
| “Bootstrap note” in ship recap without `bootstrapStatus` in outputs | Set outputs; stop at failure before implementation |
| Retry with undocumented `--skip-*` | Developer attestation first; record in `bootstrapSkipFlags` |

### Spawned bootstrap (exception only)

When a protocol step **explicitly** requires a spawned bootstrap child:

1. Emit **`AGENT_RUN_REQUEST_V1`** for **`worktree-bootstrap/SKILL.md`** with the same `inputs` as the inline table above.
2. Set `outputs.bootstrapLaneCorrelationId` to the spawn UUID; set `outputs.bootstrapStatus: pending`.
3. **Wait** for the child **`AGENT_RESULT_RESPONSE_V1`** — copy `outputs.bootstrapStatus`, `outputs.bootstrapFailureReason`, and `outputs.bootstrapSkipFlags`; **do not** implement on this lane while pending or failed.
4. On **`success`**, clear `outputs.bootstrapLaneCorrelationId` and continue to Generic flow step 5.

## Multi-repo flow (shared worktree name)

When the plan’s **Worktree setup** lists two or more repos, or the user asks for a cross-repo session:

1. For **each** repo, **`git worktree add` only** with the **same worktree name** (unless the plan says otherwise) — never **`sedea_add_worktree_folder`** for creation (see [Hard rules](#hard-rules--git-worktree-vs-workbench-attach-binding)).
 - Validate every repo before creating any worktree using the same **Dirty-tree gate** as § *Generic flow* step 1. If one repo is blocking-dirty or missing the requested base ref, stop before creating a partial multi-repo session.

2. Optionally create a **`.code-workspace`** file listing each worktree folder with absolute `path` values — use only if your team uses that layout; otherwise attach **each** worktree root with **`sedea_add_worktree_folder` only** in turn (never editor **Add Folder to Workspace**).

3. **`plan-state.mjs set-worktrees`** with one JSON entry per repo; **`set-session --focus`** to the workspace file **or** primary worktree path per your team convention (must stay consistent with **`resolve --cwd`** expectations in **planning-target-resolution**).

4. **Attach each worktree** with **`sedea_add_worktree_folder` only** (after each step-1 **`git worktree add`**), then [Worktree bootstrap (inline mandatory)](#worktree-bootstrap-inline-mandatory) **once per `WORKTREE_ROOT`** (sequential inline bootstrap per repo). Wait for each repo’s `bootstrapStatus: success` before any implementation or prompt for that repo.

5. **Branch** per [Execution mode after worktree attach](#execution-mode-after-worktree-attach) (spawned lane implements each repo’s scope in turn, or prompt-only emits **one session prompt per repo** with per-repo scope guards).

6. **Prompt-only:** **Stop** after prompts. **Spawned lane:** continue implementation per repo scope before the [ship chain](#ship-chain-after-implementation-coding-session-lane).

## Stale worktree detection (detect-only)

Post-merge **worktree removal**, **`HOSTING_ROOT` `git pull origin main`**, and **local worktree name ref cleanup** run on this lane in [Post-merge workspace cleanup](#post-merge-workspace-cleanup) **after PR merge and before** [After deploy deploy-walk handoff](#after-deploy-deploy-walk-handoff). **`plan-reconcile`** §5 is an **idempotent fallback** when cleanup was skipped, deferred, or no stale paths remained at post-merge time.

| Rule | Behavior |
|------|----------|
| **Forbidden** | Proactive **AskQuestion** or chat offers to run full **`plan-reconcile`** archive + cleanup as routine post-merge wrap-up before After deploy |
| **Forbidden** | Destructive git cleanup outside [Post-merge workspace cleanup](#post-merge-workspace-cleanup) (authorized apply) or **`plan-reconcile`** §5 fallback |
| **When to detect** | After **`prState: merged`** (post-create-pr, **`check-pr-status`**, or developer return) before After deploy walk |
| **How** | From **`HOSTING_ROOT`**: `node …/plan-state.mjs --operations-user-id "$OPS_ID" detect-stale-workspaces --slug <slug> --json` |
| **If empty** | One line: no stale worktree paths on disk — proceed to [After deploy deploy-walk handoff](#after-deploy-deploy-walk-handoff) when merge confirmed |
| **If stale** | Short recap (path, worktree name, **`mergedPr`**) then route to [Post-merge workspace cleanup](#post-merge-workspace-cleanup) — **not** remove-worktree options on this detect-only pass |
| **After deploy / archive** | [Plan-reconcile handoff (inline)](#plan-reconcile-handoff-inline) for archive when deploy verification **`done`** — §5 cleanup skips paths already cleaned |

## Ship chain after implementation (coding-session lane)

Normative order on the **spawned implementation lane** — **do not** skip steps or jump to **`create-pr`** before **`pre-pr-review`**, and **do not** skip **Before deploy** after commit.

```mermaid
flowchart LR
 IMPL[Implement — no commit] --> CUT[Ship cut-point gate]
 CUT --> BDW[Inline deploy-walk — Before deploy]
 BDW --> PPR[Auto-spawn pre-pr-review]
 PPR --> FB{actionable findings?}
 FB -->|yes| RFG[Review feedback gate]
 FB -->|no go| CPR[Auto inline create-pr]
 RFG --> CPR
 CPR --> MERGE[Wait merge]
 MERGE --> PMC[Auto post-merge cleanup]
 PMC --> ADW[Inline deploy-walk — After deploy]
 ADW --> REM[Post–After deploy remainder authorization]
```

| Step | Section | Commit required? | Modal? |
|------|---------|------------------|--------|
| 1 | [Ship cut-point gate](#ship-cut-point-gate-approve-commit-before-deploy) | **No** for review — combined modal covers approve + commit + Before deploy inline | **Yes** |
| 2 | [Before deploy deploy-walk handoff](#before-deploy-deploy-walk-handoff) | **Yes** — after cut-point **Act** (commit when needed, then inline walk) | **No** (manual §7 step only) |
| 3 | [Auto-spawn pre-pr-review](#auto-spawn-pre-pr-review) + [Pre-PR review handoff](#pre-pr-review-handoff) | **Yes** — Before deploy resolved or skipped | **No** — auto-spawn on next turn |
| 4 | [Inline create-pr (auto on clean go)](#inline-create-pr-auto-on-clean-go) or [Create-PR handoff after go](#create-pr-handoff-after-go) | After **`pre-pr-review`** **go** | **No** on clean **go** without proposed follow-ups; **Yes** when **`hasProposedFollowUps`**, **`actionablePrePrFindings`**, or **`proceed-create-pr`** (Create-PR handoff only when follow-ups exist or developer chose **`proceed-create-pr`** with follow-ups) |
| 5 | [Post-merge workspace cleanup](#post-merge-workspace-cleanup) | **No** — after **`prState: merged`**, before After deploy | **No** — auto **`--apply`** when authorized; modal on failure/unclear ownership only |
| 6 | [After deploy deploy-walk handoff](#after-deploy-deploy-walk-handoff) | **No** — post-merge cleanup done or skipped | **No** (manual §7 step only) |
| 7 | [Post–After deploy remainder authorization](#post-after-deploy-remainder-authorization) | **No** — one batch or per-step approval before tail ship work | **Yes** when inventory non-empty |

**Forbidden on this lane:** `git commit` before ship cut-point approval; **`git commit`**, Before deploy **`deploy-walk`**, or ship cut-point while `outputs.bootstrapStatus` is `pending` or `failed`; spawn **`pre-pr-review`** while the tree is dirty; run inline **`create-pr`** before steps 2–3 complete; treat ad-hoc Before-deploy checkbox edits as a substitute for step 2 inline **`deploy-walk`** when §7 has unchecked Before-deploy items; **three separate AskQuestions** for approve → commit → Before deploy when [Combined authorization](#combined-authorization) applies; prose-only ship cut-point handoff (*pick Ship cut-point*, *stay advisory*, *tell me when*) without parseable **`MC_PHASED_RESPONSE_V1`** on that turn; [Create-PR handoff after go](#create-pr-handoff-after-go) or any modal with **`approve-followups-create-pr`** when **`hasProposedFollowUps`** is **false** after clean **`go`**.

## Ship cut-point gate (approve, commit, Before deploy)

**Precondition:** `outputs.bootstrapStatus: success` (or bootstrap not required on this run). If bootstrap is `pending` or `failed`, finish or retry [Worktree bootstrap (mandatory)](#worktree-bootstrap-mandatory) before opening this gate.

When implementation is **ready for developer review** (or the developer signals *ready for review* / *review my changes*), **stop** implementation edits and open this gate. This implements **20_efficient-pr-shipping.mdc** § *Review before commit* — **developer code review comes before any commit** — and combines what were separate approve, commit, and Before deploy inline modals into **one** structured choice when plan-anchored and §7 has work to walk.

### Pre-send self-check (binding)

Before opening this gate, assert:

1. `outputs.bootstrapStatus === 'success'` **or** documented attested `--skip-*` in `outputs.bootstrapSkipFlags`. If `pending` or `failed`, do **not** open this gate — recover per [Worktree bootstrap (mandatory)](#worktree-bootstrap-mandatory).

### Summarize and direct diff review

0. **Pre-review verification** — Complete step **7** of [Spawned implementation lane](#spawned-implementation-lane) (or the equivalent for this entry path). Re-run after each code-change batch before opening this gate. **Do not** open the review modal until prescribed hosting-repo verification passes.
1. Present a short summary: `git status --short` (call out **uncommitted** vs committed), files touched, and scope vs the anchored plan when present. If there are **no commits yet** in the worktree, say so — review is against the **working tree** and/or `git diff` / IDE SCM view.
2. When plan-anchored, **read** §7 **`### Before deploy`** and note in the recap: empty / all `[x]` / *N* unchecked Before-deploy steps (list step numbers when ≤5).
3. Tell the developer to review in the **IDE diff** (SCM: working tree, staged, and unstaged) and/or `git diff` / `git diff --cached` as appropriate. Do **not** treat “implementation done” chat as diff review.
4. **Do not** run `git commit`, `git push`, inline **`deploy-walk`**, spawn **`pre-pr-review`**, or inline **`create-pr`** in the same assistant turn as this gate's modal.

### Orientation vs ship cut-point (binding)

Per **`.sedea/centers/sedea/rules/5_alignment-safeguard.mdc`** § *Pre-assessment*, *What's next?* / *what now?* are orientational **only** when the lane is **not** blocked on a ship gate.

When **any** applies, the turn is **not** orientation-only — open [Ship cut-point gate](#ship-cut-point-gate-approve-commit-before-deploy) **in the same assistant message** (phased envelope, not prose recap alone):

- Implementation is **ready for developer review** (or the developer signals *ready for review* / *review my changes*).
- The transcript shows implementation edits finished and the ship chain has **not** yet received a cut-point modal selection.
- The developer asks *what's next?*, *what now?*, or similar while the above holds.

Answer orientation **inside** **`display.markdown`** and ship **`askQuestion`** together — do **not** defer the modal to a later turn.

### Combined authorization

Use **one** **AskQuestion** or **`MC_PHASED_RESPONSE_V1`** (`modalTitle`: *Coding session — approve, commit, Before deploy*) — recap + modal in one message per rule **2**. **Do not** chain separate modals for approve, then commit, then Before deploy when this subsection applies.

**When to use the combined modal (normative):** plan-anchored run **and** §7 **`### Before deploy`** has at least one **`[ ]`** item (not empty, not only *None — …*, not all `[x]`).

| Option id | Label (brief) | Authorizes on **next** turn ([Act after pick](#act-after-ship-cut-point-pick)) |
|-----------|---------------|--------------------------------------------------------------------------------|
| `commit-only` | Approve, commit, run Before deploy walk | Implementation approved · **`git commit`** when tree dirty · inline **`deploy-walk`** (`before-deploy-only`) |
| `commit-push` | Approve, commit + push, run Before deploy walk | Same + **`git push`** when dirty tree committed |
| `commit-only-skip-before-deploy` | Approve, commit, skip Before deploy | Implementation approved · **`git commit`** when dirty · documented skip (note under §7 or **`## Follow-ups`**) · **no** deploy-walk |
| `more-changes` | More implementation changes first | Return to [Spawned implementation lane](#spawned-implementation-lane) step 5 |
| `defer` | Defer ship chain | Keep `continuationStatus: active`; no commit, no inline walk |
| `more-details` | More details for option _ | Elaborate; re-ask combined modal |

Option ids **`commit-only`** and **`commit-push`** satisfy rule **6** git layer **on the pick turn** — run commit/push on the **developer's response turn** only, not in the same assistant turn as the modal.

**When Before deploy is already satisfied** (empty, *None*, or all `[x]`) but the tree is dirty, use **one** modal (`modalTitle`: *Coding session — approve and commit*) with **`commit-only`** / **`commit-push`** / **`more-changes`** / **`defer`** / **`more-details`** — then [Auto-spawn pre-pr-review](#auto-spawn-pre-pr-review) on the **next** turn when preconditions pass, not inline deploy-walk.

**When the tree is clean** and Before-deploy items remain, use **one** modal with:

| Option id | Label (brief) |
|-----------|---------------|
| `spawn-before-deploy-walk` | Approve, run Before deploy walk (already committed) |
| `skip-before-deploy` | Skip Before deploy (executive override) |
| `more-changes` | More implementation changes first |
| `defer` | Defer ship chain |
| `more-details` | More details for option _ |

**Free-form** (no plan anchor): combined approve + commit modal only — **`commit-only`** / **`commit-push`** / **`more-changes`** / **`defer`** / **`more-details`** — then [Auto-spawn pre-pr-review](#auto-spawn-pre-pr-review) on the **next** turn when preconditions pass.

Do **not** use option labels that say *run pre-pr-review* or *create PR* here — those steps auto-advance after cut-point **Act** and Before deploy (see [Auto-spawn pre-pr-review](#auto-spawn-pre-pr-review)).

### Spawned lane — ship cut-point sentinel (binding)

**In order to use the AskQuestion modal**, emit **`MC_PHASED_RESPONSE_V1`** (recap in `display.markdown`, options in `askQuestion`) — same option ids as the combined modal. Example shape (replace `<recap>` with diff summary + Before-deploy count):

```
MC_PHASED_RESPONSE_V1
{"version":1,"display":{"markdown":"<recap>"},"askQuestion":{"modalTitle":"Coding session — approve, commit, Before deploy","questions":[{"id":"ship-cut-point","prompt":"Approve implementation, commit if needed, and start Before deploy walk?","allowMultiple":false,"options":[{"id":"commit-only","label":"Approve, commit, run Before deploy walk"},{"id":"commit-push","label":"Approve, commit + push, run Before deploy walk"},{"id":"commit-only-skip-before-deploy","label":"Approve, commit, skip Before deploy"},{"id":"more-changes","label":"More implementation changes first"},{"id":"defer","label":"Defer ship chain"},{"id":"more-details","label":"More details for option _"}]}]}}
```

Omit **`commit-only-skip-before-deploy`** when Before deploy is already satisfied; omit commit options when the tree is clean and use `spawn-before-deploy-walk` instead.

### Pre-send self-check (ship cut-point)

Before ending a turn that opens [Ship cut-point gate](#ship-cut-point-gate-approve-commit-before-deploy):

1. First non-whitespace character is **`M`** of **`MC_PHASED_RESPONSE_V1`** (spawned lane — sentinel-first).
2. JSON includes **`version`: 1**, **`display.markdown`**, **`askQuestion.questions`** with ≥1 option (`id` + `label`) matching [Combined authorization](#combined-authorization) for this tree state.
3. Recap includes `git status --short` summary and Before-deploy §7 state when plan-anchored.
4. Message contains **no** prose-only *advisory* / *pick in chat* / *I'll wait* closing — if any check fails, fix before send.

### Act after ship cut-point pick

Run on the **developer's response turn** after a cut-point pick — **not** in the same assistant turn as the modal.

| Pick | Actions (in order) |
|------|---------------------|
| **`commit-only`** / **`commit-push`** (Before deploy unchecked) | 1. **`git commit`** if `git status --short` is non-empty · 2. Verify clean tree · 3. [Before deploy deploy-walk handoff](#before-deploy-deploy-walk-handoff) inline (no second modal) · 4. [Auto-spawn pre-pr-review](#auto-spawn-pre-pr-review) when Before deploy satisfied (same or next turn) |
| **`commit-only-skip-before-deploy`** | 1. **`git commit`** if dirty · 2. Append dated skip note under §7 or **`## Follow-ups`** · 3. [Auto-spawn pre-pr-review](#auto-spawn-pre-pr-review) |
| **`commit-only`** / **`commit-push`** (Before deploy satisfied or free-form) | 1. **`git commit`** if dirty · 2. Verify clean · 3. [Auto-spawn pre-pr-review](#auto-spawn-pre-pr-review) |
| **`spawn-before-deploy-walk`** | [Before deploy deploy-walk handoff](#before-deploy-deploy-walk-handoff) inline |
| **`skip-before-deploy`** | Dated skip note · [Auto-spawn pre-pr-review](#auto-spawn-pre-pr-review) |

If commit fails or tree stays dirty after commit, stop with `partial` — do not run inline **`deploy-walk`** or spawn **`pre-pr-review`**.

**Same user message** may authorize the combined path in prose (*approve, commit, and run Before deploy*) — treat as **`commit-only`** when Before deploy applies, per rule **20**.

## Commit execution (internal)

**Not a separate AskQuestion gate.** Runs only inside [Act after ship cut-point pick](#act-after-ship-cut-point-pick) when the pick id is **`commit-only`** or **`commit-push`**.

1. Skip **`git commit`** when `git status --short` is empty.
2. Use the commit message style from recent worktree history and plan scope.
3. **`commit-push`** also runs **`git push`** after a successful commit on the **same response turn**.
4. Verify `git status --short` is empty before inline deploy-walk or pre-PR authorization.

## Before deploy deploy-walk handoff

**Precondition:** `outputs.bootstrapStatus: success`. **Do not** run Before deploy **`deploy-walk`** inline while bootstrap is `pending` or `failed`.

Run from [Act after ship cut-point pick](#act-after-ship-cut-point-pick) when the cut-point pick authorizes inline walk (**`commit-only`**, **`commit-push`**, or **`spawn-before-deploy-walk`**) — **no second AskQuestion** for the walk on that path. **Do not** spawn **`pre-pr-review`** or run inline **`create-pr`** until this step completes or is skipped via **`commit-only-skip-before-deploy`** / **`skip-before-deploy`**.

When `targetPlanPath` resolves to a PR plan:

1. **Read** §7 **`### Before deploy`**. If empty, only *None — …*, or every item is `[x]`, note in one line and continue to [Auto-spawn pre-pr-review](#auto-spawn-pre-pr-review).
2. When any **`[ ]`** Before-deploy items remain, load `.sedea/centers/research-and-development/missions/plan-and-deliver/skills/deploy-walk/SKILL.md` and run it **inline on this lane** — **do not** emit **`AGENT_RUN_REQUEST_V1`** for **`deploy-walk`**.

**Inline context:**

| Inline context field | Value |
|----------------------|--------|
| `targetPlanPath` / `targetPlanSlug` | From coding-session state when plan-anchored |
| `worktreePath`, `worktreeName` | From worktree / git |
| `deployWalkScope` | `"before-deploy-only"` — walk only **`### Before deploy`** while `**Status:**` stays `drafted` |
| `ledgerParent` | From coding-session ledger when present |
| `upstreamSkill` | `"coding-session"` |

3. Follow **`deploy-walk`** procedure (including autonomous agent-executable pass for Before deploy). Merge **`## Completion (inline)`** into coding-session `outputs` (`beforeDeployStatus`, `deployStatus`, `shipPhase`, `rowStatus`, `remainingTasks`, …).
4. When `beforeDeployStatus` is `complete`, all Before-deploy boxes are `[x]` or explicitly skipped, continue to [Auto-spawn pre-pr-review](#auto-spawn-pre-pr-review) on the **next** turn (or same turn when the walk finishes without a pending manual step). If a **manual** step awaits developer input, keep `continuationStatus: "active"` on this lane and close with **AskQuestion** or **`MC_PHASED_RESPONSE_V1`** (step status + continue-walk / skip / more-details) — do not prose-only “resume via next message”; do not spawn **`pre-pr-review`** until Before deploy is satisfied or documented skip.
5. Do **not** wait for a child **`AGENT_RESULT_RESPONSE_V1`** — there is no **`deploy-walk`** child lane.

**Legacy / exceptional second modal:** use a separate **AskQuestion** for inline walk **only** when the developer returns mid-chain without a prior cut-point pick (for example after *more-changes* and a new review pass) and Before-deploy items remain — same options as [Combined authorization](#combined-authorization) Before-deploy rows (`spawn-before-deploy-walk`, `skip-before-deploy`, …). **Do not** use this when the combined cut-point modal already ran in the same review pass.

## Auto-spawn pre-pr-review

Run **after** commit + [Before deploy deploy-walk handoff](#before-deploy-deploy-walk-handoff) (or documented skip). **No authorization modal** — developer approval at [Ship cut-point gate](#ship-cut-point-gate-approve-commit-before-deploy) (approve + commit + Before deploy) is sufficient to spawn **`pre-pr-review`**.

**Auto-advance:** When [Pre-PR review handoff preconditions](#review-handoff-preconditions) all pass, proceed directly to [Pre-PR review handoff](#pre-pr-review-handoff) on the **next** turn — one-line recap in prose or prior turn output, then emit spawn. Do **not** open a separate *Coding session — pre-PR review* modal.

**Defer / more changes:** When the developer says *more changes*, *defer review*, or equivalent **before** spawn runs, stop auto-advance and route to [Spawned implementation lane](#spawned-implementation-lane) or keep `continuationStatus: active` with structured choice per rule **2** § *Default continuation options*.

**Forbidden:** treating ship cut-point approval as insufficient for spawn; opening the legacy pre-PR authorization modal when preconditions pass.

### Legacy pre-PR authorization modal (removed)

The former **Pre-PR review authorization** gate (`proceed-pre-pr-review`) is **obsolete**. Do not emit its sentinel or options unless mission completeness triage directs a temporary workaround.

## Pre-PR review handoff

This skill spawns **`pre-pr-review`** only **after** [Ship chain after implementation](#ship-chain-after-implementation-coding-session-lane) cut-point **Act**, [Before deploy deploy-walk handoff](#before-deploy-deploy-walk-handoff) (or skip), and [Auto-spawn pre-pr-review](#auto-spawn-pre-pr-review) preconditions pass — **without** a separate authorization modal.

### Review handoff preconditions

Before spawning **`pre-pr-review`**:

1. [Ship cut-point gate](#ship-cut-point-gate-approve-commit-before-deploy) completed — developer approved implementation via combined modal or equivalent; [Commit execution](#commit-execution-internal) completed when the tree was dirty — at least one commit in the worktree when there were changes to land.
2. [Before deploy deploy-walk handoff](#before-deploy-deploy-walk-handoff) completed or skipped — **do not** spawn **`pre-pr-review`** while unchecked Before-deploy items remain without inline walk/skip documentation.
3. `git status --short` in the worktree is empty. Uncommitted edits are invisible to the committed review diff, so do not spawn the reviewer while dirty.
4. `git log --oneline <baseRef>..HEAD` shows at least one commit.
5. `git diff <baseRef>...HEAD` is non-empty.
6. For plan-anchored runs, `plan-state.mjs resolve --cwd "<worktreePath>"` or supplied inputs identify the PR plan.

If any precondition fails, stop with `partial`, keep `continuationStatus: "active"`, and report the missing ship-chain step. Do not silently commit, push, skip Before deploy, or spawn review.

### Review handoff inputs

Compile the **`pre-pr-review`** child inputs:

- `anchorType`: `plan` when a PR plan path is known, otherwise `free-form`.
- `targetPlanPath` / `targetPlanSlug`: required for `plan`.
- `worktreePath`
- `worktreeName`
- `baseRef`
- `projectRules`: absolute worktree `.cursor/rules/*.mdc` paths curated the same way as the implementation prompt.
- `diffSummary`: commits/files/line counts from the committed diff.
- `ledgerParent`
- `upstreamSkill: "coding-session"`

Spawn `.sedea/centers/research-and-development/missions/plan-and-deliver/skills/pre-pr-review/SKILL.md`, announce that **coding-session** is waiting for the pre-PR review result, and close the turn with structured choice per [`.sedea/centers/sedea/rules/2_ask-question-instructions.mdc`](.sedea/centers/sedea/rules/2_ask-question-instructions.mdc) § **Turn completion invariant**. Do not open a PR before the reviewer returns `recommendation: "go"`.

### Review result aggregation

When Mission Control delivers the **`pre-pr-review`** result:

1. Copy `blockers`, `flags`, `proposedFollowUps`, `followUpsAppended`, `codingAgentHandback`, `requiresDeveloperApproval`, `remainingTasks`, `activeLanes`, and `openLedgerEntries` into the coding-session result. Record `outputs.prePrReviewRecommendation` from the child.
2. Compute **`hasProposedFollowUps`** — **true** when **`outputs.proposedFollowUps`** from the child is a non-empty array with at least one non-whitespace string entry; **false** when the field is missing, null, not an array, or `[]`. Do **not** treat whitespace-only strings as follow-ups.
3. Compute **`actionablePrePrFindings`** — **true** when **any** of:
 - `recommendation` is `no-go`
 - `blockers` is non-empty
 - `flags` is non-empty
 - `codingAgentHandback` includes a non-empty **Must** or **Should** group (ignore **Defer**-only handback and items tagged **`[G §7 After deploy — post-merge]`**)
4. When **`actionablePrePrFindings`** is true, **immediately recommend** addressing pre-PR review findings before PR creation or another review pass — include one explicit sentence in the recap (for example: *Pre-PR review found issues; fix the relevant items on this lane before opening a PR.*). Do not deliver a findings-only recap without that recommendation.
5. **If `actionablePrePrFindings`** — open [Review feedback approval gate](#review-feedback-approval-gate) on **this lane** in the **same session** **before** [Inline create-pr (auto on clean go)](#inline-create-pr-auto-on-clean-go) or [Create-PR handoff after go](#create-pr-handoff-after-go), **even when** `recommendation` is `go`. Do **not** jump to inline **`create-pr`** in the same turn as the reviewer result.
6. **If NOT `actionablePrePrFindings`** and `recommendation` is `go` **and NOT `hasProposedFollowUps`** — on the **next** turn after the reviewer result: one informational transcript line only (for example: *Pre-PR review go; no follow-ups — opening PR on this lane.*). Proceed to [Inline create-pr (auto on clean go)](#inline-create-pr-auto-on-clean-go) **without** a Create-PR or follow-up approval modal. Do not make **`pre-pr-review`** run inline **`create-pr`** in the reviewer-result turn. **Forbidden:** [Create-PR handoff after go](#create-pr-handoff-after-go); any modal listing **`approve-followups-create-pr`** or **`create-pr-no-followups`**; pausing for developer PR approval when `proposedFollowUps` is empty.
7. **If NOT `actionablePrePrFindings`** and `recommendation` is `go` **and `hasProposedFollowUps`** — open [Create-PR handoff after go](#create-pr-handoff-after-go) on the **next** turn so the developer may approve follow-up append before PR creation. Do **not** make **`pre-pr-review`** run inline **`create-pr`** in the reviewer-result turn.
8. If review failed, was aborted, or was abandoned, keep the ledger entry blocked until the developer retries, defers, or abandons the review.

### Review feedback approval gate

When **`actionablePrePrFindings`** is true (see [Review result aggregation](#review-result-aggregation)) — including **`recommendation: "go"`** with **`flags`** or **Must** / **Should** handback:

1. Present the review summary to the developer: `recommendation`, blockers, `Must`, `Should`, `flags`, and any proposed follow-ups for the PR plan. **Do not** surface **`Defer`** or post-merge **`### After deploy`** items — **`pre-pr-review`** omits them; drop any legacy **`[G §7 After deploy — post-merge]`** bullets if present in child outputs. **Recommend** fixing relevant findings before PR creation or re-review (same wording as [Review result aggregation](#review-result-aggregation) step 3).
2. Use **one** **AskQuestion** or **`MC_PHASED_RESPONSE_V1`** before making any code or plan edits (`modalTitle`: *Pre-PR review — address findings*). Required options **in this order** (omit rows marked *go-only* when `recommendation` is `no-go`):

| Option id | Label (brief) | Agent action |
|-----------|---------------|--------------|
| `fix-now-session` | Implement pre-PR review findings now (this session) | Continue on **this coding-session lane** in the attached worktree; implement reviewer `Must` items and any `Should` items the developer affirms before edits; keep `continuationStatus: "active"` |
| `apply-must` | Apply Must fixes only | Edit only blocker / `Must` items on this lane |
| `apply-must-should` | Apply Must + Should fixes | Edit blocker / `Must` and `Should` items on this lane |
| `proceed-create-pr` | Proceed to create PR (skip fixes for now) | *go-only* — on **next** turn, [Inline create-pr (auto on clean go)](#inline-create-pr-auto-on-clean-go); no code edits this pick |
| `revise-scope` | Revise review scope | Clarify or challenge findings before code edits |
| `defer` | Defer / abandon review fixes | Keep ledger blocked or mark the PR plan deferred/abandoned per developer choice |
| `more-details` | More details for option _ | Elaborate; ask again |

3. Do not interpret the reviewer handback itself as approval. No source edits, plan edits, commits, pushes, PR creation, or new review spawn occur until the developer chooses an approval option (except **`proceed-create-pr`**, which only authorizes the Create-PR gate on the **next** turn).
4. **`fix-now-session`**, **`apply-must`**, and **`apply-must-should`** authorize implementation on **this lane** only — not a detached session prompt or a new Mission Control dispatch for coding.
5. After approved fixes are implemented, run [Spawned implementation lane](#spawned-implementation-lane) step **7** (pre-review verification) when applicable, then restart from [Ship cut-point gate](#ship-cut-point-gate-approve-commit-before-deploy) (combined approve + commit + Before deploy when applicable, then **`pre-pr-review`**). The loop repeats until **`pre-pr-review`** returns `go` with no **`actionablePrePrFindings`**, or the developer chooses **`proceed-create-pr`** or **`defer`**.
6. Track each loop pass in outputs as `reviewLoopCount` and keep `continuationStatus: "active"` while approval, fixes, implementation review, commit, Before deploy, re-review, or pending Create-PR after **`proceed-create-pr`** remains open.

### Spawned lane — review feedback sentinel (binding)

**In order to use the AskQuestion modal** after **`pre-pr-review`** returns with **`actionablePrePrFindings`**, emit **`MC_PHASED_RESPONSE_V1`** — recap in `display.markdown`, options in `askQuestion`. **Line 1 must be the sentinel** (see [Spawned lane — sentinel-first (binding)](#spawned-lane--sentinel-first-binding)). Example (replace `<recap>`; omit `proceed-create-pr` when `recommendation` is `no-go`):

```
MC_PHASED_RESPONSE_V1
{"version":1,"display":{"markdown":"<recap>"},"askQuestion":{"modalTitle":"Pre-PR review — address findings","questions":[{"id":"pre-pr-feedback","prompt":"How should we handle pre-PR review findings?","allowMultiple":false,"options":[{"id":"fix-now-session","label":"Implement pre-PR review findings now (this session)"},{"id":"apply-must","label":"Apply Must fixes only"},{"id":"apply-must-should","label":"Apply Must + Should fixes"},{"id":"proceed-create-pr","label":"Proceed to create PR (skip fixes for now)"},{"id":"revise-scope","label":"Revise review scope"},{"id":"defer","label":"Defer / abandon review fixes"},{"id":"more-details","label":"More details for option _"}]}]}}
```

### Act after review feedback pick

Run on the **developer's response turn** — **not** in the same assistant turn as the feedback modal.

| Pick | Actions |
|------|---------|
| **`fix-now-session`**, **`apply-must`**, **`apply-must-should`** | Implement approved scope on this lane; then [Ship cut-point gate](#ship-cut-point-gate-approve-commit-before-deploy) when fixes are ready |
| **`proceed-create-pr`** | Run [Inline create-pr (auto on clean go)](#inline-create-pr-auto-on-clean-go) on **next** turn when **`hasProposedFollowUps`** is **false**; otherwise [Create-PR handoff after go](#create-pr-handoff-after-go) (requires prior `recommendation: "go"`) |
| **`revise-scope`**, **`more-details`** | Clarify; re-open feedback gate |
| **`defer`** | Stop ship chain per developer choice |

### User requests to open a PR (before inline `create-pr`)

When the developer says *open a PR*, *create a pull request*, or similar **before** **`pre-pr-review`** returns **`go`** and the **Create-PR handoff after go** gate:

1. **Do not** call `gh pr create` or surface GitHub `pull/new/` URLs (rule **20** § *PR creation* and § *User phrases → required handoff*) except when executing inline **`create-pr`** after that gate approves.
2. State the required order: implementation → [Ship cut-point gate](#ship-cut-point-gate-approve-commit-before-deploy) (approve, commit, Before deploy **`deploy-walk`** inline when applicable) → auto-spawn **`pre-pr-review`** → on clean **`go`**, [Inline create-pr (auto on clean go)](#inline-create-pr-auto-on-clean-go).
3. If they only pushed and expect a PR, confirm whether **`pre-pr-review`** has run; first-push cadence does **not** skip the inline **`create-pr`** procedure.

### Inline create-pr (auto on clean go)

When **`pre-pr-review`** returns `recommendation: "go"` **and** **`actionablePrePrFindings`** is **false** **and NOT `hasProposedFollowUps`** — **no Create-PR modal**. On the **next** turn after the reviewer result (not the same turn as the result):

1. One-line recap: reviewer **`go`**, no Must/Should/blockers, no proposed follow-ups, optional non-actionable flags noted.
2. Verify the worktree is pushed or pushable per **efficient-pr-shipping**.
3. Load `.sedea/centers/research-and-development/missions/plan-and-deliver/skills/create-pr/SKILL.md` and run it **inline on this lane** — **do not** emit **`AGENT_RUN_REQUEST_V1`** for **`create-pr`**.

**Default authorization:** clean **`go`** authorizes PR creation **without appending proposed follow-ups** (`followUpsAppended: false`). Do **not** open [Create-PR handoff after go](#create-pr-handoff-after-go) on this path.

Construct inline context:

| Inline context field | Value |
|----------------------|--------|
| `targetPlanPath` / `targetPlanSlug` | From coding-session state when plan-anchored |
| `worktreePath`, `worktreeName`, `baseRef`, `repoUrl` | From worktree / git |
| `diffSummary` | Commits, files, changes since base |
| `prePrReviewRecommendation` | `"go"` |
| `prePrReviewFlags`, `followUpsAppended` | From **`pre-pr-review`** outputs; **`followUpsAppended: false`** unless developer later chooses follow-up append at [Create-PR handoff after go](#create-pr-handoff-after-go) |
| `ledgerParent` | From coding-session ledger when present |
| `upstreamSkill` | `"coding-session"` |

4. Follow **`create-pr`** gates and procedure (`gh pr create` when authorized). Merge **`## Completion (inline)`** into coding-session `outputs`.
5. **Same assistant turn** — when step **4** completes with a PR URL/number, open [Post-create-pr handoff gate](#post-create-pr-handoff-gate) before **StreamFinal** (unchanged).

**Forbidden:** opening *Coding session — create PR* modal on clean **`go`** without proposed follow-ups; opening this section when **`hasProposedFollowUps`** is **false**; treating reviewer **`go`** alone as follow-up append consent; any **`approve-followups-create-pr`** option when `proposedFollowUps` is empty.

### Create-PR handoff after go

**Exceptional path only** — use when **`hasProposedFollowUps`** is **true** (and **`actionablePrePrFindings`** is **false**), when **`actionablePrePrFindings`** was **true** and the developer chose **`proceed-create-pr`** **and** **`hasProposedFollowUps`**, or when the developer explicitly requests follow-up append / defer / revise before PR creation after a clean **`go`**. When **`hasProposedFollowUps`** is **false**, use [Inline create-pr (auto on clean go)](#inline-create-pr-auto-on-clean-go) instead — **do not** open this gate.

1. Verify the worktree is pushed or pushable per **efficient-pr-shipping**.
2. Present the reviewer `go` summary, flags, and proposed follow-ups in **`display.markdown`**, then use **one** **AskQuestion** or **`MC_PHASED_RESPONSE_V1`** (`modalTitle`: *Coding session — create PR*) — on spawned lanes, **sentinel-first**. Required **`options`**:

| Option id | Label (brief) |
|-----------|---------------|
| `approve-followups-create-pr` | Approve follow-ups and create PR now |
| `create-pr-no-followups` | Create PR without appending proposed follow-ups |
| `revise-first` | Revise code or plan first |
| `defer-pr` | Defer PR creation |
| `abandon` | Abandon this implementation |
| `more-details` | More details for option _ |

3. Only **`approve-followups-create-pr`** authorizes appending proposed follow-ups before PR creation. **`create-pr-no-followups`** authorizes only PR creation.

### Spawned lane — create-PR handoff sentinel (binding)

Use **only** for [Create-PR handoff after go](#create-pr-handoff-after-go) — **not** for clean **`go`** auto path.

```
MC_PHASED_RESPONSE_V1
{"version":1,"display":{"markdown":"<recap>"},"askQuestion":{"modalTitle":"Coding session — create PR","questions":[{"id":"create-pr-gate","prompt":"Create the pull request now?","allowMultiple":false,"options":[{"id":"approve-followups-create-pr","label":"Approve follow-ups and create PR now"},{"id":"create-pr-no-followups","label":"Create PR without appending proposed follow-ups"},{"id":"revise-first","label":"Revise code or plan first"},{"id":"defer-pr","label":"Defer PR creation"},{"id":"abandon","label":"Abandon this implementation"},{"id":"more-details","label":"More details for option _"}]}]}}
```

4. On the **developer's response turn** (not the same turn as the modal), load **`create-pr/SKILL.md`** and run inline per steps in [Inline create-pr (auto on clean go)](#inline-create-pr-auto-on-clean-go) with `followUpsAppended` per pick.
5. **Same assistant turn** as inline **`create-pr`** completion — open [Post-create-pr handoff gate](#post-create-pr-handoff-gate) before **StreamFinal**.

### Post-create-pr handoff gate

When inline **`create-pr`** completes with a PR URL/number (or the developer returns to this lane with a confirmed open PR from the same ship chain):

1. Recap: `prUrl`, `prNumber`, `prState`, `reviewState`, and §7 **`### After deploy`** unchecked count when plan-anchored.
2. Use **one** **AskQuestion** or **`MC_PHASED_RESPONSE_V1`** (`modalTitle`: *Coding session — PR opened, next step*). Required options **in this order**:

| Option id | Label (brief) | Agent action |
|-----------|---------------|--------------|
| `start-pr-review` | Start inline PR review | Run [Inline PR review after PR creation](#inline-pr-review-after-pr-creation) on **next** turn |
| `check-pr-status` | Check PR merge status | Refresh `prState` / `mergeSha` / `mergedAt` via `gh` or repo tooling; re-open this gate |
| `spawn-after-deploy-walk` | PR merged — start After deploy deploy-walk | On **next** turn, [After deploy deploy-walk handoff](#after-deploy-deploy-walk-handoff) when merge confirmed |
| `defer-ship` | Defer next ship step | Keep `continuationStatus: active`; no spawn |
| `more-details` | More details for option _ | Elaborate; ask again |

3. Do **not** run inline **`pr-review`**, inline **`deploy-walk`**, or **`plan-reconcile`** in the same assistant turn as this modal.
4. Re-open this gate after **`check-pr-status`** unless the developer picks a forward path on that response turn.

### Spawned lane — post-create-pr sentinel (binding)

**In order to use the AskQuestion modal** after inline **`create-pr`** completes, emit **`MC_PHASED_RESPONSE_V1`** — recap in `display.markdown`, options in `askQuestion`. **Line 1 must be the sentinel.**

```
MC_PHASED_RESPONSE_V1
{"version":1,"display":{"markdown":"<recap>"},"askQuestion":{"modalTitle":"Coding session — PR opened, next step","questions":[{"id":"post-create-pr","prompt":"What should we do next with this PR?","allowMultiple":false,"options":[{"id":"start-pr-review","label":"Start inline PR review"},{"id":"check-pr-status","label":"Check PR merge status"},{"id":"spawn-after-deploy-walk","label":"PR merged — start After deploy deploy-walk"},{"id":"defer-ship","label":"Defer next ship step"},{"id":"more-details","label":"More details for option _"}]}]}}
```

### Act after post-create-pr pick

Run on the **developer's response turn** — **not** in the same assistant turn as the modal.

| Pick | Actions |
|------|---------|
| **`start-pr-review`** | [Inline PR review after PR creation](#inline-pr-review-after-pr-creation) |
| **`check-pr-status`** | Query PR state; update `outputs`; when **`merged`**, run [Post-merge workspace cleanup](#post-merge-workspace-cleanup) **auto-apply** on **next** turn |
| **`spawn-after-deploy-walk`** | When merge confirmed: [Post-merge workspace cleanup](#post-merge-workspace-cleanup) **auto-apply** on **next** turn, then [After deploy deploy-walk handoff](#after-deploy-deploy-walk-handoff) after cleanup completes or is skipped |
| **`defer-ship`** | Stop with recap; `continuationStatus: active` |
| **`more-details`** | Clarify; re-open gate |

### Post-merge workspace cleanup

Run on this lane **after** `prState: merged` **and before** [After deploy deploy-walk handoff](#after-deploy-deploy-walk-handoff). Normative entry: [Act after post-create-pr pick](#act-after-post-create-pr-pick) (**`spawn-after-deploy-walk`** or **`check-pr-status`** → merged), explicit developer message (*pull main*, *remove worktree*, *post-merge cleanup*), or **auto-apply** when merge is confirmed and ownership preconditions pass.

**Auto-apply (default):** When `prState: merged` and § *Worktree removal ownership* preconditions hold for **this pass’s** **`WORKTREE_ROOT`**, run detect → dry-run recap (one line or **`display.markdown`** when long) → MCP detach → **`--apply`** on the **next** turn **without** a cleanup authorization modal. Label the action in recap as *Run post-merge worktree cleanup now* when reporting to the developer.

**Modal required only when:**

| Condition | Action |
|-----------|--------|
| **`detect-stale-workspaces`** returns no candidates and sidecar already clear | One line; proceed to After deploy — no modal |
| **`--apply`** partial failure, rebuild failure, or ownership unclear | Structured choice: retry **`--apply`**, skip cleanup, more-details |
| Developer explicitly says *defer cleanup* or *skip cleanup* | Honor defer; optional modal if ambiguous |

**Legacy cleanup authorization modal** (`cleanup-apply` / `cleanup-skip` pick before **`--apply`**) is **obsolete** when auto-apply preconditions pass. Do not block After deploy on a cleanup modal when detect + ownership authorize apply.

**Worktree removal ownership (binding).** **Do not remove worktrees you do not own.** Apply **`sedea_remove_worktree_folder`**, **`git worktree remove`**, and any cleanup script **`--apply`** **only** to **this pass’s** **`WORKTREE_ROOT`** when **all** preconditions in [`.sedea/centers/sedea/rules/0_hosting-repo.mdc`](.sedea/centers/sedea/rules/0_hosting-repo.mdc) § *Worktree ownership* and [`.sedea/centers/research-and-development/rules/20_efficient-pr-shipping.mdc`](.sedea/centers/research-and-development/rules/20_efficient-pr-shipping.mdc) § *Worktree removal ownership (binding)* hold. **`WORKTREE_ROOT`** must be the exact path from **this pass’s** **`git worktree add`** — **not** inferred from **`git worktree list`**, sidecar **`worktrees[]`**, or stale entries alone. **Forbidden:** repo-wide **`git worktree prune`**; removing paths another developer, dispatch, lane, or session created; **`git worktree remove`** on **`HOSTING_ROOT`**; hand-deleting directories while still mounted. **`git worktree list` is read-only** when ownership is unclear — stop and use structured choice. **`post-reconcile-workspace-cleanup.mjs --apply`** removes **only** candidates from **`detect-stale-workspaces`** for **this plan/session** after the gate above.

**Purpose:** Sync **`HOSTING_ROOT`** with **`origin/main`**, detach/remove **this session’s** worktree from Mission Control and git, drop the local worktree name ref when eligible, and rebuild native extensions on **`HOSTING_ROOT`** so the developer can **Developer: Reload Window** before After deploy verification — not from a stale worktree with **`main` behind**.

**Worktree name ref cleanup gate (normative):** drop the local worktree name ref when **`post-reconcile-workspace-cleanup.mjs`** reports eligible — **not** merge-base / “safe to delete” heuristics.

1. **Primary:** sidecar **`prs[]`** linked and every PR **`MERGED`** (`detect-stale-workspaces` **`mergedPr: true`**) **and** **`git ls-remote --heads origin <worktree-name>`** is empty after merge.
2. **Worktree-linked fallback:** stale worktree candidate (session worktree name from **`git worktree add -b`**) when sidecar **`prs[]`** is empty (**`mergedPr: null`**) **and** remote head is gone **and** the worktree name is not checked out on another worktree — reason **`worktree_linked_remote_head_gone`**. Covers merged PRs never recorded in **`prs[]`** (worktree path is the linkage).

When **`mergedPr: false`** (open PRs in sidecar) or remote head still exists, **skip worktree name ref cleanup**, report one line, still remove worktree and pull **`main`** when authorized. Dry-run JSON includes **`remoteHeadGone`** per candidate when detect ran. When dry-run reports **`skippedWorktreeNames`** with reason **`linked_prs_not_merged`** but **`remoteHeadGone: true`**, add one line: verify sidecar **`prs[].repo`** matches **`$(basename "$HOSTING_ROOT")`** (not the worktree directory name) — legacy mis-keys block **`mergedPr`** until corrected or scripts apply the hosting-repo fallback.

**Preconditions:** `prState: merged`; plan anchor resolves when applicable.

**Detect (read-only):**

```bash
cd "$HOSTING_ROOT"
OPS_ID="<operationsUserId from Mission Control warm-up or sedea_get_current_user>"

node .sedea/centers/research-and-development/missions/plan-and-deliver/scripts/plan-state.mjs \
 --operations-user-id "$OPS_ID" detect-stale-workspaces --slug <slug> --json
```

When **`candidates`** is empty and sidecar **`worktrees[]`** / session focus is already clear, set `outputs.postMergeCleanupStatus: skipped_no_stale` and proceed to [After deploy deploy-walk handoff](#after-deploy-deploy-walk-handoff) on the **next** turn.

**Dry-run git plan:**

```bash
node .sedea/centers/research-and-development/missions/plan-and-deliver/scripts/post-reconcile-workspace-cleanup.mjs \
 --operations-user-id "$OPS_ID" --dry-run [--slug <slug>]
```

Present **`actions`**, **`skippedWorktreeNames`** (when worktree name ref cleanup waits on remote), and **`mergedPr`** per candidate in recap when dry-run output is non-trivial. **When auto-apply applies**, proceed to **`--apply`** on the **next** turn without waiting for **`cleanup-apply`** selection.

**Exceptional modal** (ownership unclear, partial prior apply, or developer requested defer):

| Option id (illustrative) | Label (brief) |
|--------------------------|---------------|
| `cleanup-apply` | Run post-merge cleanup now |
| `cleanup-skip` | Skip cleanup — proceed to After deploy walk |
| `cleanup-dry-run-only` | Dry-run only — no git mutations |
| `more-details` | More details for option _ |

Only **`cleanup-apply`** authorizes **`--apply`** when this exceptional modal opens.

**Apply (after MCP detach):**

Confirm **all** ownership preconditions (§ *Worktree removal ownership (binding)* above) for **each** candidate before step 1. **Forbidden:** **`--apply`** on paths not from **`detect-stale-workspaces`** for **this session**; repo-wide cleanup.

1. For **each** candidate **`worktreePath`**, invoke MCP **`sedea_remove_worktree_folder`** with `{ "path": "<absolute-worktree-root>" }` **before** git removal (rule **20** § *Detach merged worktrees*).
2. Run:

```bash
node .sedea/centers/research-and-development/missions/plan-and-deliver/scripts/post-reconcile-workspace-cleanup.mjs \
 --operations-user-id "$OPS_ID" --apply [--slug <slug>]
```

The script pulls **`origin/main`** on **`HOSTING_ROOT`**, then runs **`./scripts/rebuild-native-extensions.sh`** when that script exists and is executable (same path the cleanup script invokes on **`--apply`**).

3. Merge script JSON into `outputs` (`cleanedWorktrees`, `deletedWorktreeNames`, `skippedWorktreeNames`, `mainPullStatus`, `nativeExtensionsRebuildStatus`, `postMergeCleanupStatus: success` \| `partial`).
4. When **`nativeExtensionsRebuildStatus`** is **`success`**, tell the developer in one line: native extensions rebuilt on **`HOSTING_ROOT`** — use **Developer: Reload Window** before After deploy verification. When rebuild **`failed`**, report stderr and keep `postMergeCleanupStatus: partial`; offer retry or **`cleanup-skip`** before After deploy.
5. On **next** turn, continue to [After deploy deploy-walk handoff](#after-deploy-deploy-walk-handoff). Do **not** run inline **`deploy-walk`** (After deploy) in the same assistant turn as cleanup **`--apply`**.

**Spawned lane — post-merge cleanup sentinel (binding):** Use **`MC_PHASED_RESPONSE_V1`** **only** for the exceptional modal above — **not** on the default auto-apply path.

### After deploy deploy-walk handoff

Run from [Act after post-create-pr pick](#act-after-post-create-pr-pick) when the developer chooses **`spawn-after-deploy-walk`**, when **`prState`** is **`merged`** and they explicitly say the PR merged / *start After deploy* **after** [Post-merge workspace cleanup](#post-merge-workspace-cleanup) completed or was skipped, or when cleanup reported **`skipped_no_stale`**.

**Precondition:** [Post-merge workspace cleanup](#post-merge-workspace-cleanup) **`--apply`** succeeded, developer chose **`cleanup-skip`**, or detect reported no stale worktrees — **not** while session worktree remains and **`HOSTING_ROOT`** is still behind **`origin/main`** unless developer explicitly skipped cleanup.

1. **Verify merge** — `prState` must be **`merged`** (from coding-session `outputs` after inline **`create-pr`** or a fresh `gh pr view` / repo check). If still **`open`**, report one line and re-open [Post-create-pr handoff gate](#post-create-pr-handoff-gate) — do **not** run inline **`deploy-walk`** for After deploy only.
2. When plan-anchored, **read** §7. If **`### After deploy`** is empty or all `[x]` and capstone is done, note in one line and offer [Post-create-pr handoff gate](#post-create-pr-handoff-gate) or [Plan-reconcile handoff (inline)](#plan-reconcile-handoff-inline) defer — no inline walk.
3. Load `.sedea/centers/research-and-development/missions/plan-and-deliver/skills/deploy-walk/SKILL.md` and run it **inline on this lane** — **post-merge full walk** (do **not** set `deployWalkScope: before-deploy-only`). **Do not** emit **`AGENT_RUN_REQUEST_V1`** for **`deploy-walk`**.

**Inline context:**

| Inline context field | Value |
|----------------------|--------|
| `targetPlanPath` / `targetPlanSlug` | From coding-session state when plan-anchored |
| `worktreePath`, `worktreeName` | From worktree / git |
| `prUrl`, `prNumber`, `mergeSha`, `mergedAt`, `repoUrl` | From coding-session `outputs` after inline **`create-pr`** when present |
| `ledgerParent` | From coding-session ledger when present |
| `upstreamSkill` | `"coding-session"` |

4. Follow **`deploy-walk`** procedure (post-merge §7, lifecycle to `done`). Merge **`## Completion (inline)`** into coding-session `outputs`. Do **not** run inline **`plan-reconcile`** in the same turn.
5. When the walk completes with **`deployStatus: done`** and **`deployTodoStatus: done`** (developer confirmed the last After-deploy §7 step, or the walk reported no remaining manual steps), continue to [Post–After deploy remainder authorization](#post-after-deploy-remainder-authorization) on the **next** turn when [remainder inventory](#post-after-deploy-remainder-inventory) is non-empty. When inventory is empty, re-open [Post-create-pr handoff gate](#post-create-pr-handoff-gate) or offer [Plan-reconcile handoff (inline)](#plan-reconcile-handoff-inline) defer per developer message. Do **not** wait for a child **`AGENT_RESULT_RESPONSE_V1`** — there is no **`deploy-walk`** child lane.

### Post–After deploy remainder authorization

Run on the **spawned coding-session lane** after [After deploy deploy-walk handoff](#after-deploy-deploy-walk-handoff) completes with **`deployStatus: done`** and **`deployTodoStatus: done`**, and the developer has approved the last After-deploy §7 step (or the walk left no pending manual steps).

**Purpose:** After After deploy verification, offer **one** confirmation to run all remaining tail ship work, while preserving **per-step** approval when the developer has concerns.

**Preconditions (all required):**

1. `outputs.bootstrapStatus: success` (or bootstrap not required on this run).
2. `prState` is **`merged`**.
3. [Post-merge workspace cleanup](#post-merge-workspace-cleanup) **`--apply`** succeeded, developer chose **`cleanup-skip`**, or detect reported **`skipped_no_stale`**.
4. [After deploy deploy-walk handoff](#after-deploy-deploy-walk-handoff) finished with **`deployStatus: done`** and **`deployTodoStatus: done`**.
5. [Remainder inventory](#post-after-deploy-remainder-inventory) is **non-empty**.

When any precondition fails, report one line what is missing; route to the missing step — do **not** open this gate.

**Forbidden:** Starting inline **`plan-reconcile`**, setting **`prShipComplete`**, or closing the ship row when inventory is non-empty **without** passing this gate (or explicit developer message that names **`plan-reconcile`** / defer).

#### Remainder inventory

Build a numbered list for the recap and modal (omit steps already satisfied):

| Order | Step id | When included |
|-------|---------|----------------|
| 1 | `plan-reconcile` | Plan-anchored, `prState: merged`, deploy verification **done**, `targetPlanPath` or `targetPlanSlug` resolves, and reconcile not already completed on this lane |
| 2 | `archive-followups` | Subsumed by **`plan-reconcile`** when step 1 runs — do **not** list separately unless reconcile is skipped and archive/follow-ups still pending |
| 3 | `pr-ship-complete` | After reconcile (or when reconcile skipped with documented reason) — set **`outputs.prShipComplete: true`**, **`outputs.shipPhase: done`**, **`outputs.rowStatus: closed`** |

When only step 3 remains (reconcile already done), list step 3 alone. When nothing remains, **skip** this gate — use [Post-create-pr handoff gate](#post-create-pr-handoff-gate) or [Plan-reconcile handoff (inline)](#plan-reconcile-handoff-inline) defer as today.

#### Batch authorization gate

**Stop** before executing any inventory step. Use **one** **AskQuestion** or **`MC_PHASED_RESPONSE_V1`** (`modalTitle`: *Coding session — confirm remaining ship work*). Recap must list the inventory verbatim.

| Option id | Label (brief) | Authorizes on **next** turn |
|-----------|---------------|-----------------------------|
| `confirm-all-remaining` | Confirm — perform all listed steps | Run every inventory step in order without further modals (except hard stops / errors) |
| `next-step-only` | Approve next step only — [first step name] | Run inventory step 1 only |
| `defer-tail` | Defer remaining ship work | Keep `continuationStatus: active`; no tail steps |
| `more-details` | More details for option _ | Elaborate; re-open this gate |

**Do not** run inventory steps in the same assistant turn as this modal.

**Spawned lane — remainder batch sentinel (binding):** **In order to use the AskQuestion modal**, emit **`MC_PHASED_RESPONSE_V1`** with the same option ids. Put the numbered inventory in **`display.markdown`**.

#### Act after remainder batch pick

Run on the **developer's response turn** — **not** in the same assistant turn as the modal.

| Pick | Actions |
|------|---------|
| **`confirm-all-remaining`** | For each inventory step in order: execute per [Execute remainder step](#execute-remainder-step); stop on hard failure with `partial` outputs |
| **`next-step-only`** | [Execute remainder step](#execute-remainder-step) for step 1 only; then [Per-step continuation gate](#per-step-continuation-gate) |
| **`defer-tail`** | Recap deferred steps; keep `continuationStatus: active` |
| **`more-details`** | Clarify; re-open batch gate |

#### Execute remainder step

| Step id | Procedure |
|---------|-----------|
| `plan-reconcile` | [Plan-reconcile handoff (inline)](#plan-reconcile-handoff-inline) — preconditions in that section must still hold |
| `pr-ship-complete` | When reconcile completed (or skipped with dated note under **`## Follow-ups`** or §7): set **`outputs.prShipComplete: true`**, **`outputs.shipPhase: done`**, **`outputs.rowStatus: closed`**; include **`parentPlanPath`**, **`parentPlanSlug`**, **`parentIndex`** from spawn **`inputs`** when present |

#### Per-step continuation gate

After **`next-step-only`** completes one inventory step, open **one** modal (`modalTitle`: *Coding session — next remaining ship step*) on the **next** turn.

1. Recap what finished and list **remaining** inventory (renumber from 1).
2. Options:

| Option id | Label (brief) |
|-----------|---------------|
| `approve-next-only` | Approve next step only — [next step name] |
| `confirm-all-subsequent` | Confirm all remaining steps — [list steps 2…N] |
| `defer-tail` | Defer remaining ship work |
| `more-details` | More details for option _ |

| Pick | Actions |
|------|---------|
| **`approve-next-only`** | Run the next single inventory step; repeat this gate until inventory empty |
| **`confirm-all-subsequent`** | Run all remaining steps in order without further modals (except hard stops) |
| **`defer-tail`** | Stop; keep `continuationStatus: active` |

**Spawned lane — per-step sentinel (binding):** **`MC_PHASED_RESPONSE_V1`** with the same option ids; remaining steps listed in **`display.markdown`**.

### Plan-reconcile handoff (inline)

Run when the developer explicitly says *plan reconcile* / *reconcile plans* on this lane, or authorizes reconcile after After deploy / deploy verification **done**.

**Preconditions (plan-anchored ship chain):**

1. `prState` is **`merged`** (from coding-session `outputs` or fresh `gh pr view`).
2. `deployStatus` is **`done`** and `deployTodoStatus` is **`done`** (from inline **`deploy-walk`** outputs when applicable).
3. `targetPlanPath` or `targetPlanSlug` resolves.

If any precondition fails, report one line what is missing; offer defer or complete the missing ship step first. **Do not** archive before merge and deploy verification are complete.

**Broad reconcile** (developer phrase without a single PR plan anchor): may run when **`operationsUserId`** is valid — skip ship-chain preconditions but still use **AskQuestion** before mutations per **`plan-reconcile/SKILL.md`** **Flow**.

1. Load `.sedea/centers/research-and-development/missions/plan-and-deliver/skills/plan-reconcile/SKILL.md` and run it **inline on this lane** — **do not** emit **`AGENT_RUN_REQUEST_V1`** for **`plan-reconcile`**.

**Inline context:**

| Inline context field | Value |
|----------------------|--------|
| `targetPlanPath` / `targetPlanSlug` | From coding-session state when plan-anchored |
| `prUrl`, `prNumber`, `prState` | From coding-session `outputs` when present |
| `deployStatus`, `deployTodoStatus` | From inline **`deploy-walk`** outputs when present |
| `ledgerParent` | From coding-session ledger when present |
| `upstreamSkill` | `"coding-session"` |

2. Follow **`plan-reconcile`** **Flow** (reconcile dry-run, archive candidates, follow-ups triage, §5 workspace cleanup when approved). Merge **`## Completion (inline)`** into coding-session `outputs` (`archivedSlugs`, `shipPhase`, `rowStatus`, `cleanedWorktrees`, `mainPullStatus`, …).
3. Do **not** wait for a child **`AGENT_RESULT_RESPONSE_V1`** — there is no **`plan-reconcile`** child lane.
4. When reconcile completes with target archived and §5 **`mainPullStatus`** is **`success`** or **`skipped`** (workspace already on main): set **`outputs.prShipComplete: true`**, **`outputs.shipPhase: done`**, **`outputs.rowStatus: closed`**. Include **`parentPlanPath`**, **`parentPlanSlug`**, **`parentIndex`** from spawn **`inputs`** when present.
5. When reconcile completes or pauses on flagged/postponed follow-ups, keep `continuationStatus: "active"` until the developer defers or the target plan row is **`closed`**.

### Inline PR review after PR creation

Run only after the developer chooses **`start-pr-review`** at [Post-create-pr handoff gate](#post-create-pr-handoff-gate) (or an explicit *triage PR comments* message on this lane with a known `prUrl`). Do **not** auto-start immediately when inline **`create-pr`** completes unless the developer already picked **`start-pr-review`** on the prior turn.

Inline `pr-review` inputs come from coding-session state:

- `prUrl` / `prNumber`
- `repoUrl`
- `worktreePath`
- `worktreeName`
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
- `outputs.worktrees` (array of `{repo, path, worktreeName, attached}`)
- `outputs.bootstrapStatus` — `success` \| `failed` \| `pending` \| omitted when bootstrap not run
- `outputs.bootstrapLaneCorrelationId` — spawn UUID while `bootstrapStatus: pending` on the **spawned-bootstrap exception** path only; omit on inline bootstrap
- `outputs.bootstrapFailureReason` — when `bootstrapStatus: failed`
- `outputs.bootstrapSkipFlags` — optional array of `--skip-*` flags used with developer attestation
- `outputs.worktreeName`
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
- `outputs.mainPullStatus` — from [Post-merge workspace cleanup](#post-merge-workspace-cleanup) or inline **`plan-reconcile`** §5 when applicable
- `outputs.postMergeCleanupStatus` — `success` \| `partial` \| `skipped` \| `skipped_no_stale` when post-merge cleanup ran or was bypassed
- `outputs.nativeExtensionsRebuildStatus` — `success` \| `failed` \| `skipped_not_present` \| `dry-run` from post-merge cleanup (after **`mainPullStatus`** success)
- `outputs.skippedWorktreeNames` — worktree name refs not dropped (PR merged but remote head still exists)
- `outputs.archivedSlugs` — when inline **`plan-reconcile`** archived the target
- `outputs.prShipComplete` — `true` only when **`plan-reconcile`** finished with target archived, PR **merged**, and **`mainPullStatus`** is **`success`** or **`skipped`**
- `outputs.parentPlanPath`, `outputs.parentPlanSlug`, `outputs.parentIndex` — echo spawn **`inputs`** when **`pr-plan`** (or upstream) supplied them; required on terminal lines that set **`prShipComplete: true`**
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
- `active` when approved review fixes, a new implementation review pass, or re-review remains.
- `active` when PR review comments, developer approval, fixes, commit/push, or GitHub reconciliation remain.
- `active` when PR merge, deploy-walk, deploy checklist, or deploy capstone todo remains.
- `active` when worktrees exist but Mission Control attach or prompt emission still needs repair.
- `terminal` only for **prompt-only** runs when worktree/prompt setup is complete and no implementation is tracked on this dispatch, or when explicitly abandoned with no active work.
- `partial` status with `continuationStatus: "active"` when readiness, repo selection, dirty tree, base ref, sidecar write, MCP attach, or **worktree bootstrap** blocks setup (`bootstrapStatus: failed`; cap `shipPhase` at `worktree`).

Do not propose dispatch resolution from this skill; the Squad Leader closes the ledger after coding, review, PR, and deploy verification report terminal status.

## §8 host sync (detached lanes)

This skill usually runs **off** the **plan and deliver** leader lane. Mission Control host sync delivers §8 updates to the Squad Leader when this lane emits terminal or **re-emitted** **`AGENT_RESULT_RESPONSE_V1`** with required **`outputs`**. **Forbidden:** nudging manual **Ship recap** on the leader dispatch.

| Milestone in this skill | `shipPhase` | Required `outputs` |
|-------------------------|-------------|-------------------|
| Worktrees attached; setup complete (`implementationMode: prompt-only` or pre-code) | `worktree` | `targetPlanPath`, `shipPhase`, `rowStatus`, `worktrees`, `developerApprovedImplementation: true`, `remainingTasks` |
| Spawned lane implementing or review loop in progress | `implementing` | `targetPlanPath`, `shipPhase`, `rowStatus`, `implementationMode: spawned-lane`, `prePrReviewRecommendation`, `prReviewStatus` |
| Pre-PR **go** | `pre-pr-review` | `targetPlanPath`, `shipPhase`, `rowStatus`, `prePrReviewRecommendation: go` |
| PR opened | `pr-open` | `targetPlanPath`, `shipPhase`, `rowStatus`, `prUrl`, `prNumber` |
| Post-merge cleanup | `post-merge-cleanup` | `targetPlanPath`, `shipPhase`, `rowStatus`, `mainPullStatus`, `nativeExtensionsRebuildStatus`, `cleanedWorktrees`, `postMergeCleanupStatus` |
| PR comment triage complete | `pr-review` | `targetPlanPath`, `shipPhase`, `rowStatus`, `prReviewStatus`, `githubReconciliationStatus` |
| Deploy walk finished | `deploy-walk` | `targetPlanPath`, `shipPhase`, `rowStatus`, `deployStatus`, `deployTodoStatus` |
| Reconcile / archive done | `done` or `reconcile` | `targetPlanPath`, `shipPhase`, `rowStatus`, `remainingTasks` (empty), `prShipComplete` when archived + main pulled |

Set `rowStatus: blocked` when `prePrReviewRecommendation` is not **go**, review blockers remain, or `remainingTasks` is non-empty with no forward path.

## Parent lane notification (spawned child)

When this skill runs as a **spawned** child (typical path: **`pr-plan`** §5d → **`coding-session`**), Mission Control delivers your terminal **`AGENT_RESULT_RESPONSE_V1`** to the **invoking parent lane** as **`Mission Control: agent-result-response delivered.`**

**After inline `plan-reconcile`** with ship-complete (see **Plan-reconcile handoff** step 4):

1. Set **`outputs.prShipComplete: true`**, **`outputs.shipPhase: done`**, **`outputs.rowStatus: closed`**, **`outputs.mainPullStatus`**, **`outputs.archivedSlugs`**.
2. Include **`parentPlanPath`**, **`parentPlanSlug`**, **`parentIndex`** from spawn **`inputs`** so **`pr-breakdown`** / **`phase-planner`** can mark the correct **`### PR list`** row and offer **`expand-eligible`**.
3. Emit terminal **`AGENT_RESULT_RESPONSE_V1`** (or **re-emit updated** after follow-up on this lane). The **parent** merges per **`../README.md`** § *Upstream ship-complete notification*. Host sync updates Squad Leader §8 from this terminal — **forbidden:** manual **Ship recap** on the leader dispatch.
4. Keep **`continuationStatus: terminal`** on this lane when the PR row is fully closed unless the developer explicitly continues on this lane for follow-up work.

## Mission Control section 8 sync (required terminal `outputs`)

On **every** terminal `AGENT_RESULT_RESPONSE_V1` (including follow-up re-emits), `outputs` **must** include:

| Field | Rule |
|-------|------|
| `targetPlanPath` | Absolute PR plan `.plan.md` path — **required**; host skips ledger sync without it |
| `shipPhase` | Pick the milestone this terminal reports (`worktree`, `implementing`, `pre-pr-review`, `pr-open`, `pr-review`, `deploy-walk`, `done`, `reconcile`, etc.) |
| `rowStatus` | `open` while work continues; `closed` only when that PR plan is fully done in this worktree; `blocked` when pre-PR no-go, review blockers, or deploy/reconcile gates block forward progress |
| `prUrl` / `prNumber` | When `shipPhase` is `pr-open` or later |
| `remainingTasks` | When `rowStatus` is not `closed` |
| `blockedReason` | When `rowStatus` is `blocked` |
| `prShipComplete` | `true` when reconcile archived target and main pulled — **required** for parent depth-first unlock |
| `parentPlanPath`, `parentPlanSlug`, `parentIndex` | When spawned from **`pr-plan`** — **required** when `prShipComplete: true` |
| `mainPullStatus`, `archivedSlugs` | When reconcile ran |

Also populate **## Implementation handoff result** domain fields (`developerApprovedImplementation`, `deployStatus`, `prReviewStatus`, etc.). Mission Control writes `ship-ledger.v1.json` and injects the host-sync message on the Squad Leader lane. **Parent planning lanes** use **`prShipComplete`** from this terminal per **`../README.md`** § *Upstream ship-complete notification*. **Forbidden:** manual **Ship recap** on the leader dispatch.

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
- **Pre-review rules** — When plan **§5** or scope calls for hosting-repo prep before developer review, include every **`.cursor/rules/*.mdc`** path that prescribes pre-review verification so the worker runs them before [Ship cut-point gate](#ship-cut-point-gate-approve-commit-before-deploy) (commands stay in those files — see **40_maintain-rules.mdc**).

### Phase 1 — Warm-up (before the task)

R&D **center** rules (`10_`–`40_`, all `alwaysApply: true`) load on every dispatch via Mission Control. This warm-up block is for **hosting-repo** `.cursor/rules/*.mdc` paths under **Project rules** — list explicit `Read` steps for those only.

**Four vs five steps:** If Phase 2 links a **`.plan.md`** (absolute path), use **five** steps and include **Plan file + sidecar** (step 5). Otherwise use **four** steps (omit step 5).

Phrase a hard gate, e.g. `Warm-up first — do not read the task body below --- until every step above is done and acknowledged`.

1. **Workspace readiness** — **Read** the worktree **`README`** and **`CONTRIBUTING`** when present. For **readiness or pre-task checks**, follow **only** what those files say, what the **plan** explicitly links for setup, and what **`.cursor/rules/*.mdc`** files prescribe **when they describe pre-work or environment gates** (do not invent extra checks). If nothing prescribes a check, one line **Readiness: no checks in README / CONTRIBUTING / cited rules** — continue. If a prescribed check fails, **stop** and ask the user.
2. **Verify worktree name:** `git branch --show-current` (worktree name ref) matches the expected **worktree name**.
3. **Process handback** — the **developer** continues via **AskQuestion** (per **30_planning-target-resolution** when a pick is required) or a separate mission dispatch per **development-process**. Name next moves with protocol branches (**`plan-reconcile`**, **`pre-pr-review`**, **`pr-review`**, rule **20** § *Commit and push cadence*).
4. **Load project rules:** `Read` every path under **Project rules**; acknowledge before continuing.
5. **Plan file + sidecar** *(plan-anchored only)*: Plans live under **`.sedea/operations/.../plans/`**; runtime fields (`worktrees`, `prs`, `session`, `parent`, **`status`**, **`archived`**, todos via scripts) follow the **`.sedea/operations/`** plan union and **`plan-state.mjs`** contracts per **`.sedea/centers/sedea/rules/8_plan-board-contract.mdc`**. Flip todo **`status`** only through **`plan-state.mjs`** subcommands (`set-todo-status`, `todo-start`, `todo-done`); flip plan lifecycle dot via **`set-plan-status`** or archive/reconcile paths — do not hand-edit `.state.yaml` except to repair a bad state. After substantive progress on a scoped todo, update status so the Plan Board stays accurate. PR linkage after push follows **20_efficient-pr-shipping** and **`plan-state.mjs upsert-pr`**.

### Phase 2 — Task

Include:

- Which PR to implement (scope, behaviour, files).
- **Plan link:** absolute path to the `.plan.md` (e.g. `@/…/.sedea/operations/…/plans/<slug>.plan.md`). When present, the emitter must have used the **five-step** warm-up.
- **Follow-ups** — per **development-process** *Coding session* / *Feedback collection*: maintain **`## Follow-ups`** on the PR plan; append bullets for out-of-scope ideas with optional `(target: …)` hints.
- **Review cadence** — after implementation, one [Ship cut-point gate](#ship-cut-point-gate-approve-commit-before-deploy) modal (approve + commit + Before deploy **`deploy-walk`** inline when §7 has unchecked items), then **`pre-pr-review`**, then **`create-pr`**; no commit before cut-point approval; coordinate **`pr-review`** and rule **20** § *Review before commit* / *Commit and push cadence*.
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

Stop after implementation; run the **ship chain** ([Ship cut-point gate](#ship-cut-point-gate-approve-commit-before-deploy) → Before deploy **`deploy-walk`** when applicable → **`pre-pr-review`**) per **development-process** — **no commit** before cut-point approval.
```

## Completion (spawned)

Required `outputs` per **## Implementation handoff result**, **Mission Control section 8 sync**, and the bubble-up table (include **`pr-review`** inline fields when that flow ran). Re-emit an **updated** terminal result after user-requested follow-up on this lane (same `correlationId`). Do not emit **`MC_DISPATCH_RESOLVED_V1`** from this skill.

### Host protocol line (required)

Emit **exactly one** line on its own: `AGENT_RESULT_RESPONSE_V1` immediately followed by a single JSON object on the **same** line. Required keys: `version` (1), `correlationId` (from the spawn request), `status`, `summary`, `outputs`, `errors` (use `[]` when none). Populate `outputs` from **Implementation handoff result** **and** include `targetPlanPath`, `shipPhase`, and `rowStatus` on every terminal line. The emitted line must be **valid JSON** (no `{...}` placeholders in the actual output). See **`.sedea/centers/sedea/skills/README.md`** § *Spawned terminal line*.

Stop after the terminal line. Do not emit another `AGENT_RUN_REQUEST_V1` or run the next protocol step in the same turn (see **`../README.md`** § *Terminal stop (normative)*).

## Completion (inline)

Report the fields below in prose to the invoker on the **same lane**. Do **not** emit `AGENT_RUN_REQUEST_V1`, `AGENT_RESULT_RESPONSE_V1`, or `MC_DISPATCH_RESOLVED_V1`. Do **not** add a **Host protocol line** under this section (see **`.sedea/centers/sedea/rules/4_mission.mdc`** § *Inline completion* and **`.sedea/centers/sedea/skills/README.md`** § *Completion (inline)*).

**plan and deliver** normally spawns this skill on a **child lane** — default **spawned implementation lane**, not prompt-only. If run inline, use the same `outputs` semantics as **## Implementation handoff result** and **`## Completion (spawned)`** in prose only (merge **`pr-review`** inline fields when that sub-flow ran).
