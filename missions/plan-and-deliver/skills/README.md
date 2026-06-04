# plan-and-deliver — spawn contracts

This mission uses **three execution shapes** (see **`.sedea/centers/sedea/skills/README.md`** for dual-mode authoring). Parent resume for the **Squad Leader** is in **`../plan.mdc`** § **Spawn, wait, and parent resume** (planning §§3–7) and § **8** (ship oversight). Host spawn/result protocol is in **`.sedea/centers/sedea/rules/4_mission.mdc`**.

## Normative execution mode (plan-and-deliver)

**Do not infer mode from the presence of `## Completion (spawned)` alone** — many skills document both sections for dual-mode authoring. Use this table for **plan and deliver** on the **research-and-development** center.

| Skill | Normative mode on this mission | Invoker | Terminal / result |
|-------|----------------------------------|---------|-------------------|
| **`planner`** | **Spawned only** — new child lane | Squad Leader §5 (`AGENT_RUN_REQUEST_V1`) | **`AGENT_RESULT_RESPONSE_V1`** on child lane |
| **`pr-plan`** | **Inline only** — same lane as invoker | **`new-plan`** step 4 (`parentAgentRole: new-plan-agent`) | **`## Completion (inline)`** — no `AGENT_RESULT_RESPONSE_V1` for **`pr-plan`** |
| **`pr-plan`** → **`coding-session`** | Spawn after §5c **Start coding session** (or **`phase-planner`** Step **5f** when inline **`pr-plan`** skipped §5c) | **`pr-plan`** lane, or **`phase-planner`** after **`prPlanHandoffSkipped`** | Child **`coding-session`** uses **`AGENT_RESULT_RESPONSE_V1`** |
| **`ad-hoc-prd`** | Spawned | Squad Leader §3 | Child terminal |
| **`delivery-phases`**, **`pr-breakdown`**, **`new-plan`** | Inline on **`planner`** / **`phase-planner`** lane | Parent planning skill | Inline completion merged into parent |
| **`phase-planner`** | Spawned from inline **`new-plan`** (optional) | **`new-plan`** | Child terminal; **owns phase delivery** on its lane until **`phaseShipComplete`** or explicit defer/abandon — Master Plan lane ack-only meanwhile |
| **`coding-session`** | Spawned (from **`pr-plan`** §5d or **`phase-planner`** §5f) or detached entry | **`pr-plan`**, **`phase-planner`** (inline subtree), developer, dispatch | Child terminal + inline ship skills |
| **`pr-review`**, **`create-pr`**, **`deploy-walk`**, **`plan-reconcile`** | **Inline only** on active **`coding-session`** | **`coding-session`** | Prose to coding-session — no child lane |

**Common mistake:** Spawning **`planner`** from **`new-plan`** or running **`pr-plan`** on a standalone child lane without **`new-plan-agent`** — wrong unless the mission protocol explicitly says otherwise.

Glossary for colliding step labels: **`.sedea/centers/research-and-development/docs/development-process.md`** § *Agent glossary — step and section labels*.

## Inline execution (same lane)

When a skill runs **inline** on the invoker’s lane (not spawned via **`AGENT_RUN_REQUEST_V1`**):

- Report **`## Completion (inline)`** (or the mission’s inline-only result section) in **prose** to the invoker.
- Do **not** emit **`AGENT_RESULT_RESPONSE_V1`** or add a **Host protocol line** under the inline section — host protocol applies **only** under **`## Completion (spawned)`** (see **`.sedea/centers/sedea/rules/4_mission.mdc`** § *Inline completion* and **`.sedea/centers/sedea/skills/README.md`** § *Completion (inline)*).
- Do **not** emit **`AGENT_RUN_REQUEST_V1`** unless the protocol step explicitly switches to spawned mode.

**plan and deliver** normally spawns planning and ship skills on child lanes; inline sections exist for dual-mode authoring and same-lane ship steps. **`pr-review`**, **`create-pr`**, **`deploy-walk`**, and **`plan-reconcile`** are **inline-only** on **`coding-session`** (no **`## Completion (spawned)`** on those skills).

