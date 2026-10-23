---
paths:
  - "src/payments/**"
---
# Payments area (loaded only when working on matching files)

<!-- Rename/copy this file per sensitive area and adjust `paths`. Keep it to
     the handful of rules that matter there, each pointing at a knowledge id. -->
- Amounts are integer minor units, never floats (DONT-001).
- Every state change goes through `PaymentStateMachine` (INV-001).
