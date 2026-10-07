import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { StrictMode } from 'react'
import App from './App'
import { emptyData, type AcademicData } from './domain'
import { emptyScheduleData, type ScheduleData } from './scheduleData'
import { loadScheduleData, saveScheduleData, SCHEDULE_STORAGE_KEY } from './scheduleStorage'
import { saveData } from './storage'

const initialReference = { date: '2026-10-06', time: '16:00' }
function academicFixture(): AcademicData {
  return {
    ...emptyData(),
    classes: [{ id: 'class', name: 'Biology', color: '#6b8b74', createdAt: 'created' }],
    assignments: [
      {
        id: 'a',
        classId: 'class',
        title: 'Cell homework',
        dueDate: initialReference.date,
        dueTime: '22:00',
        estimatedMinutes: 120,
        completed: false,
        createdAt: 'created',
        updatedAt: 'updated',
      },
    ],
  }
}
function scheduleFixture(): ScheduleData {
  return {
    ...emptyScheduleData(),
    planningWindows: [{ id: 'window', date: initialReference.date, startTime: '16:00', endTime: '19:00' }],
  }
}
function launch(academic = academicFixture(), schedule?: ScheduleData) {
  saveData(academic)
  if (schedule) saveScheduleData(schedule)
  render(<App initialReference={initialReference} />)
  fireEvent.click(screen.getByRole('button', { name: 'Weekly view' }))
}
function add(start = '16:00', end = '19:00') {
  fireEvent.click(screen.getByRole('button', { name: 'Add availability for Oct 6' }))
  fill(start, end)
}
function fill(start: string, end: string) {
  const dialog = within(screen.getByRole('dialog'))
  fireEvent.change(dialog.getByLabelText('Start time'), { target: { value: start } })
  fireEvent.change(dialog.getByLabelText('End time'), { target: { value: end } })
  fireEvent.click(dialog.getByRole('button', { name: 'Save availability' }))
}
function studyCards() {
  return screen.queryAllByRole('button', { name: /^(Study|Locked study):/ })
}
function referenceText() {
  return screen.getByTestId('plan-reference').textContent
}

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

