---
name: create-pr
description: >-
  PR-creating agent: create or prepare a GitHub PR from a reviewed implementation
  branch using coding-session context, PR plan lineage, and pre-pr-review result.
inputs:
  targetPlanPath:
    type: string
    description: Absolute PR plan path, when plan-anchored.
    required: false
  targetPlanSlug:
    type: string
    description: PR plan slug, when plan-anchored.
    required: false
  worktreePath:
    type: string
    description: Absolute implementation worktree path.
    required: true
  branchName:
    type: string
    description: Branch to create the PR from.
    required: true
  baseRef:
    type: string
    description: Base ref for the PR, usually origin/main.
    required: true
  repoUrl:
    type: string
    description: Git remote URL for the repository.
    required: false
  diffSummary:
    type: object
    description: Summary of commits, files, and changes from coding-session.
    required: false
  prePrReviewRecommendation:
    type: string
    description: Recommendation from pre-pr-review. Must be go.
    required: true
  prePrReviewFlags:
    type: array
    description: Non-blocking flags from pre-pr-review.
    required: false
    default: []
  followUpsAppended:
    type: array
    description: Follow-up bullets appended to the PR plan by pre-pr-review.
    required: false
    default: []
  ledgerParent:
    type: string
    description: Ledger parent slug/path copied from coding-session.
    required: false
  upstreamSkill:
    type: string
    description: Skill that spawned this PR creation, usually coding-session.
    required: false
  autoDeployAfterMerge:
    type: boolean
    description: When true, wait for merge status and spawn deploy-walk after the PR is merged.
    required: false
    default: true
---

# Create PR

This skill is run by **a PR-creating agent** spawned by **`coding-session`** after **`pre-pr-review`** returns `recommendation: "go"`.

## Relationship to rule 20 (`gh pr create`)

**`.sedea/centers/research-and-development/rules/20_efficient-pr-shipping.mdc`** forbids **`gh pr create`** on coding, planning, and review lanes. **This skill is the exception:** **a PR-creating agent** on this lane **may** call `gh pr create` (or equivalent) when gates pass and push/creation is authorized. Other agents must spawn this skill instead of opening a PR themselves.

## Gate

Before creating or preparing a PR:

1. Verify `prePrReviewRecommendation` is exactly `go`. If not, stop with `failure`; PR creation is blocked until review passes.
2. Verify `worktreePath`, `branchName`, and `baseRef` are present.
3. Verify the worktree branch matches `branchName`.
4. Verify the committed diff exists: `git diff <baseRef>...HEAD` is non-empty.
5. Verify the branch is pushed or push it only if the developer / upstream coding-session explicitly authorized push. If push is not authorized, emit a copy-pasteable PR-creating prompt and return `partial` with `remainingTasks`.

When authorized to create the PR on this lane, you **may** run `gh pr create`. If creation is not authorized, produce the PR prompt below (per rule 20) and report `continuationStatus: "active"` — do not call `gh pr create`.

## PR prompt fallback

When direct PR creation is not authorized, generate a prompt for **a PR-creating agent** to create a GitHub PR. Gather the required info automatically:

1. **Current branch**: `git branch --show-current`
2. **Base branch**: `git log --oneline --decorate --all` or `git merge-base` to determine the branch this was forked from. Use the most recent parent branch that has a remote tracking branch (e.g. `main`, `phase-1/...`). If ambiguous, ask the user.
3. **Repo URL**: parse from `git remote get-url origin` (e.g. `https://github.com/sedea-ai/app`).
4. **Changes summary**: review `git diff <base-branch>...HEAD` and the conversation context. You have better context than **a PR-creating agent** — the description starter must be **reviewer-complete** (see `.sedea/centers/research-and-development/rules/20_efficient-pr-shipping.mdc` → **Comprehensive PR descriptions** → **a PR-creating agent prompt and proportional context**). Scale length to PR size; small PRs stay short but still cover **why this slice**, **not in this PR**, **plan lineage** when work came from a plan, and **how to verify** (tests / observable behaviour), plus the usual what/why and behavioural deltas.

Then print the following inside a fenced code block (so the user can copy it):

```
Create a PR for the branch I pushed: `<current-branch>`
In the <repo-url> repo
The base branch is `<base-branch>`

Use past tense for the PR title.

Here is a summary of the changes as a starting point for the PR description (verify against the diff and adjust as needed). Use bullets; keep it proportional to PR size but do not omit reasoning:

- Why this slice / motivation (enough that a reviewer can tell intent vs mistake)
- What changed (behaviour, APIs, schema, config)
- Not in this PR (deferrals, parent scope left out on purpose)
- Plan lineage (if applicable): path or slug to `.sedea/operations/**/plans/<slug>.plan.md` and optional pointer to Mermaid in the plan
- Intentional non-changes (if any)
- How to verify (which tests or observable behaviour — no separate test-plan essay)
```

## Result contract

When spawned, end with a child result containing:

- `outputs.targetPlanPath`
- `outputs.targetPlanSlug`
- `outputs.worktreePath`
- `outputs.branchName`
- `outputs.baseRef`
- `outputs.repoUrl`
- `outputs.prUrl`
- `outputs.prNumber`
- `outputs.promptEmitted`
- `outputs.remainingTasks`
- `outputs.activeLanes`
- `outputs.openLedgerEntries`
- `outputs.continuationOwner: "create-pr-agent"`
- `outputs.continuationStatus`

