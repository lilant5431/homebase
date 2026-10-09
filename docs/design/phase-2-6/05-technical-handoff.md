# Technical handoff and protected boundaries

This is an implementation proposal. No listed component, preference store or bootstrap is installed by 2.6A. Main remains `b710ea0`; PR #13 remains an explicit dependency for editor/Safari behavior. [Milestone gates](06-acceptance-and-milestones.md) control when implementation may begin.

## Component and CSS boundaries

| Proposed presentation boundary          | Current responsibility to retain                                      | Implementation guidance                                                                                                                                                                                |
| --------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AppShell / Navigation / PageHeader      | App's view selection and global create action                         | Preserve internal view keys; no router needed for a visual redesign. App and planner hook remain mounted on theme/navigation changes.                                                                  |
| AcademicUI primitives                   | Stat, rows, empty states and actions                                  | Refine existing components first; do not build a general-purpose UI framework. Completion/edit/delete remain separate controls.                                                                        |
| WeeklyPlanner presentation              | Day grouping, availability, unplaced work, conflicts, session editors | Extract small presentational panels if necessary, passing current results/handlers. Never recompute priority or placement in a card.                                                                   |
| EditorShell                             | Shared close/focus/body/scroll lifecycle from accepted PR #13         | Integrate only after acceptance or a reviewed equivalent. Retain body portal + document-flow mobile mode, safe-area padding, native focus scrolling, close restoration. No new VisualViewport manager. |
| Field / DateTimeGroup                   | Existing field values, required/optional semantics, native controls   | Grouping changes DOM/CSS only; submit the same names and values to current validators. No date/time library.                                                                                           |
| AppearanceBoundary / AppearanceSettings | New appearance-only preference                                        | Root data attributes and CSS variables; no academic state/store imports. Radio group and independent reduction preferences.                                                                            |

Current CSS is one large `src/styles.css`, with repeated raw colors, typography, media rules and later planner/session sections. Proposed extraction is incremental: `styles/tokens.css` (theme roles), `styles/base.css` (typography/focus), `styles/shell.css`, `styles/components.css`, and narrowly scoped planner/editor rules only when useful. Don't rename every selector in one pass. Avoid specificity wars, global `input` appearance resets, broad `overflow: hidden`, theme-dependent DOM branches and opacity on entire cards.

Keep APP_CONFIG identity consumption. Reuse existing fonts, Lucide icons and native controls. No added CSS framework, animation engine, picker package or state library is justified. Atlas HTML/CSS stays documentation-only; do not copy its illustrative fixed reference frames into product layout.

## Appearance state and first paint

New, separate key: **`homebase.appearance.v1`**. Candidate value:

```json
{ "version": 1, "mode": "system", "effects": "system", "motion": "system" }
```

`mode` is `system | light | dark`; `effects` and `motion` are `system | reduced`. Missing/unsupported/malformed preference falls back to defaults in memory; do not automatically rewrite or delete malformed data. An explicit user selection may replace only this appearance key. Never call localStorage.clear(). This is not an AcademicData or ScheduleData schema change.

Precedence is deterministic:

1. Valid explicit Light/Dark overrides the OS for palette only.
2. System follows `(prefers-color-scheme: dark)` and live changes; otherwise Light.
3. No matchMedia capability → Light for System; explicit override still works.
4. Motion reduction is OS reduce OR explicit reduce. Effects reduction is OS reduced transparency OR explicit reduce; forced colors also forces solid materials.
5. Unsupported reduced-transparency query is “not reported,” not proof that the user prefers glass. Provide the explicit Reduce visual effects control in every browser.

Before first visible content, a small synchronous bootstrap in `index.html` head reads/validates **only** the appearance key in try/catch, resolves supported media queries and sets `data-theme`, reduction attributes and root `color-scheme: light` or `dark`. Put it before theme styles and the module mount; do not wait for React effects, fetches or a font. Meta `color-scheme` advertises `light dark`; CSS includes a System media-query fallback. Don't hide the entire page while resolving appearance. If CSP is introduced later, authorize the bootstrap with a build hash or nonce; never weaken CSP to run it.

Keep the resolver tiny and testable. One pure resolver defines valid inputs/precedence; generated bootstrap or a parity test ensures head and React behavior cannot diverge. AppearanceBoundary adopts the resolved root state without remounting App or changing its key. This Vite app has no server hydration today; if SSR is later added, a separate review must align server markup and bootstrap attributes instead of suppressing hydration warnings.

