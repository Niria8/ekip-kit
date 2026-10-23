'use strict';
// Stop: before Claude ends its turn, check the uncommitted change set.
//   - source files changed but no test file changed  → ask for tests (or an
//     explicit reason none is needed)
//   - a protected path changed                        → ask for its contract
//     tests to be run and quoted
// Opt-in per project via "testGate": { "enabled": true } in
// .claude/guardrails.json. Each distinct change set is flagged at most once
// per session, so the gate reminds instead of looping.

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const lib = require('./lib');

function changedFiles(dir) {
  let out;
  try {
    out = execFileSync('git', ['-c', 'core.quotepath=off', 'status', '--porcelain', '--untracked-files=all'], {
      cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000,
    });
  } catch (e) {
    return null; // not a git repo, or git missing
  }
  return out.split(/\r?\n/).filter(Boolean).map((l) => {
    let p = l.slice(3);
    if (p.includes(' -> ')) p = p.split(' -> ').pop();
    return lib.toPosix(p.replace(/^"|"$/g, ''));
  }).filter((p) => !p.endsWith('/'));
}

function evaluate(input, files) {
  const dir = lib.projectDir(input);
  const { config, fromFile } = lib.loadConfig(dir);
  if (!fromFile || !config.testGate.enabled || input.stop_hook_active) return null;
  if (!files || !files.length) return null;

  const tests = files.filter((f) => lib.matchesAny(f, config.testGlobs));
  const source = files.filter((f) => !tests.includes(f) && lib.matchesAny(f, config.sourceGlobs));
  const reasons = [];

  if (source.length && !tests.length) {
    reasons.push(
      `Source files changed with no test changes (${source.slice(0, 5).join(', ')}${source.length > 5 ? ', …' : ''}). ` +
      'Add or update tests (test-integrity skill: failing test first for a bug fix), run them, and quote the result — ' +
      'or state explicitly which existing tests cover this change and show them passing.');
  }
  const hits = [];
  for (const p of config.protectedPaths || []) {
    if (!p || !p.glob) continue;
    const re = lib.globToRegExp(p.glob);
    if (files.some((f) => re.test(f))) hits.push(p);
  }
  if (hits.length) {
    reasons.push('Protected paths changed: ' + hits.map((p) =>
      `${p.glob}${(p.contractTests || []).length ? ` (contract tests: ${p.contractTests.join(', ')})` : ''}`).join('; ') +
      '. Run their contract tests now and quote the command and result before finishing.');
  }
  if (!reasons.length) return null;

  // Flag each distinct change set once per session.
  const key = crypto.createHash('sha1').update(String(input.session_id || '') + '|' + files.slice().sort().join('|')).digest('hex');
  const marker = path.join(os.tmpdir(), 'ctk-stop-gate', key);
  if (fs.existsSync(marker)) return null;
  try {
    fs.mkdirSync(path.dirname(marker), { recursive: true });
    fs.writeFileSync(marker, '');
  } catch (e) { /* best effort */ }

  return '[claude-team-kit test gate] ' + reasons.join(' ');
}

if (require.main === module) {
  lib.run('stop-gate', (input) => {
    const dir = lib.projectDir(input);
    const reason = evaluate(input, changedFiles(dir));
    if (reason) lib.emit({ decision: 'block', reason });
  });
}

module.exports = { evaluate, changedFiles };
