# ADR 0003: Planner orchestration, explicit reference time, and expired lock intent

Status: Proposed for independent review with Phase 2.5B

## Context

The pure Phase 2 engines require an explicit date/minute reference. Weekly View now needs a usable current recommendation without introducing hidden time or storage dependencies. Persisted lock intent can outlive its intended session, but Homebase has no historical completion/progress model.

## Decision

`buildAcademicPlan(academic, schedule, reference)` is the single pure composition boundary: derive available time with Phase 2.1, classify elapsed locks, then call Phase 2.4 regeneration (which delegates ranking/placement). React manages state, persistence, and presentation without duplicating scheduling policy. Structural failures remain errors in core and become a scheduling-specific failure at the UI boundary.

Locks ending at or before reference are expired, returned separately, and excluded from regeneration. They remain persisted and earn no workload or completion credit. Incomplete work may be scheduled again in full. Crossing-reference locks stay active and retain Phase 2.4 `beforeReference` conflicts without clipping. Future locks retain exact time/workload reservation and atomic conflict behavior.

Capture local reference once on bootstrap, outside StrictMode rendering, and pass it to the app. Advance it only after a successful academic or schedule-source save, or explicit Refresh plan. No timer, render, or week navigation advances it. `referenceFromDate` converts an explicit caller Date; core reads no current clock. Generated output remains derived, never persisted.

Schedule loads that are invalid, unsupported, or unavailable block edits and writes without initializing replacement state. Ready loads do not immediately write empty state. Availability changes save first; failed saves retain prior sources, reference, and plan. Academic persistence retains its existing behavior and remains independent.

## Alternatives considered

- **Clock reads in the scheduler / minute-by-minute regeneration:** hidden dependencies and moving plans; rejected for explicit stable reference.
- **Deleting past locks automatically:** destroys user intent; rejected.
- **Crediting past minutes as completed:** infers work without evidence; rejected.
- **Clipping crossing locks:** silently changes intent or assumes partial progress; rejected.
- **Generated snapshots in persistence:** stale second source of truth; rejected.
- **Orchestration directly in React:** obscures testable engine composition and encourages policy duplication; rejected.

## Consequences and revisit conditions

Visible plans stay stable until a successful source change or explicit refresh. Historical intent is retained without false progress, so unfinished work can be rescheduled. The UI labels recommendations, unplaced work, and atomic conflicts and exposes the captured reference. Navigation filters presentation only; planning uses all supplied source dates. Unscheduled work and conflict summaries span all stored availability, not just the visible week.

No recurrence, user lock editing, drag-and-drop, completion inference, backup UI, generated persistence, or sync is introduced. Phase 2.5C will add lock editing/resolution. Revisit with explicit progress tracking, cleanup policies, justified automatic-refresh requirements, or changes to the existing greedy heuristic.
