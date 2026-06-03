---
name: create-pr
description: >-
 Inline coding-session procedure to create or prepare a GitHub PR from a reviewed
 implementation branch using PR plan lineage and pre-pr-review result. Executed by
 the active coding-session agent only — not spawned, no warmUpRules.
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
    description: Absolute hosting repo worktree path.
    required: true
  worktreeName:
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
    description: Invoker skill — must be coding-session when inline.
    required: false
---

# Create PR

**Inline context schema (not spawn).** The frontmatter **`inputs`** map describes values **`coding-session`** passes in prose or handoff on the **same lane**. Mission Control does **not** spawn **`create-pr`** via **`AGENT_RUN_REQUEST_V1`**. Do **not** treat **`inputs`** as a spawn contract.

**Lane requirement (no separate warm-up).** This skill has **no** frontmatter **`warmUpRules`** by design. Run it **only** on the active **`coding-session`** lane after that session has loaded ship rules (**`20_efficient-pr-shipping`**, **`.sedea/centers/research-and-development/missions/plan-and-deliver/plan.mdc`**, **`skills/README.md`**, dev-process) and **`pre-pr-review`** has returned `recommendation: "go"`. Do **not** start a standalone Mission Control session on **`create-pr`** alone — context will be incomplete.

### Standalone dispatch (stop immediately)

If Mission Control opened a session whose only intent is **`create-pr`** / *open a PR* with **no** active **`coding-session`** context (`worktreePath`, `worktreeName`, `baseRef`, pre-PR **go**, PR plan when anchored):

1. **Stop** — do not run gates or **`gh pr create`**.
2. Tell the developer **`create-pr`** is **inline-only** on the **`coding-session`** lane.
3. Direct them to open or return to **`coding-session`** (detached phrase, snapshot, or **`plan and deliver`** ship path) and complete the ship chain through **`pre-pr-review`** → **Create-PR handoff after go** in [`coding-session/SKILL.md`](../coding-session/SKILL.md).

**Execution owner:** the active **coding-session agent** runs this skill inline. Do **not** spawn a separate PR-creating child lane. The coding-session lane has worktree, worktree name ref, diff, PR plan, pre-PR review outputs, and developer approvals needed to open a PR safely.

**Required upstream context:** `prePrReviewRecommendation: "go"`; `worktreePath`, `worktreeName`, `baseRef`; optional `targetPlanPath` / `targetPlanSlug`; `diffSummary` and pre-PR flags when available. If context is missing, recover on **`coding-session`** before running this procedure.

