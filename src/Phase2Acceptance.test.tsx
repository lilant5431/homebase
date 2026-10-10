import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import App from './App'
import type { AcademicData } from './domain'
import type { ScheduleData } from './scheduleData'

const reference = { date: '2026-10-12', time: '15:00' }
function stored<T>(key: string): T {
  const bytes = localStorage.getItem(key)
  if (!bytes) throw new Error('Expected persisted source')
  const parsed: unknown = JSON.parse(bytes)
  return parsed as T
}
function field(name: string | RegExp, value: string) {
  fireEvent.change(within(screen.getByRole('dialog')).getByLabelText(name), { target: { value } })
}
function save(name: string) {
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name }))
  expect(screen.queryByRole('dialog')).toBeNull()
}
function studyCards() {
  return screen.queryAllByRole('button', { name: /^(Study|Locked study):/ }).map((element) => ({
    label: element.getAttribute('aria-label'),
    text: element.textContent,
  }))
}
function assignment(title: string, estimate: number, dueDate: string) {
  fireEvent.click(screen.getByRole('button', { name: 'New assignment' }))
  field('Title', title)
  const classId = stored<AcademicData>('homebase.academic.v1').classes[0].id
  field(/^Class/, classId)
  field('Due date', dueDate)
  field(/^Time/, '21:00')
  field(/^Estimated work/, String(estimate))
  save('Add assignment')
}

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

it('captures academic work, schedules around commitments, customizes, reloads, repairs and unlocks through the application', () => {
  localStorage.clear()
  vi.useFakeTimers()
  // Local calendar fields and an explicit reference keep this scenario independent of host timezone.
  vi.setSystemTime(new Date(2026, 9, 12, 15, 0))
  render(<App initialReference={reference} />)
  expect(localStorage.length).toBe(0)
  fireEvent.click(screen.getByRole('button', { name: 'Classes' }))
  fireEvent.click(screen.getAllByRole('button', { name: 'Add class' })[0])
  field('Class name', 'Biology')
  save('Add class')
  assignment('Urgent essay', 150, reference.date)
  assignment('Later reading', 30, '2026-10-13')
  fireEvent.click(screen.getByRole('button', { name: 'Weekly Planner' }))
  expect(screen.getByText('150 minutes could not fit in your available study time.')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Add availability for Oct 12' }))
  field('Start time', '16:00')
  field('End time', '19:00')
  save('Save availability')
  fireEvent.click(screen.getByRole('button', { name: 'Add commitment' }))
  field('Commitment name', 'Practice')
  field('Date', reference.date)
  field('Start time', '17:00')
  field('End time', '18:00')
  save('Add commitment')
  const initialCards = studyCards()
  expect(initialCards.map((card) => card.label)).toEqual([
    'Study: Urgent essay, 4:00 PM–5:00 PM',
    'Study: Urgent essay, 6:00 PM–7:00 PM',
  ])
  expect(screen.getByRole('button', { name: /Urgent essay.*30 minutes could not fit/ })).toBeTruthy()
  expect(screen.getByRole('button', { name: /Later reading.*30 minutes could not fit/ })).toBeTruthy()
  const academicBytes = localStorage.getItem('homebase.academic.v1')
  fireEvent.click(screen.getAllByRole('button', { name: /Customize study: Urgent essay/ })[0])
  field('Start time', '18:15')
  field('End time', '18:45')
  save('Lock session')
  const schedule = stored<ScheduleData>('homebase.schedule.v1'),
    block = schedule.lockedBlocks[0]
  expect(block.durationMinutes).toBe(30)
  expect(Object.keys(schedule).sort()).toEqual(['lockedBlocks', 'planningWindows', 'version'])
  expect(Object.keys(block).sort()).toEqual([
    'assignmentId',
    'blockId',
    'date',
    'durationMinutes',
    'endTime',
    'startTime',
  ])
  expect(localStorage.getItem('homebase.academic.v1')).toBe(academicBytes)
  expect(studyCards().reduce((sum, card) => sum + Number(/(\d+) min/.exec(card.text ?? '')?.[1]), 0)).toBe(
    120,
  )
  fireEvent.click(screen.getByRole('button', { name: /Edit locked study:/ }))
  field('Start time', '18:00')
  field('End time', '18:30')
  save('Save changes')
  expect(stored<ScheduleData>('homebase.schedule.v1').lockedBlocks[0].blockId).toBe(block.blockId)
  const savedCards = studyCards(),
    scheduleBytes = localStorage.getItem('homebase.schedule.v1')
  cleanup()
  render(<App initialReference={reference} />)
  fireEvent.click(screen.getByRole('button', { name: 'Weekly Planner' }))
  expect(studyCards()).toEqual(savedCards)
  expect(localStorage.getItem('homebase.schedule.v1')).toBe(scheduleBytes)
  // Advance the caller clock: modal/week interactions must not silently refresh the explicit plan.
  const oldReference = screen.getByTestId('plan-reference').textContent
  act(() => {
    vi.setSystemTime(new Date(2026, 9, 12, 15, 10))
  })
  fireEvent.click(screen.getByRole('button', { name: 'Next week' }))
  fireEvent.click(screen.getByRole('button', { name: 'Previous week' }))
  expect(screen.getByTestId('plan-reference').textContent).toBe(oldReference)
  fireEvent.click(screen.getByRole('button', { name: 'Refresh plan' }))
  expect(screen.getByTestId('plan-reference').textContent).toContain('15:10')
  expect(localStorage.getItem('homebase.schedule.v1')).toBe(scheduleBytes)
  fireEvent.click(screen.getByRole('button', { name: /Practice.*Commitment/ }))
  field('End time', '18:15')
  save('Save changes')
  expect(screen.getByText('Schedule needs attention')).toBeTruthy()
  expect(studyCards()).toEqual([])
  expect(screen.getByRole('button', { name: /Unlock session:/ })).toBeTruthy()
  expect(screen.queryByRole('button', { name: /Edit locked study:|Customize study:/ })).toBeNull()
  expect(localStorage.getItem('homebase.schedule.v1')).toBe(scheduleBytes)
  fireEvent.click(screen.getByRole('button', { name: /Practice.*Commitment/ }))
  field('End time', '18:00')
  save('Save changes')
  expect(screen.queryByText('Schedule needs attention')).toBeNull()
  expect(stored<ScheduleData>('homebase.schedule.v1').lockedBlocks[0].blockId).toBe(block.blockId)
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  fireEvent.click(screen.getByRole('button', { name: /Unlock session:/ }))
  expect(stored<ScheduleData>('homebase.schedule.v1').lockedBlocks).toEqual([])
  expect(studyCards()).toEqual(initialCards)
  expect(
    stored<AcademicData>('homebase.academic.v1').assignments.map((item) => [
      item.estimatedMinutes,
      item.completed,
    ]),
  ).toEqual([
    [150, false],
    [30, false],
  ])
})
