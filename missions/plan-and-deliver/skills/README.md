# plan-and-deliver — spawn contracts

This mission uses **three execution shapes** (see **`.sedea/centers/sedea/skills/README.md`** for dual-mode authoring). Parent resume for the **Squad Leader** is in **`../plan.mdc`** § **Spawn, wait, and parent resume** (planning §§3–7) and § **8** (ship oversight). Host spawn/result protocol is in **`.sedea/centers/sedea/rules/4_mission.mdc`**.

## Inline execution (same lane)

When a skill runs **inline** on the invoker’s lane (not spawned via **`AGENT_RUN_REQUEST_V1`**):

- Report **`## Completion (inline)`** (or the mission’s inline-only result section) in **prose** to the invoker.
- Do **not** emit **`AGENT_RESULT_RESPONSE_V1`** or add a **Host protocol line** under the inline section — host protocol applies **only** under **`## Completion (spawned)`** (see **`.sedea/centers/sedea/rules/4_mission.mdc`** § *Inline completion* and **`.sedea/centers/sedea/skills/README.md`** § *Completion (inline)*).
- Do **not** emit **`AGENT_RUN_REQUEST_V1`** unless the protocol step explicitly switches to spawned mode.

**plan and deliver** normally spawns planning and ship skills on child lanes; inline sections exist for dual-mode authoring and rare same-lane runs. **`pr-review`** is **inline-only** (no **`## Completion (spawned)`**).

## Planning spawn (Squad Leader §3, §5, decomposition tree)

Squad Leader steps **§3** and **§5** and downstream decomposition agents run these skills **spawned** on child lanes. Each file has **`## Completion (spawned)`** and **`## Completion (inline)`** (inline is unused on standard leader spawn for most of these).

| Skill | Typical spawner | Squad Leader ledger |
|-------|-----------------|---------------------|
| `ad-hoc-prd` | Squad Leader §3 | `prdRef` → developer approval before §4; no child lanes |
| `master-plan` | Squad Leader §5 | Seed ledger; §6 ack when `continuationOwner: master-plan-agent` |
| `delivery-phases` | Master Plan agent | Merge `childRows`, `spawnedPlans`, `activeLanes` in §7 |
| `pr-breakdown` | Master Plan agent | Same as delivery-phases |
| `new-plan` | decomposition agents | Register child plan path/slug per row index |
| `phase-plan` | `new-plan` / decomposition | Populator lane; route fields for next branch |
| `pr-plan` | `new-plan` / decomposition | Layer 1: `readyForImplementation`, `implementationHandoffStatus`; may spawn **`coding-session`** after **AskQuestion** **Start coding session** (§5d) |

Field-level `outputs` and `continuationStatus` rules: each skill’s **`## Completion (spawned)`**.

### Implementation consent before worktrees (two layers)

| Layer | Skill | Primary output |
|-------|-------|----------------|
| 1 — Planning handoff | `pr-plan` | `readyForImplementation`, `implementationHandoffStatus` — does **not** advance §8 `phase` past `not-started` |
| 2 — Worktree open | `coding-session` | `developerApprovedImplementation` after **`plan-ws-completeness.mjs`** passes or override in the worktree-open gate |

**`pr-plan` → `coding-session`:** sequential skills on **different lanes**. **`pr-plan`** drafts §§ 1–4 and may sketch §§ 5–8; after **AskQuestion** **Start coding session**, **`pr-plan`** emits **`AGENT_RUN_REQUEST_V1`** for **`coding-session`** (§5d). The **child lane** then owns worktrees, workspace attach, **implementation in the worktree** (default), §§ 5–8 fill, and ship execution — not prompt-only handoff unless **`promptOnly: true`** or **Defer implementation**. Detached **`coding-session`** entry may use prompt-only or implement on that detached lane after layer 2. See **`pr-plan/SKILL.md`** § *Handoff to coding-session* and **`coding-session/SKILL.md`** § *Execution mode after worktree attach*.

