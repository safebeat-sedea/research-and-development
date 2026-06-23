---
name: plan-reconcile
description: >-
 Inline coding-session procedure for plan-state.mjs reconcile (PR-tracked archival),
 archive candidates, follow-ups triage, and post-ship workspace cleanup. Executed by
 the active coding-session agent only — not spawned, no warmUpRules.
designation:
  allowed: Post-ship plan hygiene; archive candidates; stale workspace cleanup fallback
  forbidden: New feature implementation; worktree product edits; dispatch resolution
inputs:
  targetPlanPath:
    type: string
    description: Absolute PR plan path that may be reconciled after PR merge and deploy verification.
    required: false
  targetPlanSlug:
    type: string
    description: PR plan slug that may be reconciled after PR merge and deploy verification.
    required: false
  prUrl:
    type: string
    description: Merged PR URL associated with the plan.
    required: false
  prNumber:
    type: number
    description: Merged PR number associated with the plan.
    required: false
  prState:
    type: string
    description: PR state from coding-session; must be merged for inline reconcile from ship chain.
    required: false
  deployStatus:
    type: string
    description: Deploy status from deploy-walk; must be done for inline reconcile from ship chain.
    required: false
  deployTodoStatus:
    type: string
    description: deploy-test-plan-verified todo status; must be done for inline reconcile from ship chain.
    required: false
  ledgerParent:
    type: string
    description: Ledger parent slug/path copied from coding-session.
    required: false
  upstreamSkill:
    type: string
    description: Invoker skill — must be coding-session when inline.
    required: false
---

# Plan reconcile

## Warm-up manifest (inline)

Per [`.sedea/centers/sedea/docs/lane-manifest-contract.md`](.sedea/centers/sedea/docs/lane-manifest-contract.md) and **`../README.md`** § *Inline-only*. **No** frontmatter **`warmUpRules`** or **`laneRules`** — runs on the active **`coding-session`** lane whose **`effectiveWarmUp`** already loaded ship rules. **No `alwaysApply` frontmatter flip.**

### Inherited from invoker (`coding-session`)

| Source | Paths (via parent lane) |
|--------|-------------------------|
| Parent **`skillWarmUp`** | `plan.mdc`, `skills/README.md`, `development-process.md`, rule **20** (parent omits rule **30** from frontmatter — see README cap table) |
| Parent **`laneRules`** | Rule **2**, rule **6**, rule **20**, `coding-session/SKILL.md` |
| This skill | Procedure body only — no separate spawn warm-up |

**Lane requirement (no separate warm-up).** Run **only** on the active **`coding-session`** lane after that session has loaded ship rules. Do **not** start a standalone Mission Control session on **`plan-reconcile`** alone — context will be incomplete.

### Standalone dispatch (stop immediately)

If Mission Control opened a session whose only intent is **`plan-reconcile`** / *plan reconcile* with **no** active **`coding-session`** context:

1. **Stop** — do not run **`plan-state.mjs`** reconcile mutations.
2. Tell the developer **`plan-reconcile`** is **inline-only** on the **`coding-session`** lane.
3. Direct them to open or return to **`coding-session`** with the PR plan (or post-ship context) — see [`coding-session/SKILL.md`](../coding-session/SKILL.md) § *Plan-reconcile handoff (inline)* and § *Stale worktree detection (detect-only)*.

**Execution owner:** the active **coding-session agent** runs this skill inline. Do **not** spawn a separate reconcile child lane.

Script-backed flow: **`plan-state.mjs`** owns YAML and file moves; the agent decides **which** archive candidates to take (and how to route **follow-ups**) by surfacing choices via structured choice (below).

## Structured choice (Mission Control)

Dry-run reports, archive candidates, and follow-up triage use **AskQuestion** or **`MC_PHASED_RESPONSE_V1`** per **`.sedea/centers/sedea/rules/2_ask-question-instructions.mdc`** and **`../README.md`** § *Recap, structured choice, act* — recap + modal in **one turn** when practical. **Act** (`plan-state.mjs archive`, file moves) is after the developer selects.

