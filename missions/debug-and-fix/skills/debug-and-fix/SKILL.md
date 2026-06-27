---
name: debug-and-fix
description: >-
  Log-first debug loop in a dedicated worktree — bootstrap, analyze logs,
  propose and apply fixes, verify with tests, recommend post-fix exit path.
designation:
  allowed: Debug worktree setup; log analysis; targeted fixes and verification in scope
  forbidden: PRD rewrite; mission rule edits; dispatch resolution on leader lane
inputs:
  issueSummary:
    type: string
    description: Non-empty summary of the symptom or bug under investigation.
    required: true
  reproductionSteps:
    type: string
    description: Optional steps to reproduce the issue.
    required: false
  logHints:
    type: string
    description: Optional log locations, channels, or correlation ids.
    required: false
  repoPath:
    type: string
    description: Absolute hosting repo root; default resolved from workspace when omitted.
    required: false
  dispatch scope:
    type: string
    description: Operations user id from Mission Control session context.
    required: true
warmUpRules:
  - ".sedea/centers/research-and-development/missions/debug-and-fix/plan.mdc"
  - ".sedea/centers/research-and-development/rules/20_efficient-pr-shipping.mdc"
  - ".sedea/centers/sedea/skills/worktree-setup/SKILL.md"
  - ".sedea/centers/sedea/rules/0_hosting-repo.mdc"
  - ".cursor/rules/dot-sedea.mdc"
  - ".cursor/rules/sedea-debug-logging-settings.mdc"
---

# Debug and fix

**Intent:** **Debug and Fix agent** runs a log-first diagnosis and fix loop in a dedicated hosting-repo worktree. Prioritize log access and debug instrumentation before substantive analysis. When the fix is verified, recommend a post-fix exit: **`code-promotion`** (parent creates a PR plan anchor through **new-plan/pr-plan**, then runs **coding-session** with `targetPlanPath`), **`ad-hoc-prd`** (parent captures fix context without immediate code promotion), or **`findings-report-only`** (parent produces a debug session findings report with no downstream spawn).

**Normative mode:** **Spawned only** on this mission — child lane owns worktree lifecycle for the debug session unless protocol explicitly re-spawns **`coding-session`** for promotion.

## Inputs

| Field | Required | Notes |
|-------|----------|-------|
| `issueSummary` | Yes | Symptom or bug description |
| `reproductionSteps` | No | Reproduction narrative |
| `logHints` | No | Where to look first |
| `repoPath` | No | **`HOSTING_ROOT`** — resolve from workspace when omitted |
| Dispatch scope | Yes | Mission Control `dispatchId` + bundle directory |

## Execution diagram

```mermaid
flowchart TD
  A[Worktree create + attach + bootstrap] --> B[Logs first]
  B --> C[Analyze + instrument]
  C --> D[Propose fix + tests]
  D --> E{Developer approves?}
  E -->|no| C
  E -->|yes| F[Apply fix]
  F --> G[Automated + guided tests]
  G --> H{Fixed?}
  H -->|no| C
  H -->|yes| I[Recommend post-fix exit]
```

## Steps

### 1 — Resolve paths and worktree name

1. Set **`HOSTING_ROOT`** = `repoPath` or workspace root containing `.sedea/centers/sedea/`.
2. Derive **`worktreeName`** per [`.sedea/centers/sedea/rules/7_stacked-pr-worktree-naming.mdc`](.sedea/centers/sedea/rules/7_stacked-pr-worktree-naming.mdc) — default non-stacked: `improve/debug-and-fix-<short-slug>` from issue summary.
3. Choose sibling **`WORKTREE_ROOT`** path per team convention (outside **`HOSTING_ROOT`** checkout tree).

### 2 — Worktree create, attach, bootstrap (binding)

Follow [`.sedea/centers/sedea/rules/0_hosting-repo.mdc`](.sedea/centers/sedea/rules/0_hosting-repo.mdc) § *Attach worktree to VS Code workspace*, [`.sedea/centers/sedea/skills/worktree-setup/SKILL.md`](../../../../../sedea/skills/worktree-setup/SKILL.md), and [rule **20**](.sedea/centers/research-and-development/rules/20_efficient-pr-shipping.mdc) § *Worktree setup in plans* / *Bootstrap profiles*:

| Step | Action |
|------|--------|
| 1 | From **`HOSTING_ROOT`**, run center **`worktree-setup.sh`** with `--hosting-root`, `--worktree-path` (absolute **`WORKTREE_ROOT`** from step **1**), `--worktree-name`, `--base-ref origin/main`. **Forbidden on the default path:** inline **`git worktree add`**. |
| 2 | Parse the **one JSON line on stdout**. Set **`WORKTREE_ROOT`** from hint **`worktreeRoot`**. When hint **`bootstrapStatus`** is **`success`**, **`skipped-noop`**, or **`skipped-idempotent`**, set **`outputs.bootstrapStatus: success`** and **`outputs.bootstrapMode`** from the hint. **Do not** run inline [`worktree-bootstrap/SKILL.md`](../../../plan-and-deliver/skills/worktree-bootstrap/SKILL.md) after successful setup. |
| 3 | When JSON **`nextAction`** is **`attach-required`**, MCP **`sedea_add_worktree_folder`** with absolute **`WORKTREE_ROOT`**. **Forbidden:** attach before setup exits **0**. |

**Exception (inline retry only):** When step **1** fails or bootstrap is not success-class, stop product edits and offer retry per rule **20** § *Bootstrap profiles* — inline deprecated [`worktree-bootstrap/SKILL.md`](../../../plan-and-deliver/skills/worktree-bootstrap/SKILL.md) **only** when setup failed and the developer attests retry (not spawn-by-default).

