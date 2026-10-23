# Security (always loaded)

- Never read, print, or commit `.env*`, key files, or credentials. Use
  `.env.example` with placeholder values.
- Never hardcode secrets, tokens, or connection strings; read from config
  or a secret manager.
- All external input is validated on the server; frontend checks are UX only.
- Queries and shell commands are parameterized — never built by string
  concatenation from input.
- New dependency → state why, check license and known vulnerabilities, and
  flag it for the `security-gatekeeper` agent.
- Changes to auth, authorization, secrets handling, data access, or
  migrations require the `security-gatekeeper` agent (security-gate skill)
  before merge.
- Do not log credentials, tokens, or personal data.
- Project-specific security rules: `.claude/claude-security-guidance.md`.
