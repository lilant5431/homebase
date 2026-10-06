import type { Assignment } from './domain'

export type PriorityReference = {
  date: string
  time: string
}

const MINUTES_PER_DAY = 1440
const END_OF_DAY = '23:59'

// Minute-resolution boundaries are inclusive: -1 is the last overdue minute,
// while an assignment due exactly at the reference time is within6Hours.
const DEADLINE_BANDS = [
  { band: 'overdue', throughMinutes: -1, points: 100 },
  { band: 'within6Hours', throughMinutes: 360, points: 90 },
  { band: 'within24Hours', throughMinutes: 1440, points: 80 },
  { band: 'within48Hours', throughMinutes: 2880, points: 70 },
  { band: 'within3Days', throughMinutes: 4320, points: 60 },
  { band: 'within7Days', throughMinutes: 10080, points: 50 },
  { band: 'within14Days', throughMinutes: 20160, points: 35 },
  { band: 'later', throughMinutes: Infinity, points: 20 },
] as const

const WORKLOAD_BANDS = [
  { throughMinutes: 30, points: 0 },
  { throughMinutes: 60, points: 2 },
  { throughMinutes: 120, points: 4 },
  { throughMinutes: Infinity, points: 6 },
] as const

export type PriorityBand = (typeof DEADLINE_BANDS)[number]['band']

export type AssignmentPriority = {
  assignmentId: string
  score: number
  band: PriorityBand
  minutesUntilDue: number
  deadlinePoints: number
  workloadPoints: number
}

function calendarDayIndex(date: string): number {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!parts || parts[0] !== date) throw new RangeError('Date must be a valid YYYY-MM-DD calendar date')
  const [, yearText, monthText, dayText] = parts
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)

  // UTC is only a calendar encoding here, not an elapsed-time interpretation.
  // setUTCFullYear also avoids Date.UTC's implicit 1900 offset for years 00–99.
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
  return encoded.getTime() / 86_400_000
}

function timeToMinutes(time: string): number {
  if (time.length !== 5 || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    throw new RangeError('Time must be HH:mm between 00:00 and 23:59')
  }
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function calendarMinutes(date: string, time: string): number {
  return calendarDayIndex(date) * MINUTES_PER_DAY + timeToMinutes(time)
}

function scoreAtReference(assignment: Assignment, referenceMinutes: number): AssignmentPriority | null {
  if (assignment.completed) return null
  const minutesUntilDue =
    calendarMinutes(assignment.dueDate, assignment.dueTime ?? END_OF_DAY) - referenceMinutes
  const estimate = assignment.estimatedMinutes ?? 0
  if (!Number.isFinite(estimate) || estimate < 0) {
    throw new RangeError('Estimated minutes must be finite and nonnegative when supplied')
  }
  const deadline = DEADLINE_BANDS.find((entry) => minutesUntilDue <= entry.throughMinutes)!
  const workload = WORKLOAD_BANDS.find((entry) => estimate <= entry.throughMinutes)!
  return {
    assignmentId: assignment.id,
    score: deadline.points + workload.points,
    band: deadline.band,
    minutesUntilDue,
    deadlinePoints: deadline.points,
    workloadPoints: workload.points,
  }
}

/**
 * Scores incomplete work against an explicit local calendar reference.
 * Missing dueTime means 23:59 without changing the assignment. At the exact
 * deadline, work is due now, not overdue. Completed work returns null.
 * Invalid references, active deadlines, or estimates throw RangeError.
 */
export function scoreAssignmentPriority(
  assignment: Assignment,
  reference: PriorityReference,
): AssignmentPriority | null {
  return scoreAtReference(assignment, calendarMinutes(reference.date, reference.time))
}

/**
 * Ranks by descending score, earlier deadline, longer known estimate, then ID
 * in ascending code-unit order. Missing estimates contribute zero to workload
 * and the duration tie-break only; no default work estimate is inferred.
 * Reference validation applies even when there is no active work.
 * Returns fresh results and never mutates inputs or reads the current clock.
 */
export function rankAssignmentsByPriority(
  assignments: readonly Assignment[],
  reference: PriorityReference,
): AssignmentPriority[] {
  const referenceMinutes = calendarMinutes(reference.date, reference.time)
  const ranked: { priority: AssignmentPriority; estimate: number }[] = []
  for (const assignment of assignments) {
    const priority = scoreAtReference(assignment, referenceMinutes)
    if (priority) ranked.push({ priority, estimate: assignment.estimatedMinutes ?? 0 })
  }
  ranked.sort((a, b) => {
    const byScore = b.priority.score - a.priority.score
    const byDeadline = a.priority.minutesUntilDue - b.priority.minutesUntilDue
    const byEstimate = b.estimate - a.estimate
    const aId = a.priority.assignmentId
    const bId = b.priority.assignmentId
    return byScore || byDeadline || byEstimate || (aId < bId ? -1 : aId > bId ? 1 : 0)
  })
  return ranked.map((entry) => entry.priority)
}
