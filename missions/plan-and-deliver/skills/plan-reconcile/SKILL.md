---
name: plan-reconcile
description: >-
  Plan reconcile protocol: run plan-state.mjs reconcile (PR-tracked archival),
  list-candidates for plans that reconcile cannot auto-decide, present picks via
  AskQuestion, archive with plan-state.mjs archive, then follow-ups triage
  before archiving user-selected slugs. Use under mission dispatch, natural
  language ("plan reconcile"), or when the developer wants merge-driven archive
  cadence — via **AskQuestion**, natural language, or mission dispatch.
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
    description: PR state from coding-session; must be merged for spawned reconcile.
    required: false
  deployStatus:
    type: string
    description: Deploy status from deploy-walk; must be done for spawned reconcile.
    required: false
  deployTodoStatus:
    type: string
    description: deploy-test-plan-verified todo status; must be done for spawned reconcile.
    required: false
  ledgerParent:
    type: string
    description: Ledger parent slug/path copied from coding-session.
    required: false
  upstreamSkill:
    type: string
    description: Skill that spawned reconcile, usually coding-session.
    required: false
warmUpRules:
  - ".sedea/centers/research-and-development/missions/plan-and-deliver/plan.mdc"
  - ".sedea/centers/research-and-development/missions/plan-and-deliver/skills/README.md"
  - ".sedea/centers/research-and-development/docs/development-process.md"
  - ".sedea/centers/research-and-development/rules/20_efficient-pr-shipping.mdc"
  - ".sedea/centers/research-and-development/rules/30_planning-target-resolution.mdc"
---

# Plan reconcile

Script-backed flow: **`plan-state.mjs`** owns YAML and file moves; the agent decides **which** archive candidates to take (and how to route **follow-ups**) by surfacing choices via structured choice (below).

## Structured choice (Mission Control)

Dry-run reports, archive candidates, and follow-up triage use **AskQuestion**, **`MC_PHASED_RESPONSE_V1`**, or **`MC_ASKQUESTION_V1`** per **`.sedea/centers/sedea/rules/2_ask-question-instructions.mdc`** and **`../README.md`** § *Recap, structured choice, act* — **preferred:** recap + modal in one message; bare **`MC_ASKQUESTION_V1`** is sentinel-only. **Act** (`plan-state.mjs archive`, file moves) is after the developer selects.

## When this skill runs

| How it starts | Requirements | Auto-start? |
|---------------|--------------|-------------|
| Developer says **plan reconcile** / **reconcile plans**, or mission dispatch | Valid **`operationsUserId`**; follow **Flow** below | No — explicit start |
| **`coding-session`** spawns this skill | Developer chose reconcile on that turn; `prState: merged`; `deployStatus: done`; `deployTodoStatus: done`; `targetPlanPath` or `targetPlanSlug` | Yes |
| **`deploy-walk`** finishes (checklist + capstone todo **done**) | — | **No** — deploy done alone does not start reconcile |

Do **not** trigger on the word **`plan`** alone — too generic.

When **`deploy-walk`** just finished and the user expects archive, use **AskQuestion** once: start **`plan-reconcile`** now vs defer. Merge + deploy verification are still required for spawned reconcile from **`coding-session`**.

Detail: **`.sedea/centers/research-and-development/rules/20_efficient-pr-shipping.mdc`** § *deploy-walk vs plan-reconcile (not chained)*; **`.sedea/centers/research-and-development/docs/development-process.md`** § *Plan reconcile triggers*.

**Spawned gate:** if any required field is missing, stop with `partial`, keep `continuationStatus: "active"`, and report what is missing. Do not archive before merge and deploy verification are complete.

## Script CLI (hosting repo)

All **`plan-state.mjs`** invocations run from **`HOSTING_ROOT`** (the hosting repo whose root contains **`.sedea/`**). Use a **direct `node` command** with the runtime in [`.sedea/centers/research-and-development/rules/31_operations-user-id.mdc`](../../../../rules/31_operations-user-id.mdc) § *Hosting repo cwd (scripts)* and this center’s **`.cursor/rules/`** on the hosting repo.

