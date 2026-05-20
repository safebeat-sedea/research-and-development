---
name: coding-session
description: >-
  **Coding session** protocol branch: create a git worktree + branch from origin/main,
  record worktrees and session focus in the plan sidecar via plan-state.mjs, attach the
  worktree in the same Sedea workbench (Mission Control sedea_add_worktree_folder per
  20_efficient-pr-shipping.mdc), emit a copy/paste-safe two-phase session prompt for
  **a coding agent**, and after the implementation cut point spawn **pre-pr-review**.
  Plan-anchored runs validate per-PR plans with plan-ws-completeness.mjs (_TBD_ in body
  requires completion or explicit override incomplete plan). Use under mission dispatch,
  natural language, or after planning when handing off implementation.
inputs:
  targetPlanPath:
    type: string
    description: Absolute or workspace-relative path to the PR plan to implement.
    required: false
  targetPlanSlug:
    type: string
    description: Slug for the PR plan to implement.
    required: false
  readyForImplementation:
    type: boolean
    description: Readiness signal from pr-plan. Required for spawned implementation handoff.
    required: false
  developerApprovedImplementation:
    type: boolean
    description: True only when the developer explicitly approved this PR plan for implementation handoff.
    required: false
  repoPath:
    type: string
    description: Absolute path to the product repo primary checkout for a single-repo coding session.
    required: false
  repoPaths:
    type: array
    description: Absolute paths to product repo primary checkouts for a multi-repo coding session.
    required: false
    default: []
  baseBranch:
    type: string
    description: Remote base branch to branch from; default origin/main unless repo rules say otherwise.
    required: false
    default: origin/main
  branchName:
    type: string
    description: Optional explicit branch name; otherwise derive from plan slug and local branch conventions.
    required: false
  ledgerParent:
    type: string
    description: Ledger parent slug/path copied from the upstream planning agent.
    required: false
  upstreamSkill:
    type: string
    description: Skill that requested implementation handoff, usually pr-plan.
    required: false
---

# Coding session

Hand off a unit of work from the **initiating** session to **a coding agent** in a **dedicated git worktree**, with the worktree visible in the **same Sedea workbench** (multi-root workspace), not a second editor process.

**Owns:** `git worktree add`, `plan-state.mjs set-worktrees` / `set-session`, Mission Control worktree attach, completeness gate, curated session prompt emission.

**Out of scope:** implementing product code in this chat; opening PRs; **`plan-reconcile`** archive cadence except where this skill references it for cleanup narrative.

After emitting the implementation session prompt(s), **stop** — do not `cd` into the worktree to implement. When invoked later from the coding agent lane after a committed cut point, this same skill owns spawning **`pre-pr-review`**.

## Spawned implementation handoff gate

When this skill is spawned from `pr-plan`, treat implementation handoff as plan-anchored and require:

1. `targetPlanPath` and `targetPlanSlug`.
2. `readyForImplementation: true`.
3. `developerApprovedImplementation: true`.
4. At least one repo target (`repoPath` or `repoPaths`).

If `readyForImplementation` is false or missing, stop before worktree creation and return `partial` with `remainingTasks` copied from the upstream PR plan readiness reasons. Do not create worktrees, attach folders, or emit a coding prompt from an unready PR plan.

If `developerApprovedImplementation` is false or missing, stop before worktree creation and ask the developer with **AskQuestion**. Required options:

- **Approve implementation handoff now**
- **Revise PR plan first**
- **Defer implementation**
- **Abandon this PR plan**
- **More details for option _**

Only **Approve implementation handoff now** authorizes worktree creation, sidecar session writes, MCP worktree attach, and coding-agent prompt emission.

If repo targets are missing, stop and ask the developer with **AskQuestion** to choose or provide the implementation repo(s). Do not infer from focused files alone.

## Plan completeness gate (before any worktree)

When this run anchors Phase 2 to a Plan Board **`.plan.md`** under the **`.sedea/operations/`** union (absolute path from the user message, an `@` path, or `node .sedea/centers/research-and-development/missions/plan-and-deliver/scripts/plan-state.mjs resolve --cwd "$PWD"` from the **hosting repo** when already linked), **validate the plan** before `git worktree add`, Mission Control attach, or emitting the session prompt.

**Lane-change snapshots** (*back to plan*, *where are we?*, …) follow `.sedea/centers/research-and-development/rules/30_planning-target-resolution.mdc` § *PR-plan completeness before coding-session*: when a snapshot lists both an incomplete per-PR plan and **coding-session**, **finishing the plan** must be ordered **first**.

**Skip this gate** when there is **no** plan file anchor (handoff with no `*.plan.md` in the task body).

