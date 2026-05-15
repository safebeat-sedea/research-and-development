---
name: new-plan
description: >-
  Scaffold a new `.plan.md` plus `.state.yaml` sidecar under the `.sedea/operations/`
  plan union (joint or per-operations-user-id `plans/`), with required frontmatter
  (name, overview, todos, isProject) and `parent` only in the sidecar. Resolves
  parent per planning-target-resolution; confirms parent before write except on
  indexed child spawn when parent + index N are already locked by session context.
  After an indexed spawn, may hand off to **phase-plan** or **pr-plan** via
  initiating-agent ignition when those skills exist. Use under mission dispatch or
  when the developer asks for a new plan / sub-plan / indexed child from a
  numbered dual-title list.
---

# New plan

Scaffold a standalone `.plan.md` and `.state.yaml` under the **`.sedea/operations/`** plan union (`joint/.../plans/` or `<operations-user-id>/.../plans/` — see **Slug and filename**). On first write, frontmatter must be valid YAML and match the shape Sedea tooling expects (see **Write the plan template** and naming guidance in `.sedea/centers/sedea-centers--development/docs/development-process.md` plus `.sedea/centers/sedea-centers--development/rules/10_plan-naming-convention.mdc`).

**Resolution contract:** read `.sedea/centers/sedea-centers--development/rules/planning-target-resolution.mdc` and follow it for target selection and snapshots. Resolve parents using **§ Parent derivation** below (explicit session/message → `plan-state resolve` → recent chat references).

## Triggers

Invocation context examples (mission dispatch and structured choices):

- Mission dispatch or explicit request to run **`new-plan`** / **`sub-plan`**.
- Natural language: create a new plan named …; scaffold a child plan under parent …; expand item **N** from the parent’s `Delivery phases` or `### PR list`.
- Free-form (“I need a new plan for …”) — confirm scope then proceed.

The **developer** selects continuation via **AskQuestion** or a **numbered** option you present.

## Indexed child spawn (parent list item **N**)

This path applies when **before this skill runs** the parent `.plan.md` and the child index **N** are already resolved per **planning-target-resolution** (explicit path, snapshot choice, or mid-flow continuation after a numbered option). It expands one row from the parent’s dual-title section into its own plan file beside sibling plans.

The regular parent-confirmation gate below is **skipped** when that pre-resolution is explicit: acknowledge in one line — `Parent: <slug> (from <source>)` — then proceed to slug + filenames.