**`--operations-user-id <id>`** is **required before the subcommand** for user-scoped plans (same value as Mission Control **`operationsUserId`**). Without it, only **`joint`** plans are visible. See [`.sedea/centers/research-and-development/rules/31_operations-user-id.mdc`](../../../../rules/31_operations-user-id.mdc) and rule **20** § *Hosting repo cwd for scripts (canonical)*.

```bash
# HOSTING_ROOT: walk up until .sedea/centers/sedea/ or .sedea/ exists
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

Run after §§1–4 when archive/reconcile work for this pass is done (or when the developer explicitly requests workspace cleanup on a reconcile lane). **Destructive git** runs only after **AskQuestion** approval in this subsection.

**Detect (read-only):**

```bash
cd "$HOSTING_ROOT"
OPS_ID="<operationsUserId from Mission Control warm-up or sedea_get_current_user>"

node .sedea/centers/research-and-development/missions/plan-and-deliver/scripts/plan-state.mjs \
  --operations-user-id "$OPS_ID" detect-stale-workspaces [--slug <slug>] --json
```

Each candidate includes `worktreePath`, `repo`, `branch`, `mergedPr` (when sidecar **`prs[]`** exists), and `reason`.

**Dry-run git plan:**

```bash
node .sedea/centers/research-and-development/missions/plan-and-deliver/scripts/post-reconcile-workspace-cleanup.mjs \
  --operations-user-id "$OPS_ID" --dry-run [--slug <slug>]
```

Present the JSON **`actions`** list to the developer (information-only turn when the report is long).

**AskQuestion** (required before **`--apply`**):

| Option id (illustrative) | Label (brief) |
|--------------------------|---------------|
| `cleanup-apply` | Run workspace cleanup (worktree + merged branch + pull main) |
| `cleanup-skip` | Skip git cleanup this pass |
| `cleanup-dry-run-only` | Dry-run only — no git mutations |
| `more-details` | More details for option _ |

Only **`cleanup-apply`** authorizes **`--apply`**.

**Apply (after MCP detach):**

1. For **each** candidate **`worktreePath`**, invoke MCP **`sedea_remove_worktree_folder`** with `{ "path": "<absolute-worktree-root>" }` **before** git removal (rule **20** § *Detach merged worktrees*).
2. Run:

```bash
node .sedea/centers/research-and-development/missions/plan-and-deliver/scripts/post-reconcile-workspace-cleanup.mjs \
  --operations-user-id "$OPS_ID" --apply [--slug <slug>]
```

The script runs **`git worktree remove`**, deletes branches merged into **`origin/main`** (or **`--default-branch`**), **`git pull origin <defaultBranch>`** on **`HOSTING_ROOT`**, and **`plan-state.mjs prune-sessions --all`**.

3. Summarise **`cleanedWorktrees`**, **`deletedBranches`**, **`mainPullStatus`**, and any **`errors`** from the script JSON.

**coding-session** lanes use **`detect-stale-workspaces`** only and route here — they do **not** run **`--apply`**.

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
- Editing plan frontmatter or sidecar YAML directly — **`plan-state.mjs`** is the sole writer for those; step 3.5 only edits **`## Follow-ups`** markdown bodies.
- Promoting routed bullets into **Changes** / **Caveats** / **Delivery phases** — planning work the user does later.
- Pushing fixes to individual PRs. If a flagged plan needs an amend, tell the user; do not silently **`gh`**-mutate from here.

## Spawned result contract

When spawned by **`coding-session`**, end with a child result containing:

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
- `outputs.activeLanes`
- `outputs.openLedgerEntries`
- `outputs.cleanedWorktrees` — when §5 cleanup ran
- `outputs.deletedBranches` — when §5 cleanup ran
- `outputs.mainPullStatus` — when §5 cleanup ran
- `outputs.continuationOwner: "plan-reconcile-agent"`
- `outputs.continuationStatus`

Set `continuationStatus`:

- `terminal` when the target plan is archived or explicitly not archive-eligible with no remaining follow-up triage.
- `active` when flagged plans, postponed follow-ups, manual routing, or developer choices remain.
- `partial` status with `continuationStatus: "active"` when script errors or missing merge/deploy gates block reconcile.

