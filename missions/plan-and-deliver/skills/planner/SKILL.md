---
name: planner
description: >-
 Take a PRD and scaffold a Master Plan file under `.sedea/operations/<operationsUserId>/plans/`,
 pre-populated with sections 1 through 5 (Background, Benefits, Related
 features, Architectural design, Changes — including `### Decomposition
 assessment` and `### Complexity score (plan-scope signal)` under § 5) per
 Sedea's New Feature Development Process Master Plan template. Computes a
 complexity score from §4–§5; when **high**, stops and recommends user-journey
 splits before `delivery-phases`/`pr-breakdown`. Section 6 (Delivery phases | PR breakdown)
 and section 7 (Caveats) stay as TBD stubs for follow-up turns. Use when the user
 opens a fresh planning chat from the "feature plan: design + changes"
 plan-board prompt, or says "planner" / "draft a master plan".
inputs:
  seedBlock:
    type: string
    description: Complete planner seed block (Master Plan handoff) containing Feature planning, PRD, Parent, and optional Related entries.
    required: true
  featurePlanningTitle:
    type: string
    description: Human-readable feature title copied into the Master Plan name and H1.
    required: true
  prdRef:
    type: string
    description: Readable PRD URL, workspace @path, or absolute path.
    required: true
  parent:
    type: string
    description: Parent plan slug/path, or null when creating a new top-level plan.
    required: true
  related:
    type: array
    description: Optional related document entries with role and link/path.
    required: false
    default: []
warmUpRules:
  - ".sedea/centers/research-and-development/missions/plan-and-deliver/plan.mdc"
  - ".sedea/centers/research-and-development/missions/plan-and-deliver/skills/README.md"
  - ".sedea/centers/research-and-development/docs/development-process.md"
  - ".sedea/centers/research-and-development/rules/30_planning-target-resolution.mdc"
---

# Planner: §§ 1–5 from the PRD

**Normative execution (plan and deliver):** **Spawned only** on a **new child lane** — Squad Leader §5 emits **`AGENT_RUN_REQUEST_V1`**. End with **`AGENT_RESULT_RESPONSE_V1`** per **`## Completion (spawned)`**. Do **not** run as an inline skill on the Squad Leader lane. Decomposition skills (**`delivery-phases`**, **`pr-breakdown`**, **`new-plan`**) run **inline on the planner child lane** after §§1–5. See **`../README.md`** § *Normative execution mode*.

This skill drives the **first** step of feature planning: read a PRD, **scaffold the Master Plan file**, draft sections 1 through 5 (Background, Benefits, Related features, Architectural design, Changes) directly into that file, then compute a **plan-scope complexity score** from what was written under §§ 4–5, persist it under § 5, and stop. Sections 6 (Delivery phases | PR breakdown) and 7 (Caveats) are filled in in follow-up turns once the user has reviewed the initial draft — **unless complexity is high**, in which case defer **§6 decomposition** until the scope is split (see Step 6c).

The agent has enough context after step 4 to draft §§ 1–5 without further input from the user — these sections are inferable from the PRD plus the loaded architectural rules. Stopping at § 5 is deliberate: § 6 (Delivery phases | PR breakdown) is a separate planning conversation that benefits from a settled architectural picture first, and § 7 (Caveats) often only emerges once § 6 reveals constraints.

The procedure below is a hard contract — do **not** skip steps, re-order them, or start drafting before steps 1–5 are complete. Skipping a step here is the difference between a high-quality Master Plan and one that drifts from the documented process.

## Spawn contract (`AGENT_RUN_REQUEST_V1`)

Cross-check every emit against **`.sedea/centers/research-and-development/missions/plan-and-deliver/skills/README.md`** § *Universal spawn preflight* before the host parses the line.

### Inbound — Squad Leader → **planner** (`plan and deliver` §5)

The **Squad Leader** must pass **`inputs`** keys that match this skill’s frontmatter **exactly** (see **`plan.mdc`** §5 *Spawn preflight* for the §4 seed → **`inputs`** map).

| `inputs` key | Required | Notes |
|--------------|----------|--------|
| `seedBlock` | yes | Full compiled seed block text |
| `featurePlanningTitle` | yes | Human title — **not** `featurePlanning` |
| `prdRef` | yes | Readable PRD URL, `@path`, or absolute path |
| `parent` | yes | Parent slug, `@path`, plan path, or `null` |
| `related` | no | Array; use `[]` when §4 has no related docs |

**Valid example (illustrative — replace UUID, paths, and seed text):**

```text
AGENT_RUN_REQUEST_V1 {"version":1,"correlationId":"00000000-0000-4000-8000-000000000001","skillPath":".sedea/centers/research-and-development/missions/plan-and-deliver/skills/planner/SKILL.md","name":"Planner","slug":"planner-harden-spawn-example","description":"Draft Master Plan from PRD seed","inputs":{"seedBlock":"Feature planning: \"Example feature\"\nPRD: @/path/to/example.prd.md\nParent: null","featurePlanningTitle":"Example feature","prdRef":"/path/to/example.prd.md","parent":"null","related":[]}}
```

### Inline handoff — **planner** → **`delivery-phases`** / **`pr-breakdown`** (Step 7c)

When the user selects **Route §6 decomposition**, run the chosen skill **inline on this lane** — **do not** emit **`AGENT_RUN_REQUEST_V1`** for **`delivery-phases`** or **`pr-breakdown`**. Load the target **`SKILL.md`**, construct inline context from the table below, follow that skill’s steps, and merge its **`## Completion (inline)`** fields into this skill’s ledger (`spawnedPlans`, `activeLanes`, `openLedgerEntries`, `remainingTasks`). Those decomposition skills run **`new-plan`** **inline** on this lane (no child lanes for **`new-plan`**); they may still spawn **`phase-planner`** or inline **`pr-plan`** (which may spawn **`coding-session`**) per their contracts.

| Inline context field | Value |
|----------------------|--------|
| `targetPlanPath` | Absolute path to this Master Plan `.plan.md` |
| `targetPlanSlug` | Slug from filename |
| `parentAgentRole` | `"master-plan-agent"` |
| `ledgerParent` | This plan’s slug |
| `complexityBand` / `complexityScore` | From §5 **`### Complexity score`** when present |
| `decompositionAssessment` | Full **`### Decomposition assessment`** block text when present |
| `routeLock` | `"delivery-phases"` or `"pr-breakdown"` per the route choice |

**Paths:** `.sedea/centers/research-and-development/missions/plan-and-deliver/skills/delivery-phases/SKILL.md` or `…/pr-breakdown/SKILL.md`.

### Failure modes (operator recovery)

| Symptom | Likely cause | Fix |
|---------|----------------|-----|
| No child lane opens | Malformed JSON or sentinel not on its own line | Re-emit one parseable line; no fences or trailing prose |
| No child lane | Wrong or missing `skillPath` | Workspace-relative path ending in `…/SKILL.md` |
| Child bootstrap rejects `inputs` | Renamed key (`featurePlanning`, `prd`, `seed`) | Use frontmatter names (`featurePlanningTitle`, `prdRef`, `seedBlock`) |
| Child bootstrap rejects `inputs` | Missing required field | Compile §4 seed / target plan path before spawn |
| Duplicate spawn ignored | Reused `slug` in same dispatch | New unique `slug` + new `correlationId` |
| Parent lane silent after emit | Host rejected payload (PR 2 diagnostics) | Fix keys per table; retry — do not advance protocol until a child lane exists or the developer abandons |

