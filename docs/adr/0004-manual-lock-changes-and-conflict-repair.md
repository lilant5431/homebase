# 0004 — Manual lock changes and conflict repair

Status: Proposed for independent review with Phase 2.5C

## Context

The pure planner already reserves locked workload and time. Users now need to turn recommendations into manual intent and repair stale intent without silently violating their choices. Browser writes can fail, and recapturing time after preflight could immediately invalidate an otherwise valid session.

## Decision

Represent manual intent only through existing v1 `LockedAssignmentBlock` records. Construct intervals in a pure lock-change boundary using shared scheduler validation; new IDs come from centralized `newId()` in the UI persistence boundary, while edits retain identity.

Healthy schedules permit creation/editing. Every candidate is checked by `buildAcademicPlan` against the entire source schedule before saving. Newly submitted elapsed sessions are rejected rather than exploiting the planner's exclusion of existing expired intent. Capture one caller reference, use it for preflight, save source data, then adopt that source and **the same reference** only on write success. Form errors, conflicts, and failed writes leave the previous source/reference authoritative.

Conflicted schedules permit incremental unlock repair and editing related academic/source data, but no arbitrary lock creation/editing. Unlock saves removal of one identified source lock even when unrelated conflicts remain, then recomputes. It neither deletes assignments nor grants completion credit. Generated output, reference, and conflict state remain derived and are never persisted. Existing elapsed locks remain stored without work credit; this phase provides no past-lock cleanup UI.

No schema/version changes, migration, or new scheduling policy are needed. Existing engine and storage contracts remain authoritative.

## Alternatives considered

- Save structurally valid edits while conflicted: could worsen unrelated conflicts or require an additional conflict-delta policy.
- Require every unlock to produce a healthy plan: prevents incremental repair of independent conflicts.
- Capture time again after saving: creates a preflight/adoption race at minute boundaries.
- Persist generated recommendations or treat manual sessions as commitments: blurs intent/derived state or loses assignment workload accounting.
- Automatically delete elapsed intent or infer completed study: invents unsupported historical progress.

## Consequences

User intent is predictable and saves are atomic at the browser-write boundary. Full candidate recomputation adds modest calculation cost. Users must resolve existing conflicts before moving/resizing locks; automatic regeneration may recommend the same slot after unlock. Local browser persistence still has no cross-tab concurrency or synchronization guarantees.

## Revisit conditions

Revisit when actual usage requires conflict-delta editing, past-session history/progress, multi-device or cross-tab concurrency, or a persisted-schema change. Those need separate acceptance and migration decisions.
