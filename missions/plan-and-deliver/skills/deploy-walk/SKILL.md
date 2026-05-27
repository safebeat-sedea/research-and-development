---
name: deploy-walk
description: >-
  Walk through a PR plan's `## N. Deploy test plan` section one step at a time —
  present each `[ ]` step in detail (verbatim text + the *because* + expected
  outcome + commands / cross-references), wait for the user's report, flip
  `[ ]` → `[x]` and append a dated resolution note, advance to the next step.
  Three-state lifecycle (`drafted` → `deployed` → `done`) is recorded in a
  `**Status:**` line at the top of § N so the auto-routing of `deploy-walk present <N>`
  knows whether to land in `### Before deploy` or `### After deploy` without
  the user spelling it out. When Status reaches `done`, frontmatter todo
  `deploy-test-plan-verified` flips `pending` → `done` in the same turn (see
  *Frontmatter capstone*). Does **not** auto-run **plan-reconcile**. Loose mode by design: between `deploy-walk present <N>` and
  `deploy-walk <N> done` / `skip` / `block`, the chat is normal collaboration — the
  agent answers questions, runs commands, debugs; the bracketing is the only
  signal that matters. State lives in the plan file, not in chat memory, so
  walks survive multi-day gaps and session summarization. **Cross-skill:** when another skill (for example **`coding-session`**) receives ad-hoc “step *N* confirmed” for §7, it must apply the same plan-file update rules here — or the developer should invoke **`deploy-walk <N> done`**. Ambiguous targets or
  command mappings use **AskQuestion** (not freeform guessing). Use when the user
  says `deploy-walk present <N>`, `deploy-walk <N> done [: <note>]`, `deploy-walk <N> skip: <reason>`,
  `deploy-walk <N> block: <reason>`, `deploy-walk deployed [: <note>]`, or `deploy-walk status`.
inputs:
  targetPlanPath:
    type: string
    description: Absolute PR plan path containing the deploy test plan.
    required: true
  targetPlanSlug:
    type: string
    description: PR plan slug.
    required: true
  prUrl:
    type: string
    description: GitHub PR URL that was merged.
    required: false
  prNumber:
    type: number
    description: GitHub PR number that was merged.
    required: false
  repoUrl:
    type: string
    description: Git repository URL.
    required: false
  branchName:
    type: string
    description: Branch that produced the PR.
    required: false
  mergeSha:
    type: string
    description: Merge commit SHA for deployment verification.
    required: false
  mergedAt:
    type: string
    description: Timestamp when the PR merged.
    required: false
  ledgerParent:
    type: string
    description: Ledger parent slug/path copied from create-pr.
    required: false
  upstreamSkill:
    type: string
    description: Skill that spawned deploy verification, usually create-pr.
    required: false
warmUpRules:
  - ".sedea/centers/research-and-development/missions/plan-and-deliver/plan.mdc"
  - ".sedea/centers/research-and-development/missions/plan-and-deliver/skills/README.md"
  - ".sedea/centers/research-and-development/docs/development-process.md"
  - ".sedea/centers/research-and-development/rules/20_efficient-pr-shipping.mdc"
  - ".sedea/centers/research-and-development/rules/30_planning-target-resolution.mdc"
---

# Deploy walk-through

This skill drives the **per-step deploy verification loop** for a PR plan's `## N. Deploy test plan` section (the per-PR template's § 7, or § 6 in legacy 7-section per-PR plans). Each numbered step in `### Before deploy` and `### After deploy` is a **GFM task list checkbox** (`1. [ ] ...`); the **developer** works through the list one box at a time, **a coding agent** provides the per-step context, the **developer** reports the outcome, the agent flips the box and appends a dated resolution note.

When spawned by **`create-pr`**, this skill is the **deploy-walk agent** for a merged PR. It owns deploy verification status and reports it upstream; it does not run implementation, PR review, or plan reconciliation.

## Not chained to `plan-reconcile`

**This skill never invokes `plan-reconcile`.** Capstone todo **`deploy-test-plan-verified`** → `done` closes the **deploy checklist only** — not archive, not parent-plan reconcile.

| Agent mistake | Correct action |
|---------------|----------------|
| Treat deploy walk `done` as permission to archive the plan | Tell the developer to start **`plan-reconcile`** separately (phrase, dispatch, or **`create-pr`** reconcile choice after merge) |
| Emit **`AGENT_RUN_REQUEST_V1`** for **`plan-reconcile`** from this lane | **Forbidden** — hand off in prose only |