## When this skill runs

| How it starts | Requirements | Auto-start? |
|---------------|--------------|-------------|
| Developer says **plan reconcile** / **reconcile plans** on active **`coding-session`** | Valid **`operationsUserId`**; follow **Flow** below | No — explicit start |
| **`coding-session`** inline handoff | Developer chose reconcile on that turn; when plan-anchored from ship chain: `prState: merged`; `deployStatus: done`; `deployTodoStatus: done`; `targetPlanPath` or `targetPlanSlug` | Yes — on authorized pick only |
| **`deploy-walk`** finishes (checklist + capstone todo **done**) | — | **No** — deploy done alone does not start reconcile |

Do **not** trigger on the word **`plan`** alone — too generic.

When **`deploy-walk`** just finished and the user expects archive, use **AskQuestion** once: start **`plan-reconcile`** inline now vs defer. Merge + deploy verification are still required for inline reconcile from **`coding-session`** when plan-anchored on the ship chain.

Detail: **`.sedea/centers/research-and-development/rules/20_efficient-pr-shipping.mdc`** § *deploy-walk vs plan-reconcile (not chained)*; **`.sedea/centers/research-and-development/docs/development-process.md`** § *Plan reconcile triggers*.

**Inline gate (ship chain):** if any required field is missing, stop with `partial`, keep `continuationStatus: "active"` on **`coding-session`**, and report what is missing. Do not archive before merge and deploy verification are complete.

## Script CLI (hosting repo)

All **`plan-state.mjs`** invocations run from **`HOSTING_ROOT`** (the hosting repo whose root contains **`.sedea/`**). Use a **direct `node` command** with the runtime in [`.sedea/centers/research-and-development/rules/31_operations-user-id.mdc`](../../../../rules/31_operations-user-id.mdc) § *Hosting repo cwd (scripts)* and this center’s **`.cursor/rules/`** on the hosting repo.

**`--operations-user-id <id>`** is **required before the subcommand** for user-scoped plans (same value as Mission Control **`operationsUserId`**). Without it, only **`joint`** plans are visible. See [`.sedea/centers/research-and-development/rules/31_operations-user-id.mdc`](../../../../rules/31_operations-user-id.mdc) and rule **20** § *Hosting repo cwd for scripts (canonical)*.

```bash
# HOSTING_ROOT: walk up until .sedea/centers/sedea/.sedea/ exists
cd "$HOSTING_ROOT"
OPS_ID="<operationsUserId from Mission Control warm-up or sedea_get_current_user>"

node .sedea/centers/research-and-development/missions/plan-and-deliver/scripts/plan-state.mjs \
 --operations-user-id "$OPS_ID" <subcommand> …
```

Plans and sidecars live only under the **`.sedea/operations/`** union — **`.sedea/operations/joint/plans/`** and **`.sedea/operations/<operationsUserId>/plans/`** (literal **`joint`**). Do **not** use **`~/.cursor/plans/`** for Sedea hosting repo plans.

## Flow

### 1. Preview reconcile (PR-tracked path)

```bash
cd "$HOSTING_ROOT"
OPS_ID="<operationsUserId from Mission Control warm-up or sedea_get_current_user>"

node .sedea/centers/research-and-development/missions/plan-and-deliver/scripts/plan-state.mjs \
 --operations-user-id "$OPS_ID" reconcile --dry-run
```

This queries **`gh pr view`** for every sidecar **`prs[]`** entry without moving files or appending parent bullets. The printed report has three buckets:

- **`archived`** — every PR for that plan is **`MERGED`**; in dry-run this means **`plan-state`** would move the plan + sidecar and append a bullet under **`## Child plans`** on the parent (when applicable). No mutation has happened yet.
- **`flagged`** — at least one PR closed without merge, mixed merged/open, unknown repo, or **`gh`** error. Needs judgement (step 3).
- **`skipped`** — still-open PRs, or no **`prs[]`** (the script’s way of saying “not this path”). Step 2 covers the no-**`prs[]`** subset via **`list-candidates`**.