describe('Weekly Planner integration', () => {
  it('starts usable without writing an empty schedule and explains explicit availability', () => {
    launch()
    expect(screen.getByText(/Add the times you're available to study/)).toBeTruthy()
    expect(localStorage.getItem(SCHEDULE_STORAGE_KEY)).toBeNull()
    expect(screen.getByRole('button', { name: 'Refresh plan' })).toBeTruthy()
  })
  it('creates availability, updates the plan and persists only source data', () => {
    launch()
    const academic = localStorage.getItem('homebase.academic.v1')
    add()
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(studyCards()).toHaveLength(1)
    expect(studyCards()[0].textContent).toContain('Biology')
    const result = loadScheduleData()
    expect(result.status).toBe('ok')
    if (result.status !== 'ok') throw new Error('Expected persisted schedule')
    expect(result.data.planningWindows[0].id.length).toBeGreaterThan(0)
    expect(Object.keys(result.data)).toEqual(['version', 'planningWindows', 'lockedBlocks'])
    expect(localStorage.getItem('homebase.academic.v1')).toBe(academic)
    cleanup()
    render(<App initialReference={initialReference} />)
    fireEvent.click(screen.getByRole('button', { name: 'Weekly view' }))
    expect(studyCards()).toHaveLength(1)
  })
  it('creates availability with the Safari secure ID fallback', () => {
    const getRandomValues = crypto.getRandomValues.bind(crypto)
    vi.stubGlobal('crypto', { getRandomValues })
    launch()
    add()
    const result = loadScheduleData()
    if (result.status !== 'ok') throw new Error('Expected saved data')
    expect(result.data.planningWindows[0].id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    )
  })
})

function currentSchedule() {
  const result = loadScheduleData()
  if (result.status !== 'ok') throw new Error('Expected saved schedule')
  return result.data
}
function oneLock(startTime = '17:00', endTime = '17:30') {
  return {
    blockId: 'intent',
    assignmentId: 'a',
    date: initialReference.date,
    startTime,
    endTime,
    durationMinutes: 30,
  }
}

describe('availability CRUD and failed persistence', () => {
  it('edits the source ID unchanged and preserves locks', () => {
    const schedule = scheduleFixture()
    schedule.lockedBlocks.push(oneLock())
    launch(academicFixture(), schedule)
    expect(studyCards()).toHaveLength(3)
    fireEvent.click(screen.getByRole('button', { name: 'Edit availability Oct 6 16:00–19:00' }))
    vi.setSystemTime(new Date(2026, 9, 6, 16, 5))
    fill('16:30', '19:00')
    expect(currentSchedule().planningWindows[0]).toEqual({
      ...schedule.planningWindows[0],
      startTime: '16:30',
    })
    expect(currentSchedule().lockedBlocks).toEqual(schedule.lockedBlocks)
    expect(referenceText()).toContain('16:05')
    expect(studyCards()[0].getAttribute('aria-label')).toContain('4:30')
  })
  it('deletes only the selected window after confirmation and retains every lock', () => {
    const schedule = scheduleFixture()
    schedule.lockedBlocks.push(oneLock())
    launch(academicFixture(), schedule)
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    fireEvent.click(screen.getByRole('button', { name: 'Delete availability Oct 6 16:00–19:00' }))
    expect(currentSchedule()).toEqual(schedule)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const academicBytes = localStorage.getItem('homebase.academic.v1')
    fireEvent.click(screen.getByRole('button', { name: 'Delete availability Oct 6 16:00–19:00' }))
    expect(currentSchedule().planningWindows).toEqual([])
    expect(currentSchedule().lockedBlocks).toEqual(schedule.lockedBlocks)
    expect(localStorage.getItem('homebase.academic.v1')).toBe(academicBytes)
    expect(screen.getByText('Schedule needs attention')).toBeTruthy()
    expect(studyCards()).toHaveLength(0)
  })
  it('allows overlapping and adjacent source records without normalization', () => {
    launch(academicFixture(), scheduleFixture())
    add('17:00', '20:00')
    add('20:00', '21:00')
    expect(currentSchedule().planningWindows).toHaveLength(3)
    expect(currentSchedule().planningWindows.map((item) => item.startTime)).toEqual([
      '16:00',
      '17:00',
      '20:00',
    ])
    expect(studyCards()).toHaveLength(1)
  })
  it.each(['16:00', '15:00', ''])('rejects nonpositive or missing end %j without saving', (end) => {
    launch()
    fireEvent.click(screen.getByRole('button', { name: 'Add availability for Oct 6' }))
    const dialog = within(screen.getByRole('dialog'))
    fireEvent.change(dialog.getByLabelText('Start time'), { target: { value: '16:00' } })
    fireEvent.change(dialog.getByLabelText('End time'), { target: { value: end } })
    const form = screen.getByRole('dialog').querySelector('form')
    if (!form) throw new Error('Missing form')
    fireEvent.submit(form)
    expect(dialog.getByRole('alert').textContent).toContain('valid date and times')
    expect(localStorage.getItem(SCHEDULE_STORAGE_KEY)).toBeNull()
  })
  it('retains old sources, generated cards and reference on failed edit; keeps editor open', () => {
    launch(academicFixture(), scheduleFixture())
    const before = localStorage.getItem(SCHEDULE_STORAGE_KEY),
      oldCards = studyCards().map((card) => card.textContent),
      oldReference = referenceText()
    fireEvent.click(screen.getByRole('button', { name: 'Edit availability Oct 6 16:00–19:00' }))
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota')
    })
    vi.setSystemTime(new Date(2026, 9, 6, 17, 0))
    fill('17:30', '19:00')
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByRole('alert').textContent).toContain('previous availability is unchanged')
    expect(localStorage.getItem(SCHEDULE_STORAGE_KEY)).toBe(before)
    expect(studyCards().map((card) => card.textContent)).toEqual(oldCards)
    expect(referenceText()).toBe(oldReference)
    vi.restoreAllMocks()
    fill('17:30', '19:00')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(currentSchedule().planningWindows[0].startTime).toBe('17:30')
    expect(referenceText()).toContain('17:00')
  })
  it('failed create does not show a new window or write the missing key', () => {
    launch()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota')
    })
    add()
    expect(localStorage.getItem(SCHEDULE_STORAGE_KEY)).toBeNull()
    expect(studyCards()).toHaveLength(0)
    expect(screen.queryByRole('button', { name: /Edit availability/ })).toBeNull()
  })
  it('failed delete retains window/plan and does not advance reference', () => {
    launch(academicFixture(), scheduleFixture())
    const oldReference = referenceText(),
      bytes = localStorage.getItem(SCHEDULE_STORAGE_KEY)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota')
    })
    vi.setSystemTime(new Date(2026, 9, 6, 17, 0))
    fireEvent.click(screen.getByRole('button', { name: 'Delete availability Oct 6 16:00–19:00' }))
    expect(referenceText()).toBe(oldReference)
    expect(localStorage.getItem(SCHEDULE_STORAGE_KEY)).toBe(bytes)
    expect(studyCards()).toHaveLength(1)
    expect(screen.getByRole('alert').textContent).toContain('previous availability is unchanged')
  })
})

