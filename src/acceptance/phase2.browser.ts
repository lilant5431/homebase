declare const process: { env: { HOMEBASE_PREVIEW_URL?: string } }
/** Reproducible production-build acceptance, outside npm test. See docs/acceptance/phase-2.md. */
import { chromium, type Page, type Browser } from 'playwright'
import { expect } from 'playwright/test'
import type { AcademicData } from '../domain.ts'
import type { ScheduleData } from '../scheduleData.ts'

const url = process.env.HOMEBASE_PREVIEW_URL ?? 'http://127.0.0.1:4174'
const output = 'test-results/phase-2'
function ensure(condition: unknown, message?: string): asserts condition {
  expect(condition, message).toBeTruthy()
}
function equal(actual: unknown, expected: unknown, message?: string) {
  expect(actual, message).toBe(expected)
}
function same(actual: unknown, expected: unknown, message?: string) {
  expect(actual, message).toEqual(expected)
}

const date = '2026-10-12'
const clock = new Date(`${date}T15:00:00-04:00`)
const academicKey = 'homebase.academic.v1'
const scheduleKey = 'homebase.schedule.v1'
const viewports = {
  desktop: { width: 1440, height: 1000 },
  tablet: { width: 820, height: 1180 },
  phone: { width: 390, height: 844 },
  phoneLandscape: { width: 844, height: 390 },
  smallPhoneLandscape: { width: 667, height: 375 },
}