## Recap, structured choice, act (plan-and-deliver)

Mission Control delivery for skills that mix long plan output with structured user choice. Canonical Sedea rules: **`.sedea/centers/sedea/rules/2_ask-question-instructions.mdc`** § **Context and structured choice**. Hosting-repo runtime: **`.cursor/rules/mission-control-agent-runtime.mdc`**.

| Stage | Purpose | Notes |
|-------|---------|--------|
| **Recap** | Plan link, one-line summary, optional short recap | Prefer one message with structured choice (AskQuestion tool or `MC_PHASED_RESPONSE_V1`) |
| **Structured choice** | Modal approval / gates | No `MC_PHASED_RESPONSE_V1` after recap prose in the same message |
| **Parked continuation** | User leaves chat (PR/diff/CI) before next step | Open modal **before** end turn — rule **2** § External-wait; forbid prose “wait for user/developer” |
| **Act** | Spawn, terminal result, implementation | After the user selects in the modal |

**Normative:** Every skill in this mission **must** close **every** assistant turn with the **AskQuestion tool** or **`MC_PHASED_RESPONSE_V1`** per **`.sedea/centers/sedea/rules/2_ask-question-instructions.mdc`** § **Mandatory structured choice on every turn** and § **`MC_PHASED_RESPONSE_V1` wire format (binding)**. **Forbidden:** prose-only exit, recap-only endings, prose menus, or “wait for the developer” without a modal. Spawned skills that emit **`AGENT_RESULT_RESPONSE_V1`** put **`MC_PHASED_RESPONSE_V1`** on **line 1** and the terminal sentinel on the **last line** of the same message. Do **not** use “Turn A/B” or similar implementation labels in developer-facing chat.

**Authoring new or updated skills (binding):**

- When a step says the developer will review work **outside** chat (GitHub PR, diff, staging), end the turn with **parked** structured choice — not “wait for the user” / “come back when done” prose alone.
- Gate **`options`** must match the skill’s next branches (approve, revise, defer, commit when applicable, **More details for option _**).
- Reference **`coding-session/SKILL.md`** § *Post-create-pr handoff gate* and **`pr-review/SKILL.md`** Step **4** for ship-path examples.

**Reference implementations (planning):**

| Skill | Recap + structured choice (same turn) | Act |
|-------|---------------------------------------|-----|
| **`pr-breakdown`**, **`delivery-phases`** | §5d link + one-line summary + §6 modal | §6 act-after-select (depth-first); **`pr-breakdown`** **`approve-list`** may auto-expand PR **1** inline under **`planner`** |
| **`pr-plan`** | §5c recap + modal (skipped when `skipPrPlanHandoffModal` auto-chain) | §5d spawn |
| **`planner`** | §7 draft + §7 approval modal same turn; §7a status + §7b next moves | §7c |
| **`phase-planner`** | §4f echo / §5c route modal; Step **5f** after **`prPlanHandoffSkipped`** | §5b inline decompose / Step **5f** **`coding-session`** spawn |
| **`new-plan`** | stub + parent link + populator gate | populator spawn |

**Ship and ops skills:** **`coding-session`** (worktree-open, inline bootstrap wait, **auto** pre-PR spawn after cut-point + Before deploy, **auto** inline **create-pr** on clean **go**, **auto** post-merge cleanup when merged, inline **deploy-walk**, inline **plan-reconcile**), **`worktree-bootstrap`**, **`pre-pr-review`** — structured choice for gates that still require a developer pick (cut-point, review feedback, post-create-PR, remainder); recap for status, diff, or dry-run report only. Prefer **AskQuestion** or **`MC_PHASED_RESPONSE_V1`** when recap and modal belong in one message.

**Lane pick (no resolved target):** emit *Where we are now in the plan tree* snapshot, then structured choice per **30_planning-target-resolution** § *Sedea input channel* (phased or split — not prose menus).

