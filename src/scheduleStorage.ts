import {
  emptyScheduleData,
  parseScheduleData,
  type ScheduleParseResult,
  type ScheduleData,
} from './scheduleData'

export const SCHEDULE_STORAGE_KEY = 'homebase.schedule.v1'
export type ScheduleLoadResult =
  ScheduleParseResult | { status: 'empty'; data: ScheduleData } | { status: 'unavailable' }

/** Read-only: never repairs, migrates, erases, or writes either store. */
export function loadScheduleData(): ScheduleLoadResult {
  let raw: string | null
  try {
    raw = globalThis.localStorage.getItem(SCHEDULE_STORAGE_KEY)
  } catch {
    return { status: 'unavailable' }
  }
  if (raw === null) return { status: 'empty', data: emptyScheduleData() }
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return { status: 'invalid' }
  }
  return parseScheduleData(value)
}

/** Invalid caller state throws before storage access; browser write failure returns false. */
export function saveScheduleData(value: unknown): boolean {
  const result = parseScheduleData(value)
  if (result.status !== 'ok') throw new RangeError('Cannot save invalid or unsupported schedule data')
  const serialized = JSON.stringify(result.data)
  try {
    globalThis.localStorage.setItem(SCHEDULE_STORAGE_KEY, serialized)
    return true
  } catch {
    return false
  }
}
