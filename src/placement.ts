import type { Assignment } from './domain'
import { rankAssignmentsByPriority, type PriorityReference } from './priority'
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

type RemainingInterval = { date: string; dayStart: number; start: number; end: number }

function timeToMinutes(time: string): number {
  if (time.length !== 5 || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    throw new RangeError('Time must be HH:mm between 00:00 and 23:59')
  }
  const [hour, minute] = time.split(':').map(Number)
  return hour * 60 + minute
}

function dayStartMinutes(date: string): number {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!parts || parts[0] !== date) throw new RangeError('Date must be a valid YYYY-MM-DD calendar date')
  const [, yearText, monthText, dayText] = parts
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  // UTC encodes calendar days only; no timezone or DST elapsed-time arithmetic.
  const encoded = new Date(0)
  encoded.setUTCFullYear(year, month - 1, day)
  if (
    year < 1 ||
    encoded.getUTCFullYear() !== year ||
    encoded.getUTCMonth() !== month - 1 ||
    encoded.getUTCDate() !== day
  ) {
    throw new RangeError('Date must be a valid YYYY-MM-DD calendar date')
  }
  return encoded.getTime() / 60_000
}

function minutesToTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

function remainingAvailability(
  blocks: readonly AvailableTimeBlock[],
  referenceMinutes: number,
): RemainingInterval[] {
  const intervals = blocks.map((block) => {
    const dayStart = dayStartMinutes(block.date)
    const start = dayStart + timeToMinutes(block.startTime)
    const end = dayStart + timeToMinutes(block.endTime)
    if (end <= start || block.durationMinutes !== end - start) {
      throw new RangeError('Availability must have positive length and matching durationMinutes')
    }
    return { date: block.date, dayStart, start, end }
  })
  intervals.sort((a, b) => a.start - b.start || a.end - b.end)
  for (let index = 1; index < intervals.length; index++) {
    if (intervals[index].start < intervals[index - 1].end) {
      throw new RangeError('Available-time blocks must not overlap')
    }
  }
  // Validate before clipping, including past blocks, so bad input is never hidden.
  return intervals
    .filter((interval) => interval.end > referenceMinutes)
    .map((interval) => ({ ...interval, start: Math.max(interval.start, referenceMinutes) }))
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
  const ranked = rankAssignmentsByPriority(assignments, reference)
  const referenceMinutes = dayStartMinutes(reference.date) + timeToMinutes(reference.time)
  const available = remainingAvailability(availableTimeBlocks, referenceMinutes)
  const assignmentsById = new Map<string, Assignment>()
  for (const assignment of assignments) {
    if (assignment.completed) continue
    if (assignmentsById.has(assignment.id)) throw new RangeError('Active assignment IDs must be unique')
    if (assignment.estimatedMinutes !== undefined && !Number.isSafeInteger(assignment.estimatedMinutes)) {
      throw new RangeError('Active estimates must be safe whole minutes')
    }
    assignmentsById.set(assignment.id, assignment)
  }

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
