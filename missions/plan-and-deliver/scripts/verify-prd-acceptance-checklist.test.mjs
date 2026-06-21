#!/usr/bin/env node
/**
 * PRD §2 acceptance checklist — maps ad-hoc PRD criteria to automated gates.
 *
 * Run from hosting repo root (after npm ci in scripts/):
 *
 *   HOSTING_ROOT="$(pwd)" node --test \
 *     .sedea/centers/research-and-development/missions/plan-and-deliver/scripts/verify-prd-acceptance-checklist.test.mjs
 */

import assert from 'node:assert/strict';
import { execFileSync, execSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPTS = __dirname;
const hostingRoot = process.env.HOSTING_ROOT
  ? path.resolve(process.env.HOSTING_ROOT)
  : path.resolve(SCRIPTS, '../../../../../..');

/** PRD §2 high-level acceptance → automated test mapping (traceability for phase 4 PR 3). */
const PRD_ACCEPTANCE_MAP = [
  {
    criterion: 'Hub webview renders without the plans box; no dead plan links',
    automated: [
      'extensions/sedea-hub/webview-src/components/hubShellAcceptance.test.ts',
    ],
    manual: 'Open Sedea Hub — Dispatch + Centers panes only; no Plans box or Start New Plan',
  },
  {
    criterion: 'plan and deliver no longer prompts for parent/topic; MC Parent: null only',
    automated: [
      'extensions/mission-control/src/host/prdAcceptanceRootPlanContract.test.ts',
      'extensions/mission-control/src/host/dispatchMissionInputs.test.ts',
      'extensions/mission-control/src/host/spawn/renderChildInitiatingPrompt.test.ts',
    ],
    manual: 'Spawn plan and deliver — §4 has no parent AskQuestion; child openings omit ### Parent (Sedea Hub)',
  },
  {
    criterion: 'New sidecars default parent: null on new-plan path',
    automated: [
      '.sedea/centers/research-and-development/missions/plan-and-deliver/scripts/plan-state.mjs (readSidecarPlain default)',
    ],
    manual: 'Run new-plan scaffold — sidecar parent: null under flat plans/',
  },
  {
    criterion: 'Governance text prevents topic/parent intake reintroduction',
    automated: ['./scripts/verify-center-governance.sh'],
    manual: 'Spot-check development-process.md root delivery table and plan.mdc §4 Parent: null default',
  },
];

async function readUtf8(relPath) {
  return fs.readFile(path.join(hostingRoot, relPath), 'utf8');
}

async function pathExists(relPath) {
  try {
    await fs.access(path.join(hostingRoot, relPath));
    return true;
  } catch {
    return false;
  }
}

function quoteShellArg(arg) {
  if (!/[\s"]/.test(arg)) return arg;
  return `"${arg.replace(/"/g, '\\"')}"`;
}

function runNpm(args, cwd) {
  const opts = {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  };
  if (process.platform === 'win32') {
    execSync(['npm', ...args].map(quoteShellArg).join(' '), { ...opts, shell: true });
    return;
  }
  execFileSync('npm', args, opts);
}

function runVitest(packageDir, testPattern) {
  const pkgRoot = path.join(hostingRoot, packageDir);
  // CI center-governance workflow only npm ci's scripts/; install extension deps here.
  runNpm(['ci'], pkgRoot);
  runNpm(['test', '--', '--run', testPattern], pkgRoot);
}

test('PRD acceptance map documents §2 criteria with automated + manual coverage', () => {
  assert.equal(PRD_ACCEPTANCE_MAP.length, 4);
  for (const row of PRD_ACCEPTANCE_MAP) {
    assert.ok(row.criterion.length > 0);
    assert.ok(row.automated.length > 0);
    assert.ok(row.manual.length > 0);
  }
});

test('PRD §2.1 — Hub plan-tree shell files remain removed', async () => {
  const removed = [
    'extensions/sedea-hub/webview-src/components/PlanTree.tsx',
    'extensions/sedea-hub/webview-src/components/PlansSection.tsx',
    'extensions/sedea-hub/webview-src/state/hubPlansState.ts',
    'extensions/sedea-hub/webview-src/mockPlanGraph.ts',
  ];
  for (const rel of removed) {
    assert.equal(await pathExists(rel), false, `expected absent: ${rel}`);
  }
  const styles = await readUtf8('extensions/sedea-hub/webview-src/components/styles.css');
  assert.doesNotMatch(styles, /\.hub-plans-/);
});

test('PRD §2.1 — hubShellAcceptance vitest passes', () => {
  runVitest('extensions/sedea-hub', 'hubShellAcceptance');
});

test('PRD §2.2 — MC root-plan contract vitest passes', () => {
  runVitest('extensions/mission-control', 'prdAcceptanceRootPlanContract');
});

test('PRD §2.2 — hubMissionInputs fixtures omit roadmap-topics paths', async () => {
  const hubInputsTest = await readUtf8('extensions/sedea-hub/src/host/hubMissionInputs.test.ts');
  assert.doesNotMatch(hubInputsTest, /roadmap-topics\//);
  assert.doesNotMatch(hubInputsTest, /sedea_app_mvp_c4d9e2a7/);
});

test('PRD §2.2 — plan.mdc §4 defaults Parent: null without parent AskQuestion', async () => {
  const planMdc = await readUtf8(
    '.sedea/centers/research-and-development/missions/plan-and-deliver/plan.mdc',
  );
  assert.match(planMdc, /Parent: null/);
  assert.match(planMdc, /no.*parent.*AskQuestion/i);
});

test('PRD §2.2 — plan-state readSidecarPlain defaults parent: null', async () => {
  const planState = await readUtf8(
    '.sedea/centers/research-and-development/missions/plan-and-deliver/scripts/plan-state.mjs',
  );
  assert.match(planState, /async function readSidecarPlain/);
  assert.match(planState, /parent: null,/);
});
