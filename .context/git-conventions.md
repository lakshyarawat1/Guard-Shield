# Git Commit and Push Instructions for AI Agents

When pushing changes to GitHub for the Guard Shield project, you MUST adhere to the following rules to maintain consistency with the repository's history:

## 1. Commit Naming Convention
Always follow the established bracketed format for commit messages. 

**Format with Issue Number (Preferred if applicable):**
`[ #<Issue_Number> <Action> - <Description> ]`

**Format without Issue Number:**
`[ <Action> ] - <Description>`

**Common Action Types:**
- `Addition` (New features, files, or components)
- `Update` (Refactoring, modifying existing functionality, UI tweaks)
- `Fix` (Bug fixes)

**Examples:**
- `[ #12 Addition - Added Deep Packet Inspection and Backend Core Features ]`
- `[ Update ] - Refactored Sidebar and added System Health skeleton view`

## 2. Structured, Divided Commits
Do **NOT** dump all modified files into a single massive commit (e.g. do not just run `git commit -am`).

You must split your work into **multiple, logical commits** to better manage the changes. Grouping changes logically makes it much easier for developers to recheck, review, and revisit the git history.

**Example Strategy:**
1. Commit UI/Frontend restructure changes.
2. Commit Backend logic / Database schema changes.
3. Commit new Feature UI implementation.
