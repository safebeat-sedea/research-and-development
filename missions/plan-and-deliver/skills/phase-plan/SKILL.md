---
name: phase-plan
description: >-
  Populate a phase plan body: draft §§ 1–4 (Background, Scope, Code design,
  Changes) plus **`### Decomposition assessment`** before the dual-title § 5,
  per Sedea's New Feature Development Process (mode #2). Pulls scope from the
  parent's `Delivery phases` item N, reuses the parent's diagrams with this phase
  highlighted, and infers phase-scoped Changes. § 5 list body and § 6 Caveats
  stay `_TBD_` for **`delivery-phases`** / **`pr-breakdown`**. Target resolved per
  planning-target-resolution. Use under mission dispatch, **`phase-plan`** protocol
  branch, natural language, or after **`new-plan`** ignition on a `Delivery phases`
  child stub.
---

# Phase plan: §§ 1–4 from the parent plan

This skill drives the **second-tier** planning move under Sedea's New Feature Development Process: take a freshly-spawned phase plan stub (indexed child from the parent's `Delivery phases` list, typically right after the **`new-plan`** protocol branch) and populate its body with sections 1 through 4 of the **Phase plan template** — Background, Scope, Code design, Changes — plus **`### Decomposition assessment`** (sizing and routing recommendation) **immediately before** the dual-title `## 5. Delivery phases | PR breakdown` section. The dual-title **list** body and § 6 (Caveats) stay `_TBD_` until follow-up turns.

The agent has enough context after step 3 to draft §§ 1–4 and the assessment — inferable from the parent plan's architectural design + change list + this phase's row in the parent's `Delivery phases` numbered list. The assessment supplies **kinds of change**, **PR count band**, **sequencing / coupling**, a **routing recommendation**, and **confidence** so the **developer** can choose the next **`delivery-phases`** / **`pr-breakdown`** path without guessing. Filling the dual-title **numbered list** is owned by those protocol branches; § 6 (Caveats) often only emerges once § 5 reveals constraints.

The procedure below is a hard contract — do **not** skip steps, re-order them, or start drafting before the target plan is verified as a phase plan stub. Skipping a step is the difference between a clean phase plan and one that drifts from the documented process.

## Trigger

Invocation context (mission dispatch and structured choices):

- Mission dispatch or explicit request to run the **`phase-plan`** protocol branch.
- Natural language: populate / draft / fill the phase plan body.
- Immediately after **`new-plan`** ignition when the parent dual-title is **`Delivery phases`** — the usual next step on the new child stub.

The **developer** picks the next move via **AskQuestion** or a **numbered** list you present.

## Step 1 — Identify the target plan and verify it's a phase plan stub

The skill operates on a **target** `.plan.md` resolved before this skill runs, per [`planning-target-resolution.mdc`](../../../rules/planning-target-resolution.mdc) § *Resolution order*. Acknowledge the target slug in one line when this skill starts (e.g. *Target plan: `<slug>` (from prior structured choice).*). Resolve targets from session, snapshot, or explicit path — **planning-target-resolution** is normative.

If there is no resolved target, **stop** and emit a fresh *Where we are now in the plan tree* snapshot; let the developer pick the lane via **AskQuestion** or numbered options, then continue.

Acknowledge in one line: *"Target plan: `<slug>`."*

### 1a — Verify the body's template state

Read the target plan in full and apply:

