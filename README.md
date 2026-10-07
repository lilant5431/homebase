# Homebase

Homebase is a local academic planner for classes, assignments, assessments, and fixed commitments.

## Run

Use Node.js 24.19.0, the version verified against the committed dependency lockfile and used in CI.

```sh
npm install
npm run dev
```

Open the URL shown by Vite. Data is stored in this browser's local storage. It persists across reloads in the same browser profile, but is not synchronized or backed up. Avoid clearing site data if you want to keep your plan.

For mobile Safari LAN development, use Vite's Network URL without experimental feature flags. Entity IDs use native `crypto.randomUUID()` when available, or secure UUID-v4 generation with `crypto.getRandomValues()` on LAN HTTP. A browser without secure randomness is unsupported.

Use **Explore with sample data** on the empty dashboard to try an example plan. Sample data is never loaded automatically.

## Checks

```sh
npm test
npm run typecheck
npm run lint
npm run build
npm run format:check
```

GitHub Actions runs these checks on every pull request and push to `main` using a clean Ubuntu runner. The `CI` workflow installs locked dependencies with `npm ci` on Node.js 24.19.0; a failing check fails its `verify` job. `npm run lint` runs Oxlint with type-aware TypeScript analysis, React Hooks checks, and focused-test protection; errors and warnings both fail verification. Type checking and Prettier remain separate gates.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the Definition of Done, regression-first bug policy, and architectural-decision threshold.

## Structure

- `src/domain.ts`: academic entities, dates, and data operations.
- `src/scheduling.ts`: pure available-time calculations from explicit planning windows and commitments.
- `src/priority.ts`: deterministic assignment scoring and ranking against an explicit reference.
- `src/placement.ts`: pure assignment placement into supplied available-time blocks.
- `src/regeneration.ts`: exact locked intent, workload/time reservation, and deterministic regeneration.
- `src/scheduleInputs.ts`: shared placement/regeneration input validation and calendar-minute conversion.
- `src/storage.ts`: versioned browser persistence.
- `src/App.tsx`: navigation and manual planning screens.
- `src/AcademicUI.tsx`: reusable academic list and card components.
- `src/EditorModal.tsx`: validated create and edit forms.
- `src/config.ts`: product identity.

The application remains local and manual, with no accounts, external connectors, or device synchronization.

## Available-time engine (Phase 2.1)

`calculateAvailableTime(planningWindows, commitments)` returns chronological blocks with `date`, `startTime`, `endTime`, and `durationMinutes`. Windows and commitments use local `YYYY-MM-DD` dates and same-day `HH:mm` times. Overlapping or adjacent windows are treated as a union; merged commitments are subtracted from that union. Inputs are never modified.

Dates are assumed valid. Times must be between `00:00` and `23:59`, with end after start; invalid time intervals throw `RangeError`. Duration measures local clock minutes, without timezone or daylight-saving adjustments. Overnight intervals are not supported.

Planning windows must be supplied by the caller. This module does not infer or persist planning hours and has no UI integration. Its output can be passed to the placement engine.

## Assignment priority engine (Phase 2.2)

`scoreAssignmentPriority(assignment, { date, time })` returns an explainable `AssignmentPriority` or `null` for completed work. `rankAssignmentsByPriority(assignments, reference)` returns incomplete work ordered by score descending, deadline ascending, estimate descending, then assignment ID in ascending code-unit order. Results include the assignment ID, band, minutes until due, total score, deadline points, and workload points; they are never persisted.

Both APIs require an explicit local `YYYY-MM-DD` / `HH:mm` reference and never read the current clock. Calendar-day arithmetic uses 1440 minutes per day, independent of runtime timezone or daylight-saving changes. Missing due times mean `23:59` for scoring only. A deadline exactly at the reference time is due now, not overdue.

Deadline bands use inclusive thresholds: overdue = 100 points; within 6h = 90; 24h = 80; 48h = 70; 3 days = 60; 7 days = 50; 14 days = 35; later = 20. Estimated work adds a bounded boost: missing or 0–30 minutes = 0; over 30 through 60 = 2; over 60 through 120 = 4; over 120 = 6. These tables are centralized in the module. Within a band, total score takes precedence over deadline; equal-score overdue work sorts by earlier deadline without an increasing lateness penalty.

Inputs use valid calendar dates in years 0001–9999, HH:mm times from 00:00–23:59, and finite nonnegative estimates when supplied; invalid active inputs or references throw `RangeError`. Reference validation also applies to empty rankings. Assignment IDs are assumed stable and unique. Missing estimates contribute zero only to workload and the estimate tie-break, without inferring a work duration. This model measures urgency and known workload, not grade impact, subjective importance, difficulty, or schedule feasibility. It performs no placement and has no UI integration.

## Assignment placement engine (Phase 2.3)

`generateAssignmentSchedule(assignments, availableTimeBlocks, reference)` returns an `AssignmentScheduleResult` with chronological `scheduledBlocks` (`assignmentId`, date, start/end time, duration) and priority-ordered `unplacedAssignments`. It calls `rankAssignmentsByPriority` and allocates each active assignment into the earliest remaining eligible time. It consumes Phase 2.1 availability without recomputing commitments, mutating inputs, reading the clock, or persisting results.

Past availability is ignored; blocks crossing the explicit reference are clipped. Future deadlines cap placement, with missing due times interpreted by the priority engine as `23:59`. Due-now and overdue work has no deadline cap so catch-up remains possible. Tasks split only at supplied availability boundaries, including across dates; unused tails remain available to later work. No breaks or session lengths are invented.

