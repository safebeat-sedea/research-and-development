---
name: pre-pr-review-run
description: >-
  Pre-PR reviewer agent (fresh session only): parse seed from pre-pr-review-emit,
  load anchor plan or free-form diff, score categories, follow-ups, go/no-go,
  coding agent handback. Not a separate public protocol — invoked via emitted seed.
---

# `pre-pr-review-run`

**Who runs this:** **a pre-PR reviewer agent** in a **new** session — no carry-over from **a coding agent** (see **`.sedea/centers/sedea-centers--development/docs/development-process.md`** § *Pre-PR reviewer agent*).

**How you get here:** The user pastes the seed produced by **`pre-pr-review-emit`** (protocol branch **`pre-pr-review-emit`**). The first line of that seed is the anchor line parsed below.

This pass complements — it does **not** replace — **a reviewer agent** on the GitHub PR surface.

## When to trigger

- First user message matches **`Pre-PR reviewer agent — `** plus **`plan: <slug>`** or **`free-form`**, and this is **turn 1** (no prior assistant turns).
- If the message does not match, **stop** — open **`pre-pr-review-emit`** from **a coding agent** session to obtain a valid seed.

## Step 0 — Parse seed line

The first line must be **`Pre-PR reviewer agent — `** followed by the anchor:

- **`Pre-PR reviewer agent — plan: <slug>`** → **`plan`** (slug is diagnostic; path is in **### Inputs**).
- **`Pre-PR reviewer agent — free-form`** → **`free-form`**.
  Malformed → **stop** and ask **a coding agent** to re-run **`pre-pr-review-emit`**.

## Step 1 — Fresh session

Turn 1 only; no prior assistant edits in this worktree. Otherwise **stop**.

## Step 2 — Load `development-process.md`

Read **`.sedea/centers/sedea-centers--development/docs/development-process.md`** (full file preferred). Per-PR template categories and **Code Review Follow-ups** discipline come from there.

## Step 3 — Load anchor

- **`plan`** — Read the **absolute** PR plan path from the seed. Verify per-PR template (§§ **1–7** required; § **8** optional; **`## Follow-ups`** may exist). If the file is a **Master** or **Phase** plan template, **stop** and ask for the correct PR plan or **`free-form`**.
- **`free-form`** — No plan file; diff only.

## Step 4 — Read the diff

From the worktree:

```bash
cd "<worktree>"
git fetch origin …   # when needed so <base-ref> resolves
git diff --stat <base-ref>...HEAD
git log --oneline <base-ref>..HEAD
git diff <base-ref>...HEAD
git status --short
```

If the tree is dirty post-seed, **FLAG** under **General code quality** that the committed snapshot may not match local edits; continue against **`<base-ref>...HEAD`**.

## Step 5 — Categories

Verdict per row: **`PASS`**, **`FLAG`**, or **`FAIL`**. **`FAIL`** = blocker before merge.

### `plan` anchor — A–J

| Cat | Focus |
| --- | --- |
| **A** | § **1 Single concern** ↔ diff scope creep |
| **B** | § **2 Background** completeness for a cold reader |
| **C** | § **3 Change scope** ↔ diff (bidirectional) |
| **D** | § **4 Reasoning** (*why* + *considered & rejected*) |
| **E** | § **5 Repo rules impact** ↔ diff and listed rules |
| **F** | § **6 Tests to write** ↔ tests in diff |
| **G** | § **7 Deploy test plan** still accurate vs change |
| **H** | § **8 Caveats** vs surprises in diff |
| **I** | **Repo-rule compliance** — audit each loaded **`.mdc`** against the diff (naming, layering, errors, migrations, …). This is the substantive rules pass for this protocol; there is **no** separate mechanical shortcut skill in Sedea v1. |
| **J** | **General code quality** — correctness, edge cases, perf, validation |

### `free-form` anchor — F1–F3

| Cat | Focus |
| --- | --- |
| **F1** | Single concern inferred from commits + paths |
| **F2** | Repo-rule compliance (same rubric as **I**) |
| **F3** | General code quality (same rubric as **J**) |

## Step 6 — `## Follow-ups` (**`plan`** only)

For actionable **`FLAG`**s that are not **`FAIL`**, append **one-sentence bullets** to **`## Follow-ups`** with bracketed category tags (e.g. **`[C § 3]`**). Optional **`(target: …)`** routing hints. Do **not** append **`FAIL`** items here — those belong in the report blockers list. Create **`## Follow-ups`** at EOF if missing. **`free-form`:** skip file writes.

## Step 7 — Report, menu, coding agent handback

### Report tables

Use the anchor’s category rows. Include **Blockers (`FAIL`)**, **Flags** (plan: bullets appended; free-form: report-only), **Recommendation** (**go** iff no **`FAIL`**).

### After-review menu (protocol branches only)

End with a short menu — **names only**, no legacy tokens:

- **`create-pr`** — when the recommendation is **go** and the next step is commit / push / PR description work; follow **[`efficient-pr-shipping.mdc`](../../../../rules/efficient-pr-shipping.mdc)** by **section titles** (for example the section that describes **commit, push, optional PR comment reconciliation**, and PR linkage), not shorthand tokens.
- **`coding-session`** — return to the worktree where **a coding agent** is implementing, to fix **`FAIL`** items.
- **`pr-review`** — when a PR already exists and GitHub comment triage is next.
- **`plan-reconcile`** — merge-driven archive + follow-ups triage cadence.
- **`split-to-prs`** — when the review concludes the change should be split for **Strategy #6** (single concern).

Offer **`AskQuestion`** if the user should pick among multiple valid next moves.

### Coding agent handback (mandatory last section)

After the menu, output **`## Prompt for implementation chat (coding agent handback)`** plus **one** fenced block (**plain text** inside) for pasting back into the session with **a coding agent**. Use this **order**:

1. **Recommendation** — **go** / **no-go**.
2. **Primary focus** — next goal; what is **out of scope** for this turn.
3. **Positives** — explicitly *not* change requests.
4. **Negatives / risks** — not **`FAIL`**; tag each *code* / *verify* / *docs+plan*.
5. **Todos** — lines prefixed **`[Must]`**, **`[Should]`**, **`[Defer]`**.
6. **No-gos / blockers** — each **`FAIL`** with location + fix definition; or *No blockers.*
7. **Guardrails** — e.g. do not “fix” positives; **`Must`** before **`Should`** before **`Defer`**; stay inside single concern; if **no-go**, do not treat as merge-ready until **`Must`** clears (then **a coding agent** re-runs **`pre-pr-review-emit`**).
8. **Expected actions** — numbered checklist; first item matches **Primary focus**.

**a pre-PR reviewer agent** **does not** run **`git`**, **`gh`**, or open PRs — **a coding agent** in their session owns execution.

## Step 7a — Follow-up turns

On natural-language requests to **deepen one category**, re-read the plan section / diff slice, update verdicts and (**`plan`**) **`## Follow-ups`**, and emit a **fresh** handback block.

## Scope guard

**a pre-PR reviewer agent** using this skill: edits **only** **`## Follow-ups`** on the PR plan when anchor = **`plan`**; never mutates §§ **1–8** body; never edits source files in the worktree.

Stop after handback (or after a follow-up turn that ends with a fresh handback).
