import type { Assignment } from './domain'
import type { PriorityReference } from './priority'
import { minutesToTime, prepareScheduleInputs, timeToMinutes } from './scheduleInputs'
import type { AvailableTimeBlock } from './scheduling'

export type ScheduledAssignmentBlock = AvailableTimeBlock & { assignmentId: string }

export type UnplacedAssignment = {
  assignmentId: string
  reason: 'missingEstimate' | 'zeroEstimate' | 'insufficientAvailableTime' | 'insufficientTimeBeforeDeadline'
  remainingMinutes?: number
}

export type AssignmentScheduleResult = {
  scheduledBlocks: ScheduledAssignmentBlock[]
  unplacedAssignments: UnplacedAssignment[]
}

/**
 * Priority-first, earliest-fit placement into supplied availability only.
 * Splits at availability boundaries, clips past time and future deadlines,
 * and reports all remaining work. Due-now/overdue work has no deadline cap.
 * Active estimates must be whole minutes; missing/zero estimates consume none.
 * Invalid reference, active assignment, or availability inputs throw RangeError.
 * Inputs are never mutated, the clock is never read, and results are not persisted.
 */
export function generateAssignmentSchedule(
  assignments: readonly Assignment[],
  availableTimeBlocks: readonly AvailableTimeBlock[],
  reference: PriorityReference,
): AssignmentScheduleResult {
  const { ranked, referenceMinutes, available, assignmentsById } = prepareScheduleInputs(
    assignments,
    availableTimeBlocks,
    reference,
  )

  const scheduledBlocks: ScheduledAssignmentBlock[] = []
  const unplacedAssignments: UnplacedAssignment[] = []
  for (const priority of ranked) {
    const assignment = assignmentsById.get(priority.assignmentId)!
    let remaining = assignment.estimatedMinutes
    if (remaining === undefined || remaining === 0) {
      unplacedAssignments.push({
        assignmentId: assignment.id,
        reason: remaining === undefined ? 'missingEstimate' : 'zeroEstimate',
        ...(remaining === 0 ? { remainingMinutes: 0 } : {}),
      })
      continue
    }
    // Reuse the priority engine's deadline interpretation, including missing dueTime.
    const deadline = priority.minutesUntilDue > 0 ? referenceMinutes + priority.minutesUntilDue : Infinity
    for (const interval of available) {
      if (interval.start >= deadline) break
      const eligibleEnd = Math.min(interval.end, deadline)
      const duration = Math.min(remaining, eligibleEnd - interval.start)
      if (duration <= 0) continue
      const end = interval.start + duration
      scheduledBlocks.push({
        assignmentId: assignment.id,
        date: interval.date,
        startTime: minutesToTime(interval.start - interval.dayStart),
        endTime: minutesToTime(end - interval.dayStart),
        durationMinutes: duration,
      })
      interval.start = end
      remaining -= duration
      if (remaining === 0) break
    }
    if (remaining > 0) {
      // Report deadline restriction when it excludes any still-unused capacity;
      // otherwise the supplied capacity itself has been exhausted.
      const deadlineExcludesTime = available.some(
        (interval) => interval.end > Math.max(interval.start, deadline),
      )
      unplacedAssignments.push({
        assignmentId: assignment.id,
        reason: deadlineExcludesTime ? 'insufficientTimeBeforeDeadline' : 'insufficientAvailableTime',
        remainingMinutes: remaining,
      })
    }
  }
  scheduledBlocks.sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : timeToMinutes(a.startTime) - timeToMinutes(b.startTime),
  )
  return { scheduledBlocks, unplacedAssignments }
}
