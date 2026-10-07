import type { Assignment } from './domain'
import {
  generateAssignmentSchedule,
  type ScheduledAssignmentBlock,
  type UnplacedAssignment,
} from './placement'
import type { PriorityReference } from './priority'
import {
  minutesToTime,
  prepareScheduleInputs,
  toScheduleInterval,
  type ScheduleMinuteInterval,
} from './scheduleInputs'
import type { AvailableTimeBlock } from './scheduling'

export type LockedAssignmentBlock = ScheduledAssignmentBlock & { blockId: string }

export type RegeneratedScheduleBlock =
  (ScheduledAssignmentBlock & { source: 'generated' }) | (LockedAssignmentBlock & { source: 'locked' })

type BlockConflictReason =
  | 'assignmentMissing'
  | 'assignmentCompleted'
  | 'missingEstimate'
  | 'zeroEstimate'
  | 'beforeReference'
  | 'outsideAvailability'
  | 'afterDeadline'

export type RegenerationConflict =
  | { reason: BlockConflictReason; blockId: string; assignmentId: string }
  | {
      reason: 'overlapsLockedBlock'
      blockId: string
      assignmentId: string
      conflictingBlockId: string
    }
  | {
      reason: 'lockedTimeExceedsEstimate'
      assignmentId: string
      blockIds: string[]
      lockedMinutes: number
      estimatedMinutes: number
    }

export type ScheduleRegenerationResult =
  | {
      status: 'ok'
      scheduledBlocks: RegeneratedScheduleBlock[]
      unplacedAssignments: UnplacedAssignment[]
    }
  | { status: 'conflict'; conflicts: RegenerationConflict[] }

type LockInterval = ScheduleMinuteInterval & { block: LockedAssignmentBlock }

const compareText = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)

function validateLocks(lockedBlocks: readonly LockedAssignmentBlock[]): LockInterval[] {
  const ids = new Set<string>()
  const locks = lockedBlocks.map((block) => {
    if (typeof block.blockId !== 'string' || block.blockId.length === 0 || ids.has(block.blockId)) {
      throw new RangeError('Lock blockId must be a nonempty unique string')
    }
    if (typeof block.assignmentId !== 'string') throw new RangeError('Lock assignmentId must be a string')
    ids.add(block.blockId)
    return { ...toScheduleInterval(block), block }
  })
  return locks.sort(
    (a, b) => a.start - b.start || a.end - b.end || compareText(a.block.blockId, b.block.blockId),
  )
}

function continuousAvailability(available: readonly ScheduleMinuteInterval[]): ScheduleMinuteInterval[] {
  const continuous: ScheduleMinuteInterval[] = []
  for (const interval of available) {
    const previous = continuous[continuous.length - 1]
    if (previous && previous.date === interval.date && previous.end === interval.start) {
      previous.end = interval.end
    } else {
      continuous.push({ ...interval })
    }
  }
  return continuous
}

function compareConflicts(a: RegenerationConflict, b: RegenerationConflict): number {
  return (
    compareText(a.reason, b.reason) ||
    compareText(a.assignmentId, b.assignmentId) ||
    compareText('blockId' in a ? a.blockId : '', 'blockId' in b ? b.blockId : '') ||
    compareText(
      'conflictingBlockId' in a ? a.conflictingBlockId : '',
      'conflictingBlockId' in b ? b.conflictingBlockId : '',
    )
  )
}

function reserveTime(
  available: readonly ScheduleMinuteInterval[],
  locks: readonly LockInterval[],
): AvailableTimeBlock[] {
  const remaining: AvailableTimeBlock[] = []
  for (const interval of available) {
    let cursor = interval.start
    const append = (start: number, end: number) => {
      if (end > start) {
        remaining.push({
          date: interval.date,
          startTime: minutesToTime(start - interval.dayStart),
          endTime: minutesToTime(end - interval.dayStart),
          durationMinutes: end - start,
        })
      }
    }
    for (const lock of locks) {
      if (lock.start >= interval.end) break
      if (lock.end <= cursor) continue
      append(cursor, Math.max(cursor, lock.start))
      cursor = Math.min(interval.end, lock.end)
      if (cursor === interval.end) break
    }
    append(cursor, interval.end)
  }
  return remaining
}

/**
 * Reserves exact locked intent and its workload, then delegates all remaining
 * placement to Phase 2.3. Structural invalidity throws RangeError before any
 * conflicts are returned. All applicable lock conflicts are reported atomically.
 * Conflicts sort by reason, assignmentId, blockId, then conflictingBlockId in
 * code-unit order. Each overlap pair is reported once, smaller blockId first;
 * excess-work blockIds also sort in code-unit order.
 * Success is chronological, with assignmentId/source/blockId as tie-breaks.
 * No mutation, implicit clock, historical completion inference, or persistence.
 */
