'use strict';
// Structural checks for the plugin itself: every agent, skill, and command
// is well-formed, and every reference to one in the docs resolves.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
// Commands that belong to Claude Code itself or to other plugins the docs mention.
const EXTERNAL_COMMANDS = new Set(['clear', 'compact', 'init', 'plugin', 'revise-claude-md', 'worktree']);
const TOOLS = new Set(['Read', 'Write', 'Edit', 'Grep', 'Glob', 'Bash', 'Agent', 'WebFetch', 'WebSearch', 'NotebookEdit']);

function frontmatter(file) {
  const text = fs.readFileSync(file, 'utf8');
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  assert.ok(m, `${file}: missing frontmatter`);
  const fields = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([\w-]+):\s*(.*)$/);
    if (kv) fields[kv[1]] = kv[2].trim();
  }
  return { fields, body: m[2] };
}

const list = (dir, filter) => fs.readdirSync(path.join(ROOT, dir)).filter(filter);
const agents = list('agents', (f) => f.endsWith('.md')).map((f) => f.slice(0, -3));
const skills = list('skills', (f) => fs.existsSync(path.join(ROOT, 'skills', f, 'SKILL.md')));
const commands = list('commands', (f) => f.endsWith('.md')).map((f) => f.slice(0, -3));

test('the kit ships its full role set', () => {
  assert.deepEqual(agents.sort(), ['code-reviewer', 'implementer', 'knowledge-curator', 'planner', 'regression-verifier', 'security-gatekeeper']);
});

test('agents are well-formed', () => {
  for (const a of agents) {
    const { fields, body } = frontmatter(path.join(ROOT, 'agents', a + '.md'));
    assert.equal(fields.name, a, `${a}: name must match file name`);
    assert.ok(fields.description && fields.description.length > 60, `${a}: description too short to trigger delegation`);
    const tools = (fields.tools || '').split(',').map((t) => t.trim()).filter(Boolean);
    assert.ok(tools.length, `${a}: tools missing`);
    for (const t of tools) assert.ok(TOOLS.has(t), `${a}: unknown tool ${t}`);
    assert.ok(body.trim().length > 200, `${a}: body too short`);
  }
});

test('read-only roles cannot edit files', () => {
  for (const a of ['code-reviewer', 'security-gatekeeper']) {
    const { fields } = frontmatter(path.join(ROOT, 'agents', a + '.md'));
    assert.ok(!/\b(Write|Edit)\b/.test(fields.tools), `${a} must not have Write/Edit`);
  }
});

test('skills are well-formed', () => {
  for (const s of skills) {
    const { fields } = frontmatter(path.join(ROOT, 'skills', s, 'SKILL.md'));
    assert.equal(fields.name, s, `${s}: name must match directory`);
    assert.ok(fields.description && fields.description.length > 60, `${s}: description too short`);
  }
});

test('commands are well-formed', () => {
  for (const c of commands) {
    const { fields, body } = frontmatter(path.join(ROOT, 'commands', c + '.md'));
    assert.ok(fields.description, `${c}: description missing`);
    assert.ok(body.trim().length > 100, `${c}: body too short`);
  }
});

test('hooks.json points at scripts that exist', () => {
  const hooks = JSON.parse(fs.readFileSync(path.join(ROOT, 'hooks', 'hooks.json'), 'utf8')).hooks;
  for (const entries of Object.values(hooks)) {
    for (const e of entries) {
      for (const h of e.hooks) {
        const m = h.command.match(/\$\{CLAUDE_PLUGIN_ROOT\}\/([^"]+)/);
        assert.ok(m && fs.existsSync(path.join(ROOT, m[1])), `missing script for: ${h.command}`);
      }
    }
  }
});

function allMarkdown(dir) {
  let out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '.git' || e.name === 'node_modules') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(allMarkdown(p));
    else if (e.name.endsWith('.md')) out.push(p);
  }
  return out;
}

test('every referenced agent, skill, and command exists', () => {
  const known = new Set([...agents, ...skills]);
  const problems = [];
  for (const file of allMarkdown(ROOT)) {
    const text = fs.readFileSync(file, 'utf8');
    const rel = path.relative(ROOT, file);
    for (const m of text.matchAll(/takim:([a-z-]+)/g)) {
      if (!known.has(m[1])) problems.push(`${rel}: takim:${m[1]}`);
    }
    for (const m of text.matchAll(/`([a-z]+(?:-[a-z]+)+)` (skill|agent)\b/g)) {
      if (!known.has(m[1])) problems.push(`${rel}: \`${m[1]}\` ${m[2]}`);
    }
    for (const m of text.matchAll(/`\/([a-z]+(?:-[a-z]+)*)[\s`]/g)) {
      if (!commands.includes(m[1]) && !EXTERNAL_COMMANDS.has(m[1])) problems.push(`${rel}: /${m[1]}`);
    }
  }
  assert.deepEqual(problems, []);
});

test('version is the same in all manifests and has a changelog entry', () => {
  const read = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
  const plugin = read('.claude-plugin/plugin.json').version;
  const market = read('.claude-plugin/marketplace.json').plugins.find((p) => p.name === 'takim').version;
  const pkg = read('package.json').version;
  assert.equal(market, plugin, 'marketplace.json version differs from plugin.json');
  assert.equal(pkg, plugin, 'package.json version differs from plugin.json');
  const changelog = fs.readFileSync(path.join(ROOT, 'CHANGELOG.md'), 'utf8');
  assert.match(changelog, /^## \[Unreleased\]/m, 'CHANGELOG.md needs an Unreleased section');
  assert.ok(changelog.includes(`## [${plugin}]`), `CHANGELOG.md has no entry for ${plugin}`);
});

test('license is consistent', () => {
  const read = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
  const license = fs.readFileSync(path.join(ROOT, 'LICENSE'), 'utf8');
  assert.match(license, /^MIT License/);
  assert.equal(read('.claude-plugin/plugin.json').license, 'MIT');
  assert.equal(read('package.json').license, 'MIT');
});

test('template settings enable this plugin from this marketplace', () => {
  const settings = JSON.parse(fs.readFileSync(path.join(ROOT, 'skills/team-project-setup/templates/.claude/settings.json'), 'utf8'));
  const market = JSON.parse(fs.readFileSync(path.join(ROOT, '.claude-plugin/marketplace.json'), 'utf8')).name;
  assert.ok(settings.extraKnownMarketplaces[market], `template must register marketplace "${market}"`);
  assert.equal(settings.enabledPlugins[`takim@${market}`], true);
});
