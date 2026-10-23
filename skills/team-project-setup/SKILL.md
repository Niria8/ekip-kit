---
name: team-project-setup
description: Use when a team starts using Claude Code on a project, or when a project has no shared CLAUDE.md / .claude/rules / docs/knowledge structure yet — to scaffold the team memory tree, always-loaded rules, permission deny-lists, and the guardrails config the plugin hooks read. Also use to audit an existing project's setup against this structure.
---

# Team Project Setup

Scaffolds a project so every teammate's Claude session starts from the same
knowledge, rules, and guardrails. The templates are in this skill's
`templates/` directory.

## Procedure

1. **Look before writing.** List what already exists: `CLAUDE.md`,
   `CLAUDE.local.md`, `.claude/settings.json`, `.claude/rules/`,
   `docs/knowledge/`, `docs/adr/`, `.gitignore`. Never overwrite an
   existing file — merge into it, and show the user what you merged.
2. **Copy missing templates** into the project root, preserving paths:
   - `CLAUDE.md` — fill in name, one-paragraph description, and the real
     install/test/lint commands (find them in package.json, pyproject,
     Makefile, CI config — do not guess; leave `<command>` if not found).
   - `.claude/rules/workflow.md`, `change-safety.md`, `testing.md`,
     `security.md`.
   - `.claude/rules/area-example.md` — only as a starting point; rename
     per sensitive area and set its `paths`, or drop it.
   - `.claude/settings.json` — merge the `permissions.deny` / `ask` lists
     and the `extraKnownMarketplaces` / `enabledPlugins` entries into any
     existing file. The latter make Claude Code offer the kit to every
     teammate who opens the project; if the team uses a fork or a private
     mirror of the kit, change `repo` accordingly. Teammates need read
     access to that repository.
   - `.claude/guardrails.json` — set `sourceGlobs` / `testGlobs` to the
     project's real layout, and `protectedPaths` to the modules the team
     names as stable (ask; do not invent them).
   - `docs/knowledge/**`.
   - `.claude/claude-security-guidance.md` — project security rules; ask
     the team for the codebase-specific ones (data access, auth helpers,
     SSRF wrapper, what must never be logged) and remove the examples.
     Anthropic's `security-guidance` plugin reads the same file if the
     team installs it (needs Python).
   - `.claude/scripts/check-knowledge.js` and
     `.github/workflows/claude-team-guardrails.yml` — the CI gate
     (knowledge format + no deleted knowledge, gitleaks, osv-scanner, semgrep,
     tests). Replace the two `TODO` steps in its `tests` job with the real
     language setup, install, and test commands. If the project uses
     another CI system, translate the jobs rather than skipping them.
   - Append `gitignore.append` to `.gitignore` if those lines are missing.
3. **Migrate existing knowledge** instead of duplicating it. If the old
   `CLAUDE.md` is long, move its sections into the matching
   `docs/knowledge/` category (team-memory skill) and leave the index. If
   there are existing ADRs elsewhere, link them from `decisions/README.md`
   rather than moving them.
4. **Seed invariants with the team.** Ask which flows must never break.
   For each, find (or flag the absence of) the test that proves it, and
   write an `INV-` entry. An invariant without a test is reported as a gap.
5. **Verify**: run `node .claude/scripts/check-knowledge.js` — it must
   report 0 errors (placeholder warnings are expected until the team fills
   them in).
6. **Report** the files created/merged and the open gaps (missing
   commands, invariants without tests, protected paths not yet chosen,
   CI TODOs left).

## Personal vs. shared

| Shared (committed) | Personal (git-ignored) |
|---|---|
| `CLAUDE.md`, `.claude/rules/`, `.claude/settings.json`, `.claude/guardrails.json`, `docs/knowledge/` | `CLAUDE.local.md`, `.claude/settings.local.json`, `~/.claude/projects/*/memory/` |

Anything a teammate learns that the whole team needs goes into the shared
side through a PR — not into personal auto-memory, where nobody else will
ever see it.
