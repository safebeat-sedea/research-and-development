#!/usr/bin/env node
/**
 * Compare center.yaml skillEntries to on-disk mission skill SKILL.md files.
 * Run from hosting repo root (directory containing .sedea/).
 *
 *   node .sedea/centers/research-and-development/missions/plan-and-deliver/scripts/verify-skill-manifest.mjs
 *
 * Exit 0 when lists match; exit 1 and print diffs otherwise.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CENTER_ROOT = path.resolve(__dirname, '../../..');
const CENTER_YAML = path.join(CENTER_ROOT, 'center.yaml');
const MISSIONS_ROOT = path.join(CENTER_ROOT, 'missions');

function die(msg) {
  process.stderr.write(`${msg}\n`);
  process.exit(1);
}

async function listSkillFilesOnDisk() {
  const out = new Set();
  let missions;
  try {
    missions = await fs.readdir(MISSIONS_ROOT, { withFileTypes: true });
  } catch (e) {
    die(`cannot read missions dir: ${MISSIONS_ROOT}`);
  }
  for (const m of missions) {
    if (!m.isDirectory()) continue;
    const skillsDir = path.join(MISSIONS_ROOT, m.name, 'skills');
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
        if (st.isFile()) {
          out.add(
            `missions/${m.name}/skills/${e.name}/SKILL.md`.replace(/\\/g, '/'),
          );
        }
      } catch {
        /* skip */
      }
    }
  }
  return out;
}

function parseSkillEntriesFromYaml(text) {
  const listed = new Set();
  const lines = text.split('\n');
  let inSkillEntries = false;
  for (const line of lines) {
    if (/^\s+skillEntries:\s*$/.test(line)) {
      inSkillEntries = true;
      continue;
    }
    if (inSkillEntries) {
      const m = line.match(/^\s+-\s+(missions\/[^\s#]+\/SKILL\.md)\s*$/);
      if (m) {
        listed.add(m[1]);
        continue;
      }
      if (/^\s+\w+:/.test(line) && !/^\s+-\s+/.test(line)) {
        inSkillEntries = false;
      }
    }
  }
  return listed;
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

async function validateSkillFrontmatter(repoRelativePath) {
  const abs = path.join(CENTER_ROOT, repoRelativePath);
  const raw = await fs.readFile(abs, 'utf8');
  const m = FRONTMATTER_RE.exec(raw);
  if (!m) {
    return `${repoRelativePath}: missing YAML frontmatter (--- ... ---)`;
  }
  let parsed;
  try {
    parsed = parseYaml(m[1]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return `${repoRelativePath}: frontmatter YAML parse error — ${msg.split('\n')[0]}`;
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return `${repoRelativePath}: frontmatter must be a YAML map`;
  }
  if (parsed.inputs !== undefined && parsed.inputs !== null) {
    if (typeof parsed.inputs !== 'object' || Array.isArray(parsed.inputs)) {
      return `${repoRelativePath}: frontmatter \`inputs\` must be a map keyed by input name`;
    }
    for (const [inputName, value] of Object.entries(parsed.inputs)) {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return `${repoRelativePath}: inputs.${inputName} must be a map (type/description/required) — check YAML indentation (2 spaces per input, 4 for fields)`;
      }
      if (typeof value.type !== 'string') {
        return `${repoRelativePath}: inputs.${inputName}.type must be a string`;
      }
    }
  }
  return undefined;
}

async function main() {
  const yamlText = await fs.readFile(CENTER_YAML, 'utf8');
  const listed = parseSkillEntriesFromYaml(yamlText);
  const disk = await listSkillFilesOnDisk();

  const frontmatterErrors = [];
  for (const rel of disk) {
    const err = await validateSkillFrontmatter(rel);
    if (err) frontmatterErrors.push(err);
  }
  if (frontmatterErrors.length) {
    process.stderr.write('SKILL.md frontmatter validation failed:\n');
    for (const e of frontmatterErrors) process.stderr.write(`  ${e}\n`);
    process.exit(1);
  }

  const onlyYaml = [...listed].filter((p) => !disk.has(p)).sort();
  const onlyDisk = [...disk].filter((p) => !listed.has(p)).sort();

  if (onlyYaml.length === 0 && onlyDisk.length === 0) {
    process.stdout.write(
      `OK: center.yaml skillEntries (${listed.size}) matches disk (${disk.size}); frontmatter valid on all disk skills\n`,
    );
    process.exit(0);
  }

  process.stderr.write('skill manifest mismatch\n');
  if (onlyYaml.length) {
    process.stderr.write('\nIn center.yaml only (missing on disk or wrong path):\n');
    for (const p of onlyYaml) process.stderr.write(`  ${p}\n`);
  }
  if (onlyDisk.length) {
    process.stderr.write('\nOn disk only (add to center.yaml skillEntries):\n');
    for (const p of onlyDisk) process.stderr.write(`  ${p}\n`);
  }
  process.exit(1);
}

main().catch((err) => die(String(err)));