**Spawned child lanes:** Cloud/spawned agents lack the native AskQuestion tool. **Every turn** **must** emit **`MC_PHASED_RESPONSE_V1`** (sentinel line **1**, recap in **`display.markdown`**, options in **`askQuestion`**) or split per rule **2** priority **3**. Wire format: rule **2** § **`MC_PHASED_RESPONSE_V1` wire format (binding)**. Gate templates: **`coding-session/SKILL.md`** § *Spawned lane — sentinel-first (binding)*.

## Planning spawn (Squad Leader §3, §5, decomposition tree)

Squad Leader steps **§3** and **§5** spawn child lanes for **`ad-hoc-prd`** and **`planner`**. **`planner`** runs **`delivery-phases`**, **`pr-breakdown`**, and **`new-plan`** **inline**. **`phase-planner`** runs **`delivery-phases`** and **`pr-breakdown`** **inline** on its child lane. Inline **`new-plan`** runs **`pr-plan`** inline and may still spawn **`phase-planner`**. **Depth-first expansion:** parent lists show all rows; **`new-plan`** runs only for ship-eligible indices (phases sequential; PRs per **`### Sequencing`** stages) — see **development-process.md** § *Depth-first plan-tree traversal* and rule **30** § *Depth-first expansion eligibility*. Skills that support both modes still document **`## Completion (spawned)`** and **`## Completion (inline)`** — use **§ Normative execution mode** above for which mode applies on this mission.

| Skill | Typical invoker | Squad Leader ledger |
|-------|-----------------|---------------------|
| `ad-hoc-prd` | Squad Leader §3 | Child lane owns PRD recap + approval (steps 5–7); leader §4 only after `terminal` + `developerApprovedPrd: true`; no nested child lanes |
| `planner` | Squad Leader §5 | Seed ledger; §6 ack when `continuationOwner: master-plan-agent` |
| `phase-planner` | inline **`new-plan`** spawn | Runs **`delivery-phases`** / **`pr-breakdown`** inline on **its child lane**; owns phase subtree through ship-complete; **`planner`** ack-only while **`continuationOwner: phase-planner-agent`** is active |
| `delivery-phases` | **`planner`** or **`phase-planner` inline** | Runs **`new-plan`** inline on invoker lane |
| `pr-breakdown` | **`planner`** or **`phase-planner` inline** | Same as delivery-phases |
| `new-plan` | **`delivery-phases`** / **`pr-breakdown` inline** | Indexed stub + parent link; **`pr-plan`** inline; may spawn **`phase-planner`** |
| `pr-plan` | **inline `new-plan`** on planner or phase-planner lane | Layer 1 handoff; §5d spawn on invoker lane, or **`phase-planner`** Step **5f** when §5c skipped via **`skipPrPlanHandoffModal`** |

Field-level `outputs` and `continuationStatus` rules: each skill’s **`## Completion (spawned)`**.

### Implementation consent before worktrees (two layers)

| Layer | Skill | Primary output |
|-------|-------|----------------|
| 1 — Planning handoff | `pr-plan` | `readyForImplementation`, `implementationHandoffStatus` — does **not** advance §8 `phase` past `not-started` |
| 2 — Worktree open | `coding-session` | `developerApprovedImplementation` after **`plan-ws-completeness.mjs`** passes or override in the worktree-open gate |

**`pr-plan` → `coding-session`:** sequential skills on **different lanes**. **`pr-plan`** drafts §§ 1–4 and may sketch §§ 5–8; after **AskQuestion** **Start coding session**, **`pr-plan`** emits **`AGENT_RUN_REQUEST_V1`** for **`coding-session`** (§5d). When inline under **`phase-planner`** with **`skipPrPlanHandoffModal`**, §5c is skipped on the **`pr-plan`** turn only — **`phase-planner`** Step **5f** offers the same §5d-equivalent spawn (or §5c re-entry) on the **phase-planner** lane; **forbidden** to redirect to detached entry or **`planner`** §7b as the default. The **child lane** then owns worktrees, workspace attach, **implementation in the worktree** (default), §§ 5–8 fill, and ship execution — not prompt-only handoff unless **`promptOnly: true`** or **Defer implementation**. Detached **`coding-session`** entry may use prompt-only or implement on that detached lane after layer 2. See **`pr-plan/SKILL.md`** § *Handoff to coding-session*, **`phase-planner/SKILL.md`** Step **5f**, and **`coding-session/SKILL.md`** § *Execution mode after worktree attach*.

