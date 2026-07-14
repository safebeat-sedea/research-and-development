#!/usr/bin/env node
/**
 * MCP-only spawn/result skill acceptance — skills_mcp_only_docs PR.
 *
 * Validates every SKILL.md with `## Completion (spawned)` declares MCP tools,
 * MCP result preflight, and no legacy sentinel protocol strings.
 *
 * Run from hosting repo root:
 *
 *   node .sedea/centers/research-and-development/missions/plan-and-deliver/scripts/verify-opt-in-skill-mcp.mjs
 *
 * Exit 0 when all checks pass; exit 1 otherwise.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CENTERS_ROOT = path.resolve(__dirname, '../../../../../');

/** Legacy sentinel strings — must not appear in skill docs after MCP-only migration. */
const RUN_TOKEN = 'AGENT_RUN_' + 'REQUEST_V1';
const RESULT_TOKEN = 'AGENT_RESULT_' + 'RESPONSE_V1';
const FORBIDDEN_SENTINELS = new RegExp(`${RUN_TOKEN}|${RESULT_TOKEN}`);

/** Skills exempt from spawn-table requirements (inline-only policy). */
const INLINE_ONLY_EXEMPT = new Set([
  'centers/sedea/skills/intent-drift-triage/SKILL.md',
]);

async function walk(dir, out = []) {
  for (const ent of await fs.readdir(dir, { withFileTypes: true })) {
    if (ent.name === '.git') continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) await walk(p, out);
    else if (ent.name === 'SKILL.md') out.push(p);
  }
  return out;
}

/**
 * @param {string} body
 * @param {string} rel
 */
function lintSpawnSkillBody(body, rel) {
  const errors = [];
  if (!/^## Completion \(spawned\)/m.test(body)) return errors;
  if (INLINE_ONLY_EXEMPT.has(rel)) return errors;

  if (FORBIDDEN_SENTINELS.test(body)) {
    errors.push(`${rel}: must not document sentinel spawn/result protocol`);
  }
  if (body.includes('### Host protocol line (required)')) {
    errors.push(`${rel}: replace ### Host protocol line with ### MCP result preflight`);
  }
  if (!body.includes('mission_control_send_agent_result')) {
    errors.push(`${rel}: missing mission_control_send_agent_result reference`);
  }
  if (!body.includes('### MCP result preflight')) {
    errors.push(`${rel}: Completion (spawned) must include ### MCP result preflight`);
  }
  if (!body.includes('## Agent messaging (MCP)')) {
    errors.push(`${rel}: missing ## Agent messaging (MCP) section`);
  }
  if (
    body.includes('mission_control_spawn_agent') === false &&
    !body.includes('Spawned only') &&
    !body.includes('spawn-only')
  ) {
    // Terminal-only spawned skills still reference parent spawn in prose — allow when no child spawn documented
    if (!/inline only|Inline only|inline-only/i.test(body)) {
      errors.push(`${rel}: missing mission_control_spawn_agent reference for spawned skill`);
    }
  }
  return errors;
}

function die(msg) {
  process.stderr.write(`verify-opt-in-skill-mcp: ${msg}\n`);
  process.exit(1);
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

async function main() {
  const hostingRoot = await resolveHostingRoot();
  const skillPaths = await walk(CENTERS_ROOT);
  const allErrors = [];
  let checked = 0;

  for (const abs of skillPaths) {
    const rel = path.relative(CENTERS_ROOT, abs);
    let raw;
    try {
      raw = await fs.readFile(abs, 'utf8');
    } catch (err) {
      allErrors.push(`${rel}: read failed (${err.message})`);
      continue;
    }
    if (!/^## Completion \(spawned\)/m.test(raw)) continue;
    checked += 1;
    allErrors.push(...lintSpawnSkillBody(raw, rel));
  }

  if (allErrors.length) {
    process.stderr.write('skill MCP-only acceptance failed:\n');
    for (const e of allErrors) process.stderr.write(`  ${e}\n`);
    process.exit(1);
  }

  process.stdout.write(
    `verify-opt-in-skill-mcp: OK (${checked} spawned skill(s) from ${hostingRoot})\n`,
  );
}

main().catch((err) => die(err.message));
