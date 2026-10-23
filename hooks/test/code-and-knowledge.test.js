'use strict';
// Code-pattern scan (guard.js) and the knowledge checker template.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const guard = require('../guard');
const checker = require('../../skills/team-project-setup/templates/.claude/scripts/check-knowledge');

const CFG = { codeScan: { enabled: true, ignoreRules: [] } };
const rules = (rel, oldText, newText, cfg = CFG) => {
  const r = guard.scanCode(rel, oldText, newText, cfg);
  return r.length ? [...r[0][1].matchAll(/([a-z-]+): /g)].map((m) => m[1]).filter((x) => x !== 'skill') : [];
};

// ---------- code scan ----------
const BAD = {
  'sql-injection': ['db.query("SELECT * FROM users WHERE id = " + id)', 'cur.execute(f"SELECT * FROM t WHERE id = {uid}")'],
  'command-injection': ['exec(`ls ${dir}`)', 'subprocess.run(cmd, shell=True)', 'os.system(cmd)'],
  'code-eval': ['const r = eval(input)', 'const f = new Function(body)'],
  'xss-sink': ['el.innerHTML = html', '<div dangerouslySetInnerHTML={{__html: x}} />'],
  'tls-disabled': ['https.request({ rejectUnauthorized: false })', 'requests.get(u, verify=False)'],
  'weak-hash': ["crypto.createHash('md5')", 'hashlib.sha1(pw)'],
  'insecure-random': ['const token = Math.random().toString(36)'],
  'unsafe-deserialization': ['pickle.loads(data)', 'yaml.load(f)'],
  'cors-wildcard': ["app.use(cors({ origin: '*' }))"],
  ssrf: ['await fetch(req.query.url)'],
  'path-traversal': ['res.sendFile(req.params.name)'],
  'sensitive-log': ['console.log("login", password)'],
};
for (const [rule, samples] of Object.entries(BAD)) {
  test(`code scan flags ${rule}`, () => {
    for (const s of samples) assert.ok(rules('src/a.ts', '', s).includes(rule), s);
  });
}

test('code scan ignores safe equivalents', () => {
  for (const s of [
    'db.query("SELECT * FROM users WHERE id = ?", [id])',
    'execFile("ls", [dir])',
    'model.eval()',
    'el.textContent = t',
    'const x = Math.random() * 10',
    'yaml.load(f, Loader=yaml.SafeLoader)',
    'console.log("user created")',
    "crypto.createHash('sha256')",
  ]) assert.deepEqual(rules('src/a.ts', '', s), [], s);
});

test('code scan only flags NEW occurrences', () => {
  const old = 'el.innerHTML = a;';
  assert.deepEqual(rules('src/a.js', old, old + '\nconst y = 1;'), []);
  assert.deepEqual(rules('src/a.js', old, old + '\nel.innerHTML = b;'), ['xss-sink']);
});

test('code scan skips non-code files, test files, and ignored rules', () => {
  assert.deepEqual(rules('docs/security.md', '', 'el.innerHTML = html'), []);
  assert.deepEqual(rules('src/a.ts', '', 'el.innerHTML = html', { codeScan: { enabled: true, ignoreRules: ['xss-sink'] } }), []);
  assert.deepEqual(rules('src/a.ts', '', 'el.innerHTML = html', { codeScan: { enabled: false } }), []);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ctk-'));
  const r = guard.evaluate({ tool_name: 'Write', tool_input: { file_path: path.join(dir, 'tests/x.test.js'), content: 'eval(x)' }, cwd: dir });
  assert.equal(r, null);
  const r2 = guard.evaluate({ tool_name: 'Write', tool_input: { file_path: path.join(dir, 'src/x.js'), content: 'eval(x)' }, cwd: dir });
  assert.equal(r2.decision, 'ask');
});

