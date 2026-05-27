---
name: pre-pr-review
description: >-
  Pre-PR reviewer agent (fresh spawned lane): review a committed implementation
  diff against a PR plan or free-form scope, score plan/rules/quality categories,
  propose Code Review Follow-ups when plan-anchored, and report go/no-go before PR
  creation. Spawned by coding-session after the implementation cut point; coding-session
  obtains developer approval before any follow-up mutation.
inputs:
  anchorType:
    type: string
    description: Review anchor type, either plan or free-form.
    required: true
  targetPlanPath:
    type: string
    description: Absolute PR plan path when anchorType is plan.
    required: false
  targetPlanSlug:
    type: string
    description: PR plan slug when anchorType is plan.
    required: false
  worktreePath:
    type: string
    description: Absolute hosting repo worktree path to review.
    required: true
  branchName:
    type: string
    description: Branch being reviewed.
    required: true
  baseRef:
    type: string
    description: Remote base ref for the review diff, usually origin/main.
    required: true
  projectRules:
    type: array
    description: Absolute .cursor/rules/*.mdc paths to read before scoring.
    required: false
    default: []
  diffSummary:
    type: object
    description: Optional summary from coding-session, including commits, files, and line counts.
    required: false
  ledgerParent:
    type: string
    description: Ledger parent slug/path copied from the upstream implementation agent.
    required: false
  upstreamSkill:
    type: string
    description: Skill that spawned this reviewer, usually coding-session.
    required: false
warmUpRules:
  - ".sedea/centers/research-and-development/missions/plan-and-deliver/plan.mdc"
  - ".sedea/centers/research-and-development/missions/plan-and-deliver/skills/README.md"
  - ".sedea/centers/research-and-development/docs/development-process.md"
  - ".sedea/centers/research-and-development/rules/20_efficient-pr-shipping.mdc"
  - ".sedea/centers/research-and-development/rules/30_planning-target-resolution.mdc"
---

# Pre-PR Review

**Who runs this:** a fresh **pre-PR reviewer agent** lane spawned by **`coding-session`** after implementation reaches a committed cut point. The reviewer must have no carry-over from the coding agent that changed the branch.

This pass complements, and does not replace, the later GitHub-surface **reviewer agent**.

## Step 1 — Validate spawned inputs

Required inputs:

1. `anchorType`: `plan` or `free-form`.
2. `worktreePath`: absolute worktree path.
3. `branchName`: branch being reviewed.
4. `baseRef`: remote base ref, usually `origin/main`.

For `anchorType: "plan"`, `targetPlanPath` is required and must point to a per-PR plan. If the file is a Master Plan or Phase plan, stop with `failure`; this review requires the PR plan that owns the implementation scope.

If any required input is missing, stop with `failure`. Do not ask the developer to reconstruct a seed; the spawning `coding-session` agent owns input assembly.

## Step 2 — Fresh reviewer lane

Confirm this is a fresh reviewer lane. Do not reuse context from the coding agent that implemented the branch. If the lane already contains implementation edits or coding-agent tool history, stop with `aborted` and request a fresh `pre-pr-review` spawn.

## Step 3 — Load standards and rules

Read `.sedea/centers/research-and-development/docs/development-process.md` in full, or at minimum the per-PR template, strategy, cadence, and Pre-PR reviewer sections.

Read every path from `projectRules`. If a rule path is missing, report it as `partial` unless the rule is clearly irrelevant to the diff.

## Step 4 — Load anchor

- `plan`: read `targetPlanPath`. Verify per-PR template sections §§ 1–7 are present; § 8 and `## Follow-ups` are optional. Do not mutate §§ 1–8.
- `free-form`: no plan file; review the committed diff only.

## Step 5 — Read committed diff

From `worktreePath`, inspect:

```bash
git fetch origin
git diff --stat <baseRef>...HEAD
git log --oneline <baseRef>..HEAD
git diff <baseRef>...HEAD
git status --short
```

If `git status --short` is non-empty, continue against the committed diff but flag that local edits are not part of the reviewed cut point.

If there are zero commits ahead and no diff, stop with `failure`: there is nothing to review.

## Step 6 — Score categories

Verdict per row: `PASS`, `FLAG`, or `FAIL`. `FAIL` blocks PR creation or merge readiness.

### Plan anchor categories

| Cat | Focus |
| --- | --- |
| **A** | § 1 Single concern vs diff scope |
| **B** | § 2 Background clarity |
| **C** | § 3 Change scope vs diff |
| **D** | § 4 Reasoning quality |
| **E** | § 5 Repo rules impact |
| **F** | § 6 Tests to write |
| **G** | § 7 Deploy test plan |
| **H** | § 8 Caveats vs surprises |
| **I** | Repo-rule compliance |
| **J** | General code quality |

### Free-form categories

| Cat | Focus |
| --- | --- |
| **F1** | Single concern |
| **F2** | Repo-rule compliance |
| **F3** | General code quality |

## Step 7 — Proposed follow-ups

For `plan` anchor only: collect actionable `FLAG` items that are not blockers as **proposed** `## Follow-ups` for the PR plan. Do **not** mutate the plan file from this reviewer lane; the active **`coding-session`** agent must present these proposed follow-ups to the developer and receive explicit approval before appending them.

Rules:

1. One sentence per bullet.
2. Prefix with bracketed category tag, e.g. `[C § 3]`.
3. Add optional `(target: ...)` routing hints.
4. Do not append `FAIL` items; blockers stay in the report.
5. Return proposed follow-ups in `outputs.proposedFollowUps`; leave `outputs.followUpsAppended` empty unless the invocation context explicitly includes prior developer approval for this exact mutation.

For `free-form`, skip file writes.

## Step 8 — Report and result

Report:

1. Category table.
2. Blockers (`FAIL`).
3. Flags.
4. Recommendation: `go` only when there are no `FAIL` rows.
5. Coding-agent handback: what to fix next, with `Must`, `Should`, and `Defer` groups.
6. **Deploy test plan (§7):** when the developer reported manual §7 smoke during review, list which numbered **Before deploy** / **After deploy** steps they said passed — the coding agent should flip those lines in `targetPlanPath` only after the developer **confirms each step** in session (see **`coding-session`** § *Deploy test plan confirmations*). This reviewer skill does **not** append `[x]` without that per-step confirmation.

The handback is advisory until the developer approves the fix pass. Do not frame reviewer feedback as automatic authorization for **`coding-session`** to edit code. The coding agent must present the review result to the developer and wait for an explicit approval choice before applying `Must`, `Should`, or `Defer` items.

End with a child result containing:

- `outputs.anchorType`
- `outputs.targetPlanPath`
- `outputs.targetPlanSlug`
- `outputs.worktreePath`
- `outputs.branchName`
- `outputs.baseRef`
- `outputs.recommendation` (`go` | `no-go`)
- `outputs.blockers`
- `outputs.flags`
- `outputs.proposedFollowUps`
- `outputs.followUpsAppended`
- `outputs.codingAgentHandback`
- `outputs.requiresDeveloperApproval`
- `outputs.activeLanes`
- `outputs.openLedgerEntries`
- `outputs.remainingTasks`
- `outputs.continuationOwner: "pre-pr-review-agent"`
- `outputs.continuationStatus`

Set `continuationStatus`:

- `terminal` when recommendation is `go` and no blocking review work remains.
- `active` when blockers require a coding-session fix loop and developer approval is pending.
- `partial` status with `continuationStatus: "active"` when the review ran but missing rules, dirty uncommitted edits, or incomplete anchors make the result degraded.

Stop after the report. Do not run `git`, `gh`, source edits, commits, pushes, or PR creation.

## Squad Leader bubble-up (detached lanes)

Runs on a **detached** reviewer lane; the **plan and deliver** Squad Leader may not see this result. When the review finishes, ask the developer to post **Ship recap — plan and deliver** on the leader dispatch (**`../../plan.mdc`** §8).

| Outcome | `shipPhase` | `rowStatus` | Key `outputs` |
|---------|-------------|-------------|---------------|
| `recommendation: go` | `pre-pr-review` | `open` | `targetPlanPath`, `remainingTasks` |
| `no-go` / blockers | `pre-pr-review` | `blocked` | `targetPlanPath`, `blockers`, `blockedReason` in recap |

## Mission Control section 8 sync (required terminal `outputs`)

On **every** terminal `AGENT_RESULT_RESPONSE_V1` (including follow-up re-emits), `outputs` **must** include:

| Field | Rule |
|-------|------|
| `targetPlanPath` | Absolute PR plan `.plan.md` path — **required**; host skips ledger sync without it |
| `shipPhase` | From the bubble-up table row for this terminal (`pre-pr-review` typical) |
| `rowStatus` | `open` when `recommendation: go`; `blocked` when `no-go` or blockers remain |
| `remainingTasks` | When `rowStatus` is not `closed` |
| `blockedReason` | When `rowStatus` is `blocked` (summarize blockers) |

Mission Control writes `ship-ledger.v1.json` and may inject **Ship recap — plan and deliver** on the Squad Leader lane. Manual recap paste on the leader dispatch is still allowed.

## Completion (spawned)

Required `outputs` per **Step 8 — Report and result**, **Mission Control section 8 sync**, and the bubble-up table. Re-emit an **updated** terminal result after user-requested follow-up on this lane (same `correlationId`).

### Host protocol line (required)

Emit **exactly one** line on its own: `AGENT_RESULT_RESPONSE_V1` immediately followed by a single JSON object on the **same** line. Required keys: `version` (1), `correlationId` (from the spawn request), `status` (`success` | `partial` | `failure` | `aborted` | `abandoned`), `summary` (1–3 sentences), `outputs`, `errors` (use `[]` when none). Populate `outputs` from Step 8 **and** include `targetPlanPath`, `shipPhase`, and `rowStatus` on every terminal line. The emitted line must be **valid JSON** (no `{...}` placeholders in the actual output). See **`.sedea/centers/sedea/skills/README.md`** § *Spawned terminal line*.

Stop after the terminal line. Do not emit another `AGENT_RUN_REQUEST_V1` or run the next protocol step in the same turn (see **`../README.md`** § *Terminal stop (normative)*).

## Completion (inline)

Report the fields below in prose to the invoker on the **same lane**. Do **not** emit `AGENT_RUN_REQUEST_V1`, `AGENT_RESULT_RESPONSE_V1`, or `MC_DISPATCH_RESOLVED_V1`. Do **not** add a **Host protocol line** under this section (see **`.sedea/centers/sedea/rules/4_mission.mdc`** § *Inline completion* and **`.sedea/centers/sedea/skills/README.md`** § *Completion (inline)*).

Normally spawned from **`coding-session`** on a fresh reviewer lane. If run inline on the same lane, use the same `outputs` semantics as **Step 8 — Report and result** and **`## Completion (spawned)`** in prose only.
