'use strict';
// Shared helpers for the takim hooks.
// Hooks must never break a session because of their own bugs: every entry
// point catches its errors and exits 0 (fail-open), logging to stderr.

const fs = require('fs');
const path = require('path');

const DEFAULTS = {
  knowledgeDir: 'docs/knowledge',
  protectedPaths: [],
  sourceGlobs: ['src/**', 'app/**', 'lib/**'],
  testGlobs: [
    'tests/**', 'test/**', '**/__tests__/**', '**/*.test.*', '**/*.spec.*',
    '**/*_test.*', '**/test_*.py', '**/*Test.java', '**/*Tests.cs',
  ],
  testGate: { enabled: false },
  secretScan: { enabled: true, allowPatterns: [] },
  codeScan: { enabled: true, ignoreRules: [] },
  sessionContext: { enabled: true, maxChars: 6000 },
};

function readStdin() {
  try {
    const raw = fs.readFileSync(0, 'utf8');
    return raw.trim() ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function projectDir(input) {
  return process.env.CLAUDE_PROJECT_DIR || (input && input.cwd) || process.cwd();
}

// Returns { config, fromFile }. Without .claude/guardrails.json the defaults
// apply, and project-specific gates (testGate, protectedPaths) stay off.
function loadConfig(dir) {
  const file = path.join(dir, '.claude', 'guardrails.json');
  let user = null;
  try {
    if (fs.existsSync(file)) user = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    process.stderr.write(`[takim] invalid ${file}: ${e.message}\n`);
  }
  const config = Object.assign({}, DEFAULTS, user || {});
  for (const k of ['testGate', 'secretScan', 'codeScan', 'sessionContext']) {
    config[k] = Object.assign({}, DEFAULTS[k], (user && user[k]) || {});
  }
  return { config, fromFile: Boolean(user) };
}

function toPosix(p) {
  return String(p || '').replace(/\\/g, '/');
}

// Path relative to the project, posix separators. Paths outside the project
// are returned absolute (posix) so they never match project-relative globs.
function relPath(dir, file) {
  if (!file) return '';
  const abs = path.isAbsolute(file) ? file : path.join(dir, file);
  const rel = path.relative(dir, abs);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return toPosix(abs);
  return toPosix(rel);
}

function globToRegExp(glob) {
  let re = '';
  const g = toPosix(glob);
  for (let i = 0; i < g.length; i++) {
    const c = g[i];
    if (c === '*') {
      if (g[i + 1] === '*') {
        if (g[i + 2] === '/') { re += '(?:.*/)?'; i += 2; } else { re += '.*'; i += 1; }
      } else {
        re += '[^/]*';
      }
    } else if (c === '?') {
      re += '[^/]';
    } else if ('\\^$+.()|{}[]'.includes(c)) {
      re += '\\' + c;
    } else {
      re += c;
    }
  }
  return new RegExp('^' + re + '$', process.platform === 'win32' ? 'i' : '');
}

function matchesAny(rel, globs) {
  return (globs || []).some((g) => globToRegExp(g).test(rel));
}

function readFileSafe(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch (e) {
    return null;
  }
}

function emit(obj) {
  process.stdout.write(JSON.stringify(obj));
}

// Kill switch, for when a hook gets in someone's way and they need to keep
// working: TAKIM_DISABLE=1 (or true/all) turns every hook off;
// a comma list such as "guard,stop-gate" turns off only those.
function isDisabled(name, env = process.env) {
  const v = String(env.TAKIM_DISABLE || '').trim().toLowerCase();
  if (!v || v === '0' || v === 'false') return false;
  if (v === '1' || v === 'true' || v === 'all') return true;
  return v.split(/[\s,]+/).includes(String(name).toLowerCase());
}

function run(name, main) {
  if (isDisabled(name)) process.exit(0);
  try {
    main(readStdin());
  } catch (e) {
    process.stderr.write(`[takim] hook error (ignored): ${e && e.stack}\n`);
  }
  process.exit(0);
}

module.exports = {
  DEFAULTS, readStdin, projectDir, loadConfig, toPosix, relPath,
  globToRegExp, matchesAny, readFileSafe, emit, run, isDisabled,
};
