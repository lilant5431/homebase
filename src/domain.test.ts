import { describe, expect, it } from 'vitest'
import {
  addDays,
  demoData,
  emptyData,
  isPlannerEmpty,
  localDate,
  mondayOf,
  removeEntity,
  upsertEntity,
  type Assignment,
} from './domain'

describe('academic data', () => {
  it('uses local calendar days across month and week boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(mondayOf('2026-10-04')).toBe('2026-09-28')
    expect(localDate(new Date(2026, 9, 4))).toBe('2026-10-04')
  })
  it('updates and removes an assignment without duplicating it', () => {
    const data = demoData('2026-10-04')
    const original = data.assignments[0]
    const edited: Assignment = { ...original, title: 'Revised work', completed: true }
    const changed = upsertEntity(data, 'assignment', edited)
    expect(changed.assignments).toHaveLength(data.assignments.length)
    expect(changed.assignments.find((item) => item.id === original.id)).toMatchObject({
      title: 'Revised work',
      completed: true,
    })
    expect(removeEntity(changed, 'assignment', original.id).assignments).toHaveLength(
      data.assignments.length - 1,
    )
  })
  it('removes associated work when a class is deleted', () => {
    const data = demoData('2026-10-04')
    const id = data.classes[0].id
    const changed = removeEntity(data, 'class', id)
    expect(changed.assignments.some((item) => item.classId === id)).toBe(false)
    expect(changed.assessments.some((item) => item.classId === id)).toBe(false)
    expect(changed.classes).toHaveLength(data.classes.length - 1)
  })
  it('starts with no sample data', () => {
    expect(emptyData()).toMatchObject({ classes: [], assignments: [], assessments: [], commitments: [] })
  })
})

describe('sample-data eligibility', () => {
  it('allows sample data only for a completely empty planner', () => {
    expect(isPlannerEmpty(emptyData())).toBe(true)
  })

  it.each(['classes', 'assignments', 'assessments', 'commitments'] as const)(
    'prevents sample data when only %s exist',
    (collection) => {
      const sample = demoData('2026-10-04')
      const data = { ...emptyData(), [collection]: sample[collection].slice(0, 1) }
      expect(isPlannerEmpty(data)).toBe(false)
    },
  )
})
