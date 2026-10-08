/** Phone form/navigation regressions. Run against the production preview on port 4174. */
import { chromium, type Page } from 'playwright'
import { expect } from 'playwright/test'

const sizes = [
  { width: 390, height: 844 },
  { width: 844, height: 390 },
  { width: 667, height: 375 },
]
type ViewportProbe = Window &
  typeof globalThis & { resizeAcceptanceViewport?: (height: number, top: number, scale?: number) => void }
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
  expect(bounds!.y).toBeGreaterThanOrEqual(0)
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(await page.evaluate(() => innerWidth))
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(await page.evaluate(() => innerHeight))
  expect(
    await dialog.evaluate((node) => node.scrollWidth),
    'The scrollable form must not clip content horizontally',
  ).toBeLessThanOrEqual(await dialog.evaluate((node) => node.clientWidth))
  await dialog.getByRole('button', { name: /Cancel/ }).scrollIntoViewIfNeeded()
  await expect(dialog.getByRole('button', { name: /Cancel/ })).toBeInViewport()
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
  // No scrolling helper: the application must reveal the field after viewport/focus events.
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const field = document.activeElement
          const dialog = field?.closest('[role="dialog"]')
          if (!(field instanceof HTMLElement) || !(dialog instanceof HTMLElement)) return false
          const bounds = field.getBoundingClientRect(),
            clip = dialog.getBoundingClientRect()
          const top = Math.max(clip.top + dialog.clientTop, window.visualViewport?.offsetTop ?? 0)
          const bottom = Math.min(
            clip.top + dialog.clientTop + dialog.clientHeight,
            (window.visualViewport?.offsetTop ?? 0) + (window.visualViewport?.height ?? innerHeight),
          )
          return bounds.top >= top && bounds.bottom <= bottom
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
      // Simulate the visual-viewport metrics delivered when a mobile keyboard covers layout space.
      // This is boundary testing, not evidence that Chromium reproduces Safari's keyboard.
      await page.evaluate(() => {
        const viewport = new EventTarget()
        Object.assign(viewport, { height: innerHeight, offsetTop: 0, scale: 1 })
        Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport })
        ;(window as ViewportProbe).resizeAcceptanceViewport = (height, offsetTop, scale = 1) => {
          Object.assign(viewport, { height, offsetTop, scale })
          viewport.dispatchEvent(new Event('resize'))
          viewport.dispatchEvent(new Event('scroll'))
        }
      })
      // Remount so the modal subscribes to the controlled boundary.
      await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click()
      await page.getByRole('button', { name: 'New assignment', exact: true }).first().click()
      await page.getByLabel('Title', { exact: true }).fill('Keyboard task')
      await page.getByLabel(/^Estimated work/).fill('35')
      await page.evaluate(() => (window as ViewportProbe).resizeAcceptanceViewport?.(210, 45))
      await focusedFieldVisible(page)
      await expect(page.getByLabel(/^Estimated work/)).toBeFocused()
      await page.keyboard.insertText('0')
      await expect(page.getByLabel(/^Estimated work/)).toHaveValue('350')
      await focusedFieldVisible(page)
      // Model a focus switch for which Safari does not scroll the modal automatically.
      await page.getByLabel('Title', { exact: true }).evaluate((node) => node.focus({ preventScroll: true }))
      await focusedFieldVisible(page)
      await page.keyboard.insertText(' while typing')
      await expect(page.getByLabel('Title', { exact: true })).toHaveValue('Keyboard task while typing')
      await expect(page.getByLabel('Title', { exact: true })).toBeFocused()
      await focusedFieldVisible(page)
      await page
        .getByRole('dialog')
        .locator('textarea')
        .evaluate((node) => node.focus({ preventScroll: true }))
      await focusedFieldVisible(page)
      await page.keyboard.insertText('Visible notes')
      await expect(page.getByRole('dialog').locator('textarea')).toHaveValue('Visible notes')
      const stableScroll = await page.getByRole('dialog').evaluate((node) => node.scrollTop)
      await page.evaluate(async () => {
        ;(window as ViewportProbe).resizeAcceptanceViewport?.(210, 45)
        ;(window as ViewportProbe).resizeAcceptanceViewport?.(210, 45)
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        )
      })
      expect(
        await page.getByRole('dialog').evaluate((node) => node.scrollTop),
        'Unchanged viewport events must not repeatedly jump the field',
      ).toBe(stableScroll)
      const rotated =
        viewport.width > viewport.height ? { width: 390, height: 844 } : { width: 844, height: 390 }
      await page.setViewportSize(rotated)
      await page.evaluate(() => (window as ViewportProbe).resizeAcceptanceViewport?.(210, 45))
      await focusedFieldVisible(page)
      await page.setViewportSize(viewport)
      await page.evaluate(() => (window as ViewportProbe).resizeAcceptanceViewport?.(210, 45))
      await focusedFieldVisible(page)
      const reduced = await page.getByRole('dialog').boundingBox()
      expect(reduced!.y).toBeGreaterThanOrEqual(45)
      expect(reduced!.y + reduced!.height, 'Modal must fit above the keyboard').toBeLessThanOrEqual(255)
      const backdrop = await page.locator('.modal-backdrop').boundingBox()
      expect(backdrop!.y).toBe(0)
      expect(backdrop!.height).toBe(viewport.height)
      expect(await page.evaluate(() => document.body.style.position)).toBe('fixed')
      await page.screenshot({
        path: `test-results/phase-2/mobile-${viewport.width}x${viewport.height}-focused-field.png`,
      })
      // Every field and both action ends are reachable by scrolling the dialog.
      for (const control of await page
        .getByRole('dialog')
        .locator('input:not([type=radio]),select,textarea,button')
        .all()) {
        await control.scrollIntoViewIfNeeded()
        const box = await control.boundingBox()
        expect(box!.y).toBeGreaterThanOrEqual(45)
        expect(box!.y + box!.height).toBeLessThanOrEqual(255)
      }
      await page.screenshot({
        path: `test-results/phase-2/mobile-${viewport.width}x${viewport.height}-keyboard.png`,
      })
      const beforePinch = await page.getByRole('dialog').boundingBox()
      await page.evaluate(() => (window as ViewportProbe).resizeAcceptanceViewport?.(105, 70, 2))
      expect(
        await page.getByRole('dialog').boundingBox(),
        'Pinch zoom must not trigger counteracting layout resizing',
      ).toEqual(beforePinch)
      expect(await page.locator('meta[name=viewport]').getAttribute('content')).not.toMatch(
        /user-scalable\s*=\s*no|maximum-scale\s*=/,
      )
      await page.evaluate(() => (window as ViewportProbe).resizeAcceptanceViewport?.(innerHeight, 0))
      await focusedFieldVisible(page)
      await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click()
      expect(await page.evaluate(() => document.body.style.position)).toBe('')
      expect(await page.evaluate(() => document.body.style.overflow)).toBe('')
      // Without VisualViewport, native window resize still rechecks the active field.
      await page.evaluate(() =>
        Object.defineProperty(window, 'visualViewport', { configurable: true, value: undefined }),
      )
      await page.getByRole('button', { name: 'New assignment', exact: true }).first().click()
      await page.getByLabel(/^Estimated work/).fill('30')
      await page.setViewportSize({ width: viewport.width, height: 210 })
      await focusedFieldVisible(page)
      await page
        .getByRole('dialog')
        .locator('textarea')
        .evaluate((node) => node.focus({ preventScroll: true }))
      await focusedFieldVisible(page)
      await page.setViewportSize(viewport)
      await focusedFieldVisible(page)
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
        `${viewport.width}×${viewport.height}: navigation, create/edit form geometry, keyboard viewport, backdrop and scaling PASS`,
      )
    } finally {
      await context.close()
    }
  }
} finally {
  await browser.close()
}
