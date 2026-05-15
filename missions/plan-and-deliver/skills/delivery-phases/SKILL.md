---
name: delivery-phases
description: >-
  Decompose a target Master Plan or Phase plan into delivery phases (mode #2
  of Sedea's New Feature Development Process). Verifies template stage, loads
  development-process § 2 + § 6/§ 5 contents rule, gates Delivery phases vs PR
  breakdown when the dual-title body is _TBD_, then drafts the parent's dual-title
  section as Delivery phases with a numbered child list. Child stubs and Plan:
  links follow **new-plan** indexed spawn; bodies follow **phase-plan**. Target
  resolved per planning-target-resolution. Use under mission dispatch, **delivery-phases**
  protocol branch, or natural language (decompose phases, draft delivery phases).
---

# Delivery phases — mode #2 decomposition

This skill drives **mode #2** (Delivery phases) under Sedea's New Feature Development Process. **Input:** a target **Master Plan** or **Phase plan** whose dual-title section (`Delivery phases | PR breakdown`) is still undecided or is already committed to **`Delivery phases`**. **Output:** that section drafted as a numbered list of child phases; each row is later expanded into its own phase plan via the **`new-plan`** protocol branch (indexed child), then the **`phase-plan`** protocol branch on the new child.

The procedure below is a hard contract — do **not** skip steps, re-order them, or start drafting before stage is verified.

## Trigger

- Mission dispatch or explicit request to run the **`delivery-phases`** protocol branch.
- Natural language: decompose phases, draft delivery phases, phase decomposition.
- After **`master-plan`** when the developer has already chosen **`Delivery phases`** over **`PR breakdown`** for § 6 — **`master-plan`** may draft that section in-session; this skill is the **standalone** path for any plan when mode #2 still needs to run or iterate.

The **developer** picks the next move via **AskQuestion** or a **numbered** list you present.

## Step 1 — Identify the target plan and verify stage

The skill operates on a **target** `.plan.md` resolved before this skill runs, per [`planning-target-resolution.mdc`](../../../rules/planning-target-resolution.mdc) § *Resolution order*. Acknowledge the target slug in one line when this skill starts (e.g. *Target plan: `<slug>` (from prior structured choice).*). Resolve targets from session, snapshot, or explicit path — **planning-target-resolution** is normative. Do **not** infer the target from the IDE’s focused-file list alone.

If there is no resolved target, **stop** and emit a fresh *Where we are now in the plan tree* snapshot; let the developer pick the lane via **AskQuestion** or numbered options, then continue.

Acknowledge in one line: *"Target plan: `<slug>`."*

**Verify the stage** from the plan body and frontmatter (`kind:`), and the sidecar when it helps disambiguate. The target must be a **Master Plan** or **Phase plan**:

- **`kind: roadmap_topic`** or the file is clearly a **roadmap topic** (top-level grouping of Master Plans) → **stop** with: *"This is a roadmap topic. Roadmap topics do not decompose into delivery phases here. Open a child Master Plan under this topic and run **`delivery-phases`** on that plan."*
- Body has **`## Single concern`** (PR plan template) → **stop** with: *"This is a PR plan. PR plans are leaves; they are not decomposed with **`delivery-phases`**. Use **`coding-session`** or **`pr-review`** as appropriate."*
- Master Plan (`## 4. Architectural design` + dual-title `## 6. …`) or Phase plan (`## 1. Background` … `## 5. …` dual-title) → proceed.
- Ambiguous (stub with no distinguishing sections yet) → use **AskQuestion** (or a short numbered list): Master Plan vs Phase plan vs PR plan; if not Master or Phase plan, **stop**.

Acknowledge: *"Stage: <Master Plan | Phase plan>; proceeding."*

## Step 2 — Load the development-process doc

Read `.sedea/centers/sedea-centers--development/docs/development-process.md` with the Read tool, **no offset, no limit** (hosting repo root). Acknowledge in one sentence: *"Loaded development-process.md; will follow § 2 Delivery phases + § 6/§ 5 contents rule."*

This is a **standards document**, not an executable plan — its sections describe the process you apply. Re-read on every invocation; do not rely on session memory.

## Step 3 — Read the target plan and locate the dual-title section

Read the target plan in full. Locate the dual-title section — the last numbered section before optional Caveats:

- **Master Plan:** `## 6. Delivery phases | PR breakdown` (or an already-decided heading).
- **Phase plan:** `## 5. Delivery phases | PR breakdown` (or an already-decided heading).

Inspect the section and apply:

| Section state | Meaning | Action |
| --- | --- | --- |
| Heading is `Delivery phases \| PR breakdown` and body is `_TBD_` | Decision pending | Step 4 (decision gate) → Step 5 (draft) |
| Heading is already `Delivery phases` with empty / `_TBD_` body | Decision made, drafting needed | Skip step 4; go to step 5 |
| Heading is already `Delivery phases` with populated body | Already drafted | Step 6 (handoff / iteration menu) |
| Heading is already `PR breakdown` | Wrong skill | **Stop:** *"This plan’s decomposition is **`PR breakdown`**. Use the **`pr-breakdown`** protocol branch on this plan to draft the PR list."* |

Acknowledge the state in one line.

## Step 4 — Decision gate (when section is `_TBD_`)

Use the **AskQuestion** tool (or an equivalent numbered choice) to ask:

> How does this plan decompose? Most features use a phase layer; small work (on the order of a few PRs) can skip the phase layer and break directly into PRs.

**Options:**

- **Delivery phases** (`id: delivery_phases`) — multi-step decomposition; each child becomes a standalone phase plan.
- **PR breakdown** (`id: pr_breakdown`) — small enough to skip the phase layer; decompose directly into PRs.

If the developer picks **`pr_breakdown`**, **stop** with: *"Use the **`pr-breakdown`** protocol branch on this plan — it sets the heading to **`PR breakdown`** and drafts the set-level PR list per the doc."* Do not draft anything in this skill; do not change the heading here.

If the developer picks **`delivery_phases`**, continue to step 5.

## Step 5 — Draft the Delivery phases numbered list

### 5a — Infer phase boundaries from the parent plan

Read the target plan’s earlier sections:

- **Master Plan:** § 4 Architectural design + § 5 Changes.
- **Phase plan:** § 2 Scope + § 3 Code design + § 4 Changes.

Pick phase boundaries that respect Strategy #6 (single concern per deliverable) and Strategy #4 (small chunks, fast to production) from **development-process.md**:

- A phase is a coherent slice of the parent’s scope to ship or defer together.
- Order phases when sequencing matters (migration before write path, schema before consumers); otherwise prefer delivery-priority (most-blocking value first).
- Avoid mega-phases (roughly more than ~5 PRs of work); split or add sub-phase recursion per mode #2.
- Prefer roughly 2–5 phases. Fewer than 2 often means **`pr-breakdown`** is enough; more than 5 often means a missing decomposition axis.

### 5b — Draft each numbered item per the § 6/§ 5 contents rule

The dev-process **§ 6 / § 5 contents rule** defines the shape. Each numbered item has three sub-bullets:

1. **Decomposition decision** — `Delivery phases` (child decomposes further) or `PR breakdown` (child is PR-ready). Pick the likely value; the developer can correct on iteration.
2. **Scope sentence** — one terse line (proto–§ 2 Scope of the future child phase plan).
3. **Plan link** — a **`Plan:`** line whose placeholder **matches the shape already used in this parent file** when present (see [`new-plan/SKILL.md`](../new-plan/SKILL.md) § *Indexed child spawn* — often `_TBD` with a short hint). If the parent template has no prior shape, use a single `_TBD` line that states the child file is pending after **`new-plan`** indexed spawn for this list item **N**. The relative Markdown link is filled when **`new-plan`** creates the child and updates the parent; **`plan-reconcile`** can repair wiring.

Optional: one short intro paragraph under the heading before the list when the decomposition needs framing; skip when the list is self-explanatory.

### 5c — Write to the parent plan

Use `StrReplace` to mutate **only** the dual-title section:

- Replace the heading `## <N>. Delivery phases | PR breakdown` → `## <N>. Delivery phases` (`<N>` is **6** for Master Plan, **5** for Phase plan).
- Replace body `_TBD_` with the optional intro + numbered list.

**Bold** the phase name on each item’s first line — the **`new-plan`** protocol branch (indexed spawn) derives the child display name from that bold text (see **`new-plan`**). Keep names short (about 2–5 words).

Do **not** modify other sections in the same call. Do **not** add extra `## <N>.` H2 phase headings elsewhere in the parent; the numbered list under **`Delivery phases`** is the primary anchor for indexed spawn.

After writing, read the file back and confirm the section reads as intended.

### 5d — Echo to chat

Echo the drafted section so the developer can review without opening the file. Mirror the file’s headings and list shape.

## Step 6 — Hand back with next-move options

End with:

1. A **`file://`** link to the target `.plan.md` under `.sedea/operations/.../plans/...` (use the resolved absolute path from **`plan-state resolve`** or equivalent).
2. A one-line summary: *Drafted `## <N>. Delivery phases` with **K** child rows.*
3. **Numbered options** (adapt labels; offer **AskQuestion** when it clarifies). After drafting **K** rows, keep **K** visible in the summary so the developer knows how many indexed children exist.

   1. **Spawn phase children (`new-plan`, indexed)** — For each list index **1** through **K**, the **initiating agent** ignites the **`new-plan`** protocol branch with this plan as parent and that index (digit-only **N** per session contract in **`new-plan`** § *Indexed child spawn*). Each run creates the child stub and wires the parent **`Plan:`** line when the flow completes.
   2. **`phase-plan` on a child** — After a child `.plan.md` exists, ignite **`phase-plan`** on that path to draft §§ 1–4 and **`### Decomposition assessment`**.
   3. **Revise this `Delivery phases` section** — The developer gives free-text feedback; you apply one focused `StrReplace` on the list and echo the result.
   4. **Switch to `pr-breakdown`** — If work should skip the phase layer after all, hand off to **`pr-breakdown`** (do not silently change the heading unless step 4 already chose PR breakdown or the developer explicitly asks here).
   5. **Commit when ready** — Remind the developer to commit; this skill does **not** run `git`.

Re-offer the same structure after iteration. **Stop** after this block — wait for the developer’s next message. Do **not** run **`new-plan`** or **`phase-plan`** inside this turn unless mission dispatch explicitly continues.

## Step 6a — Follow-up turns

When the developer asks to revise the **`Delivery phases`** list, re-read that section, apply edits via `StrReplace`, echo the result, and return to the step 6 menu pattern.

When they choose to spawn or populate a child, that work runs under **`new-plan`** / **`phase-plan`** in a **separate** protocol step — do not impersonate those skills’ full procedures in the same turn.

## One primary choice per turn — surface observations

Match the discipline in **`master-plan`** and **`phase-plan`**: perform exactly what was chosen; do not silently expand scope. If you notice gaps (diagram vs phase boundary, duplicate wording, phase count vs assessment), list short **numbered observations** in the chat reply; the developer addresses them on the next turn or folds them into a revise pass. Do **not** invent typed shortcut vocabularies for accepting or skipping flags.

## Scope guard

**Owns:** the parent plan’s dual-title **`Delivery phases`** section only (heading + list body for mode #2); decision gate when still `_TBD_`; echo for review.

**Out of scope:** spawning or renaming child plans (**`new-plan`**); filling phase bodies (**`phase-plan`**); PR breakdown content (**`pr-breakdown`**); edits outside the dual-title section; extra H2 phase headings in the parent; `git` / commit automation; roadmap topics and PR plans (step 1 stops).

Stop after the step 6 handoff block.
