import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { chromium, webkit, type Page } from 'playwright'

// Run against the independent Vite server or built preview. No production imports.
const baseURL = process.env.AUDITION_URL || 'http://127.0.0.1:5175'
const sizes = [
  [1440, 900],
  [820, 1180],
  [390, 844],
  [844, 390],
  [667, 375],
  [320, 640],
]
const effects = ['lattice', 'horizon', 'glass', 'beam', 'shimmer', 'baseline']
type Sample = { frames: number; medianMs: number; p95Ms: number; activeAnimations: number }
const report: {
  baseURL: string
  engines: string[]
  geometryCases: number
  screenshots: string[]
  performance: (Sample & { effect: string })[]
} = { baseURL, engines: [], geometryCases: 0, screenshots: [], performance: [] }
await fs.mkdir('test-results', { recursive: true })
await fs.mkdir('screenshots', { recursive: true })

async function open(page: Page) {
  await page.addInitScript(() => {
    for (const key of ['localStorage', 'sessionStorage']) {
      Object.defineProperty(window, key, {
        configurable: true,
        get() {
          throw new Error(`Forbidden ${key} access`)
        },
      })
    }
  })
  await page.goto(baseURL)
  await page.getByRole('heading', { name: 'Find your atmosphere.' }).waitFor()
  await page.evaluate(() => document.fonts.ready)
}
async function geometry(page: Page, label: string) {
  const result = await page.evaluate(() => {
    const visible = (element: Element) =>
      element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden'
    const escaped = [
      ...document.querySelectorAll<HTMLElement>(
        'button,select,input,summary,.content-card,.navigation,.metrics',
      ),
    ]
      .filter(visible)
      .filter((element) => {
        const rect = element.getBoundingClientRect()
        return (
          rect.left < -1 ||
          rect.right > innerWidth + 1 ||
          (element.scrollWidth > element.clientWidth + 2 &&
            element.matches('button,select,.content-card,.metrics'))
        )
      })
      .map((element) => element.className || element.id || element.tagName)
    const targets = [
      ...document.querySelectorAll<HTMLElement>('button,select,summary,input[type=range],.check-control,a'),
    ]
      .filter(visible)
      .map((element) => ({
        name: (element.textContent || '').trim() || element.getAttribute('aria-label') || element.id,
        rect: element.getBoundingClientRect(),
      }))
      .filter(({ rect }) => rect.width < 43.9 || rect.height < 43.9)
      .map(({ name, rect }) => ({ name, width: rect.width, height: rect.height }))
    return { pageWidth: document.documentElement.scrollWidth, viewport: innerWidth, escaped, targets }
  })
  assert.equal(result.pageWidth, result.viewport, `${label}: document overflow`)
  assert.deepEqual(result.escaped, [], `${label}: clipped content/controls`)
  assert.deepEqual(result.targets, [], `${label}: target below 44×44`)
  report.geometryCases++
}
async function expandedControls(page: Page) {
  const details = page.locator('details')
  if (!((await details.getAttribute('open')) !== null)) await page.locator('summary').click()
}
async function allAnimations(page: Page) {
  return page.evaluate(() =>
    document
      .getAnimations()
      .filter((animation) => animation instanceof CSSAnimation)
      .map((animation) => ({ state: animation.playState, duration: animation.effect?.getTiming().duration })),
  )
}
async function screenShot(page: Page, name: string) {
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  await page.locator('#preview').scrollIntoViewIfNeeded()
  const file = `screenshots/${name}.png`
  await page.screenshot({ path: file, fullPage: true, animations: 'disabled' })
  report.screenshots.push(file)
  await page.getByRole('button', { name: 'Resume', exact: true }).click()
}
async function profile(page: Page, effect: string) {
  await page.locator('#effect').selectOption(effect)
  await page.locator('#preview').scrollIntoViewIfNeeded()
  const sample = await page.evaluate(
    () =>
      new Promise<Sample>((resolve) => {
        const deltas: number[] = []
        let last: number | undefined
        const start = performance.now()
        function tick(now: number) {
          if (last !== undefined) deltas.push(now - last)
          last = now
          if (now - start >= 1000) {
            const sorted = [...deltas].sort((a, b) => a - b)
            resolve({
              frames: deltas.length,
              medianMs: sorted[Math.floor(sorted.length / 2)],
              p95Ms: sorted[Math.floor(sorted.length * 0.95)],
              activeAnimations: document
                .getAnimations()
                .filter((animation) => animation.playState === 'running').length,
            })
          } else requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      }),
  )
  report.performance.push({ effect, ...sample })
}

for (const [engineName, engine] of [
  ['Chromium', chromium],
  ['WebKit', webkit],
] as const) {
  const browser = await engine.launch({
    headless: true,
    ...(engineName === 'Chromium' ? { args: ['--no-sandbox'] } : {}),
  })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  const errors: string[] = []
  const external: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('request', (request) => {
    if (!request.url().startsWith(new URL(baseURL).origin) && !request.url().startsWith('data:'))
      external.push(request.url())
  })
  await open(page)
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height })
    for (const theme of ['Daylight', 'Night Flight']) {
      await page.getByRole('button', { name: theme, exact: true }).click()
      for (const effect of effects) {
        await page.locator('#effect').selectOption(effect)
        await page.getByRole('button', { name: 'Overview', exact: false }).click()
        await geometry(page, `${engineName} ${width}×${height} ${theme} ${effect} overview`)
        await page.getByRole('button', { name: /Weekly Planner/ }).click()
        await geometry(page, `${engineName} ${width}×${height} ${theme} ${effect} week`)
      }
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.getByRole('button', { name: 'Overview', exact: false }).click()
  await page.getByRole('button', { name: 'Night Flight', exact: true }).click()
  await page.locator('#effect').selectOption('horizon')
  await expandedControls(page)
  await page.getByRole('button', { name: 'Cinematic', exact: true }).click()
  assert.equal(await page.locator('#intensity').inputValue(), '92')
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  assert.ok(
    (await allAnimations(page)).every((animation) => animation.state === 'paused'),
    'pause freezes actual CSS animations',
  )
  await page.getByRole('button', { name: 'Resume', exact: true }).click()
  await page.locator('#preview').scrollIntoViewIfNeeded()
  await page.waitForTimeout(100)
  assert.ok(
    (await allAnimations(page)).some((animation) => animation.state === 'running'),
    'resume restarts movement',
  )
  await page.getByLabel('Reduce motion', { exact: true }).check()
  assert.equal((await allAnimations(page)).length, 0, 'manual reduction removes continuous animations')
  await page.getByLabel('Reduce motion', { exact: true }).uncheck()
  await page.getByLabel('Reduce visual effects', { exact: true }).check()
  const opaque = await page.locator('.navigation').evaluate((element) => ({
    bg: getComputedStyle(element).backgroundColor,
    blur: getComputedStyle(element).backdropFilter,
    opacity: getComputedStyle(document.querySelector('.atmosphere')!).display,
  }))
  assert.ok(!opaque.bg.includes('rgba'), 'opaque fallback')
  assert.equal(opaque.blur, 'none')
  assert.equal(opaque.opacity, 'none')
  await page.getByRole('button', { name: 'Reset recommended values' }).click()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.locator('.audition[data-reduced-motion="true"]').waitFor()
  assert.equal((await allAnimations(page)).length, 0, 'OS reduced motion honored')
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.locator('.audition[data-reduced-motion="false"]').waitFor()
  await page.locator('#effect').selectOption('glass')
  await page.locator('.navigation').hover({ position: { x: 90, y: 80 } })
  await page.mouse.move(400, 300)
  await page.waitForTimeout(50)
  assert.ok(
    await page
      .locator('.magic-glass')
      .evaluate((element) => element.style.getPropertyValue('--pointer-x') !== ''),
    'pointer gradient responds',
  )
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  assert.equal(
    await page.locator('.magic-glass').evaluate((element) => element.style.getPropertyValue('--pointer-x')),
    '',
    'pause clears pointer response',
  )
  await page.getByRole('button', { name: 'Resume', exact: true }).click()
  await page.locator('#effect').selectOption('shimmer')
  await page.getByLabel(/Library defaults/).check()
  assert.ok(await page.locator('.candidate-shimmer').count(), 'candidate values applied')
  await page.getByLabel(/Library defaults/).uncheck()
  await page.getByRole('button', { name: 'Play light cue' }).click()
  assert.ok(await page.getByText('Light cue played.', { exact: false }).count())
  await page.getByRole('button', { name: 'Inspect The shape of a good argument' }).click()
  await page.getByRole('button', { name: 'Close details' }).click()
  await page.locator('#effect').focus()
  assert.equal(
    await page.locator('#effect').evaluate((element) => getComputedStyle(element).outlineStyle),
    'solid',
    'keyboard focus visible',
  )
  if (engineName === 'Chromium') {
    for (const effect of effects) await profile(page, effect)
    await page.getByRole('button', { name: 'Daylight', exact: true }).click()
    await page.locator('#effect').selectOption('lattice')
    await page.getByRole('button', { name: 'Balanced', exact: true }).click()
    await screenShot(page, 'daylight-desktop-balanced')
    await page.getByRole('button', { name: 'Night Flight', exact: true }).click()
    await page.locator('#effect').selectOption('horizon')
    await page.getByRole('button', { name: 'Cinematic', exact: true }).click()
    await screenShot(page, 'night-desktop-cinematic')
    await page.getByRole('button', { name: /Weekly Planner/ }).click()
    await screenShot(page, 'night-weekly-desktop')
    for (const [theme, effect, file] of [
      ['Daylight', 'lattice', 'daylight-phone-balanced'],
      ['Night Flight', 'horizon', 'night-phone-cinematic'],
      ['Night Flight', 'glass', 'night-glass-phone'],
    ]) {
      await page.setViewportSize({ width: 390, height: 844 })
      await page.getByRole('button', { name: theme, exact: true }).click()
      await page.locator('#effect').selectOption(effect)
      await page.getByRole('button', { name: 'Overview', exact: false }).click()
      await page
        .getByRole('button', { name: theme === 'Daylight' ? 'Balanced' : 'Cinematic', exact: true })
        .click()
      if ((await page.locator('details').getAttribute('open')) !== null) await page.locator('summary').click()
      await screenShot(page, file)
    }
  }
  if (engineName === 'Chromium') {
    await page.emulateMedia({ forcedColors: 'active' })
    await page.getByRole('button', { name: 'Play light cue' }).click()
    assert.equal((await allAnimations(page)).length, 0)
    await page.emulateMedia({ forcedColors: 'none' })
  }
  assert.deepEqual(errors, [], `${engineName}: browser exceptions`)
  assert.deepEqual(external, [], `${engineName}: unexpected runtime external requests`)
  const fallbackPage = await context.newPage()
  await fallbackPage.addInitScript(() => {
    CSS.supports = () => false
  })
  await open(fallbackPage)
  await fallbackPage.locator('#effect').selectOption('beam')
  assert.equal(await fallbackPage.locator('.beam-fallback').count(), 1)
  assert.equal(
    await fallbackPage.locator('.navigation').evaluate((element) => getComputedStyle(element).backdropFilter),
    'none',
  )
  await browser.close()
  report.engines.push(`${engineName}: passed (simulation, not physical iPhone acceptance)`)
}
await fs.writeFile('test-results/browser-report.json', JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify(report, null, 2))
