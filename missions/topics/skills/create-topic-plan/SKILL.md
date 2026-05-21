---
name: create-topic-plan
description: Create a root-level topic `.plan.md` and `.state.yaml` sidecar in the operations plan tree.
inputs:
  topicName:
    type: string
    description: Human-friendly topic name.
    required: true
  topicDescription:
    type: string
    description: High-level topic description used for overview fields.
    required: true
  objectives:
    type: array
    description: Optional objective strings to include under `## Objectives`.
    required: false
    default: []
  storageScope:
    type: string
    description: Either `user` or `joint`.
    required: true
  operationsUserId:
    type: string
    description: Current Sedea operations user id for user-private topic plans.
    required: true
---

# Create Topic Plan

Create one root-level topic plan and its sidecar under the selected Sedea operations plan tree. This skill writes planning metadata only; it does not draft delivery phases, PR breakdowns, worktrees, or implementation tasks.

## Inputs

- `topicName`: human-friendly topic name.
- `topicDescription`: concise description for the plan frontmatter `overview` and `## Overview`.
- `objectives`: optional list of high-level objective strings.
- `storageScope`: `user` or `joint`.
- `operationsUserId`: Mission Control supplied operations user id.

## Procedure

1. Validate required inputs:
   - `topicName` and `topicDescription` must be non-empty after trimming.
   - `storageScope` must be exactly `user` or `joint`.
   - `operationsUserId` must be non-empty when `storageScope` is `user`.
2. Resolve output directory (operations checkout; **created on first topic write** when absent):
   - `user` -> `.sedea/operations/<operationsUserId>/plans/roadmap-topics/`
   - `joint` -> `.sedea/operations/joint/plans/roadmap-topics/`
3. Derive the filename stem:
   - Lowercase `topicName`.
   - Replace non-letter and non-digit runs with `_`.
   - Collapse repeated `_` characters.
   - Trim leading and trailing `_` characters.
   - Append `_` plus an 8-character lowercase hex suffix.
4. Create the output directory when absent (`mkdir -p` on the resolved path).
5. Write `<stem>.plan.md`:

   ```markdown
   ---
   name: <topicName>
   overview: <topicDescription>
   todos: []
   isProject: false
   ---

   # <topicName>

   ## Overview

   <topicDescription>

   ## Objectives

   - <objective>
   ```

   Omit `## Objectives` when `objectives` is empty. Quote YAML scalars when needed so `name` and `overview` parse as strings.
6. Write `<stem>.state.yaml`:

   ```yaml
   # Sidecar for Plan Board (runtime). Plan: <stem>.plan.md
   parent: null
   worktrees: []
   prs: []
   ```

7. Re-read both files and verify:
   - The plan frontmatter includes `name`, `overview`, `todos`, and `isProject`.
   - The plan does not include `Delivery phases`, `PR breakdown`, `Changes`, or `Caveats`.
   - The sidecar has `parent: null`, `worktrees: []`, and `prs: []`.

## Output Contract

Return a structured result with:

- `status`: `created`, `partial`, or `failure`.
- `planPath`: created plan path.
- `sidecarPath`: created sidecar path.
- `storageScope`: `user` or `joint`.
- `topicSlug`: filename stem without extension.
- `remainingTasks`: user or agent follow-up tasks, empty when creation is complete.

## Safety Constraints

- Never overwrite an existing `.plan.md` or `.state.yaml`.
- Never create files outside `.sedea/operations/<operationsUserId>/plans/roadmap-topics/` or `.sedea/operations/joint/plans/roadmap-topics/`.
- Do not create delivery-side sections or implementation artifacts.
