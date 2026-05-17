---
name: create-pr
description: >-
  PR-creating agent: create or prepare a GitHub PR from a reviewed implementation
  branch using coding-session context, PR plan lineage, and pre-pr-review result.
timeoutMs: 900000
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
---

# Create PR

This skill is run by **a PR-creating agent** spawned by **`coding-session`** after **`pre-pr-review`** returns `recommendation: "go"`.

## Gate

Before creating or preparing a PR:

1. Verify `prePrReviewRecommendation` is exactly `go`. If not, stop with `failure`; PR creation is blocked until review passes.
2. Verify `worktreePath`, `branchName`, and `baseRef` are present.
3. Verify the worktree branch matches `branchName`.
4. Verify the committed diff exists: `git diff <baseRef>...HEAD` is non-empty.
5. Verify the branch is pushed or push it only if the developer / upstream coding-session explicitly authorized push. If push is not authorized, emit a copy-pasteable PR-creating prompt and return `partial` with `remainingTasks`.

Do not run `gh pr create` unless this skill's invocation context explicitly authorizes the PR-creating agent to create the PR. If not authorized, produce the prompt below and report `continuationStatus: "active"`.

## PR prompt fallback

When direct PR creation is not authorized, generate a prompt for **a PR-creating agent** to create a GitHub PR. Gather the required info automatically:

1. **Current branch**: `git branch --show-current`
2. **Base branch**: `git log --oneline --decorate --all` or `git merge-base` to determine the branch this was forked from. Use the most recent parent branch that has a remote tracking branch (e.g. `main`, `phase-1/...`). If ambiguous, ask the user.
3. **Repo URL**: parse from `git remote get-url origin` (e.g. `https://github.com/sedea-ai/app`).
4. **Changes summary**: review `git diff <base-branch>...HEAD` and the conversation context. You have better context than **a PR-creating agent** — the description starter must be **reviewer-complete** (see `.sedea/centers/sedea-centers--development/rules/efficient-pr-shipping.mdc` → **Comprehensive PR descriptions** → **a PR-creating agent prompt and proportional context**). Scale length to PR size; small PRs stay short but still cover **why this slice**, **not in this PR**, **plan lineage** when work came from a plan, and **how to verify** (tests / observable behaviour), plus the usual what/why and behavioural deltas.

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

- `terminal` when a PR URL/number is created and reported.
- `active` when a PR prompt was emitted but the developer/PR-creating agent still must create the PR.
- `active` when push or PR creation is blocked by missing authorization.