**Post-PR lifecycle:** merge checks, After-deploy **`deploy-walk`**, and inline **`plan-reconcile`** are owned by **`coding-session`** ([Post-create-pr handoff gate](../coding-session/SKILL.md#post-create-pr-handoff-gate), [After deploy deploy-walk handoff](../coding-session/SKILL.md#after-deploy-deploy-walk-handoff), [Plan-reconcile handoff (inline)](../coding-session/SKILL.md#plan-reconcile-handoff-inline)) — not this skill.

## Structured choice (Mission Control)

Gates use **AskQuestion**, **`MC_PHASED_RESPONSE_V1`** per **`.sedea/centers/sedea/rules/2_ask-question-instructions.mdc`** and **`../README.md`** § *Recap, structured choice, act* on the **`coding-session`** lane — **preferred:** recap + modal in one message. **Act** (`gh pr create`, plan follow-up append) only after the developer selects.

## Relationship to rule 20 (`gh pr create`)

**`.sedea/centers/research-and-development/rules/20_efficient-pr-shipping.mdc`** forbids **`gh pr create`** on planning, Squad Leader, **`pre-pr-review`**, and other non-ship lanes. **Exception:** the active **`coding-session`** agent **while executing this skill inline** after pre-PR **go** and developer approval in **Create-PR handoff after go** may call `gh pr create` when gates pass and push/creation is authorized.

## Gate

Before creating or preparing a PR:

1. Verify `prePrReviewRecommendation` is exactly `go`. If not, stop; PR creation is blocked until review passes.
2. Verify `worktreePath`, `worktreeName`, and `baseRef` are present.
3. Verify the worktree name ref matches `worktreeName` (`git branch --show-current`).
4. Verify the committed diff exists: `git diff <baseRef>...HEAD` is non-empty.
5. Verify the worktree is pushed or push it only if the developer / **`coding-session`** explicitly authorized push. If push is not authorized, emit a copy-pasteable PR prompt (below) and report `partial` with `remainingTasks`.

When authorized to create the PR, you **may** run `gh pr create`. If creation is not authorized, produce the PR prompt below and set `continuationStatus: "active"` — do not call `gh pr create`.

## PR prompt fallback

When direct PR creation is not authorized, generate a copy-paste prompt for a future **`coding-session`** ship pass. Gather:

1. **Current worktree name ref**: `git branch --show-current`
2. **Integration line**: from `git merge-base` / tracking parent (e.g. `main`).
3. **Repo URL**: `git remote get-url origin`
4. **Changes summary**: `git diff <base>...HEAD` plus session context — **reviewer-complete** per rule **20** § *Comprehensive PR descriptions*.

Print inside a fenced code block:

```
Create a PR for the worktree I pushed: `<current-worktree-name>`
In the <repo-url> repo
The integration line is `<integration-line>`

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

Merge these fields into **`coding-session`** `outputs` via **`## Completion (inline)`**:

- `targetPlanPath`
- `targetPlanSlug`
- `worktreePath`
- `worktreeName`
- `baseRef`
- `repoUrl`
- `prUrl`
- `prNumber`
- `promptEmitted`
- `remainingTasks`
- `shipPhase` — `pr-open` when PR created; `implementing` or `blocked` when deferred
- `rowStatus` — `open` when PR exists and ship continues; `blocked` when handoff blocked
- `blockedReason` — when `rowStatus: blocked`
- `prState` — `open` | `merged` | `closed` | `unknown` when known
- `reviewState` — when queried on this pass
- `continuationStatus` — `active` when PR open or prompt emitted; `partial` when blocked

Set `continuationStatus`:

- `active` when a PR URL/number is created and post-create-pr gates remain on **`coding-session`**.
- `active` when a PR prompt was emitted but the developer still must create the PR.
- `active` when push or PR creation is blocked by missing authorization.

## Mission Control section 8 sync (via coding-session)

**`create-pr`** is **not** a separate child terminal. After inline completion, the invoker **must** merge these fields into the next **`coding-session`** **`AGENT_RESULT_RESPONSE_V1`** **`outputs`** (or re-emit updated terminal on that lane):

| Field | When |
|-------|------|
| `targetPlanPath` | Always when plan-anchored |
| `shipPhase` | `pr-open` when PR created; `implementing` or `blocked` when deferred |
| `rowStatus` | `open` when PR exists; `blocked` when handoff blocked |
| `prUrl` / `prNumber` | When PR created |
| `remainingTasks` / `blockedReason` | When applicable |

**Forbidden:** nudging manual **Ship recap** on the Squad Leader dispatch. Host sync delivers §8 updates from **`coding-session`** terminals only.

| Outcome | `shipPhase` | Key `outputs` |
|---------|-------------|---------------|
| PR created | `pr-open` | `targetPlanPath`, `prUrl`, `prNumber` |
| Blocked / deferred | `implementing` or `blocked` | `targetPlanPath`, `remainingTasks`, `blockedReason` |

## Completion (inline)

Report on the **same `coding-session` lane**. Do **not** emit `AGENT_RUN_REQUEST_V1`, `AGENT_RESULT_RESPONSE_V1`, or `MC_DISPATCH_RESOLVED_V1` from this procedure alone.

Required fields (prose to invoker / merged into **`coding-session`** `outputs`):

- All keys from **## Result contract**
- One-line summary: PR opened (`prUrl`) or blocked reason

**Handback:** the invoker opens [Post-create-pr handoff gate](../coding-session/SKILL.md#post-create-pr-handoff-gate) on the **same `coding-session` assistant turn** that finishes this procedure — **`MC_PHASED_RESPONSE_V1`** with post-create-pr **`options`**, not prose-only PR URL (see **`coding-session`** § *Every developer-await turn* and Create-PR step **7**). Do **not** auto-start inline **`pr-review`**, inline **`deploy-walk`**, or **`plan-reconcile`** from this skill.
