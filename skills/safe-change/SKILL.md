---
name: safe-change
description: Use before modifying existing, working code — any bug fix, feature addition, or refactor that touches files other code depends on. Defines the impact-analysis, baseline-test, small-step, and rollback discipline that keeps stable parts of the project from being broken by a change elsewhere.
---

# Safe Change

Most regressions an AI agent introduces are not clever bugs. They are a
caller nobody checked, a test that was "fixed" by loosening it, a refactor
nobody asked for, or a finished piece of work overwritten because it fell
out of context. This protocol targets exactly those.

## 1. Before the first edit

- **Restate the task** in one or two sentences and list what is *out of
  scope*. Anything not needed for the task is out of scope.
- **Load the knowledge that applies**: `docs/knowledge/INDEX.md`, entries
  whose `applies-to` matches the target files, `INVARIANTS.md`, and the
  task's ledger if one exists (task-ledger skill).
- **Impact analysis.** For every function, type, endpoint, config key, or
  schema you will change, find its users (grep/IDE references across the
  repo, including tests, scripts, and other services' clients). Write the
  list down. If it is longer than expected, stop and tell the user before
  continuing.
- **Baseline.** Run the tests covering the area (and the contract tests of
  any protected path you touch) with the project's documented test
  command (`CLAUDE.md` Commands, the test script, CI) — not a bare test
  runner, which can miss environment the project sets up. If the run
  fails before any test executes (import/collection error, missing
  service, missing env var or build output), that is an environment
  problem, not a red baseline: read the test script and CI config for
  the setup they do, retry that way, and report what was missing. Stop
  and ask only if no documented way makes the tests run. If a test is already
  failing: when it covers code you are about to change, stop and report
  before editing. When it is unrelated to your change, do not fix, skip,
  or edit it — record it, carry on with the task, and name it in your
  final report as a pre-existing failure. Never mix a pre-existing
  failure into your change.

## 2. While changing

- Smallest diff that satisfies the task. No renames, reformatting, or
  "cleanup" in files you are only passing through.
- Keep public contracts stable (function signatures used elsewhere, API
  shapes, DB schema, event payloads, config keys). If a contract must
  change, that is a design decision: say so and get it confirmed
  (`planner` agent, `/plan-change`).
- One logical step at a time; run the affected tests after each step.
  A red test after a step means fix or revert *that step* — not edit the
  test.
- Never delete, skip, or weaken a test or assertion to get green
  (test-integrity skill). If you believe a test is wrong, explain why and ask.
- For a bug fix: first a test that fails for the reported reason, then the
  fix, then show that the test passes.
- Fix a bug at its root cause, not where the symptom shows up
  (`systematic-debugging` skill). "Smallest diff" never means patching the
  symptom: if the cause is in shared code, fix it there, cover its other
  callers from your impact list with tests, and say so. If the source is
  a protected path or out of scope, stop and ask — do not leave the cause
  in place behind a local workaround.
- If the plugin hook asks before editing a protected path, read the
  reason and the invariant it cites, and justify the edit to the user.

## 3. Before saying "done"

- Re-run the baseline tests plus the new ones. Quote the command and the
  pass/fail counts. Never claim a test result you did not run in this
  session.
- `git diff` review: every hunk must trace back to the task. Revert hunks
  that do not.
- Re-check the impact list: were all users updated or confirmed
  unaffected?
- Update knowledge in the same change: an invariant whose behavior moved,
  a new DO/DONT, a lesson if this was a regression (team-memory skill),
  and the task ledger.
- Hand off for independent verification with `/verify`
  (`regression-verifier` → `code-reviewer` → `security-gatekeeper` when
  required; see `docs/WORKFLOW.md`). The author is never the only judge of
  their own change.

## When things go wrong

If you discover you broke something that previously worked: stop adding
features, report it plainly (what broke, since which step), and revert to
the last green step before trying again. Record a LESSON entry if the cause
is likely to recur.
