---
name: pre-pr-review-emit
description: >-
  Protocol branch pre-pr-review-emit: **a coding agent** curates a seed prompt so
  a new session can run as **a pre-PR reviewer agent** (see **pre-pr-review-run**).
  Anchors plan or free-form; no substantive review here — emit and stop. Mission
  dispatch, natural language, or explicit handoff request — not legacy shortcuts.
---

# `pre-pr-review-emit`

**Who runs this:** **a coding agent** in the same session where implementation happened (typically after **`coding-session`** work). This skill **does not** perform the unbiased pre-PR review — it only **emits** a copy-pasteable seed for a **new** session.

**Who runs next:** In that new session, **a pre-PR reviewer agent** follows **`.sedea/centers/sedea-centers--development/missions/plan-and-deliver/skills/pre-pr-review-run/SKILL.md`** (loaded from the seed below). See **`.sedea/centers/sedea-centers--development/docs/development-process.md`** § *Pre-PR reviewer agent*.

The substantive pass complements — it does **not** replace — **a reviewer agent** on the GitHub PR surface.

**Anchors (Sedea v1):** **`plan`** (per-PR plan under **`.sedea/operations/…/plans/`**) or **`free-form`** (diff-only). There is **no** third-party issue-tracker anchor in this generation.

**Normative paths:** Hosting repo root = parent of **`.sedea/`**. Plans and sidecars live only under **`.sedea/operations/joint/plans/`** and **`.sedea/operations/<operations-user-id>/plans/`** (literal **`joint`** in the path; **operations user id** is opaque — see **`plan-state.mjs --help`** for scope flags). Resolve plans with **`resolve`**, sidecar **`worktrees` / `session`**, or explicit user paths.

## `plan-state.mjs` (hosting repo)

From the **hosting repo root**, use **direct `node`** (editor-bundled runtime — same as **`plan-reconcile`**):

```bash
node .sedea/centers/sedea-centers--development/missions/plan-and-deliver/scripts/plan-state.mjs <subcommand> …
```

Optional global scope **before** the subcommand: **`--operations-user-id <id>`**; else **`.sedea/local/operations-user-id`**; else **`git config --local sedea.operationsUserId`**. See **`plan-state.mjs --help`**.

## Git commit and push

**A coding agent** does **not** run **`git commit`** or **`git push`** unless the **developer** explicitly asks for that in the message that authorizes the action. **A coding agent** therefore **never** silently commits as a “shortcut.” The **cut point** is: **developer** reviews in the IDE → approves what ships → **a coding agent** (or the user) creates the commit under that explicit direction → **then** emit the seed so **a pre-PR reviewer agent** sees the same **committed** diff the PR surface will see.

## When to trigger

- **Mission dispatch** for protocol branch **`pre-pr-review-emit`**, natural language (**pre-PR review handoff**, **emit pre-PR review seed**, …), or an explicit user request to prepare the **pre-PR reviewer agent** prompt.
- Do **not** use this skill in the **new** session that will perform the review — that session uses **`pre-pr-review-run`** with the pasted seed.

## Step 1 — Worktree, branch, base, anchor, plan

1. **Worktree** — `pwd` from the active workspace folder (absolute path).
2. **Branch** — `git branch --show-current`.
3. **Base** — default **`origin/main`** (or the repo’s agreed default); confirm if unclear.
4. **Anchor type**
   - Start as **`plan`** unless the user explicitly chose **no plan** in this flow.
   - If plan resolution fails and the user confirms they want a diff-only pass, set **`free-form`**.
5. **PR plan** *(when anchor = `plan`)* — resolve in order:
   1. From **hosting repo root**:  
      `node .sedea/centers/sedea-centers--development/missions/plan-and-deliver/scripts/plan-state.mjs resolve --cwd "<worktree-abs>"`  
      (prepend **`--operations-user-id …`** when your scope requires the per-user tree). Exit **0** prints **`<slug>	<planPath>`** with an absolute **`.sedea/operations/…/plans/<slug>.plan.md`** path.
   2. If exit **2**, optionally use an absolute **`.plan.md`** path only when the open file is a **per-PR** plan (body has **`## Single concern`** or **`## 1. Single concern`** …).
   3. If still unresolved, ask for a slug, absolute plan path, or **`none`** → downgrade anchor to **`free-form`**.
   4. If **`resolve`** failed but the user expected linkage, point them at **`coding-session`** (**`set-worktrees` / `set-session`**) so the next **`resolve --cwd`** succeeds.
