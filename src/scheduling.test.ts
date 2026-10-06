// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { Commitment } from './domain'
import { calculateAvailableTime, type AvailableTimeBlock, type PlanningWindow } from './scheduling'

const date = '2026-10-05'
const nextDate = '2026-10-06'
const window = (startTime = '15:00', endTime = '22:00', day = date): PlanningWindow => ({
  date: day,
  startTime,
  endTime,
})
const commitment = (startTime: string, endTime: string, day = date): Commitment => ({
  id: `${day}-${startTime}-${endTime}`,
  title: 'Fixed commitment',
  date: day,
  startTime,
  endTime,
  createdAt: '2026-10-01T12:00:00Z',
})
const block = (
  startTime: string,
  endTime: string,
  durationMinutes: number,
  day = date,
): AvailableTimeBlock => ({ date: day, startTime, endTime, durationMinutes })

describe('calculateAvailableTime', () => {
  it('returns the supplied window unchanged when there are no commitments', () => {
    expect(calculateAvailableTime([window()], [])).toEqual([block('15:00', '22:00', 420)])
  })

  it('returns no availability without explicit planning windows', () => {
    expect(calculateAvailableTime([], [commitment('16:00', '17:00')])).toEqual([])
  })

  it('subtracts a commitment in the middle', () => {
    expect(calculateAvailableTime([window()], [commitment('16:00', '17:30')])).toEqual([
      block('15:00', '16:00', 60),
      block('17:30', '22:00', 270),
    ])
  })

  it('subtracts several separated commitments', () => {
    expect(
      calculateAvailableTime([window()], [commitment('16:00', '17:30'), commitment('19:00', '20:00')]),
    ).toEqual([block('15:00', '16:00', 60), block('17:30', '19:00', 90), block('20:00', '22:00', 120)])
  })

  it('merges overlapping commitments while keeping separated gaps', () => {
    expect(
      calculateAvailableTime(
        [window()],
        [commitment('19:00', '20:00'), commitment('16:30', '18:00'), commitment('16:00', '17:00')],
      ),
    ).toEqual([block('15:00', '16:00', 60), block('18:00', '19:00', 60), block('20:00', '22:00', 120)])
  })

  it('merges adjacent commitments without a zero-minute gap', () => {
    expect(
      calculateAvailableTime([window()], [commitment('16:00', '17:00'), commitment('17:00', '18:00')]),
    ).toEqual([block('15:00', '16:00', 60), block('18:00', '22:00', 240)])
  })

  it('handles nested and duplicate commitments without double subtraction', () => {
    expect(
      calculateAvailableTime(
        [window()],
        [commitment('16:00', '19:00'), commitment('17:00', '18:00'), commitment('16:00', '19:00')],
      ),
    ).toEqual([block('15:00', '16:00', 60), block('19:00', '22:00', 180)])
  })

  it('ignores a commitment entirely before the window', () => {
    expect(calculateAvailableTime([window()], [commitment('13:00', '14:00')])).toEqual([
      block('15:00', '22:00', 420),
    ])
  })

  it('ignores a commitment entirely after the window', () => {
    expect(calculateAvailableTime([window('15:00', '20:00')], [commitment('21:00', '22:00')])).toEqual([
      block('15:00', '20:00', 300),
    ])
  })

  it('does not block commitments that only touch the outside boundaries', () => {
    expect(
      calculateAvailableTime(
        [window('15:00', '20:00')],
        [commitment('14:00', '15:00'), commitment('20:00', '21:00')],
      ),
    ).toEqual([block('15:00', '20:00', 300)])
  })

  it('clips a commitment overlapping the beginning', () => {
    expect(calculateAvailableTime([window('15:00', '20:00')], [commitment('14:00', '16:00')])).toEqual([
      block('16:00', '20:00', 240),
    ])
  })

  it('clips a commitment overlapping the end', () => {
    expect(calculateAvailableTime([window('15:00', '20:00')], [commitment('19:00', '21:00')])).toEqual([
      block('15:00', '19:00', 240),
    ])
  })

  it.each([
    ['15:00', '20:00'],
    ['14:00', '21:00'],
  ])('returns no blocks when a commitment from %s to %s covers the window', (start, end) => {
    expect(calculateAvailableTime([window('15:00', '20:00')], [commitment(start, end)])).toEqual([])
  })

  it('returns no zero-length blocks when adjacent commitments cover a window', () => {
    expect(
      calculateAvailableTime(
        [window('15:00', '20:00')],
        [commitment('15:00', '18:00'), commitment('18:00', '20:00')],
      ),
    ).toEqual([])
  })

  it('ignores commitments on another date', () => {
    expect(calculateAvailableTime([window()], [commitment('15:00', '22:00', nextDate)])).toEqual([
      block('15:00', '22:00', 420),
    ])
  })

  it('calculates dates independently and sorts dates and start times chronologically', () => {
    expect(
      calculateAvailableTime(
        [window('18:00', '20:00', nextDate), window('19:00', '21:00'), window('15:00', '17:00')],
        [commitment('16:00', '17:00'), commitment('18:00', '19:00', nextDate)],
      ),
    ).toEqual([
      block('15:00', '16:00', 60),
      block('19:00', '21:00', 120),
      block('19:00', '20:00', 60, nextDate),
    ])
  })

  it('does not add availability between separated windows on the same date', () => {
    expect(
      calculateAvailableTime(
        [window('15:00', '17:00'), window('19:00', '22:00')],
        [commitment('16:00', '20:00')],
      ),
    ).toEqual([block('15:00', '16:00', 60), block('20:00', '22:00', 120)])
  })

  it('unions overlapping, adjacent, nested, and duplicate windows to avoid overlapping output', () => {
    expect(
      calculateAvailableTime(
        [
          window('16:00', '19:00'),
          window('15:00', '17:00'),
          window('19:00', '22:00'),
          window('16:00', '17:00'),
          window('15:00', '17:00'),
        ],
        [commitment('18:00', '20:00')],
      ),
    ).toEqual([block('15:00', '18:00', 180), block('20:00', '22:00', 120)])
  })

  it('does not merge windows across date boundaries', () => {
    expect(
      calculateAvailableTime([window('00:00', '01:00', nextDate), window('23:00', '23:59')], []),
    ).toEqual([block('23:00', '23:59', 59), block('00:00', '01:00', 60, nextDate)])
  })

  it('is deterministic regardless of input ordering', () => {
    const windows = [window('15:00', '19:00'), window('18:00', '22:00'), window('10:00', '12:00', nextDate)]
    const commitments = [commitment('16:00', '17:00'), commitment('16:30', '18:00')]
    const result = calculateAvailableTime(windows, commitments)
    expect(calculateAvailableTime(windows, commitments)).toEqual(result)
    expect(calculateAvailableTime([...windows].reverse(), [...commitments].reverse())).toEqual(result)
  })

  it('does not modify input arrays or their objects', () => {
    const windows = Object.freeze([Object.freeze(window('18:00', '22:00')), Object.freeze(window())])
    const commitments = Object.freeze([
      Object.freeze(commitment('17:00', '20:00')),
      Object.freeze(commitment('16:00', '18:00')),
    ])
    const original = JSON.stringify({ windows, commitments })
    expect(calculateAvailableTime(windows, commitments)).toEqual([
      block('15:00', '16:00', 60),
      block('20:00', '22:00', 120),
    ])
    expect(JSON.stringify({ windows, commitments })).toBe(original)
  })

  it.each([
    ['00:00', '00:01', 1],
    ['23:58', '23:59', 1],
    ['09:07', '10:43', 96],
  ])('round-trips %s–%s with the correct duration of %i minutes', (start, end, duration) => {
    expect(calculateAvailableTime([window(start, end)], [])).toEqual([block(start, end, duration)])
  })

  it('keeps one-minute gaps and calculates exact non-hour durations', () => {
    expect(
      calculateAvailableTime(
        [window('09:07', '10:43')],
        [commitment('09:08', '09:59'), commitment('10:00', '10:42')],
      ),
    ).toEqual([block('09:07', '09:08', 1), block('09:59', '10:00', 1), block('10:42', '10:43', 1)])
  })

  it.each([
    ['15:00', '15:00'],
    ['16:00', '15:00'],
    ['9:00', '15:00'],
    ['15:60', '17:00'],
    ['15:00', '24:00'],
  ])('rejects an invalid planning interval %s–%s rather than producing invalid blocks', (start, end) => {
    expect(() => calculateAvailableTime([window(start, end)], [])).toThrow(RangeError)
  })
})
