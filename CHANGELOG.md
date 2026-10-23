# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/). Add every change under
**Unreleased**; on release, rename that section to the new version and bump
the version in `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`
and `package.json` together (a test checks they match).

## [Unreleased]

## [0.4.0] - 2026-10-23

### Changed
- Renamed from ekip-kit to **takim** (display name "Takım"): plugin
  `takim`, marketplace `takim-marketplace`, agents and skills
  `takim:<name>`, kill switch `TAKIM_DISABLE`. Projects set up with an
  earlier version must re-register the marketplace, re-install the plugin
  under the new name, and replace `ekip-kit` in their `CLAUDE.md`,
  `.claude/settings.json` and `.claude/rules/workflow.md`.

## [0.3.0] - 2026-10-23

Fixes found by running the kit on real code (the FastAPI demo project;
see `docs/KARSILASTIRMA.md`, "Tur 4").

### Fixed
- Guard hook: protected paths no longer ask for files created in the
  current change (new or untracked in git). A new migration under a
  protected `alembic/versions/**` was blocked from being finished.
- `/plan-change`, `/memory-cleanup`, `/verify`: run their agents in the
  foreground and wait for the result. Agents started in the background
  were lost when the session ended before they reported.
- `safe-change`, `change-safety` rule: tests that cannot start
  (import/collection or environment error) are a setup problem, not a red
  baseline — use the documented test command and the setup the test
  script / CI does, then report. (A bare `pytest` without the project's
  env var made every baseline look red.)
- `team-project-setup`: test commands in `CLAUDE.md` must carry the
  environment the test script / CI sets, and are run once to confirm.

## [0.2.0] - 2026-10-23

First ekip-kit release: claude-team-kit plus the parts of other kits that
won a head-to-head comparison (see `docs/KARSILASTIRMA.md`).

### Added
- Skills from obra/superpowers (MIT): `systematic-debugging` (with its
  root-cause-tracing, defense-in-depth, condition-based-waiting notes and
  `find-polluter.sh`), `test-driven-development` (with
  `writing-good-tests.md`), `receiving-code-review`, `using-git-worktrees`,
  `finishing-a-development-branch`, `dispatching-parallel-agents`.
- CI template: `sast` job running semgrep (`p/default`); on a PR only
  newly introduced findings fail. `security-gate` lists semgrep as evidence.
- `NOTICE.md` (sources and local changes), `docs/KARSILASTIRMA.md`
  (comparison method and results).

### Changed
- Renamed from claude-team-kit to ekip-kit; kill switch is now
  `EKIP_KIT_DISABLE`.
- SessionStart hook now always injects a short "working rules" block that
  maps tasks to skills (`safe-change`, `systematic-debugging`,
  `test-driven-development`, `test-integrity`, `security-gate`,
  `team-memory`); project knowledge is added on top when the project is set
  up. (Before: silent in projects without `docs/knowledge/`; in the
  comparison the plugin's coding skills were then never invoked.) Turn it
  off with `sessionContext.enabled: false`.
- `safe-change`, `implementer`, `change-safety` rule: only a red test in the
  area being changed stops the work; an unrelated pre-existing failure is
  left untouched and reported. (Before: any red baseline stopped the task —
  3/3 runs left the task undone in the comparison.)
- `safe-change`, `implementer`, `change-safety` rule: bugs are fixed at the
  root cause; "smallest diff" no longer allows patching the symptom next to
  a shared helper. (Before: 2/3 runs left the shared bug in place.)

### Inherited from claude-team-kit after 0.1.0

#### Added
- `LICENSE` (MIT).
- Kill switch: `EKIP_KIT_DISABLE=1` turns all hooks off; a comma list
  (`guard`, `session-context`, `stop-gate`) turns off only those.
- Project template `.claude/settings.json` registers the kit's marketplace and
  enables the plugin, so teammates who open the project are offered the kit.
- Root `CLAUDE.md` for developing the kit itself.
- `.gitattributes` (LF line endings for all text files).
- Tests: version consistency across the three manifests and this changelog;
  memory-guard false-positive cases; kill switch.

#### Fixed
- Memory-deletion guard matched paths as substrings of the whole command,
  so unrelated commands such as `rm -rf src/memory/cache` or
  `rm docs/knowledge-export.zip` were denied. It now checks only the path
  arguments of delete commands and `>` redirect targets; `>>` append and
  `2>&1` are allowed.
- CI: `npm test` used a glob that Node 20 does not support; now plain
  `node --test`. CI runs on Node 24 with `actions/checkout@v5` and
  `actions/setup-node@v5`, without fail-fast.

#### Changed
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
