---
name: pr-breakdown
description: >-
  Decompose a target Master Plan or Phase plan into PRs (mode #3 set-level) under
  Sedea's New Feature Development Process. Verifies template stage, ensures
  **`### Decomposition assessment`** exists (inserts if missing), gates
  **Delivery phases** vs multi-PR vs single-PR **PR breakdown**, then drafts
  **`### Single-concern strategy`**, **`### Sequencing`**, and **`### PR list`**.
  Child PR stubs and **`Plan:`** lines follow **new-plan** indexed spawn; per-PR
  §§ 1–4 follow **pr-plan**. Target resolved per
  planning-target-resolution. Use under mission dispatch, **pr-breakdown**
  protocol branch, or natural language (decompose into PRs, draft PR breakdown).
---

# PR breakdown — mode #3 decomposition

This skill drives **mode #3** (set-level **PR breakdown**) under Sedea's New Feature Development Process. **Input:** a target **Master Plan** or **Phase plan** whose dual-title section (`Delivery phases | PR breakdown`) is undecided or is already **`PR breakdown`**. **Output:** that section drafted as **`### Single-concern strategy`**, **`### Sequencing`**, and **`### PR list`** (numbered child PRs). Each row is expanded into its own PR plan via the **`new-plan`** protocol branch (indexed child), then the **`pr-plan`** protocol branch on each new child (see [`new-plan/SKILL.md`](../new-plan/SKILL.md) populator handoff).

The procedure below is a hard contract — do **not** skip steps, re-order them, or start drafting before stage is verified.

## Trigger

- Mission dispatch or explicit request to run the **`pr-breakdown`** protocol branch.
- Natural language: decompose into PRs, draft PR breakdown, PR breakdown.
- After **`master-plan`** when the developer has already chosen **`PR breakdown`** for § 6 — **`master-plan`** may route in-session; this skill is the **standalone** path for any plan when mode #3 still needs to run or iterate.

The **developer** picks the next move via **AskQuestion** or a **numbered** list you present.

## Step 1 — Identify the target plan and verify stage

The skill operates on a **target** `.plan.md` resolved before this skill runs, per [`planning-target-resolution.mdc`](../../../rules/planning-target-resolution.mdc) § *Resolution order*. Acknowledge the target slug in one line when this skill starts (e.g. *Target plan: `<slug>` (from prior structured choice).*). Resolve targets from session, snapshot, or explicit path — **planning-target-resolution** is normative. Do **not** infer the target from the IDE’s focused-file list alone.

If there is no resolved target, **stop** and emit a fresh *Where we are now in the plan tree* snapshot; let the developer pick the lane via **AskQuestion** or numbered options, then continue.

Acknowledge in one line: *"Target plan: `<slug>`."*

**Verify the stage** from the plan body and frontmatter (`kind:`), and the sidecar when it helps disambiguate. The target must be a **Master Plan** or **Phase plan**:

- **`kind: roadmap_topic`** or the file is clearly a **roadmap topic** → **stop** with: *"This is a roadmap topic. Roadmap topics do not decompose into PRs here. Open a child Master Plan and run **`pr-breakdown`** on that plan."*
- Body has **`## Single concern`** (PR plan template) → **stop** with: *"This is a PR plan. PR plans are leaves; they are not decomposed with **`pr-breakdown`**. Use **`coding-session`** or **`pr-review`** as appropriate."*
- Master Plan or Phase plan → proceed.
- Ambiguous (stub with no distinguishing sections yet) → use **AskQuestion** (or a short numbered list): Master Plan vs Phase plan vs PR plan; if not Master or Phase plan, **stop**.

Acknowledge: *"Stage: <Master Plan | Phase plan>; proceeding."*

## Step 2 — Load the development-process doc

Read `.sedea/centers/sedea-centers--development/docs/development-process.md` with the Read tool, **no offset, no limit** (hosting repo root). Acknowledge in one sentence: *"Loaded development-process.md; will follow § 3 PR breakdown set-level template + § 6/§ 5 contents rule."*

This is a **standards document**, not an executable plan — its sections describe the process you apply. Re-read on every invocation; do not rely on session memory.

## Step 3 — Read the target plan and locate the dual-title section

Read the target plan in full. Locate the dual-title section — the last numbered section before optional Caveats:

- **Master Plan:** `## 6. Delivery phases | PR breakdown` or `## 6. PR breakdown`.
- **Phase plan:** `## 5. Delivery phases | PR breakdown` or `## 5. PR breakdown`.

Inspect the section and apply:

| Section state | Meaning | Action |
| --- | --- | --- |
| Heading is `Delivery phases \| PR breakdown` and the dual-title **list** is still `_TBD_` (assessment may or may not exist yet) | Decision pending on recursion shape | Step 3.5 → Step 4 → Step 5 when a PR-breakdown path is chosen |
| Heading is already `PR breakdown` with empty / `_TBD_` body (set-level sub-sections not yet drafted) | **PR breakdown** chosen; need set-level draft | Step 3.5 → **Skip step 4** → Step 5 (use **`### Decomposition assessment`** to choose single-item vs multi-item **`### PR list`**; default to **multi** if ambiguous — **flag** when assessment clearly says single but you drafted multiple) |
| Heading is already `PR breakdown` with all three sub-sections populated | Already drafted | Step 6 (handoff menu) |
| Heading is already `PR breakdown` with some sub-sections drafted, others `_TBD_` | Partially drafted | Step 5, filling only still-`_TBD_` sub-sections unless asked to replace existing text |
| Heading is already `Delivery phases` | Wrong skill | **Stop:** *"This plan’s decomposition is **`Delivery phases`**. Use the **`delivery-phases`** protocol branch on this plan to draft the phase list."* |

Acknowledge the state in one line.

## Step 3.5 — Ensure `### Decomposition assessment`

Before **AskQuestion** (step 4) or before drafting set-level **`PR breakdown`** (step 5 when step 4 is skipped), the plan file must contain **`### Decomposition assessment`** so the **developer** and the agent share the same sizing snapshot.

1. If the plan body **already contains** the heading **`### Decomposition assessment`**, **read it** and acknowledge one line in chat — do **not** duplicate it.
2. Otherwise **infer** the same dimensions as **[`phase-plan` / § 4g — `### Decomposition assessment`](../phase-plan/SKILL.md)** (kinds of change, PR count band, sequencing / coupling, routing recommendation, confidence) — from the same inputs you will use in step 5a (Master: §§ 4–5; Phase: §§ 2–4). Then **`StrReplace`** insert the full **`### Decomposition assessment`** block **immediately above** the dual-title heading (`## 6. …` or `## 5. …`):
   - Use a unique `old_string` anchor of the form `## <N>. Delivery phases \| PR breakdown\n\n_TBD_` **or** `## <N>. PR breakdown\n\n_TBD_` (match the file exactly — include the chosen heading line).
   - `new_string` is: `### Decomposition assessment` + blank line + bullet lines + blank line + the same `## <N>. …` heading + `\n\n_TBD_`.

Do **not** remove an existing assessment authored by **`phase-plan`** / **`master-plan`** unless the **developer** asked to replace it.

## Step 4 — Decision gate (when the heading is still `Delivery phases | PR breakdown`)

Run this step **only** when the dual-title heading is still the **dual** form and the list body is `_TBD_` (after step 3.5).

Use the **AskQuestion** tool (or an equivalent numbered choice) to ask:

> How should this plan recurse next? Use **`### Decomposition assessment`** as the default if you agree with it.

**Three options (required):**

- **Delivery phases** (`id: delivery_phases`) — child entries are phase plans; the **`delivery-phases`** protocol branch owns that decomposition path.
- **PR breakdown — multiple PRs** (`id: pr_breakdown_multi`) — PR-ready; two or more executor-ready PRs.
- **PR breakdown — single PR** (`id: pr_breakdown_single`) — PR-ready; **one** numbered item in **`### PR list`** (then **`new-plan`** indexed item **1** creates the single child; **`pr-plan`** when available).

If the developer picks **`delivery_phases`**, **stop** with: *"Use the **`delivery-phases`** protocol branch on this plan — it sets the heading to **`Delivery phases`** and drafts the numbered list of child phases per the doc."* Do not draft anything in this skill; do not change the heading here.

If the developer picks **`pr_breakdown_multi`** or **`pr_breakdown_single`**, continue to step 5. Treat **`pr_breakdown_single`** as routing to **step 5s**; **`pr_breakdown_multi`** runs **5a–5d** with **K ≥ 2** expected (**K = 1** only on the single-PR path from step 4, or when step 4 was skipped and assessment forces one PR — see step 5).

## Step 5 — Draft the three sub-sections

The output is the three set-level sub-sections from **development-process.md** § 3: **`### Single-concern strategy`**, **`### Sequencing`**, **`### PR list`**.

**Routing:**

- If step 4 chose **`pr_breakdown_single`**, jump to **step 5s** — skip the multi-PR branch of 5a.
- If step 4 was **skipped** (heading already **`PR breakdown`**) and **`### Decomposition assessment`** recommends **single-PR** **`PR breakdown`**, use **step 5s** unless prior mission context explicitly demands multiple PRs — **flag** if you override the assessment.
- Otherwise use **5a–5d** for **multi-PR** decomposition (typical **K = 2–5**).

### 5a — Infer PR boundaries from the parent plan

Read the target plan’s earlier sections:

- **Master Plan:** § 4 Architectural design + § 5 Changes (including **`### Decomposition assessment`**, when present).
- **Phase plan:** § 2 Scope + § 3 Code design + § 4 Changes (including **`### Decomposition assessment`**, when present).

Pick PR boundaries that respect Strategy #6 (single concern per deliverable) and Strategy #4 (small chunks, fast to production):

- A PR is the **smallest deliverable unit** of this plan — one concern, one purpose, one reason to change. If two concerns are tempting to bundle, split them.
- PRs are ordered when there is a real sequencing constraint (schema migration before consumers; feature flag before code that reads it; contract change before UI that consumes it). Otherwise they can run in parallel.
- Aim for **2–5 PRs** in a typical multi-PR pass. **Exactly one PR** is a **first-class** outcome — use **step 5s** or **`pr_breakdown_single`**; do **not** treat it as an error. More than ~6 PRs usually means the plan should have stayed at **`Delivery phases`** first — **flag** when you proceed anyway.
- Each PR must be **shippable on its own** (Strategy #4): merging it should leave the system in a working state. Flag non-obvious reliance on flags, additive schema, or compat layers per PR.
- **Size each candidate PR by test-case count, not by lines.** For each PR under consideration, estimate **test cases** it introduces or meaningfully changes — unit + integration / snapshot + exploratory recordings, each enumerated case counted once. Buckets per [`efficient-pr-shipping.mdc`](../../../rules/efficient-pr-shipping.mdc) § *Keep PRs small and focused*: **≤ 10** simple, **11–20** mid-sized, **21+** heavy. Heavy is a signal to **investigate** splitting — not automatically wrong. Do not split within one **kind** of change (instance batching). Raw changed-line count is **not** a size signal.
- **Kinds-of-changes lens.** Count **distinct kinds** — N instances of the same shape across N files is one kind. **A reviewer agent** reads the first instance carefully and skims the rest. Split only when each half ships value on its own.

### 5b — Draft each sub-section per the doc’s § 3 set-level template

Apply **development-process.md** § 3 *Set-level template* literally. The three sub-sections, in order:

#### `### Single-concern strategy`

One or two sentences on how this plan keeps each PR single-concern (Strategy #6). Tailor when the split is non-obvious. Optional short bullets (short-bullet rule) for tempting bundles you split; skip when the sentence is enough.

#### `### Sequencing`

How PRs relate in time — bullet list by stage and/or a small Mermaid `graph LR` when dependencies are non-trivial. Labels must match bolded titles in **`### PR list`**.

#### `### PR list`

A **short numbered list** — one item per PR, in roughly **`### Sequencing`** order. Each item line: PR **slug or short title**, **bolded**, so the **`new-plan`** protocol branch (indexed spawn) can derive the child name (see **`new-plan`** § *Indexed child spawn*). Under each item, two nested sub-bullets:

- **Single concern.** One-line proto-§ 1 summary (full prose; carved out of the short-bullet rule).
- **Plan.** A **`Plan:`** line whose placeholder **matches the parent file’s existing shape** when present; otherwise state the child file is pending after **`new-plan`** indexed spawn for this list item **N**. The relative Markdown link is filled when **`new-plan`** creates the child and updates the parent; **`plan-reconcile`** can repair wiring.

Optional: one short intro under `## <N>. PR breakdown` before **`### Single-concern strategy`** when framing helps; skip when unnecessary.

### 5s — Single PR (set-level)

Use when step 4 returned **`pr_breakdown_single`**, or when step 4 was skipped and **`### Decomposition assessment`** clearly recommends **single-PR** **`PR breakdown`**.

Draft the same three sub-headings, but:

- **`### Single-concern strategy`:** one or two sentences — the whole plan ships as **one** mergeable unit.
- **`### Sequencing`:** one short bullet such as *Single PR — no sibling ordering.*
- **`### PR list`:** **Exactly one** numbered item (`1. **<slug>**`). Derive **`<slug>`** from frontmatter `name:` or the plan title. **Single concern** sub-bullet = full proto-§ 1 for the whole change. **Plan:** same placeholder contract as **5b** for item **1**.

Then run **5c** with **K = 1**.

### 5c — Write to the parent plan

Use `StrReplace` to mutate **only** the dual-title section (the `## <N>. Delivery phases | PR breakdown` or `## <N>. PR breakdown` heading **and** the `_TBD_` or empty body **directly under it**). Do **not** delete **`### Decomposition assessment`** when it sits **above** that heading.

Replace:

- The heading: `## <N>. Delivery phases | PR breakdown` → `## <N>. PR breakdown` (`<N>` is **6** for Master Plan, **5** for Phase plan).
- The body: `_TBD_` → optional intro + the three sub-sections from **5b** or **5s**.

**Bold** the PR slug on each item’s first line. Keep slugs short (about 2–5 words; kebab-case or `snake_case` per repo habit).

If the section is **partially drafted**, replace only still-`_TBD_` sub-sections — preserve the **developer**’s existing text unless they ask to revise it.

Do **not** modify any other section in the same call.

After writing, read the file back and confirm the section reads as intended.

### 5d — Echo to chat

Echo the drafted section so the **developer** can review without opening the file. Mirror headings and lists. Render Mermaid from **`### Sequencing`** inline as a fenced code block when present.

## Step 6 — Hand back with next-move options

End with:

1. A **`file://`** link to the target `.plan.md` under `.sedea/operations/.../plans/...` (resolved path from **`plan-state resolve`** or equivalent).
2. A one-line summary: *Drafted `## <N>. PR breakdown` with **K** PR rows.*
3. **Numbered options** (adapt labels; offer **AskQuestion** when it clarifies). After drafting **K** PRs, keep **K** visible in the summary.

   1. **Spawn PR children (`new-plan`, indexed)** — For each list index **1** through **K**, the **initiating agent** ignites **`new-plan`** with this plan as parent and that index (per **`new-plan`** § *Indexed child spawn*). Each run creates the child stub and wires the parent **`Plan:`** line when the flow completes.
   2. **`pr-plan` on a new child** — After each PR plan stub exists, ignite **`pr-plan`** on that path to draft per-PR §§ 1–4 (per **`new-plan`** populator handoff).
   3. **Revise this `PR breakdown` section** — The **developer** gives free-text feedback; you apply one focused `StrReplace` and echo the result.
   4. **Switch to `delivery-phases`** — If the work needs a phase layer first, hand off to **`delivery-phases`**; do **not** rewrite the parent heading from inside this skill — that protocol branch owns the **`Delivery phases`** heading and list.
   5. **Commit when ready** — Remind the **developer** to commit; this skill does **not** run `git`.

Re-offer the same structure after iteration. **Stop** after this block — wait for the **developer**’s next message. Do **not** run **`new-plan`** or **`pr-plan`** inside this turn unless mission dispatch explicitly continues.

## Step 6a — Follow-up turns

When the **developer** asks to revise the **`PR breakdown`** block, re-read that section, apply edits via `StrReplace`, echo the result, and return to the step 6 menu pattern.

When they choose spawn or populate children, that work runs under **`new-plan`** / **`pr-plan`** in a **separate** protocol step — do not impersonate those skills’ full procedures in the same turn.

## One primary choice per turn — surface observations

Match the discipline in **`master-plan`**, **`delivery-phases`**, and **`phase-plan`**: perform exactly what was chosen; do not silently expand scope. If you notice gaps (Changes bullets that do not map to a PR, sequencing tension, assessment vs draft mismatch), list short **numbered observations** in the chat reply. Do **not** invent typed shortcut vocabularies for accepting or skipping flags.

## Scope guard

**Owns:** the parent plan’s dual-title **`PR breakdown`** section (heading + set-level body); **step 3.5** may insert **`### Decomposition assessment`** above that heading when missing; echo for review.

**Out of scope:** spawning child plans (**`new-plan`**); per-PR §§ 1–4 (**`pr-plan`**); later per-PR sections and worktrees (**`coding-session`**, **`plan-reconcile`** per **`development-process.md`**); edits outside the dual-title block (except the assessment insert in **3.5**); `git` / commit automation; **`Delivery phases`** list body (**`delivery-phases`**); roadmap topics and PR plans (step 1 stops).

Stop after the step 6 handoff block.
