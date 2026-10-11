import { chromium, webkit } from 'playwright'
import { expect } from 'playwright/test'
import { createHash } from 'node:crypto'

const [url, sourceSha, engineName = 'both'] = process.argv.slice(2)
if (!['both', 'chromium', 'webkit'].includes(engineName))
  throw new Error('Engine must be both, chromium or webkit')
if (url !== 'https://lilant5431.github.io/homebase/' || !/^[a-f0-9]{40}$/.test(sourceSha ?? ''))
  throw new Error('Use the known staging URL and verified full source SHA; never test production data.')
const proxyServer = process.env.HTTPS_PROXY ?? process.env.HTTP_PROXY
const proxy = proxyServer ? { server: proxyServer } : undefined
const destinations = ['Overview', 'Weekly Planner', 'Assignments', 'Assessments', 'Commitments', 'Classes']
const engines = [
  ['chromium', chromium],
  ['webkit', webkit],
]
for (const [name, engine] of engines.filter(([name]) => engineName === 'both' || name === engineName)) {
  const browser = await engine.launch({ proxy })
  try {
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 844, height: 390 },
    ]) {
      const context = await browser.newContext({ viewport, hasTouch: true })
      const page = await context.newPage()
      const errors = [],
        requests = []
      page.on('pageerror', (error) => errors.push(error.message))
      page.on('request', (request) => requests.push({ url: request.url(), method: request.method() }))
      const response = await context.request.get(`${url}staging-version.json?verify=${Date.now()}`)
      expect(response.status()).toBe(200)
      const metadata = await response.json()
      expect(metadata.sourceSha).toBe(sourceSha)
      expect(metadata.previewUrl).toBe(url)
      expect(metadata.buildResult).toBe('passed')
      // Compare genuine served build bytes, not just a provenance label.
      for (const file of metadata.files) {
        const served = await context.request.get(new URL(file.path, url).href)
        expect(served.status()).toBe(200)
        expect(
          createHash('sha256')
            .update(await served.body())
            .digest('hex'),
        ).toBe(file.sha256)
      }
      const html = await page.goto(url)
      expect(html.status()).toBe(200)
      expect(page.url()).toBe(url)
      await expect(page.locator('h1')).toContainText('Overview')
      await page.evaluate(() => document.fonts.ready)
      expect(
        await page.evaluate(
          () => document.fonts.check('600 28px Newsreader') && document.fonts.check('400 16px Geist'),
        ),
      ).toBe(true)
      async function openMenu() {
        await page.getByRole('button', { name: 'Open menu', exact: true }).tap()
        await expect(page.getByRole('dialog', { name: 'Workspace navigation' })).toBeVisible()
      }
      async function navigate(label) {
        await openMenu()
        const target = page.getByRole('navigation').getByRole('button', { name: label, exact: true })
        await target.scrollIntoViewIfNeeded()
        await expect(target).toBeInViewport()
        await target.tap()
        await expect(page.getByRole('dialog', { name: 'Workspace navigation' })).toHaveCount(0)
        await expect(page.locator('h1')).toContainText(label)
      }
      for (const label of destinations) await navigate(label)
      await openMenu()
      await page.locator('.appearance-settings summary').click()
      for (const environment of ['lattice', 'landscape', 'basic'])
        for (const palette of ['light', 'dark']) {
          await page.getByLabel('Environment').selectOption(environment)
          await page.getByLabel('Palette', { exact: true }).selectOption(palette)
          await expect(page.locator('html')).toHaveAttribute('data-environment', environment)
          await expect(page.locator('html')).toHaveAttribute('data-palette', palette)
        }
      await page.getByLabel('Content material').selectOption('frosted')
      await page.getByLabel('Visual effects').selectOption('reduced')
      await page.getByLabel('Motion', { exact: true }).selectOption('reduced')
      await expect(page.locator('html')).toHaveAttribute('data-material', 'solid')
      await page.keyboard.press('Escape')
      await expect(page.getByRole('button', { name: 'Open menu', exact: true })).toBeFocused()
      await expect(page.getByRole('dialog')).toHaveCount(0)
      // Fresh disposable browser context: demonstration records only.
      await page.getByRole('button', { name: 'New class', exact: true }).click()
      let dialog = page.getByRole('dialog')
      await dialog.getByLabel('Class name').fill('Staging demonstration course')
      await dialog.getByRole('button', { name: 'Add class', exact: true }).click()
      await navigate('Assignments')
      await page.getByRole('button', { name: 'New assignment', exact: true }).click()
      dialog = page.getByRole('dialog')
      await dialog.getByLabel('Title', { exact: true }).fill('Staging demonstration assignment')
      await dialog
        .getByRole('combobox', { name: /Class/ })
        .selectOption({ label: 'Staging demonstration course' })
      await dialog.getByLabel('Due date', { exact: true }).fill('2099-10-12')
      await dialog.getByLabel(/^Estimated work/).fill('30')
      await dialog.getByRole('button', { name: 'Add assignment', exact: true }).click()
      const academic = await page.evaluate(() => localStorage.getItem('homebase.academic.v1'))
      await page.reload()
      await navigate('Assignments')
      await expect(
        page.getByRole('button', { name: 'Edit Staging demonstration assignment', exact: true }),
      ).toBeVisible()
      expect(await page.evaluate(() => localStorage.getItem('homebase.academic.v1'))).toBe(academic)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
      await page.goto(`${url}staging-version.html`)
      page.once('dialog', (dialog) => dialog.accept())
      await page.getByRole('button', { name: 'Clear Homebase staging data', exact: true }).click()
      await expect(page.getByRole('status')).toContainText('Test data cleared')
      expect(
        await page.evaluate(() =>
          ['homebase.academic.v1', 'homebase.schedule.v1', 'homebase.appearance.v1'].map((key) =>
            localStorage.getItem(key),
          ),
        ),
      ).toEqual([null, null, null])
      expect(errors).toEqual([])
      expect(requests.every((request) => request.url.startsWith(url) && request.method === 'GET')).toBe(true)
      expect(
        requests
          .filter((request) => /\.woff2$/.test(request.url))
          .some((request) => /Newsreader/.test(request.url)),
      ).toBe(true)
      expect(
        requests
          .filter((request) => /\.woff2$/.test(request.url))
          .some((request) => /Geist/.test(request.url)),
      ).toBe(true)
      console.log(
        `${name} ${viewport.width}×${viewport.height}: HTTPS/source/asset hashes/fonts/six destinations/drawer/appearance/demo CRUD/reload/clear/no external requests PASS`,
      )
      await context.close()
    }
  } finally {
    await browser.close()
  }
}
