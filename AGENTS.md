# AGENTS.md

This file defines repository-specific collaboration rules for coding agents.

## Commit SOP (Mandatory)

When the user asks to commit code, always follow this sequence:

1. Show current working tree status with `git status --short`.
2. List exactly which files will be committed.
3. Stage only those explicit files (never use broad staging by default).
4. Commit with a clear message describing intent and scope.
5. Report back commit hash and committed file list.

## Safety Rules

1. Never include unrelated modified files in the same commit.
2. Never run destructive git commands (for example `git reset --hard`) unless explicitly requested.
3. If the repository is dirty, do not assume intent; keep commit scope minimal and explicit.

## Verification Before Commit

1. Run relevant checks for changed files when feasible (lint/tests/type checks).
2. If checks are skipped or unavailable, explicitly state that in the final report.
