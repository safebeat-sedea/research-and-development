---
name: ad-hoc-prd
description: >-
  Scaffold a minimal Ad-Hoc PRD (bugs / small improvements) as
  `ad_hoc_<slug>_<hex>.ad-hoc-prd.md` under **personal operations docs only:**
  `.sedea/operations/<operationsUserId>/docs/` (never `joint/docs/`).
  Ad-Hoc PRD is upstream root input for **`master-plan`**; no existing `.plan.md`
  link is required. For **Ad-Hoc PRD creator** agent sessions — explicit
  mission dispatch or upstream agent only. Does not edit
  `.plan.md` files or run/spawn **`master-plan`**.
inputs:
  createIntent:
    type: boolean
    description: True when the upstream protocol selected the ad-hoc PRD branch.
    required: true
  title:
    type: string
    description: Non-empty title for the Ad-Hoc PRD.
    required: false
  details:
    type: string
    description: Change-request description used to draft Problem, Desired outcome, and Proposed solution.
    required: true
  operationsUserId:
    type: string
    description: Operations user id supplied by Mission Control; required for user-private docs.
    required: true
  sourceSummary:
    type: string
    description: Optional short summary of where this ad-hoc request came from.
    required: false
  roadmapHints:
    type: array
    description: Optional roadmap, related slug, or worktree hints from the upstream protocol.
    required: false
    default: []
warmUpRules:
  - ".sedea/centers/research-and-development/docs/development-process.md"
---

# Ad-Hoc PRD

**Intent:** **Ad-Hoc PRD creator agent** turns a short **change request** (bug or small improvement) into a **minimal Ad-Hoc PRD** — a **standalone root artifact**. **Master Plans** and all other plans are **downstream** of the PRD (see **development-process**); this skill does **not** require or resolve a parent `.plan.md`, and does **not** spawn **`master-plan`**.

**File type:** **`.ad-hoc-prd.md`** so tooling recognizes the shape (§§ 1–3 + **Master Plan** placeholder line).

## When this skill applies

**Actor:** **Ad-Hoc PRD creator agent** — session that runs after **explicit invocation** (mission dispatch or upstream agent). **Developers do not invoke skills by name**; routing is always an agent decision.

**Act in this turn** when **`ad-hoc-prd`** is engaged **and** the dispatch / handoff supplies **all** of:

1. **Create intent** — upstream step chose the ad-hoc change-request path (e.g. plan protocol “ad-hoc task description” branch).
2. **Title** — non-empty title for the Ad-Hoc PRD (handoff fields or captured change-request summary).
3. **Details** — non-empty change-request body.
4. **Operations user id** — Mission Control supplied `operationsUserId`.

If any required field is missing in spawned mode, stop with `partial` and report `outputs.missingFields`; do not invent a title, write under `joint`, or continue with a guessed operations path. In standalone mode, collect missing **title** / **details** via **AskQuestion**.

**Details:** Payload text — change-request description, thread excerpt, labeled context — use to draft **§1 Problem**, **§2 Desired outcome**, and **§3 Proposed solution**. If thin, use concise **TBD** bullets and say what to confirm.

**Optional context** (never required): roadmap hints, related slugs, or worktree paths may appear in the payload; they do **not** replace title + body and do **not** force a **`Plan:`** link to an existing `.plan.md`.

## Complexity guard

Ad-hoc means **shorter PRD input**, not lower delivery scrutiny. Do not use this branch to bypass decomposition or implementation validation.

- Capture broad scope, multi-system impact, unclear acceptance criteria, data migration, security/auth, rollout risk, or test uncertainty in **§3 Proposed solution** as explicit risks / unknowns.
- If the request is obviously larger than a small change, still write the short PRD when inputs are sufficient, but set `outputs.complexityGuard: "needs-master-plan-assessment"` and include the reasons in `outputs.remainingTasks`.
- Leave all complexity scoring, decomposition routing, and downstream agent spawning to **`master-plan`** and later skills.

## Operations user id (required to write)

New Ad-Hoc PRDs are written **only** to:

**`.sedea/operations/<operationsUserId>/docs/`**

Use the **Mission Control supplied** `operationsUserId` from skill inputs / session warm-up (refresh with `sedea_get_current_user` when needed). If it is missing, stop with `partial` and report `outputs.missingFields: ["operationsUserId"]`. Do **not** write under **`joint/docs/`** as a fallback.

Create **`docs/`** under that segment if missing.

**Joint:** This skill **never** creates files under **`.sedea/operations/joint/docs/`**. If the work should become shared, **the developer** moves the file into **`joint/docs/`** (or another agreed location) outside this skill — e.g. git move / editor.