describe('failure isolation and immutable derived output', () => {
  it.each([
    ['{oops', /couldn't read your saved scheduling data/],
    [JSON.stringify({ version: 2, future: [] }), /different Homebase version/],
  ] as const)(
    'preserves blocked schedule load %s with no writes even after academic changes',
    (bytes, message) => {
      localStorage.setItem(SCHEDULE_STORAGE_KEY, bytes)
      const set = vi.spyOn(Storage.prototype, 'setItem')
      launch()
      expect(screen.getByRole('alert').textContent).toMatch(message)
      expect(
        screen.getByRole('button', { name: 'Add availability for Oct 6' }).hasAttribute('disabled'),
      ).toBe(true)
      fireEvent.click(screen.getByRole('button', { name: 'Add availability for Oct 6' }))
      expect(screen.queryByRole('dialog')).toBeNull()
      fireEvent.click(screen.getByRole('button', { name: 'Refresh plan' }))
      fireEvent.click(screen.getByRole('button', { name: 'Assignments' }))
      fireEvent.click(screen.getByRole('button', { name: 'Complete Cell homework' }))
      expect(localStorage.getItem(SCHEDULE_STORAGE_KEY)).toBe(bytes)
      expect(set.mock.calls.filter(([key]) => key === SCHEDULE_STORAGE_KEY)).toHaveLength(0)
    },
  )
  it('unavailable storage disables schedule editing but academic navigation still works', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Denied')
    })
    render(<App initialReference={initialReference} />)
    fireEvent.click(screen.getByRole('button', { name: 'Weekly view' }))
    expect(screen.getByRole('alert').textContent).toContain('Scheduling storage is unavailable')
    expect(screen.getByRole('button', { name: 'Add availability for Oct 6' }).hasAttribute('disabled')).toBe(
      true,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Classes' }))
    expect(screen.getByRole('heading', { name: 'Classes.' })).toBeTruthy()
  })
  it('structural planner errors stay inside scheduling and never rewrite sources', () => {
    const academic = academicFixture()
    academic.assignments[0].estimatedMinutes = -10
    launch(academic, scheduleFixture())
    const bytes = localStorage.getItem(SCHEDULE_STORAGE_KEY)
    expect(screen.getByText('Study plan unavailable')).toBeTruthy()
    expect(studyCards()).toHaveLength(0)
    fireEvent.click(screen.getByRole('button', { name: 'Assignments' }))
    expect(screen.getByText('Cell homework')).toBeTruthy()
    expect(localStorage.getItem(SCHEDULE_STORAGE_KEY)).toBe(bytes)
  })
  it('week navigation and refresh never persist generated or transient data', () => {
    launch(academicFixture(), scheduleFixture())
    const bytes = localStorage.getItem(SCHEDULE_STORAGE_KEY),
      set = vi.spyOn(Storage.prototype, 'setItem')
    fireEvent.click(screen.getByRole('button', { name: 'Next week' }))
    expect(studyCards()).toHaveLength(0)
    fireEvent.click(screen.getByRole('button', { name: 'Previous week' }))
    expect(studyCards()).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'Refresh plan' }))
    expect(localStorage.getItem(SCHEDULE_STORAGE_KEY)).toBe(bytes)
    expect(set).not.toHaveBeenCalled()
    expect(Object.keys(currentSchedule())).toEqual(['version', 'planningWindows', 'lockedBlocks'])
  })
  it('sample data does not create implicit availability', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<App initialReference={initialReference} />)
    fireEvent.click(screen.getByRole('button', { name: 'Explore with sample data' }))
    fireEvent.click(screen.getByRole('button', { name: 'Weekly view' }))
    expect(screen.getByText(/Add the times you're available to study/)).toBeTruthy()
    expect(studyCards()).toHaveLength(0)
    expect(localStorage.getItem(SCHEDULE_STORAGE_KEY)).toBeNull()
  })
})