Set `continuationStatus`:

- `active` when a PR URL/number is created and reported but merge/deploy verification remains.
- `active` when a PR prompt was emitted but the developer/PR-creating agent still must create the PR.
- `active` when push or PR creation is blocked by missing authorization.

## PR lifecycle ownership

After a PR URL/number exists, this **create-pr agent** owns the PR lifecycle until deploy verification is spawned or explicitly deferred.

### Merge status checks

Check PR status when:

1. The PR is created.
2. The upstream coding-session reports inline `pr-review` complete.
3. The developer says the PR was approved or merged.
4. The Squad Leader asks for current PR status.

Use the repository's approved GitHub access path (prefer existing repo tooling / `gh` where available, or the `pr-review.py` helper when it supports the needed PR status). Record:

- `prState` (`open` | `merged` | `closed` | `unknown`)
- `reviewState` (`pending` | `approved` | `changes_requested` | `unknown`)
- `mergeSha`
- `mergedAt`

If PR status is `open`, keep `continuationStatus: "active"` and report the next missing gate: review approval, requested changes, merge pending, or unknown status.

If PR status is `closed` without merge, return `partial` or `abandoned` according to developer intent; do not spawn deploy.

### Spawn deploy-walk after merge

When `autoDeployAfterMerge` is not `false` and PR status is `merged`, verify deploy-walk prerequisites, then ask the developer with **AskQuestion** before spawning deploy verification. Required options:

1. **Start deploy verification now**
2. **Defer deploy verification**
3. **Check PR status again**
4. **More details for option _**

Only when the developer chooses **Start deploy verification now**, emit exactly one child-spawn request for:

`.sedea/centers/research-and-development/missions/plan-and-deliver/skills/deploy-walk/SKILL.md`

Inputs must include:

- `targetPlanPath`
- `targetPlanSlug`
- `prUrl`
- `prNumber`
- `repoUrl`
- `branchName`
- `mergeSha`
- `mergedAt`
- `ledgerParent`
- `upstreamSkill: "create-pr"`

Announce that **create-pr** is waiting for the deploy-walk result and stop. Do not propose plan reconciliation until deploy-walk reports terminal completion or the developer explicitly defers deploy verification.

If the developer defers deploy verification, keep `continuationStatus: "active"` with `remainingTasks` naming deferred `deploy-walk`; do not close the PR lifecycle ledger entry.

### Deploy result aggregation

When Mission Control delivers the **`deploy-walk`** result:

1. Copy `deployStatus`, `beforeDeployStatus`, `afterDeployStatus`, `deployTodoStatus`, `remainingTasks`, `activeLanes`, and `openLedgerEntries` into this skill's result.
2. If deploy status is `done`, verify that `plan-reconcile` prerequisites are ready and propose reconciliation to the developer. Do not spawn `plan-reconcile` automatically.
3. If deploy is blocked, skipped, partial, or active, keep this lane active and propagate the blocking status upstream.
4. Silence or missing deploy metadata is not completion; return `partial` with `continuationStatus: "active"`.

### Propose plan-reconcile after deploy done

When `deploy-walk` reports `deployStatus: "done"` and `deployTodoStatus: "done"`, verify reconcile prerequisites:

1. PR state is `merged`.
2. PR plan path or slug is known.
3. Deploy status is `done`.
4. Deploy capstone todo is `done`.

If all prerequisites are ready, ask the developer with **AskQuestion** before spawning. Required options:

1. **Run plan-reconcile now**
2. **Defer reconcile**
3. **Check status again**
4. **More details for option _**

Only when the developer chooses **Run plan-reconcile now**, emit exactly one child-spawn request for:

`.sedea/centers/research-and-development/missions/plan-and-deliver/skills/plan-reconcile/SKILL.md`

Inputs must include:

- `targetPlanPath`
- `targetPlanSlug`
- `prUrl`
- `prNumber`
- `prState: "merged"`
- `deployStatus: "done"`
- `deployTodoStatus: "done"`
- `ledgerParent`
- `upstreamSkill: "create-pr"`

Announce that **create-pr** is waiting for the plan-reconcile result and stop.

If the developer defers reconcile, return `continuationStatus: "active"` with `remainingTasks` naming deferred `plan-reconcile`; do not close the PR lifecycle ledger entry.

### Reconcile result aggregation

When Mission Control delivers the **`plan-reconcile`** result:

1. Copy `archivedSlugs`, `flaggedSlugs`, `postponedSlugs`, `followUpsIntegrated`, `remainingTasks`, `activeLanes`, and `openLedgerEntries` into this skill's result.
2. If reconcile status is terminal with no remaining tasks, report `continuationStatus: "terminal"` for the PR lifecycle.
3. If reconcile is active or partial, keep this lane active and propagate remaining choices upstream.

Extend spawned result outputs with:

- `outputs.prState`
- `outputs.reviewState`
- `outputs.mergeSha`
- `outputs.mergedAt`
- `outputs.deployStatus`
- `outputs.deployApprovalStatus`
- `outputs.beforeDeployStatus`
- `outputs.afterDeployStatus`
- `outputs.deployTodoStatus`
- `outputs.reconcileStatus`
- `outputs.archivedSlugs`
- `outputs.flaggedSlugs`
- `outputs.postponedSlugs`
