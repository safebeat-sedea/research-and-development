#!/usr/bin/env node
/**
 * Binding parity harness — pr-review.mjs vs both pr-review.py copies.
 *
 * Compares exit codes and stderr/stdout for PR_REVIEW_INPUT contract paths that do
 * not require live GitHub credentials. Live API parity is covered separately when
 * GH_TOKEN is available (optional suite).
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

const RUNNERS = {
  mjs: path.join(hostingRoot, '.sedea/centers/sedea/scripts/pr-review.mjs'),
  sedeaPy: path.join(hostingRoot, '.sedea/centers/sedea/scripts/pr-review.py'),
  rdPy: path.join(
    hostingRoot,
    '.sedea/centers/research-and-development/missions/plan-and-deliver/scripts/pr-review.py',
  ),
};

/** @typedef {'mjs' | 'sedeaPy' | 'rdPy'} RunnerId */

/**
 * @param {RunnerId} id
 * @param {{ cwd?: string, env?: Record<string, string>, inputPath?: string }} opts
 */
function runRunner(id, opts = {}) {
  const scriptPath = RUNNERS[id];
  const cwd = opts.cwd ?? hostingRoot;
  const env = { ...process.env, ...opts.env };
  if (opts.inputPath !== undefined) {
    env.PR_REVIEW_INPUT = opts.inputPath;
  } else {
    delete env.PR_REVIEW_INPUT;
  }

  let cmd;
  let args;
  if (id === 'mjs') {
    cmd = process.execPath;
    args = [scriptPath];
  } else {
    cmd = process.platform === 'win32' ? 'python' : 'python3';
    args = [scriptPath];
  }

  const result = spawnSync(cmd, args, {
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
    .replace(/Error: /g, 'Error: ')
    .trim();
}

/**
 * Assert mjs matches sedeaPy (canonical baseline) and rdPy for contract errors.
 * @param {string} label
 * @param {{ cwd?: string, env?: Record<string, string>, inputPath?: string }} opts
 */
function assertParity(label, opts) {
  const mjs = runRunner('mjs', opts);
  const sedeaPy = runRunner('sedeaPy', opts);
  const rdPy = runRunner('rdPy', opts);

  for (const [name, r] of [
    ['mjs', mjs],
    ['sedeaPy', sedeaPy],
    ['rdPy', rdPy],
  ]) {
    assert.ifError(r.error, `${label} (${name}): spawn failed: ${r.error?.message}`);
  }

  assert.equal(mjs.status, sedeaPy.status, `${label}: mjs exit ${mjs.status} vs sedeaPy ${sedeaPy.status}`);
  assert.equal(mjs.status, rdPy.status, `${label}: mjs exit ${mjs.status} vs rdPy ${rdPy.status}`);

  const mjsErr = normalizeStderr(mjs.stderr);
  const sedeaErr = normalizeStderr(sedeaPy.stderr);
  const rdErr = normalizeStderr(rdPy.stderr);

  assert.equal(mjsErr, sedeaErr, `${label}: stderr mjs vs sedeaPy`);
  assert.equal(mjsErr, rdErr, `${label}: stderr mjs vs rdPy`);

  assert.equal(mjs.stdout, sedeaPy.stdout, `${label}: stdout mjs vs sedeaPy`);
  assert.equal(mjs.stdout, rdPy.stdout, `${label}: stdout mjs vs rdPy`);
}

test('runners exist on disk', () => {
  for (const [id, p] of Object.entries(RUNNERS)) {
    assert.ok(fs.existsSync(p), `missing runner ${id}: ${p}`);
  }
});

test('parity — missing PR_REVIEW_INPUT and no cwd input files', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-review-parity-'));
  try {
    assertParity('missing input', { cwd: tmp, env: {} });
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('parity — PR_REVIEW_INPUT points to missing file', () => {
  const missing =
    'C:/app-worktrees/app-feat-01-port-pr-review-mjs/.sedea/staging/nonexistent-pr-review-input.json';
  assertParity('missing env file', {
    cwd: hostingRoot,
    inputPath: missing,
  });
});

test('parity — unknown command (GH_TOKEN stub avoids mcp lookup)', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-review-parity-'));
  const inputPath = path.join(tmp, 'input.json');
  fs.writeFileSync(inputPath, JSON.stringify({ command: 'not-a-real-command' }));
  try {
    assertParity('unknown command', {
      cwd: tmp,
      inputPath,
      env: { GH_TOKEN: 'parity-test-stub-token' },
    });
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('parity — array payload with non-object item', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-review-parity-'));
  const inputPath = path.join(tmp, 'input.json');
  fs.writeFileSync(inputPath, JSON.stringify(['not-an-object']));
  try {
    assertParity('array non-object', {
      cwd: tmp,
      inputPath,
      env: { GH_TOKEN: 'parity-test-stub-token' },
    });
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('parity — top-level non-object payload', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-review-parity-'));
  const inputPath = path.join(tmp, 'input.json');
  fs.writeFileSync(inputPath, JSON.stringify(42));
  try {
    assertParity('non-object payload', {
      cwd: tmp,
      inputPath,
      env: { GH_TOKEN: 'parity-test-stub-token' },
    });
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('parity — cwd fallback reads .pr-review-input.json', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-review-parity-'));
  fs.writeFileSync(
    path.join(tmp, '.pr-review-input.json'),
    JSON.stringify({ command: 'bogus-cmd' }),
  );
  try {
    assertParity('cwd input file', {
      cwd: tmp,
      env: { GH_TOKEN: 'parity-test-stub-token' },
    });
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('command surface — all documented commands registered in mjs', () => {
  const src = fs.readFileSync(RUNNERS.mjs, 'utf8');
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
