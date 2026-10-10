/** Built-app 2.6C checks; preview on 4178. No physical Safari certification. */
import { chromium, webkit, type Page } from 'playwright'
import { expect } from 'playwright/test'
declare global {
  interface Window {
    __fontShifts?: number
  }
}
const url = 'http://127.0.0.1:4178'
const sizes = [
  { width: 1440, height: 900 },
  { width: 820, height: 1180 },
  { width: 390, height: 844 },
  { width: 844, height: 390 },
  { width: 667, height: 375 },
  { width: 320, height: 640 },
  { width: 720, height: 450 },
  { width: 360, height: 225 }, // 400% CSS reflow equivalent of 1440×900.
]
const labels = ['Overview', 'Weekly Planner', 'Assignments', 'Assessments', 'Commitments', 'Classes']
async function overflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
}
async function menu(page: Page) {
  const opener = page.getByRole('button', { name: 'Open menu', exact: true })
  if (await opener.isVisible()) await opener.click()
}
for (const [name, engine] of [
  ['chromium', chromium],
  ['webkit', webkit],
] as const) {
  const browser = await engine.launch({ headless: true })
  try {
    for (const viewport of sizes)
      for (const mode of ['light', 'dark'] as const) {
        const context = await browser.newContext({ viewport, colorScheme: mode, hasTouch: true })
        const page = await context.newPage(),
          errors: string[] = [],
          external: string[] = []
        page.on('pageerror', (error) => errors.push(error.message))
        page.on('request', (request) => {
          if (!request.url().startsWith(url)) external.push(request.url())
        })
        await page.goto(url)
        await page.evaluate(() => document.fonts.ready)
        expect(
          await page.evaluate(() =>
            Array.from(document.fonts)
              .filter((face) => ['Newsreader', 'Geist'].includes(face.family))
              .every((face) => face.status === 'loaded'),
          ),
        ).toBe(true)
        expect(
          await page.evaluate(
            () => document.fonts.check('600 28px Newsreader') && document.fonts.check('400 16px Geist'),
          ),
        ).toBe(true)
        expect(await page.locator('h1').evaluate((node) => getComputedStyle(node).fontFamily)).toContain(
          'Newsreader',
        )
        expect(
          await page.locator('.top-add').evaluate((node) => getComputedStyle(node).fontFamily),
        ).toContain('Geist')
        await expect(page.locator('h1')).toHaveCount(1)
        const compact = viewport.width < 1200 || viewport.height <= 500
        if (!compact) expect((await page.locator('.sidebar').boundingBox())!.width).toBe(216)
        else {
          await expect(page.getByRole('navigation', { name: 'Main navigation' })).not.toBeVisible()
          await page.getByRole('button', { name: 'Open menu', exact: true }).tap()
          await expect(page.getByRole('dialog', { name: 'Workspace navigation' })).toBeVisible()
          await expect(page.getByRole('button', { name: 'Overview', exact: true })).toBeFocused()
          await page.keyboard.press('Escape')
          await expect(page.getByRole('button', { name: 'Open menu', exact: true })).toBeFocused()
        }
        for (const label of labels) {
          await menu(page)
          const button = page.getByRole('navigation').getByRole('button', { name: label, exact: true })
          await button.scrollIntoViewIfNeeded()
          const rect = await button.boundingBox()
          expect(rect!.height).toBeGreaterThanOrEqual(44)
          expect(rect!.width).toBeGreaterThanOrEqual(44)
          await button.click()
          await expect(page.locator('h1')).toHaveCount(1)
          await expect(page.locator('h1')).toContainText(label)
          await expect(page.locator('.nav-item[aria-current="page"]')).toHaveText(label)
          await overflow(page)
          if (label === 'Weekly Planner') {
            const action = page.locator('.shell-secondary')
            await action.hover()
            await page.mouse.down()
            expect(await action.evaluate((node) => getComputedStyle(node).color)).toBe(
              mode === 'dark' ? 'rgb(11, 18, 32)' : 'rgb(255, 255, 255)',
            )
            await page.mouse.move(0, 0)
            await page.mouse.up()
          }
        }
        await menu(page)
        if (name === 'chromium' && compact && [390, 667].includes(viewport.width)) {
          await page.locator('.sidebar').evaluate((node) => {
            node.scrollTop = 0
          })
          await page.screenshot({
            path: `docs/implementation/assets/phase-2-6c-${mode}-${viewport.width}-navigation.png`,
            fullPage: true,
          })
        }
        await page.locator('.appearance-settings summary').click()
        for (const control of await page
          .locator('.appearance-controls select,.appearance-controls button')
          .all()) {
          await control.scrollIntoViewIfNeeded()
          await expect(control).toBeInViewport()
          expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(44)
        }
        // Content Frosted must not change navigation glass; reduction must make navigation opaque.
        await page.getByLabel('Content material').selectOption('frosted')
        const glass = await page
          .locator('.sidebar')
          .evaluate(
            (node) =>
              getComputedStyle(node).backdropFilter ||
              getComputedStyle(node).getPropertyValue('-webkit-backdrop-filter'),
          )
        expect(glass).toBe('blur(12px)')
        await page.getByLabel('Visual effects').selectOption('reduced')
        expect(
          await page.locator('.sidebar').evaluate((node) => getComputedStyle(node).backgroundColor),
        ).toBe(mode === 'dark' ? 'rgb(26, 41, 61)' : 'rgb(255, 255, 255)')
        expect(
          await page
            .locator('.activation-light')
            .first()
            .evaluate((node) => getComputedStyle(node).display),
        ).toBe('none')
        await overflow(page)
        if (name === 'chromium' && [1440, 390, 667].includes(viewport.width)) {
          await page.screenshot({
            path: `docs/implementation/assets/phase-2-6c-${mode}-${viewport.width}-reduced-menu.png`,
            fullPage: true,
          })
          await page.getByLabel('Visual effects').selectOption('system')
          await page.screenshot({
            path: `docs/implementation/assets/phase-2-6c-${mode}-${viewport.width}-menu.png`,
            fullPage: true,
          })
          await page.locator('.appearance-settings summary').click()
          await page.getByRole('button', { name: 'Overview', exact: true }).click()
          await page.screenshot({
            path: `docs/implementation/assets/phase-2-6c-${mode}-${viewport.width}.png`,
            fullPage: true,
          })
        }
        expect(errors).toEqual([])
        expect(external).toEqual([])
        await context.close()
      }
    const longContext = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const longPage = await longContext.newPage()
    await longPage.addInitScript(() => {
      localStorage.setItem(
        'homebase.academic.v1',
        JSON.stringify({
          version: 1,
          classes: [
            {
              id: 'c',
              name: 'Advanced interdisciplinary laboratory and historical research',
              color: '#315B9A',
              createdAt: '2026-10-01',
            },
          ],
          assignments: [
            {
              id: 'a',
              classId: 'c',
              title:
                'Compare experimental results and prepare an extended interdisciplinary research interpretation with detailed references',
              dueDate: '2026-10-20',
              dueTime: '17:00',
              estimatedMinutes: 60,
              completed: false,
              createdAt: '2026-10-01',
              updatedAt: '2026-10-01',
            },
          ],
          assessments: [],
          commitments: [],
        }),
      )
    })
    await longPage.goto(url)
    const source = await longPage.evaluate(() => localStorage.getItem('homebase.academic.v1'))
    const recordTitle = longPage.locator('.task-main strong').first()
    expect(await recordTitle.evaluate((node) => getComputedStyle(node).whiteSpace)).toBe('normal')
    expect((await recordTitle.boundingBox())!.height).toBeGreaterThan(24)
    await overflow(longPage)
    if (name === 'chromium')
      await longPage.screenshot({
        path: 'docs/implementation/assets/phase-2-6c-long-text.png',
        fullPage: true,
      })
    await longPage.getByRole('button', { name: 'New assignment', exact: true }).click()
    for (const input of await longPage
      .getByRole('dialog')
      .locator('input:not([type=radio]),select,textarea')
      .all()) {
      expect(
        await input.evaluate((node) => parseFloat(getComputedStyle(node).fontSize)),
      ).toBeGreaterThanOrEqual(16)
      expect(await input.evaluate((node) => getComputedStyle(node).fontFamily)).toContain('Geist')
    }
    await longPage.getByRole('button', { name: 'Cancel', exact: true }).click()
    expect(await longPage.evaluate(() => localStorage.getItem('homebase.academic.v1'))).toBe(source)
    // Large browser text setting, independent of simulated viewport scaling.
    await longPage.addStyleTag({ content: 'html { font-size: 200%; }' })
    await menu(longPage)
    await longPage.getByRole('button', { name: 'Classes', exact: true }).scrollIntoViewIfNeeded()
    await expect(longPage.getByRole('button', { name: 'Classes', exact: true })).toBeInViewport()
    expect(
      await longPage.locator('.sidebar').evaluate((node) => node.scrollWidth <= node.clientWidth + 1),
    ).toBe(true)
    await longPage.getByRole('button', { name: 'Classes', exact: true }).click()
    await overflow(longPage)
    await longContext.close()
    const fallbackContext = await browser.newContext({ viewport: { width: 320, height: 640 } })
    const fallbackPage = await fallbackContext.newPage()
    await fallbackPage.addInitScript(() => Object.defineProperty(window, 'matchMedia', { value: undefined }))
    await fallbackPage.route('**/*.woff2', (route) => route.abort())
    await fallbackPage.goto(url)
    await expect(fallbackPage.locator('h1')).toBeVisible()
    await menu(fallbackPage)
    await expect(fallbackPage.locator('.brand strong')).toHaveText('Homebase')
    await expect(fallbackPage.getByRole('button', { name: 'Classes', exact: true })).toBeVisible()
    await overflow(fallbackPage)
    await fallbackContext.close()
    // Slow-font substitution: capture real fallback geometry, release responses, then compare.
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await context.newPage()
    await page.addInitScript(() => {
      if (!PerformanceObserver.supportedEntryTypes.includes('layout-shift')) return
      Object.assign(window, { __fontShifts: 0 })
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const shift = entry as PerformanceEntry & { value: number; hadRecentInput: boolean }
          if (!shift.hadRecentInput) window.__fontShifts = (window.__fontShifts ?? 0) + shift.value
        }
      }).observe({ type: 'layout-shift', buffered: true })
    })
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    await page.route('**/*.woff2', async (route) => {
      await gate
      await route.continue()
    })
    await page.goto(url, { waitUntil: 'domcontentloaded' })
    await page.locator('h1').waitFor()
    const before = await page.locator('h1').boundingBox()
    release()
    await page.evaluate(async () => {
      await document.fonts.ready
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      )
    })
    const after = await page.locator('h1').boundingBox()
    const measured = await page.evaluate(() => ({
      shifts: window.__fontShifts,
      fonts: performance
        .getEntriesByType('resource')
        .filter((e) => e.name.includes('woff2'))
        .map((e) => {
          const r = e as PerformanceResourceTiming
          return {
            name: r.name.split('/').pop(),
            bytes: r.encodedBodySize,
            transferred: r.transferSize,
            durationMs: r.duration,
          }
        }),
    }))
    expect(measured.fonts).toHaveLength(2)
    if (measured.shifts !== undefined) expect(measured.shifts).toBeLessThan(0.1)
    expect(after!.y).toBe(before!.y)
    expect(after!.height).toBe(before!.height)
    console.log(
      `${name}: 32 shell/palette/viewport cases passed; slow-font metrics ${JSON.stringify({ before, after, ...measured })}`,
    )
    await context.close()
  } finally {
    await browser.close()
  }
}