| Body state | Meaning | Action |
|---|---|---|
| Has `## Overview` + `## Phasing` + `## Out of scope` (the new-plan stub) | Fresh stub, drafting needed | Step 1b → Step 2 → Step 3 → Step 4 (full body rewrite) |
| Has `## 1. Background` + `## 2. Scope` + `## 3. Code design` + `## 4. Changes`, with one or more `_TBD_` placeholders under §§ 1–4 | Partially drafted phase plan | Step 1b → Step 2 → Step 3 → Step 4 (fill only the still-`_TBD_` sections; keep already-drafted content) |
| Has §§ 1–4 populated but **no** `### Decomposition assessment` before `## 5. Delivery phases \| PR breakdown` | Legacy or interrupted draft | Step 1b → Step 2 → Step 3 → Step 4g only (insert assessment via `StrReplace`; leave §§ 1–4 untouched unless they still have `_TBD_`) |
| Has §§ 1–4 + `### Decomposition assessment` complete; `## 5. Delivery phases \| PR breakdown` still `_TBD_` | Ready for **`delivery-phases`** / **`pr-breakdown`** | Step 5 (handoff menu) |
| Has `## 4. Architectural design` + `## 6. Delivery phases \| PR breakdown` (Master Plan template) | Wrong skill — this is a Master Plan | **Stop**: *"This plan's body is the Master Plan template. Use the **`master-plan`** protocol branch to draft Master Plan §§ 1–5."* |
| Has `## Single concern` heading | Wrong skill — this is a PR plan | **Stop**: *"This is a PR plan. PR plans don't use the Phase plan template; they have their own per-PR template."* |

Acknowledge the body state in one line — e.g. *"Body state: fresh new-plan stub; will rewrite to the Phase plan template."*

