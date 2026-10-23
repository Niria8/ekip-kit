# NOTICE — sources and local changes

takim is built from the open-source kits below. Each keeps its own
license; the full MIT text is in [`LICENSE`](LICENSE).

## claude-team-kit — base of this kit

- Source: https://github.com/Beshlee/claude-team-kit, version 0.1.0 plus its
  unreleased changes (imported 2026-10-23).
- License: MIT, Copyright (c) 2026 Kaan Ozturk.
- Taken: everything (agents, commands, skills, hooks, templates, CI
  template, tests, docs).
- Local changes:
  - Renamed to `takim` (`takim:<agent>` names, `TAKIM_DISABLE`).
  - `safe-change`, `agents/implementer.md`, template
    `.claude/rules/change-safety.md`: pre-existing red test rule and
    root-cause rule (see `CHANGELOG.md` 0.2.0 and `docs/KARSILASTIRMA.md`).
  - CI template: semgrep `sast` job; `security-gate` names semgrep.
  - `hooks/test/plugin-structure.test.js`: `/worktree` accepted as an
    external command (referenced by `using-git-worktrees`).

## superpowers

- Source: https://github.com/obra/superpowers (imported 2026-10-23).
- License: MIT, Copyright (c) 2025 Jesse Vincent.
- Taken: `skills/systematic-debugging` (SKILL.md, root-cause-tracing.md,
  defense-in-depth.md, condition-based-waiting.md,
  condition-based-waiting-example.ts, find-polluter.sh),
  `skills/test-driven-development` (SKILL.md, writing-good-tests.md),
  `skills/receiving-code-review`, `skills/using-git-worktrees`,
  `skills/finishing-a-development-branch`,
  `skills/dispatching-parallel-agents`.
- Local changes: a source line under each SKILL.md front matter;
  references to `superpowers:test-driven-development`,
  `superpowers:verification-before-completion` and
  `superpowers:writing-skills` replaced with this kit's equivalents.

## Considered, not bundled

| Kit / tool | Why not |
|---|---|
| andrej-karpathy-skills (MIT per its README) | Its four rules are already covered by `safe-change` and `change-safety`; in the comparison it did not beat the base on any measure. |
| i-have-adhd (MIT) | Changes answer style, not code quality; destructive-action confirmation is already enforced by the guard hook. |
| semgrep/skills | Semgrep Rules License v1.0, not MIT — install separately (`npx skills add semgrep/skills`). The CI template runs semgrep instead. |
| superpowers `verification-before-completion` | Tied with the base (`safe-change` "Before saying done" + Stop hook) in the comparison. |
| superpowers `brainstorming`, `writing-plans`, `executing-plans`, `subagent-driven-development` | Overlap with `planner` / `implementer` / `/verify`; not measured, so the base was kept. |
| MIP team skills | Source files not available. |
