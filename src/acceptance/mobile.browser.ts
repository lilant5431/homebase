/** Phone form/navigation regressions. Run against the production preview on port 4174. */
import { chromium, type Page } from 'playwright'
import { expect } from 'playwright/test'

const sizes = [
  { width: 390, height: 844 },
  { width: 844, height: 390 },
  { width: 667, height: 375 },
]
async function modalGeometry(page: Page) {
  const dialog = page.getByRole('dialog')
  for (const field of await dialog.locator('input:not([type=radio]),select,textarea').all())
    expect(
      await field.evaluate((node) => Number.parseFloat(getComputedStyle(node).fontSize)),
      'Safari focus-zoom threshold',
    ).toBeGreaterThanOrEqual(16)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    await page.evaluate(() => innerWidth),
  )
  const bounds = await dialog.boundingBox()
  expect(bounds!.x).toBeGreaterThanOrEqual(0)
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(await page.evaluate(() => innerWidth))
  expect(
    await dialog.evaluate((node) => node.scrollWidth),
    'The scrollable form must not clip content horizontally',
  ).toBeLessThanOrEqual(await dialog.evaluate((node) => node.clientWidth))
  await dialog.getByRole('button', { name: /Cancel/ }).scrollIntoViewIfNeeded()
  await expect(dialog.getByRole('button', { name: /Cancel/ })).toBeInViewport()
}
/** Measure actual native controls against their labels and the padded form content. */
async function dateTimeGeometry(page: Page, stage: string) {
  const dialog = page.getByRole('dialog')
  const fields = dialog.locator('.form-grid input[type=date], .form-grid input[type=time]')
  await expect(fields).toHaveCount(2)
  const geometry = await fields.evaluateAll((inputs) =>
    inputs.map((input) => {
      const label = input.parentElement!,
        grid = label.parentElement!,
        body = grid.closest('.modal-body')!
      const bounds = input.getBoundingClientRect(),
        parent = label.getBoundingClientRect(),
        form = body.getBoundingClientRect()
      const style = getComputedStyle(input),
        padding = getComputedStyle(body)
      return {
        type: (input as HTMLInputElement).type,
        left: bounds.left,
        right: bounds.right,
        width: bounds.width,
        labelLeft: parent.left,
        labelRight: parent.right,
        contentLeft: form.left + Number.parseFloat(padding.paddingLeft),
        contentRight: form.right - Number.parseFloat(padding.paddingRight),
        fontSize: Number.parseFloat(style.fontSize),
        appearance: style.appearance,
        scrollWidth: input.scrollWidth,
        clientWidth: input.clientWidth,
      }
    }),
  )
  for (const field of geometry) {
    expect(field.left, `${field.type} stays inside its label`).toBeGreaterThanOrEqual(field.labelLeft - 0.5)
    expect(field.right, `${field.type} stays inside its label`).toBeLessThanOrEqual(field.labelRight + 0.5)
    expect(field.left).toBeGreaterThanOrEqual(field.contentLeft - 0.5)
    expect(field.right).toBeLessThanOrEqual(field.contentRight + 0.5)
    expect(field.left, 'Date and Time use the same left content edge').toBeCloseTo(field.contentLeft, 0)
    expect(field.right, 'Date and Time use the same right content edge').toBeCloseTo(field.contentRight, 0)
    expect(field.fontSize).toBeGreaterThanOrEqual(16)
    expect(field.appearance, 'Keep native picker styling').not.toBe('none')
    expect(field.scrollWidth, 'Do not hide control overflow').toBeLessThanOrEqual(field.clientWidth + 1)
  }
  expect(geometry[0].width).toBeCloseTo(geometry[1].width, 0)
  for (const field of await fields.all()) {
    const original = await field.inputValue()
    const value = (await field.getAttribute('type')) === 'date' ? '2026-10-12' : '17:30'
    await field.focus()
    await expect(field).toBeFocused()
    await field.fill(value)
    await expect(field).toHaveValue(value)
    await field.fill(original)
  }
  console.log(`${stage} date/time geometry: ${JSON.stringify(geometry)}`)
}
async function navigate(page: Page, name: string) {
  await page.getByRole('button', { name: 'Open menu', exact: true }).click()
  const item = page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('button', { name, exact: true })
  await item.scrollIntoViewIfNeeded()
  await expect(item).toBeInViewport()
  await item.click({ timeout: 3000 })
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
    'Page overflow must be checked with background scrolling unlocked',
  ).toBeLessThanOrEqual(await page.evaluate(() => innerWidth))
}
async function focusedFieldVisible(page: Page) {
  // No test scrolling helper: native browser focus must reveal the active field.
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const field = document.activeElement
          const dialog = field?.closest('[role="dialog"]')
          if (!(field instanceof HTMLElement) || !(dialog instanceof HTMLElement)) return false
          const bounds = field.getBoundingClientRect()
          // A textarea may extend below the viewport while its active first text
          // line remains visible. These cases enter one line; inputs must fit fully.
          const style = getComputedStyle(field)
          const editingBottom =
            field instanceof HTMLTextAreaElement
              ? bounds.top + Number.parseFloat(style.paddingTop) + Number.parseFloat(style.fontSize) * 1.5
              : bounds.bottom
          return (
            bounds.top >= 0 && editingBottom <= innerHeight && bounds.left >= 0 && bounds.right <= innerWidth
          )
        }),
      { message: 'Focused field must be visible without test-side scrolling' },
    )
    .toBe(true)
}
const browser = await chromium.launch({ headless: true })
try {
  for (const viewport of sizes) {
    const context = await browser.newContext({
      viewport,
      isMobile: true,
      hasTouch: true,
      locale: 'en-US',
      timezoneId: 'America/New_York',
    })
    const page = await context.newPage()
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.clock.setFixedTime(new Date('2026-10-12T15:00:00-04:00'))
    try {
      await page.goto('http://127.0.0.1:4174')
      // Rotate with the drawer open, then reach every item, not just the first screenful.
      await page.getByRole('button', { name: 'Open menu' }).click()
      await page.setViewportSize({ width: 667, height: 375 })
      await page
        .getByRole('navigation', { name: 'Main navigation' })
        .getByRole('button', { name: 'Classes', exact: true })
        .scrollIntoViewIfNeeded()
      const last = await page
        .getByRole('navigation', { name: 'Main navigation' })
        .getByRole('button', { name: 'Classes', exact: true })
        .boundingBox()
      expect(
        last!.y + last!.height,
        'Classes must be reachable within the landscape drawer',
      ).toBeLessThanOrEqual(375)
      await page
        .getByRole('navigation', { name: 'Main navigation' })
        .getByRole('button', { name: 'Classes', exact: true })
        .click({ timeout: 3000 })
      await page.setViewportSize(viewport)
      for (const name of ['Overview', 'Weekly view', 'Assignments', 'Assessments', 'Commitments', 'Classes'])
        await navigate(page, name)
      await page.getByRole('button', { name: 'Add class', exact: true }).first().click()
      await modalGeometry(page)
      expect(
        await page
          .getByRole('dialog')
          .getByLabel('Class name')
          .evaluate((node) => node === document.activeElement),
        'Opening a form must not summon the text keyboard automatically',
      ).toBe(false)
      await page.getByLabel('Class name').fill('Mobile biology')
      await page.getByRole('dialog').getByRole('button', { name: 'Add class', exact: true }).click()
      await page.getByRole('button', { name: 'New assignment', exact: true }).first().click()
      await modalGeometry(page)
      await dateTimeGeometry(page, 'create')
      const records = await page.evaluate(() => ({
        academic: localStorage.getItem('homebase.academic.v1'),
        schedule: localStorage.getItem('homebase.schedule.v1'),
      }))
      // This catches the former fixed-body/nested-scroll architecture without inventing
      // keyboard metrics. The reduced *real* viewport exercises browser focus scrolling,
      // but cannot reproduce an iPhone's visual-only keyboard occlusion/compositor.
      expect(await page.evaluate(() => getComputedStyle(document.body).position)).not.toBe('fixed')
      expect(await page.locator('#root').evaluate((node) => getComputedStyle(node).display)).toBe('none')
      expect(await page.locator('.modal-viewport').evaluate((node) => getComputedStyle(node).position)).toBe(
        'static',
      )
      expect(await page.getByRole('dialog').evaluate((node) => getComputedStyle(node).overflowY)).toBe(
        'visible',
      )
      await page.setViewportSize({ width: viewport.width, height: 210 })
      for (const [label, value] of [
        ['Title', 'Keyboard task'],
        ['Estimated work', '350'],
        ['Notes', 'Visible notes'],
        ['Title', 'Keyboard task while typing'],
      ]) {
        const field = page.getByRole('dialog').getByLabel(new RegExp(`^${label}`))
        await field.focus()

        await focusedFieldVisible(page)
        await field.fill(value)
        await expect(field).toHaveValue(value)
        await expect(field).toBeFocused()
        await focusedFieldVisible(page)
      }
      const beforeScroll = await page.evaluate(() => scrollY)
      await page.keyboard.insertText('!')
      expect(await page.evaluate(() => scrollY), 'Typing must not trigger an application scroll loop').toBe(
        beforeScroll,
      )
      const rotated =
        viewport.width > viewport.height ? { width: 390, height: 844 } : { width: 844, height: 390 }
      await page.setViewportSize(rotated)
      await expect(page.getByLabel('Title', { exact: true })).toBeFocused()
      await expect(page.getByLabel('Title', { exact: true })).toHaveValue('Keyboard task while typing!')
      await page.getByRole('dialog').locator('textarea').focus()
      await focusedFieldVisible(page)
      await page.setViewportSize({ width: viewport.width, height: 210 })
      await page.getByLabel(/^Estimated work/).focus()
      await focusedFieldVisible(page)
      await expect(page.getByLabel(/^Estimated work/)).toHaveValue('350')
      await page.screenshot({
        path: `test-results/phase-2/mobile-${viewport.width}x${viewport.height}-focused-field.png`,
      })
      // All controls, including native date/time controls and actions, are reachable
      // through ordinary document scrolling. There is no fixed or nested scrolling editor.
      for (const control of await page
        .getByRole('dialog')
        .locator('input:not([type=radio]),select,textarea,button')
        .all()) {
        await control.scrollIntoViewIfNeeded()
        await expect(control).toBeInViewport()
      }
      expect(await page.evaluate(() => scrollY)).toBeGreaterThan(0)
      expect(await page.getByRole('dialog').evaluate((node) => node.scrollTop)).toBe(0)
      expect(await page.locator('meta[name=viewport]').getAttribute('content')).not.toMatch(
        /user-scalable\s*=\s*no|maximum-scale\s*=/,
      )
      await page.setViewportSize(viewport)
      const backdrop = await page.locator('.modal-backdrop').boundingBox()
      expect(backdrop!.height).toBeGreaterThanOrEqual(viewport.height)
      expect(
        await page.evaluate(() => {
          const shade = document.querySelector('.modal-backdrop')?.getBoundingClientRect()
          return Boolean(shade && shade.top <= 0 && shade.bottom >= innerHeight)
        }),
        'Shade covers the visible document after scrolling',
      ).toBe(true)
      await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click()
      expect(
        await page.evaluate(() => ({
          academic: localStorage.getItem('homebase.academic.v1'),
          schedule: localStorage.getItem('homebase.schedule.v1'),
        })),
        'Draft navigation/cancellation must not change records',
      ).toEqual(records)
      expect(await page.evaluate(() => document.body.classList.contains('mobile-editor-open'))).toBe(false)
      expect(await page.evaluate(() => document.body.style.position)).toBe('')
      // No VisualViewport dependency; the same native focus path still works.
      await page.evaluate(() =>
        Object.defineProperty(window, 'visualViewport', { configurable: true, value: undefined }),
      )
      await page.getByRole('button', { name: 'New assignment', exact: true }).first().click()
      await page.setViewportSize({ width: viewport.width, height: 210 })
      await page.getByLabel(/^Estimated work/).focus()
      await focusedFieldVisible(page)
      await page.getByRole('dialog').locator('textarea').focus()
      await focusedFieldVisible(page)
      await page.setViewportSize(viewport)
      await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click()
      // Create and edit a real assignment as well as cancelling drafts.
      await page.getByRole('button', { name: 'New assignment', exact: true }).first().click()
      const editor = page.getByRole('dialog')
      await editor.getByLabel('Title', { exact: true }).fill('Landscape assignment')
      await editor.getByRole('combobox', { name: /Class/ }).selectOption({ label: 'Mobile biology' })
      await editor.getByLabel('Due date', { exact: true }).fill('2026-10-12')
      await editor.getByLabel(/^Estimated work/).fill('30')
      await editor.getByRole('button', { name: 'Add assignment', exact: true }).click()
      await navigate(page, 'Assignments')
      await page.getByRole('button', { name: 'Edit Landscape assignment', exact: true }).click()
      await modalGeometry(page)
      await dateTimeGeometry(page, 'edit')
      await page.getByRole('dialog').getByLabel('Title', { exact: true }).fill('Edited landscape assignment')
      await page.getByRole('dialog').getByRole('button', { name: 'Save changes', exact: true }).click()
      await expect(
        page.getByRole('button', { name: 'Edit Edited landscape assignment', exact: true }),
      ).toBeVisible()
      await navigate(page, 'Weekly view')
      await page.getByRole('button', { name: 'Add availability for Oct 12' }).scrollIntoViewIfNeeded()
      const originalScroll = await page.evaluate(() => scrollY)
      await page.getByRole('button', { name: 'Add availability for Oct 12' }).click()
      await modalGeometry(page)
      await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click()
      expect(
        await page.evaluate(() => scrollY),
        'Closing a modal restores the background scroll position',
      ).toBe(originalScroll)
      await page.screenshot({
        path: `test-results/phase-2/mobile-${viewport.width}x${viewport.height}.png`,
        fullPage: true,
      })
      expect(errors).toEqual([])
      console.log(
        `${viewport.width}×${viewport.height}: navigation, create/edit form geometry, native page scrolling, field visibility, rotation, record safety and backdrop PASS`,
      )
    } finally {
      await context.close()
    }
  }
} finally {
  await browser.close()
}
