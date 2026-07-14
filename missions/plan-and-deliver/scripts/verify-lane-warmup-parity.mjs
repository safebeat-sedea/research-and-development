#!/usr/bin/env node
/**
 * Verify lane warm-up parity for plan-and-deliver roles.
 *
 * Compares each role's legacy warm-up baseline (sedea alwaysApply scan ∪ skill
 * warmUpRules) against the manifest merge effectiveWarmUp (bootstrap ∪ laneRules ∪
 * skillWarmUp) per `.sedea/centers/sedea/docs/lane-manifest-contract.md`.
 *
 * Run from hosting repo root (directory containing `.sedea/centers/sedea/`):
 *
 *   node .sedea/centers/research-and-development/missions/plan-and-deliver/scripts/verify-lane-warmup-parity.mjs
 *   node .../verify-lane-warmup-parity.mjs --bootstrap slim
 *
 * Exit 0 when every role passes; exit 1 when any path is missing or unknown.
 *
 * --bootstrap full  Today: bootstrap = all sedea alwaysApply rules (default).
 * --bootstrap slim  §5.3 merge gate: bootstrap = single future bootstrap rule only.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CENTER_ROOT = path.resolve(__dirname, '../../..');
const SEDEA_RULES_DIR = '.sedea/centers/sedea/rules';
const FUTURE_BOOTSTRAP_RULE = '.sedea/centers/sedea/rules/bootstrap.mdc';

/** @type {Record<string, { laneRules: string[], skillRelPath?: string }>} */
const ROLE_MANIFESTS = {
  'squad-leader': {
    laneRules: [
      '.sedea/centers/sedea/rules/2_ask-question-instructions.mdc',
      '.sedea/centers/sedea/rules/4_mission.mdc',
      '.sedea/centers/research-and-development/missions/plan-and-deliver/plan.mdc',
      '.sedea/centers/research-and-development/docs/development-process.md',
    ],
  },
  'author-prd': {
    laneRules: [
      '.sedea/centers/sedea/rules/2_ask-question-instructions.mdc',
      '.sedea/centers/research-and-development/missions/plan-and-deliver/skills/author-prd/SKILL.md',
      '.sedea/centers/research-and-development/missions/plan-and-deliver/plan.mdc',
      '.sedea/centers/research-and-development/rules/31_dispatch-scope.mdc',
    ],
    skillRelPath: 'missions/plan-and-deliver/skills/author-prd/SKILL.md',
  },
  'brainstorm-research': {
    laneRules: [
      '.sedea/centers/sedea/rules/2_ask-question-instructions.mdc',
      '.sedea/centers/research-and-development/missions/plan-and-deliver/skills/brainstorm-research/SKILL.md',
      '.sedea/centers/research-and-development/rules/31_dispatch-scope.mdc',
      '.sedea/centers/research-and-development/missions/plan-and-deliver/skills/README.md',
    ],
    skillRelPath: 'missions/plan-and-deliver/skills/brainstorm-research/SKILL.md',
  },
  'master-planner': {
    laneRules: [
      '.sedea/centers/sedea/rules/2_ask-question-instructions.mdc',
      '.sedea/centers/research-and-development/rules/30_planning-target-resolution.mdc',
      '.sedea/centers/research-and-development/missions/plan-and-deliver/skills/master-planner/SKILL.md',
      '.sedea/centers/research-and-development/missions/plan-and-deliver/skills/README.md',
    ],
    skillRelPath: 'missions/plan-and-deliver/skills/master-planner/SKILL.md',
  },
  'coding-session': {
    laneRules: [
      '.sedea/centers/sedea/rules/2_ask-question-instructions.mdc',
      '.sedea/centers/sedea/rules/6_git-commit-push-gate.mdc',
      '.sedea/centers/research-and-development/rules/20_efficient-pr-shipping.mdc',
      '.sedea/centers/research-and-development/missions/plan-and-deliver/skills/coding-session/SKILL.md',
    ],
    skillRelPath: 'missions/plan-and-deliver/skills/coding-session/SKILL.md',
  },
  'phase-planner': {
    laneRules: [
      '.sedea/centers/sedea/rules/2_ask-question-instructions.mdc',
      '.sedea/centers/research-and-development/rules/30_planning-target-resolution.mdc',
      '.sedea/centers/research-and-development/missions/plan-and-deliver/skills/phase-planner/SKILL.md',
      '.sedea/centers/research-and-development/missions/plan-and-deliver/skills/README.md',
    ],
    skillRelPath: 'missions/plan-and-deliver/skills/phase-planner/SKILL.md',
  },
  'pre-pr-review': {
    laneRules: [
      '.sedea/centers/sedea/rules/2_ask-question-instructions.mdc',
      '.sedea/centers/research-and-development/rules/20_efficient-pr-shipping.mdc',
      '.sedea/centers/research-and-development/missions/plan-and-deliver/skills/pre-pr-review/SKILL.md',
      '.sedea/centers/research-and-development/missions/plan-and-deliver/skills/README.md',
    ],
    skillRelPath: 'missions/plan-and-deliver/skills/pre-pr-review/SKILL.md',
  },
  'worktree-bootstrap': {
    // Deprecated role — retained for parity until drain gate D4 (see skills/README.md § worktree-bootstrap skill drain gate).
    laneRules: [
      '.sedea/centers/sedea/rules/2_ask-question-instructions.mdc',
      '.sedea/centers/research-and-development/rules/20_efficient-pr-shipping.mdc',
      '.sedea/centers/research-and-development/missions/plan-and-deliver/skills/worktree-bootstrap/SKILL.md',
      '.sedea/centers/research-and-development/missions/plan-and-deliver/skills/README.md',
    ],
    skillRelPath: 'missions/plan-and-deliver/skills/worktree-bootstrap/SKILL.md',
  },
  'squad-leader-mission-maintenance': {
    laneRules: [
      '.sedea/centers/sedea/rules/2_ask-question-instructions.mdc',
      '.sedea/centers/sedea/rules/4_mission.mdc',
      '.sedea/centers/sedea/missions/mission-maintenance/plan.mdc',
      '.sedea/centers/sedea/docs/mission-three-lane-cadence.md',
    ],
  },
  'squad-leader-center-maintenance': {
    laneRules: [
      '.sedea/centers/sedea/rules/2_ask-question-instructions.mdc',
      '.sedea/centers/sedea/rules/4_mission.mdc',
      '.sedea/centers/sedea/missions/center-maintenance/plan.mdc',
      '.sedea/centers/sedea/docs/mission-three-lane-cadence.md',
    ],
  },
  'squad-leader-sedea-governed-repo-setup': {
    laneRules: [
      '.sedea/centers/sedea/rules/2_ask-question-instructions.mdc',
      '.sedea/centers/sedea/rules/4_mission.mdc',
      '.sedea/centers/sedea/missions/sedea-governed-repo-setup/plan.mdc',
      '.sedea/centers/sedea/docs/mission-three-lane-cadence.md',
    ],
  },
  'squad-leader-cursor-rules-improvement': {
    laneRules: [
      '.sedea/centers/sedea/rules/2_ask-question-instructions.mdc',
      '.sedea/centers/sedea/rules/4_mission.mdc',
      '.sedea/centers/sedea/missions/cursor-rules-improvement/plan.mdc',
      '.sedea/centers/sedea/docs/mission-three-lane-cadence.md',
    ],
  },
  'squad-leader-cursor-center-rules-alignment': {
    laneRules: [
      '.sedea/centers/sedea/rules/2_ask-question-instructions.mdc',
      '.sedea/centers/sedea/rules/4_mission.mdc',
      '.sedea/centers/sedea/missions/cursor-center-rules-alignment/plan.mdc',
      '.sedea/centers/sedea/docs/mission-three-lane-cadence.md',
    ],
  },
  'squad-leader-smart-center-upstream-sync': {
    laneRules: [
      '.sedea/centers/sedea/rules/2_ask-question-instructions.mdc',
      '.sedea/centers/sedea/rules/4_mission.mdc',
      '.sedea/centers/sedea/missions/smart-center-upstream-sync/plan.mdc',
    ],
  },
  'squad-leader-mission-completeness-triage': {
    laneRules: [
      '.sedea/centers/sedea/rules/2_ask-question-instructions.mdc',
      '.sedea/centers/sedea/rules/4_mission.mdc',
      '.sedea/centers/sedea/missions/mission-completeness-triage/plan.mdc',
    ],
  },
};

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

