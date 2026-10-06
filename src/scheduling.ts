import type { Commitment } from './domain'

export type PlanningWindow = {
  date: string
  startTime: string
  endTime: string
}

export type AvailableTimeBlock = PlanningWindow & {
  durationMinutes: number
}

type MinuteInterval = { start: number; end: number }

function timeToMinutes(time: string): number {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    throw new RangeError('Time must be HH:mm between 00:00 and 23:59')
  }
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  return `${String(hours).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

function groupByDate(windows: readonly PlanningWindow[]): Map<string, MinuteInterval[]> {
  const groups = new Map<string, MinuteInterval[]>()
  for (const window of windows) {
    const start = timeToMinutes(window.startTime)
    const end = timeToMinutes(window.endTime)
    if (end <= start) throw new RangeError('Interval end must be after its start on the same date')
    const intervals = groups.get(window.date) ?? []
    intervals.push({ start, end })
    groups.set(window.date, intervals)
  }
  return groups
}

function mergeIntervals(intervals: readonly MinuteInterval[]): MinuteInterval[] {
  const sorted = [...intervals].sort((a, b) => a.start - b.start || a.end - b.end)
  const merged: MinuteInterval[] = []
  for (const interval of sorted) {
    const previous = merged[merged.length - 1]
    // Touching boundaries are continuous time, so they do not create a gap.
    if (previous && interval.start <= previous.end) {
      previous.end = Math.max(previous.end, interval.end)
    } else {
      merged.push({ ...interval })
    }
  }
  return merged
}

function subtractBlockedTime(window: MinuteInterval, blocked: readonly MinuteInterval[]): MinuteInterval[] {
  const available: MinuteInterval[] = []
  let cursor = window.start
  for (const interval of blocked) {
    if (interval.start >= window.end) break
    const start = Math.max(window.start, interval.start)
    const end = Math.min(window.end, interval.end)
    if (end <= cursor) continue
    if (cursor < start) available.push({ start: cursor, end: start })
    cursor = end
    if (cursor === window.end) break
  }
  if (cursor < window.end) available.push({ start: cursor, end: window.end })
  return available
}

/**
 * Returns the union of supplied planning windows minus fixed commitments.
 * Inputs use valid local YYYY-MM-DD dates and same-day HH:mm intervals.
 * Intervals include their start and exclude their end. Invalid times or
 * non-positive intervals throw RangeError; dates are not parsed or validated.
 * Inputs are never mutated. No implicit planning hours are added.
 */
export function calculateAvailableTime(
  planningWindows: readonly PlanningWindow[],
  commitments: readonly Commitment[],
): AvailableTimeBlock[] {
  if (planningWindows.length === 0) return []
  const windowsByDate = groupByDate(planningWindows)
  const blockedByDate = groupByDate(commitments.filter((item) => windowsByDate.has(item.date)))
  const available: AvailableTimeBlock[] = []

  // Canonical YYYY-MM-DD date labels sort chronologically without Date or timezone conversion.
  for (const date of [...windowsByDate.keys()].sort()) {
    const windows = mergeIntervals(windowsByDate.get(date)!)
    const blocked = mergeIntervals(blockedByDate.get(date) ?? [])
    for (const window of windows) {
      for (const interval of subtractBlockedTime(window, blocked)) {
        available.push({
          date,
          startTime: minutesToTime(interval.start),
          endTime: minutesToTime(interval.end),
          durationMinutes: interval.end - interval.start,
        })
      }
    }
  }
  return available
}
