# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/). Add every change under
**Unreleased**; on release, rename that section to the new version and bump
the version in `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`
and `package.json` together (a test checks they match).

## [Unreleased]

### Added
- `LICENSE` (MIT).
- Kill switch: `EKIP_KIT_DISABLE=1` turns all hooks off; a comma list
  (`guard`, `session-context`, `stop-gate`) turns off only those.
- Project template `.claude/settings.json` registers the kit's marketplace and
  enables the plugin, so teammates who open the project are offered the kit.
- Root `CLAUDE.md` for developing the kit itself.
- `.gitattributes` (LF line endings for all text files).
- Tests: version consistency across the three manifests and this changelog;
  memory-guard false-positive cases; kill switch.

### Fixed
- Memory-deletion guard matched paths as substrings of the whole command,
  so unrelated commands such as `rm -rf src/memory/cache` or
  `rm docs/knowledge-export.zip` were denied. It now checks only the path
  arguments of delete commands and `>` redirect targets; `>>` append and
  `2>&1` are allowed.
- CI: `npm test` used a glob that Node 20 does not support; now plain
  `node --test`. CI runs on Node 24 with `actions/checkout@v5` and
  `actions/setup-node@v5`, without fail-fast.

### Changed
- Shell overwrites of memory files (`Set-Content`, `Out-File`) now ask for
  confirmation, since they bypass the shrink check of the Write tool.

## [0.1.0] - 2026-10-16

### Added
- Agents: `planner`, `implementer`, `regression-verifier`, `code-reviewer`,
  `security-gatekeeper`, `knowledge-curator`.
- Commands: `/plan-change`, `/verify`, `/lesson`, `/memory-cleanup`.
- Skills: `team-memory`, `team-project-setup`, `safe-change`, `task-ledger`,
  `test-integrity`, `security-gate`.
- Hooks: PreToolUse guard (destructive commands, memory deletion, secret
  reads/writes, insecure code patterns, test weakening, protected paths),
  SessionStart context re-injection, Stop test gate.
- Project templates: `CLAUDE.md`, rules, permissions, `guardrails.json`,
  knowledge tree, security policy, knowledge checker, CI workflow.
- Docs: `README.md`, `docs/DESIGN.md`, `docs/WORKFLOW.md`,
  `docs/TEAM_PLAYBOOK.md`.