function die(msg, code = 1) {
  process.stderr.write(`${msg}\n`);
  process.exit(code);
}

function normalizeRepoPath(p) {
  return p.replace(/\\/g, '/').replace(/^\.\//, '');
}

function dedupeOrdered(paths) {
  const seen = new Set();
  const out = [];
  for (const raw of paths) {
    const p = normalizeRepoPath(raw);
    if (!p || seen.has(p)) continue;
    seen.add(p);
    out.push(p);
  }
  return out;
}

function parseArgs(argv) {
  let bootstrap = 'full';
  let hostingRoot = undefined;
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--bootstrap') {
      bootstrap = argv[i + 1] ?? '';
      i += 1;
      continue;
    }
    if (arg === '--hosting-root') {
      hostingRoot = argv[i + 1] ?? '';
      i += 1;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      process.stdout.write(`Usage: verify-lane-warmup-parity.mjs [--bootstrap full|slim] [--hosting-root PATH]\n`);
      process.exit(0);
    }
    die(`unknown argument: ${arg}`);
  }
  if (bootstrap !== 'full' && bootstrap !== 'slim') {
    die(`--bootstrap must be "full" or "slim" (got "${bootstrap}")`);
  }
  return { bootstrap, hostingRoot };
}

async function resolveHostingRoot(explicit) {
  if (explicit) {
    const abs = path.resolve(explicit);
    try {
      await fs.access(path.join(abs, '.sedea/centers/sedea'));
      return abs;
    } catch {
      die(`--hosting-root is not a Sedea hosting repo: ${abs}`);
    }
  }
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
  die('could not resolve hosting repo root — pass --hosting-root or run from HOSTING_ROOT');
}

