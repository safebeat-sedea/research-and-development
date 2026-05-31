#!/usr/bin/env node
// Post-ship git + worktree cleanup (destructive). Invoked by coding-session post-merge
// cleanup and plan-reconcile §5 (idempotent fallback). Agent must call
// sedea_remove_worktree_folder before --apply removes worktrees.
// Detect-only listing: plan-state.mjs detect-stale-workspaces.

import * as fs from 'node:fs/promises';
import * as fsSync from 'node:fs';
import * as path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PLAN_STATE = path.join(SCRIPT_DIR, 'plan-state.mjs');

function die(msg, code = 1) {
  process.stderr.write(`post-reconcile-workspace-cleanup: ${msg}\n`);
  process.exit(code);
}

function log(msg) {
  process.stdout.write(`${msg}\n`);
}

function findSedeaRepoRoot(startDir) {
  let cur = path.resolve(startDir);
  const { root } = path.parse(cur);
  while (true) {
    const sedea = path.join(cur, '.sedea');
    try {
      if (fsSync.statSync(sedea).isDirectory()) return cur;
    } catch {
      /* not found */
    }
    if (cur === root) return null;
    cur = path.dirname(cur);
  }
}

function spawnGit(cwd, args) {
  return new Promise((resolve) => {
    const child = spawn('git', args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('error', (err) => {
      resolve({ ok: false, stdout: stdout.trim(), stderr: err.message, code: -1 });
    });
    child.on('close', (code) => {
      resolve({
        ok: code === 0,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        code: code ?? 1,
      });
    });
  });
}

function spawnNode(args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('error', (err) => {
      resolve({ ok: false, stdout, stderr: err.message, code: -1 });
    });
    child.on('close', (code) => {
      resolve({ ok: code === 0, stdout, stderr, code: code ?? 1 });
    });
  });
}

function parseFlags(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) die(`unexpected positional argument: ${a}`);
    const eq = a.indexOf('=');
    let key;
    let value;
    if (eq >= 0) {
      key = a.slice(2, eq);
      value = a.slice(eq + 1);
    } else {
      key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) value = true;
      else {
        value = next;
        i += 1;
      }
    }
    if (key in out) die(`flag --${key} given more than once`);
    out[key] = value;
  }
  return out;
}

function parseGlobalLeadingArgs(argv) {
  const rest = [...argv];
  let operationsUserId = null;
  while (rest.length > 0) {
    const a = rest[0];
    if (a === '--operations-user-id') {
      const v = rest[1];
      if (!v || String(v).startsWith('--')) die('--operations-user-id requires a value');
      operationsUserId = String(v);
      rest.splice(0, 2);
      continue;
    }
    if (a.startsWith('--operations-user-id=')) {
      operationsUserId = a.slice('--operations-user-id='.length);
      if (!operationsUserId) die('--operations-user-id= requires a value');
      rest.splice(0, 1);
      continue;
    }
    break;
  }
  return { operationsUserId, rest };
}

async function resolveMainRepoRoot(worktreePath) {
  const common = await spawnGit(worktreePath, [
    'rev-parse',
    '--path-format=absolute',
    '--git-common-dir',
  ]);
  if (!common.ok) return { ok: false, error: common.stderr || 'rev-parse failed' };
  const absCommon = path.resolve(worktreePath, common.stdout);
  const marker = `${path.sep}.git${path.sep}worktrees${path.sep}`;
  const idx = absCommon.indexOf(marker);
  if (idx >= 0) {
    return { ok: true, mainRepoRoot: absCommon.slice(0, idx) };
  }
  if (absCommon.endsWith(`${path.sep}.git`) || absCommon.endsWith('.git')) {
    return { ok: true, mainRepoRoot: path.dirname(absCommon) };
  }
  return { ok: true, mainRepoRoot: worktreePath };
}

/**
 * True when another registered worktree still has this branch checked out.
 */
