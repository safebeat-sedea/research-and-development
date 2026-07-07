---
name: create-pr
description: >-
 Inline coding-session procedure to create or prepare a GitHub PR from a reviewed
 implementation branch using PR plan lineage and pre-pr-review result. Executed by
 the active coding-session agent only — not spawned, no warmUpRules.
designation:
  allowed: Create GitHub PR from reviewed branch; PR description per ship rules
  forbidden: Implementation edits; merge without authorization; dispatch resolution
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

**Inline context schema (not spawn).** The frontmatter **`inputs`** map describes values **`coding-session`** passes in prose or handoff on the **same lane**. Mission Control does **not** spawn **`create-pr`** via **`mission_control_spawn_agent`**. Do **not** treat **`inputs`** as a spawn contract.

**Lane requirement (no separate warm-up).** This skill has **no** frontmatter **`warmUpRules`** by design. Run it **only** on the active **`coding-session`** lane after that session has loaded ship rules (**`20_efficient-pr-shipping`**, **`.sedea/centers/research-and-development/missions/plan-and-deliver/plan.mdc`**, **`skills/README.md`**, dev-process) and **`pre-pr-review`** has returned `recommendation: "go"`. Do **not** start a standalone Mission Control session on **`create-pr`** alone — context will be incomplete.

### Standalone dispatch (stop immediately)

If Mission Control opened a session whose only intent is **`create-pr`** / *open a PR* with **no** active **`coding-session`** context (`worktreePath`, `worktreeName`, `baseRef`, pre-PR **go**, PR plan when anchored):

1. **Stop** — do not run gates or **`gh pr create`**.
2. Tell the developer **`create-pr`** is **inline-only** on the **`coding-session`** lane.
3. Direct them to open or return to **`coding-session`** (detached phrase, snapshot, or **`plan and deliver`** ship path) and complete the ship chain through **`pre-pr-review`** → inline **`create-pr`** on clean **go** in [`coding-session/SKILL.md`](../coding-session/SKILL.md).

**Execution owner:** the active **coding-session agent** runs this skill inline. Do **not** spawn a separate PR-creating child lane. The coding-session lane has worktree, worktree name ref, diff, PR plan, pre-PR review outputs, and developer approvals needed to open a PR safely.

**Required upstream context:** `prePrReviewRecommendation: "go"`; `worktreePath`, `worktreeName`, `baseRef`; optional `targetPlanPath` / `targetPlanSlug`; `diffSummary` and pre-PR flags when available. If context is missing, recover on **`coding-session`** before running this procedure.