describe('derived session, unscheduled and lock presentation', () => {
  it('shows generated blocks around a protected commitment and opens the assignment editor', () => {
    const academic = academicFixture()
    academic.commitments.push({
      id: 'c',
      title: 'Practice',
      date: initialReference.date,
      startTime: '17:00',
      endTime: '18:00',
      createdAt: 'created',
    })
    launch(academic, scheduleFixture())
    expect(studyCards()).toHaveLength(2)
    expect(studyCards()[0].getAttribute('aria-label')).toContain('4:00')
    expect(studyCards()[1].getAttribute('aria-label')).toContain('6:00')
    expect(screen.getByText('Practice')).toBeTruthy()
    fireEvent.click(studyCards()[0])
    expect(screen.getByRole('heading', { name: 'Edit assignment' })).toBeTruthy()
  })
  it.each([
    [undefined, /Add an estimate/],
    [0, /0-minute estimate/],
    [240, /60 minutes could not fit/],
  ] as const)('shows unscheduled estimate/capacity reason %s', (estimate, message) => {
    const academic = academicFixture()
    academic.assignments[0].estimatedMinutes = estimate
    launch(academic, scheduleFixture())
    expect(screen.getByText('Unscheduled work')).toBeTruthy()
    expect(screen.getByText(message)).toBeTruthy()
  })
  it('shows the distinct deadline shortage', () => {
    const academic = academicFixture()
    academic.assignments[0].dueTime = '16:30'
    launch(academic, scheduleFixture())
    expect(screen.getByText('90 minutes could not be scheduled before the deadline.')).toBeTruthy()
  })
  it('valid locked sessions are distinct from generated ones and expose manual controls', () => {
    const schedule = scheduleFixture()
    schedule.lockedBlocks.push(oneLock())
    launch(academicFixture(), schedule)
    expect(screen.getAllByText(/LOCKED STUDY/)).toHaveLength(1)
    expect(
      studyCards().filter((card) => card.getAttribute('aria-label')?.startsWith('Locked study:')),
    ).toHaveLength(1)
    expect(screen.getByRole('button', { name: /Edit locked study:/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Unlock session: Cell homework/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /^(Move|Resize) session/ })).toBeNull()
  })
  it('crossing locks show attention state atomically without generated sessions', () => {
    const schedule = scheduleFixture()
    schedule.lockedBlocks.push(oneLock('15:45', '16:15'))
    launch(academicFixture(), schedule)
    expect(screen.getByText('Schedule needs attention')).toBeTruthy()
    expect(screen.getByText(/starts before the plan reference/)).toBeTruthy()
    expect(studyCards()).toHaveLength(0)
    expect(currentSchedule().lockedBlocks).toEqual(schedule.lockedBlocks)
  })
  it('fully elapsed intent remains stored, gives no credit, and is not an upcoming card', () => {
    const schedule = scheduleFixture()
    schedule.lockedBlocks.push(oneLock('15:30', '16:00'))
    launch(academicFixture(), schedule)
    expect(studyCards()).toHaveLength(1)
    expect(studyCards()[0].textContent).toContain('120 min')
    expect(screen.getByText(/past locked sessions are retained/)).toBeTruthy()
    expect(currentSchedule().lockedBlocks).toEqual(schedule.lockedBlocks)
    expect(screen.queryByText('Schedule needs attention')).toBeNull()
  })
})

describe('explicit reference lifecycle', () => {
  it('captures now on initialization when no bootstrap reference was supplied', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Weekly view' }))
    expect(referenceText()).toContain('16:00')
  })
  it('initialization reference survives StrictMode rendering and prop rerenders with no timers', () => {
    saveData(academicFixture())
    saveScheduleData(scheduleFixture())
    const setInterval = vi.spyOn(globalThis, 'setInterval')
    const app = render(
      <StrictMode>
        <App initialReference={initialReference} />
      </StrictMode>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Weekly view' }))
    const before = referenceText()
    vi.setSystemTime(new Date(2026, 9, 6, 17, 0))
    app.rerender(
      <StrictMode>
        <App initialReference={{ ...initialReference, time: '17:00' }} />
      </StrictMode>,
    )
    expect(referenceText()).toBe(before)
    expect(setInterval).not.toHaveBeenCalled()
  })
  it('only Refresh plan advances time when browsing weeks or re-rendering', () => {
    launch(academicFixture(), scheduleFixture())
    const before = referenceText()
    vi.setSystemTime(new Date(2026, 9, 6, 17, 0))
    fireEvent.click(screen.getByRole('button', { name: 'Next week' }))
    fireEvent.click(screen.getByRole('button', { name: 'Previous week' }))
    fireEvent.click(screen.getByRole('button', { name: 'Today' }))
    expect(referenceText()).toBe(before)
    expect(studyCards()[0].getAttribute('aria-label')).toContain('4:00')
    fireEvent.click(screen.getByRole('button', { name: 'Refresh plan' }))
    expect(referenceText()).toContain('17:00')
    expect(studyCards()[0].getAttribute('aria-label')).toContain('5:00')
  })
  it('successful academic completion refreshes reference without writing scheduling state', () => {
    launch(academicFixture(), scheduleFixture())
    const bytes = localStorage.getItem(SCHEDULE_STORAGE_KEY)
    vi.setSystemTime(new Date(2026, 9, 6, 17, 0))
    fireEvent.click(screen.getByRole('button', { name: 'Assignments' }))
    fireEvent.click(screen.getByRole('button', { name: 'Complete Cell homework' }))
    fireEvent.click(screen.getByRole('button', { name: 'Weekly view' }))
    expect(referenceText()).toContain('17:00')
    expect(studyCards()).toHaveLength(0)
    expect(localStorage.getItem(SCHEDULE_STORAGE_KEY)).toBe(bytes)
  })
})

