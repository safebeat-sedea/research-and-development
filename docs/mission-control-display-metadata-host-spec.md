# Mission Control display metadata — host spec pointer (R&D)

This document is a **read-only pointer** for R&D agents and plan authors. The **host implementation** lives in the **hosting repo** Mission Control extension (not in the **research-and-development** center git repo). Do not treat this file as the normative authority table — use [`.sedea/centers/sedea/rules/9_display-metadata-authority.mdc`](.sedea/centers/sedea/rules/9_display-metadata-authority.mdc).

Phase **1** (host persistence + MCP tools) must be merged before agents rely on governed updates. Phase **2** PR **1** added rule **9**; this doc supports PR **2** (R&D rules + development-process cross-links).

---

## Additive bundle fields (dispatch tab)

Mission Control persists display metadata in **`dispatch-tab.v1.json`** under each dispatch bundle (see [`.sedea/centers/sedea/rules/0_hosting-repo.mdc`](.sedea/centers/sedea/rules/0_hosting-repo.mdc) § *Directory namespaces under `operations/`*).

| Scope | Fields (additive) | Written by |
|-------|-------------------|------------|
| **Dispatch chrome** | `dispatchTitle`, `dispatchDescription`, `dispatchHoverDescription` | **`mission_control_update_dispatch_display`** (Squad Leader only) |
| **Per-slot row** (`agentSlots[]`) | `title`, `description`, `hoverDescription` (plus existing `slug`, `role`, …) | **`mission_control_update_lane_display`** (caller slot only) |

**Read path:** Host merges bundle snapshot with lane memento — see hosting repo `extensions/mission-control/src/host/spawn/resolveLaneTabDisplay.ts` and `resolveLaneTabDisplayMerge.ts` (comments mark bundle fields as additive).

**Max lengths** (host validation): hosting repo `extensions/mission-control/src/shared/displayUpdateLimits.ts` — title / `dispatchTitle` **64** characters; description, hover, and dispatch long-form fields **512** characters.

---

## Governed MCP tools (names only)

| Tool | Caller | Patches |
|------|--------|---------|
| `mission_control_update_lane_display` | Agent on a lane | Own slot `title`, `description`, `hoverDescription` |
| `mission_control_update_dispatch_display` | Squad Leader | `dispatchTitle`, `dispatchDescription`, `dispatchHoverDescription` |

Audit: successful updates append **`display-metadata-updated`** events to **`dispatch-events.v1.ndjson`**. Agents must not edit bundle JSON directly.

---

## Stale tab title recovery

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Child tab shows generic spawn label after work started | Spawn `name` / initial copy was vague | **Child lane** calls **`mission_control_update_lane_display`** with accurate title/hover |
| Dispatch tab title does not match mission scope | Leader never updated dispatch chrome | **Squad Leader** calls **`mission_control_update_dispatch_display`** |
| User renamed in chat but UI unchanged | Chat is not the system of record | Owning lane runs the correct MCP tool per rule **9** |
| Reload restored old bundle snapshot | Expected — bundle is authoritative | Re-run MCP refresh on the **owning** lane after reload if labels are still wrong |

**Forbidden:** Leader relabeling a child slot via dispatch MCP; child calling dispatch MCP; hand-editing **`dispatch-tab.v1.json`**.

---

## Related hosting-repo references (implementation)

Workspace-root paths on the **hosting repo** that contains `extensions/mission-control/`:

| Asset | Path |
|-------|------|
| Display update limits | `extensions/mission-control/src/shared/displayUpdateLimits.ts` |
| Governed apply + permission matrix | `extensions/mission-control/src/host/displayUpdate/applyGovernedDisplayUpdate.ts` |
| Bundle read (additive dispatch fields) | `extensions/mission-control/src/host/spawn/resolveLaneTabDisplay.ts` |
| Integration tests | `extensions/mission-control/src/host/displayUpdate/displayMetadataPermissionMatrix.integration.test.ts` |

R&D center agents **reference** these paths in plans and docs; **implement** host changes in the hosting repo, not in this center submodule.

---

## Related R&D governance

- R&D discipline rule: [`.sedea/centers/research-and-development/rules/50_mission-control-display-metadata-discipline.mdc`](../rules/50_mission-control-display-metadata-discipline.mdc)
- Platform authority: [`.sedea/centers/sedea/rules/9_display-metadata-authority.mdc`](.sedea/centers/sedea/rules/9_display-metadata-authority.mdc)
- Agent UX pitfalls: [`.sedea/centers/research-and-development/docs/development-process.md`](development-process.md) § *Agent UX pitfalls*
