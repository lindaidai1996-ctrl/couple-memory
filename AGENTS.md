# AGENTS.md

This file defines repository-specific collaboration rules for coding agents.

## Commit SOP (Mandatory)

When the user asks to commit code, always follow this sequence:

1. Show current working tree status with `git status --short`.
2. List exactly which files will be committed.
3. Stage only those explicit files (never use broad staging by default).
4. Commit using Conventional Commits format: `type(scope): subject`.
5. Push the commit to the current remote tracking branch by default.
6. Report back commit hash, committed file list, and push result.

## Commit Message Convention (Mandatory)

Use Conventional Commits:

1. Format: `type(scope): subject`
2. Allowed `type` values include: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `build`, `ci`, `style`.
3. `type` and `scope` must be in English.
4. `subject` must be written in Chinese, concise and action-oriented.

## Safety Rules

1. Never include unrelated modified files in the same commit.
2. Never run destructive git commands (for example `git reset --hard`) unless explicitly requested.
3. If the repository is dirty, do not assume intent; keep commit scope minimal and explicit.

## Verification Before Commit

1. Run relevant checks for changed files when feasible (lint/tests/type checks).
2. If checks are skipped or unavailable, explicitly state that in the final report.

## Dev Server Restart Rule

When working on local runtime issues in this repository, the agent should proactively manage the dev server instead of leaving restart steps to the user.

1. If changes affect Prisma schema, Prisma client generation, migrations, `next-intl` messages, environment-dependent server code, or route/module cache behavior, assume a stale dev server may be part of the problem.
2. Before asking the user to retry manually, check whether the currently running dev server belongs to this repository.
3. If it does, stop the stale process and restart the local dev server from this repository, then reproduce the issue again.
4. If the process ownership or working directory cannot be confirmed safely, explain that uncertainty before taking action.