6. **Diff sanity** — `git status --short` and `git log --oneline <base>..HEAD`. If there is **no** reachable diff (**0** commits ahead **and** clean tree), stop: nothing to review.

## Step 2 — Committed diff only (no silent commit)

**a pre-PR reviewer agent** uses **`git diff <base>...HEAD`**. Uncommitted edits are **invisible** to that surface.

- If **`git status --short`** is **non-empty**, **stop** and explain: **a coding agent** does not commit without an explicit request from the **developer**. Ask the user to **review in the IDE**, then either commit themselves or **explicitly** direct **a coding agent** to create the cut-point commit, then re-run **`pre-pr-review-emit`**.
- If the tree is **clean**, acknowledge the cut point and continue.

## Step 3 — Project rules list

Use **`git diff --name-only <base>...HEAD`** (or `HEAD` vs base) to pick **`.cursor/rules/*.mdc`** files in the **worktree** whose scope intersects the diff. Always include repo baseline rules your team treats as mandatory. For **`plan`** anchor, include any **plan-editing / fence** hygiene rules your product repo documents (often under **`.cursor/rules/`**). Paths in the seed must be **absolute** under the worktree (and home-expanded only when a rule truly lives outside the clone). De-duplicate; order baseline → area → tests/deploy when touched.

## Step 4 — Emit seed and stop

Output **one** outer **four-backtick** fence so inner triple fences stay copy-safe. Pick **Plan** or **Free-form** template. After the fence, one line: open a **new** session, paste the seed, and ensure that session loads **`pre-pr-review-run`**. **Stop** — do not run review categories here.

**Run skill path** (must appear inside the seed so **a pre-PR reviewer agent** loads the correct doc):

`.sedea/centers/sedea-centers--development/missions/plan-and-deliver/skills/pre-pr-review-run/SKILL.md`

### Plan-anchor seed template

`````markdown
````text
Pre-PR reviewer agent — plan: <slug>

### Inputs

- **Anchor type:** `plan`
- **PR plan:** `<absolute-path-to-.plan.md>`
- **Worktree:** `<absolute-worktree-path>`
- **Branch:** `<branch>` (base: `<base-ref>`)
- **Diff scope:** `git diff <base-ref>...HEAD` (`<K>` commits, `<N>` files, `<+/- lines>`). Working tree clean.

### Project rules (read during warm-up)

<absolute `.mdc` paths — one bullet per line>

**Warm-up — finish before scoring**

1. **Fresh session:** Turn 1; no prior tool calls in this chat from **a coding agent** working this branch.
2. **Standards:** Read **`.sedea/centers/sedea-centers--development/docs/development-process.md`** (at least *Planning modes* → per-PR template + *Cadence* follow-up discipline).
3. **Project rules:** Read every path above.

---

You are **a pre-PR reviewer agent** (see **development-process.md** § *Pre-PR reviewer agent*). Anchor **`plan`**. Load and follow **`.sedea/centers/sedea-centers--development/missions/plan-and-deliver/skills/pre-pr-review-run/SKILL.md`** — all steps in that skill.

After that skill’s Step 7 (report + protocol-branch menu + coding agent handback), **stop**.
````
`````

### Free-form seed template

`````markdown
````text
Pre-PR reviewer agent — free-form

### Inputs

- **Anchor type:** `free-form`
- **Worktree:** `<absolute-worktree-path>`
- **Branch:** `<branch>` (base: `<base-ref>`)
- **Diff scope:** `git diff <base-ref>...HEAD` (`<K>` commits, `<N>` files). Working tree clean.

### Project rules (read during warm-up)

<absolute `.mdc` paths>

**Warm-up**

1. Fresh session check.
2. **development-process.md** (skim *Strategy* / *Cadence* context for PR hygiene).
3. Read listed rules.

---

You are **a pre-PR reviewer agent**. Anchor **`free-form`**. Load **`.sedea/centers/sedea-centers--development/missions/plan-and-deliver/skills/pre-pr-review-run/SKILL.md`** — all steps in that skill.

After that skill’s Step 7, **stop**.
````
`````

## Scope guard

**a coding agent** using this skill: chat output + optional `git status` / `git log` / `git diff` inspection only; **no** commit/push unless the **developer** explicitly asked **a coding agent** to do so in the same message. **No** review scoring and **no** edits to **`## Follow-ups`** here — that belongs in **`pre-pr-review-run`**.

Stop after the fenced seed.
