---
name: pr-review
description: >-
  Review and fix GitHub PR comments. Use when the user says 'pr', 'pr <URL>',
  provides a pull request link, or asks to triage/address PR review comments.
---

# PR Review Workflow

## Helper script

Script: `.sedea/centers/sedea-centers--development/missions/plan-and-deliver/scripts/pr-review.py` (reads PAT from `GH_TOKEN` or `~/.sedea/mcp.json` — the token source is config only; **do not invoke the GitHub MCP** during `pr`).

The script reads input from (in order): **`PR_REVIEW_INPUT`** (absolute path to a JSON file — keeps payloads **outside** the repo).

### Input file and script: **always two separate steps**

The point is a **reviewable JSON payload** and a **stable allowlisted shell command** (`python3 .sedea/centers/sedea-centers--development/missions/plan-and-deliver/scripts/pr-review.py` only) — **never** `printf … && python3 …` in one line.

1. **First step — write the input file only**  
   Create a temp path outside the repo, e.g. `PRR_INPUT=$(mktemp /tmp/cursor-pr-review-input.XXXXXX)` (six trailing `X`). Use the **Write** tool to write the JSON to that **absolute** path (or a **Shell** that **only** writes the file and exits — **no** `&&` to the script).

2. **Second step — run the script only**  
   A **separate** **Shell** invocation:

   `cd <implementation-repo-root> && PR_REVIEW_INPUT="<absolute-path-from-step-1>" python3 .sedea/centers/sedea-centers--development/missions/plan-and-deliver/scripts/pr-review.py`

   No `echo`/`printf`/heredoc, no redirection, no `&&` chaining write + script on this line.

**Never** chain writing and executing in one shell line, for example:

`printf '…' > /tmp/foo.json && python3 .sedea/centers/sedea-centers--development/missions/plan-and-deliver/scripts/pr-review.py`

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

Do **not** call **`user-github`** (or any other GitHub MCP) to list reviews, comments, or threads. That duplicates the script, stresses the agent UI with huge payloads, and is forbidden here. **All** GitHub reads and writes for this workflow go through **`cd <implementation-repo-root> && PR_REVIEW_INPUT="<absolute-path-from-step-1>" python3 .sedea/centers/sedea-centers--development/missions/plan-and-deliver/scripts/pr-review.py`** (plus `git` / `gh` in Step 0 only if you already use them for branch or URL resolution — optional; `pr-for-branch` in the script is preferred when resolving the PR from the current branch).

## When the user selects `pr-review`

Optionally followed by a URL (e.g. `pr https://...`).

### Step 0 — Resolve the PR

Determine the PR to review using the **first match**:
1. A URL is provided after `pr-review` → parse `owner`, `repo`, `pull_number` from it.
2. A PR was already reviewed earlier in this chat → reuse that `owner`, `repo`, `pull_number`.
3. Neither above → get the current branch (`git branch --show-current`), parse `owner`/`repo` from the git remote (`git remote get-url origin`), then look up the open PR via the `pr-for-branch` script command.

Always confirm which PR is being reviewed (print URL and title) before proceeding.

#### Link the PR to its plan sidecar (idempotent)

