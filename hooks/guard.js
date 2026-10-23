'use strict';
// PreToolUse guard. Decides deny / ask / (nothing) for:
//   1. destructive shell commands
//   2. deleting or emptying team/personal memory (archive instead)
//   3. reading secret files
//   4. writing secrets into files
//   5. editing protected paths (from .claude/guardrails.json); files created in
//      the current change (new or untracked) are exempt
//   6. weakening tests (new skip markers, removed assertions)
//   7. insecure code patterns (OWASP-style: injection, XSS, weak crypto, ...)

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const lib = require('./lib');

// A file created in the current change (new, or untracked in git) is not yet
// the stable code a protected path guards — e.g. a migration being written.
function isNewFile(dir, rel, tool, existing) {
  if (tool === 'Write' && existing === null) return true;
  try {
    execFileSync('git', ['ls-files', '--error-unmatch', '--', rel], { cwd: dir, stdio: 'ignore', timeout: 5000 });
    return false;
  } catch (e) {
    return e.status === 1; // 1 = untracked; anything else (no repo, no git) = unknown → protect
  }
}

const SHELL_TOOLS = new Set(['Bash', 'PowerShell']);
const WRITE_TOOLS = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit']);

// ---------- 1. destructive commands ----------
const DENY_COMMANDS = [
  [/\brm\s+-[a-z]*r[a-z]*\s+(-[a-z]+\s+)*(\/|~|\$HOME|\/\*)(\s|$)/i, 'recursive delete of a root or home directory'],
  [/\bremove-item\b[^|;&]*-recurse[^|;&]*\s['"]?[a-z]:[\\/]?['"]?(\s|$)/i, 'recursive delete of a drive root'],
  [/\bgit\s+push\b[^|;&]*(--force\b|-f\b|--force-with-lease\b)[^|;&]*\b(main|master|release[\w/-]*|prod\w*)\b/i, 'force-push to a protected branch'],
  [/\b(curl|wget|iwr|invoke-webrequest)\b[^|]*\|\s*(sh|bash|zsh|iex|invoke-expression|python\d?)\b/i, 'piping a downloaded script into a shell'],
  [/\bmkfs(\.\w+)?\b|\bformat-volume\b|\bdd\s+[^|;&]*of=\/dev\//i, 'formatting or overwriting a disk'],
];
const ASK_COMMANDS = [
  [/\bgit\s+push\b[^|;&]*(--force\b|-f\b|--force-with-lease\b)/i, 'force-push rewrites shared history'],
  [/\bgit\s+reset\s+--hard\b/i, 'git reset --hard discards uncommitted work'],
  [/\bgit\s+clean\s+-[a-z]*f/i, 'git clean deletes untracked files'],
  [/\bgit\s+(checkout|restore)\s+(--\s+)?\.(\s|$)/i, 'discards all local changes'],
  [/\b(drop\s+(database|schema|table)|truncate\s+table)\b/i, 'destructive SQL statement'],
  [/\b(terraform\s+(apply|destroy)|kubectl\s+delete|helm\s+uninstall)\b/i, 'changes shared infrastructure'],
  [/\b(npm|pnpm|yarn)\s+publish\b|\btwine\s+upload\b|\bdocker\s+push\b/i, 'publishes an artifact'],
];

// ---------- 2. memory / knowledge deletion ----------
// Matched per command segment against the command word and its path
// arguments — never as substrings of the whole command line, so unrelated
// paths such as src/memory/ or docs/knowledge-export.zip are not affected.
const DELETE_CMD = /^(rm|rmdir|rd|del|erase|unlink|shred|remove-item|ri|clear-content|clc)$/i;
const OVERWRITE_CMD = /^(set-content|sc|out-file)$/i;
const REDIRECT_TARGET = /(^|[^>\d&])\d?>(?!>)\s*['"]?([^\s'"|;&>]+)/g;

function isKnowledgePath(rel, config) {
  const p = lib.toPosix(rel).toLowerCase();
  const kd = lib.toPosix(config.knowledgeDir).toLowerCase().replace(/\/+$/, '');
  return (
    p === kd || p.startsWith(kd + '/') || p.includes('/' + kd + '/') || p.endsWith('/' + kd) ||
    p === '.claude/rules' || p.startsWith('.claude/rules/') || p.includes('/.claude/rules/') || p.endsWith('/.claude/rules') ||
    /(^|\/)claude(\.local)?\.md$/.test(p) ||
    /(^|\/)\.claude\/projects\/[^/]+\/memory(\/|$)/.test(p)
  );
}

// Knowledge files plus personal auto-memory (MEMORY.md and its directory).
function isMemoryPath(word, config) {
  const p = lib.toPosix(word).replace(/^~/, '').replace(/\/+$/, '').toLowerCase();
  return Boolean(p) && (isKnowledgePath(p, config) || /(^|\/)memory\.md$/.test(p));
}

function memoryWriteFindings(norm, config) {
  const out = [];
  for (const segment of norm.split(/&&|\|\||[;|&\n]/)) {
    let words = segment.trim().split(/\s+/).map((w) => w.replace(/^['"`(]+|['"`)]+$/g, '')).filter(Boolean);
    if (words[0] === 'sudo') words = words.slice(1);
    let args = null;
    if (/^git$/i.test(words[0] || '') && /^rm$/i.test(words[1] || '')) args = words.slice(2);
    else if (DELETE_CMD.test(words[0] || '')) args = words.slice(1);
    const targets = (args || []).filter((w) => !w.startsWith('-') && isMemoryPath(w, config));
    if (targets.length) {
      out.push(['deny', `Blocked: this command deletes project/team memory (${targets.join(', ')}). ${ARCHIVE_HINT}`]);
    }
    if (OVERWRITE_CMD.test(words[0] || '') && words.slice(1).some((w) => !w.startsWith('-') && isMemoryPath(w, config))) {
      out.push(['ask', `This command overwrites a memory/knowledge file from the shell, bypassing the shrink check. Prefer the Edit tool; if content is being removed, archive it first. ${ARCHIVE_HINT}`]);
    }
  }
  for (const m of norm.matchAll(REDIRECT_TARGET)) {
    if (isMemoryPath(m[2], config)) {
      out.push(['deny', `Blocked: this redirect empties/overwrites a memory file (${m[2]}). Use ">>" to append, or the Edit tool. ${ARCHIVE_HINT}`]);
    }
  }
  return out;
}

const ARCHIVE_HINT =
  'Knowledge is archived, never deleted. Follow the team-memory skill: move the entry to ' +
  '<knowledgeDir>/archive/YYYY-MM/ (or an archive/ folder inside the memory directory), ' +
  'add a line to archive/INDEX.md, and leave a short pointer in the active file.';

const READ_VERBS = /^(cat|type|more|less|head|tail|bat|gc|get-content|strings|xxd|od|base64|cp|copy|copy-item|scp)$/i;

function checkShell(cmd, config) {
  const out = [];
  const norm = lib.toPosix(cmd);
  for (const [re, why] of DENY_COMMANDS) if (re.test(cmd)) out.push(['deny', `Blocked: ${why}.`]);
  for (const [re, why] of ASK_COMMANDS) if (re.test(cmd)) out.push(['ask', `Confirm: ${why}.`]);

  out.push(...memoryWriteFindings(norm, config));

  const readsSecret = cmd.split(/[;&|]+/).some((segment) => {
    const words = segment.trim().split(/\s+/).map((w) => w.replace(/^['"]|['"]$/g, ''));
    return READ_VERBS.test(words[0] || '') && words.slice(1).some((w) => !w.startsWith('-') && isSecretFile(w));
  });
  if (readsSecret) {
    out.push(['deny', 'Blocked: reading a secrets file (.env, private key). Use .env.example or ask the user for the specific non-secret value you need.']);
  }
  return out;
}

// ---------- 3. secret files ----------
function isSecretFile(rel) {
  const base = path.posix.basename(lib.toPosix(rel)).toLowerCase();
  if (/^\.env\.(example|sample|template|dist)$/.test(base)) return false;
  return (
    base === '.env' || /^\.env\./.test(base) ||
    /\.(pem|key|p12|pfx|jks|keystore)$/.test(base) ||
    /^id_(rsa|dsa|ecdsa|ed25519)$/.test(base) ||
    base === 'credentials' || base === '.pypirc' || base === '.netrc'
  );
}

// ---------- 4. secret scan ----------
const SECRET_PATTERNS = [
  ['deny', 'AWS access key id', /\b(AKIA|ASIA)[0-9A-Z]{16}\b/],
  ['deny', 'private key block', /-----BEGIN (RSA |EC |DSA |OPENSSH |PGP |ENCRYPTED )?PRIVATE KEY( BLOCK)?-----/],
  ['deny', 'GitHub token', /\b(gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{60,})\b/],
  ['deny', 'GitLab token', /\bglpat-[A-Za-z0-9_-]{20,}\b/],
  ['deny', 'Slack token', /\bxox[abposr]-[A-Za-z0-9-]{10,}\b/],
  ['deny', 'Google API key', /\bAIza[0-9A-Za-z_-]{35}\b/],
  ['deny', 'Stripe live key', /\b(sk|rk)_live_[0-9a-zA-Z]{20,}\b/],
  ['deny', 'Anthropic/OpenAI API key', /\bsk-(ant-[A-Za-z0-9_-]{20,}|proj-[A-Za-z0-9_-]{20,}|[A-Za-z0-9]{40,})\b/],
  ['deny', 'connection string with password', /\b[a-z][a-z0-9+.-]*:\/\/[^\s:/@'"]+:(?!\$\{|<|\*{3}|password\b|pass\b|changeme\b)[^\s:/@'"]{4,}@[^\s'"]+/i],
  ['ask', 'hardcoded credential assignment',
    /\b(password|passwd|pwd|secret|api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret)\b["']?\s*[:=]\s*["'](?![<{$%]|\*+["']|x+["']|changeme|change-me|example|placeholder|dummy|test|fake|your[_-])[^"'\s]{8,}["']/i],
];

function scanSecrets(text, config) {
  if (!text || !config.secretScan.enabled) return [];
  const allow = (config.secretScan.allowPatterns || []).map((p) => new RegExp(p));
  const out = [];
  for (const [decision, name, re] of SECRET_PATTERNS) {
    const m = text.match(re);
    if (!m) continue;
    if (allow.some((a) => a.test(m[0]))) continue;
    const shown = m[0].length > 12 ? m[0].slice(0, 6) + '…' + m[0].slice(-2) : '…';
    out.push([decision, `Possible secret in file content (${name}: "${shown}"). Read it from configuration or a secret manager instead; if this is a deliberate test fixture, add an allowPatterns entry to .claude/guardrails.json.`]);
  }
  return out;
}

// ---------- 7. insecure code patterns ----------
// Heuristics, so they ask instead of deny, and fire only when an edit ADDS an
// occurrence (pre-existing code is not re-flagged on every edit). Each rule
// has an id that .claude/guardrails.json → codeScan.ignoreRules can silence.
const CODE_EXT = /\.(js|jsx|mjs|cjs|ts|tsx|py|rb|php|java|kt|cs|go|rs|scala|swift|vue|svelte|html?)$/i;
const CODE_RULES = [
  ['sql-injection', 'SQL built from strings/interpolation — use parameterized queries',
    /\b(SELECT|INSERT\s+INTO|UPDATE|DELETE\s+FROM)\b[^;\n]*?(["'`]\s*\+\s*[\w.$[\]]+|\$\{[^}]+\}|%s["']\s*%|\{[\w.]+\})/gi],
  ['command-injection', 'shell command built from input — pass an argument array, no shell',
    /\b(child_process\.)?(exec|execSync)\s*\(\s*(`[^`]*\$\{|[^)'"`]*\+)|\bos\.(system|popen)\s*\(|\bsubprocess\.\w+\([^)]*shell\s*=\s*True|\bRuntime\.getRuntime\(\)\.exec\s*\(/g],
  ['code-eval', 'dynamic code execution (eval / new Function / exec)',
    /(^|[^\w.])eval\s*\(|\bnew\s+Function\s*\(|(^|[^\w.])exec\s*\(\s*(compile|[\w.]*request|input)/g],
  ['xss-sink', 'raw HTML sink — encode output or sanitize first',
    /\.(innerHTML|outerHTML)\s*=(?!=)|\bdangerouslySetInnerHTML\b|\bdocument\.write(ln)?\s*\(|\bv-html\s*=|\|\s*safe\b|\bmark_safe\s*\(|\bHtml\.Raw\s*\(/g],
  ['tls-disabled', 'TLS certificate verification disabled',
    /rejectUnauthorized\s*:\s*false|NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*['"]?0|verify\s*=\s*False\b|InsecureSkipVerify\s*:\s*true|ServerCertificateValidationCallback\s*=|CERT_NONE\b/g],
  ['weak-hash', 'MD5/SHA-1 — never for passwords or signatures (use argon2/bcrypt/scrypt, SHA-256+)',
    /createHash\s*\(\s*['"](md5|sha1)['"]|hashlib\.(md5|sha1)\s*\(|MessageDigest\.getInstance\s*\(\s*"(MD5|SHA-?1)"|\b(MD5|SHA1)\.Create\s*\(|\bmd5\s*\(/gi],
  ['insecure-random', 'non-cryptographic randomness for a security value — use a CSPRNG',
    /Math\.random\(\)[^;\n]{0,60}\b(token|secret|password|salt|nonce|otp|key)\b|\b(token|secret|password|salt|nonce|otp)\w*\s*[:=][^;\n]{0,60}Math\.random\(\)|\brandom\.(random|randint|choice)\([^)]*\)[^;\n]{0,40}\b(token|secret|password|salt|otp)\b/gi],
  ['unsafe-deserialization', 'deserializing untrusted data can execute code',
    /\bpickle\.loads?\s*\(|\byaml\.load\s*\((?![^)]*Loader\s*=\s*(yaml\.)?SafeLoader)|\bmarshal\.loads\s*\(|\bnew\s+ObjectInputStream\s*\(|\bBinaryFormatter\b|\bunserialize\s*\(\s*\$_(GET|POST|REQUEST|COOKIE)/g],
  ['cors-wildcard', 'CORS allows any origin — restrict to known origins',
    /Access-Control-Allow-Origin['"]?\s*[,:]\s*['"]\*['"]|\borigin\s*:\s*['"]\*['"]|allow_origins\s*=\s*\[\s*['"]\*['"]|AllowAnyOrigin\s*\(/g],
  ['ssrf', 'server-side request to a URL taken from the request — use an allow-list',
    /\b(fetch|axios(\.\w+)?|got|request|requests\.\w+|http\.get|urllib\.request\.urlopen|httpx\.\w+)\s*\(\s*(req|request)\.(query|body|params|args|GET|POST)\b/g],
  ['path-traversal', 'file path taken from the request — normalize and confine to an allowed root',
    /\b(readFile(Sync)?|createReadStream|sendFile|open|unlink(Sync)?|send_file)\s*\(\s*[^)]*\b(req|request)\.(query|body|params|args|GET|POST)\b/g],
  ['sensitive-log', 'credential or token written to logs',
    /\b(console\.(log|info|warn|error|debug)|log(ger)?\.(info|warn|warning|error|debug)|print|System\.out\.println)\s*\([^)\n]*\b(password|passwd|secret|token|api_?key|authorization)\b/gi],
];

function scanCode(rel, oldText, newText, config) {
  if (!config.codeScan.enabled || !CODE_EXT.test(rel) || !newText) return [];
  const ignore = new Set(config.codeScan.ignoreRules || []);
  const hits = [];
  for (const [id, why, re] of CODE_RULES) {
    if (ignore.has(id)) continue;
    if (count(newText, re) > count(oldText, re)) hits.push(`${id}: ${why}`);
  }
  if (!hits.length) return [];
  return [['ask', `Possible insecure code (security-gate skill): ${hits.join('; ')}. ` +
    'Confirm only if the input is trusted or already handled; otherwise fix it. ' +
    'A rule that is noisy for this project can be listed in codeScan.ignoreRules in .claude/guardrails.json.']];
}

// ---------- 6. test integrity ----------
const SKIP_MARKERS = /\b(it|describe|test|context)\.(skip|only|todo)\b|\bx(it|describe|test)\s*\(|\bf(it|describe)\s*\(|@pytest\.mark\.(skip|skipif|xfail)\b|\bpytest\.skip\s*\(|@unittest\.skip|@(Disabled|Ignore)\b|\[(Ignore|Skip)\b|Skip\s*=\s*"|\bt\.Skip(Now|f)?\s*\(|\bmarkTestSkipped\s*\(/g;
const ASSERTIONS = /\b(assert\w*|expect\s*\(|Assert\.\w+|assertThat|should\.\w+|require\.\w+\(t|t\.(Error|Fatal)f?\s*\()/g;

function count(text, re) {
  return ((text || '').match(re) || []).length;
}

function checkTestIntegrity(oldText, newText) {
  const out = [];
  if (count(newText, SKIP_MARKERS) > count(oldText, SKIP_MARKERS)) {
    out.push(['ask', 'This edit adds a skip/only/xfail marker to a test. Tests must not be disabled to get a change to pass (test-integrity skill). Confirm only if there is a stated reason.']);
  }
  const before = count(oldText, ASSERTIONS);
  const after = count(newText, ASSERTIONS);
  if (before > 0 && after < before) {
    out.push(['ask', `This edit removes assertions from a test (${before} → ${after}). Loosening or deleting assertions hides regressions (test-integrity skill). Confirm only if the removed checks were genuinely wrong.`]);
  }
  return out;
}

// ---------- write/edit analysis ----------
function newAndOld(tool, ti, existing) {
  if (tool === 'Write') return { oldText: existing || '', newText: ti.content || '', full: true };
  if (tool === 'Edit') return { oldText: ti.old_string || '', newText: ti.new_string || '', full: false };
  if (tool === 'MultiEdit') {
    const edits = ti.edits || [];
    return {
      oldText: edits.map((e) => e.old_string || '').join('\n'),
      newText: edits.map((e) => e.new_string || '').join('\n'),
      full: false,
    };
  }
  if (tool === 'NotebookEdit') return { oldText: '', newText: ti.new_source || '', full: false };
  return { oldText: '', newText: '', full: false };
}

function lines(t) {
  return t ? t.split(/\r?\n/).filter((l) => l.trim()).length : 0;
}

function checkWrite(tool, ti, dir, config, fromFile) {
  const out = [];
  const file = ti.file_path || ti.notebook_path || '';
  const rel = lib.relPath(dir, file);
  const abs = path.isAbsolute(file) ? file : path.join(dir, file);
  const existing = tool === 'Write' ? lib.readFileSafe(abs) : null;
  const { oldText, newText } = newAndOld(tool, ti, existing);

  out.push(...scanSecrets(newText, config));
  if (!lib.matchesAny(rel, config.testGlobs)) out.push(...scanCode(rel, oldText, newText, config));

  if (isKnowledgePath(rel, config) || isKnowledgePath(lib.toPosix(abs), config)) {
    if (tool === 'Write' && existing !== null) {
      const was = lines(existing);
      const now = lines(newText);
      if (now === 0) {
        out.push(['deny', `Blocked: this would empty a memory/knowledge file. ${ARCHIVE_HINT}`]);
      } else if (was >= 10 && now < was * 0.5) {
        out.push(['ask', `This rewrite shrinks a memory/knowledge file from ${was} to ${now} lines. If content is being removed, archive it first. ${ARCHIVE_HINT}`]);
      }
    } else if (tool !== 'Write' && oldText.length >= 300 && newText.length < oldText.length * 0.2 && !/archive/i.test(newText)) {
      out.push(['ask', `This edit removes most of a memory/knowledge passage without leaving an archive pointer. ${ARCHIVE_HINT}`]);
    }
  }

  if (fromFile && !isNewFile(dir, rel, tool, existing)) {
    for (const p of config.protectedPaths || []) {
      if (p && p.glob && lib.globToRegExp(p.glob).test(rel)) {
        const tests = (p.contractTests || []).join(', ');
        out.push(['ask', `Protected path (${p.glob}): ${p.reason || 'marked stable by the team'}` +
          (tests ? ` Run its contract tests before and after this change: ${tests}.` : '') +
          ' Follow the safe-change skill; confirm this edit is required by the task.']);
        break;
      }
    }
  }

  if (lib.matchesAny(rel, config.testGlobs)) {
    out.push(...checkTestIntegrity(oldText, newText));
  }
  return out;
}

function decide(findings) {
  const deny = findings.filter((f) => f[0] === 'deny');
  const ask = findings.filter((f) => f[0] === 'ask');
  if (deny.length) return { decision: 'deny', reasons: deny.map((f) => f[1]) };
  if (ask.length) return { decision: 'ask', reasons: ask.map((f) => f[1]) };
  return null;
}

function evaluate(input) {
  const tool = input.tool_name || '';
  const ti = input.tool_input || {};
  const dir = lib.projectDir(input);
  const { config, fromFile } = lib.loadConfig(dir);
  let findings = [];

  if (SHELL_TOOLS.has(tool)) {
    findings = checkShell(String(ti.command || ''), config);
  } else if (tool === 'Read') {
    if (isSecretFile(lib.relPath(dir, ti.file_path))) {
      findings.push(['deny', 'Blocked: reading a secrets file (.env, private key, credentials). Use .env.example or ask the user for the specific non-secret value you need.']);
    }
  } else if (WRITE_TOOLS.has(tool)) {
    findings = checkWrite(tool, ti, dir, config, fromFile);
  }
  return decide(findings);
}

if (require.main === module) {
  lib.run('guard', (input) => {
    const result = evaluate(input);
    if (!result) return;
    lib.emit({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: result.decision,
        permissionDecisionReason: '[ekip-kit] ' + result.reasons.join(' | '),
      },
    });
  });
}

module.exports = { evaluate, isSecretFile, isKnowledgePath, scanSecrets, scanCode, checkTestIntegrity, checkShell };
