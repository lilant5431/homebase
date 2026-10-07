# ADR 0001: Locked assignment intent and deterministic regeneration

Status: Proposed for independent review with Phase 2.4.

## Context

Homebase already calculates availability and ranks/places assignments deterministically. Users need to preserve chosen assignment sessions while automatic placement changes. Those sessions represent future intent, not evidence of completed work. Time reservation alone would duplicate assignment workload; workload reservation alone would double-book time.

## Decision

Represent user intent as `LockedAssignmentBlock` objects with unique, opaque, nonempty block IDs. Preserve every valid block exactly. Validate all structure before feasibility; malformed input throws `RangeError`, while valid but infeasible intent returns a discriminated conflict result containing no schedule. Report all applicable conflicts in canonical order, including each overlapping lock pair once.

For feasible locks, reserve both their time and their assignment minutes. Use the union of adjacent availability for containment, but never bridge a real gap. Subtract locked time while preserving original availability boundaries. Clone partially locked assignments with only the remaining estimate changed, exclude fully locked assignments, then call the existing Phase 2.3 placement engine. Successful output distinguishes locked and generated sources.

Past locks conflict instead of being clipped or credited as completed work. Future deadlines remain binding; due-now/overdue recovery follows existing placement semantics. Manual locks override automatic placement choices, not availability, commitments, deadlines, or other locks. No storage schema or UI changes are part of this decision.

## Alternatives considered

- Preserve the entire previous generated schedule: unnecessarily freezes stale recommendations and conflates user intent with automatic output.
- Silently move invalid locks: violates exact user choices and hides conflicts.
- Treat manual assignment blocks as generic commitments: reserves time but loses assignment identity and workload accounting.
- Regenerate partially despite conflicting locks: permits callers to mistake partial success for honored intent.

## Consequences and tradeoffs

Atomic failure protects intent but requires the caller to resolve conflicts before receiving a new schedule. Reduced estimates intentionally change workload-based priority to reflect unscheduled work. Missing/zero estimates cannot support locks; ordinary unlocked work retains placement behavior. Shared input validation prevents placement/regeneration structural contracts from drifting. All outputs are derived and contain no additional sharing or telemetry.

The underlying priority-first earliest-fit heuristic remains greedy, not globally optimal. Pairwise overlap reporting can produce quadratic conflict output when many locks overlap. IDs and canonical ordering are stable contracts for later UI/persistence; no historical progress is inferred.

## Revisit conditions

Revisit with explicit product requirements for session completion/progress, force overrides, conflict-resolution UX, or evidence that greedy placement needs a feasibility improvement. Before persisting locks or schedules, review schema migration, backups/export, identity stability, and recovery behavior. Revisit conflict enumeration if real lock volumes justify a different reporting strategy.