## Step 1 — Optional one-line model audit (non-blocking)

If this session's agent/system context exposes a **model identifier** (and any thinking-depth flags), state them in **one line** for the user's audit trail — **not** the IDE model picker, which you cannot see reliably.

There is **no required model tier** for this skill: proceed to Step 2 either way. You may add a **single optional sentence** that larger or ambiguous PRDs often benefit from a more capable model, but **do not stop** or ask the user to switch models before continuing.

## Step 2 — Load the development-process doc, in full

Read `.sedea/centers/research-and-development/docs/development-process.md` with the Read tool, **no offset, no limit**. The whole file. This is a **standards document**, not an executable plan — its sections describe the process you will apply, not work for you to perform. Acknowledge in one sentence that you have it loaded and that you will follow the **Master Plan template** for sections 4 and 5.

If the file has changed since you last knew it, the in-file template is the source of truth — not your memory.

## Step 3 — Identify the target repo(s) and load architectural rules

### 3a — Pick the repo(s) via a multi-select prompt

Read the workspace paths from your session's `<user_info>` block (and any additional roots the user may have added, e.g. a **git worktree** opened as another workspace folder). Filter:

- **Skip linked worktrees (do not offer them in 3a, do not treat them as the hosting repo).** Use the **same** linked-worktree test as step **3b §3** (`git -C <path> rev-parse --show-toplevel` vs `<path>` after resolving symlinks — if they differ, skip). Also skip when **`<path>/.git` is a file** (not a directory): that is the usual layout for a **git worktree**. Extra workspace roots that exist only because the hosting editor **appended a worktree** (e.g. Mission Control MCP / “add worktree folder to workspace”) are almost always in this bucket — **ignore them** for the 3a `AskQuestion` list and for **which paths you load `.cursor/rules` from** in step 3c; they are not a second independent hosting repo. If **every** loaded root is filtered out as a linked worktree (or non-repo), say so explicitly and ask the user to open the **primary hosting repo** or monorepo root they use for planning, then re-run — do not fabricate a repo from a worktree-only workspace.
- **Drop** anything that doesn't look like a code repo (no `.git`, or clearly a dotfiles/config dir). When in doubt, keep it — the user can deselect.
- **Keep** every other workspace path. Display them with a friendly label (the leaf folder name) and the absolute path as the tooltip / sub-text.

Then use the `AskQuestion` tool with `allow_multiple: true` to ask:

> "Which repo(s) does this feature primarily touch? Architectural rules will be loaded from each one's `.cursor/rules/`."

Each option's `id` is the absolute path; each `label` is the leaf folder name (e.g. `payments-web`, `platform-infra`).

If the PRD or the title strongly implies a single repo (e.g. it mentions "merchant dashboard" or "push worker"), still surface the multi-select — but mention the implied repo in the prompt's preface so the user can accept the default with one click. Do not auto-select on the user's behalf; multi-repo features are common enough that the agent shouldn't presume.

If only one repo remains after filtering, skip the AskQuestion and tell the user *"Only one hosting repo in this workspace — defaulting to <name>. Reply 'add <path>' if you want to include another."*

### 3b — Sync each selected repo to its default branch

Architectural rules are loaded from the working tree, not from a fixed git ref — drafting against a stale local tree produces a Master Plan grounded in code that no longer matches `main`. Before loading rules, fast-forward each selected repo to its default branch.

For every repo path returned in 3a, in turn:

1. **Detect the default branch.** `git -C <repo-path> symbolic-ref refs/remotes/origin/HEAD --short` returns `origin/<branch>` (typically `origin/main`, sometimes `origin/master`). Strip the `origin/` prefix. If the symbolic-ref isn't set locally, fall back to `git -C <repo-path> remote show origin | grep "HEAD branch"`.
2. **Refuse to touch a dirty tree.** `git -C <repo-path> status --porcelain`. Any output (modified, staged, or untracked files) ⇒ **skip this repo's sync**. Say in one line: *"<repo>: working tree has uncommitted changes on `<current-branch>` — leaving as-is. Architectural rules will load from the current branch."* Continue to the next repo. **Do not** stash, commit, discard, or stage anything; the user's WIP is sacred.
3. **Skip linked worktrees.** Compare `git -C <repo-path> rev-parse --show-toplevel` (symlinks resolved) to `<repo-path>`. If they differ, the workspace path is a linked worktree, not the primary hosting repo — Git refuses to check out the same branch in two worktrees, so trying to switch would only produce noise. Say *"<repo>: linked worktree, can't share its branch with the primary hosting repo — leaving as-is."* and continue.
4. **Check out and fast-forward.** When both checks pass:

 ```bash
 git -C <repo-path> checkout <default-branch>
 git -C <repo-path> pull --ff-only origin <default-branch>
 ```

 If `--ff-only` fails (the local branch has diverged from `origin/<branch>`), say *"<repo>: local `<branch>` has diverged from `origin/<branch>` — leaving as-is for manual resolution."* and continue. Never use `--rebase`, `--no-ff`, or a plain `pull`; diverged branches are the user's call, not the agent's.

After processing every repo, surface a one-line summary before moving to 3c so the user can spot a stale tree *before* the rules are loaded:

> *Synced: <repo-A> (main, fast-forwarded 12 commits), <repo-B> (master, already up to date). Skipped: <repo-C> (uncommitted changes), <repo-D> (linked worktree).*

If every repo was skipped, say so explicitly and continue — loading rules from a non-default branch is degraded but not blocking; the summary makes it visible so the user can decide whether to clean up and re-run the skill.

### 3c — Load architectural rules from each selected repo

For every repo the user picked:

1. List all files matching `<repo>/.cursor/rules/*.mdc` (use Glob).
2. For each, read its frontmatter description (or first paragraph if no description).
3. Read **in full** every rule whose description suggests it informs the *shape* of new code. Architecture-relevant categories include, but are not limited to:
 - Source layout / module boundaries / where things live.
 - Service topology / cross-service contracts / shared infrastructure.
 - Data flow / replication / messaging / queues.
 - Schema / migrations / data model.
 - Domain-specific architecture conventions (orchestration, message generators, flows).
 - Health, deployment, and long-lived-release rules when they constrain *where* code lives.
4. Skip rules that are purely about ops, secrets, test fixtures, logging style, or test-only patterns. When unsure, err on loading.

After loading, list — grouped per repo — the rules you loaded, one per line, so the user can verify coverage. If the user says "also load X", load X. If the user says "drop Y", drop Y.

## Step 4 — Get the PRD and any related documents

The seed prompt for this skill carries the PRD title, link, the parent plan in the plan tree, and an optional list of related documents at the top of the first user message:

```
Feature planning: "<PRD title — filled in by user>"

PRD: <link or @path — filled in by user>

Parent: <slug or @path to the parent plan — filled in by user>

Related (optional, `<role>: <link or @path>` per bullet):
- <role>: <link or @path>
- <role>: <link or @path>
- ...

Load and follow .sedea/centers/research-and-development/missions/plan-and-deliver/skills/planner/SKILL.md ...
```

