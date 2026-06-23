---
name: worktree-bootstrap
description: >-
 **Deprecated (read-only).** Normative bootstrap is center **`worktree-setup.sh`**
 on **`coding-session`** (fast bootstrap inside setup; map hint **`bootstrapStatus`**).
 This skill remains for in-flight dispatch drain and **exception-only** inline retry
 when setup failed — not spawn-by-default. Does not commit, spawn deploy-walk, or run
 the ship chain. Does not implement product code on open PRs, or edit plan files unless
 the spawner requests a skip attestation path.
designation:
  allowed: Exception-only bootstrap retry when center worktree-setup failed; attested skip flags
  forbidden: Product implementation; ship chain; default-path setup substitution
inputs:
  worktreePath:
    type: string
    description: Absolute path to the git worktree root (WORKTREE_ROOT).
    required: true
  hostingRoot:
    type: string
    description: Absolute path to the primary hosting clone (HOSTING_ROOT) — parent of .sedea/ on disk; must contain scripts/bootstrap-worktree-dev.sh when dot-sedea selects a script bootstrap mode.
    required: true
  targetPlanPath:
    type: string
    description: Absolute or workspace-relative PR plan path when plan-anchored.
    required: false
  targetPlanSlug:
    type: string
    description: PR plan slug when plan-anchored.
    required: false
  worktreeName:
    type: string
    description: Worktree name (`-b` on `git worktree add`) in the worktree.
    required: false
  bootstrapSkipFlags:
    type: array
    description: >-
      Optional --skip-* flags only when dot-sedea and the hosting bootstrap script
      document attested partial setup on the parent lane (ignored on repos whose
      script accepts but does not honor skip flags).
    required: false
    default: []
  ledgerParent:
    type: string
    description: Ledger parent slug/path copied from coding-session.
    required: false
  upstreamSkill:
    type: string
    description: Skill that spawned this lane — usually coding-session.
    required: false
laneRules:
  - ".sedea/centers/sedea/rules/2_ask-question-instructions.mdc"
  - ".sedea/centers/research-and-development/rules/20_efficient-pr-shipping.mdc"
  - ".sedea/centers/research-and-development/missions/plan-and-deliver/skills/worktree-bootstrap/SKILL.md"
  - ".sedea/centers/research-and-development/missions/plan-and-deliver/skills/README.md"
warmUpRules:
  - ".sedea/centers/research-and-development/missions/plan-and-deliver/plan.mdc"
  - ".sedea/centers/research-and-development/missions/plan-and-deliver/skills/README.md"
  - ".sedea/centers/research-and-development/rules/20_efficient-pr-shipping.mdc"
  - ".cursor/rules/dot-sedea.mdc"
---

# Worktree bootstrap