async function navigate(page: Page, name: string) {
  const menu = page.getByRole('button', { name: 'Open menu', exact: true })
  if (await menu.isVisible()) await menu.click()
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('button', { name, exact: true })
    .click()
}
async function readSource(page: Page) {
  const bytes = await page.evaluate(
    ({ academicKey, scheduleKey }) => ({
      academic: localStorage.getItem(academicKey),
      schedule: localStorage.getItem(scheduleKey),
    }),
    { academicKey, scheduleKey },
  )
  const academic: unknown = bytes.academic === null ? null : JSON.parse(bytes.academic)
  const schedule: unknown = bytes.schedule === null ? null : JSON.parse(bytes.schedule)
  return { bytes, academic: academic as AcademicData | null, schedule: schedule as ScheduleData | null }
}
async function auditSource(page: Page) {
  const source = await readSource(page)
  ensure(source.academic && source.schedule)
  equal(source.academic.version, 1)
  equal(source.schedule.version, 1)
  same(Object.keys(source.schedule).sort(), ['lockedBlocks', 'planningWindows', 'version'])
  for (const window of source.schedule.planningWindows)
    same(Object.keys(window).sort(), ['date', 'endTime', 'id', 'startTime'])
  for (const lock of source.schedule.lockedBlocks)
    same(Object.keys(lock).sort(), [
      'assignmentId',
      'blockId',
      'date',
      'durationMinutes',
      'endTime',
      'startTime',
    ])
  return source as typeof source & { academic: AcademicData; schedule: ScheduleData }
}
async function cards(page: Page) {
  return (
    page
      // Hidden background cards must remain unchanged during a failed editor save.
      .getByRole('button', { name: /^(Study|Locked study):/, includeHidden: true })
      .evaluateAll((elements) =>
        elements.map((element) => ({ label: element.getAttribute('aria-label'), text: element.textContent })),
      )
  )
}
async function checkLayout(page: Page) {
  ensure(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
    'Unexpected horizontal overflow',
  )
  equal(await page.locator('button button, button input, button a, a button').count(), 0)
}
async function checkTouchTargets(page: Page, selector: string) {
  for (const control of await page.locator(selector).all()) {
    const box = await control.boundingBox()
    ensure(
      box && box.width >= 44 && box.height >= 44,
      `${(await control.getAttribute('aria-label')) ?? (await control.textContent())}: touch target ${box?.width}×${box?.height}px is below 44×44px`,
    )
  }
}
async function createClass(page: Page) {
  await navigate(page, 'Classes')
  await page.getByRole('button', { name: 'Add class', exact: true }).first().click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Class name').fill('Biology')
  await dialog.getByRole('button', { name: 'Add class', exact: true }).click()
  await expect(dialog).toHaveCount(0)
}
async function createAssignment(page: Page, title: string, estimate: number, dueDate: string) {
  await page.getByRole('button', { name: 'New assignment', exact: true }).first().click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Title', { exact: true }).fill(title)
  await dialog.getByRole('combobox', { name: /Class/ }).selectOption({ label: 'Biology' })
  await dialog.getByLabel('Due date', { exact: true }).fill(dueDate)
  await dialog.getByLabel(/^Time/).fill('21:00')
  await dialog.getByLabel(/^Estimated work/).fill(String(estimate))
  await dialog.getByRole('button', { name: 'Add assignment', exact: true }).click()
  await expect(dialog).toHaveCount(0)
}
async function contextFor(browser: Browser, url: string, viewport: { width: number; height: number }) {
  const context = await browser.newContext({ viewport, timezoneId: 'America/New_York', locale: 'en-US' })
  const page = await context.newPage()
  await page.clock.setFixedTime(clock)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(url)
  return { context, page, errors }
}
async function changeCommitmentEnd(page: Page, end: string) {
  await page.getByRole('button', { name: /Practice.*Commitment/ }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('End time').fill(end)
  await dialog.getByRole('button', { name: 'Save changes', exact: true }).click()
  await expect(dialog).toHaveCount(0)
}
async function mainWorkflow(
  browser: Browser,
  url: string,
  name: string,
  viewport: { width: number; height: number },
) {
  const { context, page, errors } = await contextFor(browser, url, viewport)
  try {
    same(
      (await readSource(page)).bytes,
      { academic: null, schedule: null },
      'Clean context must not initialize storage',
    )
    await createClass(page)
    await createAssignment(page, 'Urgent essay', 150, date)
    await createAssignment(page, 'Later reading', 30, '2026-10-13')
    await navigate(page, 'Weekly Planner')
    await expect(page.getByRole('heading', { name: 'Unscheduled work' })).toBeVisible()
    await expect(page.getByText('150 minutes could not fit in your available study time.')).toBeVisible()
    await page.getByRole('button', { name: 'Add availability for Oct 12', exact: true }).click()
    let dialog = page.getByRole('dialog')
    await dialog.getByLabel('Start time').fill('16:00')
    await dialog.getByLabel('End time').fill('19:00')
    await dialog.getByRole('button', { name: 'Save availability', exact: true }).click()
    await expect(dialog).toHaveCount(0)
    await page.getByRole('button', { name: 'Add commitment', exact: true }).click()
    dialog = page.getByRole('dialog')
    await dialog.getByLabel('Commitment name').fill('Practice')
    await dialog.getByLabel('Date', { exact: true }).fill(date)
    await dialog.getByLabel('Start time').fill('17:00')
    await dialog.getByLabel('End time').fill('18:00')
    await dialog.getByRole('button', { name: 'Add commitment', exact: true }).click()
    await expect(dialog).toHaveCount(0)
    const generated = await cards(page)
    equal(generated.length, 2)
    same(
      generated.map((card) => card.label),
      ['Study: Urgent essay, 4:00 PM–5:00 PM', 'Study: Urgent essay, 6:00 PM–7:00 PM'],
    )
    ensure(generated.every((card) => card.text?.includes('60 min')))
    await expect(page.getByRole('button', { name: /Later reading.*30 minutes could not fit/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Urgent essay.*30 minutes could not fit/ })).toBeVisible()
    const before = await auditSource(page)
    await page
      .getByRole('button', { name: /Customize study: Urgent essay/ })
      .first()
      .click()
    dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('heading', { name: 'Customize study session', exact: true })).toBeVisible()
    await checkTouchTargets(page, '.locked-session-modal button,.locked-session-modal input')
    ensure(
      await dialog
        .getByLabel('Date', { exact: true })
        .evaluate((element) => document.activeElement === element),
      'Initial date focus',
    )
    await dialog.getByLabel('Date', { exact: true }).fill(date)
    await dialog.getByLabel('Start time').fill('18:15')
    await dialog.getByLabel('End time').fill('18:45')
    await checkLayout(page)
    await dialog.getByRole('button', { name: 'Lock session', exact: true }).click()
    await expect(dialog).toHaveCount(0)
    const locked = await auditSource(page),
      lock = locked.schedule.lockedBlocks[0]
    equal(locked.bytes.academic, before.bytes.academic, 'Manual save must not touch academic source')
    equal(lock.durationMinutes, 30)
    equal(lock.assignmentId, locked.academic.assignments.find((item) => item.title === 'Urgent essay')!.id)
    equal(lock.startTime, '18:15')
    equal(lock.endTime, '18:45')
    equal(
      (await cards(page)).reduce((sum, card) => sum + Number(/(\d+) min/.exec(card.text ?? '')?.[1]), 0),
      120,
    )
    equal(await page.getByRole('button', { name: /^Study:/ }).count(), 3)
    await expect(page.getByText('Manual', { exact: true })).toBeVisible()
    await checkTouchTargets(page, '.session-actions button')
    await expect(page.getByText('Recommended', { exact: true }).first()).toBeVisible()
    for (const [start, end] of [
      ['18:00', '18:30'],
      ['18:15', '18:45'],
    ]) {
      await page.getByRole('button', { name: /Edit locked study:/ }).click()
      dialog = page.getByRole('dialog')
      await dialog.getByLabel('Start time').fill(start)
      await dialog.getByLabel('End time').fill(end)
      await dialog.getByRole('button', { name: 'Save changes', exact: true }).click()
      await expect(dialog).toHaveCount(0)
      const saved = await auditSource(page),
        snapshot = await cards(page),
        reference = await page.getByTestId('plan-reference').textContent()
      equal(saved.schedule.lockedBlocks[0].blockId, lock.blockId)
      equal(saved.bytes.academic, before.bytes.academic)
      await page.reload()
      await navigate(page, 'Weekly Planner')
      same(await cards(page), snapshot, 'Same source/reference must re-derive the same sessions')
      same((await readSource(page)).bytes, saved.bytes)
      equal(await page.getByTestId('plan-reference').textContent(), reference)
    }
    // Opening/cancel/Escape and week browsing must not change sources or reference.
    const stable = await readSource(page),
      stableReference = await page.getByTestId('plan-reference').textContent()
    await page.clock.setFixedTime(new Date(`${date}T15:10:00-04:00`))
    await page.getByRole('button', { name: /Edit locked study:/ }).click()
    dialog = page.getByRole('dialog')
    const last = dialog.getByRole('button', { name: 'Save changes', exact: true })
    await last.focus()
    await page.keyboard.press('Tab')
    ensure(
      await dialog
        .getByRole('button', { name: 'Close session editor' })
        .evaluate((element) => document.activeElement === element),
    )
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await page
      .getByRole('button', { name: /Customize study:/ })
      .first()
      .click()
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click()
    await page.getByRole('button', { name: 'Next week' }).click()
    await page.getByRole('button', { name: 'Previous week' }).click()
    equal(await page.getByTestId('plan-reference').textContent(), stableReference)
    same((await readSource(page)).bytes, stable.bytes)
    await page.getByRole('button', { name: 'Refresh plan', exact: true }).click()
    await expect(page.getByTestId('plan-reference')).toContainText('15:10')
    same((await readSource(page)).bytes, stable.bytes)
    // A real academic edit creates an availability conflict with the persisted lock.
    await changeCommitmentEnd(page, '18:30')
    await expect(page.getByRole('heading', { name: 'Schedule needs attention' })).toBeVisible()
    equal((await cards(page)).length, 0, 'Conflicts must not display a partial schedule')
    await expect(page.getByText(/outside available study time or overlaps a commitment/)).toBeVisible()
    await expect(page.getByRole('button', { name: /Unlock session:/ })).toBeVisible()
    equal(await page.getByRole('button', { name: /Edit locked study:|Customize study:/ }).count(), 0)
    equal((await auditSource(page)).bytes.schedule, stable.bytes.schedule)
    await checkLayout(page)
    await page.screenshot({ path: `${output}/${name}-conflict.png`, fullPage: true })
    await changeCommitmentEnd(page, '18:00')
    await expect(page.getByRole('heading', { name: 'Schedule needs attention' })).toHaveCount(0)
    equal((await auditSource(page)).schedule.lockedBlocks[0].blockId, lock.blockId)
    // Select the assignment editor from a session without creating another lock.
    await page
      .getByRole('button', { name: /Customize study:/ })
      .first()
      .click()
    await page.getByRole('dialog').getByRole('button', { name: 'Edit assignment', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Edit assignment', exact: true })).toBeVisible()
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click()
    await checkLayout(page)
    await page.screenshot({ path: `${output}/${name}-locked.png`, fullPage: true })
    page.once('dialog', (confirmation) => {
      void confirmation.accept()
    })
    await page.getByRole('button', { name: /Unlock session:/ }).click()
    await expect(page.getByRole('button', { name: /^Locked study:/ })).toHaveCount(0)
    const unlocked = await auditSource(page)
    same(unlocked.schedule.lockedBlocks, [])
    same(
      unlocked.academic.assignments.map((item) => [item.title, item.estimatedMinutes, item.completed]),
      [
        ['Urgent essay', 150, false],
        ['Later reading', 30, false],
      ],
    )
    same(await cards(page), generated)
    same(unlocked.schedule.planningWindows, before.schedule.planningWindows)
    await expect(page.getByRole('button', { name: /Urgent essay.*30 minutes could not fit/ })).toBeVisible()
    same(errors, [])
    console.log(
      `${name}: full empty-storage capture → schedule → lock/edit → repeated reload → conflict/repair → unlock PASS`,
    )
  } finally {
    await context.close()
  }
}

type FaultWindow = Window &
  typeof globalThis & {
    restoreAcceptanceFault?: () => void
    readScheduleBeforeFault?: () => string | null
    acceptanceScheduleWrites?: number
  }
function boundarySources(): { academic: AcademicData; schedule: ScheduleData } {
  return {
    academic: {
      version: 1,
      classes: [{ id: 'class', name: 'Biology', color: '#6b8b74', createdAt: 'created' }],
      assignments: [
        {
          id: 'a',
          classId: 'class',
          title: 'Boundary task',
          dueDate: date,
          dueTime: '21:00',
          estimatedMinutes: 30,
          completed: false,
          createdAt: 'created',
          updatedAt: 'updated',
        },
      ],
      assessments: [],
      commitments: [],
    },
    schedule: {
      version: 1,
      planningWindows: [{ id: 'window', date, startTime: '15:00', endTime: '16:00' }],
      lockedBlocks: [],
    },
  }
}
async function boundaryFaults(
  browser: Browser,
  url: string,
  name: string,
  viewport: { width: number; height: number },
) {
  const { context, page, errors } = await contextFor(browser, url, viewport)
  try {
    // Only boundary scenarios seed fixtures; the primary scenario captures everything through forms.
    await page.evaluate(({ academic, schedule }) => {
      localStorage.setItem('homebase.academic.v1', JSON.stringify(academic))
      localStorage.setItem('homebase.schedule.v1', JSON.stringify(schedule))
    }, boundarySources())
    await page.reload()
    await navigate(page, 'Weekly Planner')
    await page.getByRole('button', { name: /Customize study:/ }).click()
    // Real write succeeds, but current Date advances during it. No planner/save function is mocked.
    await page.evaluate(() => {
      const testWindow = window as FaultWindow
      const before = Date,
        write = Storage.prototype.setItem
      class NextMinuteDate extends before {
        constructor(value?: string | number) {
          super(value ?? '2026-10-12T15:01:00-04:00')
        }
        static now() {
          return new before('2026-10-12T15:01:00-04:00').getTime()
        }
      }
      Storage.prototype.setItem = function (key, value) {
        write.call(this, key, value)
        if (key === 'homebase.schedule.v1') testWindow.Date = NextMinuteDate as DateConstructor
      }
      testWindow.restoreAcceptanceFault = () => {
        testWindow.Date = before
        Storage.prototype.setItem = write
      }
    })
    await page.getByRole('dialog').getByRole('button', { name: 'Lock session', exact: true }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.getByTestId('plan-reference')).toContainText('15:00')
    await expect(page.getByRole('heading', { name: 'Schedule needs attention' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /^Locked study:/ })).toBeVisible()
    equal(
      await page.evaluate(() => new Date().getMinutes()),
      1,
      'Fault must actually advance browser Date during the successful write',
    )
    await page.evaluate(() => {
      ;(window as FaultWindow).restoreAcceptanceFault?.()
    })
    const source = await auditSource(page),
      savedCards = await cards(page),
      reference = await page.getByTestId('plan-reference').textContent()
    await page.clock.setFixedTime(new Date(`${date}T15:10:00-04:00`))
    await page.getByRole('button', { name: /Edit locked study:/ }).click()
    const dialog = page.getByRole('dialog')
    await page.evaluate(() => {
      const testWindow = window as FaultWindow,
        write = Storage.prototype.setItem
      testWindow.acceptanceScheduleWrites = 0
      Storage.prototype.setItem = function (key, value) {
        if (key === 'homebase.schedule.v1') {
          testWindow.acceptanceScheduleWrites!++
          throw new DOMException('Controlled quota failure', 'QuotaExceededError')
        }
        write.call(this, key, value)
      }
      testWindow.restoreAcceptanceFault = () => {
        Storage.prototype.setItem = write
      }
    })
    await dialog.getByLabel('Start time').fill('17:00')
    await dialog.getByLabel('End time').fill('17:30')
    await dialog.getByRole('button', { name: 'Save changes', exact: true }).click()
    await expect(dialog.getByRole('alert')).toContainText('schedule conflict')
    equal(
      await page.evaluate(() => (window as FaultWindow).acceptanceScheduleWrites),
      0,
      'Rejected candidate must never reach storage',
    )
    same((await readSource(page)).bytes, source.bytes)
    await dialog.getByLabel('Start time').fill('15:15')
    await dialog.getByLabel('End time').fill('15:45')
    await dialog.getByRole('button', { name: 'Save changes', exact: true }).click()
    await expect(dialog.getByRole('alert')).toContainText('Browser storage')
    equal(
      await page.evaluate(() => (window as FaultWindow).acceptanceScheduleWrites),
      1,
      'Write fault must reach the real storage boundary',
    )
    same((await readSource(page)).bytes, source.bytes)
    same(await cards(page), savedCards)
    equal(await page.getByTestId('plan-reference').textContent(), reference)
    await page.evaluate(() => {
      ;(window as FaultWindow).restoreAcceptanceFault?.()
    })
    await dialog.getByRole('button', { name: 'Save changes', exact: true }).click()
    await expect(dialog).toHaveCount(0)
    await expect(page.getByTestId('plan-reference')).toContainText('15:10')
    const edited = await auditSource(page)
    equal(edited.schedule.lockedBlocks[0].blockId, source.schedule.lockedBlocks[0].blockId)
    equal(edited.bytes.academic, source.bytes.academic)
    await page.reload()
    await navigate(page, 'Weekly Planner')
    equal((await auditSource(page)).bytes.schedule, edited.bytes.schedule)
    await expect(page.getByRole('button', { name: /^Locked study:/ })).toBeVisible()
    await checkLayout(page)
    same(errors, [])
    console.log(
      `${name}: real-write minute boundary, rejected candidate zero writes, quota rollback/retry, identity and reload PASS`,
    )
  } finally {
    await context.close()
  }
}
async function blockedSource(
  browser: Browser,
  url: string,
  name: string,
  viewport: { width: number; height: number },
  kind: 'invalid' | 'unsupportedVersion' | 'unavailable',
) {
  const { context, page, errors } = await contextFor(browser, url, viewport)
  try {
    const raw =
      kind === 'invalid'
        ? '{broken'
        : kind === 'unsupportedVersion'
          ? JSON.stringify({ version: 77, future: [] })
          : JSON.stringify(boundarySources().schedule)
    await page.evaluate((raw) => localStorage.setItem('homebase.schedule.v1', raw), raw)
    await page.addInitScript((kind) => {
      const testWindow = window as FaultWindow,
        read = Storage.prototype.getItem,
        write = Storage.prototype.setItem
      testWindow.acceptanceScheduleWrites = 0
      testWindow.readScheduleBeforeFault = () => read.call(localStorage, 'homebase.schedule.v1')
      Storage.prototype.setItem = function (key, value) {
        if (key === 'homebase.schedule.v1') testWindow.acceptanceScheduleWrites!++
        write.call(this, key, value)
      }
      if (kind === 'unavailable')
        Storage.prototype.getItem = function (key) {
          if (key === 'homebase.schedule.v1')
            throw new DOMException('Controlled unavailable scheduling storage', 'SecurityError')
          return read.call(this, key)
        }
    }, kind)
    await page.reload()
    await navigate(page, 'Weekly Planner')
    const warning =
      kind === 'invalid'
        ? "couldn't read your saved scheduling data"
        : kind === 'unsupportedVersion'
          ? 'different Homebase version'
          : 'Scheduling storage is unavailable'
    await expect(page.getByRole('alert')).toContainText(warning)
    await expect(
      page.getByRole('button', { name: 'Add availability for Oct 12', exact: true }),
    ).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Refresh plan', exact: true })).toBeDisabled()
    equal(
      await page.getByRole('button', { name: /Customize study:|Edit locked study:|Unlock session:/ }).count(),
      0,
    )
    await checkLayout(page)
    await createClass(page)
    equal(
      await page.evaluate(() => (window as FaultWindow).readScheduleBeforeFault?.()),
      raw,
      'Academic capture must preserve blocked schedule bytes',
    )
    equal(await page.evaluate(() => (window as FaultWindow).acceptanceScheduleWrites), 0)
    const academicBytes = await page.evaluate(() => localStorage.getItem('homebase.academic.v1'))
    ensure(academicBytes?.includes('Biology'), 'Academic screens must remain usable')
    same(errors, [])
    console.log(
      `${name}: ${kind} scheduling source remains byte-identical with zero writes; academic capture works PASS`,
    )
  } finally {
    await context.close()
  }
}

const browser = await chromium.launch({ headless: true })
try {
  for (const [name, viewport] of Object.entries(viewports)) {
    await mainWorkflow(browser, url, name, viewport)
    await boundaryFaults(browser, url, name, viewport)
    for (const kind of ['invalid', 'unsupportedVersion', 'unavailable'] as const)
      await blockedSource(browser, url, name, viewport, kind)
  }
  console.log(`Screenshots: ${output}`)
} finally {
  await browser.close()
}
