---
name: master-plan
description: >-
  Take a PRD and scaffold a Master Plan file under `.sedea/operations/<user-uuid>/plans/`,
  pre-populated with sections 1 through 5 (Background, Benefits, Related
  features, Architectural design, Changes — including `### Decomposition
  assessment` and `### Complexity score (plan-scope signal)` under § 5) per
  Sedea's New Feature Development Process Master Plan template. Computes a
  complexity score from §4–§5; when **high**, stops and recommends user-journey
  splits before `delivery-phases`/`pr-breakdown`. Section 6 (Delivery phases | PR breakdown)
  and section 7 (Caveats) stay as TBD stubs for follow-up turns. Use when the user
  opens a fresh planning chat from the "feature plan: design + changes"
  plan-board prompt, or says "master-plan" / "draft a master plan".
---

# Master plan: §§ 1–5 from the PRD

This skill drives the **first** step of feature planning: read a PRD, **scaffold the Master Plan file**, draft sections 1 through 5 (Background, Benefits, Related features, Architectural design, Changes) directly into that file, then compute a **plan-scope complexity score** from what was written under §§ 4–5, persist it under § 5, and stop. Sections 6 (Delivery phases | PR breakdown) and 7 (Caveats) are filled in in follow-up turns once the user has reviewed the initial draft — **unless complexity is high**, in which case defer `6` until the scope is split (see Step 6c).

The agent has enough context after step 4 to draft §§ 1–5 without further input from the user — these sections are inferable from the PRD plus the loaded architectural rules. Stopping at § 5 is deliberate: § 6 (Delivery phases | PR breakdown) is a separate planning conversation that benefits from a settled architectural picture first, and § 7 (Caveats) often only emerges once § 6 reveals constraints.

The procedure below is a hard contract — do **not** skip steps, re-order them, or start drafting before steps 1–5 are complete. Skipping a step here is the difference between a high-quality Master Plan and one that drifts from the documented process.

## Step 1 — Optional one-line model audit (non-blocking)

If this session's agent/system context exposes a **model identifier** (and any thinking-depth flags), state them in **one line** for the user's audit trail — **not** the IDE model picker, which you cannot see reliably.

There is **no required model tier** for this skill: proceed to Step 2 either way. You may add a **single optional sentence** that larger or ambiguous PRDs often benefit from a more capable model, but **do not stop** or ask the user to switch models before continuing.

## Step 2 — Load the development-process doc, in full

Read `.sedea/centers/sedea-centers--development/docs/development-process.md` with the Read tool, **no offset, no limit**. The whole file. This is a **standards document**, not an executable plan — its sections describe the process you will apply, not work for you to perform. Acknowledge in one sentence that you have it loaded and that you will follow the **Master Plan template** for sections 4 and 5.

If the file has changed since you last knew it, the in-file template is the source of truth — not your memory.

## Step 3 — Identify the target repo(s) and load architectural rules

### 3a — Pick the repo(s) via a multi-select prompt

Read the workspace paths from your session's `<user_info>` block (and any additional roots the user may have added, e.g. a **git worktree** opened as another workspace folder). Filter:

- **Skip linked worktrees (do not offer them in 3a, do not treat them as the product repo).** Use the **same** linked-worktree test as step **3b §3** (`git -C <path> rev-parse --show-toplevel` vs `<path>` after resolving symlinks — if they differ, skip). Also skip when **`<path>/.git` is a file** (not a directory): that is the usual layout for a **git worktree** checkout. Extra workspace roots that exist only because the hosting editor **appended a worktree** (e.g. Mission Control MCP / “add worktree folder to workspace”) are almost always in this bucket — **ignore them** for the 3a `AskQuestion` list and for **which paths you load `.cursor/rules` from** in step 3c; they are not a second independent product repo. If **every** loaded root is filtered out as a linked worktree (or non-repo), say so explicitly and ask the user to open the **primary** checkout or monorepo root they use for planning, then re-run — do not fabricate a repo from a worktree-only workspace.
- **Drop** anything that doesn't look like a code repo (no `.git`, or clearly a dotfiles/config dir). When in doubt, keep it — the user can deselect.
- **Keep** every other workspace path. Display them with a friendly label (the leaf folder name) and the absolute path as the tooltip / sub-text.