### Worktree removal ownership (binding)

**Do not remove worktrees you do not own.** Applies to every ship skill on **`coding-session`** and **`plan-reconcile`** §5.

| Source | Contract |
|--------|----------|
| [`.sedea/centers/sedea/rules/0_hosting-repo.mdc`](.sedea/centers/sedea/rules/0_hosting-repo.mdc) § *Worktree ownership* | Four preconditions before detach/remove |
| [`.sedea/centers/research-and-development/rules/20_efficient-pr-shipping.mdc`](.sedea/centers/research-and-development/rules/20_efficient-pr-shipping.mdc) § *Worktree removal ownership (binding)* | R&D ship lanes |
| **`coding-session/SKILL.md`** § *Post-merge workspace cleanup* | Primary post-merge owner |
| **`plan-reconcile/SKILL.md`** §5 | Idempotent fallback only |

**Forbidden:** **`git worktree remove`**, **`git worktree prune`**, **`sedea_remove_worktree_folder`** on paths **this pass** did not create and mount; repo-wide cleanup from **`git worktree list`**; **`git worktree remove`** on **`HOSTING_ROOT`**. **`git worktree list` is read-only** when ownership is unclear — stop and use structured choice.

## Ship spawn (detached / coding-session chain)

These skills run on **detached** or **nested** lanes (often **not** the Squad Leader). They use **domain-specific section titles** for long procedures; each dual-mode file has **`## Completion (spawned)`** (host terminal line) and **`## Completion (inline)`** (prose only, no sentinel). Detailed `outputs` lists live in the section named in the **Outputs section** column.

| Skill | Typical spawner | Outputs section | §8 ship phase hints |
|-------|-----------------|-----------------|---------------------|
| `coding-session` | Developer / mission dispatch; **`pr-plan`** spawn (default **spawned-lane** implement) | `## Implementation handoff result` (+ **`## Completion (inline)`** if same-lane) | Layer 2: `developerApprovedImplementation` after worktree-open gate; `shipPhase: implementing` when spawned child codes on lane (not prompt-only stop) |
| `worktree-bootstrap` | **`coding-session`** after worktree attach | `## Spawned result contract` | `worktree`; `bootstrapStatus` |
| `pre-pr-review` | `coding-session` | Step 8 — Report and result | `pre-pr-review`; `recommendation: go` |

The Squad Leader **§8** ship ledger updates via Mission Control **host sync** when ship child lanes emit terminals with required **`outputs`**. See **`../plan.mdc`** §8 *Mission Control host sync* and **development-process.md** § *Leader-lane §8 host sync*.

### §8 terminal contract (ship skills)

When a ship skill finishes a milestone on a **detached** lane, the terminal **`AGENT_RESULT_RESPONSE_V1`** **must** include **`targetPlanPath`**, **`shipPhase`**, and **`rowStatus`** (host may infer phase when documented). **Do not** nudge manual recap on the leader dispatch. Field hints: § *Mission Control section 8 sync* in each ship `SKILL.md`.

## Inline-only (no spawn)

