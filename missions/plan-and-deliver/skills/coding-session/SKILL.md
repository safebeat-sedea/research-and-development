---
name: coding-session
description: >-
  **Coding session** protocol branch: create a git worktree + branch from origin/main,
  record worktrees and session focus in the plan sidecar via plan-state.mjs, attach the
  worktree in the same Sedea workbench (Mission Control sedea_add_worktree_folder per
  efficient-pr-shipping.mdc), and emit a copy/paste-safe two-phase session prompt for
  **a coding agent**. Plan-anchored runs validate per-PR plans with plan-ws-completeness.mjs
  (_TBD_ in body requires completion or explicit override incomplete plan). Use under
  mission dispatch, natural language, or after planning when handing off implementation.
---

# Coding session

Hand off a unit of work from the **initiating** session to **a coding agent** in a **dedicated git worktree**, with the worktree visible in the **same Sedea workbench** (multi-root workspace), not a second editor process.

**Owns:** `git worktree add`, `plan-state.mjs set-worktrees` / `set-session`, Mission Control worktree attach, completeness gate, curated session prompt emission.

**Out of scope:** implementing product code in this chat; opening PRs; **`plan-reconcile`** archive cadence except where this skill references it for cleanup narrative.

After emitting the session prompt(s), **stop** — do not `cd` into the worktree to implement.

## Plan completeness gate (before any worktree)

When this run anchors Phase 2 to a Plan Board **`.plan.md`** under the **`.sedea/operations/`** union (absolute path from the user message, an `@` path, or `node .sedea/centers/sedea-centers--development/missions/plan-and-deliver/scripts/plan-state.mjs resolve --cwd "$PWD"` from the **hosting repo** when already linked), **validate the plan** before `git worktree add`, Mission Control attach, or emitting the session prompt.

**Lane-change snapshots** (*back to plan*, *where are we?*, …) follow `.sedea/centers/sedea-centers--development/rules/planning-target-resolution.mdc` § *PR-plan completeness before coding-session*: when a snapshot lists both an incomplete per-PR plan and **coding-session**, **finishing the plan** must be ordered **first**.

**Skip this gate** when there is **no** plan file anchor (handoff with no `*.plan.md` in the task body).

**Bypass** when the user’s message contains **`override incomplete plan`** anywhere (ASCII, case-insensitive).

Otherwise:

1. Resolve the plan’s **absolute** path. If you cannot, **stop** and ask for a path or a `plan-state` linkage — do not silently skip validation.
2. From the **hosting repo root** (the tree that contains `.sedea/`), run:
   ```bash
   node .sedea/centers/sedea-centers--development/missions/plan-and-deliver/scripts/plan-ws-completeness.mjs --file "<absolute-plan-path>"
   ```
   - Exit **0** and stdout `OK` or `SKIP_NOT_PER_PR` → proceed.
   - Exit **1** and stdout `INCOMPLETE` → **per-PR plan** still has `_TBD_` after stripping fenced code. **Do not** create worktrees or emit the prompt until the user accepts proceeding:
     - **Preferred:** **AskQuestion** — **“Stop — I’ll complete the plan first”** vs **“Executive override — proceed with incomplete plan”**. On stop, end with a short nudge (finish §§ 5–8 / deploy per **development-process**, then re-run **coding-session**). On override, continue **in the same turn** with worktree creation.

**Multi-repo:** run the script **once** on the shared plan before creating any worktrees.

## Copy/paste-safe prompt output (required)

When you emit the final session prompt for the user to paste into **a coding agent** session:

- Wrap the **entire session prompt** in a fenced markdown code block (default ` ```text … ``` `).
- If the body contains triple backticks, use a four-backtick outer fence or escape inner fences.
- Keep explanatory prose **outside** the fence.

## Generic flow (single repo)

