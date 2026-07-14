#!/usr/bin/env node
/**
 * Unit tests for verify-checkpoint-steps.mjs scaffold.
 */

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPTS = __dirname;
const hostingRoot = process.env.HOSTING_ROOT
  ? path.resolve(process.env.HOSTING_ROOT)
  : path.resolve(SCRIPTS, '../../../../../..');

function runScript(args = []) {
  return execFileSync(process.execPath, [path.join(SCRIPTS, 'verify-checkpoint-steps.mjs'), ...args], {
    cwd: hostingRoot,
    encoding: 'utf8',
  });
}

function runScriptExit(args = []) {
  try {
    execFileSync(process.execPath, [path.join(SCRIPTS, 'verify-checkpoint-steps.mjs'), ...args], {
      cwd: hostingRoot,
      stdio: 'pipe',
    });
    return 0;
  } catch (err) {
    return err.status ?? 1;
  }
}

test('default warn-only exits 0 and scans governance files', () => {
  const out = runScript();
  assert.match(out, /verify-checkpoint-steps:/);
  assert.match(out, /(\d+ governance file\(s\) scanned|warn-only)/);
  assert.doesNotMatch(out, /^ERROR:/m);
});

test('--enforce exits 1 on fixture violation', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'verify-checkpoint-steps-'));
  const skillDir = path.join(tmpDir, '.sedea/centers/sedea/missions/fixture/skills/fixture');
  await fs.mkdir(skillDir, { recursive: true });
  await fs.writeFile(
    path.join(skillDir, 'SKILL.md'),
    '# Fixture\n\nTell me when you are done reviewing the PR.\n',
    'utf8',
  );
  const pathsFile = path.join(tmpDir, 'paths.txt');
  await fs.writeFile(
    pathsFile,
    '.sedea/centers/sedea/missions/fixture/skills/fixture/SKILL.md\n',
    'utf8',
  );

  let exitCode = 0;
  try {
    execFileSync(
      process.execPath,
      [path.join(SCRIPTS, 'verify-checkpoint-steps.mjs'), '--enforce', '--paths-file', pathsFile],
      { cwd: tmpDir, encoding: 'utf8', stdio: 'pipe' },
    );
  } catch (err) {
    exitCode = err.status ?? 1;
    assert.match(String(err.stderr ?? err.stdout), /tell-me-when/i);
  }
  assert.equal(exitCode, 1);
});

test('documentation table rows are exempt', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'verify-checkpoint-steps-doc-'));
  const skillDir = path.join(tmpDir, '.sedea/centers/sedea/missions/fixture/skills/fixture');
  await fs.mkdir(skillDir, { recursive: true });
  await fs.writeFile(
    path.join(skillDir, 'SKILL.md'),
    '| Anti-pattern | Why |\n| tell me when | Forbidden |\n',
    'utf8',
  );
  const pathsFile = path.join(tmpDir, 'paths.txt');
  await fs.writeFile(
    pathsFile,
    '.sedea/centers/sedea/missions/fixture/skills/fixture/SKILL.md\n',
    'utf8',
  );
  const out = execFileSync(
    process.execPath,
    [path.join(SCRIPTS, 'verify-checkpoint-steps.mjs'), '--paths-file', pathsFile],
    { cwd: tmpDir, encoding: 'utf8' },
  );
  assert.match(out, /0 pattern hit/);
});

test('warn-only exits 0 even when hits exist on hosting repo', () => {
  assert.equal(runScriptExit(), 0);
});
