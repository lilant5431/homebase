# Homebase

Homebase is a local academic planner for classes, assignments, assessments, and fixed commitments.

## Run

Use Node.js 24.19.0, the version verified against the committed dependency lockfile and used in CI.

```sh
npm install
npm run dev
```

Open the URL shown by Vite. Data is stored in this browser's local storage. It persists across reloads in the same browser profile, but is not synchronized or backed up. Avoid clearing site data if you want to keep your plan.

Use **Explore with sample data** on the empty dashboard to try an example plan. Sample data is never loaded automatically.

## Checks

```sh
npm test
npm run typecheck
npm run build
npm run format:check
```

GitHub Actions runs these checks on every pull request and push to `main` using a clean Ubuntu runner. The `CI` workflow installs locked dependencies with `npm ci` on Node.js 24.19.0; a failing check fails its `verify` job.

## Structure

- `src/domain.ts`: academic entities, dates, and data operations.
- `src/scheduling.ts`: pure available-time calculations from explicit planning windows and commitments.
- `src/priority.ts`: deterministic assignment scoring and ranking against an explicit reference.
- `src/placement.ts`: pure assignment placement into supplied available-time blocks.
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

This priority-first, earliest-fit greedy heuristic is not globally optimal: higher-scoring long work can consume time needed by lower-ranked work with an earlier deadline. Conflicts remain visible in unplaced output. Schedule UI, persistence, manual overrides, locking, and regeneration are not implemented.