1. **Read item N** from the parent’s dual-title section. Where the numbered list lives depends on the section heading:
   - **`Delivery phases`** (mode #2): the numbered list is the body of `## 6. Delivery phases` (Master Plan) or `## 5. Delivery phases` (Phase plan).
   - **`PR breakdown`** (mode #3): the numbered list is only under `### PR list` inside `## 6. PR breakdown` (Master) or `## 5. PR breakdown` (Phase). Ignore `### Single-concern strategy` and `### Sequencing` for index resolution.

   The **seed** for the child title is the **bolded title** on item **N**’s first line — strip the list marker (`1. `, …) and `**` markers. **Display title** (`name:` + H1) uses **sentence case** plus optional `<N>. ` prefix per § **Slug and filename** / **Write the plan template** → **Rules**. **Slug base** for filenames normalizes from the **raw** bolded string (before sentence case).

**Stop conditions**

- Heading still `Delivery phases | PR breakdown` or body `_TBD_` — stop; run **`delivery-phases`** or **`pr-breakdown`** (mission / structured choice) to decide decomposition first.
- **`PR breakdown`** but `### PR list` missing or `_TBD_` — stop; run **`pr-breakdown`** to draft the list first.
- Item **N** absent — stop; extend the parent list with the relevant skill, or pick a valid index.
- **N ≥ 36** — stop with the wide-branching message (single-character filename prefix supports items **1–35**).

**Non-indexed name on the same pre-resolved parent:** if the session supplies a **free-text child name** instead of digit-only **N**, use that string as the plan name (sentence case rules apply); keep the parent from context; still skip the confirmation gate only when resolution rules say the parent is already locked.

**`N` alone with no name:** fall through to prompting for a name inline; parent stays as pre-resolved.

**Placement:** child files live in the same **flat** `plans/` directory as their siblings (the resolved `joint/.../plans/` or `<operations-user-id>/.../plans/` tree). Indexed children and every other plan file use that single folder — no extra plan subfolders for now.

Everything else (slug shape, frontmatter, sidecar, after-write steps, scope guard) matches the non-indexed path below.

## Parent derivation (context-aware)

A plan without a parent is a **top-level topic** (top-level plan: `parent: null` in the sidecar) or an orphan until you assign one. **Top-level topic** is a naming role in the process doc — files still live in the flat `plans/` directory next to everything else. Resolve a candidate in this order (align with **planning-target-resolution**; highest confidence first), then confirm before writing (unless **Indexed child spawn** already skipped the gate):

1. **Explicit in session or message** — slug, path under `plans/`, or absolute `.sedea/operations/.../*.plan.md`.
2. **Session anchor** — from hosting repo root:

   ```bash
   node .sedea/centers/sedea-centers--development/missions/plan-and-deliver/scripts/plan-state.mjs resolve --cwd "$PWD"
   ```

   Exit **0** means `$PWD` is inside a worktree listed in some plan’s sidecar; that plan is a strong passive parent candidate. Optional scope: **`--user-uuid <id>`** before the subcommand (CLI flag name is **historical**; value is the **operations user id**), else `.sedea/local/operations-user-uuid`, else `git config --local sedea.operationsUserUuid`; if none set, only `joint` plans are searched.
3. **Recent chat references** — last turns name a slug or absolute plan path.
4. **Nothing resolved** — ask the developer for a parent slug, or the literal `null` for a **top-level topic** (top-level plan, `parent: null`).

Lock the parent using the bullets above; **planning-target-resolution** is normative for combining signals.

**Confirm** before writing on this path (unless **Indexed child spawn** already skipped the gate). Wrong parent is the expensive failure mode. Example:

> Parent: `plan_board_extension_mvp_a0939d76` (from `plan-state resolve`). OK? Reply yes to write, paste a different slug, or `null` for a **top-level topic** (top-level plan).

If two candidates conflict, present both and ask.

## Slug and filename

- **Name:** what the developer supplied (e.g. `Phase 4 rollout`), or derived from indexed spawn rules.
- **Filename prefix (indexed spawn, digit-only N):** single character `<C>` — digits `1`–`9` for items 1–9, letters `A`–`Z` for 10–35 (`10` → `A`, …). For indexed digit-only **N**, prefix `<C>_` on the basename; for free-named children and plain new plans, omit that prefix.
- **Title prefix (indexed spawn):** prepend `<N>. ` to **display title** in `name:` and H1; item 10 uses filename `A_...` but title prefix `10. `. Apply this prefix only for indexed digit-only **N**; omit for other spawns.
- **Slug base (indexed):** from raw bolded title only (normalized). **Slug base (non-indexed):** from user name, lowercased, spaces → `_` or `-`, match sibling conventions.
- **Suffix:** append 8 hex chars (e.g. `crypto.randomBytes(4).toString('hex')`) for uniqueness.
- **Paths:** under `.sedea/operations/joint/plans/` or `.sedea/operations/<operations-user-id>/plans/` (same directory for `.plan.md` and `.state.yaml`). Indexed: `<C>_<slugBase>_<hex>.plan.md` / `.state.yaml`; otherwise `<slugBase>_<hex>.plan.md` / `.state.yaml`.

All new plans are sibling files in the flat `.../plans/` directory for the resolved operations tree (`joint` or `<operations-user-id>`). **Top-level topic** names a top-level plan with `parent: null` in the sidecar — same flat `.../plans/` path as any other plan file.

### Handling 10–35 children

Letter mapping for items 10–35: `A` = 10 through `Z` = 35. Re-numbering siblings after reordering the parent list is **manual**: update filenames, sidecars, `Plan:` links, and title prefixes together when list order changes.

## Write the plan template

Two artefacts in one skill turn.

### 1. `<slug>.plan.md`

```markdown
---
name: <display name>
overview: <one-line overview the user gave, or inferred from the name>
todos:
  - id: <first_todo_slug>
    content: <describe the first concrete step>
    status: pending
isProject: false
---

# <display name>

## Overview

<free-form — mirror the overview field, expand if the user gave more context>

## Phasing

<stub: "TBD — fill in when scope settles.">

## Out of scope

<stub>
```

**Rules**

- **Display name** — indexed: `<N>. ` + sentence-cased bolded title. Non-indexed: sentence-cased user name; include a literal `<N>. ` prefix only when the user supplied it as part of the name.
- **Sentence case** for `name:`, H1, and (indexed) parent `Plan:` link text — see development-process tone. For indexed spawn, keep **slug** / filename base tied to the **raw** list line; apply sentence case to display fields only.
- **`parent:`** — record in **`<slug>.state.yaml`**; `.plan.md` frontmatter carries `name`, `overview`, `todos`, `isProject`, and related fields so Plan tooling keeps a stable shape.
- **Seed `todos:`** with one real first todo unless the developer asked for scope-only with empty todos.
- **`isProject: false`** unless they asked otherwise.
- **YAML quoting** — wrap `name:`, `overview:`, todo `content:` in double quotes when the value contains `: ` or ends with `:`, starts with YAML-significant characters, looks like `true`/`false`/`null`, etc. Re-read after write; if `name:` parsed as a nested object, re-quote.

### 2. `<slug>.state.yaml`

```yaml
# Sidecar for Plan Board (runtime). Plan: <slug>.plan.md
parent: <resolved-parent-slug-or-null>
worktrees: []
prs: []
```

Always write the sidecar. `parent:` required; use YAML `null` unquoted for a **top-level topic** (`parent: null`) or an explicit orphan. Header comment matches `plan-state.mjs` output style.

## After writing

1. **Indexed spawn only — parent `Plan:` placeholder.** Under item **N** in `Delivery phases` or `### PR list`, replace the `_TBD` placeholder line for `Plan:` (whatever exact placeholder the parent template used — often a spawn hint at the same indent as sibling bullets) with a **relative** Markdown link to the child file: `[<sentence-cased title without N. prefix>](<C>_<slug>.plan.md)`. If the placeholder is already filled, one-line note and continue.

2. **Link the child** using an absolute `file://` URL to the real path under `.sedea/operations/.../plans/...` so the developer can open it.

3. **Populator handoff (indexed spawn only).** If the parent heading is **`Delivery phases`**, the next step is the **`phase-plan`** protocol branch on the new child; if **`PR breakdown`**, the **`pr-plan`** protocol branch. The **initiating agent** ignites that **protocol branch** with an **ignition prompt** that names the child path (per **sedea-center-artifact-migration** platform rules). **`pr-breakdown`**, nested decomposition, and **`plan-reconcile`** happen in their own mission steps after this skill finishes. If a center populator `SKILL.md` is ever absent, end after stub + parent link and point at **`development-process.md`**.

4. **Non-indexed spawns:** no populator handoff table — suggest filling stubs or choosing the next **protocol branch** via mission / numbered options.

5. **Worktrees, broad `git` operations, and `## Child plans` on the parent** — owned by **`coding-session`**, **`plan-reconcile`**, and other cadence steps after this skill completes.

## Scope guard

This skill writes `.plan.md` + `.state.yaml`, optionally updates one `Plan:` line under the parent’s dual-title list (indexed spawn), and may **describe** ignition handoff to **`phase-plan`** / **`pr-plan`**. Worktree creation, PR prompts, archive bullets, and expanding the dual-title list beyond the chosen item **N** sit in **`coding-session`**, **`plan-reconcile`**, **`delivery-phases`**, and **`pr-breakdown`** as applicable.

Stop after write + parent confirmation (when required) + parent `Plan:` update (indexed) + optional ignition handoff when downstream skills exist.
