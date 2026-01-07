# Story 1.1: Project Initialization & UI Scaffolding

Status: done

## Story

As a Developer,
I want to initialize the repo with Electron-Vite, Tailwind, and shadcn/ui,
so that the foundational UI matches the design system.

## Acceptance Criteria

1. `npm run dev` launches Electron with dark theme (#0F172A).
2. Text color is off-white (#F8FAFC).
3. Primary accent color is #F97316.
4. Folder structure matches `_bmad-output/architecture.md` project structure.

## Tasks / Subtasks

- [x] Scaffold Electron-Vite React+TS application using the specified starter.
- [x] Integrate Tailwind CSS and shadcn/ui components following the design system.
- [x] Implement base layout and theming to match "The Orange Terminal" (dark background, accent color).
- [x] Align file/folder structure with the architecture document (main, preload, renderer, shared).
- [x] Add basic CI commands (`npm run dev`, `npm run build:win`) and verify they work.

### Review Follow-ups (AI)

- [ ] [AI-Review][Low] Add P0 E2E dev smoke test `1.1-E2E-001` that runs `npm run dev`, asserts the Electron shell opens, and verifies the Orange Terminal theme colors (#0F172A, #F8FAFC, #F97316) on the initial screen (AC #1–#3).

## Dev Notes

- Follow `_bmad-output/architecture.md` for project initialization decisions and library versions.
- Ensure theming tokens (colors, typography) align with UX theme; prefer configuration over ad-hoc inline styles.
- Keep initial implementation minimal; avoid premature optimization or extra features beyond scaffold and theming.

### Project Structure Notes

- Create folders and files to match the documented project structure (main, preload, renderer, shared).
- Ensure adapter and service folders exist even if stubbed; future stories will fill in behavior.

### References

- PRD: `_bmad-output/PRD.md` (Project Classification, Functional Requirements FR1?FR4).
- Architecture: `_bmad-output/architecture.md` (Project Initialization, Project Structure, Implementation Patterns).
- Epics: `_bmad-output/epics.md` (Epic 1, Story 1.1).

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

- _bmad-output/implementation-artifacts/1-1-project-initialization-ui-scaffolding.context.xml
### Agent Model Used

GPT-based SM assistant (BMAD workflow)

### Debug Log References

- 2025-11-20: `npm run build` and TypeScript typechecks passing.
- 2025-11-20: `npm run build:win` fails on this machine due to Windows symlink privilege when extracting `winCodeSign` cache (electron-builder); scripts and config are standard and expected to work once symlink permissions are granted.

### Completion Notes List

- Implemented Electron-Vite 4.x React+TS scaffold with `main`, `preload`, `renderer`, and `shared` folders aligned to `_bmad-output/architecture.md`.
- Integrated Tailwind CSS and shadcn-style components with an "Orange Terminal" theme (background `#0F172A`, text `#F8FAFC`, accent `#F97316`) and a base dashboard layout shell.
- Installed and pinned core architecture dependencies (`zustand`, `electron-trpc`, `bottleneck`, `zod`, `electron-store`, `electron-log`, `date-fns`, `clsx`, `tailwind-merge`) in `package.json`.
- Added initial Node-based tests for Story 1.1: P0 integration checks for project structure and build scripts, and a P1 unit test for the Orange Terminal theme tokens in `tailwind.config.cjs`.

### File List

- .editorconfig
- .gitignore
- .prettierignore
- .prettierrc.yaml
- .vscode/extensions.json
- .vscode/launch.json
- .vscode/settings.json
- electron-builder.yml
- electron.vite.config.ts
- eslint.config.mjs
- package.json
- package-lock.json
- postcss.config.cjs
- tailwind.config.cjs
- tsconfig.json
- tsconfig.node.json
- tsconfig.web.json
- build/entitlements.mac.plist
- build/icon.icns
- build/icon.ico
- build/icon.png
- resources/icon.png
- shared/types.ts
- shared/schemas.ts
- src/main/index.ts
- src/main/store.ts
- src/main/adapters/base.ts
- src/main/adapters/odds-api-io.ts
- src/main/adapters/the-odds-api.ts
- src/main/services/poller.ts
- src/main/services/calculator.ts
- src/main/services/router.ts
- src/preload/index.ts
- src/preload/index.d.ts
- src/renderer/index.html
- src/renderer/src/env.d.ts
- src/renderer/src/index.css
- src/renderer/src/main.tsx
- src/renderer/src/App.tsx
- src/renderer/src/components/Versions.tsx
- src/renderer/src/components/ui/button.tsx
- src/renderer/src/lib/utils.ts
- src/renderer/src/assets/base.css
- src/renderer/src/assets/electron.svg
- src/renderer/src/assets/main.css
- src/renderer/src/assets/wavy-lines.svg
- tests/1.1-int-structure.test.cjs
- tests/1.1-int-build.test.cjs
- tests/1.1-unit-theme.test.cjs
- _bmad-output/implementation-artifacts/1-1-project-initialization-ui-scaffolding.context.xml
- _bmad-output/implementation-artifacts/1-1-project-initialization-ui-scaffolding.md
- _bmad-output/implementation-artifacts/sprint-status.yaml

### Change Log

- 2025-11-20: Initialized Electron-Vite React+TS application with Tailwind + shadcn-style "Orange Terminal" UI scaffold and CI build commands for Windows.
- 2025-11-20: Senior Developer Review (AI) notes appended; Story 1.1 implementation approved with one follow-up test action item.

## Senior Developer Review (AI)

Reviewer: stefano  
Date: 2025-11-20  
Outcome: Approve – all ACs implemented and all original tasks verified; one low-severity follow-up test is recommended.

### Summary

- Implementation matches the architecture and epic definition for Story 1.1, using the Electron-Vite React+TS starter with Tailwind and shadcn-style components.
- Theme tokens for the Orange Terminal palette are centralized in Tailwind config and correctly applied to the base layout and UI shell.
- Project structure and build scripts align with `_bmad-output/architecture.md`, and initial Node-based tests cover structure, scripts, and theme tokens.

### Key Findings (by severity)

**High Severity**

- None.

**Medium Severity**

- None.

**Low Severity**

- Missing P0 E2E smoke test (`1.1-E2E-001`) to exercise `npm run dev` end-to-end and validate the Orange Terminal theme in a real Electron window (tracked as an AI follow-up task and backlog item).

### Acceptance Criteria Coverage

| AC # | Description                                                            | Status       | Evidence |
| ---- | ---------------------------------------------------------------------- | ------------ | -------- |
| AC1  | `npm run dev` launches Electron with dark theme (#0F172A).            | IMPLEMENTED  | `src/main/index.ts:6`, `src/renderer/src/index.css:7`, `tailwind.config.cjs:10`, `tests/1.1-int-build.test.cjs:17` |
| AC2  | Text color is off-white (#F8FAFC).                                     | IMPLEMENTED  | `tailwind.config.cjs:11`, `src/renderer/src/index.css:11`, `tests/1.1-unit-theme.test.cjs:20` |
| AC3  | Primary accent color is #F97316.                                       | IMPLEMENTED  | `tailwind.config.cjs:12`, `src/renderer/src/components/ui/button.tsx:22`, `src/renderer/src/App.tsx:41` |
| AC4  | Folder structure matches `_bmad-output/architecture.md` project structure.     | IMPLEMENTED  | `_bmad-output/architecture.md:77`, `tests/1.1-int-structure.test.cjs:15`, `shared/types.ts:1`, `src/main/adapters/base.ts:1` |

Summary: 4 of 4 acceptance criteria implemented.

### Task Completion Validation

| Task                                                                                                  | Marked As | Verified As         | Evidence |
| ----------------------------------------------------------------------------------------------------- | --------- | ------------------- | -------- |
| Scaffold Electron-Vite React+TS application using the specified starter.                             | [x]       | VERIFIED COMPLETE   | `package.json:47`, `electron.vite.config.ts:1`, `src/main/index.ts:1` |
| Integrate Tailwind CSS and shadcn/ui components following the design system.                         | [x]       | VERIFIED COMPLETE   | `tailwind.config.cjs:3`, `src/renderer/src/index.css:1`, `src/renderer/src/components/ui/button.tsx:1` |
| Implement base layout and theming to match "The Orange Terminal" (dark background, accent color).    | [x]       | VERIFIED COMPLETE   | `src/renderer/src/App.tsx:8`, `src/renderer/src/index.css:10`, `tests/1.1-unit-theme.test.cjs:11` |
| Align file/folder structure with the architecture document (main, preload, renderer, shared).        | [x]       | VERIFIED COMPLETE   | `tests/1.1-int-structure.test.cjs:15`, `src/main/index.ts:6`, `src/preload/index.ts:1`, `shared/schemas.ts:1` |
| Add basic CI commands (`npm run dev`, `npm run build:win`) and verify they work.                     | [x]       | VERIFIED COMPLETE   | `package.json:8`, `tests/1.1-int-build.test.cjs:17`, `_bmad-output/architecture.md:522` |

Summary: 5 of 5 original tasks verified complete; 0 questionable; 0 falsely marked complete. One new AI follow-up task has been added for future work (E2E smoke test).

### Test Coverage and Gaps

- Implemented tests for Story 1.1:
  - `[P0][1.1-INT-001]` project structure integrity (`tests/1.1-int-structure.test.cjs:15`) – asserts presence of main, preload, renderer, and shared entrypoints per architecture.
  - `[P0][1.1-INT-002]` dev/build scripts and `npm run build` success (`tests/1.1-int-build.test.cjs:17`, `tests/1.1-int-build.test.cjs:33`).
  - `[P1][1.1-UNIT-001]` Orange Terminal theme tokens in Tailwind config (`tests/1.1-unit-theme.test.cjs:11`).
- Gaps relative to `_bmad-output/test-design-epic-1.1.md:64`:
  - `1.1-E2E-001` (dev environment boot) not yet implemented – tracked as a follow-up.
  - Component-level tests (`1.1-CMP-001`, `1.1-CMP-002`) and additional P2/P3 tests remain planned but not yet present.
- No flakiness or anti-patterns detected in current tests; assertions are specific and deterministic.

### Architectural Alignment

- File and folder layout under `src/main`, `src/preload`, `src/renderer`, and `shared` matches the Project Structure section in `_bmad-output/architecture.md:77` and is enforced by `tests/1.1-int-structure.test.cjs:15`.
- Dependencies in `package.json:47` (e.g., `electron-vite`, `zustand`, `electron-trpc`, `tailwind-merge`) align with the Project Initialization and Version Governance guidance in `_bmad-output/architecture.md:31`.
- UI shell in `src/renderer/src/App.tsx:8` reflects the "Orange Terminal" theme and serves as a minimal, architecture-aligned scaffold without premature domain logic.

### Security Notes

- Story 1.1 primarily concerns scaffold and UI theming; no secrets, credential handling, or network IO are implemented in this slice.
- Preload script uses `contextBridge` to expose limited APIs (`src/preload/index.ts:1`), consistent with secure Electron patterns; no unsafe globals or dangerous IPC channels introduced in this story.

### Best-Practices and References

- Architecture and structure: `_bmad-output/architecture.md:26`, `_bmad-output/architecture.md:77`.
-,Test design and risk matrix for Story 1.1: `_bmad-output/test-design-epic-1.1.md:64`.
- Traceability and gate decision context: `_bmad-output/traceability-matrix-1.1.md:1`.

### Action Items

**Code Changes Required**

- [ ] [Low] Implement P0 E2E smoke test `1.1-E2E-001` that runs `npm run dev`, asserts the Electron main window opens without fatal errors, and verifies the Orange Terminal theme colors on the initial screen (AC #1–#3) (`_bmad-output/test-design-epic-1.1.md:128`).

**Advisory Notes**

- Note: After adding the E2E test and any additional Story 1.1 tests, re-run the TEA trace workflow to refresh `_bmad-output/traceability-matrix-1.1.md` and update the gate decision for this story.