Optional flags: **`--prune-worktrees`** is only allowed after the developer approves the mutation pass below (see script **`--help`**).

### 1b. Approve PR-tracked reconcile mutations

Present the dry-run report to the developer and use **AskQuestion** before running non-dry-run reconcile. Required options:

1. **Approve PR-tracked reconcile mutations**
2. **Skip PR-tracked reconcile this pass**
3. **Review flagged entries first**
4. **Abort reconcile**
5. **More details for option _**

Only **Approve PR-tracked reconcile mutations** authorizes:

```bash
cd "$HOSTING_ROOT"

node .sedea/centers/research-and-development/missions/plan-and-deliver/scripts/plan-state.mjs \
 --operations-user-id "$OPS_ID" reconcile
```

If the developer skips PR-tracked reconcile, do not run non-dry-run `reconcile`; continue only to read-only `list-candidates` and developer-selected archive work. If the developer aborts, stop with `continuationStatus: "active"` and no archive mutations.

### 2. Run list-candidates (non-PR path)

```bash
cd "$HOSTING_ROOT"

node .sedea/centers/research-and-development/missions/plan-and-deliver/scripts/plan-state.mjs \
 --operations-user-id "$OPS_ID" list-candidates --json
```

Emits a JSON array of plans reconcile could not auto-decide. Schema per entry:

```json
{
 "slug": "…",
 "planPath": "/abs",
 "parent": "…" | null,
 "name": "…",
 "todos": { "total": n, "done": n, "pending": 0, "in_progress": 0, "cancelled": 0, "allDone": true },
 "shipSignal": {
 "kind": "pr-body" | "no-pr-body",
 "label": "org/repo#540" | "…",
 "prs": [{ "evidence": "link" | "bare", "orgRepo": "…" | null, "number": n, "url": "…" | null }]
 },
 "suggestedSignal": "…"
}
```

When **`shipSignal.kind`** is **`no-pr-body`**, **`list-candidates`** found no merged-PR link or number in the plan body and there is no sidecar **`prs[]`** — it still treats the plan as an archive candidate. Use **`suggestedSignal`** from the JSON when present; otherwise a neutral signal string such as **`shipped (no merged-PR body link in plan)`**.

Filters already applied (unchanged from upstream script semantics):

- Plans with sidecar **`prs[]`** are excluded (reconcile’s job).
- Plans without all todos done are excluded.
- Roadmap topics (**`kind: roadmap_topic`**) are excluded.
- Plans with any **blocked descendant** are excluded. An all-done child in **`plans/`** does **not** block its parent — the fully-shipped subtree can surface together.

### 3. Present candidates + flagged plans via AskQuestion

Merge reconcile’s **`flagged`** list (step 1) with **`list-candidates`** output (step 2) into one multi-select **`AskQuestion`**. One option per plan. Label format:

- Candidates: `` `<slug>` — todos N/N done, signal: <shipSignal.label>, parent: <parent> ``
- Flagged: `` `<slug>` — FLAGGED (<reason>), parent: <parent> ``

Prompt text: **`Pick plans to archive. Candidates are safe to archive; flagged plans need judgement (selecting them will archive with signal "flagged: <reason>" — only do this if you intend to close out).`**

If both lists are empty → no question; continue (step 3.5 only if something in scope has follow-ups — usually skip to the end-of-flow summary).

### 3.5 — Follow-ups triage

Per **`.sedea/centers/research-and-development/docs/development-process.md`** (**Cadence** / plan updates): **an un-triaged follow-up is a forgotten one**. Before archiving a plan that has a non-empty **`## Follow-ups`** section, route every bullet.

**Scope**

