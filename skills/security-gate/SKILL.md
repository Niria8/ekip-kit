---
name: security-gate
description: Use before merging any change that touches authentication, authorization, secrets, external input, file or network access, dependencies, database migrations, or LLM features — to review it for security risk and to produce evidence (scan output, negative tests) rather than opinion.
---

# Security Gate

## Project rules first

Read `.claude/claude-security-guidance.md` (and `.local.md` / the user-wide
`~/.claude/claude-security-guidance.md`, if present). Those project rules
override the generic list below. When a review produces a rule specific to
this codebase, propose adding it there (one or two lines, never a secret).

If Anthropic's `security-guidance` plugin is installed, its LLM diff and
commit reviews read the same file; treat their findings as input to this
gate, not as a replacement for it.

## Check

- **Authentication**: identity verified on the server for every protected
  action. Frontend checks are UX only, never a security boundary.
- **Authorization**: access checked against the actual resource, default
  deny. No trusting role/ID claims sent by the client.
- **Injection**: SQL, shell, template, LDAP, deserialization — input is
  parameterized, never concatenated.
- **Secrets**: none in code, committed config, logs, error messages, or
  test fixtures that look real.
- **Input**: validated for type, size, and format on the server.
- **Sessions/tokens**: expiry, revocation, secure storage (httpOnly/secure
  cookies rather than localStorage for sensitive tokens).
- **Data exposure**: responses return only fields the caller may see.
- **Path traversal / files**: user-controlled paths confined to an allowed
  root; uploads type/size-checked, stored outside the web root, never
  executed.
- **SSRF**: server-side requests to user-supplied URLs go through an
  allow-list; internal and cloud-metadata addresses blocked.
- **XSS / CSRF**: output encoded for its context; state-changing requests
  CSRF-protected where cookies authenticate.
- **Crypto**: no home-made crypto; passwords with a slow KDF
  (argon2/bcrypt/scrypt); randomness from a CSPRNG.
- **Abuse**: rate limits / lockout on login, reset, and enumerable or
  expensive endpoints.
- **Errors and logs**: no stack traces, SQL, or internal paths to the
  client; no credentials, tokens, or personal data in logs.
- **Dependencies**: new packages justified, maintained, license-compatible,
  free of known vulnerabilities; lockfile committed.
- **LLM features**: retrieved or user content is data, never instructions;
  model output validated before it reaches a query, shell, or HTML.

## Evidence, not opinion

Run what the project has and quote the output:
- secret scan of the changed files (e.g. `gitleaks detect --no-git -s <path>`),
- static analysis of the changed files (e.g. `semgrep scan --config p/default <paths>`),
- dependency audit for changed manifests (`npm audit`, `pip-audit`,
  `osv-scanner`, `dotnet list package --vulnerable`, ...),
- for every protected endpoint touched: a test proving an
  unauthenticated caller and a wrong-role caller are refused.

A tool that is not available is reported as "not run" — never silently
skipped. A missing negative-authorization test on an auth change is
itself a high-severity finding.

## Severity and output

- `P0` critical — blocks merge (exploitable hole, secret leak, auth bypass)
- `P1` high — blocks merge for auth/authz/data/migration changes
- `P2` medium — track as a real ticket, fix soon
- `P3` low — optional hardening

For each finding: location, risk, how it could be exploited, suggested
direction for the fix. The reviewer does not apply fixes in the same pass,
and should not be the person/session that wrote the change — run it
through the `security-gatekeeper` agent.
