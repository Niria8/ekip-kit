---
description: Plan a non-trivial change before any code is written — acceptance criteria, impact analysis, small verifiable tasks, required review roles, and an opened task ledger
argument-hint: "<what to build or fix, ideally with a ticket id>"
allowed-tools: Read, Grep, Glob, Bash(git:*), Agent
---

Run the `ekip-kit:planner` agent on this request: $ARGUMENTS

Pass it everything relevant from this conversation (ticket text, user
constraints, earlier decisions). Do not edit any code in this command.

When it returns:
- Show its plan, highlighting **"Needs human approval before
  implementation"** and **open questions** first.
- Ask the user to approve the plan (or answer the questions) before any
  task is implemented.
- After approval, implementation goes one task at a time through
  `ekip-kit:implementer`, followed by `/verify`.
