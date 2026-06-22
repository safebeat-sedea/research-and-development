#!/usr/bin/env node
/**
 * Contract harness — pr-review.mjs (Sedea .py removed on hosting PR 2).
 *
 * Exercises PR_REVIEW_INPUT contract paths that do not require live GitHub
 * credentials. Live API coverage is optional when GH_TOKEN is available.
 *
 * Run from hosting repo root:
 *
 *   HOSTING_ROOT="$(pwd)" node --test \
 *     .sedea/centers/research-and-development/missions/plan-and-deliver/scripts/verify-pr-review-parity.test.mjs
 */

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const hostingRoot = process.env.HOSTING_ROOT
  ? path.resolve(process.env.HOSTING_ROOT)
  : path.resolve(__dirname, '../../../../../..');

const MJS = path.join(hostingRoot, '.sedea/centers/sedea/scripts/pr-review.mjs');

/**
 * @param {{ cwd?: string, env?: Record<string, string>, inputPath?: string }} opts
 */
function runMjs(opts = {}) {
  const cwd = opts.cwd ?? hostingRoot;
  const env = { ...process.env, ...opts.env };
  if (opts.inputPath !== undefined) {
    env.PR_REVIEW_INPUT = opts.inputPath;
  } else {
    delete env.PR_REVIEW_INPUT;
  }

  const result = spawnSync(process.execPath, [MJS], {
    cwd,
    env,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });

  return {
    status: result.status ?? 1,
    stdout: (result.stdout ?? '').trimEnd(),
    stderr: (result.stderr ?? '').trimEnd(),
    error: result.error,
  };
}

function normalizeStderr(stderr) {
  return stderr
    .replaceAll('\\', '/')
    .replace(/:\/{2,}/g, ':/')
    .replace(/([^:/])\/{2,}/g, '$1/')
    .trim();
}

/**
 * @param {string} label
 * @param {{ cwd?: string, env?: Record<string, string>, inputPath?: string }} opts
 */
function assertMjsContract(label, opts) {
  const mjs = runMjs(opts);
  assert.ifError(mjs.error, `${label} (mjs): spawn failed: ${mjs.error?.message}`);
  assert.ok(mjs.status !== 0, `${label}: expected non-zero exit, got ${mjs.status}`);
  assert.ok(normalizeStderr(mjs.stderr).length > 0, `${label}: expected stderr`);
}

test('runner exists on disk', () => {
  assert.ok(fs.existsSync(MJS), `missing runner: ${MJS}`);
});

test('contract — missing PR_REVIEW_INPUT and no cwd input files', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-review-parity-'));
  try {
    assertMjsContract('missing input', { cwd: tmp, env: {} });
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('contract — PR_REVIEW_INPUT points to missing file', () => {
  const missing = path.join(
    os.tmpdir(),
    'nonexistent-pr-review-input-governance-sweep.json',
  );
  assertMjsContract('missing env file', {
    cwd: hostingRoot,
    inputPath: missing,
  });
});

test('contract — unknown command (GH_TOKEN stub avoids mcp lookup)', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-review-parity-'));
  const inputPath = path.join(tmp, 'input.json');
  fs.writeFileSync(inputPath, JSON.stringify({ command: 'not-a-real-command' }));
  try {
    assertMjsContract('unknown command', {
      cwd: tmp,
      inputPath,
      env: { GH_TOKEN: 'parity-test-stub-token' },
    });
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('contract — array payload with non-object item', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-review-parity-'));
  const inputPath = path.join(tmp, 'input.json');
  fs.writeFileSync(inputPath, JSON.stringify(['not-an-object']));
  try {
    assertMjsContract('array non-object', {
      cwd: tmp,
      inputPath,
      env: { GH_TOKEN: 'parity-test-stub-token' },
    });
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('contract — top-level non-object payload', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-review-parity-'));
  const inputPath = path.join(tmp, 'input.json');
  fs.writeFileSync(inputPath, JSON.stringify(42));
  try {
    assertMjsContract('non-object payload', {
      cwd: tmp,
      inputPath,
      env: { GH_TOKEN: 'parity-test-stub-token' },
    });
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('contract — cwd fallback reads .pr-review-input.json', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-review-parity-'));
  fs.writeFileSync(
    path.join(tmp, '.pr-review-input.json'),
    JSON.stringify({ command: 'bogus-cmd' }),
  );
  try {
    assertMjsContract('cwd input file', {
      cwd: tmp,
      env: { GH_TOKEN: 'parity-test-stub-token' },
    });
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('command surface — all documented commands registered in mjs', () => {
  const src = fs.readFileSync(MJS, 'utf8');
  const documented = [
    'threads',
    'reply',
    'resolve',
    'minimize',
    'pr-for-branch',
    'reviews',
    'review-comments',
    'pull-reviews',
    'issue-comments',
    'request-review',
    'summary',
  ];
  for (const cmd of documented) {
    const keyPattern =
      cmd.includes('-') ? `'${cmd}':` : `${cmd}:`;
    assert.match(src, new RegExp(keyPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `mjs missing command: ${cmd}`);
  }
});