## Ship spawn (detached / coding-session chain)

These skills run on **detached** or **nested** lanes (often **not** the Squad Leader). They use **domain-specific section titles** for long procedures; each dual-mode file has **`## Completion (spawned)`** (host terminal line) and **`## Completion (inline)`** (prose only, no sentinel). Detailed `outputs` lists live in the section named in the **Outputs section** column.

| Skill | Typical spawner | Outputs section | §8 ship phase hints |
|-------|-----------------|-----------------|---------------------|
| `coding-session` | Developer / mission dispatch; **`pr-plan`** spawn (default **spawned-lane** implement) | `## Implementation handoff result` (+ **`## Completion (inline)`** if same-lane) | Layer 2: `developerApprovedImplementation` after worktree-open gate; `shipPhase: implementing` when spawned child codes on lane (not prompt-only stop) |
| `pre-pr-review` | `coding-session` | Step 8 — Report and result | `pre-pr-review`; `recommendation: go` |
| `create-pr` | `coding-session` | `## Result contract` (+ lifecycle sections) | `pr-open`; `prUrl`, `prNumber` |
| `deploy-walk` | Developer phrase, **`create-pr`** after merge, or detached dispatch | `## Spawned result contract` | `deploy-walk`; entry points in **development-process.md** § *Ship chain* |
| `plan-reconcile` | Developer / `create-pr` after deploy | `## Spawned result contract` | `reconcile` → `done`; `archivedSlugs` |

The Squad Leader **§8** ship ledger does **not** auto-update when detached ship work finishes — post **Ship recap — plan and deliver** on the leader dispatch (or forward `AGENT_RESULT_RESPONSE_V1` as `child-output`). See **`../plan.mdc`** §8 and **development-process.md** § *Leader-lane ship recap*.

### Leader-lane ship recap

When a ship skill finishes a milestone on a **detached** lane, nudge the developer to paste the **Ship recap — plan and deliver** block on the **plan and deliver** Squad Leader dispatch (fields: `targetPlanPath`, `shipPhase`, `rowStatus`, optional `remainingTasks`, `prUrl`, `prNumber`). Full enum, natural-language mapping, and template: **`../plan.mdc`** §8 *Leader-lane ship recap*. Per-skill field hints: § *Squad Leader bubble-up* in each ship `SKILL.md` below.

## Inline-only (no spawn)

| Skill | Invoker | Result section | §8 ship ledger |
|-------|---------|------------------|----------------|
| `pr-review` | Active **`coding-session`** agent on its lane | `## Inline result for coding-session` | Leader **Ship recap** after triage — fields via **`coding-session`** § *Squad Leader bubble-up* (`shipPhase: pr-review`) |

**`pr-review`** returns through **`coding-session`** on the coding lane. Update §8 on the **plan and deliver** leader dispatch with the recap template (**`../plan.mdc`** §8).

## Required terminal line (all spawned children)

Every **spawned** child (planning and ship) ends with exactly one line on its lane:

`AGENT_RESULT_RESPONSE_V1` — same `correlationId` as the originating **`AGENT_RUN_REQUEST_V1`**; JSON fields `version`, `status` (`success` | `partial` | `failure` | `aborted` | `abandoned`), `summary` (1–3 sentences), `outputs` (per the skill’s completion section), optional `errors`. Re-emit an **updated** line after user-requested follow-up on that lane (same `correlationId`).

Populate `outputs` from the skill’s **`## Completion (spawned)`** and any referenced domain section above.

**Host protocol:** emit **exactly one** line — sentinel and **valid JSON on the same line** (no fence, no text after the JSON). Required keys: `version` (1), `correlationId` (spawn UUID), `status`, `summary`, `outputs`, `errors` (`[]` when none). Full format: **`.sedea/centers/sedea/skills/README.md`** § *Spawned terminal line* and **`.sedea/centers/sedea/rules/4_mission.mdc`** § *Agent session closure*.