| Skill | Invoker | Result section | §8 ship ledger |
|-------|---------|------------------|----------------|
| `pr-review` | Active **`coding-session`** agent on its lane | `## Inline result for coding-session` | **`coding-session`** re-emit with `shipPhase: pr-review` — host sync |
| `create-pr` | Active **`coding-session`** agent on its lane | `## Completion (inline)` | `pr-open` via **`coding-session`** terminal re-emit — no separate child terminal |
| `deploy-walk` | Active **`coding-session`** agent on its lane (Before deploy after commit, After deploy after merge, or deploy phrases) | `## Completion (inline)` | `deploy-walk` via **`coding-session`** terminal re-emit — no separate child terminal |
| `plan-reconcile` | Active **`coding-session`** agent on its lane (after deploy, stale worktree pick, or *plan reconcile* phrase) | `## Completion (inline)` | `reconcile` / `done` via **`coding-session`** terminal re-emit — no separate child terminal |

**`pr-review`**, **`create-pr`**, **`deploy-walk`**, and **`plan-reconcile`** return through **`coding-session`** on the coding lane. §8 updates on the leader dispatch via **`coding-session`** terminal re-emit and host sync only (**`../plan.mdc`** §8).

## Upstream ship-complete notification (spawn chain)

Depth-first expansion ( **`development-process.md`** § *Depth-first plan-tree traversal*) requires parents to know when a child PR or phase is **ship-complete** before offering **`expand-eligible`** / **`expand-next-eligible`**. Two channels apply:

| Channel | When | Parent action |
|---------|------|---------------|
| **Spawn `AGENT_RESULT_RESPONSE_V1`** | **`coding-session`** child terminal after inline **`plan-reconcile`** with merge + main pull + archive | Parent merges **`prShipComplete`**; unlock next PR per **`### Sequencing`** |
| **Host sync on leader** | Detached **`coding-session`** terminal with §8 **`outputs`** | Squad Leader §8 row updates automatically — no manual recap |

### Required terminal fields — **`coding-session`** (reconcile complete)

When **`outputs.shipPhase`** is **`done`** and **`outputs.rowStatus`** is **`closed`** after inline **`plan-reconcile`**, also set:

| Field | Value |
|-------|--------|
| **`prShipComplete`** | `true` |
| **`parentPlanPath`**, **`parentPlanSlug`**, **`parentIndex`** | From spawn **`inputs`** when present ( **`pr-plan`** §5d ) |
| **`mainPullStatus`** | From **`plan-reconcile`** inline completion (`success` \| `skipped` \| `failed`) |
| **`archivedSlugs`** | Target slug when archived |

### Parent merge rules (normative)

Each parent **must** handle **`Mission Control: agent-result-response delivered.`** for its spawned children:

| Parent | Child | On **`prShipComplete`** | On **`phaseShipComplete`** |
|--------|-------|-------------------------|----------------------------|
| **`pr-plan`** | **`coding-session`** | Merge child ship fields; **re-emit updated** `AGENT_RESULT_RESPONSE_V1` (standalone) or **`## Completion (inline)`** (under **`new-plan`**) | — |
| **`new-plan`** (inline) | **`coding-session`** via inline **`pr-plan`** | Merge §5b; propagate **`prShipComplete`** + index to **`pr-breakdown`** / **`phase-planner`** invoker | — |
| **`pr-breakdown`** | inline **`new-plan`** / **`pr-plan`** chain | Mark **`childRows[N].status: ship-complete`**; compute **`expandEligibleIndices`**; **re-emit updated** terminal or offer **`expand-eligible`** on next turn | — |
| **`phase-planner`** | **`coding-session`** (nested) or inline **`pr-breakdown`** rows | Track per-PR ship on phase subtree | When **all** PRs under phase are ship-complete → **`phaseShipComplete: true`** → notify **`new-plan`** / **`planner`** parent |
| **`delivery-phases`** | **`phase-planner`** | — | Mark phase row **`ship-complete`**; offer **`expand-next-eligible`** for next phase index |
| **`planner`** | **`pr-breakdown`** / **`delivery-phases`** inline + nested child results | Merge ledger; add **`expand-eligible`** / **`expand-next-eligible`** to Step **7b** when indices unlock | Same for next phase |

**Re-emit rule:** After merging a child ship-complete result, the parent **updates its own** terminal line (same **`correlationId`**) before stopping — so *its* parent receives fresh **`outputs`**. Silence on the child lane is **not** ship-complete.

