#!/usr/bin/env node
/**
 * Backward-compat wrapper — delegates to the canonical sedea-local script.
 *
 * Run from hosting repo root:
 *
 *   node .sedea/centers/research-and-development/missions/plan-and-deliver/scripts/verify-designation.mjs
 */

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sedeaScript = path.resolve(__dirname, '../../../../sedea/scripts/verify-designation.mjs');

const result = spawnSync(process.execPath, [sedeaScript, ...process.argv.slice(2)], {
  cwd: process.cwd(),
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