### Terminal stop (normative for every spawned skill)

**This section is the canonical stop rule** for all **`## Completion (spawned)`** blocks in this mission, even when an individual `SKILL.md` ends that section after the host-protocol paragraph without repeating the sentence below.

After emitting **`AGENT_RESULT_RESPONSE_V1`**, **stop on that lane** for the current skill turn:

1. Do **not** emit another **`AGENT_RUN_REQUEST_V1`** unless a later user message on the same lane explicitly continues the skill (then re-emit an **updated** terminal line with the same `correlationId`).
2. Do **not** emit **`MC_DISPATCH_RESOLVED_V1`** — only the **plan and deliver** Squad Leader closes the dispatch.
3. Do **not** run the next protocol step in the same turn after the terminal line (including “wait for child” announcements — the stop applies **after** the sentinel is emitted).

**Canonical closing sentence** (optional in skill prose; meaning is required either way):

> Stop after the terminal line.

**Per-skill procedure stops** (e.g. “Stop after the step 5 handoff block”, “Stop after spawning and announce wait”) apply **before** the terminal line — they gate mid-skill work, not replace this rule. When both appear, order is: complete the gated step → emit **`AGENT_RESULT_RESPONSE_V1`** → **stop**.

| Skill | Explicit “Stop after the terminal line” in `## Completion (spawned)`? | Notes |
|-------|------------------------------------------------------------------------|--------|
| `author-prd` (prd mission) | Yes | Also forbids downstream planning spawns |
| `pr-plan` | Yes | May spawn **`coding-session`** in §5d before terminal; one spawn per turn |
| `master-plan` | Yes | Procedure stop before terminal when `continuationStatus: active`; Step 7 spawns on **later** user messages only |
| `delivery-phases`, `pr-breakdown`, `new-plan`, `ad-hoc-prd` | Yes | Step 6 / write handoff **before** terminal line; see each skill § *Completion (spawned)* |
| Ship chain (`coding-session`, `pre-pr-review`, `create-pr`, `deploy-walk`, `plan-reconcile`) | Yes | See each skill § *Completion (spawned)* |
| `phase-plan` | Yes | Same canonical stop sentence as **`pr-plan`** |

When authoring or reviewing a skill, duplicating the canonical sentence under **`## Completion (spawned)`** is encouraged but **not** required if this README is in **`warmUpRules`** or the spawn request passes it.

## Default warm-up

Every **spawned** plan-and-deliver skill lists the paths below in frontmatter **`warmUpRules`** (Mission Control merges with optional run-request **`warmUpRules`**). **`skills/README.md`** (this file) is **required** on all of them so § *Terminal stop (normative)* loads even when an individual `SKILL.md` omits the closing sentence.

**All spawned skills** (planning + ship):

- `.sedea/centers/research-and-development/missions/plan-and-deliver/plan.mdc` — Squad Leader §§1–7 ledger, spawn/wait; ship skills also use §8 via dev-process / bubble-up
- `.sedea/centers/research-and-development/missions/plan-and-deliver/skills/README.md` — spawn contracts, inline vs spawned shapes, **terminal stop (normative)**
- `.sedea/centers/research-and-development/docs/development-process.md`

**Planning skills** also include:

- `.sedea/centers/research-and-development/rules/30_planning-target-resolution.mdc`

**Ship skills** (`coding-session`, `pre-pr-review`, `create-pr`, `deploy-walk`, `plan-reconcile`) also include:

- `.sedea/centers/research-and-development/rules/20_efficient-pr-shipping.mdc`
- `.sedea/centers/research-and-development/rules/30_planning-target-resolution.mdc`

**`pr-review`** is inline-only — **no** frontmatter **`warmUpRules`**; it runs **only** on the active **`coding-session`** lane (which includes this README and rule **20**). Do not dispatch **`pr-review`** as a standalone skill session.

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
