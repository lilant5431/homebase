# ADR 0002: Separate scheduling persistence and derived schedule output

Status: Proposed for independent review with Phase 2.5A

## Context

Academic source data already lives in `homebase.academic.v1`. Planning windows and locked assignment blocks introduce durable user intent. Generated schedules become stale when assignments, commitments, planning windows, locks, or reference time change. Keeping generated recommendations as another authoritative store would complicate recovery and consistency.

## Decision

Keep `AcademicData.version = 1` and its existing store unchanged. Introduce `homebase.schedule.v1` with its own version 1 schema, containing only identified same-day planning windows and Phase 2.4 locked blocks. Recompute availability, priority, generated blocks, conflicts, and unplaced work; never persist them or reference time.

Validate schedule structure strictly, including nested records and unique IDs. Reject unknown fields rather than silently stripping potential user data. Retain structurally valid but infeasible locks; regeneration owns feasibility. Loads are read-only and distinguish absence, invalid data, unsupported version, and unavailable storage. Invalid saves throw before writing; browser write failures report false.

Use a pure version-1 combined backup envelope with caller-supplied `exportedAt`, independent academic/schedule versions, and independent copies of supported source data. No download, import, restore, or implicit clock is introduced.

A versioned store is never silently interpreted as another schema version. Future schema changes require a new versioned key or an explicit tested migration with preservation/recovery safeguards. There is no v1-to-v2 migration to implement now.

## Alternatives considered

- **AcademicData version 2:** unnecessary academic migration and coupling; separate intent fits an independent store.
- **Complete generated schedules:** stale derived state becomes a second source of truth; rejected.
- **Locks as commitments:** loses assignment/workload semantics and conflates intent with fixed obligations; rejected.
- **Silent corruption reset:** hides recoverable data and risks replacement; rejected in favor of explicit load states.
- **Generic migration machinery now:** no migration exists; deferred until a concrete version change.

## Consequences and revisit conditions

Failure isolation improves and no academic migration is required. Later UI must coordinate the two stores, surface invalid storage visibly, and avoid treating failed loads as permission to initialize. The backup joins modules without merging schemas. Valid explicit saves replace the schedule store; callers must deliberately authorize recovery/overwrite flows after failed loads. localStorage provides no transaction across the two stores or synchronization between tabs/devices.

Academic backup input follows the existing typed AcademicData contract; this phase does not strengthen the academic parser or implement a restore validator. Revisit for persistence-version changes, recovery/import UX, cross-store transactions, progress tracking, recurrence, or sync. Future sync must respect separate module ownership.