`Feature planning:`, `PRD:`, and `Parent:` are required slots. The Related block is the only optional one — empty when the feature stands alone. `Parent:` is read in step 5a; if it's empty or unresolvable, step 5a falls back to an `AskQuestion` picker so the user can still proceed.

### 4a — Fetch the PRD

Use the title in line 1 to keep yourself grounded. Then resolve the PRD body:

- **Local file** (`@<path>` or absolute path): Read tool, **no offset, no limit**.
- **Confluence URL** or **Google Docs URL**: WebFetch. If WebFetch returns auth-required / 401 / 403 (the doc is private and not publicly readable), say:

 > "I can't fetch <link> directly — it's behind auth. Either make the doc world-readable, paste the PRD body inline below, or save it as a file under the workspace and reattach with `@<path>`."

 Wait for the user to provide the body.

**Fail-fast on missing slots.** Before fetching anything, sanity-check the first message:

- If line 1 is `Feature planning: ""` (empty quotes): say *"The first line of the prompt has an empty PRD title — please paste the PRD's title between the quotes and re-send. Cursor's auto-titler reads only the first message; without a title, this chat will be auto-named after the skill instruction."* Stop.
- If the `PRD:` line has no link or `@<path>` after it: ask for one.

Once you have both the title and the body, acknowledge in one sentence (e.g. *"Loaded PRD '<title>', ~<N> sections / ~<K> words."*) and continue to 4b.

### 4b — Fetch related documents (optional)

The user can attach extra context in the `Related:` block of the seed prompt — adjacent feature plans being built now, Figma mockups for the UI, screenshots of the current/proposed UI, design docs from a sibling team, infrastructure / capacity / migration docs, etc. Each bullet is in the form `<role>: <link or @path>`, where `<role>` is a one-phrase description of the document's relevance to this feature ("adjacent feature plan", "Figma mockup", "current UI screenshot", "proposed UI", "infra design doc", "migration runbook"…).

