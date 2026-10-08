# Phase 2 integrated acceptance — Phase 2.5D

Baseline: `b710ea0040f05ae873c853045124c3c82ad039d7` (remote `main`, PR #12). Assessment performed October 8, 2026. This record covers the existing planner through Phase 2.5C, not new scheduling features. ADRs 0001–0004 remain authoritative.

## Evidence and reproduction

The baseline has 599 passing tests. One additional real-application integration test brings the suite to **600**. `src/Phase2Acceptance.test.tsx` starts with empty storage and uses the actual App, forms, planner and persistence. It captures classes/assignments/availability/commitments, checks independently calculated workload, customizes/edits a lock, remounts, creates and repairs a source conflict, and unlocks without completion credit. It runs in existing hosted CI; it is a jsdom integration test, not a browser test.

`src/acceptance/phase2.browser.ts` adds **15 production-build Chromium cases**: five isolated cases at each of **1440 × 1000**, **820 × 1180**, and **390 × 844**. All passed. Each uses a fresh browser context with locale `en-US`, timezone `America/New_York`, and an explicit fixed date/minute, initially October 12, 2026 at 15:00. No arbitrary sleeps or external accounts are used.

- **Clean capture workflow:** real forms create Biology, Urgent essay (150 minutes, due 21:00), Later reading (30 minutes, due tomorrow), availability 16:00–19:00, and a commitment 17:00–18:00. Expected generated work is 16:00–17:00 and 18:00–19:00 for the urgent assignment; each assignment has 30 unplaced minutes. A 30-minute lock at 18:15–18:45 leaves 90 generated minutes, rather than duplicating the locked work. Two edits/reloads retain identity. Extending the commitment to 18:30 produces an atomic conflict; correcting the commitment restores the plan. Unlock returns the same workload to automatic placement.
- **Boundary/failure workflow:** fixtures initialize the sources; real UI and persistence then exercise a successful write crossing 15:00→15:01, infeasible-candidate rejection with zero writes, a controlled quota failure with unchanged source/plan/reference, successful retry, identity and reload. Faults intercept only browser `Date`/Storage APIs; planner and save functions are not mocked. The write-crossing check verifies that the clock actually advanced while adoption kept the preflight reference.
- **Three blocked-source cases:** malformed JSON, unsupported version and a controlled unavailable scheduling-store read. Each remains byte-identical with zero schedule writes; a real class can still be created. Availability and plan-refresh actions are disabled and manual-session actions absent.

The browser cases check runtime exceptions, native date/time controls, modal initial focus and Tab containment, Escape/cancel, source-preserving navigation, no nested interactive elements, scoped manual-session touch targets, and horizontal overflow. Healthy/conflict screenshots for all sizes are generated in ignored `test-results/phase-2/`; representative desktop, tablet and phone images were visually inspected. Text/actions were readable, locked/manual and generated/recommended cards distinct, and conflict rendering displayed no partial study schedule. Phone weeks intentionally stack vertically and require scrolling.

Reproduce with the repository's Node.js 24.19.0 and locked dependencies:

```sh
npm ci
npm test
npm run typecheck
npm run lint
npm run build
npm run format:check
git diff --check
npx playwright install chromium
npx vite preview --host 127.0.0.1 --port 4174 --strictPort
```

While the preview is running, in another terminal:

```sh
node src/acceptance/phase2.browser.ts
```

Playwright is already a repository dependency; no dependencies/configuration were added. The browser runner is typechecked/linted/formatted but **not executed by `npm test` or hosted CI**. It requires a local preview and an installed Chromium binary. In this cloud run, the existing binary cache was selected with `PLAYWRIGHT_BROWSERS_PATH=/tmp/homebase-pw-browsers`. The normal checkout commands above use Playwright's default cache. Build before every browser run so the preview represents the current source.

## Reused secondary coverage

| Acceptance area                                                                                                 | Existing evidence reused                                                                           |
| --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Empty state, missing/zero estimates, capacity/deadline shortage, full commitments                               | `App`, `WeeklyPlanner`, `planner`, `placement`, `scheduling` tests                                 |
| Exact reference/deadline boundaries, adjacent/overlapping windows and commitments, due-now/overdue recovery     | `planner`, `scheduling`, `priority`, `placement`, `regeneration` tests                             |
| Partial/full locks, crossing/expired locks, reservation, conservation, permutation determinism and immutability | `regeneration`, `planner`, `lockChanges` tests                                                     |
| All nine conflict explanations/actions; incremental unlock and assignment-edit repair                           | `LockedSessions`, `WeeklyPlanner` tests, with machine-readable conflict coverage in `regeneration` |
| IDs, repeat saves, failed writes, blocked-store preservation and academic isolation                             | `scheduleData`, `scheduleStorage`, `useAcademicPlanner`, `useLockedSessions`, `id`, `backup` tests |

The nine reasons remain `assignmentMissing`, `assignmentCompleted`, `missingEstimate`, `zeroEstimate`, `beforeReference`, `outsideAvailability`, `afterDeadline`, `overlapsLockedBlock`, and `lockedTimeExceedsEstimate`. Existing parameterized UI tests cover their relevant explanations and unlock/assignment repair choices; the new browser workflow independently exercises a source-created availability conflict. It does not claim nine separate browser conflict cases.

## Demonstrated defect and minimal repair

**Manual-session touch-target width:** the new browser geometry regression failed before the fix: `Close session editor: touch target 33×44px is below 44×44px`. Existing CSS enforced height only, while the shared icon-button width remained 33px; short session actions also had no minimum width. A scoped `min-width: 44px` now complements the existing minimum height for session actions and locked-modal buttons. The geometry assertion checks both dimensions for actual modal controls and study-card actions at all three viewports. All 15 cases passed after rebuilding. No scheduler, persistence, schema, generic toolbar styling, or dependencies changed. No other blocking application defect was demonstrated within this coverage.

## Persistence and adversarial audit

Browser inspection checks the exact persisted keys: `homebase.academic.v1` and `homebase.schedule.v1`. The latter contains only `version`, `planningWindows` and `lockedBlocks`, with exact source-record fields. No generated sessions, scores, available-time calculations, conflicts, unplaced results, expired-lock lists, reference timestamps or UI state are stored. Lock edits preserve academic bytes; successful repeated reloads preserve source bytes and re-derive the same cards when the explicit reference is unchanged.

| Challenge                         | Evidence / remaining uncertainty                                                                                                                                                                                                                                                                            |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| False success after a failed save | Real scheduling write failure keeps the editor retryable and preserves old sources/cards/reference. **Academic** write failures retain unsaved in-memory edits with a global warning; users must heed that warning before closing the tab. This existing Phase 1 limitation is not schedule-save atomicity. |
| Silent removal of unrelated data  | Exact source-key/record checks, academic byte isolation, ID-preserving edits, selected unlock, and existing storage/hook tests. No corrupt-store replacement is permitted through ordinary scheduling actions.                                                                                              |
| Double/reduced workload           | Independent 150 = 30 locked + 90 generated + 30 unplaced example; unlock restores automatic work without changing estimates/completion. Existing engine conservation/full-lock properties protect other inputs.                                                                                             |
| Stale successive edits            | Two browser edit/save/reload cycles and existing batched-handler/latest-source regressions. Concurrent tabs are not coordinated; single-tab editing is assumed.                                                                                                                                             |
| Conflict escape                   | A candidate outside availability produces a visible rejection and zero writes; existing full-plan preflight cases cover commitments, deadlines and workload. Source conflicts produce no scheduled cards.                                                                                                   |
| Reference drift                   | Opening/cancel/Escape/week navigation do not refresh; explicit Refresh and successful source adoption do. Rejected candidates/failed writes do not adopt. Browser write-crossing preserves exactly one reference.                                                                                           |
| Reload divergence                 | Same-source/same-reference browser reload comparisons, plus core permutation tests. A real reload captures a new clock reference, so elapsed time may legitimately change the plan.                                                                                                                         |
| Hidden unfinished work            | Independent urgent/later workload and readable unplaced totals; existing missing/zero/capacity/deadline tests. Conflict UI explicitly states no schedule was generated.                                                                                                                                     |
| UI/core disagreement              | Real App workflow, exact expected intervals around a commitment, locked/generated distinction and source-created atomic conflict. Existing nine-reason UI tests protect explanations/actions.                                                                                                               |
| Corruption overwrite              | All three blocked sources preserve raw bytes and produce zero writes while academic capture remains usable.                                                                                                                                                                                                 |
| Device assumptions                | Chromium native controls/focus/geometry tested; existing secure-ID fallback regressions reused. Physical Safari controls, storage lifecycle and managed-device filtering remain unverified here.                                                                                                            |
| Mocked test illusion              | Primary browser scenario uses real forms, planner and localStorage, with an independently calculated oracle. Only fault scenarios intercept browser boundaries; the clock is controlled explicitly. Composition comparisons alone are treated as wiring evidence, not independent correctness proof.        |

All local gates passed: clean `npm ci`, **600 tests**, typecheck, zero-warning type-aware lint, production build, formatting and `git diff --check`. No lint suppressions or CI changes were introduced. Hosted `CI / verify` must also pass on the review PR's current head; its exact run/head evidence is reported in the PR/completion package. Hosted CI does not run the standalone Chromium cases.

## Physical Safari checklist — outstanding

No physical Safari test of this acceptance head was performed by Codex. Record device model, iOS/iPadOS version, tested commit/URL and per-step results before final approval. Use test records and future study times to avoid accidentally creating an elapsed-reference conflict.

1. On personal iPhone Safari, load Weekly View and create an estimated assignment.
2. Add/edit/delete Study availability with native date/time controls; add a commitment and confirm generated sessions avoid it.
3. Confirm recommended sessions and exact unscheduled work are visible and readable.
4. Customize → Lock, then edit the lock; confirm Manual versus Recommended remains clear.
5. Reload and verify availability/manual intent survives and generated work is re-derived.
6. Change a relevant commitment/estimate to create a conflict; confirm no partial schedule, then repair through unlock or the related source editor.
7. Unlock healthy work and confirm regeneration without assignment completion credit.
8. Try Refresh plan, navigation, modal Cancel/Close, touch targets and layout; confirm usable controls and no horizontal overflow.
9. Close/reopen Safari and verify browser-local source data survives in the same profile/origin.

Repeat on managed iPad Safari **if the existing deployed hostname is allowed**. Prior user evidence reported Netlify categorized as Games and GitHub Pages on a global block list; that is environmental evidence, not validation of this head. If still blocked, record exactly: **Environment-blocked — application not loaded; managed-iPad behavior unverified.** No filtering workaround, hosting integration or deployment was attempted in this phase.

## Readiness and limitations

**READY FOR FINAL ACCEPTANCE**, subject to a green hosted current-head check, independent PR review and outstanding user-run Safari results. This is not official Phase 2 completion. No blocking defect remains in the exercised automated/browser coverage.

The accepted priority-first greedy algorithm is not globally optimal. No sync, cross-tab coordination, drag-and-drop, progress/historical completion, expired-lock cleanup, force override or backup import/restore UI is added. Clearing site data/private browsing/storage loss can lose local sources; there is no backup download UI. Academic persistence errors require attention to the existing warning. Chromium viewport checks cannot prove physical Safari or managed-device compatibility, all UX quality, or correctness for every possible input. Prior insecure LAN HTTP ID behavior is covered by existing regressions, not reproduced by this loopback browser run.

Next task: **Independent Phase 2.5D PR review, followed by the user-run Safari checklist and final Phase 2 completion decision.** No Phase 3 work begins here.