- **User-selected plans** from step 3 (candidates the user picked + flagged plans they opted to archive). Files are still at their **active** **`.sedea/operations/.../plans/`** paths for this pass (not yet archived here).
- **Reconcile-auto-archived plans** from approved step 1b (**`archived`** list). **`plan-state`** **`reconcile`** may have moved each **`.plan.md`** within the same operations scope — **do not** assume its former path. **Re-resolve** each slug’s **`.plan.md`** under **`.sedea/operations/`** (for example **`plan-state resolve`** or a search for **`<slug>.plan.md`** under that scope) after the approved mutation run. For this set, **Postpone** below is **not** offered — the plan is already archived; only **Integrate** and **Drop** apply.

If a plan in scope has no **`## Follow-ups`** section, or the section is empty, skip it silently.

**Parent map.** Build **`slug → parent`** (and inverse) using **`list-candidates --json`** where available; for any other **`.plan.md`** under the operations **`plans/`** union you need for ordering, read the sidecar **`parent:`** via **`Read`**. Do **not** mutate sidecars in this step.

**Parse `## Follow-ups`.** Use **`Read`** on the plan file. Locate the top-level **`## Follow-ups`** heading and collect bullets until the next **`## `** heading or EOF. A bullet starts with **`- `** or **`* `** at column 0, including nested indented lines. Strip a trailing **`(target: …)`** suffix from the **first line** when present as a *routing hint* for the question text; the text integrated into the target keeps the rest verbatim.

**Per-plan AskQuestion.** For plan **`<slug>`** with **N** follow-ups, one form with **N** questions. Each prompt: first line (truncated ~140 chars) plus **`(suggested: <hint>)`** when a **`(target: …)`** hint was parsed. Options, in order:

1. **Drop**
2. **Elaborate first** — queue only this pass; apply terminals in wave 2; elaboration uses waves 3–4 (briefing, then re-ask) per **development-process** follow-ups triage wave order.
3. **Postpone** — *(omit when the source plan was reconcile-auto-archived in step 1.)* Record the source slug in a **`postponed:`** set; step 4 **skips** archive for that slug entirely.
4. **Integrate → `<target-slug>` (`<relation>`)** — one option per plan in the tree, **ordered by proximity**: parent → siblings → grandparent → aunt/uncle subtrees → walk up → **Master Plan** last when not already parent. Skip the source slug. Skip slugs already in the archive batch from step 3. **Skip targets that are already archived** for this scope (same slugs as the step-1 **`archived`** list, or any plan **`plan-state`** no longer treats as the active Plan Board surface after re-resolve — integrate only into still-active plans). Cap ~30 options; final escape hatch **`(other) — pick manually after archive`**.

**Wave order** (normative): (1) Ask all bullets once. (2) Apply terminals (**Drop**, **Postpone**, **Integrate**, **`(other)`**); queue **Elaborate first**. (3) Brief each queued bullet (chat: what / why now / how routing differs). (4) Re-ask queued bullets only; repeat 3→4→2 until **`elaborate_queue`** is empty. If the user dismisses a form while non-terminal bullets remain, treat like **Postpone** for those source slugs (record in **`postponed:`**, list unresolved bullets in chat).

**Terminal mapping**

- **Drop** → no file change for that bullet.
- **Postpone** → **`postponed:`** slug set; do not route the bullet.
- **Integrate → `<target-slug>`** → append bullet (verbatim minus **`(target: …)`** on first line) to the target’s **`## Follow-ups`** (**`StrReplace`**). Create the section at EOF if missing. **One canonical sink** — not **Changes** / **Caveats** / **Delivery phases** here.

**Manual fallback** for **`(other)`**: add source slug to **`postponed:`** when the source was user-selected (stays active). For **reconcile-auto-archived** sources, emit **`MANUAL:`** lines in the chat summary — the user edits that plan file themselves.

**Routing summary** (chat, before step 4): per slug, counts integrated / dropped / postponed / manual / elaborate passes, with one line per integrate target.

### 4. Archive each selected plan

