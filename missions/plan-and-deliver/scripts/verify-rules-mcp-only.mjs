#!/usr/bin/env node
/**
 * MCP-only governance rules acceptance — rules_sentinel_scrub PR.
 *
 * Validates center + hosting rules targeted by Phase 4 PR 2 declare MCP spawn/result
 * only — no legacy AGENT_* sentinel protocol strings or dual-stack fallback docs.
 *
 * Run from hosting repo root:
 *
 *   node .sedea/centers/research-and-development/missions/plan-and-deliver/scripts/verify-rules-mcp-only.mjs
 *
 * Exit 0 when all checks pass; exit 1 otherwise.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Repo-relative paths scrubbed in PR 2 (rules_sentinel_scrub). */
const RULE_PATHS = [
  '.sedea/centers/sedea/rules/4_mission.mdc',
  '.sedea/centers/sedea/rules/0_hosting-repo.mdc',
  '.sedea/centers/sedea/rules/2_ask-question-instructions.mdc',
  '.sedea/centers/sedea/rules/9_display-metadata-authority.mdc',
  '.sedea/centers/research-and-development/rules/20_efficient-pr-shipping.mdc',
  '.sedea/centers/research-and-development/rules/30_planning-target-resolution.mdc',
  '.sedea/centers/research-and-development/rules/50_mission-control-display-metadata-discipline.mdc',
  '.cursor/rules/mission-control-agent-runtime.mdc',
];

const RUN_TOKEN = 'AGENT_RUN_' + 'REQUEST_V1';
const RESULT_TOKEN = 'AGENT_RESULT_' + 'RESPONSE_V1';

const FORBIDDEN = [
  { label: RUN_TOKEN, re: new RegExp(RUN_TOKEN) },
  { label: RESULT_TOKEN, re: new RegExp(RESULT_TOKEN) },
  { label: 'dual-stack fallback doc', re: /dual-stack|routeAgentMessagingDualStack/i },
  { label: 'sentinel fallback doc', re: /sentinel fallback/i },
  { label: 're-issue terminal sentinel nudge', re: /Re-issue the same terminal line/i },
];

function die(msg) {
  process.stderr.write(`verify-rules-mcp-only: ${msg}\n`);
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
function lintRuleBody(body, rel) {
  const errors = [];
  for (const rule of FORBIDDEN) {
    if (rule.re.test(body)) {
      errors.push(`${rel}: must not reference ${rule.label}`);
    }
  }
  if (
    rel.includes('4_mission.mdc') &&
    !body.includes('mission_control_spawn_agent')
  ) {
    errors.push(`${rel}: missing mission_control_spawn_agent reference`);
  }
  if (
    (rel.includes('4_mission.mdc') || rel.includes('mission-control-agent-runtime')) &&
    !body.includes('mission_control_send_agent_result') &&
    !body.includes('mission_control_present_structured_choice')
  ) {
    // runtime overlay references MCP result via skill pointer; 4_mission must mention send result
    if (rel.includes('4_mission.mdc') && !body.includes('mission_control_send_agent_result')) {
      errors.push(`${rel}: missing mission_control_send_agent_result reference`);
    }
  }
  return errors;
}

async function main() {
  const hostingRoot = await resolveHostingRoot();
  const allErrors = [];

  for (const rel of RULE_PATHS) {
    const abs = path.join(hostingRoot, rel);
    let raw;
    try {
      raw = await fs.readFile(abs, 'utf8');
    } catch (err) {
      allErrors.push(`${rel}: read failed (${err.message})`);
      continue;
    }
    allErrors.push(...lintRuleBody(raw, rel));
  }

  if (allErrors.length) {
    process.stderr.write('rules MCP-only acceptance failed:\n');
    for (const e of allErrors) process.stderr.write(`  ${e}\n`);
    process.exit(1);
  }

  process.stdout.write(
    `verify-rules-mcp-only: OK (${RULE_PATHS.length} rule file(s) from ${hostingRoot})\n`,
  );
}

main().catch((err) => die(err.message));