## Squad Leader bubble-up (detached lanes)

Runs on a **detached** reconcile lane. When reconcile reaches terminal success for the target PR plan, nudge the developer to post **Ship recap — plan and deliver** on the leader dispatch (**`../../plan.mdc`** §8).

| Outcome | `shipPhase` | `rowStatus` | Key `outputs` for recap |
|---------|-------------|-------------|-------------------------|
| Target archived / ship complete | `done` | `closed` | `targetPlanPath`, `archivedSlugs`, `remainingTasks` |
| Flagged / postponed follow-ups | `reconcile` | `open` | `targetPlanPath`, `flaggedSlugs`, `postponedSlugs`, `remainingTasks` |
| Script or gate blocked | `reconcile` | `blocked` | `targetPlanPath`, `remainingTasks`, `blockedReason` |

## Mission Control section 8 sync (required terminal `outputs`)

On **every** terminal `AGENT_RESULT_RESPONSE_V1` (including follow-up re-emits), `outputs` **must** include:

| Field | Rule |
|-------|------|
| `targetPlanPath` | Absolute PR plan `.plan.md` path — **required** |
| `shipPhase` | `done` with `rowStatus: closed` when target archived and ship complete; `reconcile` when follow-ups remain; `blocked` when gates fail |
| `rowStatus` | Per bubble-up table |
| `remainingTasks` | When `rowStatus` is not `closed` |
| `blockedReason` | When `rowStatus` is `blocked` |

Mission Control syncs section 8 on the Squad Leader lane from these fields.

## Completion (spawned)

Required `outputs` per **## Spawned result contract**, **Mission Control section 8 sync**, and the bubble-up table. Re-emit an **updated** terminal result after user-requested follow-up on this lane (same `correlationId`).

### Host protocol line (required)

Emit **exactly one** line on its own: `AGENT_RESULT_RESPONSE_V1` immediately followed by a single JSON object on the **same** line. Required keys: `version` (1), `correlationId` (from the spawn request), `status`, `summary`, `outputs`, `errors` (use `[]` when none). Populate `outputs` from the sections above **including** `targetPlanPath`, `shipPhase`, and `rowStatus` on every terminal line. The emitted line must be **valid JSON** (no `{...}` placeholders in the actual output). See **`.sedea/centers/sedea/skills/README.md`** § *Spawned terminal line*.

Stop after the terminal line. Do not emit another `AGENT_RUN_REQUEST_V1` or run the next protocol step in the same turn (see **`../README.md`** § *Terminal stop (normative)*).

## Completion (inline)

Report the fields below in prose to the invoker on the **same lane**. Do **not** emit `AGENT_RUN_REQUEST_V1`, `AGENT_RESULT_RESPONSE_V1`, or `MC_DISPATCH_RESOLVED_V1`. Do **not** add a **Host protocol line** under this section (see **`.sedea/centers/sedea/rules/4_mission.mdc`** § *Inline completion* and **`.sedea/centers/sedea/skills/README.md`** § *Completion (inline)*).

Normally spawned after deploy or on developer request. If run inline, use the same `outputs` semantics as **## Spawned result contract** and **`## Completion (spawned)`** in prose only.

## Extensions

Maintenance subcommands and future UX — **not** part of the default reconcile flow (§§1–4). Run only when the developer explicitly requests them or dry-run output shows they are needed.

- **`shippedPrs` frontmatter** — **`reconcile`** / **`archive`** write **`shippedPrs`** from sidecar **`prs[]`** at archive time. **`list-candidates`** prefers that field over body-regex hits when present (adjust step 2 commentary when this field is populated).

- **`backfill-prs-from-body`** — optional pre-step when sidecar **`prs[]`** is empty but merged PRs appear only in plan body prose. Procedure, triggers, and CLI examples: **`.sedea/centers/research-and-development/docs/development-process.md`** § *Plan metadata backfill (`backfill-prs-from-body`)*. Gate with **AskQuestion** before any non-dry-run run; then continue **Flow** from step 1.