If the body is the new-plan stub but `## Overview` / `## Phasing` / `## Out of scope` carry **non-stub content** (the user typed scope context into them before invoking this skill), capture that content in your working notes and feed it into § 1 / § 2 drafting (paraphrase it; don't copy verbatim into the new sections). Flag in the chat reply (under § 4f or in the handoff): *"Captured user content from the stub `## Overview` / `## Phasing` and merged into § 1 / § 2 — review the wording."*

### 1b — Verify parent topology

Read the target plan's sidecar `<slug>.state.yaml` for `parent:`. Apply:

- `parent: null` (or sidecar missing) → **stop** with: *"This plan has no parent (`parent: null` or sidecar missing). Phase plans hang under a Master Plan or another Phase plan in **`Delivery phases`** mode. Fix the sidecar via **`plan-reconcile`** (or by hand), or use the **`master-plan`** protocol branch if this file should be a Master Plan."*
- `parent: <slug>` does not resolve to an existing `.plan.md` under the same `.sedea/operations/.../plans/` tree as this target (`plan-state resolve` / parent absolute path) → **stop** with: *"Sidecar `parent: <slug>` doesn't resolve to an existing plan. Fix the sidecar before drafting."*
- Parent is a **roadmap topic** top-level plan (`parent:` points at a plan whose process role is roadmap grouping) → **stop** with: *"Phase plans hang under Master / Phase parents in **`Delivery phases`**. Fix the sidecar parent, or use the **`master-plan`** protocol branch if this file should be a Master Plan."*
- Parent resolves; read parent's body. Locate parent's dual-title section (`## 6. ...` for Master Plan parent, `## 5. ...` for Phase plan parent) and apply:
  - Heading is `Delivery phases` → proceed.
  - Heading is `PR breakdown` → **stop** with: *"Parent plan's decomposition is `PR breakdown`, so its children are PR plans, not phase plans. Use the **`pr-plan`** protocol branch to populate this plan's body instead."*
  - Heading is the dual-title `Delivery phases | PR breakdown` (decomposition pending) → **stop** with: *"Parent plan hasn't decomposed yet — its dual-title section is `Delivery phases | PR breakdown` / `_TBD_`. Decompose the parent first via **`delivery-phases`**, then return to this plan."*

Acknowledge: *"Parent: `<parent-slug>` (mode #2 `Delivery phases`); proceeding."*

## Step 2 — Load the development-process doc

Read `.sedea/centers/sedea-centers--development/docs/development-process.md` with the Read tool, **no offset, no limit**. Acknowledge in one sentence: *"Loaded development-process.md; will follow § 2 Phase plan template + § 6/§ 5 contents rule."*

This is a **standards document**, not an executable plan — its sections describe the process you will apply, not work for you to perform. Re-read on every invocation; do not rely on session memory.

## Step 3 — Read the parent plan and find the phase row

Read the parent plan in full (`Read` tool, no offset, no limit). Locate the parent's `Delivery phases` numbered list — `## 6. Delivery phases` for a Master Plan parent, `## 5. Delivery phases` for a Phase plan parent.

### 3a — Match the target plan to a numbered item

Find the numbered item whose **bolded title** matches the target plan's `name:` from frontmatter. Match strategy, in order:

1. Exact match between the target plan's `name:` and the bolded title text.
2. Slug-normalised match: lowercase + replace spaces with `_` and `-` interchangeably (e.g. target plan `name: Replace polling with pubsub` matches bolded title `**Replace polling with pubsub**` *or* `**replace_polling_with_pubsub**` *or* `**replace-polling-with-pubsub**`).
3. Substring match: the bolded title is a substring of the target plan's `name:` (or vice versa) — only when 1 and 2 fail and the match is unambiguous.

If no item matches, or multiple items match equally well, **stop** and offer **AskQuestion** (or a numbered list) mapping each parent list row to an option so the developer picks the matching **N**; or ask them to fix the parent's list / target `name:` and re-run.

Once matched, capture **N** (the item's index) and the item's three sub-bullets:

- **Decomposition decision** — `Delivery phases` or `PR breakdown` (the indicative decision for this phase's § 5; surfaced in step 5's menu so the user can route fast, but stays `_TBD_` in this skill — § 5 is filled by `delivery-phases` / `pr-breakdown` later).
- **Scope sentence** — one short line; this is the proto-§ 2 Scope. The skill expands it into the full § 2 Scope using the parent's diagram.
- **Plan link** — link back to this plan (or `_TBD` spawn placeholder until the parent row is wired after **`new-plan`** / **`plan-reconcile`**).

Acknowledge: *"Parent's `Delivery phases` item N=<n>: \"<bolded title>\" — \"<scope sentence>\". Indicative decomposition: `<value>`."*

### 3b — Load architectural context from the parent

What you load depends on the parent's stage:

- **Master Plan parent** → load § 4 Architectural design (the diagrams, in full — preserve the Mermaid source) + § 5 Changes (the feature-level change list). These ground both this phase plan's § 2 Scope (which highlights the parts touched) and § 4 Changes (which is a phase-scoped subset of the parent's Changes list).
- **Phase plan parent** → load § 2 Scope (parent's scope, of which this child is a subset) + § 3 Code design (parent's diagram) + § 4 Changes (parent's change list).

Acknowledge in one sentence: *"Loaded parent's <§ 4 Architectural design + § 5 Changes | § 2 Scope + § 3 Code design + § 4 Changes>; <D> diagram(s), <K> change bullets."*

If the parent's diagram(s) are too large to reuse verbatim (more than ~10 nodes / lines, or multiple disjoint diagrams), pick the one(s) that cover the parts this phase touches. Note the choice in one line — *"§ 2 Scope will reuse parent's <diagram name> (the others don't intersect this phase)"*.

## Step 4 — Draft §§ 1–4 into the target plan

This is where the skill earns its keep: take the parent context loaded in step 3 and produce §§ 1–4 of the Phase plan template.

### 4a — Write the body (fresh case)

When the body is the new-plan stub, replace the **entire body** in one `StrReplace` with the Phase plan template populated for §§ 1–4 and `_TBD_` for §§ 5–6 (the outer fence below is quadruple backticks so the inner ```` ```mermaid ```` fences render literally — what the file actually receives is the inner content with regular triple-backtick mermaid fences):

````
old_string:
# <display name>

## Overview

<existing overview content>

## Phasing

<existing phasing stub>

## Out of scope

<existing out-of-scope stub>

new_string:
# <display name>

## 1. Background

<1–2 sentences per § 4b below>

## 2. Scope

<one short sentence per § 4c below>

```mermaid
<reused parent diagram with this phase's parts highlighted, per § 4c>
```

## 3. Code design

```mermaid
<new diagram per § 4d below>
```

## 4. Changes

<short bullet list per § 4e below>

### Decomposition assessment

<bullets per § 4g below>

## 5. Delivery phases | PR breakdown

_TBD_

## 6. Caveats (optional)

_TBD_
````

The `_TBD_` placeholders under §§ 5–6 mirror the convention from `master-plan` step 5c — italic and easy to grep (`rg '^_TBD_$'`). The `## 5.` heading uses the **deliberate dual-title** form per the doc's § 6 / § 5 contents rule; the actual decomposition decision (`Delivery phases` vs `PR breakdown`) and the numbered child list are made when § 5 is drafted via `delivery-phases` / `pr-breakdown`. The **`### Decomposition assessment`** block is **not** a substitute for that list — it records evidence *before* the choice.

The frontmatter (`name`, `overview`, `todos`, `isProject`) is **not** touched — those were set correctly by the new-plan skill at scaffold time. If a follow-up `iterate` ever does edit a frontmatter scalar (e.g. fixing a typo in `name:`), follow the YAML scalar-quoting bullet in [`../new-plan/SKILL.md`](../new-plan/SKILL.md) § *Write the plan template* → `<slug>.plan.md` rules — most importantly, wrap any value containing `: ` (colon + space) in double quotes so Plan Board doesn't fall back to the slug for the tree label.

If the body is **partially drafted** (per the step 1a table), do not rewrite the whole body. Instead, fill only the still-`_TBD_` section(s) — one `StrReplace` per section, using the section header as disambiguating context (same shape as `master-plan` step 6 for §§ 1–5). Keep already-drafted content untouched. To add a missing assessment only, insert `### Decomposition assessment` and its bullets **immediately before** `## 5. Delivery phases | PR breakdown` (step 4g).

### 4b — § 1 Background

One paragraph, **1–2 sentences**, framed as: *how does this phase build on the previous phase(s), and which part of the parent it covers?* Pull the "what part of parent" piece from the parent's `Delivery phases` item N's bolded title + scope sentence (captured in step 3a). The "builds on previous phase(s)" piece comes from the order of items in the parent's `Delivery phases` numbered list — phases later in the list typically build on phases earlier in the list, unless the parent's list is explicitly out-of-order.

If this is **item 1** of the parent's list (no previous phase), frame § 1 as how this phase establishes the foundation for subsequent phases — call out the foundational pieces (schema, contract, scaffolding) that later phases will consume.

If the parent has a `### Sequencing` sub-section (only true for `PR breakdown` parents, not `Delivery phases` parents — but document the case anyway), use it to refine the "previous phase" framing.

### 4c — § 2 Scope

Two parts:

1. **One short sentence** describing the phase's scope at a high level — paraphrase / lightly expand the parent's `Delivery phases` item N's scope sub-bullet. Keep it tight (one line is the target; two short sentences is the absolute max).
2. **Diagram(s) reused from the parent plan's architectural / code design section** with the parts this phase touches **highlighted** (annotation / color / callout). The highlight must convey both *which* parts the phase touches and *how* it touches them.

For Mermaid diagrams: re-emit the parent's diagram with this phase's nodes / edges styled distinctly. Pattern that works well:

```mermaid
%% reused from parent plan § <4|3>; phase highlight via classDef
flowchart LR
  classDef phaseTouch fill:#e0f2fe,stroke:#0284c7,color:#0c4a6e,stroke-width:2px
  classDef phaseNew fill:#dcfce7,stroke:#16a34a,color:#14532d,stroke-dasharray: 5 5

  subgraph Legend["Legend"]
    LegendTouch["Touched in this phase<br/>(other nodes unchanged)"]
    LegendNew["Introduced in this phase"]
  end

  <parent's diagram source, verbatim or trimmed>

  class <node1>,<node2>,LegendTouch phaseTouch
  class <newNode1>,LegendNew phaseNew
```

`phaseTouch` marks existing-in-parent nodes this phase modifies; `phaseNew` marks nodes this phase introduces (dashed border = "doesn't exist yet"). Adjust the class names / colors to match repo conventions if any are loaded in scope.

**Legend rules:**

- Always include the `Legend` subgraph for **flowchart**-shaped reused diagrams so the diagram is self-documenting in the file, on the Plan Board, and in chat echo. Drop any explanatory prose that would otherwise restate what the legend conveys.
- Emit `LegendTouch` only when the phase has at least one `phaseTouch` node; emit `LegendNew` only when it has at least one `phaseNew` node. If the phase has only one of the two, drop the unused legend node and its `class … phaseNew` / `class … phaseTouch` entry from the legend.
- **Skip** the `Legend` subgraph for non-flowchart reused diagrams (`sequenceDiagram`, `erDiagram`, `stateDiagram`, etc.) — `subgraph` is flowchart-only syntax. For those, fall back to a short prose legend below the diagram (e.g. "*Bold actors are touched in this phase.*").

If the parent's diagram is much bigger than this phase's scope (e.g. 15+ nodes and the phase touches 3), draft a **simplified subset** showing only the parts this phase touches plus their immediate neighbors — flag that you simplified, so the user can choose to expand.

### 4d — § 3 Code design

A new Mermaid diagram giving a visual representation of the change introduced by this phase. Pick the type that best fits, using the same menu as Master Plan § 4:

- Component / architecture chart — when the change is structural (new module, new service, new component).
- Flow chart — when the change is in control flow or data flow through new logic.
- Sequence diagram — when the change involves cross-process / cross-actor interactions over time.
- State diagram — when the change introduces a new lifecycle / state machine.
- ER / schema diagram — when the change is a data-model / DB delta.

Use **Mermaid** in fenced ```` ```mermaid ```` blocks so the diagram renders in Cursor and on the Plan Board. Include only what is necessary to understand the *shape* of the change; this is design granularity, not pseudocode.

The § 3 diagram complements § 2's reused-with-highlight diagram: § 2 shows *where in the parent's design* this phase lives; § 3 shows *what new shape* this phase introduces. They are usually different diagram types — § 2 inherits the parent's type (often component or flow), § 3 picks whatever conveys the per-phase change best (often sequence or state).

### 4e — § 4 Changes

Short bullet list of what changes, how, and where, scoped to this phase. **2–3 words per bullet, never more than 5** (short-bullet rule from the dev-process doc). Group bullets by area of the codebase if it helps scannability — `**DB:**`, `**API:**`, `**Worker:**`, `**UI:**`, `**Config:**` — but keep each bullet terse.

The change list is a **phase-scoped subset** of the parent's Changes list (loaded in step 3b):

- If a change in the parent's list cleanly maps to **one phase only**, copy it (terse) into the right phase's list.
- If a change spans multiple phases, **split it** into per-phase bullets and only carry this phase's slice.
- If a change in the parent's list doesn't fit any phase boundary, **flag it** (in step 4f or in the handoff) — that's a planning gap worth surfacing back to the parent.

### 4g — `### Decomposition assessment`

Mandatory **in the same turn** as §§ 1–4 (or step 4g-only for legacy bodies missing it). Place **`### Decomposition assessment`** immediately **after** the `## 4. Changes` bullets and **before** `## 5. Delivery phases | PR breakdown`. Follow the short-bullet rule where each line is one scannable fact; the **Routing recommendation** line may be slightly longer.

Include these bullets (labels may vary; content must cover each dimension):

- **Kinds of change (count):** distinct *kinds* (not files, not lines) — see **`development-process.md`** mode #3 *PR sizing* and [**`efficient-pr-shipping.mdc`**](../../../rules/efficient-pr-shipping.mdc) § *Keep PRs small and focused*.
- **PR count band:** one of `single` | `few (2–5)` | `many (6+)`.
- **Sequencing / coupling:** one line — migrations, feature flags, cross-repo, contract order, or `low` if none.
- **Routing recommendation:** one of `Delivery phases` (needs sub-phases first) | `PR breakdown` multi-PR | `PR breakdown` single-PR — state **why** in the same bullet or the next short bullet.
- **Confidence:** `high` | `med` | `low`.

Ground the recommendation in §§ 2–4 and the parent's `Delivery phases` item N (step 3a). The parent's indicative decomposition sub-bullet is a **hint**, not a commitment — the assessment may disagree and must say so when it does (flag for the **developer** in the handoff if the mismatch is non-obvious).

### 4f — Echo to chat

After writing the body, **echo §§ 1–4 and `### Decomposition assessment`** in the chat reply so the user can review without opening the file. The plan file is the source of truth; the chat copy is a review surface. Use the same section headers (`## 1. Background`, etc.) so the chat output aligns line-for-line with the file. Render Mermaid diagrams inline as fenced code blocks so the user sees them without opening the file.

If you simplified the parent's diagram in § 2c (per § 4c) or noticed parent-Changes bullets that didn't fit any phase boundary (per § 4e), surface those notes in the echo or in the handoff line — flag, don't hide.

### § 5 list and § 6 (out of scope for this skill)

Leave the dual-title **numbered list** under § 5 as `_TBD_` until the **`delivery-phases`** or **`pr-breakdown`** protocol branch fills it. Keep **`### Decomposition assessment`** immediately above § 5 — that block **is** in scope here. § 6 Caveats usually waits until § 5 exists so constraints are concrete.

## Step 5 — Hand back with next-move options

You know the state: §§ 1–4 and **`### Decomposition assessment`** are drafted; dual-title § 5 list body and § 6 stay `_TBD_`.

End with:

1. A **file link** — absolute `file://` path to the target `.plan.md` under `.sedea/operations/.../plans/...`.
2. The parent's indicative decomposition line for this phase: **`<Delivery phases | PR breakdown>`** (from step 3a).
3. **Numbered options** (or **AskQuestion**) — the developer picks one; do **not** treat legacy chat tokens as the control surface.

Suggested options (adapt labels to context):

1. **Run `delivery-phases`** protocol branch — draft the § 5 **list** as child phases (`Delivery phases` heading).
2. **Run `pr-breakdown`** protocol branch — draft the § 5 **list** as PR breakdown (the branch gates **Delivery phases** vs multi-PR vs single-PR `PR breakdown`). Align with **`### Decomposition assessment`** when the choice disagrees with the parent's hint.
3. **Revise a section** — the developer names § N and feedback; you apply one focused `StrReplace` and echo. For assessment-only edits, anchor on `## 4. Changes` … `### Decomposition assessment`.
4. **Commit plans** — remind the developer to commit when the body reads cleanly; this skill does **not** run git.

**Stop** after presenting options — wait for the developer's reply. Do **not** chain **`delivery-phases`** or **`pr-breakdown`** inside this turn unless mission dispatch explicitly continues the session.

## Step 5a — Follow-up turns

When the developer asks to revise § N, re-read that section and apply edits via `StrReplace`; echo the result; offer the same numbered menu.

When they choose decomposition (options 1 or 2), the **initiating agent** starts the chosen **protocol branch** with an **ignition prompt** that names the target plan path. Do **not** impersonate the other skill's full procedure in the same turn.

## One choice per turn — surface observations

Match the discipline in **`master-plan`**: perform exactly what was chosen; do not silently expand scope. If you notice gaps (parent Changes bullets that do not map to a phase, diagram simplifications, assessment vs parent hint mismatch), list them as short **numbered notes** in the chat reply; the developer addresses them by number on the next turn or folds them into a revise pass.

## Scope guard

## Scope guard

This skill writes the **body** of the target phase plan — replacing the **`new-plan`** stub (or filling `_TBD_` placeholders) with the Phase plan template through §§ 1–4 plus **`### Decomposition assessment`**.

**Owns:** in-file §§ 1–4 + assessment; echo to chat for review.

**Out of scope here:** target plan frontmatter (left as **`new-plan`** set it); any edit to the parent plan body (including parent `Plan:` placeholders — **`plan-reconcile`**); dual-title § 5 **numbered list** and § 6 Caveats (**`delivery-phases`** / **`pr-breakdown`** and later turns); spawning further child plans (**`new-plan`** after § 5 exists); git / commit automation.

Wrong template stops live in step 1a — use **`master-plan`** or **`pr-plan`** protocol branches when the file is a Master Plan or PR plan.

Stop after the handoff block in step 5.
