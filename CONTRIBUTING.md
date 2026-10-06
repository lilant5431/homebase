# Homebase development

## Definition of Done

This is the default for substantial implementation work unless the task explicitly justifies an exception:

- Stated requirements are satisfied, with no unrelated scope added.
- Relevant tests are added or updated, and existing tests pass.
- A clean `npm ci`, then `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, and `npm run format:check` succeed.
- Hosted `CI / verify` passes for the PR's current commit.
- Documentation reflects changed behavior or contracts, and known limitations are reported.
- A PR is created and independently reviewed before merging. A green CI run alone does not complete independent review.

Use judgment for tiny documentation-only changes: not every change needs every product test. Report skipped checks and why. Do not weaken verification for substantial implementation work without an explicit task justification.

## Regression-first bug fixes

When fixing a reproducible defect, reproduce it and add or identify regression protection whenever reasonably possible before or alongside the fix. The test should fail because of the defect and pass after the correction. Then run relevant tests and the applicable verification gates. If automated regression protection is impractical, report how the defect was reproduced and verified, and why no test was added.

## Architecture decisions

Create a concise Architecture Decision Record when a decision is expensive to reverse or materially changes system boundaries, persistence, synchronization, authentication/security, connector architecture, or other foundational behavior. Record the problem, alternatives, decision, tradeoffs, and migration/security implications where relevant. Routine refactors, minor UI changes, straightforward bug fixes, and ordinary dependency maintenance do not require ADRs.

## Static analysis

Oxlint and its integrated `oxlint-tsgolint` backend form one lint stack. We pin stable versions: Oxlint 1.87.0 and backend 7.0.2003. The [official type-aware guide](https://github.com/oxc-project/website/blob/main/src/docs/guide/usage/linter/type-aware.md) requires TypeScript 7.0+; the [backend's versioning documentation](https://github.com/oxc-project/tsgolint#versioning) identifies 7.0.2003 as TypeScript 7.0.2 plus backend patch 003. Oxlint supports our local/CI Node.js 24.19.0. Stable [typescript-eslint's support window](https://typescript-eslint.io/users/dependency-versions/) currently excludes TypeScript 7, so it is not installed. Recheck official compatibility when updating TypeScript or lint dependencies.

`.oxlintrc.json` uses an explicit rule list instead of category presets: core correctness (unreachable code, duplicate branches/keys, unsafe control flow), type-aware unsafe-value and promise checks, suspicious conversions, and strict equality. React overrides select Rules of Hooks, dependency completeness, JSX key/duplicate-prop checks, and direct state-mutation protection. Test overrides select focused-test prevention and assertion/promise correctness. We avoid broad React Compiler and test-style presets; Prettier owns formatting. No custom plugins or architecture rules are introduced.

`npm run lint` checks all supported code files under `src` (including tests) and `vite.config.ts`, with type-aware analysis and zero warnings. Generated/dependency directories (`node_modules`, `dist`, `coverage`, `playwright-report`, `test-results`) are excluded; source/test paths are not ignored. Local and CI commands are identical and never autofix. Unused inline disable directives are reported. Prefer justified central rule selection over suppressions; do not disable useful rules to hide defects.

For branch protection, require the GitHub Actions check **`verify` from workflow `CI`** (displayed as **`CI / verify`**). This task does not change repository settings; a maintainer must configure protection separately if needed. Lint, tests, and CI provide complementary evidence, not proof of behavior, UX, architectural quality, or security.