Canonical: **`.sedea/centers/research-and-development/rules/20_efficient-pr-shipping.mdc`** § *deploy-walk vs plan-reconcile (not chained)*.

## Entry points

Canonical table: **`.sedea/centers/research-and-development/docs/development-process.md`** § *Ship chain* → **`deploy-walk` entry points**.

| How it starts | Lane |
|---------------|------|
| Developer phrase (`deploy-walk present <N>`, status, done/skip/block) | Detached |
| **`create-pr`** after merge — developer chooses **Start deploy verification now** | Spawned child (`upstreamSkill: create-pr`) |
| Direct skill dispatch with `targetPlanPath` / slug | Detached |

Run after the PR is **merged** (or the plan's target env is ready). Completing this walk does **not** start **`plan-reconcile`** — reconcile is a separate developer or **`create-pr`** follow-on when merge/archive triage is needed.

The skill is **loose mode by design**. Between `deploy-walk present <N>` (which presents step N) and `deploy-walk <N> done` / `skip` / `block` (which closes step N), the chat is **normal collaboration** — the **developer** can ask any question, request the agent run a command, paste log output, debug, take a break, switch tasks. The bracketing tokens (`deploy-walk present <N>` / `deploy-walk <N> done`) are the only signals this skill cares about; everything in between is whatever the **developer** needs.

**State lives in the plan file, not in chat memory.** The skill re-reads the plan on every command. A walk that started yesterday, was interrupted by 30 other turns, and resumed today still works — the agent finds the same `[ ]` boxes and the same `**Status:**` line.

The procedure below is a hard contract — do **not** skip steps, infer state from chat memory, or auto-advance to the next step without the **developer** explicitly invoking `deploy-walk present <next>`.

## Trigger

| Command | Action |
|---|---|
| `deploy-walk present <N>` | Present step N of the active sub-section in detail. Sub-section is auto-resolved from the **`**Status:**`** line: `drafted` → `### Before deploy`; `deployed` → `### After deploy`; `done` → all-checked summary. |
| `deploy-walk present before <N>` / `deploy-walk present after <N>` | Same, with the sub-section forced explicitly. Always works regardless of status — the explicit out-of-order escape hatch. |
| `deploy-walk present <slug> <N>` (or with `before` / `after`) | Same, with the target plan named explicitly. Use when chat context spans multiple PR plans. |
| `deploy-walk <N> done` | Flip step N's `[ ]` → `[x]`, append `*(YYYY-MM-DD: done.)*`, advance hint to step N+1. |
| `deploy-walk <N> done: <note>` | Flip + append `*(YYYY-MM-DD: <note>)*` (period at end of note is the agent's responsibility). |
| `deploy-walk <N> skip: <reason>` | Flip + strike-through step text + append `*(YYYY-MM-DD: Skipped — <reason>)*`. The strike is GFM `~~text~~`. |
| `deploy-walk <N> block: <reason>` | **No flip** — box stays `[ ]`. Append `*(YYYY-MM-DD: Blocked — <reason>)*` after the step text. |
| `deploy-walk deployed` | Flip `**Status:**` from `drafted` → `deployed`, append `*(YYYY-MM-DD HH:MM: deployed.)*` to the history. |
| `deploy-walk deployed: <note>` | Same + append the note. |
| `deploy-walk status` | Read-only one-line summary: status, Before X/Y, After X/Y, last transition date. No edits. |

Free-form English equivalents (e.g. *"step 3 done — staging green"*, *"actually skip step 4, the regression suite covers it"*) are interpreted by the agent into one of the canonical commands above; the agent confirms the interpretation in one line *before* applying the edit. If the interpretation is ambiguous, use **AskQuestion** with concrete options instead of guessing.

The agent **never auto-advances**. After `deploy-walk <N> done`, the confirmation reply names the next step but waits for the **developer** to invoke `deploy-walk present <next>` explicitly.

## Step 1 — Resolve the target plan

The target is a `.plan.md` file under the **`.sedea/operations/`** plan union with a `## N. Deploy test plan` section. Resolve it from chat context per [`30_planning-target-resolution.mdc`](../../../../rules/30_planning-target-resolution.mdc) § *Resolution order*, with **one additional filter**: only consider plans whose body has `## N. Deploy test plan` *and* a `**Status:**` line.

Resolution order (highest confidence first):

1. **Explicit slug in the command.** `deploy-walk present 1_server_side_preview_endpoint_f4fe9ae9 3` — use the named slug verbatim (with or without the `_<hex>` suffix; match against `name:` frontmatter or filename stem).
2. **Mid-walk continuation.** Same chat already invoked `deploy-walk present <M>` against a specific plan; continue with that plan unless the **developer** names a different one.
3. **Most recent agent recommendation.** The agent's last turn proposed a **deploy-walk** step command against a specific plan (e.g. *"Reply `deploy-walk present 4` when ready"*).
4. **Single candidate in chat context.** Exactly one PR plan was read / referenced in the recent chat window — use it.
5. **Multiple candidates.** Stop and use **AskQuestion** listing PR plans with at least one unchecked `[ ]` in their `## N. Deploy test plan`. The **developer** picks; subsequent commands stick with that plan.
6. **No candidate.** Stop with: *"**deploy-walk** needs a target PR plan. Per **planning-target-resolution**, emit a fresh "Where we are now in the plan tree" snapshot (information-only), then collect the lane pick via **AskQuestion** or **`MC_ASKQUESTION_V1`** (§ *Sedea input channel*), then re-invoke."*

The IDE focused-file list (host-injected **open and recently viewed files** metadata) is **not** consulted.

Acknowledge the resolved target in one line: *"Target plan: `{slug}` (resolved from {source})."*

## Step 2 — Read § N Deploy test plan and parse the lifecycle

Read the target plan in full (`Read` tool, no offset, no limit) and locate its Deploy test plan section. Match by **name**, not number — both `## 7. Deploy test plan` (current per-PR template) and `## 6. Deploy test plan` (legacy 7-section per-PR plans) are valid section numbers; the skill is agnostic.

Inside the section, parse:

1. **`**Status:** {state} *(YYYY-MM-DD: ...)* …`** — the lifecycle line. State must be `drafted`, `deployed`, or `done`. History entries are appended over time as italic-parenthetical notes; do not strip them.
2. **`### Before deploy`** — numbered `1. [ ] …` / `1. [x] …` task list.
3. **`### After deploy`** — same shape.

Sub-section heading inference, when not pinned by the command:

| Status | Active sub-section |
|---|---|
| `drafted` | `### Before deploy` (advance to `### After deploy` only via `deploy-walk present after <N>` explicit override). |
| `deployed` | `### After deploy`. |
| `done` | All-checked. `deploy-walk present <N>` returns the summary, no edit. |

If the **Status:** line is missing (legacy plan or not yet swept to the new convention), fall back to the heuristic: any `[ ]` in `### Before deploy` → Before; else After. Surface this as a flag in the agent's reply: *"Plan lacks the `**Status:**` lifecycle marker. Falling back to checkbox heuristic. Add `**Status:** drafted *(YYYY-MM-DD: PR plan drafted.)*` above `### Before deploy` to enable status-aware routing — this is what the **`pr-plan`** protocol branch template emits for new plans."*

If the Deploy test plan section uses **dash bullets** (`- ...`) instead of numbered task list (`1. [ ] ...`), stop with: *"`{slug}`'s § N Deploy test plan uses dash bullets, not the GFM task list contract this skill expects (`1. [ ] ...`). Convert the section to numbered checkboxes (one-time sweep) before invoking **deploy-walk**. The **`pr-plan`** template emits the right shape for new plans."*

## Step 3 — Branch by command and execute

Each command has its own contract. Execute the matching branch, then stop and wait for the next user message.

### `deploy-walk present <N>` — present step N

Find the Nth numbered item in the active sub-section (regex `^N\. \[[ x]\] `). Then:

- If the box is already `[x]`, reply: *"Step N is already checked: \"{verbatim step line}\". To re-walk it explicitly, reply `deploy-walk present before <N>` or `deploy-walk present after <N>`. Otherwise, reply `deploy-walk present <N+1>` to continue."*
- If the box is `[ ]` and has a prior `*(YYYY-MM-DD: Blocked — {reason})*` annotation, surface it: *"Previously blocked: {reason} (YYYY-MM-DD). Has the blocker cleared?"* Then continue with the regular presentation.
- If the box is `[ ]` and clean, present per § *Step 4 — Step presentation contract*.

### `deploy-walk <N> done` / `deploy-walk <N> done: <note>` — flip box, advance hint

`StrReplace` to flip:

- `old_string`: `{line N verbatim}` (the entire line, e.g. `1. [ ] Confirm staging is healthy.`).
- `new_string`: `{line N with [ ] → [x] and the note appended}` (e.g. `1. [x] Confirm staging is healthy. *(2026-05-14: staging green, no alerts pending.)*`).

If `{note}` is omitted in `deploy-walk <N> done`, append `*(YYYY-MM-DD: done.)*` (literal phrase). Use today's date from the agent's clock context.

After the edit, **check whether step N was the last `[ ]` in the active sub-section**:

- If `### Before deploy` is now fully `[x]` and Status is `drafted`, the confirmation reply ends with: *"All Before-deploy steps complete. When you've actually deployed, reply `deploy-walk deployed` (or `deploy-walk deployed: {note}`) to flip status and unlock After-deploy steps."*
- If `### After deploy` is now fully `[x]` and Status is `deployed`, stop after marking the step and ask the developer for explicit closure approval with **AskQuestion**. Required options:
  - **Approve deploy checklist closure**
  - **Review deploy checklist first**
  - **Leave status deployed**
  - **More details for option _**
  Only **Approve deploy checklist closure** authorizes the Status `deployed → done` flip and the **Frontmatter capstone** `deploy-test-plan-verified` `pending → done` mutation. Do not treat the final step's `done` command as approval for the larger deploy lifecycle closeout.
- Otherwise, append the next-step hint: *"Marked {Before or After}-deploy step N done. Next: step N+1 — \"{verbatim next unchecked step line}\". Reply `deploy-walk present <N+1>` when ready."*

### `deploy-walk <N> skip: <reason>` — strike + flip

`StrReplace` to flip with strike-through:

- `old_string`: `{line N verbatim}` (e.g. `1. [ ] Confirm staging is healthy.`).
- `new_string`: `{line N with [ ] → [x] and the step text wrapped in ~~ ~~, plus skip note}` (e.g. `1. [x] ~~Confirm staging is healthy.~~ *(2026-05-14: Skipped — covered by phase 4's regression suite.)*`).

The strike-through is GFM `~~text~~`. Skipped steps count toward sub-section completion (status-flip logic and "all checked?" detection treat them the same as `done`).

Confirmation: *"Marked {Before or After}-deploy step N skipped: \"{reason}\". Next: step N+1 — ..."* (or the all-checked branch).

### `deploy-walk <N> block: <reason>` — note only, no flip

`StrReplace` to append a block note **without flipping**:

- `old_string`: `{line N verbatim}`.
- `new_string`: `{line N}` + ` *(YYYY-MM-DD: Blocked — {reason})*` (append the block note after the full step line; e.g. `1. [ ] Curl staging endpoint with each of the 9 \`pushType\` values. *(2026-05-14: Blocked — staging push-shared@2.4 not yet deployed; awaiting dispatch from #infra.)*`).

The box stays `[ ]`. The skill stops the loop — no next-step hint, no auto-advance. The **developer** re-invokes `deploy-walk present <N>` later when the blocker clears, at which point the prior block note is surfaced (per § *Step 3 — `deploy-walk present <N>`* above).

Confirmation: *"Marked {Before or After}-deploy step N blocked: \"{reason}\". Box left `[ ]`. Re-invoke `deploy-walk present <N>` once the blocker clears."*

### `deploy-walk deployed` / `deploy-walk deployed: <note>` — status transition `drafted → deployed`

Pre-conditions:

- Status must currently be `drafted`. If `deployed` or `done`, reply: *"Status is already `{current}`. To override, reply `deploy-walk deployed force` (**developer** escape hatch — only use if the plan's lifecycle drifted from reality)."* (Skill's `force` branch is identical to the normal branch; the gate is the **developer**'s confirmation.)
- If any `[ ]` boxes remain in `### Before deploy`, do **not** flip status yet. Use **AskQuestion** to confirm whether the developer wants to deploy with unchecked Before-deploy steps. Required options:
  - **Proceed to deployed with unchecked Before-deploy steps**
  - **Review Before-deploy steps first**
  - **Block deploy transition**
  - **More details for option _**
  Only **Proceed to deployed with unchecked Before-deploy steps** authorizes the status mutation. If approved, include a note listing unchecked indexes in the confirmation so the omission is auditable.

`StrReplace` on the Status line:

- `old_string`: `**Status:** drafted {existing-history}` (the full current line, including all prior `*(...)*` entries).
- `new_string`: `**Status:** deployed {existing-history} *(YYYY-MM-DD HH:MM: deployed.)*` (or with the user's note in place of `deployed.`). Time uses 24-hour `HH:MM` from the agent's clock context.

Confirmation reply also previews the first After-deploy step: *"Status flipped: `drafted → deployed` at {YYYY-MM-DD HH:MM}. After-deploy now active. First step: \"{verbatim first step line}\". Reply `deploy-walk present 1` when ready."*

If `### After deploy` has no `[ ]` items at all (it's empty by design or already all `[x]` — unusual), reply: *"Status flipped: `drafted → deployed`. No `### After deploy` steps remain. Deploy checklist closure still requires approval."* Then run the same **Approve deploy checklist closure** gate used by the last After-deploy `done` branch before flipping `deployed → done` or changing `deploy-test-plan-verified` to `done`.

### `deploy-walk status` — read-only summary

No edits. Reply with one line summarising the plan's current state (plain text or a single fenced `text` line — do **not** use raw `<…>` placeholders, which Markdown parsers treat as HTML tags):

```text
{slug} — Status: {state} (last transition: {YYYY-MM-DD}). Before: {X}/{Y} ✓. After: {A}/{B} ✓.
```

Where `{X}` is the count of `[x]` boxes (including skipped) in `### Before deploy`, `{Y}` is the total numbered items, `{A}` / `{B}` the same for `### After deploy`, `{state}` from the `**Status:**` line, and `{YYYY-MM-DD}` from the latest `*(…)*` history entry when present. If no `**Status:**` line is found, surface: *"No `**Status:**` lifecycle marker — pre-skill plan format. Counts: Before {X}/{Y}, After {A}/{B}."*

## Step 4 — Step presentation contract

When `deploy-walk present <N>` lands a clean `[ ]` step, present it with this structure. **Plan path:** show the absolute path you resolved in Step 1 (from **`plan-state resolve`** output, an explicit path the **developer** supplied, or the read tool path). Do **not** use `~/.cursor/plans/` or other non-**`.sedea/operations/`** locations for hosting repo plan IO.

Use a **blockquote** or plain lines for the presentation shell — **do not** put `{slug}`, paths, or `{state}` inside raw `<…>` angle brackets (Markdown/HTML will eat them). Template:

> **Plan:** {slug} — {absolute-path-to.plan.md} — Section: § N {Before or After} deploy, step {N} of {total}.
> **Status:** {state} (last transition: {YYYY-MM-DD}).
>
> ### Step
>
> *(verbatim text from the plan, including any inline `code spans` or **bold**)*
>
> ### Why
>
> *(any italic *because* phrasing in the plan body adjacent to or inside this step — search the surrounding paragraph for `*...*` runs that explain rationale; if there isn't one, omit this sub-section)*
>
> ### Expected outcome
>
> *(inferred — what success looks like: HTTP status, response shape, log line, SQL output, dashboard signal. Pull from the step text + repo conventions; be concrete, not aspirational)*
>
> ### Commands / context
>
> *(expand any shorthand the step uses — "each of the 9 `pushType` values" → enumerated list; "psql ..." → full command with the env vars filled or marked with a literal `TODO: fill in` where unknown; "curl staging" → full curl with headers and body; "tail logs filtered to ..." → the actual `kubectl logs` / `gcloud logging` invocation with the filter expression)*
>
> ### Cross-references
>
> *(if the step depends on another phase or PR being live, name it: "This step assumes phase 4's PUT contract is deployed." If the step has a related caveat in § 8, name it: "See § 8 caveat 2 for the rebase implication.")*
>
> ---
>
> Ask me anything. When you're done, reply `deploy-walk <N> done`, `deploy-walk <N> done: <note>`, `deploy-walk <N> skip: <reason>`, or `deploy-walk <N> block: <reason>`.

If a sub-section ("Why" or "Cross-references") has nothing to say, omit it rather than emit a placeholder. If "Expected outcome" is genuinely ambiguous (the step itself is loose), use **AskQuestion** to clarify what counts as success before the **developer** runs anything.

The presentation should be **detail-oriented**, not minimalist. Long presentations are fine; lazy ones aren't.

## Step 5 — Edit mechanics

`StrReplace` is the only tool used for edits. The step text is usually unique within the file (numbered + bracketed = effectively keyed). When it isn't (rare; e.g. the same one-liner appears in both Before and After), include the sub-section heading + the line in `old_string`:

```
old_string:
### Before deploy

1. [ ] Confirm staging is healthy.

new_string:
### Before deploy

1. [x] Confirm staging is healthy. *(2026-05-14: staging green, no alerts pending.)*
```

Status-line edits are similar — the `**Status:** {state}` prefix + first history entry is unique:

```
old_string: **Status:** drafted *(2026-05-14: PR plan drafted.)*
new_string: **Status:** deployed *(2026-05-14: PR plan drafted.)* *(2026-05-14 14:32: deployed — push-svc canary @ commit a1b2c3d.)*
```

For block-then-resume, the `done` edit `old_string` includes the prior block note so it's preserved as audit trail:

```
old_string: 1. [ ] Curl staging endpoint with each of the 9 `pushType` values. *(2026-05-14: Blocked — staging push-shared@2.4 not yet deployed.)*
new_string: 1. [x] Curl staging endpoint with each of the 9 `pushType` values. *(2026-05-14: Blocked — staging push-shared@2.4 not yet deployed.)* *(2026-05-15: done — staging deploy completed overnight; all 9 returned 200 + non-empty arrays.)*
```

History is **append-only**. Never overwrite or compact prior `*(YYYY-MM-DD: ...)*` entries.

## Frontmatter capstone — `deploy-test-plan-verified` (`pending` → `done`)

PR plans carry a YAML todo whose `id` is **`deploy-test-plan-verified`** (see [`development-process.md`](../../../../docs/development-process.md) § *Per-PR plan template* § 7 — Frontmatter capstone). It stays `pending` until every Before-deploy and After-deploy checkbox is `[x]` **and** the deploy section's `**Status:**` reads `done`.

Only after the developer approves **Approve deploy checklist closure**, when this skill sets `**Status:**` from `deployed` → `done` (last After-deploy checkbox, or the empty-After-deploy chain from `deploy-walk deployed`), **immediately** apply a second `StrReplace` on frontmatter using this **exact** `old_string` / `new_string` pair (byte-identical to [`pr-plan`](../pr-plan/SKILL.md) § 4a-bis and on-disk plans — do not paraphrase the `content: >-` body):

```
old_string:
  - id: deploy-test-plan-verified
    content: >-
      Mark done only when every Before-deploy and After-deploy step is checked
      (`[x]`) and the deploy section `**Status:**` reads `done` (walk via `deploy-walk`,
      or edit manually). Independent of PR merge; run `plan-reconcile` protocol branch when you want
      reconcile/archive after merges.
    status: pending

new_string:
  - id: deploy-test-plan-verified
    content: >-
      Mark done only when every Before-deploy and After-deploy step is checked
      (`[x]`) and the deploy section `**Status:**` reads `done` (walk via `deploy-walk`,
      or edit manually). Independent of PR merge; run `plan-reconcile` protocol branch when you want
      reconcile/archive after merges.
    status: done
```

- If the `old_string` block is **not found** (plan lacks the todo, or `content:` was edited and no longer matches), **do not** fail the Status flip — the deploy section is already correct. Reply with a **flag**: *"Could not find canonical `deploy-test-plan-verified` block — add it per **`pr-plan`** § 4a-bis (or hand-insert), then set `status: done` to match § 7."* Optionally append the canonical block with `status: done` immediately before `isProject:` if the plan has zero deploy-capstone todo.
- If `status` is already `done`, skip the second `StrReplace` (idempotent re-run).

**`plan-reconcile` is not invoked.** Finishing the walk does not run **plan-reconcile** — merge-driven reconcile is a separate **developer** gesture (mission dispatch or natural language to the **plan-reconcile** protocol branch).

## Auto-resolution rules — `deploy-walk present <N>` without sub-section

When the user runs `deploy-walk present <N>` (no `before` / `after`), pick the sub-section per the **Status** column above. The full table:

| Status | `deploy-walk present <N>` routes to |
|---|---|
| `drafted` | `### Before deploy` step N. If N exceeds Before's count, surface: *"Step N doesn't exist in `### Before deploy` (only Y items). After deploy, continue in `### After deploy` with `deploy-walk present after` using step index (N − Y)."* |
| `deployed` | `### After deploy` step N. If N exceeds After's count, same pattern. |
| `done` | One-line summary, no edit. *"All deploy steps complete (Before {X}/{X}, After {A}/{A}, status `done`). To re-walk a step, reply `deploy-walk present before <N>` or `deploy-walk present after <N>` explicitly."* |
| missing | Heuristic fallback (any `[ ]` in Before → Before; else After) plus a flag noting the missing Status marker. |

`deploy-walk present before <N>` and `deploy-walk present after <N>` always work regardless of status — they're the explicit out-of-order escape hatch. If they hit a sub-section the status disagrees with (e.g. `deploy-walk present after 1` while Status is `drafted`), surface a one-line warning at the top of the step presentation:

> **Status mismatch:** PR is `drafted` (not deployed yet). Proceeding with After-deploy step 1 anyway because you asked explicitly.

No blocking — the **developer** is in control.

## Edge cases

1. **Multi-line step text.** A `1. [ ] …` step (arbitrary `{text}` on the first line) may wrap across multiple lines if the text is long (Markdown allows continuation lines indented under the list item). Capture the full step in `old_string` — read enough lines after the `1.` line to include all wrapped content. The flip and note still go on the *first* line (after the `[x]`) — wrapped continuation lines stay as-is.
2. **Step text with backticks / inline code.** `StrReplace` is literal — escape nothing, copy verbatim from the file. Don't reformat.
3. **User typo on step number.** If `deploy-walk present 12` is invoked but the section has only 5 items, reply: *"Section has only 5 numbered items; `deploy-walk present 12` is out of range. Did you mean a different step number? Or run `deploy-walk status` for the current shape."*
4. **`deploy-walk <N> done` invoked without a prior `deploy-walk present <N>`.** The skill doesn't enforce ordering — `done` just flips the box. If the box was already `[x]`, surface: *"Step N was already `[x]` when this `done` arrived. No edit applied. Did you mean a different step number?"*
5. **Status line drifted (e.g. `deployed` but Before still has `[ ]` boxes).** This isn't an error condition — the **developer** may have deployed despite skipping some Before-deploy checks deliberately, or the previous `deploy-walk deployed` invocation surfaced the unchecked-box flag and the **developer** accepted it. The skill respects the Status line as the source of truth.
6. **Plan archived mid-walk.** If **`plan-state`** **`reconcile`** archives the plan between commands (rare; usually requires the PR to merge), the next command's Step-1 resolution must **re-resolve** the slug under **`.sedea/operations/`**. Archived plans keep the same **`plans/`** tree path with frontmatter **`archived: true`** (no separate `archived_plans/` subtree). Edits still apply via `StrReplace` on that path. Archival timing is **plan-reconcile** / **`plan-state`**'s concern, not this skill's.
7. **User wants to revert a `[x]` to `[ ]`.** Not a built-in command. If they ask, do the inverse `StrReplace` manually (flip `[x]` → `[ ]` and trim the trailing `*(...)*` note). Surface this as an unusual case — usually the right move is a fresh `deploy-walk <N> done` with a new note explaining what changed.
8. **Deploy walk on a non-PR plan (Master Plan, Phase plan, etc.).** Master Plans and Phase plans don't have `## N. Deploy test plan` sections — they have dual-title decomposition sections. If the user runs **deploy-walk** against one, stop with: *"Plan `{slug}` is a Master Plan, Phase plan, or Roadmap topic (pick which), which doesn't have a `## N. Deploy test plan` section. **deploy-walk** only walks PR plans (per-PR template § 7 / § 6). Did you mean a child PR plan?"*
9. **Roll-back.** Out of scope for v1. If a deploy fails and the user wants to flip status back to `drafted`, they edit the Status line manually.

## Scope guard

This skill walks **one PR plan's `## N. Deploy test plan` section at a time**. It does **not**:

- Run shell commands on the user's behalf (curl, psql, `gh`, kubectl). The skill **describes** the command in the step presentation; the **developer** runs it. The agent can be asked to run a command in the loose-mode collaboration window between `deploy-walk present <N>` and `deploy-walk <N> done` — that's the agent in its general-purpose mode, not this skill.
- **`git commit`**, **`git push`**, or any other write to the **hosting** git tree on behalf of the **developer** unless they explicitly ask in the same message. Plan body edits are normal **`StrReplace`** on the **`.plan.md`** file; syncing **`.sedea/operations/`** (or the hosting repo) to version control follows the **developer**'s workflow and hosting repo docs — this skill does **not** prescribe a monorepo-specific plan-commit command.
- Reconcile / archive the plan when it reaches `done`, or auto-run **`plan-reconcile`**. **`plan-reconcile`** is never auto-invoked from this skill. The `done` flip + frontmatter `deploy-test-plan-verified` → `done` close the **deploy checklist only**; archival still depends on merge + explicit **plan-reconcile** (see **development-process** cadence).
- Spawn child plans, edit other plans, or modify the parent plan's PR list / scope. Those are **`master-plan`**, **`pr-breakdown`**, **`phase-plan`**, etc.
- Run **`coding-session`**, **`pre-pr-review`**, **`pr-review`**, or any other protocol branch from inside this one. If the **developer** wants those, they invoke them via mission dispatch or natural language.
- Apply to plans without the GFM task list contract (`1. [ ] ...`). Pre-skill plans must be swept first; the skill stops with a clear message instead of guessing.
- Walk "all PR plans in flight" in batch. Cross-plan dashboards can come later as a one-line script over **`.sedea/operations/.../plans/`**; the skill is per-plan.

## Spawned result contract

When spawned by `create-pr`, end each substantive turn with deploy status outputs so upstream can keep the ledger accurate:

- `outputs.targetPlanPath`
- `outputs.targetPlanSlug`
- `outputs.prUrl`
- `outputs.prNumber`
- `outputs.mergeSha`
- `outputs.deployStatus` (`drafted` | `deployed` | `done` | `blocked` | `unknown`)
- `outputs.beforeDeployStatus` (`complete` | `incomplete` | `blocked` | `unknown`)
- `outputs.afterDeployStatus` (`complete` | `incomplete` | `blocked` | `unknown`)
- `outputs.deployTodoStatus` (`pending` | `done` | `missing` | `unknown`)
- `outputs.blockedStep`
- `outputs.remainingTasks`
- `outputs.activeLanes`
- `outputs.openLedgerEntries`
- `outputs.continuationOwner: "deploy-walk-agent"`
- `outputs.continuationStatus`

Set `continuationStatus`:

- `terminal` only when `deployStatus: "done"` and `deployTodoStatus: "done"`.
- `active` while Before-deploy steps, deployed transition, After-deploy steps, or capstone todo remain.
- `active` when any deploy step is blocked; include the blocked step and reason.
- `partial` status with `continuationStatus: "active"` when plan format prevents reliable verification.

Stop after each command's confirmation reply. Do not auto-advance, do not auto-invoke other skills, do not commit.

## Squad Leader bubble-up (detached lanes)

Runs on a **detached** deploy lane. When `deployStatus` and `deployTodoStatus` are **done** (or deploy is blocked), nudge the developer to post **Ship recap — plan and deliver** on the leader dispatch (**`../../plan.mdc`** §8).

| Outcome | `shipPhase` | Key `outputs` for recap |
|---------|-------------|-------------------------|
| Checklist complete | `deploy-walk` | `targetPlanPath`, `deployStatus`, `deployTodoStatus` |
| Blocked step | `deploy-walk` | `targetPlanPath`, `rowStatus: blocked`, blocked step in `remainingTasks` |

## Mission Control section 8 sync (required terminal `outputs`)

On **every** terminal `AGENT_RESULT_RESPONSE_V1` (including follow-up re-emits), `outputs` **must** include:

| Field | Rule |
|-------|------|
| `targetPlanPath` | Absolute PR plan `.plan.md` path — **required** |
| `shipPhase` | `deploy-walk` when checklist in progress; use bubble-up table when blocked or done |
| `rowStatus` | `open` while steps remain; `closed` when `deployStatus` and `deployTodoStatus` are both `done`; `blocked` when a deploy step is blocked |
| `deployStatus` / `deployTodoStatus` | Echo spawned contract fields |
| `remainingTasks` | When `rowStatus` is not `closed` |
| `blockedReason` | When `rowStatus` is `blocked` (name the blocked step) |

Mission Control syncs section 8 on the Squad Leader lane from these fields.

## Completion (spawned)

Required `outputs` per **## Spawned result contract**, **Mission Control section 8 sync**, and the bubble-up table. Re-emit an **updated** terminal result after user-requested follow-up on this lane (same `correlationId`).

### Host protocol line (required)

Emit **exactly one** line on its own: `AGENT_RESULT_RESPONSE_V1` immediately followed by a single JSON object on the **same** line. Required keys: `version` (1), `correlationId` (from the spawn request), `status`, `summary`, `outputs`, `errors` (use `[]` when none). Populate `outputs` from the sections above **including** `targetPlanPath`, `shipPhase`, and `rowStatus` on every terminal line. The emitted line must be **valid JSON** (no `{...}` placeholders in the actual output). See **`.sedea/centers/sedea/skills/README.md`** § *Spawned terminal line*.

Stop after the terminal line. Do not emit another `AGENT_RUN_REQUEST_V1` or run the next protocol step in the same turn (see **`../README.md`** § *Terminal stop (normative)*).

## Completion (inline)

Report the fields below in prose to the invoker on the **same lane**. Do **not** emit `AGENT_RUN_REQUEST_V1`, `AGENT_RESULT_RESPONSE_V1`, or `MC_DISPATCH_RESOLVED_V1`. Do **not** add a **Host protocol line** under this section (see **`.sedea/centers/sedea/rules/4_mission.mdc`** § *Inline completion* and **`.sedea/centers/sedea/skills/README.md`** § *Completion (inline)*).

Normally spawned from **`create-pr`** after merge. If run inline, use the same `outputs` semantics as **## Spawned result contract** and **`## Completion (spawned)`** in prose only.