**Bypass** when the user’s message contains **`override incomplete plan`** anywhere (ASCII, case-insensitive).

Otherwise:

1. Resolve the plan’s **absolute** path. If you cannot, **stop** and ask for a path or a `plan-state` linkage — do not silently skip validation.
2. From the **hosting repo root** (the tree that contains `.sedea/`), run:
   ```bash
   node .sedea/centers/research-and-development/missions/plan-and-deliver/scripts/plan-ws-completeness.mjs --file "<absolute-plan-path>"
   ```
   - Exit **0** and stdout `OK` or `SKIP_NOT_PER_PR` → proceed.
   - Exit **1** and stdout `INCOMPLETE` → **per-PR plan** still has `_TBD_` after stripping fenced code. **Do not** create worktrees or emit the prompt until the user accepts proceeding:
     - **Preferred:** **AskQuestion** — **“Stop — I’ll complete the plan first”** vs **“Executive override — proceed with incomplete plan”**. On stop, end with a short nudge (finish §§ 5–8 / deploy per **development-process**, then re-run **coding-session**). On override, continue **in the same turn** with worktree creation.

**Multi-repo:** run the script **once** on the shared plan before creating any worktrees.

## Start implementation approval gate

After readiness, repo selection, and plan completeness checks pass, but before any `git worktree add`, sidecar session write, Mission Control worktree attach, or coding-agent prompt emission, ask the developer for explicit start approval with **AskQuestion**. Required options:

- **Start implementation now**
- **Revise PR plan first**
- **Change repo or branch settings**
- **Defer implementation**
- **More details for option _**

Only **Start implementation now** authorizes worktree creation and session-state mutation. This gate applies to both spawned and standalone `coding-session` runs; earlier readiness or repo-selection answers are not approval to mutate worktrees or sidecars.

## Copy/paste-safe prompt output (required)

When you emit the final session prompt for the user to paste into **a coding agent** session:

- Wrap the **entire session prompt** in a fenced markdown code block (default ` ```text … ``` `).
- If the body contains triple backticks, use a four-backtick outer fence or escape inner fences.
- Keep explanatory prose **outside** the fence.

## Generic flow (single repo)

