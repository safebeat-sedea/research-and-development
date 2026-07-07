#!/usr/bin/env node
/**
 * Opt-in skill MCP migration acceptance — Phase 2 PR 2.
 *
 * Validates that documented MCP-primary skills declare MCP spawn/result tools,
 * MCP-only spawn/result docs and Completion (spawned) MCP result preflight.
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
const CENTER_ROOT = path.resolve(__dirname, '../../..');

/** Skills that document MCP-primary spawn/result (expand in Phase 3+). */
const OPT_IN_MCP_PRIMARY_SKILLS = [
  {
    skillDir: 'phase-planner',
    relPath:
      'missions/plan-and-deliver/skills/phase-planner/SKILL.md',
    requiredSection: '## Agent messaging (MCP)',
  },
];

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

/**
 * @param {string} body
 * @param {string} rel
 */
function lintOptInSkillBody(body, rel) {
  const errors = [];
  const mustInclude = [
    'mission_control_spawn_agent',
    'mission_control_send_agent_result',
    'MCP spawn preflight',
    'MCP result',
  ];
  for (const needle of mustInclude) {
    if (!body.includes(needle)) {
      errors.push(`${rel}: missing required MCP migration marker "${needle}"`);
    }
  }
  if (/AGENT_RUN_REQUEST_V1|AGENT_RESULT_RESPONSE_V1/.test(body)) {
    errors.push(`${rel}: must not document sentinel spawn/result protocol`);
  }
  if (!body.includes('### MCP result preflight')) {
    errors.push(`${rel}: Completion (spawned) must include ### MCP result preflight`);
  }
  return errors;
}

async function main() {
  const hostingRoot = await resolveHostingRoot();
  const allErrors = [];

  for (const entry of OPT_IN_MCP_PRIMARY_SKILLS) {
    const abs = path.join(CENTER_ROOT, entry.relPath);
    let raw;
    try {
      raw = await fs.readFile(abs, 'utf8');
    } catch (err) {
      allErrors.push(`${entry.relPath}: read failed (${err.message})`);
      continue;
    }
    if (!raw.includes(entry.requiredSection)) {
      allErrors.push(`${entry.relPath}: missing section "${entry.requiredSection}"`);
    }
    allErrors.push(...lintOptInSkillBody(raw, entry.relPath));
  }

  if (allErrors.length) {
    process.stderr.write('opt-in skill MCP acceptance failed:\n');
    for (const e of allErrors) process.stderr.write(`  ${e}\n`);
    process.exit(1);
  }

  process.stdout.write(
    `verify-opt-in-skill-mcp: OK (${OPT_IN_MCP_PRIMARY_SKILLS.length} skill(s) from ${hostingRoot})\n`,
  );
}

main().catch((err) => die(err.message));