Missing and zero estimates consume no time and are reported as `missingEstimate` and `zeroEstimate` (zero has `remainingMinutes: 0`). Partial placement keeps valid scheduled work and reports its exact remainder. `insufficientTimeBeforeDeadline` means a future deadline excluded some still-unused capacity, even if total capacity was also insufficient; otherwise exhausted capacity is reported as `insufficientAvailableTime`. Unknown remaining duration is omitted for missing estimates.

Dates and times follow the priority engine's calendar-minute conventions. Active estimates must be nonnegative safe integers because output uses whole-minute HH:mm precision; invalid estimates, duplicate active assignment IDs, malformed availability dates/times, nonpositive intervals, mismatched duration metadata, and overlapping availability throw `RangeError`. Availability is validated before reference clipping, even with no active work. Adjacent blocks are valid and retain their supplied boundaries. Overnight intervals and `24:00` are unsupported.

This priority-first, earliest-fit greedy heuristic is not globally optimal: higher-scoring long work can consume time needed by lower-ranked work with an earlier deadline. Conflicts remain visible in unplaced output. The placement module has no UI or persistence integration; lock handling is supplied separately by regeneration.

## Locked schedule regeneration (Phase 2.4)

`regenerateAssignmentSchedule(assignments, availableTimeBlocks, lockedBlocks, reference)` returns either `{ status: 'ok', scheduledBlocks, unplacedAssignments }` or `{ status: 'conflict', conflicts }`. Locks have a nonempty unique opaque `blockId` plus assignment ID, date, start/end time, and matching duration. They represent active future intent, not historical completion. Successful blocks have explicit `source: 'locked'` or `source: 'generated'`; every valid lock is preserved exactly.

Regeneration reserves locked time and workload, clones partially locked assignments with their remaining estimates, and calls Phase 2.3 for all remaining work. Fully locked assignments are excluded from placement, so they do not produce `zeroEstimate`. Remaining estimates also determine regenerated priority. Adjacent availability can jointly contain a lock; real gaps remain blocked. Original availability boundaries are preserved for generated splits.

Malformed structure throws `RangeError` under the shared placement input contract, including duplicate/empty block IDs. Assignment IDs must be unique for lock resolution, including completed entries. Structurally valid locks conflict when their assignment is missing/completed, has missing/zero estimates, starts before the reference, falls outside effective availability, overlaps another lock, extends past a future deadline, or exceeds total estimated workload. All applicable conflicts are reported; any conflict prevents the entire regenerated schedule from being returned. Future deadlines use Phase 2.2 interpretation (missing time = `23:59`); due-now/overdue work has no future deadline cap.

Success sorts by date, start, assignment ID, source, then locked block ID. Conflicts sort by reason, assignment ID, block ID, then conflicting block ID, all in ascending code-unit order. Each overlap pair appears once, smaller block ID first; excess-work block ID lists are sorted. No inputs are mutated and no clock is read. With no locks, output exactly matches Phase 2.3 with generated-source tags.

The existing greedy limitation remains. No scheduling UI, persistence, drag-and-drop, progress/completion tracking, force overrides, or sync is provided. See [ADR 0001](docs/adr/0001-locked-schedule-regeneration.md) for the intent/conflict decision and alternatives.

## Scheduling persistence foundation (Phase 2.5A)

`src/scheduleData.ts` defines `ScheduleData` version 1: `planningWindows` (`id`, `date`, `startTime`, `endTime`) and Phase 2.4 `lockedBlocks`. `emptyScheduleData()` returns fresh empty collections; `parseScheduleData(unknown)` strictly validates all records and returns `ok`, `invalid`, or `unsupportedVersion`. IDs are opaque, nonempty, and unique within each collection. Dates/times follow the shared scheduler contract. Unknown fields are rejected. Overlapping windows and structurally valid but infeasible locks are retained; regeneration checks feasibility later.

`src/scheduleStorage.ts` owns **`homebase.schedule.v1`**, independently of unchanged **`homebase.academic.v1`**. `loadScheduleData()` adds `empty` (key absent) and `unavailable` (storage access failure); malformed JSON/schema is `invalid`, never empty. Loads never write, remove, migrate, or repair data. `saveScheduleData(unknown)` validates first, throws `RangeError` for invalid/unsupported caller state, and returns `false` for browser write failures. Explicit valid saves replace schedule state; later recovery UI must decide whether to replace existing invalid data.

Persist only source records and user intent. Available time, priority scores, generated blocks, regeneration/conflict/unplaced results, UI state, and reference time remain derived and non-persistent. A versioned store is never silently interpreted as another schema version; future changes need a new key or an explicit tested migration.

`src/backup.ts` exports `createBackupPayload(academic, schedule, exportedAt)` and `serializeBackup(...)` (formatted deterministic JSON). The independent envelope is `{ backupVersion: 1, exportedAt, academic, schedule }`. The caller supplies the timestamp; core logic reads no current clock or storage. Copies include every supported source field and do not alias mutable inputs. Academic input follows the existing `AcademicData` contract; this is not a new academic validation or restore path.

No scheduling UI/orchestration, recurring windows, generated schedule persistence, backup download UI, import/restore, academic migration, or sync is included. See [ADR 0002](docs/adr/0002-scheduling-persistence-boundary.md).