## Required terminal line (all spawned children)

Every **spawned** child (planning and ship) ends with exactly one line on its lane:

`AGENT_RESULT_RESPONSE_V1` — same `correlationId` as the originating **`AGENT_RUN_REQUEST_V1`**; JSON fields `version`, `status` (`success` | `partial` | `failure` | `aborted` | `abandoned`), `summary` (1–3 sentences), `outputs` (per the skill’s completion section), optional `errors`. Re-emit an **updated** line after user-requested follow-up on that lane (same `correlationId`).

Populate `outputs` from the skill’s **`## Completion (spawned)`** and any referenced domain section above.

**Host protocol:** emit **exactly one** line — sentinel and **valid JSON on the same line** (no fence, no text after the JSON). Required keys: `version` (1), `correlationId` (spawn UUID), `status`, `summary`, `outputs`, `errors` (`[]` when none). Full format: **`.sedea/centers/sedea/skills/README.md`** § *Spawned terminal line* and **`.sedea/centers/sedea/rules/4_mission.mdc`** § *Agent session closure*.

## Universal spawn preflight (all plan-and-deliver spawners)

Run this checklist **before** every `AGENT_RUN_REQUEST_V1` emit on any lane (Squad Leader §§3/§5, **planner** Step 7, **pr-plan** §5d, ship-chain spawns). Host behavior is in **`.sedea/centers/sedea/rules/4_mission.mdc`** § *Agent-to-agent spawn protocol*; this section is the **plan-and-deliver** operator checklist.

| Step | Check |
|------|--------|
| 1 | Read the target **`SKILL.md`** frontmatter **`inputs`** map. Every key with **`required: true`** must appear in the spawn line’s **`inputs`** object with a non-empty value (unless the skill documents an explicit empty default). |
| 2 | **`inputs` keys must match frontmatter names exactly** (camelCase). Do **not** invent aliases (for example `featurePlanning` when the skill requires **`featurePlanningTitle`**). |
| 3 | Top-level spawn JSON includes **`version`** (`1`), a **new** **`correlationId`** (UUID), workspace-relative **`skillPath`** ending in **`/SKILL.md`**, **`name`**, dispatch-unique **`slug`**, **`description`**, and **`inputs`** (object — use `{}` only when the skill allows no required keys). |
| 4 | Optional keys only when needed: **`warmUpRules`** (repo-relative paths merged with skill frontmatter), **`initiatingPrompt`** (handover prose). |
| 5 | Emit **one physical line**: sentinel + JSON on the **same** line. No markdown fences, no `{...}` placeholders, no prose after the JSON — the host must parse it. |
| 6 | **`skillPath`** must resolve under **`.sedea/centers/research-and-development/`** for this mission’s skills (or the correct center path when spawning cross-center). |
| 7 | On failure (no child lane, immediate child validation error, or silent host reject): stop, name the failing checklist row, fix keys/paths/JSON, mint a **new** `correlationId`, and re-emit — do not guess. |
| 8 | **`name`** — topic-specific child label (feature title, plan slug, PR concern); **not** generic placeholders such as "Child agent" alone |
| 9 | **`description`** — one-line summary of the child lane's work scope |
| 10 | Display metadata is **initial** slot copy — spawned children refresh **own** slot via **`mission_control_update_lane_display`** when labels are stale (rule **9**; rule **50** § *Child lane*) |

Skill-specific **`inputs`** tables and paste-ready examples live in each **`SKILL.md`** (for example **`planner`** § *Spawn contract*). **`plan and deliver`** Squad Leader §5 adds a **planner** seed → **`inputs`** mapping before the §5 spawn step.

### Terminal stop (normative for every spawned skill)

**This section is the canonical stop rule** for all **`## Completion (spawned)`** blocks in this mission, even when an individual `SKILL.md` ends that section after the host-protocol paragraph without repeating the sentence below.

