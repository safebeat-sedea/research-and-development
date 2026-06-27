---
name: pr-review
description: >-
 Inline coding-session procedure for GitHub PR comment triage and fix loops.
 Executed by the active coding-session agent only — not spawned, no warmUpRules.
 Resolves comments only after developer approval.
designation:
  allowed: Triage PR review comments; authorized comment fixes in worktree
  forbidden: Open PRs; merge; planning rewrites; dispatch resolution
---

# PR Review Workflow

**Lane requirement (no separate warm-up).** This skill has **no** frontmatter **`warmUpRules`** by design. Run it **only** on the active **`coding-session`** lane after that session has loaded ship rules (**`20_efficient-pr-shipping`**, **`.sedea/centers/research-and-development/missions/plan-and-deliver/plan.mdc`**, **`skills/README.md`**, dev-process). Do **not** start a standalone Mission Control session on **`pr-review`** alone — context will be incomplete.

### Standalone dispatch (stop immediately)

If Mission Control opened a session whose only intent is **`pr-review`** / *triage PR comments* with **no** active **`coding-session`** context (`prUrl`, worktree, worktree name, PR plan, pre-PR history):

1. **Stop** — do not run Steps 1–5 or **`pr-review.mjs`**.
2. Tell the developer **`pr-review`** is **inline-only** on the **`coding-session`** lane.
3. Direct them to open or return to **`coding-session`** (detached phrase, snapshot, or **`plan and deliver`** ship path) with PR identity loaded, then invoke triage from that lane.

**Execution owner:** the active **coding-session agent** runs this skill inline. Do not spawn a separate `pr-review` agent. The coding-session lane has the implementation context, worktree, worktree name, PR plan, prior pre-PR review findings, and developer approvals needed to evaluate and fix PR comments safely.

**Required upstream context:** `prUrl` or `prNumber`, repository identity, worktree path, worktree name, linked PR plan when available, and coding-session ledger state. If this context is missing, return to `coding-session` to recover it before running PR review.

**Worktree removal ownership (binding).** **Do not remove worktrees you do not own.** PR review runs in **`WORKTREE_ROOT`** for edits; it does **not** authorize **`git worktree remove`**, **`git worktree prune`**, or **`sedea_remove_worktree_folder`** on any other path. See [`.sedea/centers/sedea/rules/0_hosting-repo.mdc`](.sedea/centers/sedea/rules/0_hosting-repo.mdc) § *Worktree ownership* and rule **20** § *Worktree removal ownership (binding)*. **`git worktree list` is read-only** when ownership is unclear — **stop; do not remove**.

## Global `gh` exception (binding)

When a **global Cursor or developer rule** directs agents to use `gh` for GitHub tasks, that default **yields to this skill** for PR review-cycle operations. While inline **`pr-review`** is active on a **`coding-session`** lane, **`pr-review.mjs` is the only permitted interface** for comment collection, thread/review state, classification, reconciliation, replies, resolves, minimizes, and review re-requests — not generic `gh`, REST, or GraphQL substitutes.

**Permitted `gh` on this skill (narrow allowlist):** Step 0 worktree/URL resolution in the **worktree**; **`merged-pr-proceed`** merge-state verify (`gh pr view` for **`state` / merge metadata only**); invoker-owned **`gh pr create`** upstream (not this skill). **`check-pr-status`**, manual review submission, rebase, and merge paths on **`coding-session`** may use `gh` for **status/control** only — they do **not** replace Step 1 collection or Step 5 reconciliation.

## Structured choice (Mission Control)

Triage and fix loops use **AskQuestion**, **`MC_PHASED_RESPONSE_V1`** per **`.sedea/centers/sedea/rules/2_ask-question-instructions.mdc`** and **`../README.md`** § *Recap, structured choice, act* on the **`coding-session`** lane — **preferred:** recap (comment summary) + modal in one message. **Act** (code/plan edits) only after developer approval per this skill.

## Session orientation table (binding)

Give developers a **consistent state snapshot** during PR review cycles so they can re-orient after reload, tab switch, or parallel work.

**When required:** At every **Mandatory gate** below — render as the **first block** in `display.markdown`. **Forbidden:** omitting the table and substituting scattered one-liners.

**Table shape (markdown):**