Then use the `AskQuestion` tool with `allow_multiple: true` to ask:

> "Which repo(s) does this feature primarily touch? Architectural rules will be loaded from each one's `.cursor/rules/`."

Each option's `id` is the absolute path; each `label` is the leaf folder name (e.g. `payments-web`, `platform-infra`).

If the PRD or the title strongly implies a single repo (e.g. it mentions "merchant dashboard" or "push worker"), still surface the multi-select — but mention the implied repo in the prompt's preface so the user can accept the default with one click. Do not auto-select on the user's behalf; multi-repo features are common enough that the agent shouldn't presume.

If only one repo remains after filtering, skip the AskQuestion and tell the user *"Only one product repo in this workspace — defaulting to <name>. Reply 'add <path>' if you want to include another."*

### 3b — Sync each selected repo to its default branch

Architectural rules are loaded from the working tree, not from a fixed git ref — drafting against a stale local checkout produces a Master Plan grounded in code that no longer matches `main`. Before loading rules, fast-forward each selected repo to its default branch.

For every repo path returned in 3a, in turn:

1. **Detect the default branch.** `git -C <repo-path> symbolic-ref refs/remotes/origin/HEAD --short` returns `origin/<branch>` (typically `origin/main`, sometimes `origin/master`). Strip the `origin/` prefix. If the symbolic-ref isn't set locally, fall back to `git -C <repo-path> remote show origin | grep "HEAD branch"`.
2. **Refuse to touch a dirty tree.** `git -C <repo-path> status --porcelain`. Any output (modified, staged, or untracked files) ⇒ **skip this repo's sync**. Say in one line: *"<repo>: working tree has uncommitted changes on `<current-branch>` — leaving as-is. Architectural rules will load from the current branch."* Continue to the next repo. **Do not** stash, commit, discard, or stage anything; the user's WIP is sacred.
3. **Skip linked worktrees.** Compare `git -C <repo-path> rev-parse --show-toplevel` (symlinks resolved) to `<repo-path>`. If they differ, the workspace path is a linked worktree, not the primary checkout — Git refuses to check out the same branch in two worktrees, so trying to switch would only produce noise. Say *"<repo>: linked worktree, can't share its branch with the primary checkout — leaving as-is."* and continue.
4. **Check out and fast-forward.** When both checks pass:

   ```bash
   git -C <repo-path> checkout <default-branch>
   git -C <repo-path> pull --ff-only origin <default-branch>
   ```

   If `--ff-only` fails (the local branch has diverged from `origin/<branch>`), say *"<repo>: local `<branch>` has diverged from `origin/<branch>` — leaving as-is for manual resolution."* and continue. Never use `--rebase`, `--no-ff`, or a plain `pull`; diverged branches are the user's call, not the agent's.

After processing every repo, surface a one-line summary before moving to 3c so the user can spot a stale checkout *before* the rules are loaded:

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

Load and follow .sedea/centers/sedea-centers--development/missions/plan-and-deliver/skills/master-plan/SKILL.md ...
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

The plan file is created **before** drafting, so § 4 + § 5 land in a persistent artefact from turn one. Follow the conventions documented in `/Users/vinko/.cursor/skills/new-plan/SKILL.md` (frontmatter contract, slug pattern with 8-char hex suffix, sidecar with `parent:`, no auto-`ccp plans`) — but use the **Master Plan template body** from the dev-process doc, not the generic Overview/Phasing stub.

### 5a — Resolve the parent

