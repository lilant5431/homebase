/** Run the production preview on 4176; see docs/implementation/phase-2-6b.md. */
import { chromium, webkit, type Page } from 'playwright'
import { expect } from 'playwright/test'

declare global {
  interface Window {
    __appearanceWrites?: string[]
  }
}
const url = 'http://127.0.0.1:4176'
const preference = {
  version: 1,
  environment: 'lattice',
  mode: 'system',
  material: 'solid',
  effects: 'system',
  motion: 'system',
}
const sizes = [
  { width: 1440, height: 900 },
  { width: 820, height: 1180 },
  { width: 390, height: 844 },
  { width: 844, height: 390 },
  { width: 667, height: 375 },
  { width: 320, height: 640 },
  { width: 720, height: 450 }, // CSS reflow equivalent of 1440×900 at 200% desktop zoom.
]
async function settings(page: Page) {
  const menu = page.getByRole('button', { name: 'Open menu' })
  if (await menu.isVisible()) await menu.click()
  await page.locator('.appearance-settings summary').click()
}
async function geometry(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
  for (const control of await page.locator('.appearance-controls select,.appearance-controls button').all()) {
    await control.scrollIntoViewIfNeeded()
    const rect = await control.boundingBox()
    expect(rect!.height).toBeGreaterThanOrEqual(44)
    expect(rect!.x).toBeGreaterThanOrEqual(0)
    expect(rect!.x + rect!.width).toBeLessThanOrEqual(await page.evaluate(() => innerWidth + 1))
  }
}
async function palette(page: Page, value: string) {
  await expect(page.locator('html')).toHaveAttribute('data-palette', value)
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe(value)
}
for (const [name, engine] of [
  ['chromium', chromium],
  ['webkit', webkit],
] as const) {
  const browser = await engine.launch({ headless: true })
  try {
    // Omit the React module, inspect a real pre-mount frame, then load it in the same document.
    for (const mode of ['light', 'dark'] as const) {
      const context = await browser.newContext({ colorScheme: mode === 'dark' ? 'light' : 'dark' })
      const page = await context.newPage()
      await page.addInitScript(
        (value) => localStorage.setItem('homebase.appearance.v1', JSON.stringify(value)),
        { ...preference, mode },
      )
      await page.route('**/assets/*.js', (route) =>
        route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }),
      )
      await page.goto(url)
      const before = await page.evaluate(async () => {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
        const style = getComputedStyle(document.documentElement)
        return {
          palette: document.documentElement.dataset.palette,
          color: style.backgroundColor,
          visibility: style.visibility,
          display: style.display,
          appMounted: document.querySelector('#root')!.childElementCount > 0,
        }
      })
      expect(before).toEqual({
        palette: mode,
        color: mode === 'dark' ? 'rgb(11, 18, 32)' : 'rgb(243, 246, 250)',
        visibility: 'visible',
        display: 'block',
        appMounted: false,
      })
      const moduleUrl = await page.locator('script[type="module"]').getAttribute('src')
      await page.unroute('**/assets/*.js')
      await page.addScriptTag({ type: 'module', url: `${url}${moduleUrl}?appearance-parity` })
      await page.getByRole('heading', { name: /Good to have/ }).waitFor()
      await palette(page, mode)
      expect(await page.evaluate(() => window.__homebaseAppearance?.effective.palette)).toBe(mode)
      await context.close()
    }
    const noScript = await browser.newContext({ javaScriptEnabled: false, colorScheme: 'dark' })
    const noScriptPage = await noScript.newPage()
    await noScriptPage.goto(url)
    expect(
      await noScriptPage.evaluate(() => getComputedStyle(document.documentElement).backgroundColor),
    ).toBe('rgb(11, 18, 32)')
    expect(await noScriptPage.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe(
      'dark',
    )
    await noScript.close()
    let combinations = 0
    for (const viewport of sizes) {
      const context = await browser.newContext({ viewport, colorScheme: 'light' })
      const page = await context.newPage()
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(error.message))
      await page.goto(url)
      await settings(page)
      for (const environment of ['lattice', 'landscape', 'basic']) {
        await page.getByLabel('Environment', { exact: true }).selectOption(environment)
        for (const mode of ['light', 'dark']) {
          await page.getByLabel('Palette', { exact: true }).selectOption(mode)
          await palette(page, mode)
          await expect(page.locator('html')).toHaveAttribute('data-environment', environment)
          await geometry(page)
          if (name === 'chromium' && viewport.width === 1440 && environment === 'lattice') {
            await page.evaluate(() => window.scrollTo(0, 0))
            await page.screenshot({
              path: `docs/implementation/assets/phase-2-6b-${mode}-desktop.png`,
              fullPage: true,
            })
          }
          combinations += 1
        }
      }
      await page.getByLabel('Content material', { exact: true }).selectOption('frosted')
      await expect(page.locator('html')).toHaveAttribute('data-material', 'frosted')
      await page.getByLabel('Visual effects', { exact: true }).selectOption('reduced')
      await expect(page.locator('html')).toHaveAttribute('data-material', 'solid')
      await expect(page.locator('html')).toHaveAttribute('data-selected-material', 'frosted')
      await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced')
      await page.getByLabel('Visual effects', { exact: true }).selectOption('system')
      await expect(page.locator('html')).toHaveAttribute('data-material', 'frosted')
      await page.getByLabel('Palette', { exact: true }).selectOption('system')
      await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
      await palette(page, 'dark')
      await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced')
      await page.getByLabel('Palette', { exact: true }).focus()
      expect(
        await page
          .getByLabel('Palette', { exact: true })
          .evaluate((node) => getComputedStyle(node).outlineStyle),
      ).toBe('solid')
      await page.keyboard.press('Home')
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('Enter')
      await expect(page.getByLabel('Palette', { exact: true })).toHaveValue('light')
      await palette(page, 'light')
      await geometry(page)
      if (name === 'chromium') {
        if (viewport.width === 390) {
          const cdp = await context.newCDPSession(page)
          await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 2 })
          expect(await page.evaluate(() => window.visualViewport?.scale)).toBe(2)
          await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1 })
          await cdp.detach()
        }
        await page.emulateMedia({ forcedColors: 'active' })
        await expect(page.locator('html')).toHaveAttribute('data-material', 'solid')
        await geometry(page)
        await page.emulateMedia({ forcedColors: 'none' })
      }
      expect(errors).toEqual([])
      await context.close()
    }
    // Actual storage events between same-origin tabs; removal, invalid versions and restoration.
    const context = await browser.newContext()
    const a = await context.newPage(),
      b = await context.newPage()
    await a.goto(url)
    await b.goto(url)
    await settings(a)
    await a.getByLabel('Palette', { exact: true }).selectOption('dark')
    await palette(b, 'dark')
    await a.evaluate(() => localStorage.setItem('homebase.appearance.v1', '{"version":2,"mode":"light"}'))
    await palette(b, 'dark')
    await a.evaluate(() => localStorage.removeItem('homebase.appearance.v1'))
    await palette(b, 'light')
    await a.evaluate(() => localStorage.setItem('homebase.appearance.v1', '{"version":1,"mode":"dark"}'))
    await palette(b, 'dark')
    await a.evaluate(() => localStorage.clear())
    await palette(b, 'light')
    await context.close()
    // Appearance-only writes, actual draft node, stable planner output across live changes.
    const isolated = await browser.newContext({
      viewport: sizes[0],
      colorScheme: 'light',
      timezoneId: 'America/New_York',
    })
    const page = await isolated.newPage()
    await page.clock.setFixedTime(new Date('2026-10-12T15:00:00-04:00'))
    await page.addInitScript(() => {
      const academic = {
        version: 1,
        classes: [{ id: 'c', name: 'Biology', color: '#315B9A', createdAt: '2026-10-01' }],
        assignments: [
          {
            id: 'a',
            classId: 'c',
            title: 'Cells',
            dueDate: '2026-10-13',
            estimatedMinutes: 60,
            completed: false,
            createdAt: '2026-10-01',
            updatedAt: '2026-10-01',
          },
        ],
        assessments: [],
        commitments: [],
      }
      const schedule = {
        version: 1,
        planningWindows: [{ id: 'w', date: '2026-10-12', startTime: '16:00', endTime: '18:00' }],
        lockedBlocks: [],
      }
      localStorage.setItem('homebase.academic.v1', JSON.stringify(academic))
      localStorage.setItem('homebase.schedule.v1', JSON.stringify(schedule))
      const writes: string[] = []
      const original = Storage.prototype.setItem
      Storage.prototype.setItem = function (key, value) {
        writes.push(key)
        original.call(this, key, value)
      }
      Object.assign(window, { __appearanceWrites: writes })
    })
    await page.goto(url)
    const bytes = await page.evaluate(() => [
      localStorage.getItem('homebase.academic.v1'),
      localStorage.getItem('homebase.schedule.v1'),
    ])
    await page.getByRole('button', { name: 'Weekly view', exact: true }).click()
    const planBefore = await page.locator('.planner-reference').innerText()
    const sessionsBefore = await page.locator('.study-event').allTextContents()
    expect(sessionsBefore).toHaveLength(1)
    expect(sessionsBefore[0]).toContain('Cells')
    await settings(page)
    for (const [label, value] of [
      ['Environment', 'basic'],
      ['Palette', 'dark'],
      ['Content material', 'frosted'],
      ['Motion', 'reduced'],
      ['Visual effects', 'reduced'],
    ])
      await page.getByLabel(label, { exact: true }).selectOption(value)
    expect(await page.locator('.planner-reference').innerText()).toBe(planBefore)
    expect(await page.locator('.study-event').allTextContents()).toEqual(sessionsBefore)
    await page.getByLabel('Visual effects', { exact: true }).selectOption('system')
    await expect(page.locator('html')).toHaveAttribute('data-material', 'frosted')
    await page.getByRole('button', { name: 'Overview', exact: true }).click()
    expect(
      await page
        .locator('.panel')
        .first()
        .evaluate((node) => getComputedStyle(node).backgroundColor),
    ).toBe('rgba(18, 29, 46, 0.72)')
    await page.getByRole('button', { name: 'New assignment', exact: true }).click()
    expect(await page.getByRole('dialog').evaluate((node) => getComputedStyle(node).backgroundColor)).toBe(
      'rgb(18, 29, 46)',
    )
    await page.getByLabel('Title', { exact: true }).fill('Unsaved draft')
    await page.getByLabel('Title', { exact: true }).evaluate((node) => {
      node.setAttribute('data-original-draft-node', 'true')
    })
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
    await page.evaluate(() =>
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'homebase.appearance.v1',
          newValue: '{"version":1,"mode":"light","environment":"landscape"}',
        }),
      ),
    )
    await expect(page.getByLabel('Title', { exact: true })).toHaveValue('Unsaved draft')
    await expect(page.getByLabel('Title', { exact: true })).toHaveAttribute(
      'data-original-draft-node',
      'true',
    )
    expect(await page.getByRole('dialog').evaluate((node) => getComputedStyle(node).backgroundColor)).toBe(
      'rgb(255, 255, 255)',
    )
    expect(
      await page.evaluate(() => [
        localStorage.getItem('homebase.academic.v1'),
        localStorage.getItem('homebase.schedule.v1'),
      ]),
    ).toEqual(bytes)
    const writes = await page.evaluate(() => window.__appearanceWrites ?? [])
    expect(writes.length).toBeGreaterThanOrEqual(5)
    expect(writes.every((key) => key === 'homebase.appearance.v1')).toBe(true)
    await isolated.close()
    // No media APIs, blocked appearance read/write and unsupported blur remain usable.
    const fallback = await browser.newContext()
    const fault = await fallback.newPage()
    await fault.addInitScript(() => {
      Object.defineProperty(window, 'matchMedia', { value: undefined, configurable: true })
      CSS.supports = () => false
      const get = Storage.prototype.getItem,
        set = Storage.prototype.setItem
      Storage.prototype.getItem = function (key) {
        if (key === 'homebase.appearance.v1') throw new Error('blocked')
        return get.call(this, key)
      }
      Storage.prototype.setItem = function (key, value) {
        if (key === 'homebase.appearance.v1') throw new Error('blocked')
        set.call(this, key, value)
      }
    })
    await fault.goto(url)
    await settings(fault)
    await fault.getByLabel('Content material', { exact: true }).selectOption('frosted')
    await expect(fault.locator('html')).toHaveAttribute('data-material', 'solid')
    await expect(fault.getByRole('alert')).toHaveText(
      'Appearance applies to this tab; this browser could not save your preference.',
    )
    await fault.getByLabel('Palette', { exact: true }).selectOption('dark')
    await palette(fault, 'dark')
    await fallback.close()
    console.log(
      `${name}: ${combinations} appearance/viewport cases; first-paint, settings, live OS, reductions, fallback, cross-tab, domain/draft isolation passed`,
    )
  } finally {
    await browser.close()
  }
}
