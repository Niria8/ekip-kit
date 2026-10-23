# Workflow

How work flows through the kit's roles, and how much of the chain a change
needs. The roles are subagents shipped with the plugin (invoked as
`takim:<name>`), so every step runs with a fresh context instead
of inheriting the author's assumptions.

## Core rule

**The author of a change is never the only judge of it.** Every
non-trivial change is implemented by one role and verified by another that
did not write it — a separate subagent, session, or teammate.

## Roles

| Role | Accountable for | Never does |
|---|---|---|
| `planner` | acceptance criteria, impact analysis, task breakdown, required roles, opening the ledger | write production code |
| `implementer` | one task at a time, under `safe-change`; updates ledger and affected knowledge | approve its own work; weaken tests |
| `regression-verifier` | criteria actually met; baseline, contract, and "Done" tests still green; test integrity; missing edge cases | change production code |
| `code-reviewer` | whole-diff review: regressions, contracts, scope creep, invariants, stale knowledge | fix findings itself |
| `security-gatekeeper` | security review with evidence; project security rules | general code quality; fixing |
| `knowledge-curator` | knowledge tree health; archive-never-delete; ledgers closed | touch application code |
| human | approves plans that change contracts/schema/dependencies/security, and every merge | — |

## Flow

```
request
  └─ /plan-change ─► planner ──► human approves plan (if contract / migration / dependency / security)
                                   │
         ┌─────────────────────────┘
         ▼
  implementer (task 1) ─► /verify ─► regression-verifier ─► code-reviewer ─► [security-gatekeeper]
         ▲                                    │ fail                         │
         └──────────── back with findings ◄───┴──────────────────────────────┘
         … next task …
  all tasks done ─► /lesson ─► human approval ─► merge ─► ledger archived (knowledge-curator)
```

## Risk table — how much of the chain

| Change | Planner | After implementer |
|---|---|---|
| Typo, copy, comment | — | — (hooks still run) |
| Small, isolated; no contract, auth, or data impact | — | `regression-verifier` |
| Ordinary feature or bug fix | optional | `regression-verifier` → `code-reviewer` |
| Touches a protected path or invariant, a public contract (API, schema, event, config), or more than one layer | **required** | `regression-verifier` → `code-reviewer` |
| Auth/authz, secrets, external input, file or network access, dependency, migration, LLM feature | **required** | `regression-verifier` → `code-reviewer` → `security-gatekeeper` |

Combine rows when a change spans them. When in doubt, escalate one row.

## Rules that keep the chain honest

- **One layer at a time.** Never implement more than one architectural
  layer (e.g. schema + API + UI) without stopping, verifying, and
  telling the human what changed.
- **Already-diagnosed fixes are light.** When a reviewer reports an exact
  cause and an exact fix, apply it with `implementer` and re-run
  `regression-verifier`; do not restart from `planner`.
- **Interrupted work is unverified work.** If a role was cut off
  mid-task, relaunch it telling it a prior attempt was interrupted; it
  inspects `git status` / `git diff` with fresh eyes instead of assuming
  the partial state is right — or discarding it.
- **Deferred findings are tracked.** A P2/P3 not fixed now becomes a
  ticket or backlog entry a human will see — not a paragraph in a report.
- **Contract gaps found mid-task go back to the planner** for a short
  confirmation, instead of a silent workaround or an unreviewed addition.
- **Lessons are recorded when learned** — `/lesson` before closing the
  task.

## Definition of done

- [ ] Acceptance criteria verified by `regression-verifier` (not asserted by the implementer)
- [ ] Tests for normal, failure, and boundary cases; bug fixes have a failing-first test
- [ ] Baseline, contract, and "Done" tests run in this change, commands and results quoted
- [ ] No test skipped, deleted, or loosened without agreement
- [ ] `code-reviewer`: no open P0/P1
- [ ] `security-gatekeeper` passed, if the risk table requires it
- [ ] P2/P3 not fixed now are tracked items
- [ ] Knowledge updated in the same change (nothing deleted); ledger closed and archived
- [ ] CI green (knowledge, secrets, dependencies, tests)
- [ ] A human approved the change