**Lookup:** When checking for an existing file by basename, search **only** **`.sedea/operations/<operationsUserId>/docs/`** for this protocol.

## Steps

1. **Validate inputs** — `createIntent === true`, non-empty `title`, non-empty `details`, and non-empty `operationsUserId`.
2. **Use** **§ Ad-Hoc PRD file shape (template)** below — no external template file.
3. **Filename:** `ad_hoc_<slugified-title>_<8-hex>.ad-hoc-prd.md` — slugify title (lowercase, non-alphanumerics → `_`, collapse repeats, max ~48 chars) + `_<random 8 hex>` (`crypto.randomBytes(4).toString('hex')` or equivalent).
4. **Write** under **`.sedea/operations/<operationsUserId>/docs/`**:
   - `# <Title>` — handoff title (not the filename).
   - **`Master Plan:`** line — `_TBD_` plus one sentence that **`master-plan`** will create the `.plan.md` from this Ad-Hoc PRD and the developer should paste or link that path here when it exists (do **not** invent a plan path).
   - **`## 1–3`** sections filled from handoff details; `_TBD_` where unavoidable + say what is missing.
5. **Reply / result** with workspace / `file://` link to the new file and return `prdRef` for the Squad Leader to pass into **`master-plan`**. Mention optional **manual move** to **`joint/docs/`** only if **the developer** wants shared visibility.

## Completion (spawned)

End every spawned run with exactly one terminal line:

`AGENT_RESULT_RESPONSE_V1` — same `correlationId` as the originating `AGENT_RUN_REQUEST_V1`; `status`: `success` | `partial` | `failure` | `aborted` | `abandoned`; 1–3 sentence `summary`; `outputs` (below); optional `errors`.

Required `outputs` fields:

- `outputs.prdPath`
- `outputs.prdRef`
- `outputs.prdTitle`
- `outputs.operationsUserId`
- `outputs.missingFields`
- `outputs.roadmapHints`
- `outputs.complexityGuard`
- `outputs.activeLanes`
- `outputs.openLedgerEntries`
- `outputs.remainingTasks`
- `outputs.continuationOwner: "squad-leader"`
- `outputs.continuationStatus`

Set `continuationStatus`:

- `terminal` when the Ad-Hoc PRD file is written and `prdRef` is available.
- `active` only when required inputs are missing and the Squad Leader must collect them.
- `partial` status with `continuationStatus: "active"` when file writing fails or the content is too thin to proceed without developer clarification.

The **Squad Leader** must present `prdRef` to the developer for approval before resuming §4/§5 of the mission protocol. This skill does not spawn **`master-plan`**, and a successful child result is not developer approval to continue planning.

Ledger expectations:

- `activeLanes: []` when the PRD write succeeds; this skill starts no child lanes.
- `openLedgerEntries: []` when terminal.
- `remainingTasks` should include any missing clarifications, complexity warnings, or write failure recovery steps.

Error states:

- Missing required inputs → `status: "partial"`, no file write, `continuationStatus: "active"`, and `missingFields` populated.
- Missing `operationsUserId` → `status: "partial"`, no file write, `missingFields: ["operationsUserId"]`.
- File already exists at the generated path → generate a different 8-hex suffix once; if still blocked, return `failure`.
- Write failure → `status: "failure"` or `partial` if recoverable, with `errors[].message` and `remainingTasks`.

Stop after the terminal result. Do not spawn **`master-plan`**.

## Completion (inline)

**plan and deliver** runs this skill **spawned only** (Squad Leader §3). If another invoker runs inline, report the same `outputs` semantics in prose without `AGENT_RESULT_RESPONSE_V1`.

## Ad-Hoc PRD file shape (template)

Use this shape for every new **`.ad-hoc-prd.md`** file.

```markdown
# <Title>

**Master Plan:** _TBD — run **`master-plan`** using this Ad-Hoc PRD as input; replace this line with a link to the resulting `.plan.md` when it exists._

## 1. Problem statement

<What is wrong or missing? Who is affected? Evidence / symptom?>

## 2. Desired outcome

<What “good” looks like — observable or testable when possible>

## 3. Proposed solution

<What to change, where, main steps, risks or unknowns>
```

## Out of scope

- Does **not** create or edit **`.plan.md`** files or sidecars (use **`new-plan`** / **`master-plan`** downstream).
- Does **not** auto-run or spawn **`master-plan`**. The Squad Leader uses `outputs.prdRef` to continue the protocol.