Run only **after** the [Plan completeness gate](#plan-completeness-gate-before-any-worktree) passes or is skipped / bypassed.

1. Create a worktree on a fresh branch from `origin/main`:
   ```bash
   git fetch origin main
   git worktree add <sibling-path> -b <branch> origin/main
   ```
   - Prefix sibling paths with the repo directory basename (see **Worktree setup** in `.sedea/centers/sedea-centers--development/rules/efficient-pr-shipping.mdc`).
   - Always branch from **`origin/main`**, not **`main`** (same failure mode as in **efficient-pr-shipping**).
   - Branch naming: follow **stacked-pr-branch-prefix** for this monorepo (`feat/NN-…`) and **efficient-pr-shipping** otherwise.

2. **Record the session on the plan** (see [Sidecar state](#sidecar-state)). From the **hosting repo root**:
   ```bash
   node .sedea/centers/sedea-centers--development/missions/plan-and-deliver/scripts/plan-state.mjs set-worktrees \
     --slug <plan-slug> \
     --json '[{"repo":"<repo-basename>","path":"<absolute-worktree-path>"}]'
   node .sedea/centers/sedea-centers--development/missions/plan-and-deliver/scripts/plan-state.mjs set-session \
     --slug <plan-slug> \
     --focus <absolute-worktree-path>
   ```
   Skip when the session has no plan anchor.

3. **Attach the worktree in Sedea** (same workbench): in Mission Control, invoke MCP **`sedea_add_worktree_folder`** with JSON `{ "path": "<absolute-worktree-root>" }` (optional `"name"` for the explorer label). See **efficient-pr-shipping.mdc** — *Squad Leader on the main branch vs. agent sessions on worktree* and *Attach the worktree in Sedea*.

4. Emit a **session prompt** (see [Session prompt structure](#session-prompt-structure)).

5. **Stop.**

## Multi-repo flow (shared branch name)

When the plan’s **Worktree setup** lists two or more repos, or the user asks for a cross-repo session:

1. For **each** repo, `git worktree add` with the **same branch name** (unless the plan says otherwise).

2. Optionally create a **`.code-workspace`** file listing each worktree folder with absolute `path` values — use only if your team uses that layout; otherwise attach **each** worktree root with **`sedea_add_worktree_folder`** in turn.

3. **`plan-state.mjs set-worktrees`** with one JSON entry per repo; **`set-session --focus`** to the workspace file **or** primary worktree path per your team convention (must stay consistent with **`resolve --cwd`** expectations in **planning-target-resolution**).

4. Emit **one session prompt per repo** (each with its own **Project rules** list and a **scope guard**: only edit under that repo’s worktree path).

5. **Stop.**

Cleanup when PRs merge: **`sedea_remove_worktree_folder`**, **`git worktree remove`**, **`plan-state.mjs prune-sessions`**, and **`plan-reconcile`** per **development-process** and **efficient-pr-shipping** — not repeated here.

## Sidecar state

Writes go through **`plan-state.mjs`** into **`<slug>.state.yaml`** next to **`<slug>.plan.md`** under **`.sedea/operations/.../plans/`** — never plan frontmatter for `worktrees` / `session`.

```yaml
worktrees:
  - repo: <repo-basename>
    path: <absolute-path>
session:
  focusPath: <absolute-path>
```

- Always a **list** for `worktrees`, even when length is 1.
- **`set-worktrees` replaces the list wholesale** — one active worktree set per plan for this protocol’s session model.
- Absolute paths only (no `~`).
- Skip sidecar updates when there is no plan anchor.

## Session prompt structure

**Block order:** title line → blank line → **Project rules** → **Warm-up** → `---` on its own line → **Task** (Phase 2).

### Project rules bundle (emitter must curate)

Infer touched subtrees from the anchored plan and PR scope. List **absolute** paths to **`<worktree>/.cursor/rules/*.mdc`** the worker must `Read` during warm-up.

- Paths must point at the **worktree**, not the main clone.
- **De-duplicate** and order: baseline → architecture → area-specific.
- **No vendor-specific matrix** — curate from plan headings, § 5 repo rules impact, and file paths. **Repo-specific** path patterns (extra checkout roots, package sub-trees, etc.) belong in **that product repository’s** `.cursor/rules/*.mdc` — keep this center skill **repo-agnostic**.

### Phase 1 — Warm-up (before the task)

Workers may skip `alwaysApply: false` rules unless forced. Use a warm-up block so rule reads are explicit steps.

**Four vs five steps:** If Phase 2 links a **`.plan.md`** (absolute path), use **five** steps and include **Plan file + sidecar** (step 5). Otherwise use **four** steps (omit step 5).

Phrase a hard gate, e.g. `Warm-up first — do not read the task body below --- until every step above is done and acknowledged`.

1. **Workspace readiness** — **Read** the worktree **`README`** and **`CONTRIBUTING`** when present. For **readiness or pre-task checks**, follow **only** what those files say, what the **plan** explicitly links for setup, and what **`.cursor/rules/*.mdc`** files prescribe **when they describe pre-work or environment gates** (do not invent extra checks). If nothing prescribes a check, one line **Readiness: no checks in README / CONTRIBUTING / cited rules** — continue. If a prescribed check fails, **stop** and ask the user.
2. **Verify branch:** `git branch --show-current` matches the expected branch.
3. **Process handback** — the **developer** continues via **AskQuestion** / **numbered** options or mission dispatch per **development-process**; do **not** rely on legacy typed shortcut tokens as the control surface. Name next moves with protocol branches (**`plan-reconcile`**, **`pre-pr-review-emit`**, **`pr-review`**, commit cadence per **efficient-pr-shipping**).
4. **Load project rules:** `Read` every path under **Project rules**; acknowledge before continuing.
5. **Plan file + sidecar** *(plan-anchored only)*: Plans live under **`.sedea/operations/.../plans/`**; runtime fields (`worktrees`, `prs`, `session`, `parent`, todos via scripts) follow the **`.sedea/operations/`** plan union and **`plan-state.mjs`** contracts — flip todo status only through **`plan-state.mjs`** subcommands (`set-todo-status`, `todo-start`, `todo-done`); do not hand-edit `.state.yaml` except to repair a bad state. After substantive progress on a scoped todo, update status so the Plan Board stays accurate. PR linkage after push follows **efficient-pr-shipping** and **`plan-state.mjs upsert-pr`**.

### Phase 2 — Task

Include:

- Which PR to implement (scope, behaviour, files).
- **Plan link:** absolute path to the `.plan.md` (e.g. `@/…/.sedea/operations/…/plans/<slug>.plan.md`). When present, the emitter must have used the **five-step** warm-up.
- **Follow-ups** — per **development-process** *Coding session* / *Feedback collection*: maintain **`## Follow-ups`** on the PR plan; append bullets for out-of-scope ideas with optional `(target: …)` hints.
- **Review cadence** — after implementation, **a coding agent** runs **`pre-pr-review-emit`** so a **new** session can execute as **a pre-PR reviewer agent** (**`pre-pr-review-run`**) before treating the change as merge-ready; coordinate **`pr-review`** and commit/push steps per **efficient-pr-shipping** (describe by **protocol branch** name, not legacy tokens).
- **Multi-repo only:** scope guard line per repo.

## Verbatim override

If the user supplies custom prompt text, keep their prose **verbatim** inside Phase 2 after the `---`. Still **prepend** the curated **Project rules** block and the correct **warm-up** step count (four vs five). Merge duplicates without weakening gates.

## Example (illustrative)

When emitting a **real** prompt, substitute **concrete absolute paths** for every `<…>` placeholder (worktree root, hosting checkout root, plan file, etc.). Do **not** paste unresolved placeholders into **a coding agent** session.

```text
product-repo — feat/01-example

### Project rules (read during warm-up, before the task body)

Use the Read tool on each path below, then acknowledge before starting the task.

- `<absolute-worktree-root>/.cursor/rules/<example>.mdc`

**Warm-up first — do not read the task body below --- until all five steps are done and acknowledged.**

1. Workspace readiness: README, CONTRIBUTING, plan-linked setup, and repo rules only where they prescribe pre-work; stop if a documented check fails.
2. Branch check: expect feat/01-example
3. Process handback: next moves via AskQuestion / mission dispatch; protocol names only.
4. Load every **Project rules** path.
5. Plan + sidecar: `.sedea/operations/…/plans/<slug>.plan.md` and `<slug>.state.yaml`; todo updates via plan-state only.

---

Implement the scoped change described in `@<absolute-hosting-repo-root>/.sedea/operations/joint/plans/<slug>.plan.md` §§ 5–7 for this PR.

**Follow-ups discipline.** Append to `## Follow-ups` on that plan when you discover scope-adjacent items.

Stop after implementation; then **a coding agent** runs **`pre-pr-review-emit`** so **a pre-PR reviewer agent** can run in a **fresh** session per **development-process**.
```
