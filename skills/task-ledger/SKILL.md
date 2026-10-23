---
name: task-ledger
description: Use for any task that spans more than one session, more than ~5 files, more than one architectural layer, or more than one teammate — to keep a written ledger (docs/knowledge/work-log/<task-id>.md) of goal, decisions, done steps, next steps, touched files and open risks, so context compaction, a new session, or a hand-off to a teammate does not lose what was already decided or break what was already finished.
---

# Task Ledger

As a task grows, earlier decisions fall out of the context window and get
silently contradicted — that is how "it worked yesterday" code breaks.
The ledger is the external memory that survives compaction, new sessions,
and hand-offs. The plugin's SessionStart hook points every new or
compacted session at the active ledgers.

## When to start one

Start `docs/knowledge/work-log/<task-id>.md` before the first edit when the
task meets any of: multiple sessions, > ~5 files, more than one layer
(DB + API + UI), more than one person, or the `planner` produced a plan
(`/plan-change` opens the ledger for you).

## Format

```markdown
---
id: WL-<task-id>
title: <task title>
category: work-log
owner: <person/team>
status: active
applies-to: ["<paths this task touches>"]
last-verified: <YYYY-MM-DD>
links: [<ticket>, <ADR>, <plan doc>]
---

## Goal
<One paragraph + acceptance criteria, copied from the requirement.>

## Decisions (do not re-litigate)
- <YYYY-MM-DD> <decision> — because <reason>

## Done (verified)
- [x] <step> — files: <paths> — verified by: <test command / test name>

## Next
- [ ] <step>

## Do not touch
- <file/area> — <why: finished and verified / owned by another task / invariant INV-xxx>

## Open risks / questions
- <item> — owner: <who>

## Baseline
- Test command: `<command>` — result before this task: <pass/fail counts>
```

## Rules

- Update the ledger **at each milestone**, not at the end: after a step is
  verified, after a decision, before stopping for the day, and before a
  long refactor.
- "Done" means verified by a test that was run — write which one.
- On resuming (new session, after compaction, or picking up a teammate's
  task): read the ledger first, re-run the baseline test command, and
  compare against "Done". If something listed as done now fails, stop and
  report it before continuing — do not quietly "fix forward".
- Items under "Do not touch" are off-limits for this task without asking.
- When the task is merged, set `status: archived` (or let the
  `knowledge-curator` do it) and move the file to
  `docs/knowledge/archive/YYYY-MM/work-log/` (team-memory skill). Promote
  any decision with lasting value into an ADR or a DO/DONT entry first.
