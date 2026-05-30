#!/usr/bin/env node
/**
 * Repair SKILL.md YAML frontmatter indentation so Mission Control skillResolver
 * can parse inputs (2 spaces per input name, 4 spaces for type/description/required/default).
 *
 *   node .sedea/centers/research-and-development/missions/plan-and-deliver/scripts/fix-skill-frontmatter.mjs [--write]
 *
 * Without --write, prints files that would change. With --write, updates in place.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CENTER_ROOT = path.resolve(__dirname, '../../..');
const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

const TOP_KEYS = new Set(['name', 'description', 'inputs', 'warmUpRules', 'timeoutMs']);
const SPEC_KEYS = new Set(['type', 'description', 'required', 'default']);

function keyOf(trimmed) {
  const m = trimmed.match(/^([a-zA-Z][a-zA-Z0-9]*):/);
  return m ? m[1] : null;
}

function isFoldedScalar(line) {
  return line.includes('>-') || line.includes('|');
}

/** @param {string} fm */
function fixFrontmatter(fm) {
  const lines = fm.split('\n');
  /** @type {'ROOT' | 'DESC_FOLD' | 'INPUTS' | 'INPUT_SPEC' | 'INPUT_DESC_FOLD' | 'WARMUP'} */
  let state = 'ROOT';
  const out = [];

  for (const line of lines) {
    const trimmed = line.trimStart();
    if (trimmed === '') {
      out.push('');
      continue;
    }

    const atRoot = line.length === trimmed.length;
    const key = keyOf(trimmed);

    if (state === 'DESC_FOLD') {
      if (atRoot && key && TOP_KEYS.has(key)) {
        state = 'ROOT';
      } else {
        out.push(` ${trimmed}`);
        continue;
      }
    }

    if (atRoot && key && TOP_KEYS.has(key)) {
      out.push(trimmed);
      if (key === 'description') {
        state = isFoldedScalar(trimmed) ? 'DESC_FOLD' : 'ROOT';
      } else if (key === 'inputs') {
        state = 'INPUTS';
      } else if (key === 'warmUpRules') {
        state = 'WARMUP';
      } else {
        state = 'ROOT';
      }
      continue;
    }

    if (state === 'WARMUP') {
      if (trimmed.startsWith('- ')) {
        out.push(`  ${trimmed}`);
        continue;
      }
      if (atRoot && key && TOP_KEYS.has(key)) {
        out.push(trimmed);
        state = key === 'inputs' ? 'INPUTS' : 'ROOT';
        continue;
      }
    }

    if (state === 'INPUT_DESC_FOLD') {
      if (key && SPEC_KEYS.has(key)) {
        out.push(`    ${trimmed}`);
        state = key === 'default' ? 'INPUTS' : 'INPUT_SPEC';
        continue;
      }
      if (key && trimmed.endsWith(':') && !SPEC_KEYS.has(key)) {
        out.push(`  ${trimmed}`);
        state = 'INPUT_SPEC';
        continue;
      }
      out.push(`      ${trimmed}`);
      continue;
    }

    if (state === 'INPUTS' || state === 'INPUT_SPEC') {
      if (atRoot && key && TOP_KEYS.has(key)) {
        out.push(trimmed);
        if (key === 'warmUpRules') {
          state = 'WARMUP';
        } else if (key === 'inputs') {
          state = 'INPUTS';
        } else {
          state = 'ROOT';
        }
        continue;
      }

      if (key && SPEC_KEYS.has(key)) {
        out.push(`    ${trimmed}`);
        if (key === 'description' && isFoldedScalar(trimmed)) {
          state = 'INPUT_DESC_FOLD';
        } else if (key === 'default') {
          state = 'INPUTS';
        } else {
          state = 'INPUT_SPEC';
        }
        continue;
      }

      if (key && trimmed.endsWith(':')) {
        out.push(`  ${trimmed}`);
        state = 'INPUT_SPEC';
        continue;
      }
    }

    out.push(line);
  }

  return out.join('\n');
}

async function listSkillFiles() {
  const missionsRoot = path.join(CENTER_ROOT, 'missions');
  const out = [];
  const missions = await fs.readdir(missionsRoot, { withFileTypes: true });
  for (const m of missions) {
    if (!m.isDirectory()) continue;
    const skillsDir = path.join(missionsRoot, m.name, 'skills');
    let entries;
    try {
      entries = await fs.readdir(skillsDir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      const skillPath = path.join(skillsDir, e.name, 'SKILL.md');
      try {
        const st = await fs.stat(skillPath);
        if (st.isFile()) out.push(skillPath);
      } catch {
        /* skip */
      }
    }
  }
  return out.sort();
}

function validateFrontmatter(fm, file) {
  parseYaml(fm);
  const parsed = parseYaml(fm);
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${file}: frontmatter must be a YAML map`);
  }
  if (parsed.inputs !== undefined && parsed.inputs !== null) {
    for (const [inputName, value] of Object.entries(parsed.inputs)) {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new Error(`${file}: inputs.${inputName} must be a map with type/description/required`);
      }
      if (typeof value.type !== 'string') {
        throw new Error(`${file}: inputs.${inputName}.type must be a string`);
      }
    }
  }
}

async function processFile(absPath, write) {
  const raw = await fs.readFile(absPath, 'utf8');
  const m = FRONTMATTER_RE.exec(raw);
  if (!m) {
    return { path: absPath, status: 'skip', reason: 'no frontmatter' };
  }

  const fixed = fixFrontmatter(m[1]);
  if (fixed === m[1]) {
    try {
      validateFrontmatter(fixed, absPath);
      return { path: absPath, status: 'ok' };
    } catch (err) {
      return { path: absPath, status: 'invalid', reason: String(err.message || err) };
    }
  }

  const next = raw.replace(FRONTMATTER_RE, `---\n${fixed}\n---\n`);
  try {
    validateFrontmatter(fixed, absPath);
  } catch (err) {
    return { path: absPath, status: 'fix-failed', reason: String(err.message || err) };
  }

  if (write) {
    await fs.writeFile(absPath, next, 'utf8');
  }
  return { path: absPath, status: write ? 'fixed' : 'would-fix' };
}

async function main() {
  const write = process.argv.includes('--write');
  const files = await listSkillFiles();
  const results = [];
  for (const f of files) {
    results.push(await processFile(f, write));
  }

  for (const r of results) {
    if (r.status === 'ok') continue;
    const rel = path.relative(CENTER_ROOT, r.path);
    if (r.reason) {
      process.stderr.write(`${r.status}: ${rel} — ${r.reason}\n`);
    } else {
      process.stdout.write(`${r.status}: ${rel}\n`);
    }
  }

  const bad = results.filter((r) =>
    ['invalid', 'fix-failed', 'would-fix', 'fixed'].includes(r.status),
  );
  if (bad.some((r) => r.status === 'invalid' || r.status === 'fix-failed')) {
    process.exit(1);
  }
  if (!write && bad.some((r) => r.status === 'would-fix')) {
    process.stderr.write('\nRe-run with --write to apply fixes.\n');
    process.exit(2);
  }
  process.stdout.write(`Processed ${files.length} SKILL.md file(s).\n`);
}

main().catch((err) => {
  process.stderr.write(String(err) + '\n');
  process.exit(1);
});