For each slug the user picked that is **not** in the **`postponed:`** set from step 3.5:

```bash
cd "$HOSTING_ROOT"

node .sedea/centers/research-and-development/missions/plan-and-deliver/scripts/plan-state.mjs \
 --operations-user-id "$OPS_ID" archive \
 --slug <slug> \
 --signal "<signal-text>"
```

Signal selection:

- Candidate with **`shipSignal.kind === "pr-body"`** → **`suggestedSignal`** (URLs/refs from JSON).
- Candidate with **`shipSignal.kind === "no-pr-body"`** → use **`suggestedSignal`**, or neutral text as in step 2 (keep signal strings factual — no home-local paths in the archive reason).
- Flagged plan → **`flagged: <reason>`** only when the user explicitly selected it.

One slug per invocation; print the script JSON response for a paper trail.

**Order:** when parent and children are selected together, archive **children before ancestors** so each child’s **`## Child plans`** bullet lands on the parent while the parent is still in the active **`plans/`** tree.

On non-zero exit, stop and surface the error.

### 5. Post-ship workspace cleanup

**Worktree removal ownership (binding).** This §5 fallback runs **only** when [`.sedea/centers/sedea/rules/0_hosting-repo.mdc`](.sedea/centers/sedea/rules/0_hosting-repo.mdc) § *Worktree ownership* and rule **20** § *Worktree removal ownership (binding)* preconditions pass for **each** candidate path. **Do not remove worktrees you do not own.** **`detect-stale-workspaces`** + **`--apply`** are not permission to remove arbitrary entries from **`git worktree list`**. When ownership is unclear, stop and use structured choice.

