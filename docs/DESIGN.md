# Design

Why the kit is built the way it is.

## 0. Roles

The kit ships six subagents — `planner`, `implementer`,
`regression-verifier`, `code-reviewer`, `security-gatekeeper`,
`knowledge-curator` — so the core rule "the author never judges their own
change" is built in rather than left to discipline: each role runs in its
own context and sees the change as someone else's work. How they chain,
and how much of the chain a change needs, is in [`WORKFLOW.md`](WORKFLOW.md).
The project template copies the risk table into `.claude/rules/workflow.md`
so every session in the project sees it.

## 1. Team memory lives in the repository

Claude Code's auto-memory (`~/.claude/projects/<project>/memory/`) is per
person and per machine: a team cannot share, review, or roll it back, and
much of what a session "knows" disappears on context compaction. The kit
therefore puts project knowledge in the repository:

```
CLAUDE.md                 lean index (< 150 lines) + @imports
.claude/rules/*.md        short rules; always loaded, or path-scoped via `paths:`
docs/knowledge/
  INDEX.md                one line per entry
  project/ conventions/ do-dont/ invariants/ decisions/ lessons/ work-log/
  archive/                retired entries, moved — never deleted
```

Each entry has `id`, `category`, `owner`, `status`, `applies-to`,
`last-verified`, `links`. Claude reads the index and opens only entries
whose `applies-to` matches the files it is about to change, so the tree
can grow without flooding the context window.

Knowledge changes go through pull requests like code. That gives the team
review, history, blame, and rollback for free.

## 2. Archive, never delete

"Clean up the memory" is interpreted as *shrink the active set*. Entries
classified as duplicate, stale, or too detailed are moved to
`archive/YYYY-MM/` with `status`, `archived-on`, and `archive-reason`; an
index line is added to `archive/INDEX.md`; and the active location keeps a
short summary or pointer. Restoring is the reverse move.

This is enforced, not just requested: the guard hook denies `rm`,
`git rm`, `Remove-Item`, truncation, and empty Writes on `CLAUDE.md`,
`.claude/rules/`, the knowledge directory, and auto-memory directories,
and asks before a rewrite that shrinks such a file by more than half.
Moving files (`git mv`, `Move-Item`) is allowed — that is how archiving
works.

## 3. Regressions as scope grows

Most regressions an agent causes come from a caller nobody checked, a test
bent to pass, an unrequested refactor, or a finished piece of work that
fell out of context. The kit counters each:

| Cause | Countermeasure |
|---|---|
| unchecked callers | `safe-change`: impact analysis before the first edit |
| tests bent to pass | `test-integrity` + guard hook asks on skip markers / removed assertions |
| unrequested refactors | `safe-change`: smallest diff, every hunk traces to the task |
| forgotten decisions | `task-ledger` work log + SessionStart hook re-injects it after compaction |
| stable modules edited casually | `invariants/` with tests + `protectedPaths` → guard hook asks, Stop hook asks for contract tests |
| "done" without running tests | Stop hook test gate; rules forbid unrun claims |

## 4. Hooks

Instructions can be forgotten; hooks run every time. All hooks are Node.js
(cross-platform, no dependencies), read the standard hook JSON on stdin,
and exit 0 on their own errors (fail-open) so a hook bug never blocks work.

**Kill switch.** `EKIP_KIT_DISABLE=1` (or `true` / `all`) in the
environment Claude Code starts from turns every hook off; a comma list —
`guard`, `session-context`, `stop-gate` — turns off only those. It exists so
a false positive never leaves someone unable to work; the false positive
should still be reported and fixed.

### `hooks/guard.js` — PreToolUse (`Bash|PowerShell|Read|Write|Edit|MultiEdit|NotebookEdit`)