| Field | Value |
|-------|-------|
| Plan | `<slug>` @ `<path>` or — |
| Worktree | `<absolute WORKTREE_ROOT>` or — |
| Branch | `<worktreeName>` or — |
| PR | `<url>` (#N) |
| Ship phase | `pr-review` |
| Deploy scope | — |
| Review | `prReviewStatus` · GitHub `reviewState` · open Must/Should counts |

**Population rules:** Same as [`.sedea/centers/research-and-development/missions/plan-and-deliver/skills/coding-session/SKILL.md`](../coding-session/SKILL.md) § *Session orientation table (binding)* — recover missing PR/worktree context from **`coding-session`** before triage.

**Mandatory gates (this skill):** Step **3b** disposition gate; Step **4** report + disposition gate; external-wait next-step modal after push; each cycle reopen when new comments land.

## Helper script

Script: `.sedea/centers/sedea/scripts/pr-review.mjs` (reads PAT from `GH_TOKEN`, then hosting-repo **`.sedea/mcp.json`**, then `~/.sedea/mcp.json` for token lookup only — see § *GitHub access*).

### Hosting repo cwd (`pr-review.mjs` and `plan-state.mjs`)

**`pr-review.mjs`** and **`plan-state.mjs`** run from **`HOSTING_ROOT`** (hosting repo whose root contains **`.sedea/`**), not from a worktree’s `git rev-parse --show-toplevel` alone. Canonical contract: [`.sedea/centers/research-and-development/rules/20_efficient-pr-shipping.mdc`](../../../../rules/20_efficient-pr-shipping.mdc) § *Hosting repo cwd for scripts (canonical)* and [`.sedea/centers/research-and-development/rules/31_dispatch-scope.mdc`](../../../../rules/31_dispatch-scope.mdc) § *Legacy CLI (`plan-state.mjs`) — hybrid only*.

- **`WORKTREE_ROOT`** — hosting repo worktree where you edit code (`git` / `gh` in Step 0).
- **`HOSTING_ROOT`** — walk up until **`.sedea/centers/sedea/`** or **`.sedea/`** exists; **`cd "$HOSTING_ROOT"`** before **`node …/plan-state.mjs`** or **`node …/pr-review.mjs`**.

The script reads input from (in order): **`PR_REVIEW_INPUT`** (absolute path to a JSON file — keeps payloads **outside** the repo).

### Input file and script: **always two separate steps**

The point is a **reviewable JSON payload** and a **stable allowlisted shell command** (`node .sedea/centers/sedea/scripts/pr-review.mjs` only) — **never** `printf … && node …` in one line.

1. **First step — write the input file only**
 Create a temp path outside the repo, e.g. `PRR_INPUT=$(mktemp /tmp/cursor-pr-review-input.XXXXXX)` (six trailing `X`). Use the **Write** tool to write the JSON to that **absolute** path (or a **Shell** that **only** writes the file and exits — **no** `&&` to the script).

2. **Second step — run the script only**
 A **separate** **Shell** invocation (from **`HOSTING_ROOT`**, not the worktree root alone):

 `cd "$HOSTING_ROOT" && PR_REVIEW_INPUT="<absolute-path-from-step-1>" node .sedea/centers/sedea/scripts/pr-review.mjs`

 No `echo`/`printf`/heredoc, no redirection, no `&&` chaining write + script on this line.

**Never** chain writing and executing in one shell line, for example:

`printf '…' > /tmp/foo.json && node .sedea/centers/sedea/scripts/pr-review.mjs`

That defeats the two-step workflow (re-approval noise, hides the clean script-only command). **Never** use a shell `for` loop that overwrites the input file and calls the script each iteration — put the full sequence in **one** JSON payload (single object or **array** of commands) and run the script **once**.

After success, `rm -f` the temp input file (optional). To invoke end-to-end: **Write** JSON to the temp path, then **Shell** the `cd … && PR_REVIEW_INPUT=… node …` line **once**.

Input format — **one object** (single command) or a **JSON array** of command objects executed in order:

```json
{"command":"threads","owner":"org","repo":"repo","pr":123}
```

```json
[
 {"command":"reply","owner":"org","repo":"repo","pr":123,"comment_id":456,"body":"**Fixed:** …"},
 {"command":"resolve","owner":"org","repo":"repo","pr":123,"thread_id":"PRRT_..."},
 {"command":"minimize","owner":"org","repo":"repo","pr":123,"node_id":"PRR_...","classifier":"RESOLVED"},
 {"command":"summary","owner":"org","repo":"repo","pr":123,"body":"### PR comments addressed …"}
]
```

Supported `command` values: `threads`, `reply`, `resolve`, `minimize`, `pr-for-branch`, `reviews`, `review-comments`, `pull-reviews`, `issue-comments`, `request-review`, `summary`.

### GitHub interface (binding)

When this skill is active, **`pr-review.mjs` is the only permitted GitHub interface** for PR review comment collection, thread/review state used for classification, and reconciliation.

| Operation | Required interface |
|-----------|--------------------|
| Collect comments (Step 1) | **`pr-review.mjs`** array only |
| Re-fetch before reconcile (Step 2 / Step 5) | **`pr-review.mjs`** array only |
| Reply / resolve / minimize / summary (Step 5) | **`pr-review.mjs`** array only |
| PR identity in worktree (Step 0) | **`pr-for-branch`** script command or known **`prUrl`** |
| Merge-state verify (`merged-pr-proceed`) | **`gh pr view`** for merge state only — no comment, thread, or review endpoints |

**Forbidden when this skill is active:** **`gh api`**, **`gh api graphql`**, **`gh pr view --json reviews,comments`**, or any REST / GraphQL call whose purpose is to collect, classify, reconcile, or verify PR review comments, threads, or reviews.

**First-action invariant:** If invoker context, user context, or an open gate references **`pr-review`**, the first GitHub-touching shell in that turn must be the Step 1 collect array:

```bash
cd "$HOSTING_ROOT" && PR_REVIEW_INPUT="<absolute-path>" node .sedea/centers/sedea/scripts/pr-review.mjs
```

Checking PR status during an open **`pr-review`** cycle is **not** exempt from this invariant unless the active pick is **`merged-pr-proceed`** or **`check-pr-status`** on **`coding-session`** (merge metadata only).

**Verification:** After Step 5, re-fetch using the same Step 1 script array. **Forbidden:** using **`gh api graphql`** for thread counts or review-state verification.

Superseded paths (token/config lookup only — **not** for listing threads or posting replies): GitHub MCP server ids such as **`github`** or **`user-github`** in **`.sedea/mcp.json`**. Those tools duplicate **`pr-review.mjs`** and inflate agent context.

## Cyclic review loop (binding)

After inline **`create-pr`** opens a PR, **`coding-session`** runs this skill **in cycles** until **`continuationStatus`** is **`terminal`**:

1. **Open PR** — inline **`create-pr`** records `prUrl` / `prNumber`; [Post-create-pr handoff gate](../coding-session/SKILL.md#post-create-pr-handoff-gate) opens same turn.
2. **Developer picks `start-pr-review`** — load this skill; **Step 1 `pr-review.mjs` collect array is the first GitHub-touching action** (not generic `gh` inspection).
3. **Triage** — Steps **1–4** below.
4. **Developer gate** — structured choice for dispositions and commit/push depth per rule **6**.
5. **Reconcile on GitHub** — Step **5** when required (same turn as push when fixes landed).
6. **Wait for reviewers** — external; open structured choice naming resume paths per rule **2** § *External-wait / next-step modal*.
7. **Loop** — when new comments land, return to step **2** on the **same lane** until every comment is fixed, skipped with rationale, captured as deferred work, or explicitly deferred by the developer.

## When coding-session executes `pr-review`

Optionally followed by a PR URL (e.g. *run pr-review on https://github.com/…/pull/123*).

### Step 0 — Resolve the PR

Determine the PR to review using the **first match**:
1. A URL is provided after `pr-review` → parse `owner`, `repo`, `pull_number` from it.
2. A PR was already reviewed earlier in this chat → reuse that `owner`, `repo`, `pull_number`.
3. Neither above → read the current worktree name ref (`git branch --show-current`), parse `owner`/`repo` from the git remote (`git remote get-url origin`), then look up the open PR via the `pr-for-branch` script command.

Always confirm which PR is being reviewed (print URL and title) before proceeding.

#### Link the PR to its plan sidecar (idempotent)

Before Step 1, attempt to upsert the resolved PR number into the Plan Board sidecar so `plan-reconcile` can later archive the plan when all linked PRs merge. This is the same `upsert-pr` call documented in rule **20** § *Commit and push cadence* step 4 ([`.sedea/centers/research-and-development/rules/20_efficient-pr-shipping.mdc`](../../../../rules/20_efficient-pr-shipping.mdc)) — running it here as well closes the gap when **`pr-review`** triage ends with all comments skipped (no follow-up commit-and-push pass, so that upsert never fires) or when the PR is otherwise quiet enough that no second push happens. The helper is idempotent, so running it on every **`pr-review`** invocation is harmless.

**`plan-state.mjs`** lives in the center tree: `.sedea/centers/research-and-development/missions/plan-and-deliver/scripts/plan-state.mjs`. On Mission Control lanes, prefer spawn **`inputs.targetPlanPath`** when known; otherwise **`resolve --cwd "$WORKTREE_ROOT"`** discovers the anchored plan under **`.sedea/operations/…/plans/`** — do **not** construct **`.sedea/operations/.../...`** or **`joint/plans`** paths. See rule **31** § *Dispatch scope (binding)*.

```bash
WORKTREE_ROOT="$(pwd)" # hosting repo worktree (after cd into it)
# HOSTING_ROOT: walk up until .sedea/centers/sedea/ exists — see rule 20 § *Resolve HOSTING_ROOT*
cd "$HOSTING_ROOT"

node .sedea/centers/research-and-development/missions/plan-and-deliver/scripts/plan-state.mjs \
  resolve --cwd "$WORKTREE_ROOT"
# → exit 0 prints "<slug>\t<planPath>"; exit 2 = no plan; other = error.

# If resolve succeeded, upsert the PR number from Step 0 into the sidecar:
node .sedea/centers/research-and-development/missions/plan-and-deliver/scripts/plan-state.mjs \
  upsert-pr \
  --slug <slug-from-resolve> \
  --repo "$(basename "$HOSTING_ROOT")" \
  --number <pull_number-from-Step-0>
```

Skip silently when `resolve` exits non-zero (session has no plan) or when `pull_number` is unknown (Step 0 fell through every resolution path). Never block **`pr-review`** on a helper failure — log and continue with Step 1.

**Capture the resolved slug + full `planPath`** (or the lack thereof) for Step 3a. Edit that same `<slug>.plan.md` (sidecar `<slug>.state.yaml` sits beside it). Re-running `resolve` later only to recover the path wastes a shell call when **`targetPlanPath`** is already in inline context.

### Step 1 — Collect comments (`pr-review.mjs` only — no `gh` substitute)

1. Use the resolved `owner`, `repo`, and `pull_number`.
2. Run **`pr-review.mjs` once** with a JSON **array** of commands (same `PR_REVIEW_INPUT` two-step workflow as above), in this order:
 - `{"command":"review-comments",...}` — REST: all inline PR review comments (ids, bodies, paths, lines, authors). Paginated inside the script.
 - `{"command":"pull-reviews",...}` — REST: all submitted pull request reviews (bodies, states, `node_id` for Step 5 minimize, authors).
 - `{"command":"threads",...}` — GraphQL: thread `id`, `isResolved`, per-comment `databaseId`, `isMinimized` / `minimizedReason`, path/line (thread metadata for resolve; **merge** with `review-comments` by matching `databaseId` to REST comment `id`).
 - `{"command":"reviews",...}` — GraphQL: top-level review `id`, `databaseId`, `state`, `isMinimized` / `minimizedReason`, author (bodies come from `pull-reviews` REST only, to keep GraphQL payloads small).
 - `{"command":"issue-comments",...}` — REST: timeline comments on the PR issue (for prior *PR comments addressed* summaries in Step 2).
3. Parse stdout: **one JSON value per array element**, each on its own line, in the same order as the input array (omit trailing commands only if you intentionally used a shorter array).
4. Deduplicate: a comment that appears both in a top-level review body and as an inline comment counts once.

### Step 2 — Filter out already-handled comments

**Always skip these before doing any validation or fixing — do not re-address them:**

- **Inline review comments / threads** where the thread's `isResolved` is `true` (from the `threads` command).
- **Inline review comments** where the comment itself has `isMinimized: true` (hidden/collapsed on GitHub).
- **Top-level reviews** where `isMinimized: true` (from the `reviews` command). These have already been collapsed by a prior run or a human.

Plain REST list endpoints do **not** expose `isResolved` or `isMinimized` for threads — cross-reference each inline comment's `id` (same value as GraphQL `databaseId`) against the `threads` GraphQL payload, and each top-level review against `reviews` GraphQL for `isMinimized`.

From the **`issue-comments`** line in the Step 1 script output, scan for prior *PR comments addressed* summaries from this workflow. Skip items already marked fixed or skipped in a previous round even if the thread was never resolved.

### Step 3 — Validate and classify

For each **new** (not filtered in Step 2) comment, verify it against the **current** codebase and assign one of five dispositions:

- **Must fix** — issue is valid, actionable, and blocks the PR before merge.
- **Should fix** — issue is valid and worth addressing in this PR if the developer approves the extra fix pass.
- **Rule-update required** — review feedback requires creating or updating hosting-repo **`.cursor/rules/*.mdc`** files (not product source alone). Classify here when the comment targets rule documentation, governance text, or §5-style hosting-repo rule alignment — even when no code change is needed. Hand off to **`coding-session`** [Post-review repo rules handoff](../coding-session/SKILL.md#post-review-repo-rules-handoff) after developer approval — do **not** silently edit `.mdc` files before the disposition gate.
- **Skipped (no follow-up)** — issue is already fixed in the working tree, factually wrong, or pure noise (e.g. linter chatter the project doesn't enforce). Nothing to track.
- **Skipped → follow-up** — issue is *valid* but *out of scope* for this PR's single concern. Strategy #6 forbids silently expanding the PR; propose a `## Follow-ups` bullet in Step 3a so the item isn't lost.

Do **not** apply fixes yet. First report the classification; then open the Step **3b** gate (below) — do **not** end the turn with prose “wait for approval”.

### Step 3b — Developer approval gate

Run this gate only after Step 3a has prepared proposed follow-ups and Step **4** has printed the classification report.

Before applying any code, plan, or GitHub changes, open the **disposition gate** in Step **4** (`MC_PHASED_RESPONSE_V1` or **AskQuestion** with the **contextual** option set in Step **4** § *Build disposition options*). **Do not** duplicate the gate in prose.

**Contextual options (binding):** List **only** disposition actions valid for this PR's Step 3 classification counts — see Step **4** § *Build disposition options*. **Forbidden:** showing **`apply-must`** or **`apply-must-should`** when **`mustCount`** and **`shouldCount`** are both **0**; showing **`apply-rule-updates`** when **`ruleUpdateCount`** is **0**; showing **`follow-ups-only`** when **`followUpCount`** is **0**. **`more-details`** is always included.

No source edits, plan edits, commits, pushes, GitHub replies, resolves, minimizes, or review re-requests may happen until the developer chooses an approval option shown in the modal.

When the approved scope includes **Follow-ups only** or includes any **Skipped → follow-up** comments, append only those approved bullets to the linked PR plan's `## Follow-ups` section before Step 5. If the developer rejects a proposed follow-up, do not mutate the plan or mention it as captured in GitHub reconciliation.

After approved fixes are applied, open a **second** structured-choice gate (commit/push options per Step **4** post-fix) before `git commit` or `git push` — do not commit or push silently.

### Step 3a — Propose out-of-scope flags as follow-ups

Per [`development-process.md`](../../../../docs/development-process.md) § *Cadence — Feedback Collection*, items surfaced by **an automated reviewer agent (for example Code Rabbit)** during PR review that aren't worth blocking the PR on land in the PR plan's `## Follow-ups` section as **Code Review Follow-ups** (Strategy #6 forbids the silent scope expansion; the follow-up is the safe escape valve). This step mirrors `pre-pr-review` runner Step 6 — same section, same bullet shape, same routing semantics — so **`plan-reconcile`** can drain both sources at archive time without distinguishing.

**Skip this step entirely** when Step 0's sub-step returned no slug (`resolve` exited non-zero, or no PR plan is linked yet). Acknowledge once: *"No plan linked to this PR; skipping follow-ups capture. Out-of-scope flags surface in the Step 4 report only — copy anything actionable into a new plan or follow-up issue if needed."*

Otherwise, for every comment marked **Skipped → follow-up** in Step 3, prepare a one-sentence bullet for the linked PR plan file **`planPath`** from Step 0 (absolute path from **`resolve`** or inline **`targetPlanPath`**). Do **not** append yet. The Step 3b developer approval gate must approve follow-up capture before any plan mutation. Each proposed bullet:

- Paraphrases the comment's substantive concern in one sentence — do **not** quote the GitHub body verbatim (the comment thread already preserves it).
- Carries an optional `(target: <hint>)` suffix when routing is obvious — `Master Plan`, `current phase plan`, `sibling plan`, `new-plan (standalone)`, `drop`.
- Will live at the bottom of the file if approved. If the PR plan has no `## Follow-ups` section yet, the approved mutation adds one at the bottom (after § 7 Caveats, or after § 6 if § 7 is omitted) using a single `StrReplace` that inserts the header + the new bullets in one shot.

Do **not** include `Must fix`, `Should fix`, or `Skipped (no follow-up)` items here — those don't survive the PR as follow-up planning items (`Must` / `Should` land in the diff after approval; `Skipped (no follow-up)` is noise by definition).

Acknowledge: *"Prepared <K> Code Review Follow-ups for `<slug>.plan.md` § Follow-ups; awaiting developer approval before appending."*

Plan files live under **`.sedea/operations/`** on the primary hosting repo. In the Sedea `app` monorepo, see `.sedea/centers/sedea/rules/0_hosting-repo.mdc`: that tree is often its **own** git repository, gitignored or submodule-pinned from the monorepo. Edits to `*.plan.md` / `*.state.yaml` therefore may **not** appear in the hosting repo worktree's `git status`. Sync plan changes through whatever workflow owns the operations repository (for example a dedicated `operations` commit), not only the `app` PR — rule **20** § *Commit and push cadence* still commits hosting-repo source changes as usual when the developer requests *commit* / *push* in the same message.

### Step 4 — Report and disposition gate

Print **every** comment in its original form (quote the body). For each one, state one of five dispositions:

- **Must fix** — why it blocks and what edit is proposed or applied after approval.
- **Should fix** — why it is useful and what edit is proposed or applied after approval.
- **Rule-update required** — which **`.cursor/rules/*.mdc`** path(s) need create/update and why; reference [Post-review repo rules handoff](../coding-session/SKILL.md#post-review-repo-rules-handoff) as the follow-up path on the open PR.
- **Skipped (no follow-up)** — why it doesn't apply (already fixed, factually wrong, pure noise).
- **Skipped → follow-up** — paraphrase the planning concern + the `(target: …)` hint (if any) proposed in Step 3a. Reference the slug so the user can approve or reject: *"Proposed for `<slug>.plan.md` § Follow-ups."*

Do **not** reply to, resolve, or minimize any threads yet.

**Next-step modal (binding):** After the report, emit **`MC_PHASED_RESPONSE_V1`** (preferred on **`coding-session`** spawned lanes — sentinel line **1**, report recap in **`display.markdown`**) or the **AskQuestion** tool with the **contextual** Step **3b** option set from § *Build disposition options* below. The developer may review on GitHub or inspect local diffs **while the modal stays open**; they continue by **selecting an option**, not free-form chat.

#### Build disposition options (contextual — binding)

After Step 3 classification, compute:

| Variable | Rule |
|----------|------|
| **`mustCount`** | Comments classified **Must fix** |
| **`shouldCount`** | Comments classified **Should fix** |
| **`ruleUpdateCount`** | Comments classified **Rule-update required** |
| **`followUpCount`** | Comments classified **Skipped → follow-up** |
| **`skippedOnly`** | **`mustCount === 0`** and **`shouldCount === 0`** and **`ruleUpdateCount === 0`** and **`followUpCount === 0`** and at least one **Skipped (no follow-up)** |

**`display.markdown`** (required before modal):

1. Triage counts — one line or table: Must / Should / Rule-update required / Skipped (no follow-up) / Skipped → follow-up.
2. **Omitted-options explainer** when any standard option is hidden — e.g. *"Apply Must / Apply Must + Should are not shown — 0 Must and 0 Should items on this PR."*

**`askQuestion.options`** — include **only** applicable rows (always end with **`more-details`**):

| Option id | Include when | Label (brief) |
|-----------|--------------|---------------|
| `apply-must` | **`mustCount > 0`** | Apply Must fixes only |
| `apply-must-should` | **`mustCount > 0` or `shouldCount > 0`** | Apply Must + Should fixes |
| `apply-rule-updates` | **`ruleUpdateCount > 0`** | Apply rule updates — `.mdc` edits on open PR |
| `follow-ups-only` | **`followUpCount > 0`** | Follow-ups only — no source edits |
| `skip-reject` | Triage non-empty | When **`skippedOnly`**: *Skip / reject — reconcile on GitHub (recommended)*; else *Skip / reject selected comments* |
| `submit-manual-review` | **`skippedOnly`** or (**`followUpCount > 0`** and **`mustCount === 0`** and **`shouldCount === 0`**) | Submit manual review on GitHub — open **`coding-session`** [Manual review submission (external-wait)](../coding-session/SKILL.md#manual-review-submission-external-wait) |
| `merged-pr-proceed` | **`prNumber`** or **`prUrl`** known (always during PR ship chain) | PR merged — proceed with cleanup — **Act** per § *Merged-forward act mapping* below |
| `more-details` | Always | More details for option _ |

**Merged-forward (binding):** Include **`merged-pr-proceed`** on **every** disposition gate, post-fix commit/push gate, and external-wait resume modal while **`prNumber`** or **`prUrl`** is set — **even when** last `gh pr view` showed **`OPEN`**. **Forbidden:** omitting **`merged-pr-proceed`** because merge status was stale; using **`check-pr-status`** alone as the only way to discover developer merge on GitHub.

**Act mapping:** selecting an option not shown in the modal is impossible; do not treat hidden options as implicit consent. When the developer picks **`submit-manual-review`**, run **`coding-session`** [Manual review submission (external-wait)](../coding-session/SKILL.md#manual-review-submission-external-wait) — do not run Step **5 — GitHub only** on that turn. When the developer picks **`merged-pr-proceed`**, run § *Merged-forward act mapping* below.

#### Merged-forward act mapping (binding)

Run on the **developer's response turn** when they pick **`merged-pr-proceed`**:

1. **`gh pr view <n> --json state,mergedAt,mergeCommit,url`** — always refresh on pick; never trust stale session state.
2. **If `state: merged`:** Set inline result fields `prState: merged`, `mergeSha`, `mergedAt`, `shipPhase: pr-merged`, `prReviewStatus: terminal`, `continuationStatus: terminal`. On **`coding-session`** invoker lanes, continue with [Post-create-pr handoff gate](../coding-session/SKILL.md#post-create-pr-handoff-gate) **`spawn-after-deploy-walk`** **Act** (post-merge cleanup → After deploy walk when applicable).
3. **If `state: open`:** One line: *PR still open on GitHub — pick again after merge or choose another path.* Re-open the same gate **with `merged-pr-proceed` still listed**.

**Example fixtures** (illustrative `askQuestion.options` after counts):

| Scenario | Typical options |
|----------|-----------------|
| Must present | `apply-must`, `apply-must-should`, `skip-reject`, `merged-pr-proceed`, `more-details` |
| Rule-update only (0 Must / 0 Should / 0 follow-up) | `apply-rule-updates`, `skip-reject`, `submit-manual-review`, `merged-pr-proceed`, `more-details` |
| Skip-only (0 Must / 0 Should / 0 rule-update / 0 follow-up) | `skip-reject` (recommended), `submit-manual-review`, `merged-pr-proceed`, `more-details` |
| Follow-up only (0 Must / 0 Should / 0 rule-update) | `follow-ups-only`, `submit-manual-review`, `skip-reject`, `merged-pr-proceed`, `more-details` |
| Mixed (Must + follow-up) | `apply-must`, `apply-must-should`, `follow-ups-only`, `skip-reject`, `merged-pr-proceed`, `more-details` |
| Mixed (rule-update + code) | `apply-must`, `apply-must-should`, `apply-rule-updates`, `skip-reject`, `merged-pr-proceed`, `more-details` |

**Forbidden:** “Review the PR and tell me when to continue”, “wait for the user to review”, fixed five-option menus when counts make options inert, or ending the turn without structured choice when dispositions need approval.

**Act** (edits, plan append, GitHub reconciliation) runs on the **developer's response turn** after modal selection — not in the same turn as the disposition gate.

When the developer picks **`apply-rule-updates`**, run **`coding-session`** [Post-review repo rules handoff](../coding-session/SKILL.md#post-review-repo-rules-handoff) on the **next** turn — apply approved **`.mdc`** edits in **`WORKTREE_ROOT`**, commit/push to the **same open PR**, then re-run Step **5** in the **same turn** as push. When **`apply-rule-updates`** is combined with **`apply-must`** / **`apply-must-should`**, complete code fixes first, then run the rule-update handoff before Step **5**.

When fixes are applied and ready to land, use a **separate** structured-choice gate before commit/push. Include at least:

1. **Commit and push** (same message must say *commit* / *push* per **`.sedea/centers/sedea/rules/6_git-commit-push-gate.mdc`**) — when Step 4 ran in this chat, rule **20** § *Commit and push cadence* step 3 requires **this skill’s Step 5 (GitHub only)** in the **same agent turn** after push, before plan upsert and **create-pr** prompt.
2. **Revise dispositions or fixes**
3. **Defer — stay on pr-review**
4. **`merged-pr-proceed`** — *PR merged — proceed with cleanup* (when **`prNumber`** / **`prUrl`** known)
5. **More details for option _**

If all comments were **Skipped (no follow-up)** with **no** code edits, the Step **3b** pick may authorize proceeding directly to Step **5 — GitHub only** (skipped-only path).

### Step 5 — GitHub reconciliation (after commit and push or skipped-only)

**Entry points:**

- **After commit and push (normal path)** — [`.sedea/centers/research-and-development/rules/20_efficient-pr-shipping.mdc`](../../../../rules/20_efficient-pr-shipping.mdc) § *Commit and push cadence* runs **git commit + push** in steps 1–2 first (same user message). The agent handling that cadence must then run **this skill’s Step 5 — GitHub only** as **step 3** (same agent turn), **before** plan upsert and **create-pr** prompt. Do **not** treat the cadence as finished at push if Step 4 ran in this chat and GitHub is still open.

- **Skipped-only triage** — Step 3 marked every comment **Skipped (no follow-up)** with **no** code edits: run **GitHub only** immediately (no commit/push).

**GitHub only** (two-step `PR_REVIEW_INPUT` + `node .sedea/centers/sedea/scripts/pr-review.mjs` per § *Input file and script* — never chain write + script):

1. **Reply + resolve** each inline thread using approved dispositions from Step 4 — **Must fix**, **Should fix**, **Skipped (no follow-up)**, or **Skipped → follow-up** (same paraphrase + `(target: …)` as Step 3a) plus short reasoning, then resolve the thread.

2. **Minimize** every top-level review (`PRR_` node) from **every** reviewer (CodeRabbit, Brin, humans) with `{"command":"minimize",...,"node_id":"PRR_...","classifier":"RESOLVED"}`. Use GraphQL `reviews` + REST `pull-reviews` from Step 1. One JSON **array** of `minimize` objects; one script invocation.

3. **Re-request review** from the **automated reviewer** when any `pull-reviews` entry from that reviewer has `state` **CHANGES_REQUESTED** — use the reviewer login from Step 1 `pull-reviews` (for example `{"command":"request-review",...,"reviewers":["<automated-reviewer-login>"]}`).

4. **Summary** comment — `{"command":"summary",...}` with body shaped like:

```
### PR comments addressed (commit abc1234)

- [x] Fixed: URL-encode `timezone` param in api.ts
- [x] Fixed: aggregate loading state in LiveFeed
- [ ] Skipped: query keys not app-scoped (app switch reloads page)
- [~] Skipped → follow-up: extract shared retry helper (captured to `<slug>.plan.md` § Follow-ups, target: current phase plan)
```

The `[~]` marker plus the explicit "captured to … § Follow-ups" pointer lets reviewers cross-reference what was deferred without leaving the GitHub comment thread. Use one bullet per comment, mirroring the dispositions assigned in Step 4. Replace `abc1234` with `git rev-parse --short HEAD` after the push in rule **20** § *Commit and push cadence* (or the commit you just pushed).

If Step 1 payloads are **missing or stale** in context (new comments since fetch, fresh chat), re-run **Step 1**’s `pr-review.mjs` array for the same `owner` / `repo` / `pull_number`, then run **GitHub only** above — do **not** start a second full **`pr-review`** triage unless you truly cannot resolve the PR identity.

### Step 5 turn invariant (binding)

When this chat ran **`pr-review`** Steps **1–4** and the developer picked **`apply-must`**, **`apply-must-should`**, or **`fix-now-session`**, then the agent commits/pushes (or takes the skipped-only path with no edits), **Step 5 must run in that same assistant turn** before any **`MC_PHASED_RESPONSE_V1`** that offers merge, re-triage, post-create-pr forward paths, or “next cycle” options.

**Forbidden:**

- Ending the turn at **`git push`** success without Step 5 when Step 4 ran in-session.
- Offering **`start-pr-review`** / **`rerun-pr-review`** as the primary path when only Step 5 was skipped — use **`reconcile-github-only`** at [Post-create-pr handoff gate](../coding-session/SKILL.md#post-create-pr-handoff-gate) instead.
- Stating ship cadence or **`mergeDelegationReady`** complete while **`CHANGES_REQUESTED`** reviews or unresolved dispositioned threads remain.

**Skipped-only path:** When Step 3 marked every comment **Skipped (no follow-up)** with **no** code edits, Step 5 runs immediately in the disposition response turn (no commit/push) — still **same turn** as the Step 3b pick.

### Reconciliation completeness checklist (binding)

Set **`outputs.githubReconciliationStatus: complete`** only when **all** pass (re-fetch Step 1 payloads when stale):

| # | Check |
|---|--------|
| 1 | **Inline threads:** every dispositioned comment has an agent **reply** |
| 2 | **Resolve:** every dispositioned thread has **`isResolved: true`** (resolve any still open) |
| 3 | **Top-level reviews:** every non-minimized **`PRR_`** from bot/human reviewers is **minimized** with `classifier: RESOLVED` when dispositions are addressed or skipped with rationale |
| 4 | **Summary:** **`summary`** command posted with commit short SHA and bullets mirroring Step 4 dispositions |

Until all four pass, keep **`githubReconciliationStatus: pending`** and **`mergeDelegationReady: false`**.

## §8 host sync (via coding-session)

Runs **inline** on the **`coding-session`** lane. When triage reaches a stable milestone, the **`coding-session`** agent **must** re-emit **`AGENT_RESULT_RESPONSE_V1`** with §8 **`outputs`** so Mission Control host sync updates the Squad Leader ledger (**`../../plan.mdc`** §8).

| Milestone | `shipPhase` | Required `outputs` |
|-----------|-------------|-------------------|
| PR comments triaged / reconciliation done | `pr-review` | `targetPlanPath`, `shipPhase`, `rowStatus`, `prReviewStatus`, `githubReconciliationStatus`, `mergeDelegationReady`, `remainingTasks` |
| Agent merged PR (delegated path) | `pr-merged` | `targetPlanPath`, `shipPhase`, `rowStatus`, `prUrl`, `prNumber`, `mergeSha`, `mergedAt` |

**Forbidden:** nudging manual **Ship recap** on the leader dispatch.

## Inline result for coding-session

**Inline-only** — no **`## Completion (spawned)`**, no **Host protocol line**, no **`AGENT_RESULT_RESPONSE_V1`** on this lane (see **`.sedea/centers/sedea/rules/4_mission.mdc`** § *Inline completion* and **[`../README.md`](../README.md)** § *Inline-only*).

Return results through the active **`coding-session`** lane, not as a child-agent result. **`coding-session`** must include these fields in its spawned handoff or inline completion:

- `outputs.prReviewStatus`
- `outputs.prReviewComments`
- `outputs.prReviewDispositions`
- `outputs.prReviewBlockers`
- `outputs.prReviewFollowUps`
- `outputs.githubReconciliationStatus`
- `outputs.mergeDelegationReady`
- `outputs.prState` / `outputs.mergeSha` / `outputs.mergedAt` when **`merged-pr-proceed`** confirms merge
- `outputs.shipPhase` (`pr-review` or `pr-merged`)
- `outputs.remainingTasks`
- `outputs.continuationStatus`

Set **`outputs.mergeDelegationReady: true`** when **all** apply:

1. Every fetched review comment has an approved disposition (fixed, skipped with rationale, or captured follow-up).
2. **`outputs.githubReconciliationStatus: complete`** — Step 5 checklist passed (§ *Reconciliation completeness checklist*), or the skipped-only path completed with no pending Must fixes (skipped-only triage with no code edits also sets **`complete`** — no separate **`skipped`** value on the merge path).
3. No open **Must fix** blockers remain on this PR.
4. `outputs.prReviewStatus` is **`terminal`** for this triage pass.

Otherwise set **`mergeDelegationReady: false`** — **`coding-session`** must not open [Pre-merge authorization gate](../coding-session/SKILL.md#pre-merge-authorization-gate) or run [Merge procedure](../coding-session/SKILL.md#merge-procedure) until a later pass clears blockers.

**`githubReconciliationStatus` values:** `complete` (checklist passed or skipped-only path with no GitHub actions required), `pending` (Step 5 required or incomplete). Do **not** use a separate **`skipped`** value when **`mergeDelegationReady`** must be true — map skipped-only to **`complete`**.

Keep `continuationStatus: "active"` until every PR review comment is fixed, skipped with rationale, converted to follow-up, or explicitly deferred by the developer, and GitHub reconciliation has run when required.

This skill is **inline-only** on the **`plan and deliver`** mission — no **`AGENT_RUN_REQUEST_V1`**, no **`AGENT_RESULT_RESPONSE_V1`** on this lane. See **[`../README.md`](../README.md)** § Inline-only.