Do **not** edit product code before **`outputs.bootstrapStatus: success`**.

### 3 — Logs first (mandatory gate)

**Do not start substantive root-cause analysis until log access is established.**

1. Read [`.cursor/rules/sedea-debug-logging-settings.mdc`](.cursor/rules/sedea-debug-logging-settings.mdc) when present on the hosting repo — follow its **cwd routing** table before tuning any channel.
2. When the bug is under **`tapcart-push/`** or **`tapcart-merchant-dashboard/`**, read that submodule's logging rules first (for example [`tapcart-push/.cursor/rules/logging.mdc`](tapcart-push/.cursor/rules/logging.mdc) — `LOG_LEVEL`, pino).
3. When the bug is **Mission Control**, **Sedea Hub**, or dispatch/agent lanes — tune `sedeaHub.logLevel`, `missionControl.logLevel`, and Output panel sinks per that router; inspect `.sedea/operations/.../dispatch/` on the **primary** clone when lane evidence is needed.
4. Collect existing logs relevant to `issueSummary` / `logHints`.
5. Add **liberal debug logging** to code under **`WORKTREE_ROOT`** when existing logs are insufficient — verbose debug output is acceptable for this stage.
6. Reproduce using `reproductionSteps` when provided; capture log evidence before proposing fixes.

**Node toolchain:** when running `node` / `npm` / `yarn` in a submodule during diagnosis, use that repo's declared version (`fnm use` when `.node-version` or `.nvmrc` exists) per [`.cursor/rules/dot-sedea.mdc`](.cursor/rules/dot-sedea.mdc) — not a separate hosting-root warmUp rule.

### 4 — Analyze and propose fix

1. Analyze code with log evidence — prioritize log-backed hypotheses.
2. Propose fix with explicit **testing scenarios** (automated and manual).
3. Close turn with structured choice — developer approves fix proposal, requests revision, or aborts.

### 5 — Apply fix (after approval)

1. Implement approved fix only under **`WORKTREE_ROOT`**.
2. Run automated tests applicable to the change.
3. Guide developer through manual test scenarios step-by-step via structured choice checkpoints.

### 6 — Fix loop

- If issue persists or a new issue appears → return to step **3** (logs first on new evidence).
- If blocked (missing access, unrecoverable env) → set `fixStatus: blocked` and terminal with evidence.

### 7 — Session cleanup vs post-fix recommendation

When fix is verified:

| Worktree / fix state | `exitRecommendation` | Rationale for parent |
|----------------------|---------------------|----------------------|
| Clean fix, ready to ship | `code-promotion` | Parent creates a PR plan anchor with **new-plan/pr-plan**, then runs **coding-session** with `targetPlanPath` (mission steps 5–5b) |
| Fix verified; product-context capture is useful before promotion decisions | `ad-hoc-prd` | Parent spawns **ad-hoc-prd** only (mission step 5c) — no **coding-session** until the developer later selects code promotion |
| Fix verified; shipping deferred, noisy unrelated changes, or scope needs triage | `findings-report-only` | Parent produces **Debug session findings report** (mission step 6) — no downstream spawn |
| Blocked before verification | `blocked` | Terminal with evidence; parent routes to findings report |

For `code-promotion`, include enough `fixSummary` and `testEvidence` detail for the parent to seed the standalone PR plan anchor. The parent must create or populate a PR plan before spawning **`coding-session`**; do not imply that the debug worktree alone is sufficient for ship-chain handoff.

Present structured choice confirming recommendation; **Squad Leader** owns post-fix exit selection in mission **step 4** (developer may override).

## Structured choice (Mission Control)

Every assistant turn closes with **AskQuestion** or **`MC_PHASED_RESPONSE_V1`** per [`.sedea/centers/sedea/rules/2_ask-question-instructions.mdc`](.sedea/centers/sedea/rules/2_ask-question-instructions.mdc). Use **external-wait / next-step modal** when developer reviews diffs or runs tests outside chat.

## Completion (spawned)

| Output | Meaning |
|--------|---------|
| `fixStatus` | `verified` \| `partial` \| `failed` \| `blocked` |
| `fixSummary` | What was wrong and what changed |
| `testEvidence` | Automated + manual test outcomes |
| `worktreePath` | Absolute **`WORKTREE_ROOT`** |
| `worktreeName` | Branch / worktree name |
| `hostingRoot` | Absolute **`HOSTING_ROOT`** |
| `bootstrapStatus` | `success` \| `failed` \| `pending` — from center setup JSON hints (default path) or inline retry |
| `bootstrapMode` | Hosting overlay mode when reported by setup hints |
| `exitRecommendation` | `code-promotion` \| `ad-hoc-prd` \| `findings-report-only` \| `blocked` |
| `remainingTasks` | Open items for parent or developer |

When `exitRecommendation: code-promotion`, `fixSummary` and `testEvidence` must be suitable for PR-plan seeding: name the verified change, affected areas, automated/manual test evidence, and any deploy-test considerations discovered during debugging. If that evidence is incomplete, prefer `findings-report-only` or include the missing evidence in `remainingTasks`.

### Host protocol line (required)

Emit **exactly one** terminal line (sentinel + JSON on the same line, no markdown fence):

`AGENT_RESULT_RESPONSE_V1 {"version":1,"correlationId":"<uuid>","status":"<success|partial|failure|aborted|abandoned>","summary":"<1-3 sentences>","outputs":{...},"errors":[]}`

Populate `outputs` per the table above. Use the spawn `correlationId` from the originating run request.

## Completion (inline)

Not used on this mission — **spawned only**.
