# <Project name>

<!-- Keep this file an INDEX (< 150 lines). Details go in docs/knowledge/
     or .claude/rules/. Personal notes go in CLAUDE.local.md (git-ignored). -->

## What this is
<One paragraph: what the system does and for whom.>

## Commands
- Install: `<command>`
- Run tests (full): `<command>`
- Run tests (one area): `<command>`
- Lint / type-check: `<command>`

## Team workflow
This project uses the `claude-team-kit` plugin. Before touching an area,
read the knowledge entries in `docs/knowledge/INDEX.md` whose `applies-to`
matches the files you will change.

- Non-trivial change → `/plan-change` first (planner), then one task at a
  time (implementer), then `/verify` (regression-verifier → code-reviewer
  → security-gatekeeper when required) — risk table in
  `.claude/rules/workflow.md`.
- The author of a change never approves it.
- Learned something → `/lesson`. Tidy knowledge → `/memory-cleanup`.

## Always-loaded rules
@.claude/rules/workflow.md
@.claude/rules/change-safety.md
@.claude/rules/testing.md
@.claude/rules/security.md

## Knowledge
- Index: docs/knowledge/INDEX.md
- Must-not-break behavior: docs/knowledge/invariants/INVARIANTS.md
- Do / Don't: docs/knowledge/do-dont/DO.md, docs/knowledge/do-dont/DONT.md
- In-flight work: docs/knowledge/work-log/
