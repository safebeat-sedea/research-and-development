---
name: pr-review
description: >-
  Inline coding-session procedure for GitHub PR comment triage and fix loops.
  Executed by the active coding-session agent only — not spawned, no warmUpRules.
  Resolves comments only after developer approval.
---

# PR Review Workflow

**Lane requirement (no separate warm-up).** This skill has **no** frontmatter **`warmUpRules`** by design. Run it **only** on the active **`coding-session`** lane after that session has loaded ship rules (**`20_efficient-pr-shipping`**, **`.sedea/centers/research-and-development/missions/plan-and-deliver/plan.mdc`**, **`skills/README.md`**, dev-process). Do **not** start a standalone Mission Control session on **`pr-review`** alone — context will be incomplete.

### Standalone dispatch (stop immediately)

If Mission Control opened a session whose only intent is **`pr-review`** / *triage PR comments* with **no** active **`coding-session`** context (`prUrl`, worktree, branch, PR plan, pre-PR history):

1. **Stop** — do not run Steps 1–5 or **`pr-review.py`**.
2. Tell the developer **`pr-review`** is **inline-only** on the **`coding-session`** lane.
3. Direct them to open or return to **`coding-session`** (detached phrase, snapshot, or **`plan and deliver`** ship path) with PR identity loaded, then invoke triage from that lane.

**Execution owner:** the active **coding-session agent** runs this skill inline. Do not spawn a separate `pr-review` agent. The coding-session lane has the implementation context, worktree, branch, PR plan, prior pre-PR review findings, and developer approvals needed to evaluate and fix PR comments safely.

**Required upstream context:** `prUrl` or `prNumber`, repository identity, worktree path, branch name, linked PR plan when available, and coding-session ledger state. If this context is missing, return to `coding-session` to recover it before running PR review.

## Helper script

Script: `.sedea/centers/research-and-development/missions/plan-and-deliver/scripts/pr-review.py` (reads PAT from `GH_TOKEN`, then hosting-repo **`.sedea/mcp.json`**, then `~/.sedea/mcp.json` — config only; **do not invoke the GitHub MCP** during **`pr-review`**).

The script reads input from (in order): **`PR_REVIEW_INPUT`** (absolute path to a JSON file — keeps payloads **outside** the repo).

### Input file and script: **always two separate steps**

The point is a **reviewable JSON payload** and a **stable allowlisted shell command** (`python3 .sedea/centers/research-and-development/missions/plan-and-deliver/scripts/pr-review.py` only) — **never** `printf … && python3 …` in one line.

1. **First step — write the input file only**  
   Create a temp path outside the repo, e.g. `PRR_INPUT=$(mktemp /tmp/cursor-pr-review-input.XXXXXX)` (six trailing `X`). Use the **Write** tool to write the JSON to that **absolute** path (or a **Shell** that **only** writes the file and exits — **no** `&&` to the script).

2. **Second step — run the script only**  
   A **separate** **Shell** invocation:

   `cd <implementation-repo-root> && PR_REVIEW_INPUT="<absolute-path-from-step-1>" python3 .sedea/centers/research-and-development/missions/plan-and-deliver/scripts/pr-review.py`

   No `echo`/`printf`/heredoc, no redirection, no `&&` chaining write + script on this line.

**Never** chain writing and executing in one shell line, for example:

`printf '…' > /tmp/foo.json && python3 .sedea/centers/research-and-development/missions/plan-and-deliver/scripts/pr-review.py`

That defeats the two-step workflow (re-approval noise, hides the clean script-only command). **Never** use a shell `for` loop that overwrites the input file and calls the script each iteration — put the full sequence in **one** JSON payload (single object or **array** of commands) and run the script **once**.

After success, `rm -f` the temp input file (optional). To invoke end-to-end: **Write** JSON to the temp path, then **Shell** the `cd … && PR_REVIEW_INPUT=… python3 …` line **once**.

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

