import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import App from './App'
import { StrictMode } from 'react'
import type { AcademicData } from './domain'
import type { ScheduleData } from './scheduleData'
import { saveData } from './storage'
import { saveScheduleData, loadScheduleData, SCHEDULE_STORAGE_KEY } from './scheduleStorage'
import { lockAcademic, lockReference, lockSchedule, lockFixture } from './testFixtures/manualLocks'

beforeEach(() => {
  localStorage.clear()
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 9, 6, 16, 0))
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})
it('offers customization and locks generated work as persisted intent', () => {
  saveData(lockAcademic())
  saveScheduleData(lockSchedule())
  render(<App initialReference={lockReference} />)
  fireEvent.click(screen.getByRole('button', { name: 'Weekly Planner' }))
  fireEvent.click(screen.getByRole('button', { name: /Customize study:/ }))
  expect(screen.getByRole('heading', { name: 'Customize study session' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Lock session' }))
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(screen.getByText(/LOCKED STUDY/)).toBeTruthy()
})

function launch(academic: AcademicData = lockAcademic(), schedule: ScheduleData = lockSchedule()) {
  saveData(academic)
  saveScheduleData(schedule)
  const app = render(
    <StrictMode>
      <App initialReference={lockReference} />
    </StrictMode>,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Weekly Planner' }))
  return app
}
function source() {
  const loaded = loadScheduleData()
  if (loaded.status !== 'ok') throw new Error('Expected saved source')
  return loaded.data
}
function customize() {
  fireEvent.click(screen.getAllByRole('button', { name: /Customize study:/ })[0])
}
function setTimes(start: string, end: string) {
  const dialog = within(screen.getByRole('dialog'))
  fireEvent.change(dialog.getByLabelText('Start time'), { target: { value: start } })
  fireEvent.change(dialog.getByLabelText('End time'), { target: { value: end } })
}
function submit() {
  const form = screen.getByRole('dialog').querySelector('form')
  if (!form) throw new Error('Expected form')
  fireEvent.submit(form)
}
it('customizes a generated interval before locking and persists no generated remainder', () => {
  launch()
  const academicBytes = localStorage.getItem('homebase.academic.v1')
  customize()
  setTimes('18:00', '18:45')
  submit()
  expect(source().lockedBlocks).toHaveLength(1)
  expect(source().lockedBlocks[0]).toMatchObject({
    assignmentId: 'a',
    date: lockReference.date,
    startTime: '18:00',
    endTime: '18:45',
    durationMinutes: 45,
  })
  expect(screen.getByRole('button', { name: /^Study:/ }).textContent).toContain('45 min')
  expect(Object.keys(source())).toEqual(['version', 'planningWindows', 'lockedBlocks'])
  expect(localStorage.getItem('homebase.academic.v1')).toBe(academicBytes)
  cleanup()
  render(<App initialReference={lockReference} />)
  fireEvent.click(screen.getByRole('button', { name: 'Weekly Planner' }))
  expect(screen.getByRole('button', { name: /^Locked study:/ })).toBeTruthy()
})
it('edits a healthy lock without changing its blockId and derives the shorter duration', () => {
  const schedule = lockSchedule()
  schedule.lockedBlocks = [lockFixture()]
  launch(lockAcademic(), schedule)
  fireEvent.click(screen.getByRole('button', { name: /Edit locked study:/ }))
  setTimes('17:00', '17:30')
  submit()
  expect(source().lockedBlocks).toEqual([lockFixture('17:00', '17:30')])
  expect(screen.getByRole('button', { name: /^Study:/ }).textContent).toContain('60 min')
})
it('unlock confirmation explains regeneration and removes only selected intent', () => {
  const schedule = lockSchedule()
  schedule.lockedBlocks = [lockFixture('16:00', '17:30')]
  launch(lockAcademic(), schedule)
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
  fireEvent.click(screen.getByTestId('unlock-intent'))
  expect(source().lockedBlocks).toHaveLength(1)
  confirm.mockReturnValue(true)
  fireEvent.click(screen.getByTestId('unlock-intent'))
  expect(confirm).toHaveBeenCalledWith(expect.stringContaining('may be recommended at the same time again'))
  expect(source().lockedBlocks).toEqual([])
  expect(screen.getByRole('button', { name: /^Study:/ }).textContent).toContain('90 min')
  expect(screen.getByRole('button', { name: /^Study:/ }).getAttribute('aria-label')).toContain('4:00')
})
it('the lock modal keeps existing assignment editor access', () => {
  launch()
  customize()
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Edit assignment' }))
  expect(screen.getByRole('heading', { name: 'Edit assignment' })).toBeTruthy()
  expect(screen.queryByRole('heading', { name: 'Customize study session' })).toBeNull()
})
it.each([
  ['Start time', '24:00'],
  ['End time', '24:00'],
  ['Date', '2026-02-29'],
  ['Date', ''],
  ['End time', '16:00'],
  ['End time', '15:00'],
] as const)('invalid %s=%s is readable and writes nothing', (label, value) => {
  launch()
  const bytes = localStorage.getItem(SCHEDULE_STORAGE_KEY)
  customize()
  fireEvent.change(within(screen.getByRole('dialog')).getByLabelText(label), { target: { value } })
  submit()
  expect(within(screen.getByRole('dialog')).getByRole('alert').textContent).toContain('valid date and times')
  expect(localStorage.getItem(SCHEDULE_STORAGE_KEY)).toBe(bytes)
})
it.each([
  'outsideAvailability',
  'afterDeadline',
  'overlapsLockedBlock',
  'lockedTimeExceedsEstimate',
  'beforeReference',
] as const)('full preflight rejects UI candidate %s with no writes', (reason) => {
  const academic = lockAcademic(),
    schedule = lockSchedule()
  if (reason === 'afterDeadline') academic.assignments[0].dueTime = '17:30'
  if (reason === 'overlapsLockedBlock') schedule.lockedBlocks = [lockFixture('18:00', '18:15')]
  launch(academic, schedule)
  const bytes = localStorage.getItem(SCHEDULE_STORAGE_KEY),
    beforeReference = screen.getByTestId('plan-reference').textContent
  customize()
  if (reason === 'outsideAvailability') setTimes('19:00', '19:30')
  if (reason === 'afterDeadline' || reason === 'overlapsLockedBlock') setTimes('18:00', '18:30')
  if (reason === 'lockedTimeExceedsEstimate') setTimes('16:00', '18:00')
  if (reason === 'beforeReference') {
    setTimes('16:00', '16:30')
    vi.setSystemTime(new Date(2026, 9, 6, 16, 1))
  }
  submit()
  expect(screen.getByRole('dialog')).toBeTruthy()
  expect(within(screen.getByRole('dialog')).getByRole('alert').textContent).toContain('schedule conflict')
  expect(localStorage.getItem(SCHEDULE_STORAGE_KEY)).toBe(bytes)
  expect(screen.getByTestId('plan-reference').textContent).toBe(beforeReference)
})
it('failed browser write preserves the plan and supports retrying in the same editor', () => {
  const schedule = lockSchedule()
  schedule.lockedBlocks = [lockFixture()]
  launch(lockAcademic(), schedule)
  const oldBytes = localStorage.getItem(SCHEDULE_STORAGE_KEY),
    oldReference = screen.getByTestId('plan-reference').textContent
  fireEvent.click(screen.getByRole('button', { name: /Edit locked study:/ }))
  setTimes('17:00', '17:30')
  vi.setSystemTime(new Date(2026, 9, 6, 16, 10))
  const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('Quota')
  })
  submit()
  expect(within(screen.getByRole('dialog')).getByRole('alert').textContent).toContain('Browser storage')
  expect(localStorage.getItem(SCHEDULE_STORAGE_KEY)).toBe(oldBytes)
  expect(screen.getByTestId('plan-reference').textContent).toBe(oldReference)
  expect(screen.getByRole('button', { name: /^Locked study:/ }).getAttribute('aria-label')).toContain('6:00')
  set.mockRestore()
  submit()
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(source().lockedBlocks).toEqual([lockFixture('17:00', '17:30')])
})
it('new locks use the centralized secure Safari fallback', () => {
  const getRandomValues = crypto.getRandomValues.bind(crypto)
  vi.stubGlobal('crypto', { getRandomValues })
  launch()
  customize()
  submit()
  expect(source().lockedBlocks[0].blockId).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  )
})
it('absent secure randomness reports its own error and does not save', () => {
  launch()
  customize()
  vi.stubGlobal('crypto', {})
  const bytes = localStorage.getItem(SCHEDULE_STORAGE_KEY)
  submit()
  expect(within(screen.getByRole('dialog')).getByRole('alert').textContent).toContain('Secure ID generation')
  expect(localStorage.getItem(SCHEDULE_STORAGE_KEY)).toBe(bytes)
})
it('multiple independent conflicts can be unlocked one at a time', () => {
  const schedule = lockSchedule()
  schedule.lockedBlocks = [
    { ...lockFixture('17:00', '17:15', 'deleted-a'), assignmentId: 'gone' },
    { ...lockFixture('18:00', '18:15', 'deleted-b'), assignmentId: 'gone' },
  ]
  launch(lockAcademic(), schedule)
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  expect(screen.queryByRole('button', { name: /Customize study:|Edit locked study:/ })).toBeNull()
  fireEvent.click(screen.getByTestId('unlock-deleted-a'))
  expect(source().lockedBlocks.map((b) => b.blockId)).toEqual(['deleted-b'])
  expect(screen.getByText('Schedule needs attention')).toBeTruthy()
  fireEvent.click(screen.getByTestId('unlock-deleted-b'))
  expect(screen.queryByText('Schedule needs attention')).toBeNull()
  expect(screen.getByRole('button', { name: /Customize study:/ })).toBeTruthy()
})
it('overlap conflict offers both relevant locks exactly once', () => {
  const schedule = lockSchedule()
  schedule.lockedBlocks = [lockFixture('17:00', '17:30', 'one'), lockFixture('17:00', '17:30', 'two')]
  launch(lockAcademic(), schedule)
  expect(screen.getAllByRole('button', { name: /Unlock session/ })).toHaveLength(2)
  expect(screen.getByTestId('unlock-one')).toBeTruthy()
  expect(screen.getByTestId('unlock-two')).toBeTruthy()
})
it('over-estimate conflict offers all implicated locks and the existing academic editor', () => {
  const schedule = lockSchedule()
  schedule.lockedBlocks = [lockFixture('17:00', '17:30', 'one'), lockFixture('18:00', '18:30', 'two')]
  launch(lockAcademic(45), schedule)
  expect(screen.getAllByRole('button', { name: /Unlock session/ })).toHaveLength(2)
  fireEvent.click(screen.getByRole('button', { name: 'Edit assignment: Cell homework' }))
  expect(screen.getByRole('heading', { name: 'Edit assignment' })).toBeTruthy()
})
it.each([
  'assignmentMissing',
  'assignmentCompleted',
  'missingEstimate',
  'zeroEstimate',
  'beforeReference',
  'outsideAvailability',
  'afterDeadline',
  'overlapsLockedBlock',
  'lockedTimeExceedsEstimate',
] as const)('conflict %s remains visible and offers safe repair', (reason) => {
  const academic = lockAcademic(),
    schedule = lockSchedule()
  schedule.lockedBlocks = [lockFixture()]
  if (reason === 'assignmentMissing') schedule.lockedBlocks[0].assignmentId = 'deleted'
  if (reason === 'assignmentCompleted') academic.assignments[0].completed = true
  if (reason === 'missingEstimate') academic.assignments[0].estimatedMinutes = undefined
  if (reason === 'zeroEstimate') academic.assignments[0].estimatedMinutes = 0
  if (reason === 'beforeReference') schedule.lockedBlocks = [lockFixture('15:45', '16:15')]
  if (reason === 'outsideAvailability') schedule.planningWindows = []
  if (reason === 'afterDeadline') academic.assignments[0].dueTime = '17:00'
  if (reason === 'overlapsLockedBlock') schedule.lockedBlocks.push(lockFixture('18:00', '18:15', 'other'))
  if (reason === 'lockedTimeExceedsEstimate') academic.assignments[0].estimatedMinutes = 30
  launch(academic, schedule)
  expect(screen.getByText('Schedule needs attention')).toBeTruthy()
  expect(screen.getAllByRole('button', { name: /Unlock session/ }).length).toBeGreaterThan(0)
  expect(screen.queryByRole('button', { name: /Customize study:|Edit locked study:/ })).toBeNull()
  const canEdit = [
    'assignmentCompleted',
    'missingEstimate',
    'zeroEstimate',
    'afterDeadline',
    'lockedTimeExceedsEstimate',
  ].includes(reason)
  expect(Boolean(screen.queryByRole('button', { name: 'Edit assignment: Cell homework' }))).toBe(canEdit)
})
it('new modal keyboard focus is contained and Escape cancels without writing', () => {
  launch()
  customize()
  const dialog = screen.getByRole('dialog'),
    buttons = within(dialog).getAllByRole('button')
  expect(document.activeElement).toBe(within(dialog).getByLabelText('Date'))
  const first = buttons[0],
    last = buttons[buttons.length - 1]
  last.focus()
  fireEvent.keyDown(last, { key: 'Tab' })
  expect(document.activeElement).toBe(first)
  first.focus()
  fireEvent.keyDown(first, { key: 'Tab', shiftKey: true })
  expect(document.activeElement).toBe(last)
  const bytes = localStorage.getItem(SCHEDULE_STORAGE_KEY)
  fireEvent.keyDown(last, { key: 'Escape' })
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(localStorage.getItem(SCHEDULE_STORAGE_KEY)).toBe(bytes)
})
it('study controls have no nested interactive elements', () => {
  launch()
  expect(document.querySelector('button button, button input, button a')).toBeNull()
  customize()
  expect(document.querySelector('button button, button input, button a')).toBeNull()
})
it('StrictMode rerender and week navigation do not mutate intent or reference', () => {
  const app = launch(),
    before = screen.getByTestId('plan-reference').textContent,
    bytes = localStorage.getItem(SCHEDULE_STORAGE_KEY)
  const set = vi.spyOn(Storage.prototype, 'setItem')
  vi.setSystemTime(new Date(2026, 9, 6, 17, 0))
  app.rerender(
    <StrictMode>
      <App initialReference={{ ...lockReference, time: '17:00' }} />
    </StrictMode>,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Next week' }))
  fireEvent.click(screen.getByRole('button', { name: 'Previous week' }))
  expect(screen.getByTestId('plan-reference').textContent).toBe(before)
  expect(localStorage.getItem(SCHEDULE_STORAGE_KEY)).toBe(bytes)
  expect(set).not.toHaveBeenCalled()
})

it('editing the related assignment resolves an estimate conflict without rewriting scheduling intent', () => {
  const schedule = lockSchedule()
  schedule.lockedBlocks = [lockFixture()]
  launch(lockAcademic(30), schedule)
  const scheduleBytes = localStorage.getItem(SCHEDULE_STORAGE_KEY)
  fireEvent.click(screen.getByRole('button', { name: 'Edit assignment: Cell homework' }))
  const dialog = within(screen.getByRole('dialog'))
  fireEvent.change(dialog.getByLabelText(/Estimated work/), { target: { value: '90' } })
  fireEvent.click(dialog.getByRole('button', { name: 'Save changes' }))
  expect(screen.queryByText('Schedule needs attention')).toBeNull()
  expect(screen.getByRole('button', { name: /^Locked study:/ })).toBeTruthy()
  expect(screen.getByRole('button', { name: /^Study:/ }).textContent).toContain('45 min')
  expect(localStorage.getItem(SCHEDULE_STORAGE_KEY)).toBe(scheduleBytes)
})