async function scanSedeaAlwaysApply(hostingRoot) {
  const rulesDir = path.join(hostingRoot, SEDEA_RULES_DIR);
  let entries;
  try {
    entries = await fs.readdir(rulesDir);
  } catch {
    die(`cannot read ${SEDEA_RULES_DIR}`);
  }
  const out = [];
  for (const name of entries.sort()) {
    if (!name.endsWith('.mdc')) continue;
    const abs = path.join(rulesDir, name);
    const raw = await fs.readFile(abs, 'utf8');
    const m = FRONTMATTER_RE.exec(raw);
    if (!m) continue;
    let parsed;
    try {
      parsed = parseYaml(m[1]);
    } catch {
      continue;
    }
    if (parsed?.alwaysApply === true) {
      out.push(normalizeRepoPath(`${SEDEA_RULES_DIR}/${name}`));
    }
  }
  return out;
}

async function readSkillWarmUp(skillRelPath) {
  const abs = path.join(CENTER_ROOT, skillRelPath);
  const raw = await fs.readFile(abs, 'utf8');
  const m = FRONTMATTER_RE.exec(raw);
  if (!m) return [];
  let parsed;
  try {
    parsed = parseYaml(m[1]);
  } catch {
    return [];
  }
  const warmUp = parsed?.warmUpRules;
  if (!Array.isArray(warmUp)) return [];
  return warmUp.map((p) => normalizeRepoPath(String(p)));
}

async function assertPathsExist(hostingRoot, paths) {
  const missing = [];
  for (const rel of paths) {
    const abs = path.join(hostingRoot, rel);
    try {
      await fs.access(abs);
    } catch {
      missing.push(rel);
    }
  }
  return missing;
}

function diffMissing(legacy, effective) {
  const effectiveSet = new Set(effective);
  return legacy.filter((p) => !effectiveSet.has(p));
}

async function main() {
  const { bootstrap, hostingRoot: hostingRootArg } = parseArgs(process.argv);
  const hostingRoot = await resolveHostingRoot(hostingRootArg);
  const alwaysApply = await scanSedeaAlwaysApply(hostingRoot);
  const bootstrapPaths =
    bootstrap === 'full' ? alwaysApply : [FUTURE_BOOTSTRAP_RULE];

  if (alwaysApply.length === 0) {
    die('no sedea alwaysApply rules found — cannot compute legacy baseline');
  }

  let failed = false;
  const summaries = [];

  for (const [role, manifest] of Object.entries(ROLE_MANIFESTS)) {
    const skillWarmUp = manifest.skillRelPath
      ? await readSkillWarmUp(manifest.skillRelPath)
      : [];
    const laneRules = manifest.laneRules.map(normalizeRepoPath);
    const legacyBaseline = dedupeOrdered([...alwaysApply, ...skillWarmUp]);
    const effectiveWarmUp = dedupeOrdered([
      ...bootstrapPaths,
      ...laneRules,
      ...skillWarmUp,
    ]);
    const missingFromEffective = diffMissing(legacyBaseline, effectiveWarmUp);
    const missingOnDisk = await assertPathsExist(hostingRoot, [
      ...legacyBaseline,
      ...effectiveWarmUp,
    ]);

    if (missingFromEffective.length || missingOnDisk.length) {
      failed = true;
      process.stderr.write(`\nrole: ${role} — FAIL\n`);
      if (missingFromEffective.length) {
        process.stderr.write('  missing from effectiveWarmUp (legacy ⊄ manifest):\n');
        for (const p of missingFromEffective) process.stderr.write(`    - ${p}\n`);
      }
      if (missingOnDisk.length) {
        process.stderr.write('  paths not found on disk:\n');
        for (const p of missingOnDisk) process.stderr.write(`    - ${p}\n`);
      }
    } else {
      summaries.push(
        `${role}: OK (legacy ${legacyBaseline.length} paths, effective ${effectiveWarmUp.length} paths)`,
      );
    }
  }

  if (failed) {
    process.stderr.write(
      `\nparity check failed (bootstrap=${bootstrap}). ` +
        'Slim mode is the §5.3 alwaysApply flip merge gate; full mode matches today\'s host scan.\n',
    );
    process.exit(1);
  }

  for (const line of summaries) process.stdout.write(`${line}\n`);
  process.stdout.write(
    `OK: lane warm-up parity passed for ${summaries.length} roles (bootstrap=${bootstrap})\n`,
  );
}

main().catch((err) => die(String(err)));
