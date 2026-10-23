# Ekip Kit

A Claude Code plugin that makes Claude dependable when a whole software
team uses it on the same codebase. It addresses five recurring problems:

| Problem | What the kit does |
|---|---|
| Each person's Claude memory is private, unstructured, and lost on compaction | Shared, categorized knowledge **in the repo** (`docs/knowledge/`), indexed by a lean `CLAUDE.md` and short `.claude/rules/`, changed through PRs |
| "Clean up the memory" deletes details that are needed later | **Archive, never delete** — entries move to `archive/` with an index line and a pointer; a hook blocks deletion of memory files |
| Security and tests are only as strict as Claude remembers to be | Hooks block secret reads/writes and dangerous commands, and ask before test-weakening edits; `security-gate` and `test-integrity` skills require evidence |
| Claude breaks working parts, especially as scope grows | `safe-change` protocol, `task-ledger` work logs, protected paths, and re-injection of critical knowledge after every compaction |
| Team usage is ad hoc | One-command project scaffolding and a team playbook |

Self-contained: it ships its own roles (subagents), commands, skills,
hooks, project templates, and CI gate. Nothing else is required.

## Agents

Each role runs as a separate subagent, so verification never inherits the
author's assumptions. Flow and risk table: [`docs/WORKFLOW.md`](docs/WORKFLOW.md).

| Agent | Accountable for |
|---|---|
| `planner` | Acceptance criteria, impact analysis, small verifiable tasks, required roles, opening the task ledger — no code |
| `implementer` | One task at a time under `safe-change`; updates ledger and knowledge — never approves itself |
| `regression-verifier` | Independent check: criteria met, baseline/contract/"Done" tests still green, test integrity, missing edge cases |
| `code-reviewer` | Whole-diff review: regressions, contracts, scope creep, invariants, stale knowledge |
| `security-gatekeeper` | Security review with evidence and the project's own security rules |
| `knowledge-curator` | Keeps the knowledge tree small and correct — archives, never deletes |

## Skills

| Skill | Use it to |
|---|---|
| `team-project-setup` | Scaffold a project's shared `CLAUDE.md`, `.claude/rules/`, permission deny-lists, `guardrails.json`, and `docs/knowledge/` tree |
| `team-memory` | Record, find, and reorganize team knowledge by category; "clean up" by archiving |
| `safe-change` | Change working code without breaking it: impact analysis, baseline tests, small steps |
| `task-ledger` | Keep multi-session / multi-person work on track across compaction and hand-offs |
| `test-integrity` | No skipped/loosened tests, failing-test-first bug fixes, results actually run |
| `security-gate` | Security review with evidence: scans, dependency audit, negative auth tests; reads the project's `.claude/claude-security-guidance.md` |

## Commands

| Command | Use it to |
|---|---|
| `/plan-change <request>` | Run the planner before any code: criteria, impact, tasks, ledger; waits for approval |
| `/verify [base]` | Run the independent chain on the current change (verifier → reviewer → security when required) and say whether it is ready for human approval |
| `/memory-cleanup [area|personal]` | Audit, then archive stale / duplicate / too-detailed knowledge after approval |
| `/lesson [topic]` | Turn what a session taught into a LESSON / DO / DON'T / invariant entry — duplicates checked, shown as a diff, written only after approval, nothing deleted |

## Hooks (require Node.js ≥ 18)

| Hook | Always on | Opt-in via `.claude/guardrails.json` |
|---|---|---|
| `PreToolUse` guard | deny catastrophic commands and `curl \| sh`; deny deleting/emptying memory and knowledge files; deny reading `.env`/keys; deny writing high-confidence secrets; ask on hardcoded credentials, newly added insecure code (SQL/command injection, `eval`, XSS sinks, disabled TLS, weak hashes, insecure randomness, unsafe deserialization, wildcard CORS, SSRF, path traversal, secrets in logs), force-push, `reset --hard`, destructive SQL, infra changes, test skips, removed assertions | ask before editing protected paths |
| `SessionStart` | — | inject DON'Ts, invariants, protected paths, and active work logs at startup and after compaction |
| `Stop` | — | once per change set: ask for tests when source changed without tests, and for contract tests when a protected path changed |

Hooks fail open on their own internal errors, so a hook bug never blocks
work. If a hook gets in your way, start Claude Code with
`EKIP_KIT_DISABLE=1` (all hooks) or e.g.
`EKIP_KIT_DISABLE=guard,stop-gate` (only those) — and report the
false positive so the rule can be fixed.

## CI template

`team-project-setup` also installs `.github/workflows/claude-team-guardrails.yml`
in the project: knowledge-tree check (format, unique ids, **no deleted
knowledge** on a PR), gitleaks secret scan, osv-scanner dependency audit,
and the project's tests. Hooks catch mistakes on one machine; CI catches
them for everyone.

## Optional companions

Not required; each adds something the kit deliberately does not do.

- Anthropic's **security-guidance** plugin (LLM diff and commit security
  review; needs Python) — reads the same `.claude/claude-security-guidance.md`.
- **superpowers** (planning, TDD, verification-before-completion skills) —
  no overlap with the memory and guardrail parts of this kit.

Details and rationale: [`docs/DESIGN.md`](docs/DESIGN.md).

## Install

```
claude plugin marketplace add <this-repo-url-or-local-path>
claude plugin install ekip-kit
```

Try it locally without installing:

```
claude --plugin-dir ./ekip-kit
```

Then, in a project:

> Use the team-project-setup skill to set up this project.

The project's committed `.claude/settings.json` then registers this
marketplace and enables the plugin, so every teammate who opens the project
in Claude Code is offered the kit automatically (they need read access to
the kit's repository).

Team usage guide: [`docs/TEAM_PLAYBOOK.md`](docs/TEAM_PLAYBOOK.md).

## License

MIT — see [`LICENSE`](LICENSE). Changes: [`CHANGELOG.md`](CHANGELOG.md).

## Development

```
npm test
```

runs the hooks' test suite (Node's built-in test runner, no dependencies).
CI runs it on Linux, Windows, and macOS.