The seed prompt's `Parent:` line is the **primary** input — the user already curated the plan-tree placement, so use what they wrote. Only fall back to a picker when the line is empty or doesn't resolve.

#### Read from the seed prompt first

Parse the `Parent:` line. Accepted forms (case-insensitive on the keywords):

- **Slug** (e.g. `push_system_hardening_roadmap_c7e91a4f`) — use directly. Validate by checking that exactly one of `~/.cursor/plans/<slug>.plan.md` or `~/.cursor/plans/roadmap-topics/<slug>.plan.md` exists.
- **`@path` or absolute path to a `.plan.md`** (e.g. `@~/.cursor/plans/roadmap-topics/push_system_hardening_roadmap_c7e91a4f.plan.md`) — extract `<slug>` from the filename (`<slug>.plan.md` → `<slug>`). Validate the file exists.
- **`null`, `none`, or `new roadmap root`** — parent is `null`, plan goes under `~/.cursor/plans/roadmap-topics/`. Use this when the feature is large enough to be a roadmap topic itself.

When the slot resolves cleanly, acknowledge in one line — `Parent: <slug>` (or `Parent: null (new roadmap topic)`) — and continue to 5b. Do **not** ask the user to confirm; they already wrote it.

#### Fall back to a picker when needed

Fall back to the picker below if any of:

