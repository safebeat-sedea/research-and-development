#!/usr/bin/env node
/**
 * Warm-up / parity integration tests for center governance scripts.
 *
 * Run from hosting repo root (after npm ci in this directory):
 *
 *   HOSTING_ROOT="$(pwd)" node --test \
 *     .sedea/centers/research-and-development/missions/plan-and-deliver/scripts/verify-center-governance-integration.test.mjs
 */

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPTS = __dirname;
const hostingRoot = process.env.HOSTING_ROOT
  ? path.resolve(process.env.HOSTING_ROOT)
  : path.resolve(SCRIPTS, '../../../../../..');

function runScript(scriptName, args = []) {
  return execFileSync(process.execPath, [path.join(SCRIPTS, scriptName), ...args], {
    cwd: hostingRoot,
    encoding: 'utf8',
  });
}

function runScriptExit(scriptName, args = []) {
  try {
    execFileSync(process.execPath, [path.join(SCRIPTS, scriptName), ...args], {
      cwd: hostingRoot,
      stdio: 'pipe',
    });
    return 0;
  } catch (err) {
    return err.status ?? 1;
  }
}

test('verify-skill-manifest.mjs exits 0 with spawn byte-budget smoke line', () => {
  const out = runScript('verify-skill-manifest.mjs');
  assert.match(out, /OK:/);
  assert.match(out, /spawn byte budget smoke:/);
  assert.match(out, /notify emit\/receive governance lint passed/);
});

test('verify-designation.mjs exits 0 on catalog SKILL.md and Pathfinder warm-up', () => {
  const out = runScript('verify-designation.mjs');
  assert.match(out, /OK: designation verified/);
});

test('verify-checkpoint-steps.mjs warn-only exits 0 (phase 1 scaffold)', () => {
  const out = runScript('verify-checkpoint-steps.mjs');
  assert.match(out, /verify-checkpoint-steps:/);
  assert.match(out, /governance file\(s\) scanned/);
});

test('verify-lane-warmup-parity.mjs --bootstrap full exits 0 for all roles', () => {
  const out = runScript('verify-lane-warmup-parity.mjs', ['--bootstrap', 'full']);
  assert.match(out, /OK: lane warm-up parity passed/);
  assert.match(out, /bootstrap=full/);
});

test('verify-lane-warmup-parity.mjs --bootstrap slim exits 0 (§5.3 merge gate)', () => {
  const out = runScript('verify-lane-warmup-parity.mjs', ['--bootstrap', 'slim']);
  assert.match(out, /OK: lane warm-up parity passed/);
  assert.match(out, /bootstrap=slim/);
});

test('verify-checkpoint-steps.mjs warn-only exits 0 (phase 1 scaffold)', () => {
  const out = runScript('verify-checkpoint-steps.mjs');
  assert.match(out, /verify-checkpoint-steps:/);
  const code = runScriptExit('verify-checkpoint-steps.mjs');
  assert.equal(code, 0);
});

test('lane-manifest-contract.md documents PRD §5.6 L1–L5 sunset gates', async () => {
  const docPath = path.join(
    hostingRoot,
    '.sedea/centers/sedea/docs/lane-manifest-contract.md',
  );
  const doc = await fs.readFile(docPath, 'utf8');
  assert.match(doc, /Legacy fallback operational sunset \(PRD §5\.6 L1–L5\)/);
  for (const gate of ['L1', 'L2', 'L3', 'L4', 'L5']) {
    assert.match(doc, new RegExp(`\\| \\*\\*${gate}\\*\\* \\|`));
  }
  assert.match(doc, /forceLegacyScan/);
});