Register palette media-query `change` handling for System mode and reductions independently; clean up listeners. Apply OS changes immediately. Explicit user theme transitions may use the [motion rules](04-motion-and-interaction.md). Storage events for this key can update appearance in other tabs, without adding academic cross-tab synchronization. Invalid external appearance writes are ignored; removal returns to System defaults. A denied read uses defaults; a failed preference write preserves the session choice and shows “Appearance applies to this tab; this browser could not save your preference.” It must not invoke the academic save-error UI, refresh the plan, reset drafts or retry unrelated writes.

The first-paint acceptance includes a saved explicit Light override while OS is Dark, the reverse, blocked storage, invalid preference and live OS changes on Windows, macOS, iOS/iPadOS via standard browser media features. If scripts are blocked, CSS can follow OS but cannot read a saved localStorage override: document that limitation rather than claiming a universal persisted-theme guarantee.

## Browser capabilities and fallbacks

Reviewed 2026-10-08; capability detection and actual supported-browser tests take precedence over version assumptions. Each link is the source for the stated support/design boundary.

| Capability                                                                                                                                                                | Support guidance                                                                                     | Required fallback                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| [prefers-color-scheme](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme)                                                                      | Widely available; browser exposes OS/user-agent preference, including desktop and mobile OS settings | System defaults Light when unavailable; explicit selection remains possible                                                |
| [prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)                                                                  | Widely available; observe live reduction                                                             | Manual Reduce motion still works; no essential animation                                                                   |
| [prefers-reduced-transparency](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-transparency)                                                      | Limited/experimental support; not reliable on every Safari/browser combination                       | Explicit reduced-effects preference; opaque surfaces usable everywhere                                                     |
| [color-scheme](https://developer.mozilla.org/en-US/docs/Web/CSS/color-scheme)                                                                                             | Widely available native control/scrollbar appearance hint, not a replacement for app colors          | Styled outer field group stays readable; test browser-native control rendering; preserve native affordances                |
| [backdrop-filter](https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter)                                                                                       | MDN Baseline 2024; older engines may require prefixed support or have costly compositing             | CSS supports check for supported standard/prefixed blur; opaque elevated default; no polyfill                              |
| [View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API)                                                                               | Support differs by method and same-document/cross-document feature                                   | Not adopted initially; if separately justified, feature-detect the exact method and always support immediate state changes |
| [CSS container queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries)                                                               | Use for actual field-group width, not device labels                                                  | Stacked group by default if unavailable; simple media queries handle general shell                                         |
| [Native date](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/date) / [native time](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/time) | UI depends on browser/platform/locale; DOM values remain normalized                                  | Keep visible labeled inputs and existing validation. Do not infer physical picker fit from desktop engine rectangles       |

Forced-colors: system Canvas/CanvasText/ButtonText/Highlight and outlines; no reliance on background tints. At zoom or large text, reflow takes precedence over keeping a toolbar/group in one row. Native viewport units/safe areas provide document sizing and padding, never a guessed keyboard height.

## DT-01 — reusable grouped Date | Time

**Anatomy:** one solid fieldset/outer container aligned exactly with the Class selector's outer edges; visible legend “Deadline” (assignment) or “When” (assessment/commitment); two independently labeled native inputs “Date” and “Time (optional)” as appropriate. A subtle controlBorder separator divides the internal areas. Use an outer 1px controlBorder, radius 8px; external inset 12px, internal gap 8px on each side of separator. Each field retains a ≥44px hit height, 16px text, min-width:0 at every grid/label/input boundary and border-box sizing. Class selector and group share the same parent width and outside margin. No parent clips the native control or its focus ring.

**Preferred horizontal layout:** only when the actual outer group width is ≥25rem (400px at 16px root). Proposed minimum date slot 11rem (176px), time slot 9.5rem (152px), plus 2px outer borders + 24px outside padding + 16px internal spacing + 1px separator = 369px minimum; 400px threshold provides additional headroom. Allocate residual width with date:time ratio 1.15:1. These are conservative starting dimensions, **not a guarantee about iOS's intrinsic picker painting**. Test empty and filled controls, AM/PM and 24h settings, longer localized dates, text zoom and light/dark color-scheme before freezing the threshold.

**Narrow alternative:** below threshold, the **same outer group** becomes two rows separated by a horizontal rule. Date and Time remain related, not two unrelated boxes. At 390px with 16px page gutters, the available group is about 358px; default to this safe paired fallback. In ample-width landscape the group is horizontal. The user's preferred horizontal phone composition remains a research candidate: if physical tests establish both full native controls fit at 358px, revise the threshold with measured evidence; do not shrink text/padding or hide native affordances to force it. Larger browser font settings can trigger stacking even on a wide screen.

**States:** shared outer boundary; individual focus outline remains visible; invalid field uses danger outline + its own error and `aria-invalid`, not coloring both fields indiscriminately. Legend/labels remain visible when empty. Optional time stays empty in storage; do not insert 23:59 into input data. Native appearance remains auto; use color-scheme, not custom pseudo-element suppression. Tab order is Date then Time then next field; group wrapper/separator are not tab stops; Enter follows existing form semantics. Screen reader announces distinct labels and applicable help. RTL mirrors logical padding/order without changing date/time meanings.

**Reuse:** assignment/assessment date + optional time; commitment date + required start with separate required end; availability/manual session date + time-range editor can reuse Field primitives without squeezing three fields into one narrow row. It must preserve all input names and same-day validation. No automatic time rounding, midnight splitting, timezone conversion or custom JS picker.

**Proof required in 2.6E:** measure input, label, group and Class selector edges at 1440×900, 820×1180, 390×844, 844×390 and 667×375, empty/filled/edit states and both themes. No horizontal paint/clipping; both native picker hit areas accessible. Capture actual physical iPhone border/picker observations because bounding rectangles alone previously passed while painting failed. Failure → increase threshold/use paired vertical fallback, not a keyboard architecture rewrite. The atlas contains real native specimen inputs for inspection; their presence is not device acceptance.

## Contracts the redesign must preserve

- `homebase.academic.v1`: version/classes/assignments/assessments/commitments, existing IDs/timestamps and optional fields. `homebase.schedule.v1`: version/planningWindows/lockedBlocks only. Never persist derived sessions, rankings, plan reference, conflicts or completion inference. Appearance has its own key.
- Class cascade deletion, guarded sample initialization, secure-ID fallback, assignment complete/reopen, all entity CRUD, optional estimate/time behavior, local YYYY-MM-DD / HH:mm values and existing manual validators remain unchanged.
- Available-time subtraction, bounded priority scoring, greedy placement and regeneration stay in their current pure modules. No component sorts by an invented priority, moves a lock or changes a deadline.
- Lock intent reserves both workload and capacity; fully locked work is not zero-estimate work; conflicts return no partial schedule. Future deadline/end-of-day and due-now/overdue recovery semantics, conservation and determinism remain intact.
- Conflict reasons: assignmentMissing, assignmentCompleted, missingEstimate, zeroEstimate, beforeReference, outsideAvailability, afterDeadline, overlapsLockedBlock, lockedTimeExceedsEstimate. Unplaced reasons: missingEstimate, zeroEstimate, insufficientAvailableTime, insufficientTimeBeforeDeadline. Keep structured meanings and applicable repair handlers.
- Plan reference remains stable on render, theme change, menu open, editor cancel and week navigation; update only through existing source-adoption/Refresh rules. Retained expired locks are not historical completion.
- Blocked schedule stores are not overwritten. Failed schedule saves/candidate rejection retain source and derived plan; errors remain visible. Academic failed saves retain in-memory edits with the existing warning; do not silently assert atomic rollback.

## Test handoff

Keep all current core/storage/hook/React tests and CI gates. Main has the pre-PR #13 suite; PR #13 adds integrated and mobile acceptance evidence (599 baseline → 604 there). Review actual counts after integration. Add token/state/render tests that protect behavior rather than CSS snapshots. Capture academic and schedule bytes before/after theme changes, preference storage faults, editor cancel and navigation. Verify identical schedule/reference outputs across both themes for fixed inputs.

Browser matrix includes the five reference sizes, 320px reflow, 200%/400% zoom, keyboard-only, reduced preferences, forced colors and native input schemes. Automated Chromium and desktop WebKit are complementary; neither proves iOS keyboard/native paint. Carry forward the real-browser capture/lock/edit/conflict/reload/failure scenarios from accepted PR #13 without weakening assertions. Add first-paint and live-theme tests, valid/invalid preference tests, DateTimeGroup geometry and actual physical picker checks. No new hydration, analytics or network dependencies belong to these tests.

## Showcase integration boundary

[Materials & Motion](assets/mockups.html#materials-motion) uses a documentation-only stylesheet and native buttons without JavaScript handlers. It imports no application modules, writes no storage and loads no remote assets. Explicit state classes render hover/focus/press/disabled examples; future components must use real state/semantics instead. Storyboards are static and do not run the lock/save engine. Avoid importing this specimen stylesheet into product code: adapt its documented recipes to the semantic components in the authorized milestone.

**DT-01 is scheduled for implementation and physical verification in 2.6E — Editors and grouped Date/Time.** 2.6C remains shell/navigation. Preferred horizontal native grouping and paired vertical fallback are unchanged; the failed physical `352a744` visual retest cannot be closed by these mockups.
