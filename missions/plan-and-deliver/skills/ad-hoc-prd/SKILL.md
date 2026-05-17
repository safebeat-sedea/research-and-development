---
name: ad-hoc-prd
description: >-
  Scaffold a minimal Ad-Hoc PRD (bugs / small improvements) as
  `ad_hoc_<slug>_<hex>.ad-hoc-prd.md` under **personal operations docs only:**
  `.sedea/operations/<operations-user-id>/docs/` (never `joint/docs/`).
  Ad-Hoc PRD is upstream root input for **`master-plan`**; no existing `.plan.md`
  link is required. For **Ad-Hoc PRD creator** agent sessions — explicit
  mission dispatch or upstream agent only. Does not edit
  `.plan.md` files or run **`master-plan`** unless explicitly directed in the
  same invocation.
timeoutMs: 900000
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
    description: Optional operations user id; when omitted, the skill resolves it from local Sedea configuration.
    required: false
  roadmapHints:
    type: array
    description: Optional roadmap, related slug, or worktree hints from the upstream protocol.
    required: false
    default: []
---

# Ad-Hoc PRD

**Intent:** **Ad-Hoc PRD creator agent** turns a short **change request** (bug or small improvement) into a **minimal Ad-Hoc PRD** — a **standalone root artifact**. **Master Plans** and all other plans are **downstream** of the PRD (see **development-process**); this skill does **not** require or resolve a parent `.plan.md`.

**File type:** **`.ad-hoc-prd.md`** so tooling recognizes the shape (§§ 1–3 + **Master Plan** placeholder line).

## When this skill applies

**Actor:** **Ad-Hoc PRD creator agent** — session that runs after **explicit invocation** (mission dispatch or upstream agent). **Developers do not invoke skills by name**; routing is always an agent decision.

**Act in this turn** when **`ad-hoc-prd`** is engaged **and** the dispatch / handoff supplies **all** of:

1. **Create intent** — upstream step chose the ad-hoc change-request path (e.g. plan protocol “ad-hoc task description” branch).
2. **Title** — non-empty title for the Ad-Hoc PRD (handoff fields or captured change-request summary).

If **title** is missing, **stop** and ask **the developer** once in one short reply.

**Details:** Payload text — change-request description, thread excerpt, labeled context — use to draft **§1 Problem**, **§2 Desired outcome**, and **§3 Proposed solution**. If thin, use concise **TBD** bullets and say what to confirm.

**Optional context** (never required): roadmap hints, related slugs, or worktree paths may appear in the payload; they do **not** replace title + body and do **not** force a **`Plan:`** link to an existing `.plan.md`.

## Operations user id (required to write)

New Ad-Hoc PRDs are written **only** to:

**`.sedea/operations/<operations-user-id>/docs/`**

Resolve **`<operations-user-id>`** in this order (same as **`plan-state`** / **sedea-dot-sedea**):

1. Dispatch / handoff field (if mission supplies it), else  
2. **`--operations-user-id <id>`** when a shell step runs **`plan-state.mjs`**, else  
3. **`.sedea/local/operations-user-id`** (single line), else  
4. **`git config --local sedea.operationsUserId`**

If **none** resolve, **stop**: do **not** write under **`joint/docs/`**. Tell **the developer** to set **`.sedea/local/operations-user-id`** or **`sedea.operationsUserId`**, then re-run the invocation.

Create **`docs/`** under that segment if missing.

**Joint:** This skill **never** creates files under **`.sedea/operations/joint/docs/`**. If the work should become shared, **the developer** moves the file into **`joint/docs/`** (or another agreed location) outside this skill — e.g. git move / editor.

**Lookup:** When checking for an existing file by basename, search **only** **`.sedea/operations/<operations-user-id>/docs/`** for this protocol.

## Steps

1. **Resolve** **`<operations-user-id>`** per § above — abort if unset.
2. **Use** **§ Ad-Hoc PRD file shape (template)** below — no external template file.
3. **Filename:** `ad_hoc_<slugified-title>_<8-hex>.ad-hoc-prd.md` — slugify title (lowercase, non-alphanumerics → `_`, collapse repeats, max ~48 chars) + `_<random 8 hex>` (`crypto.randomBytes(4).toString('hex')` or equivalent).
4. **Write** under **`.sedea/operations/<operations-user-id>/docs/`**:
   - `# <Title>` — handoff title (not the filename).
   - **`Master Plan:`** line — `_TBD_` plus one sentence that **`master-plan`** will create the `.plan.md` from this Ad-Hoc PRD and the developer should paste or link that path here when it exists (do **not** invent a plan path).
   - **`## 1–3`** sections filled from handoff details; `_TBD_` where unavoidable + say what is missing.
5. **Reply** with workspace / `file://` link to the new file and how to run **`master-plan`** (e.g. seed **`Ad-Hoc PRD:`** `@.sedea/operations/<operations-user-id>/docs/<filename>.ad-hoc-prd.md`). Mention optional **manual move** to **`joint/docs/`** only if **the developer** wants shared visibility.

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
- Does **not** auto-run **`master-plan`** unless the developer or mission flow explicitly directs that in the same invocation.
