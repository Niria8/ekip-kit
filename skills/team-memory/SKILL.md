---
name: team-memory
description: Use whenever project knowledge must be recorded, looked up, reorganized, or "cleaned up" — a new decision, a do/don't rule, a stable-module invariant, a lesson from a bug, or a request like "remove unnecessary things from memory". Defines the shared, version-controlled knowledge tree a whole team's Claude sessions read from, and the rule that knowledge is archived, never deleted.
---

# Team Memory

Claude's built-in auto-memory (`~/.claude/projects/<project>/memory/`) is
per-person and per-machine. A team cannot share it, review it, or roll it
back. Team knowledge therefore lives **in the repository**, is reviewed in
pull requests like code, and is loaded into every teammate's session the
same way.

## Where things live

```
CLAUDE.md                     # lean index (<150 lines): what the project is,
                              # how to build/test, and @imports — nothing else
.claude/rules/                # short, always-or-path-loaded rules
  security.md                 #   (loaded every session)
  testing.md
  change-safety.md
  <area>.md                   #   with `paths:` frontmatter → loaded only when
                              #   Claude touches matching files
docs/knowledge/               # the team's long-term memory
  INDEX.md                    # one line per entry, grouped by category
  project/                    # what the system is: overview, architecture,
                              #   glossary, external integrations
  conventions/                # how we write code here (naming, errors, logging)
  do-dont/DO.md, DONT.md      # explicit rules, each with a "why"
  invariants/INVARIANTS.md    # stable behavior that must not break, and the
                              #   tests that prove it
  decisions/                  # ADRs (architecture decision records)
  lessons/LESSONS.md          # things that went wrong and the rule they produced
  work-log/<task-id>.md       # live state of in-flight multi-session work
                              #   (task-ledger skill)
  archive/                    # retired knowledge — moved, never deleted
    INDEX.md
    YYYY-MM/<original-path>.md
```

Decide the category by asking what the entry *is*, not where it was learned:

| The entry says... | Category |
|---|---|
| "The system is / works like..." | `project/` |
| "We write X like this" | `conventions/` |
| "Always / never do X, because Y" | `do-dont/` |
| "X must keep behaving like Y; test Z proves it" | `invariants/` |
| "We chose X over Y because..." | `decisions/` (ADR) |
| "X broke because Y; now we Z" | `lessons/` |
| "Task T: done so far, next steps, open risks" | `work-log/` |

Something that only matters to the current conversation belongs nowhere.
Something derivable from the code or `git log` belongs nowhere either —
record *why*, not *what*.

## Entry format

Every file under `docs/knowledge/` (except INDEX files) starts with:

```markdown
---
id: DONT-007                 # stable; never reused, even after archiving
title: Never call the payment API from a request thread
category: do-dont            # project|conventions|do-dont|invariants|decisions|lessons|work-log
owner: payments-team         # who to ask; a team, not only a person
status: active              # active | superseded | archived
applies-to: ["src/payments/**"]
last-verified: 2026-10-16    # bump when someone re-checks it against the code
links: [ADR-0012, LESSON-003]
---
```

Single-file categories (`DO.md`, `DONT.md`, `INVARIANTS.md`, `LESSONS.md`)
use one `## <id> — <title>` heading per entry with the same fields as a
short bullet list under it, so each entry can be referenced and archived
individually.

Rules for writing an entry:
- One fact or rule per entry. Lead with the rule, then `**Why:**` and
  `**How to apply:**` lines.
- Link instead of duplicating: if two entries say the same thing, keep the
  better one and turn the other into a pointer.
- Add or update its line in `docs/knowledge/INDEX.md` in the same change.
- If the rule must be enforced *every* session, also add one line to the
  matching `.claude/rules/*.md` file pointing at the entry id. Keep
  `.claude/rules/` short — it is loaded into every context window.

## Looking things up

Before changing an area, read `docs/knowledge/INDEX.md` and every entry
whose `applies-to` matches the files you are about to touch. Do not load
the whole tree; use the index, then open only what applies. When an entry
looks wrong against the current code, say so and propose an update — do
not silently follow stale knowledge, and do not silently ignore it.

## "Clean up the memory" — archive, never delete

Run it with `/memory-cleanup` (the `knowledge-curator` agent), which
follows this procedure. New knowledge from a session goes in with
`/lesson`.

A request to remove, trim, clean, or shorten memory is a request to make
the **active** set smaller, not to destroy information. Details that look
unnecessary today are exactly what someone needs when the same bug comes
back. Procedure:

1. **List first, change nothing.** Classify each candidate entry:
   - *duplicate* — another active entry says the same thing,
   - *stale* — contradicted by the current code or a newer decision,
   - *too detailed for the active set* — true, but rarely needed,
   - *keep*.
   Show this list and get confirmation before moving anything.
2. **Move, don't delete.** For every entry not marked *keep*:
   - Copy it verbatim to `docs/knowledge/archive/YYYY-MM/<original-path>`,
     setting `status: archived` (or `superseded`, with
     `superseded-by: <id>`) and adding `archived-on` and `archive-reason`.
   - Add one line to `docs/knowledge/archive/INDEX.md`:
     `- <id> — <title> — <reason> → <archive path>`.
   - In the active location, replace a *too detailed* entry with a short
     summary (≤ 3 lines) plus `Details: <archive path>`; remove a
     *duplicate*/*stale* entry and leave its id pointing to the archive in
     `INDEX.md`.
3. **Never** run `rm`, `git rm`, `Remove-Item`, or a Write that empties a
   knowledge file. The plugin's guard hook blocks these on knowledge paths
   for this reason; if it fires, follow this procedure instead of working
   around it.
4. Report what moved where, so a reviewer can check the PR.

When a later task needs an archived detail, search `archive/INDEX.md`
first, then open the specific archived file. Restoring is the same move in
reverse, with `status: active` and a fresh `last-verified`.

The same rule applies to a person's own auto-memory directory: shrink the
`MEMORY.md` index by moving detail into an `archive/` subfolder of that
directory, never by deleting files.

## Keeping it healthy

- Each PR that changes behavior covered by an entry updates that entry in
  the same PR (`code-reviewer` checks this).
- Entries with `last-verified` older than ~90 days are candidates for a
  re-check, not for deletion.
- `CLAUDE.md` stays an index. When it grows past ~150 lines, move sections
  into `docs/knowledge/` or `.claude/rules/` and import or link them.
