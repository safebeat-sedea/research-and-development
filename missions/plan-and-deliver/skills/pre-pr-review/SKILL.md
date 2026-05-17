---
name: pre-pr-review
description: >-
  Pre-PR reviewer agent (fresh spawned lane): review a committed implementation
  diff against a PR plan or free-form scope, score plan/rules/quality categories,
  append Code Review Follow-ups when plan-anchored, and report go/no-go before PR
  creation. Spawned by coding-session after the implementation cut point.
timeoutMs: 1800000
warmUpRules:
  - ".sedea/centers/sedea-centers--development/rules/planning-target-resolution.mdc"
  - ".sedea/centers/sedea-centers--development/rules/efficient-pr-shipping.mdc"
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
    description: Absolute implementation worktree path to review.
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

Read `.sedea/centers/sedea-centers--development/docs/development-process.md` in full, or at minimum the per-PR template, strategy, cadence, and Pre-PR reviewer sections.

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

## Step 7 — Follow-ups

For `plan` anchor only: append actionable `FLAG` items that are not blockers to `## Follow-ups` in the PR plan.

Rules:

1. One sentence per bullet.
2. Prefix with bracketed category tag, e.g. `[C § 3]`.
3. Add optional `(target: ...)` routing hints.
4. Do not append `FAIL` items; blockers stay in the report.
5. Create `## Follow-ups` at EOF if missing.

For `free-form`, skip file writes.

## Step 8 — Report and result

Report:

1. Category table.
2. Blockers (`FAIL`).
3. Flags.
4. Recommendation: `go` only when there are no `FAIL` rows.
5. Coding-agent handback: what to fix next, with `Must`, `Should`, and `Defer` groups.

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

Stop after the report and terminal child result. Do not run `git`, `gh`, source edits, commits, pushes, or PR creation.
