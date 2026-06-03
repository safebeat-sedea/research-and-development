---
name: worktree-bootstrap
description: >-
 Run scripts/bootstrap-worktree-dev.sh on a fresh git worktree after Mission
 Control attach. Normative path: **inline** on the **`coding-session`** lane — the parent
 waits for bootstrap success before any implementation. Spawned execution is an exception
 only when a protocol step explicitly requires a child lane. Does not commit, spawn
 deploy-walk, or run the ship chain — those wait for bootstrap success on the parent.
 Does not implement product code on open PRs, or edit plan files unless the spawner
 requests a skip attestation path.
inputs:
  worktreePath:
    type: string
    description: Absolute path to the git worktree root (WORKTREE_ROOT).
    required: true
  hostingRoot:
    type: string
    description: Absolute path to the hosting repo that contains scripts/bootstrap-worktree-dev.sh (HOSTING_ROOT).
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
      Optional --skip-* flags (for example --skip-electron) only when the developer
      attested partial setup on the parent lane before spawn.
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
warmUpRules:
  - ".sedea/centers/research-and-development/missions/plan-and-deliver/plan.mdc"
  - ".sedea/centers/research-and-development/missions/plan-and-deliver/skills/README.md"
  - ".sedea/centers/research-and-development/rules/20_efficient-pr-shipping.mdc"
  - ".cursor/rules/dot-sedea.mdc"
---

# Worktree bootstrap

This skill runs **`./scripts/bootstrap-worktree-dev.sh`** on **`WORKTREE_ROOT`** from **`HOSTING_ROOT`**. It prepares a fresh worktree: **`.sedea/` center submodules** (`git submodule update --init` for paths under `.sedea/` in `.gitmodules`, with primary-clone seed fallback when init leaves an empty tree), **`.sedea/operations`** copy from the primary clone, linked primary **vscode** build artifacts, native extension sync/rebuild, and smoke checks. It does **not** run full **vscode compile** or **electron smoke** on the default fast-bootstrap path.

**Normative invocation:** **`coding-session`** runs this skill **inline** on the same lane after worktree attach and **waits** for `outputs.bootstrapStatus: success` before implementation. Spawn (`AGENT_RUN_REQUEST_V1`) is **not** the default — use only when a protocol step explicitly requires a spawned bootstrap child; the parent must still wait for success before implementing.

Running bootstrap is **not** developer approval for worktrees — layer 2 **`developerApprovedImplementation`** stays on the parent **`coding-session`** lane.

## Prerequisites (parent **`coding-session`** lane)

This skill **does not** create worktrees or attach them to Sedea. The parent lane must finish first (see [`coding-session/SKILL.md`](../coding-session/SKILL.md) § *Hard rules — git worktree vs workbench attach (binding)*):

1. **`git worktree add` only** — filesystem worktree exists at **`worktreePath`**. **Forbidden on parent before bootstrap:** **`sedea_add_worktree_folder`** used **instead of** `git worktree add`.
2. **`sedea_add_worktree_folder` only** — worktree is a workspace root in Mission Control (unless the parent confirms attach already succeeded). **Forbidden on parent before bootstrap:** editor **Add Folder to Workspace** or skipping MCP attach because the directory exists on disk.

Then invoke **`worktree-bootstrap`** inline with **`worktreePath`** and **`hostingRoot`**. If **`worktreePath`** is missing or MCP attach failed, stop — do **not** substitute `git worktree add` or **`sedea_add_worktree_folder`** on this lane (see **Forbidden** in step 2 below).

## Structured choice (Mission Control)

This skill does not own approval modals. When the script fails and a retry path needs a developer pick, use **AskQuestion**, **`MC_PHASED_RESPONSE_V1`** per **`.sedea/centers/sedea/rules/2_ask-question-instructions.mdc`** and **`../README.md`** § *Recap, structured choice, act*.

## Step 1 — Validate inputs

Required:

- `worktreePath` — absolute worktree directory (exists, is a git worktree).
- `hostingRoot` — absolute hosting repo root containing `scripts/bootstrap-worktree-dev.sh`.

If either path is missing or the script is absent at `hostingRoot`, stop with `failure` and `outputs.bootstrapStatus: failed`, `outputs.bootstrapFailureReason` naming the gap.

## Step 2 — Run bootstrap

From **`HOSTING_ROOT`**:

```bash
./scripts/bootstrap-worktree-dev.sh "<absolute-worktree-path>" [optional --skip-* flags]
```

Append each entry in `bootstrapSkipFlags` only when the parent documented developer attestation. The script is idempotent — safe to re-run after partial failure.

**Submodule behavior (fast bootstrap default):** initializes every **`.sedea/`** path listed in **`.gitmodules`** (for example **`.sedea/centers/research-and-development/`**). If init leaves an empty center tree and the primary clone has a populated checkout, the script **seeds** that path from **`HOSTING_ROOT`**. Pass **`--skip-submodules`** only when the parent documented a manual seed (see **`.cursor/rules/dot-sedea.mdc`** § *Push before worktrees*).

**Forbidden on this lane:** `git worktree add` / `remove` / `prune`, `sedea_add_worktree_folder` / `sedea_remove_worktree_folder`, hosting-repo product edits, `gh pr create`, spawning other plan-and-deliver skills. **Worktree removal ownership:** bootstrap never removes worktrees — see rule **20** § *Worktree removal ownership (binding)* and [`.sedea/centers/sedea/rules/0_hosting-repo.mdc`](.sedea/centers/sedea/rules/0_hosting-repo.mdc) § *Worktree ownership*.

## Step 3 — Report outcome

| Outcome | `outputs.bootstrapStatus` | Terminal `status` |
|---------|---------------------------|-------------------|
| Script exit 0 | `success` | `success` |
| Script exit non-zero | `failed` | `partial` |
| Missing script | `failed` | `partial` |

Capture a short stderr/stdout tail in `outputs.bootstrapFailureReason` when `failed`.

Set `outputs.continuationOwner: "worktree-bootstrap-agent"`. Set `outputs.continuationStatus: terminal` on `success`; `active` on `partial` when retry remains.

## Spawned result contract

When spawned by **`coding-session`**, populate at least:

- `outputs.worktreePath`
- `outputs.hostingRoot`
- `outputs.targetPlanPath`, `outputs.targetPlanSlug` (echo when supplied)
- `outputs.worktreeName` (echo when supplied)
- `outputs.bootstrapStatus` — `success` | `failed`
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

Before **`coding-session`** continues past Generic flow step 4: one recap line with `bootstrapStatus`, script exit code, mode (full / extensions-only / extensions-only-link), and failure tail when failed.