Run only **after** the [Plan completeness gate](#plan-completeness-gate-before-any-worktree) passes or is skipped / bypassed and the [Start implementation approval gate](#start-implementation-approval-gate) is approved.

1. Create a worktree on a fresh branch from `origin/main`:
   ```bash
   git fetch origin main
   git worktree add <sibling-path> -b <branch> origin/main
   ```
   - Prefix sibling paths with the repo directory basename (see **Worktree setup** in `.sedea/centers/research-and-development/rules/20_efficient-pr-shipping.mdc`).
   - Always branch from **`origin/main`**, not **`main`** (same failure mode as in **efficient-pr-shipping**).
   - Branch naming: follow **stacked-pr-branch-prefix** for this monorepo (`feat/NN-…`) and **efficient-pr-shipping** otherwise.
   - Refuse dirty primary checkouts before creating a worktree: run `git status --porcelain` in each repo and stop on any output. Do not stash, commit, discard, or clean the user's WIP.
   - If `baseBranch` input is supplied, it must be a remote branch ref such as `origin/main`; do not accept a local-only branch for spawned implementation.

2. **Record the session on the plan** (see [Sidecar state](#sidecar-state)). From the **hosting repo root**:
   ```bash
   node .sedea/centers/research-and-development/missions/plan-and-deliver/scripts/plan-state.mjs set-worktrees \
     --slug <plan-slug> \
     --json '[{"repo":"<repo-basename>","path":"<absolute-worktree-path>"}]'
   node .sedea/centers/research-and-development/missions/plan-and-deliver/scripts/plan-state.mjs set-session \
     --slug <plan-slug> \
     --focus <absolute-worktree-path>
   ```
   Skip when the session has no plan anchor.

3. **Attach the worktree in Sedea** (same workbench): in Mission Control, invoke MCP **`sedea_add_worktree_folder`** with JSON `{ "path": "<absolute-worktree-root>" }` (optional `"name"` for the explorer label). See **20_efficient-pr-shipping.mdc** — *Squad Leader on the main branch vs. agent sessions on worktree* and *Attach the worktree in Sedea*.

   This MCP attach is mandatory before emitting the coding-agent prompt. If the MCP call fails, stop with `partial`; report the worktree path and the attach error, and keep `continuationStatus: "active"` so the Squad Leader does not close the implementation lane.

4. Emit a **session prompt** (see [Session prompt structure](#session-prompt-structure)).

5. **Stop.**

## Multi-repo flow (shared branch name)

When the plan’s **Worktree setup** lists two or more repos, or the user asks for a cross-repo session:

1. For **each** repo, `git worktree add` with the **same branch name** (unless the plan says otherwise).
   - Validate every repo before creating any worktree. If one repo is dirty or missing the requested base branch, stop before creating a partial multi-repo session.

2. Optionally create a **`.code-workspace`** file listing each worktree folder with absolute `path` values — use only if your team uses that layout; otherwise attach **each** worktree root with **`sedea_add_worktree_folder`** in turn.

3. **`plan-state.mjs set-worktrees`** with one JSON entry per repo; **`set-session --focus`** to the workspace file **or** primary worktree path per your team convention (must stay consistent with **`resolve --cwd`** expectations in **planning-target-resolution**).

4. Emit **one session prompt per repo** (each with its own **Project rules** list and a **scope guard**: only edit under that repo’s worktree path).

5. **Stop.**

Cleanup when PRs merge: **`sedea_remove_worktree_folder`**, **`git worktree remove`**, **`plan-state.mjs prune-sessions`**, and **`plan-reconcile`** per **development-process** and **efficient-pr-shipping** — not repeated here.

## Pre-PR review handoff

This branch owns the pre-PR review handoff. After implementation reaches an explicit committed cut point, **the coding agent** invokes this `coding-session` branch again to spawn **`pre-pr-review`** directly.

### Review handoff preconditions

Before spawning **`pre-pr-review`**:

1. The developer has reviewed the IDE diff and explicitly authorized the review cut point, or the coding agent already has committed changes under an explicit user instruction.
2. `git status --short` in the worktree is empty. Uncommitted edits are invisible to the committed review diff, so do not spawn the reviewer while dirty.
3. `git log --oneline <baseRef>..HEAD` shows at least one commit.
4. `git diff <baseRef>...HEAD` is non-empty.
5. For plan-anchored runs, `plan-state.mjs resolve --cwd "<worktreePath>"` or supplied inputs identify the PR plan.

If any precondition fails, stop with `partial`, keep `continuationStatus: "active"`, and report the missing cut-point task. Do not silently commit, push, or spawn review.

### Review handoff inputs

Compile the **`pre-pr-review`** child inputs:

- `anchorType`: `plan` when a PR plan path is known, otherwise `free-form`.
- `targetPlanPath` / `targetPlanSlug`: required for `plan`.
- `worktreePath`
- `branchName`
- `baseRef`
- `projectRules`: absolute worktree `.cursor/rules/*.mdc` paths curated the same way as the implementation prompt.
- `diffSummary`: commits/files/line counts from the committed diff.
- `ledgerParent`
- `upstreamSkill: "coding-session"`

Spawn `.sedea/centers/research-and-development/missions/plan-and-deliver/skills/pre-pr-review/SKILL.md`, announce that **coding-session** is waiting for the pre-PR review result, and stop. Do not open a PR before the reviewer returns `recommendation: "go"`.

### Review result aggregation

When Mission Control delivers the **`pre-pr-review`** result:

1. Copy `blockers`, `flags`, `proposedFollowUps`, `followUpsAppended`, `codingAgentHandback`, `requiresDeveloperApproval`, `remainingTasks`, `activeLanes`, and `openLedgerEntries` into the coding-session result.
2. If recommendation is `go`, **coding-session** presents the approval gate in **Create-PR handoff after go** because it owns the implementation context, worktree path, branch, diff summary, PR plan path, and reviewer result. Do not make **`pre-pr-review`** spawn `create-pr`.
3. If recommendation is `no-go`, keep the implementation lane active and route back to coding-session fix work **only after developer approval**; do not proceed to PR creation.
4. If review failed, was aborted, or was abandoned, keep the ledger entry blocked until the developer retries, defers, or abandons the review.

### Review feedback approval gate

When **`pre-pr-review`** returns `recommendation: "no-go"` or any `blockers`:

1. Present the review summary to the developer: blockers, `Must`, `Should`, `Defer`, and any proposed follow-ups for the PR plan.
2. Use **AskQuestion** before making any code or plan edits. Required options:
   - **Apply Must fixes** — coding-session may edit only blocker / `Must` items.
   - **Apply Must + Should fixes** — coding-session may edit blocker / `Must` and `Should` items.
   - **Revise review scope** — clarify or challenge reviewer findings before code edits.
   - **Defer / abandon review fixes** — keep ledger blocked or mark the PR plan deferred/abandoned per developer choice.
   - **More details for option _**
3. Do not interpret the reviewer handback itself as approval. No source edits, plan edits, commits, pushes, or new review spawn occur until the developer chooses an approval option.
4. After approved fixes are implemented, require a new explicit committed cut point and spawn **`pre-pr-review`** again. The loop repeats until **`pre-pr-review`** returns `go` or the developer explicitly defers/abandons.
5. Track each loop pass in outputs as `reviewLoopCount` and keep `continuationStatus: "active"` while approval, fixes, commit cut point, or re-review remains open.

### Create-PR handoff after go

When **`pre-pr-review`** returns `recommendation: "go"`:

1. Verify the worktree branch is pushed or pushable per **efficient-pr-shipping**. Do not open the PR directly from coding-session.
2. Present the reviewer `go` summary, non-blocking flags, and any proposed follow-ups to the developer, then use **AskQuestion** before plan follow-up mutation or PR creation. Required options:
   - **Approve follow-ups and create PR now**
   - **Create PR without appending proposed follow-ups**
   - **Revise code or plan first**
   - **Defer PR creation**
   - **Abandon this implementation**
   - **More details for option _**
3. Only **Approve follow-ups and create PR now** authorizes appending proposed follow-ups before PR creation. **Create PR without appending proposed follow-ups** authorizes only PR creation. Do not treat `pre-pr-review` `go` as developer approval to mutate the plan or open/prepare a PR.
4. Emit exactly one child-spawn request for `.sedea/centers/research-and-development/missions/plan-and-deliver/skills/create-pr/SKILL.md`.
5. Inputs must include `targetPlanPath`, `targetPlanSlug`, `worktreePath`, `branchName`, `baseRef`, `repoUrl`, `diffSummary`, `prePrReviewRecommendation: "go"`, `prePrReviewFlags`, `followUpsAppended`, `ledgerParent`, and `upstreamSkill: "coding-session"`.
6. Announce that **coding-session** is waiting for the PR-creating agent result and stop. Do not continue to `pr-review` or deploy until `create-pr` reports a PR URL/number or a blocking failure.

When Mission Control delivers the **`create-pr`** result, copy `prUrl`, `prNumber`, `branchName`, `prState`, `reviewState`, `mergeSha`, `mergedAt`, `deployStatus`, `deployTodoStatus`, `remainingTasks`, `activeLanes`, and `openLedgerEntries` into the coding-session result. If the PR was created, keep the mission lane active for inline `pr-review`, merge tracking, and deploy verification. If `create-pr` reports deploy-walk active or blocked, propagate that status upstream without closing the coding-session ledger entry.

### Inline PR review after PR creation

After `create-pr` reports a PR URL/number, the active **coding-session agent** executes `.sedea/centers/research-and-development/missions/plan-and-deliver/skills/pr-review/SKILL.md` inline. Do not spawn a `pr-review` agent.

Inline `pr-review` inputs come from coding-session state:

- `prUrl` / `prNumber`
- `repoUrl`
- `worktreePath`
- `branchName`
- `targetPlanPath` / `targetPlanSlug`
- `ledgerParent`

The inline procedure:

1. Collects PR review comments.
2. Classifies each as `Must fix`, `Should fix`, `Skipped`, or `Skipped → follow-up`.
3. Uses **AskQuestion** for developer approval before any code, plan, GitHub, commit, or push action.
4. Applies only the approved fix scope.
5. Requires developer review before commit/push.
6. Runs GitHub reconciliation only after approved fixes are committed/pushed, or immediately for skipped-only triage.
7. Keeps coding-session `continuationStatus: "active"` until all PR comments are resolved, followed up, skipped with rationale, or explicitly deferred.

## Implementation handoff result

When this skill runs as a spawned child, end with a child result containing at least:

- `outputs.targetPlanPath`
- `outputs.targetPlanSlug`
- `outputs.readyForImplementation`
- `outputs.developerApprovedImplementation`
- `outputs.startImplementationApprovalStatus`
- `outputs.repoPaths`
- `outputs.worktrees` (array of `{repo, path, branch, attached}`)
- `outputs.branchName`
- `outputs.sessionPromptEmitted`
- `outputs.prePrReviewStatus`
- `outputs.prePrReviewRecommendation`
- `outputs.reviewBlockers`
- `outputs.proposedFollowUps`
- `outputs.reviewLoopCount`
- `outputs.developerApprovalStatus`
- `outputs.prCreationApprovalStatus`
- `outputs.createPrStatus`
- `outputs.prUrl`
- `outputs.prNumber`
- `outputs.prState`
- `outputs.reviewState`
- `outputs.mergeSha`
- `outputs.mergedAt`
- `outputs.deployStatus`
- `outputs.deployTodoStatus`
- `outputs.prReviewStatus`
- `outputs.prReviewComments`
- `outputs.prReviewDispositions`
- `outputs.prReviewBlockers`
- `outputs.githubReconciliationStatus`
- `outputs.activeLanes`
- `outputs.openLedgerEntries`
- `outputs.remainingTasks`
- `outputs.continuationOwner: "coding-session-agent"`
- `outputs.continuationStatus`

Set `outputs.continuationStatus` as follows:

- `active` when worktrees are created and prompts emitted; implementation is now waiting on the coding agent lane.
- `active` when pre-pr-review returns blockers and developer approval for fixes is pending.
- `active` when approved review fixes, a new committed cut point, or re-review remains.
- `active` when PR review comments, developer approval, fixes, commit/push, or GitHub reconciliation remain.
- `active` when PR merge, deploy-walk, deploy checklist, or deploy capstone todo remains.
- `active` when worktrees exist but Mission Control attach or prompt emission still needs repair.
- `terminal` only when this branch is explicitly scoped to worktree/prompt setup and those setup tasks are complete with no active coding lane tracked by this dispatch.
- `partial` status with `continuationStatus: "active"` when readiness, repo selection, dirty tree, base branch, sidecar write, or MCP attach blocks setup.

Do not propose dispatch resolution from this skill; the Squad Leader closes the ledger after coding, review, PR, and deploy verification report terminal status.

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

R&D **center** rules (`10_`–`40_`, all `alwaysApply: true`) load on every dispatch via Mission Control. This warm-up block is for **product-repo** `.cursor/rules/*.mdc` paths under **Project rules** — list explicit `Read` steps for those only.

**Four vs five steps:** If Phase 2 links a **`.plan.md`** (absolute path), use **five** steps and include **Plan file + sidecar** (step 5). Otherwise use **four** steps (omit step 5).

Phrase a hard gate, e.g. `Warm-up first — do not read the task body below --- until every step above is done and acknowledged`.

1. **Workspace readiness** — **Read** the worktree **`README`** and **`CONTRIBUTING`** when present. For **readiness or pre-task checks**, follow **only** what those files say, what the **plan** explicitly links for setup, and what **`.cursor/rules/*.mdc`** files prescribe **when they describe pre-work or environment gates** (do not invent extra checks). If nothing prescribes a check, one line **Readiness: no checks in README / CONTRIBUTING / cited rules** — continue. If a prescribed check fails, **stop** and ask the user.
2. **Verify branch:** `git branch --show-current` matches the expected branch.
3. **Process handback** — the **developer** continues via **AskQuestion** / **numbered** options or mission dispatch per **development-process**; do **not** rely on legacy typed shortcut tokens as the control surface. Name next moves with protocol branches (**`plan-reconcile`**, **`pre-pr-review`**, **`pr-review`**, commit cadence per **20_efficient-pr-shipping**).
4. **Load project rules:** `Read` every path under **Project rules**; acknowledge before continuing.
5. **Plan file + sidecar** *(plan-anchored only)*: Plans live under **`.sedea/operations/.../plans/`**; runtime fields (`worktrees`, `prs`, `session`, `parent`, todos via scripts) follow the **`.sedea/operations/`** plan union and **`plan-state.mjs`** contracts — flip todo status only through **`plan-state.mjs`** subcommands (`set-todo-status`, `todo-start`, `todo-done`); do not hand-edit `.state.yaml` except to repair a bad state. After substantive progress on a scoped todo, update status so the Plan Board stays accurate. PR linkage after push follows **20_efficient-pr-shipping** and **`plan-state.mjs upsert-pr`**.

### Phase 2 — Task

Include:

- Which PR to implement (scope, behaviour, files).
- **Plan link:** absolute path to the `.plan.md` (e.g. `@/…/.sedea/operations/…/plans/<slug>.plan.md`). When present, the emitter must have used the **five-step** warm-up.
- **Follow-ups** — per **development-process** *Coding session* / *Feedback collection*: maintain **`## Follow-ups`** on the PR plan; append bullets for out-of-scope ideas with optional `(target: …)` hints.
- **Review cadence** — after implementation and an explicit committed cut point, **a coding agent** invokes **`coding-session`** review handoff so Mission Control spawns **`pre-pr-review`** in a fresh reviewer lane before treating the change as merge-ready; coordinate **`pr-review`** and commit/push steps per **efficient-pr-shipping** (describe by **protocol branch** name, not legacy tokens).
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

Stop after implementation; after an explicit committed cut point, invoke **`coding-session`** review handoff so Mission Control spawns **`pre-pr-review`** in a fresh reviewer lane per **development-process**.
```
