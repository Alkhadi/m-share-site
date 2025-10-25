#!/usr/bin/env node
/**
 * replace-site.mjs
 *
 * One-shot deploy that REPLACES the remote site with your local files.
 * ⚠️ Destructive: remote files not present locally will be deleted.
 *
 * USAGE (pick ONE mode):
 *  SSH (rsync over SSH; mirrors local -> remote path):
 *    HOST=example.com USER=ubuntu DEST=/var/www/html \
 *    DRY_RUN=1 CONFIRM_OVERWRITE=YES \
 *    node replace-site.mjs ssh
 *  Then do the real deploy:
 *    HOST=example.com USER=ubuntu DEST=/var/www/html \
 *    DRY_RUN=0 CONFIRM_OVERWRITE=YES \
 *    node replace-site.mjs ssh
 *
 *  GitHub Pages (force push to a branch, e.g., gh-pages):
 *    TARGET_BRANCH=gh-pages REMOTE=origin DRY_RUN=1 CONFIRM_OVERWRITE=YES \
 *    node replace-site.mjs github
 *  Then:
 *    TARGET_BRANCH=gh-pages REMOTE=origin DRY_RUN=0 CONFIRM_OVERWRITE=YES \
 *    node replace-site.mjs github
 *
 * ENV VARS (common)
 *  SRC             Local directory to publish (default: cwd)
 *  EXCLUDES        Comma-separated extra exclude globs (optional)
 *  DRY_RUN         1 = show what would change; 0 = perform changes (default: 1)
 *  CONFIRM_OVERWRITE Must be "YES" to proceed (safety latch)
 *
 * SSH mode extras:
 *  HOST, USER, DEST, PORT (default 22)
 *
 * GitHub mode extras:
 *  TARGET_BRANCH (default "gh-pages"), REMOTE (default "origin"), COMMIT_MSG
 */

import { execSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import path from 'node:path';

const mode = (process.argv[2] || '').toLowerCase();
const {
  SRC = process.cwd(),
  EXCLUDES = '',
  DRY_RUN = '1',
  CONFIRM_OVERWRITE = '',
} = process.env;

const red = s => `\x1b[31m${s}\x1b[0m`;
const green = s => `\x1b[32m${s}\x1b[0m`;
const yellow = s => `\x1b[33m${s}\x1b[0m`;
const sh = (cmd, opts = {}) => execSync(cmd, { stdio: 'inherit', ...opts });

function die(msg, code = 1) { console.error(red(msg)); process.exit(code); }
function requireYes() {
  if (CONFIRM_OVERWRITE !== 'YES') {
    die('Set CONFIRM_OVERWRITE=YES to proceed (destructive deploy).');
  }
}

function buildExcludeArgs(extraExcludes = []) {
  const base = [
    '.git',
    '.github',
    'node_modules',
    '.DS_Store',
    '*.bak.*',
    '*.tmp',
    '.cache',
    '.vscode',
    'm-share.code-workspace',
    'mshare_refactor_*.zip'
  ];
  const extras = EXCLUDES
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  return [...new Set([...base, ...extras, ...extraExcludes])]
    .map(e => `--exclude='${e}'`)
    .join(' ');
}

function checkIndexWarn(src) {
  if (!existsSync(path.join(src, 'index.html'))) {
    console.warn(yellow(`Warning: index.html not found in ${src}`));
  }
}

/* --------------------------- SSH (rsync) mode --------------------------- */
function deploySSH() {
  const { HOST, USER, DEST, PORT = '22' } = process.env;
  if (!HOST || !USER || !DEST) {
    die('SSH mode requires HOST, USER and DEST environment variables.');
  }
  try { execSync('rsync --version', { stdio: 'ignore' }); }
  catch { die('rsync not found. On macOS: `brew install rsync`'); }

  checkIndexWarn(SRC);
  const excludes = buildExcludeArgs();
  const srcPath = path.resolve(SRC) + '/';
  const destSpec = `${USER}@${HOST}:${DEST.replace(/\/?$/, '/')}`;

  const deleteFlag = '--delete';
  const dry = DRY_RUN === '1' ? '--dry-run' : '';
  if (DRY_RUN !== '1') requireYes();

  const cmd = [
    'rsync -avz',
    deleteFlag,
    dry,
    excludes,
    "--chmod=Du=rwx,Dgo=rx,Fu=rw,Fgo=r",
    `-e "ssh -p ${PORT}"`,
    `"${srcPath}"`,
    `"${destSpec}"`
  ].join(' ');

  console.log('\n' + yellow('Running: ') + cmd + '\n');
  sh(cmd);
  console.log('\n' + green(`SSH deploy ${DRY_RUN === '1' ? '(dry-run) ' : ''}completed.`));
}

/* ------------------------ GitHub Pages (git) mode ----------------------- */
function deployGitHub() {
  const TARGET_BRANCH = process.env.TARGET_BRANCH || 'gh-pages';
  const REMOTE = process.env.REMOTE || 'origin';
  const COMMIT_MSG = process.env.COMMIT_MSG || 'Deploy: overwrite site with local files';

  try { sh('git rev-parse --is-inside-work-tree'); }
  catch { die('Not a git repository. Initialize git first.'); }

  checkIndexWarn(SRC);
  try { execSync('rsync --version', { stdio: 'ignore' }); }
  catch { die('rsync not found. On macOS: `brew install rsync`'); }

  const worktreePath = path.resolve('.deploy-overwrite');
  try { rmSync(worktreePath, { recursive: true, force: true }); } catch {}

  try { sh(`git fetch ${REMOTE} ${TARGET_BRANCH} --depth=1`); } catch {}
  sh(`git worktree add -B ${TARGET_BRANCH} "${worktreePath}"`);

  const excludes = buildExcludeArgs(['.deploy-overwrite']);
  const dry = DRY_RUN === '1' ? '--dry-run' : '';
  const cmd = [
    'rsync -av',
    '--delete',
    dry,
    excludes,
    `"${path.resolve(SRC)}/"`,
    `"${worktreePath}/"`
  ].join(' ');

  console.log('\n' + yellow('Syncing into worktree: ') + cmd + '\n');
  sh(cmd);

  if (DRY_RUN === '1') {
    console.log(yellow('Dry-run finished. To apply, rerun with DRY_RUN=0 CONFIRM_OVERWRITE=YES'));
    return;
  }
  requireYes();

  process.chdir(worktreePath);
  try { sh('git add -A'); } catch {}
  try { sh(`git diff --cached --quiet || git commit -m "${COMMIT_MSG}"`); } catch {}
  sh(`git push -f ${REMOTE} ${TARGET_BRANCH}`);

  process.chdir('..');
  try { sh(`git worktree remove -f "${worktreePath}"`); } catch {}
  try { rmSync(worktreePath, { recursive: true, force: true }); } catch {}

  console.log('\n' + green('GitHub deploy completed (force-pushed).'));
}

/* --------------------------------- Main -------------------------------- */
if (!mode || !['ssh', 'github'].includes(mode)) {
  die('Specify a mode: "ssh" or "github"\nExample: node replace-site.mjs ssh');
}

console.log(green(`Mode: ${mode.toUpperCase()}`));
if (DRY_RUN === '1') console.log(yellow('DRY RUN (no changes will be made).'));

if (mode === 'ssh') deploySSH();
else deployGitHub();