### GitHub MCP is **out of scope** for `pr-review`

Do **not** call **`user-github`** (or any other GitHub MCP) to list reviews, comments, or threads. That duplicates the script, stresses the agent UI with huge payloads, and is forbidden here. **All** GitHub reads and writes for this workflow go through **`cd <implementation-repo-root> && PR_REVIEW_INPUT="<absolute-path-from-step-1>" python3 .sedea/centers/research-and-development/missions/plan-and-deliver/scripts/pr-review.py`** (plus `git` / `gh` in Step 0 only if you already use them for branch or URL resolution — optional; `pr-for-branch` in the script is preferred when resolving the PR from the current branch).

## When coding-session executes `pr-review`

Optionally followed by a PR URL (e.g. *run pr-review on https://github.com/…/pull/123*).

### Step 0 — Resolve the PR

Determine the PR to review using the **first match**:
1. A URL is provided after `pr-review` → parse `owner`, `repo`, `pull_number` from it.
2. A PR was already reviewed earlier in this chat → reuse that `owner`, `repo`, `pull_number`.
3. Neither above → get the current branch (`git branch --show-current`), parse `owner`/`repo` from the git remote (`git remote get-url origin`), then look up the open PR via the `pr-for-branch` script command.

Always confirm which PR is being reviewed (print URL and title) before proceeding.

#### Link the PR to its plan sidecar (idempotent)

Before Step 1, attempt to upsert the resolved PR number into the Plan Board sidecar so `plan-reconcile` can later archive the plan when all linked PRs merge. This is the same `upsert-pr` call documented in rule **20** § *Commit and push cadence* step 4 ([`.sedea/centers/research-and-development/rules/20_efficient-pr-shipping.mdc`](../../../../rules/20_efficient-pr-shipping.mdc)) — running it here as well closes the gap when **`pr-review`** triage ends with all comments skipped (no follow-up commit-and-push pass, so that upsert never fires) or when the PR is otherwise quiet enough that no second push happens. The helper is idempotent, so running it on every **`pr-review`** invocation is harmless.

**`plan-state.mjs`** lives in the center tree: `.sedea/centers/research-and-development/missions/plan-and-deliver/scripts/plan-state.mjs`. It discovers plans only under the **union** of `.sedea/operations/joint/...` (literal `joint`) and `.sedea/operations/<operationsUserId>/...` on the **hosting repo** (parent directory of `.sedea/`). Pass the per-user scope when needed:

- **`--operations-user-id <id>`** before the subcommand (from Mission Control **`operationsUserId`** in agent runs, or explicit CLI).

If the id is omitted, only `joint` plans are visible (stderr warns once). **Slug collision:** the same slug in both trees → the **user** tree wins (listed first).

```bash
ROOT="$(git rev-parse --show-toplevel)"
PLAN_STATE="$ROOT/.sedea/centers/research-and-development/missions/plan-and-deliver/scripts/plan-state.mjs"
# Optional first args: --operations-user-id <id>  (before the subcommand), e.g.
# node -- "$PLAN_STATE" --operations-user-id "<id>" resolve --cwd "$PWD"

node -- "$PLAN_STATE" resolve --cwd "$PWD"
# → exit 0 prints "<slug>\t<planPath>"; exit 2 = no plan; other = error.

# If resolve succeeded, upsert the PR number from Step 0 into the sidecar:
node -- "$PLAN_STATE" upsert-pr \
  --slug <slug-from-resolve> \
  --repo "$(basename "$ROOT")" \
  --number <pull_number-from-Step-0>
```

Skip silently when `resolve` exits non-zero (session has no plan) or when `pull_number` is unknown (Step 0 fell through every branch). Never block **`pr-review`** on a helper failure — log and continue with Step 1.

**Capture the resolved slug + full `planPath`** (or the lack thereof) for Step 3a. After `resolve`, parse the path segment immediately after `.sedea/operations/` — it is either **`joint`** or the **user uuid** — and edit that same `<slug>.plan.md` (sidecar `<slug>.state.yaml` sits beside it). Re-running `resolve` later only to recover the path wastes a shell call.

### Step 1 — Collect comments (**script only**)

1. Use the resolved `owner`, `repo`, and `pull_number`.
2. Run **`pr-review.py` once** with a JSON **array** of commands (same `PR_REVIEW_INPUT` two-step workflow as above), in this order:
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

For each **new** (not filtered in Step 2) comment, verify it against the **current** codebase and assign one of four dispositions:

- **Must fix** — issue is valid, actionable, and blocks the PR before merge.
- **Should fix** — issue is valid and worth addressing in this PR if the developer approves the extra fix pass.
- **Skipped (no follow-up)** — issue is already fixed in the working tree, factually wrong, or pure noise (e.g. linter chatter the project doesn't enforce). Nothing to track.
- **Skipped → follow-up** — issue is *valid* but *out of scope* for this PR's single concern. Strategy #6 forbids silently expanding the PR; propose a `## Follow-ups` bullet in Step 3a so the item isn't lost.

Do **not** apply fixes yet. First report the classification and wait for explicit developer approval through `coding-session`.

### Step 3b — Developer approval gate

Run this gate only after Step 3a has prepared proposed follow-ups and Step 4 has reported the full classification to the developer.

Before applying any code, plan, or GitHub changes, **coding-session** must ask the developer with **AskQuestion**. Required options:

1. **Apply Must fixes** — edit only PR-blocking comments.
2. **Apply Must + Should fixes** — edit blockers and approved non-blocking fixes.
3. **Follow-ups only** — append out-of-scope follow-ups, no source edits.
4. **Skip / reject selected comments** — developer provides rationale before GitHub replies.
5. **More details for option _**

No source edits, plan edits, commits, pushes, GitHub replies, resolves, minimizes, or review re-requests may happen until the developer chooses an approval option.

When the approved scope includes **Follow-ups only** or includes any **Skipped → follow-up** comments, append only those approved bullets to the linked PR plan's `## Follow-ups` section before Step 5. If the developer rejects a proposed follow-up, do not mutate the plan or mention it as captured in GitHub reconciliation.

After approved fixes are applied, stop for developer review before commit/push. Do not commit or push silently.

### Step 3a — Propose out-of-scope flags as follow-ups

Per [`development-process.md`](../../../../docs/development-process.md) § *Cadence — Feedback Collection*, items surfaced by **a reviewer-agent (Slink or Code Rabbit)** during PR review that aren't worth blocking the PR on land in the PR plan's `## Follow-ups` section as **Code Review Follow-ups** (Strategy #6 forbids the silent scope expansion; the follow-up is the safe escape valve). This step mirrors `pre-pr-review` runner Step 6 — same section, same bullet shape, same routing semantics — so **`plan-reconcile`** can drain both sources at archive time without distinguishing.

**Skip this step entirely** when Step 0's sub-step returned no slug (`resolve` exited non-zero, or no PR plan is linked yet). Acknowledge once: *"No plan linked to this PR; skipping follow-ups capture. Out-of-scope flags surface in the Step 4 report only — copy anything actionable into a new plan or follow-up issue if needed."*

Otherwise, for every comment marked **Skipped → follow-up** in Step 3, prepare a one-sentence bullet for the linked PR plan file **`planPath`** from Step 0 (`…/.sedea/operations/joint/plans/<slug>.plan.md` or `…/.sedea/operations/<operationsUserId>/plans/<slug>.plan.md`). Do **not** append yet. The Step 3b developer approval gate must approve follow-up capture before any plan mutation. Each proposed bullet:

- Paraphrases the comment's substantive concern in one sentence — do **not** quote the GitHub body verbatim (the comment thread already preserves it).
- Carries an optional `(target: <hint>)` suffix when routing is obvious — `Master Plan`, `current phase plan`, `sibling plan`, `new-plan (standalone)`, `drop`.
- Will live at the bottom of the file if approved. If the PR plan has no `## Follow-ups` section yet, the approved mutation adds one at the bottom (after § 7 Caveats, or after § 6 if § 7 is omitted) using a single `StrReplace` that inserts the header + the new bullets in one shot.

Do **not** include `Must fix`, `Should fix`, or `Skipped (no follow-up)` items here — those don't survive the PR as follow-up planning items (`Must` / `Should` land in the diff after approval; `Skipped (no follow-up)` is noise by definition).

Acknowledge: *"Prepared <K> Code Review Follow-ups for `<slug>.plan.md` § Follow-ups; awaiting developer approval before appending."*

Plan files live under **`.sedea/operations/`** on the hosting checkout. In the Sedea `app` monorepo, see `.sedea/centers/sedea/rules/0_hosting-checkout.mdc`: that tree is often its **own** git repository, gitignored or submodule-pinned from the monorepo. Edits to `*.plan.md` / `*.state.yaml` therefore may **not** appear in the implementation repo's `git status`. Sync plan changes through whatever workflow owns the operations checkout (for example a dedicated `operations` commit), not only the `app` PR — rule **20** § *Commit and push cadence* still commits implementation-repo source changes as usual when the developer requests *commit* / *push* in the same message.

### Step 4 — Report

Print **every** comment in its original form (quote the body). For each one, state one of four dispositions:

- **Must fix** — why it blocks and what edit is proposed or applied after approval.
- **Should fix** — why it is useful and what edit is proposed or applied after approval.
- **Skipped (no follow-up)** — why it doesn't apply (already fixed, factually wrong, pure noise).
- **Skipped → follow-up** — paraphrase the planning concern + the `(target: …)` hint (if any) proposed in Step 3a. Reference the slug so the user can approve or reject: *"Proposed for `<slug>.plan.md` § Follow-ups."*

Do **not** reply to, resolve, or minimize any threads yet. Wait for the user to review the changes first.

If there are code changes to review, wait for the user before committing. If all comments were skipped (no code changes), proceed to Step 5 only after the developer approves the skipped dispositions and any proposed follow-ups.

After Step 4, use **AskQuestion** (per **`.sedea/centers/sedea/rules/2_ask-question-instructions.mdc`**) when fixes may be ready to land. Include at least:

1. **Commit and push** (same message must say *commit* / *push* per **`.sedea/centers/sedea/rules/6_git-commit-push-gate.mdc`**) — when Step 4 ran in this chat, rule **20** § *Commit and push cadence* step 3 requires **this skill’s Step 5 (GitHub only)** in the **same agent turn** after push, before plan upsert and **create-pr** prompt.
2. **Revise dispositions or fixes**
3. **Defer — stay on pr-review**
4. **More details for option _**

### Step 5 — GitHub reconciliation (after commit and push or skipped-only)

**Entry points:**

- **After commit and push (normal path)** — [`.sedea/centers/research-and-development/rules/20_efficient-pr-shipping.mdc`](../../../../rules/20_efficient-pr-shipping.mdc) § *Commit and push cadence* runs **git commit + push** in steps 1–2 first (same user message). The agent handling that cadence must then run **this skill’s Step 5 — GitHub only** as **step 3** (same agent turn), **before** plan upsert and **create-pr** prompt. Do **not** treat the cadence as finished at push if Step 4 ran in this chat and GitHub is still open.

- **Skipped-only triage** — Step 3 marked every comment **Skipped (no follow-up)** with **no** code edits: run **GitHub only** immediately (no commit/push).

**GitHub only** (two-step `PR_REVIEW_INPUT` + `python3 .sedea/centers/research-and-development/missions/plan-and-deliver/scripts/pr-review.py` per § *Input file and script* — never chain write + script):

1. **Reply + resolve** each inline thread using approved dispositions from Step 4 — **Must fix**, **Should fix**, **Skipped (no follow-up)**, or **Skipped → follow-up** (same paraphrase + `(target: …)` as Step 3a) plus short reasoning, then resolve the thread.

2. **Minimize** every top-level review (`PRR_` node) from **every** reviewer (CodeRabbit, Brin, humans) with `{"command":"minimize",...,"node_id":"PRR_...","classifier":"RESOLVED"}`. Use GraphQL `reviews` + REST `pull-reviews` from Step 1. One JSON **array** of `minimize` objects; one script invocation.

3. **Re-request review** from `slink-ai` if any `pull-reviews` entry from `slink-ai` has `state` **CHANGES_REQUESTED** — `{"command":"request-review",...,"reviewers":["slink-ai"]}`.

4. **Summary** comment — `{"command":"summary",...}` with body shaped like:

```
### PR comments addressed (commit abc1234)

- [x] Fixed: URL-encode `timezone` param in api.ts
- [x] Fixed: aggregate loading state in LiveFeed
- [ ] Skipped: query keys not app-scoped (app switch reloads page)
- [~] Skipped → follow-up: extract shared retry helper (captured to `<slug>.plan.md` § Follow-ups, target: current phase plan)
```

The `[~]` marker plus the explicit "captured to … § Follow-ups" pointer lets reviewers cross-reference what was deferred without leaving the GitHub comment thread. Use one bullet per comment, mirroring the dispositions assigned in Step 4. Replace `abc1234` with `git rev-parse --short HEAD` after the push in rule **20** § *Commit and push cadence* (or the commit you just pushed).

If Step 1 payloads are **missing or stale** in context (new comments since fetch, fresh chat), re-run **Step 1**’s `pr-review.py` array for the same `owner` / `repo` / `pull_number`, then run **GitHub only** above — do **not** start a second full **`pr-review`** triage unless you truly cannot resolve the PR identity.

## Leader §8 recap (via coding-session)

Runs **inline** on the **`coding-session`** lane. When triage reaches a stable milestone, ask the developer to paste **Ship recap — plan and deliver** on the **plan and deliver** leader dispatch (**`../../plan.mdc`** §8).

| Milestone | `shipPhase` | Copy into recap |
|-----------|-------------|-----------------|
| PR comments triaged / reconciliation done | `pr-review` | `targetPlanPath`, `prReviewStatus`, `githubReconciliationStatus`, `remainingTasks` |

The **`coding-session`** agent carries the same fields in **`## Inline result for coding-session`** and **`coding-session`** § *Squad Leader bubble-up*.

## Inline result for coding-session

**Inline-only** — no **`## Completion (spawned)`**, no **Host protocol line**, no **`AGENT_RESULT_RESPONSE_V1`** on this lane (see **`.sedea/centers/sedea/rules/4_mission.mdc`** § *Inline completion* and **[`../README.md`](../README.md)** § *Inline-only*).

Return results through the active **`coding-session`** lane, not as a child-agent result. **`coding-session`** must include these fields in its spawned handoff or inline completion:

- `outputs.prReviewStatus`
- `outputs.prReviewComments`
- `outputs.prReviewDispositions`
- `outputs.prReviewBlockers`
- `outputs.prReviewFollowUps`
- `outputs.githubReconciliationStatus`
- `outputs.remainingTasks`
- `outputs.continuationStatus`

Keep `continuationStatus: "active"` until every PR review comment is fixed, skipped with rationale, converted to follow-up, or explicitly deferred by the developer, and GitHub reconciliation has run when required.

This skill is **inline-only** on the **`plan and deliver`** mission — no **`AGENT_RUN_REQUEST_V1`**, no **`AGENT_RESULT_RESPONSE_V1`** on this lane. See **[`../README.md`](../README.md)** § Inline-only.
