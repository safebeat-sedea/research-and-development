---
name: debug-and-fix
description: >-
  Log-first debug loop in a dedicated worktree — bootstrap, analyze logs,
  propose and apply fixes, verify with tests, recommend post-fix exit path.
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
  operationsUserId:
    type: string
    description: Operations user id from Mission Control session context.
    required: true
warmUpRules:
  - ".sedea/centers/research-and-development/missions/debug-and-fix/plan.mdc"
  - ".sedea/centers/research-and-development/rules/20_efficient-pr-shipping.mdc"
  - ".sedea/centers/research-and-development/missions/plan-and-deliver/skills/worktree-bootstrap/SKILL.md"
  - ".cursor/rules/dot-sedea.mdc"
  - ".cursor/rules/sedea-debug-logging-settings.mdc"
---

# Debug and fix

**Intent:** **Debug and Fix agent** runs a log-first diagnosis and fix loop in a dedicated hosting-repo worktree. Prioritize log access and debug instrumentation before substantive analysis. When the fix is verified, recommend a post-fix exit: **`code-promotion`** (parent runs **ad-hoc-prd → coding-session**) or **`findings-report-only`** (parent produces a debug session findings report with no downstream spawn).

**Normative mode:** **Spawned only** on this mission — child lane owns worktree lifecycle for the debug session unless protocol explicitly re-spawns **`coding-session`** for promotion.

## Inputs

| Field | Required | Notes |
|-------|----------|-------|
| `issueSummary` | Yes | Symptom or bug description |
| `reproductionSteps` | No | Reproduction narrative |
| `logHints` | No | Where to look first |
| `repoPath` | No | **`HOSTING_ROOT`** — resolve from workspace when omitted |
| `operationsUserId` | Yes | Session context |

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

Follow [`.sedea/centers/sedea/rules/0_hosting-repo.mdc`](.sedea/centers/sedea/rules/0_hosting-repo.mdc) § *Attach worktree to VS Code workspace* and **`coding-session`** hard rules:

| Step | Action |
|------|--------|
| 1 | **`git worktree add <absolute-path> -b <worktree-name> origin/main`** from **`HOSTING_ROOT`** |
| 2 | MCP **`sedea_add_worktree_folder`** with absolute **`WORKTREE_ROOT`** |
| 3 | Bootstrap **inline** on this lane per [rule **20**](.sedea/centers/research-and-development/rules/20_efficient-pr-shipping.mdc) § *Bootstrap profiles* and [`worktree-bootstrap/SKILL.md`](../../../plan-and-deliver/skills/worktree-bootstrap/SKILL.md): read dot-sedea § *Worktree bootstrap mode*; resolve `bootstrapMode`; run from **primary** **`HOSTING_ROOT`** (script modes) or `submodule-init` under **`WORKTREE_ROOT`** |

Do **not** edit product code before bootstrap succeeds (`outputs.bootstrapStatus: success`).

### 3 — Logs first (mandatory gate)

**Do not start substantive root-cause analysis until log access is established.**

1. Read [`.cursor/rules/sedea-debug-logging-settings.mdc`](.cursor/rules/sedea-debug-logging-settings.mdc) when present on the hosting repo — follow its **cwd routing** table before tuning any channel.
2. When the bug is under **`tapcart-push/`** or **`tapcart-merchant-dashboard/`**, read that submodule's logging rules first (for example [`tapcart-push/.cursor/rules/logging.mdc`](tapcart-push/.cursor/rules/logging.mdc) — `LOG_LEVEL`, pino).
3. When the bug is **Mission Control**, **Sedea Hub**, or dispatch/agent lanes — tune `sedeaHub.logLevel`, `missionControl.logLevel`, and Output panel sinks per that router; inspect `.sedea/operations/<operationsUserId>/dispatch/` on the **primary** clone when lane evidence is needed.
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
| Clean fix, ready to ship | `code-promotion` | Parent runs **ad-hoc-prd → coding-session** (mission steps 5–5b) |
| Fix verified; shipping deferred, noisy unrelated changes, or scope needs triage | `findings-report-only` | Parent produces **Debug session findings report** (mission step 6) — no downstream spawn |
| Blocked before verification | `blocked` | Terminal with evidence; parent routes to findings report |

Present structured choice confirming recommendation; **Squad Leader** owns post-fix exit selection in mission **step 4** (developer may override).

## Structured choice (Mission Control)

Every assistant turn closes with **AskQuestion** or **`MC_PHASED_RESPONSE_V1`** per [`.sedea/centers/sedea/rules/2_ask-question-instructions.mdc`](.sedea/centers/sedea/rules/2_ask-question-instructions.mdc). Use **external-wait / parked continuation** when developer reviews diffs or runs tests outside chat.

## Completion (spawned)

| Output | Meaning |
|--------|---------|
| `fixStatus` | `verified` \| `partial` \| `failed` \| `blocked` |
| `fixSummary` | What was wrong and what changed |
| `testEvidence` | Automated + manual test outcomes |
| `worktreePath` | Absolute **`WORKTREE_ROOT`** |
| `worktreeName` | Branch / worktree name |
| `hostingRoot` | Absolute **`HOSTING_ROOT`** |
| `exitRecommendation` | `code-promotion` \| `findings-report-only` \| `blocked` |
| `remainingTasks` | Open items for parent or developer |

### Host protocol line (required)

Emit **exactly one** terminal line (sentinel + JSON on the same line, no markdown fence):

`AGENT_RESULT_RESPONSE_V1 {"version":1,"correlationId":"<uuid>","status":"<success|partial|failure|aborted|abandoned>","summary":"<1-3 sentences>","outputs":{...},"errors":[]}`

Populate `outputs` per the table above. Use the spawn `correlationId` from the originating run request.

## Completion (inline)

Not used on this mission — **spawned only**.
