# Screen inventory and layout specifications

Current integrated baseline: main `580b25f69a724a5e0c54e15927e05eafcda6d887` (PR #13 merged). The original inventory started at historical main `b710ea0`; it is reconciled here with the integrated Safari implementation: [App](../../../src/App.tsx), [AcademicUI](../../../src/AcademicUI.tsx), [WeeklyPlanner](../../../src/WeeklyPlanner.tsx), [EditorModal](../../../src/EditorModal.tsx), [availability editor](../../../src/PlanningWindowModal.tsx), [session editor](../../../src/LockedSessionModal.tsx), [messages](../../../src/plannerMessages.ts), [CSS](../../../src/styles.css). Historical snapshots and current acceptance evidence are distinguished in [01](01-design-vision.md). The shared [ModalBackdrop](../../../src/ModalBackdrop.tsx) and browser acceptance runners are now part of main. Recommendations below are future presentation work, not assertions that the redesign exists.

## Final appearance overlay (all existing screens)

The [six-appearance V6 reference](07-v6-visual-reference.md) governs skin, not content hierarchy. Every screen below uses the same component geometry/data ordering in Lattice, Landscape and Basic with either semantic palette. “Solid” in the inventory means the default/protected content treatment; only validated noncritical panel backgrounds may opt into Frosted under [02](02-design-system.md). Editors, errors, conflicts and semantic session plates stay solid. Environment decoration lives behind the workspace, not inside row text; it must not push controls, obscure focus or change any responsive breakpoint. The old atlas is historical anatomy evidence, not the final appearance.

Shared interaction lighting responds to accepted native click/keyboard/touch activation without delaying navigation/actions. Operation success and failure are separate real-result states; see [04](04-motion-and-interaction.md). No production “Play light cue” control, demo presets, speed slider or technical source-comparison selector is proposed.

## Shared hierarchy and navigation

One page h1 identifies location. A nearby subtitle explains the screen's purpose, not decoration. Header right contains one labeled primary action; contextual secondary actions follow. Metadata appears below its title; critical notices precede ordinary content. Every screen includes a visible next action or explains why an action is unavailable.

Keep the six destinations: Overview, Weekly Planner (presentation rename of Weekly view), Assignments, Assessments, Commitments, Classes. Preserve existing internal view keys. Appearance is a new utility destination under navigation, not a new academic module. Do not invent account/profile, sync, search or inbox behavior. A global New assignment action remains available; avoid duplicate prominent buttons when the page's primary action already adds an assignment. Destructive actions remain secondary and confirm consequences.

## Actual inventory and proposed changes

### Shell and navigation — App

- **Purpose/action:** move between six local views; open global New assignment; expand/close mobile menu.
- **Primary/secondary:** destination title and active link / current date, brand and generic encouragement. Current sidebar includes decorative guidance; top bar includes breadcrumb.
- **States:** active view, menu open/closed, academic save-failure alert. Views are local state, not separate URL routes. No account, appearance control, search or async page loader exists.
- **Problem → change:** redundant greetings/eyebrows and decorative sidebar space compete with content. Use one compact header and stable navigation; replace encouragement with Appearance utility. Preserve reachability of all links in short heights. Label the active destination and use `aria-current`.
- **Responsive:** wide rail, compact header/menu as below; menu scrolls vertically, close reachable, Escape and focus return. No hover-only navigation.
- **Appearance/dependencies:** nav glass plus opaque active marker; all six appearances identical order. AppShell, NavigationItem, PageHeader, Button, Notice. PR #13 drawer reachability and short-height scrolling are integrated baseline behavior; preserve their existing regression coverage.

### Overview — App + Stat / AssignmentRow / QuickAction

- **Purpose/action:** understand open work and upcoming dates; add, complete or edit work; open Weekly Planner.
- **Primary/secondary:** open assignments sorted by deadline (first five), due-soon count (next seven days **plus overdue**) / upcoming assessments, known estimated minutes, first four assessment/commitment horizon items, four Quick add actions.
- **States:** no classes/work welcome, genuinely empty sample option with guarded confirmation, no open assignments, no future horizon, overdue/due-today, missing estimates, academic save failure. A commitments-only planner is not sample-eligible.
- **Problem → change:** oversized greeting and four equal metrics dilute the actionable list. Compact title/date, horizontal metric strip, dominant Assignments ahead, smaller On the horizon, compact Quick add. Label estimate as “Known estimated work” so missing estimates are not misread as zero. Keep current counts/sorts; do not claim this is priority-ranked or a feasibility forecast.
- **Responsive:** wide 2:1 content split; tablet two panels when content fits; phones/short landscape assignments first, horizon second, Quick add last. Metric strip wraps into two columns; no horizontal page scroller.
- **Appearance/dependencies:** solid panels; action blue/ice blue, status text/icon; no hero illustration inside academic content; decoration remains behind the workspace. Stat, RecordRow, EmptyState, StatusBadge, PageHeader. Atlas overview uses this hierarchy.

### Weekly Planner — WeeklyPlanner + planner hook

- **Purpose/action:** inspect deadlines/fixed time/recommendations; edit availability, customize locks, repair conflicts, Refresh plan.
- **Primary/secondary:** week and day headings, explicit session times/source, actionable conflicts/unplaced work / plan reference, saved availability, expired-lock note. Current layout has availability above notices/day grid, seven days with event groups; it is **not a proportional hour timeline**.
- **States:** ok, no availability, no events, no schedulable estimate, unplaced work, conflict with no generated schedule, invalid input error, blocked schedule store, save/candidate failure, retained past locks. Reference is stable until the existing refresh/source-adoption rules update it; week navigation does not refresh it.
- **Problem → change:** controls and warnings span a long page before the week becomes legible. Header: week navigation + Refresh plan and reference. Then persistent blocking/conflict notice, then Unscheduled work, then agenda. Put Study availability in a separate region after the wide-screen agenda or a labeled expandable region on compact screens (summary shows how many windows exist; expansion is UI-only). Keep Add commitment accessible. Do not label availability as guaranteed remaining capacity.
- **Responsive:** seven day columns only at ≥1200px; 2-column day cards at medium widths with sufficient height; chronological single-column agenda on phones and short landscape. Each day has Due, Assessments, Commitments, Study subgroups; explicit times, no fabricated hour scaling. All seven days remain reachable through document scroll; optional day anchors must not trap focus.
- **Appearance/dependencies:** solid events; source labels and differentiated marker shapes below. WeekToolbar, AvailabilityList, StudyCard, RecordRow, Notice, ConflictPanel, EditorShell. Same data ordering/oracles across all six appearances.

### Classes — App class-grid

- **Purpose/action:** organize courses; create/edit/delete a class.
- **Primary/secondary:** class name / open assignment count, assessment count and chosen color.
- **States:** empty, populated, edit, delete confirmation. Current deletion cascades to class assignments and assessments; no separate class-detail route exists.
- **Problem → change:** icon-only deletion can hide consequence. Use labeled overflow actions or visible Edit/Delete; confirmation names the class and affected records. Keep current cascade semantics. Cards can grow for long names.
- **Responsive:** 3 cards wide, 2 tablet, 1 phone/short height; actions remain 44px.
- **Appearance/dependencies:** solid ClassCard; neutral text with decorative subject dot rather than white text over an arbitrary saved color; Button, EmptyState, Confirmation, EditorShell.

### Assignments — App + ManagedAssignment

- **Purpose/action:** capture/edit/delete work; toggle complete/reopen.
- **Primary/secondary:** title and deadline/status / class, optional estimate and notes through the editor. Current active list is deadline-ordered; completed is a separate section. Missing time means end-of-day in ordering; missing estimate is not assigned a default.
- **States:** empty, overdue/today/future, completed, missing estimate, missing class fallback, save failure, deletion confirmation.
- **Problem → change:** compressed metadata/actions can be hard to scan. Use a consistent row with explicit completion control, title and wrapped metadata; show Edit and Delete independently. Completed remains reachable, optionally disclosed with count. Preserve ordering and completion behavior.
- **Responsive:** wide rows, phone stacked rows with controls below metadata. “Detail” in this design means the existing edit form; no new detail route or read-only selection store. Atlas covers list plus the editor specimen.
- **Appearance/dependencies:** solid RecordRow, subject dot/name, Due/Completed badges, CompletionControl, EditorShell, Notice. Completed text remains readable; no low-opacity entire row.

### Assessments — App + ManagedRow

- **Purpose/action:** create/edit/delete an academic event.
- **Primary/secondary:** title/date / class, optional time, kind (Test/Quiz/Project/Other), notes in editor.
- **States:** empty/populated, past/future records, optional time, class removed fallback, invalid form, save failure.
- **Problem → change:** assessment type and date should not compete with edit/delete icons. Use type label + date metadata; retain date ordering and access to past items. No completion or preparation-scheduling control is added.
- **Responsive:** same row/card pattern as assignments; no new filters required.
- **Appearance/dependencies:** solid rows, neutral type icon/text; RecordRow, EmptyState, DateTimeGroup, EditorShell.

### Commitments — App + ManagedRow

- **Purpose/action:** capture fixed obligations; edit/delete them.
- **Primary/secondary:** title and date/start/end / notes or “Fixed commitment”. Current order is date/start time.
- **States:** empty, overlapping records (allowed as source constraints), invalid same-day interval, save failure, confirmation.
- **Problem → change:** distinguish fixed time from suggested study. Use calendar icon + “Commitment”; display both times and date. Do not offer Complete, lock or drag-to-reschedule semantics.
- **Responsive:** same rows; editor date/start group and separate end time with explicit labels; never compress three native controls into a phone row.
- **Appearance/dependencies:** neutral solid band and calendar marker; RecordRow, DateTimeGroup, Field, EditorShell.

### Study availability — WeeklyPlanner + PlanningWindowModal

- **Purpose/action:** add/edit/delete explicitly supplied study windows by date.
- **Primary/secondary:** date/start/end / explanatory text about study opportunity; no automatic daily hours or recurrence exists.
- **States:** no windows in visible week, multiple windows, blocked storage, invalid same-day bounds, ID failure, failed save retained for retry, confirmation before delete.
- **Problem → change:** seven Add time controls take vertical space before sessions. Use day-based compact list or disclosed region; button says Add study time. Do not imply a saved window is free of commitments; existing engine subtracts those later.
- **Responsive:** wide region below the agenda, compact disclosure in flow. Date and time-range fields follow DT-01 measured-fit rules without changing validation.
- **Appearance/dependencies:** solid FieldGroup/AvailabilityRow/EditorShell/Notice. Error stays in open form; no false saved toast.

### Recommended and manual sessions — WeeklyPlanner + LockedSessionModal

- **Purpose/action:** open assignment, Customize/Lock recommendation, edit or unlock manual intent.
- **Primary/secondary:** assignment + actual interval + Manual/Recommended / class and duration; lock editor also exposes related assignment editing and computed duration.
- **States:** recommended, locked, valid/invalid draft, no-op edit, candidate conflicts, save failure, source conflict, expired lock retained. Generated work is not persisted; lock is not completion credit.
- **Problem → change:** source can be lost among type/color cues. Recommended = spark/outline marker + word; Manual = lock/solid marker + word. Keep assignment details click target separate from Customize/Edit/Unlock; no nested buttons. Unlock confirmation explains possible regeneration at the same time and no completion credit.
- **Responsive:** controls always visible, wrap to second row, never hover-only; editor uses accepted mobile document flow.
- **Appearance/dependencies:** StudyCard, SourceBadge, Button, EditorShell, Notice; lock accent uses action, not danger. No drag-and-drop/progress field introduced.

### Conflicts and unplaced work — WeeklyPlanner + plannerMessages

- **Purpose/action:** explain why intent cannot be honored and present existing repair actions.
- **Primary/secondary:** consequence “No study schedule generated”, exact reason and affected session / assignment, date/time and locked-versus-estimated minutes where supplied. Unplaced work instead shows remaining minutes/reason while valid scheduled blocks remain visible.
- **States:** nine conflict reasons; four unplaced reasons; multiple conflicts deduplicated into applicable actions; save failure during repair. These are not interchangeable severity states.
- **Problem → change:** long alert text can obscure the repair. Use a solid panel with title, one consequence sentence, per-reason rows and actions. Retain `conflictAllowsAssignmentEdit` policy: related assignment editing for completed/missing estimate/zero estimate/after deadline/excess workload; unlock referenced locks. Deleted assignment is not given a nonexistent Edit button. Outside availability explains commitments/window capacity; user can separately open availability or commitment management, without inventing force placement.
- **Responsive:** above agenda in every layout; controls wrap, no auto-dismiss or pulsing. On conflict show academic/fixed items but no generated study schedule. Missing/zero estimates link to assignment editing; insufficient time states retain exact remaining minutes.
- **Appearance/dependencies:** danger ConflictPanel versus warning UnplacedPanel, icons and words, Button/Notice. Preserve the nine reason codes and four unplaced reasons listed in [05](05-technical-handoff.md).

### Create/edit forms and confirmations

- **Purpose/action:** edit the actual entity fields and save/cancel. Class: name/color. Assignment: title/class/due date/optional time/optional positive whole-minute estimate/notes. Assessment: title/class/kind/date/optional time/notes. Commitment: title/date/start/end/notes. Availability: date/start/end. Manual session: date/start/end and derived duration.
- **States:** new/edit, required/native validation, missing class precondition, inline error, ID generation failure, save rejection/retry, cancel/close, delete/unlock confirmation. Assignment/assessment creation without classes currently opens the class editor; explain that prerequisite without promising automatic continuation that does not exist.
- **Problem → change:** DT-01 remains unresolved; labels/metadata compete. Main already contains the accepted Safari document-scrolling editor. Consolidate Field and EditorShell anatomy while preserving that integrated lifecycle; do not introduce a new scrolling mechanism. The group proposal is specified in [05](05-technical-handoff.md). Keep value formats and validators unchanged. Academic save failure currently closes the editor with unsaved in-memory changes plus a global warning; do not falsely present schedule-save atomicity as its behavior or silently redesign that contract in 2.6.
- **Responsive:** desktop solid dialog, compact document editor with title and in-flow footer; 16px inputs; no sticky footer or blur ancestor; no autofocus text keyboard. Lock editor preserves its tested keyboard interactions. Desktop dialog focus trap and mobile background isolation must be preserved against the actual integrated ModalBackdrop lifecycle and tests.
- **Appearance/dependencies:** solid EditorShell, Field, DateTimeGroup, Button, InlineError; native color-scheme follows appearance. Cancel does not persist or refresh the plan.

### Cross-cutting absence/failure and proposed Appearance

There is no remote loading process, skeleton screen or network synchronization status in the current app. Do not add simulated loading. Academic load failures currently fall back to empty data; stronger validation/recovery is a separate task. Academic save failure is a global persistent alert. Schedule loads explicitly distinguish empty/ok/invalid/unsupportedVersion/unavailable and block scheduling edits when unsafe. Invalid planner input shows “Study plan unavailable” while academic management remains possible. Backup serialization exists in `backup.ts`, but **no export/import UI exists**.

Appearance is proposed, not inventoried functionality: a short utility page with independent Environment (Lattice default / Landscape / Basic), Palette (System default / Light / Dark), Content material (Solid default / Frosted), Reduce visual effects and Reduce motion (can add reduction, never override an OS reduction). Changes apply immediately with a persistence notice if needed; no Save button or academic writes. Wide: narrow settings column with six-appearance preview; compact: same controls in flow. RadioGroup, Switch, Notice and appearance tokens are its only dependencies.

## Responsive layout contract

| Reference | Navigation / toolbar                                                                | Main layout / order                                                            | Scrolling and editors                                                                                        |
| --------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| 1440×900  | 216px rail; stable header; contextual actions labeled                               | Overview 2:1; week seven days with separate availability region; class grid 3  | Document scroll; menu/editor only bounded when desktop dialog fits                                           |
| 820×1180  | Header + full labeled menu; no permanent rail                                       | Overview panels wrap; week two-column day cards; class grid 2                  | Document scroll; mobile editor mode inherited from ≤950px policy                                             |
| 390×844   | Compact header, Menu + current title + context Add; all destinations in drawer      | Single-column priority order; 2-column metrics; day agenda; full-width records | Native document editor, in-flow actions; DateTimeGroup safe stacked fallback if horizontal minima cannot fit |
| 844×390   | Short-height rule takes precedence over tablet-width grid; compact nonsticky header | Single-column agenda; toolbar wraps into two rows, reference stays readable    | No persistent bottom toolbar; drawer scrolls, editor keeps document scrolling                                |
| 667×375   | Same short-height behavior                                                          | Single column; no clipped action row or hidden Classes                         | Safe-area gutters; keyboard/picker owns usable viewport; no fixed editor sizing                              |

Thresholds are layout policy, not device sniffing: rail/seven days ≥1200px; medium 601–1199px when height >500px; single column ≤600px **or** height ≤500px. Keep PR #13's editor threshold ≤950px unless separately reviewed evidence justifies change. At 320px and 200%/400% zoom all text/actions reflow; exceptions for two-dimensional content are not used to excuse a horizontally overflowing phone planner. Use actual container width for native-field grouping. Glass/off effects must not change any geometry.
