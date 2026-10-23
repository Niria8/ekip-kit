'use strict';
// SessionStart: re-inject the team's critical knowledge at startup, resume,
// /clear and — most importantly — after context compaction, which is when
// earlier decisions and "do not touch" rules are most likely to be lost.
// Only headings and pointers are injected, never whole files.
// The short CORE block is injected in every project: plugin skills are
// otherwise rarely invoked for ordinary coding tasks (measured in
// docs/KARSILASTIRMA.md), so the session is told which skill fits which task.

const CORE = [
  '## Working rules (takim)',
  'Before acting, check whether one of these skills applies and invoke it with the Skill tool:',
  '- Changing existing code → `takim:safe-change` (baseline tests first, impact analysis, smallest diff at the root cause).',
  '- Bug, failing test, or unexpected behavior → `takim:systematic-debugging`, then `takim:test-driven-development` (failing test first).',
  '- New behavior → `takim:test-driven-development`.',
  '- Writing or changing tests, or reporting test results → `takim:test-integrity`.',
  '- Auth, secrets, external input, dependencies, migrations → `takim:security-gate`.',
  '- Recording or cleaning up project knowledge → `takim:team-memory` (archive, never delete).',
  'Before saying done: run the tests in this session and quote the command and result; name any pre-existing failure you left untouched.',
].join('\n');

const fs = require('fs');
const path = require('path');
const lib = require('./lib');

function headings(file, prefix) {
  const text = lib.readFileSafe(file);
  if (!text) return [];
  return text.split(/\r?\n/)
    .filter((l) => /^##\s+\S/.test(l) && (!prefix || l.includes(prefix)))
    .map((l) => '- ' + l.replace(/^##\s+/, '').trim());
}

function activeLedgers(dir) {
  let names = [];
  try {
    names = fs.readdirSync(dir).filter((n) => n.endsWith('.md') && n.toLowerCase() !== 'readme.md');
  } catch (e) {
    return [];
  }
  const out = [];
  for (const n of names) {
    const text = lib.readFileSafe(path.join(dir, n)) || '';
    if (/^status:\s*(archived|superseded|done)\b/m.test(text)) continue;
    const title = (text.match(/^title:\s*(.+)$/m) || [])[1] || n;
    const next = (text.split(/^## Next\s*$/m)[1] || '').split(/^## /m)[0]
      .split(/\r?\n/).filter((l) => /^- \[ \]/.test(l)).slice(0, 3);
    out.push(`- ${title.trim()} (work-log/${n})` + (next.length ? '\n  next: ' + next.map((l) => l.slice(6)).join('; ') : ''));
  }
  return out;
}

function build(input) {
  const dir = lib.projectDir(input);
  const { config, fromFile } = lib.loadConfig(dir);
  if (!config.sessionContext.enabled) return null;
  const kd = path.join(dir, config.knowledgeDir);
  if (!fromFile && !fs.existsSync(kd)) return CORE;

  const parts = [CORE, '## Team guardrails (takim)'];
  if (input.source === 'compact') {
    parts.push('Context was just compacted. Before continuing: re-read the active work-log for the current task, re-check "Do not touch" and invariants below, and re-run the baseline tests before further edits. Do not rely on memory of earlier decisions — read them.');
  }
  parts.push(`Knowledge index: ${config.knowledgeDir}/INDEX.md — open only entries whose applies-to matches the files you touch. Knowledge is archived, never deleted (team-memory skill). Edits to existing code follow the safe-change skill.`);

  const dont = headings(path.join(kd, 'do-dont', 'DONT.md'));
  if (dont.length) parts.push("### DON'T\n" + dont.join('\n'));
  const inv = headings(path.join(kd, 'invariants', 'INVARIANTS.md'));
  if (inv.length) parts.push('### Invariants (must not break)\n' + inv.join('\n'));
  const prot = (config.protectedPaths || []).filter((p) => p && p.glob)
    .map((p) => `- ${p.glob}: ${p.reason || ''}`.trim());
  if (fromFile && prot.length) parts.push('### Protected paths (edits require confirmation)\n' + prot.join('\n'));
  const ledgers = activeLedgers(path.join(kd, 'work-log'));
  if (ledgers.length) parts.push('### Active work (task-ledger)\n' + ledgers.join('\n'));

  let text = parts.join('\n\n');
  const max = Number(config.sessionContext.maxChars) || 6000;
  if (text.length > max) text = text.slice(0, max) + `\n… (truncated; see ${config.knowledgeDir}/INDEX.md)`;
  return text;
}

if (require.main === module) {
  lib.run('session-context', (input) => {
    const text = build(input);
    if (!text) return;
    lib.emit({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: text } });
  });
}

module.exports = { build };
