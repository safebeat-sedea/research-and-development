#!/usr/bin/env node
/**
 * Repo-wide zero-tolerance gate for the legacy MC phased-response wire token.
 *
 * Scans tracked source/docs under HOSTING_ROOT for the contiguous
 * legacy phased-response token (`MC_PHASED_` + `RESPONSE_V1`). Zero matches
 * allowed. Skips local-only `.sedea/operations` (historical plans/docs/transcripts
 * may retain the token).
 *
 * Run from hosting repo root:
 *
 *   node .sedea/centers/research-and-development/missions/plan-and-deliver/scripts/verify-no-mc-phased-response-v1.mjs
 *
 * Exit 0 when no forbidden literals remain; exit 1 and list paths otherwise.
 */

import fs from 'node:fs/promises';
import path from 'node:path';

/** Constructed so this gate source stays grep-clean. */
const FORBIDDEN_TOKEN = 'MC_PHASED_' + 'RESPONSE_V1';

const SKIP_DIR_NAMES = new Set([
  'node_modules',
  '.git',
  'out',
  'dist',
  '.build',
  'rpc-sidecar',
]);

/** Local-only operations tree — not git-tracked; archaeology may retain the token. */
const SKIP_PREFIXES = ['.sedea/operations'];

const TEXT_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.mjs',
  '.cjs',
  '.md',
  '.mdc',
  '.json',
  '.yml',
  '.yaml',
  '.sh',
  '.css',
  '.html',
]);

function die(msg) {
  process.stderr.write(`verify-no-mc-phased-response-v1: ${msg}\n`);
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

function shouldSkipRel(relPosix) {
  for (const prefix of SKIP_PREFIXES) {
    if (relPosix === prefix || relPosix.startsWith(`${prefix}/`)) return true;
  }
  return false;
}

async function walkFiles(rootDir, relDir = '', out = []) {
  const abs = path.join(rootDir, relDir);
  for (const ent of await fs.readdir(abs, { withFileTypes: true })) {
    if (SKIP_DIR_NAMES.has(ent.name)) continue;
    const rel = relDir ? `${relDir}/${ent.name}` : ent.name;
    const relPosix = rel.split(path.sep).join('/');
    if (shouldSkipRel(relPosix)) continue;
    const childAbs = path.join(rootDir, rel);
    if (ent.isDirectory()) {
      await walkFiles(rootDir, rel, out);
    } else if (TEXT_EXTENSIONS.has(path.extname(ent.name))) {
      out.push({ abs: childAbs, rel: relPosix });
    }
  }
  return out;
}

/**
 * @param {string} body
 * @param {string} rel
 */
function findHits(body, rel) {
  const hits = [];
  let idx = body.indexOf(FORBIDDEN_TOKEN);
  while (idx !== -1) {
    const line = body.slice(0, idx).split('\n').length;
    hits.push({ rel, line, token: FORBIDDEN_TOKEN });
    idx = body.indexOf(FORBIDDEN_TOKEN, idx + FORBIDDEN_TOKEN.length);
  }
  return hits;
}

async function main() {
  const hostingRoot = await resolveHostingRoot();
  const files = await walkFiles(hostingRoot);
  const allHits = [];

  for (const { abs, rel } of files) {
    let raw;
    try {
      raw = await fs.readFile(abs, 'utf8');
    } catch (err) {
      allHits.push({ rel, line: 0, token: `(read failed: ${err.message})` });
      continue;
    }
    allHits.push(...findHits(raw, rel));
  }

  if (allHits.length) {
    process.stderr.write('MC phased-response token literals found (zero tolerance):\n');
    for (const h of allHits) {
      process.stderr.write(`  ${h.rel}:${h.line}: ${h.token}\n`);
    }
    process.exit(1);
  }

  process.stdout.write(
    `verify-no-mc-phased-response-v1: OK (${files.length} file(s) scanned under ${hostingRoot})\n`,
  );
}

main().catch((err) => die(err.message));
