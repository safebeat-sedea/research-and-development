---
name: plan-reconcile
description: >-
  Plan reconcile protocol: run plan-state.mjs reconcile (PR-tracked archival),
  list-candidates for plans that reconcile cannot auto-decide, present picks via
  AskQuestion, archive with plan-state.mjs archive, then follow-ups triage
  before archiving user-selected slugs. Use under mission dispatch, natural
  language ("plan reconcile"), or when the developer wants merge-driven archive
  cadence — not legacy two-letter chat tokens.
---

# Plan reconcile

Script-backed flow: **`plan-state.mjs`** owns YAML and file moves; the agent decides **which** archive candidates to take (and how to route **follow-ups**) by surfacing choices via **`AskQuestion`**.

## When to trigger

- **Mission dispatch**, natural language (**plan reconcile**, **reconcile plans**, archive pass after merges), or an explicit user request in that vein.
- Do **not** trigger on **`plan`** alone — too generic.
- Do **not** auto-run this protocol when a PR plan’s **`deploy-walk`** finishes or when frontmatter todo **`deploy-test-plan-verified`** flips to **`done`**. That closure means every deploy checklist box is **`[x]`** and the plan status lifecycle reads **`done`** — it does **not** mean the GitHub PR merged or that sidecar **`prs[]`** is ready for reconcile. **Plan reconcile** is merge-driven archival + **`list-candidates`** + follow-ups triage; the developer runs it when they want that pass (often after merge, not the same moment as the last staging smoke).

## Script CLI (hosting repo)

All **`plan-state.mjs`** invocations run from the **hosting repo root** (the tree that contains **`.sedea/`**). Use a **direct `node` command** — the **Node runtime bundled with Sedea / VS Code** (e.g. integrated terminal where `node` is the editor’s runtime). **Do not** rely on **fnm**, **nvm**, or other host-installed Node managers.

```bash
node .sedea/centers/sedea-centers--development/missions/plan-and-deliver/scripts/plan-state.mjs <subcommand> …
```

Plans and sidecars live only under the **`.sedea/operations/`** union — **`.sedea/operations/joint/plans/`** and **`.sedea/operations/<operations-user-id>/plans/`** (literal **`joint`**). Do **not** use **`~/.cursor/plans/`** for Sedea product plans.

## Flow

### 1. Run reconcile (PR-tracked path)

```bash
node .sedea/centers/sedea-centers--development/missions/plan-and-deliver/scripts/plan-state.mjs reconcile
```

This queries **`gh pr view`** for every sidecar **`prs[]`** entry. The printed report has three buckets:

- **`archived`** — every PR for that plan is **`MERGED`**; **`plan-state`** moved the plan + sidecar and appended a bullet under **`## Child plans`** on the parent (when applicable). Nothing more for these in step 1.
- **`flagged`** — at least one PR closed without merge, mixed merged/open, unknown repo, or **`gh`** error. Needs judgement (step 3).
- **`skipped`** — still-open PRs, or no **`prs[]`** (the script’s way of saying “not this path”). Step 2 covers the no-**`prs[]`** subset via **`list-candidates`**.

Optional flags: **`--dry-run`**, **`--prune-worktrees`** (see script **`--help`**).

### 2. Run list-candidates (non-PR path)

```bash
node .sedea/centers/sedea-centers--development/missions/plan-and-deliver/scripts/plan-state.mjs list-candidates --json
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

Per **`.sedea/centers/sedea-centers--development/docs/development-process.md`** (**Cadence** / plan updates): **an un-triaged follow-up is a forgotten one**. Before archiving a plan that has a non-empty **`## Follow-ups`** section, route every bullet.

**Scope**

- **User-selected plans** from step 3 (candidates the user picked + flagged plans they opted to archive). Files are still at their **active** **`.sedea/operations/.../plans/`** paths for this pass (not yet archived here).
- **Reconcile-auto-archived plans** from step 1 (**`archived`** list). **`plan-state`** **`reconcile`** may have moved each **`.plan.md`** within the same operations scope — **do not** assume its former path. **Re-resolve** each slug’s **`.plan.md`** under **`.sedea/operations/`** (for example **`plan-state resolve`** or a search for **`<slug>.plan.md`** under that scope) after step 1. For this set, **Postpone** below is **not** offered — the plan is already archived; only **Integrate** and **Drop** apply.

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
node .sedea/centers/sedea-centers--development/missions/plan-and-deliver/scripts/plan-state.mjs archive \
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

### 5. End state — no plans-repo shortcut

**Do not** run a separate **plans-only** git commit flow from this skill (operations changes belong to your normal hosting / center git process unless the user asked you to commit).

Mutations are under **`.sedea/operations/`** (and possibly center git elsewhere). Summarise in chat: reconcile counts, what was archived with which signals, flagged leftovers, follow-ups triage counts, **`MANUAL:`** / **`postponed:`** slugs. Commit or push **only** when the user explicitly asked you to handle hosting or center git for this pass.

## Scope guard

**This skill**

- Runs **`reconcile`** ( **`gh`**, file moves, parent body notes where applicable).
- Runs **`list-candidates`** (read).
- Triages **`## Follow-ups`** on plans about to be archived and on reconcile-auto-archived plans; can append to other plans’ **`## Follow-ups`** with optional **Elaborate first** passes.
- Runs **`archive`** per selected slug (skipping **`postponed:`**).

**Out of scope**

- Creating worktrees (**`coding-session`**).
- Removing worktrees or closing windows (product scripts / user).
- Editing plan frontmatter or sidecar YAML directly — **`plan-state.mjs`** is the sole writer for those; step 3.5 only edits **`## Follow-ups`** markdown bodies.
- Promoting routed bullets into **Changes** / **Caveats** / **Delivery phases** — planning work the user does later.
- Pushing fixes to individual PRs. If a flagged plan needs an amend, tell the user; do not silently **`gh`**-mutate from here.

## Extensions

- **Stale worktree prune.** Today other flows own this. If UX merges here, add **`prune-sessions`** behind an explicit **`AskQuestion`** gate.
- **`shippedPrs` frontmatter** — when **`reconcile`** / archive writes **`shippedPrs`**, prefer that field in **`list-candidates`** heuristics over body regex (adjust step 2 comments when shipped).
- **`backfill-prs-from-body`** — optional step 0 behind a separate trigger if you add it to **`plan-state.mjs`**.
