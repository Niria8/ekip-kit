#!/usr/bin/env node
'use strict';
// Checks the team knowledge tree (ekip-kit). Run locally or in CI:
//   node .claude/scripts/check-knowledge.js [--dir docs/knowledge] [--base <git ref>]
// Errors (exit 1):
//   - entry file without the required frontmatter fields / invalid status
//   - single-file category heading without an id ("## DONT-001 — ...")
//   - the same id used twice in the active (non-archive) set
//   - with --base: a knowledge / CLAUDE.md / .claude/rules file DELETED since
//     <base> (moving it into archive/ is fine — knowledge is never deleted)
// Warnings: placeholder values, entries missing from INDEX.md.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const REQUIRED = ['id', 'title', 'category', 'owner', 'status', 'applies-to', 'last-verified'];
const STATUSES = new Set(['active', 'superseded', 'archived']);
const SINGLE_FILE = new Set(['do.md', 'dont.md', 'invariants.md', 'lessons.md']);
const SKIP = new Set(['index.md', 'readme.md']);
const ID_HEADING = /^##\s+([A-Z][A-Z0-9]*-\d+)\s+[—-]\s+\S/;

function walk(dir) {
  let out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(walk(p));
    else if (e.name.toLowerCase().endsWith('.md')) out.push(p);
  }
  return out;
}

function frontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const fields = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([\w-]+):\s*(.*)$/);
    if (kv) fields[kv[1]] = kv[2].replace(/\s+#.*$/, '').trim();
  }
  return fields;
}

function isPlaceholder(v) {
  return /<[^>]*>/.test(v || '');
}

function checkTree(root, knowledgeDir) {
  const errors = [];
  const warnings = [];
  const kdAbs = path.join(root, knowledgeDir);
  if (!fs.existsSync(kdAbs)) return { errors: [`${knowledgeDir} not found`], warnings };

  const indexText = (() => {
    try { return fs.readFileSync(path.join(kdAbs, 'INDEX.md'), 'utf8'); } catch (e) { return ''; }
  })();
  const activeIds = new Map();

  for (const file of walk(kdAbs)) {
    const rel = path.relative(root, file).split(path.sep).join('/');
    const base = path.basename(file).toLowerCase();
    const inArchive = /\/archive\//.test('/' + path.relative(kdAbs, file).split(path.sep).join('/'));
    if (SKIP.has(base)) continue;
    const text = fs.readFileSync(file, 'utf8');
    const ids = [];

    if (SINGLE_FILE.has(base)) {
      for (const line of text.split(/\r?\n/)) {
        if (!/^##\s/.test(line)) continue;
        const m = line.match(ID_HEADING);
        if (!m) errors.push(`${rel}: heading without an id: "${line.trim()}" (expected "## PREFIX-001 — title")`);
        else ids.push(m[1]);
      }
    } else {
      const fm = frontmatter(text);
      if (!fm) {
        errors.push(`${rel}: missing frontmatter (${REQUIRED.join(', ')})`);
        continue;
      }
      for (const k of REQUIRED) if (!fm[k]) errors.push(`${rel}: missing field "${k}"`);
      if (fm.status && !STATUSES.has(fm.status)) errors.push(`${rel}: invalid status "${fm.status}" (active | superseded | archived)`);
      if (inArchive && fm.status === 'active') warnings.push(`${rel}: archived file still has status: active`);
      for (const k of REQUIRED) if (isPlaceholder(fm[k])) warnings.push(`${rel}: placeholder value in "${k}"`);
      if (fm['last-verified'] && !isPlaceholder(fm['last-verified']) && !/^\d{4}-\d{2}-\d{2}$/.test(fm['last-verified'])) {
        errors.push(`${rel}: last-verified must be YYYY-MM-DD`);
      }
      if (fm.id) {
        ids.push(fm.id);
        if (!inArchive && fm.category !== 'work-log' && indexText && !indexText.includes(fm.id)) {
          warnings.push(`${rel}: ${fm.id} is not listed in INDEX.md`);
        }
      }
    }

    if (inArchive) continue;
    for (const id of ids) {
      if (activeIds.has(id)) errors.push(`${rel}: id ${id} already used in ${activeIds.get(id)}`);
      else activeIds.set(id, rel);
    }
  }
  return { errors, warnings };
}

function deletedKnowledge(root, knowledgeDir, baseRef) {
  const out = execFileSync('git', ['-c', 'core.quotepath=off', 'diff', '--name-status', '--find-renames', `${baseRef}...HEAD`], {
    cwd: root, encoding: 'utf8',
  });
  const kd = knowledgeDir.replace(/\\/g, '/').replace(/\/+$/, '') + '/';
  return out.split(/\r?\n/).filter((l) => l.startsWith('D\t')).map((l) => l.slice(2))
    .filter((p) => p.startsWith(kd) || /(^|\/)CLAUDE(\.local)?\.md$/.test(p) || p.startsWith('.claude/rules/'));
}

function main(argv) {
  const arg = (name) => {
    const i = argv.indexOf(name);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const root = process.cwd();
  let knowledgeDir = arg('--dir');
  if (!knowledgeDir) {
    try {
      knowledgeDir = JSON.parse(fs.readFileSync(path.join(root, '.claude', 'guardrails.json'), 'utf8')).knowledgeDir;
    } catch (e) { /* default below */ }
  }
  knowledgeDir = knowledgeDir || 'docs/knowledge';

  const { errors, warnings } = checkTree(root, knowledgeDir);
  const base = arg('--base');
  if (base) {
    for (const p of deletedKnowledge(root, knowledgeDir, base)) {
      errors.push(`${p}: deleted. Knowledge is archived, never deleted — move it to ${knowledgeDir}/archive/YYYY-MM/ and add a line to archive/INDEX.md`);
    }
  }
  for (const w of warnings) console.log(`warning: ${w}`);
  for (const e of errors) console.log(`error:   ${e}`);
  console.log(`${errors.length} error(s), ${warnings.length} warning(s)`);
  return errors.length ? 1 : 0;
}

if (require.main === module) process.exit(main(process.argv.slice(2)));

module.exports = { checkTree, deletedKnowledge, frontmatter, main };
