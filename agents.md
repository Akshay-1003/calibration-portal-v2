# Codex Instructions — Token-Efficient Development

## Project Context
- Existing frontend: ../fe-web-vacl (READ ONLY)
- New frontend: frontend-v2
- Backend: READ ONLY
- Stack: React 19, Vite, TypeScript, Tailwind v4, HeroUI v2/v3, Shadcn.

## Token Efficiency Rules

1. Inspect only files relevant to the current task.
2. Do not scan the entire repository unless explicitly requested.
3. Do not repeatedly read files already inspected.
4. Use targeted searches instead of opening large files.
5. Prefer direct code changes over lengthy explanations.
6. Keep responses short and technical.
7. Do not generate extensive documentation unless requested.
8. Do not rewrite existing working code unnecessarily.
9. Preserve business logic, API contracts and calculations.
10. Avoid broad refactoring unrelated to the requested fix.
11. Run focused validation first, then full build when appropriate.
12. Do not print thousands of TypeScript errors into the conversation.
13. Save diagnostic output to a local file and summarize error counts by category.
14. Do not repeat previously resolved issues.
15. When blocked, explain the exact blocker briefly instead of repeatedly attempting the same approach.

## UI Migration Rules
- Legacy components use @heroui-v2/react.
- New components use @heroui/react or Shadcn.
- Preserve Tailwind v4 configuration.
- Do not copy legacy global CSS.
- Do not modify the backend.

## Response Format
Keep the final response within approximately 100 words.

Report only:
- Root cause.
- Files changed.
- Error count before/after.
- Remaining blockers.

Do not include full code snippets unless requested.


# Calibration Portal V2 — Development Instructions

## Objective

Complete migration to a clean, production-ready React frontend while preserving all existing calibration business functionality.

## Architecture

- React + Vite + TypeScript
- Tailwind CSS v4
- HeroUI v3 primary
- Shadcn/UI secondary
- HeroUI v2 temporary compatibility
- Existing FastAPI backend

## Development Rules

1. Work only in frontend-v2.
2. Existing frontend and backend are read-only.
3. Preserve all business calculations and API contracts.
4. Do not copy legacy global CSS.
5. Avoid duplicate resets and global style overrides.
6. Keep third-party UI components isolated.
7. Prefer shared reusable components.
8. Do not modify unrelated files.
9. Do not suppress TypeScript errors.
10. Do not use force installation flags.
11. Run focused validation after each task.
12. Maintain MIGRATION.md progress.
13. Make small, reviewable changes.
14. Never push or deploy without approval.

## Token Efficiency

- Inspect only relevant files.
- Avoid repeated full repository scans.
- Use existing error reports when available.
- Do not print full error logs.
- Keep final responses under 100 words.
- Stop after completing the requested scope.

## Completion Criteria

Migration is complete only when:
- TypeScript and production build pass.
- All application modules work.
- Authentication and permissions are preserved.
- Calibration calculations and PDF outputs match existing behavior.
- Dropdown flickering is resolved.
- Legacy UI dependencies are removed.
- Automated regression checks pass.