describe('readable conflict coverage', () => {
  it.each([
    ['assignmentMissing', /assignment that was deleted/],
    ['assignmentCompleted', /completed assignment/],
    ['missingEstimate', /needs a work estimate/],
    ['zeroEstimate', /0-minute estimate/],
    ['outsideAvailability', /outside available study time/],
    ['afterDeadline', /ends after its assignment deadline/],
    ['overlapsLockedBlock', /Two locked study sessions overlap/],
    ['lockedTimeExceedsEstimate', /Locked study time exceeds/],
  ] as const)('maps %s without inventing a partial plan or changing intent', (reason, message) => {
    const academic = academicFixture(),
      schedule = scheduleFixture()
    schedule.lockedBlocks.push(oneLock())
    switch (reason) {
      case 'assignmentMissing':
        schedule.lockedBlocks[0].assignmentId = 'deleted'
        break
      case 'assignmentCompleted':
        academic.assignments[0].completed = true
        break
      case 'missingEstimate':
        academic.assignments[0].estimatedMinutes = undefined
        break
      case 'zeroEstimate':
        academic.assignments[0].estimatedMinutes = 0
        break
      case 'outsideAvailability':
        schedule.planningWindows = []
        break
      case 'afterDeadline':
        academic.assignments[0].dueTime = '16:30'
        break
      case 'overlapsLockedBlock':
        schedule.lockedBlocks.push({ ...oneLock(), blockId: 'duplicate time' })
        break
      case 'lockedTimeExceedsEstimate':
        academic.assignments[0].estimatedMinutes = 15
        break
    }
    launch(academic, schedule)
    expect(screen.getByText('Schedule needs attention')).toBeTruthy()
    expect(screen.getByText(message)).toBeTruthy()
    expect(studyCards()).toHaveLength(0)
    expect(currentSchedule()).toEqual(schedule)
  })
})

it.each([
  ['Date', ''],
  ['Date', '2026-02-29'],
  ['Start time', '24:00'],
  ['Start time', 'invalid'],
  ['End time', '24:00'],
] as const)('invalid availability input %s=%j never reaches storage', (label, value) => {
  launch()
  fireEvent.click(screen.getByRole('button', { name: 'Add availability for Oct 6' }))
  const dialog = within(screen.getByRole('dialog'))
  fireEvent.change(dialog.getByLabelText('Start time'), { target: { value: '16:00' } })
  fireEvent.change(dialog.getByLabelText('End time'), { target: { value: '19:00' } })
  fireEvent.change(dialog.getByLabelText(label), { target: { value } })
  const form = screen.getByRole('dialog').querySelector('form')
  if (!form) throw new Error('Missing form')
  fireEvent.submit(form)
  expect(dialog.getByRole('alert').textContent).toContain('valid date and times')
  expect(localStorage.getItem(SCHEDULE_STORAGE_KEY)).toBeNull()
})

it('missing secure randomness reports an editor error without claiming a save', () => {
  launch()
  vi.stubGlobal('crypto', {})
  add()
  expect(screen.getByRole('alert').textContent).toContain('Secure ID generation')
  expect(localStorage.getItem(SCHEDULE_STORAGE_KEY)).toBeNull()
  expect(screen.getByRole('dialog')).toBeTruthy()
})

it('failed academic persistence retains the reference while preserving existing academic error behavior', () => {
  launch(academicFixture(), scheduleFixture())
  const before = referenceText()
  vi.setSystemTime(new Date(2026, 9, 6, 17, 0))
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('Quota')
  })
  fireEvent.click(screen.getByRole('button', { name: 'Assignments' }))
  fireEvent.click(screen.getByRole('button', { name: 'Complete Cell homework' }))
  expect(screen.getByRole('alert').textContent).toContain('could not save changes')
  fireEvent.click(screen.getByRole('button', { name: 'Weekly view' }))
  expect(referenceText()).toBe(before)
})
