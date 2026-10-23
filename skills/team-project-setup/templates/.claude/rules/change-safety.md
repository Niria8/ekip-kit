# Change safety (always loaded)

- Smallest diff that satisfies the task. No drive-by refactors, renames,
  or "while I'm here" fixes — report them instead.
- Before editing a file, check `docs/knowledge/invariants/INVARIANTS.md`
  and any knowledge entry whose `applies-to` matches it.
- Run the relevant tests BEFORE changing code (baseline) and AFTER each
  step. A red test in the area you change: stop and report. An unrelated
  red test: leave it untouched, finish the task, and name it in your
  report. Never mix a pre-existing failure into your change.
- Fix bugs at the root cause, not the symptom; if the cause is in shared
  or protected code, fix it there with tests for its callers, or ask.
- Never change a public contract (API shape, DB schema, event format,
  config key) unless the task explicitly asks for it.
- For work spanning more than one session or more than ~5 files, keep
  `docs/knowledge/work-log/<task-id>.md` current (task-ledger skill).
- Knowledge is archived, never deleted (team-memory skill).
