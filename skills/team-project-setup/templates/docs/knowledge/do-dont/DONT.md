# DON'T

<!-- One `## DONT-<n> — <rule>` per entry. Rule first, then Why / How to apply. -->

## DONT-001 — Don't store money as floating point
- owner: <team> · status: active · applies-to: ["src/payments/**"] · last-verified: <YYYY-MM-DD>

**Why:** rounding errors produced wrong invoice totals (LESSON-001).
**How to apply:** integer minor units (cents) everywhere; format only at the edge.
