# Testing (always loaded)

- A bug fix starts with a test that fails for the bug's reason, then the fix.
- Never delete, skip, or loosen an existing test or assertion to make a
  change pass. If a test is genuinely wrong, say so and ask first.
- Never claim "done" or "tests pass" without having run them in this
  session; quote the command and the result.
- New behavior needs normal, failure and boundary-case tests
  (test-integrity skill).
- Coverage of a touched file must not go down.