// ---------- knowledge checker ----------
function tree(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ctk-kn-'));
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(dir, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content);
  }
  return dir;
}
const fm = (o) => '---\n' + Object.entries(o).map(([k, v]) => `${k}: ${v}`).join('\n') + '\n---\n\nbody\n';
const GOOD = { id: 'PROJ-001', title: 'Overview', category: 'project', owner: 'core', status: 'active', 'applies-to': '["**"]', 'last-verified': '2026-10-16' };

test('knowledge checker accepts a valid tree', () => {
  const dir = tree({
    'docs/knowledge/INDEX.md': '- PROJ-001 — Overview',
    'docs/knowledge/project/overview.md': fm(GOOD),
    'docs/knowledge/do-dont/DONT.md': '# DONT\n\n## DONT-001 — No floats\n',
  });
  assert.deepEqual(checker.checkTree(dir, 'docs/knowledge'), { errors: [], warnings: [] });
});

test('knowledge checker reports missing fields, bad status, bad date, bad headings, duplicate ids', () => {
  const dir = tree({
    'docs/knowledge/INDEX.md': '- PROJ-001',
    'docs/knowledge/project/a.md': fm({ ...GOOD, owner: undefined }).replace('owner: undefined\n', ''),
    'docs/knowledge/project/b.md': fm({ ...GOOD, status: 'done', 'last-verified': '16.10.2026' }),
    'docs/knowledge/project/c.md': 'no frontmatter',
    'docs/knowledge/do-dont/DONT.md': '## Never do this\n',
  });
  const { errors } = checker.checkTree(dir, 'docs/knowledge');
  const all = errors.join('\n');
  assert.match(all, /a\.md: missing field "owner"/);
  assert.match(all, /b\.md: invalid status "done"/);
  assert.match(all, /b\.md: last-verified must be YYYY-MM-DD/);
  assert.match(all, /c\.md: missing frontmatter/);
  assert.match(all, /DONT\.md: heading without an id/);
  assert.match(all, /id PROJ-001 already used/);
});

test('knowledge checker allows an id to exist in both active and archive', () => {
  const dir = tree({
    'docs/knowledge/INDEX.md': '- PROJ-001',
    'docs/knowledge/project/overview.md': fm(GOOD),
    'docs/knowledge/archive/2026-10/project/overview.md': fm({ ...GOOD, status: 'archived' }),
  });
  assert.deepEqual(checker.checkTree(dir, 'docs/knowledge').errors, []);
});

test('knowledge checker fails a branch that deletes knowledge, passes one that archives it', (t) => {
  const dir = tree({
    'docs/knowledge/INDEX.md': '- PROJ-001 - PROJ-002',
    'docs/knowledge/project/a.md': fm(GOOD),
    'docs/knowledge/project/b.md': fm({ ...GOOD, id: 'PROJ-002' }),
    'CLAUDE.md': '# x',
  });
  const git = (...a) => spawnSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', ...a], { cwd: dir, encoding: 'utf8' });
  if (git('init', '-q').status !== 0) return t.skip('git not available');
  git('add', '.');
  git('commit', '-qm', 'base');
  git('branch', 'base');
  git('mv', 'docs/knowledge/project/a.md', 'docs/knowledge/archive/a.md');
  git('commit', '-qm', 'archive a');
  assert.deepEqual(checker.deletedKnowledge(dir, 'docs/knowledge', 'base'), []);
  git('rm', '-q', 'docs/knowledge/project/b.md', 'CLAUDE.md');
  git('commit', '-qm', 'delete b');
  assert.deepEqual(checker.deletedKnowledge(dir, 'docs/knowledge', 'base').sort(), ['CLAUDE.md', 'docs/knowledge/project/b.md']);
});

test('template knowledge tree passes the checker with no errors', () => {
  const root = path.join(__dirname, '..', '..', 'skills', 'team-project-setup', 'templates');
  assert.deepEqual(checker.checkTree(root, 'docs/knowledge').errors, []);
});
