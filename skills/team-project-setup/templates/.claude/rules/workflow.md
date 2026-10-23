# Workflow (always loaded)

Roles are ekip-kit subagents. The author of a change never approves it.

| Change | Planner (`/plan-change`) | After `implementer` (`/verify`) |
|---|---|---|
| Typo, copy, comment | — | — |
| Small, isolated; no contract, auth, or data impact | — | regression-verifier |
| Ordinary feature or bug fix | optional | regression-verifier → code-reviewer |
| Protected path / invariant, public contract, or > 1 layer | required | regression-verifier → code-reviewer |
| Auth, secrets, external input, file/network access, dependency, migration, LLM feature | required | + security-gatekeeper |

When in doubt, escalate one row. One architectural layer at a time.
Plans that change a contract, schema, dependency, or security behavior need
human approval before implementation; every merge needs human approval.