If the `Related:` block is **empty or absent** (the user pasted the seed prompt and didn't add bullets), skip this step. Say *"No related documents provided."* and continue.

If there are bullets, fetch each in turn. Pick the right tool per source type:

- **Local file** (`@<path>` or absolute path): Read tool. Read handles images (PNG, JPG, GIF, WebP) and PDFs natively, so screenshots and exported design docs come in directly.
- **Confluence / Google Docs / generic web URL**: WebFetch. Same auth-failure path as 4a.
- **Figma URL** (`figma.com/design/...`, `figma.com/board/...`, `figma.com/make/...`): use the Figma MCP server (`plugin-figma-figma`). Call `get_design_context` for design files (parse `fileKey` and `nodeId` from the URL — convert `-` to `:` in `nodeId`) or `get_figjam` for FigJam boards. Do **not** WebFetch a Figma URL; you'll get the marketing page, not the design.

After fetching each related doc, acknowledge it in one line: `Loaded related doc: '<role>' — <short content summary>`.

**How related documents feed §§ 1–5.** When you draft in step 6, map each related doc to the section(s) it most informs. The role description usually makes this obvious — but as a guide:

- **Adjacent feature plan / sibling design doc** → primarily § 3 Related features (the role often states the relationship: "ships before this", "depends on this", "shares an API contract"). May also inform § 4 if the adjacent feature touches the same part of the system.
- **Figma mockup / proposed UI / UI screenshot** → primarily § 4 Architectural design (UI shape) and § 5 Changes (UI deltas). Use them to ground the diagram and the change list in something concrete instead of inferred.
- **Infra / capacity / migration doc** → primarily § 4 (topology / data flow) and § 5 (DB / infra changes).

Don't write "from <related doc>" into the plan body — the plan reads as one coherent document, not a citation index. If a related doc reveals a constraint or risk that would normally land in § 7 Caveats, **flag it for the user in the chat reply** so it can be drafted in the follow-up turn — don't slip it into the file (§ 7 is explicitly out of scope for this skill).

## Step 5 — Scaffold the Master Plan file

The plan file is created **before** drafting, so § 4 + § 5 land in a persistent artefact from turn one. Follow the local plan conventions under `.sedea/operations/<operationsUserId>/plans/` (frontmatter contract, slug pattern with 8-char hex suffix, sidecar with `parent:`; child plans via **`new-plan`** after **delivery-phases** or **pr-breakdown**) — but use the **Master Plan template body** from the dev-process doc, not the generic Overview/Phasing stub.

### 5a — Resolve the parent

The seed prompt's `Parent:` line is the **primary** input — the user already curated the plan-tree placement, so use what they wrote. Only fall back to a picker when the line is empty or doesn't resolve.

#### Read from the seed prompt first

Parse the `Parent:` line. Accepted forms (case-insensitive on the keywords):

- **Slug** (e.g. `push_system_hardening_roadmap_c7e91a4f`) — use directly. Validate by checking that exactly one of `.sedea/operations/<operationsUserId>/plans/<slug>.plan.md` or `.sedea/operations/<operationsUserId>/plans/roadmap-topics/<slug>.plan.md` exists.
- **`@path` or absolute path to a `.plan.md`** (e.g. `@.sedea/operations/<operationsUserId>/plans/roadmap-topics/push_system_hardening_roadmap_c7e91a4f.plan.md`) — extract `<slug>` from the filename (`<slug>.plan.md` → `<slug>`). Validate the file exists.
- **`null`, `none`, or `new roadmap root`** — parent is `null`, plan goes under `.sedea/operations/<operationsUserId>/plans/roadmap-topics/`. Use this when the feature is large enough to be a roadmap topic itself.

When the slot resolves cleanly, acknowledge in one line — `Parent: <slug>` (or `Parent: null (new roadmap topic)`) — and continue to 5b. Do **not** ask the user to confirm; they already wrote it.

#### Fall back to a picker when needed

Fall back to the picker below if any of:

- The `Parent:` line is empty (the user pasted the seed prompt without filling it in).
- The `Parent:` line is missing entirely (a custom prompt that didn't include it).
- The slug or `@path` doesn't resolve to a plan file under `.sedea/operations/<operationsUserId>/plans/`.

In the unresolved case, say so in one line — `Parent slot "<raw value>" doesn't resolve to an existing plan; falling back to picker.` — then enumerate `.sedea/operations/<operationsUserId>/plans/roadmap-topics/*.plan.md` (Glob) and ask via `AskQuestion` (single-select):

> "Where does this Master Plan belong in the plan tree?"

Options, in order:

- One option per existing roadmap topic, `id` = slug (e.g. `push_system_hardening_roadmap_c7e91a4f`), `label` = the topic's display name from frontmatter `name:`.
- **Make this a new roadmap topic root** (`id: __new_roadmap_root__`) — picks `parent: null` and writes the file under `plans/roadmap-topics/` instead of `plans/`. Use only when the feature is large enough to be a roadmap topic itself.
- **Other / I'll paste a parent** (`id: __other__`) — falls back to a free-form follow-up where the user types a slug or path.

If the PRD or the loaded architectural rules strongly imply a topic (e.g. push-related work → `push_system_hardening_roadmap`), still surface the picker but mention the implied default in the question's preface.

### 5b — Pick the slug + filename

- **Display name** for `name:` frontmatter: the PRD title (line 1 between the quotes).
- **Slug base**: lowercase the title, replace spaces with `_` (or `-` to match sibling convention in the target folder).
- **Slug suffix**: 8-char random hex (`crypto.randomBytes(4).toString('hex')` equivalent).
- **Filename**:
 - Parent is a roadmap topic → `.sedea/operations/<operationsUserId>/plans/<slug>.plan.md`.
 - Parent is `null` (new roadmap topic root) → `.sedea/operations/<operationsUserId>/plans/roadmap-topics/<slug>.plan.md`.
- **Sidecar**: `<same-dir>/<slug>.state.yaml`.

### 5c — Write the plan file (Master Plan template body)

Write `<slug>.plan.md` with the **full** Master Plan layout. Every section that hasn't been worked on yet gets the same visible placeholder — `_TBD_` — so when you (or anyone else) opens the plan, a single glance tells you which sections are still pending. Step 6 will replace the placeholders under § 1 through § 5 with real content; § 6 (`Delivery phases | PR breakdown`) and § 7 (Caveats) stay `_TBD_` until follow-up turns work them. Note that § 6's heading is the deliberate dual-title form — the actual decomposition decision (`Delivery phases` vs `PR breakdown`) is made when § 6 is drafted, not at scaffold time.

````markdown
---
name: <PRD title>
overview: <one-line overview synthesised from the PRD>
todos:
 - id: review-initial-draft
 content: Review §§ 1–5 (Background, Benefits, Related features, Architectural design, Changes) drafted from the PRD.
 status: pending
isProject: false
---

# <PRD title>

> PRD: <link or @path from the seed prompt>

## 1. Background

_TBD_

## 2. Benefits

_TBD_

## 3. Related features

_TBD_

## 4. Architectural design

_TBD_

## 5. Changes

_TBD_

## 6. Delivery phases | PR breakdown

_TBD_

## 7. Caveats (optional)

_TBD_
````

The literal `## 6. Delivery phases | PR breakdown` heading is the **deliberate, not-yet-decided** form documented in the dev-process doc's **§ 6 / § 5 contents rule**. When § 6 is drafted in a follow-up turn, the agent picks one of `Delivery phases` (the feature decomposes into phases) or `PR breakdown` (the feature is small enough to skip the phase layer) and rewrites the heading to the chosen value, dropping the other side. Until then, the dual heading communicates "decomposition pending" at a glance.

Use uniform italic **`_TBD_`** for every pending section (scannable in Plan Board and GitHub; grep with `rg '^_TBD_$'`). Rationale and template rules: **`.sedea/centers/research-and-development/docs/development-process.md`** § *Master Plan template*.

Frontmatter rules carry over from the new-plan contract:

- Do **not** put `parent:` in frontmatter. Parent lives in the sidecar.
- Seed `todos:` with the one honest first todo shown above (so the Plan Board renders the plan as `not_started` until the user marks it in-progress).
- `isProject: false` unless the user says otherwise.
- Do not invent a `status:` field.
- **Quote YAML scalar values that would otherwise mis-parse** — most commonly **`name:`** when the PRD title contains `: ` (colon + space). Follow the local `new-plan` skill's YAML-scalar rules for the full trigger list. PRD titles routinely use the form `Subject: clarifier`, which the YAML parser reads as a nested mapping unless the value is wrapped in **double quotes**, and that silently breaks the Plan Board tree label (snake-cased slug fallback) and todo rendering. When in doubt, quote.

Write `<slug>.state.yaml` alongside:

```yaml
# Sidecar for Plan Board (runtime). Plan: <slug>.plan.md
parent: <resolved-parent-slug-or-null>
worktrees: []
prs: []
```

Both files must be written in the same skill turn so the Plan Board picks the plan up cleanly on first scan.

After writing, link the plan file with an absolute path so the user can click through:

> Plan file: [.sedea/operations/<operationsUserId>/plans/<slug>.plan.md](file:///Users/<you>/<workspace>/.sedea/operations/<operationsUserId>/plans/<slug>.plan.md)

## Step 6 — Draft sections 1 through 5 into the plan file

Following the **Master Plan template** in the dev-process doc (loaded in step 2), populate the `_TBD_` placeholders under § 1 through § 5 of the plan file scaffolded in step 5. Use `StrReplace` per section — never rewrite the whole file.

The placeholder `_TBD_` appears seven times in the fresh scaffold (one per section), so each `StrReplace` call's `old_string` must include the section header above it as disambiguating context. Concretely, for § 4 the call looks like:

```
old_string:
## 4. Architectural design

_TBD_

new_string:
## 4. Architectural design

<your Mermaid diagram(s) here>
```

Repeat the analogous shape for §§ 1, 2, 3, 5. Leave the `_TBD_` placeholders under § 6 and § 7 untouched — they mark the two sections that still need work in follow-up turns.

### § 1 Background

One paragraph, **1–2 sentences**, framed from the **hosting repo** perspective (not implementation). What is the feature, in plain language? Who is it for? What problem does it solve? Pull this directly from the PRD's overview / goals — paraphrase, don't quote at length. Implementation framing belongs in § 4 / § 5, not here.

### § 2 Benefits

Short bullet list answering only *why* — benefits to merchants, benefits to their customers, system improvements that reduce cost or operational effort, user-experience wins. Follow the short-bullet rule from the dev-process doc's bullet-style convention: **2–3 words per bullet, never more than 5**. A long list of short bullets beats a short list of long sentences.

Source material: the PRD's "goals" / "value" / "why now" sections, plus any merchant pain points the PRD calls out. If the PRD is light on benefits, infer them from the problem statement — but flag inferred bullets with `(inferred)` so the user catches anything you over-extrapolated.

### § 3 Related features

Short bullet list — one bullet per related feature, in the form `<feature> — <relationship>: <implication>`. **Ordering / concurrency** — **precedes**, **follows**, **runs concurrently with**, or **depends on**; say what must align in delivery (e.g. "ship migration first", "share API contract", "stagger rollout"). **Scope** — **narrows scope**, **widens scope**, or **shifts scope**; say *how* in a few words (e.g. "their work drops our login UI", "their API adds fields we must persist", "auth moves to their slice, we stop owning tokens"). A bullet may name both when a related feature reschedules and rescopes work.

Sources for identifying related features, in priority order:

1. **User-supplied related documents from step 4b that describe a feature** (highest signal — the user already curated relevance and stated the role). The role description is your starting point; map it to one of the four relationship verbs above.
2. The PRD itself — often names dependencies / sequels / parallel efforts in passing.
3. *Fallback only when 1 and 2 are empty:* roadmap topics enumerated in step 5a. Read each topic's frontmatter `name:` and skim its `## Overview` for overlap. Don't auto-flag every topic that mentions a shared concept; only flag genuine sync needs.
4. *Fallback only when 1, 2, and 3 are empty:* architectural rules loaded in step 3 — they sometimes flag domain concepts that hint at adjacent features.

If you can't identify any related features from this context, write the single bullet `_None identified from current context — confirm in review._` instead of inventing relationships. Empty here is **fine**; many features stand alone.

### § 4 Architectural design

One or more diagrams showing what the implementation will look like. Pick the diagram type(s) that best fit the feature, from the menu in the dev-process doc:

- Component / architecture chart — service topology, module boundaries, dependency direction.
- Flow chart — control flow or data flow through new logic.
- Sequence diagram — interactions between services, processes, or actors over time.
- State diagram — lifecycle / state-machine changes.
- ER / schema diagram — data model or database changes.

Use **Mermaid** (in fenced ```mermaid blocks) so the diagrams render in Cursor and on the Plan Board. Include only what is necessary to understand the *shape*; don't draft pseudocode here. If multiple diagrams are needed, label each one.

### § 5 Changes

Short bullet list of what changes, how, and where, scoped at the feature level. Same short-bullet rule as § 2: **2–3 words per bullet, never more than 5**.

Group bullets by area of the codebase if it helps scannability (e.g. **DB:**, **API:**, **Worker:**, **UI:**) — but keep each bullet terse.

**Immediately after** the last change bullet (still inside `## 5. Changes`), append **`### Decomposition assessment`** — mandatory in the same turn as the rest of § 5. Use the same bullet dimensions as **`phase-planner`** (`.sedea/centers/research-and-development/missions/plan-and-deliver/skills/phase-planner/SKILL.md`) § *4g — `### Decomposition assessment`*: **Kinds of change (count)**, **PR count band** (`single` | `few (2–5)` | `many (6+)`), **Sequencing / coupling**, **Routing recommendation** (`Delivery phases` | `PR breakdown` multi-PR | `PR breakdown` single-PR) with a short **why**, **Confidence** (`high` | `med` | `low`). Ground this in §§ 4–5 and the PRD. The assessment is evidence for the §6 **AskQuestion** route (inline **`delivery-phases`** / **`pr-breakdown`**); it does **not** replace §6 drafting by those skills.

The `StrReplace` for § 5 must replace from `## 5. Changes` through its `_TBD_` placeholder and include both the change bullets **and** the `### Decomposition assessment` subsection in `new_string`. Do **not** write `### Complexity score` in that same replace — Step 6c appends it after the decomposition assessment is final (it needs the finished §4 and §5 text to fill the table).

### Step 6c — Plan-scope complexity score (mandatory)

After §§ 1–5 are fully drafted in the file (including `### Decomposition assessment`), compute **three integers** from the **as-written** `## 4. Architectural design` and `## 5. Changes` bodies, take the **largest** as the **overall score**, assign a **band**, and write the subsection below. This is a **scoping signal** for whether one Master Plan is trying to carry too much design surface before § 6 — not a substitute for `### Decomposition assessment`.

#### Count 1 — Flowchart boxes (§4)

In every Mermaid **`flowchart`** / **`graph`** block under §4, count each **labeled node** that names a real part of the system (service, app, worker, datastore, queue, bus, external system, UI shell — count each distinct name **once** even if it appears twice).

- If §4 has **no** `flowchart` / `graph` but **does** have a **`sequenceDiagram`**, use the number of **`participant`** / **`actor`** lines for this count instead (one per lifeline).
- If §4 has **neither**, use **0**.

#### Count 2 — Sequence arrows (§4)

In every **`sequenceDiagram`** under §4, count **message lines** — lines where one actor signals another (`->>`, `-->>`, `->`, `-->`, `-x`, `--x`, `-)`, etc.). Each such line is one count; a return on its own line counts separately. If there is **no** sequence diagram in §4, use **0**.

#### Count 3 — Change bullets (§5)

Count Markdown lines that start with `- ` **strictly between** the `## 5. Changes` heading and the `### Decomposition assessment` heading. Each top-level `-` bullet is one count (including bullets under **DB:** / **UI:** style subheads). Do **not** count bullets inside `### Decomposition assessment` or any later subsection under `## 5. Changes`.

#### Overall score and band

- **Overall score** = **max(count 1, count 2, count 3)** — one integer for the whole plan.
- **Band:** **low** if overall score ≤ 10; **medium** if 11–20; **high** if > 20.

#### Persist + echo

1. **StrReplace** — Append immediately **after** the full `### Decomposition assessment` block (still under `## 5. Changes`) a subsection that **matches this shape exactly** (replace angle-bracket placeholders with your computed numbers):

```markdown
### Complexity score (plan-scope signal)

- **Band:** <low | medium | high>
- **Overall score:** <n> — largest of the three counts in the table (plan-scope signal from §4–§5 only).

| What we counted | Value |
| --- | ---: |
| **Flowchart boxes** in §4 | <n> |
| **Sequence arrows** in §4 | <n> |
| **Change bullets** in §5 | <n> |
```

Use **exactly these three row labels** and **these two column headers**. Put **only integers** in the Value column.

2. **Chat (required)** — Before Step 7 **AskQuestion**, state **band**, **overall score**, and the **three table values** (same numbers as in the file) so the user can audit the math.

#### High-complexity gate (overall score > 20)

When the band is **high**:

1. **Do not** offer **§ 6 decomposition** (inline **`delivery-phases`** / **`pr-breakdown`**) in **AskQuestion** until the **overall score** is **≤ 20** — routing on this file as-is risks an oversized § 6.
2. **Do** tell the user explicitly to **pause decomposition** until scope is narrower (revise §§ 4–5, or split the feature).
3. **Split guidance (required)** — Propose **2–4** concrete slices framed as **user journeys / outcomes** for merchants or their customers (e.g. *"Merchants can configure campaign guardrails before launch"*, *"Shoppers see compliant previews in the app"*). Each slice should be shippable as a **separate planning conversation** (its own Master Plan under the same roadmap topic, or a future **Delivery phases** item that is outcome-titled). **Avoid** recommending splits that are only **topology** ("frontend vs backend", "this API vs that API", "repo A vs repo B") unless you **pair** each slice with **who gains what** so the human can still reason in hosting repo terms.
4. Offer structured choice via **AskQuestion**, **`MC_PHASED_RESPONSE_V1`** (per **`.sedea/centers/sedea/rules/2_ask-question-instructions.mdc`**) for **revise §4**, **revise §5**, optional **draft Caveats**, or **commit plans** — MUST use one message (AskQuestion or phased) with journey-split recap + modal when possible.

When band is **low** or **medium**, proceed to **Step 7**; the status line in Step 7a must mention complexity (e.g. *"Complexity: medium (overall score = 12) — §6 decomposition available in next AskQuestion."*).

### Echo to chat

After writing §§ 1–5 **and** `### Complexity score` into the plan file, **echo all five sections in the chat reply** — including **`### Decomposition assessment`** and **`### Complexity score`** under `## 5. Changes` — so the user can review without opening the file. The plan file is the source of truth; the chat copy is a review surface. Use the same section headers (`## 1. Background`, etc.) so the chat output aligns line-for-line with the file. **Also** echo the **band** and **three table values** above or below the echoed sections (see Step 6c **Chat (required)**).

### What NOT to draft

Do **not** draft section 6 (`Delivery phases | PR breakdown`) or section 7 (Caveats). Those are follow-up turns. Specifically:

- **§ 6 Delivery phases | PR breakdown** is owned by **`delivery-phases`** and **`pr-breakdown`** (modes #2 and #3), invoked **inline on this lane** after the user picks **Route §6 decomposition** (Step 7c–7d). Either skill drafts the dual-title list; child stubs use **`new-plan`** (indexed spawn via **AskQuestion** on list index **N**, per **30_planning-target-resolution**). Do **not** draft §6 inline in **`planner`** prose alone.
- **§ 7 Caveats** often only emerges once § 6 reveals concrete constraints. Drafting it from the PRD alone risks listing PRD-level worries that aren't real planning caveats.

## Step 7 — Next moves (AskQuestion + inline decomposition)

§§ 1–5 are drafted (including **`### Complexity score`**); §6 and §7 stay `_TBD_` until the user chooses next moves. Collect each next-move pick per **`.sedea/centers/research-and-development/rules/30_planning-target-resolution.mdc`** § *Sedea input channel* and **`../README.md`** § *Recap, structured choice, act* — **preferred:** recap + **AskQuestion** / **`MC_PHASED_RESPONSE_V1`** in one message; **legacy split:** recap (§7a), then structured choice (§7b). Execute **one** chosen action per turn.

§6 decomposition runs **`delivery-phases`** or **`pr-breakdown`** **inline on this lane** (no child lane for those skills). §7 **Caveats** is drafted **inline** in this skill when the user selects that option.

**Continuation ownership.** When this skill runs as a spawned **Master Plan agent** under **`plan and deliver`**, this lane owns post–Master Plan continuation and downstream spawning **except phase-scoped delivery** — once inline **`new-plan`** opens a **`phase-planner`** child lane, that child owns the phase subtree until **`phaseShipComplete`** or explicit defer/abandon; this lane **acknowledges only** (Step **7b** *Phase-planner child active*). The **Squad Leader** only acknowledges status and maintains the closure ledger — no duplicate route **AskQuestion** on the leader lane. Include `continuationOwner: "master-plan-agent"` and `continuationStatus: "active"` in the terminal result while follow-up remains on this lane.

### Step 7a — Recap after initial draft

After **Echo to chat** (§§1–5 + complexity table), end with **one short status line only** (plan path, band, overall score). **Do not** embed the next-move menu in prose blockquotes.

When using the **legacy split** (see **`../README.md`** § *Recap, structured choice, act*), do **not** invoke **AskQuestion** in the same message as the full section echo. **Required:** combine recap + next-move modal in one message via **AskQuestion tool** or **`MC_PHASED_RESPONSE_V1`** (`display.markdown` for status; `askQuestion` for options). On the **initial §§1–5 draft turn**, include **`MC_PHASED_RESPONSE_V1`** in the **same** message as **`AGENT_RESULT_RESPONSE_V1`** — phased **line 1**, terminal **last line** (rule **2** § *Same message as spawn terminal*).

### Step 7b — Structured choice: primary next moves

Invoke **AskQuestion**, **`MC_PHASED_RESPONSE_V1`**. On the legacy split, run structured choice in a **separate** assistant message after step **7a** recap. Build options from plan state and Step 6c band.

**Phase-planner child active (binding):** When **`activeLanes`** (from inline **`delivery-phases`** / **`new-plan`** merge or bubbled **`AGENT_RESULT_RESPONSE_V1`**) includes **`continuationOwner: "phase-planner-agent"`** with **`continuationStatus: "active"`** for a **`Delivery phases`** row, **do not** offer **`route-6`**, **`expand-eligible-pr`**, **`expand-next-phase`**, or other phase-scoped decomposition options for that row on this **Master Plan** lane. Acknowledge in one line (phase slug, child lane id when known) and tell the developer to continue on the **phase-planner** child lane. Re-offer Step **7b** master-plan options only after **`phaseShipComplete`** for that phase or explicit defer/abandon — see **`phase-planner`** § *Phase delivery ownership*.

**Inline `pr-plan` handoff pending (binding):** When **`spawnedPlans`** includes a PR plan whose inline merge reports **`implementationHandoffStatus`** in **`not-offered`**, **`offered`**, or **`spawned-coding-session`** (and no terminal **`coding-session`** yet), **omit** **`route-6`**, **`draft-7`**, and other master-plan options until §5c resolves or the **`coding-session`** child completes. Offer **`pr-plan`** §5c options (or continue waiting on an open **`coding-session`** child) on **this lane** — see Step **7c** *Pending inline `pr-plan` handoff*.

**When complexity is low or medium (C ≤ 20)** — include at minimum:

| Option id (example) | Label (brief) | Action |
|---------------------|---------------|--------|
| `route-6` | Route §6 — Delivery phases or PR breakdown | Step 7d → route **AskQuestion** → inline skill |
| `draft-7` | Draft §7 Caveats | Inline §7 only |
| `revise` | Revise a drafted section (§1–§5 or §7) | Step 7e |
| `commit-plans` | Commit plans (say *commit* in chat) | Remind sedea **6_git-commit-push-gate**; do not run git unless same message asks |
| `more` | More details for option _ | Elaborate, then re-ask |

**When complexity is high (C > 20)** — **omit** `route-6` until score ≤ 20. **Do not** add `route-6` because the user says *decompose anyway* unless they pick an explicit **accept decomposition risk** option you add after the Step 6c journey-split guidance (recap-only or in `display.markdown` when using phased). Even then, prefer **`revise`** / journey splits until score ≤ 20. The **Squad Leader** must **never** run **`delivery-phases`** or **`pr-breakdown`** — only this **planner** lane runs them inline after **`route-6`**.

Foreground **revise §4**, **revise §5**, optional **draft-7**, **commit-plans**, **more**. Include journey-split bullets from Step 6c in recap prose or **`display.markdown`** — not as a prose choice menu; options live in the modal.

Always include **More details for option _** per conduct.

**When inline decomposition reports unlocked indices** (from **`expandEligibleIndices`** on **`pr-breakdown`** or **`expandNextEligibleIndex`** on **`delivery-phases`** after spawn-chain **`prShipComplete`** / **`phaseShipComplete`**):

| Option id (example) | Label (brief) | Action |
|---------------------|---------------|--------|
| `expand-eligible-pr` | Expand eligible PR row(s) | Re-invoke inline **`pr-breakdown`** structured choice act **`expand-eligible`** or run eligible **`new-plan`** indices directly when list already approved |
| `expand-next-phase` | Expand next eligible phase | Re-invoke inline **`delivery-phases`** act **`expand-next-eligible`** for **`expandNextEligibleIndex`** |

Include these options **only** when the ledger shows non-empty eligible indices; omit when prior stage ship is still incomplete.

**When decomposition is ship-complete** (no **`expandEligibleIndices`**, no **`expandNextEligibleIndex`**, and every decomposition / ledger row is **`ship-complete`**, **`closed`**, **`deferred`**, or **`abandoned`**):

| Option id (example) | Label (brief) | When |
|---------------------|---------------|------|
| `draft-7` | Draft §7 Caveats | §7 is still **`_TBD_`** or empty |
| `approve-caveats` | Approve §7 Caveats | §7 drafted; **`caveatsApprovalStatus: pending`** |
| `revise-caveats` | Revise §7 Caveats | §7 drafted; developer wants edits before approve |
| `skip-caveats` | Skip §7 Caveats | §7 still **`_TBD_`** or pending — explicit defer |

Do **not** omit **`draft-7`** when all phases are shipped but §7 was never drafted. Do **not** set **`continuationStatus: terminal`** or empty **`remainingTasks`** until **`caveatsApprovalStatus`** is **`approved`** or **`skipped`** via explicit structured choice (see **Draft §7 Caveats** below).

**Stop** after emitting AskQuestion — do not execute the chosen action in the same turn.

### Step 7c — One choice per turn

Execute **only** what the user selected in **AskQuestion** (or the matching **`option`** from). Multi-step work requires explicit multi-action approval in one user message.

#### Route §6 decomposition (`route-6`)

1. **Structured choice** — **AskQuestion**, **`MC_PHASED_RESPONSE_V1`**: **Delivery phases** vs **PR breakdown** (align with **`### Decomposition assessment`** when possible). Prefer one message; split only when a long draft was sent in the prior message.
2. Load and follow the chosen skill **inline** on this lane (see **Inline handoff** above):
 - `.sedea/centers/research-and-development/missions/plan-and-deliver/skills/delivery-phases/SKILL.md` — `routeLock: "delivery-phases"`
 - `.sedea/centers/research-and-development/missions/plan-and-deliver/skills/pr-breakdown/SKILL.md` — `routeLock: "pr-breakdown"`
3. Pass inline context: `targetPlanPath`, `targetPlanSlug`, `parentAgentRole: "master-plan-agent"`, `ledgerParent: <masterPlanSlug>`, `complexityBand`, `complexityScore`, `decompositionAssessment`, `routeLock`.
4. When the inline skill returns **`## Completion (inline)`** fields, merge `activeLanes`, `openLedgerEntries`, `spawnedPlans`, `remainingTasks`, **`expandEligibleIndices`**, and **`expandNextEligibleIndex`** into this skill’s ledger. Append each new child **`planPath`** / **`planSlug`** from inline **`new-plan`** (including inline **`pr-plan`**) into **`outputs.spawnedPlans`** on the next **`AGENT_RESULT_RESPONSE_V1`** re-emit so Mission Control lane documents list PR plans — not only **`masterPlanPath`**. If the inline skill opened **`phase-planner`** child lanes or **`coding-session`** from inline **`pr-plan`**, wait on this lane for their **`AGENT_RESULT_RESPONSE_V1`** deliveries per that skill’s aggregation step, then continue **`planner`** Step **7b** — **do not** emit child lanes for **`delivery-phases`**, **`pr-breakdown`**, or **`new-plan`**.

**Pending inline `pr-plan` handoff (binding):** When inline **`pr-breakdown`** / **`new-plan`** merged fields show a fresh PR plan with **`implementationHandoffStatus: not-offered`** or **`offered`** (§5c open, **`coding-session`** not yet spawned), **do not** offer Step **7b** **`route-6`** / master-plan menus on this turn. **Re-enter** inline **`pr-plan`** §5c–§5e on **this Master Plan lane** (same **`targetPlanPath`**) until the developer picks **Start coding session**, **`defer`**, or a **`coding-session`** child terminal arrives. **PRD source is irrelevant** — Squad Leader §2 **existing PRD** (no session **`ad-hoc-prd`**) uses the same handoff as §3 ad-hoc → **`planner`**; only **`pr-plan`** §5c–§5d opens **`coding-session`**.

**Spawn-chain ship notifications:** When Mission Control delivers **`agent-result-response delivered`** with **`outputs.prShipComplete`** or **`outputs.phaseShipComplete`** (bubbled from **`coding-session`** → **`pr-plan`** / **`new-plan`** → **`pr-breakdown`** / **`phase-planner`** → **`delivery-phases`**), merge into the ledger per **`../README.md`** § *Upstream ship-complete notification*, **re-emit updated** **`AGENT_RESULT_RESPONSE_V1`** (same **`correlationId`**) when this lane is standalone spawned, then return to Step **7b** with expand options when indices unlock.

Do **not** draft §6 in **`planner`** prose without running the inline skill.

#### Draft §7 Caveats (`draft-7`)

Draft **`## 7. Caveats (optional)`** inline from PRD + §§1–5 (+ §6 when already drafted). **§7 requires an explicit developer approval gate** before this lane may report **`continuationStatus: terminal`** or imply planning complete to the Squad Leader.

##### Act after `draft-7` select (turn 1 — write only)

1. **`StrReplace`** the §7 **`_TBD_`** (or empty body) under **`## 7. Caveats (optional)`** with caveats grounded in PRD + §§1–6 (constraints from decomposition or ship — not generic PRD worries alone).
2. Echo the full **`## 7. Caveats`** block in chat for review.
3. Set working ledger **`caveatsApprovalStatus: pending`**.
4. **Stop without** emitting **`AGENT_RESULT_RESPONSE_V1`**. Approval **AskQuestion** is the **next** turn — not combined with a terminal line in the same message.

##### §7 approval gate (turn 2 — structured choice)

On the **next** assistant turn after §7 was written, use **AskQuestion**, **`MC_PHASED_RESPONSE_V1`** per **`.sedea/centers/sedea/rules/2_ask-question-instructions.mdc`**:

| Option id (example) | Label (brief) | Action |
|---------------------|---------------|--------|
| `approve-caveats` | Approve §7 Caveats | **`caveatsApprovalStatus: approved`** → evaluate terminal eligibility |
| `revise-caveats` | Revise §7 Caveats | Step **7e** on §7; keep **`pending`** until re-approved |
| `skip-caveats` | Skip §7 Caveats | **`caveatsApprovalStatus: skipped`** → evaluate terminal eligibility |
| `more-details` | More details for option _ | Elaborate; re-ask |

**Forbidden on the planner lane (binding):**

- **Same turn:** §7 approval modal **and** **`AGENT_RESULT_RESPONSE_V1`** with **`continuationStatus: terminal`**.
- **Same turn:** §7 approval modal **and** **`MC_DISPATCH_RESOLVED_V1`** — only the **Squad Leader** closes the dispatch.
- **`continuationStatus: terminal`** while **`caveatsApprovalStatus: pending`**.
- **`remainingTasks: []`** while **`caveatsApprovalStatus: pending`**.

After **`approve-caveats`** or **`skip-caveats`**, emit **`AGENT_RESULT_RESPONSE_V1`** on a **separate turn** from the approval modal (or on the turn **after** the user selects in the modal — never terminal in the same message as the approve modal). Then Step **7b** unless terminal eligibility applies.

##### Terminal eligibility (after §7 gate)

Set **`continuationStatus: terminal`** and empty **`remainingTasks`** **only when all** apply:

1. **`caveatsApprovalStatus`** is **`approved`** or **`skipped`** (explicit structured choice), **or** §7 was approved on a prior turn.
2. No **`expandEligibleIndices`** / **`expandNextEligibleIndex`**; no **`open`** / **`blocked`** ledger rows needing planner action.
3. No other pending Step **7b** choice.

When (2) holds but §7 is still **`_TBD_`**, keep **`continuationStatus: active`**, offer **`draft-7`**, list **`Draft §7 Caveats`** in **`remainingTasks`**. When §7 is drafted but **`pending`**, keep **`active`**, list **`Approve §7 Caveats`** in **`remainingTasks`**, offer **`approve-caveats`** / **`revise-caveats`** / **`skip-caveats`** — **not** terminal status.

#### Revise section (`revise`) — Step 7e

1. **AskQuestion:** which section — **§1 Background** … **§5 Changes** or **§7 Caveats** (not §6; owned by decomposition agents).
2. Collect feedback via **prompt** / **More details for option _** if needed.
3. Apply edit to **that section only**; re-run Step 6c after §4 or §5 edits.
4. Flag sibling issues; do not fix silently.

#### Commit plans (`commit-plans`)

State that the user must include *commit* (and *push* if needed) in the **same** message per **`.sedea/centers/sedea/rules/6_git-commit-push-gate.mdc`**. Do not commit from this skill unless asked in that message.

### Observations (numbered flags)

When you notice gaps while working, list **numbered observations** in recap prose (Flag 1, Flag 2, …). Then **AskQuestion** / **`MC_PHASED_RESPONSE_V1`** per flag or batch: **Apply fix**, **Skip**, **More details for option _** — prefer recap + modal in one message.

After handling flags, return to **Step 7b**.

### Follow-up turns

After each completed action, re-read the plan file and run **Step 7b** again with updated options. Decomposition remains available via `route-6` when band allows. Child list index **N** for **`new-plan`** is chosen via **AskQuestion** or snapshot per **30_planning-target-resolution**.

## Scope guard

This skill writes the Master Plan file (`<slug>.plan.md` + `<slug>.state.yaml`) and populates §§ 1 through 5 in the initial turn (**§ 5 includes `### Decomposition assessment` and `### Complexity score (plan-scope signal)`**), computes the **plan-scope complexity table** per Step 6c, and when the **overall score** is **> 20** recommends user-journey splits before offering §6 decomposition in **AskQuestion**. It drafts §7 when the user selects that option, and runs **delivery-phases** or **pr-breakdown** **inline** when the user selects route §6. It does **not**:

- Create worktrees or start implementation.
- Modify code or content in the selected repos. Step 3b is the only repo touch this skill makes — it runs `git status --porcelain`, `git checkout <default-branch>`, and `git pull --ff-only` to sync each selected hosting repo to its default branch before loading architectural rules. It refuses to run on a dirty tree or a linked worktree, never stashes / commits / discards, and never falls back to a non-fast-forward pull.
- Run commit / push flow on the plans repo unless the user explicitly asks in the same message (Step 7c **commit-plans** option).
- Draft section 6 (`Delivery phases | PR breakdown`) in **`planner`** prose alone — that section is owned by inline **`delivery-phases`** / **`pr-breakdown`**.
- Spawn **`delivery-phases`**, **`pr-breakdown`**, or **`new-plan`** child lanes — those skills run inline on this lane; they may still spawn **`phase-planner`** or **`coding-session`** per their contracts.

## Completion (spawned)

End every spawned run (initial draft and each follow-up turn that finishes skill scope) with exactly one terminal line:

Required `outputs` fields (populate the JSON `outputs` object on the terminal line):

### Host protocol line (required)

Emit **exactly one** line on its own: `AGENT_RESULT_RESPONSE_V1` immediately followed by a single JSON object on the **same** line. Required keys: `version` (1), `correlationId` (from the spawn request), `status`, `summary`, `outputs`, `errors` (use `[]` when none). The emitted line must be **valid JSON** (no `{...}` placeholders in the actual output). Re-emit an **updated** line after user-requested follow-up on this lane (same `correlationId`). See **`.sedea/centers/sedea/skills/README.md`** § *Spawned terminal line*.

Required `outputs` fields:

- `outputs.masterPlanPath`
- `outputs.masterPlanSlug`
- `outputs.complexityBand`
- `outputs.complexityScore`
- `outputs.continuationOwner` — `master-plan-agent` while this lane owns follow-up (Step 7)
- `outputs.continuationStatus` — `active` while follow-up choices remain; `terminal` only when **§7 approval gate** is satisfied (see **Draft §7 Caveats** *Terminal eligibility*) and no other pending tasks
- `outputs.caveatsApprovalStatus` — `pending` | `approved` | `revised` | `skipped` | omitted when §7 untouched; **`pending`** blocks **`continuationStatus: terminal`**
- `outputs.activeLanes` — downstream lane records (`correlationId`, skill, target path, status)
- `outputs.openLedgerEntries` — phase/PR plan or lane entries the **Squad Leader** tracks (§7)
- `outputs.spawnedPlans` — **required whenever** inline decomposition or **`new-plan`** / inline **`pr-plan`** created or populated child `.plan.md` files on this lane. Array of `{ "planPath": "<absolute path>", "planSlug": "<slug>" }` (string paths also allowed). Include **every** accumulated child (phase plans, PR plans) on **each** `AGENT_RESULT_RESPONSE_V1` re-emit — Mission Control lane documents ingest `spawnedPlans` from terminal `outputs` (not only `masterPlanPath`).
- `outputs.remainingTasks` — pending user or agent actions; empty only when `continuationStatus` is `terminal`
- `outputs.expandEligibleIndices`, `outputs.expandNextEligibleIndex` — echo from inline decomposition after spawn-chain ship-complete merges
- `outputs.prShipComplete`, `outputs.phaseShipComplete` — when this lane merged bubbled ship terminals from nested **`coding-session`** / **`phase-planner`** chains

Stop after the terminal line. Do not emit another `AGENT_RUN_REQUEST_V1` for **`delivery-phases`**, **`pr-breakdown`**, or **`new-plan`** or run the next protocol step in the same turn (see **`../README.md`** § *Terminal stop (normative)*). While `continuationStatus` is `active`, the **Squad Leader** acknowledges only (**`.sedea/centers/research-and-development/missions/plan-and-deliver/plan.mdc`** §6); this lane owns **AskQuestion** + inline decomposition (Step 7) on follow-up user messages. On turns that emit **`AGENT_RESULT_RESPONSE_V1`**, also emit **`MC_PHASED_RESPONSE_V1`** in the **same** message (phased line 1, terminal last line) per rule **2** § *Same message as spawn terminal* — Step **7b** options may be in that phased block on the initial draft turn.

**§7 / terminal coupling:** Never emit **`continuationStatus: terminal`** in the same turn as a §7 approval **AskQuestion**. When §7 was just populated and **`caveatsApprovalStatus`** is **`pending`**, the next user-visible turn must be approval structured choice only — terminal **`AGENT_RESULT_RESPONSE_V1`** comes **after** the developer approves or skips §7.

## Completion (inline)

Report the fields below in prose to the invoker on the **same lane**. Do **not** emit `AGENT_RUN_REQUEST_V1`, `AGENT_RESULT_RESPONSE_V1`, or `MC_DISPATCH_RESOLVED_V1`. Do **not** add a **Host protocol line** under this section (see **`.sedea/centers/sedea/rules/4_mission.mdc`** § *Inline completion* and **`.sedea/centers/sedea/skills/README.md`** § *Completion (inline)*).

**plan and deliver** runs this skill **spawned only** (Squad Leader §5). If another invoker runs inline, use the same `outputs` semantics as **`## Completion (spawned)`** in prose only.
