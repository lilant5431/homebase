# Phase 2 integrated acceptance — Phase 2.5D

Baseline: `b710ea0040f05ae873c853045124c3c82ad039d7` (remote `main`, PR #12). This record covers the existing planner through Phase 2.5C and the iPhone usability stabilization on PR #13, not new scheduling features. ADRs 0001–0004 remain authoritative.

## Current acceptance decision

The user confirms functional acceptance of the eight targeted physical iPhone Safari keyboard behaviors on `92991297ab8a84e5d34590c274c78fdc605ab12e`. The later physical Date/Time retest on `352a744f356eb7ff84d428230438a9a772463e18` failed four visual checks while both native pickers remained usable. **DT-01 remains unresolved. Overall Phase 2 acceptance is conditional on the maintainer explicitly accepting the documented non-blocking visual exception and its deferral to Phase 2.6E.** No merge or exception acceptance is inferred from this record.

The closure update changes this document only. Prior implementation/browser evidence belongs to its tested commits; hosted CI must pass separately on this documentation update's exact head. No new physical result is invented.

## Evidence and reproduction

The baseline has 599 passing tests. One additional real-application integration test and four modal lifecycle regressions bring the suite to **604**. `src/Phase2Acceptance.test.tsx` starts with empty storage and uses the actual App, forms, planner and persistence. It captures classes/assignments/availability/commitments, checks independently calculated workload, customizes/edits a lock, remounts, creates and repairs a source conflict, and unlocks without completion credit. `src/ModalBackdrop.test.tsx` now covers desktop dialog focus/page restoration, mobile portal/native-scroll lifecycle, retained draft/focus across layout-mode changes, dismissal without VisualViewport, and absence of viewport-driven focus/scroll/zoom corrections. The earlier metric-correction tests were replaced, not retained as proof of the new architecture. These run in existing hosted CI; they are jsdom integration tests, not browser tests.

`src/acceptance/phase2.browser.ts` runs **25 production-build Chromium cases**: five isolated cases at each of **1440 × 1000**, **820 × 1180**, **390 × 844**, **844 × 390**, and **667 × 375**. All passed. Each uses a fresh browser context with locale `en-US`, timezone `America/New_York`, and an explicit fixed date/minute, initially October 12, 2026 at 15:00. No arbitrary sleeps or external accounts are used.

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
node src/acceptance/mobile.browser.ts
```

Playwright is already a repository dependency; no dependencies/configuration were added. Both browser runners are typechecked/linted/formatted but **not executed by `npm test` or hosted CI**. They require a local preview and an installed Chromium binary. In this cloud run, the existing binary cache was selected with `PLAYWRIGHT_BROWSERS_PATH=/tmp/homebase-pw-browsers`. The normal checkout commands above use Playwright's default cache. Build before every browser run so the preview represents the current source.

`mobile.browser.ts` adds **three mobile-context cases**, at 390 × 844, 844 × 390 and 667 × 375; all passed. They rotate an open drawer, reach all six navigation items, create/edit real academic records, check every form field is at least 16px, and reach all controls in a 210px-high visual viewport panned 45px down. The full layout-viewport shade remains visible below the smaller form. They also check cancellation/scroll restoration, availability forms, absence of horizontal overflow, and scale=2 events not counteracting pinch zoom. These controlled VisualViewport metrics test the application boundary, not a real Safari keyboard. Reduced-viewport screenshots and landscape planner screenshots were visually inspected; the shade covered the whole screen and controls remained reachable through internal scrolling.

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

### Historical physical iPhone report and initial stabilization

The user subsequently reported iOS 27 form-focus zoom, difficult landscape navigation including inaccessible Classes, and intermittent unshaded space below modals. Horizontal overflow/clipping was not confirmed by the user. This historical report superseded the earlier absence of physical observations. Subsequent results below accept the document-scrolling keyboard remediation; DT-01 is the remaining visual exception.

- **Focus zoom:** inspected modal inputs/selects/textareas were styled at 12px, below Safari's usual 16px focus-zoom threshold, and the academic editor used text-input `autoFocus`. Fields now use 16px text; academic/availability editors focus the dialog with `preventScroll`, leaving the keyboard to an explicit field interaction. Existing locked-session initial focus and keyboard containment remain intact. The viewport meta tag is unchanged: pinch zoom/user scaling are not disabled.
- **Cut-off navigation:** the failing pre-fix mobile regression placed Classes' bottom at **y=443 in a 667 × 375 viewport**, even after attempting to scroll it into view. The fixed drawer had no vertical overflow scrolling. It now uses `100dvh` (with `vh` fallback), `min-height: 0`, safe-area padding and vertical scrolling, preserving child sizes. The mobile layout also applies to widths ≤950px with heights ≤500px, covering short phone landscapes such as 844 × 390. All six items are actually clicked at all tested phone sizes.
- **Keyboard/backdrop geometry:** previously the modal used layout-viewport `92vh` without VisualViewport handling or background-scroll containment. Keyboard shrink/pan could leave the form outside usable space; the exact iOS blank-region mechanism cannot be reproduced conclusively in Chromium. All three modal types now share `ModalBackdrop`: a fixed full-screen shade, separate safe-area-padded scrollable form frame, scale=1 VisualViewport resize/scroll handling, and restored body style/scroll on close. Scale≠1 updates do not reflow the dialog to counteract pinch zoom. Grid tracks and native controls may shrink without intrinsic-width overflow. With controlled keyboard metrics, every field/action is reachable and the shade covers the full layout screen.

Regression evidence comprises the four hosted modal lifecycle tests, the three mobile production-browser cases, and the complete planner acceptance expanded to both short landscapes (28 browser cases total). No scheduling engine, academic/scheduling schema, persistence key, dependency, CI gate, or hosting changes were made. No lint suppressions were added.

### Previous attempt — active-field correction (physically unsuccessful)

The user physically retested `d88cc83cae90c97116a084557fdf51596b0c46cc` on iOS 27 Safari: **six of seven stabilization checks passed**. The remaining demonstrated defect was an input/typed text becoming hidden behind the landscape software keyboard. Those six passes are physical evidence for the earlier fixes, not proof of this correction.

Investigation showed that `ModalBackdrop` resized/offset its frame but never rechecked the active field inside the dialog's scrolling content. A fixed background prevents document scrolling from reliably revealing that nested control. The previous browser test manually called `scrollIntoViewIfNeeded()` for every field, proving reachability but concealing this focus synchronization gap. Modal centering and safe-area padding already bounded the frame; no further CSS/body-lock changes were needed for the reproduced failure.

**Before-fix evidence:** the new regression focuses the estimate input _before_ contracting to a 210px-high visual viewport offset by 45px. On the starting build it failed with `Focused field must be visible without test-side scrolling`, despite retaining focus and a correctly sized frame. The assertion intersects the actual dialog's client area with the simulated visible viewport. It runs before any manual reachability scrolling.

**Minimal correction:** shared modal infrastructure now coalesces scoped `focusin` and VisualViewport resize/scroll events into one animation-frame check. It reads the actual focused editable control and dialog boundaries, then adjusts only that dialog's `scrollTop` by the required amount. Already visible controls are not moved; there is no smooth scrolling, arbitrary delay, typing handler, or dialog-scroll feedback loop. Pinch-scale events skip corrections. A window-resize listener exists only while a modal without VisualViewport is mounted. Pending frames/listeners are removed on close; existing body style, page scroll, focus restoration and full-screen shade remain intact.

**After-fix evidence:** the enhanced mobile cases pass at 844 × 390, 667 × 375 and 390 × 844. Without a test-side scrolling helper they verify a field focused before keyboard contraction, retained focus/value while typing, switching to title/notes with the keyboard already visible, repeated identical metrics without scroll jumps, rotation both ways, keyboard dismissal, and the no-VisualViewport resize fallback. The later manual loop remains only to test access to other fields and Save/Cancel. One additional hosted regression covers minimal dialog-only correction, event coalescing, focus switching, stable repeated updates and cancellation of pending work. Both production-browser scripts pass (25 planner + three mobile cases); the complete suite has 604 tests. Scheduling and source schemas/keys remain unchanged.

**Historical retest request (subsequently superseded):** on that candidate head, create/edit a form in 844 × 390 or equivalent iPhone landscape; focus a lower text/number field, open the actual keyboard and type; switch to the title and Notes while it stays open; confirm the field/caret/entered text remains visible without dismissing the keyboard, repeated jumps or scrolling against your gesture. Rotate to portrait and back, dismiss the keyboard, use Save/Cancel/Close, and check restored page scrolling, full shading, native pickers, manual pinch zoom and persisted records after reload. Chromium metrics demonstrate the application correction, not Safari keyboard/picker animation timing or actual device usability. **Do not mark this defect physically resolved or Phase 2 complete until that retest passes.**

### Accepted remediation — native mobile document editor

**Historical physical result:** the user tested `8819aea10a5affc68a268d100926faaea12593dd` on actual iPhone iOS 27 Safari. Title/text and Estimated work/numbers remained obscured in landscape; switching Title/Estimated work/Notes could hide the dialog. No repeated jumping, rotation, dismissed-keyboard actions, shading, restored scroll, native pickers, pinch zoom and reload persistence passed. This is the second unsuccessful physical remediation. The earlier automated passes above are historical evidence, not physical resolution.

**Root-cause assessment:** the form was nested inside a centered fixed overlay, the body was frozen with a negative scroll offset, and JavaScript independently resized/offset the frame and corrected the inner dialog's scroll using VisualViewport metrics. Safari's keyboard can shrink only the visual viewport while fixed elements remain anchored to the layout viewport. Native focus panning, viewport metric delivery and compositor occlusion are not reproduced by assigning predictable `height`/`offsetTop` properties to an EventTarget. The tests checked geometry using the same assumed coordinate system as the correction. Consequently they could pass while the actual keyboard covered the editor. This architectural interaction is supported by the physical failures and browser documentation; the exact internal cause on this user's iOS 27 build remains unconfirmed.

Primary references reviewed:

- [Browser viewport/keyboard behavior](https://developer.chrome.com/blog/viewport-resize-behavior/): layout versus visual viewport resizing; iOS Safari fixed elements can be obscured. Chrome's `interactive-widget` options are not assumed to fix Safari.
- [WebKit fixed-input focus scroll report 207049](https://bugs.webkit.org/show_bug.cgi?id=207049): corroborates the class of fixed-position focus problems, not this exact device/version.
- [WebKit VisualViewport timing report 265578](https://bugs.webkit.org/show_bug.cgi?id=265578): keyboard metrics/resize events can arrive after animation. This is not a confirmed diagnosis of iOS 27.

**Different layout, fewer moving parts:** `ModalBackdrop` portals all shared editors to `document.body`. At widths ≤950px, the editor is a top-aligned, near-full-screen document-flow form. CSS hides `#root` while keeping React state mounted; the background is neither scrollable nor exposed in the accessibility tree. The body is not fixed, and the form has no bounded nested modal scroller. Safari owns ordinary document focus/panning; no VisualViewport listeners, focusin corrections, animation frames, keyboard offsets, typing loops or keyboard-dismissal workaround remain. The same mode applies in phone portrait and landscape, so ordinary rotation does not swap scrolling strategies or remount inputs. Safe-area padding and a `vh`/`dvh` minimum shaded page remain; `dvh` is not treated as a keyboard-height oracle. Wider desktop editors retain centered fixed overlays with body locking. Shared close restores the original body styles/class, page position and opener focus. Existing 16px fields, native controls, zoom permissions and specialized session-editor focus/Tab behavior remain.

**Regression evidence:** running the new mobile script against the previous production build failed on its fixed-body assertion (`actual: fixed`). This protects against reintroducing the hazardous scroll hierarchy; it does not reproduce the physical keyboard failure. Four lifecycle tests still run in hosted CI (604 total tests). Mobile browser cases use actual 390×844, 844×390 and 667×375 viewports, then actual 210px-high browser viewports, with native field focus and typing. They check full single-line input visibility, the first editing line of single-line Notes content, retained focus/values, rotation, stable typing scroll, document-scrolled access to all controls, no nested form scrolling, shade coverage, unchanged academic/schedule bytes after cancellation, native-control types, zoom permissions, no horizontal overflow and restored page scroll. The later control-reachability loop may scroll explicitly; the focused-field checks do not. Viewport resizing is not an iOS software keyboard and cannot prove native caret/compositor visibility or multiline textarea behavior. The integration runner now includes hidden cards in its failed-save DOM-state audit; separate visibility assertions still check cards after editor dismissal.

Both production Chromium runners passed: **25 integrated planner cases + three mobile cases**. No scheduling, storage, schema, dependency or navigation code changed. No lint suppressions were added. Playwright WebKit was installed and launch attempted, but this host lacks `libgtk-4.so.1`, `libgraphene-1.0.so.0`, `libharfbuzz-icu.so.0`, `libmanette-0.2.so.0`, `libhyphen.so.0` and `libGLESv2.so.2`; **WebKit execution is environment-blocked, not passed**. Even a desktop WebKit pass would not prove physical iOS keyboard behavior.

**Historical retest request (superseded; only the eight reported checks below are accepted):** create/edit an assignment in iPhone Safari landscape; explicitly open Title's keyboard and type; without dismissing it, move to Estimated work, type digits, then Notes and back to Title. Confirm each active field/caret/text stays visible, the editor never disappears, and scrolling follows gestures without jitter. Include multiline Notes and switching back to earlier lines. Rotate portrait↔landscape with an unsaved draft and check focus/value retention, then dismiss the keyboard and reach Save/Cancel/Close. Repeat in availability and manual-session editors with native date/time pickers. Verify pinch zoom, top/bottom shade including toolbar/rubber-band transitions, all menu items, restored page position, no overflow and byte-preserved records after Cancel/reload. Record device/OS, exact commit/URL and per-step results. **At that stage this was a candidate remediation. The subsequent physical results below establish acceptance of the specifically tested mobile keyboard behaviors, not an unrestricted device certification.**

### Date/Time correction attempt — automated evidence, physical visual failure

The user physically tested `92991297ab8a84e5d34590c274c78fdc605ab12e` and reported **all eight targeted Safari keyboard checks passed**. Keyboard focus/visibility, scrolling, rotation, form persistence, backdrop and native picker behavior are accepted physical evidence. The remaining report is portrait Time protruding beyond the form and inconsistent Date/Time right-edge spacing in landscape. The prior keyboard-retest requests above describe earlier stages; **do not repeat that remediation or require those eight checks again without a demonstrated regression**.

**Layout cause and diagnostic limits:** `.form-grid` forced two equal columns at every width. In 390×844, its 318px content area minus the 13px gap provided only **152.5px per native control**, including border/padding and 16px native date/time content. Zero-minimum grid tracks and `width: 100%` did not guarantee that iOS's intrinsic/native rendered control content would fit. Border-box sizing and zero input minimum width already existed; they were not missing. Grid labels had no explicit minimum-width reset. Chromium and desktop Linux WebKit did not reproduce the reported iOS painted protrusion: their measured border boxes fit the old columns. The confirmed root constraint is the unconditional fractional-width layout; the exact physical iOS native-painting mechanism cannot be established here. We do not claim a desktop measurement proves the iOS symptom resolved.

**Minimal correction:** the academic editor gains a CSS scope class. Only within the existing mobile editor, its date/time grid uses one full-width column and labels explicitly use `min-width: 0`. Both controls align with other fields in portrait and landscape, rather than trying to squeeze or hide native content. Desktop academic forms, availability/session editors, input appearance, 16px text, padding, box sizing, pinch zoom and the successful document-scrolling/focus/backdrop architecture are unchanged. No scheduling, schema or persistence changes.

Measured horizontal geometry (pixels; form content bounds; both create and edit):

| Viewport | Before: Date / Time widths | After: both widths | After: both left → right |
| -------- | -------------------------- | ------------------ | ------------------------ |
| 390×844  | 152.5 / 152.5              | 318                | 36 → 354                 |
| 844×390  | 315.5 / 315.5              | 644                | 100 → 744                |
| 667×375  | 281 / 281                  | 575                | 46 → 621                 |

Before measurements are from the actual previous production build in Chromium (390px also checked in desktop WebKit). After measurements agree in Chromium and desktop WebKit. The new geometry regression failed on the old row's content-edge alignment (`Date right 188.5`, required content right `354`). This demonstrates the layout correction, not an automated replay of iOS native painting.

**Durable regression:** the existing `mobile.browser.ts` now measures actual date/time bounding rectangles against their own labels and padded form content, requires matching content edges/widths, 16px text, native appearance and no internal horizontal overflow. It focuses, fills, verifies and restores both original values in create/edit forms at all three sizes; it does not hide overflow or disable picker affordances. Existing focus/rotation/record-safety cases remain. All three mobile cases and all 25 integrated planner cases passed. Unit count remains **604/604**; typecheck, lint, build, formatting, clean install and diff checks passed.

Supplemental desktop WebKit create/edit checks also passed at all three sizes using the identical geometry helper. Missing Debian shared libraries were downloaded/extracted only into `/tmp` and provided to the temporary Playwright browser cache; no application/system dependency or repository configuration was changed. The host's global-library preflight was bypassed only for this isolated supplemental launch after supplying the libraries; the actual WebKit browser and controls executed successfully. This is desktop WebKit evidence, **not physical iOS picker/painting acceptance**. The committed browser runner remains Chromium and is not run by hosted CI.

### Final user-confirmed physical Safari outcomes

Device/browser: physical iPhone Safari on user-reported iOS 27. These results are supplied by the user, not performed or inferred by Codex. No additional device model, URL, date or test result is asserted.

On **`92991297ab8a84e5d34590c274c78fdc605ab12e`**, all eight targeted checks passed:

| Check                                                      | Physical result |
| ---------------------------------------------------------- | --------------- |
| Landscape Title input visibility                           | PASS            |
| Estimated work input visibility                            | PASS            |
| Multiline Notes visibility                                 | PASS            |
| Switching fields without dismissing the keyboard           | PASS            |
| Rotation with an unsaved draft                             | PASS            |
| Save/Cancel/Close reachability                             | PASS            |
| Native pickers, pinch zoom, shading and scroll restoration | PASS            |
| Record preservation after cancellation/reload              | PASS            |

These establish functional acceptance of the corrected mobile document-scrolling editor behavior. Earlier keyboard failures and retest requests are historical; do not reopen that architecture without a demonstrated regression.

On **`352a744f356eb7ff84d428230438a9a772463e18`**, the final Date/Time visual retest reported:

| Check                                                           | Physical result               |
| --------------------------------------------------------------- | ----------------------------- |
| Portrait Create                                                 | FAIL — clipping and alignment |
| Landscape Create                                                | FAIL — alignment              |
| Portrait Edit                                                   | FAIL — clipping and alignment |
| Landscape Edit                                                  | FAIL — alignment              |
| Native Date/Time pickers open, accept changes and remain usable | PASS                          |

These visual failures supersede optimistic conclusions drawn from the earlier desktop geometry results. Chromium/desktop WebKit passes remain evidence for their measured environments, not physical iOS visual acceptance. The controls are functional; the failures are not evidence of scheduling, persistence or accepted keyboard behavior failing.

### DT-01 — known visual exception, unresolved

Classification: **Known, non-blocking visual defect proposed for explicit acceptance and deferral to Phase 2.6E.** Native Date and Time controls still paint incorrectly or appear misaligned in physical iPhone Safari. DT-01 is not resolved, and deferral is a maintainer decision, not an automatic waiver.

The target is a reusable native **Date | Time** group with one outer container, central separator and balanced external margins aligned with the Class selector. Keep independently usable native pickers and at least 16px text. Prefer the horizontal composition when adequate measured space exists; allow a paired vertical composition inside the same group when native minimum widths prevent a safe horizontal fit. Never clip or hide picker content to pass a geometry check.

**DT-01 is scheduled for implementation and physical verification in 2.6E — Editors and grouped Date/Time.** The Phase 2.6A design PR specifies the concept; it does not fix the application. Closing DT-01 requires physical Safari create/edit checks in portrait and landscape for containment, alignment, balanced margins and picker use. The next targeted device retest needs only those Date/Time checks unless a separate regression is demonstrated.

## Persistence and adversarial audit

Browser inspection checks the exact persisted keys: `homebase.academic.v1` and `homebase.schedule.v1`. The latter contains only `version`, `planningWindows` and `lockedBlocks`, with exact source-record fields. No generated sessions, scores, available-time calculations, conflicts, unplaced results, expired-lock lists, reference timestamps or UI state are stored. Lock edits preserve academic bytes; successful repeated reloads preserve source bytes and re-derive the same cards when the explicit reference is unchanged.

| Challenge                         | Evidence / remaining uncertainty                                                                                                                                                                                                                                                                                                |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| False success after a failed save | Real scheduling write failure keeps the editor retryable and preserves old sources/cards/reference. **Academic** write failures retain unsaved in-memory edits with a global warning; users must heed that warning before closing the tab. This existing Phase 1 limitation is not schedule-save atomicity.                     |
| Silent removal of unrelated data  | Exact source-key/record checks, academic byte isolation, ID-preserving edits, selected unlock, and existing storage/hook tests. No corrupt-store replacement is permitted through ordinary scheduling actions.                                                                                                                  |
| Double/reduced workload           | Independent 150 = 30 locked + 90 generated + 30 unplaced example; unlock restores automatic work without changing estimates/completion. Existing engine conservation/full-lock properties protect other inputs.                                                                                                                 |
| Stale successive edits            | Two browser edit/save/reload cycles and existing batched-handler/latest-source regressions. Concurrent tabs are not coordinated; single-tab editing is assumed.                                                                                                                                                                 |
| Conflict escape                   | A candidate outside availability produces a visible rejection and zero writes; existing full-plan preflight cases cover commitments, deadlines and workload. Source conflicts produce no scheduled cards.                                                                                                                       |
| Reference drift                   | Opening/cancel/Escape/week navigation do not refresh; explicit Refresh and successful source adoption do. Rejected candidates/failed writes do not adopt. Browser write-crossing preserves exactly one reference.                                                                                                               |
| Reload divergence                 | Same-source/same-reference browser reload comparisons, plus core permutation tests. A real reload captures a new clock reference, so elapsed time may legitimately change the plan.                                                                                                                                             |
| Hidden unfinished work            | Independent urgent/later workload and readable unplaced totals; existing missing/zero/capacity/deadline tests. Conflict UI explicitly states no schedule was generated.                                                                                                                                                         |
| UI/core disagreement              | Real App workflow, exact expected intervals around a commitment, locked/generated distinction and source-created atomic conflict. Existing nine-reason UI tests protect explanations/actions.                                                                                                                                   |
| Corruption overwrite              | All three blocked sources preserve raw bytes and produce zero writes while academic capture remains usable.                                                                                                                                                                                                                     |
| Device assumptions                | Chromium native controls/focus/geometry tested; existing secure-ID fallback regressions reused. The eight specified keyboard checks and native picker usability are user-confirmed on their recorded commits. DT-01 visual alignment remains failed; unreported Safari workflows and managed-device behavior remain unverified. |
| Mocked test illusion              | Primary browser scenario uses real forms, planner and localStorage, with an independently calculated oracle. Only fault scenarios intercept browser boundaries; the clock is controlled explicitly. Composition comparisons alone are treated as wiring evidence, not independent correctness proof.                            |

Historical implementation verification: all local gates passed on the tested implementation head: clean `npm ci`, **604 tests**, typecheck, zero-warning type-aware lint, production build, formatting and `git diff --check`. No lint suppressions or CI changes were introduced. Hosted `CI / verify` must also pass on the review PR's current head; its exact run/head evidence is reported in the PR/completion package. Hosted CI does not run the standalone Chromium cases.

## Broader physical Safari checklist — unreported coverage

The user-confirmed targeted results are recorded above. The broader checklist below is retained as unreported coverage, not a claim that it was passed or a request to repeat the accepted keyboard checklist. Codex performed no physical Safari test. Any future results should identify device/OS, tested commit/URL and per-step outcomes. Use test records and future study times to avoid accidentally creating an elapsed-reference conflict.

1. On personal iPhone Safari, load Weekly View and create an estimated assignment.
2. Add/edit/delete Study availability with native date/time controls; add a commitment and confirm generated sessions avoid it.
3. Confirm recommended sessions and exact unscheduled work are visible and readable.
4. Customize → Lock, then edit the lock; confirm Manual versus Recommended remains clear.
5. Reload and verify availability/manual intent survives and generated work is re-derived.
6. Change a relevant commitment/estimate to create a conflict; confirm no partial schedule, then repair through unlock or the related source editor.
7. Unlock healthy work and confirm regeneration without assignment completion credit.
8. Try Refresh plan, navigation, modal Cancel/Close, touch targets and layout; confirm usable controls and no horizontal overflow.
9. Close/reopen Safari and verify browser-local source data survives in the same profile/origin.

For the iPhone usability fixes, additionally rotate with the menu open and reach Classes in both orientations; open/create/edit each kind of form; focus text/date/time/number controls with the keyboard or picker open; scroll to the first/last fields and Save/Cancel/Close; verify no unintended automatic zoom or unshaded bottom region; dismiss the keyboard; pinch zoom manually; and confirm the page's scroll position and portrait layout after closing/rotating. Chromium cannot conclusively verify Safari automatic focus zoom, native picker/keyboard geometry, browser-toolbar/safe-area animations, rubber-band scrolling, or physical pinch gestures. The eight targeted passes do not imply this entire broader checklist passed. DT-01 remains the specifically demonstrated visual exception; any broader acceptance decision must acknowledge the unreported coverage.

Repeat on managed iPad Safari **if the existing deployed hostname is allowed**. Prior user evidence reported Netlify categorized as Games and GitHub Pages on a global block list; that is environmental evidence, not validation of this head. If still blocked, record exactly: **Environment-blocked — application not loaded; managed-iPad behavior unverified.** No filtering workaround, hosting integration or deployment was attempted in this phase.

## Readiness and limitations

**READY FOR A MAINTAINER MERGE DECISION WITH EXPLICIT DT-01 EXCEPTION**, subject to green hosted CI on this updated head and independent review. Functional acceptance is achieved for the eight specifically tested keyboard behaviors; native Date/Time picker usability also passed on `352a744`. Date/Time clipping/alignment failed physically and remains unresolved. Overall Phase 2 acceptance is conditional on the maintainer accepting DT-01 as a non-blocking visual exception deferred to 2.6E; this record does not declare unconditional Phase 2 completion.

Existing implementation gates passed on `352a744`: 604 unit/integration tests, typecheck, lint, build and formatting, plus the separately run production-browser cases. Hosted [CI / verify on that implementation head](https://github.com/lilant5431/homebase/actions/runs/37842758810) passed. The documentation closure head receives its own CI run, reported in the PR review package. Automated success on either head does not convert the four physical visual failures into passes.

The accepted priority-first greedy algorithm is not globally optimal. No sync, cross-tab coordination, drag-and-drop, progress/historical completion, expired-lock cleanup, force override or backup import/restore UI is added. Clearing site data/private browsing/storage loss can lose local sources; there is no backup download UI. Academic persistence errors require attention to the existing warning. Chromium viewport checks cannot prove physical Safari or managed-device compatibility, all UX quality, or correctness for every possible input. Prior insecure LAN HTTP ID behavior is covered by existing regressions, not reproduced by this loopback browser run.

Next action: **Independent PR #13 review and the maintainer’s explicit acceptance/merge decision with unresolved DT-01 deferred to 2.6E.** After its authorized merge, refresh PR #14 against the new main and update historical dependency references before merging the design specification. No Phase 3 work begins here.