export function regenerateAssignmentSchedule(
  assignments: readonly Assignment[],
  availableTimeBlocks: readonly AvailableTimeBlock[],
  lockedBlocks: readonly LockedAssignmentBlock[],
  reference: PriorityReference,
): ScheduleRegenerationResult {
  if (lockedBlocks.length === 0) {
    const result = generateAssignmentSchedule(assignments, availableTimeBlocks, reference)
    return {
      status: 'ok',
      scheduledBlocks: result.scheduledBlocks.map((block) => ({ ...block, source: 'generated' })),
      unplacedAssignments: result.unplacedAssignments,
    }
  }

  const { ranked, referenceMinutes, available } = prepareScheduleInputs(
    assignments,
    availableTimeBlocks,
    reference,
  )
  const locks = validateLocks(lockedBlocks)
  const assignmentsById = new Map<string, Assignment>()
  for (const assignment of assignments) {
    // Lock resolution must not depend on whether duplicate IDs happen to name
    // completed or active work. Domain IDs are stable and unique.
    if (assignmentsById.has(assignment.id))
      throw new RangeError('Assignment IDs must be unique for lock resolution')
    assignmentsById.set(assignment.id, assignment)
  }
  const prioritiesById = new Map(ranked.map((priority) => [priority.assignmentId, priority]))
  const continuous = continuousAvailability(available)
  const conflicts: RegenerationConflict[] = []
  const locksByAssignment = new Map<string, LockInterval[]>()

  for (const lock of locks) {
    const { block } = lock
    const add = (reason: BlockConflictReason) =>
      conflicts.push({ reason, blockId: block.blockId, assignmentId: block.assignmentId })
    const assignment = assignmentsById.get(block.assignmentId)
    if (!assignment) add('assignmentMissing')
    else if (assignment.completed) add('assignmentCompleted')
    else if (assignment.estimatedMinutes === undefined) add('missingEstimate')
    else if (assignment.estimatedMinutes === 0) add('zeroEstimate')

    if (lock.start < referenceMinutes) add('beforeReference')
    if (!continuous.some((window) => window.start <= lock.start && window.end >= lock.end)) {
      add('outsideAvailability')
    }
    const priority = prioritiesById.get(block.assignmentId)
    if (priority && priority.minutesUntilDue > 0 && lock.end > referenceMinutes + priority.minutesUntilDue) {
      add('afterDeadline')
    }
    const group = locksByAssignment.get(block.assignmentId) ?? []
    group.push(lock)
    locksByAssignment.set(block.assignmentId, group)
  }

  for (let index = 0; index < locks.length; index++) {
    const left = locks[index]
    for (let other = index + 1; other < locks.length && locks[other].start < left.end; other++) {
      const right = locks[other]
      const [first, second] =
        compareText(left.block.blockId, right.block.blockId) < 0 ? [left, right] : [right, left]
      conflicts.push({
        reason: 'overlapsLockedBlock',
        blockId: first.block.blockId,
        assignmentId: first.block.assignmentId,
        conflictingBlockId: second.block.blockId,
      })
    }
  }

  const reservedMinutes = new Map<string, number>()
  for (const [assignmentId, group] of locksByAssignment) {
    const assignment = assignmentsById.get(assignmentId)
    if (
      !assignment ||
      assignment.completed ||
      assignment.estimatedMinutes === undefined ||
      assignment.estimatedMinutes === 0
    )
      continue
    const lockedMinutes = group.reduce((sum, lock) => sum + lock.block.durationMinutes, 0)
    reservedMinutes.set(assignmentId, lockedMinutes)
    if (lockedMinutes > assignment.estimatedMinutes) {
      conflicts.push({
        reason: 'lockedTimeExceedsEstimate',
        assignmentId,
        blockIds: group.map((lock) => lock.block.blockId).sort(compareText),
        lockedMinutes,
        estimatedMinutes: assignment.estimatedMinutes,
      })
    }
  }
  if (conflicts.length > 0) return { status: 'conflict', conflicts: conflicts.sort(compareConflicts) }

  const remainingAssignments: Assignment[] = []
  for (const assignment of assignments) {
    const reserved = reservedMinutes.get(assignment.id) ?? 0
    if (reserved === 0) remainingAssignments.push(assignment)
    else if (assignment.estimatedMinutes! > reserved) {
      remainingAssignments.push({ ...assignment, estimatedMinutes: assignment.estimatedMinutes! - reserved })
    }
    // Fully locked work is excluded, not passed to placement as a zero estimate.
  }
  const generated = generateAssignmentSchedule(remainingAssignments, reserveTime(available, locks), reference)
  const scheduledBlocks: RegeneratedScheduleBlock[] = [
    ...locks.map(({ block }) => ({ ...block, source: 'locked' as const })),
    ...generated.scheduledBlocks.map((block) => ({ ...block, source: 'generated' as const })),
  ]
  scheduledBlocks.sort(
    (a, b) =>
      compareText(a.date, b.date) ||
      compareText(a.startTime, b.startTime) ||
      compareText(a.assignmentId, b.assignmentId) ||
      compareText(a.source, b.source) ||
      compareText(a.source === 'locked' ? a.blockId : '', b.source === 'locked' ? b.blockId : ''),
  )
  return { status: 'ok', scheduledBlocks, unplacedAssignments: generated.unplacedAssignments }
}
