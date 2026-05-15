---
name: create-pr
description: >-
  Generate a copy-pasteable prompt for a PR-creating agent to create a GitHub PR.
---

# A PR-creating agent Prompt

Generate a prompt for **a PR-creating agent** to create a GitHub PR. Gather the required info automatically:

1. **Current branch**: `git branch --show-current`
2. **Base branch**: `git log --oneline --decorate --all` or `git merge-base` to determine the branch this was forked from. Use the most recent parent branch that has a remote tracking branch (e.g. `main`, `phase-1/...`). If ambiguous, ask the user.
3. **Repo URL**: parse from `git remote get-url origin` (e.g. `https://github.com/sedea-ai/app`).
4. **Changes summary**: review `git diff <base-branch>...HEAD` and the conversation context. You have better context than **a PR-creating agent** — the description starter must be **reviewer-complete** (see `.sedea/centers/sedea-centers--development/rules/efficient-pr-shipping.mdc` → **Comprehensive PR descriptions** → **a PR-creating agent prompt and proportional context**). Scale length to PR size; small PRs stay short but still cover **why this slice**, **not in this PR**, **plan lineage** when work came from a plan, and **how to verify** (tests / observable behaviour), plus the usual what/why and behavioural deltas.

Then print the following inside a fenced code block (so the user can copy it):

```
Create a PR for the branch I pushed: `<current-branch>`
In the <repo-url> repo
The base branch is `<base-branch>`

Use past tense for the PR title.

Here is a summary of the changes as a starting point for the PR description (verify against the diff and adjust as needed). Use bullets; keep it proportional to PR size but do not omit reasoning:

- Why this slice / motivation (enough that a reviewer can tell intent vs mistake)
- What changed (behaviour, APIs, schema, config)
- Not in this PR (deferrals, parent scope left out on purpose)
- Plan lineage (if applicable): path or slug to `.sedea/operations/**/plans/<slug>.plan.md` and optional pointer to Mermaid in the plan
- Intentional non-changes (if any)
- How to verify (which tests or observable behaviour — no separate test-plan essay)
```
