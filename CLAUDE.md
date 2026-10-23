# ekip-kit

A standalone Claude Code plugin that makes Claude dependable for software
teams: shared project memory in the repo (archived, never deleted), a
planner → implementer → verifier → reviewer agent workflow, and
hook-enforced security and test integrity. User docs: `README.md`;
rationale: `docs/DESIGN.md`; roles and risk table: `docs/WORKFLOW.md`.

## Commands
- Test everything: `npm test` (Node's built-in runner, auto-discovers `*.test.js`)
- Try the plugin locally: `claude --plugin-dir .` from a test project's parent, pointing at this folder
- Check the template knowledge tree: `node skills/team-project-setup/templates/.claude/scripts/check-knowledge.js --dir skills/team-project-setup/templates/docs/knowledge`

There is no build step and no dependency to install — keep it that way.

## Layout — two kinds of files
- **The plugin itself** (loaded by Claude Code): `.claude-plugin/`, `agents/`,
  `commands/`, `skills/*/SKILL.md`, `hooks/`.
- **Templates** (copied INTO a user's project by `team-project-setup`, never
  used by the kit itself): everything under
  `skills/team-project-setup/templates/`. Paths there mirror the target
  project (`.claude/`, `docs/knowledge/`, `.github/workflows/`, `CLAUDE.md`).
  When you change a rule, decide which side it belongs to.

## Rules for changing the kit
- **Standalone.** Never reference another plugin's agents or skills as a
  dependency. Optional companions may be mentioned only as optional.
- **Hooks**: Node built-ins only (`fs`, `path`, `os`, `crypto`,
  `child_process`); must run on Node ≥ 18 on Windows, macOS, and Linux;
  must **fail open** (`lib.run` catches everything and exits 0) — a hook
  bug may never block a user's work. Use `deny` only for high-confidence
  cases, `ask` for heuristics.
- **Every new hook behavior gets a test** in `hooks/test/` — both the case
  that must trigger and a near-miss that must not (false positives are a
  real cost for teams).
- Adding/renaming an agent, skill, or command: keep `name` equal to the
  file/directory name, update README tables, and make sure
  `hooks/test/plugin-structure.test.js` passes (it checks every reference
  in the docs resolves). The expected agent list in that test is
  intentional — update it deliberately.
- Read-only roles (`code-reviewer`, `security-gatekeeper`) must not get
  `Write`/`Edit` tools.
- Behavior described in `docs/DESIGN.md` hook tables must match `hooks/*.js`.
- Every change gets a line under **Unreleased** in `CHANGELOG.md`.
- Version lives in three places — `.claude-plugin/plugin.json`,
  `.claude-plugin/marketplace.json`, `package.json`; bump them together
  and add the matching CHANGELOG section (a test enforces both).
- Every hook entry point goes through `lib.run('<hook-name>', ...)` so the
  `EKIP_KIT_DISABLE` kill switch keeps working.
- MIT licensed; do not copy code from projects with incompatible licenses,
  and credit MIT sources you copy from.
- Repository content is English. Paths in docs use forward slashes.
- The kit's own principle applies here: knowledge in docs is archived or
  superseded, not silently deleted.

## Status (keep current)
- v0.2.0 (ekip-kit, built on claude-team-kit 0.1.0); changes since are
  under Unreleased in `CHANGELOG.md`. `npm test` green locally on Windows
  (Node 24); this repo has no CI remote yet.
- Verified in headless `claude -p` sessions (`docs/KARSILASTIRMA.md`):
  plugin loading via `--plugin-dir`, skill invocation, SessionStart
  injection, protected-path `ask` (denied when nobody can answer).
- NOT yet verified: agent/command invocation (`ekip-kit:<agent>` naming)
  in an interactive session, hook `ask` under auto/bypass permission modes,
  `paths:`-scoped rules, marketplace auto-offer from the template
  `settings.json`.
- The project CI template (gitleaks v8.18.4, osv-scanner v1.9.1, semgrep 1.95.0) has not
  run in a real project yet.