> **Deprecated (read-only):** Normative bootstrap is **`.sedea/centers/sedea/scripts/worktree-setup.sh`** on the **`coding-session`** lane — see [`coding-session/SKILL.md`](../coding-session/SKILL.md) § *Center worktree scripts (binding)* and § *Worktree bootstrap (mandatory)*. This skill file stays on disk until [drain criteria](../README.md#worktree-bootstrap-skill-drain-gate) pass; do **not** spawn by default.

## Warm-up manifest (spawned)

Per [`.sedea/centers/sedea/docs/lane-manifest-contract.md`](.sedea/centers/sedea/docs/lane-manifest-contract.md) and **`../README.md`** § *Default warm-up*. Host merge: `effectiveWarmUp = dedupe(bootstrapRules → laneRules → skillWarmUp)`. **Exception-only** inline retry on **`coding-session`** when center setup failed; manifest applies when spawned or warm-up replay. **No `alwaysApply` frontmatter flip.**

### `bootstrapRules` — host-resolved (R&D layer)

| Path | Purpose |
|------|---------|
| `.sedea/centers/research-and-development/rules/bootstrap.mdc` | Sole R&D `alwaysApply: true` bootstrap (≤10 KB); host merges when `centerSlug === research-and-development` |

### `skillWarmUp` — frontmatter `warmUpRules`

| Path | Purpose |
|------|---------|
| `.sedea/centers/research-and-development/missions/plan-and-deliver/plan.mdc` | Plan sidecar, worktree session |
| `.sedea/centers/research-and-development/missions/plan-and-deliver/skills/README.md` | Spawn contracts, inline vs spawned |
| `.sedea/centers/research-and-development/rules/20_efficient-pr-shipping.mdc` | Bootstrap profiles, hosting cwd |
| `.cursor/rules/dot-sedea.mdc` | Worktree bootstrap mode (hosting overlay) |

### `laneRules` — frontmatter `laneRules`

| Path | Purpose |
|------|---------|
| `.sedea/centers/sedea/rules/2_ask-question-instructions.mdc` | Structured choice on bootstrap retry |
| `.sedea/centers/research-and-development/rules/20_efficient-pr-shipping.mdc` | Ship lane context |
| `.sedea/centers/research-and-development/missions/plan-and-deliver/skills/worktree-bootstrap/SKILL.md` | This skill procedure |
| `.sedea/centers/research-and-development/missions/plan-and-deliver/skills/README.md` | Spawn preflight |

This skill prepares a fresh **`WORKTREE_ROOT`** after Mission Control attach. **Read dot-sedea first** — [`.cursor/rules/dot-sedea.mdc`](.cursor/rules/dot-sedea.mdc) § *Worktree bootstrap mode* and § *Fast bootstrap verification checklist* on the active hosting repo, then follow [`.sedea/centers/research-and-development/rules/20_efficient-pr-shipping.mdc`](.sedea/centers/research-and-development/rules/20_efficient-pr-shipping.mdc) § *Bootstrap profiles*.

| dot-sedea mode | What this skill runs |
|----------------|----------------------|
| **`script-bootstrap`** | `./scripts/bootstrap-worktree-dev.sh "$WORKTREE_ROOT"` from **primary** **`HOSTING_ROOT`** — linear phases per that repo's **`--help`** (orchestrator repos) |
| **`full`** | Bootstrap script, **full overlay** profile when dot-sedea § *Worktree bootstrap mode* names **`full`** |
| **`extensions-only-link`** | Bootstrap script, **linked-build overlay** profile per dot-sedea § *Worktree bootstrap mode* |
| **`submodule-init`** | `git submodule update --init --recursive` under **`WORKTREE_ROOT`** when no bootstrap script applies |

Full compile, linked primary-clone build artifacts, and add-on sync per dot-sedea apply **only** on **`full`** / linked-build overlay profiles — not on every script repo.

**Normative invocation (superseded):** **`coding-session`** maps **`bootstrapStatus`** from center **`worktree-setup.sh`** on the default path — **do not** invoke this skill after successful setup. **Exception-only:** **`coding-session`** may read this skill **inline** when setup failed and the developer attests retry (see [`coding-session/SKILL.md`](../coding-session/SKILL.md) § *Worktree bootstrap (inline mandatory)*). **Forbidden:** spawn (`AGENT_RUN_REQUEST_V1`) for this skill on the default path.

Running bootstrap is **not** developer approval for worktrees — layer 2 **`developerApprovedImplementation`** stays on the parent **`coding-session`** lane.

## Prerequisites (parent **`coding-session`** lane)

This skill **does not** create worktrees or attach them to Sedea. The parent lane must finish first (see [`coding-session/SKILL.md`](../coding-session/SKILL.md) § *Hard rules — git worktree vs workbench attach (binding)* and § *Generic flow (single repo)*):

1. **Center setup** — parent ran **`.sedea/centers/sedea/scripts/worktree-setup.sh`** from **`HOSTING_ROOT`**; worktree exists at **`worktreePath`**. **Forbidden on parent before retry:** **`sedea_add_worktree_folder`** before setup exits **0**, or inline **`git worktree add`** on the default path when the center script exists.
2. **`sedea_add_worktree_folder` only** — worktree is a workspace root in Mission Control when setup JSON **`nextAction`** is **`attach-required`**. **Forbidden:** editor **Add Folder to Workspace** or skipping MCP attach.

Then invoke **`worktree-bootstrap`** **inline** only when center setup failed and the developer attests retry — with **`worktreePath`** and **`hostingRoot`**. If **`worktreePath`** is missing or MCP attach failed, stop — do **not** substitute setup steps on this lane (see **Forbidden** in step 2 below).

## Structured choice (Mission Control)

This skill does not own approval modals. When the script fails and a retry path needs a developer pick, use **AskQuestion**, **`MC_PHASED_RESPONSE_V1`** per **`.sedea/centers/sedea/rules/2_ask-question-instructions.mdc`** and **`../README.md`** § *Recap, structured choice, act*.

## Step 1 — Validate inputs and resolve mode

Required:

- `worktreePath` — absolute worktree directory (exists, is a linked git worktree).
- `hostingRoot` — absolute **primary** hosting clone path the parent lane supplies (must contain **`scripts/bootstrap-worktree-dev.sh`** when a script mode applies).

1. Read **`.cursor/rules/dot-sedea.mdc`** § *Worktree bootstrap mode* when present on the hosting repo.
2. Set `outputs.bootstrapMode` to the dot-sedea mode: `script-bootstrap` | `full` | `extensions-only-link` | `submodule-init`.
3. When dot-sedea is absent and **`./scripts/bootstrap-worktree-dev.sh`** exists on **`hostingRoot`**, default `outputs.bootstrapMode` to **`full`** (script overlay per rule **20**).
4. When the mode requires the bootstrap script and the file is absent at **`hostingRoot`**, stop with `failure` and `outputs.bootstrapStatus: failed`, `outputs.bootstrapFailureReason` naming the missing script path.
5. When the mode is **`submodule-init`** and no script exists, proceed to step 2 — do not fail solely for a missing script.

**Note:** **`WORKTREE_ROOT`** may not contain the bootstrap script on disk; **`HOSTING_ROOT`** is the primary clone cwd for script invocation.

## Step 2 — Run bootstrap

| `outputs.bootstrapMode` | Command (from **`HOSTING_ROOT`** unless noted) |
|-------------------------|-----------------------------------------------|
| **`script-bootstrap`** | `./scripts/bootstrap-worktree-dev.sh "<worktreePath>"` — append `bootstrapSkipFlags` only when dot-sedea documents honored skip flags |
| **`full`** | `./scripts/bootstrap-worktree-dev.sh "<worktreePath>"` + attested `bootstrapSkipFlags` when applicable |
| **`extensions-only-link`** | `./scripts/bootstrap-worktree-dev.sh "<worktreePath>"` with linked-build flags per dot-sedea § *Worktree bootstrap mode* and that repo's script **`--help`** + attested `bootstrapSkipFlags` when applicable |
| **`submodule-init`** | `cd "<worktreePath>" && git submodule update --init --recursive` — seed empty `.sedea/centers/*` from **`hostingRoot`** when init leaves an empty tree (see dot-sedea) |

The bootstrap script is idempotent where the hosting repo documents idempotency — safe to re-run after partial failure.

**Script-bootstrap repos:** submodule init, operations seed, deps, configure, and docker (when applicable) are owned by that repo's script — see **`--help`**, not this skill.

**Forbidden on this lane:** `git worktree add` / `remove` / `prune`, `sedea_add_worktree_folder` / `sedea_remove_worktree_folder`, hosting-repo product edits, `gh pr create`, spawning other plan-and-deliver skills. **Worktree removal ownership:** bootstrap never removes worktrees — see rule **20** § *Worktree removal ownership (binding)* and [`.sedea/centers/sedea/rules/0_hosting-repo.mdc`](.sedea/centers/sedea/rules/0_hosting-repo.mdc) § *Worktree ownership*.

## Step 3 — Report outcome

| Outcome | `outputs.bootstrapStatus` | Terminal `status` |
|---------|---------------------------|-------------------|
| Script or submodule-init exit 0 | `success` | `success` |
| Script or submodule-init exit non-zero | `failed` | `partial` |
| No applicable mode / missing script when required | `failed` | `partial` |

Capture a short stderr/stdout tail in `outputs.bootstrapFailureReason` when `failed`.

Set `outputs.continuationOwner: "worktree-bootstrap-agent"`. Set `outputs.continuationStatus: terminal` on `success`; `active` on `partial` when retry remains.

## Spawned result contract

When spawned by **`coding-session`**, populate at least:

- `outputs.worktreePath`
- `outputs.hostingRoot`
- `outputs.targetPlanPath`, `outputs.targetPlanSlug` (echo when supplied)
- `outputs.worktreeName` (echo when supplied)
- `outputs.bootstrapStatus` — `success` | `failed`
- `outputs.bootstrapMode` — `script-bootstrap` | `full` | `extensions-only-link` | `submodule-init`
- `outputs.bootstrapFailureReason` — when failed
- `outputs.bootstrapSkipFlags` — array used, or `[]`
- `outputs.ledgerParent`, `outputs.upstreamSkill`
- `outputs.continuationOwner`, `outputs.continuationStatus`

## Mission Control section 8 sync (spawned terminal)

When `targetPlanPath` is set, include on every terminal **`AGENT_RESULT_RESPONSE_V1`**:

| Field | Rule |
|-------|------|
| `targetPlanPath` | Absolute PR plan path — **required** when plan-anchored |
| `shipPhase` | `worktree` |
| `rowStatus` | `open` while bootstrap failed or parent still blocked; `closed` only when parent has moved past worktree setup (parent owns final row closure) |

## Completion (spawned)

### Host protocol line (required)

Emit **exactly one** line: `AGENT_RESULT_RESPONSE_V1` immediately followed by valid JSON on the **same** line. Required keys: `version` (1), `correlationId` (from the spawn request), `status`, `summary`, `outputs`, `errors` (`[]` when none). Populate `outputs` from **Spawned result contract** and **Mission Control section 8 sync**. Re-emit an **updated** line after user-requested follow-up on this lane (same `correlationId`). See **`.sedea/centers/sedea/skills/README.md`** § *Spawned terminal line*.

Stop after the terminal line. Do not emit another `AGENT_RUN_REQUEST_V1` on this lane (see **`../README.md`** § *Terminal stop (normative)*).

## Completion (inline)

Report the same `outputs` semantics in prose to the invoker on the **same lane** (or populate `outputs` on **`coding-session`** terminal lines when this skill runs inline there). Do **not** emit `AGENT_RUN_REQUEST_V1`, `AGENT_RESULT_RESPONSE_V1`, or `MC_DISPATCH_RESOLVED_V1`. Do **not** add a **Host protocol line** under this section.

**Primary path:** **`coding-session`** invokes this skill inline after attach and blocks implementation until **`outputs.bootstrapStatus: success`**. See [`../coding-session/SKILL.md`](../coding-session/SKILL.md) § *Worktree bootstrap (inline mandatory)*.

Before **`coding-session`** continues past Generic flow step 4: one recap line with `bootstrapStatus`, `bootstrapMode`, exit code, and failure tail when failed.
