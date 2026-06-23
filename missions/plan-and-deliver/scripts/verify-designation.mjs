#!/usr/bin/env node
/**
 * Verify non-empty designation.allowed / designation.forbidden on center catalog
 * SKILL.md paths (center.yaml skillEntries) and Pathfinder warm-up doc.
 *
 * Run from hosting repo root:
 *
 *   node .sedea/centers/research-and-development/missions/plan-and-deliver/scripts/verify-designation.mjs
 *
 * Exit 0 when all targets pass; exit 1 with prefixed errors otherwise.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

const CENTER_CATALOGS = [
  {
    centerSlug: 'research-and-development',
    centerYaml: path.resolve(__dirname, '../../../center.yaml'),
    centerRoot: path.resolve(__dirname, '../../..'),
  },
  {
    centerSlug: 'sedea',
    centerYaml: path.resolve(__dirname, '../../../../sedea/center.yaml'),
    centerRoot: path.resolve(__dirname, '../../../../sedea'),
  },
];

const PATHFINDER_WARMUP_REL = '.sedea/centers/sedea/pathfinder_mission.mdc';

function die(msg) {
  process.stderr.write(`${msg}\n`);
  process.exit(1);
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function formatListField(value) {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  if (Array.isArray(value)) {
    const parts = value
      .filter((entry) => typeof entry === 'string' && entry.trim().length > 0)
      .map((entry) => entry.trim());
    if (parts.length > 0) {
      return parts.join('; ');
    }
  }
  return undefined;
}

/** Mirror agentDesignation.ts coerceDesignationField — require both fields for lint. */
function parseDesignation(raw) {
  if (typeof raw === 'string') {
    const text = raw.trim();
    if (text.length === 0) {
      return undefined;
    }
    const allowedMatch = /allowed:\s*(.+)/i.exec(text);
    const forbiddenMatch = /forbidden:\s*(.+)/i.exec(text);
    if (allowedMatch || forbiddenMatch) {
      return {
        allowed: allowedMatch?.[1]?.trim(),
        forbidden: forbiddenMatch?.[1]?.trim(),
      };
    }
    return { allowed: text, forbidden: undefined };
  }
  if (!isRecord(raw)) {
    return undefined;
  }
  return {
    allowed: formatListField(raw.allowed),
    forbidden: formatListField(raw.forbidden),
  };
}

async function resolveHostingRoot() {
  let dir = process.cwd();
  for (let depth = 0; depth < 32; depth += 1) {
    try {
      await fs.access(path.join(dir, '.sedea/centers/sedea'));
      return dir;
    } catch {
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  die('could not resolve hosting repo root — run from HOSTING_ROOT');
}

function collectSkillEntriesFromYaml(parsed) {
  const out = new Set();
  if (!isRecord(parsed)) {
    return out;
  }
  const missions = parsed.missions;
  if (Array.isArray(missions)) {
    for (const mission of missions) {
      if (!isRecord(mission)) continue;
      const entries = mission.skillEntries;
      if (!Array.isArray(entries)) continue;
      for (const entry of entries) {
        if (typeof entry === 'string' && entry.trim().length > 0) {
          out.add(entry.trim().replace(/\\/g, '/'));
        }
      }
    }
  }
  const centerSkills = parsed.centerSkills;
  if (isRecord(centerSkills) && Array.isArray(centerSkills.skillEntries)) {
    for (const entry of centerSkills.skillEntries) {
      if (typeof entry === 'string' && entry.trim().length > 0) {
        out.add(entry.trim().replace(/\\/g, '/'));
      }
    }
  }
  return out;
}

async function loadCenterCatalogTargets(hostingRoot) {
  const targets = new Map();

  for (const catalog of CENTER_CATALOGS) {
    let raw;
    try {
      raw = await fs.readFile(catalog.centerYaml, 'utf8');
    } catch (err) {
      die(`cannot read ${catalog.centerYaml}: ${err.message}`);
    }
    let parsed;
    try {
      parsed = parseYaml(raw);
    } catch (err) {
      die(`invalid YAML in ${catalog.centerYaml}: ${err.message}`);
    }
    for (const rel of collectSkillEntriesFromYaml(parsed)) {
      const abs = path.join(catalog.centerRoot, rel);
      const repoRel = path.relative(hostingRoot, abs).replace(/\\/g, '/');
      targets.set(repoRel, abs);
    }
  }

  targets.set(PATHFINDER_WARMUP_REL, path.join(hostingRoot, PATHFINDER_WARMUP_REL));
  return [...targets.entries()].sort(([a], [b]) => a.localeCompare(b));
}

async function validateDesignationFile(repoRel, absPath) {
  let raw;
  try {
    raw = await fs.readFile(absPath, 'utf8');
  } catch (err) {
    return [`${repoRel}: cannot read file (${err.message})`];
  }
  const match = FRONTMATTER_RE.exec(raw);
  if (!match) {
    return [`${repoRel}: missing YAML frontmatter`];
  }
  let parsed;
  try {
    parsed = parseYaml(match[1]);
  } catch (err) {
    return [`${repoRel}: invalid frontmatter YAML (${err.message})`];
  }
  if (!isRecord(parsed)) {
    return [`${repoRel}: frontmatter must be a mapping`];
  }
  const designation = parseDesignation(parsed.designation);
  const errors = [];
  if (!designation) {
    errors.push(`${repoRel}: missing designation frontmatter`);
    return errors;
  }
  if (!designation.allowed || designation.allowed.length === 0) {
    errors.push(`${repoRel}: designation.allowed is missing or empty`);
  }
  if (!designation.forbidden || designation.forbidden.length === 0) {
    errors.push(`${repoRel}: designation.forbidden is missing or empty`);
  }
  return errors;
}

async function main() {
  const hostingRoot = await resolveHostingRoot();
  const targets = await loadCenterCatalogTargets(hostingRoot);
  const errors = [];

  for (const [repoRel, absPath] of targets) {
    try {
      await fs.access(absPath);
    } catch {
      errors.push(`${repoRel}: file not found`);
      continue;
    }
    errors.push(...(await validateDesignationFile(repoRel, absPath)));
  }

  if (errors.length > 0) {
    for (const err of errors) {
      process.stderr.write(`verify-designation: ${err}\n`);
    }
    process.exit(1);
  }

  process.stdout.write(`OK: designation verified on ${targets.length} catalog path(s)\n`);
}

main().catch((err) => die(err?.stack ?? String(err)));
