// Shared input boundary for placement and regeneration; no allocation policy lives here.
import type { Assignment } from './domain'
import { rankAssignmentsByPriority, type PriorityReference } from './priority'
import type { AvailableTimeBlock } from './scheduling'

export type ScheduleMinuteInterval = { date: string; dayStart: number; start: number; end: number }

export function timeToMinutes(time: string): number {
  if (typeof time !== 'string' || time.length !== 5 || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    throw new RangeError('Time must be HH:mm between 00:00 and 23:59')
  }
  const [hour, minute] = time.split(':').map(Number)
  return hour * 60 + minute
}

function dayStartMinutes(date: string): number {
  if (typeof date !== 'string') throw new RangeError('Date must be a valid YYYY-MM-DD calendar date')
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

export function minutesToTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

export function toScheduleInterval(block: AvailableTimeBlock): ScheduleMinuteInterval {
  const dayStart = dayStartMinutes(block.date)
  const start = dayStart + timeToMinutes(block.startTime)
  const end = dayStart + timeToMinutes(block.endTime)
  if (end <= start || block.durationMinutes !== end - start) {
    throw new RangeError('Schedule intervals must have positive length and matching durationMinutes')
  }
  return { date: block.date, dayStart, start, end }
}

function remainingAvailability(
  blocks: readonly AvailableTimeBlock[],
  referenceMinutes: number,
): ScheduleMinuteInterval[] {
  const intervals = blocks.map(toScheduleInterval)
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

/** Validates even past availability and inactive/empty rankings, matching placement's contract. */
export function prepareScheduleInputs(
  assignments: readonly Assignment[],
  availableTimeBlocks: readonly AvailableTimeBlock[],
  reference: PriorityReference,
) {
  const referenceMinutes = dayStartMinutes(reference.date) + timeToMinutes(reference.time)
  const ranked = rankAssignmentsByPriority(assignments, reference)
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

  return { ranked, referenceMinutes, available, assignmentsById }
}
