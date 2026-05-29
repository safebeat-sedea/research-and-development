---
name: pre-pr-review
description: >-
  Pre-PR reviewer agent (fresh spawned lane): review a committed implementation
  diff against a PR plan or free-form scope, score plan/rules/quality categories,
  propose Code Review Follow-ups when plan-anchored, and report go/no-go before PR
  creation. Scores §7 Before deploy only; After deploy is post-merge (deploy-walk) and
  is omitted entirely from this report (not Defer, flags, or summary). Spawned by
  coding-session after the implementation cut point;
  coding-session obtains developer approval before any follow-up mutation.
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

**Who runs this:** a fresh **pre-PR reviewer agent** lane spawned by **`coding-session`** after developer implementation approval, **commit**, and **Before deploy** **`deploy-walk`** (or documented skip). The reviewer must have no carry-over from the coding agent that changed the branch.

This pass complements, and does not replace, the later GitHub-surface **reviewer agent**.

## Structured choice (Mission Control)

This skill does not own approval modals — **`coding-session`** collects developer consent before spawns. When this lane must surface a pick, use **AskQuestion**, **`MC_PHASED_RESPONSE_V1`**, or **`MC_ASKQUESTION_V1`** per **`.sedea/centers/sedea/rules/2_ask-question-instructions.mdc`** and **`../README.md`** § *Recap, structured choice, act*.

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
git status --short --ignore-submodules=dirty
```

If `git status --short` is non-empty, continue against the committed diff but evaluate dirty-tree degradation using `git status --short --ignore-submodules=dirty` (aligns with `.sedea/centers/research-and-development/rules/20_efficient-pr-shipping.mdc` submodule-only drift guidance). Only non-submodule local edits should be flagged as not part of the reviewed cut point.

If there are zero commits ahead and no diff, stop with `failure`: there is nothing to review.

## Pre-PR phase boundary (plan anchor)

This skill runs **before** the PR is opened or merged. Scope is **pre-merge readiness** — not production deploy verification.

| Plan section | Pre-PR scope | Owner after merge |
|--------------|--------------|-------------------|
| §§ **1–6**, § **8** | In scope for scoring and follow-ups | — |
| § **7** `### Before deploy` | In scope — verify against diff / § 6 tests | **`coding-session`** spawns **`deploy-walk`** (`before-deploy-only`) before this review |
| § **7** `### After deploy` | **Out of scope** — omit from the entire pre-PR report (see below) | **`deploy-walk`** after merge (**development-process.md** § *Ship chain*) |

### §7 After deploy — silent omission (binding)

**`### After deploy`** is **post-merge** work. This pre-PR pass does **not** score it and does **not** mention it anywhere in output — including under **`Defer`**, flags, blockers, proposed follow-ups, category **G** narrative, chat recap, `outputs.codingAgentHandback`, or the terminal `summary`.

Do **not** report (and do **not** echo for awareness):

- Unchecked **`[ ]`** lines under **`### After deploy`**.
- Missing execution of **After deploy** steps before the PR exists.
- Requests to complete **After deploy** before PR.
- Summary bullets such as *Post-merge production smoke via deploy-walk; not a pre-PR gate* or tags like **`[G §7 After deploy — post-merge]`**.

If the only “deferred” work you would list is post-merge deploy verification, **omit the `Defer` group entirely** from the report and leave `codingAgentHandback.Defer` empty (or omit the key).

### §7 Before deploy — scoring

- **`PASS`** when every Before-deploy item is satisfied by the diff, § 6 tests, or an explicit *None — …* line in the plan.
- **`FLAG`** only for Before-deploy gaps that are **merge-blocking** (missing PR-specific verification not covered by § 6 or standing CI).
- **`FAIL`** only when a Before-deploy gap would make merging unsafe **now** — never because After-deploy is still `[ ]`.

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
| **G** | § 7 Deploy test plan — **`### Before deploy` only** (see [Pre-PR phase boundary](#pre-pr-phase-boundary-plan-anchor)); After deploy is post-merge |
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
6. **Exclude** every item that only restates **`### After deploy`** or post-merge production verification — omit entirely (see **§7 After deploy — silent omission** above), not in `proposedFollowUps` or handback.

For `free-form`, skip file writes.

## Step 8 — Report and result

Report:

1. Category table.
2. Blockers (`FAIL`).
3. Flags.
4. Recommendation: `go` only when there are no `FAIL` rows.
5. Coding-agent handback: what to fix next, with **`Must`** and **`Should`** groups when non-empty. Apply [Pre-PR phase boundary](#pre-pr-phase-boundary-plan-anchor):
   - **`Must`** — merge-blocking `FAIL` rows and true pre-merge gaps only.
   - **`Should`** — pre-merge improvements only.
   - **`Defer`** — **do not use** for **`### After deploy`**, **`deploy-walk`**, or post-merge production smoke (see **§7 After deploy — silent omission** above). Include **`Defer`** only for other genuinely deferred pre-PR-adjacent items; if none, omit the **`Defer`** section and do not populate post-merge deploy bullets in `outputs.codingAgentHandback`.
6. **Deploy test plan (§7):** when the developer reported manual §7 smoke during review, list which numbered **`### Before deploy`** steps they said passed — the coding agent should flip those lines in `targetPlanPath` only after the developer **confirms each step** in session (see **`coding-session`** § *Deploy test plan confirmations*). Do **not** mention **`### After deploy`** in this pass. This reviewer skill does **not** append `[x]` without that per-step confirmation.

The handback is advisory until the developer approves the fix pass. Do not frame reviewer feedback as automatic authorization for **`coding-session`** to edit code. The coding agent must present the review result to the developer, **recommend** addressing relevant findings when **`actionablePrePrFindings`** applies, and open its **Review feedback approval gate** (including **Implement pre-PR review findings now (this session)** as the first option — **even when** `recommendation` is `go` but `flags` or **Must** / **Should** handback remain) before applying fixes or proceeding to Create-PR.

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
- `partial` status with `continuationStatus: "active"` when the review ran but missing rules, non-submodule dirty uncommitted edits, or incomplete anchors make the result degraded.

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
