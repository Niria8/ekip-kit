---
description: Shrink and tidy the team knowledge (and optionally your personal Claude memory) by archiving stale, duplicate, or overly detailed entries — audit first, nothing moved without approval, nothing ever deleted
argument-hint: "[optional: area or path to focus on, or 'personal' for your auto-memory]"
allowed-tools: Read, Grep, Glob, Bash(node .claude/scripts/check-knowledge.js:*), Bash(git status:*), Agent
---

Run the `takim:knowledge-curator` agent. Focus: $ARGUMENTS
(empty = the whole knowledge tree; `personal` = the user's auto-memory
directory for this project, using an `archive/` subfolder there).

Run the curator in the foreground and wait for each result before you
reply — never as a background task: every step below depends on it.

1. Ask the curator for the **audit only** first. Show the user the list:
   per entry the class (stale / duplicate / too detailed / unverified /
   keep) and the proposed action.
2. Wait for the user to approve all, some, or none.
3. Run the curator again with exactly the approved items to apply.
4. Show what moved where and the checker result.

"Clean up" never means delete: every removed entry ends up in `archive/`
with an index line, and can be restored.
