---
name: test-integrity
description: Use whenever writing, changing, or reviewing tests, fixing a bug, touching legacy or untested code, or reporting that tests pass — to prevent the shortcuts that make a broken change look green (skipped or deleted tests, loosened assertions, edited expectations, unrun results) and to enforce regression-first discipline.
---

# Test Integrity

A passing suite only means something if nobody bent the tests to get
there. This skill lists the shortcuts that hide regressions and the
discipline that catches them.

## Never (each is a blocking finding in review)

The plugin's guard hook asks for human confirmation when it sees the
first two in a test file.

- Deleting a test, or adding `skip` / `xfail` / `.only` / `@Disabled` /
  `t.Skip()` to get a suite to pass.
- Loosening an assertion (exact value → "is not null", equality →
  "contains", expected error → any error) without a stated reason.
- Changing an expected value to match new output, without first showing
  that the old expectation was wrong.
- Mocking the unit under test itself, or asserting only that a mock was
  called.
- Catching and swallowing exceptions inside a test.
- Claiming "tests pass" for a run that did not happen in this session.

If a test genuinely encodes wrong behavior, say so, explain why, and get
agreement before changing it.

## Always

- **Bug fix → failing test first.** Write the test that reproduces the
  reported bug, run it, show it fails for the right reason, then fix and
  show it passes.
- **Before touching legacy/untested code**, add characterization tests
  that pin its current behavior, so an accidental behavior change shows up
  as a red test instead of a production incident.
- **Invariants have tests.** Every entry in
  `docs/knowledge/invariants/INVARIANTS.md` names the test that proves it;
  those contract tests run on every change touching that area.
- **Baseline before, full run after.** Run the affected tests before the
  first edit and after the last one. Report both with the exact command
  and pass/fail counts.
- **Cover normal, failure and boundary cases** for new behavior: invalid
  input, dependency failure, unauthorized access, empty / zero / max /
  just-over-max, concurrency where relevant.
- Coverage of touched files must not decrease; a drop needs an explicit
  justification.

## What a good test looks like

- Tests behavior, not implementation — it survives a behavior-preserving
  refactor and fails when behavior actually breaks.
- Its name states the scenario and the expected outcome.
- It does not depend on execution order or shared mutable state.
- Optimize for defect detection, not test count: a few sharp boundary and
  failure tests beat ten copies of the happy path.

## Who checks

The `implementer` follows these rules; the `regression-verifier` agent
checks them independently on every change (`/verify`), and
`code-reviewer` treats violations as P1.

## Reporting

```
## Baseline (command, result)
## Tests added / changed (and why each change to an existing test is legitimate)
## Final run (command, result)
## Not covered
## Confidence: LOW / MEDIUM / HIGH
```
