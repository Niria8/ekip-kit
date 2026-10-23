# Invariants — behavior that must not break

<!-- Each entry: what must stay true, where, and which test proves it.
     An invariant without a test is a wish; add the test.
     Protected areas are also listed in .claude/guardrails.json so the
     plugin asks before editing them. -->

## INV-001 — Payment state only changes through PaymentStateMachine
- owner: <team> · status: active · applies-to: ["src/payments/**"] · last-verified: <YYYY-MM-DD>
- proven by: `tests/payments/test_state_machine.<ext>`

**Why:** direct status writes skipped refunds and double-charged customers once.
**How to apply:** never assign `payment.status` outside the state machine.