- The `Parent:` line is empty (the user pasted the seed prompt without filling it in).
- The `Parent:` line is missing entirely (a custom prompt that didn't include it).
- The slug or `@path` doesn't resolve to a plan file under `~/.cursor/plans/`.

In the unresolved case, say so in one line — `Parent slot "<raw value>" doesn't resolve to an existing plan; falling back to picker.` — then enumerate `~/.cursor/plans/roadmap-topics/*.plan.md` (Glob) and ask via `AskQuestion` (single-select):

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
  - Parent is a roadmap topic → `~/.cursor/plans/<slug>.plan.md`.
  - Parent is `null` (new roadmap topic root) → `~/.cursor/plans/roadmap-topics/<slug>.plan.md`.
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

Why a uniform `_TBD_`:

- **Scannability.** Italic `_TBD_` reads as a clear hole; you can flick down the file and count how many holes remain. Long stub sentences like "TBD — drafted in a follow-up turn after §§ 4 + 5 are settled" hide the same information inside paragraphs that look written.
- **Renders everywhere.** Markdown italic is visible in Cursor, on the Plan Board, on GitHub, anywhere the file gets read. HTML comments (the previous convention) only render in the source view, so § 4 and § 5 looked falsely empty before Step 6 ran.
- **Easy to grep / find.** `rg '^_TBD_$'` against the plan file lists every pending section.

Frontmatter rules carry over from the new-plan contract:

- Do **not** put `parent:` in frontmatter. Parent lives in the sidecar.
- Seed `todos:` with the one honest first todo shown above (so the Plan Board renders the plan as `not_started` until the user marks it in-progress).
- `isProject: false` unless the user says otherwise.
- Do not invent a `status:` field.
- **Quote YAML scalar values that would otherwise mis-parse** — most commonly **`name:`** when the PRD title contains `: ` (colon + space). See the bullet of the same name in [`~/.cursor/skills/new-plan/SKILL.md`](/Users/vinko/.cursor/skills/new-plan/SKILL.md) § *Write the plan template* → `<slug>.plan.md` rules for the full trigger list. PRD titles routinely use the form `Subject: clarifier`, which the YAML parser reads as a nested mapping unless the value is wrapped in **double quotes**, and that silently breaks the Plan Board tree label (snake-cased slug fallback) and todo rendering. When in doubt, quote.

Write `<slug>.state.yaml` alongside:

```yaml
# Sidecar for Plan Board (runtime). Plan: <slug>.plan.md
parent: <resolved-parent-slug-or-null>
worktrees: []
prs: []
```

Both files must be written in the same skill turn so the Plan Board picks the plan up cleanly on first scan.

After writing, link the plan file with an absolute path so the user can click through:

> Plan file: [~/.cursor/plans/<slug>.plan.md](file:///Users/<you>/.cursor/plans/<slug>.plan.md)

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

One paragraph, **1–2 sentences**, framed from the **product** perspective (not implementation). What is the feature, in plain language? Who is it for? What problem does it solve? Pull this directly from the PRD's overview / goals — paraphrase, don't quote at length. Implementation framing belongs in § 4 / § 5, not here.

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

**Immediately after** the last change bullet (still inside `## 5. Changes`), append **`### Decomposition assessment`** — mandatory in the same turn as the rest of § 5. Use the same bullet dimensions as **`phase-plan`** (`~/.cursor/skills/phase-plan/SKILL.md`) § *4g — `### Decomposition assessment`*: **Kinds of change (count)**, **PR count band** (`single` | `few (2–5)` | `many (6+)`), **Sequencing / coupling**, **Routing recommendation** (`Delivery phases` | `PR breakdown` multi-PR | `PR breakdown` single-PR) with a short **why**, **Confidence** (`high` | `med` | `low`). Ground this in §§ 4–5 and the PRD. The assessment is evidence for the **`6`** router; it does **not** replace § 6 drafting by `dp` / `pb`.

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

2. **Chat (required)** — Before the handoff menu, state **band**, **overall score**, and the **three table values** (same numbers as in the file) so the user can audit the math.

#### High-complexity gate (overall score > 20)

When the band is **high**:

1. **Do not** present the normal shortcut menu that foregrounds **`6`** for decomposition — routing to `dp` / `pb` on this file as-is risks baking an oversized feature into § 6.
2. **Do** tell the user explicitly to **pause** `6` until scope is narrower (iterate §§ 4–5 down, or split the feature).
3. **Split guidance (required)** — Propose **2–4** concrete slices framed as **user journeys / outcomes** for merchants or their customers (e.g. *"Merchants can configure campaign guardrails before launch"*, *"Shoppers see compliant previews in the app"*). Each slice should be shippable as a **separate planning conversation** (its own Master Plan under the same roadmap topic, or a future **Delivery phases** item that is outcome-titled). **Avoid** recommending splits that are only **topology** ("frontend vs backend", "this API vs that API", "repo A vs repo B") unless you **pair** each slice with **who gains what** so the human can still reason in product terms.
4. Offer **next moves**: `iterate § 4` / `iterate § 5` to shrink diagrams and bullets until the **overall score** is **≤ 20**; or narrow the PRD and re-run `master-plan`; or keep this plan as a **container** and open **new** master-plan sessions per journey with scoped PRD excerpts.

When band is **low** or **medium**, proceed to **Step 7** unchanged except the first line of the handoff block must mention complexity (e.g. *"Complexity: medium (overall score = 12) — safe to route § 6 when you are ready."*).

### Echo to chat

After writing §§ 1–5 **and** `### Complexity score` into the plan file, **echo all five sections in the chat reply** — including **`### Decomposition assessment`** and **`### Complexity score`** under `## 5. Changes` — so the user can review without opening the file. The plan file is the source of truth; the chat copy is a review surface. Use the same section headers (`## 1. Background`, etc.) so the chat output aligns line-for-line with the file. **Also** echo the **band** and **three table values** above or below the echoed sections (see Step 6c **Chat (required)**).

### What NOT to draft

Do **not** draft section 6 (`Delivery phases | PR breakdown`) or section 7 (Caveats). Those are follow-up turns. Specifically:

- **§ 6 Delivery phases | PR breakdown** is owned by the `delivery-phases` (`dp`) and `pr-breakdown` (`pb`) skills — modes #2 and #3 in the dev-process doc. The handoff menu's `6` shortcut routes there. The dual-title heading itself communicates "decomposition pending"; choosing between `Delivery phases` (decompose into phase plans) and `PR breakdown` (decompose directly into PRs) is the first move of `dp` / `pb` when they run on this plan. Either skill produces a **short numbered list** of children per the dev-process doc's **§ 6 / § 5 contents rule** — child phases for `Delivery phases`, child PRs (under the `### PR list` sub-section) for `PR breakdown`. The list index **N** is the `sp <N>` argument that spawns the corresponding standalone child plan. Drafting § 6 inline here would bake in delivery decisions before the architecture is reviewed and would duplicate `dp` / `pb`'s contract.
- **§ 7 Caveats** often only emerges once § 6 reveals concrete constraints. Drafting it from the PRD alone risks listing PRD-level worries that aren't real planning caveats.

## Step 7 — Stop and hand back with a shortcut menu

You know the state of the plan: §§ 1–5 are drafted (including **`### Complexity score`**), § 6 and § 7 still carry `_TBD_`. Surface concrete shortcut moves so the user doesn't have to remember what's pending or how to phrase the next instruction.

§ 6 is owned by `delivery-phases` / `pr-breakdown`; § 7 is drafted inline here. The handoff menu reflects that split — **`6` is a routing shortcut** (it prompts for `dp` vs `pb` and stops), **`7` is a draft shortcut** (this skill drafts § 7 in a follow-up turn).

**Branch on the Step 6c band** (read from the `### Complexity score` subsection you just wrote):

### Step 7a — When complexity is **low** or **medium** (C ≤ 20)

End your reply with exactly this block (plan path filled in; first line must echo **band** and **C**):

> Drafted §§ 1–5 (Background, Benefits, Related features, Architectural design, Changes — including **`### Decomposition assessment`** and **`### Complexity score`**) into [~/.cursor/plans/<slug>.plan.md](file:///Users/<you>/.cursor/plans/<slug>.plan.md). **Complexity: <low|medium> (overall score = <n>).** Review **`### Decomposition assessment`** before routing. What's next?
>
> - **`6`** — draft § 6 **list** by routing to **`delivery-phases`** (`dp`) for child phases, or **`pr-breakdown`** (`pb`) for PRs. **`pb`** asks **Delivery phases** vs **multi-PR PR breakdown** vs **single-PR PR breakdown** (one-item `### PR list` is valid). Reply `6` to be prompted for `dp` vs `pb`, or pick the skill explicitly. Prefer aligning with **`### Decomposition assessment`** when you pick.
> - **`7`** — draft § 7 Caveats (often more useful once § 6 is settled, but available now).
> - **`iterate § N: <feedback>`** — revise an already-drafted section (e.g. `iterate § 4: also show the Pub/Sub topic`).
> - **`ccp plans`** — commit (and push to the plans repo) when the plan reads cleanly.
> - Free-form feedback or any other instruction also works.

### Step 7b — When complexity is **high** (C > 20)

Do **not** use the Step 7a block. The user journey split bullets from Step 6c must appear **above** this block (not inside it). End with exactly:

> Drafted §§ 1–5 into [~/.cursor/plans/<slug>.plan.md](file:///Users/<you>/.cursor/plans/<slug>.plan.md). **Complexity: high (overall score = <n>)** — **hold `6`** until the plan scope is smaller (target overall score ≤ 20) or you adopt a **split** (see journey bullets above).
>
> - **`iterate § 4` / `iterate § 5`** — shrink diagrams and change bullets until the **overall score** is no longer **high**; then re-run Step 6c in the next turn and **StrReplace** the whole `### Complexity score` subsection.
> - **`7`** — still available if caveats help you decide how to split (optional).
> - **`ccp plans`** — commit the diagnostic draft to the plans repo if you want it saved before splitting.
> - Free-form feedback or any other instruction also works.
>
> **Do not reply `6` for `dp`/`pb` on this plan until complexity is no longer high** — unless you explicitly accept the risk of an oversized § 6; if the user insists, flag it and route once.

Stop. Do not act on these shortcuts in this turn — wait for the user's reply. Do not run `ccp plans`.

### One shortcut, one action — and surface everything you notice

Planning sessions are the most important part of the work. If the plan is right, the implementation falls into place; if the plan is wrong, no amount of coding fixes it. That makes the discipline below non-negotiable in two equal-weight directions:

1. **Only act on what was asked.** No silent extras.
2. **Surface every observation, however small.** No silent omissions.

Agents have a strong bias toward doing more than was asked — "while I'm in the file I might as well…" — and a complementary bias toward staying quiet about side observations to avoid sounding noisy. **Both are wrong here.**

#### Don't act silently

When the user replies with `6`, prompt for `dp` vs `pb` and stop — do **not** draft § 6 inline, and do **not** load `delivery-phases` or `pr-breakdown` from inside this skill in the same turn. When the user replies with `7`, draft only § 7 and stop. The following are all forbidden as **silent actions** — but if you notice any of them, surface as a flag (see below):

- Drafting § 6 inline rather than routing to `dp` / `pb` (the routing is the contract — § 6 is owned by `delivery-phases` and `pr-breakdown`, not this skill).
- Drafting § 7 too because "they're related" or "it'll save a turn".
- Polishing § 4's diagram because you noticed a small issue while re-reading the file.
- Running `ccp plans` because the plan looks complete.
- Scaffolding a worktree because the next obvious move is to start coding.

Each shortcut maps to exactly one action. Multi-step is **only** triggered by free-form instruction that names multiple actions in one sentence ("draft 7 and fix the typo in § 2"). Anything implicit is a bug.

#### Don't omit silently — flag everything

If you notice **anything** while doing the requested action — a typo, an inconsistent diagram, a missed change, a constraint that would belong in § 7, an obviously-next-step like `ws` or `ccp plans` — flag it in the chat reply and let the user decide. There is no such thing as a flag too small for a planning session.

**Numbered flags.** Number flags from 1 within each turn (per-message reset; do not number across turns). The user addresses each by index in the next turn — `flag <N>: lg` to accept and apply, `flag <N>: skip` to explicitly drop, `flag <N>: <free text>` for custom direction (e.g. `flag 2: defer to ws`), `flags: lg` to accept all, `flag 1, 3: skip` for multi-select. Each flag's bespoke "Reply ..." sentence still names the specific iterate verb (e.g. `iterate § 4`); the universal `flag <N>: lg` is the shortcut equivalent that applies to every flag.

A flag looks like:

> *Flag 1: while drafting § 7 I noticed § 4's sequence diagram doesn't show the retry path that § 7's caveat is about. Reply `iterate § 4` to add it, or leave § 4 as-is.*

Or for something tiny:

> *Flag 2: § 5 has a typo — "evnet" → "event". Reply `iterate § 5` to fix, or leave for later.*

Or for a next-step suggestion outside this skill's scope:

> *Flag 3: the plan looks fully drafted (no `_TBD_` left). If you're ready to commit, reply `ccp plans`; if you want to start a coding session, reply `ws`.*

After flagging, continue with the regular shortcut menu so the user can pick the next move. The same discipline applies to `iterate § N`: fix only that section, even when a sibling section would obviously need a follow-up edit — flag the sibling, don't touch it.

### Follow-up turns — keep proposing

When the user replies with one of the shortcuts (or free-form feedback) and you draft more, end *that* reply with a **fresh** shortcut menu reflecting the new state of the plan:

- Re-read the plan file (or remember it from this turn) and list only the section numbers still marked `_TBD_` *in this skill's territory* (§§ 1–5 and § 7) as draft shortcuts. § 6 stays in the menu as `6` (a router) regardless of whether it's still `_TBD_` or already drafted by `dp` / `pb` — the router is always available and lands users in the right skill if they want to revisit the decomposition. **Exception:** if `### Complexity score` says **high**, foreground **`iterate § 4` / `iterate § 5`** and de-emphasize or omit **`6`** until the **overall score** is **≤ 20** (recompute after edits).
- For every section already drafted *in this skill's territory* (§§ 1–5 and § 7), offer an `iterate § N: <feedback>` option. **Do not list `iterate § 6`** — § 6 is owned by `delivery-phases` / `pr-breakdown`, and iterating it happens in those skills' sessions; the chat-shortcuts dispatcher routes `iterate § 6` there if the user types it explicitly.
- When the user asks to **`iterate § 4`** or **`iterate § 5`**, after applying the edit **re-run Step 6c** (recompute the three counts, overall score, band) and **StrReplace** the entire `### Complexity score (plan-scope signal)` subsection so the file stays truthful. End with Step **7a** or **7b** according to the new band.
- **`6` is a router, not an inline draft.** When the user replies `6`, prompt them — *"For § 6, reply `dp` (child phase plans) or `pb` (PR breakdown — `pb` offers **Delivery phases**, **multi-PR PR breakdown**, or **single-PR PR breakdown**). The chosen skill drafts § 6 of this plan in its own turn."* — and stop. Do **not** load `delivery-phases` or `pr-breakdown` from inside this skill; the next user message picks one and routes through the chat-shortcuts dispatcher.
- **`7` IS drafted inline by this skill** — there's no dedicated Caveats skill, and § 7 is short and cheap to draft from the PRD plus drafted §§ 1–5 (and from § 6 if it has been drafted by `dp` / `pb` in a prior turn).
- Once `dp` / `pb` runs (in a later turn) and § 6 lands, the `sp <N>` shortcut for spawning each child plan is offered by *those* skills' own follow-up menus, not this one. This skill stays focused on §§ 1–5 + § 7.
- If everything in §§ 1–5 + § 7 is drafted (no `_TBD_` left in this skill's territory), the menu collapses to `iterate § N`, `6` (still useful as a router any time the decomposition needs revisiting), `ccp plans`, and free-form feedback.
- Keep the menu in the same blockquote-with-bullets shape so the user's eye knows where to look every turn.

The job between turns is to keep proposing the obvious next moves. The user shouldn't have to remember which section is pending or how to phrase "draft delivery phases now" — `6` should always route them to `dp` / `pb`, and `7` should always work for caveats.

## Scope guard

This skill writes the Master Plan file (`<slug>.plan.md` + `<slug>.state.yaml`) and populates §§ 1 through 5 in the initial turn (**§ 5 includes `### Decomposition assessment` and `### Complexity score (plan-scope signal)`**), computes the **plan-scope complexity table** per Step 6c, and when the **overall score** is **> 20** recommends user-journey splits before foregrounding **`6`**. It also drafts § 7 (Caveats) in a follow-up turn via the `7` shortcut. It does **not**:

- Create worktrees (that is `ws`).
- Modify code or content in the selected repos. Step 3b is the only repo touch this skill makes — it runs `git status --porcelain`, `git checkout <default-branch>`, and `git pull --ff-only` to sync each selected repo's primary checkout to its default branch before loading architectural rules. It refuses to run on a dirty tree or a linked worktree, never stashes / commits / discards, and never falls back to a non-fast-forward pull.
- Run `ccp plans` or any commit / push flow on the plans repo. (Plan scaffolds often need a few iterations before they are worth committing; let the user run `ccp plans` explicitly once the body stabilises.)
- Draft section 6 (`Delivery phases | PR breakdown`) — that section is owned by `delivery-phases` (`dp`) and `pr-breakdown` (`pb`); the `6` shortcut in the handoff menu routes there rather than drafting inline.
- Load `delivery-phases` / `pr-breakdown` from inside this skill. The `6` shortcut prompts the user to type `dp` or `pb` in the next turn; the chat-shortcuts dispatcher routes from there.

Stop after the handoff line.
