---
description: Capture what this session taught as team knowledge (lesson, DO/DON'T, invariant, convention) — proposed as a diff, applied only after approval, never deleting anything
argument-hint: "[optional: what to record, e.g. 'the refund double-charge bug']"
allowed-tools: Read, Glob, Grep, Edit, Write, Bash(git diff:*), Bash(git log:*), Bash(git status:*)
---

Turn what was learned in this session into shared team knowledge, following
the `team-memory` skill. Focus: $ARGUMENTS

If `docs/knowledge/` does not exist, stop and suggest the
`team-project-setup` skill instead of inventing a structure.

## 1. Find the learnings

Review this session (and `git diff` / recent commits if useful). Look for
things a future session — anyone's — would otherwise get wrong:
- a bug or regression, its root cause, and how it was caught,
- a correction the user had to make ("no, don't do X here"),
- a rule about this codebase that is not obvious from the code,
- behavior that turned out to be load-bearing and must not change,
- a command, environment quirk, or workflow that was missing.

Skip one-off details, anything derivable from the code or `git log`, and
anything only relevant to this conversation. If there is nothing worth
recording, say so and stop.

## 2. Classify each one

| It says... | Goes to | Id prefix |
|---|---|---|
| X broke because Y | `lessons/LESSONS.md` | `LESSON-` |
| Never do X, because Y | `do-dont/DONT.md` | `DONT-` |
| Always do X, because Y | `do-dont/DO.md` | `DO-` |
| X must keep behaving like Y | `invariants/INVARIANTS.md` (+ a test) | `INV-` |
| We write X like this | `conventions/` | `CONV-` |

A lesson usually produces a second entry: the DONT/DO rule or invariant it
taught. Link them both ways.

## 3. Check for duplicates and conflicts

Read `docs/knowledge/INDEX.md` and the target files. If an active entry
already covers it, **update that entry** (and bump `last-verified`) instead
of adding a new one. If the new learning contradicts an entry, the old one
becomes `status: superseded` with `superseded-by: <new id>` and moves to
`archive/` — it is never deleted.

## 4. Propose — do not write yet

Pick the next free id per prefix (search the active files *and*
`archive/INDEX.md`; ids are never reused). For each change show:

~~~
### <id> — <title>  →  <file>
Why: <one line>
```diff
+ <the entry, in the team-memory format: rule first, then **Why:** and **How to apply:**>
```
~~~

Also show the matching `INDEX.md` line, and — only if the rule must apply
in every session — the one-line pointer for `.claude/rules/`.
For an invariant or a regression lesson, name the test that proves it; if
none exists, say so and propose writing one (test-integrity skill).

## 5. Apply only what the user approves

Write the approved entries, update `INDEX.md`, then list what changed
where. Do not commit; the knowledge change goes through a PR like code.
