# <Project> security rules

<!-- Project-specific security rules: things a reviewer cannot infer from the
     code. Read by:
       - the security-gate skill (claude-team-kit), and
       - Anthropic's security-guidance plugin, if installed, which appends
         this file to its LLM diff-review prompt (8 KB budget, shared with
         ~/.claude/claude-security-guidance.md; requires Python).
     Committed and shared. Personal overrides go in
     claude-security-guidance.local.md (git-ignored).
     NEVER put secrets here — the contents are sent to the review model.
     Keep each rule one or two lines, and delete the examples below. -->

## Data access
- Example: reads of `customers` / `orders` go through `db.replica`; `db.primary` is for writes only.

## Authentication and authorization
- Example: every handler under `src/api/admin/**` must call `requireRole("admin")` before any other work.
- Example: background jobs use service-account credentials from `jobs.serviceAccount()`, never a user token.

## Outbound requests
- Example: HTTP calls to user-supplied URLs go through `net.safeRequest` (SSRF allow-list).

## Sensitive data
- Example: national ID numbers and card data are never logged, even masked; use `redact()` from `src/logging`.

## Accepted exceptions
<!-- Things that look insecure but are deliberate, with the reason, so
     reviewers stop re-flagging them. -->
- Example: `tools/fixtures/fake_keys.py` contains non-functional test keys.