async function branchCheckedOutOnOtherWorktree(mainRepoRoot, branch, excludeWorktreePath) {
  const wt = await spawnGit(mainRepoRoot, ['worktree', 'list', '--porcelain']);
  if (!wt.ok) return false;
  const exclude = path.resolve(excludeWorktreePath);
  let currentPath = null;
  for (const line of wt.stdout.split('\n')) {
    if (line.startsWith('worktree ')) {
      currentPath = path.resolve(line.slice('worktree '.length).trim());
      continue;
    }
    if (!line.startsWith('branch ') || currentPath === null) continue;
    const b = line.slice('branch '.length).trim().replace(/^refs\/heads\//, '');
    if (b === branch && currentPath !== exclude) return true;
  }
  return false;
}

/**
 * Branch delete eligibility (post-merge / stale-worktree cleanup):
 * 1. Primary: sidecar linked PR(s) MERGED (mergedPr) and remote head gone.
 * 2. Fallback: worktree-linked branch (stale worktree candidate), sidecar prs[] empty
 *    (mergedPr null), remote head gone, branch not checked out on another worktree.
 * Does not use merge-base / local "merged into origin/main" heuristics.
 */
async function branchEligibleForDelete(mainRepoRoot, branch, candidate, defaultBranch) {
  if (!branch || branch === defaultBranch) {
    return { ok: true, eligible: false, reason: 'default_branch' };
  }
  if (candidate.mergedPr === false) {
    return {
      ok: true,
      eligible: false,
      reason: 'linked_prs_not_merged',
    };
  }
  const fetch = await spawnGit(mainRepoRoot, ['fetch', 'origin']);
  if (!fetch.ok) {
    return { ok: false, eligible: false, error: fetch.stderr || 'fetch failed' };
  }
  const remote = await spawnGit(mainRepoRoot, ['ls-remote', '--heads', 'origin', branch]);
  if (!remote.ok) {
    return { ok: false, eligible: false, error: remote.stderr || 'ls-remote failed' };
  }
  const remoteBranchExists = remote.stdout.trim().length > 0;
  if (remoteBranchExists) {
    return {
      ok: true,
      eligible: false,
      reason: candidate.mergedPr === true
        ? 'pr_merged_remote_branch_still_exists'
        : 'remote_branch_still_exists',
    };
  }
  if (candidate.mergedPr === true) {
    return {
      ok: true,
      eligible: true,
      reason: 'pr_merged_remote_branch_deleted',
    };
  }
  const elsewhere = await branchCheckedOutOnOtherWorktree(
    mainRepoRoot,
    branch,
    candidate.worktreePath,
  );
  if (elsewhere) {
    return { ok: true, eligible: false, reason: 'branch_checked_out_elsewhere' };
  }
  return {
    ok: true,
    eligible: true,
    reason: 'worktree_linked_remote_branch_gone',
  };
}

async function detectCandidates(hostingRoot, operationsUserId, slug) {
  const args = [PLAN_STATE, '--operations-user-id', operationsUserId, 'detect-stale-workspaces', '--json'];
  if (slug) args.push('--slug', slug);
  const r = await spawnNode(args);
  if (!r.ok) die(`detect-stale-workspaces failed: ${r.stderr || r.stdout}`);
  let parsed;
  try {
    parsed = JSON.parse(r.stdout);
  } catch (err) {
    die(`detect-stale-workspaces JSON parse failed: ${err.message}`);
  }
  return parsed.candidates || [];
}

async function runPruneSessions(hostingRoot, operationsUserId, all) {
  const args = [
    PLAN_STATE,
    '--operations-user-id',
    operationsUserId,
    'prune-sessions',
    ...(all ? ['--all'] : []),
  ];
  const r = await spawnNode(args);
  if (!r.ok) die(`prune-sessions failed: ${r.stderr || r.stdout}`);
  if (r.stdout.trim()) log(r.stdout.trim());
}

async function syncHostingDefaultBranch(hostingRoot, defaultBranch, dryRun) {
  const actions = [];
  const co = await spawnGit(hostingRoot, ['checkout', defaultBranch]);
  if (!co.ok) return { ok: false, error: `checkout ${defaultBranch}: ${co.stderr}`, actions };
  actions.push({ action: 'checkout', cwd: hostingRoot, branch: defaultBranch });
  if (dryRun) {
    actions.push({ action: 'pull', cwd: hostingRoot, ref: `origin/${defaultBranch}`, dryRun: true });
    return { ok: true, actions, pullStatus: 'dry-run' };
  }
  const pull = await spawnGit(hostingRoot, ['pull', 'origin', defaultBranch]);
  if (!pull.ok) return { ok: false, error: `pull origin ${defaultBranch}: ${pull.stderr}`, actions };
  actions.push({ action: 'pull', cwd: hostingRoot, ref: `origin/${defaultBranch}`, stdout: pull.stdout });
  return { ok: true, actions, pullStatus: pull.stdout || 'ok' };
}

async function runNativeExtensionsRebuild(hostingRoot, dryRun) {
  const scriptPath = path.join(hostingRoot, 'scripts', 'rebuild-native-extensions.sh');
  const action = { action: 'rebuild-native-extensions', cwd: hostingRoot, script: scriptPath };
  try {
    await fs.access(scriptPath, fsSync.constants.X_OK);
  } catch {
    return { ok: true, skipped: true, status: 'skipped_not_present', actions: [] };
  }
  if (dryRun) {
    return { ok: true, status: 'dry-run', actions: [{ ...action, dryRun: true }] };
  }
  return new Promise((resolve) => {
    const child = spawn(scriptPath, [], { cwd: hostingRoot, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('error', (err) => {
      resolve({
        ok: false,
        status: 'failed',
        error: err.message,
        actions: [action],
      });
    });
    child.on('close', (code) => {
      if (code === 0) {
        resolve({
          ok: true,
          status: 'success',
          actions: [{ ...action, stdout: stdout.trim() }],
        });
        return;
      }
      resolve({
        ok: false,
        status: 'failed',
        error: stderr.trim() || stdout.trim() || `exit ${code}`,
        actions: [action],
      });
    });
  });
}

const USAGE = `Usage: post-reconcile-workspace-cleanup [--operations-user-id <id>] [--dry-run | --apply] [--slug <slug>] [--default-branch <name>]

  --dry-run   Print planned git actions (default). Does not mutate git or sidecars.
  --apply     Run git worktree remove, branch delete (PR merged + remote branch gone), hosting pull,
              rebuild-native-extensions.sh (when present), prune-sessions.
              Agent must call sedea_remove_worktree_folder for each worktreePath before --apply.

  --default-branch <name>  Integration branch (default: main).
`;

async function main() {
  const raw = process.argv.slice(2);
  if (raw.length === 0 || raw[0] === '--help' || raw[0] === '-h') {
    process.stdout.write(USAGE);
    return;
  }
  const { operationsUserId, rest } = parseGlobalLeadingArgs(raw);
  if (!operationsUserId) die('--operations-user-id is required');
  const flags = parseFlags(rest);
  const dryRun = flags.apply !== true;
  const slug = typeof flags.slug === 'string' ? flags.slug : null;
  const defaultBranch = typeof flags['default-branch'] === 'string' ? flags['default-branch'] : 'main';

  const hostingRoot = findSedeaRepoRoot(SCRIPT_DIR);
  if (!hostingRoot) die('could not find hosting repo root (.sedea/)');

  const candidates = await detectCandidates(hostingRoot, operationsUserId, slug);
  const report = {
    dryRun,
    defaultBranch,
    hostingRoot,
    candidates,
    actions: [],
    cleanedWorktrees: [],
    deletedBranches: [],
    errors: [],
    mcpReminder:
      'Before --apply: invoke sedea_remove_worktree_folder for each worktreePath (Mission Control MCP).',
  };

  if (candidates.length === 0) {
    log(JSON.stringify({ ...report, summary: 'no stale worktrees detected' }, null, 2));
    return;
  }

  for (const c of candidates) {
    const main = await resolveMainRepoRoot(c.worktreePath);
    if (!main.ok) {
      report.errors.push({ slug: c.slug, worktreePath: c.worktreePath, error: main.error });
      continue;
    }
    const removeAction = {
      action: 'worktree-remove',
      mainRepoRoot: main.mainRepoRoot,
      worktreePath: c.worktreePath,
      slug: c.slug,
    };
    report.actions.push(removeAction);
    if (!dryRun) {
      const rm = await spawnGit(main.mainRepoRoot, ['worktree', 'remove', c.worktreePath, '--force']);
      if (!rm.ok) {
        report.errors.push({
          slug: c.slug,
          worktreePath: c.worktreePath,
          error: rm.stderr || 'worktree remove failed',
        });
        continue;
      }
      await spawnGit(main.mainRepoRoot, ['worktree', 'prune']);
      report.cleanedWorktrees.push(c.worktreePath);
    }

    if (c.branch && c.branch !== defaultBranch) {
      const eligibility = await branchEligibleForDelete(
        main.mainRepoRoot,
        c.branch,
        c,
        defaultBranch,
      );
      const delAction = {
        action: 'branch-delete',
        mainRepoRoot: main.mainRepoRoot,
        branch: c.branch,
        eligible: eligibility.eligible === true,
        reason: eligibility.reason || eligibility.error,
        mergedPr: c.mergedPr,
        slug: c.slug,
      };
      report.actions.push(delAction);
      if (!dryRun && eligibility.ok && eligibility.eligible) {
        const del = await spawnGit(main.mainRepoRoot, ['branch', '-D', c.branch]);
        if (del.ok) report.deletedBranches.push(c.branch);
        else {
          report.errors.push({
            slug: c.slug,
            branch: c.branch,
            error: del.stderr || 'branch delete failed',
          });
        }
      } else if (!dryRun && eligibility.ok && !eligibility.eligible) {
        report.skippedBranches = report.skippedBranches || [];
        report.skippedBranches.push({
          slug: c.slug,
          branch: c.branch,
          reason: eligibility.reason || 'not eligible',
        });
      } else if (!dryRun && !eligibility.ok) {
        report.errors.push({
          slug: c.slug,
          branch: c.branch,
          error: eligibility.error || 'branch eligibility check failed',
        });
      }
    }
  }

  const sync = await syncHostingDefaultBranch(hostingRoot, defaultBranch, dryRun);
  report.actions.push(...(sync.actions || []));
  report.mainPullStatus = sync.pullStatus || sync.error || null;
  if (!sync.ok && !dryRun) {
    report.errors.push({ hostingRoot, error: sync.error });
  }

  if (sync.ok) {
    const rebuild = await runNativeExtensionsRebuild(hostingRoot, dryRun);
    report.nativeExtensionsRebuildStatus = rebuild.status;
    if (rebuild.actions?.length) report.actions.push(...rebuild.actions);
    if (!rebuild.ok && !dryRun) {
      report.errors.push({
        hostingRoot,
        error: rebuild.error || 'rebuild-native-extensions failed',
      });
    }
  }

  if (!dryRun) {
    await runPruneSessions(hostingRoot, operationsUserId, true);
  } else {
    report.actions.push({ action: 'prune-sessions', mode: '--all', dryRun: true });
  }

  log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  die(err && err.stack ? err.stack : String(err));
});
