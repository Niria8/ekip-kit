# Team Playbook

How a software team uses Claude Code with this plugin so that knowledge is
shared, nothing important is lost, and Claude does not break what already
works. The *why* and the hook details are in [`DESIGN.md`](DESIGN.md);
this is the *how*.

## 1. One-time setup per project

1. Every teammate installs the plugin (same version — pin it in the team's
   onboarding doc) and has Node.js ≥ 18.
2. One person runs, in the project:
   > Use the team-project-setup skill to set up this project.
3. The team reviews the generated PR like code: real commands in
   `CLAUDE.md`, the real `sourceGlobs`/`testGlobs`, and — most important —
   the list of **protected paths and invariants** (which flows must never
   break, and which test proves each one).
4. Merge. From now on every teammate's session loads the same rules, and
   anyone opening the project in Claude Code is offered the kit (the
   project's `.claude/settings.json` enables it).

## 2. Where knowledge goes

| You learned... | Put it in | Loaded |
|---|---|---|
| A rule that matters in every session | `.claude/rules/*.md` (one line, pointing at an id) | always |
| A rule for one area only | `.claude/rules/<area>.md` with `paths:` | when those files are touched |
| How the system works / why | `docs/knowledge/project/` | via index, on demand |
| Always / never do X | `docs/knowledge/do-dont/` | headings injected at session start |
| Must not break | `docs/knowledge/invariants/` + a test + `protectedPaths` | headings injected; edits need confirmation |
| A decision with alternatives | `docs/knowledge/decisions/` (ADR) | on demand |
| A bug that taught a rule | `docs/knowledge/lessons/` | on demand |
| State of in-flight work | `docs/knowledge/work-log/<task>.md` | injected at session start |
| A personal preference | `CLAUDE.local.md` (git-ignored) | only for you |

Knowledge changes go through PRs. Each entry has an `owner`, `status`,
`applies-to`, and `last-verified`.

## 3. Daily workflow

- **Start of a task** — for anything bigger than a small fix:
  `/plan-change PAY-123 <what>`. The planner writes criteria, impact,
  tasks, and opens the ledger; review and approve it before any edit.
  The risk table in `.claude/rules/workflow.md` (and
  [`WORKFLOW.md`](WORKFLOW.md)) says which roles the change needs.
- **During** — Claude follows `safe-change`: baseline tests first, small
  steps, tests after each step. If a guard hook asks for confirmation, read
  the reason; don't approve it reflexively.
- **Long sessions** — after compaction the session-start hook re-injects
  the ledger, DON'Ts, and invariants. If Claude seems to have lost the
  thread, say: "Re-read the ledger and re-run the baseline."
- **Hand-off** — the ledger *is* the hand-off. A teammate continues with:
  "Continue PAY-123 from its ledger."
- **Learned something?** — run `/lesson` before closing the session. It
  proposes the entry as a diff; approve, and it goes into the PR.
- **After each task** — `/verify`: regression-verifier → code-reviewer
  (→ security-gatekeeper). Fix what it reports, then `/verify` again.
- **End of a task** — CI green, human approval, merge; the ledger is
  archived (`knowledge-curator`). Close and archive the ledger; promote lasting
  decisions to ADRs or DO/DONT entries.

## 4. "Clean up the memory"

Run `/memory-cleanup` (or ask plainly) — the knowledge-curator will list duplicate / stale / too-detailed
entries, wait for your confirmation, then **move** them to
`docs/knowledge/archive/` with an index line and a pointer. Nothing is
deleted; the guard hook blocks deletion of memory files outright. To bring
something back: "Restore DONT-007 from the archive."

## 5. When a hook is wrong

If a guard rule blocks something legitimate: for a one-off, start Claude
Code with `TAKIM_DISABLE=guard` (or `=1` for all hooks). For a
rule that is noisy in this project, add it to `codeScan.ignoreRules` /
`secretScan.allowPatterns` in `.claude/guardrails.json` through a PR.
Either way, report it — false positives erode trust in every rule.

## 6. When Claude broke something

1. Stop new work. Ask Claude to identify the step that broke it (the
   ledger's "Done" list and `git diff` make this quick) and revert to the
   last green step.
2. Add a failing test that reproduces the break, then fix.
3. Record a `LESSON-` entry and the rule it produced (DONT or invariant +
   protected path), so the next session — anyone's — knows.

## 7. Security and tests — what is enforced vs. expected

| Enforced by hooks | Expected (checked by reviewers) |
|---|---|
| no reading `.env` / keys; no secrets written to files | input validation, authz on every endpoint, parameterized queries |
| no deleting memory / knowledge | knowledge updated in the same PR |
| confirmation for test skips / removed assertions | failing test first for bug fixes; characterization tests before legacy changes |
| confirmation for protected-path edits; contract-test reminder | invariant tests run and quoted |
| confirmation for force-push, `reset --hard`, destructive SQL, infra changes | dependency audit and secret scan output in security review |

Also keep the project's own CI as the final gate: tests, lint, secret
scanning (e.g. gitleaks), and dependency audit on every PR. Hooks catch
mistakes early on one developer's machine; CI catches them for everyone.

## 8. Tips that make Claude more reliable on a team

- Give one task per session; start a fresh session (with the ledger)
  rather than piling unrelated work into a long one.
- Ask for a plan first on anything non-trivial ("plan only, don't edit")
  and review it before implementation.
- Keep `CLAUDE.md` short. Long instruction files get skimmed; precise,
  short rules with ids get followed.
- Prefer path-scoped rules for area-specific constraints — they load
  exactly when relevant and cost nothing otherwise.
- Turn every repeated review comment into a DONT entry, a rule, or —
  if it can be checked mechanically — a hook or CI check.