After emitting **`AGENT_RESULT_RESPONSE_V1`**, **stop on that lane** for the current skill turn:

1. Do **not** emit another **`AGENT_RUN_REQUEST_V1`** unless a later user message on the same lane explicitly continues the skill (then re-emit an **updated** terminal line with the same `correlationId`).
2. Do **not** emit **`MC_DISPATCH_RESOLVED_V1`** — only the **plan and deliver** Squad Leader closes the dispatch.
3. Do **not** run the next protocol step in the same turn after the terminal line (including “wait for child” announcements — the stop applies **after** the sentinel is emitted).

**Canonical closing sentence** (optional in skill prose; meaning is required either way):

> Stop after the terminal line.

**Per-skill procedure stops** (e.g. “Stop after the step 5 handoff block”, “Stop after spawning, announce wait, and close with structured choice”) apply **before** the terminal line — they gate mid-skill work, not replace this rule or **Turn completion invariant**. When both appear, order is: complete the gated step → emit **`AGENT_RESULT_RESPONSE_V1`** (when spawned) with **`MC_PHASED_RESPONSE_V1`** on the same message when the turn ends → **stop**.

| Skill | Explicit “Stop after the terminal line” in `## Completion (spawned)`? | Notes |
|-------|------------------------------------------------------------------------|--------|
| `author-prd` (prd mission) | Yes | Also forbids downstream planning spawns |
| `pr-plan` | Yes | May spawn **`coding-session`** in §5d before terminal (standalone) or inline under **`new-plan`**; one spawn per turn |
| `planner` | Yes | Procedure stop before terminal when `continuationStatus: active`; Step 7 runs **`delivery-phases`** / **`pr-breakdown`** inline on **later** user messages only; **`continuationStatus: terminal`** blocked while **`caveatsApprovalStatus: pending`** (§7 approve gate — see **`planner/SKILL.md`** *Draft §7 Caveats*) |
| `delivery-phases`, `pr-breakdown`, `new-plan`, `ad-hoc-prd` | Yes | `delivery-phases` / `pr-breakdown`: inline **`new-plan`** under planner; `new-plan`: inline under decomposition; `ad-hoc-prd`: active result after write, terminal only after developer approval; see each skill § *Completion (spawned)* |
| Ship chain (`coding-session`, `pre-pr-review`) | Yes | Inline ship skills (`create-pr`, `deploy-walk`, `plan-reconcile`, `pr-review`) — see **`## Completion (inline)`** |
| `phase-planner` | Yes | Runs **`delivery-phases`** / **`pr-breakdown`** inline; may spawn nested **`phase-planner`** or **`coding-session`** |

When authoring or reviewing a skill, duplicating the canonical sentence under **`## Completion (spawned)`** is encouraged but **not** required if this README is in **`warmUpRules`** or the spawn request passes it.

## Default warm-up

Every **spawned** plan-and-deliver skill lists the paths below in frontmatter **`warmUpRules`** (Mission Control merges with optional run-request **`warmUpRules`**). **`skills/README.md`** (this file) is **required** on all of them so § *Terminal stop (normative)* loads even when an individual `SKILL.md` omits the closing sentence.

**All spawned skills** (planning + ship):

- `.sedea/centers/research-and-development/missions/plan-and-deliver/plan.mdc` — Squad Leader §§1–7 ledger, spawn/wait; ship skills also use §8 via dev-process / bubble-up
- `.sedea/centers/research-and-development/missions/plan-and-deliver/skills/README.md` — spawn contracts, inline vs spawned shapes, **terminal stop (normative)**
- `.sedea/centers/research-and-development/docs/development-process.md`

**Planning skills** also include:

- `.sedea/centers/research-and-development/rules/30_planning-target-resolution.mdc`

**Ship skills** also include:

- `.sedea/centers/research-and-development/rules/20_efficient-pr-shipping.mdc`
- `.sedea/centers/research-and-development/rules/30_planning-target-resolution.mdc` — **`pre-pr-review`** spawn only; **`coding-session`** omits rule **30** from frontmatter (256 KiB warm-up cap); use `inputs.targetPlanPath` and explicit `Read` of rule **30** when resolving ambiguous `.sedea` paths