| Check | Decision |
|---|---|
| `rm -rf /`, drive-root delete, `curl … \| sh`, disk format, force-push to main/master/release/prod | deny |
| delete (`rm`, `git rm`, `Remove-Item`, …) or `>` truncation of memory or knowledge files — matched on the command's path arguments, so `src/memory/` or `docs/knowledge-export.zip` are unaffected; `>>` append is allowed | deny |
| `Set-Content` / `Out-File` overwriting a memory or knowledge file from the shell | ask |
| reading `.env*` (not `.env.example`), `*.pem`, `*.key`, `id_rsa`, … | deny |
| AWS / GitHub / GitLab / Slack / Google / Stripe / Anthropic / OpenAI keys, private-key blocks, URLs with passwords in written content | deny |
| `password = "…"`-style hardcoded credentials (placeholders ignored) | ask |
| force-push to other branches, `reset --hard`, `git clean -f`, destructive SQL, `terraform apply`, `kubectl delete`, publish | ask |
| knowledge file rewritten to < 50 % of its lines, or a large passage removed without an archive pointer | ask |
| new skip/only/xfail marker or fewer assertions in a test file | ask |
| newly added insecure code in a source file (rules: `sql-injection`, `command-injection`, `code-eval`, `xss-sink`, `tls-disabled`, `weak-hash`, `insecure-random`, `unsafe-deserialization`, `cors-wildcard`, `ssrf`, `path-traversal`, `sensitive-log`) | ask; noisy rules can be silenced per project with `codeScan.ignoreRules` |
| edit under a `protectedPaths` glob (config only) | ask, citing reason and contract tests |

### `hooks/session-context.js` — SessionStart

Runs on startup, resume, `/clear`, and compaction, in projects that have
`.claude/guardrails.json` or a knowledge directory. Injects (headings
only, capped at `maxChars`): DON'T entries, invariants, protected paths,
active work logs with their next steps. After compaction it also tells
Claude to re-read the ledger and re-run the baseline before editing.

### `hooks/stop-gate.js` — Stop

Opt-in (`testGate.enabled`). Reads the uncommitted change set from
`git status`. If source files changed without test changes, or a
protected path changed, it asks Claude to continue and add/run tests.
Each distinct change set is flagged once per session, and
`stop_hook_active` is respected, so it reminds rather than loops.

### Configuration: `.claude/guardrails.json`

```json
{
  "knowledgeDir": "docs/knowledge",
  "protectedPaths": [{ "glob": "src/payments/**", "reason": "…", "contractTests": ["tests/payments/"] }],
  "sourceGlobs": ["src/**"],
  "testGlobs": ["tests/**", "**/*.test.*"],
  "testGate": { "enabled": true },
  "secretScan": { "enabled": true, "allowPatterns": [] },
  "codeScan": { "enabled": true, "ignoreRules": [] },
  "sessionContext": { "enabled": true, "maxChars": 6000 }
}
```

## 5. Capturing lessons: `/lesson`

The cheapest moment to record a lesson is right after it was learned.
`/lesson` reviews the session, classifies each learning (LESSON, DO,
DON'T, invariant, convention), checks the index for an existing entry to
update instead of duplicating, assigns ids that are never reused, and
shows everything as a diff. It writes only what the user approves, and a
contradicted entry is superseded and archived, not removed. Inspired by
the "compound" step of EveryInc's compound-engineering plugin and by
Anthropic's `/revise-claude-md`, but writing into the categorized tree
instead of growing `CLAUDE.md`.

## 6. CI gate

The project template ships `.claude/scripts/check-knowledge.js` and a
GitHub Actions workflow:

| Job | Fails when |
|---|---|
| knowledge | an entry lacks required frontmatter, has an invalid status or date, a single-file category heading has no id, an id is reused in the active set, or — on a PR — a knowledge, `CLAUDE.md`, or `.claude/rules/` file was **deleted** (moving it to `archive/` passes) |
| secrets | gitleaks finds a secret in the PR's commits |
| dependencies | osv-scanner finds a known vulnerability in a lockfile/manifest |
| sast | semgrep (`p/default` rules) finds an issue the PR introduced |
| tests | the project's own tests fail (the template fails until its TODOs are filled) |

This is the non-local half of "archive, never delete": the hook stops
Claude on one machine, CI stops anyone.

## 7. What hooks do not replace

Hooks catch mistakes early on one machine. They do not replace
independent review of a change by someone (or some session) other than
its author, nor the project's CI: tests, lint, secret scanning, and
dependency audit on every pull request.
