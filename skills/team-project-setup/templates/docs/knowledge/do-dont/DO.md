# DO

<!-- One `## DO-<n> — <rule>` per entry. Rule first, then Why / How to apply. -->

## DO-001 — Use the shared API client for all outbound HTTP calls
- owner: <team> · status: active · applies-to: ["src/**"] · last-verified: <YYYY-MM-DD>

**Why:** it adds retries, timeouts and tracing in one place.
**How to apply:** import from `<path>`; never call `fetch`/`requests` directly.