**Primary owner:** [coding-session post-merge workspace cleanup](../coding-session/SKILL.md#post-merge-workspace-cleanup) on the ship chain **after PR merge and before After deploy** `deploy-walk`. Run this subsection when archive/reconcile work for this pass is done, when the developer explicitly requests workspace cleanup on a reconcile lane, or as an **idempotent fallback** when post-merge cleanup was skipped or deferred on **`coding-session`**.

**Idempotent fallback:** When **`detect-stale-workspaces`** returns no candidates (worktree already removed, **`mainPullStatus`** already **`success`** on this plan), report one line and skip **`--apply`** — do not treat as error.

**Worktree name ref cleanup gate:** Same as **`post-reconcile-workspace-cleanup.mjs`** — (1) **`mergedPr: true`** and remote head gone, or (2) worktree-linked fallback when **`prs[]`** empty, **`remoteHeadGone: true`**, worktree name not checked out elsewhere; not merge-base into **`origin/main`**.

**Detect (read-only):**

```bash
cd "$HOSTING_ROOT"
OPS_ID="<operationsUserId from Mission Control warm-up or sedea_get_current_user>"

node .sedea/centers/research-and-development/missions/plan-and-deliver/scripts/plan-state.mjs \
 --operations-user-id "$OPS_ID" detect-stale-workspaces [--slug <slug>] --json
```

Each candidate includes `worktreePath`, `repo`, `worktreeName`, `mergedPr` (when sidecar **`prs[]`** exists), `remoteHeadGone`, and `reason`.

**Dry-run git plan:**

```bash
node .sedea/centers/research-and-development/missions/plan-and-deliver/scripts/post-reconcile-workspace-cleanup.mjs \
 --operations-user-id "$OPS_ID" --dry-run [--slug <slug>]
```

Present the JSON **`actions`** list in the **same turn** as the required **AskQuestion** before **`--apply`** — put long reports in **`display.markdown`** (phased) when needed; do not end with a report-only turn.

| Option id (illustrative) | Label (brief) |
|--------------------------|---------------|
| `cleanup-apply` | Run workspace cleanup (worktree + worktree name ref + pull main) |
| `cleanup-skip` | Skip git cleanup this pass |
| `cleanup-dry-run-only` | Dry-run only — no git mutations |
| `more-details` | More details for option _ |

Only **`cleanup-apply`** authorizes **`--apply`**.

**Apply (after MCP detach):**

**Worktree removal ownership (binding).** Before step 1, confirm **all** preconditions in [`.sedea/centers/sedea/rules/0_hosting-repo.mdc`](.sedea/centers/sedea/rules/0_hosting-repo.mdc) § *Worktree ownership* and rule **20** § *Worktree removal ownership (binding)* for **each** candidate **`worktreePath`**. **Forbidden:** **`--apply`** on paths not returned by **`detect-stale-workspaces`** for **this reconcile pass**; repo-wide cleanup from **`git worktree list`**; removing worktrees another session owns. If unsure, stop — **`git worktree list` is read-only**.

1. For **each** candidate **`worktreePath`**, invoke MCP **`sedea_remove_worktree_folder`** with `{ "path": "<absolute-worktree-root>" }` **before** git removal (rule **20** § *Detach merged worktrees*).
2. Run:

```bash
node .sedea/centers/research-and-development/missions/plan-and-deliver/scripts/post-reconcile-workspace-cleanup.mjs \
 --operations-user-id "$OPS_ID" --apply [--slug <slug>]
```

The script runs **`git worktree remove`**, drops local worktree name refs when PR merged **and** remote head is gone (not merge-base heuristics), **`git pull origin <defaultIntegrationLine>`** on **`HOSTING_ROOT`**, optional **post-merge host rebuild** when **`.cursor/rules/dot-sedea.mdc`** documents **`postMergeHostRebuildScript`** on the active hosting repo (so the developer can reload the Sedea workbench), and **`plan-state.mjs prune-sessions --all`**.

3. Summarise **`cleanedWorktrees`**, **`deletedWorktreeNames`**, **`skippedWorktreeNames`**, **`mainPullStatus`**, and any **`errors`** from the script JSON.

**Primary path:** **`coding-session`** [Post-merge workspace cleanup](../coding-session/SKILL.md#post-merge-workspace-cleanup) runs **`--apply`** after PR merge and before After deploy walk. This §5 subsection is the **idempotent fallback** when that pass was skipped or deferred.

### 6. End state — no plans-repo shortcut

**Do not** run a separate **plans-only** git commit flow from this skill (operations changes belong to your normal hosting / center git process unless the user asked you to commit).

Mutations are under **`.sedea/operations/`** (and possibly center git elsewhere). Summarise in chat: reconcile counts, what was archived with which signals, flagged leftovers, follow-ups triage counts, **`MANUAL:`** / **`postponed:`** slugs. Commit or push **only** when the user explicitly asked you to handle hosting or center git for this pass.

## Scope guard

**This skill**

- Runs **`reconcile`** ( **`gh`**, file moves, parent body notes where applicable).
- Runs **`list-candidates`** (read).
- Triages **`## Follow-ups`** on plans about to be archived and on reconcile-auto-archived plans; can append to other plans’ **`## Follow-ups`** with optional **Elaborate first** passes.
- Runs **`archive`** per selected slug (skipping **`postponed:`**).
- Runs **§5 Post-ship workspace cleanup** when approved (`detect-stale-workspaces`, **`post-reconcile-workspace-cleanup.mjs`**, MCP detach, **`prune-sessions`**).

**Out of scope**

- Creating worktrees (**`coding-session`**).
- Editing plan frontmatter or sidecar YAML directly — **`plan-state.mjs`** is the sole writer for sidecar Plan Board fields (`status`, `archived`, `parent`, `worktrees`, `prs`, `session`) per **`.sedea/centers/sedea/rules/8_plan-board-contract.mdc`**; step 3.5 only edits **`## Follow-ups`** markdown bodies.
- Promoting routed bullets into **Changes** / **Caveats** / **Delivery phases** — planning work the user does later.
- Pushing fixes to individual PRs. If a flagged plan needs an amend, tell the user; do not silently **`gh`**-mutate from here.

## Inline result contract

When run inline on **`coding-session`**, report these fields in prose via **`## Completion (inline)`** so the parent can merge into coding-session `outputs`:

- `outputs.targetPlanPath`
- `outputs.targetPlanSlug`
- `outputs.prUrl`
- `outputs.prNumber`
- `outputs.prState`
- `outputs.deployStatus`
- `outputs.deployTodoStatus`
- `outputs.archivedSlugs`
- `outputs.flaggedSlugs`
- `outputs.postponedSlugs`
- `outputs.followUpsIntegrated`
- `outputs.followUpsDropped`
- `outputs.manualFollowUps`
- `outputs.remainingTasks`
- `outputs.shipPhase` — `done` with `rowStatus: closed` when target archived; `reconcile` when follow-ups remain; `blocked` when gates fail
- `outputs.rowStatus` — per bubble-up semantics below
- `outputs.blockedReason` — when `rowStatus` is `blocked`
- `outputs.cleanedWorktrees` — when §5 cleanup ran
- `outputs.deletedWorktreeNames` — when §5 cleanup ran
- `outputs.mainPullStatus` — when §5 cleanup ran

Stop when the target plan is archived or explicitly not archive-eligible with no remaining follow-up triage, or when flagged plans / postponed follow-ups / manual routing remain (`continuationStatus: active` on **`coding-session`**). Do not auto-invoke other skills.

| Outcome | `shipPhase` | `rowStatus` | Key fields for §8 recap |
|---------|-------------|-------------|-------------------------|
| Target archived / ship complete | `done` | `closed` | `targetPlanPath`, `archivedSlugs`, `remainingTasks` |
| Flagged / postponed follow-ups | `reconcile` | `open` | `targetPlanPath`, `flaggedSlugs`, `postponedSlugs`, `remainingTasks` |
| Script or gate blocked | `reconcile` | `blocked` | `targetPlanPath`, `remainingTasks`, `blockedReason` |

## Mission Control section 8 sync (via coding-session)

**`plan-reconcile`** is **not** a separate child terminal. §8 ship ledger fields reach the Squad Leader via **`coding-session`** terminal **`outputs`** on re-emit — include `targetPlanPath`, `shipPhase`, `rowStatus`, `archivedSlugs`, `remainingTasks`, and `blockedReason` when applicable per **`../coding-session/SKILL.md`** § *Mission Control section 8 sync*. **Forbidden:** manual **Ship recap** on the leader dispatch.

## Completion (inline)

Report the fields from **## Inline result contract** in prose to the invoker on the **same lane**. Do **not** emit `AGENT_RUN_REQUEST_V1`, `AGENT_RESULT_RESPONSE_V1`, or `MC_DISPATCH_RESOLVED_V1`. Do **not** add a **Host protocol line** (see **`.sedea/centers/sedea/rules/4_mission.mdc`** § *Inline completion* and **`.sedea/centers/sedea/skills/README.md`** § *Completion (inline)*).

Normally invoked inline from **`coding-session`** after deploy verification or when the developer chooses reconcile on that lane. **`plan reconcile`** phrases on the active coding-session lane use the same procedure body.

## Extensions

Maintenance subcommands and future UX — **not** part of the default reconcile flow (§§1–4). Run only when the developer explicitly requests them or dry-run output shows they are needed.

- **`shippedPrs` frontmatter** — **`reconcile`** / **`archive`** write **`shippedPrs`** from sidecar **`prs[]`** at archive time. **`list-candidates`** prefers that field over body-regex hits when present (adjust step 2 commentary when this field is populated).

- **`backfill-prs-from-body`** — optional pre-step when sidecar **`prs[]`** is empty but merged PRs appear only in plan body prose. Procedure, triggers, and CLI examples: **`.sedea/centers/research-and-development/docs/development-process.md`** § *Plan metadata backfill (`backfill-prs-from-body`)*. Gate with **AskQuestion** before any non-dry-run run; then continue **Flow** from step 1.
