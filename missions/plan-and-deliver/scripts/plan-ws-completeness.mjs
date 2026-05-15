#!/usr/bin/env node
// Gate for **coding-session** / plan-anchored worktree handoff: per-PR plans must not
// contain `_TBD_` placeholders in the markdown body (executor-filled sections) unless
// the user explicitly overrides. See missions/plan-and-deliver/skills/coding-session/SKILL.md.
//
// Usage (from hosting repo root):
//   node .sedea/centers/sedea-centers--development/missions/plan-and-deliver/scripts/plan-ws-completeness.mjs --file /absolute/path/to/plan.plan.md
//
// Exit codes:
//   0 — Gate passes: not a per-PR plan body, or per-PR plan with no `_TBD_` in prose.
//   1 — Per-PR plan still has `_TBD_` after stripping fenced code blocks (incomplete).
//   2 — Missing --file, file not found, or not a regular file.

import * as fs from 'node:fs';
import * as path from 'node:path';

function usage() {
  process.stderr.write(
    'usage: node plan-ws-completeness.mjs --file /absolute/path/to.plan.md\n',
  );
}

function splitMarkdownBody(raw) {
  if (!raw.startsWith('---\n')) return raw;
  const close = raw.indexOf('\n---\n', 4);
  if (close === -1) return raw;
  return raw.slice(close + 5);
}

/** Remove fenced ``` blocks so `_TBD_` in examples does not false-positive. */
function stripFencedCodeBlocks(md) {
  return md.replace(/^```[\w.-]*\n[\s\S]*?^```\n?/gm, '');
}

/**
 * Per-PR plan (mode #3): numbered Single concern + Background + Change scope + Reasoning,
 * or unambiguously not a Phase plan (Phase uses ## 1. Background / ## 2. Scope / ## 3. Code design).
 */
function isPerPrPlanBody(body) {
  if (/\n##\s*1\.\s*Single concern\b/m.test(body)) return true;
  if (/\n##\s*1\.\s*Background\b/m.test(body) && /\n##\s*2\.\s*Scope\b/m.test(body)) return false;
  if (
    /\n##\s*2\.\s*Background\b/m.test(body) &&
    /\n##\s*3\.\s*Change scope\b/m.test(body) &&
    /\n##\s*4\.\s*Reasoning\b/m.test(body)
  ) {
    return true;
  }
  return false;
}

function hasTbdPlaceholder(body) {
  return stripFencedCodeBlocks(body).includes('_TBD_');
}

function main() {
  const argv = process.argv.slice(2);
  let file = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--file' && argv[i + 1]) {
      file = argv[++i];
      continue;
    }
    if (a.startsWith('--file=')) {
      file = a.slice('--file='.length);
      continue;
    }
    process.stderr.write(`plan-ws-completeness: unknown argument: ${a}\n`);
    usage();
    process.exit(2);
  }
  if (!file) {
    usage();
    process.exit(2);
  }
  const abs = path.resolve(file);
  let raw;
  try {
    raw = fs.readFileSync(abs, 'utf8');
  } catch {
    process.stderr.write(`plan-ws-completeness: cannot read file: ${abs}\n`);
    process.exit(2);
  }
  const body = splitMarkdownBody(raw);
  if (!isPerPrPlanBody(body)) {
    process.stdout.write('SKIP_NOT_PER_PR\n');
    process.exit(0);
  }
  if (hasTbdPlaceholder(body)) {
    process.stdout.write('INCOMPLETE\n');
    process.exit(1);
  }
  process.stdout.write('OK\n');
  process.exit(0);
}

main();
