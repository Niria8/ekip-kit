---
description: Run the independent verification chain on the current change — regression-verifier, then code-reviewer, then security-gatekeeper when the change is security-relevant — and summarize whether it is ready for human approval
argument-hint: "[optional: base branch or ref, default main/master]"
allowed-tools: Bash(git diff:*), Bash(git status:*), Bash(git log:*), Bash(git merge-base:*), Bash(git rev-parse:*), Read, Grep, Glob, Agent
---

Verify the current change independently, following `docs/WORKFLOW.md`
(or the summary in the `takim:planner` agent). Base: $ARGUMENTS
(if empty, use `main`, else `master`, else the working tree only).

1. **Collect the change.** `git status`, `git diff <base>...HEAD`, and
   uncommitted changes. Find the acceptance criteria: the active ledger in
   `docs/knowledge/work-log/` whose `applies-to` matches, the plan, or the
   user's request in this conversation. Say which source you used.
2. **Classify risk** with the WORKFLOW risk table. It is security-relevant
   if it touches auth/authz, secrets, external input, file or network
   access, dependency manifests or lockfiles, migrations, or LLM features,
   or if any guard-hook security ask was confirmed in this session.
3. **Run the roles in order, each as a separate subagent** (they must not
   share the implementer's context). Run each in the foreground and wait
   for its report — never as a background task: each role needs the
   previous one's verdict.
   - `takim:regression-verifier` — give it the criteria, the
     base ref, and the changed files. If its verdict is "back to
     implementer", stop here and report.
   - `takim:code-reviewer` — give it the same, plus the
     verifier's report.
   - `takim:security-gatekeeper` — only if security-relevant.
   Do not fix anything yourself during this command.
4. **Summarize**:

```
## Change: <one line> · risk: <row from the table>
## Verifier: <verdict, confidence, failures>
## Code review: P0 n · P1 n · P2 n · P3 n — <recommendation>
## Security: <ran / not required> — <summary>
## Blocking before human approval
## To track (P2/P3) and lessons to record (/lesson)
## Ready for human approval: YES / NO
```