Before Step 1, attempt to upsert the resolved PR number into the Plan Board sidecar so `plan-reconcile` can later archive the plan when all linked PRs merge. This is the same `upsert-pr` call documented in `commit-push` step 3 of [`efficient-pr-shipping.mdc`](../../../../rules/efficient-pr-shipping.mdc) — running it here as well closes the gap when `pr` triage ends with all comments skipped (no follow-up `cp`, so `cp`'s upsert never fires) or when the PR is otherwise quiet enough that no second `cp` ever happens. The helper is idempotent, so running it on every `pr` invocation is harmless.

**`plan-state.mjs`** lives in the center tree: `.sedea/centers/sedea-centers--development/missions/plan-and-deliver/scripts/plan-state.mjs`. It discovers plans only under the **union** of `.sedea/operations/joint/...` (literal `joint`) and `.sedea/operations/<operations-user-id>/...` on the **hosting repo** (parent directory of `.sedea/`). Pass the per-user scope when needed:

- **`--operations-user-id <id>`** before the subcommand (recommended in Shell logs), or
- one line in **`.sedea/local/operations-user-id`** (gitignored; hosting repo root), or
- **`git config --local sedea.operationsUserId <id>`** in the hosting repo.

If the id is omitted and unset, only `joint` plans are visible (stderr warns once). **Slug collision:** the same slug in both trees → the **user** tree wins (listed first).

```bash
ROOT="$(git rev-parse --show-toplevel)"
PLAN_STATE="$ROOT/.sedea/centers/sedea-centers--development/missions/plan-and-deliver/scripts/plan-state.mjs"
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

Skip silently when `resolve` exits non-zero (session has no plan) or when `pull_number` is unknown (Step 0 fell through every branch). Never block `pr` on a helper failure — log and continue with Step 1.

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

### Step 3 — Validate and fix

For each **new** (not filtered in Step 2) comment, verify it against the **current** codebase and assign one of three dispositions:

- **Fixed** — issue is valid and actionable in the scope of this PR; apply the fix locally.
- **Skipped (no follow-up)** — issue is already fixed in the working tree, factually wrong, or pure noise (e.g. linter chatter the project doesn't enforce). Nothing to track.
- **Skipped → follow-up** — issue is *valid* but *out of scope* for this PR's single concern. Strategy #6 forbids silently expanding the PR; capture as a `## Follow-ups` bullet in Step 3a so the item isn't lost.

Do **not** commit or push. Wait for the user to review.

### Step 3a — Capture out-of-scope flags as follow-ups

Per [`development-process.md`](../../../../docs/development-process.md) § *Cadence — Feedback Collection*, items surfaced by **a reviewer-agent (Slink or Code Rabbit)** during PR review that aren't worth blocking the PR on land in the PR plan's `## Follow-ups` section as **Code Review Follow-ups** (Strategy #6 forbids the silent scope expansion; the follow-up is the safe escape valve). This step mirrors `pre-pr-review` runner Step 6 — same section, same bullet shape, same routing semantics — so `pl` can drain both sources at archive time without distinguishing.

**Skip this step entirely** when Step 0's sub-step returned no slug (`resolve` exited non-zero, or no PR plan is linked yet). Acknowledge once: *"No plan linked to this PR; skipping follow-ups capture. Out-of-scope flags surface in the Step 4 report only — copy anything actionable into a new plan or follow-up issue if needed."*

Otherwise, for every comment marked **Skipped → follow-up** in Step 3, append a one-sentence bullet to the linked PR plan file **`planPath`** from Step 0 (`…/.sedea/operations/joint/plans/<slug>.plan.md` or `…/.sedea/operations/<operations-user-id>/plans/<slug>.plan.md`) in its `## Follow-ups` section using `StrReplace`. Each bullet:

- Paraphrases the comment's substantive concern in one sentence — do **not** quote the GitHub body verbatim (the comment thread already preserves it).
- Carries an optional `(target: <hint>)` suffix when routing is obvious — `Master Plan`, `current phase plan`, `sibling plan`, `new plan`, `drop`.
- Lives at the bottom of the file. If the PR plan has no `## Follow-ups` section yet, **add one** at the bottom (after § 7 Caveats, or after § 6 if § 7 is omitted) using a single `StrReplace` that inserts the header + the new bullets in one shot — same shape as `pre-pr-review` step 6.

Do **not** include `Fixed` or `Skipped (no follow-up)` items here — those don't survive the PR (`Fixed` lands in the diff; `Skipped (no follow-up)` is noise by definition).

Acknowledge: *"Appended <K> Code Review Follow-ups to `<slug>.plan.md` § Follow-ups."*

Plan files live under **`.sedea/operations/`** on the hosting checkout. In the Sedea `app` monorepo, see `.cursor/rules/operations-structure.mdc`: that tree is often its **own** git repository, gitignored from the monorepo. Edits to `*.plan.md` / `*.state.yaml` therefore may **not** appear in the implementation repo's `git status`. Sync plan changes through whatever workflow owns the operations checkout (for example a dedicated `operations` commit), not only the `app` PR — Step 5's `cp` flow still commits implementation-repo source changes as usual.

### Step 4 — Report

Print **every** comment in its original form (quote the body). For each one, state one of three dispositions:

- **Fixed** — what you changed and why.
- **Skipped (no follow-up)** — why it doesn't apply (already fixed, factually wrong, pure noise).
- **Skipped → follow-up** — paraphrase the planning concern + the `(target: …)` hint (if any) that was appended to the plan in Step 3a. Reference the slug so the user can audit: *"Captured to `<slug>.plan.md` § Follow-ups."*

Do **not** reply to, resolve, or minimize any threads yet. Wait for the user to review the changes first.

If there are code changes to review, wait for the user before committing. If all comments were skipped (no code changes), proceed directly to Step 5.

Tell the user explicitly: after local fixes look good, say **`cp`** — `efficient-pr-shipping.mdc` § *cp* step 3 requires **this skill’s Step 5 (GitHub only)** in the **same turn** as commit/push when a `pr` triage finished at Step 4 here, so threads close without a second **`pr`**.

### Step 5 — GitHub reconciliation (`cp` / skipped-only)

**Entry points:**

- **`cp` after `pr` (normal path)** — [`efficient-pr-shipping.mdc`](../../../../rules/efficient-pr-shipping.mdc) § *cp* runs **git commit + push** in steps 1–2 first. The agent handling **`cp` must then run § Step 5 — GitHub only** as **step 3** of `cp` (same user message / same agent turn), **before** plan upsert and Brin. Do **not** treat `cp` as finished at push if Step 4 ran in this chat and GitHub is still open.

- **Skipped-only triage** — Step 3 marked every comment **Skipped (no follow-up)** with **no** code edits: run **GitHub only** immediately (no commit/push).

**GitHub only** (two-step `PR_REVIEW_INPUT` + `python3 .sedea/centers/sedea-centers--development/missions/plan-and-deliver/scripts/pr-review.py` per § *Input file and script* — never chain write + script):

1. **Reply + resolve** each inline thread using dispositions from Step 4 — **Fixed**, **Skipped (no follow-up)**, or **Skipped → follow-up** (same paraphrase + `(target: …)` as Step 3a) plus short reasoning, then resolve the thread.

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

The `[~]` marker plus the explicit "captured to … § Follow-ups" pointer lets reviewers cross-reference what was deferred without leaving the GitHub comment thread. Use one bullet per comment, mirroring the dispositions assigned in Step 4. Replace `abc1234` with `git rev-parse --short HEAD` after **`cp`**’s push (or the commit you just pushed).

If Step 1 payloads are **missing or stale** in context (new comments since fetch, fresh chat), re-run **Step 1**’s `pr-review.py` array for the same `owner` / `repo` / `pr`, then run **GitHub only** above — do **not** ask the user for a second **`pr`** unless you truly cannot resolve the PR identity.