**Post-PR lifecycle:** merge checks, After-deploy **`deploy-walk`**, and inline **`plan-reconcile`** are owned by **`coding-session`** ([Post-create-pr handoff gate](../coding-session/SKILL.md#post-create-pr-handoff-gate), [After deploy deploy-walk handoff](../coding-session/SKILL.md#after-deploy-deploy-walk-handoff), [Plan-reconcile handoff (inline)](../coding-session/SKILL.md#plan-reconcile-handoff-inline)) — not this skill. **`gh pr create`** is the only `gh` operation this skill owns; after the PR exists, generic **`gh`** PR inspection is **not** a substitute for inline **`pr-review`** and **`pr-review.mjs`** Step 1 on **`coding-session`**.

**Worktree removal ownership (binding).** **Do not remove worktrees you do not own.** Opening a PR does **not** grant cleanup on other worktrees. **`git worktree remove`**, **`git worktree prune`**, and **`sedea_remove_worktree_folder`** apply **only** to **this pass’s** **`WORKTREE_ROOT`** when rule **0** § *Worktree ownership* and rule **20** § *Worktree removal ownership (binding)* preconditions hold. **`git worktree list` is read-only** when ownership is unclear — **stop; do not remove**.

## Structured choice (Mission Control)

Gates use **AskQuestion**, **`MC_PHASED_RESPONSE_V1`** per **`.sedea/centers/sedea/rules/2_ask-question-instructions.mdc`** and **`../README.md`** § *Recap, structured choice, act* on the **`coding-session`** lane — **preferred:** recap + modal in one message. **Act** (`gh pr create`, plan follow-up append) only after the developer selects.

## Checkpoint turn UX (skill-local)

Under Checkpoint trust (`trustLevel: checkpoint`), auto-advance scripted happy-path steps; emit structured choice only at **USER_CHECKPOINT** markers in this section, implicit external-wait surfaces, or exception paths. **No cross-skill inheritance** — gate defaults here apply only to **`create-pr`**; other ship-chain skills document their own markers.

**Real-dispatch test loop (binding):** After merge, run one full inline **`create-pr`** on a **`coding-session`** Checkpoint dispatch through [Pre-gh authorization gate](#pre-gh-authorization-gate-binding) and collect a developer verdict before the parent phase advances **`pr-review`** PR 5 — per **Ship-chain skills UX** § *Single-concern strategy*.

Marker syntax: [`.sedea/centers/sedea/docs/user-checkpoint-marker-syntax.md`](.sedea/centers/sedea/docs/user-checkpoint-marker-syntax.md).

| Step | Checkpoint behavior | Gate |
|------|---------------------|------|
| **Pre-PR clean path** — validate `prePrReviewRecommendation`, worktree context, branch ref, committed diff ([Gate](#gate) steps **1–4**) | Auto-advance when inputs valid | exception: validation failure → stop with recap; do not call **`gh pr create`** |
| **Push authorization** — branch on remote or push pre-authorized | Auto-advance when remote has commits or **`coding-session`** already pushed on clean-**go** auto path | **Gate** when push is required but not authorized — [Push authorization gate](#push-authorization-gate-binding) |
| **Pre-gh authorization** — developer pick before **`gh pr create`** | **Gate** — first mandatory developer-pick gate in this calibration PR | [Pre-gh authorization gate](#pre-gh-authorization-gate-binding) |
| **`gh pr create`** + PR description | Auto-advance after authorizing pick on the **next** response turn | exception: `gh` failure → recap + re-open pre-gh gate |
| **`## Completion (inline)`** handback | Auto-advance — parent opens [Post-create-pr handoff gate](../coding-session/SKILL.md#post-create-pr-handoff-gate) same turn | — |
| **PR prompt fallback** | Auto-advance when developer picks emit prompt or push/creation remains unauthorized | — |

**Skip pre-gh modal (binding):** When [Standalone dispatch (stop immediately)](#standalone-dispatch-stop-immediately) applies, **skip** both authorization gates — stop before **`gh`** or push.

## Session orientation table (binding)

Give developers a **consistent state snapshot** during inline PR creation so they can re-orient after reload or parallel work.

**When required:** At every **Mandatory gate** below — render as the **first block** in `display.markdown` (before recap or diff summary). **Forbidden:** omitting the table and substituting scattered one-liners on modal gates.

**Table shape (markdown):**

| Field | Value |
|-------|-------|
| Plan | `<slug>` @ `<path>` or — |
| Worktree | `<worktreePath>` from inline context |
| Branch | `<worktreeName>` from inline context |
| PR | — (pre-PR — no open PR yet) |
| Ship phase | parent `shipPhase` when inline on **`coding-session`**, or `implementing` |
| Deploy scope | — (create-pr does not own deploy walk) |
| Review | `go` from **`pre-pr-review`** when present |

**Population rules:** Same as [`.sedea/centers/research-and-development/missions/plan-and-deliver/skills/coding-session/SKILL.md`](../coding-session/SKILL.md) § *Session orientation table (binding)* — use inline context; never invent paths or PR numbers.

**Mandatory gates (this skill):** [Push authorization gate](#push-authorization-gate-binding); [Pre-gh authorization gate](#pre-gh-authorization-gate-binding).

### Push authorization gate (binding)

When [Gate](#gate) step **5** requires push but the branch is not on the remote and push was **not** authorized by **`coding-session`** (for example developer deferred push at ship cut-point):

Put the session orientation table and push status (`git status`, tracking ahead/behind) in **`display.markdown`**.

USER_CHECKPOINT — authorize push before PR creation.

| Option id | Label (brief) | Act |
|-----------|---------------|-----|
| `authorize-push` | Push branch and continue | Run **`git push`**; on success, proceed to [Pre-gh authorization gate](#pre-gh-authorization-gate-binding) on the **next** turn |
| `emit-pr-prompt` | Emit PR prompt — do not push | [PR prompt fallback](#pr-prompt-fallback); `continuationStatus: "active"` |
| `defer-pr` | Defer PR creation | Stop with `partial`; `remainingTasks` names push deferral |
| `more-details` | More details for option _ | Elaborate; re-open this gate |

- **Next-step resolution:** Auto-advance through [Gate](#gate) steps **1–4** on the happy path — no `USER_CHECKPOINT` until push is required and unauthorized.

### Pre-gh authorization gate (binding)

Every inline pass that would call **`gh pr create`** must use structured choice **before** invoking **`gh`** — even when **`coding-session`** ran [Inline create-pr (auto on clean go)](../coding-session/SKILL.md#inline-create-pr-auto-on-clean-go) without a coding-session-level Create-PR modal. **`coding-session`** authorization to enter inline **`create-pr`** does **not** substitute for this gate under Checkpoint trust.

**When required:** After [Gate](#gate) steps **1–5** pass (including push when authorized). **Forbidden:** calling **`gh pr create`** in the same assistant turn as this modal. **Forbidden:** prose-only PR creation handoff (*tell me when*, *I'll open the PR*) without **`MC_PHASED_RESPONSE_V1`**.

Put the session orientation table, reviewer **`go`** summary, optional flags, and proposed follow-ups (when present) in **`display.markdown`**.

USER_CHECKPOINT — authorize `gh pr create` on this lane.

| Option id | Label (brief) | Act |
|-----------|---------------|-----|
| `authorize-create-pr` | Create PR now | On the **developer's response turn**, run **`gh pr create`** per rule **20** § *Comprehensive PR descriptions*; merge [## Completion (inline)](#completion-inline) |
| `approve-followups-create-pr` | Approve follow-ups and create PR | Append proposed follow-ups to the plan **`## Follow-ups`** when present; then **`gh pr create`** on response turn |
| `create-pr-no-followups` | Create PR without appending follow-ups | **`gh pr create`** with `followUpsAppended: false` on response turn |
| `emit-pr-prompt` | Emit PR prompt — do not run `gh` | [PR prompt fallback](#pr-prompt-fallback); do not call **`gh pr create`** |
| `defer-pr` | Defer PR creation | `continuationStatus: "active"`; `remainingTasks` names deferral |
| `more-details` | More details for option _ | Elaborate; re-open this gate |

- **`defaultOptionId: authorize-create-pr`** when pre-PR clean path passed, branch is pushed, and no follow-up append decision is pending.
- **`defaultOptionId: create-pr-no-followups`** when **`hasProposedFollowUps`** is **false** and the developer already declined follow-up append at **`coding-session`** [Create-PR handoff after go](../coding-session/SKILL.md#create-pr-handoff-after-go).
- **Next-step resolution:** Auto-advance through pre-PR clean path and push authorization on the happy path — no `USER_CHECKPOINT` until this gate.

**Standalone dispatch:** When [Standalone dispatch (stop immediately)](#standalone-dispatch-stop-immediately) applies, **skip** this gate — stop before **`gh`**.

## Relationship to rule 20 (`gh pr create`)

**`.sedea/centers/research-and-development/rules/20_efficient-pr-shipping.mdc`** forbids **`gh pr create`** on planning, Squad Leader, **`pre-pr-review`**, and other non-ship lanes. **Exception:** the active **`coding-session`** agent **while executing this skill inline** after pre-PR clean **`go`** (auto path) or exceptional Create-PR gate may call `gh pr create` when gates pass and push/creation is authorized.

## Gate

Before creating or preparing a PR (Checkpoint: see [Checkpoint turn UX (skill-local)](#checkpoint-turn-ux-skill-local) for auto-advance vs gate routing):

1. Verify `prePrReviewRecommendation` is exactly `go`. If not, stop; PR creation is blocked until review passes.
2. Verify `worktreePath`, `worktreeName`, and `baseRef` are present.
3. Verify the worktree name ref matches `worktreeName` (`git branch --show-current`).
4. Verify the committed diff exists: `git diff <baseRef>...HEAD` is non-empty.
5. Verify the worktree is pushed or push it only if the developer / **`coding-session`** explicitly authorized push. If push is not authorized, open [Push authorization gate](#push-authorization-gate-binding) — do not push silently. If push is not authorized and the developer picks emit prompt, use [PR prompt fallback](#pr-prompt-fallback) and report `partial` with `remainingTasks`.

When pre-PR validation and push preconditions pass, open [Pre-gh authorization gate](#pre-gh-authorization-gate-binding) before **`gh pr create`**. When the developer authorizes creation, you **may** run `gh pr create` on the **response turn** — not the same turn as the modal. If creation is not authorized, produce the PR prompt below and set `continuationStatus: "active"` — do not call `gh pr create`.

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

**`create-pr`** is **not** a separate child terminal. After inline completion, the invoker **must** merge these fields into the next **`coding-session`** **`mission_control_send_agent_result`** **`outputs`** (or re-emit updated terminal on that lane):

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

Report on the **same `coding-session` lane**. Do **not** emit `mission_control_spawn_agent`, `mission_control_send_agent_result`, or `MC_DISPATCH_RESOLVED_V1` from this procedure alone.

Required fields (prose to invoker / merged into **`coding-session`** `outputs`):

- All keys from **## Result contract**
- One-line summary: PR opened (`prUrl`) or blocked reason

**Handback:** the invoker opens [Post-create-pr handoff gate](../coding-session/SKILL.md#post-create-pr-handoff-gate) on the **same `coding-session` assistant turn** that finishes this procedure — **`MC_PHASED_RESPONSE_V1`** with post-create-pr **`options`**, not prose-only PR URL (see **`coding-session`** § *Every developer-await turn* and Create-PR step **7**). Do **not** auto-start inline **`pr-review`**, inline **`deploy-walk`**, or **`plan-reconcile`** from this skill. When the developer later picks **`start-pr-review`**, **`coding-session`** must load **`pr-review/SKILL.md`** and run **`pr-review.mjs`** Step 1 before generic review/wait/merge options.