**Warm-up cap exceptions (256 KiB host budget):**

| Skill | Frontmatter omits (vs table above) | Runtime reads remain |
|-------|-----------------------------------|----------------------|
| **`pre-pr-review`** | `plan.mdc`, `development-process.md` | Step 3 reads **`development-process.md`**; Step 4 loads **`inputs.targetPlanPath`** (PR plan, not Squad Leader **`plan.mdc`**) |
| **`coding-session`** | rule **30** only | Explicit **`Read`** of rule **30** when resolving ambiguous `.sedea` paths |

Do **not** re-add omitted paths to **`pre-pr-review`** frontmatter without re-checking combined warm-up size — spawn rejects with **`warm-up-too-large`** when frontmatter + merged run-request rules exceed the host cap (see **`.sedea/centers/sedea/rules/4_mission.mdc`** § *Run-request line*).

**`pr-review`** and **`create-pr`** are inline-only — **no** frontmatter **`warmUpRules`**; they run **only** on the active **`coding-session`** lane (which includes this README and rule **20**). Do not dispatch **`pr-review`** or **`create-pr`** as standalone skill sessions.

### SKILL.md frontmatter (Mission Control spawn)

Mission Control **`skillResolver`** parses YAML frontmatter with strict unique keys. **`inputs`** must use **2-space** nesting (input name → field keys), not single-space flat keys — flat `inputs` breaks spawn with `skill-not-found` / duplicate key errors.

**Canonical shape** — copy from **`missions/topics/skills/create-topic-plan/SKILL.md`**:

```yaml
inputs:
  inputName:
    type: string
    description: ...
    required: true
warmUpRules:
  - ".sedea/centers/..."
```

**Repair / verify:** from hosting repo root (with **`scripts/node_modules`** installed):

```bash
node .sedea/centers/research-and-development/missions/plan-and-deliver/scripts/fix-skill-frontmatter.mjs --write
node .sedea/centers/research-and-development/missions/plan-and-deliver/scripts/verify-skill-manifest.mjs
```

### Adding or removing a skill

When you add, rename, or remove a protocol branch under `missions/plan-and-deliver/skills/<name>/SKILL.md` (or under **`prd`** / **`topics`** missions), update the same change set:

1. **`center.yaml`** — add or remove the repo-relative path under that mission's **`skillEntries`** (and **`development-process.md`** § *Protocol branches* when the branch is user-facing).
2. **Verify** from the hosting repo root:

 ```bash
 node .sedea/centers/research-and-development/missions/plan-and-deliver/scripts/verify-skill-manifest.mjs
 ```

3. **plan-and-deliver only** — if the skill is **spawned**, ensure **`warmUpRules`** includes `missions/plan-and-deliver/plan.mdc`, this README, and the usual rules per § *Default warm-up* above; add **`## Completion (spawned)`** + host protocol line when applicable.

### Scripts (`plan-state.mjs`, `pr-review.py`)

- **Location:** `missions/plan-and-deliver/scripts/` (paths in skills and rule **20** are workspace-root relative from the hosting repo that contains **`.sedea/`** — see that repo’s **`.cursor/rules/`** for hosting-repo specifics).
- **Runtime:** **Node / Python bundled with Sedea / VS Code** — see [`.sedea/centers/research-and-development/rules/31_operations-user-id.mdc`](../../../rules/31_operations-user-id.mdc) § *Hosting repo cwd (scripts)* and the hosting repo **`.cursor/rules/`**.
- **Vendor trees:** do not treat `scripts/**/node_modules/` or other installed dependencies as protocol documentation (center governance ends at `SKILL.md`, rules, and mission plans).
- **`verify-skill-manifest.mjs`** — compares **`center.yaml`** `skillEntries` to on-disk `SKILL.md` files for all missions in this center (exit 0 = match).
